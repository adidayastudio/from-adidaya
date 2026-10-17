import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Alert,
} from 'react-native';
import ContextMenu, { ContextMenuAction } from '@/components/ui/PlatformContextMenu';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { SortMenuPicker } from '@/components/ui/SortMenuPicker';
import {
    FinanceBankAccount,
    BankAccountOwnerType,
    maskAccountNumber,
    formatBankAccountMetadata,
} from '@/lib/api/financeSetup';
import { FinanceBankAccountEditSheet } from './FinanceBankAccountEditSheet';

const BANK_ACCOUNT_SORT_OPTIONS = [
    'Name A–Z',
    'Name Z–A',
    'Bank A–Z',
    'Recently Added',
];

const OWNER_TYPE_FILTERS: Array<{ id: string; label: string; value: BankAccountOwnerType | 'all' }> = [
    { id: 'all', label: 'All Types', value: 'all' },
    { id: 'company', label: 'Company', value: 'company' },
    { id: 'vendor', label: 'Vendor', value: 'vendor' },
    { id: 'employee', label: 'Employee', value: 'employee' },
    { id: 'other', label: 'Other', value: 'other' },
];

const STATUS_FILTERS: Array<{ id: string; label: string; value: 'all' | 'active' | 'archived' }> = [
    { id: 'all_status', label: 'All Status', value: 'all' },
    { id: 'active', label: 'Active', value: 'active' },
    { id: 'archived', label: 'Archived', value: 'archived' },
];

interface FinanceBankAccountsSectionProps {
    isDark: boolean;
    textColor: string;
    subtextColor: string;
    accounts: FinanceBankAccount[];
    onUpdateAccounts: (accounts: FinanceBankAccount[]) => void;
    isAddSheetOpen: boolean;
    onCloseAddSheet: () => void;
    onShowToast: (msg: string) => void;
}

