import { HeaderCircleButton } from '@/components/ui/HeaderCircleButton';
import { NotificationInboxControls } from '@/components/notifications/NotificationInboxControls';
import { notificationDestination } from '@/lib/notificationDestination';
import { useAdidayaNotifications } from '@/hooks/useAdidayaNotifications';
import { BlurView } from 'expo-blur';
import { GlassView } from '@/components/ui/GlassView';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { SwipeTabWrapper } from '@/components/ui/SwipeTabWrapper';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { MOCK_NOTIFICATIONS, parseNotificationDate } from '@/constants/mockNotifications';
import { getLocalNotifications, markNotificationsAsRead } from '@/lib/api/notifications';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { differenceInDays, isToday, format } from 'date-fns';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useFinance } from '@/context/FinanceContext';
import { RefreshControl, 
    Dimensions,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    TouchableOpacity,
    StyleSheet,
    Text,
    TextInput,
    View,
    useWindowDimensions,
 } from 'react-native';
import { NotificationsMasterDetail } from '@/components/notifications/NotificationsMasterDetail';
import { FlatList, Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const SPRING_CONFIG = {
    damping: 24,
    stiffness: 150,
    overshootClamping: true,
};

export default function NotificationsScreen() {
    const { width } = useWindowDimensions();
    return Platform.OS === 'web' && width >= 768 ? <NotificationsMasterDetail /> : <MobileNotificationsScreen />;
}

function MobileNotificationsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { teamPurchasing, teamReimbursement, refreshData } = useFinance();
    const { notifications: localNotifications, refresh: fetchLocalNotifications, markRead, markAllRead, unreadCount, loading: refreshing, error: inboxError } = useAdidayaNotifications();
    const onRefresh = fetchLocalNotifications;

    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const subTextColor = Colors[resolvedTheme].icon;

    const [activeTab, setActiveTab] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    // --- Custom Bottom Sheet Gesture Logic (both platforms) ---
    const CARD_MAX_HEIGHT = SCREEN_HEIGHT - (insets.top + 36);
    const SNAP_TOP = 0;
    const SNAP_85 = Math.max(0, SCREEN_HEIGHT * 0.15 - (insets.top + 36));
    const SNAP_BOTTOM = SCREEN_HEIGHT;

    const translateY = useSharedValue(SNAP_BOTTOM);
    const contextY = useSharedValue(0);
    const [scrollEnabled, setScrollEnabled] = useState(true);

    const handleDismiss = () => {
        translateY.value = withTiming(SNAP_BOTTOM, { duration: 250 }, () => {
            runOnJS(router.back)();
        });
    };

    useEffect(() => {
        translateY.value = SNAP_BOTTOM;
        translateY.value = withSpring(SNAP_85, SPRING_CONFIG);
    }, []);

    // Track keyboard height for floating search bar
    useEffect(() => {
        const updateHeight = (e: any) => {
            if (e?.endCoordinates?.height) {
                setKeyboardHeight(e.endCoordinates.height);
            }
        };
        const resetHeight = () => {
            setKeyboardHeight(0);
        };

        const showSub1 = Keyboard.addListener('keyboardWillShow', updateHeight);
        const showSub2 = Keyboard.addListener('keyboardDidShow', updateHeight);
        const hideSub1 = Keyboard.addListener('keyboardWillHide', resetHeight);
        const hideSub2 = Keyboard.addListener('keyboardDidHide', resetHeight);

        return () => {
            showSub1.remove();
            showSub2.remove();
            hideSub1.remove();
            hideSub2.remove();
        };
    }, []);

    const panGesture = Gesture.Pan()
        .onStart(() => {
            contextY.value = translateY.value;
        })
        .onUpdate((event) => {
            const newY = contextY.value + event.translationY;
            translateY.value = Math.max(SNAP_TOP, newY);
        })
        .onEnd((event) => {
            const velocity = event.velocityY;
            const currentY = translateY.value;
            const threshold = 50;

            if (velocity > 500) {
                // Quick swipe down
                if (currentY < SNAP_85 - threshold) {
                    translateY.value = withSpring(SNAP_85, SPRING_CONFIG);
                    runOnJS(setScrollEnabled)(true);
                } else {
                    translateY.value = withTiming(SNAP_BOTTOM, { duration: 200 }, () => {
                        runOnJS(router.back)();
                    });
                }
            } else if (velocity < -500) {
                // Quick swipe up
                translateY.value = withSpring(SNAP_TOP, SPRING_CONFIG);
                runOnJS(setScrollEnabled)(true);
            } else {
                // Slow drag
                const distToTop = Math.abs(currentY - SNAP_TOP);
                const distTo85 = Math.abs(currentY - SNAP_85);
                const distToBottom = Math.abs(currentY - SNAP_BOTTOM);

                const minDist = Math.min(distToTop, distTo85, distToBottom);
                if (minDist === distToTop) {
                    translateY.value = withSpring(SNAP_TOP, SPRING_CONFIG);
                    runOnJS(setScrollEnabled)(true);
                } else if (minDist === distTo85) {
                    translateY.value = withSpring(SNAP_85, SPRING_CONFIG);
                    runOnJS(setScrollEnabled)(true);
                } else {
                    translateY.value = withTiming(SNAP_BOTTOM, { duration: 200 }, () => {
                        runOnJS(router.back)();
                    });
                }
            }
        });

    const animatedCardStyle = useAnimatedStyle(() => {
        const progress = Math.max(0, Math.min(1, (SNAP_85 - translateY.value) / (SNAP_85 - SNAP_TOP)));
        const isIOS = Platform.OS === 'ios';
        const sideMargin = isIOS ? 8 * (1 - progress) : 0;
        const bottomMargin = isIOS ? 8 * (1 - progress) : 0;
        const radius = 36 + 20 * (1 - progress); // 56 at 85, 36 at TOP

        return {
            top: insets.top + 36 + translateY.value,
            left: sideMargin,
            right: sideMargin,
            bottom: bottomMargin,
            borderTopLeftRadius: radius,
            borderTopRightRadius: radius,
            borderBottomLeftRadius: isIOS && bottomMargin > 0 ? radius : 0,
            borderBottomRightRadius: isIOS && bottomMargin > 0 ? radius : 0,
            overflow: 'hidden' as const,
        };
    });

    const animatedBackdropStyle = useAnimatedStyle(() => {
        const opacity = 0.5 * (1 - (translateY.value - SNAP_TOP) / (SNAP_BOTTOM - SNAP_TOP));
        return {
            opacity: Math.max(0, Math.min(0.5, opacity)),
        };
    });

    // Helper function to format timestamp safely
    const formatRequestTime = (req: any): string => {
        try {
            const dateStr = req.updated_at || req.created_at || req.date;
            if (!dateStr) return format(new Date(), 'dd/MM/yyyy, HH:mm:ss');
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return format(new Date(), 'dd/MM/yyyy, HH:mm:ss');
            return format(date, 'dd/MM/yyyy, HH:mm:ss');
        } catch {
            return format(new Date(), 'dd/MM/yyyy, HH:mm:ss');
        }
    };

    // Helper to determine unread status
    const isRequestRecent = (req: any): boolean => {
        try {
            const dateStr = req.updated_at || req.created_at || req.date;
            if (!dateStr) return false;
            const date = new Date(dateStr);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffHours = diffMs / (1000 * 60 * 60);
            return diffHours < 24;
        } catch {
            return false;
        }
    };

    const capitalizeName = (name: string): string => {
        if (!name) return '';
        if (name.length <= 3 && name === name.toUpperCase()) return name;
        return name
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    };

    const getAvatarColors = (action: string, isDark: boolean) => {
        switch (action.toLowerCase()) {
            case 'paid':
                return { bg: isDark ? 'rgba(52,199,89,0.18)' : '#DCFCE7', text: '#15803D' };
            case 'approved':
                return { bg: isDark ? 'rgba(0,122,255,0.18)' : '#DBEAFE', text: '#1D4ED8' };
            case 'rejected':
                return { bg: isDark ? 'rgba(255,59,48,0.18)' : '#FEE2E2', text: '#B91C1C' };
            case 'revision':
                return { bg: isDark ? 'rgba(255,149,0,0.18)' : '#FEF3C7', text: '#B45309' };
            case 'info': return { label: '', color: '#007AFF' };
            case 'submitted':
            default:
                return { 
                    bg: isDark ? 'rgba(0, 122, 255,0.18)' : '#EFF6FF', 
                    text: '#007AFF' 
                };
        }
    };

    const getActionLabelAndColor = (action: string) => {
        switch (action.toLowerCase()) {
            case 'paid':
                return { label: 'marking as paid:', color: '#15803D' };
            case 'approved':
                return { label: 'approved:', color: '#007AFF' };
            case 'rejected':
                return { label: 'rejected:', color: '#DC2626' };
            case 'revision':
                return { label: 'requested revision for:', color: '#D97706' };
            case 'submitted':
            default:
                return { label: 'submitted:', color: '#007AFF' };
        }
    };

    const combinedNotifications = localNotifications;

    // Keep the complete Adidaya inbox visible, including older notifications.
    const activeNotifications = [...combinedNotifications].sort((a, b) => parseNotificationDate(b.time).getTime() - parseNotificationDate(a.time).getTime());

    // Apply Search Query and Category Tabs
    const filteredNotifications = activeNotifications.filter(item => {
        const matchesSearch = item.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.module.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.ref && item.ref.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (item.projectCode && item.projectCode.toLowerCase().includes(searchQuery.toLowerCase()));

        if (!matchesSearch) return false;

        if (activeTab === 'all') return true;
        if (activeTab === 'unread') return item.unread;
        return item.category === activeTab;
    });

    const handleNotificationPress = (notification: any) => {
        void markRead(notification.id);
        const destination = notificationDestination(notification.link);
        if (destination) { router.push(destination as any); return; }
        if (notification.module === 'Announcement' || notification.ref?.startsWith('ann-') || notification.type === 'announcement' || notification.text?.toLowerCase().includes('announcement')) {
            const targetId = notification.ref || notification.text || notification.id;
            translateY.value = withTiming(SNAP_BOTTOM, { duration: 250 }, () => {
                runOnJS(router.back)();
                runOnJS(router.push)({
                    pathname: '/announcement-detail',
                    params: {
                        id: targetId,
                    }
                });
            });
            return;
        }

        if (notification.requestId && notification.requestType) {
            translateY.value = withTiming(SNAP_BOTTOM, { duration: 250 }, () => {
                runOnJS(router.back)();
                runOnJS(router.push)({
                    pathname: '/(tabs)/home/finance',
                    params: {
                        requestId: notification.requestId,
                        requestType: notification.requestType,
                    }
                });
            });
            return;
        }

        if (notification.category === 'finance') {
            translateY.value = withTiming(SNAP_BOTTOM, { duration: 250 }, () => {
                runOnJS(router.back)();
                runOnJS(router.push)('/(tabs)/home/finance');
            });
            return;
        }

        if (notification.category === 'projects') {
            translateY.value = withTiming(SNAP_BOTTOM, { duration: 250 }, () => {
                runOnJS(router.back)();
                runOnJS(router.push)('/(tabs)/projects');
            });
            return;
        }

        // Fallback for crew, system or any other modules
        const action = notification.action || (
            notification.module === 'Payroll' ? 'payroll'
                : notification.module === 'Daily Log' ? 'daily_log'
                : 'directory'
        );
        translateY.value = withTiming(SNAP_BOTTOM, { duration: 250 }, () => {
            runOnJS(router.back)();
            runOnJS(router.push)({
                pathname: '/(tabs)/home/crew-module',
                params: {
                    notificationAction: action,
                    notificationRef: notification.ref || '',
                    notificationSubject: notification.subjectUser || '',
                    notificationProjectCode: notification.projectCode || '',
                    notificationModule: notification.module || '',
                    notificationTs: notification.id || notification.time || '',
                }
            });
        });
    };

    // Group Notifications dynamically
    const groupedItems: any[] = [];
    const todayNotifications = filteredNotifications.filter(item => isToday(parseNotificationDate(item.time)));
    const yesterdayNotifications = filteredNotifications.filter(item => {
        const date = parseNotificationDate(item.time);
        return differenceInDays(new Date(), date) === 1;
    });
    const last7DaysNotifications = filteredNotifications.filter(item => {
        const date = parseNotificationDate(item.time);
        const diff = differenceInDays(new Date(), date);
        return diff >= 2 && diff <= 7;
    });

    if (todayNotifications.length > 0) {
        groupedItems.push({ id: 'header-today', isHeader: true, title: 'Today' });
        groupedItems.push(...todayNotifications);
    }
    if (yesterdayNotifications.length > 0) {
        groupedItems.push({ id: 'header-yesterday', isHeader: true, title: 'Yesterday' });
        groupedItems.push(...yesterdayNotifications);
    }
    if (last7DaysNotifications.length > 0) {
        groupedItems.push({ id: 'header-last7', isHeader: true, title: 'Last 7 Days' });
        groupedItems.push(...last7DaysNotifications);
    }

    const groupedIds = new Set(groupedItems.filter(item => !item.isHeader).map(item => item.id));
    const olderNotifications = filteredNotifications.filter(item => !groupedIds.has(item.id));
    if (olderNotifications.length) groupedItems.push({ id: 'header-older', isHeader: true, title: 'Older' }, ...olderNotifications);

    const renderMessage = (text: string) => {
        const parts = text.split('paid');
        if (parts.length > 1) {
            return (
                <Text style={[styles.messageText, { color: textColor }]}>
                    {parts[0]}
                    <Text style={{ color: '#34C759', fontWeight: 'bold' }}>paid</Text>
                    {parts.slice(1).join('paid')}
                </Text>
            );
        }
        return <Text style={[styles.messageText, { color: textColor }]}>{text}</Text>;
    };

    const categories = [
        { id: 'all', label: 'All' },
        { id: 'unread', label: 'Unread' },
        { id: 'finance', label: 'Finance' },
        { id: 'crew', label: 'Crew' },
        { id: 'projects', label: 'Projects' },
        { id: 'system', label: 'System' }
    ];

    const renderInnerContent = () => {
        return (
            <SwipeTabWrapper segments={categories} activeSegment={activeTab} onSegmentChange={setActiveTab}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                {!!inboxError && <Text accessibilityRole="alert" style={{ color: '#FF453A', padding: 16 }}>{inboxError}</Text>}
                {/* Header */}
                <View style={styles.header}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                        <TouchableOpacity
                            onPress={() => {
                                if (router.canGoBack()) {
                                    router.back();
                                } else {
                                    router.replace("/");
                                }
                            }}
                            hitSlop={12}
                            style={[
                                styles.backButtonCircle,
                                { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)" }
                            ]}
                            accessibilityLabel="Back"
                        >
                            <PlatformIcon name="chevron.left" size={18} tintColor={textColor} />
                        </TouchableOpacity>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                        <HeaderCircleButton type="back" isDark={isDark} onPress={() => router.canGoBack() ? router.back() : router.replace('/home')} />
                        <Text style={[styles.headerTitle, { color: textColor }]}>Notifications</Text>
                    </View>
                    </View>
                    <Pressable
                        onPress={() => router.push('/notification-history')}
                        style={[styles.historyButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
                        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                    >
                        <Text style={[styles.historyText, { color: isDark ? '#FFFFFF' : '#3E3E3E' }]}>History</Text>
                    </Pressable>
                </View>

                {/* Custom Horizontal Segmented Control */}
                <SegmentedControl
                    segments={categories}
                    activeSegment={activeTab}
                    onSegmentChange={setActiveTab}
                    style={{ marginHorizontal: 16, marginBottom: 16 }}
                />

                <NotificationInboxControls unreadCount={unreadCount} loading={refreshing} onRefresh={fetchLocalNotifications} onMarkAllRead={markAllRead} />
                {/* List */}
                <FlatList
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? '#FFF' : '#000'} />}
                    data={groupedItems}
                    keyExtractor={(item) => item.id}
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: keyboardHeight > 0 ? keyboardHeight + 80 : (Platform.OS === 'ios' ? 80 : 90), gap: 12 }}
                    showsVerticalScrollIndicator={false}
                    scrollEnabled={scrollEnabled}
                    renderItem={({ item }) => {
                        if (item.isHeader) {
                            return (
                                <Text style={[styles.sectionHeader, { color: isDark ? '#8E8E93' : '#3E3E3E' }]}>
                                    {item.title}
                                </Text>
                            );
                        }

                        const isFinance = item.category === 'finance' && item.requestId;
                        const avatarColors = isFinance
                            ? getAvatarColors(item.action || '', isDark)
                            : (item.category === 'finance'
                               ? { bg: isDark ? 'rgba(0,122,255,0.15)' : 'rgba(0,122,255,0.12)', text: '#007AFF' }
                               : (item.category === 'crew'
                                  ? { bg: isDark ? 'rgba(255,149,0,0.15)' : 'rgba(255,149,0,0.12)', text: '#FF9500' }
                                  : { bg: isDark ? 'rgba(52,199,89,0.15)' : 'rgba(52,199,89,0.12)', text: '#34C759' }));
                        
                        const avatarLetter = item.subjectUser
                            ? item.subjectUser.charAt(0).toUpperCase()
                            : (item.user ? item.user.charAt(0).toUpperCase() : 'A');

                        return (
                            <Pressable 
                                style={({ pressed }) => [
                                    styles.card, 
                                    { 
                                        backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF',
                                        opacity: pressed ? 0.7 : 1
                                    }
                                ]}
                                onPress={() => handleNotificationPress(item)}
                            >
                                {/* Avatar */}
                                <View style={[styles.avatarContainer, { backgroundColor: avatarColors.bg }]}>
                                    <Text style={[styles.avatarText, { color: avatarColors.text }]}>{avatarLetter}</Text>
                                </View>

                                {/* Content */}
                                <View style={styles.content}>
                                    {isFinance ? (
                                        (() => {
                                            const actionInfo = getActionLabelAndColor(item.action || '');
                                            return (
                                                <Text style={[styles.messageText, { color: textColor }]}>
                                                    <Text style={{ fontWeight: '700' }}>{item.subjectUser}</Text>
                                                    {' '}
                                                    <Text style={{ color: actionInfo.color, fontWeight: '700' }}>{actionInfo.label}</Text>
                                                    {' '}
                                                    <Text style={{ fontWeight: '500', color: isDark ? '#D1D5DB' : '#4B5563' }}>{item.text}</Text>
                                                </Text>
                                            );
                                        })()
                                    ) : (
                                        renderMessage(item.text)
                                    )}
                                    
                                    <Text style={[styles.metadata, { color: subTextColor, marginTop: 3 }]}>
                                        {item.module}{item.projectCode ? ` • ${item.projectCode}` : ''} • {item.time}
                                    </Text>
                                </View>

                                {/* Unread Indicator */}
                                {item.unread ? (
                                    <View style={styles.unreadDot} />
                                ) : null}
                            </Pressable>
                        );
                    }}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <PlatformIcon name="bell" size={48} tintColor={isDark ? '#3A3A3C' : '#C7C7CC'} />
                            <Text style={[styles.emptyText, { color: isDark ? '#8E8E93' : '#8E8E93' }]}>No notifications found</Text>
                        </View>
                    }
                />

                {/* Bottom Gradient Mask */}
                <LinearGradient
                    colors={[
                        isDark ? 'rgba(28, 28, 30, 0)' : 'rgba(242, 242, 247, 0)',
                        isDark ? 'rgba(28, 28, 30, 0.7)' : 'rgba(242, 242, 247, 0.7)',
                        isDark ? '#1C1C1E' : '#F2F2F7',
                    ]}
                    locations={[0, 0.6, 1]}
                    style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        bottom: 0,
                        height: 120,
                        zIndex: 5,
                    }}
                    pointerEvents="none"
                />

                {/* Floating Search Bar */}
                <View style={[
                    styles.floatingSearchContainer,
                    {
                        backgroundColor: isDark ? 'rgba(44, 44, 46, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                        borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
                        bottom: keyboardHeight > 0 
                            ? keyboardHeight + 24 
                            : (Platform.OS === 'ios' ? 24 : (insets.bottom > 0 ? insets.bottom + 12 : 20)),
                    }
                ]}>
                    <PlatformIcon name="magnifyingglass" size={18} tintColor={isDark ? '#8E8E93' : '#AEAEB2'} style={styles.searchIcon} />
                    <TextInput
                        style={[styles.searchInput, { color: textColor }]}
                        placeholder="Search notifications..."
                        placeholderTextColor={isDark ? '#8E8E93' : '#AEAEB2'}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </KeyboardAvoidingView>
            </SwipeTabWrapper>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7', paddingTop: Platform.OS === 'ios' ? 12 : insets.top }}>
            {renderInnerContent()}
        </View>
    );
}

