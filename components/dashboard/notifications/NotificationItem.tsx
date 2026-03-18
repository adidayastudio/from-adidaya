"use client";

import clsx from "clsx";
import { Check, X, ArrowRight, Info, AlertTriangle, FileText, AtSign, Settings } from "lucide-react";
import { Notification } from "./data";

interface NotificationItemProps {
    item: Notification;
    onMarkAsRead?: (id: string) => void;
}

export default function NotificationItem({ item }: NotificationItemProps) {
    const isUnread = !item.isRead;

    const getStatusColor = (text: string) => {
        const lower = text.toLowerCase();
        if (lower.includes("rejected") || lower.includes("denied") || lower.includes("cancelled") || lower.includes("revision") || lower.includes("rejected")) return "text-red-600 dark:text-red-400 font-medium";
        if (lower.includes("approved") || lower.includes("accepted") || lower.includes("paid") || lower.includes("success")) return "text-emerald-600 dark:text-emerald-400 font-medium";
        if (lower.includes("submitted") || lower.includes("pending") || lower.includes("requested") || lower.includes("draft")) return "text-blue-600 dark:text-blue-400 font-medium";
        return "";
    };

    return (
        <div className={clsx(
            "group relative p-4 rounded-2xl transition-all duration-300 touch-manipulation border mb-3 flex gap-4 items-start",
            isUnread
                ? "bg-white dark:bg-white/10 shadow-sm border-neutral-200 dark:border-white/10"
                : "bg-neutral-50/50 dark:bg-black/20 border-transparent opacity-60 hover:opacity-100"
        )}>
            {/* Avatar */}
            <div className="flex-shrink-0 pt-0.5">
                {item.source?.avatar ? (
                    <img 
                        src={item.source.avatar} 
                        alt={item.source.name} 
                        className={clsx(
                            "w-10 h-10 rounded-full object-cover ring-1 transition-all", 
                            isUnread ? "ring-neutral-200 dark:ring-white/20" : "ring-neutral-100 dark:ring-neutral-800 opacity-80"
                        )} 
                    />
                ) : (
                    <div className={clsx(
                        "w-10 h-10 rounded-full flex items-center justify-center font-medium text-sm ring-1 transition-all", 
                        isUnread ? "ring-neutral-200 dark:ring-white/20" : "ring-neutral-100 opacity-80", 
                        item.source?.color || "bg-neutral-100 text-neutral-600"
                    )}>
                        {item.source?.name?.charAt(0) || "S"}
                    </div>
                )}
            </div>

            {/* Content Bundle */}
            <div className="flex-1 min-w-0">
                {/* WHO DO WHAT (Header) */}
                <h4 className={clsx(
                    "text-sm leading-snug mb-1",
                    isUnread ? "font-medium text-neutral-900 dark:text-white" : "font-medium text-neutral-500 dark:text-neutral-400"
                )}>
                    {(() => {
                        const text = item.description || "";
                        const keywords = ["submitted", "rejected", "approved", "accepted", "paid", "pending", "draft", "requested", "revision"];
                        const pattern = new RegExp(`(${keywords.map(k => k).join("|")})`, "i");
                        const parts = text.split(pattern);

                        return parts.map((part, i) => {
                            const match = keywords.find(k => k.toLowerCase() === part.toLowerCase());
                            if (match) {
                                return <span key={i} className={getStatusColor(part)}>{part}</span>;
                            }
                            return <span key={i}>{part}</span>;
                        });
                    })()}
                </h4>

                {/* META (Module • Project • Time) */}
                <div className="flex items-center gap-2 text-xs font-medium text-neutral-400 dark:text-neutral-500">
                    <span className="font-medium">{item.title}</span>
                    <span className="w-1 h-1 rounded-full bg-neutral-300/60" />
                    <span>{item.timestamp}</span>
                </div>
            </div>

            {/* Unread Indicator */}
            {isUnread && (
                <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-2 shadow-[0_0_8px_rgba(59,130,246,0.4)]" />
            )}
        </div>
    );
}
