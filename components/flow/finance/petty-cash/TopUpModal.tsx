"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import { FundingSource } from "@/lib/types/finance-types";

interface TopUpModalProps {
    pool: FundingSource | null;
    onClose: () => void;
    isSubmitting: boolean;
    onSubmit: (amount: string, description: string) => void;
}

export const TopUpModal: React.FC<TopUpModalProps> = ({
    pool,
    onClose,
    isSubmitting,
    onSubmit
}) => {
    const [topUpAmount, setTopUpAmount] = useState("");
    const [topUpDescription, setTopUpDescription] = useState("Weekly Top Up");

    // Reset state when pool changes or closes
    useEffect(() => {
        if (!pool) {
            setTopUpAmount("");
            setTopUpDescription("Weekly Top Up");
        }
    }, [pool]);

    const handleFormSubmit = () => {
        if (!topUpAmount) return;
        onSubmit(topUpAmount, topUpDescription);
    };

    return (
        <AnimatePresence>
            {pool && (
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
                        className="relative bg-white dark:bg-neutral-950 rounded-[40px] w-full max-w-sm shadow-2xl overflow-hidden border border-white/10"
                    >
                        <div className="p-8">
                            <div className="text-center mb-10">
                                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Plus size={32} />
                                </div>
                                <h3 className="text-xl font-bold text-neutral-900 dark:text-white">Top Up Balance</h3>
                                <p className="text-sm text-neutral-500 mt-1">Funding for <strong>{pool.name}</strong></p>
                            </div>

                            <div className="space-y-6">
                                <div className="text-center">
                                     <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2">Amount to Add</p>
                                     <input 
                                        autoFocus
                                        type="text" 
                                        placeholder="Rp 0"
                                        value={topUpAmount}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, "");
                                            setTopUpAmount(val ? parseInt(val).toLocaleString("id-ID") : "");
                                        }}
                                        className="w-full text-center text-3xl font-bold bg-transparent border-none outline-none text-neutral-900 dark:text-white placeholder:text-neutral-200"
                                     />
                                     <div className="w-1/2 h-1 bg-neutral-100 dark:bg-neutral-800 mx-auto mt-2 rounded-full" />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Reference/Description</label>
                                    <input 
                                        type="text" 
                                        value={topUpDescription}
                                        onChange={(e) => setTopUpDescription(e.target.value)}
                                        className="w-full h-12 bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-2xl px-4 text-sm font-medium outline-none"
                                    />
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button 
                                        onClick={onClose}
                                        className="flex-1 py-4 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-2xl font-bold hover:bg-neutral-200 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        disabled={isSubmitting || !topUpAmount}
                                        onClick={handleFormSubmit}
                                        className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 dark:shadow-blue-900/20 hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                                    >
                                        {isSubmitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Confirm"}
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
