import React from "react";
import clsx from "clsx";

export function FinanceSummaryCard({
    icon,
    iconBg,
    label,
    value,
    subtext,
    valueColor = "text-neutral-900",
    onClick,
    isActive,
    activeColor = "ring-red-500"
}: {
    icon: React.ReactNode;
    iconBg: string;
    label: string;
    value: string | number;
    subtext: string;
    valueColor?: string;
    onClick?: () => void;
    isActive?: boolean;
    activeColor?: string;
}) {
    return (
        <div
            onClick={onClick}
            className={clsx(
                "bg-white rounded-[24px] p-4 flex flex-col justify-between shadow-[0_2px_12px_rgba(0,0,0,0.03)] border transition-all duration-200 min-w-[200px] md:min-w-[150px] flex-1 shrink-0",
                onClick ? "cursor-pointer active:scale-95 hover:shadow-md" : "",
                isActive ? clsx("ring-2 border-transparent", activeColor) : "border-neutral-100"
            )}
        >
            <div className="flex items-center justify-between mb-4">
                <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center shrink-0", iconBg)}>
                    {icon}
                </div>
                <span className={clsx("text-xl font-bold tracking-tight font-numeric", valueColor)}>
                    {value}
                </span>
            </div>

            <div className="flex flex-col gap-0.5">
                <span className="text-[12px] font-medium text-neutral-400">{label}</span>
                <span className="text-[15px] font-bold text-neutral-900 tracking-tight">{subtext}</span>
            </div>
        </div>
    );
}

export function FinanceSummaryCardsRow({ children, className }: { children: React.ReactNode, className?: string }) {
    return (
        <div className={clsx(
            "flex overflow-x-auto gap-4 px-5 mb-8 no-scrollbar pt-2 pb-4", // Mobile: Scrollable flex
            "md:grid md:grid-cols-2 lg:grid-cols-4 md:overflow-visible md:pt-0 md:pb-0", // Desktop: Grid
            className
        )}>
            {children}
        </div>
    );
}
