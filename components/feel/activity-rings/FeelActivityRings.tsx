"use client";

import React, { useState, useEffect } from "react";
import { ActivityRing } from "./ActivityRing";
import { Timer, Zap, Heart } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

// Mock Data / Logic Hooks
const usePresenceData = () => {
    // Target: 480 mins
    // Mock: 430 mins present
    const percentage = (430 / 480) * 100;
    return {
        percentage,
        label: "Presence",
        value: "7h 10m",
        status: "Good"
    };
};

const useEnergyData = () => {
    // Target: 1.0
    // Mock: 0.85
    const percentage = 0.85 * 100;
    return {
        percentage,
        label: "Energy",
        value: "0.85",
        status: "Healthy"
    };
};

const useEngagementData = () => {
    // Target: 3 days/week
    // Mock: 2 days so far (assuming mid-week)
    const percentage = (2 / 3) * 100;
    return {
        percentage: Math.min(percentage, 100), // Cap at 100 visually
        label: "Engage",
        value: "2/3 Days",
        status: "Active"
    };
};

export default function FeelActivityRings() {
    const presence = usePresenceData();
    const energy = useEnergyData();
    const engagement = useEngagementData();
    const router = useRouter();

    // Spec Colors
    const presenceColor = {
        track: "#E6EEFF",
        from: "#3A7AFE",
        to: "#5B8CFF",
        icon: "#2F5FD6"
    };

    const energyColor = {
        track: "#E8F8FA",
        from: "#2EC5CE",
        to: "#4DDDE6",
        icon: "#1FA4AB"
    };

    const engagementColor = {
        track: "#E4EAFF",
        from: "#1F4FD8",
        to: "#3A6BFF",
        icon: "#193FB0"
    };

    const handleRingClick = () => {
        router.push("/feel/history");
    };

    return (
        <div className="w-full px-4 pt-2 pb-6">
            <div className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-white/20 flex flex-col items-center w-full relative overflow-hidden">
                {/* Glass Reflection Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none" />

                {/* Rings Container - Top (Full Width) */}
                <div className="w-full flex items-center justify-center pb-6 border-b border-slate-100 relative">
                    <div
                        className="relative flex items-center justify-center w-[200px] h-[200px] flex-shrink-0 cursor-pointer group"
                        onClick={handleRingClick}
                    >
                        {/* Outer Ring: Presence (Largest) */}
                        <div
                            className="absolute inset-0 flex items-center justify-center z-10 transition-transform duration-300 hover:scale-105"
                        >
                            <ActivityRing
                                id="presence-ring"
                                percentage={presence.percentage}
                                size={200}
                                strokeWidth={20}
                                trackColor={presenceColor.track}
                                gradient={[presenceColor.from, presenceColor.to]}
                            />
                        </div>

                        {/* Middle Ring: Energy */}
                        <div
                            className="absolute inset-0 flex items-center justify-center z-20 transition-transform duration-300 hover:scale-105"
                        >
                            <ActivityRing
                                id="energy-ring"
                                percentage={energy.percentage}
                                size={150} // 200 - 20*2 - gap(10) = 150
                                strokeWidth={20}
                                trackColor={energyColor.track}
                                gradient={[energyColor.from, energyColor.to]}
                            />
                        </div>

                        {/* Inner Ring: Engagement */}
                        <div
                            className="absolute inset-0 flex items-center justify-center z-30 transition-transform duration-300 hover:scale-105"
                        >
                            <ActivityRing
                                id="engagement-ring"
                                percentage={engagement.percentage}
                                size={100} // 150 - 20*2 - gap(10) = 100
                                strokeWidth={20}
                                trackColor={engagementColor.track}
                                gradient={[engagementColor.from, engagementColor.to]}
                            />
                        </div>
                    </div>
                </div>

                {/* Stats / Legend - Bottom (3 Columns) */}
                <div className="w-full grid grid-cols-3 gap-2 pt-4">
                    <StatRow
                        icon={Timer}
                        label="Presence"
                        value={presence.value}
                        color={presenceColor.to}
                        bg={presenceColor.track}
                    />
                    <StatRow
                        icon={Zap}
                        label="Energy"
                        value={energy.value}
                        color={energyColor.to}
                        bg={energyColor.track}
                    />
                    <StatRow
                        icon={Heart}
                        label="Engage"
                        value={engagement.value}
                        color={engagementColor.to}
                        bg={engagementColor.track}
                    />
                </div>
            </div>
        </div>
    );
}

function StatRow({ icon: Icon, label, value, color, bg }: { icon: any, label: string, value: string, color: string, bg: string }) {
    return (
        <div className="flex flex-col items-center justify-center gap-2 p-1">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: bg }}>
                <Icon size={14} style={{ color }} strokeWidth={2.5} />
            </div>
            <div className="flex flex-col items-center">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 leading-tight mb-0.5">
                    {label}
                </span>
                <span className="text-xs font-bold text-slate-800 leading-tight">
                    {value}
                </span>
            </div>
        </div>
    );
}
