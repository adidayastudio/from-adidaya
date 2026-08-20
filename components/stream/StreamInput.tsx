"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import clsx from "clsx";
import { Plus, ArrowUp, Sparkles, X } from "lucide-react";
import { motion } from "framer-motion";
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

export default function StreamInput({ onSend, isProcessing, disabled, placeholder }: StreamInputProps) {
    const [value, setValue] = useState("");
    const [activeQuickType, setActiveQuickType] = useState<StreamIntentType | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = "auto";
        el.style.height = Math.min(el.scrollHeight, 140) + "px";
    }, [value]);

    const handleSend = useCallback(() => {
        const trimmed = value.trim();
        if (!trimmed || isProcessing) return;
        onSend(trimmed, activeQuickType || undefined);
        setValue("");
        setActiveQuickType(null);
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

    return (
        <div className="w-full max-w-3xl mx-auto">
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
                    title="Add intent hint"
                    onClick={() => {
                        const types: StreamIntentType[] = ["create_project", "log_expense", "update_progress", "add_task"];
                        const nextIdx = activeQuickType ? (types.indexOf(activeQuickType) + 1) % types.length : 0;
                        setActiveQuickType(types[nextIdx]);
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
                    placeholder={placeholder || "Ketik proyek, pengeluaran, progress, atau tugas..."}
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
                    <span className="hidden sm:inline-block text-[12px] font-medium text-neutral-400 dark:text-neutral-500 px-2 py-1 rounded-lg bg-neutral-100/50 dark:bg-neutral-800/50">
                        Operational AI
                    </span>

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
