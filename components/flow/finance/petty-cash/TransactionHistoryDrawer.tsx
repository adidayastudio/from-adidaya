"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { format } from "date-fns";
import clsx from "clsx";
import { FundingSource, FundingSourceTransaction } from "@/lib/types/finance-types";

interface TransactionHistoryDrawerProps {
    pool: FundingSource | null;
    isOpen: boolean;
    onClose: () => void;
    transactions: FundingSourceTransaction[];
    isLoading: boolean;
    onTopUpClick: () => void;
}

const formatCurrency = (amount: number) => {
    return "Rp" + amount.toLocaleString("id-ID");
};

export const TransactionHistoryDrawer: React.FC<TransactionHistoryDrawerProps> = ({
    pool,
    isOpen,
    onClose,
    transactions,
    isLoading,
    onTopUpClick
}) => {
    return (
        <AnimatePresence>
            {isOpen && pool && (
                <div className="fixed inset-0 z-[100] isolate flex justify-end">
                    {/* BACKDROP */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-neutral-900/20 backdrop-blur-sm" 
                    />
                    
                    {/* Drawer Content */}
                    <motion.div
                        initial={{ x: "100%", opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: "100%", opacity: 0 }}
                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                        className={clsx(
                            "absolute z-50 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-2xl border border-white/60 dark:border-neutral-800 shadow-2xl transition-all duration-500 rounded-[56px] overflow-hidden flex flex-col",
                            "bottom-2 left-2 right-2 top-20 sm:top-6 sm:bottom-6 sm:right-6 sm:left-auto sm:w-[500px]"
                        )}
                    >
                        {/* Header */}
                        <div className="flex-none px-8 pt-8 pb-4 sticky top-0 z-20 bg-transparent flex items-center justify-between">
                            <div className="min-w-0">
                                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1 block">Project Pool</span>
                                <h2 className="text-[22px] font-bold text-neutral-900 dark:text-white truncate tracking-tight">{pool.name}</h2>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-10 h-10 bg-white/50 dark:bg-neutral-800/50 backdrop-blur-xl border border-black/5 dark:border-white/10 rounded-full flex items-center justify-center active:scale-95 transition-transform"
                            >
                                <X size={20} className="text-neutral-500 dark:text-neutral-400" strokeWidth={1.5} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-8 pb-8 custom-scrollbar scrollbar-hide">
                            {/* Balance Card - Refined Glassy Blue */}
                            <div className="bg-blue-600 rounded-[32px] p-8 text-white mb-10 shadow-xl shadow-blue-200 dark:shadow-blue-900/20 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10" />
                                <p className="text-[12px] font-bold uppercase tracking-widest opacity-80 mb-2">Total Balance</p>
                                <h3 className="text-4xl font-bold tracking-tight font-numeric">{formatCurrency(pool.balance || 0)}</h3>
                                
                                <div className="mt-8 flex gap-4">
                                    <button 
                                        onClick={onTopUpClick}
                                        className="px-5 py-2.5 bg-white text-blue-600 rounded-2xl text-sm font-bold shadow-sm hover:scale-105 transition-transform"
                                    >
                                        Top Up
                                    </button>
                                    <button className="px-5 py-2.5 bg-blue-700 text-white rounded-2xl text-sm font-bold border border-blue-400/30 hover:bg-blue-800 transition-colors">
                                        Report
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-[15px] font-bold text-neutral-900 dark:text-white">Transaction History</h3>
                                    <span className="text-[10px] font-bold text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded">Last 30 Days</span>
                                </div>

                                <div className="space-y-3">
                                    {isLoading ? (
                                        <div className="py-20 flex flex-col items-center">
                                            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                            <p className="text-neutral-500 text-[11px] mt-4 font-bold uppercase tracking-widest">Fetching records...</p>
                                        </div>
                                    ) : transactions.length === 0 ? (
                                        <div className="text-center py-20 border-2 border-dashed border-neutral-100 dark:border-neutral-800 rounded-[32px]">
                                            <p className="text-neutral-400 text-sm font-medium">No transactions found</p>
                                        </div>
                                    ) : (
                                        transactions.map(tx => (
                                            <div key={tx.id} className="bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm p-4 rounded-3xl border border-neutral-100 dark:border-neutral-800 flex items-center gap-4 hover:border-blue-100 dark:hover:border-blue-900/30 transition-colors group">
                                                <div className={clsx(
                                                    "w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors",
                                                    tx.type === "TOP_UP" ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10" : "bg-neutral-50 text-neutral-600 dark:bg-neutral-800"
                                                )}>
                                                    {tx.type === "TOP_UP" ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start mb-0.5">
                                                        <span className="font-bold text-neutral-900 dark:text-white truncate pr-2 group-hover:text-blue-600 transition-colors text-[14px]">{tx.description || tx.type}</span>
                                                        <span className={clsx(
                                                            "font-bold whitespace-nowrap text-[14px] font-numeric",
                                                            tx.type === "TOP_UP" ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-900 dark:text-white"
                                                        )}>
                                                            {tx.type === "TOP_UP" ? "+" : "-"}{formatCurrency(tx.amount)}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[10px] text-neutral-400 font-bold uppercase tracking-widest">
                                                        <span>{tx.reference_type || 'Manual'}</span>
                                                        <span className="opacity-30">•</span>
                                                        <span>{format(new Date(tx.created_at), "d MMM, HH:mm")}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
