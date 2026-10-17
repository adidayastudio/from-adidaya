export type TrackingType = "Design" | "Site" | "Expense" | "Procurement";
export type TrackingStage = "01-KO" | "02-SD" | "03-DD" | "04-CD" | "05-TN" | "06-CN";

export interface TrackingItem {
    id: string;
    tab: "stages" | "rab" | "schedule";
    title: string;
    subtitle: string; // Used for context or progress text
    tag: TrackingType;
    stage: TrackingStage; // New field for stage filtering
    timestamp: Date; // For filtering
    status: "Completed" | "In Progress" | "Pending" | "Not Started";
    progress: number; // For stages
}

const today = new Date();
const yesterday = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);
const lastMonth = new Date(today);
lastMonth.setMonth(lastMonth.getMonth() - 1);

export const mockTrackingItems: TrackingItem[] = [
    // STAGES
    {
        id: "s1",
        tab: "stages",
        title: "01-KO (Kickoff)",
        subtitle: "Initial Meeting & Brief",
        tag: "Design",
        stage: "01-KO",
        timestamp: lastMonth,
        status: "Completed",
        progress: 100
    },
    {
        id: "s2",
        tab: "stages",
        title: "02-SD (Schematic)",
        subtitle: "Floor Plans & Elevations",
        tag: "Design",
        stage: "02-SD",
        timestamp: yesterday,
        status: "Completed",
        progress: 100
    },
    {
        id: "s3",
        tab: "stages",
        title: "03-DD (Design Dev)",
        subtitle: "Detailed Engineering",
        tag: "Design",
        stage: "03-DD",
        timestamp: today,
        status: "In Progress",
        progress: 65
    },
    // RAB
    {
        id: "r1",
        tab: "rab",
        title: "Structural Material",
        subtitle: "Concrete, Steel, Iron",
        tag: "Procurement",
        stage: "03-DD",
        timestamp: today,
        status: "In Progress",
        progress: 40
    },
    {
        id: "r2",
        tab: "rab",
        title: "Architectural Work",
        subtitle: "Flooring, Ceiling, Walls",
        tag: "Procurement",
        stage: "04-CD",
        timestamp: yesterday,
        status: "Pending",
        progress: 0
    },
    // SCHEDULE
    {
        id: "sch1",
        tab: "schedule",
        title: "Foundation Work",
        subtitle: "WBS 2.0",
        tag: "Site",
        stage: "03-DD",
        timestamp: lastMonth,
        status: "Completed",
        progress: 100
    },
    {
        id: "sch2",
        tab: "schedule",
        title: "Structure Level 1",
        subtitle: "WBS 3.1",
        tag: "Site",
        stage: "06-CN",
        timestamp: today,
        status: "In Progress",
        progress: 50
    }
];
