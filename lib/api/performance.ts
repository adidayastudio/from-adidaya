import { createClient } from "@/utils/supabase/client";

export interface PerformanceRule {
    id: string;
    effective_start_date: string;
    weight_attendance: number;
    weight_task_completion: number;
    weight_task_quality: number;
    weight_peer_review: number;
    overtime_bonus_enabled: boolean;
    overtime_max_bonus: number;
    period_type: 'weekly' | 'monthly';
    snapshot_day_trigger: string;
    auto_lock_enabled: boolean;
    is_active: boolean;
    scoring_params: {
        attendance: {
            late_penalty: number;
            max_late_penalty: number;
        };
        task_quality: {
            revision_deduction: number;
            max_deduction: number;
        };
    };
    incentive_allocation_project?: number; // Default 90
    incentive_allocation_performance?: number; // Default 10
}

export interface IncentiveRoleWeight {
    id: string;
    role_name: string; // Keep for fallback or display
    level_id?: string;
    weight_points: number; // Deprecated but kept for compatibility
    min_weight?: number;
    max_weight?: number;
    description?: string;
    is_active: boolean;
    sort_order: number;
}

export interface ProjectIncentiveLevelRange {
    id: string;
    level_code: string;
    min_percent: number;
    max_percent: number;
    allow_zero: boolean;
    effective_cap_ratio: number;
    redistribution_target?: string;
    notes?: string;
    is_active: boolean;
}

export interface ProjectIncentiveParticipant {
    id: string;
    project_id: string;
    user_id?: string;
    level_code: string;
    raw_contribution_percent: number;
    final_incentive_percent: number;
    notes?: string;
    created_at?: string;
    updated_at?: string;
    // Expanded for UI
    user_name?: string;
    user_avatar?: string;
    user_title?: string;
}

export async function fetchCurrentPerformanceRule() {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('performance_rules')
        .select('*')
        .eq('is_active', true)
        .order('effective_start_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (error && error.code !== 'PGRST116') { // Ignore no rows found
        console.error('Error fetching performance rule:', error);
        return null; // Return null if not found or error
    }
    return data as PerformanceRule | null;
}

export async function savePerformanceRule(rule: Partial<PerformanceRule>) {
    const supabase = createClient();
    // Always create a new version for history tracking
    // We explicitly exclude 'id' so Postgres generates a new one
    const { id, ...ruleData } = rule;

    const { data, error } = await supabase
        .from('performance_rules')
        .insert([{
            ...ruleData,
            effective_start_date: ruleData.effective_start_date || new Date().toISOString(),
            created_at: new Date().toISOString()
        }])
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function fetchIncentiveRoles() {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('incentive_role_weights')
        .select('*')
        .order('sort_order', { ascending: true });

    if (error) throw error;
    return data as IncentiveRoleWeight[];
}

export async function saveIncentiveRole(role: Partial<IncentiveRoleWeight>) {
    const supabase = createClient();

    if (role.id) {
        // Update
        const { data, error } = await supabase
            .from('incentive_role_weights')
            .update(role)
            .eq('id', role.id)
            .select()
            .single();
        if (error) throw error;
        return data;
    } else {
        // Insert
        const { data, error } = await supabase
            .from('incentive_role_weights')
            .insert([role])
            .select()
            .single();
        if (error) throw error;
        return data;
    }
}

export async function deleteIncentiveRole(id: string) {
    const supabase = createClient();
    const { error } = await supabase
        .from('incentive_role_weights')
        .delete()
        .eq('id', id);

    if (error) throw error;
    return true;
}


// -- PROJECT INCENTIVE LEVEL RANGES --

export async function fetchIncentiveLevelRanges() {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('project_incentive_level_ranges')
        .select('*')
        .eq('is_active', true)
        .order('min_percent', { ascending: true }); // Heuristic sort

    if (error) {
        console.error('Error fetching level ranges:', error);
        return [];
    }
    return data as ProjectIncentiveLevelRange[];
}

export async function upsertIncentiveLevelRange(range: Partial<ProjectIncentiveLevelRange>) {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('project_incentive_level_ranges')
        .upsert(range)
        .select()
        .single();

    if (error) throw error;
    return data;
}

// -- PROJECT INCENTIVE PARTICIPANTS --

export async function fetchProjectIncentiveParticipants(projectId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('project_incentive_participants')
        .select(`
            *,
            profiles:user_id (
                full_name,
                avatar_url,
                job_title
            )
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

    if (error) throw error;

    return (data || []).map((p: any) => ({
        ...p,
        user_name: p.profiles?.full_name || 'Unknown',
        user_avatar: p.profiles?.avatar_url,
        user_title: p.profiles?.job_title
    })) as ProjectIncentiveParticipant[];
}

export async function upsertProjectIncentiveParticipant(participant: Partial<ProjectIncentiveParticipant>) {
    const supabase = createClient();

    // Prepare payload
    const payload: any = {
        project_id: participant.project_id,
        user_id: participant.user_id,
        level_code: participant.level_code,
        raw_contribution_percent: participant.raw_contribution_percent,
        notes: participant.notes,
        updated_at: new Date().toISOString()
    };

    if (participant.id) payload.id = participant.id;

    const { data, error } = await supabase
        .from('project_incentive_participants')
        .upsert(payload)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deleteProjectIncentiveParticipant(id: string) {
    const supabase = createClient();
    const { error } = await supabase
        .from('project_incentive_participants')
        .delete()
        .eq('id', id);

    if (error) throw error;
    return true;
}

// -- CALCULATION LOGIC --

export async function calculateProjectIncentives(projectId: string) {
    const supabase = createClient();

    // Call the RPC function
    const { data, error } = await supabase
        .rpc('calculate_project_incentives', { p_project_id: projectId });

    if (error) throw error;
    return data;
}
