"use client";
import React, { useState, useMemo, useEffect, useRef } from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import FinanceSidebar from "@/components/flow/finance/FinanceSidebar";
import FinanceMobileHeader from "@/components/flow/finance/FinanceMobileHeader";
import { usePathname } from "next/navigation";
import { useFinance } from "@/components/flow/finance/FinanceContext";
import { useHeader } from "@/components/providers/HeaderProvider";
import { Users, User, Plus, ListFilter, Search, X, Download } from "lucide-react";
import { FINANCE_TABS, getFinanceFabId } from "./modules/constants";
import { motion, AnimatePresence } from "framer-motion";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { FinanceViewToggleUI } from "@/components/flow/finance/FinanceViewToggle";
import clsx from "clsx";
import Link from "next/link";

function FinanceInlineTabs() {
    const pathname = usePathname();
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const activeTabRef = useRef<HTMLAnchorElement>(null);

    const isActive = (href: string) => {
        if (href === "/flow/finance") return pathname === "/flow/finance";
        return pathname.startsWith(href);
    };

    useEffect(() => {
        const scrollActiveTab = () => {
            if (activeTabRef.current && scrollContainerRef.current) {
                activeTabRef.current.scrollIntoView({ 
                    behavior: "smooth", 
                    inline: "center", 
                    block: "nearest" 
                });
            }
        };

        // Small timeout to ensure DOM is updated and layout is stable
        const timer = setTimeout(scrollActiveTab, 100);
        return () => clearTimeout(timer);
    }, [pathname]);

    return (
        <div 
            ref={scrollContainerRef}
            className="flex items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] scroll-smooth"
        >
            {FINANCE_TABS.map((tab) => {
                const active = isActive(tab.href);
                const Icon = tab.icon;
                return (
                    <Link
                        key={tab.href}
                        href={tab.href}
                        ref={active ? activeTabRef : null}
                        className={clsx(
                            "flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all flex-shrink-0 text-[14px]",
                            active
                                ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm border border-black/[0.04] dark:border-white/[0.05] font-bold"
                                : "bg-transparent text-neutral-500 dark:text-neutral-400 font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        )}
                    >
                        <Icon className={clsx("w-4 h-4", active ? "text-neutral-900 dark:text-white" : "text-neutral-500 dark:text-neutral-400 opacity-60")} strokeWidth={active ? 2 : 1.5} />
                        <span>{tab.label}</span>
                    </Link>
                );
            })}
        </div>
    );
}

export default function FinancePageWrapper({
    breadcrumbItems,
    header,
    children,
    rightToolbar,
}: {
    breadcrumbItems?: { label: string; href?: string }[];
    header?: React.ReactNode;
    children: React.ReactNode;
    rightToolbar?: React.ReactNode;
}) {
    const pathname = usePathname();
    const { viewMode, setViewMode, canAccessTeam, searchTerm, setSearchTerm } = useFinance();
    const [isMounted, setIsMounted] = useState(false);
    
    // Ensure we don't render mismatched headers between server and client
    useEffect(() => {
        setIsMounted(true);
    }, []);

    const fabId = getFinanceFabId(pathname);
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isSearchExpanded && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isSearchExpanded]);

    const isOverview = pathname.endsWith('/finance') || pathname.endsWith('/finance/');
    const isReports = pathname.includes('/reports');

    // MODERN HEADER (Revamped) - Only for Desktop/iPad
    const customHeader = useMemo(() => ({
        hideGlobalActions: true,
        right: (
            <div className="flex items-center gap-2">
                 {/* 1. View Toggle Slider */}
                 {canAccessTeam && !pathname.includes('/funding-sources') && !pathname.includes('/reports') && <FinanceViewToggleUI viewMode={viewMode as 'personal' | 'team'} setViewMode={(v) => window.dispatchEvent(new CustomEvent('finance:set-view-mode', { detail: v }))} canAccessTeam={canAccessTeam} />}

                {/* 2. Expandable Search + Filter Bubble (Hidden on Overview and Reports) */}
                {!isOverview && !isReports && (
                    <div className="h-9 flex items-center bg-white/10 dark:bg-neutral-800/10 backdrop-blur-xl border border-white/20 dark:border-neutral-700/20 rounded-full shadow-sm px-2 gap-2 pointer-events-auto">
                        <motion.div
                            initial={false}
                            animate={{ width: (isSearchExpanded || searchTerm) ? "auto" : 64 }}
                            className="flex items-center h-7 rounded-full transition-all duration-300 gap-2"
                        >
                            <div className={clsx(
                                "flex items-center h-7 rounded-full transition-all duration-300 gap-2",
                                (isSearchExpanded || searchTerm) ? "pl-2.5 pr-1.5 bg-white/40 dark:bg-neutral-700/40" : "w-7 justify-center hover:bg-white/40 dark:hover:bg-neutral-700/40 cursor-pointer"
                            )}
                                onClick={() => !isSearchExpanded && setIsSearchExpanded(true)}
                            >
                                <Search size={18} strokeWidth={1.5} className={clsx("transition-colors shrink-0", (isSearchExpanded || searchTerm) ? "text-neutral-400" : "text-neutral-600 dark:text-neutral-300")} />

                                <AnimatePresence>
                                    {(isSearchExpanded || searchTerm) && (
                                        <motion.div
                                            initial={{ width: 0, opacity: 0 }}
                                            animate={{ width: "auto", opacity: 1 }}
                                            exit={{ width: 0, opacity: 0 }}
                                            className="flex items-center gap-1.5 overflow-hidden"
                                        >
                                            <input
                                                ref={searchInputRef}
                                                autoFocus
                                                type="text"
                                                placeholder="Search..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Escape') setIsSearchExpanded(false);
                                                }}
                                                className="bg-transparent border-none outline-none text-[12px] font-medium text-neutral-800 dark:text-white placeholder:text-neutral-500 w-full"
                                            />
                                            <button
                                                onClick={() => {
                                                    setSearchTerm("");
                                                    setIsSearchExpanded(false);
                                                }}
                                                className="p-0.5 hover:bg-white/60 dark:hover:bg-neutral-600/50 rounded-full transition-colors shrink-0"
                                            >
                                                <X size={14} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-white" />
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                            
                            {!isSearchExpanded && (
                                <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    whileHover={{ scale: 1.05 }}
                                    onClick={() => window.dispatchEvent(new CustomEvent('toggle-filters'))}
                                    className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/20 dark:hover:bg-neutral-700/60 transition-colors shrink-0"
                                >
                                    <ListFilter size={18} className="text-neutral-800 dark:text-neutral-200" strokeWidth={1.5} />
                                </motion.button>
                            )}
                        </motion.div>
                    </div>
                )}

                {/* 3. Export Bubble (Hidden on Overview) */}
                {!isOverview && (
                    <div className="h-9 w-9 bg-white/10 dark:bg-neutral-800/10 backdrop-blur-xl border border-white/20 dark:border-neutral-700/20 rounded-full shadow-sm flex items-center justify-center pointer-events-auto">
                         <motion.button
                            whileTap={{ scale: 0.9 }}
                            whileHover={{ scale: 1.05 }}
                            onClick={() => window.dispatchEvent(new CustomEvent('export-finance'))}
                            className="h-7 w-7 flex items-center justify-center rounded-full text-neutral-800 dark:text-neutral-200 transition-colors duration-200 hover:bg-white/10 dark:hover:bg-neutral-800/40"
                            title="Export"
                        >
                            <Download size={18} strokeWidth={1.5} />
                        </motion.button>
                    </div>
                )}

                {/* 4. Glassy Blue Plus Bubble */}
                <div className="h-9 w-9 flex items-center justify-center rounded-full border border-blue-400/40 bg-blue-600 dark:bg-blue-500 shadow-sm pointer-events-auto active:scale-95 transition-all">
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        whileHover={{ scale: 1.05 }}
                        onClick={() => window.dispatchEvent(new CustomEvent('fab-action', { detail: { id: fabId } }))}
                        className="h-7 w-7 flex items-center justify-center rounded-full text-blue-50 hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
                        title="New Request"
                    >
                        <Plus size={18} strokeWidth={2.5} />
                    </motion.button>
                </div>
            </div>
        )
    }), [viewMode, canAccessTeam, fabId, pathname, isSearchExpanded, searchTerm, isOverview, isReports]);

    // Apply header injection ONLY on Desktop/iPad
    useHeader(isMounted ? customHeader : undefined, [isMounted, viewMode, canAccessTeam, isSearchExpanded, searchTerm, pathname, isReports]);

    return (
        <>
            {/* MOBILE LAYOUT - EXACT GITHUB MAIN STRUCTURE */}
            <div className="md:hidden min-h-screen bg-neutral-100 dark:bg-neutral-950 transition-colors">
                <FinanceMobileHeader fabId={fabId} backUrl="/dashboard" rightToolbar={rightToolbar} />
                <div className="pb-32 px-5 space-y-4 mt-2">
                    {header}
                    {children}
                </div>
            </div>

            {/* DESKTOP/IPAD LAYOUT - PARITY WITH RESOURCES STRUCTURE */}
            <div className="hidden md:block bg-transparent p-0 transition-colors">
                <PageWrapper sidebar={<FinanceSidebar />} isTransparent>
                    <div className="space-y-4 w-full animate-in fade-in duration-500">
                        <div className="flex flex-col md:px-0">
                            {header}
                        </div>
                        <div className="hidden md:block lg:hidden md:px-0 pb-2">
                            <FinanceInlineTabs />
                        </div>
                        <div className="md:px-0">
                            {children}
                        </div>
                    </div>
                </PageWrapper>
            </div>
        </>
    );
}
