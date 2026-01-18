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
    return (
        <div className="group hover:bg-white/60 hover:shadow-[0_8px_32px_rgba(0,0,0,0.04)] transition-all duration-300 cursor-pointer border-b border-neutral-50 last:border-0 rounded-xl grid grid-cols-[100px_1.5fr_2fr_1fr_100px_90px] items-center gap-4 px-6 py-4">
            <div className="whitespace-nowrap">
                <div className="text-[12px] font-normal text-neutral-500 tabular-nums">
                    {formatDate(item.date)}
                </div>
            </div>
            <div>
                <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-neutral-400 bg-neutral-100/60 px-1 py-0.5 rounded border border-neutral-200/30 w-fit tracking-tight">
                        {item.project_code}
                    </span>
                    <span className="text-[12px] font-medium text-neutral-900 truncate max-w-[150px]">
                        {cleanEntityName(item.project_name)}
                    </span>
                </div>
            </div>
            <div className="min-w-0">
                <div className="text-[12px] font-semibold text-neutral-900 tracking-tight leading-tight mb-0.5 truncate">
                    {item.description}
                </div>
                <div className="text-[10px] text-neutral-400 flex items-center gap-1.5 font-normal">
                    <span className="text-neutral-500 font-medium">{item.quantity} {item.unit}</span>
                    <span className="text-neutral-300">•</span>
                    <span className="tracking-tight">{cleanEntityName(item.vendor)}</span>
                </div>
            </div>
            <div className="text-right">
                <div className="text-[12px] font-bold text-neutral-900 tabular-nums tracking-tight">
                    {formatCurrency(item.amount)}
                </div>
            </div>
            <div className="text-center">
                {(() => {
                    const primaryStatus = getPrimaryStatus(
                        item.approval_status,
                        item.purchase_stage,
                        item.financial_status
                    );
                    const theme = STATUS_THEMES[primaryStatus];
                    return (
                        <span className={clsx(
                            "px-1.5 py-0.5 rounded-full text-[10px] font-bold w-full block text-center uppercase tracking-widest shadow-sm backdrop-blur-md border border-white/10",
                            theme.bg, theme.text
                        )}>
                            {primaryStatus}
                        </span>
                    );
                })()}
            </div>
            <div className="text-right">
                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <button className="p-1.5 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all" title="Edit">
                        <Pencil className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                    <button className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all" title="Delete">
                        <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                    <div className="w-px h-4 bg-neutral-100 mx-1" />
                    <button onClick={(e) => { e.stopPropagation(); onPay?.(item); }} className="p-1.5 text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-all" title="View Details">
                        <Eye className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                </div>
            </div>
        </div>
    );
}

interface PersonalReimburseRowProps {
    item: ReimburseRequest;
}

export function PersonalReimburseRow({ item }: PersonalReimburseRowProps) {
    return (
        <div className="group hover:bg-white/60 hover:shadow-[0_8px_32px_rgba(0,0,0,0.04)] transition-all duration-300 cursor-pointer border-b border-neutral-50 last:border-0 rounded-xl grid grid-cols-[100px_1.5fr_2fr_1fr_100px_90px] items-center gap-4 px-6 py-4">
            <div className="whitespace-nowrap text-[12px] font-normal text-neutral-500 tabular-nums">
                {formatDate(item.created_at)}
            </div>
            <div>
                <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-neutral-400 bg-neutral-100/60 px-1 py-0.5 rounded border border-neutral-200/30 w-fit tracking-tight">
                        {item.project_code}
                    </span>
                    <span className="text-[12px] font-medium text-neutral-900 truncate max-w-[150px]">
                        {cleanEntityName(item.project_name)}
                    </span>
                </div>
            </div>
            <div className="min-w-0">
                <div className="text-[12px] font-semibold text-neutral-900 tracking-tight leading-tight truncate">
                    {item.description}
                </div>
            </div>
            <div className="text-right">
                <div className="text-[12px] font-bold text-neutral-900 tabular-nums tracking-tight">
                    {formatCurrency(item.amount)}
                </div>
            </div>
            <div className="text-center">
                <span className={clsx(
                    "px-1.5 py-0.5 rounded-full text-[10px] font-bold w-full block text-center uppercase tracking-widest shadow-sm backdrop-blur-md border border-white/10",
                    STATUS_THEMES[item.status].bg, STATUS_THEMES[item.status].text
                )}>
                    {item.status}
                </span>
            </div>
            <div className="text-right">
                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <button className="p-1.5 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all" title="View Details">
                        <Eye className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                </div>
            </div>
        </div>
    );
}