const styles = StyleSheet.create({
    screenWrapper: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'transparent',
    },
    dragHandleContainer: {
        alignItems: 'center',
        paddingVertical: 10,
        width: '100%',
    },
    dragHandle: {
        width: 36,
        height: 5,
        borderRadius: 2.5,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 12,
    },
    backButtonCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
    },
    headerTitle: {
        fontSize: 26,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    historyButton: {
        paddingVertical: 7,
        paddingHorizontal: 16,
        borderRadius: 20,
    },
    historyText: {
        fontSize: 14,
        fontWeight: '700',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 999,
        paddingHorizontal: 14,
        height: 40,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.02,
        shadowRadius: 2,
        elevation: 1,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        padding: 0,
    },
    floatingSearchContainer: {
        position: 'absolute',
        left: 24,
        right: 24,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 999,
        paddingHorizontal: 16,
        height: 48,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
        elevation: 6,
        zIndex: 10,
    },
    sectionHeader: {
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 8,
        marginTop: 14,
    },
    card: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 6,
        elevation: 0.5,
    },
    avatarContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    avatarText: {
        fontSize: 18,
        fontWeight: '800',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
    },
    messageText: {
        fontSize: 14,
        lineHeight: 19,
        fontWeight: '600',
        marginBottom: 4,
        letterSpacing: -0.15,
    },
    metadata: {
        fontSize: 11,
        fontWeight: '500',
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#007AFF',
        marginLeft: 12,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 80,
        gap: 12,
    },
    emptyText: {
        fontSize: 15,
        fontWeight: '500',
    },
    projectBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        marginHorizontal: 6,
    },
    projectBadgeText: {
        fontSize: 10,
        fontWeight: '700',
    },
    metadataRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    }
});
