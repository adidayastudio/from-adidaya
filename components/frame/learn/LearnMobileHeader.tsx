"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import clsx from "clsx";
import {
    ChevronLeft,
    Plus,
    GraduationCap,
    Search,
    List,
    LayoutList,
    ListFilter,
    X,
    Upload,
    FileText as FileIcon,
    LayoutGrid,
    Layout,
    BookOpen,
    Star,
    FileText,
} from "lucide-react";
import { DEPARTMENT_OPTIONS, SORT_OPTIONS } from "./types";
import KnowledgeDrawer from "./KnowledgeDrawer";
import { useUserContext } from "@/components/providers/UserProvider";

const LEARN_TABS = [
    { id: "all", label: "All", href: "/frame/learn", icon: LayoutGrid },
    { id: "documentation", label: "Docs", href: "/frame/learn?category=documentation", icon: FileText },
    { id: "templates", label: "Templates", href: "/frame/learn?category=templates", icon: Layout },
    { id: "references", label: "References", href: "/frame/learn?category=references", icon: BookOpen },
    { id: "favorites", label: "Favorites", href: "/frame/learn?view=favorite", icon: Star },
];

interface LearnMobileHeaderProps {
    onAddKnowledge?: () => void;
    backUrl?: string;
    // View props
    view?: "list" | "grouped";
    onChangeView?: (v: "list" | "grouped") => void;
    // Filter props
    selectedDepartment?: string[];
    onDepartmentChange?: (dept: string) => void;
    selectedType?: string[];
    onTypeChange?: (type: string) => void;
    typeOptions?: { value: string; label: string }[];
    selectedSort?: string;
    onSortChange?: (sort: any) => void;
    onAddKnowledgeSuccess?: (data: any) => void;
}

