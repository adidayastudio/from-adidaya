import { ActivityStatus, ActivityType } from "./ActivityItem";

export interface ActivityLogItem {
    id: string;
    type: ActivityType;
    title: string;
    context: string;
    tag: "Design" | "Site" | "Expense" | "Procurement";
    time: string; // Display string
    timestamp: Date; // For sorting/filtering
    assignee: string;
    status: ActivityStatus;
    category: "tasks" | "drafts" | "pending" | "approved"; // To map to tabs
}

const today = new Date();
const yesterday = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);
const lastWeek = new Date(today);
lastWeek.setDate(lastWeek.getDate() - 7);

export const mockActivities: ActivityLogItem[] = [
    // TASKS
    {
        id: "t1",
        category: "tasks",
        type: "task",
        title: "Finalize Schematic Design",
        context: "Stage 02-SD",
        tag: "Design",
        time: "Due Today",
        timestamp: today,
        assignee: "ME",
        status: "in-progress"
    },
    {
        id: "t2",
        category: "tasks",
        type: "task",
        title: "Verify Foundation Progress",
        context: "WBS 3.1",
        tag: "Site",
        time: "Due Tomorrow",
        timestamp: new Date(today.getTime() + 86400000),
        assignee: "ME",
        status: "not-started"
    },
    // DRAFTS
    {
        id: "d1",
        category: "drafts",
        type: "doc",
        title: "Daily Site Log: Wall Framing",
        context: "WBS 4.2",
        tag: "Site",
        time: "Edited 10m ago",
        timestamp: today,
        assignee: "AL",
        status: "not-started"
    },
    {
        id: "d2",
        category: "drafts",
        type: "alert",
        title: "Reimbursement: Survey Transport",
        context: "General",
        tag: "Expense",
        time: "Edited 1h ago",
        timestamp: today,
        assignee: "ME",
        status: "not-started"
    },
    // PENDING
    {
        id: "p1",
        category: "pending",
        type: "doc",
        title: "Purchase Request: 500 Bags Cement",
        context: "RAB 2.1",
        tag: "Procurement",
        time: "Submitted Yesterday",
        timestamp: yesterday,
        assignee: "Logistic",
        status: "in-review"
    },
    {
        id: "p2",
        category: "pending",
        type: "task",
        title: "Variation Order: Extra Power Points",
        context: "Design Change",
        tag: "Design",
        time: "Submitted 2 days ago",
        timestamp: new Date(today.getTime() - 172800000),
        assignee: "Client",
        status: "need-revision"
    },
    // APPROVED
    {
        id: "a1",
        category: "approved",
        type: "doc",
        title: "Material: Granite Tiles 60x60",
        context: "RAB 3.5",
        tag: "Procurement",
        time: "Approved Today",
        timestamp: today,
        assignee: "PM",
        status: "approved"
    },
    {
        id: "a2",
        category: "approved",
        type: "doc",
        title: "Reimbursement: Team Lunch",
        context: "Site Visit",
        tag: "Expense",
        time: "Paid Yesterday",
        timestamp: yesterday,
        assignee: "Finance",
        status: "approved"
    },
    // EXTRA DATA FOR FILTER TESTING
    {
        id: "a3",
        category: "approved",
        type: "task",
        title: "Site Clearance",
        context: "Stage 01-KO",
        tag: "Site",
        time: "Completed Last Week",
        timestamp: lastWeek,
        assignee: "PM",
        status: "approved"
    }
];
