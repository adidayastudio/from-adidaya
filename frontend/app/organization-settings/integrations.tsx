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
import { OrganizationIntegrationsSection } from '@/components/organization-settings/OrganizationIntegrationsSection';
import { OrganizationSettingsMasterDetail } from '@/components/organization-settings/OrganizationSettingsMasterDetail';

export default function OrganizationIntegrationsScreen() {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isDesktopWeb = Platform.OS === 'web' && width >= 768;
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const insets = useSafeAreaInsets();
    const { activeTenant } = useTenantContext();

    React.useEffect(() => {
        if (Platform.OS === 'web' && isDesktopWeb) {
            router.replace('/(tabs)/home/organization-settings/integrations');
        }
    }, [isDesktopWeb]);

    const bgColor = isDark ? '#000000' : '#F2F2F7';
    const cardBgColor = isDark ? '#1C1C1E' : '#FFFFFF';
    const textColor = isDark ? '#FFFFFF' : '#000000';
    const subtextColor = isDark ? '#8E8E93' : '#64748B';
    const borderColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)';
    const primaryColor = activeTenant?.primary_color || '#007AFF';

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: true,
                    title: 'Integrations',
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
                <OrganizationIntegrationsSection
                    activeTenant={activeTenant}
                    primaryColor={primaryColor}
                    isDark={isDark}
                    textColor={textColor}
                    subtextColor={subtextColor}
                    cardBgColor={cardBgColor}
                    borderColor={borderColor}
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
