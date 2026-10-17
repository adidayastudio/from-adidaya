import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    ScrollView,
    TextInput,
    Switch,
    Platform,
    Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassView } from '@/components/ui/GlassView';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import * as Haptics from 'expo-haptics';
import { UnitItem, MeasurementType } from '@/lib/api/resourcesSetup';
import { UnitEditModal } from './UnitEditModal';

export interface UnitLibrarySheetProps {
    visible: boolean;
    units: UnitItem[];
    onClose: () => void;
    onUpdateUnits: (units: UnitItem[]) => void;
}

const FILTER_TABS: Array<{ id: string; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'count', label: 'Count' },
    { id: 'weight', label: 'Weight' },
    { id: 'length', label: 'Length' },
    { id: 'volume', label: 'Volume' },
    { id: 'area', label: 'Area' },
    { id: 'time', label: 'Time' },
];

export function UnitLibrarySheet({
    visible,
    units,
    onClose,
    onUpdateUnits,
}: UnitLibrarySheetProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';
    const insets = useSafeAreaInsets();

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTab, setSelectedTab] = useState('all');
    const [editingUnit, setEditingUnit] = useState<UnitItem | null>(null);
    const [editModalVisible, setEditModalVisible] = useState(false);

    const filteredUnits = useMemo(() => {
        return units.filter((u) => {
            const matchesTab =
                selectedTab === 'all' || u.measurementType === selectedTab;
            const q = searchQuery.toLowerCase().trim();
            const matchesSearch =
                !q ||
                u.name.toLowerCase().includes(q) ||
                u.symbol.toLowerCase().includes(q) ||
                u.measurementType.toLowerCase().includes(q);
            return matchesTab && matchesSearch;
        });
    }, [units, selectedTab, searchQuery]);

    const handleToggleActive = (unitId: string) => {
        Haptics.selectionAsync();
        const updated = units.map((u) =>
            u.id === unitId ? { ...u, isActive: !u.isActive } : u
        );
        onUpdateUnits(updated);
    };

    const handleSaveUnit = (savedUnit: UnitItem) => {
        const exists = units.some((u) => u.id === savedUnit.id);
        let updated: UnitItem[];
        if (exists) {
            updated = units.map((u) => (u.id === savedUnit.id ? savedUnit : u));
        } else {
            updated = [savedUnit, ...units];
        }
        onUpdateUnits(updated);
    };

    const handleOpenEdit = (unit: UnitItem) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setEditingUnit(unit);
        setEditModalVisible(true);
    };

    const handleOpenAdd = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setEditingUnit(null);
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
                    <Text style={[s.headerTitle, { color: textColor }]}>Unit Library</Text>
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
                            placeholder="Search units..."
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

                {/* Filter Pills */}
                <View style={s.pillWrapper}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={s.pillScroll}
                    >
                        {FILTER_TABS.map((tab) => {
                            const isSelected = selectedTab === tab.id;
                            return (
                                <TouchableOpacity
                                    key={tab.id}
                                    onPress={() => {
                                        Haptics.selectionAsync();
                                        setSelectedTab(tab.id);
                                    }}
                                    style={[
                                        s.pill,
                                        isSelected
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
                                            s.pillText,
                                            { color: isSelected ? '#FFF' : textColor },
                                        ]}
                                    >
                                        {tab.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

                {/* Unit List */}
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
                        {filteredUnits.map((u, idx) => {
                            const isLast = idx === filteredUnits.length - 1;
                            const typeLabel = u.measurementType.charAt(0).toUpperCase() + u.measurementType.slice(1);
                            const decimalLabel = u.allowDecimals ? 'Decimals' : 'Whole qty';

                            return (
                                <View key={u.id}>
                                    <TouchableOpacity
                                        style={s.unitRow}
                                        onPress={() => handleOpenEdit(u)}
                                        activeOpacity={0.7}
                                    >
                                        {/* Symbol Badge */}
                                        <View
                                            style={[
                                                s.symbolBadge,
                                                {
                                                    backgroundColor: u.isActive
                                                        ? isDark
                                                            ? 'rgba(0,122,255,0.15)'
                                                            : 'rgba(0,122,255,0.08)'
                                                        : isDark
                                                        ? 'rgba(255,255,255,0.05)'
                                                        : 'rgba(0,0,0,0.04)',
                                                },
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    s.symbolText,
                                                    {
                                                        color: u.isActive
                                                            ? '#007AFF'
                                                            : subtextColor,
                                                    },
                                                ]}
                                            >
                                                {u.symbol}
                                            </Text>
                                        </View>

                                        {/* Info */}
                                        <View style={s.unitInfoCol}>
                                            <View style={s.titleBadgeRow}>
                                                <Text
                                                    style={[
                                                        s.unitName,
                                                        {
                                                            color: u.isActive
                                                                ? textColor
                                                                : subtextColor,
                                                        },
                                                    ]}
                                                >
                                                    {u.name}
                                                </Text>
                                                {!u.isSystem && (
                                                    <View
                                                        style={[
                                                            s.tagBadge,
                                                            { backgroundColor: 'rgba(52,199,89,0.12)' },
                                                        ]}
                                                    >
                                                        <Text
                                                            style={[
                                                                s.tagText,
                                                                { color: '#34C759' },
                                                            ]}
                                                        >
                                                            Custom
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                            <Text
                                                style={[s.unitMeta, { color: subtextColor }]}
                                            >
                                                {typeLabel} • {decimalLabel}
                                            </Text>
                                        </View>

                                        {/* Active Switch */}
                                        <Switch
                                            value={u.isActive}
                                            onValueChange={() => handleToggleActive(u.id)}
                                            trackColor={{
                                                false: isDark ? '#3A3A3C' : '#E5E5EA',
                                                true: '#34C759',
                                            }}
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

                        {filteredUnits.length === 0 && (
                            <View style={s.emptyState}>
                                <PlatformIcon
                                    name="tray.fill"
                                    size={32}
                                    tintColor={subtextColor}
                                />
                                <Text style={[s.emptyText, { color: subtextColor }]}>
                                    No units found matching your search.
                                </Text>
                            </View>
                        )}
                    </GlassView>
                </ScrollView>

                {/* Unit Edit / Add Form Modal */}
                <UnitEditModal
                    visible={editModalVisible}
                    unit={editingUnit}
                    onClose={() => setEditModalVisible(false)}
                    onSave={handleSaveUnit}
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
    pillWrapper: {
        paddingBottom: 10,
    },
    pillScroll: {
        paddingHorizontal: 16,
        gap: 8,
    },
    pill: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 100,
    },
    pillText: {
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
    unitRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 14,
        gap: 12,
    },
    symbolBadge: {
        width: 44,
        height: 36,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    symbolText: {
        fontSize: 14,
        fontWeight: '700',
    },
    unitInfoCol: {
        flex: 1,
        gap: 2,
    },
    titleBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    unitName: {
        fontSize: 15,
        fontWeight: '600',
    },
    tagBadge: {
        backgroundColor: 'rgba(0,122,255,0.08)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    tagText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#007AFF',
    },
    unitMeta: {
        fontSize: 11.5,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 70,
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
