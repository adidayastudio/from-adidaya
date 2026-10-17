import { Status } from "./board.types";

export const STATUS_BG: Record<Status, string> = {
  "Not Started": "bg-neutral-100",
  "In Progress": "bg-blue-50",
  "For Review": "bg-yellow-50",
  "Waiting Approval": "bg-purple-50",
  "Completed": "bg-green-50",
};
