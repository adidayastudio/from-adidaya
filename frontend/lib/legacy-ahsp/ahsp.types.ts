// AHSP - Analisa Harga Satuan Pekerjaan (Unit Price Analysis)
// This structure will be used for RAB, Schedule, and WBS Detail mode

export type AHSPCategory =
    | "PERSIAPAN"       // Site Preparation
    | "STRUKTUR"        // Structural
    | "ARSITEKTUR"      // Architecture
    | "PLUMBING"        // Plumbing
    | "MEP"             // Mechanical Electrical
    | "SITE_DEV";       // Site Development

export type AHSPUnit =
    | "m²"    // square meter
    | "m³"    // cubic meter
    | "m'"    // linear meter
    | "kg"    // kilogram
    | "unit"  // piece/unit
    | "set"   // set
    | "ls"    // lumpsum
    | "titik" // point (for electrical)
    | "btg";  // batang (bar/rod)

export interface AHSPComponent {
    name: string;
    unit: AHSPUnit | string;
    coefficient: number;
    unitPrice: number;
    total: number;
}

export interface AHSPItem {
    id: string;
    code: string;           // e.g., "6.1.1", "7.2.3.1"
    name: string;           // Uraian Pekerjaan
    nameId?: string;        // Indonesian name
    category: AHSPCategory;
    unit: AHSPUnit;
    unitPrice: number;      // Total harga satuan (after overhead)

    // Breakdown components
    labor?: AHSPComponent[];      // Tenaga Kerja
    materials?: AHSPComponent[];  // Bahan
    equipment?: AHSPComponent[];  // Peralatan

    // Calculated totals
    laborTotal?: number;
    materialTotal?: number;
    equipmentTotal?: number;
    overhead?: number;      // Usually 10-15%
}

// Flat list for searching
export interface AHSPSearchResult {
    id: string;
    code: string;
    name: string;
    category: AHSPCategory;
    unit: AHSPUnit;
    unitPrice: number;
}
