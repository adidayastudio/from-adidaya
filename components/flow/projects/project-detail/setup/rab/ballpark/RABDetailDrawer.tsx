"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { RABItem } from "./types/rab.types";
import RABDetailBOQ from "./RABDetailBOQ";
import RABDetailAHSP from "./RABDetailAHSP";

type Props = {
    isOpen: boolean;
    onClose: () => void;
    item: RABItem | null;
    initialTab?: "BOQ" | "AHSP";
    onApply?: (price: number) => void;
    onApplyVolume?: (volume: number) => void;
    onReloadWbs?: () => void;
};

type Tab = "BOQ" | "AHSP";

export default function RABDetailDrawer({ isOpen, onClose, item, initialTab, onApply, onApplyVolume, onReloadWbs }: Props) {
    const [tab, setTab] = useState<Tab>(initialTab || "BOQ");

    useEffect(() => {
        if (isOpen && initialTab) {
            setTab(initialTab);
        }
    }, [isOpen, initialTab, item?.code]);

    if (!item) return null;

    return (
        <>
            {/* OVERLAY */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-neutral-900/15 z-40 backdrop-blur-sm transition-opacity duration-300"
                    onClick={onClose}
                />
            )}

            {/* DRAWER */}
            <div
                className={`fixed z-50 bg-white/70 backdrop-blur-3xl border border-white/60 shadow-2xl rounded-[40px] overflow-hidden flex flex-col bottom-6 right-6 top-6 w-[560px] transform transition-all duration-300 ${
                    isOpen ? "translate-x-0 opacity-100" : "translate-x-12 opacity-0 pointer-events-none"
                }`}
            >
                {/* HEADER */}
                <div className="px-8 pt-8 pb-5 flex items-center justify-between bg-transparent">
                    <div>
                        <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-[10px] font-black text-neutral-600 bg-white/80 border border-white/80 px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                                {item.code}
                            </span>
                            <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                                Work Item Detail
                            </span>
                        </div>
                        <h3 className="text-xl font-bold text-neutral-900 tracking-tight leading-snug line-clamp-1">
                            {item.nameEn}
                        </h3>
                        {item.nameId && (
                            <p className="text-xs text-neutral-400 italic font-medium truncate mt-0.5">{item.nameId}</p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 bg-white/60 border border-black/[0.03] rounded-full flex items-center justify-center active:scale-95 transition-all shadow-sm hover:bg-white"
                    >
                        <X className="w-5 h-5 text-neutral-500" strokeWidth={1.5} />
                    </button>
                </div>

                {/* TABS */}
                <div className="flex gap-2 border-b border-black/[0.04] px-8">
                    <button
                        onClick={() => setTab("BOQ")}
                        className={`py-3 px-1 text-sm font-bold border-b-2 transition-all relative ${
                            tab === "BOQ"
                                ? "border-brand-red text-brand-red"
                                : "border-transparent text-neutral-400 hover:text-neutral-600"
                        }`}
                    >
                        BOQ (Volume)
                    </button>
                    <button
                        onClick={() => setTab("AHSP")}
                        className={`py-3 px-1 text-sm font-bold border-b-2 transition-all relative ${
                            tab === "AHSP"
                                ? "border-brand-red text-brand-red"
                                : "border-transparent text-neutral-400 hover:text-neutral-600"
                        }`}
                    >
                        AHSP (Analysis)
                    </button>
                </div>

                {/* CONTENT */}
                <div className="flex-1 min-h-0 flex flex-col bg-transparent">
                    {tab === "BOQ" ? (
                        <RABDetailBOQ
                            item={item}
                            onApplyVolume={(vol) => onApplyVolume && onApplyVolume(vol)}
                        />
                    ) : (
                        <RABDetailAHSP
                            item={item}
                            onApplyPrice={(price) => onApply && onApply(price)}
                            onReloadWbs={onReloadWbs}
                        />
                    )}
                </div>

            </div>
        </>
    );
}
