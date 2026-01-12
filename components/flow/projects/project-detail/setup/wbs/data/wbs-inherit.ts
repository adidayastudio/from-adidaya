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
      const hit = delta.find((d) => d.parentCode === n.code);

      if (hit) {
        // inject id untuk item delta
        const deltaWithIds = withIds(hit.items);

        // clone lagi biar aman (immutability)
        n.children = [...(n.children ?? []), ...cloneTree(deltaWithIds)];
      }

      if (n.children?.length) attach(n.children);
    }
  }

  attach(base);
  return base;
}
