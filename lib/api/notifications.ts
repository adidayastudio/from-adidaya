import { createClient } from "@/utils/supabase/client";

export type NotificationType = "info" | "mention" | "approval" | "system" | "success" | "warning";

export interface Notification {
    id: string;
    type: NotificationType;
    category: string;
    title: string;
    description: string;
    link?: string;
    is_read: boolean;
    metadata?: any;
    created_at: string;
}

const supabase = createClient();

export const fetchNotifications = async (userId?: string, limit: number = 50, offset: number = 0) => {
    console.log("🛠️ [API] fetchNotifications started", { userId, limit, offset });
    try {
        let currentUserId = userId;

        if (!currentUserId) {
            const { data: { user } } = await supabase.auth.getUser();
            console.log("🛠️ [API] Authenticated user:", user?.id);
            currentUserId = user?.id;
        }

        if (!currentUserId) return [];

        // Cast to any to avoid type errors since 'notifications' isn't in generated types yet
        const { data, error } = await (supabase
            .from("notifications") as any)
            .select("*")
            .eq("user_id", currentUserId)
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;
        return data as Notification[];
    } catch (error) {
        console.error("Error fetching notifications:", error);
        return [];
    }
};

export const markNotificationAsRead = async (id: string) => {
    try {
        const { error } = await (supabase
            .from("notifications") as any)
            .update({ is_read: true })
            .eq("id", id);
        if (error) throw error;
        return true;
    } catch (error) {
        console.error("Error marking notification as read:", error);
        return false;
    }
};

export const markAllNotificationsAsRead = async (userId?: string) => {
    try {
        let currentUserId = userId;

        if (!currentUserId) {
            const { data: { user } } = await supabase.auth.getUser();
            currentUserId = user?.id;
        }

        if (!currentUserId) return false;

        const { error } = await (supabase
            .from("notifications") as any)
            .update({ is_read: true })
            .eq("user_id", currentUserId)
            .eq("is_read", false);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error("Error marking all as read:", error);
        return false;
    }
};
