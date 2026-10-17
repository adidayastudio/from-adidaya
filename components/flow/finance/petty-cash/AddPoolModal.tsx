"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Wallet } from "lucide-react";
import { Project } from "@/types/project";
import { FundingSource } from "@/lib/types/finance-types";

interface AddPoolModalProps {
    isOpen: boolean;
    onClose: () => void;
    projects: Project[];
    fundingSources: FundingSource[];
    isSubmitting: boolean;
    onSubmit: (projectId: string, limit: string) => void;
}

export const AddPoolModal: React.FC<AddPoolModalProps> = ({
    isOpen,
    onClose,
    projects,
    fundingSources,
    isSubmitting,
    onSubmit
}) => {
    const [newPoolProjectId, setNewPoolProjectId] = useState("");
    const [newPoolLimit, setNewPoolLimit] = useState("");

    const handleFormSubmit = () => {
        if (!newPoolProjectId || !newPoolLimit) return;
        onSubmit(newPoolProjectId, newPoolLimit);
        setNewPoolProjectId("");
        setNewPoolLimit("");
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-md" 
                    />
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="relative bg-white dark:bg-neutral-950 rounded-[40px] w-full max-w-lg shadow-2xl overflow-hidden border border-white/10"
                    >
                        <div className="p-10">
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <h3 className="text-2xl font-bold text-neutral-900 dark:text-white">New Petty Cash Pool</h3>
                                    <p className="text-neutral-500 text-sm mt-1">Allocate funds for a specific project.</p>
                                </div>
                                <button onClick={onClose} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors text-neutral-400">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Select Project</label>
                                    <select 
                                        value={newPoolProjectId}
                                        onChange={(e) => setNewPoolProjectId(e.target.value)}
                                        className="w-full h-14 bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-3xl px-5 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-500/20 transition-all appearance-none"
                                    >
                                        <option value="">Choose a project...</option>
                                        {projects
                                            .filter(p => !fundingSources.some(s => s.project_id === p.id))
                                            .map(p => (
                                                <option key={p.id} value={p.id}>[{p.projectCode}] {p.projectName}</option>
                                            ))
                                        }
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Initial Limit (Monthly)</label>
                                    <div className="relative">
                                        <input 
                                            type="text" 
                                            placeholder="Rp 5.000.000"
                                            value={newPoolLimit}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/\D/g, "");
                                                setNewPoolLimit(val ? parseInt(val).toLocaleString("id-ID") : "");
                                            }}
                                            className="w-full h-14 bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-3xl px-5 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                                        />
                                        <div className="absolute right-5 top-1/2 -translate-y-1/2 text-neutral-300">
                                            <Wallet size={18} />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4">
                                    <button 
                                        onClick={handleFormSubmit}
                                        disabled={isSubmitting || !newPoolProjectId || !newPoolLimit}
                                        className="w-full py-4 bg-blue-600 text-white rounded-[24px] font-bold shadow-xl shadow-blue-200 dark:shadow-blue-900/20 hover:bg-blue-700 disabled:opacity-50 disabled:grayscale transition-all flex items-center justify-center gap-2"
                                    >
                                        {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus size={20} />}
                                        Establish Petty Cash Pool
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
