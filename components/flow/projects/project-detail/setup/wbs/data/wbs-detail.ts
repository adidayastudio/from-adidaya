// WBS Detail Mode Data
// Clean passthrough without auto-injecting arbitrary extra items

import type { WBSItem } from "./wbs.types";

export const WBS_DETAIL_EXTENSIONS: Record<string, Omit<WBSItem, "id">[]> = {};

// Function to build Detail tree from Estimates cleanly
export function buildDetailFromEstimates(estimatesTree: WBSItem[]): WBSItem[] {
    return estimatesTree;
}
