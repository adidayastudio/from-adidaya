"use client";

import { useState, useMemo } from "react";
import FinanceHeader from "@/components/flow/finance/FinanceHeader";
import FinancePageWrapper from "@/components/flow/finance/FinancePageWrapper";
import { useFinance } from "./FinanceContext";
import {
    Search,
    Eye,
    CreditCard,
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
    XCircle,
    Send
} from "lucide-react";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { ReimburseRequest, ReimburseStatus } from "@/lib/types/finance-types";
import { formatCurrency, STATUS_THEMES, cleanEntityName, getPrimaryStatus } from "./modules/utils";
import { useSearchParams } from "next/navigation";

// --- MOCK DATA ---
const MOCK_REIMBURSE: ReimburseRequest[] = [
    { id: "r1", staff_id: "user1", staff_name: "Ahmad Fauzi", project_id: "RMK", project_name: "Rumah Kemang", description: "Transport ke site (Grab)", amount: 450000, status: "PENDING", created_at: "2026-01-15", updated_at: "2026-01-15" },
    { id: "r2", staff_id: "user2", staff_name: "Budi Santoso", project_id: "RMK", project_name: "Rumah Kemang", description: "Makan tim lembur", amount: 850000, status: "PENDING", invoice_url: "/receipts/r2.pdf", created_at: "2026-01-14", updated_at: "2026-01-14" },
    { id: "r3", staff_id: "user3", staff_name: "Siti Aminah", project_id: "VLP", project_name: "Villa Puncak", description: "Beli ATK untuk site office", amount: 325000, status: "APPROVED", created_at: "2026-01-12", updated_at: "2026-01-13" },
    { id: "r4", staff_id: "user1", staff_name: "Ahmad Fauzi", project_id: "VLP", project_name: "Villa Puncak", description: "Parkir meeting client", amount: 75000, status: "PAID", payment_date: "2026-01-10", created_at: "2026-01-08", updated_at: "2026-01-10" },
    { id: "r5", staff_id: "user4", staff_name: "Dewi Lestari", project_id: "RMK", project_name: "Rumah Kemang", description: "Pengiriman dokumen express", amount: 150000, status: "REJECTED", created_at: "2026-01-05", updated_at: "2026-01-06" },
];

