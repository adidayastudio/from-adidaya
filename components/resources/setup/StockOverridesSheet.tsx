import React, { useState, useMemo } from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import * as Haptics from 'expo-haptics';
import { StockItemOverride } from '@/lib/api/resourcesStockRules';
import { StockOverrideEditModal } from './StockOverrideEditModal';
import { getResourceBadgeMeta } from './ResourcesClassificationSection';

interface StockOverridesSheetProps {
    visible: boolean;
    onClose: () => void;
    overrides: StockItemOverride[];
    onUpdateOverrides: (overrides: StockItemOverride[]) => void;
}

export function StockOverridesSheet({
    visible,
    onClose,
    overrides,
    onUpdateOverrides,
}: StockOverridesSheetProps) {
    const insets = useSafeAreaInsets();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#000000';
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedOverride, setSelectedOverride] = useState<StockItemOverride | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const filteredOverrides = useMemo(() => {
        if (!searchQuery.trim()) return overrides;
        const q = searchQuery.trim().toLowerCase();
        return overrides.filter(
            (ovr) =>
                ovr.itemMasterName.toLowerCase().includes(q) ||
                ovr.skuCode.toLowerCase().includes(q) ||
                ovr.skuName.toLowerCase().includes(q) ||
                (ovr.notes && ovr.notes.toLowerCase().includes(q))
        );
    }, [overrides, searchQuery]);

    const handleSaveOverride = (savedOvr: StockItemOverride) => {
        const exists = overrides.some((o) => o.id === savedOvr.id);
        let updated: StockItemOverride[];
        if (exists) {
            updated = overrides.map((o) => (o.id === savedOvr.id ? savedOvr : o));
        } else {
            updated = [savedOvr, ...overrides];
        }
        onUpdateOverrides(updated);
    };

    const handleDeleteOverride = (overrideId: string) => {
        const updated = overrides.filter((o) => o.id !== overrideId);
        onUpdateOverrides(updated);
    };

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
                    <Text style={[s.headerTitle, { color: textColor }]}>Item Stock Overrides</Text>
                    <TouchableOpacity
                        onPress={() => {
                            Haptics.selectionAsync();
                            setSelectedOverride(null);
                            setIsEditModalOpen(true);
                        }}
                        hitSlop={12}
                    >
                        <Text style={[s.headerBtn, { color: '#007AFF', fontWeight: '600' }]}>Add</Text>
                    </TouchableOpacity>
                </View>

                {/* Search Bar */}
                <View style={[s.searchContainer, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
                    <View
                        style={[
                            s.searchPill,
                            {
                                backgroundColor: isDark
                                    ? 'rgba(255,255,255,0.06)'
                                    : '#F2F2F7',
                            },
                        ]}
                    >
                        <PlatformIcon name="magnifyingglass" size={13.5} tintColor={subtextColor} />
                        <TextInput
                            style={[s.searchInput, { color: textColor }]}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholder="Search overridden items & SKUs..."
                            placeholderTextColor={subtextColor}
                            clearButtonMode="while-editing"
                            autoCapitalize="none"
                        />
                    </View>
                </View>

                <ScrollView
                    contentContainerStyle={[
                        s.scrollContent,
                        { paddingBottom: insets.bottom + 40 },
                    ]}
                >
                    {filteredOverrides.length === 0 ? (
                        <View
                            style={[
                                s.emptyCard,
                                { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                            ]}
                        >
                            <PlatformIcon name="slider.horizontal.2.square" size={30} tintColor={subtextColor} />
                            <Text style={[s.emptyTitle, { color: textColor }]}>No Item Overrides</Text>
                            <Text style={[s.emptySubtitle, { color: subtextColor }]}>
                                {searchQuery.trim()
                                    ? `No overrides match "${searchQuery}".`
                                    : 'Items without overrides inherit the default stock rules.'}
                            </Text>
                        </View>
                    ) : (
                        filteredOverrides.map((ovr) => {
                            const badgeMeta = getResourceBadgeMeta(ovr.resourceType);

                            return (
                                <TouchableOpacity
                                    key={ovr.id}
                                    style={[
                                        s.cleanCard,
                                        { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                                        !ovr.active && { opacity: 0.55 },
                                    ]}
                                    onPress={() => {
                                        Haptics.selectionAsync();
                                        setSelectedOverride(ovr);
                                        setIsEditModalOpen(true);
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <View style={s.cardTopRow}>
                                        <View style={{ flex: 1 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                <Text style={[s.itemName, { color: textColor }]} numberOfLines={1}>
                                                    {ovr.itemMasterName}
                                                </Text>
                                                <View style={s.skuBadge}>
                                                    <Text style={[s.skuBadgeText, { color: textColor }]}>{ovr.skuCode}</Text>
                                                </View>
                                            </View>
                                            <Text style={[s.skuFullName, { color: subtextColor }]} numberOfLines={1}>
                                                {ovr.skuName}
                                            </Text>
                                        </View>

                                        <View style={s.cardRightPillCol}>
                                            <View
                                                style={[
                                                    s.resourcePill,
                                                    { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F2F2F7' },
                                                ]}
                                            >
                                                <PlatformIcon
                                                    name={badgeMeta.icon as any}
                                                    size={11}
                                                    tintColor={badgeMeta.iconColor}
                                                />
                                                <Text style={[s.resourcePillText, { color: textColor }]}>
                                                    {badgeMeta.label}
                                                </Text>
                                            </View>
                                            <PlatformIcon name="chevron.right" size={13} tintColor={subtextColor} />
                                        </View>
                                    </View>

                                    {/* Inset Subcard with Threshold Metrics */}
                                    <View
                                        style={[
                                            s.innerSubcard,
                                            { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F9F9FB' },
                                        ]}
                                    >
                                        <View style={s.metricsRow}>
                                            <View style={s.metricItem}>
                                                <Text style={[s.metricLabel, { color: subtextColor }]}>Min Stock</Text>
                                                <Text style={[s.metricVal, { color: textColor }]}>
                                                    {ovr.minStock} {ovr.unit}
                                                </Text>
                                            </View>
                                            <View style={s.metricDivider} />
                                            <View style={s.metricItem}>
                                                <Text style={[s.metricLabel, { color: subtextColor }]}>Reorder Point</Text>
                                                <Text style={[s.metricVal, { color: textColor }]}>
                                                    {ovr.reorderPoint} {ovr.unit}
                                                </Text>
                                            </View>
                                            {ovr.reorderQty !== undefined && (
                                                <>
                                                    <View style={s.metricDivider} />
                                                    <View style={s.metricItem}>
                                                        <Text style={[s.metricLabel, { color: subtextColor }]}>Reorder Qty</Text>
                                                        <Text style={[s.metricVal, { color: '#007AFF' }]}>
                                                            {ovr.reorderQty} {ovr.unit}
                                                        </Text>
                                                    </View>
                                                </>
                                            )}
                                        </View>
                                        {ovr.notes && (
                                            <Text style={[s.overrideNotes, { color: subtextColor }]} numberOfLines={1}>
                                                Note: {ovr.notes}
                                            </Text>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            );
                        })
                    )}
                </ScrollView>

                {/* Edit Modal */}
                <StockOverrideEditModal
                    visible={isEditModalOpen}
                    onClose={() => {
                        setIsEditModalOpen(false);
                        setSelectedOverride(null);
                    }}
                    override={selectedOverride}
                    onSave={handleSaveOverride}
                    onDelete={handleDeleteOverride}
                />
            </View>
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
    searchContainer: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    searchPill: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 38,
        borderRadius: 19,
        paddingHorizontal: 12,
        gap: 6,
    },
    searchInput: {
        flex: 1,
        fontSize: 13.5,
        padding: 0,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 14,
        gap: 10,
    },
    cleanCard: {
        borderRadius: 16,
        padding: 14,
        gap: 10,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04,
                shadowRadius: 3,
            },
            android: {
                elevation: 1,
            },
        }),
    },
    cardTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    itemName: {
        fontSize: 15.5,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    skuBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        backgroundColor: 'rgba(0,122,255,0.08)',
    },
    skuBadgeText: {
        fontSize: 11.5,
        fontWeight: '700',
    },
    skuFullName: {
        fontSize: 12.5,
        marginTop: 2,
    },
    cardRightPillCol: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    resourcePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 7,
        paddingVertical: 3.5,
        borderRadius: 7,
    },
    resourcePillText: {
        fontSize: 11,
        fontWeight: '500',
    },
    innerSubcard: {
        borderRadius: 12,
        padding: 10,
        gap: 6,
    },
    metricsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
    },
    metricItem: {
        alignItems: 'center',
        gap: 2,
    },
    metricLabel: {
        fontSize: 11,
    },
    metricVal: {
        fontSize: 13,
        fontWeight: '600',
    },
    metricDivider: {
        width: StyleSheet.hairlineWidth,
        height: 22,
        backgroundColor: 'rgba(0,0,0,0.08)',
    },
    overrideNotes: {
        fontSize: 11.5,
        fontStyle: 'italic',
        marginTop: 2,
    },
    emptyCard: {
        borderRadius: 16,
        padding: 32,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 10,
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
        maxWidth: 280,
    },
});
