import React, { useState } from 'react';
import { View, StyleSheet, Dimensions, ActivityIndicator, Platform, UIManager } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import {
    Host,
    BottomSheet,
    HStack,
    VStack,
    Spacer,
    Text as SwiftUIText,
    Button,
} from '@expo/ui/swift-ui';
import {
    padding,
    frame,
    background,
    ignoreSafeArea,
    cornerRadius,
} from '@expo/ui/swift-ui/modifiers';
import { useTheme } from '@/context/ThemeContext';

let WebView: any = null;
let isWebViewAvailable = false;
try {
    const { WebView: WV } = require('react-native-webview');
    WebView = WV;
    isWebViewAvailable = !!UIManager.getViewManagerConfig('RNCWebView');
} catch (e) {
    // Silently handled
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface PreviewDocItem {
    id: string;
    title: string;
    category: string;
    file_url: string;
    created_at?: string;
    updated_at?: string;
}

export interface DocumentPreviewDrawerProps {
    visible: boolean;
    onClose: () => void;
    document: PreviewDocItem | null;
    onDownload: (url: string, title: string) => void;
    onChange: (category: string) => void;
    onDelete: (docId: string, category: string) => void;
    onRequestSignature?: (doc: PreviewDocItem) => void;
    isDark?: boolean;
}

export const DocumentPreviewDrawer: React.FC<DocumentPreviewDrawerProps> = ({
    visible,
    onClose,
    document,
    onDownload,
    onChange,
    onDelete,
    onRequestSignature,
}) => {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const [imageLoading, setImageLoading] = useState(false);

    const sheetBg = 'clear';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#64748B';

    if (!document) return null;

    const isPdf = /\.pdf(\?.*)?$/i.test(document.file_url);
    const isImage = !isPdf && (
        document.category === 'Pas Foto' ||
        document.category.toLowerCase().includes('foto') ||
        /\.(jpg|jpeg|png|webp|gif|heic|heif)(\?.*)?$/i.test(document.file_url) ||
        !document.file_url.includes('.')
    );

    const formattedDate = document.created_at || document.updated_at
        ? new Date(document.created_at || document.updated_at!).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
          })
        : null;

    return (
        <Host
            style={{ position: 'absolute', width: 0, height: 0 }}
            colorScheme={isDark ? 'dark' : 'light'}
        >
            <BottomSheet
                isOpened={visible}
                presentationDetents={[0.75, 0.95]}
                presentationDragIndicator="hidden"
                onIsOpenedChange={(opened) => {
                    if (!opened) onClose();
                }}
            >
                <VStack
                    spacing={0}
                    modifiers={[
                        ignoreSafeArea({ edges: 'bottom' }),
                        background(sheetBg),
                    ]}
                >
                    {/* Header Bar */}
                    <HStack
                        alignment="center"
                        modifiers={[
                            padding({ top: 16, leading: 20, trailing: 20, bottom: 12 }),
                        ]}
                    >
                        <VStack alignment="leading" spacing={2}>
                            <SwiftUIText size={20} weight="bold" color={textColor}>
                                {document.category}
                            </SwiftUIText>
                            {formattedDate && (
                                <SwiftUIText size={13} color={subtextColor}>
                                    {`Uploaded on ${formattedDate}`}
                                </SwiftUIText>
                            )}
                        </VStack>
                        <Spacer />
                        <Button
                            systemImage="xmark"
                            role="cancel"
                            color="gray"
                            onPress={onClose}
                        />
                    </HStack>

                    {/* Document / Photo Direct Preview Area */}
                    <View style={s.previewContainer}>
                        <View
                            style={[
                                s.previewBox,
                                {
                                    backgroundColor: isDark
                                        ? 'rgba(255, 255, 255, 0.05)'
                                        : 'rgba(0, 0, 0, 0.03)',
                                    borderColor: isDark
                                        ? 'rgba(255, 255, 255, 0.1)'
                                        : 'rgba(0, 0, 0, 0.08)',
                                },
                            ]}
                        >
                            {isPdf && WebView && isWebViewAvailable ? (
                                <WebView
                                    source={{ uri: document.file_url }}
                                    style={s.webview}
                                    scalesPageToFit={true}
                                />
                            ) : isImage ? (
                                <Image
                                    source={{ uri: document.file_url }}
                                    style={s.imagePreview}
                                    contentFit="contain"
                                    transition={200}
                                    onLoadStart={() => setImageLoading(true)}
                                    onLoadEnd={() => setImageLoading(false)}
                                />
                            ) : (
                                <View style={s.docFallback}>
                                    <SwiftUIText size={48}>📄</SwiftUIText>
                                    <SwiftUIText size={16} weight="semibold" color={textColor}>
                                        {document.category}
                                    </SwiftUIText>
                                    <SwiftUIText size={13} color={subtextColor}>
                                        Document File
                                    </SwiftUIText>
                                </View>
                            )}
                            {imageLoading && (
                                <View style={s.loadingOverlay}>
                                    <ActivityIndicator size="small" color="#007AFF" />
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Sleek Finance-Style Action Bar at Bottom */}
                    <HStack
                        spacing={10}
                        alignment="center"
                        modifiers={[
                            padding({ top: 12, leading: 20, trailing: 20, bottom: Platform.OS === 'ios' ? 34 : 20 }),
                            frame({ maxWidth: Infinity }),
                        ]}
                    >
                        {/* Request Signature Button */}
                        <Button
                            systemImage="signature"
                            variant="glass"
                            color="#34C759"
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                onClose();
                                if (onRequestSignature) onRequestSignature(document);
                            }}
                            modifiers={[
                                frame({ width: 50, height: 44 }),
                                cornerRadius(12),
                            ]}
                        />

                        {/* Delete Button (Red / Destructive) */}
                        <Button
                            systemImage="trash"
                            role="destructive"
                            variant="glass"
                            color="red"
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                onClose();
                                onDelete(document.id, document.category);
                            }}
                            modifiers={[
                                frame({ width: 50, height: 44 }),
                                cornerRadius(12),
                            ]}
                        />

                        {/* Change / Replace File */}
                        <Button
                            systemImage="arrow.triangle.2.circlepath"
                            variant="bordered"
                            color="#007AFF"
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                onClose();
                                onChange(document.category);
                            }}
                            modifiers={[
                                frame({ maxWidth: Infinity, height: 44 }),
                                cornerRadius(12),
                            ]}
                        >
                            <SwiftUIText size={15} weight="semibold" color="#007AFF">
                                Change
                            </SwiftUIText>
                        </Button>

                        {/* Download / Save File */}
                        <Button
                            systemImage="square.and.arrow.down"
                            variant="borderedProminent"
                            color="#007AFF"
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                onDownload(document.file_url, document.title || document.category);
                            }}
                            modifiers={[
                                frame({ maxWidth: Infinity, height: 44 }),
                                cornerRadius(12),
                            ]}
                        >
                            <SwiftUIText size={15} weight="semibold" color="#FFFFFF">
                                Download
                            </SwiftUIText>
                        </Button>
                    </HStack>
                </VStack>
            </BottomSheet>
        </Host>
    );
};

const s = StyleSheet.create({
    previewContainer: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT * 0.50,
        paddingHorizontal: 20,
        paddingVertical: 6,
        justifyContent: 'center',
        alignItems: 'center',
    },
    previewBox: {
        width: '100%',
        height: '100%',
        borderRadius: 20,
        borderWidth: 1,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    imagePreview: {
        width: '100%',
        height: '100%',
    },
    webview: {
        width: '100%',
        height: '100%',
        backgroundColor: 'transparent',
    },
    docFallback: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.1)',
    },
});

export default DocumentPreviewDrawer;
