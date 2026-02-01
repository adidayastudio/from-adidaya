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

// iOS Glass Liquid Card Style - Compact on mobile
export function SummaryCard({
    icon,
    iconBg,
    label,
    value,
    subtext,
    trend,
    onClick,
    isActive,
    activeColor
}: {
    icon: React.ReactNode;
    iconBg: string;
    label: string;
    value: string | number;
    subtext?: string;
    trend?: 'up' | 'down';
    onClick?: () => void;
    isActive?: boolean;
    activeColor?: string;
}) {
    return (
        <div
            onClick={onClick}
            className={clsx(
                "relative overflow-hidden rounded-2xl lg:rounded-3xl p-3 lg:p-5 shadow-sm border backdrop-blur-xl transition-all duration-300 ease-out lg:hover:-translate-y-1 lg:hover:shadow-[0_12px_24px_rgba(0,0,0,0.06)] group min-w-[140px] lg:min-w-0 cursor-pointer",
                isActive
                    ? clsx("bg-white border-transparent ring-2 ring-offset-2", activeColor || "ring-neutral-900")
                    : "bg-white/90 lg:bg-white border-neutral-100/50 hover:border-neutral-200/60"
            )}
        >
            <div className="relative z-10 flex flex-col h-full justify-between">
                {/* Mobile: inline layout, Desktop: stacked */}
                <div className="flex items-center gap-2 lg:items-start lg:justify-between lg:mb-4">
                    <div className={clsx("p-1.5 lg:p-2.5 rounded-lg lg:rounded-xl transition-colors duration-300 shrink-0 [&_svg]:w-4 [&_svg]:h-4 lg:[&_svg]:w-5 lg:[&_svg]:h-5", iconBg)}>
                        {icon}
                    </div>
                    {/* Desktop trend badge */}
                    {trend && (
                        <span className={clsx(
                            "hidden lg:flex text-xs font-medium px-2 py-1 rounded-full items-center gap-0.5",
                            trend === 'up' ? "text-green-600 bg-green-50" : "text-red-600 bg-red-50"
                        )}>
                            {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            2.5%
                        </span>
                    )}
                    {/* Mobile: value inline */}
                    <span className="lg:hidden text-lg font-bold text-neutral-900 tracking-tight font-numeric">{value}</span>
                </div>

                <div className="mt-1 lg:mt-0">
                    {/* Desktop: large value */}
                    <h3 className="hidden lg:block text-2xl font-bold text-neutral-900 tracking-tight mb-1 font-numeric">{value}</h3>
                    <div className="flex flex-col">
                        <span className="text-[11px] lg:text-sm font-medium text-neutral-500 lg:text-neutral-600">{label}</span>
                        {subtext && <span className="hidden lg:block text-xs text-neutral-400 mt-0.5 font-medium">{subtext}</span>}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Horizontal scrollable wrapper for mobile summary cards
export function SummaryCardsRow({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <>
            {/* Mobile: horizontal scroll */}
            <div className="lg:hidden -mx-4 overflow-x-auto scrollbar-hide py-2">
                <div className="flex gap-3 px-4 w-max">
                    {children}
                </div>
            </div>

            {/* Desktop: grid */}
            <div className={clsx("hidden lg:grid gap-6", className || "lg:grid-cols-4")}>
                {children}
            </div>
        </>
    );
}
