import React from "react";
import clsx from "clsx";

export interface FinanceItemCardProps {
    title: string;
    amount: string | number;
    projectCode: string;
    idRef: string;
    date: string;
    status: string;
    priority?: string;
    onClick?: () => void;
    actions?: React.ReactNode;
}

export function FinanceItemCard({
    title,
    amount,
    projectCode,
    idRef,
    date,
    status,
    priority,
    onClick,
    actions
}: FinanceItemCardProps) {

    const getStatusTheme = (s: string) => {
        if (!s) return {
            text: "text-neutral-500 dark:text-neutral-400",
            bg: "bg-neutral-50/50 dark:bg-neutral-800/50",
            border: "border-neutral-200/50 dark:border-neutral-700/50"
        };
        const lower = s.toLowerCase();
        if (lower === "approved" || lower === "paid") {
            return {
                text: "text-blue-600 dark:text-blue-400",
                bg: "bg-blue-50/50 dark:bg-blue-500/10",
                border: "border-blue-100/50 dark:border-blue-500/20"
            };
        }
        if (lower === "rejected" || lower === "cancelled") {
            return {
                text: "text-rose-600 dark:text-rose-400",
                bg: "bg-rose-50/50 dark:bg-rose-500/10",
                border: "border-rose-100/50 dark:border-rose-500/20"
            };
        }
        if (lower === "submitted" || lower === "pending" || lower === "unpaid" || lower === "revise") {
            return {
                text: "text-orange-600 dark:text-orange-400",
                bg: "bg-orange-50/50 dark:bg-orange-500/10",
                border: "border-orange-100/50 dark:border-orange-500/20"
            };
        }
        return {
            text: "text-neutral-500 dark:text-neutral-400",
            bg: "bg-neutral-50/50 dark:bg-neutral-800/50",
            border: "border-neutral-200/50 dark:border-neutral-700/50"
        };
    };

    const theme = getStatusTheme(status);

    const getPriorityClasses = (p?: string) => {
        if (!p) return "";
        const lower = p.toLowerCase();
        if (lower === "urgent") return "!bg-red-50/50 dark:!bg-red-900/20 !border-red-500/30 dark:!border-red-500/30";
        if (lower === "high") return "!bg-orange-50/50 dark:!bg-orange-900/20 !border-orange-500/30 dark:!border-orange-500/30";
        return "";
    };

    return (
        <div
            onClick={onClick}
            className={clsx(
                "group relative bg-white/40 dark:bg-neutral-900/40 backdrop-blur-3xl backdrop-saturate-[1.8] rounded-[24px] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.04)] dark:shadow-none border border-white/60 dark:border-neutral-800 flex flex-col gap-4 transition-all duration-300",
                getPriorityClasses(priority),
                onClick && "active:scale-[0.98] cursor-pointer hover:bg-white/60 dark:hover:bg-neutral-800/60 hover:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.12)] dark:hover:shadow-neutral-900/50"
            )}
        >
            {/* Rim light effect */}
            <div className="absolute inset-0 rounded-[24px] border border-black/[0.02] dark:border-white/[0.02] pointer-events-none" />

            <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1.5 min-w-0">
                    <h3 className="text-[16px] font-bold text-neutral-900 dark:text-white tracking-tight leading-snug line-clamp-2">{title}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-neutral-900/5 dark:bg-white/5 text-neutral-500 dark:text-neutral-400 uppercase tracking-wider border border-black/[0.03] dark:border-white/[0.05]">
                            {projectCode}
                        </span>
                        <span className="text-[12px] font-medium text-neutral-400 dark:text-neutral-500 tabular-nums">
                            {idRef} • {date}
                        </span>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0 ml-4">
                    <span className="text-[17px] font-bold text-neutral-900 dark:text-white tracking-tight tabular-nums">
                        {typeof amount === 'number' ? `Rp ${amount.toLocaleString('id-ID')}` : amount}
                    </span>
                    <span className={clsx("px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide border uppercase", theme.text, theme.bg, theme.border)}>
                        {status}
                    </span>
                </div>
            </div>

            {actions && (
                <div className="flex items-center gap-2 mt-auto">
                    {actions}
                </div>
            )}
        </div>
    );
}
