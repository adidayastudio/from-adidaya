"use client";

import { useState, useMemo } from "react";
import FinanceHeader from "@/components/flow/finance/FinanceHeader";
import FinancePageWrapper from "@/components/flow/finance/FinancePageWrapper";
import { useFinance } from "./FinanceContext";
import {
    Search,
    Receipt,
    Eye,
    CreditCard,
    FileText,
    Building2,
    Calendar,
    User
} from "lucide-react";
import clsx from "clsx";
import { format } from "date-fns";
import { ReimburseRequest, ReimburseStatus } from "@/lib/types/finance-types";

import { useSearchParams } from "next/navigation";

// --- MOCK DATA ---
const MOCK_REIMBURSE: ReimburseRequest[] = [
    { id: "r1", staff_id: "user1", staff_name: "Ahmad Fauzi", project_id: "p1", project_name: "Rumah Kemang", description: "Transport ke site (Grab)", amount: 450000, status: "PENDING", created_at: "2026-01-15", updated_at: "2026-01-15" },
    { id: "r2", staff_id: "user2", staff_name: "Budi Santoso", project_id: "p1", project_name: "Rumah Kemang", description: "Makan tim lembur", amount: 850000, status: "PENDING", invoice_url: "/receipts/r2.pdf", created_at: "2026-01-14", updated_at: "2026-01-14" },
    { id: "r3", staff_id: "user3", staff_name: "Siti Aminah", project_id: "p2", project_name: "Villa Puncak", description: "Beli ATK untuk site office", amount: 325000, status: "APPROVED", created_at: "2026-01-12", updated_at: "2026-01-13" },
    { id: "r4", staff_id: "user1", staff_name: "Ahmad Fauzi", project_id: "p2", project_name: "Villa Puncak", description: "Parkir meeting client", amount: 75000, status: "PAID", payment_date: "2026-01-10", created_at: "2026-01-08", updated_at: "2026-01-10" },
    { id: "r5", staff_id: "user4", staff_name: "Dewi Lestari", project_id: "p1", project_name: "Rumah Kemang", description: "Pengiriman dokumen express", amount: 150000, status: "REJECTED", created_at: "2026-01-05", updated_at: "2026-01-06" },
];

const STATUS_STYLES: Record<ReimburseStatus, { bg: string; text: string; border: string }> = {
    PENDING: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
    APPROVED: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
    PAID: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
    REJECTED: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
};

function formatCurrency(amount: number) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount).replace(/\u00a0/g, " ");
}

export default function ReimburseClient() {
    const { viewMode, userId, isLoading } = useFinance();
    const searchParams = useSearchParams();
    const [searchTerm, setSearchTerm] = useState("");

    // Initialize filter from URL param "status" if present
    const initialStatus = searchParams.get("status") as ReimburseStatus | "ALL" | null;
    const [statusFilter, setStatusFilter] = useState<ReimburseStatus | "ALL">(
        (initialStatus && ["ALL", "PENDING", "APPROVED", "PAID", "REJECTED"].includes(initialStatus))
            ? initialStatus
            : "ALL"
    );

    const isTeamView = viewMode === "team";

    const filteredItems = useMemo(() => {
        let items = MOCK_REIMBURSE;

        // Personal view: only own items
        if (!isTeamView) {
            items = items.filter(item => item.staff_id === userId || item.staff_id === "user1"); // user1 for demo
        }

        // Search filter
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            items = items.filter(item =>
                item.description.toLowerCase().includes(lower) ||
                item.staff_name.toLowerCase().includes(lower) ||
                item.project_name.toLowerCase().includes(lower)
            );
        }

        // Status filter
        if (statusFilter !== "ALL") {
            items = items.filter(item => item.status === statusFilter);
        }

        return items;
    }, [viewMode, userId, searchTerm, statusFilter, isTeamView]);

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
                    subtitle={isTeamView ? "Manage all staff reimburse requests." : "View your reimburse submissions."}
                />
            }
        >
            {/* TOOLBAR */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-2 rounded-xl border border-neutral-200 shadow-sm">
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                        type="text"
                        placeholder="Search reimburse..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm border border-transparent bg-neutral-100 rounded-lg focus:bg-white focus:border-neutral-300 focus:ring-2 focus:ring-neutral-100 outline-none transition-all placeholder:text-neutral-500"
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                    {["ALL", "PENDING", "APPROVED", "PAID", "REJECTED"].map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status as ReimburseStatus | "ALL")}
                            className={clsx(
                                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap",
                                statusFilter === status
                                    ? "bg-neutral-900 text-white shadow-sm"
                                    : "bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                            )}
                        >
                            {status === "ALL" ? "All" : status}
                        </button>
                    ))}
                </div>
            </div>

            {/* RESULTS COUNT */}
            <div className="text-xs font-medium text-neutral-500 px-1">
                Showing {filteredItems.length} request{filteredItems.length !== 1 && "s"}
            </div>

            {/* TABLE */}
            <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
                {filteredItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center mb-4">
                            <Receipt className="w-8 h-8 text-neutral-300" />
                        </div>
                        <h3 className="text-sm font-semibold text-neutral-900">No reimburse requests found</h3>
                        <p className="text-xs text-neutral-500 mt-1">
                            {searchTerm || statusFilter !== "ALL"
                                ? "Try adjusting your filters."
                                : isTeamView ? "No reimburse records yet." : "You haven't submitted any reimburse requests."}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-neutral-50/50 border-b border-neutral-200">
                                <tr>
                                    {isTeamView && <th className="px-6 py-3 font-semibold text-neutral-600">Staff</th>}
                                    <th className="px-6 py-3 font-semibold text-neutral-600">Project</th>
                                    <th className="px-6 py-3 font-semibold text-neutral-600">Description</th>
                                    <th className="px-6 py-3 font-semibold text-neutral-600 text-right">Amount</th>
                                    <th className="px-6 py-3 font-semibold text-neutral-600 text-center">Status</th>
                                    <th className="px-6 py-3 font-semibold text-neutral-600">Date</th>
                                    <th className="px-6 py-3 font-semibold text-neutral-600 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100">
                                {filteredItems.map((item) => {
                                    const statusStyle = STATUS_STYLES[item.status];
                                    return (
                                        <tr key={item.id} className="hover:bg-neutral-50/80 transition-colors">
                                            {isTeamView && (
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700">
                                                            {item.staff_name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                                                        </div>
                                                        <span className="font-medium text-neutral-900">{item.staff_name}</span>
                                                    </div>
                                                </td>
                                            )}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="w-4 h-4 text-neutral-400" />
                                                    <span className="text-neutral-600">{item.project_name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-neutral-900">{item.description}</div>
                                            </td>
                                            <td className="px-6 py-4 text-right font-semibold text-neutral-900">
                                                {formatCurrency(item.amount)}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={clsx(
                                                    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
                                                    statusStyle.bg, statusStyle.text, statusStyle.border
                                                )}>
                                                    {item.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-neutral-600 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-4 h-4 text-neutral-400" />
                                                    {format(new Date(item.created_at), "dd MMM yyyy")}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    {isTeamView && (item.status === "PENDING" || item.status === "APPROVED") && (
                                                        <button
                                                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                            title="Process Payment"
                                                        >
                                                            <CreditCard className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {item.invoice_url && (
                                                        <button
                                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                            title="View Invoice"
                                                        >
                                                            <FileText className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    <button
                                                        className="p-2 text-neutral-500 hover:bg-neutral-100 rounded-lg transition-colors"
                                                        title="View Details"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </FinancePageWrapper>
    );
}
