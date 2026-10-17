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
    FinanceAccount,
    AccountType,
    ACCOUNT_TYPE_OPTIONS,
} from '@/lib/api/financeSetup';

export interface FinanceAccountEditSheetProps {
    visible: boolean;
    onClose: () => void;
    account?: FinanceAccount | null;
    existingAccounts: FinanceAccount[];
    onSave: (account: FinanceAccount) => void;
}

const STATUS_OPTIONS = ['Active', 'Inactive'];

export function FinanceAccountEditSheet({
    visible,
    onClose,
    account,
    existingAccounts,
    onSave,
}: FinanceAccountEditSheetProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';
    const nativeControlTextColor = isDark ? '#FFFFFF' : '#000000';
    const menuControlModifiers = [tint(isDark ? '#FFFFFF' : '#1C1C1E')];

    const isEditMode = !!account;

    const [code, setCode] = useState('');
    const [name, setName] = useState('');
    const [accountTypeIndex, setAccountTypeIndex] = useState(0);
    const [description, setDescription] = useState('');
    const [statusIndex, setStatusIndex] = useState(0);

    const accountTypeOptions = useMemo(() => {
        return ACCOUNT_TYPE_OPTIONS.map((t) => t.label);
    }, []);

    useEffect(() => {
        if (visible) {
            if (account) {
                setCode(account.code || '');
                setName(account.name || '');
                setDescription(account.description || '');
                setStatusIndex(account.active !== false ? 0 : 1);

                const currentTypeIndex = ACCOUNT_TYPE_OPTIONS.findIndex((t) => t.value === account.type);
                setAccountTypeIndex(currentTypeIndex >= 0 ? currentTypeIndex : 0);
            } else {
                setCode('');
                setName('');
                setDescription('');
                setAccountTypeIndex(0);
                setStatusIndex(0);
            }
        }
    }, [visible, account]);

    const handleSave = () => {
        const cleanCode = code.trim();
        const cleanName = name.trim();

        if (!cleanCode) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert('Required Field', 'Account Code is required.');
            return;
        }

        if (!cleanName) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert('Required Field', 'Account Name is required.');
            return;
        }

        // Duplicate code validation
        const isDuplicate = existingAccounts.some(
            (a) => a.code?.toUpperCase() === cleanCode.toUpperCase() && (!account || a.id !== account.id)
        );

        if (isDuplicate) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert('Duplicate Code', `Account Code "${cleanCode}" is already in use.`);
            return;
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        const updatedAccount: FinanceAccount = {
            id: account ? account.id : `acc_${Date.now()}`,
            code: cleanCode,
            name: cleanName,
            type: ACCOUNT_TYPE_OPTIONS[accountTypeIndex]?.value || 'cost_of_sales',
            description: description.trim() || undefined,
            active: statusIndex === 0,
        };

        onSave(updatedAccount);
        onClose();
    };

    return (
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet
                isOpened={visible}
                presentationDetents={[0.82, 0.92]}
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
                    {/* Native Modal Top Header */}
                    <HStack
                        spacing={12}
                        alignment="center"
                        modifiers={[
                            padding({ top: 16, leading: 20, bottom: 12, trailing: 20 }),
                            frame({ maxWidth: 9999 }),
                        ]}
                    >
                        {/* Cancel Button */}
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

                        {/* Modal Title */}
                        <SwiftUIText size={17} weight="bold" color={textColor}>
                            {isEditMode ? 'Edit Account' : 'New Account'}
                        </SwiftUIText>

                        <Spacer />

                        {/* Save Button */}
                        <Button
                            variant="plain"
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                handleSave();
                            }}
                        >
                            <SwiftUIText size={16} weight="bold" color="#007AFF">
                                Save
                            </SwiftUIText>
                        </Button>
                    </HStack>

                    {/* Native iOS SwiftUI Form Layout */}
                    <Form modifiers={[background('clear'), frame({ maxWidth: 9999, maxHeight: 9999 })]}>
                        {/* Section 1: Identification */}
                        <Section title="Identification">
                            <HStack spacing={12} alignment="center" modifiers={[padding({ vertical: 4 })]}>
                                <SwiftUIText size={15} color={textColor}>
                                    Code
                                </SwiftUIText>
                                <Spacer />
                                <TextField
                                    placeholder="e.g. 5-1001"
                                    defaultValue={code}
                                    onChangeText={setCode}
                                    modifiers={[
                                        frame({ minWidth: 100, alignment: 'trailing' }),
                                        tint('#007AFF'),
                                    ]}
                                />
                            </HStack>

                            <HStack spacing={12} alignment="center" modifiers={[padding({ vertical: 4 })]}>
                                <SwiftUIText size={15} color={textColor}>
                                    Name
                                </SwiftUIText>
                                <Spacer />
                                <TextField
                                    placeholder="e.g. Direct Material Costs"
                                    defaultValue={name}
                                    onChangeText={setName}
                                    modifiers={[
                                        frame({ minWidth: 160, alignment: 'trailing' }),
                                        tint('#007AFF'),
                                    ]}
                                />
                            </HStack>
                        </Section>

                        {/* Section 2: Account Classification */}
                        <Section title="Classification">
                            <Picker
                                label="Account Type"
                                options={accountTypeOptions}
                                selectedIndex={accountTypeIndex}
                                onOptionSelected={({ nativeEvent: { index } }) => {
                                    setAccountTypeIndex(index);
                                }}
                                variant="menu"
                                color={nativeControlTextColor}
                                modifiers={menuControlModifiers}
                            />

                            <HStack spacing={12} alignment="center" modifiers={[padding({ vertical: 4 })]}>
                                <SwiftUIText size={15} color={textColor}>
                                    Description
                                </SwiftUIText>
                                <Spacer />
                                <TextField
                                    placeholder="Optional note/usage..."
                                    defaultValue={description}
                                    onChangeText={setDescription}
                                    modifiers={[
                                        frame({ minWidth: 160, alignment: 'trailing' }),
                                        tint('#007AFF'),
                                    ]}
                                />
                            </HStack>
                        </Section>

                        {/* Section 3: Status */}
                        <Section title="Status">
                            <Picker
                                label="Status"
                                options={STATUS_OPTIONS}
                                selectedIndex={statusIndex}
                                onOptionSelected={({ nativeEvent: { index } }) => {
                                    setStatusIndex(index);
                                }}
                                variant="menu"
                                color={nativeControlTextColor}
                                modifiers={menuControlModifiers}
                            />
                        </Section>
                    </Form>
                </VStack>
            </BottomSheet>
        </Host>
    );
}

export const FinanceAccountEditSheetIOS = FinanceAccountEditSheet;
export default FinanceAccountEditSheet;
