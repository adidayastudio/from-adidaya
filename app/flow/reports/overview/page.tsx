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
    X,
    TrendingUp,
    DollarSign,
    Users,
    Package,
    ShieldCheck,
    HardHat,
    AlertOctagon,
    FileSpreadsheet,
    FileDiff,
    Award,
    MapPin,
    MessageSquare,
    FileCheck,
    Mail,
    CheckSquare,
    Sliders,
    Leaf,
    Landmark,
    Truck
} from "lucide-react";
import clsx from "clsx";
import { ExtendedReportType, ReportCluster } from "@/types/project";

interface MappedReport extends ProjectReport {
    projectName: string;
}

interface ReportTypeDef {
    type: ExtendedReportType;
    cluster: ReportCluster;
    clusterLabel: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
}

const REPORT_DEFINITIONS: ReportTypeDef[] = [
    // Cluster 1: Progress & Schedule
    {
        type: "daily",
        cluster: "progress_control",
        clusterLabel: "Progress & Schedule",
        title: "Daily Progress Report",
        description: "Laporan harian volume fisik, tenaga kerja, cuaca & shift kerja.",
        icon: <Calendar className="w-5 h-5" />,
        color: "text-orange-600 dark:text-orange-400",
        bgColor: "bg-orange-100 dark:bg-orange-950/40"
    },
    {
        type: "weekly",
        cluster: "progress_control",
        clusterLabel: "Progress & Schedule",
        title: "Weekly Progress Report",
        description: "Rekapitulasi progres mingguan, pencapaian milestone & grafik.",
        icon: <FileText className="w-5 h-5" />,
        color: "text-blue-600 dark:text-blue-400",
        bgColor: "bg-blue-100 dark:bg-blue-950/40"
    },
    {
        type: "monthly",
        cluster: "progress_control",
        clusterLabel: "Progress & Schedule",
        title: "Monthly Progress Report",
        description: "Konsolidasi progres bulanan, performa & approval manajemen.",
        icon: <CalendarCheck className="w-5 h-5" />,
        color: "text-purple-600 dark:text-purple-400",
        bgColor: "bg-purple-100 dark:bg-purple-950/40"
    },
    {
        type: "schedule",
        cluster: "progress_control",
        clusterLabel: "Progress & Schedule",
        title: "Schedule & S-Curve Report",
        description: "Timeline umum, Gantt Chart, Kurva-S rencana vs realisasi.",
        icon: <TrendingUp className="w-5 h-5" />,
        color: "text-emerald-600 dark:text-emerald-400",
        bgColor: "bg-emerald-100 dark:bg-emerald-950/40"
    },

    // Cluster 2: Cost, Manpower & Logistics
    {
        type: "cost",
        cluster: "financial_resources",
        clusterLabel: "Cost & Resources",
        title: "Cost & Budget Report",
        description: "Perbandingan RAB (Ballpark/Estimate/Detail) vs Realisasi & CPI.",
        icon: <DollarSign className="w-5 h-5" />,
        color: "text-green-600 dark:text-green-400",
        bgColor: "bg-green-100 dark:bg-green-950/40"
    },
    {
        type: "manpower",
        cluster: "financial_resources",
        clusterLabel: "Cost & Resources",
        title: "Manpower & Payroll Report",
        description: "Data crew, tukang, presensi harian, mandays & rekap gaji.",
        icon: <Users className="w-5 h-5" />,
        color: "text-teal-600 dark:text-teal-400",
        bgColor: "bg-teal-100 dark:bg-teal-950/40"
    },
    {
        type: "procurement",
        cluster: "financial_resources",
        clusterLabel: "Cost & Resources",
        title: "Procurement & Stock Report",
        description: "Pemesanan PO material/alat/jasa, mutasi & stock opname.",
        icon: <Package className="w-5 h-5" />,
        color: "text-amber-600 dark:text-amber-400",
        bgColor: "bg-amber-100 dark:bg-amber-950/40"
    },
    {
        type: "finance",
        cluster: "financial_resources",
        clusterLabel: "Cost & Resources",
        title: "Finance Register",
        description: "Pencatatan transaksi kas/bank, jurnal, piutang-hutang & rekonsiliasi.",
        icon: <Landmark className="w-5 h-5" />,
        color: "text-emerald-600 dark:text-emerald-400",
        bgColor: "bg-emerald-100 dark:bg-emerald-950/40"
    },
    {
        type: "resources",
        cluster: "financial_resources",
        clusterLabel: "Cost & Resources",
        title: "Equipment & Asset Register",
        description: "Inventarisasi alat berat, log operasi HM, servis & demobilisasi.",
        icon: <Truck className="w-5 h-5" />,
        color: "text-blue-600 dark:text-blue-400",
        bgColor: "bg-blue-100 dark:bg-blue-950/40"
    },

    // Cluster 3: Quality, HSE & Risk Engine
    {
        type: "quality",
        cluster: "quality_safety_risk",
        clusterLabel: "Quality, HSE & Risk",
        title: "Quality (QA/QC) Report",
        description: "Inspection request, checklist, test result, defect & NCR log.",
        icon: <ShieldCheck className="w-5 h-5" />,
        color: "text-indigo-600 dark:text-indigo-400",
        bgColor: "bg-indigo-100 dark:bg-indigo-950/40"
    },
    {
        type: "safety",
        cluster: "quality_safety_risk",
        clusterLabel: "Quality, HSE & Risk",
        title: "Safety (HSE/K3) Report",
        description: "Safety induction, toolbox meeting, incident log, PTW & LTI hours.",
        icon: <HardHat className="w-5 h-5" />,
        color: "text-yellow-600 dark:text-yellow-400",
        bgColor: "bg-yellow-100 dark:bg-yellow-950/40"
    },
    {
        type: "issue_risk",
        cluster: "quality_safety_risk",
        clusterLabel: "Quality, HSE & Risk",
        title: "Issue & Risk Register",
        description: "Risk matrix, dampak, prioritas, PIC & tindakan mitigasi.",
        icon: <AlertOctagon className="w-5 h-5" />,
        color: "text-rose-600 dark:text-rose-400",
        bgColor: "bg-rose-100 dark:bg-rose-950/40"
    },

    // Cluster 4: Governance, Change & Executive
    {
        type: "doc_control",
        cluster: "governance_change",
        clusterLabel: "Governance & Change",
        title: "Document Control Report",
        description: "Shop drawing, MAR, RFI, transmittal, BAST & approval status.",
        icon: <FileSpreadsheet className="w-5 h-5" />,
        color: "text-cyan-600 dark:text-cyan-400",
        bgColor: "bg-cyan-100 dark:bg-cyan-950/40"
    },
    {
        type: "change_order",
        cluster: "governance_change",
        clusterLabel: "Governance & Change",
        title: "Change & Claim (VO/CO) Report",
        description: "Variation order, site instruction, cost & time extension impact.",
        icon: <FileDiff className="w-5 h-5" />,
        color: "text-sky-600 dark:text-sky-400",
        bgColor: "bg-sky-100 dark:bg-sky-950/40"
    },
    {
        type: "executive",
        cluster: "governance_change",
        clusterLabel: "Governance & Change",
        title: "Executive Summary Report",
        description: "High-level progress, budget health, key issues & C-level photo summary.",
        icon: <Award className="w-5 h-5" />,
        color: "text-violet-600 dark:text-violet-400",
        bgColor: "bg-violet-100 dark:bg-violet-950/40"
    },

    // Cluster 5: Site Operations & Formal Docs
    {
        type: "site_survey",
        cluster: "site_formal",
        clusterLabel: "Site Ops & Formal",
        title: "Site Survey & Assessment Report",
        description: "Survei topografi, geoteknik, kondisi eksisting & drone visual.",
        icon: <MapPin className="w-5 h-5" />,
        color: "text-pink-600 dark:text-pink-400",
        bgColor: "bg-pink-100 dark:bg-pink-950/40"
    },
    {
        type: "mom",
        cluster: "site_formal",
        clusterLabel: "Site Ops & Formal",
        title: "Minute of Meeting (MOM)",
        description: "Risalah rapat koordinasi, action items, PIC & target penyelesaian.",
        icon: <MessageSquare className="w-5 h-5" />,
        color: "text-fuchsia-600 dark:text-fuchsia-400",
        bgColor: "bg-fuchsia-100 dark:bg-fuchsia-950/40"
    },
    {
        type: "mou_contract",
        cluster: "site_formal",
        clusterLabel: "Site Ops & Formal",
        title: "MOU & Contractual Report",
        description: "Matriks LOI, MOU, kontrak subkon & addendum perjanjian.",
        icon: <FileCheck className="w-5 h-5" />,
        color: "text-slate-600 dark:text-slate-400",
        bgColor: "bg-slate-100 dark:bg-slate-950/40"
    },
    {
        type: "memo_correspondence",
        cluster: "site_formal",
        clusterLabel: "Site Ops & Formal",
        title: "Memo Internal & Official Notice",
        description: "Surat instruksi lapangan, memo internal & surat teguran (SP).",
        icon: <Mail className="w-5 h-5" />,
        color: "text-gray-600 dark:text-gray-400",
        bgColor: "bg-gray-100 dark:bg-gray-950/40"
    },
    {
        type: "punch_list",
        cluster: "site_formal",
        clusterLabel: "Site Ops & Formal",
        title: "Handover & Punch List Report",
        description: "Daftar defect BAST I & II per area lengkap dengan foto perbaikan.",
        icon: <CheckSquare className="w-5 h-5" />,
        color: "text-emerald-700 dark:text-emerald-300",
        bgColor: "bg-emerald-150 dark:bg-emerald-900/40"
    },
    {
        type: "commissioning",
        cluster: "site_formal",
        clusterLabel: "Site Ops & Formal",
        title: "Commissioning & Testing Report",
        description: "Pengujian sistem MEP, genset, fire alarm & fasilitas bangunan.",
        icon: <Sliders className="w-5 h-5" />,
        color: "text-blue-700 dark:text-blue-300",
        bgColor: "bg-blue-150 dark:bg-blue-900/40"
    },
    {
        type: "environmental",
        cluster: "site_formal",
        clusterLabel: "Site Ops & Formal",
        title: "Environmental & Waste Report",
        description: "Pengelolaan limbah konstruksi, tingkat kebisingan & AMDAL.",
        icon: <Leaf className="w-5 h-5" />,
        color: "text-lime-600 dark:text-lime-400",
        bgColor: "bg-lime-100 dark:bg-lime-950/40"
    }
];

