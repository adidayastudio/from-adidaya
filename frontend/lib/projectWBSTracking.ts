import { buildWBSTree } from './legacy-rab/wbs-mapper';
import { legacyProjectInfo, legacyRABView } from './legacy-rab/project-view';
import { splitWBSNames } from './projectWBSNames';
import { calculateFinishDate } from './projectSchedule';

export interface TrackingItem {
    id: string; code: string; title: string; titleEn: string; titleId: string;
    level: number; isSection: boolean; hasChildren: boolean;
    quantity: number; unit: string; cost: number; weight: number;
    startDate: string; finishDate: string;
    constProgress: number; materialProgress: number; paidProgress: number;
    status: 'PENDING' | 'IN_PROGRESS' | 'DONE';
}

/** WBS owns hierarchy/identity; RAB owns quantities/costs; Schedule owns dates. */
export function buildTrackingItems(project: any, wbs: any[], tracking: Record<string, any> = {}): TrackingItem[] {
    if (!wbs.length) return [];
    const rab = legacyRABView(legacyProjectInfo(project, wbs, 'DETAIL'), 'all');
    const prices = new Map(rab.rows.map(row => [row.code, row]));
    const rows: TrackingItem[] = [];
    const clamp = (value: any) => Math.min(100, Math.max(0, Number(value) || 0));
    const walk = (node: any, level: number): TrackingItem => {
        const code = node.wbs_code || node.code;
        const names = splitWBSNames(node);
        const item: TrackingItem = {
            id: node.id || code, code, title: names.title, titleEn: names.title, titleId: names.title_en,
            level, isSection: !!node.children.length || node.is_leaf === false,
            hasChildren: !!node.children.length, quantity: 0, unit: node.unit || '', cost: 0, weight: 0,
            startDate: '', finishDate: '', constProgress: 0, materialProgress: 0, paidProgress: 0, status: 'PENDING',
        };
        rows.push(item); // Parent before children, exactly as in the WBS editor.
        const children = node.children.map((child: any) => walk(child, level + 1)) as TrackingItem[];
        const price = prices.get(code);
        const values = project.meta?.estimateValues?.[code] || {};
        item.quantity = Number(values.volume ?? price?.volume ?? node.quantity) || 0;
        item.unit = values.unit || price?.unit || node.unit || '';
        item.cost = item.isSection ? children.reduce((sum, child) => sum + child.cost, 0)
            : price ? price.volume * price.unitPrice : 0;
        item.weight = rab.subtotal > 0 ? item.cost / rab.subtotal * 100 : 0;
        const saved = tracking[item.id] || tracking[code] || {};
        for (const field of ['constProgress', 'materialProgress', 'paidProgress'] as const) {
            item[field] = item.isSection ? (item.cost > 0 ? children.reduce((sum, child) => sum + child[field] * child.cost, 0) / item.cost : 0) : clamp(saved[field]);
        }
        const schedule = project.meta?.scheduleValues?.[item.id] || project.meta?.scheduleValues?.[code] || {};
        item.startDate = schedule.start || schedule.startDate || '';
        item.finishDate = schedule.finish || schedule.finishDate || (item.startDate && Number(schedule.duration || schedule.durationDays) > 0 ? calculateFinishDate(item.startDate, Number(schedule.duration || schedule.durationDays)) : '');
        if (children.length) {
            item.startDate = children.map(child => child.startDate).filter(Boolean).sort()[0] || '';
            item.finishDate = children.map(child => child.finishDate).filter(Boolean).sort().slice(-1)[0] || '';
        }
        item.status = item.constProgress >= 100 ? 'DONE' : item.constProgress > 0 ? 'IN_PROGRESS' : 'PENDING';
        return item;
    };
    buildWBSTree(wbs, true).forEach(root => walk(root, 0));
    return rows;
}
