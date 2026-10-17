import { useAdidayaNotifications } from '@/hooks/useAdidayaNotifications';
import { HeaderBlurBackground } from '@/components/ui/HeaderBlurBackground';
import { BouncyGlassButton } from '@/components/ui/BouncyGlassButton';
import { HeaderToolbar } from '@/components/ui/HeaderToolbar';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';

import { Stack, useRouter } from 'expo-router';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View, Platform, Alert, Text, Pressable, TouchableOpacity, ActionSheetIOS, RefreshControl, Image , StatusBar as RNStatusBar, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassView } from '@/components/ui/GlassView';
import { Ionicons } from '@expo/vector-icons';
import { ContextMenuAction } from '@/components/ui/PlatformContextMenu';

import { TenantHeaderPill } from '@/components/tenant/TenantHeaderPill';
import { ClockConfirmModal } from '@/components/home/ClockConfirmModal';
import * as Haptics from 'expo-haptics';
import { MenuGrid } from '@/components/home/MenuGrid';
import { QuickActionClock } from '@/components/home/QuickActionClock';
import { useUserContext } from '@/context/UserProvider';
import { useTenantContext } from '@/context/TenantContext';
import { FormaLogo } from '@/components/ui/FormaLogo';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { clockAction } from '@/lib/api/attendance';
import { LinearGradient } from 'expo-linear-gradient';
import { PillButton } from '@/components/ui/PillButton';
import { supabase } from '@/lib/supabase';
import { checkAndTriggerSchedulers } from '@/lib/api/notifications';
import { SwiftUINotificationsSheet } from '@/components/notifications/SwiftUINotificationsSheet';
import { FormaBrief } from '@/components/home/FormaBrief';
import { FormaContinue } from '@/components/home/FormaContinue';


const username = 'Alexando';

function getGreeting(): string {
    let hour = new Date().getHours();
    try {
        const hourStr = new Intl.DateTimeFormat('en-US', {
            timeZone: 'Asia/Jakarta',
            hour: 'numeric',
            hour12: false
        }).format(new Date());
        hour = parseInt(hourStr, 10);
    } catch (e) {
        console.warn('Failed to format Jakarta time:', e);
    }

    if (hour >= 22 || hour < 4) return 'Night';
    if (hour < 12) return 'Morning';
    if (hour < 18) return 'Afternoon';
    return 'Evening';
}

