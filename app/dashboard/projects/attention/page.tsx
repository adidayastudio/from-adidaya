"use client";

import { useState, useMemo } from "react";
import clsx from "clsx";
import { AlertCircle, Clock, FileCheck, ArrowRight, CheckCircle2, Search, Filter, ArrowUpDown, ChevronDown } from "lucide-react";

type AttentionType = "blocked" | "delayed" | "approval";
type AttentionSeverity = "high" | "medium" | "low";

interface AttentionItem {
    id: string;
    type: AttentionType;
    severity: AttentionSeverity;
    project: string;
    projectCode: string;
    title: string;
    description: string;
    due: string;
    actionLabel: string;
}

const ITEMS: AttentionItem[] = [
    {
        id: "1",
        type: "blocked",
        severity: "high",
        project: "JPF House",
        projectCode: "JPF",
        title: "Site Access Blocked",
        description: "Construction team cannot access site due to permit issue.",
        due: "Immediate",
        actionLabel: "Resolve Permit"
    },
    {
        id: "2",
        type: "approval",
        severity: "high",
        project: "Skyline Tower",
        projectCode: "SKY",
        title: "Budget Overrun Approval",
        description: "Additional $50k needed for foundation reinforcement.",
        due: "Today",
        actionLabel: "Review Budget"
    },
    {
        id: "3",
        type: "delayed",
        severity: "medium",
        project: "Urban Park Center",
        projectCode: "UPC",
        title: "Material Delivery Delayed",
        description: "Steel shipment delayed by 3 days.",
        due: "2 days",
        actionLabel: "Adjust Schedule"
    },
    {
        id: "4",
        type: "approval",
        severity: "medium",
        project: "Lakeside Villa",
        projectCode: "LAK",
        title: "Interior Concept Sign-off",
        description: "Client ready for final presentation review.",
        due: "Tomorrow",
        actionLabel: "View Concept"
    }
];

