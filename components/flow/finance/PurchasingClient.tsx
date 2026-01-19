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
    Plus,
    ChevronLeft,
    ChevronRight,
    Loader2,
    Download,
    Pencil,
    Trash2,
    Ban,
    ChevronUp,
    ChevronDown,
    CheckCircle2,
    Send,
    XCircle,
    Package,
    ExternalLink,
    Copy,
    Check
} from "lucide-react";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { PurchasingItem, ApprovalStatus, FundingSource, PurchaseType } from "@/lib/types/finance-types";
import { Project } from "@/types/project";
import { formatCurrency, getPrimaryStatus, STATUS_THEMES, formatStatus, cleanEntityName } from "./modules/utils";
import { useSearchParams } from "next/navigation";
import { fetchPurchasingRequests, fetchFundingSources, updatePurchasingStatus, deletePurchasingRequest } from "@/lib/api/finance";
import { fetchAllProjects } from "@/lib/api/projects";
import { fetchTeamMembers } from "@/lib/api/clock_team";
import { fetchDefaultWorkspaceId } from "@/lib/api/templates";
import { NewRequestDrawer } from "./modules/NewRequestDrawer";
import { getFinanceFileUrl, uploadFinanceFile, uploadFinanceFileExact } from "@/lib/api/storage";

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

