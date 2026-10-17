import React, { useState } from 'react';
import {
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassView } from '../ui/GlassView';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/theme';

interface ResourceReceiveModalProps {
    visible: boolean;
    onClose: () => void;
    item: any;
    onConfirm: (quantity: string, notes: string) => void;
}

export function ResourceReceiveModal({ visible, onClose, item, onConfirm }: ResourceReceiveModalProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme as 'light'|'dark'].text;
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';
    const primaryColor = isDark ? '#0A84FF' : '#007AFF';

    const [receivedQty, setReceivedQty] = useState('');
    const [notes, setNotes] = useState('');

    if (!item) return null;

    const handleConfirm = () => {
        onConfirm(receivedQty, notes);
        setReceivedQty('');
        setNotes('');
        onClose();
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <KeyboardAvoidingView 
                style={s.overlay} 
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <TouchableOpacity
                    style={StyleSheet.absoluteFillObject}
                    activeOpacity={1}
                    onPress={onClose}
                />
                <GlassView
                    intensity={100}
                    style={[
                        s.sheet,
                        { backgroundColor: isDark ? 'rgba(28,28,30,0.95)' : 'rgba(242,242,247,0.95)' }
                    ]}
                >
                    {/* Header */}
                    <View style={s.header}>
                        <Text style={[s.modalTitle, { color: textColor }]}>Receive Item</Text>
                        <TouchableOpacity
                            style={[s.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
                            onPress={onClose}
                        >
                            <Ionicons name="close" size={20} color={textColor} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        
                        {/* Item Info Summary */}
                        <View style={[s.infoCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFF' }]}>
                            <Text style={[s.itemCode, { color: subtextColor }]}>{item.code}</Text>
                            <Text style={[s.itemName, { color: textColor }]}>{item.title}</Text>
                            <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]} />
                            <View style={s.qtyRow}>
                                <View>
                                    <Text style={[s.qtyLabel, { color: subtextColor }]}>EXPECTED</Text>
                                    <Text style={[s.qtyValue, { color: textColor }]}>{item.expected || 0} {item.unit}</Text>
                                </View>
                                <View>
                                    <Text style={[s.qtyLabel, { color: subtextColor }]}>RECEIVED</Text>
                                    <Text style={[s.qtyValue, { color: textColor }]}>{item.received || 0} {item.unit}</Text>
                                </View>
                            </View>
                        </View>

                        {/* Quantity Input */}
                        <Text style={[s.sectionTitle, { color: subtextColor }]}>QUANTITY ARRIVED TODAY</Text>
                        <View style={[s.inputWrapper, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFF', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
                            <TextInput
                                style={[s.input, { color: primaryColor }]}
                                placeholder="0"
                                placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
                                keyboardType="numeric"
                                value={receivedQty}
                                onChangeText={setReceivedQty}
                            />
                            <Text style={[s.inputUnit, { color: subtextColor }]}>{item.unit}</Text>
                        </View>

                        {/* Attachments */}
                        <Text style={[s.sectionTitle, { color: subtextColor }]}>ATTACHMENTS (REQUIRED)</Text>
                        <View style={s.attachmentsRow}>
                            <TouchableOpacity style={[s.uploadBox, { borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)', backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#FFF' }]}>
                                <Ionicons name="document-text-outline" size={24} color={subtextColor} style={s.uploadIcon} />
                                <Text style={[s.uploadText, { color: subtextColor }]}>Surat Jalan (DO)</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[s.uploadBox, { borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)', backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#FFF' }]}>
                                <Ionicons name="camera-outline" size={24} color={subtextColor} style={s.uploadIcon} />
                                <Text style={[s.uploadText, { color: subtextColor }]}>Photo of Goods</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Notes */}
                        <Text style={[s.sectionTitle, { color: subtextColor }]}>NOTES / REMARKS</Text>
                        <TextInput
                            style={[s.textArea, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFF', color: textColor, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
                            placeholder="Add condition details or delivery issues..."
                            placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
                            multiline
                            numberOfLines={3}
                            value={notes}
                            onChangeText={setNotes}
                        />

                    </ScrollView>

                    {/* Footer Actions */}
                    <View style={s.footer}>
                        <TouchableOpacity 
                            style={[s.primaryBtn, { backgroundColor: receivedQty ? primaryColor : (isDark ? '#333' : '#E5E5EA') }]}
                            disabled={!receivedQty}
                            onPress={handleConfirm}
                        >
                            <Ionicons name="checkmark-circle" size={18} color={receivedQty ? '#FFF' : subtextColor} />
                            <Text style={[s.primaryBtnText, { color: receivedQty ? '#FFF' : subtextColor }]}>Confirm Receipt</Text>
                        </TouchableOpacity>
                    </View>
                </GlassView>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const s = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
        padding: 8,
    },
    sheet: {
        height: '85%',
        borderRadius: 56,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 20,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        paddingHorizontal: 28,
        paddingBottom: 40,
    },
    infoCard: {
        borderRadius: 20,
        padding: 20,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    itemCode: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    itemName: {
        fontSize: 18,
        fontWeight: '700',
    },
    divider: {
        height: 1,
        marginVertical: 16,
    },
    qtyRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    qtyLabel: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    qtyValue: {
        fontSize: 16,
        fontWeight: '700',
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1.5,
        marginBottom: 12,
        marginTop: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 20,
        paddingHorizontal: 20,
        height: 64,
        marginBottom: 24,
    },
    input: {
        flex: 1,
        fontSize: 28,
        fontWeight: '800',
    },
    inputUnit: {
        fontSize: 16,
        fontWeight: '700',
        marginLeft: 12,
    },
    attachmentsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    uploadBox: {
        flex: 1,
        height: 100,
        borderRadius: 20,
        borderWidth: 2,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 12,
    },
    uploadIcon: {
        marginBottom: 8,
    },
    uploadText: {
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
    },
    textArea: {
        borderWidth: 1,
        borderRadius: 20,
        padding: 16,
        minHeight: 100,
        fontSize: 15,
        textAlignVertical: 'top',
        marginBottom: 40,
    },
    footer: {
        paddingHorizontal: 28,
        paddingTop: 16,
        paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    },
    primaryBtn: {
        height: 56,
        borderRadius: 28,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    primaryBtnText: {
        fontSize: 16,
        fontWeight: '700',
    },
});
