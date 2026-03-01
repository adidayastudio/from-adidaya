import React from "react";
import { AlertCircle, ChevronRight, Info } from "lucide-react";
import clsx from "clsx";
import { formatShort } from "./modules/utils";

interface FinancePulseProps {
    pulseData?: {
        avgDaily: number;
        today: number;
        stabilityIndex: number;
        commitmentPressure: number;
        dailyData: Record<string, number>;
    };
}

export function FinancePulse({ pulseData }: FinancePulseProps) {
    if (!pulseData) return null;

    const { avgDaily, today, stabilityIndex, commitmentPressure } = pulseData;

    // Derived values
    const pressurePercent = Math.min(Math.round(commitmentPressure * 100), 100);
    const isHighPressure = pressurePercent > 70;

    // Stability thresholds
    const isHighVolatility = stabilityIndex > 2;

    return (
        <div className="px-5 mb-8">
            <div className="flex items-center justify-between mb-1">
                <h2 className="text-[19px] font-bold text-neutral-900 dark:text-white tracking-tight">Finance Pulse</h2>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-200/60 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 shadow-sm transition-transform">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse"></span>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 tracking-widest uppercase">LIVE</span>
                </div>
            </div>
            <p className="text-[13px] text-neutral-500 dark:text-neutral-400 mb-4">Your financial rhythm over the last 7 days</p>

            {/* Status Alert Badge */}
            <div className={clsx(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border mb-4 shadow-sm",
                isHighPressure || isHighVolatility
                    ? "bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20"
                    : "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20"
            )}>
                <AlertCircle className={clsx(
                    "w-4 h-4",
                    isHighPressure || isHighVolatility ? "text-red-500 dark:text-red-400" : "text-emerald-500 dark:text-emerald-400"
                )} />
                <span className={clsx(
                    "text-[14px] font-bold",
                    isHighPressure || isHighVolatility ? "text-red-500 dark:text-red-400" : "text-emerald-500 dark:text-emerald-400"
                )}>
                    {isHighPressure ? "High Financial Pressure" : (isHighVolatility ? "High Volatility" : "Finances Stable")}
                </span>
            </div>

            {/* Volatility Chart Card */}
            <div className="bg-white dark:bg-neutral-900 rounded-[24px] p-5 mb-3 shadow-[0_2px_12px_rgba(0,0,0,0.03)] dark:shadow-none border border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-1.5">
                        <span className="text-[15px] font-bold text-neutral-900 dark:text-white">Spending Volatility</span>
                        <Info className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
                    </div>
                    <span className="text-[13px] font-medium text-neutral-500 dark:text-neutral-400">Avg: {formatShort(avgDaily)}</span>
                </div>

                {/* SVG Chart Mock */}
                <div className="relative h-[60px] w-full mb-6">
                    <svg viewBox="0 0 300 60" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                        {/* Dashed background line */}
                        <line x1="0" y1="45" x2="300" y2="45" className="stroke-neutral-200 dark:stroke-neutral-800" strokeWidth="1.5" strokeDasharray="4 4" />

                        {/* Line path */}
                        <path d="M0,35 L40,33 L80,30 L120,40 L160,38 L200,38 L240,0 L280,35" fill="none" stroke="#3B82F6" strokeWidth="3" />

                        {/* Dots */}
                        <circle cx="240" cy="0" r="4.5" fill="#EF4444" />
                    </svg>
                </div>

                <div className="flex items-center gap-5 mt-4">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                        <span className="text-[12px] font-bold text-neutral-500 dark:text-neutral-400">Daily</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-1 bg-neutral-300 dark:bg-neutral-700 rounded-full"></span>
                        <span className="text-[12px] font-bold text-neutral-500 dark:text-neutral-400">- 7d Avg ({formatShort(avgDaily)})</span>
                    </div>
                </div>
            </div>

            {/* Bottom 2 Cards Grid */}
            <div className="grid grid-cols-2 gap-3">
                {/* Commitment Pressure */}
                <div className="bg-white dark:bg-neutral-900 rounded-[24px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] dark:shadow-none border border-neutral-100 dark:border-neutral-800 flex flex-col justify-between min-h-[140px]">
                    <div className="flex items-center gap-1.5 mb-2">
                        <span className="text-[14px] font-bold text-neutral-900 dark:text-white leading-tight">Commitment Pressure</span>
                        <Info className="w-4 h-4 text-neutral-400 dark:text-neutral-500 shrink-0" />
                    </div>

                    <div className="mt-auto">
                        <div className="h-3 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden mb-3">
                            <div className={clsx(
                                "h-full rounded-full transition-all duration-700",
                                isHighPressure ? "bg-red-500" : "bg-orange-400"
                            )} style={{ width: `${pressurePercent}%` }}></div>
                        </div>
                        <span className={clsx(
                            "text-[12px] font-bold",
                            isHighPressure ? "text-red-500 dark:text-red-400" : "text-neutral-500 dark:text-neutral-400"
                        )}>
                            {isHighPressure ? "Financial pressure increasing" : "Pressure manageable"}
                        </span>
                    </div>
                </div>

                {/* Stability Index */}
                <div className="bg-white dark:bg-neutral-900 rounded-[24px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] dark:shadow-none border border-neutral-100 dark:border-neutral-800 flex flex-col justify-between min-h-[140px]">
                    <div className="flex items-center gap-1.5 mb-2">
                        <span className="text-[14px] font-bold text-neutral-900 dark:text-white leading-tight">Stability Index</span>
                        <Info className="w-4 h-4 text-neutral-400 dark:text-neutral-500 shrink-0" />
                    </div>

                    <div className="mt-auto">
                        <div className={clsx(
                            "text-[28px] font-bold leading-none mb-1.5",
                            isHighVolatility ? "text-orange-500 dark:text-orange-400" : "text-emerald-500 dark:text-emerald-400"
                        )}>{stabilityIndex.toFixed(1)}x</div>
                        <div className={clsx(
                            "text-[13px] font-bold mb-0.5",
                            isHighVolatility ? "text-orange-500 dark:text-orange-400" : "text-emerald-500 dark:text-emerald-400"
                        )}>{isHighVolatility ? "High Volatility" : "Low Volatility"}</div>
                        <div className="text-[11px] font-medium text-neutral-400 dark:text-neutral-500 mb-2 truncate">Based on 7d behavior</div>
                        {isHighVolatility && (
                            <div className="text-[10px] font-bold text-red-500 dark:text-red-400 tracking-wider uppercase bg-red-50 dark:bg-red-500/10 w-fit px-2 py-1 rounded animate-pulse">SPIKE RISK</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
