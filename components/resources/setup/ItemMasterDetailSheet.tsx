import React, { useState } from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Platform,
    LayoutAnimation,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { BouncyGlassButton } from '@/components/ui/BouncyGlassButton';
import * as Haptics from 'expo-haptics';
import {
    ItemMasterRecord,
    ItemVariant,
    ItemSku,
} from '@/lib/api/resourcesItemMaster';
import { getResourceBadgeMeta } from './ResourcesClassificationSection';

interface ItemMasterDetailSheetProps {
    visible: boolean;
    onClose: () => void;
    item: ItemMasterRecord | null;
    onEditItem: (item: ItemMasterRecord) => void;
    onAddVariant: (item: ItemMasterRecord) => void;
    onEditVariant: (item: ItemMasterRecord, variant: ItemVariant) => void;
    onAddSku: (item: ItemMasterRecord, variant: ItemVariant) => void;
    onEditSku: (item: ItemMasterRecord, variant: ItemVariant, sku: ItemSku) => void;
}

export function ItemMasterDetailSheet({
    visible,
    onClose,
    item,
    onEditItem,
    onAddVariant,
    onEditVariant,
    onAddSku,
    onEditSku,
}: ItemMasterDetailSheetProps) {
    const insets = useSafeAreaInsets();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#000000';
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';

    // Expanded state for variants (brands)
    const [expandedVariantIds, setExpandedVariantIds] = useState<Record<string, boolean>>({});

    if (!item) return null;

    const badgeMeta = getResourceBadgeMeta(item.resourceType);

    const toggleExpandVariant = (variantId: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedVariantIds((prev) => ({
            ...prev,
            [variantId]: !prev[variantId],
        }));
    };

    const totalBrands = item.variants?.length || 0;
    const totalSkus = item.variants?.reduce((sum, v) => sum + (v.skus?.length || 0), 0) || 0;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View style={{ flex: 1, backgroundColor: isDark ? '#000000' : '#F2F2F7' }}>
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
                        <Text style={[s.headerBtn, { color: subtextColor }]}>Done</Text>
                    </TouchableOpacity>
                    <Text style={[s.headerTitle, { color: textColor }]}>Item Detail</Text>
                    <TouchableOpacity
                        onPress={() => {
                            Haptics.selectionAsync();
                            onEditItem(item);
                        }}
                        hitSlop={12}
                    >
                        <Text style={[s.headerBtn, { color: '#007AFF', fontWeight: '600' }]}>Edit</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView
                    contentContainerStyle={[
                        s.scrollContent,
                        { paddingBottom: insets.bottom + 40 },
                    ]}
                >
                    {/* Section 1: Item Identity & Form HStack Rows */}
                    <Text style={[s.sectionHeader, { color: subtextColor }]}>Master Information</Text>
                    <View
                        style={[
                            s.formCard,
                            { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                        ]}
                    >
                        {/* Item Name Row */}
                        <View style={s.formRow}>
                            <Text style={[s.formLabel, { color: subtextColor }]}>Item Name</Text>
                            <Text style={[s.formValue, { color: textColor, fontWeight: '600' }]} numberOfLines={1}>
                                {item.name}
                            </Text>
                        </View>

                        <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                        {/* Resource Type Row */}
                        <View style={s.formRow}>
                            <Text style={[s.formLabel, { color: subtextColor }]}>Resource Type</Text>
                            <View
                                style={[
                                    s.badgePill,
                                    { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F2F2F7' },
                                ]}
                            >
                                <PlatformIcon
                                    name={badgeMeta.icon as any}
                                    size={12}
                                    tintColor={badgeMeta.iconColor}
                                />
                                <Text style={[s.badgeText, { color: textColor }]}>
                                    {badgeMeta.label}
                                </Text>
                            </View>
                        </View>

                        <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                        {/* Category & Subcategory Row */}
                        <View style={s.formRow}>
                            <Text style={[s.formLabel, { color: subtextColor }]}>Category</Text>
                            <Text style={[s.formValue, { color: textColor }]} numberOfLines={1}>
                                {item.categoryName} {item.subcategoryName ? `· ${item.subcategoryName}` : ''}
                            </Text>
                        </View>

                        <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                        {/* Master Code Row */}
                        <View style={s.formRow}>
                            <Text style={[s.formLabel, { color: subtextColor }]}>Master Code</Text>
                            <Text style={[s.formCode, { color: textColor }]}>{item.code}</Text>
                        </View>

                        <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                        {/* Standard Unit Row */}
                        <View style={s.formRow}>
                            <Text style={[s.formLabel, { color: subtextColor }]}>Standard Unit</Text>
                            <Text style={[s.formValue, { color: textColor }]}>{item.standardUnit}</Text>
                        </View>

                        <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                        {/* Status Row */}
                        <View style={s.formRow}>
                            <Text style={[s.formLabel, { color: subtextColor }]}>Catalog Status</Text>
                            <View style={s.statusRow}>
                                <View style={[s.statusDot, { backgroundColor: item.active ? '#34C759' : '#8E8E93' }]} />
                                <Text style={[s.formValue, { color: textColor }]}>
                                    {item.active ? 'Active' : 'Archived'}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Section 2: Variants / Brands & Subcards */}
                    <View style={s.sectionHeaderRow}>
                        <Text style={[s.sectionHeader, { color: subtextColor }]}>
                            Brands & SKUs ({totalBrands} brands · {totalSkus} SKUs)
                        </Text>
                        <TouchableOpacity
                            onPress={() => {
                                Haptics.selectionAsync();
                                onAddVariant(item);
                            }}
                            hitSlop={8}
                        >
                            <Text style={s.addVariantText}>+ Add Brand</Text>
                        </TouchableOpacity>
                    </View>

                    {item.variants && item.variants.length > 0 ? (
                        <View style={s.variantsList}>
                            {item.variants.map((variant) => {
                                const isExpanded = expandedVariantIds[variant.id] !== false;
                                const skuCount = variant.skus?.length || 0;

                                return (
                                    <View
                                        key={variant.id}
                                        style={[
                                            s.brandCard,
                                            { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                                        ]}
                                    >
                                        {/* Brand Header */}
                                        <TouchableOpacity
                                            style={s.brandHeaderRow}
                                            onPress={() => toggleExpandVariant(variant.id)}
                                            activeOpacity={0.7}
                                        >
                                            <View style={{ flex: 1 }}>
                                                <Text style={[s.brandName, { color: textColor }]}>
                                                    {variant.brandName}
                                                </Text>
                                                <Text style={[s.brandSubtitle, { color: subtextColor }]}>
                                                    {skuCount} {skuCount === 1 ? 'SKU' : 'SKUs'}
                                                    {variant.description ? ` · ${variant.description}` : ''}
                                                </Text>
                                            </View>

                                            <View style={s.brandHeaderRight}>
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        Haptics.selectionAsync();
                                                        onEditVariant(item, variant);
                                                    }}
                                                    hitSlop={8}
                                                >
                                                    <PlatformIcon name="pencil" size={13} tintColor={subtextColor} />
                                                </TouchableOpacity>
                                                <PlatformIcon
                                                    name={isExpanded ? 'chevron.up' : 'chevron.down'}
                                                    size={13}
                                                    tintColor={subtextColor}
                                                />
                                            </View>
                                        </TouchableOpacity>

                                        {/* Expandable SKUs as Clean Inset Subcards */}
                                        {isExpanded && (
                                            <View style={s.skusSubcardContainer}>
                                                {variant.skus && variant.skus.length > 0 ? (
                                                    variant.skus.map((sku) => (
                                                        <TouchableOpacity
                                                            key={sku.id}
                                                            style={[
                                                                s.skuSubcard,
                                                                {
                                                                    backgroundColor: isDark
                                                                        ? 'rgba(255,255,255,0.04)'
                                                                        : '#F9F9FB',
                                                                },
                                                                !sku.active && { opacity: 0.5 },
                                                            ]}
                                                            onPress={() => {
                                                                Haptics.selectionAsync();
                                                                onEditSku(item, variant, sku);
                                                            }}
                                                            activeOpacity={0.7}
                                                        >
                                                            <View style={s.skuSubcardTop}>
                                                                <View style={s.skuCodeBadge}>
                                                                    <Text style={[s.skuCodeText, { color: textColor }]}>
                                                                        {sku.code}
                                                                    </Text>
                                                                </View>
                                                                <Text style={[s.skuUnitText, { color: subtextColor }]}>
                                                                    {sku.standardUnit || item.standardUnit}
                                                                </Text>
                                                            </View>

                                                            <Text style={[s.skuFullName, { color: textColor }]} numberOfLines={1}>
                                                                {sku.name}
                                                            </Text>

                                                            {sku.spec && (
                                                                <Text style={[s.skuSpecText, { color: subtextColor }]} numberOfLines={2}>
                                                                    {sku.spec}
                                                                </Text>
                                                            )}

                                                            {sku.vendorSource && (
                                                                <Text style={[s.skuVendorText, { color: subtextColor }]} numberOfLines={1}>
                                                                    Source: {sku.vendorSource}
                                                                </Text>
                                                            )}
                                                        </TouchableOpacity>
                                                    ))
                                                ) : (
                                                    <View style={s.emptySkuSubcard}>
                                                        <Text style={[s.emptySkuText, { color: subtextColor }]}>
                                                            No SKUs defined for {variant.brandName}
                                                        </Text>
                                                    </View>
                                                )}

                                                {/* Add SKU Bouncy Glass Button */}
                                                <BouncyGlassButton
                                                    isDark={isDark}
                                                    isPill={true}
                                                    isGlass={true}
                                                    onPress={() => {
                                                        setTargetItemAndAddSku(item, variant);
                                                    }}
                                                    style={s.addSkuBouncyBtn}
                                                >
                                                    <PlatformIcon name="plus" size={13} tintColor="#007AFF" />
                                                    <Text style={s.addSkuBouncyText}>Add SKU to {variant.brandName}</Text>
                                                </BouncyGlassButton>
                                            </View>
                                        )}
                                    </View>
                                );
                            })}
                        </View>
                    ) : (
                        <View
                            style={[
                                s.emptyCard,
                                { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                            ]}
                        >
                            <PlatformIcon name="square.grid.3x1.below.line.grid.1x2" size={26} tintColor={subtextColor} />
                            <Text style={[s.emptyTitle, { color: textColor }]}>No Brands / Variants Yet</Text>
                            <Text style={[s.emptySubtitle, { color: subtextColor }]}>
                                Add brands like Makita, Bosch, or Gresik with associated model SKUs.
                            </Text>
                            <BouncyGlassButton
                                isDark={isDark}
                                isPill={true}
                                isGlass={true}
                                onPress={() => {
                                    onAddVariant(item);
                                }}
                                style={s.addFirstBrandBtn}
                            >
                                <PlatformIcon name="plus" size={13} tintColor="#007AFF" />
                                <Text style={s.addFirstBrandText}>Add First Brand</Text>
                            </BouncyGlassButton>
                        </View>
                    )}
                </ScrollView>
            </View>
        </Modal>
    );

    function setTargetItemAndAddSku(master: ItemMasterRecord, v: ItemVariant) {
        Haptics.selectionAsync();
        onAddSku(master, v);
    }
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
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
        marginTop: 18,
        marginBottom: 8,
    },
    sectionHeader: {
        fontSize: 13,
        fontWeight: '500',
        marginLeft: 4,
        marginBottom: 6,
    },
    addVariantText: {
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
    formRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 13,
    },
    formLabel: {
        fontSize: 14.5,
        fontWeight: '400',
    },
    formValue: {
        fontSize: 14.5,
        fontWeight: '500',
        maxWidth: '65%',
        textAlign: 'right',
    },
    formCode: {
        fontSize: 14,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        fontWeight: '600',
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
    divider: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 16,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statusDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
    },
    variantsList: {
        gap: 12,
    },
    brandCard: {
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1,
    },
    brandHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    brandName: {
        fontSize: 16.5,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    brandSubtitle: {
        fontSize: 12.5,
        marginTop: 2,
    },
    brandHeaderRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    skusSubcardContainer: {
        paddingHorizontal: 14,
        paddingBottom: 14,
        gap: 8,
    },
    skuSubcard: {
        borderRadius: 12,
        padding: 12,
        gap: 4,
    },
    skuSubcardTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 2,
    },
    skuCodeBadge: {
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 6,
        backgroundColor: 'rgba(0,122,255,0.08)',
    },
    skuCodeText: {
        fontSize: 13,
        fontWeight: '700',
    },
    skuUnitText: {
        fontSize: 12,
        fontWeight: '500',
    },
    skuFullName: {
        fontSize: 14,
        fontWeight: '600',
    },
    skuSpecText: {
        fontSize: 12,
        lineHeight: 16,
    },
    skuVendorText: {
        fontSize: 11.5,
        marginTop: 2,
    },
    emptySkuSubcard: {
        paddingVertical: 14,
        alignItems: 'center',
    },
    emptySkuText: {
        fontSize: 12.5,
    },
    addSkuBouncyBtn: {
        height: 36,
        borderRadius: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        marginTop: 4,
    },
    addSkuBouncyText: {
        color: '#007AFF',
        fontSize: 13,
        fontWeight: '600',
    },
    emptyCard: {
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginTop: 4,
    },
    emptySubtitle: {
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 18,
        maxWidth: 260,
    },
    addFirstBrandBtn: {
        height: 36,
        paddingHorizontal: 16,
        borderRadius: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        marginTop: 8,
    },
    addFirstBrandText: {
        color: '#007AFF',
        fontSize: 13,
        fontWeight: '600',
    },
});
