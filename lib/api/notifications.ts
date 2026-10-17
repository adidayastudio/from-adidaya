import { supabase, APP_MODE } from "../supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { format } from "date-fns";
import { fetchCrewMembers, fetchDailyLogs, fetchCrewRequests } from "./crew";

// -------------------------------------------------------
// Types
// -------------------------------------------------------

export type NotificationType = "info" | "mention" | "approval" | "system" | "success" | "warning";

export interface LocalNotification {
    id: string;
    text: string;
    module: string;
    user: string;
    time: string; // Format: "dd/MM/yyyy, HH:mm:ss"
    unread: boolean;
    category: "finance" | "crew" | "projects" | "system";
    link?: string;
    description?: string;
    title?: string;
    tenantId?: string;
    workspaceId?: string;
    requestId?: string;
    requestType?: "purchasing" | "reimbursement";
    projectCode?: string;
    action?: string;
    ref?: string;
    subjectUser?: string;
}

export type NotificationInsert = Omit<LocalNotification, "id" | "time" | "unread">;

// -------------------------------------------------------
// Helper: Fetch Admins & Supervisors (Identical to from-adidaya)
// -------------------------------------------------------

export async function fetchAdmins(): Promise<string[]> {
    try {
        const { data, error } = await supabase
            .from("user_roles")
            .select("user_id, role")
            .in("role", ["admin", "superadmin", "super_admin", "administrator", "supervisor", "finance"]);
        if (error) throw error;
        return (data || []).map((r: any) => r.user_id).filter(Boolean);
    } catch (e) {
        console.error("Failed to fetch admins:", e);
        return [];
    }
}

// -------------------------------------------------------
// Supabase Notifications CRUD
// -------------------------------------------------------

