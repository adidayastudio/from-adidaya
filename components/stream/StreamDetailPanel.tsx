"use client";

import React, { useState } from "react";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import {
    X,
    ArrowUpRight,
    FolderKanban,
    CheckSquare,
    Banknote,
    TrendingUp,
    MessageSquare,
    Pencil,
    Trash2,
    Check,
    RefreshCw,
    ShieldAlert
} from "lucide-react";
import type { FeedItem, StreamIntentType } from "@/lib/stream/types";
import { deleteStreamActivity, updateStreamActivityParsedData } from "@/lib/stream/stream-actions";
import Link from "next/link";

interface StreamDetailPanelProps {
    item: FeedItem | null;
    onClose: () => void;
    onReloadFeed?: () => void;
}

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
    project_created: { icon: FolderKanban, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-500/10" },
    expense_logged: { icon: Banknote, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
    task_added: { icon: CheckSquare, color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-500/10" },
    progress_updated: { icon: TrendingUp, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10" },
    system_event: { icon: MessageSquare, color: "text-neutral-600", bg: "bg-neutral-100 dark:bg-neutral-800" },
    stream_input: { icon: MessageSquare, color: "text-neutral-600", bg: "bg-neutral-100 dark:bg-neutral-800" },
};

export default function StreamDetailPanel({ item, onClose, onReloadFeed }: StreamDetailPanelProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Edit form state
    const [editedTitle, setEditedTitle] = useState(item?.title || "");
    const [editedMetadata, setEditedMetadata] = useState<Record<string, any>>(item?.metadata || {});

    if (!item) return null;

    const Icon = TYPE_CONFIG[item.type]?.icon || MessageSquare;
    const typeStyle = TYPE_CONFIG[item.type] || TYPE_CONFIG.system_event;

    // Handle Save Revisions
    const handleSaveEdit = async () => {
        setIsSubmitting(true);
        try {
            await updateStreamActivityParsedData(item.id, {
                ...editedMetadata,
                name: editedTitle,
                title: editedTitle,
                item: editedTitle,
                target: editedTitle,
            });
            setIsEditing(false);
            onReloadFeed?.();
        } catch (err) {
            console.error("Failed to save edit:", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle Delete Activity
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

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.2 }}
                className={clsx(
                    "h-full flex flex-col justify-between",
                    "bg-white/70 dark:bg-neutral-900/80 backdrop-blur-2xl",
                    "border border-neutral-200/80 dark:border-neutral-800/80",
                    "rounded-[24px] overflow-hidden shadow-sm p-4 sm:p-5"
                )}
            >
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-neutral-200/50 dark:border-neutral-800/50">
                    <div className="flex items-center gap-2.5">
                        <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center", typeStyle.bg)}>
                            <Icon className={clsx("w-4 h-4", typeStyle.color)} />
                        </div>
                        <div>
                            <h3 className="text-[13px] font-bold text-neutral-900 dark:text-white">
                                Activity Detail
                            </h3>
                            <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                                {item.type.replace(/_/g, " ")}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto py-4 space-y-4">
                    {/* Title / Edit Mode */}
                    {isEditing ? (
                        <div className="space-y-3">
                            <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                                Title / Name
                            </label>
                            <input
                                type="text"
                                value={editedTitle}
                                onChange={(e) => setEditedTitle(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-[14px] font-semibold focus:outline-none focus:border-blue-500"
                            />
                        </div>
                    ) : (
                        <div>
                            <h2 className="text-[18px] font-bold text-neutral-900 dark:text-white leading-tight">
                                {item.title}
                            </h2>
                            {item.subtitle && (
                                <p className="text-[12px] text-neutral-500 dark:text-neutral-400 mt-1 font-medium">
                                    {item.subtitle}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Original Raw Input */}
                    {item.rawInput && (
                        <div className="p-3 rounded-xl bg-neutral-100/60 dark:bg-neutral-800/40 border border-neutral-200/50 dark:border-neutral-700/40">
                            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-0.5">
                                Original Raw Input
                            </p>
                            <p className="text-[12px] text-neutral-700 dark:text-neutral-300 italic">
                                &ldquo;{item.rawInput}&rdquo;
                            </p>
                        </div>
                    )}

                    {/* Metadata & Parsed Fields */}
                    {item.metadata && Object.keys(item.metadata).length > 0 && (
                        <div className="space-y-2">
                            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                                Parsed Parameters
                            </p>

                            <div className="grid grid-cols-2 gap-2">
                                {Object.entries(item.metadata)
                                    .filter(([, v]) => v !== null && v !== undefined && v !== "")
                                    .map(([key, value]) => (
                                        <div
                                            key={key}
                                            className="p-2.5 rounded-xl bg-neutral-100/50 dark:bg-neutral-800/30 border border-neutral-200/40 dark:border-neutral-700/30"
                                        >
                                            <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-0.5">
                                                {key.replace(/_/g, " ")}
                                            </p>

                                            {isEditing ? (
                                                <input
                                                    type="text"
                                                    value={editedMetadata[key] ?? String(value)}
                                                    onChange={(e) =>
                                                        setEditedMetadata({
                                                            ...editedMetadata,
                                                            [key]: e.target.value,
                                                        })
                                                    }
                                                    className="w-full text-[12px] font-semibold bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 px-1.5 py-0.5 rounded focus:outline-none focus:border-blue-500"
                                                />
                                            ) : (
                                                <p className="text-[12px] font-semibold text-neutral-800 dark:text-neutral-200 truncate">
                                                    {typeof value === "object" ? JSON.stringify(value) : String(value)}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )}

                    {/* Timestamp & Status */}
                    <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-2 border-t border-neutral-200/40 dark:border-neutral-800/40">
                        <span>
                            {new Date(item.timestamp).toLocaleString([], {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                            })}
                        </span>
                        {item.status && (
                            <span className={clsx(
                                "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                                item.status === "saved" && "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400",
                                item.status === "pending" && "bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400",
                                item.status === "dismissed" && "bg-neutral-200 dark:bg-neutral-800 text-neutral-400"
                            )}>
                                {item.status}
                            </span>
                        )}
                    </div>
                </div>

                {/* Authorized Actions Toolbar (Edit / Delete / Save) */}
                <div className="pt-3 border-t border-neutral-200/50 dark:border-neutral-800/50 space-y-2">
                    {/* Delete Confirmation Box */}
                    {isDeleting ? (
                        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/40 space-y-2">
                            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-[12px] font-bold">
                                <ShieldAlert className="w-4 h-4" />
                                Confirm Deletion?
                            </div>
                            <div className="flex items-center gap-2 pt-1">
                                <button
                                    onClick={handleDelete}
                                    disabled={isSubmitting}
                                    className="flex-1 py-1.5 rounded-lg bg-red-600 text-white text-[12px] font-bold hover:bg-red-700 transition-colors"
                                >
                                    Yes, Delete
                                </button>
                                <button
                                    onClick={() => setIsDeleting(false)}
                                    className="px-3 py-1.5 rounded-lg bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-[12px] font-medium"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : isEditing ? (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleSaveEdit}
                                disabled={isSubmitting}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-blue-600 text-white text-[12px] font-bold hover:bg-blue-700 transition-colors"
                            >
                                <Check className="w-4 h-4" />
                                Save Revisions
                            </button>
                            <button
                                onClick={() => setIsEditing(false)}
                                className="px-3 py-2 rounded-xl bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-[12px] font-medium"
                            >
                                Cancel
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsEditing(true)}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-[12px] font-bold transition-colors"
                            >
                                <Pencil className="w-3.5 h-3.5" />
                                Edit / Revisi
                            </button>

                            <button
                                onClick={() => setIsDeleting(true)}
                                className="px-3 py-2 rounded-xl bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 text-[12px] font-medium transition-colors"
                                title="Hapus Activity"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>

                            {item.entityHref && (
                                <Link
                                    href={item.entityHref}
                                    className="p-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:opacity-90 transition-opacity"
                                    title="Open Entity"
                                >
                                    <ArrowUpRight className="w-4 h-4" />
                                </Link>
                            )}
                        </div>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
