import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    ScrollView,
    TouchableOpacity,
    Platform,
    TextInput,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import * as Haptics from 'expo-haptics';
import { ReceivingQueueItem } from '@/lib/api/resourcesReceiving';

export interface ReceivingDetailModalProps {
    isOpened?: boolean;
    visible?: boolean;
    onClose: () => void;
    item: ReceivingQueueItem | null;
    onConfirmReceipt: (item: ReceivingQueueItem, receivedQty: number, notes: string) => void;
    isEmbedded?: boolean;
}

export const ReceivingDetailModal: React.FC<ReceivingDetailModalProps> = (props) => {
    const {
        visible,
        isOpened,
        onClose,
        item,
        onConfirmReceipt,
        isEmbedded = false,
    } = props;

    if (Platform.OS === 'ios' && !isEmbedded) {
        const Comp = require('./SwiftUIReceivingDetailSheet.ios').SwiftUIReceivingDetailSheet || require('./SwiftUIReceivingDetailSheet.ios').default;
        return <Comp {...props} />;
    }

    const isVisible = Boolean(isOpened ?? visible);
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';
    const cardBg = isDark ? 'rgba(255, 255, 255, 0.05)' : '#FFFFFF';
    const bgSurface = isDark ? '#1C1C1E' : '#F2F2F7';

    const [qtyInput, setQtyInput] = useState('');
    const [notesInput, setNotesInput] = useState('');

    useEffect(() => {
        if (isVisible && item) {
            const remaining = Math.max(0, item.expectedQty - item.receivedQty);
            setQtyInput(remaining > 0 ? String(remaining) : String(item.expectedQty));
            setNotesInput('');
        }
    }, [isVisible, item]);

    if (!isVisible || !item) return null;

    const remainingQty = Math.max(0, item.expectedQty - item.receivedQty);

    const handleConfirm = () => {
        const qtyNum = parseFloat(qtyInput);
        if (isNaN(qtyNum) || qtyNum <= 0) {
            Alert.alert('Invalid Quantity', 'Please enter a valid received quantity.');
            return;
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onConfirmReceipt(item, qtyNum, notesInput);
        onClose();
    };

    const modalContent = (
        <View style={[
            styles.innerContainer,
            isEmbedded && styles.embeddedContainer,
            { backgroundColor: isDark ? '#121212' : '#FFFFFF' }
        ]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.headerTitle, { color: textColor }]}>Goods Receipt</Text>
                    <Text style={[styles.headerSub, { color: subtextColor }]}>{item.sourceDocNo}</Text>
                </View>
                {!isEmbedded && (
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <Ionicons name="close-circle" size={26} color={subtextColor} />
                    </TouchableOpacity>
                )}
            </View>

            <ScrollView contentContainerStyle={styles.scrollBody}>
                {/* Item Summary Card */}
                <View style={[styles.card, { backgroundColor: cardBg }]}>
                    <View style={styles.badgeRow}>
                        <View style={[styles.typeBadge, { backgroundColor: isDark ? 'rgba(245, 130, 50, 0.2)' : '#FFE8D6' }]}>
                            <Text style={styles.typeBadgeText}>{item.resourceType}</Text>
                        </View>
                        <View style={[
                            styles.statusBadge,
                            {
                                backgroundColor: item.status === 'received'
                                    ? (isDark ? 'rgba(52, 199, 89, 0.2)' : '#E3F9E5')
                                    : (isDark ? 'rgba(0, 122, 255, 0.2)' : '#E5F1FF')
                            }
                        ]}>
                            <Text style={[
                                styles.statusBadgeText,
                                { color: item.status === 'received' ? '#34C759' : '#007AFF' }
                            ]}>
                                {item.status.toUpperCase()}
                            </Text>
                        </View>
                    </View>

                    <Text style={[styles.itemName, { color: textColor }]}>{item.itemName}</Text>
                    <Text style={[styles.vendorText, { color: subtextColor }]}>Vendor: {item.vendor}</Text>

                    <View style={styles.progressRow}>
                        <View style={styles.statBox}>
                            <Text style={[styles.statLabel, { color: subtextColor }]}>Expected</Text>
                            <Text style={[styles.statVal, { color: textColor }]}>{item.expectedQty} {item.unit}</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={[styles.statLabel, { color: subtextColor }]}>Received</Text>
                            <Text style={[styles.statVal, { color: '#34C759' }]}>{item.receivedQty} {item.unit}</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={[styles.statLabel, { color: subtextColor }]}>Remaining</Text>
                            <Text style={[styles.statVal, { color: '#FF9500' }]}>{remainingQty} {item.unit}</Text>
                        </View>
                    </View>
                </View>

                {/* Receiving Form */}
                <View style={[styles.card, { backgroundColor: cardBg }]}>
                    <Text style={[styles.sectionHeading, { color: textColor }]}>Receive Quantity</Text>
                    
                    <View style={styles.fieldGroup}>
                        <Text style={[styles.label, { color: subtextColor }]}>Quantity to Receive Now ({item.unit})</Text>
                        <TextInput
                            style={[styles.input, { color: textColor, backgroundColor: bgSurface }]}
                            value={qtyInput}
                            onChangeText={setQtyInput}
                            keyboardType="numeric"
                            placeholder="Enter qty"
                            placeholderTextColor={subtextColor}
                        />
                    </View>

                    <View style={styles.fieldGroup}>
                        <Text style={[styles.label, { color: subtextColor }]}>Storage Location</Text>
                        <Text style={[styles.readOnlyText, { color: textColor }]}>{item.location || 'Warehouse A'}</Text>
                    </View>

                    <View style={styles.fieldGroup}>
                        <Text style={[styles.label, { color: subtextColor }]}>Notes / Inspection Remarks</Text>
                        <TextInput
                            style={[styles.input, styles.textArea, { color: textColor, backgroundColor: bgSurface }]}
                            value={notesInput}
                            onChangeText={setNotesInput}
                            placeholder="Add condition or delivery notes..."
                            placeholderTextColor={subtextColor}
                            multiline
                        />
                    </View>
                </View>

                {/* Actions */}
                <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} activeOpacity={0.85}>
                    <Text style={styles.confirmBtnText}>Confirm Delivery Receipt</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );

    if (isEmbedded) {
        return modalContent;
    }

    return (
        <Modal
            visible={isVisible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                {modalContent}
            </View>
        </Modal>
    );
};

