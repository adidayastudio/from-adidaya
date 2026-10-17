"use client";

import React from "react";
import { motion } from "framer-motion";
import { Building2, ChevronRight } from "lucide-react";
import clsx from "clsx";
import { FundingSource } from "@/lib/types/finance-types";

interface PettyCashPoolCardProps {
    pool: FundingSource & { projectName: string; projectCode: string };
    onCardClick: (id: string) => void;
    onTopUpClick: (e: React.MouseEvent, id: string) => void;
}

const formatCurrency = (amount: number) => {
    return "Rp" + amount.toLocaleString("id-ID");
};

export const PettyCashPoolCard: React.FC<PettyCashPoolCardProps> = ({ 
    pool, 
    onCardClick, 
    onTopUpClick 
}) => {
    const balance = pool.balance || 0;
    const limit = 10000000; // Default limit for display if not stored
    const percentage = Math.min((balance / limit) * 100, 100);
    const isLow = balance < 1000000;

    return (
        <motion.div
            layoutId={pool.id}
            onClick={() => onCardClick(pool.id)}
            className="group relative bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl rounded-[28px] border border-neutral-100 dark:border-neutral-800 p-5 hover:shadow-2xl hover:shadow-neutral-200 dark:hover:shadow-black/40 transition-all duration-300 cursor-pointer overflow-hidden"
        >
            {/* Glass Highlight */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/5 to-transparent rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
            
            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-11 h-11 rounded-2xl bg-neutral-50 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 group-hover:bg-blue-600 dark:group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                        <Building2 size={20} />
                    </div>
                    <div className="min-w-0">
                        <h4 className="text-[17px] font-bold text-neutral-900 dark:text-white truncate leading-tight">
                            {pool.projectName}
                        </h4>
                        <span className="text-[11px] font-bold text-blue-600 uppercase tracking-tighter opacity-80 decoration-neutral-100">
                            {pool.projectCode}
                        </span>
                    </div>
                </div>

                <div className="mb-6">
                    <div className="text-[26px] font-bold text-neutral-900 dark:text-white tracking-tight font-numeric leading-none">
                        {formatCurrency(balance)}
                    </div>
                    <div className="flex items-center gap-3 mt-4">
                        <div className="flex-1 h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${percentage}%` }}
                                className={clsx(
                                    "h-full rounded-full transition-colors duration-500",
                                    isLow ? "bg-amber-500" : "bg-emerald-500"
                                )}
                            />
                        </div>
                        <span className="text-[11px] font-bold text-neutral-400 tabular-nums">
                            {percentage.toFixed(0)}%
                        </span>
                    </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-neutral-100 dark:border-neutral-800">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">Active</span>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={(e) => onTopUpClick(e, pool.id)}
                            className="h-8 px-3 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[11px] font-bold hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
                        >
                            Top Up
                        </button>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-neutral-50 dark:bg-neutral-800 text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors">
                            <ChevronRight size={16} />
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
