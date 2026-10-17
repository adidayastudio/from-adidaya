import type { WBSItem } from "./wbs.types";
import type { WBSItemInput } from "./wbs.withIds";
import { withIds } from "./wbs.withIds";

export type EstimatesDeltaItem = {
  parentCode: string;
  items: WBSItemInput[];
};

export function cloneTree(items: WBSItem[]): WBSItem[] {
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
        const deltaWithIds = withIds(hit.items);
        n.children = [...(n.children ?? []), ...cloneTree(deltaWithIds)];
      }

      if (n.children?.length) attach(n.children);
    }
  }

  attach(base);
  return base;
}
