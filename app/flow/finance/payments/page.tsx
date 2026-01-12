"use client";

import { useState } from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import FinanceSidebar from "@/components/flow/finance/FinanceSidebar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { Search, Plus, Eye, DollarSign, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import clsx from "clsx";
import Drawer, { FormField, FormInput, FormTextarea, FormSelect, FormActions } from "@/components/shared/Drawer";

const MOCK_PAYMENTS = [
    { id: "PAY-001", date: "2025-01-06", type: "Income", from: "PT Maju Bersama", description: "Invoice INV-2025-003 payment", amount: 75000000, method: "Bank Transfer" },
    { id: "PAY-002", date: "2025-01-05", type: "Expense", to: "PT Baja Steel", description: "PO-2025-024 payment", amount: 45000000, method: "Bank Transfer" },
    { id: "PAY-003", date: "2025-01-04", type: "Income", from: "Bapak Sutanto", description: "Down payment Villa Puncak", amount: 54000000, method: "Check" },
];

function formatCurrency(amount: number) { return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount); }

export default function PaymentsPage() {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    return (
        <div className="min-h-screen bg-neutral-50 p-6">
            <Breadcrumb items={[{ label: "Flow" }, { label: "Finance" }, { label: "Payments" }]} />
            <PageWrapper sidebar={<FinanceSidebar />}>
                <div className="space-y-8 w-full animate-in fade-in duration-500">
                    <div className="space-y-4">
                        <div><h1 className="text-2xl font-bold text-neutral-900">Payments</h1><p className="text-sm text-neutral-500 mt-1">Track incoming and outgoing payments.</p></div>
                        <div className="border-b border-neutral-200" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white rounded-xl border p-5"><div className="flex items-center gap-2 text-green-600 mb-2"><ArrowDownCircle className="w-5 h-5" /><span className="text-sm font-medium">Income</span></div><div className="text-2xl font-bold">129M</div></div>
                        <div className="bg-white rounded-xl border p-5"><div className="flex items-center gap-2 text-red-600 mb-2"><ArrowUpCircle className="w-5 h-5" /><span className="text-sm font-medium">Expenses</span></div><div className="text-2xl font-bold">45M</div></div>
                        <div className="bg-white rounded-xl border p-5"><div className="flex items-center gap-2 text-blue-600 mb-2"><DollarSign className="w-5 h-5" /><span className="text-sm font-medium">Net</span></div><div className="text-2xl font-bold">84M</div></div>
                    </div>

                    <div className="flex justify-between gap-4">
                        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" /><input type="text" placeholder="Search payments..." className="pl-9 pr-4 py-2 border rounded-lg text-sm w-64" /></div>
                        <button onClick={() => setIsDrawerOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-red-600 rounded-lg text-sm font-medium text-white hover:bg-red-700"><Plus className="w-4 h-4" /> Record Payment</button>
                    </div>

                    <div className="bg-white rounded-xl border overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-neutral-50 border-b"><tr><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">ID</th><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Date</th><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Type</th><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">From/To</th><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Description</th><th className="text-right px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Amount</th><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Method</th><th className="px-6 py-3"></th></tr></thead>
                            <tbody className="divide-y">{MOCK_PAYMENTS.map((p) => (
                                <tr key={p.id} className="hover:bg-neutral-50/50"><td className="px-6 py-4 text-sm font-medium">{p.id}</td><td className="px-6 py-4 text-sm text-neutral-500">{p.date}</td><td className="px-6 py-4"><span className={clsx("inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium", p.type === "Income" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700")}>{p.type === "Income" ? <ArrowDownCircle className="w-3 h-3" /> : <ArrowUpCircle className="w-3 h-3" />}{p.type}</span></td><td className="px-6 py-4 text-sm">{p.from || p.to}</td><td className="px-6 py-4 text-sm text-neutral-600">{p.description}</td><td className={clsx("px-6 py-4 text-sm font-medium text-right", p.type === "Income" ? "text-green-600" : "text-red-600")}>{p.type === "Income" ? "+" : "-"}{formatCurrency(p.amount)}</td><td className="px-6 py-4 text-sm text-neutral-500">{p.method}</td><td className="px-6 py-4"><button className="p-2 hover:bg-neutral-100 rounded"><Eye className="w-4 h-4 text-neutral-500" /></button></td></tr>
                            ))}</tbody>
                        </table>
                    </div>
                </div>
            </PageWrapper>

            <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} title="Record Payment" width="lg">
                <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); setIsDrawerOpen(false); }}>
                    <FormField label="Payment Type" required><FormSelect><option value="">Select type...</option><option>Income</option><option>Expense</option></FormSelect></FormField>
                    <FormField label="From/To" required><FormInput placeholder="Client or vendor name" /></FormField>
                    <FormField label="Description" required><FormInput placeholder="Payment description" /></FormField>
                    <FormField label="Related Document"><FormSelect><option value="">Select document...</option><option>INV-2025-001</option><option>INV-2025-002</option><option>PO-2025-024</option></FormSelect></FormField>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Amount (IDR)" required><FormInput type="number" placeholder="0" /></FormField>
                        <FormField label="Date" required><FormInput type="date" /></FormField>
                    </div>
                    <FormField label="Payment Method" required><FormSelect><option>Bank Transfer</option><option>Cash</option><option>Check</option><option>Credit Card</option></FormSelect></FormField>
                    <FormField label="Bank/Account"><FormInput placeholder="Bank name and account" /></FormField>
                    <FormField label="Notes"><FormTextarea placeholder="Additional notes..." /></FormField>
                    <FormActions onCancel={() => setIsDrawerOpen(false)} submitLabel="Record Payment" />
                </form>
            </Drawer>
        </div>
    );
}
