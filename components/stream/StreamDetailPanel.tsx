"use client";

import React, { useState, useRef, useEffect } from "react";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import {
    X,
    ArrowUpRight,
    Briefcase,
    Share2,
    FileText,
    Image as ImageIcon,
    Ban,
    RotateCcw,
    Check,
    Trash2,
    CreditCard,
    Package,
    Upload,
    Copy,
    AlertCircle,
    DollarSign,
    CheckCircle2,
    ExternalLink,
    Loader2,
} from "lucide-react";
import type { FeedItem } from "@/lib/stream/types";
import { getProjectBadge } from "@/lib/stream/stream-feed";
import { deleteStreamActivity, updateStreamActivityParsedData } from "@/lib/stream/stream-actions";
import { generateExport } from "@/lib/export/export-utils";
import { fetchPurchasingRequestById } from "@/lib/client/finance-api";
import { getFinanceFileUrl } from "@/lib/api/storage";
import { toast } from "react-hot-toast";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

interface StreamDetailPanelProps {
    item: FeedItem | null;
    onClose: () => void;
    onReloadFeed?: () => void;
}

// Copy Button Helper
function CopyButton({ text, className }: { text: string; className?: string }) {
    const [copied, setCopied] = useState(false);
    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success("Copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <button
            onClick={handleCopy}
            className={clsx(
                "p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-all text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200",
                className
            )}
            title="Copy to clipboard"
        >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
    );
}

function formatCurrency(val?: number | string | null): string {
    if (val === undefined || val === null || val === "" || isNaN(Number(val))) return "Rp 0";
    return `Rp ${Number(val).toLocaleString("id-ID")}`;
}

