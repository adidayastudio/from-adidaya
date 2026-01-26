"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Search, Inbox, Filter, Bell } from "lucide-react";
import { SummaryFilterCards, FilterItem } from "@/components/dashboard/shared/SummaryFilterCards";
import NotificationItem from "./NotificationItem";
import { fetchNotifications, markNotificationAsRead, Notification as ApiNotification } from "@/lib/api/notifications";
import { Notification as UiNotification, MOCK_NOTIFICATIONS } from "./data";
import { createClient } from "@/utils/supabase/client";
import { subscribeToPush } from "@/lib/api/push-registration";
import Link from "next/link";

export type NotificationSection = "all" | "unread" | "finance" | "projects" | "system";

export default function NotificationsContent({ section }: { section: NotificationSection }) {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [notifications, setNotifications] = useState<UiNotification[]>([]);
    const [permission, setPermission] = useState<NotificationPermission>("default");
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const supabase = createClient();

    const [debugState, setDebugState] = useState({
        auth: "Checking...",
        realtime: "Disconnected",
        push: "Checking...",
        lastSync: "Never"
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

    // Map helper
    const mapNotification = (n: any): UiNotification => ({
        id: n.id,
        type: n.type,
        isRead: n.is_read,
        title: n.title,
        description: n.description,
        timestamp: new Date(n.created_at).toLocaleString(),
        fullTimestamp: new Date(n.created_at),
        source: {
            name: n.metadata?.actor || (n.category === 'finance' ? 'Finance' : n.category === 'projects' ? 'Projects' : "System"),
            color: n.category === 'finance' ? 'bg-green-100 text-green-700' :
                n.category === 'projects' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600',
        },
        metadata: {
            ...n.metadata,
            category: n.category,
            link: n.link
        },
    });

    // User & Auth Sync
    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            const uid = user?.id || null;
            setCurrentUserId(uid);
            setDebugState(prev => ({ ...prev, auth: uid ? `Session active (${uid.substring(0, 8)})` : "No session" }));
        };
        fetchUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            const uid = session?.user?.id || null;
            setCurrentUserId(uid);
            setDebugState(prev => ({ ...prev, auth: uid ? `Session changed (${uid.substring(0, 8)})` : "No session" }));
        });

        return () => subscription.unsubscribe();
    }, [supabase]);

    // Realtime Subscription
    useEffect(() => {
        if (!currentUserId) {
            console.log("⏳ [Realtime] Waiting for user ID before subscribing...");
            return;
        }

        console.log("📡 [Realtime] Subscribing for user:", currentUserId);
        setDebugState(prev => ({ ...prev, realtime: "Connecting..." }));

        const channel = (supabase as any)
            .channel('realtime-notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                },
                (payload: any) => {
                    console.log("📥 [Realtime] Event received:", payload.new);

                    if (payload.new && payload.new.user_id === currentUserId) {
                        console.log("🎯 [Realtime] Match found! Triggering notification.");
                        triggerLocalNotification(payload.new.title, payload.new.description);
                        const mappedItem = mapNotification(payload.new);
                        setNotifications(prev => [mappedItem, ...prev]);
                    } else {
                        console.log("⏭️ [Realtime] User ID mismatch:", { payload: payload.new.user_id, current: currentUserId });
                    }
                }
            )
            .subscribe((status: string) => {
                console.log("🔌 [Realtime] Channel status:", status);
                setDebugState(prev => ({ ...prev, realtime: status }));
            });

        return () => {
            console.log("📴 [Realtime] Unsubscribing...");
            (supabase as any).removeChannel(channel);
        };
    }, [supabase, currentUserId]);

    const triggerLocalNotification = (title: string, body: string, addToUI = false) => {
        console.log("🔔 [Notification] Attempting to trigger:", { title, body, addToUI });

        if (addToUI) {
            const simulatedNotif = {
                id: 'sim-' + Date.now(),
                type: 'info' as any,
                is_read: false,
                title,
                description: body,
                created_at: new Date().toISOString(),
                metadata: { actor: 'User Session' }
            };
            setNotifications(prev => [mapNotification(simulatedNotif), ...prev]);
        }

        // Play chime
        try {
            const audio = new Audio("data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU9vT18A/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/kJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQA=");
            audio.volume = 0.5;
            audio.play().catch(() => { });
        } catch (e) { }

        if (Notification.permission === "granted") {
            const options = {
                body,
                icon: '/android-chrome-192x192.png',
                badge: '/android-chrome-192x192.png',
                tag: 'adidaya-notif-' + Date.now(),
                data: { link: '/dashboard/notifications' }
            };

            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
            if ('serviceWorker' in navigator && isMobile) {
                console.log("📲 [Notification] Sending via SW (Mobile/PWA)");
                navigator.serviceWorker.ready.then(reg => reg.showNotification(title, options));
            } else {
                console.log("💻 [Notification] Sending via Native Constructor");
                try {
                    new Notification(title, options);
                } catch (e) {
                    console.log("⚠️ [Notification] Native failed, falling back to SW");
                    if ('serviceWorker' in navigator) {
                        navigator.serviceWorker.ready.then(reg => reg.showNotification(title, options));
                    }
                }
            }
        } else {
            console.warn("🚫 [Notification] Permission not granted:", Notification.permission);
        }
    };

    // Fetch Data
    const loadNotifications = async () => {
        if (!currentUserId) return;

        console.log("📥 [Data] Fetching notifications for:", currentUserId);
        setLoading(true);
        setError(null);
        try {
            const data = await fetchNotifications();
            console.log("📥 [Data] Received:", data.length, "items");
            const mapped = data.map(mapNotification);
            setNotifications(mapped);
            setDebugState(prev => ({ ...prev, lastSync: new Date().toLocaleTimeString() }));
        } catch (err: any) {
            console.error("❌ [Data] Load error:", err);
            setError(err.message || "Failed to load notifications");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (currentUserId) {
            loadNotifications();
        }
    }, [currentUserId]);

    // Cleanup and Counts logic follows...


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
        { id: "all", label: "All", count: loading ? "-" : counts.all, color: "neutral" },
        { id: "unread", label: "Unread", count: loading ? "-" : counts.unread, color: "blue" },
        { id: "finance", label: "Finance", count: loading ? "-" : notifications.filter(n => getCategory(n) === 'finance').length, color: "green" },
        { id: "projects", label: "Projects", count: loading ? "-" : notifications.filter(n => getCategory(n) === 'projects').length, color: "orange" },
        { id: "system", label: "System", count: loading ? "-" : notifications.filter(n => getCategory(n) === 'system').length, color: "neutral" },
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
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        await markNotificationAsRead(id);
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

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* HEADER & DEBUG - Hidden on Mobile */}
            <div className="hidden md:block space-y-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-neutral-900">Notifications</h1>
                </div>

                {/* Debug Dashboard */}
                <div className="flex flex-wrap gap-2 px-4 py-2 bg-neutral-50 rounded-xl border border-neutral-200/60 shadow-inner">
                    <div className="flex items-center gap-1.5 min-w-fit">
                        <div className={clsx("w-1.5 h-1.5 rounded-full", currentUserId ? "bg-green-500" : "bg-red-500")} />
                        <span className="text-[10px] font-bold text-neutral-500 uppercase">{debugState.auth}</span>
                    </div>
                    <span className="text-neutral-300">•</span>
                    <div className="flex items-center gap-1.5 min-w-fit">
                        <div className={clsx("w-1.5 h-1.5 rounded-full", debugState.realtime === "SUBSCRIBED" ? "bg-green-500" : "bg-orange-500")} />
                        <span className="text-[10px] font-bold text-neutral-500 uppercase">Live: {debugState.realtime}</span>
                    </div>
                    <span className="text-neutral-300">•</span>
                    <div className="flex items-center gap-1.5 min-w-fit">
                        <div className={clsx("w-1.5 h-1.5 rounded-full", debugState.push.includes("Synced") ? "bg-green-500" : "bg-orange-500")} />
                        <span className="text-[10px] font-bold text-neutral-500 uppercase">Push: {debugState.push}</span>
                    </div>
                </div>

                <SummaryFilterCards
                    items={filterItems}
                    selectedId={section}
                    onSelect={(id) => router.push(`/dashboard/notifications?section=${id}`)}
                />
            </div>

            <div className="h-px bg-neutral-100" />

            {/* TOOLBAR - Desktop Only */}
            <div className="hidden md:flex items-center justify-between gap-4">
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
                        onClick={loadNotifications}
                        className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-full transition-all active:scale-90"
                        title={"Last sync: " + debugState.lastSync}
                    >
                        <Filter className={clsx("w-5 h-5", loading && "animate-spin")} />
                    </button>
                </div>
            </div>

            <div className="space-y-3 pb-24 lg:pb-0">
                {loading ? (
                    <div className="text-center py-20 animate-pulse">
                        <Bell className="w-8 h-8 mx-auto mb-3 text-neutral-200" />
                        <p className="text-neutral-400 font-medium">Fetching workspace updates...</p>
                    </div>
                ) : error ? (
                    <div className="p-10 text-center border-2 border-red-50 border-dashed rounded-3xl bg-red-50/20">
                        <p className="text-red-600 font-bold mb-2">Sync Interrupted</p>
                        <p className="text-sm text-red-400 mb-6">{error}</p>
                        <button onClick={loadNotifications} className="text-sm font-bold text-white bg-red-500 px-8 py-3 rounded-full hover:bg-red-600 shadow-xl shadow-red-200/50">
                            Reconnect System
                        </button>
                    </div>
                ) : filteredNotifications.length > 0 ? (
                    filteredNotifications.map((item) => (
                        item.metadata?.link ? (
                            <Link key={item.id} href={item.metadata.link} className="block group transition-all active:scale-[0.98]" onClick={() => !item.isRead && handleMarkAsRead(item.id)}>
                                <NotificationItem item={item} />
                            </Link>
                        ) : (
                            <div key={item.id} onClick={() => !item.isRead && handleMarkAsRead(item.id)} className="transition-all active:scale-[0.98]">
                                <NotificationItem item={item} />
                            </div>
                        )
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center gap-3 h-64 text-sm text-neutral-400 rounded-3xl border border-dashed border-neutral-200 bg-neutral-50/50">
                        <Inbox className="w-8 h-8 text-neutral-200" />
                        <p className="font-medium italic">Everything is up to date.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
