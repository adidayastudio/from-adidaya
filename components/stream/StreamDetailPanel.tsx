"use client";

import React, { useState } from "react";
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
} from "lucide-react";
import type { FeedItem } from "@/lib/stream/types";
import { getProjectBadge } from "@/lib/stream/stream-feed";
import { getModuleToken } from "@/lib/stream/module-tokens";
import { deleteStreamActivity, updateStreamActivityParsedData } from "@/lib/stream/stream-actions";
import Link from "next/link";

interface StreamDetailPanelProps {
    item: FeedItem | null;
    onClose: () => void;
    onReloadFeed?: () => void;
}

export default function StreamDetailPanel({ item, onClose, onReloadFeed }: StreamDetailPanelProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [approvalStatus, setApprovalStatus] = useState<string>(
        item?.metadata?.approval_status || item?.status || "SUBMITTED"
    );

    if (!item) return null;

    const projBadge = getProjectBadge(item);
    const moduleToken = getModuleToken(item.submodule || item.parentModule);
    const isExpense = item.parentModule === "finance" || item.type === "expense_logged" || item.entityType === "expense";
    const isTask = item.type === "task_added" || item.entityType === "task";
    const isProject = item.type === "project_created" || item.entityType === "project";

    // 100% REAL DATA EXTRACTION FROM SUPABASE DATABASE ROW
    const formattedDate = formatDate(item.timestamp);
    const requestNumber = item.metadata?.request_number || item.metadata?.po_number;
    const documentId = requestNumber
        ? `PO-${projBadge.code}-${requestNumber}`
        : item.metadata?.document_id || `REQ-${projBadge.code}-${item.id.slice(-4).toUpperCase()}`;

    const submitterName = item.userName || item.metadata?.submitted_by_name || item.metadata?.created_by_name || item.metadata?.approved_by_name || "Adidaya Member";
    const rawPriority = String(item.metadata?.priority || "Normal");
    const priorityLevel = rawPriority.charAt(0).toUpperCase() + rawPriority.slice(1).toLowerCase();
    const categoryName = item.metadata?.type || item.metadata?.category || item.submodule || "General";
    const subcategoryName = item.metadata?.subcategory || "-";
    const vendorName = item.metadata?.vendor || item.metadata?.payee || item.metadata?.beneficiary_name || "-";
    const descriptionText = item.description || item.title || item.metadata?.notes || item.rawInput || "-";
    const amountVal = item.metadata?.amount !== undefined && item.metadata?.amount !== null
        ? `Rp ${Number(item.metadata.amount).toLocaleString("id-ID")}`
        : "-";
    const isPaidStatus = item.metadata?.financial_status === "PAID" || item.event === "Paid";
    const financialStatusLabel = isPaidStatus ? "Paid" : "Unpaid";

    // Dynamic step states based on real status
    const isSubmitted = true;
    const isApproved = approvalStatus === "APPROVED" || item.metadata?.approval_status === "APPROVED" || item.status === "confirmed";
    const isOverdue = item.event === "Overdue" || item.subtitle?.toLowerCase().includes("due");
    const isPaid = isPaidStatus || item.event === "Paid";
    const isReceived = item.metadata?.purchase_stage === "RECEIVED" || item.event === "Received";

    // Actions
    const handleDelete = async () => {
        setIsSubmitting(true);
        try {
            await deleteStreamActivity(item.id);
            onClose();
            onReloadFeed?.();
        } catch (err) {
            console.error("Failed to delete activity:", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleApprove = async () => {
        setIsSubmitting(true);
        try {
            setApprovalStatus("APPROVED");
            await updateStreamActivityParsedData(item.id, { ...(item.metadata as any), approval_status: "APPROVED", status: "confirmed" });
            onReloadFeed?.();
            onClose();
        } catch (err) {
            console.error("Failed to approve:", err);
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
                    "w-full h-full max-w-full flex flex-col justify-between",
                    "bg-white/95 dark:bg-neutral-900/95 backdrop-blur-2xl",
                    "border border-neutral-200/80 dark:border-neutral-800/80",
                    "rounded-[24px] overflow-hidden shadow-xl p-4 sm:p-5"
                )}
            >
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
                                    <button className="px-1.5 h-5 rounded-full flex items-center gap-1 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">
                                        <ImageIcon className="w-3 h-3" />
                                        <span className="text-[9px] font-bold">JPG</span>
                                    </button>
                                    <div className="w-[1px] h-3 bg-neutral-200 dark:bg-neutral-700" />
                                    <button className="px-1.5 h-5 rounded-full flex items-center gap-1 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">
                                        <FileText className="w-3 h-3" />
                                        <span className="text-[9px] font-bold">PDF</span>
                                    </button>
                                </div>

                                {/* Share Button */}
                                <button className="w-7 h-7 rounded-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200/60 dark:border-neutral-700/60 flex items-center justify-center text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors">
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
                        <div className="flex-1 overflow-y-auto scrollbar-hide py-2 space-y-4">
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
                                            <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400">Submitted</span>
                                            <span className="text-[8px] text-neutral-400 font-medium">{formattedDate}</span>
                                        </div>
                                        {/* Step 2: Approved */}
                                        <div className="flex flex-col items-center space-y-0.5">
                                            <div className={clsx("w-2.5 h-2.5 rounded-full border-2", isApproved ? "bg-emerald-500 border-emerald-500" : "border-neutral-300 dark:border-neutral-600 bg-white/50")} />
                                            <span className={clsx("text-[9px] font-bold", isApproved ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-400")}>Approved</span>
                                            <span className="text-[8px] text-neutral-400 font-medium">{isApproved ? "✓" : "-"}</span>
                                        </div>
                                        {/* Step 3: Overdue */}
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
                                            {projBadge.name || item.metadata?.project_name || "Workspace Project"}
                                        </span>
                                    </div>
                                </div>

                                {/* GRID ROW 1: PRIORITY & SUBMITTER */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <span className="text-[10px] font-semibold text-neutral-400 block mb-0.5">Priority Level</span>
                                        <div className="flex items-center gap-1.5 text-[12px] font-bold text-neutral-800 dark:text-neutral-200">
                                            <span className={clsx(
                                                "w-2 h-2 rounded-full shadow-xs",
                                                priorityLevel === "URGENT" || priorityLevel === "HIGH" ? "bg-orange-500" : "bg-blue-500"
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
                                        <span className="text-[12px] font-bold text-neutral-800 dark:text-neutral-200 block">
                                            {categoryName}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-semibold text-neutral-400 block mb-0.5">Subcategory</span>
                                        <span className="text-[12px] font-bold text-neutral-800 dark:text-neutral-200 block">
                                            {subcategoryName}
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

                                {/* AMOUNT ROW & FINANCE STATUS */}
                                <div className="p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-500/10 border border-emerald-200/50 dark:border-emerald-500/20 flex items-center justify-between">
                                    <div>
                                        <span className="text-[9.5px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider block">
                                            Total Amount
                                        </span>
                                        <span className="text-[15px] font-black text-emerald-600 dark:text-emerald-400">
                                            {amountVal}
                                        </span>
                                    </div>
                                    <span className={clsx(
                                        "px-2.5 py-0.5 rounded-full text-[10px] font-bold border",
                                        isPaidStatus
                                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-300/40"
                                            : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-300/40"
                                    )}>
                                        {financialStatusLabel}
                                    </span>
                                </div>
                            </div>
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
                                    className="w-9 h-9 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-100 flex items-center justify-center shrink-0 transition-colors"
                                    title="Reject Request"
                                >
                                    <Ban className="w-4 h-4" />
                                </button>
                                <button
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
                                Approve
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
                                    <span className="text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-200 capitalize">{priorityLevel}</span>
                                </div>
                                <div>
                                    <span className="text-[9.5px] font-bold text-neutral-400 uppercase block mb-0.5">Submitter</span>
                                    <span className="text-[12.5px] font-semibold text-neutral-800 dark:text-neutral-200">{submitterName}</span>
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
