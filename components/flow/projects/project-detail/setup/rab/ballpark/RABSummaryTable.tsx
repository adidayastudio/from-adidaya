"use client";

import { useState, useMemo } from "react";
import { RABItem, RABMode } from "./types/rab.types";
import { getNodeTotalPerM2 } from "./data/rab-utils";
import { terbilang } from "./data/terbilang";

const PPN_RATE = 0.11; // 11%

/** Rounding presets: label → power of 10 */
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
  area: number;
  mode: RABMode;
};

export default function RABSummaryTable({
  items,
  area,
  mode,
}: Props) {
  /* ================================
     OPTIONS STATE
  ================================ */
  const [includePPN, setIncludePPN] = useState(true);
  const [includeRounding, setIncludeRounding] = useState(false);
  const [roundingDigits, setRoundingDigits] = useState(3); // default: Ribuan

  /* ================================
     TOTAL PROJECT COST (Rp)
  ================================ */
  const totalProjectCost = useMemo(() => {
    const raw = items.reduce(
      (sum, item) => {
        if (mode === "ESTIMATES" || mode === "DETAIL") {
          return sum + (item.total || 0);
        }
        return sum + getNodeTotalPerM2(item) * area;
      },
      0
    );
    return Math.round(raw);
  }, [items, area, mode]);

  /* ================================
     COST PER m² (DERIVED)
  ================================ */
  const costPerM2 = useMemo(() => {
    return area > 0 ? Math.round(totalProjectCost / area) : 0;
  }, [totalProjectCost, area]);

  /* ================================
     PPN, ROUNDING & GRAND TOTAL
  ================================ */
  const ppnAmount = includePPN ? Math.round(totalProjectCost * PPN_RATE) : 0;
  const subtotalAfterPPN = totalProjectCost + ppnAmount;

  const roundedTotal = includeRounding
    ? roundUp(subtotalAfterPPN, roundingDigits)
    : subtotalAfterPPN;
  const roundingDiff = roundedTotal - subtotalAfterPPN;

  const grandTotal = roundedTotal;

  /* ================================
     COLUMN COUNT (for colSpan)
  ================================ */
  const colCount = mode === "BALLPARK" ? 6 : 8;

  /** Helper: render empty spacer TDs for estimates/detail mode */
  const renderSpacers = (py: string) =>
    mode === "BALLPARK" ? (
      <td className={`${py} px-3`} />
    ) : (
      <>
        <td className={`${py} px-3`} />
        <td className={`${py} px-3`} />
        <td className={`${py} px-3`} />
      </>
    );

  return (
    <div className="w-full text-xs">
      <table className="w-full border-collapse">
        <thead className="sticky top-0 bg-neutral-50 z-10">
          <tr className="border-b border-neutral-200 text-neutral-500 font-medium">
            <th className="w-8 py-3 px-3" />
            <th className="py-3 px-3 text-left w-20">Code</th>
            <th className="py-3 px-3 text-left">Item</th>
            {mode === "BALLPARK" && (
              <>
                <th className="py-3 px-3 text-right whitespace-nowrap min-w-[140px]">Price / m²</th>
                <th className="py-3 px-3 text-right whitespace-nowrap min-w-[160px]">Total Cost</th>
                <th className="py-3 px-3 text-right whitespace-nowrap min-w-[70px] pr-6">Weight</th>
              </>
            )}
            {(mode === "ESTIMATES" || mode === "DETAIL") && (
              <>
                <th className="py-3 px-3 w-24" />
                <th className="py-3 px-3 w-16" />
                <th className="py-3 px-3 w-32" />
                <th className="py-3 px-3 text-right whitespace-nowrap min-w-[160px]">Total</th>
                <th className="py-3 px-3 text-right whitespace-nowrap min-w-[70px] pr-6">Weight</th>
              </>
            )}
          </tr>
        </thead>

        <tbody>
          {/* ===== TOTAL PROJECT COST ROW ===== */}
          <tr className="border-b-2 border-neutral-200 bg-neutral-100/50 font-bold hover:bg-neutral-100/80 transition-colors">
            <td className="py-3 px-3 text-center">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-brand-red text-white text-[9px] font-black uppercase">
                ★
              </span>
            </td>
            <td className="py-3 px-3 font-mono text-neutral-900">RAB</td>
            <td className="py-3 px-3 text-neutral-900">Total Project Cost</td>

            {mode === "BALLPARK" && (
              <td className="py-3 px-3 text-right whitespace-nowrap">
                Rp {costPerM2.toLocaleString("id-ID")}
              </td>
            )}
            {(mode === "ESTIMATES" || mode === "DETAIL") && (
              <>
                <td className="py-3 px-3" />
                <td className="py-3 px-3" />
                <td className="py-3 px-3" />
              </>
            )}
            <td className="py-3 px-3 text-right text-neutral-900 whitespace-nowrap">
              Rp {totalProjectCost.toLocaleString("id-ID")}
            </td>
            <td className="py-3 px-3 text-right text-neutral-900 pr-6 whitespace-nowrap">
              100.00%
            </td>
          </tr>

          {/* ===== DISCIPLINE ROWS ===== */}
          {items.map((row) => {
            const rowTotal = (mode === "ESTIMATES" || mode === "DETAIL")
              ? (row.total || 0)
              : Math.round(getNodeTotalPerM2(row) * area);
            const rowPerM2 = area > 0 ? Math.round(rowTotal / area) : 0;
            const weight = totalProjectCost > 0 ? (rowTotal / totalProjectCost) * 100 : 0;

            return (
              <tr key={row.code} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                <td className="py-2 px-3" />
                <td className="py-2 px-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full border border-neutral-300 bg-neutral-100 text-[10px] font-bold text-neutral-600">
                    {row.code}
                  </div>
                </td>
                <td className="py-2 px-3">
                  <div className="leading-tight">
                    <div className="text-neutral-900">{row.nameEn}</div>
                    {row.nameId && <div className="italic text-neutral-400">{row.nameId}</div>}
                  </div>
                </td>

                {mode === "BALLPARK" && (
                  <td className="py-2 px-3 text-right text-neutral-500 whitespace-nowrap">
                    Rp {Math.round(rowPerM2).toLocaleString("id-ID")}
                  </td>
                )}
                {(mode === "ESTIMATES" || mode === "DETAIL") && (
                  <>
                    <td className="py-2 px-3" />
                    <td className="py-2 px-3" />
                    <td className="py-2 px-3" />
                  </>
                )}

                <td className="py-2 px-3 text-right text-neutral-900 whitespace-nowrap">
                  Rp {Math.round(rowTotal).toLocaleString("id-ID")}
                </td>
                <td className="py-2 px-3 text-right text-neutral-600 pr-6 whitespace-nowrap">
                  {weight.toFixed(2)}%
                </td>
              </tr>
            );
          })}

          {/* ===== PPN ROW (conditional) ===== */}
          {includePPN && (
            <tr className="border-t-2 border-neutral-200 bg-neutral-50/80">
              <td className="py-2.5 px-3" />
              <td className="py-2.5 px-3" />
              <td className="py-2.5 px-3 text-neutral-600 font-medium">
                PPN {(PPN_RATE * 100).toFixed(0)}%
              </td>
              {renderSpacers("py-2.5")}
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
              <td className="py-2.5 px-3 text-neutral-600 font-medium">
                Pembulatan
              </td>
              {renderSpacers("py-2.5")}
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
              <td className="py-3 px-3 text-neutral-900">
                Grand Total
              </td>
              {renderSpacers("py-3")}
              <td className="py-3 px-3 text-right text-neutral-900 font-bold whitespace-nowrap">
                Rp {grandTotal.toLocaleString("id-ID")}
              </td>
              <td className="py-3 px-3 pr-6" />
            </tr>
          )}

          {/* ===== TERBILANG ROW ===== */}
          <tr className="bg-neutral-50/50">
            <td colSpan={colCount} className="py-3 px-4">
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

          {/* ===== OPTIONS ROW (PPN & Pembulatan checkboxes) ===== */}
          <tr className="border-t border-neutral-200">
            <td colSpan={colCount} className="py-3 px-4">
              <div className="flex items-center gap-6 flex-wrap">
                {/* PPN Toggle */}
                <label className="flex items-center gap-2 cursor-pointer select-none group">
                  <input
                    type="checkbox"
                    checked={includePPN}
                    onChange={(e) => setIncludePPN(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-neutral-300 text-brand-red focus:ring-brand-red/30 cursor-pointer accent-red-600"
                  />
                  <span className="text-neutral-600 group-hover:text-neutral-900 transition-colors text-[11px] font-medium">
                    PPN {(PPN_RATE * 100).toFixed(0)}%
                  </span>
                </label>

                {/* Pembulatan Toggle + Digit Selector */}
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none group">
                    <input
                      type="checkbox"
                      checked={includeRounding}
                      onChange={(e) => setIncludeRounding(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-neutral-300 text-brand-red focus:ring-brand-red/30 cursor-pointer accent-red-600"
                    />
                    <span className="text-neutral-600 group-hover:text-neutral-900 transition-colors text-[11px] font-medium">
                      Pembulatan
                    </span>
                  </label>

                  {includeRounding && (
                    <select
                      value={roundingDigits}
                      onChange={(e) => setRoundingDigits(Number(e.target.value))}
                      className="text-[11px] border border-neutral-300 rounded-md px-2 py-1 text-neutral-700 bg-white focus:outline-none focus:ring-1 focus:ring-brand-red/30 cursor-pointer"
                    >
                      {ROUNDING_OPTIONS.filter((opt) => Math.pow(10, opt.value) < subtotalAfterPPN).map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
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