function createBroadcastId(): string {
    return `broadcast-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function getNotificationRecipientIds(actorUserId: string | null): Promise<string[]> {
    const ids = new Set<string>();
    if (actorUserId) ids.add(actorUserId);

    try {
        const { data, error } = await supabase
            .from("profiles")
            .select("id");

        if (error) {
            console.error("Failed to fetch notification recipients:", error.message);
            return Array.from(ids);
        }

        (data || []).forEach((profile: any) => {
            if (profile?.id) ids.add(profile.id);
        });
    } catch (e) {
        console.error("Failed to resolve notification recipients:", e);
    }

    return Array.from(ids);
}

function mapToValidNotificationType(action?: string, category?: string): NotificationType {
    const valid: NotificationType[] = ["info", "mention", "approval", "system", "success", "warning"];
    if (action && valid.includes(action.toLowerCase() as NotificationType)) {
        return action.toLowerCase() as NotificationType;
    }
    if (category === "finance" || action === "approval" || action === "submitted") {
        return "approval";
    }
    return "info";
}

function buildNotificationPayload(
    notification: NotificationInsert,
    broadcastId: string,
    userId?: string
): Record<string, any> {
    const text = notification.description || notification.text || "";
    const title = notification.title || (
        notification.projectCode 
            ? `${notification.module || "Notification"} • ${notification.projectCode}`
            : (notification.module || "Notification")
    );

    const payload: Record<string, any> = {
        title: title.length > 100 ? title.substring(0, 100) : title,
        description: text,
        type: mapToValidNotificationType(notification.action, notification.category),
        category: (notification.category || "system").toLowerCase(),
        link: notification.link || null,
        is_read: false,
        metadata: {
            broadcastId,
            module: notification.module,
            actor: notification.user,
            ref: notification.ref,
            action: notification.action,
            projectCode: notification.projectCode,
            subjectUser: notification.subjectUser,
            requestId: notification.requestId,
            requestType: notification.requestType,
        },
    };

    if (userId) {
        payload.user_id = userId;
    }
    if (notification.tenantId) {
        payload.tenant_id = notification.tenantId;
    }
    if (notification.workspaceId) {
        payload.workspace_id = notification.workspaceId;
    }

    return payload;
}

/**
 * Direct Create Notification (From-Adidaya API Parity)
 */
export async function createNotification(notification: {
    user_id: string;
    type?: string;
    category?: string;
    title: string;
    description: string;
    link?: string;
    metadata?: any;
}): Promise<boolean> {
    try {
        const type = mapToValidNotificationType(notification.type, notification.category);
        const { error } = await supabase
            .from("notifications")
            .insert([{
                user_id: notification.user_id,
                type,
                category: (notification.category || "system").toLowerCase(),
                title: notification.title,
                description: notification.description,
                link: notification.link || null,
                is_read: false,
                metadata: notification.metadata || {},
            }]);
        if (error) throw error;
        return true;
    } catch (e) {
        console.error("Failed to create notification:", e);
        return false;
    }
}

/**
 * Insert a notification into Supabase.
 * Supports targeting specific users (admins/supervisors/creators) or broadcasting.
 */
export async function addLocalNotification(
    notification: NotificationInsert,
    targetUserIds?: string[]
): Promise<LocalNotification | null> {
    try {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id || null;
        
        let recipientIds = targetUserIds;
        if (!recipientIds || recipientIds.length === 0) {
            if (notification.category === "finance" || notification.action === "approval") {
                const admins = await fetchAdmins();
                recipientIds = admins.length > 0 ? admins : await getNotificationRecipientIds(userId);
            } else {
                recipientIds = await getNotificationRecipientIds(userId);
            }
        }

        const broadcastId = createBroadcastId();
        const dbPayloads = recipientIds.length > 0
            ? recipientIds.map(recipientId => buildNotificationPayload(notification, broadcastId, recipientId))
            : [buildNotificationPayload(notification, broadcastId)];

        const { data, error } = await supabase
            .from("notifications")
            .insert(dbPayloads)
            .select();

        if (error) {
            console.error("Failed to insert notification to Supabase:", error.message);
            return null;
        }

        const currentUserRow = (data || []).find((row: any) => row.user_id === userId) || data?.[0];
        return currentUserRow ? mapDbToLocal(currentUserRow) : null;
    } catch (e) {
        console.error("Failed to add notification:", e);
        return null;
    }
}

/**
 * Fetch the authenticated user’s complete Adidaya inbox, including history.
 */
export async function getLocalNotifications(expectedUserId?: string): Promise<LocalNotification[]> {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user || (expectedUserId && user.id !== expectedUserId)) return [];
    const rows: any[] = [];
    for (let offset = 0; ; offset += 500) {
        const { data, error } = await supabase.from("notifications").select("*").eq("user_id", user.id)
            .order("created_at", { ascending: false }).order("id", { ascending: false }).range(offset, offset + 499);
        if (error) throw error;
        rows.push(...(data || []));
        if (!data || data.length < 500) return rows.map(mapDbToLocal);
    }
}

export async function markNotificationAsRead(id: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Sign in to mark notifications as read.");
    const rawId = id.startsWith("db-") ? id.slice(3) : id;
    const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", rawId).eq("user_id", user.id);
    if (error) throw error;
}

/**
 * Mark all notifications as read.
 */
export async function markNotificationsAsRead(): Promise<void> {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error("Sign in to manage notifications.");
    const { error } = await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    if (error) throw error;
}

// -------------------------------------------------------
// Mapper: DB row → LocalNotification
// -------------------------------------------------------

function inferCategoryAndModule(row: any, meta: any, text: string): { category: "finance" | "crew" | "projects" | "system"; module: string } {
    const rawType = (row.category || row.type || meta.type || meta.category || "").toLowerCase();
    const rawModule = (meta.module || "").trim();
    const lowerText = text.toLowerCase();
    const lowerModule = rawModule.toLowerCase();

    // 1. Explicit matches
    if (
        rawType === "finance" ||
        lowerModule === "purchasing" ||
        lowerModule === "reimbursement" ||
        lowerModule === "finance" ||
        meta.requestType === "purchasing" ||
        meta.requestType === "reimbursement"
    ) {
        const module = rawModule && rawModule !== "System" ? rawModule : (lowerText.includes("reimbursement") ? "Reimbursement" : "Purchasing");
        return { category: "finance", module };
    }

    if (
        rawType === "crew" ||
        lowerModule === "crew" ||
        lowerModule === "payroll" ||
        lowerModule === "attendance" ||
        lowerModule === "clock"
    ) {
        const module = rawModule && rawModule !== "System" ? rawModule : (lowerText.includes("payroll") ? "Payroll" : "Crew");
        return { category: "crew", module };
    }

    if (
        rawType === "projects" ||
        lowerModule === "projects" ||
        lowerModule === "project" ||
        lowerModule === "tasks"
    ) {
        return { category: "projects", module: rawModule && rawModule !== "System" ? rawModule : "Projects" };
    }

    // 2. Keyword heuristic deduction for finance/crew/projects
    if (
        lowerText.includes("purchasing") ||
        lowerText.includes("reimbursement") ||
        lowerText.includes("invoice") ||
        lowerText.includes("expense") ||
        lowerText.includes("cash advance") ||
        lowerText.includes("paid:") ||
        lowerText.includes("approved:") ||
        lowerText.includes("revision") ||
        /^po-|^exp-/i.test(meta.ref || "") ||
        /purchasing|reimbursement/i.test(meta.action || "")
    ) {
        const module = rawModule && rawModule !== "System" ? rawModule : (lowerText.includes("reimbursement") ? "Reimbursement" : "Purchasing");
        return { category: "finance", module };
    }

    if (
        lowerText.includes("daily log") ||
        lowerText.includes("payroll") ||
        lowerText.includes("clock in") ||
        lowerText.includes("clock out") ||
        lowerText.includes("attendance") ||
        lowerText.includes("crew")
    ) {
        const module = rawModule && rawModule !== "System" ? rawModule : (lowerText.includes("payroll") ? "Payroll" : "Crew");
        return { category: "crew", module };
    }

    if (
        lowerText.includes("project") ||
        lowerText.includes("milestone") ||
        lowerText.includes("task")
    ) {
        return { category: "projects", module: rawModule && rawModule !== "System" ? rawModule : "Projects" };
    }

    const isAnnouncement = lowerText.includes("announcement") || lowerModule === "announcement";
    return {
        category: "system",
        module: rawModule || (isAnnouncement ? "Announcement" : "System"),
    };
}

function mapDbToLocal(row: any): LocalNotification {
    const meta = row.metadata || {};
    const createdAt = row.created_at ? new Date(row.created_at) : new Date();

    const title = row.title || "";
    const description = row.description || row.message || "";
    const fullText = description || title || "";
    const { category, module } = inferCategoryAndModule(row, meta, fullText);

    // Extract projectCode from text/title if not provided
    let projectCode = meta.projectCode || undefined;
    if (!projectCode) {
        const searchTarget = title.includes("•") ? title : fullText;
        if (searchTarget.includes("•")) {
            const parts = searchTarget.split("•").map((s: string) => s.trim());
            if (parts.length > 1 && parts[1].length <= 8) {
                projectCode = parts[1];
            }
        }
    }

    let requestType = meta.requestType || undefined;
    if (!requestType) {
        if (module.toLowerCase().includes("reimbursement") || fullText.toLowerCase().includes("reimbursement")) {
            requestType = "reimbursement";
        } else if (module.toLowerCase().includes("purchasing") || fullText.toLowerCase().includes("purchasing")) {
            requestType = "purchasing";
        }
    }

    // Derive action label if not in metadata
    let action = meta.action;
    if (!action) {
        const lowerDesc = fullText.toLowerCase();
        if (lowerDesc.includes("marking as paid") || lowerDesc.includes("paid")) action = "paid";
        else if (lowerDesc.includes("approved")) action = "approved";
        else if (lowerDesc.includes("rejected")) action = "rejected";
        else if (lowerDesc.includes("revision")) action = "revision";
        else if (lowerDesc.includes("submitted")) action = "submitted";
        else action = "info";
    }

    // Derive subjectUser if not in metadata
    let subjectUser = meta.subjectUser || meta.actor;
    if (!subjectUser && fullText) {
        const words = fullText.trim().split(" ");
        if (words.length > 0 && !["submitted", "approved", "rejected", "marking"].includes(words[0].toLowerCase())) {
            subjectUser = words[0];
        }
    }

    let link = row.link || meta.link || undefined;
    if (category === 'finance' && meta.requestId && typeof link === 'string' && link.startsWith('/') && !link.startsWith('//')) {
        const url = new URL(link, 'https://adidaya.invalid');
        if (!url.searchParams.has('requestId')) url.searchParams.set('requestId', meta.requestId);
        link = url.pathname + url.search + url.hash;
    }
    return {
        id: `db-${row.id}`,
        text: description || title,
        title: title || description,
        description,
        link,
        module,
        user: meta.actor || subjectUser || "System",
        time: format(createdAt, "dd/MM/yyyy, HH:mm:ss"),
        unread: !row.is_read,
        category,
        projectCode,
        action,
        ref: meta.ref || undefined,
        requestId: meta.requestId || undefined,
        requestType,
        subjectUser: subjectUser || meta.actor || "System",
    };
}

// -------------------------------------------------------
// Time-based Schedulers (daily log reminders + Saturday payroll)
// -------------------------------------------------------

async function checkTimeBasedReminders(): Promise<void> {
    try {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id;
        if (!userId) return;

        const now = new Date();
        const currentHour = now.getHours();
        const todayStr = format(now, "yyyy-MM-dd");

        let activeHour: number | null = null;
        if (currentHour >= 22) {
            activeHour = 22;
        } else if (currentHour >= 16) {
            activeHour = 16;
        } else if (currentHour >= 8) {
            activeHour = 8;
        }

        if (activeHour !== null) {
            const key = `@adidaya:sent_reminder:${todayStr}_${activeHour}`;
            const alreadySent = await AsyncStorage.getItem(key);
            if (!alreadySent) {
                await addLocalNotification({
                    text: `Reminder: Silakan isi daily log crew untuk hari ini (${activeHour}:00).`,
                    module: "Crew",
                    user: "System",
                    category: "system",
                }, [userId]);
                await AsyncStorage.setItem(key, "true");
            }
        }
    } catch (e) {
        console.error("Failed in checkTimeBasedReminders:", e);
    }
}

async function checkSaturdayPayrollAlert(workspaceId: string): Promise<void> {
    try {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id;
        if (!userId) return;

        const now = new Date();
        const todayStr = format(now, "yyyy-MM-dd");

        if (now.getDay() !== 6) return;

        const alertKey = `@adidaya:sent_saturday_payroll:${todayStr}`;
        const alreadySent = await AsyncStorage.getItem(alertKey);
        if (alreadySent) return;

        const day = now.getDay();
        const diff = now.getDate() - day;
        const sunday = new Date(now.getFullYear(), now.getMonth(), diff);

        const [crewMembers, dailyLogs, requests] = await Promise.all([
            fetchCrewMembers(workspaceId).catch(() => []),
            fetchDailyLogs(workspaceId).catch(() => []),
            fetchCrewRequests(workspaceId).catch(() => []),
        ]);

        const activeCrew = crewMembers.filter(c => c.status === "ACTIVE");
        if (activeCrew.length === 0) return;

        const weekDates: string[] = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(sunday);
            d.setDate(sunday.getDate() + i);
            weekDates.push(format(d, "yyyy-MM-dd"));
        }

        let isComplete = true;
        for (const crew of activeCrew) {
            for (const dateStr of weekDates) {
                const hasLog = dailyLogs.some(
                    log => log.crewId === crew.id && log.date === dateStr && log.status !== ""
                );
                if (!hasLog) { isComplete = false; break; }
            }
            if (!isComplete) break;
        }

        if (isComplete) {
            const hasPendingRequest = requests.some(req => {
                if (req.status !== "PENDING") return false;
                return req.startDate >= weekDates[0] && req.startDate <= weekDates[6];
            });
            if (hasPendingRequest) isComplete = false;
        }

        if (isComplete) {
            await addLocalNotification({
                text: "Alert: Data payroll crew minggu ini sudah siap untuk di-review dan di-export.",
                module: "Payroll",
                user: "System",
                category: "system",
            }, [userId]);
        } else {
            await addLocalNotification({
                text: "Alert: Data payroll crew minggu ini belum selesai. Harap lengkapi daily log atau selesaikan pending request.",
                module: "Payroll",
                user: "System",
                category: "system",
            }, [userId]);
        }

        await AsyncStorage.setItem(alertKey, "true");
    } catch (e) {
        console.error("Failed checkSaturdayPayrollAlert:", e);
    }
}

export async function checkAndTriggerSchedulers(workspaceId: string): Promise<void> {
    if (APP_MODE === "adidaya") return;
    await checkTimeBasedReminders();
    await checkSaturdayPayrollAlert(workspaceId);
}
