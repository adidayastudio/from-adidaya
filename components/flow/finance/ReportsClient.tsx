"use client";

import { Expense } from "@/app/flow/finance/actions";
import { useFinance } from "@/components/flow/finance/FinanceContext";
import { BarChart3, TrendingUp, Download, Calendar, PieChart } from "lucide-react";
import { format, startOfMonth, subMonths, isSameMonth } from "date-fns";
import { useMemo, useEffect } from "react";
import clsx from "clsx";

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
    return `${amount}`;
}

export default function ReportsClient({ expenses }: { expenses: Expense[] }) {
    const { viewMode } = useFinance();

    const stats = useMemo(() => {
        // 1. Monthly Trend (Last 6 Months)
        const months = Array.from({ length: 6 }).map((_, i) => subMonths(new Date(), 5 - i));

        const trend = months.map(month => {
            const monthlyExpenses = expenses.filter(e => isSameMonth(new Date(e.date), month));
            const total = monthlyExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
            return {
                label: format(month, "MMM"),
                amount: total,
                fullDate: month
            };
        });

        // 2. By Category (All Time)
        const byCategory: Record<string, number> = {};
        expenses.forEach(e => {
            const cat = e.category || "Uncategorized";
            byCategory[cat] = (byCategory[cat] || 0) + Number(e.amount);
        });

        const categoryData = Object.entries(byCategory)
            .map(([label, value]) => ({ label, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5); // Top 5 categories

        const maxTrend = Math.max(...trend.map(t => t.amount), 1);
        const maxCategory = Math.max(...categoryData.map(c => c.value), 1);

        // 3. Current Month Summary
        const currentMonth = new Date();
        const currentMonthExpenses = expenses.filter(e => isSameMonth(new Date(e.date), currentMonth));
        const currentTotal = currentMonthExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

        return { trend, categoryData, maxTrend, maxCategory, currentTotal };
    }, [expenses]);

    // FAB Action Listener
    useEffect(() => {
        const handleFabAction = (e: any) => {
            if (e.detail?.id === 'FINANCE_EXPORT') {
                alert("Exporting Reports logic to be implemented or uses existing PDF generator.");
            }
        };
        window.addEventListener('fab-action', handleFabAction);
        return () => window.removeEventListener('fab-action', handleFabAction);
    }, []);

    if (viewMode === "personal") {
        return (
            <div className="text-center py-20 bg-white rounded-xl border border-dashed border-neutral-200">
                <p className="text-neutral-500">Reports are available in Team View only.</p>
                <p className="text-xs text-neutral-400 mt-2">Please switch to Team View if you have access.</p>
            </div>
        );
    }

    if (expenses.length === 0) {
        return (
            <div className="text-center py-20 bg-white rounded-xl border border-dashed border-neutral-200">
                <p className="text-neutral-500">No expense data available to generate reports.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 w-full animate-in fade-in duration-500">
            {/* Actions */}
            <div className="flex gap-2 justify-end">
                <div className="flex items-center gap-2 px-4 py-2 bg-white border border-neutral-200 rounded-lg text-sm font-medium text-neutral-700">
                    <Calendar className="w-4 h-4 text-neutral-400" />
                    <span>Last 6 Months</span>
                </div>
            </div>

            {/* REPORT CARDS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Monthly Trend */}
                <div className="bg-white rounded-xl border border-neutral-200 p-6 flex flex-col">
                    <div className="flex items-center gap-2 mb-6">
                        <TrendingUp className="w-5 h-5 text-neutral-400" />
                        <div>
                            <h3 className="font-semibold text-neutral-900">Expense Trend</h3>
                            <p className="text-xs text-neutral-500">Monthly spending overview</p>
                        </div>
                    </div>

                    <div className="flex-1 flex items-end justify-between gap-4 h-48 pt-4">
                        {stats.trend.map((m) => (
                            <div key={m.label} className="group flex-1 flex flex-col items-center gap-2 relative">
                                <div className="flex gap-1 items-end w-full justify-center h-full relative">
                                    <div
                                        className="w-full max-w-[24px] bg-red-100 rounded-t-md group-hover:bg-red-200 transition-colors relative"
                                        style={{ height: `${(m.amount / stats.maxTrend) * 100}%` }}
                                    >
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-neutral-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                            {formatShort(m.amount)}
                                        </div>
                                    </div>
                                </div>
                                <span className="text-xs text-neutral-500 font-medium">{m.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* By Category */}
                <div className="bg-white rounded-xl border border-neutral-200 p-6">
                    <div className="flex items-center gap-2 mb-6">
                        <PieChart className="w-5 h-5 text-neutral-400" />
                        <div>
                            <h3 className="font-semibold text-neutral-900">Top Categories</h3>
                            <p className="text-xs text-neutral-500">Where money is being spent</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        {stats.categoryData.map((c) => (
                            <div key={c.label}>
                                <div className="flex justify-between mb-1">
                                    <span className="text-sm font-medium text-neutral-900">{c.label}</span>
                                    <span className="text-sm text-neutral-500">{formatShort(c.value)}</span>
                                </div>
                                <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-500 rounded-full"
                                        style={{ width: `${(c.value / stats.maxCategory) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                        {stats.categoryData.length === 0 && (
                            <p className="text-neutral-500 text-sm py-4 text-center">No categorized expenses found.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Detailed Table */}
            <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-neutral-100">
                    <h3 className="font-semibold text-neutral-900">Monthly Breakdown</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-neutral-50/50 border-b border-neutral-200">
                            <tr>
                                <th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Month</th>
                                <th className="text-right px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Total Expenses</th>
                                <th className="text-right px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                            {stats.trend.slice().reverse().map((m) => ( // Reverse to show newest first
                                <tr key={m.label} className="hover:bg-neutral-50/50 transition-colors">
                                    <td className="px-6 py-4 text-sm font-medium text-neutral-900">
                                        {format(m.fullDate, "MMMM yyyy")}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold text-neutral-900 text-right">
                                        {formatCurrency(m.amount)}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-neutral-500 text-right">
                                        <span className={clsx(
                                            "px-2 py-1 rounded-full text-xs font-medium",
                                            m.amount > 0 ? "bg-red-50 text-red-700" : "bg-neutral-100 text-neutral-500"
                                        )}>
                                            {m.amount > 0 ? "Active" : "No Activity"}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
