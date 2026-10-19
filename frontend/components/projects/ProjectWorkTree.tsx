import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { InstantTooltip } from '@/components/ui/InstantTooltip';
import ContextMenu from '@/components/ui/PlatformContextMenu';
import { Ionicons } from '@expo/vector-icons';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import type { WBSAction } from '@/lib/projectWBSActions';
import { buildWBSTree } from '@/lib/legacy-rab/wbs-mapper';

export const branchKeys = (nodes: any[]): string[] => nodes.flatMap(node => node.children?.length ? [String(node.id || node.code), ...branchKeys(node.children)] : []);
export const keys = (nodes: any[]): string[] => nodes.flatMap(node => [String(node.id || node.code), ...keys(node.children || [])]);

export function ProjectWorkTree({
    items, isDark, stages = false, onSelectLeaf, selectedCode, onEditName,
    editingDisabled = false, showVolume = true, toolbarAction, toolbarLeading,
    toolbarTools, onAddWork, onToolbarChange, onWorkAction, onReorder,
    externalSearch, externalExpanded, onExternalExpandedChange, hideToolbar = false,
}: {
    items: any[]; isDark: boolean; stages?: boolean; onSelectLeaf?: (node: any) => void;
    selectedCode?: string; onEditName?: (id: string, field: 'title' | 'title_en', value: string) => void;
    editingDisabled?: boolean; showVolume?: boolean; toolbarAction?: React.ReactNode;
    toolbarLeading?: React.ReactNode; toolbarTools?: React.ReactNode; onAddWork?: (node: any, child: boolean) => void;
    onToolbarChange?: (toolbar: React.ReactNode) => void; onWorkAction?: (id: string, action: WBSAction) => void;
    onReorder?: (sourceId: string, targetId: string) => void;
    externalSearch?: string; externalExpanded?: string[]; onExternalExpandedChange?: (keys: string[]) => void;
    hideToolbar?: boolean;
}) {
    const [internalExpanded, setInternalExpanded] = useState<string[]>([]);
    const [internalSearch, setInternalSearch] = useState('');
    const [view, setView] = useState('summary');
    const dragId = useRef<string | null>(null);
    const [searchOpen, setSearchOpen] = useState(false);
    const [dragOver, setDragOver] = useState<string | null>(null);

    const expanded = externalExpanded !== undefined ? externalExpanded : internalExpanded;
    const setExpanded = (updater: string[] | ((curr: string[]) => string[])) => {
        const next = typeof updater === 'function' ? updater(expanded) : updater;
        if (onExternalExpandedChange) onExternalExpandedChange(next);
        else setInternalExpanded(next);
    };
    const search = externalSearch !== undefined ? externalSearch : internalSearch;
    const setSearch = setInternalSearch;

    const DragRow = Platform.OS === 'web' && onReorder ? 'div' : View;
    const color = isDark ? '#FFFFFF' : '#1C1C1E', secondary = isDark ? '#8E8E93' : '#8E8E93', border = isDark ? '#303034' : '#E5E5EA';
    const pill = useMemo(() => ({ borderRadius: 999, paddingHorizontal: onEditName ? 12 : 16, paddingVertical: onEditName ? 0 : 10, height: onEditName ? 46 : undefined, justifyContent: 'center' as const, backgroundColor: onEditName ? (isDark ? '#1C1C1E' : '#FFFFFF') : (isDark ? '#1C1C1E' : '#F2F2F7'), borderWidth: onEditName ? 1 : 0, borderColor: border }), [onEditName, isDark, border]);
    const tree = useMemo(() => stages ? items : buildWBSTree(items, !!onEditName), [items, stages, onEditName]);
    const NodeRow = onEditName ? View : TouchableOpacity;
    const query = search.trim().toLowerCase();
    const matches = (node: any): boolean => !query || [node.code, node.nameEn, node.nameId, node.title, node.name].some(value => String(value || '').toLowerCase().includes(query)) || (node.children || []).some(matches);
    const renderNodes = (nodes: any[], depth = 0): React.ReactNode => nodes.filter(matches).map(node => {
        const id = String(node.id || node.code), children = node.children || [], open = expanded.includes(id);
        const addWork = (child: boolean) => { onAddWork?.(node, child); if (child) setExpanded(current => [...new Set([...current, id])]); };
        return <View key={id} style={depth === 0 ? { marginBottom: 12, borderRadius: 22, borderWidth: 1, borderColor: border, overflow: 'hidden', backgroundColor: isDark ? '#101012' : '#FFFFFF' } : { marginLeft: 24, borderLeftWidth: 1, borderLeftColor: border }}>
            <DragRow {...(Platform.OS === 'web' && onReorder ? {
                onDragOver: (event: React.DragEvent) => { if (!dragId.current || editingDisabled || query) return; event.preventDefault(); event.stopPropagation(); event.dataTransfer.dropEffect = 'move'; setDragOver(id); },
                onDragLeave: () => setDragOver(null),
                onDrop: (event: React.DragEvent) => { event.preventDefault(); event.stopPropagation(); const source = dragId.current; dragId.current = null; setDragOver(null); if (source && !editingDisabled && !query) onReorder(source, id); },
                style: { borderTop: dragOver === id ? '2px solid #007AFF' : '2px solid transparent' },
            } : {})}>
            <NodeRow onPress={!onEditName ? () => children.length ? setExpanded(current => current.includes(id) ? current.filter(key => key !== id) : [...current, id]) : onSelectLeaf?.(node) : undefined} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: onEditName ? 10 : 16, backgroundColor: selectedCode === node.code ? (isDark ? '#301216' : '#FFF0F2') : 'transparent' }}>
                {onReorder && !editingDisabled && Platform.OS === 'web' && <div draggable={!query} role="button" tabIndex={0} aria-label={`Drag ${node.code} to reorder`} title={query ? 'Clear search to reorder' : 'Drag to reorder'} onKeyDown={event => { if (event.key === 'ArrowUp' || event.key === 'ArrowDown') { event.preventDefault(); onWorkAction?.(id, event.key === 'ArrowUp' ? 'up' : 'down'); } }} onDragStart={event => { event.stopPropagation(); dragId.current = id; event.dataTransfer.setData('text/plain', id); event.dataTransfer.effectAllowed = 'move'; }} onDragEnd={() => { dragId.current = null; setDragOver(null); }} style={{ cursor: query ? 'default' : 'grab', padding: 4, flexShrink: 0 }}><Ionicons name="reorder-three-outline" size={18} color={secondary} /></div>}
                <TouchableOpacity disabled={!children.length && !onSelectLeaf} accessibilityLabel={`Expand or select ${node.code}`} accessibilityRole="button" accessibilityState={children.length ? { expanded: open } : undefined} onPress={event => { event.stopPropagation(); if (children.length) setExpanded(current => current.includes(id) ? current.filter(key => key !== id) : [...current, id]); else onSelectLeaf?.(node); }} style={{ padding: 6 }}><Ionicons name={children.length ? open ? 'chevron-down' : 'chevron-forward' : 'return-down-forward-outline'} size={16} color={secondary} /></TouchableOpacity>
                <View style={{ borderRadius: 999, borderWidth: 1, borderColor: border, paddingHorizontal: 10, paddingVertical: 8 }}><Text style={{ color: secondary, fontSize: 12 }}>{node.code}</Text></View>
                <View style={{ flex: 1, gap: 3 }}>{onEditName ? <>
                    <TextInput editable={!editingDisabled} accessibilityLabel={`${node.code} English name`} value={node.nameEn} onChangeText={value => onEditName(id, 'title', value)} style={{ color, fontSize: 13, fontWeight: children.length ? '600' : '500', paddingVertical: 4, paddingHorizontal: 6, borderRadius: 6 }} />
                    <TextInput editable={!editingDisabled} accessibilityLabel={`${node.code} Indonesian name`} placeholder="Indonesian name" placeholderTextColor={secondary} value={node.title_en || ''} onChangeText={value => onEditName(id, 'title_en', value)} style={{ color: secondary, fontSize: 12, fontStyle: 'italic', paddingVertical: 3, paddingHorizontal: 6, borderRadius: 6 }} />
                </> : <><Text style={{ color, fontSize: 15, fontWeight: children.length ? '600' : '500' }}>{node.nameEn || node.title || node.name || node.code}</Text>{!!node.nameId && node.nameId !== node.nameEn && <Text style={{ color: secondary, fontStyle: 'italic' }}>{node.nameId}</Text>}</>}</View>
                {showVolume && view === 'breakdown' && !stages && !children.length && node.quantity != null && <Text style={{ color: secondary, fontSize: 12 }}>{node.quantity} {node.unit || ''}</Text>}
                {!!onWorkAction && !editingDisabled && <View style={{ flexDirection: 'row', gap: 2, alignItems: 'center' }}>{([
                    ['up', 'arrow-up-outline', 'Move up'], ['down', 'arrow-down-outline', 'Move down'], ['outdent', 'arrow-back-outline', 'Outdent'], ['indent', 'arrow-forward-outline', 'Indent'], ['duplicate', 'copy-outline', 'Duplicate'], ['delete', 'trash-outline', 'Delete work and subtasks'],
                ] as const).map(([action, icon, label]) => <InstantTooltip key={action} label={label}><TouchableOpacity accessibilityLabel={label} disabled={!depth && !['up', 'down'].includes(action)} onPress={() => onWorkAction(id, action)} style={{ width: 26, height: 30, alignItems: 'center', justifyContent: 'center', opacity: !depth && !['up', 'down'].includes(action) ? 0.25 : 1 }}><Ionicons name={icon} size={15} color={secondary} /></TouchableOpacity></InstantTooltip>)}</View>}
                {!!onAddWork && <InstantTooltip label="Add task or subtask"><ContextMenu title="Add work" dropdownMenuMode disabled={editingDisabled} style={{ width: 32, height: 32 }} actions={[{ title: 'Add Task', disabled: !node.code?.includes('.') }, { title: 'Add Subtask' }]} onPress={event => addWork(event.nativeEvent.index === 1)}><View style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }}><Ionicons name="add" size={18} color="#007AFF" /></View></ContextMenu></InstantTooltip>}
                {!!node.status && <Text style={{ color: secondary, fontSize: 12 }}>{node.status}</Text>}
            </NodeRow>
            </DragRow>
            {open && children.length > 0 && renderNodes(children, depth + 1)}
        </View>;
    });
    const toolbar = useMemo(() => (<View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: onEditName ? 'nowrap' : 'wrap', justifyContent: onToolbarChange ? 'flex-end' : undefined, gap: onEditName ? 6 : 10, marginBottom: onToolbarChange ? 0 : onEditName ? 10 : 18 }}>
            {toolbarLeading}
            {!stages && !onEditName && <SegmentedControl segments={[{ id: 'summary', label: 'Summary' }, { id: 'breakdown', label: 'Breakdown' }]} activeSegment={view} onSegmentChange={setView} />}
            {toolbarLeading && <View style={{ flex: 1 }} />}
            {toolbarTools}
            {(!onEditName || searchOpen) && <View style={{ ...pill, flexDirection: 'row', alignItems: 'center', gap: 8, flexGrow: onEditName ? 0 : 1, flexShrink: 1, width: onEditName ? 190 : undefined, minWidth: 100 }}>
                <Ionicons name="search-outline" size={16} color={secondary} />
                <TextInput autoFocus={!!onEditName} accessibilityLabel={stages ? 'Search stages and work' : 'Search WBS'} value={search} onChangeText={value => { setSearch(value); if (value.trim()) setExpanded(keys(tree)); }} placeholder={stages ? 'Search stages or work' : 'Search WBS'} placeholderTextColor={secondary} style={{ color, fontSize: 13, flex: 1, minWidth: 0, padding: 0, height: '100%' }} />
                {!!onEditName && <InstantTooltip label={search ? 'Clear search' : 'Close search'}><TouchableOpacity accessibilityLabel={search ? 'Clear search' : 'Close search'} onPress={() => { if (search) setSearch(''); else setSearchOpen(false); }} style={{ width: 26, height: 32, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="close-outline" size={17} color={secondary} /></TouchableOpacity></InstantTooltip>}
            </View>}
            {onEditName && !searchOpen && <InstantTooltip label="Search WBS"><TouchableOpacity accessibilityLabel="Search WBS" style={{ ...pill, paddingHorizontal: 0, width: 46, alignItems: 'center' }} onPress={() => setSearchOpen(true)}><Ionicons name="search-outline" size={18} color={color} /></TouchableOpacity></InstantTooltip>}
            <InstantTooltip label={branchKeys(tree).length > 0 && branchKeys(tree).every(id => expanded.includes(id)) ? 'Collapse all' : 'Expand all'}><TouchableOpacity accessibilityLabel={branchKeys(tree).length > 0 && branchKeys(tree).every(id => expanded.includes(id)) ? 'Collapse all' : 'Expand all'} style={{ ...pill, paddingHorizontal: 0, width: 46, alignItems: 'center' }} onPress={() => setExpanded(branchKeys(tree).length > 0 && branchKeys(tree).every(id => expanded.includes(id)) ? [] : keys(tree))}><Ionicons name={branchKeys(tree).length > 0 && branchKeys(tree).every(id => expanded.includes(id)) ? 'contract-outline' : 'expand-outline'} size={18} color={color} /></TouchableOpacity></InstantTooltip>
            {toolbarAction && <View style={{ marginLeft: onToolbarChange ? 0 : 'auto' }}>{toolbarAction}</View>}
        </View>), [search, searchOpen, expanded, view, tree, stages, onEditName, toolbarAction, toolbarLeading, toolbarTools, color, onToolbarChange, pill, secondary]);
    useEffect(() => {
        if (hideToolbar) return;
        onToolbarChange?.(toolbar);
        return () => onToolbarChange?.(null);
    }, [hideToolbar, onToolbarChange, toolbar]);
    return <View>
        {!hideToolbar && !onToolbarChange && toolbar}
        {renderNodes(tree)}
        {!tree.some(matches) && <Text style={{ color: secondary, padding: 16 }}>{query ? 'No matching work items.' : 'No work items saved for this project.'}</Text>}
    </View>;
}
