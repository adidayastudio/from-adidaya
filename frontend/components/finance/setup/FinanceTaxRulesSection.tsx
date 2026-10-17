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
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { SortMenuPicker } from '@/components/ui/SortMenuPicker';
import {
    FinanceTaxRule,
    FinanceAccount,
    TAX_TYPE_OPTIONS,
} from '@/lib/api/financeSetup';
import { confirmDestructiveAction } from '@/lib/alertUtils';
import { FinanceTaxRuleEditSheet } from './FinanceTaxRuleEditSheet';

const TAX_SORT_OPTIONS = ['Name (A to Z)', 'Name (Z to A)', 'Code (A to Z)', 'Rate (High to Low)'];

interface FinanceTaxRulesSectionProps {
    isDark: boolean;
    textColor: string;
    subtextColor: string;
    taxRules: FinanceTaxRule[];
    accounts?: FinanceAccount[];
    onUpdateTaxRules: (rules: FinanceTaxRule[]) => void;
    isAddSheetOpen: boolean;
    onCloseAddSheet: () => void;
    onShowToast: (msg: string) => void;
}

export function FinanceTaxRulesSection({
    isDark,
    textColor,
    subtextColor,
    taxRules,
    accounts = [],
    onUpdateTaxRules,
    isAddSheetOpen,
    onCloseAddSheet,
    onShowToast,
}: FinanceTaxRulesSectionProps) {
    // Search & Sort State
    const [searchQuery, setSearchQuery] = useState('');
    const [sortIndex, setSortIndex] = useState(0);

    // Edit Sheet State
    const [editingTaxRule, setEditingTaxRule] = useState<FinanceTaxRule | null>(null);
    const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);

    const handleSaveTaxRule = (saved: FinanceTaxRule) => {
        const exists = taxRules.some((t) => t.id === saved.id);
        let updated: FinanceTaxRule[];
        if (exists) {
            updated = taxRules.map((t) => (t.id === saved.id ? saved : t));
            onShowToast(`Tax Rule ${saved.code} updated`);
        } else {
            updated = [...taxRules, saved];
            onShowToast(`Tax Rule ${saved.code} added`);
        }
        onUpdateTaxRules(updated);
    };

    const handleDeleteTaxRule = (id: string) => {
        const target = taxRules.find((t) => t.id === id);
        const updated = taxRules.filter((t) => t.id !== id);
        onUpdateTaxRules(updated);
        onShowToast(`Tax Rule ${target?.code || ''} deleted`);
    };

    const confirmDeleteTaxRule = (taxRule: FinanceTaxRule) => {
        confirmDestructiveAction({
            title: 'Delete Tax Rule',
            message: `Are you sure you want to delete "${taxRule.name}" (${taxRule.code})?`,
            confirmLabel: 'Delete',
            onConfirm: () => handleDeleteTaxRule(taxRule.id),
        });
    };

    const handleRowLongPress = (taxRule: FinanceTaxRule) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        const typeLabel = TAX_TYPE_OPTIONS.find((t) => t.value === taxRule.taxType)?.label || taxRule.taxType;

        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    title: `${taxRule.name} (${taxRule.code})`,
                    message: `Rate: ${taxRule.rate}% · ${typeLabel} · ${taxRule.defaultAccount || 'None'}`,
                    options: ['Cancel', 'Edit Tax Rule', 'Delete Tax Rule'],
                    cancelButtonIndex: 0,
                    destructiveButtonIndex: 2,
                },
                (buttonIndex) => {
                    if (buttonIndex === 1) {
                        setEditingTaxRule(taxRule);
                        setIsEditSheetOpen(true);
                    } else if (buttonIndex === 2) {
                        confirmDeleteTaxRule(taxRule);
                    }
                }
            );
        } else {
            Alert.alert(
                taxRule.name,
                `${taxRule.code} · ${taxRule.rate}% · ${typeLabel}`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Edit Tax Rule',
                        onPress: () => {
                            setEditingTaxRule(taxRule);
                            setIsEditSheetOpen(true);
                        },
                    },
                    {
                        text: 'Delete Tax Rule',
                        style: 'destructive',
                        onPress: () => confirmDeleteTaxRule(taxRule),
                    },
                ]
            );
        }
    };

    // Filter & Sort Logic
    const processedList = useMemo(() => {
        let list = [...taxRules];

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter((item) => {
                const nameMatch = item.name.toLowerCase().includes(q);
                const codeMatch = (item.code || '').toLowerCase().includes(q);
                const descMatch = (item.description || '').toLowerCase().includes(q);
                const accMatch = (item.defaultAccount || '').toLowerCase().includes(q);
                const typeMatch = (item.taxType || '').toLowerCase().includes(q);
                return nameMatch || codeMatch || descMatch || accMatch || typeMatch;
            });
        }

        list.sort((a, b) => {
            const nameA = (a.name || '').toLowerCase();
            const nameB = (b.name || '').toLowerCase();
            const codeA = (a.code || '').toLowerCase();
            const codeB = (b.code || '').toLowerCase();
            const rateA = a.rate ?? 0;
            const rateB = b.rate ?? 0;

            if (sortIndex === 0) {
                return nameA.localeCompare(nameB);
            } else if (sortIndex === 1) {
                return nameB.localeCompare(nameA);
            } else if (sortIndex === 2) {
                return codeA.localeCompare(codeB);
            } else if (sortIndex === 3) {
                return rateB - rateA;
            }
            return 0;
        });

        return list;
    }, [taxRules, searchQuery, sortIndex]);

    // Add Sheet State (internal fallback for empty state button)
    const [isInternalAddOpen, setIsInternalAddOpen] = useState(false);

    return (
        <View style={s.container}>
            {/* Search & Sort Bar (Borderless Pills + Native Pull-Down Menu) */}
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
                        placeholder="Search tax rules..."
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

                {/* Native Pull-Down Sort Menu */}
                <SortMenuPicker
                    options={TAX_SORT_OPTIONS}
                    selectedIndex={sortIndex}
                    onSelect={(idx) => {
                        Haptics.selectionAsync();
                        setSortIndex(idx);
                    }}
                    isDark={isDark}
                    textColor={textColor}
                />
            </View>

            {/* Individual Cards List (1 item = 1 card, Borderless Glass, No Chevron) */}
            <View style={s.cardsList}>
                {processedList.map((tax) => {
                    const typeLabel = TAX_TYPE_OPTIONS.find((t) => t.value === tax.taxType)?.label || tax.taxType;
                    const accountLabel = tax.defaultAccount && tax.defaultAccount !== 'None' ? tax.defaultAccount : 'No Account';

                    return (
                        <TouchableOpacity
                            key={tax.id}
                            activeOpacity={0.7}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setEditingTaxRule(tax);
                                setIsEditSheetOpen(true);
                            }}
                            onLongPress={() => handleRowLongPress(tax)}
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
                                    {/* Line 1: Badge + Name */}
                                    <View style={s.cardTitleRow}>
                                        <View style={s.codeBadge}>
                                            <Text style={s.codeBadgeText}>{tax.code || 'TAX'}</Text>
                                        </View>
                                        <Text style={[s.cardTitle, { color: textColor }]} numberOfLines={1}>
                                            {tax.name}
                                        </Text>
                                    </View>

                                    {/* Line 2: Rate + Tax Type */}
                                    <Text style={[s.cardSubtitle, { color: subtextColor }]} numberOfLines={1}>
                                        Rate: {tax.rate}% · {typeLabel}
                                    </Text>

                                    {/* Line 3: Default Account Mapping */}
                                    <Text style={[s.cardTertiary, { color: subtextColor }]} numberOfLines={1}>
                                        Account: {accountLabel}
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
                        <PlatformIcon name="percent" size={28} tintColor={subtextColor} />
                        <Text style={[s.emptyTitle, { color: textColor }]}>
                            {searchQuery.trim() ? 'No Matching Tax Rules' : 'No Tax Rules'}
                        </Text>
                        <Text style={[s.emptySubtitle, { color: subtextColor }]}>
                            {searchQuery.trim()
                                ? `No tax rules found matching "${searchQuery.trim()}".`
                                : 'Configure tax rates and rules to apply to financial transactions.'}
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
                                <Text style={s.emptyActionBtnText}>Create Tax Rule</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </View>

            {/* Add Tax Rule Sheet */}
            <FinanceTaxRuleEditSheet
                visible={isAddSheetOpen || isInternalAddOpen}
                onClose={() => {
                    setIsInternalAddOpen(false);
                    onCloseAddSheet();
                }}
                taxRule={null}
                existingTaxRules={taxRules}
                accounts={accounts}
                onSave={handleSaveTaxRule}
            />

            {/* Edit Tax Rule Sheet */}
            <FinanceTaxRuleEditSheet
                visible={isEditSheetOpen}
                onClose={() => {
                    setIsEditSheetOpen(false);
                    setEditingTaxRule(null);
                }}
                taxRule={editingTaxRule}
                existingTaxRules={taxRules}
                accounts={accounts}
                onSave={handleSaveTaxRule}
                onDelete={handleDeleteTaxRule}
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
    cardTertiary: {
        fontSize: 12.5,
        fontWeight: '400',
        lineHeight: 16,
        opacity: 0.85,
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
