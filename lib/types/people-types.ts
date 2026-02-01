export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type WorkloadStatus = 'available' | 'normal' | 'overloaded';
export type WorkloadSource = 'clock' | 'task' | 'manual';
export type FeedbackVisibility = 'private' | 'management';

export interface PeopleSkill {
    id: string;
    user_id: string;
    category_id?: string;
    skill_name: string;
    skill_level: string; // "1" to "10" or legacy enums
    created_at: string;
}

export interface PeopleAvailability {
    id: string;
    user_id: string;
    workload_status: WorkloadStatus;
    source: WorkloadSource;
    notes?: string;
    updated_at: string;
}

export interface PeopleFeedback {
    id: string;
    user_id: string;
    reviewer_id?: string;
    note: string;
    visibility: FeedbackVisibility;
    created_at: string;
}

export interface PeoplePerformanceSnapshot {
    id: string;
    user_id: string;
    period: string; // Date string (YYYY-MM-DD)
    attendance_score: number;
    task_completion_score: number;
    overtime_hours: number;
    computed_index: number;
    created_at: string;
}

export interface TeamPerformanceSnapshot {
    id: string;
    department: string;
    period: string; // Date string (YYYY-MM-DD)
    avg_performance: number;
    attendance_rate: number;
    utilization_rate: number;
    created_at: string;
}

export interface SkillCategory {
    id: string;
    name: string;
    description: string;
    status: 'active' | 'archived';
}

export interface SkillLibraryItem {
    id: string;
    name: string;
    category_id: string;
    status: 'active' | 'draft' | 'archived';
}
