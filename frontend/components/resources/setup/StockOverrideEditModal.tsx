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
import { StockItemOverride } from '@/lib/api/resourcesStockRules';
import { ResourceTypeOption } from '@/lib/api/financeSetup';

interface StockOverrideEditModalProps {
    visible: boolean;
    onClose: () => void;
    override?: StockItemOverride | null;
    onSave: (override: StockItemOverride) => void;
    onDelete?: (overrideId: string) => void;
}

const COMMON_UNITS = ['unit', 'sak', 'btg', 'pcs', 'kg', 'm', 'm2', 'm3', 'box', 'set'];

export function StockOverrideEditModal({
    visible,
    onClose,
    override,
    onSave,
    onDelete,
}: StockOverrideEditModalProps) {
    const insets = useSafeAreaInsets();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#000000';
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';

    const isEditMode = !!override;

    const [itemMasterName, setItemMasterName] = useState('');
    const [skuCode, setSkuCode] = useState('');
    const [skuName, setSkuName] = useState('');
    const [resourceType, setResourceType] = useState<ResourceTypeOption>('Material');
    const [minStock, setMinStock] = useState('10');
    const [reorderPoint, setReorderPoint] = useState('20');
    const [reorderQty, setReorderQty] = useState('50');
    const [unit, setUnit] = useState('unit');
    const [notes, setNotes] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        if (visible) {
            setErrorMsg(null);
            if (override) {
                setItemMasterName(override.itemMasterName || '');
                setSkuCode(override.skuCode || '');
                setSkuName(override.skuName || '');
                setResourceType(override.resourceType || 'Material');
                setMinStock(String(override.minStock || 0));
                setReorderPoint(String(override.reorderPoint || 0));
                setReorderQty(override.reorderQty !== undefined ? String(override.reorderQty) : '');
                setUnit(override.unit || 'unit');
                setNotes(override.notes || '');
                setIsActive(override.active !== false);
            } else {
                setItemMasterName('');
                setSkuCode('');
                setSkuName('');
                setResourceType('Material');
                setMinStock('10');
                setReorderPoint('20');
                setReorderQty('50');
                setUnit('unit');
                setNotes('');
                setIsActive(true);
            }
        }
    }, [visible, override]);

    const handleSave = () => {
        if (!itemMasterName.trim() || !skuCode.trim()) {
            setErrorMsg('Item Master name and SKU code are required.');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return;
        }

        const minVal = parseInt(minStock, 10) || 0;
        const reorderVal = parseInt(reorderPoint, 10) || 0;
        const qtyVal = reorderQty.trim() ? parseInt(reorderQty, 10) : undefined;

        const record: StockItemOverride = {
            id: override ? override.id : `ovr-${Date.now()}`,
            itemMasterId: override ? override.itemMasterId : `item-${Date.now()}`,
            itemMasterName: itemMasterName.trim(),
            skuCode: skuCode.trim(),
            skuName: skuName.trim() || `${itemMasterName.trim()} ${skuCode.trim()}`,
            resourceType,
            minStock: minVal,
            reorderPoint: reorderVal,
            reorderQty: qtyVal,
            unit: unit.trim() || 'unit',
            notes: notes.trim() || undefined,
            active: isActive,
        };

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onSave(record);
        onClose();
    };

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
                {/* Header */}
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
                        {isEditMode ? 'Edit Item Override' : 'New Item Override'}
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

                    {/* Target Item Master & SKU */}
                    <Text style={[s.sectionHeader, { color: subtextColor }]}>Item & SKU Identification</Text>
                    <View
                        style={[
                            s.formCard,
                            { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                        ]}
                    >
                        <View style={s.inputRow}>
                            <Text style={[s.inputLabel, { color: textColor }]}>Item Master</Text>
                            <TextInput
                                style={[s.textInput, { color: textColor }]}
                                value={itemMasterName}
                                onChangeText={setItemMasterName}
                                placeholder="e.g. Semen Portland, Impact Drill"
                                placeholderTextColor={subtextColor}
                                clearButtonMode="while-editing"
                            />
                        </View>

                        <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                        <View style={s.inputRow}>
                            <Text style={[s.inputLabel, { color: textColor }]}>SKU Code</Text>
                            <TextInput
                                style={[s.textInput, { color: textColor }]}
                                value={skuCode}
                                onChangeText={setSkuCode}
                                placeholder="e.g. 40 kg, HP1630"
                                placeholderTextColor={subtextColor}
                                clearButtonMode="while-editing"
                            />
                        </View>

                        <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                        <View style={s.inputRow}>
                            <Text style={[s.inputLabel, { color: textColor }]}>Full Name</Text>
                            <TextInput
                                style={[s.textInput, { color: textColor }]}
                                value={skuName}
                                onChangeText={setSkuName}
                                placeholder="e.g. Semen Gresik PCC 40 kg"
                                placeholderTextColor={subtextColor}
                                clearButtonMode="while-editing"
                            />
                        </View>
                    </View>

                    {/* Stock Override Thresholds */}
                    <Text style={[s.sectionHeader, { color: subtextColor }]}>Custom Stock Thresholds</Text>
                    <View
                        style={[
                            s.formCard,
                            { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                        ]}
                    >
                        <View style={s.inputRow}>
                            <Text style={[s.inputLabel, { color: textColor }]}>Minimum Stock</Text>
                            <TextInput
                                style={[s.textInput, { color: textColor }]}
                                value={minStock}
                                onChangeText={setMinStock}
                                placeholder="0"
                                placeholderTextColor={subtextColor}
                                keyboardType="number-pad"
                            />
                        </View>

                        <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                        <View style={s.inputRow}>
                            <Text style={[s.inputLabel, { color: textColor }]}>Reorder Point</Text>
                            <TextInput
                                style={[s.textInput, { color: textColor }]}
                                value={reorderPoint}
                                onChangeText={setReorderPoint}
                                placeholder="0"
                                placeholderTextColor={subtextColor}
                                keyboardType="number-pad"
                            />
                        </View>

                        <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                        <View style={s.inputRow}>
                            <Text style={[s.inputLabel, { color: textColor }]}>Reorder Quantity</Text>
                            <TextInput
                                style={[s.textInput, { color: textColor }]}
                                value={reorderQty}
                                onChangeText={setReorderQty}
                                placeholder="Optional suggested amount"
                                placeholderTextColor={subtextColor}
                                keyboardType="number-pad"
                            />
                        </View>

                        <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                        {/* Unit ContextMenu */}
                        <ContextMenu
                            actions={COMMON_UNITS.map((u) => ({
                                title: u,
                                state: unit === u ? 'on' : 'off',
                            }))}
                            dropdownMenuMode={true}
                            onPress={(e) => {
                                Haptics.selectionAsync();
                                setUnit(COMMON_UNITS[e.nativeEvent.index] || 'unit');
                            }}
                        >
                            <TouchableOpacity style={s.selectRow} activeOpacity={0.7}>
                                <Text style={[s.inputLabel, { color: textColor }]}>Stock Unit</Text>
                                <View style={s.selectValueBox}>
                                    <Text style={[s.selectValueText, { color: textColor }]}>{unit}</Text>
                                    <PlatformIcon name="chevron.up.chevron.down" size={13} tintColor={subtextColor} />
                                </View>
                            </TouchableOpacity>
                        </ContextMenu>
                    </View>

                    {/* Notes & Status */}
                    <Text style={[s.sectionHeader, { color: subtextColor }]}>Notes & Status</Text>
                    <View
                        style={[
                            s.formCard,
                            { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                        ]}
                    >
                        <View style={s.inputRow}>
                            <Text style={[s.inputLabel, { color: textColor }]}>Notes</Text>
                            <TextInput
                                style={[s.textInput, { color: textColor }]}
                                value={notes}
                                onChangeText={setNotes}
                                placeholder="Lead time or project specific reasoning"
                                placeholderTextColor={subtextColor}
                                clearButtonMode="while-editing"
                            />
                        </View>

                        <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                        <View style={s.switchRow}>
                            <Text style={[s.inputLabel, { color: textColor }]}>Override Active</Text>
                            <Switch
                                value={isActive}
                                onValueChange={(val) => {
                                    Haptics.selectionAsync();
                                    setIsActive(val);
                                }}
                                trackColor={{ false: '#3A3A3C', true: '#34C759' }}
                            />
                        </View>
                    </View>

                    {isEditMode && onDelete && (
                        <View style={{ marginTop: 28, paddingHorizontal: 4 }}>
                            <TouchableOpacity
                                style={[
                                    s.deleteBtn,
                                    { backgroundColor: isDark ? 'rgba(255,69,58,0.12)' : '#FFEBEA' },
                                ]}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                    if (override) onDelete(override.id);
                                    onClose();
                                }}
                            >
                                <PlatformIcon name="trash" size={16} tintColor="#FF3B30" />
                                <Text style={s.deleteBtnText}>Remove Item Override</Text>
                            </TouchableOpacity>
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
        width: 130,
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
    selectValueText: {
        fontSize: 15,
        fontWeight: '500',
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 10,
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
});
