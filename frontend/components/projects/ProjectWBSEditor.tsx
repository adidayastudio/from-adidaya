import { wbsPlanningImpact } from '@/lib/projectPlanningRevisions';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ProjectWorkTree, branchKeys, keys } from './ProjectWorkTree';
import { buildWBSTree } from '@/lib/legacy-rab/wbs-mapper';
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

type Props = {
    project: any;
    items: any[];
    isDark: boolean;
    onDirtyChange?: (dirty: boolean) => void;
    onToolbarChange?: (toolbar: React.ReactNode) => void;
    onNavigatePlanning?: (section: string) => void;
    onTitleAccessoryChange?: (accessory: React.ReactNode) => void;
    onHeaderTrailingChange?: (trailing: React.ReactNode) => void;
};

const clone = (items: any[]) => items.map(row => ({ ...row, ...splitWBSNames(row) }));

const WBSSearchInput = React.memo(function WBSSearchInput({
    onSearchChange,
    isDark,
    card,
    secondary,
    text,
}: {
    onSearchChange: (query: string) => void;
    isDark: boolean;
    card: string;
    secondary: string;
    text: string;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [value, setValue] = useState('');

    const handleChange = (query: string) => {
        setValue(query);
        onSearchChange(query);
    };

    const handleClearOrClose = () => {
        if (value) {
            setValue('');
            onSearchChange('');
        } else {
            setIsOpen(false);
        }
    };

    if (!isOpen && !value) {
        return (
            <TouchableOpacity
                accessibilityLabel="Search WBS"
                onPress={() => setIsOpen(true)}
                style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: card, alignItems: 'center', justifyContent: 'center' }}
            >
                <Ionicons name="search-outline" size={16} color={secondary} />
            </TouchableOpacity>
        );
    }

    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: card, borderRadius: 999, height: 34, paddingLeft: 12, paddingRight: 8, gap: 8, width: 220 }}>
            <Ionicons name="search-outline" size={15} color={secondary} />
            <TextInput
                autoFocus
                accessibilityLabel="Search WBS"
                placeholder="Search WBS"
                placeholderTextColor={secondary}
                value={value}
                onChangeText={handleChange}
                style={{
                    flex: 1,
                    color: text,
                    fontSize: 12,
                    padding: 0,
                    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
                }}
            />
            <TouchableOpacity
                accessibilityLabel="Clear and cancel search"
                onPress={handleClearOrClose}
                style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <Ionicons name="close" size={12} color={secondary} />
            </TouchableOpacity>
        </View>
    );
});

export function ProjectWBSEditor(props: Props) { return <WBSWorkflowEditor {...props} />; }

