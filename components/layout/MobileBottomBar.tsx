"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import clsx from "clsx";
import {
    House,
    SquareStack,
    Share2,
    Heart,
    UserCircle,
    Play,
    Square,
    Plus,
    Upload,
    Download,
    Globe,
    MessageCircle,
    GraduationCap,
    Briefcase,
    DollarSign,
    Target,
    Users,
    Clock,
    HardHat
} from "lucide-react";
import { useClock } from "@/hooks/useClock";
import useUserProfile from "@/hooks/useUserProfile";
import ClockActionModal from "@/components/feel/clock/ClockActionModal";
import styles from "./BottomTabBar.module.css";

import FrostedGlassFilter from "./FrostedGlassFilter";

// Define Tab Type
export type TabKey = string;

interface TabConfig {
    key: TabKey;
    label: string;
    icon: React.ElementType;
    path: string;
    // If true, this tab acts as a reset point for the module (Overview)
    isOverview?: boolean;
}

interface ContextConfig {
    tabs: TabConfig[];
    moduleRoot: string;
}

export default function MobileBottomBar() {
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { isCheckedIn, toggleClock } = useClock();
    const { profile } = useUserProfile();
    const [isClockModalOpen, setIsClockModalOpen] = useState(false);

    // State for liquid animation
    const [isMoving, setIsMoving] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

    // 1. Determine Current Context
    const currentContext = useMemo(() => {
        if (pathname.startsWith("/frame")) return "frame";
        if (pathname.startsWith("/flow")) return "flow";
        if (pathname.startsWith("/feel")) return "feel";
        return "dashboard";
    }, [pathname]);

    // 2. Define Context Configurations
    const configs: Record<string, ContextConfig> = useMemo(() => ({
        dashboard: {
            moduleRoot: "/dashboard",
            tabs: [
                { key: "home", label: "Home", icon: House, path: "/dashboard", isOverview: true },
                { key: "frame", label: "Frame", icon: SquareStack, path: "/frame", isOverview: true },
                { key: "flow", label: "Flow", icon: Share2, path: "/flow", isOverview: true },
                { key: "feel", label: "Feel", icon: Heart, path: "/feel", isOverview: true },
            ]
        },
        frame: {
            moduleRoot: "/frame",
            tabs: [
                { key: "home", label: "Frame", icon: House, path: "/dashboard" }, // Home exits the module
                { key: "website", label: "Website", icon: Globe, path: "/frame/website" },
                { key: "social", label: "Social", icon: MessageCircle, path: "/frame/social" },
                { key: "learn", label: "Learn", icon: GraduationCap, path: "/frame/learn" },
            ]
        },
        flow: {
            moduleRoot: "/flow",
            tabs: [
                { key: "home", label: "Flow", icon: House, path: "/dashboard" },
                { key: "projects", label: "Projects", icon: Briefcase, path: "/flow/projects" },
                { key: "finance", label: "Finance", icon: DollarSign, path: "/flow/finance" },
                { key: "tracking", label: "Tracking", icon: Target, path: "/flow/resources" },
            ]
        },
        feel: {
            moduleRoot: "/feel",
            tabs: [
                { key: "home", label: "Feel", icon: House, path: "/dashboard" },
                { key: "people", label: "People", icon: Users, path: "/feel/people" },
                { key: "clock", label: "Clock", icon: Clock, path: "/feel/clock" },
                { key: "crew", label: "Crew", icon: HardHat, path: "/feel/crew" },
            ]
        }
    }), []);

    const activeConfig = configs[currentContext];

    // 3. Determine Active Tab
    const activeTabKey = useMemo(() => {
        // Check matches.
        // And inside Frame:
        // Home -> Dashboard
        // Website -> Website Page
        // ...
        // Wait, if I am on Frame Overview, which tab is active in the Frame Bottom Bar?
        // The requirements don't explicitly say "Frame Overview" is a tab in the Frame Context Bottom Bar.
        // It says:
        // Bottom Bar (when inside Frame):
        // - Home
        // - Website
        // - Social
        // - Learn
        // - FAB
        // Does "Frame Overview" equate to one of these? No.
        // So in Frame Overview, typically NO tab is strictly active if we only have these feature tabs.
        // OR, we treat it as a state where no feature tab is selected.

        // Let's check matches.

        // Dashboard Context
        if (currentContext === 'dashboard') {
            if (pathname.startsWith("/frame")) return "frame";
            if (pathname.startsWith("/flow")) return "flow";
            if (pathname.startsWith("/feel")) return "feel";
            return "home"; // Default
        }

        // Module Contexts
        // Find the tab that matches the current path optimally
        // Sort by length desc to match specific paths first
        const sortedTabs = [...activeConfig.tabs].sort((a, b) => b.path.length - a.path.length);

        for (const tab of sortedTabs) {
            if (tab.key === 'home') continue; // Skip home for finding active feature
            if (pathname.startsWith(tab.path)) {
                return tab.key;
            }
        }

        return 'home'; // Fallback to Home if nothing deeper matches? 
        // Or if we are in Module Overview, maybe NO tab should look active?
        // If I am at /frame (Overview), and tabs are Home, Website, Social, Learn.
        // None of them match /frame exactly except potentially Home if we consider it "Back to Dashboard".
        // But user is in Frame.
        // Let's return null or empty string if no feature matches, meaning user is at Overview.
        // However, to keep UI stable, maybe we don't highlight any specific "feature" tab, 
        // or we highlight the one that led here? No, "Module Overview" is a landing page.

        // Refinement: If strictly on Module Overview, maybe no tab is highlighted.
        return '';
    }, [pathname, currentContext, activeConfig]);

    const activeIndex = activeConfig.tabs.findIndex(t => t.key === activeTabKey);
    // If no tab is active (e.g. Overview), we might want to hide the indicator or position it differently.
    // However, the CSS expects an index. 
    // If activeIndex is -1, the indicator will slide off or be hidden.
    // Let's see CSS: transform `translateX`. If index is -1, it goes to -100%. 
    // We can conditionally hide output index or handle it.

    // 4. Handle Tab Click (Navigation Logic)
    const handleTabClick = (tab: TabConfig) => {
        // A. Home Tab -> Always Dashboard
        if (tab.key === 'home') {
            router.push('/dashboard');
            return;
        }

        // B. Module Tabs from Dashboard (already defined in config to point to module roots)
        // C. Feature Tabs within Module

        // LOGIC: "Tapping the SAME feature tab again -> Return to the module OVERVIEW page"

        // Check if we are already on this tab's path
        const isActive = activeTabKey === tab.key;

        if (isActive) {
            // "Reset Rule"
            // If I am on Website, and I click Website -> Go to Frame Overview
            router.push(activeConfig.moduleRoot);
        } else {
            // Navigate to feature
            router.push(tab.path);
        }
    };


    // Determines theme based on route - currently set to light but typed for expansion
    const theme = (pathname.startsWith("/dashboard") ? 'light' : 'light') as 'light' | 'dark' | 'colorful';

    // Determine icon color based on theme
    const getIconColor = (isActive: boolean) => {
        if (theme === 'dark') return '#FFF';
        if (theme === 'colorful') return isActive ? '#000' : 'rgba(0,0,0,0.7)';
        return 'currentColor'; // Uses CSS defined color
    };

    // Animation Effect
    useEffect(() => {
        setIsMoving(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        timeoutRef.current = setTimeout(() => {
            setIsMoving(false);
        }, 500);

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [activeTabKey]);


    // FAB Logic (Preserved from original, but ensuring it aligns with requirements)
    const getFabConfig = () => {
        const isDashboard = pathname === "/dashboard" || pathname === "/dashboard/overview";
        if (isDashboard) return { id: 'CLOCK', icon: (isCheckedIn ? Square : Play), color: (isCheckedIn ? 'red' : 'blue'), isClock: true };

        // Projects
        if (pathname === "/flow/projects/list") return { id: 'PROJECT_NEW', label: 'New Project', icon: Plus, color: 'red' };
        if (pathname === "/flow/projects/activity") return { id: 'PROJECT_LOG_ACTIVITY', label: 'Log Activity', icon: Plus, color: 'red' };
        if (pathname === "/flow/projects/docs") return { id: 'PROJECT_UPLOAD_DOC', label: 'Upload Doc', icon: Upload, color: 'red' };
        if (pathname === "/flow/projects/reports") return { id: 'PROJECT_EXPORT', label: 'Export', icon: Download, color: 'red' };
        if (pathname.includes("/flow/projects/overview") || pathname.includes("/flow/projects/schedule")) return null;
        if (pathname.startsWith("/flow/projects")) return { id: 'PROJECT_NEW', label: 'New Project', icon: Plus, color: 'red' };

        // Finance
        if (pathname === "/flow/finance" || pathname === "/flow/finance/overview") return { id: 'FINANCE_NEW_REQUEST', label: 'New Request', icon: Plus, color: 'red' };
        if (pathname === "/flow/finance/purchasing") return { id: 'FINANCE_NEW_PURCHASE', label: 'New Purchase', icon: Plus, color: 'red' };
        if (pathname === "/flow/finance/reimburse") return { id: 'FINANCE_NEW_PURCHASE', label: 'New Purchase', icon: Plus, color: 'red' };
        if (pathname === "/flow/finance/petty-cash") return { id: 'FINANCE_TOP_UP', label: 'Top Up', icon: Plus, color: 'red' };
        if (pathname === "/flow/finance/funding-sources") return { id: 'FINANCE_NEW_SOURCE', label: 'New Source', icon: Plus, color: 'red' };
        if (pathname === "/flow/finance/reports") return { id: 'FINANCE_EXPORT', label: 'Export', icon: Download, color: 'red' };

        // Resources
        if (pathname === "/flow/resources/overview") return { id: 'RESOURCE_NEW', label: 'New Mat/Tool/Asset', icon: Plus, color: 'red' };
        if (pathname === "/flow/resources/materials") return { id: 'RESOURCE_NEW_MAT', label: 'New Mat', icon: Plus, color: 'red' };
        if (pathname === "/flow/resources/tools") return { id: 'RESOURCE_NEW_TOOL', label: 'New Tool', icon: Plus, color: 'red' };
        if (pathname === "/flow/resources/assets") return { id: 'RESOURCE_NEW_ASSET', label: 'New Assets', icon: Plus, color: 'red' };

        // Client
        if (pathname.startsWith("/flow/client")) return { id: 'CLIENT_NEW', label: 'New', icon: Plus, color: 'red' };

        // Clock (Feel)
        if (pathname === "/feel/clock" || pathname.startsWith("/feel/clock")) {
            const section = searchParams.get("section") || "overview";

            if (section === "overview" || section === "timesheets") {
                return {
                    id: 'CLOCK',
                    icon: (isCheckedIn ? Square : Play),
                    color: (isCheckedIn ? 'red' : 'blue'),
                    isClock: true
                };
            }
            if (section === "leaves") return { id: 'CLOCK_NEW_LEAVE', label: 'New Request', icon: Plus, color: 'red' };
            if (section === "overtime") return { id: 'CLOCK_LOG_OVERTIME', label: 'Log Overtime', icon: Plus, color: 'red' };
            if (section === "business-trip") return { id: 'CLOCK_NEW_TRIP', label: 'New Trip', icon: Plus, color: 'red' };
        }

        // People Setup - Structure
        if (pathname === "/feel/people" && searchParams.get("section") === "setup" && searchParams.get("tab") === "structure") {
            return { id: 'STRUCTURE_ADD', label: 'Add', icon: Plus, color: 'blue' };
        }

        // People Setup - Employment (hide FAB on policies subtab)
        if (pathname === "/feel/people" && searchParams.get("section") === "setup" && searchParams.get("tab") === "employment") {
            const subtab = searchParams.get("subtab");
            // Hide FAB for policies tab (no add action)
            if (subtab === "policies") return null;
            return { id: 'EMPLOYMENT_ADD', label: 'Add', icon: Plus, color: 'blue' };
        }

        // Crew
        if (pathname.startsWith("/feel/crew")) {
            const tab = searchParams.get("tab") || "directory";
            if (tab === "directory") return { id: 'CREW_ADD', label: 'Add', icon: Plus, color: 'blue' };
            if (tab === "assignments") return { id: 'CREW_ASSIGNMENT_NEW', label: 'New', icon: Plus, color: 'blue' };
            if (tab === "requests") return { id: 'CREW_REQUEST_NEW', label: 'Add', icon: Plus, color: 'blue' };
            // Fallback for other crew tabs
            return { id: 'CREW_DEFAULT_ADD', label: 'Add', icon: Plus, color: 'blue' };
        }

        // --- MODULE DEFAULTS (CATCH-ALL) ---

        // Frame -> Orange
        if (pathname.startsWith("/frame")) {
            return { id: 'FRAME_DEFAULT', label: 'Action', icon: Plus, color: 'orange' };
        }

        // Flow -> Red
        if (pathname.startsWith("/flow")) {
            return { id: 'FLOW_DEFAULT', label: 'Action', icon: Plus, color: 'red' };
        }

        // Feel -> Blue
        if (pathname.startsWith("/feel")) {
            return { id: 'FEEL_DEFAULT', label: 'Action', icon: Plus, color: 'blue' };
        }

        return null;
    };

    const fabConfig = getFabConfig();

    const handleFabClick = () => {
        if (!fabConfig) return;
        if (fabConfig.isClock) {
            setIsClockModalOpen(true);
        } else {
            const event = new CustomEvent('fab-action', { detail: { id: fabConfig.id } });
            window.dispatchEvent(event);
        }
    };

    return (
        <>
            <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center gap-3 w-full px-4 max-w-lg" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
                {/* Lightweight Frosted Glass Filter */}
                <FrostedGlassFilter />

                {/* NEW BOTTOM TAB BAR */}
                <div className={styles.tabBar} data-theme={theme}>
                    <div className={styles.glassFilter} />
                    <div className={styles.glassOverlay} />
                    <div className={styles.glassSpecular} />
                    {/* Sliding Indicator - Only show if activeIndex is valid (>= 0) */}
                    {activeIndex !== -1 && (
                        <div
                            className={styles.activeIndicator}
                            data-moving={isMoving}
                            style={{
                                transform: `translateX(${activeIndex * 100}%) scale(${isMoving ? 1.15 : 1})`
                            }}
                        />
                    )}

                    {activeConfig.tabs.map((tab) => {
                        const isActive = activeTabKey === tab.key;
                        const Icon = tab.icon;

                        return (
                            <button
                                key={tab.key}
                                className={styles.tabItem}
                                onClick={() => handleTabClick(tab)}
                                data-active={isActive}
                            >
                                {/* Render icon based on tab */}
                                <Icon
                                    size={24}
                                    strokeWidth={isActive ? 2 : 1.5}
                                    color={getIconColor(isActive)}
                                    // Fill Feel icon only if active and context is dashboard (optional, based on old code)
                                    // Original: fill={activeTab === tab ? getIconColor(true) : "none"} for Feel
                                    fill={(tab.key === 'feel' && isActive) ? getIconColor(true) : "none"}
                                />

                                <span className={styles.label} style={{ color: getIconColor(isActive) }}>
                                    {tab.label}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* FAB - Inline */}
                {fabConfig && (
                    <button
                        onClick={handleFabClick}
                        className={clsx(
                            "w-14 h-14 flex items-center justify-center rounded-full shadow-xl transition-all active:scale-95 text-white border border-white/20 shrink-0",
                            fabConfig.color === 'red' ? "shadow-red-500/30" :
                                fabConfig.color === 'orange' ? "shadow-orange-500/40" :
                                    "shadow-blue-500/40"
                        )}
                        style={{
                            background: fabConfig.color === 'red'
                                ? 'linear-gradient(180deg, #EF4444 0%, #DC2626 100%)'
                                : fabConfig.color === 'orange'
                                    ? 'linear-gradient(180deg, #F97316 0%, #EA580C 100%)'
                                    : 'linear-gradient(180deg, #3B82F6 0%, #2563EB 100%)',
                            zIndex: 1002
                        }}
                    >
                        <fabConfig.icon className={clsx("w-6 h-6", fabConfig.id === 'CLOCK' && !isCheckedIn && "ml-0.5")} />
                    </button>
                )}
            </div>

            <ClockActionModal
                isOpen={isClockModalOpen}
                onClose={() => setIsClockModalOpen(false)}
                type={isCheckedIn ? "OUT" : "IN"}
                userRole={profile?.role || "staff"}
                onConfirm={toggleClock}
            />
        </>
    );
}
