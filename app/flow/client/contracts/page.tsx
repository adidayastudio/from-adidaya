"use client";

import { useState, useEffect } from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import ClientSidebar from "@/components/flow/client/ClientSidebar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { User, Users, Search, Plus, Eye, Download } from "lucide-react";
import clsx from "clsx";
import Drawer, { FormField, FormInput, FormTextarea, FormSelect, FormActions } from "@/components/shared/Drawer";

const MOCK_CONTRACTS = [
    { id: "CTR-001", client: "PT Maju Bersama", project: "Rumah Pak Budi", value: 450000000, start: "2024-10-01", end: "2025-03-31", status: "Active" },
    { id: "CTR-002", client: "CV Sinar Jaya", project: "Renovasi Kantor", value: 320000000, start: "2024-08-01", end: "2025-01-31", status: "Active" },
    { id: "CTR-003", client: "Bapak Sutanto", project: "Villa Puncak", value: 180000000, start: "2024-11-15", end: "2025-04-30", status: "Active" },
];

function formatShort(n: number) { return n >= 1000000 ? `${(n / 1000000).toFixed(0)}M` : `${n}`; }

function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = { Active: "bg-green-50 text-green-700", Draft: "bg-neutral-100 text-neutral-600", Expired: "bg-red-50 text-red-700" };
    return <span className={clsx("px-2 py-1 rounded-full text-xs font-medium", colors[status])}>{status}</span>;
}

export default function ContractsPage() {
    const [viewMode, setViewMode] = useState<"personal" | "team">("team");
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    // FAB Action Listener
    useEffect(() => {
        const handleFabAction = (e: any) => {
            if (e.detail?.id === 'CLIENT_NEW') {
                setIsDrawerOpen(true);
            }
        };
        window.addEventListener('fab-action', handleFabAction);
        return () => window.removeEventListener('fab-action', handleFabAction);
    }, []);

    return (
        <div className="min-h-screen bg-neutral-50 p-6">
            <Breadcrumb items={[{ label: "Flow" }, { label: "Client" }, { label: "Contracts" }]} />
            <PageWrapper sidebar={<ClientSidebar />}>
                <div className="space-y-8 w-full animate-in fade-in duration-500">
                    <div className="space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div><h1 className="text-2xl font-bold text-neutral-900">Contracts</h1><p className="text-sm text-neutral-500 mt-1">Manage client contracts and agreements.</p></div>
                            <div className="flex items-center bg-neutral-100 rounded-full p-1">
                                <button onClick={() => setViewMode("personal")} className={clsx("flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium", viewMode === "personal" ? "bg-white shadow text-neutral-900" : "text-neutral-500")}><User className="w-4 h-4" /> Personal</button>
                                <button onClick={() => setViewMode("team")} className={clsx("flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium", viewMode === "team" ? "bg-white shadow text-neutral-900" : "text-neutral-500")}><Users className="w-4 h-4" /> Team</button>
                            </div>
                        </div>
                        <div className="border-b border-neutral-200" />
                    </div>

                    <div className="flex justify-between gap-4">
                        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" /><input type="text" placeholder="Search contracts..." className="pl-9 pr-4 py-2 border rounded-lg text-sm w-64" /></div>
                        <button onClick={() => setIsDrawerOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-red-600 rounded-lg text-sm font-medium text-white hover:bg-red-700"><Plus className="w-4 h-4" /> New Contract</button>
                    </div>

                    <div className="bg-white rounded-xl border overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-neutral-50 border-b"><tr><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Contract #</th><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Client</th><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Project</th><th className="text-right px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Value</th><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Period</th><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Status</th><th className="px-6 py-3"></th></tr></thead>
                            <tbody className="divide-y">{MOCK_CONTRACTS.map((c) => (
                                <tr key={c.id} className="hover:bg-neutral-50/50"><td className="px-6 py-4 text-sm font-medium">{c.id}</td><td className="px-6 py-4 text-sm">{c.client}</td><td className="px-6 py-4 text-sm text-neutral-600">{c.project}</td><td className="px-6 py-4 text-sm font-medium text-right">{formatShort(c.value)}</td><td className="px-6 py-4 text-sm text-neutral-500">{c.start} to {c.end}</td><td className="px-6 py-4"><StatusBadge status={c.status} /></td><td className="px-6 py-4"><div className="flex gap-1"><button className="p-2 hover:bg-neutral-100 rounded"><Eye className="w-4 h-4 text-neutral-500" /></button><button className="p-2 hover:bg-neutral-100 rounded"><Download className="w-4 h-4 text-neutral-500" /></button></div></td></tr>
                            ))}</tbody>
                        </table>
                    </div>
                </div>
            </PageWrapper>

            <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} title="New Contract" width="lg">
                <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); setIsDrawerOpen(false); }}>
                    <FormField label="Client" required><FormSelect><option value="">Select client...</option><option>PT Maju Bersama</option><option>Bapak Sutanto</option><option>CV Sinar Jaya</option></FormSelect></FormField>
                    <FormField label="Project" required><FormSelect><option value="">Select project...</option><option>Rumah Pak Budi</option><option>Villa Puncak</option><option>Renovasi Kantor</option></FormSelect></FormField>
                    <FormField label="Contract Number"><FormInput placeholder="Auto-generated if blank" /></FormField>
                    <FormField label="Contract Value (IDR)" required><FormInput type="number" placeholder="0" /></FormField>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Start Date" required><FormInput type="date" /></FormField>
                        <FormField label="End Date" required><FormInput type="date" /></FormField>
                    </div>
                    <FormField label="Payment Terms"><FormSelect><option>30 days</option><option>14 days</option><option>7 days</option><option>Due on receipt</option></FormSelect></FormField>
                    <FormField label="Payment Schedule"><FormTextarea placeholder="e.g. 30% down payment, 40% on structure, 30% on completion" /></FormField>
                    <FormField label="Contract Document"><FormInput type="file" accept=".pdf,.doc,.docx" /></FormField>
                    <FormField label="Notes"><FormTextarea placeholder="Additional terms..." /></FormField>
                    <FormActions onCancel={() => setIsDrawerOpen(false)} submitLabel="Create Contract" />
                </form>
            </Drawer>
        </div>
    );
}
