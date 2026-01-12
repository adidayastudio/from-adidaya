export type InsightStatus = "NOT_STARTED" | "TODO" | "WRITING" | "IN_REVIEW" | "NEED_REVISION" | "NEED_APPROVAL" | "APPROVED" | "SCHEDULED" | "PUBLISHED" | "ARCHIVED";
export type InsightCategory =
    | "Studio Stories"
    | "Design Dialogues"
    | "Craft & Construction"
    | "Business Briefings"
    | "Research Records"
    | "News & Notes";

export type InsightView = "LIST" | "BOARD" | "CALENDAR";

export interface GalleryItem {
    id: string;
    url: string;
    caption?: string;
    orientation?: "landscape" | "portrait" | "square";
}

export interface Insight {
    id: string;
    title: string;
    slug: string;

    // Categorization
    category: InsightCategory;  // Single category
    tags: string[];             // Multiple tags

    // Publication Workflow
    status: InsightStatus;

    // Media
    image: string;
    gallery: GalleryItem[];

    // Content
    excerpt?: string;        // Short summary
    content?: string;        // Full article content (rich text)

    // Metadata
    author: string;
    readTime?: number;       // Estimated read time in minutes
    isFeatured: boolean;
    orderIndex: number;

    // Scheduling
    scheduledDate?: string;
    publishDate?: string;
}

export const INSIGHT_STATUS_COLORS: Record<InsightStatus, string> = {
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

export const INSIGHT_CATEGORIES: InsightCategory[] = [
    "Studio Stories",
    "Design Dialogues",
    "Craft & Construction",
    "Business Briefings",
    "Research Records",
    "News & Notes"
];

export const RECOMMENDED_TAGS: Record<InsightCategory, string[]> = {
    "Studio Stories": ["Culture", "People", "Team", "Behind the Scenes", "Reflection", "Voice", "Studio Life", "Editorial", "Personal"],
    "Design Dialogues": ["Concept", "Design Thinking", "Ideation", "Narrative", "Journey", "Sketch", "Exploration", "Iteration", "Aesthetics"],
    "Craft & Construction": ["Structure", "MEP", "Systems", "Detailing", "Materiality", "Tectonics", "Fabrication", "Sitework", "Durability"],
    "Business Briefings": ["Business", "Branding", "Marketing", "Industry Trends", "Client", "Value", "Management", "Growth", "Operations"],
    "Research Records": ["Research", "Methodology", "Publication", "Whitepaper", "Analysis", "Findings", "Comparison", "Theory"],
    "News & Notes": ["News", "Update", "Announcement", "Milestone", "Launch", "Timeline", "Press", "Progress", "Event"]
};

// Flattened list for other uses if needed
export const INSIGHT_TAGS: string[] = Array.from(new Set(Object.values(RECOMMENDED_TAGS).flat()));

// Mock Data
export const MOCK_INSIGHTS: Insight[] = [
    {
        id: "1",
        title: "The Future of Sustainable Architecture in Southeast Asia",
        slug: "future-sustainable-architecture-sea",
        category: "Design Dialogues",
        tags: ["Design Thinking", "Sustainability", "Concept"],
        status: "PUBLISHED",
        image: "https://images.unsplash.com/photo-1518005020951-eccb494ad742?q=80&w=2070&auto=format&fit=crop",
        gallery: [],
        excerpt: "Exploring how sustainable design principles are reshaping the architectural landscape across Southeast Asia.",
        content: "<h2>Introduction</h2><p>Southeast Asia is witnessing a transformation in architectural design...</p>",
        author: "Dian Suryani",
        readTime: 8,
        isFeatured: true,
        orderIndex: 0,
        publishDate: "2024-03-15"
    },
    {
        id: "2",
        title: "Interview: Rethinking Urban Spaces",
        slug: "interview-rethinking-urban-spaces",
        category: "Research Records",
        tags: ["Research", "Analysis", "Theory"],
        status: "WRITING",
        image: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?q=80&w=2070&auto=format&fit=crop",
        gallery: [],
        excerpt: "A conversation with award-winning urban planner about the future of cities.",
        author: "Andi Wijaya",
        readTime: 12,
        isFeatured: false,
        orderIndex: 1
    },
    {
        id: "3",
        title: "Case Study: Eco-Resort Integration",
        slug: "case-study-eco-resort-integration",
        category: "Craft & Construction",
        tags: ["Materiality", "Detailing", "Sitework"],
        status: "IN_REVIEW",
        image: "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?q=80&w=2070&auto=format&fit=crop",
        gallery: [],
        excerpt: "How we integrated local materials and traditional methods in a modern eco-resort design.",
        content: "<h2>Project Overview</h2><p>This eco-resort project demonstrates...</p>",
        author: "Siti Rahma",
        readTime: 10,
        isFeatured: true,
        orderIndex: 2,
        scheduledDate: "2026-01-15"
    },
    {
        id: "4",
        title: "Breaking News: Architecture Award Nominations",
        slug: "architecture-award-nominations-2024",
        category: "News & Notes",
        tags: ["News", "Announcement", "Milestone"],
        status: "NEED_REVISION",
        image: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=2070&auto=format&fit=crop",
        gallery: [],
        excerpt: "Studio nominated for prestigious regional architecture award.",
        author: "Rina Kartika",
        readTime: 3,
        isFeatured: false,
        orderIndex: 3
    },
];
