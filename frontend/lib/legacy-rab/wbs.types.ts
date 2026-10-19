/**
 * WBS TYPES (SSOT)
 * Re-exports from unified types
 */

// Re-export from central types
export type { WBSItem } from "@/types/project";

// View/Mode types for UI
export type WBSView = "SUMMARY" | "BREAKDOWN";
export type WBSMode = "BALLPARK" | "ESTIMATES" | "DETAIL";

// Legacy input type (for templates without IDs)
export type WBSItemInput = {
  wbsCode: string;
  title: string;
  titleEn?: string;
  unit?: string;
  quantity?: number;
  children?: WBSItemInput[];
};

/**
 * Convert WBSItemInput (template) to WBSItem (with IDs)
 */
export function wbsInputToItem(
  input: WBSItemInput,
  projectId: string,
  parentId?: string,
  level: number = 0,
  position: number = 0
): import("@/types/project").WBSItem {
  const hasChildren = !!input.children?.length;

  return {
    id: crypto.randomUUID(),
    projectId,
    parentId,
    wbsCode: input.wbsCode,
    title: input.title,
    titleEn: input.titleEn,
    level,
    position,
    isLeaf: !hasChildren,
    unit: input.unit,
    quantity: input.quantity,
    meta: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    children: input.children?.map((child, idx) =>
      wbsInputToItem(child, projectId, undefined, level + 1, idx)
    ),
  };
}
