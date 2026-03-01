"use client";

import React from "react";
import { Target, User, Activity, Sparkles } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";
import { useActivitySummary } from "@/hooks/useActivitySummary";

export default function ActivitySummaryCard() {
    // Mode defaults to personal here, could be passed as prop if needed.
    const { tasksPercentage, presencePercentage, pulsePercentage, insight, loading } = useActivitySummary("personal");

    // Helper to calculate dash offset safely
    const calculateOffset = (circumference: number, percent: number | "-") => {
        if (percent === "-") return circumference; // Empty ring if no data
        return circumference - (circumference * (percent / 100));
    };

    return (
        <Link href="/dashboard/activity" className="block mx-4 mt-6">
            <div className="bg-white dark:bg-neutral-900 rounded-[32px] p-6 shadow-sm border border-neutral-100 dark:border-neutral-800 relative overflow-hidden transition-transform active:scale-[0.98]">
                {/* Background light gradient effect */}
                <div className="absolute top-0 right-0 w-48 h-48 bg-blue-50/50 dark:bg-blue-900/10 rounded-full blur-3xl pointer-events-none transform translate-x-1/3 -translate-y-1/3" />

                <h2 className="text-[15px] font-bold text-neutral-900 dark:text-white mb-6 tracking-tight relative z-10">
                    Activity Summary {loading && <span className="text-xs text-neutral-400 font-normal ml-2 animate-pulse">Updating...</span>}
                </h2>

                <div className="flex items-center justify-between mb-6 relative z-10">
                    {/* Left: Stats */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center bg-blue-50 dark:bg-blue-500/10">
                                <Target className="w-3.5 h-3.5 text-blue-500" strokeWidth={2.5} />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-neutral-400 tracking-wider">TASKS</p>
                                <p className="text-lg font-bold text-neutral-800 dark:text-white leading-tight">
                                    {tasksPercentage === "-" ? "-" : `${tasksPercentage}%`}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center bg-emerald-50 dark:bg-emerald-500/10">
                                <User className="w-3.5 h-3.5 text-emerald-500" strokeWidth={2.5} />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-neutral-400 tracking-wider">PRESENCE</p>
                                <p className="text-lg font-bold text-neutral-800 dark:text-white leading-tight">
                                    {presencePercentage === "-" ? "-" : `${presencePercentage}%`}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center bg-amber-50 dark:bg-amber-500/10">
                                <Activity className="w-3.5 h-3.5 text-amber-500" strokeWidth={2.5} />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-neutral-400 tracking-wider">PULSE</p>
                                <p className="text-lg font-bold text-neutral-800 dark:text-white leading-tight">
                                    {pulsePercentage === "-" ? "-" : `${pulsePercentage}%`}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Right: Mini Rings */}
                    <div className="relative w-36 h-36 flex items-center justify-center -mr-2 shrink-0">
                        <svg className="w-full h-full transform -rotate-90 origin-center drop-shadow-sm" viewBox="0 0 100 100">
                            {/* Blue Ring (Outer - Tasks) */}
                            <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="11" className="text-blue-50 dark:text-blue-500/10" />
                            <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="11" strokeDasharray="264" strokeDashoffset={calculateOffset(264, tasksPercentage)} strokeLinecap="round" className="text-blue-500 transition-all duration-1000 ease-out" />

                            {/* Green Ring (Middle - Presence) */}
                            <circle cx="50" cy="50" r="29" fill="none" stroke="currentColor" strokeWidth="11" className="text-emerald-50 dark:text-emerald-500/10" />
                            <circle cx="50" cy="50" r="29" fill="none" stroke="currentColor" strokeWidth="11" strokeDasharray="182.2" strokeDashoffset={calculateOffset(182.2, presencePercentage)} strokeLinecap="round" className="text-emerald-500 transition-all duration-1000 ease-out" />

                            {/* Orange Ring (Inner - Pulse) */}
                            <circle cx="50" cy="50" r="16" fill="none" stroke="currentColor" strokeWidth="11" className="text-amber-50 dark:text-amber-500/10" />
                            <circle cx="50" cy="50" r="16" fill="none" stroke="currentColor" strokeWidth="11" strokeDasharray="100.5" strokeDashoffset={calculateOffset(100.5, pulsePercentage)} strokeLinecap="round" className="text-amber-500 transition-all duration-1000 ease-out" />
                        </svg>

                        {/* Glow effect for rings */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent mix-blend-overlay rounded-full" />
                    </div>
                </div>

                {/* Bottom Productivity Callout */}
                {insight && insight !== "-" && (
                    <div className="flex items-center gap-2 pt-4 border-t border-neutral-100 dark:border-neutral-800 relative z-10">
                        <div className="w-5 h-5 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
                            <Sparkles className="w-3 h-3 text-blue-500" strokeWidth={2.5} />
                        </div>
                        <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
                            {insight}
                        </p>
                    </div>
                )}
            </div>
        </Link>
    );
}
