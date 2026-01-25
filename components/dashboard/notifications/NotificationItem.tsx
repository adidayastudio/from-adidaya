"use client";

import clsx from "clsx";

import { Check, X, ArrowRight, Info, AlertTriangle, FileText, AtSign, Settings } from "lucide-react";
import { Notification } from "./data";
import Link from "next/link";

interface NotificationItemProps {
    item: Notification;
    onMarkAsRead?: (id: string) => void;
}

export default function NotificationItem({ item, onMarkAsRead }: NotificationItemProps) {
    const isUnread = !item.isRead;

    const getIcon = () => {
        switch (item.type) {
            case "approval": return <FileText className="w-4 h-4 text-purple-600" />;
            case "mention": return <AtSign className="w-4 h-4 text-blue-600" />;
            case "system": return <Settings className="w-4 h-4 text-gray-600" />;
            case "success": return <Check className="w-4 h-4 text-green-600" />;
            case "warning": return <AlertTriangle className="w-4 h-4 text-orange-600" />;
            default: return <Info className="w-4 h-4 text-gray-600" />;
        }
    };

    const getBgColor = () => {
        switch (item.type) {
            case "approval": return "bg-purple-100";
            case "mention": return "bg-blue-100";
            case "system": return "bg-gray-100";
            case "success": return "bg-green-100";
            case "warning": return "bg-orange-100";
            default: return "bg-gray-100";
        }
    };

    return (
        <div className={clsx(
            "group relative p-4 rounded-xl border transition-all duration-200",
            isUnread ? "bg-white border-neutral-200 shadow-sm" : "bg-neutral-50/50 border-transparent hover:bg-white hover:border-neutral-200"
        )}>
            {isUnread && (
                <div className="absolute top-4 right-4 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            )}

            <div className="flex gap-4">
                {/* Avatar / Icon */}
                <div className="flex-shrink-0 pt-1">
                    {item.source?.avatar ? (
                        <img src={item.source.avatar} alt={item.source.name} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                        item.source?.color ? (
                            <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm", item.source.color)}>
                                {item.source.name.charAt(0)}
                            </div>
                        ) : (
                            <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center", getBgColor())}>
                                {getIcon()}
                            </div>
                        )
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 space-y-1">
                    {/* Main Description (Actor + Action) */}
                    <p className={clsx("text-sm leading-relaxed", isUnread ? "font-semibold text-neutral-900" : "font-medium text-neutral-700")}>
                        {(() => {
                            const text = item.description || "";
                            // Define keywords and their colors
                            const keywords = [
                                { word: "approved", color: "text-blue-600" },
                                { word: "rejected", color: "text-red-600" },
                                { word: "marking as paid:", color: "text-emerald-600" },
                                { word: "paid", color: "text-emerald-600" },
                                { word: "submitted", color: "text-neutral-900" }
                            ];

                            // Find the keyword present in the text
                            // We split by the first occurrence of a keyword to style it
                            // Simplistic approach: split by space implies word matching, but "marking as paid:" is multi-word.
                            // Better approach: Regex replacement with component

                            // Let's use a robust regex
                            const pattern = new RegExp(`(${keywords.map(k => k.word).join("|")})`, "i");
                            const parts = text.split(pattern);

                            return parts.map((part, i) => {
                                const keywordMatch = keywords.find(k => k.word.toLowerCase() === part.toLowerCase());
                                if (keywordMatch) {
                                    return <span key={i} className={keywordMatch.color}>{part}</span>;
                                }
                                return <span key={i}>{part}</span>;
                            });
                        })()}
                    </p>

                    {/* Meta: Title (Module • Code) • Timestamp */}
                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                        <span>{item.title}</span>
                        <span>•</span>
                        <span>{item.timestamp}</span>
                    </div>

                    {/* Actions (if Approval) */}
                    {item.type === "approval" && item.metadata?.status === "pending" && (
                        <div className="pt-2 flex gap-2">
                            <span className="flex items-center gap-1 px-3 py-1.5 bg-neutral-100 text-neutral-600 text-xs font-medium rounded-lg">
                                <FileText className="w-3 h-3" /> Review Request
                            </span>
                        </div>
                    )}

                    {/* View Details Indicator (Visual Only, Parent is Link) */}
                    <div className="pt-1 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="flex items-center gap-1 text-xs font-medium text-blue-600">
                            View Details <ArrowRight className="w-3 h-3" />
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
