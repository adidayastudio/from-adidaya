"use client";

import React from "react";
import clsx from "clsx";
import { AnimatePresence } from "framer-motion";
import StreamCard from "./StreamCard";
import type { FeedItem } from "@/lib/stream/types";
import { groupFeedByDate } from "@/lib/stream/stream-feed";
import { Zap, ArrowDown } from "lucide-react";

interface StreamFeedProps {
    items: FeedItem[];
    onItemTap?: (item: FeedItem) => void;
    isLoading?: boolean;
}

export default function StreamFeed({ items, onItemTap, isLoading }: StreamFeedProps) {
    if (isLoading) {
        return (
            <div className="space-y-4 px-1">
                {[...Array(4)].map((_, i) => (
                    <div
                        key={i}
                        className="animate-pulse rounded-[20px] bg-white/30 dark:bg-neutral-900/30 backdrop-blur-xl border border-white/50 dark:border-neutral-800/50 p-4"
                    >
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-[14px] bg-neutral-200/50 dark:bg-neutral-700/50" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 w-3/4 rounded-lg bg-neutral-200/50 dark:bg-neutral-700/50" />
                                <div className="h-3 w-1/2 rounded-lg bg-neutral-200/30 dark:bg-neutral-700/30" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (items.length === 0) {
        return <EmptyState />;
    }

    const grouped = groupFeedByDate(items);

    return (
        <div className="space-y-6 px-1">
            <AnimatePresence mode="popLayout">
                {Array.from(grouped.entries()).map(([dateLabel, dateItems]) => (
                    <div key={dateLabel} className="space-y-2">
                        {/* Date Separator */}
                        <div className="flex items-center gap-3 px-2">
                            <div className="h-px flex-1 bg-neutral-200/50 dark:bg-neutral-700/40" />
                            <span className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 tracking-tight">
                                {dateLabel}
                            </span>
                            <div className="h-px flex-1 bg-neutral-200/50 dark:bg-neutral-700/40" />
                        </div>

                        {/* Cards */}
                        <div className="space-y-2">
                            {dateItems.map((item) => (
                                <StreamCard
                                    key={item.id}
                                    item={item}
                                    onTap={onItemTap}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </AnimatePresence>
        </div>
    );
}

// ============================================
// EMPTY STATE
// ============================================

function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            {/* Icon */}
            <div className={clsx(
                "w-20 h-20 rounded-[28px] flex items-center justify-center mb-6",
                "bg-gradient-to-br from-red-500/10 to-amber-500/10",
                "border border-red-200/30 dark:border-red-800/20",
                "shadow-[0_8px_32px_-8px_rgba(220,38,38,0.1)]"
            )}>
                <Zap className="w-9 h-9 text-red-500/70" strokeWidth={1.5} />
            </div>

            {/* Text */}
            <h3 className="text-[18px] font-bold text-neutral-800 dark:text-white tracking-tight mb-2">
                Welcome to Stream
            </h3>
            <p className="text-[13px] text-neutral-500 dark:text-neutral-400 leading-relaxed max-w-[280px] mb-6">
                Your operational command center. Type anything below — projects, expenses, tasks, or progress updates.
            </p>

            {/* Hint Cards */}
            <div className="space-y-2 w-full max-w-[320px]">
                <HintCard
                    emoji="📋"
                    example={'"bikin proyek baru Precision Gym Jakarta"'}
                />
                <HintCard
                    emoji="💰"
                    example={'"beli semen 50 sak 200rb"'}
                />
                <HintCard
                    emoji="📊"
                    example={'"progress lantai 2 udah 70%"'}
                />
                <HintCard
                    emoji="✅"
                    example={'"besok harus selesain gambar denah"'}
                />
            </div>

            {/* Arrow hint */}
            <div className="mt-8 flex flex-col items-center gap-1 text-neutral-300 dark:text-neutral-600 animate-bounce">
                <ArrowDown className="w-5 h-5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">
                    Start typing below
                </span>
            </div>
        </div>
    );
}

function HintCard({ emoji, example }: { emoji: string; example: string }) {
    return (
        <div className={clsx(
            "flex items-center gap-3 px-4 py-3 rounded-2xl",
            "bg-white/40 dark:bg-neutral-800/40 backdrop-blur-xl",
            "border border-white/60 dark:border-neutral-700/30"
        )}>
            <span className="text-lg">{emoji}</span>
            <span className="text-[12px] text-neutral-500 dark:text-neutral-400 font-medium italic leading-snug">
                {example}
            </span>
        </div>
    );
}
