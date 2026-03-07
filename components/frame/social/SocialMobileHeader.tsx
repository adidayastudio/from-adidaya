"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import clsx from "clsx";
import {
    ChevronLeft,
    Plus,
    ListFilter,
    X,
    Users,
    ClipboardList,
    LayoutGrid,
    Calendar,
} from "lucide-react";
import { useUserContext } from "@/components/providers/UserProvider";
import { Platform } from "./types/social.types";
import SocialPostCreator from "./SocialPostCreator";
import { SocialPost, SocialAccount } from "./types/social.types";

export type SocialTab = "account" | "plan" | "calendar";

const SOCIAL_TABS = [
    { id: "account" as SocialTab, label: "Account", href: "/frame/social?tab=account", icon: Users },
    { id: "plan" as SocialTab, label: "Plan", href: "/frame/social?tab=plan", icon: ClipboardList },
    { id: "calendar" as SocialTab, label: "Calendar", href: "/frame/social?tab=calendar", icon: Calendar },
];

const PLATFORM_OPTIONS = [
    { value: "ALL", label: "All Platforms" },
    { value: "INSTAGRAM", label: "Instagram" },
    { value: "TIKTOK", label: "TikTok" },
    { value: "LINKEDIN", label: "LinkedIn" },
    { value: "YOUTUBE", label: "YouTube" },
    { value: "FACEBOOK", label: "Facebook" },
];

interface SocialMobileHeaderProps {
    backUrl?: string;
    onBack?: () => void;
    hideTabs?: boolean;
    // Filter props
    selectedPlatform?: Platform | "ALL";
    onPlatformChange?: (platform: Platform | "ALL") => void;
    // Month filter
    monthFilter?: string;
    onMonthFilterChange?: (month: string) => void;
    monthOptions?: { value: string; label: string }[];
    // Sort
    selectedSort?: string;
    onSortChange?: (sort: string) => void;
    // Account status filter
    accountStatusFilter?: "all" | "active" | "inactive";
    onAccountStatusFilterChange?: (status: "all" | "active" | "inactive") => void;
    // Account sort
    accountSort?: string;
    onAccountSortChange?: (sort: string) => void;
    // Add post
    onAddPost?: () => void;
    onAddAccount?: () => void;
    // Accounts for the post creator
    accounts?: SocialAccount[];
    title?: string;
    postStatusFilter?: string;
    onPostStatusFilterChange?: (status: string) => void;
    postDeadlineFilter?: string;
    onPostDeadlineFilterChange?: (deadline: string) => void;
}

