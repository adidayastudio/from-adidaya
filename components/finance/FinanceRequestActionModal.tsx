import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export type FinanceActionType = 'approve' | 'reject' | 'revision' | 'delete' | 'pay' | 'submit' | 'cancelSubmit';

interface FinanceRequestActionModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: (payload: { reason?: string; approvedAmount?: number }) => Promise<void>;
    type: FinanceActionType;
    request: {
        title?: string;
        ref?: string;
        amount?: number | string;
    } | null;
    fixedApprovalAmount?: boolean;
    isEmbedded?: boolean;
}

function formatAmountInput(amount: number | string | undefined) {
    if (amount === undefined || amount === null) return '';
    if (typeof amount === 'number') return String(amount);
    const cleaned = String(amount).replace(/[^0-9]/g, '');
    return cleaned;
}

export function FinanceRequestActionModal({
    visible,
    onClose,
    onConfirm,
    type,
    request,
    fixedApprovalAmount = false,
    isEmbedded = false,
}: FinanceRequestActionModalProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';

    const [reason, setReason] = useState('');
    const [approvedAmount, setApprovedAmount] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [nativeAlertShown, setNativeAlertShown] = useState(false);

    const titleMap: Record<FinanceActionType, string> = {
        approve: 'Approve Request',
        reject: 'Reject Request',
        revision: 'Request Revision',
        delete: 'Delete Request',
        pay: 'Mark as Paid',
        submit: 'Submit Request',
        cancelSubmit: 'Withdraw Request',
    };

    const needsReason = type === 'reject' || type === 'revision';
    const needsAmount = type === 'approve' && !fixedApprovalAmount;

    const showNativeAlert = () => {
        if (!request) return;
        const title = titleMap[type];
        const subText = `${request.ref ? `${request.ref} • ` : ''}${request.title || 'Finance Request'}`;

        const handleDismiss = () => {
            setNativeAlertShown(false);
            onClose();
        };

        if (needsAmount) {
            Alert.prompt(
                title,
                `${subText}\n\nAdjust if the approved amount differs from the requested total.`,
                [
                    {
                        text: 'Cancel',
                        style: 'cancel',
                        onPress: handleDismiss,
                    },
                    {
                        text: 'Approve',
                        onPress: async (amount?: string) => {
                            const parsedAmount = parseInt(amount?.replace(/[^0-9]/g, '') || '', 10);
                            if (!parsedAmount || parsedAmount <= 0) {
                                Alert.alert('Invalid Amount', 'Please enter a valid approved amount.', [{ text: 'OK', onPress: handleDismiss }]);
                                return;
                            }
                            try {
                                await onConfirm({ approvedAmount: parsedAmount });
                                handleDismiss();
                            } catch (error: any) {
                                Alert.alert('Error', error.message || 'Failed to perform action.', [{ text: 'OK', onPress: handleDismiss }]);
                            }
                        },
                    },
                ],
                'plain-text',
                formatAmountInput(request.amount),
                'numeric'
            );
        } else if (needsReason) {
            Alert.prompt(
                title,
                `${subText}\n\n${type === 'reject' ? 'Explain why this request is rejected.' : 'Explain what needs to be revised.'}`,
                [
                    {
                        text: 'Cancel',
                        style: 'cancel',
                        onPress: handleDismiss,
                    },
                    {
                        text: type === 'reject' ? 'Reject' : 'Send',
                        style: type === 'reject' ? 'destructive' : 'default',
                        onPress: async (text?: string) => {
                            if (!text || !text.trim()) {
                                Alert.alert('Reason Required', 'Please provide a reason for this action.', [{ text: 'OK', onPress: handleDismiss }]);
                                return;
                            }
                            try {
                                await onConfirm({ reason: text.trim() });
                                handleDismiss();
                            } catch (error: any) {
                                Alert.alert('Error', error.message || 'Failed to perform action.', [{ text: 'OK', onPress: handleDismiss }]);
                            }
                        },
                    },
                ],
                'plain-text',
                ''
            );
        } else {
            Alert.alert(
                title,
                `${subText}\n\n${type === 'delete' ? 'This action cannot be undone. Are you sure you want to delete this request?' :
                    type === 'pay' ? 'Confirm that payment has been processed for this request.' :
                        type === 'approve' ? `Approve the full reimbursement amount of Rp${Number(request.amount || 0).toLocaleString('id-ID')}?` :
                        type === 'cancelSubmit' ? 'Withdraw this request to Draft so it can be edited?' :
                        'Submit this request for review?'
                }`,
                [
                    {
                        text: 'Cancel',
                        style: 'cancel',
                        onPress: handleDismiss,
                    },
                    {
                        text: type === 'delete' ? 'Delete' : type === 'pay' ? 'Confirm' : type === 'approve' ? 'Approve' : type === 'cancelSubmit' ? 'Withdraw' : 'Submit',
                        style: type === 'delete' ? 'destructive' : 'default',
                        onPress: async () => {
                            try {
                                await onConfirm({});
                                handleDismiss();
                            } catch (error: any) {
                                Alert.alert('Error', error.message || 'Failed to perform action.', [{ text: 'OK', onPress: handleDismiss }]);
                            }
                        },
                    },
                ]
            );
        }
    };

    useEffect(() => {
        if (visible && request) {
            if ((Platform.OS as string) === 'ios' && !isEmbedded) {
                if (!nativeAlertShown) {
                    setNativeAlertShown(true);
                    showNativeAlert();
                }
            } else {
                setReason('');
                setApprovedAmount(formatAmountInput(request.amount));
                setSubmitting(false);
            }
        } else {
            setNativeAlertShown(false);
        }
    }, [visible, request, isEmbedded]);

    const handleConfirm = async () => {
        if (needsReason && !reason.trim()) {
            Alert.alert('Reason Required', 'Please provide a reason for this action.');
            return;
        }

        let parsedAmount: number | undefined;
        if (needsAmount) {
            parsedAmount = parseInt(approvedAmount.replace(/[^0-9]/g, ''), 10);
            if (!parsedAmount || parsedAmount <= 0) {
                Alert.alert('Invalid Amount', 'Please enter a valid approved amount.');
                return;
            }
        }

        setSubmitting(true);
        try {
            await onConfirm({
                reason: reason.trim() || undefined,
                approvedAmount: parsedAmount,
            });
            onClose();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to perform action.');
        } finally {
            setSubmitting(false);
        }
    };

    if (!request) return null;
    if ((Platform.OS as string) === 'ios' && !isEmbedded) return null; // Render nothing on iOS mobile since we use 100% native dialogs

    const actionBgColor = type === 'delete' || type === 'reject' ? '#FF3B30'
        : type === 'revision' ? '#FF9500'
            : type === 'pay' ? '#007AFF'
                : type === 'cancelSubmit' ? '#8E8E93'
                    : '#34C759';

    const isConfirmDisabled = submitting || (needsReason && !reason.trim());

    const renderInnerContent = () => (
        <View
            style={[
                isEmbedded ? s.embeddedModalContent : s.modalContent,
                {
                    backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                    borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)',
                }
            ]}
        >
            <View style={s.mainContent}>
                <View style={[isEmbedded && { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }]}>
                    <Text style={[s.modalTitle, isEmbedded && { textAlign: 'left', fontSize: 20 }, { color: textColor }]}>{titleMap[type]}</Text>
                    {isEmbedded && (
                        <TouchableOpacity onPress={onClose} disabled={submitting} style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)', justifyContent: 'center', alignItems: 'center' }}>
                            <Ionicons name="close" size={16} color={subtextColor} />
                        </TouchableOpacity>
                    )}
                </View>
                <Text style={[s.targetInfo, isEmbedded && { textAlign: 'left', marginBottom: 20 }, { color: subtextColor }]} numberOfLines={1}>
                    {request.ref ? `${request.ref} • ` : ''}{request.title || 'Finance Request'}
                </Text>

                {needsAmount && (
                    <View style={s.section}>
                        <Text style={[s.label, { color: subtextColor }]}>APPROVED AMOUNT</Text>
                        <View style={[s.amountRow, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)' }]}>
                            <Text style={[s.currency, { color: subtextColor }]}>Rp</Text>
                            <TextInput
                                style={[s.amountInput, { color: textColor }]}
                                value={approvedAmount}
                                onChangeText={setApprovedAmount}
                                keyboardType="numeric"
                                placeholder="0"
                                placeholderTextColor={subtextColor}
                                autoFocus
                            />
                        </View>
                        <Text style={[s.hint, { color: subtextColor }]}>
                            Adjust if the approved amount differs from the requested total.
                        </Text>
                    </View>
                )}

                {needsReason && (
                    <View style={s.section}>
                        <Text style={[s.label, { color: subtextColor }]}>
                            {type === 'reject' ? 'REJECTION REASON (REQUIRED)' : 'REVISION NOTE (REQUIRED)'}
                        </Text>
                        <TextInput
                            style={[s.textArea, { color: textColor, backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)' }]}
                            placeholder={type === 'reject' ? 'Explain why this request is rejected...' : 'Explain what needs to be revised...'}
                            placeholderTextColor={subtextColor}
                            multiline
                            numberOfLines={3}
                            value={reason}
                            onChangeText={setReason}
                            autoFocus
                        />
                    </View>
                )}

                {(type === 'delete' || type === 'pay' || type === 'submit' || type === 'cancelSubmit' || (type === 'approve' && !needsAmount)) && (
                    <Text style={[s.confirmText, isEmbedded && { textAlign: 'left' }, { color: textColor }]}>
                        {type === 'delete' && 'This action cannot be undone. Are you sure you want to delete this request?'}
                        {type === 'pay' && 'Confirm that payment has been processed for this request.'}
                        {type === 'submit' && 'Submit this request for review?'}
                        {type === 'cancelSubmit' && 'Withdraw this request to Draft so it can be edited?'}
                        {type === 'approve' && !needsAmount && `Approve the full requested amount of Rp ${Number(request.amount || 0).toLocaleString('id-ID')}?`}
                    </Text>
                )}

                <View style={s.modalActions}>
                    <TouchableOpacity
                        style={[s.actionBtn, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}
                        onPress={onClose}
                        disabled={submitting}
                        activeOpacity={0.6}
                    >
                        <Text style={[s.actionBtnText, { color: textColor }]}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            s.actionBtn,
                            { 
                                backgroundColor: actionBgColor,
                                opacity: isConfirmDisabled ? 0.5 : 1
                            }
                        ]}
                        onPress={handleConfirm}
                        disabled={isConfirmDisabled}
                        activeOpacity={0.6}
                    >
                        {submitting ? (
                            <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                            <Text style={[s.actionBtnText, { color: '#FFFFFF' }]}>
                                {type === 'approve' ? 'Approve' : type === 'reject' ? 'Reject' : type === 'revision' ? 'Send' : type === 'delete' ? 'Delete' : type === 'pay' ? 'Confirm' : type === 'cancelSubmit' ? 'Withdraw' : 'Submit'}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    if (isEmbedded) {
        return (
            <View style={{ flex: 1, width: '100%', height: '100%', padding: 24, justifyContent: 'center', alignItems: 'center', backgroundColor: isDark ? '#000000' : '#F2F2F7' }}>
                {renderInnerContent()}
            </View>
        );
    }

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={s.overlay}
            >
                {renderInnerContent()}
            </KeyboardAvoidingView>
        </Modal>
    );
}

const s = StyleSheet.create({
    embeddedModalContent: {
        width: '100%',
        maxWidth: 480,
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        width: 320,
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
    },
    mainContent: {
        width: '100%',
        alignItems: 'stretch',
    },
    modalTitle: {
        fontSize: 19,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 4,
    },
    targetInfo: {
        fontSize: 13,
        fontWeight: '500',
        textAlign: 'center',
        marginBottom: 20,
    },
    section: {
        width: '100%',
        gap: 6,
        marginBottom: 16,
    },
    label: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    amountRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 24,
        paddingHorizontal: 18,
        height: 48,
    },
    currency: {
        fontSize: 15,
        fontWeight: '700',
        marginRight: 6,
    },
    amountInput: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
    },
    hint: {
        fontSize: 11,
        lineHeight: 15,
        textAlign: 'center',
        marginTop: 6,
    },
    textArea: {
        minHeight: 80,
        borderRadius: 20,
        padding: 14,
        fontSize: 14,
        fontWeight: '500',
        textAlignVertical: 'top',
    },
    confirmText: {
        fontSize: 14,
        fontWeight: '500',
        lineHeight: 20,
        textAlign: 'center',
        marginBottom: 16,
    },
    modalActions: {
        flexDirection: 'row',
        width: '100%',
        gap: 12,
        marginTop: 16,
    },
    actionBtn: {
        flex: 1,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionBtnText: {
        fontSize: 15,
        fontWeight: '700',
    },
});
