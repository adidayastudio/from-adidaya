"use client";

import { useState, useEffect } from "react";
import { History as HistoryIcon, ArrowRight } from "lucide-react";
import clsx from "clsx";
import { useSearchParams } from "next/navigation";

import { LiquidItemCard } from "@/components/shared/liquid/LiquidItemCard";

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
        <span className={clsx("px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border", colors[event] || "bg-gray-50 text-gray-700")}>
            {event}
        </span>
    );
}

export default function ActivityLogPage() {
    const searchParams = useSearchParams();
    const urlQuery = searchParams.get("q") || "";
    const [searchQuery, setSearchQuery] = useState(urlQuery);

    useEffect(() => {
        setSearchQuery(urlQuery);
    }, [urlQuery]);

    const filteredLogs = MOCK_LOGS.filter((item) =>
        item.resource.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.event.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.details.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-neutral-900">Activity Log</h1>
                    <p className="text-sm text-neutral-500 mt-1">Read-only history of physical resource movements and changes.</p>
                </div>
            </div>

            <div className="border-b border-neutral-200" />


            {/* LISTING */}
            <div className="space-y-3">
                {filteredLogs.length > 0 ? (
                    filteredLogs.map((item) => (
                        <LiquidItemCard
                            key={item.id}
                            leftAvatar={
                                <div className="w-10 h-10 rounded-full bg-neutral-100 text-neutral-500 flex items-center justify-center border border-neutral-200/50">
                                    <HistoryIcon className="w-5 h-5" />
                                </div>
                            }
                            title={item.resource}
                            subtitle={item.details}
                            badges={[
                                <EventBadge key="event" event={item.event} />,
                                <span key="type" className="text-[10px] text-neutral-500 font-medium">{item.type}</span>
                            ]}
                            rightTop={
                                <div className="text-right text-xs font-mono text-neutral-500">{item.timestamp}</div>
                            }
                            rightBottom={
                                <div className="text-right text-xs font-medium text-neutral-500 mt-1 flex items-center gap-1 justify-end">
                                    <span className="w-4 h-4 rounded-full bg-neutral-200 border border-neutral-300 flex items-center justify-center text-[8px] font-bold text-neutral-600">{item.user.charAt(0)}</span>
                                    {item.user}
                                </div>
                            }
                        />
                    ))
                ) : (
                    <div className="py-12 text-center text-neutral-500 bg-white rounded-[20px] border border-neutral-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
                        No logs found.
                    </div>
                )}
            </div>
        </div>
    );
}
