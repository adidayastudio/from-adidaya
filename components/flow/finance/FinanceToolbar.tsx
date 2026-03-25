"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Projector as Project, X, ChevronDown, Check, Calendar, ListFilter } from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { Project as ProjectType } from "@/types/project";

interface FinanceToolbarProps {
    currentMonth: Date;
    onMonthChange: (direction: "prev" | "next") => void;
    projects: ProjectType[];
    selectedProjects: string[];
    onProjectToggle: (projectId: string) => void;
    onClearProjects: () => void;
    showAllMonths?: boolean;
    onToggleShowAll?: () => void;
    className?: string;
}

export function FinanceToolbar({
    currentMonth,
    onMonthChange,
    projects,
    selectedProjects,
    onProjectToggle,
    onClearProjects,
    showAllMonths = false,
    onToggleShowAll,
    className
}: FinanceToolbarProps) {
    const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsProjectDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const selectedProjectsData = projects.filter(p => selectedProjects.includes(p.id));

    return (
        <div className={clsx("flex flex-wrap items-center gap-3 mb-3", className)}>
            {/* MONTH PAGINATION */}
            <div className={clsx(
                "flex items-center backdrop-blur-md rounded-full border p-0.5 shadow-sm h-10 transition-all duration-300",
                showAllMonths 
                    ? "bg-blue-100/60 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30" 
                    : "bg-white/40 dark:bg-white/[0.03] border-white/50 dark:border-white/[0.06]"
            )}>
                <button
                    onClick={() => onMonthChange("prev")}
                    className="h-9 w-10 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-all active:scale-95"
                    title="Previous Month"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
                
                <button 
                    onClick={onToggleShowAll}
                    className={clsx(
                        "px-4 h-9 flex items-center gap-2 rounded-full transition-all active:scale-95 min-w-[140px] justify-center",
                        showAllMonths 
                            ? "text-blue-700 dark:text-blue-300" 
                            : "hover:bg-black/5 dark:hover:bg-white/10 text-neutral-900 dark:text-white"
                    )}
                >
                    <Calendar className={clsx("w-3.5 h-3.5", showAllMonths ? "text-blue-600 dark:text-blue-400" : "text-neutral-400")} />
                    <span className="text-[13px] font-bold whitespace-nowrap">
                        {showAllMonths ? "All Time View" : format(currentMonth, "MMMM yyyy")}
                    </span>
                </button>

                <button
                    onClick={() => onMonthChange("next")}
                    className="h-9 w-10 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-all active:scale-95"
                    title="Next Month"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>

            {/* PROJECT FILTER DROPDOWN */}
            <div className="relative" ref={dropdownRef}>
                <button
                    onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                    className={clsx(
                        "flex items-center gap-2.5 h-10 px-5 rounded-full border transition-all active:scale-[0.98] backdrop-blur-md shadow-sm",
                        selectedProjects.length > 0
                            ? "bg-blue-100/60 border-blue-200 text-blue-700 dark:bg-blue-500/10 dark:border-blue-500/20 dark:text-blue-400"
                            : "bg-white/40 border-white/50 text-neutral-600 dark:bg-white/[0.03] dark:border-white/[0.06] dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-white/20"
                    )}
                >
                    <ListFilter className="w-4 h-4 opacity-70" />
                    <span className="text-[13px] font-bold whitespace-nowrap">
                        {selectedProjects.length === 0 
                            ? "All Projects" 
                            : selectedProjects.length === 1 
                                ? selectedProjectsData[0]?.projectName 
                                : `${selectedProjects.length} Projects Selected`}
                    </span>
                    <ChevronDown className={clsx("w-4 h-4 transition-transform duration-300", isProjectDropdownOpen && "rotate-180")} />
                </button>

                <AnimatePresence>
                    {isProjectDropdownOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute left-0 mt-2 w-72 bg-white/80 dark:bg-neutral-900/90 backdrop-blur-2xl border border-white dark:border-neutral-800 rounded-3xl shadow-2xl p-4 z-[110] overflow-hidden"
                        >
                            <div className="flex items-center justify-between mb-3 px-1">
                                <h4 className="text-[11px] font-black text-neutral-400 uppercase tracking-widest">Filter Projects</h4>
                                {selectedProjects.length > 0 && (
                                    <button 
                                        onClick={onClearProjects}
                                        className="text-[11px] font-bold text-blue-600 hover:text-blue-700 transition-colors"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>

                            <div className="space-y-1 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                                {projects.length === 0 ? (
                                    <div className="py-8 text-center text-[13px] text-neutral-400 font-medium">
                                        No projects found
                                    </div>
                                ) : (
                                    projects.map(project => {
                                        const isSelected = selectedProjects.includes(project.id);
                                        return (
                                            <button
                                                key={project.id}
                                                onClick={() => onProjectToggle(project.id)}
                                                className={clsx(
                                                    "w-full flex items-center justify-between p-3 rounded-xl transition-all group",
                                                    isSelected 
                                                        ? "bg-blue-600 text-white shadow-md shadow-blue-200/50 dark:shadow-none" 
                                                        : "hover:bg-neutral-50 dark:hover:bg-white/5 text-neutral-700 dark:text-neutral-300"
                                                )}
                                            >
                                                <div className="text-left min-w-0 pr-2">
                                                    <div className={clsx("text-[13px] font-bold truncate", isSelected ? "text-white" : "text-neutral-900 dark:text-white")}>
                                                        {project.projectName}
                                                    </div>
                                                    <div className={clsx("text-[10px] font-medium uppercase tracking-wider", isSelected ? "text-blue-100" : "text-neutral-400")}>
                                                        {project.projectCode}
                                                    </div>
                                                </div>
                                                {isSelected && <Check className="w-4 h-4 shrink-0" />}
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
