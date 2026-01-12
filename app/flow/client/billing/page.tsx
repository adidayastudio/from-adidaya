"use client";

import PageWrapper from "@/components/layout/PageWrapper";
import ClientSidebar from "@/components/flow/client/ClientSidebar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { Search, Download, DollarSign, Clock, CheckCircle } from "lucide-react";
import clsx from "clsx";

const MOCK_BILLING = [
    { id: "INV-001", client: "PT Maju Bersama", project: "Rumah Pak Budi", amount: 75000000, date: "2025-01-06", due: "2025-01-20", status: "Paid" },
    { id: "INV-002", client: "CV Sinar Jaya", project: "Renovasi Kantor", amount: 50000000, date: "2025-01-05", due: "2025-01-25", status: "Sent" },
    { id: "INV-003", client: "Bapak Sutanto", project: "Villa Puncak", amount: 45000000, date: "2025-01-04", due: "2025-02-01", status: "Draft" },
    { id: "INV-004", client: "PT Industrial", project: "Gudang Cikarang", amount: 35000000, date: "2024-12-20", due: "2025-01-05", status: "Overdue" },
];

function formatShort(n: number) { return n >= 1000000 ? `${(n / 1000000).toFixed(0)}M` : `${n}`; }

function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = { Paid: "bg-green-50 text-green-700", Sent: "bg-blue-50 text-blue-700", Draft: "bg-neutral-100 text-neutral-600", Overdue: "bg-red-50 text-red-700" };
    return <span className={clsx("px-2 py-1 rounded-full text-xs font-medium", colors[status])}>{status}</span>;
}

export default function BillingPage() {
    const paid = MOCK_BILLING.filter(b => b.status === "Paid").reduce((a, b) => a + b.amount, 0);
    const pending = MOCK_BILLING.filter(b => b.status !== "Paid").reduce((a, b) => a + b.amount, 0);

    return (
        <div className="min-h-screen bg-neutral-50 p-6">
            <Breadcrumb items={[{ label: "Flow" }, { label: "Client" }, { label: "Billing" }]} />
            <PageWrapper sidebar={<ClientSidebar />}>
                <div className="space-y-8 w-full animate-in fade-in duration-500">
                    <div className="space-y-4">
                        <div>
                            <h1 className="text-2xl font-bold text-neutral-900">Billing</h1>
                            <p className="text-sm text-neutral-500 mt-1">Track invoices and client payments.</p>
                        </div>
                        <div className="border-b border-neutral-200" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white rounded-xl border p-5"><div className="flex items-center gap-2 text-green-600 mb-2"><CheckCircle className="w-5 h-5" /><span className="text-sm font-medium">Paid</span></div><div className="text-2xl font-bold">{formatShort(paid)}</div></div>
                        <div className="bg-white rounded-xl border p-5"><div className="flex items-center gap-2 text-orange-600 mb-2"><Clock className="w-5 h-5" /><span className="text-sm font-medium">Pending</span></div><div className="text-2xl font-bold">{formatShort(pending)}</div></div>
                        <div className="bg-white rounded-xl border p-5"><div className="flex items-center gap-2 text-blue-600 mb-2"><DollarSign className="w-5 h-5" /><span className="text-sm font-medium">Total</span></div><div className="text-2xl font-bold">{formatShort(paid + pending)}</div></div>
                    </div>

                    <div className="flex justify-between gap-4">
                        <div className="relative w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" /><input type="text" placeholder="Search invoices..." className="pl-9 pr-4 py-2 border rounded-lg text-sm w-full" /></div>
                        <button className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg text-sm font-medium hover:bg-neutral-50"><Download className="w-4 h-4" /> Export</button>
                    </div>

                    <div className="bg-white rounded-xl border overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-neutral-50 border-b"><tr><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Invoice #</th><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Client</th><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Project</th><th className="text-right px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Amount</th><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Due</th><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Status</th></tr></thead>
                            <tbody className="divide-y">{MOCK_BILLING.map((b) => (
                                <tr key={b.id} className="hover:bg-neutral-50/50">
                                    <td className="px-6 py-4 text-sm font-medium">{b.id}</td>
                                    <td className="px-6 py-4 text-sm">{b.client}</td>
                                    <td className="px-6 py-4 text-sm text-neutral-600">{b.project}</td>
                                    <td className="px-6 py-4 text-sm font-medium text-right">{formatShort(b.amount)}</td>
                                    <td className="px-6 py-4 text-sm text-neutral-500">{b.due}</td>
                                    <td className="px-6 py-4"><StatusBadge status={b.status} /></td>
                                </tr>
                            ))}</tbody>
                        </table>
                    </div>
                </div>
            </PageWrapper>
        </div>
    );
}
