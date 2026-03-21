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
import { useUserContext } from "@/components/providers/UserProvider";

const LEARN_TABS = [
    { id: "all", label: "All", href: "/frame/learn", icon: LayoutGrid },
    { id: "documentation", label: "Docs", href: "/frame/learn?category=documentation", icon: FileText },
    { id: "templates", label: "Templates", href: "/frame/learn?category=templates", icon: Layout },
    { id: "references", label: "References", href: "/frame/learn?category=references", icon: BookOpen },
    { id: "favorite", label: "Favorites", href: "/frame/learn?view=favorite", icon: Star },
];

interface LearnMobileHeaderProps {
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
    // New props to connect with wrapper
    onOpenFilters?: () => void;
    onOpenAddKnowledge?: () => void;
    isFilterActive?: boolean;
}

export default function LearnMobileHeader({
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
    onAddKnowledgeSuccess,
    onOpenFilters,
    onOpenAddKnowledge,
    isFilterActive = false
}: LearnMobileHeaderProps) {
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [scrolled, setScrolled] = useState(false);
    const { profile } = useUserContext();

    const canManage = !!(profile?.role && ["superadmin", "admin", "administrator", "supervisor", "hr", "pm", "management", "owner"].includes(profile.role.toLowerCase()));

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        const handleOpenAdd = () => onOpenAddKnowledge?.();

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


    return (
        <>
            {/* Fixed Floating Top Bar */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-50 pt-6 pointer-events-none">
                {/* Background Mask - Fixed on viewport, covers status bar + header buttons only */}
                <div className={clsx(
                    "fixed top-0 left-0 right-0 bg-white/80 dark:bg-neutral-900/80 transition-all duration-500 pointer-events-none",
                    scrolled ? "opacity-100" : "opacity-0"
                )} style={{
                    height: '100px',
                    zIndex: 0,
                    backdropFilter: scrolled ? 'blur(24px) saturate(1.8)' : 'none',
                    WebkitBackdropFilter: scrolled ? 'blur(24px) saturate(1.8)' : 'none',
                    maskImage: 'linear-gradient(to bottom, black 0%, black 20%, transparent 100%)',
                    WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 20%, transparent 100%)',
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
                                    onClick={() => onOpenFilters?.()}
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
                                onClick={() => onOpenAddKnowledge?.()}
                                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-50 active:scale-90 transition-all duration-200 pointer-events-auto"
                            >
                                <Plus className="w-5 h-5 text-gray-700" strokeWidth={1.5} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Filters and Drawer are now handled by LearnPageWrapper for consistency */}

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
