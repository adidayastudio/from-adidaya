import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ScrollView,
    Modal,
    Platform,
    TextInput,
    Alert,
    KeyboardAvoidingView,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/theme';
import { CrewMember } from './mockData';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface CrewAdjustmentModalProps {
    visible: boolean;
    onClose: () => void;
    onSave: (amount: number, reason: string, proofName: string, proofUrl: string, isPositive: boolean) => void;
    member: CrewMember | null;
    initialAmount: number;
    initialReason: string;
    initialProofName: string;
    initialProofUrl: string;
    initialIsPositive: boolean;
}

export function CrewAdjustmentModal({
    visible,
    onClose,
    onSave,
    member,
    initialAmount,
    initialReason,
    initialProofName,
    initialProofUrl,
    initialIsPositive,
}: CrewAdjustmentModalProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';

    const [amountInput, setAmountInput] = useState('');
    const [reasonInput, setReasonInput] = useState('');
    const [isPositive, setIsPositive] = useState(true);
    const [proofName, setProofName] = useState('');
    const [proofUrl, setProofUrl] = useState('');

    useEffect(() => {
        if (visible) {
            setAmountInput(initialAmount > 0 ? String(initialAmount) : '');
            setReasonInput(initialReason);
            setIsPositive(initialIsPositive);
            setProofName(initialProofName);
            setProofUrl(initialProofUrl);
        }
    }, [visible, initialAmount, initialReason, initialProofName, initialProofUrl, initialIsPositive]);

    const handleSave = () => {
        if (!member) return;
        const amount = Number(amountInput.replace(/[^0-9]/g, ''));
        if (!amount || amount <= 0) {
            Alert.alert('Error', 'Amount must be greater than 0.');
            return;
        }
        if (!reasonInput.trim()) {
            Alert.alert('Error', 'Please enter a reason for the adjustment.');
            return;
        }
        if (!proofName) {
            Alert.alert('Error', 'Please upload proof for the adjustment.');
            return;
        }

        onSave(amount, reasonInput, proofName, proofUrl, isPositive);
    };

    return (
        <Modal visible={visible} animationType="slide" transparent statusBarTranslucent={true} onRequestClose={onClose}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <View style={s.overlay}>
                    <TouchableOpacity
                        style={StyleSheet.absoluteFillObject}
                        activeOpacity={1}
                        onPress={onClose}
                    />
                    <View
                        style={[
                            s.sheet,
                            { backgroundColor: isDark ? '#121212' : '#F2F2F7' }
                        ]}
                    >
                        {/* Header */}
                        <View style={[s.header, { borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', borderBottomWidth: StyleSheet.hairlineWidth }]}>
                            <View>
                                <Text style={[s.headerTitle, { color: textColor }]}>Adjust Payroll</Text>
                                <Text style={{ fontSize: 13, fontWeight: '600', color: subtextColor, marginTop: 2 }}>
                                    {member?.name}
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={[s.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
                                onPress={onClose}
                            >
                                <Ionicons name="close" size={18} color={subtextColor} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                            {/* Adjustment Type */}
                            <Text style={[s.sectionTitle, { color: subtextColor }]}>ADJUSTMENT TYPE</Text>
                            <View style={[s.sectionCard, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}>
                                <View style={[s.adjSegmentedContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                                    <TouchableOpacity
                                        style={[
                                            s.adjSegmentBtn,
                                            isPositive && { backgroundColor: '#34C759' }
                                        ]}
                                        onPress={() => setIsPositive(true)}
                                    >
                                        <Text style={[s.adjSegmentBtnText, { color: isPositive ? '#FFF' : textColor }]}>
                                            Addition
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[
                                            s.adjSegmentBtn,
                                            !isPositive && { backgroundColor: '#FF3B30' }
                                        ]}
                                        onPress={() => setIsPositive(false)}
                                    >
                                        <Text style={[s.adjSegmentBtnText, { color: !isPositive ? '#FFF' : textColor }]}>
                                            Deduction
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Amount & Reason */}
                            <Text style={[s.sectionTitle, { color: subtextColor, marginTop: 16 }]}>DETAILS</Text>
                            <View style={[s.sectionCard, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}>
                                <Text style={[s.label, { color: subtextColor }]}>Amount (Rp)</Text>
                                <TextInput
                                    style={[s.input, { color: textColor, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}
                                    placeholder="Enter amount"
                                    placeholderTextColor={subtextColor}
                                    keyboardType="numeric"
                                    value={amountInput}
                                    onChangeText={setAmountInput}
                                />

                                <Text style={[s.label, { color: subtextColor, marginTop: 12 }]}>Reason / Description *</Text>
                                <TextInput
                                    style={[s.input, s.textArea, { color: textColor, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}
                                    placeholder="Explain the reason for this adjustment..."
                                    placeholderTextColor={subtextColor}
                                    multiline
                                    numberOfLines={3}
                                    value={reasonInput}
                                    onChangeText={setReasonInput}
                                />
                            </View>

                            {/* Proof */}
                            <Text style={[s.sectionTitle, { color: subtextColor, marginTop: 16 }]}>PROOF</Text>
                            <View style={[s.sectionCard, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}>
                                {proofName ? (
                                    <View style={[s.adjProofRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                                        <Ionicons name="document-attach-outline" size={20} color="#007AFF" />
                                        <Text style={[s.proofName, { color: textColor }]} numberOfLines={1}>
                                            {proofName}
                                        </Text>
                                        <TouchableOpacity onPress={() => { setProofName(''); setProofUrl(''); }}>
                                            <Ionicons name="trash" size={18} color="#FF3B30" />
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <TouchableOpacity
                                        style={[s.adjUploadBtn, { borderColor: '#007AFF', backgroundColor: isDark ? 'rgba(0,122,255,0.08)' : 'rgba(0,122,255,0.04)' }]}
                                        onPress={() => {
                                            setProofName(`proof_adjustment_${member?.id}_${Date.now().toString().slice(-4)}.jpg`);
                                            setProofUrl('https://placehold.co/600x400?text=Proof');
                                        }}
                                    >
                                        <Ionicons name="cloud-upload-outline" size={18} color="#007AFF" style={{ marginRight: 6 }} />
                                        <Text style={{ color: '#007AFF', fontSize: 14, fontWeight: '600' }}>Upload Photo / PDF</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </ScrollView>

                        {/* Footer */}
                        <View style={s.footer}>
                            <TouchableOpacity
                                style={[s.footerButton, s.cancelButton, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}
                                onPress={onClose}
                            >
                                <Text style={[s.footerBtnText, { color: isDark ? '#FFF' : '#333' }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[s.footerButton, s.confirmButton]}
                                onPress={handleSave}
                            >
                                <Text style={[s.footerBtnText, { color: '#FFF' }]}>Save Adjustment</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const s = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    sheet: {
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        maxHeight: SCREEN_HEIGHT * 0.85,
        width: '100%',
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
        fontWeight: '700',
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        padding: 20,
        paddingBottom: 40,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.8,
        marginBottom: 8,
    },
    sectionCard: {
        borderRadius: 24,
        padding: 16,
        marginBottom: 8,
        borderWidth: StyleSheet.hairlineWidth,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 8,
    },
    input: {
        height: 48,
        borderRadius: 24,
        paddingHorizontal: 18,
        fontSize: 15,
        fontWeight: '500',
    },
    textArea: {
        height: 80,
        paddingTop: 12,
        paddingBottom: 12,
        borderRadius: 20,
        textAlignVertical: 'top',
    },
    footer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 34 : 24,
        gap: 12,
    },
    footerButton: {
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
    },
    cancelButton: {
        flex: 1,
    },
    confirmButton: {
        flex: 1.5,
        backgroundColor: '#007AFF',
    },
    footerBtnText: {
        fontSize: 16,
        fontWeight: '700',
    },
    adjSegmentedContainer: {
        flexDirection: 'row',
        borderRadius: 24,
        padding: 2,
    },
    adjSegmentBtn: {
        flex: 1,
        height: 36,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    adjSegmentBtnText: {
        fontSize: 13,
        fontWeight: '700',
    },
    adjProofRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
        gap: 10,
    },
    adjUploadBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 48,
        borderRadius: 16,
        borderWidth: 1,
        borderStyle: 'dashed' as const,
    },
    proofName: {
        flex: 1,
        fontSize: 13,
        fontWeight: '600',
    },
});
