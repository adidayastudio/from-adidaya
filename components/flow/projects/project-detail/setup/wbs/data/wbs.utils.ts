import { WBSItem } from "./wbs.types";

export function updateItem(
  tree: WBSItem[],
  code: string,
  patch: Partial<WBSItem>
): WBSItem[] {
  return tree.map((n) => {
    if (n.code === code) return { ...n, ...patch };
    if (n.children)
      return { ...n, children: updateItem(n.children, code, patch) };
    return n;
  });
}

export function addChild(
  tree: WBSItem[],
  parentCode: string,
  item: WBSItem
): WBSItem[] {
  return tree.map((n) => {
    if (n.code === parentCode) {
      return { ...n, children: [...(n.children ?? []), item] };
    }
    if (n.children)
      return { ...n, children: addChild(n.children, parentCode, item) };
    return n;
  });
}

export function removeItem(tree: WBSItem[], code: string): WBSItem[] {
  return tree
    .filter((n) => n.code !== code)
    .map((n) =>
      n.children ? { ...n, children: removeItem(n.children, code) } : n
    );
}
