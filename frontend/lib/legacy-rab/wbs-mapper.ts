/**
 * WBS TREE MAPPER
 * Converts flat list from DB to nested tree structure
 */

type WBSRow = {
    id: string;
    project_id: string;
    stage_id?: string | null;
    parent_id?: string | null;
    wbs_code: string;
    title: string;
    title_en?: string | null;
    level: number;
    position: number;
    is_leaf: boolean;
    quantity?: number | null;
    unit?: string | null;
    notes?: string | null;
    meta: Record<string, any>;
    created_at: string;
    updated_at: string;
};

export type WBSNode = WBSRow & { children: WBSNode[] };

/**
 * Build tree from flat list
 */
export const compareWBSCodes = (a: string, b: string): number => {
    const partsA = (a || "").split(".");
    const partsB = (b || "").split(".");
    const minLen = Math.min(partsA.length, partsB.length);
    const ORDER_MAP: Record<string, number> = { S: 1, A: 2, M: 3, I: 4, L: 5 };

    for (let i = 0; i < minLen; i++) {
        const partA = partsA[i];
        const partB = partsB[i];

        if (partA !== partB) {
            const orderA = ORDER_MAP[partA];
            const orderB = ORDER_MAP[partB];

            if (orderA !== undefined && orderB !== undefined) {
                if (orderA !== orderB) return orderA - orderB;
            }

            const numA = parseInt(partA);
            const numB = parseInt(partB);
            const isNumA = !isNaN(numA);
            const isNumB = !isNaN(numB);

            if (isNumA && isNumB) {
                if (numA !== numB) return numA - numB;
            } else {
                return partA.localeCompare(partB, undefined, { numeric: true, sensitivity: "base" });
            }
        }
    }
    return partsA.length - partsB.length;
};

export function buildWBSTree(items: any[], usePosition = false): WBSNode[] {
    if (!items || items.length === 0) return [];

    const idMap = new Map<string, any>();
    const codeMap = new Map<string, any>();

    // First pass: create nodes
    items.forEach((item) => {
        const code = item.wbs_code || item.code || item.wbsCode;
        const node = {
            ...item,
            id: item.id || code,
            code: code,
            nameEn: item.title || item.nameEn || item.name || "",
            nameId: item.title_en || item.nameId || item.title || item.description || "",
            unit: item.unit || "m³",
            quantity: item.quantity ?? item.volume ?? item.qty ?? 0,
            volume: item.quantity ?? item.volume ?? item.qty ?? 0,
            unitPrice: item.unit_price ?? item.unitPrice ?? item.price ?? 0,
            notes: item.notes || null,
            ahsp_id: item.ahsp_id || null,
            children: [],
        };
        if (item.id) idMap.set(item.id, node);
        if (code) codeMap.set(code, node);
    });

    const roots: any[] = [];

    codeMap.forEach((node) => {
        // 1. Try parent_id
        if (node.parent_id && idMap.has(node.parent_id)) {
            idMap.get(node.parent_id)!.children.push(node);
            return;
        }

        // 2. Try wbs_code dot notation (e.g. "S.1" -> parent "S", "A.S.1" -> parent "A.S")
        const lastDotIndex = node.code.lastIndexOf(".");
        if (lastDotIndex > 0) {
            const parentCode = node.code.substring(0, lastDotIndex);
            if (codeMap.has(parentCode)) {
                codeMap.get(parentCode)!.children.push(node);
                return;
            }
        }

        roots.push(node);
    });

    const sortNodes = (nodes: any[]) => {
        nodes.sort((a, b) => (usePosition ? Number(a.position || 0) - Number(b.position || 0) : 0) || compareWBSCodes(a.code || a.wbsCode, b.code || b.wbsCode));
        nodes.forEach((n) => {
            if (n.children && n.children.length > 0) sortNodes(n.children);
        });
    };

    sortNodes(roots);
    return roots;
}

