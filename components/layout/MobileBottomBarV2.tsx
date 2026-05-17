"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
    Search,
    X,
} from "lucide-react";
import { IoHome, IoFlash, IoBriefcase } from "react-icons/io5";
import { FaBullseye } from "react-icons/fa";
import styles from "./BottomTabBar.module.css";
import FrostedGlassFilter from "./FrostedGlassFilter";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import useUserProfile from "@/hooks/useUserProfile";

export type TabKey = string;

interface TabConfig {
    key: TabKey;
    label: string;
    icon: React.ElementType;
    path: string;
}

export default function MobileBottomBar() {
    const { profile } = useUserProfile();
    const isStaff = profile?.role === "staff";

    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();

    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");

    useEffect(() => {
        setSearchQuery(searchParams.get("q") || "");
    }, [searchParams]);
    const [isMoving, setIsMoving] = useState(false);
    const [mounted, setMounted] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
    const { resolvedTheme } = useTheme();

    const globalTabs: TabConfig[] = useMemo(() => {
        const tabs = [
            { key: "home", label: "Home", icon: IoHome, path: "/dashboard" },
            { key: "task", label: "Tasks", icon: FaBullseye, path: "/task" },
            { key: "action", label: "Actions", icon: IoFlash, path: "/action" },
            { key: "project", label: "Projects", icon: IoBriefcase, path: "/project" },
        ];
        return isStaff ? tabs.filter(t => t.key !== "action") : tabs;
    }, [isStaff]);

    const activeTabKey = useMemo(() => {
        if (pathname.startsWith("/project")) return "project";
        if (pathname.startsWith("/task")) return "task";
        if (pathname.startsWith("/action")) return "action";
        return "home";
    }, [pathname]);

    const activeIndex = globalTabs.findIndex(t => t.key === activeTabKey);
    const activeTab = globalTabs[activeIndex] || globalTabs[0];

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

    useEffect(() => {
        setMounted(true);
        setIsMoving(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setIsMoving(false), 500);
        return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
    }, [activeTabKey]);

    const theme = mounted && resolvedTheme === 'dark' ? 'dark' : 'light';

    const layoutTransition = {
        type: "tween",
        duration: 0.4,
        ease: [0.4, 0.0, 0.2, 1] // Material Design ease-in-out
    } as const;

    const layoutTransitionDelayed = {
        ...layoutTransition,
        delay: 0.03
    } as const;

    return (
        <>
            <div
                className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center w-full px-4 max-w-lg"
                style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
                <FrostedGlassFilter />

                {/* SPLIT LAYOUT: [Tabs Pill] + [Search Circle] */}
                <div className="flex items-center gap-2 w-full">

                    {/* === LEFT: TABS PILL → ACTIVE ICON CIRCLE === */}
                    <motion.div
                        layout
                        className={!isSearchOpen ? styles.tabBar : styles.activeIconCircle}
                        transition={!isSearchOpen ? layoutTransition : layoutTransitionDelayed}
                        data-theme={theme}
                        onClick={() => isSearchOpen && setIsSearchOpen(false)}
                        style={{ cursor: isSearchOpen ? 'pointer' : 'default', overflow: 'hidden' }}
                    >
                        {/* Glass layers — ONLY on this parent */}
                        <div className={styles.glassFilter} />
                        <div className={styles.glassOverlay} />
                        <div className={styles.glassSpecular} />

                        <AnimatePresence mode="popLayout" initial={false}>
                            {!isSearchOpen ? (
                                /* NORMAL: 4 Tabs */
                                <motion.div
                                    key="tabs-grid"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0, transition: { duration: 0.05 } }}
                                    transition={{ duration: 0.15 }}
                                    style={{
                                        position: 'absolute',
                                        inset: '6px',
                                        display: 'grid',
                                        gridTemplateColumns: `repeat(${globalTabs.length}, 1fr)`,
                                        alignItems: 'center',
                                        zIndex: 10,
                                    }}
                                >
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

                                        const activeColor = "#007AFF"; // iOS style blue for ANY active tab
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
                                                    color={iconColor}
                                                />
                                                <span className={styles.label} style={{ color: iconColor }}>
                                                    {tab.label}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </motion.div>
                            ) : (
                                /* SEARCH MODE: Active Icon Only */
                                <motion.div
                                    key="active-icon"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0, transition: { duration: 0.05 } }}
                                    transition={{ duration: 0.15 }}
                                    className="flex items-center justify-center w-full h-full relative z-10"
                                >
                                    <activeTab.icon size={24} color={theme === 'dark' ? "#fff" : "#000"} />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>

                    {/* === RIGHT: SEARCH CIRCLE → SEARCH BAR === */}
                    <motion.div
                        layout
                        className={!isSearchOpen ? styles.searchCircle : styles.searchBarExpanded}
                        transition={layoutTransition}
                        data-theme={theme}
                    >
                        {/* Glass layers — ONLY on this parent */}
                        <div className={styles.glassFilter} />
                        <div className={styles.glassOverlay} />
                        <div className={styles.glassSpecular} />

                        <AnimatePresence mode="wait" initial={false}>
                            {!isSearchOpen ? (
                                /* NORMAL: Search Icon */
                                <motion.button
                                    key="search-btn"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0, transition: { duration: 0.03 } }}
                                    transition={{ duration: 0.15 }}
                                    className="w-full h-full flex items-center justify-center relative z-10 cursor-pointer"
                                    onClick={toggleSearch}
                                >
                                    <Search size={24} color={theme === 'dark' ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.65)"} />
                                </motion.button>
                            ) : (
                                /* SEARCH MODE: Input */
                                <motion.div
                                    key="search-input"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="w-full h-full flex items-center gap-2 relative z-10 overflow-hidden"
                                >
                                    <form
                                        onSubmit={executeSearch}
                                        className="flex-1 h-full flex items-center w-full pl-4"
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
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (searchQuery) {
                                                handleSearchChange("");
                                            } else {
                                                setIsSearchOpen(false);
                                            }
                                        }}
                                        className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-2"
                                        style={{
                                            background: theme === 'dark' ? 'rgba(40,40,40,0.45)' : 'rgba(255,255,255,0.45)',
                                            backdropFilter: 'blur(12px)',
                                            WebkitBackdropFilter: 'blur(12px)',
                                            border: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.5)',
                                            boxShadow: theme === 'dark' ? '0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)' : '0 2px 8px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.4)',
                                        }}
                                    >
                                        <X size={16} color={theme === 'dark' ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)"} />
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>

                </div>
            </div>
        </>
    );
}
