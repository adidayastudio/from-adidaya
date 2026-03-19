"use client";

import { useState } from "react";
import clsx from "clsx";
import { User, Users } from "lucide-react";
import { useFinance } from "./FinanceContext";
import { motion } from "framer-motion";

export function FinanceViewToggleUI({
    viewMode,
    setViewMode,
    canAccessTeam,
}: {
    viewMode: 'personal' | 'team';
    setViewMode: (mode: 'personal' | 'team') => void;
    canAccessTeam: boolean;
}) {
    // Staff only sees personal view, no toggle needed
    if (!canAccessTeam) return null;

    return (
        <div className="relative inline-flex p-1 items-center h-10 rounded-full bg-white/40 dark:bg-neutral-800/40 backdrop-blur-md border border-white/40 dark:border-neutral-700/30 shadow-sm">
            {/* PERSONAL BUTTON */}
            <button
                onClick={() => setViewMode("personal")}
                className={clsx(
                    "relative flex items-center h-full rounded-full text-[12px] font-medium tracking-tight transition-all duration-300 px-4 py-1.5",
                    viewMode === "personal" ? "text-neutral-900 dark:text-white font-bold" : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                )}
            >
                {viewMode === "personal" && (
                    <motion.div
                        layoutId="active-pill-finance"
                        className="absolute inset-0 bg-white dark:bg-neutral-700 rounded-full shadow-sm z-0"
                        transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                )}
                <div className="relative z-10 flex items-center">
                    <User className="w-3.5 h-3.5 shrink-0" strokeWidth={viewMode === "personal" ? 2.5 : 2} />
                    <motion.span 
                        initial={false}
                        animate={{ 
                            width: viewMode === "personal" ? "auto" : 0,
                            opacity: viewMode === "personal" ? 1 : 0,
                            marginLeft: viewMode === "personal" ? "0.375rem" : 0
                        }}
                        className="overflow-hidden whitespace-nowrap"
                    >
                        Personal
                    </motion.span>
                    
                    {/* iPad logic: hide label if not active, but show on lg+ always */}
                    <span className={clsx(
                        "hidden lg:inline-block ml-1.5",
                        viewMode === "personal" && "hidden" // handled by motion.span above
                    )}>
                        {viewMode !== "personal" && "Personal"}
                    </span>
                </div>
            </button>

            {/* TEAM BUTTON */}
            <button
                onClick={() => setViewMode("team")}
                className={clsx(
                    "relative flex items-center h-full rounded-full text-[12px] font-medium tracking-tight transition-all duration-300 px-4 py-1.5",
                    viewMode === "team" ? "text-neutral-900 dark:text-white font-bold" : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                )}
            >
                {viewMode === "team" && (
                    <motion.div
                        layoutId="active-pill-finance"
                        className="absolute inset-0 bg-white dark:bg-neutral-700 rounded-full shadow-sm z-0"
                        transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                )}
                <div className="relative z-10 flex items-center">
                    <Users className="w-3.5 h-3.5 shrink-0" strokeWidth={viewMode === "team" ? 2.5 : 2} />
                    <motion.span 
                        initial={false}
                        animate={{ 
                            width: viewMode === "team" ? "auto" : 0,
                            opacity: viewMode === "team" ? 1 : 0,
                            marginLeft: viewMode === "team" ? "0.375rem" : 0
                        }}
                        className="overflow-hidden whitespace-nowrap"
                    >
                        Team
                    </motion.span>

                    {/* iPad logic: hide label if not active, but show on lg+ always */}
                    <span className={clsx(
                        "hidden lg:inline-block ml-1.5",
                        viewMode === "team" && "hidden" 
                    )}>
                        {viewMode !== "team" && "Team"}
                    </span>
                </div>
            </button>
        </div>
    );
}

export function FinanceViewToggle() {
    const { viewMode, setViewMode, canAccessTeam, isLoading } = useFinance();
    if (!canAccessTeam || isLoading) return null;
    return <FinanceViewToggleUI viewMode={viewMode as 'personal' | 'team'} setViewMode={setViewMode as any} canAccessTeam={canAccessTeam} />;
}
