"use client";

import { useState } from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import ClientSidebar from "@/components/flow/client/ClientSidebar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { User, Users, Search, Plus, MessageSquare, Phone, Mail, Calendar } from "lucide-react";
import clsx from "clsx";
import Drawer, { FormField, FormInput, FormTextarea, FormSelect, FormActions } from "@/components/shared/Drawer";

const MOCK_COMMS = [
    { id: 1, client: "PT Maju Bersama", type: "Meeting", subject: "Project kickoff discussion", date: "2025-01-06", user: "Andi Pratama" },
    { id: 2, client: "Bapak Sutanto", type: "Call", subject: "Design revision feedback", date: "2025-01-05", user: "Siti Rahayu" },
    { id: 3, client: "CV Sinar Jaya", type: "Email", subject: "Contract renewal discussion", date: "2025-01-04", user: "Budi Santoso" },
];

function TypeIcon({ type }: { type: string }) {
    const icons: Record<string, React.ReactNode> = { Meeting: <Calendar className="w-4 h-4" />, Call: <Phone className="w-4 h-4" />, Email: <Mail className="w-4 h-4" /> };
    return <span className="text-neutral-400">{icons[type]}</span>;
}

export default function CommunicationsPage() {
    const [viewMode, setViewMode] = useState<"personal" | "team">("team");
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    return (
        <div className="min-h-screen bg-neutral-50 p-6">
            <Breadcrumb items={[{ label: "Flow" }, { label: "Client" }, { label: "Communications" }]} />
            <PageWrapper sidebar={<ClientSidebar />}>
                <div className="space-y-8 w-full animate-in fade-in duration-500">
                    <div className="space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div><h1 className="text-2xl font-bold text-neutral-900">Communications</h1><p className="text-sm text-neutral-500 mt-1">Track client interactions and follow-ups.</p></div>
                            <div className="flex items-center bg-neutral-100 rounded-full p-1">
                                <button onClick={() => setViewMode("personal")} className={clsx("flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium", viewMode === "personal" ? "bg-white shadow text-neutral-900" : "text-neutral-500")}><User className="w-4 h-4" /> Personal</button>
                                <button onClick={() => setViewMode("team")} className={clsx("flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium", viewMode === "team" ? "bg-white shadow text-neutral-900" : "text-neutral-500")}><Users className="w-4 h-4" /> Team</button>
                            </div>
                        </div>
                        <div className="border-b border-neutral-200" />
                    </div>

                    <div className="flex justify-between gap-4">
                        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" /><input type="text" placeholder="Search communications..." className="pl-9 pr-4 py-2 border rounded-lg text-sm w-64" /></div>
                        <button onClick={() => setIsDrawerOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-red-600 rounded-lg text-sm font-medium text-white hover:bg-red-700"><Plus className="w-4 h-4" /> Log Communication</button>
                    </div>

                    <div className="bg-white rounded-xl border overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-neutral-50 border-b"><tr><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Type</th><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Client</th><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Subject</th><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Date</th><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Logged By</th></tr></thead>
                            <tbody className="divide-y">{MOCK_COMMS.map((c) => (
                                <tr key={c.id} className="hover:bg-neutral-50/50"><td className="px-6 py-4"><div className="flex items-center gap-2"><TypeIcon type={c.type} /><span className="text-sm">{c.type}</span></div></td><td className="px-6 py-4 text-sm font-medium">{c.client}</td><td className="px-6 py-4 text-sm text-neutral-600">{c.subject}</td><td className="px-6 py-4 text-sm text-neutral-500">{c.date}</td><td className="px-6 py-4 text-sm text-neutral-500">{c.user}</td></tr>
                            ))}</tbody>
                        </table>
                    </div>
                </div>
            </PageWrapper>

            <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} title="Log Communication" width="lg">
                <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); setIsDrawerOpen(false); }}>
                    <FormField label="Client" required><FormSelect><option value="">Select client...</option><option>PT Maju Bersama</option><option>Bapak Sutanto</option><option>CV Sinar Jaya</option></FormSelect></FormField>
                    <FormField label="Communication Type" required><FormSelect><option value="">Select type...</option><option>Meeting</option><option>Call</option><option>Email</option><option>Site Visit</option><option>WhatsApp</option></FormSelect></FormField>
                    <FormField label="Subject" required><FormInput placeholder="Brief subject of communication" /></FormField>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Date" required><FormInput type="date" /></FormField>
                        <FormField label="Time"><FormInput type="time" /></FormField>
                    </div>
                    <FormField label="Participants"><FormInput placeholder="Names of participants" /></FormField>
                    <FormField label="Summary" required><FormTextarea rows={4} placeholder="Key points discussed..." /></FormField>
                    <FormField label="Follow-up Required"><FormSelect><option>No</option><option>Yes</option></FormSelect></FormField>
                    <FormField label="Follow-up Date"><FormInput type="date" /></FormField>
                    <FormField label="Attachments"><FormInput type="file" multiple /></FormField>
                    <FormActions onCancel={() => setIsDrawerOpen(false)} submitLabel="Log Communication" />
                </form>
            </Drawer>
        </div>
    );
}
