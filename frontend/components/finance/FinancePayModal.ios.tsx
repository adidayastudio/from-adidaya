import React, { useEffect, useMemo, useState } from 'react';
import {
    StyleSheet,
    Alert,
    ActivityIndicator,
    Image as RNImage,
    Platform,
    View,
    Clipboard
} from 'react-native';
import { 
    Host,
    Form, 
    Section, 
    Button, 
    BottomSheet, 
    HStack, 
    VStack, 
    Spacer, 
    Picker, 
    DateTimePicker,
    TextField,
    Text as SwiftUIText
} from '@expo/ui/swift-ui';
import { padding, frame, background, ignoreSafeArea, tint, foregroundColor, foregroundStyle } from '@expo/ui/swift-ui/modifiers';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { uploadFinanceFileBase64 } from '@/lib/api/finance';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import {
    getFinanceBankAccounts,
    getFinancePaymentCycles,
    generateDocumentCode,
    FinanceBankAccount,
    FinancePaymentCycle,
} from '@/lib/api/financeSetup';

interface FinancePayModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: (payload: {
        source_of_fund_id: string;
        payment_date: string;
        payment_proof_url?: string;
        amount: number;
    }) => Promise<void>;
    request: {
        id?: string;
        ref?: string;
        title?: string;
        amount?: number | string;
        approved_amount?: number | string;
        beneficiary_name?: string;
        beneficiary_bank?: string;
        beneficiary_number?: string;
    } | null;
    fundingSources: any[];
    isEmbedded?: boolean;
}

interface UploadedFile {
    uri: string;
    name: string;
    mimeType?: string;
    base64?: string;
}

function formatCurrency(amount: number) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount).replace('IDR', 'Rp');
}

