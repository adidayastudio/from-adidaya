"use client";

import { useState, useMemo, useEffect, useRef, Fragment } from "react";
import { generateExport, ExportAttachment, ExportMetadata } from "@/lib/export/export-utils";
import FinanceHeader from "@/components/flow/finance/FinanceHeader";
import FinancePageWrapper from "@/components/flow/finance/FinancePageWrapper";
import { useFinance } from "@/components/flow/finance/FinanceContext";
import {
    Search,
    Eye,
    CreditCard,
    Plus,
    ChevronLeft,
    ChevronRight,
    Loader2,
    Download,
    Pencil,
    Trash2,
    Ban,
    AlertCircle,
    ChevronUp,
    ChevronDown,
    CheckCircle2,
    XCircle,
    X,
    RotateCcw,
    Send,
    Clock,
    ExternalLink,
    Package,
    Home,
    Car,
    Wrench,
    Utensils,
    MoreHorizontal,
    Upload,
    MapPin,
    Copy,
    Check,
    Filter,
    Receipt,
    ListFilter,
    User,
    Users,
    FileText,
    FileSpreadsheet,
    ArrowUpNarrowWide,
    ArrowDownWideNarrow,
    Briefcase,
    Share2,
    Image as ImageIcon,
    DollarSign,
    ArrowLeft,
    Undo2
} from "lucide-react";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import { format, addMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO, isBefore } from "date-fns";
import { ReimburseRequest, ReimburseStatus, FundingSource } from "@/lib/types/finance-types";
import { formatCurrency, STATUS_THEMES, cleanEntityName, getPrimaryStatus, formatStatus, formatStructuredId, formatItemTitle, formatCardDate } from "./modules/utils";
import * as XLSX from "xlsx";
import { REIMBURSE_CATEGORY_OPTIONS } from "./modules/constants";
import { FinanceItemCard } from "./FinanceItemCard";
import { FinanceSummaryCard, FinanceSummaryCardsRow } from "./FinanceSummaryCard";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { fetchReimburseRequests, updateReimburseStatus, deleteReimburseRequest, fetchFundingSources, fetchReimburseRequestById } from "@/lib/client/finance-api";
import { FinanceToolbar } from "./FinanceToolbar";
import { fetchAllProjects } from "@/lib/api/projects";
import { fetchTeamMembers } from "@/lib/api/clock_team";
import { fetchDefaultWorkspaceId } from "@/lib/api/templates";
import { NewRequestDrawer } from "./modules/NewRequestDrawer";
import { uploadFinanceFileExact, getFinanceFileUrl } from "@/lib/api/storage";
import { GlobalLoading } from "@/components/shared/GlobalLoading";

// -- MODALS --
// (kept as is)

// Status Badge Helper
function StatusBadge({ status, textOnly }: { status: any, textOnly?: boolean }) {
    const theme = STATUS_THEMES[status as keyof typeof STATUS_THEMES] || STATUS_THEMES.DRAFT;
    if (textOnly) {
        return (
            <span className={clsx("text-[11px] font-bold uppercase", theme.text)}>
                {formatStatus(status)}
            </span>
        );
    }
    return (
        <span className={clsx("inline-flex w-fit px-2 py-0.5 rounded-full items-center justify-center leading-none text-[10px] font-bold border uppercase", theme.bg, theme.text, theme.border)}>
            {formatStatus(status)}
        </span>
    );
}

// Copy Button Helper
const CopyButton = ({ text, className }: { text: string, className?: string }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <button data-html2canvas-ignore="true" onClick={handleCopy} className={clsx("p-1 hover:bg-neutral-100 rounded-full transition-all text-neutral-400 hover:text-neutral-600", className)} title="Copy to clipboard">
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
    );
};

function RejectModal({ item, onClose, onReject }: { item: any, onClose: () => void, onReject: (reason: string) => void }) {
    const [reason, setReason] = useState("");
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm" onClick={onClose} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative w-full max-w-sm bg-white/50 dark:bg-neutral-900/50 backdrop-blur-2xl border border-white/60 dark:border-neutral-800 rounded-3xl p-6 shadow-2xl overflow-hidden">
                <h3 className="text-lg font-bold text-neutral-900 mb-2">Reject Request</h3>
                <p className="text-sm text-neutral-500 mb-6">Please provide a reason for rejecting this request.</p>
                <textarea
                    autoFocus
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Reason..."
                    className="w-full h-32 p-4 text-sm border border-neutral-200 rounded-xl bg-neutral-50 mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-2.5 text-sm font-bold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-all">Cancel</button>
                    <button onClick={() => { if (reason) onReject(reason); }} disabled={!reason} className="flex-1 py-2.5 text-sm font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-all disabled:opacity-50">Reject</button>
                </div>
            </motion.div>
        </div>
    );
}

// Pagination Component
function Pagination({
    currentPage,
    totalItems,
    itemsPerPage,
    onPageChange
}: {
    currentPage: number,
    totalItems: number,
    itemsPerPage: number,
    onPageChange: (page: number) => void
}) {
    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    if (totalItems === 0) return null;

    return (
        <div className="flex items-center justify-between px-6 py-4">
            <div className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500">
                Showing <span className="text-neutral-900 dark:text-white">{startItem}-{endItem}</span> of <span className="text-neutral-900 dark:text-white">{totalItems}</span>
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-all disabled:opacity-30 disabled:hover:bg-transparent"
                >
                    <ChevronLeft className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
                </button>
                <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                        // Show first, last, and current +/- 1
                        if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                            return (
                                <button
                                    key={page}
                                    onClick={() => onPageChange(page)}
                                    className={clsx(
                                        "w-8 h-8 rounded-full text-xs font-bold transition-all",
                                        currentPage === page
                                            ? "bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200"
                                            : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                    )}
                                >
                                    {page}
                                </button>
                            );
                        } else if (page === currentPage - 2 || page === currentPage + 2) {
                            return <span key={page} className="text-neutral-300 dark:text-neutral-600 mx-1">...</span>;
                        }
                        return null;
                    })}
                </div>
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-all disabled:opacity-30 disabled:hover:bg-transparent"
                >
                    <ChevronRight className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
                </button>
            </div>
        </div>
    );
}

function ReviseModal({ item, onClose, onRevise }: { item: any, onClose: () => void, onRevise: (reason: string) => void }) {
    const [reason, setReason] = useState("");
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm" onClick={onClose} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative w-full max-w-sm bg-white/50 dark:bg-neutral-900/50 backdrop-blur-2xl border border-white/60 dark:border-neutral-800 rounded-3xl p-6 shadow-2xl overflow-hidden">
                <h3 className="text-lg font-bold text-neutral-900 mb-2 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-orange-500" /> Request Revision
                </h3>
                <p className="text-sm text-neutral-500 mb-6 font-medium">Please provide instructions for what needs to be revised.</p>
                <textarea
                    autoFocus
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Revision instructions..."
                    className="w-full h-32 p-4 text-sm border border-neutral-200 rounded-xl bg-neutral-50 mb-6 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-2.5 text-sm font-bold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-all">Cancel</button>
                    <button onClick={() => { if (reason) onRevise(reason); }} disabled={!reason} className="flex-1 py-2.5 text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-all disabled:opacity-50">Request Revision</button>
                </div>
            </motion.div>
        </div>
    );
}

// Revert to Draft Confirmation Modal
function RevertConfirmModal({
    item,
    onClose,
    onConfirm,
    isReverting
}: {
    item: { description?: string },
    onClose: () => void,
    onConfirm: () => void,
    isReverting?: boolean
}) {
    return (
        <div className="fixed inset-0 z-[201] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm" onClick={onClose} />
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative w-full max-w-sm bg-white/50 dark:bg-neutral-900/50 backdrop-blur-2xl border border-white/60 dark:border-neutral-800 rounded-3xl p-6 shadow-2xl overflow-hidden"
            >
                {/* Icon */}
                <div className="w-14 h-14 rounded-full bg-orange-50 flex items-center justify-center mx-auto mb-4">
                    <RotateCcw className="w-7 h-7 text-[#f97316]" />
                </div>

                <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2 text-center">
                    Revert to Draft?
                </h3>
                <p className="text-sm text-neutral-500 mb-6 text-center font-medium leading-relaxed">
                    This request will be returned to your <span className="text-neutral-900 dark:text-white font-bold">Drafts</span> for editing. You will need to submit it again for approval.
                </p>

                {item.description && (
                    <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-3 mb-6 border border-neutral-100 dark:border-neutral-700">
                        <div className="text-[10px] font-bold text-neutral-400 mb-1">Request</div>
                        <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300 truncate">{item.description}</div>
                    </div>
                )}

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        disabled={isReverting}
                        className="flex-1 py-2.5 text-sm font-bold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-all disabled:opacity-50"
                    >
                        Keep Submitted
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isReverting}
                        className="flex-1 py-2.5 text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isReverting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Reverting...
                            </>
                        ) : (
                            <>
                                <RotateCcw className="w-4 h-4" />
                                Revert
                            </>
                        )}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

// Delete Confirmation Modal
function DeleteConfirmModal({
    item,
    onClose,
    onConfirm,
    isDeleting
}: {
    item: { description?: string },
    onClose: () => void,
    onConfirm: () => void,
    isDeleting?: boolean
}) {
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm" onClick={onClose} />
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative w-full max-w-sm bg-white/50 dark:bg-neutral-900/50 backdrop-blur-2xl border border-white/60 dark:border-neutral-800 rounded-3xl p-6 shadow-2xl overflow-hidden"
            >
                {/* Icon */}
                <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                    <Trash2 className="w-7 h-7 text-red-500" />
                </div>

                <h3 className="text-lg font-bold text-neutral-900 mb-2 text-center">
                    Delete Request?
                </h3>
                <p className="text-sm text-neutral-500 mb-6 text-center font-medium">
                    Are you sure you want to delete this request? This action <span className="text-red-500 font-bold">cannot be undone</span>.
                </p>

                {item.description && (
                    <div className="bg-neutral-50 rounded-xl p-3 mb-6 border border-neutral-100">
                        <div className="text-[10px] font-bold text-neutral-400 mb-1">Request</div>
                        <div className="text-sm font-medium text-neutral-700 truncate">{item.description}</div>
                    </div>
                )}

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        disabled={isDeleting}
                        className="flex-1 py-2.5 text-sm font-bold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-all disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className="flex-1 py-2.5 text-sm font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isDeleting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Deleting...
                            </>
                        ) : (
                            <>
                                <Trash2 className="w-4 h-4" />
                                Delete
                            </>
                        )}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

// Success Popup Modal
function SuccessModal({
    title,
    message,
    onClose
}: {
    title: string,
    message: string,
    onClose: () => void
}) {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[300] w-[calc(100%-32px)] max-w-md">
            <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                className="bg-white/70 dark:bg-neutral-900/70 backdrop-blur-xl border border-white/40 dark:border-neutral-800/40 rounded-[32px] p-4 pr-12 shadow-[0_8px_32px_rgba(0,0,0,0.12)] relative overflow-hidden flex items-center gap-4"
            >
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white leading-tight">{title}</h3>
                    <p className="text-[12px] font-medium text-neutral-500 dark:text-neutral-400 mt-0.5">{message}</p>
                </div>
                <button
                    onClick={onClose}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                    <X size={18} className="text-neutral-400" />
                </button>
            </motion.div>
        </div>
    );
}

