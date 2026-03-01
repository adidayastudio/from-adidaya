import React from "react";
import clsx from "clsx";

export interface FinanceItemCardProps {
    title: string;
    amount: string | number;
    projectCode: string;
    idRef: string;
    date: string;
    status: string;
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
    onClick,
    actions
}: FinanceItemCardProps) {

    const getStatusTheme = (s: string) => {
        const lower = s.toLowerCase();
        if (lower === "approved" || lower === "paid") {
            return {
                text: "text-blue-600",
                bg: "bg-blue-50/50",
                border: "border-blue-100/50"
            };
        }
        if (lower === "rejected" || lower === "cancelled") {
            return {
                text: "text-rose-600",
                bg: "bg-rose-50/50",
                border: "border-rose-100/50"
            };
        }
        if (lower === "submitted" || lower === "pending" || lower === "unpaid" || lower === "revise") {
            return {
                text: "text-orange-600",
                bg: "bg-orange-50/50",
                border: "border-orange-100/50"
            };
        }
        return {
            text: "text-neutral-500",
            bg: "bg-neutral-50/50",
            border: "border-neutral-200/50"
        };
    };

    const theme = getStatusTheme(status);

    return (
        <div
            onClick={onClick}
            className={clsx(
                "group relative bg-white/70 backdrop-blur-2xl backdrop-saturate-[1.8] rounded-[24px] p-5 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.08)] border border-white/60 flex flex-col gap-4 transition-all duration-300",
                onClick && "active:scale-[0.98] cursor-pointer hover:bg-white/80 hover:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.12)]"
            )}
        >
            {/* Rim light effect */}
            <div className="absolute inset-0 rounded-[24px] border border-black/[0.02] pointer-events-none" />

            <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1.5 min-w-0">
                    <h3 className="text-[16px] font-bold text-neutral-900 tracking-tight leading-snug line-clamp-2">{title}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-neutral-900/5 text-neutral-500 uppercase tracking-wider border border-black/[0.03]">
                            {projectCode}
                        </span>
                        <span className="text-[12px] font-medium text-neutral-400 tabular-nums">
                            {idRef} • {date}
                        </span>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0 ml-4">
                    <span className="text-[17px] font-bold text-neutral-900 tracking-tight tabular-nums">
                        {typeof amount === 'number' ? `Rp ${amount.toLocaleString('id-ID')}` : amount}
                    </span>
                    <span className={clsx("px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide border uppercase", theme.text, theme.bg, theme.border)}>
                        {status}
                    </span>
                </div>
            </div>

            {actions && (
                <div className="flex items-center gap-2 pt-1 mt-auto border-t border-black/[0.03]">
                    {actions}
                </div>
            )}
        </div>
    );
}
