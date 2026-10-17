"use client";

import React from "react";
import clsx from "clsx";
import { motion } from "framer-motion";

import type { FeedItem } from "@/lib/stream/types";
import { getProjectBadge } from "@/lib/stream/stream-feed";
import { getModuleToken } from "@/lib/stream/module-tokens";

interface StreamCardProps {
    item: FeedItem;
    onTap?: (item: FeedItem) => void;
    isCompact?: boolean;
}

export default function StreamCard({ item, onTap, isCompact }: StreamCardProps) {
    const time = formatRelativeTime(item.timestamp);
    const projBadge = getProjectBadge(item);
    const moduleToken = getModuleToken(item.submodule || item.parentModule);

    const submoduleLabel = item.submodule || "Activity";
    const eventLabel = item.event ? ` · ${item.event}` : "";

    return (
        <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.99 }}
            transition={{ duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] }}
            onClick={() => onTap?.(item)}
            className={clsx(
                "group relative rounded-[14px] overflow-hidden transition-all duration-200",
                "bg-white/70 dark:bg-neutral-900/70 backdrop-blur-xl",
                "border border-neutral-200/50 dark:border-neutral-800/50",
                "hover:shadow-sm hover:border-neutral-300/80 dark:hover:border-neutral-700/80",
                "hover:bg-white/90 dark:hover:bg-neutral-900/90",
                onTap && "cursor-pointer active:scale-[0.995]",
                isCompact ? "p-2.5" : "p-3"
            )}
        >
            <div className="flex flex-col gap-1">
                {/* ROW 1: [Project Badge] · [Submodule · Event Chip] · [Time] */}
                <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                        {/* Project Code Badge (Full Pill) */}
                        <span className={clsx(
                            "px-2 py-0.5 rounded-full font-mono text-[9px] font-bold tracking-wide shrink-0",
                            projBadge.badgeBg
                        )}>
                            {projBadge.code}
                        </span>

                        {/* Submodule · Event Chip (Full Pill) */}
                        <span className={clsx(
                            "px-2.5 py-0.5 rounded-full text-[10px] font-medium truncate",
                            moduleToken.badgeBg
                        )}>
                            {submoduleLabel}{eventLabel}
                        </span>
                    </div>

                    {/* Time */}
                    <span className="text-[10px] font-medium text-neutral-400 dark:text-neutral-500 shrink-0">
                        {time}
                    </span>
                </div>

                {/* ROW 2: Title (Clean font-medium, 12px, lightweight) */}
                <h3 className={clsx(
                    "font-medium text-neutral-700 dark:text-neutral-300 tracking-tight leading-snug text-[12px]",
                    "line-clamp-2"
                )}>
                    {item.title}
                </h3>

                {/* ROW 3: Contextual Metadata (Clean & subtle) */}
                {(item.subtitle || item.description) && (
                    <div className="flex items-center text-[11px] font-normal text-neutral-400 dark:text-neutral-500 pt-0.5">
                        <span className="truncate">
                            {item.subtitle || item.description}
                        </span>
                    </div>
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
