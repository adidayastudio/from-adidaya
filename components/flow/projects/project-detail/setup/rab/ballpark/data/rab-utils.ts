import type { RABItem } from "../types/rab.types";

/**
 * Apply RF & DF to base unit price (per m²)
 */
export function applyFactors(base: number, rf: number, df: number) {
  return base * rf * df;
}

/**
 * Make numbers feel natural (rounded to nearest 1,000)
 * NOTE: non-deterministic because Math.random()
 */
export function naturalize(value: number) {
  const factor = 0.97 + Math.random() * 0.06;
  return Math.round((value * factor) / 1000) * 1000;
}

/**
 * Sum unitPrice of a FLAT list (per m²).
 * Safe for undefined/null.
 */
export function sumUnitPrice(
  items: Array<{ unitPrice?: number | null }>
) {
  return items.reduce((s, i) => s + (i.unitPrice ?? 0), 0);
}

/**
 * ✅ Breakdown-safe: total PER m² for a tree node.
 * - Leaf   : unitPrice
 * - Parent : sum(children)
 *
 * This is the ONLY function the breakdown UI should use.
 */
export function getNodeTotalPerM2(item: RABItem): number {
  const children = item.children ?? [];
  if (children.length === 0) return item.unitPrice ?? 0;

  return children.reduce(
    (sum, child) => sum + getNodeTotalPerM2(child),
    0
  );
}
