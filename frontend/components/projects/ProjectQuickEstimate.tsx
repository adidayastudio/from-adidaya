import { ExcludedRABItems } from './ExcludedRABItems';
import { ProjectRABTotals } from './ProjectRABTotals';
import { calculateRABTotals } from '@/lib/projectRABTotals';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ContextMenu from '@/components/ui/PlatformContextMenu';
import { InstantTooltip } from '@/components/ui/InstantTooltip';
import { ColumnResizeHandle } from './ColumnResizeHandle';
import { saveProjectQuickEstimate } from '@/lib/api/projectQuickEstimate';
import { quickEstimateRows, quickEstimateInput, quickEstimateAmount, QuickEstimate, QUICK_LEVELS, quickRatePerM2, changeQuickAllocation, reconcileQuickLocks, QuickEstimateRow, activeQuickRows } from '@/lib/projectQuickEstimate';
import { LOCATION_FACTORS } from '@/lib/legacy-rab/location-factors';
function formValue(saved: any, rows: ReturnType<typeof quickEstimateRows>) {
    const input = quickEstimateInput(saved, rows);
    return { excludedIds: input.excludedIds || [], totalsSettings: input.totalsSettings!, locks: input.locks || {}, names: input.names || {}, area: String(input.area || ''), buildingClass: input.buildingClass || 'B', adjustmentFactor: String(input.adjustmentFactor ?? 100), regionalFactor: String(input.regionalFactor), difficultyFactor: String(input.difficultyFactor), location: input.location, percentages: Object.fromEntries(Object.entries(input.percentages).map(([id, value]) => [id, String(value)])) };
}
export function ProjectQuickEstimate({ projectId, saved, defaults, wbs, summary, isDark, readOnly, onMetaChange, onDirtyChange, toolbarLeading, hideToolbar = false, language: propLanguage, onSaveRef, onResetRef, onBusyChange }: { projectId: string; saved: any; defaults?: any; wbs: any[]; summary: boolean; isDark: boolean; readOnly: boolean; onMetaChange: (meta: any) => void; onDirtyChange: (dirty: boolean) => void; toolbarLeading?: React.ReactNode; hideToolbar?: boolean; language?: 'both' | 'en' | 'id'; onSaveRef?: (saveFn: (() => Promise<void>) | null) => void; onResetRef?: (resetFn: (() => void) | null) => void; onBusyChange?: (busy: boolean) => void }) {
    const rows = useMemo(() => quickEstimateRows(wbs), [wbs]);
    const baseline = useMemo(() => formValue({ ...defaults, ...saved, location: saved?.location || defaults?.locationDetails || defaults?.location }, rows), [saved, defaults, rows]);
    const [form, setForm] = useState(baseline), [busy, setBusy] = useState(false), [error, setError] = useState('');
    const [cellEdits, setCellEdits] = useState<Record<string, string>>({});
    const [internalLanguage, setInternalLanguage] = useState<'both' | 'en' | 'id'>('en');
    const language = propLanguage || internalLanguage;
    const setLanguage = (lang: 'both' | 'en' | 'id') => setInternalLanguage(lang);
    const [closed, setClosed] = useState<Set<string>>(() => new Set()), [width, setWidth] = useState(1100), [widths, setWidths] = useState<Record<string, number>>({});
    const dirty = JSON.stringify(form) !== JSON.stringify(baseline);
    useEffect(() => { onDirtyChange(dirty); }, [dirty, onDirtyChange]);
    const numeric = (value: string) => value.trim() ? Number(value) : NaN;
    const baseRate = quickRatePerM2(form.buildingClass, rows);
    const rawInput: QuickEstimate = { ...form, area: numeric(form.area), adjustmentFactor: numeric(form.adjustmentFactor), baseBudget: numeric(form.area) * baseRate * numeric(form.adjustmentFactor) / 100, regionalFactor: numeric(form.regionalFactor), difficultyFactor: numeric(form.difficultyFactor), percentages: Object.fromEntries(Object.entries(form.percentages).map(([id, value]) => [id, numeric(value)])), total: 0 };
    const lockResult = (() => {
        if (!Object.keys(rawInput.locks || {}).length && !rawInput.excludedIds?.length) return { input: rawInput, error: '' };
        try { return { input: { ...rawInput, percentages: reconcileQuickLocks(rawInput, rows) }, error: '' }; }
        catch (err: any) { return { input: rawInput, error: err.message as string }; }
    })();
    const input = lockResult.input;
    const activeRows = activeQuickRows(input, rows);
    const total = activeRows.length ? input.baseBudget * input.regionalFactor * input.difficultyFactor : 0;
    const money = (amount: number) => Number.isFinite(amount) ? `Rp ${Math.round(amount).toLocaleString('id-ID')}` : '—';
    const payable = calculateRABTotals(total, form.totalsSettings).total;
    const text = isDark ? '#F5F5F7' : '#1C1C1E', muted = isDark ? '#9898A2' : '#73737D', surface = isDark ? '#1C1D23' : '#F8FAFC', cardBg = isDark ? '#16171C' : '#FFFFFF', border = isDark ? '#292930' : '#E5E5EA';
    const pill = { height: 34, paddingHorizontal: 13, borderRadius: 999, backgroundColor: isDark ? surface : '#F2F2F7', flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6 };
    const provinces = [...new Set(LOCATION_FACTORS.map(item => item.province))];
    const selectedFactor = LOCATION_FACTORS.find(item => `${item.province}|${item.city || ''}` === form.location);
    const [province, setProvince] = useState(selectedFactor?.province || '');
    const locations = LOCATION_FACTORS.filter(item => item.province === province);
    const update = (field: 'area' | 'adjustmentFactor' | 'regionalFactor' | 'difficultyFactor', value: string) => { setForm(current => ({ ...current, [field]: value })); setError(''); };
    const factors = [['Area', 'area', 'm²'], ['Price adjustment', 'adjustmentFactor', '%']] as const;
    const editAllocation = (id: string, mode: 'percent' | 'amount', value: string, commit = false) => {
        const key = `${id}:${mode}`;
        setCellEdits(current => ({ ...current, [key]: value }));
        const parsed = value.trim() ? Number(value.replace(',', '.')) : NaN;
        try { const percentages = changeQuickAllocation(input, rows, id, parsed, mode); setForm(current => ({ ...current, percentages: Object.fromEntries(Object.entries(percentages).map(([key, percent]) => [key, String(percent)])) })); setError(''); }
        catch (err: any) { if (commit) setError(err.message); }
        if (commit) setCellEdits(current => { const next = { ...current }; delete next[key]; return next; });
    };
    const setExcluded = (id: string, excluded: boolean) => {
        const excludedIds = excluded ? [...new Set([...form.excludedIds, id])] : form.excludedIds.filter(value => value !== id);
        let percentages = input.percentages;
        try { percentages = reconcileQuickLocks({ ...input, excludedIds }, rows); setError(''); } catch (err: any) { setError(err.message); }
        setForm(current => ({ ...current, excludedIds, percentages: Object.fromEntries(Object.entries(percentages).map(([key, value]) => [key, String(value)])) })); setCellEdits({});
    };
    const toggleLock = (row: QuickEstimateRow, mode: 'percent' | 'amount') => {
        const locks = { ...form.locks };
        if (locks[row.id]?.mode === mode) {
            delete locks[row.id];
            let percentages = input.percentages;
            try { percentages = reconcileQuickLocks({ ...input, locks }, rows); } catch { /* Other locks may still need to be released. */ }
            setForm(current => ({ ...current, locks, percentages: Object.fromEntries(Object.entries(percentages).map(([id, value]) => [id, String(value)])) })); setCellEdits({}); setError(''); return;
        }
        try {
            locks[row.id] = { mode, value: mode === 'percent' ? input.percentages[row.id] : Math.round(quickEstimateAmount(input, row)) };
            const percentages = reconcileQuickLocks({ ...input, locks }, rows);
            setForm(current => ({ ...current, locks, percentages: Object.fromEntries(Object.entries(percentages).map(([id, value]) => [id, String(value)])) })); setCellEdits({}); setError('');
        } catch (err: any) { setError(err.message); }
    };
    const allocationCell = (row: QuickEstimateRow, mode: 'percent' | 'amount') => {
        const lock = form.locks[row.id], active = lock?.mode === mode, key = `${row.id}:${mode}`;
        const percentage = lock?.mode === 'percent' ? lock.value : input.percentages[row.id] || 0;
        const amount = lock?.mode === 'amount' ? lock.value : quickEstimateAmount(input, row);
        return <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TextInput accessibilityLabel={`${row.code} ${mode === 'percent' ? 'percentage' : 'amount'}`} editable={!readOnly && !busy && !lock} selectTextOnFocus value={cellEdits[key] ?? (mode === 'percent' ? percentage.toFixed(2).replace(/\.?0+$/, '') : Number.isFinite(amount) ? Math.round(amount).toLocaleString('id-ID') : '')} onFocus={() => setCellEdits(current => ({ ...current, [key]: mode === 'percent' ? String(percentage) : String(Math.round(amount)) }))} onChangeText={value => editAllocation(row.id, mode, value)} onBlur={() => { if (cellEdits[key] !== undefined) editAllocation(row.id, mode, cellEdits[key], true); }} keyboardType="decimal-pad" style={{ flex: 1, minWidth: 0, color: lock ? '#007AFF' : text, fontSize: 12, textAlign: 'right', padding: 10, paddingRight: 3 }} />
            <InstantTooltip label={active ? `Unlock ${mode === 'percent' ? 'percentage' : 'amount'}` : mode === 'percent' ? 'Lock percentage of parent budget' : 'Lock amount in rupiah'}><TouchableOpacity accessibilityLabel={`${active ? 'Unlock' : 'Lock'} ${row.code} ${mode}`} disabled={readOnly || busy} onPress={() => toggleLock(row, mode)} style={{ padding: 6 }}><Ionicons name={active ? 'lock-closed-outline' : 'lock-open-outline'} size={13} color={active ? '#007AFF' : muted} /></TouchableOpacity></InstantTooltip>
        </View>;
    };
    const saveEstimates = async () => {
        if (Object.values(cellEdits).some(value => !value.trim() || !Number.isFinite(Number(value.replace(',', '.'))))) {
            setError('Finish editing the allocation first.');
            return;
        }
        setBusy(true);
        onBusyChange?.(true);
        setError('');
        try {
            let currentInput = input;
            for (const [key, value] of Object.entries(cellEdits)) {
                const separator = key.lastIndexOf(':');
                currentInput = {
                    ...currentInput,
                    percentages: changeQuickAllocation(currentInput, rows, key.slice(0, separator), Number(value.replace(',', '.')), key.slice(separator + 1) as 'amount' | 'percent')
                };
            }
            const meta = await saveProjectQuickEstimate(projectId, saved, currentInput);
            setCellEdits({});
            setForm(formValue(meta.quickEstimate, rows));
            onMetaChange(meta);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setBusy(false);
            onBusyChange?.(false);
        }
    };
    const resetEstimates = () => {
        setForm(baseline);
        setCellEdits({});
        setProvince(LOCATION_FACTORS.find(item => `${item.province}|${item.city || ''}` === baseline.location)?.province || '');
        setError('');
    };
    useEffect(() => {
        onSaveRef?.(saveEstimates);
        return () => onSaveRef?.(null);
    }, [cellEdits, input, rows, projectId, saved]);
    useEffect(() => {
        onResetRef?.(resetEstimates);
        return () => onResetRef?.(null);
    }, [baseline]);
    const columns = [{ key: 'code', title: 'WBS', width: 110 }, { key: 'en', title: language === 'id' ? 'Deskripsi' : 'Description', width: Math.max(240, (width - 400) / (language === 'both' ? 2 : 1)) }, ...(language === 'both' ? [{ key: 'id', title: 'Deskripsi', width: Math.max(240, (width - 400) / 2) }] : []), { key: 'percent', title: '%', width: 100 }, { key: 'amount', title: 'Amount (Rp)', width: 190 }].map(item => ({ ...item, width: widths[item.key] || item.width }));
    return <View onLayout={event => setWidth(event.nativeEvent.layout.width)} style={{ gap: 12 }}>
        {!hideToolbar && <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>{toolbarLeading}<View style={{ flex: 1 }} /><ContextMenu title="Language" dropdownMenuMode actions={['EN', 'ID', 'EN + ID'].map((title, index) => ({ title, selected: language === ['en', 'id', 'both'][index] }))} onPress={event => setLanguage(['en', 'id', 'both'][event.nativeEvent.index] as any)}><View style={pill}><Text style={{ color: text, fontSize: 12 }}>{language === 'both' ? 'EN + ID' : language.toUpperCase()}</Text><Ionicons name="chevron-down" size={11} color={muted} /></View></ContextMenu>            <TouchableOpacity disabled={busy || !dirty} onPress={resetEstimates} style={pill}><Text style={{ color: muted, fontSize: 12 }}>Reset</Text></TouchableOpacity><ContextMenu title="Export · Coming soon" dropdownMenuMode actions={['XLS', 'CSV', 'PDF'].map(format => ({ title: `${format} · Coming soon`, disabled: true }))} onPress={() => {}}><View style={pill}><Ionicons name="download-outline" size={14} color="#007AFF" /><Text style={{ color: '#007AFF', fontSize: 12 }}>Export</Text><Ionicons name="chevron-down" size={11} color={muted} /></View></ContextMenu><TouchableOpacity disabled={readOnly || busy || !dirty || !!lockResult.error} onPress={saveEstimates} style={{ ...pill, backgroundColor: '#007AFF', opacity: readOnly || busy || !dirty || !!lockResult.error ? 0.4 : 1 }}><Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}>{busy ? 'Saving…' : 'Save Estimates'}</Text></TouchableOpacity></View>}
                <View style={{ padding: 16, borderRadius: 16, backgroundColor: cardBg, borderWidth: isDark ? 1 : 0, borderColor: border, flexDirection: 'row', flexWrap: 'wrap', gap: 14, alignItems: 'flex-end' }}>
            <View style={{ gap: 5 }}><Text style={{ color: muted, fontSize: 11 }}>Class</Text><ContextMenu title="Building class" dropdownMenuMode disabled={readOnly || busy} actions={Object.entries(QUICK_LEVELS).map(([key, level]) => ({ title: `${key} · ${level}`, selected: form.buildingClass === key }))} onPress={event => setForm(current => ({ ...current, buildingClass: Object.keys(QUICK_LEVELS)[event.nativeEvent.index] as typeof current.buildingClass }))}><View style={pill}><Text style={{ color: text, fontSize: 12 }}>{form.buildingClass}</Text><Ionicons name="chevron-down" size={11} color={muted} /></View></ContextMenu></View>
            <View style={{ gap: 5 }}><Text style={{ color: muted, fontSize: 11 }}>Level</Text><View style={pill}><Text style={{ color: muted, fontSize: 12 }}>{QUICK_LEVELS[form.buildingClass]}</Text></View></View>
            {factors.map(([label, field, suffix]) => <View key={field} style={{ width: field === 'area' ? 175 : 160, gap: 5 }}><Text style={{ color: muted, fontSize: 11 }}>{label}</Text><View style={{ ...pill, borderWidth: 1, borderColor: border }}><TextInput accessibilityLabel={label} editable={!readOnly && !busy} keyboardType="decimal-pad" value={form[field]} onChangeText={value => update(field, value)} placeholder="0" placeholderTextColor={muted} style={{ color: text, flex: 1, minWidth: 0, padding: 0, fontSize: 12 }} /><Text style={{ color: muted, fontSize: 11 }}>{suffix}</Text></View></View>)}
            <ContextMenu title="Province · Legacy factors" dropdownMenuMode disabled={readOnly || busy} actions={[{ title: 'Custom location' }, ...provinces.map(title => ({ title }))]} onPress={event => { const selectedProvince = event.nativeEvent.index ? provinces[event.nativeEvent.index - 1] : ''; const factor = LOCATION_FACTORS.find(item => item.province === selectedProvince && !item.city); setProvince(selectedProvince); setForm(current => ({ ...current, location: factor ? `${selectedProvince}|` : '', regionalFactor: String(factor?.regionalFactor ?? 1), difficultyFactor: String(factor?.difficultyFactor ?? 1) })); }}><View style={pill}><Text style={{ color: text, fontSize: 12 }}>{province || 'Location'}</Text><Ionicons name="chevron-down" size={11} color={muted} /></View></ContextMenu>
            {!!province && <ContextMenu title="City · Legacy factors" dropdownMenuMode disabled={readOnly || busy} actions={locations.map(item => ({ title: item.city || `${item.province} (province)`, selected: `${item.province}|${item.city || ''}` === form.location }))} onPress={event => { const item = locations[event.nativeEvent.index]; setForm(current => ({ ...current, location: `${item.province}|${item.city || ''}`, regionalFactor: String(item.regionalFactor), difficultyFactor: String(item.difficultyFactor) })); }}><View style={pill}><Text style={{ color: text, fontSize: 12 }}>{selectedFactor?.city || 'City'}</Text><Ionicons name="chevron-down" size={11} color={muted} /></View></ContextMenu>}
