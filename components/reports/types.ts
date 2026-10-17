export type FrequencyType = 
    | 'Daily' 
    | 'Weekly' 
    | 'Biweekly' 
    | 'Monthly' 
    | 'Every N Days' 
    | 'Specific Weekdays' 
    | 'Specific Dates' 
    | 'Date Window' 
    | 'Custom';

export type EntryConditionStatus = 'Normal' | 'Needs Attention' | 'Critical';
export type DocumentStatus = 'Draft' | 'Generated' | 'Approved' | 'Archived';
export type ScheduleTaskStatus = 'pending' | 'due_today' | 'completed' | 'overdue';

export interface FormFieldConfig {
    id: string;
    label: string;
    type: 'text' | 'number' | 'unit_value' | 'checkbox' | 'dropdown' | 'condition' | 'photo' | 'notes' | 'signature';
    unit?: string;
    options?: string[];
    required?: boolean;
    defaultValue?: any;
    placeholder?: string;
}

export interface ActivityTemplate {
    id: string;
    reportTypeId: string;
    name: string;
    description?: string;
    frequency: FrequencyType;
    frequencyDetail?: string; // e.g. "Every Monday, 09:00" or "Daily at 07:00 & 21:00"
    fields: FormFieldConfig[];
    defaultAssignee?: string;
    estimatedDurationMinutes?: number;
    isActive: boolean;
}

export interface ReportType {
    id: string;
    name: string;
    shortDescription?: string;
    icon: string; // SF Symbol or Ionicon
    color: string;
    colorEnd?: string;
    codePrefix?: string;
    category: string;
    activeActivitiesCount?: number;
    completionRate?: number; // 0 - 100 percentage
    periodSummaryText?: string; // e.g. "12 / 14 activities completed this week"
    latestDocument?: {
        title: string;
        period: string;
        date: string;
    };
    activities: ActivityTemplate[];
    isActive?: boolean;
}

export interface ScheduledActivity {
    id: string;
    reportTypeId: string;
    reportTypeName: string;
    reportTypeColor: string;
    activityId: string;
    activityName: string;
    frequency: FrequencyType;
    frequencyDetail: string;
    dueTime: string; // e.g. "08:00 AM" or "Today, 14:00"
    dueDate: string; // YYYY-MM-DD
    assigneeName: string;
    assigneeRole: string;
    status: ScheduleTaskStatus;
    relatedTaskId?: string;
}

export interface ReportEntry {
    id: string;
    reportTypeId: string;
    reportTypeName: string;
    activityId: string;
    activityName: string;
    submittedAt: string;
    submittedDate: string;
    submittedTime: string;
    submittedBy: {
        name: string;
        avatar?: string;
        role: string;
    };
    condition: EntryConditionStatus;
    values: Record<string, any>;
    photos?: string[];
    notes?: string;
    relatedTaskId?: string;
}

export interface ReportDocument {
    id: string;
    reportTypeId: string;
    reportTypeName: string;
    title: string;
    period: string;
    periodType: 'Weekly' | 'Monthly' | 'Custom Period';
    status: DocumentStatus;
    generatedAt: string;
    approvedBy?: string;
    approvedAt?: string;
    format: 'PDF' | 'Excel';
    fileSize: string;
    entriesCount: number;
}

export interface ReportPreset {
    id: string;
    name: string;
    category: 'Facility & Operations' | 'General' | 'Construction';
    description: string;
    icon: string;
    activitiesCount: number;
    recommendedFrequency: string;
    color: string;
    colorEnd: string;
    sampleActivities: string[];
}
