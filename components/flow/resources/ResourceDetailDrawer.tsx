"use client";

import React, { useState, useEffect } from "react";
import { X, Plus, ArrowRightLeft, Camera, ChevronRight } from "lucide-react";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import { generateResourceCode, formatUnit, smartCapitalize } from "./ResourceCard";
import { StockActionForm } from "./StockActionForm";

interface ResourceDetailDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    resource: any;
    projectStock: { project: string, quantity: number, unit: string, photo?: string }[];
}

export function ResourceDetailDrawer({ isOpen, onClose, resource, projectStock }: ResourceDetailDrawerProps) {
    const [actionState, setActionState] = useState<{ type: 'adjust' | 'transfer', project: string } | null>(null);
    const [expandedProject, setExpandedProject] = useState<string | null>(null);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsMounted(true);
            document.body.style.overflow = "hidden";
        } else {
            const timer = setTimeout(() => setIsMounted(false), 500);
            document.body.style.overflow = "";
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!isMounted && !isOpen) return null;
    if (!resource) return null;

    const code = generateResourceCode(resource);
    const totalQuantity = projectStock?.reduce((acc, curr) => acc + curr.quantity, 0) || 0;
    const availableProjects = ["JPF", "PRG", "AD-038", "STUDIO", "OFFICE"];

    return (
        <div className={clsx("fixed inset-0 z-[100] isolate", isOpen ? "pointer-events-auto" : "pointer-events-none")}>
            {/* iOS Backdrop */}
            <div
                className={clsx(
                    "absolute inset-0 bg-neutral-900/30 backdrop-blur-sm transition-opacity duration-500 ease-in-out",
                    isOpen ? "opacity-100" : "opacity-0"
                )}
                onClick={onClose}
            />

            {/* iOS Drawer Panel: Scaled Down & Refined */}
            <div
                className={clsx(
                    "absolute z-50 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-2xl border border-white/60 dark:border-neutral-800 shadow-2xl transition-all duration-500 ease-out flex flex-col overflow-hidden",
                    "bottom-2 left-2 right-2 top-20 sm:top-6 sm:bottom-6 sm:right-6 sm:left-auto sm:w-[500px] rounded-[56px]",
                    isOpen ? "translate-y-0 sm:translate-x-0 opacity-100 scale-100" : "translate-y-full sm:translate-y-0 sm:translate-x-full opacity-0 sm:scale-[0.98]"
                )}
            >

                {/* Header: Primary is the Code (No Badge) */}
                <div className="px-8 pb-4 pt-10 shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                            <h2 className="text-[22px] font-bold text-neutral-900 dark:text-white tracking-tight">
                                {code}
                            </h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 bg-white/50 dark:bg-neutral-800/50 backdrop-blur-xl border border-black/5 dark:border-white/10 rounded-full flex items-center justify-center active:scale-95 transition-transform"
                        >
                            <X size={20} className="text-neutral-400 dark:text-neutral-500" strokeWidth={1.5} />
                        </button>
                    </div>
                </div>

                {/* Content: Compact & Premium */}
                <div className="flex-1 overflow-y-auto px-8 py-4 space-y-8 pb-40 scrollbar-hide">
                    {/* Detail Info Section (Finance Style) */}
                    <div className="space-y-6">
                        <div>
                            <div className="text-[11px] font-semibold text-neutral-500 mb-1.5 uppercase tracking-wider">Item Name</div>
                            <h2 className="text-[20px] font-bold text-neutral-900 dark:text-white tracking-tight leading-tight">
                                {smartCapitalize(resource.name)}
                            </h2>
                        </div>

                        <div className="grid grid-cols-2 gap-y-6 gap-x-8">
                            <div>
                                <div className="text-[11px] font-semibold text-neutral-500 mb-1.5 uppercase tracking-wider">Category</div>
                                <p className="text-[15px] font-bold text-neutral-800 dark:text-neutral-200 capitalize">
                                    {resource.category || 'Material'}
                                </p>
                            </div>
                            <div>
                                <div className="text-[11px] font-semibold text-neutral-500 mb-1.5 uppercase tracking-wider">Sub-Category</div>
                                <p className="text-[15px] font-bold text-neutral-800 dark:text-neutral-200">
                                    {resource.subcategory || '-'}
                                </p>
                            </div>
                            <div>
                                <div className="text-[11px] font-semibold text-neutral-500 mb-1.5 uppercase tracking-wider">Grouping</div>
                                <p className="text-[15px] font-bold text-neutral-800 dark:text-neutral-200">
                                    {resource.group_name || '-'}
                                </p>
                            </div>
                            <div>
                                <div className="text-[11px] font-semibold text-neutral-500 mb-1.5 uppercase tracking-wider">Unit of Measure</div>
                                <p className="text-[15px] font-bold text-neutral-800 dark:text-neutral-200">
                                    {formatUnit(resource.unit)}
                                </p>
                            </div>
                            <div>
                                <div className="text-[11px] font-semibold text-neutral-500 mb-1.5 uppercase tracking-wider">Active Projects</div>
                                <p className="text-[15px] font-bold text-neutral-800 dark:text-neutral-200">
                                    {projectStock.length} Projects
                                </p>
                            </div>
                            <div>
                                <div className="text-[11px] font-semibold text-neutral-500 mb-1.5 uppercase tracking-wider">Overall Status</div>
                                <div className="flex items-center gap-2 mt-1">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                                    <span className="text-[14px] font-bold text-emerald-600 dark:text-emerald-400">Available</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-black/[0.03] dark:bg-white/[0.03]" />

                    {/* Summary Cards: Slimmer & Balanced */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-6 rounded-[32px] bg-white/40 dark:bg-neutral-900/40 border border-white/60 dark:border-neutral-800 shadow-sm backdrop-blur-3xl">
                            <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2 opacity-60">Total Aggregate</p>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-3xl font-bold text-neutral-900 dark:text-white tracking-tight">{totalQuantity.toLocaleString()}</span>
                                <span className="text-xs font-bold text-neutral-400">{formatUnit(resource.unit)}</span>
                            </div>
                        </div>
                        <div className="p-6 rounded-[32px] bg-white/40 dark:bg-neutral-900/40 border border-white/60 dark:border-neutral-800 shadow-sm backdrop-blur-3xl">
                            <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2 opacity-60">Main Project</p>
                            <div className="flex flex-col mt-1">
                                <span className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight">{projectStock[0]?.project || '-'}</span>
                                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest opacity-60">High Priority</span>
                            </div>
                        </div>
                    </div>

                    {actionState && (
                        <div className="sticky top-0 z-20 animate-in slide-in-from-top-4 duration-300">
                            <StockActionForm
                                type={actionState.type}
                                project={actionState.project}
                                onClose={() => setActionState(null)}
                                availableProjects={availableProjects}
                                unit={resource.unit}
                            />
                        </div>
                    )}

                    {/* Project List: Compact Rows */}
                    <div>
                        <div className="flex items-center justify-between mb-4 px-2">
                            <h3 className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-[0.2em]">Project Breakdown</h3>
                            <button className="px-5 py-2 rounded-full bg-blue-600 text-white text-[12px] font-bold hover:scale-105 transition-transform active:scale-95 shadow-lg shadow-blue-500/20">
                                <Plus className="w-4 h-4 mr-2 inline-block -mt-0.5" />
                                Add project
                            </button>
                        </div>
                        <div className="space-y-3">
                            {projectStock.map((ps, idx) => {
                                const isExpanded = expandedProject === ps.project;
                                return (
                                    <div
                                        key={idx}
                                        className={clsx(
                                            "group bg-white/40 dark:bg-neutral-900/20 border transition-all duration-300 rounded-[32px] overflow-hidden",
                                            isExpanded ? "border-blue-500/40 bg-white/60 dark:bg-neutral-800/60 shadow-lg shadow-blue-500/5 scale-[1.01]" : "border-white/60 dark:border-neutral-800 hover:bg-white/60 dark:hover:bg-neutral-800/40"
                                        )}
                                    >
                                        <button
                                            onClick={() => setExpandedProject(isExpanded ? null : ps.project)}
                                            className="w-full p-5 flex items-center justify-between text-left transition-colors"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-[20px] bg-white dark:bg-neutral-800 flex items-center justify-center overflow-hidden border border-black/5 dark:border-white/10 shadow-sm">
                                                    {ps.photo ? (
                                                        <img src={ps.photo} alt={ps.project} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Camera className="w-5 h-5 text-neutral-300" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-[16px] font-bold text-neutral-900 dark:text-white tracking-tight leading-none mb-1.5">{ps.project}</p>
                                                    <p className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">Modified 2d ago</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="text-right">
                                                    <div className="text-[20px] font-bold text-neutral-900 dark:text-white leading-none tracking-tight">
                                                        {ps.quantity} <span className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500 ml-0.5 tracking-normal">{formatUnit(ps.unit)}</span>
                                                    </div>
                                                </div>
                                                <ChevronRight className={clsx("w-5 h-5 text-neutral-300 transition-transform duration-300", isExpanded && "rotate-90")} />
                                            </div>
                                        </button>

                                        <AnimatePresence>
                                            {isExpanded && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: "auto", opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.3, ease: "easeInOut" }}
                                                >
                                                    <div className="px-5 pb-5 pt-1 border-t border-black/5 dark:border-white/5 grid grid-cols-3 gap-2">
                                                        <button
                                                            onClick={() => setActionState({ type: 'adjust', project: ps.project })}
                                                            className="py-3 rounded-2xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 text-[12px] font-bold hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center"
                                                        >
                                                            Adjust
                                                        </button>
                                                        <button
                                                            onClick={() => setActionState({ type: 'transfer', project: ps.project })}
                                                            className="py-3 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white text-[12px] font-bold hover:bg-neutral-50 dark:hover:bg-neutral-800 active:scale-[0.98] transition-all flex items-center justify-center"
                                                        >
                                                            Transfer
                                                        </button>
                                                        <button
                                                            className="py-3 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30 text-[12px] font-bold hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center"
                                                        >
                                                            History
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Photos: Unified Spacing */}
                    <div className="px-1">
                        <h3 className="text-[11px] font-bold text-neutral-400 uppercase tracking-[0.2em] mb-4">Photos</h3>
                        <div className="grid grid-cols-4 gap-3">
                            <button className="aspect-square rounded-[24px] border-1.5 border-dashed border-neutral-200 dark:border-neutral-800 flex flex-col items-center justify-center gap-2 text-neutral-400 hover:text-blue-600 hover:border-blue-500/40 hover:bg-blue-500/5 transition-all">
                                <Plus className="w-5 h-5" />
                            </button>
                            {projectStock.filter(ps => ps.photo).map((ps, i) => (
                                <div key={i} className="aspect-square rounded-[24px] bg-neutral-100 dark:bg-neutral-800 overflow-hidden relative group/img shadow-sm">
                                    <img src={ps.photo} alt="Material Evidence" className="w-full h-full object-cover" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* iOS Tabbar Actions */}
                <div className="absolute bottom-0 left-0 right-0 p-8 pb-10 bg-white/40 dark:bg-neutral-950/40 backdrop-blur-3xl border-t border-white/60 dark:border-white/10 shrink-0 z-30">
                    <div className="flex items-center gap-3">
                        <button className="flex-1 h-14 rounded-full bg-blue-600 text-white font-bold text-[15px] flex items-center justify-center gap-2.5 shadow-xl shadow-blue-500/20 hover:opacity-90 active:scale-95 transition-all">
                            <Plus className="w-5 h-5" /> Batch order
                        </button>
                        <button className="flex-1 h-14 rounded-full bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 text-neutral-900 dark:text-white font-bold text-[15px] flex items-center justify-center gap-2.5 shadow-xl shadow-black/5 hover:bg-neutral-50 dark:hover:bg-neutral-800 active:scale-95 transition-all">
                            <ArrowRightLeft className="w-5 h-5" /> Bulk transfer
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
