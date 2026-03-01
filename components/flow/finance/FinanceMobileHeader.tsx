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
    backUrl = "/dashboard"
}: {
    fabId?: string;
    backUrl?: string
}) {
    const pathname = usePathname();
    const router = useRouter();
    const { viewMode, setViewMode, canAccessTeam } = useFinance();
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const isActive = (href: string) => {
        if (href === "/flow/finance") {
            return pathname === "/flow/finance";
        }
        return pathname.startsWith(href);
    };

    return (
        <>
            {/* Fixed Floating Top Bar */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-40 pt-12 pointer-events-none">
                {/* Background Mask - Linear Blur effect (Top to Bottom) */}
                <div className={clsx(
                    "absolute inset-0 bg-white/60 transition-all duration-500 pointer-events-none",
                    scrolled ? "opacity-100" : "opacity-0"
                )} style={{
                    maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
                    WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
                    backdropFilter: scrolled ? 'blur(16px)' : 'none',
                    height: '80px' // Keep it compact so it doesn't hit the tabs
                }} />

                <div className="flex items-center justify-between px-5 pointer-events-auto relative z-10 pb-2">
                    <button
                        onClick={() => router.push(backUrl)}
                        className="w-10 h-10 bg-white/40 backdrop-blur-2xl backdrop-saturate-[1.8] rounded-full flex items-center justify-center shadow-sm border border-neutral-200/60 active:scale-95 transition-transform"
                    >
                        <ChevronLeft className="w-5 h-5 text-neutral-700" strokeWidth={2.5} />
                    </button>

                    {/* Minimized Title - Fades in when scrolled */}
                    <div
                        className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-bold text-neutral-900 transition-opacity duration-300 ${scrolled ? 'opacity-100' : 'opacity-0 pointer-events-none'
                            }`}
                    >
                        Finance
                    </div>

                    <div className="flex items-center p-1 bg-white/40 backdrop-blur-2xl backdrop-saturate-[1.8] rounded-full shadow-sm border border-neutral-200/60 gap-0.5">
                        {canAccessTeam && (
                            <button
                                onClick={() => setViewMode(viewMode === 'team' ? 'personal' : 'team')}
                                className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-neutral-50 active:bg-neutral-100 transition-colors pointer-events-auto"
                            >
                                {viewMode === 'team' ? (
                                    <Users className="w-[18px] h-[18px] text-neutral-700" strokeWidth={2.5} />
                                ) : (
                                    <User className="w-[18px] h-[18px] text-neutral-700" strokeWidth={2.5} />
                                )}
                            </button>
                        )}
                        <button className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-neutral-50 active:bg-neutral-100 transition-colors pointer-events-auto">
                            <Menu className="w-[18px] h-[18px] text-neutral-700" strokeWidth={2.5} />
                        </button>
                        <button
                            onClick={() => window.dispatchEvent(new CustomEvent('fab-action', { detail: { id: fabId } }))}
                            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-neutral-50 active:bg-neutral-100 transition-colors pointer-events-auto"
                        >
                            <Plus className="w-[18px] h-[18px] text-neutral-700" strokeWidth={2.5} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Large Scrollable Title Area */}
            <div className="lg:hidden pt-28 pb-2">
                <div className="px-5 pb-1">
                    <h1 className="text-[34px] font-bold text-neutral-900 tracking-tight">Finance</h1>
                </div>
            </div>

            {/* Scrollable Tabs - Becomes Fixed on Scroll */}
            <div className={`lg:hidden z-30 transition-all duration-300 ${scrolled
                ? "fixed top-[96px] left-5 right-5 bg-white/70 backdrop-blur-2xl backdrop-saturate-[1.8] border border-black/[0.04] p-[2px] rounded-[24px] shadow-[0_8px_32px_-12px_rgba(0,0,0,0.1)]"
                : "relative bg-transparent pb-4 mt-2"
                }`}>
                <div className={`flex items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${scrolled ? 'px-0' : 'px-5'}`}>
                    {FINANCE_TABS.map((tab) => {
                        const active = isActive(tab.href);
                        const Icon = tab.icon;
                        return (
                            <Link
                                key={tab.id}
                                href={tab.href}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-full whitespace-nowrap transition-all flex-shrink-0 ${active
                                    ? "bg-white text-neutral-900 shadow-sm border border-black/[0.04] font-bold"
                                    : "bg-transparent text-neutral-500 font-medium hover:bg-neutral-100"
                                    }`}
                            >
                                <Icon
                                    size={16}
                                    strokeWidth={active ? 2.5 : 2}
                                    className={active ? "text-neutral-900" : "opacity-70"}
                                />
                                <span className="text-[14px]">{tab.label}</span>
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* Spacer to prevent content jump when tabs become fixed */}
            {scrolled && <div className="lg:hidden h-[68px]" />}
        </>
    );
}
