import React, { useMemo, useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { buildWBSTree } from '@/lib/legacy-rab/wbs-mapper';

export function ProjectWorkTree({ items, isDark, stages = false, onSelectLeaf, selectedCode }: { items: any[]; isDark: boolean; stages?: boolean; onSelectLeaf?: (node: any) => void; selectedCode?: string }) {
    const [expanded, setExpanded] = useState<string[]>([]), [search, setSearch] = useState(''), [view, setView] = useState('summary');
    const color = isDark ? '#FFFFFF' : '#1C1C1E', secondary = isDark ? '#8E8E93' : '#8E8E93', border = isDark ? '#303034' : '#E5E5EA';
    const pill = { borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' };
    const tree = useMemo(() => stages ? items : buildWBSTree(items), [items, stages]);
    const keys = (nodes: any[]): string[] => nodes.flatMap(node => [String(node.id || node.code), ...keys(node.children || [])]);
    const query = search.trim().toLowerCase();
    const matches = (node: any): boolean => !query || [node.code, node.nameEn, node.nameId, node.title, node.name].some(value => String(value || '').toLowerCase().includes(query)) || (node.children || []).some(matches);
    const renderNodes = (nodes: any[], depth = 0): React.ReactNode => nodes.filter(matches).map(node => {
        const id = String(node.id || node.code), children = node.children || [], open = expanded.includes(id);
        return <View key={id} style={depth === 0 ? { marginBottom: 12, borderRadius: 22, borderWidth: 1, borderColor: border, overflow: 'hidden', backgroundColor: isDark ? '#101012' : '#FFFFFF' } : { marginLeft: 24, borderLeftWidth: 1, borderLeftColor: border }}>
            <TouchableOpacity disabled={!children.length && !onSelectLeaf} accessibilityRole={children.length || onSelectLeaf ? 'button' : undefined} accessibilityState={children.length ? { expanded: open } : undefined} onPress={() => children.length ? setExpanded(current => current.includes(id) ? current.filter(key => key !== id) : [...current, id]) : onSelectLeaf?.(node)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, backgroundColor: selectedCode === node.code ? (isDark ? '#301216' : '#FFF0F2') : 'transparent' }}>
                <Ionicons name={children.length ? open ? 'chevron-down' : 'chevron-forward' : 'return-down-forward-outline'} size={16} color={secondary} />
                <View style={{ borderRadius: 999, borderWidth: 1, borderColor: border, paddingHorizontal: 10, paddingVertical: 8 }}><Text style={{ color: secondary, fontSize: 12 }}>{node.code}</Text></View>
                <View style={{ flex: 1, gap: 5 }}><Text style={{ color, fontSize: 15, fontWeight: children.length ? '600' : '500' }}>{node.nameEn || node.title || node.name || node.code}</Text>{!!node.nameId && node.nameId !== node.nameEn && <Text style={{ color: secondary, fontStyle: 'italic' }}>{node.nameId}</Text>}</View>
                {view === 'breakdown' && !stages && !children.length && node.quantity != null && <Text style={{ color: secondary, fontSize: 12 }}>{node.quantity} {node.unit || ''}</Text>}
                {!!node.status && <Text style={{ color: secondary, fontSize: 12 }}>{node.status}</Text>}
            </TouchableOpacity>
            {open && children.length > 0 && renderNodes(children, depth + 1)}
        </View>;
    });
    return <View>
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 18 }}>
            {!stages && <SegmentedControl segments={[{ id: 'summary', label: 'Summary' }, { id: 'breakdown', label: 'Breakdown' }]} activeSegment={view} onSegmentChange={setView} />}
            <TextInput accessibilityLabel={stages ? 'Search stages and work' : 'Search WBS'} value={search} onChangeText={value => { setSearch(value); if (value.trim()) setExpanded(keys(tree)); }} placeholder={stages ? 'Search stages or work' : 'Search WBS code or title'} placeholderTextColor={secondary} style={{ ...pill, color, flexGrow: 1, minWidth: 200 }} />
            <TouchableOpacity style={pill} onPress={() => setExpanded(keys(tree))}><Text style={{ color: '#007AFF' }}>Expand all</Text></TouchableOpacity>
            <TouchableOpacity style={pill} onPress={() => setExpanded([])}><Text style={{ color: '#007AFF' }}>Collapse all</Text></TouchableOpacity>
        </View>
        {renderNodes(tree)}
        {!tree.some(matches) && <Text style={{ color: secondary, padding: 16 }}>{query ? 'No matching work items.' : 'No work items saved for this project.'}</Text>}
    </View>;
}
