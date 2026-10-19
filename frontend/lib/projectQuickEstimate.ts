import { RABTotalsSettings, readRABTotals } from './projectRABTotals';
import { LOCATION_FACTORS } from './legacy-rab/location-factors';
import { RAB_BALLPARK_PRICES, RABClass } from './legacy-rab/rab-prices';
import { getWeight } from './legacy-rab/rab-weights';
import { buildWBSTree } from './legacy-rab/wbs-mapper';
import { WBS_BALLPARK } from './legacy-rab/wbs-ballpark';
import { splitWBSNames } from './projectWBSNames';
export type QuickEstimateRow = { id: string; code: string; title: string; titleId: string; parentId: string | null };
export const QUICK_LEVELS = { A: 'Luxury', B: 'Premium', C: 'Standard', D: 'Basic' };
export type QuickEstimateLock = { mode: 'percent' | 'amount'; value: number };
export type QuickEstimate = { excludedIds?: string[]; totalsSettings?: RABTotalsSettings; locks?: Record<string, QuickEstimateLock>; names?: Record<string, { en?: string; id?: string }>; area?: number; buildingClass?: RABClass; adjustmentFactor?: number; baseBudget: number; regionalFactor: number; difficultyFactor: number; location: string; percentages: Record<string, number>; total: number; savedAt?: string };
export function quickEstimateRows(wbs: any[]): QuickEstimateRow[] {
    const tree: any[] = wbs.length ? buildWBSTree(wbs, true) : WBS_BALLPARK;
    return tree.flatMap(root => [root, ...(root.children || [])].map((item, index) => {
        const english = item.title || item.nameEn || '';
        const explicitId = item.title_en || (item.nameId !== english ? item.nameId : '') || '';
        const names = splitWBSNames({ title: english });
        const translation = splitWBSNames({ title: explicitId });
        return { id: wbs.length ? item.id || item.code : `template:${item.code}`, code: item.code || item.wbs_code, title: names.title, titleId: translation.title_en || explicitId || names.title_en, parentId: index ? wbs.length ? root.id || root.code : `template:${root.code}` : null };
    }));
}
export function quickRatePerM2(buildingClass: RABClass, rows: QuickEstimateRow[]) {
    return rows.filter(row => !row.parentId).reduce((sum, row) => sum + (RAB_BALLPARK_PRICES.find(price => price.code === row.code)?.[`class${buildingClass}`] || 0), 0);
}
export function quickEstimateInput(saved: any, rows: QuickEstimateRow[]): QuickEstimate {
    const buildingClass: RABClass = Object.prototype.hasOwnProperty.call(QUICK_LEVELS, saved?.buildingClass || saved?.rabClass) ? saved.buildingClass || saved.rabClass : 'B';
    const rate = quickRatePerM2(buildingClass, rows), adjustmentFactor = Number(saved?.adjustmentFactor ?? 100);
    let informationLocation = saved?.locationDetails || saved?.location;
    if (typeof informationLocation === 'string') { try { informationLocation = JSON.parse(informationLocation); } catch { informationLocation = {}; } }
    const province = informationLocation?.province || saved?.province || '', city = informationLocation?.city || saved?.city || '';
    const location = typeof saved?.location === 'string' && saved.location.includes('|') ? saved.location : province ? `${province}|${city}` : '';
    const [locationProvince, locationCity = ''] = location.split('|');
    const normalize = (value: string) => value.toLowerCase().replace(/\b(provinsi|kota|kabupaten|kab)\b/g, '').replace(/[.\s]+/g, ' ').trim();
    const cityType = (value: string) => /\b(kabupaten|kab)\b/i.test(value) ? 'kab' : /\bkota\b/i.test(value) ? 'kota' : '';
    const locationFactor = LOCATION_FACTORS.find(item => normalize(item.province) === normalize(locationProvince || province) && !!item.city && normalize(item.city) === normalize(locationCity) && (!cityType(item.city) || !cityType(locationCity) || cityType(item.city) === cityType(locationCity))) || LOCATION_FACTORS.find(item => normalize(item.province) === normalize(locationProvince || province) && !item.city);
    const regionalFactor = Number(locationFactor?.regionalFactor ?? saved?.regionalFactor ?? saved?.rf ?? 1), difficultyFactor = Number(locationFactor?.difficultyFactor ?? saved?.difficultyFactor ?? saved?.df ?? 1);
    const previousBase = Number(saved?.baseBudget ?? (saved?.total ? saved.total / regionalFactor / difficultyFactor : 0));
    const rawArea = saved?.area ?? saved?.buildingArea ?? (rate ? previousBase / rate : 0);
    const area = typeof rawArea === 'string' ? Number(rawArea.replace(/\s*m(?:²|2)\s*$/i, '').replace(/,/g, '').trim()) : Number(rawArea);
    const percentages: Record<string, number> = {};
    rows.forEach(row => {
        const siblings = rows.filter(item => item.parentId === row.parentId);
        const weights = siblings.map(item => item.parentId ? getWeight(item.code, buildingClass) : RAB_BALLPARK_PRICES.find(price => price.code === item.code)?.[`class${buildingClass}`] || 0);
        const sum = weights.reduce((total, weight) => total + weight, 0);
        percentages[row.id] = saved?.percentages?.[row.id] ?? Number((sum ? weights[siblings.indexOf(row)] / sum * 100 : 100 / siblings.length).toFixed(6));
    });
    return { excludedIds: rows.filter(row => saved?.excludedIds?.includes(row.id)).map(row => row.id), totalsSettings: readRABTotals(saved?.totalsSettings), locks: Object.fromEntries(rows.filter(row => saved?.locks?.[row.id]).map(row => [row.id, saved.locks[row.id]])), names: saved?.names || {}, area, buildingClass, adjustmentFactor, baseBudget: area * rate * adjustmentFactor / 100, regionalFactor, difficultyFactor, location: locationFactor ? `${locationFactor.province}|${locationFactor.city || ''}` : location, percentages, total: Number(saved?.total || 0) };
}
export function activeQuickRows(input: QuickEstimate, rows: QuickEstimateRow[]) {
    const excluded = new Set(input.excludedIds || []);
    return rows.filter(row => !excluded.has(row.id) && (!row.parentId || !excluded.has(row.parentId)));
}
export function quickEstimateAmount(input: QuickEstimate, row: QuickEstimateRow): number {
    if (input.excludedIds?.includes(row.id) || (row.parentId && input.excludedIds?.includes(row.parentId))) return 0;
    const total = input.baseBudget * input.regionalFactor * input.difficultyFactor;
    return total * (input.percentages[row.id] || 0) / 100 * (row.parentId ? (input.percentages[row.parentId] || 0) / 100 : 1);
}
export function validateQuickEstimate(input: QuickEstimate, allRows: QuickEstimateRow[]) {
    const rows = activeQuickRows(input, allRows);
    if (!allRows.length) throw new Error('Add WBS work before saving.');
    if (input.area !== undefined && (!Number.isFinite(input.area) || input.area <= 0 || !input.buildingClass || !Object.prototype.hasOwnProperty.call(QUICK_LEVELS, input.buildingClass) || !Number.isFinite(input.adjustmentFactor) || input.adjustmentFactor! <= 0)) throw new Error('Enter a valid area, class and price adjustment.');
    if (!Number.isFinite(input.baseBudget) || input.baseBudget <= 0 || !Number.isFinite(input.regionalFactor) || input.regionalFactor <= 0 || !Number.isFinite(input.difficultyFactor) || input.difficultyFactor <= 0 || !Number.isSafeInteger(Math.round(input.baseBudget * input.regionalFactor * input.difficultyFactor))) throw new Error('Enter a positive budget and valid location factors.');
    if (!rows.length) return 0;
    for (const row of rows) if (!Number.isFinite(input.percentages[row.id]) || input.percentages[row.id] < 0 || input.percentages[row.id] > 100) throw new Error(`Check the percentage for ${row.code}.`);
    for (const parent of new Set(rows.map(row => row.parentId))) {
        const sum = rows.filter(row => row.parentId === parent).reduce((total, row) => total + input.percentages[row.id], 0);
        if (Math.abs(sum - 100) > 0.001) throw new Error(`${parent ? rows.find(row => row.id === parent)?.code : 'Discipline'} percentages must total 100%.`);
    }
    for (const [id, lock] of Object.entries(input.locks || {})) {
        const row = rows.find(item => item.id === id);
        if (!row && allRows.some(item => item.id === id)) continue;
        if (!row || !['percent', 'amount'].includes(lock.mode) || !Number.isFinite(lock.value) || lock.value < 0) throw new Error('Invalid allocation lock.');
        const actual = lock.mode === 'percent' ? input.percentages[id] : quickEstimateAmount(input, row);
        if (Math.abs(actual - lock.value) > (lock.mode === 'percent' ? 1e-8 : Math.max(0.01, lock.value * 1e-12))) throw new Error(`${row.code} does not match its locked ${lock.mode}.`);
    }
    return Math.round(input.baseBudget * input.regionalFactor * input.difficultyFactor);
}

