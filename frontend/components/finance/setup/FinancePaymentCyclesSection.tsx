import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Alert,
    Platform,
} from 'react-native';
import ContextMenu, { ContextMenuAction } from '@/components/ui/PlatformContextMenu';
import * as Haptics from 'expo-haptics';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { SortMenuPicker } from '@/components/ui/SortMenuPicker';
import {
    FinancePaymentCycle,
    formatCycleSummary,
} from '@/lib/api/financeSetup';
import { FinancePaymentCycleEditSheet } from './FinancePaymentCycleEditSheet';
import { confirmDestructiveAction } from '@/lib/alertUtils';

const PAYMENT_CYCLE_SORT_OPTIONS = [
    'Name (A to Z)',
    'Name (Z to A)',
    'Frequency',
    'Status (Active First)',
];

interface FinancePaymentCyclesSectionProps {
    isDark: boolean;
    textColor: string;
    subtextColor: string;
    cycles: FinancePaymentCycle[];
    onUpdateCycles: (cycles: FinancePaymentCycle[]) => void;
    isAddSheetOpen: boolean;
    onCloseAddSheet: () => void;
    onShowToast: (msg: string) => void;
}

export function FinancePaymentCyclesSection({
    isDark,
    textColor,
    subtextColor,
    cycles,
    onUpdateCycles,
    isAddSheetOpen,
    onCloseAddSheet,
    onShowToast,
}: FinancePaymentCyclesSectionProps) {
    const intensity = isDark ? 10 : 25;

    // Search & Sort State
    const [searchQuery, setSearchQuery] = useState('');
    const [sortIndex, setSortIndex] = useState(0);

    // Edit Sheet State
    const [editingCycle, setEditingCycle] = useState<FinancePaymentCycle | null>(null);
    const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);

    const handleSaveCycle = (saved: FinancePaymentCycle) => {
        let updated: FinancePaymentCycle[];
        const exists = cycles.some((c) => c.id === saved.id);

        if (exists) {
            updated = cycles.map((c) => (c.id === saved.id ? saved : c));
            onShowToast(`Cycle "${saved.name}" updated`);
        } else {
            updated = [...cycles, saved];
            onShowToast(`Cycle "${saved.name}" added`);
        }
        onUpdateCycles(updated);
    };

    const handleDeleteCycle = (id: string) => {
        const target = cycles.find((c) => c.id === id);
        confirmDestructiveAction({
            title: 'Delete Payment Cycle',
            message: `Are you sure you want to permanently delete "${target?.name || 'this cycle'}"?`,
            confirmLabel: 'Delete',
            onConfirm: () => {
                const updated = cycles.filter((c) => c.id !== id);
                onUpdateCycles(updated);
                onShowToast(`Cycle "${target?.name || ''}" deleted`);
            },
        });
    };

    const handleToggleStatus = (targetCycle: FinancePaymentCycle) => {
        const newStatus: 'active' | 'inactive' = targetCycle.status === 'active' ? 'inactive' : 'active';
        const updated = cycles.map((c) =>
            c.id === targetCycle.id ? { ...c, status: newStatus } : c
        );
        onUpdateCycles(updated);
        onShowToast(newStatus === 'active' ? `Cycle "${targetCycle.name}" activated` : `Cycle "${targetCycle.name}" deactivated`);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    };

    // Filter & Sort Logic
    const processedCycles = useMemo(() => {
        let list = [...cycles];

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter((item) => {
                const nameMatch = item.name.toLowerCase().includes(q);
                const summaryMatch = formatCycleSummary(item).toLowerCase().includes(q);
                const freqMatch = item.frequency.toLowerCase().includes(q);
                return nameMatch || summaryMatch || freqMatch;
            });
        }

        list.sort((a, b) => {
            if (sortIndex === 0) {
                // Name A-Z
                return a.name.localeCompare(b.name);
            } else if (sortIndex === 1) {
                // Name Z-A
                return b.name.localeCompare(a.name);
            } else if (sortIndex === 2) {
                // Frequency
                return a.frequency.localeCompare(b.frequency);
            } else if (sortIndex === 3) {
                // Active First
                if (a.status === b.status) return a.name.localeCompare(b.name);
                return a.status === 'active' ? -1 : 1;
            }
            return 0;
        });

        return list;
    }, [cycles, searchQuery, sortIndex]);

    // Add Sheet State (internal fallback for empty state button)
    const [isInternalAddOpen, setIsInternalAddOpen] = useState(false);

    return (
        <View style={s.container}>
            {/* Search & Sort Bar */}
            <View style={s.filterRow}>
                <View
                    style={[
                        s.searchBar,
                        {
                            backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                            borderWidth: 1,
                            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                        },
                    ]}
                >
                    <PlatformIcon name="magnifyingglass" size={15} tintColor={subtextColor} />
                    <TextInput
                        style={[s.searchInput, { color: textColor }]}
                        placeholder="Search payment cycles..."
                        placeholderTextColor={subtextColor}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        clearButtonMode="while-editing"
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                    {searchQuery.length > 0 && Platform.OS === 'android' && (
                        <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <PlatformIcon name="xmark.circle.fill" size={15} tintColor={subtextColor} />
                        </TouchableOpacity>
                    )}
                </View>

                <SortMenuPicker
                    options={PAYMENT_CYCLE_SORT_OPTIONS}
                    selectedIndex={sortIndex}
                    onSelect={(idx: number) => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSortIndex(idx);
                    }}
                    isDark={isDark}
                    textColor={textColor}
                    subtextColor={subtextColor}
                />
            </View>

            {/* List Cards (1 Card Per Item, No Chevron) */}
            {processedCycles.length === 0 ? (
                <View
                    style={[
                        s.emptyCard,
                        {
                            backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                            borderWidth: 1,
                            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                        },
                    ]}
                >
                    <PlatformIcon name="arrow.triangle.2.circlepath" size={28} tintColor={subtextColor} />
                    <Text style={[s.emptyTitle, { color: textColor }]}>
                        {searchQuery.trim() ? 'No Matching Payment Cycles' : 'No Payment Cycles'}
                    </Text>
                    <Text style={[s.emptySubtitle, { color: subtextColor }]}>
                        {searchQuery.trim()
                            ? `No payment cycles found matching "${searchQuery.trim()}".`
                            : 'Configure recurring payment cut-offs, batch processing dates, and disbursement schedules.'}
                    </Text>
                    {searchQuery.trim() ? (
                        <TouchableOpacity
                            style={s.emptyActionBtn}
                            onPress={() => setSearchQuery('')}
                            activeOpacity={0.8}
                        >
                            <Text style={s.emptyActionBtnText}>Clear Search</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={s.emptyActionBtn}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setIsInternalAddOpen(true);
                            }}
                            activeOpacity={0.8}
                        >
                            <PlatformIcon name="plus" size={13} tintColor="#FFFFFF" />
                            <Text style={s.emptyActionBtnText}>Create Payment Cycle</Text>
                        </TouchableOpacity>
                    )}
                </View>
            ) : (
                <View style={s.cardsContainer}>
                    {processedCycles.map((cycle) => {
                        const summaryText = formatCycleSummary(cycle);
                        const isActive = cycle.status === 'active';

                        const actions: ContextMenuAction[] = [
                            { title: 'Edit Cycle', systemIcon: 'pencil' },
                            {
                                title: isActive ? 'Deactivate Cycle' : 'Activate Cycle',
                                systemIcon: isActive ? 'pause.circle' : 'play.circle',
                            },
                            ...(!cycle.inUse ? [{ title: 'Delete Cycle', systemIcon: 'trash', destructive: true }] : []),
                        ];

                        return (
                            <ContextMenu
                                key={cycle.id}
                                actions={actions}
                                onPress={(e) => {
                                    const selected = e.nativeEvent.name;
                                    if (selected === 'Edit Cycle') {
                                        setEditingCycle(cycle);
                                        setIsEditSheetOpen(true);
                                    } else if (selected === 'Deactivate Cycle' || selected === 'Activate Cycle') {
                                        handleToggleStatus(cycle);
                                    } else if (selected === 'Delete Cycle') {
                                        Alert.alert(
                                            'Delete Payment Cycle',
                                            `Are you sure you want to permanently delete "${cycle.name}"?`,
                                            [
                                                { text: 'Cancel', style: 'cancel' },
                                                { text: 'Delete', style: 'destructive', onPress: () => handleDeleteCycle(cycle.id) },
                                            ]
                                        );
                                    }
                                }}
                            >
                                <View
                                    style={[
                                        s.cycleCard,
                                        {
                                            backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                                            borderWidth: 1,
                                            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                                        },
                                    ]}
                                >
                                    <TouchableOpacity
                                        activeOpacity={0.7}
                                        style={s.settingRow}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            setEditingCycle(cycle);
                                            setIsEditSheetOpen(true);
                                        }}
                                    >
                                        <View style={s.settingTextCol}>
                                            <Text
                                                style={[
                                                    s.settingLabel,
                                                    { color: textColor, opacity: isActive ? 1 : 0.6 },
                                                ]}
                                                numberOfLines={1}
                                            >
                                                {cycle.name}
                                            </Text>
                                            <Text
                                                style={[
                                                    s.settingSubtitle,
                                                    { color: subtextColor, opacity: isActive ? 1 : 0.6 },
                                                ]}
                                                numberOfLines={1}
                                            >
                                                {summaryText}
                                            </Text>
                                        </View>

                                        <View style={s.rightActionCol}>
                                            <View
                                                style={[
                                                    s.badgePill,
                                                    {
                                                        backgroundColor: isActive
                                                            ? 'rgba(52,199,89,0.15)'
                                                            : isDark
                                                            ? 'rgba(255,255,255,0.08)'
                                                            : 'rgba(0,0,0,0.06)',
                                                    },
                                                ]}
                                            >
                                                <Text
                                                    style={[
                                                        s.badgePillText,
                                                        { color: isActive ? '#34C759' : subtextColor },
                                                    ]}
                                                >
                                                    {isActive ? 'Active' : 'Inactive'}
                                                </Text>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                </View>
                            </ContextMenu>
                        );
                    })}
                </View>
            )}

            {/* Add Payment Cycle Sheet */}
            <FinancePaymentCycleEditSheet
                visible={isAddSheetOpen || isInternalAddOpen}
                onClose={() => {
                    onCloseAddSheet();
                    setIsInternalAddOpen(false);
                }}
                cycle={null}
                existingCycles={cycles}
                onSave={handleSaveCycle}
            />

            {/* Edit Payment Cycle Sheet */}
            <FinancePaymentCycleEditSheet
                visible={isEditSheetOpen}
                onClose={() => {
                    setIsEditSheetOpen(false);
                    setEditingCycle(null);
                }}
                cycle={editingCycle}
                existingCycles={cycles}
                onSave={handleSaveCycle}
                onDelete={handleDeleteCycle}
            />
        </View>
    );
}

const s = StyleSheet.create({
    container: {
        gap: 12,
    },
    filterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 2,
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        height: 42,
        borderRadius: 21,
        overflow: 'hidden',
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        padding: 0,
    },
    cardsContainer: {
        gap: 12,
    },
    cycleCard: {
        borderRadius: 18,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 16,
        gap: 12,
    },
    settingTextCol: {
        flex: 1,
        gap: 4,
    },
    settingLabel: {
        fontSize: 16,
        fontWeight: '500',
        letterSpacing: -0.3,
    },
    settingSubtitle: {
        fontSize: 13,
        fontWeight: '400',
        lineHeight: 17,
    },
    rightActionCol: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    badgePill: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgePillText: {
        fontSize: 12,
        fontWeight: '600',
    },
    emptyCard: {
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 36,
        paddingHorizontal: 24,
        gap: 6,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginTop: 6,
    },
    emptySubtitle: {
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 18,
        maxWidth: 320,
    },
    emptyActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#159957',
        paddingHorizontal: 16,
        height: 38,
        borderRadius: 999,
        marginTop: 10,
    },
    emptyActionBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});
