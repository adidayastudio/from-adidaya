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
import {
    FinanceAccount,
    ACCOUNT_TYPE_OPTIONS,
} from '@/lib/api/financeSetup';
import { confirmDestructiveAction } from '@/lib/alertUtils';
import { FinanceAccountEditSheet } from './FinanceAccountEditSheet';

const ACCOUNT_SORT_OPTIONS = [
    'Code (Ascending)',
    'Code (Descending)',
    'Name (A to Z)',
    'Name (Z to A)',
    'Account Type',
];

interface FinanceAccountsSectionProps {
    isDark: boolean;
    textColor: string;
    subtextColor: string;
    accounts: FinanceAccount[];
    onUpdateAccounts: (accounts: FinanceAccount[]) => void;
    isAddSheetOpen: boolean;
    onCloseAddSheet: () => void;
    onShowToast: (msg: string) => void;
}

export function FinanceAccountsSection({
    isDark,
    textColor,
    subtextColor,
    accounts,
    onUpdateAccounts,
    isAddSheetOpen,
    onCloseAddSheet,
    onShowToast,
}: FinanceAccountsSectionProps) {
    const intensity = isDark ? 10 : 25;

    // Search & Sort State
    const [searchQuery, setSearchQuery] = useState('');
    const [sortIndex, setSortIndex] = useState(0);

    // Edit Sheet State
    const [editingAccount, setEditingAccount] = useState<FinanceAccount | null>(null);
    const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
    const [isInternalAddOpen, setIsInternalAddOpen] = useState(false);

    const handleSaveAccount = (saved: FinanceAccount) => {
        const exists = accounts.some((a) => a.id === saved.id);
        let updated: FinanceAccount[];
        if (exists) {
            updated = accounts.map((a) => (a.id === saved.id ? saved : a));
            onShowToast(`Account ${saved.code} updated`);
        } else {
            updated = [...accounts, saved];
            onShowToast(`Account ${saved.code} added`);
        }
        onUpdateAccounts(updated);
    };

    const handleDeleteAccount = (id: string) => {
        const target = accounts.find((a) => a.id === id);
        const updated = accounts.filter((a) => a.id !== id);
        onUpdateAccounts(updated);
        onShowToast(`Account ${target?.code || ''} deleted`);
    };

    const confirmDeleteAccount = (account: FinanceAccount) => {
        confirmDestructiveAction({
            title: 'Delete Account',
            message: `Are you sure you want to delete "${account.name}" (${account.code})?`,
            confirmLabel: 'Delete',
            onConfirm: () => handleDeleteAccount(account.id),
        });
    };

    const handleRowLongPress = (account: FinanceAccount) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        const typeLabel = ACCOUNT_TYPE_OPTIONS.find((t) => t.value === account.type)?.label || account.type;

        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    title: `${account.name} (${account.code})`,
                    message: `${typeLabel}${account.description ? ` · ${account.description}` : ''}`,
                    options: ['Cancel', 'Edit Account', 'Delete Account'],
                    cancelButtonIndex: 0,
                    destructiveButtonIndex: 2,
                },
                (buttonIndex) => {
                    if (buttonIndex === 1) {
                        setEditingAccount(account);
                        setIsEditSheetOpen(true);
                    } else if (buttonIndex === 2) {
                        confirmDeleteAccount(account);
                    }
                }
            );
        } else {
            Alert.alert(
                account.name,
                `${account.code} · ${typeLabel}`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Edit Account',
                        onPress: () => {
                            setEditingAccount(account);
                            setIsEditSheetOpen(true);
                        },
                    },
                    {
                        text: 'Delete Account',
                        style: 'destructive',
                        onPress: () => confirmDeleteAccount(account),
                    },
                ]
            );
        }
    };

    // Filter & Sort Logic
    const processedList = useMemo(() => {
        let list = [...accounts];

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter((item) => {
                const nameMatch = item.name.toLowerCase().includes(q);
                const codeMatch = (item.code || '').toLowerCase().includes(q);
                const descMatch = (item.description || '').toLowerCase().includes(q);
                const typeMatch = (item.type || '').toLowerCase().includes(q);
                return nameMatch || codeMatch || descMatch || typeMatch;
            });
        }

        list.sort((a, b) => {
            const nameA = (a.name || '').toLowerCase();
            const nameB = (b.name || '').toLowerCase();
            const codeA = (a.code || '').toLowerCase();
            const codeB = (b.code || '').toLowerCase();

            if (sortIndex === 0) {
                return codeA.localeCompare(codeB, undefined, { numeric: true });
            } else if (sortIndex === 1) {
                return codeB.localeCompare(codeA, undefined, { numeric: true });
            } else if (sortIndex === 2) {
                return nameA.localeCompare(nameB);
            } else if (sortIndex === 3) {
                return nameB.localeCompare(nameA);
            } else if (sortIndex === 4) {
                const typeA = (a.type || '').toLowerCase();
                const typeB = (b.type || '').toLowerCase();
                const typeComp = typeA.localeCompare(typeB);
                return typeComp !== 0 ? typeComp : codeA.localeCompare(codeB, undefined, { numeric: true });
            }
            return 0;
        });

        return list;
    }, [accounts, searchQuery, sortIndex]);

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
                        placeholder="Search accounts..."
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
                    options={ACCOUNT_SORT_OPTIONS}
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
                {processedList.map((acc) => {
                    const typeLabel = ACCOUNT_TYPE_OPTIONS.find((t) => t.value === acc.type)?.label || acc.type;
                    const descText = acc.description || 'No description assigned';

                    return (
                        <TouchableOpacity
                            key={acc.id}
                            activeOpacity={0.7}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setEditingAccount(acc);
                                setIsEditSheetOpen(true);
                            }}
                            onLongPress={() => handleRowLongPress(acc)}
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
                                            <Text style={s.codeBadgeText}>{acc.code || 'COA'}</Text>
                                        </View>
                                        <Text style={[s.cardTitle, { color: textColor }]} numberOfLines={1}>
                                            {acc.name}
                                        </Text>
                                    </View>

                                    {/* Line 2: Account Type */}
                                    <Text style={[s.cardSubtitle, { color: subtextColor }]} numberOfLines={1}>
                                        {typeLabel}
                                    </Text>

                                    {/* Line 3: Description */}
                                    <Text style={[s.cardTertiary, { color: subtextColor }]} numberOfLines={1}>
                                        {descText}
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
                        <PlatformIcon name="book.closed" size={28} tintColor={subtextColor} />
                        <Text style={[s.emptyTitle, { color: textColor }]}>
                            {searchQuery.trim() ? 'No Matching Accounts' : 'No Accounts'}
                        </Text>
                        <Text style={[s.emptySubtitle, { color: subtextColor }]}>
                            {searchQuery.trim()
                                ? `No accounts found matching "${searchQuery.trim()}".`
                                : 'Set up your chart of accounts for balance sheet and ledger classification.'}
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
                                <Text style={s.emptyActionBtnText}>Create Account</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </View>

            {/* Add Account Sheet */}
            <FinanceAccountEditSheet
                visible={isAddSheetOpen || isInternalAddOpen}
                onClose={() => {
                    setIsInternalAddOpen(false);
                    onCloseAddSheet();
                }}
                account={null}
                existingAccounts={accounts}
                onSave={handleSaveAccount}
            />

            {/* Edit Account Sheet */}
            <FinanceAccountEditSheet
                visible={isEditSheetOpen}
                onClose={() => {
                    setIsEditSheetOpen(false);
                    setEditingAccount(null);
                }}
                account={editingAccount}
                existingAccounts={accounts}
                onSave={handleSaveAccount}
                onDelete={(id) => {
                    handleDeleteAccount(id);
                    setIsEditSheetOpen(false);
                    setEditingAccount(null);
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
        borderWidth: 1,
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
