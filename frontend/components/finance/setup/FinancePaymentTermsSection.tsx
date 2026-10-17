import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Platform,
    Alert,
} from 'react-native';
import ContextMenu, { ContextMenuAction } from '@/components/ui/PlatformContextMenu';
import * as Haptics from 'expo-haptics';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { SortMenuPicker } from '@/components/ui/SortMenuPicker';
import {
    FinancePaymentTerm,
    formatDueDaysLabel,
} from '@/lib/api/financeSetup';
import { FinancePaymentTermEditSheet } from './FinancePaymentTermEditSheet';
import { FinanceArchivedPaymentTermsSheet } from './FinanceArchivedPaymentTermsSheet';
import { confirmDestructiveAction } from '@/lib/alertUtils';

const PAYMENT_TERM_SORT_OPTIONS = [
    'Due Days (Lowest to Highest)',
    'Due Days (Highest to Lowest)',
    'Name (A to Z)',
    'Name (Z to A)',
    'Code (A to Z)',
];

interface FinancePaymentTermsSectionProps {
    isDark: boolean;
    textColor: string;
    subtextColor: string;
    terms: FinancePaymentTerm[];
    onUpdateTerms: (terms: FinancePaymentTerm[]) => void;
    isAddSheetOpen: boolean;
    onCloseAddSheet: () => void;
    onShowToast: (msg: string) => void;
}

