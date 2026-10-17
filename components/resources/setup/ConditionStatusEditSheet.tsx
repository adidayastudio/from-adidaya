import React, { useState, useEffect } from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import * as Haptics from 'expo-haptics';
import ContextMenu from '@/components/ui/PlatformContextMenu';
import {
    ResourceConditionItem,
    ResourceLifecycleStatusItem,
} from '@/lib/api/resourcesConditionsStatuses';
import { ResourceTypeOption } from '@/lib/api/financeSetup';
import { getResourceBadgeMeta } from './ResourcesClassificationSection';

export type ConditionStatusSheetMode = 'condition' | 'status';

interface ConditionStatusEditSheetProps {
    visible: boolean;
    onClose: () => void;
    mode: ConditionStatusSheetMode;
    conditionItem?: ResourceConditionItem | null;
    statusItem?: ResourceLifecycleStatusItem | null;
    defaultResourceType?: ResourceTypeOption;
    onSaveCondition: (item: ResourceConditionItem) => void;
    onDeleteCondition?: (id: string) => void;
    onSaveStatus: (item: ResourceLifecycleStatusItem) => void;
    onDeleteStatus?: (id: string) => void;
}

const COLOR_PALETTE = [
    { name: 'Green', hex: '#34C759' },
    { name: 'Blue', hex: '#007AFF' },
    { name: 'Orange', hex: '#FF9500' },
    { name: 'Red', hex: '#FF3B30' },
    { name: 'Purple', hex: '#AF52DE' },
    { name: 'Teal', hex: '#00C7BE' },
    { name: 'Gray', hex: '#8E8E93' },
    { name: 'Slate', hex: '#64748B' },
];

const RESOURCE_TYPES: ResourceTypeOption[] = ['Material', 'Tools', 'Assets', 'Services'];

