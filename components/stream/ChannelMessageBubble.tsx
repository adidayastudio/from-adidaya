"use client";

import React, { useState } from "react";
import clsx from "clsx";
import {
    CheckSquare,
    CreditCard,
    FileText,
    MessageSquare,
    MoreHorizontal,
    Copy,
    Bookmark,
    Check,
    Trash2,
    SmilePlus,
    CloudRain,
    User,
    Calendar,
} from "lucide-react";

export interface ChannelMessageAttachment {
    type: "task" | "finance" | "file" | "photo" | "weather";
    title?: string;
    subtitle?: string;
    amount?: string;
    status?: string;
    imageUrl?: string;
    fileSize?: string;
    temperature?: string;
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
    isTaskDraft?: boolean;
    initialTitle?: string;
    onConfirmTask?: (data: { title: string; assignee: string; dueDate: string }) => void;
}

const QUICK_EMOJIS = ["✅", "👀", "👍", "❤️", "🔥", "🎉"];

const POPULAR_EMOJIS = [
    "✅", "👀", "👍", "❤️", "🔥", "🎉",
    "🚀", "💯", "📌", "⚠️", "👏", "🙌",
    "💡", "❓", "🙏", "😊", "💪", "🛠️",
    "🏗️", "📐", "💵", "📝", "⭐", "🤝"
];

