import { useCallback, useEffect, useRef, useState } from "react";
import { useUserContext } from "@/context/UserProvider";
import { supabase } from "@/lib/supabase";
import { getLocalNotifications, markNotificationAsRead, markNotificationsAsRead, LocalNotification } from "@/lib/api/notifications";

export function useAdidayaNotifications() {
    const { user } = useUserContext();
    const [notifications, setNotifications] = useState<LocalNotification[]>([]);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const generation = useRef(0);

    const refresh = useCallback(async () => {
        const run = ++generation.current;
        if (!user) { setNotifications([]); setLoading(false); return; }
        setLoading(true);
        try { 
            const list = await getLocalNotifications(user.id); 
            if (run === generation.current) { 
                setNotifications(list); 
                setError(""); 
            } 
        } catch (e) { 
            if (run === generation.current) setError(e instanceof Error ? e.message : "Failed to load notifications"); 
        } finally { 
            if (run === generation.current) setLoading(false); 
        }
    }, [user?.id]);

    useEffect(() => {
        setNotifications([]); 
        void refresh();
        if (!user) return;

        const channel = supabase.channel(`adidaya-inbox:${user.id}:${Math.random().toString(36).slice(2)}`)
            .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, (payload: any) => {
                if (!payload.new || !payload.new.user_id || payload.new.user_id === user.id) {
                    void refresh();
                }
            })
            .subscribe();

        return () => { 
            generation.current++; 
            void supabase.removeChannel(channel); 
        };
    }, [user?.id, refresh]);

    const markRead = useCallback(async (id: string) => {
        try { 
            await markNotificationAsRead(id); 
            setNotifications(items => items.map(item => item.id === id ? { ...item, unread: false } : item)); 
        } catch (e) { 
            setError(e instanceof Error ? e.message : "Failed to mark notification as read"); 
        }
    }, []);

    const markAllRead = useCallback(async () => {
        try { 
            await markNotificationsAsRead(); 
            setNotifications(items => items.map(item => ({ ...item, unread: false }))); 
            setError(""); 
        } catch (e) { 
            setError(e instanceof Error ? e.message : "Failed to mark notifications as read"); 
        }
    }, []);

    return { 
        notifications, 
        refresh, 
        markRead, 
        markAllRead, 
        error, 
        loading, 
        unreadCount: notifications.filter(n => n.unread).length 
    };
}
