import { TaskStatus } from "./timeline.types";

export const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export const DAY_PX = 112;

export const STATUS_BAR_STYLE: Record<TaskStatus, string> = {
  "Not Started": "bg-neutral-200 text-neutral-800 border-neutral-300",
  "In Progress": "bg-blue-100 text-blue-800 border-blue-200",
  "On Hold": "bg-orange-100 text-orange-800 border-orange-200",
  "For Review": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "Waiting Approval": "bg-purple-100 text-purple-800 border-purple-200",
  "Completed": "bg-green-100 text-green-800 border-green-200",
};
