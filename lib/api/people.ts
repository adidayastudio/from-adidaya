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
    FeedbackVisibility,
    SkillCategory,
    SkillLibraryItem
} from "@/lib/types/people-types";
import { Person } from "@/components/feel/people/types";
import { OrganizationRolePermission } from "@/lib/types/organization";

const supabase = createClient();

// -- DIRECTORY & PROFILES --

export async function fetchPeopleDirectory(): Promise<Person[]> {
    console.log("Fetching People Directory...");

    // 1. Fetch Profiles and related data in parallel to avoid relation issues and perform manual joins
    const [
        profilesResult,
        rolesResult,
        deptsResult,
        posResult,
        levelsResult,
        empTypesResult,
        workStatusesResult,
        workSchedulesResult
    ] = await Promise.all([
        supabase.from('profiles').select('*').order('full_name', { ascending: true }),
        supabase.from('user_roles').select('*'),
        supabase.from('organization_departments').select('id, name'),
        supabase.from('organization_positions').select('id, name'),
        supabase.from('organization_levels').select('id, name, roman_code'),
        supabase.from('employment_types').select('id, name'),
        supabase.from('work_status').select('id, name'),
        supabase.from('work_schedules').select('id, name')
    ]);

    if (profilesResult.error) {
        console.error('Error fetching profiles:', profilesResult.error);
        return [];
    }

    const profiles = (profilesResult.data || []).filter(p => !!p);

    // DEBUG: Check for the missing user
    const missingId = "056164a2-3936-4e5e-ae1a-13c5bb83e158";
    const found = profiles.find(p => p.id === missingId);
    console.log(`[DEBUG] fetchPeopleDirectory: Total Profiles: ${profiles.length}. Missing ID ${missingId} found? ${found ? 'YES' : 'NO'}`);
    if (!found) {
        console.log(`[DEBUG] First 5 IDs:`, profiles.slice(0, 5).map(p => p.id));
    }

    const roles = (rolesResult.data || []).filter(r => !!r);
    const departments = (deptsResult.data || []).filter(d => !!d);
    const positions = (posResult.data || []).filter(p => !!p);
    const levels = (levelsResult.data || []).filter(l => !!l);
    const empTypes = (empTypesResult.data || []).filter(e => !!e);
    const workStatuses = (workStatusesResult.data || []).filter(w => !!w);
    const schedules = (workSchedulesResult.data || []).filter(s => !!s);

    console.log(`Fetched ${profiles.length} profiles.`);

    return profiles.map((p: any) => {
        const userRoleObj = roles.find((r: any) => r.user_id === p.id);
        const role = userRoleObj?.role || 'staff';

        // Resolve names from IDs
        const deptObj = departments.find((d: any) => d.id === p.department_id);
        const posObj = positions.find((pos: any) => pos.id === p.position_id);
        const levelObj = levels.find((l: any) => l.id === p.level_id);
        const empTypeObj = empTypes.find((et: any) => et.id === p.employment_type_id);
        const workStatusObj = workStatuses.find((ws: any) => ws.id === p.work_status_id);
        const scheduleObj = schedules.find((s: any) => s.id === p.schedule_id);

        const person: Person = {
            id: p.id,
            // New field names
            id_number: p.id_number || p.system_id || p.employee_id || '00000000',
            id_code: p.id_code || p.display_id || `ADY-0-STAFF-${new Date().getFullYear()}000`,
            // Backward compatibility
            system_id: p.id_number || p.system_id || p.employee_id || '00000000',
            display_id: p.id_code || p.display_id || `ADY-0-STAFF-${new Date().getFullYear()}000`,
            account_type: p.account_type || 'human_account',

            name: p.full_name || p.email?.split('@')[0] || 'Unknown',
            nickname: (p.nickname || p.full_name?.split(' ')[0] || '').charAt(0).toUpperCase() + (p.nickname || p.full_name?.split(' ')[0] || '').slice(1),
            email: p.email || '',

            role: role as any,
            title: posObj?.name || p.job_title || 'Team Member',
            department: deptObj?.name || p.department || 'General',
            level: levelObj ? `${levelObj.roman_code} - ${levelObj.name}` : (p.level || 'Junior'),

            status: workStatusObj?.name || p.status || 'Active',
            joinedAt: p.join_date ? new Date(p.join_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) :
                (p.created_at ? new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Unknown'),
            join_date: p.join_date,
            type: empTypeObj?.name || p.employment_type || 'Full Time',
            office: p.office || 'Jakarta HQ',

            avatarUrl: p.avatar_url,
            initials: (p.full_name || '').split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || '??',

            // IDs for editing
            department_id: p.department_id,
            position_id: p.position_id,
            level_id: p.level_id,
            employment_type_id: p.employment_type_id,
            work_status_id: p.work_status_id,
            schedule_id: p.schedule_id,
            schedule_name: scheduleObj?.name,

            // Contract
            contract_end_date: p.contract_end_date,
            probation_status: p.probation_status,

            // History - Fetched on demand
            history: [],

            // Personal Data
            birthday: p.birth_date || p.birthday,
            birth_date: p.birth_date,
            nik: p.nik,
            personal_email: p.personal_email,
            whatsapp: p.whatsapp,
            phone: p.phone_number || p.phone,
            phone_number: p.phone_number,
            address: p.address,
            emergency_contact: p.emergency_contact,
            social_links: p.social_links,
            bank_info: p.bank_info,

            // Module Flags
            include_in_timesheet: p.include_in_timesheet !== false,
            include_in_performance: p.include_in_performance !== false,
            include_in_attendance: p.include_in_attendance !== false,
            include_in_people_analytics: p.include_in_people_analytics !== false,

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
                activeProjects: 0,
                performanceStatus: "No Data"
            },
            kpi: {
                projectInvolvement: 75,
                presenceScore: 75,
                engagementScore: 75,
                peerReviewScore: 75,
                qualityScore: 75,
                taskCompletionScore: 75,
                bonusScore: 0,
                overallScore: 75
            }
        };
        return person;
    }).filter(p => !!p);
}

