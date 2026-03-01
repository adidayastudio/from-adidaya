"use client";

import { useState, useEffect } from "react";
import { Search, Filter, Warehouse } from "lucide-react";
import { ResourceStatusBadge } from "@/components/flow/resources/ResourceStatusBadge";

import { LiquidItemCard } from "@/components/shared/liquid/LiquidItemCard";

// Mock Data
const MOCK_MATERIALS = [
    {
        id: "MAT-001",
        projectCode: "STR-01-01",
        resourceCode: "MT-001",
        project: "Rumah Pak Budi",
        material: "Semen Holcim 50kg",
        in: 100,
        used: 20,
        remaining: 80,
        status: "IN_USE",
    },
    {
        id: "MAT-002",
        projectCode: "VLL-02-01",
        resourceCode: "MT-002",
        project: "Villa Puncak",
        material: "Pasir Beton (m3)",
        in: 50,
        used: 50,
        remaining: 0,
        status: "CONSUMED",
    },
    {
        id: "MAT-003",
        projectCode: "RVK-03-01",
        resourceCode: "MT-003",
        project: "Renovasi Kantor",
        material: "Cat Dulux White 25kg",
        in: 10,
        used: 0,
        remaining: 10,
        status: "RECEIVED",
    },
    {
        id: "MAT-004",
        projectCode: "STR-01-01",
        resourceCode: "MT-004",
        project: "Rumah Pak Budi",
        material: "Besi Beton 10mm",
        in: 200,
        used: 150,
        remaining: 50,
        status: "IN_USE",
    },
    {
        id: "MAT-005",
        projectCode: "WH-00-01",
        resourceCode: "MT-005",
        project: "Gudang Utama",
        material: "Kabel NYM 2x1.5",
        in: 500,
        used: 0,
        remaining: 500,
        status: "RECEIVED",
    },
];

export default function MaterialsPage() {
    const [searchQuery, setSearchQuery] = useState("");

    // FAB Action Listener
    useEffect(() => {
        const handleFabAction = (e: any) => {
            if (e.detail?.id === 'RESOURCE_NEW_MAT') {
                alert("New Material action triggered via FAB");
            }
        };
        window.addEventListener('fab-action', handleFabAction);
        return () => window.removeEventListener('fab-action', handleFabAction);
    }, []);

    const filteredMaterials = MOCK_MATERIALS.filter((item) =>
        item.material.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.project.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-neutral-900">Materials</h1>
                    <p className="text-sm text-neutral-500 mt-1">Track material usage and stock levels per project.</p>
                </div>
            </div>

            <div className="border-b border-neutral-200" />

            {/* CONTROLS */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                        type="text"
                        placeholder="Search material or project..."
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
                {filteredMaterials.length > 0 ? (
                    filteredMaterials.map((item) => (
                        <LiquidItemCard
                            key={item.id}
                            leftAvatar={
                                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100/50">
                                    <Warehouse className="w-5 h-5" />
                                </div>
                            }
                            title={item.material}
                            subtitle={item.project}
                            badges={[
                                <span key="code" className="text-[10px] text-neutral-400 font-mono tracking-widest bg-neutral-100 px-1.5 py-0.5 rounded">
                                    {item.projectCode} • {item.resourceCode}
                                </span>,
                                <span key="stats" className="text-[10px] text-neutral-500 font-medium">
                                    In: {item.in} | Used: {item.used}
                                </span>
                            ]}
                            rightTop={
                                <div className="text-right">
                                    <div className="font-bold text-neutral-900 text-sm leading-none">{item.remaining}</div>
                                    <div className="text-[10px] text-neutral-400 mt-1">Remaining</div>
                                </div>
                            }
                            rightBottom={<ResourceStatusBadge status={item.status} />}
                        />
                    ))
                ) : (
                    <div className="py-12 text-center text-neutral-500 bg-white rounded-[20px] border border-neutral-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
                        No materials found.
                    </div>
                )}
            </div>
        </div>
    );
}
