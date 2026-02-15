"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
    House,
    Search,
    X,
    Briefcase,
    Zap,
    LayoutGrid
} from "lucide-react";
import styles from "./BottomTabBar.module.css";
import FrostedGlassFilter from "./FrostedGlassFilter";
import { motion, AnimatePresence } from "framer-motion";

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

    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [isMoving, setIsMoving] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

    const globalTabs: TabConfig[] = [
        { key: "home", label: "Home", icon: House, path: "/dashboard" },
        { key: "task", label: "Task", icon: LayoutGrid, path: "/task" },
        { key: "action", label: "Action", icon: Zap, path: "/action" },
        { key: "project", label: "Project", icon: Briefcase, path: "/project" },
    ];

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
        } else {
            setSearchQuery("");
            setIsSearchOpen(true);
        }
    };

    const executeSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        const params = new URLSearchParams();
        params.set("q", searchQuery);
        params.set("context", activeTabKey);
        router.push(`/search?${params.toString()}`);
        setIsSearchOpen(false);
    };

    useEffect(() => {
        setIsMoving(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setIsMoving(false), 500);
        return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
    }, [activeTabKey]);

    const theme = 'light';

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
                                        gridTemplateColumns: 'repeat(4, 1fr)',
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
                                                    strokeWidth={isActive ? 2.5 : 1.5}
                                                    color={isActive ? "#FF3B30" : "rgba(0,0,0,0.65)"}
                                                />
                                                <span className={styles.label} style={{ color: isActive ? "#FF3B30" : "rgba(0,0,0,0.65)" }}>
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
                                    <activeTab.icon size={24} color="#000" />
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
                                    <Search size={24} color="rgba(0,0,0,0.65)" />
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
                                        <Search size={18} className="text-gray-500 mr-2 opacity-70 shrink-0" />
                                        <input
                                            className="bg-transparent border-none outline-none text-[16px] w-full placeholder:text-gray-500/80 text-gray-900 font-medium"
                                            placeholder={`Search ${activeTab.label}...`}
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            autoFocus
                                        />
                                    </form>
                                    <button
                                        onClick={() => setIsSearchOpen(false)}
                                        className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-2"
                                        style={{
                                            background: 'rgba(255,255,255,0.45)',
                                            backdropFilter: 'blur(12px)',
                                            WebkitBackdropFilter: 'blur(12px)',
                                            border: '1px solid rgba(255,255,255,0.5)',
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.4)',
                                        }}
                                    >
                                        <X size={16} color="rgba(0,0,0,0.6)" />
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
