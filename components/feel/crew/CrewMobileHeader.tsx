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
    Users,
    ClipboardList,
    CalendarClock,
    Wallet,
    TrendingUp,
    FileCheck,
    Calendar,
    ChartGantt,
} from "lucide-react";
import { useUserContext } from "@/components/providers/UserProvider";

const CREW_TABS = [
    { id: "directory", label: "Directory", href: "/feel/crew", icon: Users },
    { id: "assignments", label: "Assignment", href: "/feel/crew?tab=assignments", icon: ClipboardList },
    { id: "daily-input", label: "Daily Log", href: "/feel/crew?tab=daily-input", icon: CalendarClock },
    { id: "payroll", label: "Payroll", href: "/feel/crew?tab=payroll", icon: Wallet },
    { id: "performance", label: "KPI", href: "/feel/crew?tab=performance", icon: TrendingUp },
    { id: "requests", label: "Requests", href: "/feel/crew?tab=requests", icon: FileCheck },
];

const ROLE_OPTIONS = [
    { value: "all", label: "All Roles" },
    { value: "mandor", label: "Mandor" },
    { value: "tukang", label: "Tukang" },
    { value: "worker", label: "Worker" },
];

const STATUS_OPTIONS = [
    { value: "all", label: "All Status" },
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
];

interface CrewMobileHeaderProps {
    onAddCrew?: () => void;
    backUrl?: string;
    // View props
    view?: string;
    onChangeView?: (v: any) => void;
    // Filter props
    selectedRole?: string;
    onRoleChange?: (role: string) => void;
    selectedStatus?: string;
    onStatusChange?: (status: string) => void;
    searchQuery?: string;
    onSearchChange?: (q: string) => void;
}

