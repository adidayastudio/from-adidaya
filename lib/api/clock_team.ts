import { createClient } from "@/utils/supabase/client";

const supabase = createClient();

export interface TeamMemberProfile {
    id: string;
    username: string; // or full_name
    avatar_url: string | null;
    department: string | null;
    role: string | null;
}

export async function fetchTeamMembers(): Promise<TeamMemberProfile[]> {
    // Parallel fetch for speed
    const [profilesResult, rolesResult] = await Promise.all([
        supabase.from("profiles").select("id, username, full_name, avatar_url, department"),
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

    return (profiles || []).map((p: any) => ({
        id: p.id,
        username: p.full_name || p.username || "Unknown",
        avatar_url: p.avatar_url,
        department: p.department,
        role: roleMap.get(p.id) || "staff"
    }));
}
