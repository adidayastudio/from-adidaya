"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import FinanceHeader from "@/components/flow/finance/FinanceHeader";
import FinancePageWrapper from "@/components/flow/finance/FinancePageWrapper";
import { useFinance } from "./FinanceContext";
import {
    Search,
    Eye,
    CreditCard,
    X,
    Plus, Loader2, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Download, Pencil, Trash2, CheckCircle2, AlertCircle, Ban, Clock, AlertTriangle,
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
    ArrowDownWideNarrow
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
import { fetchPurchasingRequests, fetchFundingSources, updatePurchasingStatus, deletePurchasingRequest } from "@/lib/client/finance-api";
import { fetchAllProjects } from "@/lib/api/projects";
import { fetchTeamMembers } from "@/lib/api/clock_team";
import { fetchDefaultWorkspaceId } from "@/lib/api/templates";
import { NewRequestDrawer } from "./modules/NewRequestDrawer";

// Status Badge Helper
function StatusBadge({ status }: { status: any }) {
    const theme = STATUS_THEMES[status as keyof typeof STATUS_THEMES] || STATUS_THEMES.DRAFT;
    return (
        <span className={clsx("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border", theme.bg, theme.text, theme.border)}>
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
        <button onClick={handleCopy} className={clsx("p-1 hover:bg-neutral-100 rounded-full transition-all text-neutral-400 hover:text-neutral-600", className)} title="Copy to clipboard">
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
    );
};

// Revise Modal
function ReviseModal({ item, onClose, onRevise }: { item: PurchasingItem, onClose: () => void, onRevise: (reason: string) => void }) {
    const [reason, setReason] = useState("");
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
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
        <div className="flex items-center justify-between px-6 py-4 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm border-t border-neutral-100 dark:border-neutral-800">
            <div className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">
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
                                            ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-lg shadow-neutral-200 dark:shadow-none"
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
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
                        <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Request</div>
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
        <div className="fixed inset-0 z-[100] isolate">
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
                            <span className="text-neutral-500 font-bold tracking-wider uppercase">Amount to Pay</span>
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
                            <span className="text-neutral-500 font-bold tracking-wider uppercase">Submitter</span>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-neutral-900 text-[13px]">{item.submitted_by_name || "-"}</span>
                                <div className="w-6" />
                            </div>
                        </div>

                        <div className="flex justify-between items-start text-xs px-4 py-2">
                            <span className="text-neutral-500 font-bold tracking-wider uppercase mt-1">Beneficiary Account</span>
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
                        <div className="p-4 rounded-3xl bg-red-50/80 backdrop-blur-sm border border-red-100 flex gap-3 animate-in fade-in">
                            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="text-[11px] font-bold text-red-700 uppercase tracking-wider mb-1">Missing Requirements</h4>
                                <p className="text-[11px] text-red-600 font-medium tracking-tight">
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
                            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full min-w-0 h-12 px-4 text-[13px] border border-white/60 dark:border-neutral-800 shadow-sm rounded-full bg-white/60 dark:bg-neutral-900/40 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all font-medium" />
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
                                                        className="w-7 h-7 flex items-center justify-center text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
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
                                            <span className="text-[10px] uppercase font-bold tracking-wider text-red-500/80">Required</span>
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

function ApproveModal({ item, onClose, onApprove }: { item: any, onClose: () => void, onApprove: (amount: number) => void }) {
    const [amountStr, setAmountStr] = useState(item.amount.toString());

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm" onClick={onClose} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative w-full max-w-sm bg-white/50 dark:bg-neutral-900/50 backdrop-blur-2xl border border-white/60 dark:border-neutral-800 rounded-3xl p-6 shadow-2xl overflow-hidden">
                <h3 className="text-lg font-bold text-neutral-900 mb-2 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    Approve Request
                </h3>
                <p className="text-sm text-neutral-500 mb-6 font-medium">Please confirm the approved amount.</p>

                <div className="mb-6">
                    <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Approved Amount</label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 font-bold">Rp</span>
                        <input
                            type="number"
                            autoFocus
                            value={amountStr}
                            onChange={(e) => setAmountStr(e.target.value)}
                            className="w-full h-12 pl-10 pr-4 text-lg border border-neutral-200 rounded-xl bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/30 transition-all font-bold text-neutral-900"
                        />
                    </div>
                </div>

                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-2.5 text-sm font-bold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-all">Cancel</button>
                    <button onClick={() => onApprove(parseFloat(amountStr))} className="flex-1 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-lg shadow-emerald-200">Approve</button>
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
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
    onPreview
}: {
    item: PurchasingItem;
    onClose: () => void;
    onPreview: (tab: 'invoice' | 'proof') => void;
}) {
    const [invoiceUrls, setInvoiceUrls] = useState<{ url: string; name: string; originalPath: string }[]>([]);
    const [proofUrl, setProofUrl] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'invoice' | 'proof'>('invoice');

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
        if (!hasInvoices && item.payment_proof_url) setActiveTab('proof');
    }, [item.invoice_url, item.invoices, item.payment_proof_url]);

    const displayAmount = item.amount || 0;
    const notes = item.rejection_reason || item.notes || "";
    const category = item.type || "-";
    const status = getPrimaryStatus(item.approval_status, item.purchase_stage, item.financial_status);

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-md" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-white/95 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-white/50 overflow-hidden animate-in fade-in zoom-in duration-300 max-h-[90vh] overflow-y-auto">
                <div className="p-8">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-neutral-900">Purchase Request Details</h3>
                        <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
                            <X className="w-5 h-5 text-neutral-400" />
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Date</div>
                                <div className="text-sm font-medium text-neutral-900">{format(new Date(item.date), "dd MMM yyyy")}</div>
                            </div>
                            <div>
                                <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Project</div>
                                <div className="text-sm font-medium text-neutral-900 flex items-center flex-wrap">
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-neutral-100 text-neutral-600 mr-2 border border-neutral-200 shrink-0">
                                        {item.project_code}
                                    </span>
                                    <span>{item.project_name}</span>
                                </div>
                            </div>
                        </div>

                        {/* REVISION/REJECTION REASON */}
                        {(item.approval_status === "NEED_REVISION" || (item.approval_status === "DRAFT" && item.revision_reason)) && item.revision_reason && (
                            <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 mb-6 animate-in fade-in slide-in-from-top-2">
                                <h4 className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                    <AlertCircle className="w-3.5 h-3.5" /> Revision Requested
                                </h4>
                                <p className="text-sm font-medium text-orange-900">{item.revision_reason}</p>
                            </div>
                        )}

                        {(item.approval_status === "REJECTED" || item.rejection_reason) && item.rejection_reason && (
                            <div className="bg-red-50 p-4 rounded-xl border border-red-100 mb-6 animate-in fade-in slide-in-from-top-2">
                                <h4 className="text-[10px] font-bold text-red-600 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                    <Ban className="w-3.5 h-3.5" /> Rejection Reason
                                </h4>
                                <p className="text-sm font-medium text-red-900">{item.rejection_reason}</p>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Category</div>
                                <div className="text-sm font-medium text-neutral-900 capitalize">{formatStatus(category)}</div>
                            </div>
                            <div>
                                <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Subcategory</div>
                                <div className="text-sm font-medium text-neutral-900 capitalize">{item.subcategory ? formatStatus(item.subcategory) : "-"}</div>
                            </div>
                        </div>

                        <div>
                            <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Description</div>
                            <div className="text-sm font-medium text-neutral-900">
                                {item.description || (item.items && item.items.length > 0
                                    ? item.items.map((i: any) => i.name).join(', ')
                                    : "No description")}
                            </div>
                            {item.vendor && <div className="text-[10px] text-neutral-400 font-medium mt-1">Vendor: {item.vendor}</div>}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Amount</div>
                                <div className="flex items-center gap-1">
                                    <span className="text-lg font-bold text-neutral-900">{formatCurrency(item.amount)}</span>
                                    <CopyButton text={String(item.amount)} />
                                </div>
                            </div>
                            <div>
                                <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Status</div>
                                <div className="flex flex-col gap-1">
                                    <StatusBadge status={status} />
                                    {item.financial_status === "PAID" && item.purchase_stage === "INVOICED" && (
                                        <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-tight">Paid, Goods Pending</span>
                                    )}
                                    {item.financial_status === "PAID" && item.purchase_stage === "RECEIVED" && (
                                        <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-tight">Paid & Received</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* PURCHASE STAGE */}
                        <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-100 mb-2">
                            <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <Clock className="w-3.5 h-3.5" /> Purchase Stage
                            </div>
                            <div className="flex items-center gap-2">
                                {(["PLANNED", "INVOICED", "RECEIVED"] as PurchaseStage[]).map((s) => (
                                    <div
                                        key={s}
                                        className={clsx(
                                            "flex-1 py-1.5 px-2 rounded-lg text-center text-[10px] font-bold border transition-all",
                                            item.purchase_stage === s
                                                ? "bg-red-500 border-red-500 text-white shadow-sm"
                                                : "bg-white border-neutral-200 text-neutral-400 opacity-50"
                                        )}
                                    >
                                        {formatStatus(s)}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Items Breakdown */}
                        {item.items && item.items.length > 0 && (
                            <div className="space-y-1.5 pt-1">
                                <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest px-1">Details Breakdown</div>
                                <div className="border border-neutral-100 rounded-xl overflow-hidden bg-neutral-50/30">
                                    <table className="w-full text-xs">
                                        <thead className="bg-neutral-50 text-[10px] uppercase font-bold text-neutral-400 border-b border-neutral-50">
                                            <tr>
                                                <th className="py-2 px-3 text-left font-semibold">Item</th>
                                                <th className="py-2 px-3 text-center font-semibold w-[15%]">Qty</th>
                                                <th className="py-2 px-3 text-right font-semibold w-[20%]">Price</th>
                                                <th className="py-2 px-3 text-right font-semibold w-[20%]">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-neutral-50">
                                            {item.items.map((it: any, idx: number) => (
                                                <tr key={idx} className="bg-white hover:bg-neutral-50/50 transition-colors">
                                                    <td className="py-2 px-3 font-medium text-neutral-800">{it.name}</td>
                                                    <td className="py-2 px-3 text-center text-neutral-500">
                                                        {it.qty} <span className="text-[9px] text-neutral-400 uppercase">{it.unit}</span>
                                                    </td>
                                                    <td className="py-2 px-3 text-right text-neutral-500 tabular-nums">{formatCurrency(it.unit_price)}</td>
                                                    <td className="py-2 px-3 text-right font-bold text-neutral-900 tabular-nums">{formatCurrency(it.total)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Missing Info Warning */}
                    {item.approval_status === "APPROVED" && ((!item.invoice_url && (!item.invoices || item.invoices.length === 0)) || !item.beneficiary_bank || !item.beneficiary_number) && (
                        <div className="my-6 p-4 bg-red-50 border border-red-100 rounded-xl flex gap-3 animate-in fade-in slide-in-from-top-1">
                            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                            <div>
                                <h4 className="text-[11px] font-bold text-red-700 uppercase tracking-wider mb-1">Action Required Before Payment</h4>
                                <p className="text-xs text-red-600 font-medium"> Please upload the invoice and complete the beneficiary details by editing this request. </p>
                            </div>
                        </div>
                    )}

                    {/* Beneficiary Details - Compact Card */}
                    {(item.beneficiary_bank || item.beneficiary_number || item.beneficiary_name) && (
                        <div className="my-6 bg-white p-3.5 rounded-xl border border-dashed border-neutral-200 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.02)] relative overflow-hidden group hover:border-red-200 transition-colors">
                            <div className="absolute top-0 right-0 p-3 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity pointer-events-none">
                                <CreditCard className="w-16 h-16 rotate-12" />
                            </div>

                            <div className="flex items-center gap-2 mb-2.5">
                                <div className="w-5 h-5 rounded-md bg-red-50 flex items-center justify-center">
                                    <CreditCard className="w-2.5 h-2.5 text-red-500" />
                                </div>
                                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Beneficiary Account</span>
                            </div>

                            <div className="flex flex-col gap-0.5 relative z-10 pl-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-neutral-900">{item.beneficiary_bank || "Unknown Bank"}</span>
                                    <span className="text-sm font-mono font-medium text-neutral-500 tracking-tight bg-neutral-50 px-1.5 py-0.5 rounded border border-neutral-100">{item.beneficiary_number || "-"}</span>
                                    {item.beneficiary_number && <CopyButton text={item.beneficiary_number} />}
                                </div>
                                <div className="text-xs font-medium text-neutral-500">{item.beneficiary_name || "-"}</div>
                            </div>
                        </div>
                    )}

                    <div>
                        <div className="flex p-1 bg-neutral-100 rounded-xl mb-4">
                            <button onClick={() => setActiveTab('invoice')} className={clsx("flex-1 py-2 text-xs font-bold rounded-lg transition-all", activeTab === 'invoice' ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700")}>Invoice</button>
                            <button onClick={() => setActiveTab('proof')} className={clsx("flex-1 py-2 text-xs font-bold rounded-lg transition-all", activeTab === 'proof' ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700")}>Proof of Transfer</button>
                        </div>

                        {activeTab === 'invoice' && (
                            <div className="space-y-3">
                                {invoiceUrls.length > 0 ? (
                                    invoiceUrls.map((inv, idx) => (
                                        <div key={idx} className="border border-neutral-200 rounded-xl overflow-hidden bg-neutral-50 group relative">
                                            <div className="p-2 border-b border-neutral-100 flex items-center justify-between bg-white">
                                                <span className="text-xs font-bold text-neutral-600">{inv.name}</span>
                                                <span className="text-[10px] text-neutral-400">#{idx + 1}</span>
                                            </div>
                                            {inv.originalPath.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                                <button onClick={() => onPreview('invoice')} className="w-full text-left cursor-zoom-in relative block">
                                                    <img src={inv.url} alt={inv.name} className="w-full max-h-40 object-contain" />
                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                        <div className="bg-white/90 rounded-full px-3 py-1 text-xs font-bold text-neutral-700 shadow-sm">Click to Zoom</div>
                                                    </div>
                                                </button>
                                            ) : (
                                                <div className="p-4 flex items-center justify-between">
                                                    <span className="text-sm text-neutral-600">PDF / Document</span>
                                                    <a href={inv.url} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">Open File</a>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-8 text-center bg-neutral-50 rounded-xl border border-dashed border-neutral-200"><p className="text-xs text-neutral-400">No invoice attached</p></div>
                                )}
                            </div>
                        )}

                        {activeTab === 'proof' && (
                            <div className="space-y-2">
                                {item.payment_proof_url ? (
                                    <div className="border border-neutral-200 rounded-xl overflow-hidden bg-neutral-50 group relative">
                                        {item.payment_proof_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                            <button onClick={() => onPreview('proof')} className="w-full text-left cursor-zoom-in relative block">
                                                {proofUrl ? <img src={proofUrl} alt="Proof" className="w-full max-h-48 object-contain" /> : <div className="h-48 flex items-center justify-center bg-neutral-100/50"><Loader2 className="w-6 h-6 animate-spin text-neutral-400" /></div>}
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                    <div className="bg-white/90 rounded-full px-3 py-1 text-xs font-bold text-neutral-700 shadow-sm">Click to Zoom</div>
                                                </div>
                                            </button>
                                        ) : (
                                            <div className="p-4 flex items-center justify-between">
                                                <span className="text-sm text-neutral-600">Attached proof</span>
                                                <a href={proofUrl || '#'} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 text-xs font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">Open File</a>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="p-8 text-center bg-neutral-50 rounded-xl border border-dashed border-neutral-200"><p className="text-xs text-neutral-400">No payment proof uploaded</p></div>
                                )}
                            </div>
                        )}
                    </div>

                    {item.notes && (
                        <div className="mt-6">
                            <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Notes</div>
                            <div className="text-sm text-neutral-700 bg-neutral-50 p-3 rounded-lg">{item.notes}</div>
                        </div>
                    )}

                    <div className="mt-8">
                        <button onClick={onClose} className="w-full py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-2xl text-sm font-bold transition-all">Close</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function InvoicePreviewModal({
    item,
    initialTab,
    onClose
}: {
    item: PurchasingItem;
    initialTab: 'invoice' | 'proof';
    onClose: () => void;
}) {
    const [activeTab, setActiveTab] = useState<'invoice' | 'proof'>(initialTab);
    const [signedUrl, setSignedUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isZoomed, setIsZoomed] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    useEffect(() => {
        let active = true;
        const fetchUrl = async () => {
            setIsLoading(true);
            setSignedUrl(null);

            const path = activeTab === 'invoice' ? item.invoice_url : item.payment_proof_url;

            if (path) {
                const url = await getFinanceFileUrl(path);
                if (active) setSignedUrl(url);
            }
            if (active) setIsLoading(false);
        };
        fetchUrl();
        return () => { active = false; };
    }, [activeTab, item]);

    const currentPath = activeTab === 'invoice' ? item.invoice_url : item.payment_proof_url;
    const isImage = currentPath?.match(/\.(jpg|jpeg|png|gif|webp)$/i);

    const handleDownload = async () => {
        if (!signedUrl || !currentPath) return;

        try {
            setIsDownloading(true);

            // Generate filename
            const dateToUse = activeTab === 'proof' ? (item.payment_date || item.updated_at) : item.date;
            const dateStr = format(new Date(dateToUse), "yyyyMMdd");
            const ext = currentPath.split('.').pop();
            const typeStr = activeTab === 'proof' ? "Transfer" : "Invoice";

            const parts = [typeStr, item.project_code || "NA", dateStr];
            if (item.vendor) parts.push(item.vendor);
            parts.push(item.description);

            const safeName = parts.map(p => p.replace(/[^a-zA-Z0-9\s_-]/g, "")).join("_");
            const filename = `${safeName}.${ext}`;

            const response = await fetch(signedUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(link);
        } catch (error) {
            console.error('Download failed:', error);
            window.open(signedUrl, '_blank');
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-md" onClick={onClose} />
            <div className="relative w-full max-w-4xl bg-white/95 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-white/50 overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col max-h-[90vh]">
                <div className="p-6 flex-shrink-0 border-b border-neutral-100">
                    <div className="flex justify-between items-center relative">
                        <div className="flex items-center gap-4">
                            <h3 className="text-lg font-bold text-neutral-900">Document Preview</h3>
                        </div>

                        {/* Tabs */}
                        <div className="absolute left-1/2 -translate-x-1/2 flex items-center bg-neutral-100 p-1 rounded-full">
                            <button
                                onClick={() => setActiveTab('invoice')}
                                className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all ${activeTab === 'invoice'
                                    ? 'bg-white text-neutral-900 shadow-sm'
                                    : 'text-neutral-500 hover:text-neutral-700'
                                    }`}
                            >
                                Invoice
                            </button>
                            <button
                                onClick={() => setActiveTab('proof')}
                                className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all ${activeTab === 'proof'
                                    ? 'bg-white text-neutral-900 shadow-sm'
                                    : 'text-neutral-500 hover:text-neutral-700'
                                    }`}
                            >
                                Proof of Transfer
                            </button>
                        </div>

                        <div className="flex items-center gap-3">
                            {isImage && (
                                <button
                                    onClick={() => setIsZoomed(!isZoomed)}
                                    className="px-4 py-2 bg-neutral-100 text-neutral-600 rounded-full text-xs font-bold hover:bg-neutral-200 transition-colors flex items-center gap-2"
                                >
                                    {isZoomed ? "Zoom Out" : "Zoom In"}
                                </button>
                            )}
                            <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
                                <X className="w-5 h-5 text-neutral-400" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className={`flex-1 bg-neutral-50 relative min-h-[400px] flex ${isZoomed ? 'overflow-auto items-start justify-start p-0' : 'overflow-hidden items-center justify-center p-4'}`}>
                    {isLoading ? (
                        <div className="flex items-center justify-center w-full h-full">
                            <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
                        </div>
                    ) : signedUrl ? (
                        isImage ? (
                            <img
                                src={signedUrl}
                                alt={activeTab === 'invoice' ? "Invoice" : "Proof"}
                                onClick={() => setIsZoomed(!isZoomed)}
                                className={`transition-all duration-300 bg-white shadow-sm ${isZoomed
                                    ? 'w-auto h-auto min-w-[200%] cursor-zoom-out'
                                    : 'max-w-full max-h-[70vh] object-contain cursor-zoom-in rounded-lg'
                                    }`}
                            />
                        ) : (
                            <div className="p-8 text-center flex flex-col items-center justify-center w-full h-full">
                                <Package className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
                                <div className="text-neutral-600 font-medium text-lg">Document Preview</div>
                                <div className="text-sm text-neutral-400 mt-1">{currentPath?.split('/').pop()}</div>
                                <button
                                    onClick={handleDownload}
                                    className="mt-4 text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-2"
                                >
                                    Open File Externally <ExternalLink className="w-3 h-3" />
                                </button>
                            </div>
                        )
                    ) : (
                        <div className="p-8 text-center bg-neutral-50 rounded-xl border border-dashed border-neutral-200 opacity-75">
                            <p className="text-sm text-neutral-400">No {activeTab === 'invoice' ? 'invoice' : 'proof'} attached</p>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-neutral-100 bg-white/50 backdrop-blur-sm flex justify-between items-center">
                    <div className="text-xs text-neutral-400">
                        {item.project_code} • {format(new Date(activeTab === 'proof' ? (item.payment_date || item.updated_at) : item.date), "d MMM yyyy")}
                    </div>
                    {signedUrl && (
                        <button
                            onClick={handleDownload}
                            disabled={isDownloading}
                            className="px-6 py-2.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-full text-sm font-bold shadow-lg shadow-red-200 flex items-center gap-2 transition-all disabled:opacity-75 disabled:cursor-not-allowed"
                        >
                            {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" strokeWidth={2} />}
                            {isDownloading ? "Downloading..." : "Download Original"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function PurchasingClient() {
    const { viewMode, setViewMode, canAccessTeam, userId, isLoading: isAuthLoading, userRole } = useFinance();
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    // Read search term from URL query parameter 'q' (controlled by MobileBottomBar)
    const searchTerm = searchParams.get('q') || "";

    // Sync back to URL when desktop search input changes
    const setSearchTerm = (val: string) => {
        const params = new URLSearchParams(window.location.search);
        if (val.trim()) {
            params.set('q', val.trim());
        } else {
            params.delete('q');
        }
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    };
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [items, setItems] = useState<PurchasingItem[]>([]);
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
    const [sortColumn, setSortColumn] = useState<'date' | 'project_name' | 'amount' | 'status' | 'description' | 'type' | 'submitted_by_name' | null>('date');
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

    // Fetch Data
    const loadData = async (isInitial = false) => {
        if (isInitial) setIsLoadingData(true);
        try {
            const offset = (currentPage - 1) * itemsPerPage;
            const [{ data: rawItems, total, stats }, profiles] = await Promise.all([
                fetchPurchasingRequests({
                    limit: itemsPerPage,
                    offset: offset,
                    approval_status: statusFilter,
                    project_id: selectedProjects.length > 0 ? selectedProjects : undefined,
                    q: searchTerm || undefined,
                    start_date: showAllMonths ? undefined : format(startDate, "yyyy-MM-dd"),
                    end_date: showAllMonths ? undefined : format(endDate, "yyyy-MM-dd"),
                    type: categoryFilters.length > 0 ? categoryFilters : undefined,
                    my_requests: !isTeamView
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
                    ...req, // PRESERVE ALL FIELDS (including request_number, project_number, project object)
                    id: req.id,
                    request_id: req.id,
                    date: req.date,
                    project_id: req.project_id,
                    project_code: req.project?.project_code || req.project_code || "N/A",
                    project_name: req.project?.project_name || req.project_name || "Unknown",
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
            setItems(flattened);
        } catch (e) {
            console.error("Failed to load purchasing requests:", e);
        } finally {
            setIsLoadingData(false);
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
        loadData(items.length === 0); // Only show GlobalLoading if we have no items
    }, [currentPage, statusFilter, selectedProjects, categoryFilters, searchTerm, startDate, endDate, showAllMonths, isTeamView]);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [statusFilter, selectedProjects, categoryFilters, searchTerm, startDate, endDate, showAllMonths, currentMonth]);

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
    const [isDeleting, setIsDeleting] = useState(false);
    const [sortConfig, setSortConfig] = useState<{ key: keyof PurchasingItem; direction: 'asc' | 'desc' } | null>(
        { key: 'date', direction: 'desc' }
    );

    // FAB Action Listener
    useEffect(() => {
        const handleFabAction = (e: any) => {
            if (e.detail?.id === 'FINANCE_NEW_PURCHASE') {
                setIsDrawerOpen(true);
            } else if (e.detail?.id === 'FINANCE_EXPORT') {
                handleExport();
            }
        };
        window.addEventListener('fab-action', handleFabAction);
        return () => window.removeEventListener('fab-action', handleFabAction);
    }, [handleExport]);

    // Custom status order for sorting (similar to ReimburseClient)
    const STATUS_ORDER = ['DRAFT', 'SUBMITTED', 'NEED_REVISION', 'APPROVED', 'PAID', 'REJECTED', 'CANCELLED'];

    const handleSort = (key: keyof PurchasingItem) => {
        setSortConfig(prev => {
            if (prev?.key === key) {
                if (prev.direction === 'asc') return { key, direction: 'desc' };
                return null;
            }
            return { key, direction: 'asc' };
        });
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

    // 3. Final Filtered Items: Now just Base Items (already filtered by backend)
    const filteredItems = useMemo(() => {
        let current = [...items];

        if (sortColumn) {
            current.sort((a, b) => {
                let comparison = 0;
                if (sortColumn === 'status') {
                    const aIndex = STATUS_ORDER.indexOf(a.approval_status);
                    const bIndex = STATUS_ORDER.indexOf(b.approval_status);
                    comparison = aIndex - bIndex;
                } else if (sortColumn === 'date') {
                    comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
                } else if (sortColumn === 'project_name') {
                    comparison = (a.project?.project_name || "").localeCompare(b.project?.project_name || "");
                } else if (sortColumn === 'amount') {
                    comparison = (a.amount || 0) - (b.amount || 0);
                }

                if (comparison === 0) {
                    return b.id.localeCompare(a.id);
                }
                return sortDirection === 'asc' ? comparison : -comparison;
            });
        }

        return current;
    }, [items, sortColumn, sortDirection, STATUS_ORDER]);

    if (isAuthLoading || isLoadingData) {
        return <GlobalLoading />;
    }

    return (
        <FinancePageWrapper
            breadcrumbItems={[{ label: "Flow", href: "/flow" }, { label: "Finance", href: "/flow/finance" }, { label: "Purchasing", href: "/flow/finance/purchasing" }]}
            header={
                <FinanceHeader
                    title="Purchasing"
                    subtitle={isTeamView ? "Manage all staff purchase requests." : "Track your material and tool requests."}
                />
            }
            rightToolbar={
                <>
                    {canAccessTeam && (
                        <button
                            onClick={() => setViewMode(viewMode === 'team' ? 'personal' : 'team')}
                            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-50 dark:hover:bg-neutral-800 active:scale-90 transition-all duration-200 pointer-events-auto relative"
                        >
                            {viewMode === 'team' ? (
                                <Users className="w-5 h-5 text-gray-700 dark:text-white" strokeWidth={1.5} />
                            ) : (
                                <User className="w-5 h-5 text-gray-700 dark:text-white" strokeWidth={1.5} />
                            )}
                        </button>
                    )}
                    <button
                        onClick={() => setShowFilters(true)}
                        className={clsx(
                            "w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-50 dark:hover:bg-neutral-800 active:scale-90 transition-all duration-200 pointer-events-auto relative",
                            (selectedProjects.length > 0 || categoryFilters.length > 0 || !showAllMonths) ? "text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-500/10" : "text-gray-700 dark:text-white"
                        )}
                    >
                        <ListFilter className="w-5 h-5" strokeWidth={1.5} />
                    </button>
                    <button
                        onClick={() => window.dispatchEvent(new CustomEvent('fab-action', { detail: { id: 'FINANCE_NEW_PURCHASE' } }))}
                        className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-50 dark:hover:bg-neutral-800 active:scale-90 transition-all duration-200 pointer-events-auto relative"
                    >
                        <Plus className="w-5 h-5 text-gray-700 dark:text-white" strokeWidth={1.5} />
                    </button>
                </>
            }
        >
            <div className="flex flex-col gap-6">
                {/* SUMMARY CARDS */}
                <div className="-mx-5 lg:mx-0">
                    <FinanceSummaryCardsRow>
                        <FinanceSummaryCard
                            icon={<Package className="w-4 h-4 text-red-600" />}
                            iconBg="bg-red-100"
                            label="Total Requests"
                            value={summaryStats.total.toString()}
                            subtext={formatCurrency(summaryStats.totalAmount)}
                            onClick={() => setStatusFilter("ALL")}
                            isActive={statusFilter === "ALL"}
                            activeColor="ring-red-500"
                        />

                        <FinanceSummaryCard
                            icon={<Clock className="w-4 h-4 text-orange-600" />}
                            iconBg="bg-orange-100"
                            label="Pending"
                            value={summaryStats.pending.toString()}
                            subtext={formatCurrency(summaryStats.pendingAmount)}
                            onClick={() => setStatusFilter("SUBMITTED")}
                            isActive={statusFilter === "SUBMITTED"}
                            activeColor="ring-orange-500"
                        />

                        <FinanceSummaryCard
                            icon={<CheckCircle2 className="w-4 h-4 text-blue-600" />}
                            iconBg="bg-blue-100"
                            label="Approved"
                            value={summaryStats.approved.toString()}
                            subtext={formatCurrency(summaryStats.approvedAmount)}
                            onClick={() => setStatusFilter("APPROVED")}
                            isActive={statusFilter === "APPROVED"}
                            activeColor="ring-blue-500"
                        />

                        <FinanceSummaryCard
                            icon={<CreditCard className="w-4 h-4 text-emerald-600" />}
                            iconBg="bg-emerald-100"
                            label="Paid"
                            value={summaryStats.paid.toString()}
                            subtext={formatCurrency(summaryStats.paidAmount)}
                            onClick={() => setStatusFilter("PAID")}
                            isActive={statusFilter === "PAID"}
                            activeColor="ring-emerald-500"
                        />
                    </FinanceSummaryCardsRow>
                </div>

                {/* MOBILE TOOLBAR (Search + Filters per user request) */}
                <div className="flex flex-col gap-2 md:hidden">
                    {/* Quick Filters Row */}
                    <div className="flex items-start gap-1.5 w-full">
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-hide flex-1">
                            {/* Mobile Date Summary */}
                            <div className="flex items-center gap-0.5 p-1 bg-white/80 dark:bg-neutral-800/80 backdrop-blur-sm rounded-full border border-white/60 dark:border-neutral-700 shadow-sm shrink-0">
                                <button
                                    onClick={() => handleMonthChange("prev")}
                                    className="p-1.5 text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                                >
                                    <ChevronLeft className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={() => setShowFilters(true)}
                                    className="text-[12px] font-bold text-neutral-700 dark:text-neutral-300 tracking-tight whitespace-nowrap px-3"
                                >
                                    {showAllMonths ? "All Time" : (
                                        format(startDate, "MMM-yy") === format(endDate, "MMM-yy") && startDate.getDate() === 1 && endDate.getDate() === new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0).getDate()
                                            ? format(startDate, "MMM-yy")
                                            : `${format(startDate, "d MMM")} - ${format(endDate, "d MMM")}`
                                    )}
                                </button>
                                <button
                                    onClick={() => handleMonthChange("next")}
                                    className="p-1.5 text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                                >
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            {/* Project Select */}
                            <div className="relative shrink-0 flex items-center h-9 bg-white/80 dark:bg-neutral-800/80 backdrop-blur-sm rounded-full border border-white/60 dark:border-neutral-700 shadow-sm overflow-hidden">
                                <select
                                    value={selectedProjects.length === 1 ? selectedProjects[0] : (selectedProjects.length > 1 ? "MULTIPLE" : "ALL")}
                                    onChange={(e) => {
                                        if (e.target.value === "ALL") setSelectedProjects([]);
                                        else if (e.target.value !== "MULTIPLE") setSelectedProjects([e.target.value]);
                                    }}
                                    className="h-full pl-3 pr-8 bg-transparent appearance-none text-[11px] font-bold text-neutral-700 dark:text-neutral-300 outline-none cursor-pointer tracking-tight whitespace-nowrap w-auto max-w-[130px] text-ellipsis overflow-hidden"
                                >
                                    <option value="ALL">All Projects</option>
                                    {selectedProjects.length > 1 && <option value="MULTIPLE" disabled>{selectedProjects.length} Projects</option>}
                                    {projects.map(p => (
                                        <option key={p.id} value={p.id}>{p.projectCode || p.projectName}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral-400 pointer-events-none" />
                            </div>

                            {/* Category Select */}
                            <div className="relative shrink-0 flex items-center h-9 bg-white/80 dark:bg-neutral-800/80 backdrop-blur-sm rounded-full border border-white/60 dark:border-neutral-700 shadow-sm overflow-hidden">
                                <select
                                    value={categoryFilters.length === 1 ? categoryFilters[0] : (categoryFilters.length > 1 ? "MULTIPLE" : "ALL")}
                                    onChange={(e) => {
                                        if (e.target.value === "ALL") setCategoryFilters([]);
                                        else if (e.target.value !== "MULTIPLE") setCategoryFilters([e.target.value]);
                                    }}
                                    className="h-full pl-3 pr-8 bg-transparent appearance-none text-[11px] font-bold text-neutral-700 dark:text-neutral-300 outline-none cursor-pointer tracking-tight whitespace-nowrap w-auto max-w-[130px] text-ellipsis overflow-hidden"
                                >
                                    <option value="ALL">All Categories</option>
                                    {categoryFilters.length > 1 && <option value="MULTIPLE" disabled>{categoryFilters.length} Categories</option>}
                                    {CATEGORY_OPTIONS.map(cat => (
                                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral-400 pointer-events-none" />
                            </div>
                        </div>

                        {/* Export Icon pinned to the right side outside overflow container */}
                        <div className="relative group/export h-9 shrink-0 flex items-start">
                            <button className="h-9 w-9 bg-white/80 dark:bg-neutral-800/80 backdrop-blur-sm rounded-full border border-white/60 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 shadow-sm flex items-center justify-center hover:bg-white dark:hover:bg-neutral-700 transition-colors">
                                <Download className="w-4 h-4" />
                            </button>
                            <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-xl rounded-xl opacity-0 invisible group-hover/export:opacity-100 group-hover/export:visible transition-all flex flex-col z-50 overflow-hidden py-1">
                                <button onClick={handleExport} className="w-full relative px-4 py-2.5 flex items-center gap-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-600 transition-colors group/item">
                                    <div className="absolute inset-y-0 left-0 w-1 bg-red-500 rounded-r-full hidden group-hover/item:block" />
                                    <FileText className="w-4 h-4 text-red-500" /> Export to PDF
                                </button>
                                <button onClick={handleExportExcel} className="w-full relative px-4 py-2.5 flex items-center gap-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 hover:text-emerald-600 transition-colors group/item">
                                    <div className="absolute inset-y-0 left-0 w-1 bg-emerald-500 rounded-r-full hidden group-hover/item:block" />
                                    <FileSpreadsheet className="w-4 h-4 text-emerald-500" /> Export to XLS
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ADVANCED TOOLBAR - DESKTOP  */}
                <div className="hidden md:flex flex-row gap-2 justify-between items-center p-2 rounded-2xl bg-white/40 backdrop-blur-sm border border-white/40">
                    {/* LEFT: Search, Month, Project */}
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <div className="h-10 flex items-center gap-2 px-3 bg-white rounded-xl border border-neutral-200 shadow-sm focus-within:ring-2 focus-within:ring-red-500/10 focus-within:border-red-500/50 transition-all w-full md:w-[200px]">
                            <Search className="w-4 h-4 text-neutral-400" />
                            <input
                                type="text"
                                placeholder="Search..."
                                className="bg-transparent border-none outline-none text-sm font-medium text-neutral-700 placeholder:text-neutral-400 w-full"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="h-10 flex items-center gap-1 p-1 bg-white rounded-xl border border-neutral-200 shadow-sm">
                            <button
                                onClick={() => handleMonthChange("prev")}
                                className="w-8 h-8 flex items-center justify-center hover:bg-neutral-100 rounded-lg text-neutral-400 hover:text-neutral-600 transition-all"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => handleMonthChange("next")}
                                className="w-8 h-8 flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-neutral-600 transition-all"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                            <div className="w-[1px] h-4 bg-neutral-200 dark:bg-neutral-700 mx-1" />
                            <div className="px-2 text-[11px] font-bold text-neutral-400 uppercase tracking-tight whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px]">
                                {showAllMonths ? "All Time" : (
                                    format(startDate, "MMM yyyy") === format(endDate, "MMM yyyy")
                                        ? format(startDate, "MMM yyyy")
                                        : `${format(startDate, "d MMM")} - ${format(endDate, "d MMM")}`
                                )}
                            </div>
                        </div>

                        <div className="relative group">
                            <select
                                value={selectedProjects.length === 1 ? selectedProjects[0] : (selectedProjects.length > 1 ? "MULTIPLE" : "ALL")}
                                onChange={(e) => {
                                    if (e.target.value === "ALL") setSelectedProjects([]);
                                    else if (e.target.value !== "MULTIPLE") setSelectedProjects([e.target.value]);
                                }}
                                className="appearance-none h-10 pl-3 pr-8 bg-white border border-neutral-200 rounded-xl text-sm font-medium text-neutral-700 focus:outline-none focus:ring-2 focus:ring-red-500/10 focus:border-red-500/50 transition-all cursor-pointer w-full md:w-auto"
                            >
                                <option value="ALL">All Projects</option>
                                {selectedProjects.length > 1 && <option value="MULTIPLE" disabled>{selectedProjects.length} Projects Selected</option>}
                                {projects.map(p => (
                                    <option key={p.id} value={p.id}>{p.projectCode} - {p.projectName}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none group-hover:text-neutral-600 transition-colors" />
                        </div>

                        <div className="relative group">
                            <select
                                value={categoryFilters.length === 1 ? categoryFilters[0] : (categoryFilters.length > 1 ? "MULTIPLE" : "ALL")}
                                onChange={(e) => {
                                    if (e.target.value === "ALL") setCategoryFilters([]);
                                    else if (e.target.value !== "MULTIPLE") setCategoryFilters([e.target.value]);
                                }}
                                className="appearance-none h-10 pl-3 pr-8 bg-white border border-neutral-200 rounded-xl text-sm font-medium text-neutral-700 focus:outline-none focus:ring-2 focus:ring-red-500/10 focus:border-red-500/50 transition-all cursor-pointer w-full md:w-auto"
                            >
                                <option value="ALL">All Categories</option>
                                {categoryFilters.length > 1 && <option value="MULTIPLE" disabled>{categoryFilters.length} Categories</option>}
                                {CATEGORY_OPTIONS.map(cat => (
                                    <option key={cat.value} value={cat.value}>
                                        {cat.label}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none group-hover:text-neutral-600 transition-colors" />
                        </div>
                    </div>

                    {/* RIGHT: Export, New */}
                    <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-shrink-0">
                        <div className="relative group/export h-10">
                            <button className="h-10 px-4 bg-white border border-neutral-200 rounded-xl flex items-center gap-2 text-sm font-medium text-neutral-700 hover:text-neutral-900 shadow-sm hover:border-neutral-300 transition-all">
                                <Download className="w-4 h-4" />
                                <span className="hidden lg:inline">Export</span>
                            </button>
                            <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-neutral-200 shadow-xl rounded-xl opacity-0 invisible group-hover/export:opacity-100 group-hover/export:visible transition-all flex flex-col z-50 overflow-hidden py-1">
                                <button onClick={handleExport} className="flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-50 text-left text-sm font-semibold text-neutral-700 transition-colors">
                                    <FileText className="w-4 h-4 text-red-500" /> Export to PDF
                                </button>
                                <button onClick={handleExportExcel} className="flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-50 text-left text-sm font-semibold text-neutral-700 transition-colors">
                                    <FileSpreadsheet className="w-4 h-4 text-emerald-500" /> Export to XLS
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                setEditingItem(null);
                                setIsDrawerOpen(true);
                            }}
                            className="h-10 px-5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-red-200 active:scale-95 transition-all flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            <span>New</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* MOBILE CARD VIEW */}
            <div className="mt-6 block md:hidden space-y-3">
                {filteredItems.length === 0 ? (
                    <div className="bg-white/40 dark:bg-neutral-900/60 backdrop-blur-md rounded-[24px] border border-white/50 dark:border-neutral-800 shadow-sm dark:shadow-none p-6 text-center">
                        <Package className="w-10 h-10 text-neutral-300 dark:text-neutral-600 mx-auto mb-2" />
                        <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                            {searchTerm ? "No results found" :
                                statusFilter !== "ALL" ? `No ${statusFilter.toLowerCase()} requests` :
                                    "No items found"}
                        </h4>
                        {/* Only show New Request button for current or future months */}
                        {!searchTerm && statusFilter === "ALL" && (
                            <button
                                onClick={() => setIsDrawerOpen(true)}
                                className="mt-4 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-xl shadow-lg shadow-red-200/50 dark:shadow-red-900/30"
                            >
                                <Plus className="w-4 h-4 inline mr-1.5" strokeWidth={2.5} />New Request
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
                                                        className="flex-1 py-2.5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all disabled:opacity-50 shadow-md shadow-blue-200/50"
                                                    >
                                                        <CreditCard className="w-[18px] h-[18px]" /> {(!item.invoice_url || !item.beneficiary_bank || !item.beneficiary_number) ? "Missing Data" : "Pay Now"}
                                                    </button>
                                                </>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <button onClick={(e) => { e.stopPropagation(); setDeletingItem(item); }} className="p-2.5 rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-500 border border-rose-100 dark:border-rose-500/20 flex-shrink-0 active:scale-95 transition-all">
                                                <Trash2 className="w-[18px] h-[18px]" />
                                            </button>
                                            {(isDraftOrRevise || (isSubmitted && isAdmin)) && (
                                                <button onClick={(e) => { e.stopPropagation(); setEditingItem(item); setIsDrawerOpen(true); }} className="flex-1 py-2.5 rounded-full bg-neutral-900 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-md shadow-neutral-400/50">
                                                    <Pencil className="w-[18px] h-[18px]" /> Edit
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
                                idRef={formatStructuredId('PO', item.project?.project_number || item.project_number, item.request_number, item.project?.project_code || item.project_code)}
                                title={formatItemTitle(item.items || [], item.description)}
                                projectCode={item.project?.project_code || item.project_code || 'GEN'}
                                date={formatCardDate(item.date)}
                                priority={item.priority}
                                amount={item.amount}
                                status={statusToUse}
                                onClick={() => setViewingItem(item)}
                                actions={statusToUse !== 'Paid' ? renderMobileActions() : undefined}
                            />
                        )
                    })
                )}
            </div>

            {/* DESKTOP/TABLET TABLE VIEW */}
            <div className="mt-6 hidden md:block bg-white/40 backdrop-blur-md rounded-3xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.02)] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-neutral-100 bg-neutral-50/50 backdrop-blur-sm">
                                <th
                                    className="px-6 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest cursor-pointer hover:text-neutral-600 transition-colors"
                                    onClick={() => handleSort('date')}
                                >
                                    <div className="flex items-center gap-1 group/header">
                                        Date
                                        {sortConfig?.key === 'date' ? (
                                            sortConfig.direction === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-red-500" /> : <ChevronDown className="w-3.5 h-3.5 text-red-500" />
                                        ) : <ChevronDown className="w-3.5 h-3.5 opacity-0 group-hover/header:opacity-30 transition-opacity" />}
                                    </div>
                                </th>
                                <th
                                    className="px-6 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest cursor-pointer hover:text-neutral-600 transition-colors"
                                    onClick={() => handleSort('project_name')}
                                >
                                    <div className="flex items-center gap-1 group/header">
                                        Project
                                        {sortConfig?.key === 'project_name' ? (
                                            sortConfig.direction === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-red-500" /> : <ChevronDown className="w-3.5 h-3.5 text-red-500" />
                                        ) : <ChevronDown className="w-3.5 h-3.5 opacity-0 group-hover/header:opacity-30 transition-opacity" />}
                                    </div>
                                </th>
                                <th
                                    className="px-6 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest cursor-pointer hover:text-neutral-600 transition-colors"
                                    onClick={() => handleSort('description')}
                                >
                                    <div className="flex items-center gap-1 group/header">
                                        Description
                                        {sortConfig?.key === 'description' ? (
                                            sortConfig.direction === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-red-500" /> : <ChevronDown className="w-3.5 h-3.5 text-red-500" />
                                        ) : <ChevronDown className="w-3.5 h-3.5 opacity-0 group-hover/header:opacity-30 transition-opacity" />}
                                    </div>
                                </th>
                                <th
                                    className="px-6 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest cursor-pointer hover:text-neutral-600 transition-colors"
                                    onClick={() => handleSort('type')}
                                >
                                    <div className="flex items-center gap-1 group/header">
                                        Category
                                        {sortConfig?.key === 'type' ? (
                                            sortConfig.direction === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-red-500" /> : <ChevronDown className="w-3.5 h-3.5 text-red-500" />
                                        ) : <ChevronDown className="w-3.5 h-3.5 opacity-0 group-hover/header:opacity-30 transition-opacity" />}
                                    </div>
                                </th>
                                <th
                                    className="px-6 py-4 text-right text-[10px] font-bold text-neutral-400 uppercase tracking-widest cursor-pointer hover:text-neutral-600 transition-colors"
                                    onClick={() => handleSort('amount')}
                                >
                                    <div className="flex items-center justify-end gap-1 group/header">
                                        Amount
                                        {sortConfig?.key === 'amount' ? (
                                            sortConfig.direction === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-red-500" /> : <ChevronDown className="w-3.5 h-3.5 text-red-500" />
                                        ) : <ChevronDown className="w-3.5 h-3.5 opacity-0 group-hover/header:opacity-30 transition-opacity" />}
                                    </div>
                                </th>
                                <th className="px-6 py-4 text-center text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Status</th>
                                {isTeamView && (
                                    <th
                                        className="px-6 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest cursor-pointer hover:text-neutral-600 transition-colors"
                                        onClick={() => handleSort('submitted_by_name')}
                                    >
                                        <div className="flex items-center gap-1 group/header">
                                            Submitter
                                            {sortConfig?.key === 'submitted_by_name' ? (
                                                sortConfig.direction === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-red-500" /> : <ChevronDown className="w-3.5 h-3.5 text-red-500" />
                                            ) : <ChevronDown className="w-3.5 h-3.5 opacity-0 group-hover/header:opacity-30 transition-opacity" />}
                                        </div>
                                    </th>
                                )}
                                <th className="px-6 py-4 text-right text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-50">
                            {filteredItems.length === 0 ? (
                                <tr>
                                    <td colSpan={isTeamView ? 8 : 7} className="py-16 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center">
                                                <Package className="w-8 h-8 text-neutral-300" />
                                            </div>
                                            <div className="space-y-1">
                                                <h4 className="text-base font-semibold text-neutral-700">
                                                    {searchTerm ? "No results found" :
                                                        statusFilter !== "ALL" ? `No ${statusFilter.toLowerCase()} requests` :
                                                            "No purchase requests yet"}
                                                </h4>
                                                <p className="text-sm text-neutral-400 max-w-xs mx-auto">
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
                                                    className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-xl shadow-lg shadow-red-200/50 transition-all flex items-center gap-2"
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
                                            className="group hover:bg-white/60 hover:shadow-[0_8px_32px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
                                            onClick={() => {
                                                // Both views now open ViewModal (read-only for Personal)
                                                setViewingItem(item);
                                            }}
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-[12px] font-normal text-neutral-500 tabular-nums">
                                                    {format(new Date(item.date), "dd MMM yyyy")}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[10px] font-bold text-neutral-400 bg-neutral-100/60 backdrop-blur-sm px-1 py-0.5 rounded border border-neutral-200/30 tracking-tight w-fit">
                                                        {item.project_code}
                                                    </span>
                                                    <span className="text-[12px] font-medium text-neutral-900 truncate max-w-[150px]">{cleanEntityName(item.project_name)}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-[12px] font-semibold text-neutral-900 tracking-tight leading-tight mb-0.5">
                                                    {item.items && item.items.length > 1
                                                        ? `${item.items[0].name} + ${item.items.length - 1} more`
                                                        : (item.items?.[0]?.name || item.description)}
                                                </div>
                                                <div className="text-[10px] font-normal text-neutral-400 flex items-center gap-1.5">
                                                    <span className="text-neutral-500 font-medium">
                                                        {item.items && item.items.length > 0
                                                            ? `${item.items.length} items`
                                                            : (item.quantity ? `${item.quantity} ${item.unit}` : '')}
                                                    </span>
                                                    <span className="text-neutral-300">•</span>
                                                    <div className="flex items-center gap-1.5 overflow-hidden">
                                                        <span className="hover:text-neutral-600 transition-colors tracking-tight text-[10px] truncate">{cleanEntityName(item.vendor)}</span>
                                                        {item.approval_status === "APPROVED" && !item.invoice_url && (
                                                            <span className="text-[9px] font-bold text-red-600 bg-red-50 px-1 rounded border border-red-100 flex-shrink-0 uppercase">NEED INVOICE</span>
                                                        )}
                                                        {item.approval_status === "APPROVED" && (!item.beneficiary_bank || !item.beneficiary_number) && (
                                                            <span className="text-[9px] font-bold text-orange-600 bg-orange-50 px-1 rounded border border-orange-100 flex-shrink-0 uppercase">NEED BENEFICIARY</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-0.5 group/type">
                                                    <span className="inline-flex items-center gap-1 text-[12px] font-medium text-neutral-900 w-fit tracking-tight group-hover/type:text-neutral-600 transition-colors">
                                                        {formatStatus(item.type)}
                                                    </span>
                                                    <span className="text-[12px] font-bold text-neutral-900 group-hover/type:text-blue-600 transition-colors capitalize">
                                                        {item.subcategory?.toLowerCase().replace(/_/g, " ")}
                                                    </span>
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
                                                        <span className="text-[8px] font-bold text-emerald-600 uppercase tracking-tight">Goods Pending</span>
                                                    )}
                                                </div>
                                            </td>
                                            {isTeamView && (
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <div className="text-[12px] font-medium text-neutral-900 tabular-nums">
                                                            {cleanEntityName(item.submitted_by_name || "N/A")}
                                                        </div>
                                                        <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-tighter">
                                                            {item.created_by_role}
                                                        </div>
                                                    </div>
                                                </td>
                                            )}
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                                    {isTeamView ? (
                                                        <>
                                                            {item.approval_status === "SUBMITTED" && (
                                                                <>
                                                                    <button onClick={(e) => { e.stopPropagation(); setApprovingItem(item); }} className="p-1.5 text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-all" title="Approve">
                                                                        <CheckCircle2 className="w-4 h-4" strokeWidth={1.5} />
                                                                    </button>
                                                                    <button onClick={(e) => { e.stopPropagation(); setRevisingItem(item); }} className="p-1.5 text-neutral-400 hover:text-orange-600 hover:bg-orange-50 rounded-full transition-all" title="Request Revision">
                                                                        <AlertCircle className="w-4 h-4" strokeWidth={1.5} />
                                                                    </button>
                                                                    <button onClick={(e) => { e.stopPropagation(); setRejectingItem(item); }} className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-all" title="Reject">
                                                                        <Ban className="w-4 h-4" strokeWidth={1.5} />
                                                                    </button>
                                                                </>
                                                            )}
                                                            {(item.approval_status === "DRAFT" || item.approval_status === "NEED_REVISION") && (
                                                                <button onClick={(e) => { e.stopPropagation(); setEditingItem(item); setIsDrawerOpen(true); }} className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-full transition-all" title="Edit Request">
                                                                    <Pencil className="w-4 h-4" strokeWidth={1.5} />
                                                                </button>
                                                            )}
                                                            {item.approval_status === "APPROVED" && item.financial_status !== "PAID" && (
                                                                <>
                                                                    <button onClick={(e) => { e.stopPropagation(); setEditingItem(item); setIsDrawerOpen(true); }} className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-full transition-all" title="Add Missing Details">
                                                                        <Pencil className="w-4 h-4" strokeWidth={1.5} />
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); setPayingItem(item); }}
                                                                        disabled={!item.invoice_url || !item.beneficiary_bank || !item.beneficiary_number}
                                                                        className={clsx(
                                                                            "p-1.5 rounded-full transition-all",
                                                                            (!item.invoice_url || !item.beneficiary_bank || !item.beneficiary_number)
                                                                                ? "text-neutral-200 cursor-not-allowed"
                                                                                : "text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50"
                                                                        )}
                                                                        title={(!item.invoice_url || !item.beneficiary_bank || !item.beneficiary_number) ? "Invoice & Beneficiary required" : "Mark as Paid"}
                                                                    >
                                                                        <CreditCard className="w-4 h-4" strokeWidth={1.5} />
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
                                                                    className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
                                                                    title="Delete Request"
                                                                >
                                                                    <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                                                                </button>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <>
                                                            {(["DRAFT", "SUBMITTED", "NEED_REVISION", "REJECTED"].includes(item.approval_status) || ["admin", "superadmin", "supervisor"].includes(userRole || "")) && (
                                                                <>
                                                                    {(["DRAFT", "SUBMITTED", "NEED_REVISION"].includes(item.approval_status) || ["admin", "superadmin", "supervisor"].includes(userRole || "")) && (
                                                                        <button onClick={(e) => { e.stopPropagation(); setEditingItem(item); setIsDrawerOpen(true); }} className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-full transition-all" title="Edit Request">
                                                                            <Pencil className="w-4 h-4" strokeWidth={1.5} />
                                                                        </button>
                                                                    )}
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setDeletingItem(item);
                                                                        }}
                                                                        className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
                                                                        title="Delete Request"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                                                                    </button>
                                                                </>
                                                            )}
                                                        </>
                                                    )}
                                                    <div className="w-px h-4 bg-neutral-200 mx-1" />
                                                    <button onClick={(e) => { e.stopPropagation(); setViewingItem(item); }} className="p-1.5 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all" title="View Details">
                                                        <Eye className="w-4 h-4" strokeWidth={1.5} />
                                                    </button>
                                                    {item.invoice_url && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setPreviewingDocument({ item, initialTab: 'invoice' }); }}
                                                            className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
                                                            title="View Invoice"
                                                        >
                                                            <Download className="w-4 h-4" strokeWidth={1.5} />
                                                        </button>
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
                        onClose={() => setViewingItem(null)}
                        onPreview={(tab) => viewingItem && setPreviewingDocument({ item: viewingItem, initialTab: tab })}
                    />
                )
            }

            {/* Invoice Preview Modal */}
            {
                previewingDocument && (
                    <InvoicePreviewModal
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
                        onClose={() => setApprovingItem(null)}
                        onApprove={async (amount) => {
                            try {
                                const requestId = approvingItem.request_id || approvingItem.id;
                                const success = await updatePurchasingStatus(requestId, {
                                    approval_status: "APPROVED",
                                    approved_amount: amount // Use approved_amount instead of amount
                                });
                                if (success) {
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
                {confirmModal.open && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
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

            {/* Filter Bottom Sheet / Modal */}
            {
                showFilters && (
                    <div className="fixed md:hidden inset-0 z-[100] flex items-end justify-center">
                        <div
                            className="absolute inset-0 bg-black/5 backdrop-blur-[2px] transition-opacity"
                            onClick={() => setShowFilters(false)}
                        />
                        <div className="relative w-full mx-2 mb-2 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-2xl backdrop-saturate-[1.8] rounded-[40px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-500 border border-white/40 dark:border-neutral-800 p-6 flex flex-col gap-6 max-h-[90dvh]">
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
                                            className="text-[13px] font-bold text-red-500 hover:text-red-600 active:scale-95 transition-all outline-none tracking-wider"
                                        >
                                            Reset
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setShowFilters(false)}
                                        className="w-8 h-8 bg-neutral-100 dark:bg-neutral-800 border border-black/5 dark:border-white/5 rounded-full flex items-center justify-center active:scale-95 transition-transform"
                                    >
                                        <X size={18} className="text-neutral-500" strokeWidth={2} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-col gap-6 overflow-y-auto pb-4 pr-1 scrollbar-hide">
                                {/* Sorting Section */}
                                <div className="space-y-4 px-2">
                                    <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">Sort By</h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            { id: 'date', label: 'Date' },
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
                                                        ? "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 border-red-200 dark:border-red-900/50"
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
                                                        className="p-1 hover:bg-white/20 rounded-lg transition-colors cursor-pointer outline-none"
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
                                        <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">Project</h4>
                                        {selectedProjects.length > 0 && (
                                            <button onClick={() => setSelectedProjects([])} className="text-[10px] font-bold text-red-500 tracking-wider">Clear</button>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-2 px-2">
                                        <button
                                            onClick={() => setSelectedProjects([])}
                                            className={clsx(
                                                "px-4 py-2 rounded-full text-[12px] font-bold transition-all border",
                                                selectedProjects.length === 0
                                                    ? "bg-neutral-800 dark:bg-neutral-200 text-white dark:text-black border-neutral-800 dark:border-neutral-200 shadow-md"
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
                                                            ? "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/30 shadow-sm"
                                                            : "bg-neutral-50 dark:bg-neutral-800/50 text-neutral-600 dark:text-neutral-400 border-neutral-100 dark:border-neutral-800 hover:bg-neutral-100"
                                                    )}
                                                >
                                                    {p.projectCode}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Category Filter */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between px-2">
                                        <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">Category</h4>
                                        {categoryFilters.length > 0 && (
                                            <button onClick={() => setCategoryFilters([])} className="text-[10px] font-bold text-red-500 tracking-wider">Clear</button>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-2 px-2">
                                        <button
                                            onClick={() => setCategoryFilters([])}
                                            className={clsx(
                                                "px-4 py-2 rounded-full text-[12px] font-bold transition-all border",
                                                categoryFilters.length === 0
                                                    ? "bg-neutral-800 dark:bg-neutral-200 text-white dark:text-black border-neutral-800 dark:border-neutral-200 shadow-md"
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
                                                            ? "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/30 shadow-sm"
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
                                <div className="space-y-4 px-2">
                                    <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">Date Range</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider px-1">From</span>
                                            <input
                                                type="date"
                                                value={format(startDate, "yyyy-MM-dd")}
                                                onChange={(e) => {
                                                    setShowAllMonths(false);
                                                    setStartDate(new Date(e.target.value));
                                                }}
                                                className="w-full bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-full border border-neutral-100 dark:border-neutral-800 text-[13px] font-bold text-neutral-700 dark:text-neutral-200 outline-none focus:ring-2 focus:ring-red-500/10"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider px-1">To</span>
                                            <input
                                                type="date"
                                                value={format(endDate, "yyyy-MM-dd")}
                                                onChange={(e) => {
                                                    setShowAllMonths(false);
                                                    setEndDate(new Date(e.target.value));
                                                }}
                                                className="w-full bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-full border border-neutral-100 dark:border-neutral-800 text-[13px] font-bold text-neutral-700 dark:text-neutral-200 outline-none focus:ring-2 focus:ring-red-500/10"
                                            />
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowAllMonths(!showAllMonths)}
                                        className={clsx(
                                            "w-full py-3.5 rounded-2xl text-[12px] font-bold transition-all border",
                                            showAllMonths
                                                ? "bg-red-600 text-white border-red-500 shadow-md shadow-red-500/20"
                                                : "bg-neutral-50 dark:bg-neutral-800/50 text-neutral-600 dark:text-neutral-400 border-neutral-100 dark:border-neutral-800"
                                        )}
                                    >
                                        {showAllMonths ? "Showing All Time" : "Switch to All Time"}
                                    </button>
                                </div>
                            </div>

                            {/* Footer Action */}
                            <div className="pt-2">
                                <button
                                    onClick={() => setShowFilters(false)}
                                    className="w-full bg-red-600 text-white py-4 rounded-full font-bold text-[16px] active:scale-[0.98] transition-all shadow-xl shadow-red-600/30 border border-red-500 ring-1 ring-inset ring-white/10"
                                >
                                    Apply Filters
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

        </FinancePageWrapper >
    );
}
