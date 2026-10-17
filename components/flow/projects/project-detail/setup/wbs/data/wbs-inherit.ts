import type { WBSItem } from "./wbs.types";
import type { WBSItemInput } from "./wbs.withIds";
import { withIds } from "./wbs.withIds";

/**
 * Delta items ditulis TANPA id (biar data gampang).
 * ID akan di-generate saat di-attach.
 */
export type EstimatesDeltaItem = {
  parentCode: string;     // contoh: "S.2"
  items: WBSItemInput[];  // level 3 (tanpa id)
};

export function cloneTree(items: WBSItem[]): WBSItem[] {
  // clone TANPA bikin id baru (id tetap stabil untuk node yang sudah ada)
  return items.map((i) => ({
    ...i,
    children: i.children ? cloneTree(i.children) : undefined,
  }));
}

export function buildEstimatesFromBallpark(
  ballpark: WBSItem[],
  delta: EstimatesDeltaItem[]
): WBSItem[] {
  const base = cloneTree(ballpark);

  function attach(nodes: WBSItem[]) {
    for (const n of nodes) {
      const cleanCode = n.code.replace(/^[A-Z]\./, "");
      const hit = delta.find((d) => d.parentCode === n.code || d.parentCode === cleanCode);

      if (hit) {
        // inject id untuk item delta
        const deltaWithIds = withIds(hit.items);

        // Prefix delta items code if parent node has a building prefix
        const prefix = n.code.match(/^[A-Z]\./) ? n.code.split(".")[0] + "." : "";
        const prefixedDelta = deltaWithIds.map((dItem) => ({
          ...dItem,
          code: prefix ? `${prefix}${dItem.code}` : dItem.code,
        }));

        n.children = [...(n.children ?? []), ...cloneTree(prefixedDelta)];
      }

      if (n.children?.length) attach(n.children);
    }
  }

  attach(base);
  return base;
}
