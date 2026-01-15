"use client";

import { useState } from "react";
import FinanceHeader from "@/components/flow/finance/FinanceHeader";
import FinancePageWrapper from "@/components/flow/finance/FinancePageWrapper";
import { useFinance } from "./FinanceContext";
import {
    Wallet,
    Plus,
    Minus,
    ArrowUpRight,
    ArrowDownRight,
    Building2,
    Calendar,
    RefreshCw,
    X
} from "lucide-react";
import clsx from "clsx";
import { format } from "date-fns";
import { PettyCashPool, PettyCashTransaction } from "@/lib/types/finance-types";

// --- MOCK DATA ---
const MOCK_POOLS: PettyCashPool[] = [
    { id: "pc1", project_id: "p1", project_name: "Rumah Kemang", balance: 5000000, last_updated: "2026-01-15" },
    { id: "pc2", project_id: "p2", project_name: "Villa Puncak", balance: 8000000, last_updated: "2026-01-12" },
    { id: "pc3", project_id: "p3", project_name: "Kantor ABC", balance: 2500000, last_updated: "2026-01-10" },
];

const MOCK_TRANSACTIONS: PettyCashTransaction[] = [
    { id: "t1", pool_id: "pc1", type: "TOP_UP", amount: 5000000, description: "Top up awal bulan", performed_by: "admin", performed_by_name: "Finance Admin", created_at: "2026-01-02T10:00:00" },
    { id: "t2", pool_id: "pc1", type: "WITHDRAWAL", amount: 450000, description: "Beli ATK site", performed_by: "user1", performed_by_name: "Site Manager", created_at: "2026-01-05T14:30:00" },
    { id: "t3", pool_id: "pc1", type: "WITHDRAWAL", amount: 350000, description: "Makan siang tim", performed_by: "user1", performed_by_name: "Site Manager", created_at: "2026-01-08T12:15:00" },
    { id: "t4", pool_id: "pc2", type: "TOP_UP", amount: 10000000, description: "Top up project baru", performed_by: "admin", performed_by_name: "Finance Admin", created_at: "2026-01-03T09:00:00" },
    { id: "t5", pool_id: "pc2", type: "WITHDRAWAL", amount: 2000000, description: "Sewa alat harian", performed_by: "user2", performed_by_name: "Foreman", created_at: "2026-01-10T16:45:00" },
];

function formatCurrency(amount: number) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount).replace(/\u00a0/g, " ");
}

