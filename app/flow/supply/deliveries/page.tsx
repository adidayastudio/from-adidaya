"use client";

import { useState } from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import SupplySidebar from "@/components/flow/supply/SupplySidebar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { User, Users, Search, Truck, CheckCircle, Clock } from "lucide-react";
import clsx from "clsx";

const MOCK_DELIVERIES = [
    { id: "DEL-001", po: "PO-2025-024", date: "2025-01-08", vendor: "PT Baja Steel", project: "Rumah Pak Budi", items: "Steel Rebar 12mm", status: "In Transit", driver: "Pak Ahmad" },
    { id: "DEL-002", po: "PO-2025-022", date: "2025-01-06", vendor: "PT Semen Jaya", project: "Renovasi Kantor", items: "Cement 50kg x 100", status: "Delivered", driver: "Pak Joko" },
    { id: "DEL-003", po: "PO-2025-020", date: "2025-01-05", vendor: "PT Baja Steel", project: "Villa Puncak", items: "Steel Beam H200", status: "Delivered", driver: "Pak Dedi" },
    { id: "DEL-004", po: "PO-2025-023", date: "2025-01-10", vendor: "CV Kayu Prima", project: "Villa Puncak", items: "Plywood 18mm", status: "Scheduled", driver: null },
];

function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = { Scheduled: "bg-neutral-100 text-neutral-600", "In Transit": "bg-blue-50 text-blue-700", Delivered: "bg-green-50 text-green-700" };
    return <span className={clsx("px-2 py-1 rounded-full text-xs font-medium", colors[status])}>{status}</span>;
}

export default function DeliveriesPage() {
    const [viewMode, setViewMode] = useState<"personal" | "team">("team");

    return (
        <div className="min-h-screen bg-neutral-50 p-6">
            <Breadcrumb items={[{ label: "Flow" }, { label: "Supply" }, { label: "Deliveries" }]} />
            <PageWrapper sidebar={<SupplySidebar />}>
                <div className="space-y-8 w-full animate-in fade-in duration-500">
                    <div className="space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h1 className="text-2xl font-bold text-neutral-900">Deliveries</h1>
                                <p className="text-sm text-neutral-500 mt-1">Track incoming deliveries from vendors.</p>
                            </div>
                            <div className="flex items-center bg-neutral-100 rounded-full p-1">
                                <button onClick={() => setViewMode("personal")} className={clsx("flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium", viewMode === "personal" ? "bg-white shadow text-neutral-900" : "text-neutral-500")}><User className="w-4 h-4" /> Personal</button>
                                <button onClick={() => setViewMode("team")} className={clsx("flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium", viewMode === "team" ? "bg-white shadow text-neutral-900" : "text-neutral-500")}><Users className="w-4 h-4" /> Team</button>
                            </div>
                        </div>
                        <div className="border-b border-neutral-200" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white rounded-xl border p-5"><div className="flex items-center gap-2 text-blue-600 mb-2"><Truck className="w-5 h-5" /><span className="text-sm font-medium">In Transit</span></div><div className="text-2xl font-bold text-neutral-900">1</div></div>
                        <div className="bg-white rounded-xl border p-5"><div className="flex items-center gap-2 text-neutral-600 mb-2"><Clock className="w-5 h-5" /><span className="text-sm font-medium">Scheduled</span></div><div className="text-2xl font-bold text-neutral-900">1</div></div>
                        <div className="bg-white rounded-xl border p-5"><div className="flex items-center gap-2 text-green-600 mb-2"><CheckCircle className="w-5 h-5" /><span className="text-sm font-medium">Delivered</span></div><div className="text-2xl font-bold text-neutral-900">2</div></div>
                    </div>
                    <div className="bg-white rounded-xl border overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-neutral-50 border-b"><tr><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">ID</th><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Date</th><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Vendor</th><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Project</th><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Status</th></tr></thead>
                            <tbody className="divide-y">{MOCK_DELIVERIES.map((d) => (<tr key={d.id} className="hover:bg-neutral-50/50"><td className="px-6 py-4 text-sm font-medium">{d.id}</td><td className="px-6 py-4 text-sm text-neutral-500">{d.date}</td><td className="px-6 py-4 text-sm">{d.vendor}</td><td className="px-6 py-4 text-sm text-neutral-600">{d.project}</td><td className="px-6 py-4"><StatusBadge status={d.status} /></td></tr>))}</tbody>
                        </table>
                    </div>
                </div>
            </PageWrapper>
        </div>
    );
}
