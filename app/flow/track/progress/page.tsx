"use client";

import { useState } from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import TrackSidebar from "@/components/flow/track/TrackSidebar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { User, Users, Search } from "lucide-react";
import clsx from "clsx";

const MOCK_PROGRESS = [
    { project: "Rumah Pak Budi", phase: "Structure", progress: 75, start: "2024-10-01", end: "2025-03-15", status: "On Track" },
    { project: "Villa Puncak", phase: "Foundation", progress: 45, start: "2024-11-15", end: "2025-04-30", status: "Delayed" },
    { project: "Renovasi Kantor", phase: "Finishing", progress: 90, start: "2024-08-01", end: "2025-01-31", status: "On Track" },
    { project: "Gudang Cikarang", phase: "MEP", progress: 60, start: "2024-12-01", end: "2025-05-15", status: "On Track" },
];

function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = { "On Track": "bg-green-50 text-green-700", Delayed: "bg-orange-50 text-orange-700" };
    return <span className={clsx("px-2 py-1 rounded-full text-xs font-medium", colors[status])}>{status}</span>;
}

export default function ProgressPage() {
    const [viewMode, setViewMode] = useState<"personal" | "team">("team");

    return (
        <div className="min-h-screen bg-neutral-50 p-6">
            <Breadcrumb items={[{ label: "Flow" }, { label: "Track" }, { label: "Progress" }]} />
            <PageWrapper sidebar={<TrackSidebar />}>
                <div className="space-y-8 w-full animate-in fade-in duration-500">
                    <div className="space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h1 className="text-2xl font-bold text-neutral-900">Progress</h1>
                                <p className="text-sm text-neutral-500 mt-1">Track project milestones and completion status.</p>
                            </div>
                            <div className="flex items-center bg-neutral-100 rounded-full p-1">
                                <button onClick={() => setViewMode("personal")} className={clsx("flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium", viewMode === "personal" ? "bg-white shadow text-neutral-900" : "text-neutral-500")}><User className="w-4 h-4" /> Personal</button>
                                <button onClick={() => setViewMode("team")} className={clsx("flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium", viewMode === "team" ? "bg-white shadow text-neutral-900" : "text-neutral-500")}><Users className="w-4 h-4" /> Team</button>
                            </div>
                        </div>
                        <div className="border-b border-neutral-200" />
                    </div>

                    <div className="relative w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" /><input type="text" placeholder="Search projects..." className="pl-9 pr-4 py-2 border rounded-lg text-sm w-full" /></div>

                    <div className="space-y-4">
                        {MOCK_PROGRESS.map((p) => (
                            <div key={p.project} className="bg-white rounded-xl border p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <div><div className="font-semibold text-neutral-900">{p.project}</div><div className="text-sm text-neutral-500">{p.phase} · {p.start} to {p.end}</div></div>
                                    <StatusBadge status={p.status} />
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex-1 h-3 bg-neutral-100 rounded-full overflow-hidden"><div className="h-full bg-red-500 rounded-full" style={{ width: `${p.progress}%` }} /></div>
                                    <span className="font-semibold text-neutral-900 w-12 text-right">{p.progress}%</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </PageWrapper>
        </div>
    );
}
