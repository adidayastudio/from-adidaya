export type TaskStatus =
  | "Not Started"
  | "In Progress"
  | "On Hold"
  | "For Review"
  | "Waiting Approval"
  | "Completed";

export type Priority = "Urgent" | "High" | "Medium" | "Low";

export type TimelineTask = {
  id: string;
  title: string;
  project: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  status: TaskStatus;
  priority?: Priority;
};
