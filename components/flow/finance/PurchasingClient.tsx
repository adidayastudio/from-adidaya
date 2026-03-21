"use client";

import { useState, useMemo, useEffect, useRef, Fragment } from "react";
import { generateExport, ExportAttachment, ExportMetadata } from "@/lib/export/export-utils";
// dynamic import used for pdfjs instead of top level import
import { createPortal } from "react-dom";
import FinanceHeader from "@/components/flow/finance/FinanceHeader";
import FinancePageWrapper from "@/components/flow/finance/FinancePageWrapper";
import { useFinance } from "@/components/flow/finance/FinanceContext";
import {
    Search,
    Eye,
    CreditCard,
    X,
    Plus, Loader2, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Download, Pencil, Trash2, CheckCircle2, AlertCircle, Ban, Clock, AlertTriangle, ArrowLeft,
    RotateCcw,
    Send,
    XCircle,
    Package,
    Copy,
    Upload,
    Filter,
    ListFilter,
    Check,
    User,
    Users,
    ExternalLink,
    FileText,
    FileSpreadsheet,
    ArrowUpNarrowWide,
    ArrowDownWideNarrow,
    Briefcase,
    Share2,
    Image as ImageIcon,
    DollarSign,
    Undo2
} from "lucide-react";
import { CATEGORY_OPTIONS } from "./modules/constants";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import { format, startOfMonth, endOfMonth, isBefore, addMonths } from "date-fns";
import { PurchasingItem, ApprovalStatus, FundingSource, PurchaseType, PurchaseStage } from "@/lib/types/finance-types";
import { Project } from "@/types/project";
import { formatCurrency, getPrimaryStatus, STATUS_THEMES, formatStatus, cleanEntityName, formatStructuredId, formatItemTitle, formatCardDate } from "./modules/utils";
import * as XLSX from "xlsx";
import { getFinanceFileUrl, uploadFinanceFile, uploadFinanceFileExact } from "@/lib/api/storage";
import { GlobalLoading } from "@/components/shared/GlobalLoading";
import { FinanceSummaryCard, FinanceSummaryCardsRow } from "./FinanceSummaryCard";
import { FinanceItemCard } from "./FinanceItemCard";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { fetchPurchasingRequests, fetchFundingSources, updatePurchasingStatus, deletePurchasingRequest, fetchPurchasingRequestById } from "@/lib/client/finance-api";
import { fetchAllProjects } from "@/lib/api/projects";
import { fetchTeamMembers } from "@/lib/api/clock_team";
import { fetchDefaultWorkspaceId } from "@/lib/api/templates";
import { NewRequestDrawer } from "./modules/NewRequestDrawer";

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

// Revise Modal
function ReviseModal({ item, onClose, onRevise }: { item: PurchasingItem, onClose: () => void, onRevise: (reason: string) => void }) {
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

// Delete Confirmation Modal - Premium Design
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

function SuccessModal({ title, message, onClose }: { title: string, message: string, onClose: () => void }) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 3000);
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