export function ConditionStatusEditSheet({
    visible,
    onClose,
    mode,
    conditionItem,
    statusItem,
    defaultResourceType = 'Tools',
    onSaveCondition,
    onDeleteCondition,
    onSaveStatus,
    onDeleteStatus,
}: ConditionStatusEditSheetProps) {
    const insets = useSafeAreaInsets();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#000000';
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';

    const isCondition = mode === 'condition';
    const isEditMode = isCondition ? !!conditionItem : !!statusItem;

    const [name, setName] = useState('');
    const [resourceType, setResourceType] = useState<ResourceTypeOption>(defaultResourceType);
    const [color, setColor] = useState('#007AFF');
    const [description, setDescription] = useState('');
    const [isActive, setIsActive] = useState(true);

    // Status only fields
    const [isTerminal, setIsTerminal] = useState(false);
    const [allowManualChange, setAllowManualChange] = useState(true);

    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        if (visible) {
            setErrorMsg(null);
            if (isCondition) {
                if (conditionItem) {
                    setName(conditionItem.name || '');
                    setResourceType(conditionItem.resourceType || defaultResourceType);
                    setColor(conditionItem.color || '#007AFF');
                    setDescription(conditionItem.description || '');
                    setIsActive(conditionItem.active !== false);
                } else {
                    setName('');
                    setResourceType(defaultResourceType);
                    setColor('#34C759');
                    setDescription('');
                    setIsActive(true);
                }
            } else {
                // Status Mode
                if (statusItem) {
                    setName(statusItem.name || '');
                    setResourceType(statusItem.resourceType || defaultResourceType);
                    setColor(statusItem.color || '#007AFF');
                    setDescription(statusItem.description || '');
                    setIsActive(statusItem.active !== false);
                    setIsTerminal(!!statusItem.isTerminal);
                    setAllowManualChange(statusItem.allowManualChange !== false);
                } else {
                    setName('');
                    setResourceType(defaultResourceType);
                    setColor('#007AFF');
                    setDescription('');
                    setIsActive(true);
                    setIsTerminal(false);
                    setAllowManualChange(true);
                }
            }
        }
    }, [visible, mode, isCondition, conditionItem, statusItem, defaultResourceType]);

    const handleSave = () => {
        if (!name.trim()) {
            setErrorMsg(isCondition ? 'Condition name is required.' : 'Status name is required.');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return;
        }

        if (isCondition) {
            const item: ResourceConditionItem = {
                id: conditionItem ? conditionItem.id : `c-${Date.now()}`,
                name: name.trim(),
                resourceType,
                color,
                icon: conditionItem?.icon || 'circle.fill',
                description: description.trim() || undefined,
                active: isActive,
                isSystemDefault: conditionItem?.isSystemDefault,
                order: conditionItem ? conditionItem.order : 99,
            };
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onSaveCondition(item);
            onClose();
        } else {
            const item: ResourceLifecycleStatusItem = {
                id: statusItem ? statusItem.id : `s-${Date.now()}`,
                name: name.trim(),
                resourceType,
                color,
                icon: statusItem?.icon || 'circle.fill',
                description: description.trim() || undefined,
                active: isActive,
                isTerminal,
                allowManualChange,
                isSystemRequired: statusItem?.isSystemRequired,
                order: statusItem ? statusItem.order : 99,
            };
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onSaveStatus(item);
            onClose();
        }
    };

    const typeMeta = getResourceBadgeMeta(resourceType);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1, backgroundColor: isDark ? '#000000' : '#F2F2F7' }}
            >
                {/* Header with rounded xmark & checkmark buttons */}
                <View
                    style={[
                        s.header,
                        {
                            borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                            backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                            paddingTop: Platform.OS === 'ios' ? 14 : insets.top + 8,
                        },
                    ]}
                >
                    <TouchableOpacity
                        style={[s.circleIconBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F2F2F7' }]}
                        onPress={onClose}
                        hitSlop={8}
                    >
                        <PlatformIcon name="xmark" size={14} tintColor={textColor} />
                    </TouchableOpacity>

                    <Text style={[s.headerTitle, { color: textColor }]}>
                        {isEditMode
                            ? isCondition ? 'Edit Condition' : 'Edit Lifecycle Status'
                            : isCondition ? 'New Condition' : 'New Lifecycle Status'}
                    </Text>

                    <TouchableOpacity
                        style={[s.circleIconBtn, { backgroundColor: '#007AFF' }]}
                        onPress={handleSave}
                        hitSlop={8}
                    >
                        <PlatformIcon name="checkmark" size={14} tintColor="#FFFFFF" />
                    </TouchableOpacity>
                </View>

                <ScrollView
                    contentContainerStyle={[
                        s.scrollContent,
                        { paddingBottom: insets.bottom + 32 },
                    ]}
                    keyboardShouldPersistTaps="handled"
                >
                    {errorMsg && (
                        <View style={s.errorBanner}>
                            <PlatformIcon name="exclamationmark.triangle.fill" size={16} tintColor="#FF3B30" />
                            <Text style={s.errorBannerText}>{errorMsg}</Text>
                        </View>
                    )}

                    {/* Section 1: Definition */}
                    <Text style={[s.sectionHeader, { color: subtextColor }]}>Definition</Text>
                    <View
                        style={[
                            s.formCard,
                            { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                        ]}
                    >
                        <View style={s.inputRow}>
                            <Text style={[s.inputLabel, { color: textColor }]}>Name</Text>
                            <TextInput
                                style={[s.textInput, { color: textColor }]}
                                value={name}
                                onChangeText={(val) => {
                                    setName(val);
                                    if (errorMsg) setErrorMsg(null);
                                }}
                                placeholder={isCondition ? 'e.g. Good, Damaged' : 'e.g. Available, Maintenance'}
                                placeholderTextColor={subtextColor}
                                clearButtonMode="while-editing"
                            />
                        </View>

                        <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                        {/* Resource Type Dropdown */}
                        <ContextMenu
                            actions={RESOURCE_TYPES.map((t) => ({
                                title: t,
                                state: resourceType === t ? 'on' : 'off',
                            }))}
                            dropdownMenuMode={true}
                            onPress={(e) => {
                                Haptics.selectionAsync();
                                setResourceType(RESOURCE_TYPES[e.nativeEvent.index] || 'Tools');
                            }}
                        >
                            <TouchableOpacity style={s.selectRow} activeOpacity={0.7}>
                                <Text style={[s.inputLabel, { color: textColor }]}>Resource Type</Text>
                                <View style={s.selectValueBox}>
                                    <View
                                        style={[
                                            s.badgePill,
                                            { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F2F2F7' },
                                        ]}
                                    >
                                        <PlatformIcon
                                            name={typeMeta.icon as any}
                                            size={11.5}
                                            tintColor={typeMeta.iconColor}
                                        />
                                        <Text style={[s.badgeText, { color: textColor }]}>
                                            {typeMeta.label}
                                        </Text>
                                    </View>
                                    <PlatformIcon name="chevron.up.chevron.down" size={13} tintColor={subtextColor} />
                                </View>
                            </TouchableOpacity>
                        </ContextMenu>

                        <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                        <View style={s.inputRow}>
                            <Text style={[s.inputLabel, { color: textColor }]}>Description</Text>
                            <TextInput
                                style={[s.textInput, { color: textColor }]}
                                value={description}
                                onChangeText={setDescription}
                                placeholder="Optional description or criteria"
                                placeholderTextColor={subtextColor}
                                clearButtonMode="while-editing"
                            />
                        </View>
                    </View>

                    {/* Section 2: Color Badge Picker */}
                    <Text style={[s.sectionHeader, { color: subtextColor }]}>Badge Accent Color</Text>
                    <View
                        style={[
                            s.formCard,
                            { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', padding: 14 },
                        ]}
                    >
                        <View style={s.colorPaletteRow}>
                            {COLOR_PALETTE.map((c) => {
                                const isSelected = color === c.hex;
                                return (
                                    <TouchableOpacity
                                        key={c.hex}
                                        style={[
                                            s.colorCircle,
                                            { backgroundColor: c.hex },
                                            isSelected && s.colorCircleSelected,
                                        ]}
                                        onPress={() => {
                                            Haptics.selectionAsync();
                                            setColor(c.hex);
                                        }}
                                        activeOpacity={0.8}
                                    >
                                        {isSelected && (
                                            <PlatformIcon name="checkmark" size={13} tintColor="#FFFFFF" />
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    {/* Section 3: Status Controls */}
                    <Text style={[s.sectionHeader, { color: subtextColor }]}>Rules & Behavior</Text>
                    <View
                        style={[
                            s.formCard,
                            { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                        ]}
                    >
                        <View style={s.switchRow}>
                            <Text style={[s.inputLabel, { color: textColor }]}>Active in System</Text>
                            <Switch
                                value={isActive}
                                onValueChange={(val) => {
                                    Haptics.selectionAsync();
                                    setIsActive(val);
                                }}
                                trackColor={{ false: '#3A3A3C', true: '#34C759' }}
                            />
                        </View>

                        {!isCondition && (
                            <>
                                <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />
                                <View style={s.switchRow}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[s.switchLabel, { color: textColor }]}>Terminal Status</Text>
                                        <Text style={[s.switchSubtitle, { color: subtextColor }]}>
                                            End-of-life status (e.g. Retired, Cancelled)
                                        </Text>
                                    </View>
                                    <Switch
                                        value={isTerminal}
                                        onValueChange={(val) => {
                                            Haptics.selectionAsync();
                                            setIsTerminal(val);
                                        }}
                                        trackColor={{ false: '#3A3A3C', true: '#FF9500' }}
                                    />
                                </View>

                                <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />
                                <View style={s.switchRow}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[s.switchLabel, { color: textColor }]}>Manual Selection</Text>
                                        <Text style={[s.switchSubtitle, { color: subtextColor }]}>
                                            Allow users to manually select in transaction forms
                                        </Text>
                                    </View>
                                    <Switch
                                        value={allowManualChange}
                                        onValueChange={(val) => {
                                            Haptics.selectionAsync();
                                            setAllowManualChange(val);
                                        }}
                                        trackColor={{ false: '#3A3A3C', true: '#007AFF' }}
                                    />
                                </View>
                            </>
                        )}
                    </View>

                    {isEditMode && (
                        <View style={{ marginTop: 28, paddingHorizontal: 4 }}>
                            {(!isCondition && statusItem?.isSystemRequired) ? (
                                <View style={[s.systemLockNote, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F2F2F7' }]}>
                                    <PlatformIcon name="lock.fill" size={13} tintColor={subtextColor} />
                                    <Text style={[s.systemLockText, { color: subtextColor }]}>
                                        System-required statuses cannot be deleted. You can deactivate it above if not used.
                                    </Text>
                                </View>
                            ) : (
                                <TouchableOpacity
                                    style={[
                                        s.deleteBtn,
                                        { backgroundColor: isDark ? 'rgba(255,69,58,0.12)' : '#FFEBEA' },
                                    ]}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                        if (isCondition && conditionItem && onDeleteCondition) {
                                            onDeleteCondition(conditionItem.id);
                                        } else if (!isCondition && statusItem && onDeleteStatus) {
                                            onDeleteStatus(statusItem.id);
                                        }
                                        onClose();
                                    }}
                                >
                                    <PlatformIcon name="trash" size={16} tintColor="#FF3B30" />
                                    <Text style={s.deleteBtnText}>
                                        Delete {isCondition ? 'Condition' : 'Lifecycle Status'}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const s = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '600',
        letterSpacing: -0.3,
    },
    circleIconBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 59, 48, 0.12)',
        padding: 12,
        borderRadius: 12,
        marginBottom: 16,
        gap: 8,
    },
    errorBannerText: {
        color: '#FF3B30',
        fontSize: 13,
        fontWeight: '500',
        flex: 1,
    },
    sectionHeader: {
        fontSize: 13,
        fontWeight: '500',
        marginLeft: 4,
        marginBottom: 6,
        marginTop: 14,
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
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 13,
        justifyContent: 'space-between',
    },
    inputLabel: {
        fontSize: 15,
        fontWeight: '500',
        width: 120,
    },
    textInput: {
        flex: 1,
        fontSize: 15,
        textAlign: 'right',
        padding: 0,
    },
    selectRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 13,
    },
    selectValueBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    badgePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '500',
    },
    colorPaletteRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
    },
    colorCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    colorCircleSelected: {
        borderWidth: 2.5,
        borderColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.25,
        shadowRadius: 2,
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    switchLabel: {
        fontSize: 15,
        fontWeight: '500',
    },
    switchSubtitle: {
        fontSize: 12,
        marginTop: 1,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 16,
    },
    deleteBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 14,
        gap: 8,
    },
    deleteBtnText: {
        color: '#FF3B30',
        fontSize: 15,
        fontWeight: '600',
    },
    systemLockNote: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        gap: 8,
    },
    systemLockText: {
        fontSize: 13,
        flex: 1,
        lineHeight: 18,
    },
});
