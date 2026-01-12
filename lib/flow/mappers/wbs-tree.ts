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
export function buildWBSTree(items: WBSRow[]): WBSNode[] {
    const map = new Map<string, WBSNode>();
    const roots: WBSNode[] = [];

    // First pass: create nodes
    items.forEach((item) => {
        map.set(item.id, { ...item, children: [] });
    });

    // Second pass: build tree
    map.forEach((node) => {
        if (node.parent_id && map.has(node.parent_id)) {
            map.get(node.parent_id)!.children.push(node);
        } else {
            roots.push(node);
        }
    });

    // Sort by position
    const sortByPosition = (nodes: WBSNode[]) => {
        nodes.sort((a, b) => a.position - b.position);
        nodes.forEach((n) => sortByPosition(n.children));
    };
    sortByPosition(roots);

    return roots;
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
