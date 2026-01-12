export type Platform = "INSTAGRAM" | "TIKTOK" | "LINKEDIN" | "YOUTUBE" | "FACEBOOK";

export type PostStatus =
    | "NOT_STARTED"
    | "TODO"
    | "WRITING"
    | "DESIGNING"
    | "IN_REVIEW"
    | "NEED_REVISION"
    | "NEED_APPROVAL"
    | "APPROVED"
    | "SCHEDULED"
    | "PUBLISHED"
    | "ARCHIVED";

export type ContentType = "FEED" | "REEL" | "STORY" | "VIDEO" | "CAROUSEL" | "TEXT";

export type SocialAccount = {
    id: string;
    name: string;
    platform: Platform;
    handle: string;
    avatar?: string;
};

export type SocialPost = {
    id: string;
    accountId: string; // Link to SocialAccount
    platform: Platform; // Kept for easier filtering if needed, but derived from Account

    // Content
    title: string;
    caption?: string;
    contentType: ContentType;
    contentPillar?: string;
    references?: string[]; // URLs or IDs

    // Scheduling
    scheduledDate: string; // YYYY-MM-DD
    scheduledTime?: string; // HH:MM

    // Workflow
    status: PostStatus;
    assignee?: string;

    // Post-Publication
    publishedUrl?: string;
    insights?: {
        views?: number;
        likes?: number;
        comments?: number;
        shares?: number;
    };
};
