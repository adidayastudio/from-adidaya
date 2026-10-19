/** Legacy WBS stores bilingual names either separately or as English (Indonesian). */
export function splitWBSNames(row: { title?: string | null; title_en?: string | null }) {
    const title = (row.title || '').trim();
    const match = title.match(/^(.*?)\s+\((.+)\)$/);
    return { title: match ? match[1].trim() : title, title_en: row.title_en?.trim() || (match ? match[2].trim() : '') };
}

export function newWBSWork(rows: any[], reference: any, child: boolean, id: string) {
    const code = reference.wbs_code || reference.code;
    const parentCode = child ? code : code.includes('.') ? code.slice(0, code.lastIndexOf('.')) : '';
    if (!parentCode) throw new Error('Add a subtask under a discipline to create work.');
    const parent = rows.find(row => (row.wbs_code || row.code) === parentCode);
    const siblings = rows.filter(row => {
        const key = row.wbs_code || row.code || ''; return key.slice(0, key.lastIndexOf('.')) === parentCode;
    });
    const next = Math.max(0, ...siblings.map(row => Number((row.wbs_code || row.code).split('.').pop()) || 0)) + 1;
    return { id, parent_id: parent?.id || null, wbs_code: `${parentCode}.${next}`, title: 'New Work', title_en: '', level: Number(parent?.level ?? parentCode.split('.').length - 1) + 1, position: next, is_leaf: true, meta: {} };
}
