"use client";

import { useState, useMemo } from "react";
import FinanceHeader from "@/components/flow/finance/FinanceHeader";
import FinancePageWrapper from "@/components/flow/finance/FinancePageWrapper";
import { useFinance } from "./FinanceContext";
import {
    Search,
    ChevronDown,
    Eye,
    CreditCard,
    X,
    Building2,
    Package,
    Wrench,
    Briefcase,
    Calendar,
    Plus
} from "lucide-react";
import clsx from "clsx";
import { format } from "date-fns";
import { PurchasingItem, FinancialStatus, FundingSource } from "@/lib/types/finance-types";

// --- MOCK DATA ---
const MOCK_PURCHASES: PurchasingItem[] = [
    { id: "p1", date: "2026-01-15", project_id: "proj1", project_name: "Rumah Kemang", vendor: "PT. Bangun Jaya", description: "Semen Tiga Roda 50 sak", type: "MATERIAL", amount: 12500000, financial_status: "UNPAID_RECEIVED", created_by: "user1", created_by_name: "Site Manager", created_at: "2026-01-14", updated_at: "2026-01-15" },
    { id: "p2", date: "2026-01-14", project_id: "proj1", project_name: "Rumah Kemang", vendor: "CV. Steel Indo", description: "Besi Beton 12mm (100 batang)", type: "MATERIAL", amount: 45000000, financial_status: "UNPAID_RECEIVED", created_by: "user1", created_by_name: "Site Manager", created_at: "2026-01-13", updated_at: "2026-01-14" },
    { id: "p3", date: "2026-01-13", project_id: "proj2", project_name: "Villa Puncak", vendor: "PT. Contractor Pro", description: "Jasa Cor Lantai 2", type: "SERVICE", amount: 85000000, financial_status: "UNPAID_INVOICED", created_by: "user2", created_by_name: "PM", created_at: "2026-01-12", updated_at: "2026-01-13" },
    { id: "p4", date: "2026-01-12", project_id: "proj1", project_name: "Rumah Kemang", vendor: "Toko Elektrik Jaya", description: "Material Listrik Paket", type: "MATERIAL", amount: 18500000, financial_status: "PAID", source_of_fund_name: "Bank Mandiri", payment_date: "2026-01-13", created_by: "user1", created_by_name: "Site Manager", created_at: "2026-01-11", updated_at: "2026-01-13" },
    { id: "p5", date: "2026-01-10", project_id: "proj2", project_name: "Villa Puncak", vendor: "CV. Alat Konstruksi", description: "Sewa Molen 3 hari", type: "TOOL", amount: 2400000, financial_status: "PAID", source_of_fund_name: "Petty Cash Puncak", payment_date: "2026-01-10", created_by: "user3", created_by_name: "Foreman", created_at: "2026-01-09", updated_at: "2026-01-10" },
];

const MOCK_FUNDING_SOURCES: FundingSource[] = [
    { id: "fs1", name: "Bank Mandiri", type: "BANK", currency: "IDR", is_active: true, created_at: "", updated_at: "" },
    { id: "fs2", name: "Bank BCA", type: "BANK", currency: "IDR", is_active: true, created_at: "", updated_at: "" },
    { id: "fs3", name: "Petty Cash Kemang", type: "PETTY_CASH", currency: "IDR", balance: 5000000, is_active: true, created_at: "", updated_at: "" },
    { id: "fs4", name: "Petty Cash Puncak", type: "PETTY_CASH", currency: "IDR", balance: 8000000, is_active: true, created_at: "", updated_at: "" },
];

function formatCurrency(amount: number) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount).replace(/\u00a0/g, " ");
}

const FINANCIAL_STATUS_STYLES: Record<FinancialStatus, { bg: string; text: string; label: string }> = {
    UNPAID_RECEIVED: { bg: "bg-orange-50", text: "text-orange-700", label: "Unpaid (Received)" },
    UNPAID_INVOICED: { bg: "bg-yellow-50", text: "text-yellow-700", label: "Unpaid (Invoiced)" },
    PAID: { bg: "bg-green-50", text: "text-green-700", label: "Paid" },
    CANCELLED: { bg: "bg-neutral-100", text: "text-neutral-500", label: "Cancelled" },
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
    MATERIAL: <Package className="w-4 h-4" />,
    TOOL: <Wrench className="w-4 h-4" />,
    SERVICE: <Briefcase className="w-4 h-4" />,
};

