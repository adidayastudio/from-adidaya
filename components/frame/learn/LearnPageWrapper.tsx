"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import LearnMobileHeader from "@/components/frame/learn/LearnMobileHeader";
import { GraduationCap, LayoutGrid, Star, FileText, Layout, BookOpen, Plus, ListFilter, Search, X, LayoutList, List, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { QuickView } from "./types";
import { useHeader } from "@/components/providers/HeaderProvider";
import KnowledgeDrawer from "./KnowledgeDrawer";
import { useUserContext } from "@/components/providers/UserProvider";

interface LearnPageWrapperProps {
    breadcrumbItems: { label: string; href?: string }[];
    header?: React.ReactNode;
    children: React.ReactNode;
    sidebar?: React.ReactNode;
    // Mobile Filter Props
    view?: "list" | "grouped";
    onChangeView?: (v: "list" | "grouped") => void;
    selectedDepartment?: string[];
    onDepartmentChange?: (dept: any) => void;
    selectedType?: string[];
    onTypeChange?: (type: any) => void;
    typeOptions?: { value: string; label: string }[];
    selectedSort?: string;
    onSortChange?: (sort: any) => void;
    onAddKnowledgeSuccess?: (data: any) => void;
    searchQuery?: string;
    onSearchChange?: (q: string) => void;
    activeQuickView?: QuickView;
}

export default function LearnPageWrapper({
    breadcrumbItems,
    header,
    children,
    sidebar,
    view,
    onChangeView,
    selectedDepartment,
    onDepartmentChange,
    selectedType,
    onTypeChange,
    typeOptions,
    selectedSort,
    onSortChange,
    onAddKnowledgeSuccess,
    searchQuery = "",
    onSearchChange,
    activeQuickView: activeQuickViewProp,
}: LearnPageWrapperProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [showAddKnowledge, setShowAddKnowledge] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const { profile } = useUserContext();

    const canManage = !!(profile?.role && ["superadmin", "admin", "administrator", "supervisor", "hr", "pm", "management", "owner"].includes(profile.role.toLowerCase()));

    useEffect(() => {
        setIsMounted(true);
        const handleOpenFilters = () => setShowFilters(true);
        const handleOpenAdd = () => setShowAddKnowledge(true);
        
        window.addEventListener('toggle-filters', handleOpenFilters);
        window.addEventListener('ADIDAYA_OPEN_ADD_KNOWLEDGE', handleOpenAdd);
        
        return () => {
            window.removeEventListener('toggle-filters', handleOpenFilters);
            window.removeEventListener('ADIDAYA_OPEN_ADD_KNOWLEDGE', handleOpenAdd);
        };
    }, []);

    useEffect(() => {
        if (isSearchExpanded && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isSearchExpanded]);
    
    // Logic to determine active view based on params (fallback if prop not provided)
    const activeQuickView = useMemo(() => {
        if (activeQuickViewProp) return activeQuickViewProp;
        
        const category = searchParams.get("category");
        const viewParam = searchParams.get("view");
        
        if (viewParam === "favorite") return "favorite";
        if (category === "documentation") return "documentation";
        if (category === "templates") return "templates";
        if (category === "references") return "references";
        return "all";
    }, [activeQuickViewProp, searchParams]);

    const activeLabel = useMemo(() => {
        if (activeQuickView === "documentation") return "Documentation";
        if (activeQuickView === "templates") return "Templates";
        if (activeQuickView === "references") return "References";
        if (activeQuickView === "favorite") return "Favorites";
        return "All Knowledge";
    }, [activeQuickView]);

    const LEARN_TABS = [
        { id: "all", label: "All", icon: LayoutGrid, href: "/frame/learn" },
        { id: "documentation", label: "Docs", icon: FileText, href: "/frame/learn?category=documentation" },
        { id: "templates", label: "Templates", icon: Layout, href: "/frame/learn?category=templates" },
        { id: "references", label: "References", icon: BookOpen, href: "/frame/learn?category=references" },
        { id: "favorite", label: "Favorites", icon: Star, href: "/frame/learn?view=favorite" },
    ];

    // INJECT CUSTOM HEADER FOR DESKTOP/IPAD
    const customHeader = useMemo(() => ({
        hideGlobalActions: true,
        middle: (
            <div className="flex items-center gap-1.5 text-[11px] font-medium tracking-tight">
                {/* Desktop: Show full breadcrumb */}
                <div className="hidden lg:flex items-center gap-1.5">
                    <Link href="/frame/learn" className="hover:opacity-100 transition-opacity opacity-70">
                        Learn
                    </Link>
                    {activeQuickView !== "all" && (
                        <>
                            <span className="text-neutral-400 opacity-40 font-normal mx-0.5">{'>'}</span>
                            <span className="opacity-100">{activeLabel}</span>
                        </>
                    )}
                </div>
                {/* iPad: Show only current segment ("paling bawah") icon/label */}
                <div className="flex lg:hidden items-center">
                   <span className="opacity-100">{activeQuickView === "all" ? "Learn" : activeLabel}</span>
                </div>
            </div>
        ),
        right: (
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={clsx(
                        "w-9 h-9 flex items-center justify-center rounded-full transition-all border shadow-sm",
                        showFilters
                            ? "bg-blue-50 border-blue-200 text-blue-600 shadow-blue-100/20"
                            : "bg-white/60 border-white/80 text-neutral-600 hover:bg-white hover:text-neutral-900"
                    )}
                    title="Filters"
                >
                    <ListFilter className={clsx("w-4 h-4", showFilters ? "stroke-[2.5px]" : "stroke-[1.5px]")} />
                </button>
                {canManage && (
                    <button
                        onClick={() => setShowAddKnowledge(true)}
                        className="w-9 h-9 flex items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 active:scale-95 transition-all"
                        title="Add Knowledge"
                    >
                        <Plus className="w-4 h-4" strokeWidth={2.5} />
                    </button>
                )}
            </div>
        )
    }), [showFilters, activeQuickView, activeLabel, canManage]);

    useHeader(customHeader, [showFilters, activeQuickView, activeLabel, canManage]);

    return (
        <>
            {/* MOBILE LAYOUT */}
            <div className="md:hidden min-h-screen bg-neutral-100 dark:bg-black">
                <LearnMobileHeader
                    view={view}
                    onChangeView={onChangeView}
                    onOpenFilters={() => setShowFilters(true)}
                    isFilterActive={showFilters}
                    onOpenAddKnowledge={() => setShowAddKnowledge(true)}
                    onAddKnowledgeSuccess={onAddKnowledgeSuccess}
                />

                <div className="pb-32 px-5 space-y-4 mt-2">
                    {/* Content Area */}
                    <div className="w-full">
                        {header}
                        {children}
                    </div>
                </div>
            </div>

            {/* DESKTOP/IPAD LAYOUT - PARITY WITH FINANCE STRUCTURE */}
            <div className="hidden md:block min-h-screen bg-transparent p-0 transition-colors">
                <PageWrapper sidebar={sidebar} isTransparent>
                    <div className="space-y-4 w-full animate-in fade-in duration-500">
                        {/* Header Area */}
                        <div className="flex flex-col md:px-0">
                            <div className="flex flex-col gap-1 w-full mb-2">
                                <h1 className="text-xl md:text-2xl font-bold text-neutral-900 dark:text-white tracking-tight">
                                    {activeLabel}
                                </h1>
                                {activeQuickView !== "all" && (
                                    <p className="text-[12px] text-neutral-500 font-medium">
                                        Browsing {activeLabel.toLowerCase()}
                                    </p>
                                )}
                            </div>
                            {header}
                        </div>

                        {/* Inline Tabs for iPad viewports */}
                        <div className="hidden md:block lg:hidden md:px-0 pb-2">
                            <div className="flex items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] -mx-4 px-4">
                                {LEARN_TABS.map((tab) => {
                                    const isActive = activeQuickView === tab.id;
                                    const Icon = tab.icon;
                                    return (
                                        <Link
                                            key={tab.id}
                                            href={tab.href}
                                            className={clsx(
                                                "relative flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all flex-shrink-0 text-[13px]",
                                                isActive
                                                    ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm border border-black/[0.04] dark:border-white/[0.05] font-bold"
                                                    : "bg-transparent text-neutral-500 dark:text-neutral-400 font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                            )}
                                        >
                                            <div className="relative z-10 flex items-center gap-2">
                                                <Icon size={16} strokeWidth={isActive ? 2.5 : 2} className={isActive ? "text-neutral-900 dark:text-white" : "opacity-60"} />
                                                <span className="text-[13px]">{tab.label}</span>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Main Page Content */}
                        <div className="md:px-0">
                            {children}
                        </div>
                    </div>
                </PageWrapper>
            </div>

            <KnowledgeDrawer
                isOpen={showAddKnowledge}
                onClose={() => setShowAddKnowledge(false)}
                onSuccess={(data) => {
                    if (onAddKnowledgeSuccess) onAddKnowledgeSuccess(data);
                    setShowAddKnowledge(false);
                }}
            />

            {/* Shared Filter Drawer / Sheet */}
            {showFilters && (
                <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:justify-end">
                    <div
                        className="absolute inset-0 bg-black/5 backdrop-blur-[2px] transition-opacity"
                        onClick={() => setShowFilters(false)}
                    />
                    <div className={clsx(
                        "relative bg-white/70 backdrop-blur-2xl backdrop-saturate-[1.8] rounded-[56px] shadow-2xl overflow-hidden border border-white/40 p-8 flex flex-col gap-8 transition-all duration-500",
                        "w-[calc(100%-16px)] mx-2 mb-2 max-h-[85dvh] animate-in slide-in-from-bottom",
                        "sm:w-[500px] sm:mr-6 sm:mb-6 sm:mx-0 sm:max-h-[calc(100vh-48px)]"
                    )}>
                        <div className="flex items-center justify-between px-2">
                            <h3 className="text-[22px] font-bold text-neutral-900 tracking-tight">Filters</h3>
                            <div className="flex items-center gap-3">
                                {(selectedDepartment?.[0] !== "ALL" || selectedType?.[0] !== "ALL" || (selectedSort && selectedSort !== "name-asc")) && (
                                    <button
                                        onClick={() => {
                                            onDepartmentChange?.("ALL");
                                            onTypeChange?.("ALL");
                                            onSortChange?.("name-asc");
                                        }}
                                        className="text-[13px] font-medium text-blue-600 hover:text-blue-700 active:scale-95 transition-all outline-none"
                                    >
                                        Clear Filters
                                    </button>
                                )}
                                <button
                                    onClick={() => setShowFilters(false)}
                                    className="w-10 h-10 bg-white/50 backdrop-blur-xl border border-black/5 rounded-full flex items-center justify-center active:scale-95 transition-transform"
                                >
                                    <X size={20} className="text-neutral-500" strokeWidth={1.5} />
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-col gap-8 overflow-y-auto pb-24 pr-1 scrollbar-hide">
                            <div className="space-y-4">
                                <h4 className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.2em] px-2">Department</h4>
                                <div className="flex flex-wrap gap-2.5">
                                    {require("./types").DEPARTMENT_OPTIONS.map((opt: any) => {
                                        const isSelected = selectedDepartment?.includes(opt.value);
                                        return (
                                            <button
                                                key={opt.value}
                                                onClick={() => onDepartmentChange?.(opt.value)}
                                                className={clsx(
                                                    "px-4 py-2 rounded-full text-[13px] transition-all border",
                                                    isSelected
                                                        ? "bg-blue-600 text-white border-blue-500 font-medium"
                                                        : "bg-white/40 text-neutral-600 border-black/[0.04] hover:bg-neutral-100"
                                                )}
                                            >
                                                {opt.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.2em] px-2">Knowledge Type</h4>
                                <div className="flex flex-wrap gap-2.5">
                                    {typeOptions?.map((opt: any) => {
                                        const isSelected = selectedType?.includes(opt.value);
                                        return (
                                            <button
                                                key={opt.value}
                                                onClick={() => onTypeChange?.(opt.value)}
                                                className={clsx(
                                                    "px-4 py-2 rounded-full text-[13px] transition-all border",
                                                    isSelected
                                                        ? "bg-blue-600 text-white border-blue-500 font-medium"
                                                        : "bg-white/40 text-neutral-600 border-black/[0.04] hover:bg-neutral-100"
                                                )}
                                            >
                                                {opt.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="absolute bottom-0 left-0 right-0 px-8 pb-8 bg-transparent flex flex-col">
                            <button
                                onClick={() => setShowFilters(false)}
                                className="w-full bg-blue-600/90 backdrop-blur-xl text-white py-4 rounded-full font-bold text-[17px] active:scale-[0.98] transition-all mb-1 border border-white/20 shadow-xl"
                            >
                                Apply Filters
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
