import { supabase } from '@/lib/supabase';
export type WBSNameDraft = { title: string; title_en: string };
export async function saveProjectWBS(projectId: string, rows: any[], drafts: Record<string, WBSNameDraft>, submit = false, additions: any[] = []) {
    for (const [id, draft] of Object.entries(drafts)) {
        if (!draft.title.trim()) throw new Error('Enter an English name for every edited work item.');
        if (![...rows, ...additions].some(row => row.id === id)) throw new Error('This WBS item no longer exists. Reload before saving.');
    }
    const allRows = [...rows, ...additions];
    const codes = new Set<string>();
    for (const row of allRows) { if (!row.wbs_code || codes.has(row.wbs_code)) throw new Error('WBS codes must be unique.'); codes.add(row.wbs_code); }
    for (const row of additions) { if (!(drafts[row.id]?.title ?? row.title)?.trim()) throw new Error('Enter a name for the new work item.'); if (row.parent_id && !allRows.some(parent => parent.id === row.parent_id)) throw new Error('Subtask parent is missing.'); }
    let count = 0;
    try {
        for (const row of [...additions].sort((a, b) => a.level - b.level)) {
            const record = { ...row, ...drafts[row.id], project_id: projectId, is_leaf: !allRows.some(child => child.parent_id === row.id) };
            const { data, error } = await supabase.from('project_wbs_items').upsert(record, { onConflict: 'id' }).select('id').single();
            if (error || !data) throw new Error(error?.message || 'New work was not saved.');
            count++;
        }
        for (const parentId of new Set(additions.map(row => row.parent_id).filter(Boolean))) {
            const { data, error } = await supabase.from('project_wbs_items').update({ is_leaf: false }).eq('project_id', projectId).eq('id', parentId).select('id').single();
            if (error || !data) throw new Error(error?.message || 'Unable to update the subtask parent.');
        }
        for (const [id, draft] of Object.entries(drafts)) {
            if (additions.some(row => row.id === id)) continue;
            const original = rows.find(row => row.id === id);
            let query = supabase.from('project_wbs_items').update(draft).eq('project_id', projectId).eq('id', id);
            query = original.title == null ? query.is('title', null) : query.eq('title', original.title);
            query = original.title_en == null ? query.is('title_en', null) : query.eq('title_en', original.title_en);
            const { data, error } = await query.select('id').single();
            if (error || !data) {
                // A retry after a partial save can encounter our already-persisted edit.
                const { data: current, error: readError } = await supabase.from('project_wbs_items').select('title,title_en').eq('project_id', projectId).eq('id', id).single();
                if (readError || !current || current.title !== draft.title || (current.title_en || '') !== draft.title_en) throw new Error(error?.message || 'An item changed elsewhere. Reload before saving.');
            }
            count++;
        }
        if (!submit) return null;
        if (!rows.length) throw new Error('There are no WBS items to submit.');
        const { data: project, error } = await supabase.from('projects').select('meta').eq('id', projectId).single();
        if (error || !project) throw new Error(error?.message || 'Unable to read project.');
        const current: any[] = [];
        for (let offset = 0; ; offset += 500) {
            const { data: page, error: readError } = await supabase.from('project_wbs_items').select('*').eq('project_id', projectId).order('id').range(offset, offset + 499);
            if (readError) throw readError;
            current.push(...(page || []));
            if (!page || page.length < 500) break;
        }
        if (!current.length) throw new Error('There are no WBS items to submit.');
        const meta = project.meta || {};
        const submission = { status: 'submitted', version: (Number(meta.wbsSubmission?.version) || 0) + 1, submittedAt: new Date().toISOString(), items: current };
        let query = supabase.from('projects').update({ meta: { ...meta, wbsSubmission: submission } }).eq('id', projectId);
        query = project.meta == null ? query.is('meta', null) : query.filter('meta', 'eq', JSON.stringify(project.meta));
        const { data: saved, error: saveError } = await query.select('meta').single();
        if (saveError || !saved) throw new Error(saveError?.message || 'Project changed elsewhere. Retry Submit.');
        return saved.meta.wbsSubmission;
    } catch (error: any) {
        throw new Error(`${count ? `${count} WBS edits saved. ` : ''}${submit ? 'Submission not completed. ' : 'Save not completed. '}${error.message}`);
    }
}
