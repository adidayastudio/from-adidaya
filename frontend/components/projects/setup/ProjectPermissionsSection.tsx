import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
} from 'react-native';
import { GlassView } from '@/components/ui/GlassView';
import { IOSSwitch } from '@/components/ui/IOSSwitch';
import { SegmentedControl, Segment } from '@/components/ui/SegmentedControl';
import * as Haptics from 'expo-haptics';
import {
    ProjectRoleItem,
    PROJECT_PERMISSION_GROUPS,
    ProjectPermissionKey,
    RolePermissionsMap,
    DEFAULT_ROLE_PERMISSIONS,
} from '@/lib/api/projectSetup';

interface ProjectPermissionsSectionProps {
    isDark: boolean;
    textColor: string;
    subtextColor: string;
    roles: ProjectRoleItem[];
    permissions: RolePermissionsMap;
    onUpdatePermissions: (newMap: RolePermissionsMap) => void;
}

export function ProjectPermissionsSection({
    isDark,
    textColor,
    subtextColor,
    roles,
    permissions,
    onUpdatePermissions,
}: ProjectPermissionsSectionProps) {
    const [selectedRoleId, setSelectedRoleId] = useState<string>(roles[0]?.id || 'project_lead');

    // Role segments for animated sliding segmented control
    const roleSegments: Segment[] = roles.map((r) => ({
        id: r.id,
        label: r.name,
    }));

    // Resolve current role permissions or fallback to default preset
    const currentRolePermissions =
        permissions[selectedRoleId] ||
        DEFAULT_ROLE_PERMISSIONS[selectedRoleId] ||
        DEFAULT_ROLE_PERMISSIONS.member;

    const isViewProjectEnabled = !!currentRolePermissions.view_project;

    const handleTogglePermission = (permKey: ProjectPermissionKey, val: boolean) => {
        Haptics.selectionAsync();

        let updatedRolePerms = {
            ...currentRolePermissions,
            [permKey]: val,
        };

        // Dependency rule: if enabling any management/edit permission while View Project is OFF, automatically turn View Project ON
        if (val && permKey !== 'view_project' && !isViewProjectEnabled) {
            updatedRolePerms.view_project = true;
        }

        const updatedMap: RolePermissionsMap = {
            ...permissions,
            [selectedRoleId]: updatedRolePerms,
        };

        onUpdatePermissions(updatedMap);
    };

    return (
        <View style={s.container}>
            {/* 1. Animated Sliding Role Selector */}
            <View style={s.segmentedWrapper}>
                <SegmentedControl
                    segments={roleSegments}
                    activeSegment={selectedRoleId}
                    onSegmentChange={(id) => {
                        Haptics.selectionAsync();
                        setSelectedRoleId(id);
                    }}
                />
            </View>

            {/* 2. Permission Groups */}
            <View style={s.groupsContainer}>
                {PROJECT_PERMISSION_GROUPS.map((group) => {
                    return (
                        <View key={group.id} style={s.sectionBlock}>
                            <Text style={[s.sectionHeaderLabel, { color: subtextColor }]}>
                                {group.title}
                            </Text>

                            <View
                                style={[
                                    s.card,
                                    {
                                        backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                                        borderWidth: 1,
                                        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                                    },
                                ]}
                            >
                                {group.permissions.map((def, index) => {
                                    const isLast = index === group.permissions.length - 1;
                                    const isGranted = !!currentRolePermissions[def.key];
                                    const isDependentDisabled = def.key !== 'view_project' && !isViewProjectEnabled;

                                    return (
                                        <View key={def.key}>
                                            <View
                                                style={[
                                                    s.row,
                                                    isDependentDisabled && { opacity: 0.4 },
                                                ]}
                                            >
                                                <View style={s.textCol}>
                                                    <Text style={[s.settingTitle, { color: textColor }]}>
                                                        {def.label}
                                                    </Text>
                                                    <Text style={[s.settingSubtitle, { color: subtextColor }]}>
                                                        {def.description}
                                                    </Text>
                                                </View>
                                                <IOSSwitch
                                                    value={isGranted}
                                                    onValueChange={(val) => handleTogglePermission(def.key, val)}
                                                    isDark={isDark}
                                                />
                                            </View>
                                            {!isLast && (
                                                <View
                                                    style={[
                                                        s.divider,
                                                        {
                                                            backgroundColor: isDark
                                                                ? 'rgba(255,255,255,0.06)'
                                                                : 'rgba(0,0,0,0.06)',
                                                        },
                                                    ]}
                                                />
                                            )}
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                    );
                })}
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    container: {
        gap: 16,
        paddingHorizontal: 0,
        paddingTop: 4,
        paddingBottom: 24,
        width: '100%',
    },
    rolesScrollContent: {
        flexDirection: 'row',
        gap: 8,
        paddingVertical: 2,
        paddingHorizontal: 0,
    },
    rolePill: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
    },
    rolePillText: {
        fontSize: 13,
        letterSpacing: -0.2,
    },
    groupsContainer: {
        gap: 20,
        marginTop: 4,
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
    card: {
        borderRadius: 18,
        overflow: 'hidden',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        gap: 12,
        justifyContent: 'space-between',
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 16,
        marginRight: 0,
    },
    textCol: {
        flex: 1,
        gap: 2,
    },
    settingTitle: {
        fontSize: 16,
        fontWeight: '500',
        letterSpacing: -0.3,
    },
    settingSubtitle: {
        fontSize: 13,
        fontWeight: '400',
        lineHeight: 18,
    },
});
