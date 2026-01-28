"use client";

import { CreditCard, Eye, Pencil, Trash2, Ban } from "lucide-react";
import clsx from "clsx";
import { PurchasingItem, ReimburseRequest } from "@/lib/types/finance-types";
import { formatCurrency, formatDate, formatStatus, STATUS_THEMES, getPrimaryStatus, cleanEntityName } from "./utils";

interface PersonalPurchaseRowProps {
    item: PurchasingItem;
    onPay?: (item: PurchasingItem) => void;
}

export function PersonalPurchaseRow({ item, onPay }: PersonalPurchaseRowProps) {
    const primaryStatus = getPrimaryStatus(
        item.approval_status,
        item.purchase_stage,
        item.financial_status
    );
    const theme = STATUS_THEMES[primaryStatus];

    return (
        <div className="group hover:bg-white/60 hover:shadow-[0_8px_32px_rgba(0,0,0,0.04)] transition-all duration-300 cursor-pointer border-b border-neutral-50 last:border-0 rounded-xl flex items-center gap-4 px-4 py-3">
            {/* DATE */}
            <div className="w-20 shrink-0 text-[11px] font-medium text-neutral-400 tabular-nums">
                {formatDate(item.date)}
            </div>

            {/* PROJECT & DESCRIPTION */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                    <span className="shrink-0 text-[9px] font-black text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded tracking-tighter uppercase border border-neutral-200/50">
                        {item.project_code}
                    </span>
                    <span className="text-xs font-bold text-neutral-900 truncate">
                        {cleanEntityName(item.project_name)}
                    </span>
                </div>
                <div className="text-[12px] font-medium text-neutral-600 truncate mb-0.5">
                    {item.description}
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 font-medium">
                    <span className="text-neutral-500">{item.quantity} {item.unit}</span>
                    <span className="text-neutral-200">•</span>
                    <span className="truncate max-w-[120px]">{cleanEntityName(item.vendor)}</span>
                </div>
            </div>

            {/* AMOUNT & STATUS */}
            <div className="flex flex-col items-end shrink-0 gap-1.5 min-w-[110px]">
                <div className="text-[13px] font-black text-neutral-900 tabular-nums tracking-tight">
                    {formatCurrency(item.amount)}
                </div>
                <span className={clsx(
                    "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm border border-white/10",
                    theme.bg, theme.text
                )}>
                    {primaryStatus}
                </span>
            </div>

            {/* ACTIONS (Hover Only) */}
            <div className="hidden sm:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 shrink-0">
                <button onClick={(e) => { e.stopPropagation(); onPay?.(item); }} className="p-1.5 text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-all">
                    <Eye className="w-4 h-4" strokeWidth={2} />
                </button>
            </div>
        </div>
    );
}

interface PersonalReimburseRowProps {
    item: ReimburseRequest;
}

export function PersonalReimburseRow({ item }: PersonalReimburseRowProps) {
    const theme = STATUS_THEMES[item.status];

    return (
        <div className="group hover:bg-white/60 hover:shadow-[0_8px_32px_rgba(0,0,0,0.04)] transition-all duration-300 cursor-pointer border-b border-neutral-50 last:border-0 rounded-xl flex items-center gap-4 px-4 py-3">
            {/* DATE */}
            <div className="w-20 shrink-0 text-[11px] font-medium text-neutral-400 tabular-nums">
                {formatDate(item.created_at)}
            </div>

            {/* PROJECT & DESCRIPTION */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                    <span className="shrink-0 text-[9px] font-black text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded tracking-tighter uppercase border border-neutral-200/50">
                        {item.project_code}
                    </span>
                    <span className="text-xs font-bold text-neutral-900 truncate">
                        {cleanEntityName(item.project_name)}
                    </span>
                </div>
                <div className="text-[12px] font-medium text-neutral-600 truncate">
                    {item.description}
                </div>
                {item.category && (
                    <div className="text-[10px] text-neutral-400 font-medium">
                        {item.category}
                    </div>
                )}
            </div>

            {/* AMOUNT & STATUS */}
            <div className="flex flex-col items-end shrink-0 gap-1.5 min-w-[110px]">
                <div className="text-[13px] font-black text-neutral-900 tabular-nums tracking-tight">
                    {formatCurrency(item.amount)}
                </div>
                <span className={clsx(
                    "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm border border-white/10",
                    theme.bg, theme.text
                )}>
                    {item.status}
                </span>
            </div>

            {/* ACTIONS (Hover Only) */}
            <div className="hidden sm:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 shrink-0">
                <button className="p-1.5 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all">
                    <Eye className="w-4 h-4" strokeWidth={2} />
                </button>
            </div>
        </div>
    );
}

