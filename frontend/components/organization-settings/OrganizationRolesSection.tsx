import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Platform,
    LayoutAnimation,
    UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { IOSSwitch } from '@/components/ui/IOSSwitch';
import { PermissionKey, PermissionItemDef, RoleDef, RoleId } from './types';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface OrganizationRolesSectionProps {
    isDark: boolean;
    textColor: string;
    subtextColor: string;
    cardBgColor: string;
    borderColor: string;
    primaryColor?: string;
    rolePerms: Record<RoleId, Record<PermissionKey, boolean>>;
    onTogglePermission: (roleId: RoleId, permKey: PermissionKey) => void;
    canManageRoles?: boolean;
    currentRole?: string;
}

export const PERMISSION_ITEMS: PermissionItemDef[] = [
    { key: 'dashboard', label: 'Dashboard Access' },
    { key: 'general_settings', label: 'Manage General Settings' },
    { key: 'team_members', label: 'Manage Team Members' },
    { key: 'roles_permissions', label: 'Manage Roles & Permissions' },
    { key: 'project_module', label: 'Project Module Access' },
    { key: 'financial_module', label: 'Financial Module Access' },
    { key: 'hr_module', label: 'HR & Attendance Module' },
    { key: 'reports_module', label: 'Reports & Insights Access' },
    { key: 'export_data', label: 'Export & Download Data' },
    { key: 'api_integrations', label: 'API & Webhook Integrations' },
];

export const INITIAL_ROLE_DEFS: RoleDef[] = [
    {
        id: 'system',
        title: 'System',
        level: 'Level 0',
        isLocked: true,
        color: '#1E293B',
        icon: 'hardware-chip-outline',
        desc: '',
        defaultPermissions: {
            dashboard: true,
            general_settings: true,
            team_members: false,
            roles_permissions: false,
            project_module: true,
            financial_module: true,
            hr_module: true,
            reports_module: true,
            export_data: true,
            api_integrations: true,
        },
    },
    {
        id: 'super_admin',
        title: 'Super Admin',
        level: 'Level 1',
        isLocked: true,
        color: '#EF4444',
        icon: 'shield-checkmark-outline',
        desc: '',
        defaultPermissions: {
            dashboard: true,
            general_settings: true,
            team_members: true,
            roles_permissions: true,
            project_module: true,
            financial_module: true,
            hr_module: true,
            reports_module: true,
            export_data: true,
            api_integrations: true,
        },
    },
    {
        id: 'admin',
        title: 'Admin',
        level: 'Level 2',
        isLocked: false,
        color: '#3B82F6',
        icon: 'shield-outline',
        desc: '',
        defaultPermissions: {
            dashboard: true,
            general_settings: false,
            team_members: true,
            roles_permissions: false,
            project_module: true,
            financial_module: true,
            hr_module: true,
            reports_module: true,
            export_data: true,
            api_integrations: false,
        },
    },
    {
        id: 'member',
        title: 'Member',
        level: 'Level 3',
        isLocked: false,
        color: '#10B981',
        icon: 'people-outline',
        desc: '',
        defaultPermissions: {
            dashboard: true,
            general_settings: false,
            team_members: false,
            roles_permissions: false,
            project_module: true,
            financial_module: false,
            hr_module: false,
            reports_module: true,
            export_data: false,
            api_integrations: false,
        },
    },
    {
        id: 'viewer',
        title: 'Viewer',
        level: 'Level 4',
        isLocked: false,
        color: '#F59E0B',
        icon: 'eye-outline',
        desc: '',
        defaultPermissions: {
            dashboard: true,
            general_settings: false,
            team_members: false,
            roles_permissions: false,
            project_module: false,
            financial_module: false,
            hr_module: false,
            reports_module: true,
            export_data: false,
            api_integrations: false,
        },
    },
];

const ROW_HEIGHT = 56;
const HEADER_HEIGHT = 44;
const LEFT_COL_WIDTH = 158;
const ROLE_COL_WIDTH = 98;

