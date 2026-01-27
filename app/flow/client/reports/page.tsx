"use client";

import { useEffect } from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import ClientSidebar from "@/components/flow/client/ClientSidebar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { BarChart3, Download, Calendar } from "lucide-react";

const MOCK_CLIENT_STATS = [
    { client: "PT Maju Bersama", projects: 3, revenue: 450000000, outstanding: 75000000 },
    { client: "CV Sinar Jaya", projects: 2, revenue: 320000000, outstanding: 50000000 },
    { client: "Bapak Sutanto", projects: 1, revenue: 180000000, outstanding: 45000000 },
    { client: "PT Industrial", projects: 1, revenue: 200000000, outstanding: 35000000 },
];

function formatShort(n: number) { return n >= 1000000 ? `${(n / 1000000).toFixed(0)}M` : `${n}`; }

export default function ClientReportsPage() {
    // FAB Action Listener
    useEffect(() => {
        const handleFabAction = (e: any) => {
            if (e.detail?.id === 'CLIENT_NEW') {
                alert("New Client action triggered via FAB");
            }
        };
        window.addEventListener('fab-action', handleFabAction);
        return () => window.removeEventListener('fab-action', handleFabAction);
    }, []);

    return (
        <div className="min-h-screen bg-neutral-50 p-6">
            <Breadcrumb items={[{ label: "Flow" }, { label: "Client" }, { label: "Reports" }]} />
            <PageWrapper sidebar={<ClientSidebar />}>
                <div className="space-y-8 w-full animate-in fade-in duration-500">
                    <div className="space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h1 className="text-2xl font-bold text-neutral-900">Reports</h1>
                                <p className="text-sm text-neutral-500 mt-1">Client analytics and revenue summaries.</p>
                            </div>
                            <div className="flex gap-2">
                                <button className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg text-sm font-medium hover:bg-neutral-50"><Calendar className="w-4 h-4" /> This Year</button>
                                <button className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg text-sm font-medium hover:bg-neutral-50"><Download className="w-4 h-4" /> Export</button>
                            </div>
                        </div>
                        <div className="border-b border-neutral-200" />
                    </div>

                    <div className="bg-white rounded-xl border p-6">
                        <div className="flex items-center gap-2 mb-4"><BarChart3 className="w-5 h-5 text-neutral-400" /><h3 className="font-semibold">Client Revenue</h3></div>
                        <table className="w-full">
                            <thead className="bg-neutral-50 border-b"><tr><th className="text-left px-4 py-2 text-xs font-semibold text-neutral-500 uppercase">Client</th><th className="text-right px-4 py-2 text-xs font-semibold text-neutral-500 uppercase">Projects</th><th className="text-right px-4 py-2 text-xs font-semibold text-neutral-500 uppercase">Revenue</th><th className="text-right px-4 py-2 text-xs font-semibold text-neutral-500 uppercase">Outstanding</th></tr></thead>
                            <tbody className="divide-y">{MOCK_CLIENT_STATS.map((c) => (
                                <tr key={c.client}><td className="px-4 py-3 text-sm font-medium">{c.client}</td><td className="px-4 py-3 text-sm text-right">{c.projects}</td><td className="px-4 py-3 text-sm font-medium text-right text-green-600">{formatShort(c.revenue)}</td><td className="px-4 py-3 text-sm text-right text-orange-600">{formatShort(c.outstanding)}</td></tr>
                            ))}</tbody>
                        </table>
                    </div>
                </div>
            </PageWrapper>
        </div>
    );
}
