import React, { useState, useEffect, useRef } from 'react';
import {
    Modal,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Platform,
    KeyboardAvoidingView,
    useWindowDimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { GlassView } from '@/components/ui/GlassView';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/theme';

interface PromptModalProps {
    visible: boolean;
    title: string;
    description?: string;
    placeholder?: string;
    defaultValue?: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: (text: string) => void;
    onCancel: () => void;
}

export const PromptModal: React.FC<PromptModalProps> = ({
    visible,
    title,
    description,
    placeholder = 'Enter value...',
    defaultValue = '',
    confirmText = 'Save',
    cancelText = 'Cancel',
    onConfirm,
    onCancel,
}) => {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';
    const borderColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
    const { width } = useWindowDimensions();
    const isDesktop = Platform.OS === 'web' && width >= 600;

    const [inputText, setInputText] = useState(defaultValue);
    const inputRef = useRef<TextInput>(null);

    useEffect(() => {
        if (visible) {
            setInputText(defaultValue);
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
    }, [visible, defaultValue]);

    if (!visible) return null;

    const handleConfirm = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onConfirm(inputText.trim());
    };

    const handleCancel = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onCancel();
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            statusBarTranslucent={true}
            onRequestClose={handleCancel}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.overlay}
            >
                <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    activeOpacity={1}
                    onPress={handleCancel}
                >
                    <View style={styles.backdrop} />
                </TouchableOpacity>

                <GlassView
                    intensity={isDark ? 40 : 60}
                    style={[
                        styles.dialog,
                        {
                            width: isDesktop ? 400 : '85%',
                            backgroundColor: isDark ? 'rgba(30,30,34,0.95)' : 'rgba(255,255,255,0.95)',
                            borderColor,
                        },
                    ]}
                >
                    {/* Title */}
                    <Text style={[styles.title, { color: textColor }]}>{title}</Text>

                    {/* Description */}
                    {description ? (
                        <Text style={[styles.description, { color: subtextColor }]}>
                            {description}
                        </Text>
                    ) : null}

                    {/* Text Input */}
                    <View
                        style={[
                            styles.inputWrapper,
                            {
                                backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)',
                                borderColor,
                            },
                        ]}
                    >
                        <TextInput
                            ref={inputRef}
                            value={inputText}
                            onChangeText={setInputText}
                            placeholder={placeholder}
                            placeholderTextColor={subtextColor}
                            style={[
                                styles.textInput,
                                {
                                    color: textColor,
                                    fontFamily: Platform.OS === 'web' ? '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif' : undefined,
                                },
                            ]}
                            autoCapitalize="sentences"
                            returnKeyType="done"
                            onSubmitEditing={handleConfirm}
                        />
                    </View>

                    {/* Action Buttons */}
                    <View style={[styles.buttonRow, { borderTopColor: borderColor }]}>
                        <TouchableOpacity
                            onPress={handleCancel}
                            style={[styles.button, styles.cancelButton]}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.buttonText, { color: subtextColor }]}>
                                {cancelText}
                            </Text>
                        </TouchableOpacity>

                        <View style={[styles.buttonDivider, { backgroundColor: borderColor }]} />

                        <TouchableOpacity
                            onPress={handleConfirm}
                            style={[styles.button, styles.confirmButton]}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.buttonText, styles.confirmText]}>
                                {confirmText}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </GlassView>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    dialog: {
        borderRadius: 20,
        borderWidth: 1,
        paddingTop: 22,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.35,
        shadowRadius: 24,
        elevation: 10,
        overflow: 'hidden',
    },
    title: {
        fontSize: 17,
        fontWeight: '600',
        textAlign: 'center',
        paddingHorizontal: 20,
        letterSpacing: -0.2,
    },
    description: {
        fontSize: 13,
        textAlign: 'center',
        paddingHorizontal: 20,
        marginTop: 6,
        lineHeight: 18,
    },
    inputWrapper: {
        width: '88%',
        borderWidth: 1,
        borderRadius: 10,
        marginTop: 16,
        marginBottom: 20,
        paddingHorizontal: 12,
        paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    },
    textInput: {
        fontSize: 14,
        padding: 0,
        width: '100%',
    },
    buttonRow: {
        flexDirection: 'row',
        width: '100%',
        borderTopWidth: StyleSheet.hairlineWidth,
        height: 46,
    },
    button: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelButton: {},
    confirmButton: {},
    buttonDivider: {
        width: StyleSheet.hairlineWidth,
        height: '100%',
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '400',
    },
    confirmText: {
        color: '#007AFF',
        fontWeight: '600',
    },
});