interface PayModalProps {
    item: PurchasingItem;
    onClose: () => void;
    onPay: (fundingSourceId: string, paymentDate: string, notes: string) => void;
}

function PayModal({ item, onClose, onPay }: PayModalProps) {
    const [selectedSource, setSelectedSource] = useState("");
    const [paymentDate, setPaymentDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [notes, setNotes] = useState("");

    return (
        <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="absolute inset-0 flex items-center justify-center p-4">
                <div
                    className="w-full max-w-md rounded-3xl overflow-hidden"
                    style={{
                        background: 'rgba(255, 255, 255, 0.95)',
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                    }}
                    onClick={e => e.stopPropagation()}
                >
                    <div className="p-6 border-b border-neutral-100">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-neutral-900">Process Payment</h3>
                            <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
                                <X className="w-5 h-5 text-neutral-500" />
                            </button>
                        </div>
                    </div>

                    <div className="p-6 space-y-4">
                        <div className="bg-neutral-50 rounded-xl p-4">
                            <div className="font-medium text-neutral-900">{item.description}</div>
                            <div className="text-sm text-neutral-500">{item.vendor} · {item.project_name}</div>
                            <div className="text-lg font-bold text-neutral-900 mt-2">{formatCurrency(item.amount)}</div>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block mb-2">
                                Source of Fund *
                            </label>
                            <div className="relative">
                                <select
                                    value={selectedSource}
                                    onChange={e => setSelectedSource(e.target.value)}
                                    className="w-full appearance-none border border-neutral-200 rounded-xl px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 bg-white"
                                >
                                    <option value="">Select funding source...</option>
                                    {MOCK_FUNDING_SOURCES.filter(s => s.is_active).map(source => (
                                        <option key={source.id} value={source.id}>
                                            {source.name} ({source.type})
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="w-4 h-4 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block mb-2">
                                Payment Date
                            </label>
                            <input
                                type="date"
                                value={paymentDate}
                                onChange={e => setPaymentDate(e.target.value)}
                                className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block mb-2">
                                Notes (Optional)
                            </label>
                            <textarea
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                placeholder="Add any notes..."
                                rows={2}
                                className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 resize-none"
                            />
                        </div>
                    </div>

                    <div className="p-6 border-t border-neutral-100 flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 border border-neutral-200 rounded-xl text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => onPay(selectedSource, paymentDate, notes)}
                            disabled={!selectedSource}
                            className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            <CreditCard className="w-4 h-4" />
                            Mark as Paid
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

import { useSearchParams } from "next/navigation";

// ... existing imports ...

export default function PurchasingClient() {
    const { viewMode, userId, isLoading } = useFinance();
    const searchParams = useSearchParams();
    const [searchTerm, setSearchTerm] = useState("");

    // Initialize filter from URL param "status" if present
    const initialStatus = searchParams.get("status") as FinancialStatus | "ALL" | null;
    const [statusFilter, setStatusFilter] = useState<FinancialStatus | "ALL">(
        (initialStatus && ["ALL", "UNPAID_RECEIVED", "UNPAID_INVOICED", "PAID", "CANCELLED"].includes(initialStatus))
            ? initialStatus
            : "ALL"
    );
    const [payingItem, setPayingItem] = useState<PurchasingItem | null>(null);

    const isTeamView = viewMode === "team";

    const filteredItems = useMemo(() => {
        let items = MOCK_PURCHASES;

        if (!isTeamView) {
            items = items.filter(item => item.created_by === userId || item.created_by === "user1");
        }

        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            items = items.filter(item =>
                item.description.toLowerCase().includes(lower) ||
                item.vendor.toLowerCase().includes(lower) ||
                item.project_name.toLowerCase().includes(lower)
            );
        }

        if (statusFilter !== "ALL") {
            items = items.filter(item => item.financial_status === statusFilter);
        }

        return items;
    }, [viewMode, userId, searchTerm, statusFilter, isTeamView]);

    const handlePay = (fundingSourceId: string, paymentDate: string, notes: string) => {
        console.log("Processing payment:", { fundingSourceId, paymentDate, notes, item: payingItem });
        setPayingItem(null);
    };

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
                    subtitle={isTeamView ? "Manage all purchase payments and invoices." : "View your submitted purchases."}
                />
            }
        >
            {/* TOOLBAR */}
            <div
                className="flex flex-col md:flex-row gap-4 justify-between items-center p-3 rounded-2xl backdrop-blur-xl"
                style={{
                    background: 'rgba(255, 255, 255, 0.7)',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.5)',
                }}
            >
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                        type="text"
                        placeholder="Search purchases..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm border border-transparent bg-neutral-100/80 rounded-xl focus:bg-white focus:border-neutral-300 focus:ring-2 focus:ring-neutral-100 outline-none transition-all placeholder:text-neutral-500"
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                    {["ALL", "UNPAID_RECEIVED", "UNPAID_INVOICED", "PAID"].map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status as FinancialStatus | "ALL")}
                            className={clsx(
                                "px-3 py-1.5 rounded-xl text-xs font-medium transition-colors whitespace-nowrap",
                                statusFilter === status
                                    ? "bg-neutral-900 text-white shadow-sm"
                                    : "bg-white/80 border border-neutral-200/50 text-neutral-600 hover:bg-white"
                            )}
                        >
                            {status === "ALL" ? "All" : FINANCIAL_STATUS_STYLES[status as FinancialStatus]?.label || status}
                        </button>
                    ))}
                </div>
            </div>

            {/* RESULTS COUNT */}
            <div className="text-xs font-medium text-neutral-500 px-1">
                Showing {filteredItems.length} item{filteredItems.length !== 1 && "s"}
            </div>

            {/* TABLE */}
            <div
                className="rounded-2xl overflow-hidden backdrop-blur-xl"
                style={{
                    background: 'rgba(255, 255, 255, 0.8)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.5)',
                }}
            >
                {filteredItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center mb-4">
                            <Package className="w-8 h-8 text-neutral-300" />
                        </div>
                        <h3 className="text-sm font-semibold text-neutral-900">No purchases found</h3>
                        <p className="text-xs text-neutral-500 mt-1">
                            {searchTerm || statusFilter !== "ALL"
                                ? "Try adjusting your filters."
                                : isTeamView ? "No purchase records yet." : "You haven't submitted any purchases."}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-neutral-50/50 border-b border-neutral-200/50">
                                <tr>
                                    <th className="px-6 py-3 font-semibold text-neutral-600">Date</th>
                                    <th className="px-6 py-3 font-semibold text-neutral-600">Project</th>
                                    <th className="px-6 py-3 font-semibold text-neutral-600">Vendor / Item</th>
                                    <th className="px-6 py-3 font-semibold text-neutral-600">Type</th>
                                    <th className="px-6 py-3 font-semibold text-neutral-600 text-right">Amount</th>
                                    <th className="px-6 py-3 font-semibold text-neutral-600 text-center">Status</th>
                                    <th className="px-6 py-3 font-semibold text-neutral-600">Source</th>
                                    {isTeamView && <th className="px-6 py-3 font-semibold text-neutral-600 text-center">Actions</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100/50">
                                {filteredItems.map((item) => {
                                    const statusStyle = FINANCIAL_STATUS_STYLES[item.financial_status];
                                    return (
                                        <tr key={item.id} className="hover:bg-white/50 transition-colors">
                                            <td className="px-6 py-4 text-sm text-neutral-600 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-4 h-4 text-neutral-400" />
                                                    {format(new Date(item.date), "dd MMM yyyy")}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="w-4 h-4 text-neutral-400" />
                                                    <span className="font-medium text-neutral-900">{item.project_name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-neutral-900">{item.description}</div>
                                                <div className="text-xs text-neutral-500">{item.vendor}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium bg-neutral-100/80 text-neutral-600">
                                                    {TYPE_ICONS[item.type]}
                                                    {item.type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right font-semibold text-neutral-900">
                                                {formatCurrency(item.amount)}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={clsx(
                                                    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                                                    statusStyle.bg, statusStyle.text
                                                )}>
                                                    {statusStyle.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-neutral-500">
                                                {item.source_of_fund_name || "-"}
                                            </td>
                                            {isTeamView && (
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        {item.financial_status !== "PAID" && item.financial_status !== "CANCELLED" && (
                                                            <button
                                                                onClick={() => setPayingItem(item)}
                                                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                                title="Process Payment"
                                                            >
                                                                <CreditCard className="w-4 h-4" />
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
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {payingItem && (
                <PayModal item={payingItem} onClose={() => setPayingItem(null)} onPay={handlePay} />
            )}
        </FinancePageWrapper>
    );
}
