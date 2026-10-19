import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import ContextMenu from '@/components/ui/PlatformContextMenu';
import { InstantTooltip } from '@/components/ui/InstantTooltip';
import { DynamicIslandToastHUD } from '@/components/ui/DynamicIslandToastHUD';
import { ProjectSaveFeedback, useProjectSaveFeedback } from './setup/ProjectSaveFeedback';
import { VolumeWBSNavigator } from './VolumeWBSNavigator';
import { buildWBSTree } from '@/lib/legacy-rab/wbs-mapper';
import { splitWBSNames } from '@/lib/projectWBSNames';
import { calculateVolume, VolumeCalc, VolumeFormula, volumeId } from '@/lib/projectVolume';
import { loadVolumeDraft, newVolumeRow, VOLUME_FIELDS, VOLUME_FORMULAS, VolumeDraft, volumeDraftTotal, volumeFormulaUnit, volumeUnitMismatch, applyVolumeFormula, setVolumeItemUnit } from '@/lib/projectVolumeEditor';
import { saveProjectVolume } from '@/lib/api/projectVolume';

export function ProjectVolumeCalculator({ project, wbs, calculations, onDirtyChange, isDark }: { project: any; isDark: boolean; wbs: any[]; calculations: any[]; onDirtyChange?: (value: boolean) => void }) {
    const tree = useMemo(() => {
        const names = (nodes: any[]): any[] => nodes.map(node => { const split = splitWBSNames(node); return { ...node, nameEn: split.title || node.nameEn, nameId: split.title_en, children: names(node.children || []) }; });
        return names(buildWBSTree(wbs, true));
    }, [wbs]);
    const leaves = useMemo(() => { const flatten = (nodes: any[]): any[] => nodes.flatMap(node => node.children?.length ? flatten(node.children) : [node]); return flatten(tree); }, [tree]);
    const [drafts, setDrafts] = useState<Record<string, VolumeDraft>>(() => Object.fromEntries(leaves.map(node => [node.code, loadVolumeDraft(node, calculations, project.meta || {})])));
    const [savedDrafts, setSavedDrafts] = useState(drafts);
    const [selectedCode, setSelectedCode] = useState(leaves[0]?.code || '');
    const [view, setView] = useState('detail'), [inputMode, setInputMode] = useState('table'), [activeRow, setActiveRow] = useState('');
    const [sheetSearch, setSheetSearch] = useState(''), [sheetFilter, setSheetFilter] = useState(0);
    const [saving, setSaving] = useState(false), [toast, setToast] = useState(''), [width, setWidth] = useState(1100), [focused, setFocused] = useState('');
    const dirtyCodes = Object.keys(drafts).filter(code => drafts[code].dirty), dirty = dirtyCodes.length > 0;
    const feedback = useProjectSaveFeedback(dirty, onDirtyChange);
    useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 3000); return () => clearTimeout(timer); }, [toast]);
    const item = leaves.find(node => node.code === selectedCode), draft = drafts[selectedCode], total = draft ? volumeUnitMismatch(draft) ? null : volumeDraftTotal(draft.rows) : 0;
    const text = isDark ? '#F5F5F7' : '#1C1C1E', muted = isDark ? '#9898A2' : '#73737D', border = isDark ? '#292930' : '#E5E5EA', panel = isDark ? '#101115' : '#FFFFFF', surface = isDark ? '#1C1D23' : '#F2F2F7';
    const wide = width >= 760;
    const pill = { height: 34, paddingHorizontal: 13, borderRadius: 999, backgroundColor: surface, flexDirection: 'row' as const, gap: 6, alignItems: 'center' as const, justifyContent: 'center' as const };
    const label = { color: muted, fontSize: 11, fontWeight: '600' as const };
    const number = (value: number | null) => value == null ? '—' : value.toLocaleString('en-US', { maximumFractionDigits: 3 });
    const update = (code: string, change: Partial<VolumeDraft>) => { if (saving) return; setDrafts(current => ({ ...current, [code]: { ...current[code], ...change, dirty: true } })); feedback.clear(); };
    const patch = (id: string, change: Partial<VolumeCalc>) => update(selectedCode, { rows: draft.rows.map(row => row.id === id ? { ...row, ...change } : row) });
    const choose = (node: any) => { if (saving) return; setSelectedCode(node.code); setActiveRow(''); feedback.clear(); };
    const addRow = () => { if (!draft || saving) return; const row = newVolumeRow(draft.unit, draft.rows.length + 1); update(selectedCode, { rows: [...draft.rows, row] }); setActiveRow(row.id); };
    const changeFormula = (row: VolumeCalc, formula_type: VolumeFormula) => update(selectedCode, applyVolumeFormula(draft, row.id, formula_type));
    const subtotal = (row: VolumeCalc) => { try { return calculateVolume(row); } catch { return null; } };
    const save = async () => {
        if (saving) return;
        const codes = draft?.dirty ? [selectedCode] : [];
        if (!codes.length) return;
        if (codes.some(code => volumeUnitMismatch(drafts[code]))) { feedback.notify('Error', 'Match each formula to the item unit, or choose Manual for an explicit volume.'); return; }
        if (codes.some(code => volumeDraftTotal(drafts[code].rows) == null || drafts[code].rows.some(row => !row.name.trim()))) { feedback.notify('Error', 'Complete row descriptions and enter valid non-negative dimensions before saving.'); return; }
        setSaving(true); feedback.clear(); let completed = 0;
        try {
            for (const code of codes) {
                const current = drafts[code];
                const result = await saveProjectVolume(project.id, code, current.unit, current.rows, current.originalIds);
                const saved = { ...current, dirty: false, calculated: true, applied: result.total, appliedUnit: current.unit, originalIds: current.rows.map(row => row.id) };
                setDrafts(values => ({ ...values, [code]: saved })); setSavedDrafts(values => ({ ...values, [code]: saved }));
                completed++;
            }
            setToast('Volume saved and applied to RAB.');
        } catch (error: any) { feedback.notify('Error', `${completed ? `${completed} work items saved. ` : ''}${error.message || 'Unable to save. Your edits are still here.'}`); }
        finally { setSaving(false); }
    };
    const discard = () => {
        const perform = () => { setDrafts(current => ({ ...current, [selectedCode]: { ...savedDrafts[selectedCode], dirty: false } })); feedback.clear(); };
        if (Platform.OS === 'web') { if (window.confirm('Discard unsaved changes for this work item?')) perform(); }
        else Alert.alert('Discard changes?', 'Only this work item will be reset.', [{ text: 'Keep editing', style: 'cancel' }, { text: 'Discard', style: 'destructive', onPress: perform }]);
    };
    const formulaChoices = () => Object.keys(VOLUME_FORMULAS).filter(id => !volumeFormulaUnit(id as VolumeFormula) || volumeFormulaUnit(id as VolumeFormula) === draft.unit) as VolumeFormula[];
    const formulaMenu = (row: VolumeCalc) => <ContextMenu title="Calculation formula" dropdownMenuMode disabled={saving} actions={formulaChoices().map(id => ({ title: `${VOLUME_FORMULAS[id].label} · ${VOLUME_FORMULAS[id].expression}`, selected: row.formula_type === id }))} onPress={event => changeFormula(row, formulaChoices()[event.nativeEvent.index])}><View style={{ ...pill, height: 30, paddingHorizontal: 9, justifyContent: 'space-between' }}><Text style={{ color: text, fontSize: 11 }}>{VOLUME_FORMULAS[row.formula_type]?.label || row.formula_type}</Text><Ionicons name="chevron-down" size={11} color={muted} /></View></ContextMenu>;
    const cellInput = (row: VolumeCalc, field: string, style: any = {}) => <TextInput accessibilityLabel={`${row.name} ${VOLUME_FIELDS[field] || field}`} editable={!saving} keyboardType="decimal-pad" value={Number.isNaN(row.parameters[field]) ? '' : String(row.parameters[field] ?? '')} placeholder="0" placeholderTextColor={muted} selectTextOnFocus onFocus={() => setFocused(`${row.id}:${field}`)} onBlur={() => setFocused('')} onChangeText={value => patch(row.id, { parameters: { ...row.parameters, [field]: value.trim() ? Number(value) : NaN } })} style={{ color: text, fontSize: 12, paddingHorizontal: 9, paddingVertical: 8, minHeight: 34, textAlign: 'right', borderRadius: 7, borderWidth: 1, borderColor: !Number.isFinite(row.parameters[field]) || row.parameters[field] < 0 ? '#FF9500' : focused === `${row.id}:${field}` ? '#007AFF' : 'transparent', ...style }} />;
    const rowActions = (row: VolumeCalc) => <View style={{ flexDirection: 'row', justifyContent: 'center' }}>{[['Duplicate row', 'copy-outline'], ['Delete row', 'trash-outline']].map(([title, icon], index) => <InstantTooltip key={title} label={title}><TouchableOpacity accessibilityLabel={title} disabled={saving} onPress={() => { if (index === 0) { const copied = { ...row, id: volumeId(), name: `${row.name} copy`, parameters: { ...row.parameters }, details: { ...row.details } }; update(selectedCode, { rows: [...draft.rows, copied] }); setActiveRow(copied.id); } else update(selectedCode, { rows: draft.rows.filter(item => item.id !== row.id) }); }} style={{ width: 28, height: 32, alignItems: 'center', justifyContent: 'center' }}><Ionicons name={icon as any} size={14} color={muted} /></TouchableOpacity></InstantTooltip>)}</View>;
    const dimensions = [...new Set((draft?.rows || []).flatMap(row => VOLUME_FORMULAS[row.formula_type]?.fields || []))];
    const columns = [{ title: '#', width: 32 }, { title: 'Location / description', width: 170 }, { title: 'Formula', width: 120 }, ...dimensions.map(field => ({ title: VOLUME_FIELDS[field], width: 86 })), { title: 'Qty', width: 58 }, { title: draft && volumeUnitMismatch(draft) ? 'Volume' : `Volume (${draft?.unit || ''})`, width: 104 }, { title: 'Notes', width: 140 }, { title: '', width: 64 }];
    const unitChoices = [...new Set(['m', 'm²', 'm³', 'pcs', 'ls', 'month', 'point', draft?.unit || ''].filter(Boolean))];
    const sheetRows = leaves.filter(node => `${node.code} ${node.nameEn} ${node.nameId || ''}`.toLowerCase().includes(sheetSearch.toLowerCase()) && (sheetFilter === 0 || (sheetFilter === 1 ? drafts[node.code].dirty : !drafts[node.code].calculated)));
    const sheetNameWidth = Math.max(290, width - 470);
    const totalsByUnit = Object.values(drafts).reduce<Record<string, number>>((result, value) => { const amount = value.dirty ? volumeUnitMismatch(value) ? null : volumeDraftTotal(value.rows) : value.applied; if (amount != null) result[value.unit] = (result[value.unit] || 0) + amount; return result; }, {});
    return <View onLayout={event => setWidth(event.nativeEvent.layout.width)} style={{ flex: 1, minHeight: 0, gap: 12 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
            <SegmentedControl segments={[{ id: 'detail', label: 'Calculation' }, { id: 'sheet', label: 'BOQ Sheet' }]} activeSegment={view} onSegmentChange={setView} />
            <View style={{ flex: 1 }} />
            <ContextMenu title="Export · Coming soon" dropdownMenuMode actions={['XLS', 'CSV', 'PDF'].map(format => ({ title: `${format} · Coming soon`, disabled: true }))} onPress={() => {}}><View style={{ ...pill, height: 38 }}><Ionicons name="download-outline" size={16} color="#007AFF" /><Text style={{ color: '#007AFF', fontSize: 12, fontWeight: '600' }}>Export</Text><Ionicons name="chevron-down" size={12} color="#007AFF" /></View></ContextMenu>
        </View>
        {feedback.failed && <ProjectSaveFeedback {...feedback} />}
        <View style={{ flex: 1, minHeight: 0, flexDirection: wide ? 'row' : 'column', borderWidth: 1, borderColor: border, borderRadius: 20, overflow: 'hidden', backgroundColor: panel }}>
            {view === 'detail' && <View style={{ width: wide ? Math.max(240, Math.min(300, width * 0.27)) : '100%', height: wide ? '100%' : 220, borderRightWidth: wide ? 1 : 0, borderBottomWidth: wide ? 0 : 1, borderColor: border }}><VolumeWBSNavigator tree={tree} drafts={drafts} selectedCode={selectedCode} onSelect={node => { choose(node); setView('detail'); }} disabled={saving} isDark={isDark} /></View>}
            <View style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
                {!item || !draft ? <View style={{ flex: 1, justifyContent: 'center', padding: 30, gap: 10 }}><Ionicons name="calculator-outline" size={30} color="#007AFF" /><Text style={{ color: text, fontSize: 16, fontWeight: '600' }}>No work items yet</Text><Text style={{ color: muted, fontSize: 13 }}>Add work items in WBS to start calculating volume.</Text></View> : view === 'sheet' ? <>
                    <View style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View style={{ ...pill, width: 250 }}><Ionicons name="search-outline" size={15} color={muted} /><TextInput accessibilityLabel="Search BOQ sheet" value={sheetSearch} onChangeText={setSheetSearch} placeholder="Search work items" placeholderTextColor={muted} style={{ flex: 1, minWidth: 0, color: text, fontSize: 12, padding: 0 }} />{!!sheetSearch && <TouchableOpacity accessibilityLabel="Clear BOQ search" onPress={() => setSheetSearch('')}><Ionicons name="close-outline" size={14} color={muted} /></TouchableOpacity>}</View>
                        <ContextMenu title="Show work" dropdownMenuMode actions={['All work', 'Unsaved changes', 'Not calculated'].map((title, index) => ({ title, selected: sheetFilter === index }))} onPress={event => setSheetFilter(event.nativeEvent.index)}><View style={pill}><Ionicons name="filter-outline" size={14} color={sheetFilter ? '#007AFF' : muted} /><Text style={{ color: muted, fontSize: 12 }}>{['All work', 'Unsaved', 'Not calculated'][sheetFilter]}</Text><Ionicons name="chevron-down" size={11} color={muted} /></View></ContextMenu><Text style={{ color: muted, fontSize: 11 }}>{sheetRows.length} items</Text>
                    </View>
                    <ScrollView style={{ flex: 1 }}><ScrollView horizontal><View style={{ minWidth: 700, flex: 1 }}>
                        <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: surface }}>{[['WBS', 90], ['Work description', sheetNameWidth], ['Rows', 50], ['Volume', 100], ['Unit', 60], ['Status', 110]].map(([title, width]) => <Text key={title} style={{ ...label, width: Number(width) }}>{title}</Text>)}</View>
                        {sheetRows.map(node => { const value = drafts[node.code]; return <TouchableOpacity key={node.code} disabled={saving} onPress={() => { choose(node); setView('detail'); }} style={{ flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderColor: border, backgroundColor: node.code === selectedCode ? isDark ? '#102749' : '#E8F0FF' : 'transparent' }}><Text style={{ width: 90, color: muted, fontSize: 12 }}>{node.code}</Text><Text numberOfLines={2} style={{ width: sheetNameWidth, paddingRight: 12, color: text, fontSize: 12 }}>{node.nameEn}</Text><Text style={{ width: 50, color: muted, fontSize: 12 }}>{value.calculated || value.dirty ? value.rows.length : '—'}</Text><Text style={{ width: 100, color: value.dirty ? '#007AFF' : text, fontSize: 12, fontWeight: '600' }}>{number(value.dirty ? volumeUnitMismatch(value) ? null : volumeDraftTotal(value.rows) : value.applied)}</Text><Text style={{ width: 60, color: muted, fontSize: 12 }}>{value.unit}</Text><Text style={{ width: 110, color: value.dirty ? '#007AFF' : muted, fontSize: 11 }}>{value.dirty ? 'Unsaved' : value.calculated ? 'Applied' : 'Not calculated'}</Text></TouchableOpacity>; })}
                        {!sheetRows.length && <Text style={{ color: muted, fontSize: 12, padding: 16 }}>No matching work items.</Text>}
                    </View></ScrollView></ScrollView>
                    {Object.values(totalsByUnit).some(amount => amount !== 0) && <View style={{ padding: 14, gap: 8 }}><Text style={label}>TOTALS BY UNIT</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>{Object.entries(totalsByUnit).filter(([, amount]) => amount !== 0).map(([unit, total]) => <Text key={unit} style={{ color: text, fontSize: 13, fontWeight: '600' }}>{number(total)} {unit}</Text>)}</View></View>}
                </> : <>
                    <View style={{ padding: 18, paddingBottom: 8, gap: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}><View style={{ flex: 1, minWidth: 160, gap: 4 }}><Text style={{ color: '#007AFF', fontSize: 11, fontWeight: '700' }}>{item.code}</Text><Text style={{ color: text, fontSize: 17, fontWeight: '700' }}>{item.nameEn}</Text>{!!item.nameId && item.nameId !== item.nameEn && <Text style={{ color: muted, fontSize: 12 }}>{item.nameId}</Text>}</View><View style={{ alignItems: 'flex-end', gap: 3 }}><Text style={{ color: '#007AFF', fontSize: 22, fontWeight: '700' }}>{number(total)} <Text style={{ fontSize: 13 }}>{draft.unit}</Text></Text>{draft.dirty && <Text style={{ color: muted, fontSize: 11 }}>Saved: {number(draft.applied)} {draft.appliedUnit || draft.unit}</Text>}</View></View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                            <SegmentedControl compact segments={[{ id: 'table', label: 'Table Input' }, { id: 'quick', label: 'Quick Input' }]} activeSegment={inputMode} onSegmentChange={setInputMode} />
                            <ContextMenu title="Item unit" dropdownMenuMode disabled={saving} actions={unitChoices.map(unit => ({ title: unit, selected: unit === draft.unit }))} onPress={event => update(selectedCode, setVolumeItemUnit(draft, unitChoices[event.nativeEvent.index]))}><View style={pill}><Text style={{ color: muted, fontSize: 11 }}>Unit</Text><Text style={{ color: text, fontSize: 12, fontWeight: '600' }}>{draft.unit}</Text><Ionicons name="chevron-down" size={11} color={muted} /></View></ContextMenu>
                            <View style={{ flex: 1 }} />
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><InstantTooltip label="Reset unsaved changes for this item"><TouchableOpacity accessibilityLabel="Reset item changes" disabled={saving || !draft.dirty} onPress={discard} style={{ ...pill, opacity: saving || !draft.dirty ? 0.45 : 1 }}><Ionicons name="refresh-outline" size={14} color={muted} /><Text style={{ color: text, fontSize: 12, fontWeight: '600' }}>Reset</Text></TouchableOpacity></InstantTooltip><InstantTooltip label="Save this item and apply its volume to RAB"><TouchableOpacity accessibilityLabel="Save this item and apply to RAB" disabled={saving || !draft.dirty} onPress={() => save()} style={{ ...pill, backgroundColor: '#007AFF', opacity: saving || !draft.dirty ? 0.45 : 1 }}><Ionicons name="save-outline" size={14} color="#FFFFFF" /><Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>{saving ? 'Saving…' : 'Save'}</Text></TouchableOpacity></InstantTooltip></View>
                        </View>
                    </View>
                    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14, gap: 12 }} keyboardShouldPersistTaps="handled">
                        {inputMode === 'table' ? <ScrollView horizontal><View style={{ width: columns.reduce((sum, column) => sum + column.width, 0), borderRadius: 10, overflow: 'hidden' }}>
                            <View style={{ flexDirection: 'row', backgroundColor: surface }}>{columns.map((column, index) => <Text key={index} style={{ ...label, width: column.width, paddingHorizontal: 8, paddingVertical: 11 }}>{column.title}</Text>)}</View>
                            {draft.rows.map((row, index) => <View key={row.id} style={{ flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderColor: border, backgroundColor: index % 2 ? isDark ? '#15161B' : '#FAFAFC' : 'transparent', minHeight: 48 }}>
                                <Text style={{ width: 32, color: muted, textAlign: 'center', fontSize: 11 }}>{index + 1}</Text>
                                <TextInput editable={!saving} accessibilityLabel={`Row ${index + 1} description`} value={row.name} onChangeText={name => patch(row.id, { name })} placeholder="Location / description" placeholderTextColor={muted} style={{ width: 170, color: text, fontSize: 12, padding: 9 }} />
                                <View style={{ width: 120, paddingHorizontal: 5 }}>{formulaMenu(row)}</View>
                                {dimensions.map(field => <View key={field} style={{ width: 86 }}>{VOLUME_FORMULAS[row.formula_type]?.fields.includes(field) ? cellInput(row, field) : <Text style={{ color: muted, textAlign: 'center', fontSize: 12 }}>—</Text>}</View>)}
                                <View style={{ width: 58 }}>{cellInput(row, 'count')}</View><Text style={{ width: 104, color: subtotal(row) == null ? '#FF9500' : text, textAlign: 'right', paddingRight: 10, fontSize: 12, fontWeight: '600' }}>{number(subtotal(row))}</Text>
                                <TextInput editable={!saving} accessibilityLabel={`Row ${index + 1} notes`} value={row.details?.notes || ''} onChangeText={notes => patch(row.id, { details: { ...row.details, notes } })} placeholder="Add note" placeholderTextColor={muted} style={{ width: 140, padding: 9, fontSize: 12, color: muted }} /><View style={{ width: 64 }}>{rowActions(row)}</View>
                            </View>)}

                        </View></ScrollView> : <>
                            <ContextMenu title="Calculation row" dropdownMenuMode actions={draft.rows.map((row, index) => ({ title: `${index + 1}. ${row.name}`, selected: (activeRow || draft.rows[0]?.id) === row.id }))} onPress={event => setActiveRow(draft.rows[event.nativeEvent.index].id)}><View style={{ ...pill, alignSelf: 'flex-start' }}><Text style={{ color: text, fontSize: 12 }}>{draft.rows.find(row => row.id === activeRow)?.name || draft.rows[0]?.name || 'No rows'}</Text><Ionicons name="chevron-down" size={12} color={muted} /></View></ContextMenu>
                            {(() => { const row = draft.rows.find(row => row.id === activeRow) || draft.rows[0]; return row ? <View style={{ gap: 14, padding: 16, borderWidth: 1, borderColor: border, borderRadius: 16 }}><View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}><TextInput editable={!saving} accessibilityLabel="Calculation description" value={row.name} onChangeText={name => patch(row.id, { name })} style={{ flex: 1, minWidth: 0, fontSize: 14, color: text, fontWeight: '600', paddingVertical: 8 }} />{rowActions(row)}</View>{formulaMenu(row)}<Text style={{ color: muted, fontSize: 12 }}>{VOLUME_FORMULAS[row.formula_type]?.expression}</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>{[...(VOLUME_FORMULAS[row.formula_type]?.fields || []), 'count'].map(field => <View key={field} style={{ width: '45%', flexGrow: 1, gap: 6 }}><Text style={label}>{VOLUME_FIELDS[field]}</Text>{cellInput(row, field, { backgroundColor: surface, textAlign: 'left' })}</View>)}</View><TextInput editable={!saving} accessibilityLabel="Calculation notes" value={row.details?.notes || ''} onChangeText={notes => patch(row.id, { details: { ...row.details, notes } })} placeholder="Optional notes" placeholderTextColor={muted} style={{ color: text, backgroundColor: surface, borderRadius: 10, padding: 12, fontSize: 12 }} /><Text style={{ color: text, fontSize: 14, fontWeight: '700' }}>Subtotal: {number(subtotal(row))} {volumeFormulaUnit(row.formula_type) || draft.unit}</Text></View> : <Text style={{ color: muted, padding: 10 }}>Add a calculation row to begin.</Text>; })()}
                        </>}
                        {volumeUnitMismatch(draft) && <Text accessibilityRole="alert" style={{ color: '#FF9500', fontSize: 12 }}>Use formulas with the same output unit within this work item. Manual values follow its unit.</Text>}
                        {total == null && <Text accessibilityRole="alert" style={{ color: '#FF9500', fontSize: 12 }}>Complete the highlighted inputs. Dimensions and quantities must be valid, non-negative numbers.</Text>}
                        <TouchableOpacity disabled={saving} onPress={addRow} style={{ ...pill, alignSelf: 'flex-start', paddingHorizontal: 14 }}><Ionicons name="add-outline" size={16} color="#007AFF" /><Text style={{ color: '#007AFF', fontSize: 12 }}>Add calculation row</Text></TouchableOpacity>
                    </ScrollView>

                </>}
            </View>
        </View>
        {!!toast && <View pointerEvents="none" accessibilityRole="alert" style={{ position: Platform.OS === 'web' ? 'fixed' as any : 'absolute', top: 80, right: 24, width: 360, maxWidth: '90%', zIndex: 1000 }}><DynamicIslandToastHUD title="Volume" message={toast} isDark={isDark} /></View>}
    </View>;
}
