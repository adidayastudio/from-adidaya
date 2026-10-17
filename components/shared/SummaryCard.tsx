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
    activeColor,
    activeBg,
    className
}: {
    icon: React.ReactNode;
    iconBg: string;
    label: string;
    value: React.ReactNode;
    subtext?: string;
    trend?: 'up' | 'down';
    onClick?: () => void;
    isActive?: boolean;
    activeColor?: string;
    activeBg?: string;
    className?: string;
}) {
    return (
        <div
            onClick={onClick}
            className={clsx(
                "rounded-[24px] p-4 flex flex-col justify-between shadow-[0_2px_12px_rgba(0,0,0,0.02)] dark:shadow-none transition-all duration-200 min-w-[160px] lg:w-full h-[130px] lg:h-auto flex-1 shrink-0 cursor-pointer",
                onClick ? "hover:shadow-md dark:hover:shadow-neutral-900/50 active:scale-95" : "",
                isActive
                    ? clsx(activeBg || "bg-blue-50/80 dark:bg-blue-950/30", "border border-transparent dark:border-transparent")
                    : "bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800",
                className
            )}
        >
            <div className="flex items-center justify-between mb-2 lg:mb-4">
                <div className={clsx(
                    "w-8 h-8 flex items-center justify-center shrink-0 [&_svg]:w-4 [&_svg]:h-4 lg:[&_svg]:w-5 lg:[&_svg]:h-5 transition-all duration-200", 
                    isActive 
                        ? "bg-transparent [&_svg]:!text-white" 
                        : clsx("rounded-full", iconBg)
                )}>
                    {icon}
                </div>
                <span className={clsx("text-lg lg:text-xl font-bold tracking-tight font-numeric whitespace-nowrap shrink-0 ml-auto pl-2 text-right", isActive ? "text-white" : "text-neutral-900 dark:text-white")}>
                    {value}
                </span>
            </div>

            <div className="flex flex-col gap-0.5">
                <span className={clsx(
                    subtext 
                        ? "text-[11px] lg:text-[12px] font-medium" 
                        : "text-xs lg:text-sm font-semibold",
                    isActive ? "text-white/80" : "text-neutral-400 dark:text-neutral-500"
                )}>
                    {label}
                </span>
                {subtext && (
                    <span className={clsx("text-xs lg:text-[15px] font-bold tracking-tight truncate", isActive ? "text-white" : "text-neutral-900 dark:text-white")}>
                        {subtext}
                    </span>
                )}
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
