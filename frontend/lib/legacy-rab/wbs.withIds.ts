import type { WBSItem } from "./wbs.types";

/**
 * INPUT TYPE (TANPA id)
 * Dipakai untuk:
 * - ballpark
 * - addons
 * - delta estimates
 */
export type WBSItemInput = {
  code: string;
  nameEn: string;
  nameId?: string;
  unit?: string;
  unitPrice?: number;
  children?: WBSItemInput[];
};

function uid(prefix = "wbs") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export function withIds(items: WBSItemInput[]): WBSItem[] {
  const walk = (n: WBSItemInput): WBSItem => ({
    id: uid(),
    code: n.code,
    nameEn: n.nameEn,
    nameId: n.nameId,
    unit: n.unit,
    unitPrice: n.unitPrice,
    children: n.children?.map(walk),
  });

  return items.map(walk);
}
