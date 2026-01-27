"use client";

import { useState, useEffect } from "react";
import { Search, Filter, Warehouse } from "lucide-react";
import { ResourceStatusBadge } from "@/components/flow/resources/ResourceStatusBadge";

// Mock Data
const MOCK_MATERIALS = [
    {
        id: "MAT-001",
        project: "Rumah Pak Budi",
        material: "Semen Holcim 50kg",
        in: 100,
        used: 20,
        remaining: 80,
        status: "IN_USE",
    },
    {
        id: "MAT-002",
        project: "Villa Puncak",
        material: "Pasir Beton (m3)",
        in: 50,
        used: 50,
        remaining: 0,
        status: "CONSUMED",
    },
    {
        id: "MAT-003",
        project: "Renovasi Kantor",
        material: "Cat Dulux White 25kg",
        in: 10,
        used: 0,
        remaining: 10,
        status: "RECEIVED",
    },
    {
        id: "MAT-004",
        project: "Rumah Pak Budi",
        material: "Besi Beton 10mm",
        in: 200,
        used: 150,
        remaining: 50,
        status: "IN_USE",
    },
    {
        id: "MAT-005",
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
        <div className="space-y-6">
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

            {/* TABLE */}
            <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left">
                    <thead className="bg-neutral-50 border-b border-neutral-100 text-neutral-500 font-medium">
                        <tr>
                            <th className="px-6 py-3">Project / Location</th>
                            <th className="px-6 py-3">Material</th>
                            <th className="px-6 py-3 text-right">In</th>
                            <th className="px-6 py-3 text-right">Used</th>
                            <th className="px-6 py-3 text-right">Remaining</th>
                            <th className="px-6 py-3 text-right">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                        {filteredMaterials.length > 0 ? (
                            filteredMaterials.map((item) => (
                                <tr key={item.id} className="hover:bg-neutral-50/50 transition-colors">
                                    <td className="px-6 py-3 font-medium text-neutral-900">
                                        <div className="flex items-center gap-2">
                                            <Warehouse className="w-4 h-4 text-neutral-400" />
                                            {item.project}
                                        </div>
                                    </td>
                                    <td className="px-6 py-3 text-neutral-600">{item.material}</td>
                                    <td className="px-6 py-3 text-right text-neutral-600">{item.in}</td>
                                    <td className="px-6 py-3 text-right text-neutral-600">{item.used}</td>
                                    <td className="px-6 py-3 text-right font-medium text-neutral-900">{item.remaining}</td>
                                    <td className="px-6 py-3 text-right">
                                        <ResourceStatusBadge status={item.status} />
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-neutral-500">
                                    No materials found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
