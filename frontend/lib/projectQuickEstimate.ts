import { LOCATION_FACTORS } from './legacy-rab/location-factors';
import { RAB_BALLPARK_PRICES, RABClass } from './legacy-rab/rab-prices';
import { getWeight } from './legacy-rab/rab-weights';
import { buildWBSTree } from './legacy-rab/wbs-mapper';
import { WBS_BALLPARK } from './legacy-rab/wbs-ballpark';
import { splitWBSNames } from './projectWBSNames';
export type QuickEstimateRow = { id: string; code: string; title: string; titleId: string; parentId: string | null };
export const QUICK_LEVELS = { A: 'Luxury', B: 'Premium', C: 'Standard', D: 'Basic' };
export type QuickEstimate = { names?: Record<string, { en?: string; id?: string }>; area?: number; buildingClass?: RABClass; adjustmentFactor?: number; baseBudget: number; regionalFactor: number; difficultyFactor: number; location: string; percentages: Record<string, number>; total: number; savedAt?: string };
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
    return { names: saved?.names || {}, area, buildingClass, adjustmentFactor, baseBudget: area * rate * adjustmentFactor / 100, regionalFactor, difficultyFactor, location: locationFactor ? `${locationFactor.province}|${locationFactor.city || ''}` : location, percentages, total: Number(saved?.total || 0) };
}
export function quickEstimateAmount(input: QuickEstimate, row: QuickEstimateRow): number {
    const total = input.baseBudget * input.regionalFactor * input.difficultyFactor;
    return total * (input.percentages[row.id] || 0) / 100 * (row.parentId ? (input.percentages[row.parentId] || 0) / 100 : 1);
}
export function validateQuickEstimate(input: QuickEstimate, rows: QuickEstimateRow[]) {
    if (input.area !== undefined && (!Number.isFinite(input.area) || input.area <= 0 || !input.buildingClass || !Object.prototype.hasOwnProperty.call(QUICK_LEVELS, input.buildingClass) || !Number.isFinite(input.adjustmentFactor) || input.adjustmentFactor! <= 0)) throw new Error('Enter a valid area, class and price adjustment.');
    if (!rows.length || !Number.isFinite(input.baseBudget) || input.baseBudget <= 0 || !Number.isFinite(input.regionalFactor) || input.regionalFactor <= 0 || !Number.isFinite(input.difficultyFactor) || input.difficultyFactor <= 0 || !Number.isSafeInteger(Math.round(input.baseBudget * input.regionalFactor * input.difficultyFactor))) throw new Error('Enter a positive budget and valid location factors.');
    for (const row of rows) if (!Number.isFinite(input.percentages[row.id]) || input.percentages[row.id] < 0 || input.percentages[row.id] > 100) throw new Error(`Check the percentage for ${row.code}.`);
    for (const parent of new Set(rows.map(row => row.parentId))) {
        const sum = rows.filter(row => row.parentId === parent).reduce((total, row) => total + input.percentages[row.id], 0);
        if (Math.abs(sum - 100) > 0.001) throw new Error(`${parent ? rows.find(row => row.id === parent)?.code : 'Discipline'} percentages must total 100%.`);
    }
    return Math.round(input.baseBudget * input.regionalFactor * input.difficultyFactor);
}

/** Change one allocation while retaining the parent budget and sibling proportions. */
export function changeQuickAllocation(input: QuickEstimate, rows: QuickEstimateRow[], id: string, value: number, mode: 'percent' | 'amount') {
    const row = rows.find(item => item.id === id);
    if (!row) throw new Error('Work item no longer exists.');
    const parentAmount = input.baseBudget * input.regionalFactor * input.difficultyFactor * (row.parentId ? (input.percentages[row.parentId] || 0) / 100 : 1);
    if (!Number.isFinite(parentAmount) || parentAmount <= 0) throw new Error('Set the area, class and location before editing allocations.');
    const percentage = mode === 'amount' ? value / parentAmount * 100 : value;
    if (!Number.isFinite(value) || value < 0 || percentage > 100 || percentage < 0) throw new Error('Enter an allocation between 0 and the parent budget (100%).');
    const siblings = rows.filter(item => item.parentId === row.parentId && item.id !== id);
    if (!siblings.length && Math.abs(percentage - 100) > 0.000001) throw new Error('This is the only item in its group. Adjust the parent budget instead.');
    const percentages = { ...input.percentages, [id]: Number(percentage.toFixed(6)) };
    const previousSum = siblings.reduce((sum, item) => sum + (input.percentages[item.id] || 0), 0);
    let remaining = 100 - percentages[id];
    siblings.forEach((item, index) => {
        const next = index === siblings.length - 1 ? remaining : Number(((100 - percentages[id]) * (previousSum ? (input.percentages[item.id] || 0) / previousSum : 1 / siblings.length)).toFixed(6));
        percentages[item.id] = Number(Math.max(0, next).toFixed(6)); remaining -= percentages[item.id];
    });
    return percentages;
}