function PayDrawer({ item, onClose, onPay, fundingSources, isLoadingSources }: {
    item: PurchasingItem,
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
                            <span className="text-neutral-500 font-bold">Amount to Pay</span>
                            <div className="flex items-center gap-2">
                                <div className="text-right">
                                    <div className="font-bold text-neutral-900 text-[17px]">{formatCurrency(item.amount)}</div>
                                </div>
                                <div className="w-6 flex justify-center">
                                    <CopyButton text={String(item.amount)} />
                                </div>
                            </div>
                        </div>

                        <div className="px-5">
                            <hr className="border-neutral-200/60 dark:border-neutral-800/50" />
                        </div>

                        <div className="flex justify-between items-center text-xs px-4 py-2">
                            <span className="text-neutral-500 font-bold">Submitter</span>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-neutral-900 text-[13px]">{item.submitted_by_name || "-"}</span>
                                <div className="w-6" />
                            </div>
                        </div>

                        <div className="flex justify-between items-start text-xs px-4 py-2">
                            <span className="text-neutral-500 font-bold mt-1">Beneficiary Account</span>
                            <div className="flex items-start gap-2">
                                {(item.beneficiary_bank || item.beneficiary_number) ? (
                                    <div className="text-right flex flex-col items-end gap-1 mt-0.5">
                                        <div className="text-[12px] font-bold text-neutral-800 bg-white/60 px-2.5 py-1 rounded-full border border-neutral-200/50 flex items-center gap-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                                            <span>{item.beneficiary_bank}</span>
                                            <span className="text-neutral-400 font-normal">|</span>
                                            <span className="font-mono">{item.beneficiary_number}</span>
                                        </div>
                                        <div className="text-[10px] text-neutral-500 font-medium px-1">
                                            {item.beneficiary_name}
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

                    {(!item.invoice_url || !item.beneficiary_bank || !item.beneficiary_number) && (
                        <div className="p-4 rounded-3xl bg-blue-50/80 backdrop-blur-sm border border-blue-100 flex gap-3 animate-in fade-in">
                            <AlertTriangle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="text-[11px] font-bold text-blue-700 mb-1">Missing Requirements</h4>
                                <p className="text-[11px] text-blue-600 font-medium tracking-tight">
                                    Invoice and complete beneficiary details are mandatory before you can process this payment.
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Source of Fund</label>
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
                            <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Payment Date</label>
                            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full max-w-full block min-w-0 h-12 px-4 text-[13px] border border-white/60 dark:border-neutral-800 shadow-sm rounded-full bg-white/60 dark:bg-neutral-900/40 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all font-medium appearance-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Proof of Transfer</label>
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
                                            <span className="text-[9px] font-bold text-blue-500/80">Required</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Notes</label>
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
                            disabled={!source || !date || proofFiles.length === 0 || isSubmitting || !item.invoice_url || !item.beneficiary_bank || !item.beneficiary_number}
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
                </div>

                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-2.5 text-sm font-bold text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-xl transition-all">Cancel</button>
                    <button onClick={() => onApprove(parseFloat(amountStr), approverName)} className="flex-1 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-lg shadow-emerald-200 dark:shadow-none">Approve</button>
                </div>
            </motion.div>
        </div>
    );
}

function RejectModal({
    item,
    onClose,
    onReject
}: {
    item: PurchasingItem;
    onClose: () => void;
    onReject: (reason: string) => void;
}) {
    const [reason, setReason] = useState("");

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm" onClick={onClose} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative w-full max-w-sm bg-white/50 dark:bg-neutral-900/50 backdrop-blur-2xl border border-white/60 dark:border-neutral-800 rounded-3xl p-6 shadow-2xl overflow-hidden">
                <h3 className="text-lg font-bold text-neutral-900 mb-2 flex items-center gap-2">
                    <Ban className="w-5 h-5 text-rose-500" />
                    Reject Request
                </h3>
                <p className="text-sm text-neutral-500 mb-6 font-medium">Please provide a reason for rejection.</p>
                <textarea
                    autoFocus
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Rejection reason..."
                    className="w-full h-32 p-4 text-sm border border-neutral-200 rounded-xl bg-neutral-50 mb-6 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-2.5 text-sm font-bold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-all">Cancel</button>
                    <button onClick={() => { if (reason) onReject(reason); }} disabled={!reason} className="flex-1 py-2.5 text-sm font-bold text-white bg-rose-500 hover:bg-rose-600 rounded-xl transition-all disabled:opacity-50">Confirm Rejection</button>
                </div>
            </motion.div>
        </div>
    );
}

function ViewModal({
    item,
    onClose,
    onPreview,
    onEdit,
    onApprove,
    onReject,
    onRevise,
    onPay,
    onDelete,
    onRefresh,
    isTeamView,
    userRole,
    isDeleted,
    setRevertingItem,
    loadData,
    setShowSuccess
}: {
    item: PurchasingItem;
    onClose: () => void;
    onPreview: (tab: 'invoice' | 'proof') => void;
    onEdit?: () => void;
    onApprove?: () => void;
    onReject?: () => void;
    onRevise?: () => void;
    onPay?: () => void;
    onDelete?: () => void;
    onRefresh?: () => void;
    setRevertingItem?: (item: any) => void;
    isTeamView?: boolean;
    userRole?: string | null;
    isDeleted?: boolean;
    loadData: () => void;
    setShowSuccess: (success: { title: string, message: string } | null) => void;
}) {
    const [invoiceUrls, setInvoiceUrls] = useState<{ url: string; name: string; originalPath: string }[]>([]);
    const [proofUrl, setProofUrl] = useState<string | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [docDrawerType, setDocDrawerType] = useState<'invoice' | 'proof'>('invoice');
    const contentRef = useRef<HTMLDivElement>(null);

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
            const poId = formatStructuredId("PO", item.project?.project_number || item.project_number, item.request_number, item.project?.project_code || item.project_code) || `PO-${item.id.slice(0, 8)}`;
            const projectStr = item.project?.project_code || item.project_code || 'NA';
            const itemsList = item.items || [];
            let itemStr = 'Item';
            if (itemsList.length > 0) {
                if (itemsList.length <= 2) {
                    itemStr = itemsList.map((i: { name: string }) => i.name).join(' and ');
                } else {
                    itemStr = `${itemsList[0].name} and ${itemsList.length - 1} more`;
                }
            }
            const fileName = `${dateStr}_Detail_${poId}_${projectStr}_${itemStr}.${format}`.replace(/[<>:"/\\|?*]+/g, '');

            // --- Prepare Attachments ---
            const attachments: ExportAttachment[] = [];
            // Invoices
            for (const inv of invoiceUrls) {
                attachments.push({
                    url: inv.url,
                    name: inv.name,
                    originalPath: inv.originalPath,
                    label: 'Invoice'
                });
            }
            // Payment proof
            if (proofUrl) {
                attachments.push({
                    url: proofUrl,
                    name: 'Payment Proof',
                    originalPath: item.payment_proof_url || '',
                    label: 'Payment Proof'
                });
            }

            const metadata: ExportMetadata = {
                title: poId,
                subtitle: 'Purchase Order Detail',
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
            // Handle multiple invoices
            const urls: { url: string; name: string; originalPath: string }[] = [];

            if (item.invoices && item.invoices.length > 0) {
                // Use new invoices array
                for (const inv of item.invoices) {
                    const url = await getFinanceFileUrl(inv.invoice_url);
                    if (url) {
                        urls.push({
                            url,
                            name: inv.invoice_name || `Invoice ${urls.length + 1}`,
                            originalPath: inv.invoice_url
                        });
                    }
                }
            } else if (item.invoice_url) {
                // Fallback to legacy single invoice_url
                const url = await getFinanceFileUrl(item.invoice_url);
                if (url) {
                    urls.push({ url, name: 'Invoice', originalPath: item.invoice_url });
                }
            }
            console.log('[ViewModal] Fetched invoice URLs:', urls.length, item.invoices?.length);
            setInvoiceUrls(urls);

            if (item.payment_proof_url) {
                const url = await getFinanceFileUrl(item.payment_proof_url);
                setProofUrl(url);
            }
        };
        fetchUrls();
    }, [item.invoice_url, item.invoices, item.payment_proof_url]);

    useEffect(() => {
        const hasInvoices = item.invoice_url || (item.invoices && item.invoices.length > 0);
        if (!hasInvoices && item.payment_proof_url) setDocDrawerType('proof');
    }, [item.invoice_url, item.invoices, item.payment_proof_url]);

    const displayAmount = item.amount || 0;
    const notes = item.rejection_reason || item.notes || "";
    const category = item.type || "-";
    const status = getPrimaryStatus(item.approval_status, item.purchase_stage, item.financial_status);

    const handleUpdateStage = async (s: PurchaseStage) => {
        await updatePurchasingStatus(item.id, { purchase_stage: s });
        onRefresh?.();
    };

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
                {/* Sticky Header */}
                <div className="flex-none px-8 pt-8 pb-4 sticky top-0 z-20 bg-transparent">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-black text-neutral-900 dark:text-white tracking-tight text-2xl">
                            {formatStructuredId("PO", item.project?.project_number || item.project_number, item.request_number, item.project?.project_code || item.project_code) || `PO-${item.id.slice(0, 8)}`}
                        </h2>
                        <div className="flex items-center gap-2">
                            {/* Export Actions (Compact for mobile) */}
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
                        {(item.approval_status === "NEED_REVISION" || (item.approval_status === "DRAFT" && item.revision_reason)) && item.revision_reason && (
                            <div className="p-4 bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 rounded-2xl flex gap-3 animate-in fade-in slide-in-from-top-4 duration-500">
                                <AlertCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                                <div>
                                    <div className="text-xs font-bold text-orange-800 dark:text-orange-400 mb-1">Revision Requested</div>
                                    <p className="text-sm text-orange-700 dark:text-orange-300 font-medium leading-relaxed">{item.revision_reason}</p>
                                </div>
                            </div>
                        )}

                        {(item.approval_status === "REJECTED" || item.rejection_reason) && item.rejection_reason && (
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

                                        const isApproved = ["APPROVED"].includes(item.approval_status) || item.financial_status === "PAID";
                                        const isPaid = item.financial_status === "PAID";
                                        const isRevision = item.approval_status === "NEED_REVISION";
                                        const isRejected = item.approval_status === "REJECTED";
                                        const deadlineDate = item.target_date ? new Date(item.target_date) : ((item as any).deadline ? new Date((item as any).deadline) : null);
                                        const isOverdue = deadlineDate && !isPaid && deadlineDate < now;

                                        // Determine current step index (0-3)
                                        let currentStep = 0; // Submitted/Draft
                                        if (item.approval_status === "SUBMITTED") currentStep = 0;
                                        if (isRevision) currentStep = 0; // back to step 0
                                        if (isRejected) currentStep = 0;
                                        if (isApproved && !isPaid) currentStep = 1;
                                        if (isPaid) currentStep = 3;
                                        if (item.purchase_stage === "RECEIVED") currentStep = 4;

                                        const steps = [
                                            {
                                                label: isRevision ? "Revision" : "Submitted",
                                                date: item.date ? fmt(new Date(item.date)) : "-",
                                                accentColor: isRevision ? "text-orange-500" : "text-neutral-500 dark:text-neutral-300",
                                                dotColor: isRevision ? "bg-orange-500 border-orange-500" : "bg-neutral-400 border-neutral-400",
                                                lineActive: "bg-neutral-300 dark:bg-neutral-500",
                                            },
                                            {
                                                label: isRejected ? "Rejected" : "Approved",
                                                date: isApproved ? (item.updated_at ? fmt(new Date(item.updated_at)) : "✓") : "-",
                                                accentColor: isRejected ? "text-red-500" : "text-emerald-500",
                                                dotColor: isRejected ? "bg-red-500 border-red-500" : "bg-emerald-500 border-emerald-500",
                                                lineActive: "bg-emerald-300 dark:bg-emerald-500/50",
                                            },
                                            {
                                                label: isOverdue ? "Overdue" : "Deadline",
                                                date: deadlineDate ? fmt(deadlineDate) : "Anytime",
                                                accentColor: isOverdue ? "text-red-500" : "text-orange-500 dark:text-orange-400",
                                                dotColor: isOverdue ? "bg-red-500 border-red-500" : "bg-orange-400 border-orange-400",
                                                lineActive: isOverdue ? "bg-red-300 dark:bg-red-500/50" : "bg-orange-200 dark:bg-orange-500/30",
                                            },
                                            {
                                                label: "Paid",
                                                date: isPaid && item.payment_date ? fmt(new Date(item.payment_date)) : "-",
                                                accentColor: "text-blue-500",
                                                dotColor: "bg-blue-500 border-blue-500",
                                                lineActive: "bg-blue-300 dark:bg-blue-500/50",
                                            },
                                            {
                                                label: "Received",
                                                date: item.purchase_stage === "RECEIVED" ? "✓" : "-",
                                                accentColor: "text-blue-500",
                                                dotColor: "bg-blue-500 border-blue-500",
                                                lineActive: "bg-blue-300 dark:bg-blue-500/50",
                                            },
                                        ];

                                        // Deadline step is special: active only if deadline exists or overdue
                                        const isDeadlineActive = !!deadlineDate && !isPaid;

                                        return (
                                            <div className="relative flex items-start w-full px-2">
                                                {/* Continuous Line Background */}
                                                <div className="absolute top-[7px] left-8 right-8 h-[2px] bg-neutral-100 dark:bg-neutral-800 z-0" />

                                                {steps.map((step, idx) => {
                                                    const isCompleted = idx < currentStep;
                                                    const isCurrent = idx === currentStep;
                                                    const isDeadlineStep = idx === 2;
                                                    const isPaidStep = idx === 3;
                                                    const isReceivedStep = idx === 4;
                                                    const stepActive = isDeadlineStep ? (isDeadlineActive || isCurrent) : (isCompleted || isCurrent);

                                                    return (
                                                        <div key={idx} className="flex-1 flex flex-col items-center relative z-10">
                                                            {/* Icon/Dot */}
                                                            <div className="bg-white dark:bg-neutral-800 rounded-full p-0.5">
                                                                {isCompleted ? (
                                                                    <CheckCircle2 size={12} className="text-neutral-400" />
                                                                ) : isCurrent && isReceivedStep && item.purchase_stage === "RECEIVED" ? (
                                                                    <CheckCircle2 size={12} className="text-blue-500" />
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
                                                                isCurrent || (isDeadlineStep && isDeadlineActive) ? step.accentColor : "text-neutral-400 dark:text-neutral-500"
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
                                            {isExporting ? (
                                                <span className="text-sm font-bold text-neutral-600 dark:text-neutral-300">
                                                    {item.project_code} • {item.project_name}
                                                </span>
                                            ) : (
                                                <div className="flex items-center flex-wrap gap-2">
                                                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/50 shadow-sm">
                                                        <span className="text-xs font-bold text-neutral-900 dark:text-white whitespace-nowrap">
                                                            {item.project_code}
                                                        </span>
                                                    </div>
                                                    <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400">
                                                        {item.project_name}
                                                    </span>
                                                </div>
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
                                            <div className="text-sm font-medium text-neutral-900 dark:text-white">{item.submitted_by_name || item.created_by_name || "-"}</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="text-[11px] font-semibold text-neutral-500 mb-1.5">Category</div>
                                        <div className="text-sm font-medium text-neutral-900 dark:text-white capitalize">{formatStatus(category)}</div>
                                    </div>
                                    <div>
                                        <div className="text-[11px] font-semibold text-neutral-500 mb-1.5">Subcategory</div>
                                        <div className="text-sm font-medium text-neutral-900 dark:text-white capitalize">{item.subcategory ? formatStatus(item.subcategory) : "-"}</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    {item.vendor && (
                                        <div className="flex flex-col col-span-2">
                                            <div className="text-[11px] font-semibold text-neutral-500 mb-1.5">Vendor</div>
                                            <div className="text-sm font-semibold text-neutral-900 dark:text-white leading-tight">{item.vendor}</div>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <div className="text-[11px] font-semibold text-neutral-500 mb-1.5">Description</div>
                                    <div className="text-sm font-medium text-neutral-900 dark:text-white leading-relaxed">
                                        {item.description || (item.items && item.items.length > 0
                                            ? item.items.map((i: any) => i.name).join(', ')
                                            : "No description")}
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* SECTION: Order Progress (compact) */}

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
                                        {item.approved_amount && item.approved_amount !== item.amount && (
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
                            <div>
                                <div className="text-[11px] font-semibold text-neutral-500 mb-1.5">Goods Status</div>
                                {isExporting ? (
                                    <div className="text-sm font-bold text-neutral-900 dark:text-white">
                                        {formatStatus(item.purchase_stage || "PLANNED")}
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1 bg-white/40 dark:bg-neutral-800/40 p-1 rounded-full border border-black/5 dark:border-white/5 shadow-inner backdrop-blur-sm w-fit">
                                        {(["PLANNED", "INVOICED", "RECEIVED"] as PurchaseStage[]).map((s, idx) => {
                                            const stages: PurchaseStage[] = ["PLANNED", "INVOICED", "RECEIVED"];
                                            const currentIdx = stages.indexOf(item.purchase_stage || "PLANNED");
                                            const isActive = item.purchase_stage === s;
                                            const isPast = idx < currentIdx;
                                            const labels: Record<string, string> = { PLANNED: "Planned", INVOICED: "Invoiced", RECEIVED: "Received" };

                                            const handleStageChange = async () => {
                                                if (isActive) return;
                                                await handleUpdateStage(s);
                                            };

                                            return (
                                                <button
                                                    key={s}
                                                    onClick={handleStageChange}
                                                    className={clsx(
                                                        "px-3 py-1 flex items-center justify-center rounded-full text-[10px] font-bold transition-all active:scale-95",
                                                        isActive ? "bg-red-500 text-white shadow-md shadow-red-500/20" :
                                                            isPast ? "text-emerald-600 dark:text-emerald-400" :
                                                                "text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                                                    )}
                                                    title={`Change stage to ${s.toLowerCase()}`}
                                                >
                                                    {isPast && <Check size={12} strokeWidth={3} className="mr-1" />}
                                                    {labels[s]}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* SECTION: Beneficiary (moved up) */}
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
                                            {!isExporting && item.beneficiary_number && <CopyButton text={item.beneficiary_number} className="text-blue-500 hover:text-blue-600" />}
                                        </div>
                                        <div className="text-xs font-bold text-neutral-500 dark:text-neutral-400 tracking-tight">{item.beneficiary_name || "-"}</div>
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* Missing Info Warning */}
                        {item.approval_status === "APPROVED" && ((!item.invoice_url && (!item.invoices || item.invoices.length === 0)) || !item.beneficiary_bank || !item.beneficiary_number) && (
                            <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl flex gap-3 animate-in fade-in slide-in-from-top-1">
                                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="text-[11px] font-bold text-red-700 dark:text-red-400 mb-1">Action Required Before Payment</h4>
                                    <p className="text-xs text-red-600 dark:text-red-300 font-medium">Please upload the invoice and complete the beneficiary details by editing this request.</p>
                                </div>
                            </div>
                        )}

                        {/* SECTION: Item Details (table style) */}
                        {item.items && item.items.length > 0 && (
                            <section className="space-y-4 pt-2">
                                <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                                    <Package className="w-4 h-4" strokeWidth={2} /> Item Details
                                </h3>
                                <div className="rounded-3xl bg-white/60 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-700/40 shadow-sm backdrop-blur-[2px] overflow-x-auto scrollbar-hide">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="border-b border-neutral-100 dark:border-neutral-700/40">
                                                <th className="py-2.5 px-4 text-left text-[10px] font-bold text-neutral-400">Item</th>
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
                                                        {it.qty} <span className="text-[9px]">{it.unit}</span>
                                                    </td>
                                                    <td className="py-2.5 px-2 text-right text-neutral-500 dark:text-neutral-400 tabular-nums">{formatCurrency(it.unit_price)}</td>
                                                    <td className="py-2.5 px-4 text-right font-bold text-neutral-900 dark:text-white tabular-nums">{formatCurrency(it.total)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Total Summary */}
                                {/* Total Summary */}
                                {!(item.approved_amount && item.approved_amount !== item.amount) && (
                                    isExporting ? (
                                        <div className="py-2 flex items-center justify-between border-t border-b border-neutral-100 dark:border-neutral-800 mt-2">
                                            <div className="flex flex-col">
                                                <span className="text-[11px] font-bold text-neutral-600 dark:text-neutral-400 tracking-tight leading-none mb-1">Total Amount</span>
                                                <span className="text-xs text-neutral-400 dark:text-neutral-500 font-medium">{item.items?.length || 0} items</span>
                                            </div>
                                            <span className="text-xl font-black text-neutral-900 dark:text-white tracking-tight">{formatCurrency(item.amount)}</span>
                                        </div>
                                    ) : (
                                        <div className="p-4 rounded-2xl bg-white/60 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-700/40 shadow-sm backdrop-blur-[2px] relative overflow-hidden group">
                                            <div className="relative flex items-center justify-between">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider leading-none mb-1">Total Amount</span>
                                                    <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">{item.items?.length || 0} items</span>
                                                </div>
                                                <span className="text-xl font-bold text-red-600 dark:text-red-400 tracking-tight">{formatCurrency(item.amount)}</span>
                                            </div>
                                        </div>
                                    )
                                )}
                            </section>
                        )}

                        {/* SECTION: Documents (Nested Drawer Trigger) */}
                        <section className="space-y-4 pt-2">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                                    <Upload className="w-4 h-4" strokeWidth={2} /> Documents
                                </h3>
                            </div>

                            {!isExporting && (
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => onPreview('invoice')}
                                        className={clsx(
                                            "p-4 rounded-3xl border transition-all flex flex-col gap-2 text-left relative overflow-hidden group",
                                            (item.invoice_url || (item.invoices && item.invoices.length > 0))
                                                ? "bg-white/60 dark:bg-neutral-800/60 border-neutral-100 dark:border-neutral-700/40 hover:border-red-200 dark:hover:border-red-500/30"
                                                : "bg-neutral-50/50 dark:bg-neutral-900/30 border-dashed border-neutral-200 dark:border-neutral-800 opacity-60"
                                        )}
                                    >
                                        <div className="flex items-center justify-between relative z-10">
                                            <span className="text-[10px] font-bold text-neutral-400">Invoice</span>
                                            <FileText size={14} className={clsx((item.invoice_url || (item.invoices && item.invoices.length > 0)) ? "text-red-500" : "text-neutral-300")} />
                                        </div>
                                        <div className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 relative z-10">
                                            {item.invoices && item.invoices.length > 0 ? `${item.invoices.length} ${item.invoices.length === 1 ? 'File' : 'Files'}` : item.invoice_url ? "1 File" : "No Invoice"}
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
                                            {item.payment_proof_url ? "1 File" : "No Proof"}
                                        </div>
                                        <div className="absolute -bottom-2 -right-2 opacity-[0.03] group-hover:scale-110 transition-transform duration-500">
                                            <CheckCircle2 size={48} />
                                        </div>
                                    </button>
                                </div>
                            )}
                        </section>

                        {/* SECTION: Notes */}
                        <section className="space-y-4 pt-2">
                            <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                                <FileText className="w-4 h-4" strokeWidth={2} /> Additional Notes
                            </h3>
                            <div className="text-sm text-neutral-700 dark:text-neutral-300 bg-white/60 dark:bg-neutral-800/60 p-5 rounded-3xl border border-neutral-100 dark:border-neutral-700/40 font-medium leading-relaxed">
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
                {isDeleted ? (
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
                    const currentApprovalStatus = item.approval_status;
                    const statusVal = currentApprovalStatus || "SUBMITTED";

                    const isDraftOrRevise = statusVal === "DRAFT" || statusVal === "NEED_REVISION";
                    const isSubmitted = statusVal === "SUBMITTED";
                    const isApprovedNotPaid = statusVal === "APPROVED" && item.financial_status !== "PAID";
                    const isAdmin = ["admin", "superadmin", "supervisor"].includes(userRole || "");
                    const isPaid = item.financial_status === "PAID";

                    const canApprove = isSubmitted && isTeamView;
                    const canPay = isApprovedNotPaid && isTeamView;
                    const canEdit = (isDraftOrRevise || (isSubmitted && isAdmin)) && !isTeamView;
                    const canDelete = isTeamView ? isAdmin : true;

                    const showOwnerWaiting = !isTeamView && statusVal === "SUBMITTED";
                    const hasActions = canApprove || (canPay && !isPaid) || canEdit || canDelete || showOwnerWaiting || isPaid;

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
                                        <button onClick={onEdit} className="h-[52px] px-6 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0" title="Edit">
                                            <Pencil size={20} /> Edit
                                        </button>
                                        <button
                                            onClick={onPay}
                                            disabled={!item.invoice_url || !item.beneficiary_bank || !item.beneficiary_number}
                                            className="flex-1 h-14 text-base font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-full transition-all shadow-lg shadow-blue-200/50 flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                            <CreditCard size={20} /> Pay Now
                                        </button>
                                    </div>
                                )}

                                {statusVal === "DRAFT" && !isTeamView && (
                                    <div className="flex items-center gap-2">
                                        <button onClick={onDelete} className="w-[52px] h-[52px] flex items-center justify-center rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-500 border border-rose-100 dark:border-rose-500/20 active:scale-95 transition-all shrink-0" title="Delete">
                                            <Trash2 size={20} />
                                        </button>
                                        <button
                                            onClick={onEdit}
                                            className="flex-1 h-[52px] bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-full font-bold text-sm border border-neutral-200 dark:border-neutral-700 flex items-center justify-center gap-2 active:scale-95 transition-all shrink-0"
                                        >
                                            <Pencil size={18} /> Edit
                                        </button>
                                        <button
                                            onClick={() => {
                                                updatePurchasingStatus(item.id, { approval_status: 'SUBMITTED' }).then(() => {
                                                    onClose();
                                                    loadData();
                                                    setShowSuccess({
                                                        title: "Request Submitted",
                                                        message: "Your request has been successfully submitted."
                                                    });
                                                });
                                            }}
                                            className="flex-[1.5] h-[52px] bg-red-600 text-white rounded-full font-bold text-sm shadow-xl shadow-red-200/50 flex items-center justify-center gap-2 active:scale-95 transition-all"
                                        >
                                            <Send size={18} /> Submit
                                        </button>
                                    </div>
                                )}
                                {(statusVal === "SUBMITTED" || statusVal === "NEED_REVISION") && !isTeamView && (
                                    <div className="flex items-center gap-2">
                                        {canDelete && (
                                            <button onClick={onDelete} className="w-[52px] h-[52px] flex items-center justify-center rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-500 border border-rose-100 dark:border-rose-500/20 active:scale-95 transition-all shrink-0" title="Delete Request">
                                                <Trash2 size={20} />
                                            </button>
                                        )}
                                        {statusVal === "SUBMITTED" && (
                                            <div className="flex items-center gap-2 flex-1">
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
                                            </div>
                                        )}
                                        {canEdit && (
                                            <button onClick={onEdit} className="h-[52px] px-6 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-bold text-sm active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0">
                                                <Pencil size={18} /> Edit
                                            </button>
                                        )}
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
                })()}

            </motion.div>
        </div>
    );
}

function DocumentDrawer({
    item,
    initialTab,
    onClose
}: {
    item: PurchasingItem;
    initialTab: 'invoice' | 'proof';
    onClose: () => void;
}) {
    const [activeTab, setActiveTab] = useState<'invoice' | 'proof'>(initialTab);
    const [invoiceUrls, setInvoiceUrls] = useState<{ url: string; name: string; originalPath: string }[]>([]);
    const [proofUrl, setProofUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDownloading, setIsDownloading] = useState<string | null>(null); // path or 'bulk'

    useEffect(() => {
        const fetchUrls = async () => {
            setIsLoading(true);
            const urls: { url: string; name: string; originalPath: string }[] = [];

            // Invoices
            if (item.invoices && item.invoices.length > 0) {
                for (const inv of item.invoices) {
                    const url = await getFinanceFileUrl(inv.invoice_url);
                    if (url) urls.push({ url, name: inv.invoice_name || 'Invoice', originalPath: inv.invoice_url });
                }
            } else if (item.invoice_url) {
                const url = await getFinanceFileUrl(item.invoice_url);
                if (url) urls.push({ url, name: 'Invoice', originalPath: item.invoice_url });
            }
            setInvoiceUrls(urls);

            // Proof
            if (item.payment_proof_url) {
                const url = await getFinanceFileUrl(item.payment_proof_url);
                setProofUrl(url);
            }
            setIsLoading(false);
        };
        fetchUrls();
    }, [item]);

    const handleDownload = async (url: string, path: string, name?: string, index?: number, total?: number) => {
        const isBulk = typeof index === 'number';
        try {
            if (!isBulk) setIsDownloading(path);
            const ext = path.split('.').pop() || 'pdf';

            // Generate Filename
            const typeStr = activeTab === 'invoice' ? 'Invoice' : 'Transfer';

            // Generate Date string
            const dateSource = activeTab === 'invoice'
                ? (item.date || item.created_at)
                : (item.payment_date || item.updated_at);
            const dateObj = dateSource ? new Date(dateSource) : new Date();
            const yyyy = dateObj.getFullYear();
            const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
            const dd = String(dateObj.getDate()).padStart(2, '0');
            const dateStr = `${yyyy}${mm}${dd}`;

            // Generate PO string
            const poStr = formatStructuredId("PO", item.project?.project_number || item.project_number, item.request_number, item.project?.project_code || item.project_code) || `PO-${item.id.slice(0, 8)}`;

            // Generate Project string
            const projectStr = item.project?.project_code || item.project_code || 'NA';

            // Generate Item string
            const itemsList = item.items || [];
            let itemStr = 'Item';
            if (itemsList.length > 0) {
                if (itemsList.length <= 2) {
                    itemStr = itemsList.map(i => i.name).join(' and ');
                } else {
                    itemStr = `${itemsList[0].name} and ${itemsList.length - 1} more`;
                }
            }

            // Combine
            let suffix = '';
            if (typeof index === 'number' && typeof total === 'number' && total > 1) {
                suffix = `_${index + 1}`;
            }
            const filename = `${dateStr}_${typeStr}_${poStr}_${projectStr}_${itemStr}${suffix}.${ext}`.replace(/[<>:"/\\|?*]+/g, '');

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
        const docs = activeTab === 'invoice' ? invoiceUrls : (proofUrl ? [{ url: proofUrl, originalPath: item.payment_proof_url!, name: 'Proof' }] : []);
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

    const currentDocs = activeTab === 'invoice' ? invoiceUrls : (proofUrl ? [{ url: proofUrl, originalPath: item.payment_proof_url!, name: 'Proof' }] : []);

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
                                Invoice
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
                                    {doc.originalPath.match(/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i) ? (
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
                                                    src={`${doc.url}#toolbar=0`}
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
                            Download All {activeTab === 'invoice' ? 'Invoices' : 'Proofs'}
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

export default function PurchasingClient() {
    const {
        viewMode,
        setViewMode,
        canAccessTeam,
        userRole,
        profile,
        isLoading: isAuthLoading,
        isInitialized,
        searchTerm,
        debouncedSearchTerm,
        setSearchTerm
    } = useFinance();
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [items, setItems] = useState<PurchasingItem[]>([]);

    const { contextInstanceId } = useFinance();

    // useEffect(() => {
    //     console.log(`[PurchasingClient] Mounted with Context:${contextInstanceId}`);
    // }, [contextInstanceId]);

    const [isLoadingData, setIsLoadingData] = useState(true);
    const [projects, setProjects] = useState<Project[]>([]);

    // Funding Sources State
    const [fundingSources, setFundingSources] = useState<FundingSource[]>([]);
    const [isLoadingSources, setIsLoadingSources] = useState(false);

    const initialStatus = searchParams.get("status") as ApprovalStatus | "ALL" | null;
    const [statusFilter, setStatusFilter] = useState<ApprovalStatus | "ALL">("ALL"); // Simplified initial state handling

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const itemsPerPage = 50;

    // Filters
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
    const [categoryFilters, setCategoryFilters] = useState<string[]>([]);
    const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
    const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()));
    const [showAllMonths, setShowAllMonths] = useState(false);

    // Sorting
    const [sortColumn, setSortColumn] = useState<'date' | 'invoice_date' | 'paid_date' | 'project_name' | 'amount' | 'status' | 'description' | 'type' | 'submitted_by_name' | null>('date');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [isExporting, setIsExporting] = useState(false);
    const [globalStats, setGlobalStats] = useState<any>(null);

    const handleMonthChange = (direction: "prev" | "next") => {
        const nextMonth = addMonths(currentMonth, direction === "prev" ? -1 : 1);
        setCurrentMonth(nextMonth);
        setStartDate(startOfMonth(nextMonth));
        setEndDate(endOfMonth(nextMonth));
        setShowAllMonths(false);
    };

    const isTeamView = viewMode === "team";

    const lastHandledRequestId = useRef<string | null>(null);



    // Confirmation Modal State
    const [confirmModal, setConfirmModal] = useState<{
        open: boolean;
        title: string;
        message: string;
        action: 'cancel' | 'approve' | 'reject' | 'delete' | 'submit' | null;
        item: PurchasingItem | null;
    }>({ open: false, title: '', message: '', action: null, item: null });

    const [editingItem, setEditingItem] = useState<PurchasingItem | null>(null);
    const [previewingDocument, setPreviewingDocument] = useState<{ item: PurchasingItem; initialTab: 'invoice' | 'proof' } | null>(null);

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);

    useEffect(() => {
        const handleExportRequest = () => setShowExportMenu(true);
        window.addEventListener('export-finance', handleExportRequest);
        return () => window.removeEventListener('export-finance', handleExportRequest);
    }, []);

    // Fetch Data
    const loadData = async (isInitial = false) => {
        // Show loading screen only on initial load to avoid disrupting the UI
        if (isInitial) setIsLoadingData(true);
        setIsRefreshing(true);
        try {
            const offset = (currentPage - 1) * itemsPerPage;
            const [{ data: rawItems, total, stats }, profiles] = await Promise.all([
                fetchPurchasingRequests({
                    limit: itemsPerPage,
                    offset: offset,
                    approval_status: statusFilter,
                    project_id: selectedProjects.length > 0 ? selectedProjects : undefined,
                    start_date: showAllMonths ? undefined : format(startDate, "yyyy-MM-dd"),
                    end_date: showAllMonths ? undefined : format(endDate, "yyyy-MM-dd"),
                    type: categoryFilters.length > 0 ? categoryFilters : undefined,
                    my_requests: !isTeamView,
                    q: debouncedSearchTerm ? debouncedSearchTerm : undefined
                }),
                fetchTeamMembers()
            ]);

            setTotalItems(total || 0);
            setGlobalStats(stats);
            const profileMap = new Map((profiles || []).map(p => [p.id, p]));
            const flattened: PurchasingItem[] = (rawItems || []).map((req: any) => {
                const creatorName = profileMap.get(req.created_by)?.username || "Unknown";
                const creatorRole = profileMap.get(req.created_by)?.role || "Unknown Role";

                return {
                    ...req,
                    project_code: req.project?.project_code || req.project_code || "N/A",
                    project_name: req.project?.project_name || req.project_name || "Unknown",
                    project_number: req.project?.project_number || req.project_number,
                    request_number: req.request_number,
                    priority: req.priority,
                    target_date: req.target_date,
                    vendor: req.vendor || "",
                    description: req.description || (req.items?.[0]?.name || "No description"),
                    quantity: req.items?.[0]?.qty || 1,
                    unit: req.items?.[0]?.unit || "pcs",
                    type: req.type,
                    subcategory: req.subcategory || "",
                    amount: req.amount || 0,
                    approval_status: req.approval_status,
                    purchase_stage: req.purchase_stage,
                    financial_status: req.financial_status,
                    invoice_url: req.invoice_url,
                    payment_proof_url: req.payment_proof_url,
                    payment_date: req.payment_date,
                    rejection_reason: req.rejection_reason,
                    revision_reason: req.revision_reason,
                    notes: req.notes,
                    created_by: req.created_by,
                    created_by_name: creatorName,
                    created_by_role: creatorRole,
                    submitted_by_name: creatorName,
                    created_at: req.created_at,
                    updated_at: req.updated_at,
                    beneficiary_bank: req.beneficiary_bank,
                    beneficiary_number: req.beneficiary_number,
                    beneficiary_name: req.beneficiary_name,
                    items: req.items?.map((it: any) => ({
                        id: it.id,
                        name: it.name,
                        qty: it.qty,
                        unit: it.unit,
                        unit_price: it.unitPrice || it.unit_price,
                        total: it.total
                    })) || [],
                    invoices: req.invoices?.map((inv: any) => ({
                        id: inv.id,
                        invoice_url: inv.invoice_url,
                        invoice_name: inv.invoice_name,
                        invoice_type: inv.invoice_type,
                        notes: inv.notes,
                        created_at: inv.created_at
                    })) || []
                };
            });
            if (isInitial || currentPage === 1) {
                setItems(flattened);
            } else {
                setItems(prev => {
                    const existingIds = new Set(prev.map(i => i.id));
                    const uniqueNew = flattened.filter(i => !existingIds.has(i.id));
                    return [...prev, ...uniqueNew];
                });
            }
        } catch (e) {
            console.error("Failed to load purchasing requests:", e);
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
                const data = await fetchFundingSources(wsId);
                setFundingSources(data);
            }
        } catch (error) {
            console.error("Failed to load funding sources:", error);
        } finally {
            setIsLoadingSources(false);
        }
    };

    useEffect(() => {
        fetchAllProjects().then(setProjects);
    }, []);

    useEffect(() => {
        if (isInitialized) {
            loadData(items.length === 0); // Only show GlobalLoading if we have no items
        }
    }, [currentPage, statusFilter, selectedProjects, categoryFilters, startDate, endDate, showAllMonths, isTeamView, isInitialized, debouncedSearchTerm]);

    // Reset page when filters OR search change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, selectedProjects, categoryFilters, startDate, endDate, showAllMonths, currentMonth]);

    useEffect(() => {
        const handleFabAction = (e: any) => {
            if (e.detail?.id === 'FINANCE_NEW_PURCHASE') {
                setEditingItem(null);
                setIsDrawerOpen(true);
            }
        };
        window.addEventListener('fab-action', handleFabAction);
        return () => window.removeEventListener('fab-action', handleFabAction);
    }, []);

    // Load funding sources when paying items or on mount (lazy load implies better perf but simpler to just load)
    useEffect(() => {
        if (viewMode === 'team') {
            // Only team (finance) usually pays, so load for them
            loadFundingSources();
        }
    }, [viewMode]);



    const handleExport = async () => {
        if (filteredItems.length === 0) return;
        setIsExporting(true);

        try {
            // 1. Prepare Meta
            const projectCount = selectedProjects.length;
            const project = projectCount === 1 ? projects.find(p => p.id === selectedProjects[0]) : null;
            const projectCode = project ? (project.projectCode || "PRG") : (projectCount === 0 ? "ALL" : "MULTIPLE");
            const projectName = project ? project.projectName : (projectCount === 0 ? "All Projects" : `${projectCount} Selected Projects`);
            const documentName = isTeamView ? "Team Purchasing Report" : "My Purchasing Report";
            const generatedAt = new Date().toLocaleString("id-ID");

            const startStr = format(startDate, "dd MMM");
            const endStr = format(endDate, "dd MMM yyyy");
            const periodText = `Report (${startStr} – ${endStr})`;

            // 2. Prepare Summary
            const totalAmount = filteredItems.reduce((acc, i) => acc + (i.amount || 0), 0);
            const paidAmount = filteredItems.filter(i => i.financial_status === 'PAID').reduce((acc, i) => acc + (i.amount || 0), 0);
            const unpaidAmount = filteredItems.filter(i => i.financial_status !== 'PAID').reduce((acc, i) => acc + (i.amount || 0), 0);

            const summaryCards = [
                { label: "Total Request", value: totalAmount, format: "currency" as const, color: "blue" as const },
                { label: "Paid", value: paidAmount, format: "currency" as const, color: "green" as const },
                { label: "Outstanding", value: unpaidAmount, format: "currency" as const, color: "red" as const },
                { label: "Total Items", value: filteredItems.length, format: "text" as const }
            ];

            const columns = [
                { id: "date", label: "Date", align: "left" as const, width: "100px" },
                { id: "project", label: "Project", align: "left" as const },
                { id: "description", label: "Description", align: "left" as const, width: "250px" },
                { id: "amount", label: "Amount", align: "right" as const, format: "currency" as const },
                { id: "status", label: "Status", align: "center" as const, width: "100px" },
            ];

            const rows = filteredItems.map(item => ({
                date: format(new Date(item.date || item.created_at), "dd MMM yyyy"),
                project: `[${item.project_code || "GEN"}] ${cleanEntityName(item.project_name || "General")}`,
                description: item.description,
                amount: item.amount,
                status: formatStatus(getPrimaryStatus(item.approval_status, item.purchase_stage, item.financial_status)),
            }));

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

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            const dateSuffix = format(new Date(), "yyyyMMdd");
            a.download = `Purchasing_${projectCode}_${dateSuffix}.pdf`;
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
            const filename = `Purchasing_${projectCode}_${dateSuffix}.xlsx`;

            // Format data for Excel
            const data = filteredItems.map(item => ({
                "Date": format(new Date(item.date), "dd MMM yyyy"),
                "Project Code": item.project?.project_code || "N/A",
                "Project Name": item.project?.project_name || "Unknown",
                "Description": item.description || "",
                "Vendor": item.vendor || "",
                "Amount": item.amount,
                "Status": item.approval_status
            }));

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(data);

            // Auto size columns roughly
            const wscols = Object.keys(data[0] || {}).map(key => ({ wch: Math.max(15, key.length + 5) }));
            ws['!cols'] = wscols;

            XLSX.utils.book_append_sheet(wb, ws, "Purchasing Data");

            // Write file and trigger download
            XLSX.writeFile(wb, filename);

        } catch (error) {
            console.error("Excel Export Error:", error);
            alert("Failed to export Excel.");
        } finally {
            setIsExporting(false);
        }
    };

    const [approvingItem, setApprovingItem] = useState<PurchasingItem | null>(null);
    const [payingItem, setPayingItem] = useState<PurchasingItem | null>(null);
    const [rejectingItem, setRejectingItem] = useState<PurchasingItem | null>(null);
    const [revisingItem, setRevisingItem] = useState<PurchasingItem | null>(null);
    const [viewingItem, setViewingItem] = useState<PurchasingItem | null>(null);
    const [deletingItem, setDeletingItem] = useState<PurchasingItem | null>(null);
    const [revertingItem, setRevertingItem] = useState<PurchasingItem | null>(null);
    const [isReverting, setIsReverting] = useState(false);
    const [showSuccess, setShowSuccess] = useState<{ title: string, message: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isViewingDeleted, setIsViewingDeleted] = useState(false);

    // FAB Action Listener
    useEffect(() => {
        const handleFabAction = (e: any) => {
            if (e.detail?.id === 'FINANCE_NEW_PURCHASE') {
                setIsDrawerOpen(true);
            } else if (e.detail?.id === 'FINANCE_EXPORT') {
                handleExport();
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
    }, [handleExport]);

    // Handle requestId from notification (or Overview)
    useEffect(() => {
        const requestId = searchParams.get('requestId');

        // Reset handled ID only when it's gone from URL
        if (!requestId) {
            lastHandledRequestId.current = null;
            return;
        }

        if (requestId && !viewingItem && !editingItem && requestId !== lastHandledRequestId.current) {
            const openDrawer = (item: PurchasingItem) => {
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
                // If not in current list (maybe because of month filter), fetch explicitly
                fetchPurchasingRequestById(requestId).then(async (req) => {
                    if (req) {
                        // Format it like we do in loadData
                        const profiles = await fetchTeamMembers();
                        const profileMap = new Map((profiles || []).map(p => [p.id, p]));
                        const creatorName = profileMap.get(req.created_by)?.username || "Unknown";
                        const creatorRole = profileMap.get(req.created_by)?.role || "Unknown Role";

                        const formatted: PurchasingItem = {
                            ...req,
                            id: req.id,
                            request_id: req.id,
                            project_code: req.project?.project_code || req.project_code || "N/A",
                            project_name: req.project?.project_name || req.project_name || "Unknown",
                            project_number: req.project?.project_number || req.project_number,
                            request_number: req.request_number,
                            priority: req.priority,
                            target_date: req.target_date,
                            created_by_name: creatorName,
                            created_by_role: creatorRole,
                            submitted_by_name: creatorName,
                            items: req.items?.map((it: any) => ({
                                id: it.id,
                                name: it.name,
                                qty: it.qty,
                                unit: it.unit,
                                unit_price: it.unitPrice || it.unit_price,
                                total: it.total
                            })) || [],
                            invoices: req.invoices?.map((inv: any) => ({
                                id: inv.id,
                                invoice_url: inv.invoice_url,
                                invoice_name: inv.invoice_name,
                                invoice_type: inv.invoice_type,
                                notes: inv.notes,
                                created_at: inv.created_at
                            })) || []
                        };
                        openDrawer(formatted);
                    }
                });
            }
        }
    }, [searchParams, items, isTeamView, viewingItem, editingItem]);

    const clearRequestId = () => {
        // lastHandledRequestId.current = null; // Removing this to prevent race condition loop
        const params = new URLSearchParams(window.location.search);
        if (params.has('requestId')) {
            params.delete('requestId');
            router.replace(`${pathname}?${params.toString()}`, { scroll: false });
        }
    };

    // Custom status order for sorting (similar to ReimburseClient)
    const STATUS_ORDER = ['DRAFT', 'SUBMITTED', 'NEED_REVISION', 'APPROVED', 'PAID', 'REJECTED', 'CANCELLED'];

    const handleSort = (key: any) => {
        if (sortColumn === key) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(key);
            setSortDirection('asc');
        }
    };

    // Confirmation Dialog Helpers
    const openConfirmDialog = (
        action: 'cancel' | 'approve' | 'reject' | 'delete' | 'submit',
        item: PurchasingItem
    ) => {
        const messages = {
            cancel: { title: 'Cancel Request', message: 'Are you sure you want to cancel this purchase request? This action cannot be undone.' },
            submit: { title: 'Submit Request', message: 'Are you sure you want to submit this purchase request for approval?' },
            approve: { title: 'Approve Request', message: 'Are you sure you want to approve this purchase request?' },
            reject: { title: 'Reject Request', message: 'Are you sure you want to reject this purchase request?' },
            delete: { title: 'Delete Request', message: 'Are you sure you want to permanently delete this purchase request? This action cannot be undone.' }
        };
        setConfirmModal({
            open: true,
            title: messages[action].title,
            message: messages[action].message,
            action,
            item
        });
    };

    const handleConfirmAction = async () => {
        if (!confirmModal.item || !confirmModal.action) return;

        const item = confirmModal.item;
        const action = confirmModal.action;

        try {
            let newStatus: ApprovalStatus | undefined;
            if (action === 'cancel') newStatus = 'CANCELLED';
            else if (action === 'submit') newStatus = 'SUBMITTED';
            else if (action === 'approve') {
                setConfirmModal({ open: false, title: '', message: '', action: null, item: null });
                setApprovingItem(item);
                return;
            }
            else if (action === 'reject') {
                // For reject, use the reject modal instead
                setConfirmModal({ open: false, title: '', message: '', action: null, item: null });
                setRejectingItem(item);
                return;
            } else if (action === 'delete') {
                const requestId = item.request_id || item.id;
                await deletePurchasingRequest(requestId);
                await loadData(); // Refresh
                setConfirmModal({ open: false, title: '', message: '', action: null, item: null });
                return;
            }

            if (newStatus && item.request_id) {
                await updatePurchasingStatus(item.request_id, { approval_status: newStatus });
                await loadData(); // Refresh
            }
        } catch (error) {
            console.error('Action failed:', error);
            alert('Failed to update request. Please try again.');
        } finally {
            setConfirmModal({ open: false, title: '', message: '', action: null, item: null });
        }
    };

    // 1. Base Items: Now just current page items (already filtered by backend)
    const baseItems = useMemo(() => {
        return items;
    }, [items]);

    // 2. Summary Stats derived from API globalStats or Base Items
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

    const filteredItems = (() => {
        let current = [...items];

        if (searchTerm) {
            const q = searchTerm.replace(/["'“”‘’«»„俘〞‟゛゜]+/g, '').trim().toLowerCase();
            
            if (q.length > 0) {
                current = current.filter(item => {
                    const desc = (item.description || "").toLowerCase();
                    const vendor = (item.vendor || "").toLowerCase();
                    const projectName = (item.project_name || item.project?.project_name || "").toLowerCase();
                    const projectCode = (item.project_code || item.project?.project_code || "").toLowerCase();
                    const submitter = (item.submitted_by_name || item.created_by_name || "").toLowerCase();
                    const notes = (item.notes || "").toLowerCase();
                    const subcategory = (item.subcategory || "").toLowerCase();
                    const beneficiary = (item.beneficiary_name || "").toLowerCase();
                    const reqNum = String(item.request_number || "");
                    const itemNames = (item.items || []).map((it: any) => (it.name || "").toLowerCase()).join(" ");

                    return (
                        desc.includes(q) ||
                        itemNames.includes(q) ||
                        projectCode.includes(q) ||
                        reqNum.includes(q) ||
                        submitter.includes(q)
                    );
                });
            }
        }

        // 3. Sorting
        if (sortColumn) {
            current.sort((a, b) => {
                let comparison = 0;
                if ((sortColumn as any) === 'approval_status' || sortColumn === 'status') {
                    const DISPLAY_STATUS_ORDER = ['DRAFT', 'SUBMITTED', 'NEED_REVISION', 'UNPAID', 'APPROVED', 'PAID', 'REJECTED', 'CANCELLED'];
                    const aStatus = getPrimaryStatus(a.approval_status, a.purchase_stage, a.financial_status);
                    const bStatus = getPrimaryStatus(b.approval_status, b.purchase_stage, b.financial_status);
                    const aIndex = DISPLAY_STATUS_ORDER.indexOf(aStatus);
                    const bIndex = DISPLAY_STATUS_ORDER.indexOf(bStatus);
                    comparison = aIndex - bIndex;
                } else if (sortColumn === 'date') {
                    // Submitted Date = created_at
                    comparison = new Date(a.created_at || a.date).getTime() - new Date(b.created_at || b.date).getTime();
                } else if (sortColumn === 'invoice_date') {
                    // Invoice Date = date
                    comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
                } else if (sortColumn === 'paid_date') {
                    // Paid Date = payment_date
                    const aDate = a.payment_date ? new Date(a.payment_date).getTime() : 0;
                    const bDate = b.payment_date ? new Date(b.payment_date).getTime() : 0;
                    comparison = aDate - bDate;
                } else if (sortColumn === 'project_name') {
                    const aName = a.project_name || a.project?.project_name || "";
                    const bName = b.project_name || b.project?.project_name || "";
                    comparison = aName.localeCompare(bName);
                } else if (sortColumn === 'amount') {
                    comparison = (Number(a.amount) || 0) - (Number(b.amount) || 0);
                } else if (sortColumn === 'description') {
                    comparison = (a.description || "").localeCompare(b.description || "");
                } else if (sortColumn === 'type') {
                    comparison = (a.type || "").localeCompare(b.type || "");
                } else if (sortColumn === 'submitted_by_name') {
                    comparison = (a.submitted_by_name || "").localeCompare(b.submitted_by_name || "");
                }

                if (comparison === 0) {
                    return (b.id || "").localeCompare(a.id || "");
                }
                return sortDirection === 'asc' ? comparison : -comparison;
            });
        }

        return current;
    })();

    return (
        <FinancePageWrapper
            header={
                <FinanceHeader
                    title="Purchasing"
                    subtitle={isTeamView ? "Manage all staff purchase requests." : "Track your material and tool requests."}
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
                                 activeColor="ring-blue-600"
                             />

                             <FinanceSummaryCard
                                 icon={<Clock className="w-5 h-5 text-amber-600" />}
                                 iconBg="bg-amber-50"
                                 label="Pending"
                                 value={summaryStats.pending.toString()}
                                 subtext={formatCurrency(summaryStats.pendingAmount)}
                                 onClick={() => setStatusFilter("SUBMITTED")}
                                 isActive={statusFilter === "SUBMITTED"}
                                 activeColor="ring-amber-500"
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
                                 value={(summaryStats.rejected || 0).toString()}
                                 subtext="REJECTED"
                                 onClick={() => setStatusFilter("REJECTED")}
                                 isActive={statusFilter === "REJECTED"}
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
                                                <FileText className="w-4 h-4 text-red-500" /> Export to PDF
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

                        {/* MOBILE/TABLET CARD VIEW */}
                        <div className="mt-6 block lg:hidden space-y-3">
                            {filteredItems.length === 0 ? (
                                <div className="bg-white/40 dark:bg-neutral-900/60 backdrop-blur-md rounded-[24px] border border-white/50 dark:border-neutral-800 shadow-sm dark:shadow-none p-6 text-center">
                                    <Package className="w-10 h-10 text-neutral-300 dark:text-neutral-600 mx-auto mb-2" />
                                    <h4 className="text-[17px] font-bold text-neutral-900 dark:text-white mt-4">
                                        {searchTerm ? "No Search Results" :
                                            statusFilter !== "ALL" ? `No ${statusFilter.toLowerCase()} requests` :
                                                "No Purchase Requests Yet"}
                                    </h4>
                                    <p className="text-[13px] text-neutral-500 dark:text-neutral-400 mt-2 max-w-[240px] mx-auto leading-relaxed">
                                        {searchTerm ? "Try adjusting your search terms to find what you're looking for." :
                                            "Start by creating a new request to track your materials and tools."}
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
                                    const statusToUse = item.financial_status === 'PAID' ? 'Paid' :
                                        item.approval_status === 'APPROVED' ? 'Approved' :
                                            item.approval_status === 'REJECTED' ? 'Rejected' :
                                                item.approval_status === 'NEED_REVISION' ? 'Revise' :
                                                    item.approval_status === 'SUBMITTED' ? 'Pending' : 'Draft';

                                    const renderMobileActions = () => {
                                        const isDraftOrRevise = item.approval_status === "DRAFT" || item.approval_status === "NEED_REVISION";
                                        const isSubmitted = item.approval_status === "SUBMITTED";
                                        const isApprovedNotPaid = item.approval_status === "APPROVED" && item.financial_status !== "PAID";
                                        const isAdmin = ["admin", "superadmin", "supervisor"].includes(userRole || "");

                                        return (
                                            <div className="flex items-center gap-1.5 w-full justify-end">
                                                {isTeamView ? (
                                                    <>
                                                        {isAdmin && (
                                                            <button onClick={(e) => { e.stopPropagation(); setDeletingItem(item); }} className="p-2.5 rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-500 border border-rose-100 dark:border-rose-500/20 flex-shrink-0 active:scale-95 transition-all">
                                                                <Trash2 className="w-[18px] h-[18px]" />
                                                            </button>
                                                        )}
                                                        {isSubmitted && (
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
                                                            <>
                                                                <button onClick={(e) => { e.stopPropagation(); setEditingItem(item); setIsDrawerOpen(true); }} className="p-2.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 flex-shrink-0 active:scale-95 transition-all" title="Edit">
                                                                    <Pencil className="w-[18px] h-[18px]" />
                                                                </button>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); setPayingItem(item); }}
                                                                    disabled={!item.invoice_url || !item.beneficiary_bank || !item.beneficiary_number}
                                                                    className="flex-1 py-2.5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-md shadow-blue-200/50"
                                                                >
                                                                    <CreditCard className="w-[18px] h-[18px]" /> {(!item.invoice_url || !item.beneficiary_bank || !item.beneficiary_number) ? "Missing Data" : "Pay Now"}
                                                                </button>
                                                            </>
                                                        )}
                                                    </>
                                                ) : (
                                                    <>
                                                        <button onClick={(e) => { e.stopPropagation(); setDeletingItem(item); }} className="p-2.5 rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-500 border border-rose-100 dark:border-rose-500/20 flex-shrink-0 active:scale-95 transition-all" title="Delete">
                                                            <Trash2 className="w-[18px] h-[18px]" />
                                                        </button>
                                                        {(isDraftOrRevise) && (
                                                            <button onClick={(e) => { e.stopPropagation(); setEditingItem(item); setIsDrawerOpen(true); }} className="flex-1 py-2.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 font-bold text-[11px] flex items-center justify-center gap-1.5 active:scale-95 transition-all">
                                                                <Pencil className="w-[18px] h-[18px]" /> Edit
                                                            </button>
                                                        )}
                                                        {item.approval_status === 'DRAFT' && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    // Fixed: removed fetchItems and changed to object payload
                                                                    updatePurchasingStatus(item.id, { approval_status: 'SUBMITTED' }).then(() => loadData());
                                                                }}
                                                                className="flex-[1.5] py-2.5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-md shadow-blue-200/50"
                                                            >
                                                                <Send className="w-[18px] h-[18px]" /> Submit
                                                            </button>
                                                        )}
                                                        {isSubmitted && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setRevertingItem(item); }}
                                                                className="flex-1 py-2.5 rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-500 border border-rose-100 dark:border-rose-500/20 text-[11px] font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                                                            >
                                                                <Undo2 className="w-[18px] h-[18px]" /> Cancel
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        );
                                    };

                                    return (
                                        <FinanceItemCard
                                            key={item.id}
                                            item={item}
                                            status={statusToUse}
                                            onClick={() => setViewingItem(item)}
                                            actions={statusToUse !== 'Paid' ? renderMobileActions() : undefined}
                                        />
                                    );
                                })
                            )}
                        </div>

                        {/* DESKTOP TABLE VIEW */}
                        <div className="mt-6 hidden lg:block bg-white/40 dark:bg-white/[0.03] backdrop-blur-md rounded-3xl border border-white/50 dark:border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.02)] dark:shadow-none overflow-hidden">
                            <div className="overflow-x-auto scrollbar-hide">
                                <table className="w-full text-left border-collapse table-auto">
                                    <thead>
                                        <tr className="border-b border-neutral-100 dark:border-white/[0.06] bg-neutral-50/50 dark:bg-white/[0.02]">
                                            <th
                                                className="px-6 py-4 text-[10px] font-bold text-neutral-400 dark:text-neutral-500 cursor-pointer hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors hidden xl:table-cell"
                                                onClick={() => handleSort('date')}
                                            >
                                                <div className="flex items-center gap-1 group/header">
                                                    Timeline
                                                    {sortColumn === 'date' ? (
                                                        sortDirection === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                                                    ) : <ChevronDown className="w-3.5 h-3.5 text-neutral-400 opacity-0 group-hover/header:opacity-40 transition-all" />}
                                                </div>
                                            </th>
                                            <th
                                                className="px-6 py-4 text-[10px] font-bold text-neutral-400 dark:text-neutral-500 cursor-pointer hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors min-w-[120px]"
                                                onClick={() => handleSort('project_name')}
                                            >
                                                <div className="flex items-center gap-1 group/header">
                                                    Project / PO
                                                    {sortColumn === 'project_name' ? (
                                                        sortDirection === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                                                    ) : <ChevronDown className="w-3.5 h-3.5 text-neutral-400 opacity-0 group-hover/header:opacity-40 transition-all" />}
                                                </div>
                                            </th>
                                            <th
                                                className="px-6 py-4 text-[10px] font-bold text-neutral-400 dark:text-neutral-500 cursor-pointer hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                                                onClick={() => handleSort('description')}
                                            >
                                                <div className="flex items-center gap-1 group/header">
                                                    Item & Description
                                                    {sortColumn === 'description' ? (
                                                        sortDirection === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                                                    ) : <ChevronDown className="w-3.5 h-3.5 text-neutral-400 opacity-0 group-hover/header:opacity-40 transition-all" />}
                                                </div>
                                            </th>
                                            <th
                                                className="px-6 py-4 text-right text-[10px] font-bold text-neutral-400 dark:text-neutral-500 cursor-pointer hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                                                onClick={() => handleSort('amount')}
                                            >
                                                <div className="flex items-center justify-end gap-1 group/header">
                                                    Amount
                                                    {sortColumn === 'amount' ? (
                                                        sortDirection === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                                                    ) : <ChevronDown className="w-3.5 h-3.5 text-neutral-400 opacity-0 group-hover/header:opacity-40 transition-all" />}
                                                </div>
                                            </th>
                                            <th
                                                className="px-6 py-4 text-center text-[10px] font-bold text-neutral-400 dark:text-neutral-500 cursor-pointer hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                                                onClick={() => handleSort('status')}
                                            >
                                                <div className="flex items-center justify-center gap-1 group/header">
                                                    Status
                                                    {sortColumn === 'status' ? (
                                                        sortDirection === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                                                    ) : <ChevronDown className="w-3.5 h-3.5 text-neutral-400 opacity-0 group-hover/header:opacity-40 transition-all" />}
                                                </div>
                                            </th>
                                            {isTeamView && (
                                                <th
                                                    className="px-6 py-4 text-[10px] font-bold text-neutral-400 dark:text-neutral-500 cursor-pointer hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors hidden 2xl:table-cell"
                                                    onClick={() => handleSort('submitted_by_name')}
                                                >
                                                    <div className="flex items-center gap-1 group/header">
                                                        Submitter
                                                        {sortColumn === 'submitted_by_name' ? (
                                                            sortDirection === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                                                        ) : <ChevronDown className="w-3.5 h-3.5 text-neutral-400 opacity-0 group-hover/header:opacity-40 transition-all" />}
                                                    </div>
                                                </th>
                                            )}
                                            <th className="px-6 py-4 text-right text-[10px] font-bold text-neutral-400 dark:text-neutral-500 hidden 2xl:table-cell w-[140px]">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-50 dark:divide-white/[0.04]">
                                        {filteredItems.length === 0 ? (
                                            <tr>
                                                <td colSpan={isTeamView ? 7 : 6} className="py-16 text-center">
                                                    <div className="flex flex-col items-center gap-4">
                                                        <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center">
                                                            <Package className="w-8 h-8 text-neutral-400" />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <h4 className="text-base font-bold text-neutral-900">
                                                                {searchTerm ? "No results found" :
                                                                    statusFilter !== "ALL" ? `No ${statusFilter.toLowerCase()} requests` :
                                                                        "No purchase requests yet"}
                                                            </h4>
                                                            <p className="text-sm text-neutral-500 max-w-xs mx-auto">
                                                                {searchTerm ?
                                                                    `We couldn't find any requests matching "${searchTerm}". Try a different search term.` :
                                                                    statusFilter !== "ALL" ?
                                                                        `There are no ${statusFilter.toLowerCase()} purchase requests found.` :
                                                                        isTeamView ?
                                                                            "When team members submit purchase requests, they'll appear here for your review." :
                                                                            "Start by creating your first purchase request. Track materials, tools, and services."}
                                                            </p>
                                                        </div>
                                                        {/* Only show New Request button for current or future months */}
                                                        {!searchTerm && statusFilter === "ALL" && (
                                                            <button
                                                                onClick={() => setIsDrawerOpen(true)}
                                                                className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl shadow-lg shadow-blue-200/50 transition-all flex items-center gap-2"
                                                            >
                                                                <Plus className="w-4 h-4" />
                                                                New Purchase Request
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            <>
                                                {filteredItems.map((item) => (
                                                    <tr
                                                        key={item.id}
                                                        className="group hover:bg-white/60 dark:hover:bg-white/[0.04] transition-all duration-300 cursor-pointer"
                                                        onClick={() => {
                                                            // Both views now open ViewModal (read-only for Personal)
                                                            setViewingItem(item);
                                                        }}
                                                    >
                                                        <td className="px-6 py-4 whitespace-nowrap hidden xl:table-cell">
                                                            <div className="flex flex-col gap-1">
                                                                {/* Row 1: Primary Date (S/I or I) */}
                                                                <div className="flex items-baseline gap-1 text-[11px] font-bold text-neutral-900 dark:text-white tabular-nums leading-none">
                                                                    {format(new Date(item.date), "dd MMM")}
                                                                    <span className="text-[8px] font-bold text-neutral-400 uppercase">
                                                                        {format(new Date(item.created_at || item.date), "dd MMM") === format(new Date(item.date), "dd MMM") ? "(S/I)" : "(I)"}
                                                                    </span>
                                                                </div>
                                                                
                                                                {/* Row 2: Secondary Dates */}
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
                                                                <div className={clsx(
                                                                    "px-2 py-0.5 rounded-full text-[10px] font-bold w-fit",
                                                                    "bg-neutral-100 dark:bg-white/10 text-neutral-600 dark:text-neutral-400"
                                                                )}>
                                                                    {item.project_code}
                                                                </div>
                                                                <span className="text-[10px] font-medium text-neutral-400 tabular-nums uppercase whitespace-nowrap">
                                                                    {formatStructuredId('PO', item.project_number, item.request_number, item.project_code)}
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
                                                                        {item.vendor && <span className="text-neutral-300 mx-1">•</span>}
                                                                        {item.vendor && <span className="text-neutral-400">{cleanEntityName(item.vendor)}</span>}
                                                                    </span>
                                                                )}
                                                                <div className="flex items-center gap-1 mt-1 text-[9px] font-bold text-neutral-400 uppercase tracking-wider">
                                                                    <span className="text-neutral-500">{item.type}</span>
                                                                    {item.subcategory && (
                                                                        <>
                                                                            <span className="text-neutral-300">•</span>
                                                                            <span className="text-neutral-500">{item.subcategory}</span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className="text-[12px] font-bold text-neutral-900 tabular-nums tracking-tight">
                                                                {formatCurrency(item.amount)}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <div className="flex flex-col items-center gap-1">
                                                                <StatusBadge status={getPrimaryStatus(
                                                                    item.approval_status,
                                                                    item.purchase_stage,
                                                                    item.financial_status
                                                                )} />
                                                                {item.financial_status === "PAID" && item.purchase_stage === "INVOICED" && (
                                                                    <span className="text-[8px] font-bold text-emerald-600">Goods Pending</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        {isTeamView && (
                                                            <td className="px-6 py-4 hidden 2xl:table-cell max-w-[100px]">
                                                                <span className="text-neutral-900 dark:text-white text-[12px] font-medium whitespace-normal leading-tight block">
                                                                    {item.submitted_by_name}
                                                                </span>
                                                            </td>
                                                        )}
                                                        <td className="px-6 py-4 text-right hidden 2xl:table-cell">
                                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                                                {isTeamView ? (
                                                                    <>
                                                                        {item.approval_status === "SUBMITTED" && (
                                                                            <>
                                                                                <button
                                                                                    onClick={(e) => { e.stopPropagation(); setApprovingItem(item); }}
                                                                                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-full transition-all"
                                                                                    title="Approve"
                                                                                >
                                                                                    <CheckCircle2 className="w-4 h-4" strokeWidth={2} />
                                                                                </button>
                                                                                <button
                                                                                    onClick={(e) => { e.stopPropagation(); setRevisingItem(item); }}
                                                                                    className="p-1.5 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10 rounded-full transition-all"
                                                                                    title="Request Revision"
                                                                                >
                                                                                    <AlertCircle className="w-4 h-4" strokeWidth={2} />
                                                                                </button>
                                                                                <button
                                                                                    onClick={(e) => { e.stopPropagation(); setRejectingItem(item); }}
                                                                                    className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-full transition-all"
                                                                                    title="Reject"
                                                                                >
                                                                                    <Ban className="w-4 h-4" strokeWidth={2} />
                                                                                </button>
                                                                            </>
                                                                        )}
                                                                        {(item.approval_status === "DRAFT" || item.approval_status === "NEED_REVISION") && (
                                                                            <button onClick={(e) => { e.stopPropagation(); setEditingItem(item); setIsDrawerOpen(true); }} className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-full transition-all" title="Edit Request">
                                                                                <Pencil className="w-4 h-4" strokeWidth={2} />
                                                                            </button>
                                                                        )}
                                                                        {item.approval_status === "APPROVED" && item.financial_status !== "PAID" && (
                                                                            <>
                                                                                <button onClick={(e) => { e.stopPropagation(); setEditingItem(item); setIsDrawerOpen(true); }} className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-full transition-all" title="Add Missing Details">
                                                                                    <Pencil className="w-4 h-4" strokeWidth={2} />
                                                                                </button>
                                                                                <button
                                                                                    onClick={(e) => { e.stopPropagation(); setPayingItem(item); }}
                                                                                    disabled={!item.invoice_url || !item.beneficiary_bank || !item.beneficiary_number}
                                                                                    className={clsx(
                                                                                        "p-1.5 rounded-full transition-all",
                                                                                        (!item.invoice_url || !item.beneficiary_bank || !item.beneficiary_number)
                                                                                            ? "text-neutral-200 cursor-not-allowed"
                                                                                            : "text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10"
                                                                                    )}
                                                                                    title={(!item.invoice_url || !item.beneficiary_bank || !item.beneficiary_number) ? "Invoice & Beneficiary required" : "Mark as Paid"}
                                                                                >
                                                                                    <CreditCard className="w-4 h-4" strokeWidth={2} />
                                                                                </button>
                                                                            </>
                                                                        )}
                                                                        {/* Admin Delete Button - Visible in Team View for all statuses */}
                                                                        {["admin", "superadmin", "supervisor"].includes(userRole || "") && (
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setDeletingItem(item);
                                                                                }}
                                                                                className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-full transition-all"
                                                                                title="Delete Request"
                                                                            >
                                                                                <Trash2 className="w-4 h-4" strokeWidth={2} />
                                                                            </button>
                                                                        )}
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        {(["DRAFT", "SUBMITTED", "NEED_REVISION", "REJECTED"].includes(item.approval_status) || ["admin", "superadmin", "supervisor"].includes(userRole || "")) && (
                                                                            <>
                                                                                {(["DRAFT", "SUBMITTED", "NEED_REVISION"].includes(item.approval_status) || ["admin", "superadmin", "supervisor"].includes(userRole || "")) && (
                                                                                    <button onClick={(e) => { e.stopPropagation(); setEditingItem(item); setIsDrawerOpen(true); }} className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-full transition-all" title="Edit Request">
                                                                                        <Pencil className="w-4 h-4" strokeWidth={2} />
                                                                                    </button>
                                                                                )}
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        setDeletingItem(item);
                                                                                    }}
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
                                                ))}
                                            </>
                                        )}
                                    </tbody>
                                </table>
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

            {
                payingItem && (
                    <PayDrawer
                        item={payingItem}
                        onClose={() => setPayingItem(null)}
                        onPay={async (source, date, notes, proofFiles) => {
                            try {
                                const requestId = payingItem.request_id || payingItem.id;
                                console.log("Processing payment for request:", requestId);

                                let proofUrls: string[] = [];
                                if (proofFiles && proofFiles.length > 0) {
                                    for (const file of proofFiles) {
                                        try {
                                            const ext = file.name.split('.').pop();
                                            const path = `proofs/${requestId}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
                                            const url = await uploadFinanceFileExact(file, path);
                                            if (url) proofUrls.push(url);
                                        } catch (uploadError) {
                                            console.error("Failed to upload proof:", uploadError);
                                            alert("Failed to upload payment proof file: " + file.name + ". Continuing with payment...");
                                        }
                                    }
                                }

                                const success = await updatePurchasingStatus(requestId, {
                                    financial_status: "PAID",
                                    payment_date: date,
                                    source_of_fund_id: source,
                                    notes: notes,
                                    payment_proof_url: proofUrls.length > 0 ? proofUrls.join(',') : undefined
                                });

                                if (success) {
                                    // Update drawer in real-time
                                    if (viewingItem && viewingItem.id === (payingItem.request_id || payingItem.id)) {
                                        setViewingItem({ ...viewingItem, financial_status: 'PAID', payment_date: date });
                                    }
                                    loadData();
                                    setPayingItem(null);
                                } else {
                                    alert("Failed to process payment. Please try again.");
                                }
                            } catch (error) {
                                console.error("Payment error:", error);
                                alert("An error occurred during payment processing.");
                            }
                        }}
                        fundingSources={fundingSources}
                        isLoadingSources={isLoadingSources}
                    />
                )
            }

            {/* Reject Modal */}
            {
                rejectingItem && (
                    <RejectModal
                        item={rejectingItem}
                        onClose={() => setRejectingItem(null)}
                        onReject={async (reason) => {
                            try {
                                const requestId = rejectingItem.request_id || rejectingItem.id;
                                const success = await updatePurchasingStatus(requestId, {
                                    approval_status: "REJECTED",
                                    rejection_reason: reason
                                });

                                if (success) {
                                    // Update drawer in real-time
                                    if (viewingItem && viewingItem.id === rejectingItem.id) {
                                        setViewingItem({ ...viewingItem, approval_status: 'REJECTED', rejection_reason: reason });
                                    }
                                    loadData();
                                    setRejectingItem(null);
                                } else {
                                    alert("Failed to reject request. Please try again.");
                                }
                            } catch (error) {
                                console.error("Rejection error:", error);
                                alert("An error occurred during rejection.");
                            }
                        }}
                    />
                )
            }

            {/* View Modal */}
            {
                viewingItem && (
                    <ViewModal
                        item={viewingItem}
                        onClose={() => { setViewingItem(null); setIsViewingDeleted(false); clearRequestId(); }}
                        onPreview={(tab) => setPreviewingDocument({ item: viewingItem, initialTab: tab })}
                        onApprove={() => setApprovingItem(viewingItem)}
                        onReject={() => setRejectingItem(viewingItem)}
                        onRevise={() => setRevisingItem(viewingItem)}
                        onEdit={() => { setEditingItem(viewingItem); setIsDrawerOpen(true); }}
                        onPay={() => setPayingItem(viewingItem)}
                        onDelete={() => setDeletingItem(viewingItem)}
                        onRefresh={() => loadData()}
                        isTeamView={isTeamView}
                        userRole={userRole}
                        isDeleted={isViewingDeleted}
                        setRevertingItem={setRevertingItem}
                        loadData={loadData}
                        setShowSuccess={setShowSuccess}
                    />
                )
            }

            {/* Document Drawer */}
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
            {
                deletingItem && (
                    <DeleteConfirmModal
                        item={deletingItem}
                        onClose={() => setDeletingItem(null)}
                        onConfirm={async () => {
                            setIsDeleting(true);
                            try {
                                await deletePurchasingRequest(deletingItem.id);
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
                )
            }

            <NewRequestDrawer
                isOpen={isDrawerOpen}
                onClose={() => {
                    setIsDrawerOpen(false);
                    setEditingItem(null);
                    clearRequestId();
                }}
                initialType="PURCHASE"
                hideSwitcher={true}
                initialData={editingItem || undefined}
                onSuccess={() => {
                    loadData();
                    setIsDrawerOpen(false);
                    setEditingItem(null);
                }}
                onDelete={editingItem ? async () => {
                    try {
                        await deletePurchasingRequest(editingItem.id);
                        loadData();
                        setIsDrawerOpen(false);
                        setEditingItem(null);
                    } catch (error) {
                        console.error("Delete failed:", error);
                        alert("Failed to delete request");
                    }
                } : undefined}
            />

            {/* Confirmation Modal */}
            {
                revisingItem && (
                    <ReviseModal
                        item={revisingItem}
                        onClose={() => setRevisingItem(null)}
                        onRevise={async (reason) => {
                            try {
                                await updatePurchasingStatus(revisingItem.id, {
                                    approval_status: 'NEED_REVISION',
                                    revision_reason: reason
                                });
                                // Update drawer in real-time
                                if (viewingItem && viewingItem.id === revisingItem.id) {
                                    setViewingItem({ ...viewingItem, approval_status: 'NEED_REVISION', revision_reason: reason });
                                }
                                setRevisingItem(null);
                                loadData();
                            } catch (error) {
                                console.error("Error updating revision status:", error);
                                alert("Failed to request revision.");
                            }
                        }}
                    />
                )
            }

            {
                approvingItem && (
                    <ApproveModal
                        item={approvingItem}
                        approverName={profile?.username || "Admin"}
                        onClose={() => setApprovingItem(null)}
                        onApprove={async (amount, approver) => {
                            try {
                                const requestId = approvingItem.request_id || approvingItem.id;
                                const success = await updatePurchasingStatus(requestId, {
                                    approval_status: "APPROVED",
                                    approved_amount: amount,
                                    approved_by_name: approver
                                } as any);
                                if (success) {
                                    // Update drawer in real-time
                                    if (viewingItem && viewingItem.id === approvingItem.id) {
                                        setViewingItem({ ...viewingItem, approval_status: 'APPROVED', approved_amount: amount, approved_by_name: approver });
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

            <AnimatePresence>
                {revertingItem && (
                    <RevertConfirmModal
                        item={revertingItem}
                        onClose={() => setRevertingItem(null)}
                        isReverting={isReverting}
                        onConfirm={async () => {
                            try {
                                setIsReverting(true);
                                const success = await updatePurchasingStatus(revertingItem.id, {
                                    approval_status: 'DRAFT'
                                });
                                if (success) {
                                    // Update drawer in real-time
                                    if (viewingItem && viewingItem.id === revertingItem.id) {
                                        setViewingItem({ ...viewingItem, approval_status: 'DRAFT' });
                                    }
                                    setRevertingItem(null);
                                    loadData();
                                    setShowSuccess({
                                        title: "Request Reverted",
                                        message: "The request has been returned to draft status."
                                    });
                                } else {
                                    alert("Failed to revert request to draft.");
                                }
                            } catch (error) {
                                console.error("Error reverting status:", error);
                                alert("Failed to revert status.");
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

            <AnimatePresence>
                {confirmModal.open && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
                        onClick={() => setConfirmModal({ ...confirmModal, open: false })}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-6">
                                <h3 className="text-lg font-bold text-neutral-900 mb-2">{confirmModal.title}</h3>
                                <p className="text-sm text-neutral-600">{confirmModal.message}</p>
                            </div>
                            <div className="flex border-t border-neutral-100">
                                <button
                                    onClick={() => setConfirmModal({ ...confirmModal, open: false })}
                                    className="flex-1 px-4 py-3 text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirmAction}
                                    className={clsx(
                                        "flex-1 px-4 py-3 text-sm font-bold transition-colors border-l border-neutral-100",
                                        confirmModal.action === 'delete' || confirmModal.action === 'reject' || confirmModal.action === 'cancel'
                                            ? "text-rose-600 hover:bg-rose-50"
                                            : "text-emerald-600 hover:bg-emerald-50"
                                    )}
                                >
                                    Confirm
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

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
                                                    className="p-1.5 hover:bg-blue-600 hover:text-white rounded-lg transition-all cursor-pointer outline-none bg-blue-100/50 text-blue-600"
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
                                    {["ALL", "SUBMITTED", "APPROVED", "PAID", "REJECTED"].map((status) => {
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
                                                : "bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                                        )}
                                    >
                                        All
                                    </button>
                                    {CATEGORY_OPTIONS.map((cat) => {
                                        const isSelected = categoryFilters.includes(cat.value);
                                        return (
                                            <button
                                                key={cat.value}
                                                onClick={() => {
                                                    if (isSelected) {
                                                        setCategoryFilters(categoryFilters.filter(v => v !== cat.value));
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

        </FinancePageWrapper >
    );
}
