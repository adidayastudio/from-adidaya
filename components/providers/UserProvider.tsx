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

// -- RECOVERY ROLES --
export type UserRole = "superadmin" | "admin" | "administrator" | "supervisor" | "manager" | "hr" | "pm" | "management" | "ceo" | "owner" | "staff";
const MANAGEMENT_ROLES: UserRole[] = ["superadmin", "admin", "administrator", "supervisor", "manager", "hr", "pm", "management", "ceo", "owner"];

export interface UserProfile {
    id: string;
    full_name?: string;
    nickname?: string;
    username?: string;
    email: string;
    role: UserRole;
    avatarUrl?: string;
    department?: string;
    joinDate?: string;
    leave_policy_id?: string;
    work_schedule_id?: string;
    // Survival fields for People module
    permissions?: {
        can_view_directory?: boolean;
        can_manage_people?: boolean;
    };
}

type AuthStatus = "unknown" | "authenticated" | "unauthenticated";
type ProfileStatus = "idle" | "loading" | "ready" | "error";

interface UserContextType {
    authStatus: AuthStatus;
    isAuthenticated: boolean;
    user: User | null;
    profileStatus: ProfileStatus;
    profile: UserProfile | null;
    error: string | null;
    refreshProfile: (opts?: { background?: boolean }) => Promise<void>;
    refreshAuth: () => Promise<void>;
    signOutLocal: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

/* --------------------------------- Config -------------------------------- */

// BUMP CACHE TO V100 FOR TOTAL RECOVERY
const PROFILE_CACHE_KEY = (uid?: string) => `adidaya:user_profile_cache:v116:${uid || 'anon'}`;
const PROFILE_SELECT = "id,full_name,nickname,username,avatar_url,department,join_date,leave_policy_id,work_schedule_id";

/* --------------------------------- Helpers -------------------------------- */

function safeGetCachedProfile(uid?: string): UserProfile | null {
    try {
        const key = PROFILE_CACHE_KEY(uid);
        const raw = localStorage.getItem(key);
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
        const key = PROFILE_CACHE_KEY(p.id);
        localStorage.setItem(key, JSON.stringify(p));
    } catch {
        // ignore
    }
}

function safeClearCachedProfile(uid?: string) {
    try {
        const key = PROFILE_CACHE_KEY(uid);
        localStorage.removeItem(key);
    } catch {
        // ignore
    }
}

/* -------------------------------- Provider -------------------------------- */

export function UserProvider({ children }: { children: ReactNode }) {
    const supabase = useMemo(() => createClient(), []);

    const [authStatus, setAuthStatus] = useState<AuthStatus>("unknown");
    const [user, setUser] = useState<User | null>(null);
    const [profileStatus, setProfileStatus] = useState<ProfileStatus>("idle");
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [error, setError] = useState<string | null>(null);

    const didInitRef = useRef(false);
    const profileFetchIdRef = useRef(0);
    const authRefreshInFlightRef = useRef<Promise<void> | null>(null);
    const profileRef = useRef<UserProfile | null>(null);

    useEffect(() => {
        profileRef.current = profile;
    }, [profile]);

    const signOutLocal = useCallback(() => {
        setAuthStatus("unauthenticated");
        setUser(null);
        setProfileStatus("idle");
        setProfile(null);
        setError(null);
        safeClearCachedProfile(user?.id);
    }, []);

    const refreshAuth = useCallback(async () => {
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
                setError(e instanceof Error ? e.message : "Unknown auth error");
                setAuthStatus((prev) => (prev === "unknown" ? "unauthenticated" : prev));
            } finally {
                authRefreshInFlightRef.current = null;
            }
        })();

