import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ContextMenu from '@/components/ui/PlatformContextMenu';
import { PROJECT_LINKED_MODULES } from '@/lib/projectLinkedModules';

const groups = [
    { label: 'Overview', items: [{ id: 'overview', title: 'Overview' }] },
    { label: 'Planning', dropdown: true, items: [
        { id: 'settings:general', title: 'Project Information', short: 'Information' },
        { id: 'planning:stages', title: 'Stages' },
        { id: 'planning:wbs', title: 'WBS' },
        { id: 'planning:volume', title: 'Volume' },
        { id: 'planning:rab', title: 'RAB' },
        { id: 'planning:schedule', title: 'Schedule' },
    ] },
    { label: 'Work', dropdown: true, items: [
        { id: 'work', title: 'Tasks & Deliverables', short: 'Deliverables' },
        { id: 'activity', title: 'Activity Log', short: 'Activity' },
        { id: 'tracking', title: 'WBS Tracking', short: 'Tracking' },
        { id: 'planning:reports', title: 'Reports', short: 'Reports' },
    ] },
    { label: 'Document', items: [{ id: 'docs', title: 'Document' }] },
];
export function ProjectFocusNavigation({ section, isDark, onSelect, onOpenModule, compact = false }: { section: string; isDark: boolean; onSelect: (id: string) => void; onOpenModule: (path: string) => void; compact?: boolean }) {
    const text = isDark ? '#FFFFFF' : '#1C1C1E', secondary = isDark ? '#AEAEB2' : '#636366';
    const itemStyle = { borderRadius: 999, height: compact ? 32 : 36, paddingHorizontal: compact ? 12 : 16, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: compact ? 5 : 8 };
    return <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, padding: compact ? 3 : 4, borderRadius: 999, borderWidth: 1, borderColor: isDark ? '#38383A' : '#E5E5EA', backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }}>
            {groups.map(group => {
                const current = group.items.find(item => item.id === section);
                const childLabel = current && ('short' in current ? current.short : current.title);
                const label = current && group.dropdown && childLabel !== group.label ? `${group.label} | ${childLabel}` : group.label;
                const style = { ...itemStyle, backgroundColor: current ? (isDark ? '#414143' : '#E8E8ED') : 'transparent' };
                const content = <><Text style={{ color: current ? text : secondary, fontSize: compact ? 12 : 13, fontWeight: current ? '700' : '500' }}>{label}</Text>{group.dropdown && <Ionicons name="chevron-down" size={compact ? 11 : 12} color={current ? text : secondary} />}</>;
                return group.dropdown ? <ContextMenu key={group.label} title={group.label} dropdownMenuMode actions={group.items.map(item => ({ title: item.title, selected: item.id === section }))} onPress={event => onSelect(group.items[event.nativeEvent.index].id)}><View accessibilityLabel={label} style={style}>{content}</View></ContextMenu> : <TouchableOpacity key={group.label} accessibilityRole="tab" accessibilityState={{ selected: !!current }} onPress={() => onSelect(group.items[0].id)} style={style}>{content}</TouchableOpacity>;
            })}
            <ContextMenu title="Module" dropdownMenuMode actions={PROJECT_LINKED_MODULES.map(module => ({ title: module.title }))} onPress={event => onOpenModule(PROJECT_LINKED_MODULES[event.nativeEvent.index].path)}><View accessibilityLabel="Module" style={itemStyle}><Text style={{ color: secondary, fontSize: compact ? 12 : 13, fontWeight: '500' }}>Module</Text><Ionicons name="chevron-down" size={compact ? 11 : 12} color={secondary} /></View></ContextMenu>
        </View>
    </ScrollView>;
}
