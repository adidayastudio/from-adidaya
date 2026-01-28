"use client";

import { CreditCard, Eye, Pencil, Trash2, Ban } from "lucide-react";
import clsx from "clsx";
import { PurchasingItem, ReimburseRequest } from "@/lib/types/finance-types";
import { formatCurrency, formatDate, formatStatus, STATUS_THEMES, getPrimaryStatus, cleanEntityName } from "./utils";

interface PersonalPurchaseRowProps {
    item: PurchasingItem;
    onPay?: (item: PurchasingItem) => void;
}

export function PersonalPurchaseRow({ item }: PersonalPurchaseRowProps) {
    const primaryStatus = getPrimaryStatus(
        item.approval_status,
        item.purchase_stage,
        item.financial_status
    );
    const theme = STATUS_THEMES[primaryStatus];

    // Naturalize category type
    const naturalType = (item.type || 'MATERIAL')
        .replace(/_/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');

    return (
        <div className="group hover:bg-white/60 hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-all duration-300 cursor-pointer border-b border-neutral-50 last:border-0 rounded-xl px-4 py-2.5 flex flex-col gap-0.5">
            {/* LINE 1: ITEM | HARGA | STATUS */}
            <div className="flex items-center justify-between gap-4">
                <span className="text-[13px] font-bold text-neutral-900 truncate flex-1 leading-tight">
                    {item.description}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[13px] font-black text-neutral-900 tabular-nums">
                        {formatCurrency(item.amount)}
                    </span>
                    <span className={clsx(
                        "px-1.5 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-widest border border-white/10",
                        theme.bg, theme.text
                    )}>
                        {primaryStatus}
                    </span>
                </div>
            </div>

            {/* LINE 2: PROYEK . TANGGAL . KATEGORI */}
            <div className="flex items-center gap-1.5 text-[10.5px] font-medium text-neutral-400 leading-none">
                <span className="font-bold text-neutral-500 uppercase tracking-tighter">
                    {item.project_code}
                </span>
                <span className="text-neutral-200">•</span>
                <span className="tabular-nums">{formatDate(item.date)}</span>
                <span className="text-neutral-200">•</span>
                <span>{naturalType}</span>
            </div>
        </div>
    );
}

interface PersonalReimburseRowProps {
    item: ReimburseRequest;
}

export function PersonalReimburseRow({ item }: PersonalReimburseRowProps) {
    const theme = STATUS_THEMES[item.status];

    // Naturalize category
    const naturalCategory = (item.category || 'General')
        .replace(/_/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');

    return (
        <div className="group hover:bg-white/60 hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-all duration-300 cursor-pointer border-b border-neutral-50 last:border-0 rounded-xl px-4 py-2.5 flex flex-col gap-0.5">
            {/* LINE 1: ITEM | HARGA | STATUS */}
            <div className="flex items-center justify-between gap-4">
                <span className="text-[13px] font-bold text-neutral-900 truncate flex-1 leading-tight">
                    {item.description}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[13px] font-black text-neutral-900 tabular-nums">
                        {formatCurrency(item.amount)}
                    </span>
                    <span className={clsx(
                        "px-1.5 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-widest border border-white/10",
                        theme.bg, theme.text
                    )}>
                        {item.status}
                    </span>
                </div>
            </div>

            {/* LINE 2: PROYEK . TANGGAL . KATEGORI */}
            <div className="flex items-center gap-1.5 text-[10.5px] font-medium text-neutral-400 leading-none">
                <span className="font-bold text-neutral-500 uppercase tracking-tighter">
                    {item.project_code}
                </span>
                <span className="text-neutral-200">•</span>
                <span className="tabular-nums">{formatDate(item.created_at)}</span>
                {item.category && (
                    <>
                        <span className="text-neutral-200">•</span>
                        <span>{naturalCategory}</span>
                    </>
                )}
            </div>
        </div>
    );
}

