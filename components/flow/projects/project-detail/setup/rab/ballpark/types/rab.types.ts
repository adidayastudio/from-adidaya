/* =====================================
   RAB CORE TYPES (FINAL)
   Jangan dipecah lagi
===================================== */

/**
 * Mode perhitungan RAB
 */
export type RABMode = "BALLPARK" | "ESTIMATES" | "DETAIL";

/**
 * View tampilan RAB
 */
export type RABView = "SUMMARY" | "BREAKDOWN";

/**
 * Kelas bangunan
 */
export type RABClass = "A" | "B" | "C" | "D";

/**
 * Context proyek yang memengaruhi RAB
 */
export type RABContext = {
  buildingClass: RABClass;
  area: number;          // m²
  province: string;
  city: string;
  rf: number;            // regional factor
  df: number;            // difficulty factor
};

/* =====================================
   RAB ITEM (CORE TYPE)
===================================== */

/**
 * SATU-SATUNYA bentuk item RAB
 * Dipakai untuk:
 * - Summary
 * - Breakdown
 * - Detail
 *
 * Bilingual, mengikuti WBS
 */
export type RABItem = {
  code: string;          // S, A, M, I, L, S.1, A.02.01, dst
  nameEn: string;        // English name
  nameId?: string;       // Indonesian name
  unitPrice: number;    // BALLPARK: per m² (composite), ESTIMATES: per Unit
  volume?: number;      // ESTIMATES only
  unit?: string;        // ESTIMATES only
  total?: number;       // ESTIMATES: volume * unitPrice
  children?: RABItem[]; // Breakdown tree
};

/* =====================================
   ALIASES (BIAR SEMANTIK, BUKAN TIPE BARU)
===================================== */

/**
 * Summary item = RABItem tanpa children
 * (alias saja, bukan tipe baru)
 */
export type RABSummaryItem = Omit<RABItem, "children">;

/**
 * Breakdown item = RABItem
 */
export type RABBreakdownItem = RABItem;

/* =====================================
   HELPER TYPES (OPTIONAL, FUTURE)
===================================== */

/**
 * Untuk ESTIMATES / DETAIL nanti
 */
export type RABComputedItem = RABItem & {
  volume?: number;
  unit?: string;
  subtotal?: number;     // volume * harga satuan
};

/**
 * Result kalkulasi global
 */
export type RABResult = {
  totalPerM2: number;
  totalCost: number;
};
