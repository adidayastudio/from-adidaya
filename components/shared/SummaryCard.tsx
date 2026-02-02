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
                {/* Desktop: Top Row (Icon Left, Value Right) */}
                <div className="flex items-center justify-between mb-2">
                    <div className={clsx("p-1.5 lg:p-2 rounded-lg lg:rounded-xl transition-colors duration-300 shrink-0 [&_svg]:w-4 [&_svg]:h-4 lg:[&_svg]:w-5 lg:[&_svg]:h-5", iconBg)}>
                        {icon}
                    </div>
                    {/* Desktop: Value Top Right */}
                    <h3 className="hidden lg:block text-3xl font-bold text-neutral-900 tracking-tight font-numeric leading-none">{value}</h3>

                    {/* Mobile: Value Inline */}
                    <span className="lg:hidden text-lg font-bold text-neutral-900 tracking-tight font-numeric">{value}</span>
                </div>

                {/* Bottom Row: Label + Nominal */}
                <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] lg:text-sm font-medium text-neutral-500">{label}</span>
                    {subtext && (
                        <span className="block text-sm lg:text-base font-bold text-neutral-900 font-numeric mt-0.5 tracking-tight truncate">
                            {subtext}
                        </span>
                    )}
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
