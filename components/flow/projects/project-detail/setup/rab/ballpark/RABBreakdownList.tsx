"use client";

import { RABItem, RABMode } from "./types/rab.types";
import RABBreakdownNode from "./RABBreakdownNode";

import { EstimateValue } from "./data/rab-estimates-builder";

type Props = {
  items: RABItem[];
  level: number;
  total: number;
  area: number;
  mode: RABMode;
  expandAllState?: boolean | null;
  onPriceCommit?: (code: string, value: number) => void;
  onEstimateCommit?: (code: string, value: { volume: number; unit: string; unitPrice: number }) => void;
  onSelect?: (item: RABItem, initialTab?: "BOQ" | "AHSP") => void;
};

export default function RABBreakdownList({
  items,
  level,
  total,
  area,
  mode,
  expandAllState,
  onPriceCommit,
  onEstimateCommit,
  onSelect,
}: Props) {
  return (
    <>
      {items.map((item) => (
        <RABBreakdownNode
          key={item.id || item.code}
          item={item}
          level={level}
          total={total}
          area={area}
          mode={mode}
          expandAllState={expandAllState}
          onPriceCommit={onPriceCommit}
          onEstimateCommit={onEstimateCommit}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}

