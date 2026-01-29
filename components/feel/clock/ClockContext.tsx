"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import useUserProfile from "@/hooks/useUserProfile";
import { canViewTeamData } from "@/lib/auth-utils";

type ViewMode = "personal" | "team";

interface ClockContextType {
    viewMode: ViewMode;
    setViewMode: (mode: ViewMode) => void;
    canAccessTeam: boolean;
    isLoading: boolean;
    userRole: string | undefined;
    userId: string | undefined;
}

const ClockContext = createContext<ClockContextType | undefined>(undefined);

const STORAGE_KEY = "clock_view_mode";

export function ClockProvider({ children }: { children: ReactNode }) {
    const { profile, loading } = useUserProfile();
    const [viewMode, setViewModeState] = useState<ViewMode>("personal");
    const [isInitialized, setIsInitialized] = useState(false);

    const canAccessTeam = canViewTeamData(profile?.role);

    // Initialize view mode from URL, session storage or based on role
    useEffect(() => {
        if (!loading && !isInitialized) {
            const searchParams = new URLSearchParams(window.location.search);
            const urlView = searchParams.get("view") as ViewMode | null;
            const stored = sessionStorage.getItem(STORAGE_KEY) as ViewMode | null;

            if (canAccessTeam) {
                // Priority: 1. URL parameter, 2. Stored preference, 3. Default to personal for Clock (unlike Finance)
                const targetView = (urlView === "personal" || urlView === "team")
                    ? urlView
                    : (stored === "team" ? "team" : "personal");

                setViewModeState(targetView);
                if (urlView) {
                    sessionStorage.setItem(STORAGE_KEY, urlView);
                }
            } else {
                // For staff: always personal, clear any stored team preference
                setViewModeState("personal");
                sessionStorage.removeItem(STORAGE_KEY);
            }
            setIsInitialized(true);
        }
    }, [loading, canAccessTeam, isInitialized]);

    // Persist view mode changes
    const setViewMode = (mode: ViewMode) => {
        // Staff cannot switch to team view
        if (!canAccessTeam && mode === "team") {
            return;
        }
        setViewModeState(mode);
        sessionStorage.setItem(STORAGE_KEY, mode);
    };

    // Force personal view if user loses access (role change)
    useEffect(() => {
        if (!loading && !canAccessTeam && viewMode === "team") {
            setViewModeState("personal");
            sessionStorage.removeItem(STORAGE_KEY);
        }
    }, [canAccessTeam, viewMode, loading]);

    return (
        <ClockContext.Provider
            value={{
                viewMode,
                setViewMode,
                canAccessTeam,
                isLoading: loading,
                userRole: profile?.role,
                userId: profile?.id
            }}
        >
            {children}
        </ClockContext.Provider>
    );
}

export function useClockContext() {
    const context = useContext(ClockContext);
    if (context === undefined) {
        throw new Error("useClockContext must be used within a ClockProvider");
    }
    return context;
}
