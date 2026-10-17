import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Switch,
    Platform,
    LayoutAnimation,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import ContextMenu from '@/components/ui/PlatformContextMenu';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import {
    ResourcesConditionsStatusesSettings,
    ResourceConditionItem,
    ResourceLifecycleStatusItem,
    DamagedBehaviorOption,
} from '@/lib/api/resourcesConditionsStatuses';
import { ResourceTypeOption } from '@/lib/api/financeSetup';
import { ConditionStatusEditSheet, ConditionStatusSheetMode } from './ConditionStatusEditSheet';

interface ResourcesConditionsStatusesSectionProps {
    isDark: boolean;
    textColor: string;
    subtextColor: string;
    settings: ResourcesConditionsStatusesSettings;
    onUpdateSettings: (settings: ResourcesConditionsStatusesSettings) => void;
    isAddModalOpen: boolean;
    onCloseAddModal: () => void;
}

const RESOURCE_TYPES: ResourceTypeOption[] = ['Material', 'Tools', 'Assets', 'Services'];

const DAMAGED_BEHAVIOR_OPTIONS: DamagedBehaviorOption[] = [
    'Available',
    'Quarantine',
    'Maintenance',
];

export function ResourcesConditionsStatusesSection({
    isDark,
    textColor,
    subtextColor,
    settings,
    onUpdateSettings,
    isAddModalOpen,
    onCloseAddModal,
}: ResourcesConditionsStatusesSectionProps) {
    const [selectedType, setSelectedType] = useState<ResourceTypeOption>('Tools');

    // Edit modal states
    const [modalMode, setModalMode] = useState<ConditionStatusSheetMode>('condition');
    const [selectedCondition, setSelectedCondition] = useState<ResourceConditionItem | null>(null);
    const [selectedStatus, setSelectedStatus] = useState<ResourceLifecycleStatusItem | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Filtered lists for the active resource type
    const filteredConditions = useMemo(() => {
        return (settings.conditions || [])
            .filter((c) => c.resourceType === selectedType)
            .sort((a, b) => a.order - b.order);
    }, [settings.conditions, selectedType]);

    const filteredStatuses = useMemo(() => {
        return (settings.statuses || [])
            .filter((s) => s.resourceType === selectedType)
            .sort((a, b) => a.order - b.order);
    }, [settings.statuses, selectedType]);

    // Condition CRUD
    const handleSaveCondition = (savedItem: ResourceConditionItem) => {
        const current = settings.conditions || [];
        const exists = current.some((c) => c.id === savedItem.id);
        let updated: ResourceConditionItem[];
        if (exists) {
            updated = current.map((c) => (c.id === savedItem.id ? savedItem : c));
        } else {
            updated = [...current, savedItem];
        }
        onUpdateSettings({ ...settings, conditions: updated });
    };

    const handleDeleteCondition = (id: string) => {
        const updated = (settings.conditions || []).filter((c) => c.id !== id);
        onUpdateSettings({ ...settings, conditions: updated });
    };

    const handleToggleConditionActive = (id: string, active: boolean) => {
        Haptics.selectionAsync();
        const updated = (settings.conditions || []).map((c) =>
            c.id === id ? { ...c, active } : c
        );
        onUpdateSettings({ ...settings, conditions: updated });
    };

    const handleMoveCondition = (id: string, direction: 'up' | 'down') => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        const list = [...filteredConditions];
        const index = list.findIndex((c) => c.id === id);
        if (index === -1) return;
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= list.length) return;

        const temp = list[index];
        list[index] = list[targetIndex];
        list[targetIndex] = temp;

        // Reassign orders
        const reorderedIds = new Map(list.map((item, idx) => [item.id, idx + 1]));
        const updated = (settings.conditions || []).map((c) => {
            if (reorderedIds.has(c.id)) {
                return { ...c, order: reorderedIds.get(c.id)! };
            }
            return c;
        });
        onUpdateSettings({ ...settings, conditions: updated });
    };

    // Status CRUD
    const handleSaveStatus = (savedItem: ResourceLifecycleStatusItem) => {
        const current = settings.statuses || [];
        const exists = current.some((s) => s.id === savedItem.id);
        let updated: ResourceLifecycleStatusItem[];
        if (exists) {
            updated = current.map((s) => (s.id === savedItem.id ? savedItem : s));
        } else {
            updated = [...current, savedItem];
        }
        onUpdateSettings({ ...settings, statuses: updated });
    };

    const handleDeleteStatus = (id: string) => {
        const updated = (settings.statuses || []).filter((s) => s.id !== id);
        onUpdateSettings({ ...settings, statuses: updated });
    };

    const handleToggleStatusActive = (id: string, active: boolean) => {
        Haptics.selectionAsync();
        const updated = (settings.statuses || []).map((s) =>
            s.id === id ? { ...s, active } : s
        );
        onUpdateSettings({ ...settings, statuses: updated });
    };

    // Defaults Update
    const updateDefaultField = (key: keyof ResourcesConditionsStatusesSettings['defaults'], value: any) => {
        Haptics.selectionAsync();
        const currentDefaults = settings.defaults || {
            defaultConditionMaterial: 'New',
            defaultConditionTools: 'Good',
            defaultConditionAssets: 'New',
            defaultConditionServices: 'Good / Standard',
            defaultStatusAfterReceiving: 'Available',
            damagedItemBehavior: 'Quarantine',
        };
        onUpdateSettings({
            ...settings,
            defaults: {
                ...currentDefaults,
                [key]: value,
            },
        });
    };

    const getDefaultConditionKeyForType = (type: ResourceTypeOption): keyof ResourcesConditionsStatusesSettings['defaults'] => {
        switch (type) {
            case 'Material':
                return 'defaultConditionMaterial';
            case 'Tools':
                return 'defaultConditionTools';
            case 'Assets':
                return 'defaultConditionAssets';
            case 'Services':
                return 'defaultConditionServices';
            default:
                return 'defaultConditionMaterial';
        }
    };

    const currentDefaultConditionKey = getDefaultConditionKeyForType(selectedType);
    const currentDefaultConditionVal = settings.defaults?.[currentDefaultConditionKey] || filteredConditions[0]?.name || 'Good';

    return (
        <View style={s.container}>
            {/* Resource Type Filter Pills */}
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

            {/* Section 1: Physical Conditions */}
            <View style={s.sectionHeaderRow}>
                <Text style={[s.sectionHeader, { color: subtextColor }]}>
                    Physical Conditions ({filteredConditions.length})
                </Text>
                <TouchableOpacity
                    onPress={() => {
                        Haptics.selectionAsync();
                        setModalMode('condition');
                        setSelectedCondition(null);
                        setIsEditModalOpen(true);
                    }}
                    hitSlop={8}
                >
                    <Text style={s.addBtnText}>+ Add Condition</Text>
                </TouchableOpacity>
            </View>

            <View
                style={[
                    s.formCard,
                    { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                ]}
            >
                {filteredConditions.length === 0 ? (
                    <View style={s.emptyRow}>
                        <Text style={[s.emptyRowText, { color: subtextColor }]}>
                            No conditions configured for {selectedType}.
                        </Text>
                    </View>
                ) : (
                    filteredConditions.map((cond, idx) => {
                        const isFirst = idx === 0;
                        const isLast = idx === filteredConditions.length - 1;

                        return (
                            <View key={cond.id}>
                                {idx > 0 && (
                                    <View
                                        style={[
                                            s.divider,
                                            { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' },
                                        ]}
                                    />
                                )}
                                <View style={s.itemRow}>
                                    {/* Reorder Arrows */}
                                    <View style={s.reorderCol}>
                                        <TouchableOpacity
                                            onPress={() => handleMoveCondition(cond.id, 'up')}
                                            disabled={isFirst}
                                            style={{ opacity: isFirst ? 0.25 : 0.8 }}
                                            hitSlop={6}
                                        >
                                            <PlatformIcon name="chevron.up" size={11} tintColor={subtextColor} />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => handleMoveCondition(cond.id, 'down')}
                                            disabled={isLast}
                                            style={{ opacity: isLast ? 0.25 : 0.8 }}
                                            hitSlop={6}
                                        >
                                            <PlatformIcon name="chevron.down" size={11} tintColor={subtextColor} />
                                        </TouchableOpacity>
                                    </View>

                                    {/* Tap to edit body */}
                                    <TouchableOpacity
                                        style={s.itemContentCol}
                                        onPress={() => {
                                            Haptics.selectionAsync();
                                            setModalMode('condition');
                                            setSelectedCondition(cond);
                                            setIsEditModalOpen(true);
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <View style={s.nameBadgeRow}>
                                            <View style={[s.colorDot, { backgroundColor: cond.color }]} />
                                            <Text style={[s.itemNameText, { color: textColor }]}>
                                                {cond.name}
                                            </Text>
                                        </View>
                                        {cond.description && (
                                            <Text style={[s.itemDescText, { color: subtextColor }]} numberOfLines={1}>
                                                {cond.description}
                                            </Text>
                                        )}
                                    </TouchableOpacity>

                                    {/* Active Switch */}
                                    <Switch
                                        value={cond.active}
                                        onValueChange={(val) => handleToggleConditionActive(cond.id, val)}
                                        trackColor={{ false: '#3A3A3C', true: '#34C759' }}
                                    />
                                </View>
                            </View>
                        );
                    })
                )}
            </View>

            {/* Section 2: Lifecycle Statuses */}
            <View style={s.sectionHeaderRow}>
                <Text style={[s.sectionHeader, { color: subtextColor }]}>
                    Lifecycle Statuses ({filteredStatuses.length})
                </Text>
                <TouchableOpacity
                    onPress={() => {
                        Haptics.selectionAsync();
                        setModalMode('status');
                        setSelectedStatus(null);
                        setIsEditModalOpen(true);
                    }}
                    hitSlop={8}
                >
                    <Text style={s.addBtnText}>+ Add Status</Text>
                </TouchableOpacity>
            </View>

            <View
                style={[
                    s.formCard,
                    { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                ]}
            >
                {filteredStatuses.length === 0 ? (
                    <View style={s.emptyRow}>
                        <Text style={[s.emptyRowText, { color: subtextColor }]}>
                            No lifecycle statuses configured for {selectedType}.
                        </Text>
                    </View>
                ) : (
                    filteredStatuses.map((stat, idx) => (
                        <View key={stat.id}>
                            {idx > 0 && (
                                <View
                                    style={[
                                        s.divider,
                                        { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' },
                                    ]}
                                />
                            )}
                            <View style={s.itemRow}>
                                <TouchableOpacity
                                    style={s.itemContentCol}
                                    onPress={() => {
                                        Haptics.selectionAsync();
                                        setModalMode('status');
                                        setSelectedStatus(stat);
                                        setIsEditModalOpen(true);
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <View style={s.nameBadgeRow}>
                                        <View style={[s.colorDot, { backgroundColor: stat.color }]} />
                                        <Text style={[s.itemNameText, { color: textColor }]}>
                                            {stat.name}
                                        </Text>
                                        {stat.isTerminal && (
                                            <View style={[s.tagBadge, { backgroundColor: isDark ? 'rgba(255,149,0,0.12)' : '#FFF3E0' }]}>
                                                <Text style={s.terminalTagText}>Terminal</Text>
                                            </View>
                                        )}
                                        {stat.isSystemRequired && (
                                            <View style={[s.tagBadge, { backgroundColor: isDark ? 'rgba(0,122,255,0.12)' : '#EBF5FF' }]}>
                                                <Text style={s.systemTagText}>System</Text>
                                            </View>
                                        )}
                                    </View>
                                    {stat.description && (
                                        <Text style={[s.itemDescText, { color: subtextColor }]} numberOfLines={1}>
                                            {stat.description}
                                        </Text>
                                    )}
                                </TouchableOpacity>

                                {/* Active Switch */}
                                <Switch
                                    value={stat.active}
                                    onValueChange={(val) => handleToggleStatusActive(stat.id, val)}
                                    trackColor={{ false: '#3A3A3C', true: '#34C759' }}
                                />
                            </View>
                        </View>
                    ))
                )}
            </View>

            {/* Section 3: Defaults */}
            <Text style={[s.sectionHeader, { color: subtextColor, marginTop: 18 }]}>Defaults & Lifecycle Rules</Text>
            <View
                style={[
                    s.formCard,
                    { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                ]}
            >
                {/* Default Condition for active type */}
                <ContextMenu
                    actions={filteredConditions.map((c) => ({
                        title: c.name,
                        state: currentDefaultConditionVal === c.name ? 'on' : 'off',
                    }))}
                    dropdownMenuMode={true}
                    onPress={(e) => {
                        const cond = filteredConditions[e.nativeEvent.index];
                        if (cond) updateDefaultField(currentDefaultConditionKey, cond.name);
                    }}
                >
                    <TouchableOpacity style={s.selectRow} activeOpacity={0.7}>
                        <View style={{ flex: 1 }}>
                            <Text style={[s.selectLabel, { color: textColor }]}>Default Condition</Text>
                            <Text style={[s.selectSubtitle, { color: subtextColor }]}>
                                Applied on initial intake for {selectedType}
                            </Text>
                        </View>
                        <View style={s.selectValueBox}>
                            <Text style={[s.selectValueText, { color: '#007AFF' }]}>
                                {currentDefaultConditionVal}
                            </Text>
                            <PlatformIcon name="chevron.up.chevron.down" size={13} tintColor={subtextColor} />
                        </View>
                    </TouchableOpacity>
                </ContextMenu>

                <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                {/* Default Status After Receiving */}
                <ContextMenu
                    actions={filteredStatuses.map((s) => ({
                        title: s.name,
                        state: (settings.defaults?.defaultStatusAfterReceiving || 'Available') === s.name ? 'on' : 'off',
                    }))}
                    dropdownMenuMode={true}
                    onPress={(e) => {
                        const stat = filteredStatuses[e.nativeEvent.index];
                        if (stat) updateDefaultField('defaultStatusAfterReceiving', stat.name);
                    }}
                >
                    <TouchableOpacity style={s.selectRow} activeOpacity={0.7}>
                        <View style={{ flex: 1 }}>
                            <Text style={[s.selectLabel, { color: textColor }]}>Status After Receiving</Text>
                            <Text style={[s.selectSubtitle, { color: subtextColor }]}>
                                Immediate status once shipment receipt is confirmed
                            </Text>
                        </View>
                        <View style={s.selectValueBox}>
                            <Text style={[s.selectValueText, { color: '#007AFF' }]}>
                                {settings.defaults?.defaultStatusAfterReceiving || 'Available'}
                            </Text>
                            <PlatformIcon name="chevron.up.chevron.down" size={13} tintColor={subtextColor} />
                        </View>
                    </TouchableOpacity>
                </ContextMenu>

                <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                {/* Damaged Item Behavior */}
                <ContextMenu
                    actions={DAMAGED_BEHAVIOR_OPTIONS.map((opt) => ({
                        title: opt,
                        state: (settings.defaults?.damagedItemBehavior || 'Quarantine') === opt ? 'on' : 'off',
                    }))}
                    dropdownMenuMode={true}
                    onPress={(e) => {
                        const opt = DAMAGED_BEHAVIOR_OPTIONS[e.nativeEvent.index];
                        if (opt) updateDefaultField('damagedItemBehavior', opt);
                    }}
                >
                    <TouchableOpacity style={s.selectRow} activeOpacity={0.7}>
                        <View style={{ flex: 1 }}>
                            <Text style={[s.selectLabel, { color: textColor }]}>Damaged Item Behavior</Text>
                            <Text style={[s.selectSubtitle, { color: subtextColor }]}>
                                Automatic routing when flagged damaged
                            </Text>
                        </View>
                        <View style={s.selectValueBox}>
                            <Text style={[s.selectValueText, { color: '#007AFF' }]}>
                                {settings.defaults?.damagedItemBehavior || 'Quarantine'}
                            </Text>
                            <PlatformIcon name="chevron.up.chevron.down" size={13} tintColor={subtextColor} />
                        </View>
                    </TouchableOpacity>
                </ContextMenu>
            </View>

            {/* Add / Edit Sheet Modal */}
            <ConditionStatusEditSheet
                visible={isAddModalOpen || isEditModalOpen}
                onClose={() => {
                    if (isAddModalOpen) onCloseAddModal();
                    if (isEditModalOpen) setIsEditModalOpen(false);
                    setSelectedCondition(null);
                    setSelectedStatus(null);
                }}
                mode={modalMode}
                conditionItem={selectedCondition}
                statusItem={selectedStatus}
                defaultResourceType={selectedType}
                onSaveCondition={handleSaveCondition}
                onDeleteCondition={handleDeleteCondition}
                onSaveStatus={handleSaveStatus}
                onDeleteStatus={handleDeleteStatus}
            />
        </View>
    );
}

const s = StyleSheet.create({
    container: {
        gap: 8,
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
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
        marginTop: 14,
        marginBottom: 6,
    },
    sectionHeader: {
        fontSize: 13,
        fontWeight: '500',
    },
    addBtnText: {
        color: '#007AFF',
        fontSize: 13,
        fontWeight: '600',
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
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        gap: 12,
    },
    reorderCol: {
        alignItems: 'center',
        gap: 6,
        width: 16,
    },
    itemContentCol: {
        flex: 1,
        gap: 2,
    },
    nameBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    colorDot: {
        width: 9,
        height: 9,
        borderRadius: 5,
    },
    itemNameText: {
        fontSize: 15,
        fontWeight: '500',
        letterSpacing: -0.2,
    },
    itemDescText: {
        fontSize: 12,
        lineHeight: 16,
    },
    tagBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    terminalTagText: {
        color: '#FF9500',
        fontSize: 10,
        fontWeight: '600',
    },
    systemTagText: {
        color: '#007AFF',
        fontSize: 10,
        fontWeight: '600',
    },
    selectRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 12,
    },
    selectLabel: {
        fontSize: 15,
        fontWeight: '500',
    },
    selectSubtitle: {
        fontSize: 12,
        marginTop: 2,
    },
    selectValueBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    selectValueText: {
        fontSize: 14.5,
        fontWeight: '500',
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 16,
    },
    emptyRow: {
        padding: 20,
        alignItems: 'center',
    },
    emptyRowText: {
        fontSize: 13,
    },
});
