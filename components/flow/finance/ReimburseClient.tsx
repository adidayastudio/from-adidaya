"use client";

import { useState, useMemo, useEffect, useRef, Fragment } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import FinanceHeader from "@/components/flow/finance/FinanceHeader";
import FinancePageWrapper from "@/components/flow/finance/FinancePageWrapper";
import { useFinance } from "./FinanceContext";
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
    ArrowLeft
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
import { fetchReimburseRequests, updateReimburseStatus, deleteReimburseRequest, fetchFundingSources } from "@/lib/client/finance-api";
import { fetchAllProjects } from "@/lib/api/projects";
import { fetchTeamMembers } from "@/lib/api/clock_team";
import { fetchDefaultWorkspaceId } from "@/lib/api/templates";
import { NewRequestDrawer } from "./modules/NewRequestDrawer";
import { uploadFinanceFileExact, getFinanceFileUrl } from "@/lib/api/storage";
import { GlobalLoading } from "@/components/shared/GlobalLoading";

// -- MODALS --
// (kept as is)

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

function RejectModal({ item, onClose, onReject }: { item: any, onClose: () => void, onReject: (reason: string) => void }) {
    const [reason, setReason] = useState("");
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm" onClick={onClose} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative w-full max-w-sm bg-white/50 dark:bg-neutral-900/50 backdrop-blur-2xl border border-white/60 dark:border-neutral-800 rounded-3xl p-6 shadow-2xl overflow-hidden">
                <h3 className="text-lg font-bold text-neutral-900 mb-2">Reject Request</h3>
                <p className="text-sm text-neutral-500 mb-6">Please provide a reason for rejecting this request.</p>
                <textarea
                    autoFocus
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Reason..."
                    className="w-full h-32 p-4 text-sm border border-neutral-200 rounded-xl bg-neutral-50 mb-6 focus:outline-none focus:ring-2 focus:ring-red-500/20"
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
        <div className="flex items-center justify-between px-6 py-4 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm border-t border-neutral-100 dark:border-neutral-800">
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

function ReviseModal({ item, onClose, onRevise }: { item: any, onClose: () => void, onRevise: (reason: string) => void }) {
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
                                            <span className="text-[10px] font-bold text-red-500/80">Required</span>
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
                <p className="text-sm text-neutral-500 mb-6">Confirm the approved amount for this reimbursement.</p>

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
                    <label className="block text-xs font-bold text-neutral-500 mb-1.5">Approved Amount</label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 font-bold">Rp</span>
                        <input
                            type="number"
                            autoFocus
                            value={amountStr}
                            onChange={(e) => setAmountStr(e.target.value)}
                            className="w-full h-12 pl-10 pr-4 text-lg border border-neutral-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-bold text-neutral-900"
                        />
                    </div>
                    {parseFloat(amountStr) !== item.amount && (
                        <div className="mt-2 text-xs text-orange-600 font-medium">
                            * Different from requested: {formatCurrency(item.amount)}
                        </div>
                    )}
                </div>

                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-2.5 text-sm font-bold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-all">Cancel</button>
                    <button
                        onClick={() => onApprove(parseFloat(amountStr) || 0)}
                        className="flex-1 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all disabled:opacity-50"
                    >
                        Approve
                    </button>
                </div>
            </motion.div>
        </div>
    )
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------
function StatusBadge({ status }: { status: any }) {
    const theme = STATUS_THEMES[status as keyof typeof STATUS_THEMES] || STATUS_THEMES.DRAFT;
    return (
        <span className={clsx("inline-flex w-fit px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase", theme.bg, theme.text, theme.border)}>
            {formatStatus(status)}
        </span>
    );
}

// -- NESTED DRAWER: Document View --
function DocumentDrawer({
    item,
    initialTab = 'invoice',
    onClose
}: {
    item: any,
    initialTab?: 'invoice' | 'proof',
    onClose: () => void
}) {
    const [activeTab, setActiveTab] = useState<'invoice' | 'proof'>(initialTab);
    const [signedUrls, setSignedUrls] = useState<{ url: string; name: string; originalPath: string }[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false);

    // Build list of all relevant files for the active tab
    const files = useMemo(() => {
        const list: { url: string; name: string; originalPath: string }[] = [];

        if (activeTab === 'invoice') {
            if (item.invoice_url) {
                list.push({
                    url: '', // Will be signed
                    name: 'Receipt',
                    originalPath: item.invoice_url
                });
            }
        } else {
            if (item.payment_proof_url) {
                list.push({
                    url: '', // Will be signed
                    name: 'Payment Proof',
                    originalPath: item.payment_proof_url
                });
            }
        }
        return list;
    }, [activeTab, item]);

    useEffect(() => {
        let active = true;
        const fetchUrls = async () => {
            setIsLoading(true);
            const signed = await Promise.all(
                files.map(async (file) => {
                    const url = await getFinanceFileUrl(file.originalPath);
                    return { ...file, url: url || '' };
                })
            );
            if (active) {
                setSignedUrls(signed);
                setIsLoading(false);
            }
        };
        fetchUrls();
        return () => { active = false; };
    }, [files]);

    const handleDownload = async (fileUrl: string, fileName: string) => {
        try {
            const response = await fetch(fileUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (e) {
            window.open(fileUrl, '_blank');
        }
    };

    const handleBulkDownload = async () => {
        setIsDownloading(true);
        for (const file of signedUrls) {
            const dateStr = format(new Date(), "yyyyMMdd");
            const projectCode = cleanEntityName(item.project?.project_code || "REF");
            const ext = file.url.split('?')[0].split('.').pop() || 'jpg';
            const name = `${activeTab === 'invoice' ? 'Receipt' : 'Proof'}_${projectCode}_${dateStr}_${cleanEntityName(file.name)}.${ext}`;
            await handleDownload(file.url, name);
        }
        setIsDownloading(false);
    };

    return (
        <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute inset-0 z-[60] bg-white dark:bg-neutral-900 flex flex-col"
        >
            {/* Header */}
            <div className="flex-none px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-white/10 dark:bg-neutral-900/10 backdrop-blur-xl sticky top-0 z-20">
                <button
                    onClick={onClose}
                    className="flex items-center gap-2 py-2 px-3 -ml-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-2xl transition-colors group"
                >
                    <ArrowLeft size={18} className="text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors" />
                    <span className="text-sm font-bold text-neutral-500 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors">Back to Details</span>
                </button>

                <div className="flex p-1 bg-neutral-100 dark:bg-neutral-800 rounded-full shrink-0">
                    <button
                        onClick={() => setActiveTab('invoice')}
                        className={clsx(
                            "px-4 py-1.5 text-[10px] font-bold rounded-full transition-all whitespace-nowrap",
                            activeTab === 'invoice' ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm" : "text-neutral-400"
                        )}
                    >
                        Receipt
                    </button>
                    <button
                        onClick={() => setActiveTab('proof')}
                        className={clsx(
                            "px-4 py-1.5 text-[10px] font-bold rounded-full transition-all whitespace-nowrap",
                            activeTab === 'proof' ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm" : "text-neutral-400"
                        )}
                    >
                        Proof
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide bg-transparent">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-red-500" />
                        <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Loading Documents</span>
                    </div>
                ) : signedUrls.length > 0 ? (
                    signedUrls.map((file, idx) => (
                        <div key={idx} className="space-y-3">
                            <div className="flex items-center justify-between px-1">
                                <span className="text-xs font-bold text-neutral-400">{file.name}</span>
                                <button
                                    onClick={() => handleDownload(file.url, file.name)}
                                    className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors group"
                                >
                                    <Download size={14} className="text-neutral-400 group-hover:text-red-500" />
                                </button>
                            </div>
                            <div className="rounded-[2.5rem] border border-neutral-100 dark:border-neutral-800 overflow-hidden bg-neutral-50 dark:bg-neutral-900 shadow-sm transition-transform hover:scale-[1.01] duration-500">
                                {file.url.match(/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i) ? (
                                    <img src={file.url} alt={file.name} className="w-full object-contain" />
                                ) : (
                                    <div className="aspect-[3/4] flex flex-col items-center justify-center gap-4 bg-white/50 dark:bg-neutral-800/50 backdrop-blur-sm">
                                        <div className="w-20 h-20 rounded-3xl bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center text-neutral-300 dark:text-neutral-700">
                                            <FileText size={40} />
                                        </div>
                                        <div className="text-center">
                                            <div className="text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-1">PDF Document</div>
                                            <div className="text-[10px] font-medium text-neutral-400 uppercase tracking-widest break-all px-6">{file.originalPath.split('/').pop()}</div>
                                        </div>
                                        <button
                                            onClick={() => handleDownload(file.url, file.name)}
                                            className="mt-2 px-6 py-3 bg-neutral-900 dark:bg-neutral-700 text-white rounded-full text-xs font-bold hover:scale-105 transition-transform shadow-xl"
                                        >
                                            View Full PDF
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-neutral-300">
                        <div className="w-20 h-20 rounded-full border-2 border-dashed border-neutral-100 dark:border-neutral-800 flex items-center justify-center mb-4">
                            <FileText size={32} />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-widest">No Documents Found</span>
                    </div>
                )}
            </div>

            {/* Footer */}
            {signedUrls.length > 0 && (
                <div className="flex-none p-6 border-t border-neutral-100 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md">
                    <button
                        onClick={handleBulkDownload}
                        disabled={isDownloading}
                        className="w-full py-4 bg-red-600 hover:bg-red-700 disabled:bg-neutral-300 text-white rounded-full font-bold text-sm shadow-xl shadow-red-100 dark:shadow-none transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                    >
                        {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download size={18} />}
                        {signedUrls.length > 1 ? `Download All Files (${signedUrls.length})` : 'Download File'}
                    </button>
                </div>
            )}
        </motion.div>
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
    onApprove,
    onReject,
    onRevise,
    onPay,
    onDelete,
    isTeamView,
    userRole
}: {
    item: any;
    onClose: () => void;
    onPreview: (tab: 'invoice' | 'proof') => void;
    onEdit?: () => void;
    onApprove?: () => void;
    onReject?: () => void;
    onRevise?: () => void;
    onPay?: () => void;
    onDelete?: () => void;
    isTeamView?: boolean;
    userRole?: string | null;
}) {
    const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
    const [proofUrl, setProofUrl] = useState<string | null>(null);
    const [showDocDrawer, setShowDocDrawer] = useState(false);
    const [docDrawerType, setDocDrawerType] = useState<'invoice' | 'proof'>('invoice');
    const [isExporting, setIsExporting] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);

    const handleExport = async (format: "jpg" | "pdf") => {
        if (!contentRef.current) return;
        setIsExporting(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 500));
            const element = contentRef.current;
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                backgroundColor: "#ffffff",
                windowWidth: element.scrollWidth,
                windowHeight: element.scrollHeight,
                onclone: (clonedDoc) => {
                    const clonedElement = clonedDoc.getElementById("export-content");
                    if (clonedElement) {
                        clonedElement.style.height = "auto";
                        clonedElement.style.overflow = "visible";
                    }
                }
            });

            const fileName = `Reimburse_${item.project?.project_code || "Request"}_${item.id.slice(0, 8)}.` + format;

            if (format === "jpg") {
                const link = document.createElement("a");
                link.download = fileName;
                link.href = canvas.toDataURL("image/jpeg", 0.9);
                link.click();
            } else {
                const imgData = canvas.toDataURL("image/png");
                const pdf = new jsPDF({
                    orientation: "portrait",
                    unit: "px",
                    format: [canvas.width, canvas.height]
                });
                pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
                pdf.save(fileName);
            }
        } catch (error) {
            console.error("Export failed:", error);
        } finally {
            setIsExporting(false);
        }
    };

    useEffect(() => {
        const fetchUrls = async () => {
            if (item.invoice_url) {
                const url = await getFinanceFileUrl(item.invoice_url);
                setInvoiceUrl(url);
            }
            if (item.payment_proof_url) {
                const url = await getFinanceFileUrl(item.payment_proof_url);
                setProofUrl(url);
            }
        };
        fetchUrls();
    }, [item.invoice_url, item.payment_proof_url]);

    useEffect(() => {
        if (!item.invoice_url && item.payment_proof_url) setDocDrawerType('proof');
    }, [item.invoice_url, item.payment_proof_url]);

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
                className={clsx(
                    "absolute z-50 bg-white/30 dark:bg-neutral-900/40 backdrop-blur-[24px] backdrop-saturate-[180%] border border-white/60 dark:border-neutral-800 shadow-2xl transition-all duration-300 rounded-[56px] overflow-hidden flex flex-col",
                    "bottom-2 left-2 right-2 top-20 sm:top-6 sm:bottom-6 sm:right-6 sm:left-auto sm:w-[500px]"
                )}
            >
                {/* Sticky Header */}
                <div className="flex-none px-8 pt-8 pb-4 sticky top-0 z-20 bg-transparent">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-[22px] font-bold text-neutral-900 dark:text-white tracking-tight">
                            {formatStructuredId("RE", item.project?.project_number || item.project_number, item.request_number, item.project?.project_code || item.project_code) || `RE-${item.id.slice(0, 8)}`}
                        </h2>
                        <div className="flex items-center gap-2">
                            {/* Export Actions */}
                            <div className="flex items-center bg-white/50 dark:bg-neutral-800/50 backdrop-blur-xl border border-black/5 dark:border-white/10 rounded-full h-10 px-1">
                                <button
                                    onClick={() => handleExport("jpg")}
                                    disabled={isExporting}
                                    className="px-3 h-8 rounded-full flex items-center gap-1.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-neutral-600 dark:text-neutral-400 disabled:opacity-50"
                                >
                                    <ImageIcon size={14} />
                                    <span className="text-[11px] font-bold tracking-wider">JPG</span>
                                </button>
                                <div className="w-[1px] h-4 bg-black/5 dark:bg-white/10" />
                                <button
                                    onClick={() => handleExport("pdf")}
                                    disabled={isExporting}
                                    className="px-3 h-8 rounded-full flex items-center gap-1.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-neutral-600 dark:text-neutral-400 disabled:opacity-50"
                                >
                                    <FileText size={14} />
                                    <span className="text-[11px] font-bold tracking-wider">PDF</span>
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
                                    <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-4">Progress</div>
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
                                                date: "Anytime",
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
                                                    const isDeadlineActive = false; // Reimbursements rarely have hard deadlines in this UI

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
                                                                ) : (
                                                                    <div className="w-2.5 h-2.5 rounded-full border-2 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800" />
                                                                )}
                                                            </div>
                                                            {/* Label + Date */}
                                                            <div className={clsx(
                                                                "text-[10px] font-bold tracking-tight text-center mt-1 whitespace-nowrap px-1",
                                                                isCurrent || (isDeadlineStep && isDeadlineActive) ? step.accentColor : "text-neutral-300 dark:text-neutral-600"
                                                            )}>
                                                                {step.label}
                                                            </div>
                                                            <div className={clsx(
                                                                "text-[9px] font-medium text-center whitespace-nowrap tracking-tighter mt-0.5",
                                                                (isCompleted || isCurrent) ? "text-neutral-400 dark:text-neutral-500" : "text-neutral-200 dark:text-neutral-700"
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

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="text-[11px] font-bold text-neutral-500 mb-1">Submitter</div>
                                        <div className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                                            <div className="w-5 h-5 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-[10px] text-neutral-500">
                                                {item.staff_name?.[0]}
                                            </div>
                                            {item.staff_name || "Unknown"}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-[11px] font-bold text-neutral-500 mb-1">Project</div>
                                        <div className="text-sm font-bold text-neutral-900 dark:text-white flex items-center flex-wrap gap-1.5 leading-tight">
                                            {item.project ? (
                                                <>
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 shrink-0">
                                                        {item.project.project_code}
                                                    </span>
                                                    <span className="truncate max-w-[120px]">{item.project.project_name}</span>
                                                </>
                                            ) : "-"}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-1">
                                    <div>
                                        <div className="text-[11px] font-bold text-neutral-500 mb-1">Category & Sub</div>
                                        <div className="text-xs font-bold text-neutral-900 dark:text-white flex flex-col">
                                            <span className="capitalize">{category?.toLowerCase().replace(/_/g, " ")}</span>
                                            <span className="text-[10px] text-neutral-400 font-medium capitalize">{item.subcategory ? item.subcategory.toLowerCase().replace(/_/g, " ") : "-"}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-[11px] font-bold text-neutral-500 mb-1 text-right">Status</div>
                                        <div className="flex justify-end">
                                            <StatusBadge status={status} />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <div className="text-[11px] font-bold text-neutral-500 mb-1">Description</div>
                                    <div className="text-sm font-medium text-neutral-900 dark:text-white leading-relaxed">
                                        {item.description || "No description provided"}
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* SECTION: Beneficiary - MOVED UP */}
                        {(item.beneficiary_bank || item.beneficiary_number || item.beneficiary_name) && (
                            <section className="space-y-4">
                                <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                                    <CreditCard className="w-4 h-4" strokeWidth={2} /> Beneficiary & Payment
                                </h3>
                                <div className="p-4 rounded-2xl bg-white/60 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-700/40 shadow-sm backdrop-blur-[2px] relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-3 opacity-[0.03] pointer-events-none">
                                        <CreditCard className="w-16 h-16 rotate-12" />
                                    </div>
                                    <div className="flex flex-col gap-2 relative z-10">
                                        <div className="flex items-center justify-between">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-neutral-400 leading-none mb-1">Bank Account</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[13px] font-bold text-neutral-900 dark:text-white">{item.beneficiary_bank || "Unknown Bank"}</span>
                                                    <span className="text-[13px] font-mono font-bold text-blue-600 dark:text-blue-400 tracking-tight bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded-lg border border-blue-100 dark:border-blue-500/20">{item.beneficiary_number || "-"}</span>
                                                    {item.beneficiary_number && <CopyButton text={item.beneficiary_number} />}
                                                </div>
                                                <div className="text-xs font-bold text-neutral-500 dark:text-neutral-400 mt-1 tracking-tight">{item.beneficiary_name || "-"}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[10px] font-bold text-neutral-400 mb-1">Total Amount</div>
                                                <div className="flex items-center justify-end gap-1">
                                                    <span className="text-lg font-black text-neutral-900 dark:text-white">{formatCurrency(item.approved_amount || item.amount)}</span>
                                                    <CopyButton text={String(item.approved_amount || item.amount)} />
                                                </div>
                                                {(item.approved_amount) && item.approved_amount !== item.amount && (
                                                    <div className="text-[10px] text-orange-600 line-through opacity-75 font-bold">
                                                        {formatCurrency(item.amount)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* SECTION: Item Details - TABLE FORMAT */}
                        {item.items && item.items.length > 0 && (
                            <section className="space-y-4">
                                <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                                    <Package className="w-4 h-4" strokeWidth={2} /> Item Details
                                </h3>
                                <div className="rounded-2xl border border-neutral-100 dark:border-neutral-800 overflow-hidden bg-white/40 dark:bg-neutral-900/40 backdrop-blur-sm">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-100 dark:border-neutral-800">
                                                <th className="py-2.5 px-4 text-[10px] font-bold text-neutral-400">Item</th>
                                                <th className="py-2.5 px-2 text-[10px] font-bold text-neutral-400 text-center">Qty</th>
                                                <th className="py-2.5 px-4 text-[10px] font-bold text-neutral-400 text-right">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-neutral-50 dark:divide-neutral-800/50">
                                            {item.items.map((it: any, idx: number) => (
                                                <tr key={idx} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                                                    <td className="py-3 px-4">
                                                        <div className="text-[13px] font-bold text-neutral-900 dark:text-white leading-tight">{it.name}</div>
                                                        <div className="text-[10px] text-neutral-400 font-medium tabular-nums">{formatCurrency(it.unit_price)} / {it.unit}</div>
                                                    </td>
                                                    <td className="py-3 px-2 text-center text-xs font-bold text-neutral-700 dark:text-neutral-300 tabular-nums">
                                                        {it.qty}
                                                    </td>
                                                    <td className="py-3 px-4 text-right">
                                                        <div className="text-[13px] font-bold text-neutral-900 dark:text-white tabular-nums">{formatCurrency(it.total)}</div>
                                                    </td>
                                                </tr>
                                            ))}
                                            <tr className="bg-neutral-50/50 dark:bg-neutral-800/20 font-bold">
                                                <td colSpan={2} className="py-3 px-4 text-[11px] text-neutral-500 uppercase tracking-widest">Total Request</td>
                                                <td className="py-3 px-4 text-right text-[15px] font-black text-neutral-900 dark:text-white tabular-nums">{formatCurrency(item.amount)}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        )}

                        {/* Transport Details */}
                        {category === "TRANSPORTATION" && item.details && (item.details.origin || item.details.destination) && (
                            <section className="space-y-4 pt-2">
                                <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                                    <MapPin className="w-4 h-4" strokeWidth={2} /> Trip Details
                                </h3>
                                <div className="p-4 rounded-2xl bg-white/60 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-700/40 shadow-sm backdrop-blur-[2px] divide-y divide-neutral-100 dark:divide-neutral-800">
                                    <div className="flex justify-between items-center py-2 text-xs">
                                        <span className="text-neutral-400 font-bold uppercase tracking-wider">Origin</span>
                                        <span className="font-bold text-neutral-900 dark:text-white">{item.details.origin || "?"}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 text-xs">
                                        <span className="text-neutral-400 font-bold uppercase tracking-wider">Destination</span>
                                        <span className="font-bold text-neutral-900 dark:text-white">{item.details.destination || "?"}</span>
                                    </div>
                                    {item.details.distance && (
                                        <div className="flex justify-between items-center py-2 text-xs">
                                            <span className="text-neutral-400 font-bold uppercase tracking-wider">Distance</span>
                                            <span className="font-bold text-neutral-900 dark:text-white tabular-nums">{item.details.distance} km</span>
                                        </div>
                                    )}
                                </div>
                            </section>
                        )}

                        {/* SECTION: Documents (Nested Drawer Trigger) */}
                        <section className="space-y-4 pt-2">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                                    <Upload className="w-4 h-4" strokeWidth={2} /> Documents
                                </h3>
                                {(item.invoice_url || item.payment_proof_url) && (
                                    <button
                                        onClick={() => {
                                            setDocDrawerType(item.invoice_url ? 'invoice' : 'proof');
                                            setShowDocDrawer(true);
                                        }}
                                        className="text-[11px] font-bold text-red-600 dark:text-red-400 hover:opacity-70 transition-opacity flex items-center gap-1"
                                    >
                                        View All <ChevronRight size={12} />
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => { setDocDrawerType('invoice'); setShowDocDrawer(true); }}
                                    className={clsx(
                                        "p-4 rounded-3xl border transition-all flex flex-col gap-2 text-left relative overflow-hidden group",
                                        item.invoice_url
                                            ? "bg-white/60 dark:bg-neutral-800/60 border-neutral-100 dark:border-neutral-700/40 hover:border-red-200 dark:hover:border-red-500/30"
                                            : "bg-neutral-50/50 dark:bg-neutral-900/30 border-dashed border-neutral-200 dark:border-neutral-800 opacity-60"
                                    )}
                                >
                                    <div className="flex items-center justify-between relative z-10">
                                        <span className="text-[10px] font-bold text-neutral-400">Receipt</span>
                                        <FileText size={14} className={clsx(item.invoice_url ? "text-red-500" : "text-neutral-300")} />
                                    </div>
                                    <div className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 relative z-10">
                                        {item.invoice_url ? "1 File" : "No Receipt"}
                                    </div>
                                    <div className="absolute -bottom-2 -right-2 opacity-[0.03] group-hover:scale-110 transition-transform duration-500">
                                        <FileText size={48} />
                                    </div>
                                </button>

                                <button
                                    onClick={() => { setDocDrawerType('proof'); setShowDocDrawer(true); }}
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

                            {/* Nested Document Drawer */}
                            <AnimatePresence>
                                {showDocDrawer && (
                                    <DocumentDrawer
                                        item={item}
                                        initialTab={docDrawerType}
                                        onClose={() => setShowDocDrawer(false)}
                                    />
                                )}
                            </AnimatePresence>
                        </section>

                        {/* SECTION: Notes */}
                        {item.notes && (
                            <section className="space-y-4">
                                <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                                    <FileText className="w-4 h-4" strokeWidth={2} /> Additional Notes
                                </h3>
                                <div className="text-[13px] text-neutral-600 dark:text-neutral-400 bg-white/60 dark:bg-neutral-800/60 p-5 rounded-3xl border border-neutral-100 dark:border-neutral-700/40 font-medium leading-relaxed italic">
                                    "{item.notes}"
                                </div>
                            </section>
                        )}
                    </div>
                </div>

                {/* Bottom Actions - UPDATED TO INCLUDE DYNAMIC BUTTONS */}
                <div className="flex-none px-8 py-6 sticky bottom-0 z-40 bg-white/10 dark:bg-neutral-900/10 backdrop-blur-xl border-t border-black/5 dark:border-white/5">
                    {(() => {
                        const canApprove = item.status === "PENDING" && isTeamView && (userRole === "FINANCE" || userRole === "PROJECT_MANAGER" || userRole === "ADMIN");
                        const canPay = (item.status === "APPROVED" || item.status === "PAID") && isTeamView && (userRole === "FINANCE" || userRole === "ADMIN");
                        const canRevise = item.status === "PENDING" && isTeamView && (userRole === "FINANCE" || userRole === "PROJECT_MANAGER" || userRole === "ADMIN");
                        const canEdit = (item.status === "DRAFT" || item.status === "NEED_REVISION") && !isTeamView;
                        const canDelete = (item.status === "DRAFT" || item.status === "PENDING") && !isTeamView;

                        return (
                            <div className="flex flex-col gap-3">
                                {canApprove && (
                                    <div className="flex gap-2">
                                        <button onClick={onReject} className="flex-1 py-4 text-sm font-bold text-red-600 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 rounded-full transition-all">Reject</button>
                                        <button onClick={onRevise} className="flex-1 py-4 text-sm font-bold text-orange-600 bg-orange-50 dark:bg-orange-500/10 hover:bg-orange-100 rounded-full transition-all">Revise</button>
                                        <button onClick={onApprove} className="w-[45%] py-4 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-full transition-all shadow-lg shadow-emerald-200">Approve</button>
                                    </div>
                                )}

                                {canPay && item.status !== "PAID" && (
                                    <button onClick={onPay} className="w-full py-4 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-full transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2">
                                        <CreditCard size={18} /> Process Payment
                                    </button>
                                )}

                                {canEdit && (
                                    <button onClick={onEdit} className="w-full py-4 text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-full transition-all flex items-center justify-center gap-2">
                                        <Pencil size={18} /> Edit Request
                                    </button>
                                )}

                                {canDelete && (
                                    <button onClick={onDelete} className="w-full py-2 text-[11px] font-bold text-red-400 hover:text-red-600 transition-colors uppercase tracking-widest text-center mt-1">Delete Request</button>
                                )}

                                <button
                                    onClick={onClose}
                                    className="w-full py-4 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-full font-bold text-[14px] active:scale-[0.98] transition-all flex items-center justify-center"
                                >
                                    Close
                                </button>
                            </div>
                        );
                    })()}
                </div>
            </motion.div>
        </div>
    );
}

// -- MAIN CLIENT --

export default function ReimburseClient() {
    const { viewMode, setViewMode, canAccessTeam, userId, userRole, isLoading: isAuthLoading } = useFinance();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

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

    // States
    const [editingItem, setEditingItem] = useState<any | null>(null);
    const [approvingItem, setApprovingItem] = useState<any | null>(null);
    const [revisingItem, setRevisingItem] = useState<any | null>(null);
    const [rejectingItem, setRejectingItem] = useState<any | null>(null);
    const [payingItem, setPayingItem] = useState<any | null>(null);
    const [viewingItem, setViewingItem] = useState<any | null>(null);
    const [deletingItem, setDeletingItem] = useState<any | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [previewingDocument, setPreviewingDocument] = useState<{ item: any, initialTab: 'invoice' | 'proof' } | null>(null);

    // Sorting
    const [sortColumn, setSortColumn] = useState<'date' | 'project_name' | 'amount' | 'status' | 'submitter' | null>('date');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

    const STATUS_ORDER = ['DRAFT', 'PENDING', 'NEED_REVISION', 'APPROVED', 'PAID', 'REJECTED'];

    // Extract available categories dynamically
    const availableCategories = useMemo(() => {
        const cats = new Set<string>();
        items.forEach(item => { if (item.category) cats.add(item.category); });
        return ['ALL', ...Array.from(cats)].sort();
    }, [items]);

    const handleSort = (column: 'date' | 'project_name' | 'amount' | 'status' | 'submitter') => {
        if (sortColumn === column) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    // Load Data
    const loadData = async (isInitial = false) => {
        if (isInitial) setIsLoadingData(true);
        try {
            const offset = (currentPage - 1) * itemsPerPage;
            const [{ data: rawItems, total, stats }, profiles, projectList] = await Promise.all([
                fetchReimburseRequests({
                    limit: itemsPerPage,
                    offset: offset,
                    project_id: selectedProjects.length > 0 ? selectedProjects : undefined,
                    status: statusFilter !== "ALL" ? statusFilter : undefined,
                    category: categoryFilters.length > 0 ? categoryFilters : undefined,
                    q: searchTerm || undefined,
                    start_date: showAllMonths ? undefined : format(startDate, "yyyy-MM-dd"),
                    end_date: showAllMonths ? undefined : format(endDate, "yyyy-MM-dd"),
                    my_requests: !isTeamView
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
                    staff_name: creator?.username || "Unknown",
                    staff_role: creator?.role || "Unknown Role"
                };
            });
            setItems(mapped);
        } catch (error) {
            console.error("Error loading:", error);
        } finally {
            setIsLoadingData(false);
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
        if (!isAuthLoading && userId) {
            loadData(items.length === 0);
        }
    }, [isAuthLoading, userId, currentPage, statusFilter, selectedProjects, categoryFilters, searchTerm, startDate, endDate, showAllMonths, isTeamView, currentMonth]);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [statusFilter, selectedProjects, categoryFilters, searchTerm, startDate, endDate, showAllMonths, isTeamView]);

    useEffect(() => {
        if (!isAuthLoading && userId) {
            loadFundingSources();
        }
    }, [isAuthLoading, userId, isTeamView]);

    // FAB Action Listener
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

    // 3. Final Filtered Items: Now just items (already filtered by backend)
    const filteredItems = useMemo(() => {
        let result = [...items];

        // Apply sorting
        if (sortColumn) {
            result = [...result].sort((a, b) => {
                let comparison = 0;
                switch (sortColumn) {
                    case 'date':
                        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
                        break;
                    case 'project_name':
                        comparison = (a.project?.project_name || '').localeCompare(b.project?.project_name || '');
                        break;
                    case 'amount':
                        comparison = (a.amount || 0) - (b.amount || 0);
                        break;
                    case 'status':
                        comparison = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
                        break;
                    case 'submitter':
                        comparison = (a.staff_name || '').localeCompare(b.staff_name || '');
                        break;
                }
                return sortDirection === 'asc' ? comparison : -comparison;
            });
        }

        return result;
    }, [baseItems, statusFilter, sortColumn, sortDirection, STATUS_ORDER]);

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

    if (isAuthLoading || isLoadingData) {
        return <GlobalLoading />;
    }

    return (
        <FinancePageWrapper
            breadcrumbItems={[
                { label: "Check In", href: "/feel" },
                { label: "Finance", href: "/feel/finance" },
                { label: "Reimbursement" }
            ]}
            rightToolbar={
                <>
                    {canAccessTeam && (
                        <button
                            onClick={() => setViewMode(isTeamView ? "personal" : "team")}
                            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-50 dark:hover:bg-neutral-800 active:scale-90 transition-all duration-200 pointer-events-auto relative"
                        >
                            {isTeamView ? (
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
                        onClick={() => {
                            setEditingItem(null);
                            setIsDrawerOpen(true);
                        }}
                        className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-50 dark:hover:bg-neutral-800 active:scale-90 transition-all duration-200 pointer-events-auto relative"
                    >
                        <Plus className="w-5 h-5 text-gray-700 dark:text-white" strokeWidth={1.5} />
                    </button>
                </>
            }
        >
            <FinanceHeader
                title={isTeamView ? "Team Reimbursement" : "My Reimbursement"}
                subtitle={isTeamView ? "Review and approve team expenses." : "Track and manage your expense claims."}
            />

            <div className="flex flex-col gap-6">
                {/* SUMMARY CARDS */}
                <div className="-mx-5 lg:mx-0">
                    <FinanceSummaryCardsRow className="lg:grid-cols-5">
                        <FinanceSummaryCard
                            icon={<Package className="w-5 h-5 text-red-600" />}
                            iconBg="bg-red-50"
                            label="Total Requests"
                            value={summaryStats.total.toString()}
                            subtext={formatCurrency(summaryStats.totalAmount)}
                            onClick={() => setStatusFilter("ALL")}
                            isActive={statusFilter === "ALL"}
                            activeColor="ring-red-500"
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
                            icon={<CheckCircle2 className="w-5 h-5 text-blue-600" />}
                            iconBg="bg-blue-50"
                            label="Approved"
                            value={summaryStats.approved.toString()}
                            subtext={formatCurrency(summaryStats.approvedAmount)}
                            onClick={() => setStatusFilter("APPROVED")}
                            isActive={statusFilter === "APPROVED"}
                            activeColor="ring-blue-500"
                        />

                        <FinanceSummaryCard
                            icon={<CreditCard className="w-5 h-5 text-emerald-600" />}
                            iconBg="bg-emerald-50"
                            label="Paid"
                            value={summaryStats.paid.toString()}
                            subtext={formatCurrency(summaryStats.paidAmount)}
                            onClick={() => setStatusFilter("PAID")}
                            isActive={statusFilter === "PAID"}
                            activeColor="ring-emerald-500"
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
                </div>

                {/* MOBILE TOOLBAR */}
                <div className="flex flex-col gap-2 md:hidden">
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
                                    {REIMBURSE_CATEGORY_OPTIONS.map(cat => (
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

                {/* ADVANCED TOOLBAR - DESKTOP */}
                <div className="hidden md:flex flex-row gap-2 justify-between items-center p-2 rounded-2xl bg-white/40 backdrop-blur-sm border border-white/40">
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <div className="h-10 flex items-center gap-2 px-3 bg-white rounded-xl border border-neutral-200 shadow-sm focus-within:ring-2 focus-within:ring-red-500/10 focus-within:border-red-500/50 transition-all w-full md:w-[200px]">
                            <Search className="w-4 h-4 text-neutral-400" />
                            <input
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search range..."
                                className="bg-transparent border-none text-sm outline-none w-full font-medium"
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
                                onClick={() => setShowAllMonths(!showAllMonths)}
                                className={clsx(
                                    "px-2 text-sm font-bold whitespace-nowrap min-w-[100px] text-center transition-colors hover:text-red-500",
                                    showAllMonths ? "text-red-600" : "text-neutral-700"
                                )}
                            >
                                {showAllMonths ? "All Time" : format(currentMonth, "MMM yyyy")}
                            </button>
                            <button
                                onClick={() => handleMonthChange("next")}
                                className="w-8 h-8 flex items-center justify-center hover:bg-neutral-100 rounded-lg text-neutral-400 hover:text-neutral-600 transition-all"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Project Select */}
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

                        {/* Category Select */}
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
                                {REIMBURSE_CATEGORY_OPTIONS.map(cat => (
                                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none group-hover:text-neutral-600 transition-colors" />
                        </div>
                    </div>

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

            {/* MOBILE CARD LIST */}
            <div className="mt-6 block md:hidden space-y-3">
                {
                    filteredItems.length === 0 ? (
                        <div className="bg-white/40 dark:bg-neutral-900/60 backdrop-blur-md rounded-2xl border border-white/50 dark:border-neutral-800 shadow-sm dark:shadow-none p-6 text-center">
                            <Package className="w-10 h-10 text-neutral-300 dark:text-neutral-600 mx-auto mb-2" />
                            <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                                {searchTerm ? "No results found" :
                                    statusFilter !== "ALL" ? `No ${statusFilter.toLowerCase()} requests` :
                                        "No items found"}
                            </h4>
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
                            const renderMobileActions = () => {
                                const isAdmin = ["admin", "superadmin", "supervisor"].includes(userRole || "");
                                const isPending = item.status === "PENDING";
                                const isApprovedNotPaid = item.status === "APPROVED" && item.financial_status !== "PAID";
                                const isDraftOrRevise = item.status === "DRAFT" || item.status === "NEED_REVISION";

                                return (
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
                                                {(isPending || isDraftOrRevise) && (
                                                    <button onClick={(e) => { e.stopPropagation(); setEditingItem(item); setIsDrawerOpen(true); }} className="flex-1 py-2 rounded-xl bg-neutral-900 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-md shadow-neutral-400/50">
                                                        <Pencil className="w-4 h-4" /> Edit
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
                                    idRef={formatStructuredId('RE', item.project?.project_number || item.project_number, item.request_number, item.project?.project_code || item.project_code)}
                                    title={formatItemTitle(item.items || [], item.description)}
                                    projectCode={item.project?.project_code || item.project_code || 'GEN'}
                                    date={formatCardDate(item.date)}
                                    priority={item.priority}
                                    amount={item.amount}
                                    status={item.status}
                                    onClick={() => {
                                        if (isTeamView) setViewingItem(item);
                                        else { setEditingItem(item); setIsDrawerOpen(true); }
                                    }}
                                    actions={item.status !== 'PAID' ? renderMobileActions() : undefined}
                                />
                            );
                        })
                    )
                }
            </div >

            {/* DESKTOP TABLE */}
            < div className="hidden md:block bg-white/40 backdrop-blur-md rounded-3xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.02)] overflow-hidden" >
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-neutral-100 bg-neutral-50/50 backdrop-blur-sm">
                                <th className="px-6 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest cursor-pointer hover:text-neutral-600 transition-colors" onClick={() => handleSort('date')}>
                                    <span className="flex items-center gap-1">
                                        Date
                                        {sortColumn === 'date' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                                    </span>
                                </th>
                                <th className="px-6 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest cursor-pointer hover:text-neutral-600 transition-colors" onClick={() => handleSort('project_name')}>
                                    <span className="flex items-center gap-1">
                                        Project
                                        {sortColumn === 'project_name' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                                    </span>
                                </th>
                                <th className="px-6 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Item Detail</th>
                                <th className="px-6 py-4 text-right text-[10px] font-bold text-neutral-400 uppercase tracking-widest cursor-pointer hover:text-neutral-600 transition-colors" onClick={() => handleSort('amount')}>
                                    <span className="flex items-center justify-end gap-1">
                                        Amount
                                        {sortColumn === 'amount' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                                    </span>
                                </th>
                                <th className="px-6 py-4 text-center text-[10px] font-bold text-neutral-400 uppercase tracking-widest cursor-pointer hover:text-neutral-600 transition-colors" onClick={() => handleSort('status')}>
                                    <span className="flex items-center justify-center gap-1">
                                        Status
                                        {sortColumn === 'status' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                                    </span>
                                </th>
                                <th className="px-6 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest cursor-pointer hover:text-neutral-600 transition-colors" onClick={() => handleSort('submitter')}>
                                    <span className="flex items-center gap-1">
                                        Submitter
                                        {sortColumn === 'submitter' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                                    </span>
                                </th>
                                <th className="px-6 py-4 text-right text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-50">
                            {filteredItems.length === 0 ? (
                                <tr><td colSpan={7} className="py-16 text-center text-neutral-400">No requests found</td></tr>
                            ) : (
                                filteredItems.map(item => (
                                    <tr
                                        key={item.id}
                                        className="group hover:bg-white/60 hover:shadow-sm transition-all cursor-pointer"
                                        onClick={() => {
                                            if (isTeamView) {
                                                setViewingItem(item);
                                            } else {
                                                setEditingItem(item);
                                                setIsDrawerOpen(true);
                                            }
                                        }}
                                    >
                                        <td className="px-6 py-4 text-xs font-medium text-neutral-500 tabular-nums">{format(new Date(item.date), "dd MMM yyyy")}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold bg-neutral-100 px-1.5 py-0.5 rounded w-fit text-neutral-500 mb-1">{item.project?.project_code || "N/A"}</span>
                                                <span className="text-xs font-medium text-neutral-900 truncate max-w-[120px]">{cleanEntityName(item.project?.project_name || "Unknown")}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs font-semibold text-neutral-900 mb-1">
                                                {item.items && item.items.length > 1
                                                    ? `${item.items[0].name} + ${item.items.length - 1} more`
                                                    : (item.items?.[0]?.name || item.description)}
                                            </div>
                                            <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider flex items-center gap-1">
                                                {item.category?.replace(/_/g, " ")}
                                                {item.subcategory && (
                                                    <>
                                                        <span className="text-neutral-300">•</span>
                                                        <span className="text-neutral-500">{item.subcategory?.replace(/_/g, " ")}</span>
                                                    </>
                                                )}
                                            </span>
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
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-neutral-900">{cleanEntityName(item.staff_name)}</span>
                                                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-tighter">{item.staff_role}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={(e) => { e.stopPropagation(); setViewingItem(item); }} className="p-1.5 hover:bg-blue-50 text-neutral-400 hover:text-blue-600 rounded-full"><Eye className="w-4 h-4" /></button>

                                                {isTeamView && item.status === "PENDING" && (
                                                    <>
                                                        <button onClick={(e) => { e.stopPropagation(); setApprovingItem(item); }} className="p-1.5 hover:bg-emerald-50 text-neutral-400 hover:text-emerald-600 rounded-full" title="Approve"><CheckCircle2 className="w-4 h-4" /></button>
                                                        <button onClick={(e) => { e.stopPropagation(); setRevisingItem(item); }} className="p-1.5 hover:bg-orange-50 text-neutral-400 hover:text-orange-600 rounded-full" title="Request Revision"><AlertCircle className="w-4 h-4" /></button>
                                                        <button onClick={(e) => { e.stopPropagation(); setRejectingItem(item); }} className="p-1.5 hover:bg-rose-50 text-neutral-400 hover:text-rose-600 rounded-full" title="Reject"><Ban className="w-4 h-4" /></button>
                                                    </>
                                                )}

                                                {isTeamView && item.status === "APPROVED" && (
                                                    <button onClick={(e) => { e.stopPropagation(); setPayingItem(item); }} className="p-1.5 hover:bg-emerald-50 text-neutral-400 hover:text-emerald-600 rounded-full" title="Pay"><CreditCard className="w-4 h-4" /></button>
                                                )}

                                                {/* Admin Delete Button - Visible in Team View for all statuses */}
                                                {isTeamView && ["admin", "superadmin", "supervisor"].includes(userRole || "") && (
                                                    <button onClick={(e) => {
                                                        e.stopPropagation();
                                                        setDeletingItem(item);
                                                    }} className="p-1.5 hover:bg-red-50 text-neutral-400 hover:text-red-600 rounded-full" title="Delete Request"><Trash2 className="w-4 h-4" /></button>
                                                )}

                                                {(!isTeamView || ["admin", "superadmin", "supervisor"].includes(userRole || "")) && (["DRAFT", "NEED_REVISION", "PENDING", "REJECTED"].includes(item.status) || ["admin", "superadmin", "supervisor"].includes(userRole || "")) && (
                                                    <>
                                                        {(!isTeamView && (["DRAFT", "NEED_REVISION", "PENDING"].includes(item.status) || ["admin", "superadmin", "supervisor"].includes(userRole || ""))) && (
                                                            <button onClick={(e) => { e.stopPropagation(); setEditingItem(item); setIsDrawerOpen(true); }} className="p-1.5 hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 rounded-full"><Pencil className="w-4 h-4" /></button>
                                                        )}
                                                        <button onClick={(e) => {
                                                            e.stopPropagation();
                                                            setDeletingItem(item);
                                                        }} className="p-1.5 hover:bg-red-50 text-neutral-400 hover:text-red-600 rounded-full"><Trash2 className="w-4 h-4" /></button>
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
            </div >

            <Pagination
                currentPage={currentPage}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
            />

            {/* DRAWERS & MODALS (kept as is) */}
            <NewRequestDrawer
                isOpen={isDrawerOpen}
                initialType="REIMBURSE"
                hideSwitcher={true}
                initialData={editingItem || undefined}
                onClose={() => { setIsDrawerOpen(false); setEditingItem(null); }}
                onSuccess={() => { setIsDrawerOpen(false); setEditingItem(null); loadData(); }}
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
                        onClose={() => setApprovingItem(null)}
                        onApprove={async (amount) => {
                            try {
                                const res = await updateReimburseStatus(approvingItem.id, { status: "APPROVED", approved_amount: amount });
                                if (!res && res !== undefined) throw new Error("Update returned false/null");
                                setApprovingItem(null);
                                loadData();
                            } catch (error) {
                                console.error("Error approving reimburse request:", error);
                                alert(`Error approving request: ${error}`);
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
                            loadData();
                        }}
                    />
                )
            }

            {
                viewingItem && (
                    <ViewModal
                        item={viewingItem}
                        onClose={() => setViewingItem(null)}
                        onPreview={(tab) => setPreviewingDocument({ item: viewingItem, initialTab: tab })}
                    />
                )
            }

            {/* Document preview is now handled by nested DocumentDrawer inside ViewModal */}

            {/* Delete Confirmation Modal */}
            {
                deletingItem && (
                    <DeleteConfirmModal
                        item={deletingItem}
                        onClose={() => setDeletingItem(null)}
                        onConfirm={async () => {
                            setIsDeleting(true);
                            try {
                                await deleteReimburseRequest(deletingItem.id);
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
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] px-2">Date Range</h4>
                                    <div className="flex items-center gap-3 px-2">
                                        <div className="flex-1 space-y-1.5 min-w-0 overflow-hidden">
                                            <label className="text-[10px] font-bold text-neutral-400 uppercase pl-3 block">From</label>
                                            <input
                                                type="date"
                                                value={format(startDate, "yyyy-MM-dd")}
                                                onChange={(e) => {
                                                    setShowAllMonths(false);
                                                    setStartDate(new Date(e.target.value));
                                                }}
                                                className="w-full max-w-full min-w-0 bg-neutral-900/5 dark:bg-neutral-100/5 border-none rounded-2xl text-[14px] font-bold text-neutral-700 dark:text-neutral-300 outline-none px-4 py-3 appearance-none focus:ring-2 focus:ring-red-500/20"
                                            />
                                        </div>
                                        <div className="flex-1 space-y-1.5 min-w-0 overflow-hidden">
                                            <label className="text-[10px] font-bold text-neutral-400 uppercase pl-3 block">To</label>
                                            <input
                                                type="date"
                                                value={format(endDate, "yyyy-MM-dd")}
                                                onChange={(e) => {
                                                    setShowAllMonths(false);
                                                    setEndDate(new Date(e.target.value));
                                                }}
                                                className="w-full max-w-full min-w-0 bg-neutral-900/5 dark:bg-neutral-100/5 border-none rounded-2xl text-[14px] font-bold text-neutral-700 dark:text-neutral-300 outline-none px-4 py-3 appearance-none focus:ring-2 focus:ring-red-500/20"
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
                                        {showAllMonths ? "Custom Range Mode" : "Show All Time"}
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={() => setShowFilters(false)}
                                className="w-full bg-red-600 hover:bg-red-700 text-white py-4 rounded-full font-bold text-[16px] transition-colors shadow-lg shadow-red-500/20 active:scale-[0.98] mt-auto shrink-0"
                            >
                                Apply Filters
                            </button>
                        </div>
                    </div>
                )
            }
        </FinancePageWrapper >

    );
}
