import { ExcludedRABItems } from './ExcludedRABItems';
import { splitWBSNames } from '@/lib/projectWBSNames';
import { ProjectRABTotals } from './ProjectRABTotals';
import { readRABTotals, RABTotalsSettings } from '@/lib/projectRABTotals';
import { ProjectQuickEstimate } from './ProjectQuickEstimate';
import ContextMenu from '@/components/ui/PlatformContextMenu';
import { InstantTooltip } from '@/components/ui/InstantTooltip';
import { Ionicons } from '@expo/vector-icons';
import { ProjectRABSheet } from './ProjectRABSheet';
import { PlanningRevisionBar } from './PlanningRevisionBar';
import { planningRevision, PlanningImpact, PlanningVersion } from '@/lib/projectPlanningRevisions';
import { persistPlanningRevision } from '@/lib/api/projectPlanningRevisions';
import { publishedWBSRows } from '@/lib/projectWBSWorkflow';
import { ProjectStagesWork } from './ProjectStagesWork';
import { ProjectVolumeCalculator } from './ProjectVolumeCalculator';
import { ProjectWBSEditor } from './ProjectWBSEditor';
import { ProjectSchedulePlanner } from './ProjectSchedulePlanner';
import { saveProjectRAB } from '@/lib/api/projectRAB';
import { mergeRABDrafts, RABDrafts } from '@/lib/legacy-rab/editing';
import { legacyProjectInfo, legacyRABView } from '@/lib/legacy-rab/project-view';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { savedPlanningRows, rabItemAmount } from '@/lib/projectPlanningData';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, TextInput, View, Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import type { Project } from '@/lib/api/projects';
import { reportContentFields } from '@/lib/api/projectReports';

