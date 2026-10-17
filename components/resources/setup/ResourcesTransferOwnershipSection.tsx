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
    ResourcesTransferOwnershipSettings,
    OwnerScope,
    CustodianType,
    ApprovalMode,
    TransferScopeOption,
    TransferConditionMode,
    RecipientRequirement,
    TransferRequiredInfoFields,
    OWNER_SCOPE_OPTIONS,
    CUSTODIAN_TYPE_OPTIONS,
    APPROVAL_MODE_OPTIONS,
    TRANSFER_SCOPE_OPTIONS,
    TRANSFER_CONDITION_OPTIONS,
    RECIPIENT_REQ_OPTIONS,
} from '@/lib/api/resourcesTransferOwnership';
import { RequirementLevel, REQUIREMENT_LEVEL_OPTIONS } from '@/lib/api/resourcesReceivingRules';
import { ResourceTypeOption } from '@/lib/api/financeSetup';
import { ResourceLocationItem } from '@/lib/api/resourcesLocations';
import { getResourceBadgeMeta } from './ResourcesClassificationSection';

interface ResourcesTransferOwnershipSectionProps {
    isDark: boolean;
    textColor: string;
    subtextColor: string;
    settings: ResourcesTransferOwnershipSettings;
    locations: ResourceLocationItem[];
    onUpdateSettings: (settings: ResourcesTransferOwnershipSettings) => void;
}

const RESOURCE_TYPES: ResourceTypeOption[] = ['Material', 'Tools', 'Assets', 'Services'];

const TRANSFER_FIELD_CONFIGS: Array<{
    key: keyof TransferRequiredInfoFields;
    label: string;
    subtitle: string;
    icon: string;
}> = [
    { key: 'transferDate', label: 'Transfer Date', subtitle: 'Date when dispatch or handover occurs', icon: 'calendar' },
    { key: 'fromLocation', label: 'Source Location', subtitle: 'Originating warehouse, site, or room', icon: 'arrow.up.right' },
    { key: 'toLocation', label: 'Destination Location', subtitle: 'Target site, warehouse, or storage drop', icon: 'arrow.down.left' },
    { key: 'fromOwner', label: 'Originating Owner', subtitle: 'Releasing department, entity, or cost center', icon: 'building.2' },
    { key: 'toOwner', label: 'Receiving Owner', subtitle: 'Acquiring department, entity, or project', icon: 'building.2.fill' },
    { key: 'quantity', label: 'Transfer Quantity', subtitle: 'Item count or serialized unit verification', icon: 'number' },
    { key: 'condition', label: 'Condition on Dispatch', subtitle: 'State of item before shipment or handover', icon: 'checkmark.shield.fill' },
    { key: 'recipient', label: 'Recipient Name', subtitle: 'Authorized custodian or receiving supervisor', icon: 'person.fill' },
    { key: 'attachment', label: 'Surat Jalan / Photo Proof', subtitle: 'Transfer note attachment or dispatch photos', icon: 'paperclip' },
    { key: 'notes', label: 'Transfer Remarks', subtitle: 'Reason for transfer, handling, or vehicle info', icon: 'text.alignleft' },
];