export default function HomeScreen() {
    const insets = useSafeAreaInsets();
    const { resolvedTheme, toggleTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    
    const { user, profile, attendanceStatus, todaySessions, refreshAttendance, isAuthenticated, signOut } = useUserContext();
    const { activeTenant, tenantRole, isSuperAdmin, isLoadingTenants, refreshTenants } = useTenantContext();
    const canManageOrg = isSuperAdmin || !!(tenantRole && (
        tenantRole.toLowerCase().includes('admin') ||
        tenantRole.toLowerCase().includes('owner') ||
        tenantRole.toLowerCase().includes('super')
    ));
    const isClockedIn = attendanceStatus === 'checked-in';
    const firstSession = todaySessions[0];
    const latestSession = todaySessions[todaySessions.length - 1];
    
    const clockInTime = firstSession ? new Date(firstSession.clockIn) : null;
    const locationCode = latestSession ? (latestSession.locationCode || latestSession.remoteMode) : undefined;
    
    const [isProcessing, setIsProcessing] = useState(false);
    const [showClockModal, setShowClockModal] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const { unreadCount } = useAdidayaNotifications();
    const { width } = useWindowDimensions();
    const isDesktopWeb = Platform.OS === 'web' && width >= 1100;
    const isTabletWeb = Platform.OS === 'web' && width >= 768 && width < 1100;
    const isSplitWebLayout = Platform.OS === 'web' && width >= 768;
    const bottomOffset = isDesktopWeb
        ? 24
        : isTabletWeb
            ? Math.max(insets.bottom, 16)
        : Platform.OS === 'ios'
            ? Math.max(insets.bottom, 12) + 76
            : Math.max(insets.bottom, 12) + 84;

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        try {
            if (activeTenant) {
                await refreshAttendance();
            }
        } catch (e) {
            console.error('Failed to pull-to-refresh on home screen:', e);
        } finally {
            setRefreshing(false);
        }
    }, [refreshAttendance, activeTenant]);

    const router = useRouter();
    const [greeting, setGreeting] = useState(getGreeting());
    const displayName = profile?.nickname || profile?.full_name?.split(' ')[0] || (isAuthenticated ? (user?.email?.split('@')[0] || 'User') : 'Guest');

    const textColor = Colors[resolvedTheme].text;

    // Update greeting every minute
    useEffect(() => {
        const interval = setInterval(() => {
            setGreeting(getGreeting());
        }, 60000);
        return () => clearInterval(interval);
    }, []);

    // Run time-based reminders and Saturday payroll alerts
    useEffect(() => {
        if (!activeTenant) return;
        const checkSchedulers = async () => {
            try {
                let wsId = 'f39364e8-1376-4ff7-a716-78277e8d25b3';
                const { data } = await supabase.from('workspaces').select('id').limit(1);
                if (data && data.length > 0) {
                    wsId = data[0].id;
                }
                await checkAndTriggerSchedulers(wsId);
            } catch (e) {
                console.error('Failed to run schedulers check:', e);
            }
        };

        checkSchedulers();

        // Also run every 5 minutes while home screen is active
        const interval = setInterval(checkSchedulers, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [activeTenant]);

    const profileMenuActions: ContextMenuAction[] = useMemo(() => {
        if (isAuthenticated) {
            return [
                {
                    title: 'My Profile',
                    systemIcon: 'person.crop.circle',
                },
                {
                    title: 'Organization Settings',
                    systemIcon: 'building.2',
                },
                {
                    title: 'Sign Out',
                    systemIcon: 'rectangle.portrait.and.arrow.right',
                    destructive: true,
                },
            ];
        }
        return [
            {
                title: 'Sign In',
                systemIcon: 'person.badge.key',
            },
        ];
    }, [isAuthenticated]);

    const handleProfileMenuPress = (e: { nativeEvent: { index: number; name: string } }) => {
        const { index } = e.nativeEvent;
        Haptics.selectionAsync();
        if (isAuthenticated) {
            if (index === 0) {
                router.push('/(tabs)/home/people');
            } else if (index === 1) {
                if (Platform.OS === 'web') {
                    router.push('/(tabs)/home/organization-settings');
                } else {
                    router.push('/organization-settings');
                }
            } else if (index === 2) {
                signOut();
            }
        } else {
            if (index === 0) {
                router.push('/login');
            }
        }
    };

    const toolbarActions = [
        {
            id: 'notifications',
            icon: 'notifications' as any,
            image: 'bell.fill',
            title: 'Notifications',
            badge: unreadCount || undefined,
            onPress: () => {
                if (Platform.OS === 'ios') {
                    setIsNotificationsOpen(true);
                } else {
                    router.push('/notifications');
                }
            },
        },
        {
            id: 'theme',
            icon: (isDark ? 'sunny' : 'moon') as any,
            image: isDark ? 'sun.max.fill' : 'moon.fill',
            title: isDark ? 'Light Mode' : 'Dark Mode',
            onPress: toggleTheme,
        },
        {
            id: 'profile',
            icon: 'person-circle' as any,
            image: 'person.crop.circle.fill',
            title: 'Profile',
            tintColor: isAuthenticated ? undefined : (isDark ? '#8E8E93' : '#C7C7CC'),
            menuActions: profileMenuActions,
            onMenuPress: handleProfileMenuPress,
        },
    ];

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: !isTabletWeb,
                    title: isAuthenticated ? `${greeting}, ${displayName}` : greeting,
                    headerLargeTitle: Platform.OS === 'ios',
                    headerTransparent: Platform.OS === 'ios',
                    headerTintColor: textColor,
                    headerShadowVisible: false,
                    headerStyle: Platform.OS === 'ios'
                        ? { backgroundColor: 'transparent' }
                        : { backgroundColor: isDark ? '#000000' : '#F2F2F7' },
                    headerLargeStyle: Platform.OS === 'ios'
                        ? { backgroundColor: 'transparent' }
                        : { backgroundColor: isDark ? '#000000' : '#F2F2F7' },
                    headerLargeTitleStyle: { fontSize: 26, color: textColor },

                    headerLeft: () => (
                        <View style={{ overflow: 'visible', marginLeft: Platform.OS === 'web' ? 16 : 0 }}>
                            <TenantHeaderPill />
                        </View>
                    ),
                    headerRight: () => (
                        <View style={{ overflow: 'visible', marginRight: Platform.OS === 'web' ? 16 : 0 }}>
                            <HeaderToolbar
                                actions={toolbarActions}
                                isDark={isDark}
                                textColor={textColor}
                                maxDirectActions={3}
                            />
                        </View>
                    ),
                }}
            />

            <ScrollView
                style={[styles.scrollView, { backgroundColor: Platform.OS === 'web' ? 'transparent' : (isDark ? '#000000' : '#F2F2F7') }]}
                contentInsetAdjustmentBehavior="automatic"
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={isDark ? '#FFFFFF' : '#000000'}
                    />
                }
            >
                <View style={[styles.contentContainer, { 
                    paddingBottom: isDesktopWeb ? 100 : (Platform.OS === 'ios' ? 220 : 200),
                    paddingTop: Platform.OS === 'ios' ? 8 : 12 
                }]}>
                    {isTabletWeb && <Text style={{ color: textColor, fontSize: 24, fontWeight: '700', paddingHorizontal: 20, paddingTop: 8, marginBottom: 24 }}>{isAuthenticated ? `${greeting}, ${displayName}` : greeting}</Text>}
                    {!isAuthenticated ? (
                        isSplitWebLayout ? (
                            <View style={styles.webSplitLayout}>
                                <View style={styles.webLeftCol}>
                                    <View style={styles.onboardingContainer}>
                                        <View style={[styles.onboardingCard, isDark ? styles.onboardingCardDark : styles.onboardingCardLight]}>
                                            <View style={styles.onboardingHero}>
                                                <FormaLogo size={56} isDark={isDark} />
                                                <Text style={[styles.onboardingTitle, isDark && styles.onboardingTitleDark]}>
                                                    Welcome to Adidaya
                                                </Text>
                                                <Text style={[styles.onboardingSubtitle, isDark && styles.onboardingSubtitleDark]} numberOfLines={2}>
                                                    Sign in to access and manage your workspace.
                                                </Text>
                                            </View>

                                            {/* Sign In Button */}
                                            <TouchableOpacity
                                                style={[styles.onboardingActionItem, isDark ? styles.onboardingActionItemDark : styles.onboardingActionItemLight]}
                                                onPress={() => router.push('/login')}
                                                activeOpacity={0.75}
                                            >
                                                <View style={[styles.actionIconCircle, { backgroundColor: 'rgba(0, 54, 248, 0.12)' }]}>
                                                    <PlatformIcon name="person.crop.circle.fill" size={22} tintColor="#0036F8" />
                                                </View>
                                                <View style={{ flex: 1, gap: 2 }}>
                                                    <Text style={[styles.actionTitle, isDark && styles.actionTitleDark]}>
                                                        Sign In to Adidaya
                                                    </Text>
                                                    <Text style={[styles.actionDesc, isDark && styles.actionDescDark]} numberOfLines={2}>
                                                        Access your account and workspace.
                                                    </Text>
                                                </View>
                                                <PlatformIcon name="chevron.right" size={15} tintColor={isDark ? '#64748B' : '#94A3B8'} />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>
                                <View style={styles.webRightCol}>
                                    <MenuGrid />
                                </View>
                            </View>
                        ) : (
                            <>
                                {/* 1. Unauthenticated Hero Card */}
                                <View style={styles.onboardingContainer}>
                                    <View style={[styles.onboardingCard, isDark ? styles.onboardingCardDark : styles.onboardingCardLight]}>
                                        <View style={styles.onboardingHero}>
                                            <FormaLogo size={56} isDark={isDark} />
                                            <Text style={[styles.onboardingTitle, isDark && styles.onboardingTitleDark]}>
                                                Welcome to Adidaya
                                            </Text>
                                            <Text style={[styles.onboardingSubtitle, isDark && styles.onboardingSubtitleDark]} numberOfLines={2}>
                                                Sign in to access and manage your workspace.
                                            </Text>
                                        </View>

                                        {/* Sign In Button */}
                                        <TouchableOpacity
                                            style={[styles.onboardingActionItem, isDark ? styles.onboardingActionItemDark : styles.onboardingActionItemLight]}
                                            onPress={() => router.push('/login')}
                                            activeOpacity={0.75}
                                        >
                                            <View style={[styles.actionIconCircle, { backgroundColor: 'rgba(0, 54, 248, 0.12)' }]}>
                                                <PlatformIcon name="person.crop.circle.fill" size={22} tintColor="#0036F8" />
                                            </View>
                                            <View style={{ flex: 1, gap: 2 }}>
                                                <Text style={[styles.actionTitle, isDark && styles.actionTitleDark]}>
                                                    Sign In to Adidaya
                                                </Text>
                                                <Text style={[styles.actionDesc, isDark && styles.actionDescDark]} numberOfLines={2}>
                                                    Access your account and workspace.
                                                </Text>
                                            </View>
                                            <PlatformIcon name="chevron.right" size={15} tintColor={isDark ? '#64748B' : '#94A3B8'} />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* 2. Workspace Preview Grid */}
                                <MenuGrid />
                            </>
                        )
                    ) : !activeTenant ? (
                        <View style={{ paddingHorizontal: 16, paddingVertical: 24 }}>
                            {isLoadingTenants ? (
                                <View accessibilityLabel="Memuat beranda" style={{ gap: 16 }}>
                                    <View style={{ height: 12, width: 64, borderRadius: 6, backgroundColor: isDark ? '#1C1C1E' : '#E5E5EA' }} />
                                    <View style={{ height: 80, borderRadius: 20, backgroundColor: isDark ? '#1C1C1E' : '#E5E5EA', justifyContent: 'center', alignItems: 'center' }}>
                                        <ActivityIndicator size="small" color={isDark ? '#8E8E93' : '#6E6E73'} />
                                    </View>
                                </View>
                            ) : (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                    <Text style={{ flex: 1, fontSize: 13, color: isDark ? '#A1A1A6' : '#6E6E73' }}>Beranda belum dapat dimuat.</Text>
                                    <TouchableOpacity accessibilityRole="button" accessibilityLabel="Muat ulang beranda" onPress={() => { void refreshTenants(); }} style={{ padding: 10, borderRadius: 999, backgroundColor: isDark ? '#1C1C1E' : '#E5E5EA' }}>
                                        <PlatformIcon name="arrow.clockwise" size={18} tintColor={textColor} />
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    ) : (
                        isSplitWebLayout ? (
                            <View style={styles.webSplitLayout}>
                                <View style={styles.webLeftCol}>
                                    <FormaBrief firstCard={isDesktopWeb ? (
                                        <View style={{ marginHorizontal: 16 }}>
                                            <QuickActionClock
                                                variant="card"
                                                isClockedIn={isClockedIn}
                                                clockInTime={clockInTime}
                                                locationCode={locationCode}
                                                onToggle={() => { if (!isProcessing) setShowClockModal(true); }}
                                            />
                                        </View>
                                    ) : undefined} />
                                    <FormaContinue />
                                </View>
                                <View style={styles.webRightCol}>
                                    <MenuGrid />
                                </View>
                            </View>
                        ) : (
                            <>
                                {/* 1. Brief Section (Directly below Header) */}
                                <FormaBrief />

                                {/* 2. Workspace Grid */}
                                <MenuGrid />

                                {/* 3. Continue Section */}
                                <FormaContinue />
                            </>
                        )
                    )}
                </View>
            </ScrollView>

            {/* Floating Bottom Quick Action (Only when in an active organization) */}
            {activeTenant && !isDesktopWeb && (
                <View 
                    style={[styles.bottomContainer, { bottom: bottomOffset }]} 
                    pointerEvents="box-none"
                >
                    <QuickActionClock
                        isClockedIn={isClockedIn}
                        clockInTime={clockInTime}
                        locationCode={locationCode}
                        onToggle={() => {
                            if (isProcessing) return;
                            setShowClockModal(true);
                        }}
                    />
                </View>
            )}

            {/* Clock Confirmation Modal */}
            {showClockModal && (
                <ClockConfirmModal
                    visible={showClockModal}
                    isClockedIn={isClockedIn}
                    userName={profile?.full_name || displayName}
                    onConfirm={async (payload) => {
                        if (isProcessing) return;
                        setIsProcessing(true);
                        try {
                            const type = isClockedIn ? "OUT" : "IN";
                            const res = await clockAction(user?.id || '00000000-0000-0000-0000-000000000000', type, {
                                latitude: payload.latitude,
                                longitude: payload.longitude,
                                remoteMode: payload.modeCode,
                                detectedLocationCode: payload.detectedLocationCode || payload.modeCode,
                                detectedLocationType: payload.detectedLocationType || (payload.locationStatus === 'inside' ? 'Office' : 'Remote'),
                                locationStatus: payload.locationStatus || (payload.detectedLocationType === 'Office' || payload.detectedLocationType === 'Project' ? 'inside' : 'outside'),
                                overrideReason: payload.overrideReason || payload.watermarkText,
                                photoUrl: payload.photoUrl || payload.photoUri,
                            });
                            
                            if (res && (res as any).error) {
                                throw new Error((res as any).error);
                            } else {
                                await refreshAttendance();
                                setShowClockModal(false);
                             }
                        } catch (err: any) {
                            throw err;
                        } finally {
                            setIsProcessing(false);
                        }
                    }}
                    onCancel={() => setShowClockModal(false)}
                />
            )}

            <SwiftUINotificationsSheet
                isOpened={isNotificationsOpen}
                onClose={() => setIsNotificationsOpen(false)}
            />
        </>
    );
}

