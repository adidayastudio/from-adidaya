import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    Pressable,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { GlassView } from '@/components/ui/GlassView';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ReportsStartingNumberSheetProps {
    visible: boolean;
    isDark: boolean;
    textColor: string;
    subtextColor: string;
    currentValue: number;
    onClose: () => void;
    onSave: (newVal: number) => void;
}

export function ReportsStartingNumberSheet({
    visible,
    isDark,
    textColor,
    subtextColor,
    currentValue,
    onClose,
    onSave,
}: ReportsStartingNumberSheetProps) {
    const insets = useSafeAreaInsets();
    const [valStr, setValStr] = useState(String(currentValue));

    const handleSave = () => {
        const parsed = parseInt(valStr, 10);
        if (!isNaN(parsed) && parsed >= 0) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onSave(parsed);
        }
        onClose();
    };

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <Pressable style={styles.backdrop} onPress={onClose} />

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.sheetWrapper}
                >
                    <GlassView
                        intensity={isDark ? 30 : 60}
                        style={[
                            styles.sheetContainer,
                            {
                                backgroundColor: isDark ? 'rgba(28,28,30,0.85)' : 'rgba(242,242,247,0.92)',
                                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                                paddingBottom: Math.max(insets.bottom, 16),
                            },
                        ]}
                    >
                        {/* Grabber Handle */}
                        <View style={styles.handleContainer}>
                            <View style={[styles.grabber, { backgroundColor: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)' }]} />
                        </View>

                        {/* Header */}
                        <View style={styles.header}>
                            <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <Text style={[styles.headerTitle, { color: textColor }]}>Starting Number</Text>
                            <TouchableOpacity onPress={handleSave} style={styles.headerBtn}>
                                <Text style={styles.doneText}>Done</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.content}>
                            <Text style={[styles.sub, { color: subtextColor }]}>
                                Specify the initial sequence number for document code generation (e.g., 1 or 1001 for legacy system migration).
                            </Text>

                            <GlassView
                                intensity={isDark ? 15 : 25}
                                style={[
                                    styles.inputBox,
                                    {
                                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.85)',
                                        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                                    },
                                ]}
                            >
                                <TextInput
                                    style={[styles.input, { color: textColor }]}
                                    value={valStr}
                                    onChangeText={setValStr}
                                    keyboardType="number-pad"
                                    autoFocus
                                />
                            </GlassView>
                        </View>
                    </GlassView>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    sheetWrapper: {
        maxHeight: '60%',
    },
    sheetContainer: {
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        borderWidth: 1,
        borderBottomWidth: 0,
        overflow: 'hidden',
    },
    handleContainer: {
        alignItems: 'center',
        paddingVertical: 10,
    },
    grabber: {
        width: 36,
        height: 5,
        borderRadius: 2.5,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(0,0,0,0.08)',
    },
    headerBtn: {
        paddingVertical: 4,
        paddingHorizontal: 4,
    },
    cancelText: {
        fontSize: 16,
        color: '#007AFF',
    },
    doneText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#007AFF',
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '600',
    },
    content: {
        padding: 20,
        gap: 16,
    },
    sub: {
        fontSize: 14,
        lineHeight: 20,
    },
    inputBox: {
        borderRadius: 16,
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    input: {
        fontSize: 24,
        fontWeight: '600',
        textAlign: 'center',
    },
});