export function ResourcesTransferOwnershipSection({
    isDark,
    textColor,
    subtextColor,
    settings,
    locations,
    onUpdateSettings,
}: ResourcesTransferOwnershipSectionProps) {
    const [selectedType, setSelectedType] = useState<ResourceTypeOption>('Tools');

    // Transfer destination eligible locations
    const destinationLocations = locations.filter(
        (l) => l.active && (l.isTransferDestination || l.type === 'Warehouse' || l.type === 'Site' || l.type === 'Storage')
    );

    const updateField = <K extends keyof ResourcesTransferOwnershipSettings>(
        key: K,
        val: ResourcesTransferOwnershipSettings[K]
    ) => {
        const updated = { ...settings, [key]: val };
        onUpdateSettings(updated);
    };

    const updateRequiredField = (fieldKey: keyof TransferRequiredInfoFields, level: RequirementLevel) => {
        Haptics.selectionAsync();
        const updatedFields = {
            ...settings.requiredFields,
            [fieldKey]: level,
        };
        updateField('requiredFields', updatedFields);
    };

    const updateTypeOverride = (
        type: ResourceTypeOption,
        patch: Partial<ResourcesTransferOwnershipSettings['typeOverrides'][ResourceTypeOption]>
    ) => {
        Haptics.selectionAsync();
        const current = settings.typeOverrides?.[type] || {
            resourceType: type,
            allowTransfer: type !== 'Services',
            transferUnit: type === 'Material' ? 'Quantity Based' : 'Serialized / Unit Based',
            requireApproval: true,
            requireHandoverSignoff: true,
        };
        const updatedOverrides = {
            ...settings.typeOverrides,
            [type]: {
                ...current,
                ...patch,
            },
        };
        updateField('typeOverrides', updatedOverrides as any);
    };

    const currentTypeRule = settings.typeOverrides?.[selectedType] || {
        resourceType: selectedType,
        allowTransfer: selectedType !== 'Services',
        transferUnit: selectedType === 'Material' ? 'Quantity Based' : 'Serialized / Unit Based',
        requireApproval: true,
        requireHandoverSignoff: true,
    };

    const typeMeta = getResourceBadgeMeta(selectedType);

    const getLevelBadgeStyle = (level: RequirementLevel) => {
        switch (level) {
            case 'Required':
                return {
                    color: '#007AFF',
                    bg: isDark ? 'rgba(0,122,255,0.15)' : '#EBF5FF',
                };
            case 'Optional':
                return {
                    color: '#FF9500',
                    bg: isDark ? 'rgba(255,149,0,0.15)' : '#FFF4E5',
                };
            case 'Off':
                return {
                    color: subtextColor,
                    bg: isDark ? 'rgba(255,255,255,0.06)' : '#F2F2F7',
                };
        }
    };

    return (
        <View style={s.container}>
            {/* Section 1: Ownership Rules */}
            <Text style={[s.sectionHeader, { color: subtextColor }]}>Resource Ownership</Text>
            <View
                style={[
                    s.formCard,
                    { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                ]}
            >
                {/* Default Owner Scope */}
                <ContextMenu
                    actions={OWNER_SCOPE_OPTIONS.map((opt) => ({
                        title: opt,
                        state: settings.defaultOwnerScope === opt ? 'on' : 'off',
                    }))}
                    dropdownMenuMode={true}
                    onPress={(e) => {
                        const opt = OWNER_SCOPE_OPTIONS[e.nativeEvent.index];
                        if (opt) {
                            Haptics.selectionAsync();
                            updateField('defaultOwnerScope', opt);
                        }
                    }}
                >
                    <TouchableOpacity style={s.selectRow} activeOpacity={0.7}>
                        <View style={{ flex: 1 }}>
                            <Text style={[s.formLabel, { color: textColor }]}>Default Owner Scope</Text>
                            <Text style={[s.formSubtitle, { color: subtextColor }]}>
                                Entity holding legal & financial ownership of resources
                            </Text>
                        </View>
                        <View style={s.selectValueBox}>
                            <Text style={[s.selectValueText, { color: '#007AFF' }]}>
                                {settings.defaultOwnerScope}
                            </Text>
                            <PlatformIcon name="chevron.up.chevron.down" size={13} tintColor={subtextColor} />
                        </View>
                    </TouchableOpacity>
                </ContextMenu>

                <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                {/* Allow Ownership Change */}
                <View style={s.formRow}>
                    <View style={s.labelCol}>
                        <Text style={[s.formLabel, { color: textColor }]}>Allow Ownership Reassignment</Text>
                        <Text style={[s.formSubtitle, { color: subtextColor }]}>
                            Transfer capital ownership between departments or projects
                        </Text>
                    </View>
                    <Switch
                        value={settings.allowOwnershipChange}
                        onValueChange={(val) => {
                            Haptics.selectionAsync();
                            updateField('allowOwnershipChange', val);
                        }}
                        trackColor={{ false: '#3A3A3C', true: '#34C759' }}
                    />
                </View>

                <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                {/* Require Owner */}
                <View style={s.formRow}>
                    <View style={s.labelCol}>
                        <Text style={[s.formLabel, { color: textColor }]}>Require Explicit Owner</Text>
                        <Text style={[s.formSubtitle, { color: subtextColor }]}>
                            Prevent unassigned or orphaned resources in master catalog
                        </Text>
                    </View>
                    <Switch
                        value={settings.requireOwner}
                        onValueChange={(val) => {
                            Haptics.selectionAsync();
                            updateField('requireOwner', val);
                        }}
                        trackColor={{ false: '#3A3A3C', true: '#34C759' }}
                    />
                </View>
            </View>

            {/* Section 2: Custody Management (Tools & Assets) */}
            <Text style={[s.sectionHeader, { color: subtextColor }]}>Custody & Individual Assignment</Text>
            <View
                style={[
                    s.formCard,
                    { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                ]}
            >
                {/* Enable Custody Tracking */}
                <View style={s.formRow}>
                    <View style={s.labelCol}>
                        <Text style={[s.formLabel, { color: textColor }]}>Enable Custody Tracking</Text>
                        <Text style={[s.formSubtitle, { color: subtextColor }]}>
                            Track physical holder accountability for Tools and Assets
                        </Text>
                    </View>
                    <Switch
                        value={settings.enableCustodyTracking}
                        onValueChange={(val) => {
                            Haptics.selectionAsync();
                            updateField('enableCustodyTracking', val);
                        }}
                        trackColor={{ false: '#3A3A3C', true: '#34C759' }}
                    />
                </View>

                <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                {/* Allow Individual Assignment */}
                <View style={s.formRow}>
                    <View style={s.labelCol}>
                        <Text style={[s.formLabel, { color: textColor }]}>Allow Individual Person Custody</Text>
                        <Text style={[s.formSubtitle, { color: subtextColor }]}>
                            Assign power tools or equipment directly to team members
                        </Text>
                    </View>
                    <Switch
                        value={settings.allowIndividualAssignment}
                        onValueChange={(val) => {
                            Haptics.selectionAsync();
                            updateField('allowIndividualAssignment', val);
                        }}
                        trackColor={{ false: '#3A3A3C', true: '#34C759' }}
                    />
                </View>

                <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                {/* Custodian Type */}
                <ContextMenu
                    actions={CUSTODIAN_TYPE_OPTIONS.map((opt) => ({
                        title: opt,
                        state: settings.custodianType === opt ? 'on' : 'off',
                    }))}
                    dropdownMenuMode={true}
                    onPress={(e) => {
                        const opt = CUSTODIAN_TYPE_OPTIONS[e.nativeEvent.index];
                        if (opt) {
                            Haptics.selectionAsync();
                            updateField('custodianType', opt);
                        }
                    }}
                >
                    <TouchableOpacity style={s.selectRow} activeOpacity={0.7}>
                        <View style={{ flex: 1 }}>
                            <Text style={[s.formLabel, { color: textColor }]}>Default Custodian Level</Text>
                            <Text style={[s.formSubtitle, { color: subtextColor }]}>
                                Primary holder structure for non-fixed equipment
                            </Text>
                        </View>
                        <View style={s.selectValueBox}>
                            <Text style={[s.selectValueText, { color: '#007AFF' }]}>
                                {settings.custodianType}
                            </Text>
                            <PlatformIcon name="chevron.up.chevron.down" size={13} tintColor={subtextColor} />
                        </View>
                    </TouchableOpacity>
                </ContextMenu>

                <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                {/* Require Handover Confirmation */}
                <View style={s.formRow}>
                    <View style={s.labelCol}>
                        <Text style={[s.formLabel, { color: textColor }]}>Require Handover Confirmation</Text>
                        <Text style={[s.formSubtitle, { color: subtextColor }]}>
                            Recipient must accept custody in-app to finalize assignment
                        </Text>
                    </View>
                    <Switch
                        value={settings.requireHandoverConfirmation}
                        onValueChange={(val) => {
                            Haptics.selectionAsync();
                            updateField('requireHandoverConfirmation', val);
                        }}
                        trackColor={{ false: '#3A3A3C', true: '#34C759' }}
                    />
                </View>
            </View>

            {/* Section 3: Transfer Rules & Workflow */}
            <Text style={[s.sectionHeader, { color: subtextColor }]}>Transfer Workflow & Scope</Text>
            <View
                style={[
                    s.formCard,
                    { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                ]}
            >
                {/* Default Transfer Scope */}
                <ContextMenu
                    actions={TRANSFER_SCOPE_OPTIONS.map((opt) => ({
                        title: opt,
                        state: settings.defaultTransferScope === opt ? 'on' : 'off',
                    }))}
                    dropdownMenuMode={true}
                    onPress={(e) => {
                        const opt = TRANSFER_SCOPE_OPTIONS[e.nativeEvent.index];
                        if (opt) {
                            Haptics.selectionAsync();
                            updateField('defaultTransferScope', opt);
                        }
                    }}
                >
                    <TouchableOpacity style={s.selectRow} activeOpacity={0.7}>
                        <View style={{ flex: 1 }}>
                            <Text style={[s.formLabel, { color: textColor }]}>Default Transfer Scope</Text>
                            <Text style={[s.formSubtitle, { color: subtextColor }]}>
                                Primary movement mode between organizational units
                            </Text>
                        </View>
                        <View style={s.selectValueBox}>
                            <Text style={[s.selectValueText, { color: '#007AFF' }]} numberOfLines={1}>
                                {settings.defaultTransferScope}
                            </Text>
                            <PlatformIcon name="chevron.up.chevron.down" size={13} tintColor={subtextColor} />
                        </View>
                    </TouchableOpacity>
                </ContextMenu>

                <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                {/* Transfer Numbering Preview */}
                <View style={s.formRow}>
                    <View style={s.labelCol}>
                        <Text style={[s.formLabel, { color: textColor }]}>Transfer Record Format</Text>
                        <Text style={[s.formSubtitle, { color: subtextColor }]}>
                            Generated sequence code for Surat Jalan Transfer
                        </Text>
                    </View>
                    <Text style={[s.codeText, { color: subtextColor }]}>
                        {settings.numberingSequencePreview || 'TR-YYMMXXXX'}
                    </Text>
                </View>
            </View>

            {/* Section 4: Transfer Requirements */}
            <Text style={[s.sectionHeader, { color: subtextColor }]}>Transfer Dispatch Requirements</Text>
            <View
                style={[
                    s.formCard,
                    { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                ]}
            >
                {TRANSFER_FIELD_CONFIGS.map((field, idx) => {
                    const currentLevel = settings.requiredFields?.[field.key] || 'Required';
                    const badgeStyle = getLevelBadgeStyle(currentLevel);

                    return (
                        <View key={field.key}>
                            {idx > 0 && (
                                <View
                                    style={[
                                        s.divider,
                                        { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' },
                                    ]}
                                />
                            )}
                            <ContextMenu
                                actions={REQUIREMENT_LEVEL_OPTIONS.map((lvl) => ({
                                    title: lvl,
                                    state: currentLevel === lvl ? 'on' : 'off',
                                }))}
                                dropdownMenuMode={true}
                                onPress={(e) => {
                                    const lvl = REQUIREMENT_LEVEL_OPTIONS[e.nativeEvent.index];
                                    if (lvl) updateRequiredField(field.key, lvl);
                                }}
                            >
                                <TouchableOpacity style={s.selectRow} activeOpacity={0.7}>
                                    <View style={s.fieldLabelGroup}>
                                        <Text style={[s.formLabel, { color: textColor }]}>{field.label}</Text>
                                        <Text style={[s.formSubtitle, { color: subtextColor }]}>{field.subtitle}</Text>
                                    </View>
                                    <View style={s.selectValueBox}>
                                        <View style={[s.levelBadge, { backgroundColor: badgeStyle.bg }]}>
                                            <Text style={[s.levelBadgeText, { color: badgeStyle.color }]}>
                                                {currentLevel}
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

            {/* Section 5: Approvals */}
            <Text style={[s.sectionHeader, { color: subtextColor }]}>Transfer Approvals</Text>
            <View
                style={[
                    s.formCard,
                    { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                ]}
            >
                {/* Require Transfer Approval */}
                <View style={s.formRow}>
                    <View style={s.labelCol}>
                        <Text style={[s.formLabel, { color: textColor }]}>Require Transfer Approval</Text>
                        <Text style={[s.formSubtitle, { color: subtextColor }]}>
                            Mandatory manager sign-off before dispatching resource orders
                        </Text>
                    </View>
                    <Switch
                        value={settings.requireTransferApproval}
                        onValueChange={(val) => {
                            Haptics.selectionAsync();
                            updateField('requireTransferApproval', val);
                        }}
                        trackColor={{ false: '#3A3A3C', true: '#34C759' }}
                    />
                </View>

                {settings.requireTransferApproval && (
                    <>
                        <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />
                        <ContextMenu
                            actions={APPROVAL_MODE_OPTIONS.map((opt) => ({
                                title: opt,
                                state: settings.approvalMode === opt ? 'on' : 'off',
                            }))}
                            dropdownMenuMode={true}
                            onPress={(e) => {
                                const opt = APPROVAL_MODE_OPTIONS[e.nativeEvent.index];
                                if (opt) {
                                    Haptics.selectionAsync();
                                    updateField('approvalMode', opt);
                                }
                            }}
                        >
                            <TouchableOpacity style={s.selectRow} activeOpacity={0.7}>
                                <View style={{ flex: 1 }}>
                                    <Text style={[s.formLabel, { color: textColor }]}>Approval Hierarchy</Text>
                                    <Text style={[s.formSubtitle, { color: subtextColor }]}>
                                        Workflow complexity required to release transfers
                                    </Text>
                                </View>
                                <View style={s.selectValueBox}>
                                    <Text style={[s.selectValueText, { color: '#007AFF' }]}>
                                        {settings.approvalMode}
                                    </Text>
                                    <PlatformIcon name="chevron.up.chevron.down" size={13} tintColor={subtextColor} />
                                </View>
                            </TouchableOpacity>
                        </ContextMenu>
                    </>
                )}
            </View>

            {/* Section 6: Defaults */}
            <Text style={[s.sectionHeader, { color: subtextColor }]}>Transfer Defaults</Text>
            <View
                style={[
                    s.formCard,
                    { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                ]}
            >
                {/* Default Transfer Destination */}
                <ContextMenu
                    actions={[
                        { title: 'None (Manual Selection)', state: !settings.defaultDestinationLocationId ? 'on' : 'off' },
                        ...destinationLocations.map((loc) => ({
                            title: loc.name,
                            state: settings.defaultDestinationLocationId === loc.id ? 'on' : 'off',
                        })),
                    ]}
                    dropdownMenuMode={true}
                    onPress={(e) => {
                        if (e.nativeEvent.index === 0) {
                            Haptics.selectionAsync();
                            updateField('defaultDestinationLocationId', undefined);
                            updateField('defaultDestinationLocationName', undefined);
                        } else {
                            const loc = destinationLocations[e.nativeEvent.index - 1];
                            if (loc) {
                                Haptics.selectionAsync();
                                updateField('defaultDestinationLocationId', loc.id);
                                updateField('defaultDestinationLocationName', loc.name);
                            }
                        }
                    }}
                >
                    <TouchableOpacity style={s.selectRow} activeOpacity={0.7}>
                        <View style={{ flex: 1 }}>
                            <Text style={[s.formLabel, { color: textColor }]}>Default Destination Location</Text>
                            <Text style={[s.formSubtitle, { color: subtextColor }]}>
                                Pre-filled return or primary depot site
                            </Text>
                        </View>
                        <View style={s.selectValueBox}>
                            <Text style={[s.selectValueText, { color: settings.defaultDestinationLocationId ? '#007AFF' : subtextColor }]} numberOfLines={1}>
                                {locations.find((l) => l.id === settings.defaultDestinationLocationId)?.name ||
                                    settings.defaultDestinationLocationName ||
                                    'None'}
                            </Text>
                            <PlatformIcon name="chevron.up.chevron.down" size={13} tintColor={subtextColor} />
                        </View>
                    </TouchableOpacity>
                </ContextMenu>

                <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                {/* Default Condition Rule */}
                <ContextMenu
                    actions={TRANSFER_CONDITION_OPTIONS.map((opt) => ({
                        title: opt,
                        state: settings.defaultTransferCondition === opt ? 'on' : 'off',
                    }))}
                    dropdownMenuMode={true}
                    onPress={(e) => {
                        const opt = TRANSFER_CONDITION_OPTIONS[e.nativeEvent.index];
                        if (opt) {
                            Haptics.selectionAsync();
                            updateField('defaultTransferCondition', opt);
                        }
                    }}
                >
                    <TouchableOpacity style={s.selectRow} activeOpacity={0.7}>
                        <View style={{ flex: 1 }}>
                            <Text style={[s.formLabel, { color: textColor }]}>Dispatch Condition State</Text>
                            <Text style={[s.formSubtitle, { color: subtextColor }]}>
                                Auto-carry active item condition vs require fresh audit
                            </Text>
                        </View>
                        <View style={s.selectValueBox}>
                            <Text style={[s.selectValueText, { color: '#007AFF' }]}>
                                {settings.defaultTransferCondition}
                            </Text>
                            <PlatformIcon name="chevron.up.chevron.down" size={13} tintColor={subtextColor} />
                        </View>
                    </TouchableOpacity>
                </ContextMenu>

                <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                {/* Recipient Requirement */}
                <ContextMenu
                    actions={RECIPIENT_REQ_OPTIONS.map((opt) => ({
                        title: opt,
                        state: settings.defaultRecipientRequirement === opt ? 'on' : 'off',
                    }))}
                    dropdownMenuMode={true}
                    onPress={(e) => {
                        const opt = RECIPIENT_REQ_OPTIONS[e.nativeEvent.index];
                        if (opt) {
                            Haptics.selectionAsync();
                            updateField('defaultRecipientRequirement', opt);
                        }
                    }}
                >
                    <TouchableOpacity style={s.selectRow} activeOpacity={0.7}>
                        <View style={{ flex: 1 }}>
                            <Text style={[s.formLabel, { color: textColor }]}>Recipient Verification</Text>
                            <Text style={[s.formSubtitle, { color: subtextColor }]}>
                                Enforce recipient sign-off upon delivery arrival
                            </Text>
                        </View>
                        <View style={s.selectValueBox}>
                            <Text style={[s.selectValueText, { color: settings.defaultRecipientRequirement === 'Required' ? '#007AFF' : '#FF9500' }]}>
                                {settings.defaultRecipientRequirement}
                            </Text>
                            <PlatformIcon name="chevron.up.chevron.down" size={13} tintColor={subtextColor} />
                        </View>
                    </TouchableOpacity>
                </ContextMenu>
            </View>

            {/* Section 7: Resource Type Rules */}
            <Text style={[s.sectionHeader, { color: subtextColor }]}>Resource Type Transfer Policies</Text>

            {/* Type Pills */}
            <View style={s.pillsRow}>
                {RESOURCE_TYPES.map((type) => {
                    const isSelected = selectedType === type;
                    return (
                        <TouchableOpacity
                            key={type}
                            style={[
                                s.pillBtn,
                                isSelected
                                    ? [s.pillBtnActive, { backgroundColor: isDark ? '#FFFFFF' : '#000000' }]
                                    : { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F2F2F7' },
                            ]}
                            onPress={() => {
                                Haptics.selectionAsync();
                                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                setSelectedType(type);
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
                                {type}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            <View
                style={[
                    s.formCard,
                    { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                ]}
            >
                {selectedType === 'Services' ? (
                    <View style={s.emptyNotice}>
                        <PlatformIcon name="info.circle.fill" size={18} tintColor="#007AFF" />
                        <Text style={[s.emptyNoticeText, { color: subtextColor }]}>
                            Services do not support physical transfer orders. Use Work Package / Project Scope Reassignment instead.
                        </Text>
                    </View>
                ) : (
                    <>
                        {/* Allow Transfer for Type */}
                        <View style={s.formRow}>
                            <View style={s.labelCol}>
                                <Text style={[s.formLabel, { color: textColor }]}>Allow Transfers for {selectedType}</Text>
                                <Text style={[s.formSubtitle, { color: subtextColor }]}>
                                    Enable transfer creation and Surat Jalan generation
                                </Text>
                            </View>
                            <Switch
                                value={currentTypeRule.allowTransfer}
                                onValueChange={(val) => updateTypeOverride(selectedType, { allowTransfer: val })}
                                trackColor={{ false: '#3A3A3C', true: '#34C759' }}
                            />
                        </View>

                        <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                        {/* Movement Mechanism */}
                        <View style={s.formRow}>
                            <View style={s.labelCol}>
                                <Text style={[s.formLabel, { color: textColor }]}>Tracking & Movement Mechanism</Text>
                                <Text style={[s.formSubtitle, { color: subtextColor }]}>
                                    {selectedType === 'Material'
                                        ? 'Deducts quantity from source inventory and adds to destination'
                                        : 'Transfers specific tool/asset serial instance and maintains service history'}
                                </Text>
                            </View>
                            <View style={[s.valuePill, { backgroundColor: isDark ? `${typeMeta.iconColor}25` : `${typeMeta.iconColor}15` }]}>
                                <PlatformIcon name={typeMeta.icon as any} size={11} tintColor={typeMeta.iconColor} />
                                <Text style={[s.valuePillText, { color: typeMeta.iconColor }]}>
                                    {currentTypeRule.transferUnit}
                                </Text>
                            </View>
                        </View>

                        <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                        {/* Require Signoff */}
                        <View style={s.formRow}>
                            <View style={s.labelCol}>
                                <Text style={[s.formLabel, { color: textColor }]}>Require Physical Handover Sign-off</Text>
                                <Text style={[s.formSubtitle, { color: subtextColor }]}>
                                    Mandatory dual verification from dispatcher and receiver
                                </Text>
                            </View>
                            <Switch
                                value={currentTypeRule.requireHandoverSignoff}
                                onValueChange={(val) => updateTypeOverride(selectedType, { requireHandoverSignoff: val })}
                                trackColor={{ false: '#3A3A3C', true: '#34C759' }}
                            />
                        </View>
                    </>
                )}
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
    formCard: {
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1,
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
    codeText: {
        fontSize: 13,
        fontFamily: 'Menlo',
    },
    valuePill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 5,
    },
    valuePillText: {
        fontSize: 13,
        fontWeight: '600',
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
    levelBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    levelBadgeText: {
        fontSize: 12.5,
        fontWeight: '600',
    },
    pillsRow: {
        flexDirection: 'row',
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
    emptyNotice: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 12,
    },
    emptyNoticeText: {
        flex: 1,
        fontSize: 13,
        lineHeight: 18,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 16,
    },
});
