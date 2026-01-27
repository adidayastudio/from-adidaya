"use client";

import { useState, useEffect } from "react";
import { Search, Filter, Wrench, ArrowRightLeft, AlertCircle } from "lucide-react";
import { ResourceStatusBadge } from "@/components/flow/resources/ResourceStatusBadge";

// Mock Data
const MOCK_TOOLS = [
    {
        id: "TOOL-001",
        tool: "Bor Listrik Bosch",
        location: "Gudang Utama",
        quantity: 1,
        status: "AVAILABLE",
    },
    {
        id: "TOOL-002",
        tool: "Genset 5000W",
        location: "Proyek Villa Puncak",
        quantity: 1,
        status: "IN_USE",
    },
    {
        id: "TOOL-003",
        tool: "Molin Beton",
        location: "Rumah Pak Budi",
        quantity: 1,
        status: "MOVED", // Recently moved there
    },
    {
        id: "TOOL-004",
        tool: "Jackhammer",
        location: "Gudang Service",
        quantity: 1,
        status: "DAMAGED",
    },
    {
        id: "TOOL-005",
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
        <div className="space-y-6">
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

            {/* TABLE */}
            <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left">
                    <thead className="bg-neutral-50 border-b border-neutral-100 text-neutral-500 font-medium">
                        <tr>
                            <th className="px-6 py-3">Tool Name</th>
                            <th className="px-6 py-3">Location</th>
                            <th className="px-6 py-3 text-right">Quantity</th>
                            <th className="px-6 py-3 text-right">Status</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                        {filteredTools.length > 0 ? (
                            filteredTools.map((item) => (
                                <tr key={item.id} className="hover:bg-neutral-50/50 transition-colors">
                                    <td className="px-6 py-3 font-medium text-neutral-900">
                                        <div className="flex items-center gap-2">
                                            <Wrench className="w-4 h-4 text-neutral-400" />
                                            {item.tool}
                                        </div>
                                    </td>
                                    <td className="px-6 py-3 text-neutral-600">{item.location}</td>
                                    <td className="px-6 py-3 text-right text-neutral-600">{item.quantity}</td>
                                    <td className="px-6 py-3 text-right">
                                        <ResourceStatusBadge status={item.status} />
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button className="text-xs font-medium text-neutral-500 hover:text-neutral-900 px-2 py-1 rounded bg-neutral-100 hover:bg-neutral-200 transition-colors">
                                                Update
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-neutral-500">
                                    No tools found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
