import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';
import { GlassView } from '@/components/ui/GlassView';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import * as Haptics from 'expo-haptics';
import { ProjectRoleItem } from '@/lib/api/projectSetup';
import { ProjectRoleEditSheet } from './ProjectRoleEditSheet';

interface ProjectRolesSectionProps {
    isDark: boolean;
    textColor: string;
    subtextColor: string;
    roles: ProjectRoleItem[];
    onUpdateRoles?: (newRoles: ProjectRoleItem[]) => void;
    isAddSheetOpen?: boolean;
    onCloseAddSheet?: () => void;
    onNavigateToPermissions?: (roleId?: string) => void;
}

export function ProjectRolesSection({
    isDark,
    textColor,
    subtextColor,
    roles,
    onUpdateRoles,
    isAddSheetOpen = false,
    onCloseAddSheet,
    onNavigateToPermissions,
}: ProjectRolesSectionProps) {
    const [editingRole, setEditingRole] = useState<ProjectRoleItem | null>(null);
    const [isEditSheetVisible, setIsEditSheetVisible] = useState(false);

    const handleOpenEdit = (role: ProjectRoleItem) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setEditingRole(role);
        setIsEditSheetVisible(true);
    };

    const handleCloseEdit = () => {
        setIsEditSheetVisible(false);
        setEditingRole(null);
    };

    const handleSaveRole = (savedItem: ProjectRoleItem) => {
        if (!onUpdateRoles) return;
        const exists = roles.some((r) => r.id === savedItem.id);
        if (exists) {
            onUpdateRoles(roles.map((r) => (r.id === savedItem.id ? savedItem : r)));
        } else {
            onUpdateRoles([...roles, savedItem]);
        }
    };

    const handleDeleteRole = (id: string) => {
        if (!onUpdateRoles) return;
        onUpdateRoles(roles.filter((r) => r.id !== id));
    };

    return (
        <View style={s.container}>
            {/* Subtle Neutral Info Banner */}
            <GlassView
                intensity={isDark ? 10 : 25}
                style={[
                    s.infoBanner,
                    {
                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
                    },
                ]}
            >
                <PlatformIcon name="info.circle.fill" size={16} tintColor={isDark ? '#8E8E93' : '#6E6E73'} />
                <Text style={[s.infoBannerText, { color: subtextColor }]}>
                    Project roles apply only within each project and do not replace organization roles.
                </Text>
            </GlassView>

            {/* List of Roles: One Card per Role */}
            <View style={s.sectionBlock}>
                <Text style={[s.sectionHeaderLabel, { color: subtextColor }]}>
                    Individual Project Roles ({roles.length})
                </Text>

                <View style={s.cardsList}>
                    {roles.map((role) => {
                        return (
                            <View
                                key={role.id}
                                style={[
                                    s.cardItem,
                                    {
                                        backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                                        borderWidth: 1,
                                        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                                    },
                                ]}
                            >
                                <TouchableOpacity
                                    style={s.row}
                                    onPress={() => handleOpenEdit(role)}
                                    activeOpacity={0.7}
                                >
                                    <View style={s.textCol}>
                                        <View style={s.titleRow}>
                                            <Text style={[s.settingTitle, { color: textColor }]}>
                                                {role.name}
                                            </Text>
                                            <View style={[s.badge, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}>
                                                <Text style={[s.badgeText, { color: subtextColor }]}>
                                                    {role.isSystem ? 'Default Role' : 'Custom Role'}
                                                </Text>
                                            </View>
                                        </View>

                                        <Text style={[s.settingSubtitle, { color: subtextColor }]}>
                                            {role.description}
                                        </Text>

                                        {!!role.accessSummary && (
                                            <View style={s.metaRow}>
                                                <View
                                                    style={[
                                                        s.accessBadge,
                                                        {
                                                            backgroundColor: isDark
                                                                ? 'rgba(255, 149, 0, 0.15)'
                                                                : 'rgba(255, 149, 0, 0.1)',
                                                        },
                                                    ]}
                                                >
                                                    <Text style={s.accessBadgeText}>{role.accessSummary}</Text>
                                                </View>
                                            </View>
                                        )}
                                    </View>

                                    <PlatformIcon
                                        name="chevron.right"
                                        size={14}
                                        tintColor={isDark ? '#48484A' : '#C7C7CC'}
                                    />
                                </TouchableOpacity>
                            </View>
                        );
                    })}
                </View>
            </View>

            {/* Native Bottom Sheet for Adding Role */}
            <ProjectRoleEditSheet
                visible={isAddSheetOpen}
                onClose={() => onCloseAddSheet && onCloseAddSheet()}
                existingRoles={roles}
                onSave={handleSaveRole}
                onConfigurePermissions={onNavigateToPermissions}
            />

            {/* Native Bottom Sheet for Editing Role */}
            <ProjectRoleEditSheet
                visible={isEditSheetVisible}
                onClose={handleCloseEdit}
                roleItem={editingRole}
                existingRoles={roles}
                onSave={handleSaveRole}
                onDelete={handleDeleteRole}
                onConfigurePermissions={onNavigateToPermissions}
            />
        </View>
    );
}

const s = StyleSheet.create({
    container: {
        gap: 20,
        paddingHorizontal: 0,
        paddingTop: 4,
        paddingBottom: 24,
        width: '100%',
    },
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 14,
        borderRadius: 18,
    },
    infoBannerText: {
        flex: 1,
        fontSize: 13,
        lineHeight: 18,
        fontWeight: '400',
    },
    sectionBlock: {
        gap: 8,
    },
    sectionHeaderLabel: {
        fontSize: 13,
        fontWeight: '600',
        paddingHorizontal: 12,
        letterSpacing: -0.1,
    },
    cardsList: {
        gap: 10,
    },
    cardItem: {
        borderRadius: 18,
        overflow: 'hidden',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        gap: 12,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 2,
    },
    settingTitle: {
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: -0.3,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '500',
    },
    settingSubtitle: {
        fontSize: 13,
        fontWeight: '400',
        lineHeight: 18,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
    },
    accessBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    accessBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#D97706',
    },
    textCol: {
        flex: 1,
        gap: 3,
    },
});
