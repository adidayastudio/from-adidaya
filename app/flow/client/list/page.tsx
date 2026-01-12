"use client";

import { useState } from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import ClientSidebar from "@/components/flow/client/ClientSidebar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { User, Users, Search, Plus, Eye } from "lucide-react";
import clsx from "clsx";
import Drawer, { FormField, FormInput, FormTextarea, FormSelect, FormActions } from "@/components/shared/Drawer";

const MOCK_CLIENTS = [
    { id: 1, name: "PT Maju Bersama", contact: "Pak Hendra", phone: "021-555-1234", email: "hendra@majubersama.co.id", projects: 3, value: 450000000, status: "Active" },
    { id: 2, name: "Bapak Sutanto", contact: "Bapak Sutanto", phone: "081234567890", email: "sutanto@gmail.com", projects: 1, value: 180000000, status: "Active" },
    { id: 3, name: "CV Sinar Jaya", contact: "Ibu Maya", phone: "021-555-5678", email: "maya@sinarjaya.com", projects: 2, value: 320000000, status: "Active" },
];

function formatShort(n: number) { return n >= 1000000 ? `${(n / 1000000).toFixed(0)}M` : `${n}`; }

function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = { Active: "bg-green-50 text-green-700", Inactive: "bg-neutral-100 text-neutral-600" };
    return <span className={clsx("px-2 py-1 rounded-full text-xs font-medium", colors[status])}>{status}</span>;
}

export default function ClientListPage() {
    const [viewMode, setViewMode] = useState<"personal" | "team">("team");
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState<typeof MOCK_CLIENTS[0] | null>(null);

    return (
        <div className="min-h-screen bg-neutral-50 p-6">
            <Breadcrumb items={[{ label: "Flow" }, { label: "Client" }, { label: "Clients" }]} />
            <PageWrapper sidebar={<ClientSidebar />}>
                <div className="space-y-8 w-full animate-in fade-in duration-500">
                    <div className="space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div><h1 className="text-2xl font-bold text-neutral-900">Clients</h1><p className="text-sm text-neutral-500 mt-1">Manage client directory and contacts.</p></div>
                            <div className="flex items-center bg-neutral-100 rounded-full p-1">
                                <button onClick={() => setViewMode("personal")} className={clsx("flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium", viewMode === "personal" ? "bg-white shadow text-neutral-900" : "text-neutral-500")}><User className="w-4 h-4" /> Personal</button>
                                <button onClick={() => setViewMode("team")} className={clsx("flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium", viewMode === "team" ? "bg-white shadow text-neutral-900" : "text-neutral-500")}><Users className="w-4 h-4" /> Team</button>
                            </div>
                        </div>
                        <div className="border-b border-neutral-200" />
                    </div>

                    <div className="flex justify-between gap-4">
                        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" /><input type="text" placeholder="Search clients..." className="pl-9 pr-4 py-2 border rounded-lg text-sm w-64" /></div>
                        <button onClick={() => setIsDrawerOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-red-600 rounded-lg text-sm font-medium text-white hover:bg-red-700"><Plus className="w-4 h-4" /> Add Client</button>
                    </div>

                    <div className="bg-white rounded-xl border overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-neutral-50 border-b"><tr><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Name</th><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Contact</th><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Phone</th><th className="text-center px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Projects</th><th className="text-right px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Value</th><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Status</th><th className="px-6 py-3"></th></tr></thead>
                            <tbody className="divide-y">{MOCK_CLIENTS.map((c) => (
                                <tr key={c.id} className="hover:bg-neutral-50/50"><td className="px-6 py-4 text-sm font-medium">{c.name}</td><td className="px-6 py-4 text-sm text-neutral-600">{c.contact}</td><td className="px-6 py-4 text-sm text-neutral-500">{c.phone}</td><td className="px-6 py-4 text-sm text-center">{c.projects}</td><td className="px-6 py-4 text-sm font-medium text-right">{formatShort(c.value)}</td><td className="px-6 py-4"><StatusBadge status={c.status} /></td><td className="px-6 py-4"><button onClick={() => { setSelectedClient(c); setIsViewOpen(true); }} className="p-2 hover:bg-neutral-100 rounded"><Eye className="w-4 h-4 text-neutral-500" /></button></td></tr>
                            ))}</tbody>
                        </table>
                    </div>
                </div>
            </PageWrapper>

            <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} title="Add Client" width="lg">
                <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); setIsDrawerOpen(false); }}>
                    <FormField label="Client Type" required><FormSelect><option>Company</option><option>Individual</option></FormSelect></FormField>
                    <FormField label="Company/Client Name" required><FormInput placeholder="e.g. PT Maju Bersama" /></FormField>
                    <FormField label="Contact Person" required><FormInput placeholder="Primary contact name" /></FormField>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Phone" required><FormInput type="tel" placeholder="021-xxx-xxxx" /></FormField>
                        <FormField label="Email"><FormInput type="email" placeholder="email@company.com" /></FormField>
                    </div>
                    <FormField label="Address"><FormTextarea placeholder="Full address..." /></FormField>
                    <FormField label="Tax ID (NPWP)"><FormInput placeholder="XX.XXX.XXX.X-XXX.XXX" /></FormField>
                    <FormField label="Source"><FormSelect><option value="">Select source...</option><option>Referral</option><option>Website</option><option>Social Media</option><option>Exhibition</option><option>Other</option></FormSelect></FormField>
                    <FormField label="Notes"><FormTextarea placeholder="Additional information..." /></FormField>
                    <FormActions onCancel={() => setIsDrawerOpen(false)} submitLabel="Add Client" />
                </form>
            </Drawer>

            <Drawer isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title="Client Details" width="lg">
                {selectedClient && (
                    <div className="space-y-6">
                        <div><h3 className="text-xl font-semibold">{selectedClient.name}</h3><p className="text-neutral-500">{selectedClient.status === "Active" ? "Active Client" : "Inactive"}</p></div>
                        <div className="grid grid-cols-2 gap-4 p-4 bg-neutral-50 rounded-xl">
                            <div><div className="text-sm text-neutral-500">Projects</div><div className="font-semibold">{selectedClient.projects}</div></div>
                            <div><div className="text-sm text-neutral-500">Total Value</div><div className="font-semibold">{formatShort(selectedClient.value)}</div></div>
                        </div>
                        <div className="space-y-3"><h4 className="font-medium text-neutral-900">Contact Information</h4>
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-3"><span className="text-neutral-500 w-16">Contact</span><span className="font-medium">{selectedClient.contact}</span></div>
                                <div className="flex items-center gap-3"><span className="text-neutral-500 w-16">Phone</span><span>{selectedClient.phone}</span></div>
                                <div className="flex items-center gap-3"><span className="text-neutral-500 w-16">Email</span><span>{selectedClient.email}</span></div>
                            </div>
                        </div>
                        <div className="flex gap-3 pt-4 border-t">
                            <button className="flex-1 px-4 py-2.5 border rounded-lg text-sm font-medium hover:bg-neutral-50">Edit Client</button>
                            <button className="flex-1 px-4 py-2.5 bg-red-600 rounded-lg text-sm font-medium text-white hover:bg-red-700">New Project</button>
                        </div>
                    </div>
                )}
            </Drawer>
        </div>
    );
}
