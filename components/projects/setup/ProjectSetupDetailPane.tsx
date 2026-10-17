import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Platform,
    Alert,
    ActionSheetIOS,
    Share,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { SegmentedControl, Segment } from '@/components/ui/SegmentedControl';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { HeaderToolbar, HeaderToolbarAction } from '@/components/ui/HeaderToolbar';
import {
    ProjectSetupModule,
    PROJECT_SETUP_MENU_ITEMS,
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

export interface ProjectSetupDetailPaneProps {
    activeModule: ProjectSetupModule;
    setActiveModule: (mod: ProjectSetupModule) => void;
}

export const ProjectSetupDetailPane: React.FC<ProjectSetupDetailPaneProps> = ({
    activeModule,
    setActiveModule,
}) => {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';

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
                    id: 'add_type',
                    icon: 'add',
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
                    id: 'add_status',
                    icon: 'add',
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
                    id: 'add_role',
                    icon: 'add',
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
                    id: 'export_logs',
                    icon: 'share-outline',
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
    }, [activeModule, auditLogs, isDark]);

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

            case 'project_types':
                return (
                    <ProjectTypesSection
                        isDark={isDark}
                        textColor={textColor}
                        subtextColor={subtextColor}
                        types={types}
                        onUpdateTypes={handleUpdateTypes}
                        isAddSheetOpen={isAddTypeSheetOpen}
                        onCloseAddSheet={() => setIsAddTypeSheetOpen(false)}
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

    return (
        <View style={[styles.root, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}>
            {/* Header */}
            <View style={styles.header}>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.headerTitle, { color: textColor }]}>{currentItemConfig.title}</Text>
                    <Text style={[styles.headerSub, { color: subtextColor }]}>{currentItemConfig.subtitle}</Text>
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
                style={{ flex: 1 }}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Main Body */}
                {renderModuleBody()}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    root: {
        flex: 1,
        height: '100%',
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingTop: 18,
        paddingBottom: 14,
        borderBottomWidth: 0,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    headerSub: {
        fontSize: 13,
        fontWeight: '400',
        marginTop: 2,
    },
    scrollContent: {
        paddingTop: 20,
        paddingBottom: 60,
        paddingHorizontal: 24,
        width: '100%',
    },
});
