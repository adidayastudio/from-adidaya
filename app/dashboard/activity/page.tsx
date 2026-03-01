"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Target, User, Activity, Sparkles, Users } from "lucide-react";
import clsx from "clsx";
import MobileBottomBarV2 from "@/components/layout/MobileBottomBarV2";
import { useActivityDetails } from "@/hooks/useActivityDetails";
import { useWeekRingSummary } from "@/hooks/useWeekRingSummary";
import useUserProfile from "@/hooks/useUserProfile";
import { format, subDays, startOfDay, isSameDay, addDays, startOfWeek } from "date-fns";

// Helper to draw a single ring arc that supports overflow up to 300% (iOS Fitness style)
// Layer 1: 0-100% (base color)
// Layer 2: 100-200% (darker shade, glow)
// Layer 3: 200-300% (darkest shade, stronger glow)
function RingArc({ cx, cy, r, circ, value, strokeWidth, colors }: {
    cx: number; cy: number; r: number; circ: number; value: number;
    strokeWidth: number;
    colors: { dim: string; base: string; mid: string; dark: string };
}) {
    const layer1 = Math.min(value, 100);
    const layer2 = value > 100 ? Math.min(value - 100, 100) : 0;
    const layer3 = value > 200 ? Math.min(value - 200, 100) : 0;

    return (
        <>
            {/* Background ring */}
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className={colors.dim} />
            {/* Layer 1: 0-100% */}
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeWidth={strokeWidth}
                strokeDasharray={circ} strokeDashoffset={circ - (circ * (layer1 / 100))} strokeLinecap="round"
                className={clsx("transition-all duration-1000 ease-out", colors.base)} />
            {/* Layer 2: 100-200% */}
            {layer2 > 0 && (
                <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeWidth={strokeWidth + 1}
                    strokeDasharray={circ} strokeDashoffset={circ - (circ * (layer2 / 100))} strokeLinecap="round"
                    className={clsx("transition-all duration-1000 ease-out", colors.mid)}
                    style={{ filter: 'drop-shadow(0 0 2px currentColor)' }} />
            )}
            {/* Layer 3: 200-300% */}
            {layer3 > 0 && (
                <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeWidth={strokeWidth + 2}
                    strokeDasharray={circ} strokeDashoffset={circ - (circ * (layer3 / 100))} strokeLinecap="round"
                    className={clsx("transition-all duration-1000 ease-out", colors.dark)}
                    style={{ filter: 'drop-shadow(0 0 4px currentColor)' }} />
            )}
        </>
    );
}

// Helper to draw SVG rings
function SVGRings({ size, strokeWidth, tasks, presence, pulse, isActive = false }: any) {
    const center = size / 2;
    const radiusOut = center - strokeWidth;
    const radiusMid = radiusOut - strokeWidth - 2;
    const radiusIn = radiusMid - strokeWidth - 2;

    const circOut = 2 * Math.PI * radiusOut;
    const circMid = 2 * Math.PI * radiusMid;
    const circIn = 2 * Math.PI * radiusIn;

    const tVal = tasks === "-" ? 0 : Number(tasks);
    const pVal = presence === "-" ? 0 : Number(presence);
    const puVal = pulse === "-" ? 0 : Number(pulse);

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90 origin-center">
            <RingArc cx={center} cy={center} r={radiusOut} circ={circOut} value={tVal} strokeWidth={strokeWidth}
                colors={{
                    dim: "text-blue-50 dark:text-blue-500/10",
                    base: isActive ? "text-blue-500" : "text-blue-400",
                    mid: isActive ? "text-blue-600" : "text-blue-500",
                    dark: isActive ? "text-blue-700" : "text-blue-600",
                }} />
            <RingArc cx={center} cy={center} r={radiusMid} circ={circMid} value={pVal} strokeWidth={strokeWidth}
                colors={{
                    dim: "text-emerald-50 dark:text-emerald-500/10",
                    base: isActive ? "text-emerald-500" : "text-emerald-400",
                    mid: isActive ? "text-emerald-600" : "text-emerald-500",
                    dark: isActive ? "text-emerald-700" : "text-emerald-600",
                }} />
            <RingArc cx={center} cy={center} r={radiusIn} circ={circIn} value={puVal} strokeWidth={strokeWidth}
                colors={{
                    dim: "text-amber-50 dark:text-amber-500/10",
                    base: isActive ? "text-amber-500" : "text-amber-400",
                    mid: isActive ? "text-amber-600" : "text-amber-500",
                    dark: isActive ? "text-amber-700" : "text-amber-600",
                }} />
        </svg>
    );
}

