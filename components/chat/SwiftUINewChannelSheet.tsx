import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Modal,
    Keyboard,
    Platform,
    StyleSheet,
    TouchableWithoutFeedback,
    Animated,
    ScrollView,
    useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FormaBlue } from '@/constants/theme';
import * as Haptics from 'expo-haptics';
import { HeaderCircleButton } from '@/components/ui/HeaderCircleButton';

export interface SwiftUINewChannelSheetProps {
    visible: boolean;
    onClose: () => void;
    onCreate: (name: string, code: string, description?: string) => void;
    isDark?: boolean;
}

export function SwiftUINewChannelSheet({
    visible,
    onClose,
    onCreate,
    isDark = false,
}: SwiftUINewChannelSheetProps) {
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const isDesktop = Platform.OS === 'web' && width >= 768;
    const [nameInput, setNameInput] = useState('');
    const [codeInput, setCodeInput] = useState('#');
    const [descInput, setDescInput] = useState('');
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    const slideAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const showSub = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            (e) => setKeyboardHeight(e.endCoordinates.height)
        );
        const hideSub = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            () => setKeyboardHeight(0)
        );
        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);

    useEffect(() => {
        if (visible) {
            setNameInput('');
            setCodeInput('#');
            setDescInput('');
            setKeyboardHeight(0);
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: Platform.OS !== 'web',
                }),
                Animated.spring(slideAnim, {
                    toValue: 1,
                    tension: 65,
                    friction: 11,
                    useNativeDriver: Platform.OS !== 'web',
                }),
            ]).start();
        } else {
            slideAnim.setValue(0);
            fadeAnim.setValue(0);
        }
    }, [visible, slideAnim, fadeAnim]);

    const handleDismiss = () => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 180,
                useNativeDriver: Platform.OS !== 'web',
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: Platform.OS !== 'web',
            }),
        ]).start(() => {
            onClose();
        });
    };

    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';
    const cardBg = isDark ? '#1C1C1E' : '#FFFFFF';
    const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

    const handleCodeChange = (text: string) => {
        let clean = (text || '').toLowerCase().replace(/#/g, '');
        if (clean.length === 0) {
            setCodeInput('#');
        } else {
            setCodeInput(`#${clean}`);
        }
    };

    const cleanCode = codeInput.replace(/#/g, '').trim();
    const isValid = nameInput.trim().length > 0 && cleanCode.length > 0;

    const handleCreate = () => {
        if (!isValid) return;
        const finalCode = `#${cleanCode.toLowerCase()}`;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onCreate(nameInput.trim(), finalCode, descInput.trim());
        handleDismiss();
    };

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="none"
            onRequestClose={handleDismiss}
            statusBarTranslucent={true}
            navigationBarTranslucent={Platform.OS === 'android'}
        >
            <View style={[styles.overlay, isDesktop && styles.overlayWeb]}>
                <TouchableWithoutFeedback onPress={handleDismiss}>
                    <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
                </TouchableWithoutFeedback>
                <Animated.View
                    style={[
                        styles.container,
                        isDesktop && styles.containerWeb,
                        {
                            backgroundColor: cardBg,
                            borderColor,
                            transform: [
                                {
                                    translateX: slideAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [isDesktop ? 450 : 0, 0],
                                    }),
                                },
                                {
                                    translateY: slideAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [isDesktop ? 0 : 500, 0],
                                    }),
                                },
                            ],
                        },
                    ]}
                >
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: textColor }]}>New Channel</Text>
                        <HeaderCircleButton
                            type="close"
                            onPress={handleDismiss}
                            isDark={isDark}
                            size={32}
                        />
                    </View>

                    <ScrollView
                        style={styles.scrollBody}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        <Text style={[styles.label, { color: textColor }]}>Channel Name</Text>
                        <TextInput
                            style={[styles.input, { color: textColor, borderColor, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)' }]}
                            value={nameInput}
                            onChangeText={setNameInput}
                            placeholder="Channel name"
                            placeholderTextColor={subtextColor}
                        />

                        <Text style={[styles.label, { color: textColor, marginTop: 14 }]}>Channel Code</Text>
                        <TextInput
                            style={[styles.input, { color: textColor, borderColor, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)' }]}
                            value={codeInput}
                            onChangeText={handleCodeChange}
                            placeholder="Channel code"
                            placeholderTextColor={subtextColor}
                            autoCapitalize="none"
                        />
                        <Text style={{ fontSize: 11, color: subtextColor, marginTop: 4, marginBottom: 14 }}>
                            Prefix # is added automatically. Use lowercase code.
                        </Text>

                        <Text style={[styles.label, { color: textColor }]}>Description (Optional)</Text>
                        <TextInput
                            style={[styles.input, { color: textColor, borderColor, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)' }]}
                            value={descInput}
                            onChangeText={setDescInput}
                            placeholder="Channel description"
                            placeholderTextColor={subtextColor}
                        />
                    </ScrollView>

                    {/* Fixed Bottom Action Button */}
                    <View style={[styles.footer, { paddingBottom: Platform.OS === 'web' ? 16 : (keyboardHeight > 0 ? keyboardHeight + 12 : Math.max(insets.bottom, 16) + 12) }]}>
                        <TouchableOpacity
                            style={[
                                styles.saveBtn,
                                {
                                    backgroundColor: FormaBlue[700],
                                    opacity: !isValid ? 0.4 : 1,
                                },
                            ]}
                            disabled={!isValid}
                            onPress={handleCreate}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.saveBtnText}>
                                Create Channel
                            </Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
        paddingHorizontal: Platform.OS === 'ios' ? 8 : 0,
        paddingBottom: Platform.OS === 'ios' ? 8 : 0,
    },
    overlayWeb: {
        padding: 12,
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.45)',
    },
    container: {
        borderRadius: Platform.OS === 'ios' ? 56 : 40,
        borderBottomLeftRadius: Platform.OS === 'ios' ? 56 : 0,
        borderBottomRightRadius: Platform.OS === 'ios' ? 56 : 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: Platform.OS === 'android' ? 16 : 10,
        overflow: 'hidden',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '90%',
    },
    containerWeb: {
        position: 'absolute',
        top: 12,
        bottom: 12,
        right: 12,
        width: 420,
        maxWidth: 'calc(100% - 24px)' as any,
        borderRadius: 24,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        borderWidth: 1,
        height: 'calc(100% - 24px)' as any,
        maxHeight: 'none' as any,
        overflow: 'hidden',
        ...(Platform.OS === 'web' ? ({
            boxShadow: '0 16px 48px rgba(0, 0, 0, 0.18), 0 2px 12px rgba(0, 0, 0, 0.08)',
        } as any) : {}),
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 14,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollBody: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 4,
        paddingBottom: 20,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 6,
    },
    input: {
        borderWidth: 1,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 15,
    },
    footer: {
        paddingHorizontal: 24,
        paddingTop: 12,
    },
    saveBtn: {
        height: 48,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveBtnText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
});
