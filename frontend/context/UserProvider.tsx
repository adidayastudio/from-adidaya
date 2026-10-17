import AsyncStorage from "@react-native-async-storage/async-storage";
import type { User } from "@supabase/supabase-js";
import React, {
    createContext,
    ReactNode,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState
} from "react";
import { AttendanceSession, fetchTodaySessions } from "../lib/api/attendance";
import { supabase } from "../lib/supabase";

import { computeEmployeeIdentifiersHelper, formatScheduleDetail } from "../components/people/member-profile/types";

export type UserRole = "superadmin" | "admin" | "administrator" | "supervisor" | "manager" | "hr" | "pm" | "management" | "ceo" | "owner" | "finance" | "member" | "staff" | "viewer" | "system";
export const MANAGEMENT_ROLES: UserRole[] = ["superadmin", "admin", "administrator", "supervisor", "manager", "hr", "pm", "management", "ceo", "owner", "finance"];

export interface UserProfile {
    id: string;
    full_name?: string;
    nickname?: string;
    username?: string;
    email: string;
    role: UserRole;
    avatarUrl?: string;
    department?: string;
    department_id?: string;
    joinDate?: string;
    join_date?: string;
    leave_policy_id?: string;
    work_schedule_id?: string;
    position?: string;
    job_title?: string;
    level?: string;
    level_id?: string;
    employment_type_id?: string;
    work_status_id?: string;
    contract_type?: string;
    employment_type?: string;
    work_status?: string;
    order_number?: string;
    end_date?: string;
    contract_end_date?: string;
    employee_id?: string;
    schedule_name?: string;
    schedule_detail?: string;
    id_code?: string;
    id_number?: string;
    birthday?: string;
    nik?: string;
    phone?: string;
    account_type?: string;
    include_in_performance?: boolean;
    address?: any;
    emergency_contact?: any;
    social_links?: any;
    bank_info?: any;
}

type AuthStatus = "unknown" | "authenticated" | "unauthenticated";
type ProfileStatus = "idle" | "loading" | "ready" | "error";

