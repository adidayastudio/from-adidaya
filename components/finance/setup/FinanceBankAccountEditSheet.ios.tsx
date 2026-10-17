import React, { useState, useEffect, useMemo } from 'react';
import { Alert } from 'react-native';
import {
    Host,
    BottomSheet,
    HStack,
    VStack,
    Spacer,
    Text as SwiftUIText,
    Button,
    Form,
    Section,
    Picker,
    TextField,
    Switch,
} from '@expo/ui/swift-ui';
import {
    padding,
    frame,
    background,
    ignoreSafeArea,
    tint,
} from '@expo/ui/swift-ui/modifiers';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import {
    FinanceBankAccount,
    BankAccountOwnerType,
    INDONESIAN_BANKS_MASTER,
    MOCK_VENDOR_DIRECTORY,
    MOCK_EMPLOYEE_DIRECTORY,
    maskAccountNumber,
} from '@/lib/api/financeSetup';

export interface FinanceBankAccountEditSheetProps {
    visible: boolean;
    onClose: () => void;
    account?: FinanceBankAccount | null;
    existingAccounts: FinanceBankAccount[];
    onSave: (account: FinanceBankAccount) => void;
    onDelete?: (id: string) => void;
}

const OWNER_TYPE_OPTIONS = ['Company', 'Vendor', 'Employee', 'Other'];
const OWNER_TYPE_KEYS: BankAccountOwnerType[] = ['company', 'vendor', 'employee', 'other'];

const BANK_NAMES = INDONESIAN_BANKS_MASTER.map((b) => b.name);
const VENDOR_OPTIONS = ['None / Unlinked (Optional)', ...MOCK_VENDOR_DIRECTORY.map((v) => v.name)];
const EMPLOYEE_OPTIONS = ['None / Unlinked (Optional)', ...MOCK_EMPLOYEE_DIRECTORY.map((e) => e.name)];

