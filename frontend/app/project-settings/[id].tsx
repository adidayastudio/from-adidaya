import { DESKTOP_LIST_PANE } from '@/constants/desktopLayout';
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Platform,
    StatusBar as RNStatusBar,
    RefreshControl,
    Alert,
    ActionSheetIOS,
    Share,
    TouchableOpacity,
    useWindowDimensions,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { SegmentedControl, Segment } from '@/components/ui/SegmentedControl';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { Colors, FormaBlue } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { HeaderToolbar, HeaderToolbarAction } from '@/components/ui/HeaderToolbar';
import {
    ProjectSetupGroup,
    ProjectSetupModule,
    PROJECT_SETUP_MENU_ITEMS,
    PROJECT_GROUP_TITLES,
    ProjectGeneralSettings,
    DEFAULT_PROJECT_GENERAL_SETTINGS,
    getProjectGeneralSettings,
    saveProjectGeneralSettings,
    ProjectNumberingSettings,
    DEFAULT_PROJECT_NUMBERING_SETTINGS,
    getProjectNumberingSettings,
    saveProjectNumberingSettings,
    ProjectTypeItem,
    DEFAULT_PROJECT_TYPES,
    getProjectTypes,
    saveProjectTypes,
    ProjectStatusItem,
    DEFAULT_PROJECT_STATUSES,
    getProjectStatuses,
    saveProjectStatuses,
    ProjectTrackingSettings,
    DEFAULT_PROJECT_TRACKING_SETTINGS,
    getProjectTrackingSettings,
    saveProjectTrackingSettings,
    ProjectRoleItem,
    DEFAULT_PROJECT_ROLES,
    getProjectRoles,
    saveProjectRoles,
    RolePermissionsMap,
    DEFAULT_ROLE_PERMISSIONS,
    getProjectPermissions,
    saveProjectPermissions,
    ProjectAuditLogItem,
    DEFAULT_PROJECT_AUDIT_LOGS,
    getProjectAuditLogs,
    clearProjectAuditLogs,
} from '@/lib/api/projectSetup';
import { ProjectGeneralSettingsSection } from '@/components/projects/setup/ProjectGeneralSettingsSection';
import { ProjectNumberingSection } from '@/components/projects/setup/ProjectNumberingSection';
import { ProjectTypesSection } from '@/components/projects/setup/ProjectTypesSection';
import { ProjectStatusesSection } from '@/components/projects/setup/ProjectStatusesSection';
import { ProjectTrackingSection } from '@/components/projects/setup/ProjectTrackingSection';
import { ProjectRolesSection } from '@/components/projects/setup/ProjectRolesSection';
import { ProjectPermissionsSection } from '@/components/projects/setup/ProjectPermissionsSection';
import { ProjectAuditLogsSection } from '@/components/projects/setup/ProjectAuditLogsSection';
import { ProjectTemplateConfigSection } from '@/components/projects/setup/ProjectTemplateConfigSection';

