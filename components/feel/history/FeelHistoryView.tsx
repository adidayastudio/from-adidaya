"use client";

// --- Imports ---
import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { ChevronLeft, Info, Calendar as CalendarIcon, Share } from "lucide-react";
import { ActivityRing } from "../activity-rings/ActivityRing";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import FrostedGlassFilter from "@/components/layout/FrostedGlassFilter";
import { useClockData } from "@/hooks/useClockData";
import { useUserContext } from "@/components/providers/UserProvider";

// --- Types ---

type DailyData = {
    date: string; // "Monday", "Tuesday", etc.
    fullDate: string; // "Mon, 2 Feb 2026"
    shortDay: string; // "M", "T"
    isoDate: string; // "2026-02-05" for matching
    presence: { val: number; target: number; label: string; hourly: number[] };
    energy: { val: number; target: number; label: string; hourly: number[] };
    engagement: { val: number; target: number; label: string; daily: number[] };
};

// --- Components ---

const SmallCompositeRing = ({ data, isSelected }: { data: DailyData; isSelected: boolean }) => {
    const size = 32;
    const stroke = 3;

    // Presence Color
    const pC = { t: "rgba(0, 0, 0, 0.1)", f: "#3A7AFE", to: "#5B8CFF" };
    // Energy Color
    const eC = { t: "rgba(0, 0, 0, 0.1)", f: "#2EC5CE", to: "#4DDDE6" };
    // Engage Color
    const gC = { t: "rgba(0, 0, 0, 0.1)", f: "#1F4FD8", to: "#3A6BFF" };

    return (
        <div className="flex flex-col items-center gap-1 cursor-pointer">
            <span className={cn(
                "text-[10px] font-medium uppercase",
                isSelected ? "text-slate-900 font-bold" : "text-slate-400"
            )}>
                {data.shortDay}
            </span>
            <div className={cn(
                "relative flex items-center justify-center rounded-full transition-all duration-300",
                isSelected ? "ring-2 ring-slate-200 ring-offset-2 ring-offset-slate-50 shadow-sm" : "opacity-70 scale-95"
            )} style={{ width: size, height: size }}>
                {/* Presence */}
                <div className="absolute inset-0 flex items-center justify-center z-10">
                    <ActivityRing id={`sw-p-${data.shortDay}`} percentage={(data.presence.val / data.presence.target) * 100} size={size} strokeWidth={stroke} trackColor={pC.t} gradient={[pC.f, pC.to]} />
                </div>
                {/* Energy */}
                <div className="absolute inset-0 flex items-center justify-center z-20">
                    <ActivityRing id={`sw-e-${data.shortDay}`} percentage={(data.energy.val / data.energy.target) * 100} size={size * 0.75} strokeWidth={stroke} trackColor={eC.t} gradient={[eC.f, eC.to]} />
                </div>
                {/* Engagement */}
                <div className="absolute inset-0 flex items-center justify-center z-30">
                    <ActivityRing id={`sw-g-${data.shortDay}`} percentage={(data.engagement.val) * 100} size={size * 0.5} strokeWidth={stroke} trackColor={gC.t} gradient={[gC.f, gC.to]} />
                </div>
            </div>
        </div>
    );
};

const BarChart = ({ data, color }: { data: number[], color: string }) => {
    // Simple bar chart visualizer
    return (
        <div className="flex items-end gap-[2px] h-16 w-full mt-4">
            {data.map((val, i) => (
                <div
                    key={i}
                    className="flex-1 rounded-t-sm opacity-80"
                    style={{
                        height: `${Math.min(val * 100, 100)}%`,
                        backgroundColor: color
                    }}
                />
            ))}
        </div>
    );
};

