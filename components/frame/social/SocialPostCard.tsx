"use client";

import React from "react";
import clsx from "clsx";
import { SocialPost, SocialAccount, PostStatus, Platform } from "./types/social.types";

const PLATFORM_COLORS: Record<Platform, { bg: string; text: string; code: string }> = {
    INSTAGRAM: { bg: "bg-pink-50", text: "text-pink-600", code: "IG" },
    TIKTOK: { bg: "bg-neutral-100", text: "text-neutral-900", code: "TT" },
    LINKEDIN: { bg: "bg-blue-50", text: "text-blue-700", code: "IN" },
    YOUTUBE: { bg: "bg-red-50", text: "text-red-600", code: "YT" },
    FACEBOOK: { bg: "bg-blue-50", text: "text-blue-600", code: "FB" },
};

const STATUS_STYLES: Record<PostStatus, { label: string; bg: string; text: string }> = {
    NOT_STARTED: { label: "Not Started", bg: "bg-neutral-100", text: "text-neutral-600" },
    TODO: { label: "To-Do", bg: "bg-neutral-200/70", text: "text-neutral-700" },
    WRITING: { label: "Writing", bg: "bg-orange-100", text: "text-orange-700" },
    DESIGNING: { label: "Designing", bg: "bg-purple-100", text: "text-purple-700" },
    IN_REVIEW: { label: "In Review", bg: "bg-yellow-100", text: "text-yellow-700" },
    NEED_REVISION: { label: "Revision", bg: "bg-red-100", text: "text-red-700" },
    NEED_APPROVAL: { label: "Approval", bg: "bg-red-100", text: "text-red-700" },
    APPROVED: { label: "Approved", bg: "bg-blue-100", text: "text-blue-700" },
    SCHEDULED: { label: "Scheduled", bg: "bg-indigo-100", text: "text-indigo-700" },
    PUBLISHED: { label: "Published", bg: "bg-green-100", text: "text-green-700" },
    ARCHIVED: { label: "Archived", bg: "bg-neutral-200", text: "text-neutral-500" },
};

const PLATFORM_DOT_COLORS: Record<Platform, string> = {
    INSTAGRAM: "bg-pink-500",
    TIKTOK: "bg-neutral-800",
    LINKEDIN: "bg-blue-600",
    YOUTUBE: "bg-red-500",
    FACEBOOK: "bg-blue-500",
};

interface SocialPostCardProps {
    post: SocialPost;
    account?: SocialAccount;
    onClick?: () => void;
}

