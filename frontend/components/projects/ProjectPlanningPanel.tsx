import { currencyWords } from '@/lib/currencyWords';
import { ProjectQuickEstimate } from './ProjectQuickEstimate';
import ContextMenu from '@/components/ui/PlatformContextMenu';
import { Ionicons } from '@expo/vector-icons';
import { ProjectRABSheet } from './ProjectRABSheet';
import { PlanningRevisionBar } from './PlanningRevisionBar';
import { planningRevision } from '@/lib/projectPlanningRevisions';
import { publishedWBSRows } from '@/lib/projectWBSWorkflow';
import { ProjectStagesWork } from './ProjectStagesWork';
import { ProjectVolumeCalculator } from './ProjectVolumeCalculator';
import { ProjectWBSEditor } from './ProjectWBSEditor';
import { saveProjectRAB } from '@/lib/api/projectRAB';
import { mergeRABDrafts, RABDrafts } from '@/lib/legacy-rab/editing';
import { legacyProjectInfo, legacyRABView } from '@/lib/legacy-rab/project-view';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { savedPlanningRows, rabItemAmount } from '@/lib/projectPlanningData';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, TextInput, Switch, View, Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import type { Project } from '@/lib/api/projects';
import { reportContentFields } from '@/lib/api/projectReports';