export const OrganizationRolesSection: React.FC<OrganizationRolesSectionProps> = ({
    isDark,
    textColor,
    subtextColor,
    cardBgColor,
    rolePerms,
    onTogglePermission,
    canManageRoles = true,
    currentRole = 'member',
}) => {
    const normalized = (currentRole || '').toLowerCase().trim();
    const userRoleId: RoleId = normalized.replace(/[\s_-]+/g, '') === 'superadmin'
        ? 'super_admin'
        : normalized.includes('admin') || normalized.includes('owner')
        ? 'admin'
        : normalized.includes('view')
        ? 'viewer'
        : 'member';

    const visibleRoles = canManageRoles
        ? INITIAL_ROLE_DEFS
        : INITIAL_ROLE_DEFS.filter((r) => r.id === userRoleId);

    const [expandedRoles, setExpandedRoles] = useState<Record<RoleId, boolean>>(() => ({
        system: false,
        super_admin: userRoleId === 'super_admin',
        admin: userRoleId === 'admin',
        member: userRoleId === 'member',
        viewer: userRoleId === 'viewer',
    }));

    useEffect(() => {
        setExpandedRoles({
            system: false,
            super_admin: userRoleId === 'super_admin',
            admin: userRoleId === 'admin',
            member: userRoleId === 'member',
            viewer: userRoleId === 'viewer',
        });
    }, [userRoleId]);

    const toggleAccordion = (roleId: RoleId) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedRoles((prev) => ({
            ...prev,
            [roleId]: !prev[roleId],
        }));
    };

    const getActiveCount = (roleId: RoleId) => {
        const perms = rolePerms[roleId] || {};
        return Object.values(perms).filter(Boolean).length;
    };

    return (
        <View style={styles.container}>
            {/* List of Role Accordion Cards */}
            <View style={styles.rolesList}>
                {visibleRoles.map((role) => {
                    const isExpanded = expandedRoles[role.id];
                    const activeCount = getActiveCount(role.id);
                    const totalCount = PERMISSION_ITEMS.length;
                    const progressRatio = totalCount > 0 ? activeCount / totalCount : 0;

                    return (
                        <View
                            key={role.id}
                            style={[
                                styles.roleCard,
                                { backgroundColor: cardBgColor },
                                isDark && styles.roleCardDarkShadow,
                            ]}
                        >
                            {/* Card Header (Accordion trigger) */}
                            <TouchableOpacity
                                activeOpacity={0.7}
                                onPress={() => toggleAccordion(role.id)}
                                style={styles.cardHeader}
                            >
                                {/* Left: Role Icon Box + Title + Lock Icon */}
                                <View style={styles.headerLeft}>
                                    <View
                                        style={[
                                            styles.roleIconBox,
                                            {
                                                backgroundColor: isDark
                                                    ? `${role.color}25`
                                                    : `${role.color}15`,
                                            },
                                        ]}
                                    >
                                        <Ionicons
                                            name={role.icon}
                                            size={18}
                                            color={role.color}
                                        />
                                    </View>

                                    <View style={styles.titleWithLock}>
                                        <Text style={[styles.roleName, { color: textColor }]}>
                                            {role.title}
                                        </Text>
                                        {role.isLocked && (
                                            <Ionicons
                                                name="lock-closed"
                                                size={13}
                                                color={isDark ? '#8E8E93' : '#9CA3AF'}
                                                style={styles.lockIcon}
                                            />
                                        )}
                                    </View>
                                </View>

                                {/* Right: Single Horizontal Line (Progress Bar + 8/10 + Chevron) */}
                                <View style={styles.headerRight}>
                                    <View
                                        style={[
                                            styles.progressBarTrack,
                                            {
                                                backgroundColor: isDark
                                                    ? 'rgba(255, 255, 255, 0.1)'
                                                    : '#E2E8F0',
                                            },
                                        ]}
                                    >
                                        <View
                                            style={[
                                                styles.progressBarFill,
                                                {
                                                    width: `${progressRatio * 100}%`,
                                                    backgroundColor: role.color,
                                                },
                                            ]}
                                        />
                                    </View>

                                    <Text
                                        style={[
                                            styles.progressCountText,
                                            { color: isDark ? '#94A3B8' : '#64748B' },
                                        ]}
                                    >
                                        {activeCount}/{totalCount}
                                    </Text>

                                    <Ionicons
                                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                                        size={16}
                                        color={isDark ? '#64748B' : '#94A3B8'}
                                        style={styles.chevron}
                                    />
                                </View>
                            </TouchableOpacity>

                            {/* Expanded Content: Clean Switch Items without subtitles */}
                            {isExpanded && (
                                <View style={styles.expandedContent}>
                                    <View
                                        style={[
                                            styles.divider,
                                            {
                                                backgroundColor: isDark
                                                    ? 'rgba(255, 255, 255, 0.06)'
                                                    : 'rgba(0, 0, 0, 0.05)',
                                            },
                                        ]}
                                    />

                                    <View style={styles.permissionsGrid}>
                                        {PERMISSION_ITEMS.map((item) => {
                                            const isChecked = !!rolePerms[role.id]?.[item.key];
                                            const isRoleLocked = !!role.isLocked || !canManageRoles;

                                            return (
                                                <View
                                                    key={item.key}
                                                    style={styles.permissionRow}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.permissionLabel,
                                                            {
                                                                color: isRoleLocked
                                                                    ? (isDark ? '#64748B' : '#94A3B8')
                                                                    : textColor,
                                                            },
                                                        ]}
                                                    >
                                                        {item.label}
                                                    </Text>

                                                    <IOSSwitch
                                                        value={isChecked}
                                                        disabled={isRoleLocked}
                                                        isDark={isDark}
                                                        size={26}
                                                        activeColor="#34C759"
                                                        onValueChange={() =>
                                                            onTogglePermission(role.id, item.key)
                                                        }
                                                    />
                                                </View>
                                            );
                                        })}
                                    </View>
                                </View>
                            )}
                        </View>
                    );
                })}
            </View>

            {/* Matrix Card: Permission Comparison with Fixed Column and 2-Line Text (Super Admin / Admin Only) */}
            {canManageRoles && (
                <View
                    style={[
                        styles.matrixCard,
                        { backgroundColor: cardBgColor },
                        isDark && styles.roleCardDarkShadow,
                    ]}
                >
                    <View style={styles.matrixHeader}>
                        <Text style={[styles.matrixTitle, { color: textColor }]}>
                            Permission Matrix Comparison
                        </Text>
                        <Text style={[styles.matrixSubtitle, { color: subtextColor }]}>
                            Scroll right to compare roles. Click icons to toggle permissions.
                        </Text>
                    </View>

                    {/* Matrix Table: Fixed Left Column + Horizontal Scrollable Right Columns */}
                    <View style={styles.matrixTableWrapper}>
                        {/* 1. FIXED LEFT COLUMN */}
                        <View
                            style={[
                                styles.fixedLeftColumn,
                                {
                                    borderRightColor: isDark
                                        ? 'rgba(255, 255, 255, 0.08)'
                                        : 'rgba(0, 0, 0, 0.06)',
                                },
                            ]}
                        >
                            {/* Header Cell */}
                            <View
                                style={[
                                    styles.matrixRowCell,
                                    styles.headerRowCell,
                                    {
                                        borderBottomColor: isDark
                                            ? 'rgba(255, 255, 255, 0.08)'
                                            : 'rgba(0, 0, 0, 0.06)',
                                    },
                                ]}
                            >
                                <Text style={[styles.colHeaderLabel, { color: subtextColor }]}>
                                    PERMISSION
                                </Text>
                            </View>

                            {/* Body Rows (2-Line Wrapped Text, No Ellipsis Truncation) */}
                            {PERMISSION_ITEMS.map((item, idx) => (
                                <View
                                    key={item.key}
                                    style={[
                                        styles.matrixRowCell,
                                        styles.bodyRowCell,
                                        idx !== PERMISSION_ITEMS.length - 1 && {
                                            borderBottomColor: isDark
                                                ? 'rgba(255, 255, 255, 0.04)'
                                                : 'rgba(0, 0, 0, 0.04)',
                                            borderBottomWidth: 1,
                                        },
                                    ]}
                                >
                                    <Text
                                        style={[styles.fixedPermissionText, { color: textColor }]}
                                        numberOfLines={2}
                                    >
                                        {item.label}
                                    </Text>
                                </View>
                            ))}
                        </View>

                        {/* 2. SCROLLABLE RIGHT COLUMNS */}
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.scrollableWrapper}
                            contentContainerStyle={styles.scrollableContent}
                        >
                            <View style={{ flexGrow: 1, width: '100%' }}>
                                {/* Header Row */}
                                <View
                                    style={[
                                        styles.scrollableRow,
                                        styles.headerRowCell,
                                        {
                                            borderBottomColor: isDark
                                                ? 'rgba(255, 255, 255, 0.08)'
                                                : 'rgba(0, 0, 0, 0.06)',
                                        },
                                    ]}
                                >
                                    {INITIAL_ROLE_DEFS.map((role) => (
                                        <View key={role.id} style={styles.roleColCell}>
                                            <View
                                                style={[
                                                    styles.rolePill,
                                                    { backgroundColor: role.color },
                                                ]}
                                            >
                                                <Text style={styles.rolePillText}>{role.title}</Text>
                                            </View>
                                        </View>
                                    ))}
                                </View>

                                {/* Body Rows */}
                                {PERMISSION_ITEMS.map((item, rowIdx) => (
                                    <View
                                        key={item.key}
                                        style={[
                                            styles.scrollableRow,
                                            styles.bodyRowCell,
                                            rowIdx !== PERMISSION_ITEMS.length - 1 && {
                                                borderBottomColor: isDark
                                                    ? 'rgba(255, 255, 255, 0.04)'
                                                    : 'rgba(0, 0, 0, 0.04)',
                                                borderBottomWidth: 1,
                                            },
                                        ]}
                                    >
                                        {INITIAL_ROLE_DEFS.map((role) => {
                                            const isAllowed = !!rolePerms[role.id]?.[item.key];
                                            const isLocked = !!role.isLocked;

                                            return (
                                                <View key={role.id} style={styles.roleColCell}>
                                                    <TouchableOpacity
                                                        activeOpacity={isLocked ? 1 : 0.6}
                                                        disabled={isLocked}
                                                        onPress={() => onTogglePermission(role.id, item.key)}
                                                        style={[
                                                            styles.checkButton,
                                                            {
                                                                backgroundColor: isDark
                                                                    ? isAllowed
                                                                        ? 'rgba(16, 185, 129, 0.15)'
                                                                        : 'rgba(255, 255, 255, 0.05)'
                                                                    : isAllowed
                                                                    ? '#DCFCE7'
                                                                    : '#F1F5F9',
                                                                borderColor: isDark
                                                                    ? isAllowed
                                                                        ? 'rgba(16, 185, 129, 0.3)'
                                                                        : 'rgba(255, 255, 255, 0.1)'
                                                                    : isAllowed
                                                                    ? '#86EFAC'
                                                                    : '#E2E8F0',
                                                            },
                                                        ]}
                                                    >
                                                        {isAllowed ? (
                                                            <Ionicons
                                                                name="checkmark"
                                                                size={17}
                                                                color={isDark ? '#34D399' : '#10B981'}
                                                            />
                                                        ) : (
                                                            <Ionicons
                                                                name="close"
                                                                size={15}
                                                                color={isDark ? '#64748B' : '#94A3B8'}
                                                            />
                                                        )}
                                                    </TouchableOpacity>
                                                </View>
                                            );
                                        })}
                                    </View>
                                ))}
                            </View>
                        </ScrollView>
                    </View>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        gap: 16,
    },
    headerSection: {
        paddingHorizontal: 4,
        paddingTop: 4,
        paddingBottom: 4,
        gap: 4,
    },
    mainTitle: {
        fontSize: 24,
        fontWeight: '800',
        letterSpacing: -0.4,
    },
    mainSubtitle: {
        fontSize: 14,
        lineHeight: 20,
    },
    rolesList: {
        gap: 12,
    },
    roleCard: {
        borderRadius: 20,
        paddingVertical: 14,
        paddingHorizontal: 16,
        overflow: 'hidden',
    },
    roleCardDarkShadow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 2,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    roleIconBox: {
        width: 36,
        height: 36,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
    },
    titleWithLock: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    roleName: {
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    lockIcon: {
        marginTop: 1,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    progressBarTrack: {
        width: 48,
        height: 4,
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 2,
    },
    progressCountText: {
        fontSize: 12.5,
        fontWeight: '700',
        minWidth: 32,
        textAlign: 'right',
    },
    chevron: {
        marginLeft: 2,
    },
    expandedContent: {
        paddingTop: 10,
    },
    divider: {
        height: 1,
        marginBottom: 8,
    },
    permissionsGrid: {
        gap: 2,
    },
    permissionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        paddingHorizontal: 2,
    },
    permissionLabel: {
        fontSize: 14.5,
        fontWeight: '600',
        flex: 1,
        paddingRight: 14,
    },

    // MATRIX SECTION
    matrixCard: {
        borderRadius: 20,
        paddingVertical: 18,
        paddingHorizontal: 16,
        marginTop: 4,
        gap: 14,
    },
    matrixHeader: {
        gap: 3,
    },
    matrixTitle: {
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    matrixSubtitle: {
        fontSize: 12.5,
        lineHeight: 17,
    },
    matrixTableWrapper: {
        flexDirection: 'row',
        borderRadius: 14,
        overflow: 'hidden',
    },

    // Fixed Left Column
    fixedLeftColumn: {
        width: LEFT_COL_WIDTH,
        borderRightWidth: 1,
        paddingRight: 6,
    },
    matrixRowCell: {
        justifyContent: 'center',
    },
    headerRowCell: {
        height: HEADER_HEIGHT,
        borderBottomWidth: 1.5,
        paddingBottom: 4,
    },
    bodyRowCell: {
        height: ROW_HEIGHT,
        paddingVertical: 4,
    },
    colHeaderLabel: {
        fontSize: 10.5,
        fontWeight: '800',
        letterSpacing: 0.7,
    },
    fixedPermissionText: {
        fontSize: 12.5,
        fontWeight: '600',
        lineHeight: 16,
    },

    // Scrollable Right Columns
    scrollableWrapper: {
        flex: 1,
        minWidth: 0,
    },
    scrollableContent: {
        flexGrow: 1,
        paddingLeft: 6,
    },
    scrollableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexGrow: 1,
        width: '100%',
    },
    roleColCell: {
        flex: 1,
        minWidth: 88,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rolePill: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 80,
    },
    rolePillText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '700',
        textAlign: 'center',
    },
    checkButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkButtonDisabled: {
        opacity: 0.8,
    },
});
