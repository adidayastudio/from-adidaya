export type VolumeFormula = 'BOX' | 'TRAPEZOIDAL' | 'COLUMN_BEAM' | 'AREA' | 'LINE' | 'MANUAL';
export interface VolumeCalc { id: string; name: string; formula_type: VolumeFormula; parameters: Record<string, number>; calculated_volume?: number; details?: { location?: string; notes?: string }; }
export function calculateVolume(row: VolumeCalc): number {
    const p = row.parameters, count = p.count ?? 1;
    if (Object.values(p).some(value => !Number.isFinite(value) || value < 0)) throw new Error('Enter valid non-negative dimensions and quantity.');
    let result = 0;
    switch (row.formula_type) {
        case 'BOX': case 'COLUMN_BEAM': result = p.length * p.width * p.height * count; break;
        case 'TRAPEZOIDAL': result = ((p.topWidth + p.bottomWidth) / 2) * p.height * p.length * count; break;
        case 'AREA': result = p.length * p.width * count; break;
        case 'LINE': result = p.length * count; break;
        case 'MANUAL': result = p.manualVolume * count; break;
        default: throw new Error('Unsupported volume formula.');
    }
    if (!Number.isFinite(result) || result < 0) throw new Error('Enter valid non-negative dimensions and quantity.');
    return Number(result.toFixed(3));
}
export function volumeId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => { const number = Math.floor(Math.random() * 16); return (char === 'x' ? number : (number & 3) | 8).toString(16); });
}