export function FinanceBankAccountEditSheet({
    visible,
    onClose,
    account,
    existingAccounts,
    onSave,
    onDelete,
}: FinanceBankAccountEditSheetProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';
    const menuControlModifiers = [tint(isDark ? '#FFFFFF' : '#1C1C1E')];

    const isEditMode = !!account;

    // Form state
    const [ownerTypeIndex, setOwnerTypeIndex] = useState(0); // 0: company, 1: vendor, 2: employee, 3: other
    const [vendorIndex, setVendorIndex] = useState(0); // 0 is None / Unlinked
    const [employeeIndex, setEmployeeIndex] = useState(0); // 0 is None / Unlinked
    const [otherBeneficiaryName, setOtherBeneficiaryName] = useState('');

    const [bankIndex, setBankIndex] = useState(0); // Default BCA (index 0)
    const [customBankName, setCustomBankName] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [accountHolderName, setAccountHolderName] = useState('');
    const [accountLabel, setAccountLabel] = useState('');
    const [isPrimary, setIsPrimary] = useState(false);
    const [statusIndex, setStatusIndex] = useState(0); // 0: Active, 1: Archived

    useEffect(() => {
        if (visible) {
            if (account) {
                const oIdx = OWNER_TYPE_KEYS.indexOf(account.ownerType);
                setOwnerTypeIndex(oIdx >= 0 ? oIdx : 0);

                if (account.ownerType === 'company') {
                    setOtherBeneficiaryName(account.linkedOwnerName || '');
                } else if (account.ownerType === 'vendor') {
                    const foundVIndex = MOCK_VENDOR_DIRECTORY.findIndex(
                        (v) => v.name === account.linkedOwnerName || v.id === account.linkedOwnerId
                    );
                    setVendorIndex(foundVIndex >= 0 ? foundVIndex + 1 : 0);
                } else if (account.ownerType === 'employee') {
                    const foundEIndex = MOCK_EMPLOYEE_DIRECTORY.findIndex(
                        (e) => e.name === account.linkedOwnerName || e.id === account.linkedOwnerId
                    );
                    setEmployeeIndex(foundEIndex >= 0 ? foundEIndex + 1 : 0);
                } else if (account.ownerType === 'other') {
                    setOtherBeneficiaryName(account.linkedOwnerName || '');
                }

                const bIdx = INDONESIAN_BANKS_MASTER.findIndex(
                    (b) => b.name.toLowerCase() === account.bank.toLowerCase() || b.shortName.toLowerCase() === account.bank.toLowerCase()
                );
                if (bIdx >= 0) {
                    setBankIndex(bIdx);
                    setCustomBankName('');
                } else {
                    // Custom bank
                    setBankIndex(INDONESIAN_BANKS_MASTER.length - 1);
                    setCustomBankName(account.bank || '');
                }

                setAccountNumber(account.accountNumber || '');
                setAccountHolderName(account.accountHolderName || '');
                setAccountLabel(account.accountLabel || '');
                setIsPrimary(!!account.isPrimary);
                setStatusIndex(account.status === 'archived' ? 1 : 0);
            } else {
                setOwnerTypeIndex(0);
                setVendorIndex(0);
                setEmployeeIndex(0);
                setOtherBeneficiaryName('');
                setBankIndex(0);
                setCustomBankName('');
                setAccountNumber('');
                setAccountHolderName('');
                setAccountLabel('');
                setIsPrimary(false);
                setStatusIndex(0);
            }
        }
    }, [visible, account]);

    const currentOwnerType = OWNER_TYPE_KEYS[ownerTypeIndex];
    const selectedBank = INDONESIAN_BANKS_MASTER[bankIndex] || INDONESIAN_BANKS_MASTER[0];
    const isCustomBank = selectedBank.code === 'CUSTOM';

    const effectiveBankName = isCustomBank
        ? customBankName.trim() || 'Custom Bank'
        : selectedBank.name;

    const effectiveLinkedOwner = useMemo(() => {
        if (currentOwnerType === 'company') {
            return {
                id: 'org_company',
                name: otherBeneficiaryName.trim() || accountHolderName.trim() || 'Company',
            };
        }
        if (currentOwnerType === 'vendor') {
            if (vendorIndex > 0) {
                const v = MOCK_VENDOR_DIRECTORY[vendorIndex - 1];
                return {
                    id: v.id,
                    name: v.name,
                };
            }
            return {
                id: undefined,
                name: accountHolderName.trim() || 'Vendor',
            };
        }
        if (currentOwnerType === 'employee') {
            if (employeeIndex > 0) {
                const e = MOCK_EMPLOYEE_DIRECTORY[employeeIndex - 1];
                return {
                    id: e.id,
                    name: e.name,
                };
            }
            return {
                id: undefined,
                name: accountHolderName.trim() || 'Employee',
            };
        }
        return {
            id: undefined,
            name: otherBeneficiaryName.trim() || accountHolderName.trim() || 'Beneficiary',
        };
    }, [currentOwnerType, vendorIndex, employeeIndex, otherBeneficiaryName, accountHolderName]);

    const handleOwnerTypeChange = (index: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setOwnerTypeIndex(index);
        if (!isEditMode) {
            const newType = OWNER_TYPE_KEYS[index];
            if (newType === 'vendor') {
                setAccountHolderName(vendorIndex > 0 ? MOCK_VENDOR_DIRECTORY[vendorIndex - 1]?.name || '' : '');
            } else if (newType === 'employee') {
                setAccountHolderName(employeeIndex > 0 ? MOCK_EMPLOYEE_DIRECTORY[employeeIndex - 1]?.name || '' : '');
            } else {
                setAccountHolderName('');
            }
        }
    };

    const handleSave = () => {
        const cleanNumber = accountNumber.trim().replace(/[^0-9A-Za-z]/g, '');
        const cleanHolder = accountHolderName.trim();

        if (!cleanNumber) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert('Required Field', 'Account Number is required.');
            return;
        }

        if (!cleanHolder) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert('Required Field', 'Account Holder Name is required.');
            return;
        }

        if (isCustomBank && !customBankName.trim()) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert('Required Field', 'Please enter the Custom Bank name.');
            return;
        }

        // Bank digit length convention check
        if (!isCustomBank) {
            if (cleanNumber.length < selectedBank.digitsMin || cleanNumber.length > selectedBank.digitsMax) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                Alert.alert(
                    'Invalid Account Number Length',
                    `${selectedBank.shortName} account numbers must be ${selectedBank.description} (${selectedBank.digitsMin === selectedBank.digitsMax ? `${selectedBank.digitsMin} digits` : `${selectedBank.digitsMin}–${selectedBank.digitsMax} digits`}). You entered ${cleanNumber.length} digits.`
                );
                return;
            }
        }

        // Duplicate account number validation
        const isDuplicate = existingAccounts.some(
            (a) =>
                a.accountNumber.replace(/[^0-9A-Za-z]/g, '') === cleanNumber &&
                a.bank.toLowerCase() === effectiveBankName.toLowerCase() &&
                (!account || a.id !== account.id) &&
                a.status === 'active'
        );

        if (isDuplicate) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert(
                'Duplicate Bank Account',
                `An active account with number "${cleanNumber}" in ${selectedBank.shortName} already exists.`
            );
            return;
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        const updatedAccount: FinanceBankAccount = {
            id: account ? account.id : `bank_acc_${Date.now()}`,
            ownerType: currentOwnerType,
            bank: effectiveBankName,
            bankCode: selectedBank.code,
            accountNumber: cleanNumber,
            accountHolderName: cleanHolder,
            linkedOwnerId: effectiveLinkedOwner.id,
            linkedOwnerName: effectiveLinkedOwner.name,
            accountLabel: accountLabel.trim() || undefined,
            isPrimary,
            status: statusIndex === 1 ? 'archived' : 'active',
            inUse: account?.inUse || false,
            description: account?.description,
            createdAt: account?.createdAt || new Date().toISOString().split('T')[0],
            updatedAt: new Date().toISOString().split('T')[0],
        };

        onSave(updatedAccount);
        onClose();
    };

    const handleDelete = () => {
        if (!account || !onDelete) return;

        Alert.alert(
            'Delete Bank Account',
            `Are you sure you want to delete "${account.accountHolderName} - ${selectedBank.shortName}" (${maskAccountNumber(account.accountNumber)})?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        onDelete(account.id);
                        onClose();
                    },
                },
            ]
        );
    };

    return (
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet
                isOpened={visible}
                presentationDetents={[0.88, 0.96]}
                presentationDragIndicator="hidden"
                onIsOpenedChange={(opened) => {
                    if (!opened) onClose();
                }}
            >
                <VStack
                    spacing={0}
                    modifiers={[
                        frame({ maxWidth: 9999, maxHeight: 9999, alignment: 'top' }),
                        background('clear'),
                        ignoreSafeArea({ regions: 'all', edges: 'bottom' }),
                    ]}
                >
                    {/* Header */}
                    <HStack
                        spacing={12}
                        alignment="center"
                        modifiers={[
                            padding({ top: 16, leading: 20, bottom: 12, trailing: 20 }),
                            frame({ maxWidth: 9999 }),
                        ]}
                    >
                        <Button
                            variant="plain"
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                onClose();
                            }}
                        >
                            <SwiftUIText size={16} color={subtextColor}>
                                Cancel
                            </SwiftUIText>
                        </Button>

                        <Spacer />

                        <SwiftUIText size={17} weight="bold" color={textColor}>
                            {isEditMode ? 'Edit Bank Account' : 'Add Bank Account'}
                        </SwiftUIText>

                        <Spacer />

                        <Button
                            variant="plain"
                            onPress={handleSave}
                        >
                            <SwiftUIText size={16} weight="semibold" color="#007AFF">
                                Save
                            </SwiftUIText>
                        </Button>
                    </HStack>

                    {/* Form Body */}
                    <Form modifiers={[background('clear'), frame({ maxWidth: 9999, maxHeight: 9999 })]}>
                        {/* Section 1: Owner Classification */}
                        <Section title="Account Ownership">
                            <Picker
                                label="Owner Type"
                                variant="menu"
                                options={OWNER_TYPE_OPTIONS}
                                selectedIndex={ownerTypeIndex}
                                onOptionSelected={({ nativeEvent: { index } }) => {
                                    handleOwnerTypeChange(index);
                                }}
                                modifiers={menuControlModifiers}
                            />

                            {currentOwnerType === 'company' && (
                                <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 4 })]}>
                                    <SwiftUIText size={13} color={subtextColor}>
                                        Organization / Entity Name (Optional)
                                    </SwiftUIText>
                                    <TextField
                                        placeholder="Organization or Company Name"
                                        defaultValue={otherBeneficiaryName}
                                        onChangeText={(val: string) => {
                                            setOtherBeneficiaryName(val);
                                            if (!accountHolderName) setAccountHolderName(val);
                                        }}
                                        modifiers={[
                                            frame({ maxWidth: 9999 }),
                                            tint('#007AFF'),
                                        ]}
                                    />
                                </VStack>
                            )}

                            {currentOwnerType === 'vendor' && (
                                <Picker
                                    label="Linked Vendor (Optional)"
                                    variant="menu"
                                    options={VENDOR_OPTIONS}
                                    selectedIndex={vendorIndex}
                                    onOptionSelected={({ nativeEvent: { index } }) => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setVendorIndex(index);
                                        if (!isEditMode && index > 0) {
                                            setAccountHolderName(MOCK_VENDOR_DIRECTORY[index - 1]?.name || '');
                                        }
                                    }}
                                    modifiers={menuControlModifiers}
                                />
                            )}

                            {currentOwnerType === 'employee' && (
                                <Picker
                                    label="Linked Employee (Optional)"
                                    variant="menu"
                                    options={EMPLOYEE_OPTIONS}
                                    selectedIndex={employeeIndex}
                                    onOptionSelected={({ nativeEvent: { index } }) => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setEmployeeIndex(index);
                                        if (!isEditMode && index > 0) {
                                            setAccountHolderName(MOCK_EMPLOYEE_DIRECTORY[index - 1]?.name || '');
                                        }
                                    }}
                                    modifiers={menuControlModifiers}
                                />
                            )}

                            {currentOwnerType === 'other' && (
                                <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 4 })]}>
                                    <SwiftUIText size={13} color={subtextColor}>
                                        Beneficiary Name (Optional)
                                    </SwiftUIText>
                                    <TextField
                                        placeholder="Tax Office / External Partner"
                                        defaultValue={otherBeneficiaryName}
                                        onChangeText={(val: string) => setOtherBeneficiaryName(val)}
                                        modifiers={[
                                            frame({ maxWidth: 9999 }),
                                            tint('#007AFF'),
                                        ]}
                                    />
                                </VStack>
                            )}
                        </Section>

                        {/* Section 2: Bank & Account Details */}
                        <Section title="Bank & Account Details">
                            <Picker
                                label="Bank"
                                variant="menu"
                                options={BANK_NAMES}
                                selectedIndex={bankIndex}
                                onOptionSelected={({ nativeEvent: { index } }) => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setBankIndex(index);
                                }}
                                modifiers={menuControlModifiers}
                            />

                            {isCustomBank && (
                                <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 4 })]}>
                                    <SwiftUIText size={13} color={subtextColor}>
                                        Custom Bank Name
                                    </SwiftUIText>
                                    <TextField
                                        placeholder="Citibank, DBS, Bank BJB, Wise"
                                        defaultValue={customBankName}
                                        onChangeText={(val: string) => setCustomBankName(val)}
                                        modifiers={[
                                            frame({ maxWidth: 9999 }),
                                            tint('#007AFF'),
                                        ]}
                                    />
                                </VStack>
                            )}

                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 4 })]}>
                                <SwiftUIText size={13} color={subtextColor}>
                                    Account Number
                                </SwiftUIText>
                                <TextField
                                    placeholder={selectedBank.digitSample}
                                    defaultValue={accountNumber}
                                    onChangeText={(val: string) => {
                                        const clean = isCustomBank ? val : val.replace(/[^0-9]/g, '').slice(0, selectedBank.digitsMax);
                                        setAccountNumber(clean);
                                    }}
                                    modifiers={[
                                        frame({ maxWidth: 9999 }),
                                        tint('#007AFF'),
                                    ]}
                                />
                            </VStack>

                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 4 })]}>
                                <SwiftUIText size={13} color={subtextColor}>
                                    Account Holder Name
                                </SwiftUIText>
                                <TextField
                                    placeholder="Account Holder Name"
                                    defaultValue={accountHolderName}
                                    onChangeText={(val: string) => setAccountHolderName(val)}
                                    modifiers={[
                                        frame({ maxWidth: 9999 }),
                                        tint('#007AFF'),
                                    ]}
                                />
                            </VStack>

                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 4 })]}>
                                <SwiftUIText size={13} color={subtextColor}>
                                    Account Label (Optional)
                                </SwiftUIText>
                                <TextField
                                    placeholder="Main Operating, Payroll, Petty Cash"
                                    defaultValue={accountLabel}
                                    onChangeText={(val: string) => setAccountLabel(val)}
                                    modifiers={[
                                        frame({ maxWidth: 9999 }),
                                        tint('#007AFF'),
                                    ]}
                                />
                                <SwiftUIText size={11} color={subtextColor}>
                                    Tag to distinguish multiple accounts for the same entity.
                                </SwiftUIText>
                            </VStack>
                        </Section>

                        {/* Section 3: Primary Account Preference */}
                        <Section title="Primary Preference">
                            <HStack alignment="center" modifiers={[padding({ vertical: 4 })]}>
                                <SwiftUIText size={15} color={textColor}>
                                    Set as Primary Account (Optional)
                                </SwiftUIText>
                                <Spacer />
                                <Switch
                                    value={isPrimary}
                                    onValueChange={(val: boolean) => {
                                        Haptics.selectionAsync();
                                        setIsPrimary(val);
                                    }}
                                    color="#34C759"
                                />
                            </HStack>
                        </Section>

                        {/* Section 4: Lifecycle & Status */}
                        {isEditMode && (
                            <Section title="Lifecycle & Status">
                                <Picker
                                    label="Status"
                                    variant="menu"
                                    options={['Active', 'Archived']}
                                    selectedIndex={statusIndex}
                                    onOptionSelected={({ nativeEvent: { index } }) => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setStatusIndex(index);
                                    }}
                                    modifiers={menuControlModifiers}
                                />

                                {onDelete && (
                                    <Button
                                        variant="plain"
                                        onPress={handleDelete}
                                    >
                                        <SwiftUIText size={15} color="#FF3B30">
                                            Delete Bank Account
                                        </SwiftUIText>
                                    </Button>
                                )}
                            </Section>
                        )}
                    </Form>
                </VStack>
            </BottomSheet>
        </Host>
    );
}