export type PlanningSection = 'stages' | 'wbs' | 'volume' | 'rab' | 'schedule' | 'reports';
const TABLES = { stages: 'project_stages', wbs: 'project_wbs_items', volume: 'project_volume_calcs', rab: 'project_rab_versions', schedule: 'project_schedule_versions', reports: 'project_reports' };
export function ProjectPlanningPanel({ project, section, isDark, onDirtyChange, onToolbarChange, onNavigatePlanning, onTitleAccessoryChange, onHeaderTrailingChange }: { project: Project; section: PlanningSection; isDark: boolean; onDirtyChange?: (dirty: boolean) => void; onToolbarChange?: (toolbar: React.ReactNode) => void; onNavigatePlanning?: (section: string) => void; onTitleAccessoryChange?: (accessory: React.ReactNode) => void; onHeaderTrailingChange?: (trailing: React.ReactNode) => void }) {
    const [legacyProject, setLegacyProject] = useState<any>(project);
    const [legacyWbs, setLegacyWbs] = useState<any[]>([]);
    const [revisionBusy, setRevisionBusy] = useState(false);
    const [rabVersion, setRabVersion] = useState(0);
    const rabSnapshot = planningRevision(legacyProject.meta, 'rab').versions.find(item => item.version === rabVersion)?.snapshot;
    const rabLocked = rabVersion > 0 || revisionBusy;
    const displayedProject = useMemo(() => rabSnapshot ? { ...legacyProject, meta: rabSnapshot.meta } : legacyProject, [rabSnapshot, legacyProject]);
    const quickDefaults = useMemo(() => ({ ...displayedProject, ...displayedProject.meta }), [displayedProject]);
    const displayedWbs = rabSnapshot?.wbs || legacyWbs;
    const rabStage = 'DETAIL';
    const [discipline, setDiscipline] = useState('all'), [quickOpen, setQuickOpen] = useState(false), [quickDirty, setQuickDirty] = useState(false);
    const [rabTab, setRabTab] = useState('rekap_samil');
    const [rabSearch, setRabSearch] = useState('');
    const [searchOpen, setSearchOpen] = useState(false);
    const [rabLanguages, setRabLanguages] = useState<'both' | 'en' | 'id'>('en');
    const [rabCollapsed, setRabCollapsed] = useState<Set<string>>(() => new Set());
    const [resetWidthsKey, setResetWidthsKey] = useState(0);
    const [excludedDraft, setExcludedDraft] = useState<string[] | null>(null);
    const excludedIds: string[] = useMemo(() => excludedDraft || displayedProject.meta?.rabExcludedIds || [], [excludedDraft, displayedProject.meta]);
    const [totalsDraft, setTotalsDraft] = useState<RABTotalsSettings | null>(null);
    const totalsSettings = totalsDraft || readRABTotals(displayedProject.meta?.rabTotals);
    const [drafts, setDrafts] = useState<RABDrafts>({});
    const [saving, setSaving] = useState(false), [saveError, setSaveError] = useState(''), [saveMessage, setSaveMessage] = useState('');
    const [activeCell, setActiveCell] = useState<{ code: string; field: string; address: string; value?: string } | null>(null);
    const dirty = Object.keys(drafts).length > 0 || totalsDraft !== null || excludedDraft !== null;
    const anyDirty = dirty || quickDirty;
    useEffect(() => { onDirtyChange?.(anyDirty); }, [anyDirty, onDirtyChange]);
    useEffect(() => {
        if (Platform.OS !== 'web' || !anyDirty) return;
        const guard = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
        window.addEventListener('beforeunload', guard);
        return () => window.removeEventListener('beforeunload', guard);
    }, [anyDirty]);
    const baseRows = useMemo(() => legacyRABView(legacyProjectInfo({ ...displayedProject, meta: { ...displayedProject.meta, rabExcludedIds: [] } }, displayedWbs, 'DETAIL'), 'all').rows, [displayedProject, displayedWbs]);
    const rabView = useMemo(() => {
        const meta = { ...mergeRABDrafts(displayedProject.meta || {}, drafts, baseRows), rabExcludedIds: excludedIds };
        return legacyRABView(legacyProjectInfo({ ...displayedProject, meta }, displayedWbs, rabStage), rabTab);
    }, [displayedProject, displayedWbs, rabStage, rabTab, drafts, baseRows, excludedIds]);
    const detailTotal = useMemo(() => legacyRABView(legacyProjectInfo({ ...displayedProject, meta: { ...mergeRABDrafts(displayedProject.meta || {}, drafts, baseRows), rabExcludedIds: excludedIds } }, displayedWbs, 'DETAIL'), 'all').subtotal, [displayedProject, drafts, baseRows, displayedWbs, excludedIds]);
    const edit = (code: string, field: string, value: string) => {
        if (rabLocked) return;
        setDrafts(current => ({ ...current, [code]: { ...current[code], [field]: value, ...(field === 'unitPrice' ? { priceSource: 'Manual' } : {}) } }));
        setSaveError(''); setSaveMessage('');
    };
    const save = async () => {
        if (rabLocked) return;
        setSaving(true); setSaveError(''); setSaveMessage('');
        try {
            const meta = await saveProjectRAB(project.id, legacyProject.meta || {}, drafts, baseRows, totalsSettings, excludedIds);
            setTotalsDraft(null); setExcludedDraft(null); setLegacyProject((current: any) => ({ ...current, meta })); setDrafts({}); setSaveMessage('Saved');
        } catch (err: any) { setSaveError(err.message || 'Unable to save changes.'); }
        finally { setSaving(false); }
    };
    const [rows, setRows] = useState<any[]>([]), [selected, setSelected] = useState<any>(null);
    const [loading, setLoading] = useState(true), [error, setError] = useState('');
    const [savedRows, setSavedRows] = useState<any[]>([]);
    const [retry, setRetry] = useState(0);
    const [stageTasks, setStageTasks] = useState<any[]>([]);
    const [rabItems, setRabItems] = useState<any[]>([]);
    const text = isDark ? '#FFFFFF' : '#1C1C1E', secondary = isDark ? '#AEAEB2' : '#636366', border = isDark ? '#292930' : '#E5E5EA';
    const pill = { height: 34, paddingHorizontal: 13, borderRadius: 999, backgroundColor: isDark ? '#1C1D23' : '#FFFFFF', flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, borderWidth: isDark ? 1 : 0, borderColor: border };
    const rabGroups = useMemo(() => rabView.rows.filter(row => row.isSection).map(row => row.code), [rabView.rows]);
    const rabExpanded = rabGroups.length > 0 && rabGroups.every(code => !rabCollapsed.has(code));
    useEffect(() => {
        let active = true;
        setLoading(true); setError(''); setSelected(null); setRows([]); setSavedRows([]);
        (async () => {
            const read = async (table: string, select = '*') => {
                const result: any[] = [];
                for (let offset = 0; ; offset += 500) {
                    const { data, error } = await supabase.from(table).select(select).eq('project_id', project.id).order('id').range(offset, offset + 499);
                    if (error) throw error;
                    result.push(...(data || []));
                    if (!data || data.length < 500) return result;
                }
            };
            const { data: current, error: projectError } = await supabase.from('projects').select('meta').eq('id', project.id).single();
            if (projectError) throw projectError;
            const wbs = ['rab', 'volume', 'schedule'].includes(section) ? publishedWBSRows(current?.meta, await read('project_wbs_items')) : [];
            if (active) { setLegacyProject({ ...project, meta: current?.meta || {} }); setLegacyWbs(wbs); const state = planningRevision(current?.meta, 'rab'); setRabVersion(state.draft ? 0 : state.versions.slice(-1)[0]?.version || 0); }
            if (section === 'stages') { const tasks = await read('project_tasks'); if (active) setStageTasks(tasks); }
            const saved = savedPlanningRows(section, current?.meta || {}, wbs);
            if (active) setSavedRows(saved);
            const result: any[] = [];
            for (let offset = 0; ; offset += 500) {
                const { data, error } = await supabase.from(TABLES[section]).select('*').eq('project_id', project.id).order('id').range(offset, offset + 499);
                if (error) throw error;
                result.push(...(data || []));
                if (!data || data.length < 500) break;
            }
            result.sort((a, b) => ['rab', 'schedule'].includes(section) ? Number(b.version_no || 0) - Number(a.version_no || 0) : Number(a.position || 0) - Number(b.position || 0));
            if (active) {
                setRows(result);
                if (section === 'volume') {
                    const codes = new Set(result.map(row => row.wbs_code));
                    const metadataCodes = new Set(saved.map(row => row.wbs_code));
                    const fallback = wbs.filter(row => row.quantity != null && !codes.has(row.wbs_code) && !metadataCodes.has(row.wbs_code)).map(row => ({ ...row, source: 'Saved WBS quantity' }));
                    setSavedRows([...saved.filter(row => !codes.has(row.wbs_code)), ...fallback]);
                }
            }
        })().catch(e => { if (active) setError(e.message || 'Unable to load project records.'); }).finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [project, section, retry]);
    useEffect(() => {
        if (!['rab', 'schedule'].includes(section) || !selected || selected.source) return;
        let active = true;
        setLoading(true); setError(''); setRabItems([]);
        (async () => {
            const result: any[] = [];
            for (let offset = 0; ; offset += 500) {
                const { data, error } = await supabase.from(section === 'rab' ? 'project_rab_items' : 'project_schedule_tasks').select('*, project_wbs_items(wbs_code, title)').eq('project_id', project.id).eq(section === 'rab' ? 'rab_version_id' : 'schedule_version_id', selected.id).order('id').range(offset, offset + 499);
                if (error) throw error;
                result.push(...(data || []));
                if (!data || data.length < 500) break;
            }
            if (active) setRabItems(result);
        })().catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [project.id, section, selected, retry]);
    const money = (value: unknown) => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value)) : '—';
    type Column = { field?: string; title: string; width: number; right?: boolean; value: (row: any) => unknown };
    const code: Column = { title: 'Code', width: 120, value: row => row.wbs_code || row.project_wbs_items?.wbs_code || row.stage_code || row.code };
    const description: Column = { field: 'title', title: 'Work Description', width: 320, value: row => row.title || row.name || row.project_wbs_items?.title || row.stage_name || row.report_type || '—' };
    const quantity: Column = { field: 'volume', title: 'Volume', width: 110, right: true, value: row => row.calculated_volume ?? row.qty ?? row.quantity };
    const unit: Column = { field: 'unit', title: 'Unit', width: 70, value: row => row.unit };
    const columns: Column[] = section === 'rab' ? [
        { title: 'Row', width: 65, right: true, value: row => row.rowIdx },
        { title: 'No', width: 100, value: row => row.no },
        code, description, quantity, unit,
        { field: 'unitPrice', title: 'Unit Price', width: 170, right: true, value: row => money(row.unit_price) },
        { title: 'Amount', width: 180, right: true, value: row => money(rabItemAmount(row)) },
        { title: 'Weight (%)', width: 110, right: true, value: row => row.weight !== undefined ? `${row.weight.toFixed(2)}%` : '—' },
    ] : section === 'schedule' ? [code, description,
        { title: 'Start', width: 130, value: row => row.start_date },
        { title: 'Finish', width: 130, value: row => row.end_date },
        { title: 'Duration (days)', width: 120, right: true, value: row => row.duration_days },
        { title: 'Progress (%)', width: 120, right: true, value: row => row.progress },
    ] : section === 'volume' ? [code, description, quantity, unit,
        { title: 'Formula', width: 140, value: row => row.formula_type },
        { title: 'Parameters', width: 280, value: row => row.parameters ? Object.entries(row.parameters).map(([key, value]) => `${key}: ${value}`).join(' · ') : '—' },
    ] : [code, description, quantity, unit, { title: 'Status', width: 130, value: row => row.status ?? (row.is_active === undefined ? undefined : row.is_active ? 'Active' : 'Inactive') }];
    const table = (data: any[], cols: Column[], onPress?: (row: any) => void, editable = false) => <ScrollView horizontal style={{ marginBottom: 24 }}>
        <View style={{ minWidth: cols.reduce((total, column) => total + column.width, 0), borderWidth: 1, borderColor: border }}>
            {editable && <View style={{ flexDirection: 'row', backgroundColor: isDark ? '#19191C' : '#F4F4F5', borderBottomWidth: 1, borderBottomColor: border }}>{cols.map((column, index) => <Text key={column.title} style={{ width: column.width, color: secondary, textAlign: 'center', padding: 6, borderRightWidth: 1, borderRightColor: border }}>{index === 0 ? '#' : String.fromCharCode(64 + index)}</Text>)}</View>}
            <View style={{ flexDirection: 'row', backgroundColor: isDark ? '#202024' : '#EDEDF1', borderBottomWidth: 1, borderBottomColor: border }}>
                {cols.map(column => <Text key={column.title} style={{ width: column.width, paddingHorizontal: 12, paddingVertical: 12, color: text, fontSize: 12, fontWeight: '700', textAlign: column.right ? 'right' : 'left', borderRightWidth: 1, borderRightColor: border }}>{column.title}</Text>)}
            </View>
            {data.map((row, index) => <TouchableOpacity key={row.id || row.code || index} disabled={!onPress && !editable} accessibilityRole={onPress ? 'button' : undefined} onPress={() => onPress?.(row)} style={{ flexDirection: 'row', backgroundColor: row.isSection ? (isDark ? '#252529' : '#EDEDF1') : index % 2 ? (isDark ? '#111114' : '#F8F8FA') : (isDark ? '#000000' : '#FFFFFF'), borderBottomWidth: index === data.length - 1 ? 0 : 1, borderBottomColor: border }}>
                {cols.map((column, cellIndex) => editable && column.field && !row.isSection && baseRows.some(item => item.code === row.code && !item.isSection) ? <TextInput
                    key={column.title} accessibilityLabel={`${row.code} ${column.title}`} editable={!saving}
                    value={drafts[row.code]?.[column.field] ?? String(row[column.field] ?? '')}
                    onFocus={() => setActiveCell({ code: row.code, field: column.field!, address: `${String.fromCharCode(64 + cellIndex)}${row.rowIdx}` })}
                    onChangeText={value => edit(row.code, column.field!, value)}
                    style={{ width: column.width, paddingHorizontal: 12, paddingVertical: 10, color: text, fontSize: 13, textAlign: column.right ? 'right' : 'left', borderWidth: 1, borderColor: activeCell?.code === row.code && activeCell?.field === column.field ? '#159957' : border }}
                /> : <Text key={column.title} style={{ width: column.width, paddingHorizontal: 12, paddingVertical: 10, color: text, fontSize: 13, fontWeight: row.isSection ? '700' : '400', lineHeight: 19, textAlign: column.right ? 'right' : 'left', borderRightWidth: 1, borderRightColor: border }}>{row.isSection && ['Volume', 'Unit', 'Unit Price', 'Amount'].includes(column.title) ? '' : String(column.value(row) ?? '—')}</Text>)}
            </TouchableOpacity>)}
            {!data.length && <Text style={{ color: secondary, padding: 16 }}>No saved data yet.</Text>}
        </View>
    </ScrollView>;
    const versions = ['rab', 'schedule'].includes(section);
    const versionColumns: Column[] = [
        { title: 'Version', width: 100, value: row => row.version_no },
        { title: 'Name', width: 320, value: row => row.name || row.title },
        { title: 'Status', width: 150, value: row => row.status || (row.is_locked ? 'Locked' : 'Draft') },
        { title: 'Notes', width: 300, value: row => row.notes },
    ];
    const [reviewsOpen, setReviewsOpen] = useState(false);
    const quickSaveRef = useRef<(() => Promise<void>) | null>(null);
    const quickResetRef = useRef<(() => void) | null>(null);
    const [quickBusy, setQuickBusy] = useState(false);
    const rabState = useMemo(() => planningRevision(legacyProject.meta, 'rab'), [legacyProject.meta]);
    const rabLatest = rabState.versions.slice(-1)[0];
    const rabSource = rabVersion ? rabState.versions.find(item => item.version === rabVersion) : null;
    const rabImpacts: PlanningImpact[] = useMemo(() => (legacyProject.meta?.planningImpact?.items || []).filter((item: PlanningImpact) => item.rabReview), [legacyProject.meta]);
    const rabVolumeDraft = !!planningRevision(legacyProject.meta, 'volume').draft;
    const versionChoices = useMemo(() => [
        ...(rabState.draft ? [{ title: 'RAB Draft', version: 0 }] : []),
        ...[...rabState.versions].reverse().map((version: PlanningVersion) => ({ title: `RAB v.${version.version}`, version: version.version }))
    ], [rabState]);

    const actRevision = async (action: 'start' | 'publish' | 'review', id?: string) => {
        if (anyDirty) { setSaveError('Save or reset unsaved changes before continuing.'); return; }
        setRevisionBusy(true); setSaveError('');
        try {
            const next = await persistPlanningRevision(project.id, 'rab', action, id);
            setLegacyProject((current: any) => ({ ...current, meta: next }));
            if (action !== 'review') setRabVersion(action === 'start' ? 0 : planningRevision(next, 'rab').versions.slice(-1)[0].version);
        } catch (err: any) {
            setSaveError(err.message || 'Unable to update revision.');
        } finally {
            setRevisionBusy(false);
        }
    };

    useEffect(() => {
        if (section !== 'rab') return;
        onTitleAccessoryChange?.(
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'nowrap', minWidth: 0 }}>
                <ContextMenu
                    title="Estimation Method"
                    dropdownMenuMode
                    actions={[
                        { title: 'Detail RAB', selected: !quickOpen },
                        { title: 'Quick Estimates', selected: quickOpen }
                    ]}
                    onPress={event => {
                        const next = event.nativeEvent.index === 1;
                        if (quickDirty) { setSaveError('Save or reset Quick Estimates before switching stages.'); return; }
                        setQuickOpen(next);
                        setRabTab(next ? 'all' : 'rekap_samil');
                        setActiveCell(null);
                    }}
                >
                    <View style={{ height: 34, paddingHorizontal: 11, borderRadius: 999, backgroundColor: isDark ? '#1C1D23' : '#FFFFFF', borderWidth: isDark ? 1 : 0, borderColor: border, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <Text style={{ color: secondary, fontSize: 11, fontWeight: '500' }}>Method:</Text>
                        <Text style={{ color: text, fontSize: 12, fontWeight: '600' }}>{quickOpen ? 'Quick Estimates' : 'Detail RAB'}</Text>
                        <Ionicons name="chevron-down" size={11} color={secondary} />
                    </View>
                </ContextMenu>

                <SegmentedControl
                    compact
                    segments={[{ id: 'summary', label: 'Summary' }, { id: 'detail', label: 'Detail' }]}
                    activeSegment={rabTab === 'rekap_samil' ? 'summary' : 'detail'}
                    onSegmentChange={value => {
                        setRabTab(value === 'summary' ? 'rekap_samil' : (quickOpen ? 'all' : discipline));
                        setActiveCell(null);
                    }}
                />

                {!quickOpen && rabTab !== 'rekap_samil' && (
                    <ContextMenu
                        title="Discipline"
                        dropdownMenuMode
                        actions={[
                            { title: 'All disciplines', selected: discipline === 'all' },
                            ...rabView.tabs.map(tab => ({ title: tab.label, selected: tab.id === discipline }))
                        ]}
                        onPress={event => {
                            const value = event.nativeEvent.index ? rabView.tabs[event.nativeEvent.index - 1].id : 'all';
                            setDiscipline(value);
                            setRabTab(value);
                            setActiveCell(null);
                        }}
                    >
                        <View style={{ height: 34, paddingHorizontal: 11, borderRadius: 999, backgroundColor: isDark ? '#1C1D23' : '#FFFFFF', borderWidth: isDark ? 1 : 0, borderColor: border, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                            <Text style={{ color: text, fontSize: 12, fontWeight: '500' }}>
                                {rabView.tabs.find(tab => tab.id === discipline)?.label || 'All disciplines'}
                            </Text>
                            <Ionicons name="chevron-down" size={11} color={secondary} />
                        </View>
                    </ContextMenu>
                )}

                <ContextMenu
                    title="RAB versions"
                    dropdownMenuMode
                    disabled={revisionBusy}
                    actions={versionChoices.map(c => ({ title: c.title, selected: c.version === rabVersion }))}
                    onPress={event => {
                        if (anyDirty) { setSaveError('Save or reset unsaved changes before switching versions.'); return; }
                        setRabVersion(versionChoices[event.nativeEvent.index].version);
                        setActiveCell(null);
                    }}
                >
                    <View style={{ height: 34, paddingHorizontal: 11, borderRadius: 999, backgroundColor: isDark ? '#1C1D23' : '#FFFFFF', borderWidth: isDark ? 1 : 0, borderColor: border, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <Text style={{ color: secondary, fontSize: 11, fontWeight: '500' }}>Version:</Text>
                        <Text style={{ color: text, fontSize: 12, fontWeight: '600' }}>
                            {rabVersion ? `v.${rabVersion}` : 'Draft'}
                        </Text>
                        <Ionicons name="chevron-down" size={11} color={secondary} />
                    </View>
                </ContextMenu>

                {!!rabSource && (
                    <Text numberOfLines={1} style={{ color: secondary, fontSize: 11, flexShrink: 1, maxWidth: 140 }}>
                        {`Published · WBS v.${rabSource.wbsVersion}`}
                    </Text>
                )}

                {!rabVersion && (rabImpacts.length > 0 || rabVolumeDraft) && (
                    <TouchableOpacity
                        accessibilityLabel="Review alerts"
                        onPress={() => setReviewsOpen(value => !value)}
                        style={{ paddingHorizontal: 10, height: 26, borderRadius: 999, backgroundColor: isDark ? '#1C293A' : '#E8F0FF', justifyContent: 'center' }}
                    >
                        <Text style={{ color: '#007AFF', fontSize: 11, fontWeight: '600' }}>
                            {rabImpacts.length ? `${rabImpacts.length} review` : 'Volume update'} · {reviewsOpen ? 'Hide' : 'View'}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
        );
        return () => onTitleAccessoryChange?.(null);
    }, [
        section, quickOpen, quickDirty, rabTab, discipline, rabView.tabs,
        versionChoices, rabVersion, revisionBusy, anyDirty, rabSource,
        rabImpacts.length, rabVolumeDraft, reviewsOpen, isDark, text, secondary, border
    ]);

    useEffect(() => {
        if (section !== 'rab') return;
        onHeaderTrailingChange?.(
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {!searchOpen && !rabSearch ? (
                    <TouchableOpacity
                        accessibilityLabel="Search work items"
                        onPress={() => setSearchOpen(true)}
                        style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: isDark ? '#1C1D23' : '#FFFFFF', borderWidth: isDark ? 1 : 0, borderColor: border, alignItems: 'center', justifyContent: 'center' }}
                    >
                        <Ionicons name="search-outline" size={15} color={secondary} />
                    </TouchableOpacity>
                ) : (
                    <View style={{ height: 34, paddingHorizontal: 10, borderRadius: 999, backgroundColor: isDark ? '#1C1D23' : '#FFFFFF', borderWidth: isDark ? 1 : 0, borderColor: border, flexDirection: 'row', alignItems: 'center', gap: 6, width: 200 }}>
                        <Ionicons name="search-outline" size={14} color={secondary} />
                        <TextInput
                            autoFocus
                            accessibilityLabel="Search RAB"
                            value={rabSearch}
                            onChangeText={value => { setRabSearch(value); setRabCollapsed(new Set()); }}
                            placeholder="Search work items"
                            placeholderTextColor={secondary}
                            onBlur={() => { if (!rabSearch) setSearchOpen(false); }}
                            style={{ flex: 1, minWidth: 0, color: text, fontSize: 12, padding: 0 }}
                        />
                        {!!rabSearch && (
                            <TouchableOpacity
                                accessibilityLabel="Clear search"
                                onPress={() => { setRabSearch(''); setSearchOpen(false); }}
                                style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA', alignItems: 'center', justifyContent: 'center' }}
                            >
                                <Ionicons name="close" size={12} color={secondary} />
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                <ContextMenu
                    title="Description columns"
                    dropdownMenuMode
                    actions={[
                        { title: 'English + Indonesia', selected: rabLanguages === 'both' },
                        { title: 'English only', selected: rabLanguages === 'en' },
                        { title: 'Indonesia only', selected: rabLanguages === 'id' }
                    ]}
                    onPress={event => setRabLanguages(['both', 'en', 'id'][event.nativeEvent.index] as any)}
                >
                    <View style={{ height: 34, paddingHorizontal: 11, borderRadius: 999, backgroundColor: isDark ? '#1C1D23' : '#FFFFFF', borderWidth: isDark ? 1 : 0, borderColor: border, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <Text style={{ color: text, fontSize: 12, fontWeight: '500' }}>
                            {rabLanguages === 'both' ? 'EN + ID' : rabLanguages.toUpperCase()}
                        </Text>
                        <Ionicons name="chevron-down" size={11} color={secondary} />
                    </View>
                </ContextMenu>

                <ContextMenu
                    title="Export"
                    dropdownMenuMode
                    actions={['XLS', 'CSV', 'PDF'].map(format => ({ title: `${format} · Coming soon`, disabled: true }))}
                    onPress={() => {}}
                >
                    <View style={{ height: 34, paddingHorizontal: 11, borderRadius: 999, backgroundColor: isDark ? '#1C1D23' : '#FFFFFF', borderWidth: isDark ? 1 : 0, borderColor: border, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <Ionicons name="download-outline" size={14} color="#007AFF" />
                        <Text style={{ color: '#007AFF', fontSize: 12, fontWeight: '600' }}>Export</Text>
                        <Ionicons name="chevron-down" size={11} color="#007AFF" />
                    </View>
                </ContextMenu>

                <ContextMenu
                    title="Table options"
                    dropdownMenuMode
                    actions={quickOpen ? [
                        { title: 'Reset estimates to original', disabled: !quickDirty },
                        { title: 'Reset column widths' },
                    ] : [
                        { title: 'Expand all groups' },
                        { title: 'Collapse all groups' },
                        { title: 'Show discipline groups only' },
                        { title: 'Show through level 2' },
                        { title: 'Reset column widths' }
                    ]}
                    onPress={event => {
                        if (quickOpen) {
                            if (event.nativeEvent.index === 0) quickResetRef.current?.();
                            else if (event.nativeEvent.index === 1) setResetWidthsKey(k => k + 1);
                        } else {
                            if (event.nativeEvent.index === 0) setRabCollapsed(new Set());
                            else if (event.nativeEvent.index === 1) setRabCollapsed(new Set(rabGroups));
                            else if (event.nativeEvent.index === 2) setRabCollapsed(new Set(rabGroups.filter(code => code.split('.').length >= 1)));
                            else if (event.nativeEvent.index === 3) setRabCollapsed(new Set(rabGroups.filter(code => code.split('.').length >= 2)));
                            else if (event.nativeEvent.index === 4) setResetWidthsKey(k => k + 1);
                        }
                    }}
                >
                    <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: isDark ? '#1C1D23' : '#FFFFFF', borderWidth: isDark ? 1 : 0, borderColor: border, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="ellipsis-horizontal" size={17} color={secondary} />
                    </View>
                </ContextMenu>

                <ContextMenu
                    title="RAB actions"
                    dropdownMenuMode
                    actions={[
                        { title: (saving || quickBusy) ? 'Saving…' : quickOpen ? 'Save Estimates' : 'Save RAB', disabled: rabLocked || !(quickOpen ? quickDirty : dirty) || saving || quickBusy },
                        { title: revisionBusy ? 'Please wait…' : rabState.draft ? rabVersion ? 'Open Draft' : rabLatest ? 'Publish Revision' : 'Publish RAB' : 'Add Revision', disabled: revisionBusy || anyDirty }
                    ]}
                    onPress={event => {
                        if (event.nativeEvent.index === 0) {
                            if (quickOpen) quickSaveRef.current?.();
                            else save();
                        } else {
                            actRevision(rabState.draft && !rabVersion ? 'publish' : 'start');
                        }
                    }}
                >
                    <View style={{
                        height: 34,
                        paddingHorizontal: 15,
                        borderRadius: 999,
                        backgroundColor: '#007AFF',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 5,
                        opacity: (rabLocked || !(quickOpen ? quickDirty : dirty) || saving || quickBusy) && (revisionBusy || anyDirty) ? 0.6 : 1
                    }}>
                        <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}>
                            {(saving || quickBusy) ? 'Saving…' : 'Save'}
                        </Text>
                        <Ionicons name="chevron-down" size={11} color="#FFFFFF" />
                    </View>
                </ContextMenu>
            </View>
        );
        return () => onHeaderTrailingChange?.(null);
    }, [
        section, searchOpen, rabSearch, isDark, secondary, text, rabLanguages,
        rabGroups, saving, quickBusy, quickOpen, quickDirty, rabLocked, dirty,
        revisionBusy, rabState, rabVersion, rabLatest, anyDirty
    ]);

    if (section === 'volume') return <View style={{ flex: 1, minHeight: 0, paddingHorizontal: 20, paddingBottom: 16 }}>
        {loading && <ActivityIndicator color="#007AFF" />}
        {!!error && <View><Text accessibilityRole="alert" style={{ color: '#FF3B30', paddingVertical: 12 }}>{error}</Text><TouchableOpacity onPress={() => setRetry(value => value + 1)}><Text style={{ color: '#007AFF' }}>Retry</Text></TouchableOpacity></View>}
        {!loading && !error && <ProjectVolumeCalculator onTitleAccessoryChange={onTitleAccessoryChange} onHeaderTrailingChange={onHeaderTrailingChange} key={project.id} project={legacyProject} wbs={legacyWbs} calculations={rows} isDark={isDark} onDirtyChange={onDirtyChange} />}
    </View>;
    if (section === 'schedule') return <View style={{ flex: 1, minHeight: 0, paddingHorizontal: 20, paddingBottom: 16 }}>
        {loading && <ActivityIndicator color="#007AFF" />}
        {!!error && <View><Text accessibilityRole="alert" style={{ color: '#FF3B30', paddingVertical: 12 }}>{error}</Text><TouchableOpacity onPress={() => setRetry(value => value + 1)}><Text style={{ color: '#007AFF' }}>Retry</Text></TouchableOpacity></View>}
        {!loading && !error && <ProjectSchedulePlanner onTitleAccessoryChange={onTitleAccessoryChange} onHeaderTrailingChange={onHeaderTrailingChange} key={project.id} project={legacyProject} wbs={displayedWbs} isDark={isDark} onDirtyChange={onDirtyChange} onProjectMetaChange={meta => setLegacyProject((curr: any) => ({ ...curr, meta }))} />}
    </View>;
    return <ScrollView contentContainerStyle={[{ padding: 24, paddingBottom: 60 }, ['stages', 'wbs'].includes(section) ? { maxWidth: 960, width: '100%', alignSelf: 'center' } : undefined]}>
        {selected && <TouchableOpacity onPress={() => { setSelected(null); setError(''); }} style={{ paddingVertical: 12, marginBottom: 12 }}><Text style={{ color: '#007AFF', fontWeight: '600' }}>‹ Back to list</Text></TouchableOpacity>}
        {loading && <ActivityIndicator color="#007AFF" />}
        {!!error && <View><Text accessibilityRole="alert" style={{ color: '#FF3B30', marginBottom: 16 }}>{error}</Text><TouchableOpacity onPress={() => setRetry(value => value + 1)} style={{ padding: 12 }}><Text style={{ color: '#0036F8' }}>Retry</Text></TouchableOpacity></View>}
        {section === 'stages' && !loading && !error && <ProjectStagesWork key={project.id} project={legacyProject} records={stageTasks} isDark={isDark} onDirtyChange={onDirtyChange} onTitleAccessoryChange={onTitleAccessoryChange} onHeaderTrailingChange={onHeaderTrailingChange} />}
        {section === 'wbs' && !loading && !error && <ProjectWBSEditor onTitleAccessoryChange={onTitleAccessoryChange} onHeaderTrailingChange={onHeaderTrailingChange} onNavigatePlanning={onNavigatePlanning} onToolbarChange={onToolbarChange} key={project.id} project={legacyProject} items={rows} isDark={isDark} onDirtyChange={onDirtyChange} />}
        {!selected && section === 'rab' && !loading && !error && <>
            {reviewsOpen && !rabVersion && (rabImpacts.length > 0 || rabVolumeDraft) && (
                <View style={{ padding: 14, borderRadius: 12, backgroundColor: isDark ? '#102749' : '#E8F0FF', gap: 10, marginBottom: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={{ color: '#007AFF', fontSize: 13, fontWeight: '600' }}>
                            {rabImpacts.length ? `WBS v.${legacyProject.meta?.planningImpact?.wbsVersion || 1} · ${rabImpacts.length} items need RAB review` : 'Volume update available'}
                        </Text>
                        <TouchableOpacity onPress={() => setReviewsOpen(false)} style={{ padding: 4 }}>
                            <Ionicons name="close" size={16} color="#007AFF" />
                        </TouchableOpacity>
                    </View>
                    {rabImpacts.map(item => (
                        <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <TouchableOpacity
                                disabled={item.kind === 'removed'}
                                onPress={() => {
                                    const row = legacyWbs.find(w => w.id === item.id);
                                    if (row) {
                                        setRabTab('all');
                                        setDiscipline('all');
                                        setActiveCell({ code: row.wbs_code, field: 'volume', address: row.wbs_code });
                                    }
                                }}
                                style={{ flex: 1 }}
                            >
                                <Text style={{ color: text, fontSize: 12 }}>
                                    {item.code} · {item.title} · {item.kind === 'unit' ? 'Unit changed' : item.kind === 'structure' ? 'Hierarchy changed' : item.kind === 'added' ? 'New item' : item.kind === 'volume' ? 'Volume updated' : 'Removed item'}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity disabled={revisionBusy || anyDirty} onPress={() => actRevision('review', item.id)}>
                                <Text style={{ color: '#007AFF', fontSize: 12, fontWeight: '600' }}>Mark reviewed</Text>
                            </TouchableOpacity>
                        </View>
                    ))}
                    {rabVolumeDraft && (
                        <Text style={{ color: '#007AFF', fontSize: 12 }}>
                            Volume update available · Review and publish Volume before publishing RAB.
                        </Text>
                    )}
                </View>
            )}
            {quickOpen && <ProjectQuickEstimate key={rabVersion} projectId={project.id} saved={displayedProject.meta?.quickEstimate} defaults={quickDefaults} wbs={displayedWbs} summary={rabTab === 'rekap_samil'} isDark={isDark} readOnly={rabLocked || saving} onMetaChange={meta => setLegacyProject((current: any) => ({ ...current, meta }))} onDirtyChange={setQuickDirty} hideToolbar={true} language={rabLanguages} onSaveRef={fn => { quickSaveRef.current = fn; }} onResetRef={fn => { quickResetRef.current = fn; }} onBusyChange={setQuickBusy} />}
            {!!saveError && <Text accessibilityRole="alert" style={{ color: '#FF3B30', marginBottom: 12 }}>{saveError}</Text>}
            {!quickOpen && <>
            <ProjectRABSheet
                summary={rabTab === 'rekap_samil'}
                rows={rabTab === 'rekap_samil' ? rabView.rows.filter(row => !row.isSection) : rabView.rows}
                wbs={displayedWbs}
                meta={displayedProject.meta || {}}
                drafts={drafts}
                isDark={isDark}
                editable={!rabLocked && !saving && rabTab !== 'rekap_samil' && rabTab !== 'detail_level2' && rabStage === 'DETAIL'}
                onEdit={edit}
                onCellFocus={setActiveCell}
                onExclude={rabLocked || saving ? undefined : code => { const item = displayedWbs.find(row => row.wbs_code === code); if (item) { setExcludedDraft([...new Set([...excludedIds, item.id])]); setActiveCell(null); } }}
                hideToolbar={true}
                tableSearch={rabSearch}
                onTableSearchChange={setRabSearch}
                languages={rabLanguages}
                onLanguagesChange={setRabLanguages}
                collapsed={rabCollapsed}
                onCollapsedChange={setRabCollapsed}
                resetWidthsKey={resetWidthsKey}
                subtotal={detailTotal}
            />
            <ExcludedRABItems items={displayedWbs.filter(row => excludedIds.includes(row.id)).map(row => ({ id: row.id, code: row.wbs_code, title: splitWBSNames(row).title }))} onRestore={id => setExcludedDraft(excludedIds.filter(value => value !== id))} isDark={isDark} readOnly={rabLocked || saving} />
            <View style={{ marginTop: 16 }}><ProjectRABTotals subtotal={detailTotal} settings={totalsSettings} isDark={isDark} readOnly={rabLocked || saving} onChange={setTotalsDraft} /></View>
            {(dirty || !!saveMessage) && <Text style={{ color: secondary, fontSize: 11 }}>{dirty ? 'Unsaved' : saveMessage}</Text>}
            </>}
        </>}
        {!selected && !['stages', 'wbs', 'volume', 'schedule'].includes(section) && <>
            {section !== 'rab' && !!savedRows.length && <>
                <Text style={{ color: text, fontSize: 16, fontWeight: '600', marginBottom: 12 }}>{section === 'schedule' ? 'Schedule' : 'Volume'} · Saved Data</Text>
                {table(savedRows, columns)}
            </>}
            {versions && !!rows.length && <Text style={{ color: text, fontSize: 16, fontWeight: '600', marginBottom: 12 }}>Saved Versions</Text>}
            {(rows.length > 0 || (section !== 'rab' && !savedRows.length && !loading && !error)) && table(rows, versions ? versionColumns : columns, versions || section === 'reports' ? setSelected : undefined)}
        </>}
        {selected && <>
            <Text style={{ color: text, fontSize: 18, fontWeight: '600', marginBottom: 16 }}>{selected.name || selected.title || 'Details'}</Text>
            {versions ? table(rabItems, columns) : table([selected], columns)}
            {section === 'reports' && table(reportContentFields(selected.content).map(([label, value]) => ({ id: label, label, value: typeof value === 'object' ? JSON.stringify(value) : value })), [
                { title: 'Field', width: 200, value: row => row.label },
                { title: 'Isi', width: 600, value: row => row.value },
            ])}
        </>}
    </ScrollView>;
}
