"use client";

import { useState } from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import SupplySidebar from "@/components/flow/supply/SupplySidebar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { User, Users, Search, Plus, Download, Eye, Send } from "lucide-react";
import clsx from "clsx";
import Drawer, { FormField, FormInput, FormTextarea, FormSelect, FormActions } from "@/components/shared/Drawer";

const MOCK_ORDERS = [
    { id: "PO-2025-024", date: "2025-01-06", vendor: "PT Baja Steel", project: "Rumah Pak Budi", items: 3, amount: 45000000, status: "In Transit", eta: "2025-01-08" },
    { id: "PO-2025-023", date: "2025-01-05", vendor: "CV Kayu Prima", project: "Villa Puncak", items: 2, amount: 28000000, status: "Pending", eta: null },
    { id: "PO-2025-022", date: "2025-01-04", vendor: "PT Semen Jaya", project: "Renovasi Kantor", items: 1, amount: 15000000, status: "Delivered", eta: null },
    { id: "PO-2025-021", date: "2025-01-03", vendor: "PT Cat Indonesia", project: "Rumah Pak Budi", items: 4, amount: 8500000, status: "Draft", eta: null },
];

function formatCurrency(amount: number) { return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount); }

function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = { Draft: "bg-neutral-100 text-neutral-600", Pending: "bg-orange-50 text-orange-700", "In Transit": "bg-blue-50 text-blue-700", Delivered: "bg-green-50 text-green-700" };
    return <span className={clsx("px-2 py-1 rounded-full text-xs font-medium", colors[status])}>{status}</span>;
}

export default function PurchaseOrdersPage() {
    const [viewMode, setViewMode] = useState<"personal" | "team">("team");
    const [filterStatus, setFilterStatus] = useState("all");
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    const filtered = filterStatus === "all" ? MOCK_ORDERS : MOCK_ORDERS.filter(o => o.status === filterStatus);

    return (
        <div className="min-h-screen bg-neutral-50 p-6">
            <Breadcrumb items={[{ label: "Flow" }, { label: "Supply" }, { label: "Purchase Orders" }]} />
            <PageWrapper sidebar={<SupplySidebar />}>
                <div className="space-y-8 w-full animate-in fade-in duration-500">
                    <div className="space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div><h1 className="text-2xl font-bold text-neutral-900">Purchase Orders</h1><p className="text-sm text-neutral-500 mt-1">Manage and track purchase orders to vendors.</p></div>
                            <div className="flex items-center bg-neutral-100 rounded-full p-1">
                                <button onClick={() => setViewMode("personal")} className={clsx("flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium", viewMode === "personal" ? "bg-white shadow text-neutral-900" : "text-neutral-500")}><User className="w-4 h-4" /> Personal</button>
                                <button onClick={() => setViewMode("team")} className={clsx("flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium", viewMode === "team" ? "bg-white shadow text-neutral-900" : "text-neutral-500")}><Users className="w-4 h-4" /> Team</button>
                            </div>
                        </div>
                        <div className="border-b border-neutral-200" />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 justify-between">
                        <div className="flex gap-3 flex-wrap">
                            <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" /><input type="text" placeholder="Search orders..." className="pl-9 pr-4 py-2 border rounded-lg text-sm w-64" /></div>
                            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-4 py-2 border rounded-lg text-sm"><option value="all">All Status</option><option value="Draft">Draft</option><option value="Pending">Pending</option><option value="In Transit">In Transit</option><option value="Delivered">Delivered</option></select>
                        </div>
                        <div className="flex gap-2">
                            <button className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg text-sm font-medium hover:bg-neutral-50"><Download className="w-4 h-4" /> Export</button>
                            <button onClick={() => setIsDrawerOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-red-600 rounded-lg text-sm font-medium text-white hover:bg-red-700"><Plus className="w-4 h-4" /> New PO</button>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-neutral-50 border-b"><tr><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">PO #</th><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Date</th><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Vendor</th><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Project</th><th className="text-center px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Items</th><th className="text-right px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Amount</th><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Status</th><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">ETA</th><th className="text-right px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Actions</th></tr></thead>
                            <tbody className="divide-y">{filtered.map((order) => (
                                <tr key={order.id} className="hover:bg-neutral-50/50">
                                    <td className="px-6 py-4 text-sm font-medium">{order.id}</td><td className="px-6 py-4 text-sm text-neutral-500">{order.date}</td><td className="px-6 py-4 text-sm">{order.vendor}</td><td className="px-6 py-4 text-sm text-neutral-600">{order.project}</td><td className="px-6 py-4 text-sm text-center">{order.items}</td><td className="px-6 py-4 text-sm font-medium text-right">{formatCurrency(order.amount)}</td><td className="px-6 py-4"><StatusBadge status={order.status} /></td><td className="px-6 py-4 text-sm text-neutral-500">{order.eta || "—"}</td>
                                    <td className="px-6 py-4 text-right"><div className="flex gap-2 justify-end"><button className="p-2 rounded-lg hover:bg-neutral-100"><Eye className="w-4 h-4 text-neutral-500" /></button>{order.status === "Draft" && <button className="p-2 rounded-lg hover:bg-blue-50"><Send className="w-4 h-4 text-blue-600" /></button>}</div></td>
                                </tr>
                            ))}</tbody>
                        </table>
                    </div>
                </div>
            </PageWrapper>

            <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} title="New Purchase Order" width="lg">
                <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); setIsDrawerOpen(false); }}>
                    <FormField label="Vendor" required><FormSelect><option value="">Select vendor...</option><option>PT Baja Steel</option><option>CV Kayu Prima</option><option>PT Semen Jaya</option><option>PT Cat Indonesia</option></FormSelect></FormField>
                    <FormField label="Project" required><FormSelect><option value="">Select project...</option><option>Rumah Pak Budi</option><option>Villa Puncak</option><option>Renovasi Kantor</option></FormSelect></FormField>
                    <div className="border-t pt-4 mt-4"><h4 className="font-medium text-neutral-900 mb-3">Order Items</h4>
                        <div className="space-y-3">
                            <div className="grid grid-cols-12 gap-2"><div className="col-span-5"><FormInput placeholder="Item name" /></div><div className="col-span-2"><FormInput type="number" placeholder="Qty" /></div><div className="col-span-2"><FormInput placeholder="Unit" /></div><div className="col-span-3"><FormInput type="number" placeholder="Price" /></div></div>
                        </div>
                        <button type="button" className="mt-3 text-sm text-red-600 font-medium hover:text-red-700">+ Add Item</button>
                    </div>
                    <FormField label="Delivery Date"><FormInput type="date" /></FormField>
                    <FormField label="Delivery Address"><FormTextarea placeholder="Enter delivery address..." /></FormField>
                    <FormField label="Notes"><FormTextarea placeholder="Additional notes..." /></FormField>
                    <FormActions onCancel={() => setIsDrawerOpen(false)} submitLabel="Create PO" />
                </form>
            </Drawer>
        </div>
    );
}
