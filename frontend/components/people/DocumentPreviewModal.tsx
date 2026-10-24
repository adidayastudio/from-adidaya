import { AttachmentPreview } from '../file-preview/AttachmentPreview';
import React from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    ActivityIndicator,
    Platform,
    SafeAreaView,
} from 'react-native';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { GlassView } from '@/components/ui/GlassView';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { BouncyGlassButton } from '@/components/ui/BouncyGlassButton';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface PreviewDocItem {
    id: string;
    title: string;
    category: string;
    file_url: string;
    created_at?: string;
    updated_at?: string;
}

interface DocumentPreviewModalProps {
    visible: boolean;
    document: PreviewDocItem | null;
    onClose: () => void;
    onDownload: (url: string, title: string) => void;
    onChange: (category: string) => void;
    onDelete: (docId: string, category: string) => void;
    onRequestSignature?: (doc: PreviewDocItem) => void;
    isDark?: boolean;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
    visible,
    document,
    onClose,
    onDownload,
    onChange,
    onDelete,
    onRequestSignature,
    isDark = false,
}) => {
    if (!document) return null;

    const isImage =
        document.category === 'Pas Foto' ||
        /\.(jpg|jpeg|png|webp|gif|heic)(\?.*)?$/i.test(document.file_url);

    const handleFullView = async () => {
        if (!document.file_url) return;
        try {
            await WebBrowser.openBrowserAsync(document.file_url);
        } catch {
            Linking.openURL(document.file_url);
        }
    };

    const textColor = isDark ? '#FFF' : '#000';
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';
    const cardBg = isDark ? 'rgba(30, 30, 35, 0.92)' : 'rgba(255, 255, 255, 0.96)';

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={s.backdrop}>
                {/* Blur Background */}
                <BlurView
                    intensity={isDark ? 40 : 60}
                    tint={isDark ? 'dark' : 'light'}
                    style={StyleSheet.absoluteFill}
                />
                <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    activeOpacity={1}
                    onPress={onClose}
                />

                <SafeAreaView style={s.safeArea} pointerEvents="box-none">
                    <View style={[s.modalCard, { backgroundColor: cardBg, borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)' }]}>
                        {/* Header */}
                        <View style={s.header}>
                            <View style={{ flex: 1 }}>
                                <View style={s.badgeRow}>
                                    <View style={[s.statusBadge, { backgroundColor: '#34C75918' }]}>
                                        <PlatformIcon name="checkmark.circle.fill" size={12} tintColor="#34C759" style={{ marginRight: 4 }} />
                                        <Text style={s.statusBadgeText}>Uploaded Document</Text>
                                    </View>
                                </View>
                                <Text style={[s.title, { color: textColor }]} numberOfLines={1}>
                                    {document.category}
                                </Text>
                                <Text style={[s.subTitle, { color: subtextColor }]} numberOfLines={1}>
                                    {document.title || 'Official File'}
                                </Text>
                            </View>

                            <TouchableOpacity
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    onClose();
                                }}
                                style={[s.closeButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]}
                                activeOpacity={0.7}
                            >
                                <PlatformIcon name="xmark" size={14} tintColor={isDark ? '#FFF' : '#3C3C43'} />
                            </TouchableOpacity>
                        </View>

                        {/* Preview Content Area */}
                        <View style={s.previewContainer}>
                            {Platform.OS === 'web' && document.file_url ? (
                                <AttachmentPreview url={document.file_url} />
                            ) : isImage ? (
                                <View style={s.imageWrapper}>
                                    <Image
                                        source={{ uri: document.file_url }}
                                        style={s.imagePreview}
                                        contentFit="contain"
                                        transition={300}
                                    />
                                </View>
                            ) : (
                                <TouchableOpacity
                                    style={[s.docFileCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}
                                    onPress={handleFullView}
                                    activeOpacity={0.8}
                                >
                                    <View style={s.docIconCircle}>
                                        <PlatformIcon name="doc.text.fill" size={36} tintColor="#007AFF" />
                                    </View>
                                    <Text style={[s.docFileName, { color: textColor }]} numberOfLines={2}>
                                        {document.title || `${document.category}.pdf`}
                                    </Text>
                                    <View style={s.tapToViewRow}>
                                        <PlatformIcon name="eye.fill" size={14} tintColor="#007AFF" style={{ marginRight: 6 }} />
                                        <Text style={s.tapToViewText}>Tap to Open Full Document</Text>
                                    </View>
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Document Metadata */}
                        <View style={s.metaRow}>
                            <PlatformIcon name="clock" size={12} tintColor={subtextColor} style={{ marginRight: 4 }} />
                            <Text style={[s.metaText, { color: subtextColor }]}>
                                Uploaded on {new Date(document.created_at || document.updated_at || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </Text>
                        </View>

                        {/* Action Buttons */}
                        <View style={s.actionsContainer}>
                            {/* Request Signature Button */}
                            <TouchableOpacity
                                style={[s.actionButton, { backgroundColor: isDark ? 'rgba(52, 199, 89, 0.15)' : 'rgba(52, 199, 89, 0.1)' }]}
                                onPress={async () => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                    if (onRequestSignature) {
                                        onRequestSignature(document);
                                    }
                                }}
                                activeOpacity={0.7}
                            >
                                <PlatformIcon name="signature" size={18} tintColor="#34C759" style={{ marginBottom: 4 }} />
                                <Text style={[s.actionButtonText, { color: '#34C759' }]}>Sign</Text>
                            </TouchableOpacity>

                            {/* Download Button */}
                            <TouchableOpacity
                                style={[s.actionButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    onDownload(document.file_url, document.title || document.category);
                                }}
                                activeOpacity={0.7}
                            >
                                <PlatformIcon name="arrow.down.circle" size={18} tintColor={isDark ? '#FFF' : '#000'} style={{ marginBottom: 4 }} />
                                <Text style={[s.actionButtonText, { color: textColor }]}>Download</Text>
                            </TouchableOpacity>

                            {/* Change / Replace Button */}
                            <TouchableOpacity
                                style={[s.actionButton, { backgroundColor: isDark ? 'rgba(0, 122, 255, 0.15)' : 'rgba(0, 122, 255, 0.1)' }]}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    onClose();
                                    onChange(document.category);
                                }}
                                activeOpacity={0.7}
                            >
                                <PlatformIcon name="arrow.triangle.2.circlepath" size={18} tintColor="#007AFF" style={{ marginBottom: 4 }} />
                                <Text style={[s.actionButtonText, { color: '#007AFF' }]}>Change</Text>
                            </TouchableOpacity>

                            {/* Delete Button */}
                            <TouchableOpacity
                                style={[s.actionButton, { backgroundColor: isDark ? 'rgba(255, 69, 58, 0.15)' : 'rgba(255, 59, 48, 0.1)' }]}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                    onClose();
                                    onDelete(document.id, document.category);
                                }}
                                activeOpacity={0.7}
                            >
                                <PlatformIcon name="trash" size={18} tintColor="#FF3B30" style={{ marginBottom: 4 }} />
                                <Text style={[s.actionButtonText, { color: '#FF3B30' }]}>Delete</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </SafeAreaView>
            </View>
        </Modal>
    );
};

