import type { WBSItem } from "./wbs.types";
export function pruneToDepth(items: WBSItem[], maxDepth: number, depth = 1): WBSItem[] {
  const isMulti = items.some(n => n.children && n.children.some(c => (c.code || "").includes(".")));
  const targetMaxDepth = isMulti ? maxDepth + 1 : maxDepth;

  const prune = (nodes: WBSItem[], currentDepth: number): WBSItem[] => {
    return nodes.map((n) => {
      if (currentDepth >= targetMaxDepth) {
        return { ...n, children: undefined };
      }
      if (!n.children?.length) return n;
      return { ...n, children: prune(n.children, currentDepth + 1) };
    });
  };

  return prune(items, depth);
}