interface UserContextType {
    authStatus: AuthStatus;
    isAuthenticated: boolean;
    user: User | null;
    profileStatus: ProfileStatus;
    profile: UserProfile | null;
    attendanceStatus: "checked-in" | "checked-out" | "loading";
    todaySessions: AttendanceSession[];
    error: string | null;
    refreshProfile: () => Promise<void>;
    refreshUser: () => Promise<void>;
    refreshAttendance: () => Promise<void>;
    signIn: (email: string, password: string) => Promise<{ error?: string }>;
    signOut: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const PROFILE_CACHE_KEY = "adidaya-preview:user_profile";
const SESSIONS_CACHE_KEY = "adidaya-preview:today_sessions";

export function UserProvider({ children }: { children: ReactNode }) {
    const [authStatus, setAuthStatus] = useState<AuthStatus>("unknown");
    const [user, setUser] = useState<User | null>(null);
    const [profileStatus, setProfileStatus] = useState<ProfileStatus>("idle");
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [attendanceStatus, setAttendanceStatus] = useState<"checked-in" | "checked-out" | "loading">("loading");
    const [todaySessions, setTodaySessions] = useState<AttendanceSession[]>([]);
    const [error, setError] = useState<string | null>(null);

    const refreshAttendance = useCallback(async () => {
        if (!user) return;
        try {
            const sessions = await fetchTodaySessions(user.id);
            setTodaySessions(sessions);
            const lastSession = sessions[sessions.length - 1];
            setAttendanceStatus(lastSession && !lastSession.clockOut ? "checked-in" : "checked-out");
            await AsyncStorage.setItem(SESSIONS_CACHE_KEY, JSON.stringify(sessions));
        } catch (e) {
            console.error("Failed to refresh attendance:", e);
        }
    }, [user]);

    // setMockUser has been removed to enforce real authentication

    const refreshProfile = useCallback(async () => {
        if (!user) return;
        if (user.id === '00000000-0000-0000-0000-000000000000') {
            return;
        }
        setProfileStatus("loading");
        try {
            const { data: profileData, error: profileError } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", user.id)
                .maybeSingle();

            // 2. Check user_roles table
            const { data: roleData } = await supabase
                .from("user_roles")
                .select("role")
                .eq("user_id", user.id)
                .maybeSingle();

            if (profileError) throw profileError;

            // Fetch setup tables in parallel to resolve relational IDs
            const [
                { data: dData },
                { data: pData },
                { data: lData },
                { data: ctData },
                { data: wsData },
                { data: schedData },
            ] = await Promise.all([
                supabase.from('organization_departments').select('*'),
                supabase.from('organization_positions').select('*'),
                supabase.from('organization_levels').select('*'),
                supabase.from('employment_types').select('*'),
                supabase.from('work_status').select('*'),
                supabase.from('work_schedules').select('*'),
            ]);

            // Resolve Level name
            let resolvedLevel = '';
            if (profileData?.level_id && lData) {
                const matchedLvl = lData.find((l: any) => l.id === profileData.level_id);
                if (matchedLvl) resolvedLevel = matchedLvl.name;
            }

            // Resolve Department name
            let resolvedDept = profileData?.department || '';
            if (profileData?.department_id && dData) {
                const matchedDept = dData.find((d: any) => d.id === profileData.department_id);
                if (matchedDept) resolvedDept = matchedDept.name;
            }

            // Resolve Position name
            let resolvedPos = profileData?.job_title || profileData?.position || '';
            if (profileData?.position_id && pData) {
                const matchedPos = pData.find((p: any) => p.id === profileData.position_id);
                if (matchedPos) resolvedPos = matchedPos.name;
            }

            // Resolve Contract type name
            let resolvedContract = '';
            if (profileData?.employment_type_id && ctData) {
                const matchedContract = ctData.find((c: any) => c.id === profileData.employment_type_id);
                if (matchedContract) resolvedContract = matchedContract.name;
            }

            // Resolve Work status name
            let resolvedWorkStatus = '';
            if (profileData?.work_status_id && wsData) {
                const matchedWs = wsData.find((w: any) => w.id === profileData.work_status_id);
                if (matchedWs) resolvedWorkStatus = matchedWs.name;
            }

            // Resolve Schedule name & detail
            let resolvedSchedName = '';
            let resolvedSchedDetail = '';
            if ((profileData?.work_schedule_id || profileData?.schedule_id) && schedData) {
                const matchedSched = schedData.find((s: any) => s.id === (profileData.work_schedule_id || profileData.schedule_id));
                if (matchedSched) {
                    resolvedSchedName = matchedSched.name;
                    resolvedSchedDetail = formatScheduleDetail(matchedSched);
                }
            }

            // Compute fallback identifiers if needed
            const computedIds = computeEmployeeIdentifiersHelper(
                resolvedDept,
                resolvedPos,
                resolvedLevel,
                profileData?.order_number,
                profileData?.join_date,
                'JCP',
                dData || [],
                pData || [],
                lData || []
            );

            const resolvedEmployeeId = profileData?.employee_id || (profileData?.id_number && profileData.id_number.length <= 10 ? profileData.id_number : computedIds.employee_id);
            const resolvedIdCode = profileData?.display_id || profileData?.id_code || computedIds.id_code;
            const resolvedNik = profileData?.nik || (profileData?.id_number && profileData.id_number.length > 10 ? profileData.id_number : profileData?.id_number || undefined);

            const effectiveContractType = resolvedContract || profileData?.contract_type || profileData?.employment_type || undefined;
            const effectiveWorkStatus = resolvedWorkStatus || profileData?.work_status || undefined;
            const effectiveEndDate = profileData?.contract_end_date || profileData?.end_date || (effectiveContractType ? 'Present' : undefined);

            // 3. Normalize role cleanly
            const rawRole = roleData?.role || (profileData as any)?.role || 'staff';
            const normalizeRole = (raw?: string | null): UserRole => {
                const role = raw?.trim().toLowerCase().replace(/[\s_-]+/g, '');
                const roles = ['superadmin', 'admin', 'administrator', 'supervisor', 'manager', 'hr', 'pm', 'management', 'ceo', 'owner', 'finance', 'viewer', 'system', 'member'];
                return role && roles.includes(role) ? role as UserRole : 'staff';
            };

            const effectiveRole = normalizeRole(rawRole);

            const fresh: UserProfile = {
                id: user.id,
                full_name: profileData?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0],
                nickname: profileData?.nickname || profileData?.username || user.user_metadata?.nickname,
                username: profileData?.username,
                email: user.email || "",
                role: effectiveRole,
                avatarUrl: profileData?.avatar_url || user.user_metadata?.avatar_url,
                department: resolvedDept || undefined,
                department_id: profileData?.department_id || undefined,
                position: resolvedPos || undefined,
                job_title: resolvedPos || undefined,
                level: resolvedLevel || undefined,
                level_id: profileData?.level_id || undefined,
                employment_type_id: profileData?.employment_type_id || undefined,
                work_status_id: profileData?.work_status_id || undefined,
                contract_type: effectiveContractType,
                employment_type: effectiveContractType,
                work_status: effectiveWorkStatus,
                order_number: profileData?.order_number || computedIds.order_number || undefined,
                end_date: effectiveEndDate,
                contract_end_date: effectiveEndDate,
                employee_id: resolvedEmployeeId,
                schedule_name: resolvedSchedName || undefined,
                schedule_detail: resolvedSchedDetail || undefined,
                joinDate: profileData?.join_date,
                join_date: profileData?.join_date,
                leave_policy_id: profileData?.leave_policy_id,
                work_schedule_id: profileData?.work_schedule_id,
                id_code: resolvedIdCode,
                id_number: resolvedNik || profileData?.id_number,
                birthday: profileData?.birth_date || profileData?.birthday,
                nik: resolvedNik,
                phone: profileData?.phone,
                account_type: profileData?.account_type || 'human',
                include_in_performance: profileData?.include_in_performance !== false,
                address: profileData?.address,
                emergency_contact: profileData?.emergency_contact,
                social_links: profileData?.social_links,
                bank_info: profileData?.bank_info
            };

            setProfile(fresh);
            await AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(fresh));
            setProfileStatus("ready");
        } catch (e: any) {
            setError(e.message);
            setProfileStatus("error");
        }
    }, [user]);

    const signOut = useCallback(async () => {
        // Trigger remote sign out in the background so it doesn't block the UI
        supabase.auth.signOut().catch(e => {
            console.error("Failed to sign out remotely:", e);
        });

        // Instantly clean up local state synchronously for an instant UI transition
        setAuthStatus("unauthenticated");
        setUser(null);
        setProfile(null);
        setTodaySessions([]);
        setAttendanceStatus("checked-out");

        AsyncStorage.removeItem(PROFILE_CACHE_KEY).catch(e => {
            console.error("Failed to clear AsyncStorage cache:", e);
        });
    }, []);

    const signIn = useCallback(async (email: string, password: string): Promise<{ error?: string }> => {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) return { error: error.message };
            if (data.session) {
                setUser(data.session.user);
                setAuthStatus("authenticated");
            }
            return {};
        } catch (e: any) {
            return { error: e.message || 'Sign in failed' };
        }
    }, []);

    const DEV_BYPASS_LOGIN = false; // SET TO FALSE FOR PRODUCTION / APK BUILD

    useEffect(() => {
        if (DEV_BYPASS_LOGIN) {
            if (!user) {
                const mockUser = { id: '00000000-0000-0000-0000-000000000000', email: 'dev@adidaya.com' } as User;
                setUser(mockUser);
                setAuthStatus("authenticated");
                setProfile({
                    id: mockUser.id,
                    full_name: 'Adidaya Dev',
                    nickname: 'Dev',
                    username: 'dev',
                    email: 'dev@adidaya.com',
                    role: 'superadmin',
                });
                setProfileStatus("ready");
            }
            return;
        }

        // Init Auth across both Adidaya and Forma instances
        let authResolved = false;
        const authTimeout = setTimeout(() => {
            if (!authResolved) {
                console.warn("Auth initialization timed out, defaulting to unauthenticated");
                setAuthStatus("unauthenticated");
                setProfile(null);
            }
        }, 2000);

        const initAuth = async () => {
            try {
                // Check primary client session
                const { data: primaryData } = await supabase.auth.getSession();
                if (primaryData?.session) {
                    authResolved = true;
                    clearTimeout(authTimeout);
                    setUser(primaryData.session.user);
                    setAuthStatus("authenticated");
                    return;
                }

                // No active session in either database
                authResolved = true;
                clearTimeout(authTimeout);
                setAuthStatus("unauthenticated");
                setProfile(null);
            } catch (err) {
                authResolved = true;
                clearTimeout(authTimeout);
                setAuthStatus("unauthenticated");
                setProfile(null);
            }
        };

        initAuth();

        const { data: listenerAdidaya } = supabase.auth.onAuthStateChange((_event, session) => {
            authResolved = true;
            clearTimeout(authTimeout);
            setUser(session?.user || null);
            setAuthStatus(session ? 'authenticated' : 'unauthenticated');
            if (!session) {
                setProfile(null);
                setTodaySessions([]);
                setAttendanceStatus('checked-out');
            }
        });

        // Load Cache
        AsyncStorage.getItem(PROFILE_CACHE_KEY).then(async data => {
            if (data) {
                const parsed = JSON.parse(data);
                if (parsed.id === 'mock-user-id') {
                    AsyncStorage.removeItem(PROFILE_CACHE_KEY);
                } else {
                    const { data: sessionData } = await supabase.auth.getSession();
                    if (sessionData.session?.user.id === parsed.id) setProfile({ ...parsed, role: 'member' });
                }
            }
        });

        AsyncStorage.getItem(SESSIONS_CACHE_KEY).then(async data => {
            if (data) {
                try {
                    const parsed = JSON.parse(data);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        const today = new Date().toLocaleDateString('en-CA');
                        const { data: sessionData } = await supabase.auth.getSession();
                        const userId = sessionData.session?.user.id;
                        const validTodaySessions = parsed.filter((s: any) => userId && s.userId === userId && s.date === today);
                        if (validTodaySessions.length > 0) {
                            setTodaySessions(validTodaySessions);
                            const lastSession = validTodaySessions[validTodaySessions.length - 1];
                            setAttendanceStatus(lastSession && !lastSession.clockOut ? "checked-in" : "checked-out");
                        }
                    }
                } catch (e) { }
            }
        });

        return () => {
            clearTimeout(authTimeout);
            listenerAdidaya.subscription.unsubscribe();
        };
    }, []);

    useEffect(() => {
        if (authStatus === "authenticated" && user) {
            refreshProfile();
            refreshAttendance();
        }
    }, [authStatus, user, refreshProfile, refreshAttendance]);

    const value = useMemo(() => ({
        authStatus,
        isAuthenticated: authStatus === "authenticated",
        user,
        profileStatus,
        profile,
        attendanceStatus,
        todaySessions,
        error,
        refreshProfile,
        refreshUser: refreshProfile,
        refreshAttendance,
        signIn,
        signOut
    }), [authStatus, user, profileStatus, profile, attendanceStatus, todaySessions, error, refreshProfile, refreshAttendance, signIn, signOut]);

    return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

const defaultUserContext: UserContextType = {
    authStatus: "unknown",
    isAuthenticated: false,
    user: null,
    profileStatus: "idle",
    profile: null,
    attendanceStatus: "loading",
    todaySessions: [],
    error: null,
    refreshProfile: async () => {},
    refreshUser: async () => {},
    refreshAttendance: async () => {},
    signIn: async () => ({}),
    signOut: async () => {},
};

export function useUserContext() {
    const context = useContext(UserContext);
    return context || defaultUserContext;
}
