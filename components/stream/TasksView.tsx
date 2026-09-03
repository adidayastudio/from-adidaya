"use client";

import React, { useState, Suspense } from "react";
import clsx from "clsx";
import { useTheme } from "next-themes";
import { CheckSquare, List, History, Clock, CheckCircle2, ListFilter, Plus, LayoutGrid, Columns3, Search, X } from "lucide-react";
import TaskPage from "@/app/task/page";
import { HeaderProvider } from "@/components/providers/HeaderProvider";
import { GlobalLoading } from "@/components/shared/GlobalLoading";
import { SubTabButton } from "./stream-nav-helpers";
import type { FeedItem } from "@/lib/stream/types";

interface TasksViewProps {
    feedItems?: FeedItem[];
}

const TASK_TABS = [
    { id: "all", label: "All", icon: <List className="w-3.5 h-3.5" /> },
    { id: "revision", label: "Revision", icon: <History className="w-3.5 h-3.5" /> },
    { id: "active", label: "Active", icon: <Clock className="w-3.5 h-3.5" /> },
    { id: "done", label: "Done", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
];

export default function TasksView({ feedItems }: TasksViewProps) {
    const { theme } = useTheme();
    const [activeTab, setActiveTab] = useState("all");
    const [viewMode, setViewMode] = useState<"grid" | "kanban">("kanban");
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    return (
        <HeaderProvider>
            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                {/* Top Dynamic Floating Liquid Glass Full Pill Header Card (Same as Finance Stream) */}
                <div className="absolute top-3 left-4 right-4 z-30 pointer-events-none">
                    <div
                        style={{
                            background: theme === "dark"
                                ? "linear-gradient(180deg, rgba(24,24,27,0.92) 0%, rgba(15,15,18,0.85) 100%)"
                                : "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(245,245,250,0.85) 100%)",
                            backdropFilter: "blur(32px) saturate(180%)",
                            WebkitBackdropFilter: "blur(32px) saturate(180%)",
                            border: theme === "dark"
                                ? "1px solid rgba(255,255,255,0.12)"
                                : "1px solid rgba(255,255,255,0.8)",
                            boxShadow: theme === "dark"
                                ? "0 12px 40px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.08)"
                                : "0 12px 40px rgba(0,0,0,0.08), inset 0 1px 0.5px rgba(255,255,255,0.9)",
                        }}
                        className="h-13 sm:h-14 px-2.5 sm:px-3 flex items-center justify-between transition-all duration-300 w-full rounded-full gap-2 shadow-lg pointer-events-auto"
                    >
                        {/* Dynamic Title */}
                        <div className="flex items-center gap-2.5 min-w-0 shrink-0">
                            <div className="w-8 h-8 rounded-full bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                                <CheckSquare className="w-4 h-4" />
                            </div>
                            <h2 className="hidden lg:inline-block text-[13px] font-bold text-neutral-900 dark:text-white truncate">
                                Tasks
                            </h2>
                        </div>

                        {/* Top Tab Bar Pills (When in Grid Mode) */}
                        {viewMode === "grid" && (
                            <div className="hidden sm:flex items-center gap-1 shrink-0 overflow-x-auto scrollbar-hide py-1">
                                {TASK_TABS.map(tab => (
                                    <SubTabButton
                                        key={tab.id}
                                        active={activeTab === tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        icon={tab.icon}
                                        label={tab.label}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Right Action Controls: Search Icon/Input + View Switcher + Filter + Plus */}
                        <div className="flex items-center gap-2 shrink-0">
                            {/* Search Button / Input Pill */}
                            {isSearchOpen || searchQuery ? (
                                <div className="relative flex items-center shrink-0 animate-in fade-in zoom-in-95 duration-200">
                                    <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 pointer-events-none" />
                                    <input
                                        type="text"
                                        autoFocus
                                        placeholder="Search..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="h-9 pl-7 pr-7 w-28 sm:w-36 transition-all rounded-full bg-neutral-200/50 dark:bg-neutral-800/60 border border-neutral-300/40 dark:border-neutral-700/40 text-[11px] font-medium text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                                    />
                                    <button
                                        onClick={() => { setSearchQuery(""); setIsSearchOpen(false); }}
                                        className="absolute right-2.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer p-0.5"
                                        title="Close Search"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setIsSearchOpen(true)}
                                    className="h-9 w-9 rounded-full flex items-center justify-center transition-all border cursor-pointer bg-neutral-200/50 dark:bg-neutral-800/50 text-neutral-600 dark:text-neutral-300 border-neutral-300/40 dark:border-neutral-700/40 hover:bg-neutral-300/50 shrink-0"
                                    title="Search Tasks"
                                >
                                    <Search className="w-4 h-4" />
                                </button>
                            )}

                            {/* View Switcher Toggle Pill */}
                            <div className="flex items-center p-0.5 rounded-full bg-neutral-200/60 dark:bg-neutral-800/80 border border-neutral-300/40 dark:border-neutral-700/40">
                                <button
                                    onClick={() => setViewMode("grid")}
                                    className={clsx(
                                        "h-7 w-7 rounded-full flex items-center justify-center transition-all cursor-pointer",
                                        viewMode === "grid"
                                            ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs font-bold"
                                            : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
                                    )}
                                    title="Grid View"
                                >
                                    <LayoutGrid className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={() => setViewMode("kanban")}
                                    className={clsx(
                                        "h-7 w-7 rounded-full flex items-center justify-center transition-all cursor-pointer",
                                        viewMode === "kanban"
                                            ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs font-bold"
                                            : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
                                    )}
                                    title="Kanban Board View"
                                >
                                    <Columns3 className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            {/* Filter Button */}
                            <button
                                onClick={() => setIsFilterOpen(!isFilterOpen)}
                                className={clsx(
                                    "h-9 w-9 rounded-full flex items-center justify-center transition-all border cursor-pointer",
                                    isFilterOpen
                                        ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                                        : "bg-neutral-200/50 dark:bg-neutral-800/50 text-neutral-600 dark:text-neutral-300 border-neutral-300/40 dark:border-neutral-700/40 hover:bg-neutral-300/50"
                                )}
                                title="Filter Tasks"
                            >
                                <ListFilter className="w-4 h-4" />
                            </button>

                            {/* Blue Plus Button */}
                            <button
                                onClick={() => setIsAddOpen(true)}
                                className="h-9 w-9 rounded-full bg-[#0A84FF] hover:bg-blue-600 active:scale-90 text-white flex items-center justify-center shadow-md transition-all shrink-0 cursor-pointer"
                                title="Add Task"
                            >
                                <Plus className="w-4.5 h-4.5 stroke-[2.5]" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content Container Body */}
                <div className="flex-1 h-full overflow-y-auto pt-20 md:pt-24 pb-6 px-3 md:px-6 scrollbar-hide">
                    <Suspense fallback={<GlobalLoading />}>
                        <TaskPage
                            forcedActiveTab={activeTab}
                            onTabChange={setActiveTab}
                            hideSidebar={true}
                            hideHeader={true}
                            externalIsAddOpen={isAddOpen}
                            setExternalIsAddOpen={setIsAddOpen}
                            externalIsFilterOpen={isFilterOpen}
                            setExternalIsFilterOpen={setIsFilterOpen}
                            forcedViewMode={viewMode}
                            externalSearchQuery={searchQuery}
                        />
                    </Suspense>
                </div>
            </div>
        </HeaderProvider>
    );
}
