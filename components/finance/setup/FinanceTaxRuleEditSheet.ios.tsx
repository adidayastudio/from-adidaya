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
    FinanceTaxRule,
    FinanceAccount,
    TaxType,
    TAX_TYPE_OPTIONS,
} from '@/lib/api/financeSetup';

export interface FinanceTaxRuleEditSheetProps {
    visible: boolean;
    onClose: () => void;
    taxRule?: FinanceTaxRule | null;
    existingTaxRules: FinanceTaxRule[];
    accounts?: FinanceAccount[];
    onSave: (taxRule: FinanceTaxRule) => void;
}

const STATUS_OPTIONS = ['Active', 'Inactive'];

export function FinanceTaxRuleEditSheet({
    visible,
    onClose,
    taxRule,
    existingTaxRules,
    accounts = [],
    onSave,
}: FinanceTaxRuleEditSheetProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';
    const nativeControlTextColor = isDark ? '#FFFFFF' : '#000000';
    const menuControlModifiers = [tint(isDark ? '#FFFFFF' : '#1C1C1E')];

    const isEditMode = !!taxRule;

    const [code, setCode] = useState('');
    const [name, setName] = useState('');
    const [rateStr, setRateStr] = useState('11');
    const [taxTypeIndex, setTaxTypeIndex] = useState(0);
    const [accountIndex, setAccountIndex] = useState(0);
    const [description, setDescription] = useState('');
    const [statusIndex, setStatusIndex] = useState(0);

    const taxTypeOptions = useMemo(() => {
        return TAX_TYPE_OPTIONS.map((t) => t.label);
    }, []);

    const accountOptions = useMemo(() => {
        if (accounts && accounts.length > 0) {
            const list = accounts
                .filter((a) => a.active !== false)
                .map((a) => {
                    const code = a.code || '';
                    const name = a.name || '';
                    return code && name ? `${code} ${name}` : (name || code || a.name);
                })
                .filter(Boolean);
            return ['None', ...list];
        }
        return ['None'];
    }, [accounts]);

    useEffect(() => {
        if (visible) {
            if (taxRule) {
                setCode(taxRule.code || '');
                setName(taxRule.name || '');
                setRateStr(taxRule.rate !== undefined ? String(taxRule.rate) : '0');
                setDescription(taxRule.description || '');
                setStatusIndex(taxRule.active !== false ? 0 : 1);

                const currentTypeIndex = TAX_TYPE_OPTIONS.findIndex((t) => t.value === taxRule.taxType);
                setTaxTypeIndex(currentTypeIndex >= 0 ? currentTypeIndex : 0);

                const currentAcc = taxRule.defaultAccount || 'None';
                const aIdx = accountOptions.indexOf(currentAcc);
                setAccountIndex(aIdx >= 0 ? aIdx : 0);
            } else {
                setCode('');
                setName('');
                setRateStr('11');
                setDescription('');
                setTaxTypeIndex(0);
                setAccountIndex(1); // Default to 2-1100 PPN Masukan
                setStatusIndex(0);
            }
        }
    }, [visible, taxRule, accountOptions]);

    const handleSave = () => {
        const cleanCode = code.trim().toUpperCase();
        const cleanName = name.trim();
        const parsedRate = parseFloat(rateStr.replace(',', '.'));

        if (!cleanCode) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert('Required Field', 'Tax Rule Code is required.');
            return;
        }

        if (!cleanName) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert('Required Field', 'Tax Rule Name is required.');
            return;
        }

        if (isNaN(parsedRate) || parsedRate < 0) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert('Invalid Tax Rate', 'Please enter a valid non-negative number for tax rate.');
            return;
        }

        // Duplicate code validation
        const isDuplicate = existingTaxRules.some(
            (t) => t.code?.toUpperCase() === cleanCode && (!taxRule || t.id !== taxRule.id)
        );

        if (isDuplicate) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert('Duplicate Code', `Tax Rule Code "${cleanCode}" is already in use.`);
            return;
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        const updatedTaxRule: FinanceTaxRule = {
            id: taxRule ? taxRule.id : `tax_${Date.now()}`,
            code: cleanCode,
            name: cleanName,
            rate: parsedRate,
            taxType: TAX_TYPE_OPTIONS[taxTypeIndex]?.value || 'vat',
            description: description.trim() || undefined,
            defaultAccount: accountOptions[accountIndex] || 'None',
            active: statusIndex === 0,
        };

        onSave(updatedTaxRule);
        onClose();
    };

    return (
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet
                isOpened={visible}
                presentationDetents={[0.85, 0.94]}
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
                            {isEditMode ? 'Edit Tax Rule' : 'New Tax Rule'}
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
                                    placeholder="e.g. PPN11"
                                    defaultValue={code}
                                    onChangeText={(val) => setCode(val.toUpperCase())}
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
                                    placeholder="e.g. PPN 11%"
                                    defaultValue={name}
                                    onChangeText={setName}
                                    modifiers={[
                                        frame({ minWidth: 160, alignment: 'trailing' }),
                                        tint('#007AFF'),
                                    ]}
                                />
                            </HStack>
                        </Section>

                        {/* Section 2: Rate & Classification */}
                        <Section title="Rate & Classification">
                            <HStack spacing={12} alignment="center" modifiers={[padding({ vertical: 4 })]}>
                                <SwiftUIText size={15} color={textColor}>
                                    Tax Rate (%)
                                </SwiftUIText>
                                <Spacer />
                                <TextField
                                    placeholder="e.g. 11"
                                    defaultValue={rateStr}
                                    onChangeText={setRateStr}
                                    modifiers={[
                                        frame({ minWidth: 80, alignment: 'trailing' }),
                                        tint('#007AFF'),
                                    ]}
                                />
                            </HStack>

                            <Picker
                                label="Tax Type"
                                options={taxTypeOptions}
                                selectedIndex={taxTypeIndex}
                                onOptionSelected={({ nativeEvent: { index } }) => {
                                    setTaxTypeIndex(index);
                                    if (index === 3) {
                                        // Tax exempt
                                        setRateStr('0');
                                    }
                                }}
                                variant="menu"
                                color={nativeControlTextColor}
                                modifiers={menuControlModifiers}
                            />
                        </Section>

                        {/* Section 3: Accounting & Ledger Mapping */}
                        <Section title="Accounting Defaults">
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

                            <HStack spacing={12} alignment="center" modifiers={[padding({ vertical: 4 })]}>
                                <SwiftUIText size={15} color={textColor}>
                                    Description
                                </SwiftUIText>
                                <Spacer />
                                <TextField
                                    placeholder="Optional note..."
                                    defaultValue={description}
                                    onChangeText={setDescription}
                                    modifiers={[
                                        frame({ minWidth: 160, alignment: 'trailing' }),
                                        tint('#007AFF'),
                                    ]}
                                />
                            </HStack>
                        </Section>

                        {/* Section 4: Status */}
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

export const FinanceTaxRuleEditSheetIOS = FinanceTaxRuleEditSheet;
export default FinanceTaxRuleEditSheet;
