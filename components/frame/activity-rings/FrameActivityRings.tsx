"use client";

import React from "react";
import { ActivityRing } from "@/components/feel/activity-rings/ActivityRing";
import { CopyCheck, Leaf, Globe2 } from "lucide-react"; // Icons: Consistency, Freshness, Coverage
import { useRouter } from "next/navigation";

// Mock Data / Logic Hooks for FRAME
// 1. CONSISTENCY (Ratio)
const useConsistencyData = () => {
    // Goal: 95% consistency
    // Mock: 88% (Minor Drift)
    // Color: #E67E22
    const percentage = 88;
    return {
        percentage,
        label: "Consistency",
        value: "88%",
        status: "drift"
    };
};

// 2. FRESHNESS (Ratio)
const useFreshnessData = () => {
    // Goal: 85% fresh
    // Mock: 72% (Aging)
    const percentage = 72;
    return {
        percentage,
        label: "Freshness",
        value: "72%",
        status: "aging"
    };
};

// 3. COVERAGE (Ratio)
const useCoverageData = () => {
    // Goal: 90% coverage
    // Mock: 95% (Excellent)
    const percentage = 95;
    return {
        percentage,
        label: "Coverage",
        value: "95%",
        status: "covered"
    };
};

export default function FrameActivityRings() {
    const consistency = useConsistencyData();
    const freshness = useFreshnessData();
    const coverage = useCoverageData();
    const router = useRouter();

    // Spec Colors (Orange Family)
    const consistencyColor = {
        track: "#FFF2E6",      // Very light orange
        from: "#E67E22",       // Structured Orange
        to: "#F0A04B",         // Light Orange
        icon: "#CA6F1E"        // Darker Orange
    };

    const freshnessColor = {
        track: "#FFF1E6",      // Very light warm orange
        from: "#F2994A",       // Active Orange
        to: "#F5B97A",         // Soft Active
        icon: "#D35400"
    };

    const coverageColor = {
        track: "#FFF6ED",      // Very light peach
        from: "#F5B97A",       // Reach Orange
        to: "#FAD7A0",         // Light Reach
        icon: "#DC7633"
    };

    const handleRingClick = () => {
        // router.push("/frame/history"); 
    };

    return (
        <div className="w-full px-4 pt-2 pb-6">
            <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-white/20 flex items-center w-full relative overflow-hidden">
                {/* Glass Reflection Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none" />

                {/* Rings Container - Left Side (2/3) */}
                <div className="w-2/3 flex items-center justify-center border-r border-slate-50 dark:border-zinc-800 pr-4 relative">
                    <div
                        className="relative flex items-center justify-center w-[160px] h-[160px] flex-shrink-0 cursor-pointer group"
                        onClick={handleRingClick}
                    >
                        {/* Outer Ring: Consistency (Largest) */}
                        <div
                            className="absolute inset-0 flex items-center justify-center z-10 transition-transform duration-300 hover:scale-105"
                        >
                            <ActivityRing
                                id="consistency-ring"
                                percentage={consistency.percentage}
                                size={160}
                                strokeWidth={16}
                                trackColor={consistencyColor.track}
                                gradient={[consistencyColor.from, consistencyColor.to]}
                            />
                        </div>

                        {/* Middle Ring: Freshness */}
                        <div
                            className="absolute inset-0 flex items-center justify-center z-20 transition-transform duration-300 hover:scale-105"
                        >
                            <ActivityRing
                                id="freshness-ring"
                                percentage={freshness.percentage}
                                size={120} // 160 - 16*2 - gap(8) = 120
                                strokeWidth={16}
                                trackColor={freshnessColor.track}
                                gradient={[freshnessColor.from, freshnessColor.to]}
                            />
                        </div>

                        {/* Inner Ring: Coverage */}
                        <div
                            className="absolute inset-0 flex items-center justify-center z-30 transition-transform duration-300 hover:scale-105"
                        >
                            <ActivityRing
                                id="coverage-ring"
                                percentage={coverage.percentage}
                                size={80} // 120 - 16*2 - gap(8) = 80
                                strokeWidth={16}
                                trackColor={coverageColor.track}
                                gradient={[coverageColor.from, coverageColor.to]}
                            />
                        </div>
                    </div>
                </div>

                {/* Stats / Legend - Right Side (1/3) */}
                <div className="w-1/3 flex flex-col gap-4 justify-center pl-6">
                    <StatRow
                        icon={CopyCheck}
                        label="Consistency"
                        value={consistency.value}
                        color={consistencyColor.to}
                        bg={consistencyColor.track}
                    />
                    <StatRow
                        icon={Leaf}
                        label="Freshness"
                        value={freshness.value}
                        color={freshnessColor.to}
                        bg={freshnessColor.track}
                    />
                    <StatRow
                        icon={Globe2}
                        label="Coverage"
                        value={coverage.value}
                        color={coverageColor.to}
                        bg={coverageColor.track}
                    />
                </div>
            </div>
        </div>
    );
}

function StatRow({ icon: Icon, label, value, color, bg }: { icon: any, label: string, value: string, color: string, bg: string }) {
    return (
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: bg }}>
                <Icon size={14} style={{ color }} strokeWidth={2.5} />
            </div>
            <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-tight mb-0.5">
                    {label}
                </span>
                <span className="text-sm font-bold text-slate-800 leading-tight">
                    {value}
                </span>
            </div>
        </div>
    );
}
