import React, { useEffect, useMemo, useState } from 'react';
import {
    StyleSheet,
    Alert,
    ActivityIndicator,
    Image as RNImage,
    Platform,
    View,
    Clipboard,
    Text,
    TouchableOpacity,
    Modal,
    ScrollView,
    Dimensions,
    TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { uploadFinanceAttachment } from '@/lib/uploadFinanceAttachment';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { GlassView } from '@/components/ui/GlassView';
import { LiquidDatePicker } from '../ui/LiquidDatePicker';
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

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

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
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';

    const [selectedIndex, setSelectedIndex] = useState<number>(0);
    const [paymentDate, setPaymentDate] = useState(new Date());
    const [paymentType, setPaymentType] = useState<'full' | 'partial'>('full');
    const [partialAmount, setPartialAmount] = useState<string>('');
    const [proofs, setProofs] = useState<UploadedFile[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [proofPickerVisible, setProofPickerVisible] = useState(false);
    const [fundingPickerVisible, setFundingPickerVisible] = useState(false);
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
        if (paymentType === 'partial') {
            return parsedPartialAmount;
        }
        return outstandingAmount;
    }, [paymentType, parsedPartialAmount, outstandingAmount]);

    const eligibleSources = useMemo(() => {
        if (fundingSources && fundingSources.length > 0) {
            return fundingSources.filter(source =>
                source.is_active !== false &&
                (source.type || '').toUpperCase() !== 'PETTY_CASH'
            );
        }
        return companyBankAccounts.filter(acc => acc.status === 'active').map(acc => ({
            id: acc.id,
            name: `${acc.bank || acc.bankCode} - ${acc.accountNumber}`,
            type: 'BANK_ACCOUNT',
            balance: 0,
            account_number: acc.accountNumber,
            bank_name: acc.bank || acc.bankCode,
            is_active: acc.status === 'active',
        }));
    }, [fundingSources, companyBankAccounts]);

    useEffect(() => {
        if (visible) {
            setSelectedIndex(0);
            setPaymentDate(new Date());
            setPaymentType('full');
            setPartialAmount('');
            setProofs([]);
            setSubmitting(false);
            isSystemAlertActive.current = false;
            getFinanceBankAccounts().then(setCompanyBankAccounts).catch(console.warn);
            getFinancePaymentCycles().then(setPaymentCycles).catch(console.warn);
        }
    }, [visible]);

    const pickProof = () => {
        setProofPickerVisible(true);
    };

    const handlePickLibrary = async () => {
        setProofPickerVisible(false);
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
        }
    };

    const handlePickDocument = async () => {
        setProofPickerVisible(false);
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
        }
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
            const uploadedUrls: string[] = [];
            for (const file of proofs) {
                uploadedUrls.push(await uploadFinanceAttachment(file, 'payment-proof'));
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

    const formatDateString = (date: Date) => {
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const containerStyle = [
        s.content,
        {
            backgroundColor: isDark ? 'rgba(28,28,30,0.98)' : 'rgba(255,255,255,0.98)',
        }
    ];

    const FundingSourcePickerModal = () => {
        if (!fundingPickerVisible) return null;
        
        return (
            <Modal visible={fundingPickerVisible} transparent animationType="fade" onRequestClose={() => setFundingPickerVisible(false)}>
                <View style={s.pickerOverlay}>
                    <View style={[s.pickerContent, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.06)' }]}>
                        <Text style={[s.pickerTitle, { color: textColor }]}>Funding Source</Text>
                        <Text style={[s.pickerSub, { color: subtextColor }]}>Select an account to pay from</Text>
                        
                        <ScrollView style={{ maxHeight: 300, width: '100%' }} showsVerticalScrollIndicator={false}>
                            {eligibleSources.map((source, idx) => {
                                const isSelected = idx === selectedIndex;
                                return (
                                    <TouchableOpacity
                                        key={source.id || idx}
                                        style={[
                                            s.pickerOption,
                                            { 
                                                backgroundColor: isSelected 
                                                    ? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)') 
                                                    : 'transparent',
                                                borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'
                                            }
                                        ]}
                                        onPress={() => {
                                            setSelectedIndex(idx);
                                            setFundingPickerVisible(false);
                                        }}
                                    >
                                        <View style={{ flex: 1, marginRight: 8 }}>
                                            <Text style={[s.pickerOptionLabel, { color: textColor, fontWeight: isSelected ? '700' : '500' }]}>
                                                {source.provider ? `${source.provider} • ` : source.bank_name ? `${source.bank_name} • ` : ''}{source.name}
                                            </Text>
                                            <Text style={{ color: subtextColor, fontSize: 12, marginTop: 2 }}>
                                                Balance: {formatCurrency(source.balance || 0)}
                                            </Text>
                                        </View>
                                        {isSelected && (
                                            <Ionicons name="checkmark" size={18} color="#007AFF" />
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                        
                        <TouchableOpacity
                            style={[s.pickerBtn, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA', marginTop: 12 }]}
                            onPress={() => setFundingPickerVisible(false)}
                        >
                            <Text style={[s.pickerBtnText, { color: textColor, fontWeight: '700' }]}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        );
    };

    const renderInnerContent = () => {
        const contentBody = (
            <>
                {/* Header */}
                <View style={[s.header, isEmbedded && { paddingTop: 20, paddingBottom: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]}>
                    <Text style={[s.headerTitle, { color: textColor }]}>Pay Now</Text>
                    <TouchableOpacity onPress={onClose} disabled={submitting} style={[s.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(120,120,128,0.1)' }]}>
                        <PlatformIcon name="xmark" size={16} tintColor={subtextColor} />
                    </TouchableOpacity>
                </View>

                {request ? (
                    <ScrollView contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                        
                        {/* Request Info Section */}
                        <Text style={[s.sectionTitle, { color: subtextColor }]}>REQUEST INFORMATION</Text>
                        <View style={[s.sectionCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
                            <View style={s.infoRow}>
                                <Text style={[s.infoLabel, { color: subtextColor }]}>Reference</Text>
                                <Text style={[s.infoValue, { color: textColor, fontWeight: '600' }]}>{request.ref || '-'}</Text>
                            </View>
                            <View style={[s.separator, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />
                            <View style={s.infoRow}>
                                <Text style={[s.infoLabel, { color: subtextColor }]}>Title</Text>
                                <Text style={[s.infoValue, { color: textColor }]}>{request.title || 'Finance Request'}</Text>
                            </View>
                        </View>

                        {/* Payment Details Section */}
                        <Text style={[s.sectionTitle, { color: subtextColor, marginTop: 24 }]}>PAYMENT DETAILS</Text>
                        <View style={[s.sectionCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
                            
                            {/* Payment Type Selector (Full vs Partial) */}
                            <View style={s.paymentTypeContainer}>
                                <TouchableOpacity
                                    style={[
                                        s.paymentTypeBtn,
                                        paymentType === 'full' && [s.paymentTypeBtnActive, { backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)' }]
                                    ]}
                                    onPress={() => setPaymentType('full')}
                                    activeOpacity={0.8}
                                >
                                    <Text style={[
                                        s.paymentTypeBtnText,
                                        { color: paymentType === 'full' ? textColor : subtextColor, fontWeight: paymentType === 'full' ? '700' : '500' }
                                    ]}>
                                        Full Payment
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[
                                        s.paymentTypeBtn,
                                        paymentType === 'partial' && [s.paymentTypeBtnActive, { backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)' }]
                                    ]}
                                    onPress={() => setPaymentType('partial')}
                                    activeOpacity={0.8}
                                >
                                    <Text style={[
                                        s.paymentTypeBtnText,
                                        { color: paymentType === 'partial' ? textColor : subtextColor, fontWeight: paymentType === 'partial' ? '700' : '500' }
                                    ]}>
                                        Partial Payment
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            <View style={[s.separator, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', marginVertical: 12 }]} />

                            {paymentType === 'partial' ? (
                                <View style={{ marginBottom: 4 }}>
                                    <Text style={[s.infoLabel, { color: subtextColor, marginBottom: 8 }]}>Payment Amount</Text>
                                    <View style={[s.inputContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                                        <Text style={{ color: '#007AFF', fontWeight: '700', fontSize: 16, marginRight: 6 }}>Rp</Text>
                                        <TextInput
                                            style={[s.textInput, { color: textColor }]}
                                            placeholder="0"
                                            placeholderTextColor={subtextColor}
                                            keyboardType="numeric"
                                            value={partialAmount ? Number(partialAmount.replace(/[^0-9]/g, '')).toLocaleString('id-ID') : ''}
                                            onChangeText={(val) => {
                                                const raw = val.replace(/[^0-9]/g, '');
                                                setPartialAmount(raw);
                                            }}
                                        />
                                        {partialAmount ? (
                                            <TouchableOpacity onPress={() => setPartialAmount('')} style={{ padding: 4 }}>
                                                <PlatformIcon name="xmark.circle.fill" size={16} tintColor={subtextColor} />
                                            </TouchableOpacity>
                                        ) : null}
                                    </View>

                                    {parsedPartialAmount > outstandingAmount && (
                                        <Text style={{ color: '#FF453A', fontSize: 12, marginTop: 6, fontWeight: '500' }}>
                                            Amount cannot exceed remaining balance ({formatCurrency(outstandingAmount)}).
                                        </Text>
                                    )}

                                    <View style={{ marginTop: 12, gap: 6 }}>
                                        <View style={s.infoRow}>
                                            <Text style={[s.infoLabel, { color: subtextColor, fontSize: 13 }]}>Outstanding Total</Text>
                                            <Text style={[s.infoValue, { color: textColor, fontSize: 13, fontWeight: '600' }]}>{formatCurrency(outstandingAmount)}</Text>
                                        </View>
                                        {parsedPartialAmount > 0 && parsedPartialAmount <= outstandingAmount && (
                                            <View style={s.infoRow}>
                                                <Text style={[s.infoLabel, { color: subtextColor, fontSize: 13 }]}>Remaining After Payment</Text>
                                                <Text style={[s.infoValue, { color: '#FF9500', fontSize: 13, fontWeight: '600' }]}>
                                                    {formatCurrency(outstandingAmount - parsedPartialAmount)}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            ) : (
                                <View style={s.infoRow}>
                                    <Text style={[s.infoLabel, { color: subtextColor }]}>Payment Amount</Text>
                                    <View style={s.amountRow}>
                                        <Text style={[s.amountText, { color: '#007AFF' }]}>{formatCurrency(payAmount)}</Text>
                                        <TouchableOpacity onPress={copyAmount} style={s.copyButton}>
                                            <Ionicons name="copy-outline" size={16} color="#007AFF" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}

                            {request.approved_amount && request.approved_amount !== request.amount && (
                                <>
                                    <View style={[s.separator, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />
                                    <View style={s.infoRow}>
                                        <Text style={[s.infoLabel, { color: subtextColor }]}>Approved Amount</Text>
                                        <Text style={[s.infoValue, { color: subtextColor, fontSize: 13 }]}>
                                            {`Requested: ${formatCurrency(Number(request.amount) || 0)}`}
                                        </Text>
                                    </View>
                                </>
                            )}

                            {alreadyPaidAmount > 0 && (
                                <>
                                    <View style={[s.separator, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />
                                    <View style={s.infoRow}>
                                        <Text style={[s.infoLabel, { color: subtextColor }]}>Already Paid</Text>
                                        <Text style={[s.infoValue, { color: '#34C759', fontSize: 13, fontWeight: '600' }]}>
                                            {formatCurrency(alreadyPaidAmount)}
                                        </Text>
                                    </View>
                                </>
                            )}

                            {request.beneficiary_name && (
                                <>
                                    <View style={[s.separator, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />
                                    <View style={{ paddingTop: 12 }}>
                                        <View style={s.infoRow}>
                                            <Text style={[s.beneficiaryBank, { color: textColor }]}>
                                                {request.beneficiary_bank || ''}
                                            </Text>
                                            <View style={s.amountRow}>
                                                <Text style={[s.beneficiaryNumber, { color: textColor }]}>
                                                    {request.beneficiary_number || ''}
                                                </Text>
                                                <TouchableOpacity onPress={copyAccountNumber} style={s.copyButton}>
                                                    <Ionicons name="copy-outline" size={16} color="#007AFF" />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                        <Text style={[s.beneficiaryName, { color: subtextColor, marginTop: 4 }]}>
                                            {request.beneficiary_name || ''}
                                        </Text>
                                    </View>
                                </>
                            )}
                        </View>

                        {/* Funding Account Section */}
                        <Text style={[s.sectionTitle, { color: subtextColor, marginTop: 24 }]}>FUNDING ACCOUNT</Text>
                        <View style={[s.sectionCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
                            {eligibleSources.length === 0 ? (
                                <Text style={{ color: '#FF9500', fontSize: 14 }}>No active funding sources available.</Text>
                            ) : (
                                <TouchableOpacity 
                                    style={[s.selectTrigger, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }]} 
                                    onPress={() => setFundingPickerVisible(true)}
                                >
                                    <Text style={{ color: textColor, fontWeight: '600', fontSize: 14 }}>
                                        {eligibleSources[selectedIndex] 
                                            ? `${eligibleSources[selectedIndex].provider ? `${eligibleSources[selectedIndex].provider} • ` : eligibleSources[selectedIndex].bank_name ? `${eligibleSources[selectedIndex].bank_name} • ` : ''}${eligibleSources[selectedIndex].name} (${formatCurrency(eligibleSources[selectedIndex].balance || 0)})`
                                            : 'Select Funding Source'}
                                    </Text>
                                    <Ionicons name="chevron-down" size={18} color={subtextColor} />
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Payment Date Section */}
                        <Text style={[s.sectionTitle, { color: subtextColor, marginTop: 24 }]}>PAYMENT DATE</Text>
                        <View style={[s.sectionCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
                            <TouchableOpacity
                                style={[s.selectTrigger, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }]}
                                onPress={() => setShowDatePicker(true)}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Ionicons name="calendar-outline" size={18} color={textColor} style={{ marginRight: 8 }} />
                                    <Text style={[s.datePickerText, { color: textColor, fontWeight: '600' }]}>
                                        {formatDateString(paymentDate)}
                                    </Text>
                                </View>
                                <Ionicons name="chevron-down" size={18} color={subtextColor} />
                            </TouchableOpacity>
                        </View>

                        {/* Payment Proof Section */}
                        <Text style={[s.sectionTitle, { color: subtextColor, marginTop: 24 }]}>PAYMENT PROOF</Text>
                        <View style={[s.sectionCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
                            <TouchableOpacity
                                style={[s.attachButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', marginBottom: proofs.length > 0 ? 12 : 0 }]}
                                onPress={pickProof}
                            >
                                <Ionicons name="camera" size={18} color={textColor} style={{ marginRight: 8 }} />
                                <Text style={[s.attachButtonText, { color: textColor }]}>Attach Payment Proof</Text>
                            </TouchableOpacity>

                            {proofs.map((img, idx) => {
                                const isImg = img.mimeType?.startsWith('image/') || 
                                              /\.(jpg|jpeg|png|heic|heif|webp|gif)$/i.test(img.uri);
                                return (
                                    <View key={idx}>
                                        {idx > 0 && <View style={[s.separator, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />}
                                        <View style={s.proofRow}>
                                            {isImg ? (
                                                <View style={[s.proofThumbnail, { borderColor: isDark ? '#3A3A3C' : '#E5E5EA' }]}>
                                                    <RNImage 
                                                        source={{ uri: img.uri }} 
                                                        style={{ width: 60, height: 40 }} 
                                                        resizeMode="cover" 
                                                    />
                                                </View>
                                            ) : (
                                                <View style={[s.proofDocIcon, { backgroundColor: isDark ? '#3A3A3C' : '#E5E5EA' }]}>
                                                    <PlatformIcon name="doc.text.fill" size={20} tintColor={isDark ? '#FFD60A' : '#BF5AF2'} />
                                                </View>
                                            )}
                                            <View style={s.proofMeta}>
                                                <Text style={[s.proofName, { color: textColor }]} numberOfLines={1}>
                                                    {isImg ? `Proof #${idx + 1}` : img.name}
                                                </Text>
                                                <Text style={[s.proofType, { color: subtextColor }]}>
                                                    {isImg ? 'Image' : 'PDF Document'}
                                                </Text>
                                            </View>
                                            <TouchableOpacity onPress={() => removeProof(idx)} style={s.proofDelete}>
                                                <Ionicons name="trash" size={20} color="#FF3B30" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    </ScrollView>
                ) : (
                    <View style={s.loadingContainer}>
                        <ActivityIndicator size="large" />
                    </View>
                )}

                {/* Footer Actions */}
                <View style={[s.footer, isEmbedded && { paddingBottom: 24 }]}>
                    <TouchableOpacity 
                        style={[s.footerButton, s.cancelButton, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]} 
                        onPress={onClose}
                        disabled={submitting}
                    >
                        <Text style={[s.footerBtnText, { color: isDark ? '#FFF' : '#333' }]}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[s.footerButton, s.confirmButton, submitting && { opacity: 0.5 }]} 
                        onPress={handleConfirm}
                        disabled={submitting || eligibleSources.length === 0}
                    >
                        {submitting ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <Text style={[s.footerBtnText, { color: '#FFF' }]}>Confirm</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </>
        );

        if (isEmbedded) {
            return (
                <View style={[s.embeddedContent, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}>
                    {contentBody}
                </View>
            );
        }

        return (
            <GlassView
                intensity={60}
                tint={isDark ? 'dark' : 'light'}
                style={containerStyle}
            >
                {contentBody}
            </GlassView>
        );
    };

    const renderSubModals = () => (
        <>
            {/* DateTime Picker */}
            {showDatePicker && (
                <LiquidDatePicker
                    visible={showDatePicker}
                    onClose={() => setShowDatePicker(false)}
                    currentDate={paymentDate.toISOString().split('T')[0]}
                    title="Select Payment Date"
                    onSelect={(dateStr) => {
                        setPaymentDate(new Date(dateStr));
                    }}
                />
            )}

            {/* Custom Proof Picker Modal */}
            <Modal
                visible={proofPickerVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setProofPickerVisible(false)}
            >
                <View style={s.pickerOverlay}>
                    <View
                        style={[
                            s.pickerContent,
                            {
                                backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                                borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.06)',
                            }
                        ]}
                    >
                        <Text style={[s.pickerTitle, { color: textColor }]}>Payment Proof</Text>
                        <Text style={[s.pickerSub, { color: subtextColor }]}>Attach proof of payment</Text>

                        <View style={s.pickerActions}>
                            <TouchableOpacity
                                style={[s.pickerBtn, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)' }]}
                                onPress={handlePickLibrary}
                            >
                                <Ionicons name="images-outline" size={18} color="#007AFF" style={{ marginRight: 8 }} />
                                <Text style={[s.pickerBtnText, { color: textColor }]}>Photo Library</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[s.pickerBtn, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)' }]}
                                onPress={handlePickDocument}
                            >
                                <Ionicons name="document-text-outline" size={18} color="#007AFF" style={{ marginRight: 8 }} />
                                <Text style={[s.pickerBtnText, { color: textColor }]}>Files / PDF</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[s.pickerBtn, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA', marginTop: 8 }]}
                                onPress={() => setProofPickerVisible(false)}
                            >
                                <Text style={[s.pickerBtnText, { color: textColor, fontWeight: '700' }]}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Custom Funding Source Picker Modal */}
            <FundingSourcePickerModal />
        </>
    );

    if (isEmbedded) {
        return (
            <View style={{ flex: 1, width: '100%', height: '100%', overflow: 'hidden' }}>
                {renderInnerContent()}
                {renderSubModals()}
            </View>
        );
    }

    return (
        <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose} statusBarTranslucent={true}>
            <View style={s.overlay}>
                <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
                {renderInnerContent()}
            </View>
            {renderSubModals()}
        </Modal>
    );
}

const s = StyleSheet.create({
    embeddedContent: {
        flex: 1,
        width: '100%',
        height: '100%',
        borderRadius: 0,
        overflow: 'hidden',
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    overlay: { 
        flex: 1, 
        backgroundColor: 'rgba(0,0,0,0.5)', 
        justifyContent: 'flex-end' 
    },
    content: { 
        borderTopLeftRadius: 32, 
        borderTopRightRadius: 32, 
        maxHeight: SCREEN_HEIGHT * 0.85, 
        width: '100%',
        paddingTop: 16,
        overflow: 'hidden',
    },
    header: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        paddingHorizontal: 20, 
        paddingVertical: 16,
    },
    headerTitle: { 
        fontSize: 19, 
        fontWeight: '700' 
    },
    scrollContent: { 
        padding: 20, 
        paddingBottom: 40 
    },
    loadingContainer: {
        height: 200,
        justifyContent: 'center',
        alignItems: 'center'
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.8,
        marginBottom: 8
    },
    sectionCard: {
        borderRadius: 24,
        padding: 16,
        marginBottom: 8,
        borderWidth: StyleSheet.hairlineWidth,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
    },
    infoLabel: {
        fontSize: 14,
        fontWeight: '500'
    },
    infoValue: {
        fontSize: 14,
        textAlign: 'right'
    },
    amountRow: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    amountText: {
        fontSize: 16,
        fontWeight: '700',
        marginRight: 6
    },
    copyButton: {
        padding: 4
    },
    beneficiaryContainer: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1
    },
    beneficiaryBank: {
        fontSize: 14,
        fontWeight: '700'
    },
    beneficiaryNumber: {
        fontSize: 14,
        fontWeight: '700',
        marginRight: 6
    },
    beneficiaryName: {
        fontSize: 12
    },
    selectTrigger: {
        height: 48,
        borderRadius: 24,
        paddingHorizontal: 18,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    datePickerText: {
        fontSize: 15,
        fontWeight: '600'
    },
    attachButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 48,
        borderRadius: 24,
    },
    attachButtonText: {
        fontSize: 15,
        fontWeight: '600'
    },
    proofRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
    },
    proofThumbnail: {
        width: 60,
        height: 40,
        borderRadius: 6,
        overflow: 'hidden',
        borderWidth: 1,
        marginRight: 12
    },
    proofDocIcon: {
        width: 40,
        height: 40,
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12
    },
    proofMeta: {
        flex: 1
    },
    proofName: {
        fontSize: 14,
        fontWeight: '600'
    },
    proofType: {
        fontSize: 12
    },
    proofDelete: {
        padding: 6
    },
    footer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 36 : 24,
        gap: 12
    },
    footerButton: {
        flex: 1,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center'
    },
    cancelButton: {},
    confirmButton: {
        backgroundColor: '#007AFF'
    },
    footerBtnText: {
        fontSize: 16,
        fontWeight: '700'
    },
    pickerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    pickerContent: {
        width: 320,
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
    },
    pickerTitle: {
        fontSize: 19,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 4,
    },
    pickerSub: {
        fontSize: 13,
        fontWeight: '500',
        textAlign: 'center',
        marginBottom: 20,
    },
    pickerActions: {
        width: '100%',
        gap: 10,
    },
    pickerBtn: {
        width: '100%',
        height: 48,
        borderRadius: 24,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    pickerBtnText: {
        fontSize: 15,
        fontWeight: '600',
    },
    pickerOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    pickerOptionLabel: {
        fontSize: 14,
    },
    separator: {
        height: StyleSheet.hairlineWidth,
        width: '100%',
        marginVertical: 10,
    },
    paymentTypeContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(120,120,128,0.12)',
        borderRadius: 14,
        padding: 3,
        gap: 3,
        marginBottom: 4,
    },
    paymentTypeBtn: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 11,
    },
    paymentTypeBtnActive: {
        borderWidth: StyleSheet.hairlineWidth,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.12,
        shadowRadius: 2,
    },
    paymentTypeBtnText: {
        fontSize: 13,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 44,
        borderRadius: 12,
        paddingHorizontal: 12,
        borderWidth: StyleSheet.hairlineWidth,
    },
    textInput: {
        flex: 1,
        fontSize: 16,
        fontWeight: '700',
        padding: 0,
        height: '100%',
    },
});