const TEAM_MEMBERS = [
    { name: "Pak Budi", role: "Site Supervisor" },
    { name: "Ir. Hendra", role: "Site Engineer" },
    { name: "Pak Eko", role: "Mandor Cor" },
    { name: "Arsitek Dian", role: "Design Lead" },
];

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
    onOpenThread,
    isTaskDraft,
    initialTitle,
    onConfirmTask,
}: ChannelMessageBubbleProps) {
    const isSystem = role === "system";
    const initial = sender.charAt(0).toUpperCase();

    // Reaction & Message States
    const [reactions, setReactions] = useState<Record<string, number>>({});
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [copied, setCopied] = useState(false);
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [isDeleted, setIsDeleted] = useState(false);

    // Draft Task state
    const [draftTitle, setDraftTitle] = useState(initialTitle || "Pengecoran Plat Lt 3 Sisi Utara");
    const [draftAssignee, setDraftAssignee] = useState("Pak Budi");
    const [draftDueDate, setDraftDueDate] = useState("Hari ini 21:00 WIB");
    const [isConfirmedTask, setIsConfirmedTask] = useState(false);
    const [isSavedDraft, setIsSavedDraft] = useState(false);

    const toggleReaction = (emoji: string) => {
        setReactions(prev => {
            const current = prev[emoji] || 0;
            if (current > 0) {
                const next = { ...prev };
                delete next[emoji];
                return next;
            }
            return { ...prev, [emoji]: 1 };
        });
    };

    const handleCopy = () => {
        const textToCopy = content || attachment?.title || "";
        if (textToCopy) {
            navigator.clipboard.writeText(textToCopy);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
        setShowMoreMenu(false);
    };

    // Deleted Message Placeholder View
    if (isDeleted) {
        return (
            <div className="flex items-center gap-3 w-full my-2 p-2.5 rounded-2xl bg-neutral-100/40 dark:bg-neutral-900/40 border border-dashed border-neutral-200/60 dark:border-neutral-800/60">
                <div className="w-8 h-8 rounded-full bg-neutral-200/50 dark:bg-neutral-800/50 text-neutral-400 flex items-center justify-center shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                </div>
                <div className="flex items-center gap-2 text-[12px]">
                    <span className="font-semibold italic text-neutral-400 dark:text-neutral-500">
                        This message was deleted
                    </span>
                    <span className="text-[10px] text-neutral-400 font-mono">
                        {time}
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div className="group relative flex items-start gap-3 w-full my-2.5 p-2 rounded-2xl hover:bg-neutral-100/60 dark:hover:bg-neutral-800/40 transition-all">
            {/* User Avatar Badge */}
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
                    {tag && !attachment && (
                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            {tag}
                        </span>
                    )}
                    {isBookmarked && (
                        <Bookmark className="w-3 h-3 text-amber-500 fill-amber-500 ml-1" />
                    )}
                </div>

                {/* Main Text Content */}
                {content && (
                    <p className="text-[13px] text-neutral-800 dark:text-neutral-200 leading-relaxed font-normal">
                        {content}
                    </p>
                )}

                {/* Interactive Task Draft Card (For /task command in channel) */}
                {isTaskDraft && !isConfirmedTask && (
                    <div className="my-2 p-4 rounded-3xl bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border border-emerald-500/30 dark:border-emerald-500/20 shadow-md max-w-md space-y-3">
                        <div className="flex items-center justify-between border-b border-emerald-500/10 pb-2">
                            <div className="flex items-center gap-2">
                                <span className="text-base">✅</span>
                                <h4 className="text-[12px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                                    Interactive Task Draft
                                </h4>
                            </div>
                            {isSavedDraft && (
                                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400">
                                    Draft Saved
                                </span>
                            )}
                        </div>

                        {/* Task Title Field */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-tight flex items-center gap-1">
                                <FileText className="w-3 h-3" /> Nama Task / Pekerjaan
                            </label>
                            <input
                                type="text"
                                value={draftTitle}
                                onChange={(e) => setDraftTitle(e.target.value)}
                                placeholder="Masukkan nama tugas..."
                                className="w-full px-3 py-1.5 rounded-xl bg-neutral-100/80 dark:bg-neutral-800/80 border border-neutral-200/80 dark:border-neutral-700/80 text-[12px] font-bold text-neutral-900 dark:text-white outline-none focus:border-blue-500 transition-colors"
                            />
                        </div>

                        {/* Assignee Chips */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-tight flex items-center gap-1">
                                <User className="w-3 h-3" /> Assignee / Penanggung Jawab
                            </label>
                            <div className="flex flex-wrap gap-1">
                                {TEAM_MEMBERS.map(m => (
                                    <button
                                        key={m.name}
                                        type="button"
                                        onClick={() => setDraftAssignee(m.name)}
                                        className={clsx(
                                            "px-2 py-0.5 rounded-full text-[10px] font-bold transition-all border",
                                            draftAssignee === m.name
                                                ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                                                : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-200"
                                        )}
                                    >
                                        @{m.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Target Deadline Chips */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-tight flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> Target Deadline
                            </label>
                            <div className="flex flex-wrap gap-1">
                                {["Hari ini 21:00 WIB", "Besok 17:00 WIB", "Minggu Depan"].map(d => (
                                    <button
                                        key={d}
                                        type="button"
                                        onClick={() => setDraftDueDate(d)}
                                        className={clsx(
                                            "px-2 py-0.5 rounded-full text-[10px] font-bold transition-all border",
                                            draftDueDate === d
                                                ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                                                : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-200"
                                        )}
                                    >
                                        {d}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Buttons */}
                        <div className="flex items-center gap-2 pt-1">
                            <button
                                type="button"
                                onClick={() => setIsSavedDraft(true)}
                                className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 transition-colors border border-neutral-200 dark:border-neutral-700"
                            >
                                📝 Save Draft
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsConfirmedTask(true);
                                    onConfirmTask?.({ title: draftTitle, assignee: draftAssignee, dueDate: draftDueDate });
                                }}
                                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all active:scale-95"
                            >
                                <Check className="w-3.5 h-3.5" />
                                🚀 Create Task
                            </button>
                        </div>
                    </div>
                )}

                {/* CARDS */}
                {/* TYPE 1: File Card */}
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

                {/* TYPE 2: Task Created Card */}
                {(attachment?.type === "task" || isConfirmedTask) && (
                    <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-neutral-900 dark:text-white space-y-1.5 my-1 max-w-md">
                        <div className="flex items-center justify-between text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                            <span className="flex items-center gap-1">
                                <CheckSquare className="w-3.5 h-3.5" /> TASK CREATED
                            </span>
                            <span className="bg-emerald-500/20 px-2 py-0.5 rounded-md text-[9px] font-bold shrink-0">{attachment?.status || "IN PROGRESS"}</span>
                        </div>
                        <h4 className="text-[13px] font-bold text-neutral-900 dark:text-white leading-snug break-words">
                            {attachment?.title || draftTitle}
                        </h4>
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-normal break-words">
                            {attachment?.subtitle || `Assigned to @${draftAssignee} · Target ${draftDueDate}`}
                        </p>
                    </div>
                )}

                {/* TYPE 3: Expense Reimbursement Card */}
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

                {/* TYPE 4: Weather Alert Card */}
                {attachment?.type === "weather" && (
                    <div className="p-3.5 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-neutral-900 dark:text-white space-y-1.5 my-1 max-w-md shadow-2xs">
                        <div className="flex items-center justify-between text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
                            <span className="flex items-center gap-1.5">
                                <CloudRain className="w-4 h-4 text-sky-500" /> WEATHER ALERT
                            </span>
                            <span className="bg-sky-500/20 px-2 py-0.5 rounded-md text-[9px] font-bold shrink-0 text-sky-700 dark:text-sky-300 font-mono">
                                {attachment.status || "RAIN NOTICE"}
                            </span>
                        </div>
                        <h4 className="text-[13px] font-bold text-neutral-900 dark:text-white leading-snug break-words">{attachment.title}</h4>
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-normal break-words">{attachment.subtitle}</p>
                    </div>
                )}

                {/* Reaction Badges List */}
                {Object.keys(reactions).length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 pt-1">
                        {Object.entries(reactions).map(([emoji, count]) => (
                            <button
                                key={emoji}
                                onClick={() => toggleReaction(emoji)}
                                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-200 transition-all active:scale-95 shadow-2xs"
                            >
                                <span>{emoji}</span>
                                <span>{count}</span>
                            </button>
                        ))}
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
                {/* Quick Emoji Buttons */}
                {QUICK_EMOJIS.map((emoji) => (
                    <button
                        key={emoji}
                        onClick={() => toggleReaction(emoji)}
                        title={`Add reaction ${emoji}`}
                        className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-md active:scale-90 transition-transform text-[13px]"
                    >
                        {emoji}
                    </button>
                ))}

                {/* Add Emoji Reaction Picker Button */}
                <div className="relative">
                    <button
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        title="Add reaction..."
                        className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-md text-neutral-500 hover:text-neutral-800 dark:hover:text-white transition-colors"
                    >
                        <SmilePlus className="w-3.5 h-3.5" />
                    </button>

                    {/* Emoji Picker Popover Grid */}
                    {showEmojiPicker && (
                        <div className="absolute right-0 top-full mt-1.5 w-52 p-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 px-1 mb-1.5">
                                Add Reaction
                            </div>
                            <div className="grid grid-cols-6 gap-1">
                                {POPULAR_EMOJIS.map((emoji) => (
                                    <button
                                        key={emoji}
                                        onClick={() => {
                                            toggleReaction(emoji);
                                            setShowEmojiPicker(false);
                                        }}
                                        className="p-1.5 text-center text-sm rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 active:scale-90 transition-all"
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

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

                {/* More Options Dropdown Button */}
                <div className="relative">
                    <button
                        onClick={() => setShowMoreMenu(!showMoreMenu)}
                        title="More options"
                        className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-md transition-colors"
                    >
                        <MoreHorizontal className="w-3.5 h-3.5" />
                    </button>

                    {showMoreMenu && (
                        <div className="absolute right-0 top-full mt-1.5 w-44 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl z-50 p-1 space-y-0.5 animate-in fade-in zoom-in-95 duration-150">
                            <button
                                onClick={handleCopy}
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left transition-colors"
                            >
                                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-neutral-400" />}
                                <span>{copied ? "Copied!" : "Copy Text"}</span>
                            </button>

                            {onOpenThread && (
                                <button
                                    onClick={() => {
                                        onOpenThread();
                                        setShowMoreMenu(false);
                                    }}
                                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left transition-colors"
                                >
                                    <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                                    <span>Reply in Thread</span>
                                </button>
                            )}

                            <button
                                onClick={() => {
                                    setIsBookmarked(!isBookmarked);
                                    setShowMoreMenu(false);
                                }}
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left transition-colors"
                            >
                                <Bookmark className={clsx("w-3.5 h-3.5", isBookmarked ? "text-amber-500 fill-amber-500" : "text-neutral-400")} />
                                <span>{isBookmarked ? "Remove Bookmark" : "Bookmark"}</span>
                            </button>

                            <div className="h-px bg-neutral-100 dark:bg-neutral-800 my-1" />

                            <button
                                onClick={() => {
                                    setIsDeleted(true);
                                    setShowMoreMenu(false);
                                }}
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/10 text-left transition-colors"
                            >
                                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                <span>Delete Message</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