function PayModal({
    item,
    onClose,
    onPay,
    fundingSources,
    isLoadingSources
}: {
    item: PurchasingItem;
    onClose: () => void;
    onPay: (source: string, date: string, notes: string, proofFile: File | null) => void;
    fundingSources: FundingSource[];
    isLoadingSources: boolean;
}) {
    const [selectedSource, setSelectedSource] = useState("");
    const [paymentDate, setPaymentDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [notes, setNotes] = useState("");
    const [proofFile, setProofFile] = useState<File | null>(null);

    const activeSources = fundingSources.filter(s => !s.is_archived && s.is_active);

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-md" onClick={onClose} />
            <div className="relative w-full max-w-md bg-white/95 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-white/50 overflow-hidden animate-in fade-in zoom-in duration-300">
                <div className="p-8">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-neutral-900">Process Payment</h3>
                        <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
                            <X className="w-5 h-5 text-neutral-400" />
                        </button>
                    </div>

                    <div className="space-y-6">
                        <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-100 space-y-3">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-neutral-500 font-medium">Amount to Pay</span>
                                <div className="flex items-center gap-1">
                                    <div className="text-right">
                                        <div className="font-bold text-neutral-900 text-sm">{formatCurrency((item as any).approved_amount || (item as any).details?.approved_amount || item.amount)}</div>
                                        {((item as any).approved_amount || (item as any).details?.approved_amount) && ((item as any).approved_amount || (item as any).details?.approved_amount) !== item.amount && (
                                            <div className="text-[10px] text-orange-600 line-through opacity-75">{formatCurrency(item.amount)}</div>
                                        )}
                                    </div>
                                    <CopyButton text={String((item as any).approved_amount || (item as any).details?.approved_amount || item.amount)} />
                                </div>
                            </div>

                            <hr className="border-neutral-200/50" />

                            <div className="flex justify-between items-center text-xs">
                                <span className="text-neutral-500 font-medium">Submitter</span>
                                <div className="flex items-center gap-1">
                                    <span className="font-bold text-neutral-900">{item.created_by_name}</span>
                                    <div className="w-6" /> {/* Spacer for alignment */}
                                </div>
                            </div>

                            <div className="flex justify-between items-start text-xs">
                                <span className="text-neutral-500 font-medium mt-0.5">Beneficiary Account</span>
                                <div className="flex items-center gap-1">
                                    {(item.beneficiary_bank || item.beneficiary_number) ? (
                                        <div className="text-right">
                                            <div className="font-bold text-neutral-900">{item.beneficiary_name || item.created_by_name}</div>
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

                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest px-1 mb-2 block">Source of Fund</label>
                                <div className="relative group">
                                    <select
                                        value={selectedSource || ""}
                                        onChange={(e) => setSelectedSource(e.target.value)}
                                        disabled={isLoadingSources}
                                        className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500/50 appearance-none transition-all disabled:opacity-50"
                                    >
                                        <option value="">Select funding source...</option>
                                        {activeSources.map(source => (
                                            <option key={source.id} value={source.id}>
                                                {source.name} ({source.type === 'BANK' ? source.provider : 'Cash'})
                                            </option>
                                        ))}
                                    </select>
                                    {isLoadingSources && (
                                        <div className="absolute right-10 top-1/2 -translate-y-1/2">
                                            <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />
                                        </div>
                                    )}
                                    <ChevronDown className="w-4 h-4 text-neutral-400 absolute right-4 top-1/2 -translate-y-1/2 group-focus-within:text-red-500 transition-colors pointer-events-none" />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest px-1 mb-2 block">Payment Date</label>
                                <input
                                    type="date"
                                    value={paymentDate}
                                    onChange={(e) => setPaymentDate(e.target.value)}
                                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500/50 transition-all font-medium"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest px-1 mb-2 block">Proof of Transfer</label>
                                <div className="relative">
                                    <input
                                        type="file"
                                        accept="image/*,.pdf"
                                        onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                                        className="hidden"
                                        id="proof-upload"
                                    />
                                    <label
                                        htmlFor="proof-upload"
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed transition-all cursor-pointer ${proofFile
                                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                            : 'bg-neutral-50 border-neutral-300 hover:bg-neutral-100 text-neutral-500'
                                            }`}
                                    >
                                        <div className={`p-2 rounded-lg ${proofFile ? 'bg-emerald-100' : 'bg-neutral-200'}`}>
                                            {proofFile ? <CheckCircle2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                        </div>
                                        <div className="flex-1 truncate text-sm font-medium">
                                            {proofFile ? proofFile.name : "Upload image or PDF..."}
                                        </div>
                                    </label>
                                    {proofFile && (
                                        <button
                                            onClick={(e) => { e.preventDefault(); setProofFile(null); }}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-black/5 rounded-full text-neutral-400 hover:text-rose-500 transition-colors"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest px-1 mb-2 block">Notes</label>
                                <textarea
                                    rows={2}
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Add payment notes..."
                                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500/50 transition-all resize-none"
                                />
                            </div>
                        </div>

                        <button
                            onClick={() => onPay(selectedSource, paymentDate, notes, proofFile)}
                            disabled={!selectedSource}
                            className="w-full h-12 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-lg shadow-red-200 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            <CreditCard className="w-4 h-4" />
                            Confirm Payment
                        </button>
                    </div>
                </div>
            </div>
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
            <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-md" onClick={onClose} />
            <div className="relative w-full max-w-md bg-white/95 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-white/50 overflow-hidden animate-in fade-in zoom-in duration-300">
                <div className="p-8">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-neutral-900">Reject Request</h3>
                        <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
                            <X className="w-5 h-5 text-neutral-400" />
                        </button>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-100">
                            <div className="text-sm font-semibold text-neutral-900">{item.description}</div>
                            <div className="text-xs text-neutral-500 mt-1">{item.vendor} • {item.project_name}</div>
                            <div className="text-lg font-bold text-neutral-900 mt-2">{formatCurrency(item.amount)}</div>
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest px-1 mb-2 block">
                                Rejection Reason <span className="text-rose-500">*</span>
                            </label>
                            <textarea
                                rows={4}
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Please provide a reason for rejection..."
                                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500/50 transition-all resize-none"
                            />
                        </div>

                        <button
                            onClick={() => onReject(reason)}
                            disabled={!reason.trim()}
                            className="w-full h-12 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-lg shadow-rose-200 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            <Ban className="w-4 h-4" />
                            Confirm Rejection
                        </button>
                    </div>
                </div>
            </div>
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

    // Auto-switch tab if only one exists
    useEffect(() => {
        if (!item.invoice_url && item.payment_proof_url) setActiveTab('proof');
    }, [item.invoice_url, item.payment_proof_url]);

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
                        {/* Basic Info */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Date</div>
                                <div className="text-sm font-medium text-neutral-900">{format(new Date(item.date), "dd MMM yyyy")}</div>
                            </div>
                            <div>
                                <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Project</div>
                                <div className="text-sm font-medium text-neutral-900">{item.project_name}</div>
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Description</div>
                            <div className="text-sm font-medium text-neutral-900">{item.description}</div>
                            <div className="text-xs text-neutral-500 mt-1">{item.quantity} {item.unit} • {item.vendor}</div>
                        </div>

                        {/* Amount & Status */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Amount</div>
                                <div className="flex items-center gap-1">
                                    <span className="text-lg font-bold text-neutral-900">{formatCurrency((item as any).approved_amount || (item as any).details?.approved_amount || item.amount)}</span>
                                    <CopyButton text={String((item as any).approved_amount || (item as any).details?.approved_amount || item.amount)} />
                                </div>
                                {((item as any).approved_amount || (item as any).details?.approved_amount) && ((item as any).approved_amount || (item as any).details?.approved_amount) !== item.amount && (
                                    <div className="text-[10px] text-orange-600 line-through opacity-75 mt-0.5 font-medium">
                                        {formatCurrency(item.amount)}
                                    </div>
                                )}
                            </div>
                            <div>
                                <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Status</div>
                                <div className="text-sm font-medium text-neutral-900">{item.approval_status} / {item.financial_status}</div>
                            </div>
                        </div>

                        {/* Category */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Category</div>
                                <div className="text-sm font-medium text-neutral-900">{item.type}</div>
                            </div>
                            <div>
                                <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Subcategory</div>
                                <div className="text-sm font-medium text-neutral-900">{item.subcategory || "-"}</div>
                            </div>
                        </div>

                        {/* Beneficiary Details */}
                        {(item.beneficiary_bank || item.beneficiary_number || item.beneficiary_name) && (
                            <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100 space-y-2">
                                <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                                    <CreditCard className="w-3 h-3" /> Beneficiary Info
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider mb-0.5">Bank</div>
                                        <div className="text-sm font-bold text-neutral-900">{item.beneficiary_bank || "-"}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider mb-0.5">Number</div>
                                        <div className="flex items-center gap-1">
                                            <span className="text-sm font-bold text-neutral-900 font-mono tracking-tight">{item.beneficiary_number || "-"}</span>
                                            {item.beneficiary_number && <CopyButton text={item.beneficiary_number} />}
                                        </div>
                                    </div>
                                    <div className="col-span-2">
                                        <div className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider mb-0.5">Account Name</div>
                                        <div className="text-sm font-bold text-neutral-900">{item.beneficiary_name || "-"}</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Documents Tabs */}
                        <div>
                            <div className="flex p-1 bg-neutral-100 rounded-xl mb-4">
                                <button
                                    onClick={() => setActiveTab('invoice')}
                                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'invoice'
                                        ? 'bg-white text-neutral-900 shadow-sm'
                                        : 'text-neutral-500 hover:text-neutral-700'
                                        }`}
                                >
                                    Invoice
                                </button>
                                <button
                                    onClick={() => setActiveTab('proof')}
                                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'proof'
                                        ? 'bg-white text-neutral-900 shadow-sm'
                                        : 'text-neutral-500 hover:text-neutral-700'
                                        }`}
                                >
                                    Proof of Transfer
                                </button>
                            </div>

                            {activeTab === 'invoice' && (
                                <div className="space-y-2">
                                    {item.invoice_url ? (
                                        <div className="border border-neutral-200 rounded-xl overflow-hidden bg-neutral-50 group relative">
                                            {item.invoice_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                                <button
                                                    onClick={() => onPreview('invoice')}
                                                    className="w-full text-left cursor-zoom-in relative block"
                                                >
                                                    {invoiceUrl ? (
                                                        <img src={invoiceUrl} alt="Invoice" className="w-full max-h-48 object-contain" />
                                                    ) : (
                                                        <div className="h-48 flex items-center justify-center bg-neutral-100/50">
                                                            <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
                                                        </div>
                                                    )}
                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                        <div className="bg-white/90 rounded-full px-3 py-1 text-xs font-bold text-neutral-700 shadow-sm">Click to Zoom</div>
                                                    </div>
                                                </button>
                                            ) : (
                                                <div className="p-4 flex items-center justify-between">
                                                    <span className="text-sm text-neutral-600">Attached file</span>
                                                    <a
                                                        href={invoiceUrl || '#'}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                                                    >
                                                        Open File
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="p-8 text-center bg-neutral-50 rounded-xl border border-dashed border-neutral-200">
                                            <p className="text-xs text-neutral-400">No invoice attached</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'proof' && (
                                <div className="space-y-2">
                                    {item.payment_proof_url ? (
                                        <div className="border border-neutral-200 rounded-xl overflow-hidden bg-neutral-50 group relative">
                                            {item.payment_proof_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                                <button
                                                    onClick={() => onPreview('proof')}
                                                    className="w-full text-left cursor-zoom-in relative block"
                                                >
                                                    {proofUrl ? (
                                                        <img src={proofUrl} alt="Proof" className="w-full max-h-48 object-contain" />
                                                    ) : (
                                                        <div className="h-48 flex items-center justify-center bg-neutral-100/50">
                                                            <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
                                                        </div>
                                                    )}
                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                        <div className="bg-white/90 rounded-full px-3 py-1 text-xs font-bold text-neutral-700 shadow-sm">Click to Zoom</div>
                                                    </div>
                                                </button>
                                            ) : (
                                                <div className="p-4 flex items-center justify-between">
                                                    <span className="text-sm text-neutral-600">Attached proof</span>
                                                    <a
                                                        href={proofUrl || '#'}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="px-3 py-1.5 text-xs font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                                                    >
                                                        Open File
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="p-8 text-center bg-neutral-50 rounded-xl border border-dashed border-neutral-200">
                                            <p className="text-xs text-neutral-400">No payment proof uploaded</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Notes */}
                        {(item.notes || item.rejection_reason) && (
                            <div>
                                <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Notes ({item.approval_status === "REJECTED" ? "Rejection Reason" : "Payment Notes"})</div>
                                <div className="text-sm text-neutral-700 bg-neutral-50 p-3 rounded-lg">
                                    {item.approval_status === "REJECTED" && item.rejection_reason ? item.rejection_reason : item.notes || "-"}
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={onClose}
                        className="w-full h-12 mt-6 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl font-medium transition-all"
                    >
                        Close
                    </button>
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
            const flattened: PurchasingItem[] = [];

            requests.forEach((req: any) => {
                const creatorName = profileMap.get(req.created_by)?.username || "Unknown";
                const creatorRole = profileMap.get(req.created_by)?.role || "Unknown Role";

                // Handle requests without items - create a single entry for the request
                if (!req.items || req.items.length === 0) {
                    flattened.push({
                        id: req.id,
                        request_id: req.id,
                        date: req.date,
                        project_id: req.project_id,
                        project_code: req.project?.project_code || "N/A",
                        project_name: req.project?.project_name || "Unknown",
                        vendor: req.vendor || "",
                        description: req.description || "No description",
                        quantity: 1,
                        unit: "pcs",
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
                        notes: req.notes,
                        created_by: req.created_by,
                        created_by_name: creatorName,
                        created_by_role: creatorRole,
                        submitted_by_name: creatorName,
                        created_at: req.created_at,
                        updated_at: req.updated_at,
                        beneficiary_bank: req.beneficiary_bank,
                        beneficiary_number: req.beneficiary_number,
                        beneficiary_name: req.beneficiary_name
                    });
                } else {
                    req.items.forEach((item: any) => {
                        flattened.push({
                            id: item.id,
                            request_id: req.id,
                            date: req.date,
                            project_id: req.project_id,
                            project_code: req.project?.project_code || "N/A",
                            project_name: req.project?.project_name || "Unknown",
                            vendor: req.vendor || "",
                            description: item.name,
                            quantity: item.qty,
                            unit: item.unit,
                            type: req.type,
                            subcategory: req.subcategory || "",
                            amount: item.total,
                            approval_status: req.approval_status,
                            purchase_stage: req.purchase_stage,
                            financial_status: req.financial_status,
                            invoice_url: req.invoice_url,
                            payment_proof_url: req.payment_proof_url,
                            payment_date: req.payment_date,
                            rejection_reason: req.rejection_reason,
                            notes: req.notes,
                            created_by: req.created_by,
                            created_by_name: creatorName,
                            created_by_role: creatorRole,
                            submitted_by_name: creatorName,
                            created_at: req.created_at,
                            updated_at: req.updated_at,
                            beneficiary_bank: req.beneficiary_bank,
                            beneficiary_number: req.beneficiary_number,
                            beneficiary_name: req.beneficiary_name
                        });
                    });
                }
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

    const [payingItem, setPayingItem] = useState<PurchasingItem | null>(null);
    const [rejectingItem, setRejectingItem] = useState<PurchasingItem | null>(null);
    const [viewingItem, setViewingItem] = useState<PurchasingItem | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: keyof PurchasingItem; direction: 'asc' | 'desc' } | null>(
        { key: 'date', direction: 'desc' }
    );

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
            else if (action === 'approve') newStatus = 'APPROVED';
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
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];
                if (aValue === undefined || bValue === undefined) return 0;
                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return current;
    }, [baseItems, statusFilter, sortConfig]);

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
                                                if (isTeamView) {
                                                    setViewingItem(item);
                                                } else {
                                                    setEditingItem(item);
                                                    setIsDrawerOpen(true);
                                                }
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
                                                    <span className="hover:text-neutral-600 transition-colors tracking-tight text-[10px]">{cleanEntityName(item.vendor)}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-0.5 group/type">
                                                    <span className="inline-flex items-center gap-1 text-[12px] font-medium text-neutral-900 w-fit tracking-tight group-hover/type:text-neutral-600 transition-colors">
                                                        {item.type}
                                                    </span>
                                                    <span className="text-[10px] font-medium text-neutral-400 group-hover/type:text-neutral-500 transition-colors">
                                                        {item.subcategory}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="text-[12px] font-bold text-neutral-900 tabular-nums tracking-tight">
                                                    {formatCurrency(item.amount)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {(() => {
                                                    const primaryStatus = getPrimaryStatus(
                                                        item.approval_status,
                                                        item.purchase_stage,
                                                        item.financial_status
                                                    );
                                                    const theme = STATUS_THEMES[primaryStatus];
                                                    return (
                                                        <span className={clsx(
                                                            "px-1.5 py-0.5 rounded-full text-[10px] font-bold w-fit uppercase tracking-widest shadow-sm backdrop-blur-md border border-white/10",
                                                            theme.bg, theme.text
                                                        )}>
                                                            {primaryStatus}
                                                        </span>
                                                    );
                                                })()}
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
                                                                    <button onClick={(e) => { e.stopPropagation(); openConfirmDialog('approve', item); }} className="p-1.5 text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-all" title="Approve">
                                                                        <CheckCircle2 className="w-4 h-4" strokeWidth={1.5} />
                                                                    </button>
                                                                    <button onClick={(e) => { e.stopPropagation(); openConfirmDialog('reject', item); }} className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-all" title="Reject">
                                                                        <Ban className="w-4 h-4" strokeWidth={1.5} />
                                                                    </button>
                                                                </>
                                                            )}
                                                            {item.approval_status === "APPROVED" && item.financial_status !== "PAID" && (
                                                                <button onClick={(e) => { e.stopPropagation(); setPayingItem(item); }} className="p-1.5 text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-all" title="Mark as Paid">
                                                                    <CreditCard className="w-4 h-4" strokeWidth={1.5} />
                                                                </button>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <>
                                                            {item.approval_status === "DRAFT" && (
                                                                <>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setEditingItem(item);
                                                                            setIsDrawerOpen(true);
                                                                        }}
                                                                        className="p-1.5 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all"
                                                                        title="Edit Request"
                                                                    >
                                                                        <Pencil className="w-4 h-4" strokeWidth={1.5} />
                                                                    </button>
                                                                    <button onClick={(e) => { e.stopPropagation(); openConfirmDialog('submit', item); }} className="p-1.5 text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-all" title="Submit Request">
                                                                        <Send className="w-4 h-4" strokeWidth={1.5} />
                                                                    </button>
                                                                    <button onClick={(e) => { e.stopPropagation(); openConfirmDialog('delete', item); }} className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all" title="Delete Request">
                                                                        <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                                                                    </button>
                                                                </>
                                                            )}
                                                            {item.approval_status === "SUBMITTED" && (
                                                                <>
                                                                    <button onClick={(e) => { e.stopPropagation(); openConfirmDialog('cancel', item); }} className="p-1.5 text-neutral-400 hover:text-orange-600 hover:bg-orange-50 rounded-full transition-all" title="Cancel Request">
                                                                        <XCircle className="w-4 h-4" strokeWidth={1.5} />
                                                                    </button>
                                                                    <button onClick={(e) => { e.stopPropagation(); openConfirmDialog('delete', item); }} className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all" title="Delete Request">
                                                                        <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                                                                    </button>
                                                                </>
                                                            )}
                                                            {(item.approval_status === "CANCELLED" || item.approval_status === "REJECTED") && (
                                                                <button onClick={(e) => { e.stopPropagation(); openConfirmDialog('delete', item); }} className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all" title="Delete Request">
                                                                    <Trash2 className="w-4 h-4" strokeWidth={1.5} />
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
