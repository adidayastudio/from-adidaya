export type ProjectStatus = "NOT_STARTED" | "TODO" | "WRITING" | "IN_REVIEW" | "NEED_REVISION" | "NEED_APPROVAL" | "APPROVED" | "SCHEDULED" | "PUBLISHED" | "ARCHIVED";
export type ProjectPhase = "Proposal" | "Conceptual" | "Construction" | "Built";
export type ProjectCategory = "Architecture" | "Interior" | "Urban Design" | "Landscape";
export type ProjectView = "LIST" | "BOARD" | "CALENDAR";

export interface TeamMember {
    name: string;
    role: string;
}

export interface GalleryItem {
    id: string;
    url: string;
    caption?: string;
    orientation?: "landscape" | "portrait" | "square";
}

export interface Project {
    id: string;
    name: string;
    slug: string;

    // Categorization
    categories: ProjectCategory[];
    subcategories: string[];
    phase: ProjectPhase;

    // Publication Workflow
    status: ProjectStatus;

    // Timeline
    yearStart: number;
    yearEnd?: number;
    isOngoing: boolean;

    // Location
    city: string;
    country: string;
    isConfidential: boolean;

    // Media
    image: string;
    gallery: GalleryItem[];

    // Content
    description?: string;
    teamMembers: TeamMember[];

    // Metadata
    author: string;
    isFeatured: boolean;
    orderIndex: number;

    // Scheduling
    scheduledDate?: string;
    publishDate?: string;
}

export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
    "NOT_STARTED": "bg-neutral-100 text-neutral-600",
    "TODO": "bg-neutral-200 text-neutral-700",
    "WRITING": "bg-orange-100 text-orange-700",
    "IN_REVIEW": "bg-yellow-100 text-yellow-700",
    "NEED_REVISION": "bg-orange-100 text-orange-700",
    "NEED_APPROVAL": "bg-red-100 text-red-700",
    "APPROVED": "bg-blue-100 text-blue-700",
    "SCHEDULED": "bg-indigo-100 text-indigo-700",
    "PUBLISHED": "bg-green-100 text-green-700",
    "ARCHIVED": "bg-neutral-200 text-neutral-500",
};

export const PROJECT_CATEGORIES: ProjectCategory[] = ["Architecture", "Interior", "Urban Design", "Landscape"];

export const PROJECT_SUBCATEGORIES: string[] = [
    "Residential", "Public Space", "Commercial", "Hospitality",
    "Office", "Gym", "Education", "Cultural", "Mixed Use"
];

export const PROJECT_PHASES: ProjectPhase[] = ["Proposal", "Conceptual", "Construction", "Built"];

// Mock Data Generator Helper
export const MOCK_PROJECTS: Project[] = [
    {
        id: "1",
        name: "Villa Ubud Serenity",
        slug: "villa-ubud-serenity",
        categories: ["Architecture"],
        subcategories: ["Hospitality", "Residential"],
        phase: "Built",
        status: "PUBLISHED",
        yearStart: 2023,
        yearEnd: 2024,
        isOngoing: false,
        city: "Ubud",
        country: "Indonesia",
        isConfidential: false,
        image: "https://images.unsplash.com/photo-1600596542815-6ad4c1551854?q=80&w=2075&auto=format&fit=crop",
        gallery: [],
        description: "A serene villa complex integrated with the lush jungle landscape of Ubud.",
        teamMembers: [{ name: "Andi", role: "Lead Architect" }],
        author: "Dian S",
        isFeatured: true,
        orderIndex: 0,
        publishDate: "2024-03-15"
    },
    {
        id: "2",
        name: "Urban Office Tower",
        slug: "urban-office-tower",
        categories: ["Interior", "Architecture"],
        subcategories: ["Office"],
        phase: "Construction",
        status: "WRITING",
        yearStart: 2025,
        isOngoing: true,
        city: "Jakarta",
        country: "Indonesia",
        isConfidential: false,
        image: "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2069&auto=format&fit=crop",
        gallery: [],
        description: "Modern office tower focusing on sustainable urban living.",
        teamMembers: [],
        author: "Siti Rahma",
        isFeatured: false,
        orderIndex: 1
    },
    {
        id: "4",
        name: "Coastal Resort",
        slug: "coastal-resort",
        categories: ["Urban Design"],
        subcategories: ["Hospitality"],
        phase: "Conceptual",
        status: "NOT_STARTED",
        yearStart: 2026,
        isOngoing: false,
        city: "Bali",
        country: "Indonesia",
        isConfidential: true,
        image: "https://images.unsplash.com/photo-1582719508461-905c673771fd?q=80&w=2025&auto=format&fit=crop",
        gallery: [],
        teamMembers: [],
        author: "Andi Wijaya",
        isFeatured: false,
        orderIndex: 2
    },
    {
        id: "5",
        name: "Tech Hub Office",
        slug: "tech-hub-office",
        categories: ["Interior"],
        subcategories: ["Office"],
        phase: "Proposal",
        status: "NEED_APPROVAL",
        yearStart: 2024,
        isOngoing: true,
        city: "Bandung",
        country: "Indonesia",
        isConfidential: false,
        image: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=2070&auto=format&fit=crop",
        gallery: [],
        teamMembers: [],
        author: "Rina Kartika",
        isFeatured: false,
        orderIndex: 3
    },
];
