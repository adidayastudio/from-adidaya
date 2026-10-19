import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ContextMenu from '@/components/ui/PlatformContextMenu';
import { PlanningModule, PlanningVersion, planningRevision, PlanningImpact } from '@/lib/projectPlanningRevisions';
import { persistPlanningRevision } from '@/lib/api/projectPlanningRevisions';
export function PlanningRevisionBar({ projectId, meta, module, dirty, isDark, selected, onSelect, onMetaChange, onOpenItem, onBusyChange, leading, beforePublish, compactAlerts = false }: { projectId: string; meta: any; module: PlanningModule; dirty: boolean; isDark: boolean; selected: number; onSelect: (version: number) => void; onMetaChange: (meta: any) => void; onOpenItem?: (id: string) => void; onBusyChange?: (busy: boolean) => void; leading?: React.ReactNode; beforePublish?: React.ReactNode; compactAlerts?: boolean }) {
    const [reviewsOpen, setReviewsOpen] = useState(false);
    const [busy, setBusy] = useState(false), [error, setError] = useState('');
    const state = planningRevision(meta, module), latest = state.versions.slice(-1)[0];
    const title = module === 'volume' ? 'Volume' : 'RAB';
    const color = isDark ? '#F5F5F7' : '#1C1C1E', muted = isDark ? '#9898A2' : '#73737D';
    const pill = { paddingHorizontal: 14, height: 34, borderRadius: 999, backgroundColor: isDark ? '#1C1D23' : '#F2F2F7', flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6 };
    const impacts: PlanningImpact[] = (meta.planningImpact?.items || []).filter((item: PlanningImpact) => module === 'volume' ? item.volumeReview : item.rabReview);
    const choices = [...(state.draft ? [{ title: `${title} Draft`, version: 0 }] : []), ...[...state.versions].reverse().map((version: PlanningVersion) => ({ title: `${title} v.${version.version}`, version: version.version }))];
    const act = async (action: 'start' | 'publish' | 'review', id?: string) => {
        if (dirty) { setError('Save or reset unsaved calculations before continuing.'); return; }
        setBusy(true); onBusyChange?.(true); setError('');
        try { const next = await persistPlanningRevision(projectId, module, action, id); onMetaChange(next); if (action !== 'review') onSelect(action === 'start' ? 0 : planningRevision(next, module).versions.slice(-1)[0].version); }
        catch (err: any) { setError(err.message || 'Unable to update revision.'); }
        finally { setBusy(false); onBusyChange?.(false); }
    };
    const source = selected ? state.versions.find(item => item.version === selected) : null;
    return <View style={{ gap: 8, marginBottom: 10 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
            {leading}
            <ContextMenu title={`${title} versions`} dropdownMenuMode disabled={busy} actions={choices.map(choice => ({ title: choice.title, selected: choice.version === selected }))} onPress={event => { if (dirty) { setError('Save or reset unsaved changes before switching versions.'); return; } onSelect(choices[event.nativeEvent.index].version); }}><View style={pill}><Text style={{ color, fontSize: 12, fontWeight: '600' }}>{selected ? `${title} v.${selected}` : `${title} Draft`}</Text><Ionicons name="chevron-down" size={12} color={muted} /></View></ContextMenu>
            <Text numberOfLines={1} style={{ color: muted, fontSize: 11, flexShrink: 1 }}>{source ? `Published · WBS v.${source.wbsVersion}${source.volumeVersion ? ` · Volume v.${source.volumeVersion}` : ''}` : latest ? `Draft revision of ${title} v.${latest.version}` : 'Draft · Not published'}</Text>
            <View style={{ flex: 1 }} />
            {beforePublish}
            <TouchableOpacity disabled={busy || dirty} onPress={() => act(state.draft && !selected ? 'publish' : 'start')} style={{ ...pill, opacity: busy || dirty ? 0.45 : 1 }}><Text style={{ color: '#007AFF', fontSize: 12, fontWeight: '600' }}>{busy ? 'Please wait…' : state.draft ? selected ? 'Open Draft' : latest ? 'Publish Revision' : `Publish ${title}` : 'Add Revision'}</Text></TouchableOpacity>
        </View>
        {!selected && compactAlerts && (impacts.length > 0 || (module === 'rab' && planningRevision(meta, 'volume').draft)) && <TouchableOpacity onPress={() => setReviewsOpen(value => !value)} style={{ alignSelf: 'flex-start' }}><Text style={{ color: '#007AFF', fontSize: 12 }}>{impacts.length ? `${impacts.length} items need review` : 'Volume needs review'} · {reviewsOpen ? 'Hide' : 'View'}</Text></TouchableOpacity>}
        {!selected && (!compactAlerts || reviewsOpen) && impacts.length > 0 && <View style={{ padding: 12, borderRadius: 12, backgroundColor: isDark ? '#102749' : '#E8F0FF', gap: 8 }}>
            <Text style={{ color: '#007AFF', fontSize: 12, fontWeight: '600' }}>WBS v.{meta.planningImpact.wbsVersion} · {impacts.length} items need {title} review</Text>
            {impacts.map(item => <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><TouchableOpacity disabled={!onOpenItem || item.kind === 'removed'} onPress={() => onOpenItem?.(item.id)} style={{ flex: 1 }}><Text style={{ color, fontSize: 12 }}>{item.code} · {item.title} · {item.kind === 'unit' ? 'Unit changed' : item.kind === 'structure' ? 'Hierarchy changed' : item.kind === 'added' ? 'New item' : item.kind === 'volume' ? 'Volume updated' : 'Removed item'}</Text></TouchableOpacity><TouchableOpacity disabled={busy || dirty} onPress={() => act('review', item.id)}><Text style={{ color: '#007AFF', fontSize: 12 }}>Mark reviewed</Text></TouchableOpacity></View>)}
        </View>}
        {!selected && !compactAlerts && !impacts.length && meta.planningImpact?.structureUpdated && <Text style={{ color: muted, fontSize: 11 }}>WBS structure updated · Existing calculations and prices retained.</Text>}
        {!selected && (!compactAlerts || reviewsOpen) && module === 'rab' && planningRevision(meta, 'volume').draft && <Text style={{ color: '#007AFF', fontSize: 12 }}>Volume update available · Review and publish Volume before publishing RAB.</Text>}
        {!!error && <Text accessibilityRole="alert" style={{ color: '#FF9500', fontSize: 12 }}>{error}</Text>}
    </View>;
}
