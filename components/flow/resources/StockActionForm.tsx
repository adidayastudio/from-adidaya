"use client";

import React, { useState } from "react";
import { Plus, Minus, ArrowRightLeft, Check, AlertCircle } from "lucide-react";
import clsx from "clsx";
import { formatUnit } from "./ResourceCard";

interface StockActionFormProps {
    type: 'adjust' | 'transfer';
    project: string;
    onClose: () => void;
    availableProjects?: string[];
    unit: string;
}

export function StockActionForm({ type, project, onClose, availableProjects = [], unit }: StockActionFormProps) {
    const [amount, setAmount] = useState<number>(0);
    const [targetProject, setTargetProject] = useState<string>(availableProjects[0] || "");
    const [note, setNote] = useState("");

    const isTransfer = type === 'transfer';

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // In real app, call API here
        onClose();
    };

    return (
        <form onSubmit={handleSubmit} className="p-6 bg-white dark:bg-neutral-900 rounded-[32px] border border-neutral-100 dark:border-neutral-800 shadow-xl animate-in zoom-in-95 duration-200">
            <h4 className="text-[13px] font-bold text-neutral-400 capitalize tracking-tight mb-4 flex items-center gap-2">
                {isTransfer ? <ArrowRightLeft className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {isTransfer ? `Transfer from ${project}` : `Adjust stock for ${project}`}
            </h4>

            <div className="space-y-4">
                {isTransfer && (
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-neutral-400 ml-1">To Project</label>
                        <select
                            value={targetProject}
                            onChange={(e) => setTargetProject(e.target.value)}
                            className="w-full h-12 px-4 rounded-xl bg-neutral-50 dark:bg-neutral-800 border-none text-sm font-bold focus:ring-2 focus:ring-blue-500/20"
                        >
                            {availableProjects.filter(p => p !== project).map(p => (
                                <option key={p} value={p}>{p}</option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-neutral-400 ml-1">Quantity ({formatUnit(unit)})</label>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setAmount(prev => Math.max(0, prev - 1))}
                            className="w-12 h-12 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center hover:bg-rose-500/10 hover:text-rose-500 transition-colors"
                        >
                            <Minus className="w-5 h-5" />
                        </button>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(Number(e.target.value))}
                            className="flex-1 h-12 px-4 rounded-xl bg-neutral-50 dark:bg-neutral-800 border-none text-center text-lg font-black focus:ring-2 focus:ring-blue-500/20"
                        />
                        <button
                            type="button"
                            onClick={() => setAmount(prev => prev + 1)}
                            className="w-12 h-12 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center hover:bg-emerald-500/10 hover:text-emerald-500 transition-colors"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-neutral-400 ml-1">Note (Optional)</label>
                    <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="e.g. Broken tiles, transfer for Phase 2..."
                        className="w-full h-24 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800 border-none text-sm font-medium resize-none focus:ring-2 focus:ring-blue-500/20"
                    />
                </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
                <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 h-12 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-[11px] font-black uppercase tracking-widest"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="flex-1 h-12 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-[11px] font-bold capitalize tracking-tight shadow-lg shadow-black/5"
                >
                    Confirm
                </button>
            </div>
        </form>
    );
}
