"use client";

import React, { useMemo, useState } from "react";
import { ArrowLeft, ExternalLink, Camera, List, LayoutGrid, Calendar } from "lucide-react";
import clsx from "clsx";
import { SocialAccount, SocialPost, PostStatus } from "./types/social.types";
import { Button } from "@/shared/ui/primitives/button/button";
import { ViewToggle } from "@/shared/ui/layout/ViewToggle";
import { Select } from "@/shared/ui/primitives/select/select";

import SocialListView from "./SocialListView";
import SocialBoardView from "./SocialBoardView";
import SocialPlannerView from "./SocialPlannerView";

type Props = {
    account: SocialAccount;
    allAccounts: SocialAccount[];
    posts: SocialPost[];
    onBack: () => void;
    onEditAccount: () => void;
    onEditPost: (post: SocialPost) => void;
    onCreatePost: (status?: PostStatus) => void;
    onNavigateMonth: (dir: -1 | 1) => void;
    currentDate: Date;
    onUploadPhoto?: () => void;
};

type ViewType = "LIST" | "BOARD" | "CALENDAR";
type FilterType = "all" | "backlog" | "inProgress" | "scheduled" | "published";

const PLATFORM_BADGE: Record<string, { code: string; color: string }> = {
    INSTAGRAM: { code: "Instagram", color: "text-pink-600 bg-pink-50" },
    TIKTOK: { code: "TikTok", color: "text-neutral-900 bg-neutral-100" },
    LINKEDIN: { code: "LinkedIn", color: "text-blue-700 bg-blue-50" },
    YOUTUBE: { code: "YouTube", color: "text-red-600 bg-red-50" },
    FACEBOOK: { code: "Facebook", color: "text-blue-600 bg-blue-50" }
};

const DEFAULT_QUOTA = 24;

