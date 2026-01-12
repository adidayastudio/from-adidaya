"use client";

import { RABItem, RABMode } from "./types/rab.types";
import RABBreakdownList from "./RABBreakdownList";

import { EstimateValue } from "./data/rab-estimates-builder";

type Props = {
  items: RABItem[];
  total: number;
  area: number;
  mode: RABMode;
  onPriceCommit?: (code: string, value: number) => void;
  onEstimateCommit?: (code: string, value: { volume: number; unit: string; unitPrice: number }) => void;
  onSelect?: (item: RABItem) => void;
};

export default function RABBreakdownTable({
  items,
  total,
  area,
  mode,
  onPriceCommit,
  onEstimateCommit,
  onSelect,
}: Props) {
  return (
    <div className="w-full text-xs animate-in fade-in">
      <table className="w-full border-collapse">
        <thead className="sticky top-0 bg-neutral-50 z-10">
          <tr className="border-b border-neutral-200 text-neutral-500 font-medium">
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
                <th className="py-3 text-right w-24">Volume</th>
                <th className="py-3 text-center w-16">Unit</th>
                <th className="py-3 text-right w-32">Unit Price</th>
                <th className="py-3 text-right w-32">Total</th>
              </>
            )}
          </tr>
        </thead>


        <tbody>
          {/* ===== TOTAL PROJECT ROW (Breakdown) ===== */}
          <tr className="border-b border-neutral-200 font-semibold bg-neutral-50/50">
            <td className="py-3" />
            <td className="py-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full border border-neutral-300 bg-neutral-100 text-[10px] font-bold text-neutral-600">
                RAB
              </div>
            </td>
            <td className="py-3 text-neutral-900">
              Total Project Cost
            </td>

            {mode === "BALLPARK" && (
              <>
                <td className="py-3 text-right">
                  Rp {Math.round(area > 0 ? total / area : 0).toLocaleString("id-ID")}
                </td>
                <td className="py-3 text-right text-neutral-900">
                  Rp {Math.round(total).toLocaleString("id-ID")}
                </td>
                <td className="py-3 text-right">
                  100.00%
                </td>
              </>
            )}

            {(mode === "ESTIMATES" || mode === "DETAIL") && (
              <>
                <td />
                <td />
                <td />
                <td className="py-3 text-right text-neutral-900">
                  Rp {Math.round(total).toLocaleString("id-ID")}
                </td>
              </>
            )}
          </tr>

          <RABBreakdownList
            items={items}
            level={0}
            total={total}
            area={area}
            mode={mode}
            onPriceCommit={onPriceCommit}
            onEstimateCommit={onEstimateCommit}
            onSelect={onSelect}
          />
        </tbody>
      </table>
    </div>
  );
}
