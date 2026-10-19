export type RABDrafts = Record<string, Record<string, string>>;
export function mergeRABDrafts(meta: any, drafts: RABDrafts, rows: any[], validate = false) {
    const estimateValues = { ...(meta.estimateValues || {}) };
    for (const [code, fields] of Object.entries(drafts)) {
        const row = rows.find(item => item.code === code);
        if (!row || row.isSection) throw new Error(`Item ${code} cannot be edited.`);
        const value: any = { ...estimateValues[code], volume: row.volume, unitPrice: row.unitPrice, unit: row.unit, title: row.title, explicit: true };
        for (const [field, raw] of Object.entries(fields)) {
            if (!['volume', 'unitPrice', 'unit', 'title'].includes(field)) throw new Error('This column cannot be edited.');
            if (field === 'volume' || field === 'unitPrice') {
                const number = raw.trim() === '' ? NaN : Number(raw);
                if (!Number.isFinite(number) || number < 0) {
                    if (validate) throw new Error(`${code}: volume and price must be non-negative numbers. Use a dot for decimals.`);
                    continue;
                }
                value[field] = number;
            } else {
                if (validate && !raw.trim()) throw new Error(`${code}: description and unit are required.`);
                value[field] = raw;
            }
        }
        estimateValues[code] = value;
    }
    return { ...meta, estimateValues };
}
