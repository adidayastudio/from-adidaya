import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

export type UserRole = "superadmin" | "admin" | "administrator" | "supervisor" | "pm" | "management" | "staff";

export interface UserProfile {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    avatarUrl?: string;
    department?: string;
    joinDate?: string;
}

export default function useUserProfile() {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const supabase = createClient();

    const fetchProfile = async () => {
        try {
            setLoading(true);

            // Try getUser() first (re-validates with server)
            let { data: { user }, error: authError } = await supabase.auth.getUser();

            // Fallback to getSession() if getUser() fails (faster, uses local storage)
            if (!user) {
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                user = session?.user || null;
                if (!user && (authError || sessionError)) {
                    console.log("🔍 [useUserProfile] No user found in getUser or getSession");
                }
            }

            if (!user) {
                setProfile(null);
                setLoading(false);
                return;
            }

            console.log("🔍 [useUserProfile] Auth User detected:", user.id, user.email);

            // Fetch profile details
            const { data: profileData, error: profileError } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", user.id)
                .single();

            let fetchError = profileError?.message || "";

            // Fetch roles from multiple sources
            const fetchedRoles: string[] = [];

            // 1. Check user/app metadata (singular and plural)
            const metadataChoices = [
                (user as any).app_metadata?.role,
                (user as any).app_metadata?.roles,
                (user as any).user_metadata?.role,
                (user as any).user_metadata?.roles,
            ];

            metadataChoices.forEach(choice => {
                if (!choice) return;
                if (Array.isArray(choice)) {
                    choice.forEach(r => fetchedRoles.push(String(r)));
                } else {
                    fetchedRoles.push(String(choice));
                }
            });

            // 2. Fetch role from profile table as fallback
            const profileRole = (profileData as any)?.role;
            if (profileRole) fetchedRoles.push(profileRole);

            // 3. Fetch roles from user_roles table
            const { data: rolesData, error: userRolesError } = await supabase
                .from("user_roles")
                .select("role")
                .eq("user_id", user.id);

            if (userRolesError) fetchError += " | rolesErr: " + userRolesError.message;

            if (rolesData) {
                rolesData.forEach(r => fetchedRoles.push(r.role));
            }

            console.log("🔍 [useUserProfile] Raw roles found:", fetchedRoles);

            // Normalize and deduplicate
            const normalizedRoles = Array.from(new Set(
                fetchedRoles.map(r => r.toLowerCase().trim().replace(/\s+/g, ''))
            )) as UserRole[];

            const rolePriority: UserRole[] = ["superadmin", "admin", "administrator", "management", "supervisor", "pm", "staff"];
            let finalRole: UserRole = "staff";

            for (const p of rolePriority) {
                if (normalizedRoles.includes(p)) {
                    finalRole = p;
                    break;
                }
            }

            setProfile({
                id: user.id,
                name: profileData?.full_name || user.email?.split("@")[0] || "User",
                email: user.email || "",
                role: finalRole,
                avatarUrl: profileData?.avatar_url,
                department: profileData?.department,
                joinDate: profileData?.join_date
            });
        } catch (err: any) {
            console.error("❌ Error fetching user profile:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();

        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log("🔍 [useUserProfile] Auth event changed:", event);
            if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
                fetchProfile();
            } else if (event === "SIGNED_OUT") {
                setProfile(null);
                setLoading(false);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    return {
        profile,
        loading,
        error,
        refresh: fetchProfile
    };
}
