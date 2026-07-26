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
    Loader2, 
    Trash2, 
    Edit3, 
    CheckCircle2, 
    AlertTriangle, 
    Clock,
    CalendarCheck,
    TrendingUp
} from "lucide-react";
import clsx from "clsx";

interface MappedReport extends ProjectReport {
    projectName: string;
}

export default function MonthlyReportsPage() {
    const router = useRouter();
    const [reports, setReports] = useState<MappedReport[]>([]);
    const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filters
    const [searchVal, setSearchVal] = useState("");
    const [selectedProject, setSelectedProject] = useState("");
    const [selectedStatus, setSelectedStatus] = useState("");

    const fetchDropdownProjects = async () => {
        try {
            const { data } = await supabase.from("projects").select("id, project_name").order("project_name");
            setProjects((data || []).map(p => ({ id: p.id, name: p.project_name })));
        } catch (err) {
            console.error(err);
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
                .eq("report_type", "monthly")
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
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDropdownProjects();
        fetchReports();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this monthly report?")) return;
        try {
            const { error } = await supabase.from("project_reports").delete().eq("id", id);
            if (error) throw error;
            fetchReports();
        } catch (e) {
            console.error(e);
        }
    };

    const handleCreateClick = () => {
        router.push("/flow/reports/editor?type=monthly");
    };

    const handleEditClick = (report: MappedReport) => {
        router.push(`/flow/reports/editor?id=${report.id}&type=monthly`);
    };

    const filteredReports = reports.filter(r => {
        const matchesSearch = r.title.toLowerCase().includes(searchVal.toLowerCase()) || 
                              r.projectName.toLowerCase().includes(searchVal.toLowerCase()) ||
                              (r.content && r.content.toLowerCase().includes(searchVal.toLowerCase()));
        
        const matchesProject = selectedProject === "" || selectedProject === "all" || r.projectId === selectedProject;
        const matchesStatus = selectedStatus === "" || selectedStatus === "all" || r.status === selectedStatus;

        return matchesSearch && matchesProject && matchesStatus;
    });

    // Monthly Metrics
    const totalReports = filteredReports.length;
    const completedProjectsCount = filteredReports.filter(r => r.status === "completed").length;
    const avgProgress = totalReports > 0 
        ? Math.round(filteredReports.reduce((acc, curr) => acc + curr.progress, 0) / totalReports) 
        : 0;

    const getStatusIcon = (status: ReportStatus) => {
        switch (status) {
            case "on-track": return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
            case "delayed": return <Clock className="w-3.5 h-3.5 text-amber-500" />;
            case "critical": return <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />;
            case "completed": return <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />;
        }
    };

    const getStatusStyle = (status: ReportStatus) => {
        switch (status) {
            case "on-track": return "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30";
            case "delayed": return "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900/30";
            case "critical": return "bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border-rose-100 dark:border-rose-900/30";
            case "completed": return "bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-900/30";
        }
    };

    return (
        <div className="w-full space-y-6">
            <StandardPageHeader
                title="Laporan Bulanan (Monthly)"
                subtitle="Consolidated month-end project health and alignment dashboard."
                action={
                    <Button onClick={handleCreateClick} className="bg-purple-600 hover:bg-purple-700 border-purple-600 hover:border-purple-700 text-white font-bold text-xs" icon={<Plus className="w-4 h-4" />}>
                        New Monthly Report
                    </Button>
                }
            />

            {/* Monthly stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-3xl p-5 shadow-sm flex items-center gap-4">
                    <div className="bg-purple-500/10 p-3 rounded-2xl">
                        <CalendarCheck className="w-6 h-6 text-purple-500" />
                    </div>
                    <div>
                        <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest block">Reports Filed</span>
                        <span className="text-2xl font-black text-neutral-900 dark:text-white leading-none">{totalReports}</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-3xl p-5 shadow-sm flex items-center gap-4">
                    <div className="bg-blue-500/10 p-3 rounded-2xl">
                        <TrendingUp className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                        <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest block">Average Progress</span>
                        <span className="text-2xl font-black text-neutral-900 dark:text-white leading-none">{avgProgress}%</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-3xl p-5 shadow-sm flex items-center gap-4">
                    <div className="bg-emerald-500/10 p-3 rounded-2xl">
                        <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                    </div>
                    <div>
                        <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest block">Completed Milestones</span>
                        <span className="text-2xl font-black text-neutral-900 dark:text-white leading-none">{completedProjectsCount}</span>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white/50 dark:bg-neutral-900/40 backdrop-blur-md border border-neutral-200/50 dark:border-neutral-800/60 rounded-3xl p-4 shadow-sm flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                    <Input
                        placeholder="Search monthly details..."
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

            {/* List */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-3xl shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="p-16 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-neutral-400" /></div>
                ) : filteredReports.length === 0 ? (
                    <div className="p-16 flex flex-col items-center justify-center text-center gap-3">
                        <CalendarCheck className="w-8 h-8 text-neutral-300" />
                        <span className="text-sm font-semibold text-neutral-500">No Monthly Reports filed.</span>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-neutral-100 dark:border-neutral-800 text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider bg-neutral-50/50 dark:bg-neutral-900/30">
                                    <th className="p-4 pl-6">Report Title</th>
                                    <th className="p-4">Project</th>
                                    <th className="p-4">Date</th>
                                    <th className="p-4">Progress</th>
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
                                        <td className="p-4 pl-6 font-bold text-neutral-900 dark:text-white">{report.title}</td>
                                        <td className="p-4 text-neutral-500 dark:text-neutral-400">{report.projectName}</td>
                                        <td className="p-4 whitespace-nowrap text-xs text-neutral-400">{report.reportDate}</td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-16 bg-neutral-100 dark:bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                                                    <div className="bg-purple-600 h-full rounded-full" style={{ width: `${report.progress}%` }} />
                                                </div>
                                                <span className="text-xs font-bold">{report.progress}%</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={clsx(
                                                "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border shadow-sm",
                                                getStatusStyle(report.status)
                                            )}>
                                                {getStatusIcon(report.status)}
                                                <span>{report.status.replace("-", " ")}</span>
                                            </span>
                                        </td>
                                        <td className="p-4 pr-6 text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button onClick={() => handleEditClick(report)} className="p-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-lg hover:bg-neutral-100 transition-colors"><Edit3 className="w-4 h-4" /></button>
                                                <button onClick={() => handleDelete(report.id)} className="p-2 text-neutral-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