function PayDrawer({ item, onClose, onPay, fundingSources, isLoadingSources }: {
    item: any,
    onClose: () => void,
    onPay: (sourceId: string, date: string, notes: string, proofFiles: File[]) => Promise<void>,
    fundingSources: FundingSource[],
    isLoadingSources: boolean
}) {
    const [source, setSource] = useState("");
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState("");
    const [proofFiles, setProofFiles] = useState<File[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleConfirm = async () => {
        if (!source || !date || proofFiles.length === 0) return;
        setIsSubmitting(true);
        await onPay(source, date, notes, proofFiles);
        setIsSubmitting(false);
    };

    return (
        <div className="fixed inset-0 z-[200] isolate">
            <div className="absolute inset-0 bg-neutral-900/20 backdrop-blur-sm transition-opacity duration-300" onClick={onClose} />
            <motion.div initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} className={clsx("absolute z-50 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-2xl border border-white/60 dark:border-neutral-800 shadow-2xl transition-all duration-300 rounded-[56px] overflow-hidden flex flex-col",
                "bottom-2 left-2 right-2 top-20 sm:top-6 sm:bottom-6 sm:right-6 sm:left-auto sm:w-[500px]"
            )}>
                <div className="flex-none px-8 pt-8 pb-4 sticky top-0 z-20 bg-transparent">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
                            <CreditCard className="w-5 h-5 text-blue-600" />
                            Process Payment
                        </h3>
                        <button onClick={onClose} className="w-10 h-10 bg-white/50 dark:bg-neutral-800/50 backdrop-blur-xl border border-black/5 dark:border-white/10 rounded-full flex items-center justify-center active:scale-95 transition-transform">
                            <X size={20} className="text-neutral-500" strokeWidth={1.5} />
                        </button>
                    </div>
                </div>

                <div className="shrink min-h-0 overflow-y-auto px-8 pb-4 scrollbar-hide space-y-6">
                    <div className="py-2 px-1 rounded-[32px] bg-white/40 dark:bg-neutral-900/40 border border-white/60 dark:border-neutral-800 shadow-sm flex flex-col gap-1">
                        <div className="flex justify-between items-center text-xs px-4 py-2">
                            <span className="text-neutral-500 font-bold tracking-wider">Amount to Pay</span>
                            <div className="flex items-center gap-2">
                                <div className="text-right">
                                    <div className="font-bold text-neutral-900 text-[17px]">{formatCurrency(item.approved_amount || item.details?.approved_amount || item.amount)}</div>
                                    {(item.approved_amount || item.details?.approved_amount) && (item.approved_amount || item.details?.approved_amount) !== item.amount && (
                                        <div className="text-[10px] text-orange-600 line-through opacity-75">{formatCurrency(item.amount)}</div>
                                    )}
                                </div>
                                <div className="w-6 flex justify-center">
                                    <CopyButton text={String(item.approved_amount || item.details?.approved_amount || item.amount)} />
                                </div>
                            </div>
                        </div>

                        <div className="px-5">
                            <hr className="border-neutral-200/60 dark:border-neutral-800/50" />
                        </div>

                        <div className="flex justify-between items-center text-xs px-4 py-2">
                            <span className="text-neutral-500 font-bold tracking-wider">Submitter</span>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-neutral-900 text-[13px]">{item.staff_name || item.submitted_by_name || "-"}</span>
                                <div className="w-6" />
                            </div>
                        </div>

                        <div className="flex justify-between items-start text-xs px-4 py-2">
                            <span className="text-neutral-500 font-bold tracking-wider mt-1">Beneficiary Account</span>
                            <div className="flex items-start gap-2">
                                {(item.beneficiary_bank || item.beneficiary_number) ? (
                                    <div className="text-right flex flex-col items-end gap-1 mt-0.5">
                                        <div className="text-[12px] font-bold text-neutral-800 bg-white/60 px-2.5 py-1 rounded-full border border-neutral-200/50 flex items-center gap-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                                            <span>{item.beneficiary_bank}</span>
                                            <span className="text-neutral-400 font-normal">|</span>
                                            <span className="font-mono">{item.beneficiary_number}</span>
                                        </div>
                                        <div className="text-[10px] text-neutral-500 font-medium px-1">
                                            {item.beneficiary_name || item.staff_name}
                                        </div>
                                    </div>
                                ) : (
                                    <span className="italic text-neutral-400 mt-1">Not specified</span>
                                )}
                                <div className="w-6 mt-0.5 flex justify-center">
                                    {item.beneficiary_number ? <CopyButton text={item.beneficiary_number} /> : null}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-neutral-500 mb-2">Source of Fund</label>
                            {isLoadingSources ? (
                                <div className="h-12 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full animate-pulse" />
                            ) : (
                                <div className="relative group">
                                    <select
                                        value={source}
                                        onChange={(e) => setSource(e.target.value)}
                                        className="w-full h-12 pl-4 pr-10 text-[13px] border border-white/60 dark:border-neutral-800 shadow-sm rounded-full bg-white/60 dark:bg-neutral-900/40 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all font-medium appearance-none cursor-pointer hover:border-blue-500/50"
                                    >
                                        <option value="">Select source...</option>
                                        {fundingSources.filter(s => !s.is_archived && s.is_active).map(s => (
                                            <option key={s.id} value={s.id}>{s.name} ({s.currency})</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400 group-hover:text-blue-600 transition-colors">
                                        <ChevronDown className="w-4 h-4" />
                                    </div>
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-neutral-500 mb-2">Payment Date</label>
                            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full max-w-full block min-w-0 h-12 px-4 text-[13px] border border-white/60 dark:border-neutral-800 shadow-sm rounded-full bg-white/60 dark:bg-neutral-900/40 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all font-medium appearance-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-neutral-500 mb-2">Proof of Transfer</label>
                            <div className="space-y-3">
                                {proofFiles.length > 0 && (
                                    <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1">
                                        {proofFiles.map((file, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-2.5 pl-3.5 bg-white/80 border border-white/60 shadow-sm rounded-[16px] text-xs">
                                                <div className="flex items-center gap-2 overflow-hidden flex-1 mr-2">
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                                    <span className="text-neutral-700 font-medium truncate">{file.name}</span>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); window.open(URL.createObjectURL(file), '_blank'); }}
                                                        className="text-[10px] font-bold text-blue-600 bg-blue-50/80 hover:bg-blue-100 px-3 py-1.5 rounded-full transition-colors"
                                                    >
                                                        View Document
                                                    </button>
                                                    <button
                                                        onClick={() => setProofFiles(prev => prev.filter((_, i) => i !== idx))}
                                                        className="w-7 h-7 flex items-center justify-center text-neutral-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className={clsx(
                                    "border-2 border-dashed rounded-[32px] p-6 text-center transition-all cursor-pointer relative group",
                                    "border-neutral-200/80 hover:border-blue-500/40 bg-white/40 hover:bg-blue-50/40"
                                )}>
                                    <input type="file" multiple className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" onChange={(e) => {
                                        if (e.target.files) {
                                            const newFiles = Array.from(e.target.files);
                                            setProofFiles(prev => [...prev, ...newFiles]);
                                        }
                                        e.target.value = '';
                                    }} />
                                    <div className="flex flex-col items-center justify-center gap-3 text-neutral-400 group-hover:text-blue-600 transition-colors">
                                        <div className="w-10 h-10 bg-white shadow-sm group-hover:bg-blue-50 rounded-full flex items-center justify-center transition-colors">
                                            <Upload className="w-4 h-4 group-hover:text-blue-600 text-neutral-500" />
                                        </div>
                                        <div className="flex flex-col items-center gap-1">
                                            <span className="font-bold text-[13px] text-neutral-600 group-hover:text-blue-700">Upload Images/PDFs</span>
                                            <span className="text-[10px] font-bold text-blue-500/80">Required</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-neutral-500 mb-2">Notes</label>
                            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add payment notes..." className="w-full h-12 px-5 text-[13px] border border-white/60 dark:border-neutral-800 shadow-sm rounded-full bg-white/60 dark:bg-neutral-900/40 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all font-medium placeholder:text-neutral-400" />
                        </div>
                    </div>
                </div>

                <div className="flex-none px-8 pt-4 pb-8 bg-transparent">
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="w-1/3 shrink-0 font-bold text-[14px] flex items-center justify-center bg-white/80 border border-neutral-200 text-neutral-600 hover:bg-neutral-50 rounded-full transition-all duration-200 shadow-[0_2px_4px_rgba(0,0,0,0.02)]"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={!source || !date || proofFiles.length === 0 || isSubmitting}
                            className="w-2/3 py-4 text-[15px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-full transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
                        >
                            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin text-white" /> : "Confirm Payment"}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

function ApproveModal({ item, onClose, onApprove, approverName }: { item: any, onClose: () => void, onApprove: (amount: number, approver: string) => void, approverName: string }) {
    const [amountStr, setAmountStr] = useState(item.amount.toString());

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm" onClick={onClose} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative w-full max-w-sm bg-white/50 dark:bg-neutral-900/50 backdrop-blur-2xl border border-white/60 dark:border-neutral-800 rounded-3xl p-6 shadow-2xl overflow-hidden">
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    Approve Request
                </h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6 font-medium">Please confirm the approved amount.</p>

                <div className="mb-6">
                    {item.category === "TRANSPORTATION" && item.details?.transportEstCost && (
                        <div className="mb-4 bg-blue-50 p-3 rounded-xl border border-blue-100 flex justify-between items-center">
                            <div>
                                <div className="text-[10px] font-bold text-blue-500">System Estimation</div>
                                <div className="text-xs text-blue-400">Policy Rate</div>
                            </div>
                            <div className="text-sm font-bold text-blue-700">{formatCurrency(item.details.transportEstCost)}</div>
                        </div>
                    )}
                    <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1.5">Approved Amount</label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 font-bold">Rp</span>
                        <input
                            type="number"
                            autoFocus
                            value={amountStr}
                            onChange={(e) => setAmountStr(e.target.value)}
                            className="w-full h-12 pl-10 pr-4 text-lg border border-neutral-200 dark:border-neutral-700 rounded-xl bg-white dark:bg-neutral-800 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/30 transition-all font-bold text-neutral-900 dark:text-white"
                        />
                    </div>
                    {parseFloat(amountStr) !== item.amount && (
                        <div className="mt-2 text-xs text-orange-600 font-medium">
                            * Different from requested: {formatCurrency(item.amount)}
                        </div>
                    )}
                </div>

                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-2.5 text-sm font-bold text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-xl transition-all">Cancel</button>
                    <button
                        onClick={() => onApprove(parseFloat(amountStr), approverName)}
                        className="flex-1 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-lg shadow-emerald-200 dark:shadow-none"
                    >
                        Approve
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

// -- NESTED DRAWER: Document View --
function DocumentDrawer({
    item,
    initialTab,
    onClose
}: {
    item: any;
    initialTab: 'invoice' | 'proof';
    onClose: () => void;
}) {
    const [activeTab, setActiveTab] = useState<'invoice' | 'proof'>(initialTab);
    const [invoiceUrls, setInvoiceUrls] = useState<{ url: string; name: string; originalPath: string }[]>([]);
    const [proofUrls, setProofUrls] = useState<{ url: string; name: string; originalPath: string }[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDownloading, setIsDownloading] = useState<string | null>(null); // path or 'bulk'

    useEffect(() => {
        const fetchUrls = async () => {
            setIsLoading(true);
            const urls: { url: string; name: string; originalPath: string }[] = [];

            // Invoices/Receipts - use existingInvoices from Supabase join
            if (item.existingInvoices && item.existingInvoices.length > 0) {
                const iUrls: { url: string; name: string; originalPath: string }[] = [];
                for (let i = 0; i < item.existingInvoices.length; i++) {
                    const inv = item.existingInvoices[i];
                    const url = await getFinanceFileUrl(inv.invoice_url);
                    if (url) iUrls.push({ url, name: inv.invoice_name || `Receipt ${i + 1}`, originalPath: inv.invoice_url });
                }
                setInvoiceUrls(iUrls);
            } else if (item.invoice_url) {
                // Fallback for legacy single invoice_url
                const url = await getFinanceFileUrl(item.invoice_url);
                if (url) setInvoiceUrls([{ url, name: 'Receipt', originalPath: item.invoice_url }]);
            }

            // Proof
            if (item.payment_proof_url) {
                const paths = item.payment_proof_url.split(',');
                const pUrls: { url: string; name: string; originalPath: string }[] = [];
                for (let i = 0; i < paths.length; i++) {
                    const url = await getFinanceFileUrl(paths[i].trim());
                    if (url) pUrls.push({ url, name: `Transfer Proof ${i + 1}`, originalPath: paths[i].trim() });
                }
                setProofUrls(pUrls);
            }
            setIsLoading(false);
        };
        fetchUrls();
    }, [item]);

    const handleDownload = async (url: string, path: string, name?: string, index?: number, total?: number) => {
        const isBulk = typeof index === 'number';
        try {
            if (!isBulk) setIsDownloading(path);
            const ext = path.split('.').pop() || 'jpg';

            // Generate Filename
            const typeStr = activeTab === 'invoice' ? 'Receipt' : 'Transfer';

            // Generate Date string
            const dateSource = activeTab === 'invoice'
                ? (item.date || item.created_at)
                : (item.payment_date || item.updated_at);
            const dateObj = dateSource ? new Date(dateSource) : new Date();
            const yyyy = dateObj.getFullYear();
            const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
            const dd = String(dateObj.getDate()).padStart(2, '0');
            const dateStr = `${yyyy}${mm}${dd}`;

            // Generate RE string
            const reStr = formatStructuredId("RE", item.project?.project_number || item.project_number, item.request_number, item.project?.project_code || item.project_code) || `RE - ${item.id.slice(0, 8)}`;

            // Generate Project string
            const projectStr = item.project?.project_code || item.project_code || 'NA';

            // Generate Item string
            const itemStr = item.category || 'Reimburse';

            // Combine
            let suffix = '';
            if (typeof index === 'number' && typeof total === 'number' && total > 1) {
                suffix = `_${index + 1} `;
            }
            const filename = `${dateStr}_${typeStr}_${reStr}_${projectStr}_${itemStr}${suffix}.${ext} `.replace(/[<>:"/\\|?*]+/g, '');

            const response = await fetch(url);
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            window.URL.revokeObjectURL(downloadUrl);
            document.body.removeChild(link);
        } catch (error) {
            console.error('Download failed:', error);
            window.open(url, '_blank');
        } finally {
            if (!isBulk) setIsDownloading(null);
        }
    };

    const handleBulkDownload = async () => {
        setIsDownloading('bulk');
        const docs = activeTab === 'invoice' ? invoiceUrls : proofUrls;
        for (let i = 0; i < docs.length; i++) {
            const doc = docs[i];
            await handleDownload(doc.url, doc.originalPath, doc.name, i, docs.length);
            // Add delay between downloads so browser doesn't skip any
            if (i < docs.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 800));
            }
        }
        setIsDownloading(null);
    };

    const currentDocs = activeTab === 'invoice' ? invoiceUrls : proofUrls;

    const [zoom, setZoom] = useState(1);
    const toggleZoom = () => setZoom(prev => prev === 1 ? 2 : 1);

    return (
        <div className="fixed inset-0 z-[250] isolate">
            <div className="absolute inset-0 bg-neutral-900/20 backdrop-blur-sm transition-opacity duration-300" onClick={onClose} />
            <motion.div
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className={clsx(
                    "absolute z-50 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-[48px] backdrop-saturate-[200%] border border-white/60 dark:border-neutral-800 shadow-2xl flex flex-col overflow-hidden rounded-[56px]",
                    "bottom-2 left-2 right-2 top-20 sm:bottom-6 sm:right-6 sm:top-6 sm:left-auto sm:w-[500px]"
                )}
            >
                {/* Header - Reorganized (Extreme Top) */}
                <div className="flex-none pt-8 pb-4 px-6 flex flex-col gap-4 bg-transparent sticky top-0 z-20">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={onClose}
                            className="w-10 h-10 bg-white/80 dark:bg-neutral-800/80 backdrop-blur-xl border border-white/80 dark:border-neutral-700/50 rounded-full flex items-center justify-center active:scale-95 transition-all shadow-md"
                        >
                            <ChevronLeft size={20} className="text-neutral-600 dark:text-neutral-400" />
                        </button>

                        <div className="flex items-center bg-white/80 dark:bg-neutral-800/80 backdrop-blur-xl border border-white/80 dark:border-neutral-700/50 p-1 rounded-full shadow-md">
                            <button
                                onClick={() => { setActiveTab('invoice'); setZoom(1); }}
                                className={clsx(
                                    "px-6 py-2 text-[11px] font-bold rounded-full transition-all",
                                    activeTab === 'invoice' ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10" : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                                )}
                            >
                                Receipt
                            </button>
                            <button
                                onClick={() => { setActiveTab('proof'); setZoom(1); }}
                                className={clsx(
                                    "px-6 py-2 text-[11px] font-bold rounded-full transition-all",
                                    activeTab === 'proof' ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10" : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                                )}
                            >
                                Proof
                            </button>
                        </div>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 pb-24 space-y-6 scrollbar-hide bg-transparent">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <Loader2 className="w-8 h-8 animate-spin text-red-500" />
                            <p className="text-xs font-medium text-neutral-400">Loading documents...</p>
                        </div>
                    ) : currentDocs.length > 0 ? (
                        currentDocs.map((doc, idx) => (
                            <div key={idx} className="space-y-3">
                                <div className="flex items-center justify-between px-1">
                                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{doc.originalPath.split('/').pop()}</span>
                                    <button
                                        onClick={() => handleDownload(doc.url, doc.originalPath, doc.originalPath.split('/').pop() || doc.name)}
                                        className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full text-neutral-400 hover:text-blue-500 transition-all"
                                        title="Download this file"
                                    >
                                        {isDownloading === doc.originalPath ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download size={14} />}
                                    </button>
                                </div>
                                <div className="relative rounded-[2.5rem] border border-neutral-100 dark:border-neutral-800 overflow-hidden bg-neutral-50 dark:bg-neutral-900 shadow-sm">
                                    {doc.originalPath.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i) ? (
                                        <img
                                            src={doc.url}
                                            alt={doc.name}
                                            onClick={toggleZoom}
                                            className={clsx(
                                                "w-full h-auto object-contain cursor-zoom-in transition-transform duration-500",
                                                zoom > 1 ? "scale-150 cursor-zoom-out" : ""
                                            )}
                                            style={{ transformOrigin: 'center center' }}
                                        />
                                    ) : (
                                        <div className="pt-6 pb-8 flex flex-col items-center justify-center gap-4 bg-white/50 dark:bg-neutral-800/50 backdrop-blur-sm">
                                            <div className="w-20 h-20 rounded-3xl bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center text-neutral-300 dark:text-neutral-700">
                                                <FileText size={40} />
                                            </div>
                                            <div className="text-center px-6">
                                                <div className="text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-1">PDF Document</div>
                                                <div className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest break-all">{doc.originalPath.split('/').pop()}</div>
                                            </div>
                                            <div className="w-full px-6 mt-4 flex flex-col gap-4">
                                                <iframe
                                                    src={`${doc.url} #toolbar = 0`}
                                                    className="w-full h-[400px] rounded-2xl border border-neutral-200 dark:border-neutral-700"
                                                />
                                                <button
                                                    onClick={() => handleDownload(doc.url, doc.originalPath, doc.originalPath.split('/').pop() || doc.name)}
                                                    className="w-full py-4 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 rounded-full text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2"
                                                >
                                                    <Download size={14} /> Download Full PDF
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-40">
                            <Upload size={48} className="text-neutral-300" />
                            <p className="text-sm font-medium text-neutral-400">No {activeTab} available</p>
                        </div>
                    )}
                </div>

                {/* Sticky Bottom Download All */}
                {currentDocs.length > 1 && (
                    <div className="absolute bottom-0 left-0 right-0 p-6 pt-12 pb-8 bg-gradient-to-t from-white/90 dark:from-neutral-900/90 via-white/50 dark:via-neutral-900/50 to-transparent pointer-events-none flex flex-col justify-end">
                        <button
                            onClick={handleBulkDownload}
                            disabled={!!isDownloading}
                            className="pointer-events-auto w-full h-[52px] bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold text-sm shadow-xl shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {isDownloading === 'bulk' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download size={20} />}
                            Download All {activeTab === 'invoice' ? 'Receipts' : 'Proofs'}
                        </button>
                    </div>
                )}
                {currentDocs.length === 1 && (
                    <div className="absolute bottom-0 left-0 right-0 p-6 pt-12 pb-8 bg-gradient-to-t from-white/90 dark:from-neutral-900/90 via-white/50 dark:via-neutral-900/50 to-transparent pointer-events-none flex flex-col justify-end">
                        <button
                            onClick={() => handleDownload(currentDocs[0].url, currentDocs[0].originalPath, currentDocs[0].name)}
                            disabled={!!isDownloading}
                            className="pointer-events-auto w-full h-[52px] bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold text-sm shadow-xl shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {isDownloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download size={20} />}
                            Download {activeTab === 'invoice' ? 'Invoice' : 'Proof'}
                        </button>
                    </div>
                )}
            </motion.div>
        </div>
    );
}

// ----------------------------------------------------------------------------
// View Modal (Identical to Purchasing)
// ----------------------------------------------------------------------------
function ViewModal({
    item,
    onClose,
    onPreview,
    onEdit,
    onDelete,
    onReject,
    onRevise,
    onApprove,
    onPay,
    onRefresh,
    isTeamView,
    userRole,
    isDeleted,
    setRevertingItem,
    loadData,
    setShowSuccess
}: {
    item: any;
    onClose: () => void;
    onPreview: (tab: 'invoice' | 'proof') => void;
    onEdit: () => void;
    onDelete: () => void;
    onReject: () => void;
    onRevise: () => void;
    onApprove: () => void;
    onPay: () => void;
    onRefresh: () => void;
    isTeamView: boolean;
    userRole: string | null;
    isDeleted: boolean;
    setRevertingItem: (item: any) => void;
    loadData: () => void;
    setShowSuccess: (success: { title: string, message: string } | null) => void;
}) {
    const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
    const [zoom, setZoom] = useState(1);
    const [isExporting, setIsExporting] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);

    const isSubmitted = item.status === 'PENDING' || item.status === 'NEED_REVISION';
    const isApproved = item.status === 'APPROVED';
    const isPaid = item.status === 'PAID';
    const isRejected = item.status === 'REJECTED';
    const isDraft = item.status === 'DRAFT';
    const canEdit = (isDraft || item.status === 'NEED_REVISION') && !isTeamView;

    const handleExport = async (format: "jpg" | "pdf") => {
        if (!contentRef.current) return;
        setIsExporting(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 500));

            // --- Generate filename ---
            const now = new Date();
            const yyyy = now.getFullYear();
            const mm = String(now.getMonth() + 1).padStart(2, '0');
            const dd = String(now.getDate()).padStart(2, '0');
            const hh = String(now.getHours()).padStart(2, '0');
            const min = String(now.getMinutes()).padStart(2, '0');
            const dateStr = `${yyyy}${mm}${dd}`;
            const reId = formatStructuredId("RE", item.project?.project_number || item.project_number, item.request_number, item.project?.project_code || item.project_code) || `RE-${item.id.slice(0, 8)}`;
            const projectStr = item.project?.project_code || item.project_code || 'NA';
            let itemStr = item.category || 'Reimburse';
            const fileName = `${dateStr}_Detail_${reId}_${projectStr}_${itemStr}.${format}`.replace(/[<>:"/\\|?*]+/g, '');

            // --- Prepare Attachments ---
            const attachments: ExportAttachment[] = [];

            // Receipts (possibly multiple)
            if (item.invoice_url) {
                const paths = item.invoice_url.split(',').map((p: string) => p.trim()).filter(Boolean);
                for (const path of paths) {
                    const url = await getFinanceFileUrl(path);
                    if (url) {
                        attachments.push({
                            url,
                            name: 'Receipt',
                            originalPath: path,
                            label: 'Receipt'
                        });
                    }
                }
            }

            // Payment proof (possibly multiple)
            if (item.payment_proof_url) {
                const paths = item.payment_proof_url.split(',').map((p: string) => p.trim()).filter(Boolean);
                for (const path of paths) {
                    const url = await getFinanceFileUrl(path);
                    if (url) {
                        attachments.push({
                            url,
                            name: 'Payment Proof',
                            originalPath: path,
                            label: 'Payment Proof'
                        });
                    }
                }
            }

            const metadata: ExportMetadata = {
                title: reId,
                subtitle: 'Reimburse Detail',
                date: `${dd}/${mm}/${yyyy}  ${hh}:${min}`,
                isDark: document.documentElement.classList.contains('dark')
            };

            await generateExport(
                contentRef.current,
                fileName,
                format,
                attachments,
                metadata,
                (isExporting) => setIsExporting(isExporting)
            );
        } catch (error) {
            console.error("Export failed:", error);
        }
    };

    useEffect(() => {
        const fetchUrls = async () => {
            if (item.invoice_url) {
                const url = await getFinanceFileUrl(item.invoice_url);
                setInvoiceUrl(url);
            }
            // payment_proof_url is handled by DocumentDrawer at root level
        };
        fetchUrls();
    }, [item.invoice_url, item.payment_proof_url]);

    // Document drawer type is now managed at root level via onPreview

    const displayAmount = item.amount || 0;
    const notes = item.rejection_reason || item.notes || "";
    const category = item.category || "-";
    const status = getPrimaryStatus(item.status as any, "PLANNED", item.status === "PAID" ? "PAID" : "UNPAID");

    return (
        <div className="fixed inset-0 z-[100] isolate">
            {/* BACKDROP */}
            <div
                className="absolute inset-0 bg-neutral-900/20 backdrop-blur-sm transition-opacity duration-300"
                onClick={onClose}
            />

            {/* Drawer Detail */}
            <motion.div
                initial={{ y: "100%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "100%", opacity: 0 }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className={clsx(
                    "absolute z-50 bg-white/30 dark:bg-neutral-900/40 backdrop-blur-[24px] backdrop-saturate-[180%] border border-white/60 dark:border-neutral-800 shadow-2xl rounded-[56px] overflow-hidden flex flex-col",
                    "bottom-2 left-2 right-2 top-20 sm:top-6 sm:bottom-6 sm:right-6 sm:left-auto sm:w-[500px]"
                )}
            >
                {/* Header - Reorganized (Extreme Top) */}
                <div className="flex-none pt-8 pb-4 px-6 flex flex-col bg-transparent sticky top-0 z-20">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-black text-neutral-900 dark:text-white tracking-tight text-2xl">
                            {formatStructuredId("RE", item.project?.project_number || item.project_number, item.request_number, item.project?.project_code || item.project_code) || `RE-${item.id.slice(0, 8)}`}
                        </h2>
                        <div className="flex items-center gap-2">
                            {/* Export Actions (More compact for mobile) */}
                            <div className="flex items-center bg-white/50 dark:bg-neutral-800/50 backdrop-blur-xl border border-black/5 dark:border-white/10 rounded-full h-10 px-0.5">
                                <button
                                    onClick={() => handleExport("jpg")}
                                    disabled={isExporting}
                                    className="px-2.5 h-8 rounded-full flex items-center gap-1 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-neutral-600 dark:text-neutral-400 disabled:opacity-50"
                                    title="Export JPG"
                                >
                                    <ImageIcon size={14} />
                                    <span className="text-[10px] font-bold tracking-tight">JPG</span>
                                </button>
                                <div className="w-[1px] h-3 bg-black/5 dark:bg-white/10" />
                                <button
                                    onClick={() => handleExport("pdf")}
                                    disabled={isExporting}
                                    className="px-2.5 h-8 rounded-full flex items-center gap-1 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-neutral-600 dark:text-neutral-400 disabled:opacity-50"
                                    title="Export PDF"
                                >
                                    <FileText size={14} />
                                    <span className="text-[10px] font-bold tracking-tight">PDF</span>
                                </button>
                            </div>

                            <button
                                onClick={onClose}
                                className="w-10 h-10 bg-white/50 dark:bg-neutral-800/50 backdrop-blur-xl border border-black/5 dark:border-white/10 rounded-full flex items-center justify-center active:scale-95 transition-transform"
                            >
                                <X size={20} className="text-neutral-500 dark:text-neutral-400" strokeWidth={1.5} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto scrollbar-hide" id="export-content" ref={contentRef}>
                    <div className="px-8 pb-8 space-y-6 bg-transparent">
                        {/* REVISION/REJECTION REASON */}
                        {(item.status === "NEED_REVISION" || (item.status === "DRAFT" && item.revision_reason)) && item.revision_reason && (
                            <div className="p-4 bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 rounded-2xl flex gap-3 animate-in fade-in slide-in-from-top-4 duration-500">
                                <AlertCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                                <div>
                                    <div className="text-xs font-bold text-orange-800 dark:text-orange-400 mb-1">Revision Requested</div>
                                    <p className="text-sm text-orange-700 dark:text-orange-300 font-medium leading-relaxed">{item.revision_reason}</p>
                                </div>
                            </div>
                        )}

                        {(item.status === "REJECTED" || item.rejection_reason) && item.rejection_reason && (
                            <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl flex gap-3 animate-in fade-in slide-in-from-top-4 duration-500">
                                <Ban className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                <div>
                                    <div className="text-xs font-bold text-red-800 dark:text-red-400 mb-1">Rejection Reason</div>
                                    <p className="text-sm text-red-700 dark:text-red-300 font-medium leading-relaxed">{item.rejection_reason}</p>
                                </div>
                            </div>
                        )}

                        {/* SECTION: General Information */}
                        <section className="space-y-4">
                            <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                                <Briefcase className="w-4 h-4" strokeWidth={2} /> General Information
                            </h3>
                            <div className="space-y-4">
                                {/* Progress Card */}
                                <div className="p-4 rounded-2xl bg-white/60 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-700/40 shadow-sm backdrop-blur-[2px]">
                                    <div className="text-[10px] font-bold text-neutral-400 mb-4">Progress</div>
                                    {(() => {
                                        const now = new Date();
                                        const sameYear = (d: Date) => d.getFullYear() === now.getFullYear();
                                        const fmt = (d: Date) => format(d, sameYear(d) ? "dd MMM" : "dd MMM yy");

                                        const isApproved = ["APPROVED", "PAID"].includes(item.status);
                                        const isPaid = item.status === "PAID";
                                        const isRevision = item.status === "NEED_REVISION";
                                        const isRejected = item.status === "REJECTED";

                                        const steps = [
                                            {
                                                label: isRevision ? "Revision" : "Submitted",
                                                date: fmt(new Date(item.date || item.created_at)),
                                                accentColor: isRevision ? "text-orange-500" : "text-neutral-500",
                                            },
                                            {
                                                label: isRejected ? "Rejected" : "Approved",
                                                date: isApproved ? fmt(new Date(item.updated_at)) : (isRejected ? fmt(new Date(item.updated_at)) : "-"),
                                                accentColor: isRejected ? "text-red-500" : "text-blue-500",
                                            },
                                            {
                                                label: "Deadline",
                                                date: item.target_date ? fmt(new Date(item.target_date)) : "Anytime",
                                                accentColor: "text-orange-500 dark:text-orange-400",
                                            },
                                            {
                                                label: "Paid",
                                                date: isPaid ? fmt(new Date(item.payment_date || item.updated_at)) : "-",
                                                accentColor: "text-emerald-500",
                                            }
                                        ];

                                        return (
                                            <div className="relative flex items-start w-full px-2">
                                                {/* Continuous Line Background */}
                                                <div className="absolute top-[7px] left-8 right-8 h-[2px] bg-neutral-100 dark:bg-neutral-800 z-0" />

                                                {steps.map((step, idx) => {
                                                    const isCompleted = idx < (isPaid ? 3 : isApproved ? 1 : 0);
                                                    const isCurrent = (isPaid && idx === 3) || (isApproved && !isPaid && idx === 1) || (!isApproved && idx === 0);
                                                    const isDeadlineStep = idx === 2;
                                                    const isPaidStep = idx === 3;
                                                    const isDeadlineActive = !!item.target_date && !isPaid;
                                                    const stepActive = isDeadlineStep ? (isDeadlineActive || isCurrent) : (isCompleted || isCurrent);

                                                    return (
                                                        <div key={idx} className="flex-1 flex flex-col items-center relative z-10">
                                                            {/* Icon/Dot */}
                                                            <div className="bg-white dark:bg-neutral-800 rounded-full p-0.5">
                                                                {isCompleted ? (
                                                                    <CheckCircle2 size={12} className="text-neutral-400" />
                                                                ) : isCurrent && isPaidStep && isPaid ? (
                                                                    <CheckCircle2 size={12} className="text-emerald-500" />
                                                                ) : isCurrent ? (
                                                                    <div className={clsx(
                                                                        "w-2.5 h-2.5 rounded-full border-2",
                                                                        idx === 0 && isRevision ? "bg-orange-500 border-orange-500" :
                                                                            isRejected && idx === 1 ? "bg-red-500 border-red-500" :
                                                                                "bg-blue-500 border-blue-500"
                                                                    )} />
                                                                ) : isDeadlineStep && isDeadlineActive ? (
                                                                    <div className="w-2.5 h-2.5 rounded-full border-2 bg-orange-400 border-orange-400" />
                                                                ) : (
                                                                    <div className="w-2.5 h-2.5 rounded-full border-2 border-neutral-300 dark:border-neutral-600 bg-white/50 dark:bg-neutral-800/50" />
                                                                )}
                                                            </div>
                                                            {/* Label + Date */}
                                                            <div className={clsx(
                                                                "text-[10px] font-bold tracking-tight text-center mt-1 whitespace-nowrap px-1",
                                                                isCurrent || (isDeadlineStep && isDeadlineActive) ? "text-neutral-900 dark:text-white" : "text-neutral-400 dark:text-neutral-500"
                                                            )}>
                                                                {step.label}
                                                            </div>
                                                            <div className={clsx(
                                                                "text-[9px] font-medium text-center whitespace-nowrap tracking-tighter mt-0.5",
                                                                stepActive ? "text-neutral-400 dark:text-neutral-500" : "text-neutral-200 dark:text-neutral-700"
                                                            )}>
                                                                {step.date}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })()}
                                </div>

                                <div className="flex flex-col gap-4">
                                    <div>
                                        <div className="text-[11px] font-semibold text-neutral-500 mb-1.5">Project</div>
                                        <div className="flex items-center flex-wrap gap-1.5 min-h-[22px]">
                                            {item.project ? (
                                                <>
                                                    {isExporting ? (
                                                        <span className="text-sm font-bold text-neutral-600 dark:text-neutral-300">
                                                            {item.project.project_code} • {item.project.project_name || item.project_name}
                                                        </span>
                                                    ) : (
                                                        <div className="flex items-center flex-wrap gap-2">
                                                            <div className="inline-flex items-center px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/50 shadow-sm">
                                                                <span className="text-xs font-bold text-neutral-900 dark:text-white whitespace-nowrap">
                                                                    {item.project.project_code}
                                                                </span>
                                                            </div>
                                                            <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400">
                                                                {item.project.project_name || item.project_name}
                                                            </span>
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <span className="text-sm font-medium text-neutral-400">-</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <div className="text-[11px] font-semibold text-neutral-500 mb-1.5">Priority Level</div>
                                            <div className="text-sm font-medium text-neutral-900 dark:text-white capitalize flex items-center gap-1.5">
                                                {!isExporting && (
                                                    <div className={clsx(
                                                        "w-2 h-2 rounded-full",
                                                        item.priority === 'URGENT' ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" :
                                                            item.priority === 'HIGH' ? "bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]" :
                                                                item.priority === 'MEDIUM' ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" :
                                                                    "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                                                    )} />
                                                )}
                                                <span className={isExporting ? "font-bold" : ""}>{formatStatus(item.priority || "LOW")}</span>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-[11px] font-semibold text-neutral-500 mb-1.5">Submitter</div>
                                            <div className="text-sm font-medium text-neutral-900 dark:text-white flex items-center gap-2">
                                                <div className="w-5 h-5 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-[10px] text-neutral-500 shrink-0">
                                                    {item.staff_name?.[0]}
                                                </div>
                                                {item.staff_name || "Unknown"}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="text-[11px] font-semibold text-neutral-500 mb-1.5">Category</div>
                                        <div className="text-sm font-medium text-neutral-900 dark:text-white capitalize truncate pr-4">
                                            {formatStatus(category)}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-[11px] font-semibold text-neutral-500 mb-1.5">Subcategory</div>
                                        <div className="text-sm font-medium text-neutral-900 dark:text-white capitalize truncate pr-4">
                                            {item.subcategory ? formatStatus(item.subcategory) : "-"}
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <div className="text-[11px] font-semibold text-neutral-500 mb-1.5">Description</div>
                                    <div className="text-sm font-medium text-neutral-900 dark:text-white leading-relaxed">
                                        {item.description || "No description provided"}
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* SECTION: Amount & Status */}
                        <section className="space-y-4 pt-2">
                            <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                                <DollarSign className="w-4 h-4" strokeWidth={2} /> Amount & Status
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-[11px] font-semibold text-neutral-500 mb-1.5">Amount</div>
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-1">
                                            <span className="text-lg font-bold text-neutral-900 dark:text-white">{formatCurrency(item.approved_amount || item.amount)}</span>
                                            {!isExporting && <CopyButton text={String(item.approved_amount || item.amount)} />}
                                        </div>
                                        {(item.approved_amount) && item.approved_amount !== item.amount && (
                                            <div className="flex flex-col gap-0.5">
                                                <div className="text-[10px] text-orange-600 line-through opacity-75 font-bold">
                                                    {formatCurrency(item.amount)}
                                                </div>
                                                <div className="text-[10px] text-orange-500 font-bold bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded-md w-fit mt-1">
                                                    Amount manually overridden by {item.approved_by_name || "Admin"}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-[11px] font-semibold text-neutral-500 mb-1.5">Finance Status</div>
                                    <StatusBadge status={status} textOnly={isExporting} />
                                </div>
                            </div>
                        </section>

                        {/* SECTION: Bank Account */}
                        {(item.beneficiary_bank || item.beneficiary_number || item.beneficiary_name) && (
                            <section className="space-y-4 pt-2">
                                <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                                    <CreditCard className="w-4 h-4" strokeWidth={2} /> Beneficiary Account
                                </h3>
                                <div className="p-4 rounded-2xl bg-white/60 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-700/40 shadow-sm backdrop-blur-[2px]">
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-neutral-900 dark:text-white">{item.beneficiary_bank || "Unknown Bank"}</span>
                                            {isExporting ? (
                                                <span className="text-[13px] font-mono font-bold text-neutral-900 dark:text-white pr-2">
                                                    {item.beneficiary_number || "-"}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[13px] font-mono font-bold border border-blue-100 dark:border-blue-900/50">
                                                    {item.beneficiary_number || "-"}
                                                </span>
                                            )}
                                            {!isExporting && item.beneficiary_number && <CopyButton text={item.beneficiary_number} className="text-blue-500 hover:text-blue-600" data-html2canvas-ignore="true" />}
                                        </div>
                                        <div className="text-xs font-bold text-neutral-500 dark:text-neutral-400 tracking-tight">{item.beneficiary_name || "-"}</div>
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* SECTION: Item Details - TABLE FORMAT */}
                        {item.items && item.items.length > 0 && (
                            <section className="space-y-4 pt-2">
                                <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                                    <Package className="w-4 h-4" strokeWidth={2} /> Item Details
                                </h3>
                                <div className="rounded-3xl bg-white/60 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-700/40 shadow-sm backdrop-blur-[2px] overflow-x-auto scrollbar-hide">
                                    <table className="w-full text-xs text-left">
                                        <thead>
                                            <tr className="border-b border-neutral-100 dark:border-neutral-700/40">
                                                <th className="py-2.5 px-4 text-[10px] font-bold text-neutral-400">Item</th>
                                                <th className="py-2.5 px-2 text-center text-[10px] font-bold text-neutral-400 w-[12%]">Qty</th>
                                                <th className="py-2.5 px-2 text-right text-[10px] font-bold text-neutral-400 w-[25%]">Price</th>
                                                <th className="py-2.5 px-4 text-right text-[10px] font-bold text-neutral-400 w-[25%]">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-neutral-50 dark:divide-neutral-700/30">
                                            {item.items.map((it: any, idx: number) => (
                                                <tr key={idx} className="hover:bg-white/40 dark:hover:bg-neutral-700/20 transition-colors">
                                                    <td className="py-2.5 px-4 font-medium text-neutral-800 dark:text-neutral-200">{it.name}</td>
                                                    <td className="py-2.5 px-2 text-center text-neutral-500 dark:text-neutral-400 tabular-nums">
                                                        {it.qty} {it.unit && <span className="text-[9px]">{it.unit}</span>}
                                                    </td>
                                                    <td className="py-2.5 px-2 text-right text-neutral-500 dark:text-neutral-400 tabular-nums">{it.unit_price ? formatCurrency(it.unit_price) : "-"}</td>
                                                    <td className="py-2.5 px-4 text-right font-bold text-neutral-900 dark:text-white tabular-nums">{formatCurrency(it.total)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Total Summary */}
                                {!(item.approved_amount && item.approved_amount !== item.amount) && (
                                    isExporting ? (
                                        <div className="py-2 flex items-center justify-between border-t border-b border-neutral-100 dark:border-neutral-800 mt-2">
                                            <div className="flex flex-col">
                                                <span className="text-[11px] font-bold text-neutral-600 dark:text-neutral-400 tracking-tight leading-none mb-1">Total Amount</span>
                                                <span className="text-xs text-neutral-400 dark:text-neutral-500 font-medium">{item.items.length} items</span>
                                            </div>
                                            <span className="text-xl font-black text-neutral-900 dark:text-white tracking-tight">{formatCurrency(item.amount)}</span>
                                        </div>
                                    ) : (
                                        <div className="p-4 rounded-2xl bg-white/60 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-700/40 shadow-sm backdrop-blur-[2px] relative overflow-hidden group">
                                            <div className="relative flex items-center justify-between">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider leading-none mb-1">Total Amount</span>
                                                    <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">{item.items.length} items</span>
                                                </div>
                                                <span className="text-xl font-bold text-red-600 dark:text-red-400 tracking-tight">{formatCurrency(item.amount)}</span>
                                            </div>
                                        </div>
                                    )
                                )}
                            </section>
                        )}

                        {/* Transport Details */}
                        {/* Transport Details */}
                        {category === "TRANSPORTATION" && item.details && (item.details.origin || item.details.destination) && (
                            <section className="space-y-4 pt-2">
                                <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                                    <MapPin className="w-4 h-4" strokeWidth={2} /> Trip Details
                                </h3>
                                <div className="p-4 rounded-3xl bg-white/60 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-700/40 shadow-sm backdrop-blur-[2px]">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <div className="text-[11px] font-semibold text-neutral-500 mb-1.5">Origin</div>
                                            <div className="text-sm font-bold text-neutral-900 dark:text-white">{item.details.origin || "-"}</div>
                                        </div>
                                        <div>
                                            <div className="text-[11px] font-semibold text-neutral-500 mb-1.5">Destination</div>
                                            <div className="text-sm font-bold text-neutral-900 dark:text-white">{item.details.destination || "-"}</div>
                                        </div>
                                        {item.details.distance && (
                                            <div>
                                                <div className="text-[11px] font-semibold text-neutral-500 mb-1.5">Distance</div>
                                                <div className="text-sm font-bold text-neutral-900 dark:text-white tabular-nums">{item.details.distance} km</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* SECTION: Documents (Nested Drawer Trigger) */}
                        <section className="space-y-4 pt-2">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                                    <Upload className="w-4 h-4" strokeWidth={2} /> Documents & Proofs
                                </h3>
                            </div>

                            {!isExporting && (
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => onPreview('invoice')}
                                        className={clsx(
                                            "p-4 rounded-3xl border transition-all flex flex-col gap-2 text-left relative overflow-hidden group",
                                            item.existingInvoices?.length > 0
                                                ? "bg-white/60 dark:bg-neutral-800/60 border-neutral-100 dark:border-neutral-700/40 hover:border-blue-200 dark:hover:border-blue-500/30"
                                                : "bg-neutral-50/50 dark:bg-neutral-900/30 border-dashed border-neutral-200 dark:border-neutral-800 opacity-60"
                                        )}
                                    >
                                        <div className="flex items-center justify-between relative z-10">
                                            <span className="text-[10px] font-bold text-neutral-400">Receipt</span>
                                            <FileText size={14} className={clsx(item.existingInvoices?.length > 0 ? "text-red-500" : "text-neutral-300")} />
                                        </div>
                                        <div className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 relative z-10">
                                            {item.existingInvoices?.length > 0 ? `${item.existingInvoices.length} File${item.existingInvoices.length > 1 ? 's' : ''}` : "No Receipt"}
                                        </div>
                                        <div className="absolute -bottom-2 -right-2 opacity-[0.03] group-hover:scale-110 transition-transform duration-500">
                                            <FileText size={48} />
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => onPreview('proof')}
                                        className={clsx(
                                            "p-4 rounded-3xl border transition-all flex flex-col gap-2 text-left relative overflow-hidden group",
                                            item.payment_proof_url
                                                ? "bg-white/60 dark:bg-neutral-800/60 border-neutral-100 dark:border-neutral-700/40 hover:border-emerald-200 dark:hover:border-emerald-500/30"
                                                : "bg-neutral-50/50 dark:bg-neutral-900/30 border-dashed border-neutral-200 dark:border-neutral-800 opacity-60"
                                        )}
                                    >
                                        <div className="flex items-center justify-between relative z-10">
                                            <span className="text-[10px] font-bold text-neutral-400">Payment Proof</span>
                                            <CheckCircle2 size={14} className={clsx(item.payment_proof_url ? "text-emerald-500" : "text-neutral-300")} />
                                        </div>
                                        <div className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 relative z-10">
                                            {item.payment_proof_url ? `${item.payment_proof_url.split(',').length} File${item.payment_proof_url.split(',').length > 1 ? 's' : ''}` : "No Proof"}
                                        </div>
                                        <div className="absolute -bottom-2 -right-2 opacity-[0.03] group-hover:scale-110 transition-transform duration-500">
                                            <CheckCircle2 size={48} />
                                        </div>
                                    </button>
                                </div>
                            )}
                        </section>

                        {/* SECTION: Notes */}
                        <section className="space-y-4 pt-4">
                            <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                                <FileText className="w-4 h-4" strokeWidth={2} /> Additional Notes
                            </h3>
                            <div className="text-[13px] text-neutral-700 dark:text-neutral-300 bg-white/60 dark:bg-neutral-800/60 p-5 rounded-3xl border border-neutral-100 dark:border-neutral-700/40 font-medium leading-relaxed">
                                {item.notes ? (
                                    <span className="italic">"{item.notes}"</span>
                                ) : (
                                    <span className="text-neutral-400 italic">No notes provided</span>
                                )}
                            </div>
                        </section>
                    </div>
                </div>

                {/* Bottom Actions - STANDARDIZED */}
                {
                    isDeleted ? (
                        <div className="flex-none px-8 py-6 sticky bottom-0 z-40">
                            <div className="flex flex-col gap-3">
                                <div className="p-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center shrink-0">
                                        <Trash2 className="w-5 h-5 text-rose-500" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-rose-700 dark:text-rose-400">This item has been deleted</p>
                                        <p className="text-xs text-rose-500 dark:text-rose-400/70 mt-0.5">This request has been permanently removed.</p>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="w-full h-14 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-full font-bold text-base active:scale-[0.98] transition-all flex items-center justify-center"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    ) : (() => {
                        const statusVal = item.status || "PENDING";

                        const isDraftOrRevise = statusVal === "DRAFT" || statusVal === "NEED_REVISION";
                        const isPending = statusVal === "PENDING";
                        const isApprovedNotPaid = statusVal === "APPROVED" && item.financial_status !== "PAID";
                        const isAdmin = ["admin", "superadmin", "supervisor"].includes(userRole || "");
                        const isPaid = item.financial_status === "PAID";

                        const canApprove = isPending && isTeamView;
                        const canPay = isApprovedNotPaid && isTeamView;
                        const canEdit = (isDraftOrRevise || isPending) && !isTeamView;
                        const canDelete = isTeamView ? isAdmin : true; // Owner can always delete their own draft/pending/revision requests

                        const showOwnerWaiting = !isTeamView && statusVal === "PENDING";
                        const hasActions = canApprove || (canPay && !isPaid) || canDelete || showOwnerWaiting || isPaid;

                        if (!hasActions) return null;

                        return (
                            <div className="flex-none px-8 py-6 sticky bottom-0 z-40">
                                <div className="flex flex-col gap-3">
                                    {canApprove && (
                                        <div className="flex flex-col gap-3 w-full">
                                            <div className="flex items-center gap-2">
                                                <button onClick={onDelete} className="w-12 h-12 flex items-center justify-center rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-500 border border-rose-100 dark:border-rose-500/20 active:scale-95 transition-all" title="Delete">
                                                    <Trash2 size={20} />
                                                </button>
                                                <button onClick={onReject} className="w-12 h-12 flex items-center justify-center rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-500 border border-rose-100 dark:border-rose-500/20 active:scale-95 transition-all" title="Reject">
                                                    <Ban size={20} />
                                                </button>
                                                <button onClick={onRevise} className="flex-1 h-12 flex items-center justify-center gap-2 rounded-full bg-orange-50 dark:bg-orange-500/10 text-orange-600 border border-orange-200 dark:border-orange-500/20 active:scale-95 transition-all font-bold text-sm">
                                                    <RotateCcw size={18} /> Revise
                                                </button>
                                            </div>
                                            <button onClick={onApprove} className="w-full h-14 text-base font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-full transition-all shadow-lg shadow-emerald-200/50 flex items-center justify-center gap-2">
                                                <Check size={20} /> Approve
                                            </button>
                                        </div>
                                    )}

                                    {canPay && !isPaid && (
                                        <div className="flex items-center gap-3">
                                            <button onClick={onDelete} className="w-12 h-12 flex items-center justify-center rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-500 border border-rose-100 dark:border-rose-500/20 active:scale-95 transition-all" title="Delete">
                                                <Trash2 size={20} />
                                            </button>
                                            <button onClick={onEdit} className="w-12 h-12 flex items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 active:scale-95 transition-all" title="Edit">
                                                <Pencil size={20} />
                                            </button>
                                            <button
                                                onClick={onPay}
                                                disabled={!item.invoice_url || !item.beneficiary_bank || !item.beneficiary_number}
                                                className="flex-1 h-14 text-base font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-full transition-all shadow-lg shadow-blue-200/50 flex items-center justify-center gap-2 disabled:opacity-50"
                                            >
                                                <CreditCard className="w-[18px] h-[18px]" /> Pay Now
                                            </button>
                                        </div>
                                    )}

                                    {showOwnerWaiting && (
                                        <div className="flex items-center gap-2">
                                            {canDelete && (
                                                <button onClick={onDelete} className="w-[52px] h-[52px] flex items-center justify-center rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-500 border border-rose-100 dark:border-rose-500/20 active:scale-95 transition-all" title="Delete Request">
                                                    <Trash2 size={20} />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => setRevertingItem?.(item)}
                                                className="h-[52px] px-6 rounded-full bg-transparent text-rose-500 border border-rose-500/20 font-bold text-sm active:scale-95 transition-all flex items-center gap-2 shrink-0"
                                                title="Cancel Submission"
                                            >
                                                <Undo2 size={16} /> Cancel
                                            </button>
                                            <div className="flex-1 h-[52px] flex items-center justify-center bg-transparent rounded-full border border-neutral-200/50 dark:border-white/10 text-sm font-bold text-neutral-400 dark:text-neutral-500 gap-2 px-4 whitespace-nowrap">
                                                <Clock size={16} /> Waiting
                                            </div>
                                            {canEdit && (
                                                <button onClick={onEdit} className="h-[52px] px-6 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-bold text-sm active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0">
                                                    <Pencil size={18} /> Edit
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {isDraftOrRevise && !isTeamView && (
                                        <div className="flex items-center gap-3">
                                            <button onClick={onDelete} className="w-14 h-14 flex items-center justify-center rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-500 border border-rose-100 dark:border-rose-500/20 active:scale-95 transition-all shrink-0" title="Delete">
                                                <Trash2 size={24} />
                                            </button>
                                            <button
                                                onClick={onEdit}
                                                className="flex-1 h-14 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-full font-bold text-sm border border-neutral-200 dark:border-neutral-700 flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
                                            >
                                                <Pencil size={20} />
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => {
                                                    updateReimburseStatus(item.id, { status: 'PENDING' }).then(() => {
                                                        onClose();
                                                        loadData();
                                                        setShowSuccess({
                                                            title: "Request Submitted",
                                                            message: "Your request has been successfully submitted."
                                                        });
                                                    });
                                                }}
                                                className="flex-[1.5] h-14 bg-blue-600 text-white rounded-full font-bold text-sm shadow-xl shadow-blue-200/50 flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
                                            >
                                                <Send size={20} />
                                                Submit
                                            </button>
                                        </div>
                                    )}

                                    {isPaid && (
                                        <button
                                            onClick={onClose}
                                            className="w-full h-14 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-full font-bold text-base active:scale-[0.98] transition-all flex items-center justify-center"
                                        >
                                            Close
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })()
                }
            </motion.div >
        </div >
    );
}

// -- MAIN CLIENT --

export default function ReimburseClient() {
    const {
        viewMode,
        setViewMode,
        canAccessTeam,
        userRole,
        profile,
        isLoading: isAuthLoading,
        userId,
        isInitialized,
        searchTerm,
        debouncedSearchTerm,
        setSearchTerm
    } = useFinance();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Filters
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [statusFilter, setStatusFilter] = useState<ReimburseStatus | "ALL">("ALL");
    const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
    const [categoryFilters, setCategoryFilters] = useState<string[]>([]);
    const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
    const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()));
    const [showAllMonths, setShowAllMonths] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    const handleMonthChange = (direction: "prev" | "next") => {
        const nextMonth = addMonths(currentMonth, direction === "prev" ? -1 : 1);
        setCurrentMonth(nextMonth);
        setStartDate(startOfMonth(nextMonth));
        setEndDate(endOfMonth(nextMonth));
        setShowAllMonths(false);
    };

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const itemsPerPage = 50;

    const [items, setItems] = useState<any[]>([]);
    const [fundingSources, setFundingSources] = useState<FundingSource[]>([]);
    const [projects, setProjects] = useState<any[]>([]);

    const [isLoadingData, setIsLoadingData] = useState(true);
    const [isLoadingSources, setIsLoadingSources] = useState(false);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [globalStats, setGlobalStats] = useState<any>(null);

    const isTeamView = viewMode === "team";

    const lastHandledRequestId = useRef<string | null>(null);

    const { contextInstanceId } = useFinance();

    useEffect(() => {
        console.log(`[ReimburseClient] Mounted with Context:${contextInstanceId}`);
    }, [contextInstanceId]);


    // States
    const [viewingItem, setViewingItem] = useState<ReimburseRequest | null>(null);
    const [editingItem, setEditingItem] = useState<ReimburseRequest | null>(null);
    const [deletingItem, setDeletingItem] = useState<ReimburseRequest | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [revertingItem, setRevertingItem] = useState<ReimburseRequest | null>(null);
    const [isReverting, setIsReverting] = useState(false);
    const [approvingItem, setApprovingItem] = useState<ReimburseRequest | null>(null);
    const [revisingItem, setRevisingItem] = useState<ReimburseRequest | null>(null);
    const [rejectingItem, setRejectingItem] = useState<ReimburseRequest | null>(null);
    const [payingItem, setPayingItem] = useState<ReimburseRequest | null>(null);
    const [showSuccess, setShowSuccess] = useState<{ title: string, message: string } | null>(null);
    const [isViewingDeleted, setIsViewingDeleted] = useState(false);
    const [previewingDocument, setPreviewingDocument] = useState<{ item: any, initialTab: 'invoice' | 'proof' } | null>(null);

    // Sorting
    const [sortColumn, setSortColumn] = useState<'date' | 'invoice_date' | 'paid_date' | 'project_name' | 'amount' | 'status' | 'submitter' | 'description' | null>('date');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

    const STATUS_ORDER = ['DRAFT', 'PENDING', 'NEED_REVISION', 'APPROVED', 'PAID', 'REJECTED'];

    // Extract available categories dynamically
    const availableCategories = useMemo(() => {
        const cats = new Set<string>();
        items.forEach(item => { if (item.category) cats.add(item.category); });
        return ['ALL', ...Array.from(cats)].sort();
    }, [items]);

    const handleSort = (column: 'date' | 'invoice_date' | 'paid_date' | 'project_name' | 'amount' | 'status' | 'submitter' | 'description') => {
        if (sortColumn === column) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);

    useEffect(() => {
        const handleExportRequest = () => setShowExportMenu(true);
        window.addEventListener('export-finance', handleExportRequest);
        return () => window.removeEventListener('export-finance', handleExportRequest);
    }, []);

    // Load Data
    const loadData = async (isInitial = false) => {
        // Show loading screen only on initial load to avoid disrupting the UI
        if (isInitial) setIsLoadingData(true);
        setIsRefreshing(true);
        try {
            const offset = (currentPage - 1) * itemsPerPage;
            const [{ data: rawItems, total, stats }, profiles, projectList] = await Promise.all([
                fetchReimburseRequests({
                    limit: itemsPerPage,
                    offset: offset,
                    project_id: selectedProjects.length > 0 ? selectedProjects : undefined,
                    status: statusFilter !== "ALL" ? statusFilter : undefined,
                    category: categoryFilters.length > 0 ? categoryFilters : undefined,
                    start_date: showAllMonths ? undefined : format(startDate, "yyyy-MM-dd"),
                    end_date: showAllMonths ? undefined : format(endDate, "yyyy-MM-dd"),
                    my_requests: !isTeamView,
                    q: debouncedSearchTerm ? debouncedSearchTerm : undefined
                }),
                fetchTeamMembers(),
                fetchAllProjects()
            ]);

            setTotalItems(total || 0);
            setGlobalStats(stats);
            const profileMap = new Map((profiles || []).map(p => [p.id, p]));
            setProjects(projectList || []);

            const mapped = (rawItems || []).map((req: any) => {
                const creator = profileMap.get(req.created_by);
                return {
                    ...req,
                    project_name: req.project?.project_name || req.project_name || "General",
                    project_code: req.project?.project_code || req.project_code || "GEN",
                    project_number: req.project?.project_number || req.project_number,
                    request_number: req.request_number,
                    priority: req.priority,
                    target_date: req.target_date,
                    staff_name: creator?.username || "Unknown",
                    staff_role: creator?.role || "Unknown Role"
                };
            });
            setItems(mapped);
        } catch (error) {
            console.error("Error loading:", error);
        } finally {
            setIsLoadingData(false);
            setIsRefreshing(false);
        }
    };

    const loadFundingSources = async () => {
        setIsLoadingSources(true);
        try {
            const wsId = await fetchDefaultWorkspaceId();
            if (wsId) {
                const sources = await fetchFundingSources(wsId);
                setFundingSources(sources.filter(s => s.is_active));
            }
        } catch (e) { console.error(e); }
        finally { setIsLoadingSources(false); }
    }

    // Initial load and filters change
    useEffect(() => {
        if (isInitialized && userId) {
            loadData(items.length === 0);
        }
    }, [isAuthLoading, isInitialized, userId, currentPage, statusFilter, selectedProjects, categoryFilters, startDate, endDate, showAllMonths, isTeamView, currentMonth, debouncedSearchTerm]);

    // Reset page when filters OR search change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, selectedProjects, categoryFilters, startDate, endDate, showAllMonths, isTeamView, currentMonth]);

    useEffect(() => {
        if (!isAuthLoading && userId) {
            loadFundingSources();
        }
    }, [isAuthLoading, userId, isTeamView]);

    // FAB Action Listener
    useEffect(() => {
        const handleFabAction = (e: any) => {
            if (e.detail?.id === 'FINANCE_NEW_REIMBURSE' || e.detail?.id === 'FINANCE_NEW_PURCHASE') {
                setEditingItem(null);
                setIsDrawerOpen(true);
            }
        };

        const handleFilterToggle = () => {
            setShowFilters(true);
        };

        window.addEventListener('fab-action', handleFabAction);
        window.addEventListener('toggle-filters', handleFilterToggle);
        return () => {
            window.removeEventListener('fab-action', handleFabAction);
            window.removeEventListener('toggle-filters', handleFilterToggle);
        };
    }, []);

    // Handle requestId from notification (or Overview)
    useEffect(() => {
        const requestId = searchParams.get('requestId');

        // Reset handled ID only when it's gone from URL
        if (!requestId) {
            lastHandledRequestId.current = null;
            return;
        }

        if (requestId && !viewingItem && !editingItem && requestId !== lastHandledRequestId.current) {
            const openDrawer = (item: ReimburseRequest) => {
                lastHandledRequestId.current = requestId;
                if (isTeamView) {
                    setViewingItem(item);
                } else {
                    setEditingItem(item);
                    setIsDrawerOpen(true);
                }
            };

            const existingItem = items.find(i => i.id === requestId);
            if (existingItem) {
                openDrawer(existingItem);
            } else {
                // If not in current list, fetch explicitly
                fetchReimburseRequestById(requestId).then(async (req) => {
                    if (req) {
                        const profiles = await fetchTeamMembers();
                        const profileMap = new Map((profiles || []).map(p => [p.id, p]));
                        const creatorName = profileMap.get(req.created_by)?.username || "Unknown";

                        const formatted: ReimburseRequest = {
                            ...req,
                            project_name: req.project?.project_name || req.project_name || "General",
                            project_code: req.project?.project_code || req.project_code || "GEN",
                            project_number: req.project?.project_number || req.project_number,
                            request_number: req.request_number,
                            priority: req.priority,
                            target_date: req.target_date,
                            staff_name: creatorName,
                            items: req.items?.map((it: any) => ({
                                id: it.id,
                                name: it.name,
                                qty: it.qty,
                                unit: it.unit,
                                unit_price: it.unitPrice || it.unit_price,
                                total: it.total
                            })) || [],
                            existingInvoices: req.existingInvoices || []
                        };
                        openDrawer(formatted);
                    }
                });
            }
        }
    }, [searchParams, items, isTeamView, viewingItem, editingItem]);

    const clearRequestId = () => {
        lastHandledRequestId.current = null;
        const params = new URLSearchParams(window.location.search);
        if (params.has('requestId')) {
            params.delete('requestId');
            router.replace(`${pathname}?${params.toString()}`, { scroll: false });
        }
    };

    // Helpers



    // 1. Base Items: Now just current page items (already filtered by backend)
    const baseItems = useMemo(() => {
        return items;
    }, [items]);

    // 2. Summary Stats derived from API globalStats
    const summaryStats = useMemo(() => {
        if (globalStats) {
            return {
                total: globalStats.totalCount,
                totalAmount: globalStats.totalAmount,
                pending: globalStats.pendingCount,
                pendingAmount: globalStats.pendingAmount,
                approved: globalStats.approvedCount,
                approvedAmount: globalStats.approvedAmount,
                paid: globalStats.paidCount,
                paidAmount: globalStats.paidAmount,
                rejected: globalStats.rejectedCount
            };
        }
        return {
            total: 0,
            totalAmount: 0,
            pending: 0,
            pendingAmount: 0,
            approved: 0,
            approvedAmount: 0,
            paid: 0,
            paidAmount: 0,
            rejected: 0
        };
    }, [globalStats]);

    // 3. Final Filtered Items: pure local filter, computed every render (no memo caching issues)
    const filteredItems = (() => {
        let result = [...items];

        if (searchTerm) {
            const q = searchTerm.replace(/["'“”‘’«»„俘〞‟゛゜]+/g, '').trim().toLowerCase();
            
            if (q.length > 0) {

                result = result.filter(item => {
                    const desc = (item.description || "").toLowerCase();
                    const projectName = (item.project_name || item.project?.project_name || "").toLowerCase();
                    const projectCode = (item.project_code || item.project?.project_code || "").toLowerCase();
                    const staff = (item.staff_name || "").toLowerCase();
                    const notes = (item.notes || "").toLowerCase();
                    const subcategory = (item.subcategory || "").toLowerCase();
                    const category = (item.category || "").toLowerCase();
                    const reqNum = String(item.request_number || "");
                    const itemNames = (item.items || []).map((it: any) => (it.name || "").toLowerCase()).join(" ");

                    return (
                        desc.includes(q) ||
                        itemNames.includes(q) ||
                        projectCode.includes(q) ||
                        reqNum.includes(q) ||
                        staff.includes(q)
                    );
                });
            }
        }

        // Apply sorting
        if (sortColumn) {
            result = [...result].sort((a, b) => {
                let comparison = 0;
                switch (sortColumn) {
                    case 'date':
                        // Submitted Date = created_at
                        comparison = new Date((a as any).created_at || a.date).getTime() - new Date((b as any).created_at || b.date).getTime();
                        break;
                    case 'invoice_date':
                        // Invoice Date = date
                        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
                        break;
                    case 'paid_date':
                        const aDate = a.payment_date ? new Date(a.payment_date).getTime() : 0;
                        const bDate = b.payment_date ? new Date(b.payment_date).getTime() : 0;
                        comparison = aDate - bDate;
                        break;
                    case 'project_name':
                        const aProj = a.project_name || a.project?.project_name || '';
                        const bProj = b.project_name || b.project?.project_name || '';
                        comparison = aProj.localeCompare(bProj);
                        break;
                    case 'amount':
                        comparison = (Number(a.amount) || 0) - (Number(b.amount) || 0);
                        break;
                    case 'status':
                        comparison = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
                        break;
                    case 'submitter':
                        comparison = (a.staff_name || '').localeCompare(b.staff_name || '');
                        break;
                    case 'description':
                        comparison = (a.description || '').localeCompare(b.description || '');
                        break;
                }
                return sortDirection === 'asc' ? comparison : -comparison;
            });
        }

        return result;
    })();

    const handleExport = async () => {
        if (filteredItems.length === 0) return;
        setIsExporting(true);

        try {
            // 1. Prepare Meta
            const projectCount = selectedProjects.length;
            const project = projectCount === 1 ? projects.find(p => p.id === selectedProjects[0]) : null;
            const projectCode = project ? (project.projectCode || "PRG") : (projectCount === 0 ? "ALL" : "MULTIPLE");
            const projectName = project ? project.projectName : (projectCount === 0 ? "All Projects" : `${projectCount} Selected Projects`);
            const documentName = isTeamView ? "Team Reimbursement Report" : "My Reimbursement Report";
            const generatedAt = format(new Date(), "dd MMM yyyy, HH:mm");

            const startStr = format(startDate, "dd MMM");
            const endStr = format(endDate, "dd MMM yyyy");
            const periodText = showAllMonths ? "All Time Report" : `Report Period: ${startStr} – ${endStr}`;

            // 2. Prepare Summary
            const summaryCards = [
                { label: "Total Request", value: summaryStats.total, format: "number" as const, color: "blue" as const },
                { label: "Approved", value: summaryStats.approved, format: "number" as const, color: "green" as const },
                { label: "Paid", value: summaryStats.paid, format: "number" as const, color: "emerald" as const },
                { label: "Rejected", value: summaryStats.rejected, format: "number" as const, color: "neutral" as const },
                { label: "Pending", value: summaryStats.pending, format: "number" as const, color: "orange" as const },
            ];

            // 3. Columns
            const columns = [
                { id: "date", label: "Date", align: "left" as const, width: "100px" },
                { id: "staff", label: "Staff", align: "left" as const },
                { id: "project", label: "Project", align: "left" as const },
                { id: "description", label: "Description", align: "left" as const, width: "200px" },
                { id: "amount", label: "Amount", align: "right" as const, format: "currency" as const },
                { id: "status", label: "Status", align: "center" as const, width: "100px" },
            ];

            // 4. Data
            const rows = filteredItems.map(item => ({
                date: format(new Date(item.date || item.created_at), "dd MMM yyyy"),
                staff: item.staff_name,
                project: `[${item.project?.project_code || "GEN"}] ${cleanEntityName(item.project?.project_name || "General")}`,
                description: item.description,
                amount: item.amount,
                status: formatStatus(item.status),
            }));

            // 5. Call API
            const response = await fetch("/api/export/pdf", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    meta: {
                        projectCode,
                        projectName,
                        documentName,
                        periodText,
                        generatedAt,
                    },
                    summary: summaryCards,
                    columns,
                    data: rows
                })
            });

            if (!response.ok) throw new Error("Export failed");

            // 6. Download
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            const dateSuffix = format(new Date(), "yyyyMMdd");
            a.download = `Reimb_${projectCode}_${dateSuffix}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

        } catch (error) {
            console.error("PDF Export Error:", error);
            alert("Failed to export PDF. Please try again.");
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportExcel = async () => {
        if (filteredItems.length === 0) return;
        setIsExporting(true);

        try {
            const projectCount = selectedProjects.length;
            const project = projectCount === 1 ? projects.find(p => p.id === selectedProjects[0]) : null;
            const projectCode = project ? (project.projectCode || "PRG") : (projectCount === 0 ? "ALL" : "MULTIPLE");
            const dateSuffix = format(new Date(), "yyyyMMdd");
            const filename = `Reimb_${projectCode}_${dateSuffix}.xlsx`;

            // Format data for Excel
            const data = filteredItems.map(item => ({
                "Date": format(new Date(item.date || item.created_at), "dd MMM yyyy"),
                "Staff": item.staff_name,
                "Project": `[${item.project?.project_code || "GEN"}] ${cleanEntityName(item.project?.project_name || "General")}`,
                "Description": item.description,
                "Amount": item.amount,
                "Status": formatStatus(item.status),
                "Category": item.category,
                "Subcategory": item.subcategory,
                "Approved Amount": item.approved_amount || item.details?.approved_amount || "N/A",
                "Rejection Reason": item.rejection_reason || "N/A",
                "Revision Reason": item.revision_reason || "N/A",
            }));

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(data);

            // Auto size columns roughly
            const wscols = Object.keys(data[0] || {}).map(key => ({ wch: Math.max(15, key.length + 5) }));
            ws['!cols'] = wscols;

            XLSX.utils.book_append_sheet(wb, ws, "Reimbursement Data");

            // Write file and trigger download
            XLSX.writeFile(wb, filename);

        } catch (error) {
            console.error("Excel Export Error:", error);
            alert("Failed to export Excel. Please try again.");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <FinancePageWrapper
            header={
                <FinanceHeader
                    title="Reimbursement"
                    subtitle={isTeamView ? "Manage all staff reimbursement requests." : "Track your personal reimbursement requests."}
                />
            }
        >
            {(isAuthLoading || isLoadingData) ? <GlobalLoading /> : (
                <>
                    <div className="flex flex-col gap-6">
                        {/* SUMMARY CARDS */}
                        <FinanceSummaryCardsRow className="!mb-0">
                            <FinanceSummaryCard
                                icon={<Package className="w-5 h-5 text-blue-600" />}
                                iconBg="bg-blue-50"
                                label="Total Requests"
                                value={summaryStats.total.toString()}
                                subtext={formatCurrency(summaryStats.totalAmount)}
                                onClick={() => setStatusFilter("ALL")}
                                isActive={statusFilter === "ALL"}
                                activeColor="ring-blue-500"
                            />

                            <FinanceSummaryCard
                                icon={<Clock className="w-5 h-5 text-orange-600" />}
                                iconBg="bg-orange-50"
                                label="Pending"
                                value={summaryStats.pending.toString()}
                                subtext={formatCurrency(summaryStats.pendingAmount)}
                                onClick={() => setStatusFilter("PENDING")}
                                isActive={statusFilter === "PENDING"}
                                activeColor="ring-orange-500"
                            />

                            <FinanceSummaryCard
                                icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                                iconBg="bg-emerald-50"
                                label="Approved"
                                value={summaryStats.approved.toString()}
                                subtext={formatCurrency(summaryStats.approvedAmount)}
                                onClick={() => setStatusFilter("APPROVED")}
                                isActive={statusFilter === "APPROVED"}
                                activeColor="ring-emerald-500"
                            />

                            <FinanceSummaryCard
                                icon={<CreditCard className="w-5 h-5 text-blue-600" />}
                                iconBg="bg-blue-50"
                                label="Paid"
                                value={summaryStats.paid.toString()}
                                subtext={formatCurrency(summaryStats.paidAmount)}
                                onClick={() => setStatusFilter("PAID")}
                                isActive={statusFilter === "PAID"}
                                activeColor="ring-blue-600"
                            />

                            <FinanceSummaryCard
                                icon={<XCircle className="w-5 h-5 text-neutral-600" />}
                                iconBg="bg-neutral-100"
                                label="Rejected"
                                value={summaryStats.rejected.toString()}
                                subtext="REJECTED"
                                onClick={() => setStatusFilter("REJECTED")}
                                isActive={statusFilter === "REJECTED"}
                                activeColor="ring-neutral-500"
                            />
                        </FinanceSummaryCardsRow>

                        {/* Export Menu Overlay */}
                        <AnimatePresence>
                            {showExportMenu && (
                                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        onClick={() => setShowExportMenu(false)}
                                        className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
                                    />
                                    <motion.div
                                        initial={{ scale: 0.9, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 0.9, opacity: 0 }}
                                        className="relative w-full max-w-xs bg-white dark:bg-neutral-900 rounded-[32px] shadow-2xl border border-white/20 dark:border-neutral-800 p-2 overflow-hidden"
                                    >
                                        <div className="p-4 border-b border-neutral-100 dark:border-neutral-800">
                                            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Export Options</h3>
                                        </div>
                                        <div className="py-1">
                                            <button onClick={() => { handleExport(); setShowExportMenu(false); }} className="w-full px-4 py-3 flex items-center gap-3 text-sm font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                                                <FileText className="w-4 h-4 text-blue-500" /> Export to PDF
                                            </button>
                                            <button onClick={() => { handleExportExcel(); setShowExportMenu(false); }} className="w-full px-4 py-3 flex items-center gap-3 text-sm font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                                                <FileSpreadsheet className="w-4 h-4 text-emerald-500" /> Export to XLS
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => setShowExportMenu(false)}
                                            className="w-full mt-1 py-3 text-xs font-bold text-neutral-400 hover:text-neutral-600 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </motion.div>
                                </div>
                            )}
                        </AnimatePresence>

                        {/* MOBILE CARD LIST */}
                        <div className="mt-6 block md:hidden space-y-3">
                            {filteredItems.length === 0 ? (
                                <div className="bg-white/40 dark:bg-neutral-900/60 backdrop-blur-md rounded-[24px] border border-white/50 dark:border-neutral-800 shadow-sm dark:shadow-none p-6 text-center">
                                    <Package className="w-10 h-10 text-neutral-400 dark:text-neutral-600 mx-auto mb-2" />
                                    <h4 className="text-[17px] font-bold text-neutral-900 dark:text-white mt-4">
                                        {searchTerm ? "No Search Results" :
                                            statusFilter !== "ALL" ? `No ${statusFilter.toLowerCase()} requests` :
                                                "No Reimbursement Requests Yet"}
                                    </h4>
                                    <p className="text-[13px] text-neutral-500 dark:text-neutral-400 mt-2 max-w-[240px] mx-auto leading-relaxed">
                                        {searchTerm ? "Try adjusting your search terms to find what you're looking for." :
                                            "Start by creating a new request to track your claims and expenses."}
                                    </p>
                                    {!searchTerm && statusFilter === "ALL" && (
                                        <button
                                            onClick={() => setIsDrawerOpen(true)}
                                            className="mt-6 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white text-[14px] font-bold rounded-full shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all"
                                        >
                                            <Plus className="w-4 h-4 inline mr-2" strokeWidth={3} />New Request
                                        </button>
                                    )}
                                </div>
                            ) : (
                                filteredItems.map((item) => {
                                    const isAdmin = ["admin", "superadmin", "supervisor"].includes(userRole || "");
                                    const isPending = item.status === "PENDING";
                                    const isApprovedNotPaid = item.status === "APPROVED" && item.financial_status !== "PAID";
                                    const isDraftOrRevise = item.status === "DRAFT" || item.status === "NEED_REVISION";

                                    const renderMobileActions = () => (
                                        <div className="flex items-center gap-1.5 w-full justify-end">
                                            {isTeamView ? (
                                                <>
                                                    {isAdmin && (
                                                        <button onClick={(e) => { e.stopPropagation(); setDeletingItem(item); }} className="p-2.5 rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-500 border border-rose-100 dark:border-rose-500/20 flex-shrink-0 active:scale-95 transition-all">
                                                            <Trash2 className="w-[18px] h-[18px]" />
                                                        </button>
                                                    )}
                                                    {isPending && (
                                                        <>
                                                            <button onClick={(e) => { e.stopPropagation(); setRejectingItem(item); }} className="p-2.5 rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-500 border border-rose-100 dark:border-rose-500/20 flex-shrink-0 active:scale-95 transition-all" title="Reject">
                                                                <Ban className="w-[18px] h-[18px]" />
                                                            </button>
                                                            <button onClick={(e) => { e.stopPropagation(); setRevisingItem(item); }} className="flex-1 py-2.5 rounded-full bg-orange-500/10 text-orange-600 text-[11px] font-bold border border-orange-200/50 flex items-center justify-center gap-1.5 active:scale-95 transition-all">
                                                                <RotateCcw className="w-[18px] h-[18px]" /> Revise
                                                            </button>
                                                            <button onClick={(e) => { e.stopPropagation(); setApprovingItem(item); }} className="flex-[1.5] py-2.5 rounded-full bg-emerald-500 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-md shadow-emerald-200/50">
                                                                <Check className="w-[18px] h-[18px]" /> Approve
                                                            </button>
                                                        </>
                                                    )}
                                                    {isApprovedNotPaid && (
                                                        <button onClick={(e) => { e.stopPropagation(); setPayingItem(item); }} className="flex-1 py-2.5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-md shadow-blue-200/50">
                                                            <CreditCard className="w-[18px] h-[18px]" /> Pay Now
                                                        </button>
                                                    )}
                                                </>
                                            ) : (
                                                <>
                                                    <button onClick={(e) => { e.stopPropagation(); setDeletingItem(item); }} className="p-2 rounded-xl bg-rose-500/10 dark:bg-rose-500/10 text-rose-500 border border-rose-200/50 dark:border-rose-500/20 flex-shrink-0 active:scale-95 transition-all" title="Delete">
                                                        <Trash2 className="w-[18px] h-[18px]" />
                                                    </button>
                                                    {(isDraftOrRevise) && (
                                                        <button onClick={(e) => {
                                                            e.stopPropagation();
                                                            const editPayload: any = { ...item };
                                                            setEditingItem(editPayload);
                                                            setIsDrawerOpen(true);
                                                        }} className="flex-1 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 font-bold text-[11px] flex items-center justify-center gap-1.5 active:scale-95 transition-all">
                                                            <Pencil className="w-4 h-4" /> Edit
                                                        </button>
                                                    )}
                                                    {item.status === 'DRAFT' && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                updateReimburseStatus(item.id, { status: 'PENDING' }).then(() => {
                                                                    loadData();
                                                                    setShowSuccess({
                                                                        title: "Request Submitted",
                                                                        message: "Your request has been successfully submitted."
                                                                    });
                                                                });
                                                            }}
                                                            className="flex-[1.5] py-2 rounded-xl bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-md shadow-blue-200/50"
                                                        >
                                                            <Send className="w-4 h-4" /> Submit
                                                        </button>
                                                    )}
                                                    {isPending && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setRevertingItem(item); }}
                                                            className="flex-1 py-2 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-200/50 text-[11px] font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                                                        >
                                                            <Undo2 className="w-4 h-4" /> Cancel
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    );

                                    return (
                                        <FinanceItemCard
                                            key={item.id}
                                            item={item}
                                            onClick={() => setViewingItem(item)}
                                            actions={item.status !== 'PAID' ? renderMobileActions() : undefined}
                                        />
                                    );
                                })
                            )}
                        </div>

                        {/* DESKTOP TOOLBAR & TABLE */}
                        <div className="mt-3 hidden md:block">
                            <FinanceToolbar
                                currentMonth={currentMonth}
                                onMonthChange={handleMonthChange}
                                projects={projects}
                                selectedProjects={selectedProjects}
                                onProjectToggle={(id) => {
                                    if (selectedProjects.includes(id)) {
                                        setSelectedProjects(selectedProjects.filter(pid => pid !== id));
                                    } else {
                                        setSelectedProjects([...selectedProjects, id]);
                                    }
                                }}
                                onClearProjects={() => setSelectedProjects([])}
                                showAllMonths={showAllMonths}
                                onToggleShowAll={() => setShowAllMonths(!showAllMonths)}
                            />

                            <div className="bg-white/40 dark:bg-white/[0.03] backdrop-blur-md rounded-3xl border border-white/50 dark:border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.02)] dark:shadow-none overflow-hidden">
                            <div className="overflow-x-auto scrollbar-hide">
                                <table className="w-full text-left border-collapse table-auto">
                                    <thead>
                                        <tr className="border-b border-neutral-100 dark:border-white/[0.06] bg-neutral-50/50 dark:bg-white/[0.02]">
                                            <th className="px-6 py-4 text-[10px] font-bold text-neutral-400 dark:text-neutral-500 cursor-pointer hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors hidden xl:table-cell" onClick={() => handleSort('date')}>
                                                <div className="flex items-center gap-1 group/header">
                                                    Timeline
                                                    {sortColumn === 'date' ? (
                                                        sortDirection === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                                                    ) : <ChevronDown className="w-3.5 h-3.5 text-neutral-400 opacity-0 group-hover/header:opacity-40 transition-all" />}
                                                </div>
                                            </th>
                                            <th className="px-6 py-4 text-[10px] font-bold text-neutral-400 dark:text-neutral-500 cursor-pointer hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors min-w-[120px]" onClick={() => handleSort('project_name')}>
                                                <div className="flex items-center gap-1 group/header">
                                                    Project / RE
                                                    {sortColumn === 'project_name' ? (
                                                        sortDirection === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                                                    ) : <ChevronDown className="w-3.5 h-3.5 text-neutral-400 opacity-0 group-hover/header:opacity-40 transition-all" />}
                                                </div>
                                            </th>
                                            <th className="px-6 py-4 text-[10px] font-bold text-neutral-400 dark:text-neutral-500 cursor-pointer hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors" onClick={() => handleSort('description')}>
                                                <div className="flex items-center gap-1 group/header">
                                                    Item Detail
                                                    {sortColumn === 'description' ? (
                                                        sortDirection === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                                                    ) : <ChevronDown className="w-3.5 h-3.5 text-neutral-400 opacity-0 group-hover/header:opacity-40 transition-all" />}
                                                </div>
                                            </th>
                                            <th className="px-6 py-4 text-right text-[10px] font-bold text-neutral-400 dark:text-neutral-500 cursor-pointer hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors" onClick={() => handleSort('amount')}>
                                                <div className="flex items-center justify-end gap-1 group/header">
                                                    Amount
                                                    {sortColumn === 'amount' ? (
                                                        sortDirection === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                                                    ) : <ChevronDown className="w-3.5 h-3.5 text-neutral-400 opacity-0 group-hover/header:opacity-40 transition-all" />}
                                                </div>
                                            </th>
                                            <th className="px-6 py-4 text-center text-[10px] font-bold text-neutral-400 dark:text-neutral-500 cursor-pointer hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors" onClick={() => handleSort('status')}>
                                                <div className="flex items-center justify-center gap-1 group/header">
                                                    Status
                                                    {sortColumn === 'status' ? (
                                                        sortDirection === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                                                    ) : <ChevronDown className="w-3.5 h-3.5 text-neutral-400 opacity-0 group-hover/header:opacity-40 transition-all" />}
                                                </div>
                                            </th>
                                            <th className="px-6 py-4 text-[10px] font-bold text-neutral-400 dark:text-neutral-500 cursor-pointer hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors hidden 2xl:table-cell" onClick={() => handleSort('submitter')}>
                                                <div className="flex items-center gap-1 group/header">
                                                    Submitter
                                                    {sortColumn === 'submitter' ? (
                                                        sortDirection === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                                                    ) : <ChevronDown className="w-3.5 h-3.5 text-neutral-400 opacity-0 group-hover/header:opacity-40 transition-all" />}
                                                </div>
                                            </th>
                                            <th className="px-6 py-4 text-right text-[10px] font-bold text-neutral-400 dark:text-neutral-500 hidden 2xl:table-cell w-[140px]">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-50 dark:divide-white/[0.04]">
                                        {filteredItems.length === 0 ? (
                                            <tr>
                                                <td colSpan={isTeamView ? 8 : 7} className="py-16 text-center">
                                                    <div className="flex flex-col items-center gap-4">
                                                        <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center">
                                                            <Package className="w-8 h-8 text-neutral-400" />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <h4 className="text-base font-bold text-neutral-900">
                                                                {searchTerm ? "No results found" :
                                                                    statusFilter !== "ALL" ? `No ${statusFilter.toLowerCase()} requests` :
                                                                        "No reimbursement requests yet"}
                                                            </h4>
                                                            <p className="text-sm text-neutral-500 max-w-xs mx-auto">
                                                                {searchTerm ?
                                                                    `We couldn't find any requests matching "${searchTerm}". Try a different search term.` :
                                                                    statusFilter !== "ALL" ?
                                                                        `There are no ${statusFilter.toLowerCase()} reimbursement requests found.` :
                                                                        isTeamView ?
                                                                            "When team members submit reimbursement requests, they'll appear here for your review." :
                                                                            "Start by creating your first reimbursement request. Track claims and expenses easily."}
                                                            </p>
                                                        </div>
                                                        {!searchTerm && statusFilter === "ALL" && (
                                                            <button
                                                                onClick={() => setIsDrawerOpen(true)}
                                                                className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl shadow-lg shadow-blue-200/50 transition-all flex items-center gap-2"
                                                            >
                                                                <Plus className="w-4 h-4" />
                                                                New Reimbursement Request
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredItems.map(item => (
                                                <tr
                                                    key={item.id}
                                                    onClick={() => setViewingItem(item)}
                                                    className="transition-all hover:bg-white/60 dark:hover:bg-white/[0.04] cursor-pointer group"
                                                >
                                                    <td className="px-6 py-4 whitespace-nowrap hidden xl:table-cell">
                                                        <div className="flex flex-col gap-1">
                                                            <div className="flex items-baseline gap-1 text-[11px] font-bold text-neutral-900 dark:text-white tabular-nums leading-none">
                                                                {format(new Date(item.date), "dd MMM")}
                                                                <span className="text-[8px] font-bold text-neutral-400 uppercase">
                                                                    {format(new Date(item.created_at || item.date), "dd MMM") === format(new Date(item.date), "dd MMM") ? "(S/I)" : "(I)"}
                                                                </span>
                                                            </div>
                                                            <div className="flex flex-col gap-0.5">
                                                                {format(new Date(item.created_at || item.date), "dd MMM") !== format(new Date(item.date), "dd MMM") && (
                                                                    <div className="flex items-center gap-1 text-[9px] font-medium text-neutral-400 uppercase tabular-nums">
                                                                        {format(new Date(item.created_at), "dd MMM")} <span className="text-[7.5px] font-bold opacity-70">(S)</span>
                                                                    </div>
                                                                )}
                                                                {item.payment_date && (
                                                                    <div className="flex items-center gap-1 text-[9px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tabular-nums">
                                                                        {format(new Date(item.payment_date), "dd MMM")} <span className="text-[7.5px] font-bold opacity-70">(P)</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col gap-1.5">
                                                            <div className="px-2 py-0.5 rounded-full text-[10px] font-bold w-fit bg-neutral-100 dark:bg-white/10 text-neutral-600 dark:text-neutral-400">
                                                                {item.project?.project_code || "N/A"}
                                                            </div>
                                                            <span className="text-[10px] font-medium text-neutral-400 tabular-nums uppercase whitespace-nowrap">
                                                                {formatStructuredId('RE', item.project_number, item.request_number, item.project_code)}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col gap-0.5 max-w-[180px]">
                                                            <span className="font-bold text-neutral-900 dark:text-white text-[12px] line-clamp-2 leading-tight">
                                                                {item.items && item.items.length > 0 ? (
                                                                    item.items.length > 2 
                                                                        ? `${item.items[0].name} +${item.items.length - 1} more` 
                                                                        : item.items.map((i: any) => i.name).join(", ")
                                                                ) : item.description}
                                                            </span>
                                                            {item.items && item.items.length > 0 && (
                                                                <span className="text-[10px] text-neutral-400 font-medium">
                                                                    {item.items.length} {item.items.length > 1 ? "items" : "item"}
                                                                    {(item as any).vendor && <span className="text-neutral-300 mx-1">•</span>}
                                                                    {(item as any).vendor && <span className="text-neutral-400">{cleanEntityName((item as any).vendor)}</span>}
                                                                </span>
                                                            )}
                                                            <div className="flex items-center gap-1 mt-1 text-[9px] font-bold text-neutral-400 uppercase tracking-wider">
                                                                <span className="text-neutral-500">{item.category?.replace(/_/g, " ")}</span>
                                                                {item.subcategory && (
                                                                    <>
                                                                        <span className="text-neutral-300">•</span>
                                                                        <span className="text-neutral-500">{item.subcategory?.replace(/_/g, " ")}</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex flex-col items-end">
                                                            {(() => {
                                                                const approvedAmount = item.approved_amount || item.details?.approved_amount;
                                                                return (
                                                                    <>
                                                                        <span className={clsx("text-xs font-bold tabular-nums", approvedAmount && approvedAmount !== item.amount ? "text-neutral-400 line-through" : "text-neutral-900")}>
                                                                            {formatCurrency(item.amount)}
                                                                        </span>
                                                                        {approvedAmount && approvedAmount !== item.amount && (
                                                                            <span className="text-xs font-bold text-emerald-600 tabular-nums bg-emerald-50 px-1 rounded">
                                                                                {formatCurrency(approvedAmount)}
                                                                            </span>
                                                                        )}
                                                                    </>
                                                                );
                                                            })()}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        {(() => {
                                                            const theme = STATUS_THEMES[item.status as keyof typeof STATUS_THEMES] || STATUS_THEMES.DRAFT;
                                                            return <span className={clsx("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border", theme.bg, theme.text, theme.border)}>{formatStatus(item.status)}</span>
                                                        })()}
                                                    </td>
                                                    <td className="px-6 py-4 hidden 2xl:table-cell max-w-[100px]">
                                                        <span className="text-neutral-900 dark:text-white text-[12px] font-medium whitespace-normal leading-tight block">
                                                            {item.staff_name}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right hidden 2xl:table-cell">
                                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                                            {isTeamView ? (
                                                                <>
                                                                    {item.status === 'PENDING' && (
                                                                        <>
                                                                            <button onClick={(e) => { e.stopPropagation(); setApprovingItem(item); }} className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-full transition-all" title="Approve">
                                                                                <CheckCircle2 className="w-4 h-4" strokeWidth={2} />
                                                                            </button>
                                                                            <button onClick={(e) => { e.stopPropagation(); setRevisingItem(item); }} className="p-1.5 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10 rounded-full transition-all" title="Request Revision">
                                                                                <AlertCircle className="w-4 h-4" strokeWidth={2} />
                                                                            </button>
                                                                            <button onClick={(e) => { e.stopPropagation(); setRejectingItem(item); }} className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-full transition-all" title="Reject">
                                                                                <Ban className="w-4 h-4" strokeWidth={2} />
                                                                            </button>
                                                                        </>
                                                                    )}
                                                                    {item.status === 'APPROVED' && (
                                                                        <button onClick={(e) => { e.stopPropagation(); setPayingItem(item); }} className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-full transition-all" title="Mark as Paid">
                                                                            <CreditCard className="w-4 h-4" strokeWidth={2} />
                                                                        </button>
                                                                    )}
                                                                    {["admin", "superadmin", "supervisor"].includes(userRole || "") && (
                                                                        <button onClick={(e) => { e.stopPropagation(); setDeletingItem(item); }} className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-full transition-all" title="Delete Request">
                                                                            <Trash2 className="w-4 h-4" strokeWidth={2} />
                                                                        </button>
                                                                    )}
                                                                </>
                                                            ) : (
                                                                <>
                                                                    {(["DRAFT", "PENDING", "NEED_REVISION", "REJECTED"].includes(item.status) || ["admin", "superadmin", "supervisor"].includes(userRole || "")) && (
                                                                        <>
                                                                            {(["DRAFT", "PENDING", "NEED_REVISION"].includes(item.status) || ["admin", "superadmin", "supervisor"].includes(userRole || "")) && (
                                                                                <button
                                                                                    onClick={(e) => { e.stopPropagation(); setEditingItem(item); setIsDrawerOpen(true); }}
                                                                                    className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-full transition-all"
                                                                                    title="Edit Request"
                                                                                >
                                                                                    <Pencil className="w-4 h-4" strokeWidth={2} />
                                                                                </button>
                                                                            )}
                                                                            <button
                                                                                onClick={(e) => { e.stopPropagation(); setDeletingItem(item); }}
                                                                                className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-full transition-all"
                                                                                title="Delete Request"
                                                                            >
                                                                                <Trash2 className="w-4 h-4" strokeWidth={2} />
                                                                            </button>
                                                                        </>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                        <Pagination
                            currentPage={currentPage}
                            totalItems={totalItems}
                            itemsPerPage={itemsPerPage}
                            onPageChange={setCurrentPage}
                        />
                    </div>
                </>
            )}

            {/* MODALS & DRAWERS (kept as is) */}
            <NewRequestDrawer
                isOpen={isDrawerOpen}
                initialType="REIMBURSE"
                hideSwitcher={true}
                initialData={editingItem || undefined}
                onClose={() => { setIsDrawerOpen(false); setEditingItem(null); clearRequestId(); }}
                onSuccess={() => {
                    setIsDrawerOpen(false);
                    setEditingItem(null);
                    loadData();
                    setShowSuccess({
                        title: "Request Saved",
                        message: "Your changes have been successfully saved and submitted."
                    });
                }}
                onDelete={editingItem ? async () => {
                    try {
                        await deleteReimburseRequest(editingItem.id);
                        loadData();
                        setIsDrawerOpen(false);
                        setEditingItem(null);
                    } catch (error) {
                        console.error("Delete failed:", error);
                        alert("Failed to delete request.");
                    }
                } : undefined}
            />

            {
                approvingItem && (
                    <ApproveModal
                        item={approvingItem}
                        approverName={profile?.username || "Admin"}
                        onClose={() => setApprovingItem(null)}
                        onApprove={async (amount, approver) => {
                            try {
                                const success = await updateReimburseStatus(approvingItem.id, {
                                    status: "APPROVED",
                                    approved_amount: amount,
                                    approved_by_name: approver
                                } as any);
                                if (success) {
                                    // Update drawer in real-time
                                    if (viewingItem && viewingItem.id === approvingItem.id) {
                                        setViewingItem({ ...viewingItem, status: 'APPROVED', approved_amount: amount, approved_by_name: approver });
                                    }
                                    setApprovingItem(null);
                                    loadData();
                                } else {
                                    alert("Failed to approve request.");
                                }
                            } catch (error) {
                                console.error("Error approving request:", error);
                                alert(`Error: ${error}`);
                            }
                        }}
                    />
                )
            }

            {
                rejectingItem && (
                    <RejectModal
                        item={rejectingItem}
                        onClose={() => setRejectingItem(null)}
                        onReject={async (reason) => {
                            await updateReimburseStatus(rejectingItem.id, { status: "REJECTED", rejection_reason: reason });
                            // Update drawer in real-time
                            if (viewingItem && viewingItem.id === rejectingItem.id) {
                                setViewingItem({ ...viewingItem, status: 'REJECTED', rejection_reason: reason });
                            }
                            setRejectingItem(null);
                            loadData();
                        }}
                    />
                )
            }

            {
                revisingItem && (
                    <ReviseModal
                        item={revisingItem}
                        onClose={() => setRevisingItem(null)}
                        onRevise={async (reason) => {
                            await updateReimburseStatus(revisingItem.id, { status: "NEED_REVISION", revision_reason: reason });
                            // Update drawer in real-time
                            if (viewingItem && viewingItem.id === revisingItem.id) {
                                setViewingItem({ ...viewingItem, status: 'NEED_REVISION', revision_reason: reason });
                            }
                            setRevisingItem(null);
                            loadData();
                        }}
                    />
                )
            }

            {
                payingItem && (
                    <PayDrawer
                        item={payingItem}
                        fundingSources={fundingSources}
                        isLoadingSources={isLoadingSources}
                        onClose={() => setPayingItem(null)}
                        onPay={async (sourceId, date, notes, proofFiles) => {
                            let proofUrls: string[] = [];
                            if (proofFiles && proofFiles.length > 0) {
                                for (const file of proofFiles) {
                                    const ext = file.name.split('.').pop();
                                    const path = `reimburse/transfer/${payingItem.id}_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
                                    const url = await uploadFinanceFileExact(file, path);
                                    if (url) proofUrls.push(url);
                                }
                            }
                            await updateReimburseStatus(payingItem.id, {
                                status: "PAID",
                                payment_date: date,
                                notes,
                                payment_proof_url: proofUrls.length > 0 ? proofUrls.join(',') : undefined,
                                source_of_fund_id: sourceId
                            });
                            setPayingItem(null);
                            // Update drawer in real-time
                            if (viewingItem && viewingItem.id === payingItem.id) {
                                setViewingItem({ ...viewingItem, payment_date: date, status: 'PAID' } as any);
                            }
                            loadData();
                        }}
                    />
                )
            }

            {
                viewingItem && (
                    <ViewModal
                        item={viewingItem}
                        onClose={() => { setViewingItem(null); setIsViewingDeleted(false); clearRequestId(); }}
                        onPreview={(tab) => setPreviewingDocument({ item: viewingItem, initialTab: tab })}
                        onEdit={() => {
                            const editPayload: any = { ...viewingItem };
                            // existingInvoices comes directly from API join
                            setEditingItem(editPayload);
                            setIsDrawerOpen(true);
                            setViewingItem(null); // Close ViewModal when opening Edit Drawer
                        }}
                        onApprove={() => setApprovingItem(viewingItem)}
                        onReject={() => setRejectingItem(viewingItem)}
                        onRevise={() => setRevisingItem(viewingItem)}
                        onPay={() => setPayingItem(viewingItem)}
                        onDelete={() => setDeletingItem(viewingItem)}
                        onRefresh={() => loadData()}
                        isTeamView={isTeamView}
                        userRole={userRole || null}
                        isDeleted={isViewingDeleted}
                        setRevertingItem={setRevertingItem}
                        loadData={loadData}
                        setShowSuccess={setShowSuccess}
                    />
                )
            }

            {
                previewingDocument && (
                    <DocumentDrawer
                        item={previewingDocument.item}
                        initialTab={previewingDocument.initialTab}
                        onClose={() => setPreviewingDocument(null)}
                    />
                )
            }

            {/* Delete Confirmation Modal */}
            {/* NEW DRAWER: Document View (nested inside main drawer or anywhere high z-index) */}
            <AnimatePresence>
                {revertingItem && (
                    <RevertConfirmModal
                        item={revertingItem}
                        onClose={() => setRevertingItem(null)}
                        isReverting={isReverting}
                        onConfirm={async () => {
                            setIsReverting(true);
                            try {
                                const success = await updateReimburseStatus(revertingItem.id, { status: "DRAFT" });
                                if (success) {
                                    setRevertingItem(null);
                                    loadData();
                                    if (viewingItem && viewingItem.id === revertingItem.id) {
                                        setViewingItem({ ...viewingItem, status: "DRAFT" });
                                    }
                                    setShowSuccess({
                                        title: "Request Reverted",
                                        message: "The request has been returned to draft status."
                                    });
                                }
                            } finally {
                                setIsReverting(false);
                            }
                        }}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showSuccess && (
                    <SuccessModal
                        title={showSuccess.title}
                        message={showSuccess.message}
                        onClose={() => setShowSuccess(null)}
                    />
                )}
            </AnimatePresence>

            {/* DELETE MODAL */}
            {deletingItem && (
                <DeleteConfirmModal
                    item={deletingItem}
                    onClose={() => setDeletingItem(null)}
                    onConfirm={async () => {
                        setIsDeleting(true);
                        try {
                            await deleteReimburseRequest(deletingItem.id);
                            loadData();
                            // If deleting from inside the drawer, show deleted state
                            if (viewingItem && viewingItem.id === deletingItem.id) {
                                setIsViewingDeleted(true);
                            }
                        } catch (error) {
                            console.error("Failed to delete:", error);
                        } finally {
                            setIsDeleting(false);
                            setDeletingItem(null);
                        }
                    }}
                    isDeleting={isDeleting}
                />
            )}
            {showFilters && (
                <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center">
                    <div
                        className="absolute inset-0 bg-neutral-900/20 dark:bg-black/40 backdrop-blur-sm transition-opacity"
                        onClick={() => setShowFilters(false)}
                    />
                    <motion.div
                        initial={{ y: "100%", opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className={clsx(
                            "relative bg-white/70 dark:bg-neutral-900/70 backdrop-blur-2xl backdrop-saturate-[1.8] shadow-2xl overflow-hidden border border-white/40 dark:border-neutral-800 flex flex-col max-h-[90dvh]",
                            "w-full mx-2 mb-2 rounded-[40px] p-6 gap-6", // Mobile
                            "md:absolute md:right-6 md:top-6 md:bottom-6 md:mb-0 md:mx-0 md:w-[450px] md:rounded-[56px] md:max-h-none" // Desktop Side Drawer
                        )}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-2">
                            <h3 className="text-[20px] font-bold text-neutral-900 dark:text-white tracking-tight">Filters</h3>
                            <div className="flex items-center gap-3">
                                {(selectedProjects.length > 0 || categoryFilters.length > 0 || !showAllMonths) && (
                                    <button
                                        onClick={() => {
                                            setSelectedProjects([]);
                                            setCategoryFilters([]);
                                            setShowAllMonths(true);
                                            setStartDate(startOfMonth(new Date()));
                                            setEndDate(endOfMonth(new Date()));
                                            setSortColumn('date');
                                            setSortDirection('desc');
                                        }}
                                        className="text-[13px] font-bold text-blue-600 hover:text-blue-700 active:scale-95 transition-all outline-none tracking-wider"
                                    >
                                        Reset
                                    </button>
                                )}
                                <button
                                    onClick={() => setShowFilters(false)}
                                    className="w-10 h-10 bg-white dark:bg-neutral-800 border border-black/5 dark:border-white/5 rounded-full flex items-center justify-center active:scale-95 transition-transform shadow-sm"
                                >
                                    <X size={20} className="text-neutral-500" strokeWidth={2} />
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-col gap-6 overflow-y-auto pb-4 pr-1 scrollbar-hide">
                            {/* Sorting Section */}
                            <div className="space-y-4 px-2">
                                <h4 className="text-[11px] font-bold text-neutral-400 tracking-wider">Sort By</h4>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { id: 'date', label: 'Submitted Date' },
                                        { id: 'invoice_date', label: 'Invoice Date' },
                                        { id: 'paid_date', label: 'Paid Date' },
                                        { id: 'project_name', label: 'Project' },
                                        { id: 'amount', label: 'Amount' },
                                        { id: 'status', label: 'Status' }
                                    ].map((col) => (
                                        <button
                                            key={col.id}
                                            onClick={() => setSortColumn(col.id as any)}
                                            className={clsx(
                                                "px-4 py-2.5 rounded-full text-[12px] font-bold transition-all border flex items-center justify-between",
                                                sortColumn === col.id
                                                    ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-900/50"
                                                    : "bg-neutral-50 dark:bg-neutral-800/50 text-neutral-600 dark:text-neutral-400 border-neutral-100 dark:border-neutral-800"
                                            )}
                                        >
                                            {col.label}
                                            {sortColumn === col.id && (
                                                <div
                                                    role="button"
                                                    tabIndex={0}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                                                    }}
                                                    className="p-1.5 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-500 rounded-lg transition-all cursor-pointer outline-none bg-blue-100/50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
                                                >
                                                    {sortDirection === 'asc' ? <ArrowUpNarrowWide className="w-3.5 h-3.5" /> : <ArrowDownWideNarrow className="w-3.5 h-3.5" />}
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Project Filter */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between px-2">
                                    <h4 className="text-[11px] font-bold text-neutral-400 tracking-wider">Project</h4>
                                    {selectedProjects.length > 0 && (
                                        <button onClick={() => setSelectedProjects([])} className="text-[11px] font-bold text-blue-600 tracking-wider">Clear</button>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-2 px-2">
                                    <button
                                        onClick={() => setSelectedProjects([])}
                                        className={clsx(
                                            "px-4 py-2 rounded-full text-[12px] font-bold transition-all border",
                                            selectedProjects.length === 0
                                                ? "bg-blue-600 text-white border-blue-600 shadow-md"
                                                : "bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                                        )}
                                    >
                                        All
                                    </button>
                                    {projects.map((p) => {
                                        const isSelected = selectedProjects.includes(p.id);
                                        return (
                                            <button
                                                key={p.id}
                                                onClick={() => {
                                                    if (isSelected) {
                                                        setSelectedProjects(selectedProjects.filter(id => id !== p.id));
                                                    } else {
                                                        setSelectedProjects([...selectedProjects, p.id]);
                                                    }
                                                }}
                                                className={clsx(
                                                    "px-4 py-2 rounded-full text-[12px] font-bold transition-all border",
                                                    isSelected
                                                        ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/30 shadow-sm"
                                                        : "bg-neutral-50 dark:bg-neutral-800/50 text-neutral-600 dark:text-neutral-400 border-neutral-100 dark:border-neutral-800 hover:bg-neutral-100"
                                                )}
                                            >
                                                {p.projectCode}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Status Filter */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between px-2">
                                    <h4 className="text-[11px] font-bold text-neutral-400 tracking-wider">Status</h4>
                                    {statusFilter !== "ALL" && (
                                        <button onClick={() => setStatusFilter("ALL")} className="text-[11px] font-bold text-blue-600 tracking-wider">Clear</button>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-2 px-2">
                                    {["ALL", "PENDING", "APPROVED", "PAID", "REJECTED"].map((status) => {
                                        const isSelected = statusFilter === status;
                                        return (
                                            <button
                                                key={status}
                                                onClick={() => setStatusFilter(status as any)}
                                                className={clsx(
                                                    "px-4 py-2 rounded-full text-[12px] font-bold transition-all border capitalize",
                                                    isSelected
                                                        ? "bg-blue-600 text-white border-blue-600 shadow-md"
                                                        : "bg-neutral-50 dark:bg-neutral-800/50 text-neutral-600 dark:text-neutral-400 border-neutral-100 dark:border-neutral-800 hover:bg-neutral-100"
                                                )}
                                            >
                                                {status.toLowerCase()}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Category Filter */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between px-2">
                                    <h4 className="text-[11px] font-bold text-neutral-400 tracking-wider">Category</h4>
                                    {categoryFilters.length > 0 && (
                                        <button onClick={() => setCategoryFilters([])} className="text-[11px] font-bold text-blue-600 tracking-wider">Clear</button>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-2 px-2">
                                    <button
                                        onClick={() => setCategoryFilters([])}
                                        className={clsx(
                                            "px-4 py-2 rounded-full text-[12px] font-bold transition-all border",
                                            categoryFilters.length === 0
                                                ? "bg-blue-600 text-white border-blue-600 shadow-md"
                                                : "bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border-neutral-100 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                                        )}
                                    >
                                        All
                                    </button>
                                    {REIMBURSE_CATEGORY_OPTIONS.map((cat) => {
                                        const isSelected = categoryFilters.includes(cat.value);
                                        return (
                                            <button
                                                key={cat.value}
                                                onClick={() => {
                                                    if (isSelected) {
                                                        setCategoryFilters(categoryFilters.filter(id => id !== cat.value));
                                                    } else {
                                                        setCategoryFilters([...categoryFilters, cat.value]);
                                                    }
                                                }}
                                                className={clsx(
                                                    "px-4 py-2 rounded-full text-[12px] font-bold transition-all border",
                                                    isSelected
                                                        ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/30 shadow-sm"
                                                        : "bg-neutral-50 dark:bg-neutral-800/50 text-neutral-600 dark:text-neutral-400 border-neutral-100 dark:border-neutral-800 hover:bg-neutral-100"
                                                )}
                                            >
                                                {cat.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Date Range Filter */}
                            <div className="space-y-4">
                                <h4 className="text-[11px] font-bold text-neutral-400 tracking-wider px-2">Date Range</h4>
                                <div className="flex items-center gap-3 px-2">
                                    <div className="flex-1 space-y-1.5 min-w-0 overflow-hidden">
                                        <label className="text-[11px] font-bold text-neutral-400 pl-3 block">From</label>
                                        <input
                                            type="date"
                                            value={format(startDate, "yyyy-MM-dd")}
                                            onChange={(e) => {
                                                setShowAllMonths(false);
                                                setStartDate(new Date(e.target.value));
                                            }}
                                            className="w-full max-w-full min-w-0 bg-neutral-900/5 dark:bg-neutral-100/5 border-none rounded-full text-[14px] font-bold text-neutral-700 dark:text-neutral-300 outline-none px-4 py-3 appearance-none focus:ring-2 focus:ring-blue-500/20"
                                        />
                                    </div>
                                    <div className="flex-1 space-y-1.5 min-w-0 overflow-hidden">
                                        <label className="text-[11px] font-bold text-neutral-400 pl-3 block">To</label>
                                        <input
                                            type="date"
                                            value={format(endDate, "yyyy-MM-dd")}
                                            onChange={(e) => {
                                                setShowAllMonths(false);
                                                setEndDate(new Date(e.target.value));
                                            }}
                                            className="w-full max-w-full min-w-0 bg-neutral-900/5 dark:bg-neutral-100/5 border-none rounded-full text-[14px] font-bold text-neutral-700 dark:text-neutral-300 outline-none px-4 py-3 appearance-none focus:ring-2 focus:ring-blue-500/20"
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowAllMonths(!showAllMonths)}
                                    className={clsx(
                                        "w-full py-3.5 rounded-2xl text-[12px] font-bold transition-all border",
                                        showAllMonths
                                            ? "bg-blue-400 text-white border-blue-300 shadow-md shadow-blue-400/20"
                                            : "bg-neutral-50 dark:bg-neutral-800/50 text-neutral-600 dark:text-neutral-400 border-neutral-100 dark:border-neutral-800"
                                    )}
                                >
                                    {showAllMonths ? "Custom Range Mode" : "Show All Time"}
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowFilters(false)}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-full font-bold text-[16px] transition-colors shadow-lg shadow-blue-500/20 active:scale-[0.98] mt-auto shrink-0"
                        >
                            Apply Filters
                        </button>
                    </motion.div>
                </div>
            )}
        </FinancePageWrapper>
    );
}
