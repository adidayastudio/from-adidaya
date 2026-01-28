"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Search, Inbox, Filter, Bell } from "lucide-react";
import { SummaryFilterCards, FilterItem } from "@/components/dashboard/shared/SummaryFilterCards";
import { MobileNotificationTabs } from "./MobileNotificationTabs";
import { isToday, isYesterday, differenceInHours, isAfter, subDays } from "date-fns";
import NotificationItem from "./NotificationItem";
import { markNotificationAsRead } from "@/lib/api/notifications";
import { Notification as UiNotification } from "./data";
import { createClient } from "@/utils/supabase/client";
import { subscribeToPush } from "@/lib/api/push-registration";
import Link from "next/link";
import { useNotifications } from "@/hooks/useNotifications";

export type NotificationSection = "all" | "unread" | "finance" | "projects" | "system";

export default function NotificationsContent({ section }: { section: NotificationSection }) {
    const router = useRouter();
    const { notifications, loading, error, refresh, markAsRead, currentUserId } = useNotifications();
    const [searchQuery, setSearchQuery] = useState("");
    const [permission, setPermission] = useState<NotificationPermission>("default");
    const supabase = createClient();

    const [debugState, setDebugState] = useState({
        auth: "Checking...",
        realtime: "Subscribed (Hook)",
        push: "Checking...",
        lastSync: "Auto"
    });

    // Permission Sync
    useEffect(() => {
        if ("Notification" in window) {
            setPermission(Notification.permission);
            setDebugState(prev => ({ ...prev, push: Notification.permission }));
        }
    }, [permission]);

    const requestPermission = async () => {
        if (!("Notification" in window)) return;

        try {
            const result = await Notification.requestPermission();
            setPermission(result);

            if (result === "granted") {
                const ok = await subscribeToPush();
                setDebugState(prev => ({ ...prev, push: ok ? "granted (Synced)" : "granted (Sync Failed)" }));
                // Final success alert
                triggerLocalNotification("Notifications Enabled", "You will now receive background alerts for new activities.");
            }
        } catch (error) {
            console.error("Error requesting notification permission:", error);
        }
    };

    const triggerLocalNotification = async (title: string, body: string, addToUI = false) => {
        console.log("🔔 [Notification] Attempting to trigger:", { title, body, addToUI });

        if (Notification.permission !== "granted") {
            const result = await Notification.requestPermission();
            if (result !== "granted") {
                alert("Notifications are blocked! Please enable them in your browser settings (Lock icon in URL bar).");
                return;
            }
        }

        const options = {
            body,
            icon: '/android-chrome-192x192.png',
            badge: '/android-chrome-192x192.png',
            tag: 'adidaya-notif-' + Date.now(),
            data: { link: '/dashboard/notifications' }
        };

        try {
            // Try Service Worker first (More reliable on modern browsers/PWA)
            if ('serviceWorker' in navigator) {
                const reg = await navigator.serviceWorker.ready;
                await reg.showNotification(title, options);
            } else {
                // Fallback to classic API
                new Notification(title, options);
            }
        } catch (e) {
            console.error("Notification Error:", e);
            alert("Error sending notification: " + e);
        }
    };

    // Counts
    const getCategory = (n: UiNotification) => (n.metadata as any)?.category ||
        (n.type === 'approval' ? 'finance' : n.type === 'mention' ? 'projects' : 'system');

    const counts = {
        all: notifications.length,
        unread: notifications.filter(n => !n.isRead).length,
        finance: notifications.filter(n => getCategory(n) === "finance").length,
        projects: notifications.filter(n => getCategory(n) === "projects").length,
        system: notifications.filter(n => getCategory(n) === "system").length,
    };

    const filterItems: FilterItem[] = [
        { id: "all", label: "All", count: "", color: "neutral" },
        { id: "unread", label: "Unread", count: loading ? "-" : counts.unread, color: "blue" },
        { id: "finance", label: "Finance", count: "", color: "green" },
        { id: "projects", label: "Projects", count: "", color: "orange" },
        { id: "system", label: "System", count: "", color: "neutral" },
    ];

    let filteredNotifications = notifications.filter(n => {
        const cat = getCategory(n);
        switch (section) {
            case "unread": return !n.isRead;
            case "finance": return cat === "finance";
            case "projects": return cat === "projects";
            case "system": return cat === "system";
            case "all":
            default: return true;
        }
    });

    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filteredNotifications = filteredNotifications.filter(n =>
            n.title.toLowerCase().includes(q) ||
            n.description.toLowerCase().includes(q)
        );
    }

    const handleMarkAsRead = async (id: string) => {
        await markAsRead(id);
    };

    // Proactive Push Refresh: If already granted, ensures endpoint is up to date in Supabase
    useEffect(() => {
        if (permission === "granted" && currentUserId) {
            console.log("🔄 [Push] Refreshing registration...");
            subscribeToPush().then(ok => {
                setDebugState(prev => ({ ...prev, push: ok ? "granted (Synced)" : "granted (Sync Failed)" }));
            });
        }
    }, [permission, currentUserId]);

    // Handle initial prompt (Safari often blocks auto-prompts, so we keep this subtle)
    useEffect(() => {
        if (permission === "default") {
            const timer = setTimeout(() => {
                requestPermission().catch(() => { });
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [permission]);



    // Grouping Logic
    const groupNotifications = (items: UiNotification[]) => {
        const groups = {
            new: [] as UiNotification[],
            today: [] as UiNotification[],
            yesterday: [] as UiNotification[],
            last7Days: [] as UiNotification[],
            last30Days: [] as UiNotification[],
        };

        const now = new Date();
        const sevenDaysAgo = subDays(now, 7);
        const thirtyDaysAgo = subDays(now, 30);

        items.forEach(item => {
            const date = new Date(item.fullTimestamp);

            if (differenceInHours(now, date) < 1) {
                groups.new.push(item);
            } else if (isToday(date)) {
                groups.today.push(item);
            } else if (isYesterday(date)) {
                groups.yesterday.push(item);
            } else if (isAfter(date, sevenDaysAgo)) {
                groups.last7Days.push(item);
            } else if (isAfter(date, thirtyDaysAgo)) {
                groups.last30Days.push(item);
            }
            // Older items are currently ignored/hidden in the default view per request for "All History" button
            // Or we can just include them in "Last 30 Days" bucket if user prefers, but "All History" implies separation.
        });

        return groups;
    };

    const grouped = groupNotifications(filteredNotifications);
    const hasAnyNotification = filteredNotifications.length > 0;

    return (
        <div className="animate-in fade-in duration-500">
            {/* HEADER & DEBUG */}
            <div className="space-y-4">
                <div className="hidden md:flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-neutral-900">Notifications</h1>
                </div>



                {/* Debug Dashboard - Desktop Only */}
                <div className="hidden md:flex flex-wrap gap-2 px-4 py-2 bg-neutral-50 rounded-xl border border-neutral-200/60 shadow-inner">
                    <div className="flex items-center gap-1.5 min-w-fit">
                        <div className={clsx("w-1.5 h-1.5 rounded-full", currentUserId ? "bg-green-500" : "bg-red-500")} />
                        <span className="text-[10px] font-bold text-neutral-500 uppercase">
                            {currentUserId ? "Session Active" : "No Session"}
                        </span>
                    </div>
                    <span className="text-neutral-300">•</span>
                    <div className="flex items-center gap-1.5 min-w-fit">
                        <div className={clsx("w-1.5 h-1.5 rounded-full", debugState.realtime.includes("Subscribed") ? "bg-green-500" : "bg-orange-500")} />
                        <span className="text-[10px] font-bold text-neutral-500 uppercase">Live: {debugState.realtime}</span>
                    </div>
                    <span className="text-neutral-300">•</span>
                    <div className="flex items-center gap-1.5 min-w-fit">
                        <div className={clsx("w-1.5 h-1.5 rounded-full", debugState.push.includes("Synced") ? "bg-green-500" : "bg-orange-500")} />
                        <span className="text-[10px] font-bold text-neutral-500 uppercase">Push: {debugState.push}</span>
                    </div>
                </div>





                {/* Desktop Cards */}
                <SummaryFilterCards
                    items={filterItems}
                    selectedId={section}
                    onSelect={(id) => router.push(`/dashboard/notifications?section=${id}`)}
                    className="hidden md:grid"
                />
            </div>

            {/* Mobile Unified Navbar Pill - Exact "MobileNavBar" Replica (Fixed Position) */}
            <div className="md:hidden fixed top-0 left-0 right-0 z-50 px-3 pt-3 pb-2 pointer-events-none">
                <div
                    className="flex items-center gap-2 p-1.5 rounded-full backdrop-blur-2xl backdrop-saturate-150 border border-white/50 transition-all duration-300 pointer-events-auto shadow-sm"
                    style={{
                        background: 'rgba(255,255,255,0.6)',
                        boxShadow: '0 4px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.6)'
                    }}
                >
                    {/* Left: Title (Styled like App Switcher Pill) */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/60 border border-white/70 shrink-0">
                        <Bell className="w-3.5 h-3.5 text-neutral-900 fill-neutral-900" />
                        <span className="font-semibold text-neutral-900 text-xs">Notifications</span>
                    </div>

                    {/* Divider */}
                    <div className="w-px h-5 bg-neutral-300/40 shrink-0" />

                    {/* Right: Scrollable Tabs */}
                    <div className="flex-1 overflow-hidden min-w-0">
                        <MobileNotificationTabs
                            items={filterItems}
                            selectedId={section}
                            onSelect={(id) => router.push(`/dashboard/notifications?section=${id}`)}
                        />
                    </div>
                </div>
            </div>

            {/* Mobile Spacer to compensate for Fixed Header */}
            <div className="md:hidden h-20" />

            {/* Mobile Mobile Debug Buttons (Temporary) */}
            <div className="md:hidden flex items-center justify-end gap-2 px-4 mb-4">
                <button
                    onClick={() => triggerLocalNotification("Health Check", "Testing Banner...", true)}
                    className="text-[10px] font-bold text-neutral-400 border border-neutral-200 px-2 py-1 rounded-full hover:bg-neutral-50"
                >
                    Test
                </button>
                <button
                    onClick={async () => {
                        if (confirm("Reset connection?")) {
                            const { unsubscribeFromPush, subscribeToPush } = await import("@/lib/api/push-registration");
                            await unsubscribeFromPush();
                            await subscribeToPush();
                            window.location.reload();
                        }
                    }}
                    className="text-[10px] font-bold text-neutral-400 border border-neutral-200 px-2 py-1 rounded-full hover:bg-red-50 hover:text-red-500"
                >
                    Reset
                </button>
            </div>

            <div className="h-px bg-neutral-100 hidden md:block my-6" />

            {/* TOOLBAR - Desktop Only */}
            <div className="hidden md:flex items-center justify-between gap-4 mb-6">
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

                <div className="flex items-center gap-2">
                    {permission === "default" && (
                        <button
                            onClick={requestPermission}
                            className="bg-neutral-900 text-white text-xs font-bold px-4 py-2 rounded-full hover:bg-neutral-800 transition-all flex items-center gap-2 shadow-lg active:scale-95"
                        >
                            <Bell className="w-3.5 h-3.5" />
                            Enable App Alerts
                        </button>
                    )}

                    <button
                        onClick={() => triggerLocalNotification("Health Check", "Testing Banner and Realtime Engine...", true)}
                        className="bg-neutral-100 text-neutral-600 text-xs font-bold px-4 py-2 rounded-full hover:bg-neutral-200 transition-all border border-neutral-200 active:scale-95"
                    >
                        Test Alert
                    </button>

                    <button
                        onClick={async () => {
                            if (confirm("Reset notifications connection? This is useful if you updated the keys.")) {
                                const { unsubscribeFromPush, subscribeToPush } = await import("@/lib/api/push-registration");
                                await unsubscribeFromPush();
                                await subscribeToPush();
                                alert("Connection reset! If valid permissions exist, you are now re-registered.");
                                window.location.reload();
                            }
                        }}
                        className="bg-white text-neutral-400 text-xs font-bold px-3 py-2 rounded-full hover:bg-red-50 hover:text-red-500 transition-all border border-neutral-200"
                        title="Reset Connection"
                    >
                        Reset
                    </button>

                    <button
                        onClick={refresh}
                        className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-full transition-all active:scale-90"
                        title="Sync"
                    >
                        <Filter className={clsx("w-5 h-5", loading && "animate-spin")} />
                    </button>
                </div>
            </div>

            <div className="space-y-6 pb-24 lg:pb-0">
                {loading ? (
                    <div className="text-center py-20 animate-pulse">
                        <Bell className="w-8 h-8 mx-auto mb-3 text-neutral-200" />
                        <p className="text-neutral-400 font-medium">Fetching workspace updates...</p>
                    </div>
                ) : error ? (
                    <div className="p-10 text-center border-2 border-red-50 border-dashed rounded-3xl bg-red-50/20">
                        <p className="text-red-600 font-bold mb-2">Sync Interrupted</p>
                        <p className="text-sm text-red-400 mb-6">{error}</p>
                        <button onClick={refresh} className="text-sm font-bold text-white bg-red-500 px-8 py-3 rounded-full hover:bg-red-600 shadow-xl shadow-red-200/50">
                            Reconnect System
                        </button>
                    </div>
                ) : !hasAnyNotification ? (
                    <div className="flex flex-col items-center justify-center gap-3 h-64 text-sm text-neutral-400 rounded-3xl border border-dashed border-neutral-200 bg-neutral-50/50">
                        <Inbox className="w-8 h-8 text-neutral-200" />
                        <p className="font-medium italic">Everything is up to date.</p>
                    </div>
                ) : (
                    <>
                        {/* New */}
                        {grouped.new.length > 0 && (
                            <div className="space-y-2">
                                <h3 className="text-sm font-bold text-neutral-900 px-1">New</h3>
                                {grouped.new.map(item => (
                                    <NotificationWrapper key={item.id} item={item} handleMarkAsRead={handleMarkAsRead} />
                                ))}
                            </div>
                        )}

                        {/* Today */}
                        {grouped.today.length > 0 && (
                            <div className="space-y-2">
                                <h3 className="text-sm font-bold text-neutral-900 px-1">Today</h3>
                                {grouped.today.map(item => (
                                    <NotificationWrapper key={item.id} item={item} handleMarkAsRead={handleMarkAsRead} />
                                ))}
                            </div>
                        )}

                        {/* Yesterday */}
                        {grouped.yesterday.length > 0 && (
                            <div className="space-y-2">
                                <h3 className="text-sm font-bold text-neutral-900 px-1">Yesterday</h3>
                                {grouped.yesterday.map(item => (
                                    <NotificationWrapper key={item.id} item={item} handleMarkAsRead={handleMarkAsRead} />
                                ))}
                            </div>
                        )}

                        {/* Last 7 Days */}
                        {grouped.last7Days.length > 0 && (
                            <div className="space-y-2">
                                <h3 className="text-sm font-bold text-neutral-900 px-1">Last 7 Days</h3>
                                {grouped.last7Days.map(item => (
                                    <NotificationWrapper key={item.id} item={item} handleMarkAsRead={handleMarkAsRead} />
                                ))}
                            </div>
                        )}

                        {/* Last 30 Days */}
                        {grouped.last30Days.length > 0 && (
                            <div className="space-y-2">
                                <h3 className="text-sm font-bold text-neutral-900 px-1">Last 30 Days</h3>
                                {grouped.last30Days.map(item => (
                                    <NotificationWrapper key={item.id} item={item} handleMarkAsRead={handleMarkAsRead} />
                                ))}
                            </div>
                        )}

                        <div className="pt-8 text-center">
                            <button className="text-xs font-bold text-neutral-400 hover:text-neutral-600 transition-colors px-4 py-2 rounded-full hover:bg-neutral-100">
                                View All History
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function NotificationWrapper({ item, handleMarkAsRead }: { item: UiNotification, handleMarkAsRead: (id: string) => void }) {
    if (item.metadata?.link) {
        return (
            <Link href={item.metadata.link} className="block group transition-all active:scale-[0.98]" onClick={() => !item.isRead && handleMarkAsRead(item.id)}>
                <NotificationItem item={item} />
            </Link>
        );
    }
    return (
        <div onClick={() => !item.isRead && handleMarkAsRead(item.id)} className="transition-all active:scale-[0.98]">
            <NotificationItem item={item} />
        </div>
    );
}
