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
    RotateCcw,
    FileText,
    Briefcase,
    CheckCircle2,
    Clock,
    AlertTriangle,
    List,
    FolderTree
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

                const reportDateObj = r.report_date ? new Date(r.report_date) : new Date();
                const startDateObj = new Date(reportDateObj);
                startDateObj.setDate(startDateObj.getDate() - 6);

                const formatDateShort = (d: Date) => d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
                const periodeStr = `${formatDateShort(startDateObj)} - ${formatDateShort(reportDateObj)}`;

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
                    documentId: parsedContent.documentId || "RWK-00-01",
                    revision: parsedContent.revision || "00",
                    weekNumber: parsedContent.weekNumber || "1",
                    periodeStr,
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
                              r.documentId.toLowerCase().includes(searchVal.toLowerCase()) ||
                              r.projectCode.toLowerCase().includes(searchVal.toLowerCase());
        
        const matchesProject = selectedProject === "" || selectedProject === "all" || r.projectId === selectedProject;
        const matchesStatus = selectedStatus === "" || selectedStatus === "all" || r.status === selectedStatus;

        return matchesSearch && matchesProject && matchesStatus;
    });

    const sortedReports = [...filteredReports].sort((a, b) => {
        if (sortBy === "date_asc") return a.reportDate.localeCompare(b.reportDate);
        if (sortBy === "title_asc") return a.title.localeCompare(b.title);
        if (sortBy === "progress_desc") return b.progress - a.progress;
        return b.reportDate.localeCompare(a.reportDate);
    });

    const groupedProjectsMap = sortedReports.reduce((acc, report) => {
        const key = report.projectName || "Tanpa Proyek";
        if (!acc[key]) acc[key] = [];
        acc[key].push(report);
        return acc;
    }, {} as Record<string, MappedReport[]>);

    const getStatusStyle = (status: string) => {
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

    const totalReports = reports.length;
    const avgProgress = reports.length > 0 
        ? Math.round(reports.reduce((acc, r) => acc + r.progress, 0) / reports.length) 
        : 0;

    const renderRow = (report: MappedReport) => (
        <tr 
            key={report.id}
            className="border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50/50 dark:hover:bg-neutral-900/30 transition-colors align-middle"
        >
            <td className="p-4 pl-6">
                <div 
                    onClick={() => handleEditClick(report)}
                    className="flex flex-col cursor-pointer group/doc"
                    title="Buka Editor Laporan"
                >
                    <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-blue-900 text-white text-[9px] font-black rounded-md uppercase tracking-wider group-hover/doc:bg-blue-700 transition-colors">
                            {report.documentId}
                        </span>
                        {report.revision && (
                            <span className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 text-[9px] font-extrabold rounded">
                                REV {report.revision}
                            </span>
                        )}
                    </div>
                    <span className="text-sm font-extrabold text-neutral-800 dark:text-white mt-1 group-hover/doc:text-blue-600 dark:group-hover/doc:text-blue-400 transition-colors">{report.title}</span>
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
            <td className="p-4 whitespace-nowrap text-xs text-neutral-500 font-semibold">
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

    return (
        <div className="w-full space-y-6">
            <StandardPageHeader
                title="Laporan Mingguan (Weekly)"
                subtitle="Kelola laporan mingguan konstruksi, rekap progres fisik, cetak PDF, dan buat revisi."
                action={
                    <Button onClick={handleCreateClick} className="bg-blue-600 hover:bg-blue-700 border-blue-600 hover:border-blue-700 text-white font-bold text-xs shadow-xs" icon={<Plus className="w-4 h-4" />}>
                        Laporan Baru
                    </Button>
                }
            />

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white/60 dark:bg-neutral-900/50 backdrop-blur-sm border border-neutral-200/60 dark:border-neutral-800 p-5 rounded-3xl flex items-center gap-4 shadow-sm">
                    <div className="bg-blue-500/10 p-3 rounded-2xl">
                        <FileText className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                        <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest block">Total Laporan</span>
                        <span className="text-2xl font-black text-neutral-900 dark:text-white leading-none">{totalReports}</span>
                    </div>
                </div>

                <div className="bg-white/60 dark:bg-neutral-900/50 backdrop-blur-sm border border-neutral-200/60 dark:border-neutral-800 p-5 rounded-3xl flex items-center gap-4 shadow-sm">
                    <div className="bg-purple-500/10 p-3 rounded-2xl">
                        <CheckCircle2 className="w-6 h-6 text-purple-500" />
                    </div>
                    <div>
                        <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest block">Rata-Rata Progres</span>
                        <span className="text-2xl font-black text-neutral-900 dark:text-white leading-none">{avgProgress}%</span>
                    </div>
                </div>
            </div>

            {/* Advanced Control Toolbar: Filters, Sort & Grouping */}
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
                        <FileText className="w-8 h-8 text-neutral-300" />
                        <span className="text-sm font-semibold text-neutral-500">Belum ada Laporan Mingguan yang dibuat.</span>
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
                                        {projReports.map(report => (
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
                                                        <span className="text-xs font-bold text-neutral-900 dark:text-white">
                                                            {report.documentId}
                                                        </span>
                                                        {report.revision && (
                                                            <span className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 text-[10px] font-black uppercase rounded">
                                                                REV {report.revision}
                                                            </span>
                                                        )}
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
                                                    <p className="text-xs font-semibold text-neutral-500 mt-0.5">
                                                        Periode: {report.periodeStr}
                                                    </p>
                                                </div>

                                                <div className="flex items-center justify-between pt-1">
                                                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
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
                                        ))}
                                    </div>
                                ))
                            ) : (
                                sortedReports.map(report => (
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
                                                <span className="text-xs font-bold text-neutral-900 dark:text-white">
                                                    {report.documentId}
                                                </span>
                                                {report.revision && (
                                                    <span className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 text-[10px] font-black uppercase rounded">
                                                        REV {report.revision}
                                                    </span>
                                                )}
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
                                            <p className="text-xs font-semibold text-neutral-500 mt-0.5">
                                                Periode: {report.periodeStr}
                                            </p>
                                        </div>

                                        <div className="flex items-center justify-between pt-1">
                                            <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
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
                                ))
                            )}
                        </div>

                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto">
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