<View style={{ flex: 1 }} /><View style={{ alignSelf: 'center', alignItems: 'flex-end' }}><InstantTooltip label={`Area × Rp ${baseRate.toLocaleString('id-ID')}/m² × ${form.adjustmentFactor}% × ${form.regionalFactor} × ${form.difficultyFactor}`}><Text style={{ color: '#007AFF', fontSize: 16, fontWeight: '600' }}>{money(payable)}</Text></InstantTooltip></View></View>
        {!!(error || lockResult.error) && <Text accessibilityRole="alert" style={{ color: '#FF9500', fontSize: 12 }}>{error || lockResult.error}</Text>}
        <ScrollView horizontal><View style={{ width: columns.reduce((sum, item) => sum + item.width, 0), borderRadius: 16, overflow: 'hidden', backgroundColor: cardBg, borderWidth: isDark ? 1 : 0, borderColor: border }}>
            <View style={{ flexDirection: 'row', backgroundColor: surface }}>{columns.map(column => <View key={column.key} style={{ width: column.width, padding: 11 }}><Text style={{ color: muted, fontSize: 12 }}>{column.title}</Text><ColumnResizeHandle width={column.width} onChange={value => setWidths(current => ({ ...current, [column.key]: value }))} /></View>)}</View>
            {activeRows.filter(row => !row.parentId || (!summary && !closed.has(row.parentId))).map(row => <View key={row.id} style={{ flexDirection: 'row', backgroundColor: row.parentId ? cardBg : surface, borderTopWidth: 1, borderColor: isDark ? border : '#F1F5F9' }}>{columns.map(column => <View key={column.key} style={{ width: column.width, minHeight: 42, justifyContent: 'center' }}>{column.key === 'code' ? <View style={{ flexDirection: 'row', alignItems: 'center' }}><TouchableOpacity disabled={!!row.parentId || summary} onPress={() => setClosed(current => { const next = new Set(current); if (next.has(row.id)) next.delete(row.id); else next.add(row.id); return next; })} style={{ flex: 1, padding: 10, flexDirection: 'row', gap: 6, alignItems: 'center' }}>{!row.parentId && !summary && <Ionicons name={closed.has(row.id) ? 'chevron-forward' : 'chevron-down'} size={12} color={muted} />}<Text style={{ color: text, fontSize: 12 }}>{row.code}</Text></TouchableOpacity><ContextMenu title={row.code} dropdownMenuMode disabled={readOnly || busy} actions={[{ title: 'Exclude from RAB' }]} onPress={() => setExcluded(row.id, true)}><View style={{ padding: 7 }}><Ionicons name="ellipsis-horizontal" size={13} color={muted} /></View></ContextMenu></View> : column.key === 'percent' || column.key === 'amount' ? allocationCell(row, column.key === 'percent' ? 'percent' : 'amount') : <TextInput accessibilityLabel={`${row.code} ${column.key === 'id' || language === 'id' ? 'name ID' : 'name EN'}`} editable={!readOnly && !busy} value={form.names[row.id]?.[column.key === 'id' || language === 'id' ? 'id' : 'en'] ?? (column.key === 'id' || language === 'id' ? row.titleId : row.title)} onChangeText={value => { const key = column.key === 'id' || language === 'id' ? 'id' : 'en'; setForm(current => ({ ...current, names: { ...current.names, [row.id]: { ...current.names[row.id], [key]: value } } })); }} placeholder="—" placeholderTextColor={muted} style={{ color: text, fontSize: 12, padding: 10, paddingLeft: column.key === 'en' && row.parentId ? 24 : 10 }} />}</View>)}</View>)}
        </View></ScrollView>
        <ExcludedRABItems note="The Quick Estimates budget is redistributed among active items." items={rows.filter(row => form.excludedIds.includes(row.id)).map(row => ({ id: row.id, code: row.code, title: form.names[row.id]?.[language === 'id' ? 'id' : 'en'] || (language === 'id' ? row.titleId : row.title) || row.code }))} onRestore={id => setExcluded(id, false)} isDark={isDark} readOnly={readOnly || busy} />
        <ProjectRABTotals subtotal={total} settings={form.totalsSettings} isDark={isDark} readOnly={readOnly || busy} onChange={totalsSettings => setForm(current => ({ ...current, totalsSettings }))} />
    </View>;
}
