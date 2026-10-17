import React, { useState, useEffect } from 'react';
import {
    ScrollView,
    StyleSheet,
    Platform,
    StatusBar as RNStatusBar,
    View,
    Alert,
    Keyboard,
    LayoutAnimation,
    useWindowDimensions,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/context/ThemeContext';
import { useTenantContext } from '@/context/TenantContext';
import { useUserContext } from '@/context/UserProvider';
import * as Haptics from 'expo-haptics';
import { SwiftUIUnsavedBanner } from '@/components/ui/SwiftUIUnsavedBanner';
import { OrganizationNotificationsSection } from '@/components/organization-settings/OrganizationNotificationsSection';
import { OrganizationSettingsMasterDetail } from '@/components/organization-settings/OrganizationSettingsMasterDetail';

const DEFAULT_NOTIFICATIONS = {
    pushAlerts: true,
    emailDigests: true,
};

export default function OrganizationNotificationsScreen() {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isDesktopWeb = Platform.OS === 'web' && width >= 768;
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const insets = useSafeAreaInsets();
    const { activeTenant } = useTenantContext();
    const { user } = useUserContext();

    useEffect(() => {
        if (Platform.OS === 'web' && isDesktopWeb) {
            router.replace('/(tabs)/home/organization-settings/notifications');
        }
    }, [isDesktopWeb]);

    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

    useEffect(() => {
        const showListener = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            () => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setIsKeyboardVisible(true);
            }
        );
        const hideListener = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            () => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setIsKeyboardVisible(false);
            }
        );
        return () => {
            showListener.remove();
            hideListener.remove();
        };
    }, []);

    const storageKey = `@tenant_notifs_${activeTenant?.id || 'default'}`;

    const [savedNotifications, setSavedNotifications] = useState<Record<string, boolean>>(DEFAULT_NOTIFICATIONS);
    const [notifications, setNotifications] = useState<Record<string, boolean>>(DEFAULT_NOTIFICATIONS);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load persisted notification settings
    useEffect(() => {
        let isMounted = true;
        const loadPersisted = async () => {
            try {
                const localData = await AsyncStorage.getItem(storageKey);
                if (isMounted) {
                    if (localData) {
                        const parsed = JSON.parse(localData);
                        const merged = { ...DEFAULT_NOTIFICATIONS, ...parsed };
                        setSavedNotifications(merged);
                        setNotifications(merged);
                    } else {
                        setSavedNotifications(DEFAULT_NOTIFICATIONS);
                        setNotifications(DEFAULT_NOTIFICATIONS);
                    }
                    setIsLoaded(true);
                }
            } catch (err) {
                console.error('Failed to load notifications settings:', err);
                if (isMounted) setIsLoaded(true);
            }
        };

        loadPersisted();
        return () => {
            isMounted = false;
        };
    }, [storageKey]);

    const hasChanges = isLoaded && JSON.stringify(notifications) !== JSON.stringify(savedNotifications);

    const handleSave = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setIsSaving(true);
        try {
            const cloned = { ...notifications };
            await AsyncStorage.setItem(storageKey, JSON.stringify(cloned));
            setSavedNotifications(cloned);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Settings Saved', 'Notification preferences have been updated successfully.');
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to save notification preferences.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDiscard = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setNotifications({ ...savedNotifications });
    };

    const bgColor = isDark ? '#000000' : '#F2F2F7';
    const cardBgColor = isDark ? '#1C1C1E' : '#FFFFFF';
    const textColor = isDark ? '#FFFFFF' : '#000000';
    const subtextColor = isDark ? '#8E8E93' : '#64748B';
    const borderColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)';
    const primaryColor = activeTenant?.primary_color || '#10B981';

    const bannerTopPosition = Platform.OS === 'android'
        ? (RNStatusBar.currentHeight || 24) + 60
        : insets.top + 48;

    const bannerBottomPosition = (insets.bottom || 0) + 16;

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: true,
                    title: 'Notifications',
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

            <ScrollView
                style={[styles.container, { backgroundColor: bgColor }]}
                contentInsetAdjustmentBehavior="automatic"
                contentContainerStyle={{
                    paddingHorizontal: 16,
                    paddingBottom: insets.bottom + (hasChanges ? 90 : 40),
                    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 24) + 84 : 16,
                    gap: 16,
                }}
                showsVerticalScrollIndicator={false}
            >
                <OrganizationNotificationsSection
                    notifications={notifications}
                    setNotifications={setNotifications}
                    primaryColor={primaryColor}
                    isDark={isDark}
                    textColor={textColor}
                    subtextColor={subtextColor}
                    cardBgColor={cardBgColor}
                    borderColor={borderColor}
                    userEmail={user?.email}
                />
            </ScrollView>

            {/* Floating Unsaved Changes Banner */}
            {hasChanges && (
                <View
                    style={[
                        styles.unsavedBannerWrapper,
                        isKeyboardVisible
                            ? { top: bannerTopPosition }
                            : { bottom: bannerBottomPosition }
                    ]}
                >
                    <SwiftUIUnsavedBanner
                        onCancel={handleDiscard}
                        onSave={handleSave}
                        saving={isSaving}
                        isDark={isDark}
                        title="Unsaved notification changes"
                    />
                </View>
            )}
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    unsavedBannerWrapper: {
        position: 'absolute',
        left: 16,
        right: 16,
        zIndex: 999,
    },
});
