"use client";

import { useState } from "react";
import { RABItem, RABMode } from "./types/rab.types";
import RABBreakdownList from "./RABBreakdownList";
import { terbilang } from "./data/terbilang";

import { EstimateValue } from "./data/rab-estimates-builder";

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
  total: number;
  area: number;
  mode: RABMode;
  searchQuery?: string;
  expandAllState?: boolean | null;
  onPriceCommit?: (code: string, value: number) => void;
  onEstimateCommit?: (code: string, value: { volume: number; unit: string; unitPrice: number }) => void;
  onSelect?: (item: RABItem, initialTab?: "BOQ" | "AHSP") => void;
};

function filterRABTree(items: RABItem[], query: string): RABItem[] {
  if (!query.trim()) return items;
  const q = query.toLowerCase().trim();

  return items.reduce<RABItem[]>((acc, item) => {
    const codeMatch = item.code?.toLowerCase().includes(q);
    const nameEnMatch = item.nameEn?.toLowerCase().includes(q);
    const nameIdMatch = item.nameId?.toLowerCase().includes(q) ?? false;
    const notesMatch = item.notes?.toLowerCase().includes(q) ?? false;
    const matchesSelf = codeMatch || nameEnMatch || nameIdMatch || notesMatch;

    const filteredChildren = item.children ? filterRABTree(item.children, q) : [];

    if (matchesSelf || filteredChildren.length > 0) {
      acc.push({
        ...item,
        children: filteredChildren.length > 0 ? filteredChildren : item.children
      });
    }
    return acc;
  }, []);
}

