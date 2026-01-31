export interface EmploymentType {
    id: string;
    name: string;
    isDefault: boolean;
    status: "Active" | "Archived";
}

export interface WorkStatus {
    id: string;
    name: string;
    color: string; // hex or tailwind class
    visibility: "Public" | "Team Only" | "Private";
    status: "Active" | "Archived";
}
