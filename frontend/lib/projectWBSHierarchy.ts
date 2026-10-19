import { RAW_WBS_ESTIMATES_DELTA } from './legacy-rab/wbs-estimates';
/** Fill absent descendants from saved legacy hierarchy, otherwise use legacy catalog for empty groups. */
export function missingLegacyWBS(rows: any[], meta: any, makeId: () => string): any[] {
    const result = [...rows], added: any[] = [];
    const attach = (node: any, parentCode?: string) => {
        const code = node.wbs_code || node.code;
        if (!code) return;
        let item = result.find(row => row.wbs_code === code);
        if (!item) {
            const parent = result.find(row => row.wbs_code === parentCode);
            item = { id: makeId(), parent_id: parent?.id || null, wbs_code: code, title: node.nameEn || node.title || node.name || code, title_en: node.nameId || node.title_en || '', level: parent ? Number(parent.level || 0) + 1 : 0, position: result.length, is_leaf: !node.children?.length, unit: node.unit || null, quantity: node.quantity ?? node.volume ?? 0, meta: {} };
            result.push(item); added.push(item);
        }
        (node.children || []).forEach((child: any) => attach(child, code));
    };
    const stored = meta?.wbsTree || meta?.customWBS;
    if (Array.isArray(stored) && stored.length) stored.forEach(node => attach(node));
    else {
        for (const parent of rows) {
            const code = parent.wbs_code || '';
            if (rows.some(row => (row.wbs_code || '').startsWith(`${code}.`))) continue;
            const catalog = RAW_WBS_ESTIMATES_DELTA.find(group => group.parentCode === code || code.endsWith(`.${group.parentCode}`));
            if (!catalog) continue;
            const prefix = code.slice(0, code.length - catalog.parentCode.length);
            catalog.items.forEach(item => attach({ ...item, code: `${prefix}${item.code}` }, code));
        }
    }
    return added;
}
