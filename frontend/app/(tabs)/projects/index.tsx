import { DESKTOP_LIST_PANE, DESKTOP_PANEL_HEADER, DESKTOP_PANEL_TITLE_ROW, DESKTOP_PANEL_TITLE, DESKTOP_PANEL_ACTION } from '@/constants/desktopLayout';
import { HeaderBlurBackground } from '@/components/ui/HeaderBlurBackground';
import { getProjects, Project, updateProjectApi } from '@/lib/api/projects';
import { GlassView } from '@/components/ui/GlassView';
import { UnifiedSearchBar } from '@/components/ui/UnifiedSearchBar';
import { SwiftUIAddProjectSheet } from '@/components/projects/SwiftUIAddProjectSheet';
import { HeaderToolbar, HeaderToolbarAction } from '@/components/ui/HeaderToolbar';
import { ProgressRing, getProgressColor } from '@/components/ui/ProgressRing';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useSearch } from '@/context/SearchContext';
import { useTheme } from '@/context/ThemeContext';
import { useUserContext } from '@/context/UserProvider';
import { useTenantContext } from '@/context/TenantContext';
import { UnauthenticatedView } from '@/components/ui/UnauthenticatedView';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, router, usePathname, useFocusEffect } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View, Platform, TextInput, Alert, ActionSheetIOS, Modal, StatusBar as RNStatusBar, useWindowDimensions, Share } from 'react-native';
import Animated, { FadeIn, FadeInLeft, FadeInRight, FadeOut, FadeInUp, Layout, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { FormaLogo } from '@/components/ui/FormaLogo';
import { TenantBrandLogo, isAdidayaTenant } from '@/components/ui/TenantBrandLogo';
import { FormaBlue } from '@/constants/theme';
import { WebFinderHeader } from '@/components/ui/WebFinderHeader';
import { getProjectNumberingSettings, ProjectNumberingSettings, formatProjectBadge, ProjectSetupGroup, ProjectSetupModule, PROJECT_SETUP_MENU_ITEMS, PROJECT_GROUP_TITLES } from '@/lib/api/projectSetup';
import { ProjectDetailContent } from '@/app/project-details/[id]';
import { ProjectWorkspaceInspector } from '@/components/projects/ProjectWorkspaceInspector';
import { ProjectSetupDetailPane } from '@/components/projects/setup/ProjectSetupDetailPane';
import ProjectSetupGeneralScreen from '@/app/project-setup/[id]/general';
import ProjectSetupTeamScreen from '@/app/project-setup/[id]/team';
import ProjectSetupStagesScreen from '@/app/project-setup/[id]/stages';
import ProjectSetupWorkStructureScreen from '@/app/project-setup/[id]/work-structure';
import ProjectSetupControlScreen from '@/app/project-setup/[id]/control';
import ProjectSetupCostSystemScreen from '@/app/project-setup/[id]/cost-system';
import ProjectSetupTimeSystemScreen from '@/app/project-setup/[id]/time-system';
import ProjectSetupPriceLibraryScreen from '@/app/project-setup/[id]/price-library';
import ProjectSetupReportsScreen from '@/app/project-setup/[id]/reports';
import ProjectSetupManagementScreen from '@/app/project-setup/[id]/management';

export const PER_PROJECT_SETUP_MENU_ITEMS = [
    { id: 'general', title: 'General', subtitle: 'Project identity, type, timeline & tracking', icon: 'slider.horizontal.3', color: '#64748B', gradientColors: ['#64748B', '#475569'] },
    { id: 'team', title: 'Team & Access', subtitle: 'Project members and role assignments', icon: 'person.2.fill', color: '#F59E0B', gradientColors: ['#F59E0B', '#D97706'] },
    { id: 'stages', title: 'Stages & Deliverables', subtitle: 'Workflow sequence & task checklists', icon: 'git-branch-outline', color: '#FF3B30', gradientColors: ['#FF3B30', '#E02D22'] },
    { id: 'work-structure', title: 'Work Breakdown Structure', subtitle: 'WBS hierarchies & trade disciplines', icon: 'grid-outline', color: '#5856D6', gradientColors: ['#5856D6', '#4745B8'] },
    { id: 'control', title: 'Progress & Quality Control', subtitle: 'Approvals, sign-offs & audit verification', icon: 'shield.checkmark', color: '#AF52DE', gradientColors: ['#AF52DE', '#9333EA'] },
    { id: 'cost-system', title: 'Cost & Budgeting', subtitle: 'Budget rules, AHSP & cost depth', icon: 'banknote', color: '#34C759', gradientColors: ['#34C759', '#248A3D'] },
    { id: 'time-system', title: 'Time & Schedule', subtitle: 'Scheduling rules & critical path', icon: 'clock', color: '#007AFF', gradientColors: ['#007AFF', '#0056B3'] },
    { id: 'price-library', title: 'Price Library & Rates', subtitle: 'Regional unit rates & material catalogs', icon: 'book.closed', color: '#FF9500', gradientColors: ['#FF9500', '#D97706'] },
    { id: 'reports', title: 'Reports & Analytics', subtitle: 'Reporting templates & executive presets', icon: 'chart.bar.doc.horizontal', color: '#FF2D55', gradientColors: ['#FF2D55', '#D61F43'] },
    { id: 'management', title: 'Project Management', subtitle: 'Project lifecycle, archive & danger zone', icon: 'archivebox', color: '#64748B', gradientColors: ['#64748B', '#334155'] },
];

const PROJECT_WORKSPACE_NAV_ITEMS = [
    { id: 'overview', title: 'Overview', subtitle: 'Summary & key health', icon: 'doc.text.fill', color: '#007AFF', gradientColors: ['#007AFF', '#0A84FF'] },
    { id: 'work', title: 'Work & Tracking', subtitle: 'Milestones, tasks, actions', icon: 'checklist', color: '#34C759', gradientColors: ['#34C759', '#30D158'] },
    { id: 'activity', title: 'Activity Feed', subtitle: 'Team updates & logs', icon: 'bolt.horizontal.fill', color: '#FF9500', gradientColors: ['#FF9500', '#FFCC00'] },
    { id: 'docs', title: 'Documents', subtitle: 'Blueprints, files & folders', icon: 'folder.fill', color: '#AF52DE', gradientColors: ['#AF52DE', '#BF5AF2'] },
    { id: 'setup', title: 'Project Setup', subtitle: 'Settings & team roles', icon: 'gearshape.fill', color: '#8E8E93', gradientColors: ['#8E8E93', '#636366'] },
];

// Helper to get adaptive text color based on background luminance
const getAdaptiveTextColor = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#1C1C1E' : '#FFFFFF';
};

