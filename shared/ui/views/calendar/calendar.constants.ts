import { TaskStatus } from "./calendar.types";

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const STATUS_STYLE: Record<TaskStatus, string> = {
  "Not Started": "bg-neutral-200 text-neutral-800",
  "In Progress": "bg-blue-100 text-blue-800",
  "On Hold": "bg-orange-100 text-orange-800",
  "For Review": "bg-yellow-100 text-yellow-800",
  "Waiting Approval": "bg-purple-100 text-purple-800",
  "Completed": "bg-green-100 text-green-800",
};
