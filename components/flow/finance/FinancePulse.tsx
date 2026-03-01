import React from "react";
import { AlertCircle, ChevronRight, Info } from "lucide-react";

export function FinancePulse() {
    return (
        <div className="px-5 mb-8">
            <div className="flex items-center justify-between mb-1">
                <h2 className="text-[19px] font-bold text-neutral-900 tracking-tight">Finance Pulse</h2>
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-neutral-200/60 bg-white/50 shadow-sm active:scale-95 transition-transform">
                    <span className="w-2 h-2 rounded-full border-[2px] border-neutral-400"></span>
                    <span className="text-[10px] font-bold text-neutral-400 tracking-widest uppercase">SIMULATION</span>
                </div>
            </div>
            <p className="text-[13px] text-neutral-500 mb-4">Your financial rhythm over the last 7 days</p>

            {/* Status Alert Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 border border-red-100 mb-4">
                <AlertCircle className="w-3.5 h-3.5 text-red-600 fill-red-600/20" strokeWidth={2.5} />
                <span className="text-[13px] font-bold text-red-600">Financial Stress</span>
            </div>

            {/* Volatility Chart Card */}
            <div className="bg-white rounded-[24px] p-5 mb-3 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-neutral-100">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-1.5">
                        <span className="text-[14px] font-bold text-neutral-900">Spending Volatility</span>
                        <Info className="w-3.5 h-3.5 text-neutral-400" />
                    </div>
                    <span className="text-[12px] font-medium text-neutral-500">Avg: 2.2M</span>
                </div>

                {/* SVG Chart Mock */}
                <div className="relative h-[80px] w-full mb-6">
                    <svg viewBox="0 0 300 80" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                        {/* Dashed background line */}
                        <line x1="0" y1="65" x2="300" y2="65" stroke="#E5E7EB" strokeWidth="1" strokeDasharray="4 4" />

                        {/* Line path */}
                        <path d="M0,50 L40,48 L80,45 L120,55 L160,53 L200,53 L240,15 L280,50" fill="none" stroke="#2563EB" strokeWidth="2.5" />

                        {/* Dots */}
                        <circle cx="240" cy="15" r="3.5" fill="#EF4444" />
                    </svg>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                        <span className="text-[11px] font-medium text-neutral-500">Daily</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="text-neutral-400 font-bold leading-none">-</span>
                        <span className="text-[11px] font-medium text-neutral-500">7d Avg</span>
                    </div>
                </div>
            </div>

            {/* Bottom 2 Cards Grid */}
            <div className="grid grid-cols-2 gap-3">
                {/* Commitment Pressure */}
                <div className="bg-white rounded-[24px] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-neutral-100 flex flex-col justify-between min-h-[110px]">
                    <div className="flex items-center gap-1.5 mb-2">
                        <span className="text-[13px] font-bold text-neutral-900 leading-tight">Commitment Pressure</span>
                        <Info className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    </div>

                    <div>
                        <div className="h-2 w-full bg-red-100 rounded-full overflow-hidden mb-2">
                            <div className="h-full bg-red-500 w-[75%] rounded-full"></div>
                        </div>
                        <span className="text-[11px] font-bold text-red-500">Financial pressure increasing</span>
                    </div>
                </div>

                {/* Stability Index */}
                <div className="bg-white rounded-[24px] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-neutral-100 flex flex-col justify-between min-h-[110px]">
                    <div className="flex items-center gap-1.5 mb-2">
                        <span className="text-[13px] font-bold text-neutral-900 leading-tight">Stability Index</span>
                        <Info className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    </div>

                    <div>
                        <div className="text-[22px] font-bold text-orange-500 leading-none mb-1">2.8x</div>
                        <div className="text-[11px] font-bold text-orange-500 mb-0.5">High Volatility</div>
                        <div className="text-[10px] font-medium text-neutral-400 mb-1.5 truncate">Based on 7d behavior</div>
                        <div className="text-[9px] font-bold text-red-500 tracking-wider uppercase">SPIKE RISK DETECTED</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
