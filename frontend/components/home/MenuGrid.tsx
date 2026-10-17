import { PlatformIcon } from '@/components/ui/PlatformIcon';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { useTenantContext } from '@/context/TenantContext';
import { useTheme } from '@/context/ThemeContext';
import { useUserContext } from '@/context/UserProvider';

const WORKSPACE_ITEMS = [
    { id: 'finance', label: 'Finance', icon: 'creditcard.fill', color: '#159957', colorEnd: '#0F7F47', route: '/(tabs)/home/finance' },
    { id: 'resources', label: 'Resources', icon: 'archivebox.fill', color: '#D97A32', colorEnd: '#C56824', route: '/(tabs)/home/resources' },
    { id: 'people', label: 'People', icon: 'person.2.fill', color: '#2467B2', colorEnd: '#1B5291', route: '/(tabs)/home/people' },
    { id: 'clock', label: 'Clock', icon: 'clock.fill', color: '#0EA5C6', colorEnd: '#0885A1', route: '/(tabs)/home/clock-module' },
    { id: 'report', label: 'Report', icon: 'doc.text.fill', color: '#168C7A', colorEnd: '#107263', route: '/(tabs)/home/reports' },
    { id: 'crew', label: 'Crew', icon: 'hardhat.fill', color: '#C0448F', colorEnd: '#9F3375', route: '/(tabs)/home/crew-module' },
    { id: 'ai', label: 'Forma AI', icon: 'sparkles.fill', color: '#6847D9', colorEnd: '#5334B8', route: '/(tabs)/home/adidaya-ai' },
];

function WorkspaceCard({
    item,
    isAuthenticated,
    isDark
}: {
    item: typeof WORKSPACE_ITEMS[0];
    isAuthenticated: boolean;
    isDark: boolean;
}) {
    const handlePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (item.route) router.push(item.route as any);
    };

    // Greyscale colors for preview when unauthenticated
    const gradientColors = isAuthenticated
        ? [item.color, item.colorEnd] as [string, string]
        : (isDark ? ['#27272A', '#18181B'] : ['#E2E8F0', '#CBD5E1']) as [string, string];

    return (
        <Pressable
            onPress={handlePress}
            style={({ pressed }) => [
                styles.card,
                { opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }
            ]}
        >
            <LinearGradient
                colors={gradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardGradient}
            >
                <View style={styles.cardContent}>
                    <View style={styles.leftGroup}>
                        <View style={[styles.iconSquircle, !isAuthenticated && (isDark ? styles.iconSquircleLockedDark : styles.iconSquircleLockedLight)]}>
                            <PlatformIcon
                                name={isAuthenticated ? (item.icon as any) : 'lock.fill'}
                                size={18}
                                tintColor={isAuthenticated ? '#FFFFFF' : (isDark ? '#71717A' : '#94A3B8')}
                            />
                        </View>
                        <Text
                            style={[
                                styles.cardLabel,
                                !isAuthenticated && (isDark ? styles.cardLabelLockedDark : styles.cardLabelLockedLight)
                            ]}
                            numberOfLines={1}
                        >
                            {item.label}
                        </Text>
                    </View>
                </View>
            </LinearGradient>
        </Pressable>
    );
}

export function MenuGrid() {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const { isAuthenticated } = useUserContext();
    const { activeTenant } = useTenantContext();

    const isAdidayaTenant = !!activeTenant && (
        (activeTenant.name || '').toLowerCase().includes('adidaya') ||
        (activeTenant.slug || '').toLowerCase().includes('adidaya') ||
        (activeTenant.company_code || '').toLowerCase().includes('adidaya') ||
        (activeTenant.branding_name || '').toLowerCase().includes('adidaya')
    );

    const visibleItems = WORKSPACE_ITEMS.filter(item => {
        if ((item.id === 'crew' || item.id === 'ai') && !isAdidayaTenant) {
            return false;
        }
        return true;
    }).map(item => {
        if (item.id === 'ai') {
            return {
                ...item,
                label: isAdidayaTenant ? 'AskAI' : 'Forma AI',
            };
        }
        return item;
    });

    return (
        <View style={styles.wrapper}>
            <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: Colors[resolvedTheme].text }]}>
                    Workspace
                </Text>
                {!isAuthenticated && (
                    <Text style={[styles.previewBadge, isDark ? styles.previewBadgeDark : styles.previewBadgeLight]}>
                        PREVIEW MODE
                    </Text>
                )}
            </View>

            <View style={styles.gridContainer}>
                {visibleItems.map(item => (
                    <WorkspaceCard
                        key={item.id}
                        item={item}
                        isAuthenticated={isAuthenticated}
                        isDark={isDark}
                    />
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        paddingBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginBottom: 14,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.8,
        opacity: 0.5,
    },
    previewBadge: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
    },
    previewBadgeLight: {
        backgroundColor: '#F1F5F9',
        color: '#64748B',
    },
    previewBadgeDark: {
        backgroundColor: '#1E293B',
        color: '#94A3B8',
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 16,
        justifyContent: 'space-between',
        rowGap: 12,
        columnGap: 12,
    },
    card: {
        width: (Platform.OS === 'web' ? 'calc(50% - 6px)' : '48.2%') as any,
        height: 64,
        borderRadius: 20,
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 5,
            },
            android: {
                elevation: 0,
            },
        }),
    },
    cardGradient: {
        flex: 1,
        justifyContent: 'center',
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
    },
    leftGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 11,
        flex: 1,
    },
    iconSquircle: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.22)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconSquircleLockedLight: {
        backgroundColor: 'rgba(0, 0, 0, 0.06)',
    },
    iconSquircleLockedDark: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
    },
    cardLabel: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    cardLabelLockedLight: {
        color: '#475569',
    },
    cardLabelLockedDark: {
        color: '#A1A1AA',
    },
});
