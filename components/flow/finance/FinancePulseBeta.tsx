"use client";

import { useMemo, useState } from "react";
import { AlertCircle, Info, TrendingUp } from "lucide-react";
import clsx from "clsx";
import { formatShort, formatDate } from "./modules/utils";

interface FinancePulseBetaProps {
    pulseData?: {
        avgDaily: number;
        today: number;
        stabilityIndex: number;
        commitmentPressure: number;
        dailyData: Record<string, number>;
    };
}

export function FinancePulseBeta({ pulseData }: FinancePulseBetaProps) {
    if (!pulseData) return null;

    const { avgDaily, stabilityIndex, commitmentPressure, dailyData } = pulseData;
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    // Derived values
    const pressurePercent = Math.min(Math.round(commitmentPressure * 100), 100);
    const isHighPressure = pressurePercent > 70;
    const isHighVolatility = stabilityIndex > 3;

    // Reason derivation
    const reason = useMemo(() => {
        if (isHighPressure && isHighVolatility) return "High cash outflow & large outstanding payments";
        if (isHighPressure) return "Outstanding bills are reaching 70% of available funding";
        if (isHighVolatility) return "Payments are peaking at 3x the daily average";
        return "Financial rhythm is stable across all indicators";
    }, [isHighPressure, isHighVolatility]);

    // Chart Data Preparation
    const chartData = useMemo(() => {
        const result = [];
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        for (let i = 6; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(now.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            result.push({
                date: dateStr,
                amount: dailyData?.[dateStr] || 0
            });
        }
        return result;
    }, [dailyData]);

    const maxVal = Math.max(...chartData.map(d => d.amount), avgDaily * 1.5, 1) * 1.1;
    const chartWidth = 300;
    const chartHeight = 80;
    const paddingX = 10;
    const paddingY = 15;

    const points = chartData.map((d, i) => {
        const x = paddingX + (i / (chartData.length - 1 || 1)) * (chartWidth - 2 * paddingX);
        const y = chartHeight - paddingY - (d.amount / maxVal) * (chartHeight - 2 * paddingY);
        return { x, y, date: d.date, amount: d.amount };
    });

    const pathData = points.length > 0
        ? `M${points.map(p => `${p.x},${p.y}`).join(' L')}`
        : "";

    const avgY = chartHeight - paddingY - (avgDaily / maxVal) * (chartHeight - 2 * paddingY);

    return (
        <div className="bg-white dark:bg-neutral-900 rounded-[32px] p-6 shadow-sm border border-black/[0.03] dark:border-white/[0.05]">
            {/* Header Area */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-neutral-900 dark:text-white" strokeWidth={2.5} />
                    <h3 className="text-[17px] font-bold text-neutral-900 dark:text-white tracking-tight">Finance Pulse</h3>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 tracking-widest uppercase">LIVE</span>
                </div>
            </div>

            {/* Status Summary Area */}
            <div className="flex items-start justify-between gap-4 mb-8">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                        <AlertCircle className={clsx(
                            "w-4 h-4",
                            (isHighPressure || isHighVolatility) ? "text-orange-500" : "text-emerald-500"
                        )} />
                        <span className={clsx(
                            "text-[15px] font-[800] tracking-tight",
                            (isHighPressure || isHighVolatility) ? "text-orange-500" : "text-emerald-500"
                        )}>
                            {isHighPressure ? "High Pressure" : "Stable Pressure"}
                        </span>
                    </div>
                    <p className="text-[12px] font-medium text-neutral-400 leading-snug">
                        {reason}
                    </p>
                </div>

                <div className="text-right flex-shrink-0">
                    <div className={clsx(
                        "text-[22px] font-[900] leading-none mb-1",
                        isHighVolatility ? "text-orange-500" : "text-emerald-500"
                    )}>
                        {stabilityIndex.toFixed(1)}x
                    </div>
                    <div className={clsx(
                        "text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider",
                        isHighVolatility ? "bg-orange-500/10 text-orange-500" : "bg-emerald-500/10 text-emerald-500"
                    )}>
                        {isHighVolatility ? "High Volatility" : "Low Volatility"}
                    </div>
                </div>
            </div>

            {/* Chart Area */}
            <div className="relative w-full aspect-[4/1] mb-2 group">
                <svg
                    viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                    className="w-full h-full overflow-visible"
                    onMouseLeave={() => setActiveIndex(null)}
                >
                    {/* Dashed background line (Average) */}
                    <line
                        x1="0"
                        y1={avgY}
                        x2={chartWidth}
                        y2={avgY}
                        className="stroke-neutral-100 dark:stroke-neutral-800"
                        strokeWidth="1.5"
                        strokeDasharray="4 4"
                    />

                    {/* Gradient for Line */}
                    <defs>
                        <linearGradient id="betaPulseLine" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={isHighPressure ? (isHighVolatility ? "#EF4444" : "#F97316") : (isHighVolatility ? "#F97316" : "#3B82F6")} />
                            <stop offset="100%" stopColor={isHighPressure ? (isHighVolatility ? "#F87171" : "#FB923C") : (isHighVolatility ? "#FB923C" : "#60A5FA")} />
                        </linearGradient>
                    </defs>

                    {/* Line path */}
                    <path
                        d={pathData}
                        fill="none"
                        stroke="url(#betaPulseLine)"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={clsx(
                            "transition-all duration-300",
                            isHighPressure ? "drop-shadow-[0_2px_4px_rgba(239,68,68,0.3)]" : (isHighVolatility ? "drop-shadow-[0_2px_4px_rgba(249,115,22,0.3)]" : "drop-shadow-[0_2px_4px_rgba(59,130,246,0.3)]")
                        )}
                    />

                    {/* Interaction for Points */}
                    {points.map((p, i) => (
                        <g key={i} className="cursor-pointer">
                            {/* Large invisible hit area */}
                            <rect
                                x={p.x - 15}
                                y={0}
                                width={30}
                                height={chartHeight}
                                fill="transparent"
                                onMouseEnter={() => setActiveIndex(i)}
                                onTouchStart={() => setActiveIndex(i)}
                            />

                            {/* Vertical Indicator Line */}
                            {activeIndex === i && (
                                <line
                                    x1={p.x}
                                    y1={0}
                                    x2={p.x}
                                    y2={chartHeight}
                                    className={clsx(
                                        isHighPressure ? "stroke-red-400/30" : (isHighVolatility ? "stroke-orange-400/30" : "stroke-blue-400/30")
                                    )}
                                    strokeWidth="1"
                                />
                            )}

                            {/* Data Point Dot - Original Style */}
                            <circle
                                cx={p.x}
                                cy={p.y}
                                r={activeIndex === i ? 5.5 : 4}
                                className={clsx(
                                    "transition-all duration-200",
                                    activeIndex === i
                                        ? "fill-white stroke-[2.5]"
                                        : "stroke-none",
                                    activeIndex === i
                                        ? (isHighPressure ? "stroke-red-500" : (isHighVolatility ? "stroke-orange-500" : "stroke-blue-600"))
                                        : (isHighPressure ? "fill-red-500" : (isHighVolatility ? "fill-orange-500" : "fill-blue-500"))
                                )}
                            />
                        </g>
                    ))}
                </svg>

                {/* Tooltip - Glassy Refinement (Original Style) */}
                {activeIndex !== null && points[activeIndex] && (
                    <div
                        className="absolute z-20 pointer-events-none transition-all duration-300 animate-in fade-in zoom-in-95"
                        style={{
                            left: `${(points[activeIndex].x / chartWidth) * 100}%`,
                            bottom: '100%',
                            transform: 'translateX(-50%) translateY(-12px)'
                        }}
                    >
                        <div className="bg-white/15 dark:bg-neutral-800/30 backdrop-blur-3xl border border-white/30 dark:border-white/10 px-4 py-2.5 rounded-[22px] shadow-[0_12px_40px_rgba(0,0,0,0.15)] min-w-[140px] text-center">
                            <p className="text-[10px] font-[800] text-neutral-500/80 dark:text-neutral-400/80 uppercase tracking-[0.15em] mb-1">
                                {formatDate(points[activeIndex].date)}
                            </p>
                            <div className="flex items-center justify-center gap-1">
                                <span className="text-[11px] font-[800] text-neutral-400 dark:text-neutral-500 leading-none">Rp</span>
                                <span className="text-[16px] font-[900] text-neutral-900 dark:text-white tracking-tight leading-none">
                                    {formatShort(points[activeIndex].amount)}
                                </span>
                            </div>
                            <div className="absolute -bottom-1 w-2.5 h-2.5 left-1/2 -translate-x-1/2 bg-white/15 dark:bg-neutral-800/30 backdrop-blur-3xl border-r border-b border-white/20 dark:border-white/5 rotate-45"></div>
                        </div>
                    </div>
                )}
            </div>

            {/* Chart Legend */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-neutral-900 dark:bg-white" />
                    <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Daily Spending</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 bg-neutral-200 dark:bg-neutral-800 rounded-full" />
                    <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">7D Average</span>
                </div>
            </div>
        </div>
    );
}