const styles = StyleSheet.create({
    scrollView: {
        flex: 1,
    },
    contentContainer: {
        paddingHorizontal: 0,
        width: '100%',
    },
    webSplitLayout: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        paddingHorizontal: 0,
        gap: 0,
        width: '100%',
    },
    webLeftCol: {
        flex: 1,
        minWidth: 0,
    },
    webRightCol: {
        flex: 1,
        minWidth: 0,
    },
    bottomContainer: {
        position: 'absolute',
        left: 16,
        right: 16,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
    },

    // Onboarding No-Tenant State
    onboardingContainer: {
        paddingHorizontal: 16,
        paddingTop: 8,
        marginBottom: 28,
    },
    onboardingCard: {
        borderRadius: 28,
        padding: 22,
        gap: 14,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.06,
                shadowRadius: 16,
            },
            android: {
                elevation: 0,
            },
        }),
    },
    onboardingCardLight: {
        backgroundColor: '#FFFFFF',
        ...Platform.select({
            web: {
                borderWidth: 1,
                borderColor: 'rgba(0, 0, 0, 0.07)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
            },
            default: {},
        }),
    },
    onboardingCardDark: {
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        ...Platform.select({
            web: {
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.08)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
            },
            default: {},
        }),
    },
    onboardingHero: {
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        gap: 8,
    },
    onboardingTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#0F172A',
        letterSpacing: -0.4,
        marginTop: 4,
    },
    onboardingTitleDark: {
        color: '#FFFFFF',
    },
    onboardingSubtitle: {
        fontSize: 13.5,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 19,
    },
    onboardingSubtitleDark: {
        color: '#94A3B8',
    },
    onboardingActionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 20,
        gap: 14,
    },
    onboardingActionItemLight: {
        backgroundColor: '#F8FAFC',
    },
    onboardingActionItemDark: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    actionIconCircle: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#0F172A',
        letterSpacing: -0.2,
    },
    actionTitleDark: {
        color: '#FFFFFF',
    },
    actionDesc: {
        fontSize: 12,
        color: '#64748B',
        lineHeight: 16,
    },
    actionDescDark: {
        color: '#94A3B8',
    },
});
