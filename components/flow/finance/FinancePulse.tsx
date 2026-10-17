import { AlertCircle, ChevronRight, Info } from "lucide-react";
import clsx from "clsx";
import { formatShort, formatAmount, formatDate } from "./modules/utils";
import { useState, useMemo } from "react";

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

    const { avgDaily, today, stabilityIndex, commitmentPressure, dailyData } = pulseData;

    // State for tooltip interaction
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const [infoId, setInfoId] = useState<string | null>(null);

    const INFO_DESC: Record<string, string> = {
        volatility: "Daily payment volume relative to average. Spikes indicate unusual cash outflow activity.",
        pressure: "Total outstanding bills relative to available funding. High pressure suggests a need for balance top-up.",
        stability: "Ratio of peak payments to daily average. Values above 3x are flagged as High Volatility."
    };

    // Prepare chart data (Last 7 Days)
    const chartData = useMemo(() => {
        const result = [];
        const now = new Date();
        // Set to local midnight to avoid day shifts
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

    const maxVal = Math.max(...chartData.map(d => d.amount), avgDaily * 1.5, 1) * 1.1; // Add 10% headroom
    const chartWidth = 300;
    const chartHeight = 60;
    const paddingX = 10;
    const paddingY = 10;

    // Derived values
    const pressurePercent = Math.min(Math.round(commitmentPressure * 100), 100);
    const isHighPressure = pressurePercent > 70;

    const points = chartData.map((d, i) => {
        const x = paddingX + (i / (chartData.length - 1 || 1)) * (chartWidth - 2 * paddingX);
        const y = chartHeight - paddingY - (d.amount / maxVal) * (chartHeight - 2 * paddingY);
        return { x, y, date: d.date, amount: d.amount };
    });

    const pathData = points.length > 0
        ? `M${points.map(p => `${p.x},${p.y}`).join(' L')}`
        : "";

    const avgY = chartHeight - paddingY - (avgDaily / maxVal) * (chartHeight - 2 * paddingY);

    // Stability thresholds
    const isHighVolatility = stabilityIndex > 3; // Refined threshold

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
                    "text-[14px] font-[800] tracking-tight",
                    isHighPressure || isHighVolatility ? "text-red-500 dark:text-red-400" : "text-emerald-500 dark:text-emerald-400"
                )}>
                    {isHighPressure
                        ? (isHighVolatility ? "High Pressure & Volatility" : "High Financial Pressure")
                        : (isHighVolatility ? "High Volatility" : "Finances Stable")
                    }
                </span>
            </div>

            {/* Volatility Chart Card */}
            <div className="bg-white dark:bg-neutral-900 rounded-[24px] p-5 mb-3 shadow-[0_2px_12px_rgba(0,0,0,0.03)] dark:shadow-none border border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-1.5 relative">
                        <span className="text-[15px] font-[800] text-neutral-900 dark:text-white tracking-tight">Spending Volatility</span>
                        <button
                            onClick={() => setInfoId(infoId === 'volatility' ? null : 'volatility')}
                            className="p-0.5 -m-0.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
                        >
                            <Info className={clsx("w-4 h-4 transition-colors", infoId === 'volatility' ? "text-blue-500" : "text-neutral-400")} />
                        </button>

                        {infoId === 'volatility' && (
                            <div className="absolute top-full left-0 mt-2 z-30 w-64 bg-white dark:bg-neutral-800 p-3 rounded-2xl shadow-xl border border-neutral-100 dark:border-neutral-700 animate-in fade-in zoom-in-95 duration-200">
                                <p className="text-[12px] font-medium text-neutral-600 dark:text-neutral-300 leading-normal">
                                    {INFO_DESC.volatility}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* SVG Chart */}
                {/* SVG Chart Container with fixed aspect ratio to prevent oval dots */}
                <div className="relative w-full aspect-[5/1] mb-6">
                    <svg
                        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                        className="absolute inset-0 w-full h-full overflow-visible"
                        onMouseLeave={() => setActiveIndex(null)}
                    >
                        {/* Dashed background line (Average) */}
                        <line
                            x1="0"
                            y1={avgY}
                            x2={chartWidth}
                            y2={avgY}
                            className="stroke-neutral-200 dark:stroke-neutral-800"
                            strokeWidth="1.5"
                            strokeDasharray="4 4"
                        />

                        {/* Mask to clean line edges */}
                        <defs>
                            <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#3B82F6" />
                                <stop offset="100%" stopColor="#60A5FA" />
                            </linearGradient>
                        </defs>

                        {/* Line path */}
                        <path
                            d={pathData}
                            fill="none"
                            stroke="url(#lineGradient)"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="drop-shadow-[0_2px_4px_rgba(59,130,246,0.3)]"
                        />

                        {/* Interaction Areas & Points */}
                        {points.map((p, i) => (
                            <g key={i} className="cursor-pointer group">
                                {/* Large invisible hit area for better mobile interaction */}
                                <rect
                                    x={p.x - 15}
                                    y={0}
                                    width={30}
                                    height={chartHeight}
                                    fill="transparent"
                                    onMouseEnter={() => setActiveIndex(i)}
                                    onTouchStart={() => setActiveIndex(i)}
                                    onClick={() => setActiveIndex(i)}
                                />

                                {/* Vertical Indicator Line */}
                                {activeIndex === i && (
                                    <line
                                        x1={p.x}
                                        y1={0}
                                        x2={p.x}
                                        y2={chartHeight}
                                        className="stroke-blue-400/30 dark:stroke-blue-400/20"
                                        strokeWidth="1"
                                    />
                                )}

                                {/* Data Point Dot - Perfectly Circular */}
                                <circle
                                    cx={p.x}
                                    cy={p.y}
                                    r={activeIndex === i ? 5.5 : 4}
                                    className={clsx(
                                        "transition-all duration-200",
                                        activeIndex === i
                                            ? "fill-white stroke-blue-600 stroke-[2.5]"
                                            : "fill-blue-500 stroke-none"
                                    )}
                                />

                                {/* Highlight for Yesterday/Today if it's the last point and spikey */}
                                {i === points.length - 1 && isHighVolatility && !activeIndex && (
                                    <circle cx={p.x} cy={p.y} r="6" fill="#EF4444" className="animate-ping opacity-40" />
                                )}
                            </g>
                        ))}
                    </svg>

                    {/* Interactive Tooltip Card - Glassy Refinement */}
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

                <div className="flex items-center gap-5 mt-4">
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/30"></span>
                        <span className="text-[12px] font-[800] text-neutral-500 dark:text-neutral-400">Daily</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-1 bg-neutral-200 dark:bg-neutral-800 rounded-full"></span>
                        <span className="text-[12px] font-[800] text-neutral-500 dark:text-neutral-400">7d Avg ({formatShort(avgDaily)})</span>
                    </div>
                </div>
            </div>

            {/* Bottom 2 Cards Grid */}
            <div className="grid grid-cols-2 gap-3">
                {/* Commitment Pressure */}
                <div className="bg-white dark:bg-neutral-900 rounded-[24px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] dark:shadow-none border border-neutral-100 dark:border-neutral-800 flex flex-col justify-between min-h-[140px]">
                    <div className="flex items-center gap-1.5 mb-2 relative">
                        <span className="text-[14px] font-[800] text-neutral-900 dark:text-white tracking-tight leading-tight">Commitment Pressure</span>
                        <button
                            onClick={() => setInfoId(infoId === 'pressure' ? null : 'pressure')}
                            className="p-0.5 -m-0.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors shrink-0"
                        >
                            <Info className={clsx("w-4 h-4 transition-colors", infoId === 'pressure' ? "text-blue-500" : "text-neutral-400")} />
                        </button>

                        {infoId === 'pressure' && (
                            <div className="absolute bottom-full left-0 mb-2 z-30 w-56 bg-white dark:bg-neutral-800 p-3 rounded-2xl shadow-xl border border-neutral-100 dark:border-neutral-700 animate-in fade-in slide-in-from-bottom-1 duration-200">
                                <p className="text-[11px] font-medium text-neutral-600 dark:text-neutral-300 leading-normal">
                                    {INFO_DESC.pressure}
                                </p>
                            </div>
                        )}
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
                    <div className="flex items-center gap-1.5 mb-2 relative">
                        <span className="text-[14px] font-[800] text-neutral-900 dark:text-white tracking-tight leading-tight">Stability Index</span>
                        <button
                            onClick={() => setInfoId(infoId === 'stability' ? null : 'stability')}
                            className="p-0.5 -m-0.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors shrink-0"
                        >
                            <Info className={clsx("w-4 h-4 transition-colors", infoId === 'stability' ? "text-blue-500" : "text-neutral-400")} />
                        </button>

                        {infoId === 'stability' && (
                            <div className="absolute bottom-full right-0 mb-2 z-30 w-56 bg-white dark:bg-neutral-800 p-3 rounded-2xl shadow-xl border border-neutral-100 dark:border-neutral-700 animate-in fade-in slide-in-from-bottom-1 duration-200">
                                <p className="text-[11px] font-medium text-neutral-600 dark:text-neutral-300 leading-normal text-right">
                                    {INFO_DESC.stability}
                                </p>
                            </div>
                        )}
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
