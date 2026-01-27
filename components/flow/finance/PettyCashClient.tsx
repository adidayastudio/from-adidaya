"use client";

import { useState, useEffect } from "react";
import FinanceHeader from "@/components/flow/finance/FinanceHeader";
import FinancePageWrapper from "@/components/flow/finance/FinancePageWrapper";
import { useFinance } from "./FinanceContext";
import {
    Wallet,
    Plus,
    RefreshCw,
    X,
    Building2,
    Calendar,
    ArrowUpRight,
    ArrowDownRight,
    MoreHorizontal,
    PieChart,
    ChevronRight,
    Search,
    Filter
} from "lucide-react";
import clsx from "clsx";
import { format } from "date-fns";

// --- TYPES ---
interface Transaction {
    id: string;
    date: string;
    description: string;
    amount: number;
    type: "IN" | "OUT";
    category: string;
    performedBy: string;
}

interface PettyCashPool {
    id: string;
    projectName: string;
    balance: number;
    limit: number;
    lastTopUp: string; // date string
    sourceAccount: string; // e.g., "Bank Mandiri 8321..."
    transactions: Transaction[];
}

// --- MOCK DATA ---
const MOCK_POOLS: PettyCashPool[] = [
    {
        id: "pc1",
        projectName: "RKR - Rumah Kemang Renovation",
        balance: 4500000,
        limit: 10000000,
        lastTopUp: "2026-01-10",
        sourceAccount: "Bank Mandiri •••• 8821",
        transactions: [
            { id: "t1", date: "2026-01-15T14:30:00", description: "Beli Semen 5 Sak", amount: 350000, type: "OUT", category: "Material", performedBy: "Budi Santoso" },
            { id: "t2", date: "2026-01-14T12:00:00", description: "Makan Siang Tukang (10 org)", amount: 250000, type: "OUT", category: "Meal", performedBy: "Budi Santoso" },
            { id: "t3", date: "2026-01-10T09:00:00", description: "Top Up Mingguan", amount: 5000000, type: "IN", category: "Top Up", performedBy: "Finance Admin" },
        ]
    },
    {
        id: "pc2",
        projectName: "VPR - Villa Puncak Resort",
        balance: 12800000,
        limit: 20000000,
        lastTopUp: "2026-01-12",
        sourceAccount: "BCA •••• 1234",
        transactions: [
            { id: "t4", date: "2026-01-16T10:00:00", description: "Sewa Scaffolding", amount: 1200000, type: "OUT", category: "Equipment", performedBy: "Dedi Kurnia" },
            { id: "t5", date: "2026-01-12T08:30:00", description: "Initial Top Up Phase 2", amount: 15000000, type: "IN", category: "Top Up", performedBy: "Finance Admin" },
        ]
    },
    {
        id: "pc3",
        projectName: "HOO - Head Office Ops",
        balance: 2150000,
        limit: 5000000,
        lastTopUp: "2026-01-05",
        sourceAccount: "Cash on Hand",
        transactions: [
            { id: "t6", date: "2026-01-17T09:15:00", description: "Beli Kertas A4 & Tinta", amount: 450000, type: "OUT", category: "Office Supplies", performedBy: "Siti Rahma" },
            { id: "t7", date: "2026-01-15T16:00:00", description: "Snack Meeting Client", amount: 150000, type: "OUT", category: "Meeting", performedBy: "Siti Rahma" },
        ]
    },
    {
        id: "pc4",
        projectName: "CLM - Cluster Melati",
        balance: 850000,
        limit: 5000000,
        lastTopUp: "2025-12-28",
        sourceAccount: "Bank BNI •••• 5678",
        transactions: []
    }
];

const formatCurrency = (amount: number) => {
    return "Rp" + amount.toLocaleString("id-ID");
};