export default function SocialMobileHeader({
    backUrl = "/dashboard",
    onBack,
    hideTabs = false,
    selectedPlatform = "ALL",
    onPlatformChange,
    monthFilter = "all",
    onMonthFilterChange,
    monthOptions = [],
    selectedSort = "date-desc",
    onSortChange,
    accountStatusFilter = "all",
    onAccountStatusFilterChange,
    accountSort = "name-asc",
    onAccountSortChange,
    onAddPost,
    onAddAccount,
    accounts = [],
    title,
    postStatusFilter = "ALL",
    onPostStatusFilterChange,
    postDeadlineFilter = "ALL",
    onPostDeadlineFilterChange,
}: SocialMobileHeaderProps) {

    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [scrolled, setScrolled] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const { profile } = useUserContext();

    const canManage = !!(profile?.role && ["superadmin", "admin", "administrator", "supervisor", "hr", "pm", "management", "owner"].includes(profile.role.toLowerCase()));

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const activeTab = (searchParams.get("tab") as SocialTab) || "account";

    const isActive = (tabId: SocialTab) => activeTab === tabId;

    // Filter active state depends on active tab
    const handleClearFilters = () => {
        onPlatformChange?.("ALL");
        onMonthFilterChange?.("all");
        onAccountStatusFilterChange?.("all");
        onPostStatusFilterChange?.("ALL");
        onPostDeadlineFilterChange?.("ALL");
    };

    const isFilterActive = selectedPlatform !== "ALL" ||
        monthFilter !== "all" ||
        accountStatusFilter !== "all" ||
        postStatusFilter !== "ALL" ||
        postDeadlineFilter !== "ALL";

    return (
        <>
            {/* Fixed Floating Top Bar */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-50 pt-6 pointer-events-none">
                {/* Background Mask - Linear Blur effect */}
                <div className={clsx(
                    "absolute inset-0 bg-white/60 transition-all duration-500 pointer-events-none",
                    scrolled ? "opacity-100" : "opacity-0"
                )} style={{
                    maskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)',
                    WebkitMaskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)',
                    backdropFilter: scrolled ? 'blur(16px)' : 'none',
                    height: '80px'
                }} />

                <div className="flex items-center justify-between px-5 pointer-events-auto relative z-10 pb-2">
                    <div className={clsx(
                        "p-1 rounded-full shadow-sm border border-black/[0.03] transition-all duration-300",
                        scrolled ? "bg-white/40 backdrop-blur-md" : "bg-white"
                    )}>
                        <button
                            onClick={() => onBack ? onBack() : router.push(backUrl)}
                            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-50 active:scale-90 transition-all duration-200 pointer-events-auto"
                        >
                            <ChevronLeft className="w-5 h-5 text-gray-700" strokeWidth={1.5} />
                        </button>
                    </div>

                    <div
                        className={clsx(
                            "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-bold text-gray-900 text-[18px] transition-opacity duration-300",
                            scrolled ? "opacity-100" : "opacity-0 pointer-events-none"
                        )}
                    >
                        {title || "Social"}
                    </div>

                    <div className={clsx(
                        "flex items-center gap-1 p-1 rounded-full shadow-sm border border-black/[0.03] transition-all duration-300",
                        scrolled ? "bg-white/40 backdrop-blur-md" : "bg-white"
                    )}>
                        <button
                            onClick={() => setShowFilters(true)}
                            className={clsx(
                                "w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-50 active:scale-90 transition-all duration-200 pointer-events-auto relative",
                                isFilterActive ? "text-orange-500 bg-orange-50/50" : "text-gray-700"
                            )}
                        >
                            <ListFilter className="w-5 h-5" strokeWidth={1.5} />
                        </button>
                        {canManage && (
                            <button
                                onClick={() => {
                                    if (activeTab === "account") {
                                        onAddAccount?.();
                                    } else {
                                        onAddPost?.();
                                    }
                                }}
                                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-50 active:scale-90 transition-all duration-200 pointer-events-auto"
                            >
                                <Plus className="w-5 h-5 text-gray-700" strokeWidth={1.5} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Filter Bottom Sheet */}
            {showFilters && (
                <div className="fixed inset-0 z-[100] flex items-end justify-center">
                    <div
                        className="absolute inset-0 bg-black/5 backdrop-blur-[2px] transition-opacity"
                        onClick={() => setShowFilters(false)}
                    />
                    <div className="relative w-full mx-2 mb-2 bg-white/70 backdrop-blur-2xl backdrop-saturate-[1.8] rounded-[56px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-500 border border-white/40 p-8 flex flex-col gap-8 max-h-[85dvh]">
                        {/* Header */}
                        <div className="flex items-center justify-between px-2">
                            <h3 className="text-[22px] font-bold text-neutral-900 tracking-tight">Filters</h3>
                            <div className="flex items-center gap-3">
                                {isFilterActive && (
                                    <button
                                        onClick={handleClearFilters}
                                        className="text-[13px] font-medium text-orange-400 hover:text-orange-500 active:scale-95 transition-all outline-none"
                                    >
                                        Clear Filters
                                    </button>
                                )}
                                <button
                                    onClick={() => setShowFilters(false)}
                                    className="w-10 h-10 bg-white/50 backdrop-blur-xl border border-black/5 rounded-full flex items-center justify-center active:scale-95 transition-transform"
                                >
                                    <X size={20} className="text-neutral-500" strokeWidth={1.5} />
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-col gap-8 overflow-y-auto pb-4 pr-1 scrollbar-hide">
                            {/* Platform — shown on all tabs except detail view */}
                            {!title && (
                                <div className="space-y-4">
                                    <h4 className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.2em] px-2">Platform</h4>
                                    <div className="flex flex-wrap gap-2.5">
                                        {PLATFORM_OPTIONS.map((opt) => {
                                            const isSelected = selectedPlatform === opt.value;
                                            return (
                                                <button
                                                    key={opt.value}
                                                    onClick={() => onPlatformChange?.(opt.value as Platform | "ALL")}
                                                    className={clsx(
                                                        "px-4 py-2 rounded-full text-[14px] transition-all border",
                                                        isSelected
                                                            ? "bg-orange-400/70 backdrop-blur-md text-white border-orange-400 shadow-lg shadow-orange-400/10 ring-1 ring-white/10 font-bold"
                                                            : "bg-white/40 backdrop-blur-md text-neutral-600 border-black/[0.04] hover:bg-neutral-100"
                                                    )}
                                                >
                                                    {opt.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* ACCOUNT TAB FILTERS */}
                            {activeTab === "account" && !title && (
                                <>
                                    {/* Status filter */}
                                    <div className="space-y-4">
                                        <h4 className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.2em] px-2">Status</h4>
                                        <div className="flex flex-wrap gap-2.5">
                                            {[
                                                { value: "all", label: "All" },
                                                { value: "active", label: "Active" },
                                                { value: "inactive", label: "Inactive" },
                                            ].map((opt) => {
                                                const isSelected = accountStatusFilter === opt.value;
                                                return (
                                                    <button
                                                        key={opt.value}
                                                        onClick={() => onAccountStatusFilterChange?.(opt.value as any)}
                                                        className={clsx(
                                                            "px-4 py-2 rounded-full text-[14px] transition-all border",
                                                            isSelected
                                                                ? "bg-orange-400/70 backdrop-blur-md text-white border-orange-400 shadow-lg shadow-orange-400/10 ring-1 ring-white/10 font-bold"
                                                                : "bg-white/40 backdrop-blur-md text-neutral-600 border-black/[0.04] hover:bg-neutral-100"
                                                        )}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Account Sort */}
                                    <div className="space-y-4">
                                        <h4 className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.2em] px-2">Sort By</h4>
                                        <div className="px-1">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => onAccountSortChange?.(accountSort === "name-asc" ? "name-desc" : "name-asc")}
                                                    className={clsx(
                                                        "px-5 py-2.5 rounded-full text-[14px] transition-all border shrink-0",
                                                        accountSort.startsWith('name')
                                                            ? "bg-orange-400/70 backdrop-blur-md text-white border-orange-400 shadow-md shadow-orange-400/10 font-bold"
                                                            : "bg-white/40 backdrop-blur-md text-neutral-600 border-black/[0.04]"
                                                    )}
                                                >
                                                    Name {accountSort === 'name-asc' ? 'A-Z' : accountSort === 'name-desc' ? 'Z-A' : ''}
                                                </button>
                                                <button
                                                    onClick={() => onAccountSortChange?.("platform")}
                                                    className={clsx(
                                                        "px-5 py-2.5 rounded-full text-[13px] transition-all border shrink-0",
                                                        accountSort === 'platform'
                                                            ? "bg-orange-400/70 backdrop-blur-md text-white border-orange-400 shadow-md shadow-orange-400/10 font-medium"
                                                            : "bg-white/40 backdrop-blur-md text-neutral-600 border-black/[0.04]"
                                                    )}
                                                >
                                                    Platform
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}


                            {/* ACCOUNT DETAIL FILTERS (When title exists) */}
                            {title && (
                                <>
                                    {/* Post Status */}
                                    <div className="space-y-4">
                                        <h4 className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.2em] px-2">Status</h4>
                                        <div className="flex flex-wrap gap-2.5">
                                            {[
                                                { value: "ALL", label: "All Status" },
                                                { value: "TODO", label: "To-Do" },
                                                { value: "WRITING", label: "Writing" },
                                                { value: "APPROVED", label: "Approved" },
                                                { value: "PUBLISHED", label: "Published" },
                                            ].map((opt) => {
                                                const isSelected = postStatusFilter === opt.value;
                                                return (
                                                    <button
                                                        key={opt.value}
                                                        onClick={() => onPostStatusFilterChange?.(opt.value)}
                                                        className={clsx(
                                                            "px-4 py-2 rounded-full text-[14px] transition-all border",
                                                            isSelected
                                                                ? "bg-orange-400/70 backdrop-blur-md text-white border-orange-400 shadow-lg shadow-orange-400/10 ring-1 ring-white/10 font-bold"
                                                                : "bg-white/40 backdrop-blur-md text-neutral-600 border-black/[0.04] hover:bg-neutral-100"
                                                        )}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Post Deadline */}
                                    <div className="space-y-4">
                                        <h4 className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.2em] px-2">Post Deadline</h4>
                                        <div className="flex flex-wrap gap-2.5">
                                            {[
                                                { value: "ALL", label: "All Deadlines" },
                                                { value: "OVERDUE", label: "Overdue" },
                                                { value: "TODAY", label: "Today" },
                                                { value: "THIS_WEEK", label: "This Week" },
                                                { value: "THIS_MONTH", label: "This Month" },
                                            ].map((opt) => {
                                                const isSelected = postDeadlineFilter === opt.value;
                                                return (
                                                    <button
                                                        key={opt.value}
                                                        onClick={() => onPostDeadlineFilterChange?.(opt.value)}
                                                        className={clsx(
                                                            "px-4 py-2 rounded-full text-[14px] transition-all border",
                                                            isSelected
                                                                ? "bg-orange-400/70 backdrop-blur-md text-white border-orange-400 shadow-lg shadow-orange-400/10 ring-1 ring-white/10 font-bold"
                                                                : "bg-white/40 backdrop-blur-md text-neutral-600 border-black/[0.04] hover:bg-neutral-100"
                                                        )}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Sort By */}
                                    <div className="space-y-4">
                                        <h4 className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.2em] px-2">Sort By</h4>
                                        <div className="flex items-center gap-2 px-1">
                                            <button
                                                onClick={() => onSortChange?.(selectedSort.startsWith('date') ? selectedSort : 'date-desc')}
                                                className={clsx(
                                                    "px-5 py-2.5 rounded-full text-[14px] transition-all border shrink-0",
                                                    selectedSort.startsWith('date')
                                                        ? "bg-orange-400/70 backdrop-blur-md text-white border-orange-400 shadow-md shadow-orange-400/10 font-bold"
                                                        : "bg-white/40 backdrop-blur-md text-neutral-600 border-black/[0.04]"
                                                )}
                                            >
                                                Deadline
                                            </button>
                                            <button
                                                onClick={() => onSortChange?.(selectedSort.startsWith('name') ? selectedSort : 'name-asc')}
                                                className={clsx(
                                                    "px-5 py-2.5 rounded-full text-[14px] transition-all border shrink-0",
                                                    selectedSort.startsWith('name')
                                                        ? "bg-orange-400/70 backdrop-blur-md text-white border-orange-400 shadow-md shadow-orange-400/10 font-bold"
                                                        : "bg-white/40 backdrop-blur-md text-neutral-600 border-black/[0.04]"
                                                )}
                                            >
                                                Name
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* CONTENT TAB FILTERS (plan, status, calendar) */}
                            {activeTab !== "account" && !title && (
                                <>
                                    {/* Month */}
                                    {monthOptions.length > 0 && (
                                        <div className="space-y-4">
                                            <h4 className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.2em] px-2">Month</h4>
                                            <div className="flex flex-wrap gap-2.5">
                                                {monthOptions.map((opt) => {
                                                    const isSelected = monthFilter === opt.value;
                                                    return (
                                                        <button
                                                            key={opt.value}
                                                            onClick={() => onMonthFilterChange?.(opt.value)}
                                                            className={clsx(
                                                                "px-4 py-2 rounded-full text-[13px] transition-all border",
                                                                isSelected
                                                                    ? "bg-orange-400/70 backdrop-blur-md text-white border-orange-400 shadow-lg shadow-orange-400/10 ring-1 ring-white/10 font-medium"
                                                                    : "bg-white/40 backdrop-blur-md text-neutral-600 border-black/[0.04] hover:bg-neutral-100"
                                                            )}
                                                        >
                                                            {opt.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Sort By */}
                                    <div className="space-y-4">
                                        <h4 className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.2em] px-2">Sort By</h4>
                                        <div className="px-1">
                                            <div className="flex items-center justify-between w-full">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => onSortChange?.(selectedSort.startsWith('name') ? selectedSort : 'name-asc')}
                                                        className={clsx(
                                                            "px-5 py-2.5 rounded-full text-[13px] transition-all border shrink-0",
                                                            selectedSort.startsWith('name')
                                                                ? "bg-orange-400/70 backdrop-blur-md text-white border-orange-400 shadow-md shadow-orange-400/10 font-medium"
                                                                : "bg-white/40 backdrop-blur-md text-neutral-600 border-black/[0.04]"
                                                        )}
                                                    >
                                                        Name
                                                    </button>
                                                    <button
                                                        onClick={() => onSortChange?.(selectedSort.startsWith('date') ? selectedSort : 'date-desc')}
                                                        className={clsx(
                                                            "px-5 py-2.5 rounded-full text-[13px] transition-all border shrink-0",
                                                            selectedSort.startsWith('date')
                                                                ? "bg-orange-400/70 backdrop-blur-md text-white border-orange-400 shadow-md shadow-orange-400/10 font-medium"
                                                                : "bg-white/40 backdrop-blur-md text-neutral-600 border-black/[0.04]"
                                                        )}
                                                    >
                                                        Date
                                                    </button>
                                                </div>

                                                <div className="flex items-center shrink-0">
                                                    {selectedSort.startsWith('name') && (
                                                        <div className="flex items-center gap-1.5 p-1 bg-black/[0.02] rounded-full border border-black/[0.04]">
                                                            <button
                                                                onClick={() => onSortChange?.('name-asc')}
                                                                className={clsx(
                                                                    "px-4 py-1.5 rounded-full text-[12px] font-medium transition-all",
                                                                    selectedSort === 'name-asc' ? "bg-white text-orange-500 shadow-sm border border-black/5" : "text-neutral-500 hover:text-neutral-700"
                                                                )}
                                                            >
                                                                A-Z
                                                            </button>
                                                            <button
                                                                onClick={() => onSortChange?.('name-desc')}
                                                                className={clsx(
                                                                    "px-4 py-1.5 rounded-full text-[12px] font-medium transition-all",
                                                                    selectedSort === 'name-desc' ? "bg-white text-orange-500 shadow-sm border border-black/5" : "text-neutral-500 hover:text-neutral-700"
                                                                )}
                                                            >
                                                                Z-A
                                                            </button>
                                                        </div>
                                                    )}

                                                    {selectedSort.startsWith('date') && (
                                                        <div className="flex items-center gap-1.5 p-1 bg-black/[0.02] rounded-full border border-black/[0.04]">
                                                            <button
                                                                onClick={() => onSortChange?.('date-desc')}
                                                                className={clsx(
                                                                    "px-4 py-1.5 rounded-full text-[12px] font-medium transition-all",
                                                                    selectedSort === 'date-desc' ? "bg-white text-orange-500 shadow-sm border border-black/5" : "text-neutral-500 hover:text-neutral-700"
                                                                )}
                                                            >
                                                                Newest
                                                            </button>
                                                            <button
                                                                onClick={() => onSortChange?.('date-asc')}
                                                                className={clsx(
                                                                    "px-4 py-1.5 rounded-full text-[12px] font-medium transition-all",
                                                                    selectedSort === 'date-asc' ? "bg-white text-orange-500 shadow-sm border border-black/5" : "text-neutral-500 hover:text-neutral-700"
                                                                )}
                                                            >
                                                                Oldest
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Footer Action */}
                        <div className="pt-2">
                            <button
                                onClick={() => setShowFilters(false)}
                                className="w-full bg-orange-500 backdrop-blur-xl backdrop-saturate-[1.5] text-white py-4 rounded-full font-bold text-[17px] active:scale-[0.98] transition-all shadow-xl shadow-orange-500/30 mb-1 border border-white/20 ring-1 ring-inset ring-white/10"
                            >
                                Apply Filters
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Large Scrollable Title Area - Only show if no title prop (detail view) */}
            {!title && (
                <div className="lg:hidden pt-20 pb-2">
                    <div className="px-5 pb-1">
                        <h1 className="text-[32px] font-bold text-gray-900 tracking-tight">Social</h1>
                    </div>
                </div>
            )}

            {/* Scrollable Tabs - Becomes Fixed on Scroll */}
            {!hideTabs && (
                <div className={`lg:hidden z-30 transition-all duration-300 ${scrolled
                    ? "fixed top-[80px] left-5 right-5 bg-white/70 backdrop-blur-2xl backdrop-saturate-[1.8] border border-black/[0.04] p-[2px] rounded-[24px] shadow-[0_8px_32px_-12px_rgba(0,0,0,0.1)]"
                    : "relative bg-transparent pb-4 mt-2"
                    }`}>
                    <div className={`flex items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${scrolled ? 'px-0' : 'px-5'}`}>
                        {SOCIAL_TABS.map((tab) => {
                            const active = isActive(tab.id);
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
            )}

            {/* Spacer to prevent content jump when tabs become fixed */}
            {scrolled && !hideTabs && !title && <div className="lg:hidden h-[56px]" />}
        </>
    );
}
