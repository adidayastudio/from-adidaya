import React from "react";
import clsx from "clsx";

export interface LiquidSummaryCardProps {
    icon: React.ReactNode;
    iconBg?: string; // e.g. "bg-green-100"
    label: string;
    value: React.ReactNode;
    subtext?: React.ReactNode;
    valueColor?: string; // e.g. "text-red-500"
    onClick?: () => void;
    className?: string;
}

export function LiquidSummaryCard({
    icon,
    iconBg = "bg-neutral-100",
    label,
    value,
    subtext,
    valueColor = "text-neutral-900",
    onClick,
    className
}: LiquidSummaryCardProps) {
    return (
        <div
            onClick={onClick}
            className={clsx(
                "bg-white rounded-[24px] p-4 flex flex-col justify-between shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-neutral-100 min-w-[150px] flex-1",
                onClick && "active:scale-[0.98] transition-transform cursor-pointer",
                className
            )}
        >
            <div className="flex items-center justify-between mb-4 gap-2">
                <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center shrink-0", iconBg)}>
                    {icon}
                </div>
                <div className={clsx("text-xl font-bold tracking-tight font-numeric text-right", valueColor)}>
                    {value}
                </div>
            </div>

            <div className="flex flex-col gap-0.5">
                <span className="text-[12px] font-medium text-neutral-400">{label}</span>
                {subtext && (
                    <span className="text-[15px] font-bold text-neutral-900 tracking-tight">{subtext}</span>
                )}
            </div>
        </div>
    );
}

export function LiquidSummaryCardsRow({ children, className }: { children: React.ReactNode, className?: string }) {
    return (
        <div className={clsx("grid grid-cols-2 gap-3 px-5 mb-8", className)}>
            {children}
        </div>
    );
}
