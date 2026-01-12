"use client";

import { useState } from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import AssetSidebar from "@/components/flow/asset/AssetSidebar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { User, Users, Search, Plus, Wrench, Clock, CheckCircle } from "lucide-react";
import clsx from "clsx";
import Drawer, { FormField, FormInput, FormTextarea, FormSelect, FormActions } from "@/components/shared/Drawer";

const MOCK_MAINTENANCE = [
    { id: "MNT-001", asset: "Generator 50KVA", type: "Scheduled", date: "2025-01-10", status: "Pending", cost: 2500000 },
    { id: "MNT-002", asset: "Excavator CAT 320", type: "Repair", date: "2025-01-08", status: "In Progress", cost: 15000000 },
    { id: "MNT-003", asset: "Truck Hino 500", type: "Service", date: "2025-01-05", status: "Completed", cost: 3500000 },
    { id: "MNT-004", asset: "Concrete Mixer", type: "Scheduled", date: "2025-01-03", status: "Completed", cost: 1200000 },
];

function formatShort(n: number) { return n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : `${n}`; }

function StatusBadge({ status }: { status: string }) {
    const config: Record<string, { color: string; icon: React.ReactNode }> = { Pending: { color: "bg-orange-50 text-orange-700", icon: <Clock className="w-3 h-3" /> }, "In Progress": { color: "bg-blue-50 text-blue-700", icon: <Wrench className="w-3 h-3" /> }, Completed: { color: "bg-green-50 text-green-700", icon: <CheckCircle className="w-3 h-3" /> } };
    const { color, icon } = config[status] || config.Pending;
    return <span className={clsx("inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium", color)}>{icon}{status}</span>;
}

export default function MaintenancePage() {
    const [viewMode, setViewMode] = useState<"personal" | "team">("team");
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    return (
        <div className="min-h-screen bg-neutral-50 p-6">
            <Breadcrumb items={[{ label: "Flow" }, { label: "Asset" }, { label: "Maintenance" }]} />
            <PageWrapper sidebar={<AssetSidebar />}>
                <div className="space-y-8 w-full animate-in fade-in duration-500">
                    <div className="space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div><h1 className="text-2xl font-bold text-neutral-900">Maintenance</h1><p className="text-sm text-neutral-500 mt-1">Track asset repairs and scheduled maintenance.</p></div>
                            <div className="flex items-center bg-neutral-100 rounded-full p-1">
                                <button onClick={() => setViewMode("personal")} className={clsx("flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium", viewMode === "personal" ? "bg-white shadow text-neutral-900" : "text-neutral-500")}><User className="w-4 h-4" /> Personal</button>
                                <button onClick={() => setViewMode("team")} className={clsx("flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium", viewMode === "team" ? "bg-white shadow text-neutral-900" : "text-neutral-500")}><Users className="w-4 h-4" /> Team</button>
                            </div>
                        </div>
                        <div className="border-b border-neutral-200" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white rounded-xl border p-5"><div className="flex items-center gap-2 text-orange-600 mb-2"><Clock className="w-5 h-5" /><span className="text-sm font-medium">Pending</span></div><div className="text-2xl font-bold">1</div></div>
                        <div className="bg-white rounded-xl border p-5"><div className="flex items-center gap-2 text-blue-600 mb-2"><Wrench className="w-5 h-5" /><span className="text-sm font-medium">In Progress</span></div><div className="text-2xl font-bold">1</div></div>
                        <div className="bg-white rounded-xl border p-5"><div className="flex items-center gap-2 text-green-600 mb-2"><CheckCircle className="w-5 h-5" /><span className="text-sm font-medium">Completed</span></div><div className="text-2xl font-bold">2</div></div>
                    </div>

                    <div className="flex justify-between gap-4">
                        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" /><input type="text" placeholder="Search..." className="pl-9 pr-4 py-2 border rounded-lg text-sm w-64" /></div>
                        <button onClick={() => setIsDrawerOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-red-600 rounded-lg text-sm font-medium text-white hover:bg-red-700"><Plus className="w-4 h-4" /> Log Maintenance</button>
                    </div>

                    <div className="bg-white rounded-xl border overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-neutral-50 border-b"><tr><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">ID</th><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Asset</th><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Type</th><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Date</th><th className="text-right px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Cost</th><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Status</th></tr></thead>
                            <tbody className="divide-y">{MOCK_MAINTENANCE.map((m) => (
                                <tr key={m.id} className="hover:bg-neutral-50/50"><td className="px-6 py-4 text-sm font-medium">{m.id}</td><td className="px-6 py-4 text-sm">{m.asset}</td><td className="px-6 py-4 text-sm text-neutral-500">{m.type}</td><td className="px-6 py-4 text-sm text-neutral-500">{m.date}</td><td className="px-6 py-4 text-sm font-medium text-right">{formatShort(m.cost)}</td><td className="px-6 py-4"><StatusBadge status={m.status} /></td></tr>
                            ))}</tbody>
                        </table>
                    </div>
                </div>
            </PageWrapper>

            <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} title="Log Maintenance" width="lg">
                <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); setIsDrawerOpen(false); }}>
                    <FormField label="Asset" required><FormSelect><option value="">Select asset...</option><option>Excavator CAT 320</option><option>Concrete Mixer</option><option>Generator 50KVA</option><option>Truck Hino 500</option></FormSelect></FormField>
                    <FormField label="Maintenance Type" required><FormSelect><option value="">Select type...</option><option>Scheduled</option><option>Repair</option><option>Service</option><option>Inspection</option><option>Emergency</option></FormSelect></FormField>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Start Date" required><FormInput type="date" /></FormField>
                        <FormField label="Expected End Date"><FormInput type="date" /></FormField>
                    </div>
                    <FormField label="Estimated Cost (IDR)"><FormInput type="number" placeholder="0" /></FormField>
                    <FormField label="Technician/Vendor"><FormInput placeholder="Name or company" /></FormField>
                    <FormField label="Description" required><FormTextarea placeholder="Describe the maintenance work..." /></FormField>
                    <FormField label="Priority"><FormSelect><option>Normal</option><option>Urgent</option><option>Low</option></FormSelect></FormField>
                    <FormActions onCancel={() => setIsDrawerOpen(false)} submitLabel="Log Maintenance" />
                </form>
            </Drawer>
        </div>
    );
}
