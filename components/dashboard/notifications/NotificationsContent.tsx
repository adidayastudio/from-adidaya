"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Search, Inbox, Filter, Bell } from "lucide-react";
import { SummaryFilterCards, FilterItem } from "@/components/dashboard/shared/SummaryFilterCards";
import NotificationItem from "./NotificationItem";
import { fetchNotifications, markNotificationAsRead, Notification as ApiNotification } from "@/lib/api/notifications";
import { Notification as UiNotification } from "./data";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";

export type NotificationSection = "all" | "unread" | "finance" | "projects" | "system";

export default function NotificationsContent({ section }: { section: NotificationSection }) {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [notifications, setNotifications] = useState<UiNotification[]>([]);
    const [permission, setPermission] = useState<NotificationPermission>("default");
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const supabase = createClient();

    // Check Permission on Mount
    useEffect(() => {
        if ("Notification" in window) {
            setPermission(Notification.permission);
        }
    }, []);

    const requestPermission = async () => {
        if ("Notification" in window) {
            try {
                const result = await Notification.requestPermission();
                setPermission(result);
                if (result === "granted") {
                    // Test notification immediately after click to verify
                    const options = {
                        body: "You will now receive alerts for new activities.",
                        icon: '/android-chrome-192x192.png',
                        badge: '/android-chrome-192x192.png',
                        tag: 'enabling-notifications'
                    };

                    try {
                        new Notification("Notifications Enabled", options);
                    } catch (e) {
                        if ('serviceWorker' in navigator) {
                            navigator.serviceWorker.ready.then(reg => reg.showNotification("Notifications Enabled", options));
                        }
                    }
                }
            } catch (error) {
                console.error("Error requesting notification permission:", error);
            }
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

    // Fetch user for realtime matching
    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            setCurrentUserId(data.user?.id || null);
        });
    }, [supabase]);

    // Realtime Subscription
    useEffect(() => {
        if (!currentUserId) return;

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
                    if (payload.new && payload.new.user_id === currentUserId) {
                        triggerLocalNotification(payload.new.title, payload.new.description);
                        const mappedItem = mapNotification(payload.new);
                        setNotifications(prev => [mappedItem, ...prev]);
                    }
                }
            )
            .subscribe();

        return () => { (supabase as any).removeChannel(channel); };
    }, [supabase, currentUserId]);

    const triggerLocalNotification = (title: string, body: string) => {
        console.log("🔔 [Notification] Attempting to trigger:", { title, body });

        // Play chime
        try {
            const audio = new Audio("data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU9vT18A/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/kJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQA=");
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
    useEffect(() => {
        const loadNotifications = async () => {
            setLoading(true);
            const data = await fetchNotifications();
            const mapped = data.map(mapNotification);
            setNotifications(mapped);
            setLoading(false);
        };

        loadNotifications();
    }, []);

    // Counts
    const counts = {
        all: notifications.length,
        unread: notifications.filter(n => !n.isRead).length,
        finance: notifications.filter(n => (n.metadata as any)?.category === "finance" || n.type === "approval").length,
        projects: notifications.filter(n => (n.metadata as any)?.category === "projects" || n.type === "mention").length,
        system: notifications.filter(n => (n.metadata as any)?.category === "system" || n.type === "system").length,
    };

    const getCategory = (n: UiNotification) => (n.metadata as any)?.category ||
        (n.type === 'approval' ? 'finance' : n.type === 'mention' ? 'projects' : 'system');

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

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="space-y-4">
                <h1 className="text-2xl font-bold text-neutral-900">Notifications</h1>
                <SummaryFilterCards
                    items={filterItems}
                    selectedId={section}
                    onSelect={(id) => router.push(`/dashboard/notifications?section=${id}`)}
                />
            </div>

            <div className="h-px bg-neutral-100" />

            <div className="flex items-center justify-between gap-2">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                        type="text"
                        placeholder="Search notifications..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 pr-3 py-2 text-sm border border-neutral-200 rounded-full bg-white focus:outline-none focus:border-neutral-400 w-full"
                    />
                </div>

                {/* Permission Buttons */}
                {/* Diagnostic Test Button */}
                <button
                    onClick={() => triggerLocalNotification("Test Alert", "This is a simulated database notification banner.")}
                    className="flex items-center gap-2 px-4 py-2 bg-neutral-100 text-neutral-600 text-sm font-medium rounded-full hover:bg-neutral-200 transition-colors border border-neutral-200 shadow-sm"
                >
                    <Bell className="w-4 h-4 opacity-50" />
                    Simulate Event
                </button>

                {permission === "default" && (
                    <button
                        onClick={requestPermission}
                        className="flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white text-sm font-medium rounded-full hover:bg-neutral-800 transition-colors shadow-sm"
                    >
                        <Bell className="w-4 h-4" />
                        Enable Alerts
                    </button>
                )}

                {permission === "denied" && (
                    <span className="text-xs text-red-500 font-medium px-2">
                        Notifications Blocked by Browser
                    </span>
                )}
            </div>

            <div className="space-y-3">
                {loading ? (
                    <div className="text-center py-10 text-neutral-400">Loading notifications...</div>
                ) : filteredNotifications.length > 0 ? (
                    filteredNotifications.map((item) => (
                        (item.metadata as any)?.link ? (
                            <Link key={item.id} href={(item.metadata as any).link} className="block group" onClick={() => !item.isRead && handleMarkAsRead(item.id)}>
                                <NotificationItem item={item} />
                            </Link>
                        ) : (
                            <div key={item.id} onClick={() => !item.isRead && handleMarkAsRead(item.id)} className="cursor-default">
                                <NotificationItem item={item} />
                            </div>
                        )
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center gap-2 h-40 text-sm text-neutral-400 italic rounded-xl border border-dashed border-neutral-200 bg-neutral-50/50">
                        <Inbox className="w-5 h-5 text-neutral-300" />
                        <p>No notifications found.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