export default function LearnMobileHeader({
    onAddKnowledge,
    backUrl = "/dashboard",
    view = "list",
    onChangeView,
    selectedDepartment = ["ALL"],
    onDepartmentChange,
    selectedType = ["ALL"],
    onTypeChange,
    typeOptions = [],
    selectedSort,
    onSortChange,
    onAddKnowledgeSuccess
}: LearnMobileHeaderProps) {
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [scrolled, setScrolled] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [showAddKnowledge, setShowAddKnowledge] = useState(false);
    const { profile } = useUserContext();

    const canManage = !!(profile?.role && ["superadmin", "admin", "administrator", "supervisor", "hr", "pm", "management", "owner"].includes(profile.role.toLowerCase()));

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        const handleOpenAdd = () => setShowAddKnowledge(true);

        window.addEventListener('scroll', handleScroll);
        window.addEventListener('ADIDAYA_OPEN_ADD_KNOWLEDGE', handleOpenAdd);

        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('ADIDAYA_OPEN_ADD_KNOWLEDGE', handleOpenAdd);
        };
    }, []);

    const isActive = (href: string) => {
        const [hrefPath, hrefQuery] = href.split('?');
        if (hrefQuery) {
            if (pathname === hrefPath) {
                const params = new URLSearchParams(hrefQuery);
                for (const [key, value] of params.entries()) {
                    if (searchParams.get(key) !== value) return false;
                }
                // Check if there are no OTHER relevant params present when only category is expected
                if (params.has('category') && searchParams.get('view')) return false;
                return true;
            }
            return false;
        }
        if (pathname === hrefPath) {
            // Check if there are NO category or view params
            return !searchParams.get('category') && !searchParams.get('view');
        }
        return false;
    };

    const isBrowseActive = true; // Always show filters and view toggle on mobile learn
    const isFilterActive = selectedDepartment[0] !== "ALL" || selectedType[0] !== "ALL" || (selectedSort && selectedSort !== "name-asc");


    return (
        <>
            {/* Fixed Floating Top Bar */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-50 pt-6 pointer-events-none">
                {/* Background Mask - Linear Blur effect */}
                <div className={clsx(
                    "absolute inset-0 bg-white/60 transition-all duration-500 pointer-events-none",
                    scrolled ? "opacity-100" : "opacity-0"
                )} style={{
                    maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
                    WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
                    backdropFilter: scrolled ? 'blur(16px)' : 'none',
                    height: '80px'
                }} />

                <div className="flex items-center justify-between px-5 pointer-events-auto relative z-10 pb-2">
                    <div className={clsx(
                        "p-1 rounded-full shadow-sm border border-black/[0.03] transition-all duration-300",
                        scrolled ? "bg-white/40 backdrop-blur-md" : "bg-white"
                    )}>
                        <button
                            onClick={() => router.push(backUrl)}
                            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-50 active:scale-90 transition-all duration-200 pointer-events-auto"
                        >
                            <ChevronLeft className="w-5 h-5 text-gray-700" strokeWidth={1.5} />
                        </button>
                    </div>

                    {/* Minimized Title */}
                    <div
                        className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-bold text-gray-900 text-[18px] transition-opacity duration-300 ${scrolled ? 'opacity-100' : 'opacity-0 pointer-events-none'
                            }`}
                    >
                        Learn
                    </div>

                    <div className={clsx(
                        "flex items-center gap-1 p-1 rounded-full shadow-sm border border-black/[0.03] transition-all duration-300",
                        scrolled ? "bg-white/40 backdrop-blur-md" : "bg-white"
                    )}>
                        {isBrowseActive && (
                            <>
                                <button
                                    onClick={() => onChangeView?.(view === 'list' ? 'grouped' : 'list')}
                                    className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-50 active:scale-90 transition-all duration-200 pointer-events-auto relative"
                                >
                                    {view === 'list' ? (
                                        <LayoutList className="w-5 h-5 text-gray-700" strokeWidth={1.5} />
                                    ) : (
                                        <List className="w-5 h-5 text-gray-700" strokeWidth={1.5} />
                                    )}
                                </button>
                                <button
                                    onClick={() => setShowFilters(true)}
                                    className={clsx(
                                        "w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-50 active:scale-90 transition-all duration-200 pointer-events-auto relative",
                                        isFilterActive ? "text-blue-600 bg-blue-50/50" : "text-gray-700"
                                    )}
                                >
                                    <ListFilter className="w-5 h-5" strokeWidth={1.5} />
                                </button>
                            </>
                        )}
                        {canManage && (
                            <button
                                onClick={() => setShowAddKnowledge(true)}
                                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-50 active:scale-90 transition-all duration-200 pointer-events-auto"
                            >
                                <Plus className="w-5 h-5 text-gray-700" strokeWidth={1.5} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Filter Bottom Sheet / Modal */}
            {showFilters && (
                <div className="fixed inset-0 z-[100] flex items-end justify-center">
                    <div
                        className="absolute inset-0 bg-black/5 backdrop-blur-[2px] transition-opacity"
                        onClick={() => setShowFilters(false)}
                    />
                    <div className="relative w-full mx-2 mb-2 bg-white/70 backdrop-blur-2xl backdrop-saturate-[1.8] rounded-[56px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-500 border border-white/40 p-8 flex flex-col gap-8 max-h-[85dvh]">
                        {/* Header */}
                        <div className="flex items-center justify-between px-2">
                            <h3 className="text-[22px] font-bold text-neutral-900 tracking-tight">Filters</h3>
                            <div className="flex items-center gap-3">
                                {isFilterActive && (
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

                        <div className="flex flex-col gap-8 overflow-y-auto pb-4 pr-1 scrollbar-hide">
                            {/* Department */}
                            <div className="space-y-4">
                                <h4 className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.2em] px-2">Department</h4>
                                <div className="flex flex-wrap gap-2.5">
                                    {DEPARTMENT_OPTIONS.map((opt: any) => {
                                        const isSelected = selectedDepartment.includes(opt.value);
                                        return (
                                            <button
                                                key={opt.value}
                                                onClick={() => onDepartmentChange?.(opt.value)}
                                                className={clsx(
                                                    "px-4 py-2 rounded-full text-[13px] transition-all border",
                                                    isSelected
                                                        ? "bg-[#001F3F]/60 backdrop-blur-md text-white border-[#001F3F]/50 shadow-lg shadow-[#001F3F]/10 ring-1 ring-white/10 font-medium"
                                                        : "bg-white/40 backdrop-blur-md text-neutral-600 border-black/[0.04] hover:bg-neutral-100"
                                                )}
                                            >
                                                {opt.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Type */}
                            <div className="space-y-4">
                                <h4 className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.2em] px-2">Knowledge Type</h4>
                                <div className="flex flex-wrap gap-2.5">
                                    {typeOptions.map((opt: any) => {
                                        const isSelected = selectedType.includes(opt.value);
                                        return (
                                            <button
                                                key={opt.value}
                                                onClick={() => onTypeChange?.(opt.value)}
                                                className={clsx(
                                                    "px-4 py-2 rounded-full text-[13px] transition-all border",
                                                    isSelected
                                                        ? "bg-[#001F3F]/60 backdrop-blur-md text-white border-[#001F3F]/50 shadow-lg shadow-[#001F3F]/10 ring-1 ring-white/10 font-medium"
                                                        : "bg-white/40 backdrop-blur-md text-neutral-600 border-black/[0.04] hover:bg-neutral-100"
                                                )}
                                            >
                                                {opt.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Sort By */}
                            <div className="space-y-4">
                                <h4 className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.2em] px-2">Sort By</h4>
                                <div className="px-1">
                                    <div className="flex items-center justify-between w-full">
                                        {/* Left Side: Main Sort Categories */}
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => onSortChange?.((selectedSort || 'date-desc').startsWith('name') ? selectedSort! : 'name-asc')}
                                                className={clsx(
                                                    "px-5 py-2.5 rounded-full text-[13px] transition-all border shrink-0",
                                                    (selectedSort || 'date-desc').startsWith('name')
                                                        ? "bg-[#001F3F]/60 backdrop-blur-md text-white border-[#001F3F]/50 shadow-md shadow-[#001F3F]/10 font-medium"
                                                        : "bg-white/40 backdrop-blur-md text-neutral-600 border-black/[0.04]"
                                                )}
                                            >
                                                Name
                                            </button>
                                            <button
                                                onClick={() => onSortChange?.((selectedSort || 'date-desc').startsWith('date') ? selectedSort! : 'date-desc')}
                                                className={clsx(
                                                    "px-5 py-2.5 rounded-full text-[13px] transition-all border shrink-0",
                                                    (selectedSort || 'date-desc').startsWith('date')
                                                        ? "bg-[#001F3F]/60 backdrop-blur-md text-white border-[#001F3F]/50 shadow-md shadow-[#001F3F]/10 font-medium"
                                                        : "bg-white/40 backdrop-blur-md text-neutral-600 border-black/[0.04]"
                                                )}
                                            >
                                                Date
                                            </button>
                                        </div>

                                        {/* Right Side: Sub Categories based on selection */}
                                        <div className="flex items-center shrink-0">
                                            {(selectedSort || 'date-desc').startsWith('name') && (
                                                <div className="flex items-center gap-1.5 p-1 bg-black/[0.02] rounded-full border border-black/[0.04]">
                                                    <button
                                                        onClick={() => onSortChange?.('name-asc')}
                                                        className={clsx(
                                                            "px-4 py-1.5 rounded-full text-[12px] font-medium transition-all",
                                                            selectedSort === 'name-asc' ? "bg-white text-[#001F3F]/80 shadow-sm border border-black/5" : "text-neutral-500 hover:text-neutral-700"
                                                        )}
                                                    >
                                                        A-Z
                                                    </button>
                                                    <button
                                                        onClick={() => onSortChange?.('name-desc')}
                                                        className={clsx(
                                                            "px-4 py-1.5 rounded-full text-[12px] font-medium transition-all",
                                                            selectedSort === 'name-desc' ? "bg-white text-[#001F3F]/80 shadow-sm border border-black/5" : "text-neutral-500 hover:text-neutral-700"
                                                        )}
                                                    >
                                                        Z-A
                                                    </button>
                                                </div>
                                            )}

                                            {(selectedSort || 'date-desc').startsWith('date') && (
                                                <div className="flex items-center gap-1.5 p-1 bg-black/[0.02] rounded-full border border-black/[0.04]">
                                                    <button
                                                        onClick={() => onSortChange?.('date-desc')}
                                                        className={clsx(
                                                            "px-4 py-1.5 rounded-full text-[12px] font-medium transition-all",
                                                            selectedSort === 'date-desc' ? "bg-white text-[#001F3F]/80 shadow-sm border border-black/5" : "text-neutral-500 hover:text-neutral-700"
                                                        )}
                                                    >
                                                        Newest
                                                    </button>
                                                    <button
                                                        onClick={() => onSortChange?.('date-asc')}
                                                        className={clsx(
                                                            "px-4 py-1.5 rounded-full text-[12px] font-medium transition-all",
                                                            selectedSort === 'date-asc' ? "bg-white text-[#001F3F]/80 shadow-sm border border-black/5" : "text-neutral-500 hover:text-neutral-700"
                                                        )}
                                                    >
                                                        Oldest
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>

                        {/* Footer Action */}
                        <div className="pt-2">
                            <button
                                onClick={() => setShowFilters(false)}
                                className="w-full bg-[#001F3F] backdrop-blur-xl backdrop-saturate-[1.5] text-white py-4 rounded-full font-bold text-[17px] active:scale-[0.98] transition-all shadow-xl shadow-[#001F3F]/30 mb-1 border border-white/20 ring-1 ring-inset ring-white/10"
                            >
                                Apply Filters
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Knowledge Drawer */}
            <KnowledgeDrawer
                isOpen={showAddKnowledge}
                onClose={() => setShowAddKnowledge(false)}
                onSuccess={(data) => {
                    if (onAddKnowledgeSuccess) onAddKnowledgeSuccess(data);
                    setShowAddKnowledge(false);
                }}
            />

            {/* Large Scrollable Title Area */}
            <div className="lg:hidden pt-20 pb-2">
                <div className="px-5 pb-1">
                    <h1 className="text-[32px] font-bold text-gray-900 tracking-tight">Learn</h1>
                </div>
            </div>

            {/* Scrollable Tabs - Becomes Fixed on Scroll */}
            <div className={`lg:hidden z-30 transition-all duration-300 ${scrolled
                ? "fixed top-[80px] left-5 right-5 bg-white/70 backdrop-blur-2xl backdrop-saturate-[1.8] border border-black/[0.04] p-[2px] rounded-[24px] shadow-[0_8px_32px_-12px_rgba(0,0,0,0.1)]"
                : "relative bg-transparent pb-4 mt-2"
                }`}>
                <div className={`flex items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${scrolled ? 'px-0' : 'px-5'}`}>
                    {LEARN_TABS.map((tab) => {
                        const active = isActive(tab.href);
                        return (
                            <Link
                                key={tab.id}
                                href={tab.href}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all flex-shrink-0 ${active
                                    ? "bg-white text-neutral-900 shadow-sm border border-black/[0.04] font-bold"
                                    : "bg-transparent text-neutral-500 font-medium hover:bg-neutral-100"
                                    }`}
                            >
                                <tab.icon className={`w-[16px] h-[16px] ${active ? 'text-neutral-900' : 'text-neutral-500 opacity-60'}`} strokeWidth={active ? 2 : 1.5} />
                                <span className="text-[14px]">{tab.label}</span>
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* Spacer to prevent content jump when tabs become fixed */}
            {scrolled && <div className="lg:hidden h-[56px]" />}
        </>
    );
}
