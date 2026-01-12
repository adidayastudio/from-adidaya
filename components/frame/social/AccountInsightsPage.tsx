"use client";

import React, { useMemo } from "react";
import { ArrowLeft, TrendingUp, TrendingDown, Users, Eye, Heart, MessageCircle, Share2, Play, AlertCircle } from "lucide-react";
import { SocialAccount, SocialPost, Platform } from "./types/social.types";

type Props = {
    account: SocialAccount;
    posts: SocialPost[];
    onBack: () => void;
};

const DEFAULT_QUOTA = 24;

const PLATFORM_BADGE: Record<string, { code: string; color: string }> = {
    INSTAGRAM: { code: "Instagram", color: "text-pink-600 bg-pink-50" },
    TIKTOK: { code: "TikTok", color: "text-neutral-900 bg-neutral-100" },
    LINKEDIN: { code: "LinkedIn", color: "text-blue-700 bg-blue-50" },
    YOUTUBE: { code: "YouTube", color: "text-red-600 bg-red-50" },
    FACEBOOK: { code: "Facebook", color: "text-blue-600 bg-blue-50" }
};

// Mock insights - in production, fetch from platform APIs
const MOCK_INSIGHTS: Record<Platform, { followers: number; reach: number; engagement: number; impressions: number }> = {
    INSTAGRAM: { followers: 12500, reach: 45000, engagement: 4.2, impressions: 89000 },
    TIKTOK: { followers: 8900, reach: 125000, engagement: 8.5, impressions: 340000 },
    LINKEDIN: { followers: 3200, reach: 15000, engagement: 2.8, impressions: 28000 },
    YOUTUBE: { followers: 5600, reach: 78000, engagement: 3.4, impressions: 156000 },
    FACEBOOK: { followers: 4100, reach: 22000, engagement: 1.9, impressions: 45000 }
};

const PLATFORM_METRICS: Record<Platform, { name: string; icon: React.ReactNode; metrics: string[] }> = {
    INSTAGRAM: {
        name: "Instagram",
        icon: <Heart className="w-4 h-4" />,
        metrics: ["Likes", "Comments", "Saves", "Shares", "Reach", "Impressions", "Profile Visits"]
    },
    TIKTOK: {
        name: "TikTok",
        icon: <Play className="w-4 h-4" />,
        metrics: ["Views", "Likes", "Comments", "Shares", "Watch Time", "Profile Views", "Followers Gained"]
    },
    LINKEDIN: {
        name: "LinkedIn",
        icon: <Users className="w-4 h-4" />,
        metrics: ["Impressions", "Clicks", "Reactions", "Comments", "Shares", "Engagement Rate", "Followers"]
    },
    YOUTUBE: {
        name: "YouTube",
        icon: <Play className="w-4 h-4" />,
        metrics: ["Views", "Watch Hours", "Subscribers", "Likes", "Comments", "Shares", "CTR"]
    },
    FACEBOOK: {
        name: "Facebook",
        icon: <Users className="w-4 h-4" />,
        metrics: ["Reach", "Impressions", "Reactions", "Comments", "Shares", "Page Views", "Followers"]
    }
};

