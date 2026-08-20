/**
 * STREAM ACTIONS — Server-side persistence layer
 * Saves classified stream inputs to Supabase and links to existing entities.
 */

import { createClient } from "@/utils/supabase/client";
import type {
    StreamActivity,
    StreamActivityStatus,
    StreamIntentType,
    ParsedData,
    ParsedProjectData,
    ParsedExpenseData,
    ParsedTaskData,
    FeedItem,
} from "./types";

const supabase = createClient();

// ============================================
// STREAM ACTIVITY CRUD
// ============================================

export async function saveStreamActivity(
    intentType: StreamIntentType,
    rawInput: string,
    parsedData: ParsedData,
    status: StreamActivityStatus = "pending"
): Promise<StreamActivity | null> {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
        .from("stream_activities")
        .insert({
            user_id: user?.id,
            intent_type: intentType,
            raw_input: rawInput,
            parsed_data: parsedData,
            status,
        })
        .select()
        .single();

    if (error) {
        console.error("❌ Failed to save stream activity:", error);
        return null;
    }

    return mapDbToStreamActivity(data);
}

export async function updateStreamActivityStatus(
    activityId: string,
    status: StreamActivityStatus,
    entityType?: string,
    entityId?: string
): Promise<boolean> {
    const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
    };

    if (entityType) updateData.entity_type = entityType;
    if (entityId) updateData.entity_id = entityId;

    const { error } = await supabase
        .from("stream_activities")
        .update(updateData)
        .eq("id", activityId);

    if (error) {
        console.error("❌ Failed to update stream activity:", error);
        return false;
    }

    return true;
}

export async function updateStreamActivityParsedData(
    activityId: string,
    parsedData: ParsedData,
    intentType?: StreamIntentType
): Promise<boolean> {
    const updateData: any = {
        parsed_data: parsedData,
        updated_at: new Date().toISOString(),
    };

    if (intentType) updateData.intent_type = intentType;

    const { error } = await supabase
        .from("stream_activities")
        .update(updateData)
        .eq("id", activityId);

    if (error) {
        console.error("❌ Failed to update stream activity parsed data:", error);
        return false;
    }

    return true;
}

export async function deleteStreamActivity(
    activityId: string
): Promise<boolean> {
    const { error } = await supabase
        .from("stream_activities")
        .delete()
        .eq("id", activityId);

    if (error) {
        console.error("❌ Failed to delete stream activity:", error);
        return false;
    }

    return true;
}

export async function fetchStreamActivities(
    limit = 50
): Promise<StreamActivity[]> {
    const { data, error } = await supabase
        .from("stream_activities")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

    if (error || !data) {
        console.error("❌ Failed to fetch stream activities:", error);
        return [];
    }

    return data.map(mapDbToStreamActivity);
}

// ============================================
// ENTITY CREATORS (bridge to existing APIs)
// ============================================

export async function createProjectFromStream(
    parsedData: ParsedProjectData,
    activityId: string
): Promise<{ success: boolean; entityId?: string }> {
    try {
        // Generate project code from name (first 3 chars uppercase)
        const cleanName = (parsedData.name || "").replace(/[^a-zA-Z]/g, "").toUpperCase();
        let code = cleanName.slice(0, 3);
        if (code.length < 3) code = code.padEnd(3, "X");

        // Fetch existing projects to determine next number
        const { data: existingProjects } = await supabase
            .from("projects")
            .select("project_number")
            .order("project_number", { ascending: false })
            .limit(1);

        const maxNo = existingProjects?.[0]?.project_number
            ? parseInt(existingProjects[0].project_number, 10)
            : 0;
        const projectNo = (maxNo + 1).toString().padStart(3, "0");

        const { data: { user } } = await supabase.auth.getUser();

        const { data, error } = await supabase
            .from("projects")
            .insert({
                project_code: code,
                project_number: projectNo,
                project_name: parsedData.name,
                status: "active",
                location: {
                    city: parsedData.city || "",
                },
                meta: {
                    type: parsedData.type || "design-build",
                    source: "stream",
                },
                start_date: new Date().toISOString().split("T")[0],
                created_by: user?.id,
            })
            .select("id")
            .single();

        if (error || !data) {
            console.error("❌ Failed to create project from stream:", error);
            return { success: false };
        }

        // Update stream activity with entity link
        await updateStreamActivityStatus(activityId, "saved", "project", data.id);

        return { success: true, entityId: data.id };
    } catch (err) {
        console.error("❌ createProjectFromStream error:", err);
        return { success: false };
    }
}

export async function createTaskFromStream(
    parsedData: ParsedTaskData,
    activityId: string
): Promise<{ success: boolean; entityId?: string }> {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        const { data, error } = await supabase
            .from("tasks")
            .insert({
                title: parsedData.title,
                status: "todo",
                priority: parsedData.priority || "normal",
                deadline_date: parsedData.dueDate || null,
                created_by: user?.id,
            })
            .select("id")
            .single();

        if (error || !data) {
            console.error("❌ Failed to create task from stream:", error);
            return { success: false };
        }

        await updateStreamActivityStatus(activityId, "saved", "task", data.id);

        return { success: true, entityId: data.id };
    } catch (err) {
        console.error("❌ createTaskFromStream error:", err);
        return { success: false };
    }
}

export async function logExpenseFromStream(
    parsedData: ParsedExpenseData,
    activityId: string
): Promise<{ success: boolean; entityId?: string }> {
    // For now, just save to stream activities as confirmed
    // Full expense integration comes in Phase 2
    await updateStreamActivityStatus(activityId, "saved", "expense");
    return { success: true };
}

export async function updateProgressFromStream(
    parsedData: any,
    activityId: string
): Promise<{ success: boolean; entityId?: string }> {
    // For now, just save to stream activities as confirmed
    await updateStreamActivityStatus(activityId, "saved", "report");
    return { success: true };
}

// ============================================
// DB MAPPING
// ============================================

function mapDbToStreamActivity(row: any): StreamActivity {
    return {
        id: row.id,
        workspaceId: row.workspace_id,
        userId: row.user_id,
        intentType: row.intent_type,
        rawInput: row.raw_input,
        parsedData: row.parsed_data,
        entityType: row.entity_type,
        entityId: row.entity_id,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}