export default function CrewMobileHeader({
    onAddCrew,
    backUrl = "/dashboard",
    view = "list",
    onChangeView,
    selectedRole = "all",
    onRoleChange,
    selectedStatus = "all",
    onStatusChange,
    searchQuery = "",
    onSearchChange,
}: CrewMobileHeaderProps) {
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

    const isActive = (href: string) => {
        const [hrefPath, hrefQuery] = href.split('?');
        if (hrefQuery) {
            if (pathname === hrefPath) {
                const params = new URLSearchParams(hrefQuery);
                for (const [key, value] of params.entries()) {
                    if (searchParams.get(key) !== value) return false;
                }
                return true;
            }
            return false;
        }
        if (pathname === hrefPath) {
            return !searchParams.get('tab') && !searchParams.get('view');
        }
        return false;
    };

    const isFilterActive = selectedRole !== "all" || selectedStatus !== "all" || searchQuery !== "";

    return (
        <>
            {/* Fixed Floating Top Bar */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-50 pt-6 pointer-events-none">
                {/* Background Mask - Linear Blur effect */}
                <div className={clsx(
                    "absolute left-0 right-0 transition-all duration-500 pointer-events-none",
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
                        Crew
                    </div>

                    <div className={clsx(
                        "flex items-center gap-1 p-1 rounded-full shadow-sm border border-black/[0.03] transition-all duration-300",
                        scrolled ? "bg-white/40 backdrop-blur-md" : "bg-white"
                    )}>
                        <button
                            onClick={() => onChangeView?.(view === 'list' ? 'grouped' : view === 'grouped' ? 'calendar' : view === 'calendar' ? 'timeline' : 'list')}
                            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-50 active:scale-90 transition-all duration-200 pointer-events-auto"
                        >
                            {view === 'list' && <List className="w-5 h-5 text-gray-700" strokeWidth={1.5} />}
                            {view === 'grouped' && <LayoutList className="w-5 h-5 text-gray-700" strokeWidth={1.5} />}
                            {view === 'calendar' && <Calendar className="w-5 h-5 text-gray-700" strokeWidth={1.5} />}
                            {view === 'timeline' && <ChartGantt className="w-5 h-5 text-gray-700" strokeWidth={1.5} />}
                        </button>
                        <button
                            onClick={() => setShowFilters(true)}
                            className={clsx(
                                "w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-50 active:scale-90 transition-all duration-200 pointer-events-auto relative",
                                isFilterActive ? "text-blue-600 bg-blue-50/50" : "text-gray-700"
                            )}
                        >
                            <ListFilter className="w-5 h-5" strokeWidth={1.5} />
                        </button>
                        {canManage && (
                            <button
                                onClick={onAddCrew}
                                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-50 active:scale-90 transition-all duration-200 pointer-events-auto"
                            >
                                <Plus className="w-5 h-5 text-gray-700" strokeWidth={1.5} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Filter Bottom Sheet / Modal */}
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
                                        onClick={() => {
                                            onRoleChange?.("all");
                                            onStatusChange?.("all");
                                            onSearchChange?.("");
                                        }}
                                        className="text-[13px] font-medium text-blue-600 hover:text-blue-700 active:scale-95 transition-all outline-none"
                                    >
                                        Clear
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
                            {/* Search */}
                            <div className="space-y-4 px-2">
                                <h4 className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.2em]">Search</h4>
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => onSearchChange?.(e.target.value)}
                                        placeholder="Search crew members..."
                                        className="w-full bg-white/50 border border-black/5 rounded-2xl py-3.5 pl-11 pr-4 text-[15px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Role */}
                            <div className="space-y-4">
                                <h4 className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.2em] px-2">Role</h4>
                                <div className="flex flex-wrap gap-2.5">
                                    {ROLE_OPTIONS.map((opt) => {
                                        const isSelected = selectedRole === opt.value;
                                        return (
                                            <button
                                                key={opt.value}
                                                onClick={() => onRoleChange?.(opt.value)}
                                                className={clsx(
                                                    "px-4 py-2 rounded-full text-[13px] transition-all border",
                                                    isSelected
                                                        ? "bg-[#001F3F]/60 backdrop-blur-md text-white border-[#001F3F]/50 shadow-lg shadow-[#001F3F]/10 ring-1 ring-white/10 font-medium"
                                                        : "bg-white/40 backdrop-blur-md text-neutral-600 border-black/[0.04] hover:bg-neutral-100"
                                                )}
                                            >
                                                {opt.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Status */}
                            <div className="space-y-4">
                                <h4 className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.2em] px-2">Status</h4>
                                <div className="flex flex-wrap gap-2.5">
                                    {STATUS_OPTIONS.map((opt) => {
                                        const isSelected = selectedStatus === opt.value;
                                        return (
                                            <button
                                                key={opt.value}
                                                onClick={() => onStatusChange?.(opt.value)}
                                                className={clsx(
                                                    "px-4 py-2 rounded-full text-[13px] transition-all border",
                                                    isSelected
                                                        ? "bg-[#001F3F]/60 backdrop-blur-md text-white border-[#001F3F]/50 shadow-lg shadow-[#001F3F]/10 ring-1 ring-white/10 font-medium"
                                                        : "bg-white/40 backdrop-blur-md text-neutral-600 border-black/[0.04] hover:bg-neutral-100"
                                                )}
                                            >
                                                {opt.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Footer Action */}
                        <div className="pt-2">
                            <button
                                onClick={() => setShowFilters(false)}
                                className="w-full bg-[#001F3F] backdrop-blur-xl backdrop-saturate-[1.5] text-white py-4 rounded-full font-bold text-[17px] active:scale-[0.98] transition-all shadow-xl shadow-[#001F3F]/30 mb-1 border border-white/20 ring-1 ring-inset ring-white/10"
                            >
                                Apply
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Large Scrollable Title Area */}
            <div className="lg:hidden pt-20 pb-2">
                <div className="px-5 pb-1">
                    <h1 className="text-[32px] font-bold text-gray-900 tracking-tight">Crew</h1>
                </div>
            </div>

            {/* Scrollable Tabs - Becomes Fixed on Scroll */}
            <div className={`lg:hidden z-30 transition-all duration-300 ${scrolled
                ? "fixed top-[80px] left-5 right-5 bg-white/70 backdrop-blur-2xl backdrop-saturate-[1.8] border border-black/[0.04] p-[2px] rounded-[24px] shadow-[0_8px_32px_-12px_rgba(0,0,0,0.1)]"
                : "relative bg-transparent pb-4 mt-2"
                }`}>
                <div className={`flex items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${scrolled ? 'px-0' : 'px-5'}`}>
                    {CREW_TABS.map((tab) => {
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
                                <tab.icon className={`w-[16px] h-[16px] ${active ? 'text-blue-600' : 'text-neutral-500 opacity-60'}`} strokeWidth={active ? 2 : 1.5} />
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
