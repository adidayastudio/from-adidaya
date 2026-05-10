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
    const [hasMore, setHasMore] = useState(true);
    const PAGE_SIZE = 50;

    // Map helper
    const mapNotification = (n: any): UiNotification => {
        let link = n.link;
        if (n.category === 'finance' && n.metadata?.requestId && link && !link.includes('requestId=')) {
            link += `${link.includes('?') ? '&' : '?'}requestId=${n.metadata.requestId}`;
        }

        return {
            id: n.id,
            type: n.type,
            isRead: n.is_read,
            title: n.title,
            description: n.description,
            timestamp: new Date(n.created_at).toLocaleString(),
            fullTimestamp: new Date(n.created_at),
            source: {
                name: n.metadata?.actor || (n.category === 'finance' ? 'Finance' : n.category === 'projects' ? 'Projects' : n.category === 'crew' ? 'Crew' : "System"),
                color: n.category === 'finance' ? 'bg-green-100 text-green-700' :
                    n.category === 'projects' ? 'bg-blue-100 text-blue-700' : 
                    n.category === 'crew' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600',
            },
            metadata: {
                ...n.metadata,
                category: n.category,
                link: link
            },
        };
    };

    // 1. Auth Sync
    useEffect(() => {
        const fetchUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setCurrentUserId(session?.user?.id || null);
        };
        fetchUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
            setCurrentUserId(session?.user?.id || null);
        });

        return () => subscription.unsubscribe();
    }, [supabase]);

    // 2. Load Notifications
    const loadNotifications = async (isMore = false) => {
        if (!currentUserId) return;
        setLoading(true);
        setError(null);
        try {
            const currentOffset = isMore ? notifications.length : 0;
            const data = await fetchNotifications(currentUserId, PAGE_SIZE, currentOffset);
            const mapped = data.map(mapNotification);
            
            if (isMore) {
                setNotifications(prev => {
                    const existingIds = new Set(prev.map(n => n.id));
                    const newItems = mapped.filter(n => !existingIds.has(n.id));
                    return [...prev, ...newItems];
                });
            } else {
                setNotifications(mapped);
            }
            
            setHasMore(data.length === PAGE_SIZE);
        } catch (err: any) {
            setError(err.message || "Failed to load notifications");
        } finally {
            setLoading(false);
        }
    };

    const loadMore = () => {
        if (!loading && hasMore) {
            loadNotifications(true);
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
        refresh: () => loadNotifications(false),
        loadMore,
        hasMore,
        currentUserId
    };
}
