import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, TextInput, Alert, ActivityIndicator, Platform } from 'react-native';
import { GlassView } from '@/components/ui/GlassView';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';

export interface ApprovalItem {
    id: string;
    actualId: string;
    employee: string;
    type: 'Leave Request' | 'Overtime' | 'Business Trip' | 'Attendance Correction';
    details: string;
    dates: string;
    submittedAt: string;
    status: string;
    reason: string;
    rejectReason?: string;
    rawStartTime?: string;
    rawEndTime?: string;
    fileUrl?: string;
    requestNumber?: string;
    destination?: string;
    startDate?: string;
    endDate?: string;
    date?: string;
}

interface ApprovalActionModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: (reason?: string, correction?: { approvedStartTime?: string; approvedEndTime?: string }) => Promise<void>;
    type: 'approve' | 'reject' | 'revision';
    item: ApprovalItem | null;
}

export function ApprovalActionModal({ visible, onClose, onConfirm, type, item }: ApprovalActionModalProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';

    const [reason, setReason] = useState('');
    const [approvedStartTime, setApprovedStartTime] = useState('');
    const [approvedEndTime, setApprovedEndTime] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [nativeAlertShown, setNativeAlertShown] = useState(false);

    const showNativeAlert = () => {
        if (!item) return;
        const title = type === 'approve' ? 'Approve Request' : type === 'reject' ? 'Reject Request' : 'Request Revision';
        const subText = `For ${item.employee} • ${item.type}`;
        
        const handleDismiss = () => {
            setNativeAlertShown(false);
            onClose();
        };
        
        if (type === 'reject' || type === 'revision') {
            Alert.prompt(
                title,
                `${subText}\n\n${type === 'reject' ? 'Explain why this request is rejected:' : 'Explain what needs to be revised:'}`,
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
                                Alert.alert('Reason Required', 'Please provide a reason.', [{ text: 'OK', onPress: handleDismiss }]);
                                return;
                            }
                            try {
                                await onConfirm(text.trim());
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
            // approve
            if (item.type === 'Overtime') {
                Alert.prompt(
                    'Approved Start Time',
                    `${subText}\n\nSpecify approved start time (HH:mm):`,
                    [
                        { text: 'Cancel', style: 'cancel', onPress: handleDismiss },
                        {
                            text: 'Next',
                            onPress: (startTime?: string) => {
                                Alert.prompt(
                                    'Approved End Time',
                                    `${subText}\n\nSpecify approved end time (HH:mm):`,
                                    [
                                        { text: 'Cancel', style: 'cancel', onPress: handleDismiss },
                                        {
                                            text: 'Approve',
                                            onPress: async (endTime?: string) => {
                                                try {
                                                    await onConfirm(undefined, { 
                                                        approvedStartTime: startTime || undefined, 
                                                        approvedEndTime: endTime || undefined 
                                                    });
                                                    handleDismiss();
                                                } catch (error: any) {
                                                    Alert.alert('Error', error.message || 'Failed to approve request.', [{ text: 'OK', onPress: handleDismiss }]);
                                                }
                                            }
                                        }
                                    ],
                                    'plain-text',
                                    item.rawEndTime || ''
                                );
                            }
                        }
                    ],
                    'plain-text',
                    item.rawStartTime || ''
                );
            } else {
                Alert.alert(
                    title,
                    `Are you sure you want to approve this request?\n\n${subText}`,
                    [
                        { text: 'Cancel', style: 'cancel', onPress: handleDismiss },
                        {
                            text: 'Approve',
                            onPress: async () => {
                                try {
                                    await onConfirm();
                                    handleDismiss();
                                } catch (error: any) {
                                    Alert.alert('Error', error.message || 'Failed to approve request.', [{ text: 'OK', onPress: handleDismiss }]);
                                }
                            }
                        }
                    ]
                );
            }
        }
    };

    useEffect(() => {
        if (visible && item) {
            if (Platform.OS === 'ios') {
                if (!nativeAlertShown) {
                    setNativeAlertShown(true);
                    showNativeAlert();
                }
            } else {
                setReason('');
                setApprovedStartTime(item.rawStartTime || '');
                setApprovedEndTime(item.rawEndTime || '');
                setSubmitting(false);
            }
        } else {
            setNativeAlertShown(false);
        }
    }, [visible, item]);

    const handleConfirm = async () => {
        if ((type === 'reject' || type === 'revision') && !reason.trim()) {
            Alert.alert('Reason Required', `Please provide a reason for ${type === 'reject' ? 'rejecting' : 'requesting revision on'} this request.`);
            return;
        }

        const actionText = type === 'approve' ? 'approve' : type === 'reject' ? 'reject' : 'request revision for';
        Alert.alert(
            'Confirm Action',
            `Are you sure you want to ${actionText} this request?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm',
                    onPress: async () => {
                        setSubmitting(true);
                        try {
                            const correction = item?.type === 'Overtime' && type === 'approve' 
                                ? { approvedStartTime, approvedEndTime }
                                : undefined;

                            await onConfirm(reason.trim() || undefined, correction);
                            onClose();
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to submit action.');
                        } finally {
                            setSubmitting(false);
                        }
                    }
                }
            ]
        );
    };

    if (!item) return null;
    if (Platform.OS === 'ios') return null; // Render nothing on iOS since we use 100% native dialogs

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={s.overlay}>
                <GlassView 
                    intensity={60} 
                    tint={isDark ? 'dark' : 'light'} 
                    style={[s.modalContent, { backgroundColor: isDark ? 'rgba(28,28,30,0.95)' : 'rgba(255,255,255,0.95)' }]}
                >
                    {/* Header */}
                    <View style={s.modalHeader}>
                        <Text style={[s.modalTitle, { color: textColor }]}>
                            {type === 'approve' ? 'Approve Request' : type === 'reject' ? 'Reject Request' : 'Request Revision'}
                        </Text>
                        <TouchableOpacity onPress={onClose} disabled={submitting}>
                            <PlatformIcon name="xmark.circle.fill" size={24} tintColor={subtextColor} />
                        </TouchableOpacity>
                    </View>

                    {/* Content */}
                    <ScrollView contentContainerStyle={s.content}>
                        <Text style={[s.targetInfo, { color: textColor }]}>
                            For <Text style={{ fontWeight: '800', color: '#007AFF' }}>{item.employee}</Text> • {item.type}
                        </Text>

                        {type === 'reject' || type === 'revision' ? (
                            <View style={s.section}>
                                <Text style={[s.label, { color: subtextColor }]}>
                                    {type === 'reject' ? 'REJECTION REASON (REQUIRED)' : 'REVISION INSTRUCTIONS (REQUIRED)'}
                                </Text>
                                <TextInput
                                    style={[s.textArea, { color: textColor, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFF' }]}
                                    placeholder={type === 'reject' ? "Provide rejection reason..." : "Provide revision instructions..."}
                                    placeholderTextColor={subtextColor}
                                    multiline
                                    numberOfLines={3}
                                    value={reason}
                                    onChangeText={setReason}
                                />
                            </View>
                        ) : item.type === 'Overtime' ? (
                            <View style={s.section}>
                                <Text style={[s.sectionTitle, { color: textColor }]}>Approve & Correct Hours</Text>
                                <View style={s.row}>
                                    <View style={{ flex: 1, marginRight: 12 }}>
                                        <Text style={[s.label, { color: subtextColor }]}>APPROVED START</Text>
                                        <TextInput
                                            style={[s.input, { color: textColor, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFF' }]}
                                            value={approvedStartTime}
                                            onChangeText={setApprovedStartTime}
                                            placeholder="HH:mm"
                                            placeholderTextColor={subtextColor}
                                        />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[s.label, { color: subtextColor }]}>APPROVED END</Text>
                                        <TextInput
                                            style={[s.input, { color: textColor, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFF' }]}
                                            value={approvedEndTime}
                                            onChangeText={setApprovedEndTime}
                                            placeholder="HH:mm"
                                            placeholderTextColor={subtextColor}
                                        />
                                    </View>
                                </View>
                            </View>
                        ) : (
                            <Text style={[s.confirmText, { color: textColor }]}>
                                Are you sure you want to approve this request?
                            </Text>
                        )}

                        {/* Actions */}
                        <View style={s.modalActions}>
                            <TouchableOpacity 
                                style={[s.actionBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#E5E5EA' }]} 
                                onPress={onClose}
                                disabled={submitting}
                            >
                                <Text style={[s.actionBtnText, { color: textColor }]}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={[s.actionBtn, { backgroundColor: type === 'approve' ? '#34C759' : type === 'reject' ? '#FF3B30' : '#FF9500' }]} 
                                onPress={handleConfirm}
                                disabled={submitting || ((type === 'reject' || type === 'revision') && !reason.trim())}
                            >
                                {submitting ? (
                                    <ActivityIndicator color="#FFF" size="small" />
                                ) : (
                                    <Text style={[s.actionBtnText, { color: '#FFF', fontWeight: '700' }]}>
                                        {type === 'approve' ? 'Approve' : type === 'reject' ? 'Reject' : 'Request Revision'}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </GlassView>
            </View>
        </Modal>
    );
}

const s = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
    modalContent: { borderRadius: 24, padding: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    modalTitle: { fontSize: 18, fontWeight: '800' },
    content: { gap: 16 },
    targetInfo: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
    section: { gap: 8 },
    sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
    label: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
    textArea: { minHeight: 80, borderRadius: 12, padding: 12, fontSize: 14, textAlignVertical: 'top' },
    row: { flexDirection: 'row' },
    input: { height: 44, borderRadius: 999, paddingHorizontal: 12, fontSize: 14, fontWeight: '600' },
    confirmText: { fontSize: 15, fontWeight: '500', marginVertical: 8 },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 12 },
    actionBtn: { flex: 1, height: 48, borderRadius: 999, justifyContent: 'center', alignItems: 'center' },
    actionBtnText: { fontSize: 14, fontWeight: '600' }
});
