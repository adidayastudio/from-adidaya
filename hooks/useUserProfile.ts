import { useUserContext } from "@/components/providers/UserProvider";
import type { UserProfile, UserRole } from "@/components/providers/UserProvider";

export type { UserProfile, UserRole };

export default function useUserProfile() {
    const { profile, profileStatus, authStatus, error, refreshProfile } = useUserContext();

    // Derived loading state for backward compatibility
    // We consider it "loading" only if we are authenticated but have NO profile yet (not even optimistic/cached)
    // or if auth status is completely unknown.
    // If we have a profile (even optimistic), we are NOT loading in the eyes of the consumer, 
    // unless they strictly check profileStatus.
    const loading = (authStatus === "unknown") || (authStatus === "authenticated" && !profile);

    return {
        profile,
        loading,
        error,
        refresh: () => refreshProfile({ background: false })
    };
}