export default function PettyCashClient() {
    const { viewMode, setViewMode, canAccessTeam, isLoading } = useFinance();
    const [drawerPoolId, setDrawerPoolId] = useState<string | null>(null);
    const [topUpPoolId, setTopUpPoolId] = useState<string | null>(null);

    const drawerPool = MOCK_POOLS.find(p => p.id === drawerPoolId);
    const topUpPool = MOCK_POOLS.find(p => p.id === topUpPoolId);

    // Team check placeholder
    useEffect(() => {
        if (!isLoading && canAccessTeam && viewMode !== "team") {
            setViewMode("team");
        }
    }, [isLoading, canAccessTeam, viewMode, setViewMode]);

    // FAB Action Listener
    useEffect(() => {
        const handleFabAction = (e: any) => {
            if (e.detail?.id === 'FINANCE_TOP_UP') {
                alert("Please select a pool to top up or implementation for global top-up needed.");
            }
        };
        window.addEventListener('fab-action', handleFabAction);
        return () => window.removeEventListener('fab-action', handleFabAction);
    }, []);

    const totalFloat = MOCK_POOLS.reduce((acc, curr) => acc + curr.balance, 0);

    return (
        <FinancePageWrapper
            breadcrumbItems={[{ label: "Flow" }, { label: "Finance" }, { label: "Petty Cash" }]}
            header={<FinanceHeader title="Petty Cash" subtitle="Manage cash pools for your projects." hideToggle />}
        >
            {/* OVERVIEW STATS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Total Float Card - Elegant & Soft */}
                <div className="relative rounded-2xl p-6 border border-neutral-100 shadow-sm flex flex-col justify-between h-40 overflow-hidden group bg-white">
                    {/* Subtle Gradient Blob */}
                    <div className="absolute -right-10 -top-10 w-40 h-40 bg-rose-50 rounded-full blur-3xl opacity-60 group-hover:bg-rose-100 transition-all duration-500" />

                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 bg-rose-50 rounded-lg">
                                <Wallet className="w-4 h-4 text-rose-500" />
                            </div>
                            <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Total Float</span>
                        </div>
                        <div className="text-4xl font-bold text-neutral-900 tracking-tight">
                            {formatCurrency(totalFloat)}
                        </div>
                    </div>
                    <div className="text-sm text-neutral-500 font-medium z-10 relative">
                        active across <span className="text-neutral-900 font-bold">{MOCK_POOLS.length}</span> projects
                    </div>
                </div>

                {/* Quick Actions / Info - Cleaner White Version */}
                <div className="bg-white rounded-2xl p-6 border border-neutral-100 shadow-sm flex flex-col justify-center items-start h-40 relative overflow-hidden group">
                    {/* Decorative background circle */}
                    <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-rose-50 rounded-full blur-2xl opacity-60 group-hover:bg-rose-100 transition-all duration-500" />

                    <div className="relative z-10 max-w-md w-full">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-bold text-neutral-900">Needs Top Up?</h3>
                            <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                        </div>
                        <p className="text-neutral-500 text-sm mb-4 leading-relaxed">
                            <span className="font-bold text-rose-600">{MOCK_POOLS.filter(p => p.balance < 1000000).length} pools</span> are running low (under 1jt).
                        </p>
                        <button className="w-full bg-rose-500 hover:bg-rose-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all transform active:scale-95 flex items-center justify-center gap-2 shadow-rose-200">
                            Check Low Balance <ArrowDownRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* POOLS GRID */}
            <h3 className="text-lg font-bold text-neutral-900 mb-4 flex items-center gap-2">
                Active Pools
                <span className="bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full text-xs font-bold">{MOCK_POOLS.length}</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                {MOCK_POOLS.map((pool) => {
                    const percentage = Math.min((pool.balance / pool.limit) * 100, 100);
                    const isLow = pool.balance < 1000000;

                    return (
                        <div
                            key={pool.id}
                            onClick={() => setDrawerPoolId(pool.id)}
                            className="bg-white rounded-2xl border border-neutral-200 p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col shadow-sm"
                        >
                            {/* Card Header */}
                            <div className="flex items-start justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white shadow-sm border border-neutral-100 flex items-center justify-center text-neutral-400 group-hover:bg-rose-50 group-hover:text-rose-500 group-hover:border-rose-100 transition-all duration-300">
                                        <Building2 className="w-5 h-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="font-bold text-neutral-900 truncate pr-2 max-w-[140px] leading-tight opacity-90 group-hover:opacity-100 transition-opacity">
                                            {pool.projectName}
                                        </h4>
                                        <p className="text-[10px] text-neutral-400 font-medium truncate mt-0.5 group-hover:text-rose-400 transition-colors">
                                            via {pool.sourceAccount}
                                        </p>
                                    </div>
                                </div>
                                <div className="p-1 rounded-full hover:bg-rose-50 text-neutral-300 group-hover:text-rose-400 transition-colors">
                                    <ChevronRight className="w-5 h-5" />
                                </div>
                            </div>

                            {/* Balance Info */}
                            <div className="mb-6">
                                <div className="text-2xl font-bold text-neutral-900 tracking-tight group-hover:scale-105 transition-transform origin-left text-shadow-sm">
                                    {formatCurrency(pool.balance)}
                                </div>
                                <div className="flex items-center gap-2 mt-2 text-xs font-medium text-neutral-500">
                                    <div className="flex-1 h-2 bg-neutral-100 rounded-full overflow-hidden border border-neutral-100">
                                        <div
                                            className={clsx("h-full rounded-full transition-all duration-500 shadow-sm", isLow ? "bg-red-500" : "bg-gradient-to-r from-emerald-400 to-emerald-500")}
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                    <span className="whitespace-nowrap">{percentage.toFixed(0)}% of Limit</span>
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="mt-auto pt-4 border-t border-dashed border-neutral-200 flex gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setTopUpPoolId(pool.id); }}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-500 text-white hover:bg-rose-600 text-xs font-bold transition-all shadow-sm active:scale-95 shadow-rose-200"
                                >
                                    <Plus className="w-4 h-4" /> Top Up
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); /* Adjust logic */ }}
                                    className="px-3 py-2.5 rounded-xl border border-neutral-200 hover:bg-white hover:border-rose-200 hover:text-rose-500 text-neutral-400 transition-all active:scale-95 shadow-sm bg-white/50"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>


            {/* DETAIL MODAL (TRANSACTIONS) */}
            {drawerPool && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex justify-end" onClick={() => setDrawerPoolId(null)}>
                    <div
                        className="w-full max-w-2xl bg-white h-full shadow-2xl p-0 animate-in slide-in-from-right duration-300 flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Drawer Header */}
                        <div className="px-8 py-6 border-b border-neutral-100 flex items-center justify-between bg-white z-10">
                            <div>
                                <h2 className="text-xl font-bold text-neutral-900">{drawerPool.projectName}</h2>
                                <div className="flex items-center gap-2 text-sm text-neutral-500 mt-1">
                                    <span className="font-mono">{drawerPool.sourceAccount}</span>
                                    <span>•</span>
                                    <span>Updated {format(new Date(drawerPool.lastTopUp), "d MMM")}</span>
                                </div>
                            </div>
                            <button
                                onClick={() => setDrawerPoolId(null)}
                                className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
                            >
                                <X className="w-6 h-6 text-neutral-400" />
                            </button>
                        </div>

                        {/* Drawer Content */}
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-neutral-50/30">

                            {/* Summary Box in Drawer */}
                            <div className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-sm mb-8 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1">Current Balance</p>
                                    <div className="text-3xl font-bold text-neutral-900 tracking-tight">{formatCurrency(drawerPool.balance)}</div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1">Monthly Limit</p>
                                    <div className="text-xl font-medium text-neutral-400 font-mono tracking-tight">{formatCurrency(drawerPool.limit)}</div>
                                </div>
                            </div>

                            {/* Transaction List */}
                            <div className="space-y-4">
                                <h3 className="font-bold text-neutral-900 flex items-center gap-2">
                                    Transaction History
                                    <span className="text-xs font-normal text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full">
                                        Last 30 Days
                                    </span>
                                </h3>

                                <div className="space-y-3">
                                    {drawerPool.transactions.length === 0 ? (
                                        <div className="text-center py-12 border-2 border-dashed border-neutral-200 rounded-2xl">
                                            <p className="text-neutral-400">No transactions found.</p>
                                        </div>
                                    ) : (
                                        drawerPool.transactions.map(tx => (
                                            <div key={tx.id} className="bg-white p-4 rounded-xl border border-neutral-100 shadow-sm flex items-center gap-4 hover:border-neutral-200 transition-colors">
                                                <div className={clsx(
                                                    "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                                                    tx.type === "IN" ? "bg-green-50 text-green-600" : "bg-orange-50 text-orange-600"
                                                )}>
                                                    {tx.type === "IN" ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start mb-0.5">
                                                        <span className="font-bold text-neutral-900 truncate pr-2">{tx.description}</span>
                                                        <span className={clsx(
                                                            "font-mono font-bold whitespace-nowrap",
                                                            tx.type === "IN" ? "text-green-600" : "text-neutral-900"
                                                        )}>
                                                            {tx.type === "IN" ? "+" : "-"}{formatCurrency(tx.amount)}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                                                        <span className="font-medium bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded">{tx.category}</span>
                                                        <span>•</span>
                                                        <span>{format(new Date(tx.date), "d MMM, HH:mm")}</span>
                                                        <span>•</span>
                                                        <span>{tx.performedBy}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Drawer Footer Actions */}
                        <div className="p-6 border-t border-neutral-100 bg-white grid grid-cols-2 gap-4">
                            <button className="py-3 px-4 rounded-xl border border-neutral-200 text-neutral-600 font-bold text-sm hover:bg-neutral-50 transition-colors">
                                Download Report
                            </button>
                            <button
                                onClick={() => { setDrawerPoolId(null); setTopUpPoolId(drawerPool.id); }}
                                className="py-3 px-4 rounded-xl bg-rose-500 text-white font-bold text-sm hover:bg-rose-600 transition-colors shadow-lg shadow-rose-200"
                            >
                                Top Up Balance
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* TOP UP MODAL */}
            {topUpPool && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4" onClick={() => setTopUpPoolId(null)}>
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="bg-white border-b border-neutral-100 p-6 text-center">
                            <h3 className="text-lg font-bold text-neutral-900">Top Up {topUpPool.projectName}</h3>
                            <p className="text-neutral-500 text-sm mt-1">Current Balance: <span className="font-bold text-neutral-900">{formatCurrency(topUpPool.balance)}</span></p>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest pl-1">Amount</label>
                                <input type="text" className="w-full text-3xl font-bold border-b-2 border-neutral-200 py-2 focus:border-rose-500 outline-none text-neutral-900 placeholder:text-neutral-300 font-mono" placeholder="Rp0" />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest pl-1">Source Account</label>
                                <select className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-700 font-medium outline-none focus:ring-2 focus:ring-rose-500/20">
                                    <option>Select Funding Source...</option>
                                    <option>Bank Mandiri •••• 8821</option>
                                    <option>BCA •••• 1234</option>
                                    <option>Office Main Cash</option>
                                </select>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button onClick={() => setTopUpPoolId(null)} className="flex-1 py-3 rounded-xl border border-neutral-200 font-bold text-neutral-600 hover:bg-neutral-50">Cancel</button>
                                <button className="flex-1 py-3 rounded-xl bg-rose-500 text-white font-bold shadow-lg shadow-rose-200 hover:bg-rose-600">Confirm</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </FinancePageWrapper>
    );
}