const BouncyTouchable = ({ children, onPress, style }: { children: React.ReactNode, onPress?: () => void, style?: any }) => {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }]
    }));

    const onPressIn = () => {
        scale.value = withSpring(1.03, { damping: 30, stiffness: 400 });
    };

    const onPressOut = () => {
        scale.value = withSpring(1, { damping: 30, stiffness: 400 });
    };

    return (
        <Pressable
            onPress={onPress}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            style={style}
        >
            <Animated.View style={[animatedStyle, { flex: 1 }]}>
                {children}
            </Animated.View>
        </Pressable>
    );
};

export default function ProjectScreen() {
    const { width } = useWindowDimensions();
    const isDesktopWeb = Platform.OS === 'web' && width >= 768;
    const { isAuthenticated } = useUserContext();
    const { activeWorkspace, activeTenant } = useTenantContext();
    const insets = useSafeAreaInsets();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const [isArchivedExpanded, setIsArchivedExpanded] = useState(false);
    const { searchQuery, setSearchQuery, setIsSearchVisible, isSearchVisible, setContextAction } = useSearch();
    const [isAddProjectVisible, setIsAddProjectVisible] = useState(false);
    const [activeSegment, setActiveSegment] = useState<string>('all');
    const [showInlineSearch, setShowInlineSearch] = useState(false);
    const [isSetupMode, setIsSetupMode] = useState(false);
    const [activeSetupModule, setActiveSetupModule] = useState<ProjectSetupModule>('general_settings');
    const setupGroups: ProjectSetupGroup[] = ['general', 'configuration', 'access', 'system'];
    const isFocused = useIsFocused();
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [focusedProject, setFocusedProject] = useState<Project | null>(null);
    const [activeProjectTab, setActiveProjectTab] = useState<string>('overview');
    const [projectDetailSetup, setProjectDetailSetup] = useState<string | null>(null);
    const [numberingSettings, setNumberingSettings] = useState<ProjectNumberingSettings | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const hasProjects = projects.length > 0;

    useEffect(() => {
        if (focusedProject) {
            const updated = projects.find(p => p.id === focusedProject.id);
            if (updated) setFocusedProject(updated);
        }
        if (selectedProject) {
            const updated = projects.find(p => p.id === selectedProject.id);
            if (updated) setSelectedProject(updated);
        } else if (isDesktopWeb && !focusedProject && projects.length > 0) {
            setSelectedProject(projects[0]);
        }
    }, [projects, isDesktopWeb]);

    const tenantLogoUrl = activeTenant?.branding_logo_url || activeTenant?.logo_url;
    const primaryColor = activeTenant?.primary_color || '#007AFF';
    const tenantInitial = (activeTenant?.branding_name || activeTenant?.name || 'T').charAt(0).toUpperCase();

    const isAdidaya = isAdidayaTenant(activeTenant);
    const visibleSetupMenuItems = useMemo(() => {
        if (isAdidaya) {
            return PER_PROJECT_SETUP_MENU_ITEMS;
        }
        return PER_PROJECT_SETUP_MENU_ITEMS.filter(
            item => item.id === 'general' || item.id === 'team' || item.id === 'management'
        );
    }, [isAdidaya]);

    React.useEffect(() => {
        if (!isFocused) return;

        if (isAuthenticated) {
            const contextOptions = hasProjects
                ? [
                    {
                        label: 'Add New Project',
                        icon: 'folder-outline' as any,
                        sfIcon: 'folder',
                        description: 'Create a new project',
                        action: () => setIsAddProjectVisible(true),
                    },
                    {
                        label: 'Add Activity',
                        icon: 'pulse-outline' as any,
                        sfIcon: 'activity',
                        description: 'Log a new project activity',
                        action: () => Alert.alert('Add Activity', 'Log a new activity request'),
                    },
                    {
                        label: 'Add Tracking',
                        icon: 'locate-outline' as any,
                        sfIcon: 'location.viewfinder',
                        description: 'Add tracking updates',
                        action: () => Alert.alert('Add Tracking', 'Start tracking coordinates'),
                    },
                    {
                        label: 'Upload Document',
                        icon: 'cloud-upload-outline' as any,
                        sfIcon: 'arrow.up.doc',
                        description: 'Upload project documents',
                        action: () => Alert.alert('Upload Document', 'Select a document to upload'),
                    },
                ]
                : [
                    {
                        label: 'Add New Project',
                        icon: 'folder-outline' as any,
                        sfIcon: 'folder',
                        description: 'Create a new project',
                        action: () => setIsAddProjectVisible(true),
                    },
                ];

            setContextAction({
                label: 'Add Project',
                icon: 'add-outline',
                sfIcon: 'plus',
                action: () => setIsAddProjectVisible(true),
                options: contextOptions,
            });
        } else {
            setContextAction(null);
        }
    }, [isFocused, isAuthenticated, hasProjects, setContextAction]);

    const loadProjects = useCallback(async (showLoading = true) => {
        if (!isAuthenticated) {
            setProjects([]);
            return;
        }
        if (showLoading) setIsLoading(true);
        const targetTenantOrWs = isAdidaya ? 'adidaya-primary-tenant' : (activeTenant?.id || activeWorkspace?.id);
        const [data, settings] = await Promise.all([
            getProjects(targetTenantOrWs),
            getProjectNumberingSettings(),
        ]);
        setProjects(data);
        setNumberingSettings(settings);
        if (showLoading) setIsLoading(false);
    }, [isAuthenticated, isAdidaya, activeTenant?.id, activeWorkspace?.id]);

    useEffect(() => {
        if (isAuthenticated) {
            loadProjects(true);
        } else {
            setProjects([]);
        }
    }, [isAuthenticated, activeWorkspace?.id, loadProjects]);

    useFocusEffect(
        useCallback(() => {
            if (isAuthenticated) {
                loadProjects(false);
            }
        }, [isAuthenticated, loadProjects])
    );

    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6e6e73';
    const dividerColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';

    const actions: HeaderToolbarAction[] = [
        {
            id: 'search',
            icon: 'search',
            image: 'magnifyingglass',
            tintColor: isSearchVisible ? FormaBlue[700] : textColor,
            onPress: () => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setIsSearchVisible((prev) => {
                    if (prev) setSearchQuery('');
                    return !prev;
                });
            },
        },
        {
            id: 'settings',
            icon: 'settings-outline',
            image: 'gearshape',
            tintColor: textColor,
            onPress: () => router.push('/project-settings'),
        },
        {
            id: 'add',
            icon: 'add',
            image: 'plus',
            tintColor: FormaBlue[700],
            onPress: () => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setIsAddProjectVisible(true);
            },
        },
    ];

    const sortedProjects = [...projects].sort((a, b) => {
        // 1. Pinned first
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;

        // 2. Assigned to me second
        if (a.isAssignedToMe && !b.isAssignedToMe) return -1;
        if (!a.isAssignedToMe && b.isAssignedToMe) return 1;

        // 3. Last activity third
        return new Date(b.lastActivityAt || 0).getTime() - new Date(a.lastActivityAt || 0).getTime();
    });

    const counts = useMemo(() => {
        const all = projects.filter(p => !p.isArchived).length;
        const my = projects.filter(p => p.isAssignedToMe && !p.isArchived).length;
        const onTrack = projects.filter(p => p.progress >= 70 && p.progress < 100 && !p.isArchived).length;
        const risky = projects.filter(p => p.progress < 30 && !p.isArchived).length;
        const completed = projects.filter(p => p.progress === 100 && !p.isArchived).length;
        const archived = projects.filter(p => p.isArchived).length;
        return { all, my, onTrack, risky, completed, archived };
    }, [projects]);

    const projectSegments = useMemo(() => [
        { id: 'all', label: `All (${counts.all})` },
        { id: 'my', label: `My (${counts.my})` },
        { id: 'on_track', label: `On Track (${counts.onTrack})` },
        { id: 'risky', label: `Risky (${counts.risky})` },
        { id: 'completed', label: `Done (${counts.completed})` },
        { id: 'archived', label: `Archived (${counts.archived})` },
    ], [counts]);

    const filteredProjects = React.useMemo(() => {
        let list = sortedProjects;
        if (activeSegment === 'my') {
            list = list.filter(p => p.isAssignedToMe && !p.isArchived);
        } else if (activeSegment === 'on_track') {
            list = list.filter(p => p.progress >= 70 && p.progress < 100 && !p.isArchived);
        } else if (activeSegment === 'risky') {
            list = list.filter(p => p.progress < 30 && !p.isArchived);
        } else if (activeSegment === 'completed') {
            list = list.filter(p => p.progress === 100 && !p.isArchived);
        } else if (activeSegment === 'archived') {
            list = list.filter(p => p.isArchived);
        } else {
            list = list.filter(p => !p.isArchived);
        }

        if (!searchQuery.trim()) return list;
        const q = searchQuery.toLowerCase();
        return list.filter(p =>
            p.title.toLowerCase().includes(q) ||
            p.code.toLowerCase().includes(q) ||
            (p.location && p.location.toLowerCase().includes(q))
        );
    }, [searchQuery, sortedProjects, activeSegment]);

    const focusProjects = filteredProjects.filter(p => !p.isArchived).slice(0, 5);
    // --- ACTIVE PROJECTS RADAR LOGIC ---
    const activeProjects = filteredProjects
        .filter(p => !p.isArchived)
        .sort((a, b) => {
            // 1. Assigned to Me
            if (a.isAssignedToMe && !b.isAssignedToMe) return -1;
            if (!a.isAssignedToMe && b.isAssignedToMe) return 1;

            // 2. Recency (Last activity)
            const dateA = new Date(a.lastActivityAt || 0).getTime();
            const dateB = new Date(b.lastActivityAt || 0).getTime();
            if (dateA !== dateB) return dateB - dateA;

            // 3. Risky / Low Progress (< 30%)
            const isRiskyA = a.progress < 30;
            const isRiskyB = b.progress < 30;
            if (isRiskyA && !isRiskyB) return -1;
            if (!isRiskyA && isRiskyB) return 1;

            return 0;
        })
        .slice(0, 10); // Radar limit
    const archivedProjects = filteredProjects.filter(p => p.isArchived);

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: Platform.OS !== 'web',
                    title: 'Projects',
                    headerLargeTitle: Platform.OS === 'ios',
                    headerTransparent: Platform.OS === 'ios',
                    headerTintColor: textColor,
                    headerShadowVisible: false,
                    headerStyle: Platform.OS === 'ios'
                        ? { backgroundColor: 'transparent' }
                        : { backgroundColor: isDark ? '#000000' : '#F2F2F7' },
                    headerLargeStyle: Platform.OS === 'ios'
                        ? { backgroundColor: 'transparent' }
                        : { backgroundColor: isDark ? '#000000' : '#F2F2F7' },
                    headerLargeTitleStyle: { fontSize: 26, color: textColor },
                    headerRight: () => isAuthenticated ? (
                        <HeaderToolbar actions={actions} isDark={isDark} textColor={textColor} maxDirectActions={4} />
                    ) : null,
                }}
            />

            {Platform.OS === 'web' && !isDesktopWeb && (
                <WebFinderHeader
                    title="Projects"
                    actions={isAuthenticated ? actions : undefined}
                />
            )}

            {/* Main Content Area */}
            {isDesktopWeb ? (
                <View style={styles.splitRoot}>
                    {/* Left Pane: Projects List / Setup Menu (flex: 1) OR Main Work Feed in Workspace Mode (flex: 2) */}
                    <Animated.View
                        layout={Layout.springify().damping(28).stiffness(280)}
                        style={[
                            styles.splitLeftPane,
                            {
                                flex: (focusedProject && activeProjectTab !== 'setup' && !projectDetailSetup) ? 2 : 1,
                                borderRightColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                                ...(Platform.OS === 'web' ? ({ transition: 'flex 0.32s cubic-bezier(0.16, 1, 0.3, 1)' } as any) : {}),
                            }
                        ]}
                    >
                        {(focusedProject && activeProjectTab !== 'setup' && !projectDetailSetup) ? (
                            <Animated.View
                                key={`workspace-main-${focusedProject.id}`}
                                entering={FadeInLeft.duration(240)}
                                style={{ flex: 1 }}
                            >
                                <ProjectDetailContent
                                    projectId={focusedProject.id}
                                    isEmbedded={true}
                                    activeTabProp={activeProjectTab}
                                    onTabChange={setActiveProjectTab}
                                    isFocusedWorkspace={true}
                                    isPreviewMode={false}
                                    onClose={() => {
                                        setFocusedProject(null);
                                        setActiveProjectTab('overview');
                                    }}
                                    onOpenSetupModule={(moduleId) => {
                                        setProjectDetailSetup(moduleId);
                                    }}
                                />
                            </Animated.View>
                        ) : (focusedProject && projectDetailSetup) ? (
                            <Animated.View
                                key={`project-detail-setup-menu-${focusedProject.id}`}
                                entering={FadeInLeft.duration(240)}
                                style={{ flex: 1 }}
                            >
                                {/* Per-Project Setup Header */}
                                <View style={styles.splitListHeader}>
                                    <View style={styles.splitListHeaderTitleRow}>
                                        <Text style={[styles.splitListHeaderTitle, { color: textColor }]}>
                                            Project Settings
                                        </Text>
                                    </View>
                                    <View style={{ marginTop: 12 }}>
                                        <TouchableOpacity
                                            onPress={() => {
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                setProjectDetailSetup(null);
                                            }}
                                            style={[
                                                styles.backToProjectsBubble,
                                                { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                                            ]}
                                            activeOpacity={Platform.OS === 'web' ? 1 : 0.7}
                                        >
                                            <PlatformIcon name="chevron.left" size={14} tintColor={textColor} />
                                            <Text style={[styles.backToProjectsBubbleText, { color: textColor }]}>
                                                Back to {focusedProject.title || 'Project'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* Per-Project Setup Menu */}
                                <ScrollView
                                    style={styles.splitListScroll}
                                    contentContainerStyle={{ padding: 12, paddingBottom: 60 }}
                                    showsVerticalScrollIndicator={true}
                                >
                                    {visibleSetupMenuItems.map((item) => {
                                        const isSelected = projectDetailSetup === item.id || 
                                            (projectDetailSetup === 'general_settings' && item.id === 'general') ||
                                            (projectDetailSetup === 'team_members' && item.id === 'team');
                                        return (
                                            <TouchableOpacity
                                                key={item.id}
                                                style={[
                                                    styles.compactMenuCard,
                                                    {
                                                        backgroundColor: isSelected
                                                            ? (isDark ? 'rgba(10, 132, 255, 0.22)' : FormaBlue[100])
                                                            : (isDark ? '#1C1C1E' : '#FFFFFF'),
                                                        borderWidth: 1,
                                                        borderColor: isSelected
                                                            ? (isDark ? 'rgba(10, 132, 255, 0.4)' : FormaBlue[400])
                                                            : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'),
                                                        marginBottom: 6,
                                                    },
                                                ]}
                                                onPress={() => {
                                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                    setProjectDetailSetup(item.id);
                                                }}
                                                activeOpacity={0.7}
                                            >
                                                <LinearGradient
                                                    colors={isDark ? ['#1C1C1E', '#000000'] : item.gradientColors}
                                                    style={styles.compactRoundIconBox}
                                                    start={{ x: 0, y: 0 }}
                                                    end={{ x: 1, y: 1 }}
                                                >
                                                    <PlatformIcon
                                                        name={item.icon as any}
                                                        size={16}
                                                        tintColor={isDark ? item.color : '#FFF'}
                                                    />
                                                </LinearGradient>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={[styles.compactMenuTitle, { color: textColor }]}>
                                                        {item.title}
                                                    </Text>
                                                    <Text
                                                        style={[styles.compactMenuSubtitle, { color: subtextColor }]}
                                                        numberOfLines={1}
                                                    >
                                                        {item.subtitle}
                                                    </Text>
                                                </View>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            </Animated.View>
                        ) : (isSetupMode || (focusedProject && activeProjectTab === 'setup')) ? (
                            <Animated.View key="setup-menu-left" entering={FadeInLeft.duration(240)} style={{ flex: 1 }}>
                                {/* Setup Header: Projects Setup Title + Back to Projects Bubble */}
                                <View style={styles.splitListHeader}>
                                    <View style={styles.splitListHeaderTitleRow}>
                                        <Text style={[styles.splitListHeaderTitle, { color: textColor }]}>
                                            {focusedProject ? 'Project Setup' : 'Projects Setup'}
                                        </Text>
                                    </View>

                                    <View style={{ marginTop: 10 }}>
                                        <TouchableOpacity
                                            onPress={() => {
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                if (focusedProject) {
                                                    setActiveProjectTab('overview');
                                                } else {
                                                    setIsSetupMode(false);
                                                }
                                            }}
                                            style={[
                                                styles.backToProjectsBubble,
                                                {
                                                    backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                                                },
                                            ]}
                                            activeOpacity={0.7}
                                        >
                                            <PlatformIcon name="chevron.left" size={14} tintColor={textColor} />
                                            <Text style={[styles.backToProjectsBubbleText, { color: textColor }]}>
                                                {focusedProject ? `Back to ${focusedProject.title || 'Project'}` : 'Back to Projects'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* Setup Menu ScrollView */}
                                <ScrollView
                                    style={styles.splitListScroll}
                                    contentContainerStyle={{ padding: 12, paddingBottom: 60 }}
                                    showsVerticalScrollIndicator={true}
                                >
                                    {setupGroups.map((grp) => {
                                        const items = PROJECT_SETUP_MENU_ITEMS.filter((item) => item.group === grp);
                                        if (items.length === 0) return null;
                                        const title = PROJECT_GROUP_TITLES[grp];

                                        return (
                                            <View key={grp} style={{ marginBottom: 16 }}>
                                                {!!title && (
                                                    <Text style={[styles.menuSectionHeader, { color: subtextColor }]}>
                                                        {title}
                                                    </Text>
                                                )}
                                                <View style={{ gap: 6, marginTop: 6 }}>
                                                    {items.map((item) => {
                                                        const isSelected = activeSetupModule === item.id;
                                                        return (
                                                            <TouchableOpacity
                                                                key={item.id}
                                                                style={[
                                                                    styles.compactMenuCard,
                                                                    {
                                                                        backgroundColor: isSelected
                                                                            ? (isDark ? 'rgba(10, 132, 255, 0.22)' : FormaBlue[100])
                                                                            : (isDark ? '#1C1C1E' : '#FFFFFF'),
                                                                        borderWidth: 1,
                                                                        borderColor: isSelected
                                                                            ? (isDark ? 'rgba(10, 132, 255, 0.4)' : FormaBlue[400])
                                                                            : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'),
                                                                    },
                                                                ]}
                                                                onPress={() => {
                                                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                                    setActiveSetupModule(item.id);
                                                                }}
                                                                activeOpacity={0.7}
                                                            >
                                                                <LinearGradient
                                                                    colors={isDark ? ['#1C1C1E', '#000000'] : item.gradientColors}
                                                                    style={styles.compactRoundIconBox}
                                                                    start={{ x: 0, y: 0 }}
                                                                    end={{ x: 1, y: 1 }}
                                                                >
                                                                    <PlatformIcon
                                                                        name={item.icon as any}
                                                                        size={16}
                                                                        tintColor={isDark ? item.color : '#FFF'}
                                                                    />
                                                                </LinearGradient>
                                                                <View style={{ flex: 1 }}>
                                                                    <Text style={[styles.compactMenuTitle, { color: textColor }]}>
                                                                        {item.title}
                                                                    </Text>
                                                                    <Text
                                                                        style={[styles.compactMenuSubtitle, { color: subtextColor }]}
                                                                        numberOfLines={1}
                                                                    >
                                                                        {item.subtitle}
                                                                    </Text>
                                                                </View>
                                                            </TouchableOpacity>
                                                        );
                                                    })}
                                                </View>
                                            </View>
                                        );
                                    })}
                                </ScrollView>
                            </Animated.View>
                        ) : (
                            <>
                                {/* Header with Title + Action Buttons */}
                                <View style={styles.splitListHeader}>
                                    <View style={styles.splitListHeaderTitleRow}>
                                        <Text style={[styles.splitListHeaderTitle, { color: textColor }]}>Projects</Text>
                                        {isAuthenticated && (
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                        setShowInlineSearch(prev => !prev);
                                                    }}
                                                    style={[styles.headerActionCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
                                                >
                                                    <Ionicons name="search-outline" size={16} color={textColor} />
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                        setIsSetupMode(true);
                                                    }}
                                                    style={[styles.headerActionCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
                                                >
                                                    <Ionicons name="settings-outline" size={16} color={textColor} />
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                        setIsAddProjectVisible(true);
                                                    }}
                                                    style={[styles.headerActionCircle, { backgroundColor: FormaBlue[700] }]}
                                                >
                                                    <Ionicons name="add" size={18} color="#FFFFFF" />
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </View>

                                    {/* Filter Segmented Control */}
                                    <View style={{ marginTop: 10 }}>
                                        <SegmentedControl
                                            fullWidth
                                            style={{ width: '100%' }}
                                            segments={projectSegments}
                                            activeSegment={activeSegment}
                                            onSegmentChange={setActiveSegment}
                                        />
                                    </View>

                                    {showInlineSearch && (
                                        <View style={{ marginTop: 10 }}>
                                            <UnifiedSearchBar
                                                value={searchQuery}
                                                onChangeText={setSearchQuery}
                                                placeholder="Search projects..."
                                                onClose={() => {
                                                    setShowInlineSearch(false);
                                                    setSearchQuery('');
                                                }}
                                            />
                                        </View>
                                    )}
                                </View>

                                {/* List ScrollView */}
                                <ScrollView
                                    style={styles.splitListScroll}
                                    contentContainerStyle={{ padding: 12, paddingBottom: 60 }}
                                    showsVerticalScrollIndicator={true}
                                >
                                    {!isAuthenticated ? (
                                        <UnauthenticatedView
                                            compact
                                            title="Projects"
                                            description="Track project timelines, milestones, and deliverable progress across your workspace."
                                            buttonText="Sign In"
                                        />
                                    ) : isLoading ? (
                                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 }}>
                                            <ActivityIndicator size="large" color="#007AFF" />
                                        </View>
                                    ) : filteredProjects.length === 0 ? (
                                        <View style={[styles.emptyContainer, { paddingVertical: 40 }]}>
                                            <View style={[styles.emptyIconBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)' }]}>
                                                <PlatformIcon name="folder.fill" size={32} tintColor={isDark ? 'rgba(255,255,255,0.4)' : FormaBlue[700]} weight="bold" />
                                            </View>
                                            <Text style={[styles.emptyTitle, { color: textColor, fontSize: 15 }]}>
                                                {searchQuery.trim() ? 'No Projects Found' : 'No Projects'}
                                            </Text>
                                            <Text style={[styles.emptySubtitle, { color: subtextColor, fontSize: 12 }]}>
                                                {searchQuery.trim()
                                                    ? `No project matches "${searchQuery.trim()}".`
                                                    : 'Create a new project to get started.'}
                                            </Text>
                                        </View>
                                    ) : (
                                        <View style={{ gap: 8 }}>
                                            {filteredProjects.map((project, index) => {
                                                const isSelected = selectedProject?.id === project.id;
                                                return (
                                                    <TouchableOpacity
                                                        key={project.id}
                                                        activeOpacity={0.7}
                                                        onPress={() => {
                                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                            setSelectedProject(project);
                                                        }}
                                                    >
                                                        <View
                                                            style={[
                                                                styles.compactCard,
                                                                {
                                                                    backgroundColor: isSelected
                                                                        ? (isDark ? 'rgba(10, 132, 255, 0.22)' : FormaBlue[100])
                                                                        : (isDark ? '#1C1C1E' : '#FFFFFF'),
                                                                    borderWidth: 1,
                                                                    borderColor: isSelected
                                                                        ? (isDark ? 'rgba(10, 132, 255, 0.4)' : FormaBlue[400])
                                                                        : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'),
                                                                }
                                                            ]}
                                                        >
                                                            {project.heroImage ? (
                                                                <Image source={project.heroImage} style={styles.thumbnail} />
                                                            ) : (
                                                                <View style={[styles.thumbnail, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }]}>
                                                                    <TenantBrandLogo tenant={activeTenant} size={28} isDark={isDark} />
                                                                </View>
                                                            )}
                                                            <View style={styles.compactInfo}>
                                                                <View style={styles.compactHeader}>
                                                                    <View
                                                                        style={[styles.smallPill, {
                                                                            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.06)',
                                                                            marginRight: 6,
                                                                        }]}
                                                                    >
                                                                        <Text style={[styles.smallPillText, { color: isDark ? '#FFFFFF' : '#1C1C1E' }]}>
                                                                            {formatProjectBadge(project, numberingSettings)}
                                                                        </Text>
                                                                    </View>
                                                                    <Text style={[styles.compactTitle, { color: textColor }]} numberOfLines={1}>
                                                                        {String(project.title || '')}
                                                                    </Text>
                                                                </View>
                                                                <Text style={[styles.compactSubtext, { color: subtextColor }]}>
                                                                    {project.location ? `${project.location}  •  ${project.phase}` : project.phase}
                                                                </Text>
                                                            </View>
                                                            <ProgressRing progress={project.progress} size={42} strokeWidth={3} />
                                                        </View>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                    )}
                                </ScrollView>
                            </>
                        )}
                    </Animated.View>

                    {/* Right Pane: Inspector / Detail pane (flex: 1 in workspace mode, flex: 2 in preview mode / setup mode) */}
                    <Animated.View
                        layout={Layout.springify().damping(28).stiffness(280)}
                        style={[
                            styles.splitRightPane,
                            {
                                flex: (focusedProject && activeProjectTab !== 'setup' && !projectDetailSetup) ? 1 : 2,
                                backgroundColor: isDark ? '#000000' : '#F2F2F7',
                                borderLeftWidth: StyleSheet.hairlineWidth,
                                borderLeftColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                                ...(Platform.OS === 'web' ? ({ transition: 'flex 0.32s cubic-bezier(0.16, 1, 0.3, 1)' } as any) : {}),
                            }
                        ]}
                    >
                        {(focusedProject && activeProjectTab !== 'setup' && !projectDetailSetup) ? (
                            <Animated.View
                                key={`inspector-${focusedProject.id}-${activeProjectTab}`}
                                entering={Platform.OS === 'web' ? undefined : FadeInRight.duration(240)}
                                style={{ flex: 1 }}
                            >
                                <ProjectWorkspaceInspector
                                    project={focusedProject}
                                    activeTab={activeProjectTab}
                                    onTabChange={setActiveProjectTab}
                                    activeSetupModule={activeSetupModule}
                                    setActiveSetupModule={setActiveSetupModule}
                                    isDark={isDark}
                                />
                            </Animated.View>
                        ) : (focusedProject && projectDetailSetup) ? (
                            <Animated.View key={`project-detail-setup-${projectDetailSetup}`} entering={FadeInRight.duration(200)} style={{ flex: 1 }}>
                                {(projectDetailSetup === 'general' || projectDetailSetup === 'general_settings') ? (
                                    <ProjectSetupGeneralScreen
                                        projectId={focusedProject.id}
                                        isEmbedded={true}
                                        onSaved={() => setProjectDetailSetup(null)}
                                    />
                                ) : (projectDetailSetup === 'team' || projectDetailSetup === 'team_members') ? (
                                    <ProjectSetupTeamScreen
                                        projectId={focusedProject.id}
                                        isEmbedded={true}
                                        onSaved={() => setProjectDetailSetup(null)}
                                    />
                                ) : projectDetailSetup === 'stages' ? (
                                    <ProjectSetupStagesScreen
                                        projectId={focusedProject.id}
                                        isEmbedded={true}
                                        onSaved={() => setProjectDetailSetup(null)}
                                    />
                                ) : projectDetailSetup === 'work-structure' ? (
                                    <ProjectSetupWorkStructureScreen
                                        projectId={focusedProject.id}
                                        isEmbedded={true}
                                        onSaved={() => setProjectDetailSetup(null)}
                                    />
                                ) : projectDetailSetup === 'control' ? (
                                    <ProjectSetupControlScreen
                                        projectId={focusedProject.id}
                                        isEmbedded={true}
                                        onSaved={() => setProjectDetailSetup(null)}
                                    />
                                ) : projectDetailSetup === 'cost-system' ? (
                                    <ProjectSetupCostSystemScreen
                                        projectId={focusedProject.id}
                                        isEmbedded={true}
                                        onSaved={() => setProjectDetailSetup(null)}
                                    />
                                ) : projectDetailSetup === 'time-system' ? (
                                    <ProjectSetupTimeSystemScreen
                                        projectId={focusedProject.id}
                                        isEmbedded={true}
                                        onSaved={() => setProjectDetailSetup(null)}
                                    />
                                ) : projectDetailSetup === 'price-library' ? (
                                    <ProjectSetupPriceLibraryScreen
                                        projectId={focusedProject.id}
                                        isEmbedded={true}
                                        onSaved={() => setProjectDetailSetup(null)}
                                    />
                                ) : projectDetailSetup === 'reports' ? (
                                    <ProjectSetupReportsScreen
                                        projectId={focusedProject.id}
                                        isEmbedded={true}
                                        onSaved={() => setProjectDetailSetup(null)}
                                    />
                                ) : projectDetailSetup === 'management' ? (
                                    <ProjectSetupManagementScreen
                                        projectId={focusedProject.id}
                                        isEmbedded={true}
                                        onSaved={() => setProjectDetailSetup(null)}
                                    />
                                ) : (
                                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                                        <Text style={{ color: subtextColor, fontSize: 14 }}>Coming soon</Text>
                                    </View>
                                )}
                            </Animated.View>
                        ) : (isSetupMode || (focusedProject && activeProjectTab === 'setup')) ? (
                            <Animated.View key={`setup-pane-${activeSetupModule}`} entering={FadeInRight.duration(200)} style={{ flex: 1 }}>
                                <ProjectSetupDetailPane
                                    activeModule={activeSetupModule}
                                    setActiveModule={setActiveSetupModule}
                                />
                            </Animated.View>
                        ) : selectedProject ? (
                            <Animated.View key={`preview-${selectedProject.id}`} entering={FadeInRight.duration(240)} style={{ flex: 1 }}>
                                <ProjectDetailContent
                                    projectId={selectedProject.id}
                                    initialProject={selectedProject}
                                    isEmbedded={true}
                                    activeTabProp="overview"
                                    onTabChange={() => {}}
                                    onOpenWorkspace={() => {
                                        setFocusedProject(selectedProject);
                                        setActiveProjectTab('overview');
                                    }}
                                    isFocusedWorkspace={false}
                                    isPreviewMode={true}
                                    onClose={() => {
                                        setSelectedProject(null);
                                    }}
                                />
                            </Animated.View>
                        ) : (
                            <View style={styles.desktopEmptyPane}>
                                <View style={[styles.desktopEmptyIconCircle, { backgroundColor: isDark ? 'rgba(77, 130, 255, 0.12)' : 'rgba(0, 122, 255, 0.08)' }]}>
                                    <PlatformIcon
                                        name="folder.fill"
                                        size={44}
                                        tintColor={isDark ? FormaBlue[400] : FormaBlue[700]}
                                    />
                                </View>
                                <Text style={[styles.desktopEmptyTitle, { color: textColor }]}>
                                    {projects.length === 0 ? 'No Projects Yet' : 'Select a Project'}
                                </Text>
                                <Text style={[styles.desktopEmptySubtitle, { color: subtextColor }]}>
                                    {projects.length === 0
                                        ? 'No projects created in this workspace yet.'
                                        : 'Choose a project from the list on the left to view overview, tracking, deliverables, and team activities.'}
                                </Text>
                            </View>
                        )}
                    </Animated.View>
                </View>
            ) : (
                <ScrollView
                    style={styles.scrollView}
                    contentInsetAdjustmentBehavior="automatic"
                    showsVerticalScrollIndicator={false}
                >
                    {!isAuthenticated ? (
                        <View style={[styles.content, { paddingBottom: insets.bottom + 40, paddingTop: 12 }]}>
                            <UnauthenticatedView
                                compact
                                title="Projects"
                                description="Track project timelines, milestones, and deliverable progress across your workspace."
                                buttonText="Sign In"
                            />
                        </View>
                    ) : isLoading ? (
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 }}>
                            <ActivityIndicator size="large" color="#007AFF" />
                        </View>
                    ) : (
                        <View style={[styles.content, { paddingBottom: insets.bottom + 40, paddingTop: 10 }]}>

                        {isSearchVisible && (
                            <UnifiedSearchBar
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                placeholder="Search projects..."
                                onClose={() => {
                                    setIsSearchVisible(false);
                                    setSearchQuery('');
                                }}
                            />
                        )}

                        {!searchQuery.trim() && (
                            <>
                                {/* --- FOCUS SECTION --- */}
                                <View style={styles.iosSectionHeader}>
                                    <Text style={[styles.iosSectionTitle, { color: textColor }]}>Focused Projects</Text>
                                </View>

                                <View style={{ gap: 24 }}>
                                    {focusProjects.map(project => (
                                        <BouncyTouchable
                                            key={project.id}
                                            onPress={() => router.push(`/project-details/${project.id}`)}
                                        >
                                            <View style={styles.hybridCard}>
                                                {project.heroImage ? (
                                                    <Image
                                                        source={project.heroImage}
                                                        style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]}
                                                        resizeMode="cover"
                                                    />
                                                ) : (
                                                    <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9', justifyContent: 'center', alignItems: 'center' }]}>
                                                        <TenantBrandLogo tenant={activeTenant} size={54} isDark={isDark} />
                                                    </View>
                                                )}

                                                <LinearGradient
                                                    colors={[
                                                        'transparent',
                                                        isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.2)',
                                                        isDark ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.9)',
                                                        isDark ? '#000000' : '#FFFFFF'
                                                    ]}
                                                    style={[StyleSheet.absoluteFill, { top: '15%' }]}
                                                    locations={[0, 0.4, 0.75, 1]}
                                                />

                                                <View style={styles.hybridContent}>
                                                    <View style={styles.hybridEditorialRow}>
                                                        <View
                                                            style={[styles.smallPill, {
                                                                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.06)',
                                                                alignSelf: 'flex-start',
                                                            }]}
                                                        >
                                                            <Text style={[styles.smallPillText, { color: isDark ? '#FFFFFF' : '#1C1C1E' }]}>
                                                                {formatProjectBadge(project, numberingSettings)}
                                                            </Text>
                                                        </View>
                                                    </View>

                                                    {project.isPinned && (
                                                        <View style={[styles.pinnedStarCircle, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.8)' }]}>
                                                            <Ionicons name="star" size={12} color="#FFCC00" />
                                                        </View>
                                                    )}

                                                    <Text style={[styles.hybridTitle, { color: textColor }]} numberOfLines={1}>
                                                        {project.title}
                                                    </Text>

                                                    <Text style={[styles.hybridSubHeader, { color: isDark ? subtextColor : '#3A3A3C' }]}>
                                                        {project.location ? `${project.location}  •  ${project.phase}` : project.phase}
                                                    </Text>

                                                    {(() => {
                                                        const cardProg = Math.min(100, Math.max(0, Math.round(project.progress || 0)));
                                                        return (
                                                            <View style={styles.hybridProgressArea}>
                                                                <View style={[styles.hybridProgressBarContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                                                                    {cardProg > 0 && (
                                                                        <View style={[styles.hybridProgressBar, {
                                                                            width: `${cardProg}%`,
                                                                            backgroundColor: getProgressColor(cardProg)
                                                                        }]} />
                                                                    )}
                                                                </View>
                                                                <View style={styles.hybridProgressBadge}>
                                                                    <View style={[StyleSheet.absoluteFill, {
                                                                        backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : `${getProgressColor(cardProg)}20`,
                                                                        borderRadius: 999
                                                                    }]} />
                                                                    <Text style={[styles.hybridProgressText, {
                                                                        color: isDark ? '#FFFFFF' : getProgressColor(cardProg)
                                                                    }]}>
                                                                        {cardProg}%
                                                                    </Text>
                                                                </View>
                                                            </View>
                                                        );
                                                    })()}
                                                </View>
                                            </View>
                                        </BouncyTouchable>
                                    ))}
                                </View>
                            </>
                        )}

                        {/* --- ALL PROJECTS LIST --- */}
                        <View style={styles.iosSectionHeader}>
                            {!searchQuery.trim() ? (
                                <TouchableOpacity
                                    style={{ flexDirection: 'row', alignItems: 'center' }}
                                    onPress={() => router.push('/projects/all')}
                                >
                                    <Text style={[styles.iosSectionTitle, { color: textColor }]}>Active Projects</Text>
                                    <Ionicons
                                        name="chevron-forward"
                                        size={20}
                                        color={subtextColor}
                                        style={{ marginLeft: 4, marginTop: 2, opacity: 0.6 }}
                                    />
                                </TouchableOpacity>
                            ) : (
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Text style={[styles.iosSectionTitle, { color: textColor }]}>Search Results</Text>
                                </View>
                            )}
                        </View>
                        <View style={{ gap: 12 }}>
                            {activeProjects.map((project, index) => (
                                <Animated.View
                                    key={project.id}
                                    entering={Platform.OS === 'web' ? undefined : FadeInUp.delay(index * 50)}
                                    layout={Layout}
                                >
                                    <BouncyTouchable onPress={() => router.push(`/project-details/${project.id}`)}>
                                        <View
                                            style={[styles.compactCard, {
                                                backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                                                borderWidth: 1,
                                                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                                            }]}
                                        >
                                            {project.heroImage ? (
                                                <Image source={project.heroImage} style={styles.thumbnail} />
                                            ) : (
                                                <View style={[styles.thumbnail, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }]}>
                                                    <TenantBrandLogo tenant={activeTenant} size={28} isDark={isDark} />
                                                </View>
                                            )}
                                            <View style={styles.compactInfo}>
                                                <View style={styles.compactHeader}>
                                                    <View
                                                        style={[styles.smallPill, {
                                                            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.06)',
                                                            marginRight: 6,
                                                        }]}
                                                    >
                                                        <Text style={[styles.smallPillText, { color: isDark ? '#FFFFFF' : '#1C1C1E' }]}>
                                                            {formatProjectBadge(project, numberingSettings)}
                                                        </Text>
                                                    </View>
                                                    <Text style={[styles.compactTitle, { color: textColor }]} numberOfLines={1}>
                                                        {String(project.title || '')}
                                                    </Text>
                                                </View>
                                                <Text style={[styles.compactSubtext, { color: subtextColor }]}>
                                                    {project.location ? `${project.location}  •  ${project.phase}` : project.phase}
                                                </Text>
                                            </View>
                                            <ProgressRing progress={project.progress} size={42} strokeWidth={3} />
                                        </View>
                                    </BouncyTouchable>
                                </Animated.View>
                            ))}
                        </View>

                        {filteredProjects.length === 0 && (
                            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 16 }}>
                                <Ionicons name="search-outline" size={48} color={subtextColor} />
                                <Text style={{ color: subtextColor, fontSize: 16, fontWeight: '500' }}>No projects found</Text>
                            </View>
                        )}
                        </View>
                    )}
                </ScrollView>
            )}

            {/* Add Project Sheet */}
            <SwiftUIAddProjectSheet
                isOpened={isAddProjectVisible}
                onClose={() => setIsAddProjectVisible(false)}
                onSave={(newProj) => {
                    setProjects(prev => [newProj, ...prev]);
                    setIsAddProjectVisible(false);
                }}
            />
        </>
    );
}

