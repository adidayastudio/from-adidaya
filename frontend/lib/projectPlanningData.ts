type Row = Record<string, any>;

export function savedPlanningRows(section: string, meta: Row, wbs: Row[] = []): Row[] {
    if (!['rab', 'volume', 'schedule'].includes(section)) return [];
    const values = section === 'schedule' ? meta.scheduleValues : meta.estimateValues;
    const saved = values && typeof values === 'object' && !Array.isArray(values) ? values : {};
    const codes = new Set(Object.keys(saved));
    if (section === 'rab' && meta.priceOverrides && typeof meta.priceOverrides === 'object') Object.keys(meta.priceOverrides).forEach(code => codes.add(code));
    const entries = [...codes].map(code => [code, saved[code] ?? {}] as const);
    return entries.flatMap(([code, raw]) => {
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return [];
        const value = raw as Row;
        if (section === 'volume' && value.volume == null) return [];
        const item = wbs.find(row => row.wbs_code === code);
        return [{
            id: `saved:${section}:${code}`, wbs_code: code,
            title: item?.title || value.title || value.name || code,
            source: `Project metadata · ${section === 'schedule' ? 'scheduleValues' : 'estimateValues'}`,
            quantity: value.volume, unit: value.unit || item?.unit,
            unit_price: value.unitPrice,
            start_date: value.start, duration_days: value.duration, progress: value.progress,
            notes: value.notes,
            // Keep per-m² overrides separate: they are not necessarily a unit price.
            price_override: section === 'rab' ? meta.priceOverrides?.[code] : undefined,
        }];
    });
}

export function rabItemAmount(item: Row): number | null {
    const numeric = (value: unknown) => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
    if (numeric(item.total_price)) return Number(item.total_price);
    if (numeric(item.subtotal)) return Number(item.subtotal);
    const quantity = item.qty ?? item.quantity;
    return numeric(quantity) && numeric(item.unit_price) ? Number(quantity) * Number(item.unit_price) : null;
}
