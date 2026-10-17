"use client";

import React, { useState } from "react";
import clsx from "clsx";
import {
    X,
    Send,
    Paperclip,
    CheckSquare,
    CreditCard,
    FileText,
} from "lucide-react";

export interface ThreadData {
    id: string;
    sender: string;
    time: string;
    content?: string;
    attachment?: any;
    replies: { id: string; sender: string; time: string; content: string }[];
}

interface PumbleThreadPanelProps {
    thread: ThreadData;
    onClose: () => void;
    onSendReply: (replyText: string, alsoSendToChannel: boolean) => void;
    channelCode: string;
}

export default function PumbleThreadPanel({
    thread,
    onClose,
    onSendReply,
    channelCode
}: PumbleThreadPanelProps) {
    const [replyText, setReplyText] = useState("");
    const [alsoSendToChannel, setAlsoSendToChannel] = useState(false);

    return (
        <div className="flex flex-col h-full bg-white/80 dark:bg-neutral-900/80 backdrop-blur-2xl rounded-2xl border border-white/60 dark:border-neutral-800/40 shadow-lg overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-neutral-200/60 dark:border-neutral-800/60 flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-extrabold text-neutral-900 dark:text-white">Thread</h3>
                    <p className="text-[11px] font-mono text-neutral-400"># {channelCode}</p>
                </div>
                <button
                    onClick={onClose}
                    className="p-1.5 rounded-full hover:bg-neutral-200/60 dark:hover:bg-neutral-800/60 text-neutral-500 transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Scrollable Thread Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                {/* Parent Message */}
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-neutral-100/70 dark:bg-neutral-800/50 border border-neutral-200/50 dark:border-neutral-700/50">
                    <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[12px] shrink-0">
                        {thread.sender.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-neutral-900 dark:text-white truncate">{thread.sender}</span>
                            <span className="text-neutral-400 text-[10px]">{thread.time}</span>
                        </div>
                        {thread.content && (
                            <p className="text-[12px] text-neutral-800 dark:text-neutral-200 leading-snug">
                                {thread.content}
                            </p>
                        )}
                        {/* Module-Themed Attachment Card (Symmetrically Aligned & No Truncation) */}
                        {thread.attachment?.type === "task" && (
                            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-neutral-900 dark:text-white space-y-1.5 mt-2 w-full">
                                <div className="flex items-center justify-between text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                                    <span className="flex items-center gap-1">
                                        <CheckSquare className="w-3.5 h-3.5" /> TASK CREATED
                                    </span>
                                    <span className="bg-emerald-500/20 px-2 py-0.5 rounded-md text-[9px] font-bold shrink-0">{thread.attachment.status || "IN PROGRESS"}</span>
                                </div>
                                <h4 className="text-[13px] font-bold text-neutral-900 dark:text-white leading-snug break-words">{thread.attachment.title}</h4>
                                {thread.attachment.subtitle && (
                                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-normal break-words">{thread.attachment.subtitle}</p>
                                )}
                            </div>
                        )}

                        {thread.attachment?.type === "finance" && (
                            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-neutral-900 dark:text-white space-y-1.5 mt-2 w-full">
                                <div className="flex items-center justify-between text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                                    <span className="flex items-center gap-1">
                                        <CreditCard className="w-3.5 h-3.5" /> EXPENSE LOG
                                    </span>
                                    <span className="bg-amber-500/20 px-2 py-0.5 rounded-md text-[9px] font-bold shrink-0">{thread.attachment.status || "PENDING APPROVAL"}</span>
                                </div>
                                <h4 className="text-[13px] font-bold text-neutral-900 dark:text-white leading-snug break-words">{thread.attachment.title}</h4>
                                {thread.attachment.amount && (
                                    <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] pt-0.5">
                                        <span className="text-neutral-500 break-words">{thread.attachment.subtitle}</span>
                                        <span className="font-mono font-bold text-amber-600 dark:text-amber-400 shrink-0">{thread.attachment.amount}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {thread.attachment?.type === "file" && (
                            <div className="p-3.5 rounded-xl bg-white/70 dark:bg-neutral-800/70 border border-violet-500/30 text-neutral-900 dark:text-white flex items-center justify-between gap-3 mt-2 w-full">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-9 h-9 rounded-xl bg-violet-500/10 text-violet-600 flex items-center justify-center shrink-0">
                                        <FileText className="w-4.5 h-4.5" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h4 className="text-[12px] font-bold text-neutral-800 dark:text-neutral-200 font-mono leading-snug break-words">{thread.attachment.title}</h4>
                                        <p className="text-[10px] text-neutral-400 font-bold uppercase">{thread.attachment.fileSize || "BIN / SKP"}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {!thread.attachment?.type && thread.attachment?.title && (
                            <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/30 text-neutral-900 dark:text-white flex items-center gap-2.5 mt-2 w-full">
                                <FileText className="w-4 h-4 text-violet-600 shrink-0" />
                                <span className="text-[12px] font-mono font-bold text-violet-700 dark:text-violet-300 break-words">
                                    {thread.attachment.title}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-2 my-2">
                    <div className="flex-1 h-px bg-neutral-200/60 dark:bg-neutral-800/60" />
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-2">
                        {thread.replies.length} {thread.replies.length === 1 ? "Reply" : "Replies"}
                    </span>
                    <div className="flex-1 h-px bg-neutral-200/60 dark:bg-neutral-800/60" />
                </div>

                {/* Replies List */}
                {thread.replies.map((reply) => (
                    <div key={reply.id} className="flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-neutral-100/50 dark:hover:bg-neutral-800/30 transition-all">
                        <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0">
                            {reply.sender.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0 space-y-0.5">
                            <div className="flex items-center justify-between text-[10px]">
                                <span className="font-bold text-neutral-900 dark:text-white">{reply.sender}</span>
                                <span className="text-neutral-400">{reply.time}</span>
                            </div>
                            <p className="text-[12px] text-neutral-800 dark:text-neutral-200 leading-snug">
                                {reply.content}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Pumble Thread Reply Input Box */}
            <div className="p-3 border-t border-neutral-200/60 dark:border-neutral-800/60 bg-neutral-50/50 dark:bg-neutral-900/50 space-y-2">
                {/* Also send to channel checkbox */}
                <label className="flex items-center gap-2 text-[11px] font-medium text-neutral-600 dark:text-neutral-400 cursor-pointer select-none">
                    <input
                        type="checkbox"
                        checked={alsoSendToChannel}
                        onChange={(e) => setAlsoSendToChannel(e.target.checked)}
                        className="rounded border-neutral-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                    />
                    <span>Also send to <strong className="font-mono text-blue-600"># {channelCode}</strong></span>
                </label>

                {/* Rich Reply Box */}
                <div className="p-2.5 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-sm space-y-2">
                    <textarea
                        rows={2}
                        placeholder="Reply..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="w-full bg-transparent border-none outline-none text-[13px] text-neutral-900 dark:text-white placeholder:text-neutral-400 resize-none"
                    />

                    {/* Toolbar */}
                    <div className="flex items-center justify-between pt-1 border-t border-neutral-100 dark:border-neutral-700/60">
                        <div className="flex items-center gap-1 text-neutral-400">
                            <button className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded text-[11px] font-bold">B</button>
                            <button className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded text-[11px] italic font-serif">I</button>
                            <button className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded"><Paperclip className="w-3.5 h-3.5" /></button>
                        </div>

                        <button
                            onClick={() => {
                                if (replyText.trim()) {
                                    onSendReply(replyText.trim(), alsoSendToChannel);
                                    setReplyText("");
                                }
                            }}
                            disabled={!replyText.trim()}
                            className={clsx(
                                "px-3.5 py-1.5 rounded-full text-[12px] font-bold flex items-center gap-1.5 transition-all shadow-sm",
                                replyText.trim()
                                    ? "bg-[#0A84FF] text-white hover:bg-blue-600 active:scale-95"
                                    : "bg-neutral-200 dark:bg-neutral-700 text-neutral-400 cursor-not-allowed"
                            )}
                        >
                            <span>Send</span>
                            <Send className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
