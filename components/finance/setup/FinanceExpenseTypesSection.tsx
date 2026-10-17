import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Platform,
    Alert,
    ActionSheetIOS,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { GlassView } from '@/components/ui/GlassView';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { SortMenuPicker } from '@/components/ui/SortMenuPicker';
import { FinanceExpenseType } from '@/lib/api/financeSetup';
import { confirmDestructiveAction } from '@/lib/alertUtils';
import { FinanceExpenseTypeEditSheet } from './FinanceExpenseTypeEditSheet';

export type ExpenseTypeSortOption = 'name_asc' | 'name_desc' | 'code_asc' | 'tax';

const SORT_OPTIONS = ['Name (A to Z)', 'Name (Z to A)', 'Code (A to Z)', 'Tax Rule'];

interface FinanceExpenseTypesSectionProps {
    isDark: boolean;
    textColor: string;
    subtextColor: string;
    expenseTypes: FinanceExpenseType[];
    accounts?: any[];
    taxRules?: any[];
    onUpdateExpenseTypes: (types: FinanceExpenseType[]) => void;
    isAddSheetOpen: boolean;
    onCloseAddSheet: () => void;
    onShowToast: (msg: string) => void;
}

export function FinanceExpenseTypesSection({
    isDark,
    textColor,
    subtextColor,
    expenseTypes,
    accounts,
    taxRules,
    onUpdateExpenseTypes,
    isAddSheetOpen,
    onCloseAddSheet,
    onShowToast,
}: FinanceExpenseTypesSectionProps) {
    const intensity = isDark ? 10 : 25;

    // Search & Sort State
    const [searchQuery, setSearchQuery] = useState('');
    const [sortIndex, setSortIndex] = useState(0);

    // Edit Sheet State
    const [editingExpenseType, setEditingExpenseType] = useState<FinanceExpenseType | null>(null);
    const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
    const [isInternalAddOpen, setIsInternalAddOpen] = useState(false);

    const handleSaveExpenseType = (saved: FinanceExpenseType) => {
        const exists = expenseTypes.some((e) => e.id === saved.id);
        let updated: FinanceExpenseType[];
        if (exists) {
            updated = expenseTypes.map((e) => (e.id === saved.id ? saved : e));
            onShowToast(`Expense Type ${saved.code} updated`);
        } else {
            updated = [...expenseTypes, saved];
            onShowToast(`Expense Type ${saved.code} added`);
        }
        onUpdateExpenseTypes(updated);
    };

    const handleDeleteExpenseType = (id: string) => {
        const target = expenseTypes.find((e) => e.id === id);
        const updated = expenseTypes.filter((e) => e.id !== id);
        onUpdateExpenseTypes(updated);
        onShowToast(`Expense Type ${target?.code || ''} deleted`);
    };

    const confirmDeleteExpenseType = (expenseType: FinanceExpenseType) => {
        confirmDestructiveAction({
            title: 'Delete Expense Type',
            message: `Are you sure you want to delete "${expenseType.name}" (${expenseType.code})?`,
            confirmLabel: 'Delete',
            onConfirm: () => handleDeleteExpenseType(expenseType.id),
        });
    };

    const handleRowLongPress = (expenseType: FinanceExpenseType) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    title: `${expenseType.name} (${expenseType.code})`,
                    message: `Tax: ${expenseType.defaultTaxRule || expenseType.tax || 'No Tax Rule'} · Account: ${expenseType.defaultAccount || 'None'}`,
                    options: ['Cancel', 'Edit Expense Type', 'Delete Expense Type'],
                    cancelButtonIndex: 0,
                    destructiveButtonIndex: 2,
                },
                (buttonIndex) => {
                    if (buttonIndex === 1) {
                        setEditingExpenseType(expenseType);
                        setIsEditSheetOpen(true);
                    } else if (buttonIndex === 2) {
                        confirmDeleteExpenseType(expenseType);
                    }
                }
            );
        } else {
            Alert.alert(
                expenseType.name,
                `${expenseType.code} · ${expenseType.defaultTaxRule || expenseType.tax || 'No Tax Rule'}`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Edit Expense Type',
                        onPress: () => {
                            setEditingExpenseType(expenseType);
                            setIsEditSheetOpen(true);
                        },
                    },
                    {
                        text: 'Delete Expense Type',
                        style: 'destructive',
                        onPress: () => confirmDeleteExpenseType(expenseType),
                    },
                ]
            );
        }
    };

    // Filter & Sort Logic
    const processedList = useMemo(() => {
        let list = [...expenseTypes];

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter((item) => {
                const nameMatch = item.name.toLowerCase().includes(q);
                const codeMatch = (item.code || '').toLowerCase().includes(q);
                const taxMatch = (item.defaultTaxRule || item.tax || '').toLowerCase().includes(q);
                const accMatch = (item.defaultAccount || '').toLowerCase().includes(q);
                return nameMatch || codeMatch || taxMatch || accMatch;
            });
        }

        list.sort((a, b) => {
            const nameA = (a.name || '').toLowerCase();
            const nameB = (b.name || '').toLowerCase();
            const codeA = (a.code || '').toLowerCase();
            const codeB = (b.code || '').toLowerCase();

            if (sortIndex === 0) {
                return nameA.localeCompare(nameB);
            } else if (sortIndex === 1) {
                return nameB.localeCompare(nameA);
            } else if (sortIndex === 2) {
                return codeA.localeCompare(codeB);
            } else if (sortIndex === 3) {
                const taxA = (a.defaultTaxRule || a.tax || '').toLowerCase();
                const taxB = (b.defaultTaxRule || b.tax || '').toLowerCase();
                const taxComp = taxA.localeCompare(taxB);
                return taxComp !== 0 ? taxComp : nameA.localeCompare(nameB);
            }
            return 0;
        });

        return list;
    }, [expenseTypes, searchQuery, sortIndex]);

    return (
        <View style={s.container}>
            {/* Search & Sort Bar (Borderless Pills + Native Menu Picker) */}
            <View style={s.filterRow}>
                {/* Search Input Box */}
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
                        placeholder="Search expense types..."
                        placeholderTextColor={subtextColor}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoCapitalize="none"
                        autoCorrect={false}
                        clearButtonMode="while-editing"
                    />
                    {searchQuery.length > 0 && Platform.OS === 'android' && (
                        <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <PlatformIcon name="xmark.circle.fill" size={15} tintColor={subtextColor} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Native Variant Menu Sort Picker */}
                <SortMenuPicker
                    options={SORT_OPTIONS}
                    selectedIndex={sortIndex}
                    onSelect={(idx) => {
                        Haptics.selectionAsync();
                        setSortIndex(idx);
                    }}
                    isDark={isDark}
                    textColor={textColor}
                />
            </View>

            {/* Individual Cards List (1 item = 1 card, Borderless, No Chevron) */}
            <View style={s.cardsList}>
                {processedList.map((exp) => {
                    const rawTax = exp.defaultTaxRule || exp.tax;
                    const taxLabel = !rawTax || rawTax === 'None' ? 'No Tax Rule' : rawTax;
                    const accountLabel = exp.defaultAccount && exp.defaultAccount !== 'None' ? exp.defaultAccount : 'No Account';
                    const secondaryMeta = `${taxLabel} · ${accountLabel}`;

                    return (
                        <TouchableOpacity
                            key={exp.id}
                            activeOpacity={0.7}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setEditingExpenseType(exp);
                                setIsEditSheetOpen(true);
                            }}
                            onLongPress={() => handleRowLongPress(exp)}
                            delayLongPress={350}
                        >
                            <View
                                style={[
                                    s.itemCard,
                                    {
                                        backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                                        borderWidth: 1,
                                        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                                    },
                                ]}
                            >
                                <View style={s.cardBody}>
                                    <View style={s.cardTitleRow}>
                                        <View style={s.codeBadge}>
                                            <Text style={s.codeBadgeText}>{exp.code || 'EXP'}</Text>
                                        </View>
                                        <Text style={[s.cardTitle, { color: textColor }]} numberOfLines={1}>
                                            {exp.name}
                                        </Text>
                                    </View>
                                    <Text style={[s.cardSubtitle, { color: subtextColor }]} numberOfLines={1}>
                                        {secondaryMeta}
                                    </Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    );
                })}

                {processedList.length === 0 && (
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
                        <PlatformIcon name="tag" size={28} tintColor={subtextColor} />
                        <Text style={[s.emptyTitle, { color: textColor }]}>
                            {searchQuery.trim() ? 'No Matching Expense Types' : 'No Expense Types'}
                        </Text>
                        <Text style={[s.emptySubtitle, { color: subtextColor }]}>
                            {searchQuery.trim()
                                ? `No expense types found matching "${searchQuery.trim()}".`
                                : 'Define expense types to categorize expenditures and automate ledger postings.'}
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
                                <Text style={s.emptyActionBtnText}>Create Expense Type</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </View>

            {/* Add Expense Type Sheet */}
            <FinanceExpenseTypeEditSheet
                visible={isAddSheetOpen || isInternalAddOpen}
                onClose={() => {
                    setIsInternalAddOpen(false);
                    onCloseAddSheet();
                }}
                expenseType={null}
                existingExpenseTypes={expenseTypes}
                accounts={accounts}
                taxRules={taxRules}
                onSave={handleSaveExpenseType}
            />

            {/* Edit Expense Type Sheet */}
            <FinanceExpenseTypeEditSheet
                visible={isEditSheetOpen}
                onClose={() => {
                    setIsEditSheetOpen(false);
                    setEditingExpenseType(null);
                }}
                expenseType={editingExpenseType}
                existingExpenseTypes={expenseTypes}
                accounts={accounts}
                taxRules={taxRules}
                onSave={handleSaveExpenseType}
                onDelete={(id) => {
                    handleDeleteExpenseType(id);
                    setIsEditSheetOpen(false);
                    setEditingExpenseType(null);
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
        gap: 8,
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        height: 42,
        borderRadius: 21,
        borderWidth: 0,
        paddingHorizontal: 14,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        paddingVertical: 0,
    },
    cardsList: {
        gap: 10,
    },
    itemCard: {
        borderRadius: 18,
        borderWidth: 0,
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    cardBody: {
        gap: 4,
    },
    cardTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    codeBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
    },
    codeBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#2563EB',
        letterSpacing: 0.3,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: -0.3,
        flex: 1,
    },
    cardSubtitle: {
        fontSize: 13,
        fontWeight: '400',
        lineHeight: 17,
        marginTop: 1,
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
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
});
