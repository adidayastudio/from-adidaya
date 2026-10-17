import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { FilePreviewResolution } from '@/lib/filePreviewStrategy';
import { FileFallbackCard } from './FileFallbackCard';

interface DocxViewerProps {
    uri?: string;
    resolution: FilePreviewResolution;
    isDark: boolean;
    paddingTop?: number;
    paddingBottom?: number;
    onDownload?: () => void;
    onShare?: () => void;
}

export const DocxViewer: React.FC<DocxViewerProps> = ({
    uri,
    resolution,
    isDark,
    paddingTop = 0,
    paddingBottom = 0,
    onDownload,
    onShare,
}) => {
    const docxContainerRef = useRef<HTMLDivElement | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [useFallbackMemo, setUseFallbackMemo] = useState(false);

    const targetUri = uri || resolution.previewUrl || resolution.originalUrl;
    const isFetchable =
        Boolean(targetUri) &&
        (targetUri.startsWith('http://') ||
            targetUri.startsWith('https://') ||
            targetUri.startsWith('blob:') ||
            targetUri.startsWith('data:'));

    useEffect(() => {
        if (Platform.OS !== 'web' || !isFetchable) {
            setIsLoading(false);
            setUseFallbackMemo(true);
            return;
        }

        let isCancelled = false;
        setIsLoading(true);

        const timer = setTimeout(() => {
            if (!isCancelled) {
                setIsLoading(false);
            }
        }, 1200);

        const renderDocx = async () => {
            try {
                const docxPreview = await import('docx-preview');
                const response = await fetch(targetUri!);
                if (!response.ok) throw new Error('Failed to fetch docx file');
                const blob = await response.blob();
                const arrayBuffer = await blob.arrayBuffer();

                if (isCancelled || !docxContainerRef.current) return;

                docxContainerRef.current.innerHTML = '';
                await docxPreview.renderAsync(arrayBuffer, docxContainerRef.current, undefined, {
                    className: 'docx',
                    inWrapper: true,
                    ignoreWidth: false,
                    ignoreHeight: false,
                    ignoreFonts: false,
                    breakPages: true,
                    useBase64URL: true,
                    useMathMLPolyfill: true,
                });
                setIsLoading(false);
            } catch (err) {
                console.warn('[DocxViewer] binary parse failed, switching to rich memo layout:', err);
                if (!isCancelled) {
                    setIsLoading(false);
                    setUseFallbackMemo(true);
                }
            }
        };

        renderDocx();

        return () => {
            isCancelled = true;
            clearTimeout(timer);
        };
    }, [targetUri, isFetchable]);

    if (useFallbackMemo || Platform.OS !== 'web' || !isFetchable) {
        return (
            <View style={[styles.container, { paddingTop, paddingBottom }]}>
                <FileFallbackCard
                    resolution={resolution}
                    isDark={isDark}
                    onDownload={onDownload}
                    onShare={onShare}
                />
            </View>
        );
    }

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: isDark ? '#121214' : '#E5E5EA',
                    paddingTop,
                    paddingBottom,
                },
            ]}
        >
            {isLoading && (
                <View style={[StyleSheet.absoluteFill, styles.loadingOverlay, { backgroundColor: isDark ? '#121214' : '#F2F2F7', zIndex: 5 }]}>
                    <ActivityIndicator size="large" color="#2563EB" />
                    <Text style={[styles.loadingText, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                        Loading document {resolution.displayName}…
                    </Text>
                </View>
            )}
            <div
                ref={docxContainerRef as any}
                style={{
                    width: '100%',
                    minHeight: 'calc(100vh - 64px)',
                    padding: '24px 16px',
                    backgroundColor: isDark ? '#121214' : '#E5E5EA',
                    boxSizing: 'border-box',
                    overflowY: 'auto',
                }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    loadingOverlay: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        fontWeight: '600',
    },
});


