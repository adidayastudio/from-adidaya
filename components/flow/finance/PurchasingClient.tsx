"use client";

import { useState, useMemo, useEffect } from "react";
import FinanceHeader from "@/components/flow/finance/FinanceHeader";
import FinancePageWrapper from "@/components/flow/finance/FinancePageWrapper";
import { useFinance } from "./FinanceContext";
import {
    Search,
    Eye,
    CreditCard,
    X,
    Plus, Loader2, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Download, Pencil, Trash2, CheckCircle2, AlertCircle, Ban, Clock, AlertTriangle,
    Send,
    XCircle,
    Package,
    ExternalLink,
    Copy,
    Check,
    Upload
} from "lucide-react";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { PurchasingItem, ApprovalStatus, FundingSource, PurchaseType, PurchaseStage } from "@/lib/types/finance-types";
import { Project } from "@/types/project";
import { formatCurrency, getPrimaryStatus, STATUS_THEMES, formatStatus, cleanEntityName } from "./modules/utils";
import { useSearchParams } from "next/navigation";
import { fetchPurchasingRequests, fetchFundingSources, updatePurchasingStatus, deletePurchasingRequest } from "@/lib/client/finance-api";
import { fetchAllProjects } from "@/lib/api/projects";
import { fetchTeamMembers } from "@/lib/api/clock_team";
import { fetchDefaultWorkspaceId } from "@/lib/api/templates";
import { NewRequestDrawer } from "./modules/NewRequestDrawer";
import { getFinanceFileUrl, uploadFinanceFile, uploadFinanceFileExact } from "@/lib/api/storage";

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
    item: PurchasingItem,
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
                                    <div className="font-bold text-neutral-900 text-sm">{formatCurrency(item.amount)}</div>
                                </div>
                                <CopyButton text={String(item.amount)} />
                            </div>
                        </div>

                        <hr className="border-neutral-200/50" />

                        <div className="flex justify-between items-center text-xs">
                            <span className="text-neutral-500 font-medium">Submitter</span>
                            <div className="flex items-center gap-1">
                                <span className="font-bold text-neutral-900">{item.submitted_by_name || "-"}</span>
                                <div className="w-6" />
                            </div>
                        </div>

                        <div className="flex justify-between items-start text-xs">
                            <span className="text-neutral-500 font-medium mt-0.5">Beneficiary Account</span>
                            <div className="flex items-center gap-1">
                                {(item.beneficiary_bank || item.beneficiary_number) ? (
                                    <div className="text-right">
                                        <div className="font-bold text-neutral-900">{item.beneficiary_name}</div>
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

                    {(!item.invoice_url || !item.beneficiary_bank || !item.beneficiary_number) && (
                        <div className="p-4 rounded-xl bg-red-50 border border-red-100 flex gap-3 animate-in fade-in slide-in-from-top-1">
                            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                            <div>
                                <h4 className="text-[11px] font-bold text-red-700 uppercase tracking-wider mb-1">Missing Requirements</h4>
                                <p className="text-[11px] text-red-600 font-medium tracking-tight">
                                    Invoice and complete beneficiary details are mandatory before you can process this payment.
                                </p>
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Source of Fund</label>
                        {isLoadingSources ? (
                            <div className="h-10 w-full bg-neutral-100 rounded-xl animate-pulse" />
                        ) : (
                            <div className="relative group">
                                <select
                                    value={source}
                                    onChange={(e) => setSource(e.target.value)}
                                    className="w-full h-11 pl-4 pr-10 text-sm border border-neutral-200 rounded-xl bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/30 transition-all font-medium appearance-none cursor-pointer hover:border-emerald-500/30"
                                >
                                    <option value="">Select source...</option>
                                    {fundingSources.filter(s => !s.is_archived && s.is_active).map(s => (
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
                        <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add payment notes..." className="w-full h-11 px-4 text-sm border border-neutral-200 rounded-xl bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/30 transition-all font-medium placeholder:text-neutral-400" />
                    </div>
                </div>

                <div className="flex gap-3 pt-2">
                    <button onClick={onClose} disabled={isSubmitting} className="flex-1 py-3 text-sm font-bold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-all">Cancel</button>
                    <button
                        onClick={handleConfirm}
                        disabled={!source || !date || isSubmitting || !item.invoice_url || !item.beneficiary_bank || !item.beneficiary_number}
                        className="flex-1 py-3 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-200"
                    >
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : "Confirm Payment"}
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
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl overflow-hidden">
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
                            <div className="text-sm font-medium text-neutral-900">{item.description}</div>
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
                    {item.approval_status === "APPROVED" && (!item.invoice_url || !item.beneficiary_bank || !item.beneficiary_number) && (
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
    const { viewMode, userId, isLoading: isAuthLoading } = useFinance();
    const searchParams = useSearchParams();
    const [searchTerm, setSearchTerm] = useState("");
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [items, setItems] = useState<PurchasingItem[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [projects, setProjects] = useState<Project[]>([]);

    // Funding Sources State
    const [fundingSources, setFundingSources] = useState<FundingSource[]>([]);
    const [isLoadingSources, setIsLoadingSources] = useState(false);

    const initialStatus = searchParams.get("status") as ApprovalStatus | "ALL" | null;
    const [statusFilter, setStatusFilter] = useState<ApprovalStatus | "ALL">("ALL"); // Simplified initial state handling

    // Filters
    const [selectedProject, setSelectedProject] = useState<string>("ALL");
    const [categoryFilter, setCategoryFilter] = useState<PurchaseType | "ALL">("ALL");
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [isExporting, setIsExporting] = useState(false);

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
    const loadData = async () => {
        setIsLoadingData(true);
        try {
            const [requests, profiles] = await Promise.all([
                fetchPurchasingRequests(),
                fetchTeamMembers()
            ]);

            const profileMap = new Map(profiles.map(p => [p.id, p]));
            const flattened: PurchasingItem[] = requests.map((req: any) => {
                const creatorName = profileMap.get(req.created_by)?.username || "Unknown";
                const creatorRole = profileMap.get(req.created_by)?.role || "Unknown Role";

                return {
                    id: req.id,
                    request_id: req.id,
                    date: req.date,
                    project_id: req.project_id,
                    project_code: req.project?.project_code || "N/A",
                    project_name: req.project?.project_name || "Unknown",
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

    // Initial load
    useEffect(() => {
        loadData();
        fetchAllProjects().then(setProjects);
    }, []);

    // Load funding sources when paying items or on mount (lazy load implies better perf but simpler to just load)
    useEffect(() => {
        if (viewMode === 'team') {
            // Only team (finance) usually pays, so load for them
            loadFundingSources();
        }
    }, [viewMode]);

    const handleMonthChange = (direction: "prev" | "next") => {
        const newDate = new Date(currentMonth);
        newDate.setMonth(newDate.getMonth() + (direction === "next" ? 1 : -1));
        setCurrentMonth(newDate);
    };

    const handleExport = async () => {
        if (filteredItems.length === 0) return;
        setIsExporting(true);

        try {
            // 1. Prepare Meta
            const project = projects.find(p => p.id === selectedProject);
            const projectCode = project ? (project.projectCode || "PRG") : "ALL";
            const projectName = project ? project.projectName : (selectedProject === "ALL" ? "All Projects" : "Selected Project");
            const documentName = isTeamView ? "Team Purchasing Report" : "My Purchasing Report";
            const generatedAt = new Date().toLocaleString("id-ID");

            const startStr = format(startOfMonth(currentMonth), "dd MMM");
            const endStr = format(endOfMonth(currentMonth), "dd MMM yyyy");
            const periodText = `Monthly Report (${startStr} – ${endStr})`;

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

    const [approvingItem, setApprovingItem] = useState<PurchasingItem | null>(null);
    const [payingItem, setPayingItem] = useState<PurchasingItem | null>(null);
    const [rejectingItem, setRejectingItem] = useState<PurchasingItem | null>(null);
    const [revisingItem, setRevisingItem] = useState<PurchasingItem | null>(null);
    const [viewingItem, setViewingItem] = useState<PurchasingItem | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: keyof PurchasingItem; direction: 'asc' | 'desc' } | null>(
        { key: 'date', direction: 'desc' }
    );

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

    const isTeamView = viewMode === "team";

    // 1. Base Items: Filtered by everything EXCEPT Status (for summary cards)
    const baseItems = useMemo(() => {
        let current = [...items];

        if (!isTeamView) {
            current = current.filter(item => item.created_by === userId);
        }

        // Search
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            current = current.filter(item =>
                item.description.toLowerCase().includes(lower) ||
                item.vendor.toLowerCase().includes(lower) ||
                item.project_name.toLowerCase().includes(lower) ||
                item.project_code.toLowerCase().includes(lower)
            );
        }

        // Month Filter
        current = current.filter(item => {
            const itemDate = new Date(item.date);
            return itemDate.getMonth() === currentMonth.getMonth() &&
                itemDate.getFullYear() === currentMonth.getFullYear();
        });

        // Project Filter
        if (selectedProject !== "ALL") {
            current = current.filter(item => item.project_id === selectedProject);
        }

        // Category Filter
        if (categoryFilter !== "ALL") {
            current = current.filter(item => item.type === categoryFilter);
        }

        return current;
    }, [items, isTeamView, userId, searchTerm, currentMonth, selectedProject, categoryFilter]);

    // 2. Summary Stats derived from Base Items
    const summaryStats = useMemo(() => {
        return {
            total: baseItems.length,
            pending: baseItems.filter(i => i.approval_status === "SUBMITTED").length,
            approved: baseItems.filter(i => i.approval_status === "APPROVED" && i.financial_status !== "PAID").length,
            paid: baseItems.filter(i => i.financial_status === "PAID").length,
            rejected: baseItems.filter(i => i.approval_status === "REJECTED").length
        };
    }, [baseItems]);

    // 3. Final Filtered Items: Base Items + Status Filter
    const filteredItems = useMemo(() => {
        let current = [...baseItems];

        if (statusFilter !== "ALL") {
            if (statusFilter === "PAID") {
                current = current.filter(i => i.financial_status === "PAID");
            } else {
                current = current.filter(item => item.approval_status === statusFilter);
            }
        }

        if (sortConfig) {
            current.sort((a, b) => {
                // Special handling for status sorting with custom order
                if (sortConfig.key === 'approval_status') {
                    const aIndex = STATUS_ORDER.indexOf(a.approval_status);
                    const bIndex = STATUS_ORDER.indexOf(b.approval_status);
                    return sortConfig.direction === 'asc' ? aIndex - bIndex : bIndex - aIndex;
                }

                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];
                if (aValue === undefined || bValue === undefined) return 0;
                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return current;
    }, [baseItems, statusFilter, sortConfig, STATUS_ORDER]);

    if (isAuthLoading || isLoadingData) {
        return (
            <FinancePageWrapper
                breadcrumbItems={[{ label: "Flow" }, { label: "Finance" }, { label: "Purchasing" }]}
                header={<FinanceHeader title="Purchasing" subtitle="Loading..." />}
            >
                <div className="animate-pulse h-96 bg-neutral-100 rounded-xl" />
            </FinancePageWrapper>
        );
    }

    return (
        <FinancePageWrapper
            breadcrumbItems={[{ label: "Flow" }, { label: "Finance" }, { label: "Purchasing" }]}
            header={
                <FinanceHeader
                    title="Purchasing"
                    subtitle={isTeamView ? "Manage all staff purchase requests." : "Track your material and tool requests."}
                />
            }
        >
            <div className="flex flex-col gap-6">
                {/* SUMMARY CARDS */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 overflow-visible pb-4">
                    <button
                        onClick={() => setStatusFilter("ALL")}
                        className={clsx(
                            "relative p-5 rounded-3xl border text-left transition-all duration-300 group overflow-hidden",
                            statusFilter === "ALL"
                                ? "bg-red-600 border-red-500 shadow-xl shadow-red-200"
                                : "bg-white/60 hover:bg-white border-white/60 hover:border-white shadow-sm hover:shadow-md"
                        )}
                    >
                        <div className={clsx("text-sm font-medium mb-1", statusFilter === "ALL" ? "text-red-100" : "text-neutral-500")}>Total Requests</div>
                        <div className={clsx("text-3xl font-bold tracking-tight", statusFilter === "ALL" ? "text-white" : "text-neutral-900")}>
                            {summaryStats.total}
                        </div>
                    </button>

                    <button
                        onClick={() => setStatusFilter("SUBMITTED")}
                        className={clsx(
                            "relative p-5 rounded-3xl border text-left transition-all duration-300 group overflow-hidden",
                            statusFilter === "SUBMITTED"
                                ? "bg-orange-500 border-orange-400 shadow-xl shadow-orange-200"
                                : "bg-white/60 hover:bg-white border-white/60 hover:border-white shadow-sm hover:shadow-md"
                        )}
                    >
                        <div className={clsx("text-sm font-medium mb-1", statusFilter === "SUBMITTED" ? "text-orange-100" : "text-neutral-500")}>Pending</div>
                        <div className={clsx("text-3xl font-bold tracking-tight", statusFilter === "SUBMITTED" ? "text-white" : "text-neutral-900")}>
                            {summaryStats.pending}
                        </div>
                    </button>

                    <button
                        onClick={() => setStatusFilter("APPROVED")}
                        className={clsx(
                            "relative p-5 rounded-3xl border text-left transition-all duration-300 group overflow-hidden",
                            statusFilter === "APPROVED"
                                ? "bg-blue-600 border-blue-500 shadow-xl shadow-blue-200"
                                : "bg-white/60 hover:bg-white border-white/60 hover:border-white shadow-sm hover:shadow-md"
                        )}
                    >
                        <div className={clsx("text-sm font-medium mb-1", statusFilter === "APPROVED" ? "text-blue-100" : "text-neutral-500")}>Approved</div>
                        <div className={clsx("text-3xl font-bold tracking-tight", statusFilter === "APPROVED" ? "text-white" : "text-neutral-900")}>
                            {summaryStats.approved}
                        </div>
                    </button>

                    <button
                        onClick={() => setStatusFilter("PAID")}
                        className={clsx(
                            "relative p-5 rounded-3xl border text-left transition-all duration-300 group overflow-hidden",
                            statusFilter === "PAID"
                                ? "bg-emerald-600 border-emerald-500 shadow-xl shadow-emerald-200"
                                : "bg-white/60 hover:bg-white border-white/60 hover:border-white shadow-sm hover:shadow-md"
                        )}
                    >
                        <div className={clsx("text-sm font-medium mb-1", statusFilter === "PAID" ? "text-emerald-100" : "text-neutral-500")}>Paid</div>
                        <div className={clsx("text-3xl font-bold tracking-tight", statusFilter === "PAID" ? "text-white" : "text-neutral-900")}>
                            {summaryStats.paid}
                        </div>
                    </button>

                    <button
                        onClick={() => setStatusFilter("REJECTED")}
                        className={clsx(
                            "relative p-5 rounded-3xl border text-left transition-all duration-300 group overflow-hidden",
                            statusFilter === "REJECTED"
                                ? "bg-neutral-800 border-neutral-700 shadow-xl shadow-neutral-200"
                                : "bg-white/60 hover:bg-white border-white/60 hover:border-white shadow-sm hover:shadow-md"
                        )}
                    >
                        <div className={clsx("text-sm font-medium mb-1", statusFilter === "REJECTED" ? "text-neutral-300" : "text-neutral-500")}>Rejected</div>
                        <div className={clsx("text-3xl font-bold tracking-tight", statusFilter === "REJECTED" ? "text-white" : "text-neutral-900")}>
                            {summaryStats.rejected}
                        </div>
                    </button>
                </div>

                {/* ADVANCED TOOLBAR */}
                <div
                    className="flex flex-col md:flex-row gap-4 justify-between items-center p-2 rounded-2xl bg-white/40 backdrop-blur-sm border border-white/40"
                >
                    {/* LEFT: Search, Month, Project */}
                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                        <div className="h-10 flex items-center gap-2 px-3 bg-white rounded-xl border border-neutral-200 shadow-sm focus-within:ring-2 focus-within:ring-red-500/10 focus-within:border-red-500/50 transition-all w-full md:w-[220px]">
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
                            <div className="px-2 text-sm font-bold text-neutral-700 whitespace-nowrap min-w-[100px] text-center">
                                {format(currentMonth, "MMM yyyy")}
                            </div>
                            <button
                                onClick={() => handleMonthChange("next")}
                                className="w-8 h-8 flex items-center justify-center hover:bg-neutral-100 rounded-lg text-neutral-400 hover:text-neutral-600 transition-all"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>

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
                    </div>

                    {/* RIGHT: Category, Export, New */}
                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
                        {/* Category Toggle */}
                        <div className="h-10 flex items-center p-1 bg-white rounded-xl border border-neutral-200 shadow-sm">
                            {(['ALL', 'MATERIAL', 'TOOL', 'SERVICE'] as const).map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setCategoryFilter(cat)}
                                    className={clsx(
                                        "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                                        categoryFilter === cat
                                            ? "bg-neutral-900 text-white shadow-md"
                                            : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50"
                                    )}
                                >
                                    {cat === "ALL" ? "All" : cat}
                                </button>
                            ))}
                        </div>

                        <div className="w-px h-8 bg-neutral-200 mx-1 hidden md:block" />

                        <button
                            onClick={handleExport}
                            className="h-10 px-4 bg-white border border-neutral-200 text-neutral-600 rounded-xl text-sm font-bold shadow-sm hover:bg-neutral-50 hover:text-neutral-900 transition-all flex items-center gap-2"
                        >
                            <Download className="w-4 h-4" />
                            <span className="hidden sm:inline">Export</span>
                        </button>

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

            {/* TABLE */}
            <div className="mt-6 bg-white/40 backdrop-blur-md rounded-3xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.02)] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-neutral-100 bg-white/20">
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
                                    <td colSpan={isTeamView ? 7 : 6} className="py-16 text-center">
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
                                                            `There are no ${statusFilter.toLowerCase()} purchase requests for ${format(currentMonth, "MMMM yyyy")}.` :
                                                            isTeamView ?
                                                                "When team members submit purchase requests, they'll appear here for your review." :
                                                                "Start by creating your first purchase request. Track materials, tools, and services."}
                                                </p>
                                            </div>
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
                                                <div className="text-[12px] font-semibold text-neutral-900 tracking-tight leading-tight mb-0.5">{item.description}</div>
                                                <div className="text-[10px] font-normal text-neutral-400 flex items-center gap-1.5">
                                                    <span className="text-neutral-500 font-medium">{item.quantity} {item.unit}</span>
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
                                                        </>
                                                    ) : (
                                                        <>
                                                            {(item.approval_status === "DRAFT" || item.approval_status === "NEED_REVISION" || item.approval_status === "APPROVED") && (
                                                                <button onClick={(e) => { e.stopPropagation(); setEditingItem(item); setIsDrawerOpen(true); }} className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-full transition-all" title="Edit Request">
                                                                    <Pencil className="w-4 h-4" strokeWidth={1.5} />
                                                                </button>
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

            {
                payingItem && (
                    <PayModal
                        item={payingItem}
                        onClose={() => setPayingItem(null)}
                        onPay={async (source, date, notes, proofFile) => {
                            try {
                                const requestId = payingItem.request_id || payingItem.id;
                                console.log("Processing payment for request:", requestId);

                                let paymentProofUrl = undefined;
                                if (proofFile) {
                                    try {
                                        // Create a unique path: proofs/request_id-timestamp-filename
                                        const path = `proofs/${requestId}-${Date.now()}-${proofFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
                                        paymentProofUrl = await uploadFinanceFileExact(proofFile, path);
                                    } catch (uploadError) {
                                        console.error("Failed to upload proof:", uploadError);
                                        alert("Failed to upload payment proof. Continuing with payment...");
                                    }
                                }

                                const success = await updatePurchasingStatus(requestId, {
                                    financial_status: "PAID",
                                    payment_date: date,
                                    source_of_fund_id: source,
                                    notes: notes,
                                    payment_proof_url: paymentProofUrl || undefined
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
            {rejectingItem && (
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
            )}

            {/* View Modal */}
            {viewingItem && (
                <ViewModal
                    item={viewingItem}
                    onClose={() => setViewingItem(null)}
                    onPreview={(tab) => viewingItem && setPreviewingDocument({ item: viewingItem, initialTab: tab })}
                />
            )}

            {/* Invoice Preview Modal */}
            {previewingDocument && (
                <InvoicePreviewModal
                    item={previewingDocument.item}
                    initialTab={previewingDocument.initialTab}
                    onClose={() => setPreviewingDocument(null)}
                />
            )}

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
            />

            {/* Confirmation Modal */}
            {revisingItem && (
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
            )}

            {approvingItem && (
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
            )}

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
        </FinancePageWrapper >
    );
}
