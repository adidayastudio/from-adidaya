import { ALL_STAGE_DATA } from './data';
import type { Task } from './types';
export interface StageWorkLayout { sections: { code: string; title: string; weight: number }[]; tasks: Task[]; }
export const LEGACY_STAGE_KEYS = Object.keys(ALL_STAGE_DATA);
export function normalizeStage(code: string): string { return String(code || '').replace(/^\d+[-.\s]*/, '').toUpperCase(); }
export function buildStageWorkLayout(stage: string, records: any[], saved?: StageWorkLayout): StageWorkLayout {
    if (saved) return JSON.parse(JSON.stringify(saved));
    const source = ALL_STAGE_DATA[stage as keyof typeof ALL_STAGE_DATA];
    const layout: StageWorkLayout = { sections: source ? JSON.parse(JSON.stringify(source.sections)) : [], tasks: source ? JSON.parse(JSON.stringify(source.tasks)) : [] };
    const used = new Set<string>();
    for (const row of records.filter(row => normalizeStage(row.stage_code) === stage)) {
        const existing = layout.tasks.find(task => task.id === row.id || (task.code === row.code && (!row.section_code || task.sectionCode === row.section_code)));
        if (used.has(row.id)) continue;
        used.add(row.id);
        const section = row.section_code || existing?.sectionCode || `${stage}-OTHER`;
        if (!layout.sections.some(item => item.code === section)) layout.sections.push({ code: section, title: row.section_name || 'Other Work', weight: 0 });
        const task: Task = { ...existing, id: row.id, code: row.code || existing?.code || '', name: row.name || row.title || existing?.name || '', nameId: row.name_id ?? row.nameId ?? existing?.nameId ?? '', stage, sectionCode: section, weight: row.weight ?? existing?.weight ?? 0, priority: row.priority || existing?.priority || 'medium', parentId: row.parent_id || existing?.parentId, inputData: row.input_data || existing?.inputData };
        if (existing) { layout.tasks[layout.tasks.indexOf(existing)] = task; layout.tasks = layout.tasks.map(child => child.parentId === existing.id ? { ...child, parentId: task.id } : child); } else layout.tasks.push(task);
    }
    return layout;
}
export function renumberStageTasks(tasks: Task[], sectionCode: string): Task[] {
    const section = sectionCode.split('-').slice(1).join('-') || sectionCode;
    const walk = (parentId?: string, prefix = section, trail = new Set<string>()): Task[] => tasks.filter(task => task.parentId === parentId).flatMap((task, index) => {
        if (trail.has(task.id)) throw new Error('Task hierarchy contains a cycle.');
        const code = `${prefix}-${String(index + 1).padStart(2, '0')}`;
        return [{ ...task, code }, ...walk(task.id, code, new Set([...trail, task.id]))];
    });
    return walk();
}
export function removeStageTask(tasks: Task[], id: string): Task[] {
    const remove = new Set([id]);
    let changed = true;
    while (changed) { changed = false; tasks.forEach(task => { if (task.parentId && remove.has(task.parentId) && !remove.has(task.id)) { remove.add(task.id); changed = true; } }); }
    return tasks.filter(task => !remove.has(task.id));
}
export function validateStageLayout(layout: StageWorkLayout) {
    const ids = new Set<string>();
    for (const task of layout.tasks) {
        if (ids.has(task.id)) throw new Error('Duplicate task identity.'); ids.add(task.id);
        if (!task.name.trim()) throw new Error(`Enter an English name for task ${task.code || task.id}.`);
        if (!Number.isFinite(task.weight ?? 0) || (task.weight ?? 0) < 0) throw new Error('Task weights must be non-negative numbers.');
        if (!layout.sections.some(section => section.code === task.sectionCode)) throw new Error('Task section is missing.');
        if (task.parentId && !layout.tasks.some(parent => parent.id === task.parentId && parent.sectionCode === task.sectionCode)) throw new Error('Subtask parent is missing.');
        const seen = new Set([task.id]); let current = task;
        while (current.parentId) { if (seen.has(current.parentId)) throw new Error('Task hierarchy contains a cycle.'); seen.add(current.parentId); const parent = layout.tasks.find(parent => parent.id === current.parentId); if (!parent) throw new Error('Subtask parent is missing.'); current = parent; }
    }
}
export function stageWorkCSV(layout: StageWorkLayout): string {
    const cell = (value: unknown) => { const text = String(value ?? ''); return `"${(/^[=+@\-\t\r]/.test(text) ? "'" : '') + text.replace(/"/g, '""')}"`; };
    return '\uFEFF' + [['Stage', 'Section', 'Code', 'Task (EN)', 'Task (ID)', 'Weight', 'Priority', 'Parent'], ...layout.tasks.map(task => [task.stage, task.sectionCode, task.code, task.name, task.nameId, task.weight, task.priority, task.parentId])].map(row => row.map(cell).join(',')).join('\r\n');
}

export function stageWorkRows(layout: StageWorkLayout) {
    return [['Stage', 'Section', 'Code', 'Work (EN)', 'Work (ID)', 'Weight', 'Priority', 'Parent'], ...layout.tasks.map(task => [task.stage, layout.sections.find(section => section.code === task.sectionCode)?.title || task.sectionCode, task.code, task.name, task.nameId || '', task.weight ?? 0, task.priority || '', task.parentId || ''])];
}
export function stageWorkHTML(layout: StageWorkLayout, projectName: string): string {
    const escape = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]!));
    const [headers, ...rows] = stageWorkRows(layout);
    return `<!doctype html><html><head><meta charset="utf-8"><style>@page{size:A4 landscape;margin:12mm}body{font-family:Arial,sans-serif;color:#222;font-size:10px}h1{font-size:18px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:6px;text-align:left}th{background:#f2f2f7}thead{display:table-header-group}tr{break-inside:avoid}</style></head><body><h1>${escape(projectName)} · Stages &amp; Work</h1><table><thead><tr>${headers.map(value => `<th>${escape(value)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(value => `<td>${escape(value)}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`;
}
