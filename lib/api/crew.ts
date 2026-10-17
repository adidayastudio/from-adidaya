import { supabase } from '../supabase';
import { 
    CrewMember, 
    Assignment, 
    DailyLog, 
    CrewRequest,
    CrewRole,
    CrewStatus,
    RequestType,
    RequestStatus
} from '../../components/crew/mockData';

// Helper to determine if a string is a valid UUID
function isUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
}

export function capitalizeEachWord(str: string): string {
    if (!str) return '';
    return str
        .toLowerCase()
        .split(/\s+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// ---------------------------------------------------------
// CREW MEMBERS API
// ---------------------------------------------------------

export async function fetchCrewMembers(workspaceId: string): Promise<CrewMember[]> {
    let query = supabase
        .from('crew_members')
        .select('*');

    if (workspaceId) {
        query = query.or(`workspace_id.eq.${workspaceId},workspace_id.is.null`);
    }

    const { data, error } = await query.order('name', { ascending: true });

    if (error) {
        console.warn('Crew members not available or error occurred:', error?.message);
        return [];
    }

    return (data || []).map((m: any) => ({
        id: m.id,
        name: capitalizeEachWord(m.name),
        initials: m.initials || m.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2),
        role: m.role as CrewRole,
        status: m.status as CrewStatus,
        skillTags: m.skill_tags || [],
        projectCode: m.current_project_code || undefined,
        baseDailyRate: Number(m.base_daily_rate) || 0,
        overtimeDailyRate: Number(m.overtime_daily_rate) || 0,
        otRate1: Number(m.ot_rate_1) || 0,
        otRate2: Number(m.ot_rate_2) || 0,
        otRate3: Number(m.ot_rate_3) || 0,
        phone: m.phone || undefined,
        email: m.email || undefined,
        nik: m.nik || undefined,
        notes: m.notes || undefined,
        bankName: m.bank_name || undefined,
        bankAccountNumber: m.bank_account || undefined,
        documents: [] // Documents will be fetched separately or placeholders
    }));
}

export async function saveCrewMember(member: CrewMember, workspaceId: string): Promise<CrewMember> {
    const capitalizedName = capitalizeEachWord(member.name);
    const generatedInitials = member.initials || capitalizedName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
    
    const dbPayload = {
        workspace_id: workspaceId,
        name: capitalizedName,
        initials: generatedInitials,
        nik: member.nik || null,
        phone: member.phone || null,
        email: member.email || null,
        avatar_url: member.photoUrl || null,
        role: member.role,
        skill_tags: member.skillTags || [],
        status: member.status,
        join_date: member.joinDate || null,
        notes: member.notes || null,
        base_daily_rate: member.baseDailyRate,
        overtime_daily_rate: member.overtimeDailyRate,
        ot_rate_1: member.otRate1,
        ot_rate_2: member.otRate2,
        ot_rate_3: member.otRate3,
        bank_name: member.bankName || null,
        bank_account: member.bankAccountNumber || null,
        current_project_code: member.projectCode || null
    };

    if (isUUID(member.id)) {
        // Update
        const { data, error } = await supabase
            .from('crew_members')
            .update(dbPayload)
            .eq('id', member.id)
            .select()
            .single();

        if (error) {
            console.error('Error updating crew member:', error);
            throw error;
        }

        return {
            ...member,
            id: data.id,
            name: capitalizedName,
            initials: data.initials
        };
    } else {
        // Insert (let Supabase auto-generate ID)
        const { data, error } = await supabase
            .from('crew_members')
            .insert([dbPayload])
            .select()
            .single();

        if (error) {
            console.error('Error inserting crew member:', error);
            throw error;
        }

        return {
            ...member,
            id: data.id,
            name: capitalizedName,
            initials: data.initials
        };
    }
}

export async function deleteCrewMember(memberId: string): Promise<void> {
    const { error } = await supabase
        .from('crew_members')
        .delete()
        .eq('id', memberId);

    if (error) {
        console.error('Error deleting crew member:', error);
        throw error;
    }
}

// ---------------------------------------------------------
// ASSIGNMENTS API
// ---------------------------------------------------------

export async function fetchAssignments(workspaceId: string): Promise<Assignment[]> {
    // Get all crew members for this workspace to filter project history
    const { data: memberIdsData } = await supabase
        .from('crew_members')
        .select('id')
        .eq('workspace_id', workspaceId);
    
    const memberIds = (memberIdsData || []).map(m => m.id);
    if (memberIds.length === 0) return [];

    const { data, error } = await supabase
        .from('crew_project_history')
        .select(`
            id,
            crew_member_id,
            project_code,
            project_name,
            start_date,
            end_date,
            status,
            crew_members!crew_member_id (
                name,
                role
            )
        `)
        .in('crew_member_id', memberIds)
        .order('start_date', { ascending: false });

    if (error) {
        console.error('Error fetching assignments:', error);
        throw error;
    }

    return (data || []).map((a: any) => {
        const statusMap: Record<string, 'ACTIVE' | 'COMPLETED' | 'INACTIVE'> = {
            ongoing: 'ACTIVE',
            completed: 'COMPLETED',
            terminated: 'INACTIVE'
        };

        let mappedStatus = statusMap[a.status] || 'INACTIVE';

        // Override: if end_date has not passed yet (end_date >= today), mark as ACTIVE
        if (mappedStatus === 'COMPLETED' && a.end_date) {
            const todayStr = new Date().toISOString().split('T')[0];
            if (a.end_date >= todayStr) {
                mappedStatus = 'ACTIVE';
            }
        }

        return {
            id: a.id,
            crewId: a.crew_member_id,
            crewName: capitalizeEachWord(a.crew_members?.name || 'Unknown'),
            crewRole: (a.crew_members?.role || 'HELPER') as CrewRole,
            projectCode: a.project_code,
            startDate: a.start_date,
            endDate: a.end_date || undefined,
            status: mappedStatus
        };
    });
}

export async function saveAssignment(assignment: Assignment, workspaceId: string): Promise<Assignment> {
    const dbStatus = assignment.status === 'ACTIVE' ? 'ongoing' : (assignment.status === 'COMPLETED' ? 'completed' : 'terminated');
    
    const dbPayload = {
        crew_member_id: assignment.crewId,
        project_code: assignment.projectCode,
        start_date: assignment.startDate,
        end_date: assignment.endDate || null,
        status: dbStatus
    };

    let savedId = assignment.id;

    if (isUUID(assignment.id)) {
        const { error } = await supabase
            .from('crew_project_history')
            .update(dbPayload)
            .eq('id', assignment.id);

        if (error) {
            console.error('Error updating assignment:', error);
            throw error;
        }
    } else {
        const { data, error } = await supabase
            .from('crew_project_history')
            .insert([dbPayload])
            .select()
            .single();

        if (error) {
            console.error('Error inserting assignment:', error);
            throw error;
        }
        savedId = data.id;
    }

    // Sync crew member current project code
    // If active assignment, set current_project_code, else clear it
    const { error: syncError } = await supabase
        .from('crew_members')
        .update({
            current_project_code: assignment.status === 'ACTIVE' ? assignment.projectCode : null
        })
        .eq('id', assignment.crewId);

    if (syncError) {
        console.error('Error syncing crew member current project code:', syncError);
    }

    return {
        ...assignment,
        id: savedId
    };
}

export async function deleteAssignment(assignmentId: string): Promise<void> {
    // Get the assignment details to find the crew member ID before deletion
    const { data: assignData } = await supabase
        .from('crew_project_history')
        .select('crew_member_id')
        .eq('id', assignmentId)
        .single();

    const { error } = await supabase
        .from('crew_project_history')
        .delete()
        .eq('id', assignmentId);

    if (error) {
        console.error('Error deleting assignment:', error);
        throw error;
    }

    // Clear current project code on the crew member if they are assigned to it
    if (assignData?.crew_member_id) {
        await supabase
            .from('crew_members')
            .update({ current_project_code: null })
            .eq('id', assignData.crew_member_id);
    }
}

// ---------------------------------------------------------
// DAILY LOGS API
// ---------------------------------------------------------

export async function fetchDailyLogs(workspaceId: string): Promise<DailyLog[]> {
    // 1. Get exact total count first
    const { count, error: countError } = await supabase
        .from('crew_daily_logs')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId);

    if (countError) {
        console.warn('Daily logs not available or error occurred:', countError?.message);
        return [];
    }

    const totalCount = count || 0;
    if (totalCount === 0) return [];

    const pageSize = 1000;
    const numPages = Math.ceil(totalCount / pageSize);
    const promises = [];

    // 2. Fetch all pages in parallel
    for (let i = 0; i < numPages; i++) {
        const from = i * pageSize;
        const to = from + pageSize - 1;
        promises.push(
            supabase
                .from('crew_daily_logs')
                .select('*')
                .eq('workspace_id', workspaceId)
                .range(from, to)
        );
    }

    const results = await Promise.all(promises);
    let allData: any[] = [];

    for (const res of results) {
        if (res.error) {
            console.warn('Daily logs page error:', res.error?.message);
            continue;
        }
        allData = allData.concat(res.data || []);
    }

    return allData.map((l: any) => ({
        id: l.id,
        crewId: l.crew_id,
        projectCode: l.project_code,
        date: l.date,
        status: l.status,
        regularHours: Number(l.regular_hours) || 0,
        ot1Hours: Number(l.ot1_hours) || 0,
        ot2Hours: Number(l.ot2_hours) || 0,
        ot3Hours: Number(l.ot3_hours) || 0
    }));
}

