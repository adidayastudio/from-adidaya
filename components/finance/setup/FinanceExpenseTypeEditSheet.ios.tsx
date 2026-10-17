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
    FinanceExpenseType,
    FinanceAccount,
    FinanceTaxRule,
} from '@/lib/api/financeSetup';

export interface FinanceExpenseTypeEditSheetProps {
    visible: boolean;
    onClose: () => void;
    expenseType?: FinanceExpenseType | null;
    existingExpenseTypes: FinanceExpenseType[];
    accounts?: FinanceAccount[];
    taxRules?: FinanceTaxRule[];
    onSave: (expenseType: FinanceExpenseType) => void;
    onDelete?: (expenseTypeId: string) => void;
}

export function FinanceExpenseTypeEditSheet({
    visible,
    onClose,
    expenseType,
    existingExpenseTypes,
    accounts,
    taxRules,
    onSave,
    onDelete,
}: FinanceExpenseTypeEditSheetProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';
    const nativeControlTextColor = isDark ? '#FFFFFF' : '#000000';
    const menuControlModifiers = [tint(isDark ? '#FFFFFF' : '#1C1C1E')];

    const isEditMode = !!expenseType;

    const [code, setCode] = useState('');
    const [name, setName] = useState('');
    const [taxRuleIndex, setTaxRuleIndex] = useState(0);
    const [accountIndex, setAccountIndex] = useState(0);

    const taxRuleOptions = useMemo(() => {
        if (taxRules && taxRules.length > 0) {
            const list = taxRules
                .filter((t: any) => t.active !== false)
                .map((t: any) => t.name || t.label || t.code)
                .filter(Boolean);
            return Array.from(new Set(['None', ...list]));
        }
        return ['None'];
    }, [taxRules]);

    const accountOptions = useMemo(() => {
        if (accounts && accounts.length > 0) {
            const list = accounts
                .filter((a: any) => a.active !== false)
                .map((a: any) => {
                    if (a.label) return a.label;
                    const codePart = a.code || a.accountNumber || '';
                    const namePart = a.name || a.accountName || '';
                    return codePart && namePart ? `${codePart} ${namePart}` : (namePart || codePart);
                })
                .filter(Boolean);

            return Array.from(new Set(['None', ...list]));
        }
        return ['None'];
    }, [accounts]);

    useEffect(() => {
        if (visible) {
            if (expenseType) {
                setCode(expenseType.code || '');
                setName(expenseType.name || '');

                const currentTax = expenseType.defaultTaxRule || expenseType.tax || 'None';
                const tIdx = taxRuleOptions.indexOf(currentTax);
                setTaxRuleIndex(tIdx >= 0 ? tIdx : 0);

                const currentAcc = expenseType.defaultAccount || 'None';
                const aIdx = accountOptions.indexOf(currentAcc);
                setAccountIndex(aIdx >= 0 ? aIdx : 0);
            } else {
                setCode('');
                setName('');
                setTaxRuleIndex(0);
                setAccountIndex(0);
            }
        }
    }, [visible, expenseType, taxRuleOptions, accountOptions]);

    const handleSave = () => {
        const cleanCode = code.trim().toUpperCase();
        const cleanName = name.trim();

        if (!cleanCode) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert('Required Field', 'Expense Type Code is required.');
            return;
        }

        if (!cleanName) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert('Required Field', 'Expense Type Name is required.');
            return;
        }

        // Duplicate code validation
        const isDuplicate = existingExpenseTypes.some(
            (e) => e.code?.toUpperCase() === cleanCode && (!expenseType || e.id !== expenseType.id)
        );

        if (isDuplicate) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert('Duplicate Code', `Expense Type Code "${cleanCode}" is already in use.`);
            return;
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        const updatedExpenseType: FinanceExpenseType = {
            id: expenseType ? expenseType.id : `exp_${Date.now()}`,
            code: cleanCode,
            name: cleanName,
            defaultTaxRule: taxRuleOptions[taxRuleIndex] || 'None',
            tax: taxRuleOptions[taxRuleIndex] || 'None',
            defaultAccount: accountOptions[accountIndex] || 'None',
            active: expenseType ? expenseType.active : true,
        };

        onSave(updatedExpenseType);
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
                            {isEditMode ? 'Edit Expense Type' : 'New Expense Type'}
                        </SwiftUIText>

                        <Spacer />

                        {/* Save Button */}
                        <Button variant="plain" onPress={handleSave}>
                            <SwiftUIText size={16} weight="bold" color="#2563EB">
                                {isEditMode ? 'Save' : 'Add'}
                            </SwiftUIText>
                        </Button>
                    </HStack>

                    {/* Native Form Controls */}
                    <Form modifiers={[background('clear'), frame({ maxWidth: 9999, maxHeight: 9999 })]}>
                        {/* Section 1: Identification */}
                        <Section title="Identification">
                            <HStack spacing={12} alignment="center" modifiers={[padding({ vertical: 4 })]}>
                                <SwiftUIText size={15} color={textColor}>
                                    Code
                                </SwiftUIText>
                                <Spacer />
                                <TextField
                                    placeholder="e.g. PP"
                                    defaultValue={code}
                                    onChangeText={(val) => setCode(val.toUpperCase())}
                                    modifiers={[
                                        frame({ minWidth: 100, alignment: 'trailing' }),
                                        tint('#2563EB'),
                                    ]}
                                />
                            </HStack>

                            <HStack spacing={12} alignment="center" modifiers={[padding({ vertical: 4 })]}>
                                <SwiftUIText size={15} color={textColor}>
                                    Name
                                </SwiftUIText>
                                <Spacer />
                                <TextField
                                    placeholder="e.g. Project Purchase"
                                    defaultValue={name}
                                    onChangeText={setName}
                                    modifiers={[
                                        frame({ minWidth: 160, alignment: 'trailing' }),
                                        tint('#2563EB'),
                                    ]}
                                />
                            </HStack>
                        </Section>

                        {/* Section 2: Accounting Defaults */}
                        <Section title="Accounting Defaults">
                            <Picker
                                label="Default Tax Rule"
                                options={taxRuleOptions}
                                selectedIndex={taxRuleIndex}
                                onOptionSelected={({ nativeEvent: { index } }) => {
                                    setTaxRuleIndex(index);
                                }}
                                variant="menu"
                                color={nativeControlTextColor}
                                modifiers={menuControlModifiers}
                            />

                            <Picker
                                label="Default Account"
                                options={accountOptions}
                                selectedIndex={accountIndex}
                                onOptionSelected={({ nativeEvent: { index } }) => {
                                    setAccountIndex(index);
                                }}
                                variant="menu"
                                color={nativeControlTextColor}
                                modifiers={menuControlModifiers}
                            />
                        </Section>

                        {isEditMode && onDelete && (
                            <Section>
                                <Button
                                    variant="plain"
                                    onPress={() => {
                                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                                        if (expenseType) onDelete(expenseType.id);
                                        onClose();
                                    }}
                                >
                                    <SwiftUIText size={15} color="#FF3B30">
                                        Delete Expense Type
                                    </SwiftUIText>
                                </Button>
                            </Section>
                        )}
                    </Form>
                </VStack>
            </BottomSheet>
        </Host>
    );
}

export const FinanceExpenseTypeEditSheetIOS = FinanceExpenseTypeEditSheet;