const styles = StyleSheet.create({
    scrollView: {
        flex: 1,
    },
    content: {
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'android' ? ((RNStatusBar.currentHeight || 24) + 54) : 16,
    },
    iosSectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 24,
        marginBottom: 16,
    },
    iosSectionTitle: {
        fontSize: 22,
        fontWeight: '700',
        letterSpacing: -0.5,
    },
    sectionHeader: {
        marginTop: 32,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 16,
    },
    // Hybrid Card (Focused Projects)
    hybridCard: {
        borderRadius: 28,
        overflow: 'hidden',
        aspectRatio: 3 / 2,
        backgroundColor: '#000',
    },
    hybridContent: {
        padding: 20,
        justifyContent: 'flex-end',
        flex: 1,
    },
    hybridEditorialHeader: {
    },
    hybridPreHeader: {
        fontSize: 10,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        marginBottom: 3,
        opacity: 0.6,
    },
    hybridTitleRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        marginBottom: 2,
    },
    hybridTitle: {
        fontSize: 22,
        fontWeight: '700',
        lineHeight: 26,
        marginBottom: 2,
        letterSpacing: -0.5,
    },
    hybridSubHeader: {
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 8,
    },
    hybridProgressArea: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginTop: 2,
    },
    hybridProgressBarContainer: {
        flex: 1,
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
    },
    hybridProgressBar: {
        height: '100%',
    },
    hybridProgressBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        minWidth: 46,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    hybridProgressText: {
        fontSize: 11,
        fontWeight: '900',
    },
    // Ring Component
    ringContainer: {
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    hybridEditorialRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    pinnedStarCircle: {
        position: 'absolute',
        top: 16,
        right: 16,
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 0.5,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
        zIndex: 10,
    },
    ringTextWrapper: {
        width: '80%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    ringText: {
        fontSize: 10,
        fontWeight: '900',
        textAlign: 'center',
    },
    // Variant 3
    compactCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: 18,
        gap: 12,
    },
    thumbnail: {
        width: 50,
        height: 50,
        borderRadius: 12,
    },
    compactInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    compactHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 2,
    },
    compactTitle: {
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    compactSubtext: {
        fontSize: 12,
        fontWeight: '500',
    },
    smallPill: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
        borderWidth: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    smallPillText: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    inlineSearchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 44,
        borderRadius: 22,
        paddingHorizontal: 16,
        borderWidth: 1,
        marginTop: 8,
        marginBottom: 12,
    },
    inlineSearchInput: {
        flex: 1,
        height: '100%',
        fontSize: 16,
        paddingVertical: 0,
    },
    inlineCancelButton: {
        paddingLeft: 8,
        paddingVertical: 4,
    },
    splitRoot: {
        flex: 1,
        flexDirection: 'row',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
    },
    splitLeftPane: {
        ...DESKTOP_LIST_PANE,
        height: '100%',
        borderRightWidth: StyleSheet.hairlineWidth,
        overflow: 'hidden',
    },
    splitListHeader: { ...DESKTOP_PANEL_HEADER },
    splitListHeaderTitleRow: { ...DESKTOP_PANEL_TITLE_ROW },
    splitListHeaderTitle: { ...DESKTOP_PANEL_TITLE },
    headerActionCircle: { ...DESKTOP_PANEL_ACTION },
    splitFilterBar: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    splitListScroll: {
        flex: 1,
        height: '100%',
    },
    splitRightPane: {
        flex: 2,
        height: '100%',
        overflow: 'hidden',
    },
    desktopEmptyPane: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
    },
    desktopEmptyIconCircle: {
        width: 88,
        height: 88,
        borderRadius: 44,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    desktopEmptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 8,
        textAlign: 'center',
        letterSpacing: -0.3,
    },
    desktopEmptySubtitle: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        maxWidth: 380,
        marginBottom: 24,
    },
    desktopEmptyBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 24,
        gap: 6,
    },
    desktopEmptyBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 48,
        paddingHorizontal: 24,
    },
    emptyIconBg: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 6,
        textAlign: 'center',
    },
    emptySubtitle: {
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 18,
    },
    backToProjectsBubble: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 999,
        borderWidth: 0,
    },
    backToProjectsBubbleText: {
        fontSize: 13,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    menuSectionHeader: {
        fontSize: 13,
        fontWeight: '600',
        letterSpacing: -0.1,
        paddingHorizontal: 6,
        marginBottom: 4,
    },
    compactMenuCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: 14,
        gap: 10,
    },
    compactRoundIconBox: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    compactMenuTitle: {
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    compactMenuSubtitle: {
        fontSize: 12,
        fontWeight: '400',
        marginTop: 1,
    },
    workspaceHeroCard: {
        borderRadius: 18,
        overflow: 'hidden',
        height: 120,
        position: 'relative',
        borderWidth: 1,
        justifyContent: 'space-between',
    },
    workspaceHeroImg: {
        ...StyleSheet.absoluteFillObject,
        width: '100%',
        height: '100%',
    },
    workspaceHeroTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingTop: 10,
        zIndex: 2,
    },
    workspaceBadgePill: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: 'rgba(0,0,0,0.55)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    workspaceBadgeText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    workspacePhasePill: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    workspacePhaseText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '600',
    },
    workspaceHeroBottomOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 12,
        paddingBottom: 10,
        paddingTop: 24,
    },
    workspaceHeroTitle: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    workspaceIconToolbar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: 999,
        borderWidth: 0,
        gap: 2,
    },
    workspaceIconBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    workspaceToolbarDivider: {
        width: StyleSheet.hairlineWidth,
        height: 16,
    },
});
