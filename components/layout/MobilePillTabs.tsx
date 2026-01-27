"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

export interface PillTab {
    id: string;
    label: string;
    href: string;
}

interface MobilePillTabsProps {
    tabs: PillTab[];
    className?: string;
    /** Theme variant for the pills */
    variant?: "light" | "dark";
}

/**
 * iOS Fitness+ style horizontal scrollable pill tabs
 * Used for Level 3 navigation (sub-sections within an app)
 */
export default function MobilePillTabs({
    tabs,
    className,
    variant = "light"
}: MobilePillTabsProps) {
    const pathname = usePathname();
    const scrollRef = React.useRef<HTMLDivElement>(null);
    const activeRef = React.useRef<HTMLAnchorElement>(null);

    // Auto-scroll to active tab on mount
    React.useEffect(() => {
        if (activeRef.current && scrollRef.current) {
            const container = scrollRef.current;
            const activeEl = activeRef.current;
            const containerRect = container.getBoundingClientRect();
            const activeRect = activeEl.getBoundingClientRect();

            // Center the active tab
            const scrollLeft = activeEl.offsetLeft - (containerRect.width / 2) + (activeRect.width / 2);
            container.scrollTo({ left: Math.max(0, scrollLeft), behavior: "smooth" });
        }
    }, [pathname]);

    const isActive = (href: string) => {
        // Exact match for overview/index routes
        if (pathname === href) return true;
        // For sub-routes, check if it starts with href and href is not the parent
        if (href.split("/").length > 3 && pathname.startsWith(href)) return true;
        return false;
    };

    return (
        <div className={clsx("lg:hidden", className)}>
            <div
                ref={scrollRef}
                className="overflow-x-auto scrollbar-hide px-4 py-3"
                style={{ WebkitOverflowScrolling: "touch" }}
            >
                <div className="flex gap-2 w-max">
                    {tabs.map((tab) => {
                        const active = isActive(tab.href);
                        return (
                            <Link
                                key={tab.id}
                                href={tab.href}
                                ref={active ? activeRef : null}
                                className={clsx(
                                    "px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200 active:scale-95 backdrop-blur-sm",
                                    variant === "light"
                                        ? active
                                            // Active: Soft rose/pink glass fill - iOS style  
                                            ? "bg-rose-100/90 text-rose-800 shadow-sm border border-rose-200/50"
                                            // Inactive: Transparent glass with subtle border
                                            : "bg-white/40 text-neutral-500 border border-neutral-300/40 hover:bg-white/60 hover:text-neutral-700"
                                        : active
                                            // Dark variant - active
                                            ? "bg-rose-500/90 text-white shadow-sm border border-rose-400/50"
                                            // Dark variant - inactive
                                            : "bg-white/10 text-neutral-300 border border-white/20 hover:bg-white/20"
                                )}
                            >
                                {tab.label}
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
