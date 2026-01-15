
import { clsx } from "clsx";
import { AlertCircle, FileText, Receipt, ArrowRight } from "lucide-react";
import { AttentionItem } from "@/lib/types/finance-types";
import { formatAmount, formatDate, getDeadlineStatus } from "./utils";

// Attention Item Row Component (Enhanced UI)
export function AttentionItemRow({
    item,
    onClick
}: {
    item: AttentionItem;
    onClick?: () => void;
}) {
    const deadlineStatus = getDeadlineStatus(item.deadline);

    return (
        <div
            onClick={onClick}
            className={clsx(
                "group relative flex items-start gap-4 p-2 -mx-2 rounded-xl transition-all duration-300 border border-transparent",
                onClick && "cursor-pointer hover:bg-white/60 hover:shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:border-white/50 hover:backdrop-blur-sm"
            )}
        >
            {/* Icon/Avatar based on type */}
            <div className={clsx(
                "w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors duration-300",
                item.type === 'goods_received' && "bg-orange-50 text-orange-600 group-hover:bg-orange-100",
                item.type === 'invoice' && "bg-yellow-50 text-yellow-600 group-hover:bg-yellow-100",
                item.type === 'staff_claim' && "bg-red-50 text-red-600 group-hover:bg-red-100"
            )}>
                {item.type === 'goods_received' && <AlertCircle className="w-5 h-5" />}
                {item.type === 'invoice' && <FileText className="w-5 h-5" />}
                {item.type === 'staff_claim' && <Receipt className="w-5 h-5" />}
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
                        <span className="font-medium text-neutral-600 bg-neutral-100 px-1.5 py-0.5 rounded">{item.projectCode}</span>
                        <span className="truncate">{item.beneficiary}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <span>{formatDate(item.submittedDate)}</span>
                        {item.deadline && (
                            <>
                                <ArrowRight className="w-3 h-3 text-neutral-300" />
                                <span className={clsx(
                                    "font-medium px-1.5 py-0.5 rounded-md",
                                    deadlineStatus === 'overdue' && "bg-red-50 text-red-600",
                                    deadlineStatus === 'today' && "bg-orange-50 text-orange-600",
                                    deadlineStatus === 'soon' && "bg-yellow-50 text-yellow-600",
                                    deadlineStatus === 'normal' && "text-neutral-500"
                                )}>
                                    {deadlineStatus === 'overdue' && "Overdue"}
                                    {deadlineStatus === 'today' && "Today"}
                                    {deadlineStatus !== 'overdue' && deadlineStatus !== 'today' && formatDate(item.deadline)}
                                </span>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