export function FinanceBankAccountsSection({
    isDark,
    textColor,
    subtextColor,
    accounts,
    onUpdateAccounts,
    isAddSheetOpen,
    onCloseAddSheet,
    onShowToast,
}: FinanceBankAccountsSectionProps) {
    const intensity = isDark ? 10 : 25;

    // Search & Sort State
    const [searchQuery, setSearchQuery] = useState('');
    const [sortIndex, setSortIndex] = useState(0);

    // Number visibility state (Set of account IDs)
    const [visibleAccountIds, setVisibleAccountIds] = useState<Set<string>>(new Set());

    const toggleNumberVisibility = (id: string) => {
        Haptics.selectionAsync();
        setVisibleAccountIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    // Filters State
    const [selectedOwnerType, setSelectedOwnerType] = useState<BankAccountOwnerType | 'all'>('all');
    const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'archived'>('all');
    const [selectedBankFilter, setSelectedBankFilter] = useState<string>('all');

    // Edit Sheet State
    const [editingAccount, setEditingAccount] = useState<FinanceBankAccount | null>(null);
    const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);

    // Unique Banks in dataset
    const availableBanks = useMemo(() => {
        const set = new Set<string>();
        accounts.forEach((a) => {
            if (a.bank) set.add(a.bank);
        });
        return Array.from(set).sort();
    }, [accounts]);

    // Filter Menu Actions with checkmark ✓
    const filterMenuActions = useMemo<ContextMenuAction[]>(() => {
        const ownerActions: ContextMenuAction[] = OWNER_TYPE_FILTERS.map((f) => ({
            title: `${selectedOwnerType === f.value ? '✓ ' : ''}${f.label}`,
            systemIcon: selectedOwnerType === f.value ? 'checkmark' : undefined,
        }));

        const statusActions: ContextMenuAction[] = STATUS_FILTERS.map((f) => ({
            title: `${selectedStatus === f.value ? '✓ ' : ''}${f.label}`,
            systemIcon: selectedStatus === f.value ? 'checkmark' : undefined,
        }));

        const bankActions: ContextMenuAction[] = [
            {
                title: `${selectedBankFilter === 'all' ? '✓ ' : ''}All Banks`,
                systemIcon: selectedBankFilter === 'all' ? 'checkmark' : undefined,
            },
            ...availableBanks.map((bankName) => ({
                title: `${selectedBankFilter === bankName ? '✓ ' : ''}${bankName}`,
                systemIcon: selectedBankFilter === bankName ? 'checkmark' : undefined,
            })),
        ];

        return [
            {
                title: 'Filter by Owner Type',
                inlineChildren: true,
                actions: ownerActions,
            },
            {
                title: 'Filter by Status',
                inlineChildren: true,
                actions: statusActions,
            },
            {
                title: 'Filter by Bank',
                inlineChildren: true,
                actions: bankActions,
            },
            {
                title: 'Reset All Filters',
                systemIcon: 'arrow.counterclockwise',
                destructive: true,
            },
        ];
    }, [selectedOwnerType, selectedStatus, selectedBankFilter, availableBanks]);

    const handleFilterMenuPress = (selectedName: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        if (selectedName === 'Reset All Filters') {
            setSelectedOwnerType('all');
            setSelectedStatus('all');
            setSelectedBankFilter('all');
            onShowToast('Filters reset');
            return;
        }

        // Check Owner Type
        const cleanName = selectedName.replace(/^✓\s*/, '');
        const matchedOwner = OWNER_TYPE_FILTERS.find((f) => f.label === cleanName);
        if (matchedOwner) {
            setSelectedOwnerType(matchedOwner.value);
            return;
        }

        // Check Status
        const matchedStatus = STATUS_FILTERS.find((f) => f.label === cleanName);
        if (matchedStatus) {
            setSelectedStatus(matchedStatus.value);
            return;
        }

        // Check Bank
        if (cleanName === 'All Banks') {
            setSelectedBankFilter('all');
            return;
        }
        if (availableBanks.includes(cleanName)) {
            setSelectedBankFilter(cleanName);
        }
    };

    const isFiltered = selectedOwnerType !== 'all' || selectedStatus !== 'all' || selectedBankFilter !== 'all';

    const handleSaveAccount = (saved: FinanceBankAccount) => {
        let updated: FinanceBankAccount[];
        const exists = accounts.some((a) => a.id === saved.id);

        if (saved.isPrimary) {
            // Unmark primary for other accounts of the SAME owner entity
            if (exists) {
                updated = accounts.map((a) => {
                    if (a.id === saved.id) return saved;
                    const isSameOwner =
                        a.ownerType === saved.ownerType &&
                        (a.linkedOwnerId ? a.linkedOwnerId === saved.linkedOwnerId : a.linkedOwnerName === saved.linkedOwnerName);
                    if (isSameOwner && a.isPrimary) {
                        return { ...a, isPrimary: false };
                    }
                    return a;
                });
            } else {
                updated = [
                    ...accounts.map((a) => {
                        const isSameOwner =
                            a.ownerType === saved.ownerType &&
                            (a.linkedOwnerId ? a.linkedOwnerId === saved.linkedOwnerId : a.linkedOwnerName === saved.linkedOwnerName);
                        if (isSameOwner && a.isPrimary) {
                            return { ...a, isPrimary: false };
                        }
                        return a;
                    }),
                    saved,
                ];
            }
        } else {
            if (exists) {
                updated = accounts.map((a) => (a.id === saved.id ? saved : a));
            } else {
                updated = [...accounts, saved];
            }
        }

        onUpdateAccounts(updated);
        onShowToast(exists ? `Account "${saved.accountHolderName}" updated` : `Account "${saved.accountHolderName}" added`);
    };

    const handleDeleteAccount = (id: string) => {
        const target = accounts.find((a) => a.id === id);
        const updated = accounts.filter((a) => a.id !== id);
        onUpdateAccounts(updated);
        onShowToast(`Account "${target?.accountHolderName || ''}" deleted`);
    };

    const handleSetAsPrimary = (targetAccount: FinanceBankAccount) => {
        const updated = accounts.map((a) => {
            if (a.id === targetAccount.id) {
                return { ...a, isPrimary: true };
            }
            const isSameOwner =
                a.ownerType === targetAccount.ownerType &&
                (a.linkedOwnerId ? a.linkedOwnerId === targetAccount.linkedOwnerId : a.linkedOwnerName === targetAccount.linkedOwnerName);
            if (isSameOwner && a.isPrimary) {
                return { ...a, isPrimary: false };
            }
            return a;
        });

        onUpdateAccounts(updated);
        onShowToast(`Primary account set for ${targetAccount.linkedOwnerName}`);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const handleCopyNumber = async (account: FinanceBankAccount) => {
        await Clipboard.setStringAsync(account.accountNumber);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onShowToast(`Copied ${account.bank} account number: ${account.accountNumber}`);
    };

    const handleToggleArchive = (targetAccount: FinanceBankAccount) => {
        const newStatus: 'active' | 'archived' = targetAccount.status === 'archived' ? 'active' : 'archived';
        const updated = accounts.map((a) =>
            a.id === targetAccount.id ? { ...a, status: newStatus } : a
        );
        onUpdateAccounts(updated);
        onShowToast(newStatus === 'archived' ? `Account archived` : `Account restored`);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    };

    // Filter & Sort Logic
    const processedAccounts = useMemo(() => {
        let list = [...accounts];

        // Owner type filter
        if (selectedOwnerType !== 'all') {
            list = list.filter((a) => a.ownerType === selectedOwnerType);
        }

        // Status filter
        if (selectedStatus !== 'all') {
            list = list.filter((a) => a.status === selectedStatus);
        }

        // Bank filter
        if (selectedBankFilter !== 'all') {
            list = list.filter((a) => a.bank.toLowerCase() === selectedBankFilter.toLowerCase());
        }

        // Search query
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter((a) => {
                const bankMatch = a.bank.toLowerCase().includes(q);
                const holderMatch = a.accountHolderName.toLowerCase().includes(q);
                const labelMatch = (a.accountLabel || '').toLowerCase().includes(q);
                const ownerMatch = (a.linkedOwnerName || '').toLowerCase().includes(q);
                const numberMatch = a.accountNumber.includes(q);
                return bankMatch || holderMatch || labelMatch || ownerMatch || numberMatch;
            });
        }

        // Sort
        list.sort((a, b) => {
            if (sortIndex === 0) {
                // Name A-Z
                return a.accountHolderName.localeCompare(b.accountHolderName);
            } else if (sortIndex === 1) {
                // Name Z-A
                return b.accountHolderName.localeCompare(a.accountHolderName);
            } else if (sortIndex === 2) {
                // Bank A-Z
                return a.bank.localeCompare(b.bank);
            } else if (sortIndex === 3) {
                // Recently Added
                return (b.createdAt || '').localeCompare(a.createdAt || '');
            }
            return 0;
        });

        return list;
    }, [accounts, selectedOwnerType, selectedStatus, selectedBankFilter, searchQuery, sortIndex]);

    return (
        <View style={s.container}>
            {/* Search, Filter & Sort Row */}
            <View style={s.filterRow}>
                {/* Search Bar */}
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
                        placeholder="Search bank, owner, or account..."
                        placeholderTextColor={subtextColor}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        clearButtonMode="while-editing"
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                </View>

                {/* Filter Pull-Down Menu */}
                <ContextMenu
                    actions={filterMenuActions}
                    onPress={(e) => handleFilterMenuPress(e.nativeEvent.name)}
                    dropdownMenuMode
                >
                    <View
                        style={[
                            s.menuButtonPill,
                            {
                                backgroundColor: isFiltered
                                    ? (isDark ? 'rgba(52,199,89,0.15)' : 'rgba(52,199,89,0.12)')
                                    : isDark
                                    ? '#1C1C1E'
                                    : '#FFFFFF',
                                borderWidth: 0,
                                borderColor: 'transparent',
                            },
                        ]}
                    >
                        <PlatformIcon
                            name={isFiltered ? 'line.3.horizontal.decrease.circle.fill' : 'line.3.horizontal.decrease'}
                            size={isFiltered ? 18 : 16}
                            tintColor={isFiltered ? '#159957' : textColor}
                        />
                    </View>
                </ContextMenu>

                {/* Sort Pull-Down Menu */}
                <SortMenuPicker
                    options={BANK_ACCOUNT_SORT_OPTIONS}
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

            {/* List Cards (1 Card Per Bank Account, No Chevron) */}
            {processedAccounts.length === 0 ? (
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
                    <Text style={[s.emptyTitle, { color: textColor }]}>No Bank Accounts Found</Text>
                    <Text style={[s.emptySubtitle, { color: subtextColor }]}>
                        {searchQuery || isFiltered
                            ? 'Try adjusting your search query or filter options.'
                            : 'Tap "+" above to add a company, vendor, or employee account.'}
                    </Text>
                </View>
            ) : (
                <View style={s.cardsContainer}>
                    {processedAccounts.map((account) => {
                        const maskedNumber = maskAccountNumber(account.accountNumber);
                        const isVisible = visibleAccountIds.has(account.id);
                        const displayAccountNumber = isVisible ? account.accountNumber : maskedNumber;
                        const metadataText = formatBankAccountMetadata(account);
                        const isArchived = account.status === 'archived';

                        const actions: ContextMenuAction[] = [
                            { title: 'Edit Account', systemIcon: 'pencil' },
                            ...(!account.isPrimary && !isArchived ? [{ title: 'Set as Primary', systemIcon: 'star' }] : []),
                            { title: 'Copy Account Number', systemIcon: 'doc.on.doc' },
                            {
                                title: isArchived ? 'Restore Account' : 'Archive Account',
                                systemIcon: isArchived ? 'arrow.uturn.backward' : 'archivebox',
                            },
                            { title: 'Delete Account', systemIcon: 'trash', destructive: true },
                        ];

                        return (
                            <ContextMenu
                                key={account.id}
                                actions={actions}
                                onPress={(e) => {
                                    const selected = e.nativeEvent.name;
                                    if (selected === 'Edit Account') {
                                        setEditingAccount(account);
                                        setIsEditSheetOpen(true);
                                    } else if (selected === 'Set as Primary') {
                                        handleSetAsPrimary(account);
                                    } else if (selected === 'Copy Account Number') {
                                        handleCopyNumber(account);
                                    } else if (selected === 'Archive Account' || selected === 'Restore Account') {
                                        handleToggleArchive(account);
                                    } else if (selected === 'Delete Account') {
                                        Alert.alert(
                                            'Delete Bank Account',
                                            `Are you sure you want to delete ${account.accountHolderName} (${account.bank})?`,
                                            [
                                                { text: 'Cancel', style: 'cancel' },
                                                { text: 'Delete', style: 'destructive', onPress: () => handleDeleteAccount(account.id) },
                                            ]
                                        );
                                    }
                                }}
                            >
                                <View
                                    style={[
                                        s.accountCard,
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
                                            setEditingAccount(account);
                                            setIsEditSheetOpen(true);
                                        }}
                                    >
                                        <View style={s.settingTextCol}>
                                            {/* Top Row: Account Holder Name + Status Badges */}
                                            <View style={s.headerRow}>
                                                <Text
                                                    style={[
                                                        s.holderNameText,
                                                        { color: textColor, opacity: isArchived ? 0.6 : 1 },
                                                    ]}
                                                    numberOfLines={1}
                                                >
                                                    {account.accountHolderName}
                                                </Text>

                                                <View style={s.badgeGroup}>
                                                    {account.isPrimary && (
                                                        <View style={[s.badgePill, { backgroundColor: 'rgba(52,199,89,0.15)' }]}>
                                                            <Text style={[s.badgePillText, { color: '#159957' }]}>Primary</Text>
                                                        </View>
                                                    )}
                                                    {isArchived && (
                                                        <View style={[s.badgePill, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                                                            <Text style={[s.badgePillText, { color: subtextColor }]}>Archived</Text>
                                                        </View>
                                                    )}
                                                </View>
                                            </View>

                                            {/* Middle Row: Bank Name · Account Number + Eye Button */}
                                            <View style={s.bankDetailRow}>
                                                <Text
                                                    style={[
                                                        s.bankNameText,
                                                        { color: isDark ? '#E5E5EA' : '#2C2C2E', opacity: isArchived ? 0.6 : 1 },
                                                    ]}
                                                    numberOfLines={1}
                                                >
                                                    {account.bank}
                                                </Text>
                                                <Text style={[s.bulletSeparator, { color: subtextColor }]}>·</Text>
                                                
                                                <TouchableOpacity
                                                    activeOpacity={0.6}
                                                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                                    style={s.numberToggleBtn}
                                                    onPress={() => toggleNumberVisibility(account.id)}
                                                >
                                                    <Text
                                                        style={[
                                                            s.accountNumberText,
                                                            { color: isDark ? '#A1A1A6' : '#6E6E73', opacity: isArchived ? 0.6 : 1 },
                                                        ]}
                                                    >
                                                        {displayAccountNumber}
                                                    </Text>
                                                    <PlatformIcon
                                                        name={isVisible ? 'eye.slash' : 'eye'}
                                                        size={13}
                                                        tintColor={subtextColor}
                                                    />
                                                </TouchableOpacity>
                                            </View>

                                            {/* Bottom Metadata: Owner Type · Label */}
                                            <Text
                                                style={[
                                                    s.metadataText,
                                                    { color: subtextColor, opacity: isArchived ? 0.6 : 1 },
                                                ]}
                                                numberOfLines={1}
                                            >
                                                {metadataText}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                </View>
                            </ContextMenu>
                        );
                    })}
                </View>
            )}

            {/* Add Bank Account Sheet */}
            <FinanceBankAccountEditSheet
                visible={isAddSheetOpen}
                onClose={onCloseAddSheet}
                account={null}
                existingAccounts={accounts}
                onSave={handleSaveAccount}
            />

            {/* Edit Bank Account Sheet */}
            <FinanceBankAccountEditSheet
                visible={isEditSheetOpen}
                onClose={() => {
                    setIsEditSheetOpen(false);
                    setEditingAccount(null);
                }}
                account={editingAccount}
                existingAccounts={accounts}
                onSave={handleSaveAccount}
                onDelete={handleDeleteAccount}
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
        borderWidth: 0,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        padding: 0,
    },
    menuButtonPill: {
        width: 42,
        height: 42,
        borderRadius: 21,
        borderWidth: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardsContainer: {
        gap: 12,
    },
    accountCard: {
        borderRadius: 18,
        overflow: 'hidden',
        borderWidth: 1,
    },
    settingRow: {
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    settingTextCol: {
        gap: 3,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        marginBottom: 2,
    },
    holderNameText: {
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: -0.3,
        flex: 1,
    },
    badgeGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    bankDetailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 2,
    },
    bankNameText: {
        fontSize: 14,
        fontWeight: '500',
        letterSpacing: -0.2,
    },
    bulletSeparator: {
        fontSize: 13,
        fontWeight: '400',
    },
    numberToggleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    accountNumberText: {
        fontSize: 13,
        fontWeight: '400',
        letterSpacing: 0.4,
    },
    metadataText: {
        fontSize: 12,
        fontWeight: '400',
        marginTop: 3,
    },
    badgePill: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
    },
    badgePillText: {
        fontSize: 11,
        fontWeight: '600',
    },
    emptyCard: {
        borderRadius: 20,
        paddingVertical: 36,
        paddingHorizontal: 20,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    emptySubtitle: {
        fontSize: 13,
        textAlign: 'center',
    },
});
