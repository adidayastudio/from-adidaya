/**
 * CREW API
 * CRUD operations for crew members (field workers)
 * This is separate from profiles/users (app users)
 */

import { supabase } from "@/lib/supabaseClient";

// ============================================
// TYPES
// ============================================

export type CrewRole = "FOREMAN" | "LEADER" | "SKILLED" | "HELPER" | "OPERATOR" | "GENERAL";
export type CrewStatus = "ACTIVE" | "INACTIVE";

// Role labels (English with Indonesian in parentheses)
export const CREW_ROLE_LABELS: Record<CrewRole, { en: string; id: string; display: string }> = {
    FOREMAN: { en: "Foreman", id: "Mandor", display: "Foreman (Mandor)" },
    LEADER: { en: "Leader", id: "Kepala Tukang", display: "Leader (Kepala Tukang)" },
    SKILLED: { en: "Skilled Worker", id: "Tukang", display: "Skilled Worker (Tukang)" },
    HELPER: { en: "Helper", id: "Kenek", display: "Helper (Kenek)" },
    OPERATOR: { en: "Operator", id: "Operator", display: "Operator" },
    GENERAL: { en: "General Worker", id: "Lain-lain", display: "General Worker (Lain-lain)" },
};

export const CREW_ROLE_OPTIONS = Object.entries(CREW_ROLE_LABELS).map(([value, labels]) => ({
    value: value as CrewRole,
    label: labels.display,
}));

// Skilled roles for statistics
export const SKILLED_ROLES: CrewRole[] = ["FOREMAN", "LEADER", "SKILLED", "OPERATOR"];

