
import { clsx } from "clsx";
import { AlertCircle, FileText, Receipt, ArrowRight } from "lucide-react";
import { AttentionItem } from "@/lib/types/finance-types";
import { formatAmount, formatDate, getDeadlineStatus } from "./utils";

export function AttentionItemRow({
    item,
    onClick
}: {
    item: AttentionItem;
    onClick?: () => void;
}) {
    const deadlineStatus = getDeadlineStatus(item.deadline);

    // Format category nicely with naturalization
    const typeStr = item.type as string;
    const category = item.type === 'goods_received' ? 'Goods Received' :
        item.type === 'invoice' ? 'Invoices' :
            item.type === 'staff_claim' ? 'Reimburse' :
                typeStr.replace(/_/g, ' ')
                    .split(' ')
                    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                    .join(' ');

    return (
        <div
            onClick={onClick}
            className={clsx(
                "group hover:bg-white/60 hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-all duration-300 cursor-pointer border-b border-neutral-50 last:border-0 rounded-xl px-4 py-2.5 flex flex-col gap-0.5",
                !onClick && "cursor-default hover:bg-transparent hover:shadow-none"
            )}
        >
            {/* LINE 1: ITEM | HARGA | STATUS */}
            <div className="flex items-center justify-between gap-4">
                <span className="text-[13px] font-bold text-neutral-900 truncate flex-1 leading-tight">
                    {item.description}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[13px] font-black text-neutral-900 tabular-nums">
                        {formatAmount(item.amount)}
                    </span>
                    {item.deadline && (
                        <span className={clsx(
                            "px-1.5 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-widest border border-white/10",
                            deadlineStatus === 'overdue' && "bg-red-50 text-red-600",
                            deadlineStatus === 'today' && "bg-orange-50 text-orange-600",
                            deadlineStatus === 'soon' && "bg-yellow-50 text-yellow-600",
                            deadlineStatus === 'normal' && "bg-neutral-50 text-neutral-400"
                        )}>
                            {deadlineStatus === 'overdue' ? 'Overdue' : deadlineStatus === 'today' ? 'Today' : formatDate(item.deadline)}
                        </span>
                    )}
                </div>
            </div>

            {/* LINE 2: PROYEK . TANGGAL . KATEGORI */}
            <div className="flex items-center gap-1.5 text-[10.5px] font-medium text-neutral-400 leading-none">
                <span className="font-bold text-neutral-500 uppercase tracking-tighter">
                    {item.projectCode}
                </span>
                <span className="text-neutral-200">•</span>
                <span className="tabular-nums">{formatDate(item.submittedDate)}</span>
                <span className="text-neutral-200">•</span>
                <span>{category}</span>
            </div>
        </div>
    );
}
