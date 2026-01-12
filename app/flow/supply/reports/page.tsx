"use client";

import PageWrapper from "@/components/layout/PageWrapper";
import SupplySidebar from "@/components/flow/supply/SupplySidebar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { BarChart3, Download, Calendar } from "lucide-react";

const MOCK_DATA = [
    { vendor: "PT Baja Steel", orders: 12, value: 125000000 },
    { vendor: "CV Kayu Prima", orders: 8, value: 65000000 },
    { vendor: "PT Semen Jaya", orders: 6, value: 45000000 },
];

function formatShort(n: number) { return n >= 1000000 ? `${(n / 1000000).toFixed(0)}M` : `${n}`; }

export default function SupplyReportsPage() {
    return (
        <div className="min-h-screen bg-neutral-50 p-6">
            <Breadcrumb items={[{ label: "Flow" }, { label: "Supply" }, { label: "Reports" }]} />
            <PageWrapper sidebar={<SupplySidebar />}>
                <div className="space-y-8 w-full animate-in fade-in duration-500">
                    <div className="space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h1 className="text-2xl font-bold text-neutral-900">Reports</h1>
                                <p className="text-sm text-neutral-500 mt-1">Supply chain analytics and summaries.</p>
                            </div>
                            <div className="flex gap-2">
                                <button className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg text-sm font-medium hover:bg-neutral-50"><Calendar className="w-4 h-4" /> This Month</button>
                                <button className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg text-sm font-medium hover:bg-neutral-50"><Download className="w-4 h-4" /> Export</button>
                            </div>
                        </div>
                        <div className="border-b border-neutral-200" />
                    </div>
                    <div className="bg-white rounded-xl border p-6">
                        <div className="flex items-center gap-2 mb-4"><BarChart3 className="w-5 h-5 text-neutral-400" /><h3 className="font-semibold">Top Vendors</h3></div>
                        <table className="w-full">
                            <thead className="bg-neutral-50 border-b"><tr><th className="text-left px-4 py-2 text-xs font-semibold text-neutral-500 uppercase">Vendor</th><th className="text-right px-4 py-2 text-xs font-semibold text-neutral-500 uppercase">Orders</th><th className="text-right px-4 py-2 text-xs font-semibold text-neutral-500 uppercase">Value</th></tr></thead>
                            <tbody className="divide-y">{MOCK_DATA.map((v) => (<tr key={v.vendor}><td className="px-4 py-3 text-sm font-medium">{v.vendor}</td><td className="px-4 py-3 text-sm text-right">{v.orders}</td><td className="px-4 py-3 text-sm text-right font-medium">{formatShort(v.value)}</td></tr>))}</tbody>
                        </table>
                    </div>
                </div>
            </PageWrapper>
        </div>
    );
}