        authRefreshInFlightRef.current = p;
        return p;
    }, [supabase]);

    const buildOptimisticProfile = useCallback((u: User): UserProfile => {
        const cached = safeGetCachedProfile(u.id);
        if (cached) return cached;

        const email = u.email || "";
        // Standardize Capitalization
        const capitalize = (str: string) => str ? str.trim().split(' ').map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()).join(' ') : "";
        const capitalizeWord = (str: string) => str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";

        const emailPrefix = email.split("@")[0];
        // FULL NAME fallback for optimistic ui
        const rawFullName = (u.user_metadata as any)?.full_name || (u.user_metadata as any)?.name || emailPrefix || "User";
        
        const name = capitalize(rawFullName);
        const nickname = capitalizeWord((u.user_metadata as any)?.nickname || name.split(' ')[0]);
        const metaRole = (u.user_metadata?.role as string)?.toLowerCase();
        const optimisticRole = (metaRole && MANAGEMENT_ROLES.includes(metaRole as UserRole) ? metaRole : "staff") as UserRole;

        return {
            id: u.id,
            full_name: name,
            nickname: nickname,
            username: (u.user_metadata as any)?.user_name || (u.user_metadata as any)?.username || emailPrefix,
            email,
            role: optimisticRole,
            avatarUrl: (u.user_metadata as any)?.avatar_url,
            permissions: {
                can_view_directory: MANAGEMENT_ROLES.includes(optimisticRole),
                can_manage_people: ["admin", "superadmin", "administrator", "hr", "management", "supervisor", "manager", "pm"].includes(optimisticRole)
            }
        };
    }, []);

    const refreshProfile = useCallback(
        async (opts?: { background?: boolean }) => {
            const background = opts?.background ?? false;
            if (authStatus !== "authenticated" || !user) return;

            const fetchId = ++profileFetchIdRef.current;
            setProfileStatus((prev) => (profileRef.current || background ? prev : "loading"));
            setError(null);

            try {
                // Fetch from both tables to be extra safe
                const [profileResult, roleResult] = await Promise.all([
                    supabase.from("profiles").select(PROFILE_SELECT).eq("id", user.id).maybeSingle(),
                    supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle()
                ]);

                if (fetchId !== profileFetchIdRef.current) return;

                const profileData = profileResult.data;
                const roleData = roleResult.data;

                // Determine role: check user_roles -> profiles -> metadata -> staff
                const rawRole = (roleData?.role || profileData?.role || (user.user_metadata?.role as string))?.toLowerCase();
                const effectiveRole: UserRole = (rawRole && MANAGEMENT_ROLES.includes(rawRole as UserRole) ? rawRole : "staff") as UserRole;

                // Determine name and nickname with proper capitalization
                const capitalize = (str: string) => str ? str.trim().split(' ').map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()).join(' ') : "";
                const capitalizeWord = (str: string) => str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "";

                // Web/iPad: Full Name strictly from 'full_name' column
                const rawFullName = profileData?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "User";
                const freshFullName = capitalize(rawFullName);
                
                // Mobile: Nickname fallback to Username
                const rawNickname = profileData?.nickname || profileData?.username || user.user_metadata?.nickname || freshFullName.split(' ')[0] || "User";
                const freshNickname = capitalizeWord(rawNickname);

                const fresh: UserProfile = {
                    id: user.id,
                    full_name: freshFullName,
                    nickname: freshNickname,
                    username: profileData?.username,
                    email: user.email || "",
                    role: effectiveRole,
                    avatarUrl: profileData?.avatar_url || user.user_metadata?.avatar_url,
                    department: (profileData as any)?.department,
                    joinDate: (profileData as any)?.join_date,
                    leave_policy_id: (profileData as any)?.leave_policy_id,
                    work_schedule_id: (profileData as any)?.work_schedule_id,
                    permissions: {
                        can_view_directory: MANAGEMENT_ROLES.includes(effectiveRole),
                        can_manage_people: ["admin", "superadmin", "administrator", "hr", "management", "supervisor", "manager", "pm"].includes(effectiveRole)
                    }
                };

                setProfile(fresh);
                safeSetCachedProfile(fresh);
                setProfileStatus("ready");
            } catch (e: unknown) {
                if (fetchId !== profileFetchIdRef.current) return;
                setError(e instanceof Error ? e.message : "Unknown profile error");
                setProfileStatus("error");
                setProfile((prev) => prev ?? buildOptimisticProfile(user));
            }
        },
        [authStatus, user, supabase, buildOptimisticProfile]
    );

    useEffect(() => {
        if (didInitRef.current) return;
        didInitRef.current = true;

        const cached = safeGetCachedProfile();
        if (cached) {
            setProfile(cached);
            setProfileStatus("ready");
        }

        void refreshAuth();

        const { data } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
            const nextUser = session?.user ?? null;
            if (nextUser) {
                setUser(nextUser);
                setAuthStatus("authenticated");
                setProfile((prev) => prev ?? buildOptimisticProfile(nextUser));
                void refreshProfile({ background: true });
            } else {
                signOutLocal();
            }
        });

        return () => {
            data.subscription.unsubscribe();
        };
    }, [supabase, refreshAuth, refreshProfile, signOutLocal, buildOptimisticProfile]);

    useEffect(() => {
        if (authStatus === "authenticated" && user) {
            setProfile((prev) => prev ?? buildOptimisticProfile(user));
            void refreshProfile({ background: true });
        }
    }, [authStatus, user, refreshProfile, buildOptimisticProfile]);

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

export function useUserContext() {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error("useUserContext must be used within a UserProvider");
    }
    return context;
}
