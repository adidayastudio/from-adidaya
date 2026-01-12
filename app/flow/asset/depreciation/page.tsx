"use client";

import PageWrapper from "@/components/layout/PageWrapper";
import AssetSidebar from "@/components/flow/asset/AssetSidebar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { TrendingDown, Download } from "lucide-react";

const MOCK_DEPRECIATION = [
    { asset: "Excavator CAT 320", purchaseValue: 1200000000, currentValue: 850000000, depreciation: 350000000, rate: "SL 10%" },
    { asset: "Truck Hino 500", purchaseValue: 650000000, currentValue: 450000000, depreciation: 200000000, rate: "SL 10%" },
    { asset: "Generator 50KVA", purchaseValue: 120000000, currentValue: 75000000, depreciation: 45000000, rate: "SL 15%" },
    { asset: "Concrete Mixer", purchaseValue: 85000000, currentValue: 45000000, depreciation: 40000000, rate: "SL 15%" },
];

function formatShort(n: number) { return n >= 1000000000 ? `${(n / 1000000000).toFixed(1)}B` : n >= 1000000 ? `${(n / 1000000).toFixed(0)}M` : `${n}`; }

export default function DepreciationPage() {
    const totalPurchase = MOCK_DEPRECIATION.reduce((a, d) => a + d.purchaseValue, 0);
    const totalCurrent = MOCK_DEPRECIATION.reduce((a, d) => a + d.currentValue, 0);
    const totalDepr = MOCK_DEPRECIATION.reduce((a, d) => a + d.depreciation, 0);

    return (
        <div className="min-h-screen bg-neutral-50 p-6">
            <Breadcrumb items={[{ label: "Flow" }, { label: "Asset" }, { label: "Depreciation" }]} />
            <PageWrapper sidebar={<AssetSidebar />}>
                <div className="space-y-8 w-full animate-in fade-in duration-500">
                    <div className="space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h1 className="text-2xl font-bold text-neutral-900">Depreciation</h1>
                                <p className="text-sm text-neutral-500 mt-1">Track asset value depreciation over time.</p>
                            </div>
                            <button className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg text-sm font-medium hover:bg-neutral-50"><Download className="w-4 h-4" /> Export</button>
                        </div>
                        <div className="border-b border-neutral-200" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white rounded-xl border p-5"><div className="text-sm text-neutral-500 mb-1">Purchase Value</div><div className="text-2xl font-bold text-neutral-900">{formatShort(totalPurchase)}</div></div>
                        <div className="bg-white rounded-xl border p-5"><div className="text-sm text-neutral-500 mb-1">Current Value</div><div className="text-2xl font-bold text-green-600">{formatShort(totalCurrent)}</div></div>
                        <div className="bg-white rounded-xl border p-5"><div className="text-sm text-neutral-500 mb-1">Total Depreciation</div><div className="text-2xl font-bold text-red-600">{formatShort(totalDepr)}</div></div>
                    </div>

                    <div className="bg-white rounded-xl border overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-neutral-50 border-b"><tr><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Asset</th><th className="text-right px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Purchase Value</th><th className="text-right px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Current Value</th><th className="text-right px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Depreciation</th><th className="text-left px-6 py-3 text-xs font-semibold text-neutral-500 uppercase">Method</th></tr></thead>
                            <tbody className="divide-y">{MOCK_DEPRECIATION.map((d) => (
                                <tr key={d.asset} className="hover:bg-neutral-50/50">
                                    <td className="px-6 py-4 text-sm font-medium">{d.asset}</td>
                                    <td className="px-6 py-4 text-sm text-right">{formatShort(d.purchaseValue)}</td>
                                    <td className="px-6 py-4 text-sm font-medium text-right text-green-600">{formatShort(d.currentValue)}</td>
                                    <td className="px-6 py-4 text-sm text-right text-red-600">{formatShort(d.depreciation)}</td>
                                    <td className="px-6 py-4 text-sm text-neutral-500">{d.rate}</td>
                                </tr>
                            ))}</tbody>
                        </table>
                    </div>
                </div>
            </PageWrapper>
        </div>
    );
}
