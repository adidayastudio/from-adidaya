import type { TaskStatus } from "../../types";

export type StageTask = {
  code: string;
  name: string;
  weight: number;
  status: TaskStatus;
  assignee?: string;
  deadline?: string;
  priority?: "low" | "medium" | "high";
};
