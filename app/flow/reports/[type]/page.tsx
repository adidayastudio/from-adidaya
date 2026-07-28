"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import StandardPageHeader from "@/components/layout/StandardPageHeader";
import { Button } from "@/shared/ui/primitives/button/button";
import { Input } from "@/shared/ui/primitives/input/input";
import { Select } from "@/shared/ui/primitives/select/select";
import clsx from "clsx";
import { 
    Plus, 
    Search, 
    Loader2, 
    Trash2, 
    Edit3,
    Download,
    RotateCcw,
    FileText,
    List,
    FolderTree,
    Briefcase
} from "lucide-react";

const REPORT_META_MAP: Record<string, { code: string; title: string; subtitle: string }> = {
    daily: { code: "RDL", title: "Laporan Harian (Daily)", subtitle: "Kelola laporan harian proyek, cetak PDF, dan buat revisi." },
    weekly: { code: "RWK", title: "Laporan Mingguan (Weekly)", subtitle: "Kelola laporan mingguan proyek, cetak PDF, dan buat revisi." },
    monthly: { code: "RMN", title: "Laporan Bulanan (Monthly)", subtitle: "Kelola laporan bulanan proyek, cetak PDF, dan buat revisi." },
    schedule: { code: "SCH", title: "Project Schedule / Jadwal Pelaksanaan Proyek (SCH)", subtitle: "Kelola rencana jadwal S-curve, target milestone, dan pencapaian progres." },
    cost: { code: "CST", title: "Cost & Budget Realization (CST)", subtitle: "Kelola laporan realisasi biaya, RAB vs lapangan, dan analisis cashflow." },
    manpower: { code: "CRW", title: "Manpower & Payroll (CRW)", subtitle: "Kelola alokasi tenaga kerja, subkon, mandays, dan laporan payroll." },
    procurement: { code: "PRC", title: "Procurement & Stock (PRC)", subtitle: "Kelola status pengadaan material, purchase order, dan stok opname site." },
    quality: { code: "QAC", title: "Quality Control (QAC)", subtitle: "Kelola log inspeksi mutu, checklist spesifikasi, dan laporan defect NCR." },
    safety: { code: "HSE", title: "Safety & K3 (HSE)", subtitle: "Kelola jam kerja selamat, inspeksi APD, incident log, dan toolbox meeting." },
    issue_risk: { code: "RIK", title: "Risk & Issue Register (RIK)", subtitle: "Kelola inventarisasi risiko, tingkat isu kritis, dan action plan mitigasi." },
    doc_control: { code: "DOC", title: "Document Control (DOC)", subtitle: "Kelola submittal shop drawing, RFI, transmittal, dan status approval." },
    change_order: { code: "CCO", title: "Change Order VO (CCO)", subtitle: "Kelola Variation Order (VO), item pekerjaan tambah kurang, dan biaya impact." },
    executive: { code: "EXE", title: "Executive Report (EXE)", subtitle: "Kelola ringkasan eksekutif status makro proyek untuk jajaran manajemen C-Level." },
    site_survey: { code: "SUR", title: "Site Survey & Investigation (SUR)", subtitle: "Kelola data hasil survei lapangan, titik elevasi benchmark, dan kondisi eksisting." },
    mom: { code: "MOM", title: "Minute of Meeting (MOM)", subtitle: "Kelola risalah rapat koordinasi, kesepakatan, dan tracking action items." },
    field_notice: { code: "NOT", title: "Field Notice & Memo (NOT)", subtitle: "Kelola surat instruksi dinas lapangan, notice perbaikan, dan tanggapan formal." },
    memo_correspondence: { code: "NOT", title: "Field Notice & Memo (NOT)", subtitle: "Kelola surat instruksi dinas lapangan, notice perbaikan, dan tanggapan formal." },
    punch_list: { code: "PCH", title: "Punch List & BAST (PCH)", subtitle: "Kelola daftar temuan defect serah terima proyek dan verifikasi perbaikan." },
    commissioning: { code: "COM", title: "Commissioning & Testing (COM)", subtitle: "Kelola log pengujian fungsi sistem MEP, target spesifikasi, dan sertifikasi." },
    environmental: { code: "ENV", title: "Environmental Management (ENV)", subtitle: "Kelola pengelolaan limbah, kontrol kebisingan, dan kepatuhan AMDAL site." },
    people_register: { code: "PPL", title: "People & HR Register (PPL)", subtitle: "Kelola data personel tim proyek, struktur organisasi, dan kontak darurat." },
    people: { code: "PPL", title: "People & HR Register (PPL)", subtitle: "Kelola data personel tim proyek, struktur organisasi, dan kontak darurat." },
    clock_attendance: { code: "CLK", title: "Clock & Attendance (CLK)", subtitle: "Kelola presensi kehadiran tim, jam kerja shift, dan riwayat lembur." },
    clock: { code: "CLK", title: "Clock & Attendance (CLK)", subtitle: "Kelola presensi kehadiran tim, jam kerja shift, dan riwayat lembur." },
    mou_contract: { code: "MOU", title: "MOU & Contract Agreement (MOU)", subtitle: "Kelola matriks perjanjian kontrak, klausul hukum, dan syarat pelaksanaan." },
    finance: { code: "FIN", title: "Finance & Accounting (FIN)", subtitle: "Kelola pencatatan transaksi keuangan, jurnal proyek, dan laporan finansial." },
    resources: { code: "RSC", title: "Resources Register (RSC)", subtitle: "Kelola inventarisasi alat berat, mesin pendukung, dan aset lapangan." },
};

