"use client";

import { useState } from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import FinanceSidebar from "@/components/flow/finance/FinanceSidebar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { User, Users, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from "lucide-react";
import clsx from "clsx";

// Mock Data
const MOCK_TEAM_CASH_FLOW = [
    { date: "2025-01-06", type: "inflow", description: "Payment from Client A", project: "Rumah Pak Budi", amount: 75000000 },
    { date: "2025-01-05", type: "outflow", description: "Material Purchase", project: "Villa Puncak", amount: 25000000 },
    { date: "2025-01-04", type: "inflow", description: "Down Payment", project: "Renovasi Kantor", amount: 50000000 },
    { date: "2025-01-03", type: "outflow", description: "Contractor Payment", project: "Rumah Pak Budi", amount: 35000000 },
    { date: "2025-01-02", type: "inflow", description: "Final Payment", project: "Project XYZ", amount: 120000000 },
    { date: "2025-01-01", type: "outflow", description: "Equipment Rental", project: "Villa Puncak", amount: 15000000 },
];

const MOCK_PERSONAL_CASH_FLOW = [
    { date: "2025-01-06", type: "outflow", description: "Site Transport", project: "Rumah Pak Budi", amount: 150000 },
    { date: "2025-01-05", type: "outflow", description: "Team Lunch", project: "Villa Puncak", amount: 350000 },
    { date: "2025-01-04", type: "outflow", description: "Material Purchase", project: "Rumah Pak Budi", amount: 2500000 },
];

function formatCurrency(amount: number) {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

export default function CashFlowPage() {
    const [viewMode, setViewMode] = useState<"personal" | "team">("team");

    const data = viewMode === "team" ? MOCK_TEAM_CASH_FLOW : MOCK_PERSONAL_CASH_FLOW;
    const totalInflow = data.filter(d => d.type === "inflow").reduce((acc, d) => acc + d.amount, 0);
    const totalOutflow = data.filter(d => d.type === "outflow").reduce((acc, d) => acc + d.amount, 0);

    return (
        <div className="min-h-screen bg-neutral-50 p-6">
            <Breadcrumb items={[{ label: "Flow" }, { label: "Finance" }, { label: "Cash Flow" }]} />

            <PageWrapper sidebar={<FinanceSidebar />}>
                <div className="space-y-8 w-full animate-in fade-in duration-500">
                    {/* HEADER */}
                    <div className="space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h1 className="text-2xl font-bold text-neutral-900">Cash Flow</h1>
                                <p className="text-sm text-neutral-500 mt-1">Track money coming in and going out.</p>
                            </div>

                            <div className="flex items-center bg-neutral-100 rounded-full p-1 self-start md:self-auto">
                                <button onClick={() => setViewMode("personal")} className={clsx("flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all", viewMode === "personal" ? "bg-white shadow text-neutral-900" : "text-neutral-500 hover:text-neutral-700")}>
                                    <User className="w-4 h-4" /> Personal
                                </button>
                                <button onClick={() => setViewMode("team")} className={clsx("flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all", viewMode === "team" ? "bg-white shadow text-neutral-900" : "text-neutral-500 hover:text-neutral-700")}>
                                    <Users className="w-4 h-4" /> Team
                                </button>
                            </div>
                        </div>
                        <div className="border-b border-neutral-200" />
                    </div>

                    {/* SUMMARY */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white rounded-xl border border-neutral-200 p-5">
                            <div className="flex items-center gap-2 text-green-600 mb-2">
                                <TrendingUp className="w-5 h-5" />
                                <span className="text-sm font-medium">Total Inflow</span>
                            </div>
                            <div className="text-2xl font-bold text-neutral-900">{formatCurrency(totalInflow)}</div>
                        </div>
                        <div className="bg-white rounded-xl border border-neutral-200 p-5">
                            <div className="flex items-center gap-2 text-red-600 mb-2">
                                <TrendingDown className="w-5 h-5" />
                                <span className="text-sm font-medium">Total Outflow</span>
                            </div>
                            <div className="text-2xl font-bold text-neutral-900">{formatCurrency(totalOutflow)}</div>
                        </div>
                        <div className="bg-white rounded-xl border border-neutral-200 p-5">
                            <div className="flex items-center gap-2 text-blue-600 mb-2">
                                <span className="text-sm font-medium">Net Cash Flow</span>
                            </div>
                            <div className={clsx("text-2xl font-bold", totalInflow - totalOutflow >= 0 ? "text-green-600" : "text-red-600")}>
                                {formatCurrency(totalInflow - totalOutflow)}
                            </div>
                        </div>
                    </div>

                    {/* TRANSACTIONS */}
                    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-neutral-100">
                            <h3 className="font-semibold text-neutral-900">Recent Transactions</h3>
                        </div>
                        <div className="divide-y divide-neutral-100">
                            {data.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between px-6 py-4 hover:bg-neutral-50/50">
                                    <div className="flex items-center gap-4">
                                        <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center", item.type === "inflow" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600")}>
                                            {item.type === "inflow" ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <div className="font-medium text-neutral-900">{item.description}</div>
                                            <div className="text-sm text-neutral-500">{item.project} · {item.date}</div>
                                        </div>
                                    </div>
                                    <div className={clsx("font-semibold", item.type === "inflow" ? "text-green-600" : "text-red-600")}>
                                        {item.type === "inflow" ? "+" : "-"}{formatCurrency(item.amount)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </PageWrapper>
        </div>
    );
}
