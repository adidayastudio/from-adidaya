"use client";

import PageWrapper from "@/components/layout/PageWrapper";
import { LiquidMobileHeader } from "@/components/shared/liquid/LiquidMobileHeader";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import {
    LayoutDashboard,
    Package,
    Wrench,
    Truck,
    Handshake,
    FileBarChart,
    ListFilter,
    Plus,
    MoreHorizontal,
    RefreshCw,
    Sparkles,
    Search
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import clsx from "clsx";

// Resources Tabs — Standardized Icons
const RESOURCES_TABS = [
    { id: "overview", label: "Overview", href: "/flow/resources/overview", icon: LayoutDashboard },
    { id: "materials", label: "Materials", href: "/flow/resources/materials", icon: Package },
    { id: "tools", label: "Tools", href: "/flow/resources/tools", icon: Wrench },
    { id: "assets", label: "Assets", href: "/flow/resources/assets", icon: Truck },
    { id: "services", label: "Services", href: "/flow/resources/services", icon: Handshake },
    { id: "reports", label: "Reports", href: "/flow/resources/reports", icon: FileBarChart },
];

interface ResourcesPageWrapperProps {
    breadcrumbItems: { label: string; href?: string }[];
    header?: React.ReactNode;
    children: React.ReactNode;
    sidebar?: React.ReactNode;
}

export default function ResourcesPageWrapper({
    breadcrumbItems,
    header,
    children,
    sidebar,
}: ResourcesPageWrapperProps) {
    const [showMore, setShowMore] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [searchVal, setSearchVal] = useState("");
    const moreMenuRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
                setShowMore(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const dispatchAction = (action: string) => {
        window.dispatchEvent(new CustomEvent('resource-action', { detail: { type: action } }));
        setShowMore(false);
    };

    const handleSearchChange = (val: string) => {
        setSearchVal(val);
        window.dispatchEvent(new CustomEvent('resource-search', { detail: { query: val } }));
    };

    const toolbarActions = (
        <div className="flex items-center gap-0.5">
            {/* Expanded Search Bar */}
            <div className={clsx(
                "flex items-center gap-2 bg-neutral-100 dark:bg-neutral-800 rounded-full transition-all duration-300 overflow-hidden",
                isSearching ? "w-40 sm:w-64 px-3 h-10 ml-2" : "w-0 h-10 px-0 opacity-0"
            )}>
                <Search className="w-4 h-4 text-neutral-400 shrink-0" />
                <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search catalog..."
                    className="bg-transparent border-none outline-none text-sm font-bold text-neutral-700 dark:text-neutral-300 w-full"
                    value={searchVal}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onBlur={() => { if (!searchVal) setIsSearching(false); }}
                />
            </div>

            <button
                onClick={() => {
                    setIsSearching(!isSearching);
                    if (!isSearching) setTimeout(() => searchInputRef.current?.focus(), 100);
                }}
                className={clsx(
                    "w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-50 dark:hover:bg-neutral-800 active:scale-90 transition-all duration-200 pointer-events-auto",
                    isSearching && "text-blue-500 bg-blue-50 dark:bg-blue-500/10"
                )}>
                <Search className="w-5 h-5" strokeWidth={2} />
            </button>
            <button className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-50 dark:hover:bg-neutral-800 active:scale-90 transition-all duration-200 pointer-events-auto">
                <ListFilter className="w-5 h-5 text-gray-700 dark:text-white" strokeWidth={1.5} />
            </button>
            <button className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-50 dark:hover:bg-neutral-800 active:scale-90 transition-all duration-200 pointer-events-auto">
                <Plus className="w-5 h-5 text-gray-700 dark:text-white" strokeWidth={1.5} />
            </button>

            <div className="relative" ref={moreMenuRef}>
                <button
                    onClick={() => setShowMore(!showMore)}
                    className={clsx(
                        "w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-50 dark:hover:bg-neutral-800 active:scale-90 transition-all duration-200 pointer-events-auto",
                        showMore && "bg-neutral-100 dark:bg-neutral-800"
                    )}
                >
                    <MoreHorizontal className="w-5 h-5 text-gray-700 dark:text-white" strokeWidth={1.5} />
                </button>

                {/* Dropdown Menu */}
                {showMore && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-[20px] shadow-xl z-50 py-2 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                        <button
                            onClick={() => dispatchAction('historical-sync')}
                            className="w-full px-4 py-2.5 flex items-center gap-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                        >
                            <RefreshCw className="w-4 h-4 text-blue-500" />
                            Historical Sync
                        </button>
                        <button
                            onClick={() => dispatchAction('ai-cleanup')}
                            className="w-full px-4 py-2.5 flex items-center gap-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                        >
                            <Sparkles className="w-4 h-4 text-orange-500" />
                            AI Cleanup
                        </button>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <>
            {/* MOBILE LAYOUT */}
            <div className="lg:hidden min-h-screen bg-neutral-100 dark:bg-black">
                <LiquidMobileHeader
                    title="Resources"
                    backUrl="/dashboard"
                    tabs={RESOURCES_TABS}
                    actions={toolbarActions}
                />

                <div className="pb-32 px-4 space-y-4">
                    {header}
                    {children}
                </div>
            </div>

            {/* DESKTOP LAYOUT */}
            <div className="hidden lg:block bg-transparent p-0 transition-colors">
                <PageWrapper sidebar={sidebar} isTransparent>
                    <div className="space-y-8 w-full animate-in fade-in duration-500">
                        {children}
                    </div>
                </PageWrapper>
            </div>
        </>
    );
}
