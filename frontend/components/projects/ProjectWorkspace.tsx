import { LinearGradient } from 'expo-linear-gradient';
import { DESKTOP_LIST_PANE, DESKTOP_PANEL_HEADER, DESKTOP_PANEL_TITLE } from '@/constants/desktopLayout';
import React, { useEffect, useState } from 'react';
import { Alert, Image, Platform, ScrollView, Share, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Project, getProjectById, updateProjectApi } from '@/lib/api/projects';
import { TenantBrandLogo } from '@/components/ui/TenantBrandLogo';
import { useTenantContext } from '@/context/TenantContext';
import { useTheme } from '@/context/ThemeContext';
import { HeaderToolbar } from '@/components/ui/HeaderToolbar';
import { ProjectPlanningPanel, PlanningSection } from './ProjectPlanningPanel';
import General from '@/app/project-setup/[id]/general';
import Team from '@/app/project-setup/[id]/team';
import Stages from '@/app/project-setup/[id]/stages';
import Wbs from '@/app/project-setup/[id]/work-structure';
import Control from '@/app/project-setup/[id]/control';
import Cost from '@/app/project-setup/[id]/cost-system';
import Time from '@/app/project-setup/[id]/time-system';
import Prices from '@/app/project-setup/[id]/price-library';
import Reports from '@/app/project-setup/[id]/reports';
import Management from '@/app/project-setup/[id]/management';

const SETTINGS: Record<string, React.ComponentType<any>> = { general: General, team: Team, stages: Stages, wbs: Wbs, control: Control, cost: Cost, time: Time, prices: Prices, reports: Reports, management: Management };
const GROUPS = [
    { title: '', items: [{ id: 'overview', title: 'Overview', icon: 'home-outline' }] },
    { title: 'PLANNING', items: [
        { id: 'settings:general', title: 'Project Information', icon: 'information-circle-outline' },
        { id: 'planning:stages', title: 'Stages & Tasks', icon: 'layers-outline' },
        { id: 'planning:wbs', title: 'WBS', icon: 'grid-outline' },
        { id: 'planning:volume', title: 'Volume', icon: 'calculator-outline' },
        { id: 'planning:rab', title: 'RAB', icon: 'cash-outline' },
        { id: 'planning:schedule', title: 'Schedule', icon: 'calendar-outline' },
    ] },
    { title: 'WORK', items: [
        { id: 'work', title: 'Tasks & Deliverables', icon: 'checkbox-outline' },
        { id: 'tracking', title: 'Tracking', icon: 'stats-chart-outline' },
        { id: 'activity', title: 'Activity', icon: 'pulse-outline' },
    ] },
    { title: 'DOCUMENTS', items: [{ id: 'docs', title: 'Docs', icon: 'folder-outline' }, { id: 'planning:reports', title: 'Reports', icon: 'document-text-outline' }] },
];
const SETTING_NAMES: Record<string, string> = { general: 'General', team: 'Team & Access', stages: 'Stages & Deliverables', wbs: 'WBS Preferences', control: 'Progress & Quality', cost: 'Cost & Budgeting', time: 'Time & Schedule', prices: 'Price Libraries', reports: 'Report Preferences', management: 'Project Management' };

