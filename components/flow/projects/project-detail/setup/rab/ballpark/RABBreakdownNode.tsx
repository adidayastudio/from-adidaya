"use client";

import { useState, useEffect } from "react";
import { ChevronRight, ChevronDown, Calculator, User, Lock, Unlock } from "lucide-react";
import { RABItem, RABMode } from "./types/rab.types";
import RABBreakdownList from "./RABBreakdownList";
import { getNodeTotalPerM2 } from "./data/rab-utils";

type Props = {
  item: RABItem;
  level: number;
  total: number; // total project (Rp) - only used for weighting in Ballpark
  area: number; // m²
  mode: RABMode;
  onPriceCommit?: (code: string, value: number) => void;
  onEstimateCommit?: (code: string, value: { volume: number; unit: string; unitPrice: number }) => void;
  onSelect?: (item: RABItem) => void;
};

export default function RABBreakdownNode({
  item,
  level,
  total,
  area,
  mode,
  onPriceCommit,
  onEstimateCommit,
  onSelect,
}: Props) {
  const hasChildren = !!item.children?.length;
  const [open, setOpen] = useState(level === 0);

  /* ===============================
     CALCULATIONS
  =============================== */
  // BALLPARK CALC
  const ballparkPricePerM2 = hasChildren
    ? getNodeTotalPerM2(item)
    : item.unitPrice ?? 0;
  const ballparkTotal = Math.round(ballparkPricePerM2 * area);
  const ballparkWeight = total > 0 ? (ballparkTotal / total) * 100 : 0;

  // ESTIMATES CALC
  const estimateTotal = item.total ?? 0;

  /* ===============================
     INLINE EDIT (TOTAL COST)
  =============================== */
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<number>(0);

  // For Estimates Click-to-Edit
  const [editingField, setEditingField] = useState<"volume" | "unit" | "unitPrice" | null>(null);

  // Sync draft when editing starts
  function startEditing() {
    if (hasChildren) return;
    setDraft(ballparkTotal);
    setEditing(true);
  }

  function commitBallpark() {
    setEditing(false);
    if (hasChildren || !onPriceCommit) return;

    // Draft is TOTAL COST
    const v = Number(draft);
    if (!Number.isFinite(v) || v < 0) return;

    // Convert back to Unit Value
    const unitPrice = area > 0 ? v / area : 0;

    onPriceCommit(item.code, unitPrice);
  }

  /* ===============================
     DRAFTS FOR ESTIMATES
  =============================== */
  // We need to store local state for inputs. 
  // item.volume is the ACTIVE volume.

  const [estValues, setEstValues] = useState<{
    volume: number;
    unit: string;
    unitPrice: number;
  }>({
    volume: item.volume ?? 0,
    unit: item.unit ?? "ls",
    unitPrice: item.unitPrice ?? 0,
  });

  useEffect(() => {
    setEstValues({
      volume: item.volume ?? 0,
      unit: item.unit ?? "ls",
      unitPrice: item.unitPrice ?? 0,
    });
  }, [item.volume, item.unit, item.unitPrice]);


  function commitEstimate(field: keyof typeof estValues, value: string | number) {
    if (hasChildren || !onEstimateCommit) return;

    let newValue = { ...estValues };

    if (field === "unit") {
      // @ts-ignore
      newValue[field] = value;
    } else {
      const num = Number(value);
      if (!Number.isFinite(num)) return; // Don't commit invalid numbers
      // @ts-ignore
      newValue[field] = num;
    }

    setEstValues(newValue);
    onEstimateCommit(item.code, newValue);
  }

  return (
    <>
      <tr className={`border-b border-neutral-100 last:border-0 hover:bg-neutral-50/80 ${hasChildren ? "bg-neutral-50 font-semibold" : ""
        }`}>
        {/* CHEVRON */}
        <td className="py-2">
          <div style={{ marginLeft: level * 16 }}>
            {hasChildren && (
              <button
                onClick={() => setOpen(!open)}
                className="text-neutral-500 hover:text-neutral-700"
              >
                {open ? (
                  <ChevronDown size={12} />
                ) : (
                  <ChevronRight size={12} />
                )}
              </button>
            )}
          </div>
        </td>

        {/* CODE */}
        <td className="py-2">
          <div className={`flex items-center justify-center border text-[10px] font-bold transition-colors ${level === 0
            ? "w-7 h-7 rounded-full border-neutral-300 bg-neutral-100 text-neutral-600"
            : level === 1
              ? "w-6 h-6 rounded-full border-neutral-200 bg-neutral-50 text-neutral-500"
              : "px-2 h-5 rounded-full border-neutral-100 bg-white text-neutral-400"
            }`}>
            {item.code}
          </div>
        </td>

        {/* ITEM */}
        <td className="py-2">
          <div className="leading-tight">
            <div
              className={`text-neutral-900 ${mode === "DETAIL" && !hasChildren ? "cursor-pointer hover:text-brand-red hover:underline" : ""}`}
              onClick={() => {
                if (mode === "DETAIL" && !hasChildren && onSelect) {
                  onSelect(item);
                }
              }}
            >
              {item.nameEn}
            </div>
            {item.nameId && (
              <div className="italic text-neutral-400">
                {item.nameId}
              </div>
            )}
          </div>
        </td>

        {/* COLUMNS BASED ON MODE */}

        {/* BALLPARK MODE */}
        {mode === "BALLPARK" && (
          <>
            {/* PRICE / m² (READ ONLY) */}
            <td className="py-2 text-right text-neutral-500">
              Rp {Math.round(ballparkPricePerM2).toLocaleString("id-ID")}
            </td>

            {/* TOTAL COST (EDITABLE) */}
            <td className="py-2 text-right text-neutral-900">
              {!hasChildren && editing ? (
                <div className="flex flex-col items-end gap-1">
                  <input
                    type="number"
                    className="w-28 rounded border border-neutral-300 px-2 py-1 text-right text-xs focus:outline-none focus:ring-1 focus:ring-brand-red"
                    value={draft}
                    onChange={(e) => setDraft(Number(e.target.value))}
                    onBlur={commitBallpark}
                    onKeyDown={(e) => e.key === "Enter" && commitBallpark()}
                    autoFocus
                  />
                </div>
              ) : (
                <button
                  disabled={hasChildren}
                  onClick={startEditing}
                  className={`${hasChildren
                    ? "cursor-default text-neutral-900 font-medium"
                    : "hover:underline hover:text-brand-red text-neutral-900 font-medium"
                    }`}
                >
                  Rp {ballparkTotal.toLocaleString("id-ID")}
                </button>
              )}
            </td>

            {/* WEIGHT */}
            <td className="py-2 text-right text-neutral-700">
              {ballparkWeight.toFixed(2)}%
            </td>
          </>
        )}

        {/* ESTIMATES MODE */}
        {(mode === "ESTIMATES" || mode === "DETAIL") && (
          <>
            {/* VOLUME */}
            <td className="py-2 text-right">
              {!hasChildren ? (
                <div className="flex items-center justify-end gap-2 group">
                  {/* Volume Input */}
                  {editingField === "volume" ? (
                    <input
                      type="number"
                      className="w-20 rounded border border-neutral-300 px-2 py-1 text-right text-xs focus:outline-none focus:ring-1 focus:ring-brand-red"
                      value={estValues.volume}
                      onChange={(e) => commitEstimate("volume", e.target.value)}
                      onBlur={() => setEditingField(null)}
                      onKeyDown={(e) => e.key === "Enter" && setEditingField(null)}
                      autoFocus
                    />
                  ) : (
                    <div
                      onClick={() => setEditingField("volume")}
                      className="cursor-pointer px-2 py-1 text-neutral-900 hover:bg-neutral-100 rounded min-w-[3rem] text-right"
                    >
                      {estValues.volume || 0}
                    </div>
                  )}
                </div>
              ) : (
                <span className="text-neutral-300">-</span>
              )}
            </td>

            {/* UNIT */}
            <td className="py-2 text-center">
              {!hasChildren ? (
                editingField === "unit" ? (
                  <input
                    type="text"
                    className="w-12 rounded border border-neutral-300 px-1 py-1 text-center text-xs focus:outline-none focus:ring-1 focus:ring-brand-red"
                    value={estValues.unit}
                    onChange={(e) => commitEstimate("unit", e.target.value)}
                    onBlur={() => setEditingField(null)}
                    onKeyDown={(e) => e.key === "Enter" && setEditingField(null)}
                    autoFocus
                  />
                ) : (
                  <div
                    onClick={() => setEditingField("unit")}
                    className="cursor-pointer px-1 py-1 text-neutral-900 hover:bg-neutral-100 rounded"
                  >
                    {estValues.unit || "-"}
                  </div>
                )
              ) : (
                <span className="text-neutral-300">-</span>
              )}
            </td>

            {/* UNIT PRICE */}
            <td className="py-2 text-right">
              {!hasChildren ? (
                editingField === "unitPrice" ? (
                  <input
                    type="number"
                    className="w-28 rounded border border-neutral-300 px-2 py-1 text-right text-xs focus:outline-none focus:ring-1 focus:ring-brand-red"
                    value={estValues.unitPrice}
                    onChange={(e) => commitEstimate("unitPrice", e.target.value)}
                    onBlur={() => setEditingField(null)}
                    onKeyDown={(e) => e.key === "Enter" && setEditingField(null)}
                    autoFocus
                  />
                ) : (
                  <div
                    onClick={() => setEditingField("unitPrice")}
                    className="cursor-pointer px-2 py-1 text-neutral-900 hover:bg-neutral-100 rounded font-medium"
                  >
                    Rp {Math.round(estValues.unitPrice).toLocaleString("id-ID")}
                  </div>
                )
              ) : (
                <span className="text-neutral-300">-</span>
              )}
            </td>

            {/* TOTAL */}
            <td className="py-2 text-right font-medium text-neutral-900">
              Rp {estimateTotal.toLocaleString("id-ID")}
            </td>
          </>
        )}

      </tr>

      {/* CHILDREN */}
      {hasChildren && open && (
        <RABBreakdownList
          items={item.children!}
          level={level + 1}
          total={total}
          area={area}
          mode={mode}
          onPriceCommit={onPriceCommit}
          onEstimateCommit={onEstimateCommit}
          onSelect={onSelect}
        />
      )}
    </>
  );
}