export default function ProjectSetupDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';

    const [activeModule, setActiveModule] = useState<ProjectSetupModule>(
        (id as ProjectSetupModule) || 'general_settings'
    );
    const [refreshing, setRefreshing] = useState(false);
    const [isAddTypeSheetOpen, setIsAddTypeSheetOpen] = useState(false);
    const [isAddStatusSheetOpen, setIsAddStatusSheetOpen] = useState(false);
    const [isAddRoleSheetOpen, setIsAddRoleSheetOpen] = useState(false);

    // States
    const [generalSettings, setGeneralSettings] = useState<ProjectGeneralSettings>(DEFAULT_PROJECT_GENERAL_SETTINGS);
    const [numberingSettings, setNumberingSettings] = useState<ProjectNumberingSettings>(DEFAULT_PROJECT_NUMBERING_SETTINGS);
    const [types, setTypes] = useState<ProjectTypeItem[]>(DEFAULT_PROJECT_TYPES);
    const [statuses, setStatuses] = useState<ProjectStatusItem[]>(DEFAULT_PROJECT_STATUSES);
    const [trackingSettings, setTrackingSettings] = useState<ProjectTrackingSettings>(DEFAULT_PROJECT_TRACKING_SETTINGS);
    const [roles, setRoles] = useState<ProjectRoleItem[]>(DEFAULT_PROJECT_ROLES);
    const [permissions, setPermissions] = useState<RolePermissionsMap>(DEFAULT_ROLE_PERMISSIONS);
    const [auditLogs, setAuditLogs] = useState<ProjectAuditLogItem[]>(DEFAULT_PROJECT_AUDIT_LOGS);

    const loadData = useCallback(async () => {
        try {
            const [g, n, t, s, tr, r, p, l] = await Promise.all([
                getProjectGeneralSettings(),
                getProjectNumberingSettings(),
                getProjectTypes(),
                getProjectStatuses(),
                getProjectTrackingSettings(),
                getProjectRoles(),
                getProjectPermissions(),
                getProjectAuditLogs(),
            ]);
            setGeneralSettings(g);
            setNumberingSettings(n);
            setTypes(t);
            setStatuses(s);
            setTrackingSettings(tr);
            setRoles(r);
            setPermissions(p);
            setAuditLogs(l);
        } catch {}
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        if (id) {
            setActiveModule(id as ProjectSetupModule);
        }
    }, [id]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadData();
        setTimeout(() => setRefreshing(false), 500);
    }, [loadData]);

    const currentItemConfig = useMemo(() => {
        return (
            PROJECT_SETUP_MENU_ITEMS.find((m) => m.id === activeModule) ||
            PROJECT_SETUP_MENU_ITEMS[0]
        );
    }, [activeModule]);

    // Group Sub-Segment Selector (Tabs for same group)
    const groupSegments: Segment[] = useMemo(() => {
        const groupItems = PROJECT_SETUP_MENU_ITEMS.filter((item) => item.group === currentItemConfig.group);
        return groupItems.map((item) => ({
            id: item.id,
            label: item.shortLabel || item.title,
            icon: item.icon,
        }));
    }, [currentItemConfig.group]);

    // Header Toolbar Actions
    const toolbarActions: HeaderToolbarAction[] = useMemo(() => {
        if (activeModule === 'project_types') {
            return [
                {
                    id: 'add',
                    icon: 'add-outline',
                    image: 'plus',
                    title: 'Add Type',
                    onPress: () => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setIsAddTypeSheetOpen(true);
                    },
                },
            ];
        }
        if (activeModule === 'project_statuses') {
            return [
                {
                    id: 'add',
                    icon: 'add-outline',
                    image: 'plus',
                    title: 'Add Status',
                    onPress: () => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setIsAddStatusSheetOpen(true);
                    },
                },
            ];
        }
        if (activeModule === 'project_roles') {
            return [
                {
                    id: 'add',
                    icon: 'add-outline',
                    image: 'plus',
                    title: 'Add Role',
                    onPress: () => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setIsAddRoleSheetOpen(true);
                    },
                },
            ];
        }
        if (activeModule === 'audit_logs') {
            return [
                {
                    id: 'export_audit_logs',
                    icon: 'share-outline',
                    image: 'square.and.arrow.up',
                    tintColor: textColor,
                    title: 'Export',
                    onPress: async () => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        const exportContent = auditLogs
                            .map((l) => `[${l.time || l.timestamp}] ${l.category} - ${l.action}: ${l.detail || l.details} (${l.actor || l.user})`)
                            .join('\n');

                        if (Platform.OS === 'ios') {
                            ActionSheetIOS.showActionSheetWithOptions(
                                {
                                    options: ['Cancel', 'Export as CSV', 'Export as JSON', 'Export Summary Report'],
                                    cancelButtonIndex: 0,
                                    userInterfaceStyle: isDark ? 'dark' : 'light',
                                    title: 'Export Audit Logs',
                                },
                                async (buttonIndex) => {
                                    if (buttonIndex === 0) return;
                                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                    await Share.share({
                                        title: 'Projects Setup Audit Logs',
                                        message: exportContent,
                                    });
                                }
                            );
                        } else {
                            await Share.share({
                                title: 'Projects Setup Audit Logs',
                                message: exportContent,
                            });
                        }
                    },
                },
            ];
        }
        return [];
    }, [activeModule, auditLogs, isDark, textColor]);

    const handleUpdateGeneralSettings = async (updated: ProjectGeneralSettings) => {
        setGeneralSettings(updated);
        await saveProjectGeneralSettings(updated);
    };

    const handleUpdateNumberingSettings = async (updated: ProjectNumberingSettings) => {
        setNumberingSettings(updated);
        await saveProjectNumberingSettings(updated);
    };

    const handleUpdateTypes = async (updated: ProjectTypeItem[]) => {
        setTypes(updated);
        await saveProjectTypes(updated);
    };

    const handleUpdateStatuses = async (updated: ProjectStatusItem[]) => {
        setStatuses(updated);
        await saveProjectStatuses(updated);
    };

    const handleUpdateTrackingSettings = async (updated: ProjectTrackingSettings) => {
        setTrackingSettings(updated);
        await saveProjectTrackingSettings(updated);
    };

    const handleUpdateRoles = async (updated: ProjectRoleItem[]) => {
        setRoles(updated);
        await saveProjectRoles(updated);
    };

    const handleUpdatePermissions = async (updated: RolePermissionsMap) => {
        setPermissions(updated);
        await saveProjectPermissions(updated);
    };

    const renderModuleBody = () => {
        switch (activeModule) {
            case 'general_settings':
                return (
                    <ProjectGeneralSettingsSection
                        isDark={isDark}
                        textColor={textColor}
                        subtextColor={subtextColor}
                        settings={generalSettings}
                        onUpdateSettings={handleUpdateGeneralSettings}
                    />
                );

            case 'numbering_codes':
                return (
                    <ProjectNumberingSection
                        isDark={isDark}
                        textColor={textColor}
                        subtextColor={subtextColor}
                        settings={numberingSettings}
                        onUpdateSettings={handleUpdateNumberingSettings}
                    />
                );

            case 'scope':
            case 'typology':
            case 'discipline':
            case 'class':
            case 'location_factors':
                return (
                    <ProjectTemplateConfigSection
                        mode={activeModule as any}
                        isDark={isDark}
                        textColor={textColor}
                        subtextColor={subtextColor}
                    />
                );

            case 'project_statuses':
                return (
                    <ProjectStatusesSection
                        isDark={isDark}
                        textColor={textColor}
                        subtextColor={subtextColor}
                        statuses={statuses}
                        onUpdateStatuses={handleUpdateStatuses}
                        isAddSheetOpen={isAddStatusSheetOpen}
                        onCloseAddSheet={() => setIsAddStatusSheetOpen(false)}
                    />
                );

            case 'tracking_progress':
                return (
                    <ProjectTrackingSection
                        isDark={isDark}
                        textColor={textColor}
                        subtextColor={subtextColor}
                        settings={trackingSettings}
                        onUpdateSettings={handleUpdateTrackingSettings}
                    />
                );

            case 'project_roles':
                return (
                    <ProjectRolesSection
                        isDark={isDark}
                        textColor={textColor}
                        subtextColor={subtextColor}
                        roles={roles}
                        onUpdateRoles={handleUpdateRoles}
                        isAddSheetOpen={isAddRoleSheetOpen}
                        onCloseAddSheet={() => setIsAddRoleSheetOpen(false)}
                        onNavigateToPermissions={() => setActiveModule('permissions')}
                    />
                );

            case 'permissions':
                return (
                    <ProjectPermissionsSection
                        isDark={isDark}
                        textColor={textColor}
                        subtextColor={subtextColor}
                        roles={roles}
                        permissions={permissions}
                        onUpdatePermissions={handleUpdatePermissions}
                    />
                );

            case 'audit_logs':
                return (
                    <ProjectAuditLogsSection
                        isDark={isDark}
                        textColor={textColor}
                        subtextColor={subtextColor}
                        logs={auditLogs}
                    />
                );

            default:
                return null;
        }
    };

    const groups: ProjectSetupGroup[] = ['general', 'configuration', 'access', 'system'];
    const { width } = useWindowDimensions();
    const isDesktopWeb = Platform.OS === 'web' && width >= 768;

    if (isDesktopWeb) {
        return (
            <View style={[s.splitRoot, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}>
                {/* Left Pane: Project Setup Menu (flex: 1) */}
                <View style={[s.splitLeftPane, { borderRightColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                    {/* Header: Back to Projects + Title */}
                    <View style={s.splitListHeader}>
                        <TouchableOpacity
                            onPress={() => router.push('/(tabs)/projects')}
                            style={s.backToProjectsBtn}
                            activeOpacity={0.7}
                        >
                            <PlatformIcon name="chevron.left" size={16} tintColor={FormaBlue[700]} />
                            <Text style={[s.backToProjectsText, { color: FormaBlue[700] }]}>Projects</Text>
                        </TouchableOpacity>

                        <Text style={[s.splitListHeaderTitle, { color: textColor }]}>Projects Setup</Text>
                    </View>

                    <ScrollView
                        style={s.splitListScroll}
                        contentContainerStyle={{ padding: 12, paddingBottom: 60 }}
                        showsVerticalScrollIndicator={true}
                    >
                        {groups.map((grp) => {
                            const items = PROJECT_SETUP_MENU_ITEMS.filter((item) => item.group === grp);
                            if (items.length === 0) return null;
                            const title = PROJECT_GROUP_TITLES[grp];

                            return (
                                <View key={grp} style={{ marginBottom: 16 }}>
                                    {!!title && (
                                        <Text style={[s.menuSectionHeader, { color: subtextColor }]}>
                                            {title}
                                        </Text>
                                    )}
                                    <View style={{ gap: 6, marginTop: 6 }}>
                                        {items.map((item) => {
                                            const isSelected = activeModule === item.id;
                                            return (
                                                <TouchableOpacity
                                                    key={item.id}
                                                    style={[
                                                        s.compactMenuCard,
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
                                                        setActiveModule(item.id);
                                                    }}
                                                    activeOpacity={0.7}
                                                >
                                                    <LinearGradient
                                                        colors={isDark ? ['#1C1C1E', '#000000'] : item.gradientColors}
                                                        style={s.compactIconBox}
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
                                                        <Text style={[s.compactMenuTitle, { color: textColor }]}>
                                                            {item.title}
                                                        </Text>
                                                        <Text
                                                            style={[s.compactMenuSubtitle, { color: subtextColor }]}
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
                </View>

                {/* Right Pane: Active Module Content (flex: 2) */}
                <View style={[s.splitRightPane, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}>
                    {/* Right Pane Header */}
                    <View style={[s.splitRightHeader, { borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                        <View style={{ flex: 1 }}>
                            <Text style={[s.splitRightHeaderTitle, { color: textColor }]}>{currentItemConfig.title}</Text>
                            <Text style={[s.splitRightHeaderSub, { color: subtextColor }]}>{currentItemConfig.subtitle}</Text>
                        </View>
                        {toolbarActions.length > 0 && (
                            <HeaderToolbar
                                key={`header-toolbar-${activeModule}`}
                                actions={toolbarActions}
                                isDark={isDark}
                                textColor={textColor}
                                maxDirectActions={3}
                            />
                        )}
                    </View>

                    <ScrollView
                        style={{ flex: 1, width: '100%' }}
                        contentContainerStyle={{
                            paddingTop: 20,
                            paddingBottom: 60,
                            paddingHorizontal: 24,
                            width: '100%',
                        }}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Main Body */}
                        {renderModuleBody()}
                    </ScrollView>
                </View>
            </View>
        );
    }

    return (
        <>
            <RNStatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
            <Stack.Screen
                options={{
                    headerShown: true,
                    title: currentItemConfig.title,
                    headerLargeTitle: false,
                    headerTransparent: Platform.OS === 'ios',
                    headerStyle: { backgroundColor: Platform.OS === 'ios' ? 'transparent' : (isDark ? '#000000' : '#F2F2F7') },
                    headerTintColor: textColor,
                    headerTitleStyle: { color: textColor, fontWeight: '600' },
                    headerShadowVisible: false,
                    headerBackButtonDisplayMode: 'minimal',
                    headerBackTitle: ' ',
                    headerRight: toolbarActions.length > 0
                        ? () => (
                            <View style={{ marginRight: Platform.OS === 'web' ? 16 : 0 }}>
                                <HeaderToolbar
                                    key={`header-toolbar-${activeModule}`}
                                    actions={toolbarActions}
                                    isDark={isDark}
                                    textColor={textColor}
                                    maxDirectActions={2}
                                />
                            </View>
                        )
                        : undefined,
                }}
            />

            <ScrollView
                style={[s.container, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}
                contentInsetAdjustmentBehavior="automatic"
                contentContainerStyle={[
                    s.scrollContent,
                    {
                        paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 24) + 16 : 8,
                        paddingBottom: insets.bottom + 40,
                    },
                ]}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#007AFF" />
                }
            >
                {/* Group Sub-Segment Selector */}
                {groupSegments.length > 1 && (
                    <View style={s.segmentedWrapper}>
                        <SegmentedControl
                            segments={groupSegments}
                            activeSegment={activeModule}
                            onSegmentChange={(newId) => {
                                Haptics.selectionAsync();
                                setActiveModule(newId as ProjectSetupModule);
                            }}
                        />
                    </View>
                )}

                {/* Main Body */}
                {renderModuleBody()}
            </ScrollView>
        </>
    );
}

const s = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingTop: 10,
        paddingHorizontal: 16,
    },
    segmentedWrapper: {
        marginBottom: 14,
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
    splitListHeader: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 14,
        borderBottomWidth: 0,
        gap: 12,
    },
    backToProjectsBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        alignSelf: 'flex-start',
    },
    backToProjectsText: {
        fontSize: 14,
        fontWeight: '600',
    },
    splitListHeaderTitle: {
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: -0.4,
    },
    splitListScroll: {
        flex: 1,
        height: '100%',
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
    compactIconBox: {
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
    splitRightPane: {
        flex: 1,
        height: '100%',
        overflow: 'hidden',
    },
    splitRightHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingTop: 18,
        paddingBottom: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    splitRightHeaderTitle: {
        fontSize: 20,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    splitRightHeaderSub: {
        fontSize: 13,
        fontWeight: '400',
        marginTop: 2,
    },
});
