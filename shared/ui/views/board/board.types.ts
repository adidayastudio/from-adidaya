export const STATUSES = [
  "Not Started",
  "In Progress",
  "For Review",
  "Waiting Approval",
  "Completed",
] as const;

export type Status = (typeof STATUSES)[number];

export type Priority = "Urgent" | "High" | "Medium" | "Low";

export type Subtask = {
  id: string;
  label: string;
  done: boolean;
};

export type BoardTask = {
  id: string;
  title: string;
  project: string;
  projectCode?: string;
  stage: string;
  priority: Priority;
  status: Status;
  manualStatus?: boolean;
  subtasks: Subtask[];
};
