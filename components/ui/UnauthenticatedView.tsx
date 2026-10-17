import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { FormaLogo } from '@/components/ui/FormaLogo';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { PillButton } from '@/components/ui/PillButton';

interface UnauthenticatedViewProps {
    title: string;
    description: string;
    buttonText?: string;
    badge?: string;
    icon?: string;
    showLogo?: boolean;
    compact?: boolean;
    style?: StyleProp<ViewStyle>;
}

export function UnauthenticatedView({
    title,
    description,
    buttonText = 'Sign In to Your Account',
    badge,
    icon,
    showLogo = true,
    compact = false,
    style,
}: UnauthenticatedViewProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const router = useRouter();

    return (
        <View style={[
            styles.container, 
            isDark ? styles.containerDark : styles.containerLight,
            compact && styles.containerCompact,
            style
        ]}>
            <View style={[styles.card, compact && styles.cardCompact]}>
                {showLogo && (
                    <FormaLogo size={compact ? 54 : 68} isDark={isDark} />
                )}

                {icon && !showLogo && (
                    <View style={[styles.iconBadge, isDark ? styles.iconBadgeDark : styles.iconBadgeLight]}>
                        <PlatformIcon name={icon as any} size={28} tintColor={isDark ? '#93C5FD' : '#0036F8'} />
                    </View>
                )}

                {badge && (
                    <View style={[styles.badgePill, isDark ? styles.badgePillDark : styles.badgePillLight]}>
                        <Text style={[styles.badgeText, isDark ? styles.badgeTextDark : styles.badgeTextLight]}>
                            {badge}
                        </Text>
                    </View>
                )}

                <Text style={[styles.title, compact && styles.titleCompact, isDark && styles.titleDark]}>
                    {title}
                </Text>

                <Text style={[styles.description, compact && styles.descriptionCompact, isDark && styles.descriptionDark]}>
                    {description}
                </Text>

                <PillButton
                    label={buttonText}
                    onPress={() => router.push('/login')}
                    variant="solid"
                    color="blue"
                    icon={<PlatformIcon name="rectangle.portrait.and.arrow.right" size={15} tintColor="#FFFFFF" />}
                    style={{ backgroundColor: '#0036F8', minWidth: 200 }}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 28,
    },
    containerCompact: {
        flex: 0,
        backgroundColor: 'transparent',
        paddingHorizontal: 16,
        paddingTop: 28,
        paddingBottom: 40,
    },
    containerLight: {
        backgroundColor: '#F8FAFC',
    },
    containerDark: {
        backgroundColor: '#090D16',
    },
    card: {
        width: '100%',
        alignItems: 'center',
        paddingVertical: 36,
        paddingHorizontal: 16,
    },
    cardCompact: {
        paddingVertical: 16,
        paddingHorizontal: 8,
    },
    iconBadge: {
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    iconBadgeLight: {
        backgroundColor: 'rgba(0, 54, 248, 0.08)',
    },
    iconBadgeDark: {
        backgroundColor: 'rgba(147, 197, 253, 0.12)',
    },
    badgePill: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        marginTop: 10,
    },
    badgePillLight: {
        backgroundColor: '#EEF2FF',
    },
    badgePillDark: {
        backgroundColor: '#1E1B4B',
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.4,
    },
    badgeTextLight: {
        color: '#4F46E5',
    },
    badgeTextDark: {
        color: '#A5B4FC',
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        color: '#0F172A',
        marginTop: 16,
        letterSpacing: -0.4,
        textAlign: 'center',
    },
    titleCompact: {
        fontSize: 18,
        marginTop: 12,
    },
    titleDark: {
        color: '#F8FAFC',
    },
    description: {
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 22,
        paddingHorizontal: 12,
        marginBottom: 22,
    },
    descriptionCompact: {
        fontSize: 13,
        lineHeight: 19,
        marginBottom: 18,
        marginTop: 6,
    },
    descriptionDark: {
        color: '#94A3B8',
    },
});
