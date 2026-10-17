import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Switch,
    LayoutAnimation,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import ContextMenu from '@/components/ui/PlatformContextMenu';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import {
    ResourcesPermissionsSettings,
    ResourceRoleProfile,
    ResourceAccessScope,
    LocationAccessScope,
    PermissionState,
    RESOURCE_ACCESS_OPTIONS,
    LOCATION_ACCESS_OPTIONS,
    PERMISSION_STATE_OPTIONS,
    DEFAULT_RESOURCES_PERMISSIONS_SETTINGS,
} from '@/lib/api/resourcesPermissions';
import { ResourceTypeOption } from '@/lib/api/financeSetup';
import { getResourceBadgeMeta } from './ResourcesClassificationSection';

interface ResourcesPermissionsSectionProps {
    isDark: boolean;
    textColor: string;
    subtextColor: string;
    settings?: ResourcesPermissionsSettings;
    onUpdateSettings: (settings: ResourcesPermissionsSettings) => void;
}

const ALL_RESOURCE_TYPES: ResourceTypeOption[] = ['Material', 'Tools', 'Assets', 'Services'];

const ACTION_CONFIGS: Array<{
    key: keyof ResourceRoleProfile['actions'];
    label: string;
    subtitle: string;
    icon: string;
}> = [
    { key: 'viewResources', label: 'View Resources', subtitle: 'Search, browse catalog, view quantity and location', icon: 'eye.fill' },
    { key: 'createEditItemMaster', label: 'Create / Edit Item Master', subtitle: 'Define items, brand variants, and master SKUs', icon: 'shippingbox.fill' },
    { key: 'mergeDuplicateItems', label: 'Merge Duplicate Items', subtitle: 'Combine duplicate item masters into single SKU', icon: 'arrow.triangle.merge' },
    { key: 'receiveResources', label: 'Receive Resources', subtitle: 'Intake and confirm incoming shipments from PO', icon: 'arrow.down.doc.fill' },
    { key: 'editReceiving', label: 'Edit Receiving Records', subtitle: 'Modify confirmed receiving quantities and notes', icon: 'pencil.and.outline' },
    { key: 'transferResources', label: 'Transfer Resources', subtitle: 'Initiate and dispatch stock movement between sites', icon: 'arrow.left.arrow.right' },
    { key: 'changeOwnershipCustody', label: 'Change Ownership / Custody', subtitle: 'Reassign resource owner entity or tool custodian', icon: 'person.badge.shield.checkmark.fill' },
    { key: 'adjustStock', label: 'Adjust Stock Balance', subtitle: 'Perform manual cycle count stock adjustments', icon: 'slider.horizontal.3' },
    { key: 'changeConditionStatus', label: 'Change Condition / Status', subtitle: 'Update physical state (Good, Damaged) or lifecycle', icon: 'checklist' },
    { key: 'retireArchiveResource', label: 'Retire / Archive Resource', subtitle: 'Decommission assets and discontinue catalog items', icon: 'archivebox.fill' },
];

