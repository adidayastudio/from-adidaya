import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ZoomableImage } from '@/components/ui/ZoomableImage';
import { GlassView } from '@/components/ui/GlassView';
import { FilePreviewResolution } from '@/lib/filePreviewStrategy';
import { FileFallbackCard } from './FileFallbackCard';

interface MediaViewerProps {
    uri?: string;
    type: 'image' | 'video' | 'audio';
    resolution: FilePreviewResolution;
    isDark: boolean;
    paddingTop?: number;
    paddingBottom?: number;
    onDownload?: () => void;
    onShare?: () => void;
}

export const MediaViewer: React.FC<MediaViewerProps> = ({
    uri,
    type,
    resolution,
    isDark,
    paddingTop = 0,
    paddingBottom = 0,
    onDownload,
    onShare,
}) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const targetUri = uri || resolution.previewUrl || resolution.originalUrl;
    const textColor = isDark ? '#FFFFFF' : '#0F172A';
    const subTextColor = isDark ? 'rgba(255, 255, 255, 0.6)' : '#64748B';

    if (!targetUri) {
        return (
            <FileFallbackCard
                resolution={resolution}
                isDark={isDark}
                onDownload={onDownload}
                onShare={onShare}
            />
        );
    }

    if (type === 'image') {
        return (
            <View style={[styles.container, { paddingTop, paddingBottom }]}>
                <ZoomableImage uri={targetUri} isDark={isDark} />
            </View>
        );
    }

    if (type === 'video') {
        if (Platform.OS === 'web') {
            return (
                <View style={[styles.container, styles.center, { paddingTop, paddingBottom }]}>
                    <video
                        src={targetUri}
                        controls
                        style={{
                            maxWidth: '100%',
                            maxHeight: '100%',
                            borderRadius: 12,
                            outline: 'none',
                        }}
                    />
                </View>
            );
        }
    }

    if (type === 'audio') {
        return (
            <View style={[styles.container, styles.center, { paddingHorizontal: 24, paddingTop, paddingBottom }]}>
                <GlassView
                    style={[
                        styles.audioCard,
                        {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.85)',
                            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                        },
                    ]}
                >
                    <View style={styles.audioIconWrapper}>
                        <Ionicons name="musical-notes" size={36} color="#0A84FF" />
                    </View>
                    <Text style={[styles.audioTitle, { color: textColor }]} numberOfLines={1}>
                        {resolution.displayName}
                    </Text>

                    <TouchableOpacity
                        onPress={() => {
                            Haptics.selectionAsync();
                            setIsPlaying(!isPlaying);
                        }}
                        style={styles.playBtn}
                    >
                        <Ionicons name={isPlaying ? 'pause' : 'play'} size={28} color="#FFFFFF" style={{ marginLeft: isPlaying ? 0 : 3 }} />
                    </TouchableOpacity>
                </GlassView>
            </View>
        );
    }

    return (
        <FileFallbackCard
            resolution={resolution}
            isDark={isDark}
            onDownload={onDownload}
            onShare={onShare}
        />
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    center: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    audioCard: {
        width: '100%',
        maxWidth: 360,
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        borderWidth: StyleSheet.hairlineWidth,
    },
    audioIconWrapper: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: 'rgba(10, 132, 255, 0.12)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    audioTitle: {
        fontSize: 16,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 20,
    },
    playBtn: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#0A84FF',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#0A84FF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 4,
    },
});
