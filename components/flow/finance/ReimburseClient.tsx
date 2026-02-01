"use client";

import { useState, useMemo, useEffect } from "react";
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
    Filter
} from "lucide-react";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import { format, addMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO, isBefore } from "date-fns";
import { ReimburseRequest, ReimburseStatus, FundingSource } from "@/lib/types/finance-types";
import { formatCurrency, STATUS_THEMES, cleanEntityName, getPrimaryStatus, formatStatus } from "./modules/utils";
import { SummaryCard, SummaryCardsRow } from "@/components/shared/SummaryCard";
import { useSearchParams } from "next/navigation";
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
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl overflow-hidden">
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

function ReviseModal({ item, onClose, onRevise }: { item: any, onClose: () => void, onRevise: (reason: string) => void }) {
    const [reason, setReason] = useState("");
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm" onClick={onClose} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl overflow-hidden">
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

function PayModal({ item, onClose, onPay, fundingSources, isLoadingSources }: {
    item: any,
    onClose: () => void,
    onPay: (sourceId: string, date: string, notes: string, proofFile: File | null) => Promise<void>,
    fundingSources: FundingSource[],
    isLoadingSources: boolean
}) {
    const [source, setSource] = useState("");
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState("");
    const [proofFile, setProofFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleConfirm = async () => {
        if (!source || !date) return;
        setIsSubmitting(true);
        await onPay(source, date, notes, proofFile);
        setIsSubmitting(false);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm" onClick={onClose} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl overflow-hidden">
                <h3 className="text-lg font-bold text-neutral-900 mb-6 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-emerald-600" />
                    Process Payment
                </h3>

                <div className="space-y-4 mb-8">
                    <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-100 space-y-3">
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-neutral-500 font-medium">Amount to Pay</span>
                            <div className="flex items-center gap-1">
                                <div className="text-right">
                                    <div className="font-bold text-neutral-900 text-sm">{formatCurrency(item.approved_amount || item.details?.approved_amount || item.amount)}</div>
                                    {(item.approved_amount || item.details?.approved_amount) && (item.approved_amount || item.details?.approved_amount) !== item.amount && (
                                        <div className="text-[10px] text-orange-600 line-through opacity-75">{formatCurrency(item.amount)}</div>
                                    )}
                                </div>
                                <CopyButton text={String(item.approved_amount || item.details?.approved_amount || item.amount)} />
                            </div>
                        </div>

                        <hr className="border-neutral-200/50" />

                        <div className="flex justify-between items-center text-xs">
                            <span className="text-neutral-500 font-medium">Submitter</span>
                            <div className="flex items-center gap-1">
                                <span className="font-bold text-neutral-900">{item.staff_name}</span>
                                <div className="w-6" /> {/* Spacer for alignment with copy buttons */}
                            </div>
                        </div>

                        <div className="flex justify-between items-start text-xs">
                            <span className="text-neutral-500 font-medium mt-0.5">Beneficiary Account</span>
                            <div className="flex items-center gap-1">
                                {(item.beneficiary_bank || item.beneficiary_number) ? (
                                    <div className="text-right">
                                        <div className="font-bold text-neutral-900">{item.beneficiary_name || item.staff_name}</div>
                                        <div className="text-[10px] text-neutral-500 font-mono bg-white px-1.5 py-0.5 rounded border border-neutral-200 mt-1 inline-block">
                                            {item.beneficiary_bank} • {item.beneficiary_number}
                                        </div>
                                    </div>
                                ) : (
                                    <span className="italic text-neutral-400">Not specified</span>
                                )}
                                {item.beneficiary_number && <CopyButton text={item.beneficiary_number} />}
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Funding Source</label>
                        {isLoadingSources ? (
                            <div className="h-10 w-full bg-neutral-100 rounded-xl animate-pulse" />
                        ) : (
                            <div className="relative group">
                                <select
                                    value={source}
                                    onChange={(e) => setSource(e.target.value)}
                                    className="w-full h-11 pl-4 pr-10 text-sm border border-neutral-200 rounded-xl bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/30 transition-all font-medium appearance-none cursor-pointer hover:border-emerald-500/30"
                                >
                                    <option value="">Select Source...</option>
                                    {fundingSources.map(s => (
                                        <option key={s.id} value={s.id}>{s.name} ({s.currency})</option>
                                    ))}
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400 group-hover:text-emerald-600 transition-colors">
                                    <ChevronDown className="w-4 h-4" />
                                </div>
                            </div>
                        )}
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Payment Date</label>
                        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full h-11 px-3 text-sm border border-neutral-200 rounded-xl bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/30 transition-all font-medium" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Proof of Transfer (Optional)</label>
                        <div className={clsx(
                            "border-2 border-dashed rounded-xl p-4 text-center transition-all cursor-pointer relative group",
                            proofFile ? "border-emerald-500/40 bg-emerald-50/50" : "border-neutral-200 hover:border-emerald-500/30 hover:bg-emerald-50/20"
                        )}>
                            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" onChange={(e) => { if (e.target.files?.[0]) setProofFile(e.target.files[0]); }} />
                            {proofFile ? (
                                <div className="flex items-center justify-center gap-2 text-emerald-700 text-sm font-bold animate-in fade-in zoom-in-95">
                                    <CheckCircle2 className="w-4 h-4" /> {proofFile.name}
                                </div>
                            ) : (
                                <div className="flex items-center justify-center gap-2 text-neutral-400 text-sm group-hover:text-emerald-600 transition-colors">
                                    <Upload className="w-4 h-4" /> Upload Image/PDF
                                </div>
                            )}
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Notes</label>
                        <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional transaction notes" className="w-full h-11 px-4 text-sm border border-neutral-200 rounded-xl bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/30 transition-all font-medium placeholder:text-neutral-400" />
                    </div>
                </div>

                <div className="flex gap-3 pt-2">
                    <button onClick={onClose} disabled={isSubmitting} className="flex-1 py-3 text-sm font-bold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-all">Cancel</button>
                    <button
                        onClick={handleConfirm}
                        disabled={!source || !date || isSubmitting}
                        className="flex-1 py-3 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-200"
                    >
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Process Payment"}
                    </button>
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
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl overflow-hidden">
                <h3 className="text-lg font-bold text-neutral-900 mb-2 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    Approve Request
                </h3>
                <p className="text-sm text-neutral-500 mb-6">Confirm the approved amount for this reimbursement.</p>

                <div className="mb-6">
                    {item.category === "TRANSPORTATION" && item.details?.transportEstCost && (
                        <div className="mb-4 bg-blue-50 p-3 rounded-xl border border-blue-100 flex justify-between items-center">
                            <div>
                                <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">System Estimation</div>
                                <div className="text-xs text-blue-400">Policy Rate</div>
                            </div>
                            <div className="text-sm font-bold text-blue-700">{formatCurrency(item.details.transportEstCost)}</div>
                        </div>
                    )}
                    <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Approved Amount</label>
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
        <span className={clsx("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border", theme.bg, theme.text, theme.border)}>
            {formatStatus(status)}
        </span>
    );
}

// ----------------------------------------------------------------------------
// Preview Modal (Identical to Purchasing)
// ----------------------------------------------------------------------------
function InvoicePreviewModal({
    item,
    initialTab = 'invoice',
    onClose
}: {
    item: any,
    initialTab?: 'invoice' | 'proof',
    onClose: () => void
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
            const path = activeTab === 'invoice' ? item.invoice_url : item.payment_proof_url;
            if (!path) {
                if (active) { setSignedUrl(null); setIsLoading(false); }
                return;
            }
            if (path.startsWith('http')) {
                if (active) { setSignedUrl(path); setIsLoading(false); }
                return;
            }
            // If path is not http, assume storage path
            const url = await getFinanceFileUrl(path);
            if (active) { setSignedUrl(url); setIsLoading(false); }
        };
        fetchUrl();
        return () => { active = false; };
    }, [activeTab, item]);

    const handleDownload = async () => {
        if (!signedUrl) return;
        setIsDownloading(true);
        try {
            const dateToUse = activeTab === 'proof' ? (item.payment_date || item.updated_at) : item.created_at;
            const dateStr = format(new Date(dateToUse || new Date()), "yyyyMMdd");
            const typeStr = activeTab === 'proof' ? "Transfer_Reimb" : "Invoice_Reimb";
            const projectCode = cleanEntityName(item.project?.project_code || "REF");
            const beneficiary = cleanEntityName(item.staff_name || "Staff");
            const category = cleanEntityName(item.category || "General");

            // extract extension safe from query params (e.g. ?token=...)
            const urlObj = new URL(signedUrl);
            const ext = urlObj.pathname.split('.').pop() || 'jpg';
            // Format: Invoice_Reimb_PRG_20260119_Adi Nur_Transportation.png
            const filename = `${typeStr}_${projectCode}_${dateStr}_${beneficiary}_${category}.${ext}`;

            const response = await fetch(signedUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (e) {
            console.error(e);
            window.open(signedUrl, '_blank');
        }
        setIsDownloading(false);
    }

    const isImage = signedUrl?.match(/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i);

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-md" onClick={onClose} />
            <div className="relative w-full max-w-4xl bg-white/95 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-white/50 overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-neutral-100 flex justify-between items-center bg-white/50">
                    <div className="flex gap-2">
                        <button onClick={() => setActiveTab('invoice')} className={clsx("px-4 py-1.5 text-xs font-bold rounded-full transition-all", activeTab === 'invoice' ? "bg-red-50 text-red-600" : "hover:bg-neutral-100")}>Receipt</button>
                        <button onClick={() => setActiveTab('proof')} className={clsx("px-4 py-1.5 text-xs font-bold rounded-full transition-all", activeTab === 'proof' ? "bg-red-50 text-red-600" : "hover:bg-neutral-100")}>Proof of Transfer</button>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
                            <X className="w-5 h-5 text-neutral-400" />
                        </button>
                    </div>
                </div>

                <div className={clsx("flex-1 bg-neutral-50 relative min-h-[400px] flex", isZoomed ? "overflow-auto items-start p-0" : "overflow-hidden items-center justify-center p-4")}>
                    {isLoading ? (
                        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
                    ) : signedUrl ? (
                        isImage ? (
                            <div
                                className={clsx("transition-all duration-300", isZoomed ? "" : "cursor-zoom-in")}
                                onClick={() => setIsZoomed(!isZoomed)}
                            >
                                <img
                                    src={signedUrl}
                                    alt="Preview"
                                    className={clsx(
                                        "shadow-lg transition-transform",
                                        isZoomed ? "max-w-none" : "max-w-full max-h-[70vh] object-contain rounded-lg"
                                    )}
                                />
                            </div>
                        ) : (
                            <div className="text-center">
                                <Package className="w-16 h-16 text-neutral-300 mx-auto mb-4" strokeWidth={1} />
                                <p className="text-sm text-neutral-500 font-medium mb-4">Preview not available for this file type</p>
                                <button
                                    onClick={handleDownload}
                                    className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-sm font-bold transition-colors"
                                >
                                    Download File
                                </button>
                            </div>
                        )
                    ) : (
                        <div className="text-neutral-400 text-sm font-medium">No document attached</div>
                    )}
                </div>

                {signedUrl && (
                    <div className="p-4 border-t border-neutral-100 flex justify-between items-center bg-white/50">
                        <div className="text-xs text-neutral-400 font-medium">
                            {item.description} • {format(new Date(item.date), "dd MMM yyyy")}
                        </div>
                        <button
                            onClick={handleDownload}
                            disabled={isDownloading}
                            className="px-4 py-2 bg-neutral-900 text-white hover:bg-black rounded-xl text-sm font-bold shadow-lg shadow-neutral-200 transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                            Download
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ----------------------------------------------------------------------------
// View Modal (Identical to Purchasing)
// ----------------------------------------------------------------------------
function ViewModal({
    item,
    onClose,
    onPreview
}: {
    item: any;
    onClose: () => void;
    onPreview: (tab: 'invoice' | 'proof') => void;
}) {
    const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
    const [proofUrl, setProofUrl] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'invoice' | 'proof'>('invoice');

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
        if (!item.invoice_url && item.payment_proof_url) setActiveTab('proof');
    }, [item.invoice_url, item.payment_proof_url]);

    const displayAmount = item.amount || 0;
    const notes = item.rejection_reason || item.notes || "";
    const category = item.category || "-";
    const status = item.status;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-md" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-white/95 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-white/50 overflow-hidden animate-in fade-in zoom-in duration-300 max-h-[90vh] overflow-y-auto">
                <div className="p-8">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-neutral-900">Reimbursement Details</h3>
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
                                    {item.project ? (
                                        <>
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-neutral-100 text-neutral-600 mr-2 border border-neutral-200 shrink-0">
                                                {item.project.project_code}
                                            </span>
                                            <span>{item.project.project_name}</span>
                                        </>
                                    ) : "-"}
                                </div>
                            </div>
                        </div>

                        {/* REVISION/REJECTION REASON */}
                        {((item.status === "NEED_REVISION") || (item.status === "DRAFT" && item.revision_reason)) && item.revision_reason && (
                            <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 mb-6 animate-in fade-in slide-in-from-top-2">
                                <h4 className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                    <AlertCircle className="w-3.5 h-3.5" /> Revision Requested
                                </h4>
                                <p className="text-sm font-medium text-orange-900">{item.revision_reason}</p>
                            </div>
                        )}

                        {(item.status === "REJECTED" || item.rejection_reason) && item.rejection_reason && (
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
                                <div className="text-sm font-medium text-neutral-900 capitalize">{category?.toLowerCase().replace(/_/g, " ")}</div>
                            </div>
                            <div>
                                <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Subcategory</div>
                                <div className="text-sm font-medium text-neutral-900 capitalize">{item.subcategory ? item.subcategory.toLowerCase().replace(/_/g, " ") : "-"}</div>
                            </div>
                        </div>

                        <div>
                            <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Description</div>
                            <div className="text-sm font-medium text-neutral-900">{item.description}</div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Amount</div>
                                <div className="flex items-center gap-1">
                                    <span className="text-lg font-bold text-neutral-900">{formatCurrency(item.approved_amount || item.details?.approved_amount || item.amount)}</span>
                                    <CopyButton text={String(item.approved_amount || item.details?.approved_amount || item.amount)} />
                                </div>
                                {(item.approved_amount || item.details?.approved_amount) && (item.approved_amount || item.details?.approved_amount) !== item.amount && (
                                    <div className="text-[10px] text-orange-600 line-through opacity-75 mt-0.5 font-medium">
                                        {formatCurrency(item.amount)}
                                    </div>
                                )}
                            </div>
                            <div>
                                <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Status</div>
                                <StatusBadge status={status} />
                            </div>
                        </div>

                        {/* Items Breakdown */}
                        {item.items && item.items.length > 0 && (
                            <div className="space-y-1.5 pt-1">
                                <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Details Breakdown</div>
                                <div className="border border-neutral-100 rounded-xl overflow-hidden">
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

                        {category === "TRANSPORTATION" && item.details && (item.details.origin || item.details.destination || item.details.distance) && (
                            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-3">
                                {/* Only show estimation for Motor/Mobil Pribadi */}
                                {["MOTOR_PERSONAL", "CAR_PERSONAL"].includes(item.subcategory) && item.details.transportEstCost ? (
                                    <>
                                        <h4 className="text-[10px] font-bold text-blue-500 uppercase tracking-widest flex items-center gap-1.5">
                                            <MapPin className="w-3.5 h-3.5" /> System Estimation
                                        </h4>
                                        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 text-xs items-center text-blue-900/80 font-medium border-b border-blue-100 pb-2 mb-2">
                                            <span>Trip: {item.details.origin || "?"} <span className="text-blue-300 mx-1">→</span> {item.details.destination || "?"}</span>
                                            <span className="tabular-nums">{item.details.distance} km</span>
                                            <span className="text-blue-400">× rate</span>
                                            <span className="font-bold tabular-nums">{formatCurrency(item.details.transportEstCost)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-blue-400 font-medium">Claim Amount vs System Est.</span>
                                            <div className="flex gap-2">
                                                <span className={clsx("font-bold", (item.amount > (item.details.transportEstCost || 0)) ? "text-red-500" : "text-emerald-600")}>
                                                    {formatCurrency(item.amount)}
                                                </span>
                                                <span className="text-blue-300">/</span>
                                                <span className="text-blue-700 font-bold">{formatCurrency(item.details.transportEstCost || 0)}</span>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <h4 className="text-[10px] font-bold text-blue-500 uppercase tracking-widest flex items-center gap-1.5">
                                            <MapPin className="w-3.5 h-3.5" /> Trip Details
                                        </h4>
                                        <div className="grid grid-cols-[1fr_auto] gap-4 text-xs items-center text-blue-900/80 font-medium">
                                            <span>Trip: {item.details.origin || "?"} <span className="text-blue-300 mx-1">→</span> {item.details.destination || "?"}</span>
                                            <span className="tabular-nums">{item.details.distance} km</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

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
                            <button onClick={() => setActiveTab('invoice')} className={clsx("flex-1 py-2 text-xs font-bold rounded-lg transition-all", activeTab === 'invoice' ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700")}>Invoice / Receipt</button>
                            <button onClick={() => setActiveTab('proof')} className={clsx("flex-1 py-2 text-xs font-bold rounded-lg transition-all", activeTab === 'proof' ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700")}>Proof of Transfer</button>
                        </div>

                        {activeTab === 'invoice' && (
                            <div className="space-y-2">
                                {item.invoice_url ? (
                                    <div className="border border-neutral-200 rounded-xl overflow-hidden bg-neutral-50 group relative">
                                        {item.invoice_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                            <button onClick={() => onPreview('invoice')} className="w-full text-left cursor-zoom-in relative block">
                                                {invoiceUrl ? <img src={invoiceUrl} alt="Invoice" className="w-full max-h-48 object-contain" /> : <div className="h-48 flex items-center justify-center bg-neutral-100/50"><Loader2 className="w-6 h-6 animate-spin text-neutral-400" /></div>}
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                    <div className="bg-white/90 rounded-full px-3 py-1 text-xs font-bold text-neutral-700 shadow-sm">Click to Zoom</div>
                                                </div>
                                            </button>
                                        ) : (
                                            <div className="p-4 flex items-center justify-between">
                                                <span className="text-sm text-neutral-600">Attached file</span>
                                                <a href={invoiceUrl || '#'} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">Open File</a>
                                            </div>
                                        )}
                                    </div>
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

                    {notes && (
                        <div className="mt-6">
                            <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Notes</div>
                            <div className="text-sm text-neutral-700 bg-neutral-50 p-3 rounded-lg">{notes}</div>
                        </div>
                    )}
                </div>

                <button onClick={onClose} className="w-full h-12 mt-6 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl font-medium transition-all">Close</button>
            </div>
        </div >

    );
}

// -- MAIN CLIENT --

export default function ReimburseClient() {
    const { viewMode, userId, isLoading: isAuthLoading } = useFinance();
    const searchParams = useSearchParams();
    const [searchTerm, setSearchTerm] = useState("");

    // Filters
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedProject, setSelectedProject] = useState("ALL");
    const [statusFilter, setStatusFilter] = useState<ReimburseStatus | "ALL">("ALL");
    const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

    const [items, setItems] = useState<any[]>([]);
    const [fundingSources, setFundingSources] = useState<FundingSource[]>([]);
    const [projects, setProjects] = useState<any[]>([]);

    const [isLoadingData, setIsLoadingData] = useState(true);
    const [isLoadingSources, setIsLoadingSources] = useState(false);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    // States
    const [editingItem, setEditingItem] = useState<any | null>(null);
    const [approvingItem, setApprovingItem] = useState<any | null>(null);
    const [revisingItem, setRevisingItem] = useState<any | null>(null);
    const [rejectingItem, setRejectingItem] = useState<any | null>(null);
    const [payingItem, setPayingItem] = useState<any | null>(null);
    const [viewingItem, setViewingItem] = useState<any | null>(null);
    const [previewingDocument, setPreviewingDocument] = useState<{ item: any, initialTab: 'invoice' | 'proof' } | null>(null);

    // Sorting
    const [sortColumn, setSortColumn] = useState<'created_at' | 'project_name' | 'amount' | 'status' | 'submitter' | null>('created_at');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

    const STATUS_ORDER = ['DRAFT', 'PENDING', 'NEED_REVISION', 'APPROVED', 'PAID', 'REJECTED'];

    // Extract available categories dynamically
    const availableCategories = useMemo(() => {
        const cats = new Set<string>();
        items.forEach(item => { if (item.category) cats.add(item.category); });
        return ['ALL', ...Array.from(cats)].sort();
    }, [items]);

    const handleSort = (column: 'created_at' | 'project_name' | 'amount' | 'status' | 'submitter') => {
        if (sortColumn === column) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    const isTeamView = viewMode === "team";
    const initialStatus = searchParams.get("status") as ReimburseStatus | "ALL" | null;

    // FAB Action Listener
    useEffect(() => {
        const handleFabAction = (e: any) => {
            if (e.detail?.id === 'FINANCE_NEW_PURCHASE') {
                setIsDrawerOpen(true);
            }
        };
        window.addEventListener('fab-action', handleFabAction);
        return () => window.removeEventListener('fab-action', handleFabAction);
    }, []);

    // Load Data
    const loadData = async () => {
        setIsLoadingData(true);
        try {
            const [requests, profiles, projectList] = await Promise.all([
                fetchReimburseRequests(),
                fetchTeamMembers(),
                fetchAllProjects()
            ]);

            const profileMap = new Map(profiles.map(p => [p.id, p]));
            setProjects(projectList);

            const mapped = requests.map((req: any) => {
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

    useEffect(() => {
        if (!isAuthLoading && userId) {
            loadData();
            loadFundingSources();
        }
    }, [isAuthLoading, userId]);

    // Helpers
    const handleMonthChange = (direction: "prev" | "next") => {
        setCurrentMonth(prev => addMonths(prev, direction === "prev" ? -1 : 1));
    };



    // Stats
    const summaryStats = useMemo(() => {
        return {
            total: items.length,
            pending: items.filter(i => i.status === "PENDING").length,
            approved: items.filter(i => i.status === "APPROVED").length,
            paid: items.filter(i => i.status === "PAID").length,
            rejected: items.filter(i => i.status === "REJECTED").length
        };
    }, [items]);

    // Derived
    const filteredItems = useMemo(() => {
        const start = startOfMonth(currentMonth);
        const end = endOfMonth(currentMonth);

        let result = items.filter(item => {
            const matchesSearch =
                item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.staff_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.project?.project_name?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;

            // Allow project_id string matching or if selectedProject is ALL
            const matchesProject = selectedProject === "ALL" || item.project_id === selectedProject;

            // Date filtering
            const itemDate = item.date ? parseISO(item.date) : parseISO(item.created_at);
            const matchesDate = isWithinInterval(itemDate, { start, end });

            return matchesSearch && matchesStatus && matchesProject && matchesDate;
        });

        // Apply sorting
        if (sortColumn) {
            result = [...result].sort((a, b) => {
                let comparison = 0;
                switch (sortColumn) {
                    case 'created_at':
                        comparison = new Date(a.date || a.created_at).getTime() - new Date(b.date || b.created_at).getTime();
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
    }, [items, searchTerm, statusFilter, selectedProject, currentMonth, sortColumn, sortDirection, STATUS_ORDER]);

    const handleExport = async () => {
        if (filteredItems.length === 0) return;
        setIsExporting(true);

        try {
            // 1. Prepare Meta
            const project = projects.find(p => p.id === selectedProject);
            const projectCode = project ? (project.projectCode || "PRG") : "ALL";
            const projectName = project ? project.projectName : (selectedProject === "ALL" ? "All Projects" : "Selected Project");
            const documentName = isTeamView ? "Team Reimbursement Report" : "My Reimbursement Report";
            const generatedAt = new Date().toLocaleString("id-ID");

            const startStr = format(startOfMonth(currentMonth), "dd MMM");
            const endStr = format(endOfMonth(currentMonth), "dd MMM yyyy");
            const periodText = `Monthly Report (${startStr} – ${endStr})`;

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
        >
            <FinanceHeader
                title={isTeamView ? "Team Reimbursement" : "My Reimbursement"}
                subtitle={isTeamView ? "Review and approve team expenses, including nominal correction." : "Track and manage your expense claims."}
            />

            <div className="flex flex-col gap-6">
                {/* SUMMARY CARDS */}
                <SummaryCardsRow>
                    <SummaryCard
                        icon={<Package className="w-5 h-5 text-red-600" />}
                        iconBg="bg-red-50"
                        label="Total Requests"
                        value={summaryStats.total.toString()}
                        onClick={() => setStatusFilter("ALL")}
                        isActive={statusFilter === "ALL"}
                        activeColor="ring-red-500"
                    />

                    <SummaryCard
                        icon={<Clock className="w-5 h-5 text-orange-600" />}
                        iconBg="bg-orange-50"
                        label="Pending"
                        value={summaryStats.pending.toString()}
                        onClick={() => setStatusFilter("PENDING")}
                        isActive={statusFilter === "PENDING"}
                        activeColor="ring-orange-500"
                    />

                    <SummaryCard
                        icon={<CheckCircle2 className="w-5 h-5 text-blue-600" />}
                        iconBg="bg-blue-50"
                        label="Approved"
                        value={summaryStats.approved.toString()}
                        onClick={() => setStatusFilter("APPROVED")}
                        isActive={statusFilter === "APPROVED"}
                        activeColor="ring-blue-500"
                    />

                    <SummaryCard
                        icon={<CreditCard className="w-5 h-5 text-emerald-600" />}
                        iconBg="bg-emerald-50"
                        label="Paid"
                        value={summaryStats.paid.toString()}
                        onClick={() => setStatusFilter("PAID")}
                        isActive={statusFilter === "PAID"}
                        activeColor="ring-emerald-500"
                    />

                    <SummaryCard
                        icon={<XCircle className="w-5 h-5 text-neutral-600" />}
                        iconBg="bg-neutral-100"
                        label="Rejected"
                        value={summaryStats.rejected.toString()}
                        onClick={() => setStatusFilter("REJECTED")}
                        isActive={statusFilter === "REJECTED"}
                        activeColor="ring-neutral-500"
                    />
                </SummaryCardsRow>

                {/* ADVANCED TOOLBAR - MOBILE (1 LINE) - iOS GLASSY */}
                <div className="flex md:hidden items-center gap-1.5 p-2 rounded-2xl bg-white/50 backdrop-blur-md border border-white/60 shadow-sm">
                    {/* Search Icon Button */}
                    <button
                        onClick={() => {
                            const input = document.getElementById('mobile-search-input');
                            if (input) {
                                input.classList.toggle('hidden');
                                if (!input.classList.contains('hidden')) input.focus();
                            }
                        }}
                        className={clsx(
                            "p-2.5 rounded-full backdrop-blur-sm border shadow-sm transition-all",
                            searchTerm
                                ? "bg-red-500/10 border-red-200/60 text-red-600"
                                : "bg-white/80 border-white/60 text-neutral-500"
                        )}
                    >
                        <Search className="w-4 h-4" />
                    </button>

                    {/* Month Selector - iOS Glassy */}
                    <div className="flex items-center gap-0.5 p-1 bg-white/80 backdrop-blur-sm rounded-full border border-white/60 shadow-sm">
                        <button onClick={() => handleMonthChange("prev")} className="p-1.5 text-neutral-400 hover:text-neutral-600 transition-colors">
                            <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[11px] font-bold text-neutral-700 min-w-[42px] text-center">
                            {format(currentMonth, "MMM-yy")}
                        </span>
                        <button onClick={() => handleMonthChange("next")} className="p-1.5 text-neutral-400 hover:text-neutral-600 transition-colors">
                            <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {/* Project Dropdown (Native) */}
                    <div className="relative">
                        <div className="h-9 px-3 bg-white/80 backdrop-blur-sm rounded-full border border-white/60 text-[11px] font-bold text-neutral-700 shadow-sm flex items-center gap-1">
                            <span>{selectedProject === "ALL" ? "ALL" : projects.find(p => p.id === selectedProject)?.projectCode || "ALL"}</span>
                            <ChevronDown className="w-3 h-3 text-neutral-400" />
                        </div>
                        <select
                            value={selectedProject}
                            onChange={(e) => setSelectedProject(e.target.value)}
                            className="absolute inset-0 w-full h-full opacity-0 appearance-none cursor-pointer"
                        >
                            <option value="ALL">All Projects</option>
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.projectCode} - {p.projectName}</option>
                            ))}
                        </select>
                    </div>

                    {/* Category Filter (Native) */}
                    <div className="relative">
                        <div className={clsx(
                            "p-2.5 rounded-full backdrop-blur-sm border shadow-sm transition-all flex items-center justify-center",
                            categoryFilter !== "ALL"
                                ? "bg-neutral-900 text-white border-neutral-800"
                                : "bg-white/80 border-white/60 text-neutral-500"
                        )}>
                            <Filter className="w-4 h-4" />
                        </div>
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="absolute inset-0 w-full h-full opacity-0 appearance-none cursor-pointer"
                        >
                            {availableCategories.map(cat => (
                                <option key={cat} value={cat}>
                                    {cat === 'ALL' ? 'All Types' : cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase().replace(/_/g, ' ')}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* Export Icon - iOS Glassy */}
                    <button
                        onClick={handleExport}
                        disabled={isExporting || filteredItems.length === 0}
                        className={clsx(
                            "p-2.5 bg-white/80 backdrop-blur-sm rounded-full border border-white/60 shadow-sm text-neutral-500 hover:text-neutral-700 transition-colors",
                            (isExporting || filteredItems.length === 0) && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    </button>

                    {/* New Icon - Red Accent */}
                    {!isBefore(currentMonth, startOfMonth(new Date())) && (
                        <button
                            onClick={() => { setEditingItem(null); setIsDrawerOpen(true); }}
                            className="p-2.5 bg-red-600 rounded-full text-white shadow-md shadow-red-200/50 hover:bg-red-700 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Mobile Search Input (Hidden by default) - iOS Glassy */}
                <input
                    id="mobile-search-input"
                    type="text"
                    placeholder="Search..."
                    className="hidden md:hidden w-full mt-2 h-10 px-4 bg-white/80 backdrop-blur-sm rounded-xl border border-white/60 shadow-sm text-sm text-neutral-700 placeholder:text-neutral-400"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />

                {/* ADVANCED TOOLBAR - DESKTOP */}
                <div className="hidden md:flex flex-row gap-4 justify-between items-center p-2 rounded-2xl bg-white/40 backdrop-blur-sm border border-white/40 shadow-sm">
                    {/* LEFT: Search, Month, Project, Category */}
                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                        <div className="h-10 flex items-center gap-2 px-3 bg-white rounded-xl border border-neutral-200 shadow-sm focus-within:ring-2 focus-within:ring-red-500/10 focus-within:border-red-500/50 transition-all w-full md:w-[220px]">
                            <Search className="w-4 h-4 text-neutral-400" />
                            <input
                                type="text"
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-transparent border-none outline-none text-sm font-medium text-neutral-700 placeholder:text-neutral-400 w-full"
                            />
                        </div>

                        <div className="h-10 flex items-center gap-1 p-1 bg-white rounded-xl border border-neutral-200 shadow-sm">
                            <button onClick={() => handleMonthChange("prev")} className="w-8 h-8 flex items-center justify-center hover:bg-neutral-100 rounded-lg text-neutral-400 hover:text-neutral-600 transition-all">
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <div className="px-2 text-sm font-bold text-neutral-700 whitespace-nowrap min-w-[100px] text-center">
                                {format(currentMonth, "MMM yyyy")}
                            </div>
                            <button onClick={() => handleMonthChange("next")} className="w-8 h-8 flex items-center justify-center hover:bg-neutral-100 rounded-lg text-neutral-400 hover:text-neutral-600 transition-all">
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Project Dropdown (Desktop - Native styled) */}
                        <div className="relative group">
                            <select
                                value={selectedProject}
                                onChange={(e) => setSelectedProject(e.target.value)}
                                className="h-10 pl-3 pr-8 bg-white rounded-xl border border-neutral-200 shadow-sm text-sm font-medium text-neutral-700 focus:outline-none focus:ring-2 focus:ring-red-500/10 hover:border-red-500/30 transition-all appearance-none cursor-pointer min-w-[150px] max-w-[200px]"
                            >
                                <option value="ALL">All Projects</option>
                                {projects.map(p => (
                                    <option key={p.id} value={p.id}>{p.projectCode} - {p.projectName}</option>
                                ))}
                            </select>
                            <ChevronDown className="w-4 h-4 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>

                        {/* Category Dropdown (Desktop) */}
                        <div className="relative group">
                            <select
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                                className="h-10 pl-3 pr-8 bg-white rounded-xl border border-neutral-200 shadow-sm text-sm font-medium text-neutral-700 focus:outline-none focus:ring-2 focus:ring-red-500/10 hover:border-red-500/30 transition-all appearance-none cursor-pointer min-w-[150px]"
                            >
                                {availableCategories.map(cat => (
                                    <option key={cat} value={cat}>
                                        {cat === 'ALL' ? 'All Categories' : cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase().replace(/_/g, ' ')}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="w-4 h-4 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                    </div>

                    {/* RIGHT: Export, New */}
                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
                        <div className="w-px h-8 bg-neutral-200 mx-1 hidden md:block" />

                        <button
                            onClick={handleExport}
                            disabled={isExporting || filteredItems.length === 0}
                            className={clsx(
                                "h-10 px-4 bg-white border border-neutral-200 text-neutral-600 rounded-xl text-sm font-bold shadow-sm hover:bg-neutral-50 hover:text-neutral-900 transition-all flex items-center gap-2",
                                (isExporting || filteredItems.length === 0) && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                            <span className="hidden sm:inline">{isExporting ? "Exporting..." : "Export"}</span>
                        </button>

                        <button
                            onClick={() => { setEditingItem(null); setIsDrawerOpen(true); }}
                            className="h-10 px-5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-red-200 active:scale-95 transition-all flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" /> New Claim
                        </button>
                    </div>
                </div>

                {/* MOBILE CARD LIST */}
                <div className="mt-6 block md:hidden space-y-2">
                    {filteredItems.length === 0 ? (
                        <div className="bg-white/40 backdrop-blur-md rounded-2xl border border-white/50 shadow-sm p-6 text-center">
                            <Package className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
                            <h4 className="text-sm font-semibold text-neutral-700">
                                {searchTerm ? "No results found" :
                                    statusFilter !== "ALL" ? `No ${statusFilter.toLowerCase()} requests` :
                                        isBefore(currentMonth, startOfMonth(new Date()))
                                            ? `No claims in ${format(currentMonth, "MMMM")}`
                                            : "No claims yet"}
                            </h4>
                            {/* Only show New Request button for current or future months */}
                            {!searchTerm && statusFilter === "ALL" && !isBefore(currentMonth, startOfMonth(new Date())) && (
                                <button
                                    onClick={() => { setEditingItem(null); setIsDrawerOpen(true); }}
                                    className="mt-3 px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg"
                                >
                                    <Plus className="w-3 h-3 inline mr-1" />New Claim
                                </button>
                            )}
                        </div>
                    ) : (
                        filteredItems.map((item) => {
                            const isUnpaidApproved = item.status === "APPROVED" && item.financial_status !== "PAID" && false; // Reimburse logic
                            const isRejected = item.status === "REJECTED";
                            const isApproved = item.status === "APPROVED";

                            return (
                                <div
                                    key={item.id}
                                    onClick={() => {
                                        if (isTeamView) setViewingItem(item);
                                        else { setEditingItem(item); setIsDrawerOpen(true); }
                                    }}
                                    className={clsx(
                                        "backdrop-blur-md rounded-xl border shadow-sm px-3 py-2.5 cursor-pointer active:scale-[0.99] transition-all",
                                        isRejected
                                            ? "bg-neutral-100/80 border-neutral-200/60 opacity-60"
                                            : isApproved
                                                ? "bg-emerald-50/60 border-emerald-100/60"
                                                : "bg-white/60 border-white/50"
                                    )}
                                >
                                    {/* Line 1: Item + Amount + Status */}
                                    <div className="flex items-center justify-between gap-2 mb-1.5">
                                        <div className="text-[12px] font-semibold text-neutral-900 leading-tight flex-1 min-w-0">
                                            {item.description}
                                        </div>
                                        <span className="text-[12px] font-bold text-neutral-900 tabular-nums whitespace-nowrap">{formatCurrency(item.amount)}</span>
                                        <StatusBadge status={item.status} />
                                    </div>

                                    {/* Line 2: Project + Date + Category + Submitter + Actions */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1 text-[10px] text-neutral-400">
                                            <span className="font-bold text-neutral-500">{item.project?.project_code || "N/A"}</span>
                                            <span>•</span>
                                            <span>{format(new Date(item.created_at), "dd MMM")}</span>
                                            <span>•</span>
                                            <span className="capitalize">{item.category?.replace(/_/g, ' ').toLowerCase() || 'Uncategorized'}</span>
                                            {isTeamView && (
                                                <>
                                                    <span>•</span>
                                                    <span>{cleanEntityName(item.staff_name).split(' ')[0]}</span>
                                                </>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1">
                                            {isTeamView && item.status === "PENDING" && (
                                                <>
                                                    <button onClick={(e) => { e.stopPropagation(); setApprovingItem(item); }} className="p-1 text-emerald-600 bg-emerald-50 rounded"><CheckCircle2 className="w-3.5 h-3.5" /></button>
                                                    <button onClick={(e) => { e.stopPropagation(); setRejectingItem(item); }} className="p-1 text-rose-600 bg-rose-50 rounded"><Ban className="w-3.5 h-3.5" /></button>
                                                </>
                                            )}
                                            {isTeamView && item.status === "APPROVED" && (
                                                <button onClick={(e) => { e.stopPropagation(); setPayingItem(item); }} className="p-1 text-emerald-600 bg-emerald-50 rounded"><CreditCard className="w-3.5 h-3.5" /></button>
                                            )}
                                            {/* Edit for owner */}
                                            {!isTeamView && (item.status === "DRAFT" || item.status === "NEED_REVISION" || item.status === "PENDING" || item.status === "REJECTED") && (
                                                <button onClick={(e) => { e.stopPropagation(); setEditingItem(item); setIsDrawerOpen(true); }} className="p-1 text-neutral-500 bg-neutral-100 rounded"><Pencil className="w-3.5 h-3.5" /></button>
                                            )}
                                            <button onClick={(e) => { e.stopPropagation(); setViewingItem(item); }} className="p-1 text-blue-600 bg-blue-50 rounded"><Eye className="w-3.5 h-3.5" /></button>
                                        </div>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>

                {/* DESKTOP TABLE */}
                <div className="hidden md:block bg-white/40 backdrop-blur-md rounded-3xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.02)] overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-neutral-100 bg-white/20">
                                    <th className="px-6 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest cursor-pointer hover:text-neutral-600 transition-colors" onClick={() => handleSort('created_at')}>
                                        <span className="flex items-center gap-1">
                                            Date
                                            {sortColumn === 'created_at' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                                        </span>
                                    </th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest cursor-pointer hover:text-neutral-600 transition-colors" onClick={() => handleSort('project_name')}>
                                        <span className="flex items-center gap-1">
                                            Project
                                            {sortColumn === 'project_name' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                                        </span>
                                    </th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Description</th>
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
                                            <td className="px-6 py-4 text-xs font-medium text-neutral-500">{format(new Date(item.created_at), "dd MMM yyyy")}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-bold bg-neutral-100 px-1.5 py-0.5 rounded w-fit text-neutral-500 mb-1">{item.project?.project_code || "N/A"}</span>
                                                    <span className="text-xs font-medium text-neutral-900 truncate max-w-[120px]">{cleanEntityName(item.project?.project_name || "Unknown")}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-xs font-semibold text-neutral-900">{item.description}</div>
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

                                                    {!isTeamView && (item.status === "PENDING" || item.status === "REJECTED" || item.status === "DRAFT" || item.status === "NEED_REVISION") && (
                                                        <>
                                                            <button onClick={(e) => { e.stopPropagation(); setEditingItem(item); setIsDrawerOpen(true); }} className="p-1.5 hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 rounded-full"><Pencil className="w-4 h-4" /></button>
                                                            <button onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (confirm("Are you sure you want to delete this request?")) {
                                                                    deleteReimburseRequest(item.id).then(() => loadData());
                                                                }
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
                </div>
            </div>

            {/* DRAWERS & MODALS (kept as is) */}
            <NewRequestDrawer
                isOpen={isDrawerOpen}
                initialType="REIMBURSE"
                hideSwitcher={true}
                initialData={editingItem || undefined}
                onClose={() => { setIsDrawerOpen(false); setEditingItem(null); }}
                onSuccess={() => { setIsDrawerOpen(false); setEditingItem(null); loadData(); }}
            />

            {approvingItem && (
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
            )}

            {rejectingItem && (
                <RejectModal
                    item={rejectingItem}
                    onClose={() => setRejectingItem(null)}
                    onReject={async (reason) => {
                        await updateReimburseStatus(rejectingItem.id, { status: "REJECTED", rejection_reason: reason });
                        setRejectingItem(null);
                        loadData();
                    }}
                />
            )}

            {revisingItem && (
                <ReviseModal
                    item={revisingItem}
                    onClose={() => setRevisingItem(null)}
                    onRevise={async (reason) => {
                        await updateReimburseStatus(revisingItem.id, { status: "NEED_REVISION", revision_reason: reason });
                        setRevisingItem(null);
                        loadData();
                    }}
                />
            )}

            {payingItem && (
                <PayModal
                    item={payingItem}
                    fundingSources={fundingSources}
                    isLoadingSources={isLoadingSources}
                    onClose={() => setPayingItem(null)}
                    onPay={async (sourceId, date, notes, proofFile) => {
                        let proofUrl = null;
                        if (proofFile) {
                            const ext = proofFile.name.split('.').pop();
                            const path = `reimburse/transfer/${payingItem.id}_${Date.now()}.${ext}`;
                            proofUrl = await uploadFinanceFileExact(proofFile, path);
                        }
                        await updateReimburseStatus(payingItem.id, {
                            status: "PAID",
                            payment_date: date,
                            notes,
                            payment_proof_url: proofUrl || undefined,
                            source_of_fund_id: sourceId
                        });
                        setPayingItem(null);
                        loadData();
                    }}
                />
            )}

            {viewingItem && (
                <ViewModal
                    item={viewingItem}
                    onClose={() => setViewingItem(null)}
                    onPreview={(tab) => setPreviewingDocument({ item: viewingItem, initialTab: tab })}
                />
            )}

            {previewingDocument && (
                <InvoicePreviewModal
                    item={previewingDocument.item}
                    initialTab={previewingDocument.initialTab}
                    onClose={() => setPreviewingDocument(null)}
                />
            )}
        </FinancePageWrapper>
    );
}

