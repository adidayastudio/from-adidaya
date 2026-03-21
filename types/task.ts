export type TaskStatus = "TODO" | "IN PROGRESS" | "REVISION" | "DONE";
export type TaskPriority = "URGENT" | "HIGH" | "MEDIUM" | "LOW";
export type ActionStatus = "PENDING" | "APPROVED" | "REJECTED" | "REVISION" | "DISPUTE";
export type ActionPriority = "URGENT" | "HIGH" | "MEDIUM" | "LOW";

export interface TaskModel {
    id: string;
    title: string;
    description: string | null;
    projectId: string;
    wbsId: string | null;
    deadlineDate: string;
    deadlineTime: string | null;
    status: TaskStatus;
    priority: TaskPriority;
    createdBy: string | null;
    createdAt: string;
    updatedAt: string;

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
