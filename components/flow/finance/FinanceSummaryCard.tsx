import React from "react";
import clsx from "clsx";

const ICON_BG_DARK_MAP: Record<string, string> = {
    "bg-red-100": "dark:bg-red-500/15",
    "bg-green-100": "dark:bg-green-500/15",
    "bg-blue-100": "dark:bg-blue-500/15",
    "bg-orange-100": "dark:bg-orange-500/15",
    "bg-purple-100": "dark:bg-purple-500/15",
    "bg-rose-100": "dark:bg-rose-500/15",
    "bg-neutral-100": "dark:bg-neutral-800",
    "bg-emerald-100": "dark:bg-emerald-500/15",
    "bg-yellow-100": "dark:bg-yellow-500/15",
    "bg-indigo-100": "dark:bg-indigo-500/15",
};

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
    const darkIconBg = ICON_BG_DARK_MAP[iconBg] || "dark:bg-neutral-800";
    return (
        <div
            onClick={onClick}
            className={clsx(
                "bg-white dark:bg-neutral-900 rounded-[24px] p-4 flex flex-col justify-between shadow-[0_2px_12px_rgba(0,0,0,0.03)] dark:shadow-none border transition-all duration-200 min-w-[200px] md:min-w-[150px] flex-1 shrink-0",
                onClick ? "cursor-pointer active:scale-95 hover:shadow-md dark:hover:shadow-neutral-900/50" : "",
                isActive ? clsx("ring-2 border-transparent", activeColor) : "border-neutral-100 dark:border-neutral-800"
            )}
        >
            <div className="flex items-center justify-between mb-4">
                <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center shrink-0", iconBg, darkIconBg)}>
                    {icon}
                </div>
                <span className={clsx("text-xl font-bold tracking-tight font-numeric", valueColor, valueColor === "text-neutral-900" && "dark:text-white")}>
                    {value}
                </span>
            </div>

            <div className="flex flex-col gap-0.5">
                <span className="text-[12px] font-medium text-neutral-400 dark:text-neutral-500">{label}</span>
                <span className="text-[15px] font-bold text-neutral-900 dark:text-white tracking-tight">{subtext}</span>
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
