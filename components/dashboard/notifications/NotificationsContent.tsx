"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import { Search, Bell, AlertTriangle, Sparkles } from "lucide-react";
import { SummaryFilterCards, FilterItem } from "@/components/dashboard/shared/SummaryFilterCards";
import { MobileNotificationTabs } from "./MobileNotificationTabs";
import { isToday, isYesterday, differenceInHours, isAfter, subDays } from "date-fns";
import NotificationItem from "./NotificationItem";
import { createNotification } from "@/lib/api/notifications";
import { Notification as UiNotification } from "./data";
import { subscribeToPush } from "@/lib/api/push-registration";
import Link from "next/link";
import { useNotifications } from "@/hooks/useNotifications";

export type NotificationSection = "all" | "unread" | "finance" | "projects" | "crew" | "system";

export default function NotificationsContent({ 
    section, 
    isEmbedded = false,
    externalSearchQuery = "",
    onSearchChange,
    hideSearchInput = false,
}: { 
    section: NotificationSection; 
    isEmbedded?: boolean;
    externalSearchQuery?: string;
    onSearchChange?: (q: string) => void;
    hideSearchInput?: boolean;
}) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { notifications, loading, error, refresh, markAsRead, loadMore, hasMore, currentUserId } = useNotifications();
    const [localSearchQuery, setLocalSearchQuery] = useState("");
    const [permission, setPermission] = useState<NotificationPermission>("default");
    
    // Direct read from URL if in page context, otherwise use local/prop
    const searchQuery = (isEmbedded ? (externalSearchQuery || localSearchQuery) : (searchParams.get("q") || externalSearchQuery || "")) || "";
    const setSearchQuery = onSearchChange || setLocalSearchQuery;

    // Permission Sync
    useEffect(() => {
        if (typeof window !== "undefined" && "Notification" in window) {
            const current = Notification.permission;
            const timer = setTimeout(() => {
                setPermission(prev => prev !== current ? current : prev);
            }, 0);
            return () => clearTimeout(timer);
        }
    }, []);

    const requestPermission = async () => {
        if (!("Notification" in window)) return;

        try {
            const result = await Notification.requestPermission();
            setPermission(result);

            if (result === "granted") {
                await subscribeToPush();
            }
        } catch (error) {
            console.error("Error requesting notification permission:", error);
        }
    };


    // Counts
    const getCategory = (n: UiNotification) => (n.metadata as { category?: string })?.category ||
        (n.type === 'approval' ? 'finance' : n.type === 'mention' ? 'projects' : 'system');

    const counts = {
        all: notifications.length,
        unread: notifications.filter(n => !n.isRead).length,
        finance: notifications.filter(n => getCategory(n) === "finance").length,
        projects: notifications.filter(n => getCategory(n) === "projects").length,
        crew: notifications.filter(n => getCategory(n) === "crew").length,
        system: notifications.filter(n => getCategory(n) === "system").length,
    };

    const filterItems: FilterItem[] = [
        { id: "all", label: "All", count: "", color: "neutral" },
        { id: "unread", label: "Unread", count: loading ? "-" : counts.unread, color: "blue" },
        { id: "finance", label: "Finance", count: "", color: "green" },
        { id: "crew", label: "Crew", count: "", color: "purple" },
        { id: "projects", label: "Projects", count: "", color: "orange" },
        { id: "system", label: "System", count: "", color: "neutral" },
    ];

    let filteredNotifications = notifications.filter(n => {
        const cat = getCategory(n);
        switch (section) {
            case "unread": return !n.isRead;
            case "finance": return cat === "finance";
            case "crew": return cat === "crew";
            case "projects": return cat === "projects";
            case "system": return cat === "system";
            case "all":
            default: return true;
        }
    });

    if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        filteredNotifications = filteredNotifications.filter(n => {
            const titleMatch = (n.title || "").toLowerCase().includes(q);
            const descMatch = (n.description || "").toLowerCase().includes(q);
            const sourceMatch = (n.source?.name || "").toLowerCase().includes(q);
            const projectMatch = (n.metadata?.projectCode || "").toLowerCase().includes(q);
            // Also check for status keyword matches
            const statusMatch = (n.metadata?.status || "").toLowerCase().includes(q);
            
            return titleMatch || descMatch || sourceMatch || projectMatch || statusMatch;
        });
    }

    if (isEmbedded) {
        filteredNotifications = filteredNotifications.slice(0, 50);
    }

    const handleMarkAsRead = async (id: string) => {
        await markAsRead(id);
    };

    // Grouping Logic
    const groupNotifications = (items: UiNotification[]) => {
        const groups: Record<string, UiNotification[]> = {
            "New": [],
            "Today": [],
            "Yesterday": [],
            "Last 7 Days": [],
            "Last 30 Days": [],
        };

        const now = new Date();
        const sevenDaysAgo = subDays(now, 7);
        const thirtyDaysAgo = subDays(now, 30);

        items.forEach(item => {
            const date = new Date(item.fullTimestamp);

            if (differenceInHours(now, date) < 1) {
                groups["New"].push(item);
            } else if (isToday(date)) {
                groups["Today"].push(item);
            } else if (isYesterday(date)) {
                groups["Yesterday"].push(item);
            } else if (isAfter(date, sevenDaysAgo)) {
                groups["Last 7 Days"].push(item);
            } else if (isAfter(date, thirtyDaysAgo)) {
                groups["Last 30 Days"].push(item);
            }
        });

        return groups;
    };

    const renderPermissionBanner = () => {
        if (typeof window === "undefined" || !("Notification" in window)) return null;

        if (permission === "default") {
            return (
                <div className="mb-6 p-5 rounded-3xl border border-blue-100 dark:border-blue-500/25 bg-gradient-to-br from-blue-50/60 to-indigo-50/40 dark:from-blue-950/20 dark:to-indigo-950/15 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm relative overflow-hidden group/banner">
                    <div className="flex gap-4 items-start relative z-10">
                        <div className="p-3 rounded-2xl bg-blue-100/80 dark:bg-blue-500/25 text-blue-600 dark:text-blue-400 shrink-0 shadow-inner">
                            <Sparkles className="w-5 h-5 animate-pulse" />
                        </div>
                        <div className="space-y-1">
                            <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Enable Push Notifications</h4>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed max-w-[380px]">
                                Stay updated on finance requests, project mentions, and crew assignments in real-time.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={requestPermission}
                        className="self-start sm:self-center px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400 rounded-full transition-all active:scale-[0.97] hover:shadow-lg hover:shadow-blue-500/20 dark:hover:shadow-none whitespace-nowrap shrink-0 relative z-10"
                    >
                        Enable Notif.
                    </button>
                </div>
            );
        }

        if (permission === "denied") {
            return (
                <div className="mb-6 p-5 rounded-3xl border border-red-100 dark:border-red-500/25 bg-gradient-to-br from-red-50/60 to-rose-50/40 dark:from-red-950/15 dark:to-rose-950/10 backdrop-blur-xl flex flex-col sm:flex-row sm:items-start justify-between gap-4 shadow-sm relative overflow-hidden">
                    <div className="flex gap-4 items-start relative z-10">
                        <div className="p-3 rounded-2xl bg-red-100/80 dark:bg-red-500/25 text-red-600 dark:text-red-400 shrink-0 shadow-inner">
                            <AlertTriangle className="w-5 h-5 animate-bounce" />
                        </div>
                        <div className="space-y-1">
                            <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Notifications Blocked</h4>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed max-w-[420px]">
                                Real-time alerts are blocked in browser settings. Please click the site settings lock icon in your URL bar and reset the notification permission to &quot;Allow&quot; to receive updates.
                            </p>
                        </div>
                    </div>
                </div>
            );
        }

        return null;
    };

    const grouped = groupNotifications(filteredNotifications);
    const hasAnyNotification = filteredNotifications.length > 0;

    return (
        <div className="animate-in fade-in duration-500">
            {/* Page Header inside the content box */}
            {!isEmbedded && (
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-neutral-900 dark:text-white tracking-tight">
                        Notifications
                    </h1>
                </div>
            )}

            {/* Desktop Cards */}
            {!isEmbedded && (
                <SummaryFilterCards
                    items={filterItems}
                    selectedId={section}
                    onSelect={(id) => router.push(`/dashboard/notifications?section=${id}`)}
                    className="hidden md:flex mb-10"
                    isScrollable={true}
                />
            )}
            
            {/* Mobile Unified Navbar Pill */}
            {!isEmbedded && (
                <div className="md:hidden fixed top-0 left-0 right-0 z-50 px-3 pt-3 pb-2 pointer-events-none">
                    <div
                        className="flex items-center gap-2 p-1.5 rounded-full backdrop-blur-2xl backdrop-saturate-150 border border-white/50 transition-all duration-300 pointer-events-auto shadow-sm"
                        style={{
                            background: 'rgba(255,255,255,0.6)',
                            boxShadow: '0 4px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.6)'
                        }}
                    >
                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/60 border border-white/70 shrink-0">
                            <Bell className="w-3.5 h-3.5 text-neutral-900 fill-neutral-900" />
                            <span className="font-medium text-neutral-900 text-xs">Notifications</span>
                        </div>
                        <div className="w-px h-5 bg-neutral-300/40 shrink-0" />
                        <div className="flex-1 overflow-hidden min-w-0">
                            <MobileNotificationTabs
                                items={filterItems}
                                selectedId={section}
                                onSelect={(id) => router.push(`/dashboard/notifications?section=${id}`)}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Mobile Spacer */}
            {!isEmbedded && <div className="md:hidden h-20" />}

            {/* Embedded Search Bar (for drawer) */}
            {isEmbedded && !hideSearchInput && !loading && !error && hasAnyNotification && (
                <div className="flex items-center justify-between gap-4 mb-6 px-1">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                        <input
                            type="text"
                            placeholder="Search notifications..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 pr-3 py-2 text-sm border border-neutral-200 rounded-full bg-white focus:outline-none focus:border-neutral-400 w-full"
                        />
                    </div>
                </div>
            )}

            <div className="space-y-4 pb-24 lg:pb-0">
                {renderPermissionBanner()}
                {loading ? (
                    <div className="text-center py-20 animate-pulse">
                        <Bell className="w-8 h-8 mx-auto mb-3 text-neutral-200" />
                        <p className="text-neutral-400 font-medium">Fetching workspace updates...</p>
                    </div>
                ) : error ? (
                    <div className="p-10 text-center border-2 border-red-50 border-dashed rounded-3xl bg-red-50/20">
                        <p className="text-red-600 font-medium mb-2">Sync Interrupted</p>
                        <p className="text-sm text-red-400 mb-6">{error}</p>
                        <button onClick={refresh} className="text-sm font-medium text-white bg-red-500 px-8 py-3 rounded-full hover:bg-red-600 shadow-xl shadow-red-200/50">
                            Reconnect System
                        </button>
                    </div>
                ) : !hasAnyNotification ? (
                    <div className="flex flex-col items-center justify-center p-8 mt-4 text-center">
                        <div className="w-16 h-16 mb-4 rounded-full bg-neutral-100 dark:bg-white/5 flex items-center justify-center border border-neutral-200/50 dark:border-white/10 shadow-sm">
                            <span className="text-3xl">🎉</span>
                        </div>
                        <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-1">You&apos;re all set!</h3>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-[200px]">
                            {section === "all"
                                ? "You don't have any notifications right now."
                                : `No notifications in ${section} at the moment.`}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-10">
                        {Object.entries(grouped).map(([label, items]) => {
                            if (items.length === 0) return null;
                            return (
                                <div key={label} className="animate-in fade-in slide-in-from-bottom-2 duration-500 first:mt-8">
                                    <h3 className="text-xs font-medium text-neutral-900 dark:text-white mb-4 px-1">
                                        {label}
                                    </h3>
                                    <div className="space-y-3">
                                        {items.map((item) => (
                                            <NotificationWrapper 
                                                key={item.id} 
                                                item={item} 
                                                handleMarkAsRead={handleMarkAsRead} 
                                            />
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {!isEmbedded && hasMore && hasAnyNotification && (
                    <div className="pt-8 text-center">
                        <button 
                            onClick={loadMore}
                            disabled={loading}
                            className="text-xs font-medium text-neutral-400 hover:text-neutral-600 transition-colors px-6 py-2.5 rounded-full hover:bg-neutral-100 border border-neutral-200/50 disabled:opacity-50"
                        >
                            {loading ? "Loading..." : "See More Notifications"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

function NotificationWrapper({ item, handleMarkAsRead }: { item: UiNotification, handleMarkAsRead: (id: string) => void }) {
    if (item.metadata?.link) {
        return (
            <div className="relative group/wrapper">
                <Link href={item.metadata.link} className="block group transition-all active:scale-[0.98]" onClick={() => !item.isRead && handleMarkAsRead(item.id)}>
                    <NotificationItem item={item} onMarkAsRead={handleMarkAsRead} />
                </Link>
            </div>
        );
    }
    return (
        <div onClick={() => !item.isRead && handleMarkAsRead(item.id)} className="transition-all active:scale-[0.98] cursor-pointer relative group/wrapper">
            <NotificationItem item={item} onMarkAsRead={handleMarkAsRead} />
        </div>
    );
}
