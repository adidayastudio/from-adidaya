export type WBSAction = 'up' | 'down' | 'indent' | 'outdent' | 'duplicate' | 'delete';
export function wbsParent(row: any, rows: any[]): string | null {
    if (row.parent_id) return row.parent_id;
    const code = row.wbs_code || ''; const dot = code.lastIndexOf('.');
    return dot < 0 ? null : rows.find(item => item.wbs_code === code.slice(0, dot))?.id || null;
}
function ordered(rows: any[], parentId: string | null) {
    return rows.filter(row => wbsParent(row, rows) === parentId).sort((a, b) => Number(a.position || 0) - Number(b.position || 0) || a.wbs_code.localeCompare(b.wbs_code, undefined, { numeric: true }));
}
function normalize(rows: any[]): any[] {
    const result: any[] = [];
    const visit = (parentId: string | null, level: number, parentCode = '') => ordered(rows, parentId).forEach((row, position) => {
        const code = parentId ? `${parentCode}.${position + 1}` : row.wbs_code;
        result.push({ ...row, meta: code !== row.wbs_code ? { ...row.meta, wbsSourceCode: row.meta?.wbsSourceCode || row.wbs_code } : row.meta, wbs_code: code, parent_id: parentId, position, level, is_leaf: !rows.some(child => wbsParent(child, rows) === row.id) });
        visit(row.id, level + 1, code);
    });
    visit(null, 0); return result;
}
export function reorderWBS(rows: any[], sourceId: string, targetId: string): any[] {
    const source = rows.find(row => row.id === sourceId), target = rows.find(row => row.id === targetId);
    if (!source || !target || sourceId === targetId) return rows;
    const parent = wbsParent(source, rows);
    if (parent !== wbsParent(target, rows)) throw new Error('Drop between work items in the same group. Use Indent or Outdent to change levels.');
    const siblings = ordered(rows, parent), from = siblings.findIndex(row => row.id === sourceId), to = siblings.findIndex(row => row.id === targetId);
    siblings.splice(from, 1); siblings.splice(to, 0, source);
    return normalize(rows.map(row => { const position = siblings.findIndex(item => item.id === row.id); return position < 0 ? row : { ...row, position }; }));
}
export function actOnWBS(rows: any[], id: string, action: WBSAction, makeId: () => string): any[] {
    const node = rows.find(row => row.id === id); if (!node) throw new Error('Work item no longer exists.');
    const parentId = wbsParent(node, rows), siblings = ordered(rows, parentId), index = siblings.findIndex(row => row.id === id);
    const descendants = new Set([id]); let count = -1;
    while (count !== descendants.size) { count = descendants.size; rows.forEach(row => { if (descendants.has(wbsParent(row, rows) || '')) descendants.add(row.id); }); }
    if (action === 'up' || action === 'down') { const neighbor = siblings[index + (action === 'up' ? -1 : 1)]; return neighbor ? reorderWBS(rows, id, neighbor.id) : rows; }
    if (!parentId) throw new Error('Discipline groups can be reordered. Add or edit work inside a discipline.');
    if (action === 'delete') return normalize(rows.filter(row => !descendants.has(row.id)));
    let nextParentId = parentId;
    if (action === 'indent') { if (index === 0) throw new Error('There is no preceding work item to indent under.'); nextParentId = siblings[index - 1].id; }
    if (action === 'outdent') { const parent = rows.find(row => row.id === parentId); nextParentId = wbsParent(parent, rows)!; if (!nextParentId) throw new Error('Work must remain inside a discipline.'); }
    const nextParent = rows.find(row => row.id === nextParentId);
    const nextSiblings = ordered(rows, nextParentId);
    const number = Math.max(0, ...nextSiblings.map(row => Number(row.wbs_code.split('.').pop()) || 0)) + 1;
    const nextCode = `${nextParent.wbs_code}.${number}`;
    if (action === 'duplicate') {
        const ids = new Map(rows.filter(row => descendants.has(row.id)).map(row => [row.id, makeId()]));
        const copies = rows.filter(row => descendants.has(row.id)).map(row => ({ ...row, id: ids.get(row.id), parent_id: row.id === id ? parentId : ids.get(wbsParent(row, rows)!), wbs_code: nextCode + row.wbs_code.slice(node.wbs_code.length), title: row.id === id ? `Copy of ${row.title}` : row.title, position: row.id === id ? nextSiblings.length : row.position }));
        return normalize([...rows, ...copies]);
    }
    return normalize(rows.map(row => descendants.has(row.id) ? { ...row, parent_id: row.id === id ? nextParentId : wbsParent(row, rows), wbs_code: nextCode + row.wbs_code.slice(node.wbs_code.length), position: row.id === id ? nextSiblings.length : row.position } : row));
}

export function addWBSDiscipline(rows: any[], code: string, title: string, titleId: string, id: string) {
    const cleanCode = code.trim().toUpperCase();
    if (!/^[A-Z][A-Z0-9_-]{0,7}$/.test(cleanCode)) throw new Error('Use 1–8 letters or numbers for the discipline code, starting with a letter.');
    if (!title.trim()) throw new Error('Enter a discipline name.');
    if (rows.some(row => row.wbs_code === cleanCode)) throw new Error('This discipline code is already used.');
    return [...rows, { id, wbs_code: cleanCode, title: title.trim(), title_en: titleId.trim(), parent_id: null, level: 0, position: rows.filter(row => !wbsParent(row, rows)).length, is_leaf: true, meta: {} }];
}
