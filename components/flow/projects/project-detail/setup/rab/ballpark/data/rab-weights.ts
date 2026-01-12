import type { RABClass } from "./rab-prices";

export type RABWeightRow = {
  code: string; // WBS code
  weightA: number;
  weightB: number;
  weightC: number;
};

export const RAB_BALLPARK_WEIGHTS: RABWeightRow[] = [
  // ===== STRUCTURE =====
  { code: "S.1", weightA: 2, weightB: 3, weightC: 3.5 },
  { code: "S.2", weightA: 4, weightB: 5, weightC: 5.5 },
  { code: "S.3", weightA: 6, weightB: 7, weightC: 8 },
  { code: "S.4", weightA: 10, weightB: 11, weightC: 14.5 },
  { code: "S.5", weightA: 3, weightB: 4, weightC: 4.5 },

  // ===== ARCHITECTURE =====
  { code: "A.1", weightA: 4, weightB: 4, weightC: 4 },
  { code: "A.2", weightA: 6, weightB: 6, weightC: 5 },
  { code: "A.3", weightA: 7, weightB: 7, weightC: 6 },
  { code: "A.4", weightA: 5, weightB: 5, weightC: 4 },
  { code: "A.5", weightA: 3, weightB: 3, weightC: 3 },
  { code: "A.6", weightA: 3, weightB: 3, weightC: 3 },
  { code: "A.7", weightA: 6.5, weightB: 6, weightC: 5 },
  { code: "A.8", weightA: 3, weightB: 4, weightC: 4 },
  { code: "A.9", weightA: 6, weightB: 5, weightC: 4 },
  { code: "A.10", weightA: 1.5, weightB: 2, weightC: 2 },

  // ===== MEP =====
  { code: "M.1", weightA: 7, weightB: 6, weightC: 6 },
  { code: "M.2", weightA: 8, weightB: 6, weightC: 6 },
  { code: "M.3", weightA: 3, weightB: 3, weightC: 3 },
  { code: "M.4", weightA: 8, weightB: 6, weightC: 6 },
  { code: "M.5", weightA: 2, weightB: 3, weightC: 3 },
  { code: "M.6", weightA: 2, weightB: 1, weightC: 1 },

  // ===== INTERIOR =====
  { code: "I.1", weightA: 15, weightB: 11, weightC: 10 },
  { code: "I.2", weightA: 10, weightB: 9, weightC: 7 },
  { code: "I.3", weightA: 5, weightB: 7, weightC: 6 },

  // ===== LANDSCAPE =====
  { code: "L.1", weightA: 6, weightB: 5, weightC: 4 },
  { code: "L.2", weightA: 6, weightB: 5, weightC: 4 },
  { code: "L.3", weightA: 3, weightB: 3, weightC: 2 },
];

export function getWeight(
  code: string,
  rabClass: RABClass
): number {
  const row = RAB_BALLPARK_WEIGHTS.find(
    (r) => r.code === code
  );
  if (!row) return 0;

  return rabClass === "A"
    ? row.weightA
    : rabClass === "B"
    ? row.weightB
    : row.weightC;
}
