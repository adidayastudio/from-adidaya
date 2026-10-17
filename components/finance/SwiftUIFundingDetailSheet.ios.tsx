import React from 'react';
import { Alert, Clipboard } from 'react-native';
import {
    Host,
    Form,
    Section,
    Button,
    BottomSheet,
    HStack,
    VStack,
    ZStack,
    Spacer,
    Text as SwiftUIText
} from '@expo/ui/swift-ui';
import { padding, frame, background, ignoreSafeArea, tint, foregroundColor, cornerRadius, buttonStyle } from '@expo/ui/swift-ui/modifiers';
import { useTheme } from '@/context/ThemeContext';
import { PlatformIcon } from '../ui/PlatformIcon';
import { supabase } from '@/lib/supabase';
import { useFinance } from '@/context/FinanceContext';

interface SwiftUIFundingDetailSheetProps {
    isOpened: boolean;
    onClose: () => void;
    source: any | null;
    matchedTransactions: any[];
    onEdit: (source: any) => void;
}

export const SwiftUIFundingDetailSheet: React.FC<SwiftUIFundingDetailSheetProps> = ({
    isOpened,
    onClose,
    source,
    matchedTransactions,
    onEdit
}) => {
    const { refreshData } = useFinance();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#C7C7CC' : '#8E8E93';
    const sheetBg = 'clear';

    if (!source) return null;

    const formatCurrency = (amount: number | string) => {
        const num = typeof amount === 'string' ? parseFloat(amount) : amount;
        if (isNaN(num)) return String(amount);
        return `Rp${num.toLocaleString('id-ID')}`;
    };

    const copyAccountNumber = () => {
        if (!source.account_number) return;
        try {
            Clipboard.setString(String(source.account_number));
            Alert.alert('Success', 'Account number copied to clipboard');
        } catch { }
    };

    const handleToggleActive = async () => {
        const nextActive = !source.is_active;
        onClose();
        try {
            const { error } = await supabase
                .from('funding_sources')
                .update({ is_active: nextActive })
                .eq('id', source.id);
                
            if (error) throw error;
            
            Alert.alert('Success', `Account ${nextActive ? 'activated' : 'deactivated'} successfully.`);
            refreshData();
        } catch (error: any) {
            console.error("Toggle active error:", error);
            Alert.alert('Error', error.message || 'Failed to update account status.');
        }
    };

    const handleDelete = () => {
        Alert.alert(
            'Confirm Delete',
            'Are you sure you want to delete this funding source? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        onClose();
                        try {
                            const { error } = await supabase
                                .from('funding_sources')
                                .delete()
                                .eq('id', source.id);
                                
                            if (error) throw error;
                            
                            Alert.alert('Success', 'Funding source deleted.');
                            refreshData();
                        } catch (error: any) {
                            console.error("Delete error:", error);
                            Alert.alert('Error', error.message || 'Failed to delete funding source.');
                        }
                    }
                }
            ]
        );
    };

    const getProviderColor = (provider: string) => {
        const p = (provider || '').toUpperCase();
        if (p.includes('BCA')) return '#003882';      // BCA Biru Tua
        if (p.includes('MANDIRI')) return '#FFC800';  // Mandiri Kuning
        if (p.includes('BRI')) return '#00A4E4';      // BRI Biru Muda
        if (p.includes('BNI')) return '#008080';      // BNI Tosca
        return '#8E8E93';                             // Default Gray
    };

    const providerColor = getProviderColor(source.provider);

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
                <ZStack>
                    <VStack spacing={0} modifiers={[
                        ignoreSafeArea({ edges: 'bottom' }),
                        background(sheetBg),
                        tint('#8E8E93')
                    ]}>
                        {/* Custom SwiftUI Header */}
                        <HStack alignment="center" modifiers={[padding({ top: 20, leading: 20, trailing: 20, bottom: 10 })]}>
                            <VStack alignment="leading" spacing={2}>
                                <HStack alignment="center" spacing={8}>
                                    <SwiftUIText 
                                        size={12} 
                                        weight="bold" 
                                        modifiers={[
                                            padding({ vertical: 4, horizontal: 8 }),
                                            background(providerColor + '20'),
                                            foregroundColor(isDark ? '#FFFFFF' : providerColor),
                                            cornerRadius(6)
                                        ]}
                                    >
                                        {(source.provider || 'Source').toUpperCase()}
                                    </SwiftUIText>
                                    {!source.is_active && (
                                        <SwiftUIText 
                                            size={12} 
                                            weight="bold" 
                                            modifiers={[
                                                padding({ vertical: 4, horizontal: 8 }),
                                                background(isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'),
                                                foregroundColor(isDark ? '#FFFFFF' : '#8E8E93'),
                                                cornerRadius(6)
                                            ]}
                                        >
                                            INACTIVE
                                        </SwiftUIText>
                                    )}
                                </HStack>
                                <SwiftUIText size={20} weight="bold" color={textColor}>
                                    {source.name || 'Account'}
                                </SwiftUIText>
                            </VStack>
                            <Spacer />
                            <Button
                                systemImage="xmark"
                                role="cancel"
                                variant="glass"
                                color="gray"
                                onPress={onClose}
                            />
                        </HStack>

                        {/* SwiftUI Form Details */}
                        <Form modifiers={[background(sheetBg), foregroundColor(textColor)]}>
                            {/* Account Info */}
                            <Section title="Account Information">
                                <HStack>
                                    <SwiftUIText color={subtextColor}>Bank Provider</SwiftUIText>
                                    <Spacer />
                                    <SwiftUIText color={textColor} weight="semibold">
                                        {source.provider || '-'}
                                    </SwiftUIText>
                                </HStack>
                                <HStack>
                                    <SwiftUIText color={subtextColor}>Account Name</SwiftUIText>
                                    <Spacer />
                                    <SwiftUIText color={textColor}>
                                        {source.name || '-'}
                                    </SwiftUIText>
                                </HStack>
                                <HStack alignment="center">
                                    <SwiftUIText color={subtextColor}>Account Number</SwiftUIText>
                                    <Spacer />
                                    <HStack alignment="center" spacing={8}>
                                        <SwiftUIText color={textColor} weight="semibold">
                                            {source.account_number || '-'}
                                        </SwiftUIText>
                                        {source.account_number && (
                                            <Button
                                                systemImage="doc.on.doc"
                                                variant="plain"
                                                color="gray"
                                                onPress={copyAccountNumber}
                                                modifiers={[
                                                    foregroundColor(isDark ? '#A1A1A6' : '#8E8E93')
                                                ]}
                                            />
                                        )}
                                    </HStack>
                                </HStack>
                                <HStack>
                                    <SwiftUIText color={subtextColor}>Currency</SwiftUIText>
                                    <Spacer />
                                    <SwiftUIText color={textColor} weight="medium">
                                        {source.currency || 'IDR'}
                                    </SwiftUIText>
                                </HStack>
                                <HStack>
                                    <SwiftUIText color={subtextColor}>Account Type</SwiftUIText>
                                    <Spacer />
                                    <SwiftUIText color={textColor}>
                                        {source.type || 'Savings'}
                                    </SwiftUIText>
                                </HStack>
                            </Section>

                            {/* Available Balance */}
                            <Section title="Available Balance">
                                <HStack>
                                    <SwiftUIText color={subtextColor}>Balance</SwiftUIText>
                                    <Spacer />
                                    <SwiftUIText 
                                        weight="bold" 
                                        size={18} 
                                        color={source.balance < 0 ? '#FF3B30' : '#34C759'}
                                    >
                                        {formatCurrency(source.balance || 0)}
                                    </SwiftUIText>
                                </HStack>
                            </Section>

                            {/* Transaction Matching */}
                            <Section title="Transaction Matching">
                                {matchedTransactions.length === 0 ? (
                                    <VStack alignment="center" spacing={12} modifiers={[
                                        padding({ vertical: 24, horizontal: 16 }),
                                        frame({ maxWidth: Infinity })
                                    ]}>
                                        <PlatformIcon name="clock.arrow.2.circlepath" size={28} tintColor={isDark ? '#A1A1A6' : '#8E8E93'} style={{ opacity: 0.6 }} />
                                        <SwiftUIText size={13} color={subtextColor} weight="medium">
                                            No matched paid transactions found.
                                        </SwiftUIText>
                                    </VStack>
                                ) : (
                                    matchedTransactions.map(tx => (
                                        <HStack key={tx.id} modifiers={[padding({ vertical: 6 })]}>
                                            <VStack alignment="leading" spacing={2}>
                                                <SwiftUIText weight="bold" size={14} color={textColor}>
                                                    {tx.ref}
                                                </SwiftUIText>
                                                <SwiftUIText size={12} color={subtextColor}>
                                                    {`${tx.title} • ${new Date(tx.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`}
                                                </SwiftUIText>
                                            </VStack>
                                            <Spacer />
                                            <SwiftUIText weight="semibold" size={15} color="#FF3B30">
                                                {`-${formatCurrency(tx.amount)}`}
                                            </SwiftUIText>
                                        </HStack>
                                    ))
                                )}
                            </Section>
                        </Form>

                        {/* Actions group at the bottom */}
                        <VStack spacing={8} modifiers={[background(sheetBg), padding({ top: 12, leading: 20, trailing: 20, bottom: 30 })]}>
                            {/* Row 1: Delete (Icon Only) + Deactivate/Activate */}
                            <HStack spacing={8}>
                                <Button
                                    variant="glass"
                                    color="red"
                                    onPress={handleDelete}
                                    modifiers={[frame({ width: 56 }), cornerRadius(999)]}
                                >
                                    <HStack alignment="center" modifiers={[frame({ height: 48 })]}>
                                        <Spacer />
                                        <PlatformIcon name="trash" size={20} tintColor="#FF3B30" />
                                        <Spacer />
                                    </HStack>
                                </Button>

                                <Button
                                    variant="glass"
                                    color={source.is_active ? '#FF9500' : '#34C759'}
                                    onPress={handleToggleActive}
                                    modifiers={[
                                        frame({ maxWidth: Infinity }),
                                        cornerRadius(999)
                                    ]}
                                >
                                    <HStack alignment="center" modifiers={[frame({ maxWidth: Infinity }), frame({ height: 48 })]}>
                                        <Spacer />
                                        <SwiftUIText 
                                            weight="bold" 
                                            size={17} 
                                            color={source.is_active ? '#FF9500' : '#34C759'}
                                        >
                                            {source.is_active ? 'Deactivate' : 'Activate'}
                                        </SwiftUIText>
                                        <Spacer />
                                    </HStack>
                                </Button>
                            </HStack>

                            {/* Row 2: Edit (Full Width, Prominent Blue) */}
                            <Button
                                variant="glassProminent"
                                color="#007AFF"
                                onPress={() => onEdit(source)}
                                modifiers={[frame({ maxWidth: Infinity }), cornerRadius(999)]}
                            >
                                <HStack alignment="center" modifiers={[frame({ maxWidth: Infinity }), frame({ height: 48 })]}>
                                    <Spacer />
                                    <SwiftUIText weight="semibold" size={17} color="#FFFFFF">Edit Details</SwiftUIText>
                                    <Spacer />
                                </HStack>
                            </Button>
                        </VStack>
                    </VStack>
                </ZStack>
            </BottomSheet>
        </Host>
    );
};
