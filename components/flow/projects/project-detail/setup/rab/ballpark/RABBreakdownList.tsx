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
  onPriceCommit?: (code: string, value: number) => void;
  onEstimateCommit?: (code: string, value: { volume: number; unit: string; unitPrice: number }) => void;
  onSelect?: (item: RABItem) => void;
};

export default function RABBreakdownList({
  items,
  level,
  total,
  area,
  mode,
  onPriceCommit,
  onEstimateCommit,
  onSelect,
}: Props) {
  return (
    <>
      {items.map((item) => (
        <RABBreakdownNode
          key={item.code}
          item={item}
          level={level}
          total={total}
          area={area}
          mode={mode}
          onPriceCommit={onPriceCommit}
          onEstimateCommit={onEstimateCommit}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}
