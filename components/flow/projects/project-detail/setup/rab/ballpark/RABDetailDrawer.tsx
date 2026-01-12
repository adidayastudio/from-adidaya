"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { RABItem } from "./types/rab.types";
import RABDetailBOQ from "./RABDetailBOQ";
import RABDetailAHSP from "./RABDetailAHSP";

type Props = {
    isOpen: boolean;
    onClose: () => void;
    item: RABItem | null;
    onApply?: (price: number) => void;
    onApplyVolume?: (volume: number) => void;
};

type Tab = "BOQ" | "AHSP";

export default function RABDetailDrawer({ isOpen, onClose, item, onApply, onApplyVolume }: Props) {
    const [tab, setTab] = useState<Tab>("BOQ");

    if (!item) return null;

    return (
        <>
            {/* OVERLAY */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/20 z-40 backdrop-blur-[1px] transition-opacity"
                    onClick={onClose}
                />
            )}

            {/* DRAWER */}
            <div
                className={`fixed inset-y-0 right-0 w-[600px] bg-white shadow-2xl z-50 transform transition-transform duration-300 flex flex-col ${isOpen ? "translate-x-0" : "translate-x-full"
                    }`}
            >
                {/* HEADER */}
                <div className="px-6 py-5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] font-bold text-neutral-500 bg-white border border-neutral-200 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                {item.code}
                            </span>
                            <span className="text-[10px] text-neutral-400 font-medium">
                                Work Item Detail
                            </span>
                        </div>
                        <h3 className="text-lg font-bold text-neutral-900 line-clamp-1">
                            {item.nameEn}
                        </h3>
                        {item.nameId && (
                            <p className="text-sm text-neutral-500 italic truncate">{item.nameId}</p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="text-neutral-400 hover:text-neutral-600 p-2 rounded-full hover:bg-neutral-200/50 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* TABS */}
                <div className="flex border-b border-neutral-200 px-6">
                    <button
                        onClick={() => setTab("BOQ")}
                        className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${tab === "BOQ" ? "border-neutral-900 text-neutral-900" : "border-transparent text-neutral-500 hover:text-neutral-700"}`}
                    >
                        BOQ (Volume)
                    </button>
                    <button
                        onClick={() => setTab("AHSP")}
                        className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${tab === "AHSP" ? "border-neutral-900 text-neutral-900" : "border-transparent text-neutral-500 hover:text-neutral-700"}`}
                    >
                        AHSP (Analysis)
                    </button>
                </div>

                {/* CONTENT */}
                <div className="flex-1 overflow-y-auto p-6">
                    {tab === "BOQ" ? (
                        <RABDetailBOQ
                            item={item}
                            onApplyVolume={(vol) => onApplyVolume && onApplyVolume(vol)}
                        />
                    ) : (
                        <RABDetailAHSP
                            item={item}
                            onApplyPrice={(price) => onApply && onApply(price)}
                        />
                    )}
                </div>

            </div>
        </>
    );
}