export function ProjectWorkspace({ initialProject, onClose, onRefresh, renderContent }: {
    initialProject: Project; onClose: () => void; onRefresh?: () => void;
    renderContent: (project: Project, section: string, onSelect: (section: string) => void, openSettings: () => void) => React.ReactNode;
}) {
    const { activeTenant } = useTenantContext(), { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark', text = isDark ? '#FFFFFF' : '#1C1C1E', secondary = isDark ? '#AEAEB2' : '#636366';
    const [project, setProject] = useState(initialProject), [section, setSection] = useState('overview');
    const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
    const [dirty, setDirty] = useState(false), [settingsOpen, setSettingsOpen] = useState(false), [error, setError] = useState('');
    useEffect(() => { setProject(initialProject); }, [initialProject]);
    const proceed = (action: () => void) => {
        if (!dirty) { action(); return; }
        const discard = () => { setDirty(false); action(); };
        if (Platform.OS === 'web') { if (window.confirm('Discard unsaved project settings?')) discard(); }
        else Alert.alert('Unsaved changes', 'Discard unsaved project settings?', [{ text: 'Keep editing', style: 'cancel' }, { text: 'Discard', style: 'destructive', onPress: discard }]);
    };
    const select = (value: string) => { const next = ({ people: 'settings:team', resources: 'planning:wbs', finance: 'planning:rab', progress: 'tracking', setup: 'settings:general' } as Record<string, string>)[value] || value; if (next !== section) proceed(() => { setSection(next); setError(''); }); };
    const refresh = async () => {
        const latest = await getProjectById(project.id);
        if (latest) setProject(latest);
        onRefresh?.();
    };
    const settingsId = section.startsWith('settings:') ? section.split(':')[1] : null;
    const Screen = settingsId ? SETTINGS[settingsId] : null;
    const title = settingsId ? SETTING_NAMES[settingsId] : GROUPS.flatMap(group => group.items).find(item => item.id === section)?.title || 'Tracking';
    return <View style={{ flex: 1, flexDirection: 'row', minHeight: 0, backgroundColor: isDark ? '#000000' : '#F2F2F7' }}>
        <View style={{ ...DESKTOP_LIST_PANE, borderRightWidth: 1, borderRightColor: isDark ? '#242426' : '#E5E5EA' }}>
            <TouchableOpacity onPress={() => proceed(onClose)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, ...DESKTOP_PANEL_HEADER, minHeight: 66 }}><Ionicons name="chevron-back" size={18} color={text} /><Text style={{ color: text, fontSize: 18, fontWeight: '700' }}>Projects</Text></TouchableOpacity>
            <View style={{ height: 230, marginBottom: 12, overflow: 'hidden', justifyContent: 'flex-end', backgroundColor: isDark ? '#0F172A' : '#E6EEFF' }}>
                {project.heroImage ? <Image source={typeof project.heroImage === 'string' ? { uri: project.heroImage } : project.heroImage} resizeMode="cover" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
                    : <View style={{ position: 'absolute', top: 26, left: 0, right: 0, alignItems: 'center' }}><TenantBrandLogo tenant={activeTenant} size={52} isDark={isDark} /></View>}
                <LinearGradient colors={['transparent', isDark ? 'rgba(0,0,0,0.8)' : 'rgba(242,242,247,0.85)', isDark ? '#000000' : '#F2F2F7']} locations={[0, 0.65, 1]} style={{ position: 'absolute', top: 55, bottom: 0, left: 0, right: 0 }} />
                <View style={{ paddingHorizontal: 20, paddingBottom: 16, gap: 6 }}>
                    <Text style={{ color: text, fontSize: 11, fontWeight: '700' }}>{project.number}-{project.code}</Text>
                    <Text style={{ color: text, fontSize: 18, fontWeight: '700', lineHeight: 23 }}>{project.title}</Text>
                    {!!project.location && <Text numberOfLines={1} style={{ color: secondary, fontSize: 12 }}>{project.location}</Text>}
                </View>
            </View>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 30 }}>
                {GROUPS.map((group, index) => <View key={index} style={{ marginBottom: 8 }}>
                    {['PLANNING', 'WORK'].includes(group.title) && <TouchableOpacity onPress={() => setExpandedGroups(current => current.includes(group.title) ? current.filter(value => value !== group.title) : [...current, group.title])}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, minHeight: 44 }}>
                        <Ionicons name={group.title === 'PLANNING' ? 'calendar-outline' : 'checkbox-outline'} size={18} color={secondary} />
                        <Text style={{ color: text, flex: 1, fontSize: 14, fontWeight: '600' }}>{group.title === 'PLANNING' ? 'Planning' : 'Work'}</Text>
                        <Ionicons name={expandedGroups.includes(group.title) ? 'chevron-down' : 'chevron-forward'} size={14} color={secondary} />
                    </TouchableOpacity>}
                    {(!['PLANNING', 'WORK'].includes(group.title) || expandedGroups.includes(group.title)) && group.items.map(item => <TouchableOpacity accessibilityRole="button" accessibilityState={{ selected: section === item.id }} key={item.id} onPress={() => select(item.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 11, borderRadius: 14, marginBottom: 2, marginLeft: ['PLANNING', 'WORK'].includes(group.title) ? 16 : 0, backgroundColor: section === item.id ? (isDark ? '#0A2038' : '#E6EEFF') : 'transparent' }}>
                        <Ionicons name={item.icon as any} size={16} color={section === item.id ? '#007AFF' : secondary} /><Text style={{ color: section === item.id ? '#007AFF' : text, fontSize: 13, fontWeight: section === item.id ? '600' : '500', flex: 1 }}>{item.title}</Text>
                    </TouchableOpacity>)}
                </View>)}
                {settingsOpen && <View><Text style={{ color: secondary, padding: 12, fontSize: 10, fontWeight: '700', letterSpacing: 1 }}>SETTINGS</Text>{Object.entries(SETTING_NAMES).map(([id, name]) => <TouchableOpacity key={id} onPress={() => select(`settings:${id}`)} style={{ padding: 12, borderRadius: 12, backgroundColor: section === `settings:${id}` ? (isDark ? '#102447' : '#E6EEFF') : 'transparent' }}><Text style={{ color: section === `settings:${id}` ? '#007AFF' : text, fontSize: 13 }}>{name}</Text></TouchableOpacity>)}</View>}
            </ScrollView>
        </View>
        <View style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, ...DESKTOP_PANEL_HEADER, minHeight: 66 }}>
                <Text style={{ ...DESKTOP_PANEL_TITLE, color: text, flex: 1 }}>{title}</Text>
                <HeaderToolbar isDark={isDark} textColor={text} maxDirectActions={3} actions={[
                    { id: 'star', icon: project.isPinned ? 'star' : 'star-outline', image: project.isPinned ? 'star.fill' : 'star', onPress: async () => { try { const updated = await updateProjectApi(project.id, { isPinned: !project.isPinned }); if (updated) setProject(updated); onRefresh?.(); } catch (e) { setError((e as any)?.message || 'Unable to save favorite.'); } } },
                    { id: 'share', icon: 'share-outline', image: 'square.and.arrow.up', onPress: async () => { try { await Share.share({ title: project.title, message: `${project.number}-${project.code} · ${project.title}` }); } catch (e) { setError((e as any)?.message || 'Unable to share project.'); } } },
                    { id: 'settings', icon: 'settings-outline', image: 'gearshape', onPress: () => { setSettingsOpen(true); select('settings:general'); } },
                ]} />
            </View>
            {!!error && <Text accessibilityRole="alert" style={{ color: '#FF3B30', padding: 16 }}>{error}</Text>}
            {Screen ? <Screen key={`${project.id}-${section}`} projectId={project.id} isEmbedded onDirtyChange={setDirty} onSaved={refresh} />
                : section.startsWith('planning:') ? <ProjectPlanningPanel key={section} project={project} section={section.split(':')[1] as PlanningSection} isDark={isDark} />
                : renderContent(project, section, select, () => { setSettingsOpen(true); select('settings:general'); })}
        </View>
    </View>;
}
