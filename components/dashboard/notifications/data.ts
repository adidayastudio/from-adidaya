export type NotificationType = "info" | "mention" | "approval" | "system" | "success" | "warning";

export interface Notification {
    id: string;
    type: NotificationType;
    isRead: boolean;
    title: string;
    description: string;
    timestamp: string; // ISO string or relative time for mock
    fullTimestamp: Date; // For sorting
    source?: {
        name: string;
        avatar?: string; // Initials or URL
        color?: string; // For auto-generated avatars
    };
    metadata?: {
        projectId?: string;
        projectCode?: string;
        status?: "pending" | "approved" | "rejected";
        link?: string;
    };
}

export const MOCK_NOTIFICATIONS: Notification[] = [
    {
        id: "1",
        type: "approval",
        isRead: false,
        title: "Budget Approval Needed",
        description: "Sarah Chen requested approval for additional concrete reinforcement budget ($5,000).",
        timestamp: "10 mins ago",
        fullTimestamp: new Date(Date.now() - 10 * 60 * 1000),
        source: { name: "Sarah Chen", color: "bg-purple-100 text-purple-600" },
        metadata: { projectId: "JPF", projectCode: "JPF", status: "pending", link: "/flow/projects/JPF" }
    },
    {
        id: "2",
        type: "mention",
        isRead: false,
        title: "Mentioned in Foundation WBS",
        description: "@MikeRoss: Can you review the soil test compliance before we proceed?",
        timestamp: "35 mins ago",
        fullTimestamp: new Date(Date.now() - 35 * 60 * 1000),
        source: { name: "Mike Ross", color: "bg-blue-100 text-blue-600" },
        metadata: { projectId: "SKY", projectCode: "SKY", link: "/flow/projects/SKY" }
    },
    {
        id: "3",
        type: "system",
        isRead: false,
        title: "System Update Scheduled",
        description: "Adidaya Flow will undergo maintenance on Sunday at 02:00 AM.",
        timestamp: "1 hour ago",
        fullTimestamp: new Date(Date.now() - 60 * 60 * 1000),
        source: { name: "System" },
        metadata: { link: "#" }
    },
    {
        id: "4",
        type: "info",
        isRead: true,
        title: "Project Milestone Completed",
        description: "Urban Park Center: Landscape Concept milestone has been marked as complete.",
        timestamp: "2 hours ago",
        fullTimestamp: new Date(Date.now() - 120 * 60 * 1000),
        source: { name: "System" },
        metadata: { projectId: "UPC", projectCode: "UPC" }
    },
    {
        id: "5",
        type: "approval",
        isRead: true,
        title: "Material Request Approved",
        description: "You approved the steel procurement request for Skyline Tower.",
        timestamp: "Yesterday",
        fullTimestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
        source: { name: "You", color: "bg-gray-100 text-gray-600" },
        metadata: { projectId: "SKY", projectCode: "SKY", status: "approved" }
    },
    {
        id: "6",
        type: "mention",
        isRead: true,
        title: "Mentioned in Client Briefing",
        description: "@AlexWong: Great work on the presentation deck.",
        timestamp: "Yesterday",
        fullTimestamp: new Date(Date.now() - 25 * 60 * 60 * 1000),
        source: { name: "Alex Wong", color: "bg-orange-100 text-orange-600" },
        metadata: { projectId: "LAK", projectCode: "LAK" }
    },
    {
        id: "7",
        type: "system",
        isRead: true,
        title: "Weekly Report Ready",
        description: "Your weekly project performance summary is ready for review.",
        timestamp: "2 days ago",
        fullTimestamp: new Date(Date.now() - 48 * 60 * 60 * 1000),
        source: { name: "System" },
    }
];
