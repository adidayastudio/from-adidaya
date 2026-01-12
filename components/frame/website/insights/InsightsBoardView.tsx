"use client";

import React, { useState, useMemo } from "react";
import { Insight, InsightStatus, INSIGHT_STATUS_COLORS } from "./types";
import { ChevronUp, ChevronDown, Calendar, Filter } from "lucide-react";
import clsx from "clsx";

type Props = {
    insights: Insight[];
    onEditInsight: (insight: Insight) => void;
};

type SortKey = "publishDate" | "status";
type SortDir = "asc" | "desc";

// Status columns matching Projects groupings
const COLUMNS: { id: InsightStatus[]; label: string; color: string; headerBg: string }[] = [
    { id: ["NOT_STARTED", "TODO"], label: "Backlog", color: "bg-neutral-50", headerBg: "bg-neutral-200" },
    { id: ["WRITING", "IN_REVIEW", "NEED_APPROVAL", "NEED_REVISION"], label: "In Progress", color: "bg-orange-50", headerBg: "bg-orange-200" },
    { id: ["APPROVED", "SCHEDULED"], label: "Ready", color: "bg-blue-50", headerBg: "bg-blue-200" },
    { id: ["PUBLISHED"], label: "Published", color: "bg-green-50", headerBg: "bg-green-200" },
];

const STATUS_ORDER: Record<InsightStatus, number> = {
    NOT_STARTED: 0, TODO: 1, WRITING: 2, IN_REVIEW: 3, NEED_REVISION: 4,
    NEED_APPROVAL: 5, APPROVED: 6, SCHEDULED: 7, PUBLISHED: 8, ARCHIVED: 9
};

export default function InsightsBoardView({ insights, onEditInsight }: Props) {
    return (
        <div className="overflow-x-auto pb-4">
            <div className="flex gap-5 min-h-[500px]" style={{ minWidth: "fit-content" }}>
                {COLUMNS.map(col => (
                    <BoardColumn
                        key={col.label}
                        column={col}
                        insights={insights.filter(p => col.id.includes(p.status))}
                        onEditInsight={onEditInsight}
                    />
                ))}
            </div>
        </div>
    );
}

function BoardColumn({
    column,
    insights,
    onEditInsight,
}: {
    column: { id: InsightStatus[]; label: string; color: string; headerBg: string };
    insights: Insight[];
    onEditInsight: (insight: Insight) => void;
}) {
    const [sortKey, setSortKey] = useState<SortKey>("status");
    const [sortDir, setSortDir] = useState<SortDir>("desc");

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir(d => d === "asc" ? "desc" : "asc");
        } else {
            setSortKey(key);
            setSortDir("asc");
        }
    };

    const sortedInsights = useMemo(() => {
        return [...insights].sort((a, b) => {
            const mult = sortDir === "asc" ? 1 : -1;
            if (sortKey === "publishDate") {
                const dateA = a.publishDate || a.scheduledDate || "9999";
                const dateB = b.publishDate || b.scheduledDate || "9999";
                return mult * dateA.localeCompare(dateB);
            } else {
                return mult * (STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
            }
        });
    }, [insights, sortKey, sortDir]);

    const SortButton = ({ label, keyVal }: { label: string; keyVal: SortKey }) => {
        const isActive = sortKey === keyVal;
        return (
            <button
                onClick={() => toggleSort(keyVal)}
                className={`text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5 transition-colors ${isActive ? "bg-white/80 text-neutral-800 font-semibold" : "text-neutral-500 hover:text-neutral-700"
                    }`}
            >
                {label}
                {isActive && (sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
            </button>
        );
    };

    return (
        <div className="flex flex-col w-[280px] flex-shrink-0">
            {/* HEADER */}
            <div className={`px-4 py-3 rounded-t-xl ${column.headerBg}`}>
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-neutral-800">{column.label}</span>
                        <span className="bg-white/70 text-neutral-600 text-xs px-2 py-0.5 rounded-full font-semibold">{insights.length}</span>
                    </div>
                </div>

                {/* SORT CONTROLS */}
                <div className="flex items-center gap-1">
                    <span className="text-[10px] text-neutral-500 mr-1">Sort:</span>
                    <SortButton label="Date" keyVal="publishDate" />
                    <SortButton label="Status" keyVal="status" />
                </div>
            </div>

            {/* DROP ZONE */}
            <div className={`flex-1 rounded-b-xl p-3 ${column.color} space-y-3 overflow-y-auto`}>
                {sortedInsights.map(insight => (
                    <div
                        key={insight.id}
                        className="group bg-white border border-neutral-200 rounded-xl overflow-hidden hover:shadow-md transition-all cursor-pointer"
                        onClick={() => onEditInsight(insight)}
                    >
                        {/* IMAGE */}
                        <div className="aspect-[4/3] bg-neutral-100 relative overflow-hidden">
                            {insight.image ? (
                                <img src={insight.image} alt={insight.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-neutral-300 bg-neutral-50">No Image</div>
                            )}

                            <div className="absolute top-3 right-3 flex gap-2">
                                <span className={clsx(
                                    "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md border border-white/20",
                                    INSIGHT_STATUS_COLORS[insight.status] || "bg-white/90 text-neutral-500"
                                )}>
                                    {insight.status.replace(/_/g, " ")}
                                </span>
                            </div>
                        </div>

                        {/* CONTENT */}
                        <div className="p-4">
                            <div className="flex items-start justify-between mb-2">
                                <div>
                                    <div className="flex flex-wrap gap-1 mb-1">
                                        <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">
                                            {insight.category}
                                        </span>
                                    </div>
                                    <h3 className="text-sm font-bold text-neutral-900 leading-tight group-hover:text-red-600 transition-colors line-clamp-2">
                                        {insight.title}
                                    </h3>
                                </div>
                            </div>

                            {/* Tags */}
                            <div className="flex flex-wrap gap-1 mb-3">
                                {insight.tags?.slice(0, 2).map(tag => (
                                    <span key={tag} className="text-[9px] px-1.5 py-0.5 bg-neutral-100 text-neutral-500 rounded-sm uppercase tracking-wide">
                                        {tag}
                                    </span>
                                ))}
                                {insight.tags && insight.tags.length > 2 && (
                                    <span className="text-[9px] px-1.5 py-0.5 bg-neutral-100 text-neutral-500 rounded-sm">
                                        +{insight.tags.length - 2}
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center gap-4 text-xs text-neutral-500 mt-2 pt-2 border-t border-neutral-100">
                                <div className="flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5" />
                                    {insight.publishDate ? new Date(insight.publishDate).getFullYear() : (insight.scheduledDate ? new Date(insight.scheduledDate).getFullYear() : "-")}
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-4 h-4 rounded-full bg-neutral-100 flex items-center justify-center text-[8px] font-bold text-neutral-500">
                                        {insight.author.charAt(0)}
                                    </span>
                                    <span className="truncate max-w-[100px]">{insight.author}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
                {insights.length === 0 && (
                    <div className="h-24 border-2 border-dashed border-neutral-200 rounded-xl flex items-center justify-center text-sm text-neutral-400">
                        No insights
                    </div>
                )}
            </div>
        </div>
    );
}
