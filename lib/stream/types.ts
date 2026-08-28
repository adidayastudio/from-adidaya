/**
 * STREAM MODULE — Type Definitions
 * Chat-first operational intelligence for Adidaya
 */

// ============================================
// INTENT CLASSIFICATION
// ============================================

export type StreamIntentType =
    | "create_project"
    | "log_expense"
    | "update_progress"
    | "add_task"
    | "general";

export interface ParsedProjectData {
    name: string;
    city?: string;
    client?: string;
    type?: "design" | "design-build" | "build";
}

export interface ParsedExpenseData {
    item: string;
    qty?: number;
    unit?: string;
    amount?: number;
    currency?: string;
    project?: string;
}

export interface ParsedProgressData {
    target: string;
    progress: number;
    project?: string;
    notes?: string;
}

export interface ParsedTaskData {
    title: string;
    assignee?: string;
    dueDate?: string;
    priority?: "low" | "normal" | "high" | "urgent";
    project?: string;
}

export interface ParsedGeneralData {
    message: string;
}

export type ParsedData =
    | ParsedProjectData
    | ParsedExpenseData
    | ParsedProgressData
    | ParsedTaskData
    | ParsedGeneralData;

export interface ClassificationResult {
    type: StreamIntentType;
    data: ParsedData;
    confidence: number;
    rawInput: string;
}

// ============================================
// STREAM ACTIVITY (DB Model)
// ============================================

export type StreamActivityStatus = "pending" | "confirmed" | "saved" | "dismissed";
export type StreamEntityType = "project" | "task" | "expense" | "report" | "general";

export interface StreamActivity {
    id: string;
    workspaceId?: string;
    userId?: string;

    // Classification
    intentType: StreamIntentType;
    rawInput: string;
    parsedData: ParsedData;

    // Linking
    entityType?: StreamEntityType;
    entityId?: string;

    // Status
    status: StreamActivityStatus;

    // Timestamps
    createdAt: string;
    updatedAt: string;
}

// ============================================
// FEED ITEMS (Unified View)
// ============================================

export type FeedItemType =
    | "stream_input"      // User's chat input
    | "project_created"   // New project
    | "expense_logged"    // New expense
    | "task_added"        // New task
    | "progress_updated"  // Progress report
    | "system_event";     // Generic activity

export interface FeedItem {
    id: string;
    type: FeedItemType;
    title: string;
    subtitle?: string;
    description?: string;
    timestamp: string;
    userId?: string;
    userName?: string;
    userAvatar?: string;

    // Taxonomy & Permission
    parentModule?: "stream" | "finance" | "resources" | "reports" | "people" | "clock" | "crew";
    submodule?: string;
    event?: string;
    isRestricted?: boolean;
    isPersonalClock?: boolean;
    isMe?: boolean;

    // Entity reference
    entityType?: StreamEntityType;
    entityId?: string;
    entityHref?: string;

    // Visual
    icon?: string;
    accentColor?: string;
    projectCode?: string;
    metadata?: Record<string, any>;

    // Stream-specific
    rawInput?: string;
    classification?: ClassificationResult;
    status?: StreamActivityStatus;
}

// ============================================
// STREAM MESSAGE (Chat Bubble)
// ============================================

export type MessageRole = "user" | "system";

export interface StreamMessage {
    id: string;
    role: MessageRole;
    content: string;
    timestamp: string;
    classification?: ClassificationResult;
    status?: StreamActivityStatus;
    entityType?: StreamEntityType;
    entityId?: string;
    isProcessing?: boolean;
}
