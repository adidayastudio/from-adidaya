import React from "react";
import clsx from "clsx";
import { formatCardDate, formatStructuredId } from "./modules/utils";
import { Check } from "lucide-react";


export interface FinanceItemCardProps {
    item?: any;
    title?: string;
    amount?: string | number;
    projectCode?: string;
    idRef?: string;
    date?: string;
    status?: string;
    priority?: string;
    onClick?: () => void;
    onActionClick?: (e: React.MouseEvent, action: string) => void;
    actions?: React.ReactNode;
    selectable?: boolean;
    selected?: boolean;
    onSelect?: (selected: boolean) => void;
}

export function FinanceItemCard({
    item,
    title: propTitle,
    amount: propAmount,
    projectCode: propProjectCode,
    idRef: propIdRef,
    date: propDate,
    status: propStatus,
    priority: propPriority,
    onClick,
    onActionClick,
    actions: propActions,
    selectable,
    selected,
    onSelect
}: FinanceItemCardProps) {
    // Helper to format currency
    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(val).replace('Rp', 'Rp ');
    };


    // Derived values from item or props
    const title = propTitle || (item?.items && item.items.length > 0 ? item.items[0].name : item?.description) || "Untitled Request";
    const amount = propAmount !== undefined ? propAmount : (item?.approved_amount || item?.amount || 0);
    const displayAmount = typeof amount === 'number' ? formatCurrency(amount) : amount;

    const projectCode = propProjectCode || item?.project?.project_code || item?.project_code || 'GEN';

    const idRef = propIdRef || (item ? formatStructuredId(
        (item.vendor || item.purchase_stage || item.approval_status === 'DRAFT' && !item.category) ? 'PO' : 'RE',
        item.project?.project_number || item.project_number,
        item.request_number,
        item.project?.project_code || item.project_code
    ) : '');

    const date = propDate || (item?.date || item?.created_at ? formatCardDate(item.date || item.created_at) : '');
    const status = propStatus || item?.status || item?.approval_status || '';
    const priority = propPriority || item?.priority || '';

    const getStatusTheme = (s: string) => {
        if (!s) return {
            text: "text-neutral-500 dark:text-neutral-400",
            bg: "bg-neutral-50/50 dark:bg-neutral-800/50",
            border: "border-neutral-200/50 dark:border-neutral-700/50"
        };
        const lower = s.toLowerCase();
        if (lower === "approved") {
            return {
                text: "text-emerald-600 dark:text-emerald-400",
                bg: "bg-emerald-50/50 dark:bg-emerald-500/10",
                border: "border-emerald-100/50 dark:border-emerald-500/20"
            };
        }
        if (lower === "paid") {
            return {
                text: "text-blue-600 dark:text-blue-400",
                bg: "bg-blue-50/50 dark:bg-blue-500/10",
                border: "border-blue-100/50 dark:border-blue-500/20"
            };
        }
        if (lower === "partially paid" || lower === "partially_paid") {
            return {
                text: "text-indigo-600 dark:text-indigo-400",
                bg: "bg-indigo-50/50 dark:bg-indigo-500/10",
                border: "border-indigo-100/50 dark:border-indigo-500/20"
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
        if (lower === "urgent") return "!bg-blue-50/50 dark:!bg-blue-900/20 !border-blue-500/30 dark:!border-blue-500/30";
        if (lower === "high") return "!bg-orange-50/50 dark:!bg-orange-900/20 !border-orange-500/30 dark:!border-orange-500/30";
        return "";
    };

    return (
        <div
            onClick={onClick}
            className={clsx(
                "group relative bg-white/40 dark:bg-neutral-900/40 backdrop-blur-3xl backdrop-saturate-[1.8] rounded-[24px] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.04)] dark:shadow-none border transition-all duration-300",
                selected ? "border-blue-500 shadow-[0_8px_32px_rgba(59,130,246,0.08)] bg-white/60 dark:bg-neutral-800/60" : "border-white/60 dark:border-neutral-800",
                getPriorityClasses(priority),
                onClick && "active:scale-[0.98] cursor-pointer hover:bg-white/60 dark:hover:bg-neutral-800/60 hover:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.12)] dark:hover:shadow-neutral-900/50"
            )}
        >
            {/* Rim light effect */}
            <div className="absolute inset-0 rounded-[24px] border border-black/[0.02] dark:border-white/[0.02] pointer-events-none" />

            <div className="flex items-start gap-4 h-full w-full">
                {selectable && (
                    <div 
                        onClick={(e) => {
                            e.stopPropagation();
                            onSelect?.(!selected);
                        }}
                        className={clsx(
                            "w-5 h-5 rounded-full border flex items-center justify-center transition-all duration-200 cursor-pointer shrink-0 mt-1.5",
                            selected 
                                ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20" 
                                : "border-neutral-300 dark:border-neutral-600 bg-white/80 dark:bg-neutral-800/80 hover:border-blue-500"
                        )}
                    >
                        {selected && <Check className="w-3.5 h-3.5 stroke-[3.5]" />}
                    </div>
                )}

                <div className="flex-1 min-w-0 flex flex-col gap-4">
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
                            {item?.financial_status === "PARTIALLY_PAID" && item?.paid_amount ? (
                                <div className="text-right flex flex-col items-end gap-0.5">
                                    <span className="text-[14px] font-black text-indigo-600 dark:text-indigo-400 tabular-nums">
                                        {formatCurrency((item.approved_amount || item.amount || 0) - item.paid_amount)} <span className="text-[9px] font-bold opacity-80">left</span>
                                    </span>
                                    <span className="text-[10px] font-medium text-neutral-400 dark:text-neutral-500 tabular-nums">
                                        of {formatCurrency(item.approved_amount || item.amount || 0)}
                                    </span>
                                </div>
                            ) : (
                                <span className="text-[17px] font-bold text-neutral-900 dark:text-white tracking-tight tabular-nums">
                                    {displayAmount}
                                </span>
                            )}
                            {status && (
                                <span className={clsx("px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide border uppercase", theme.text, theme.bg, theme.border)}>
                                    {status}
                                </span>
                            )}
                        </div>
                    </div>

                    {propActions && (
                        <div className="flex items-center gap-2 mt-auto">
                            {propActions}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
