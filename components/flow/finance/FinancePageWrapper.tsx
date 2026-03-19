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
    const isActive = (href: string) => {
        if (href === "/flow/finance") return pathname === "/flow/finance";
        return pathname.startsWith(href);
    };

    return (
        <div className="flex items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {FINANCE_TABS.map((tab) => {
                const active = isActive(tab.href);
                const Icon = tab.icon;
                return (
                    <Link
                        key={tab.href}
                        href={tab.href}
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

    // MODERN HEADER (Revamped) - Only for Desktop/iPad
    const customHeader = useMemo(() => ({
        hideGlobalActions: true,
        right: (
            <div className="flex items-center gap-2">
                 {/* 1. View Toggle Slider */}
                 {canAccessTeam && <FinanceViewToggleUI viewMode={viewMode as 'personal' | 'team'} setViewMode={(v) => window.dispatchEvent(new CustomEvent('finance:set-view-mode', { detail: v }))} canAccessTeam={canAccessTeam} />}

                {/* 2. Expandable Search + Filter Bubble (Hidden on Overview) */}
                {!isOverview && (
                    <div className="h-10 flex items-center bg-white/40 dark:bg-neutral-800/40 backdrop-blur-md border border-white/40 dark:border-neutral-700/30 rounded-full shadow-sm px-1.5 gap-1.5 min-w-[40px] overflow-hidden">
                        <motion.div
                            initial={false}
                            animate={{ width: (isSearchExpanded || searchTerm) ? "auto" : 32 }}
                            className="flex items-center h-7 rounded-full transition-all duration-300"
                        >
                            <div className={clsx(
                                "flex items-center h-7 rounded-full transition-all duration-300 gap-1.5",
                                (isSearchExpanded || searchTerm) ? "pl-2.5 pr-1.5 bg-white/40 dark:bg-neutral-700/40" : "w-8 justify-center hover:bg-white/40 dark:hover:bg-neutral-700/40 cursor-pointer"
                            )}
                                onClick={() => !isSearchExpanded && setIsSearchExpanded(true)}
                            >
                                <Search size={15} className={clsx("transition-colors", (isSearchExpanded || searchTerm) ? "text-neutral-400" : "text-neutral-600 dark:text-neutral-300")} />

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
                                                type="text"
                                                placeholder="Search..."
                                                value={searchTerm}
                                                onChange={(e) => window.dispatchEvent(new CustomEvent("finance:set-search-term", { detail: e.target.value }))}
                                                onBlur={() => !searchTerm && setIsSearchExpanded(false)}
                                                className="bg-transparent border-none outline-none text-[13px] font-medium text-neutral-700 dark:text-white placeholder:text-neutral-400/80 w-[70px] md:w-[100px]"
                                            />
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    window.dispatchEvent(new CustomEvent("finance:set-search-term", { detail: "" }));
                                                    setIsSearchExpanded(false);
                                                }}
                                                className="p-0.5 hover:bg-white/60 dark:hover:bg-neutral-600/50 rounded-full transition-colors shrink-0"
                                            >
                                                <X size={13} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-white" />
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.div>

                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            whileHover={{ scale: 1.05 }}
                            onClick={() => window.dispatchEvent(new CustomEvent('toggle-filters'))}
                            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/40 dark:hover:bg-neutral-700/40 transition-colors shrink-0"
                        >
                            <ListFilter size={17} className="text-neutral-600 dark:text-neutral-300" strokeWidth={1.5} />
                        </motion.button>
                    </div>
                )}

                {/* 3. Export Bubble (Hidden on Overview) */}
                {!isOverview && (
                    <div className="h-10 w-10 bg-white/40 dark:bg-neutral-800/40 backdrop-blur-md border border-white/40 dark:border-neutral-700/30 rounded-full shadow-sm flex items-center justify-center">
                         <motion.button
                            whileTap={{ scale: 0.9 }}
                            whileHover={{ scale: 1.05 }}
                            onClick={() => window.dispatchEvent(new CustomEvent('export-finance'))}
                            className="w-full h-full flex items-center justify-center text-neutral-600 dark:text-neutral-300 transition-colors duration-200"
                            title="Export"
                        >
                            <Download size={19} strokeWidth={1.5} />
                        </motion.button>
                    </div>
                )}

                {/* 4. Glassy Blue Plus Bubble */}
                <div className="h-10 w-10 flex items-center justify-center rounded-full border border-blue-400/40 bg-blue-600/85 dark:bg-blue-500/90 backdrop-blur-[20px]">
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        whileHover={{ scale: 1.05 }}
                        onClick={() => window.dispatchEvent(new CustomEvent('fab-action', { detail: { id: fabId } }))}
                        className="w-full h-full flex items-center justify-center rounded-full text-blue-50 dark:text-blue-50 transition-all duration-200"
                        title="New Request"
                    >
                        <Plus size={22} strokeWidth={2.5} />
                    </motion.button>
                </div>
            </div>
        )
    }), [viewMode, canAccessTeam, fabId, pathname, isSearchExpanded, searchTerm, isOverview]);

    // Apply header injection ONLY on Desktop/iPad
    useHeader(isMounted ? customHeader : undefined, [isMounted, viewMode, canAccessTeam, isSearchExpanded, searchTerm, pathname]);

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