export interface CrewMember {
    id: string;
    workspaceId?: string;
    name: string;
    initials: string;
    nik?: string;
    phone?: string;
    email?: string;
    avatarUrl?: string;
    role: CrewRole;
    skillTags: string[];
    status: CrewStatus;
    joinDate?: string;
    notes?: string;
    baseDailyRate: number;
    overtimeDailyRate: number;
    otRate1: number;
    otRate2: number;
    otRate3: number;
    bankName?: string;
    bankAccount?: string;
    currentProjectCode?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CrewProjectHistory {
    id: string;
    crewMemberId: string;
    projectCode: string;
    projectName?: string;
    startDate: string;
    endDate?: string;
    status: "ongoing" | "completed" | "terminated";
    createdAt: string;
}

export interface CrewFilters {
    status?: CrewStatus;
    role?: CrewRole;
    projectCode?: string;
    search?: string;
}

export interface DailyLog {
    id: string;
    workspaceId: string;
    crewId: string;
    projectCode: string;
    date: string; // YYYY-MM-DD
    status: "PRESENT" | "ABSENT" | "HALF_DAY" | "CUTI";
    regularHours: number;
    ot1Hours: number;
    ot2Hours: number;
    ot3Hours: number;
    rating?: number; // 1-5
    createdAt: string;
    updatedAt: string;
}

// ============================================
// MAPPERS
// ============================================

const getInitialsFallback = (name: string): string => {
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    return words[0].substring(0, 2).toUpperCase();
};

function mapDbToCrewMember(row: any): CrewMember {
    return {
        id: row.id,
        workspaceId: row.workspace_id,
        name: row.name,
        initials: row.initials || getInitialsFallback(row.name),
        nik: row.nik,
        phone: row.phone,
        email: row.email,
        avatarUrl: row.avatar_url,
        role: row.role,
        skillTags: row.skill_tags || [],
        status: row.status,
        joinDate: row.join_date,
        notes: row.notes,
        baseDailyRate: parseFloat(row.base_daily_rate) || 0,
        overtimeDailyRate: parseFloat(row.overtime_daily_rate) || 0,
        otRate1: parseFloat(row.ot_rate_1) || 0,
        otRate2: parseFloat(row.ot_rate_2) || 0,
        otRate3: parseFloat(row.ot_rate_3) || 0,
        bankName: row.bank_name,
        bankAccount: row.bank_account,
        currentProjectCode: row.current_project_code,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

function mapDbToProjectHistory(row: any): CrewProjectHistory {
    return {
        id: row.id,
        crewMemberId: row.crew_member_id,
        projectCode: row.project_code,
        projectName: row.project_name,
        startDate: row.start_date,
        endDate: row.end_date,
        status: row.status,
        createdAt: row.created_at,
    };
}

function mapDbToDailyLog(row: any): DailyLog {
    return {
        id: row.id,
        workspaceId: row.workspace_id,
        crewId: row.crew_id,
        projectCode: row.project_code,
        date: row.date,
        status: row.status,
        regularHours: parseFloat(row.regular_hours) || 0,
        ot1Hours: parseFloat(row.ot1_hours) || 0,
        ot2Hours: parseFloat(row.ot2_hours) || 0,
        ot3Hours: parseFloat(row.ot3_hours) || 0,
        rating: row.rating ? parseInt(row.rating) : undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

// ============================================
// FETCH OPERATIONS
// ============================================

/**
 * Fetch all crew members with optional filters
 */
export async function fetchCrewMembers(
    workspaceId?: string,
    filters?: CrewFilters
): Promise<CrewMember[]> {
    let query = supabase.from("crew_members").select("*");

    if (workspaceId) {
        query = query.eq("workspace_id", workspaceId);
    }

    if (filters?.status) {
        query = query.eq("status", filters.status);
    }

    if (filters?.role) {
        query = query.eq("role", filters.role);
    }

    if (filters?.projectCode) {
        query = query.eq("current_project_code", filters.projectCode);
    }

    if (filters?.search) {
        query = query.ilike("name", `%${filters.search}%`);
    }

    query = query.order("name", { ascending: true });

    const { data, error } = await query;

    if (error) {
        console.error("❌ Error fetching crew members:", error);
        return [];
    }

    return (data || []).map(mapDbToCrewMember);
}

/**
 * Fetch single crew member by ID
 */
export async function fetchCrewMemberById(id: string): Promise<CrewMember | null> {
    const { data, error } = await supabase
        .from("crew_members")
        .select("*")
        .eq("id", id)
        .single();

    if (error) {
        console.error("❌ Error fetching crew member:", error);
        return null;
    }

    return data ? mapDbToCrewMember(data) : null;
}

/**
 * Fetch project history for a crew member
 */
export async function fetchCrewProjectHistory(crewMemberId: string): Promise<CrewProjectHistory[]> {
    const { data, error } = await supabase
        .from("crew_project_history")
        .select("*")
        .eq("crew_member_id", crewMemberId)
        .order("start_date", { ascending: false });

    if (error) {
        console.error("❌ Error fetching project history:", error);
        return [];
    }

    return (data || []).map(mapDbToProjectHistory);
}

/**
 * Get crew statistics
 */
export async function fetchCrewStats(workspaceId?: string): Promise<{
    total: number;
    active: number;
    skilled: number;
    unskilled: number;
}> {
    let query = supabase.from("crew_members").select("id, status, role");

    if (workspaceId) {
        query = query.eq("workspace_id", workspaceId);
    }

    const { data, error } = await query;

    if (error || !data) {
        return { total: 0, active: 0, skilled: 0, unskilled: 0 };
    }

    return {
        total: data.length,
        active: data.filter((c) => c.status === "ACTIVE").length,
        skilled: data.filter((c) => SKILLED_ROLES.includes(c.role)).length,
        unskilled: data.filter((c) => c.role === "HELPER" || c.role === "GENERAL").length,
    };
}

// ============================================
// CREATE OPERATIONS
// ============================================

export interface CreateCrewMemberInput {
    workspaceId?: string;
    name: string;
    initials?: string;
    nik?: string;
    phone?: string;
    email?: string;
    avatarUrl?: string;
    role: CrewRole;
    skillTags?: string[];
    status?: CrewStatus;
    joinDate?: string;
    notes?: string;
    baseDailyRate?: number;
    overtimeDailyRate?: number;
    otRate1?: number;
    otRate2?: number;
    otRate3?: number;
    bankName?: string;
    bankAccount?: string;
    currentProjectCode?: string;
}

/**
 * Create a new crew member
 */
export async function createCrewMember(input: CreateCrewMemberInput): Promise<CrewMember | null> {
    const insertData = {
        workspace_id: input.workspaceId || null,
        name: input.name,
        initials: input.initials || null,
        nik: input.nik || null,
        phone: input.phone || null,
        email: input.email || null,
        avatar_url: input.avatarUrl || null,
        role: input.role,
        skill_tags: input.skillTags || [],
        status: input.status || "ACTIVE",
        join_date: input.joinDate || null,
        notes: input.notes || null,
        base_daily_rate: input.baseDailyRate || 0,
        overtime_daily_rate: input.overtimeDailyRate || 0,
        ot_rate_1: input.otRate1 || 0,
        ot_rate_2: input.otRate2 || 0,
        ot_rate_3: input.otRate3 || 0,
        bank_name: input.bankName || null,
        bank_account: input.bankAccount || null,
        current_project_code: input.currentProjectCode || null,
    };

    const { data, error } = await supabase
        .from("crew_members")
        .insert(insertData)
        .select()
        .single();

    if (error) {
        console.error("❌ Error creating crew member:", error);
        throw new Error(error.message);
    }

    return mapDbToCrewMember(data);
}

// ============================================
// UPDATE OPERATIONS
// ============================================

export interface UpdateCrewMemberInput {
    name?: string;
    initials?: string;
    nik?: string;
    phone?: string;
    email?: string;
    avatarUrl?: string;
    role?: CrewRole;
    skillTags?: string[];
    status?: CrewStatus;
    joinDate?: string;
    notes?: string;
    baseDailyRate?: number;
    overtimeDailyRate?: number;
    otRate1?: number;
    otRate2?: number;
    otRate3?: number;
    bankName?: string;
    bankAccount?: string;
    currentProjectCode?: string;
}

/**
 * Update a crew member
 */
export async function updateCrewMember(
    id: string,
    input: UpdateCrewMemberInput
): Promise<CrewMember | null> {
    const updateData: Record<string, any> = {};

    if (input.name !== undefined) updateData.name = input.name;
    if (input.initials !== undefined) updateData.initials = input.initials;
    if (input.nik !== undefined) updateData.nik = input.nik;
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.email !== undefined) updateData.email = input.email;
    if (input.avatarUrl !== undefined) updateData.avatar_url = input.avatarUrl;
    if (input.role !== undefined) updateData.role = input.role;
    if (input.skillTags !== undefined) updateData.skill_tags = input.skillTags;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.joinDate !== undefined) updateData.join_date = input.joinDate;
    if (input.notes !== undefined) updateData.notes = input.notes;
    if (input.baseDailyRate !== undefined) updateData.base_daily_rate = input.baseDailyRate;
    if (input.overtimeDailyRate !== undefined) updateData.overtime_daily_rate = input.overtimeDailyRate;
    if (input.otRate1 !== undefined) updateData.ot_rate_1 = input.otRate1;
    if (input.otRate2 !== undefined) updateData.ot_rate_2 = input.otRate2;
    if (input.otRate3 !== undefined) updateData.ot_rate_3 = input.otRate3;
    if (input.bankName !== undefined) updateData.bank_name = input.bankName;
    if (input.bankAccount !== undefined) updateData.bank_account = input.bankAccount;
    if (input.currentProjectCode !== undefined) updateData.current_project_code = input.currentProjectCode;

    const { data, error } = await supabase
        .from("crew_members")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

    if (error) {
        console.error("❌ Error updating crew member:", error);
        throw new Error(error.message);
    }

    return mapDbToCrewMember(data);
}

// ============================================
// DELETE OPERATIONS
// ============================================

/**
 * Delete a crew member
 */
export async function deleteCrewMember(id: string): Promise<boolean> {
    const { error } = await supabase.from("crew_members").delete().eq("id", id);

    if (error) {
        console.error("❌ Error deleting crew member:", error);
        throw new Error(error.message);
    }

    return true;
}

// ============================================
// PROJECT ASSIGNMENT OPERATIONS
// ============================================

/**
 * Assign crew to a project (creates history entry)
 */
export async function assignCrewToProject(
    crewMemberId: string,
    projectCode: string,
    projectName?: string
): Promise<boolean> {
    // End any ongoing assignments first
    await supabase
        .from("crew_project_history")
        .update({ status: "completed", end_date: new Date().toISOString().split("T")[0] })
        .eq("crew_member_id", crewMemberId)
        .eq("status", "ongoing");

    // Create new assignment
    const { error: historyError } = await supabase.from("crew_project_history").insert({
        crew_member_id: crewMemberId,
        project_code: projectCode,
        project_name: projectName,
        start_date: new Date().toISOString().split("T")[0],
        status: "ongoing",
    });

    if (historyError) {
        console.error("❌ Error creating project history:", historyError);
        return false;
    }

    // Update current project on crew member
    const { error: updateError } = await supabase
        .from("crew_members")
        .update({ current_project_code: projectCode })
        .eq("id", crewMemberId);

    if (updateError) {
        console.error("❌ Error updating current project:", updateError);
        return false;
    }

    return true;
}

/**
 * Unassign crew from current project
 */
export async function unassignCrewFromProject(crewMemberId: string): Promise<boolean> {
    // End ongoing assignment
    await supabase
        .from("crew_project_history")
        .update({ status: "completed", end_date: new Date().toISOString().split("T")[0] })
        .eq("crew_member_id", crewMemberId)
        .eq("status", "ongoing");

    // Clear current project
    const { error } = await supabase
        .from("crew_members")
        .update({ current_project_code: null })
        .eq("id", crewMemberId);

    if (error) {
        console.error("❌ Error unassigning crew:", error);
        return false;
    }

    return true;
}
// ============================================
// DAILY LOGS
// ============================================

export async function fetchDailyLogs(workspaceId: string, projectCode?: string, dateStr?: string): Promise<DailyLog[]> {
    let query = supabase.from("crew_daily_logs").select("*").eq("workspace_id", workspaceId);

    if (projectCode) query = query.eq("project_code", projectCode);
    if (dateStr) query = query.eq("date", dateStr);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(mapDbToDailyLog);
}

export async function upsertDailyLog(entry: {
    workspaceId: string;
    crewId: string;
    projectCode: string;
    date: string;
    status: string;
    regularHours: number;
    ot1Hours: number;
    ot2Hours: number;
    ot3Hours: number;
}): Promise<DailyLog> {
    // Check if exists to determine insert/update (though upsert with unique key handles this)
    const { data, error } = await supabase
        .from("crew_daily_logs")
        .upsert({
            workspace_id: entry.workspaceId,
            crew_id: entry.crewId,
            project_code: entry.projectCode,
            date: entry.date,
            status: entry.status,
            regular_hours: entry.regularHours,
            ot1_hours: entry.ot1Hours,
            ot2_hours: entry.ot2Hours,
            ot3_hours: entry.ot3Hours,
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'crew_id, date, project_code'
        })
        .select()
        .single();

    if (error) throw error;
    return mapDbToDailyLog(data);
}


export type RequestType = "LEAVE" | "KASBON" | "REIMBURSE" | "SICK" | "OTHER";
export type RequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELED";

export interface CrewRequest {
    id: string;
    workspaceId: string;
    crewId: string;
    crewName?: string; // For joining
    crewRole?: CrewRole; // For joining
    projectCode?: string; // Mapped from crew
    type: RequestType;
    amount?: number;
    startDate: string;
    endDate?: string;
    reason: string;
    proofUrl?: string;
    status: RequestStatus;
    createdAt: string;
}

export async function fetchRequests(workspaceId: string, projectId?: string): Promise<CrewRequest[]> {
    let query = supabase
        .from("crew_requests")
        .select(`
            *,
            crew:crew_id (name, role, current_project_code)
        `)
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });

    // Client-side filter for project if needed, or add to query if we join projects table
    // For now, simpler to filter in memory or assume crew.current_project_code matches

    const { data, error } = await query;
    if (error) {
        console.error("Error fetching requests:", error);
        return [];
    }

    // Map result
    return data.map((r: any) => ({
        id: r.id,
        workspaceId: r.workspace_id,
        crewId: r.crew_id,
        crewName: r.crew?.name,
        crewRole: r.crew?.role,
        projectCode: r.crew?.current_project_code, // Or use r.project_code if we stored it
        type: r.type,
        amount: parseFloat(r.amount) || 0,
        startDate: r.start_date,
        endDate: r.end_date,
        reason: r.reason,
        proofUrl: r.proof_url,
        status: r.status,
        createdAt: r.created_at
    }));
}

export async function createRequest(request: Partial<CrewRequest>) {
    const { data, error } = await supabase
        .from("crew_requests")
        .insert({
            workspace_id: request.workspaceId,
            crew_id: request.crewId,
            type: request.type,
            amount: request.amount,
            start_date: request.startDate,
            end_date: request.endDate,
            reason: request.reason,
            proof_url: request.proofUrl,
            status: "PENDING"
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function updateRequest(id: string, updates: Partial<CrewRequest>) {
    const { data, error } = await supabase
        .from("crew_requests")
        .update({
            type: updates.type,
            amount: updates.amount,
            start_date: updates.startDate,
            end_date: updates.endDate,
            reason: updates.reason,
            proof_url: updates.proofUrl,
            status: updates.status
        })
        .eq("id", id)
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function deleteDailyLogsForDate(crewId: string, date: string) {
    const { error } = await supabase
        .from("crew_daily_logs")
        .delete()
        .eq("crew_id", crewId)
        .eq("date", date);

    if (error) {
        console.error("Error deleting daily logs:", error);
        throw error;
    }
}

export async function deleteDailyLogEntry(crewId: string, date: string, projectCode: string) {
    const { error } = await supabase
        .from("crew_daily_logs")
        .delete()
        .eq("crew_id", crewId)
        .eq("date", date)
        .eq("project_code", projectCode);

    if (error) {
        console.error("Error deleting daily log entry:", error);
        throw error;
    }
}



export async function deleteRequest(id: string) {
    const { error } = await supabase.from("crew_requests").delete().eq("id", id);
    if (error) throw error;
    return true;
}

export async function updateRequestStatus(id: string, status: RequestStatus, approvedBy?: string) {
    const updateData: any = { status, updated_at: new Date().toISOString() };
    if (status === "APPROVED" && approvedBy) {
        updateData.approved_by = approvedBy;
        updateData.approved_at = new Date().toISOString();
    }

    const { data, error } = await supabase
        .from("crew_requests")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

// Helper to update just the rating
export async function updateDailyRating(crewId: string, workspaceId: string, date: string, rating: number) {
    // 1. Check if log exists
    const { data: existing } = await supabase
        .from("crew_daily_logs")
        .select("*")
        .eq("crew_id", crewId)
        .eq("date", date)
        .single();
    
    if (existing) {
        // Update
        const { error } = await supabase
            .from("crew_daily_logs")
            .update({ rating })
            .eq("id", existing.id);
        if (error) throw error;
    } else {
        // Create new log with just rating
        const { error } = await supabase
            .from("crew_daily_logs")
            .insert({
                workspace_id: workspaceId,
                crew_id: crewId,
                date: date,
                rating: rating,
                status: "PRESENT", // Default to Present if rating is given
                regular_hours: 0,
                ot1_hours: 0,
                ot2_hours: 0,
                ot3_hours: 0
            });
        if (error) throw error;
    }
}
