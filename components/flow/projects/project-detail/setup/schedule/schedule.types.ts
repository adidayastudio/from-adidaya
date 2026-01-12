import { RABItem } from "@/components/flow/projects/project-detail/setup/rab/ballpark/types/rab.types";

export type ScheduleMode = "BALLPARK" | "ESTIMATES" | "DETAIL";
export type ScheduleView = "SUMMARY" | "TIMELINE" | "GANTT" | "SCURVE";

// Schedule Values: key = item code
export type ScheduleValue = {
    start?: string; // YYYY-MM-DD
    duration?: number; // Days
    progress?: number; // 0-100
};

export type WeightedItem = RABItem & {
    weight: number; // 0-100%
    schedule?: ScheduleValue;
};
