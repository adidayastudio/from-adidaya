export type JobStatus = "Active" | "Closed" | "Draft";

export type JobType = "Full-time" | "Contract" | "Freelance" | "Internship";

export interface CareerJob {
    id: string;
    title: string;
    department: string;
    type: JobType;
    location: string;
    applicants: number;
    status: JobStatus;
    postedAt?: string;
}