function formatStatusText(str?: string): string {
    if (!str) return "-";
    return str.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

function formatStructuredId(type: 'PO' | 'RE', projectNumber?: string, requestNumber?: number, projectCode?: string) {
    if (!projectNumber && !projectCode) return '';
    const seq = requestNumber ? String(requestNumber).padStart(5, '0') : "00000";

    // Use projectNumber if available, otherwise projectCode
    const projId = projectNumber || projectCode || '???';

    // Ensure numeric project identifiers are padded to at least 3 digits
    const proj = isNaN(Number(projId)) ? projId : String(projId).padStart(3, '0');

    return `${type}-${proj}-${seq}`;
}

export default function StreamDetailPanel({ item, onClose, onReloadFeed }: StreamDetailPanelProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [fullDetails, setFullDetails] = useState<any>(null);
    const [activeDocModal, setActiveDocModal] = useState<"invoice" | "proof" | null>(null);
    const [docUrls, setDocUrls] = useState<{ url: string; name: string }[]>([]);
    const [isLoadingDocs, setIsLoadingDocs] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);

    const initialMeta = item?.metadata || {};
    const isExpense = item?.parentModule === "finance" || item?.type === "expense_logged" || item?.entityType === "expense";
    
    // Clean prId prefix correctly to guarantee real database fetch matching UUID
    let rawPrId = item?.entityId || initialMeta.id || item?.id || "";
    const prId = typeof rawPrId === "string" ? rawPrId.replace("pr-", "").trim() : null;

    // Fetch complete details from DB/API if not fully loaded
    useEffect(() => {
        let isMounted = true;
        if (prId && isExpense) {
            fetchPurchasingRequestById(prId).then((res) => {
                if (isMounted && res) {
                    setFullDetails(res);
                }
            }).catch(err => console.error("Error fetching full details:", err));
        } else {
            setFullDetails(null);
        }
        return () => { isMounted = false; };
    }, [prId, isExpense]);

    const meta = fullDetails ? { ...initialMeta, ...fullDetails } : initialMeta;

    const [submitterProfile, setSubmitterProfile] = useState<any>(null);

    // Fetch submitter user profile dynamically
    useEffect(() => {
        let isMounted = true;
        const userId = meta.created_by || item?.userId;
        const isUuid = userId && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(userId);
        
        if (isUuid) {
            const supabase = createClient();
            supabase
                .from("profiles")
                .select("username, full_name")
                .eq("id", userId)
                .single()
                .then(({ data }) => {
                    if (isMounted && data) {
                        setSubmitterProfile(data);
                    }
                })
                .catch(err => console.debug("Profile fetch error:", err));
        } else {
            setSubmitterProfile(null);
        }
        return () => { isMounted = false; };
    }, [meta.created_by, item?.userId]);

    const [approvalStatus, setApprovalStatus] = useState<string>(
        meta.approval_status || item?.status || "SUBMITTED"
    );
    const [purchaseStage, setPurchaseStage] = useState<string>(
        meta.purchase_stage || "PLANNED"
    );

    useEffect(() => {
        if (meta.approval_status) setApprovalStatus(meta.approval_status);
        if (meta.purchase_stage) setPurchaseStage(meta.purchase_stage);
    }, [meta.approval_status, meta.purchase_stage]);

    if (!item) return null;

    const projBadge = getProjectBadge(item);
    const isTask = item.type === "task_added" || item.entityType === "task";
    const isProject = item.type === "project_created" || item.entityType === "project";

    // 100% REAL DATA EXTRACTION FROM SUPABASE DATABASE ROW & METADATA
    const formattedDate = formatDate(item.timestamp);
    const requestNumber = meta.request_number || meta.po_number;
    const projectNumber = meta.project?.project_number || meta.project_number;
    const projectCode = meta.project?.project_code || meta.project_code || projBadge.code;
    
    // Structured ID PO matching format PO-039-00261
    const documentId = requestNumber && (projectNumber || projectCode)
        ? formatStructuredId("PO", projectNumber, Number(requestNumber), projectCode)
        : meta.document_id || `REQ-${projBadge.code}-${item.id.slice(-4).toUpperCase()}`;

    const submitterName = submitterProfile?.full_name || submitterProfile?.username || meta.submitted_by_name || meta.created_by_name || item.userName || "Adidaya Member";
    const rawPriority = String(meta.priority || "Normal");
    const priorityLevel = rawPriority.charAt(0).toUpperCase() + rawPriority.slice(1).toLowerCase();
    const categoryName = meta.type || meta.category || item.submodule || "General";
    const subcategoryName = meta.subcategory || "-";
    const vendorName = meta.vendor || meta.payee || meta.beneficiary_name || "-";
    const descriptionText = item.description || item.title || meta.notes || item.rawInput || "-";

    // Financial calculations
    const rawAmount = meta.amount !== undefined && meta.amount !== null ? Number(meta.amount) : (item as any).amount ? Number((item as any).amount) : 0;
    const approvedAmount = meta.approved_amount !== undefined && meta.approved_amount !== null ? Number(meta.approved_amount) : rawAmount;
    const paidAmount = meta.paid_amount ? Number(meta.paid_amount) : 0;
    const isPartiallyPaid = meta.financial_status === "PARTIALLY_PAID";
    const isPaidStatus = meta.financial_status === "PAID" || item.event === "Paid";
    const financialStatusLabel = isPaidStatus ? "Paid" : isPartiallyPaid ? "Partially Paid" : formatStatusText(meta.financial_status || "UNPAID");

    // Beneficiary details
    const beneficiaryBank = meta.beneficiary_bank;
    const beneficiaryNumber = meta.beneficiary_number;
    const beneficiaryName = meta.beneficiary_name;
    const hasBeneficiary = !!(beneficiaryBank || beneficiaryNumber || beneficiaryName);

    // Item details array
    const itemList = Array.isArray(meta.items) ? meta.items : (Array.isArray(meta.purchasing_items) ? meta.purchasing_items : (Array.isArray((item as any).items) ? (item as any).items : []));

    // Documents
    const invoiceUrl = meta.invoice_url;
    const invoices = Array.isArray(meta.invoices) ? meta.invoices : (Array.isArray(meta.purchasing_invoices) ? meta.purchasing_invoices : (invoiceUrl ? [invoiceUrl] : []));
    const paymentProofUrl = meta.payment_proof_url;
    const proofFiles = paymentProofUrl ? paymentProofUrl.split(',').map((s: string) => s.trim()).filter(Boolean) : [];

    // Revision & Rejection Reasons
    const revisionReason = meta.revision_reason;
    const rejectionReason = meta.rejection_reason;
    const isRevision = approvalStatus === "NEED_REVISION" || !!revisionReason;
    const isRejected = approvalStatus === "REJECTED" || !!rejectionReason;

    // Dynamic progress step states based on real status
    const isApproved = approvalStatus === "APPROVED" || meta.approval_status === "APPROVED" || item.status === "confirmed";
    const isOverdue = item.event === "Overdue" || item.subtitle?.toLowerCase().includes("due");
    const isPaid = isPaidStatus || item.event === "Paid";
    const isReceived = purchaseStage === "RECEIVED" || meta.purchase_stage === "RECEIVED" || item.event === "Received";

    // Document Lightbox/Drawer Opener
    const openDocModal = async (type: "invoice" | "proof") => {
        setActiveDocModal(type);
        setIsLoadingDocs(true);
        const urls: { url: string; name: string }[] = [];

        try {
            if (type === "invoice") {
                const invoicesList = invoices;
                if (Array.isArray(invoicesList) && invoicesList.length > 0) {
                    for (let i = 0; i < invoicesList.length; i++) {
                        const inv = invoicesList[i];
                        const rawPath = typeof inv === "string" ? inv : inv.invoice_url;
                        const name = typeof inv === "string" ? `Invoice ${i + 1}` : (inv.invoice_name || `Invoice ${i + 1}`);
                        if (rawPath) {
                            const fileUrl = rawPath.startsWith("http") ? rawPath : await getFinanceFileUrl(rawPath);
                            if (fileUrl) urls.push({ url: fileUrl, name });
                        }
                    }
                }
            } else if (type === "proof") {
                if (paymentProofUrl) {
                    const paths = paymentProofUrl.split(",").map((s: string) => s.trim()).filter(Boolean);
                    for (let i = 0; i < paths.length; i++) {
                        const rawPath = paths[i];
                        const fileUrl = rawPath.startsWith("http") ? rawPath : await getFinanceFileUrl(rawPath);
                        if (fileUrl) urls.push({ url: fileUrl, name: `Payment Proof ${i + 1}` });
                    }
                }
            }
        } catch (err) {
            console.error("Error loading document URLs:", err);
            toast.error("Failed to load document");
        } finally {
            setDocUrls(urls);
            setIsLoadingDocs(false);
        }
    };

    // Export Handlers
    const handleExport = async (type: "jpg" | "pdf") => {
        if (!contentRef.current || isExporting) return;
        setIsExporting(true);
        const toastId = toast.loading(`Generating ${type.toUpperCase()}...`);
        try {
            const fileName = `${documentId}-${Date.now()}`;
            const attachments: any[] = [];
            const metadata = {
                title: documentId,
                subtitle: 'Purchase Request Detail',
                date: new Date().toLocaleString(),
                isDark: typeof document !== "undefined" ? document.documentElement.classList.contains('dark') : false
            };

            await generateExport(
                contentRef.current,
                fileName,
                type,
                attachments,
                metadata,
                (exporting) => setIsExporting(exporting)
            );
            toast.success(`${type.toUpperCase()} exported successfully!`, { id: toastId });
        } catch (err) {
            console.error("Export failed:", err);
            toast.error(`Failed to export ${type.toUpperCase()}`, { id: toastId });
        } finally {
            setIsExporting(false);
        }
    };

    const handleShare = () => {
        navigator.clipboard.writeText(`${window.location.origin}/flow/finance`);
        toast.success("Finance link copied to clipboard!");
    };

    // Actions
    const handleDelete = async () => {
        setIsSubmitting(true);
        try {
            await deleteStreamActivity(item.id);
            toast.success("Activity deleted");
            onClose();
            onReloadFeed?.();
        } catch (err) {
            console.error("Failed to delete activity:", err);
            toast.error("Failed to delete activity");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleApprove = async () => {
        setIsSubmitting(true);
        try {
            setApprovalStatus("APPROVED");
            await updateStreamActivityParsedData(item.id, { ...(item.metadata as any), approval_status: "APPROVED", status: "confirmed" });
            toast.success("Request approved!");
            onReloadFeed?.();
            onClose();
        } catch (err) {
            console.error("Failed to approve:", err);
            toast.error("Failed to approve request");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRevise = async () => {
        setIsSubmitting(true);
        try {
            setApprovalStatus("NEED_REVISION");
            await updateStreamActivityParsedData(item.id, { ...(item.metadata as any), approval_status: "NEED_REVISION" });
            toast.success("Revision requested");
            onReloadFeed?.();
            onClose();
        } catch (err) {
            console.error("Failed to request revision:", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReject = async () => {
        setIsSubmitting(true);
        try {
            setApprovalStatus("REJECTED");
            await updateStreamActivityParsedData(item.id, { ...(item.metadata as any), approval_status: "REJECTED" });
            toast.success("Request rejected");
            onReloadFeed?.();
            onClose();
        } catch (err) {
            console.error("Failed to reject:", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                className={clsx(
                    "w-full h-full max-w-full flex flex-col justify-between relative",
                    "bg-white/95 dark:bg-neutral-900/95 backdrop-blur-2xl",
                    "border border-neutral-200/80 dark:border-neutral-800/80",
                    "rounded-[24px] overflow-hidden shadow-xl p-4 sm:p-5"
                )}
            >
                {/* DOCUMENT LIGHTBOX MODAL */}
                {activeDocModal && (
                    <div className="absolute inset-0 z-[100] bg-neutral-900/80 backdrop-blur-md flex flex-col p-4 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
                            <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                <FileText className="w-4 h-4 text-blue-400" />
                                {activeDocModal === 'invoice' ? 'Invoices' : 'Payment Proofs'}
                            </h4>
                            <button
                                onClick={() => setActiveDocModal(null)}
                                className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto py-3 space-y-3 scrollbar-hide">
                            {isLoadingDocs ? (
                                <div className="h-full flex flex-col items-center justify-center gap-2 text-white/70">
                                    <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                                    <span className="text-xs font-medium">Fetching document...</span>
                                </div>
                            ) : docUrls.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-xs text-white/50 font-medium">
                                    No document attachment found for this item.
                                </div>
                            ) : (
                                docUrls.map((doc, idx) => {
                                    const isImage = /\.(jpg|jpeg|png|webp)$/i.test(doc.name) || doc.url.includes("image");
                                    const isPdf = /\.pdf$/i.test(doc.name) || doc.url.includes("pdf");

                                    return (
                                        <div key={idx} className="bg-white/10 border border-white/15 rounded-2xl p-3 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-white truncate max-w-[200px]">{doc.name}</span>
                                                <a
                                                    href={doc.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10.5px] font-bold flex items-center gap-1 transition-all"
                                                >
                                                    Open Link <ExternalLink className="w-3 h-3" />
                                                </a>
                                            </div>

                                            {isImage ? (
                                                <div className="rounded-xl overflow-hidden bg-black/40 flex justify-center max-h-72 border border-white/10">
                                                    <img src={doc.url} alt={doc.name} className="object-contain max-h-72 w-full" />
                                                </div>
                                            ) : isPdf ? (
                                                <iframe src={doc.url} className="w-full h-72 rounded-xl border border-white/10" title={doc.name} />
                                            ) : (
                                                <div className="p-3 bg-white/5 rounded-xl text-center text-xs text-white/60">
                                                    Click "Open Link" to view or download document.
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}

                {/* OFFICIAL FINANCE PURCHASE REQUEST DRAWER (REAL DATA) */}
                {isExpense ? (
                    <div className="flex flex-col h-full justify-between gap-3">
                        {/* DRAWER TOP HEADER */}
                        <div className="flex items-center justify-between pb-3 border-b border-neutral-200/50 dark:border-neutral-800/50 shrink-0">
                            <h2 className="text-[16px] font-black text-neutral-900 dark:text-white tracking-tight truncate max-w-[160px]">
                                {documentId}
                            </h2>

                            <div className="flex items-center gap-1.5 shrink-0">
                                {/* Export JPG/PDF Pill */}
                                <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 border border-neutral-200/60 dark:border-neutral-700/60 rounded-full h-7 px-1">
                                    <button
                                        onClick={() => handleExport("jpg")}
                                        disabled={isExporting}
                                        className="px-1.5 h-5 rounded-full flex items-center gap-1 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors disabled:opacity-50"
                                        title="Export JPG"
                                    >
                                        <ImageIcon className="w-3 h-3" />
                                        <span className="text-[9px] font-bold">JPG</span>
                                    </button>
                                    <div className="w-[1px] h-3 bg-neutral-200 dark:bg-neutral-700" />
                                    <button
                                        onClick={() => handleExport("pdf")}
                                        disabled={isExporting}
                                        className="px-1.5 h-5 rounded-full flex items-center gap-1 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors disabled:opacity-50"
                                        title="Export PDF"
                                    >
                                        <FileText className="w-3 h-3" />
                                        <span className="text-[9px] font-bold">PDF</span>
                                    </button>
                                </div>

                                {/* Share Button */}
                                <button
                                    onClick={handleShare}
                                    className="w-7 h-7 rounded-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200/60 dark:border-neutral-700/60 flex items-center justify-center text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
                                    title="Share Link"
                                >
                                    <Share2 className="w-3.5 h-3.5" />
                                </button>

                                {/* Close Button */}
                                <button
                                    onClick={onClose}
                                    className="w-7 h-7 rounded-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200/60 dark:border-neutral-700/60 flex items-center justify-center text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* DRAWER SCROLLABLE BODY */}
                        <div className="flex-1 overflow-y-auto scrollbar-hide py-2 space-y-4" ref={contentRef}>
                            {/* REVISION ALERT BOX */}
                            {isRevision && revisionReason && (
                                <div className="p-3.5 bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 rounded-2xl flex gap-2.5">
                                    <AlertCircle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                                    <div>
                                        <div className="text-[11px] font-bold text-orange-800 dark:text-orange-400">Revision Requested</div>
                                        <p className="text-[11.5px] text-orange-700 dark:text-orange-300 font-medium leading-relaxed mt-0.5">{revisionReason}</p>
                                    </div>
                                </div>
                            )}

                            {/* REJECTION ALERT BOX */}
                            {isRejected && rejectionReason && (
                                <div className="p-3.5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl flex gap-2.5">
                                    <Ban className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                    <div>
                                        <div className="text-[11px] font-bold text-red-800 dark:text-red-400">Rejection Reason</div>
                                        <p className="text-[11.5px] text-red-700 dark:text-red-300 font-medium leading-relaxed mt-0.5">{rejectionReason}</p>
                                    </div>
                                </div>
                            )}

                            {/* SECTION: GENERAL INFORMATION */}
                            <div className="space-y-3.5">
                                <h3 className="text-[12.5px] font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                                    <Briefcase className="w-3.5 h-3.5 text-neutral-700 dark:text-neutral-300" />
                                    General Information
                                </h3>

                                {/* PROGRESS STEP TIMELINE CARD */}
                                <div className="p-3.5 rounded-2xl bg-neutral-50/80 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-700/40 space-y-2.5">
                                    <span className="text-[9.5px] font-bold text-neutral-400 uppercase tracking-wider block">
                                        Progress
                                    </span>
                                    <div className="grid grid-cols-5 gap-1 text-center relative pt-1">
                                        {/* Step 1: Submitted */}
                                        <div className="flex flex-col items-center space-y-0.5">
                                            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-blue-500 shadow-xs" />
                                            <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400">
                                                {isRevision ? "Revision" : "Submitted"}
                                            </span>
                                            <span className="text-[8px] text-neutral-400 font-medium">{formattedDate}</span>
                                        </div>
                                        {/* Step 2: Approved / Rejected */}
                                        <div className="flex flex-col items-center space-y-0.5">
                                            <div className={clsx(
                                                "w-2.5 h-2.5 rounded-full border-2",
                                                isRejected ? "bg-red-500 border-red-500" : isApproved ? "bg-emerald-500 border-emerald-500" : "border-neutral-300 dark:border-neutral-600 bg-white/50"
                                            )} />
                                            <span className={clsx("text-[9px] font-bold", isRejected ? "text-red-500" : isApproved ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-400")}>
                                                {isRejected ? "Rejected" : "Approved"}
                                            </span>
                                            <span className="text-[8px] text-neutral-400 font-medium">{isApproved ? "✓" : "-"}</span>
                                        </div>
                                        {/* Step 3: Overdue / Deadline */}
                                        <div className="flex flex-col items-center space-y-0.5">
                                            <div className={clsx("w-2.5 h-2.5 rounded-full border-2", isOverdue ? "bg-red-500 border-red-500" : "border-neutral-300 dark:border-neutral-600 bg-white/50")} />
                                            <span className={clsx("text-[9px] font-bold", isOverdue ? "text-red-500" : "text-neutral-400")}>Overdue</span>
                                            <span className="text-[8px] text-neutral-400 font-medium">{isOverdue ? formattedDate : "-"}</span>
                                        </div>
                                        {/* Step 4: Paid */}
                                        <div className="flex flex-col items-center space-y-0.5">
                                            <div className={clsx("w-2.5 h-2.5 rounded-full border-2", isPaid ? "bg-blue-500 border-blue-500" : "border-neutral-300 dark:border-neutral-600 bg-white/50")} />
                                            <span className={clsx("text-[9px] font-bold", isPaid ? "text-blue-600" : "text-neutral-400")}>Paid</span>
                                            <span className="text-[8px] text-neutral-400 font-medium">{isPaid ? "✓" : "-"}</span>
                                        </div>
                                        {/* Step 5: Received */}
                                        <div className="flex flex-col items-center space-y-0.5">
                                            <div className={clsx("w-2.5 h-2.5 rounded-full border-2", isReceived ? "bg-blue-500 border-blue-500" : "border-neutral-300 dark:border-neutral-600 bg-white/50")} />
                                            <span className={clsx("text-[9px] font-bold", isReceived ? "text-blue-600" : "text-neutral-400")}>Received</span>
                                            <span className="text-[8px] text-neutral-400 font-medium">{isReceived ? "✓" : "-"}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* PROJECT ROW */}
                                <div className="space-y-1">
                                    <span className="text-[10px] font-semibold text-neutral-400 block">Project</span>
                                    <div className="flex items-center gap-1.5">
                                        <span className="px-1.5 py-0.5 rounded font-mono text-[9.5px] font-extrabold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200/80 shrink-0">
                                            {projBadge.code}
                                        </span>
                                        <span className="text-[12px] font-bold text-neutral-800 dark:text-neutral-200 truncate">
                                            {projBadge.name || meta.project_name || "Workspace Project"}
                                        </span>
                                    </div>
                                </div>

                                {/* GRID ROW 1: PRIORITY & SUBMITTER */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <span className="text-[10px] font-semibold text-neutral-400 block mb-0.5">Priority Level</span>
                                        <div className="flex items-center gap-1.5 text-[12px] font-bold text-neutral-800 dark:text-neutral-200">
                                            <span className={clsx(
                                                "w-2.5 h-2.5 rounded-full shadow-xs",
                                                priorityLevel.toUpperCase() === "URGENT" ? "bg-red-500" :
                                                priorityLevel.toUpperCase() === "HIGH" ? "bg-orange-500" :
                                                priorityLevel.toUpperCase() === "MEDIUM" ? "bg-blue-500" : "bg-emerald-500"
                                            )} />
                                            {priorityLevel}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-semibold text-neutral-400 block mb-0.5">Submitter</span>
                                        <span className="text-[12px] font-bold text-neutral-800 dark:text-neutral-200 truncate block">
                                            {submitterName}
                                        </span>
                                    </div>
                                </div>

                                {/* GRID ROW 2: CATEGORY & SUBCATEGORY */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <span className="text-[10px] font-semibold text-neutral-400 block mb-0.5">Category</span>
                                        <span className="text-[12px] font-bold text-neutral-800 dark:text-neutral-200 block uppercase">
                                            {formatStatusText(categoryName)}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-semibold text-neutral-400 block mb-0.5">Subcategory</span>
                                        <span className="text-[12px] font-bold text-neutral-800 dark:text-neutral-200 block uppercase">
                                            {formatStatusText(subcategoryName)}
                                        </span>
                                    </div>
                                </div>

                                {/* VENDOR ROW */}
                                <div className="space-y-0.5">
                                    <span className="text-[10px] font-semibold text-neutral-400 block">Vendor / Payee</span>
                                    <span className="text-[12.5px] font-bold text-neutral-900 dark:text-white block">
                                        {vendorName}
                                    </span>
                                </div>

                                {/* DESCRIPTION ROW */}
                                <div className="space-y-0.5">
                                    <span className="text-[10px] font-semibold text-neutral-400 block">Description</span>
                                    <p className="text-[11.5px] font-medium text-neutral-700 dark:text-neutral-300 leading-relaxed">
                                        {descriptionText}
                                    </p>
                                </div>
                            </div>

                            {/* SECTION: AMOUNT & STATUS */}
                            <div className="space-y-3 pt-1 border-t border-neutral-200/50 dark:border-neutral-800/50">
                                <h3 className="text-[12.5px] font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                                    <DollarSign className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                    Amount & Status
                                </h3>

                                <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-500/10 border border-emerald-200/50 dark:border-emerald-500/20 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <span className="text-[9.5px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider block">
                                                Total Amount
                                            </span>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <span className="text-[16px] font-black text-emerald-700 dark:text-emerald-400">
                                                    {formatCurrency(approvedAmount)}
                                                </span>
                                                <CopyButton text={String(approvedAmount)} className="text-emerald-600" />
                                            </div>
                                        </div>
                                        <span className={clsx(
                                            "px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase",
                                            isPaidStatus
                                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-300/40"
                                                : isPartiallyPaid
                                                ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-300/40"
                                                : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-300/40"
                                        )}>
                                            {financialStatusLabel}
                                        </span>
                                    </div>

                                    {/* Partial Payment breakdown */}
                                    {isPartiallyPaid && (
                                        <div className="pt-2 border-t border-emerald-200/40 dark:border-emerald-500/20 flex items-center justify-between text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
                                            <span>Outstanding: {formatCurrency(approvedAmount - paidAmount)}</span>
                                            <span>Paid: {formatCurrency(paidAmount)}</span>
                                        </div>
                                    )}

                                    {/* Override indicator */}
                                    {meta.approved_amount && meta.approved_amount !== rawAmount && (
                                        <div className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-md w-fit">
                                            Original Amount: {formatCurrency(rawAmount)} (Overridden)
                                        </div>
                                    )}
                                </div>

                                {/* Goods / Purchase Stage */}
                                <div className="space-y-1">
                                    <span className="text-[10px] font-semibold text-neutral-400 block">Goods Status</span>
                                    <div className="flex items-center gap-1.5 bg-neutral-100 dark:bg-neutral-800/80 p-1 rounded-xl border border-neutral-200/60 dark:border-neutral-700/60 w-fit">
                                        {(["PLANNED", "INVOICED", "RECEIVED"] as const).map((stage) => {
                                            const isActive = purchaseStage === stage;
                                            return (
                                                <button
                                                    key={stage}
                                                    onClick={() => setPurchaseStage(stage)}
                                                    className={clsx(
                                                        "px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all",
                                                        isActive
                                                            ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-xs"
                                                            : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                                                    )}
                                                >
                                                    {formatStatusText(stage)}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* SECTION: BENEFICIARY ACCOUNT */}
                            {hasBeneficiary && (
                                <div className="space-y-2 pt-1 border-t border-neutral-200/50 dark:border-neutral-800/50">
                                    <h3 className="text-[12.5px] font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                                        <CreditCard className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                        Beneficiary Account
                                    </h3>
                                    <div className="p-3.5 rounded-2xl bg-blue-50/50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[13px] font-black text-neutral-900 dark:text-white">
                                                {beneficiaryBank || "Bank Account"}
                                            </span>
                                            {beneficiaryNumber && (
                                                <div className="flex items-center gap-1 bg-white dark:bg-neutral-800 px-2 py-0.5 rounded-lg border border-blue-200/60 dark:border-blue-500/30">
                                                    <span className="font-mono text-[12px] font-extrabold text-blue-600 dark:text-blue-400">
                                                        {beneficiaryNumber}
                                                    </span>
                                                    <CopyButton text={beneficiaryNumber} className="text-blue-500" />
                                                </div>
                                            )}
                                        </div>
                                        {beneficiaryName && (
                                            <span className="text-[11.5px] font-medium text-neutral-600 dark:text-neutral-400 block">
                                                {beneficiaryName}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* SECTION: ITEM DETAILS BREAKDOWN TABLE */}
                            <div className="space-y-2 pt-1 border-t border-neutral-200/50 dark:border-neutral-800/50">
                                <h3 className="text-[12.5px] font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                                    <Package className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                                    Item Details {itemList.length > 0 ? `(${itemList.length})` : ""}
                                </h3>
                                {itemList.length > 0 ? (
                                    <div className="rounded-2xl bg-neutral-50/80 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-700/40 overflow-hidden">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="border-b border-neutral-200/60 dark:border-neutral-700/40 bg-neutral-100/60 dark:bg-neutral-800/60">
                                                    <th className="py-2 px-3 text-[9.5px] font-bold text-neutral-400 uppercase">Item</th>
                                                    <th className="py-2 px-2 text-[9.5px] font-bold text-neutral-400 uppercase text-center">Qty</th>
                                                    <th className="py-2 px-2 text-[9.5px] font-bold text-neutral-400 uppercase text-right">Price</th>
                                                    <th className="py-2 px-3 text-[9.5px] font-bold text-neutral-400 uppercase text-right">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-neutral-200/40 dark:divide-neutral-700/30 text-[11px]">
                                                {itemList.map((it: any, idx: number) => (
                                                    <tr key={idx}>
                                                        <td className="py-2 px-3 font-semibold text-neutral-800 dark:text-neutral-200">{it.name || it.item || "Item"}</td>
                                                        <td className="py-2 px-2 text-center text-neutral-600 dark:text-neutral-400 font-medium">
                                                            {it.qty || 1} {it.unit || ""}
                                                        </td>
                                                        <td className="py-2 px-2 text-right text-neutral-600 dark:text-neutral-400 tabular-nums">
                                                            {formatCurrency(it.unit_price || it.price)}
                                                        </td>
                                                        <td className="py-2 px-3 text-right font-extrabold text-neutral-900 dark:text-white tabular-nums">
                                                            {formatCurrency(it.total || (Number(it.qty || 1) * Number(it.unit_price || it.price || 0)))}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-700/40 text-[11px] text-neutral-400 dark:text-neutral-500 font-medium italic">
                                        No itemized breakdown listed for this request.
                                    </div>
                                )}
                            </div>

                            {/* SECTION: DOCUMENTS */}
                            <div className="space-y-2 pt-1 border-t border-neutral-200/50 dark:border-neutral-800/50">
                                <h3 className="text-[12.5px] font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                                    <Upload className="w-3.5 h-3.5 text-neutral-700 dark:text-neutral-300" />
                                    Documents
                                </h3>
                                <div className="grid grid-cols-2 gap-2.5">
                                    <button
                                        type="button"
                                        onClick={() => openDocModal("invoice")}
                                        disabled={invoices.length === 0}
                                        className={clsx(
                                            "p-4 rounded-3xl border transition-all flex flex-col gap-2 text-left relative overflow-hidden group",
                                            invoices.length > 0
                                                ? "bg-white/60 dark:bg-neutral-800/60 border-neutral-150 dark:border-neutral-700/45 hover:border-red-200 dark:hover:border-red-500/30 cursor-pointer shadow-2xs"
                                                : "bg-neutral-50/50 dark:bg-neutral-900/30 border-dashed border-neutral-200 dark:border-neutral-800 opacity-60 cursor-not-allowed"
                                        )}
                                    >
                                        <div className="flex items-center justify-between relative z-10">
                                            <span className="text-[10px] font-bold text-neutral-400">Invoice</span>
                                            <FileText className={clsx("w-3.5 h-3.5", invoices.length > 0 ? "text-red-500" : "text-neutral-300")} />
                                        </div>
                                        <div className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 relative z-10">
                                            {invoices.length > 0 ? `${invoices.length} File${invoices.length > 1 ? "s" : ""}` : "No Invoice"}
                                        </div>
                                        <div className="absolute -bottom-2 -right-2 opacity-[0.03] group-hover:scale-110 transition-transform duration-500 z-0">
                                            <FileText size={48} />
                                        </div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => openDocModal("proof")}
                                        disabled={proofFiles.length === 0}
                                        className={clsx(
                                            "p-4 rounded-3xl border transition-all flex flex-col gap-2 text-left relative overflow-hidden group",
                                            proofFiles.length > 0
                                                ? "bg-white/60 dark:bg-neutral-800/60 border-neutral-150 dark:border-neutral-700/45 hover:border-emerald-200 dark:hover:border-emerald-500/30 cursor-pointer shadow-2xs"
                                                : "bg-neutral-50/50 dark:bg-neutral-900/30 border-dashed border-neutral-200 dark:border-neutral-800 opacity-60 cursor-not-allowed"
                                        )}
                                    >
                                        <div className="flex items-center justify-between relative z-10">
                                            <span className="text-[10px] font-bold text-neutral-400">Payment Proof</span>
                                            <CheckCircle2 className={clsx("w-3.5 h-3.5", proofFiles.length > 0 ? "text-emerald-500" : "text-neutral-300")} />
                                        </div>
                                        <div className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 relative z-10">
                                            {proofFiles.length > 0 ? `${proofFiles.length} File${proofFiles.length > 1 ? "s" : ""}` : "No Proof"}
                                        </div>
                                        <div className="absolute -bottom-2 -right-2 opacity-[0.03] group-hover:scale-110 transition-transform duration-500 z-0">
                                            <CheckCircle2 size={48} />
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* SECTION: ADDITIONAL NOTES */}
                            {meta.notes && (
                                <div className="space-y-1.5 pt-1 border-t border-neutral-200/50 dark:border-neutral-800/50">
                                    <h3 className="text-[12.5px] font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                                        <FileText className="w-3.5 h-3.5 text-neutral-700 dark:text-neutral-300" />
                                        Additional Notes
                                    </h3>
                                    <div className="text-xs text-neutral-700 dark:text-neutral-300 bg-white/60 dark:bg-neutral-800/60 p-4 rounded-3xl border border-neutral-100 dark:border-neutral-700/40 font-medium leading-relaxed italic">
                                        "{meta.notes}"
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* DRAWER BOTTOM ACTION FOOTER */}
                        <div className="pt-2.5 border-t border-neutral-200/50 dark:border-neutral-800/50 flex flex-col gap-2 shrink-0">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleDelete}
                                    disabled={isSubmitting}
                                    className="w-9 h-9 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center shrink-0 transition-colors"
                                    title="Delete Request"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={handleReject}
                                    disabled={isSubmitting}
                                    className="w-9 h-9 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-100 flex items-center justify-center shrink-0 transition-colors"
                                    title="Reject Request"
                                >
                                    <Ban className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={handleRevise}
                                    disabled={isSubmitting}
                                    className="flex-1 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 font-bold text-[12px] flex items-center justify-center gap-1.5 transition-colors"
                                >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    Revise
                                </button>
                            </div>
                            <button
                                onClick={handleApprove}
                                disabled={isSubmitting}
                                className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-[13px] flex items-center justify-center gap-2 shadow-sm transition-all"
                            >
                                <Check className="w-4 h-4" strokeWidth={2.5} />
                                {isApproved ? "Approved ✓" : "Approve"}
                            </button>
                        </div>
                    </div>
                ) : isTask ? (
                    /* TASK DRAWER */
                    <div className="flex flex-col h-full justify-between gap-3">
                        <div className="flex items-center justify-between pb-3 border-b border-neutral-200/50 dark:border-neutral-800/50 shrink-0">
                            <div className="flex items-center gap-2 min-w-0">
                                <span className={clsx("px-2 py-0.5 rounded font-mono text-[10px] font-extrabold", projBadge.badgeBg)}>
                                    {projBadge.code}
                                </span>
                                <span className="text-[11px] font-bold text-neutral-500">Task Setup</span>
                            </div>
                            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-400">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto scrollbar-hide py-2 space-y-3">
                            <h3 className="text-[14.5px] font-bold text-neutral-900 dark:text-white">{item.title}</h3>
                            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60">
                                <div>
                                    <span className="text-[9.5px] font-bold text-neutral-400 uppercase block mb-0.5">Priority</span>
                                    <span className="text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-200 capitalize">{item.metadata?.priority || "Normal"}</span>
                                </div>
                                <div>
                                    <span className="text-[9.5px] font-bold text-neutral-400 uppercase block mb-0.5">Submitter</span>
                                    <span className="text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-200">{item.userName || "Adidaya Member"}</span>
                                </div>
                            </div>
                            {item.description && (
                                <div className="space-y-0.5">
                                    <span className="text-[10px] font-semibold text-neutral-400 block">Description</span>
                                    <p className="text-[12px] text-neutral-700 dark:text-neutral-300 leading-relaxed">{item.description}</p>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-2 pt-2.5 border-t border-neutral-200/50">
                            <button onClick={handleDelete} className="w-10 h-10 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center shrink-0">
                                <Trash2 className="w-4 h-4" />
                            </button>
                            <button onClick={onClose} className="flex-1 h-10 rounded-xl bg-neutral-900 text-white font-bold text-[12.5px]">
                                Done
                            </button>
                        </div>
                    </div>
                ) : isProject ? (
                    /* PROJECT DRAWER */
                    <div className="flex flex-col h-full justify-between gap-3">
                        <div className="flex items-center justify-between pb-3 border-b border-neutral-200/50 dark:border-neutral-800/50 shrink-0">
                            <div className="flex items-center gap-2 min-w-0">
                                <span className={clsx("px-2 py-0.5 rounded font-mono text-[10px] font-extrabold", projBadge.badgeBg)}>
                                    {projBadge.code}
                                </span>
                                <span className="text-[11px] font-bold text-neutral-500">Project Details</span>
                            </div>
                            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-400">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto scrollbar-hide py-2 space-y-3">
                            <h3 className="text-[15px] font-extrabold text-neutral-900 dark:text-white">{item.title}</h3>
                            <div className="space-y-2.5 p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60">
                                <div>
                                    <span className="text-[10px] font-semibold text-neutral-400 block mb-0.5">Location</span>
                                    <span className="text-[12.5px] font-bold text-neutral-800 dark:text-neutral-200">{projBadge.name || item.subtitle || "Jakarta"}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-semibold text-neutral-400 block mb-0.5">Status</span>
                                    <span className="text-[12.5px] font-bold text-neutral-800 dark:text-neutral-200 capitalize">{item.status || "Active"}</span>
                                </div>
                            </div>
                        </div>
                        <Link href={`/flow/projects/${item.entityId || "0"}`} className="w-full h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-[12.5px] flex items-center justify-center gap-2 transition-all">
                            Open Project <ArrowUpRight className="w-4 h-4" />
                        </Link>
                    </div>
                ) : (
                    /* GENERAL DRAWER */
                    <div className="flex flex-col h-full justify-between gap-3">
                        <div className="flex items-center justify-between pb-3 border-b border-neutral-200/50 dark:border-neutral-800/50 shrink-0">
                            <div className="flex items-center gap-2 min-w-0">
                                <span className={clsx("px-2 py-0.5 rounded font-mono text-[10px] font-extrabold", projBadge.badgeBg)}>
                                    {projBadge.code}
                                </span>
                                <span className="text-[11px] font-bold text-neutral-500">{item.submodule || "Activity Detail"}</span>
                            </div>
                            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-400">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto scrollbar-hide py-2 space-y-3">
                            <h3 className="text-[14.5px] font-bold text-neutral-900 dark:text-white">{item.title}</h3>
                            <p className="text-[12px] font-medium text-neutral-600 dark:text-neutral-400 leading-relaxed">{item.subtitle || item.description || item.rawInput}</p>
                            <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60">
                                <span className="text-[9.5px] font-bold text-neutral-400 uppercase block mb-0.5">Logged Date</span>
                                <span className="text-[12px] font-semibold text-neutral-700 dark:text-neutral-300">{formattedDate}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 pt-2.5 border-t border-neutral-200/50">
                            <button onClick={handleDelete} className="w-10 h-10 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center shrink-0">
                                <Trash2 className="w-4 h-4" />
                            </button>
                            <button onClick={onClose} className="flex-1 h-10 rounded-xl bg-neutral-900 text-white font-bold text-[12.5px]">
                                Close
                            </button>
                        </div>
                    </div>
                )}
            </motion.div>
        </AnimatePresence>
    );
}

function formatDate(timestamp?: string): string {
    if (!timestamp) return "-";
    try {
        const d = new Date(timestamp);
        return d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
    } catch {
        return "-";
    }
}
