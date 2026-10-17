import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    StyleSheet,
    TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

export interface AndroidAttachmentSheetProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (action: 'Take Photo' | 'Photo Library' | 'Browse File') => void;
    isDark?: boolean;
}

export function AndroidAttachmentSheet({
    visible,
    onClose,
    onSelect,
    isDark = false,
}: AndroidAttachmentSheetProps) {
    const insets = useSafeAreaInsets();
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';
    const sheetBg = isDark ? '#1C1C1E' : '#FFFFFF';
    const itemBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)';
    const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

    if (!visible) return null;

    const options: {
        id: 'Take Photo' | 'Photo Library' | 'Browse File';
        title: string;
        subtitle: string;
        icon: keyof typeof Ionicons.glyphMap;
        iconColor: string;
        bgColor: string;
    }[] = [
        {
            id: 'Take Photo',
            title: 'Camera',
            subtitle: 'Take a new photo or video',
            icon: 'camera',
            iconColor: '#FF2D55',
            bgColor: isDark ? 'rgba(255, 45, 85, 0.15)' : 'rgba(255, 45, 85, 0.1)',
        },
        {
            id: 'Photo Library',
            title: 'Gallery',
            subtitle: 'Share photos and videos',
            icon: 'images',
            iconColor: '#5856D6',
            bgColor: isDark ? 'rgba(88, 86, 214, 0.15)' : 'rgba(88, 86, 214, 0.1)',
        },
        {
            id: 'Browse File',
            title: 'Document',
            subtitle: 'Share PDFs, docs, sheets, files',
            icon: 'document-text',
            iconColor: '#007AFF',
            bgColor: isDark ? 'rgba(0, 122, 255, 0.15)' : 'rgba(0, 122, 255, 0.1)',
        },
    ];

    const handleItemPress = (action: 'Take Photo' | 'Photo Library' | 'Browse File') => {
        Haptics.selectionAsync();
        onClose();
        setTimeout(() => {
            onSelect(action);
        }, 150);
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.backdrop}>
                <TouchableWithoutFeedback onPress={onClose}>
                    <View style={styles.dismissArea} />
                </TouchableWithoutFeedback>

                <View
                    style={[
                        styles.sheetCard,
                        {
                            backgroundColor: sheetBg,
                            borderColor,
                            paddingBottom: Math.max(insets.bottom + 12, 20),
                        },
                    ]}
                >
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: textColor }]}>Attach Content</Text>
                        <TouchableOpacity
                            onPress={onClose}
                            style={styles.closeBtn}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Ionicons name="close" size={20} color={subtextColor} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.list}>
                        {options.map((opt) => (
                            <TouchableOpacity
                                key={opt.id}
                                style={[
                                    styles.optionItem,
                                    {
                                        backgroundColor: itemBg,
                                        borderColor,
                                    },
                                ]}
                                onPress={() => handleItemPress(opt.id)}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.iconCircle, { backgroundColor: opt.bgColor }]}>
                                    <Ionicons name={opt.icon} size={22} color={opt.iconColor} />
                                </View>
                                <View style={styles.textContainer}>
                                    <Text style={[styles.optTitle, { color: textColor }]}>
                                        {opt.title}
                                    </Text>
                                    <Text style={[styles.optSubtitle, { color: subtextColor }]}>
                                        {opt.subtitle}
                                    </Text>
                                </View>
                                <Ionicons name="chevron-forward" size={18} color={subtextColor} />
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
    },
    dismissArea: {
        flex: 1,
    },
    sheetCard: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: 18,
        paddingTop: 16,
        elevation: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
    },
    closeBtn: {
        padding: 4,
    },
    list: {
        gap: 10,
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 16,
        borderWidth: StyleSheet.hairlineWidth,
        gap: 14,
    },
    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    textContainer: {
        flex: 1,
    },
    optTitle: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 2,
    },
    optSubtitle: {
        fontSize: 12,
    },
});
