import React, { useState } from "react";
import { FundingSource, BankProvider } from "@/lib/types/finance-types";
import { Eye, EyeOff, Edit3, Trash2, MoreHorizontal, Archive, Power, RotateCcw, ArrowUp, ArrowDown } from "lucide-react";
import clsx from "clsx";

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
            "relative w-full aspect-[1.586] rounded-2xl p-6 transition-all shadow-sm hover:shadow-xl hover:-translate-y-1 select-none group",
            bgClass,
            (isArchived || !isActive) && "grayscale opacity-90",
            showActions ? "z-50" : "z-0" // Elevate card when menu is open
        )}>
            {/* Texture Overlay */}
            <div className="absolute inset-0 opacity-40 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay pointer-events-none rounded-2xl"></div>

            {/* Subtle Inner Highlight */}
            <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/20 pointer-events-none"></div>

            {/* Status Indication (if inactive/archived) */}
            {(isArchived || !isActive) && (
                <div className="absolute top-6 right-6 px-2 py-0.5 rounded-md bg-black/10 backdrop-blur-sm text-[9px] font-bold text-neutral-800/60 uppercase tracking-widest border border-black/5">
                    {isArchived ? "Archived" : "Inactive"}
                </div>
            )}

            <div className="relative z-10 flex flex-col justify-between h-full text-neutral-800">
                {/* HEAD */}
                <div>
                    <p className="text-[10px] font-bold tracking-widest opacity-60 uppercase mb-1">
                        {source.type === "BANK" ? getProviderLabel(source.provider) : source.type.replace("_", " ")}
                    </p>
                    <h3 className="text-xl font-bold tracking-tight text-neutral-900 leading-none truncate pr-8">
                        {source.name}
                    </h3>
                </div>

                {/* MIDDLE: Account Number */}
                <div className="flex items-center gap-3 mt-1">
                    <span className="font-mono text-lg tracking-widest opacity-80 mix-blend-multiply">
                        {showNumber ? (source.account_number || fullNum) : `•••• •••• •••• ${source.account_number ? source.account_number.slice(-4) : last4}`}
                    </span>
                    <button
                        onClick={() => setShowNumber(!showNumber)}
                        className="p-1 opacity-40 hover:opacity-100 transition-opacity"
                    >
                        {showNumber ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                </div>

                {/* BOTTOM: Balance & Actions */}
                <div className="mt-auto flex justify-between items-end">
                    <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest opacity-50 mb-0.5">Total Balance</p>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold opacity-60">IDR</span>
                            <span className="text-2xl font-bold tracking-tight text-neutral-900">
                                {showBalance ? formattedBalance : "••••••••"}
                            </span>
                            <button
                                onClick={() => setShowBalance(!showBalance)}
                                className="p-1 opacity-40 hover:opacity-100 transition-opacity"
                            >
                                {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* ACTIONS: Bottom Right */}
                    {!hideActions && (
                        <div className="relative">
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowActions(!showActions); }}
                                className="p-2 bg-white/20 hover:bg-white/40 rounded-full transition-colors backdrop-blur-md shadow-sm"
                            >
                                <MoreHorizontal className="w-5 h-5 text-neutral-800" />
                            </button>

                            {/* Menu - Glassy & Blurry as requested */}
                            {showActions && (
                                <div className="absolute bottom-full right-0 mb-2 w-40 bg-white/60 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-white/50 py-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-bottom-right z-50">
                                    {/* MOVE ACTIONS */}
                                    {!isArchived && (
                                        <>
                                            {!isFirst && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onMoveUp?.(source.id); setShowActions(false); }}
                                                    className="w-full text-left px-4 py-2.5 text-xs font-medium text-neutral-700 hover:bg-black/5 flex items-center gap-2.5 transition-colors"
                                                >
                                                    <ArrowUp className="w-3.5 h-3.5 opacity-70" /> Move Up
                                                </button>
                                            )}
                                            {!isLast && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onMoveDown?.(source.id); setShowActions(false); }}
                                                    className="w-full text-left px-4 py-2.5 text-xs font-medium text-neutral-700 hover:bg-black/5 flex items-center gap-2.5 transition-colors"
                                                >
                                                    <ArrowDown className="w-3.5 h-3.5 opacity-70" /> Move Down
                                                </button>
                                            )}
                                            {(!isFirst || !isLast) && <div className="h-px bg-neutral-200/50 my-1 mx-2" />}
                                        </>
                                    )}

                                    {/* Edit - Disabled if archived */}
                                    {!isArchived && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onEdit?.(source.id); setShowActions(false); }}
                                            className="w-full text-left px-4 py-2.5 text-xs font-medium text-neutral-700 hover:bg-black/5 flex items-center gap-2.5 transition-colors"
                                        >
                                            <Edit3 className="w-3.5 h-3.5 opacity-70" /> Edit
                                        </button>
                                    )}

                                    {/* Deactivate/Activate - Only if not archived */}
                                    {!isArchived && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onToggle?.(source.id); setShowActions(false); }}
                                            className="w-full text-left px-4 py-2.5 text-xs font-medium text-neutral-700 hover:bg-black/5 flex items-center gap-2.5 transition-colors"
                                        >
                                            <Power className={clsx("w-3.5 h-3.5 opacity-70", !isActive && "text-green-600")} />
                                            {isActive ? "Deactivate" : "Activate"}
                                        </button>
                                    )}

                                    {/* Archive/Restore */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onArchive?.(source.id); setShowActions(false); }}
                                        className="w-full text-left px-4 py-2.5 text-xs font-medium text-neutral-700 hover:bg-black/5 flex items-center gap-2.5 transition-colors"
                                    >
                                        {isArchived ? (
                                            <>
                                                <RotateCcw className="w-3.5 h-3.5 opacity-70" /> Restore
                                            </>
                                        ) : (
                                            <>
                                                <Archive className="w-3.5 h-3.5 opacity-70" /> Archive
                                            </>
                                        )}
                                    </button>

                                    <div className="h-px bg-neutral-200/50 my-1 mx-2" />

                                    <button
                                        onClick={(e) => { e.stopPropagation(); onDelete?.(source.id); setShowActions(false); }}
                                        className="w-full text-left px-4 py-2.5 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors"
                                    >
                                        <Trash2 className="w-3.5 h-3.5 opacity-70" /> Delete
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
