"use client";

import React, { useMemo, useState } from "react";
import { ArrowLeft, ExternalLink, Camera, List, LayoutGrid, Calendar, Plus, BarChart3, Settings } from "lucide-react";
import clsx from "clsx";
import { SocialAccount, SocialPost, PostStatus } from "./types/social.types";
import { Button } from "@/shared/ui/primitives/button/button";
import { ViewToggle } from "@/shared/ui/layout/ViewToggle";

import SocialListView from "./SocialListView";
import SocialBoardView from "./SocialBoardView";
import SocialPlannerView from "./SocialPlannerView";
import SocialPostCard from "./SocialPostCard";
import AccountInsightsPage from "./AccountInsightsPage";
import AccountSettingsPage from "./AccountSettingsPage";

type SubTab = "PLAN" | "CALENDAR" | "INSIGHTS" | "SETUP";

type Props = {
    account: SocialAccount;
    allAccounts: SocialAccount[];
    posts: SocialPost[];
    onBack: () => void;
    onEditAccount: () => void;
    onViewInsights?: () => void;
    onViewSettings?: () => void;
    onEditPost: (post: SocialPost) => void;
    onCreatePost: (status?: PostStatus) => void;
    onNavigateMonth: (dir: -1 | 1) => void;
    currentDate: Date;
    onUploadPhoto?: () => void;
    postStatusFilter?: string;
    onPostStatusFilterChange?: (status: string) => void;
    postDeadlineFilter?: string;
    onPostDeadlineFilterChange?: (deadline: string) => void;
    selectedSort?: string;
    onSortChange?: (sort: string) => void;
    onSaveAccount?: (data: Partial<SocialAccount>) => void;
    onDeleteAccount?: (id: string) => void;
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

export default function AccountDetailPage({
    account,
    allAccounts,
    posts,
    onBack,
    onEditAccount,
    onViewInsights,
    onViewSettings,
    onEditPost,
    onCreatePost,
    onNavigateMonth,
    currentDate,
    postStatusFilter = "ALL",
    onPostStatusFilterChange,
    postDeadlineFilter = "ALL",
    onPostDeadlineFilterChange,
    selectedSort = "date-desc",
    onSortChange,
    onSaveAccount,
    onDeleteAccount,
}: Props) {
    const currentMonthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

    const [view, setView] = useState<ViewType>("LIST");
    const [activeSubTab, setActiveSubTab] = useState<SubTab>("PLAN");
    const [filter, setFilter] = useState<FilterType>("all");
    const [monthFilter, setMonthFilter] = useState<string>(currentMonthKey);


    const platformBadge = PLATFORM_BADGE[account.platform] || { code: account.platform, color: "bg-neutral-100" };
    const accountCode = account.code || account.name.slice(0, 3).toUpperCase();

    const accountPosts = useMemo(() => {
        return posts.filter(p => p.accountId === account.id);
    }, [posts, account.id]);

    const stats = useMemo(() => ({
        total: accountPosts.length,
        backlog: accountPosts.filter(p => ["NOT_STARTED", "TODO"].includes(p.status)).length,
        inProgress: accountPosts.filter(p => ["WRITING", "DESIGNING", "IN_REVIEW", "NEED_APPROVAL", "NEED_REVISION"].includes(p.status)).length,
        scheduled: accountPosts.filter(p => ["APPROVED", "SCHEDULED"].includes(p.status)).length,
        published: accountPosts.filter(p => p.status === "PUBLISHED").length
    }), [accountPosts]);

    const filteredPosts = useMemo(() => {
        let base = accountPosts;

        // Apply Status Filter
        const activeFilter = postStatusFilter !== "ALL" ? postStatusFilter : filter;

        if (activeFilter !== "all" && activeFilter !== "ALL") {
            switch (activeFilter) {
                case "backlog":
                case "TODO":
                    base = base.filter(p => ["NOT_STARTED", "TODO"].includes(p.status));
                    break;
                case "inProgress":
                case "WRITING":
                    base = base.filter(p => ["WRITING", "DESIGNING", "IN_REVIEW", "NEED_APPROVAL", "NEED_REVISION"].includes(p.status));
                    break;
                case "scheduled":
                case "APPROVED":
                    base = base.filter(p => ["APPROVED", "SCHEDULED"].includes(p.status));
                    break;
                case "published":
                case "PUBLISHED":
                    base = base.filter(p => p.status === "PUBLISHED");
                    break;
            }
        }

        // Apply Month Filter
        if (monthFilter !== "all" && postDeadlineFilter === "ALL") {
            base = base.filter(p => p.scheduledDate.startsWith(monthFilter));
        }

        // Apply Deadline Filter
        if (postDeadlineFilter !== "ALL") {
            const todayStr = new Date().toISOString().split('T')[0];
            switch (postDeadlineFilter) {
                case "OVERDUE":
                    base = base.filter(p => p.scheduledDate < todayStr && !["PUBLISHED", "ARCHIVED"].includes(p.status));
                    break;
                case "TODAY":
                    base = base.filter(p => p.scheduledDate === todayStr);
                    break;
                // Simplified for now, can be expanded to THIS_WEEK/THIS_MONTH if needed
            }
        }

        return base;
    }, [accountPosts, filter, postStatusFilter, monthFilter, postDeadlineFilter]);

    const sortedPosts = useMemo(() => {
        const sorted = [...filteredPosts];
        if (selectedSort === "date-desc") sorted.sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate));
        else if (selectedSort === "date-asc") sorted.sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
        else if (selectedSort === "name-asc") sorted.sort((a, b) => a.title.localeCompare(b.title));
        else if (selectedSort === "name-desc") sorted.sort((a, b) => b.title.localeCompare(a.title));
        return sorted;
    }, [filteredPosts, selectedSort]);

    const StatCard = ({ label, value, filterKey, color }: { label: string; value: number; filterKey: FilterType; color: string }) => (
        <button
            onClick={() => setFilter(filter === filterKey ? "all" : filterKey)}
            className={clsx(
                "rounded-xl p-3 md:p-4 text-left transition-all border",
                filter === filterKey ? "ring-2 ring-orange-500 border-transparent" : "border-neutral-100/80 hover:border-neutral-200",
                color
            )}
        >
            <div className="text-xl md:text-2xl font-bold">{value}</div>
            <div className="text-[9px] md:text-[10px] uppercase tracking-wider mt-1 opacity-70">{label}</div>
        </button>
    );

    return (
        <div className="space-y-6 pb-20 lg:pb-0 pt-28 lg:pt-0">
            {/* Mobile Header Identifier */}
            <div className="lg:hidden animate-in fade-in slide-in-from-top-4 duration-500 mb-6 px-1">
                <div className="pt-2">
                    <h1 className="text-[28px] font-extrabold text-neutral-900 leading-tight tracking-tight">{account.name}</h1>
                    <div className="flex items-center gap-2 mt-2 font-bold">
                        <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full ${platformBadge.color}`}>
                            {platformBadge.code}
                        </span>
                        <span className="text-neutral-300">•</span>
                        <a
                            href={`https://${account.platform.toLowerCase()}.com/${account.handle.replace('@', '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[12px] text-neutral-400 hover:text-orange-500 transition-colors flex items-center gap-1.5"
                        >
                            {account.handle}
                            <ExternalLink className="w-3 h-3 opacity-40" />
                        </a>
                    </div>
                </div>
            </div>

            {/* Sub-Tab Navigation */}
            <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 bg-transparent w-fit overflow-x-auto no-scrollbar">
                        {[
                            { id: "PLAN", label: "Plan", icon: <List className="w-3.5 h-3.5" /> },
                            { id: "CALENDAR", label: "Calendar", icon: <Calendar className="w-3.5 h-3.5" /> },
                            { id: "INSIGHTS", label: "Insights", icon: <BarChart3 className="w-3.5 h-3.5" /> },
                            { id: "SETUP", label: "Setup", icon: <Settings className="w-3.5 h-3.5" /> },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveSubTab(tab.id as SubTab)}
                                className={clsx(
                                    "flex items-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-bold transition-all whitespace-nowrap",
                                    activeSubTab === tab.id ? "bg-white text-gray-900 shadow-sm border border-black/[0.03]" : "text-gray-400 hover:text-gray-600"
                                )}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </div>
                    <div className="hidden md:flex gap-2">
                        <Button variant="primary" size="sm" onClick={() => onCreatePost()} className="rounded-full px-6 shadow-lg shadow-orange-500/20">+ Create Post</Button>
                    </div>
                </div>
            </div>

            {/* TAB CONTENT */}
            <div className="min-h-[400px]">
                {activeSubTab === "PLAN" && (
                    <div className="space-y-6">
                        {/* Desktop Stats */}
                        <div className="hidden lg:grid grid-cols-2 md:grid-cols-5 gap-2.5 md:gap-4">
                            <StatCard label="Total" value={stats.total} filterKey="all" color="bg-neutral-50 text-neutral-900" />
                            <StatCard label="Backlog" value={stats.backlog} filterKey="backlog" color="bg-neutral-50 text-neutral-600" />
                            <StatCard label="Progress" value={stats.inProgress} filterKey="inProgress" color="bg-orange-50 text-orange-700" />
                            <StatCard label="Scheduled" value={stats.scheduled} filterKey="scheduled" color="bg-blue-50 text-blue-700" />
                            <StatCard label="Published" value={stats.published} filterKey="published" color="bg-emerald-50 text-emerald-700" />
                        </div>

                        {/* View Options */}
                        <div className="hidden sm:flex items-center justify-end">
                            <ViewToggle<ViewType>
                                value={view}
                                onChange={setView}
                                className="bg-neutral-100 p-1"
                                options={[
                                    { value: "LIST", label: "List", icon: <List className="w-4 h-4" /> },
                                    { value: "BOARD", label: "Board", icon: <LayoutGrid className="w-4 h-4" /> },
                                    { value: "CALENDAR", label: "Plan", icon: <Calendar className="w-4 h-4" /> },
                                ]}
                            />
                        </div>

                        {/* Mobile List Rendering */}
                        <div className="lg:hidden space-y-3">
                            {sortedPosts.length > 0 ? (
                                sortedPosts.map(post => (
                                    <SocialPostCard key={post.id} post={post} account={account} onClick={() => onEditPost(post)} />
                                ))
                            ) : (
                                <div className="py-20 flex flex-col items-center justify-center text-center px-6">
                                    <h3 className="text-lg font-bold text-neutral-900">No posts found</h3>
                                    <p className="text-neutral-400 text-sm">Try adjusting your filters.</p>
                                </div>
                            )}
                        </div>

                        {/* Desktop View Rendering */}
                        <div className="hidden lg:block">
                            {view === "LIST" && <SocialListView posts={sortedPosts} accounts={allAccounts} onEditPost={onEditPost} hideAccountColumn={true} />}
                            {view === "BOARD" && <SocialBoardView posts={sortedPosts} accounts={allAccounts} onEditPost={onEditPost} onCreatePost={(status) => onCreatePost(status)} />}
                            {view === "CALENDAR" && (
                                <SocialPlannerView
                                    posts={sortedPosts}
                                    accounts={allAccounts}
                                    currentDate={currentDate}
                                    onNavigateMonth={onNavigateMonth}
                                    onCreatePost={() => onCreatePost()}
                                    onEditPost={onEditPost}
                                />
                            )}
                        </div>
                    </div>
                )}

                {activeSubTab === "CALENDAR" && (
                    <SocialPlannerView
                        posts={sortedPosts}
                        accounts={allAccounts}
                        currentDate={currentDate}
                        onNavigateMonth={onNavigateMonth}
                        onCreatePost={() => onCreatePost()}
                        onEditPost={onEditPost}
                    />
                )}

                {activeSubTab === "INSIGHTS" && (
                    <AccountInsightsPage account={account} posts={posts} onBack={() => setActiveSubTab("PLAN")} />
                )}

                {activeSubTab === "SETUP" && (
                    <AccountSettingsPage
                        account={account}
                        onSave={(data) => {
                            onSaveAccount?.(data);
                        }}
                        onBack={() => setActiveSubTab("PLAN")}
                        onDelete={() => onDeleteAccount?.(account.id)}
                    />
                )}
            </div>
        </div>
    );
}
