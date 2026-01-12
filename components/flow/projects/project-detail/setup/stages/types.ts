export type StageKey =
  | "KO"
  | "SD"
  | "DD"
  | "ED"
  | "PC"
  | "CN"
  | "HO";

export type TaskPriority =
  | "low"
  | "medium"
  | "high"
  | "urgent";

export type TaskStatus =
  | "not_started"
  | "draft"
  | "in_review"
  | "revision"
  | "approved";

// Strict Detail Schemas per User Prompt
export type DetailSchemaType =
  | "DELIVERABLE_BASIC"        // File Upload + Desc
  | "DESCRIPTION_ONLY"         // Simple Textarea
  | "NUMERIC_SINGLE"           // Single Number
  | "NUMERIC_RANGE"           // Min/Max Number
  | "CURRENCY_RANGE"          // Min/Max Currency
  | "DATE_RANGE_WITH_DURATION"// Start/End + Auto Duration
  | "STATUS_WITH_NOTE";       // Status Select + Note

export type Task = {
  id: string;
  code: string;
  name: string;
  assignee?: string;
  weight?: number;
  deadline?: string;
  priority?: "low" | "medium" | "high" | "urgent";
  status?: TaskStatus;
  stage: string;
  sectionCode: string;
  parentId?: string;
  subtasks?: Task[];

  // Dynamic Content (Schema-Driven)
  schemaType?: DetailSchemaType;
  inputConfig?: {
    min?: number;
    max?: number;
    currency?: string;     // "IDR", "USD"
    allowedExtensions?: string[]; //For DELIVERABLE_BASIC
    options?: string[];    // For Status?
  };
  inputData?: {
    // Shared Field Types
    description?: string;
    files?: string[];     // URLs or Paths
    value?: number;
    min?: number;
    max?: number;
    startDate?: string;   // ISO Date
    endDate?: string;     // ISO Date
    duration?: number;    // Computed
    status?: string;
    note?: string;
    [key: string]: any;
  };
};


export type TaskSectionConfig = {
  code: string;              // KO-00
  title: string;
  stage: StageKey;
};
