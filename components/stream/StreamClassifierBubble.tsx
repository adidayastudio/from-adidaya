"use client";

import React from "react";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Sparkles, Copy, ThumbsUp, ThumbsDown } from "lucide-react";
import type { ClassificationResult, StreamIntentType, ParsedData } from "@/lib/stream/types";
import { getIntentLabel, getIntentEmoji } from "@/lib/stream/stream-classifier";

interface StreamClassifierBubbleProps {
    userMessage: string;
    classification: ClassificationResult | null;
    isProcessing?: boolean;
    onConfirm?: () => void;
    onDismiss?: () => void;
    isConfirmed?: boolean;
    isDismissed?: boolean;
}

export default function StreamClassifierBubble({
    userMessage,
    classification,
    isProcessing,
    onConfirm,
    onDismiss,
    isConfirmed,
    isDismissed,
}: StreamClassifierBubbleProps) {
    return (
        <div className="space-y-5 my-6 max-w-3xl mx-auto">
            {/* User Message (Clean Soft Blue Bubble, No Heavy BG) */}
            <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="flex justify-end"
            >
                <div className={clsx(
                    "px-5 py-2.5 rounded-[22px]",
                    "bg-blue-500/10 dark:bg-blue-950/40 text-blue-700 dark:text-blue-200 border border-blue-500/20",
                    "text-[15px] font-normal leading-relaxed tracking-normal",
                    "max-w-[85%] md:max-w-[70%]"
                )}>
                    <p className="whitespace-pre-wrap break-words">{userMessage}</p>
                </div>
            </motion.div>

            {/* AI Assistant Response (Clean Transparent Typography) */}
            <AnimatePresence mode="wait">
                {isProcessing ? (
                    <motion.div
                        key="processing"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="flex items-start gap-3 text-neutral-600 dark:text-neutral-300"
                    >
                        <div className="w-7 h-7 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                            <Sparkles className="w-4 h-4" />
                        </div>
                        <div className="flex items-center gap-2 py-1">
                            <span className="text-[14px] font-medium text-neutral-400 animate-pulse">
                                Analyzing operational intent...
                            </span>
                        </div>
                    </motion.div>
                ) : classification ? (
                    <motion.div
                        key="result"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.25 }}
                        className="space-y-3"
                    >
                        <div className="text-[15px] leading-relaxed text-neutral-800 dark:text-neutral-100 font-normal">
                            <p className="mb-2">
                                Operational intent classified as <strong className="font-semibold text-blue-600 dark:text-blue-400">{getIntentEmoji(classification.type)} {getIntentLabel(classification.type)}</strong> ({Math.round(classification.confidence * 100)}% confidence):
                            </p>

                            <div className="my-3 p-3.5 rounded-2xl bg-transparent border border-neutral-200/50 dark:border-neutral-800/60 max-w-lg space-y-1.5">
                                {renderParsedDetails(classification.type, classification.data)}
                            </div>
                        </div>

                        {/* Actions */}
                        {!isConfirmed && !isDismissed && (
                            <div className="flex items-center gap-2 pt-1">
                                <button
                                    onClick={onConfirm}
                                    className={clsx(
                                        "flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all",
                                        "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900",
                                        "hover:bg-neutral-800 dark:hover:bg-neutral-100 active:scale-95 shadow-sm"
                                    )}
                                >
                                    <Check className="w-4 h-4" />
                                    Confirm & Process
                                </button>
                                <button
                                    onClick={onDismiss}
                                    className={clsx(
                                        "px-3 py-2 rounded-xl text-[13px] font-medium transition-colors",
                                        "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50"
                                    )}
                                >
                                    Dismiss
                                </button>
                            </div>
                        )}

                        {isConfirmed && (
                            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[12px] font-semibold">
                                <Check className="w-3.5 h-3.5" />
                                Saved to System
                            </div>
                        )}

                        {isDismissed && (
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100/50 dark:bg-neutral-800/50 text-neutral-400 text-[12px]">
                                Dismissed
                            </div>
                        )}

                        {/* ChatGPT Icon Bar */}
                        <div className="flex items-center gap-1.5 pt-1 text-neutral-400">
                            <button className="p-1.5 rounded-lg hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50 hover:text-neutral-600 transition-colors" title="Copy">
                                <Copy className="w-4 h-4" />
                            </button>
                            <button className="p-1.5 rounded-lg hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50 hover:text-neutral-600 transition-colors" title="Good response">
                                <ThumbsUp className="w-4 h-4" />
                            </button>
                            <button className="p-1.5 rounded-lg hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50 hover:text-neutral-600 transition-colors" title="Bad response">
                                <ThumbsDown className="w-4 h-4" />
                            </button>
                        </div>
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </div>
    );
}

function renderParsedDetails(type: StreamIntentType, data: ParsedData): React.ReactNode {
    switch (type) {
        case "create_project": {
            const d = data as any;
            return (
                <>
                    <DetailRow label="Project Name" value={d.name} />
                    {d.city && <DetailRow label="Location" value={d.city} />}
                    {d.type && <DetailRow label="Scope" value={d.type} />}
                </>
            );
        }
        case "log_expense": {
            const d = data as any;
            return (
                <>
                    <DetailRow label="Item" value={d.item} />
                    {d.qty && <DetailRow label="Quantity" value={`${d.qty} ${d.unit || "pcs"}`} />}
                    {d.amount && <DetailRow label="Amount" value={`Rp ${d.amount.toLocaleString("id-ID")}`} highlight />}
                </>
            );
        }
        case "update_progress": {
            const d = data as any;
            return (
                <>
                    <DetailRow label="Target" value={d.target} />
                    {d.progress > 0 && <DetailRow label="Progress" value={`${d.progress}%`} highlight />}
                </>
            );
        }
        case "add_task": {
            const d = data as any;
            return (
                <>
                    <DetailRow label="Task" value={d.title} />
                    {d.dueDate && <DetailRow label="Due Date" value={d.dueDate} />}
                    {d.priority && d.priority !== "normal" && <DetailRow label="Priority" value={d.priority} highlight />}
                </>
            );
        }
        default: {
            const d = data as any;
            return <DetailRow label="Note" value={d.message || ""} />;
        }
    }
}

function DetailRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
    if (!value) return null;
    return (
        <div className="flex items-center justify-between text-[13px]">
            <span className="text-neutral-500 font-medium">{label}</span>
            <span className={clsx("font-semibold", highlight ? "text-blue-600 dark:text-blue-400" : "text-neutral-900 dark:text-neutral-100")}>
                {value}
            </span>
        </div>
    );
}
