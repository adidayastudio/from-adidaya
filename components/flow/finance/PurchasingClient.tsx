"use client";

import { useState, useMemo } from "react";
import FinanceHeader from "@/components/flow/finance/FinanceHeader";
import FinancePageWrapper from "@/components/flow/finance/FinancePageWrapper";
import { useFinance } from "./FinanceContext";
import {
    Search,
    Eye,
    CreditCard,
    X,
    Plus,
    ChevronLeft,
    ChevronRight,
    Loader2,
    Download,
    Pencil,
    Trash2,
    Ban,
    ChevronUp,
    ChevronDown,
    CheckCircle2,
    Send,
    XCircle
} from "lucide-react";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { PurchasingItem, ApprovalStatus, FundingSource } from "@/lib/types/finance-types";
import { formatCurrency, getPrimaryStatus, STATUS_THEMES, formatStatus, cleanEntityName } from "./modules/utils";
import { useSearchParams } from "next/navigation";

// --- MOCK DATA ---
const MOCK_PURCHASES: PurchasingItem[] = [
    {
        id: "p1",
        date: "2026-01-15",
        project_id: "proj1",
        project_code: "RMK",
        project_name: "Rumah Kemang",
        vendor: "PT Bangun Jaya",
        description: "Seman Tiga Roda",
        quantity: "50",
        unit: "sak",
        type: "MATERIAL",
        subcategory: "Cement",
        amount: 12500000,
        approval_status: "APPROVED",
        purchase_stage: "RECEIVED",
        financial_status: "UNPAID",
        created_by: "user1",
        created_by_name: "Site Manager",
        submitted_by_name: "Budi Santoso",
        created_at: "2026-01-14",
        updated_at: "2026-01-15"
    },
    {
        id: "p2",
        date: "2026-01-14",
        project_id: "proj1",
        project_code: "RMK",
        project_name: "Rumah Kemang",
        vendor: "CV Steel Indo",
        description: "Besi Beton 12mm",
        quantity: "100",
        unit: "btg",
        type: "MATERIAL",
        subcategory: "Steel",
        amount: 45000000,
        approval_status: "SUBMITTED",
        purchase_stage: "INVOICED",
        financial_status: "UNPAID",
        created_by: "user1",
        created_by_name: "Site Manager",
        submitted_by_name: "Budi Santoso",
        created_at: "2026-01-13",
        updated_at: "2026-01-14"
    },
    {
        id: "p3",
        date: "2026-01-13",
        project_id: "proj2",
        project_code: "VLP",
        project_name: "Villa Puncak",
        vendor: "PT Contractor Pro",
        description: "Jasa Cor Lantai 2",
        quantity: "1",
        unit: "ls",
        type: "SERVICE",
        subcategory: "Concrete",
        amount: 85000000,
        approval_status: "APPROVED",
        purchase_stage: "INVOICED",
        financial_status: "UNPAID",
        created_by: "user2",
        created_by_name: "PM",
        submitted_by_name: "Anas Malik",
        created_at: "2026-01-12",
        updated_at: "2026-01-13"
    },
    {
        id: "p4",
        date: "2026-01-12",
        project_id: "proj1",
        project_code: "RMK",
        project_name: "Rumah Kemang",
        vendor: "Toko Elektrik Jaya",
        description: "Material Listrik Paket",
        quantity: "1",
        unit: "set",
        type: "MATERIAL",
        subcategory: "Electric",
        amount: 18500000,
        approval_status: "PAID",
        purchase_stage: "RECEIVED",
        financial_status: "PAID",
        source_of_fund_name: "Bank Mandiri",
        payment_date: "2026-01-13",
        created_by: "user1",
        created_by_name: "Site Manager",
        submitted_by_name: "Budi Santoso",
        created_at: "2026-01-11",
        updated_at: "2026-01-13"
    },
    {
        id: "p5",
        date: "2026-01-10",
        project_id: "proj2",
        project_code: "VLP",
        project_name: "Villa Puncak",
        vendor: "CV Alat Konstruksi",
        description: "Sewa Molen",
        quantity: "3",
        unit: "hari",
        type: "TOOL",
        subcategory: "Rental",
        amount: 2400000,
        approval_status: "PAID",
        purchase_stage: "PLANNED",
        financial_status: "PAID",
        source_of_fund_name: "Petty Cash Puncak",
        payment_date: "2026-01-10",
        created_by: "user3",
        created_by_name: "Foreman",
        submitted_by_name: "Marno",
        created_at: "2026-01-09",
        updated_at: "2026-01-10"
    },
];

