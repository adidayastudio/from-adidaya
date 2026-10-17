import React, { useState, useEffect } from 'react';
import { Alert, Platform } from 'react-native';
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
    LabeledContent,
    Text as SwiftUIText
} from '@expo/ui/swift-ui';
import { padding, background, ignoreSafeArea, tint, frame, cornerRadius } from '@expo/ui/swift-ui/modifiers';
import { useTheme } from '@/context/ThemeContext';
import { CrewMember } from './mockData';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

interface SwiftUIAdjustmentSheetProps {
    isOpened: boolean;
    onClose: () => void;
    onSave: (amount: number, reason: string, proofName: string, proofUrl: string, isPositive: boolean) => void;
    crewMember: CrewMember | null;
    initialAmount: number;
    initialReason: string;
    initialProofName: string;
    initialProofUrl: string;
    initialIsPositive: boolean;
}

export const SwiftUIAdjustmentSheet: React.FC<SwiftUIAdjustmentSheetProps> = ({
    isOpened,
    onClose,
    onSave,
    crewMember,
    initialAmount,
    initialReason,
    initialProofName,
    initialProofUrl,
    initialIsPositive,
}) => {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#C7C7CC' : 'gray';
    const sheetBg = 'clear';
    const textFieldModifiers = [tint('#007AFF')];

    // Internal Form States
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [isPositiveIndex, setIsPositiveIndex] = useState(0); // 0 = Addition, 1 = Deduction
    const [proofName, setProofName] = useState('');
    const [proofUrl, setProofUrl] = useState('');

    useEffect(() => {
        if (isOpened) {
            setAmount(initialAmount > 0 ? String(initialAmount) : '');
            setReason(initialReason);
            setIsPositiveIndex(initialIsPositive ? 0 : 1);
            setProofName(initialProofName);
            setProofUrl(initialProofUrl);
        }
    }, [isOpened, initialAmount, initialReason, initialProofName, initialProofUrl, initialIsPositive]);

    const handlePickProof = () => {
        Alert.alert('Attach Proof', 'Choose a source', [
            {
                text: 'Photo Library',
                onPress: async () => {
                    try {
                        const result = await ImagePicker.launchImageLibraryAsync({
                            mediaTypes: ['images'],
                            allowsMultipleSelection: false,
                            quality: 0.5,
                        });
                        if (!result.canceled && result.assets && result.assets.length > 0) {
                            const asset = result.assets[0];
                            setProofName(asset.fileName || asset.uri.split('/').pop() || `proof_${Date.now()}.jpg`);
                            setProofUrl(asset.uri);
                        }
                    } catch (err) {
                        console.log('ImagePicker Error:', err);
                    }
                },
            },
            {
                text: 'Files / PDF',
                onPress: async () => {
                    try {
                        const result = await DocumentPicker.getDocumentAsync({
                            type: ['image/*', 'application/pdf'],
                            copyToCacheDirectory: true,
                            multiple: false,
                        });
                        if (!result.canceled && result.assets && result.assets.length > 0) {
                            const asset = result.assets[0];
                            setProofName(asset.name || asset.uri.split('/').pop() || `proof_${Date.now()}`);
                            setProofUrl(asset.uri);
                        }
                    } catch (err) {
                        console.log('DocumentPicker Error:', err);
                    }
                },
            },
            { text: 'Cancel', style: 'cancel' },
        ]);
    };

    const handleSave = () => {
        if (!crewMember) return;
        const parsedAmount = Number(amount.replace(/[^0-9]/g, ''));
        if (!parsedAmount || parsedAmount <= 0) {
            Alert.alert('Error', 'Amount must be greater than 0.');
            return;
        }
        if (!reason.trim()) {
            Alert.alert('Error', 'Please enter a reason for the adjustment.');
            return;
        }
        if (!proofName) {
            Alert.alert('Error', 'Please upload proof for the adjustment.');
            return;
        }

        onSave(parsedAmount, reason.trim(), proofName, proofUrl, isPositiveIndex === 0);
    };

    const isPositive = isPositiveIndex === 0;

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
                    background(sheetBg)
                ]}>
                    {/* Header */}
                    <HStack alignment="center" modifiers={[padding({ top: 20, leading: 20, trailing: 20, bottom: 10 })]}>
                        <VStack spacing={2} alignment="leading">
                            <SwiftUIText size={22} weight="bold" color={textColor}>
                                Adjust Payroll
                            </SwiftUIText>
                            <SwiftUIText size={13} weight="semibold" color={subtextColor}>
                                {crewMember?.name || ''}
                            </SwiftUIText>
                        </VStack>
                        <Spacer />
                        <Button
                            systemImage="xmark"
                            role="cancel"
                            color="gray"
                            onPress={onClose}
                        />
                    </HStack>

                    {/* Scrollable Form */}
                    <Form modifiers={[background(sheetBg)]}>
                        <Section title="Adjustment Type">
                            <Picker
                                options={['Addition', 'Deduction']}
                                selectedIndex={isPositiveIndex}
                                onOptionSelected={(e) => setIsPositiveIndex(e.nativeEvent.index)}
                                variant="segmented"
                                modifiers={[
                                    tint(isPositive ? '#34C759' : '#FF3B30')
                                ]}
                            />
                        </Section>

                        <Section title="Details">
                            <LabeledContent label="Amount (Rp)">
                                <TextField
                                    placeholder="Enter amount"
                                    defaultValue={amount}
                                    onChangeText={(v) => {
                                        const clean = v.replace(/[^0-9]/g, '');
                                        setAmount(clean);
                                    }}
                                    keyboardType="numeric"
                                    modifiers={textFieldModifiers}
                                />
                            </LabeledContent>
                            <LabeledContent label="Reason / Description *">
                                <TextField
                                    placeholder="Explain the reason for this adjustment..."
                                    defaultValue={reason}
                                    onChangeText={setReason}
                                    modifiers={textFieldModifiers}
                                />
                            </LabeledContent>
                        </Section>

                        <Section title="Proof">
                            <VStack spacing={8} alignment="leading" modifiers={[padding({ vertical: 4 })]}>
                                <SwiftUIText size={13} color={subtextColor}>Proof Document / Photo *</SwiftUIText>
                                {proofName ? (
                                    <HStack alignment="center" modifiers={[padding({ vertical: 4 })]}>
                                        <SwiftUIText size={14} color={textColor}>
                                            {proofName}
                                        </SwiftUIText>
                                        <Spacer />
                                        <Button
                                            systemImage="trash.fill"
                                            color="red"
                                            onPress={() => {
                                                setProofName('');
                                                setProofUrl('');
                                            }}
                                        />
                                    </HStack>
                                ) : (
                                    <Button
                                        variant="glass"
                                        onPress={handlePickProof}
                                        modifiers={[cornerRadius(999)]}
                                    >
                                        <HStack modifiers={[frame({ height: 44 })]}>
                                            <Spacer />
                                            <SwiftUIText weight="semibold" size={16} color="#007AFF">
                                                Upload Photo / PDF
                                            </SwiftUIText>
                                            <Spacer />
                                        </HStack>
                                    </Button>
                                )}
                            </VStack>
                        </Section>
                    </Form>

                    {/* Footer buttons */}
                    <VStack spacing={12} modifiers={[
                        background(sheetBg),
                        padding({ top: 12, leading: 20, trailing: 20, bottom: Platform.OS === 'ios' ? 36 : 24 }),
                        frame({ maxWidth: Infinity })
                    ]}>
                        <HStack spacing={12}>
                            <Button
                                variant="glass"
                                color="gray"
                                onPress={onClose}
                                modifiers={[
                                    frame({ width: 100 }),
                                    cornerRadius(999)
                                ]}
                            >
                                <HStack modifiers={[
                                    frame({ maxWidth: Infinity }),
                                    frame({ height: 44 })
                                ]}>
                                    <Spacer />
                                    <SwiftUIText weight="semibold" size={17}>Cancel</SwiftUIText>
                                    <Spacer />
                                </HStack>
                            </Button>
                            <Button
                                variant="borderedProminent"
                                color="#007AFF"
                                onPress={handleSave}
                                modifiers={[
                                    frame({ maxWidth: Infinity }),
                                    cornerRadius(999)
                                ]}
                            >
                                <HStack modifiers={[
                                    frame({ maxWidth: Infinity }),
                                    frame({ height: 44 })
                                ]}>
                                    <Spacer />
                                    <SwiftUIText weight="semibold" size={17} color="#FFFFFF">
                                        Save Adjustment
                                    </SwiftUIText>
                                    <Spacer />
                                </HStack>
                            </Button>
                        </HStack>
                    </VStack>
                </VStack>
            </BottomSheet>
        </Host>
    );
};