export default function AccountDetailPage({
    account,
    allAccounts,
    posts,
    onBack,
    onEditAccount,
    onEditPost,
    onCreatePost,
    onNavigateMonth,
    currentDate,
    onUploadPhoto
}: Props) {
    // Calculate currentMonthKey first for state initialization  
    const currentMonthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

    const [view, setView] = useState<ViewType>("LIST");
    const [filter, setFilter] = useState<FilterType>("all");
    const [monthFilter, setMonthFilter] = useState<string>(currentMonthKey);

    const platformBadge = PLATFORM_BADGE[account.platform] || { code: account.platform, color: "bg-neutral-100" };
    const code = account.name.slice(0, 3).toUpperCase();

    const accountPosts = useMemo(() => {
        return posts.filter(p => p.accountId === account.id);
    }, [posts, account.id]);

    // STATS - Status groupings:
    // Backlog: NOT_STARTED, TODO
    // In Progress: WRITING, DESIGNING, IN_REVIEW, NEED_APPROVAL
    // Scheduled: APPROVED, SCHEDULED
    // Published: PUBLISHED
    // Archived: counts in total only
    const stats = useMemo(() => ({
        total: accountPosts.length,
        backlog: accountPosts.filter(p => ["NOT_STARTED", "TODO"].includes(p.status)).length,
        inProgress: accountPosts.filter(p => ["WRITING", "DESIGNING", "IN_REVIEW", "NEED_APPROVAL"].includes(p.status)).length,
        scheduled: accountPosts.filter(p => ["APPROVED", "SCHEDULED"].includes(p.status)).length,
        published: accountPosts.filter(p => p.status === "PUBLISHED").length
    }), [accountPosts]);

    // Current month quota - only PUBLISHED posts count
    const currentMonthUsed = useMemo(() => {
        return accountPosts.filter(p =>
            p.scheduledDate.startsWith(currentMonthKey) && p.status === "PUBLISHED"
        ).length;
    }, [accountPosts, currentMonthKey]);

    // Get available months from posts
    const availableMonths = useMemo(() => {
        const months = new Set<string>();
        accountPosts.forEach(p => {
            const monthKey = p.scheduledDate.slice(0, 7);
            months.add(monthKey);
        });
        return Array.from(months).sort().reverse();
    }, [accountPosts]);

    const monthOptions = useMemo(() => {
        const options = [{ value: "all", label: "All Months" }];
        availableMonths.forEach(m => {
            const date = new Date(m + "-01");
            const label = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
            const isThisMonth = m === currentMonthKey;
            options.push({ value: m, label: isThisMonth ? `${label} (This Month)` : label });
        });
        return options;
    }, [availableMonths, currentMonthKey]);

    // Apply status filter
    const statusFilteredPosts = useMemo(() => {
        switch (filter) {
            case "backlog":
                return accountPosts.filter(p => ["NOT_STARTED", "TODO"].includes(p.status));
            case "inProgress":
                return accountPosts.filter(p => ["WRITING", "DESIGNING", "IN_REVIEW", "NEED_APPROVAL"].includes(p.status));
            case "scheduled":
                return accountPosts.filter(p => ["APPROVED", "SCHEDULED"].includes(p.status));
            case "published":
                return accountPosts.filter(p => p.status === "PUBLISHED");
            default:
                return accountPosts;
        }
    }, [accountPosts, filter]);

    // Apply month filter
    const filteredPosts = useMemo(() => {
        if (monthFilter === "all") return statusFilteredPosts;
        return statusFilteredPosts.filter(p => p.scheduledDate.startsWith(monthFilter));
    }, [statusFilteredPosts, monthFilter]);

    const StatCard = ({ label, value, filterKey, color }: { label: string; value: number; filterKey: FilterType; color: string }) => (
        <button
            onClick={() => setFilter(filter === filterKey ? "all" : filterKey)}
            className={`rounded-xl p-4 text-left transition-all border ${filter === filterKey
                ? "ring-2 ring-red-500 border-transparent"
                : "border-neutral-100 hover:border-neutral-200"
                } ${color}`}
        >
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-[10px] uppercase tracking-wider mt-1 opacity-70">{label}</div>
        </button>
    );

    return (
        <div className="space-y-6">
            {/* HEADER */}
            <div className="flex items-start gap-4">
                <button
                    onClick={onBack}
                    className="p-2 rounded-lg bg-neutral-100 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-700 transition-colors mt-1"
                >
                    <ArrowLeft className="w-4 h-4" />
                </button>

                <div className="flex-1 flex items-start gap-4">
                    {/* PROFILE PHOTO */}
                    <div className="relative">
                        <div className="w-16 h-16 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-500 text-lg font-bold">
                            {code}
                        </div>
                        <button
                            onClick={onUploadPhoto || onEditAccount}
                            className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-white border border-neutral-200 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-50 transition-colors"
                            title="Edit photo"
                        >
                            <Camera className="w-3 h-3" />
                        </button>
                    </div>

                    <div className="flex-1">
                        <h1 className="text-xl font-bold text-neutral-900">{account.name}</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${platformBadge.color}`}>
                                {platformBadge.code}
                            </span>
                            <a
                                href={`https://${account.platform.toLowerCase()}.com/${account.handle.replace('@', '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-neutral-500 hover:underline flex items-center gap-1"
                            >
                                {account.handle}
                                <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>
                    </div>
                </div>

                {/* QUOTA INDICATOR (current month only) */}
                <div className="text-right mr-4">
                    <div className="text-xs text-neutral-400">This Month</div>
                    <div className="text-lg font-bold">
                        <span className={currentMonthUsed >= DEFAULT_QUOTA ? "text-red-600" : "text-neutral-900"}>
                            {currentMonthUsed}
                        </span>
                        <span className="text-neutral-400">/{DEFAULT_QUOTA}</span>
                    </div>
                    <div className="text-[10px] text-neutral-400">quota used</div>
                </div>

                <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={onEditAccount}>Edit</Button>
                    <Button variant="primary" size="sm" onClick={() => onCreatePost()}>Add Post</Button>
                </div>
            </div>

            {/* STATS (clickable to filter) */}
            <div className="grid grid-cols-5 gap-3">
                <StatCard label="Total" value={stats.total} filterKey="all" color="bg-neutral-50 text-neutral-900" />
                <StatCard label="Backlog" value={stats.backlog} filterKey="backlog" color="bg-neutral-50 text-neutral-600" />
                <StatCard label="In Progress" value={stats.inProgress} filterKey="inProgress" color="bg-orange-50 text-orange-700" />
                <StatCard label="Scheduled" value={stats.scheduled} filterKey="scheduled" color="bg-blue-50 text-blue-700" />
                <StatCard label="Published" value={stats.published} filterKey="published" color="bg-green-50 text-green-700" />
            </div>

            {/* FILTER INDICATOR */}
            {filter !== "all" && (
                <div className="flex items-center gap-2 text-sm">
                    <span className="text-neutral-500">Showing:</span>
                    <span className="font-medium text-neutral-900 capitalize">{filter.replace("inProgress", "In Progress")}</span>
                    <button onClick={() => setFilter("all")} className="text-xs text-red-600 hover:underline ml-2">
                        Clear filter
                    </button>
                </div>
            )}

            {/* TABS */}
            {/* VIEW TOGGLES & FILTERS */}
            <div className="flex items-center justify-between">
                {/* Filters on Left */}
                <div className="flex items-center gap-2">
                    <Select
                        value={monthFilter}
                        options={monthOptions}
                        onChange={setMonthFilter}
                        selectSize="sm"
                        className="w-36 text-xs"
                    />
                </div>

                {/* View Toggles on Right */}
                <ViewToggle<ViewType>
                    value={view}
                    onChange={setView}
                    options={[
                        { value: "LIST", label: "List View", icon: <List className="w-4 h-4" /> },
                        { value: "BOARD", label: "Board View", icon: <LayoutGrid className="w-4 h-4" /> },
                        { value: "CALENDAR", label: "Calendar View", icon: <Calendar className="w-4 h-4" /> },
                    ]}
                />
            </div>

            {/* CONTENT VIEW */}
            <div className="min-h-[400px]">
                {view === "LIST" && (
                    <SocialListView
                        posts={filteredPosts}
                        accounts={allAccounts}
                        onEditPost={onEditPost}
                        hideAccountColumn={true}
                    />
                )}

                {view === "BOARD" && (
                    <SocialBoardView
                        posts={filteredPosts}
                        accounts={allAccounts}
                        onEditPost={onEditPost}
                        onCreatePost={onCreatePost}
                    />
                )}

                {view === "CALENDAR" && (
                    <SocialPlannerView
                        posts={filteredPosts}
                        accounts={allAccounts}
                        currentDate={currentDate}
                        onNavigateMonth={onNavigateMonth}
                        onCreatePost={(date) => onCreatePost()}
                        onEditPost={onEditPost}
                    />
                )}
            </div>
        </div>
    );
}