export default function ActivitySummaryPage() {
    const router = useRouter();
    const { profile } = useUserProfile();
    // Use any as a fallback to bypass strict type checking for system_role since it seems to be missing from UserProfile type definitions
    const p: any = profile;
    const isManager = p?.system_role === 'manager' || p?.system_role === 'hr' || p?.system_role === 'superadmin' || p?.system_role === 'owner';

    const [mode, setMode] = useState<"personal" | "team">("personal");
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());

    // Fetch detailed activity data
    const details = useActivityDetails(mode, selectedDate);

    // Scroll ref for calendar
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [hasScrolledToToday, setHasScrolledToToday] = useState(false);

    // Initial scroll to end (today) only once
    useEffect(() => {
        if (scrollContainerRef.current && !hasScrolledToToday) {
            scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
            setHasScrolledToToday(true);
        }
    }, [hasScrolledToToday]);

    // Generate 8 weeks of data (2 months) ending with the current week.
    const today = new Date();
    const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
    const PAST_WEEKS = 8;

    // Build flat date list for the week ring summary hook
    const allDates: Date[] = [];
    for (let wIdx = 0; wIdx < PAST_WEEKS; wIdx++) {
        const weekStart = subDays(currentWeekStart, (PAST_WEEKS - 1 - wIdx) * 7);
        for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
            allDates.push(addDays(weekStart, dayIdx));
        }
    }

    const weekRings = useWeekRingSummary(mode, allDates);

    const WEEKS_DATA = Array.from({ length: PAST_WEEKS }).map((_, weekIdx) => {
        const weekStart = subDays(currentWeekStart, (PAST_WEEKS - 1 - weekIdx) * 7);
        return Array.from({ length: 7 }).map((_, dayIdx) => {
            const d = addDays(weekStart, dayIdx);
            const isSelected = isSameDay(d, selectedDate);
            const dStr = format(d, 'yyyy-MM-dd');
            const ringData = weekRings.data[dStr];

            return {
                dateObj: d,
                day: format(d, 'EEEE')[0],
                date: format(d, 'd'),
                isSelected,
                // Use selected day's detailed data if selected, otherwise fall back to summary
                tasks: isSelected ? details.tasks.percentage : (ringData?.tasks ?? "-"),
                presence: isSelected ? details.presence.percentage : (ringData?.presence ?? "-"),
                pulse: isSelected ? details.pulse.percentage : (ringData?.pulse ?? "-"),
            };
        });
    });

    const handleTodayClick = () => {
        const d = new Date();
        setSelectedDate(d);
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
        }
    };


    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 pb-24 font-sans text-neutral-900 dark:text-white relative">
            {/* Liquid Glass Header - Fixed to viewport */}
            <div
                className="fixed top-0 left-0 right-0 md:left-[var(--sidebar-width)] z-[100] backdrop-blur-[48px] saturate-[220%] border-b border-white/30 dark:border-white/10 transition-all"
                style={{
                    background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 100%)'
                }}
            >
                <div className="flex items-center justify-between px-4 pt-10 pb-4">
                    <div className="flex-1 flex justify-start">
                        <button
                            onClick={() => router.back()}
                            className="w-10 h-10 rounded-full bg-white dark:bg-neutral-800 shadow-[0_2px_10px_rgba(0,0,0,0.06)] dark:shadow-none flex items-center justify-center border border-neutral-100 dark:border-neutral-700 active:scale-95 transition-transform"
                        >
                            <ChevronLeft className="w-5 h-5 text-neutral-800 dark:text-neutral-200" strokeWidth={2} />
                        </button>
                    </div>

                    <div className="flex-[2] flex justify-center">
                        <h1 className="text-base font-bold text-neutral-900 dark:text-white tracking-tight">
                            {format(selectedDate, 'EEEE d MMM')}
                        </h1>
                    </div>

                    <div className="flex-1 flex justify-end items-center gap-2">
                        <button
                            onClick={handleTodayClick}
                            className="px-4 py-2 rounded-full bg-white dark:bg-neutral-800 shadow-[0_2px_10px_rgba(0,0,0,0.06)] dark:shadow-none border border-neutral-100 dark:border-neutral-700 active:scale-95 transition-transform text-xs font-bold text-neutral-900 dark:text-white">
                            Today
                        </button>
                        {isManager && (
                            <button
                                onClick={() => setMode(mode === "personal" ? "team" : "personal")}
                                className={clsx(
                                    "w-10 h-10 rounded-full flex items-center justify-center shadow-[0_2px_10px_rgba(0,0,0,0.06)] dark:shadow-none border active:scale-95 transition-all text-sm font-bold",
                                    mode === "team"
                                        ? "bg-blue-500 border-blue-500 text-white"
                                        : "bg-white dark:bg-neutral-800 border-neutral-100 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300"
                                )}
                            >
                                {mode === "team" ? <Users className="w-4 h-4" strokeWidth={2.5} /> : <User className="w-4 h-4" strokeWidth={2.5} />}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Spacer to push content below the fixed header (pt-10 + 40px content + pb-4 = ~96px) */}
            <div className="h-[96px]" />

            <div className="pt-6">
                {/* Weekly Calendar Rings */}
                <div ref={scrollContainerRef} className="w-full flex overflow-x-auto snap-x snap-mandatory hide-scrollbar mb-10 pb-2 pt-1 scroll-smooth">
                    {WEEKS_DATA.map((week, wIdx) => (
                        <div key={wIdx} className="w-full min-w-full flex justify-between px-6 snap-center flex-shrink-0">
                            {week.map((day, idx) => (
                                <div
                                    key={idx}
                                    className="flex flex-col items-center gap-2 cursor-pointer"
                                    onClick={() => setSelectedDate(day.dateObj)}
                                >
                                    <span className={clsx(
                                        "text-[10px] font-bold",
                                        day.isSelected ? "text-neutral-900 dark:text-white" : "text-neutral-400"
                                    )}>
                                        {day.day}
                                    </span>

                                    <div className="relative">
                                        {day.isSelected && (
                                            <div className="absolute -inset-1 bg-neutral-800 dark:bg-neutral-200 rounded-full -z-10" />
                                        )}
                                        <SVGRings size={32} strokeWidth={3} tasks={day.tasks} presence={day.presence} pulse={day.pulse} isActive={day.isSelected} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>

                {/* Giant Center Ring */}
                <div className="flex justify-center mb-6 relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-blue-400/10 dark:bg-blue-500/10 blur-3xl rounded-full pointer-events-none" />
                    <SVGRings size={240} strokeWidth={24} tasks={details.tasks.percentage} presence={details.presence.percentage} pulse={details.pulse.percentage} isActive={true} />
                </div>




                {/* Detailed Cards */}
                <div className="px-4 space-y-4">

                    {/* Tasks Card */}
                    <div className="bg-white dark:bg-neutral-900 rounded-[32px] p-6 shadow-sm border border-neutral-100 dark:border-neutral-800">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2 text-blue-500 font-bold text-[11px] tracking-wider uppercase">
                                <Target className="w-4 h-4" strokeWidth={2.5} />
                                Tasks
                            </div>
                            <span className="text-[11px] font-bold text-blue-400 uppercase tracking-widest">
                                {details.tasks.assignedToday === "-" ? "0" : details.tasks.assignedToday} Tasks Today
                            </span>
                        </div>

                        <div className="flex items-baseline gap-1 mb-6">
                            <span className="text-5xl font-extrabold text-blue-500 tracking-tighter">
                                {details.tasks.percentage === "-" ? "-" : details.tasks.percentage}
                            </span>
                            <span className="text-xl font-bold text-neutral-300 dark:text-neutral-600">/100%</span>
                            <span className="text-sm font-medium text-neutral-500 dark:text-neutral-400 ml-2">completed today</span>
                        </div>

                        {/* Hourly Chart */}
                        <div className="h-24 flex items-end justify-between px-2 w-full">
                            {details.tasks.hourly.map((hData) => {
                                // Find max value safely to scale the chart
                                const maxVal = Math.max(...details.tasks.hourly.map(d => d.value), 1);
                                const heightPercent = hData.value > 0 ? (hData.value / maxVal) * 100 : 0;

                                return (
                                    <div key={hData.hour} className="relative w-full h-full flex flex-col justify-end items-center group px-[1px]">
                                        <div className={clsx(
                                            "w-full max-w-[12px] rounded-full transition-all duration-500",
                                            hData.value > 0 ? "bg-blue-500" : "bg-transparent"
                                        )} style={{ height: `${heightPercent}%` }} />
                                    </div>
                                );
                            })}
                        </div>
                        {/* Chart axis */}
                        <div className="flex justify-between text-[10px] font-bold text-neutral-400 mt-2 px-1">
                            <span>00</span><span>06</span><span>12</span><span>18</span><span>24</span>
                        </div>

                        {/* Insight */}
                        {details.tasks.insight && (
                            <div className="flex items-center gap-2 pt-4 mt-4 border-t border-neutral-100 dark:border-neutral-800">
                                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                                <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                                    {details.tasks.insight}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Presence Card */}
                    <div className="bg-white dark:bg-neutral-900 rounded-[32px] p-6 shadow-sm border border-neutral-100 dark:border-neutral-800">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2 text-emerald-500 font-bold text-[11px] tracking-wider uppercase">
                                <User className="w-4 h-4" strokeWidth={2.5} />
                                Presence
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest">
                                    {details.presence.loggedHours === "-" ? "-" : Number(details.presence.loggedHours).toFixed(1)}H Logged
                                </span>
                                <span className="text-[9px] font-medium text-neutral-400 uppercase tracking-wider">
                                    / {details.presence.expectedHours === "-" ? "-" : Number(details.presence.expectedHours).toFixed(1)}H EXPECTED
                                </span>
                            </div>
                        </div>

                        <div className="flex items-baseline gap-1 mb-6">
                            <span className="text-5xl font-extrabold text-emerald-500 tracking-tighter">
                                {details.presence.percentage === "-" ? "-" : details.presence.percentage}
                            </span>
                            <span className="text-xl font-bold text-neutral-300 dark:text-neutral-600">/100%</span>
                            <span className="text-sm font-medium text-neutral-500 dark:text-neutral-400 ml-2">attendance rate</span>
                        </div>

                        {/* Hourly Presence Map (Green Blocks) */}
                        <div className="h-12 flex items-end justify-between px-2 w-full gap-[2px]">
                            {details.presence.hourly.map((hData) => {
                                // Value is either 0 or 100 for personal, or a ratio for team
                                return (
                                    <div key={hData.hour} className={clsx(
                                        "flex-1 rounded-t-lg transition-all h-full",
                                        hData.value === 100 ? "bg-emerald-500" :
                                            hData.value > 0 ? "bg-emerald-500/50" : "bg-emerald-50 dark:bg-emerald-500/10 h-[20%]"
                                    )} title={`Hour ${hData.hour}: ${hData.value}%`} />
                                );
                            })}
                        </div>
                        <div className="flex justify-between text-[10px] font-bold text-neutral-400 mt-2 px-1">
                            <span>00</span><span>06</span><span>12</span><span>18</span><span>24</span>
                        </div>

                        {/* Insight */}
                        {details.presence.insight && (
                            <div className="flex items-center gap-2 pt-4 mt-4 border-t border-neutral-100 dark:border-neutral-800">
                                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                                    {details.presence.insight}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Pulse Card */}
                    <div className="bg-white dark:bg-neutral-900 rounded-[32px] p-6 shadow-sm border border-neutral-100 dark:border-neutral-800 mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2 text-amber-500 font-bold text-[11px] tracking-wider uppercase">
                                <Activity className="w-4 h-4" strokeWidth={2.5} />
                                Pulse
                            </div>
                            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-widest">
                                {details.pulse.avg7Days === "-" ? "-" : `${details.pulse.avg7Days} Avg/Day`}
                            </span>
                        </div>

                        <div className="flex items-baseline gap-1 mb-6">
                            <span className="text-5xl font-extrabold text-amber-500 tracking-tighter">
                                {details.pulse.percentage === "-" ? "-" : details.pulse.percentage}
                            </span>
                            <span className="text-xl font-bold text-neutral-300 dark:text-neutral-600">/100%</span>
                            <span className="text-sm font-medium text-neutral-500 dark:text-neutral-400 ml-2">momentum vs avg</span>
                        </div>

                        {/* Hourly Chart */}
                        <div className="h-24 flex items-end justify-between px-2 w-full">
                            {details.pulse.hourly.map((hData) => {
                                // Ratio capped at 150
                                const heightPercent = hData.value > 0 ? (hData.value / 150) * 100 : 0;

                                return (
                                    <div key={hData.hour} className="relative w-full h-full flex flex-col justify-end items-center group px-[1px]">
                                        <div className={clsx(
                                            "w-full max-w-[12px] rounded-full transition-all duration-500",
                                            hData.value > 100 ? "bg-amber-400" : hData.value > 0 ? "bg-amber-500" : "bg-transparent"
                                        )} style={{ height: `${Math.min(heightPercent, 100)}%` }} />
                                    </div>
                                );
                            })}
                        </div>
                        {/* Chart axis */}
                        <div className="flex justify-between text-[10px] font-bold text-neutral-400 mt-2 px-1">
                            <span>00</span><span>06</span><span>12</span><span>18</span><span>24</span>
                        </div>

                        {/* Insight */}
                        {details.pulse.insight && (
                            <div className="flex items-center gap-2 pt-4 mt-4 border-t border-neutral-100 dark:border-neutral-800">
                                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                                    {details.pulse.insight}
                                </span>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}