export default function FeelHistoryView() {
    const { user } = useUserContext();
    const today = useMemo(() => new Date(), []);
    const { attendance } = useClockData(user?.id, false, today);

    // Generate accurate week data
    const weekData = useMemo(() => {
        // Find Monday of current week
        const d = new Date(today);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        const monday = new Date(d.setDate(diff));

        return Array.from({ length: 7 }, (_, i) => {
            const current = new Date(monday);
            current.setDate(monday.getDate() + i);

            const dateStr = current.toLocaleDateString("en-US", { weekday: 'long' });
            const fullDateStr = current.toLocaleDateString("en-GB", { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
            const shortDayStr = current.toLocaleDateString("en-US", { weekday: 'narrow' });
            const isoDate = current.toISOString().split('T')[0];

            // Find real attendance data
            const record = attendance.find(a => a.date === isoDate);
            const pVal = record ? (record.totalMinutes || 0) : 0;

            // Mock other metrics for now (0 defaults)
            const eVal = 0;
            const gVal = 0;

            return {
                date: dateStr,
                fullDate: fullDateStr,
                shortDay: shortDayStr,
                isoDate: isoDate,
                presence: {
                    val: pVal,
                    target: 480, // 8 hours
                    label: `${Math.floor(pVal / 60)}h ${pVal % 60}m`,
                    hourly: Array.from({ length: 24 }, (_, h) => pVal > 0 && h > 8 && h < 18 ? (0.4 + Math.random() * 0.6) : 0) // rough mock distribution if present
                },
                energy: {
                    val: eVal,
                    target: 1.0,
                    label: eVal.toFixed(2),
                    hourly: Array.from({ length: 24 }, () => 0)
                },
                engagement: {
                    val: gVal,
                    target: 1,
                    label: "Idle",
                    daily: Array.from({ length: 7 }, () => 0)
                }
            };
        });
    }, [attendance, today]);

    // Default to Today's index (0-6)
    // 0 = Mon, 6 = Sun
    const getTodayIndex = () => {
        const day = today.getDay(); // 0 is Sunday
        return day === 0 ? 6 : day - 1;
    };

    const [selectedIndex, setSelectedIndex] = useState<number>(getTodayIndex());
    const selectedDay = weekData[selectedIndex] || weekData[0];

    // Colors
    const presenceColor = { f: "#3A7AFE", to: "#5B8CFF" };
    const energyColor = { f: "#2EC5CE", to: "#4DDDE6" };
    const engageColor = { f: "#1F4FD8", to: "#3A6BFF" };

    const glassButtonStyle: React.CSSProperties = {
        background: "rgba(255, 255, 255, 0.3)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
        border: "1px solid rgba(255, 255, 255, 0.5)"
    };

    return (
        <div className="h-screen overflow-y-auto overflow-x-hidden bg-slate-50 text-slate-900 pb-24 relative">
            <FrostedGlassFilter />

            {/* Sticky Container: Header + Weekly Strip */}
            <div className="sticky top-0 z-50 overflow-hidden text-slate-900 shadow-sm transition-all duration-300">
                {/* 1. Glass Filter Layer (Blur + Displacement) */}
                <div
                    className="absolute inset-0 z-0 pointer-events-none"
                    style={{
                        backdropFilter: "blur(3px)",
                        WebkitBackdropFilter: "blur(3px)",
                        filter: "url(#frosted) saturate(180%) brightness(1.2)"
                    }}
                />

                {/* 2. Glass Overlay Layer (Tint) */}
                <div
                    className="absolute inset-0 z-0 pointer-events-none"
                    style={{ backgroundColor: "rgba(255, 255, 255, 0.35)" }}
                />

                {/* 3. Glass Specular Layer (Border + Shine) */}
                <div
                    className="absolute inset-0 z-0 pointer-events-none"
                    style={{
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6), 0 10px 40px rgba(0,0,0,0.05)",
                        borderBottom: "1px solid rgba(255,255,255,0.4)"
                    }}
                />

                {/* Content Wrapper (Above Glass) */}
                <div className="relative z-10">
                    {/* Header Row */}
                    <div className="px-4 py-3 flex items-center justify-between">
                        <Link
                            href="/feel"
                            className="w-10 h-10 rounded-full flex items-center justify-center text-slate-700 hover:scale-105 active:scale-95 transition-all"
                            style={glassButtonStyle}
                        >
                            <ChevronLeft className="w-6 h-6 -ml-0.5" />
                        </Link>

                        <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none">
                            <h1 className="text-sm font-bold text-slate-800">
                                {selectedDay.fullDate}
                            </h1>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                className="w-10 h-10 rounded-full flex items-center justify-center text-slate-700 hover:scale-105 active:scale-95 transition-all"
                                style={glassButtonStyle}
                            >
                                <CalendarIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Weekly Strip Row */}
                    <div className="w-full border-t border-slate-200/30">
                        <div className="px-4 py-4 flex items-end gap-0 overflow-x-auto no-scrollbar snap-x snap-mandatory">
                            {weekData.map((day, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => setSelectedIndex(idx)}
                                    className="flex-shrink-0 w-[14.28%] min-w-[50px] flex justify-center snap-center"
                                >
                                    <SmallCompositeRing data={day} isSelected={selectedIndex === idx} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="p-4 space-y-8 pb-32">

                {/* Metric: Presence */}
                <section className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                    <h2 className="text-lg font-bold mb-1" style={{ color: presenceColor.f }}>
                        Presence
                    </h2>
                    <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold font-mono tracking-tight text-slate-900">
                            {selectedDay.presence.val}
                        </span>
                        <span className="text-slate-500 font-medium text-sm">
                            / {selectedDay.presence.target} MIN
                        </span>
                    </div>
                    {/* Placeholder Graph */}
                    <div className="mt-2">
                        <BarChart data={selectedDay.presence.hourly} color={presenceColor.f} />
                    </div>
                    <div className="mt-2 text-xs text-slate-400 border-t border-slate-100 pt-2 flex justify-between">
                        <span>00:00</span>
                        <span>12:00</span>
                        <span>23:59</span>
                    </div>
                </section>

                {/* Metric: Energy */}
                <section className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                    <h2 className="text-lg font-bold mb-1" style={{ color: energyColor.f }}>
                        Energy
                    </h2>
                    <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold font-mono tracking-tight text-slate-900">
                            {(selectedDay.energy.val * 100).toFixed(0)}
                        </span>
                        <span className="text-slate-500 font-medium text-sm">
                            / 100 SCORE
                        </span>
                    </div>
                    <div className="mt-2">
                        <BarChart data={selectedDay.energy.hourly} color={energyColor.f} />
                    </div>
                    <div className="mt-2 text-xs text-slate-400 border-t border-slate-100 pt-2 flex justify-between">
                        <span>00:00</span>
                        <span>12:00</span>
                        <span>23:59</span>
                    </div>
                </section>

                {/* Metric: Engagement */}
                <section className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                    <h2 className="text-lg font-bold mb-1" style={{ color: engageColor.f }}>
                        Engagement
                    </h2>
                    <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold font-mono tracking-tight text-slate-900">
                            {selectedDay.engagement.val > 0 ? "Active" : "Idle"}
                        </span>
                        <span className="text-slate-500 font-medium text-sm">
                            / DAILY
                        </span>
                    </div>
                    {/* Horizontal Dots for Engagement maybe? */}
                    <div className="flex gap-2 mt-4">
                        {Array.from({ length: 24 }).map((_, i) => (
                            <div key={i} className={cn("h-8 flex-1 rounded-sm", selectedDay.engagement.daily[i % 7] ? "bg-blue-600" : "bg-slate-100")} />
                        ))}
                    </div>
                    <div className="mt-2 text-xs text-slate-400 border-t border-slate-100 pt-2 flex justify-between">
                        <span>00:00</span>
                        <span>12:00</span>
                        <span>23:59</span>
                    </div>
                </section>

            </div>
        </div>
    );
}
