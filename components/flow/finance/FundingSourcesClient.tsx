"use client";

import { useState } from "react";
import FinanceHeader from "@/components/flow/finance/FinanceHeader";
import FinancePageWrapper from "@/components/flow/finance/FinancePageWrapper";
import { useFinance } from "./FinanceContext";
import {
    Plus,
    Landmark,
    CreditCard,
    Wallet,
    Coins,
    ToggleLeft,
    ToggleRight,
    Edit3,
    Archive,
    X
} from "lucide-react";
import clsx from "clsx";
import { FundingSource, FundingSourceType } from "@/lib/types/finance-types";

// --- MOCK DATA ---
const MOCK_SOURCES: FundingSource[] = [
    { id: "fs1", name: "Bank Mandiri (Operasional)", type: "BANK", currency: "IDR", is_active: true, created_at: "2025-01-01", updated_at: "2026-01-15" },
    { id: "fs2", name: "Bank BCA (Proyek)", type: "BANK", currency: "IDR", is_active: true, created_at: "2025-01-01", updated_at: "2026-01-10" },
    { id: "fs3", name: "Petty Cash Kemang", type: "PETTY_CASH", currency: "IDR", balance: 5000000, is_active: true, created_at: "2025-06-01", updated_at: "2026-01-14" },
    { id: "fs4", name: "Petty Cash Puncak", type: "PETTY_CASH", currency: "IDR", balance: 8000000, is_active: true, created_at: "2025-06-01", updated_at: "2026-01-12" },
    { id: "fs5", name: "Reimburse Pool", type: "REIMBURSE", currency: "IDR", is_active: true, created_at: "2025-01-01", updated_at: "2026-01-05" },
    { id: "fs6", name: "Cash on Hand", type: "CASH", currency: "IDR", balance: 2000000, is_active: false, created_at: "2025-01-01", updated_at: "2025-12-01" },
];

const TYPE_ICONS: Record<FundingSourceType, React.ReactNode> = {
    BANK: <Landmark className="w-4 h-4" />,
    CASH: <Coins className="w-4 h-4" />,
    PETTY_CASH: <Wallet className="w-4 h-4" />,
    REIMBURSE: <CreditCard className="w-4 h-4" />,
};

const TYPE_COLORS: Record<FundingSourceType, { bg: string; text: string }> = {
    BANK: { bg: "bg-blue-50", text: "text-blue-700" },
    CASH: { bg: "bg-green-50", text: "text-green-700" },
    PETTY_CASH: { bg: "bg-purple-50", text: "text-purple-700" },
    REIMBURSE: { bg: "bg-orange-50", text: "text-orange-700" },
};

function formatCurrency(amount: number) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount).replace(/\u00a0/g, " ");
}

export default function FundingSourcesClient() {
    const { viewMode, canAccessTeam, isLoading } = useFinance();
    const [sources, setSources] = useState(MOCK_SOURCES);
    const [showAddModal, setShowAddModal] = useState(false);

    // Team-only page - show message for personal view
    if (!canAccessTeam || viewMode === "personal") {
        return (
            <FinancePageWrapper
                breadcrumbItems={[{ label: "Flow" }, { label: "Finance" }, { label: "Funding Sources" }]}
                header={<FinanceHeader title="Funding Sources" subtitle="Manage payment sources." />}
            >
                <div className="text-center py-20 bg-white rounded-xl border border-dashed border-neutral-200">
                    <Landmark className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                    <p className="text-neutral-500">Funding Sources are available in Team View only.</p>
                    <p className="text-xs text-neutral-400 mt-2">Please switch to Team View if you have access.</p>
                </div>
            </FinancePageWrapper>
        );
    }

    if (isLoading) {
        return (
            <FinancePageWrapper
                breadcrumbItems={[{ label: "Flow" }, { label: "Finance" }, { label: "Funding Sources" }]}
                header={<FinanceHeader title="Funding Sources" subtitle="Loading..." />}
            >
                <div className="animate-pulse h-96 bg-neutral-100 rounded-xl" />
            </FinancePageWrapper>
        );
    }

    const handleToggle = (id: string) => {
        setSources(prev => prev.map(s =>
            s.id === id ? { ...s, is_active: !s.is_active } : s
        ));
    };

    return (
        <FinancePageWrapper
            breadcrumbItems={[{ label: "Flow" }, { label: "Finance" }, { label: "Funding Sources" }]}
            header={<FinanceHeader title="Funding Sources" subtitle="Manage payment sources for all projects." />}
        >
            {/* HEADER ACTION */}
            <div className="flex justify-end">
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Add Source
                </button>
            </div>

            {/* SOURCES GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sources.map((source) => {
                    const typeColor = TYPE_COLORS[source.type];
                    return (
                        <div
                            key={source.id}
                            className={clsx(
                                "bg-white rounded-xl border p-5 transition-all",
                                source.is_active
                                    ? "border-neutral-200 hover:border-red-200"
                                    : "border-neutral-100 bg-neutral-50/50 opacity-60"
                            )}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center", typeColor.bg, typeColor.text)}>
                                    {TYPE_ICONS[source.type]}
                                </div>
                                <button
                                    onClick={() => handleToggle(source.id)}
                                    className="text-neutral-400 hover:text-neutral-600 transition-colors"
                                    title={source.is_active ? "Deactivate" : "Activate"}
                                >
                                    {source.is_active
                                        ? <ToggleRight className="w-6 h-6 text-green-500" />
                                        : <ToggleLeft className="w-6 h-6" />
                                    }
                                </button>
                            </div>

                            <h3 className="font-semibold text-neutral-900 mb-1">{source.name}</h3>
                            <span className={clsx(
                                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                                typeColor.bg, typeColor.text
                            )}>
                                {source.type.replace("_", " ")}
                            </span>

                            {source.balance !== undefined && (
                                <div className="mt-4 pt-4 border-t border-neutral-100">
                                    <div className="text-xs text-neutral-500">Balance</div>
                                    <div className="text-lg font-bold text-neutral-900">{formatCurrency(source.balance)}</div>
                                </div>
                            )}

                            <div className="mt-4 flex gap-2">
                                <button className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 border border-neutral-200 rounded-lg text-xs font-medium text-neutral-600 hover:bg-neutral-50 transition-colors">
                                    <Edit3 className="w-3 h-3" /> Edit
                                </button>
                                <button className="flex items-center justify-center gap-1 px-3 py-1.5 border border-neutral-200 rounded-lg text-xs font-medium text-neutral-400 hover:text-red-600 hover:border-red-200 transition-colors">
                                    <Archive className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ADD MODAL (Simple placeholder) */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAddModal(false)}>
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-xl p-6" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">Add Funding Source</h3>
                            <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-neutral-100 rounded-full">
                                <X className="w-5 h-5 text-neutral-500" />
                            </button>
                        </div>
                        <p className="text-sm text-neutral-500 mb-4">Form fields will go here...</p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2 border border-neutral-200 rounded-lg text-sm font-medium">Cancel</button>
                            <button className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium">Add Source</button>
                        </div>
                    </div>
                </div>
            )}
        </FinancePageWrapper>
    );
}
