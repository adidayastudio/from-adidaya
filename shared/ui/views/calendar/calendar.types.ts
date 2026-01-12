export type TaskStatus =
  | "Not Started"
  | "In Progress"
  | "On Hold"
  | "For Review"
  | "Waiting Approval"
  | "Completed";

export type CalendarTask = {
  id: string;
  title: string;
  dateISO: string; // YYYY-MM-DD
  status: TaskStatus;
};
