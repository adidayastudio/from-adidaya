"use client";

import { useMemo, useState } from "react";
import { Insight, INSIGHT_STATUS_COLORS } from "./types";
import { ChevronDown, ChevronUp, Pencil, Trash2, Calendar } from "lucide-react";
import clsx from "clsx";

type Props = {
    insights: Insight[];
    onEditInsight: (insight: Insight) => void;
    onDeleteInsight: (insight: Insight) => void;
};

type SortKey = "title" | "category" | "status" | "author" | "date";
type SortDir = "asc" | "desc";

export default function InsightsListView({ insights, onEditInsight, onDeleteInsight }: Props) {
    const [sortKey, setSortKey] = useState<SortKey>("date");
    const [sortDir, setSortDir] = useState<SortDir>("desc");

    const sortedInsights = useMemo(() => {
        return [...insights].sort((a, b) => {
            let cmp = 0;
            switch (sortKey) {
                case "title": cmp = a.title.localeCompare(b.title); break;
                case "category": cmp = a.category.localeCompare(b.category); break;
                case "status": cmp = a.status.localeCompare(b.status); break;
                case "author": cmp = a.author.localeCompare(b.author); break;
                case "date":
                    const dateA = a.publishDate || a.scheduledDate || "";
                    const dateB = b.publishDate || b.scheduledDate || "";
                    cmp = dateA.localeCompare(dateB);
                    break;
            }
            return sortDir === "asc" ? cmp : -cmp;
        });
    }, [insights, sortKey, sortDir]);

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir(d => d === "asc" ? "desc" : "asc");
        } else {
            setSortKey(key);
            setSortDir("asc");
        }
    };

    const SortIcon = ({ colKey }: { colKey: SortKey }) => {
        const isActive = sortKey === colKey;
        const iconClass = isActive ? "text-neutral-700" : "text-neutral-300";
        return (
            <span className={`ml-1 inline-flex ${iconClass}`}>
                {isActive && sortDir === "desc"
                    ? <ChevronDown className="w-3 h-3" />
                    : <ChevronUp className="w-3 h-3" />
                }
            </span>
        );
    };

    const SortableHeader = ({ label, colKey, className = "" }: { label: string; colKey: SortKey; className?: string }) => (
        <th
            className={`px-6 py-3 font-medium cursor-pointer hover:text-neutral-600 transition-colors select-none ${className}`}
            onClick={() => toggleSort(colKey)}
        >
            {label}
            <SortIcon colKey={colKey} />
        </th>
    );

    if (insights.length === 0) {
        return (
            <div className="p-10 text-center text-neutral-400 text-sm border border-neutral-200 rounded-xl bg-white">
                No insights found matching your criteria.
            </div>
        );
    }

    return (
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead>
                        <tr className="bg-neutral-50 border-b border-neutral-200 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                            <th className="px-6 py-3 w-[80px]">Image</th>
                            <SortableHeader label="Title & Tags" colKey="title" />
                            <SortableHeader label="Category" colKey="category" />
                            <SortableHeader label="Author" colKey="author" />
                            <SortableHeader label="Status" colKey="status" />
                            <SortableHeader label="Date" colKey="date" />
                            <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                        {sortedInsights.map(insight => (
                            <tr
                                key={insight.id}
                                className="group hover:bg-neutral-50/50 transition-colors cursor-pointer"
                                onClick={() => onEditInsight(insight)}
                            >
                                <td className="px-6 py-3">
                                    <div className="w-12 h-9 rounded bg-neutral-100 overflow-hidden border border-neutral-100">
                                        {insight.image && <img src={insight.image} alt="" className="w-full h-full object-cover" />}
                                    </div>
                                </td>
                                <td className="px-6 py-3">
                                    <div className="font-bold text-sm text-neutral-900 group-hover:text-[#E23528] transition-colors">{insight.title}</div>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {insight.tags?.slice(0, 3).map(tag => (
                                            <span key={tag} className="text-[10px] text-neutral-400 uppercase tracking-wide">
                                                #{tag}
                                            </span>
                                        ))}
                                    </div>
                                </td>
                                <td className="px-6 py-3">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-neutral-100 text-neutral-600 border border-neutral-200">
                                        {insight.category}
                                    </span>
                                </td>
                                <td className="px-6 py-3">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-5 h-5 rounded-full bg-neutral-200 flex items-center justify-center text-[10px] font-bold text-neutral-600">
                                            {insight.author.charAt(0)}
                                        </div>
                                        <span className="text-sm text-neutral-700">{insight.author}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-3">
                                    <span className={clsx(
                                        "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap",
                                        INSIGHT_STATUS_COLORS[insight.status] || "bg-neutral-100 text-neutral-500"
                                    )}>
                                        {insight.status.replace(/_/g, " ")}
                                    </span>
                                </td>
                                <td className="px-6 py-3">
                                    {(insight.scheduledDate || insight.publishDate) ? (
                                        <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {insight.publishDate ? new Date(insight.publishDate).toLocaleDateString() : new Date(insight.scheduledDate!).toLocaleDateString()}
                                        </div>
                                    ) : (
                                        <span className="text-xs text-neutral-400">-</span>
                                    )}
                                </td>
                                <td className="px-6 py-3 text-right">
                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            className="p-1.5 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                            title="Edit"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onEditInsight(insight);
                                            }}
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded"
                                            title="Delete"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (confirm("Are you sure you want to delete this insight?")) {
                                                    onDeleteInsight(insight);
                                                }
                                            }}
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
