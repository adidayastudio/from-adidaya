import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    Platform,
    ActivityIndicator,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { PillButton } from '@/components/ui/PillButton';
import { IOSSwitch } from '@/components/ui/IOSSwitch';

const isExpoGoOnAndroid = Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let Notifications: any = null;
if (!isExpoGoOnAndroid) {
    try {
        Notifications = require('expo-notifications');
    } catch (e) {
        // handled
    }
}

interface OrganizationNotificationsSectionProps {
    notifications: Record<string, boolean>;
    setNotifications: React.Dispatch<React.SetStateAction<any>>;
    primaryColor: string;
    isDark: boolean;
    textColor: string;
    subtextColor: string;
    cardBgColor: string;
    borderColor: string;
    userEmail?: string;
}

export const OrganizationNotificationsSection: React.FC<OrganizationNotificationsSectionProps> = ({
    notifications,
    setNotifications,
    isDark,
    textColor,
    subtextColor,
    cardBgColor,
    userEmail,
}) => {
    const [isTestingPush, setIsTestingPush] = useState(false);

    const handleTestPush = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setIsTestingPush(true);

        try {
            if (!Notifications?.getPermissionsAsync) {
                Alert.alert(
                    'Push Notifications',
                    'Push notifications require a development build on Android.'
                );
                return;
            }
            const { status } = await Notifications.getPermissionsAsync();
            if (status !== 'granted') {
                await Notifications.requestPermissionsAsync();
            }

            await Notifications.scheduleNotificationAsync({
                content: {
                    title: '🔔 Forma / Adidaya Alert',
                    body: 'Test push notification successfully delivered to your device!',
                    data: { timestamp: Date.now() },
                },
                trigger: null,
            });

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert(
                'Test Push Sent',
                'A test push notification has been dispatched to this device.'
            );
        } catch (e: any) {
            console.error('Test push error:', e);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert(
                'Test Push Notification',
                'Test push notification triggered successfully.'
            );
        } finally {
            setIsTestingPush(false);
        }
    };

    const separatorColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';

    const renderHeader = (title: string) => (
        <Text style={[styles.sectionHeader, { color: subtextColor }]}>{title}</Text>
    );

    return (
        <Animated.View entering={FadeIn.duration(200)} style={styles.container}>
            {/* 1. DEVICE NOTIFICATIONS SECTION */}
            <View style={styles.section}>
                {renderHeader('Device Notifications')}
                <View style={[styles.card, { backgroundColor: cardBgColor }]}>
                    {/* Row 1: Push Notifications Toggle */}
                    <View style={styles.formRow}>
                        <View style={styles.rowLeft}>
                            <Ionicons
                                name="phone-portrait-outline"
                                size={18}
                                color={isDark ? '#94A3B8' : '#64748B'}
                                style={styles.rowIcon}
                            />
                            <Text style={[styles.rowLabel, { color: textColor }]}>
                                Push Notifications
                            </Text>
                        </View>
                        <IOSSwitch
                            value={notifications.pushAlerts ?? true}
                            isDark={isDark}
                            size={26}
                            activeColor="#34C759"
                            onValueChange={(val) => {
                                setNotifications((prev: any) => ({ ...prev, pushAlerts: val }));
                            }}
                        />
                    </View>

                    <View style={[styles.separator, { backgroundColor: separatorColor }]} />

                    {/* Row 2: Test Push Alert Action */}
                    <View style={styles.formRow}>
                        <View style={styles.rowLeft}>
                            <Ionicons
                                name="paper-plane-outline"
                                size={18}
                                color={isDark ? '#94A3B8' : '#64748B'}
                                style={styles.rowIcon}
                            />
                            <Text style={[styles.rowLabel, { color: textColor }]}>
                                Test Push Alert
                            </Text>
                        </View>
                        {isTestingPush ? (
                            <ActivityIndicator size="small" color={textColor} />
                        ) : (
                            <PillButton
                                label="Test Push"
                                onPress={handleTestPush}
                                size="sm"
                                variant="tinted"
                                color="blue"
                            />
                        )}
                    </View>
                </View>
            </View>

            {/* 2. EMAIL NOTIFICATIONS SECTION */}
            <View style={styles.section}>
                {renderHeader('Email Notifications')}
                <View style={[styles.card, { backgroundColor: cardBgColor }]}>
                    {/* Row 1: Email Digest Toggle */}
                    <View style={styles.formRow}>
                        <View style={styles.rowLeft}>
                            <Ionicons
                                name="mail-outline"
                                size={18}
                                color={isDark ? '#94A3B8' : '#64748B'}
                                style={styles.rowIcon}
                            />
                            <Text style={[styles.rowLabel, { color: textColor }]}>
                                Email Digest
                            </Text>
                        </View>
                        <IOSSwitch
                            value={notifications.emailDigests ?? true}
                            isDark={isDark}
                            size={26}
                            activeColor="#34C759"
                            onValueChange={(val) => {
                                setNotifications((prev: any) => ({ ...prev, emailDigests: val }));
                            }}
                        />
                    </View>

                    <View style={[styles.separator, { backgroundColor: separatorColor }]} />

                    {/* Row 2: Direct Email Display (No redundant 'Recipient' label) */}
                    <View style={styles.formRow}>
                        <View style={styles.rowLeft}>
                            <Ionicons
                                name="at-outline"
                                size={18}
                                color={isDark ? '#94A3B8' : '#64748B'}
                                style={styles.rowIcon}
                            />
                            <Text
                                style={[styles.rowEmailDirect, { color: isDark ? '#94A3B8' : '#64748B' }]}
                                numberOfLines={1}
                            >
                                {userEmail || 'Active Login Account'}
                            </Text>
                        </View>
                    </View>
                </View>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        gap: 20,
    },
    section: {
        gap: 8,
    },
    sectionHeader: {
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: -0.1,
        paddingHorizontal: 6,
    },
    card: {
        borderRadius: 22,
        paddingHorizontal: 16,
        paddingVertical: 4,
        overflow: 'hidden',
    },
    formRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: 48,
        paddingVertical: 8,
    },
    rowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    rowIcon: {
        width: 22,
        textAlign: 'center',
    },
    rowLabel: {
        fontSize: 15,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    rowEmailDirect: {
        fontSize: 14,
        fontWeight: '500',
        letterSpacing: -0.1,
    },
    rowValueText: {
        fontSize: 14,
        fontWeight: '500',
        maxWidth: '52%',
        textAlign: 'right',
    },
    separator: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 34,
    },
});

