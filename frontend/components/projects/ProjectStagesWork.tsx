import React, { useMemo, useState } from 'react';
import { Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import ContextMenu from '@/components/ui/PlatformContextMenu';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { LiquidCard } from '@/components/ui/LiquidCard';
import { ProjectSaveFeedback, useProjectSaveFeedback } from './setup/ProjectSaveFeedback';
import { buildStageWorkLayout, LEGACY_STAGE_KEYS, normalizeStage, removeStageTask, renumberStageTasks, stageWorkCSV, StageWorkLayout, stageWorkRows, stageWorkHTML } from '@/lib/legacy-stages/layout';
import { Task } from '@/lib/legacy-stages/types';
import { saveStageWorkLayout } from '@/lib/api/projectStageWork';
import { handleWeightEdit, redistributeAfterDelete, redistributeTaskWeights } from '@/lib/legacy-stages/logic/weightHelpers';

const priorities = ['low', 'medium', 'high', 'urgent'] as const;
export function ProjectStagesWork({ project, records, isDark, onDirtyChange }: { project: any; records: any[]; isDark: boolean; onDirtyChange?: (dirty: boolean) => void }) {
    const [meta, setMeta] = useState(project.meta || {});
    const stages = useMemo(() => [...new Set([...LEGACY_STAGE_KEYS, ...records.map(row => normalizeStage(row.stage_code)).filter(Boolean), ...Object.keys(meta.stageWorkLayouts || {})])], [records, meta]);
    const [stage, setStage] = useState('KO');
    const initial = (key: string, currentMeta = meta) => buildStageWorkLayout(key, records, currentMeta.stageWorkLayouts?.[key]);
    const [layout, setLayout] = useState<StageWorkLayout>(() => initial('KO'));
    const [baseline, setBaseline] = useState<StageWorkLayout | null>(meta.stageWorkLayouts?.KO || null);
    const [dirty, setDirty] = useState(false), [saving, setSaving] = useState(false), [search, setSearch] = useState('');
    const [open, setOpen] = useState<string[]>([layout.sections[0]?.code].filter(Boolean));
    const feedback = useProjectSaveFeedback(dirty, onDirtyChange);
    const text = isDark ? '#FFFFFF' : '#1C1C1E', secondary = isDark ? '#AEAEB2' : '#636366', border = isDark ? '#303034' : '#E5E5EA', card = isDark ? '#1C1C1E' : '#FFFFFF';
    const [contentWidth, setContentWidth] = useState(640);
    const tableWidth = Math.max(640, contentWidth - 24);
    const nameWidth = (tableWidth - 272) / 2;
    const labelStyle = { color: text, fontSize: 12, fontWeight: '500' as const };
    const pill = { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: card, minHeight: 32, justifyContent: 'center' as const };
    const input = { color: text, fontFamily: 'System', fontSize: 12, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, minHeight: 32 };
    const change = (next: StageWorkLayout) => { if (saving) return; setLayout(next); setDirty(true); feedback.clear(); };
    const updateTask = (id: string, patch: Partial<Task>) => change({ ...layout, tasks: layout.tasks.map(task => task.id === id ? { ...task, ...patch } : task) });
    const sectionTasks = (code: string, next: Task[]) => change({ ...layout, tasks: [...layout.tasks.filter(task => task.sectionCode !== code), ...renumberStageTasks(next, code)] });
    const add = (sectionCode: string, relative?: Task, mode = 'below') => {
        const tasks = layout.tasks.filter(task => task.sectionCode === sectionCode);
        const task: Task = { id: `work-${Date.now()}-${Math.random().toString(36).slice(2)}`, code: '', name: 'New Task', nameId: '', weight: 0, priority: 'medium', stage, sectionCode, parentId: mode === 'subtask' ? relative?.id : relative?.parentId };
        const index = relative ? tasks.findIndex(item => item.id === relative.id) + (mode === 'above' ? 0 : 1) : tasks.length;
        tasks.splice(index, 0, task);
        sectionTasks(sectionCode, redistributeTaskWeights(tasks, layout.sections.find(item => item.code === sectionCode)?.weight || 0));
    };
    const act = (task: Task, index: number) => {
        if (index < 3) { add(task.sectionCode, task, ['above', 'below', 'subtask'][index]); return; }
        let tasks = layout.tasks.filter(item => item.sectionCode === task.sectionCode);
        if (index === 5) tasks = redistributeAfterDelete(removeStageTask(tasks, task.id), layout.sections.find(item => item.code === task.sectionCode)?.weight || 0, task.weight || 0);
        else {
            const siblings = tasks.filter(item => item.parentId === task.parentId), position = siblings.findIndex(item => item.id === task.id), neighbor = siblings[position + (index === 3 ? -1 : 1)];
            if (!neighbor) return;
            const a = tasks.indexOf(task), b = tasks.indexOf(neighbor); [tasks[a], tasks[b]] = [tasks[b], tasks[a]];
        }
        sectionTasks(task.sectionCode, tasks);
    };
    const save = async (revision = false) => {
        if (saving) return; setSaving(true);
        try { const next = await saveStageWorkLayout(project.id, stage, layout, baseline, revision); setMeta(next); setBaseline(next.stageWorkLayouts[stage]); setDirty(false); feedback.notify('Success', revision ? 'Revision saved.' : 'Changes saved.'); }
        catch (error: any) { feedback.notify('Error', error.message || 'Unable to save changes.'); }
        finally { setSaving(false); }
    };
    const exportWork = async (format: 'csv' | 'xls' | 'pdf') => {
        try {
            const filename = `${project.code || project.id}-${stage}-work.${format}`;
            if (format === 'pdf') {
                const print = await import('expo-print');
                const html = stageWorkHTML(layout, project.name || project.code || 'Project');
                if (Platform.OS === 'web') await print.printAsync({ html });
                else { const file = await print.printToFileAsync({ html }); const sharing = await import('expo-sharing'); if (!await sharing.isAvailableAsync()) throw new Error('File sharing is unavailable on this device.'); await sharing.shareAsync(file.uri, { mimeType: 'application/pdf' }); }
                return;
            }
            let content = stageWorkCSV(layout), mime = 'text/csv;charset=utf-8';
            if (format === 'xls') {
                const xlsx = await import('xlsx');
                const workbook = xlsx.utils.book_new();
                xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet(stageWorkRows(layout)), stage);
                if (Platform.OS === 'web') { xlsx.writeFile(workbook, filename, { bookType: 'biff8' }); return; }
                content = xlsx.write(workbook, { type: 'base64', bookType: 'biff8' }); mime = 'application/vnd.ms-excel';
            }
            if (Platform.OS === 'web') { const url = URL.createObjectURL(new Blob([content], { type: mime })); const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url); }
            else { const fs = await import('expo-file-system/legacy'); const sharing = await import('expo-sharing'); if (!await sharing.isAvailableAsync()) throw new Error('File sharing is unavailable on this device.'); const path = `${fs.cacheDirectory}${filename}`; await fs.writeAsStringAsync(path, content, { encoding: format === 'xls' ? fs.EncodingType.Base64 : fs.EncodingType.UTF8 }); await sharing.shareAsync(path, { mimeType: mime.split(';')[0] }); }
        } catch (error: any) { feedback.notify('Error', error.message || 'Export failed.'); }
    };
    const query = search.trim().toLowerCase();
    const revisions = meta.stageWorkRevisions?.[stage] || [];
    return <View onLayout={event => setContentWidth(event.nativeEvent.layout.width)} style={{ gap: 10, paddingBottom: 64 }}>
        <SegmentedControl segments={stages.map(id => ({ id, label: id }))} activeSegment={stage} onSegmentChange={key => { if (saving || key === stage) return; if (dirty) { feedback.notify('Error', 'Save changes before switching stages.'); return; } const next = initial(key); setStage(key); setLayout(next); setBaseline(meta.stageWorkLayouts?.[key] || null); setOpen([next.sections[0]?.code].filter(Boolean)); feedback.clear(); }} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            <TextInput accessibilityLabel="Search work" placeholder="Search work" placeholderTextColor={secondary} value={search} onChangeText={setSearch} style={{ ...input, backgroundColor: card, borderRadius: 999, paddingHorizontal: 12, flexGrow: 1, flexBasis: 150, minWidth: 130 }} />
            <TouchableOpacity style={pill} onPress={() => setOpen(layout.sections.map(item => item.code))}><Text style={labelStyle}>Expand All</Text></TouchableOpacity>
            <TouchableOpacity style={pill} onPress={() => setOpen([])}><Text style={labelStyle}>Collapse All</Text></TouchableOpacity>
            <ContextMenu title="Export" dropdownMenuMode style={{ width: 32, height: 32 }} actions={['CSV', 'XLS', 'PDF'].map(title => ({ title }))} onPress={event => exportWork((['csv', 'xls', 'pdf'] as const)[event.nativeEvent.index])}><View accessibilityLabel="Export" style={{ ...pill, width: 32, height: 32, paddingHorizontal: 0, alignItems: 'center' }}><PlatformIcon name="square.and.arrow.up" size={17} tintColor={text} /></View></ContextMenu>
            <TouchableOpacity disabled={saving} style={pill} onPress={() => save(true)}><Text style={{ ...labelStyle, color: '#007AFF' }}>＋ Add Revision</Text></TouchableOpacity>
            {!!revisions.length && <ContextMenu dropdownMenuMode actions={revisions.map((item: any) => ({ title: `Revision ${item.version} · ${new Date(item.createdAt).toLocaleDateString()}` }))} onPress={event => { if (!saving) change(JSON.parse(JSON.stringify(revisions[event.nativeEvent.index].layout))); }}><View style={pill}><Text style={labelStyle}>Revisions ⌄</Text></View></ContextMenu>}
        </View>
        <ProjectSaveFeedback {...feedback} />
        {layout.sections.map(section => {
            const tasks = layout.tasks.filter(task => task.sectionCode === section.code);
            const match = (task: Task) => `${task.code} ${task.name} ${task.nameId || ''}`.toLowerCase().includes(query);
            const sectionMatch = `${section.code} ${section.title}`.toLowerCase().includes(query);
            const visible = query && !sectionMatch ? tasks.filter(match) : tasks;
            if (query && !sectionMatch && !visible.length) return null;
            const expanded = !!query || open.includes(section.code);
            return <View key={section.code} style={{ backgroundColor: card, borderRadius: 18, overflow: 'hidden' }}>
                <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setOpen(current => current.includes(section.code) ? current.filter(code => code !== section.code) : [...current, section.code])} style={{ flexDirection: 'row', gap: 10, alignItems: 'center', padding: 12 }}>
                    <Text style={{ color: '#007AFF', backgroundColor: isDark ? '#122745' : '#E5EFFF', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5, fontSize: 11, fontWeight: '700' }}>{section.code.split('-').pop()}</Text>
                    <Text style={{ color: text, flex: 1, fontWeight: '700', fontSize: 14 }}>{section.title}</Text>
                    <Text style={{ color: secondary, fontSize: 12 }}>{section.weight.toFixed(2)}</Text><PlatformIcon name={expanded ? 'chevron.up' : 'chevron.down'} size={14} tintColor={secondary} />
                </TouchableOpacity>
                {expanded && <>
                    <ScrollView horizontal><View style={{ width: tableWidth, marginHorizontal: 12 }}>
                        <View style={{ flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderColor: border }}>{[['Code', 66], ['Work (EN)', nameWidth], ['Work (ID)', nameWidth], ['Weight', 60], ['Priority', 104], ['', 42]].map(([label, width]) => <Text key={label} style={{ width: Number(width), color: secondary, fontSize: 11, fontWeight: '600' }}>{label}</Text>)}</View>
                        {visible.map(task => <View key={task.id} style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: border, paddingVertical: 3 }}>
                            <Text style={{ width: 66, fontSize: 11, color: secondary, paddingLeft: task.parentId ? 12 : 0 }}>{task.code}</Text>
                            <TextInput editable={!saving} accessibilityLabel={`${task.code} English name`} value={task.name} onChangeText={name => updateTask(task.id, { name })} style={{ ...input, width: nameWidth, fontWeight: '600' }} />
                            <TextInput editable={!saving} accessibilityLabel={`${task.code} Indonesian name`} placeholder="Indonesian name" placeholderTextColor={secondary} value={task.nameId || ''} onChangeText={nameId => updateTask(task.id, { nameId })} style={{ ...input, width: nameWidth, fontStyle: 'italic', color: secondary }} />
                            <TextInput editable={!saving} accessibilityLabel={`${task.code} weight`} keyboardType="numeric" value={String(task.weight ?? 0)} onChangeText={value => { if (/^\d*$/.test(value)) sectionTasks(section.code, handleWeightEdit(tasks, task.id, Number(value), section.weight)); }} style={{ ...input, width: 60, textAlign: 'right' }} />
                            <ContextMenu title="Priority" style={{ width: 104, height: 32 }} disabled={saving} dropdownMenuMode actions={priorities.map(title => ({ title, selected: title === task.priority }))} onPress={event => updateTask(task.id, { priority: priorities[event.nativeEvent.index] })}><View style={{ width: 96, marginHorizontal: 4, minHeight: 32, paddingHorizontal: 10, borderRadius: 999, backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}><Text style={{ fontSize: 11, fontWeight: '600', textTransform: 'capitalize', color: task.priority === 'urgent' ? '#FF3B30' : task.priority === 'high' ? '#FF9500' : text }}>{task.priority || 'medium'}</Text><PlatformIcon name="chevron.down" size={12} tintColor={secondary} /></View></ContextMenu>
                            <ContextMenu title="Work actions" style={{ width: 42, height: 32 }} disabled={saving} dropdownMenuMode actions={['Add Above', 'Add Below', 'Add Subtask', 'Move Up', 'Move Down', 'Delete Work & Subtasks'].map((title, index) => ({ title, destructive: index === 5 }))} onPress={event => act(task, event.nativeEvent.index)}><View accessibilityLabel="Work actions" style={{ width: 32, height: 32, marginHorizontal: 5, borderRadius: 16, backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7', alignItems: 'center', justifyContent: 'center' }}><PlatformIcon name="ellipsis" size={18} tintColor={text} /></View></ContextMenu>
                        </View>)}
                    </View></ScrollView>
                    <TouchableOpacity disabled={saving} onPress={() => add(section.code)} style={{ padding: 12 }}><Text style={{ ...labelStyle, color: '#007AFF' }}>＋ Add Work</Text></TouchableOpacity>
                </>}
            </View>;
        })}
        {dirty && <LiquidCard variant="clear" style={{ position: Platform.OS === 'web' ? 'sticky' as any : 'relative', bottom: 16, alignSelf: 'flex-end' }} contentStyle={{ padding: 6 }}><TouchableOpacity disabled={saving} onPress={() => save()} style={{ backgroundColor: '#007AFF', borderRadius: 999, paddingHorizontal: 28, paddingVertical: 14 }}><Text style={{ color: '#FFFFFF', fontWeight: '700' }}>{saving ? 'Saving…' : 'Save'}</Text></TouchableOpacity></LiquidCard>}
    </View>;
}
