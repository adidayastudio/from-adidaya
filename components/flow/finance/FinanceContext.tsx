"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import useUserProfile from "@/hooks/useUserProfile";
import { canAccessFinanceTeam } from "@/lib/auth-utils";

type ViewMode = "personal" | "team";

interface FinanceContextType {
    viewMode: ViewMode;
    setViewMode: (mode: ViewMode) => void;
    canAccessTeam: boolean;
    isLoading: boolean;
    userRole: string | undefined;
    userId: string | undefined;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

const STORAGE_KEY = "finance_view_mode";

export function FinanceProvider({ children }: { children: ReactNode }) {
    const { profile, loading } = useUserProfile();
    const [viewMode, setViewModeState] = useState<ViewMode>("personal");
    const [isInitialized, setIsInitialized] = useState(false);

    const canAccessTeam = canAccessFinanceTeam(profile?.role);

    // Initialize view mode from URL, session storage or based on role
    useEffect(() => {
        if (!loading && !isInitialized) {
            const searchParams = new URLSearchParams(window.location.search);
            const urlView = searchParams.get("view") as ViewMode | null;
            const stored = sessionStorage.getItem(STORAGE_KEY) as ViewMode | null;

            if (canAccessTeam) {
                // Priority: 1. URL parameter, 2. Stored preference, 3. Default to team
                const targetView = (urlView === "personal" || urlView === "team")
                    ? urlView
                    : (stored === "personal" ? "personal" : "team");

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
        if (!canAccessTeam && viewMode === "team") {
            setViewModeState("personal");
            sessionStorage.removeItem(STORAGE_KEY);
        }
    }, [canAccessTeam, viewMode]);

    return (
        <FinanceContext.Provider
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
        </FinanceContext.Provider>
    );
}

export function useFinance() {
    const context = useContext(FinanceContext);
    if (context === undefined) {
        throw new Error("useFinance must be used within a FinanceProvider");
    }
    return context;
}
