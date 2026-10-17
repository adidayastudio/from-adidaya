import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { AnnouncementTemplateKey, ANNOUNCEMENT_TEMPLATES } from '@/lib/announcements';

interface AnnouncementCoverPlaceholderProps {
    template: AnnouncementTemplateKey;
    isDark?: boolean;
    height?: number;
    title?: string;
    showBadge?: boolean;
}

export function AnnouncementCoverPlaceholder({
    template,
    isDark = false,
    height = 140,
    title,
    showBadge = true,
}: AnnouncementCoverPlaceholderProps) {
    const config = ANNOUNCEMENT_TEMPLATES[template] || ANNOUNCEMENT_TEMPLATES.general;

    const bgColors = isDark ? config.bgGradientDark : config.bgGradientLight;

    return (
        <View style={[styles.container, { height }]}>
            <LinearGradient
                colors={bgColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
            />

            {/* Ambient Geometric Decorative Blobs (Inspired by 3D modern shapes) */}
            <View style={[
                styles.decorBlob1,
                {
                    backgroundColor: `${config.accent}1F`,
                    borderColor: `${config.accent}33`,
                }
            ]} />
            <View style={[
                styles.decorBlob2,
                {
                    backgroundColor: `${config.accentEnd}18`,
                    borderColor: `${config.accentEnd}26`,
                }
            ]} />
            <View style={[
                styles.decorCircle,
                {
                    borderColor: `${config.accent}2A`,
                }
            ]} />

            {/* Center Icon & Branding */}
            <View style={styles.centerContent}>
                <View style={[
                    styles.iconSquircle,
                    {
                        backgroundColor: isDark ? `${config.accent}28` : '#FFFFFF',
                        borderColor: `${config.accent}38`,
                    }
                ]}>
                    <PlatformIcon
                        name={config.icon as any}
                        size={28}
                        tintColor={config.accent}
                    />
                </View>

                {title && (
                    <Text style={[styles.coverTitle, { color: isDark ? '#FFFFFF' : '#1C1C1E' }]} numberOfLines={1}>
                        {title}
                    </Text>
                )}

                {showBadge && (
                    <View style={[styles.templatePill, { backgroundColor: `${config.accent}22`, borderColor: `${config.accent}36` }]}>
                        <Text style={[styles.templatePillText, { color: config.accent }]}>
                            {config.label}
                        </Text>
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        borderRadius: 18,
        overflow: 'hidden',
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
    },
    decorBlob1: {
        position: 'absolute',
        top: -30,
        right: -20,
        width: 140,
        height: 140,
        borderRadius: 70,
        borderWidth: 1.5,
        transform: [{ rotate: '25deg' }],
    },
    decorBlob2: {
        position: 'absolute',
        bottom: -40,
        left: -20,
        width: 130,
        height: 130,
        borderRadius: 65,
        borderWidth: 1.5,
    },
    decorCircle: {
        position: 'absolute',
        width: 220,
        height: 220,
        borderRadius: 110,
        borderWidth: 1,
        borderStyle: 'dashed',
        opacity: 0.6,
    },
    centerContent: {
        alignItems: 'center',
        gap: 6,
        zIndex: 2,
        paddingHorizontal: 16,
    },
    iconSquircle: {
        width: 52,
        height: 52,
        borderRadius: 15,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
    },
    coverTitle: {
        fontSize: 15,
        fontWeight: '700',
        textAlign: 'center',
    },
    templatePill: {
        paddingHorizontal: 9,
        paddingVertical: 3,
        borderRadius: 999,
        borderWidth: 0.5,
    },
    templatePillText: {
        fontSize: 10.5,
        fontWeight: '700',
        letterSpacing: 0.3,
        textTransform: 'uppercase',
    },
});