export async function saveDailyLogs(logs: DailyLog[], workspaceId: string): Promise<void> {
    if (logs.length === 0) return;

    const dbLogs = logs.map(l => ({
        workspace_id: workspaceId,
        crew_id: l.crewId,
        project_code: l.projectCode,
        date: l.date,
        status: l.status,
        regular_hours: l.regularHours,
        ot1_hours: l.ot1Hours,
        ot2_hours: l.ot2Hours,
        ot3_hours: l.ot3Hours
    }));

    const { error } = await supabase
        .from('crew_daily_logs')
        .upsert(dbLogs, { onConflict: 'crew_id,date,project_code' });

    if (error) {
        console.error('Error upserting daily logs:', error);
        throw error;
    }
}

// ---------------------------------------------------------
// CREW REQUESTS API
// ---------------------------------------------------------

export async function fetchCrewRequests(workspaceId: string): Promise<CrewRequest[]> {
    const { data: requestRows, error } = await supabase
        .from('crew_requests')
        .select(`
            id,
            crew_id,
            type,
            amount,
            start_date,
            end_date,
            reason,
            proof_url,
            status,
            created_at,
            created_by
        `)
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

    if (error) {
        console.warn('Crew requests not available or error occurred:', error?.message);
        return [];
    }

    if (!requestRows || requestRows.length === 0) {
        return [];
    }

    // Fetch associated crew members safely without requiring PostgREST schema cache FK
    const crewIds = Array.from(new Set(requestRows.map((r: any) => r.crew_id).filter(Boolean)));
    let memberMap: Record<string, any> = {};
    if (crewIds.length > 0) {
        const { data: members } = await supabase
            .from('crew_members')
            .select('id, name, role, current_project_code')
            .in('id', crewIds);
        
        if (members) {
            members.forEach((m: any) => {
                memberMap[m.id] = m;
            });
        }
    }

    return requestRows.map((r: any) => {
        const member = memberMap[r.crew_id];

        // Parse movedToPeriod or rejectReason if stored in reason with a special format
        let movedToPeriod: string | undefined;
        let rejectReason: string | undefined;
        let cleanReason = r.reason || '';

        if (cleanReason.includes('[MOVED_TO_PERIOD:')) {
            const match = cleanReason.match(/\[MOVED_TO_PERIOD:\s*([^\]]+)\]/);
            if (match) {
                movedToPeriod = match[1];
                cleanReason = cleanReason.replace(/\[MOVED_TO_PERIOD:\s*[^\]]+\]/, '').trim();
            }
        }
        if (cleanReason.includes('[REJECT_REASON:')) {
            const match = cleanReason.match(/\[REJECT_REASON:\s*([^\]]+)\]/);
            if (match) {
                rejectReason = match[1];
                cleanReason = cleanReason.replace(/\[REJECT_REASON:\s*[^\]]+\]/, '').trim();
            }
        }

        return {
            id: r.id,
            crewId: r.crew_id,
            crewName: capitalizeEachWord(member?.name || 'Unknown'),
            crewRole: (member?.role || 'HELPER') as CrewRole,
            projectCode: member?.current_project_code || undefined,
            type: r.type as RequestType,
            amount: r.amount ? Number(r.amount) : undefined,
            startDate: r.start_date,
            endDate: r.end_date || undefined,
            reason: cleanReason,
            status: r.status as RequestStatus,
            createdAt: r.created_at,
            proofUrl: r.proof_url || undefined,
            movedToPeriod,
            rejectReason
        };
    });
}

