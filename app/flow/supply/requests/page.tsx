"use client";

import { useState } from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import SupplySidebar from "@/components/flow/supply/SupplySidebar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { User, Users, Search, Plus, CheckCircle, XCircle } from "lucide-react";
import clsx from "clsx";
import Drawer, { FormField, FormInput, FormTextarea, FormSelect, FormActions } from "@/components/shared/Drawer";

const MOCK_TEAM_REQUESTS = [
    { id: "REQ-001", date: "2025-01-06", user: "Andi Pratama", project: "Rumah Pak Budi", item: "Steel Rebar 12mm", qty: "500 pcs", amount: 5500000, status: "Pending" },
    { id: "REQ-002", date: "2025-01-05", user: "Siti Rahayu", project: "Villa Puncak", item: "Cement 50kg", qty: "100 bags", amount: 7000000, status: "Approved" },
    { id: "REQ-003", date: "2025-01-04", user: "Budi Santoso", project: "Renovasi Kantor", item: "Plywood 18mm", qty: "50 sheets", amount: 3750000, status: "Pending" },
    { id: "REQ-004", date: "2025-01-03", user: "Dewi Lestari", project: "Rumah Pak Budi", item: "Paint White", qty: "20 buckets", amount: 2400000, status: "Rejected" },
];

function formatCurrency(amount: number) {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = { Pending: "bg-orange-50 text-orange-700", Approved: "bg-green-50 text-green-700", Rejected: "bg-red-50 text-red-700" };
    return <span className={clsx("px-2 py-1 rounded-full text-xs font-medium", colors[status])}>{status}</span>;
}

export default function RequestsPage() {
    const [viewMode, setViewMode] = useState<"personal" | "team">("team");
    const [filterStatus, setFilterStatus] = useState("all");
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    const filtered = filterStatus === "all" ? MOCK_TEAM_REQUESTS : MOCK_TEAM_REQUESTS.filter(r => r.status === filterStatus);

    return (
        <div className="min-h-screen bg-neutral-50 p-6">
            <Breadcrumb items={[{ label: "Flow" }, { label: "Supply" }, { label: "Requests" }]} />

            <PageWrapper sidebar={<SupplySidebar />}>
                <div className="space-y-8 w-full animate-in fade-in duration-500">
                    <div className="space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h1 className="text-2xl font-bold text-neutral-900">Requests</h1>
                                <p className="text-sm text-neutral-500 mt-1">Material and supply requests from projects.</p>
                            </div>
                            <div className="flex items-center bg-neutral-100 rounded-full p-1">
                                <button onClick={() => setViewMode("personal")} className={clsx("flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium", viewMode === "personal" ? "bg-white shadow text-neutral-900" : "text-neutral-500")}><User className="w-4 h-4" /> Personal</button>
                                <button onClick={() => setViewMode("team")} className={clsx("flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium", viewMode === "team" ? "bg-white shadow text-neutral-900" : "text-neutral-500")}><Users className="w-4 h-4" /> Team</button>
                            </div>
                        </div>
                        <div className="border-b border-neutral-200" />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 justify-between">
                        <div className="flex gap-3 flex-wrap">
                            <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" /><input type="text" placeholder="Search requests..." className="pl-9 pr-4 py-2 border border-neutral-200 rounded-lg text-sm w-64" /></div>
                            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-4 py-2 border border-neutral-200 rounded-lg text-sm">
                                <option value="all">All Status</option>
                                <option value="Pending">Pending</option>
                                <option value="Approved">Approved</option>
                                <option value="Rejected">Rejected</option>
                            </select>
                        </div>
                        <button onClick={() => setIsDrawerOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-red-600 rounded-lg text-sm font-medium text-white hover:bg-red-700">
                            <Plus className="w-4 h-4" /> New Request
                        </button>
                    </div>

                    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-neutral-50 border-b"><tr><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Request #</th><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Date</th>{viewMode === "team" && <th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">User</th>}<th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Project</th><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Item</th><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Qty</th><th className="text-right px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Amount</th><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Status</th>{viewMode === "team" && <th className="text-right px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Actions</th>}</tr></thead>
                            <tbody className="divide-y divide-neutral-100">
                                {filtered.map((req) => (
                                    <tr key={req.id} className="hover:bg-neutral-50/50">
                                        <td className="px-6 py-4 text-sm font-medium text-neutral-900">{req.id}</td>
                                        <td className="px-6 py-4 text-sm text-neutral-500">{req.date}</td>
                                        {viewMode === "team" && <td className="px-6 py-4 text-sm text-neutral-600">{req.user}</td>}
                                        <td className="px-6 py-4 text-sm text-neutral-600">{req.project}</td>
                                        <td className="px-6 py-4 text-sm text-neutral-900">{req.item}</td>
                                        <td className="px-6 py-4 text-sm text-neutral-500">{req.qty}</td>
                                        <td className="px-6 py-4 text-sm text-neutral-900 font-medium text-right">{formatCurrency(req.amount)}</td>
                                        <td className="px-6 py-4"><StatusBadge status={req.status} /></td>
                                        {viewMode === "team" && req.status === "Pending" && (
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex gap-2 justify-end">
                                                    <button className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100"><CheckCircle className="w-4 h-4" /></button>
                                                    <button className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"><XCircle className="w-4 h-4" /></button>
                                                </div>
                                            </td>
                                        )}
                                        {viewMode === "team" && req.status !== "Pending" && <td className="px-6 py-4" />}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </PageWrapper>

            {/* NEW REQUEST DRAWER */}
            <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} title="New Request" width="lg">
                <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); setIsDrawerOpen(false); }}>
                    <FormField label="Project" required><FormSelect><option value="">Select project...</option><option>Rumah Pak Budi</option><option>Villa Puncak</option><option>Renovasi Kantor</option></FormSelect></FormField>
                    <FormField label="Item Name" required><FormInput placeholder="e.g. Steel Rebar 12mm" /></FormField>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Quantity" required><FormInput type="number" placeholder="0" /></FormField>
                        <FormField label="Unit"><FormSelect><option>pcs</option><option>kg</option><option>m</option><option>bags</option><option>sheets</option><option>buckets</option></FormSelect></FormField>
                    </div>
                    <FormField label="Estimated Amount (IDR)"><FormInput type="number" placeholder="0" /></FormField>
                    <FormField label="Vendor (Optional)"><FormSelect><option value="">Select vendor...</option><option>PT Baja Steel</option><option>CV Kayu Prima</option><option>PT Semen Jaya</option></FormSelect></FormField>
                    <FormField label="Notes"><FormTextarea placeholder="Additional notes or specifications..." /></FormField>
                    <FormField label="Priority"><FormSelect><option>Normal</option><option>Urgent</option><option>Low</option></FormSelect></FormField>
                    <FormActions onCancel={() => setIsDrawerOpen(false)} submitLabel="Submit Request" />
                </form>
            </Drawer>
        </div>
    );
}
