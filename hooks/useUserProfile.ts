import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

export type UserRole = "superadmin" | "admin" | "administrator" | "supervisor" | "hr" | "pm" | "management" | "staff";

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

    const fetchProfile = async (isBackgroundVerification = false) => {
        try {
            // ONLY show loading spinner on the very first mount if no optimistic data
            if (!isBackgroundVerification && !profile) setLoading(true);

            // 1. FAST PATH: Check Local Session immediately
            // This reads from localStorage/cookies instantly
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError) throw sessionError;

            if (!session?.user) {
                if (!isBackgroundVerification) {
                    setProfile(null);
                    setLoading(false);
                }
                return;
            }

            const user = session.user;

            // --- OPTIMISTIC UPDATE: Set Profile IMMEDIATELY from Session ---
            // This is the key fix for "lemot" and "detecting login" perception.
            // We use whatever data we have in the token to render the UI instantly.
            if (!isBackgroundVerification) {
                const optimisticRoles: string[] = [];
                const meta = user.app_metadata || {};
                const userMeta = user.user_metadata || {};
                const candidates = [meta.role, meta.roles, userMeta.role, userMeta.roles];
                candidates.forEach(c => {
                    if (Array.isArray(c)) c.forEach((r: any) => optimisticRoles.push(String(r)));
                    else if (c) optimisticRoles.push(String(c));
                });

                // Normalize & Priority Check (Simplified for speed)
                const simpleNorm = Array.from(new Set(optimisticRoles.map(r => r.toLowerCase().trim().replace(/\s+/g, ''))));
                let simpleRole: UserRole = "staff";
                if (simpleNorm.some(r => r.includes("admin") || r.includes("super"))) simpleRole = "admin";
                else if (simpleNorm.some(r => r.includes("finance"))) simpleRole = "management"; // map finance to management/admin access group

                setProfile({
                    id: user.id,
                    name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
                    email: user.email || "",
                    role: simpleRole,
                    avatarUrl: user.user_metadata?.avatar_url,
                    department: "Loading...",
                    joinDate: new Date().toISOString()
                });

                // ONLY stop loading if we are sure it's an admin/finance user.
                // If we detected "staff", it might be a false negative (missing metadata),
                // so we keep loading=true to wait for the DB fetch to confirm.
                if (simpleRole !== "staff") {
                    setLoading(false);
                }
            }

            // 2. PARALLEL: Fetch Fresh DB Data (Background)
            const profilePromise = supabase
                .from("profiles")
                .select("*")
                .eq("id", user.id)
                .single();

            const rolesPromise = supabase
                .from("user_roles")
                .select("role")
                .eq("user_id", user.id);

            const [profileResult, rolesResult] = await Promise.all([profilePromise, rolesPromise]);


            const profileData = profileResult.data;
            const rolesData = rolesResult.data;

            // 3. Merge Roles Logic
            const fetchedRoles: string[] = [];

            // A. App/User Metadata
            const meta = user.app_metadata || {};
            const userMeta = user.user_metadata || {};
            const candidates = [meta.role, meta.roles, userMeta.role, userMeta.roles];
            candidates.forEach(c => {
                if (!c) return;
                if (Array.isArray(c)) c.forEach(r => fetchedRoles.push(String(r)));
                else fetchedRoles.push(String(c));
            });

            // B. Profile Role (Legacy)
            if ((profileData as any)?.role) fetchedRoles.push((profileData as any).role);

            // C. Roles Table (Source of Truth)
            if (rolesData) {
                rolesData.forEach((r: any) => fetchedRoles.push(r.role));
            }

            // Normalize
            const normalizedRoles = Array.from(new Set(
                fetchedRoles.map(r => r.toLowerCase().trim().replace(/\s+/g, ''))
            )) as UserRole[];

            console.log("🔍 [useUserProfile] Resolved Roles:", normalizedRoles);

            // Priority determination
            const rolePriority: UserRole[] = ["superadmin", "admin", "administrator", "hr", "management", "supervisor", "pm", "staff"];
            let finalRole: UserRole = "staff";

            for (const p of rolePriority) {
                if (normalizedRoles.includes(p)) {
                    finalRole = p;
                    break;
                }
            }

            // Override check: if staff but has admin in keywords
            if (finalRole === "staff" && normalizedRoles.some(r => r.includes("admin"))) {
                finalRole = "admin";
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
            console.error("❌ [useUserProfile] Error:", err);
            if (!isBackgroundVerification) setError(err.message);
        } finally {
            if (!isBackgroundVerification) setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string, session: any) => {
            if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
                // Background verify on token updates
                fetchProfile(true);
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
        refresh: () => fetchProfile(false)
    };
}
