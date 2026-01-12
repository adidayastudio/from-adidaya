"use client";

import { useState } from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import AssetSidebar from "@/components/flow/asset/AssetSidebar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { User, Users, Search, Plus, Eye } from "lucide-react";
import clsx from "clsx";
import Drawer, { FormField, FormInput, FormTextarea, FormSelect, FormActions } from "@/components/shared/Drawer";

const MOCK_ASSETS = [
    { id: "AST-001", name: "Excavator CAT 320", category: "Heavy Equipment", location: "Rumah Pak Budi", value: 850000000, status: "In Use" },
    { id: "AST-002", name: "Concrete Mixer", category: "Equipment", location: "Gudang Utama", value: 45000000, status: "Available" },
    { id: "AST-003", name: "Generator 50KVA", category: "Equipment", location: "Villa Puncak", value: 75000000, status: "Maintenance" },
    { id: "AST-004", name: "Scaffolding Set A", category: "Tools", location: "Renovasi Kantor", value: 25000000, status: "In Use" },
    { id: "AST-005", name: "Truck Hino 500", category: "Vehicle", location: "Gudang Utama", value: 450000000, status: "Available" },
];

function formatShort(n: number) { return n >= 1000000000 ? `${(n / 1000000000).toFixed(1)}B` : n >= 1000000 ? `${(n / 1000000).toFixed(0)}M` : `${n}`; }

function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = { "In Use": "bg-blue-50 text-blue-700", Available: "bg-green-50 text-green-700", Maintenance: "bg-orange-50 text-orange-700" };
    return <span className={clsx("px-2 py-1 rounded-full text-xs font-medium", colors[status])}>{status}</span>;
}

export default function AssetListPage() {
    const [viewMode, setViewMode] = useState<"personal" | "team">("team");
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState<typeof MOCK_ASSETS[0] | null>(null);

    return (
        <div className="min-h-screen bg-neutral-50 p-6">
            <Breadcrumb items={[{ label: "Flow" }, { label: "Asset" }, { label: "Asset List" }]} />
            <PageWrapper sidebar={<AssetSidebar />}>
                <div className="space-y-8 w-full animate-in fade-in duration-500">
                    <div className="space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div><h1 className="text-2xl font-bold text-neutral-900">Asset List</h1><p className="text-sm text-neutral-500 mt-1">Complete inventory of company assets.</p></div>
                            <div className="flex items-center bg-neutral-100 rounded-full p-1">
                                <button onClick={() => setViewMode("personal")} className={clsx("flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium", viewMode === "personal" ? "bg-white shadow text-neutral-900" : "text-neutral-500")}><User className="w-4 h-4" /> Personal</button>
                                <button onClick={() => setViewMode("team")} className={clsx("flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium", viewMode === "team" ? "bg-white shadow text-neutral-900" : "text-neutral-500")}><Users className="w-4 h-4" /> Team</button>
                            </div>
                        </div>
                        <div className="border-b border-neutral-200" />
                    </div>

                    <div className="flex justify-between gap-4">
                        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" /><input type="text" placeholder="Search assets..." className="pl-9 pr-4 py-2 border rounded-lg text-sm w-64" /></div>
                        <button onClick={() => setIsDrawerOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-red-600 rounded-lg text-sm font-medium text-white hover:bg-red-700"><Plus className="w-4 h-4" /> Add Asset</button>
                    </div>

                    <div className="bg-white rounded-xl border overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-neutral-50 border-b"><tr><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Asset ID</th><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Name</th><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Category</th><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Location</th><th className="text-right px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Value</th><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Status</th><th className="px-6 py-3"></th></tr></thead>
                            <tbody className="divide-y">{MOCK_ASSETS.map((a) => (
                                <tr key={a.id} className="hover:bg-neutral-50/50">
                                    <td className="px-6 py-4 text-sm font-medium">{a.id}</td><td className="px-6 py-4 text-sm">{a.name}</td><td className="px-6 py-4 text-sm text-neutral-500">{a.category}</td><td className="px-6 py-4 text-sm text-neutral-500">{a.location}</td><td className="px-6 py-4 text-sm font-medium text-right">{formatShort(a.value)}</td><td className="px-6 py-4"><StatusBadge status={a.status} /></td>
                                    <td className="px-6 py-4"><button onClick={() => { setSelectedAsset(a); setIsViewOpen(true); }} className="p-2 hover:bg-neutral-100 rounded"><Eye className="w-4 h-4 text-neutral-500" /></button></td>
                                </tr>
                            ))}</tbody>
                        </table>
                    </div>
                </div>
            </PageWrapper>

            <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} title="Add Asset" width="lg">
                <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); setIsDrawerOpen(false); }}>
                    <FormField label="Asset Name" required><FormInput placeholder="e.g. Excavator CAT 320" /></FormField>
                    <FormField label="Asset ID"><FormInput placeholder="Auto-generated if blank" /></FormField>
                    <FormField label="Category" required><FormSelect><option value="">Select category...</option><option>Heavy Equipment</option><option>Equipment</option><option>Vehicle</option><option>Tools</option><option>IT Equipment</option></FormSelect></FormField>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Purchase Value (IDR)" required><FormInput type="number" placeholder="0" /></FormField>
                        <FormField label="Purchase Date"><FormInput type="date" /></FormField>
                    </div>
                    <FormField label="Serial Number"><FormInput placeholder="Serial/model number" /></FormField>
                    <FormField label="Location" required><FormSelect><option value="">Select location...</option><option>Gudang Utama</option><option>Rumah Pak Budi</option><option>Villa Puncak</option><option>Renovasi Kantor</option></FormSelect></FormField>
                    <FormField label="Condition"><FormSelect><option>Excellent</option><option>Good</option><option>Fair</option><option>Poor</option></FormSelect></FormField>
                    <FormField label="Description"><FormTextarea placeholder="Additional details..." /></FormField>
                    <FormActions onCancel={() => setIsDrawerOpen(false)} submitLabel="Add Asset" />
                </form>
            </Drawer>

            <Drawer isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title="Asset Details" width="lg">
                {selectedAsset && (
                    <div className="space-y-6">
                        <div><h3 className="text-xl font-semibold">{selectedAsset.name}</h3><p className="text-neutral-500">{selectedAsset.id}</p></div>
                        <div className="grid grid-cols-2 gap-4 p-4 bg-neutral-50 rounded-xl">
                            <div><div className="text-sm text-neutral-500">Category</div><div className="font-semibold">{selectedAsset.category}</div></div>
                            <div><div className="text-sm text-neutral-500">Value</div><div className="font-semibold">{formatShort(selectedAsset.value)}</div></div>
                            <div><div className="text-sm text-neutral-500">Location</div><div className="font-semibold">{selectedAsset.location}</div></div>
                            <div><div className="text-sm text-neutral-500">Status</div><StatusBadge status={selectedAsset.status} /></div>
                        </div>
                        <div className="flex gap-3 pt-4 border-t">
                            <button className="flex-1 px-4 py-2.5 border rounded-lg text-sm font-medium hover:bg-neutral-50">Edit Asset</button>
                            <button className="flex-1 px-4 py-2.5 bg-red-600 rounded-lg text-sm font-medium text-white hover:bg-red-700">Allocate</button>
                        </div>
                    </div>
                )}
            </Drawer>
        </div>
    );
}
