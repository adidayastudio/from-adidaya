"use client";

import React from "react";
import clsx from "clsx";
import {
    CheckSquare,
    CreditCard,
    FileText,
    MessageSquare,
    MoreHorizontal,
} from "lucide-react";

export interface ChannelMessageAttachment {
    type: "task" | "finance" | "file" | "photo";
    title?: string;
    subtitle?: string;
    amount?: string;
    status?: string;
    imageUrl?: string;
    fileSize?: string;
}

interface ChannelMessageBubbleProps {
    id?: string;
    sender: string;
    time: string;
    content?: string;
    role: "user" | "system";
    tag?: string;
    isSelf?: boolean;
    attachment?: ChannelMessageAttachment;
    replyCount?: number;
    onOpenThread?: () => void;
}

export default function ChannelMessageBubble({
    id,
    sender,
    time,
    content,
    role,
    tag,
    isSelf,
    attachment,
    replyCount = 0,
    onOpenThread
}: ChannelMessageBubbleProps) {
    const isSystem = role === "system";

    // Initial avatar letter
    const initial = sender.charAt(0).toUpperCase();

    return (
        <div className="group relative flex items-start gap-3 w-full my-2.5 p-2 rounded-2xl hover:bg-neutral-100/60 dark:hover:bg-neutral-800/40 transition-all">
            {/* User Blue Avatar Badge */}
            <div className={clsx(
                "w-9 h-9 rounded-full font-bold flex items-center justify-center text-[12px] shrink-0 shadow-sm transition-all",
                isSelf
                    ? "bg-blue-600 text-white"
                    : isSystem
                        ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                        : "bg-blue-600 text-white"
            )}>
                {initial}
            </div>

            {/* Message Body */}
            <div className="flex-1 min-w-0 space-y-1">
                {/* Header: Sender Name & Time */}
                <div className="flex items-center gap-2 text-[12px]">
                    <span className="font-bold text-neutral-900 dark:text-white">
                        {sender}
                    </span>
                    <span className="text-[10px] font-medium text-neutral-400">
                        {time}
                    </span>
                    {tag && (
                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            {tag}
                        </span>
                    )}
                </div>

                {/* Main Text Content */}
                {content && (
                    <p className="text-[13px] text-neutral-800 dark:text-neutral-200 leading-relaxed font-normal">
                        {content}
                    </p>
                )}

                {/* SINGLE CLEAN CARDS (Module Theme Colored) */}
                {/* TYPE 1: File Card (Violet Pumble Theme) */}
                {attachment?.type === "file" && (
                    <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-neutral-800/70 border border-violet-500/30 text-neutral-900 dark:text-white flex items-center justify-between gap-3 shadow-sm my-1 max-w-md">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-600 flex items-center justify-center shrink-0">
                                <FileText className="w-5 h-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h4 className="text-[12px] font-bold text-neutral-800 dark:text-neutral-200 font-mono leading-snug break-words">{attachment.title}</h4>
                                <p className="text-[10px] text-neutral-400 font-bold uppercase">{attachment.fileSize || "BIN / SKP"}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* TYPE 2: Task Created Card (Emerald Operations Theme) */}
                {attachment?.type === "task" && (
                    <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-neutral-900 dark:text-white space-y-1.5 my-1 max-w-md">
                        <div className="flex items-center justify-between text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                            <span className="flex items-center gap-1">
                                <CheckSquare className="w-3.5 h-3.5" /> TASK CREATED
                            </span>
                            <span className="bg-emerald-500/20 px-2 py-0.5 rounded-md text-[9px] font-bold shrink-0">{attachment.status || "IN PROGRESS"}</span>
                        </div>
                        <h4 className="text-[13px] font-bold text-neutral-900 dark:text-white leading-snug break-words">{attachment.title}</h4>
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-normal break-words">{attachment.subtitle}</p>
                    </div>
                )}

                {/* TYPE 3: Expense Reimbursement Card (Amber Finance Theme) */}
                {attachment?.type === "finance" && (
                    <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-neutral-900 dark:text-white space-y-1.5 my-1 max-w-md">
                        <div className="flex items-center justify-between text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                            <span className="flex items-center gap-1">
                                <CreditCard className="w-3.5 h-3.5" /> EXPENSE LOG
                            </span>
                            <span className="bg-amber-500/20 px-2 py-0.5 rounded-md text-[9px] font-bold shrink-0">{attachment.status || "PENDING APPROVAL"}</span>
                        </div>
                        <h4 className="text-[13px] font-bold text-neutral-900 dark:text-white leading-snug break-words">{attachment.title}</h4>
                        <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] pt-0.5">
                            <span className="text-neutral-500 break-words">{attachment.subtitle}</span>
                            <span className="font-mono font-bold text-amber-600 dark:text-amber-400 shrink-0">{attachment.amount}</span>
                        </div>
                    </div>
                )}

                {/* Thread Reply Count Button */}
                {replyCount > 0 && onOpenThread && (
                    <button
                        onClick={onOpenThread}
                        className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline pt-1"
                    >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{replyCount} {replyCount === 1 ? "reply" : "replies"}</span>
                    </button>
                )}
            </div>

            {/* Pumble Hover Action Bar */}
            <div className="absolute right-3 -top-3 hidden group-hover:flex items-center gap-1 p-1 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-md text-neutral-600 dark:text-neutral-300 text-xs z-10">
                <button title="React" className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-md">✅</button>
                <button title="React" className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-md">👀</button>
                {onOpenThread && (
                    <button
                        onClick={onOpenThread}
                        title="Reply in Thread"
                        className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-md text-blue-600 dark:text-blue-400 flex items-center gap-1 font-bold text-[11px]"
                    >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Reply</span>
                    </button>
                )}
                <button title="More options" className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-md">
                    <MoreHorizontal className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
}
