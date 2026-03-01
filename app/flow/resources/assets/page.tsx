"use client";

import { useState, useEffect } from "react";
import { Search, Filter, Building2, Tag } from "lucide-react";
import { ResourceStatusBadge } from "@/components/flow/resources/ResourceStatusBadge";

import { LiquidItemCard } from "@/components/shared/liquid/LiquidItemCard";

// Mock Data
const MOCK_ASSETS = [
    {
        id: "AST-001",
        projectCode: "VLL-02-01",
        resourceCode: "AS-001",
        name: "Excavator Komatsu PC200",
        location: "Proyek Villa Puncak",
        status: "ACTIVE",
    },
    {
        id: "AST-002",
        projectCode: "WH-00-01",
        resourceCode: "AS-002",
        name: "Dump Truck Hino 500",
        location: "Gudang Utama",
        status: "MAINTENANCE",
    },
    {
        id: "AST-003",
        projectCode: "PL-01-01",
        resourceCode: "AS-003",
        name: "Mobile Crane 25T",
        location: "Pool Kendaraan",
        status: "INACTIVE",
    },
    {
        id: "AST-004",
        projectCode: "RVK-03-01",
        resourceCode: "AS-004",
        name: "Concrete Mixer Truck",
        location: "Renovasi Kantor",
        status: "ACTIVE",
    },
];

export default function AssetsPage() {
    const [searchQuery, setSearchQuery] = useState("");

    // FAB Action Listener
    useEffect(() => {
        const handleFabAction = (e: any) => {
            if (e.detail?.id === 'RESOURCE_NEW_ASSET') {
                alert("New Asset action triggered via FAB");
            }
        };
        window.addEventListener('fab-action', handleFabAction);
        return () => window.removeEventListener('fab-action', handleFabAction);
    }, []);

    const filteredAssets = MOCK_ASSETS.filter((item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.location.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-neutral-900">Assets</h1>
                    <p className="text-sm text-neutral-500 mt-1">Track high-value assets and their operational status.</p>
                </div>
            </div>

            <div className="border-b border-neutral-200" />

            {/* CONTROLS */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                        type="text"
                        placeholder="Search asset, code, or location..."
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
                {filteredAssets.length > 0 ? (
                    filteredAssets.map((item) => (
                        <LiquidItemCard
                            key={item.id}
                            leftAvatar={
                                <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100/50">
                                    <Building2 className="w-5 h-5" />
                                </div>
                            }
                            title={item.name}
                            subtitle={item.location}
                            badges={[
                                <span key="id" className="text-[10px] text-neutral-400 font-mono tracking-widest bg-neutral-100 px-1.5 py-0.5 rounded">
                                    {item.projectCode} • {item.resourceCode}
                                </span>
                            ]}
                            rightBottom={<ResourceStatusBadge status={item.status} />}
                        />
                    ))
                ) : (
                    <div className="py-12 text-center text-neutral-500 bg-white rounded-[20px] border border-neutral-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
                        No assets found.
                    </div>
                )}
            </div>
        </div>
    );
}