export const SwiftUIReceivingDetailSheet = ReceivingDetailModal;
export default ReceivingDetailModal;

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    innerContainer: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '90%',
        minHeight: '60%',
        paddingBottom: 24,
    },
    embeddedContainer: {
        flex: 1,
        maxHeight: '100%',
        minHeight: '100%',
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
        paddingBottom: 0,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    headerSub: {
        fontSize: 13,
        marginTop: 2,
    },
    closeBtn: {
        padding: 4,
    },
    scrollBody: {
        padding: 20,
        gap: 16,
    },
    card: {
        borderRadius: 16,
        padding: 16,
        gap: 12,
    },
    badgeRow: {
        flexDirection: 'row',
        gap: 8,
    },
    typeBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    typeBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#F58232',
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusBadgeText: {
        fontSize: 12,
        fontWeight: '700',
    },
    itemName: {
        fontSize: 17,
        fontWeight: '700',
    },
    vendorText: {
        fontSize: 13,
    },
    progressRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 6,
        paddingTop: 10,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: 'rgba(150,150,150,0.2)',
    },
    statBox: {
        gap: 2,
    },
    statLabel: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    statVal: {
        fontSize: 15,
        fontWeight: '700',
    },
    sectionHeading: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 4,
    },
    fieldGroup: {
        gap: 6,
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
    },
    input: {
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 15,
    },
    textArea: {
        height: 70,
        textAlignVertical: 'top',
    },
    readOnlyText: {
        fontSize: 14,
        fontWeight: '600',
    },
    confirmBtn: {
        backgroundColor: '#F58232',
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 8,
    },
    confirmBtnText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
});
