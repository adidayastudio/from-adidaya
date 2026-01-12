export type RABClass = "A" | "B" | "C" | "D";

export type RABPriceRow = {
  code: string; // WBS root code (S, A, M, I, L)
  classA: number;
  classB: number;
  classC: number;
  classD: number;
};

export const RAB_BALLPARK_PRICES: RABPriceRow[] = [
  { code: "S", classA: 3625000, classB: 3150000, classC: 2625000, classD: 1968750 },
  { code: "A", classA: 6525000, classB: 4725000, classC: 3000000, classD: 2250000 },
  { code: "M", classA: 4350000, classB: 2625000, classC: 1875000, classD: 1406250 },
  { code: "I", classA: 4350000, classB: 2835000, classC: 1725000, classD: 1293750 },
  { code: "L", classA: 2175000, classB: 1365000, classC: 750000, classD: 562500 },
];
