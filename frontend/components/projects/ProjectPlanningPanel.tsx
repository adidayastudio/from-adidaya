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
export function ProjectPlanningPanel({ project, section, isDark, onDirtyChange, onToolbarChange }: { project: Project; section: PlanningSection; isDark: boolean; onDirtyChange?: (dirty: boolean) => void; onToolbarChange?: (toolbar: React.ReactNode) => void }) {
    const [legacyProject, setLegacyProject] = useState<any>(project);
    const [legacyWbs, setLegacyWbs] = useState<any[]>([]);
    const [rabStage, setRabStage] = useState('DETAIL');
    const [rabTab, setRabTab] = useState('all');
    const [includePPN, setIncludePPN] = useState(true);
    const [drafts, setDrafts] = useState<RABDrafts>({});
    const [saving, setSaving] = useState(false), [saveError, setSaveError] = useState(''), [saveMessage, setSaveMessage] = useState('');
    const [activeCell, setActiveCell] = useState<{ code: string; field: string; address: string } | null>(null);
    const dirty = Object.keys(drafts).length > 0;
    useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);
    useEffect(() => {
        if (Platform.OS !== 'web' || !dirty) return;
        const guard = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
        window.addEventListener('beforeunload', guard);
        return () => window.removeEventListener('beforeunload', guard);
    }, [dirty]);
    const baseRows = useMemo(() => legacyRABView(legacyProjectInfo(legacyProject, legacyWbs, 'DETAIL'), 'all').rows, [legacyProject, legacyWbs]);
    const rabView = useMemo(() => {
        const meta = mergeRABDrafts(legacyProject.meta || {}, drafts, baseRows);
        return legacyRABView(legacyProjectInfo({ ...legacyProject, meta }, legacyWbs, rabStage), rabTab);
    }, [legacyProject, legacyWbs, rabStage, rabTab, drafts, baseRows]);
    const edit = (code: string, field: string, value: string) => {
        setDrafts(current => ({ ...current, [code]: { ...current[code], [field]: value } }));
        setSaveError(''); setSaveMessage('');
    };
    const save = async () => {
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
            if (active) { setLegacyProject({ ...project, meta: current?.meta || {} }); setLegacyWbs(wbs); }
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
        {section === 'wbs' && !loading && !error && <ProjectWBSEditor onToolbarChange={onToolbarChange} key={project.id} project={legacyProject} items={rows} isDark={isDark} onDirtyChange={onDirtyChange} />}
        {!selected && section === 'rab' && !loading && !error && <>
            <SegmentedControl segments={['BALLPARK', 'ESTIMATES', 'DETAIL'].map(id => ({ id, label: id }))} activeSegment={rabStage} onSegmentChange={setRabStage} />
            <View style={{ marginVertical: 12 }}><SegmentedControl segments={[
                { id: 'all', label: 'All Work' }, { id: 'rekap_samil', label: 'Summary' }, { id: 'detail_level2', label: 'Level 2 Detail' },
                ...rabView.tabs.map(tab => ({ id: tab.id, label: tab.label })),
            ]} activeSegment={rabTab} onSegmentChange={setRabTab} /></View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}><Switch value={includePPN} onValueChange={setIncludePPN} /><Text style={{ color: text }}>VAT 11%</Text></View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <Text style={{ color: secondary, flex: 1 }}>{dirty ? 'Unsaved changes' : saveMessage || 'Click a cell to edit'}</Text>
                <TouchableOpacity disabled={!dirty || saving} onPress={save} style={{ backgroundColor: '#159957', opacity: !dirty || saving ? 0.5 : 1, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 999 }}><Text style={{ color: '#FFFFFF', fontWeight: '700' }}>{saving ? 'Saving…' : 'Save'}</Text></TouchableOpacity>
            </View>
            {!!saveError && <Text accessibilityRole="alert" style={{ color: '#FF3B30', marginBottom: 12 }}>{saveError}</Text>}
            <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: border, marginBottom: 8 }}>
                <Text style={{ color: '#159957', width: 80, textAlign: 'center', fontWeight: '700' }}>{activeCell?.address || '—'}</Text><Text style={{ color: secondary, padding: 10 }}>fx</Text>
                <TextInput accessibilityLabel="Formula bar" editable={!!activeCell && !saving} value={activeCell ? drafts[activeCell.code]?.[activeCell.field] ?? String(rabView.rows.find(row => row.code === activeCell.code)?.[activeCell.field as 'title'] ?? '') : ''} onChangeText={value => { if (activeCell) edit(activeCell.code, activeCell.field, value); }} style={{ flex: 1, color: text, padding: 10 }} />
            </View>
            {table(rabView.rows, columns, undefined, !selected && rabTab !== 'rekap_samil' && rabTab !== 'detail_level2' && rabStage === 'DETAIL')}
            {table([
                { id: 'subtotal', label: 'SUBTOTAL', amount: rabView.subtotal },
                ...(includePPN ? [{ id: 'ppn', label: 'VAT 11%', amount: rabView.subtotal * 0.11 }] : []),
                { id: 'total', label: 'GRAND TOTAL', amount: rabView.subtotal * (includePPN ? 1.11 : 1) },
            ], [{ title: 'Summary', width: 400, value: row => row.label }, { title: 'Total Amount (Rp)', width: 250, right: true, value: row => money(row.amount) }])}
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