const WBSWorkflowEditor = React.memo(function WBSWorkflowEditor({
    project,
    items,
    isDark,
    onDirtyChange,
    onNavigatePlanning,
    onTitleAccessoryChange,
    onHeaderTrailingChange,
}: Props) {
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
    const [search, setSearch] = useState('');
    const [expanded, setExpanded] = useState<string[]>([]);

    const feedback = useProjectSaveFeedback(dirty, onDirtyChange);
    const locked = selected > 0;
    const color = isDark ? '#FFFFFF' : '#1C1C1E';
    const card = isDark ? '#1C1C1E' : '#FFFFFF';
    const secondary = isDark ? '#8E8E93' : '#8E8E93';
    const pill = { height: 34, borderRadius: 999, paddingHorizontal: 14, justifyContent: 'center' as const, backgroundColor: card };

    const tree = useMemo(() => buildWBSTree(rows, true), [rows]);
    const allExpanded = branchKeys(tree).length > 0 && branchKeys(tree).every(id => expanded.includes(id));

    useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 3000); return () => clearTimeout(timer); }, [toast]);

    const changeRows = (next: any[]) => {
        if (locked || saving) return;
        setPast(history => [...history.slice(-49), rows]);
        setFuture([]);
        setRows(next);
        setDirty(true);
        feedback.clear();
    };

    const clearHistory = () => { setPast([]); setFuture([]); };

    const undo = () => {
        if (!past.length || locked || saving) return;
        setFuture(current => [rows, ...current]);
        setRows(past[past.length - 1]);
        setPast(current => current.slice(0, -1));
        setDirty(true);
        feedback.clear();
    };

    const redo = () => {
        if (!future.length || locked || saving) return;
        setPast(current => [...current, rows]);
        setRows(future[0]);
        setFuture(current => current.slice(1));
        setDirty(true);
        feedback.clear();
    };

    const edit = (id: string, field: 'title' | 'title_en', value: string) => {
        if (locked || saving) return;
        changeRows(rows.map(row => row.id === id ? { ...row, [field]: value } : row));
    };

    const persist = async (submit: boolean) => {
        if (locked || saving) return;
        setSaving(true);
        try {
            const reviewCount = latest ? wbsPlanningImpact(latest.items, rows).length : 0;
            const next = await persistWBSWorkflow(project.id, baseline, rows, submit);
            clearHistory();
            setWorkflow(next);
            setBaseline(next);
            setDirty(false);
            setRevisionActive(!submit);
            feedback.clear();
            if (submit) {
                if (latest) setPublishedNotice(reviewCount ? `${reviewCount} changed items need Volume and RAB review.` : 'WBS structure updated. Existing calculations and prices retained.');
                const published = next.versions[next.versions.length - 1];
                setSelected(published.version);
                setRows(clone(published.items));
                setToast(`WBS v.${published.version} submitted.`);
            } else {
                setToast(workflow.draft ? 'Draft changes saved.' : 'WBS saved as draft.');
            }
        } catch (error: any) {
            feedback.notify('Error', error.message || 'Unable to save WBS.');
        } finally {
            setSaving(false);
        }
    };

    const addRevision = () => {
        if (!latest || saving) return;
        clearHistory();
        setRows(clone(workflow.draft?.items || latest.items));
        setSelected(0);
        setRevisionActive(true);
        setDirty(!workflow.draft);
        feedback.clear();
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

    const versionChoices = useMemo(() => [
        ...(workflow.draft || revisionActive || !latest ? [{ title: workflow.draft || revisionActive ? 'Draft' : 'Template', version: 0 }] : []),
        ...[...workflow.versions].reverse().map(version => ({ title: `WBS v.${version.version}`, version: version.version }))
    ], [workflow, revisionActive, latest]);

    // Left Title Accessory: WBS dropdown right next to "WBS"
    useEffect(() => {
        onTitleAccessoryChange?.(
            <ContextMenu
                title="WBS versions"
                dropdownMenuMode
                disabled={saving}
                actions={versionChoices.map(item => ({ title: item.title, selected: selected === item.version }))}
                onPress={event => {
                    if (dirty) { feedback.notify('Error', 'Save the draft before switching versions.'); return; }
                    clearHistory();
                    const version = versionChoices[event.nativeEvent.index].version;
                    setSelected(version);
                    setRows(clone(version ? workflow.versions.find(item => item.version === version)!.items : workflow.draft?.items || items));
                    feedback.clear();
                }}
            >
                <View style={{ height: 34, paddingHorizontal: 12, borderRadius: 999, backgroundColor: card, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ color, fontSize: 12, fontWeight: '600' }}>
                        {selected ? `WBS v.${selected}` : workflow.draft || revisionActive ? 'WBS Draft' : 'WBS Template'}
                    </Text>
                    <PlatformIcon name="chevron.down" size={11} tintColor={color} />
                </View>
            </ContextMenu>
        );
        return () => onTitleAccessoryChange?.(null);
    }, [selected, workflow, revisionActive, saving, dirty, versionChoices, color, card]);

    // Trailing Header: Undo/Redo, Search, Expand/Collapse, Save / Add Revision
    useEffect(() => {
        onHeaderTrailingChange?.(
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {!locked && (
                    <View style={{ height: 34, borderRadius: 17, backgroundColor: card, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 }}>
                        <InstantTooltip label="Undo">
                            <TouchableOpacity
                                accessibilityLabel="Undo"
                                disabled={saving || !past.length}
                                onPress={undo}
                                style={{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', opacity: past.length ? 1 : 0.3 }}
                            >
                                <Ionicons name="arrow-undo-outline" size={15} color={color} />
                            </TouchableOpacity>
                        </InstantTooltip>
                        <View style={{ width: 1, height: 14, backgroundColor: isDark ? '#38383A' : '#D1D1D6', marginHorizontal: 2 }} />
                        <InstantTooltip label="Redo">
                            <TouchableOpacity
                                accessibilityLabel="Redo"
                                disabled={saving || !future.length}
                                onPress={redo}
                                style={{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', opacity: future.length ? 1 : 0.3 }}
                            >
                                <Ionicons name="arrow-redo-outline" size={15} color={color} />
                            </TouchableOpacity>
                        </InstantTooltip>
                    </View>
                )}

                <WBSSearchInput
                    onSearchChange={setSearch}
                    isDark={isDark}
                    card={card}
                    secondary={secondary}
                    text={color}
                />

                <InstantTooltip label={allExpanded ? 'Collapse all' : 'Expand all'}>
                    <TouchableOpacity
                        accessibilityLabel={allExpanded ? 'Collapse all' : 'Expand all'}
                        onPress={() => setExpanded(allExpanded ? [] : keys(tree))}
                        style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: card, alignItems: 'center', justifyContent: 'center' }}
                    >
                        <Ionicons name={allExpanded ? 'contract-outline' : 'expand-outline'} size={16} color={color} />
                    </TouchableOpacity>
                </InstantTooltip>

                {locked && (
                    <InstantTooltip label="Export WBS version">
                        <TouchableOpacity
                            accessibilityLabel="Export WBS version"
                            onPress={exportVersion}
                            style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: card, alignItems: 'center', justifyContent: 'center' }}
                        >
                            <PlatformIcon name="square.and.arrow.up" size={15} tintColor={color} />
                        </TouchableOpacity>
                    </InstantTooltip>
                )}

                {locked ? (
                    <InstantTooltip label="Add Revision">
                        <TouchableOpacity
                            accessibilityLabel="Add Revision"
                            disabled={saving}
                            onPress={addRevision}
                            style={{ height: 34, paddingHorizontal: 14, borderRadius: 999, backgroundColor: '#007AFF', flexDirection: 'row', alignItems: 'center', gap: 6 }}
                        >
                            <Ionicons name="add" size={16} color="#FFFFFF" />
                            <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}>Add Revision</Text>
                        </TouchableOpacity>
                    </InstantTooltip>
                ) : (
                    <ContextMenu
                        title="Save WBS"
                        dropdownMenuMode
                        disabled={saving || !rows.length}
                        actions={[{ title: workflow.draft || revisionActive ? 'Save Changes' : 'Save as Draft' }, { title: 'Submit WBS' }]}
                        onPress={event => persist(event.nativeEvent.index === 1)}
                    >
                        <View style={{ height: 34, paddingHorizontal: 14, borderRadius: 999, backgroundColor: '#007AFF', flexDirection: 'row', alignItems: 'center', gap: 6, opacity: saving ? 0.6 : 1 }}>
                            <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}>{saving ? 'Saving…' : 'Save'}</Text>
                            <PlatformIcon name="chevron.down" size={11} tintColor="#FFFFFF" />
                        </View>
                    </ContextMenu>
                )}
            </View>
        );
        return () => onHeaderTrailingChange?.(null);
    }, [locked, saving, past, future, allExpanded, tree, rows, workflow, revisionActive, isDark, card, secondary, color]);

    return (
        <View style={{ gap: 12, paddingBottom: 64, width: '100%', maxWidth: 960, alignSelf: 'center' }}>
            {!!publishedNotice && (
                <View style={{ padding: 12, borderRadius: 12, backgroundColor: isDark ? '#102749' : '#E8F0FF', flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
                    <Text style={{ color, fontSize: 12, flex: 1 }}>{publishedNotice}</Text>
                    <TouchableOpacity onPress={() => onNavigatePlanning?.('volume')}><Text style={{ color: '#007AFF', fontSize: 12 }}>Open Volume</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => onNavigatePlanning?.('rab')}><Text style={{ color: '#007AFF', fontSize: 12 }}>Open RAB</Text></TouchableOpacity>
                </View>
            )}
            {feedback.failed && <ProjectSaveFeedback {...feedback} />}

            <ProjectWorkTree
                hideToolbar={true}
                externalSearch={search}
                externalExpanded={expanded}
                onExternalExpandedChange={setExpanded}
                items={rows}
                isDark={isDark}
                onEditName={edit}
                onAddWork={locked ? undefined : (node, child) => {
                    if (saving) return;
                    try { changeRows([...rows, newWBSWork(rows, node, child, volumeId())]); }
                    catch (error: any) { feedback.notify('Error', error.message); }
                }}
                onReorder={locked ? undefined : (source, target) => {
                    if (saving) return;
                    try { changeRows(reorderWBS(rows, source, target)); }
                    catch (error: any) { feedback.notify('Error', error.message); }
                }}
                onWorkAction={locked ? undefined : (id, action) => {
                    if (saving) return;
                    const perform = () => {
                        try { changeRows(actOnWBS(rows, id, action, volumeId)); }
                        catch (error: any) { feedback.notify('Error', error.message); }
                    };
                    if (action === 'delete') {
                        if (Platform.OS === 'web') {
                            if (window.confirm('Delete this work and all its subtasks from the draft?')) perform();
                        } else {
                            Alert.alert('Delete work?', 'This also removes its subtasks from the draft.', [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'Delete', style: 'destructive', onPress: perform }
                            ]);
                        }
                    } else perform();
                }}
                editingDisabled={locked || saving}
                showVolume={false}
            />

            {!locked && (
                <View style={{ gap: 10, alignItems: 'flex-start' }}>
                    <TouchableOpacity disabled={saving} onPress={() => setDisciplineForm(value => !value)} style={pill}>
                        <Text style={{ color: '#007AFF', fontSize: 13, fontWeight: '600' }}>＋ Add Discipline</Text>
                    </TouchableOpacity>
                    {disciplineForm && (
                        <View style={{ backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderRadius: 18, padding: 14, gap: 10, width: '100%' }}>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                                {[
                                    { label: 'Code', value: disciplineCode, change: setDisciplineCode, width: 100 },
                                    { label: 'Discipline (EN)', value: disciplineName, change: setDisciplineName, width: 220 },
                                    { label: 'Discipline (ID)', value: disciplineNameId, change: setDisciplineNameId, width: 220 }
                                ].map(field => (
                                    <TextInput
                                        key={field.label}
                                        accessibilityLabel={field.label}
                                        placeholder={field.label}
                                        placeholderTextColor="#8E8E93"
                                        value={field.value}
                                        onChangeText={field.change}
                                        editable={!saving}
                                        style={{ color, borderColor: isDark ? '#38383A' : '#E5E5EA', borderWidth: 1, borderRadius: 999, padding: 10, width: field.width, fontSize: 13 }}
                                    />
                                ))}
                            </View>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                <TouchableOpacity disabled={saving} onPress={() => {
                                    try {
                                        changeRows(addWBSDiscipline(rows, disciplineCode, disciplineName, disciplineNameId, volumeId()));
                                        setDisciplineForm(false);
                                        setDisciplineCode('');
                                        setDisciplineName('');
                                        setDisciplineNameId('');
                                    } catch (error: any) {
                                        feedback.notify('Error', error.message);
                                    }
                                }} style={{ ...pill, backgroundColor: '#007AFF' }}>
                                    <Text style={{ color: '#FFFFFF', fontSize: 13 }}>Add Discipline</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setDisciplineForm(false)} style={pill}>
                                    <Text style={{ color, fontSize: 13 }}>Cancel</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>
            )}

            {!!toast && (
                <View pointerEvents="none" accessibilityRole="alert" style={{ position: Platform.OS === 'web' ? 'fixed' as any : 'absolute', top: 80, right: 24, width: 360, maxWidth: '90%', zIndex: 1000 }}>
                    <DynamicIslandToastHUD title="WBS" message={toast} isDark={isDark} />
                </View>
            )}
        </View>
    );
});