export type PlanningSection = 'stages' | 'wbs' | 'volume' | 'rab' | 'schedule' | 'reports';
const TABLES = { stages: 'project_stages', wbs: 'project_wbs_items', volume: 'project_volume_calcs', rab: 'project_rab_versions', schedule: 'project_schedule_versions', reports: 'project_reports' };
export function ProjectPlanningPanel({ project, section, isDark, onDirtyChange, onToolbarChange, onNavigatePlanning, onTitleAccessoryChange }: { project: Project; section: PlanningSection; isDark: boolean; onDirtyChange?: (dirty: boolean) => void; onToolbarChange?: (toolbar: React.ReactNode) => void; onNavigatePlanning?: (section: string) => void; onTitleAccessoryChange?: (accessory: React.ReactNode) => void }) {
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
    const [discipline, setDiscipline] = useState('all'), [showFormula, setShowFormula] = useState(false), [quickOpen, setQuickOpen] = useState(false), [quickDirty, setQuickDirty] = useState(false);
    const [rabTab, setRabTab] = useState('rekap_samil');
    const [includePPN, setIncludePPN] = useState(true);
    const [drafts, setDrafts] = useState<RABDrafts>({});
    const [saving, setSaving] = useState(false), [saveError, setSaveError] = useState(''), [saveMessage, setSaveMessage] = useState('');
    const [activeCell, setActiveCell] = useState<{ code: string; field: string; address: string; value?: string } | null>(null);
    const dirty = Object.keys(drafts).length > 0;
    const anyDirty = dirty || quickDirty;
    useEffect(() => { onDirtyChange?.(anyDirty); }, [anyDirty, onDirtyChange]);
    useEffect(() => {
        if (Platform.OS !== 'web' || !anyDirty) return;
        const guard = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
        window.addEventListener('beforeunload', guard);
        return () => window.removeEventListener('beforeunload', guard);
    }, [anyDirty]);
    const baseRows = useMemo(() => legacyRABView(legacyProjectInfo(displayedProject, displayedWbs, 'DETAIL'), 'all').rows, [displayedProject, displayedWbs]);
    const rabView = useMemo(() => {
        const meta = mergeRABDrafts(displayedProject.meta || {}, drafts, baseRows);
        return legacyRABView(legacyProjectInfo({ ...displayedProject, meta }, displayedWbs, rabStage), rabTab);
    }, [displayedProject, displayedWbs, rabStage, rabTab, drafts, baseRows]);
    const detailTotal = useMemo(() => legacyRABView(legacyProjectInfo({ ...displayedProject, meta: mergeRABDrafts(displayedProject.meta || {}, drafts, baseRows) }, displayedWbs, 'DETAIL'), 'all').subtotal, [displayedProject, drafts, baseRows, displayedWbs]);
    const edit = (code: string, field: string, value: string) => {
        if (rabLocked) return;
        setDrafts(current => ({ ...current, [code]: { ...current[code], [field]: value, ...(field === 'unitPrice' ? { priceSource: 'Manual' } : {}) } }));
        setSaveError(''); setSaveMessage('');
    };
    const save = async () => {
        if (rabLocked) return;
        setSaving(true); setSaveError(''); setSaveMessage('');
        try {
            const meta = await saveProjectRAB(project.id, legacyProject.meta || {}, drafts, baseRows);
            setLegacyProject((current: any) => ({ ...current, meta })); setDrafts({}); setSaveMessage('Saved');
        } catch (err: any) { setSaveError(err.message || 'Unable to save changes.'); }
        finally { setSaving(false); }
    };
    const [rows, setRows] = useState<any[]>([]), [selected, setSelected] = useState<any>(null);
    const [loading, setLoading] = useState(true), [error, setError] = useState('');
    const [savedRows, setSavedRows] = useState<any[]>([]);
    const [retry, setRetry] = useState(0);
    const [stageTasks, setStageTasks] = useState<any[]>([]);
    const [rabItems, setRabItems] = useState<any[]>([]);
    const text = isDark ? '#FFFFFF' : '#1C1C1E', secondary = isDark ? '#AEAEB2' : '#636366';
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
    const border = isDark ? '#303034' : '#D1D1D6';
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
    const stagePicker = useMemo(() => <ContextMenu title="RAB stage" dropdownMenuMode actions={[{ title: 'Quick Estimates', selected: quickOpen }, { title: 'Detail RAB', selected: !quickOpen }]} onPress={event => { const next = event.nativeEvent.index === 0; if (quickDirty) { setSaveError('Save or reset Quick Estimates before switching stages.'); return; } setQuickOpen(next); setRabTab(next ? 'all' : 'rekap_samil'); setActiveCell(null); }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, height: 34, paddingHorizontal: 14, borderRadius: 999, backgroundColor: isDark ? '#1C1D23' : '#F2F2F7' }}><Text style={{ color: text, fontSize: 12, fontWeight: '600' }}>{quickOpen ? 'Quick Estimates' : 'Detail RAB'}</Text><Ionicons name="chevron-down" size={12} color={secondary} /></View></ContextMenu>, [quickOpen, quickDirty, isDark, text, secondary]);
    useEffect(() => { if (section !== 'rab') return; onTitleAccessoryChange?.(stagePicker); return () => onTitleAccessoryChange?.(null); }, [section, stagePicker, onTitleAccessoryChange]);
    if (section === 'volume') return <View style={{ flex: 1, minHeight: 0, paddingHorizontal: 20, paddingBottom: 16 }}>
        {loading && <ActivityIndicator color="#007AFF" />}
        {!!error && <View><Text accessibilityRole="alert" style={{ color: '#FF3B30', paddingVertical: 12 }}>{error}</Text><TouchableOpacity onPress={() => setRetry(value => value + 1)}><Text style={{ color: '#007AFF' }}>Retry</Text></TouchableOpacity></View>}
        {!loading && !error && <ProjectVolumeCalculator key={project.id} project={legacyProject} wbs={legacyWbs} calculations={rows} isDark={isDark} onDirtyChange={onDirtyChange} />}
    </View>;
    return <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 60 }}>
        {selected && <TouchableOpacity onPress={() => { setSelected(null); setError(''); }} style={{ paddingVertical: 12, marginBottom: 12 }}><Text style={{ color: '#007AFF', fontWeight: '600' }}>‹ Back to list</Text></TouchableOpacity>}
        {loading && <ActivityIndicator color="#007AFF" />}
        {!!error && <View><Text accessibilityRole="alert" style={{ color: '#FF3B30', marginBottom: 16 }}>{error}</Text><TouchableOpacity onPress={() => setRetry(value => value + 1)} style={{ padding: 12 }}><Text style={{ color: '#0036F8' }}>Retry</Text></TouchableOpacity></View>}
        {section === 'stages' && !loading && !error && <ProjectStagesWork key={project.id} project={legacyProject} records={stageTasks} isDark={isDark} onDirtyChange={onDirtyChange} />}
        {section === 'wbs' && !loading && !error && <ProjectWBSEditor onNavigatePlanning={onNavigatePlanning} onToolbarChange={onToolbarChange} key={project.id} project={legacyProject} items={rows} isDark={isDark} onDirtyChange={onDirtyChange} />}
        {!selected && section === 'rab' && !loading && !error && <>
            {!quickOpen ? <PlanningRevisionBar projectId={project.id} meta={legacyProject.meta} module="rab" compactAlerts leading={<><SegmentedControl compact segments={[{ id: 'summary', label: 'Summary' }, { id: 'detail', label: 'Detail' }]} activeSegment={rabTab === 'rekap_samil' ? 'summary' : 'detail'} onSegmentChange={value => { setRabTab(value === 'summary' ? 'rekap_samil' : discipline); setActiveCell(null); }} /></>} beforePublish={<><TouchableOpacity disabled={rabLocked || !dirty || saving} onPress={save} style={{ backgroundColor: '#007AFF', opacity: rabLocked || !dirty || saving ? 0.4 : 1, height: 34, paddingHorizontal: 18, borderRadius: 999, justifyContent: 'center' }}><Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}>{saving ? 'Saving…' : 'Save'}</Text></TouchableOpacity></>} onBusyChange={setRevisionBusy} dirty={anyDirty} isDark={isDark} selected={rabVersion} onSelect={version => { setRabVersion(version); setActiveCell(null); }} onMetaChange={meta => setLegacyProject((current: any) => ({ ...current, meta }))} onOpenItem={id => { const row = legacyWbs.find(item => item.id === id); if (row) { setRabTab('all'); setDiscipline('all'); setActiveCell({ code: row.wbs_code, field: 'volume', address: row.wbs_code }); } }} /> : null}
            {quickOpen && <ProjectQuickEstimate key={rabVersion} projectId={project.id} saved={displayedProject.meta?.quickEstimate} toolbarLeading={<SegmentedControl compact segments={[{ id: 'summary', label: 'Summary' }, { id: 'detail', label: 'Detail' }]} activeSegment={rabTab === 'rekap_samil' ? 'summary' : 'detail'} onSegmentChange={value => setRabTab(value === 'summary' ? 'rekap_samil' : 'all')} />} defaults={quickDefaults} wbs={displayedWbs} summary={rabTab === 'rekap_samil'} isDark={isDark} readOnly={rabLocked || saving} onMetaChange={meta => setLegacyProject((current: any) => ({ ...current, meta }))} onDirtyChange={setQuickDirty} />}
            {!!saveError && <Text accessibilityRole="alert" style={{ color: '#FF3B30', marginBottom: 12 }}>{saveError}</Text>}
            {!quickOpen && <>
            {showFormula && <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: border, marginBottom: 8 }}>
                <Text style={{ color: '#159957', width: 80, textAlign: 'center', fontWeight: '700' }}>{activeCell?.address || '—'}</Text><Text style={{ color: secondary, padding: 10 }}>fx</Text>
                <TextInput accessibilityLabel="Formula bar" editable={!!activeCell && !saving && !rabLocked} value={activeCell ? drafts[activeCell.code]?.[activeCell.field] ?? activeCell.value ?? String(rabView.rows.find(row => row.code === activeCell.code)?.[activeCell.field as 'title'] ?? '') : ''} onChangeText={value => { if (activeCell) edit(activeCell.code, activeCell.field, value); }} style={{ flex: 1, color: text, padding: 10 }} />
            </View>}
            <ProjectRABSheet summary={rabTab === 'rekap_samil'} rows={rabTab === 'rekap_samil' ? rabView.rows.filter(row => !row.isSection) : rabView.rows} wbs={displayedWbs} meta={displayedProject.meta || {}} drafts={drafts} isDark={isDark} editable={!rabLocked && !saving && rabTab !== 'rekap_samil' && rabTab !== 'detail_level2' && rabStage === 'DETAIL'} onEdit={edit} onCellFocus={setActiveCell} formulaVisible={showFormula} onToggleFormula={() => setShowFormula(value => !value)} toolbarLeading={rabTab !== 'rekap_samil' ? <ContextMenu title="Discipline" dropdownMenuMode actions={[{ title: 'All disciplines', selected: discipline === 'all' }, ...rabView.tabs.map(tab => ({ title: tab.label, selected: tab.id === discipline }))]} onPress={event => { const value = event.nativeEvent.index ? rabView.tabs[event.nativeEvent.index - 1].id : 'all'; setDiscipline(value); setRabTab(value); setActiveCell(null); }}><View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', height: 34, paddingHorizontal: 13, borderRadius: 999, backgroundColor: isDark ? '#1C1D23' : '#F2F2F7' }}><Text style={{ color: secondary, fontSize: 12 }}>{rabView.tabs.find(tab => tab.id === discipline)?.label || 'All disciplines'}</Text><Ionicons name="chevron-down" size={11} color={secondary} /></View></ContextMenu> : undefined} />
            <View style={{ marginTop: 16, padding: 16, borderRadius: 14, backgroundColor: isDark ? '#16171C' : '#F2F2F7', gap: 10 }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 20 }}><Text style={{ color: secondary, fontSize: 12 }}>Subtotal {money(detailTotal)}</Text><View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Switch value={includePPN} onValueChange={setIncludePPN} /><Text style={{ color: secondary, fontSize: 12 }}>VAT 11%</Text></View><View style={{ flex: 1 }} /><Text style={{ color: text, fontSize: 16, fontWeight: '700' }}>Total {money(detailTotal * (includePPN ? 1.11 : 1))}</Text></View>
                {!!displayedProject.meta?.quickEstimate && <Text style={{ color: secondary, fontSize: 12 }}>Quick Estimate {money(displayedProject.meta.quickEstimate.total)} · Detail before VAT {money(detailTotal)} · Difference {money(detailTotal - displayedProject.meta.quickEstimate.total)}</Text>}
                <Text style={{ color: secondary, fontSize: 11 }}>EN · {currencyWords(detailTotal * (includePPN ? 1.11 : 1)).en}</Text><Text style={{ color: secondary, fontSize: 11 }}>ID · {currencyWords(detailTotal * (includePPN ? 1.11 : 1)).id}</Text>
                {(dirty || !!saveMessage) && <Text style={{ color: secondary, fontSize: 11 }}>{dirty ? 'Unsaved' : saveMessage}</Text>}
            </View>
            </>}
        </>}
        {!selected && !['stages', 'wbs', 'volume'].includes(section) && <>
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
