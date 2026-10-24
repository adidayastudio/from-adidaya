import { AttachmentPreview } from '../file-preview/AttachmentPreview';
import React, { useState, useMemo } from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    Share,
    Platform,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import ContextMenu, { ContextMenuAction } from '@/components/ui/PlatformContextMenu';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/theme';
import { AnnouncementDocument } from '@/lib/announcements';
import { ForwardToChatModal, ForwardPayload } from '@/components/chat/ForwardToChatModal';
import { copyToClipboard, saveOrDownloadImage, triggerSystemShare } from '@/lib/shareActions';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SwiftUIDocumentPreviewSheetProps {
    isOpened?: boolean;
    visible?: boolean;
    onClose: () => void;
    document: AnnouncementDocument | null;
}

export function SwiftUIDocumentPreviewSheet({
    isOpened,
    visible,
    onClose,
    document,
}: SwiftUIDocumentPreviewSheetProps) {
    const isVisible = isOpened ?? visible ?? !!document;
    const insets = useSafeAreaInsets();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';

    const [forwardModalVisible, setForwardModalVisible] = useState(false);
    const [forwardPayload, setForwardPayload] = useState<ForwardPayload | null>(null);

    if (!document) return null;

    const isPdf = document.name.toLowerCase().endsWith('.pdf') || document.type === 'pdf';
    const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(document.name) || document.type === 'image';
    const isCoverBanner = document.id === 'cover-banner' || document.size === 'Cover Image';
    const fileUrl = document.url;

    const menuActions: ContextMenuAction[] = useMemo(() => {
        if (isCoverBanner) {
            return [
                { title: 'Save Image', systemIcon: 'arrow.down.circle' },
                { title: 'Share to Chat', systemIcon: 'paperplane' },
                { title: 'Copy Link', systemIcon: 'link' },
                { title: 'Share...', systemIcon: 'square.and.arrow.up' },
            ];
        }
        if (isImage) {
            return [
                { title: 'Save Image', systemIcon: 'arrow.down.circle' },
                { title: 'Share to Chat', systemIcon: 'paperplane' },
                { title: 'Copy Link', systemIcon: 'link' },
                ...(fileUrl ? [{ title: 'Open in Browser', systemIcon: 'safari' }] : []),
                { title: 'Share...', systemIcon: 'square.and.arrow.up' },
            ];
        }
        return [
            { title: 'Download File', systemIcon: 'arrow.down.circle' },
            { title: 'Share to Chat', systemIcon: 'paperplane' },
            { title: 'Copy Link', systemIcon: 'link' },
            ...(fileUrl ? [{ title: 'Open in Browser', systemIcon: 'safari' }] : []),
            { title: 'Share...', systemIcon: 'square.and.arrow.up' },
        ];
    }, [isCoverBanner, isImage, fileUrl]);

    const handleMenuPress = (actionTitle: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (actionTitle === 'Save Image' || actionTitle === 'Download File') {
            if (fileUrl) {
                saveOrDownloadImage(fileUrl, document.name);
            }
        } else if (actionTitle === 'Share to Chat') {
            if (isImage && fileUrl) {
                setForwardPayload({
                    mediaUrl: fileUrl,
                    title: document.name,
                });
            } else {
                setForwardPayload({
                    attachment: {
                        name: document.name,
                        size: document.size || '',
                        type: isPdf ? 'pdf' : 'xlsx',
                        url: fileUrl,
                    },
                    title: document.name,
                });
            }
            setForwardModalVisible(true);
        } else if (actionTitle === 'Copy Link') {
            if (fileUrl) {
                copyToClipboard(fileUrl, 'Link copied');
            }
        } else if (actionTitle === 'Open in Browser') {
            handleOpenExternal();
        } else if (actionTitle === 'Share...') {
            triggerSystemShare({
                title: document.name,
                url: fileUrl,
            });
        }
    };

    const handleOpenExternal = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (fileUrl) {
            try {
                await WebBrowser.openBrowserAsync(fileUrl);
            } catch (e) {
                console.warn(e);
            }
        }
    };

    return (
        <Modal
            visible={isVisible}
            transparent
            animationType="slide"
            statusBarTranslucent
            navigationBarTranslucent
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <TouchableOpacity
                    style={styles.backdrop}
                    activeOpacity={1}
                    onPress={onClose}
                />

                <View style={[
                    styles.sheetContainer,
                    {
                        backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                        paddingBottom: Math.max(insets.bottom, 16) + 8,
                    }
                ]}>
                    {/* Top Bar */}
                    <View style={styles.header}>
                        <View style={{ flex: 1, paddingRight: 10 }}>
                            <Text style={[styles.title, { color: textColor }]} numberOfLines={1}>
                                {document.name}
                            </Text>
                            {Boolean(document.size && document.id !== 'cover-banner' && document.size !== 'Cover Image') && (
                                <Text style={[styles.subtitle, { color: subtextColor }]}>
                                    {document.size} • {isImage ? 'Photo Attachment' : isPdf ? 'PDF Document' : 'Attachment'}
                                </Text>
                            )}
                        </View>

                        <View style={styles.headerActions}>
                            <ContextMenu
                                actions={menuActions}
                                onPress={(e) => handleMenuPress(menuActions[e.nativeEvent.index]?.title)}
                                dropdownMenuMode={true}
                            >
                                <TouchableOpacity
                                    onPress={() => handleMenuPress(menuActions[0]?.title)}
                                    style={[styles.iconCircle, isDark ? styles.iconCircleDark : styles.iconCircleLight]}
                                    activeOpacity={0.7}
                                >
                                    <PlatformIcon name="square.and.arrow.up" size={15} tintColor={isDark ? '#A1A1AA' : '#64748B'} />
                                </TouchableOpacity>
                            </ContextMenu>

                            <TouchableOpacity
                                onPress={onClose}
                                style={[styles.iconCircle, isDark ? styles.iconCircleDark : styles.iconCircleLight]}
                                activeOpacity={0.7}
                            >
                                <PlatformIcon name="xmark" size={14} tintColor={isDark ? '#A1A1AA' : '#64748B'} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Preview Content */}
                    <View style={[styles.previewBody, isDark ? styles.previewBodyDark : styles.previewBodyLight]}>
                        {Platform.OS === 'web' && fileUrl ? (
                            <AttachmentPreview url={fileUrl} />
                        ) : isImage && fileUrl ? (
                            <Image
                                source={{ uri: fileUrl }}
                                style={styles.previewImage}
                                contentFit="contain"
                                transition={200}
                            />
                        ) : isPdf ? (
                            <View style={styles.pdfPreviewBox}>
                                <View style={styles.pdfIconCircle}>
                                    <PlatformIcon name="doc.fill" size={40} tintColor="#FF3B30" />
                                </View>
                                <Text style={[styles.pdfTitle, { color: textColor }]}>
                                    {document.name}
                                </Text>
                                <Text style={[styles.pdfSize, { color: subtextColor }]}>
                                    {document.size || 'Portable Document Format'}
                                </Text>

                                <TouchableOpacity
                                    onPress={handleOpenExternal}
                                    style={styles.openPdfBtn}
                                    activeOpacity={0.8}
                                >
                                    <PlatformIcon name="arrow.up.right.square" size={16} tintColor="#FFFFFF" />
                                    <Text style={styles.openPdfBtnText}>Open Document</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.genericPreviewBox}>
                                <PlatformIcon name="doc.text.fill" size={44} tintColor="#007AFF" />
                                <Text style={[styles.pdfTitle, { color: textColor, marginTop: 12 }]}>
                                    {document.name}
                                </Text>
                                {fileUrl && (
                                    <TouchableOpacity
                                        onPress={handleOpenExternal}
                                        style={styles.openPdfBtn}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={styles.openPdfBtnText}>Open File</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}
                    </View>
                </View>
            </View>

            <ForwardToChatModal
                visible={forwardModalVisible}
                payload={forwardPayload}
                onClose={() => setForwardModalVisible(false)}
            />
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    sheetContainer: {
        width: '100%',
        maxHeight: SCREEN_HEIGHT * 0.88,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 18,
        paddingBottom: 14,
    },
    title: {
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    subtitle: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 2,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    iconCircle: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconCircleLight: {
        backgroundColor: 'rgba(0,0,0,0.05)',
    },
    iconCircleDark: {
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    previewBody: {
        marginHorizontal: 16,
        marginBottom: 12,
        height: SCREEN_HEIGHT * 0.55,
        borderRadius: 18,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
    },
    previewBodyLight: {
        backgroundColor: '#F2F2F7',
    },
    previewBodyDark: {
        backgroundColor: '#27272A',
    },
    previewImage: {
        width: '100%',
        height: '100%',
    },
    pdfPreviewBox: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        gap: 8,
    },
    pdfIconCircle: {
        width: 72,
        height: 72,
        borderRadius: 22,
        backgroundColor: 'rgba(255,59,48,0.12)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 6,
    },
    pdfTitle: {
        fontSize: 15,
        fontWeight: '700',
        textAlign: 'center',
    },
    pdfSize: {
        fontSize: 13,
        fontWeight: '500',
    },
    openPdfBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        backgroundColor: '#007AFF',
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 12,
        marginTop: 10,
    },
    openPdfBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    genericPreviewBox: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
});
