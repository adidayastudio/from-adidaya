import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    ScrollView,
    TextInput,
    Platform,
    Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassView } from '@/components/ui/GlassView';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import * as Haptics from 'expo-haptics';
import { UnitConversionItem, UnitItem } from '@/lib/api/resourcesSetup';
import { UnitConversionEditModal } from './UnitConversionEditModal';

export interface UnitConversionsSheetProps {
    visible: boolean;
    conversions: UnitConversionItem[];
    units?: UnitItem[];
    onClose: () => void;
    onUpdateConversions: (conversions: UnitConversionItem[]) => void;
}

export function UnitConversionsSheet({
    visible,
    conversions,
    units,
    onClose,
    onUpdateConversions,
}: UnitConversionsSheetProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';
    const insets = useSafeAreaInsets();

    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'all' | 'global' | 'item'>('all');
    const [editingConversion, setEditingConversion] = useState<UnitConversionItem | null>(null);
    const [editModalVisible, setEditModalVisible] = useState(false);

    const filteredConversions = useMemo(() => {
        return conversions.filter((c) => {
            const matchesTab = activeTab === 'all' || c.scope === activeTab;
            const q = searchQuery.toLowerCase().trim();
            const matchesSearch =
                !q ||
                c.fromUnitSymbol.toLowerCase().includes(q) ||
                c.toUnitSymbol.toLowerCase().includes(q) ||
                (c.itemName && c.itemName.toLowerCase().includes(q)) ||
                (c.description && c.description.toLowerCase().includes(q));
            return matchesTab && matchesSearch;
        });
    }, [conversions, activeTab, searchQuery]);

    const handleSaveConversion = (saved: UnitConversionItem) => {
        const exists = conversions.some((c) => c.id === saved.id);
        let updated: UnitConversionItem[];
        if (exists) {
            updated = conversions.map((c) => (c.id === saved.id ? saved : c));
        } else {
            updated = [saved, ...conversions];
        }
        onUpdateConversions(updated);
    };

    const handleDeleteConversion = (id: string) => {
        Alert.alert(
            'Delete Conversion',
            'Are you sure you want to remove this conversion rule?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        onUpdateConversions(conversions.filter((c) => c.id !== id));
                    },
                },
            ]
        );
    };

    const handleOpenEdit = (conv: UnitConversionItem) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setEditingConversion(conv);
        setEditModalVisible(true);
    };

    const handleOpenAdd = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setEditingConversion(null);
        setEditModalVisible(true);
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View style={[s.container, { backgroundColor: isDark ? '#000' : '#F2F2F7' }]}>
                {/* Header */}
                <View style={s.header}>
                    <TouchableOpacity onPress={onClose} style={s.headerBtn}>
                        <Text style={[s.headerBtnText, { color: subtextColor }]}>Close</Text>
                    </TouchableOpacity>
                    <Text style={[s.headerTitle, { color: textColor }]}>Unit Conversions</Text>
                    <TouchableOpacity onPress={handleOpenAdd} style={s.headerBtn}>
                        <PlatformIcon name="plus" size={20} tintColor="#007AFF" />
                    </TouchableOpacity>
                </View>

                {/* Search Bar */}
                <View style={s.searchContainer}>
                    <View
                        style={[
                            s.searchBox,
                            {
                                backgroundColor: isDark
                                    ? 'rgba(255,255,255,0.06)'
                                    : 'rgba(0,0,0,0.04)',
                            },
                        ]}
                    >
                        <PlatformIcon name="magnifyingglass" size={16} tintColor={subtextColor} />
                        <TextInput
                            style={[s.searchInput, { color: textColor }]}
                            placeholder="Search conversions..."
                            placeholderTextColor={subtextColor}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <PlatformIcon
                                    name="xmark.circle.fill"
                                    size={16}
                                    tintColor={subtextColor}
                                />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Scope Filter Tabs */}
                <View style={s.tabsWrapper}>
                    <TouchableOpacity
                        onPress={() => setActiveTab('all')}
                        style={[
                            s.tabBtn,
                            activeTab === 'all'
                                ? { backgroundColor: '#007AFF' }
                                : {
                                      backgroundColor: isDark
                                          ? 'rgba(255,255,255,0.06)'
                                          : 'rgba(0,0,0,0.04)',
                                  },
                        ]}
                    >
                        <Text
                            style={[
                                s.tabBtnText,
                                { color: activeTab === 'all' ? '#FFF' : textColor },
                            ]}
                        >
                            All ({conversions.length})
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => setActiveTab('global')}
                        style={[
                            s.tabBtn,
                            activeTab === 'global'
                                ? { backgroundColor: '#007AFF' }
                                : {
                                      backgroundColor: isDark
                                          ? 'rgba(255,255,255,0.06)'
                                          : 'rgba(0,0,0,0.04)',
                                  },
                        ]}
                    >
                        <Text
                            style={[
                                s.tabBtnText,
                                { color: activeTab === 'global' ? '#FFF' : textColor },
                            ]}
                        >
                            Universal
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => setActiveTab('item')}
                        style={[
                            s.tabBtn,
                            activeTab === 'item'
                                ? { backgroundColor: '#007AFF' }
                                : {
                                      backgroundColor: isDark
                                          ? 'rgba(255,255,255,0.06)'
                                          : 'rgba(0,0,0,0.04)',
                                  },
                        ]}
                    >
                        <Text
                            style={[
                                s.tabBtnText,
                                { color: activeTab === 'item' ? '#FFF' : textColor },
                            ]}
                        >
                            Item-Specific
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* List */}
                <ScrollView
                    contentContainerStyle={[
                        s.listScroll,
                        { paddingBottom: insets.bottom + 40 },
                    ]}
                    showsVerticalScrollIndicator={false}
                >
                    <GlassView
                        intensity={isDark ? 10 : 25}
                        style={[
                            s.listCard,
                            {
                                backgroundColor: isDark
                                    ? 'rgba(255,255,255,0.02)'
                                    : 'rgba(255,255,255,0.85)',
                            },
                        ]}
                    >
                        {filteredConversions.map((conv, idx) => {
                            const isLast = idx === filteredConversions.length - 1;
                            const isGlobal = conv.scope === 'global';

                            return (
                                <View key={conv.id}>
                                    <TouchableOpacity
                                        style={s.convRow}
                                        onPress={() => handleOpenEdit(conv)}
                                        onLongPress={() => handleDeleteConversion(conv.id)}
                                        activeOpacity={0.7}
                                    >
                                        {/* Ratio Graphic Box */}
                                        <View
                                            style={[
                                                s.ratioBadge,
                                                {
                                                    backgroundColor: isGlobal
                                                        ? isDark
                                                            ? 'rgba(0,122,255,0.15)'
                                                            : 'rgba(0,122,255,0.08)'
                                                        : isDark
                                                        ? 'rgba(255,149,0,0.15)'
                                                        : 'rgba(255,149,0,0.08)',
                                                },
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    s.ratioFormula,
                                                    { color: isGlobal ? '#007AFF' : '#FF9500' },
                                                ]}
                                            >
                                                1 {conv.fromUnitSymbol}
                                            </Text>
                                            <PlatformIcon
                                                name="arrow.right"
                                                size={10}
                                                tintColor={isGlobal ? '#007AFF' : '#FF9500'}
                                            />
                                            <Text
                                                style={[
                                                    s.ratioFormula,
                                                    { color: isGlobal ? '#007AFF' : '#FF9500' },
                                                ]}
                                            >
                                                {conv.factor} {conv.toUnitSymbol}
                                            </Text>
                                        </View>

                                        {/* Conversion Details */}
                                        <View style={s.convInfoCol}>
                                            <View style={s.titleRow}>
                                                <Text style={[s.convTitle, { color: textColor }]}>
                                                    {isGlobal
                                                        ? `1 ${conv.fromUnitSymbol} = ${conv.factor.toLocaleString()} ${conv.toUnitSymbol}`
                                                        : conv.itemName || 'Custom Item Conversion'}
                                                </Text>
                                                <View
                                                    style={[
                                                        s.scopeBadge,
                                                        {
                                                            backgroundColor: isGlobal
                                                                ? 'rgba(0,122,255,0.08)'
                                                                : 'rgba(255,149,0,0.08)',
                                                        },
                                                    ]}
                                                >
                                                    <Text
                                                        style={[
                                                            s.scopeBadgeText,
                                                            { color: isGlobal ? '#007AFF' : '#FF9500' },
                                                        ]}
                                                    >
                                                        {isGlobal ? 'Global' : 'Item'}
                                                    </Text>
                                                </View>
                                            </View>
                                            <Text
                                                style={[s.convDesc, { color: subtextColor }]}
                                                numberOfLines={2}
                                            >
                                                {conv.description ||
                                                    `Ratio: 1 ${conv.fromUnitSymbol} = ${conv.factor} ${conv.toUnitSymbol}`}
                                            </Text>
                                        </View>

                                        <PlatformIcon
                                            name="chevron.right"
                                            size={14}
                                            tintColor={
                                                isDark
                                                    ? 'rgba(255,255,255,0.25)'
                                                    : 'rgba(0,0,0,0.25)'
                                            }
                                        />
                                    </TouchableOpacity>
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

                        {filteredConversions.length === 0 && (
                            <View style={s.emptyState}>
                                <PlatformIcon
                                    name="tray.fill"
                                    size={32}
                                    tintColor={subtextColor}
                                />
                                <Text style={[s.emptyText, { color: subtextColor }]}>
                                    No conversion rules found.
                                </Text>
                            </View>
                        )}
                    </GlassView>
                </ScrollView>

                {/* Edit / Add Modal */}
                <UnitConversionEditModal
                    visible={editModalVisible}
                    conversion={editingConversion}
                    units={units}
                    onClose={() => setEditModalVisible(false)}
                    onSave={handleSaveConversion}
                />
            </View>
        </Modal>
    );
}

const s = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    headerBtn: {
        paddingVertical: 6,
        paddingHorizontal: 8,
    },
    headerBtnText: {
        fontSize: 16,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '600',
    },
    searchContainer: {
        paddingHorizontal: 16,
        paddingTop: 4,
        paddingBottom: 8,
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 100,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        paddingVertical: 2,
    },
    tabsWrapper: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        gap: 8,
        paddingBottom: 10,
    },
    tabBtn: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 100,
    },
    tabBtnText: {
        fontSize: 13,
        fontWeight: '600',
    },
    listScroll: {
        paddingHorizontal: 16,
        paddingTop: 4,
    },
    listCard: {
        borderRadius: 20,
        overflow: 'hidden',
    },
    convRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 14,
        gap: 12,
    },
    ratioBadge: {
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        minWidth: 84,
    },
    ratioFormula: {
        fontSize: 11,
        fontWeight: '700',
    },
    convInfoCol: {
        flex: 1,
        gap: 2,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 6,
    },
    convTitle: {
        fontSize: 14.5,
        fontWeight: '600',
        flex: 1,
    },
    scopeBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    scopeBadgeText: {
        fontSize: 10,
        fontWeight: '700',
    },
    convDesc: {
        fontSize: 12,
        lineHeight: 16,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 110,
    },
    emptyState: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    emptyText: {
        fontSize: 14,
        textAlign: 'center',
    },
});