export default function AttentionPage() {
    const [dismissed, setDismissed] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState<string>("all");
    const [sortBy, setSortBy] = useState<"severity" | "due">("severity");
    const [showSearchInput, setShowSearchInput] = useState(false);

    const handleDismiss = (id: string) => {
        setDismissed([...dismissed, id]);
    };

    const filteredItems = useMemo(() => {
        return ITEMS.filter(item => {
            if (dismissed.includes(item.id)) return false;

            const matchesSearch =
                item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.project.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.projectCode.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesType = filterType === "all" || item.type === filterType;

            return matchesSearch && matchesType;
        }).sort((a, b) => {
            if (sortBy === "severity") {
                const severityScore = { high: 3, medium: 2, low: 1 };
                return severityScore[b.severity] - severityScore[a.severity];
            } else {
                // Mock due date sort simplicity
                return a.due.localeCompare(b.due);
            }
        });
    }, [dismissed, searchQuery, filterType, sortBy]);

    const getIcon = (type: AttentionType) => {
        switch (type) {
            case "blocked": return <AlertCircle className="w-5 h-5 text-red-600" />;
            case "delayed": return <Clock className="w-5 h-5 text-orange-600" />;
            case "approval": return <FileCheck className="w-5 h-5 text-blue-600" />;
        }
    };

    const getBgColor = (type: AttentionType) => {
        switch (type) {
            case "blocked": return "bg-red-50 border-red-100 group-hover:border-red-200";
            case "delayed": return "bg-orange-50 border-orange-100 group-hover:border-orange-200";
            case "approval": return "bg-blue-50 border-blue-100 group-hover:border-blue-200";
        }
    };

    return (
        <div className="space-y-6 max-w-5xl animate-in fade-in duration-500">
            <div className="space-y-1">
                <h1 className="text-2xl font-bold text-neutral-900">Need Attention</h1>
                <p className="text-sm text-neutral-500">Items requiring your immediate intervention.</p>
            </div>

            <div className="border-b border-neutral-200" />

            {/* TOOLBAR - MATCHING ACTIVE PROJECTS / CLOCK STYLE */}
            <div className="flex items-center justify-between gap-2 w-full">
                {/* LEFT GROUP: Search & Filter */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Search: Icon on tiny, Input on md+ */}
                    <>
                        {/* Icon-only button for tiny screens */}
                        <button
                            onClick={() => setShowSearchInput(!showSearchInput)}
                            className="md:hidden p-2 rounded-full border border-neutral-200 bg-white text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50 transition-colors flex-shrink-0"
                            title="Search"
                        >
                            <Search className="w-4 h-4" />
                        </button>
                        {/* Full input for md+ */}
                        <div className="relative hidden md:block flex-shrink-0">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                            <input
                                type="text"
                                placeholder="Search issues..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 pr-3 py-2 text-sm border border-neutral-200 rounded-full bg-white focus:outline-none focus:ring-2 focus:ring-neutral-100 w-48 transition-all"
                            />
                        </div>
                    </>

                    {/* Filter Dropdown */}
                    <div className="relative">
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="appearance-none pl-9 pr-8 py-2 text-sm border border-neutral-200 rounded-full bg-white cursor-pointer hover:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-100"
                        >
                            <option value="all">All Issues</option>
                            <option value="blocked">Blocked</option>
                            <option value="delayed">Delayed</option>
                            <option value="approval">Approvals</option>
                        </select>
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 pointer-events-none" />
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 pointer-events-none" />
                    </div>
                </div>

                {/* RIGHT GROUP: Sort */}
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as "severity" | "due")}
                            className="appearance-none pl-9 pr-8 py-2 text-sm border border-neutral-200 rounded-full bg-white cursor-pointer hover:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-100"
                        >
                            <option value="severity">Sort by Severity</option>
                            <option value="due">Sort by Due Date</option>
                        </select>
                        <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 pointer-events-none" />
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* Expandable Search Input for tiny screens */}
            {showSearchInput && (
                <div className="md:hidden relative w-full animate-in fade-in slide-in-from-top-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                        type="text"
                        placeholder="Search issues..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm border border-neutral-200 rounded-full bg-white focus:outline-none focus:ring-2 focus:ring-neutral-100"
                        autoFocus
                    />
                </div>
            )}

            {filteredItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-neutral-200 rounded-xl bg-neutral-50/50">
                    <CheckCircle2 className="w-12 h-12 text-green-500 mb-4" />
                    <h3 className="text-lg font-semibold text-neutral-900">All Caught Up!</h3>
                    <p className="text-neutral-500 max-w-xs mx-auto mt-1">
                        {searchQuery ? `No issues found matching "${searchQuery}"` : "Great job. There are no critical items requiring your attention right now."}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredItems.map((item) => (
                        <div key={item.id} className={clsx(
                            "group flex flex-col md:flex-row md:items-center gap-4 p-5 rounded-2xl border transition-all shadow-sm",
                            getBgColor(item.type)
                        )}>
                            {/* Icon Box */}
                            <div className="flex-shrink-0">
                                <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center border border-neutral-100">
                                    {getIcon(item.type)}
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="flex items-center gap-2 text-[11px] text-neutral-500 font-medium bg-neutral-50 px-2 py-1 rounded-md border border-neutral-100">
                                        <span>00{item.id}</span>
                                        <span className="text-neutral-300">•</span>
                                        <span>{item.projectCode}</span>
                                    </div>
                                    <span className="text-xs font-medium text-neutral-400 uppercase tracking-wide">
                                        — {item.project}
                                    </span>
                                </div>
                                <h3 className="text-lg font-bold text-neutral-900 leading-tight mb-1">
                                    {item.title}
                                </h3>
                                <p className="text-sm text-neutral-600 leading-relaxed">
                                    {item.description}
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-row md:flex-col items-center md:items-end gap-3 md:gap-2 w-full md:w-auto mt-2 md:mt-0 pl-0 md:pl-4 md:border-l md:border-neutral-200/60">
                                <div className="text-xs font-semibold text-neutral-900 bg-white px-3 py-1 rounded-full shadow-sm border border-neutral-100 mb-0 md:mb-2 ml-auto md:ml-0 order-2 md:order-1">
                                    Due: {item.due}
                                </div>
                                <div className="flex gap-2 w-full md:w-auto order-1 md:order-2">
                                    <button
                                        onClick={() => handleDismiss(item.id)}
                                        className="flex-1 md:flex-none text-xs font-medium text-neutral-500 hover:text-neutral-700 px-4 py-2 hover:bg-white/50 rounded-lg transition-colors"
                                    >
                                        Dismiss
                                    </button>
                                    <button className={clsx(
                                        "flex-1 md:flex-none flex items-center justify-center gap-2 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors whitespace-nowrap",
                                        item.type === "blocked" ? "bg-red-600 hover:bg-red-800 active:bg-red-900" :
                                            item.type === "delayed" ? "bg-orange-500 hover:bg-orange-700 active:bg-orange-800" :
                                                "bg-blue-600 hover:bg-blue-800 active:bg-blue-900"
                                    )}>
                                        {item.actionLabel}
                                        <ArrowRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
