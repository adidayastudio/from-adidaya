"use client";

import { useState, useEffect } from "react";
import { Search, Filter, Building2, Tag } from "lucide-react";
import { ResourceStatusBadge } from "@/components/flow/resources/ResourceStatusBadge";

// Mock Data
const MOCK_ASSETS = [
    {
        id: "AST-001",
        name: "Excavator Komatsu PC200",
        location: "Proyek Villa Puncak",
        status: "ACTIVE",
    },
    {
        id: "AST-002",
        name: "Dump Truck Hino 500",
        location: "Gudang Utama",
        status: "MAINTENANCE",
    },
    {
        id: "AST-003",
        name: "Mobile Crane 25T",
        location: "Pool Kendaraan",
        status: "INACTIVE",
    },
    {
        id: "AST-004",
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
        <div className="space-y-6">
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

            {/* TABLE */}
            <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left">
                    <thead className="bg-neutral-50 border-b border-neutral-100 text-neutral-500 font-medium">
                        <tr>
                            <th className="px-6 py-3">Asset Code</th>
                            <th className="px-6 py-3">Asset Name</th>
                            <th className="px-6 py-3">Location</th>
                            <th className="px-6 py-3 text-right">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                        {filteredAssets.length > 0 ? (
                            filteredAssets.map((item) => (
                                <tr key={item.id} className="hover:bg-neutral-50/50 transition-colors">
                                    <td className="px-6 py-3 font-medium text-neutral-900">
                                        <div className="flex items-center gap-2">
                                            <Tag className="w-4 h-4 text-neutral-400" />
                                            {item.id}
                                        </div>
                                    </td>
                                    <td className="px-6 py-3 font-medium text-neutral-900">{item.name}</td>
                                    <td className="px-6 py-3 text-neutral-600">{item.location}</td>
                                    <td className="px-6 py-3 text-right">
                                        <ResourceStatusBadge status={item.status} />
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-neutral-500">
                                    No assets found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
