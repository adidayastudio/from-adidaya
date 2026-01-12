"use client";

import { useState } from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import ExpenseSidebar from "@/components/flow/expense/ExpenseSidebar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { User, Users, Search, Plus, Eye } from "lucide-react";
import clsx from "clsx";
import Drawer, { FormField, FormInput, FormTextarea, FormSelect, FormActions } from "@/components/shared/Drawer";

const MOCK_REIMBURSEMENTS = [
    { id: "RMB-001", date: "2025-01-06", user: "Andi Pratama", description: "Site visit transportation", amount: 450000, status: "Pending" },
    { id: "RMB-002", date: "2025-01-05", user: "Siti Rahayu", description: "Client meeting lunch", amount: 350000, status: "Approved" },
    { id: "RMB-003", date: "2025-01-04", user: "Budi Santoso", description: "Office supplies", amount: 275000, status: "Paid" },
];

function formatCurrency(amount: number) { return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount); }

function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = { Pending: "bg-orange-50 text-orange-700", Approved: "bg-green-50 text-green-700", Paid: "bg-blue-50 text-blue-700", Rejected: "bg-red-50 text-red-700" };
    return <span className={clsx("px-2 py-1 rounded-full text-xs font-medium", colors[status])}>{status}</span>;
}

export default function ReimbursementsPage() {
    const [viewMode, setViewMode] = useState<"personal" | "team">("team");
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    return (
        <div className="min-h-screen bg-neutral-50 p-6">
            <Breadcrumb items={[{ label: "Flow" }, { label: "Expense" }, { label: "Reimbursements" }]} />
            <PageWrapper sidebar={<ExpenseSidebar />}>
                <div className="space-y-8 w-full animate-in fade-in duration-500">
                    <div className="space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div><h1 className="text-2xl font-bold text-neutral-900">Reimbursements</h1><p className="text-sm text-neutral-500 mt-1">Request and track expense reimbursements.</p></div>
                            <div className="flex items-center bg-neutral-100 rounded-full p-1">
                                <button onClick={() => setViewMode("personal")} className={clsx("flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium", viewMode === "personal" ? "bg-white shadow text-neutral-900" : "text-neutral-500")}><User className="w-4 h-4" /> Personal</button>
                                <button onClick={() => setViewMode("team")} className={clsx("flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium", viewMode === "team" ? "bg-white shadow text-neutral-900" : "text-neutral-500")}><Users className="w-4 h-4" /> Team</button>
                            </div>
                        </div>
                        <div className="border-b border-neutral-200" />
                    </div>

                    <div className="flex justify-between gap-4">
                        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" /><input type="text" placeholder="Search reimbursements..." className="pl-9 pr-4 py-2 border rounded-lg text-sm w-64" /></div>
                        <button onClick={() => setIsDrawerOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-red-600 rounded-lg text-sm font-medium text-white hover:bg-red-700"><Plus className="w-4 h-4" /> New Request</button>
                    </div>

                    <div className="bg-white rounded-xl border overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-neutral-50 border-b"><tr><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">ID</th><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Date</th>{viewMode === "team" && <th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">User</th>}<th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Description</th><th className="text-right px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Amount</th><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Status</th><th className="px-6 py-3"></th></tr></thead>
                            <tbody className="divide-y">{MOCK_REIMBURSEMENTS.map((r) => (
                                <tr key={r.id} className="hover:bg-neutral-50/50"><td className="px-6 py-4 text-sm font-medium">{r.id}</td><td className="px-6 py-4 text-sm text-neutral-500">{r.date}</td>{viewMode === "team" && <td className="px-6 py-4 text-sm text-neutral-600">{r.user}</td>}<td className="px-6 py-4 text-sm">{r.description}</td><td className="px-6 py-4 text-sm font-medium text-right">{formatCurrency(r.amount)}</td><td className="px-6 py-4"><StatusBadge status={r.status} /></td><td className="px-6 py-4"><button className="p-2 hover:bg-neutral-100 rounded"><Eye className="w-4 h-4 text-neutral-500" /></button></td></tr>
                            ))}</tbody>
                        </table>
                    </div>
                </div>
            </PageWrapper>

            <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} title="New Reimbursement Request" width="lg">
                <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); setIsDrawerOpen(false); }}>
                    <FormField label="Description" required><FormInput placeholder="What is this reimbursement for?" /></FormField>
                    <FormField label="Category" required><FormSelect><option value="">Select category...</option><option>Transportation</option><option>Meals</option><option>Office Supplies</option><option>Communication</option><option>Travel</option><option>Other</option></FormSelect></FormField>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Amount (IDR)" required><FormInput type="number" placeholder="0" /></FormField>
                        <FormField label="Date" required><FormInput type="date" /></FormField>
                    </div>
                    <FormField label="Receipt/Proof"><div className="border-2 border-dashed border-neutral-200 rounded-xl p-6 text-center hover:border-red-300 transition-colors cursor-pointer"><p className="text-sm text-neutral-600">Upload receipt</p><input type="file" accept="image/*,.pdf" className="hidden" /></div></FormField>
                    <FormField label="Notes"><FormTextarea placeholder="Additional notes..." /></FormField>
                    <FormActions onCancel={() => setIsDrawerOpen(false)} submitLabel="Submit Request" />
                </form>
            </Drawer>
        </div>
    );
}