/** Resolve each sibling group against its parent; locks are never silently relaxed. */
export function reconcileQuickLocks(input: QuickEstimate, allRows: QuickEstimateRow[], edited?: { id: string; percentage: number }) {
    const total = input.baseBudget * input.regionalFactor * input.difficultyFactor;
    if (!Number.isFinite(total) || total <= 0) throw new Error('Set the area, class and location before editing allocations.');
    const percentages = { ...input.percentages };
    const rows = activeQuickRows(input, allRows);
    if (!rows.length) return percentages;
    for (const [id, lock] of Object.entries(input.locks || {})) {
        if (!rows.some(row => row.id === id) && allRows.some(row => row.id === id)) continue;
        if (!rows.some(row => row.id === id) || !['percent', 'amount'].includes(lock.mode) || !Number.isFinite(lock.value) || lock.value < 0 || (lock.mode === 'percent' && lock.value > 100)) throw new Error('Invalid allocation lock. Unlock this item and try again.');
    }
    for (const parentId of [null, ...rows.filter(row => !row.parentId).map(row => row.id)]) {
        const siblings = rows.filter(row => row.parentId === parentId);
        if (!siblings.length) continue;
        const parentAmount = total * (parentId ? percentages[parentId] / 100 : 1);
        const fixed = new Set<string>();
        for (const row of siblings) {
            const lock = input.locks?.[row.id];
            if (edited?.id === row.id) {
                if (lock) throw new Error(`${row.code} is locked. Unlock it before editing.`);
                percentages[row.id] = edited.percentage; fixed.add(row.id);
            } else if (lock) {
                if (lock.mode === 'amount' && parentAmount <= 0 && lock.value > 0) throw new Error(`The parent budget cannot cover the locked amount for ${row.code}.`);
                percentages[row.id] = lock.mode === 'percent' ? lock.value : parentAmount > 0 ? lock.value / parentAmount * 100 : input.percentages[row.id];
                fixed.add(row.id);
            }
        }
        const fixedSum = siblings.filter(row => fixed.has(row.id)).reduce((sum, row) => sum + percentages[row.id], 0);
        if (fixedSum > 100 + 1e-8) throw new Error(`Locked allocations exceed ${parentId ? rows.find(row => row.id === parentId)?.code : 'the total'} budget. Increase the budget or unlock an item.`);
        const free = siblings.filter(row => !fixed.has(row.id));
        const remainder = Math.max(0, 100 - fixedSum);
        if (!free.length) { if (Math.abs(remainder) > 1e-8) throw new Error(edited && siblings.some(row => row.id === edited.id) && siblings.length === 1 ? 'This is the only item in its group. Adjust the parent budget instead.' : 'All items in this group are locked. Unlock an item to balance the budget.'); continue; }
        const previousSum = free.reduce((sum, row) => sum + Math.max(0, input.percentages[row.id] || 0), 0);
        let remaining = remainder;
        free.forEach((row, index) => {
            percentages[row.id] = Number((index === free.length - 1 ? Math.max(0, remaining) : remainder * (previousSum ? Math.max(0, input.percentages[row.id] || 0) / previousSum : 1 / free.length)).toPrecision(15));
            remaining -= percentages[row.id];
        });
    }
    return percentages;
}

/** Change one allocation while retaining the parent budget and respecting locks. */
export function changeQuickAllocation(input: QuickEstimate, rows: QuickEstimateRow[], id: string, value: number, mode: 'percent' | 'amount') {
    const row = activeQuickRows(input, rows).find(item => item.id === id);
    if (!row) throw new Error('Work item is excluded or no longer exists.');
    const parentAmount = input.baseBudget * input.regionalFactor * input.difficultyFactor * (row.parentId ? (input.percentages[row.parentId] || 0) / 100 : 1);
    if (!Number.isFinite(parentAmount) || parentAmount <= 0) throw new Error('Set the area, class and location before editing allocations.');
    const percentage = Number((mode === 'amount' ? value / parentAmount * 100 : value).toPrecision(15));
    if (!Number.isFinite(value) || value < 0 || percentage > 100 || percentage < 0) throw new Error('Enter an allocation between 0 and the parent budget (100%).');
    return reconcileQuickLocks(input, rows, { id, percentage });
}
