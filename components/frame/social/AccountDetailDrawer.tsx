"use client";

import React from "react";
import { X, ExternalLink } from "lucide-react";
import { SocialAccount, SocialPost } from "./types/social.types";
import { Button } from "@/shared/ui/primitives/button/button";

type Props = {
    account: SocialAccount;
    posts: SocialPost[];
    onClose: () => void;
    onEditAccount: (acc: SocialAccount) => void;
    onEditPost: (post: SocialPost) => void;
    onCreatePost: () => void;
};

const PLATFORM_STYLES: Record<string, { code: string; color: string; bg: string }> = {
    INSTAGRAM: { code: "IG", color: "text-pink-600", bg: "bg-pink-50" },
    TIKTOK: { code: "TT", color: "text-neutral-900", bg: "bg-neutral-100" },
    LINKEDIN: { code: "IN", color: "text-blue-700", bg: "bg-blue-50" },
    YOUTUBE: { code: "YT", color: "text-red-600", bg: "bg-red-50" },
    FACEBOOK: { code: "FB", color: "text-blue-600", bg: "bg-blue-50" }
};

export default function AccountDetailDrawer({ account, posts, onClose, onEditAccount, onEditPost, onCreatePost }: Props) {
    const style = PLATFORM_STYLES[account.platform] || { code: "??", color: "text-neutral-600", bg: "bg-neutral-50" };
    const accountPosts = posts.filter(p => p.accountId === account.id);

    const stats = {
        total: accountPosts.length,
        published: accountPosts.filter(p => p.status === "PUBLISHED").length,
        scheduled: accountPosts.filter(p => p.status === "SCHEDULED" || p.status === "APPROVED").length,
        inProgress: accountPosts.filter(p => ["WRITING", "DESIGNING", "IN_REVIEW"].includes(p.status)).length
    };

    return (
        <>
            <div className="fixed inset-0 bg-neutral-900/20 backdrop-blur-sm z-40" onClick={onClose} />

            <div className="fixed inset-y-0 right-0 w-[500px] bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">

                {/* HEADER */}
                <div className={`px-6 py-5 ${style.bg} border-b border-neutral-100`}>
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-xl ${style.bg} border border-neutral-200 flex items-center justify-center ${style.color} text-lg font-bold`}>
                                {style.code}
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-neutral-900">{account.name}</h2>
                                <p className="text-sm text-neutral-500">{account.handle}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="text-neutral-400 hover:text-neutral-900 transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* CONTENT */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* STATS */}
                    <div className="grid grid-cols-4 gap-3">
                        <div className="bg-neutral-50 rounded-lg p-3 text-center">
                            <div className="text-xl font-bold text-neutral-900">{stats.total}</div>
                            <div className="text-[10px] text-neutral-400 uppercase tracking-wider">Total</div>
                        </div>
                        <div className="bg-green-50 rounded-lg p-3 text-center">
                            <div className="text-xl font-bold text-green-700">{stats.published}</div>
                            <div className="text-[10px] text-green-600 uppercase tracking-wider">Published</div>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-3 text-center">
                            <div className="text-xl font-bold text-blue-700">{stats.scheduled}</div>
                            <div className="text-[10px] text-blue-600 uppercase tracking-wider">Scheduled</div>
                        </div>
                        <div className="bg-orange-50 rounded-lg p-3 text-center">
                            <div className="text-xl font-bold text-orange-700">{stats.inProgress}</div>
                            <div className="text-[10px] text-orange-600 uppercase tracking-wider">In Progress</div>
                        </div>
                    </div>

                    {/* ACTIONS */}
                    <div className="flex gap-2">
                        <Button variant="primary" size="sm" onClick={onCreatePost}>
                            Add Post
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => onEditAccount(account)}>
                            Edit Account
                        </Button>
                    </div>

                    {/* POSTS */}
                    <div className="space-y-2">
                        <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Recent Posts</h3>

                        {accountPosts.length === 0 ? (
                            <p className="text-sm text-neutral-400 py-4">No posts for this account yet.</p>
                        ) : (
                            <div className="space-y-2">
                                {accountPosts.slice(0, 10).map(post => (
                                    <div
                                        key={post.id}
                                        onClick={() => onEditPost(post)}
                                        className="bg-neutral-50 rounded-lg p-3 hover:bg-neutral-100 cursor-pointer transition-colors"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-medium text-neutral-900 truncate">{post.title}</h4>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[10px] text-neutral-400">
                                                        {new Date(post.scheduledDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                                    </span>
                                                    <span className="text-[10px] text-neutral-400">•</span>
                                                    <span className="text-[10px] text-neutral-500 uppercase">{post.contentType}</span>
                                                </div>
                                            </div>
                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${post.status === "PUBLISHED" ? "bg-green-100 text-green-700" :
                                                    post.status === "SCHEDULED" ? "bg-blue-100 text-blue-700" :
                                                        "bg-neutral-100 text-neutral-600"
                                                }`}>
                                                {post.status.replace(/_/g, " ")}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </>
    );
}
