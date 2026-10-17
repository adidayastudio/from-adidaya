import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Linking, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { GlassView } from '@/components/ui/GlassView';
import { FilePreviewResolution } from '@/lib/filePreviewStrategy';

interface FileFallbackCardProps {
    resolution: FilePreviewResolution;
    isDark: boolean;
    onDownload?: () => void;
    onShare?: () => void;
}

export const FileFallbackCard: React.FC<FileFallbackCardProps> = ({
    resolution,
    isDark,
    onDownload,
    onShare,
}) => {
    const textColor = isDark ? '#FFFFFF' : '#0F172A';
    const subTextColor = isDark ? 'rgba(255, 255, 255, 0.6)' : '#64748B';
    const cardBg = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.85)';
    const cardBorder = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)';

    const handleOpenExternal = () => {
        const target = resolution.originalUrl || resolution.previewUrl;
        if (target) {
            Linking.openURL(target).catch(() => {});
        }
    };

    return (
        <View style={styles.container}>
            <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                {/* Hero Icon */}
                <View style={[styles.iconContainer, { backgroundColor: `${resolution.badgeColor}18` }]}>
                    <Ionicons name="document-text" size={44} color={resolution.badgeColor} />
                    <View style={[styles.extensionBadge, { backgroundColor: resolution.badgeColor }]}>
                        <Text style={styles.extensionBadgeText}>{resolution.badgeCode}</Text>
                    </View>
                </View>

                {/* File Title */}
                <Text style={[styles.fileName, { color: textColor }]} numberOfLines={2}>
                    {resolution.displayName}
                </Text>

                {/* File Meta */}
                <View style={styles.metaRow}>
                    {Boolean(resolution.displaySize) && (
                        <Text style={[styles.metaText, { color: subTextColor }]}>
                            {resolution.displaySize}
                        </Text>
                    )}
                    {Boolean(resolution.displaySize && resolution.displayUploadedBy) && (
                        <Text style={[styles.metaDivider, { color: subTextColor }]}>•</Text>
                    )}
                    {Boolean(resolution.displayUploadedBy) && (
                        <Text style={[styles.metaText, { color: subTextColor }]}>
                            {resolution.displayUploadedBy}
                        </Text>
                    )}
                </View>

                {/* Actions */}
                <View style={styles.actionsRow}>
                    {onDownload && (
                        <Pressable
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                onDownload();
                            }}
                            style={({ pressed }) => [
                                styles.actionBtn,
                                { backgroundColor: '#0A84FF', opacity: pressed ? 0.85 : 1 },
                            ]}
                        >
                            <Ionicons name="cloud-download-outline" size={18} color="#FFFFFF" />
                            <Text style={styles.primaryBtnText}>Download</Text>
                        </Pressable>
                    )}

                    {(resolution.originalUrl || resolution.previewUrl) && (
                        <Pressable
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                handleOpenExternal();
                            }}
                            style={({ pressed }) => [
                                styles.actionBtn,
                                styles.secondaryBtn,
                                {
                                    backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                                    opacity: pressed ? 0.85 : 1,
                                },
                            ]}
                        >
                            <Ionicons name="open-outline" size={18} color={textColor} />
                            <Text style={[styles.secondaryBtnText, { color: textColor }]}>Open File</Text>
                        </Pressable>
                    )}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    card: {
        width: '100%',
        maxWidth: 380,
        borderRadius: 24,
        padding: 28,
        alignItems: 'center',
        borderWidth: StyleSheet.hairlineWidth,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
        elevation: 3,
    },
    iconContainer: {
        width: 88,
        height: 88,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        marginBottom: 18,
    },
    extensionBadge: {
        position: 'absolute',
        bottom: -6,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    extensionBadgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    fileName: {
        fontSize: 18,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 8,
        lineHeight: 24,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginBottom: 24,
    },
    metaText: {
        fontSize: 13,
        fontWeight: '500',
    },
    metaDivider: {
        fontSize: 13,
    },
    actionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        width: '100%',
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 14,
        gap: 6,
    },
    secondaryBtn: {
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    primaryBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    secondaryBtnText: {
        fontSize: 14,
        fontWeight: '600',
    },
});
