"use client";

import { useState, useEffect } from "react";
import { Package, Wrench, Building2, AlertTriangle, ArrowRight, TrendingDown, TrendingUp } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";

// Mock Data for Overview
const MOCK_STATS = [
    {
        label: "Total Materials",
        value: "2,450",
        unit: "Items",
        trend: "+12%",
        trendUp: true,
        icon: Package,
        color: "blue",
    },
    {
        label: "Tools In Use",
        value: "14",
        unit: "Active",
        trend: "+2",
        trendUp: true,
        icon: Wrench,
        color: "orange",
    },
    {
        label: "Active Assets",
        value: "8",
        unit: "Heavy Equip",
        trend: "0%",
        trendUp: true,
        icon: Building2,
        color: "purple",
    },
];

const LOW_STOCK_ALERTS = [
    { item: "Semen Holcim 50kg", project: "Rumah Pak Budi", remaining: 5, unit: "Sack" },
    { item: "Pasir Beton", project: "Villa Puncak", remaining: 2, unit: "m3" },
];

const RECENT_ACTIVITY = [
    { time: "10:30 AM", user: "Budi S.", action: "Received", item: "Semen Holcim (100)", location: "Gudang Utama" },
    { time: "09:15 AM", user: "Agus A.", action: "Moved", item: "Bor Listrik", location: "Villa Puncak" },
    { time: "Yesterday", user: "System", action: "Consumed", item: "Cat Dulux", location: "Renovasi Kantor" },
];

function StatCard({ stat }: { stat: typeof MOCK_STATS[0] }) {
    return (
        <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
                <div className={clsx("p-3 rounded-xl", `bg-${stat.color}-50 text-${stat.color}-600`)}>
                    <stat.icon className="w-6 h-6" />
                </div>
                <div className={clsx("flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full", stat.trendUp ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700")}>
                    {stat.trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {stat.trend}
                </div>
            </div>
            <div>
                <div className="text-3xl font-bold text-neutral-900 tracking-tight">{stat.value}</div>
                <div className="text-sm text-neutral-500 font-medium mt-1">{stat.label}</div>
            </div>
        </div>
    );
}

export default function ResourcesOverviewPage() {
    // FAB Action Listener
    useEffect(() => {
        const handleFabAction = (e: any) => {
            if (e.detail?.id === 'RESOURCE_NEW') {
                alert("New Resource action triggered via FAB");
            }
        };
        window.addEventListener('fab-action', handleFabAction);
        return () => window.removeEventListener('fab-action', handleFabAction);
    }, []);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* HEADER */}
            <div>
                <h1 className="text-2xl font-bold text-neutral-900">Resources Overview</h1>
                <p className="text-sm text-neutral-500 mt-1">Dashboard of physical inventory, tools, and asset movements.</p>
            </div>

            {/* STATS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {MOCK_STATS.map((stat, i) => (
                    <StatCard key={i} stat={stat} />
                ))}
            </div>

            {/* MAIN CONTENT GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* LEFT COLUMN (2/3) */}
                <div className="lg:col-span-2 space-y-6">

                    {/* LOW STOCK ALERTS */}
                    <div className="bg-white border border-neutral-200 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-semibold text-neutral-900 flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-orange-500" />
                                Low Stock Alerts
                            </h3>
                            <Link href="/flow/resources/materials" className="text-sm font-medium text-neutral-500 hover:text-neutral-900 flex items-center gap-1">
                                View All <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                        <div className="space-y-3">
                            {LOW_STOCK_ALERTS.map((alert, idx) => (
                                <div key={idx} className="flex items-center justify-between p-4 bg-orange-50/50 border border-orange-100 rounded-xl">
                                    <div>
                                        <div className="font-medium text-neutral-900">{alert.item}</div>
                                        <div className="text-xs text-neutral-500">{alert.project}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-orange-700">{alert.remaining} {alert.unit}</div>
                                        <div className="text-xs text-orange-600 font-medium">Remaining</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* QUICK LINKS */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Link href="/flow/resources/tools" className="group p-5 bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-2xl hover:border-blue-300 transition-all">
                            <div className="mb-3 p-2 bg-blue-100 text-blue-600 rounded-lg w-fit group-hover:scale-110 transition-transform">
                                <Wrench className="w-5 h-5" />
                            </div>
                            <div className="font-semibold text-neutral-900">Manage Tools</div>
                            <div className="text-sm text-neutral-500 mt-1">Check availability and condition</div>
                        </Link>
                        <Link href="/flow/resources/assets" className="group p-5 bg-gradient-to-br from-purple-50 to-white border border-purple-100 rounded-2xl hover:border-purple-300 transition-all">
                            <div className="mb-3 p-2 bg-purple-100 text-purple-600 rounded-lg w-fit group-hover:scale-110 transition-transform">
                                <Building2 className="w-5 h-5" />
                            </div>
                            <div className="font-semibold text-neutral-900">Track Assets</div>
                            <div className="text-sm text-neutral-500 mt-1">Monitor high-value equipment</div>
                        </Link>
                    </div>

                </div>

                {/* RIGHT COLUMN (1/3) */}
                <div>
                    {/* RECENT ACTIVITY (Mini) */}
                    <div className="bg-white border border-neutral-200 rounded-2xl p-6 h-full">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-semibold text-neutral-900">Recent Activity</h3>
                            <Link href="/flow/resources/activity-log" className="text-sm font-medium text-neutral-500 hover:text-neutral-900">
                                See Log
                            </Link>
                        </div>
                        <div className="space-y-6">
                            {RECENT_ACTIVITY.map((act, i) => (
                                <div key={i} className="relative pl-6 pb-6 last:pb-0 border-l border-neutral-200 last:border-0">
                                    <div className="absolute top-0 -left-1.5 w-3 h-3 rounded-full bg-neutral-200 border-2 border-white" />
                                    <div className="flex flex-col gap-1">
                                        <span className="text-xs font-medium text-neutral-400">{act.time}</span>
                                        <span className="text-sm font-medium text-neutral-900">
                                            <span className={clsx(
                                                "font-bold",
                                                act.action === "Received" ? "text-green-600" :
                                                    act.action === "Used" ? "text-blue-600" :
                                                        act.action === "Damaged" ? "text-red-600" : "text-neutral-900"
                                            )}>{act.action}</span> {act.item}
                                        </span>
                                        <span className="text-xs text-neutral-500">
                                            at {act.location} by {act.user}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
