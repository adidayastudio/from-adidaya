"use client";

import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
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
    allowedProjectCodes: string[] | null;
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
        // console.log(`[FinanceProvider:${instanceId}] Mounted.`);
    }, []);

    // Sync URL 'q' param to local state ONLY if it changes externally (e.g. navigation)
    useEffect(() => {
        const q = searchParams.get("q") || "";
        // Only update local state if the URL is different FROM what we currently have
        // and we aren't "in the middle" of a local update (heuristic: local value is same as last pushed)
        if (q !== searchTerm) {
            setSearchTerm(q);
        }
    }, [searchParams.get("q")]);

    // Update debounced term
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 500); 
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Push debounced term to URL
    useEffect(() => {
        if (!isInitialized) return;
        
        const params = new URLSearchParams(window.location.search);
        const currentQ = params.get("q") || "";
        
        if (debouncedSearchTerm !== currentQ) {
            if (debouncedSearchTerm) {
                params.set("q", debouncedSearchTerm);
            } else {
                params.delete("q");
            }
            const newUrl = `${window.location.pathname}?${params.toString()}`;
            router.replace(newUrl, { scroll: false });
        }
    }, [debouncedSearchTerm, router, isInitialized]);

    const allowedProjectCodes = useMemo(() => {
        if (!profile) return null;
        // Case-insensitive check for Cindi as requested by user
        const name = (profile.nickname || profile.full_name || "").toLowerCase();
        if (name.includes("cindi")) {
            return ["JPF", "RBH"];
        }
        return null;
    }, [profile]);

    const canAccessTeam = canAccessFinanceTeam(profile?.role);

    // Final initialization once profile is ready
    useEffect(() => {
        if (!loading && !isInitialized) {
            // Note: window.location.search is fine for initial load, but useSearchParams handles reactivity
            const currentUrlParams = new URLSearchParams(window.location.search);
            const urlView = currentUrlParams.get("view") as ViewMode | null;
            const stored = sessionStorage.getItem(STORAGE_KEY) as ViewMode | null;

            if (canAccessTeam) {
                // Determine target view: Priority: 1. URL parameter, 2. Stored preference, 3. Default to "team"
                const targetView = (urlView === "personal" || urlView === "team")
                    ? urlView
                    : (stored === "personal" ? "personal" : "team");

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
                allowedProjectCodes,
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
