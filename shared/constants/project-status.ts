export type ProjectStatus =
  | "on-track"
  | "delayed"
  | "overloaded"
  | "at-risk"
  | "completed";

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  "on-track": "On Track",
  delayed: "Delayed",
  overloaded: "Overloaded",
  "at-risk": "At Risk",
  completed: "Completed",
};

export const PROJECT_STATUSES: ProjectStatus[] = [
  "on-track",
  "delayed",
  "overloaded",
  "at-risk",
  "completed",
];
