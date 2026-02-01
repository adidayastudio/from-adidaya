import { createClient } from "@/utils/supabase/client";

const supabase = createClient();

export interface TeamMemberProfile {
    id: string;
    username: string; // or full_name
    nickname?: string;
    avatar_url: string | null;
    department: string | null;
    role: string | null;
    status?: string; // e.g. "active", "excluded", "terminated"
    account_type?: string; // e.g. "human", "system", "bot"
    include_in_performance?: boolean; // false = excluded from performance calculations
}

export async function fetchTeamMembers(): Promise<TeamMemberProfile[]> {
    // Parallel fetch for speed
    const [profilesResult, rolesResult] = await Promise.all([
        supabase.from("profiles").select("id, username, full_name, nickname, avatar_url, department, status, account_type, include_in_performance"),
        supabase.from("user_roles").select("user_id, role")
    ]);

    const { data: profiles, error: profileError } = profilesResult;
    const { data: roles, error: roleError } = rolesResult;

    if (profileError) {
        console.error("Error fetching profiles:", profileError);
        return [];
    }

    if (roleError) {
        console.error("Error fetching roles:", roleError);
    }

    // Merge
    const roleMap = new Map<string, string>();
    if (roles) {
        roles.forEach((r: any) => roleMap.set(r.user_id, r.role));
    }

    return (profiles || []).map((p: any) => {
        const fullName = p.full_name || p.username || "Unknown";
        const fallbackNickname = fullName.split(' ')[0]; // First word

        return {
            id: p.id,
            username: fullName,
            nickname: p.nickname || fallbackNickname,
            avatar_url: p.avatar_url,
            department: p.department,
            status: p.status || "active",
            account_type: p.account_type || "human",
            role: roleMap.get(p.id) || "staff",
            include_in_performance: p.include_in_performance !== false // default true if null/undefined
        };
    });
}