const MOCK_FUNDING_SOURCES: FundingSource[] = [
    { id: "fs1", name: "Bank Mandiri", type: "BANK", currency: "IDR", is_active: true, created_at: "", updated_at: "" },
    { id: "fs2", name: "Bank BCA", type: "BANK", currency: "IDR", is_active: true, created_at: "", updated_at: "" },
    { id: "fs3", name: "Petty Cash Kemang", type: "PETTY_CASH", currency: "IDR", balance: 5000000, is_active: true, created_at: "", updated_at: "" },
    { id: "fs4", name: "Petty Cash Puncak", type: "PETTY_CASH", currency: "IDR", balance: 8000000, is_active: true, created_at: "", updated_at: "" },
];

function PayModal({ item, onClose, onPay }: { item: PurchasingItem; onClose: () => void; onPay: (source: string, date: string, notes: string) => void }) {
    const [selectedSource, setSelectedSource] = useState("");
    const [paymentDate, setPaymentDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [notes, setNotes] = useState("");

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-md" onClick={onClose} />
            <div className="relative w-full max-w-md bg-white/95 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-white/50 overflow-hidden animate-in fade-in zoom-in duration-300">
                <div className="p-8">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-neutral-900">Process Payment</h3>
                        <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
                            <X className="w-5 h-5 text-neutral-400" />
                        </button>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-100">
                            <div className="text-sm font-semibold text-neutral-900">{item.description}</div>
                            <div className="text-xs text-neutral-500 mt-1">{item.vendor} • {item.project_name}</div>
                            <div className="text-lg font-bold text-neutral-900 mt-2">{formatCurrency(item.amount)}</div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest px-1 mb-2 block">Source of Fund</label>
                                <div className="relative group">
                                    <select
                                        value={selectedSource}
                                        onChange={(e) => setSelectedSource(e.target.value)}
                                        className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500/50 appearance-none transition-all"
                                    >
                                        <option value="">Select funding source...</option>
                                        {MOCK_FUNDING_SOURCES.map(source => (
                                            <option key={source.id} value={source.id}>{source.name}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="w-4 h-4 text-neutral-400 absolute right-4 top-1/2 -translate-y-1/2 group-focus-within:text-red-500 transition-colors pointer-events-none" />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest px-1 mb-2 block">Payment Date</label>
                                <input
                                    type="date"
                                    value={paymentDate}
                                    onChange={(e) => setPaymentDate(e.target.value)}
                                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500/50 transition-all font-medium"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest px-1 mb-2 block">Notes</label>
                                <textarea
                                    rows={2}
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Add payment notes..."
                                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500/50 transition-all resize-none"
                                />
                            </div>
                        </div>

                        <button
                            onClick={() => onPay(selectedSource, paymentDate, notes)}
                            disabled={!selectedSource}
                            className="w-full h-12 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-lg shadow-red-200 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            <CreditCard className="w-4 h-4" />
                            Confirm Payment
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function PurchasingClient() {
    const { viewMode, userId, isLoading } = useFinance();
    const searchParams = useSearchParams();
    const [searchTerm, setSearchTerm] = useState("");
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    const initialStatus = searchParams.get("status") as ApprovalStatus | "ALL" | null;
    const [statusFilter, setStatusFilter] = useState<ApprovalStatus | "ALL">(
        (initialStatus && ["ALL", "DRAFT", "SUBMITTED", "APPROVED", "PAID"].includes(initialStatus))
            ? initialStatus
            : "ALL"
    );
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [isExporting, setIsExporting] = useState(false);

    const handleMonthChange = (direction: "prev" | "next") => {
        const newDate = new Date(currentMonth);
        newDate.setMonth(newDate.getMonth() + (direction === "next" ? 1 : -1));
        setCurrentMonth(newDate);
    };

    const handleExport = async () => {
        if (filteredItems.length === 0) return;
        setIsExporting(true);

        try {
            const documentName = isTeamView ? "Team Purchasing Report" : "My Purchasing Report";
            const generatedAt = new Date().toLocaleString("id-ID");
            const periodText = format(currentMonth, "MMMM yyyy");

            const columns = [
                { id: "date", label: "Date", align: "left" as const },
                { id: "project", label: "Project", align: "left" as const },
                { id: "description", label: "Description", align: "left" as const },
                { id: "amount", label: "Amount", align: "right" as const },
                { id: "status", label: "Status", align: "center" as const },
            ];

            const rows = filteredItems.map(item => ({
                date: format(new Date(item.date), "dd MMM yyyy"),
                project: `[${item.project_code}] ${item.project_name}`,
                description: item.description,
                amount: formatCurrency(item.amount),
                status: formatStatus(getPrimaryStatus(item.approval_status, item.purchase_stage, item.financial_status)),
            }));

            const response = await fetch("/api/export/pdf", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    meta: {
                        projectCode: "FINANCE",
                        projectName: "Adidaya Finance",
                        documentName,
                        periodText,
                        generatedAt,
                    },
                    columns,
                    data: rows
                })
            });

            if (!response.ok) throw new Error("Export failed");

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `Purchasing_Report_${format(currentMonth, "yyyy_MM")}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

        } catch (error) {
            console.error("PDF Export Error:", error);
            alert("Failed to export PDF. Please try again.");
        } finally {
            setIsExporting(false);
        }
    };

    const [payingItem, setPayingItem] = useState<PurchasingItem | null>(null);
    const [rejectingItem, setRejectingItem] = useState<PurchasingItem | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: keyof PurchasingItem; direction: 'asc' | 'desc' } | null>(
        { key: 'date', direction: 'desc' }
    );

    const handleSort = (key: keyof PurchasingItem) => {
        setSortConfig(prev => {
            if (prev?.key === key) {
                if (prev.direction === 'asc') return { key, direction: 'desc' };
                return null;
            }
            return { key, direction: 'asc' };
        });
    };

    const isTeamView = viewMode === "team";

    const filteredItems = useMemo(() => {
        let items = [...MOCK_PURCHASES];

        if (!isTeamView) {
            items = items.filter(item => item.created_by === userId || item.created_by === "user1");
        }

        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            items = items.filter(item =>
                item.description.toLowerCase().includes(lower) ||
                item.vendor.toLowerCase().includes(lower) ||
                item.project_name.toLowerCase().includes(lower) ||
                item.project_code.toLowerCase().includes(lower)
            );
        }

        if (statusFilter !== "ALL") {
            items = items.filter(item => item.approval_status === statusFilter);
        }

        if (sortConfig) {
            items.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];
                if (aValue === undefined || bValue === undefined) return 0;
                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return items;
    }, [viewMode, userId, searchTerm, statusFilter, isTeamView, sortConfig]);

    if (isLoading) {
        return (
            <FinancePageWrapper
                breadcrumbItems={[{ label: "Flow" }, { label: "Finance" }, { label: "Purchasing" }]}
                header={<FinanceHeader title="Purchasing" subtitle="Loading..." />}
            >
                <div className="animate-pulse h-96 bg-neutral-100 rounded-xl" />
            </FinancePageWrapper>
        );
    }

    return (
        <FinancePageWrapper
            breadcrumbItems={[{ label: "Flow" }, { label: "Finance" }, { label: "Purchasing" }]}
            header={
                <FinanceHeader
                    title="Purchasing"
                    subtitle={isTeamView ? "Manage all staff purchase requests." : "Track your material and tool requests."}
                />
            }
        >
            {/* TOOLBAR */}
            <div
                className="flex flex-col md:flex-row gap-4 justify-between items-center p-3 rounded-2xl backdrop-blur-xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.04)]"
                style={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.6) 100%)',
                }}
            >
                <div className="flex flex-1 items-center gap-4 w-full md:w-auto">
                    {/* Search - Height 40px */}
                    <div className="h-10 flex items-center gap-2 px-3 bg-white/70 backdrop-blur-md rounded-full border border-white/40 shadow-sm group/search focus-within:ring-2 focus-within:ring-red-500/20 focus-within:bg-white/90 transition-all duration-300 w-full max-w-[280px]">
                        <Search className="w-4 h-4 text-neutral-400 group-focus-within/search:text-red-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search purchases..."
                            className="bg-transparent border-none outline-none text-sm font-medium text-neutral-600 placeholder:text-neutral-400 w-full h-full"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Animated Toggle - Height 40px */}
                    <div className="h-10 flex items-center p-1 bg-white/70 backdrop-blur-md rounded-full border border-white/40 shadow-sm w-fit relative">
                        {(['ALL', 'DRAFT', 'SUBMITTED', 'APPROVED', 'PAID'] as const).map((s) => (
                            <button
                                key={s}
                                onClick={() => setStatusFilter(s)}
                                className={clsx(
                                    "relative z-10 px-4 h-full rounded-full text-[10px] font-bold transition-colors duration-300 uppercase tracking-widest flex items-center justify-center",
                                    statusFilter === s
                                        ? clsx(
                                            s === "ALL" ? "text-red-700" :
                                                s === "DRAFT" ? "text-neutral-500" :
                                                    s === "SUBMITTED" ? "text-orange-600" :
                                                        s === "APPROVED" ? "text-blue-600" :
                                                            s === "PAID" ? "text-green-600" :
                                                                "text-neutral-900"
                                        )
                                        : "text-neutral-400 hover:text-neutral-600"
                                )}
                            >
                                {statusFilter === s && (
                                    <motion.div
                                        layoutId="status-pill"
                                        className="absolute inset-0 bg-white rounded-full border border-white/50"
                                        style={{ zIndex: -1 }}
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                        animate={{
                                            boxShadow: s === "ALL" ? "0 4px 12px rgba(220, 38, 38, 0.15)" :
                                                s === "DRAFT" ? "0 4px 12px rgba(115, 115, 115, 0.15)" :
                                                    s === "SUBMITTED" ? "0 4px 12px rgba(234, 88, 12, 0.15)" :
                                                        s === "APPROVED" ? "0 4px 12px rgba(37, 99, 235, 0.15)" :
                                                            s === "PAID" ? "0 4px 12px rgba(22, 163, 74, 0.15)" :
                                                                "0 4px 12px rgba(0, 0, 0, 0.05)"
                                        }}
                                    />
                                )}
                                {s === "ALL" ? "All" : s}
                            </button>
                        ))}
                    </div>

                    {/* Month Selector - Height 40px */}
                    <div className="h-10 flex items-center gap-1 p-1 bg-white/70 backdrop-blur-md rounded-full border border-white/40 shadow-sm">
                        <button
                            onClick={() => handleMonthChange("prev")}
                            className="w-8 h-8 flex items-center justify-center hover:bg-white/80 rounded-full text-neutral-400 hover:text-neutral-600 transition-all active:scale-95"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <div className="px-3 text-sm font-bold text-neutral-600 whitespace-nowrap min-w-[120px] text-center">
                            {format(currentMonth, "MMMM yyyy")}
                        </div>
                        <button
                            onClick={() => handleMonthChange("next")}
                            className="w-8 h-8 flex items-center justify-center hover:bg-white/80 rounded-full text-neutral-400 hover:text-neutral-600 transition-all active:scale-95"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleExport}
                        disabled={isExporting}
                        className="h-10 px-6 bg-white/50 backdrop-blur-md border border-white/60 hover:bg-neutral-100 hover:text-neutral-900 hover:border-neutral-300 text-neutral-800 rounded-xl text-sm font-bold shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
                    >
                        {isExporting ? (
                            <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />
                        ) : (
                            <Download className="w-4 h-4 text-neutral-400 group-hover:text-red-500 transition-colors" />
                        )}
                        Export PDF
                    </button>
                    <button
                        onClick={() => setIsDrawerOpen(true)}
                        className="h-10 px-6 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-red-200 active:scale-95 transition-all flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        New Purchase
                    </button>
                </div>
            </div>

            {/* TABLE */}
            <div className="mt-6 bg-white/40 backdrop-blur-md rounded-3xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.02)] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-neutral-100 bg-white/20">
                                <th
                                    className="px-6 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest cursor-pointer hover:text-neutral-600 transition-colors"
                                    onClick={() => handleSort('date')}
                                >
                                    <div className="flex items-center gap-1 group/header">
                                        Date
                                        {sortConfig?.key === 'date' ? (
                                            sortConfig.direction === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-red-500" /> : <ChevronDown className="w-3.5 h-3.5 text-red-500" />
                                        ) : <ChevronDown className="w-3.5 h-3.5 opacity-0 group-hover/header:opacity-30 transition-opacity" />}
                                    </div>
                                </th>
                                <th
                                    className="px-6 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest cursor-pointer hover:text-neutral-600 transition-colors"
                                    onClick={() => handleSort('project_name')}
                                >
                                    <div className="flex items-center gap-1 group/header">
                                        Project
                                        {sortConfig?.key === 'project_name' ? (
                                            sortConfig.direction === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-red-500" /> : <ChevronDown className="w-3.5 h-3.5 text-red-500" />
                                        ) : <ChevronDown className="w-3.5 h-3.5 opacity-0 group-hover/header:opacity-30 transition-opacity" />}
                                    </div>
                                </th>
                                <th
                                    className="px-6 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest cursor-pointer hover:text-neutral-600 transition-colors"
                                    onClick={() => handleSort('description')}
                                >
                                    <div className="flex items-center gap-1 group/header">
                                        Description
                                        {sortConfig?.key === 'description' ? (
                                            sortConfig.direction === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-red-500" /> : <ChevronDown className="w-3.5 h-3.5 text-red-500" />
                                        ) : <ChevronDown className="w-3.5 h-3.5 opacity-0 group-hover/header:opacity-30 transition-opacity" />}
                                    </div>
                                </th>
                                <th
                                    className="px-6 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest cursor-pointer hover:text-neutral-600 transition-colors"
                                    onClick={() => handleSort('type')}
                                >
                                    <div className="flex items-center gap-1 group/header">
                                        Category
                                        {sortConfig?.key === 'type' ? (
                                            sortConfig.direction === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-red-500" /> : <ChevronDown className="w-3.5 h-3.5 text-red-500" />
                                        ) : <ChevronDown className="w-3.5 h-3.5 opacity-0 group-hover/header:opacity-30 transition-opacity" />}
                                    </div>
                                </th>
                                <th
                                    className="px-6 py-4 text-right text-[10px] font-bold text-neutral-400 uppercase tracking-widest cursor-pointer hover:text-neutral-600 transition-colors"
                                    onClick={() => handleSort('amount')}
                                >
                                    <div className="flex items-center justify-end gap-1 group/header">
                                        Amount
                                        {sortConfig?.key === 'amount' ? (
                                            sortConfig.direction === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-red-500" /> : <ChevronDown className="w-3.5 h-3.5 text-red-500" />
                                        ) : <ChevronDown className="w-3.5 h-3.5 opacity-0 group-hover/header:opacity-30 transition-opacity" />}
                                    </div>
                                </th>
                                <th className="px-6 py-4 text-center text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Status</th>
                                {isTeamView && (
                                    <th
                                        className="px-6 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest cursor-pointer hover:text-neutral-600 transition-colors"
                                        onClick={() => handleSort('submitted_by_name')}
                                    >
                                        <div className="flex items-center gap-1 group/header">
                                            Submitter
                                            {sortConfig?.key === 'submitted_by_name' ? (
                                                sortConfig.direction === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-red-500" /> : <ChevronDown className="w-3.5 h-3.5 text-red-500" />
                                            ) : <ChevronDown className="w-3.5 h-3.5 opacity-0 group-hover/header:opacity-30 transition-opacity" />}
                                        </div>
                                    </th>
                                )}
                                <th className="px-6 py-4 text-right text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-50">
                            {filteredItems.map((item) => (
                                <tr
                                    key={item.id}
                                    className="group hover:bg-white/60 hover:shadow-[0_8px_32px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
                                >
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-[12px] font-normal text-neutral-500 tabular-nums">
                                            {format(new Date(item.date), "dd MMM yyyy")}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] font-bold text-neutral-400 bg-neutral-100/60 backdrop-blur-sm px-1 py-0.5 rounded border border-neutral-200/30 tracking-tight w-fit">
                                                {item.project_code}
                                            </span>
                                            <span className="text-[12px] font-medium text-neutral-900 truncate max-w-[150px]">{cleanEntityName(item.project_name)}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-[12px] font-semibold text-neutral-900 tracking-tight leading-tight mb-0.5">{item.description}</div>
                                        <div className="text-[10px] font-normal text-neutral-400 flex items-center gap-1.5">
                                            <span className="text-neutral-500 font-medium">{item.quantity} {item.unit}</span>
                                            <span className="text-neutral-300">•</span>
                                            <span className="hover:text-neutral-600 transition-colors tracking-tight text-[10px]">{cleanEntityName(item.vendor)}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-0.5 group/type">
                                            <span className="inline-flex items-center gap-1 text-[12px] font-medium text-neutral-900 w-fit tracking-tight group-hover/type:text-neutral-600 transition-colors">
                                                {item.type}
                                            </span>
                                            <span className="text-[10px] font-medium text-neutral-400 group-hover/type:text-neutral-500 transition-colors">
                                                {item.subcategory}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="text-[12px] font-bold text-neutral-900 tabular-nums tracking-tight">
                                            {formatCurrency(item.amount)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {(() => {
                                            const primaryStatus = getPrimaryStatus(
                                                item.approval_status,
                                                item.purchase_stage,
                                                item.financial_status
                                            );
                                            const theme = STATUS_THEMES[primaryStatus];
                                            return (
                                                <span className={clsx(
                                                    "px-1.5 py-0.5 rounded-full text-[10px] font-bold w-fit uppercase tracking-widest shadow-sm backdrop-blur-md border border-white/10",
                                                    theme.bg, theme.text
                                                )}>
                                                    {primaryStatus}
                                                </span>
                                            );
                                        })()}
                                    </td>
                                    {isTeamView && (
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <div className="text-[12px] font-medium text-neutral-900 tabular-nums">
                                                    {cleanEntityName(item.submitted_by_name || "N/A")}
                                                </div>
                                                <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-tighter">
                                                    {item.created_by_name}
                                                </div>
                                            </div>
                                        </td>
                                    )}
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                            {isTeamView ? (
                                                <>
                                                    {item.approval_status === "SUBMITTED" && (
                                                        <>
                                                            <button className="p-1.5 text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-all" title="Approve">
                                                                <CheckCircle2 className="w-4 h-4" strokeWidth={1.5} />
                                                            </button>
                                                            <button onClick={(e) => { e.stopPropagation(); setRejectingItem(item); }} className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-all" title="Reject">
                                                                <Ban className="w-4 h-4" strokeWidth={1.5} />
                                                            </button>
                                                        </>
                                                    )}
                                                    {item.approval_status === "APPROVED" && item.financial_status !== "PAID" && (
                                                        <button onClick={(e) => { e.stopPropagation(); setPayingItem(item); }} className="p-1.5 text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-all" title="Mark as Paid">
                                                            <CreditCard className="w-4 h-4" strokeWidth={1.5} />
                                                        </button>
                                                    )}
                                                </>
                                            ) : (
                                                <>
                                                    {item.approval_status === "DRAFT" && (
                                                        <>
                                                            <button className="p-1.5 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all" title="Edit Request">
                                                                <Pencil className="w-4 h-4" strokeWidth={1.5} />
                                                            </button>
                                                            <button className="p-1.5 text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-all" title="Submit Request">
                                                                <Send className="w-4 h-4" strokeWidth={1.5} />
                                                            </button>
                                                            <button className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all" title="Delete Request">
                                                                <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                                                            </button>
                                                        </>
                                                    )}
                                                    {item.approval_status === "SUBMITTED" && (
                                                        <button className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all" title="Cancel Request">
                                                            <XCircle className="w-4 h-4" strokeWidth={1.5} />
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                            <div className="w-px h-4 bg-neutral-200 mx-1" />
                                            <button className="p-1.5 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all" title="View Details">
                                                <Eye className="w-4 h-4" strokeWidth={1.5} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {payingItem && (
                <PayModal
                    item={payingItem}
                    onClose={() => setPayingItem(null)}
                    onPay={(source, date, notes) => {
                        console.log("Paying", payingItem.id, source, date, notes);
                        setPayingItem(null);
                    }}
                />
            )}
        </FinancePageWrapper>
    );
}
