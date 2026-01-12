"use client";

import { useState } from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import TrackSidebar from "@/components/flow/track/TrackSidebar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { User, Users, Search, Plus, ClipboardCheck, CheckCircle, Clock } from "lucide-react";
import clsx from "clsx";
import Drawer, { FormField, FormInput, FormTextarea, FormSelect, FormActions } from "@/components/shared/Drawer";

const MOCK_INSPECTIONS = [
    { id: "INS-001", project: "Rumah Pak Budi", type: "Foundation", date: "2025-01-10", inspector: "Andi Pratama", status: "Scheduled" },
    { id: "INS-002", project: "Villa Puncak", type: "Structure", date: "2025-01-08", inspector: "Budi Santoso", status: "In Progress" },
    { id: "INS-003", project: "Renovasi Kantor", type: "MEP", date: "2025-01-05", inspector: "Siti Rahayu", status: "Passed" },
];

function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = { Scheduled: "bg-neutral-100 text-neutral-600", "In Progress": "bg-blue-50 text-blue-700", Passed: "bg-green-50 text-green-700", Failed: "bg-red-50 text-red-700" };
    return <span className={clsx("px-2 py-1 rounded-full text-xs font-medium", colors[status])}>{status}</span>;
}

export default function InspectionsPage() {
    const [viewMode, setViewMode] = useState<"personal" | "team">("team");
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    return (
        <div className="min-h-screen bg-neutral-50 p-6">
            <Breadcrumb items={[{ label: "Flow" }, { label: "Track" }, { label: "Inspections" }]} />
            <PageWrapper sidebar={<TrackSidebar />}>
                <div className="space-y-8 w-full animate-in fade-in duration-500">
                    <div className="space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div><h1 className="text-2xl font-bold text-neutral-900">Inspections</h1><p className="text-sm text-neutral-500 mt-1">Schedule and track quality inspections.</p></div>
                            <div className="flex items-center bg-neutral-100 rounded-full p-1">
                                <button onClick={() => setViewMode("personal")} className={clsx("flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium", viewMode === "personal" ? "bg-white shadow text-neutral-900" : "text-neutral-500")}><User className="w-4 h-4" /> Personal</button>
                                <button onClick={() => setViewMode("team")} className={clsx("flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium", viewMode === "team" ? "bg-white shadow text-neutral-900" : "text-neutral-500")}><Users className="w-4 h-4" /> Team</button>
                            </div>
                        </div>
                        <div className="border-b border-neutral-200" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white rounded-xl border p-5"><div className="flex items-center gap-2 text-neutral-600 mb-2"><Clock className="w-5 h-5" /><span className="text-sm font-medium">Scheduled</span></div><div className="text-2xl font-bold">1</div></div>
                        <div className="bg-white rounded-xl border p-5"><div className="flex items-center gap-2 text-blue-600 mb-2"><ClipboardCheck className="w-5 h-5" /><span className="text-sm font-medium">In Progress</span></div><div className="text-2xl font-bold">1</div></div>
                        <div className="bg-white rounded-xl border p-5"><div className="flex items-center gap-2 text-green-600 mb-2"><CheckCircle className="w-5 h-5" /><span className="text-sm font-medium">Completed</span></div><div className="text-2xl font-bold">1</div></div>
                    </div>

                    <div className="flex justify-between gap-4">
                        <div className="relative w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" /><input type="text" placeholder="Search inspections..." className="pl-9 pr-4 py-2 border rounded-lg text-sm w-full" /></div>
                        <button onClick={() => setIsDrawerOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-red-600 rounded-lg text-sm font-medium text-white hover:bg-red-700"><Plus className="w-4 h-4" /> Schedule</button>
                    </div>

                    <div className="bg-white rounded-xl border overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-neutral-50 border-b"><tr><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">ID</th><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Project</th><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Type</th><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Date</th><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Inspector</th><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Status</th></tr></thead>
                            <tbody className="divide-y">{MOCK_INSPECTIONS.map((i) => (<tr key={i.id} className="hover:bg-neutral-50/50"><td className="px-6 py-4 text-sm font-medium">{i.id}</td><td className="px-6 py-4 text-sm">{i.project}</td><td className="px-6 py-4 text-sm text-neutral-500">{i.type}</td><td className="px-6 py-4 text-sm text-neutral-500">{i.date}</td><td className="px-6 py-4 text-sm text-neutral-500">{i.inspector}</td><td className="px-6 py-4"><StatusBadge status={i.status} /></td></tr>))}</tbody>
                        </table>
                    </div>
                </div>
            </PageWrapper>

            <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} title="Schedule Inspection" width="lg">
                <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); setIsDrawerOpen(false); }}>
                    <FormField label="Project" required><FormSelect><option value="">Select project...</option><option>Rumah Pak Budi</option><option>Villa Puncak</option><option>Renovasi Kantor</option></FormSelect></FormField>
                    <FormField label="Inspection Type" required><FormSelect><option value="">Select type...</option><option>Foundation</option><option>Structure</option><option>MEP</option><option>Finishing</option><option>Safety</option><option>Final</option></FormSelect></FormField>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Inspection Date" required><FormInput type="date" /></FormField>
                        <FormField label="Time"><FormInput type="time" /></FormField>
                    </div>
                    <FormField label="Inspector" required><FormSelect><option value="">Select inspector...</option><option>Andi Pratama</option><option>Siti Rahayu</option><option>Budi Santoso</option></FormSelect></FormField>
                    <FormField label="Location/Area"><FormInput placeholder="Specific area to inspect" /></FormField>
                    <FormField label="Checklist Items"><FormTextarea placeholder="Items to check during inspection..." /></FormField>
                    <FormField label="Notes"><FormTextarea placeholder="Additional notes..." /></FormField>
                    <FormActions onCancel={() => setIsDrawerOpen(false)} submitLabel="Schedule" />
                </form>
            </Drawer>
        </div>
    );
}
