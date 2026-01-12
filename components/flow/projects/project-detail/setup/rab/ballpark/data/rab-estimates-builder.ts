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
    // Here we might look up standard prices or use node defaults
    // For now, let's assume node has a base price or we ignore it
    const basePrice = node.price || 0;

    // Apply factors (just example)
    const adjustedDefaultPrice = Math.round(basePrice * rf * df * (adjustmentFactor / 100));

    const defaultUnit = node.unit || "ls";

    // 2. Resolve final EstimateValue
    // Logic: If user has edited (in values), use that.
    // If not, use defaults: volume=0, unitPrice=adjustedDefaultPrice

    // Existing value from State
    const existingVal = values[node.code];

    const customVal: EstimateValue = existingVal || {
        volume: 0,
        unit: defaultUnit,
        unitPrice: adjustedDefaultPrice,
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
        code: node.code,
        nameEn: node.nameEn,
        nameId: node.nameId,
        unitPrice: customVal.unitPrice,
        volume: customVal.volume,
        unit: customVal.unit,
        total: total,
        children: childItems.length > 0 ? childItems : undefined
    };

    return item;
}
