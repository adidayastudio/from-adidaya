import { SocialPost, SocialAccount, PostStatus } from "../types/social.types";

// Get today for testing "Today" indicator
const today = new Date();
const todayStr = today.toISOString().split('T')[0];
const yesterday = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);
const yesterdayStr = yesterday.toISOString().split('T')[0];
const nextWeek = new Date(today);
nextWeek.setDate(nextWeek.getDate() + 7);
const nextWeekStr = nextWeek.toISOString().split('T')[0];

export const MOCK_ACCOUNTS: SocialAccount[] = [
    {
        id: "acc-1",
        name: "Adidaya Instagram",
        platform: "INSTAGRAM",
        handle: "@adidayadesign",
    },
    {
        id: "acc-2",
        name: "Adidaya TikTok",
        platform: "TIKTOK",
        handle: "@adidayadesign",
    },
    {
        id: "acc-3",
        name: "CEO LinkedIn",
        platform: "LINKEDIN",
        handle: "Manu Stravo",
    }
];

export const MOCK_POSTS: SocialPost[] = [
    {
        id: "post-1",
        accountId: "acc-1",
        platform: "INSTAGRAM",
        title: "Modern Minimalist Home Tour",
        contentType: "REEL",
        contentPillar: "Showcase",
        scheduledDate: "2024-03-15",
        status: "PUBLISHED",
        insights: { views: 12500, likes: 850, comments: 45 },
        publishedUrl: "https://instagram.com/p/..."
    },
    {
        id: "post-2",
        accountId: "acc-1",
        platform: "INSTAGRAM",
        title: "5 Tips for Small Spaces",
        contentType: "CAROUSEL",
        contentPillar: "Educational",
        scheduledDate: todayStr, // TODAY!
        scheduledTime: "18:00",
        status: "SCHEDULED",
        assignee: "Sarah Designer"
    },
    {
        id: "post-3",
        accountId: "acc-2",
        platform: "TIKTOK",
        title: "Behind the Scenes: Site Visit",
        contentType: "VIDEO",
        contentPillar: "Culture",
        scheduledDate: yesterdayStr, // OVERDUE!
        status: "DESIGNING",
        assignee: "Video Team"
    },
    {
        id: "post-4",
        accountId: "acc-3",
        platform: "LINKEDIN",
        title: "Why We Choose Sustainable Materials",
        contentType: "TEXT",
        contentPillar: "Thought Leadership",
        scheduledDate: nextWeekStr,
        status: "WRITING",
        assignee: "Manu Stravo"
    },
    {
        id: "post-5",
        accountId: "acc-1",
        platform: "INSTAGRAM",
        title: "Client Testimonial: Sarah's Villa",
        contentType: "FEED",
        contentPillar: "Social Proof",
        scheduledDate: "2024-03-25",
        status: "TODO"
    },
    {
        id: "post-6",
        accountId: "acc-2",
        platform: "TIKTOK",
        title: "Material Selection Day ASMR",
        contentType: "VIDEO",
        contentPillar: "Entertainment",
        scheduledDate: "2024-03-26",
        status: "NOT_STARTED"
    }
];
