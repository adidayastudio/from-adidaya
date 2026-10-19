import { PlanningRevisionBar } from './PlanningRevisionBar';
import { planningRevision } from '@/lib/projectPlanningRevisions';
import { persistPlanningRevision } from '@/lib/api/projectPlanningRevisions';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { loadVolumeDraft, newVolumeRow, VOLUME_FIELDS, VOLUME_FORMULAS, VolumeDraft, volumeDraftTotal, volumeFormulaUnit, volumeUnitMismatch, applyVolumeFormula, setVolumeItemUnit, volumeDraftStatus } from '@/lib/projectVolumeEditor';
import { saveProjectVolume } from '@/lib/api/projectVolume';

type VolumeProps = {
    project: any;
    isDark: boolean;
    wbs: any[];
    calculations: any[];
    onDirtyChange?: (value: boolean) => void;
    onTitleAccessoryChange?: (accessory: React.ReactNode) => void;
    onHeaderTrailingChange?: (trailing: React.ReactNode) => void;
};
export function ProjectVolumeCalculator(props: VolumeProps) {
    const [view, setView] = useState('detail');
    const [meta, setMeta] = useState(props.project.meta || {});
    const [revisionBusy, setRevisionBusy] = useState(false);
    const [liveCalculations, setLiveCalculations] = useState(props.calculations);
    const [volumeError, setVolumeError] = useState('');
    const state = planningRevision(meta, 'volume');
    const [selectedVersion, setSelectedVersion] = useState(() => state.draft ? 0 : state.versions.slice(-1)[0]?.version || 0);
    const [dirty, setDirty] = useState(false), [openItem, setOpenItem] = useState<{ id: string } | null>(null);
    const onDirtyChange = props.onDirtyChange;
    const dirtyChange = useCallback((value: boolean) => { setDirty(value); onDirtyChange?.(value); }, [onDirtyChange]);
    const snapshot = state.versions.find(item => item.version === selectedVersion)?.snapshot;

    const choices = useMemo(() => [
        ...(state.draft ? [{ title: 'Volume Draft', version: 0 }] : []),
        ...[...state.versions].reverse().map(version => ({ title: `Volume v.${version.version}`, version: version.version }))
    ], [state]);
    const source = selectedVersion ? state.versions.find(item => item.version === selectedVersion) : null;
    const latest = state.versions.slice(-1)[0];
    const color = props.isDark ? '#F5F5F7' : '#1C1C1E';
    const muted = props.isDark ? '#9898A2' : '#73737D';
    const card = props.isDark ? '#1C1C1E' : '#FFFFFF';

    const act = async (action: 'start' | 'publish' | 'review', id?: string) => {
        if (dirty) { setVolumeError('Save or reset unsaved calculations before continuing.'); return; }
        setRevisionBusy(true); setVolumeError('');
        try {
            const next = await persistPlanningRevision(props.project.id, 'volume', action, id);
            setMeta(next);
            if (action !== 'review') setSelectedVersion(action === 'start' ? 0 : planningRevision(next, 'volume').versions.slice(-1)[0].version);
        } catch (err: any) {
            setVolumeError(err.message || 'Unable to update revision.');
        } finally {
            setRevisionBusy(false);
        }
    };

    // Mount title accessory: [Calculation | BOQ Sheet] [Volume Draft ⌵] Draft · Not published
    useEffect(() => {
        props.onTitleAccessoryChange?.(
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <SegmentedControl
                    compact
                    segments={[{ id: 'detail', label: 'Calculation' }, { id: 'sheet', label: 'BOQ Sheet' }]}
                    activeSegment={view}
                    onSegmentChange={setView}
                />
                <ContextMenu
                    title="Volume versions"
                    dropdownMenuMode
                    disabled={revisionBusy}
                    actions={choices.map(choice => ({ title: choice.title, selected: choice.version === selectedVersion }))}
                    onPress={event => {
                        if (dirty) { setVolumeError('Save or reset unsaved changes before switching versions.'); return; }
                        setSelectedVersion(choices[event.nativeEvent.index].version);
                    }}
                >
                    <View style={{ height: 34, paddingHorizontal: 12, borderRadius: 999, backgroundColor: card, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ color, fontSize: 12, fontWeight: '600' }}>
                            {selectedVersion ? `Volume v.${selectedVersion}` : 'Volume Draft'}
                        </Text>
                        <Ionicons name="chevron-down" size={12} color={muted} />
                    </View>
                </ContextMenu>
                <Text numberOfLines={1} style={{ color: muted, fontSize: 11, flexShrink: 1 }}>
                    {source ? `Published · WBS v.${source.wbsVersion}` : latest ? `Draft revision of Volume v.${latest.version}` : 'Draft · Not published'}
                </Text>
            </View>
        );
        return () => props.onTitleAccessoryChange?.(null);
    }, [view, choices, selectedVersion, revisionBusy, dirty, source, latest, color, muted, card]);

    // Mount trailing header: [Export ⌵] [Publish Volume]
    useEffect(() => {
        props.onHeaderTrailingChange?.(
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ContextMenu
                    title="Export"
                    dropdownMenuMode
                    actions={['XLS', 'CSV', 'PDF'].map(format => ({ title: `${format} · Coming soon`, disabled: true }))}
                    onPress={() => {}}
                >
                    <View style={{ height: 34, paddingHorizontal: 13, borderRadius: 999, backgroundColor: card, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="download-outline" size={15} color="#007AFF" />
                        <Text style={{ color: '#007AFF', fontSize: 12, fontWeight: '600' }}>Export</Text>
                        <Ionicons name="chevron-down" size={11} color="#007AFF" />
                    </View>
                </ContextMenu>
                <TouchableOpacity
                    disabled={revisionBusy || dirty}
                    onPress={() => act(state.draft && !selectedVersion ? 'publish' : 'start')}
                    style={{
                        height: 34,
                        paddingHorizontal: 14,
                        borderRadius: 999,
                        backgroundColor: card,
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: revisionBusy || dirty ? 0.45 : 1
                    }}
                >
                    <Text style={{ color: '#007AFF', fontSize: 12, fontWeight: '600' }}>
                        {revisionBusy ? 'Please wait…' : state.draft ? selectedVersion ? 'Open Draft' : latest ? 'Publish Revision' : 'Publish Volume' : 'Add Revision'}
                    </Text>
                </TouchableOpacity>
            </View>
        );
        return () => props.onHeaderTrailingChange?.(null);
    }, [revisionBusy, dirty, state, selectedVersion, latest, card]);

    return <View style={{ flex: 1, minHeight: 0 }}>
        {!!volumeError && <Text accessibilityRole="alert" style={{ color: '#FF9500', fontSize: 12, paddingBottom: 8 }}>{volumeError}</Text>}
        <VolumeCalculationEditor view={view} setView={setView} key={selectedVersion} {...props} project={{ ...props.project, meta: snapshot?.meta || meta }} wbs={snapshot?.wbs || props.wbs} calculations={snapshot?.calculations || liveCalculations} onSaved={(code, records) => setLiveCalculations(current => [...current.filter(row => row.wbs_code !== code), ...records])} onDirtyChange={dirtyChange} readOnly={!!selectedVersion || revisionBusy} onMetaChange={setMeta} openItem={openItem} />
    </View>;
}
function VolumeCalculationEditor({ project, wbs, calculations, onDirtyChange, isDark, readOnly = false, onMetaChange, openItem, onSaved, view, setView }: VolumeProps & { view: string; setView: (view: string) => void; readOnly?: boolean; onMetaChange?: (meta: any) => void; openItem?: { id: string } | null; onSaved?: (code: string, records: any[]) => void }) {
    const tree = useMemo(() => {
        const names = (nodes: any[]): any[] => nodes.map(node => { const split = splitWBSNames(node); return { ...node, nameEn: split.title || node.nameEn, nameId: split.title_en, children: names(node.children || []) }; });
        return names(buildWBSTree(wbs, true));
    }, [wbs]);
    const leaves = useMemo(() => { const flatten = (nodes: any[]): any[] => nodes.flatMap(node => node.children?.length ? flatten(node.children) : [node]); return flatten(tree); }, [tree]);
    const [drafts, setDrafts] = useState<Record<string, VolumeDraft>>(() => Object.fromEntries(leaves.map(node => [node.code, loadVolumeDraft(node, calculations, project.meta || {})])));
    const [savedDrafts, setSavedDrafts] = useState(drafts);
    const [selectedCode, setSelectedCode] = useState(leaves[0]?.code || '');
    const [inputMode, setInputMode] = useState('table'), [activeRow, setActiveRow] = useState('');
    const [sheetDiscipline, setSheetDiscipline] = useState('');
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => new Set());
    const [sheetSearch, setSheetSearch] = useState(''), [sheetFilter, setSheetFilter] = useState(0);
    const [isSaving, setSaving] = useState(false), [toast, setToast] = useState(''), [width, setWidth] = useState(1100), [focused, setFocused] = useState('');
    const saving = isSaving || readOnly;
    const dirtyCodes = Object.keys(drafts).filter(code => drafts[code].dirty), dirty = dirtyCodes.length > 0;
    const feedback = useProjectSaveFeedback(dirty, onDirtyChange);
    useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 3000); return () => clearTimeout(timer); }, [toast]);
    useEffect(() => { const item = leaves.find(node => node.id === openItem?.id); if (item) { setSelectedCode(item.code); setView('detail'); } }, [openItem, leaves, setView]);
    const item = leaves.find(node => node.code === selectedCode), draft = drafts[selectedCode], total = draft ? volumeUnitMismatch(draft) ? null : volumeDraftTotal(draft.rows) : 0;
    const text = isDark ? '#F5F5F7' : '#1C1C1E', muted = isDark ? '#9898A2' : '#73737D', border = isDark ? '#292930' : '#E5E5EA', panel = isDark ? '#101115' : '#FFFFFF', surface = isDark ? '#1C1D23' : '#F2F2F7';
    const wide = width >= 760;
    const pill = { height: 34, paddingHorizontal: 13, borderRadius: 999, backgroundColor: surface, flexDirection: 'row' as const, gap: 6, alignItems: 'center' as const, justifyContent: 'center' as const };
    const label = { color: muted, fontSize: 11, fontWeight: '600' as const };
    const number = (value: number | null) => value == null ? '—' : value.toLocaleString('en-US', { maximumFractionDigits: 3 });
    const update = (code: string, change: Partial<VolumeDraft>) => { if (saving) return; setDrafts(current => ({ ...current, [code]: { ...current[code], ...change, dirty: true } })); feedback.clear(); };
    const patch = (id: string, change: Partial<VolumeCalc>) => update(selectedCode, { rows: draft.rows.map(row => row.id === id ? { ...row, ...change } : row) });
    const choose = (node: any) => { if (isSaving) return; setSelectedCode(node.code); setActiveRow(''); feedback.clear(); };
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
                onMetaChange?.(result.meta); onSaved?.(code, result.records);
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
    const unitChoices = [...new Set(['m', 'm²', 'm³', 'pcs', 'set', 'unit', 'kg', 'ls', 'month', 'point', draft?.unit || ''].filter(Boolean))];
    const disciplineTree = sheetDiscipline ? tree.filter(node => node.code === sheetDiscipline) : tree;
    const groupCodes: string[] = [];
    const collectGroups = (nodes: any[]) => nodes.forEach(node => { if (node.children?.length) { groupCodes.push(node.code); collectGroups(node.children); } });
    collectGroups(disciplineTree);
    const allExpanded = groupCodes.every(code => !collapsedGroups.has(code));
    const matchesSheet = (node: any, ancestorMatch = false): boolean => {
        const nameMatch = ancestorMatch || `${node.code} ${node.nameEn} ${node.nameId || ''}`.toLowerCase().includes(sheetSearch.toLowerCase());
        return node.children?.length ? node.children.some((child: any) => matchesSheet(child, nameMatch)) : nameMatch && (sheetFilter === 0 || (sheetFilter === 1 ? volumeDraftStatus(drafts[node.code]) === 'Unsaved' : volumeDraftStatus(drafts[node.code]) === 'Not calculated'));
    };
    const sheetRows: { node: any; depth: number; group: boolean }[] = [];
    const collectSheet = (nodes: any[], depth = 0, ancestorMatch = false) => nodes.forEach(node => {
        if (!matchesSheet(node, ancestorMatch)) return;
        const group = !!node.children?.length;
        sheetRows.push({ node, depth, group });
        if (group && !collapsedGroups.has(node.code)) collectSheet(node.children, depth + 1, ancestorMatch || `${node.code} ${node.nameEn} ${node.nameId || ''}`.toLowerCase().includes(sheetSearch.toLowerCase()));
    });
    collectSheet(disciplineTree);
    const sheetNameWidth = Math.max(290, width - 420);
    const statusCounts = Object.values(drafts).reduce((counts, value) => { counts[volumeDraftStatus(value)]++; return counts; }, { Saved: 0, Unsaved: 0, 'Not calculated': 0 });
    const countMatches = (nodes: any[], ancestorMatch = false): number => nodes.reduce((count, node) => {
        const nameMatch = ancestorMatch || `${node.code} ${node.nameEn} ${node.nameId || ''}`.toLowerCase().includes(sheetSearch.toLowerCase());
        return count + (node.children?.length ? countMatches(node.children, nameMatch) : matchesSheet(node, ancestorMatch) ? 1 : 0);
    }, 0);
    const matchingCount = countMatches(disciplineTree);
    return <View onLayout={event => setWidth(event.nativeEvent.layout.width)} style={{ flex: 1, minHeight: 0, gap: 12 }}>
        {feedback.failed && <ProjectSaveFeedback {...feedback} />}
        <View style={{ flex: 1, minHeight: 0, flexDirection: wide ? 'row' : 'column', borderWidth: 1, borderColor: border, borderRadius: 20, overflow: 'hidden', backgroundColor: panel }}>
            {view === 'detail' && <View style={{ width: wide ? Math.max(240, Math.min(300, width * 0.27)) : '100%', height: wide ? '100%' : 220, borderRightWidth: wide ? 1 : 0, borderBottomWidth: wide ? 0 : 1, borderColor: border }}><VolumeWBSNavigator tree={tree} drafts={drafts} selectedCode={selectedCode} onSelect={node => { choose(node); setView('detail'); }} disabled={isSaving} isDark={isDark} /></View>}
            <View style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
                {!item || !draft ? <View style={{ flex: 1, justifyContent: 'center', padding: 30, gap: 10 }}><Ionicons name="calculator-outline" size={30} color="#007AFF" /><Text style={{ color: text, fontSize: 16, fontWeight: '600' }}>No work items yet</Text><Text style={{ color: muted, fontSize: 13 }}>Add work items in WBS to start calculating volume.</Text></View> : view === 'sheet' ? <>
                    <View style={{ padding: 14, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
                        <View style={{ ...pill, width: 250 }}><Ionicons name="search-outline" size={15} color={muted} /><TextInput accessibilityLabel="Search BOQ sheet" value={sheetSearch} onChangeText={value => { setSheetSearch(value); setCollapsedGroups(new Set()); }} placeholder="Search work items" placeholderTextColor={muted} style={{ flex: 1, minWidth: 0, color: text, fontSize: 12, padding: 0 }} />{!!sheetSearch && <TouchableOpacity accessibilityLabel="Clear BOQ search" onPress={() => setSheetSearch('')}><Ionicons name="close-outline" size={14} color={muted} /></TouchableOpacity>}</View>
                        <ContextMenu title="Show work" dropdownMenuMode actions={['All work', 'Unsaved changes', 'Not calculated'].map((title, index) => ({ title, selected: sheetFilter === index }))} onPress={event => { setSheetFilter(event.nativeEvent.index); setCollapsedGroups(new Set()); }}><View style={pill}><Ionicons name="filter-outline" size={14} color={sheetFilter ? '#007AFF' : muted} /><Text style={{ color: muted, fontSize: 12 }}>{['All work', 'Unsaved', 'Not calculated'][sheetFilter]}</Text><Ionicons name="chevron-down" size={11} color={muted} /></View></ContextMenu><ContextMenu title="Discipline" dropdownMenuMode actions={[{ title: 'All disciplines', selected: !sheetDiscipline }, ...tree.map(node => ({ title: node.nameEn, selected: node.code === sheetDiscipline }))]} onPress={event => { setSheetDiscipline(event.nativeEvent.index === 0 ? '' : tree[event.nativeEvent.index - 1].code); setCollapsedGroups(new Set()); }}><View style={pill}><Ionicons name="layers-outline" size={14} color={sheetDiscipline ? '#007AFF' : muted} /><Text style={{ color: sheetDiscipline ? '#007AFF' : muted, fontSize: 12 }}>{tree.find(node => node.code === sheetDiscipline)?.nameEn || 'All disciplines'}</Text><Ionicons name="chevron-down" size={11} color={muted} /></View></ContextMenu>
                        <InstantTooltip label={allExpanded ? 'Collapse all' : 'Expand all'}><TouchableOpacity accessibilityLabel={allExpanded ? 'Collapse all' : 'Expand all'} disabled={!groupCodes.length} onPress={() => setCollapsedGroups(current => { const next = new Set(current); groupCodes.forEach(code => { if (allExpanded) next.add(code); else next.delete(code); }); return next; })} style={{ ...pill, width: 34, paddingHorizontal: 0 }}><Ionicons name={allExpanded ? 'contract-outline' : 'expand-outline'} size={16} color="#007AFF" /></TouchableOpacity></InstantTooltip>
                        <Text style={{ color: muted, fontSize: 11 }}>{matchingCount} items</Text>
                    </View>
                    <ScrollView style={{ flex: 1 }}><ScrollView horizontal><View style={{ minWidth: 700, flex: 1 }}>
                        <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: surface }}>{[['WBS', 110], ['Work description', sheetNameWidth], ['Volume', 100], ['Unit', 60], ['Status', 110]].map(([title, width]) => <Text key={title} style={{ ...label, width: Number(width) }}>{title}</Text>)}</View>
                        {sheetRows.map(({ node, depth, group }) => {
                            const value = drafts[node.code];
                            const expanded = !collapsedGroups.has(node.code);
                            return <TouchableOpacity key={node.code} accessibilityLabel={group ? `${expanded ? 'Collapse' : 'Expand'} ${node.nameEn}` : `Calculate ${node.nameEn}`} accessibilityState={group ? { expanded } : { selected: node.code === selectedCode }} disabled={isSaving} onPress={() => {
                                if (group) setCollapsedGroups(current => { const next = new Set(current); if (next.has(node.code)) next.delete(node.code); else next.add(node.code); return next; });
                                else { choose(node); setView('detail'); }
                            }} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderColor: border, backgroundColor: group ? surface : node.code === selectedCode ? isDark ? '#102749' : '#E8F0FF' : 'transparent' }}>
                                <Text style={{ width: 110, color: muted, fontSize: 12, fontWeight: group ? '600' : '400' }}>{node.code}</Text>
                                <View style={{ width: sheetNameWidth, paddingLeft: depth * 16, paddingRight: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>{group && <Ionicons name={expanded ? 'chevron-down' : 'chevron-forward'} size={14} color={muted} />}<Text numberOfLines={2} style={{ flex: 1, color: text, fontSize: 12, fontWeight: group ? '600' : '400' }}>{node.nameEn}</Text></View>
                                {group ? <View style={{ width: 270 }} /> : <><Text style={{ width: 100, color: value.dirty ? '#007AFF' : text, fontSize: 12, fontWeight: '600' }}>{number(value.dirty ? volumeUnitMismatch(value) ? null : volumeDraftTotal(value.rows) : value.applied)}</Text><Text style={{ width: 60, color: muted, fontSize: 12 }}>{value.unit}</Text><Text style={{ width: 110, color: value.dirty ? '#007AFF' : muted, fontSize: 11 }}>{volumeDraftStatus(value)}</Text></>}
                            </TouchableOpacity>;
                        })}
                        {!sheetRows.length && <Text style={{ color: muted, fontSize: 12, padding: 16 }}>No matching work items.</Text>}
                    </View></ScrollView></ScrollView>
                    <View style={{ padding: 14, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 18 }}><Text style={{ color: text, fontSize: 12, fontWeight: '600' }}>{statusCounts.Saved} saved</Text><Text style={{ color: muted, fontSize: 12 }}>{statusCounts['Not calculated']} not calculated</Text><Text style={{ color: '#007AFF', fontSize: 12 }}>{statusCounts.Unsaved} unsaved</Text><View style={{ flex: 1 }} /><Text style={{ color: muted, fontSize: 11 }}>{leaves.length} work items</Text></View>
                </> : <>
                    <View style={{ padding: 18, paddingBottom: 8, gap: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}><View style={{ flex: 1, minWidth: 160, gap: 4 }}><Text style={{ color: '#007AFF', fontSize: 11, fontWeight: '700' }}>{item.code}</Text><Text style={{ color: text, fontSize: 17, fontWeight: '700' }}>{item.nameEn}</Text>{!!item.nameId && item.nameId !== item.nameEn && <Text style={{ color: muted, fontSize: 12 }}>{item.nameId}</Text>}</View><View style={{ alignItems: 'flex-end', gap: 3 }}><Text style={{ color: '#007AFF', fontSize: 22, fontWeight: '700' }}>{number(total)} <Text style={{ fontSize: 13 }}>{draft.unit}</Text></Text>{draft.dirty && <Text style={{ color: muted, fontSize: 11 }}>Saved: {number(draft.applied)} {draft.appliedUnit || draft.unit}</Text>}</View></View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                            <SegmentedControl compact segments={[{ id: 'table', label: 'Table Input' }, { id: 'quick', label: 'Quick Input' }]} activeSegment={inputMode} onSegmentChange={setInputMode} />
                            <ContextMenu title="Item unit" dropdownMenuMode disabled={saving} actions={unitChoices.map(unit => ({ title: unit, selected: unit === draft.unit }))} onPress={event => update(selectedCode, setVolumeItemUnit(draft, unitChoices[event.nativeEvent.index]))}><View style={pill}><Text style={{ color: muted, fontSize: 11 }}>Unit</Text><Text style={{ color: text, fontSize: 12, fontWeight: '600' }}>{draft.unit}</Text><Ionicons name="chevron-down" size={11} color={muted} /></View></ContextMenu>
                            <View style={{ flex: 1 }} />
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><InstantTooltip label="Reset unsaved changes for this item"><TouchableOpacity accessibilityLabel="Reset item changes" disabled={saving || !draft.dirty} onPress={discard} style={{ ...pill, opacity: saving || !draft.dirty ? 0.45 : 1 }}><Ionicons name="refresh-outline" size={14} color={muted} /><Text style={{ color: text, fontSize: 12, fontWeight: '600' }}>Reset</Text></TouchableOpacity></InstantTooltip><InstantTooltip label="Save this item and apply its volume to RAB"><TouchableOpacity accessibilityLabel="Save this item and apply to RAB" disabled={saving || !draft.dirty} onPress={() => save()} style={{ ...pill, backgroundColor: '#007AFF', opacity: saving || !draft.dirty ? 0.45 : 1 }}><Ionicons name="save-outline" size={14} color="#FFFFFF" /><Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>{isSaving ? 'Saving…' : 'Save'}</Text></TouchableOpacity></InstantTooltip></View>
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