export function FinancePaymentTermsSection({
    isDark,
    textColor,
    subtextColor,
    terms,
    onUpdateTerms,
    isAddSheetOpen,
    onCloseAddSheet,
    onShowToast,
}: FinancePaymentTermsSectionProps) {
    const intensity = isDark ? 10 : 25;

    // Search & Sort State
    const [searchQuery, setSearchQuery] = useState('');
    const [sortIndex, setSortIndex] = useState(0);

    // Edit Sheet State
    const [editingTerm, setEditingTerm] = useState<FinancePaymentTerm | null>(null);
    const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);

    // Archived Sheet State
    const [isArchivedSheetOpen, setIsArchivedSheetOpen] = useState(false);

    const handleSaveTerm = (saved: FinancePaymentTerm) => {
        let updated: FinancePaymentTerm[];
        const exists = terms.some((t) => t.id === saved.id);

        if (saved.isDefault) {
            // When setting a term as default, clear default from all other terms
            if (exists) {
                updated = terms.map((t) => {
                    if (t.id === saved.id) return saved;
                    return t.isDefault ? { ...t, isDefault: false } : t;
                });
            } else {
                updated = [
                    ...terms.map((t) => (t.isDefault ? { ...t, isDefault: false } : t)),
                    saved,
                ];
            }
        } else {
            if (exists) {
                // If it was default before and now unchecked, ensure there's still a default
                const wasDefault = terms.find((t) => t.id === saved.id)?.isDefault;
                if (wasDefault) {
                    const otherActive = terms.find((t) => t.id !== saved.id && t.status === 'active');
                    if (otherActive) {
                        updated = terms.map((t) => {
                            if (t.id === saved.id) return saved;
                            if (t.id === otherActive.id) return { ...t, isDefault: true };
                            return t;
                        });
                    } else {
                        updated = terms.map((t) => (t.id === saved.id ? saved : t));
                    }
                } else {
                    updated = terms.map((t) => (t.id === saved.id ? saved : t));
                }
            } else {
                updated = [...terms, saved];
            }
        }

        if (exists) {
            onShowToast(`Term "${saved.name}" updated`);
        } else {
            onShowToast(`Term "${saved.name}" added`);
        }
        onUpdateTerms(updated);
    };

    const handleDeleteTerm = (id: string) => {
        const target = terms.find((t) => t.id === id);
        confirmDestructiveAction({
            title: 'Delete Payment Term',
            message: `Are you sure you want to permanently delete "${target?.name || 'this term'}"?`,
            confirmLabel: 'Delete',
            onConfirm: () => {
                const updated = terms.filter((t) => t.id !== id);
                onUpdateTerms(updated);
                onShowToast(`Term "${target?.name || ''}" deleted`);
            },
        });
    };

    const handleSetAsDefault = (targetTerm: FinancePaymentTerm) => {
        if (targetTerm.status === 'archived') {
            Alert.alert('Cannot Set Archived as Default', 'Please restore this term to Active before setting it as default.');
            return;
        }
        const updated: FinancePaymentTerm[] = terms.map((t) => ({
            ...t,
            isDefault: t.id === targetTerm.id,
        }));
        onUpdateTerms(updated);
        onShowToast(`"${targetTerm.name}" is now default`);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const handleToggleArchive = (targetTerm: FinancePaymentTerm) => {
        if (targetTerm.isDefault && targetTerm.status === 'active') {
            Alert.alert(
                'Default Term Cannot Be Archived',
                'The current default payment term cannot be archived. Please set another active term as default first.'
            );
            return;
        }

        const newStatus: 'active' | 'archived' = targetTerm.status === 'archived' ? 'active' : 'archived';
        const updated: FinancePaymentTerm[] = terms.map((t) =>
            t.id === targetTerm.id ? { ...t, status: newStatus } : t
        );
        onUpdateTerms(updated);
        onShowToast(newStatus === 'archived' ? `Term "${targetTerm.name}" archived` : `Term "${targetTerm.name}" restored`);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    };

    // Separate active and archived terms
    const activeTerms = useMemo(() => terms.filter((t) => t.status === 'active'), [terms]);
    const archivedTerms = useMemo(() => terms.filter((t) => t.status === 'archived'), [terms]);

    // Filter & Sort Logic for Active List
    const processedActiveList = useMemo(() => {
        let list = [...activeTerms];

        // Search query
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter((item) => {
                const nameMatch = item.name.toLowerCase().includes(q);
                const codeMatch = (item.code || '').toLowerCase().includes(q);
                const daysMatch = String(item.days).includes(q);
                return nameMatch || codeMatch || daysMatch;
            });
        }

        // Sort
        list.sort((a, b) => {
            if (sortIndex === 0) {
                // Due Days asc
                return a.days - b.days;
            } else if (sortIndex === 1) {
                // Due Days desc
                return b.days - a.days;
            } else if (sortIndex === 2) {
                // Name A-Z
                return a.name.localeCompare(b.name);
            } else if (sortIndex === 3) {
                // Name Z-A
                return b.name.localeCompare(a.name);
            } else if (sortIndex === 4) {
                // Code A-Z
                return a.code.localeCompare(b.code);
            }
            return 0;
        });

        return list;
    }, [activeTerms, searchQuery, sortIndex]);

    // Add Sheet State (internal fallback for empty state button)
    const [isInternalAddOpen, setIsInternalAddOpen] = useState(false);

    return (
        <View style={s.container}>
            {/* Search & Sort Bar (Pill Search + Sort Menu) */}
            <View style={s.filterRow}>
                {/* Search Box as Pill */}
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
                        placeholder="Search payment terms..."
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

                {/* Sort Pull-Down Menu */}
                <SortMenuPicker
                    options={PAYMENT_TERM_SORT_OPTIONS}
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

            {/* Payment Terms Cards List (Individual Card Per Term, No Chevron, with Native ContextMenu) */}
            {processedActiveList.length === 0 ? (
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
                    <PlatformIcon name="calendar" size={28} tintColor={subtextColor} />
                    <Text style={[s.emptyTitle, { color: textColor }]}>
                        {searchQuery.trim() ? 'No Matching Payment Terms' : 'No Payment Terms'}
                    </Text>
                    <Text style={[s.emptySubtitle, { color: subtextColor }]}>
                        {searchQuery.trim()
                            ? `No payment terms found matching "${searchQuery.trim()}".`
                            : 'Define payment due periods, credit terms, and standard invoice settlement rules.'}
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
                            <Text style={s.emptyActionBtnText}>Create Payment Term</Text>
                        </TouchableOpacity>
                    )}
                </View>
            ) : (
                <View style={s.cardsContainer}>
                    {processedActiveList.map((term) => {
                        const dueSubtitle = formatDueDaysLabel(term.days);

                        const actions: ContextMenuAction[] = [
                            { title: 'Edit Term', systemIcon: 'pencil' },
                            ...(!term.isDefault ? [{ title: 'Set as Default', systemIcon: 'star' }] : []),
                            { title: 'Archive Term', systemIcon: 'archivebox' },
                            ...(!term.isDefault && !term.inUse ? [{ title: 'Delete Term', systemIcon: 'trash', destructive: true }] : []),
                        ];

                        return (
                            <ContextMenu
                                key={term.id}
                                actions={actions}
                                onPress={(e) => {
                                    const selected = e.nativeEvent.name;
                                    if (selected === 'Edit Term') {
                                        setEditingTerm(term);
                                        setIsEditSheetOpen(true);
                                    } else if (selected === 'Set as Default') {
                                        handleSetAsDefault(term);
                                    } else if (selected === 'Archive Term') {
                                        handleToggleArchive(term);
                                    } else if (selected === 'Delete Term') {
                                        Alert.alert(
                                            'Delete Payment Term',
                                            `Are you sure you want to permanently delete "${term.name}"?`,
                                            [
                                                { text: 'Cancel', style: 'cancel' },
                                                { text: 'Delete', style: 'destructive', onPress: () => handleDeleteTerm(term.id) },
                                            ]
                                        );
                                    }
                                }}
                            >
                                <View
                                    style={[
                                        s.termCard,
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
                                            setEditingTerm(term);
                                            setIsEditSheetOpen(true);
                                        }}
                                    >
                                        <View style={s.settingTextCol}>
                                            <View style={s.nameRow}>
                                                <View style={[s.codeBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                                                    <Text style={[s.codeBadgeText, { color: subtextColor }]}>
                                                        {term.code}
                                                    </Text>
                                                </View>
                                                <Text
                                                    style={[s.settingLabel, { color: textColor }]}
                                                    numberOfLines={1}
                                                >
                                                    {term.name}
                                                </Text>
                                            </View>
                                            <Text style={[s.settingSubtitle, { color: subtextColor }]}>
                                                {dueSubtitle}
                                            </Text>
                                        </View>

                                        <View style={s.rightActionCol}>
                                            {term.isDefault && (
                                                <View style={[s.badgePill, { backgroundColor: 'rgba(52,199,89,0.15)' }]}>
                                                    <Text style={[s.badgePillText, { color: '#34C759' }]}>Default</Text>
                                                </View>
                                            )}
                                        </View>
                                    </TouchableOpacity>
                                </View>
                            </ContextMenu>
                        );
                    })}
                </View>
            )}

            {/* Bottom "Archived >" Row Card (Shown when there are archived terms) */}
            {archivedTerms.length > 0 && (
                <View style={s.archivedSectionWrapper}>
                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setIsArchivedSheetOpen(true);
                        }}
                    >
                        <View
                            style={[
                                s.archivedCard,
                                {
                                    backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                                            borderWidth: 1,
                                            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                                },
                            ]}
                        >
                            <View style={s.archivedLeftCol}>
                                <Text style={[s.archivedButtonText, { color: textColor }]}>
                                    Archived
                                </Text>
                                <View style={[s.badgePill, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                                    <Text style={[s.badgePillText, { color: subtextColor }]}>
                                        {archivedTerms.length}
                                    </Text>
                                </View>
                            </View>
                            <PlatformIcon
                                name="chevron.right"
                                size={14}
                                tintColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
                            />
                        </View>
                    </TouchableOpacity>
                </View>
            )}

            {/* Add Payment Term Sheet */}
            <FinancePaymentTermEditSheet
                visible={isAddSheetOpen || isInternalAddOpen}
                onClose={() => {
                    onCloseAddSheet();
                    setIsInternalAddOpen(false);
                }}
                term={null}
                existingTerms={terms}
                onSave={handleSaveTerm}
            />

            {/* Edit Payment Term Sheet */}
            <FinancePaymentTermEditSheet
                visible={isEditSheetOpen}
                onClose={() => {
                    setIsEditSheetOpen(false);
                    setEditingTerm(null);
                }}
                term={editingTerm}
                existingTerms={terms}
                onSave={handleSaveTerm}
                onDelete={handleDeleteTerm}
            />

            {/* Archived Payment Terms Sheet */}
            <FinanceArchivedPaymentTermsSheet
                visible={isArchivedSheetOpen}
                onClose={() => setIsArchivedSheetOpen(false)}
                archivedTerms={archivedTerms}
                onRestoreTerm={handleToggleArchive}
                onDeleteTerm={handleDeleteTerm}
                onEditTerm={(t: FinancePaymentTerm) => {
                    setIsArchivedSheetOpen(false);
                    setEditingTerm(t);
                    setIsEditSheetOpen(true);
                }}
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
    termCard: {
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
        gap: 3,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    codeBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    codeBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 0.2,
    },
    settingLabel: {
        fontSize: 15,
        fontWeight: '500',
    },
    settingSubtitle: {
        fontSize: 13,
    },
    rightActionCol: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    badgePill: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 7,
    },
    badgePillText: {
        fontSize: 11,
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
    archivedSectionWrapper: {
        marginTop: 6,
    },
    archivedCard: {
        borderRadius: 18,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    archivedLeftCol: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    archivedButtonText: {
        fontSize: 15,
        fontWeight: '500',
    },
});
