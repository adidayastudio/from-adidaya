"use client";

import { useState } from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import FinanceSidebar from "@/components/flow/finance/FinanceSidebar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { User, Users, Search, Plus, Eye, Send, Download } from "lucide-react";
import clsx from "clsx";
import Drawer, { FormField, FormInput, FormTextarea, FormSelect, FormActions } from "@/components/shared/Drawer";

const MOCK_INVOICES = [
    { id: "INV-2025-001", date: "2025-01-06", client: "PT Maju Bersama", project: "Rumah Pak Budi", amount: 75000000, due: "2025-01-20", status: "Sent" },
    { id: "INV-2025-002", date: "2025-01-05", client: "CV Sinar Jaya", project: "Renovasi Kantor", amount: 50000000, due: "2025-01-25", status: "Draft" },
    { id: "INV-2025-003", date: "2025-01-04", client: "Bapak Sutanto", project: "Villa Puncak", amount: 45000000, due: "2025-02-01", status: "Paid" },
];

function formatCurrency(amount: number) { return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount); }

function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = { Draft: "bg-neutral-100 text-neutral-600", Sent: "bg-blue-50 text-blue-700", Paid: "bg-green-50 text-green-700", Overdue: "bg-red-50 text-red-700" };
    return <span className={clsx("px-2 py-1 rounded-full text-xs font-medium", colors[status])}>{status}</span>;
}

export default function InvoicesPage() {
    const [viewMode, setViewMode] = useState<"personal" | "team">("team");
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    return (
        <div className="min-h-screen bg-neutral-50 p-6">
            <Breadcrumb items={[{ label: "Flow" }, { label: "Finance" }, { label: "Invoices" }]} />
            <PageWrapper sidebar={<FinanceSidebar />}>
                <div className="space-y-8 w-full animate-in fade-in duration-500">
                    <div className="space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div><h1 className="text-2xl font-bold text-neutral-900">Invoices</h1><p className="text-sm text-neutral-500 mt-1">Create and manage client invoices.</p></div>
                            <div className="flex items-center bg-neutral-100 rounded-full p-1">
                                <button onClick={() => setViewMode("personal")} className={clsx("flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium", viewMode === "personal" ? "bg-white shadow text-neutral-900" : "text-neutral-500")}><User className="w-4 h-4" /> Personal</button>
                                <button onClick={() => setViewMode("team")} className={clsx("flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium", viewMode === "team" ? "bg-white shadow text-neutral-900" : "text-neutral-500")}><Users className="w-4 h-4" /> Team</button>
                            </div>
                        </div>
                        <div className="border-b border-neutral-200" />
                    </div>

                    <div className="flex justify-between gap-4">
                        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" /><input type="text" placeholder="Search invoices..." className="pl-9 pr-4 py-2 border rounded-lg text-sm w-64" /></div>
                        <button onClick={() => setIsDrawerOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-red-600 rounded-lg text-sm font-medium text-white hover:bg-red-700"><Plus className="w-4 h-4" /> New Invoice</button>
                    </div>

                    <div className="bg-white rounded-xl border overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-neutral-50 border-b"><tr><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Invoice #</th><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Date</th><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Client</th><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Project</th><th className="text-right px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Amount</th><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Due</th><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Status</th><th className="px-6 py-3"></th></tr></thead>
                            <tbody className="divide-y">{MOCK_INVOICES.map((i) => (
                                <tr key={i.id} className="hover:bg-neutral-50/50"><td className="px-6 py-4 text-sm font-medium">{i.id}</td><td className="px-6 py-4 text-sm text-neutral-500">{i.date}</td><td className="px-6 py-4 text-sm">{i.client}</td><td className="px-6 py-4 text-sm text-neutral-600">{i.project}</td><td className="px-6 py-4 text-sm font-medium text-right">{formatCurrency(i.amount)}</td><td className="px-6 py-4 text-sm text-neutral-500">{i.due}</td><td className="px-6 py-4"><StatusBadge status={i.status} /></td><td className="px-6 py-4"><div className="flex gap-1"><button className="p-2 hover:bg-neutral-100 rounded"><Eye className="w-4 h-4 text-neutral-500" /></button>{i.status === "Draft" && <button className="p-2 hover:bg-blue-50 rounded"><Send className="w-4 h-4 text-blue-600" /></button>}<button className="p-2 hover:bg-neutral-100 rounded"><Download className="w-4 h-4 text-neutral-500" /></button></div></td></tr>
                            ))}</tbody>
                        </table>
                    </div>
                </div>
            </PageWrapper>

            <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} title="New Invoice" width="lg">
                <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); setIsDrawerOpen(false); }}>
                    <FormField label="Client" required><FormSelect><option value="">Select client...</option><option>PT Maju Bersama</option><option>CV Sinar Jaya</option><option>Bapak Sutanto</option></FormSelect></FormField>
                    <FormField label="Project" required><FormSelect><option value="">Select project...</option><option>Rumah Pak Budi</option><option>Renovasi Kantor</option><option>Villa Puncak</option></FormSelect></FormField>
                    <FormField label="Invoice Number"><FormInput placeholder="Auto-generated if blank" /></FormField>
                    <div className="border-t pt-4 mt-4"><h4 className="font-medium text-neutral-900 mb-3">Invoice Items</h4>
                        <div className="space-y-3">
                            <div className="grid grid-cols-12 gap-2"><div className="col-span-6"><FormInput placeholder="Description" /></div><div className="col-span-2"><FormInput type="number" placeholder="Qty" /></div><div className="col-span-4"><FormInput type="number" placeholder="Amount" /></div></div>
                        </div>
                        <button type="button" className="mt-3 text-sm text-red-600 font-medium hover:text-red-700">+ Add Item</button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Invoice Date" required><FormInput type="date" /></FormField>
                        <FormField label="Due Date" required><FormInput type="date" /></FormField>
                    </div>
                    <FormField label="Notes"><FormTextarea placeholder="Terms and notes..." /></FormField>
                    <FormActions onCancel={() => setIsDrawerOpen(false)} submitLabel="Create Invoice" />
                </form>
            </Drawer>
        </div>
    );
}
