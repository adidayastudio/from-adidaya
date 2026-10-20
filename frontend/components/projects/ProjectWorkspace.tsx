import {projectWorkspaceLayout} from '@/lib/projectWorkspaceLayout';
import { ProjectFinancePanel } from './ProjectFinancePanel';
import { ProjectModulePanel } from './ProjectModulePanel';
import { readProjectWorkspaceLocation } from '@/lib/projectWorkspaceLocation';
import ContextMenu from '@/components/ui/PlatformContextMenu';
import { ProjectRegisterWorkspace } from './register-v3/ProjectRegisterWorkspace';
import { FocusModeIcon } from '@/components/ui/FocusModeIcon';
import { ProjectFocusNavigation } from './ProjectFocusNavigation';
import { InstantTooltip } from '@/components/ui/InstantTooltip';
import { ProjectSidebarContext } from '@/context/ProjectSidebarContext';
import { PROJECT_LINKED_MODULES } from '@/lib/projectLinkedModules';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { DESKTOP_LIST_PANE, DESKTOP_PANEL_HEADER, DESKTOP_PANEL_TITLE } from '@/constants/desktopLayout';
import React, { useEffect, useState, useContext, useCallback } from 'react';
import { Alert, Image, Platform, ScrollView, Share, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Project, getProjectById, updateProjectApi } from '@/lib/api/projects';
import { TenantBrandLogo } from '@/components/ui/TenantBrandLogo';
import { useTenantContext } from '@/context/TenantContext';
import { useTheme } from '@/context/ThemeContext';
import { HeaderToolbar, HeaderToolbarAction } from '@/components/ui/HeaderToolbar';
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
        { id: 'planning:stages', title: 'Stages', icon: 'layers-outline' },
        { id: 'planning:wbs', title: 'WBS', icon: 'grid-outline' },
        { id: 'planning:volume', title: 'Volume', icon: 'calculator-outline' },
        { id: 'planning:rab', title: 'RAB', icon: 'cash-outline' },
        { id: 'planning:schedule', title: 'Schedule', icon: 'calendar-outline' },
    ] },
    { title: 'WORK', items: [
        { id: 'work', title: 'Tasks & Deliverables', icon: 'checkbox-outline' },
        { id: 'activity', title: 'Activity Log', icon: 'pulse-outline' },
        { id: 'tracking', title: 'WBS Tracking', icon: 'stats-chart-outline' },
        { id: 'planning:reports', title: 'Reports', icon: 'document-text-outline' },
    ] },
    { title: '', items: [
        { id: 'docs', title: 'Documents', icon: 'folder-outline' },
    ] },
];
const SETTING_NAMES: Record<string, string> = { general: 'Project Information', team: 'Team & Access', stages: 'Stages & Deliverables', wbs: 'WBS Preferences', control: 'Progress & Quality', cost: 'Cost & Budgeting', time: 'Time & Schedule', prices: 'Price Libraries', reports: 'Report Preferences', management: 'Project Management' };

