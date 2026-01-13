"use client";

import { Expense, updateExpenseStatus } from "@/app/flow/finance/actions";
import { format } from "date-fns";
import { CheckCircle } from "lucide-react";
import { useTransition } from "react";

function formatCurrency(amount: number) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

export default function PaymentList({ expenses }: { expenses: Expense[] }) {
    const [isPending, startTransition] = useTransition();

    const handlePay = (id: string) => {
        // Here we could open a modal to upload proof
        // For MVP, just update status
        if (confirm("Mark this expense as PAID?")) {
            startTransition(async () => {
                await updateExpenseStatus(id, "Paid");
            });
        }
    };

    if (expenses.length === 0) {
        return (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-neutral-200">
                <p className="text-neutral-500">No approved expenses pending payment.</p>
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
                                <td className="px-6 py-4 text-neutral-900">Unknown Employee</td>
                                <td className="px-6 py-4 font-medium text-neutral-900">{expense.description}</td>
                                <td className="px-6 py-4 font-medium text-neutral-900 text-right">
                                    {formatCurrency(Number(expense.amount))}
                                </td>
                                <td className="px-6 py-4 flex justify-center">
                                    <button
                                        disabled={isPending}
                                        onClick={() => handlePay(expense.id)}
                                        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors text-xs font-medium disabled:opacity-50"
                                    >
                                        <CheckCircle className="w-3.5 h-3.5" />
                                        Mark Paid
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
