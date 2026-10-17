import React, { useState } from "react";
import { FundingSource, BankProvider } from "@/lib/types/finance-types";
import { Eye, EyeOff, Edit3, Trash2, MoreHorizontal, Archive, Power, RotateCcw, ArrowUp, ArrowDown, Landmark } from "lucide-react";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";

interface FundingSourceCardProps {
    source: FundingSource;
    isFirst?: boolean;
    isLast?: boolean;
    onToggle?: (id: string) => void;
    onEdit?: (id: string) => void;
    onArchive?: (id: string) => void;
    onDelete?: (id: string) => void;
    onMoveUp?: (id: string) => void;
    onMoveDown?: (id: string) => void;
    hideActions?: boolean;
}

// SIMPLER GRADIENTS - Pure CSS
const BANK_GRADIENTS: Record<BankProvider, string> = {
    MANDIRI: "bg-gradient-to-br from-[#FFECA8] to-[#FFC42E]",
    BCA: "bg-gradient-to-br from-[#DCEEFF] to-[#A3D4FF]",
    BRI: "bg-gradient-to-br from-[#E3F2FD] to-[#90CAF9]",
    BNI: "bg-gradient-to-br from-[#E0F2F1] to-[#4DB6AC]",
    BSI: "bg-gradient-to-br from-[#E0F7FA] to-[#00ACC1]",
    BLU: "bg-gradient-to-br from-[#E3F2FD] to-[#64B5F6]",
    JAGO: "bg-gradient-to-br from-[#FCE4EC] to-[#F06292]",
    JENIUS: "bg-gradient-to-br from-[#F3E5F5] to-[#BA68C8]",
    CIMB: "bg-gradient-to-br from-[#FFEBEE] to-[#E57373]",
    DANAMON: "bg-gradient-to-br from-[#FFF3E0] to-[#FFB74D]",
    PERMATA: "bg-gradient-to-br from-[#F1F8E9] to-[#AED581]",
    OTHER: "bg-gradient-to-br from-[#F5F5F5] to-[#BDBDBD]",
};

const TYPE_GRADIENTS: Record<string, string> = {
    CASH: "bg-gradient-to-br from-emerald-50 to-emerald-200",
    PETTY_CASH: "bg-gradient-to-br from-red-50 to-red-200",
    REIMBURSE: "bg-gradient-to-br from-orange-50 to-orange-200",
};

const getProviderLabel = (provider?: BankProvider) => {
    return provider ? provider.replace("_", " ") : "BANK";
};

const getMockCardDetails = (id: string) => {
    const hash = id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const last4 = (hash % 10000).toString().padStart(4, "0");
    const mid4 = (hash % 5000).toString().padStart(4, "0");
    return {
        fullNum: `8${mid4} 0000 0000 ${last4}`,
        last4
    };
};

