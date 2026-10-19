import React, { useEffect, useState } from 'react';
import { Text, TextInput, TouchableOpacity, View, ScrollView, useWindowDimensions } from 'react-native';
import { ProjectWorkTree } from './ProjectWorkTree';
import ContextMenu from '@/components/ui/PlatformContextMenu';
import { calculateVolume, volumeId, VolumeCalc, VolumeFormula } from '@/lib/projectVolume';
import { saveProjectVolume } from '@/lib/api/projectVolume';

const FORMULAS: Record<VolumeFormula, { name: string; fields: string[] }> = {
    BOX: { name: 'Box (L × W × H)', fields: ['length', 'width', 'height', 'count'] },
    TRAPEZOIDAL: { name: 'Trapezoidal', fields: ['topWidth', 'bottomWidth', 'height', 'length', 'count'] },
    COLUMN_BEAM: { name: 'Column / Beam', fields: ['length', 'width', 'height', 'count'] },
    AREA: { name: 'Area (L × W)', fields: ['length', 'width', 'count'] },
    LINE: { name: 'Linear Length', fields: ['length', 'count'] },
    MANUAL: { name: 'Manual', fields: ['manualVolume', 'count'] },
};
export function ProjectVolumeCalculator({ project, wbs, calculations, onDirtyChange, isDark }: { project: any; isDark: boolean; wbs: any[]; calculations: any[]; onDirtyChange?: (value: boolean) => void }) {
    const text = isDark ? '#FFFFFF' : '#1C1C1E', secondary = isDark ? '#AEAEB2' : '#636366', border = isDark ? '#303034' : '#E5E5EA';
    const { width, height } = useWindowDimensions();
    const [item, setItem] = useState<any>(null), [rows, setRows] = useState<VolumeCalc[]>([]), [originalIds, setOriginalIds] = useState<string[]>([]), [unit, setUnit] = useState('m³');
    const [dirty, setDirty] = useState(false), [saving, setSaving] = useState(false), [message, setMessage] = useState('');
    const [savedCalcs, setSavedCalcs] = useState(calculations);
    const [meta, setMeta] = useState(project.meta || {});
    useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);
    const input = { borderWidth: 1, borderColor: border, borderRadius: 999, color: text, paddingHorizontal: 14, paddingVertical: 10 };
    const pill = { borderRadius: 999, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: isDark ? '#252528' : '#F2F2F7' };
    const select = (node: any) => {
        if (saving || dirty) { setMessage('Save this item before selecting another work item.'); return; }
        setItem(node); setMessage('');
        const exact = savedCalcs.filter(row => row.wbs_code === node.code);
        const found = exact.length ? exact : savedCalcs.filter(row => row.wbs_code === node.code.replace(/^[A-Z]\./, ''));
        const value = meta.estimateValues?.[node.code] || meta.estimateValues?.[node.code.replace(/^[A-Z]\./, '')];
        setUnit(value?.unit || node.unit || 'm³'); setOriginalIds(found.map(row => row.id));
        setRows(found.length ? found.map(row => ({ id: row.id, name: row.name, formula_type: row.formula_type, parameters: { count: 1, ...row.parameters } })) : [{ id: volumeId(), name: 'Main Calculation', formula_type: 'MANUAL', parameters: { manualVolume: value?.volume ?? node.quantity ?? 0, count: 1 } }]);
    };
    const patch = (id: string, change: Partial<VolumeCalc>) => { setRows(current => current.map(row => row.id === id ? { ...row, ...change } : row)); setDirty(true); setMessage(''); };
    const subtotal = (row: VolumeCalc) => { try { return calculateVolume(row); } catch { return null; } };
    const total = rows.every(row => subtotal(row) !== null) ? rows.reduce((sum, row) => sum + (subtotal(row) || 0), 0) : null;
    const save = async () => {
        setSaving(true); setMessage('');
        try {
            const result = await saveProjectVolume(project.id, item.code, unit, rows, originalIds);
            setMeta(result.meta); setOriginalIds(rows.map(row => row.id));
            setSavedCalcs(current => [...current.filter(row => !originalIds.includes(row.id)), ...result.records]);
            setDirty(false); setMessage('Saved and applied to RAB.');
        } catch (error: any) { setMessage(error.message || 'Unable to save. Your edits have been kept.'); }
        finally { setSaving(false); }
    };
    return <View style={{ gap: 16 }}>
        <Text style={{ color: text, fontSize: 22, fontWeight: '700' }}>Volume Calculator (BOQ)</Text>
        <View style={{ flexDirection: width >= 1100 ? 'row' : 'column', borderRadius: 24, borderWidth: 1, borderColor: border, overflow: 'hidden' }}>
            <View style={{ flex: 0.45, padding: 20, minWidth: 260 }}><Text style={{ color: secondary, marginBottom: 16, fontWeight: '700' }}>WBS NAVIGATOR</Text><ScrollView nestedScrollEnabled style={{ maxHeight: Math.max(320, height - 300) }}><ProjectWorkTree items={wbs} isDark={isDark} onSelectLeaf={select} selectedCode={item?.code} /></ScrollView></View>
            <View style={{ flex: 0.65, padding: 24, borderLeftWidth: width >= 1100 ? 1 : 0, borderColor: border, gap: 20 }}>
                {!item ? <Text style={{ color: secondary }}>Select a leaf work item to calculate its volume.</Text> : <>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}><Text style={{ color: text, fontSize: 19, fontWeight: '700', flex: 1 }}>{item.code} · {item.nameEn}</Text><TouchableOpacity disabled={saving} style={{ ...pill, backgroundColor: '#E11921', opacity: saving ? 0.5 : 1 }} onPress={save}><Text style={{ color: '#FFFFFF', fontWeight: '700' }}>{saving ? 'Saving…' : 'Save & Apply to RAB'}</Text></TouchableOpacity></View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}><Text style={{ color: secondary }}>Item Unit</Text><TextInput accessibilityLabel="Item unit" editable={!saving} value={unit} onChangeText={value => { setUnit(value); setDirty(true); }} style={{ ...input, minWidth: 100 }} /><Text style={{ color: text, fontWeight: '700' }}>Running total: {total === null ? 'Invalid input' : total.toLocaleString('id-ID')} {unit}</Text></View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}><Text style={{ color: secondary, fontWeight: '700' }}>CALCULATION BREAKDOWNS</Text><TouchableOpacity disabled={saving} style={pill} onPress={() => { setRows(current => [...current, { id: volumeId(), name: 'New Space / Item', formula_type: 'MANUAL', parameters: { manualVolume: 0, count: 1 } }]); setDirty(true); }}><Text style={{ color: text }}>+ Add Space / Item</Text></TouchableOpacity></View>
                    {rows.map(row => <View key={row.id} style={{ borderWidth: 1, borderColor: border, borderRadius: 22, padding: 16, gap: 16 }}>
                        <TextInput accessibilityLabel="Calculation name" value={row.name} editable={!saving} onChangeText={name => patch(row.id, { name })} style={input} />
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}><ContextMenu dropdownMenuMode actions={Object.entries(FORMULAS).map(([id, formula]) => ({ title: formula.name, selected: row.formula_type === id }))} onPress={event => { const formula = Object.keys(FORMULAS)[event.nativeEvent.index] as VolumeFormula; if (!formula || saving) return; patch(row.id, { formula_type: formula, parameters: { length: 0, width: 0, height: 0, topWidth: 0, bottomWidth: 0, manualVolume: 0, ...row.parameters, count: row.parameters.count ?? 1 } }); }}><TouchableOpacity disabled={saving} style={pill}><Text style={{ color: text }}>{FORMULAS[row.formula_type]?.name || row.formula_type} ⌄</Text></TouchableOpacity></ContextMenu><TouchableOpacity disabled={saving} style={pill} onPress={() => { setRows(current => current.filter(item => item.id !== row.id)); setDirty(true); }}><Text style={{ color: '#FF453A' }}>Remove</Text></TouchableOpacity></View>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>{(FORMULAS[row.formula_type]?.fields || []).map(field => <View key={field} style={{ minWidth: 110, flexGrow: 1, gap: 8 }}><Text style={{ color: secondary, fontSize: 12 }}>{({ topWidth: 'Top Width (m)', bottomWidth: 'Bottom Width (m)', manualVolume: 'Manual Volume', count: 'Quantity', length: 'Length (m)', width: 'Width (m)', height: 'Height (m)' } as Record<string, string>)[field]}</Text><TextInput accessibilityLabel={`${row.name} ${field}`} editable={!saving} keyboardType="decimal-pad" value={Number.isNaN(row.parameters[field]) ? '' : String(row.parameters[field] ?? '')} onChangeText={value => patch(row.id, { parameters: { ...row.parameters, [field]: value.trim() ? Number(value) : NaN } })} style={input} /></View>)}</View>
                        <Text style={{ color: text, fontWeight: '700' }}>Subtotal: {subtotal(row) ?? 'Invalid input'} {unit}</Text>
                    </View>)}
                </>}
                {dirty && !saving && <TouchableOpacity onPress={() => { setDirty(false); setItem(null); setRows([]); setMessage('Changes discarded.'); }} style={{ ...pill, alignSelf: 'flex-start' }}><Text style={{ color: secondary }}>Discard changes</Text></TouchableOpacity>}
                {!!message && <Text accessibilityRole="alert" style={{ color: secondary }}>{message}</Text>}
            </View>
        </View>
    </View>;
}
