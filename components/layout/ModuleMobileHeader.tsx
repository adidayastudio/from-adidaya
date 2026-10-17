"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";

interface ModuleMobileHeaderProps {
    title: string;
    subtitle?: string;
    backUrl?: string;
    rightToolbar?: React.ReactNode;
    tabs?: { id: string; label: string; icon: any }[];
    activeTabId?: string;
    onTabChange?: (id: string) => void;
}

export default function ModuleMobileHeader({
    title,
    subtitle,
    backUrl = "/dashboard",
    rightToolbar,
    tabs,
    activeTabId,
    onTabChange
}: ModuleMobileHeaderProps) {
    const router = useRouter();
    const [scrolled, setScrolled] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Auto-scroll active tab into view
    useEffect(() => {
        if (tabs && activeTabId && scrollContainerRef.current) {
            const activeTab = scrollContainerRef.current.querySelector(`[data-active="true"]`);
            if (activeTab) {
                activeTab.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                    inline: 'center'
                });
            }
        }
    }, [activeTabId, tabs]);

    return (
        <div className="lg:hidden">
            {/* Fixed Floating Top Bar */}
            <div className="fixed top-0 left-0 right-0 z-40 pt-6 pointer-events-none">
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
                    <div className="flex items-center gap-3">
                        {/* Optional Back Button area if needed later */}
                    </div>
                    
                    {/* Centered Title */}
                    <div className="absolute inset-x-0 bottom-2 flex justify-center pointer-events-none">
                        <AnimatePresence>
                            {scrolled && (
                                <motion.h2
                                    initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                                    exit={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                                    className="text-[17px] font-bold text-gray-900 dark:text-white pointer-events-auto"
                                >
                                    {title}
                                </motion.h2>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="flex items-center gap-1.5">
                        {rightToolbar}
                    </div>
                </div>
            </div>

            {/* Large Scrollable Title Area */}
            <div className="pt-20 pb-2">
                <div className="px-5 pb-1">
                    <h1 className="text-[32px] font-bold text-gray-900 dark:text-white tracking-tight leading-none">{title}</h1>
                    {subtitle && <p className="text-[14px] text-neutral-500 dark:text-neutral-400 mt-2 font-medium">{subtitle}</p>}
                </div>
            </div>

            {/* Scrollable Tabs */}
            {tabs && tabs.length > 0 && (
                <div className={clsx(
                    "z-30 transition-all duration-300",
                    scrolled
                        ? "fixed top-[80px] left-5 right-5 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-2xl backdrop-saturate-[1.8] border border-black/[0.04] dark:border-white/[0.05] p-[2px] rounded-[24px] shadow-[0_8px_32px_-12px_rgba(0,0,0,0.1)] dark:shadow-none"
                        : "relative bg-transparent pb-4 mt-2"
                )}>
                    <div
                        ref={scrollContainerRef}
                        className={clsx(
                            "flex items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] scroll-smooth",
                            scrolled ? "px-0" : "px-5"
                        )}
                    >
                        {tabs.map((tab) => {
                            const active = activeTabId === tab.id;
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => onTabChange?.(tab.id)}
                                    data-active={active}
                                    className={clsx(
                                        "relative flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all flex-shrink-0 text-[14px] group",
                                        active
                                            ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm border border-black/[0.04] dark:border-white/[0.1] font-bold"
                                            : "text-neutral-500 dark:text-neutral-400 font-medium hover:bg-white/40 dark:hover:bg-neutral-800/40 hover:text-neutral-800 dark:hover:text-neutral-200"
                                    )}
                                >
                                    <span className="relative z-10">
                                        <Icon className={clsx("w-4 h-4", active ? "text-neutral-900 dark:text-white" : "text-neutral-500 dark:text-neutral-400 opacity-60")} strokeWidth={active ? 2 : 1.5} />
                                    </span>
                                    <span className="relative z-10">{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Spacer */}
            {scrolled && tabs && <div className="h-[56px]" />}
        </div>
    );
}
