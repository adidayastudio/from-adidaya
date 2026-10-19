import React, { useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ContextMenu from '@/components/ui/PlatformContextMenu';
import { InstantTooltip } from '@/components/ui/InstantTooltip';
import { VolumeDraft, volumeDraftTotal, volumeUnitMismatch } from '@/lib/projectVolumeEditor';

export function VolumeWBSNavigator({ tree, drafts, selectedCode, onSelect, disabled, isDark }: { tree: any[]; drafts: Record<string, VolumeDraft>; selectedCode: string; onSelect: (node: any) => void; disabled: boolean; isDark: boolean }) {
    const [expanded, setExpanded] = useState<string[]>(tree.slice(0, 1).flatMap(node => [node.code, ...(node.children?.slice(0, 1).map((child: any) => child.code) || [])]));
    const [search, setSearch] = useState(''), [filter, setFilter] = useState(0);
    const text = isDark ? '#F5F5F7' : '#1C1C1E', muted = isDark ? '#9898A2' : '#73737D';
    const branches = (nodes: any[]): string[] => nodes.flatMap(node => node.children?.length ? [node.code, ...branches(node.children)] : []);
    const allOpen = branches(tree).length > 0 && branches(tree).every(code => expanded.includes(code));
    const matches = (node: any): boolean => {
        if (node.children?.length) return node.children.some(matches);
        const draft = drafts[node.code];
        return `${node.code} ${node.nameEn} ${node.nameId}`.toLowerCase().includes(search.toLowerCase()) && (filter === 0 || (filter === 1 ? !draft?.calculated : draft?.dirty));
    };
    const render = (nodes: any[], depth = 0): React.ReactNode => nodes.filter(matches).map(node => {
        const children = node.children || [], open = !!search || filter > 0 || expanded.includes(node.code), draft = drafts[node.code], selected = selectedCode === node.code;
        return <View key={node.id || node.code}>
            <TouchableOpacity disabled={disabled} accessibilityLabel={`${node.code} ${node.nameEn}`} accessibilityState={children.length ? { expanded: open } : { selected }} onPress={() => children.length ? setExpanded(current => current.includes(node.code) ? current.filter(code => code !== node.code) : [...current, node.code]) : onSelect(node)} style={{ flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: children.length ? 11 : 9, paddingLeft: 10 + Math.min(depth, 4) * 12, paddingRight: 10, borderRadius: 10, backgroundColor: selected ? (isDark ? '#102749' : '#E8F0FF') : 'transparent', marginBottom: 2 }}>
                {children.length > 0 && <Ionicons name={open ? 'chevron-down' : 'chevron-forward'} size={12} color={muted} />}
                <View style={{ flex: 1, minWidth: 0, gap: 3 }}><View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}><Text numberOfLines={1} style={{ color: muted, fontSize: 10, lineHeight: 17, minWidth: children.length ? 16 : 30, flexShrink: 0 }}>{node.code}</Text><Text numberOfLines={selected ? undefined : 1} ellipsizeMode="tail" style={{ color: selected ? '#4D9FFF' : text, fontSize: 12, lineHeight: 17, flex: 1, minWidth: 0, fontWeight: children.length || selected ? '600' : '400' }}>{node.nameEn}</Text></View>{selected && !!node.nameId && node.nameId !== node.nameEn && <Text style={{ color: muted, fontSize: 10, paddingLeft: 38 }}>{node.nameId}</Text>}</View>
                {!children.length && draft && <InstantTooltip label={`${(draft.dirty ? volumeUnitMismatch(draft) ? null : volumeDraftTotal(draft.rows) : draft.applied)?.toLocaleString('en-US', { maximumFractionDigits: 3 }) ?? '—'} ${draft.unit}${draft.dirty ? ' · Unsaved' : ''}`}><Text numberOfLines={selected ? undefined : 1} ellipsizeMode="tail" style={{ color: draft.dirty ? '#007AFF' : muted, fontSize: 11, maxWidth: selected ? 110 : 64, textAlign: 'right', flexShrink: 0 }}>{(draft.dirty ? volumeUnitMismatch(draft) ? null : volumeDraftTotal(draft.rows) : draft.applied)?.toLocaleString('en-US', { maximumFractionDigits: 3 }) ?? '—'} {draft.unit}</Text></InstantTooltip>}
            </TouchableOpacity>
            {!!children.length && open && render(children, depth + 1)}
        </View>;
    });
    return <View style={{ flex: 1, minHeight: 0 }}>
        <View style={{ padding: 14, gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Text style={{ color: text, flex: 1, fontSize: 12, fontWeight: '700' }}>WORK ITEMS</Text>
                <InstantTooltip label={allOpen ? 'Collapse all' : 'Expand all'}><TouchableOpacity accessibilityLabel={allOpen ? 'Collapse all' : 'Expand all'} onPress={() => setExpanded(allOpen ? [] : branches(tree))} style={{ padding: 5 }}><Ionicons name={allOpen ? 'contract-outline' : 'expand-outline'} size={15} color={muted} /></TouchableOpacity></InstantTooltip>
                <InstantTooltip label={['All work', 'Not calculated', 'Unsaved changes'][filter]}><ContextMenu dropdownMenuMode title="Show work" actions={['All work', 'Not calculated', 'Unsaved changes'].map((title, index) => ({ title, selected: index === filter }))} onPress={event => setFilter(event.nativeEvent.index)} style={{ width: 26, height: 26 }}><View style={{ width: 26, height: 26, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="filter-outline" size={15} color={filter ? '#007AFF' : muted} /></View></ContextMenu></InstantTooltip>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, height: 34, borderRadius: 999, backgroundColor: isDark ? '#202027' : '#F2F2F7' }}><Ionicons name="search-outline" size={15} color={muted} /><TextInput accessibilityLabel="Search work items" value={search} onChangeText={setSearch} placeholder="Search work items" placeholderTextColor={muted} style={{ flex: 1, minWidth: 0, color: text, fontSize: 12, padding: 0 }} />{!!search && <TouchableOpacity accessibilityLabel="Clear search" onPress={() => setSearch('')}><Ionicons name="close-outline" size={14} color={muted} /></TouchableOpacity>}</View>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 8 }}>{render(tree)}{!tree.some(matches) && <Text style={{ color: muted, padding: 14, fontSize: 12 }}>No matching work items.</Text>}</ScrollView>
    </View>;
}