export default function ReimburseClient() {
    const { viewMode, userId, isLoading } = useFinance();
    const searchParams = useSearchParams();
    const [searchTerm, setSearchTerm] = useState("");
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [isExporting, setIsExporting] = useState(false);

    const initialStatus = searchParams.get("status") as ReimburseStatus | "ALL" | null;
    const [statusFilter, setStatusFilter] = useState<ReimburseStatus | "ALL">(
        (initialStatus && ["ALL", "PENDING", "APPROVED", "PAID", "REJECTED"].includes(initialStatus))
            ? initialStatus
            : "ALL"
    );

    const isTeamView = viewMode === "team";

    const handleMonthChange = (direction: "prev" | "next") => {
        const newDate = new Date(currentMonth);
        newDate.setMonth(newDate.getMonth() + (direction === "next" ? 1 : -1));
        setCurrentMonth(newDate);
    };

    const [sortConfig, setSortConfig] = useState<{ key: keyof ReimburseRequest; direction: 'asc' | 'desc' } | null>(
        { key: 'created_at', direction: 'desc' }
    );

    const handleSort = (key: keyof ReimburseRequest) => {
        setSortConfig(prev => {
            if (prev?.key === key) {
                if (prev.direction === 'asc') return { key, direction: 'desc' };
                return null;
            }
            return { key, direction: 'asc' };
        });
    };

    const handleExport = async () => {
        if (filteredItems.length === 0) return;
        setIsExporting(true);
        setTimeout(() => setIsExporting(false), 2000); // Mock export
    };

    const filteredItems = useMemo(() => {
        let items = [...MOCK_REIMBURSE];

        if (!isTeamView) {
            items = items.filter(item => item.staff_id === userId || item.staff_id === "user1");
        }

        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            items = items.filter(item =>
                item.description.toLowerCase().includes(lower) ||
                item.staff_name.toLowerCase().includes(lower) ||
                item.project_name.toLowerCase().includes(lower) ||
                item.project_id.toLowerCase().includes(lower)
            );
        }

        if (statusFilter !== "ALL") {
            items = items.filter(item => item.status === statusFilter);
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
                breadcrumbItems={[{ label: "Flow" }, { label: "Finance" }, { label: "Reimburse" }]}
                header={<FinanceHeader title="Reimburse" subtitle="Loading..." />}
            >
                <div className="animate-pulse h-96 bg-neutral-100 rounded-xl" />
            </FinancePageWrapper>
        );
    }

    return (
        <FinancePageWrapper
            breadcrumbItems={[{ label: "Flow" }, { label: "Finance" }, { label: "Reimburse" }]}
            header={
                <FinanceHeader
                    title="Reimburse"
                    subtitle={isTeamView ? "Manage all staff reimburse requests." : "Track your personal reimbursement requests."}
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
                    <div className="h-10 flex items-center gap-2 px-3 bg-white/70 backdrop-blur-md rounded-full border border-white/40 shadow-sm group/search focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:bg-white/90 transition-all duration-300 w-full max-w-[280px]">
                        <Search className="w-4 h-4 text-neutral-400 group-focus-within/search:text-blue-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search reimburse..."
                            className="bg-transparent border-none outline-none text-sm font-medium text-neutral-600 placeholder:text-neutral-400 w-full h-full"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Animated Toggle - Height 40px */}
                    <div className="h-10 flex items-center p-1 bg-white/70 backdrop-blur-md rounded-full border border-white/40 shadow-sm w-fit relative">
                        {["ALL", "PENDING", "APPROVED", "PAID", "REJECTED"].map((status) => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status as ReimburseStatus | "ALL")}
                                className={clsx(
                                    "relative z-10 px-4 h-full rounded-full text-[10px] font-bold transition-colors duration-300 uppercase tracking-widest flex items-center justify-center",
                                    statusFilter === status
                                        ? clsx(
                                            status === "ALL" ? "text-red-700" :
                                                status === "PENDING" ? "text-orange-600" :
                                                    status === "APPROVED" ? "text-blue-600" :
                                                        status === "PAID" ? "text-green-600" :
                                                            status === "REJECTED" ? "text-rose-600" :
                                                                "text-neutral-900"
                                        )
                                        : "text-neutral-400 hover:text-neutral-600"
                                )}
                            >
                                {statusFilter === status && (
                                    <motion.div
                                        layoutId="reimburse-status-pill"
                                        className="absolute inset-0 bg-white rounded-full border border-white/50"
                                        style={{ zIndex: -1 }}
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                        animate={{
                                            boxShadow: status === "ALL" ? "0 4px 12px rgba(220, 38, 38, 0.15)" :
                                                status === "PENDING" ? "0 4px 12px rgba(234, 88, 12, 0.15)" :
                                                    status === "APPROVED" ? "0 4px 12px rgba(37, 99, 235, 0.15)" :
                                                        status === "PAID" ? "0 4px 12px rgba(22, 163, 74, 0.15)" :
                                                            status === "REJECTED" ? "0 4px 12px rgba(225, 29, 72, 0.15)" :
                                                                "0 4px 12px rgba(0, 0, 0, 0.05)"
                                        }}
                                    />
                                )}
                                {status === "ALL" ? "All" : status}
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
                    <button className="h-10 px-6 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-red-200 active:scale-95 transition-all flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        New Reimburse
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
                                    onClick={() => handleSort('created_at')}
                                >
                                    <div className="flex items-center gap-1 group/header">
                                        Date
                                        {sortConfig?.key === 'created_at' ? (
                                            sortConfig.direction === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-blue-500" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-500" />
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
                                            sortConfig.direction === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-blue-500" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-500" />
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
                                            sortConfig.direction === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-blue-500" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-500" />
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
                                            sortConfig.direction === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-blue-500" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-500" />
                                        ) : <ChevronDown className="w-3.5 h-3.5 opacity-0 group-hover/header:opacity-30 transition-opacity" />}
                                    </div>
                                </th>
                                <th className="px-6 py-4 text-center text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Status</th>
                                {isTeamView && (
                                    <th
                                        className="px-6 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest cursor-pointer hover:text-neutral-600 transition-colors"
                                        onClick={() => handleSort('staff_name')}
                                    >
                                        <div className="flex items-center gap-1 group/header">
                                            Staff
                                            {sortConfig?.key === 'staff_name' ? (
                                                sortConfig.direction === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-blue-500" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-500" />
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
                                            {format(new Date(item.created_at), "dd MMM yyyy")}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] font-bold text-neutral-400 bg-neutral-100/60 backdrop-blur-sm px-1 py-0.5 rounded border border-neutral-200/30 tracking-tight w-fit">
                                                {item.project_id}
                                            </span>
                                            <span className="text-[12px] font-medium text-neutral-900 truncate max-w-[150px]">{cleanEntityName(item.project_name)}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-[12px] font-semibold text-neutral-900 tracking-tight leading-tight">{item.description}</div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="text-[12px] font-bold text-neutral-900 tabular-nums tracking-tight">
                                            {formatCurrency(item.amount)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {(() => {
                                            const theme = STATUS_THEMES[item.status] || STATUS_THEMES.DRAFT;
                                            return (
                                                <span className={clsx(
                                                    "px-1.5 py-0.5 rounded-full text-[10px] font-bold w-fit uppercase tracking-widest shadow-sm backdrop-blur-md border border-white/10",
                                                    theme.bg, theme.text
                                                )}>
                                                    {item.status}
                                                </span>
                                            );
                                        })()}
                                    </td>
                                    {isTeamView && (
                                        <td className="px-6 py-4">
                                            <div className="text-[12px] font-medium text-neutral-900 tabular-nums">
                                                {cleanEntityName(item.staff_name)}
                                            </div>
                                        </td>
                                    )}
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                            {isTeamView ? (
                                                <>
                                                    {item.status === 'PENDING' && (
                                                        <>
                                                            <button className="p-1.5 text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-all" title="Approve">
                                                                <CheckCircle2 className="w-4 h-4" strokeWidth={1.5} />
                                                            </button>
                                                            <button className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-all" title="Reject">
                                                                <Ban className="w-4 h-4" strokeWidth={1.5} />
                                                            </button>
                                                        </>
                                                    )}
                                                    {item.status === 'APPROVED' && (
                                                        <button className="p-1.5 text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-all" title="Mark as Paid">
                                                            <CreditCard className="w-4 h-4" strokeWidth={1.5} />
                                                        </button>
                                                    )}
                                                </>
                                            ) : (
                                                <>
                                                    {item.status === 'PENDING' && (
                                                        <>
                                                            <button className="p-1.5 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all" title="Edit">
                                                                <Pencil className="w-4 h-4" strokeWidth={1.5} />
                                                            </button>
                                                            <button className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all" title="Cancel">
                                                                <XCircle className="w-4 h-4" strokeWidth={1.5} />
                                                            </button>
                                                        </>
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
        </FinancePageWrapper>
    );
}
