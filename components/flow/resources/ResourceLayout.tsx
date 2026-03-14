"use client";

import React, { useState } from "react";
import {
    ChevronDown,
    Download,
    FileText,
    FileSpreadsheet,
    Package,
    Wrench,
    Truck,
    Handshake,
    Layers,
    Boxes,
    CheckCircle2
} from "lucide-react";
import clsx from "clsx";
import { FinanceSummaryCard, FinanceSummaryCardsRow } from "@/components/flow/finance/FinanceSummaryCard";

export interface ResourceLayoutProps {
    title: string;
    description: string;
    stats: {
        total: number;
        catalogItems: number;
        subcategories: number;
        groups: number;
    };
    children: React.ReactNode;
    onSearch: (query: string) => void;
    subcategories: string[];
    groups: string[];
    selectedSubcategory: string;
    selectedGroup: string;
    onSubcategoryChange: (sub: string) => void;
    onGroupChange: (group: string) => void;
    currentCategory: string;
    // Pagination
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

const CATEGORY_ICONS: Record<string, any> = {
    material: Package,
    tool: Wrench,
    asset: Truck,
    service: Handshake,
};

export function ResourceLayout({
    title,
    description,
    stats,
    children,
    onSearch,
    subcategories,
    groups,
    selectedSubcategory,
    selectedGroup,
    onSubcategoryChange,
    onGroupChange,
    currentCategory,
    page,
    totalPages,
    onPageChange
}: ResourceLayoutProps) {
    const CategoryIcon = CATEGORY_ICONS[currentCategory.toLowerCase()] || Package;

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-500">
            {/* HEADER */}
            <div className="hidden lg:block mb-0">
                <div className="flex items-center justify-between gap-4 pt-0">
                    <div>
                        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white tracking-tight capitalize">
                            {title}
                        </h1>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                            {description}
                        </p>
                    </div>
                </div>
                <div className="border-b border-neutral-200 dark:border-neutral-800 mt-5" />
            </div>

            {/* SUMMARY CARDS */}
            <div className="-mx-5 lg:mx-0">
                <FinanceSummaryCardsRow>
                    <FinanceSummaryCard
                        icon={<CategoryIcon className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />}
                        iconBg="bg-neutral-100 dark:bg-neutral-800"
                        label="Total Items"
                        value={stats.total}
                        subtext="In Catalog"
                        activeColor="ring-neutral-200 dark:ring-neutral-700"
                    />
                    <FinanceSummaryCard
                        icon={<Layers className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />}
                        iconBg="bg-neutral-100 dark:bg-neutral-800"
                        label="Sub-categories"
                        value={stats.subcategories}
                        subtext="Standard Types"
                        activeColor="ring-neutral-200 dark:ring-neutral-700"
                    />
                    <FinanceSummaryCard
                        icon={<Boxes className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />}
                        iconBg="bg-neutral-100 dark:bg-neutral-800"
                        label="Groups"
                        value={stats.groups}
                        subtext="Level 3 Categories"
                        activeColor="ring-neutral-200 dark:ring-neutral-700"
                    />
                    <FinanceSummaryCard
                        icon={<CheckCircle2 className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />}
                        iconBg="bg-neutral-100 dark:bg-neutral-800"
                        label="Status"
                        value="ACTIVE"
                        subtext="Catalog Verified"
                        activeColor="ring-neutral-200 dark:ring-neutral-700"
                    />
                </FinanceSummaryCardsRow>
            </div>

            {/* TOOLBAR */}
            <div className="flex items-center gap-2 p-1.5 rounded-full bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm border border-neutral-200/60 dark:border-neutral-800/60 shadow-sm overflow-x-auto no-scrollbar transition-all">
                {/* Subcategory Filter */}
                <div className="relative group shrink-0">
                    <select
                        value={selectedSubcategory}
                        onChange={(e) => onSubcategoryChange(e.target.value)}
                        className="h-9 pl-4 pr-10 bg-white dark:bg-neutral-950 border border-neutral-200/80 dark:border-neutral-800 rounded-full text-[11px] font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 outline-none appearance-none cursor-pointer hover:border-neutral-300 transition-all min-w-[140px] shadow-sm"
                    >
                        <option value="ALL">All Sub-categories</option>
                        {subcategories.map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 pointer-events-none" />
                </div>

                {/* Group Filter */}
                <div className="relative group shrink-0">
                    <select
                        value={selectedGroup}
                        onChange={(e) => onGroupChange(e.target.value)}
                        className="h-9 pl-4 pr-10 bg-white dark:bg-neutral-950 border border-neutral-200/80 dark:border-neutral-800 rounded-full text-[11px] font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 outline-none appearance-none cursor-pointer hover:border-neutral-300 transition-all min-w-[140px] shadow-sm"
                    >
                        <option value="ALL">All Groups</option>
                        {groups.map(g => (
                            <option key={g} value={g}>{g}</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 pointer-events-none" />
                </div>

                <div className="flex-1" />

                {/* Export Dropdown */}
                <div className="relative group/export h-9 shrink-0 mr-1">
                    <button className="h-9 px-4 bg-white dark:bg-neutral-950 rounded-full border border-neutral-200/80 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 shadow-sm flex items-center justify-center gap-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all active:scale-95">
                        <Download className="w-3.5 h-3.5" />
                        <span className="text-[11px] font-bold uppercase tracking-wider">Export</span>
                    </button>
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xl rounded-[20px] opacity-0 invisible group-hover/export:opacity-100 group-hover/export:visible transition-all flex flex-col z-50 overflow-hidden py-1.5 scale-95 group-hover/export:scale-100 origin-top-right">
                        <button className="w-full relative px-4 py-2 flex items-center gap-3 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                            <FileText className="w-3.5 h-3.5 text-neutral-400" /> Export to PDF
                        </button>
                        <button className="w-full relative px-4 py-2 flex items-center gap-3 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                            <FileSpreadsheet className="w-3.5 h-3.5 text-neutral-400" /> Export to XLS
                        </button>
                    </div>
                </div>
            </div>

            {/* CONTENT LISTING */}
            <div className="flex flex-col gap-2">
                {children}
            </div>

            {/* PAGINATION */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-2 pb-4">
                    <button
                        onClick={() => onPageChange(page - 1)}
                        disabled={page <= 1}
                        className="px-4 py-2 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm font-bold text-neutral-600 dark:text-neutral-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-neutral-50 transition-all"
                    >
                        Previous
                    </button>
                    <span className="text-sm font-bold text-neutral-500 px-3 tabular-nums">
                        {page} / {totalPages}
                    </span>
                    <button
                        onClick={() => onPageChange(page + 1)}
                        disabled={page >= totalPages}
                        className="px-4 py-2 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm font-bold text-neutral-600 dark:text-neutral-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-neutral-50 transition-all"
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
}
