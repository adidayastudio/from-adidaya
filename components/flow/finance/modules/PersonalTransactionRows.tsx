import React from "react";
import { clsx } from "clsx";
import { AlertCircle, FileText, CheckCircle2, ShoppingCart, Receipt } from "lucide-react";
import { PurchasingItem, ReimburseRequest, FinancialStatus } from "@/lib/types/finance-types";
import { formatAmount, formatDate, formatStatus } from "./utils";
const TYPE_ICONS: Record<string, React.ReactNode> = {
    UNPAID_RECEIVED: <AlertCircle className="w-5 h-5" />,
    UNPAID_INVOICED: <FileText className="w-5 h-5" />,
    PAID: <CheckCircle2 className="w-5 h-5" />,
    CANCELLED: <ShoppingCart className="w-5 h-5" />,
};

const STATUS_THEMES: Record<FinancialStatus, { bg: string; text: string; iconBg: string; iconText: string }> = {
    UNPAID_RECEIVED: {
        bg: "bg-orange-50", text: "text-orange-700",
        iconBg: "bg-orange-50", iconText: "text-orange-600"
    },
    UNPAID_INVOICED: {
        bg: "bg-yellow-50", text: "text-yellow-700",
        iconBg: "bg-yellow-50", iconText: "text-yellow-600"
    },
    PAID: {
        bg: "bg-green-50", text: "text-green-700",
        iconBg: "bg-green-50", iconText: "text-green-600"
    },
    CANCELLED: {
        bg: "bg-neutral-100", text: "text-neutral-500",
        iconBg: "bg-neutral-100", iconText: "text-neutral-500"
    },
};

export function PersonalPurchaseRow({ item }: { item: PurchasingItem }) {
    const theme = STATUS_THEMES[item.financial_status] || STATUS_THEMES.CANCELLED;

    return (
        <div className="group relative flex items-start gap-4 p-2 -mx-2 rounded-xl transition-all duration-300 border border-transparent cursor-pointer hover:bg-white/60 hover:shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:border-white/50 hover:backdrop-blur-sm">
            {/* Icon Circle */}
            <div className={clsx(
                "w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors duration-300",
                theme.iconBg, theme.iconText,
                "group-hover:opacity-80"
            )}>
                {TYPE_ICONS[item.financial_status] || <ShoppingCart className="w-5 h-5" />}
            </div>

            {/* Main Content */}
            <div className="flex-1 min-w-0 py-0.5">
                <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                        <span className="font-semibold text-neutral-900 text-sm truncate">{item.description}</span>
                        {item.quantity && (
                            <span className="text-xs text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded-md shrink-0 border border-neutral-200/50">
                                {item.quantity}
                            </span>
                        )}
                    </div>
                    <span className="font-bold text-neutral-900 text-sm shrink-0 tracking-tight">{formatAmount(item.amount)}</span>
                </div>

                <div className="flex items-center justify-between text-xs text-neutral-500">
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium text-neutral-600 bg-neutral-100 px-1.5 py-0.5 rounded">{item.project_id}</span>
                        <span className="truncate">{item.vendor}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span>{formatDate(item.date)}</span>
                        <span className={clsx("font-medium px-1.5 py-0.5 rounded-md backdrop-blur-sm", theme.bg, theme.text)}>
                            {formatStatus(item.financial_status.replace('UNPAID_', ''))}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function PersonalReimburseRow({ item }: { item: ReimburseRequest }) {
    const statusStyles: Record<string, string> = {
        PENDING: "bg-orange-50 text-orange-700",
        APPROVED: "bg-blue-50 text-blue-700",
        PAID: "bg-green-50 text-green-700",
        REJECTED: "bg-red-50 text-red-700",
    };

    return (
        <div className="group relative flex items-start gap-4 p-2 -mx-2 rounded-xl transition-all duration-300 border border-transparent cursor-pointer hover:bg-white/60 hover:shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:border-white/50 hover:backdrop-blur-sm">
            {/* Icon Circle */}
            <div className="w-9 h-9 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0 transition-colors duration-300 group-hover:bg-red-100">
                <Receipt className="w-5 h-5" />
            </div>

            {/* Main Content */}
            <div className="flex-1 min-w-0 py-0.5">
                <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                        <span className="font-semibold text-neutral-900 text-sm truncate">{item.description}</span>
                        {item.quantity && (
                            <span className="text-xs text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded-md shrink-0 border border-neutral-200/50">
                                {item.quantity}
                            </span>
                        )}
                    </div>
                    <span className="font-bold text-neutral-900 text-sm shrink-0 tracking-tight">{formatAmount(item.amount)}</span>
                </div>

                <div className="flex items-center justify-between text-xs text-neutral-500">
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium text-neutral-600 bg-neutral-100 px-1.5 py-0.5 rounded">{item.project_id}</span>
                        <span className="truncate">Personal Reimburse</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span>{formatDate(item.created_at)}</span>
                        <span className={clsx("font-medium px-1.5 py-0.5 rounded-md backdrop-blur-sm", statusStyles[item.status] || "bg-neutral-100 text-neutral-600")}>
                            {formatStatus(item.status)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
