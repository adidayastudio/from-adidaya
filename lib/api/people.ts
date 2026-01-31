import { createClient } from "@/utils/supabase/client";
import {
    PeopleSkill,
    PeopleAvailability,
    PeopleFeedback,
    PeoplePerformanceSnapshot,
    TeamPerformanceSnapshot,
    SkillLevel,
    WorkloadStatus,
    WorkloadSource,
    FeedbackVisibility
} from "@/lib/types/people-types";
import { Person } from "@/components/feel/people/types";

const supabase = createClient();

// -- DIRECTORY & PROFILES --

export async function fetchPeopleDirectory(): Promise<Person[]> {
    console.log("Fetching People Directory...");

    // 1. Fetch Profiles and Roles in parallel to avoid relation issues
    // Using simple select('*') to ensure we get data even if relations are broken
    const [profilesResult, rolesResult] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('user_roles').select('*')
    ]);

    if (profilesResult.error) {
        console.error('Error fetching profiles:', profilesResult.error);
        return [];
    }

    const profiles = profilesResult.data || [];
    const roles = rolesResult.data || [];

    console.log(`Fetched ${profiles.length} profiles and ${roles.length} roles.`);

    // 2. Map to Person Type
    return profiles.map((p: any) => {
        // Find role for this user (linking by user_id which is typically the id in profiles if 1:1, or a field)
        // In most Supabase setups, profiles.id IS the auth.user.id
        const userRoleObj = roles.find((r: any) => r.user_id === p.id);
        const role = userRoleObj?.role || 'staff';

        return {
            id: p.id,
            name: p.full_name || p.email?.split('@')[0] || 'Unknown',
            email: p.email || '',
            role: role as any,
            title: p.job_title || 'Team Member',
            department: p.department || 'General',
            status: 'Active',
            joinedAt: p.created_at ? new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Unknown',
            type: 'Full Time',
            initials: (p.full_name || '').split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || '??',
            avatarUrl: p.avatar_url,

            // Default Empty Stats (will fetch real ones later)
            // We set attendanceRate to 0 to indicate "no data" rather than a fake 100%
            attendance: {
                attendanceRate: 0,
                totalDays: 0,
                lateDays: 0,
                absentDays: 0,
                overtimeHours: 0
            },
            performance: {
                tasksCompleted: 0,
                avgTaskCompletionTime: "N/A",
                performanceScore: 0,
                productivityTrend: "stable",
                activeProjects: 0
            },
            kpi: {
                projectInvolvement: 0,
                presenceScore: 0,
                engagementScore: 0,
                overallScore: 0
            }
        };
    });
}

// -- SKILLS --

export async function fetchPeopleSkills(userId: string): Promise<PeopleSkill[]> {
    const { data, error } = await supabase
        .from('people_skills')
        .select('*')
        .eq('user_id', userId)
        .order('skill_level', { ascending: false });

    if (error) {
        console.error('Error fetching people skills:', error);
        return [];
    }
    return data || [];
}

export async function upsertPeopleSkill(skill: {
    user_id: string;
    skill_name: string;
    skill_level: SkillLevel;
}): Promise<PeopleSkill | null> {
    const { data, error } = await supabase
        .from('people_skills')
        .upsert(skill, { onConflict: 'user_id,skill_name' })
        .select()
        .single();

    if (error) {
        console.error('Error upserting people skill:', error);
        return null;
    }
    return data;
}

export async function deletePeopleSkill(skillId: string): Promise<boolean> {
    const { error } = await supabase
        .from('people_skills')
        .delete()
        .eq('id', skillId);

    if (error) {
        console.error('Error deleting people skill:', error);
        return false;
    }
    return true;
}

// -- AVAILABILITY --

export async function fetchPeopleAvailability(userId: string): Promise<PeopleAvailability | null> {
    const { data, error } = await supabase
        .from('people_availability')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (error) {
        if (error.code !== 'PGRST116') { // Ignore "Row not found"
            console.error('Error fetching people availability:', error);
        }
        // Return default object if null to prevent UI errors
        return null;
    }
    return data;
}

export async function updatePeopleAvailability(
    userId: string,
    status: WorkloadStatus,
    source: WorkloadSource = 'manual',
    notes?: string
): Promise<PeopleAvailability | null> {
    const payload = {
        user_id: userId,
        workload_status: status,
        source: source,
        notes: notes,
        updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
        .from('people_availability')
        .upsert(payload, { onConflict: 'user_id' })
        .select()
        .single();

    if (error) {
        console.error('Error updating people availability:', error);
        return null;
    }
    return data;
}

// -- FEEDBACK (PRIVATE) --

export async function createPeopleFeedback(feedback: {
    user_id: string;
    reviewer_id: string;
    note: string;
    visibility: FeedbackVisibility;
}): Promise<PeopleFeedback | null> {
    const { data, error } = await supabase
        .from('people_feedback')
        .insert(feedback)
        .select()
        .single();

    if (error) {
        console.error('Error creating people feedback:', error);
        return null;
    }
    return data;
}

export async function fetchPeopleFeedback(targetUserId: string): Promise<PeopleFeedback[]> {
    const { data, error } = await supabase
        .from('people_feedback')
        .select('*')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching people feedback:', error);
        return [];
    }
    return data || [];
}

// -- PERFORMANCE SNAPSHOTS --

export async function fetchPeoplePerformance(userId: string, period?: string): Promise<PeoplePerformanceSnapshot[]> {
    let query = supabase
        .from('people_performance_snapshots')
        .select('*')
        .eq('user_id', userId)
        .order('period', { ascending: false });

    if (period) {
        query = query.eq('period', period);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching people performance:', error);
        return [];
    }
    return data || [];
}

export async function fetchTeamPerformance(department: string, period?: string): Promise<TeamPerformanceSnapshot[]> {
    let query = supabase
        .from('team_performance_snapshots')
        .select('*')
        .eq('department', department)
        .order('period', { ascending: false });

    if (period) {
        query = query.eq('period', period);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching team performance:', error);
        return [];
    }
    return data || [];
}
