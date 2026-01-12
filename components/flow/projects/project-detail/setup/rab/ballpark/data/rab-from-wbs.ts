// components/flow/projects/project-detail/setup/rab/data/rab-from-wbs.ts

import type { WBSItem } from "@/components/flow/projects/project-detail/setup/wbs/data/wbs.types";
import type { RABItem } from "../types/rab.types";

import type { RABClass } from "./rab-prices";
import { RAB_BALLPARK_PRICES } from "./rab-prices";
import { getWeight } from "./rab-weights";
import { applyFactors } from "./rab-utils";

/* =========================================================
   PRINCIPLES (LOCKED)
   - SOURCE OF TRUTH is BREAKDOWN TREE
   - Parent nodes are containers (their unitPrice can be raw)
   - Leaf nodes get "NATURALIZE" exactly ONCE
   - NATURALIZE MUST BE DETERMINISTIC (NO Math.random) to avoid hydration mismatch
   - Weight lookup uses getWeight(code, class) for the CURRENT visible level codes
   - If some weights missing (0), redistribute safely
========================================================= */

type PriceRow = {
  code: string;
  classA: number;
  classB: number;
  classC: number;
};

/* =========================================================
   DETERMINISTIC "NATURALIZE" (NO SSR/CSR MISMATCH)
   - Produces subtle variation like naturalize()
   - Same input => same output (server === client)
   - Still rounds nicely (default: nearest 1,000)
========================================================= */

function hashStringToUint32(input: string): number {
  // FNV-1a 32-bit
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  // deterministic PRNG [0..1)
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function roundTo(value: number, step: number) {
  if (!Number.isFinite(value)) return 0;
  if (!Number.isFinite(step) || step <= 0) return Math.round(value);
  return Math.round(value / step) * step;
}

/**
 * Leaf-only stable naturalize:
 * - small jitter factor (default range 0.97..1.03)
 * - stable per (code + baseValue bucket)
 * - rounded to nearest 1,000 (biar tidak bulat banget tapi tetap rapi)
 */
function naturalizeStableLeaf(code: string, value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;

  // bucket biar jitter nggak berubah hanya karena floating tiny diff
  const bucket = roundTo(value, 500); // bucket 500-an dulu (stabil)
  const seed = hashStringToUint32(`${code}|${bucket}`);

  const rand = mulberry32(seed)(); // 0..1
  const min = 0.97;
  const max = 1.03;
  const factor = min + (max - min) * rand;

  // apply factor then round (natural look)
  const out = bucket * factor;

  // final rounding biar "natural" tapi gak terlalu random
  return roundTo(out, 1000);
}

/* =========================================================
   BALLPARK BASE (per m²)
========================================================= */

/**
 * Get base per-m² price from ballpark table by root code.
 * Root codes expected: "S", "A", "M", "I", "L" (optionally others)
 */
function getBasePerM2FromBallpark(rootCode: string, rabClass: RABClass): number {
  const row = (RAB_BALLPARK_PRICES as PriceRow[]).find((p) => p.code === rootCode);
  if (!row) return 0;

  if (rabClass === "A") return row.classA ?? 0;
  if (rabClass === "B") return row.classB ?? 0;
  return row.classC ?? 0;
}

/**
 * Apply RF/DF to per-m² base.
 * IMPORTANT: applyFactors ONLY ONCE at root allocation.
 */
function applyRfDf(basePerM2: number, rf: number, df: number): number {
  if (!Number.isFinite(basePerM2)) return 0;
  const safeRf = Number.isFinite(rf) && rf > 0 ? rf : 1;
  const safeDf = Number.isFinite(df) && df > 0 ? df : 1;
  return applyFactors(basePerM2, safeRf, safeDf);
}

/* =========================================================
   WEIGHT ENGINE (auto-redistribute)
========================================================= */

/**
 * Normalize weights for CURRENT visible children.
 * - uses getWeight(code, class) at this level
 * - if all missing -> equal split
 */
function computeChildWeights(children: WBSItem[], rabClass: RABClass): number[] {
  const raw = children.map((c) => {
    const w = getWeight(c.code || "", rabClass);
    return Number.isFinite(w) && w > 0 ? w : 0;
  });

  const sum = raw.reduce((a, b) => a + b, 0);
  if (sum > 0) return raw;

  // all missing -> equal split
  const n = children.length;
  if (n <= 0) return [];
  return children.map(() => 1);
}

/**
 * Distribute parentValuePerM2 to children (per m²) based on weights.
 * Auto-redistribute when number of children changes.
 */
function distributePerM2ToChildren(
  children: WBSItem[],
  parentValuePerM2: number,
  rabClass: RABClass
): Array<{ child: WBSItem; portionPerM2: number }> {
  const weights = computeChildWeights(children, rabClass);
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  return children.map((child, idx) => {
    const w = weights[idx] ?? 0;
    const portion = totalWeight > 0 ? parentValuePerM2 * (w / totalWeight) : 0;
    return { child, portionPerM2: portion };
  });
}

/* =========================================================
   TREE BUILDER (recursive)
========================================================= */

/**
 * Recursively build RAB tree:
 * - Root nodes get base from ballpark + RF/DF (applied once)
 * - Each level distributes its parent portion using getWeight() of that level codes
 * - Leaf gets naturalizeStableLeaf() once (deterministic)
 *
 * NOTE:
 * - Parent unitPrice is set to its raw portion per m² (debug-friendly),
 *   BUT UI totals must use getNodeTotalPerM2() (sum leaf) — as you already do.
 */
function buildNode(item: WBSItem, portionPerM2: number, rabClass: RABClass): RABItem {
  const hasChildren = !!item.children?.length;

  if (!hasChildren) {
    // ✅ leaf: deterministic naturalize ONCE (safe for SSR/CSR)
    const leaf = naturalizeStableLeaf(item.code, portionPerM2);
    return {
      code: item.code,
      nameEn: item.nameEn,
      nameId: item.nameId,
      unitPrice: leaf, // per m²
      children: [],
    };
  }

  const pairs = distributePerM2ToChildren(item.children!, portionPerM2, rabClass);
  const children = pairs.map(({ child, portionPerM2: childPortion }) =>
    buildNode(child, childPortion, rabClass)
  );

  return {
    code: item.code,
    nameEn: item.nameEn,
    nameId: item.nameId,
    unitPrice: portionPerM2, // raw container per m²
    children,
  };
}

/* =========================================================
   PUBLIC API
========================================================= */

export function buildRABFromWBS({
  wbs,
  rabClass,
  rf,
  df,
}: {
  wbs: WBSItem[];
  rabClass: RABClass;
  rf: number;
  df: number;
}): RABItem[] {
  return wbs.map((root) => {
    const basePerM2 = getBasePerM2FromBallpark(root.code, rabClass);
    const rootPerM2 = applyRfDf(basePerM2, rf, df);
    return buildNode(root, rootPerM2, rabClass);
  });
}
