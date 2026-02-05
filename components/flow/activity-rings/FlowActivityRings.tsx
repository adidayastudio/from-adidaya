"use client";

import React from "react";
import { ActivityRing } from "@/components/feel/activity-rings/ActivityRing";
import { CheckCircle2, ShieldAlert, Scale } from "lucide-react";
import { useRouter } from "next/navigation";

// Mock Data / Logic Hooks for FLOW
// 1. PROGRESS (Completion Ratio)
const useProgressData = () => {
    // Goal: 100% completion of planned work
    // Mock: 65% done (At Risk < 75%)
    // Color: #E74C3C
    const percentage = 65;
    return {
        percentage,
        label: "Progress",
        value: "65%",
        status: "risk"
    };
};

// 2. STABILITY (1 - Issue Impact)
const useStabilityData = () => {
    // Goal: 1.0 (Stable)
    // Mock: 0.92 (Very Stable)
    const percentage = 92;
    return {
        percentage,
        label: "Stability",
        value: "0.92",
        status: "stable"
    };
};

// 3. LOAD BALANCE (Allocation Ratio)
const useLoadBalanceData = () => {
    // Goal: 1.0 (Ideal)
    // Mock: 1.25 (Overloaded) -> Visual Cap at 100% or show overflow?
    // Let's cap at 100% visually for harmony, show value text accurately
    const percentage = 85;
    return {
        percentage,
        label: "Load Bal.",
        value: "1.1x", // 110% load
        status: "warning"
    };
};

export default function FlowActivityRings() {
    const progress = useProgressData();
    const stability = useStabilityData();
    const loadBalance = useLoadBalanceData();
    const router = useRouter();

    // Spec Colors (Red Family)
    const progressColor = {
        track: "#FDEDEC",      // Very light red
        from: "#E74C3C",       // Base Red
        to: "#EC7063",         // Lighter Red
        icon: "#C0392B"        // Darker Red for Icon
    };

    const stabilityColor = {
        track: "#F9EBEA",      // Very light brick
        from: "#C0392B",       // Control Red
        to: "#CD6155",         // Softer Brick
        icon: "#922B21"
    };

    const loadBalanceColor = {
        track: "#FDF2F2",      // Very light pink/rose
        from: "#D98880",       // Rose Red
        to: "#E6B0AA",         // Pale Rose
        icon: "#A93226"
    };

    const handleRingClick = () => {
        // router.push("/flow/history"); // Future: Flow History
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
                        {/* Outer Ring: Progress (Largest) */}
                        <div
                            className="absolute inset-0 flex items-center justify-center z-10 transition-transform duration-300 hover:scale-105"
                        >
                            <ActivityRing
                                id="progress-ring"
                                percentage={progress.percentage}
                                size={160}
                                strokeWidth={16}
                                trackColor={progressColor.track}
                                gradient={[progressColor.from, progressColor.to]}
                            />
                        </div>

                        {/* Middle Ring: Stability */}
                        <div
                            className="absolute inset-0 flex items-center justify-center z-20 transition-transform duration-300 hover:scale-105"
                        >
                            <ActivityRing
                                id="stability-ring"
                                percentage={stability.percentage}
                                size={120} // 160 - 16*2 - gap(8) = 120
                                strokeWidth={16}
                                trackColor={stabilityColor.track}
                                gradient={[stabilityColor.from, stabilityColor.to]}
                            />
                        </div>

                        {/* Inner Ring: Load Balance */}
                        <div
                            className="absolute inset-0 flex items-center justify-center z-30 transition-transform duration-300 hover:scale-105"
                        >
                            <ActivityRing
                                id="load-balance-ring"
                                percentage={loadBalance.percentage}
                                size={80} // 120 - 16*2 - gap(8) = 80
                                strokeWidth={16}
                                trackColor={loadBalanceColor.track}
                                gradient={[loadBalanceColor.from, loadBalanceColor.to]}
                            />
                        </div>
                    </div>
                </div>

                {/* Stats / Legend - Right Side (1/3) */}
                <div className="w-1/3 flex flex-col gap-4 justify-center pl-6">
                    <StatRow
                        icon={CheckCircle2}
                        label="Progress"
                        value={progress.value}
                        color={progressColor.to}
                        bg={progressColor.track}
                    />
                    <StatRow
                        icon={ShieldAlert}
                        label="Stability"
                        value={stability.value}
                        color={stabilityColor.to}
                        bg={stabilityColor.track}
                    />
                    <StatRow
                        icon={Scale}
                        label="Balance"
                        value={loadBalance.value}
                        color={loadBalanceColor.to}
                        bg={loadBalanceColor.track}
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
