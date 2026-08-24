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

export function buildWBSTree(items: any[]): WBSNode[] {
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
        nodes.sort((a, b) => compareWBSCodes(a.code || a.wbsCode, b.code || b.wbsCode));
        nodes.forEach((n) => {
            if (n.children && n.children.length > 0) sortNodes(n.children);
        });
    };

    sortNodes(roots);
    return roots;
}

export function ensureMultiBuildingWBS(wbsTree: any[], project: any): any[] {
    const count = project?.building_mass_count || (project?.meta as any)?.buildingMassCount || (Array.isArray((project?.meta as any)?.buildingMasses) ? (project?.meta as any)?.buildingMasses.length : 1);
    let masses = project?.building_masses || (project?.meta as any)?.buildingMasses || [];

    if (!Array.isArray(masses) || masses.length === 0) {
        if (count > 1) {
            masses = [
                { code: "A", name: "Main Building" },
                { code: "B", name: "Massa B" },
                { code: "C", name: "Site Work", isSiteWork: true }
            ];
        }
    }

    if (count <= 1 || masses.length === 0) {
        return wbsTree;
    }

    // Check if wbsTree is ALREADY multi-building (roots match building mass codes)
    const isAlreadyMultiBuilding = wbsTree.some((root) => masses.some((m: any) => m.code === root.code));

    if (isAlreadyMultiBuilding) {
        return wbsTree;
    }

    // Legacy single building tree -> wrap all existing items into Massa A, Massa B, Massa C...
    return masses.map((mass: any, idx: number) => {
        const prefix = mass.code;
        const massTitle = `${prefix}. ${mass.name}`;

        const prefixChildren = (nodes: any[]): any[] => {
            return nodes.map((node) => {
                let cleanCode = node.code || "";
                // Normalize double prefix if previously corrupted (e.g. S.S.1.1 -> S.1.1)
                cleanCode = cleanCode.replace(/^([SAMIL])\.\1\./, "$1.").replace(/^([SAMIL])\.\1$/, "$1");

                const isAlreadyPrefixed = cleanCode === prefix || cleanCode.startsWith(`${prefix}.`);
                const finalCode = isAlreadyPrefixed ? cleanCode : `${prefix}.${cleanCode}`;

                return {
                    ...node,
                    id: `node-${prefix}-${finalCode}-${node.id || idx}`,
                    code: finalCode,
                    children: node.children ? prefixChildren(node.children) : undefined,
                };
            });
        };

        return {
            id: `mass-${prefix}-${idx}`,
            code: prefix,
            nameEn: massTitle,
            nameId: massTitle,
            children: prefixChildren(wbsTree),
        };
    });
}

export function mergeWBSTrees(dbTree: any[], defaultTree: any[]): any[] {
    if (!dbTree || dbTree.length === 0) return defaultTree;
    if (!defaultTree || defaultTree.length === 0) return dbTree;

    const dbCodeMap = new Map<string, any>();
    const collectNodes = (nodes: any[]) => {
        nodes.forEach((n) => {
            if (n.code) dbCodeMap.set(n.code, n);
            if (n.children && n.children.length > 0) collectNodes(n.children);
        });
    };
    collectNodes(dbTree);

    const mergeNodes = (defNodes: any[]): any[] => {
        return defNodes.map((defNode) => {
            const dbNode = dbCodeMap.get(defNode.code);

            const mergedChildren = defNode.children ? mergeNodes(defNode.children) : [];

            if (dbNode) {
                const defChildCodes = new Set((defNode.children || []).map((c: any) => c.code));
                const extraDbChildren = (dbNode.children || []).filter((c: any) => !defChildCodes.has(c.code));

                return {
                    ...defNode,
                    ...dbNode,
                    children: [...mergedChildren, ...extraDbChildren],
                };
            }

            return {
                ...defNode,
                children: mergedChildren,
            };
        });
    };

    const merged = mergeNodes(defaultTree);

    // Filter out extra roots that look like sub-codes (e.g. "A.8") because they are merged into their parent "A"!
    const defRootCodes = new Set(defaultTree.map((d) => d.code));
    const extraRoots = dbTree.filter((r) => !defRootCodes.has(r.code) && !r.code.includes("."));

    return [...merged, ...extraRoots];
}

/**
 * Flatten tree back to list (for updates)
 */
export function flattenWBSTree(nodes: WBSNode[]): WBSRow[] {
    const result: WBSRow[] = [];

    const walk = (node: WBSNode) => {
        const { children, ...row } = node;
        result.push(row);
        children.forEach(walk);
    };

    nodes.forEach(walk);
    return result;
}

/**
 * Find node by ID in tree
 */
export function findWBSNode(nodes: WBSNode[], id: string): WBSNode | null {
    for (const node of nodes) {
        if (node.id === id) return node;
        const found = findWBSNode(node.children, id);
        if (found) return found;
    }
    return null;
}

/**
 * Find node by code in tree
 */
export function findWBSByCode(nodes: WBSNode[], code: string): WBSNode | null {
    for (const node of nodes) {
        if (node.wbs_code === code) return node;
        const found = findWBSByCode(node.children, code);
        if (found) return found;
    }
    return null;
}

/**
 * Get all leaf nodes
 */
export function getLeafNodes(nodes: WBSNode[]): WBSNode[] {
    const leaves: WBSNode[] = [];

    const walk = (node: WBSNode) => {
        if (node.is_leaf || node.children.length === 0) {
            leaves.push(node);
        } else {
            node.children.forEach(walk);
        }
    };

    nodes.forEach(walk);
    return leaves;
}

/**
 * Group items by stage
 */
export function groupByStage<T extends { stage_id?: string | null }>(
    items: T[]
): Map<string | null, T[]> {
    const map = new Map<string | null, T[]>();

    items.forEach((item) => {
        const key = item.stage_id ?? null;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(item);
    });

    return map;
}
