import type { WBSItem, WBSMode, WBSView } from "./wbs.types";

/* ================================
  ID
================================ */
let uidCounter = 0;
export function uid(prefix = "wbs") {
  uidCounter = (uidCounter + 1) % 1000000;
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}_${Date.now().toString(36)}_${uidCounter}`;
}

/* ================================
  MODE/VIEWS DEPTH RULES (sesuai rule kamu)
================================ */
// Ballpark: summary L1, breakdown L1-L2
// Estimates: summary L1-L2, breakdown L3
// Detail: summary L1-L2, breakdown L3++ (3-5)
export function getMaxDepth(mode: WBSMode, view: WBSView): number {
  if (mode === "BALLPARK") return view === "SUMMARY" ? 1 : 2;
  if (mode === "ESTIMATES") return view === "SUMMARY" ? 2 : 3;
  return view === "SUMMARY" ? 2 : 5; // DETAIL
}

export function pruneToDepth(items: WBSItem[], maxDepth: number, depth = 1): WBSItem[] {
  return items.map((n) => {
    if (depth >= maxDepth) return { ...n, children: undefined };
    if (!n.children?.length) return n;
    return { ...n, children: pruneToDepth(n.children, maxDepth, depth + 1) };
  });
}

/* ================================
  CODE GENERATION (auto-numbering)
================================ */
// level-1: code = "S" / "A" / "M" / "I" / "L" / custom
// child: parentCode + "." + (index+1)
function childCode(parentCode: string, idx1Based: number) {
  return `${parentCode}.${idx1Based}`;
}

function recodeNode(node: WBSItem, expectedCode: string): WBSItem {
  const next: WBSItem = { ...node, code: expectedCode };
  if (!node.children?.length) return next;

  const children = node.children.map((c, i) =>
    recodeNode(c, childCode(expectedCode, i + 1))
  );

  return { ...next, children };
}

export function normalizeCodes(roots: WBSItem[]): WBSItem[] {
  // root codes dipertahankan (S/A/M/…)
  return roots.map((r) => recodeNode(r, r.code));
}

/* ================================
  FIND / UPDATE (immutables)
================================ */
export function updateById(tree: WBSItem[], id: string, patch: Partial<WBSItem>): WBSItem[] {
  return tree.map((n) => {
    if (n.id === id) return { ...n, ...patch };
    if (!n.children?.length) return n;
    return { ...n, children: updateById(n.children, id, patch) };
  });
}

export function findById(tree: WBSItem[], id: string): WBSItem | null {
  for (const n of tree) {
    if (n.id === id) return n;
    if (n.children?.length) {
      const got = findById(n.children, id);
      if (got) return got;
    }
  }
  return null;
}

/* ================================
  ADD / REMOVE with auto-renumber
================================ */
export function addChildById(tree: WBSItem[], parentId: string, item: Omit<WBSItem, "code">): WBSItem[] {
  const next = tree.map((n) => {
    if (n.id === parentId) {
      const children = [...(n.children ?? []), { ...item, code: "TEMP" } as WBSItem];
      return { ...n, children };
    }
    if (!n.children?.length) return n;
    return { ...n, children: addChildById(n.children, parentId, item) };
  });

  // recode full tree so numbering always contiguous
  return normalizeCodes(next);
}

export function removeById(tree: WBSItem[], id: string): WBSItem[] {
  const filtered = tree
    .filter((n) => n.id !== id)
    .map((n) =>
      n.children?.length ? { ...n, children: removeById(n.children, id) } : n
    );

  return normalizeCodes(filtered);
}

/* ================================
  ADD DISCIPLINE (level-1 root)
================================ */
export function addRootDiscipline(
  tree: WBSItem[],
  root: { code: string; nameEn: string; nameId?: string; children?: WBSItem[] }
): WBSItem[] {
  const newRoot: WBSItem = {
    id: uid("root"),
    code: root.code.trim().toUpperCase(),
    nameEn: root.nameEn,
    nameId: root.nameId,
    children: root.children,
  };

  // prevent duplicates by root code
  const exists = tree.some((t) => t.code === newRoot.code);
  const next = exists ? tree : [...tree, newRoot];
  return normalizeCodes(next);
}

/* ================================
  INHERIT CHAIN (ballpark -> estimates -> detail)
  (nama & struktur ikut, detail makin dalam via delta nanti)
================================ */
export function inheritTree(base: WBSItem[]): WBSItem[] {
  const clone = (n: WBSItem): WBSItem => ({
    id: uid("wbs"),
    code: n.code,
    nameEn: n.nameEn,
    nameId: n.nameId,
    children: n.children?.map(clone),
  });
  return base.map(clone);
}

/* ================================
  ADVANCED TREE MANIPULATION (INDENT, OUTDENT, DUPLICATE, MOVE)
================================ */

function formatDuplicateName(name: string): string {
  if (!name) return name;
  const match = name.match(/\s*\((\d+)\)$/);
  if (match) {
    const num = parseInt(match[1], 10) + 1;
    return name.replace(/\s*\((\d+)\)$/, ` (${num})`);
  }
  return `${name} (2)`;
}

function cloneNodeWithNewIds(node: WBSItem, isRoot = true): WBSItem {
  return {
    ...node,
    id: uid("wbs"),
    nameEn: isRoot ? formatDuplicateName(node.nameEn) : node.nameEn,
    nameId: isRoot && node.nameId ? formatDuplicateName(node.nameId) : node.nameId,
    children: node.children ? node.children.map(c => cloneNodeWithNewIds(c, false)) : undefined
  };
}

export function duplicateNodeById(tree: WBSItem[], targetId: string): WBSItem[] {
  if (!targetId) return tree;

  const duplicateInArray = (items: WBSItem[]): WBSItem[] => {
    return items.flatMap((item) => {
      const isMatch = (item.id && item.id === targetId) || (item.code && item.code === targetId);

      if (isMatch) {
        return [item, cloneNodeWithNewIds(item)];
      }

      if (item.children?.length) {
        return [{ ...item, children: duplicateInArray(item.children) }];
      }

      return [item];
    });
  };

  const next = duplicateInArray(tree);
  return normalizeCodes(next);
}

export function indentNodeById(tree: WBSItem[], id: string): WBSItem[] {
  const indentInArray = (items: WBSItem[]): WBSItem[] => {
    const idx = items.findIndex(item => item.id === id);
    if (idx > 0) {
      const nodeToIndent = items[idx];
      const prevSibling = { ...items[idx - 1] };
      const updatedChildren = [...(prevSibling.children ?? []), nodeToIndent];
      prevSibling.children = updatedChildren;
      
      const newItems = [...items];
      newItems.splice(idx - 1, 2, prevSibling);
      return newItems;
    }

    return items.map(item => {
      if (!item.children?.length) return item;
      return { ...item, children: indentInArray(item.children) };
    });
  };

  const next = indentInArray(tree);
  return normalizeCodes(next);
}

export function outdentNodeById(tree: WBSItem[], id: string): WBSItem[] {
  const outdentFromTree = (items: WBSItem[]): { newTree: WBSItem[]; extractedNode?: WBSItem } => {
    let extracted: WBSItem | undefined = undefined;
    const newItems: WBSItem[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.children?.length) {
        const childIdx = item.children.findIndex(c => c.id === id);
        if (childIdx !== -1) {
          extracted = item.children[childIdx];
          const newChildren = item.children.filter(c => c.id !== id);
          const updatedParent = { ...item, children: newChildren.length > 0 ? newChildren : undefined };
          newItems.push(updatedParent);
          newItems.push(extracted);
          continue;
        }

        const res = outdentFromTree(item.children);
        if (res.extractedNode) {
          newItems.push({ ...item, children: res.newTree.length > 0 ? res.newTree : undefined });
          extracted = res.extractedNode;
          continue;
        }
      }
      newItems.push(item);
    }

    return { newTree: newItems, extractedNode: extracted };
  };

  const { newTree } = outdentFromTree(tree);
  return normalizeCodes(newTree);
}

export function moveNodeDirectionById(tree: WBSItem[], id: string, direction: "up" | "down"): WBSItem[] {
  const DEFAULT_ROOTS = ["S", "A", "M"];
  
  const moveInArray = (items: WBSItem[]): WBSItem[] => {
    const idx = items.findIndex(item => item.id === id);
    if (idx !== -1) {
      const targetIdx = direction === "up" ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= items.length) return items;

      if (DEFAULT_ROOTS.includes(items[idx].code) || DEFAULT_ROOTS.includes(items[targetIdx].code)) {
        return items;
      }

      const newItems = [...items];
      const [moved] = newItems.splice(idx, 1);
      newItems.splice(targetIdx, 0, moved);
      return newItems;
    }

    return items.map(item => {
      if (!item.children?.length) return item;
      return { ...item, children: moveInArray(item.children) };
    });
  };

  const next = moveInArray(tree);
  return normalizeCodes(next);
}
