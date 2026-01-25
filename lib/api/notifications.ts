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

export const fetchNotifications = async () => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        // Cast to any to avoid type errors since 'notifications' isn't in generated types yet
        const { data, error } = await (supabase
            .from("notifications") as any)
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

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

export const markAllNotificationsAsRead = async () => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        const { error } = await (supabase
            .from("notifications") as any)
            .update({ is_read: true })
            .eq("user_id", user.id)
            .eq("is_read", false);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error("Error marking all as read:", error);
        return false;
    }
};
