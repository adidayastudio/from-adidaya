"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft } from "lucide-react";

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
        <div className="lg:hidden sticky top-0 z-40 bg-[#f8f9fa]/80 backdrop-blur-xl border-b border-transparent">
            {/* Top Bar: Back & Actions */}
            <div className="flex items-center justify-between px-5 pt-12 pb-2">
                <Link
                    href={backUrl}
                    className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-neutral-200/60 active:scale-95 transition-transform"
                >
                    <ChevronLeft className="w-5 h-5 text-neutral-700" strokeWidth={2.5} />
                </Link>

                {actions && (
                    <div className="flex items-center p-1 bg-white rounded-[20px] shadow-sm border border-neutral-200/60 gap-0.5">
                        {actions}
                    </div>
                )}
            </div>

            {/* Title */}
            <div className="px-5 pb-3">
                <h1 className="text-[34px] font-bold text-neutral-900 tracking-tight">{title}</h1>
            </div>

            {/* Scrollable Pills */}
            {tabs.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] px-5 pb-4">
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
                                    }`}
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
            )}
        </div>
    );
}