const s = StyleSheet.create({
    backdrop: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    safeArea: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    modalCard: {
        width: Math.min(SCREEN_WIDTH - 32, 520),
        maxHeight: SCREEN_HEIGHT * 0.88,
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.25,
        shadowRadius: 24,
        elevation: 10,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    badgeRow: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
    },
    statusBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#34C759',
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    subTitle: {
        fontSize: 13,
        marginTop: 2,
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 12,
    },
    previewContainer: {
        width: '100%',
        height: 340,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: 'rgba(0,0,0,0.04)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageWrapper: {
        width: '100%',
        height: '100%',
        backgroundColor: '#000',
        borderRadius: 16,
        overflow: 'hidden',
    },
    imagePreview: {
        width: '100%',
        height: '100%',
    },
    docFileCard: {
        width: '100%',
        height: '100%',
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
    },
    docIconCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: 'rgba(0, 122, 255, 0.12)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    docFileName: {
        fontSize: 15,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 8,
    },
    tapToViewRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 122, 255, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    tapToViewText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#007AFF',
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 12,
        marginBottom: 16,
    },
    metaText: {
        fontSize: 12,
        fontWeight: '500',
    },
    actionsContainer: {
        flexDirection: 'row',
        gap: 10,
    },
    actionButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionButtonText: {
        fontSize: 12,
        fontWeight: '600',
    },
});
