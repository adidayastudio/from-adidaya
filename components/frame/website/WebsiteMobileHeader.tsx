"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import clsx from "clsx";
import {
    ChevronLeft,
    Plus,
    Search,
    List,
    LayoutList,
    ListFilter,
    X,
    LayoutGrid,
    Globe,
    ExternalLink
} from "lucide-react";
import { useUserContext } from "@/components/providers/UserProvider";

const WEBSITE_TABS = [
    { id: "dashboard", label: "Overview", href: "/frame/website", icon: LayoutGrid },
    { id: "landing", label: "Landing", href: "/frame/website?view=hero-image", icon: Globe },
    { id: "studio", label: "Studio", href: "/frame/website?view=studio-profile", icon: Globe },
    { id: "projects", label: "Projects", href: "/frame/website?view=projects", icon: Globe },
    { id: "insights", label: "Insight", href: "/frame/website?view=insights", icon: Globe },
    { id: "network", label: "Network", href: "/frame/website?view=network-contact", icon: Globe },
];

interface WebsiteMobileHeaderProps {
    onAdd?: () => void;
    backUrl?: string;
}

export default function WebsiteMobileHeader({
    onAdd,
    backUrl = "/dashboard",
}: WebsiteMobileHeaderProps) {
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [scrolled, setScrolled] = useState(false);
    const { profile } = useUserContext();

    const canManage = !!(profile?.role && ["superadmin", "admin", "administrator", "supervisor", "hr", "pm", "management", "owner"].includes(profile.role.toLowerCase()));

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const isActive = (href: string) => {
        const [hrefPath, hrefQuery] = href.split('?');
        if (hrefQuery) {
            if (pathname === hrefPath) {
                const params = new URLSearchParams(hrefQuery);
                // Check if the primary view param matches
                const viewParam = params.get('view');
                const currentView = searchParams.get('view');

                if (viewParam && currentView) {
                    // Match prefixes for grouped sections (Landing, Studio, Network)
                    if (viewParam === 'hero-image' && currentView.startsWith('hero-')) return true;
                    if (viewParam === 'hero-image' && currentView === 'landing-description') return true;
                    if (viewParam === 'studio-profile' && currentView.startsWith('studio-')) return true;
                    if (viewParam === 'network-contact' && currentView.startsWith('network-')) return true;
                    return currentView === viewParam;
                }
                if (!viewParam && !currentView) return true;
            }
            return false;
        }
        if (pathname === hrefPath) {
            return !searchParams.get('view');
        }
        return false;
    };

    return (
        <>
            {/* Fixed Floating Top Bar */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-50 pt-12 pointer-events-none">
                {/* Background Mask - Linear Blur effect */}
                <div className={clsx(
                    "absolute inset-0 bg-white/60 transition-all duration-500 pointer-events-none",
                    scrolled ? "opacity-100" : "opacity-0"
                )} style={{
                    maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
                    WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
                    backdropFilter: scrolled ? 'blur(16px)' : 'none',
                    height: '80px'
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
                        Website
                    </div>

                    <div className={clsx(
                        "flex items-center gap-1 p-1 rounded-full shadow-sm border border-black/[0.03] transition-all duration-300",
                        scrolled ? "bg-white/40 backdrop-blur-md" : "bg-white"
                    )}>
                        {canManage && onAdd && (
                            <button
                                onClick={onAdd}
                                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-50 active:scale-90 transition-all duration-200 pointer-events-auto"
                            >
                                <Plus className="w-5 h-5 text-gray-700" strokeWidth={1.5} />
                            </button>
                        )}
                        <a
                            href="https://www.adidayastudio.id"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-50 active:scale-90 transition-all duration-200 pointer-events-auto"
                        >
                            <ExternalLink className="w-4 h-4 text-gray-700" strokeWidth={1.5} />
                        </a>
                    </div>
                </div>
            </div>

            {/* Large Scrollable Title Area */}
            <div className="lg:hidden pt-28 pb-2">
                <div className="px-5 pb-1">
                    <h1 className="text-[32px] font-bold text-gray-900 tracking-tight">Website</h1>
                </div>
            </div>

            {/* Scrollable Tabs - Becomes Fixed on Scroll */}
            <div className={`lg:hidden z-30 transition-all duration-300 ${scrolled
                ? "fixed top-[100px] left-5 right-5 bg-white/70 backdrop-blur-2xl backdrop-saturate-[1.8] border border-black/[0.04] p-[2px] rounded-[24px] shadow-[0_8px_32px_-12px_rgba(0,0,0,0.1)]"
                : "relative bg-transparent pb-4 mt-2"
                }`}>
                <div className={`flex items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${scrolled ? 'px-0' : 'px-5'}`}>
                    {WEBSITE_TABS.map((tab) => {
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
            {scrolled && <div className="lg:hidden h-[76px]" />}
        </>
    );
}
