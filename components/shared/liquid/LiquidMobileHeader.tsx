"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import clsx from "clsx";

export interface LiquidTab {
    id: string;
    label: string;
    href: string;
    icon?: any; // Lucide icon
}

interface LiquidMobileHeaderProps {
    title: string;
    backUrl?: string; // Default to "/"
    actions?: React.ReactNode;
    tabs?: LiquidTab[];
    activeTabHref?: string; // Optional manual override for active tab
}

export function LiquidMobileHeader({
    title,
    backUrl = "/dashboard",
    actions,
    tabs = [],
    activeTabHref,
}: LiquidMobileHeaderProps) {
    const pathname = usePathname();
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            const isScrolled = window.scrollY > 10;
            if (isScrolled !== scrolled) {
                setScrolled(isScrolled);
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [scrolled]);

    const isActive = (href: string) => {
        if (activeTabHref) {
            return href === activeTabHref;
        }
        // Basic match logic
        if (href === pathname) return true;
        // Check if pathname starts with href, but need to be careful with short hrefs like "/flow/client" matching "/flow/client/reports"
        // Also avoid "/flow/finance" matching "/flow/financexxx"
        if (pathname.startsWith(href + "/") || pathname.startsWith(href + "?")) {
            return true;
        }
        return false;
    };

    return (
        <>
            {/* Fixed Floating Top Bar */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-50 pt-6 pointer-events-none">
                {/* Background Mask - Linear Blur effect */}
                <div className={clsx(
                    "absolute left-0 right-0 bg-white/80 dark:bg-neutral-900/80 transition-all duration-500 pointer-events-none",
                    scrolled ? "opacity-100" : "opacity-0"
                )} style={{
                    top: '-200px',
                    height: '330px',
                    backdropFilter: scrolled ? 'blur(24px) saturate(1.8)' : 'none',
                    WebkitBackdropFilter: scrolled ? 'blur(24px) saturate(1.8)' : 'none',
                    maskImage: 'linear-gradient(to bottom, black 0%, black 60%, transparent 100%)',
                    WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 60%, transparent 100%)',
                }} />

                <div className="flex items-center justify-between px-5 pointer-events-auto relative z-10 pb-2">
                    <div className={clsx(
                        "p-1 rounded-full shadow-sm border border-black/[0.03] transition-all duration-300",
                        scrolled ? "bg-white/40 backdrop-blur-md" : "bg-white"
                    )}>
                        <Link
                            href={backUrl}
                            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all duration-200 pointer-events-auto"
                        >
                            <ChevronLeft className="w-5 h-5 text-gray-700" strokeWidth={1.5} />
                        </Link>
                    </div>

                    {/* Minimized Title (Only visible when scrolled) */}
                    <div className={clsx(
                        "absolute left-1/2 -translate-x-1/2 transition-all duration-300 pointer-events-auto",
                        scrolled ? "opacity-100 transform-none" : "opacity-0 translate-y-4 pointer-events-none"
                    )}>
                        <h2 className="text-[17px] font-bold text-neutral-900 tracking-tight">{title}</h2>
                    </div>

                    {/* Actions Area */}
                    <div className={clsx(
                        "flex items-center p-1 rounded-[24px] shadow-sm border border-black/[0.03] transition-all duration-300 pointer-events-auto gap-0.5",
                        scrolled ? "bg-white/40 backdrop-blur-md" : "bg-white",
                        !actions ? "opacity-0" : "opacity-100"
                    )}>
                        {actions}
                    </div>
                </div>
            </div>

            {/* Large Title Area - scrolls away */}
            <div className="lg:hidden px-5 pt-20 pb-4 relative z-20">
                <h1 className={clsx(
                    "text-[34px] font-bold text-neutral-900 tracking-tight transition-opacity duration-200",
                    scrolled ? "opacity-0" : "opacity-100"
                )}>
                    {title}
                </h1>
            </div>

            {/* Scrollable Tabs - Becomes Fixed on Scroll */}
            {tabs.length > 0 && (
                <div className={`lg:hidden z-30 transition-all duration-300 ${scrolled
                    ? "fixed top-[80px] left-5 right-5 bg-white/70 backdrop-blur-2xl backdrop-saturate-[1.8] border border-black/[0.04] p-[2px] rounded-[24px] shadow-[0_8px_32px_-12px_rgba(0,0,0,0.1)]"
                    : "relative bg-transparent pb-4 mt-2"
                    }`}>
                    <div className={`flex items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${scrolled ? 'px-0' : 'px-5'}`}>
                        {tabs.map((tab) => {
                            const active = isActive(tab.href);
                            const Icon = tab.icon;
                            return (
                                <Link
                                    key={tab.id}
                                    href={tab.href}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all flex-shrink-0 ${active
                                        ? "bg-white text-neutral-900 shadow-sm border border-black/[0.04] font-bold"
                                        : "bg-transparent text-neutral-500 font-medium hover:bg-neutral-100"
                                        } ${scrolled ? 'py-1.5' : ''}`}
                                >
                                    {Icon && <Icon
                                        size={16}
                                        strokeWidth={active ? 2.5 : 2}
                                        className={active ? "text-neutral-900" : "opacity-70"}
                                    />}
                                    <span className="text-[14px]">{tab.label}</span>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Spacer to prevent content jump when tabs become fixed */}
            {scrolled && tabs.length > 0 && <div className="lg:hidden h-[56px]" />}
        </>
    );
}
