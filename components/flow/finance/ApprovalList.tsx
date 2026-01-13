"use client";

import { Expense, updateExpenseStatus } from "@/app/flow/finance/actions";
import { format } from "date-fns";
import clsx from "clsx";
import { Check, X } from "lucide-react";
import { useTransition } from "react";

function formatCurrency(amount: number) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

export default function ApprovalList({ expenses }: { expenses: Expense[] }) {
    const [isPending, startTransition] = useTransition();

    const handleAction = (id: string, status: Expense["status"]) => {
        startTransition(async () => {
            await updateExpenseStatus(id, status);
        });
    };

    if (expenses.length === 0) {
        return (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-neutral-200">
                <p className="text-neutral-500">No pending approvals found.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-neutral-50 border-b border-neutral-200">
                        <tr>
                            <th className="px-6 py-4 font-medium text-neutral-600">Date</th>
                            <th className="px-6 py-4 font-medium text-neutral-600">Employee</th>
                            <th className="px-6 py-4 font-medium text-neutral-600">Description</th>
                            <th className="px-6 py-4 font-medium text-neutral-600 text-right">Amount</th>
                            <th className="px-6 py-4 font-medium text-neutral-600 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                        {expenses.map((expense) => (
                            <tr key={expense.id} className="hover:bg-neutral-50 transition-colors">
                                <td className="px-6 py-4 text-neutral-500 whitespace-nowrap">
                                    {format(new Date(expense.date), "dd MMM yyyy")}
                                </td>
                                <td className="px-6 py-4 text-neutral-900">
                                    {/* Ideally we fetch user name, but for now placeholder or if backend joins it */}
                                    Unknown Employee
                                </td>
                                <td className="px-6 py-4 font-medium text-neutral-900">{expense.description}</td>
                                <td className="px-6 py-4 font-medium text-neutral-900 text-right">
                                    {formatCurrency(Number(expense.amount))}
                                </td>
                                <td className="px-6 py-4 flex justify-center gap-2">
                                    <button
                                        disabled={isPending}
                                        onClick={() => handleAction(expense.id, "Approved")}
                                        className="p-1.5 rounded-full text-green-600 hover:bg-green-50 transition-colors disabled:opacity-50"
                                        title="Approve"
                                    >
                                        <Check className="w-5 h-5" />
                                    </button>
                                    <button
                                        disabled={isPending}
                                        onClick={() => handleAction(expense.id, "Rejected")}
                                        className="p-1.5 rounded-full text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                                        title="Reject"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
