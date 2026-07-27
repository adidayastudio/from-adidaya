"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
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
    FileText
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
    mou_contract: { code: "MOU", title: "MOU & Contract Agreement (MOU)", subtitle: "Kelola matriks perjanjian kontrak, klausul hukum, dan syarat pelaksanaan." },
    memo_correspondence: { code: "NOT", title: "Field Notice & Memo (NOT)", subtitle: "Kelola surat instruksi dinas lapangan, notice perbaikan, dan tanggapan formal." },
    punch_list: { code: "PCH", title: "Punch List & BAST (PCH)", subtitle: "Kelola daftar temuan defect serah terima proyek dan verifikasi perbaikan." },
    commissioning: { code: "COM", title: "Commissioning & Testing (COM)", subtitle: "Kelola log pengujian fungsi sistem MEP, target spesifikasi, dan sertifikasi." },
    environmental: { code: "ENV", title: "Environmental Management (ENV)", subtitle: "Kelola pengelolaan limbah, kontrol kebisingan, dan kepatuhan AMDAL site." },
    finance: { code: "FIN", title: "Finance & Accounting (FIN)", subtitle: "Kelola pencatatan transaksi keuangan, jurnal proyek, dan laporan finansial." },
    resources: { code: "RSC", title: "Resources Register (RSC)", subtitle: "Kelola inventarisasi alat berat, mesin pendukung, dan aset lapangan." },
    people: { code: "PPL", title: "People & HR Register (PPL)", subtitle: "Kelola data personel tim proyek, struktur organisasi, dan kontak darurat." },
    clock: { code: "CLK", title: "Clock & Attendance (CLK)", subtitle: "Kelola presensi kehadiran tim, jam kerja shift, dan riwayat lembur." },
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

    // Filters
    const [searchVal, setSearchVal] = useState("");
    const [selectedProject, setSelectedProject] = useState("");

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
                              r.documentId.toLowerCase().includes(searchVal.toLowerCase());
        
        const matchesProject = selectedProject === "" || selectedProject === "all" || r.projectId === selectedProject;

        return matchesSearch && matchesProject;
    });

    const getFormattedDate = (dateStr: string) => {
        if (!dateStr) return "-";
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString("id-ID", { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' });
        } catch(e) {
            return dateStr;
        }
    };

    return (
        <div className="w-full space-y-6">
            <StandardPageHeader
                title={meta.title}
                subtitle={meta.subtitle}
                action={
                    <Button onClick={handleCreateClick} className="bg-orange-500 hover:bg-orange-600 border-orange-500 hover:border-orange-600 text-white font-bold text-xs" icon={<Plus className="w-4 h-4" />}>
                        + Laporan Baru
                    </Button>
                }
            />

            {/* Filter Bar */}
            <div className="bg-white/50 dark:bg-neutral-900/40 backdrop-blur-md border border-neutral-200/50 dark:border-neutral-800/60 rounded-3xl p-4 shadow-sm flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                    <Input
                        placeholder="Cari nama laporan, proyek, atau nomor..."
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
            </div>

            {/* List Table */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-3xl shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="p-16 flex flex-col items-center justify-center gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
                        <span className="text-sm font-semibold text-neutral-500">Memuat arsip {meta.title}...</span>
                    </div>
                ) : filteredReports.length === 0 ? (
                    <div className="p-16 flex flex-col items-center justify-center text-center gap-3">
                        <div className="bg-neutral-50 dark:bg-neutral-800 p-4 rounded-full">
                            <FileText className="w-8 h-8 text-neutral-400" />
                        </div>
                        <h3 className="text-base font-bold text-neutral-800 dark:text-white">Belum Ada {meta.title}</h3>
                        <p className="text-sm text-neutral-500 max-w-xs">Tekan tombol "+ Laporan Baru" untuk membuat laporan baru.</p>
                        <Button onClick={handleCreateClick} className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs mt-2" icon={<Plus className="w-4 h-4" />}>
                            + Laporan Baru
                        </Button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
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
                                {filteredReports.map((report) => (
                                    <tr 
                                        key={report.id}
                                        className="border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50/40 dark:hover:bg-neutral-900/20 transition-colors align-middle"
                                    >
                                        <td className="p-4 pl-6">
                                            <div className="flex items-center gap-2">
                                                {report.projectCode && (
                                                    <span className="inline-block px-1.5 py-0.5 bg-neutral-900 text-white text-[10px] font-black uppercase rounded-sm shrink-0">
                                                        {report.projectCode}
                                                    </span>
                                                )}
                                                <span className="text-sm font-extrabold text-neutral-900 dark:text-white uppercase">
                                                    {report.projectName}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
                                                {report.title}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-neutral-900 dark:text-white">
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
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleEditClick(report)}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-xs font-bold transition-colors shadow-xs"
                                                    title="Edit Laporan"
                                                >
                                                    <Edit3 className="w-3.5 h-3.5 text-neutral-500" />
                                                    <span>Edit</span>
                                                </button>

                                                <button
                                                    onClick={() => handleExportClick(report)}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-blue-200 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100/60 dark:hover:bg-blue-900/40 text-xs font-bold transition-colors shadow-xs"
                                                    title="Export PDF"
                                                >
                                                    <Download className="w-3.5 h-3.5" />
                                                    <span>Export</span>
                                                </button>

                                                <button
                                                    onClick={() => handleReviseClick(report)}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-purple-200 dark:border-purple-900/40 bg-purple-50/50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 hover:bg-purple-100/60 dark:hover:bg-purple-900/40 text-xs font-bold transition-colors shadow-xs"
                                                    title="Buat Revisi"
                                                >
                                                    <Copy className="w-3.5 h-3.5" />
                                                    <span>Revisi</span>
                                                </button>

                                                <button
                                                    onClick={() => handleDelete(report.id)}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100/60 dark:hover:bg-rose-900/40 text-xs font-bold transition-colors shadow-xs"
                                                    title="Hapus Laporan"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                    <span>Hapus</span>
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
