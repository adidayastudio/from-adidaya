import { useAdidayaNotifications } from '@/hooks/useAdidayaNotifications';
import { notificationDestination } from '@/lib/notificationDestination';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { HeaderBlurBackground } from '@/components/ui/HeaderBlurBackground';
import { MOCK_NOTIFICATIONS, parseNotificationDate } from '@/constants/mockNotifications';
import { getLocalNotifications } from '@/lib/api/notifications';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { startOfMonth, subMonths, format } from 'date-fns';
import { useRouter, Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useFinance } from '@/context/FinanceContext';
import {
    FlatList,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
    ActivityIndicator,
    StatusBar as RNStatusBar
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

export default function NotificationHistoryScreen() {
    const insets = useSafeAreaInsets();
    const { teamPurchasing, teamReimbursement, refreshData } = useFinance();
    const { notifications: localNotifications, loading, error: inboxError, markRead } = useAdidayaNotifications();

    const { resolvedTheme } = useTheme();
    const router = useRouter();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const subTextColor = Colors[resolvedTheme].icon;

    // Filters state
    const [activeTab, setActiveTab] = useState('all'); // 'all' | 'this_month' | 'past_3_months'
    const [searchQuery, setSearchQuery] = useState('');
    const [keyboardHeight, setKeyboardHeight] = useState(0);

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

    // --- History Boundaries (max 3 months) ---
    const now = new Date();
    const threeMonthsAgo = subMonths(now, 3);
    const thisMonthStart = startOfMonth(now);

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
                return { bg: isDark ? 'rgba(52,199,89,0.15)' : 'rgba(52,199,89,0.12)', text: '#34C759' };
            case 'approved':
                return { bg: isDark ? 'rgba(0,122,255,0.15)' : 'rgba(0,122,255,0.12)', text: '#007AFF' };
            case 'rejected':
                return { bg: isDark ? 'rgba(255,59,48,0.15)' : 'rgba(255,59,48,0.12)', text: '#FF3B30' };
            case 'revision':
                return { bg: isDark ? 'rgba(255,149,0,0.15)' : 'rgba(255,149,0,0.12)', text: '#FF9500' };
            case 'submitted':
            default:
                return { 
                    bg: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)', 
                    text: isDark ? '#FFFFFF' : '#000000' 
                };
        }
    };

    const getActionLabelAndColor = (action: string) => {
        switch (action.toLowerCase()) {
            case 'paid':
                return { label: 'paid', color: '#34C759' };
            case 'approved':
                return { label: 'approved', color: '#007AFF' };
            case 'rejected':
                return { label: 'rejected', color: '#FF3B30' };
            case 'revision':
                return { label: 'requested revision', color: '#FF9500' };
            case 'draft':
                return { label: 'draft', color: '#8E8E93' };
            case 'submitted':
            default:
                return { label: 'submitted', color: undefined };
        }
    };

    // Map team purchasing requests to notification objects
    const purchasingNotifications = (teamPurchasing || [])
        .filter(r => r.statusTag !== 'draft')
        .map((r: any) => {
            const timeStr = formatRequestTime(r);
            const creatorName = r.profile?.nickname || r.profile?.full_name || 'System';
            
            const subjectUser = r.statusTag === 'paid' ? 'Finance' : 
                               (r.statusTag === 'approved' || r.statusTag === 'rejected' || r.statusTag === 'revision'
                                ? capitalizeName(r.approved_by_name || 'Finance')
                                : capitalizeName(creatorName));
            
            const actionWord = r.statusTag === 'paid' ? 'paid' : 
                               (r.statusTag === 'approved' ? 'approved' : 
                                (r.statusTag === 'rejected' ? 'rejected' : 
                                 (r.statusTag === 'revision' ? 'revision' : 'submitted')));

            return {
                id: `purchasing-${r.id}`,
                text: r.title,
                module: 'Purchasing',
                user: subjectUser,
                time: timeStr,
                unread: isRequestRecent(r),
                category: 'finance' as const,
                requestId: r.id,
                requestType: 'purchasing' as const,
                projectCode: r.project || 'NA',
                action: actionWord,
                ref: r.ref,
                subjectUser,
            };
        });

    // Map team reimbursement requests to notification objects
    const reimbursementNotifications = (teamReimbursement || [])
        .filter(r => r.statusTag !== 'draft')
        .map((r: any) => {
            const timeStr = formatRequestTime(r);
            const creatorName = r.profile?.nickname || r.profile?.full_name || 'System';

            const subjectUser = r.statusTag === 'paid' ? 'Finance' : 
                               (r.statusTag === 'approved' || r.statusTag === 'rejected' || r.statusTag === 'revision'
                                ? capitalizeName(r.approved_by_name || 'Finance')
                                : capitalizeName(creatorName));
            
            const actionWord = r.statusTag === 'paid' ? 'paid' : 
                               (r.statusTag === 'approved' ? 'approved' : 
                                (r.statusTag === 'rejected' ? 'rejected' : 
                                 (r.statusTag === 'revision' ? 'revision' : 'submitted')));

            return {
                id: `reimbursement-${r.id}`,
                text: r.title,
                module: 'Reimbursement',
                user: subjectUser,
                time: timeStr,
                unread: isRequestRecent(r),
                category: 'finance' as const,
                requestId: r.id,
                requestType: 'reimbursement' as const,
                projectCode: r.project || 'NA',
                action: actionWord,
                ref: r.ref,
                subjectUser,
            };
        });

    // Combine real local/Supabase notifications with real finance notifications (no fake mocks)
    const combinedNotifications = localNotifications;

    const historyNotifications = [...combinedNotifications].sort((a, b) => parseNotificationDate(b.time).getTime() - parseNotificationDate(a.time).getTime());

    // Apply Segmented Filter and Search Query
    const filteredNotifications = historyNotifications.filter(item => {
        const date = parseNotificationDate(item.time);

        // Segment Tab filter
        if (activeTab === 'this_month') {
            if (date < thisMonthStart) return false;
        } else if (activeTab === 'past_3_months') {
            if (date >= thisMonthStart) return false;
        }

        // Search filter
        const matchesSearch = item.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.module.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.ref && item.ref.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (item.projectCode && item.projectCode.toLowerCase().includes(searchQuery.toLowerCase()));

        return matchesSearch;
    });

    const handleNotificationPress = (notification: any) => {
        void markRead(notification.id);
        const destination = notificationDestination(notification.link);
        if (destination) { router.push(destination as any); return; }

        if (notification.module === 'Announcement' || notification.ref?.startsWith('ann-') || notification.type === 'announcement' || notification.text?.toLowerCase().includes('announcement')) {
            const targetId = notification.ref || notification.text || notification.id;
            if (router.canDismiss()) {
                router.dismissAll();
            }
            router.navigate({
                pathname: '/announcement-detail',
                params: {
                    id: targetId,
                }
            });
            return;
        }

        if (notification.requestId && notification.requestType) {
            if (router.canDismiss()) {
                router.dismissAll();
            }
            router.navigate({
                pathname: '/(tabs)/home/finance',
                params: {
                    requestId: notification.requestId,
                    requestType: notification.requestType,
                }
            });
            return;
        }

        if (notification.category === 'finance') {
            if (router.canDismiss()) {
                router.dismissAll();
            }
            router.navigate('/(tabs)/home/finance');
            return;
        }

        if (notification.category === 'projects') {
            if (router.canDismiss()) {
                router.dismissAll();
            }
            router.navigate('/(tabs)/projects');
            return;
        }

        const action = notification.action || (
            notification.module === 'Payroll' ? 'payroll'
                : notification.module === 'Daily Log' ? 'daily_log'
                : 'directory'
        );
        if (router.canDismiss()) {
            router.dismissAll();
        }
        router.navigate({
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
    };

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

    const tabs = [
        { id: 'all', label: 'All' },
        { id: 'this_month', label: 'This Month' },
        { id: 'past_3_months', label: 'Past 3 Months' }
    ];

    return (
        <View style={{ flex: 1, backgroundColor: isDark ? '#000000' : '#F2F2F7' }}>
            <Stack.Screen
                options={{
                    headerShown: true,
                    title: 'History',
                    headerLargeTitle: false,
                    headerTransparent: Platform.OS === 'ios',
                    headerStyle: { backgroundColor: Platform.OS === 'ios' ? 'transparent' : (isDark ? '#000000' : '#F2F2F7') },
                    headerTintColor: textColor,
                    headerTitleStyle: { color: textColor },
                    headerShadowVisible: false,
                    headerBackButtonDisplayMode: 'minimal',
                    headerBackTitle: ' ',
                }}
            />
            {/* Notifications History List */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={textColor} />
                </View>
            ) : (
                <FlatList
                    data={filteredNotifications}
                    keyExtractor={(item) => item.id}
                    style={{ flex: 1, backgroundColor: isDark ? '#000000' : '#F2F2F7' }}
                    contentInsetAdjustmentBehavior="automatic"
                    contentContainerStyle={{
                        paddingHorizontal: 16,
                        paddingBottom: insets.bottom + 80,
                        paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 24) + 16 : 16,
                        gap: 12,
                    }}
                    showsVerticalScrollIndicator={false}
                        ListHeaderComponent={
                            <View style={[styles.segmentedContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                                {tabs.map((tab) => {
                                    const isActive = activeTab === tab.id;
                                    return (
                                        <Pressable
                                            key={tab.id}
                                            onPress={() => setActiveTab(tab.id)}
                                            style={[
                                                styles.tabItem,
                                                isActive && (isDark ? styles.activeTabDark : styles.activeTabLight)
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.tabText,
                                                    { color: isActive ? (isDark ? '#FFFFFF' : '#000000') : (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)') },
                                                    isActive && styles.activeTabText
                                                ]}
                                            >
                                                {tab.label}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        }
                        renderItem={({ item }) => {
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
                                                const actionColor = actionInfo.color || (isDark ? '#FFFFFF' : '#000000');
                                                return (
                                                    <Text style={[styles.messageText, { color: textColor }]}>
                                                        <Text style={{ fontWeight: '700' }}>{item.subjectUser}</Text>
                                                        {' '}
                                                        <Text style={{ color: actionColor, fontWeight: '700' }}>{actionInfo.label}</Text>
                                                        {' '}
                                                        <Text style={{ fontWeight: '600' }}>{item.ref}</Text>
                                                        : {item.text}
                                                    </Text>
                                                );
                                            })()
                                        ) : (
                                            renderMessage(item.text)
                                        )}
                                        
                                        {isFinance ? (
                                            <View style={styles.metadataRow}>
                                                <Text style={[styles.metadata, { color: subTextColor }]}>
                                                    {item.module}
                                                </Text>
                                                <View style={[styles.projectBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                                                    <Text style={[styles.projectBadgeText, { color: textColor }]}>{item.projectCode}</Text>
                                                </View>
                                                <Text style={[styles.metadata, { color: subTextColor }]}>
                                                    • {item.time}
                                                </Text>
                                            </View>
                                        ) : (
                                            <Text style={[styles.metadata, { color: isDark ? 'rgba(255,255,255,0.4)' : '#8E8E93' }]}>
                                                {item.module} • {item.user} • {item.time}
                                            </Text>
                                        )}
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
                                <Text style={[styles.emptyText, { color: isDark ? '#8E8E93' : '#8E8E93' }]}>No notification history found</Text>
                            </View>
                        }
                    />
                )}

                {/* Bottom Gradient Mask */}
                <LinearGradient
                    colors={[
                        isDark ? 'rgba(28, 28, 30, 0)' : 'rgba(242, 242, 247, 0)',
                        isDark ? 'rgba(28, 28, 30, 0.95)' : 'rgba(242, 242, 247, 0.95)',
                        isDark ? '#1C1C1E' : '#F2F2F7'
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
                        borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                        bottom: keyboardHeight > 0 
                            ? keyboardHeight + 24 
                            : (Platform.OS === 'ios' ? 16 : (insets.bottom > 0 ? insets.bottom + 12 : 20)),
                    }
                ]}>
                    <PlatformIcon name="magnifyingglass" size={18} tintColor={isDark ? '#8E8E93' : '#AEAEB2'} style={styles.searchIcon} />
                    <TextInput
                        style={[styles.searchInput, { color: textColor }]}
                        placeholder="Search history..."
                        placeholderTextColor={isDark ? '#8E8E93' : '#AEAEB2'}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    segmentedContainer: {
        flexDirection: 'row',
        marginHorizontal: 16,
        marginBottom: 16,
        padding: 4,
        borderRadius: 24,
        alignItems: 'center',
    },
    tabItem: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    activeTabLight: {
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1.5,
    },
    activeTabDark: {
        backgroundColor: '#3A3A3C',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 1.5,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '500',
    },
    activeTabText: {
        fontWeight: '700',
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
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        padding: 0,
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
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    }
});
