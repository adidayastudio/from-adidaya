"use client";

import { useState } from "react";
import { Search, History, ArrowRight } from "lucide-react";
import clsx from "clsx";

// Mock Data
const MOCK_LOGS = [
    {
        id: "LOG-001",
        timestamp: "2025-01-15 10:30",
        resource: "Semen Holcim 50kg",
        type: "Material",
        event: "Received",
        details: "Received 100 sacks at Gudang Utama",
        user: "Budi Santoso",
    },
    {
        id: "LOG-002",
        timestamp: "2025-01-16 09:00",
        resource: "Bor Listrik Bosch",
        type: "Tool",
        event: "Moved",
        details: "Transferred from Gudang Utama to Proyek Villa Puncak",
        user: "Agus Setiawan",
    },
    {
        id: "LOG-003",
        timestamp: "2025-01-16 14:15",
        resource: "Semen Holcim 50kg",
        type: "Material",
        event: "Used",
        details: "Used 20 sacks for Foundation",
        user: "Mandor Tarno",
    },
    {
        id: "LOG-004",
        timestamp: "2025-01-17 08:30",
        resource: "Jackhammer",
        type: "Tool",
        event: "Damaged",
        details: "Reported broken motor during operation",
        user: "Operator Dedi",
    },
    {
        id: "LOG-005",
        timestamp: "2025-01-17 11:00",
        resource: "Pasir Beton",
        type: "Material",
        event: "Consumed",
        details: "Stock depleted at Villa Puncak",
        user: "System",
    },
];

function EventBadge({ event }: { event: string }) {
    const colors: Record<string, string> = {
        Received: "bg-green-50 text-green-700 border-green-200",
        Used: "bg-blue-50 text-blue-700 border-blue-200",
        Consumed: "bg-neutral-100 text-neutral-600 border-neutral-200",
        Moved: "bg-purple-50 text-purple-700 border-purple-200",
        Damaged: "bg-red-50 text-red-700 border-red-200",
        Repaired: "bg-orange-50 text-orange-700 border-orange-200",
    };
    return (
        <span className={clsx("px-2 py-0.5 rounded text-xs font-medium border", colors[event] || "bg-gray-50 text-gray-700")}>
            {event}
        </span>
    );
}

export default function ActivityLogPage() {
    const [searchQuery, setSearchQuery] = useState("");

    const filteredLogs = MOCK_LOGS.filter((item) =>
        item.resource.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.event.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.details.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-neutral-900">Activity Log</h1>
                    <p className="text-sm text-neutral-500 mt-1">Read-only history of physical resource movements and changes.</p>
                </div>
            </div>

            <div className="border-b border-neutral-200" />

            {/* SEARCH */}
            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                    type="text"
                    placeholder="Search logs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-400 transition-all"
                />
            </div>

            {/* TABLE */}
            <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left">
                    <thead className="bg-neutral-50 border-b border-neutral-100 text-neutral-500 font-medium">
                        <tr>
                            <th className="px-6 py-3 w-40">Timestamp</th>
                            <th className="px-6 py-3 w-32">Event</th>
                            <th className="px-6 py-3">Resource</th>
                            <th className="px-6 py-3">Details</th>
                            <th className="px-6 py-3 text-right">User/Source</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                        {filteredLogs.length > 0 ? (
                            filteredLogs.map((item) => (
                                <tr key={item.id} className="hover:bg-neutral-50/50 transition-colors">
                                    <td className="px-6 py-3 text-neutral-500 font-mono text-xs">{item.timestamp}</td>
                                    <td className="px-6 py-3">
                                        <EventBadge event={item.event} />
                                    </td>
                                    <td className="px-6 py-3 font-medium text-neutral-900">
                                        <div className="flex flex-col">
                                            <span>{item.resource}</span>
                                            <span className="text-xs text-neutral-400 font-normal">{item.type}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3 text-neutral-600">{item.details}</td>
                                    <td className="px-6 py-3 text-right text-neutral-500">{item.user}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-neutral-500">
                                    No logs found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
