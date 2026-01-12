"use client";

import PageWrapper from "@/components/layout/PageWrapper";
import FinanceSidebar from "@/components/flow/finance/FinanceSidebar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { BarChart3, PieChart, TrendingUp, Download, Calendar } from "lucide-react";
import clsx from "clsx";

// Mock Chart Data
const MOCK_MONTHLY_DATA = [
    { month: "Oct", revenue: 180, expenses: 120 },
    { month: "Nov", revenue: 220, expenses: 150 },
    { month: "Dec", revenue: 280, expenses: 180 },
    { month: "Jan", revenue: 250, expenses: 170 },
];

const MOCK_BY_PROJECT = [
    { project: "Rumah Pak Budi", revenue: 180000000, expenses: 95000000 },
    { project: "Renovasi Kantor", revenue: 150000000, expenses: 85000000 },
    { project: "Villa Puncak", revenue: 120000000, expenses: 78000000 },
];

function formatShort(amount: number) {
    if (amount >= 1000000000) return `${(amount / 1000000000).toFixed(1)}B`;
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(0)}M`;
    return `${amount}`;
}

export default function ReportsPage() {
    return (
        <div className="min-h-screen bg-neutral-50 p-6">
            <Breadcrumb items={[{ label: "Flow" }, { label: "Finance" }, { label: "Reports" }]} />

            <PageWrapper sidebar={<FinanceSidebar />}>
                <div className="space-y-8 w-full animate-in fade-in duration-500">
                    {/* HEADER */}
                    <div className="space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h1 className="text-2xl font-bold text-neutral-900">Reports</h1>
                                <p className="text-sm text-neutral-500 mt-1">Financial summaries and analytics.</p>
                            </div>
                            <div className="flex gap-2">
                                <button className="flex items-center gap-2 px-4 py-2 bg-white border border-neutral-200 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-50">
                                    <Calendar className="w-4 h-4" /> This Month
                                </button>
                                <button className="flex items-center gap-2 px-4 py-2 bg-white border border-neutral-200 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-50">
                                    <Download className="w-4 h-4" /> Export
                                </button>
                            </div>
                        </div>
                        <div className="border-b border-neutral-200" />
                    </div>

                    {/* REPORT CARDS */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Monthly Trend */}
                        <div className="bg-white rounded-xl border border-neutral-200 p-6">
                            <div className="flex items-center gap-2 mb-6">
                                <TrendingUp className="w-5 h-5 text-neutral-400" />
                                <h3 className="font-semibold text-neutral-900">Monthly Trend</h3>
                            </div>
                            <div className="flex items-end justify-between h-48 gap-4">
                                {MOCK_MONTHLY_DATA.map((m) => (
                                    <div key={m.month} className="flex-1 flex flex-col items-center gap-2">
                                        <div className="flex gap-1 items-end h-40 w-full justify-center">
                                            <div className="w-6 bg-green-500 rounded-t" style={{ height: `${(m.revenue / 3)}%` }} title={`Revenue: ${m.revenue}M`} />
                                            <div className="w-6 bg-red-400 rounded-t" style={{ height: `${(m.expenses / 3)}%` }} title={`Expenses: ${m.expenses}M`} />
                                        </div>
                                        <span className="text-xs text-neutral-500">{m.month}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-4 mt-4 justify-center">
                                <div className="flex items-center gap-2 text-sm"><div className="w-3 h-3 bg-green-500 rounded" /> Revenue</div>
                                <div className="flex items-center gap-2 text-sm"><div className="w-3 h-3 bg-red-400 rounded" /> Expenses</div>
                            </div>
                        </div>

                        {/* By Project */}
                        <div className="bg-white rounded-xl border border-neutral-200 p-6">
                            <div className="flex items-center gap-2 mb-6">
                                <BarChart3 className="w-5 h-5 text-neutral-400" />
                                <h3 className="font-semibold text-neutral-900">By Project</h3>
                            </div>
                            <div className="space-y-4">
                                {MOCK_BY_PROJECT.map((p) => (
                                    <div key={p.project}>
                                        <div className="flex justify-between mb-1">
                                            <span className="text-sm font-medium text-neutral-900">{p.project}</span>
                                            <span className="text-sm text-neutral-500">{formatShort(p.revenue - p.expenses)} profit</span>
                                        </div>
                                        <div className="flex gap-1 h-4">
                                            <div className="bg-green-500 rounded" style={{ width: `${(p.revenue / 200000000) * 100}%` }} />
                                            <div className="bg-red-400 rounded" style={{ width: `${(p.expenses / 200000000) * 100}%` }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Summary Table */}
                    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-neutral-100">
                            <h3 className="font-semibold text-neutral-900">Monthly Summary</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-neutral-50 border-b border-neutral-200">
                                    <tr>
                                        <th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Month</th>
                                        <th className="text-right px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Revenue</th>
                                        <th className="text-right px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Expenses</th>
                                        <th className="text-right px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Net Profit</th>
                                        <th className="text-right px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Margin</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100">
                                    {MOCK_MONTHLY_DATA.map((m) => (
                                        <tr key={m.month} className="hover:bg-neutral-50/50">
                                            <td className="px-6 py-4 text-sm font-medium text-neutral-900">{m.month} 2025</td>
                                            <td className="px-6 py-4 text-sm text-green-600 text-right">{m.revenue}M</td>
                                            <td className="px-6 py-4 text-sm text-red-600 text-right">{m.expenses}M</td>
                                            <td className="px-6 py-4 text-sm font-medium text-neutral-900 text-right">{m.revenue - m.expenses}M</td>
                                            <td className="px-6 py-4 text-sm text-neutral-500 text-right">{(((m.revenue - m.expenses) / m.revenue) * 100).toFixed(0)}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </PageWrapper>
        </div>
    );
}
