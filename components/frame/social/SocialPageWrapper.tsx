"use client";

import React, { useEffect } from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import SocialMobileHeader from "@/components/frame/social/SocialMobileHeader";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { Platform, SocialAccount } from "./types/social.types";

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
            <div className="lg:hidden min-h-screen bg-neutral-100">
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
            <div className="hidden lg:block min-h-screen bg-neutral-50 p-6">
                <Breadcrumb items={breadcrumbItems} />
                <PageWrapper sidebar={sidebar}>
                    <div className="space-y-8 w-full animate-in fade-in duration-500">
                        {header}
                        {children}
                    </div>
                </PageWrapper>
            </div>
        </>
    );
}
