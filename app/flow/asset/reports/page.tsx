"use client";

import PageWrapper from "@/components/layout/PageWrapper";
import AssetSidebar from "@/components/flow/asset/AssetSidebar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { BarChart3, Download, Calendar } from "lucide-react";

const MOCK_BY_CATEGORY = [
    { category: "Heavy Equipment", count: 8, value: 2100000000 },
    { category: "Vehicles", count: 12, value: 650000000 },
    { category: "Tools & Equipment", count: 85, value: 180000000 },
    { category: "IT Equipment", count: 45, value: 120000000 },
];

function formatShort(n: number) { return n >= 1000000000 ? `${(n / 1000000000).toFixed(1)}B` : n >= 1000000 ? `${(n / 1000000).toFixed(0)}M` : `${n}`; }

export default function AssetReportsPage() {
    return (
        <div className="min-h-screen bg-neutral-50 p-6">
            <Breadcrumb items={[{ label: "Flow" }, { label: "Asset" }, { label: "Reports" }]} />
            <PageWrapper sidebar={<AssetSidebar />}>
                <div className="space-y-8 w-full animate-in fade-in duration-500">
                    <div className="space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h1 className="text-2xl font-bold text-neutral-900">Reports</h1>
                                <p className="text-sm text-neutral-500 mt-1">Asset analytics and summaries.</p>
                            </div>
                            <div className="flex gap-2">
                                <button className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg text-sm font-medium hover:bg-neutral-50"><Calendar className="w-4 h-4" /> This Year</button>
                                <button className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg text-sm font-medium hover:bg-neutral-50"><Download className="w-4 h-4" /> Export</button>
                            </div>
                        </div>
                        <div className="border-b border-neutral-200" />
                    </div>

                    <div className="bg-white rounded-xl border p-6">
                        <div className="flex items-center gap-2 mb-4"><BarChart3 className="w-5 h-5 text-neutral-400" /><h3 className="font-semibold">Assets by Category</h3></div>
                        <table className="w-full">
                            <thead className="bg-neutral-50 border-b"><tr><th className="text-left px-4 py-2 text-xs font-semibold text-neutral-500 uppercase">Category</th><th className="text-right px-4 py-2 text-xs font-semibold text-neutral-500 uppercase">Count</th><th className="text-right px-4 py-2 text-xs font-semibold text-neutral-500 uppercase">Value</th></tr></thead>
                            <tbody className="divide-y">{MOCK_BY_CATEGORY.map((c) => (
                                <tr key={c.category}><td className="px-4 py-3 text-sm font-medium">{c.category}</td><td className="px-4 py-3 text-sm text-right">{c.count}</td><td className="px-4 py-3 text-sm font-medium text-right">{formatShort(c.value)}</td></tr>
                            ))}</tbody>
                        </table>
                    </div>
                </div>
            </PageWrapper>
        </div>
    );
}
