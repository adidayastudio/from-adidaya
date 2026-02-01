"use client";

import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    ReactNode,
} from "react";
import { createClient } from "@/utils/supabase/client";
import type { User } from "@supabase/supabase-js";
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

type AuthStatus = "unknown" | "authenticated" | "unauthenticated";
type ProfileStatus = "idle" | "loading" | "ready" | "error";

interface UserContextType {
    // Auth
    authStatus: AuthStatus;
    isAuthenticated: boolean;
    user: User | null;

    // Profile (DB)
    profileStatus: ProfileStatus;
    profile: UserProfile | null;

    // Errors
    error: string | null;

    // Actions
    refreshProfile: (opts?: { background?: boolean }) => Promise<void>;
    refreshAuth: () => Promise<void>;
    signOutLocal: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

/* --------------------------------- Config -------------------------------- */

const PROFILE_CACHE_KEY = "adidaya:user_profile_cache:v3";

/**
 * Keep this SELECT lean.
 * Avoid select('*') unless you really need everything.
 */
const PROFILE_SELECT = "id,full_name,email,avatar_url,department,join_date";

/* --------------------------------- Helpers -------------------------------- */

function safeGetCachedProfile(): UserProfile | null {
    try {
        const raw = localStorage.getItem(PROFILE_CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed?.id) return null;
        return parsed as UserProfile;
    } catch {
        return null;
    }
}

function safeSetCachedProfile(p: UserProfile) {
    try {
        localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(p));
    } catch {
        // ignore quota/private mode
    }
}

function safeClearCachedProfile() {
    try {
        localStorage.removeItem(PROFILE_CACHE_KEY);
    } catch {
        // ignore
    }
}

/* -------------------------------- Provider -------------------------------- */