export async function saveCrewRequest(request: CrewRequest, workspaceId: string): Promise<CrewRequest> {
    // Append movedToPeriod and rejectReason metadata to reason column if they exist
    let reasonWithMeta = request.reason;
    if (request.movedToPeriod) {
        reasonWithMeta = `[MOVED_TO_PERIOD: ${request.movedToPeriod}] ${reasonWithMeta}`;
    }
    if (request.rejectReason) {
        reasonWithMeta = `[REJECT_REASON: ${request.rejectReason}] ${reasonWithMeta}`;
    }

    const dbPayload = {
        workspace_id: workspaceId,
        crew_id: request.crewId,
        type: request.type,
        amount: request.amount || null,
        start_date: request.startDate,
        end_date: request.endDate || null,
        reason: reasonWithMeta,
        proof_url: request.proofUrl || null,
        status: request.status
    };

    let savedId = request.id;
    let createdAt = request.createdAt || new Date().toISOString();

    if (isUUID(request.id)) {
        const { error } = await supabase
            .from('crew_requests')
            .update(dbPayload)
            .eq('id', request.id);

        if (error) {
            console.error('Error updating crew request:', error);
            throw error;
        }
    } else {
        const { data, error } = await supabase
            .from('crew_requests')
            .insert([dbPayload])
            .select()
            .single();

        if (error) {
            console.error('Error inserting crew request:', error);
            throw error;
        }
        savedId = data.id;
        createdAt = data.created_at;
    }

    return {
        ...request,
        id: savedId,
        createdAt
    };
}

export async function deleteCrewRequest(requestId: string): Promise<void> {
    const { error } = await supabase
        .from('crew_requests')
        .delete()
        .eq('id', requestId);

    if (error) {
        console.error('Error deleting crew request:', error);
        throw error;
    }
}
