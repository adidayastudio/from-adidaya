import { buildWBSTree } from './wbs-mapper';
import { generateDisciplineRows, generateLevel2DetailRows, getDisciplineTabs, getFullWBSTree } from './adapter';
import type { ProjectV3Info } from './types';

// Same input precedence as legacy setup/rab-v3/page.tsx.
export function legacyProjectInfo(project: any, wbsRows: any[], stage: string): ProjectV3Info {
    const meta = project.meta || {};
    const tree = wbsRows.length ? buildWBSTree(wbsRows) : meta.wbsTree || meta.customWBS;
    const excludedIds = new Set(meta.rabExcludedIds || []);
    const codes: string[] = [];
    const walk = (nodes: any[]) => nodes.forEach(node => { if (excludedIds.has(node.id)) codes.push(node.code || node.wbs_code); walk(node.children || []); });
    walk(tree || []);
    return {
        rabExcludedCodes: codes, projectId: project.id, projectName: project.title || project.name,
        projectCode: project.code || project.project_code || project.id,
        buildingClass: meta.rabClass || project.rabClass || 'B',
        estimateValues: meta.estimateValues, wbsTree: tree, stage,
    };
}

export function legacyRABView(info: ProjectV3Info, tab: string) {
    const tabs = getDisciplineTabs(info);
    const excluded = (code: string) => (info.rabExcludedCodes || []).some(parent => code === parent || code.startsWith(`${parent}.`));
    const detail = generateLevel2DetailRows(info).filter(row => !excluded(row.code));
    let rows = tab.startsWith('disc_') ? generateDisciplineRows(tab.slice(5), info) : detail;
    if (tab === 'all') {
        rows = getFullWBSTree(info).flatMap((root: any) => generateDisciplineRows(root.code, info)).map((row, index) => ({ ...row, rowIdx: index + 7 }));
    }
    if (tab === 'rekap_samil') {
        const divisions: Record<string, { title: string; cost: number }> = {
            S: { title: 'STRUCTURE WORKS (S)', cost: 0 }, A: { title: 'ARCHITECTURE WORKS (A)', cost: 0 },
            M: { title: 'MEP WORKS (M)', cost: 0 }, I: { title: 'INTERIOR WORKS (I)', cost: 0 }, L: { title: 'LANDSCAPE WORKS (L)', cost: 0 },
        };
        getFullWBSTree(info).flatMap((root: any) => generateDisciplineRows(root.code, info)).forEach(row => { if (!row.isSection && !excluded(row.code) && divisions[row.code.charAt(0)]) divisions[row.code.charAt(0)].cost += row.volume * row.unitPrice; });
        rows = [{ id: 'sec_rekap_master', rowIdx: 7, no: '1.0', code: info.projectCode || 'PRJ', title: 'GENERAL SUMMARY', volume: 0, unit: 'ls', unitPrice: 0, isSection: true },
            ...Object.entries(divisions).map(([code, item], index) => ({ id: `rekap_${code}`, rowIdx: index + 8, no: `1.${index + 1}`, code, title: item.title, volume: 1, unit: 'ls', unitPrice: item.cost }))];
    }
    rows = rows.filter(row => !excluded(row.code));
    const subtotal = rows.reduce((sum, row) => sum + (row.isSection ? 0 : row.volume * row.unitPrice), 0);
    return { tabs, subtotal, rows: rows.map((row, index) => ({ ...row, rowIdx: index + 1, no: row.code, wbs_code: row.code, quantity: row.volume, unit_price: row.unitPrice,
        total_price: row.volume * row.unitPrice, weight: row.isSection ? 100 : subtotal > 0 ? row.volume * row.unitPrice / subtotal * 100 : 0 })) };
}
