"use client";

import React, { useEffect } from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import SocialMobileHeader from "@/components/frame/social/SocialMobileHeader";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { Platform, SocialAccount } from "./types/social.types";
import { motion } from "framer-motion";
import clsx from "clsx";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { LayoutDashboard, Users, CalendarDays } from "lucide-react";

interface SocialPageWrapperProps {
    breadcrumbItems: { label: string; href?: string }[];
    header?: React.ReactNode;
    children: React.ReactNode;
    sidebar?: React.ReactNode;
    backUrl?: string;
    onBack?: () => void;
    hideTabs?: boolean;
    // Mobile header props
    selectedPlatform?: Platform | "ALL";
    onPlatformChange?: (platform: Platform | "ALL") => void;
    monthFilter?: string;
    onMonthFilterChange?: (month: string) => void;
    monthOptions?: { value: string; label: string }[];
    selectedSort?: string;
    onSortChange?: (sort: string) => void;
    // Account filters
    accountStatusFilter?: "all" | "active" | "inactive";
    onAccountStatusFilterChange?: (status: "all" | "active" | "inactive") => void;
    accountSort?: string;
    onAccountSortChange?: (sort: string) => void;
    onPostStatusFilterChange?: (status: string) => void;
    postStatusFilter?: string;
    onPostDeadlineFilterChange?: (deadline: string) => void;
    postDeadlineFilter?: string;
    onAddPost?: () => void;
    onAddAccount?: () => void;
    accounts?: SocialAccount[];
    title?: string;
}

export default function SocialPageWrapper({
    breadcrumbItems,
    header,
    children,
    sidebar,
    backUrl,
    onBack,
    hideTabs = false,
    selectedPlatform,
    onPlatformChange,
    monthFilter,
    onMonthFilterChange,
    monthOptions,
    selectedSort,
    onSortChange,
    accountStatusFilter,
    onAccountStatusFilterChange,
    accountSort,
    onAccountSortChange,
    onPostStatusFilterChange,
    postStatusFilter,
    onPostDeadlineFilterChange,
    postDeadlineFilter,
    onAddPost,
    onAddAccount,
    accounts,
    title,
}: SocialPageWrapperProps) {
    useEffect(() => {
        if (typeof window !== "undefined") {
            document.documentElement.classList.remove('hide-mobile-nav');
        }
        return () => {
            if (typeof window !== "undefined") {
                document.documentElement.classList.remove('hide-mobile-nav');
            }
        };
    }, []);

    return (

        <>
            {/* MOBILE LAYOUT */}
            <div className="md:hidden min-h-screen bg-neutral-100">
                <SocialMobileHeader
                    backUrl={backUrl || "/dashboard"}
                    onBack={onBack}
                    hideTabs={hideTabs}
                    selectedPlatform={selectedPlatform}
                    onPlatformChange={onPlatformChange}
                    monthFilter={monthFilter}
                    onMonthFilterChange={onMonthFilterChange}
                    monthOptions={monthOptions}
                    selectedSort={selectedSort}
                    onSortChange={onSortChange}
                    accountStatusFilter={accountStatusFilter}
                    onAccountStatusFilterChange={onAccountStatusFilterChange}
                    accountSort={accountSort}
                    onAccountSortChange={onAccountSortChange}
                    onPostStatusFilterChange={onPostStatusFilterChange}
                    postStatusFilter={postStatusFilter}
                    onPostDeadlineFilterChange={onPostDeadlineFilterChange}
                    postDeadlineFilter={postDeadlineFilter}
                    onAddPost={onAddPost}
                    onAddAccount={onAddAccount}
                    accounts={accounts}
                    title={title}
                />


                <div className="pb-32 px-4 space-y-4">
                    {children}
                </div>
            </div>

            {/* DESKTOP LAYOUT */}
            <div className="hidden md:block bg-transparent p-0 transition-colors">
                <PageWrapper sidebar={sidebar} isTransparent>
                    <div className="space-y-8 w-full animate-in fade-in duration-500">
                        {/* Inline Tabs for iPad (Hidden on Desktop) */}
                        <div className="lg:hidden flex items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] -mx-4 px-4 mb-2">
                            {[
                                { id: "overview", label: "Overview", icon: LayoutDashboard },
                                { id: "accounts", label: "Accounts", icon: Users },
                                { id: "plan", label: "Planner", icon: CalendarDays },
                            ].map((tab) => {
                                const pathname = usePathname();
                                const searchParams = useSearchParams();
                                const currentSection = searchParams.get("section") || "overview";
                                const currentTab = searchParams.get("tab") || "account";
                                
                                // Logic to match mobile tabs to sections
                                const isActive = (tab.id === "overview" && currentSection === "overview") ||
                                               (tab.id === "accounts" && currentSection === "accounts") ||
                                               (tab.id === "plan" && currentSection === "overview" && currentTab === "plan");
                                
                                const Icon = tab.icon;
                                const href = tab.id === "plan" 
                                    ? `${pathname}?section=overview&tab=plan`
                                    : `${pathname}?section=${tab.id}`;

                                return (
                                    <Link
                                        key={tab.id}
                                        href={isActive ? "#" : href}
                                        className={clsx(
                                            "relative flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-colors flex-shrink-0",
                                            isActive
                                                ? "text-neutral-900 dark:text-white font-semibold"
                                                : "text-neutral-500 font-medium hover:text-neutral-700"
                                        )}
                                    >
                                        {isActive && (
                                            <motion.div
                                                layoutId="activeTabBadgeSocial"
                                                className="absolute inset-0 rounded-full bg-white dark:bg-neutral-800 shadow-sm border border-black/[0.04] dark:border-white/[0.04]"
                                                transition={{ type: "spring", stiffness: 500, damping: 35 }}
                                            />
                                        )}
                                        <div className="relative z-10 flex items-center gap-2">
                                            <Icon size={16} strokeWidth={isActive ? 2.5 : 2} className={isActive ? "text-neutral-900 dark:text-white" : "opacity-60"} />
                                            <span className="text-[13px]">{tab.label}</span>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                        {header}
                        {children}
                    </div>
                </PageWrapper>
            </div>
        </>
    );
}
