
import { clsx } from "clsx";
import { TrendingUp, TrendingDown } from "lucide-react";
import React from "react";

// Global Glass Card Component
export function GlassCard({
    children,
    className
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div
            className={clsx("rounded-3xl bg-white/60 p-5 backdrop-blur-xl border border-white/50 shadow-sm transition-all duration-300", className)}
        >
            {children}
        </div>
    );
}

// iOS Glass Liquid Card Style
export function SummaryCard({
    icon,
    iconBg,
    label,
    value,
    subtext,
    trend
}: {
    icon: React.ReactNode;
    iconBg: string;
    label: string;
    value: string;
    subtext?: string;
    trend?: 'up' | 'down';
}) {
    return (
        <div
            className="relative overflow-hidden rounded-3xl bg-white p-5 shadow-[0_2px_4px_rgba(0,0,0,0.02)] border border-neutral-100/50 backdrop-blur-xl transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(0,0,0,0.06)] hover:border-neutral-200/60 group"
        >
            <div className="relative z-10 flex flex-col h-full justify-between">
                <div className="flex items-start justify-between mb-4">
                    <div className={clsx("p-2.5 rounded-xl transition-colors duration-300", iconBg)}>
                        {icon}
                    </div>
                    {trend && (
                        <span className={clsx(
                            "text-xs font-medium px-2 py-1 rounded-full flex items-center gap-0.5",
                            trend === 'up' ? "text-green-600 bg-green-50" : "text-red-600 bg-red-50"
                        )}>
                            {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            2.5%
                        </span>
                    )}
                </div>

                <div>
                    <h3 className="text-2xl font-bold text-neutral-900 tracking-tight mb-1 font-numeric">{value}</h3>
                    <div className="flex flex-col">
                        <span className="text-sm font-medium text-neutral-600">{label}</span>
                        {subtext && <span className="text-xs text-neutral-400 mt-0.5 font-medium">{subtext}</span>}
                    </div>
                </div>
            </div>
        </div>
    );
}