export function ProjectWorkspace({ initialProject, onClose, onRefresh, renderContent }: {
    initialProject: Project; onClose: () => void; onRefresh?: () => void;
    renderContent: (project: Project, section: string, onSelect: (section: string) => void, openSettings: () => void, setHeaderAction: (action: HeaderToolbarAction | null) => void, setHeaderTrailing: (content: React.ReactNode) => void) => React.ReactNode;
}) {
    const collapseSidebar = useContext(ProjectSidebarContext);
    const {width:windowWidth}=useWindowDimensions();
    const [editorActive,setEditorActive]=useState(false);
    const [navigationOverride,setNavigationOverride]=useState<boolean|null>(null);
    const {compactProjectNavigation:autoCompact,collapseAppNavigation}=projectWorkspaceLayout(windowWidth,editorActive);
    const compactNavigation=navigationOverride??autoCompact;
    useEffect(()=>{setNavigationOverride(null);},[autoCompact,editorActive]);
    useEffect(()=>{if(collapseAppNavigation)return collapseSidebar();},[collapseAppNavigation,collapseSidebar]);
    useFocusEffect(useCallback(() => collapseSidebar(), [collapseSidebar]));
    const { activeTenant } = useTenantContext(), { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark', text = isDark ? '#FFFFFF' : '#1C1C1E', secondary = isDark ? '#AEAEB2' : '#636366';
    const location=readProjectWorkspaceLocation(useLocalSearchParams<{project?:string;section?:string;focus?:string;register?:string}>());
    const [focusMode, setFocusMode] = useState(location.focus);
    const [project, setProject] = useState(initialProject), [section, setSection] = useState(location.section);
    const [registerVersion, setRegisterVersion] = useState<2 | 3>(location.registerVersion);
    const registerMode = section === 'planning:stages' ? 'planning' : section === 'work' ? 'work' : section === 'docs' ? 'documents' : null;
    const [planningTitleAccessory, setPlanningTitleAccessory] = useState<React.ReactNode>(null);
    const [planningToolbar, setPlanningToolbar] = useState<React.ReactNode>(null);
    const [headerTrailing, setHeaderTrailing] = useState<React.ReactNode>(null);
    const [headerAction, setHeaderAction] = useState<HeaderToolbarAction | null>(null);
    const [expandedGroups, setExpandedGroups] = useState<string[]>(['PLANNING', 'WORK']);
    const [dirty, setDirty] = useState(false), [settingsOpen, setSettingsOpen] = useState(false), [error, setError] = useState('');
    useEffect(() => { setProject(initialProject); }, [initialProject]);
    const proceed = useCallback((action: () => void) => {
        if (!dirty) { action(); return; }
        const discard = () => { setDirty(false); action(); };
        if (Platform.OS === 'web') { if (window.confirm('Discard unsaved project settings?')) discard(); }
        else Alert.alert('Unsaved changes', 'Discard unsaved project settings?', [{ text: 'Keep editing', style: 'cancel' }, { text: 'Discard', style: 'destructive', onPress: discard }]);
    }, [dirty]);
    const select = useCallback((value: string) => { const next = ({ people: 'settings:team', resources: 'planning:wbs', finance: 'planning:rab', progress: 'tracking', setup: 'settings:general' } as Record<string, string>)[value] || value; if (next !== section) proceed(() => { setSection(next); router.setParams({section:next}); setError(''); setPlanningTitleAccessory(null); setHeaderTrailing(null); }); }, [section, proceed]);
    const refresh = async () => {
        const latest = await getProjectById(project.id);
        if (latest) setProject(latest);
        onRefresh?.();
    };
    const settingsId = section.startsWith('settings:') ? section.split(':')[1] : null;
    const Screen = settingsId ? SETTINGS[settingsId] : null;
    const linkedModule=PROJECT_LINKED_MODULES.find(module=>module.section===section);
    const title = linkedModule?.title || (settingsId ? SETTING_NAMES[settingsId] : GROUPS.flatMap(group => group.items).find(item => item.id === section)?.title || 'Tracking');
    const projectActions: HeaderToolbarAction[] = [
                    { id: 'star', icon: project.isPinned ? 'star' : 'star-outline', image: project.isPinned ? 'star.fill' : 'star', onPress: async () => { try { const updated = await updateProjectApi(project.id, { isPinned: !project.isPinned }); if (updated) setProject(updated); onRefresh?.(); } catch (e) { setError((e as any)?.message || 'Unable to save favorite.'); } } },
                    { id: 'share', icon: 'share-outline', image: 'square.and.arrow.up', onPress: async () => { try { await Share.share({ title: project.title, message: `${project.number}-${project.code} · ${project.title}` }); } catch (e) { setError((e as any)?.message || 'Unable to share project.'); } } },
                    { id: 'settings', icon: 'settings-outline', image: 'gearshape', onPress: () => { setSettingsOpen(true); select('settings:general'); } },
                ];
    const focusToggle = (labelled = false) => <InstantTooltip label={focusMode ? 'Exit Focus' : 'Focus Mode'}><TouchableOpacity accessibilityLabel={focusMode ? 'Exit Focus' : 'Focus Mode'} accessibilityState={{ selected: focusMode }} onPress={() => { const next=!focusMode;setFocusMode(next);router.setParams({focus:next?'1':'0'}); }} style={{ height: 34, minWidth: 34, paddingHorizontal: labelled ? 12 : 0, borderRadius: 999, flexDirection: 'row', gap: 7, backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}><FocusModeIcon active={focusMode} size={17} color={focusMode ? '#007AFF' : text} />{labelled && <Text style={{ color: focusMode ? '#007AFF' : text, fontSize: 12, fontWeight: '600' }}>{focusMode ? 'Exit Focus' : 'Focus Mode'}</Text>}</TouchableOpacity></InstantTooltip>;
    return <View style={{ flex: 1, flexDirection: 'row', minHeight: 0, backgroundColor: isDark ? '#000000' : '#F2F2F7' }}>
        {!focusMode&&compactNavigation&&<View style={{width:64,borderRightWidth:1,borderColor:isDark?'#242426':'#E5E5EA',paddingTop:16,alignItems:'center',gap:8}}><TouchableOpacity accessibilityLabel="Expand project navigation" onPress={()=>setNavigationOverride(false)} style={{padding:12}}><Feather name="sidebar" size={20} color={text}/></TouchableOpacity><TouchableOpacity accessibilityLabel="Back to projects" onPress={()=>proceed(onClose)} style={{padding:12}}><Ionicons name="chevron-back" size={20} color={text}/></TouchableOpacity><ScrollView>{[...GROUPS.flatMap(group=>group.items),...PROJECT_LINKED_MODULES.map(module=>({id:module.section,title:module.title,icon:module.icon}))].map(item=><InstantTooltip key={item.id} label={item.title}><TouchableOpacity accessibilityLabel={item.title} accessibilityState={{selected:section===item.id}} onPress={()=>select(item.id)} style={{padding:13,marginVertical:2,borderRadius:14,backgroundColor:section===item.id?(isDark?'#0A2038':'#E6EEFF'):'transparent'}}><Ionicons name={item.icon as any} size={19} color={section===item.id?'#007AFF':secondary}/></TouchableOpacity></InstantTooltip>)}</ScrollView></View>}
        {!focusMode && !compactNavigation && <View style={{ ...DESKTOP_LIST_PANE, borderRightWidth: 1, borderRightColor: isDark ? '#242426' : '#E5E5EA' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, ...DESKTOP_PANEL_HEADER, minHeight: 66 }}>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Back to projects" onPress={() => proceed(onClose)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }}>
                    <Ionicons name="chevron-back" size={17} color={text} /><Text style={{ color: text, fontSize: 16, fontWeight: '700' }}>Projects</Text>
                </TouchableOpacity>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><HeaderToolbar isDark={isDark} textColor={text} maxDirectActions={3} actions={projectActions} />{focusToggle(focusMode)}</View>
            </View>
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
                <View style={{ marginTop: 8, marginBottom: 12 }}>
                    <Text style={{ color: secondary, paddingHorizontal: 12, paddingVertical: 10, fontSize: 10, fontWeight: '700', letterSpacing: 1 }}>MODULES</Text>
                    {PROJECT_LINKED_MODULES.map(module => <TouchableOpacity key={module.id} accessibilityRole="button" accessibilityLabel={`Open ${module.title}`} onPress={() => select(module.section)} accessibilityState={{selected:section===module.section}} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 11, borderRadius: 14, marginBottom: 2, backgroundColor:section===module.section?(isDark?'#1C1C1E':'#E8E8ED'):'transparent' }}>
                        <Ionicons name={module.icon} size={16} color={module.color} />
                        <Text style={{ color: text, flex: 1, fontSize: 13, fontWeight: '500' }}>{module.title}</Text>
                    </TouchableOpacity>)}
                </View>
                {settingsOpen && <View><Text style={{ color: secondary, padding: 12, fontSize: 10, fontWeight: '700', letterSpacing: 1 }}>SETTINGS</Text>{Object.entries(SETTING_NAMES).map(([id, name]) => <TouchableOpacity key={id} onPress={() => select(`settings:${id}`)} style={{ padding: 12, borderRadius: 12, backgroundColor: section === `settings:${id}` ? (isDark ? '#102447' : '#E6EEFF') : 'transparent' }}><Text style={{ color: section === `settings:${id}` ? '#007AFF' : text, fontSize: 13 }}>{name}</Text></TouchableOpacity>)}</View>}
            </ScrollView>
        </View>}
        <View key="project-content" style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
            {focusMode ? (
                <View style={{ paddingHorizontal: 20, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52 }}>
                    <InstantTooltip label="Back to projects">
                        <TouchableOpacity accessibilityLabel="Back to projects" onPress={() => proceed(onClose)} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
                            <Ionicons name="chevron-back" size={18} color={text} />
                        </TouchableOpacity>
                    </InstantTooltip>
                    <Text numberOfLines={1} style={{ color: text, fontSize: 13, fontWeight: '700', flexShrink: 1, maxWidth: 220 }}>
                        {project.number}-{project.code} · {project.title}
                    </Text>
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', minWidth: 0 }}>
                        <ProjectFocusNavigation compact section={section} isDark={isDark} onSelect={select} />
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <HeaderToolbar isDark={isDark} textColor={text} maxDirectActions={3} actions={projectActions} />
                        {focusToggle(focusMode)}
                    </View>
                </View>
            ) : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, ...DESKTOP_PANEL_HEADER, minHeight: 66 }}>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', flexWrap: 'nowrap', gap: 10, minWidth: 0, overflow: 'hidden' }}>
                    {!focusMode&&!compactNavigation&&<TouchableOpacity accessibilityLabel="Minimize project navigation" onPress={()=>setNavigationOverride(true)} style={{padding:6}}><Feather name="sidebar" size={18} color={secondary}/></TouchableOpacity>}<Text style={{ ...DESKTOP_PANEL_TITLE, color: text, flexShrink: 0 }}>{title}</Text>
                    {!!registerMode && <ContextMenu title="Workspace version" dropdownMenuMode actions={[{ title: 'Version 3.0', selected: registerVersion === 3 }, { title: 'Legacy 2.0', selected: registerVersion === 2 }]} onPress={event => { const nextVersion = event.nativeEvent.index === 0 ? 3 : 2; if (nextVersion === registerVersion) return; proceed(() => { setRegisterVersion(nextVersion); router.setParams({register:String(nextVersion)}); setPlanningTitleAccessory(null); setHeaderTrailing(null); setHeaderAction(null); }); }}><View style={{ paddingHorizontal: 12, height: 34, justifyContent: 'center', borderRadius: 999, backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', flexDirection: 'row', alignItems: 'center', gap: 6 }}><Text style={{ color: registerVersion === 3 ? '#007AFF' : secondary, fontSize: 12, fontWeight: '600' }}>{registerVersion === 3 ? 'Version 3.0' : 'Legacy 2.0'}</Text><Ionicons name="chevron-down" size={12} color={secondary}/></View></ContextMenu>}
                    {planningTitleAccessory}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    {headerTrailing}
                    {!focusMode && focusToggle(false)}
                    {headerAction && <HeaderToolbar isDark={isDark} textColor={text} actions={[headerAction]} />}
                </View>
            </View>
            {!!error && <Text accessibilityRole="alert" style={{ color: '#FF3B30', padding: 16 }}>{error}</Text>}
            {linkedModule?.id==='finance' ? <ProjectFinancePanel key={`${project.id}-finance`} projectId={project.id} isDark={isDark} onHeaderTrailingChange={setHeaderTrailing}/> : linkedModule ? <ProjectModulePanel key={`${project.id}-${linkedModule.id}`} projectId={project.id} module={linkedModule.id} isDark={isDark} onHeaderTrailingChange={setHeaderTrailing}/> : registerMode && registerVersion === 3 ? <ProjectRegisterWorkspace projectInfo={project} projectId={project.id} mode={registerMode} isDark={isDark} onTitleAccessoryChange={setPlanningTitleAccessory} onHeaderTrailingChange={setHeaderTrailing} onDirtyChange={setDirty} onEditorActiveChange={setEditorActive} onNavigate={select} /> : Screen ? <Screen key={`${project.id}-${section}`} projectId={project.id} isEmbedded onDirtyChange={setDirty} onSaved={refresh} />
                : section.startsWith('planning:') ? <ProjectPlanningPanel onHeaderTrailingChange={setHeaderTrailing} onTitleAccessoryChange={setPlanningTitleAccessory} onNavigatePlanning={value => select(`planning:${value}`)} onToolbarChange={setPlanningToolbar} key={section} project={project} section={section.split(':')[1] as PlanningSection} isDark={isDark} onDirtyChange={setDirty} />
                : renderContent(project, section, select, () => { setSettingsOpen(true); select('settings:general'); }, setHeaderAction, setHeaderTrailing)}
        </View>
    </View>;
}
