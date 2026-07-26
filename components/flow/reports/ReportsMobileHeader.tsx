"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import clsx from "clsx";
import {
    ChevronLeft,
    LayoutGrid,
    Calendar,
    CalendarCheck,
    FileText
} from "lucide-react";
import Link from "next/link";

const REPORTS_TABS = [
    { id: "overview", label: "Overview", href: "/flow/reports/overview", icon: LayoutGrid },
    { id: "daily", label: "Daily", href: "/flow/reports/daily", icon: Calendar },
    { id: "weekly", label: "Weekly", href: "/flow/reports/weekly", icon: FileText },
    { id: "monthly", label: "Monthly", href: "/flow/reports/monthly", icon: CalendarCheck },
];

export default function ReportsMobileHeader({
    backUrl = "/dashboard",
    rightToolbar
}: {
    backUrl?: string;
    rightToolbar?: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
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
        if (href === "/flow/reports/overview") {
            return pathname === "/flow/reports/overview" || pathname === "/flow/reports";
        }
        return pathname.startsWith(href);
    };

    return (
        <>
            {/* Fixed Floating Top Bar */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-40 pt-6 pointer-events-none">
                {/* Background Mask */}
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
                        scrolled ? "bg-white/40 dark:bg-neutral-800/40 backdrop-blur-md" : "bg-white dark:bg-neutral-900"
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
                        Reports
                    </div>

                    {rightToolbar || <div className="w-12 h-12" />}
                </div>
            </div>

            {/* Standard Header Space for Mobile */}
            <div className="lg:hidden pt-24 px-5">
                <div className={clsx("transition-all duration-500", scrolled ? "opacity-0 scale-95 h-0 overflow-hidden" : "opacity-100 scale-100")}>
                    <span className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-[0.2em]">Work Execution</span>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight mt-0.5">Reports</h1>
                </div>

                {/* Sub Tab Navigation */}
                <div 
                    ref={scrollContainerRef}
                    className="flex items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] py-4 mt-2"
                >
                    {REPORTS_TABS.map((tab) => {
                        const active = isActive(tab.href);
                        const Icon = tab.icon;

                        return (
                            <Link
                                key={tab.id}
                                href={tab.href}
                                data-active={active}
                                className={clsx(
                                    "flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-300 border shadow-sm",
                                    active
                                        ? "bg-blue-500 border-blue-500 text-white shadow-blue-500/10"
                                        : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-gray-600 dark:text-neutral-400 hover:bg-gray-50 dark:hover:bg-neutral-800"
                                )}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                <span>{tab.label}</span>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </>
    );
}
