import { supabase } from "../supabaseClient";
import { TaskModel, TaskStatus, TaskPriority } from "@/types/task";

export async function fetchAllTasks(): Promise<TaskModel[]> {
    // We fetch tasks with their joined project data. Assignees need query on task_assignees.
    const { data, error } = await supabase
        .from("tasks")
        .select(`
            *,
            projects ( project_code, project_name ),
            task_assignees ( user_id ),
            project_wbs_items!wbs_id ( wbs_code, title )
        `)
        .order("created_at", { ascending: false });

    if (error || !data) {
        console.error("Failed to fetch tasks:", error);
        return [];
    }

    return data.map(mapDbToTask);
}

export async function createTask(
    taskData: Omit<TaskModel, "id" | "createdAt" | "updatedAt" | "projectCode" | "projectName">,
    assigneeIds: string[]
): Promise<TaskModel | null> {

    // 1. Insert Task
    const { data, error } = await supabase
        .from("tasks")
        .insert({
            title: taskData.title,
            description: taskData.description,
            project_id: taskData.projectId,
            wbs_id: taskData.wbsId || null,
            deadline_date: taskData.deadlineDate,
            deadline_time: taskData.deadlineTime || null,
            status: taskData.status,
            priority: taskData.priority,
            created_by: taskData.createdBy
        })
        .select(`
            *,
            projects ( project_code, project_name ),
            project_wbs_items!wbs_id ( wbs_code, title )
        `)
        .single();

    if (error || !data) {
        console.error("❌ CREATE TASK ERROR MESSAGE:", error?.message);
        console.error("❌ CREATE TASK ERROR CODE:", error?.code);
        console.error("❌ CREATE TASK ERROR DETAILS:", error?.details);
        console.error("❌ CREATE TASK ERROR HINT:", error?.hint);
        return null;
    }

    const newTask = data;

    // 2. Insert Assignees
    if (assigneeIds && assigneeIds.length > 0) {
        const assigneeRows = assigneeIds.map(uid => ({
            task_id: newTask.id,
            user_id: uid
        }));
        await supabase.from("task_assignees").insert(assigneeRows);
    }

    return mapDbToTask({
        ...newTask,
        task_assignees: assigneeIds.map(id => ({ user_id: id }))
    });
}

function mapDbToTask(dbRow: any): TaskModel {
    return {
        id: dbRow.id,
        title: dbRow.title,
        description: dbRow.description,
        projectId: dbRow.project_id,
        wbsId: dbRow.wbs_id,
        deadlineDate: dbRow.deadline_date,
        deadlineTime: dbRow.deadline_time,
        status: dbRow.status,
        priority: dbRow.priority,
        createdBy: dbRow.created_by,
        createdAt: dbRow.created_at,
        updatedAt: dbRow.updated_at,

        projectCode: dbRow.projects?.project_code,
        projectName: dbRow.projects?.project_name,
        wbsCode: dbRow.project_wbs_items?.wbs_code,
        wbsTitle: dbRow.project_wbs_items?.title,
        assignees: dbRow.task_assignees ? dbRow.task_assignees.map((ta: any) => ta.user_id) : []
    };
}
