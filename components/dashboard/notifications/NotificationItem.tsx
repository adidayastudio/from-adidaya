"use client";

import clsx from "clsx";

import { Check, X, ArrowRight, Info, AlertTriangle, FileText, AtSign, Settings } from "lucide-react";
import { Notification } from "./data";
import Link from "next/link";

interface NotificationItemProps {
    item: Notification;
    onMarkAsRead?: (id: string) => void;
}

export default function NotificationItem({ item }: NotificationItemProps) {
    const isUnread = !item.isRead;

    const getIcon = () => {
        switch (item.type) {
            case "approval": return <FileText className="w-3.5 h-3.5 text-purple-600" />;
            case "mention": return <AtSign className="w-3.5 h-3.5 text-blue-600" />;
            case "system": return <Settings className="w-3.5 h-3.5 text-gray-600" />;
            case "success": return <Check className="w-3.5 h-3.5 text-green-600" />;
            case "warning": return <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />;
            default: return <Info className="w-3.5 h-3.5 text-gray-600" />;
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
            "group relative p-3 rounded-2xl transition-all duration-200 touch-manipulation",
            isUnread
                ? "bg-white shadow-sm ring-1 ring-neutral-100"
                : "bg-neutral-50/50 hover:bg-neutral-100/50"
        )}>
            <div className="flex gap-3 items-start">
                {/* Avatar / Icon */}
                <div className="flex-shrink-0 pt-0.5">
                    {item.source?.avatar ? (
                        <img src={item.source.avatar} alt={item.source.name} className="w-8 h-8 rounded-full object-cover ring-2 ring-white" />
                    ) : (
                        item.source?.color ? (
                            <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ring-2 ring-white", item.source.color)}>
                                {item.source.name.charAt(0)}
                            </div>
                        ) : (
                            <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center ring-2 ring-white", getBgColor())}>
                                {getIcon()}
                            </div>
                        )
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    {/* Main Description */}
                    <p className={clsx("text-sm leading-snug line-clamp-2 pr-4", isUnread ? "font-semibold text-neutral-900" : "font-medium text-neutral-600")}>
                        {(() => {
                            const text = item.description || "";
                            const keywords = [
                                { word: "approved", color: "text-blue-600" },
                                { word: "rejected", color: "text-red-600" },
                                { word: "marking as paid:", color: "text-emerald-600" },
                                { word: "paid", color: "text-emerald-600" },
                                { word: "submitted", color: "text-neutral-900" }
                            ];
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

                    {/* Meta */}
                    <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 mt-1 font-medium">
                        <span>{item.title}</span>
                        <span className="w-0.5 h-0.5 rounded-full bg-neutral-300" />
                        <span>{item.timestamp}</span>
                    </div>
                </div>

                {/* Unread Indicator */}
                {isUnread && (
                    <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5 animate-pulse" />
                )}
            </div>
        </div>
    );
}
