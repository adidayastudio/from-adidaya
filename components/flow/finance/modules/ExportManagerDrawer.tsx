"use client";

import React from "react";
import { FileText, Download, Eye, FileSpreadsheet, Clock, X, ChevronRight, Inbox } from "lucide-react";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";

import { ReportOptions } from "./ReportGeneratorDrawer";

interface ExportManagerDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    reports: GeneratedReport[];
    onExport: (report: GeneratedReport, format: "pdf" | "excel") => void;
}

export interface GeneratedReport {
    id: string;
    name: string;
    type: "pdf" | "excel";
    timeframe: string;
    project: string;
    generatedAt: string;
    url: string;
    options?: ReportOptions;
}

export function ExportManagerDrawer({ isOpen, onClose, reports, onExport }: ExportManagerDrawerProps) {
    if (!isOpen) return null;

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
                    "bottom-2 left-2 right-2 top-20 sm:top-6 sm:bottom-6 sm:right-6 sm:left-auto sm:w-[500px]"
                )}
            >
                {/* HEADER */}
                <div className="flex-none px-8 pt-8 pb-4 sticky top-0 z-20 bg-transparent flex items-center justify-between">
                    <h2 className="text-[22px] font-bold text-neutral-900 dark:text-white tracking-tight">Export Manager</h2>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 bg-white/50 dark:bg-neutral-800/50 backdrop-blur-xl border border-black/5 dark:border-white/10 rounded-full flex items-center justify-center active:scale-95 transition-transform"
                    >
                        <X size={20} className="text-neutral-500 dark:text-neutral-400" strokeWidth={1.5} />
                    </button>
                </div>

                {/* SCROLLABLE CONTENT */}
                <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-4 space-y-4">
                    {/* INFO CARD */}
                    <div className="px-5 py-4 bg-blue-50/50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/20 rounded-[32px] flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-600/20">
                            <Download className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="text-[13px] font-bold text-neutral-900 dark:text-white leading-tight">Recent Archives</p>
                            <p className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wide mt-0.5">Ready for export or preview</p>
                        </div>
                    </div>

                    {/* REPORTS LIST */}
                    <div className="space-y-3 pb-8">
                        {reports.length === 0 ? (
                            <div className="py-24 text-center space-y-4">
                                <div className="w-20 h-20 bg-neutral-100 dark:bg-neutral-800 rounded-[32px] flex items-center justify-center mx-auto shadow-inner">
                                    <Inbox className="w-10 h-10 text-neutral-300" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-black text-neutral-400">Empty Archives</p>
                                    <p className="text-[11px] text-neutral-300 font-bold uppercase">No reports generated yet</p>
                                </div>
                            </div>
                        ) : (
                            <AnimatePresence mode="popLayout">
                                {reports.map((report) => (
                                    <motion.div 
                                        layout
                                        key={report.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="group relative bg-white/40 dark:bg-neutral-800/40 backdrop-blur-sm border border-neutral-100 dark:border-neutral-700/30 rounded-[32px] p-5 hover:bg-white dark:hover:bg-neutral-800 transition-all shadow-sm"
                                    >
                                        <div className="flex items-start gap-4 mb-4">
                                            <div className={clsx(
                                                "w-12 h-12 rounded-[20px] flex items-center justify-center shrink-0 shadow-sm border border-neutral-100 dark:border-neutral-700",
                                                report.type === "excel" 
                                                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10" 
                                                    : "bg-red-50 text-red-600 dark:bg-red-500/10"
                                            )}>
                                                {report.type === "excel" ? <FileSpreadsheet className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                                            </div>
                                            <div className="flex-1 min-w-0 pt-0.5">
                                                <h4 className="font-bold text-neutral-900 dark:text-white text-[15px] leading-tight truncate">{report.name}</h4>
                                                <div className="flex items-center gap-2 mt-2 overflow-x-auto no-scrollbar">
                                                    <span className="flex items-center gap-1 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider whitespace-nowrap">
                                                        <Clock className="w-3 h-3" /> {report.generatedAt}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 mt-4 ml-4">
                                            <button
                                                onClick={() => onExport(report, "excel")}
                                                className="px-6 h-10 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-full text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white transition-all active:scale-95 shadow-sm"
                                            >
                                                XLSX
                                            </button>
                                            <button
                                                onClick={() => onExport(report, "pdf")}
                                                className="px-6 h-10 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-full text-[11px] font-bold text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white transition-all active:scale-95 shadow-sm"
                                            >
                                                PDF
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
