import React from 'react';
import {
    ScrollView,
    StyleSheet,
    Platform,
    StatusBar as RNStatusBar,
    useWindowDimensions,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useTenantContext } from '@/context/TenantContext';
import { useUserContext } from '@/context/UserProvider';
import { OrganizationAccountSection } from '@/components/organization-settings/OrganizationAccountSection';
import { OrganizationSettingsMasterDetail } from '@/components/organization-settings/OrganizationSettingsMasterDetail';

export default function OrganizationAccountScreen() {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isDesktopWeb = Platform.OS === 'web' && width >= 768;
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const insets = useSafeAreaInsets();
    const { activeTenant, tenantRole } = useTenantContext();
    const { user, profile } = useUserContext();

    React.useEffect(() => {
        if (Platform.OS === 'web' && isDesktopWeb) {
            router.replace('/(tabs)/home/organization-settings/account');
        }
    }, [isDesktopWeb]);

    const bgColor = isDark ? '#000000' : '#F2F2F7';
    const cardBgColor = isDark ? '#1C1C1E' : '#FFFFFF';
    const textColor = isDark ? '#FFFFFF' : '#000000';
    const subtextColor = isDark ? '#8E8E93' : '#64748B';
    const primaryColor = activeTenant?.primary_color || '#007AFF';

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: true,
                    title: 'My Account',
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
                    paddingBottom: insets.bottom + 40,
                    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 24) + 84 : 16,
                    gap: 16,
                }}
                showsVerticalScrollIndicator={false}
            >
                <OrganizationAccountSection
                    user={user}
                    profile={profile}
                    activeTenant={activeTenant}
                    tenantRole={tenantRole}
                    primaryColor={primaryColor}
                    isDark={isDark}
                    textColor={textColor}
                    subtextColor={subtextColor}
                    cardBgColor={cardBgColor}
                />
            </ScrollView>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
