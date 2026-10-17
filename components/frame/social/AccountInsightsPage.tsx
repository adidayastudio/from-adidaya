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
        icon: <Heart className="w-4 h-4 text-pink-500" />,
        metrics: ["Likes", "Comments", "Saves", "Shares", "Reach", "Impressions"]
    },
    TIKTOK: {
        name: "TikTok",
        icon: <Play className="w-4 h-4 text-neutral-900" />,
        metrics: ["Views", "Likes", "Comments", "Shares", "Watch Time", "Profile Views"]
    },
    LINKEDIN: {
        name: "LinkedIn",
        icon: <Users className="w-4 h-4 text-blue-600" />,
        metrics: ["Impressions", "Clicks", "Reactions", "Comments", "Shares", "Followers"]
    },
    YOUTUBE: {
        name: "YouTube",
        icon: <Play className="w-4 h-4 text-red-600" />,
        metrics: ["Views", "Watch Hours", "Subscribers", "Likes", "Comments", "Shares"]
    },
    FACEBOOK: {
        name: "Facebook",
        icon: <Users className="w-4 h-4 text-blue-500" />,
        metrics: ["Reach", "Impressions", "Reactions", "Comments", "Shares", "Followers"]
    }
};

export default function AccountInsightsPage({ account, posts, onBack }: Props) {
    const insights = MOCK_INSIGHTS[account.platform];
    const platformMetrics = PLATFORM_METRICS[account.platform];
    const platformBadge = PLATFORM_BADGE[account.platform] || { code: account.platform, color: "bg-neutral-100" };
    const accountCode = account.name.slice(0, 3).toUpperCase();

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
        <div className="space-y-6 pb-20 lg:pb-0">
            {/* HEADER with Account Context */}
            <div className="flex items-center gap-4">
                <button
                    onClick={onBack}
                    className="hidden lg:flex p-2 rounded-lg bg-neutral-100 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-700 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                </button>

                <div className="flex-1 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-500 text-sm font-bold shrink-0">
                        {accountCode}
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-base md:text-lg font-bold text-neutral-900 truncate">{account.name}</h1>
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
            <div className="bg-orange-50/50 border border-orange-100 rounded-2xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <div className="text-[12px] text-orange-800 leading-relaxed">
                    <strong className="font-bold">Demo Mode:</strong> Currently showing local tracking data. Connect your {platformMetrics.name} account via official API to synchronize real-time followers, reach, and engagement data.
                </div>
            </div>

            {/* OVERVIEW STATS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <div className="bg-white rounded-2xl border border-neutral-100 p-4 md:p-5 shadow-sm">
                    <div className="flex items-center gap-2 text-neutral-400 mb-2">
                        <Users className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Followers</span>
                    </div>
                    <div className="text-xl md:text-2xl font-bold text-neutral-900">{formatNumber(insights.followers)}</div>
                    <div className="flex items-center gap-1 mt-1 text-green-600 text-[11px] font-medium">
                        <TrendingUp className="w-3 h-3" />
                        +2.4%
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-neutral-100 p-4 md:p-5 shadow-sm">
                    <div className="flex items-center gap-2 text-neutral-400 mb-2">
                        <Eye className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Reach</span>
                    </div>
                    <div className="text-xl md:text-2xl font-bold text-neutral-900">{formatNumber(insights.reach)}</div>
                    <div className="flex items-center gap-1 mt-1 text-green-600 text-[11px] font-medium">
                        <TrendingUp className="w-3 h-3" />
                        +12.8%
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-neutral-100 p-4 md:p-5 shadow-sm">
                    <div className="flex items-center gap-2 text-neutral-400 mb-2">
                        <Heart className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Engagement</span>
                    </div>
                    <div className="text-xl md:text-2xl font-bold text-neutral-900">{insights.engagement}%</div>
                    <div className="flex items-center gap-1 mt-1 text-red-500 text-[11px] font-medium">
                        <TrendingDown className="w-3 h-3" />
                        -0.3%
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-neutral-100 p-4 md:p-5 shadow-sm">
                    <div className="flex items-center gap-2 text-neutral-400 mb-2">
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Impressions</span>
                    </div>
                    <div className="text-xl md:text-2xl font-bold text-neutral-900">{formatNumber(insights.impressions)}</div>
                    <div className="flex items-center gap-1 mt-1 text-green-600 text-[11px] font-medium">
                        <TrendingUp className="w-3 h-3" />
                        +8.1%
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {/* QUOTA TREND */}
                <div className="bg-white rounded-2xl border border-neutral-100 p-5 shadow-sm">
                    <h3 className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-5">Monthly Quota Trend</h3>

                    {quotaByMonth.length > 0 ? (
                        <div className="space-y-4">
                            {quotaByMonth.map((month, idx) => (
                                <div key={idx} className="flex items-center gap-3">
                                    <span className="text-[12px] font-medium text-neutral-500 w-10">{month.month}</span>
                                    <div className="flex-1 h-2.5 bg-neutral-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all ${month.used > DEFAULT_QUOTA ? "bg-red-500" : "bg-orange-500"}`}
                                            style={{ width: `${month.percentage}%` }}
                                        />
                                    </div>
                                    <span className={`text-[12px] w-12 text-right font-medium ${month.used > DEFAULT_QUOTA ? "text-red-500" : "text-neutral-600"}`}>
                                        {month.used}/{DEFAULT_QUOTA}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-neutral-400 text-center py-6">No data available</p>
                    )}
                </div>

                {/* PLATFORM-SPECIFIC METRICS */}
                <div className="bg-white rounded-2xl border border-neutral-100 p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-5">
                        {platformMetrics.icon}
                        <h3 className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">
                            {platformMetrics.name} Metrics
                        </h3>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {platformMetrics.metrics.slice(0, 6).map((metric, idx) => (
                            <div key={idx} className="bg-neutral-50 rounded-xl p-3 border border-neutral-100/50">
                                <div className="text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest leading-none">{metric}</div>
                                <div className="text-lg font-bold text-neutral-900 mt-1.5 leading-none">
                                    {formatNumber(Math.floor(Math.random() * 10000) + 500)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* TOP PERFORMING CONTENT */}
            <div className="bg-white rounded-2xl border border-neutral-100 p-5 shadow-sm">
                <h3 className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-5">Top Performing Content</h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                    {posts
                        .filter(p => p.accountId === account.id && p.status === "PUBLISHED")
                        .slice(0, 3)
                        .map(post => (
                            <div key={post.id} className="bg-neutral-50/50 rounded-xl p-4 border border-neutral-100/80">
                                <h4 className="text-[14px] font-bold text-neutral-900 truncate">{post.title}</h4>
                                <div className="text-[11px] text-neutral-400 mt-1">
                                    {new Date(post.scheduledDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                </div>
                                <div className="flex items-center gap-4 mt-4 text-[12px] font-medium text-neutral-500">
                                    <span className="flex items-center gap-1.5"><Heart className="w-3.5 h-3.5 text-pink-400" /> {Math.floor(Math.random() * 500) + 50}</span>
                                    <span className="flex items-center gap-1.5"><MessageCircle className="w-3.5 h-3.5 text-blue-400" /> {Math.floor(Math.random() * 50) + 5}</span>
                                    <span className="flex items-center gap-1.5"><Share2 className="w-3.5 h-3.5 text-emerald-400" /> {Math.floor(Math.random() * 20) + 1}</span>
                                </div>
                            </div>
                        ))}

                    {posts.filter(p => p.accountId === account.id && p.status === "PUBLISHED").length === 0 && (
                        <div className="col-span-full py-8 text-center bg-neutral-50/50 rounded-2xl border border-dashed border-neutral-200">
                            <p className="text-[13px] text-neutral-400 font-medium">No published posts yet</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

