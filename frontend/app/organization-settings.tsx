import React, { useEffect, useState, useMemo } from 'react';
import {
    ScrollView,
    StyleSheet,
    Platform,
    Alert,
    StatusBar as RNStatusBar,
    View,
    Text,
    TouchableOpacity,
    useWindowDimensions,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';
import { useTenantContext } from '@/context/TenantContext';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { OrganizationSetupGroup, SettingCategory } from '@/components/organization-settings/types';
import { LegalInfoSheet, LegalTab } from '@/components/organization-settings/LegalInfoSheet';
import { OrganizationSettingsMasterDetail } from '@/components/organization-settings/OrganizationSettingsMasterDetail';

const SETTINGS_CATEGORIES: SettingCategory[] = [
    // 1. General Group
    {
        id: 'general',
        group: 'general',
        title: 'General',
        description: 'Identity, geofence radius, coordinates & contact',
        subtitle: 'Identity, theme, contact, and location',
        icon: 'slider.horizontal.3',
        color: '#64748B',
        gradientColors: ['#64748B', '#475569'],
        badges: ['Identity', 'Theme', 'Contact', 'Location'],
    },
    {
        id: 'account',
        group: 'general',
        title: 'My Account',
        description: 'Personal profile & authenticated session details',
        subtitle: 'Personal profile and session details',
        icon: 'person.fill',
        color: '#007AFF',
        gradientColors: ['#30A2FF', '#007AFF'],
        badges: ['Email', 'Role Badge'],
    },

    // 2. Team & Access Group
    {
        id: 'team',
        group: 'access',
        title: 'Team',
        description: 'Members, invitations, roles & join codes',
        subtitle: 'Members, invitations, and join codes',
        icon: 'person.2.fill',
        color: '#007AFF',
        gradientColors: ['#30A2FF', '#007AFF'],
        badges: ['Member', 'Invitations'],
    },
    {
        id: 'roles',
        group: 'access',
        title: 'Roles',
        description: 'Role hierarchy levels & permission matrix comparison',
        subtitle: 'Role hierarchy and permissions matrix',
        icon: 'shield.fill',
        color: '#FF9500',
        gradientColors: ['#FF9500', '#D17A00'],
        badges: ['Permission', 'Matrix'],
    },

    // 3. Security & Preferences Group
    {
        id: 'notifications',
        group: 'system',
        title: 'Notifications',
        description: 'Device push alerts & scheduled email digests',
        subtitle: 'Push alerts and scheduled email digests',
        icon: 'bell.badge.fill',
        color: '#FF3B30',
        gradientColors: ['#FF453A', '#D70015'],
        badges: ['Push Alert', 'Email Digest'],
    },
    {
        id: 'security',
        group: 'system',
        title: 'Security',
        description: 'Password policy, session timeout & danger zone',
        subtitle: 'Password policy, session timeout, and 2FA',
        icon: 'lock.fill',
        color: '#AF52DE',
        gradientColors: ['#BF5AF2', '#9839CF'],
        badges: ['Password', 'Session Timeout', '2FA'],
    },
];

const GROUP_TITLES: Record<OrganizationSetupGroup, string> = {
    general: 'General',
    access: 'Team & Access',
    system: 'Security & Preferences',
};

export default function OrganizationSettingsScreen() {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isDesktopWeb = Platform.OS === 'web' && width >= 768;
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const insets = useSafeAreaInsets();
    const { tenantRole, isSuperAdmin } = useTenantContext();

    useEffect(() => {
        if (Platform.OS === 'web' && isDesktopWeb) {
            router.replace('/(tabs)/home/organization-settings');
        }
    }, [isDesktopWeb]);

    const [legalSheetVisible, setLegalSheetVisible] = React.useState(false);
    const [legalTab, setLegalTab] = React.useState<LegalTab>('about');

    const openLegalSheet = (tab: LegalTab) => {
        Haptics.selectionAsync();
        setLegalTab(tab);
        setLegalSheetVisible(true);
    };

    const normalizedRole = (tenantRole || '').toLowerCase().trim();
    const isSuperOrAdmin = isSuperAdmin || 
        normalizedRole.includes('admin') || 
        normalizedRole.includes('owner') || 
        normalizedRole.includes('super');
    const isViewer = !isSuperOrAdmin && normalizedRole.includes('view');
    const isMember = !isSuperOrAdmin && !isViewer;

    const visibleCategories = React.useMemo(() => {
        if (isViewer) {
            return SETTINGS_CATEGORIES.filter((c) =>
                ['account', 'roles', 'notifications', 'security'].includes(c.id)
            ).map((c) => {
                if (c.id === 'roles') {
                    return {
                        ...c,
                        badges: ['Permission'],
                    };
                }
                return c;
            });
        }

        if (isMember) {
            return SETTINGS_CATEGORIES.map((c) => {
                if (c.id === 'general') {
                    return {
                        ...c,
                        badges: ['Identity', 'Theme', 'Contact', 'Location'],
                    };
                }
                if (c.id === 'team') {
                    return {
                        ...c,
                        badges: ['Member', 'Invitations'],
                    };
                }
                if (c.id === 'roles') {
                    return {
                        ...c,
                        badges: ['Permission'],
                    };
                }
                return c;
            });
        }

        return SETTINGS_CATEGORIES;
    }, [isViewer, isMember, isSuperOrAdmin]);

    const groups: OrganizationSetupGroup[] = ['general', 'access', 'system'];

    const bgColor = isDark ? '#000000' : '#F2F2F7';
    const textColor = isDark ? '#FFFFFF' : '#000000';
    const subtextColor = isDark ? '#8E8E93' : '#64748B';

    const handlePressItem = (id: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(`/organization-settings/${id}` as any);
    };

    const handleSignOut = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert('Sign Out', 'Are you sure you want to sign out from this account?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Sign Out',
                style: 'destructive',
                onPress: async () => {
                    await supabase.auth.signOut();
                    router.replace('/login');
                },
            },
        ]);
    };

    return (
        <>
            <RNStatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
            <Stack.Screen
                options={{
                    headerShown: true,
                    title: 'Organization Settings',
                    headerLargeTitle: false,
                    headerTransparent: Platform.OS === 'ios',
                    headerStyle: { backgroundColor: Platform.OS === 'ios' ? 'transparent' : (isDark ? '#000000' : '#F2F2F7') },
                    headerTintColor: textColor,
                    headerTitleStyle: { color: textColor, fontWeight: '600' },
                    headerShadowVisible: false,
                    headerBackButtonDisplayMode: 'minimal',
                    headerBackTitle: ' ',
                }}
            />

            <ScrollView
                style={[styles.scrollView, { backgroundColor: bgColor }]}
                contentInsetAdjustmentBehavior="automatic"
                contentContainerStyle={{
                    paddingHorizontal: 16,
                    paddingBottom: insets.bottom + 40,
                    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 24) + 84 : 16,
                    gap: 20,
                }}
                showsVerticalScrollIndicator={false}
            >
                {groups.map((grp) => {
                    const items = visibleCategories.filter((item) => item.group === grp);
                    if (items.length === 0) return null;

                    const title = GROUP_TITLES[grp];

                    return (
                        <View key={grp} style={styles.menuListContainer}>
                            {!!title && (
                                <Text style={[styles.menuListHeader, { color: subtextColor }]}>
                                    {title}
                                </Text>
                            )}
                            <View
                                style={[
                                    styles.menuList,
                                    {
                                        backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                                    },
                                ]}
                            >
                                {items.map((item, index) => {
                                    const isLast = index === items.length - 1;
                                    const subtitle = item.subtitle || item.badges.join(', ');
                                    return (
                                        <View key={item.id}>
                                            <TouchableOpacity
                                                style={styles.menuRow}
                                                onPress={() => handlePressItem(item.id)}
                                                activeOpacity={0.7}
                                            >
                                                <LinearGradient
                                                    colors={isDark ? ['#1C1C1E', '#000000'] : (item.gradientColors || ['#64748B', '#475569'])}
                                                    style={styles.menuIconBox}
                                                    start={{ x: 0, y: 0 }}
                                                    end={{ x: 1, y: 1 }}
                                                >
                                                    <PlatformIcon
                                                        name={item.icon}
                                                        size={16}
                                                        tintColor={isDark ? (item.color || '#FFF') : '#FFF'}
                                                    />
                                                </LinearGradient>
                                                <View style={styles.menuRowContent}>
                                                    <Text style={[styles.menuRowTitle, { color: textColor }]}>
                                                        {item.title}
                                                    </Text>
                                                    <Text
                                                        style={[styles.menuRowSubtitle, { color: subtextColor }]}
                                                        numberOfLines={1}
                                                    >
                                                        {subtitle}
                                                    </Text>
                                                </View>
                                                <PlatformIcon
                                                    name="chevron.right"
                                                    size={14}
                                                    tintColor={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'}
                                                />
                                            </TouchableOpacity>
                                            {!isLast && (
                                                <View
                                                    style={[
                                                        styles.indentedDivider,
                                                        {
                                                            backgroundColor: isDark
                                                                ? 'rgba(255,255,255,0.06)'
                                                                : 'rgba(0,0,0,0.06)',
                                                        },
                                                    ]}
                                                />
                                            )}
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                    );
                })}

                {/* DEDICATED SIGN OUT PILL BUTTON */}
                <View style={styles.logoutWrapper}>
                    <TouchableOpacity
                        activeOpacity={0.75}
                        onPress={handleSignOut}
                        style={[
                            styles.logoutPillButton,
                            {
                                backgroundColor: isDark
                                    ? 'rgba(239, 68, 68, 0.12)'
                                    : 'rgba(239, 68, 68, 0.08)',
                            },
                        ]}
                    >
                        <PlatformIcon
                            name="rectangle.portrait.and.arrow.right"
                            size={16}
                            tintColor="#EF4444"
                            style={{ marginRight: 8 }}
                        />
                        <Text style={styles.logoutButtonText}>Sign Out</Text>
                    </TouchableOpacity>
                </View>

                {/* FOOTER LINKS: ABOUT FORMA · TERMS OF SERVICE · PRIVACY POLICY */}
                <View style={styles.footerLinksRow}>
                    <TouchableOpacity
                        activeOpacity={0.6}
                        onPress={() => openLegalSheet('about')}
                        hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                    >
                        <Text style={[styles.footerLinkText, { color: subtextColor }]}>
                            About Forma
                        </Text>
                    </TouchableOpacity>

                    <Text style={[styles.footerDot, { color: subtextColor }]}>·</Text>

                    <TouchableOpacity
                        activeOpacity={0.6}
                        onPress={() => openLegalSheet('terms')}
                        hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                    >
                        <Text style={[styles.footerLinkText, { color: subtextColor }]}>
                            Terms of Service
                        </Text>
                    </TouchableOpacity>

                    <Text style={[styles.footerDot, { color: subtextColor }]}>·</Text>

                    <TouchableOpacity
                        activeOpacity={0.6}
                        onPress={() => openLegalSheet('privacy')}
                        hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                    >
                        <Text style={[styles.footerLinkText, { color: subtextColor }]}>
                            Privacy Policy
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* LEGAL & ENTERPRISE COMPLIANCE BOTTOM SHEET DRAWER */}
            <LegalInfoSheet
                visible={legalSheetVisible}
                onClose={() => setLegalSheetVisible(false)}
                initialTab={legalTab}
                isDark={isDark}
                textColor={textColor}
                subtextColor={subtextColor}
            />
        </>
    );
}

const styles = StyleSheet.create({
    scrollView: {
        flex: 1,
    },
    menuListContainer: {
        gap: 8,
    },
    menuListHeader: {
        fontSize: 13,
        fontWeight: '700',
        paddingHorizontal: 6,
        letterSpacing: -0.1,
    },
    menuList: {
        borderRadius: 22,
        overflow: 'hidden',
    },
    menuRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 13,
        paddingHorizontal: 16,
        gap: 12,
    },
    indentedDivider: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 60,
        marginRight: 0,
    },
    menuIconBox: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuRowContent: {
        flex: 1,
        gap: 1,
    },
    menuRowTitle: {
        fontSize: 16,
        fontWeight: '500',
        letterSpacing: -0.3,
    },
    menuRowSubtitle: {
        fontSize: 13,
        fontWeight: '400',
    },
    logoutWrapper: {
        marginTop: 4,
        alignItems: 'center',
    },
    logoutPillButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 13,
        paddingHorizontal: 28,
        borderRadius: 999,
        minWidth: 160,
    },
    logoutButtonText: {
        color: '#EF4444',
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    footerLinksRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 12,
        marginBottom: 8,
        gap: 8,
    },
    footerLinkText: {
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: -0.1,
    },
    footerDot: {
        fontSize: 12,
        opacity: 0.6,
    },
});
