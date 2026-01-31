export interface SkillCategory {
    id: string;
    name: string;
    description: string | null;
    status: "active" | "archived";
    skill_count?: number; // aggregated
}

export interface Skill {
    id: string;
    name: string;
    category_id: string;
    category?: SkillCategory; // joined
    status: "active" | "draft" | "archived";
    related_departments?: string[]; // aggregated from join
    related_positions?: string[]; // aggregated from join
}

export interface SkillFormData {
    name: string;
    category_id: string;
    status: "active" | "draft" | "archived";
    related_departments: string[];
    related_positions: string[];
}