interface MappedReport {
    id: string;
    projectId: string;
    reportType: string;
    title: string;
    reportDate: string;
    progress?: number;
    status?: string;
    projectName: string;
    projectCode: string;
    documentId: string;
    revision: string;
}

export default function ExtendedReportsListPage() {
    const router = useRouter();
    const params = useParams();
    const rawType = (params?.type as string) || "schedule";
    const reportType = rawType.toLowerCase();

    const meta = REPORT_META_MAP[reportType] || {
        code: "DOC",
        title: `Laporan ${rawType.toUpperCase()}`,
        subtitle: `Kelola arsip dokumen ${rawType} proyek, cetak PDF, dan buat revisi.`
    };

    const [reports, setReports] = useState<MappedReport[]>([]);
    const [projects, setProjects] = useState<{ id: string; name: string; code: string }[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Advanced Controls: Search, Project Filter, Sort & Grouping
    const [searchVal, setSearchVal] = useState("");
    const [selectedProject, setSelectedProject] = useState("");
    const [sortBy, setSortBy] = useState<"date_desc" | "date_asc" | "title_asc" | "doc_id">("date_desc");
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
                .eq("report_type", reportType)
                .order("report_date", { ascending: false });

            if (error) throw error;

            const mapped: MappedReport[] = (data || []).map(r => {
                let parsedContent: any = {};
                if (r.content) {
                    try {
                        parsedContent = JSON.parse(r.content);
                    } catch (e) {}
                }

                return {
                    id: r.id,
                    projectId: r.project_id,
                    reportType: r.report_type,
                    title: r.title || meta.title,
                    reportDate: r.report_date,
                    progress: r.progress,
                    status: r.status,
                    projectName: r.projects?.project_name || "Unknown Project",
                    projectCode: r.projects?.project_code || "",
                    documentId: parsedContent.documentId || `${meta.code}-01-01`,
                    revision: parsedContent.revision || "00",
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
    }, [reportType]);

    const handleDelete = async (id: string) => {
        if (!confirm(`Apakah Anda yakin ingin menghapus dokumen ${meta.title} ini?`)) return;
        try {
            const { error } = await supabase.from("project_reports").delete().eq("id", id);
            if (error) throw error;
            fetchReports();
        } catch (e) {
            console.error(e);
        }
    };

    const handleCreateClick = () => {
        router.push(`/flow/reports/editor?type=${reportType}`);
    };

    const handleEditClick = (report: MappedReport) => {
        router.push(`/flow/reports/editor?id=${report.id}&type=${reportType}`);
    };

    const handleExportClick = (report: MappedReport) => {
        router.push(`/flow/reports/editor?id=${report.id}&type=${reportType}&export=true`);
    };

    const handleReviseClick = (report: MappedReport) => {
        router.push(`/flow/reports/editor?id=${report.id}&type=${reportType}&revise=true`);
    };

    const filteredReports = reports.filter(r => {
        const matchesSearch = r.title.toLowerCase().includes(searchVal.toLowerCase()) || 
                              r.projectName.toLowerCase().includes(searchVal.toLowerCase()) ||
                              r.documentId.toLowerCase().includes(searchVal.toLowerCase()) ||
                              r.projectCode.toLowerCase().includes(searchVal.toLowerCase());
        
        const matchesProject = selectedProject === "" || selectedProject === "all" || r.projectId === selectedProject;

        return matchesSearch && matchesProject;
    });

    const sortedReports = [...filteredReports].sort((a, b) => {
        if (sortBy === "date_asc") return a.reportDate.localeCompare(b.reportDate);
        if (sortBy === "title_asc") return a.title.localeCompare(b.title);
        if (sortBy === "doc_id") return a.documentId.localeCompare(b.documentId);
        return b.reportDate.localeCompare(a.reportDate);
    });

    const groupedProjectsMap = sortedReports.reduce((acc, report) => {
        const key = report.projectName || "Tanpa Proyek";
        if (!acc[key]) acc[key] = [];
        acc[key].push(report);
        return acc;
    }, {} as Record<string, MappedReport[]>);

    const getFormattedDate = (dateStr: string) => {
        if (!dateStr) return "-";
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString("id-ID", { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' });
        } catch(e) {
            return dateStr;
        }
    };

    const getCategoryTheme = (typeStr: string) => {
        const t = typeStr.toLowerCase();
        
        if (["daily", "weekly", "monthly", "schedule"].includes(t)) {
            return {
                btnClass: "bg-blue-600 hover:bg-blue-700 border-blue-600 text-white font-bold text-xs shadow-xs",
                textClass: "text-blue-600 dark:text-blue-400",
            };
        }
        
        if (["cost", "manpower", "procurement", "finance", "resources"].includes(t)) {
            return {
                btnClass: "bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white font-bold text-xs shadow-xs",
                textClass: "text-emerald-600 dark:text-emerald-400",
            };
        }
        
        if (["quality", "safety", "issue_risk"].includes(t)) {
            return {
                btnClass: "bg-purple-600 hover:bg-purple-700 border-purple-600 text-white font-bold text-xs shadow-xs",
                textClass: "text-purple-600 dark:text-purple-400",
            };
        }
        
        if (["doc_control", "change_order", "executive"].includes(t)) {
            return {
                btnClass: "bg-orange-600 hover:bg-orange-700 border-orange-600 text-white font-bold text-xs shadow-xs",
                textClass: "text-orange-600 dark:text-orange-400",
            };
        }
        
        return {
            btnClass: "bg-rose-500 hover:bg-rose-600 border-rose-500 text-white font-bold text-xs shadow-xs",
            textClass: "text-rose-500 dark:text-rose-400",
        };
    };

    const categoryTheme = getCategoryTheme(reportType);

    const renderRow = (report: MappedReport) => (
        <tr 
            key={report.id}
            className="border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50/50 dark:hover:bg-neutral-900/30 transition-colors align-middle"
        >
            <td className="p-4 pl-6">
                <div 
                    onClick={() => handleEditClick(report)}
                    className="flex items-center gap-2 cursor-pointer group/item"
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
                    <span className="text-sm font-extrabold text-neutral-900 dark:text-white uppercase truncate max-w-[180px] group-hover/item:text-blue-600 dark:group-hover/item:text-blue-400 transition-colors" title={report.projectName}>
                        {report.projectName}
                    </span>
                </div>
            </td>
            <td className="p-4">
                <span 
                    onClick={() => handleEditClick(report)}
                    className="text-sm font-bold text-neutral-800 dark:text-neutral-200 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    title="Buka Editor Laporan"
                >
                    {report.title}
                </span>
            </td>
            <td className="p-4">
                <div 
                    onClick={() => handleEditClick(report)}
                    className="flex items-center gap-2 cursor-pointer group/doc"
                    title="Buka Editor Laporan"
                >
                    <span className="text-xs font-bold text-neutral-900 dark:text-white group-hover/doc:text-blue-600 dark:group-hover/doc:text-blue-400 transition-colors">
                        {report.documentId}
                    </span>
                    <span className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 text-[10px] font-black uppercase rounded">
                        REV {report.revision}
                    </span>
                </div>
            </td>
            <td className="p-4">
                <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                    {getFormattedDate(report.reportDate)}
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
                title={meta.title}
                subtitle={meta.subtitle}
                action={
                    <Button onClick={handleCreateClick} className={categoryTheme.btnClass} icon={<Plus className="w-4 h-4" />}>
                        Laporan Baru
                    </Button>
                }
            />

            {/* Advanced Control Toolbar: Filter, Sort & Grouping */}
            <div className="bg-white/50 dark:bg-neutral-900/40 backdrop-blur-md border border-neutral-200/50 dark:border-neutral-800/60 rounded-3xl p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="relative flex-1">
                    <Input
                        placeholder="Cari nama laporan, proyek, atau nomor..."
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
                        value={sortBy}
                        onChange={(val) => setSortBy(val as any)}
                        placeholder="Urutkan"
                        options={[
                            { value: "date_desc", label: "Terbaru (Tanggal ↓)" },
                            { value: "date_asc", label: "Terlama (Tanggal ↑)" },
                            { value: "title_asc", label: "Judul (A - Z)" },
                            { value: "doc_id", label: "Nomor Dokumen" },
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
                    <div className="p-16 flex flex-col items-center justify-center gap-3 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800">
                        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
                        <span className="text-sm font-semibold text-neutral-500">Memuat arsip {meta.title}...</span>
                    </div>
                ) : sortedReports.length === 0 ? (
                    <div className="p-16 flex flex-col items-center justify-center text-center gap-3 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800">
                        <div className="bg-neutral-50 dark:bg-neutral-800 p-4 rounded-full">
                            <FileText className="w-8 h-8 text-neutral-400" />
                        </div>
                        <h3 className="text-base font-bold text-neutral-800 dark:text-white">Belum Ada {meta.title}</h3>
                        <p className="text-sm text-neutral-500 max-w-xs">Tekan tombol "Laporan Baru" untuk membuat laporan baru.</p>
                        <Button onClick={handleCreateClick} className={clsx(categoryTheme.btnClass, "mt-2")} icon={<Plus className="w-4 h-4" />}>
                            Laporan Baru
                        </Button>
                    </div>
                ) : (
                    <>
                        {/* Mobile Card List View (Glassy Cards, No Divider Line) */}
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
                                                        <span className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 text-[10px] font-black uppercase rounded">
                                                            REV {report.revision}
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
                                                    <span className="text-xs font-medium text-neutral-500">
                                                        {getFormattedDate(report.reportDate)}
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
                                                <span className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 text-[10px] font-black uppercase rounded">
                                                    REV {report.revision}
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
                                            <span className="text-xs font-medium text-neutral-500">
                                                {getFormattedDate(report.reportDate)}
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

                        {/* Desktop Table View (Hidden on mobile) */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-neutral-100 dark:border-neutral-800 text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider bg-neutral-50/50 dark:bg-neutral-900/30">
                                        <th className="p-4 pl-6">Proyek</th>
                                        <th className="p-4">Nama Laporan</th>
                                        <th className="p-4">Nomor Laporan</th>
                                        <th className="p-4">Hari & Tanggal</th>
                                        <th className="p-4 pr-6 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {groupBy === "project" ? (
                                        Object.entries(groupedProjectsMap).map(([projName, projReports]) => (
                                            <React.Fragment key={projName}>
                                                <tr className="bg-neutral-100/70 dark:bg-neutral-800/60 border-y border-neutral-200/80 dark:border-neutral-700/80">
                                                    <td colSpan={5} className="py-2.5 px-6">
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