export default function FundingSourceCard({ source, isFirst, isLast, onEdit, onToggle, onArchive, onDelete, onMoveUp, onMoveDown, hideActions }: FundingSourceCardProps) {
    const [showBalance, setShowBalance] = useState(false);
    const [showNumber, setShowNumber] = useState(false);
    const [showActions, setShowActions] = useState(false);

    let bgClass = TYPE_GRADIENTS[source.type] || TYPE_GRADIENTS.CASH;
    if (source.type === "BANK" && source.provider) {
        bgClass = BANK_GRADIENTS[source.provider] || BANK_GRADIENTS.OTHER;
    } else if (source.type === "PETTY_CASH") {
        bgClass = TYPE_GRADIENTS.PETTY_CASH;
    }

    const { fullNum, last4 } = getMockCardDetails(source.id);

    const formattedBalance = new Intl.NumberFormat("id-ID", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(source.balance || 0);

    const isArchived = source.is_archived;
    const isActive = source.is_active;

    // Use a useEffect to handle the click outside logic purely for the menu closure if needed, 
    // but the card component structure here relies on state. 
    // The previous fix in client component handled this globally but here we are in the card. 
    // For now we keep the local state toggle as requested.

    // Effect to close menu on outside click
    React.useEffect(() => {
        if (showActions) {
            const handleClickOutside = () => setShowActions(false);
            document.addEventListener("click", handleClickOutside);
            return () => document.removeEventListener("click", handleClickOutside);
        }
    }, [showActions]);

    return (
        <div className={clsx(
            "relative w-full aspect-[1.586] rounded-[32px] p-7 transition-all duration-500 select-none group focus-within:ring-2 focus-within:ring-blue-400/50 outline-none",
            bgClass,
            (isArchived || !isActive) && "grayscale-[0.5] opacity-80",
            showActions ? "z-[60] scale-[1.02] shadow-2xl" : "z-0 shadow-sm hover:shadow-xl hover:-translate-y-1.5"
        )}>
            {/* Glassy Overlay */}
            <div className="absolute inset-0 bg-white/20 dark:bg-black/10 backdrop-blur-[2px] pointer-events-none rounded-[32px]" />
            
            {/* Texture Overlay */}
            <div className="absolute inset-0 opacity-[0.15] dark:opacity-[0.08] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay pointer-events-none rounded-[32px]" />

            {/* Subtle Inner Glow/Border */}
            <div className="absolute inset-0 rounded-[32px] ring-1 ring-inset ring-white/60 dark:ring-white/20 pointer-events-none" />

            {/* Status Indication (if inactive/archived) */}
            {(isArchived || !isActive) && (
                <div className="absolute top-7 right-7 px-3 py-1 rounded-full bg-black/10 dark:bg-white/10 backdrop-blur-md text-[9px] font-black text-neutral-800 dark:text-white/80 uppercase tracking-[0.15em] border border-white/20">
                    {isArchived ? "Archived" : "Inactive"}
                </div>
            )}

            <div className="relative z-10 flex flex-col justify-between h-full text-neutral-900 dark:text-neutral-900">
                {/* HEAD */}
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-[10px] font-black tracking-[0.2em] opacity-40 uppercase mb-1.5 font-mono">
                            {source.type === "BANK" ? getProviderLabel(source.provider) : source.type.replace("_", " ")}
                        </p>
                        <h3 className="text-2xl font-black tracking-tight leading-none truncate max-w-[200px]">
                            {source.name}
                        </h3>
                    </div>
                    
                    {/* Chip Icon or Bank Logo would go here - Using Landmark as placeholder */}
                    <div className="w-10 h-10 rounded-xl bg-black/5 dark:bg-white/20 flex items-center justify-center backdrop-blur-sm border border-white/30">
                        <Landmark className="w-5 h-5 opacity-40" />
                    </div>
                </div>

                {/* MIDDLE: Account Number */}
                <div className="flex items-center gap-4 mt-2">
                    <span className="font-mono text-xl tracking-[0.15em] font-medium opacity-80 drop-shadow-sm">
                        {showNumber ? (source.account_number || fullNum) : `•••• •••• •••• ${source.account_number ? source.account_number.slice(-4) : last4}`}
                    </span>
                    <button
                        onClick={() => setShowNumber(!showNumber)}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-black/5 hover:bg-black/10 transition-all active:scale-90"
                    >
                        {showNumber ? <Eye className="w-3.5 h-3.5 opacity-60" /> : <EyeOff className="w-3.5 h-3.5 opacity-60" />}
                    </button>
                </div>

                {/* BOTTOM: Balance & Actions */}
                <div className="mt-auto flex justify-between items-end">
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40 mb-1 font-mono">Current Balance</p>
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black opacity-30 mt-1">IDR</span>
                            <span className="text-3xl font-black tracking-tighter">
                                {showBalance ? formattedBalance : "••••••••"}
                            </span>
                            <button
                                onClick={() => setShowBalance(!showBalance)}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-black/5 hover:bg-black/10 transition-all active:scale-90"
                            >
                                {showBalance ? <Eye className="w-3.5 h-3.5 opacity-60" /> : <EyeOff className="w-3.5 h-3.5 opacity-60" />}
                            </button>
                        </div>
                    </div>

                    {/* ACTIONS: Bottom Right */}
                    {!hideActions && (
                        <div className="relative">
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowActions(!showActions); }}
                                className={clsx(
                                    "w-12 h-12 flex items-center justify-center rounded-full transition-all duration-300 backdrop-blur-xl border shadow-sm active:scale-90",
                                    showActions 
                                        ? "bg-white/80 dark:bg-neutral-800/90 border-transparent rotate-90 scale-110" 
                                        : "bg-white/30 dark:bg-white/20 border-white/40 hover:bg-white/50"
                                )}
                            >
                                <MoreHorizontal className={clsx("w-6 h-6 transition-colors", showActions ? "text-blue-600" : "text-neutral-900")} />
                            </button>

                            {/* Menu - Liquid Glass style */}
                            <AnimatePresence>
                                {showActions && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9, y: 10, filter: "blur(10px)" }}
                                        animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
                                        exit={{ opacity: 0, scale: 0.9, y: 10, filter: "blur(10px)" }}
                                        className="absolute bottom-full right-0 mb-4 w-48 bg-white/70 dark:bg-neutral-900/80 backdrop-blur-2xl rounded-[24px] shadow-[0_20px_40px_-10px_rgba(0,0,0,0.2)] border border-white/50 dark:border-white/10 p-2 z-[60] origin-bottom-right"
                                    >
                                        <div className="space-y-1">
                                            {!isArchived && (
                                                <>
                                                    <div className="flex gap-1 mb-1">
                                                        {!isFirst && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); onMoveUp?.(source.id); setShowActions(false); }}
                                                                className="flex-1 py-3 bg-neutral-100/50 dark:bg-white/5 hover:bg-neutral-100 dark:hover:bg-white/10 rounded-2xl flex items-center justify-center transition-all"
                                                                title="Move Up"
                                                            >
                                                                <ArrowUp className="w-4 h-4 opacity-60" />
                                                            </button>
                                                        )}
                                                        {!isLast && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); onMoveDown?.(source.id); setShowActions(false); }}
                                                                className="flex-1 py-3 bg-neutral-100/50 dark:bg-white/5 hover:bg-neutral-100 dark:hover:bg-white/10 rounded-2xl flex items-center justify-center transition-all"
                                                                title="Move Down"
                                                            >
                                                                <ArrowDown className="w-4 h-4 opacity-60" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </>
                                            )}

                                            {!isArchived && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onEdit?.(source.id); setShowActions(false); }}
                                                    className="w-full text-left px-4 py-3 text-[11px] font-bold text-neutral-700 dark:text-neutral-300 hover:bg-blue-500 hover:text-white rounded-2xl flex items-center gap-3 transition-all group/item"
                                                >
                                                    <Edit3 className="w-4 h-4 opacity-50 group-hover/item:opacity-100" /> Edit Source
                                                </button>
                                            )}

                                            {!isArchived && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onToggle?.(source.id); setShowActions(false); }}
                                                    className="w-full text-left px-4 py-3 text-[11px] font-bold text-neutral-700 dark:text-neutral-300 hover:bg-blue-500 hover:text-white rounded-2xl flex items-center gap-3 transition-all group/item"
                                                >
                                                    <Power className={clsx("w-4 h-4 opacity-50 group-hover/item:opacity-100", !isActive && "text-green-600")} /> 
                                                    {isActive ? "Deactivate" : "Activate"}
                                                </button>
                                            )}

                                            <button
                                                onClick={(e) => { e.stopPropagation(); onArchive?.(source.id); setShowActions(false); }}
                                                className="w-full text-left px-4 py-3 text-[11px] font-bold text-neutral-700 dark:text-neutral-300 hover:bg-amber-500 hover:text-white rounded-2xl flex items-center gap-3 transition-all group/item"
                                            >
                                                {isArchived ? (
                                                    <><RotateCcw className="w-4 h-4 opacity-50 group-hover/item:opacity-100" /> Restore Source</>
                                                ) : (
                                                    <><Archive className="w-4 h-4 opacity-50 group-hover/item:opacity-100" /> Archive Source</>
                                                )}
                                            </button>

                                            <div className="h-px bg-neutral-200/50 dark:bg-white/10 my-2 mx-2" />

                                            <button
                                                onClick={(e) => { e.stopPropagation(); onDelete?.(source.id); setShowActions(false); }}
                                                className="w-full text-left px-4 py-3 text-[11px] font-bold text-red-600 hover:bg-red-500 hover:text-white rounded-2xl flex items-center gap-3 transition-all group/item"
                                            >
                                                <Trash2 className="w-4 h-4 opacity-50 group-hover/item:opacity-100" /> Delete Forever
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
