"use client";

import React, { useState } from "react";
import { CATEGORY_OPTIONS, REIMBURSE_CATEGORY_OPTIONS } from "./constants";
import { Check, X, Briefcase, Clock, Filter, FileSpreadsheet, PieChart } from "lucide-react";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";

interface ReportGeneratorDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    projects: { id: string; code: string; name: string }[];
    onGenerate: (options: ReportOptions) => void;
}

export interface ReportOptions {
    timeframe: "WEEK" | "MONTH" | "3M" | "1Y" | "ALL" | "CUSTOM";
    customStart?: string;
    customEnd?: string;
    projectIds: string[];
    categories: string[];
}

export function ReportGeneratorDrawer({ isOpen, onClose, projects, onGenerate }: ReportGeneratorDrawerProps) {
    const [timeframe, setTimeframe] = useState<ReportOptions["timeframe"]>("MONTH");
    const [customStart, setCustomStart] = useState("");
    const [customEnd, setCustomEnd] = useState("");
    const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>(["ALL"]);
    const [selectedCategories, setSelectedCategories] = useState<string[]>(["ALL"]);

    if (!isOpen) return null;

    const handleToggleProject = (id: string) => {
        if (id === "ALL") {
            setSelectedProjectIds(["ALL"]);
            return;
        }
        setSelectedProjectIds(prev => {
            const filtered = prev.filter(p => p !== "ALL");
            if (filtered.includes(id)) {
                const next = filtered.filter(p => p !== id);
                return next.length === 0 ? ["ALL"] : next;
            }
            return [...filtered, id];
        });
    };

    const handleToggleCategory = (val: string) => {
        if (val === "ALL") {
            setSelectedCategories(["ALL"]);
            return;
        }
        setSelectedCategories(prev => {
            const filtered = prev.filter(c => c !== "ALL");
            if (filtered.includes(val)) {
                const next = filtered.filter(c => c !== val);
                return next.length === 0 ? ["ALL"] : next;
            }
            return [...filtered, val];
        });
    };

    const handleSubmit = () => {
        onGenerate({
            timeframe,
            customStart,
            customEnd,
            projectIds: selectedProjectIds,
            categories: selectedCategories
        });
        onClose();
    };

    const allCategories = [...CATEGORY_OPTIONS, ...REIMBURSE_CATEGORY_OPTIONS].reduce((acc, curr) => {
        if (!acc.find(a => a.value === curr.value)) acc.push(curr);
        return acc;
    }, [] as typeof CATEGORY_OPTIONS);

    return (
        <div className="fixed inset-0 z-[150] isolate">
            {/* BACKDROP */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-neutral-900/20 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* DRAWER CONTAINER */}
            <motion.div
                initial={{ y: "100%", opacity: 0, scale: 1 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: "100%", opacity: 0, scale: 1 }}
                transition={{ type: "spring", damping: 30, stiffness: 300, mass: 0.8 }}
                className={clsx(
                    "absolute z-50 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-3xl border border-white/60 dark:border-neutral-800 shadow-2xl rounded-[56px] overflow-hidden flex flex-col",
                    "bottom-2 left-2 right-2 top-20 sm:top-6 sm:bottom-6 sm:right-6 sm:left-auto sm:w-[520px]"
                )}
            >
                {/* STICKY HEADER */}
                <div className="flex-none px-8 pt-8 pb-4 sticky top-0 z-20 bg-transparent flex items-center justify-between">
                    <h2 className="text-[22px] font-bold text-neutral-900 dark:text-white tracking-tight">Generate Report</h2>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 bg-white/50 dark:bg-neutral-800/50 backdrop-blur-xl border border-black/5 dark:border-white/10 rounded-full flex items-center justify-center active:scale-95 transition-transform"
                    >
                        <X size={20} className="text-neutral-500 dark:text-neutral-400" strokeWidth={1.5} />
                    </button>
                </div>

                {/* SCROLLABLE CONTENT */}
                <div className="flex-1 overflow-y-auto no-scrollbar scroll-smooth">
                    <div className="px-8 pb-32 space-y-8">
                        {/* SECTION: TIMEFRAME */}
                        <section className="space-y-4 pt-4">
                            <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                                <Clock className="w-4 h-4 text-neutral-500" strokeWidth={2} /> Report Period
                            </h3>

                            <div className="grid grid-cols-3 gap-2">
                                {(["WEEK", "MONTH", "3M", "1Y", "ALL", "CUSTOM"] as const).map(tf => (
                                    <button
                                        key={tf}
                                        type="button"
                                        onClick={() => setTimeframe(tf)}
                                        className={clsx(
                                            "py-2.5 rounded-full text-[11px] font-bold ring-1 transition-all uppercase tracking-wider",
                                            timeframe === tf
                                                ? "bg-blue-600 text-white ring-blue-600 shadow-md shadow-blue-600/20"
                                                : "bg-white dark:bg-neutral-800 text-neutral-400 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 shadow-sm"
                                        )}
                                    >
                                        {tf}
                                    </button>
                                ))}
                            </div>

                            <AnimatePresence>
                                {timeframe === "CUSTOM" && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden space-y-4 pt-2"
                                    >
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider px-1 mb-1.5 ml-1">Start Date</label>
                                                <input
                                                    type="date"
                                                    value={customStart}
                                                    onChange={e => setCustomStart(e.target.value)}
                                                    className="w-full h-11 px-5 text-sm border border-neutral-200 dark:border-neutral-700 rounded-full bg-white dark:bg-neutral-800 dark:text-white focus:outline-none focus:ring-4 focus:ring-blue-500/[0.08] focus:border-blue-500/20 transition-all font-medium"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider px-1 mb-1.5 ml-1">End Date</label>
                                                <input
                                                    type="date"
                                                    value={customEnd}
                                                    onChange={e => setCustomEnd(e.target.value)}
                                                    className="w-full h-11 px-5 text-sm border border-neutral-200 dark:border-neutral-700 rounded-full bg-white dark:bg-neutral-800 dark:text-white focus:outline-none focus:ring-4 focus:ring-blue-500/[0.08] focus:border-blue-500/20 transition-all font-medium"
                                                />
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </section>

                        {/* SECTION: PROJECTS */}
                        <section className="space-y-4 pt-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                                    <Briefcase className="w-4 h-4 text-neutral-500" strokeWidth={2} /> Projects Scope
                                </h3>
                                <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider italic">
                                    {selectedProjectIds.includes("ALL") ? "All Resources" : `${selectedProjectIds.length} Selected`}
                                </span>
                            </div>

                            <div className="space-y-3">
                                <div
                                    onClick={() => handleToggleProject("ALL")}
                                    className={clsx(
                                        "relative p-4 rounded-3xl border transition-all cursor-pointer flex items-center gap-4",
                                        selectedProjectIds.includes("ALL") ? "border-blue-500 bg-blue-50/50 dark:bg-blue-500/10 shadow-sm" : "border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-800/40 hover:border-neutral-200 shadow-sm"
                                    )}
                                >
                                    <div className={clsx(
                                        "w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0",
                                        selectedProjectIds.includes("ALL") ? "border-blue-600 bg-blue-600" : "border-neutral-300 dark:border-neutral-600"
                                    )}>
                                        <Filter className={clsx("w-5 h-5", selectedProjectIds.includes("ALL") ? "text-white" : "text-neutral-400")} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-sm font-bold text-neutral-900 dark:text-white">All Projects</div>
                                        <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 font-medium leading-relaxed uppercase tracking-wider">Include everything</div>
                                    </div>
                                    {selectedProjectIds.includes("ALL") && <Check size={18} className="text-blue-600" strokeWidth={3} />}
                                </div>

                                <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto no-scrollbar pr-2 pt-1 border-t border-neutral-100 dark:border-neutral-800">
                                    {projects.map(p => {
                                        const isSelected = selectedProjectIds.includes(p.id) || selectedProjectIds.includes("ALL");
                                        return (
                                            <div
                                                key={p.id}
                                                onClick={() => handleToggleProject(p.id)}
                                                className={clsx(
                                                    "px-5 py-3.5 rounded-2xl border transition-all flex items-center gap-4 cursor-pointer",
                                                    isSelected && !selectedProjectIds.includes("ALL") ? "border-blue-200 bg-blue-50/50 dark:bg-blue-500/10 shadow-sm" : "border-neutral-50 dark:border-neutral-800/50 hover:border-neutral-100 bg-neutral-50/50 dark:bg-neutral-900/40 opacity-60"
                                                )}
                                            >
                                                <div className="px-1.5 py-0.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/50 shadow-sm shrink-0">
                                                    <span className="text-[9px] font-bold text-neutral-500 uppercase">{p.code}</span>
                                                </div>
                                                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300 flex-1 truncate">{p.name}</span>
                                                {isSelected && !selectedProjectIds.includes("ALL") && <Check size={16} className="text-blue-600" strokeWidth={3} />}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </section>

                        {/* SECTION: CATEGORIES */}
                        <section className="space-y-4 pt-4">
                            <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                                <PieChart className="w-4 h-4 text-neutral-500" strokeWidth={2} /> Included Categories
                            </h3>
                            
                            <div className="space-y-4">
                                <div
                                    onClick={() => handleToggleCategory("ALL")}
                                    className={clsx(
                                        "relative p-4 rounded-3xl border transition-all cursor-pointer flex items-center gap-4",
                                        selectedCategories.includes("ALL") ? "border-orange-500 bg-orange-50/50 dark:bg-orange-500/10 shadow-sm" : "border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-800/40 hover:border-neutral-200 shadow-sm"
                                    )}
                                >
                                    <div className={clsx(
                                        "w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0",
                                        selectedCategories.includes("ALL") ? "border-orange-600 bg-orange-600" : "border-neutral-300 dark:border-neutral-600"
                                    )}>
                                        <PieChart className={clsx("w-5 h-5", selectedCategories.includes("ALL") ? "text-white" : "text-neutral-400")} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-sm font-bold text-neutral-900 dark:text-white">All Categories</div>
                                        <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 font-medium leading-relaxed uppercase tracking-wider">Include all items</div>
                                    </div>
                                    {selectedCategories.includes("ALL") && <Check size={18} className="text-orange-600" strokeWidth={3} />}
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    {allCategories.map(cat => {
                                        const isSelected = selectedCategories.includes(cat.value) && !selectedCategories.includes("ALL");
                                        return (
                                            <button
                                                key={cat.value}
                                                type="button"
                                                onClick={() => handleToggleCategory(cat.value)}
                                                className={clsx(
                                                    "flex items-center justify-between px-4 py-3 rounded-2xl border transition-all text-left",
                                                    isSelected 
                                                        ? "bg-orange-50/50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/30 shadow-sm" 
                                                        : "bg-neutral-50/50 dark:bg-neutral-800/20 border-neutral-100 dark:border-neutral-700/20 hover:border-neutral-200 opacity-60"
                                                )}
                                            >
                                                <p className={clsx("text-[11px] font-bold leading-tight uppercase tracking-tight", isSelected ? "text-orange-600 dark:text-orange-400" : "text-neutral-500 dark:text-neutral-400")}>{cat.label}</p>
                                                {isSelected && <Check className="w-3.5 h-3.5 text-orange-600" strokeWidth={3} />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </section>
                    </div>
                </div>

                {/* BOTTOM ACTIONS - Absolute/Floating for true transparency */}
                <div className="absolute bottom-0 left-0 right-0 w-full px-8 py-6 z-30 bg-transparent">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 h-12 rounded-full border border-neutral-200 dark:border-neutral-700 bg-white/50 dark:bg-neutral-800/50 backdrop-blur-xl text-sm font-bold text-neutral-500 hover:bg-neutral-50 transition-all active:scale-95"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            className="flex-[2] h-12 rounded-full bg-blue-600 text-sm font-bold text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            <FileSpreadsheet className="w-5 h-5" />
                            Generate Report
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
