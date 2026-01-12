"use client";

import { useState, useMemo } from "react";
import { FileCheck, GitCommit, Layout, MessageSquare, Plus, Search, Calendar, ChevronDown, Filter } from "lucide-react";
import clsx from "clsx";

interface UpdateItem {
    id: string;
    project: string;
    projectCode: string;
    user: string;
    action: string;
    target: string;
    time: string;
    timestamp: Date; // Added for sorting/filtering
    type: "commit" | "comment" | "approval" | "creation";
}

const UPDATE_ITEMS: UpdateItem[] = [
    {
        id: "1",
        project: "JPF House",
        projectCode: "JPF",
        user: "Sarah Chen",
        action: "approved",
        target: "Concept Design v2",
        time: "10 mins ago",
        timestamp: new Date(Date.now() - 10 * 60 * 1000),
        type: "approval"
    },
    {
        id: "2",
        project: "Skyline Tower",
        projectCode: "SKY",
        user: "Mike Ross",
        action: "commented on",
        target: "Foundation WBS",
        time: "1 hour ago",
        timestamp: new Date(Date.now() - 60 * 60 * 1000),
        type: "comment"
    },
    {
        id: "3",
        project: "Urban Park Center",
        projectCode: "UPC",
        user: "System",
        action: "created",
        target: "New Milestone: Landscape",
        time: "2 hours ago",
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        type: "creation"
    },
    {
        id: "4",
        project: "JPF House",
        projectCode: "JPF",
        user: "Alex Wong",
        action: "updated",
        target: "Floor Plan Drawings",
        time: "4 hours ago",
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
        type: "commit"
    },
    {
        id: "5",
        project: "Lakeside Villa",
        projectCode: "LAK",
        user: "Sarah Chen",
        action: "completed",
        target: "Client Briefing",
        time: "Yesterday",
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
        type: "commit"
    }
];

export default function UpdatesPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [timeFilter, setTimeFilter] = useState<"all" | "today" | "week">("all");
    const [showSearchInput, setShowSearchInput] = useState(false);

    const filteredItems = useMemo(() => {
        return UPDATE_ITEMS.filter(item => {
            // Search
            const query = searchQuery.toLowerCase();
            const matchesSearch =
                item.user.toLowerCase().includes(query) ||
                item.target.toLowerCase().includes(query) ||
                item.project.toLowerCase().includes(query);

            // Time Filter
            let matchesTime = true;
            const now = new Date();
            if (timeFilter === "today") {
                matchesTime = item.timestamp > new Date(now.setHours(0, 0, 0, 0));
            } else if (timeFilter === "week") {
                matchesTime = item.timestamp > new Date(now.setDate(now.getDate() - 7));
            }

            return matchesSearch && matchesTime;
        });
    }, [searchQuery, timeFilter]);

    const getIcon = (type: UpdateItem["type"]) => {
        switch (type) {
            case "commit": return <GitCommit className="w-4 h-4 text-purple-600" />;
            case "comment": return <MessageSquare className="w-4 h-4 text-blue-600" />;
            case "approval": return <FileCheck className="w-4 h-4 text-emerald-600" />;
            case "creation": return <Plus className="w-4 h-4 text-orange-600" />;
            default: return <Layout className="w-4 h-4 text-neutral-600" />;
        }
    };

    const getBgColor = (type: UpdateItem["type"]) => {
        switch (type) {
            case "commit": return "bg-purple-50 group-hover:bg-purple-100";
            case "comment": return "bg-blue-50 group-hover:bg-blue-100";
            case "approval": return "bg-emerald-50 group-hover:bg-emerald-100";
            case "creation": return "bg-orange-50 group-hover:bg-orange-100";
            default: return "bg-neutral-50";
        }
    };

    return (
        <div className="space-y-6 max-w-5xl animate-in fade-in duration-500">
            <div className="space-y-1">
                <h1 className="text-2xl font-bold text-neutral-900">Project Updates</h1>
                <p className="text-sm text-neutral-500">Recent activity across your projects.</p>
            </div>

            <div className="border-b border-neutral-200" />

            {/* TOOLBAR */}
            <div className="flex items-center justify-between gap-2 w-full">
                {/* Search & Filter */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Search */}
                    <>
                        <button
                            onClick={() => setShowSearchInput(!showSearchInput)}
                            className="md:hidden p-2 rounded-full border border-neutral-200 bg-white text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50 transition-colors flex-shrink-0"
                            title="Search"
                        >
                            <Search className="w-4 h-4" />
                        </button>
                        <div className="relative hidden md:block flex-shrink-0">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                            <input
                                type="text"
                                placeholder="Search history..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 pr-3 py-2 text-sm border border-neutral-200 rounded-full bg-white focus:outline-none focus:ring-2 focus:ring-neutral-100 w-56 transition-all"
                            />
                        </div>
                    </>

                    {/* Time Filter */}
                    <div className="relative">
                        <select
                            value={timeFilter}
                            onChange={(e) => setTimeFilter(e.target.value as any)}
                            className="appearance-none pl-9 pr-8 py-2 text-sm border border-neutral-200 rounded-full bg-white cursor-pointer hover:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-100"
                        >
                            <option value="all">All Time</option>
                            <option value="today">Today</option>
                            <option value="week">Past 7 Days</option>
                        </select>
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 pointer-events-none" />
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* Mobile Search Expand */}
            {showSearchInput && (
                <div className="md:hidden relative w-full animate-in fade-in slide-in-from-top-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                        type="text"
                        placeholder="Search history..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm border border-neutral-200 rounded-full bg-white focus:outline-none focus:ring-2 focus:ring-neutral-100"
                        autoFocus
                    />
                </div>
            )}

            <div className="space-y-3">
                {filteredItems.length === 0 ? (
                    <div className="text-center py-12 text-neutral-400 text-sm bg-neutral-50/50 rounded-2xl border border-dashed border-neutral-200">
                        No updates found matching filters.
                    </div>
                ) : (
                    filteredItems.map((item) => (
                        <div key={item.id} className="group p-4 bg-white hover:bg-neutral-50/50 border border-neutral-100 rounded-xl shadow-sm hover:shadow transition-all flex items-start gap-4">
                            {/* Icon */}
                            <div className={clsx(
                                "flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                                getBgColor(item.type)
                            )}>
                                {getIcon(item.type)}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0 pt-0.5">
                                <div className="flex items-center justify-between gap-4 mb-0.5">
                                    <p className="text-sm text-neutral-900 truncate">
                                        <span className="font-bold text-neutral-900">{item.user}</span>{" "}
                                        <span className="text-neutral-500">{item.action}</span>{" "}
                                        <span className="font-semibold text-neutral-900">{item.target}</span>
                                    </p>
                                    <span className="text-[11px] font-medium text-neutral-400 flex-shrink-0">{item.time}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-medium text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded border border-neutral-200/50">
                                        {item.projectCode}
                                    </span>
                                    <span className="text-xs text-neutral-500 truncate">{item.project}</span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