function formatShort(amount: number) {
    if (amount >= 1000000000) return `${(amount / 1000000000).toFixed(1)}B`;
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(0)}K`;
    return formatCurrency(amount);
}

export default function PettyCashClient() {
    const { viewMode, canAccessTeam, isLoading } = useFinance();
    const [selectedPool, setSelectedPool] = useState<string | null>(null);
    const [showTopUpModal, setShowTopUpModal] = useState(false);

    const poolTransactions = selectedPool
        ? MOCK_TRANSACTIONS.filter(t => t.pool_id === selectedPool)
        : [];

    const selectedPoolData = MOCK_POOLS.find(p => p.id === selectedPool);

    // Team-only page
    if (!canAccessTeam || viewMode === "personal") {
        return (
            <FinancePageWrapper
                breadcrumbItems={[{ label: "Flow" }, { label: "Finance" }, { label: "Petty Cash" }]}
                header={<FinanceHeader title="Petty Cash" subtitle="Manage petty cash pools." />}
            >
                <div className="text-center py-20 bg-white rounded-xl border border-dashed border-neutral-200">
                    <Wallet className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                    <p className="text-neutral-500">Petty Cash is available in Team View only.</p>
                    <p className="text-xs text-neutral-400 mt-2">Please switch to Team View if you have access.</p>
                </div>
            </FinancePageWrapper>
        );
    }

    if (isLoading) {
        return (
            <FinancePageWrapper
                breadcrumbItems={[{ label: "Flow" }, { label: "Finance" }, { label: "Petty Cash" }]}
                header={<FinanceHeader title="Petty Cash" subtitle="Loading..." />}
            >
                <div className="animate-pulse h-96 bg-neutral-100 rounded-xl" />
            </FinancePageWrapper>
        );
    }

    const totalBalance = MOCK_POOLS.reduce((sum, p) => sum + p.balance, 0);

    return (
        <FinancePageWrapper
            breadcrumbItems={[{ label: "Flow" }, { label: "Finance" }, { label: "Petty Cash" }]}
            header={<FinanceHeader title="Petty Cash" subtitle="Manage petty cash pools per project." />}
        >
            {/* SUMMARY */}
            <div className="bg-gradient-to-r from-purple-50 to-purple-100/50 rounded-xl p-6 border border-purple-200">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-sm font-medium text-purple-600 mb-1">Total Petty Cash Balance</div>
                        <div className="text-3xl font-bold text-purple-900">{formatCurrency(totalBalance)}</div>
                        <div className="text-xs text-purple-500 mt-1">{MOCK_POOLS.length} active pools</div>
                    </div>
                    <div className="w-16 h-16 bg-purple-200/50 rounded-2xl flex items-center justify-center">
                        <Wallet className="w-8 h-8 text-purple-600" />
                    </div>
                </div>
            </div>

            {/* POOLS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {MOCK_POOLS.map((pool) => (
                    <div
                        key={pool.id}
                        onClick={() => setSelectedPool(pool.id === selectedPool ? null : pool.id)}
                        className={clsx(
                            "bg-white rounded-xl border p-5 cursor-pointer transition-all",
                            selectedPool === pool.id
                                ? "border-purple-300 ring-2 ring-purple-100"
                                : "border-neutral-200 hover:border-purple-200"
                        )}
                    >
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-neutral-400" />
                                <span className="font-medium text-neutral-900">{pool.project_name}</span>
                            </div>
                        </div>
                        <div className="text-2xl font-bold text-neutral-900 mb-2">{formatShort(pool.balance)}</div>
                        <div className="text-xs text-neutral-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Updated {format(new Date(pool.last_updated), "dd MMM yyyy")}
                        </div>

                        <div className="mt-4 pt-4 border-t border-neutral-100 flex gap-2">
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowTopUpModal(true); setSelectedPool(pool.id); }}
                                className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-medium hover:bg-green-100 transition-colors"
                            >
                                <Plus className="w-3 h-3" /> Top Up
                            </button>
                            <button
                                onClick={(e) => e.stopPropagation()}
                                className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 border border-neutral-200 rounded-lg text-xs font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
                            >
                                <RefreshCw className="w-3 h-3" /> Adjust
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* TRANSACTION LEDGER */}
            {selectedPool && (
                <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
                    <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold text-neutral-900">Transaction Ledger</h3>
                            <p className="text-xs text-neutral-500">{selectedPoolData?.project_name}</p>
                        </div>
                        <button
                            onClick={() => setSelectedPool(null)}
                            className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
                        >
                            <X className="w-4 h-4 text-neutral-500" />
                        </button>
                    </div>

                    {poolTransactions.length === 0 ? (
                        <div className="py-12 text-center text-neutral-500 text-sm">
                            No transactions yet for this pool.
                        </div>
                    ) : (
                        <div className="divide-y divide-neutral-100">
                            {poolTransactions.map((tx) => (
                                <div key={tx.id} className="px-6 py-4 flex items-center gap-4">
                                    <div className={clsx(
                                        "w-10 h-10 rounded-full flex items-center justify-center",
                                        tx.type === "TOP_UP" ? "bg-green-50 text-green-600" :
                                            tx.type === "WITHDRAWAL" ? "bg-red-50 text-red-600" :
                                                "bg-blue-50 text-blue-600"
                                    )}>
                                        {tx.type === "TOP_UP" ? <ArrowUpRight className="w-5 h-5" /> :
                                            tx.type === "WITHDRAWAL" ? <ArrowDownRight className="w-5 h-5" /> :
                                                <RefreshCw className="w-5 h-5" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-neutral-900">{tx.description}</div>
                                        <div className="text-xs text-neutral-500">
                                            {tx.performed_by_name} · {format(new Date(tx.created_at), "dd MMM yyyy, HH:mm")}
                                        </div>
                                    </div>
                                    <div className={clsx(
                                        "font-semibold text-sm",
                                        tx.type === "TOP_UP" ? "text-green-600" : "text-red-600"
                                    )}>
                                        {tx.type === "TOP_UP" ? "+" : "-"}{formatCurrency(tx.amount)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* TOP UP MODAL (Simple placeholder) */}
            {showTopUpModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowTopUpModal(false)}>
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-xl p-6" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">Top Up Petty Cash</h3>
                            <button onClick={() => setShowTopUpModal(false)} className="p-2 hover:bg-neutral-100 rounded-full">
                                <X className="w-5 h-5 text-neutral-500" />
                            </button>
                        </div>
                        <p className="text-sm text-neutral-500 mb-4">Top up form fields will go here...</p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowTopUpModal(false)} className="flex-1 px-4 py-2 border border-neutral-200 rounded-lg text-sm font-medium">Cancel</button>
                            <button className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium">Top Up</button>
                        </div>
                    </div>
                </div>
            )}
        </FinancePageWrapper>
    );
}
