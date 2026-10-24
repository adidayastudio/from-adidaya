import { AttachmentPreview } from './AttachmentPreview';
import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { FilePreviewResolution } from '@/lib/filePreviewStrategy';
import { FileFallbackCard } from './FileFallbackCard';

let WebView: any = null;
if (Platform.OS !== 'web') {
    try {
        const wvModule = require('react-native-webview');
        WebView = wvModule.WebView || wvModule.default || wvModule;
    } catch {
        WebView = null;
    }
}

interface PdfViewerProps {
    uri?: string;
    resolution: FilePreviewResolution;
    isDark: boolean;
    paddingTop?: number;
    paddingBottom?: number;
    onDownload?: () => void;
    onShare?: () => void;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
    uri,
    resolution,
    isDark,
    paddingTop = 0,
    paddingBottom = 0,
    onDownload,
    onShare,
}) => {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    const targetUri = uri || resolution.previewUrl || resolution.originalUrl;
    const isFetchable =
        Boolean(targetUri) &&
        (targetUri!.startsWith('http://') ||
            targetUri!.startsWith('https://') ||
            targetUri!.startsWith('blob:') ||
            targetUri!.startsWith('data:') ||
            (Platform.OS !== 'web' && targetUri!.startsWith('file://')));

    if (!isFetchable || hasError) {
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

    if (Platform.OS === 'web') {
        return (
            <View style={[styles.container, { backgroundColor: isDark ? '#121214' : '#F2F2F7', paddingTop, paddingBottom }]}>
                <AttachmentPreview url={targetUri!} />
            </View>
        );
    }

    if (WebView) {
        return (
            <View style={[styles.container, { backgroundColor: isDark ? '#121214' : '#F2F2F7', paddingTop, paddingBottom }]}>
                <WebView
                    source={{
                        uri: Platform.OS === 'android' && targetUri!.startsWith('http')
                            ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(targetUri!)}`
                            : targetUri!,
                    }}
                    style={{ flex: 1, width: '100%', backgroundColor: isDark ? '#121214' : '#FFFFFF' }}
                    startInLoadingState={true}
                    scalesPageToFit={true}
                    originWhitelist={['*']}
                    allowFileAccess={true}
                    allowFileAccessFromFileURLs={true}
                    allowUniversalAccessFromFileURLs={true}
                    onError={() => setHasError(true)}
                    onHttpError={() => setHasError(true)}
                    renderLoading={() => (
                        <View style={[StyleSheet.absoluteFill, styles.loadingOverlay, { backgroundColor: isDark ? '#121214' : '#F2F2F7' }]}>
                            <ActivityIndicator size="large" color="#2563EB" />
                        </View>
                    )}
                />
            </View>
        );
    }

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
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
        height: '100%',
        alignSelf: 'stretch',
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




