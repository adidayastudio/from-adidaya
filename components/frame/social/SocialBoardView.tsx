import React, { useState, useMemo } from "react";
import { SocialPost, PostStatus, SocialAccount } from "./types/social.types";
import { Plus, ChevronUp, ChevronDown } from "lucide-react";

type Props = {
    posts: SocialPost[];
    accounts: SocialAccount[];
    onEditPost: (post: SocialPost) => void;
    onCreatePost: (status: PostStatus) => void;
};

type SortKey = "date" | "status";
type SortDir = "asc" | "desc";

// Status columns matching Account Detail groupings
const COLUMNS: { id: PostStatus[]; label: string; color: string; headerBg: string }[] = [
    { id: ["NOT_STARTED", "TODO"], label: "Backlog", color: "bg-neutral-50", headerBg: "bg-neutral-200" },
    { id: ["WRITING", "DESIGNING", "IN_REVIEW", "NEED_APPROVAL"], label: "In Progress", color: "bg-orange-50", headerBg: "bg-orange-200" },
    { id: ["APPROVED", "SCHEDULED"], label: "Scheduled", color: "bg-blue-50", headerBg: "bg-blue-200" },
    { id: ["PUBLISHED"], label: "Published", color: "bg-green-50", headerBg: "bg-green-200" },
];

const PLATFORM_COLORS: Record<string, string> = {
    INSTAGRAM: "bg-pink-500",
    TIKTOK: "bg-neutral-800",
    LINKEDIN: "bg-blue-600",
    YOUTUBE: "bg-red-500",
    FACEBOOK: "bg-blue-500"
};

// Status chip styling
const STATUS_CHIP: Record<PostStatus, { label: string; color: string }> = {
    NOT_STARTED: { label: "Not Started", color: "bg-neutral-100 text-neutral-600" },
    TODO: { label: "To-Do", color: "bg-neutral-200 text-neutral-700" },
    WRITING: { label: "Writing", color: "bg-orange-100 text-orange-700" },
    DESIGNING: { label: "Designing", color: "bg-purple-100 text-purple-700" },
    IN_REVIEW: { label: "In Review", color: "bg-yellow-100 text-yellow-700" },
    NEED_APPROVAL: { label: "Need Approval", color: "bg-red-100 text-red-700" },
    APPROVED: { label: "Approved", color: "bg-blue-100 text-blue-700" },
    SCHEDULED: { label: "Scheduled", color: "bg-indigo-100 text-indigo-700" },
    PUBLISHED: { label: "Published", color: "bg-green-100 text-green-700" },
    NEED_REVISION: { label: "Need Revision", color: "bg-red-100 text-red-700" },
    ARCHIVED: { label: "Archived", color: "bg-neutral-200 text-neutral-500" },
};

// Status order for sorting
const STATUS_ORDER: Record<PostStatus, number> = {
    NOT_STARTED: 0, TODO: 1, WRITING: 2, DESIGNING: 3, IN_REVIEW: 4,
    NEED_APPROVAL: 5, NEED_REVISION: 5, APPROVED: 6, SCHEDULED: 7, PUBLISHED: 8, ARCHIVED: 9
};

export default function SocialBoardView({ posts, accounts, onEditPost, onCreatePost }: Props) {
    const getAccount = (id: string) => accounts?.find(a => a.id === id);

    return (
        <div className="overflow-x-auto pb-4">
            <div className="flex gap-5 min-h-[500px]" style={{ minWidth: "fit-content" }}>
                {COLUMNS.map(col => (
                    <BoardColumn
                        key={col.label}
                        column={col}
                        posts={posts.filter(p => col.id.includes(p.status))}
                        accounts={accounts}
                        getAccount={getAccount}
                        onEditPost={onEditPost}
                        onCreatePost={onCreatePost}
                    />
                ))}
            </div>
        </div>
    );
}

