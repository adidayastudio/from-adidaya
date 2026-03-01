import { supabase } from "../supabaseClient";
import { ActionModel, ActionStatus, ActionPriority } from "@/types/task";

export async function fetchAllActions(): Promise<ActionModel[]> {
    const { data, error } = await supabase
        .from("actions")
        .select(`
            *,
            projects ( project_code, project_name ),
            action_reviewers ( user_id )
        `)
        .order("created_at", { ascending: false });

    if (error || !data) {
        console.error("Failed to fetch actions:", error);
        return [];
    }

    return data.map(mapDbToAction);
}

export async function createAction(
    actionData: Omit<ActionModel, "id" | "createdAt" | "updatedAt" | "projectCode" | "projectName">,
    reviewerIds: string[]
): Promise<ActionModel | null> {

    // 1. Insert Action
    const { data, error } = await supabase
        .from("actions")
        .insert({
            title: actionData.title,
            description: actionData.description,
            project_id: actionData.projectId,
            wbs_id: actionData.wbsId || null,
            source_task_id: actionData.sourceTaskId || null,
            deadline_date: actionData.deadlineDate,
            deadline_time: actionData.deadlineTime || null,
            status: actionData.status,
            priority: actionData.priority,
            requested_by: actionData.requestedBy
        })
        .select(`
            *,
            projects ( project_code, project_name )
        `)
        .single();

    if (error || !data) {
        console.error("Failed to create action:", error);
        return null;
    }

    const newAction = data;

    // 2. Insert Reviewers
    if (reviewerIds && reviewerIds.length > 0) {
        const reviewerRows = reviewerIds.map(uid => ({
            action_id: newAction.id,
            user_id: uid
        }));
        await supabase.from("action_reviewers").insert(reviewerRows);
    }

    return mapDbToAction({
        ...newAction,
        action_reviewers: reviewerIds.map(id => ({ user_id: id }))
    });
}

function mapDbToAction(dbRow: any): ActionModel {
    return {
        id: dbRow.id,
        title: dbRow.title,
        description: dbRow.description,
        projectId: dbRow.project_id,
        wbsId: dbRow.wbs_id,
        sourceTaskId: dbRow.source_task_id,
        deadlineDate: dbRow.deadline_date,
        deadlineTime: dbRow.deadline_time,
        status: dbRow.status,
        priority: dbRow.priority,
        requestedBy: dbRow.requested_by,
        createdAt: dbRow.created_at,
        updatedAt: dbRow.updated_at,

        projectCode: dbRow.projects?.project_code,
        projectName: dbRow.projects?.project_name,
        reviewers: dbRow.action_reviewers ? dbRow.action_reviewers.map((ar: any) => ar.user_id) : []
    };
}