export default function ReportsOverviewPage() {
    const router = useRouter();
    const [reports, setReports] = useState<MappedReport[]>([]);
    const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Generator State
    const [modalTab, setModalTab] = useState<string>("all");
    const [modalSearch, setModalSearch] = useState<string>("");


    // Filter States
    const [searchVal, setSearchVal] = useState("");
    const [selectedProject, setSelectedProject] = useState("");
    const [selectedCluster, setSelectedCluster] = useState("");
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
                reportCategory: r.report_category,
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

    const handleEditClick = (report: MappedReport) => {
        router.push(`/flow/reports/editor?id=${report.id}&type=${report.reportType || "weekly"}`);
    };

    // Filtering logic
    const filteredReports = reports.filter(r => {
        const matchesSearch = r.title.toLowerCase().includes(searchVal.toLowerCase()) || 
                              r.projectName.toLowerCase().includes(searchVal.toLowerCase()) ||
                              (r.content && r.content.toLowerCase().includes(searchVal.toLowerCase()));
        
        const matchesProject = selectedProject === "" || selectedProject === "all" || r.projectId === selectedProject;
        const matchesCluster = selectedCluster === "" || selectedCluster === "all" || r.reportCategory === selectedCluster;
        const matchesStatus = selectedStatus === "" || selectedStatus === "all" || r.status === selectedStatus;

        return matchesSearch && matchesProject && matchesCluster && matchesStatus;
    });

    // Counts for stats cards
    const totalCount = reports.length;
    const progressCount = reports.filter(r => ["daily", "weekly", "monthly", "schedule"].includes(r.reportType || "")).length;
    const financialCount = reports.filter(r => ["cost", "manpower", "procurement", "finance", "resources"].includes(r.reportType || "")).length;
    const qualitySafetyCount = reports.filter(r => ["quality", "safety", "issue_risk"].includes(r.reportType || "")).length;

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

    const getTypeBadge = (type?: string) => {
        const found = REPORT_DEFINITIONS.find(d => d.type === type);
        if (!found) {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                    <FileText className="w-3.5 h-3.5" />
                    {type || "Report"}
                </span>
            );
        }

        return (
            <span className={clsx(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-current/20",
                found.bgColor,
                found.color
            )}>
                {found.icon}
                {found.title.split(" ")[0]}
            </span>
        );
    };

    const filteredGeneratorItems = REPORT_DEFINITIONS.filter(item => {
        const matchesTab = modalTab === "all" || item.cluster === modalTab;
        const matchesText = item.title.toLowerCase().includes(modalSearch.toLowerCase()) || 
                            item.description.toLowerCase().includes(modalSearch.toLowerCase());
        return matchesTab && matchesText;
    });

    return (
        <div className="w-full space-y-8">
            <StandardPageHeader
                title="Advanced Reports Hub"
                subtitle="Centralized generator for all 18 construction report types and project document database."
            />

            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-3xl p-5 shadow-sm">
                    <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest block mb-1">Total Reports</span>
                    <span className="text-3xl font-black text-neutral-900 dark:text-white leading-none">{totalCount}</span>
                </div>
                <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-3xl p-5 shadow-sm">
                    <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest block mb-1">Progress & Schedule</span>
                    <span className="text-3xl font-black text-blue-500 dark:text-blue-400 leading-none">{progressCount}</span>
                </div>
                <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-3xl p-5 shadow-sm">
                    <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest block mb-1">Cost & Resources</span>
                    <span className="text-3xl font-black text-emerald-500 dark:text-emerald-400 leading-none">{financialCount}</span>
                </div>
                <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-3xl p-5 shadow-sm">
                    <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest block mb-1">QA/QC, HSE & Risk</span>
                    <span className="text-3xl font-black text-indigo-500 dark:text-indigo-400 leading-none">{qualitySafetyCount}</span>
                </div>
            </div>

            {/* SECTION 1: ON-PAGE REPORT GENERATOR TEMPLATE BUTTONS */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 rounded-3xl p-6 shadow-sm space-y-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-100 dark:border-neutral-800 pb-4">
                    <div>
                        <h3 className="text-lg font-black text-neutral-900 dark:text-white flex items-center gap-2">
                            <Plus className="w-5 h-5 text-blue-500" />
                            Report Generator Action Cards
                        </h3>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium mt-0.5">
                            Pilih salah satu dari 18 tipe template di bawah untuk membuat laporan proyek baru secara instan
                        </p>
                    </div>

                    <div className="relative w-full md:w-64">
                        <Input
                            placeholder="Cari template laporan..."
                            value={modalSearch}
                            onChange={(e) => setModalSearch(e.target.value)}
                            className="pl-9 h-9 text-xs bg-neutral-50 dark:bg-neutral-950"
                        />
                        <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
                    </div>
                </div>

                {/* Cluster Filter Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {[
                        { id: "all", label: "Semua Template (18)" },
                        { id: "progress_control", label: "Progress & Schedule" },
                        { id: "financial_resources", label: "Cost & Logistics" },
                        { id: "quality_safety_risk", label: "QA/QC, HSE & Risk" },
                        { id: "governance_change", label: "Governance & Exec" },
                        { id: "site_formal", label: "Site & Formal Docs" },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setModalTab(tab.id)}
                            className={clsx(
                                "px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200",
                                modalTab === tab.id
                                    ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-sm"
                                    : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                            )}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Generator Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 pt-1">
                    {filteredGeneratorItems.map((def) => (
                        <button
                            key={def.type}
                            onClick={() => router.push(`/flow/reports/editor?type=${def.type}`)}
                            className="flex flex-col text-left p-4 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-md bg-neutral-50/50 dark:bg-neutral-950/40 hover:bg-white dark:hover:bg-neutral-900 transition-all duration-200 group relative overflow-hidden"
                        >
                            <div className="flex items-center justify-between w-full mb-2.5">
                                <div className={clsx("p-2.5 rounded-xl group-hover:scale-105 transition-transform", def.bgColor, def.color)}>
                                    {def.icon}
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-white dark:bg-neutral-800 text-neutral-500 border border-neutral-200/60 dark:border-neutral-700/60">
                                    {def.clusterLabel}
                                </span>
                            </div>
                            <h4 className="text-xs font-black text-neutral-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {def.title}
                            </h4>
                            <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium leading-relaxed mt-1 line-clamp-2">
                                {def.description}
                            </p>
                        </button>
                    ))}
                </div>
            </div>

            {/* SECTION 2: DATABASE REPORTS TABLE */}
            <div className="space-y-4 pt-2">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                        <h3 className="text-lg font-black text-neutral-900 dark:text-white">Daftar Laporan Terimpan</h3>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium mt-0.5">
                            Arsip dan riwayat seluruh dokumen laporan proyek yang telah dibuat
                        </p>
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
                            value={selectedCluster}
                            onChange={(val) => setSelectedCluster(val)}
                            placeholder="Select Cluster"
                            options={[
                                { value: "all", label: "All Clusters" },
                                { value: "progress_control", label: "Progress & Schedule" },
                                { value: "financial_resources", label: "Cost & Resources" },
                                { value: "quality_safety_risk", label: "Quality, HSE & Risk" },
                                { value: "governance_change", label: "Governance & Change" },
                                { value: "site_formal", label: "Site Ops & Formal Docs" },
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
                            <p className="text-sm text-neutral-500 max-w-xs">No reports match your filters. Select a template above to generate a new report.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-neutral-100 dark:border-neutral-800 text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider bg-neutral-50/50 dark:bg-neutral-900/30">
                                        <th className="p-4 pl-6">Report Title</th>
                                        <th className="p-4">Project</th>
                                        <th className="p-4">Type</th>
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
            </div>
        </div>
    );
}


