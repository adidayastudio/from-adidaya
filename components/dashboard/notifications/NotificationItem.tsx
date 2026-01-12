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
                <div className="flex-shrink-0">
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
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-neutral-900">{item.source?.name || "System"}</span>
                            <span className="text-neutral-300">•</span>
                            <span className="text-xs text-neutral-500">{item.timestamp}</span>
                        </div>
                    </div>

                    <h4 className={clsx("text-sm font-medium", isUnread ? "text-neutral-900" : "text-neutral-700")}>
                        {item.title}
                    </h4>
                    <p className="text-sm text-neutral-600 leading-relaxed">
                        {item.description}
                    </p>

                    {/* Meta / Actions */}
                    <div className="pt-2 flex flex-wrap gap-2 items-center">
                        {item.metadata?.projectCode && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-neutral-100 text-neutral-500 border border-neutral-200 uppercase tracking-wide">
                                {item.metadata.projectCode}
                            </span>
                        )}

                        {item.type === "approval" && item.metadata?.status === "pending" && (
                            <div className="flex gap-2 mt-1">
                                <button className="flex items-center gap-1 px-3 py-1.5 bg-neutral-100 text-neutral-600 text-xs font-medium rounded-lg hover:bg-neutral-200 transition-colors">
                                    <FileText className="w-3 h-3" /> Details
                                </button>
                                <button className="flex items-center gap-1 px-3 py-1.5 bg-white border border-neutral-200 text-neutral-600 text-xs font-medium rounded-lg hover:bg-neutral-50 transition-colors">
                                    <X className="w-3 h-3" /> Reject
                                </button>
                                <button className="flex items-center gap-1 px-3 py-1.5 bg-neutral-900 text-white text-xs font-medium rounded-lg hover:bg-black transition-colors">
                                    <Check className="w-3 h-3" /> Approve
                                </button>
                            </div>
                        )}

                        {item.metadata?.link && item.type !== "approval" && (
                            <Link href={item.metadata.link} className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 ml-auto">
                                View Details <ArrowRight className="w-3 h-3" />
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
