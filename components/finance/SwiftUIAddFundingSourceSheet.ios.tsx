import React, { useState, useEffect, useMemo } from 'react';
import { Alert } from 'react-native';
import { 
    Host,
    Form, 
    Section, 
    TextField, 
    Button, 
    BottomSheet, 
    HStack, 
    VStack, 
    Spacer, 
    Picker, 
    Text as SwiftUIText
} from '@expo/ui/swift-ui';
import { padding, frame, background, ignoreSafeArea, tint, foregroundColor, foregroundStyle } from '@expo/ui/swift-ui/modifiers';
import { supabase } from '@/lib/supabase';
import { useFinance } from '@/context/FinanceContext';
import { useTheme } from '@/context/ThemeContext';

interface SwiftUIAddFundingSourceSheetProps {
    isOpened: boolean;
    onClose: () => void;
    source?: any | null;
}

export const SwiftUIAddFundingSourceSheet: React.FC<SwiftUIAddFundingSourceSheetProps> = ({
    isOpened,
    onClose,
    source = null
}) => {
    const { refreshData } = useFinance();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const controlTint = isDark ? '#FFFFFF' : '#8E8E93';
    const sheetBg = 'clear';
    const nativeControlTextColor = isDark ? '#FFFFFF' : '#8E8E93';
    const menuControlModifiers = isDark
        ? [foregroundColor('#FFFFFF'), foregroundStyle('#FFFFFF'), tint('#FFFFFF')]
        : [tint('#8E8E93')];
    const segmentedControlModifiers = isDark
        ? [foregroundColor('#FFFFFF'), foregroundStyle('#FFFFFF'), tint('#FFFFFF')]
        : [tint('#8E8E93')];
    const textFieldModifiers = isDark
        ? [foregroundColor('#F2F2F7'), foregroundStyle('#F2F2F7'), tint('#F2F2F7')]
        : [];
    
    // Form State
    const [bankIndex, setBankIndex] = useState<number>(0);
    const [customBankName, setCustomBankName] = useState('');
    const [accountName, setAccountName] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [balanceStr, setBalanceStr] = useState('');
    const [typeIndex, setTypeIndex] = useState<number>(0);
    const [currencyIndex, setCurrencyIndex] = useState<number>(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const BANK_OPTIONS = ['BCA', 'Mandiri', 'BRI', 'BNI', 'BTN', 'BSI', 'Custom'];
    const ACCOUNT_TYPES = ['Savings', 'Current', 'Credit', 'Cash'];
    const CURRENCY_TYPES = ['IDR', 'USD', 'EUR', 'SGD'];

    const formattedPreview = useMemo(() => {
        const val = parseInt(balanceStr.replace(/[^0-9]/g, ''), 10) || 0;
        return `Rp ${val.toLocaleString('id-ID')}`;
    }, [balanceStr]);

    // Reset or load pre-filled data when opening
    useEffect(() => {
        if (isOpened) {
            if (source) {
                const provider = source.provider || '';
                const isCommon = BANK_OPTIONS.slice(0, -1).includes(provider);
                const cleanProvider = isCommon ? provider : 'Custom';
                
                const bIdx = BANK_OPTIONS.indexOf(cleanProvider);
                setBankIndex(bIdx >= 0 ? bIdx : 0);
                setCustomBankName(cleanProvider === 'Custom' ? provider : '');
                
                setAccountName(source.name || '');
                setAccountNumber(source.account_number || '');
                setBalanceStr(String(source.balance || 0));
                
                const tIdx = ACCOUNT_TYPES.indexOf(source.type || 'Savings');
                setTypeIndex(tIdx >= 0 ? tIdx : 0);
                
                const cIdx = CURRENCY_TYPES.indexOf(source.currency || 'IDR');
                setCurrencyIndex(cIdx >= 0 ? cIdx : 0);
            } else {
                setBankIndex(0);
                setCustomBankName('');
                setAccountName('');
                setAccountNumber('');
                setBalanceStr('');
                setTypeIndex(0);
                setCurrencyIndex(0);
            }
            setIsSubmitting(false);
        }
    }, [isOpened, source]);

    const handleSubmit = async () => {
        const chosenBank = BANK_OPTIONS[bankIndex] === 'Custom' ? customBankName : BANK_OPTIONS[bankIndex];
        
        if (!chosenBank.trim() || !accountName.trim() || !accountNumber.trim()) {
            Alert.alert('Error', 'Please fill in Bank Name, Account Name, and Account Number.');
            return;
        }

        setIsSubmitting(true);
        try {
            const initialBalance = parseInt(balanceStr.replace(/[^0-9]/g, ''), 10) || 0;
            const type = ACCOUNT_TYPES[typeIndex];
            const currency = CURRENCY_TYPES[currencyIndex];

            // Close sheet immediately for instant snappy feedback
            onClose();

            if (source) {
                // Edit Mode
                const { error } = await supabase
                    .from('funding_sources')
                    .update({
                        provider: chosenBank.trim(),
                        name: accountName,
                        account_number: accountNumber,
                        balance: initialBalance,
                        type: type,
                        currency: currency
                    })
                    .eq('id', source.id);

                if (error) throw error;
                Alert.alert('Success', 'Funding source has been updated successfully!');
            } else {
                // Add Mode
                const { data: wsData } = await supabase.from('workspaces').select('id').limit(1);
                const wsId = wsData?.[0]?.id || 'f39364e8-1376-4ff7-a716-78277e8d25b3';

                const { error } = await supabase.from('funding_sources').insert([{
                    provider: chosenBank.trim(),
                    name: accountName,
                    account_number: accountNumber,
                    balance: initialBalance,
                    type: type,
                    currency: currency,
                    workspace_id: wsId
                }]);

                if (error) throw error;
                Alert.alert('Success', 'Funding source has been added successfully!');
            }

            refreshData();
        } catch (error: any) {
            console.error("Submission error:", error);
            Alert.alert('Error', error.message || 'Failed to save funding source.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet 
                isOpened={isOpened}
                presentationDetents={[0.85]}
                onIsOpenedChange={(opened) => {
                    if (!opened) {
                        onClose();
                    }
                }}
            >
                <VStack spacing={0} modifiers={[
                    ignoreSafeArea({ edges: 'bottom' }),
                    background(sheetBg),
                    tint(controlTint)
                ]}>
                    {/* Header */}
                    <HStack alignment="center" modifiers={[padding({ top: 20, leading: 20, trailing: 20, bottom: 10 })]}>
                        <SwiftUIText size={22} weight="bold" color={textColor}>
                            {source ? "Edit Funding Source" : "New Funding Source"}
                        </SwiftUIText>
                        <Spacer />
                        <Button
                            systemImage="xmark"
                            role="cancel"
                            color="gray"
                            onPress={onClose}
                        />
                    </HStack>

                    {/* Scrollable Form */}
                    <Form modifiers={[
                        background(sheetBg),
                        foregroundColor(textColor),
                        tint(controlTint)
                    ]}>
                        <Section title="Account Identity">
                            <Picker
                                label="Bank Provider"
                                options={BANK_OPTIONS}
                                selectedIndex={bankIndex}
                                onOptionSelected={(e) => setBankIndex(e.nativeEvent.index)}
                                variant="menu"
                                color={nativeControlTextColor}
                                modifiers={menuControlModifiers}
                            />
                            {BANK_OPTIONS[bankIndex] === 'Custom' && (
                                <TextField
                                    placeholder="Enter Bank or Provider Name"
                                    defaultValue={customBankName}
                                    onChangeText={setCustomBankName}
                                    modifiers={textFieldModifiers}
                                />
                            )}
                            <TextField
                                placeholder="Account Holder Name (e.g. PT Mahardika Adidaya Main Ops)"
                                defaultValue={accountName}
                                onChangeText={setAccountName}
                                modifiers={textFieldModifiers}
                            />
                            <TextField
                                placeholder="Account Number"
                                defaultValue={accountNumber}
                                keyboardType="numeric"
                                onChangeText={setAccountNumber}
                                modifiers={textFieldModifiers}
                            />
                        </Section>

                        <Section title="Balance Info">
                            <TextField
                                placeholder="Initial Balance"
                                defaultValue={balanceStr}
                                keyboardType="numeric"
                                onChangeText={setBalanceStr}
                                modifiers={textFieldModifiers}
                            />
                            {balanceStr.trim().length > 0 && (
                                <SwiftUIText size={18} weight="bold" color="#007AFF">
                                    {formattedPreview}
                                </SwiftUIText>
                            )}
                        </Section>

                        <Section title="Account Type">
                            <Picker
                                options={ACCOUNT_TYPES}
                                selectedIndex={typeIndex}
                                onOptionSelected={(e) => setTypeIndex(e.nativeEvent.index)}
                                variant="segmented"
                                modifiers={segmentedControlModifiers}
                            />
                        </Section>

                        <Section title="Currency">
                            <Picker
                                options={CURRENCY_TYPES}
                                selectedIndex={currencyIndex}
                                onOptionSelected={(e) => setCurrencyIndex(e.nativeEvent.index)}
                                variant="segmented"
                                modifiers={segmentedControlModifiers}
                            />
                        </Section>
                    </Form>

                    {/* Sticky Glass Footer Buttons */}
                    <HStack spacing={12} modifiers={[
                        background(sheetBg),
                        padding({ top: 12, leading: 20, trailing: 20, bottom: 20 }),
                        frame({ maxWidth: Infinity })
                    ]}>
                        <Button
                            variant="glass"
                            color="gray"
                            onPress={onClose}
                        >
                            <HStack modifiers={[
                                frame({ maxWidth: Infinity }),
                                frame({ height: 42 })
                            ]}>
                                <Spacer />
                                <SwiftUIText weight="semibold" size={17}>Cancel</SwiftUIText>
                                <Spacer />
                            </HStack>
                        </Button>
                        <Button
                            variant="glassProminent"
                            color="#007AFF"
                            onPress={handleSubmit}
                            disabled={isSubmitting}
                        >
                            <HStack modifiers={[
                                frame({ maxWidth: Infinity }),
                                frame({ height: 42 })
                            ]}>
                                <Spacer />
                                <SwiftUIText weight="semibold" size={17}>
                                    {isSubmitting ? "Saving..." : "Save Fund"}
                                </SwiftUIText>
                                <Spacer />
                            </HStack>
                        </Button>
                    </HStack>
                </VStack>
            </BottomSheet>
        </Host>
    );
};