// On-demand fetch for detailed profile view
export async function fetchPersonDetails(userId: string): Promise<{ history: any[], kpi: any }> {
    try {
        const [historyResult, perfResult] = await Promise.all([
            supabase.from('career_history').select('*').eq('user_id', userId).order('event_date', { ascending: false }),
            supabase.from('people_performance_snapshots').select('*').eq('user_id', userId).order('period', { ascending: false }).limit(1).single()
        ]);

        if (historyResult.error) {
            console.error("Error fetching history:", historyResult.error);
        }
        if (perfResult.error && perfResult.code !== 'PGRST116') { // Ignore 'no rows' error
            // console.warn("Performance snapshot fetch info:", perfResult.error.message || perfResult.error);
        }

        const history = (historyResult.data || []).map((h: any) => ({
            id: h.id,
            title: h.title,
            event_date: h.event_date,
            type: h.type,
            is_manual: h.is_manual
        }));

        const userSnapshot = perfResult.data;

        const kpi = {
            projectInvolvement: userSnapshot?.project_involvement_score || 75,
            presenceScore: userSnapshot?.attendance_score || 75,
            engagementScore: userSnapshot?.engagement_score || 75,
            peerReviewScore: userSnapshot?.peer_review_score || 75,
            qualityScore: userSnapshot?.quality_score || 75,
            taskCompletionScore: userSnapshot?.task_completion_score || 75,
            bonusScore: userSnapshot?.bonus_score || 0,
            overallScore: userSnapshot?.computed_index || 75
        };

        return { history, kpi };
    } catch (error) {
        console.error("Critical error in fetchPersonDetails:", error);
        // Return safe defaults to prevent UI crash
        return {
            history: [],
            kpi: {
                projectInvolvement: 75,
                presenceScore: 75,
                engagementScore: 75,
                peerReviewScore: 75,
                qualityScore: 75,
                taskCompletionScore: 75,
                bonusScore: 0,
                overallScore: 75
            }
        };
    }
}

