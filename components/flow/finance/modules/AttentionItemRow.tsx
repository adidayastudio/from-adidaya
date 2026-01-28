
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
                "group relative flex items-center gap-4 px-4 py-3 -mx-4 rounded-xl transition-all duration-300 border border-transparent",
                onClick && "cursor-pointer hover:bg-white/60 hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)]"
            )}
        >
            {/* Icon/Avatar */}
            <div className={clsx(
                "w-9 h-9 rounded-full flex items-center justify-center shrink-0 border border-white/50 shadow-sm",
                item.type === 'goods_received' && "bg-orange-50 text-orange-600",
                item.type === 'invoice' && "bg-yellow-50 text-yellow-600",
                item.type === 'staff_claim' && "bg-red-50 text-red-600"
            )}>
                {item.type === 'goods_received' && <AlertCircle className="w-5 h-5" />}
                {item.type === 'invoice' && <FileText className="w-5 h-5" />}
                {item.type === 'staff_claim' && <Receipt className="w-5 h-5" />}
            </div>

            {/* Main Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                    <span className="shrink-0 text-[10px] font-black text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded tracking-tighter uppercase border border-neutral-200/50">
                        {item.projectCode}
                    </span>
                    <span className="text-xs font-bold text-neutral-900 truncate">
                        {item.description}
                    </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-neutral-400 font-medium">
                    <span className="truncate max-w-[120px]">{item.beneficiary}</span>
                    <span className="text-neutral-200">•</span>
                    <span>{formatDate(item.submittedDate)}</span>
                </div>
            </div>

            {/* Amount & Status */}
            <div className="flex flex-col items-end shrink-0 gap-1 min-w-[100px]">
                <span className="text-[13px] font-black text-neutral-900 tabular-nums">
                    {formatAmount(item.amount)}
                </span>
                {item.deadline && (
                    <span className={clsx(
                        "text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter",
                        deadlineStatus === 'overdue' && "bg-red-50 text-red-600",
                        deadlineStatus === 'today' && "bg-orange-50 text-orange-600",
                        deadlineStatus === 'soon' && "bg-yellow-50 text-yellow-600",
                        deadlineStatus === 'normal' && "text-neutral-400"
                    )}>
                        {deadlineStatus === 'overdue' ? 'Overdue' : deadlineStatus === 'today' ? 'Today' : formatDate(item.deadline)}
                    </span>
                )}
            </div>
        </div>
    );
}
