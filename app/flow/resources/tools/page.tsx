"use client";

import { useState, useEffect } from "react";
import { Search, Filter, Wrench, ArrowRightLeft, AlertCircle } from "lucide-react";
import { ResourceStatusBadge } from "@/components/flow/resources/ResourceStatusBadge";

import { LiquidItemCard } from "@/components/shared/liquid/LiquidItemCard";

// Mock Data
const MOCK_TOOLS = [
    {
        id: "TOOL-001",
        projectCode: "STR-01-01",
        resourceCode: "TL-001",
        tool: "Bor Listrik Bosch",
        location: "Gudang Utama",
        quantity: 1,
        status: "AVAILABLE",
    },
    {
        id: "TOOL-002",
        projectCode: "WH-00-01",
        resourceCode: "TL-002",
        tool: "Genset 5000W",
        location: "Proyek Villa Puncak",
        quantity: 1,
        status: "IN_USE",
    },
    {
        id: "TOOL-003",
        projectCode: "VLL-02-01",
        resourceCode: "TL-003",
        tool: "Molin Beton",
        location: "Rumah Pak Budi",
        quantity: 1,
        status: "MOVED",
    },
    {
        id: "TOOL-004",
        projectCode: "RVK-03-01",
        resourceCode: "TL-004",
        tool: "Jackhammer",
        location: "Gudang Service",
        quantity: 1,
        status: "DAMAGED",
    },
    {
        id: "TOOL-005",
        projectCode: "RVK-03-01",
        resourceCode: "TL-005",
        tool: "Tangga Alumunium 5m",
        location: "Renovasi Kantor",
        quantity: 2,
        status: "AVAILABLE",
    },
];

export default function ToolsPage() {
    const [searchQuery, setSearchQuery] = useState("");

    // FAB Action Listener
    useEffect(() => {
        const handleFabAction = (e: any) => {
            if (e.detail?.id === 'RESOURCE_NEW_TOOL') {
                alert("New Tool action triggered via FAB");
            }
        };
        window.addEventListener('fab-action', handleFabAction);
        return () => window.removeEventListener('fab-action', handleFabAction);
    }, []);

    const filteredTools = MOCK_TOOLS.filter((item) =>
        item.tool.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.location.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-neutral-900">Tools</h1>
                    <p className="text-sm text-neutral-500 mt-1">Manage tool availability, location, and condition.</p>
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-xl text-sm font-medium hover:bg-neutral-800 transition-colors">
                        <ArrowRightLeft className="w-4 h-4" /> Transfer Tool
                    </button>
                </div>
            </div>

            <div className="border-b border-neutral-200" />

            {/* CONTROLS */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                        type="text"
                        placeholder="Search tool or location..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-400 transition-all"
                    />
                </div>
                <button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-neutral-200 text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition-colors">
                    <Filter className="w-4 h-4" /> Filter
                </button>
            </div>

            {/* LISTING */}
            <div className="space-y-3">
                {filteredTools.length > 0 ? (
                    filteredTools.map((item) => (
                        <LiquidItemCard
                            key={item.id}
                            leftAvatar={
                                <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-100/50">
                                    <Wrench className="w-5 h-5" />
                                </div>
                            }
                            title={item.tool}
                            subtitle={item.location}
                            badges={[
                                <span key="code" className="text-[10px] text-neutral-400 font-mono tracking-widest bg-neutral-100 px-1.5 py-0.5 rounded">
                                    {item.projectCode} • {item.resourceCode}
                                </span>
                            ]}
                            rightTop={
                                <div className="text-right">
                                    <div className="font-bold text-neutral-900 text-sm leading-none">{item.quantity} {item.quantity > 1 ? 'Units' : 'Unit'}</div>
                                    <div className="text-[10px] text-neutral-400 mt-1">Quantity</div>
                                </div>
                            }
                            rightBottom={<ResourceStatusBadge status={item.status} />}
                        />
                    ))
                ) : (
                    <div className="py-12 text-center text-neutral-500 bg-white rounded-[20px] border border-neutral-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
                        No tools found.
                    </div>
                )}
            </div>
        </div>
    );
}
