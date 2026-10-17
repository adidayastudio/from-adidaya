import { useAdidayaNotifications } from '@/hooks/useAdidayaNotifications';
import { notificationDestination } from '@/lib/notificationDestination';
import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import {
    Host,
    BottomSheet,
    VStack,
    HStack,
    Spacer,
    Button,
    Text as SwiftUIText,
    Form,
    Section,
    Picker,
    TextField,
} from '@expo/ui/swift-ui';
import {
    padding,
    frame,
    background,
    ignoreSafeArea,
    cornerRadius,
    buttonStyle,
    tint,
} from '@expo/ui/swift-ui/modifiers';
import { useTheme } from '@/context/ThemeContext';
import { useFinance } from '@/context/FinanceContext';
import { getLocalNotifications, markNotificationsAsRead, LocalNotification } from '@/lib/api/notifications';
import { parseNotificationDate } from '@/constants/mockNotifications';
import { isToday, differenceInDays, format } from 'date-fns';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

interface SwiftUINotificationsSheetProps {
    isOpened: boolean;
    onClose: () => void;
}

const CATEGORY_TABS = ['All', 'Unread', 'Finance', 'Crew', 'Projects'];

export const SwiftUINotificationsSheet: React.FC<SwiftUINotificationsSheetProps> = ({
    isOpened,
    onClose,
}) => {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const router = useRouter();

    const sheetBg = 'clear';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#8E8E93';
    const cardBg = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.85)';

    const { teamPurchasing, teamReimbursement, refreshData } = useFinance();
    const { notifications: localNotifications, refresh, markRead } = useAdidayaNotifications();
    const [activeTabIdx, setActiveTabIdx] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => { if (isOpened) void refresh(); }, [isOpened, refresh]);

    const combined = useMemo(() => {
        return [...localNotifications]
            .sort((a, b) => {
                const dateA = parseNotificationDate(a.time).getTime();
                const dateB = parseNotificationDate(b.time).getTime();
                return dateB - dateA;
            });
    }, [localNotifications]);

    const filtered = useMemo(() => {
        return combined.filter(item => {
            if (activeTabIdx === 1 && !item.unread) return false;
            if (activeTabIdx === 2 && item.category !== 'finance') return false;
            if (activeTabIdx === 3 && item.category !== 'crew') return false;
            if (activeTabIdx === 4 && item.category !== 'projects') return false;

            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase();
                const textMatch = item.text.toLowerCase().includes(query);
                const userMatch = item.user.toLowerCase().includes(query);
                const moduleMatch = item.module.toLowerCase().includes(query);
                const refMatch = item.ref ? item.ref.toLowerCase().includes(query) : false;
                return textMatch || userMatch || moduleMatch || refMatch;
            }
            return true;
        });
    }, [combined, activeTabIdx, searchQuery]);

    const todayItems = useMemo(() => filtered.filter(item => isToday(parseNotificationDate(item.time))), [filtered]);
    const yesterdayItems = useMemo(() => filtered.filter(item => {
        const d = parseNotificationDate(item.time);
        return !isToday(d) && differenceInDays(new Date(), d) === 1;
    }), [filtered]);
    const olderItems = useMemo(() => filtered.filter(item => {
        const d = parseNotificationDate(item.time);
        return !isToday(d) && differenceInDays(new Date(), d) > 1;
    }), [filtered]);

    const handleHistory = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onClose();
        router.push('/notification-history');
    };

    const handleItemPress = (item: any) => {
        void markRead(item.id);
        const destination = notificationDestination(item.link);
        if (destination) { onClose(); router.push(destination as any); return; }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onClose();
        if (item.module === 'Announcement' || item.ref?.startsWith('ann-') || item.type === 'announcement' || item.text?.toLowerCase().includes('announcement')) {
            const targetId = item.ref || item.text || item.id;
            router.push({
                pathname: '/announcement-detail',
                params: {
                    id: targetId,
                }
            });
            return;
        } else if (item.category === 'finance' && item.requestId) {
            router.push({
                pathname: '/(tabs)/home/finance',
                params: {
                    requestId: item.requestId,
                    requestType: item.requestType || 'purchasing',
                }
            });
        } else if (item.category === 'finance') {
            router.push('/(tabs)/home/finance');
        } else if (item.category === 'crew') {
            router.push('/(tabs)/home/clock-module');
        } else if (item.category === 'projects') {
            router.push('/(tabs)/projects');
        } else if (item.link) {
            router.push(item.link as any);
        } else {
            router.push('/(tabs)/home/finance');
        }
    };

    const renderItem = (item: any) => {
        const titleText = item.subjectUser
            ? `${item.subjectUser} ${item.action || 'submitted'} ${item.ref}: ${item.text}`
            : item.text;

        return (
            <Button
                key={item.id}
                variant="plain"
                onPress={() => handleItemPress(item)}
                modifiers={[
                    frame({ maxWidth: Infinity, alignment: 'leading' }),
                    padding({ vertical: 6 }),
                ]}
            >
                <HStack spacing={10} alignment="center">
                    {item.unread && (
                        <SwiftUIText size={10} color="#007AFF">●</SwiftUIText>
                    )}
                    <VStack spacing={4} alignment="leading">
                        <SwiftUIText size={14} weight="semibold" color={textColor}>
                            {titleText}
                        </SwiftUIText>
                        <SwiftUIText size={12} color={subtextColor}>
                            {`${item.module} • ${item.user} • ${item.time}`}
                        </SwiftUIText>
                    </VStack>
                    <Spacer />
                </HStack>
            </Button>
        );
    };

    return (
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet
                isOpened={isOpened}
                presentationDetents={[0.85, 0.95]}
                presentationDragIndicator="hidden"
                onIsOpenedChange={(opened) => {
                    if (!opened) onClose();
                }}
            >
                <VStack
                    spacing={0}
                    modifiers={[
                        ignoreSafeArea({ edges: 'bottom' }),
                        background(sheetBg),
                    ]}
                >
                    {/* Header */}
                    <HStack
                        alignment="center"
                        modifiers={[
                            padding({ top: 16, leading: 20, trailing: 20, bottom: 8 }),
                        ]}
                    >
                        <SwiftUIText size={22} weight="bold" color={textColor}>
                            Notifications
                        </SwiftUIText>
                        <Spacer />
                        <Button
                            variant="glass"
                            color={isDark ? '#FFFFFF' : '#1C1C1E'}
                            onPress={handleHistory}
                            modifiers={[
                                padding({ horizontal: 6 }),
                            ]}
                        >
                            <SwiftUIText size={13} weight="semibold" color={isDark ? '#FFFFFF' : '#1C1C1E'}>
                                History
                            </SwiftUIText>
                        </Button>
                        <Button
                            systemImage="xmark"
                            role="cancel"
                            color="gray"
                            onPress={onClose}
                        />
                    </HStack>

                    {/* Segmented Filter */}
                    <HStack modifiers={[padding({ horizontal: 20, bottom: 10 })]}>
                        <Picker
                            label="Category"
                            options={CATEGORY_TABS}
                            selectedIndex={activeTabIdx}
                            onOptionSelected={(e) => setActiveTabIdx(e.nativeEvent.index)}
                            variant="segmented"
                            modifiers={[
                                frame({ maxWidth: Infinity }),
                            ]}
                        />
                    </HStack>

                    {/* Scrollable Form Sections */}
                    <Form modifiers={[background(sheetBg)]}>
                        {todayItems.length > 0 && (
                            <Section title="Today">
                                {todayItems.map(renderItem)}
                            </Section>
                        )}

                        {yesterdayItems.length > 0 && (
                            <Section title="Yesterday">
                                {yesterdayItems.map(renderItem)}
                            </Section>
                        )}

                        {olderItems.length > 0 && (
                            <Section title="Earlier">
                                {olderItems.map(renderItem)}
                            </Section>
                        )}

                        {filtered.length === 0 && (
                            <Section>
                                <VStack alignment="center" spacing={8} modifiers={[padding({ vertical: 40 }), frame({ maxWidth: Infinity })]}>
                                    <SwiftUIText size={15} color={subtextColor}>
                                        No notifications found
                                    </SwiftUIText>
                                </VStack>
                            </Section>
                        )}
                    </Form>
                </VStack>
            </BottomSheet>
        </Host>
    );
};