export async function updatePeopleProfile(userId: string, updates: {
    account_type?: string;
    include_in_performance?: boolean;
    name?: string;
    nickname?: string;
    email?: string;
    birth_date?: string;
    nik?: string;
    personal_email?: string;
    whatsapp?: string;
    phone_number?: string;
    social_links?: any;
    address?: any;
    emergency_contact?: any;
    bank_info?: any;
    department_id?: string;
    position_id?: string;
    level_id?: string;
    employment_type_id?: string;
    work_status_id?: string;
    display_id?: string;
    id_number?: string;
    join_date?: string;
    schedule_id?: string;
    office?: string;
    contract_end_date?: string;
    probation_status?: string;
}): Promise<boolean> {

    // Map frontend fields to DB columns
    const dbUpdates: any = {};
    if (updates.account_type) dbUpdates.account_type = updates.account_type;
    if (updates.include_in_performance !== undefined) dbUpdates.include_in_performance = updates.include_in_performance;
    if (updates.name) dbUpdates.full_name = updates.name;
    if (updates.nickname) dbUpdates.nickname = updates.nickname;
    if (updates.email) dbUpdates.email = updates.email;

    // --- Auto-Generate ID Code if relevant fields change ---
    if (updates.id_number || updates.level_id || updates.department_id || updates.position_id) {
        try {
            // 1. Get current values for missing fields
            const { data: current, error: currErr } = await supabase
                .from('profiles')
                .select('level_id, department_id, position_id, join_date, id_number')
                .eq('id', userId)
                .single();

            if (!currErr && current) {
                const targetLevelId = updates.level_id || current.level_id;
                const targetDeptId = updates.department_id || current.department_id;
                const targetPosId = updates.position_id || current.position_id;
                const targetJoinDate = updates.join_date || current.join_date;
                const targetIdNumber = updates.id_number || current.id_number;

                // 2. Fetch Codes
                const [levelRes, deptRes, posRes] = await Promise.all([
                    targetLevelId ? supabase.from('organization_levels').select('roman_code').eq('id', targetLevelId).single() : { data: null },
                    targetDeptId ? supabase.from('organization_departments').select('code').eq('id', targetDeptId).single() : { data: null },
                    targetPosId ? supabase.from('organization_positions').select('code').eq('id', targetPosId).single() : { data: null }
                ]);

                const roman = levelRes.data?.roman_code || '0';
                const deptCodeFull = deptRes.data?.code || '';
                const posCode = posRes.data?.code || '';

                // Extract Dept Abbreviation (e.g. "D-TECH" -> "TECH")
                const deptCode = deptCodeFull.includes('-') ? deptCodeFull.split('-')[1] : deptCodeFull;

                // 3. Extract Sequence (Last 3 digits of ID Number)
                let sequence = '000';
                if (targetIdNumber && targetIdNumber.length >= 3) {
                    sequence = targetIdNumber.substring(targetIdNumber.length - 3);
                }

                // 4. Year Suffix
                const yearSuffix = targetJoinDate
                    ? new Date(targetJoinDate).getFullYear().toString().slice(-2)
                    : new Date().getFullYear().toString().slice(-2);

                // 5. Construct ID Code: ADY-{ROMAN}-{DEPT}{POS}-20{YY}{SEQ}
                let newIdCode = '';
                if (!deptCode && !posCode) {
                    newIdCode = `ADY-${roman}-STAFF-20${yearSuffix}${sequence}`;
                } else {
                    newIdCode = `ADY-${roman}-${deptCode}${posCode}-20${yearSuffix}${sequence}`;
                }

                console.log(`[Auto-ID] Regenerated ID Code for ${userId}: ${newIdCode}`);
                dbUpdates.id_code = newIdCode;

                // Also ensure id_number is updated in DB if it was passed
                if (updates.id_number) dbUpdates.id_number = updates.id_number;
            }
        } catch (err) {
            console.error("Failed to auto-generate ID Code:", err);
            // Fallback: Don't update id_code if generation fails, just proceed with other updates
        }
    }

    // Employment
    if (updates.department_id) dbUpdates.department_id = updates.department_id;
    if (updates.position_id) dbUpdates.position_id = updates.position_id;
    if (updates.level_id) dbUpdates.level_id = updates.level_id;
    if (updates.employment_type_id) dbUpdates.employment_type_id = updates.employment_type_id;
    if (updates.work_status_id) dbUpdates.work_status_id = updates.work_status_id;
    if (updates.display_id) dbUpdates.id_code = updates.display_id; // Map to new column name
    if (updates.id_number) dbUpdates.id_number = updates.id_number; // Map to new column name
    if (updates.join_date) dbUpdates.join_date = updates.join_date;
    if (updates.schedule_id) dbUpdates.schedule_id = updates.schedule_id;
    if (updates.office) dbUpdates.office = updates.office;
    if (updates.contract_end_date !== undefined) dbUpdates.contract_end_date = updates.contract_end_date; // Allow null
    if (updates.probation_status) dbUpdates.probation_status = updates.probation_status;

    // New fields
    if (updates.birth_date) dbUpdates.birth_date = updates.birth_date;
    if (updates.nik) dbUpdates.nik = updates.nik;
    if (updates.personal_email) dbUpdates.personal_email = updates.personal_email;
    if (updates.whatsapp) dbUpdates.whatsapp = updates.whatsapp;
    if (updates.phone_number) dbUpdates.phone_number = updates.phone_number;
    if (updates.social_links) dbUpdates.social_links = updates.social_links;
    if (updates.address) dbUpdates.address = updates.address;
    if (updates.emergency_contact) dbUpdates.emergency_contact = updates.emergency_contact;
    if (updates.bank_info) dbUpdates.bank_info = updates.bank_info;

    if (Object.keys(dbUpdates).length === 0) return true;

    const { error } = await supabase
        .from('profiles')
        .update(dbUpdates)
        .eq('id', userId);

    if (error) {
        console.error('Error updating profile:', JSON.stringify(error, null, 2));
        return false;
    }
    return true;
}

