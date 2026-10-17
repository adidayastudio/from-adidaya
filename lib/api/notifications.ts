import { supabase } from "@/lib/supabaseClient";

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


export const fetchNotifications = async (userId?: string, limit: number = 50, offset: number = 0) => {
    console.log("🛠️ [API] fetchNotifications started", { userId, limit, offset });
    try {
        let currentUserId = userId;

        if (!currentUserId) {
            const { data: { session } } = await supabase.auth.getSession();
            currentUserId = session?.user?.id;
        }

        if (!currentUserId) return [];

        const { data, error } = await (supabase
            .from("notifications") as any)
            .select("*")
            .eq("user_id", currentUserId)
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            // Silently ignore AbortError - it's a normal browser behavior during navigation
            if (error.name === 'AbortError' || (error.message && error.message.toLowerCase().includes('aborted'))) {
                return [];
            }

            const errorDetails = {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code,
                serialized: JSON.stringify(error, Object.getOwnPropertyNames(error))
            };
            console.error("❌ [Supabase] Notifications Query Error:", errorDetails);
            return [];
        }
        return data as Notification[];
    } catch (error: any) {
        // Handle AbortError gracefully
        if (error.name === 'AbortError' || error.message?.includes('aborted')) {
            return [];
        }
        console.error("❌ [API] fetchNotifications exception:", error);
        return [];
    }
};

export const createNotification = async (notification: {
    user_id: string;
    type: NotificationType;
    category: string;
    title: string;
    description: string;
    link?: string;
    metadata?: any;
}) => {
    try {
        const { error } = await supabase
            .from("notifications")
            .insert([notification]);
        if (error) throw error;
        return true;
    } catch (error: any) {
        console.error("❌ Error creating notification:", {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
            raw: error
        });
        return null;
    }
};

export const fetchAdmins = async () => {
    try {
        const { data, error } = await supabase
            .from("user_roles")
            .select("user_id, role")
            .in("role", ["admin", "superadmin", "super_admin", "administrator", "supervisor"]);
        if (error) throw error;
        console.log("🔔 fetchAdmins found:", data?.length, "admins", data?.map(r => r.role));
        return (data || []).map(r => r.user_id);
    } catch (error: any) {
        console.error("❌ Error fetching admins:", {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
            raw: error
        });
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
    } catch (error: any) {
        if (error.name === 'AbortError' || error.message?.includes('aborted')) return false;
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
