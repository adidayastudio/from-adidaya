import type { WBSItem, WBSMode, WBSView } from "./wbs.types";

/* ================================
  ID
================================ */
export function uid(prefix = "wbs") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36)}`;
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
  // deep clone w/ stable IDs? untuk estimates/detail sebaiknya "new IDs" tapi still traceable.
  // SSOT: Ballpark jadi basis; estimates/detail turunan bisa id baru tapi kita tetap jaga stabil.
  const clone = (n: WBSItem): WBSItem => ({
    id: uid("wbs"),
    code: n.code,
    nameEn: n.nameEn,
    nameId: n.nameId,
    children: n.children?.map(clone),
  });
  return base.map(clone);
}
