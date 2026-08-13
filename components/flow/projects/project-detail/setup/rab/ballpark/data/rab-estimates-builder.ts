import { RABItem } from "../types/rab.types";

// Local type definition to match actual data structure (bypassing messy imports)
type WBSNode = {
    code: string;
    nameEn: string;
    nameId?: string;
    unitPrice?: number;
    unit?: string;
    children?: WBSNode[];
    total?: number;
};

export type EstimateValue = {
    volume: number;
    unit: string;
    unitPrice: number;
};

export type EstimateValues = Record<string, EstimateValue>;

export type EstimateContext = {
    rabClass: "A" | "B" | "C" | "D";
    rf: number;
    df: number;
    adjustmentFactor: number;
};

// Factors relative to Class C (Standard Government Building Baseline)
const CLASS_FACTORS = {
    A: 1.5,   // Luxury
    B: 1.25,  // Premium (Non-Standard Gov)
    C: 1.0,   // Standard (Gov Baseline)
    D: 0.85   // Basic
};

/**
 * Deterministic "random" noise based on string hash.
 * Returns a factor between 0.98 and 1.02 (+/- 2%)
 */
function getNaturalizeFactor(code: string): number {
    let hash = 0;
    for (let i = 0; i < code.length; i++) {
        hash = (hash << 5) - hash + code.charCodeAt(i);
        hash |= 0;
    }
    // Normalize to -0.02 to 0.02
    const variance = (Math.abs(hash) % 40) / 1000 - 0.02;
    return 1 + variance;
}

export function buildRABEstimates(
    wbsTree: any[], // Raw WBS with text/unit
    values: EstimateValues,
    context: EstimateContext
): RABItem[] {
    const { rabClass, rf, df, adjustmentFactor } = context;

    return wbsTree.map(node => processNode(node, values, context));
}

function processNode(node: any, values: EstimateValues, context: EstimateContext): RABItem {
    const { rabClass, rf, df, adjustmentFactor } = context;

    // 1. Calculate Default Price (Adjusted)
    const basePrice = node.unitPrice ?? node.price ?? 0;
    const adjustedDefaultPrice = Math.round(basePrice * rf * df * (adjustmentFactor / 100));
    const defaultUnit = node.unit || "m³";

    // 2. Resolve final EstimateValue
    const strippedCode = (node.code || "").replace(/^[A-Z]\./, "");
    const existingVal = values[node.code] || values[strippedCode];
    const nodeDefaultVolume = node.quantity ?? node.volume ?? 0;

    const resolvedVolume = (existingVal?.volume !== undefined && existingVal?.volume !== 0)
        ? existingVal.volume
        : nodeDefaultVolume;

    const resolvedUnitPrice = (existingVal?.unitPrice !== undefined && existingVal?.unitPrice !== 0)
        ? existingVal.unitPrice
        : (adjustedDefaultPrice !== 0 ? adjustedDefaultPrice : (node.unitPrice || 0));

    const resolvedUnit = existingVal?.unit || defaultUnit;

    const customVal: EstimateValue = {
        volume: resolvedVolume,
        unit: resolvedUnit,
        unitPrice: resolvedUnitPrice,
    };

    // Recursively process children
    const childItems = node.children ? node.children.map((child: any) => processNode(child, values, context)) : [];

    // 3. Create RAB Item
    let total = 0;
    if (childItems.length > 0) {
        total = childItems.reduce((sum: number, child: RABItem) => sum + (child.total || 0), 0);
    } else {
        total = (customVal.volume || 0) * (customVal.unitPrice || 0);
    }

    const item: RABItem = {
        id: node.id,
        projectId: node.project_id || node.projectId,
        code: node.code,
        nameEn: node.nameEn,
        nameId: node.nameId,
        unitPrice: customVal.unitPrice,
        volume: customVal.volume,
        unit: customVal.unit,
        total: total,
        notes: node.notes,
        ahsp_id: node.ahsp_id,
        children: childItems.length > 0 ? childItems : undefined
    };

    return item;
}
