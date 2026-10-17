"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import clsx from "clsx";
import { Plus, ArrowUp, Sparkles, X, CheckSquare, CreditCard, FileText, Upload, FolderKanban } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { StreamIntentType } from "@/lib/stream/types";

interface StreamInputProps {
    onSend: (message: string, quickType?: StreamIntentType) => void;
    isProcessing?: boolean;
    disabled?: boolean;
    placeholder?: string;
}

const QUICK_ACTIONS: { type: StreamIntentType; label: string; emoji: string }[] = [
    { type: "create_project", label: "Project", emoji: "📋" },
    { type: "log_expense", label: "Expense", emoji: "💰" },
    { type: "update_progress", label: "Progress", emoji: "📊" },
    { type: "add_task", label: "Task", emoji: "✅" },
];

const SLASH_COMMANDS = [
    { cmd: "/task", label: "Bikin task baru (Title, Assignee, Deadline)", icon: <CheckSquare className="w-4 h-4 text-emerald-500" /> },
    { cmd: "/finance", label: "Catat pengeluaran & nota", icon: <CreditCard className="w-4 h-4 text-amber-500" /> },
    { cmd: "/report", label: "Laporan harian / progress DCR", icon: <FileText className="w-4 h-4 text-blue-500" /> },
    { cmd: "/upload", label: "Upload dokumen / 3D Model SKP", icon: <Upload className="w-4 h-4 text-purple-500" /> },
    { cmd: "/project", label: "Bikin proyek baru", icon: <FolderKanban className="w-4 h-4 text-sky-500" /> },
];

export default function StreamInput({ onSend, isProcessing, disabled, placeholder }: StreamInputProps) {
    const [value, setValue] = useState("");
    const [activeQuickType, setActiveQuickType] = useState<StreamIntentType | null>(null);
    const [showSlashMenu, setShowSlashMenu] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = "auto";
        el.style.height = Math.min(el.scrollHeight, 140) + "px";

        // Show slash menu if input starts with '/'
        if (value.startsWith("/")) {
            setShowSlashMenu(true);
        } else {
            setShowSlashMenu(false);
        }
    }, [value]);

    const handleSend = useCallback(() => {
        const trimmed = value.trim();
        if (!trimmed || isProcessing) return;

        // Auto map slash command
        let typeOverride = activeQuickType;
        if (trimmed.startsWith("/task")) typeOverride = "add_task";
        else if (trimmed.startsWith("/finance")) typeOverride = "log_expense";
        else if (trimmed.startsWith("/project")) typeOverride = "create_project";
        else if (trimmed.startsWith("/report")) typeOverride = "update_progress";

        onSend(trimmed, typeOverride || undefined);
        setValue("");
        setActiveQuickType(null);
        setShowSlashMenu(false);
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
        }
    }, [value, activeQuickType, isProcessing, onSend]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleSelectSlash = (cmd: string) => {
        setValue(`${cmd} `);
        setShowSlashMenu(false);
        textareaRef.current?.focus();
    };

    const filteredSlashCommands = SLASH_COMMANDS.filter(s =>
        s.cmd.toLowerCase().includes(value.toLowerCase()) || value === "/"
    );

    return (
        <div className="w-full max-w-3xl mx-auto relative">
            {/* Slash Command Autocomplete Popover */}
            <AnimatePresence>
                {showSlashMenu && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className="absolute bottom-full mb-2 left-0 right-0 p-2 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-2xl border border-neutral-200/80 dark:border-neutral-800/80 rounded-2xl shadow-xl z-50 space-y-1 max-h-56 overflow-y-auto scrollbar-hide"
                    >
                        <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 px-2.5 py-1">
                            Shortcut Commands
                        </div>
                        {filteredSlashCommands.map((s) => (
                            <button
                                key={s.cmd}
                                onClick={() => handleSelectSlash(s.cmd)}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left hover:bg-neutral-100/60 dark:hover:bg-neutral-800/60 transition-colors"
                            >
                                <div className="p-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 shrink-0">
                                    {s.icon}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="text-[13px] font-bold text-neutral-900 dark:text-white font-mono">
                                        {s.cmd}
                                    </div>
                                    <div className="text-[11px] text-neutral-500 truncate">
                                        {s.label}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            <div className={clsx(
                "relative flex items-end gap-2 p-2.5 rounded-[28px] transition-all duration-200",
                "bg-transparent backdrop-blur-xl",
                "border border-neutral-300/60 dark:border-neutral-700/60",
                "focus-within:border-neutral-400 dark:focus-within:border-neutral-500",
                "shadow-sm"
            )}>
                {/* Left '+' Action Button */}
                <button
                    type="button"
                    className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50 transition-colors mb-0.5"
                    title="Shortcuts & Commands"
                    onClick={() => {
                        setValue("/");
                        setShowSlashMenu(true);
                    }}
                >
                    <Plus className="w-5 h-5" />
                </button>

                {activeQuickType && (
                    <button
                        onClick={() => setActiveQuickType(null)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-300 text-[11px] font-semibold shrink-0 mb-1 active:scale-95 transition-transform"
                    >
                        <span>{QUICK_ACTIONS.find(a => a.type === activeQuickType)?.emoji}</span>
                        <span>{QUICK_ACTIONS.find(a => a.type === activeQuickType)?.label}</span>
                        <X className="w-3.5 h-3.5 ml-0.5 text-blue-500" />
                    </button>
                )}

                <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder || "Work on anything..."}
                    disabled={disabled || isProcessing}
                    rows={1}
                    className={clsx(
                        "flex-1 bg-transparent border-none outline-none resize-none",
                        "text-[15px] leading-[1.5] text-neutral-900 dark:text-white",
                        "placeholder:text-neutral-400 dark:placeholder:text-neutral-500",
                        "px-1 py-1.5 min-h-[38px] max-h-[140px]",
                        "scrollbar-hide"
                    )}
                />

                <div className="flex items-center gap-2 shrink-0 mb-0.5">
                    <button
                        onClick={handleSend}
                        disabled={!value.trim() || isProcessing}
                        className={clsx(
                            "w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200",
                            value.trim() && !isProcessing
                                ? "bg-blue-600 text-white shadow-md hover:bg-blue-700 active:scale-90"
                                : "bg-neutral-200/40 dark:bg-neutral-800/40 text-neutral-400 dark:text-neutral-500 cursor-not-allowed"
                        )}
                    >
                        {isProcessing ? (
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                            >
                                <Sparkles className="w-4 h-4 text-white" />
                            </motion.div>
                        ) : (
                            <ArrowUp className="w-5 h-5 stroke-[2.5]" />
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
