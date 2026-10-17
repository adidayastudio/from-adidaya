import React, { useState, useMemo } from 'react';
import { View, Image, StyleSheet, Dimensions, Share, ActionSheetIOS } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';
import {
    Host,
    BottomSheet,
    VStack,
    HStack,
    Spacer,
    Button,
    Text as SwiftUIText,
} from '@expo/ui/swift-ui';
import {
    padding,
    background,
    ignoreSafeArea,
} from '@expo/ui/swift-ui/modifiers';
import { useTheme } from '@/context/ThemeContext';
import { AnnouncementDocument } from '@/lib/announcements';
import { ForwardToChatModal, ForwardPayload } from '@/components/chat/ForwardToChatModal';
import { copyToClipboard, saveOrDownloadImage, triggerSystemShare } from '@/lib/shareActions';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SwiftUIDocumentPreviewSheetProps {
    isOpened: boolean;
    onClose: () => void;
    document: AnnouncementDocument | null;
}

export function SwiftUIDocumentPreviewSheet({
    isOpened,
    onClose,
    document,
}: SwiftUIDocumentPreviewSheetProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const sheetBg = 'clear';

    const [forwardModalVisible, setForwardModalVisible] = useState(false);
    const [forwardPayload, setForwardPayload] = useState<ForwardPayload | null>(null);

    if (!document) return null;

    const isPdf = document.name.toLowerCase().endsWith('.pdf') || document.type === 'pdf';
    const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(document.name) || document.type === 'image';
    const isCoverBanner = document.id === 'cover-banner' || document.size === 'Cover Image';
    const imageUrl = document.url;

    const handleShare = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        let options: string[] = [];
        if (isCoverBanner) {
            options = ['Cancel', 'Save Image', 'Share to Chat', 'Copy Link', 'Share...'];
        } else if (isImage) {
            options = ['Cancel', 'Save Image', 'Share to Chat', 'Copy Link', ...(imageUrl ? ['Open in Browser'] : []), 'Share...'];
        } else {
            options = ['Cancel', 'Download File', 'Share to Chat', 'Copy Link', ...(imageUrl ? ['Open in Browser'] : []), 'Share...'];
        }

        ActionSheetIOS.showActionSheetWithOptions(
            {
                options,
                cancelButtonIndex: 0,
                userInterfaceStyle: isDark ? 'dark' : 'light',
            },
            (buttonIndex) => {
                if (buttonIndex === 0) return;
                const chosen = options[buttonIndex];
                if (chosen === 'Save Image' || chosen === 'Download File') {
                    if (imageUrl) saveOrDownloadImage(imageUrl, document.name);
                } else if (chosen === 'Share to Chat') {
                    if (isImage && imageUrl) {
                        setForwardPayload({
                            mediaUrl: imageUrl,
                            title: document.name,
                        });
                    } else {
                        setForwardPayload({
                            attachment: {
                                name: document.name,
                                size: document.size || '',
                                type: isPdf ? 'pdf' : 'xlsx',
                                url: imageUrl,
                            },
                            title: document.name,
                        });
                    }
                    setForwardModalVisible(true);
                } else if (chosen === 'Copy Link') {
                    if (imageUrl) copyToClipboard(imageUrl, 'Link copied');
                } else if (chosen === 'Open in Browser') {
                    handleOpenExternal();
                } else if (chosen === 'Share...') {
                    triggerSystemShare({
                        title: document.name,
                        url: imageUrl,
                    });
                }
            }
        );
    };

    const handleOpenExternal = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (document.url) {
            try {
                await WebBrowser.openBrowserAsync(document.url);
            } catch (e) {
                console.warn(e);
            }
        }
    };

    return (
        <>
            <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
                <BottomSheet
                    isOpened={isOpened}
                    presentationDetents={[0.75, 0.95]}
                    presentationDragIndicator="hidden"
                    onIsOpenedChange={(opened) => {
                        if (!opened) onClose();
                    }}
                >
                    <VStack spacing={0} modifiers={[
                        ignoreSafeArea({ edges: 'bottom' }),
                        background(sheetBg)
                    ]}>
                        {/* Header Bar */}
                        <HStack alignment="center" modifiers={[padding({ top: 18, leading: 20, trailing: 20, bottom: 12 })]}>
                            <VStack alignment="leading" spacing={2}>
                                <SwiftUIText size={17} weight="bold" color={textColor}>
                                    {document.name}
                                </SwiftUIText>
                                {Boolean(document.size && document.id !== 'cover-banner' && document.size !== 'Cover Image') ? (
                                    <SwiftUIText size={12} color={isDark ? '#A1A1AA' : '#8E8E93'}>
                                        {document.size} • {isImage ? 'Photo Attachment' : isPdf ? 'PDF Document' : 'Attachment'}
                                    </SwiftUIText>
                                ) : null}
                            </VStack>
                            <Spacer />
                            <HStack spacing={18}>
                                <Button
                                    systemImage="square.and.arrow.up"
                                    color="gray"
                                    onPress={handleShare}
                                />
                                <Button
                                    systemImage="xmark"
                                    role="cancel"
                                    color="gray"
                                    onPress={onClose}
                                />
                            </HStack>
                        </HStack>

                        {/* Embedded Preview Inside Native BottomSheet Drawer */}
                        <View style={[styles.previewWrapper, isDark ? styles.previewDark : styles.previewLight]}>
                            {isImage && imageUrl ? (
                                <Image
                                    source={{ uri: imageUrl }}
                                    style={styles.previewImage}
                                    resizeMode="contain"
                                />
                            ) : (
                                <View style={styles.docPlaceholderBox}>
                                    <Image
                                        source={{ uri: 'https://images.unsplash.com/photo-1568667256549-094345857637?w=800&auto=format&fit=crop&q=80' }}
                                        style={styles.pdfPaperPreview}
                                        resizeMode="cover"
                                    />
                                </View>
                            )}
                        </View>
                    </VStack>
                </BottomSheet>
            </Host>

            <ForwardToChatModal
                visible={forwardModalVisible}
                payload={forwardPayload}
                onClose={() => setForwardModalVisible(false)}
            />
        </>
    );
}

const styles = StyleSheet.create({
    previewWrapper: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT * 0.65,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
        paddingBottom: 24,
    },
    previewLight: {
        backgroundColor: 'transparent',
    },
    previewDark: {
        backgroundColor: 'transparent',
    },
    previewImage: {
        width: SCREEN_WIDTH - 32,
        height: '100%',
        borderRadius: 16,
    },
    docPlaceholderBox: {
        width: SCREEN_WIDTH - 32,
        height: '100%',
        borderRadius: 16,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
    },
    pdfPaperPreview: {
        width: '100%',
        height: '100%',
        borderRadius: 16,
    },
});