export default function AccountInsightsPage({ account, posts, onBack }: Props) {
    const insights = MOCK_INSIGHTS[account.platform];
    const platformMetrics = PLATFORM_METRICS[account.platform];
    const platformBadge = PLATFORM_BADGE[account.platform] || { code: account.platform, color: "bg-neutral-100" };
    const accountCode = account.name.slice(0, 3).toUpperCase();

    // Calculate quota usage by month
    const quotaByMonth = useMemo(() => {
        const accountPosts = posts.filter(p => p.accountId === account.id);
        const grouped: Record<string, number> = {};

        accountPosts.forEach(post => {
            if (post.status === "PUBLISHED") {
                const date = new Date(post.scheduledDate);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                grouped[monthKey] = (grouped[monthKey] || 0) + 1;
            }
        });

        return Object.entries(grouped)
            .sort(([a], [b]) => b.localeCompare(a))
            .slice(0, 6)
            .map(([key, count]) => ({
                month: new Date(key + "-01").toLocaleDateString("en-US", { month: "short" }),
                used: count,
                percentage: Math.min((count / DEFAULT_QUOTA) * 100, 100)
            }));
    }, [posts, account.id]);

    const formatNumber = (num: number) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
        if (num >= 1000) return (num / 1000).toFixed(1) + "K";
        return num.toString();
    };

    return (
        <div className="space-y-6">
            {/* HEADER with Account Context */}
            <div className="flex items-center gap-4">
                <button
                    onClick={onBack}
                    className="p-2 rounded-lg bg-neutral-100 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-700 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                </button>

                <div className="flex-1 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-500 text-sm font-bold">
                        {accountCode}
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-neutral-900">{account.name}</h1>
                        <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${platformBadge.color}`}>
                                {platformBadge.code}
                            </span>
                            <span className="text-xs text-neutral-400">Insights</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* DATA SOURCE NOTICE */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800">
                    <strong>Demo Data:</strong> Currently showing mock insights. Connect your {platformMetrics.name} account via API to see real analytics data (followers, reach, engagement from the platform).
                </div>
            </div>

            {/* OVERVIEW STATS */}
            <div className="grid grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-neutral-100 p-5">
                    <div className="flex items-center gap-2 text-neutral-400 mb-2">
                        <Users className="w-4 h-4" />
                        <span className="text-xs uppercase tracking-wider">Followers</span>
                    </div>
                    <div className="text-2xl font-bold text-neutral-900">{formatNumber(insights.followers)}</div>
                    <div className="flex items-center gap-1 mt-1 text-green-600 text-xs">
                        <TrendingUp className="w-3 h-3" />
                        +2.4% this month
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-neutral-100 p-5">
                    <div className="flex items-center gap-2 text-neutral-400 mb-2">
                        <Eye className="w-4 h-4" />
                        <span className="text-xs uppercase tracking-wider">Reach</span>
                    </div>
                    <div className="text-2xl font-bold text-neutral-900">{formatNumber(insights.reach)}</div>
                    <div className="flex items-center gap-1 mt-1 text-green-600 text-xs">
                        <TrendingUp className="w-3 h-3" />
                        +12.8% this month
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-neutral-100 p-5">
                    <div className="flex items-center gap-2 text-neutral-400 mb-2">
                        <Heart className="w-4 h-4" />
                        <span className="text-xs uppercase tracking-wider">Engagement</span>
                    </div>
                    <div className="text-2xl font-bold text-neutral-900">{insights.engagement}%</div>
                    <div className="flex items-center gap-1 mt-1 text-red-500 text-xs">
                        <TrendingDown className="w-3 h-3" />
                        -0.3% this month
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-neutral-100 p-5">
                    <div className="flex items-center gap-2 text-neutral-400 mb-2">
                        <MessageCircle className="w-4 h-4" />
                        <span className="text-xs uppercase tracking-wider">Impressions</span>
                    </div>
                    <div className="text-2xl font-bold text-neutral-900">{formatNumber(insights.impressions)}</div>
                    <div className="flex items-center gap-1 mt-1 text-green-600 text-xs">
                        <TrendingUp className="w-3 h-3" />
                        +8.1% this month
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
                {/* QUOTA TREND */}
                <div className="bg-white rounded-xl border border-neutral-100 p-5">
                    <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-4">Monthly Quota Trend</h3>

                    {quotaByMonth.length > 0 ? (
                        <div className="space-y-3">
                            {quotaByMonth.map((month, idx) => (
                                <div key={idx} className="flex items-center gap-3">
                                    <span className="text-xs text-neutral-500 w-10">{month.month}</span>
                                    <div className="flex-1 h-3 bg-neutral-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all ${month.used > DEFAULT_QUOTA ? "bg-red-500" : "bg-green-500"}`}
                                            style={{ width: `${month.percentage}%` }}
                                        />
                                    </div>
                                    <span className={`text-xs w-12 text-right ${month.used > DEFAULT_QUOTA ? "text-red-600 font-bold" : "text-neutral-500"}`}>
                                        {month.used}/{DEFAULT_QUOTA}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-neutral-400 text-center py-4">No published posts yet</p>
                    )}
                </div>

                {/* PLATFORM-SPECIFIC METRICS */}
                <div className="bg-white rounded-xl border border-neutral-100 p-5">
                    <div className="flex items-center gap-2 mb-4">
                        {platformMetrics.icon}
                        <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                            {platformMetrics.name} Metrics
                        </h3>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {platformMetrics.metrics.slice(0, 6).map((metric, idx) => (
                            <div key={idx} className="bg-neutral-50 rounded-lg p-3">
                                <div className="text-[10px] text-neutral-400 uppercase tracking-wider">{metric}</div>
                                <div className="text-lg font-bold text-neutral-900 mt-1">
                                    {formatNumber(Math.floor(Math.random() * 10000) + 500)}
                                </div>
                            </div>
                        ))}
                    </div>

                    <p className="text-[10px] text-neutral-400 mt-4 text-center">
                        Connect API to see real {platformMetrics.name} data
                    </p>
                </div>
            </div>

            {/* TOP PERFORMING CONTENT */}
            <div className="bg-white rounded-xl border border-neutral-100 p-5">
                <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-4">Top Performing Content</h3>

                <div className="grid grid-cols-3 gap-4">
                    {posts
                        .filter(p => p.accountId === account.id && p.status === "PUBLISHED")
                        .slice(0, 3)
                        .map(post => (
                            <div key={post.id} className="bg-neutral-50 rounded-lg p-4">
                                <h4 className="text-sm font-medium text-neutral-900 truncate">{post.title}</h4>
                                <div className="text-[10px] text-neutral-400 mt-1">
                                    {new Date(post.scheduledDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                </div>
                                <div className="flex items-center gap-3 mt-3 text-xs text-neutral-500">
                                    <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {Math.floor(Math.random() * 500) + 50}</span>
                                    <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" /> {Math.floor(Math.random() * 50) + 5}</span>
                                    <span className="flex items-center gap-1"><Share2 className="w-3 h-3" /> {Math.floor(Math.random() * 20) + 1}</span>
                                </div>
                            </div>
                        ))}
                </div>

                {posts.filter(p => p.accountId === account.id && p.status === "PUBLISHED").length === 0 && (
                    <p className="text-sm text-neutral-400 text-center py-4">No published posts yet</p>
                )}
            </div>
        </div>
    );
}
