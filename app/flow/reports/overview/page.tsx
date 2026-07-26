"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { ProjectReport, ReportStatus } from "@/types/project";
import StandardPageHeader from "@/components/layout/StandardPageHeader";
import { Button } from "@/shared/ui/primitives/button/button";
import { Input } from "@/shared/ui/primitives/input/input";
import { Select } from "@/shared/ui/primitives/select/select";
import { 
    Plus, 
    Search, 
    FileText, 
    Calendar, 
    CalendarCheck, 
    Loader2, 
    Trash2, 
    Edit3, 
    CheckCircle2, 
    AlertTriangle, 
    Clock,
    X
} from "lucide-react";
import clsx from "clsx";

interface MappedReport extends ProjectReport {
    projectName: string;
}

export default function ReportsOverviewPage() {
    const router = useRouter();
    const [reports, setReports] = useState<MappedReport[]>([]);
    const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Modal Selector State
    const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);

    // Filter States
    const [searchVal, setSearchVal] = useState("");
    const [selectedProject, setSelectedProject] = useState("");
    const [selectedType, setSelectedType] = useState("");
    const [selectedStatus, setSelectedStatus] = useState("");

    const fetchDropdownProjects = async () => {
        try {
            const { data } = await supabase.from("projects").select("id, project_name").order("project_name");
            setProjects((data || []).map(p => ({ id: p.id, name: p.project_name })));
        } catch (err) {
            console.error("Error fetching projects dropdown:", err);
        }
    };

    const fetchReports = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from("project_reports")
                .select(`
                    *,
                    projects (
                        project_name
                    )
                `)
                .order("report_date", { ascending: false });

            if (error) throw error;

            const mapped = (data || []).map(r => ({
                id: r.id,
                projectId: r.project_id,
                reportType: r.report_type,
                title: r.title,
                reportDate: r.report_date,
                progress: r.progress,
                status: r.status,
                manpowerCount: r.manpower_count,
                weatherCondition: r.weather_condition,
                content: r.content,
                createdAt: r.created_at,
                updatedAt: r.updated_at,
                projectName: r.projects?.project_name || "Unknown Project"
            }));

            setReports(mapped);
        } catch (err) {
            console.error("Error fetching all reports:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDropdownProjects();
        fetchReports();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this report?")) return;
        try {
            const { error } = await supabase.from("project_reports").delete().eq("id", id);
            if (error) throw error;
            fetchReports();
        } catch (e) {
            console.error("Failed to delete report:", e);
            alert("Error deleting report");
        }
    };

    const handleCreateClick = () => {
        setIsTypeModalOpen(true);
    };

    const handleEditClick = (report: MappedReport) => {
        router.push(`/flow/reports/editor?id=${report.id}&type=${report.reportType}`);
    };

    // Filtering logic
    const filteredReports = reports.filter(r => {
        const matchesSearch = r.title.toLowerCase().includes(searchVal.toLowerCase()) || 
                              r.projectName.toLowerCase().includes(searchVal.toLowerCase()) ||
                              (r.content && r.content.toLowerCase().includes(searchVal.toLowerCase()));
        
        const matchesProject = selectedProject === "" || selectedProject === "all" || r.projectId === selectedProject;
        const matchesType = selectedType === "" || selectedType === "all" || r.reportType === selectedType;
        const matchesStatus = selectedStatus === "" || selectedStatus === "all" || r.status === selectedStatus;

        return matchesSearch && matchesProject && matchesType && matchesStatus;
    });

    // Counts for stats cards
    const totalCount = reports.length;
    const dailyCount = reports.filter(r => r.reportType === "daily").length;
    const weeklyCount = reports.filter(r => r.reportType === "weekly").length;
    const monthlyCount = reports.filter(r => r.reportType === "monthly").length;

    const getStatusIcon = (status: ReportStatus) => {
        switch (status) {
            case "on-track":
                return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
            case "delayed":
                return <Clock className="w-3.5 h-3.5 text-amber-500" />;
            case "critical":
                return <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />;
            case "completed":
                return <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />;
            default:
                return null;
        }
    };

    const getStatusStyle = (status: ReportStatus) => {
        switch (status) {
            case "on-track":
                return "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30";
            case "delayed":
                return "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900/30";
            case "critical":
                return "bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border-rose-100 dark:border-rose-900/30";
            case "completed":
                return "bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-900/30";
            default:
                return "bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400";
        }
    };

    const getTypeBadge = (type?: "daily" | "weekly" | "monthly") => {
        switch (type) {
            case "daily":
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 border border-orange-100 dark:border-orange-900/20">
                        <Calendar className="w-3.5 h-3.5" />
                        Daily
                    </span>
                );
            case "weekly":
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/20">
                        <FileText className="w-3.5 h-3.5" />
                        Weekly
                    </span>
                );
            case "monthly":
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/20">
                        <CalendarCheck className="w-3.5 h-3.5" />
                        Monthly
                    </span>
                );
            default:
                return null;
        }
    };

    return (
        <div className="w-full space-y-6">
            <StandardPageHeader
                title="Reports Dashboard"
                subtitle="Overview and tracking of all progress reports."
                action={
                    <Button onClick={handleCreateClick} icon={<Plus className="w-4 h-4" />}>
                        Add Report
                    </Button>
                }
            />

            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-3xl p-5 shadow-sm">
                    <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest block mb-1">Total Reports</span>
                    <span className="text-3xl font-black text-neutral-900 dark:text-white leading-none">{totalCount}</span>
                </div>
                <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-3xl p-5 shadow-sm">
                    <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest block mb-1">Daily Reports</span>
                    <span className="text-3xl font-black text-orange-500 dark:text-orange-400 leading-none">{dailyCount}</span>
                </div>
                <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-3xl p-5 shadow-sm">
                    <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest block mb-1">Weekly Reports</span>
                    <span className="text-3xl font-black text-blue-500 dark:text-blue-400 leading-none">{weeklyCount}</span>
                </div>
                <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-3xl p-5 shadow-sm">
                    <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest block mb-1">Monthly Reports</span>
                    <span className="text-3xl font-black text-purple-500 dark:text-purple-400 leading-none">{monthlyCount}</span>
                </div>
            </div>

            {/* Filter Section */}
            <div className="bg-white/50 dark:bg-neutral-900/40 backdrop-blur-md border border-neutral-200/50 dark:border-neutral-800/60 rounded-3xl p-4 shadow-sm space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="relative">
                        <Input
                            placeholder="Search title or content..."
                            value={searchVal}
                            onChange={(e) => setSearchVal(e.target.value)}
                            className="pl-9 bg-white dark:bg-neutral-900"
                        />
                        <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                    </div>

                    <Select
                        value={selectedProject}
                        onChange={(val) => setSelectedProject(val)}
                        placeholder="Select Project"
                        options={[
                            { value: "all", label: "All Projects" },
                            ...projects.map(p => ({ value: p.id, label: p.name }))
                        ]}
                    />

                    <Select
                        value={selectedType}
                        onChange={(val) => setSelectedType(val)}
                        placeholder="Select Periode"
                        options={[
                            { value: "all", label: "All Periodes" },
                            { value: "daily", label: "Daily" },
                            { value: "weekly", label: "Weekly" },
                            { value: "monthly", label: "Monthly" },
                        ]}
                    />

                    <Select
                        value={selectedStatus}
                        onChange={(val) => setSelectedStatus(val)}
                        placeholder="Select Status"
                        options={[
                            { value: "all", label: "All Statuses" },
                            { value: "on-track", label: "On Track" },
                            { value: "delayed", label: "Delayed" },
                            { value: "critical", label: "Critical" },
                            { value: "completed", label: "Completed" },
                        ]}
                    />
                </div>
            </div>

            {/* Main Table Content */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-3xl shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="p-16 flex flex-col items-center justify-center gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
                        <span className="text-sm font-semibold text-neutral-500">Loading reports database...</span>
                    </div>
                ) : filteredReports.length === 0 ? (
                    <div className="p-16 flex flex-col items-center justify-center text-center gap-3">
                        <div className="bg-neutral-50 dark:bg-neutral-800 p-4 rounded-full">
                            <FileText className="w-8 h-8 text-neutral-400" />
                        </div>
                        <h3 className="text-base font-bold text-neutral-800 dark:text-white">No Reports Found</h3>
                        <p className="text-sm text-neutral-500 max-w-xs">No reports match your filters. Try selecting another filter or create a new report.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-neutral-100 dark:border-neutral-800 text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider bg-neutral-50/50 dark:bg-neutral-900/30">
                                    <th className="p-4 pl-6">Report Title</th>
                                    <th className="p-4">Project</th>
                                    <th className="p-4">Period</th>
                                    <th className="p-4">Date</th>
                                    <th className="p-4 text-center">Progress</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4 pr-6 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredReports.map((report) => (
                                    <tr 
                                        key={report.id}
                                        className="border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50/40 dark:hover:bg-neutral-900/20 transition-colors align-middle"
                                    >
                                        <td className="p-4 pl-6">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-extrabold text-neutral-800 dark:text-white">{report.title}</span>
                                                <span className="text-[10px] text-neutral-400 mt-0.5">ID: {report.id.substring(0, 8)}...</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-tight">
                                            {report.projectName}
                                        </td>
                                        <td className="p-4 text-sm font-medium">
                                            {getTypeBadge(report.reportType)}
                                        </td>
                                        <td className="p-4 text-sm font-bold text-neutral-700 dark:text-neutral-300">
                                            {report.reportDate ? new Date(report.reportDate).toLocaleDateString("id-ID", { day: '2-digit', month: 'short', year: 'numeric' }) : "-"}
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className="inline-block px-2.5 py-1 text-xs font-black rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/20">
                                                {report.progress}%
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className={clsx(
                                                "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                                                getStatusStyle(report.status)
                                            )}>
                                                {getStatusIcon(report.status)}
                                                <span>{report.status.replace("-", " ")}</span>
                                            </span>
                                        </td>
                                        <td className="p-4 pr-6 text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button 
                                                    onClick={() => handleEditClick(report)}
                                                    className="p-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                                                    title="Edit Report"
                                                >
                                                    <Edit3 className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(report.id)}
                                                    className="p-2 text-neutral-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                                                    title="Delete Report"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal Selector */}
            {isTypeModalOpen && (
                <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-2xl w-full max-w-md space-y-5 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center pb-2 border-b border-neutral-100 dark:border-neutral-800">
                            <div>
                                <h3 className="text-base font-black text-neutral-900 dark:text-white">Select Report Type</h3>
                                <p className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mt-0.5">Pilih tipe laporan harian, mingguan, bulanan</p>
                            </div>
                            <button 
                                onClick={() => setIsTypeModalOpen(false)}
                                className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full text-neutral-400 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            <button
                                onClick={() => {
                                    setIsTypeModalOpen(false);
                                    router.push("/flow/reports/editor?type=daily");
                                }}
                                className="flex items-center gap-4 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800 hover:border-orange-500/30 dark:hover:border-orange-500/20 hover:bg-orange-50/20 dark:hover:bg-orange-950/10 text-left transition-all duration-200 group"
                            >
                                <div className="p-3 bg-orange-100 dark:bg-orange-950/40 rounded-xl text-orange-600 dark:text-orange-400 group-hover:scale-105 transition-transform">
                                    <Calendar className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                    <div className="text-xs font-bold text-neutral-800 dark:text-white uppercase tracking-tight">Laporan Harian (Daily)</div>
                                    <div className="text-[10px] text-neutral-400 dark:text-neutral-500 font-semibold leading-normal mt-0.5">Template pekerjaan struktur terintegrasi dengan tabel volume kerja, labor, cuaca, & jam shift.</div>
                                </div>
                            </button>

                            <button
                                onClick={() => {
                                    setIsTypeModalOpen(false);
                                    router.push("/flow/reports/editor?type=weekly");
                                }}
                                className="flex items-center gap-4 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800 hover:border-blue-500/30 dark:hover:border-blue-500/20 hover:bg-blue-50/20 dark:hover:bg-blue-950/10 text-left transition-all duration-200 group"
                            >
                                <div className="p-3 bg-blue-100 dark:bg-blue-950/40 rounded-xl text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                    <div className="text-xs font-bold text-neutral-800 dark:text-white uppercase tracking-tight">Laporan Mingguan (Weekly)</div>
                                    <div className="text-[10px] text-neutral-400 dark:text-neutral-500 font-semibold leading-normal mt-0.5">Rekapitulasi berkala progres mingguan, pencapaian milestone, dan visual grafik status proyek.</div>
                                </div>
                            </button>

                            <button
                                onClick={() => {
                                    setIsTypeModalOpen(false);
                                    router.push("/flow/reports/editor?type=monthly");
                                }}
                                className="flex items-center gap-4 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800 hover:border-purple-500/30 dark:hover:border-purple-500/20 hover:bg-purple-50/20 dark:hover:bg-purple-950/10 text-left transition-all duration-200 group"
                            >
                                <div className="p-3 bg-purple-100 dark:bg-purple-950/40 rounded-xl text-purple-600 dark:text-purple-400 group-hover:scale-105 transition-transform">
                                    <CalendarCheck className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                    <div className="text-xs font-bold text-neutral-800 dark:text-white uppercase tracking-tight">Laporan Bulanan (Monthly)</div>
                                    <div className="text-[10px] text-neutral-400 dark:text-neutral-500 font-semibold leading-normal mt-0.5">Konsolidasi bulanan, performa keuangan, kendala strategis, dan persetujuan manajer.</div>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
