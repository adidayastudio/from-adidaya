"use client";

import { useMemo } from "react";
import { RABItem, RABMode } from "./types/rab.types";
import { getNodeTotalPerM2 } from "./data/rab-utils";

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
     TOTAL PROJECT COST (Rp)
     SOURCE OF TRUTH = BREAKDOWN
     (ROUND SEKALI DI SINI)
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
    return area > 0
      ? Math.round(totalProjectCost / area)
      : 0;
  }, [totalProjectCost, area]);

  return (
    <div className="w-full text-xs">
      <table className="w-full border-collapse">
        <thead className="sticky top-0 bg-neutral-50 z-10">
          <tr className="border-b border-neutral-200 text-neutral-500 font-medium">
            {/* SPACER (Chevron match) */}
            <th className="w-8 py-3" />

            <th className="py-3 text-left w-24">Code</th>
            <th className="py-3 text-left">Item</th>

            {mode === "BALLPARK" && (
              <>
                <th className="py-3 text-right w-32">Price / m²</th>
                <th className="py-3 text-right w-32">Total Cost</th>
                <th className="py-3 text-right w-20">Weight</th>
              </>
            )}

            {(mode === "ESTIMATES" || mode === "DETAIL") && (
              <>
                {/* Spacers for Volume/Unit/Price to align Total */}
                <th className="py-3 w-24" />
                <th className="py-3 w-16" />
                <th className="py-3 w-32" />
                <th className="py-3 text-right w-32">Total</th>
              </>
            )}
          </tr>
        </thead>

        <tbody>
          {/* ===== TOTAL PROJECT ===== */}
          <tr className="border-b border-neutral-200 font-semibold bg-neutral-50/50">
            <td className="py-3" />
            <td className="py-3 font-mono text-neutral-900">RAB</td>
            <td className="py-3 text-neutral-900">
              Total Project Cost
            </td>

            {mode === "BALLPARK" && (
              <td className="py-3 text-right">
                Rp {costPerM2.toLocaleString("id-ID")}
              </td>
            )}

            {(mode === "ESTIMATES" || mode === "DETAIL") && (
              <>
                <td />
                <td />
                <td />
              </>
            )}

            <td className="py-3 text-right text-neutral-900">
              Rp {totalProjectCost.toLocaleString("id-ID")}
            </td>

            {mode === "BALLPARK" && (
              <td className="py-3 text-right text-neutral-900">
                100.00%
              </td>
            )}
          </tr>

          {/* ===== DISCIPLINE ROWS ===== */}
          {items.map((row) => {
            const rowTotal = (mode === "ESTIMATES" || mode === "DETAIL")
              ? (row.total || 0)
              : Math.round(getNodeTotalPerM2(row) * area);

            const rowPerM2 = area > 0 ? Math.round(rowTotal / area) : 0;

            const weight =
              totalProjectCost > 0
                ? (rowTotal / totalProjectCost) *
                100
                : 0;

            return (
              <tr
                key={row.code}
                className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50"
              >
                <td className="py-2" />
                <td className="py-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full border border-neutral-300 bg-neutral-100 text-[10px] font-bold text-neutral-600">
                    {row.code}
                  </div>
                </td>

                <td className="py-2">
                  <div className="leading-tight">
                    <div className="text-neutral-900">
                      {row.nameEn}
                    </div>
                    {row.nameId && (
                      <div className="italic text-neutral-400">
                        {row.nameId}
                      </div>
                    )}
                  </div>
                </td>

                {mode === "BALLPARK" && (
                  <td className="py-2 text-right text-neutral-500">
                    Rp {rowPerM2.toLocaleString("id-ID")}
                  </td>
                )}

                {(mode === "ESTIMATES" || mode === "DETAIL") && (
                  <>
                    <td />
                    <td />
                    <td />
                  </>
                )}

                <td className="py-2 text-right text-neutral-900">
                  Rp {rowTotal.toLocaleString("id-ID")}
                </td>

                {mode === "BALLPARK" && (
                  <td className="py-2 text-right text-neutral-600">
                    {weight.toFixed(2)}%
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
