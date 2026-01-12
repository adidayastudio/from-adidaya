"use client";

import PageWrapper from "@/components/layout/PageWrapper";
import TrackSidebar from "@/components/flow/track/TrackSidebar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { BarChart3, Download, Calendar } from "lucide-react";

const MOCK_PROJECT_STATS = [
    { project: "Rumah Pak Budi", progress: 75, issues: 2, inspections: 5 },
    { project: "Villa Puncak", progress: 45, issues: 4, inspections: 3 },
    { project: "Renovasi Kantor", progress: 90, issues: 1, inspections: 8 },
    { project: "Gudang Cikarang", progress: 60, issues: 0, inspections: 2 },
];

export default function TrackReportsPage() {
    return (
        <div className="min-h-screen bg-neutral-50 p-6">
            <Breadcrumb items={[{ label: "Flow" }, { label: "Track" }, { label: "Reports" }]} />
            <PageWrapper sidebar={<TrackSidebar />}>
                <div className="space-y-8 w-full animate-in fade-in duration-500">
                    <div className="space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h1 className="text-2xl font-bold text-neutral-900">Reports</h1>
                                <p className="text-sm text-neutral-500 mt-1">Project tracking analytics and summaries.</p>
                            </div>
                            <div className="flex gap-2">
                                <button className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg text-sm font-medium hover:bg-neutral-50"><Calendar className="w-4 h-4" /> This Month</button>
                                <button className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg text-sm font-medium hover:bg-neutral-50"><Download className="w-4 h-4" /> Export</button>
                            </div>
                        </div>
                        <div className="border-b border-neutral-200" />
                    </div>

                    <div className="bg-white rounded-xl border p-6">
                        <div className="flex items-center gap-2 mb-4"><BarChart3 className="w-5 h-5 text-neutral-400" /><h3 className="font-semibold">Project Statistics</h3></div>
                        <table className="w-full">
                            <thead className="bg-neutral-50 border-b"><tr><th className="text-left px-4 py-2 text-xs font-semibold text-neutral-500 uppercase">Project</th><th className="text-right px-4 py-2 text-xs font-semibold text-neutral-500 uppercase">Progress</th><th className="text-right px-4 py-2 text-xs font-semibold text-neutral-500 uppercase">Issues</th><th className="text-right px-4 py-2 text-xs font-semibold text-neutral-500 uppercase">Inspections</th></tr></thead>
                            <tbody className="divide-y">{MOCK_PROJECT_STATS.map((p) => (
                                <tr key={p.project}><td className="px-4 py-3 text-sm font-medium">{p.project}</td><td className="px-4 py-3 text-sm text-right">{p.progress}%</td><td className="px-4 py-3 text-sm text-right">{p.issues}</td><td className="px-4 py-3 text-sm text-right">{p.inspections}</td></tr>
                            ))}</tbody>
                        </table>
                    </div>
                </div>
            </PageWrapper>
        </div>
    );
}