export async function addCareerHistory(history: {
    user_id: string;
    title: string;
    event_date: string;
    type: string;
    description?: string;
}): Promise<boolean> {
    const { error } = await supabase
        .from('career_history')
        .insert({
            ...history,
            is_manual: true
        });

    if (error) {
        console.error('Error adding career history:', error);
        return false;
    }
    return true;
}

export async function deleteCareerHistory(id: string): Promise<boolean> {
    const { error } = await supabase
        .from('career_history')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting career history:', error);
        return false;
    }
    return true;
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
    category_id?: string;
    skill_name: string;
    skill_level: string;
}): Promise<PeopleSkill | null> {
    const { data, error } = await supabase
        .from('people_skills')
        .upsert(skill, { onConflict: 'user_id,skill_name' })
        .select()
        .single();

    if (error) {
        console.error('Error upserting people skill:', JSON.stringify({
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
            fullError: error
        }, null, 2));
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

export async function fetchSkillCategories(): Promise<SkillCategory[]> {
    const { data, error } = await supabase
        .from('skill_categories')
        .select('*')
        .eq('status', 'active')
        .order('name');

    if (error) {
        console.error('Error fetching skill categories:', error);
        return [];
    }
    return data || [];
}

export async function fetchSkillLibrary(): Promise<SkillLibraryItem[]> {
    const { data, error } = await supabase
        .from('skill_library')
        .select('*')
        .eq('status', 'active')
        .order('name');

    if (error) {
        console.error('Error fetching skill library:', error);
        return [];
    }
    return data || [];
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

export async function fetchTeamBenchmark(period: string): Promise<any> {
    const { data, error } = await supabase
        .from('team_performance_snapshots')
        .select('*')
        .eq('period', period);

    if (error) {
        console.error('Error fetching team benchmark:', error);
        return null;
    }

    // If multiple departments, average them or just return all for specific processing
    return data || [];
}

// -- ACCESS & VISIBILITY --

export async function fetchAllRolePermissions(): Promise<(OrganizationRolePermission & { role_name: string, role_code: string })[]> {
    const { data, error } = await supabase
        .from('organization_role_permissions')
        .select(`
            *,
            organization_system_roles!inner (
                name,
                code
            )
        `);

    if (error) {
        console.error('Error fetching all role permissions:', error.message || error);
        return [];
    }

    return (data || []).map((item: any) => ({
        ...item,
        role_name: item.organization_system_roles.name,
        role_code: item.organization_system_roles.code
    }));
}

export async function fetchMyRolePermissions(): Promise<OrganizationRolePermission | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Get active role code from user_roles
    const { data: userRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

    if (!userRole) return null;

    // Get permissions by matching role code
    const { data, error } = await supabase
        .from('organization_role_permissions')
        .select(`
            *,
            organization_system_roles!inner (
                code
            )
        `)
        .eq('organization_system_roles.code', userRole.role.toUpperCase())
        .maybeSingle();

    if (error) {
        console.error('Error fetching my permissions:', error);
        return null;
    }
    return data;
}

export async function updateRolePermissions(permission: Partial<OrganizationRolePermission>): Promise<boolean> {
    if (!permission.role_id) return false;

    const { error } = await supabase
        .from('organization_role_permissions')
        .upsert(permission)
        .eq('role_id', permission.role_id);

    if (error) {
        console.error('Error updating role permissions:', error);
        return false;
    }
    return true;
}

// -- DOCUMENTS --

export async function fetchUserDocuments(userId: string) {
    const { data, error } = await supabase
        .from('user_documents')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching user documents:', error);
        return [];
    }
    return data;
}

export async function uploadUserDocument(userId: string, category: string, file: File) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${category}_${Date.now()}.${fileExt}`;
    const filePath = fileName;

    // 1. Upload to Storage
    const { error: uploadError } = await supabase.storage
        .from('profile-documents')
        .upload(filePath, file);

    if (uploadError) {
        console.error('Error uploading file:', uploadError);
        return null;
    }

    // 2. Create Database Record
    const { data, error: dbError } = await supabase
        .from('user_documents')
        .insert({
            user_id: userId,
            name: file.name,
            category: category,
            file_path: filePath,
            file_type: file.type,
            size: file.size,
            status: 'Pending'
        })
        .select()
        .single();

    if (dbError) {
        console.error('Error creating document record:', JSON.stringify(dbError, null, 2));
        // Cleanup storage on error
        await supabase.storage.from('profile-documents').remove([filePath]);
        return null;
    }

    return data;
}

export async function deleteUserDocument(docId: string, filePath: string) {
    // 1. Delete from Storage
    const { error: storageError } = await supabase.storage
        .from('profile-documents')
        .remove([filePath]);

    if (storageError) {
        console.error('Error deleting from storage:', storageError);
    }

    // 2. Delete from DB
    const { error: dbError } = await supabase
        .from('user_documents')
        .delete()
        .eq('id', docId);

    if (dbError) {
        console.error('Error deleting from DB:', dbError);
        return false;
    }

    return true;
}

export async function getDocumentUrl(filePath: string) {
    const { data } = await supabase.storage
        .from('profile-documents')
        .createSignedUrl(filePath, 3600); // 1 hour

    return data?.signedUrl;
}

export async function updateUserRole(userId: string, roleCode: string): Promise<boolean> {
    const { error } = await supabase
        .from('user_roles')
        .upsert({
            user_id: userId,
            role: roleCode.toLowerCase()
        }, { onConflict: 'user_id' });

    if (error) {
        console.error('Error updating user role:', JSON.stringify(error, null, 2));
        return false;
    }
    return true;
}
