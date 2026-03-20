"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import clsx from "clsx";
import { usePathname, useRouter } from "next/navigation";
import {
    ChevronLeft,
    Menu,
    Plus,
    Users,
    PieChart,
    ShoppingCart,
    FileText,
    Wallet,
    Landmark,
    FileBarChart,
    User,
    TrendingUp,
    ListFilter,
    Download,
} from "lucide-react";
import { useFinance } from "./FinanceContext";

const FINANCE_TABS = [
    { id: "overview", label: "Overview", href: "/flow/finance", icon: PieChart },
    { id: "purchasing", label: "Purchasing", href: "/flow/finance/purchasing", icon: ShoppingCart },
    { id: "reimburse", label: "Reimburse", href: "/flow/finance/reimburse", icon: FileText },
    { id: "petty-cash", label: "Petty Cash", href: "/flow/finance/petty-cash", icon: Wallet },
    { id: "funding", label: "Funding", href: "/flow/finance/funding-sources", icon: Landmark },
    { id: "reports", label: "Reports", href: "/flow/finance/reports", icon: FileBarChart },
];

export default function FinanceMobileHeader({
    fabId = "FINANCE_NEW_REQUEST",
    backUrl = "/dashboard",
    rightToolbar
}: {
    fabId?: string;
    backUrl?: string;
    rightToolbar?: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const { viewMode, setViewMode, canAccessTeam } = useFinance();
    const [scrolled, setScrolled] = useState(false);
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Auto-scroll active tab into view
    useEffect(() => {
        const activeTab = scrollContainerRef.current?.querySelector('[data-active="true"]');
        if (activeTab) {
            activeTab.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'center'
            });
        }
    }, [pathname]);

    const isActive = (href: string) => {
        if (href === "/flow/finance") {
            return pathname === "/flow/finance";
        }
        return pathname.startsWith(href);
    };

    return (
        <>
            {/* Fixed Floating Top Bar */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-40 pt-6 pointer-events-none">
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
                        "p-1 rounded-full shadow-sm border border-black/[0.03] dark:border-white/[0.05] transition-all duration-300",
                        scrolled ? "bg-white/10 dark:bg-neutral-800/10 backdrop-blur-xl border border-white/20 dark:border-neutral-700/20" : "bg-white dark:bg-neutral-900"
                    )}>
                        <button
                            onClick={() => router.push(backUrl)}
                            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-50 dark:hover:bg-neutral-800 active:scale-90 transition-all duration-200 pointer-events-auto"
                        >
                            <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-white" strokeWidth={1.5} />
                        </button>
                    </div>

                    {/* Minimized Title - Fades in when scrolled */}
                    <div
                        className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-bold text-gray-900 dark:text-white transition-opacity duration-300 ${scrolled ? 'opacity-100' : 'opacity-0 pointer-events-none'
                            }`}
                    >
                        Finance
                    </div>

                    <div className={clsx(
                        "flex items-center gap-1 p-1 rounded-full shadow-sm border border-black/[0.03] dark:border-white/[0.05] transition-all duration-300",
                        scrolled ? "bg-white/10 dark:bg-neutral-800/10 backdrop-blur-xl border border-white/20 dark:border-neutral-700/20" : "bg-white dark:bg-neutral-900"
                    )}>
                        {rightToolbar !== undefined ? rightToolbar : (
                            <>
                                {canAccessTeam && pathname !== '/flow/finance/funding-sources' && (
                                    <button
                                        onClick={() => {
                                            const newMode = viewMode === 'team' ? 'personal' : 'team';
                                            setViewMode(newMode);
                                            window.dispatchEvent(new CustomEvent('finance:set-view-mode', { detail: newMode }));
                                        }}
                                        className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-50 dark:hover:bg-neutral-800 active:scale-90 transition-all duration-200 pointer-events-auto relative"
                                    >
                                        {viewMode === 'team' ? (
                                            <Users className="w-5 h-5 text-gray-700 dark:text-white" strokeWidth={1.5} />
                                        ) : (
                                            <User className="w-5 h-5 text-gray-700 dark:text-white" strokeWidth={1.5} />
                                        )}
                                    </button>
                                )}
                                {pathname !== '/flow/finance' && pathname !== '/flow/finance/' && (
                                    <>
                                        <button
                                            onClick={() => window.dispatchEvent(new CustomEvent('toggle-filters'))}
                                            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-50 dark:hover:bg-neutral-800 active:scale-90 transition-all duration-200 pointer-events-auto relative"
                                        >
                                            <ListFilter className="w-5 h-5 text-gray-700 dark:text-white" strokeWidth={1.5} />
                                        </button>
                                        <button
                                            onClick={() => window.dispatchEvent(new CustomEvent('export-finance'))}
                                            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-50 dark:hover:bg-neutral-800 active:scale-90 transition-all duration-200 pointer-events-auto relative text-neutral-600 dark:text-neutral-300"
                                            title="Export"
                                        >
                                            <Download className="w-5 h-5 text-gray-700 dark:text-white" strokeWidth={1.5} />
                                        </button>
                                    </>
                                )}
                                <button
                                    onClick={() => window.dispatchEvent(new CustomEvent('fab-action', { detail: { id: fabId } }))}
                                    className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-50 dark:hover:bg-neutral-800 active:scale-90 transition-all duration-200 pointer-events-auto relative"
                                >
                                    <Plus className="w-5 h-5 text-gray-700 dark:text-white" strokeWidth={1.5} />
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Large Scrollable Title Area */}
            <div className="lg:hidden pt-20 pb-2">
                <div className="px-5 pb-1">
                    <h1 className="text-[32px] font-bold text-gray-900 dark:text-white tracking-tight">Finance</h1>
                </div>
            </div>

            {/* Scrollable Tabs - Becomes Fixed on Scroll */}
            <div className={`lg:hidden z-30 transition-all duration-300 ${scrolled
                ? "fixed top-[80px] left-5 right-5 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-2xl backdrop-saturate-[1.8] border border-black/[0.04] dark:border-white/[0.05] p-[2px] rounded-[24px] shadow-[0_8px_32px_-12px_rgba(0,0,0,0.1)] dark:shadow-none"
                : "relative bg-transparent pb-4 mt-2"
                }`}>
                <div
                    ref={scrollContainerRef}
                    className={`flex items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${scrolled ? 'px-0' : 'px-5'}`}
                >
                    {FINANCE_TABS.map((tab) => {
                        const active = isActive(tab.href);
                        const Icon = tab.icon;
                        return (
                            <Link
                                key={tab.id}
                                href={tab.href}
                                data-active={active}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all flex-shrink-0 ${active
                                    ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm border border-black/[0.04] dark:border-white/[0.05] font-bold"
                                    : "bg-transparent text-neutral-500 dark:text-neutral-400 font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                    }`}
                            >
                                <Icon
                                    className={`w-[16px] h-[16px] ${active ? 'text-neutral-900 dark:text-white' : 'text-neutral-500 dark:text-neutral-400 opacity-60'}`}
                                    strokeWidth={active ? 2 : 1.5}
                                />
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