export default function SocialPostCard({ post, account, onClick }: SocialPostCardProps) {
    const statusStyle = STATUS_STYLES[post.status];
    const platformDot = account ? PLATFORM_DOT_COLORS[account.platform] : "bg-neutral-400";
    const platformInfo = account ? PLATFORM_COLORS[account.platform] : null;
    const accountCode = account?.name.slice(0, 3).toUpperCase() || "???";

    const scheduledDate = new Date(post.scheduledDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const scheduledDateOnly = new Date(scheduledDate);
    scheduledDateOnly.setHours(0, 0, 0, 0);

    const isOverdue = post.status !== "PUBLISHED" && scheduledDateOnly < today;
    const isDueToday = scheduledDateOnly.getTime() === today.getTime() && post.status !== "PUBLISHED";

    const currentYear = new Date().getFullYear();
    const showYear = scheduledDate.getFullYear() !== currentYear;

    const dateStr = scheduledDate.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: showYear ? "numeric" : undefined
    });

    const getAssigneeInitial = () => {
        if (!post.assignee) return null;
        return post.assignee.charAt(0).toUpperCase();
    };

    const PRIORITY_STYLES: Record<string, { label: string; bg: string; text: string }> = {
        URGENT: { label: "Urgent", bg: "bg-red-500", text: "text-white" },
        HIGH: { label: "High", bg: "bg-orange-100", text: "text-orange-700" },
        MID: { label: "Mid", bg: "bg-blue-100", text: "text-blue-700" },
        LOW: { label: "Low", bg: "bg-neutral-100", text: "text-neutral-600" },
    };

    const priorityStyle = post.priority ? PRIORITY_STYLES[post.priority.toUpperCase()] : null;

    const assigneeInitial = getAssigneeInitial();

    return (
        <div
            onClick={onClick}
            className={clsx(
                "group relative rounded-[24px] p-4 flex items-center justify-between gap-4 transition-all duration-300 shadow-sm bg-white border border-neutral-100/80",
                onClick && "active:scale-[0.97] hover:bg-neutral-50/50 cursor-pointer"
            )}
        >
            {/* LEFT SIDE: AVATAR + 3 ROWS OF CONTENT */}
            <div className="flex items-start gap-4 flex-1 min-w-0">
                {/* Far Left: Account Avatar */}
                <div className="shrink-0 pt-0.5">
                    {account?.avatar ? (
                        <img
                            src={account.avatar}
                            alt={account.name}
                            className="w-11 h-11 rounded-full object-cover border border-neutral-100 shadow-sm"
                        />
                    ) : (
                        <div className={clsx(
                            "w-11 h-11 rounded-full flex items-center justify-center shadow-inner",
                            platformInfo ? `${platformInfo.bg}` : "bg-neutral-100"
                        )}>
                            <span className={clsx(
                                "text-[12px] font-black tracking-tight",
                                platformInfo ? platformInfo.text : "text-neutral-500"
                            )}>
                                {accountCode}
                            </span>
                        </div>
                    )}
                </div>

                {/* Left Columns: 3 Rows */}
                <div className="flex-1 min-w-0 flex flex-col gap-2.5">
                    {/* Row 1: Title */}
                    <h3 className="text-[16px] font-extrabold text-neutral-900 leading-tight truncate">
                        {post.title}
                    </h3>

                    {/* Row 2: [CODE] + Type + Pillar */}
                    <div className="flex items-center gap-2 overflow-hidden">
                        <span className={clsx(
                            "text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider shrink-0",
                            platformInfo ? `${platformInfo.bg} ${platformInfo.text}` : "bg-neutral-100 text-neutral-500"
                        )}>
                            {accountCode}
                        </span>
                        {post.contentType && (
                            <span className="text-[9px] font-black text-neutral-400 uppercase tracking-widest shrink-0">
                                {post.contentType}
                            </span>
                        )}
                        <span className="text-[10px] font-bold text-neutral-200 uppercase truncate">
                            {post.contentPillar || "General"}
                        </span>
                    </div>

                    {/* Row 3: Deadline Date */}
                    <div className={clsx(
                        "flex items-center gap-1 text-[11px] font-bold tabular-nums",
                        isOverdue ? "text-red-500" : isDueToday ? "text-blue-500" : "text-neutral-400"
                    )}>
                        {isOverdue && (
                            <div className="w-3.5 h-3.5 rounded-full bg-red-500 flex items-center justify-center shrink-0">
                                <span className="text-white text-[10px] font-black leading-none">!</span>
                            </div>
                        )}
                        <span>{dateStr}</span>
                    </div>
                </div>
            </div>

            {/* RIGHT SIDE: 3 ROWS OF STATUS / PRIOR / ASSIGNEE */}
            <div className="shrink-0 flex flex-col items-end justify-between self-stretch py-1 min-h-[72px]">
                {/* Row 1: Status */}
                <span className={clsx(
                    "text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full leading-none",
                    statusStyle.bg,
                    statusStyle.text
                )}>
                    {statusStyle.label}
                </span>

                {/* Row 2: Priority */}
                <div className="flex items-center">
                    {priorityStyle && (
                        <span className={clsx(
                            "text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md border shadow-sm",
                            priorityStyle.bg,
                            priorityStyle.text,
                            post.priority === 'URGENT' ? "border-transparent" : "border-black/[0.03]"
                        )}>
                            {priorityStyle.label}
                        </span>
                    )}
                </div>

                {/* Row 3: Assignee */}
                <div className="w-6 h-6 rounded-full bg-neutral-50 border border-neutral-100 shadow-sm flex items-center justify-center text-[9px] font-black text-neutral-400 uppercase overflow-hidden">
                    {assigneeInitial || ""}
                </div>
            </div>
        </div>
    );
}