export default function RABBreakdownTable({
  items,
  total,
  area,
  mode,
  searchQuery = "",
  expandAllState = null,
  onPriceCommit,
  onEstimateCommit,
  onSelect,
}: Props) {
  const [includePPN, setIncludePPN] = useState(true);
  const [includeRounding, setIncludeRounding] = useState(false);
  const [roundingDigits, setRoundingDigits] = useState(3);

  const filteredItems = filterRABTree(items, searchQuery);
  const effectiveExpandAll = searchQuery.trim() ? true : expandAllState;

  const ppnAmount = includePPN ? Math.round(total * PPN_RATE) : 0;
  const subtotalAfterPPN = Math.round(total) + ppnAmount;
  const roundedTotal = includeRounding ? roundUp(subtotalAfterPPN, roundingDigits) : subtotalAfterPPN;
  const roundingDiff = roundedTotal - subtotalAfterPPN;
  const grandTotal = roundedTotal;

  const colCount = mode === "BALLPARK" ? 6 : 7;

  const renderSpacers = (py: string) =>
    mode === "BALLPARK" ? (
      <>
        <td className={`${py} px-3`} />
        <td className={`${py} px-3`} />
      </>
    ) : (
      <>
        <td className={`${py} px-3`} />
        <td className={`${py} px-3`} />
        <td className={`${py} px-3`} />
      </>
    );


  return (
    <div className="w-full text-xs rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-2xs overflow-hidden animate-in fade-in">
      <table className="w-full border-collapse">
        <thead className="sticky top-0 bg-neutral-50 z-10">
          <tr className="border-b border-neutral-200 text-neutral-500 font-medium">
            <th className="w-8 py-3 px-3" />
            <th className="py-3 px-3 text-left w-20">Code</th>
            <th className="py-3 px-3 text-left w-full min-w-[200px]">Item</th>


            {mode === "BALLPARK" && (
              <>
                <th className="py-3 px-3 text-right whitespace-nowrap min-w-[140px]">Price / m²</th>
                <th className="py-3 px-3 text-right whitespace-nowrap min-w-[160px]">Total Cost</th>
                <th className="py-3 px-3 text-right whitespace-nowrap min-w-[70px] pr-6">Weight</th>
              </>
            )}

            {(mode === "ESTIMATES" || mode === "DETAIL") && (
              <>
                <th className="py-3 px-3 text-right whitespace-nowrap min-w-[80px]">Volume</th>
                <th className="py-3 px-3 text-center whitespace-nowrap min-w-[50px]">Unit</th>
                <th className="py-3 px-3 text-right whitespace-nowrap min-w-[140px]">Unit Price</th>
                <th className="py-3 px-3 text-right whitespace-nowrap min-w-[160px] pr-6">Total</th>
              </>
            )}
          </tr>
        </thead>

        <tbody>
          {/* ===== TOTAL PROJECT ROW ===== */}
          <tr className="border-b-2 border-neutral-200 bg-blue-50/40 dark:bg-blue-950/20 font-bold hover:bg-blue-50/70 transition-colors">
            <td className="py-3 px-3" />
            <td className="py-3 px-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full border border-blue-200 bg-blue-600 text-[10px] font-bold text-white">
                RAB
              </div>
            </td>
            <td className="py-3 px-3 text-neutral-900 dark:text-white">Total Project Cost</td>

            {mode === "BALLPARK" && (
              <>
                <td className="py-3 px-3 text-right whitespace-nowrap">
                  Rp {Math.round(area > 0 ? total / area : 0).toLocaleString("id-ID")}
                </td>
                <td className="py-3 px-3 text-right text-neutral-900 dark:text-white whitespace-nowrap">
                  Rp {Math.round(total).toLocaleString("id-ID")}
                </td>
                <td className="py-3 px-3 text-right pr-6 whitespace-nowrap">100.00%</td>
              </>
            )}

            {(mode === "ESTIMATES" || mode === "DETAIL") && (
              <>
                <td className="py-3 px-3" />
                <td className="py-3 px-3" />
                <td className="py-3 px-3" />
                <td className="py-3 px-3 text-right text-neutral-900 dark:text-white pr-6 whitespace-nowrap">
                  Rp {Math.round(total).toLocaleString("id-ID")}
                </td>
              </>
            )}
          </tr>

          <RABBreakdownList
            items={filteredItems}
            level={0}
            total={total}
            area={area}
            mode={mode}
            expandAllState={effectiveExpandAll}
            onPriceCommit={onPriceCommit}
            onEstimateCommit={onEstimateCommit}
            onSelect={onSelect}
          />


          {/* ===== PPN ROW (conditional) ===== */}
          {includePPN && (
            <tr className="border-t-2 border-neutral-200 bg-neutral-50/80 dark:bg-neutral-800/40">
              <td className="py-2.5 px-3" />
              <td className="py-2.5 px-3" />
              <td className="py-2.5 px-3 text-neutral-700 dark:text-neutral-300 font-medium">
                PPN {(PPN_RATE * 100).toFixed(0)}%
              </td>
              {mode === "BALLPARK" ? (
                <>
                  <td className="py-2.5 px-3" />
                  <td className="py-2.5 px-3 text-right text-neutral-800 dark:text-neutral-200 font-medium whitespace-nowrap">
                    Rp {ppnAmount.toLocaleString("id-ID")}
                  </td>
                  <td className="py-2.5 px-3 pr-6" />
                </>
              ) : (
                <>
                  <td className="py-2.5 px-3" />
                  <td className="py-2.5 px-3" />
                  <td className="py-2.5 px-3" />
                  <td className="py-2.5 px-3 text-right text-neutral-800 dark:text-neutral-200 font-medium whitespace-nowrap pr-6">
                    Rp {ppnAmount.toLocaleString("id-ID")}
                  </td>
                </>
              )}
            </tr>
          )}

          {/* ===== ROUNDING ROW (conditional) ===== */}
          {includeRounding && roundingDiff > 0 && (
            <tr className="border-t border-neutral-200 bg-neutral-50/80 dark:bg-neutral-800/40">
              <td className="py-2.5 px-3" />
              <td className="py-2.5 px-3" />
              <td className="py-2.5 px-3 text-neutral-700 dark:text-neutral-300 font-medium">Pembulatan</td>
              {mode === "BALLPARK" ? (
                <>
                  <td className="py-2.5 px-3" />
                  <td className="py-2.5 px-3 text-right text-neutral-800 dark:text-neutral-200 font-medium whitespace-nowrap">
                    Rp {roundingDiff.toLocaleString("id-ID")}
                  </td>
                  <td className="py-2.5 px-3 pr-6" />
                </>
              ) : (
                <>
                  <td className="py-2.5 px-3" />
                  <td className="py-2.5 px-3" />
                  <td className="py-2.5 px-3" />
                  <td className="py-2.5 px-3 text-right text-neutral-800 dark:text-neutral-200 font-medium whitespace-nowrap pr-6">
                    Rp {roundingDiff.toLocaleString("id-ID")}
                  </td>
                </>
              )}
            </tr>
          )}

          {/* ===== GRAND TOTAL ROW ===== */}
          {(includePPN || includeRounding) && (
            <tr className="border-t border-neutral-300 bg-neutral-100 dark:bg-neutral-800 font-bold">
              <td className="py-3 px-3" />
              <td className="py-3 px-3" />
              <td className="py-3 px-3 text-neutral-900 dark:text-white">Grand Total</td>
              {mode === "BALLPARK" ? (
                <>
                  <td className="py-3 px-3" />
                  <td className="py-3 px-3 text-right text-neutral-900 dark:text-white font-bold whitespace-nowrap">
                    Rp {grandTotal.toLocaleString("id-ID")}
                  </td>
                  <td className="py-3 px-3 pr-6" />
                </>
              ) : (
                <>
                  <td className="py-3 px-3" />
                  <td className="py-3 px-3" />
                  <td className="py-3 px-3" />
                  <td className="py-3 px-3 text-right text-neutral-900 dark:text-white font-bold whitespace-nowrap pr-6">
                    Rp {grandTotal.toLocaleString("id-ID")}
                  </td>
                </>
              )}
            </tr>
          )}


          {/* ===== TERBILANG ROW ===== */}
          <tr className="bg-neutral-50/50 dark:bg-neutral-900/50">
            <td colSpan={colCount} className="py-3 px-4">
              <div className="flex items-start gap-2">
                <span className="text-neutral-400 font-medium uppercase text-[10px] tracking-wider shrink-0 pt-0.5">
                  Terbilang
                </span>
                <span className="text-neutral-600 dark:text-neutral-400 italic text-[11px] leading-relaxed">
                  {terbilang(grandTotal)}
                </span>
              </div>
            </td>
          </tr>

          {/* ===== OPTIONS ROW ===== */}
          <tr className="border-t border-neutral-200 dark:border-neutral-800">
            <td colSpan={colCount} className="py-3 px-4">
              <div className="flex items-center gap-6 flex-wrap">
                <label className="flex items-center gap-2 cursor-pointer select-none group">
                  <input
                    type="checkbox"
                    checked={includePPN}
                    onChange={(e) => setIncludePPN(e.target.checked)}
                    className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500/30 cursor-pointer accent-blue-600"
                  />
                  <span className="text-neutral-700 dark:text-neutral-300 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors text-[11px] font-medium">
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
                    <span className="text-neutral-700 dark:text-neutral-300 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors text-[11px] font-medium">
                      Pembulatan
                    </span>
                  </label>
                  {includeRounding && (
                    <select
                      value={roundingDigits}
                      onChange={(e) => setRoundingDigits(Number(e.target.value))}
                      className="text-[11px] border border-neutral-300 dark:border-neutral-700 rounded-md px-2 py-1 text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-800 focus:outline-none focus:ring-1 focus:ring-blue-500/30 cursor-pointer"
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
