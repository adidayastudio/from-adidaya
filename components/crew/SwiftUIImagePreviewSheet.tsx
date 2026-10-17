import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';

interface SwiftUIImagePreviewSheetProps {
    isOpened: boolean;
    onClose: () => void;
    imageUrl: string | null;
    title?: string;
}

export const SwiftUIImagePreviewSheet: React.FC<SwiftUIImagePreviewSheetProps> = ({
    isOpened,
    onClose,
    imageUrl,
    title = 'Attachment Preview',
}) => {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';

    return (
        <Modal
            visible={isOpened}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
            statusBarTranslucent={true}
        >
            <View style={styles.previewOverlay}>
                <TouchableOpacity
                    style={StyleSheet.absoluteFillObject}
                    activeOpacity={1}
                    onPress={onClose}
                />
                <View style={[
                    styles.previewSheet,
                    { backgroundColor: isDark ? 'rgba(28,28,30,0.97)' : 'rgba(255,255,255,0.97)' }
                ]}>
                    {/* Header */}
                    <View style={styles.previewHeaderRow}>
                        <Text style={[styles.previewTitle, { color: textColor }]} numberOfLines={1}>{title}</Text>
                        <TouchableOpacity
                            onPress={onClose}
                            style={[styles.previewCloseBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]}
                        >
                            <Ionicons name="close" size={18} color={textColor} />
                        </TouchableOpacity>
                    </View>
                    {/* Image */}
                    <View style={styles.previewImageContainer}>
                        {imageUrl && (
                            <Image
                                source={{ uri: imageUrl }}
                                style={styles.previewImage}
                                resizeMode="contain"
                            />
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    previewOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    previewSheet: {
        height: '85%',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        overflow: 'hidden',
        paddingTop: 16,
    },
    previewHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    previewTitle: {
        fontSize: 17,
        fontWeight: '700',
        flex: 1,
        marginRight: 12,
    },
    previewCloseBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    previewImageContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    previewImage: {
        width: '100%',
        height: '100%',
        borderRadius: 12,
    },
});
