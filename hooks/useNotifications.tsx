"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { fetchNotifications, markNotificationAsRead, Notification as ApiNotification } from "@/lib/api/notifications";
import { Notification as UiNotification } from "@/components/dashboard/notifications/data";

export function useNotifications() {
    const supabase = createClient();
    const [notifications, setNotifications] = useState<UiNotification[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [permission, setPermission] = useState<NotificationPermission>("default");
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

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

    // 1. Auth Sync
    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setCurrentUserId(user?.id || null);
        };
        fetchUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setCurrentUserId(session?.user?.id || null);
        });

        return () => subscription.unsubscribe();
    }, [supabase]);

    // 2. Load Notifications
    const loadNotifications = async () => {
        if (!currentUserId) return;
        setLoading(true);
        setError(null);
        try {
            const data = await fetchNotifications();
            setNotifications(data.map(mapNotification));
        } catch (err: any) {
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

    // 3. Realtime Subscription
    useEffect(() => {
        if (!currentUserId) return;

        const channel = (supabase as any)
            .channel('realtime-notifications-hook')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                },
                (payload: any) => {
                    if (payload.new && payload.new.user_id === currentUserId) {
                        const mappedItem = mapNotification(payload.new);
                        setNotifications(prev => [mappedItem, ...prev]);

                        // Play sound if allowed? (Optional, kept simpler here)
                    }
                }
            )
            .subscribe();

        return () => {
            (supabase as any).removeChannel(channel);
        };
    }, [supabase, currentUserId]);

    // 4. Actions
    const markAsRead = async (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        await markNotificationAsRead(id);
    };

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return {
        notifications,
        unreadCount,
        loading,
        error,
        markAsRead,
        refresh: loadNotifications,
        currentUserId
    };
}
