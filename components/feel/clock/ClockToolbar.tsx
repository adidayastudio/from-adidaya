"use client";

import React from "react";
import { Search, ArrowUpDown, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button/button";
import clsx from "clsx";
import { format } from "date-fns";

export interface FilterTab {
    id: string;
    label: string;
}

interface ClockToolbarProps {
    searchQuery: string;
    onSearchChange: (value: string) => void;

    tabs: FilterTab[];
    activeTab: string;
    onTabChange: (id: string) => void;

    currentDate: Date;
    onMonthChange: (direction: "prev" | "next") => void;

    onSort?: () => void;
    sortActive?: boolean;

    onExport?: () => void;
    isExporting?: boolean;

    className?: string;
}

export function ClockToolbar({
    searchQuery,
    onSearchChange,
    tabs,
    activeTab,
    onTabChange,
    currentDate,
    onMonthChange,
    onSort,
    sortActive,
    onExport,
    isExporting,
    className
}: ClockToolbarProps) {
    return (
        <div className={clsx("flex flex-col sm:flex-row items-center justify-between gap-4 w-full", className)}>
            <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
                {/* Search Pill */}
                <div className="relative group max-w-xs w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 group-focus-within:text-blue-500 transition-colors" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Search requests..."
                        className="w-full pl-9 pr-4 py-2 bg-white border border-neutral-200 rounded-full text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all shadow-sm"
                    />
                </div>

                {/* Filter Tabs Pill */}
                <div className="hidden sm:flex items-center p-1 bg-neutral-100 rounded-full border border-neutral-200 shadow-inner">
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => onTabChange(tab.id)}
                                className={clsx(
                                    "px-4 py-1.5 rounded-full text-xs font-bold transition-all relative z-10",
                                    isActive
                                        ? "bg-neutral-900 text-white shadow-md"
                                        : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/50"
                                )}
                            >
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                {/* Sort Button (Circular) */}
                {onSort && (
                    <button
                        onClick={onSort}
                        className={clsx(
                            "w-9 h-9 flex items-center justify-center rounded-full border transition-all",
                            sortActive
                                ? "bg-blue-50 border-blue-200 text-blue-600"
                                : "bg-white border-neutral-200 text-neutral-500 hover:bg-neutral-50 hover:border-neutral-300"
                        )}
                        title="Sort"
                    >
                        <ArrowUpDown className="w-4 h-4" />
                    </button>
                )}

                {/* Export Button (Circular) */}
                {onExport && (
                    <button
                        onClick={onExport}
                        disabled={isExporting}
                        className={clsx(
                            "w-9 h-9 flex items-center justify-center rounded-full border transition-all",
                            isExporting
                                ? "bg-neutral-100 border-neutral-200 text-neutral-400 cursor-not-allowed"
                                : "bg-white border-neutral-200 text-neutral-500 hover:bg-neutral-50 hover:border-neutral-300"
                        )}
                        title="Export PDF"
                    >
                        {isExporting ? (
                            <div className="w-4 h-4 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Download className="w-4 h-4" />
                        )}
                    </button>
                )}

                {/* Date Navigation Pill */}
                <div className="flex items-center bg-white border border-neutral-200 rounded-full p-1 shadow-sm">
                    <button
                        onClick={() => onMonthChange("prev")}
                        className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-neutral-100 text-neutral-500 transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-4 text-xs font-bold text-neutral-700 select-none min-w-[100px] text-center">
                        {format(currentDate, "MMMM yyyy")}
                    </span>
                    <button
                        onClick={() => onMonthChange("next")}
                        className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-neutral-100 text-neutral-500 transition-colors"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Mobile Tabs Fallback */}
            <div className="flex sm:hidden w-full overflow-x-auto pb-2 scrollbar-none">
                <div className="flex items-center p-1 bg-neutral-100 rounded-full border border-neutral-200 shadow-inner w-full">
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => onTabChange(tab.id)}
                                className={clsx(
                                    "flex-1 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all whitespace-nowrap",
                                    isActive
                                        ? "bg-neutral-900 text-white shadow-md"
                                        : "text-neutral-500 hover:text-neutral-900"
                                )}
                            >
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
