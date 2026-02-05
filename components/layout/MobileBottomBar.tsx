"use client";

import React, { useEffect, useState, useRef } from "react";
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
} from "lucide-react";
import { useClock } from "@/hooks/useClock";
import useUserProfile from "@/hooks/useUserProfile";
import ClockActionModal from "@/components/feel/clock/ClockActionModal";
import styles from "./BottomTabBar.module.css";

// Define Tab Type
export type Tab = 'home' | 'frame' | 'flow' | 'feel' | 'me';

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

    // Determine active tab based on pathname
    const getActiveTab = (): Tab => {
        if (pathname === "/dashboard") return 'home';
        if (pathname.startsWith("/frame")) return 'frame';
        if (pathname.startsWith("/flow")) return 'flow';
        if (pathname.startsWith("/feel")) return 'feel';
        if (pathname.startsWith("/settings") || pathname.startsWith("/me")) return 'me';
        return 'home'; // Default fallback
    };

    const activeTab = getActiveTab();
    const tabs: Tab[] = ['home', 'frame', 'flow', 'feel', 'me'];
    const activeIndex = tabs.indexOf(activeTab);

    // Determines theme based on route - currently set to light but typed for expansion
    const theme = (pathname.startsWith("/dashboard") ? 'light' : 'light') as 'light' | 'dark' | 'colorful';

    // Handle tab change
    const handleTabChange = (tab: Tab) => {
        switch (tab) {
            case 'home': router.push('/dashboard'); break;
            case 'frame': router.push('/frame'); break;
            case 'flow': router.push('/flow'); break;
            case 'feel': router.push('/feel'); break;
            case 'me': router.push('/settings'); break;
        }
    };

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
    }, [activeTab]);


    // FAB Logic (Preserved)
    const getFabConfig = () => {
        const isDashboard = pathname === "/dashboard" || pathname === "/dashboard/overview";
        if (isDashboard) return { id: 'CLOCK', icon: (isCheckedIn ? Square : Play), color: (isCheckedIn ? 'red' : 'blue'), isClock: true };

        // Projects
        if (pathname === "/flow/projects/list") return { id: 'PROJECT_NEW', label: 'New Project', icon: Plus, color: 'red' };
        if (pathname.startsWith("/flow/projects") && !pathname.includes("overview")) return null; // Simplified for brevity

        // Finance
        if (pathname.includes("/flow/finance")) return { id: 'FINANCE_NEW', label: 'New', icon: Plus, color: 'red' };

        // Feel - Clock
        if (pathname === "/feel/clock" || pathname.startsWith("/feel/clock")) {
            const section = searchParams.get("section");
            if (!section || section === "overview" || section === "timesheets") {
                return { id: 'CLOCK', icon: (isCheckedIn ? Square : Play), color: (isCheckedIn ? 'red' : 'blue'), isClock: true };
            }
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
                {/* NEW BOTTOM TAB BAR */}
                <div className={styles.tabBar} data-theme={theme}>
                    {/* Sliding Indicator */}
                    <div
                        className={styles.activeIndicator}
                        data-moving={isMoving}
                        style={{
                            transform: `translateX(${activeIndex * 100}%) scale(${isMoving ? 1.15 : 1})`
                        }}
                    />

                    {tabs.map((tab) => (
                        <button
                            key={tab}
                            className={styles.tabItem}
                            onClick={() => handleTabChange(tab)}
                            data-active={activeTab === tab}
                        >
                            {/* Render icon based on tab */}
                            {tab === 'home' && <House size={24} strokeWidth={activeTab === tab ? 2.5 : 2} color={getIconColor(activeTab === tab)} />}
                            {tab === 'frame' && <SquareStack size={24} strokeWidth={activeTab === tab ? 2.5 : 2} color={getIconColor(activeTab === tab)} />}
                            {tab === 'flow' && <Share2 size={24} strokeWidth={activeTab === tab ? 2.5 : 2} color={getIconColor(activeTab === tab)} />}
                            {tab === 'feel' && <Heart size={24} strokeWidth={activeTab === tab ? 2.5 : 2} color={getIconColor(activeTab === tab)} fill={activeTab === tab ? getIconColor(true) : "none"} />}
                            {tab === 'me' && <UserCircle size={24} strokeWidth={activeTab === tab ? 2.5 : 2} color={getIconColor(activeTab === tab)} />}

                            <span className={styles.label} style={{ color: getIconColor(activeTab === tab) }}>
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </span>
                        </button>
                    ))}
                </div>

                {/* FAB - Inline */}
                {fabConfig && (
                    <button
                        onClick={handleFabClick}
                        className={clsx(
                            "w-14 h-14 flex items-center justify-center rounded-full shadow-xl transition-all active:scale-95 text-white border border-white/20 shrink-0",
                            fabConfig.color === 'red' ? "shadow-red-500/30" : "shadow-blue-500/40"
                        )}
                        style={{
                            background: fabConfig.color === 'red'
                                ? 'linear-gradient(180deg, #EF4444 0%, #DC2626 100%)'
                                : 'linear-gradient(180deg, #3B82F6 0%, #2563EB 100%)'
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
