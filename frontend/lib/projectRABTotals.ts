export type RABTotalsSettings = { vat: boolean; rounding: number; roundingMode: 'nearest' | 'up' | 'down' };
export const DEFAULT_RAB_TOTALS: RABTotalsSettings = { vat: true, rounding: 0, roundingMode: 'nearest' };
export function readRABTotals(value: any): RABTotalsSettings { return { vat: typeof value?.vat === 'boolean' ? value.vat : true, rounding: [0, 1000, 10000, 100000, 1000000].includes(value?.rounding) ? value.rounding : 0, roundingMode: ['nearest', 'up', 'down'].includes(value?.roundingMode) ? value.roundingMode : 'nearest' }; }
export function calculateRABTotals(subtotal: number, settings: RABTotalsSettings) {
    if (!Number.isFinite(subtotal) || subtotal < 0) return { subtotal: 0, vat: 0, rounding: 0, total: 0 };
    const money = (value: number) => Math.round(value * 100) / 100;
    const base = money(subtotal), vat = settings.vat ? money(base * 0.11) : 0, beforeRounding = money(base + vat);
    const method = settings.roundingMode === 'up' ? Math.ceil : settings.roundingMode === 'down' ? Math.floor : Math.round;
    const total = settings.rounding ? method(beforeRounding / settings.rounding) * settings.rounding : beforeRounding;
    return { subtotal: base, vat, rounding: money(total - beforeRounding), total };
}
