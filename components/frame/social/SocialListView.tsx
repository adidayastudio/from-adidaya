import React, { useMemo, useState } from "react";
import { SocialPost, PostStatus, SocialAccount } from "./types/social.types";
import { ChevronUp, ChevronDown } from "lucide-react";

type Props = {
    posts: SocialPost[];
    accounts: SocialAccount[];
    onEditPost: (post: SocialPost) => void;
    hideAccountColumn?: boolean;
};

type SortKey = "scheduledDate" | "title" | "status" | "accountId" | "contentType";
type SortDir = "asc" | "desc";

const PLATFORM_PREFIX: Record<string, { code: string; color: string }> = {
    INSTAGRAM: { code: "IG", color: "text-pink-600 bg-pink-50" },
    TIKTOK: { code: "TT", color: "text-neutral-900 bg-neutral-100" },
    LINKEDIN: { code: "IN", color: "text-blue-700 bg-blue-50" },
    YOUTUBE: { code: "YT", color: "text-red-600 bg-red-50" },
    FACEBOOK: { code: "FB", color: "text-blue-600 bg-blue-50" }
};

export default function SocialListView({ posts, accounts, onEditPost, hideAccountColumn = false }: Props) {
    const [sortKey, setSortKey] = useState<SortKey>("scheduledDate");
    const [sortDir, setSortDir] = useState<SortDir>("asc");

    const today = new Date().toISOString().split('T')[0];

    const sortedPosts = useMemo(() => {
        return [...posts].sort((a, b) => {
            let cmp = 0;
            if (sortKey === "scheduledDate") {
                cmp = a.scheduledDate.localeCompare(b.scheduledDate);
            } else if (sortKey === "title") {
                cmp = a.title.localeCompare(b.title);
            } else if (sortKey === "status") {
                cmp = a.status.localeCompare(b.status);
            } else if (sortKey === "accountId") {
                cmp = a.accountId.localeCompare(b.accountId);
            } else if (sortKey === "contentType") {
                cmp = a.contentType.localeCompare(b.contentType);
            }
            return sortDir === "asc" ? cmp : -cmp;
        });
    }, [posts, sortKey, sortDir]);

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir(d => d === "asc" ? "desc" : "asc");
        } else {
            setSortKey(key);
            setSortDir("asc");
        }
    };

    const SortIcon = ({ colKey }: { colKey: SortKey }) => {
        const isActive = sortKey === colKey;
        const iconClass = isActive ? "text-neutral-700" : "text-neutral-300";
        return (
            <span className={`ml-1 inline-flex ${iconClass}`}>
                {isActive && sortDir === "desc"
                    ? <ChevronDown className="w-3 h-3" />
                    : <ChevronUp className="w-3 h-3" />
                }
            </span>
        );
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return "-";
        return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    };

    const getIndicator = (post: SocialPost) => {
        if (post.status === "PUBLISHED") return null;
        if (post.scheduledDate === today) return { tooltip: "Due Today", color: "bg-blue-500" };
        if (post.scheduledDate < today) return { tooltip: "Overdue", color: "bg-red-500" };
        return null;
    };

    const StatusBadge = ({ status }: { status: PostStatus }) => {
        let style = "bg-neutral-100 text-neutral-600";
        if (["PUBLISHED", "APPROVED"].includes(status)) style = "bg-green-50 text-green-700";
        if (["SCHEDULED"].includes(status)) style = "bg-blue-50 text-blue-700";
        if (["WRITING", "DESIGNING"].includes(status)) style = "bg-orange-50 text-orange-700";
        if (["NEED_REVISION", "NEED_APPROVAL"].includes(status)) style = "bg-red-50 text-red-700";

        return (
            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full tracking-wide whitespace-nowrap ${style}`}>
                {status.replace(/_/g, " ")}
            </span>
        );
    };

    const AccountBadge = ({ accountId }: { accountId: string }) => {
        const acc = accounts?.find(a => a.id === accountId);
        if (!acc) return <span className="text-xs text-neutral-400">-</span>;

        const prefix = PLATFORM_PREFIX[acc.platform] || { code: "??", color: "text-neutral-600 bg-neutral-100" };
        const shortName = acc.name.split(' ')[0].slice(0, 10);

        return (
            <div className="flex items-center gap-1.5">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${prefix.color}`}>
                    {prefix.code}
                </span>
                <span className="text-xs text-neutral-700 truncate max-w-[80px]">{shortName}</span>
            </div>
        );
    };

    const SortableHeader = ({ label, colKey, className = "" }: { label: string; colKey: SortKey; className?: string }) => (
        <th
            className={`px-4 py-3 font-medium cursor-pointer hover:text-neutral-600 transition-colors select-none ${className}`}
            onClick={() => toggleSort(colKey)}
        >
            {label}
            <SortIcon colKey={colKey} />
        </th>
    );

    return (
        <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-neutral-100">
            <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[700px]">
                    <thead>
                        <tr className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider border-b border-neutral-100 bg-neutral-50/50">
                            <th className="px-4 py-3 w-8"></th>
                            <SortableHeader label="Content" colKey="title" className="w-1/3" />
                            {!hideAccountColumn && <SortableHeader label="Account" colKey="accountId" />}
                            <SortableHeader label="Type" colKey="contentType" />
                            <SortableHeader label="Date" colKey="scheduledDate" />
                            <SortableHeader label="Status" colKey="status" />
                            <th className="px-4 py-3 font-medium text-right">Assignee</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedPosts.map(post => {
                            const indicator = getIndicator(post);
                            return (
                                <tr
                                    key={post.id}
                                    className="hover:bg-neutral-50/70 transition-colors group cursor-pointer border-b border-neutral-50 last:border-b-0"
                                    onClick={() => onEditPost(post)}
                                >
                                    <td className="px-4 py-3">
                                        {indicator && (
                                            <div className="relative group/dot">
                                                <span className={`w-2 h-2 rounded-full inline-block ${indicator.color}`} />
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-0 group-hover/dot:opacity-100 transition-opacity bg-neutral-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-10">
                                                    {indicator.tooltip}
                                                </div>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="text-sm font-medium text-neutral-900 group-hover:text-red-600 transition-colors">{post.title}</div>
                                        {post.contentPillar && <div className="text-[10px] text-neutral-400">{post.contentPillar}</div>}
                                    </td>
                                    {!hideAccountColumn && (
                                        <td className="px-4 py-3">
                                            <AccountBadge accountId={post.accountId} />
                                        </td>
                                    )}
                                    <td className="px-4 py-3">
                                        <span className="text-xs text-neutral-500">{post.contentType}</span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-neutral-600 whitespace-nowrap">
                                        {formatDate(post.scheduledDate)}
                                    </td>
                                    <td className="px-4 py-3">
                                        <StatusBadge status={post.status} />
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {post.assignee ? (
                                            <span className="text-xs font-medium text-neutral-600">{post.assignee.split(' ')[0]}</span>
                                        ) : (
                                            <span className="text-xs text-neutral-300">-</span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {posts.length === 0 && (
                <div className="p-12 text-center text-sm text-neutral-400 italic">
                    No posts found.
                </div>
            )}
        </div>
    );
}