export function FinancePayModal({
    visible,
    onClose,
    onConfirm,
    request,
    fundingSources,
    isEmbedded = false,
}: FinancePayModalProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const isSystemAlertActive = React.useRef(false);
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#C7C7CC' : '#8E8E93';
    const sheetBg = 'clear';
    const nativeControlTextColor = isDark ? '#FFFFFF' : '#000000';
    const menuControlModifiers = isDark
        ? [foregroundColor('#FFFFFF'), foregroundStyle('#FFFFFF'), tint('#FFFFFF')]
        : [tint('#1C1C1E')];

    const [selectedIndex, setSelectedIndex] = useState<number>(0);
    const [paymentDate, setPaymentDate] = useState(new Date());
    const [paymentTypeIndex, setPaymentTypeIndex] = useState<number>(0);
    const [partialAmount, setPartialAmount] = useState<string>('');
    const [proofs, setProofs] = useState<UploadedFile[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [companyBankAccounts, setCompanyBankAccounts] = useState<FinanceBankAccount[]>([]);
    const [paymentCycles, setPaymentCycles] = useState<FinancePaymentCycle[]>([]);

    const totalAmount = useMemo(() => {
        if (!request) return 0;
        const raw = request.approved_amount ?? request.amount ?? 0;
        const num = typeof raw === 'string' ? parseFloat(raw) : raw;
        return isNaN(num) ? 0 : Math.round(num);
    }, [request]);

    const alreadyPaidAmount = useMemo(() => {
        if (!request) return 0;
        const raw = (request as any)._paid_amount ?? (request as any).paid_amount ?? 0;
        const num = typeof raw === 'string' ? parseFloat(raw) : raw;
        return isNaN(num) ? 0 : Math.round(num);
    }, [request]);

    const outstandingAmount = useMemo(() => {
        const remaining = totalAmount - alreadyPaidAmount;
        return Math.max(0, remaining);
    }, [totalAmount, alreadyPaidAmount]);

    const parsedPartialAmount = useMemo(() => {
        const cleaned = partialAmount.replace(/[^0-9]/g, '');
        return Number(cleaned) || 0;
    }, [partialAmount]);

    const payAmount = useMemo(() => {
        if (paymentTypeIndex === 1) {
            return parsedPartialAmount;
        }
        return outstandingAmount;
    }, [paymentTypeIndex, parsedPartialAmount, outstandingAmount]);

    const eligibleSources = useMemo(() => {
        if (fundingSources && fundingSources.length > 0) {
            return fundingSources.filter(source =>
                source.is_active !== false &&
                (source.type || '').toUpperCase() !== 'PETTY_CASH'
            );
        }
        return companyBankAccounts.filter(acc => acc.status === 'active').map(acc => ({
            id: acc.id,
            provider: acc.bankCode || 'Bank',
            name: `${acc.bank || acc.bankCode} (${acc.accountNumber})`,
            type: 'BANK_ACCOUNT',
            balance: 0,
            account_number: acc.accountNumber,
            bank_name: acc.bank || acc.bankCode,
            is_active: acc.status === 'active',
        }));
    }, [fundingSources, companyBankAccounts]);

    const fundingOptions = useMemo(() => {
        return eligibleSources.map(source => `${source.provider || 'Bank'} • ${source.name} (${formatCurrency(source.balance || 0)})`);
    }, [eligibleSources]);

    useEffect(() => {
        if (visible) {
            setSelectedIndex(0);
            setPaymentDate(new Date());
            setPaymentTypeIndex(0);
            setPartialAmount('');
            setProofs([]);
            setSubmitting(false);
            isSystemAlertActive.current = false;
            getFinanceBankAccounts().then(setCompanyBankAccounts).catch(console.warn);
            getFinancePaymentCycles().then(setPaymentCycles).catch(console.warn);
        }
    }, [visible]);

    const pickProof = () => {
        isSystemAlertActive.current = true;
        Alert.alert('Payment Proof', 'Attach proof of payment', [
            {
                text: 'Photo Library',
                onPress: async () => {
                    try {
                        const result = await ImagePicker.launchImageLibraryAsync({
                            mediaTypes: ['images'],
                            allowsMultipleSelection: true,
                            quality: 0.5,
                        });
                        if (!result.canceled && result.assets && result.assets.length > 0) {
                            const newFiles: UploadedFile[] = result.assets.map(asset => ({
                                uri: asset.uri,
                                name: asset.fileName || asset.uri.split('/').pop() || `image-${Date.now()}`,
                                mimeType: asset.mimeType || 'image/jpeg',
                            }));
                            setProofs(prev => [...prev, ...newFiles]);
                        }
                    } catch (err) {
                        console.log("ImagePicker Error:", err);
                    } finally {
                        setTimeout(() => {
                            isSystemAlertActive.current = false;
                        }, 800);
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
                            multiple: true,
                        });
                        if (!result.canceled && result.assets && result.assets.length > 0) {
                            const newFiles: UploadedFile[] = result.assets.map(asset => ({
                                uri: asset.uri,
                                name: asset.name || asset.uri.split('/').pop() || `doc-${Date.now()}`,
                                mimeType: asset.mimeType || 'application/pdf',
                            }));
                            setProofs(prev => [...prev, ...newFiles]);
                        }
                    } catch (err) {
                        console.log("DocumentPicker Error:", err);
                    } finally {
                        setTimeout(() => {
                            isSystemAlertActive.current = false;
                        }, 800);
                    }
                },
            },
            {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => {
                    setTimeout(() => {
                        isSystemAlertActive.current = false;
                    }, 800);
                }
            },
        ]);
    };

    const removeProof = (index: number) => {
        setProofs(prev => prev.filter((_, i) => i !== index));
    };

    const copyAmount = async () => {
        try {
            Clipboard.setString(String(payAmount));
            isSystemAlertActive.current = true;
            Alert.alert('Success', 'Amount copied to clipboard', [
                {
                    text: 'OK',
                    onPress: () => {
                        setTimeout(() => {
                            isSystemAlertActive.current = false;
                        }, 800);
                    }
                }
            ]);
        } catch (e) {
            console.log("Clipboard error:", e);
        }
    };

    const copyAccountNumber = async () => {
        if (!request?.beneficiary_number) return;
        try {
            Clipboard.setString(String(request.beneficiary_number));
            isSystemAlertActive.current = true;
            Alert.alert('Success', 'Account number copied to clipboard', [
                {
                    text: 'OK',
                    onPress: () => {
                        setTimeout(() => {
                            isSystemAlertActive.current = false;
                        }, 800);
                    }
                }
            ]);
        } catch (e) {
            console.log("Clipboard error:", e);
        }
    };

    const handleConfirm = async () => {
        if (!request) return;

        if (payAmount <= 0) {
            isSystemAlertActive.current = true;
            Alert.alert('Invalid Amount', 'Please enter a payment amount greater than zero.', [
                {
                    text: 'OK',
                    onPress: () => {
                        setTimeout(() => {
                            isSystemAlertActive.current = false;
                        }, 800);
                    }
                }
            ]);
            return;
        }

        if (payAmount > outstandingAmount) {
            isSystemAlertActive.current = true;
            Alert.alert('Invalid Amount', `Payment cannot exceed remaining ${formatCurrency(outstandingAmount)}.`, [
                {
                    text: 'OK',
                    onPress: () => {
                        setTimeout(() => {
                            isSystemAlertActive.current = false;
                        }, 800);
                    }
                }
            ]);
            return;
        }

        if (eligibleSources.length === 0) {
            isSystemAlertActive.current = true;
            Alert.alert('Error', 'No funding sources available.', [
                {
                    text: 'OK',
                    onPress: () => {
                        setTimeout(() => {
                            isSystemAlertActive.current = false;
                        }, 800);
                    }
                }
            ]);
            return;
        }

        const selectedSource = eligibleSources[selectedIndex];
        if (!selectedSource) {
            isSystemAlertActive.current = true;
            Alert.alert('Missing Info', 'Please select a funding source.', [
                {
                    text: 'OK',
                    onPress: () => {
                        setTimeout(() => {
                            isSystemAlertActive.current = false;
                        }, 800);
                    }
                }
            ]);
            return;
        }

        if ((selectedSource.balance || 0) < payAmount) {
            isSystemAlertActive.current = true;
            Alert.alert(
                'Insufficient Balance',
                `${selectedSource.name || 'This account'} has ${formatCurrency(selectedSource.balance || 0)}. Payment requires ${formatCurrency(payAmount)}.`,
                [
                    {
                        text: 'OK',
                        onPress: () => {
                            setTimeout(() => {
                                isSystemAlertActive.current = false;
                            }, 800);
                        }
                    }
                ]
            );
            return;
        }

        if (proofs.length === 0) {
            isSystemAlertActive.current = true;
            Alert.alert('Missing Proof', 'Payment proof is mandatory. Please attach at least one proof file.', [
                {
                    text: 'OK',
                    onPress: () => {
                        setTimeout(() => {
                            isSystemAlertActive.current = false;
                        }, 800);
                    }
                }
            ]);
            return;
        }

        setSubmitting(true);
        try {
            let uploadedUrls: string[] = [];
            for (const img of proofs) {
                const isLocalFile = img.uri.startsWith('file://') || img.uri.startsWith('content://') || img.uri.startsWith('ph://');
                if (!isLocalFile) {
                    uploadedUrls.push(img.uri);
                    continue;
                }

                const base64 = await FileSystem.readAsStringAsync(img.uri, {
                    encoding: FileSystem.EncodingType.Base64,
                });
                const ext = img.uri.split('.').pop() || 'jpg';
                const url = await uploadFinanceFileBase64(
                    base64,
                    ext,
                    img.mimeType || 'image/jpeg',
                    'payment-proof'
                );
                uploadedUrls.push(url);
            }

            await onConfirm({
                source_of_fund_id: selectedSource.id,
                payment_date: paymentDate.toISOString().split('T')[0],
                payment_proof_url: uploadedUrls.join(','),
                amount: payAmount,
            });
            onClose();
        } catch (error: any) {
            isSystemAlertActive.current = true;
            Alert.alert('Payment Failed', error.message || 'Could not process payment.', [
                {
                    text: 'OK',
                    onPress: () => {
                        setTimeout(() => {
                            isSystemAlertActive.current = false;
                        }, 800);
                    }
                }
            ]);
        } finally {
            setSubmitting(false);
        }
    };

    const renderInnerContent = () => (
        request ? (
            <VStack spacing={0} modifiers={[
                ignoreSafeArea({ edges: 'bottom' }),
                background(sheetBg),
                frame({ maxWidth: Infinity, maxHeight: Infinity })
            ]}>
                {/* Header */}
                <HStack alignment="center" modifiers={[padding({ top: isEmbedded ? 16 : 20, leading: 20, trailing: 20, bottom: 10 })]}>
                    <SwiftUIText size={20} weight="bold" color={textColor}>
                        Pay Request
                    </SwiftUIText>
                    <Spacer />
                    <Button
                        systemImage="xmark"
                        role="cancel"
                        color="gray"
                        onPress={onClose}
                    />
                </HStack>

                {/* Form */}
                        <Form modifiers={[background(sheetBg), foregroundColor(textColor)]}>
                            <Section title="Request Information">
                                <HStack>
                                    <SwiftUIText color={subtextColor}>Reference</SwiftUIText>
                                    <Spacer />
                                    <SwiftUIText color={textColor} weight="semibold">{request.ref || '-'}</SwiftUIText>
                                </HStack>
                                <HStack>
                                    <SwiftUIText color={subtextColor}>Title</SwiftUIText>
                                    <Spacer />
                                    <SwiftUIText color={textColor}>{request.title || 'Finance Request'}</SwiftUIText>
                                </HStack>
                            </Section>

                            <Section title="Payment Details">
                                <Picker
                                    label="Payment Type"
                                    options={['Full Payment', 'Partial Payment']}
                                    selectedIndex={paymentTypeIndex}
                                    onOptionSelected={(e) => setPaymentTypeIndex(e.nativeEvent.index)}
                                    variant="menu"
                                    color={nativeControlTextColor}
                                    modifiers={menuControlModifiers}
                                />
                                {paymentTypeIndex === 1 ? (
                                    <TextField
                                        placeholder="Payment amount"
                                        defaultValue={partialAmount ? Number(partialAmount.replace(/[^0-9]/g, '')).toLocaleString('id-ID') : ''}
                                        keyboardType="numeric"
                                        onChangeText={(value) => setPartialAmount(value.replace(/[^0-9]/g, ''))}
                                    />
                                ) : null}
                                <HStack>
                                    <SwiftUIText color={subtextColor}>Payment Amount</SwiftUIText>
                                    <Spacer />
                                    <HStack spacing={6}>
                                        <SwiftUIText color="#007AFF" weight="bold" size={17}>{formatCurrency(payAmount)}</SwiftUIText>
                                        <Button
                                            systemImage="square.on.square"
                                            variant="plain"
                                            onPress={copyAmount}
                                        />
                                    </HStack>
                                </HStack>
                                {request.approved_amount && request.approved_amount !== request.amount && (
                                    <HStack>
                                        <SwiftUIText color={subtextColor}>Approved Amount</SwiftUIText>
                                        <Spacer />
                                        <SwiftUIText color={subtextColor} size={14}>
                                            {`Requested: ${formatCurrency(Number(request.amount) || 0)}`}
                                        </SwiftUIText>
                                    </HStack>
                                )}
                                {alreadyPaidAmount > 0 && (
                                    <HStack>
                                        <SwiftUIText color={subtextColor}>Already Paid</SwiftUIText>
                                        <Spacer />
                                        <SwiftUIText color="#34C759" weight="semibold">{formatCurrency(alreadyPaidAmount)}</SwiftUIText>
                                    </HStack>
                                )}
                                {paymentTypeIndex === 1 && parsedPartialAmount > 0 && parsedPartialAmount <= outstandingAmount && (
                                    <HStack>
                                        <SwiftUIText color={subtextColor}>Remaining After Payment</SwiftUIText>
                                        <Spacer />
                                        <SwiftUIText color="#FF9500" weight="semibold">{formatCurrency(outstandingAmount - parsedPartialAmount)}</SwiftUIText>
                                    </HStack>
                                )}
                                {request.beneficiary_name && (
                                    <VStack alignment="leading" spacing={6} modifiers={[padding({ top: 12 })]}>
                                        <HStack alignment="center">
                                            <SwiftUIText weight="bold" color={textColor}>
                                                {request.beneficiary_bank || ''}
                                            </SwiftUIText>
                                            <Spacer />
                                            <HStack alignment="center" spacing={4}>
                                                <SwiftUIText weight="bold" color={textColor}>
                                                    {request.beneficiary_number || ''}
                                                </SwiftUIText>
                                                <Button
                                                    systemImage="square.on.square"
                                                    variant="plain"
                                                    onPress={copyAccountNumber}
                                                />
                                            </HStack>
                                        </HStack>
                                        <SwiftUIText size={13} color={subtextColor}>
                                            {request.beneficiary_name || ''}
                                        </SwiftUIText>
                                    </VStack>
                                )}
                            </Section>

                            <Section title="Funding Account">
                                {eligibleSources.length === 0 ? (
                                    <SwiftUIText color="#FF9500" size={14}>No active funding sources available.</SwiftUIText>
                                ) : (
                                    <Picker
                                        label="Funding Source"
                                        options={fundingOptions}
                                        selectedIndex={selectedIndex}
                                        onOptionSelected={(e) => setSelectedIndex(e.nativeEvent.index)}
                                        variant="menu"
                                        color={nativeControlTextColor}
                                        modifiers={menuControlModifiers}
                                    />
                                )}
                            </Section>

                            <Section title="Payment Date">
                                <DateTimePicker
                                    title="Select Date"
                                    initialDate={paymentDate.toISOString()}
                                    onDateSelected={(date) => setPaymentDate(date)}
                                    variant="compact"
                                    displayedComponents="date"
                                    color={nativeControlTextColor}
                                    modifiers={menuControlModifiers}
                                />
                            </Section>

                            <Section title="Payment Proof">
                                <Button
                                    systemImage="camera.fill"
                                    onPress={pickProof}
                                    variant="bordered"
                                    color="gray"
                                >
                                    Attach Payment Proof
                                </Button>
                                {proofs.map((img, idx) => {
                                    const isImg = img.mimeType?.startsWith('image/') || 
                                                  /\.(jpg|jpeg|png|heic|heif|webp|gif)$/i.test(img.uri);
                                    return (
                                        <HStack key={idx} alignment="center" spacing={12} modifiers={[padding({ vertical: 4 })]}>
                                            {isImg ? (
                                                <View style={{ width: 90, height: 56, borderRadius: 8, overflow: 'hidden', backgroundColor: '#F2F2F7', borderWidth: 1, borderColor: isDark ? '#3A3A3C' : '#E5E5EA' }}>
                                                    <RNImage 
                                                        source={{ uri: img.uri }} 
                                                        style={{ width: 90, height: 56 }} 
                                                        resizeMode="cover" 
                                                    />
                                                </View>
                                            ) : (
                                                <View style={{ width: 56, height: 56, borderRadius: 8, backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: isDark ? '#3A3A3C' : '#E5E5EA' }}>
                                                    <PlatformIcon name="doc.text.fill" size={28} tintColor={isDark ? '#FFD60A' : '#BF5AF2'} />
                                                </View>
                                            )}
                                            <VStack alignment="leading" spacing={2} modifiers={[frame({ maxWidth: 200 })]}>
                                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                                    {isImg ? `Proof #${idx + 1}` : img.name}
                                                </SwiftUIText>
                                                <SwiftUIText size={12} color={subtextColor}>
                                                    {isImg ? 'Image' : 'PDF Document'}
                                                </SwiftUIText>
                                            </VStack>
                                            <Spacer />
                                            <Button
                                                systemImage="trash.fill"
                                                onPress={() => removeProof(idx)}
                                                variant="plain"
                                                modifiers={[
                                                    foregroundColor('#FF3B30')
                                                ]}
                                            />
                                        </HStack>
                                    );
                                })}
                            </Section>
                        </Form>

                        {/* Sticky Glass Footer Buttons */}
                        <HStack spacing={12} modifiers={[
                            background(sheetBg),
                            padding({ top: 12, leading: 20, trailing: 20, bottom: Platform.OS === 'ios' ? 36 : 24 }),
                            frame({ maxWidth: Infinity })
                        ]}>
                            <Button
                                variant="glass"
                                color="gray"
                                onPress={onClose}
                                disabled={submitting}
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
                                color={isDark ? '#0A84FF' : '#007AFF'}
                                onPress={handleConfirm}
                                disabled={submitting || eligibleSources.length === 0}
                            >
                                <HStack modifiers={[
                                    frame({ maxWidth: Infinity }),
                                    frame({ height: 42 })
                                ]}>
                                    <Spacer />
                                    {submitting ? (
                                        <ActivityIndicator color="#FFF" size="small" />
                                    ) : (
                                        <SwiftUIText weight="semibold" size={17} color="#FFFFFF">Confirm</SwiftUIText>
                                    )}
                                    <Spacer />
                                </HStack>
                            </Button>
                        </HStack>
                    </VStack>
                ) : (
                    <VStack modifiers={[padding({ all: 40 }), frame({ maxWidth: Infinity })]} alignment="center">
                        <ActivityIndicator size="large" />
                    </VStack>
                )
    );

    if (isEmbedded) {
        return (
            <Host style={{ flex: 1, width: '100%', height: '100%' }} colorScheme={isDark ? 'dark' : 'light'}>
                {renderInnerContent()}
            </Host>
        );
    }

    return (
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet
                isOpened={visible}
                presentationDetents={[0.85]}
                onIsOpenedChange={(opened) => {
                    if (!opened) {
                        if (!isSystemAlertActive.current) {
                            onClose();
                        }
                    }
                }}
            >
                {renderInnerContent()}
            </BottomSheet>
        </Host>
    );
}

const styles = StyleSheet.create({});
