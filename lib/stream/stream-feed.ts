/**
 * STREAM FEED — Unified activity feed data layer
 * Fetches and aggregates activities from stream_activities table.
 */

import { createClient } from "@/utils/supabase/client";
import type { FeedItem, StreamActivity, FeedItemType } from "./types";
import { getIntentEmoji } from "./stream-classifier";

// ============================================
// FEED FETCHING
// ============================================

export async function fetchFeedItems(limit = 50): Promise<FeedItem[]> {
    const supabase = createClient();
    const items: FeedItem[] = [];

    // 1. Fetch stream activities
    const { data: activities, error } = await supabase
        .from("stream_activities")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

    if (!error && activities) {
        for (const act of activities) {
            items.push(streamActivityToFeedItem(act));
        }
    }

    // 2. Fetch recent projects (for general feed context)
    const { data: recentProjects } = await supabase
        .from("projects")
        .select("id, project_code, project_name, status, location, created_at, meta")
        .order("created_at", { ascending: false })
        .limit(10);

    if (recentProjects) {
        for (const proj of recentProjects) {
            // Don't duplicate if already from stream
            const isDuplicate = items.some(
                i => i.entityType === "project" && i.entityId === proj.id
            );
            if (!isDuplicate) {
                items.push({
                    id: `proj-${proj.id}`,
                    type: "project_created",
                    title: proj.project_name,
                    subtitle: `${proj.project_code} · ${proj.location?.city || ""}`,
                    description: `Project ${proj.status}`,
                    timestamp: proj.created_at,
                    entityType: "project",
                    entityId: proj.id,
                    entityHref: `/flow/projects/${proj.id}`,
                    accentColor: "blue",
                    metadata: { projectCode: proj.project_code, ...proj.meta },
                });
            }
        }
    }

    // 3. Fetch recent tasks
    const { data: recentTasks } = await supabase
        .from("tasks")
        .select("id, title, status, priority, deadline_date, created_at")
        .order("created_at", { ascending: false })
        .limit(10);

    if (recentTasks) {
        for (const task of recentTasks) {
            const isDuplicate = items.some(
                i => i.entityType === "task" && i.entityId === task.id
            );
            if (!isDuplicate) {
                items.push({
                    id: `task-${task.id}`,
                    type: "task_added",
                    title: task.title,
                    subtitle: `${task.priority} · ${task.status}`,
                    description: task.deadline_date ? `Due: ${task.deadline_date}` : undefined,
                    timestamp: task.created_at,
                    entityType: "task",
                    entityId: task.id,
                    entityHref: `/task`,
                    accentColor: "violet",
                    metadata: { status: task.status, priority: task.priority },
                });
            }
        }
    }

    // Sort all by timestamp, newest first
    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return items.slice(0, limit);
}

// ============================================
// MAPPING
// ============================================

function streamActivityToFeedItem(act: any): FeedItem {
    const intentType = act.intent_type;
    const feedType = intentToFeedType(intentType);

    return {
        id: act.id,
        type: feedType,
        title: getActivityTitle(act),
        subtitle: getActivitySubtitle(act),
        timestamp: act.created_at,
        userId: act.user_id,
        entityType: act.entity_type,
        entityId: act.entity_id,
        rawInput: act.raw_input,
        status: act.status,
        accentColor: getIntentAccentColor(intentType),
        metadata: act.parsed_data,
        classification: {
            type: intentType,
            data: act.parsed_data,
            confidence: 1,
            rawInput: act.raw_input,
        },
    };
}

function intentToFeedType(intent: string): FeedItemType {
    switch (intent) {
        case "create_project": return "project_created";
        case "log_expense": return "expense_logged";
        case "update_progress": return "progress_updated";
        case "add_task": return "task_added";
        default: return "system_event";
    }
}

function getActivityTitle(act: any): string {
    const data = act.parsed_data;
    switch (act.intent_type) {
        case "create_project": return data?.name || act.raw_input;
        case "log_expense": return data?.item || act.raw_input;
        case "update_progress": return data?.target || act.raw_input;
        case "add_task": return data?.title || act.raw_input;
        default: return act.raw_input;
    }
}

function getActivitySubtitle(act: any): string {
    const data = act.parsed_data;
    switch (act.intent_type) {
        case "create_project":
            return [data?.city, data?.type].filter(Boolean).join(" · ") || "New Project";
        case "log_expense":
            const parts = [];
            if (data?.qty && data?.unit) parts.push(`${data.qty} ${data.unit}`);
            if (data?.amount) parts.push(`Rp ${data.amount.toLocaleString("id-ID")}`);
            return parts.join(" · ") || "Expense";
        case "update_progress":
            return data?.progress ? `${data.progress}%` : "Progress Update";
        case "add_task":
            const taskParts = [];
            if (data?.priority && data.priority !== "normal") taskParts.push(data.priority);
            if (data?.dueDate) taskParts.push(data.dueDate);
            return taskParts.join(" · ") || "Task";
        default:
            return "Activity";
    }
}

function getIntentAccentColor(intent: string): string {
    switch (intent) {
        case "create_project": return "blue";
        case "log_expense": return "emerald";
        case "update_progress": return "amber";
        case "add_task": return "violet";
        default: return "neutral";
    }
}

// ============================================
// DATE GROUPING UTILITIES
// ============================================

export function groupFeedByDate(items: FeedItem[]): Map<string, FeedItem[]> {
    const groups = new Map<string, FeedItem[]>();
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    for (const item of items) {
        const date = new Date(item.timestamp);
        let label: string;

        if (isSameDay(date, today)) {
            label = "Today";
        } else if (isSameDay(date, yesterday)) {
            label = "Yesterday";
        } else {
            label = date.toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
            });
        }

        if (!groups.has(label)) {
            groups.set(label, []);
        }
        groups.get(label)!.push(item);
    }

    return groups;
}

function isSameDay(a: Date, b: Date): boolean {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}