export function ResourcesPermissionsSection({
    isDark,
    textColor,
    subtextColor,
    settings = DEFAULT_RESOURCES_PERMISSIONS_SETTINGS,
    onUpdateSettings,
}: ResourcesPermissionsSectionProps) {
    const roles: ResourceRoleProfile[] = settings?.roles?.length ? settings.roles : DEFAULT_RESOURCES_PERMISSIONS_SETTINGS.roles;
    const activeRole: ResourceRoleProfile = roles.find((r: ResourceRoleProfile) => r.id === settings?.activeRoleId) || roles[0];

    const updateActiveRole = (patch: Partial<ResourceRoleProfile>) => {
        if (!activeRole) return;
        Haptics.selectionAsync();
        const updatedRoles = roles.map((r: ResourceRoleProfile) => {
            if (r.id === activeRole.id) {
                return { ...r, ...patch };
            }
            return r;
        });
        onUpdateSettings({ ...settings, roles: updatedRoles });
    };

    const updateAction = (actionKey: keyof ResourceRoleProfile['actions'], state: PermissionState) => {
        Haptics.selectionAsync();
        const updatedActions = {
            ...activeRole.actions,
            [actionKey]: state,
        };
        updateActiveRole({ actions: updatedActions });
    };

    const updateFinancialVisibility = (field: keyof ResourceRoleProfile['financialVisibility'], val: boolean) => {
        Haptics.selectionAsync();
        const updatedFin = {
            ...activeRole.financialVisibility,
            [field]: val,
        };
        updateActiveRole({ financialVisibility: updatedFin });
    };

    const toggleResourceTypeScope = (type: ResourceTypeOption) => {
        Haptics.selectionAsync();
        const currentTypes = activeRole.accessScope.resourceTypes || [];
        const nextTypes = currentTypes.includes(type)
            ? currentTypes.filter((t: ResourceTypeOption) => t !== type)
            : [...currentTypes, type];
        updateActiveRole({
            accessScope: {
                ...activeRole.accessScope,
                resourceTypes: nextTypes,
            },
        });
    };

    const roleActions = roles.map((r: ResourceRoleProfile) => ({
        title: r.name,
        selected: r.id === activeRole.id,
    }));

    const getPermissionBadgeStyle = (state: PermissionState) => {
        switch (state) {
            case 'Allowed':
                return {
                    color: '#34C759',
                    bg: isDark ? 'rgba(52,199,89,0.15)' : '#E8F8EE',
                };
            case 'Restricted':
                return {
                    color: '#FF9500',
                    bg: isDark ? 'rgba(255,149,0,0.15)' : '#FFF4E5',
                };
            case 'Not Allowed':
                return {
                    color: subtextColor,
                    bg: isDark ? 'rgba(255,255,255,0.06)' : '#F2F2F7',
                };
        }
    };

    return (
        <View style={s.container}>
            {/* Role Switcher Pills */}
            <Text style={[s.sectionHeader, { color: subtextColor, marginTop: 4 }]}>Configured Role Profile</Text>
            <View style={s.pillsRow}>
                {roles.map((r) => {
                    const isSelected = r.id === activeRole.id;
                    return (
                        <TouchableOpacity
                            key={r.id}
                            style={[
                                s.pillBtn,
                                isSelected
                                    ? [s.pillBtnActive, { backgroundColor: isDark ? '#FFFFFF' : '#000000' }]
                                    : { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F2F2F7' },
                            ]}
                            onPress={() => {
                                Haptics.selectionAsync();
                                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                onUpdateSettings({ ...settings, activeRoleId: r.id });
                            }}
                            activeOpacity={0.7}
                        >
                            <Text
                                style={[
                                    s.pillText,
                                    {
                                        color: isSelected ? (isDark ? '#000000' : '#FFFFFF') : textColor,
                                        fontWeight: isSelected ? '600' : '500',
                                    },
                                ]}
                            >
                                {r.name}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Role Header Info Card */}
            <View
                style={[
                    s.formCard,
                    { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', padding: 14 },
                ]}
            >
                <View style={s.roleInfoHead}>
                    <View style={s.roleTitleRow}>
                        <Text style={[s.roleNameText, { color: textColor }]}>{activeRole.name}</Text>
                        <View style={[s.levelTag, { backgroundColor: isDark ? 'rgba(175,82,222,0.15)' : '#F7EDFC' }]}>
                            <Text style={s.levelTagText}>{activeRole.roleLevel}</Text>
                        </View>
                    </View>
                    <Text style={[s.roleDescText, { color: subtextColor }]}>
                        {activeRole.description}
                    </Text>
                </View>
            </View>

            {/* Section 1: Access Scope */}
            <Text style={[s.sectionHeader, { color: subtextColor }]}>Access Scope</Text>
            <View
                style={[
                    s.formCard,
                    { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                ]}
            >
                {/* Resource Access Scope */}
                <ContextMenu
                    actions={RESOURCE_ACCESS_OPTIONS.map((opt) => ({
                        title: opt,
                        state: activeRole.accessScope.resourceAccess === opt ? 'on' : 'off',
                    }))}
                    dropdownMenuMode={true}
                    onPress={(e) => {
                        const opt = RESOURCE_ACCESS_OPTIONS[e.nativeEvent.index];
                        if (opt) {
                            updateActiveRole({
                                accessScope: {
                                    ...activeRole.accessScope,
                                    resourceAccess: opt,
                                },
                            });
                        }
                    }}
                >
                    <TouchableOpacity style={s.selectRow} activeOpacity={0.7}>
                        <View style={{ flex: 1 }}>
                            <Text style={[s.formLabel, { color: textColor }]}>Resource Access</Text>
                            <Text style={[s.formSubtitle, { color: subtextColor }]}>
                                Scope of catalog and inventory records visible to this role
                            </Text>
                        </View>
                        <View style={s.selectValueBox}>
                            <Text style={[s.selectValueText, { color: '#007AFF' }]}>
                                {activeRole.accessScope.resourceAccess}
                            </Text>
                            <PlatformIcon name="chevron.up.chevron.down" size={13} tintColor={subtextColor} />
                        </View>
                    </TouchableOpacity>
                </ContextMenu>

                <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                {/* Location Access Scope */}
                <ContextMenu
                    actions={LOCATION_ACCESS_OPTIONS.map((opt) => ({
                        title: opt,
                        state: activeRole.accessScope.locationAccess === opt ? 'on' : 'off',
                    }))}
                    dropdownMenuMode={true}
                    onPress={(e) => {
                        const opt = LOCATION_ACCESS_OPTIONS[e.nativeEvent.index];
                        if (opt) {
                            updateActiveRole({
                                accessScope: {
                                    ...activeRole.accessScope,
                                    locationAccess: opt,
                                },
                            });
                        }
                    }}
                >
                    <TouchableOpacity style={s.selectRow} activeOpacity={0.7}>
                        <View style={{ flex: 1 }}>
                            <Text style={[s.formLabel, { color: textColor }]}>Location Access</Text>
                            <Text style={[s.formSubtitle, { color: subtextColor }]}>
                                Physical sites and warehouses available for selection
                            </Text>
                        </View>
                        <View style={s.selectValueBox}>
                            <Text style={[s.selectValueText, { color: '#007AFF' }]}>
                                {activeRole.accessScope.locationAccess}
                            </Text>
                            <PlatformIcon name="chevron.up.chevron.down" size={13} tintColor={subtextColor} />
                        </View>
                    </TouchableOpacity>
                </ContextMenu>

                <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                {/* Accessible Resource Types (Multi-select Pills) */}
                <View style={s.formRow}>
                    <View style={s.labelCol}>
                        <Text style={[s.formLabel, { color: textColor }]}>Accessible Resource Types</Text>
                        <Text style={[s.formSubtitle, { color: subtextColor }]}>
                            Tap pills to toggle categories available for this role
                        </Text>
                    </View>
                </View>
                <View style={s.typesPillsWrapper}>
                    {ALL_RESOURCE_TYPES.map((type) => {
                        const isIncluded = (activeRole.accessScope.resourceTypes || []).includes(type);
                        const meta = getResourceBadgeMeta(type);
                        return (
                            <TouchableOpacity
                                key={type}
                                style={[
                                    s.typeSelectPill,
                                    isIncluded
                                        ? { backgroundColor: isDark ? `${meta.iconColor}25` : `${meta.iconColor}15`, borderColor: meta.iconColor, borderWidth: 1 }
                                        : { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F2F2F7', borderWidth: 1, borderColor: 'transparent', opacity: 0.5 },
                                ]}
                                onPress={() => toggleResourceTypeScope(type)}
                                activeOpacity={0.7}
                            >
                                <PlatformIcon
                                    name={meta.icon as any}
                                    size={12}
                                    tintColor={isIncluded ? meta.iconColor : subtextColor}
                                />
                                <Text
                                    style={[
                                        s.typeSelectPillText,
                                        { color: isIncluded ? textColor : subtextColor, fontWeight: isIncluded ? '600' : '500' },
                                    ]}
                                >
                                    {type}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            {/* Section 2: Resource Actions */}
            <Text style={[s.sectionHeader, { color: subtextColor }]}>Resource Action Permissions</Text>
            <View
                style={[
                    s.formCard,
                    { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                ]}
            >
                {ACTION_CONFIGS.map((action, idx) => {
                    const currentState = activeRole.actions?.[action.key] || 'Allowed';
                    const badgeStyle = getPermissionBadgeStyle(currentState);

                    return (
                        <View key={action.key}>
                            {idx > 0 && (
                                <View
                                    style={[
                                        s.divider,
                                        { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' },
                                    ]}
                                />
                            )}
                            <ContextMenu
                                actions={PERMISSION_STATE_OPTIONS.map((st) => ({
                                    title: st,
                                    state: currentState === st ? 'on' : 'off',
                                }))}
                                dropdownMenuMode={true}
                                onPress={(e) => {
                                    const st = PERMISSION_STATE_OPTIONS[e.nativeEvent.index];
                                    if (st) updateAction(action.key, st);
                                }}
                            >
                                <TouchableOpacity style={s.selectRow} activeOpacity={0.7}>
                                    <View style={s.fieldLabelGroup}>
                                        <Text style={[s.formLabel, { color: textColor }]}>{action.label}</Text>
                                        <Text style={[s.formSubtitle, { color: subtextColor }]}>{action.subtitle}</Text>
                                    </View>
                                    <View style={s.selectValueBox}>
                                        <View style={[s.stateBadge, { backgroundColor: badgeStyle.bg }]}>
                                            <Text style={[s.stateBadgeText, { color: badgeStyle.color }]}>
                                                {currentState}
                                            </Text>
                                        </View>
                                        <PlatformIcon name="chevron.up.chevron.down" size={13} tintColor={subtextColor} />
                                    </View>
                                </TouchableOpacity>
                            </ContextMenu>
                        </View>
                    );
                })}
            </View>

            {/* Section 3: Financial Visibility */}
            <Text style={[s.sectionHeader, { color: subtextColor }]}>Financial Visibility</Text>
            <View
                style={[
                    s.formCard,
                    { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                ]}
            >
                {/* View Acquisition Value */}
                <View style={s.formRow}>
                    <View style={s.labelCol}>
                        <Text style={[s.formLabel, { color: textColor }]}>View Acquisition Value</Text>
                        <Text style={[s.formSubtitle, { color: subtextColor }]}>
                            Display unit purchase price and valuation in item details
                        </Text>
                    </View>
                    <Switch
                        value={activeRole.financialVisibility.viewAcquisitionValue}
                        onValueChange={(val) => updateFinancialVisibility('viewAcquisitionValue', val)}
                        trackColor={{ false: '#3A3A3C', true: '#34C759' }}
                    />
                </View>

                <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                {/* View Finance Source */}
                <View style={s.formRow}>
                    <View style={s.labelCol}>
                        <Text style={[s.formLabel, { color: textColor }]}>View Finance Source Account</Text>
                        <Text style={[s.formSubtitle, { color: subtextColor }]}>
                            Display funding origin, cost center, and budget allocation link
                        </Text>
                    </View>
                    <Switch
                        value={activeRole.financialVisibility.viewFinanceSource}
                        onValueChange={(val) => updateFinancialVisibility('viewFinanceSource', val)}
                        trackColor={{ false: '#3A3A3C', true: '#34C759' }}
                    />
                </View>

                <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                {/* View Invoice / Payment References */}
                <View style={s.formRow}>
                    <View style={s.labelCol}>
                        <Text style={[s.formLabel, { color: textColor }]}>View Invoice & Payment Ref</Text>
                        <Text style={[s.formSubtitle, { color: subtextColor }]}>
                            Link directly to Finance PO and payment confirmation vouchers
                        </Text>
                    </View>
                    <Switch
                        value={activeRole.financialVisibility.viewInvoicePaymentReferences}
                        onValueChange={(val) => updateFinancialVisibility('viewInvoicePaymentReferences', val)}
                        trackColor={{ false: '#3A3A3C', true: '#34C759' }}
                    />
                </View>
            </View>

            {/* Subtle Security Notice */}
            <View style={s.securityNoticeBox}>
                <PlatformIcon name="lock.fill" size={12} tintColor={subtextColor} />
                <Text style={[s.securityNoticeText, { color: subtextColor }]}>
                    Sensitive bank account numbers, tax IDs, and payment execution approvals remain strictly governed by Finance Access Rules.
                </Text>
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    container: {
        gap: 8,
    },
    sectionHeader: {
        fontSize: 13,
        fontWeight: '500',
        paddingHorizontal: 4,
        marginTop: 12,
        marginBottom: 6,
    },
    pillsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 4,
    },
    pillBtn: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 18,
    },
    pillBtnActive: {},
    pillText: {
        fontSize: 13,
    },
    formCard: {
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1,
    },
    roleInfoHead: {
        gap: 4,
    },
    roleTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    roleNameText: {
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    levelTag: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    levelTagText: {
        color: '#AF52DE',
        fontSize: 11,
        fontWeight: '600',
    },
    roleDescText: {
        fontSize: 12.5,
        lineHeight: 17,
    },
    formRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    selectRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    labelCol: {
        flex: 1,
        paddingRight: 12,
        gap: 2,
    },
    fieldLabelGroup: {
        flex: 1,
        paddingRight: 12,
        gap: 2,
    },
    formLabel: {
        fontSize: 15,
        fontWeight: '500',
    },
    formSubtitle: {
        fontSize: 12.5,
        lineHeight: 16,
    },
    selectValueBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        maxWidth: '55%',
    },
    selectValueText: {
        fontSize: 14.5,
        fontWeight: '500',
    },
    stateBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    stateBadgeText: {
        fontSize: 12.5,
        fontWeight: '600',
    },
    typesPillsWrapper: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        paddingHorizontal: 16,
        paddingBottom: 14,
    },
    typeSelectPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        gap: 5,
    },
    typeSelectPillText: {
        fontSize: 12.5,
    },
    securityNoticeBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingHorizontal: 8,
        paddingTop: 8,
        gap: 6,
    },
    securityNoticeText: {
        flex: 1,
        fontSize: 11.5,
        lineHeight: 16,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 16,
    },
});
