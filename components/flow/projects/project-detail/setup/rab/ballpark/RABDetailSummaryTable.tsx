"use client";

import { useState, useMemo } from "react";
import { RABItem } from "./types/rab.types";
import RABDetailSummaryNode from "./RABDetailSummaryNode";
import { terbilang } from "./data/terbilang";

const PPN_RATE = 0.11;

const ROUNDING_OPTIONS = [
    { label: "Puluhan", value: 1 },
    { label: "Ratusan", value: 2 },
    { label: "Ribuan", value: 3 },
    { label: "Puluh Ribuan", value: 4 },
    { label: "Ratus Ribuan", value: 5 },
    { label: "Jutaan", value: 6 },
    { label: "Puluh Jutaan", value: 7 },
    { label: "Ratus Jutaan", value: 8 },
    { label: "Miliaran", value: 9 },
] as const;

function roundUp(n: number, digits: number): number {
    const factor = Math.pow(10, digits);
    return Math.floor(n / factor) * factor;
}

type Props = {
    items: RABItem[];
};

export default function RABDetailSummaryTable({ items }: Props) {
    const [includePPN, setIncludePPN] = useState(true);
    const [includeRounding, setIncludeRounding] = useState(false);
    const [roundingDigits, setRoundingDigits] = useState(3);

    const totalProjectCost = useMemo(() => {
        return items.reduce((sum, item) => sum + (item.total || 0), 0);
    }, [items]);

    const ppnAmount = includePPN ? Math.round(totalProjectCost * PPN_RATE) : 0;
    const subtotalAfterPPN = Math.round(totalProjectCost) + ppnAmount;
    const roundedTotal = includeRounding ? roundUp(subtotalAfterPPN, roundingDigits) : subtotalAfterPPN;
    const roundingDiff = roundedTotal - subtotalAfterPPN;
    const grandTotal = roundedTotal;

    return (
        <div className="w-full text-xs rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-2xs overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">

            <table className="w-full border-collapse">
                <thead className="sticky top-0 bg-neutral-50 z-10">
                    <tr className="border-b border-neutral-200 text-neutral-500 font-medium">
                        <th className="w-8 py-3 px-3" />
                        <th className="py-3 px-3 text-left w-20">Code</th>
                        <th className="py-3 px-3 text-left w-full min-w-[200px]">Item</th>

                        <th className="py-3 px-3 text-right whitespace-nowrap min-w-[160px]">Total Cost</th>
                        <th className="py-3 px-3 text-right whitespace-nowrap min-w-[70px] pr-6">Weight</th>
                    </tr>
                </thead>
                <tbody>
                    {/* TOTAL ROW */}
                    <tr className="border-b-2 border-neutral-200 bg-neutral-100/50 font-bold hover:bg-neutral-100/80 transition-colors">
                        <td className="py-3 px-3" />
                        <td className="py-3 px-3 font-mono text-neutral-900">Total</td>
                        <td className="py-3 px-3 text-neutral-900">Project Cost</td>
                        <td className="py-3 px-3 text-right text-neutral-900 whitespace-nowrap">
                            Rp {Math.round(totalProjectCost).toLocaleString("id-ID")}
                        </td>
                        <td className="py-3 px-3 text-right text-neutral-900 pr-6 whitespace-nowrap">100.00%</td>
                    </tr>

                    {/* ROOT ITEMS (L0) */}
                    {items.map((item) => (
                        <RABDetailSummaryNode
                            key={item.id || item.code}
                            item={item}
                            totalProject={totalProjectCost}
                        />
                    ))}

                    {/* ===== PPN ROW (conditional) ===== */}
                    {includePPN && (
                        <tr className="border-t-2 border-neutral-200 bg-neutral-50/80">
                            <td className="py-2.5 px-3" />
                            <td className="py-2.5 px-3" />
                            <td className="py-2.5 px-3 text-neutral-600 font-medium">
                                PPN {(PPN_RATE * 100).toFixed(0)}%
                            </td>
                            <td className="py-2.5 px-3 text-right text-neutral-700 font-medium whitespace-nowrap">
                                Rp {ppnAmount.toLocaleString("id-ID")}
                            </td>
                            <td className="py-2.5 px-3 pr-6" />
                        </tr>
                    )}

                    {/* ===== ROUNDING ROW (conditional) ===== */}
                    {includeRounding && roundingDiff > 0 && (
                        <tr className="border-t border-neutral-200 bg-neutral-50/80">
                            <td className="py-2.5 px-3" />
                            <td className="py-2.5 px-3" />
                            <td className="py-2.5 px-3 text-neutral-600 font-medium">Pembulatan</td>
                            <td className="py-2.5 px-3 text-right text-neutral-700 font-medium whitespace-nowrap">
                                Rp {roundingDiff.toLocaleString("id-ID")}
                            </td>
                            <td className="py-2.5 px-3 pr-6" />
                        </tr>
                    )}

                    {/* ===== GRAND TOTAL ROW ===== */}
                    {(includePPN || includeRounding) && (
                        <tr className="border-t border-neutral-300 bg-neutral-100 font-bold">
                            <td className="py-3 px-3" />
                            <td className="py-3 px-3" />
                            <td className="py-3 px-3 text-neutral-900">Grand Total</td>
                            <td className="py-3 px-3 text-right text-neutral-900 font-bold whitespace-nowrap">
                                Rp {grandTotal.toLocaleString("id-ID")}
                            </td>
                            <td className="py-3 px-3 pr-6" />
                        </tr>
                    )}

                    {/* ===== TERBILANG ROW ===== */}
                    <tr className="bg-neutral-50/50">
                        <td colSpan={5} className="py-3 px-4">
                            <div className="flex items-start gap-2">
                                <span className="text-neutral-400 font-medium uppercase text-[10px] tracking-wider shrink-0 pt-0.5">
                                    Terbilang
                                </span>
                                <span className="text-neutral-600 italic text-[11px] leading-relaxed">
                                    {terbilang(grandTotal)}
                                </span>
                            </div>
                        </td>
                    </tr>

                    {/* ===== OPTIONS ROW ===== */}
                    <tr className="border-t border-neutral-200">
                        <td colSpan={5} className="py-3 px-4">
                            <div className="flex items-center gap-6 flex-wrap">
                                <label className="flex items-center gap-2 cursor-pointer select-none group">
                                    <input
                                        type="checkbox"
                                        checked={includePPN}
                                        onChange={(e) => setIncludePPN(e.target.checked)}
                                        className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500/30 cursor-pointer accent-blue-600"
                                    />
                                    <span className="text-neutral-600 group-hover:text-neutral-900 transition-colors text-[11px] font-medium">
                                        PPN {(PPN_RATE * 100).toFixed(0)}%
                                    </span>
                                </label>

                                <div className="flex items-center gap-2">
                                    <label className="flex items-center gap-2 cursor-pointer select-none group">
                                        <input
                                            type="checkbox"
                                            checked={includeRounding}
                                            onChange={(e) => setIncludeRounding(e.target.checked)}
                                            className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500/30 cursor-pointer accent-blue-600"
                                        />
                                        <span className="text-neutral-600 group-hover:text-neutral-900 transition-colors text-[11px] font-medium">
                                            Pembulatan
                                        </span>
                                    </label>
                                    {includeRounding && (
                                        <select
                                            value={roundingDigits}
                                            onChange={(e) => setRoundingDigits(Number(e.target.value))}
                                            className="text-[11px] border border-neutral-300 rounded-md px-2 py-1 text-neutral-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500/30 cursor-pointer"
                                        >
                                            {ROUNDING_OPTIONS.filter((opt) => Math.pow(10, opt.value) < subtotalAfterPPN).map((opt) => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}
