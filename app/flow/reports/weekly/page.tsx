"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
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
    Download,
    Copy,
    FileText,
    Briefcase,
    CheckCircle2,
    Clock,
    AlertTriangle
} from "lucide-react";
import clsx from "clsx";

interface MappedReport {
    id: string;
    projectId: string;
    reportType: string;
    title: string;
    reportDate: string;
    progress: number;
    status: string;
    manpowerCount?: number;
    weatherCondition?: string;
    content?: string;
    createdAt?: string;
    updatedAt?: string;
    projectName: string;
    projectCode: string;
    documentId: string;
    revision: string;
    weekNumber: string;
    periodeStr: string;
}

export default function WeeklyReportsPage() {
    const router = useRouter();
    const [reports, setReports] = useState<MappedReport[]>([]);
    const [projects, setProjects] = useState<{ id: string; name: string; code: string }[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filters
    const [searchVal, setSearchVal] = useState("");
    const [selectedProject, setSelectedProject] = useState("");
    const [selectedStatus, setSelectedStatus] = useState("");

    const fetchDropdownProjects = async () => {
        try {
            const { data } = await supabase.from("projects").select("id, project_name, project_code").order("project_name");
            setProjects((data || []).map(p => ({ id: p.id, name: p.project_name, code: p.project_code || "" })));
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
                        project_name,
                        project_code
                    )
                `)
                .eq("report_type", "weekly")
                .order("report_date", { ascending: false });

            if (error) throw error;

            const mapped: MappedReport[] = (data || []).map(r => {
                let parsedContent: any = {};
                if (r.content) {
                    try {
                        parsedContent = JSON.parse(r.content);
                    } catch (e) {}
                }

                const startDate = parsedContent.startDate ? new Date(parsedContent.startDate).toLocaleDateString("id-ID", { day: '2-digit', month: 'short' }) : "";
                const endDate = parsedContent.endDate ? new Date(parsedContent.endDate).toLocaleDateString("id-ID", { day: '2-digit', month: 'short', year: 'numeric' }) : "";
                const periodeStr = startDate && endDate ? `${startDate} - ${endDate}` : r.report_date;

                return {
                    id: r.id,
                    projectId: r.project_id,
                    reportType: r.report_type,
                    title: r.title || "Laporan Mingguan",
                    reportDate: r.report_date,
                    progress: r.progress || 0,
                    status: r.status || "on-track",
                    manpowerCount: r.manpower_count,
                    weatherCondition: r.weather_condition,
                    content: r.content,
                    createdAt: r.created_at,
                    updatedAt: r.updated_at,
                    projectName: r.projects?.project_name || "Unknown Project",
                    projectCode: r.projects?.project_code || "",
                    documentId: parsedContent.documentId || `LM-${(parsedContent.weekNumber || '01').padStart(2, '0')}-01`,
                    revision: parsedContent.revision || "00",
                    weekNumber: parsedContent.weekNumber || "01",
                    periodeStr
                };
            });

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
        if (!confirm("Apakah Anda yakin ingin menghapus laporan mingguan ini?")) return;
        try {
            const { error } = await supabase.from("project_reports").delete().eq("id", id);
            if (error) throw error;
            fetchReports();
        } catch (e) {
            console.error(e);
        }
    };

    const handleCreateClick = () => {
        router.push("/flow/reports/editor?type=weekly");
    };

    const handleEditClick = (report: MappedReport) => {
        router.push(`/flow/reports/editor?id=${report.id}&type=weekly`);
    };

    const handleExportClick = (report: MappedReport) => {
        router.push(`/flow/reports/editor?id=${report.id}&type=weekly&export=true`);
    };

    const handleReviseClick = (report: MappedReport) => {
        router.push(`/flow/reports/editor?id=${report.id}&type=weekly&revise=true`);
    };

    const filteredReports = reports.filter(r => {
        const matchesSearch = r.title.toLowerCase().includes(searchVal.toLowerCase()) || 
                              r.projectName.toLowerCase().includes(searchVal.toLowerCase()) ||
                              r.documentId.toLowerCase().includes(searchVal.toLowerCase());
        
        const matchesProject = selectedProject === "" || selectedProject === "all" || r.projectId === selectedProject;
        const matchesStatus = selectedStatus === "" || selectedStatus === "all" || r.status === selectedStatus;

        return matchesSearch && matchesProject && matchesStatus;
    });

    const totalReports = filteredReports.length;
    const activeProjectsCount = new Set(filteredReports.map(r => r.projectId)).size;
    const avgProgress = totalReports > 0 
        ? Math.round(filteredReports.reduce((acc, curr) => acc + curr.progress, 0) / totalReports) 
        : 0;

    const getStatusStyle = (status: string) => {
        switch (status) {
            case "on-track": return "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30";
            case "delayed": return "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900/30";
            case "critical": return "bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border-rose-100 dark:border-rose-900/30";
            case "completed": return "bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-900/30";
            default: return "bg-neutral-50 text-neutral-600 border-neutral-200";
        }
    };

    return (
        <div className="w-full space-y-6">
            <StandardPageHeader
                title="Laporan Mingguan (Weekly / LM)"
                subtitle="Kelola laporan mingguan konstruksi, rekap progres fisik, cetak PDF, dan buat revisi."
                action={
                    <Button onClick={handleCreateClick} className="bg-blue-600 hover:bg-blue-700 border-blue-600 hover:border-blue-700 text-white font-bold text-xs" icon={<Plus className="w-4 h-4" />}>
                        + Laporan Mingguan Baru
                    </Button>
                }
            />

            {/* Weekly Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-3xl p-5 shadow-sm flex items-center gap-4">
                    <div className="bg-blue-500/10 p-3 rounded-2xl">
                        <FileText className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                        <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest block">Total Laporan LM</span>
                        <span className="text-2xl font-black text-neutral-900 dark:text-white leading-none">{totalReports}</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-3xl p-5 shadow-sm flex items-center gap-4">
                    <div className="bg-emerald-500/10 p-3 rounded-2xl">
                        <Briefcase className="w-6 h-6 text-emerald-500" />
                    </div>
                    <div>
                        <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest block">Proyek Aktif</span>
                        <span className="text-2xl font-black text-neutral-900 dark:text-white leading-none">{activeProjectsCount}</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-3xl p-5 shadow-sm flex items-center gap-4">
                    <div className="bg-purple-500/10 p-3 rounded-2xl">
                        <CheckCircle2 className="w-6 h-6 text-purple-500" />
                    </div>
                    <div>
                        <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest block">Rata-Rata Progres</span>
                        <span className="text-2xl font-black text-neutral-900 dark:text-white leading-none">{avgProgress}%</span>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white/50 dark:bg-neutral-900/40 backdrop-blur-md border border-neutral-200/50 dark:border-neutral-800/60 rounded-3xl p-4 shadow-sm flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                    <Input
                        placeholder="Cari judul laporan, proyek, atau nomor..."
                        value={searchVal}
                        onChange={(e) => setSearchVal(e.target.value)}
                        className="pl-9 bg-white dark:bg-neutral-900"
                    />
                    <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                </div>

                <Select
                    value={selectedProject}
                    onChange={(val) => setSelectedProject(val)}
                    placeholder="Pilih Proyek"
                    options={[
                        { value: "all", label: "Semua Proyek" },
                        ...projects.map(p => ({ value: p.id, label: p.code ? `[${p.code}] ${p.name}` : p.name }))
                    ]}
                />

                <Select
                    value={selectedStatus}
                    onChange={(val) => setSelectedStatus(val)}
                    placeholder="Pilih Status"
                    options={[
                        { value: "all", label: "Semua Status" },
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
                    <div className="p-16 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-neutral-400 animate-spin" /></div>
                ) : filteredReports.length === 0 ? (
                    <div className="p-16 flex flex-col items-center justify-center text-center gap-3">
                        <FileText className="w-8 h-8 text-neutral-300" />
                        <span className="text-sm font-semibold text-neutral-500">Belum ada Laporan Mingguan yang dibuat.</span>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-neutral-100 dark:border-neutral-800 text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider bg-neutral-50/50 dark:bg-neutral-900/30">
                                    <th className="p-4 pl-6">Dokumen & Judul</th>
                                    <th className="p-4">Proyek</th>
                                    <th className="p-4">Periode</th>
                                    <th className="p-4">Progres</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4 pr-6 text-right">Aksi</th>
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
                                                <div className="flex items-center gap-2">
                                                    <span className="px-2 py-0.5 bg-blue-900 text-white text-[9px] font-black rounded-md uppercase tracking-wider">
                                                        {report.documentId}
                                                    </span>
                                                    {report.revision && (
                                                        <span className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 text-[9px] font-extrabold rounded">
                                                            REV {report.revision}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-sm font-extrabold text-neutral-800 dark:text-white mt-1">{report.title}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase block">{report.projectName}</span>
                                        </td>
                                        <td className="p-4 whitespace-nowrap text-xs text-neutral-500">
                                            {report.periodeStr}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-16 bg-neutral-100 dark:bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                                                    <div className="bg-blue-600 h-full rounded-full" style={{ width: `${Math.min(100, report.progress)}%` }} />
                                                </div>
                                                <span className="text-xs font-bold text-neutral-800 dark:text-white">{report.progress}%</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={clsx(
                                                "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border shadow-sm uppercase text-[10px]",
                                                getStatusStyle(report.status)
                                            )}>
                                                <span>{report.status.replace("-", " ")}</span>
                                            </span>
                                        </td>
                                        <td className="p-4 pr-6 text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button onClick={() => handleExportClick(report)} title="Cetak / Export PDF" className="p-2 text-neutral-500 hover:text-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors">
                                                    <Download className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleReviseClick(report)} title="Buat Revisi (Duplicate with REV+1)" className="p-2 text-neutral-500 hover:text-purple-600 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-colors">
                                                    <Copy className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleEditClick(report)} title="Edit Laporan" className="p-2 text-neutral-500 hover:text-neutral-900 dark:hover:text-white rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                                                    <Edit3 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDelete(report.id)} title="Hapus Laporan" className="p-2 text-neutral-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors">
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
        </div>
    );
}
