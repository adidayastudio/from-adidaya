"use client";

import { createContext, useContext, useState, useEffect, useMemo, useRef, ReactNode } from "react";
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
    const [viewMode, setViewModeState] = useState<ViewMode>(() => {
        if (typeof window !== "undefined") {
            const stored = sessionStorage.getItem(STORAGE_KEY);
            // Also check URL for immediate override
            const params = new URLSearchParams(window.location.search);
            const urlView = params.get("view");
            if (urlView === "personal" || urlView === "team") return urlView as ViewMode;
            if (stored === "team") return "team";
        }
        return "personal";
    });
    const [isInitialized, setIsInitialized] = useState(false);

    const canAccessTeam = canViewTeamData(profile?.role);

    // Mark as initialized once loading is done
    useEffect(() => {
        if (!loading && !isInitialized) {
            setIsInitialized(true);
        }
    }, [loading, isInitialized]);

    // Persist view mode changes
    const setViewMode = (mode: ViewMode) => {
        // We set the state regardless of profile loading status here
        // as the UI toggle already handles the visibility check.
        // This avoids blocking the toggle if the context's profile fetch is delayed.
        setViewModeState(mode);
        sessionStorage.setItem(STORAGE_KEY, mode);
    };

    // Use a ref for the setter to keep the event listener stable
    const setViewModeRef = useRef(setViewMode);
    useEffect(() => {
        setViewModeRef.current = setViewMode;
    }, [setViewMode]);

    // Listen for custom events from the header or other detached components
    useEffect(() => {
        const handleSetViewMode = (e: any) => {
            if (setViewModeRef.current) {
                setViewModeRef.current(e.detail);
            }
        };
        window.addEventListener('clock:set-view-mode', handleSetViewMode as EventListener);
        return () => {
            window.removeEventListener('clock:set-view-mode', handleSetViewMode as EventListener);
        };
    }, []);

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
