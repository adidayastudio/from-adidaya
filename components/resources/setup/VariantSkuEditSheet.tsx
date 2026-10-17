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
    ItemMasterRecord,
    ItemVariant,
    ItemSku,
} from '@/lib/api/resourcesItemMaster';

export type VariantSkuMode = 'add_variant' | 'edit_variant' | 'add_sku' | 'edit_sku';

interface VariantSkuEditSheetProps {
    visible: boolean;
    onClose: () => void;
    mode: VariantSkuMode;
    item: ItemMasterRecord | null;
    variant?: ItemVariant | null;
    sku?: ItemSku | null;
    onSaveVariant: (variant: ItemVariant) => void;
    onDeleteVariant?: (variantId: string) => void;
    onSaveSku: (variantId: string, sku: ItemSku) => void;
    onDeleteSku?: (variantId: string, skuId: string) => void;
}

const COMMON_UNITS = ['unit', 'sak', 'btg', 'pcs', 'kg', 'm', 'm2', 'm3', 'box', 'set', 'jam', 'hari', 'bln'];

export function VariantSkuEditSheet({
    visible,
    onClose,
    mode,
    item,
    variant,
    sku,
    onSaveVariant,
    onDeleteVariant,
    onSaveSku,
    onDeleteSku,
}: VariantSkuEditSheetProps) {
    const insets = useSafeAreaInsets();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#000000';
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';

    const isVariantMode = mode === 'add_variant' || mode === 'edit_variant';

    // Variant states
    const [brandName, setBrandName] = useState('');
    const [brandDescription, setBrandDescription] = useState('');

    // SKU states
    const [skuCode, setSkuCode] = useState('');
    const [skuName, setSkuName] = useState('');
    const [skuSpec, setSkuSpec] = useState('');
    const [standardUnit, setStandardUnit] = useState('unit');
    const [vendorSource, setVendorSource] = useState('');
    const [isActive, setIsActive] = useState(true);

    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        if (visible) {
            setErrorMsg(null);
            if (isVariantMode) {
                if (variant) {
                    setBrandName(variant.brandName || '');
                    setBrandDescription(variant.description || '');
                } else {
                    setBrandName('');
                    setBrandDescription('');
                }
            } else {
                // SKU Mode
                if (sku) {
                    setSkuCode(sku.code || '');
                    setSkuName(sku.name || '');
                    setSkuSpec(sku.spec || '');
                    setStandardUnit(sku.standardUnit || item?.standardUnit || 'unit');
                    setVendorSource(sku.vendorSource || '');
                    setIsActive(sku.active !== false);
                } else {
                    setSkuCode('');
                    setSkuName('');
                    setSkuSpec('');
                    setStandardUnit(item?.standardUnit || 'unit');
                    setVendorSource('');
                    setIsActive(true);
                }
            }
        }
    }, [visible, mode, isVariantMode, variant, sku, item]);

    const handleSave = () => {
        if (isVariantMode) {
            if (!brandName.trim()) {
                setErrorMsg('Brand/Variant name is required.');
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                return;
            }

            const updatedVariant: ItemVariant = {
                id: variant ? variant.id : `var-${Date.now()}`,
                brandName: brandName.trim(),
                description: brandDescription.trim() || undefined,
                skus: variant ? variant.skus : [],
            };

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onSaveVariant(updatedVariant);
            onClose();
        } else {
            // SKU Mode
            if (!variant) {
                setErrorMsg('Parent brand/variant must be specified.');
                return;
            }
            if (!skuCode.trim()) {
                setErrorMsg('SKU Code / Model is required (e.g. HP1630, 40 kg).');
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                return;
            }

            const updatedSku: ItemSku = {
                id: sku ? sku.id : `sku-${Date.now()}`,
                code: skuCode.trim(),
                name: skuName.trim() || `${variant.brandName} ${skuCode.trim()}`,
                spec: skuSpec.trim() || undefined,
                standardUnit: standardUnit.trim() || item?.standardUnit || 'unit',
                vendorSource: vendorSource.trim() || undefined,
                active: isActive,
            };

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onSaveSku(variant.id, updatedSku);
            onClose();
        }
    };

    const getSheetTitle = () => {
        switch (mode) {
            case 'add_variant':
                return 'Add Brand / Variant';
            case 'edit_variant':
                return 'Edit Brand / Variant';
            case 'add_sku':
                return 'Add SKU / Detail';
            case 'edit_sku':
                return 'Edit SKU / Detail';
        }
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
                            paddingTop: Platform.OS === 'ios' ? 16 : insets.top + 8,
                        },
                    ]}
                >
                    <TouchableOpacity onPress={onClose} hitSlop={12}>
                        <Text style={[s.headerBtn, { color: subtextColor }]}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={[s.headerTitle, { color: textColor }]}>
                        {getSheetTitle()}
                    </Text>
                    <TouchableOpacity onPress={handleSave} hitSlop={12}>
                        <Text style={[s.headerBtn, { color: '#007AFF', fontWeight: '600' }]}>Save</Text>
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

                    {/* Context info: Item Master */}
                    {item && (
                        <View
                            style={[
                                s.infoBox,
                                { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFFFFF' },
                            ]}
                        >
                            <Text style={[s.infoBoxLabel, { color: subtextColor }]}>Parent Item Master</Text>
                            <Text style={[s.infoBoxValue, { color: textColor }]}>
                                {item.name} · <Text style={{ color: subtextColor }}>{item.code}</Text>
                            </Text>
                            {!isVariantMode && variant && (
                                <Text style={[s.infoBoxSubValue, { color: subtextColor }]}>
                                    Brand: <Text style={{ color: textColor, fontWeight: '500' }}>{variant.brandName}</Text>
                                </Text>
                            )}
                        </View>
                    )}

                    {isVariantMode ? (
                        <>
                            {/* Brand / Variant Form */}
                            <Text style={[s.sectionHeader, { color: subtextColor }]}>Brand / Variant Details</Text>
                            <View
                                style={[
                                    s.formCard,
                                    { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                                ]}
                            >
                                <View style={s.inputRow}>
                                    <Text style={[s.inputLabel, { color: textColor }]}>Brand Name</Text>
                                    <TextInput
                                        style={[s.textInput, { color: textColor }]}
                                        value={brandName}
                                        onChangeText={(val) => {
                                            setBrandName(val);
                                            if (errorMsg) setErrorMsg(null);
                                        }}
                                        placeholder="e.g. Makita, Gresik, MacBook"
                                        placeholderTextColor={subtextColor}
                                        clearButtonMode="while-editing"
                                    />
                                </View>

                                <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                                <View style={s.inputRow}>
                                    <Text style={[s.inputLabel, { color: textColor }]}>Description</Text>
                                    <TextInput
                                        style={[s.textInput, { color: textColor }]}
                                        value={brandDescription}
                                        onChangeText={setBrandDescription}
                                        placeholder="Optional notes or line series"
                                        placeholderTextColor={subtextColor}
                                        clearButtonMode="while-editing"
                                    />
                                </View>
                            </View>

                            {mode === 'edit_variant' && variant && onDeleteVariant && (
                                <View style={{ marginTop: 28, paddingHorizontal: 4 }}>
                                    <TouchableOpacity
                                        style={[
                                            s.deleteBtn,
                                            { backgroundColor: isDark ? 'rgba(255,69,58,0.12)' : '#FFEBEA' },
                                        ]}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                            onDeleteVariant(variant.id);
                                            onClose();
                                        }}
                                    >
                                        <PlatformIcon name="trash" size={16} tintColor="#FF3B30" />
                                        <Text style={s.deleteBtnText}>Delete Brand / Variant</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </>
                    ) : (
                        <>
                            {/* SKU / Detail Form */}
                            <Text style={[s.sectionHeader, { color: subtextColor }]}>SKU / Model Info</Text>
                            <View
                                style={[
                                    s.formCard,
                                    { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                                ]}
                            >
                                <View style={s.inputRow}>
                                    <Text style={[s.inputLabel, { color: textColor }]}>SKU / Model</Text>
                                    <TextInput
                                        style={[s.textInput, { color: textColor }]}
                                        value={skuCode}
                                        onChangeText={(val) => {
                                            setSkuCode(val);
                                            if (errorMsg) setErrorMsg(null);
                                        }}
                                        placeholder="e.g. HP1630, 40 kg, M5 16/512"
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
                                        placeholder="Optional full item label"
                                        placeholderTextColor={subtextColor}
                                        clearButtonMode="while-editing"
                                    />
                                </View>

                                <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                                <View style={s.inputRow}>
                                    <Text style={[s.inputLabel, { color: textColor }]}>Specification</Text>
                                    <TextInput
                                        style={[s.textInput, { color: textColor }]}
                                        value={skuSpec}
                                        onChangeText={setSkuSpec}
                                        placeholder="e.g. 710W · 13mm Chuck"
                                        placeholderTextColor={subtextColor}
                                        clearButtonMode="while-editing"
                                    />
                                </View>

                                <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                                {/* Standard Unit Dropdown */}
                                <ContextMenu
                                    actions={COMMON_UNITS.map((u) => ({
                                        title: u,
                                        state: standardUnit.toLowerCase() === u ? 'on' : 'off',
                                    }))}
                                    dropdownMenuMode={true}
                                    onPress={(e) => {
                                        Haptics.selectionAsync();
                                        setStandardUnit(COMMON_UNITS[e.nativeEvent.index] || 'unit');
                                    }}
                                >
                                    <TouchableOpacity style={s.selectRow} activeOpacity={0.7}>
                                        <Text style={[s.inputLabel, { color: textColor }]}>Unit</Text>
                                        <View style={s.selectValueBox}>
                                            <Text style={[s.selectValueText, { color: textColor }]}>
                                                {standardUnit}
                                            </Text>
                                            <PlatformIcon name="chevron.up.chevron.down" size={13} tintColor={subtextColor} />
                                        </View>
                                    </TouchableOpacity>
                                </ContextMenu>
                            </View>

                            {/* Vendor Source Info */}
                            <Text style={[s.sectionHeader, { color: subtextColor }]}>Vendor / Source (Supporting)</Text>
                            <View
                                style={[
                                    s.formCard,
                                    { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                                ]}
                            >
                                <View style={s.inputRow}>
                                    <Text style={[s.inputLabel, { color: textColor }]}>Preferred Vendor</Text>
                                    <TextInput
                                        style={[s.textInput, { color: textColor }]}
                                        value={vendorSource}
                                        onChangeText={setVendorSource}
                                        placeholder="e.g. PT Sumber Perkasa Teknik"
                                        placeholderTextColor={subtextColor}
                                        clearButtonMode="while-editing"
                                    />
                                </View>
                            </View>

                            {/* Status */}
                            <Text style={[s.sectionHeader, { color: subtextColor }]}>Status</Text>
                            <View
                                style={[
                                    s.formCard,
                                    { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                                ]}
                            >
                                <View style={s.switchRow}>
                                    <Text style={[s.switchLabel, { color: textColor }]}>Active SKU</Text>
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

                            {mode === 'edit_sku' && variant && sku && onDeleteSku && (
                                <View style={{ marginTop: 28, paddingHorizontal: 4 }}>
                                    <TouchableOpacity
                                        style={[
                                            s.deleteBtn,
                                            { backgroundColor: isDark ? 'rgba(255,69,58,0.12)' : '#FFEBEA' },
                                        ]}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                            onDeleteSku(variant.id, sku.id);
                                            onClose();
                                        }}
                                    >
                                        <PlatformIcon name="trash" size={16} tintColor="#FF3B30" />
                                        <Text style={s.deleteBtnText}>Delete SKU</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </>
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
    headerBtn: {
        fontSize: 16,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    infoBox: {
        padding: 14,
        borderRadius: 14,
        marginBottom: 16,
        gap: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1,
    },
    infoBoxLabel: {
        fontSize: 12,
        fontWeight: '500',
    },
    infoBoxValue: {
        fontSize: 15,
        fontWeight: '600',
    },
    infoBoxSubValue: {
        fontSize: 13,
        marginTop: 2,
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
        marginTop: 12,
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
    selectValueText: {
        fontSize: 15,
        fontWeight: '500',
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 16,
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