// Each column has its own sort state
function BoardColumn({
    column,
    posts,
    accounts,
    getAccount,
    onEditPost,
    onCreatePost
}: {
    column: { id: PostStatus[]; label: string; color: string; headerBg: string };
    posts: SocialPost[];
    accounts: SocialAccount[];
    getAccount: (id: string) => SocialAccount | undefined;
    onEditPost: (post: SocialPost) => void;
    onCreatePost: (status: PostStatus) => void;
}) {
    const [sortKey, setSortKey] = useState<SortKey>("date");
    const [sortDir, setSortDir] = useState<SortDir>("asc");

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir(d => d === "asc" ? "desc" : "asc");
        } else {
            setSortKey(key);
            setSortDir("asc");
        }
    };

    const sortedPosts = useMemo(() => {
        return [...posts].sort((a, b) => {
            const mult = sortDir === "asc" ? 1 : -1;
            if (sortKey === "date") {
                return mult * a.scheduledDate.localeCompare(b.scheduledDate);
            } else {
                return mult * (STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
            }
        });
    }, [posts, sortKey, sortDir]);

    const SortButton = ({ label, keyVal }: { label: string; keyVal: SortKey }) => {
        const isActive = sortKey === keyVal;
        return (
            <button
                onClick={() => toggleSort(keyVal)}
                className={`text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5 transition-colors ${isActive ? "bg-white/80 text-neutral-800 font-semibold" : "text-neutral-500 hover:text-neutral-700"
                    }`}
            >
                {label}
                {isActive && (sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
            </button>
        );
    };

    return (
        <div className="flex flex-col w-[280px] flex-shrink-0">
            {/* HEADER */}
            <div className={`px-4 py-3 rounded-t-xl ${column.headerBg}`}>
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-neutral-800">{column.label}</span>
                        <span className="bg-white/70 text-neutral-600 text-xs px-2 py-0.5 rounded-full font-semibold">{posts.length}</span>
                    </div>
                    <button
                        onClick={() => onCreatePost(column.id[0])}
                        className="p-1.5 hover:bg-white/50 rounded-lg text-neutral-500 hover:text-neutral-800 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>

                {/* SORT CONTROLS */}
                <div className="flex items-center gap-1">
                    <span className="text-[10px] text-neutral-500 mr-1">Sort:</span>
                    <SortButton label="Date" keyVal="date" />
                    <SortButton label="Status" keyVal="status" />
                </div>
            </div>

            {/* DROP ZONE */}
            <div className={`flex-1 rounded-b-xl p-3 ${column.color} space-y-3 overflow-y-auto max-h-[calc(100vh-380px)]`}>
                {sortedPosts.map(post => {
                    const acc = getAccount(post.accountId);
                    const platformColor = acc ? PLATFORM_COLORS[acc.platform] : "bg-neutral-400";
                    const accountCode = acc?.name.slice(0, 3).toUpperCase() || "???";
                    const statusChip = STATUS_CHIP[post.status];

                    return (
                        <div
                            key={post.id}
                            onClick={() => onEditPost(post)}
                            className="bg-white p-4 rounded-xl shadow-sm border border-neutral-100 hover:shadow-lg hover:border-neutral-200 transition-all cursor-pointer group"
                        >
                            {/* STATUS CHIP */}
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusChip.color}`}>
                                {statusChip.label}
                            </span>

                            {/* TITLE */}
                            <h4 className="text-sm font-semibold text-neutral-900 leading-snug mt-2 mb-2 line-clamp-2 group-hover:text-red-600 transition-colors">
                                {post.title}
                            </h4>

                            {/* CONTENT TYPE */}
                            {post.contentType && (
                                <span className="text-[10px] uppercase font-medium text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded inline-block">
                                    {post.contentType}
                                </span>
                            )}

                            {/* META ROW */}
                            <div className="flex items-center justify-between mt-2">
                                {/* DATE */}
                                <span className="text-xs text-neutral-500">
                                    {new Date(post.scheduledDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                </span>

                                <div className="flex items-center gap-2">
                                    {/* PLATFORM DOT */}
                                    <span className={`w-2.5 h-2.5 rounded-full ${platformColor}`} title={acc?.platform} />

                                    {/* ACCOUNT CODE */}
                                    <span className="text-[10px] font-bold text-neutral-500">{accountCode}</span>

                                    {/* ASSIGNEE INITIAL */}
                                    {post.assignee && (
                                        <span className="w-6 h-6 rounded-full bg-neutral-100 flex items-center justify-center text-[10px] font-bold text-neutral-600" title={post.assignee}>
                                            {post.assignee.charAt(0)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* Empty state */}
                {posts.length === 0 && (
                    <div className="h-24 border-2 border-dashed border-neutral-200 rounded-xl flex items-center justify-center text-sm text-neutral-400">
                        No posts
                    </div>
                )}
            </div>
        </div>
    );
}