export function UserProvider({ children }: { children: ReactNode }) {
    const supabase = useMemo(() => createClient(), []);

    // Auth state
    const [authStatus, setAuthStatus] = useState<AuthStatus>("unknown");
    const [user, setUser] = useState<User | null>(null);

    // Profile state
    const [profileStatus, setProfileStatus] = useState<ProfileStatus>("idle");
    const [profile, setProfile] = useState<UserProfile | null>(null);

    // Error
    const [error, setError] = useState<string | null>(null);

    // Refs to prevent overlap/races
    const didInitRef = useRef(false);
    const profileFetchIdRef = useRef(0);
    const authRefreshInFlightRef = useRef<Promise<void> | null>(null);

    /* ----------------------------- Local actions ----------------------------- */

    const signOutLocal = useCallback(() => {
        setAuthStatus("unauthenticated");
        setUser(null);

        setProfileStatus("idle");
        setProfile(null);

        setError(null);
        safeClearCachedProfile();
    }, []);

    /**
     * ✅ Refresh auth state.
     * In most cases, onAuthStateChange is enough, but this is useful on first mount
     * or when you suspect hydration mismatch.
     *
     * IMPORTANT: This must be lightweight. No DB fetch here.
     */
    const refreshAuth = useCallback(async () => {
        // prevent multiple concurrent refreshAuth calls
        if (authRefreshInFlightRef.current) return authRefreshInFlightRef.current;

        const p = (async () => {
            setError(null);
            try {
                const { data, error: sessionError } = await supabase.auth.getSession();
                if (sessionError) throw sessionError;

                const session = data?.session ?? null;
                const nextUser = session?.user ?? null;

                if (nextUser) {
                    setUser(nextUser);
                    setAuthStatus("authenticated");
                } else {
                    setUser(null);
                    setAuthStatus("unauthenticated");
                }
            } catch (e: unknown) {
                // If session fetch errors, don't freeze forever.
                setError(e instanceof Error ? e.message : "Unknown auth error");
                setAuthStatus((prev) => (prev === "unknown" ? "unauthenticated" : prev));
            } finally {
                authRefreshInFlightRef.current = null;
            }
        })();

        authRefreshInFlightRef.current = p;
        return p;
    }, [supabase]);

    /**
     * ✅ Build an optimistic profile from auth user metadata.
     * This is intentionally SIMPLE and fast.
     * It prevents dashboard looking empty while DB fetch is running.
     */
    const buildOptimisticProfile = useCallback((u: User): UserProfile => {
        const email = u.email || "";
        const name =
            (u.user_metadata as any)?.full_name ||
            (u.user_metadata as any)?.name ||
            email.split("@")[0] ||
            "User";

        const avatarUrl = (u.user_metadata as any)?.avatar_url as string | undefined;

        // We avoid complicated role inference here; keep it safe.
        // DB will overwrite it when ready.
        const optimisticRole = ("staff" as unknown) as UserRole;

        return {
            id: u.id,
            name,
            email,
            role: optimisticRole,
            avatarUrl,
            department: undefined,
            joinDate: undefined,
        };
    }, []);

    /**
     * ✅ Fetch profile from DB.
     * - Runs only when authStatus === authenticated
     * - Does NOT flip auth state on error
     * - Uses fetchId to ignore stale responses (prevents races)
     */
    const refreshProfile = useCallback(
        async (opts?: { background?: boolean }) => {
            const background = opts?.background ?? false;

            if (authStatus !== "authenticated" || !user) return;

            const fetchId = ++profileFetchIdRef.current;

            // Avoid global blocking spinners:
            // - If we already have profile, keep UI usable.
            // - If no profile yet, set status loading.
            setProfileStatus((prev) => {
                if (prev === "loading") return prev;
                if (background) return prev; // don't change status on background refresh
                return profile ? prev : "loading";
            });

            setError(null);

            try {
                // Fetch profile and role in parallel
                const [profileResult, roleResult] = await Promise.all([
                    supabase
                        .from("profiles")
                        .select(PROFILE_SELECT)
                        .eq("id", user.id)
                        .single(),
                    supabase
                        .from("user_roles")
                        .select("role")
                        .eq("user_id", user.id)
                        .single()
                ]);

                const { data: profileData, error: profileError } = profileResult;
                const { data: roleData, error: roleError } = roleResult;

                // Ignore stale fetch result
                if (fetchId !== profileFetchIdRef.current) return;

                if (profileError) {
                    // Common "no rows" code: PGRST116
                    // In that case, keep optimistic profile (do NOT break app)
                    if ((profileError as any).code !== "PGRST116") {
                        throw profileError;
                    }

                    const fallback = buildOptimisticProfile(user);
                    setProfile(fallback);
                    safeSetCachedProfile(fallback);
                    setProfileStatus("ready");
                    return;
                }

                // Determine effective role: user_roles > staff
                // Note: user_roles.role might be lowercase, ensure we cast it correctly
                let effectiveRole: UserRole = "staff";

                if (roleData?.role) {
                    effectiveRole = roleData.role.toLowerCase() as UserRole;
                }

                // Map DB → UserProfile
                const fresh: UserProfile = {
                    id: profileData.id,
                    name: profileData.full_name || profileData.name || user.email?.split("@")[0] || "User",
                    email: profileData.email,
                    role: effectiveRole,
                    avatarUrl: profileData.avatar_url || undefined,
                    department: profileData.department || undefined,
                    joinDate: profileData.join_date || undefined,
                };

                setProfile(fresh);
                safeSetCachedProfile(fresh);
                setProfileStatus("ready");
            } catch (e: unknown) {
                if (fetchId !== profileFetchIdRef.current) return;

                // Profile error should NOT kill auth state.
                setError(e instanceof Error ? e.message : "Unknown profile error");
                setProfileStatus("error");

                // Keep any existing profile to avoid blank UI
                setProfile((prev) => prev ?? buildOptimisticProfile(user));
            }
        },
        [authStatus, user, profile, supabase, buildOptimisticProfile]
    );

    /* ----------------------------- Initialization ----------------------------- */

    useEffect(() => {
        if (didInitRef.current) return;
        didInitRef.current = true;

        // 1) Hydrate cached profile ASAP to avoid blank dashboard
        const cached = safeGetCachedProfile();
        if (cached) {
            setProfile(cached);
            setProfileStatus("ready");
        }

        // 2) Determine auth state
        void refreshAuth();

        // 3) Subscribe to auth changes (this is the PRIMARY source of truth)
        const { data } = supabase.auth.onAuthStateChange((_event, session) => {
            const nextUser = session?.user ?? null;

            if (nextUser) {
                // ✅ Auth becomes instant here
                setUser(nextUser);
                setAuthStatus("authenticated");

                // ✅ Set optimistic profile immediately if we don't have one yet
                setProfile((prev) => prev ?? buildOptimisticProfile(nextUser));

                // ✅ Background verification of DB profile
                void refreshProfile({ background: true });
            } else {
                // signed out
                signOutLocal();
            }
        });

        return () => {
            data.subscription.unsubscribe();
        };
    }, [supabase, refreshAuth, refreshProfile, signOutLocal, buildOptimisticProfile]);

    /* ----------------------------- When auth is ready ----------------------------- */

    useEffect(() => {
        // When auth becomes authenticated (from refreshAuth), fetch profile in background.
        if (authStatus === "authenticated" && user) {
            // If we don't have profile yet, set optimistic first
            setProfile((prev) => prev ?? buildOptimisticProfile(user));
            void refreshProfile({ background: true });
        }
    }, [authStatus, user, refreshProfile, buildOptimisticProfile]);

    /* ------------------------------- Memoized value ------------------------------- */

    const value = useMemo<UserContextType>(() => {
        return {
            authStatus,
            isAuthenticated: authStatus === "authenticated",
            user,

            profileStatus,
            profile,

            error,

            refreshProfile,
            refreshAuth,
            signOutLocal,
        };
    }, [authStatus, user, profileStatus, profile, error, refreshProfile, refreshAuth, signOutLocal]);

    return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

/* --------------------------------- Hook --------------------------------- */

export function useUserContext() {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error("useUserContext must be used within a UserProvider");
    }
    return context;
}
