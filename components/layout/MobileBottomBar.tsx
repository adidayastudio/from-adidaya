"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
    House,
    Search,
    X,
    Sun,
    Zap,
    Target
} from "lucide-react";
import styles from "./BottomTabBar.module.css";
import FrostedGlassFilter from "./FrostedGlassFilter";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";

// Define Tab Type
export type TabKey = string;

interface TabConfig {
    key: TabKey;
    label: string;
    icon: React.ElementType;
    path: string;
}

export default function MobileBottomBar() {
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();

    // Search Mode State
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");

    useEffect(() => {
        setSearchQuery(searchParams.get("q") || "");
    }, [searchParams]);

    // State for liquid animation
    const [isMoving, setIsMoving] = useState(false);
    const [mounted, setMounted] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
    const { resolvedTheme } = useTheme();

    useEffect(() => {
        setMounted(true);
    }, []);

    // --- 1. GLOBAL TABS CONFIGURATION ---
    const globalTabs: TabConfig[] = [
        { key: "home", label: "Home", icon: House, path: "/dashboard" },
        { key: "task", label: "Tasks", icon: Target, path: "/flow" }, // Mapping Task to Flow/General
        { key: "action", label: "Actions", icon: Zap, path: "/frame" },  // Mapping Action to Frame/QuickActions
        { key: "project", label: "Projects", icon: Sun, path: "/flow/projects" },
    ];

    // --- 2. Determine Active Tab ---
    const activeTabKey = useMemo(() => {
        if (pathname.startsWith("/flow/projects")) return "project";
        if (pathname.startsWith("/flow")) return "task";
        if (pathname.startsWith("/frame")) return "action";
        return "home";
    }, [pathname]);

    const activeIndex = globalTabs.findIndex(t => t.key === activeTabKey);
    const activeTab = globalTabs[activeIndex] || globalTabs[0];

    // --- 3. Handlers ---
    const handleTabClick = (tab: TabConfig) => {
        if (isSearchOpen) return;
        router.push(tab.path);
    };

    const toggleSearch = () => {
        if (isSearchOpen) {
            setIsSearchOpen(false);
            if (searchQuery) {
                setSearchQuery("");
                const params = new URLSearchParams(window.location.search);
                params.delete("q");
                router.push(`${pathname}?${params.toString()}`);
            }
        } else {
            setIsSearchOpen(true);
        }
    };

    const handleSearchChange = (val: string) => {
        setSearchQuery(val);
        const params = new URLSearchParams(window.location.search);

        if (val.trim()) {
            params.set("q", val.trim());
        } else {
            params.delete("q");
        }

        router.push(`${pathname}?${params.toString()}`);
    };

    const executeSearch = (e: React.FormEvent) => {
        e.preventDefault();

        // Hide keyboard when enter is pressed
        const activeElement = document.activeElement as HTMLElement;
        if (activeElement) {
            activeElement.blur();
        }
    };

    const getSearchPlaceholder = () => {
        if (pathname === '/dashboard') return "Search Home...";

        const segments = pathname.split('/').filter(Boolean);
        if (segments.length > 0) {
            const lastSegment = segments[segments.length - 1];
            // Don't format raw IDs (e.g., if it's a UUID)
            if (lastSegment.length > 20 && lastSegment.includes('-')) {
                if (segments.length > 1) {
                    const parentSegment = segments[segments.length - 2];
                    const formatted = parentSegment.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                    return `Search in ${formatted}...`;
                }
                return "Search...";
            }
            const formatted = lastSegment.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            return `Search ${formatted}...`;
        }
        return `Search ${activeTab.label}...`;
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

    const theme = mounted && resolvedTheme === 'dark' ? 'dark' : 'light';

    // ANIMATION CONFIG
    const layoutTransition = {
        type: "spring",
        damping: 25,
        stiffness: 300,
        mass: 0.8
    } as const;

    return (
        <>
            <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center w-full px-4 max-w-lg" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
                {/* Lightweight Frosted Glass Filter */}
                <FrostedGlassFilter />

                {/* THE MAGIC MOTION CONTAINER */}
                <div className="flex items-center gap-2 w-full">

                    {/* --- LEFT COMPONENT: TABS -> ACTIVE ICON --- */}
                    <motion.div
                        layout
                        className={!isSearchOpen ? styles.tabBar : styles.activeIconCircle}
                        transition={layoutTransition}
                        data-theme={theme}
                        onClick={() => isSearchOpen && setIsSearchOpen(false)} // CLICK TO CLOSE SEARCH
                        style={{ cursor: isSearchOpen ? 'pointer' : 'default', overflow: 'hidden' }}
                    >
                        <AnimatePresence mode="popLayout" initial={false}>
                            {!isSearchOpen ? (
                                /* --- 1. NORMAL: TABS GRID --- */
                                <motion.div
                                    key="tabs-grid"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0, transition: { duration: 0.01 } }} // EXIT INSTANTLY
                                    transition={{ duration: 0.2 }}
                                    className="w-full h-full grid grid-cols-4 items-center relative"
                                >
                                    {/* Shared Background Layers */}
                                    <div className={styles.glassFilter} />
                                    <div className={styles.glassOverlay} />
                                    <div className={styles.glassSpecular} />

                                    {/* Sliding Indicator */}
                                    {activeIndex !== -1 && (
                                        <div
                                            className={styles.activeIndicator}
                                            style={{
                                                transform: `translateX(${activeIndex * 100}%)`,
                                            }}
                                        >
                                            <div
                                                className={styles.activeBubble}
                                                data-moving={isMoving}
                                            />
                                        </div>
                                    )}

                                    {/* Tab Items */}
                                    {globalTabs.map((tab) => {
                                        const isActive = activeTabKey === tab.key;
                                        const Icon = tab.icon;
                                        const activeColor = tab.key === "task" ? (theme === 'dark' ? "#32ADE6" : "#007AFF") : (theme === 'dark' ? "#FFFFFF" : "#000000");
                                        const inactiveColor = theme === 'dark' ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.65)";
                                        const iconColor = isActive ? activeColor : inactiveColor;
                                        return (
                                            <button
                                                key={tab.key}
                                                className={styles.tabItem}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleTabClick(tab);
                                                }}
                                                data-active={isActive}
                                            >
                                                <Icon
                                                    size={24}
                                                    strokeWidth={isActive ? 2.5 : 2}
                                                    color={iconColor}
                                                    fill={tab.key === "task" ? "none" : iconColor}
                                                />
                                                <span className={styles.label} style={{ color: iconColor }}>
                                                    {tab.label}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </motion.div>
                            ) : (
                                /* --- 2. SEARCH MODE: ACTIVE ICON ONLY --- */
                                <motion.div
                                    key="active-icon"
                                    initial={{ opacity: 0, scale: 0.5 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.1 } }}
                                    transition={{ duration: 0.3, delay: 0.1 }}
                                    className="flex items-center justify-center w-full h-full relative"
                                >
                                    {/* Shared Background Layers */}
                                    <div className={styles.glassFilter} />
                                    <div className={styles.glassOverlay} />
                                    <div className={styles.glassSpecular} />

                                    <activeTab.icon size={24} color={theme === 'dark' ? "#ffffff" : "#000000"} className="relative z-10" />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>

                    {/* --- RIGHT COMPONENT: SEARCH BUTTON -> SEARCH BAR --- */}
                    <motion.div
                        layout
                        className={!isSearchOpen ? styles.searchCircle : styles.searchBarExpanded}
                        transition={layoutTransition}
                        data-theme={theme}
                    >
                        <AnimatePresence mode="wait" initial={false}>
                            {!isSearchOpen ? (
                                /* --- 1. NORMAL: SEARCH ICON --- */
                                <motion.button
                                    key="search-btn"
                                    initial={{ opacity: 0, scale: 0.5 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.01 } }} // EXIT INSTANTLY
                                    transition={{ duration: 0.2 }}
                                    className="w-full h-full flex items-center justify-center relative cursor-pointer"
                                    onClick={toggleSearch}
                                >
                                    {/* Shared Background Layers */}
                                    <div className={styles.glassFilter} />
                                    <div className={styles.glassOverlay} />
                                    <div className={styles.glassSpecular} />

                                    <Search size={24} color={theme === 'dark' ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.65)"} className="relative z-10" />
                                </motion.button>
                            ) : (
                                /* --- 2. SEARCH MODE: INPUT --- */
                                <motion.div
                                    key="search-input"
                                    initial={{ opacity: 0, width: 0 }}
                                    animate={{ opacity: 1, width: "100%" }}
                                    exit={{ opacity: 0, width: 0 }}
                                    transition={{ duration: 0.3, delay: 0.1 }}
                                    className="flex-1 w-full h-full flex items-center gap-2 relative overflow-hidden"
                                >
                                    {/* Shared Background Layers */}
                                    <div className={styles.glassFilter} />
                                    <div className={styles.glassOverlay} />
                                    <div className={styles.glassSpecular} />

                                    <form
                                        onSubmit={executeSearch}
                                        className="flex-1 h-full flex items-center relative z-10 w-full pl-4"
                                    >
                                        <Search size={18} className="text-gray-500 dark:text-neutral-400 mr-2 opacity-70 shrink-0" />
                                        <input
                                            className="bg-transparent border-none outline-none text-[16px] w-full placeholder:text-gray-500/80 dark:placeholder:text-neutral-400/80 text-gray-900 dark:text-white font-medium"
                                            placeholder={getSearchPlaceholder()}
                                            value={searchQuery}
                                            onChange={(e) => handleSearchChange(e.target.value)}
                                            autoFocus
                                        />
                                    </form>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>

                </div>
            </div>
        </>
    );
}
