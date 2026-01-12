"use client";

import { useState } from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import AssetSidebar from "@/components/flow/asset/AssetSidebar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { User, Users, Search, Plus, MapPin, ArrowRight } from "lucide-react";
import clsx from "clsx";
import Drawer, { FormField, FormInput, FormTextarea, FormSelect, FormActions } from "@/components/shared/Drawer";

const MOCK_ALLOCATIONS = [
    { asset: "Excavator CAT 320", from: "Gudang Utama", to: "Rumah Pak Budi", date: "2025-01-05", user: "Andi Pratama", status: "Active" },
    { asset: "Scaffolding Set A", from: "Villa Puncak", to: "Renovasi Kantor", date: "2025-01-04", user: "Budi Santoso", status: "Active" },
    { asset: "Generator 50KVA", from: "Gudang Utama", to: "Villa Puncak", date: "2025-01-03", user: "Siti Rahayu", status: "Active" },
    { asset: "Concrete Mixer", from: "Renovasi Kantor", to: "Gudang Utama", date: "2025-01-02", user: "Dewi Lestari", status: "Returned" },
];

function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = { Active: "bg-green-50 text-green-700", Returned: "bg-neutral-100 text-neutral-600" };
    return <span className={clsx("px-2 py-1 rounded-full text-xs font-medium", colors[status])}>{status}</span>;
}

export default function AllocationPage() {
    const [viewMode, setViewMode] = useState<"personal" | "team">("team");
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    return (
        <div className="min-h-screen bg-neutral-50 p-6">
            <Breadcrumb items={[{ label: "Flow" }, { label: "Asset" }, { label: "Allocation" }]} />
            <PageWrapper sidebar={<AssetSidebar />}>
                <div className="space-y-8 w-full animate-in fade-in duration-500">
                    <div className="space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div><h1 className="text-2xl font-bold text-neutral-900">Allocation</h1><p className="text-sm text-neutral-500 mt-1">Track asset assignments to projects and locations.</p></div>
                            <div className="flex items-center bg-neutral-100 rounded-full p-1">
                                <button onClick={() => setViewMode("personal")} className={clsx("flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium", viewMode === "personal" ? "bg-white shadow text-neutral-900" : "text-neutral-500")}><User className="w-4 h-4" /> Personal</button>
                                <button onClick={() => setViewMode("team")} className={clsx("flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium", viewMode === "team" ? "bg-white shadow text-neutral-900" : "text-neutral-500")}><Users className="w-4 h-4" /> Team</button>
                            </div>
                        </div>
                        <div className="border-b border-neutral-200" />
                    </div>

                    <div className="flex justify-between gap-4">
                        <div className="relative w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" /><input type="text" placeholder="Search allocations..." className="pl-9 pr-4 py-2 border rounded-lg text-sm w-full" /></div>
                        <button onClick={() => setIsDrawerOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-red-600 rounded-lg text-sm font-medium text-white hover:bg-red-700"><Plus className="w-4 h-4" /> Allocate Asset</button>
                    </div>

                    <div className="bg-white rounded-xl border overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-neutral-50 border-b"><tr><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Asset</th><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Movement</th><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Date</th><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">User</th><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Status</th></tr></thead>
                            <tbody className="divide-y">{MOCK_ALLOCATIONS.map((a, i) => (
                                <tr key={i} className="hover:bg-neutral-50/50"><td className="px-6 py-4 text-sm font-medium">{a.asset}</td><td className="px-6 py-4 text-sm"><div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-neutral-400" />{a.from}<ArrowRight className="w-4 h-4 text-neutral-300" />{a.to}</div></td><td className="px-6 py-4 text-sm text-neutral-500">{a.date}</td><td className="px-6 py-4 text-sm text-neutral-600">{a.user}</td><td className="px-6 py-4"><StatusBadge status={a.status} /></td></tr>
                            ))}</tbody>
                        </table>
                    </div>
                </div>
            </PageWrapper>

            <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} title="Allocate Asset" width="lg">
                <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); setIsDrawerOpen(false); }}>
                    <FormField label="Asset" required><FormSelect><option value="">Select asset...</option><option>Excavator CAT 320</option><option>Concrete Mixer</option><option>Generator 50KVA</option><option>Scaffolding Set A</option><option>Truck Hino 500</option></FormSelect></FormField>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="From Location"><FormInput placeholder="Current location" disabled /></FormField>
                        <FormField label="To Location" required><FormSelect><option value="">Select destination...</option><option>Gudang Utama</option><option>Rumah Pak Budi</option><option>Villa Puncak</option><option>Renovasi Kantor</option></FormSelect></FormField>
                    </div>
                    <FormField label="Project" required><FormSelect><option value="">Select project...</option><option>Rumah Pak Budi</option><option>Villa Puncak</option><option>Renovasi Kantor</option></FormSelect></FormField>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Start Date" required><FormInput type="date" /></FormField>
                        <FormField label="Expected Return Date"><FormInput type="date" /></FormField>
                    </div>
                    <FormField label="Assigned To"><FormSelect><option value="">Select user...</option><option>Andi Pratama</option><option>Siti Rahayu</option><option>Budi Santoso</option></FormSelect></FormField>
                    <FormField label="Notes"><FormTextarea placeholder="Additional notes..." /></FormField>
                    <FormActions onCancel={() => setIsDrawerOpen(false)} submitLabel="Allocate" />
                </form>
            </Drawer>
        </div>
    );
}
