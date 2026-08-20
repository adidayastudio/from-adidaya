"use client";

import React from "react";
import clsx from "clsx";
import { motion } from "framer-motion";
import {
    FolderKanban,
    Banknote,
    TrendingUp,
    CheckSquare,
    MessageSquare,
    ArrowUpRight,
    Clock,
} from "lucide-react";
import type { FeedItem, FeedItemType } from "@/lib/stream/types";

interface StreamCardProps {
    item: FeedItem;
    onTap?: (item: FeedItem) => void;
    isCompact?: boolean;
}

const TYPE_CONFIG: Record<FeedItemType, {
    icon: React.ElementType;
    label: string;
    gradient: string;
    iconColor: string;
    borderColor: string;
    badgeBg: string;
}> = {
    stream_input: {
        icon: MessageSquare,
        label: "Input",
        gradient: "from-neutral-500/10 to-neutral-500/5",
        iconColor: "text-neutral-500",
        borderColor: "border-neutral-200/50 dark:border-neutral-700/50",
        badgeBg: "bg-neutral-100 dark:bg-neutral-800",
    },
    project_created: {
        icon: FolderKanban,
        label: "Project",
        gradient: "from-blue-500/10 to-blue-500/5",
        iconColor: "text-blue-600 dark:text-blue-400",
        borderColor: "border-blue-200/50 dark:border-blue-700/30",
        badgeBg: "bg-blue-50 dark:bg-blue-500/10",
    },
    expense_logged: {
        icon: Banknote,
        label: "Expense",
        gradient: "from-emerald-500/10 to-emerald-500/5",
        iconColor: "text-emerald-600 dark:text-emerald-400",
        borderColor: "border-emerald-200/50 dark:border-emerald-700/30",
        badgeBg: "bg-emerald-50 dark:bg-emerald-500/10",
    },
    task_added: {
        icon: CheckSquare,
        label: "Task",
        gradient: "from-violet-500/10 to-violet-500/5",
        iconColor: "text-violet-600 dark:text-violet-400",
        borderColor: "border-violet-200/50 dark:border-violet-700/30",
        badgeBg: "bg-violet-50 dark:bg-violet-500/10",
    },
    progress_updated: {
        icon: TrendingUp,
        label: "Progress",
        gradient: "from-amber-500/10 to-amber-500/5",
        iconColor: "text-amber-600 dark:text-amber-400",
        borderColor: "border-amber-200/50 dark:border-amber-700/30",
        badgeBg: "bg-amber-50 dark:bg-amber-500/10",
    },
    system_event: {
        icon: MessageSquare,
        label: "Activity",
        gradient: "from-neutral-500/10 to-neutral-500/5",
        iconColor: "text-neutral-500",
        borderColor: "border-neutral-200/50 dark:border-neutral-700/50",
        badgeBg: "bg-neutral-100 dark:bg-neutral-800",
    },
};

export default function StreamCard({ item, onTap, isCompact }: StreamCardProps) {
    const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.system_event;
    const Icon = config.icon;
    const time = formatRelativeTime(item.timestamp);

    return (
        <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            onClick={() => onTap?.(item)}
            className={clsx(
                "group relative rounded-[20px] overflow-hidden transition-all duration-300",
                "bg-white/50 dark:bg-neutral-900/50 backdrop-blur-2xl backdrop-saturate-[1.5]",
                "border",
                config.borderColor,
                "hover:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.3)]",
                "hover:bg-white/70 dark:hover:bg-neutral-900/70",
                onTap && "cursor-pointer active:scale-[0.98]",
                isCompact ? "p-3" : "p-4"
            )}
        >
            {/* Subtle gradient overlay */}
            <div className={clsx(
                "absolute inset-0 bg-gradient-to-br opacity-50 pointer-events-none",
                config.gradient
            )} />

            <div className="relative z-10 flex items-start gap-3">
                {/* Icon */}
                <div className={clsx(
                    "shrink-0 w-10 h-10 rounded-[14px] flex items-center justify-center",
                    "bg-white/60 dark:bg-neutral-800/60 backdrop-blur-sm",
                    "border border-white/80 dark:border-neutral-700/40",
                    "shadow-sm"
                )}>
                    <Icon className={clsx("w-5 h-5", config.iconColor)} strokeWidth={2} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <h3 className={clsx(
                                "font-bold text-neutral-900 dark:text-white tracking-tight leading-snug",
                                isCompact ? "text-[13px]" : "text-[14px]",
                                "line-clamp-2"
                            )}>
                                {item.title}
                            </h3>
                            {item.subtitle && (
                                <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-1">
                                    {item.subtitle}
                                </p>
                            )}
                        </div>

                        {/* Type Badge + Time */}
                        <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className={clsx(
                                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full",
                                "text-[9px] font-bold uppercase tracking-wider",
                                config.badgeBg, config.iconColor,
                                "border border-current/10"
                            )}>
                                {config.label}
                            </span>
                            <span className="text-[10px] font-medium text-neutral-400 dark:text-neutral-500 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {time}
                            </span>
                        </div>
                    </div>

                    {/* Description / Extra Info */}
                    {item.description && !isCompact && (
                        <p className="text-[12px] text-neutral-500 dark:text-neutral-400 mt-2 leading-relaxed line-clamp-2">
                            {item.description}
                        </p>
                    )}

                    {/* Status Indicator */}
                    {item.status && (
                        <div className="mt-2 flex items-center gap-2">
                            <span className={clsx(
                                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold",
                                item.status === "saved" && "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                                item.status === "pending" && "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400",
                                item.status === "confirmed" && "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400",
                                item.status === "dismissed" && "bg-neutral-100 dark:bg-neutral-800 text-neutral-400",
                            )}>
                                <span className={clsx(
                                    "w-1.5 h-1.5 rounded-full",
                                    item.status === "saved" && "bg-emerald-500",
                                    item.status === "pending" && "bg-amber-500",
                                    item.status === "confirmed" && "bg-blue-500",
                                    item.status === "dismissed" && "bg-neutral-400",
                                )} />
                                {item.status}
                            </span>
                        </div>
                    )}

                    {/* Raw Input (for stream entries) */}
                    {item.rawInput && !isCompact && (
                        <div className="mt-2 px-3 py-2 rounded-xl bg-neutral-50/80 dark:bg-neutral-800/40 border border-neutral-100/50 dark:border-neutral-700/30">
                            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 italic leading-relaxed">
                                &ldquo;{item.rawInput}&rdquo;
                            </p>
                        </div>
                    )}
                </div>

                {/* Arrow indicator on hover (desktop) */}
                {onTap && (
                    <ArrowUpRight className="w-4 h-4 text-neutral-300 dark:text-neutral-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
                )}
            </div>
        </motion.div>
    );
}

// ============================================
// TIME FORMATTING
// ============================================

function formatRelativeTime(timestamp: string): string {
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return "just now";
    if (diffMin < 60) return `${diffMin}m`;
    if (diffHour < 24) return `${diffHour}h`;
    if (diffDay < 7) return `${diffDay}d`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
