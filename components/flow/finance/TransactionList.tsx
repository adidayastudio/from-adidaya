"use client";

import { useState, useMemo } from "react";
import { Expense } from "@/app/flow/finance/actions";
import { format } from "date-fns";
import clsx from "clsx";
import { useFinance } from "@/components/flow/finance/FinanceContext";
import { Search, Filter, Calendar as CalendarIcon, ArrowUpRight, ArrowDownRight, Tag, User } from "lucide-react";

function formatCurrency(amount: number) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount).replace(/\u00a0/g, " ");
}

export default function TransactionList({ expenses, userId }: { expenses: Expense[]; userId: string | null }) {
    const { viewMode } = useFinance();
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");

    const filteredExpenses = useMemo(() => {
        let data = viewMode === "personal"
            ? expenses.filter(e => e.user_id === userId)
            : expenses;

        if (searchTerm) {
            const lowerInfo = searchTerm.toLowerCase();
            data = data.filter(e =>
                e.description.toLowerCase().includes(lowerInfo) ||
                (e.category && e.category.toLowerCase().includes(lowerInfo)) ||
                (e.amount && e.amount.toString().includes(lowerInfo))
            );
        }

        if (statusFilter !== "All") {
            data = data.filter(e => e.status === statusFilter);
        }

        return data;
    }, [expenses, userId, viewMode, searchTerm, statusFilter]);

    const stats = useMemo(() => {
        const total = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
        const count = filteredExpenses.length;
        return { total, count };
    }, [filteredExpenses]);

    return (
        <div className="space-y-6">
            {/* FILTERS TOOLBAR */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-2 rounded-xl border border-neutral-200 shadow-sm">
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                        type="text"
                        placeholder="Search transactions..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm border border-transparent bg-neutral-100 rounded-lg focus:bg-white focus:border-neutral-300 focus:ring-2 focus:ring-neutral-100 outline-none transition-all placeholder:text-neutral-500"
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                    {["All", "Pending", "Approved", "Paid", "Rejected", "Draft"].map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={clsx(
                                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap",
                                statusFilter === status
                                    ? "bg-neutral-900 text-white shadow-sm"
                                    : "bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50 hover:border-neutral-300"
                            )}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {/* RESULTS COUNTER */}
            <div className="flex items-center justify-between px-1">
                <div className="text-xs font-medium text-neutral-500">
                    Showing {stats.count} transaction{stats.count !== 1 && "s"}
                </div>
                <div className="text-xs font-medium text-neutral-900">
                    Total Value: <span className="font-bold">{formatCurrency(stats.total)}</span>
                </div>
            </div>

            {/* TABLE */}
            <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
                {filteredExpenses.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center mb-4">
                            <Tag className="w-8 h-8 text-neutral-300" />
                        </div>
                        <h3 className="text-sm font-semibold text-neutral-900">No transactions found</h3>
                        <p className="text-xs text-neutral-500 mt-1 max-w-xs">
                            Try adjusting your search or filters to find what you're looking for.
                        </p>
                        {(searchTerm || statusFilter !== "All") && (
                            <button
                                onClick={() => { setSearchTerm(""); setStatusFilter("All"); }}
                                className="mt-4 text-xs font-medium text-red-600 hover:underline"
                            >
                                Clear filters
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-neutral-50/50 border-b border-neutral-200">
                                <tr>
                                    <th className="px-6 py-3 font-semibold text-neutral-600">Details</th>
                                    <th className="px-6 py-3 font-semibold text-neutral-600">Category</th>
                                    {viewMode === "team" && <th className="px-6 py-3 font-semibold text-neutral-600">User</th>}
                                    <th className="px-6 py-3 font-semibold text-neutral-600 text-right">Amount</th>
                                    <th className="px-6 py-3 font-semibold text-neutral-600 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100">
                                {filteredExpenses.map((expense) => (
                                    <tr key={expense.id} className="group hover:bg-neutral-50/80 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-500 group-hover:bg-white group-hover:shadow-sm transition-all border border-transparent group-hover:border-neutral-200">
                                                    <Tag className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <div className="font-medium text-neutral-900 line-clamp-1">{expense.description}</div>
                                                    <div className="text-xs text-neutral-500 flex items-center gap-1.5 mt-0.5">
                                                        <CalendarIcon className="w-3 h-3" />
                                                        {format(new Date(expense.date), "dd MMM yyyy")}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-neutral-100 text-neutral-600 border border-neutral-200">
                                                {expense.category || "General"}
                                            </span>
                                        </td>
                                        {viewMode === "team" && (
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700">
                                                        <User className="w-3 h-3" />
                                                    </div>
                                                    <span className="text-neutral-600 text-xs">Unknown</span>
                                                </div>
                                            </td>
                                        )}
                                        <td className="px-6 py-4 text-right">
                                            <div className="font-semibold text-neutral-900">{formatCurrency(Number(expense.amount))}</div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span
                                                className={clsx(
                                                    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
                                                    expense.status === "Paid" && "bg-green-50 text-green-700 border-green-200",
                                                    expense.status === "Pending" && "bg-orange-50 text-orange-700 border-orange-200",
                                                    expense.status === "Rejected" && "bg-red-50 text-red-700 border-red-200",
                                                    expense.status === "Approved" && "bg-blue-50 text-blue-700 border-blue-200",
                                                    expense.status === "Draft" && "bg-neutral-100 text-neutral-600 border-neutral-200"
                                                )}
                                            >
                                                {expense.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
