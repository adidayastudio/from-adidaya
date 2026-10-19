import { wbsPlanningImpact } from '@/lib/projectPlanningRevisions';
import React, { useEffect, useState } from 'react';
import { Alert, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ProjectWorkTree } from './ProjectWorkTree';
import { InstantTooltip } from '@/components/ui/InstantTooltip';
import { Ionicons } from '@expo/vector-icons';
import ContextMenu from '@/components/ui/PlatformContextMenu';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { DynamicIslandToastHUD } from '@/components/ui/DynamicIslandToastHUD';
import { ProjectSaveFeedback, useProjectSaveFeedback } from './setup/ProjectSaveFeedback';
import { volumeId } from '@/lib/projectVolume';
import { missingLegacyWBS } from '@/lib/projectWBSHierarchy';
import { newWBSWork, splitWBSNames } from '@/lib/projectWBSNames';
import { actOnWBS, reorderWBS, addWBSDiscipline } from '@/lib/projectWBSActions';
import { readWBSWorkflow } from '@/lib/projectWBSWorkflow';
import { persistWBSWorkflow } from '@/lib/api/projectWBSWorkflow';

type Props = { project: any; items: any[]; isDark: boolean; onDirtyChange?: (dirty: boolean) => void; onToolbarChange?: (toolbar: React.ReactNode) => void; onNavigatePlanning?: (section: string) => void };
const clone = (items: any[]) => items.map(row => ({ ...row, ...splitWBSNames(row) }));
// Keep the public component a function across Fast Refresh updates.
export function ProjectWBSEditor(props: Props) { return <WBSWorkflowEditor {...props} />; }
const WBSWorkflowEditor = React.memo(function WBSWorkflowEditor({ project, items, isDark, onDirtyChange, onToolbarChange, onNavigatePlanning }: Props) {
    const [publishedNotice, setPublishedNotice] = useState<string | null>(null);
    const [workflow, setWorkflow] = useState(() => readWBSWorkflow(project.meta));
    const [baseline, setBaseline] = useState(project.meta?.wbsWorkflow ?? null);
    const latest = workflow.versions[workflow.versions.length - 1];
    const [selected, setSelected] = useState<number>(() => workflow.draft ? 0 : latest?.version || 0);
    const [rows, setRows] = useState<any[]>(() => clone(workflow.draft?.items || latest?.items || [...items, ...missingLegacyWBS(items, project.meta, volumeId)]));
    const [past, setPast] = useState<any[][]>([]), [future, setFuture] = useState<any[][]>([]);
    const [disciplineForm, setDisciplineForm] = useState(false), [disciplineCode, setDisciplineCode] = useState(''), [disciplineName, setDisciplineName] = useState(''), [disciplineNameId, setDisciplineNameId] = useState('');
    const [dirty, setDirty] = useState(false), [saving, setSaving] = useState(false), [toast, setToast] = useState('');
    const [revisionActive, setRevisionActive] = useState(!!workflow.draft);
    const feedback = useProjectSaveFeedback(dirty, onDirtyChange);
    const locked = selected > 0;
    const color = isDark ? '#FFFFFF' : '#1C1C1E';
    const pill = { height: 46, borderRadius: 999, paddingHorizontal: 16, justifyContent: 'center' as const, backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' };
    useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 3000); return () => clearTimeout(timer); }, [toast]);
    const changeRows = (next: any[]) => { if (locked || saving) return; setPast(history => [...history.slice(-49), rows]); setFuture([]); setRows(next); setDirty(true); feedback.clear(); };
    const clearHistory = () => { setPast([]); setFuture([]); };
    const edit = (id: string, field: 'title' | 'title_en', value: string) => {
        if (locked || saving) return;
        changeRows(rows.map(row => row.id === id ? { ...row, [field]: value } : row));
    };
    const persist = async (submit: boolean) => {
        if (locked || saving) return; setSaving(true);
        try {
            const reviewCount = latest ? wbsPlanningImpact(latest.items, rows).length : 0;
            const next = await persistWBSWorkflow(project.id, baseline, rows, submit);
            clearHistory(); setWorkflow(next); setBaseline(next); setDirty(false); setRevisionActive(!submit); feedback.clear();
            if (submit) { if (latest) setPublishedNotice(reviewCount ? `${reviewCount} changed items need Volume and RAB review.` : 'WBS structure updated. Existing calculations and prices retained.'); const published = next.versions[next.versions.length - 1]; setSelected(published.version); setRows(clone(published.items)); setToast(`WBS v.${published.version} submitted.`); }
            else setToast(workflow.draft ? 'Draft changes saved.' : 'WBS saved as draft.');
        } catch (error: any) { feedback.notify('Error', error.message || 'Unable to save WBS.'); }
        finally { setSaving(false); }
    };
    const addRevision = () => {
        if (!latest || saving) return;
        clearHistory(); setRows(clone(workflow.draft?.items || latest.items)); setSelected(0); setRevisionActive(true); setDirty(!workflow.draft); feedback.clear();
    };
    const exportVersion = async () => {
        try {
            const cell = (value: any) => { const text = String(value ?? ''); return '"' + (/^[=+@\-\t\r]/.test(text) ? "'" : '') + text.replace(/"/g, '""') + '"'; };
            const csv = '\uFEFF' + [['Code', 'Work (EN)', 'Work (ID)'], ...rows.map(row => [row.wbs_code, row.title, row.title_en])].map(row => row.map(cell).join(',')).join('\r\n');
            const filename = `WBS-v${selected}.csv`;
            if (Platform.OS === 'web') { const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url); }
            else { const fs = await import('expo-file-system/legacy'), sharing = await import('expo-sharing'); if (!await sharing.isAvailableAsync()) throw new Error('File sharing is unavailable.'); const uri = `${fs.cacheDirectory}${filename}`; await fs.writeAsStringAsync(uri, csv); await sharing.shareAsync(uri, { mimeType: 'text/csv' }); }
        } catch (error: any) { feedback.notify('Error', error.message); }
    };
    const versionChoices = [...(workflow.draft || revisionActive || !latest ? [{ title: workflow.draft || revisionActive ? 'Draft' : 'Template', version: 0 }] : []), ...[...workflow.versions].reverse().map(version => ({ title: `WBS v.${version.version}`, version: version.version }))];
    return <View style={{ gap: 12, paddingBottom: 30 }}>
        {!!publishedNotice && <View style={{ padding: 12, borderRadius: 12, backgroundColor: isDark ? '#102749' : '#E8F0FF', flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}><Text style={{ color, fontSize: 12, flex: 1 }}>{publishedNotice}</Text><TouchableOpacity onPress={() => onNavigatePlanning?.('volume')}><Text style={{ color: '#007AFF', fontSize: 12 }}>Open Volume</Text></TouchableOpacity><TouchableOpacity onPress={() => onNavigatePlanning?.('rab')}><Text style={{ color: '#007AFF', fontSize: 12 }}>Open RAB</Text></TouchableOpacity></View>}
        {feedback.failed && <ProjectSaveFeedback {...feedback} />}

        <ProjectWorkTree toolbarLeading={<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ContextMenu title="WBS versions" dropdownMenuMode disabled={saving} actions={versionChoices.map(item => ({ title: item.title, selected: selected === item.version }))} onPress={event => {
                if (dirty) { feedback.notify('Error', 'Save the draft before switching versions.'); return; }
                clearHistory(); const version = versionChoices[event.nativeEvent.index].version; setSelected(version);
                setRows(clone(version ? workflow.versions.find(item => item.version === version)!.items : workflow.draft?.items || items)); feedback.clear();
            }}><View style={{ ...pill, flexDirection: 'row', alignItems: 'center', gap: 8 }}><Text style={{ color, fontSize: 13, fontWeight: '600' }}>{selected ? `WBS v.${selected}` : workflow.draft || revisionActive ? 'WBS Draft' : 'WBS Template'}</Text><PlatformIcon name="chevron.down" size={12} tintColor={color} /></View></ContextMenu>

        </View>} toolbarTools={<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>{!locked && <View style={{ ...pill, flexDirection: 'row', paddingHorizontal: 4, alignItems: 'center' }}>{(['undo', 'redo'] as const).map(action => { const available = action === 'undo' ? past.length : future.length; return <React.Fragment key={action}>{action === 'redo' && <View style={{ width: 1, height: 18, backgroundColor: isDark ? '#48484A' : '#D1D1D6', marginHorizontal: 2 }} />}<InstantTooltip label={action === 'undo' ? 'Undo' : 'Redo'}><TouchableOpacity accessibilityLabel={action === 'undo' ? 'Undo' : 'Redo'} disabled={saving || !available} onPress={() => {
                if (action === 'undo') { setFuture(current => [rows, ...current]); setRows(past[past.length - 1]); setPast(current => current.slice(0, -1)); }
                else { setPast(current => [...current, rows]); setRows(future[0]); setFuture(current => current.slice(1)); }
                setDirty(true); feedback.clear();
            }} style={{ width: 36, height: 38, alignItems: 'center', justifyContent: 'center', opacity: available ? 1 : 0.3 }}><Ionicons name={action === 'undo' ? 'arrow-undo-outline' : 'arrow-redo-outline'} size={17} color={color} /></TouchableOpacity></InstantTooltip></React.Fragment>; })}</View>}
            {locked && <InstantTooltip label="Export WBS version"><TouchableOpacity accessibilityLabel="Export WBS version" onPress={exportVersion} style={{ ...pill, width: 46, paddingHorizontal: 0, alignItems: 'center' }}><PlatformIcon name="square.and.arrow.up" size={17} tintColor={color} /></TouchableOpacity></InstantTooltip>}</View>} onToolbarChange={onToolbarChange} items={rows} isDark={isDark} onEditName={edit} onAddWork={locked ? undefined : (node, child) => { if (saving) return; try { changeRows([...rows, newWBSWork(rows, node, child, volumeId())]); } catch (error: any) { feedback.notify('Error', error.message); } }} onReorder={locked ? undefined : (source, target) => { if (saving) return; try { changeRows(reorderWBS(rows, source, target)); } catch (error: any) { feedback.notify('Error', error.message); } }} onWorkAction={locked ? undefined : (id, action) => { if (saving) return; const perform = () => { try { changeRows(actOnWBS(rows, id, action, volumeId)); } catch (error: any) { feedback.notify('Error', error.message); } }; if (action === 'delete') { if (Platform.OS === 'web') { if (window.confirm('Delete this work and all its subtasks from the draft?')) perform(); } else Alert.alert('Delete work?', 'This also removes its subtasks from the draft.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: perform }]); } else perform(); }} editingDisabled={locked || saving} showVolume={false} toolbarAction={locked ?
            <InstantTooltip label="Add Revision"><TouchableOpacity accessibilityLabel="Add Revision" disabled={saving} onPress={addRevision} style={{ ...pill, width: 46, paddingHorizontal: 0, alignItems: 'center', backgroundColor: '#007AFF' }}><Ionicons name="add-outline" size={19} color="#FFFFFF" /></TouchableOpacity></InstantTooltip> :
            <ContextMenu title="Save WBS" dropdownMenuMode disabled={saving || !rows.length} style={{ height: 46 }} actions={[{ title: workflow.draft || revisionActive ? 'Save Changes' : 'Save as Draft' }, { title: 'Submit WBS' }]} onPress={event => persist(event.nativeEvent.index === 1)}><View style={{ ...pill, backgroundColor: '#007AFF', flexDirection: 'row', alignItems: 'center', gap: 8 }}><Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600' }}>{saving ? 'Saving…' : 'Save'}</Text><PlatformIcon name="chevron.down" size={12} tintColor="#FFFFFF" /></View></ContextMenu>
        } />
        {!locked && <View style={{ gap: 10, alignItems: 'flex-start' }}>
            <TouchableOpacity disabled={saving} onPress={() => setDisciplineForm(value => !value)} style={pill}><Text style={{ color: '#007AFF', fontSize: 13, fontWeight: '600' }}>＋ Add Discipline</Text></TouchableOpacity>
            {disciplineForm && <View style={{ backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderRadius: 18, padding: 14, gap: 10, width: '100%' }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>{[{ label: 'Code', value: disciplineCode, change: setDisciplineCode, width: 100 }, { label: 'Discipline (EN)', value: disciplineName, change: setDisciplineName, width: 220 }, { label: 'Discipline (ID)', value: disciplineNameId, change: setDisciplineNameId, width: 220 }].map(field => <TextInput key={field.label} accessibilityLabel={field.label} placeholder={field.label} placeholderTextColor="#8E8E93" value={field.value} onChangeText={field.change} editable={!saving} style={{ color, borderColor: isDark ? '#38383A' : '#E5E5EA', borderWidth: 1, borderRadius: 999, padding: 10, width: field.width, fontSize: 13 }} />)}</View>
                <View style={{ flexDirection: 'row', gap: 8 }}><TouchableOpacity disabled={saving} onPress={() => { try { changeRows(addWBSDiscipline(rows, disciplineCode, disciplineName, disciplineNameId, volumeId())); setDisciplineForm(false); setDisciplineCode(''); setDisciplineName(''); setDisciplineNameId(''); } catch (error: any) { feedback.notify('Error', error.message); } }} style={{ ...pill, backgroundColor: '#007AFF' }}><Text style={{ color: '#FFFFFF', fontSize: 13 }}>Add Discipline</Text></TouchableOpacity><TouchableOpacity onPress={() => setDisciplineForm(false)} style={pill}><Text style={{ color, fontSize: 13 }}>Cancel</Text></TouchableOpacity></View>
            </View>}
        </View>}
        {!!toast && <View pointerEvents="none" accessibilityRole="alert" style={{ position: Platform.OS === 'web' ? 'fixed' as any : 'absolute', top: 80, right: 24, width: 360, maxWidth: '90%', zIndex: 1000 }}><DynamicIslandToastHUD title="WBS" message={toast} isDark={isDark} /></View>}
    </View>;
});
