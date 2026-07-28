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
    TrendingUp,
    Download,
    RotateCcw,
    List,
    FolderTree,
    Briefcase
} from "lucide-react";
import clsx from "clsx";
import toast from "react-hot-toast";

interface MappedReport extends ProjectReport {
    projectName: string;
    projectCode: string;
    parsedContent?: any;
}

export default function MonthlyReportsPage() {
    const router = useRouter();
    const [reports, setReports] = useState<MappedReport[]>([]);
    const [projects, setProjects] = useState<{ id: string; name: string; code: string }[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Advanced Controls: Search, Project Filter, Status Filter, Sort & Grouping
    const [searchVal, setSearchVal] = useState("");
    const [selectedProject, setSelectedProject] = useState("");
    const [selectedStatus, setSelectedStatus] = useState("");
    const [sortBy, setSortBy] = useState<"date_desc" | "date_asc" | "title_asc" | "progress_desc">("date_desc");
    const [groupBy, setGroupBy] = useState<"none" | "project">("none");

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
                .eq("report_type", "monthly")
                .order("report_date", { ascending: false });

            if (error) throw error;

            const mapped: MappedReport[] = (data || []).map((r: any) => {
                let parsedContent = {};
                if (r.content) {
                    try { parsedContent = JSON.parse(r.content); } catch (e) {}
                }

                return {
                    ...r,
                    progress: r.progress || 0,
                    status: r.status || "on-track",
                    projectName: r.projects?.project_name || "Unknown Project",
                    projectCode: r.projects?.project_code || "",
                    parsedContent
                };
            });

            setReports(mapped);
        } catch (err) {
            console.error(err);
            toast.error("Gagal mengambil data Laporan Bulanan");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDropdownProjects();
        fetchReports();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm("Apakah Anda yakin ingin menghapus Laporan Bulanan ini?")) return;
        try {
            const { error } = await supabase.from("project_reports").delete().eq("id", id);
            if (error) throw error;
            toast.success("Laporan Bulanan berhasil dihapus");
            fetchReports();
        } catch (e) {
            console.error(e);
            toast.error("Gagal menghapus laporan");
        }
    };

    const handleCreateClick = () => {
        router.push("/flow/reports/editor?type=monthly");
    };

    const handleEditClick = (report: MappedReport) => {
        router.push(`/flow/reports/editor?id=${report.id}&type=monthly`);
    };

    const handleExportClick = (report: MappedReport) => {
        router.push(`/flow/reports/editor?id=${report.id}&type=monthly&export=true`);
    };

    const handleReviseClick = (report: MappedReport) => {
        router.push(`/flow/reports/editor?id=${report.id}&type=monthly&revise=true`);
    };

    const filteredReports = reports.filter(r => {
        const matchesSearch = (r.title || "").toLowerCase().includes(searchVal.toLowerCase()) || 
                              (r.projectName || "").toLowerCase().includes(searchVal.toLowerCase()) ||
                              (r.projectCode || "").toLowerCase().includes(searchVal.toLowerCase()) ||
                              (r.parsedContent?.documentId || "").toLowerCase().includes(searchVal.toLowerCase());
        
        const matchesProject = selectedProject === "" || selectedProject === "all" || r.project_id === selectedProject;
        const matchesStatus = selectedStatus === "" || selectedStatus === "all" || r.status === selectedStatus;

        return matchesSearch && matchesProject && matchesStatus;
    });

    const sortedReports = [...filteredReports].sort((a, b) => {
        if (sortBy === "date_asc") return a.report_date.localeCompare(b.report_date);
        if (sortBy === "title_asc") return a.title.localeCompare(b.title);
        if (sortBy === "progress_desc") return b.progress - a.progress;
        return b.report_date.localeCompare(a.report_date);
    });

    const groupedProjectsMap = sortedReports.reduce((acc, report) => {
        const key = report.projectName || "Tanpa Proyek";
        if (!acc[key]) acc[key] = [];
        acc[key].push(report);
        return acc;
    }, {} as Record<string, MappedReport[]>);

    const getStatusStyle = (status: ReportStatus) => {
        switch (status) {
            case "on-track":
                return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800";
            case "delayed":
                return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800";
            case "critical":
                return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800";
            case "completed":
                return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800";
            default:
                return "bg-neutral-50 text-neutral-600 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700";
        }
    };

    const getStatusIcon = (status: ReportStatus) => {
        switch (status) {
            case "on-track": return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />;
            case "delayed": return <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />;
            case "critical": return <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />;
            case "completed": return <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />;
            default: return null;
        }
    };

    const totalReports = reports.length;
    const avgProgress = totalReports > 0 
        ? Math.round(reports.reduce((acc, r) => acc + r.progress, 0) / totalReports) 
        : 0;

    const renderRow = (report: MappedReport) => {
        const pContent = report.parsedContent || {};
        const docCode = pContent.documentId || "RMN-01-01";
        const rev = pContent.revision ? `REV ${pContent.revision}` : "REV 00";
        const startDateStr = pContent.startDate || report.report_date;
        const endDateStr = pContent.endDate || "";
        const periodStr = endDateStr ? `${startDateStr} s.d. ${endDateStr}` : startDateStr;

        return (
            <tr 
                key={report.id}
                className="border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50/50 dark:hover:bg-neutral-900/30 transition-colors align-middle"
            >
                <td className="p-4 pl-6">
                    <div 
                        onClick={() => handleEditClick(report)}
                        className="flex items-center gap-2 cursor-pointer group/doc"
                        title="Buka Editor Laporan"
                    >
                        <span className="px-2 py-0.5 bg-blue-900 text-white font-bold text-[10px] rounded-md uppercase tracking-wider shrink-0 group-hover/doc:bg-blue-700 transition-colors">
                            {docCode}
                        </span>
                        <span className="font-extrabold text-neutral-900 dark:text-white text-sm group-hover/doc:text-blue-600 dark:group-hover/doc:text-blue-400 transition-colors">
                            {report.title}
                        </span>
                        <span className="text-[10px] font-bold text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">
                            {rev}
                        </span>
                    </div>
                </td>
                <td className="p-4">
                    <div 
                        onClick={() => handleEditClick(report)}
                        className="flex items-center gap-2 cursor-pointer group/proj"
                        title="Buka Editor Laporan"
                    >
                        {report.projectCode ? (
                            <span className="inline-flex items-center px-2 py-0.5 bg-neutral-200/80 dark:bg-neutral-800/80 border border-neutral-300/60 dark:border-neutral-700/60 text-neutral-700 dark:text-neutral-300 text-[10px] font-black uppercase rounded-md tracking-wider shadow-2xs shrink-0">
                                {report.projectCode}
                            </span>
                        ) : (
                            <span className="inline-flex items-center px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-500 text-[10px] font-black uppercase rounded-md shrink-0">
                                PRJ
                            </span>
                        )}
                        <span className="text-xs font-extrabold text-neutral-800 dark:text-neutral-200 uppercase truncate max-w-[150px] group-hover/proj:text-blue-600 dark:group-hover/proj:text-blue-400 transition-colors" title={report.projectName}>
                            {report.projectName}
                        </span>
                    </div>
                </td>
                <td className="p-4 whitespace-nowrap text-xs font-semibold text-neutral-500">{periodStr}</td>
                <td className="p-4">
                    <div className="flex items-center gap-2">
                        <div className="w-16 bg-neutral-100 dark:bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-purple-600 h-full rounded-full" style={{ width: `${Math.min(100, report.progress)}%` }} />
                        </div>
                        <span className="text-xs font-bold text-neutral-900 dark:text-white">{report.progress}%</span>
                    </div>
                </td>
                <td className="p-4">
                    <span className={clsx(
                        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border shadow-sm uppercase text-[10px]",
                        getStatusStyle(report.status)
                    )}>
                        {getStatusIcon(report.status)}
                        <span>{report.status.replace("-", " ")}</span>
                    </span>
                </td>
                <td className="p-4 pr-6 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                        <button
                            type="button"
                            onClick={() => handleEditClick(report)}
                            className="p-2 rounded-xl border border-neutral-200/80 dark:border-neutral-700/80 bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-neutral-900 dark:hover:text-white transition-all shadow-2xs"
                            title="Edit Laporan"
                        >
                            <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                            type="button"
                            onClick={() => handleExportClick(report)}
                            className="p-2 rounded-xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/70 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all shadow-2xs"
                            title="Export PDF"
                        >
                            <Download className="w-4 h-4" />
                        </button>

                        <button
                            type="button"
                            onClick={() => handleReviseClick(report)}
                            className="p-2 rounded-xl border border-purple-200 dark:border-purple-900/40 bg-purple-50/70 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-all shadow-2xs"
                            title="Buat Revisi Laporan"
                        >
                            <RotateCcw className="w-4 h-4" />
                        </button>

                        <button
                            type="button"
                            onClick={() => handleDelete(report.id)}
                            className="p-2 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/70 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-all shadow-2xs"
                            title="Hapus Laporan"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </td>
            </tr>
        );
    };

    return (
        <div className="w-full space-y-6">
            <StandardPageHeader
                title="Laporan Bulanan (Monthly)"
                subtitle="Daftar laporan rekapitulasi kemajuan fisik & dokumen proyek bulanan (LB-XX-01 s.d. LB-XX-10)."
                action={
                    <Button onClick={handleCreateClick} className="bg-blue-600 hover:bg-blue-700 border-blue-600 text-white font-bold text-xs shadow-xs" icon={<Plus className="w-4 h-4" />}>
                        Laporan Baru
                    </Button>
                }
            />

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white/60 dark:bg-neutral-900/50 backdrop-blur-sm border border-neutral-200/60 dark:border-neutral-800 p-5 rounded-3xl flex items-center gap-4 shadow-sm">
                    <div className="bg-blue-500/10 p-3 rounded-2xl">
                        <CalendarCheck className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                        <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest block">Total Laporan Bulanan</span>
                        <span className="text-2xl font-black text-neutral-900 dark:text-white leading-none">{totalReports}</span>
                    </div>
                </div>

                <div className="bg-white/60 dark:bg-neutral-900/50 backdrop-blur-sm border border-neutral-200/60 dark:border-neutral-800 p-5 rounded-3xl flex items-center gap-4 shadow-sm">
                    <div className="bg-purple-500/10 p-3 rounded-2xl">
                        <TrendingUp className="w-6 h-6 text-purple-500" />
                    </div>
                    <div>
                        <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest block">Rata-Rata Kemajuan</span>
                        <span className="text-2xl font-black text-neutral-900 dark:text-white leading-none">{avgProgress}%</span>
                    </div>
                </div>
            </div>

            {/* Advanced Control Toolbar: Filter, Sort & Grouping */}
            <div className="bg-white/50 dark:bg-neutral-900/40 backdrop-blur-md border border-neutral-200/50 dark:border-neutral-800/60 rounded-3xl p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="relative flex-1">
                    <Input
                        placeholder="Cari judul laporan, proyek, atau nomor..."
                        value={searchVal}
                        onChange={(e) => setSearchVal(e.target.value)}
                        className="pl-9 bg-white dark:bg-neutral-900"
                    />
                    <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Select
                        value={selectedProject}
                        onChange={(val) => setSelectedProject(val)}
                        placeholder="Filter Proyek"
                        options={[
                            { value: "all", label: "Semua Proyek" },
                            ...projects.map(p => ({ value: p.id, label: p.code ? `[${p.code}] ${p.name}` : p.name }))
                        ]}
                    />

                    <Select
                        value={selectedStatus}
                        onChange={(val) => setSelectedStatus(val)}
                        placeholder="Filter Status"
                        options={[
                            { value: "all", label: "Semua Status" },
                            { value: "on-track", label: "On Track" },
                            { value: "delayed", label: "Delayed" },
                            { value: "critical", label: "Critical" },
                            { value: "completed", label: "Completed" },
                        ]}
                    />

                    <Select
                        value={sortBy}
                        onChange={(val) => setSortBy(val as any)}
                        placeholder="Urutkan"
                        options={[
                            { value: "date_desc", label: "Terbaru (Tanggal ↓)" },
                            { value: "date_asc", label: "Terlama (Tanggal ↑)" },
                            { value: "title_asc", label: "Judul (A - Z)" },
                            { value: "progress_desc", label: "Progres Tertinggi" },
                        ]}
                    />

                    <div className="flex items-center bg-neutral-100 dark:bg-neutral-800/80 p-1 rounded-2xl border border-neutral-200/80 dark:border-neutral-700/60">
                        <button
                            type="button"
                            onClick={() => setGroupBy("none")}
                            title="Tampilan Tabel Flat"
                            className={clsx(
                                "p-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer",
                                groupBy === "none"
                                    ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-2xs"
                                    : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                            )}
                        >
                            <List className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setGroupBy("project")}
                            title="Kelompokkan Berdasarkan Proyek"
                            className={clsx(
                                "p-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer",
                                groupBy === "project"
                                    ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-2xs"
                                    : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                            )}
                        >
                            <FolderTree className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* List Table & Mobile Cards */}
            <div className="bg-transparent md:bg-white dark:md:bg-neutral-900 border-none md:border md:border-neutral-100 dark:md:border-neutral-800 rounded-3xl shadow-none md:shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="p-16 flex justify-center bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800"><Loader2 className="w-8 h-8 animate-spin text-neutral-400" /></div>
                ) : sortedReports.length === 0 ? (
                    <div className="p-16 flex flex-col items-center justify-center text-center gap-3 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800">
                        <CalendarCheck className="w-8 h-8 text-neutral-300" />
                        <span className="text-sm font-semibold text-neutral-500">Belum ada Laporan Bulanan tersimpan.</span>
                    </div>
                ) : (
                    <>
                        {/* Mobile Card List View */}
                        <div className="block md:hidden space-y-3">
                            {groupBy === "project" ? (
                                Object.entries(groupedProjectsMap).map(([projName, projReports]) => (
                                    <div key={projName} className="space-y-3">
                                        <div className="flex items-center justify-between bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md border border-neutral-200/60 dark:border-neutral-800/60 p-3 rounded-2xl shadow-2xs">
                                            <div className="flex items-center gap-2">
                                                <Briefcase className="w-4 h-4 text-neutral-500" />
                                                <span className="text-xs font-black uppercase tracking-wider text-neutral-900 dark:text-white">
                                                    {projName}
                                                </span>
                                                {projReports[0]?.projectCode && (
                                                    <span className="px-2 py-0.5 bg-neutral-200/80 dark:bg-neutral-800/80 border border-neutral-300/60 dark:border-neutral-700/60 text-neutral-700 dark:text-neutral-300 text-[10px] font-black rounded-md uppercase tracking-wider shadow-2xs">
                                                        {projReports[0].projectCode}
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-[10px] font-extrabold text-neutral-600 dark:text-neutral-400 px-2 py-0.5 bg-white/90 dark:bg-neutral-800/90 rounded-md border border-neutral-200/70 dark:border-neutral-700 shadow-2xs">
                                                {projReports.length} Dokumen
                                            </span>
                                        </div>
                                        {projReports.map(report => {
                                            const meta = report.metadata || {};
                                            const docCode = meta.documentId || report.title || "MLB";
                                            const rev = meta.revision !== undefined ? `REV ${String(meta.revision).padStart(2, '0')}` : "REV 00";
                                            return (
                                                <div 
                                                    key={report.id}
                                                    className="bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md border border-neutral-200/60 dark:border-neutral-800/60 rounded-2xl p-4 shadow-sm space-y-2.5"
                                                >
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div 
                                                            onClick={() => handleEditClick(report)}
                                                            className="flex items-center gap-2 cursor-pointer group/proj min-w-0"
                                                            title="Buka Editor Laporan"
                                                        >
                                                            {report.projectCode ? (
                                                                <span className="inline-flex items-center px-2 py-0.5 bg-neutral-200/80 dark:bg-neutral-800/80 border border-neutral-300/60 dark:border-neutral-700/60 text-neutral-700 dark:text-neutral-300 text-[10px] font-black uppercase rounded-md tracking-wider shadow-2xs shrink-0">
                                                                    {report.projectCode}
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-500 text-[10px] font-black uppercase rounded-md shrink-0">
                                                                    PRJ
                                                                </span>
                                                            )}
                                                            <span className="text-xs font-black text-neutral-900 dark:text-white uppercase truncate group-hover/proj:text-blue-600 dark:group-hover/proj:text-blue-400 transition-colors">
                                                                {report.projectName}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center gap-1.5 shrink-0">
                                                            <span className="px-2 py-0.5 bg-blue-900 text-white font-bold text-[10px] rounded-md uppercase tracking-wider">
                                                                {docCode}
                                                            </span>
                                                            <span className="text-[10px] font-bold text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">
                                                                {rev}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div 
                                                        onClick={() => handleEditClick(report)}
                                                        className="cursor-pointer"
                                                        title="Buka Editor Laporan"
                                                    >
                                                        <h4 className="text-sm font-extrabold text-neutral-900 dark:text-white leading-snug hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                                            {report.title}
                                                        </h4>
                                                    </div>

                                                    <div className="flex items-center justify-between pt-1">
                                                        <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                                                            Progres: {report.progress}%
                                                        </span>

                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleEditClick(report)}
                                                                className="p-1.5 rounded-xl border border-neutral-200/80 dark:border-neutral-700/80 bg-white/80 dark:bg-neutral-800/80 text-neutral-600 dark:text-neutral-300 shadow-2xs hover:bg-neutral-100"
                                                                title="Edit Laporan"
                                                            >
                                                                <Edit3 className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleExportClick(report)}
                                                                className="p-1.5 rounded-xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/70 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 shadow-2xs hover:bg-blue-100"
                                                                title="Export PDF"
                                                            >
                                                                <Download className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleReviseClick(report)}
                                                                className="p-1.5 rounded-xl border border-purple-200 dark:border-purple-900/40 bg-purple-50/70 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 shadow-2xs hover:bg-purple-100"
                                                                title="Buat Revisi Laporan"
                                                            >
                                                                <RotateCcw className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDelete(report.id)}
                                                                className="p-1.5 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/70 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 shadow-2xs hover:bg-rose-100"
                                                                title="Hapus Laporan"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))
                            ) : (
                                sortedReports.map(report => {
                                    const meta = report.metadata || {};
                                    const docCode = meta.documentId || report.title || "MLB";
                                    const rev = meta.revision !== undefined ? `REV ${String(meta.revision).padStart(2, '0')}` : "REV 00";
                                    return (
                                        <div 
                                            key={report.id}
                                            className="bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md border border-neutral-200/60 dark:border-neutral-800/60 rounded-2xl p-4 shadow-sm space-y-2.5"
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <div 
                                                    onClick={() => handleEditClick(report)}
                                                    className="flex items-center gap-2 cursor-pointer group/proj min-w-0"
                                                    title="Buka Editor Laporan"
                                                >
                                                    {report.projectCode ? (
                                                        <span className="inline-flex items-center px-2 py-0.5 bg-neutral-200/80 dark:bg-neutral-800/80 border border-neutral-300/60 dark:border-neutral-700/60 text-neutral-700 dark:text-neutral-300 text-[10px] font-black uppercase rounded-md tracking-wider shadow-2xs shrink-0">
                                                            {report.projectCode}
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-500 text-[10px] font-black uppercase rounded-md shrink-0">
                                                            PRJ
                                                        </span>
                                                    )}
                                                    <span className="text-xs font-black text-neutral-900 dark:text-white uppercase truncate group-hover/proj:text-blue-600 dark:group-hover/proj:text-blue-400 transition-colors">
                                                        {report.projectName}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <span className="px-2 py-0.5 bg-blue-900 text-white font-bold text-[10px] rounded-md uppercase tracking-wider">
                                                        {docCode}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">
                                                        {rev}
                                                    </span>
                                                </div>
                                            </div>

                                            <div 
                                                onClick={() => handleEditClick(report)}
                                                className="cursor-pointer"
                                                title="Buka Editor Laporan"
                                            >
                                                <h4 className="text-sm font-extrabold text-neutral-900 dark:text-white leading-snug hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                                    {report.title}
                                                </h4>
                                            </div>

                                            <div className="flex items-center justify-between pt-1">
                                                <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                                                    Progres: {report.progress}%
                                                </span>

                                                <div className="flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleEditClick(report)}
                                                        className="p-1.5 rounded-xl border border-neutral-200/80 dark:border-neutral-700/80 bg-white/80 dark:bg-neutral-800/80 text-neutral-600 dark:text-neutral-300 shadow-2xs hover:bg-neutral-100"
                                                        title="Edit Laporan"
                                                    >
                                                        <Edit3 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleExportClick(report)}
                                                        className="p-1.5 rounded-xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/70 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 shadow-2xs hover:bg-blue-100"
                                                        title="Export PDF"
                                                    >
                                                        <Download className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleReviseClick(report)}
                                                        className="p-1.5 rounded-xl border border-purple-200 dark:border-purple-900/40 bg-purple-50/70 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 shadow-2xs hover:bg-purple-100"
                                                        title="Buat Revisi Laporan"
                                                    >
                                                        <RotateCcw className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDelete(report.id)}
                                                        className="p-1.5 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/70 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 shadow-2xs hover:bg-rose-100"
                                                        title="Hapus Laporan"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-neutral-100 dark:border-neutral-800 text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider bg-neutral-50/50 dark:bg-neutral-900/30">
                                        <th className="p-4 pl-6">Kode & Judul Laporan</th>
                                        <th className="p-4">Proyek</th>
                                        <th className="p-4">Periode</th>
                                        <th className="p-4">Progres (%)</th>
                                        <th className="p-4">Status</th>
                                        <th className="p-4 pr-6 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {groupBy === "project" ? (
                                        Object.entries(groupedProjectsMap).map(([projName, projReports]) => (
                                            <React.Fragment key={projName}>
                                                <tr className="bg-neutral-100/70 dark:bg-neutral-800/60 border-y border-neutral-200/80 dark:border-neutral-700/80">
                                                    <td colSpan={6} className="py-2.5 px-6">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <Briefcase className="w-4 h-4 text-neutral-500" />
                                                                <span className="text-xs font-black uppercase tracking-wider text-neutral-900 dark:text-white">
                                                                    {projName}
                                                                </span>
                                                                {projReports[0]?.projectCode && (
                                                                    <span className="px-2 py-0.5 bg-neutral-200/80 dark:bg-neutral-800/80 border border-neutral-300/60 dark:border-neutral-700/60 text-neutral-700 dark:text-neutral-300 text-[10px] font-black rounded-md uppercase tracking-wider shadow-2xs">
                                                                        {projReports[0].projectCode}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className="text-[10px] font-extrabold text-neutral-600 dark:text-neutral-400 px-2 py-0.5 bg-white dark:bg-neutral-900 rounded-md border border-neutral-200/70 dark:border-neutral-800 shadow-2xs">
                                                                {projReports.length} Dokumen
                                                            </span>
                                                        </div>
                                                    </td>
                                                </tr>
                                                {projReports.map(report => renderRow(report))}
                                            </React.Fragment>
                                        ))
                                    ) : (
                                        sortedReports.map(report => renderRow(report))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
