"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import useUserProfile from "@/hooks/useUserProfile";
import { canAccessFinanceTeam } from "@/lib/auth-utils";
import { useRouter, useSearchParams } from "next/navigation";

type ViewMode = "personal" | "team";

interface FinanceContextType {
    viewMode: ViewMode;
    setViewMode: (mode: ViewMode | ((prev: ViewMode) => ViewMode)) => void;
    canAccessTeam: boolean;
    searchTerm: string;
    debouncedSearchTerm: string;
    setSearchTerm: (term: string) => void;
    isLoading: boolean;
    isInitialized: boolean;
    userRole: string | undefined;
    userId: string | undefined;
    profile: any;
    contextInstanceId?: string;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

const STORAGE_KEY = "finance_view_mode";

export function FinanceProvider({ children }: { children: ReactNode }) {
    const { profile, loading } = useUserProfile();
    const router = useRouter();
    const [viewMode, setViewModeState] = useState<ViewMode>("personal");
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
    const [isInitialized, setIsInitialized] = useState(false);
    
    const searchParams = useSearchParams();

    // Diagnostic instance ID to track duplicate mounts
    const [instanceId] = useState(() => Math.random().toString(36).substring(2, 7));

    useEffect(() => {
        console.log(`[FinanceProvider:${instanceId}] Mounted. Current Search: "${searchTerm}"`);
        return () => console.log(`[FinanceProvider:${instanceId}] Unmounted.`);
    }, []);

    // Sync URL 'q' param with local search term (for MobileBottomBarV2 integration)
    useEffect(() => {
        const q = searchParams.get("q") || "";
        if (q !== searchTerm) {
            setSearchTerm(q);
        }
    }, [searchParams.get("q")]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 500); // 500ms debounce
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const canAccessTeam = canAccessFinanceTeam(profile?.role);

    // Final initialization once profile is ready
    useEffect(() => {
        if (!loading && !isInitialized) {
            // Note: window.location.search is fine for initial load, but useSearchParams handles reactivity
            const currentUrlParams = new URLSearchParams(window.location.search);
            const urlView = currentUrlParams.get("view") as ViewMode | null;
            const stored = sessionStorage.getItem(STORAGE_KEY) as ViewMode | null;

            if (canAccessTeam) {
                // Determine target view: Priority: 1. URL parameter, 2. Stored preference, 3. Keep current (from lazy init)
                const targetView = (urlView === "personal" || urlView === "team")
                    ? urlView
                    : (stored === "team" ? "team" : (stored === "personal" ? "personal" : viewMode));

                if (targetView !== viewMode) {
                    setViewModeState(targetView);
                }
                
                // Keep sync with storage
                if (urlView && urlView !== stored) {
                    sessionStorage.setItem(STORAGE_KEY, urlView);
                }
            } else {
                // For staff: always personal
                if (viewMode !== "personal") {
                    setViewModeState("personal");
                }
                sessionStorage.removeItem(STORAGE_KEY);
            }
            setIsInitialized(true);
        }
    }, [loading, canAccessTeam, isInitialized, viewMode]);

    // Listen for URL changes (Back/Forward buttons)
    useEffect(() => {
        const handlePopState = () => {
            const searchParams = new URLSearchParams(window.location.search);
            const urlView = searchParams.get("view") as ViewMode | null;
            if (urlView === "personal" || urlView === "team") {
                if (urlView !== viewMode) {
                    setViewModeState(urlView);
                    sessionStorage.setItem(STORAGE_KEY, urlView);
                }
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [viewMode]);

    // Persist view mode changes
    const setViewMode = (mode: ViewMode | ((prev: ViewMode) => ViewMode)) => {
        let nextMode: ViewMode = viewMode; // optimistic default
        
        setViewModeState((prev) => {
            const calculatedMode = typeof mode === "function" ? mode(prev) : mode;
            // Staff cannot switch to team view
            if (!canAccessTeam && calculatedMode === "team") {
                return prev;
            }
            nextMode = calculatedMode;
            return calculatedMode;
        });

        // Use setTimeout to defer side-effects
        setTimeout(() => {
            if (!canAccessTeam && nextMode === "team") return;
            sessionStorage.setItem(STORAGE_KEY, nextMode);
        }, 0);
    };

    // Listen for custom events from the header or other detached components
    useEffect(() => {
        const handleSetViewMode = (e: any) => {
            console.log(`[FinanceProvider:${instanceId}] Event: set-view-mode -> ${e.detail}`);
            setViewMode(e.detail);
        };
        const handleSetSearchTerm = (e: any) => {
            setSearchTerm(e.detail);
        };

        window.addEventListener('finance:set-view-mode', handleSetViewMode as EventListener);
        window.addEventListener('finance:set-search-term', handleSetSearchTerm as EventListener);
        
        return () => {
            window.removeEventListener('finance:set-view-mode', handleSetViewMode as EventListener);
            window.removeEventListener('finance:set-search-term', handleSetSearchTerm as EventListener);
        };
    }, [instanceId, setViewMode]); // depends on instanceId and stable setViewMode

    useEffect(() => {
        if (!loading && !canAccessTeam && viewMode === "team") {
            setViewModeState("personal");
            sessionStorage.removeItem(STORAGE_KEY);
        }
    }, [canAccessTeam, viewMode, profile, loading]);

    return (
        <FinanceContext.Provider
            value={{
                viewMode,
                setViewMode,
                canAccessTeam,
                searchTerm,
                debouncedSearchTerm,
                setSearchTerm,
                isLoading: loading || !isInitialized, 
                isInitialized, 
                userRole: profile?.role,
                userId: profile?.id,
                profile,
                contextInstanceId: instanceId
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
