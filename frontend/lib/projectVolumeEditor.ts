import { calculateVolume, VolumeCalc, VolumeFormula, volumeId } from './projectVolume';
export const VOLUME_FORMULAS: Record<VolumeFormula, { label: string; expression: string; fields: string[] }> = {
    LINE: { label: 'Length', expression: 'L × Qty', fields: ['length'] },
    AREA: { label: 'Area', expression: 'L × W × Qty', fields: ['length', 'width'] },
    BOX: { label: 'Box', expression: 'L × W × H × Qty', fields: ['length', 'width', 'height'] },
    COLUMN_BEAM: { label: 'Column / Beam', expression: 'L × W × H × Qty', fields: ['length', 'width', 'height'] },
    TRAPEZOIDAL: { label: 'Trapezoid', expression: '½ × (Top + Bottom) × H × L × Qty', fields: ['topWidth', 'bottomWidth', 'height', 'length'] },
    MANUAL: { label: 'Manual', expression: 'Value × Qty', fields: ['manualVolume'] },
};
export const VOLUME_FIELDS: Record<string, string> = { length: 'Length (m)', width: 'Width (m)', height: 'Height (m)', topWidth: 'Top (m)', bottomWidth: 'Bottom (m)', manualVolume: 'Value', count: 'Qty' };
export interface VolumeDraft { rows: VolumeCalc[]; unit: string; originalIds: string[]; dirty: boolean; applied: number; appliedUnit?: string; calculated: boolean; }
export function displayVolumeUnit(unit: string) { return ({ m1: 'm', 'm¹': 'm', 'm′': 'm', m2: 'm²', m3: 'm³' } as Record<string, string>)[unit] || unit; }
export function defaultVolumeFormula(unit: string): VolumeFormula { return ({ m: 'LINE', 'm²': 'AREA', 'm³': 'BOX' } as Record<string, VolumeFormula>)[displayVolumeUnit(unit)] || 'MANUAL'; }
export function newVolumeRow(unit: string, index = 1): VolumeCalc { const formula_type = defaultVolumeFormula(unit); return { id: volumeId(), name: `Area ${index}`, formula_type, parameters: { count: 1, ...Object.fromEntries(VOLUME_FORMULAS[formula_type].fields.map(field => [field, 0])) } }; }
export function loadVolumeDraft(node: any, calculations: any[], meta: any): VolumeDraft {
    const code = node.code || node.wbs_code;
    const exact = calculations.filter(row => row.wbs_code === code);
    const found = exact.length ? exact : calculations.filter(row => row.wbs_code === code.replace(/^[A-Z]\./, ''));
    const entry = meta.estimateValues?.[code] || meta.estimateValues?.[code.replace(/^[A-Z]\./, '')];
    const unit = displayVolumeUnit(entry?.unit || node.unit || 'm³');
    const applied = Number(entry?.volume ?? node.quantity ?? 0);
    const rows: VolumeCalc[] = found.map(row => ({ id: row.id, name: row.name, formula_type: row.formula_type, parameters: { count: 1, ...row.parameters }, details: meta.volumeRowDetails?.[row.id] }));
    if (!rows.length) {
        const row = newVolumeRow(unit);
        // Retain a legacy volume as an explicit manual starting value rather than invent dimensions.
        if (applied) { row.name = 'Existing volume'; row.formula_type = 'MANUAL'; row.parameters = { manualVolume: applied, count: 1 }; }
        rows.push(row);
    }
    return { rows, unit, originalIds: found.map(row => row.id), dirty: false, applied, appliedUnit: unit, calculated: !!found.length || !!entry?.explicit || applied !== 0 };
}
export function volumeDraftTotal(rows: VolumeCalc[]): number | null { try { return Number(rows.reduce((sum, row) => sum + calculateVolume(row), 0).toFixed(3)); } catch { return null; } }
export function volumeFormulaUnit(formula: VolumeFormula): string | null { return ({ LINE: 'm', AREA: 'm²', BOX: 'm³', COLUMN_BEAM: 'm³', TRAPEZOIDAL: 'm³' } as Partial<Record<VolumeFormula, string>>)[formula] || null; }
export function volumeUnitMismatch(draft: VolumeDraft): boolean { return draft.rows.some(row => { const required = volumeFormulaUnit(row.formula_type); return required !== null && required !== displayVolumeUnit(draft.unit); }); }
export function applyVolumeFormula(draft: VolumeDraft, rowId: string, formula_type: VolumeFormula): VolumeDraft {
    return { ...draft, dirty: true, unit: draft.unit, rows: draft.rows.map(row => row.id === rowId ? { ...row, formula_type, parameters: { count: row.parameters.count ?? 1, ...Object.fromEntries(VOLUME_FORMULAS[formula_type].fields.map(field => [field, row.parameters[field] ?? 0])) } } : row) };
}

export function setVolumeItemUnit(draft: VolumeDraft, unit: string): VolumeDraft {
    const normalized = displayVolumeUnit(unit);
    return { ...draft, dirty: true, unit: normalized, rows: draft.rows.map(row => {
        const required = volumeFormulaUnit(row.formula_type);
        if (!required || required === normalized) return row;
        const formula_type = defaultVolumeFormula(normalized);
        return { ...row, formula_type, parameters: { count: row.parameters.count ?? 1, ...Object.fromEntries(VOLUME_FORMULAS[formula_type].fields.map(field => [field, row.parameters[field] ?? 0])) } };
    }) };
}
