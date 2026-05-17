export type TaskStatus = "todo" | "in_progress" | "submitted" | "revision" | "done";
export type TaskPriority = "urgent" | "high" | "medium" | "low";
export type ActionStatus = "PENDING" | "APPROVED" | "REJECTED" | "REVISION" | "DISPUTE";
export type ActionPriority = "URGENT" | "HIGH" | "MEDIUM" | "LOW";

export interface TaskModel {
    id: string;
    title: string;
    description: string | null;
    projectId: string;
    wbsId: string | null;
    taskNumber?: string | null;
    deadlineDate: string;
    deadlineTime: string | null;
    status: TaskStatus;
    priority: TaskPriority;
    createdBy: string | null;
    createdAt: string;
    updatedAt: string;
    attachmentUrls?: string | null;
    submissionNote?: string | null;
    submissionUrls?: string | null;

    // Joins
    projectCode?: string;
    projectName?: string;
    wbsCode?: string;
    wbsTitle?: string;
    assignees?: string[]; // Arrays of User IDs
}

export interface ActionModel {
    id: string;
    title: string;
    description: string | null;
    projectId: string;
    wbsId: string | null;
    sourceTaskId: string | null;
    deadlineDate: string;
    deadlineTime: string | null;
    status: ActionStatus;
    priority: ActionPriority;
    requestedBy: string | null;
    createdAt: string;
    updatedAt: string;

    // Joins
    projectCode?: string;
    projectName?: string;
    reviewers?: string[];
}

export interface TaskCommentModel {
    id: string;
    taskId: string;
    userId: string;
    message: string;
    createdAt: string;

    // Joins
    userName?: string;
    userAvatar?: string;
}
