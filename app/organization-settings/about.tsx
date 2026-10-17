import React, { useEffect } from 'react';
import {
    ScrollView,
    StyleSheet,
    Platform,
    View,
    useWindowDimensions,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { OrganizationLegalSection, LegalTab } from '@/components/organization-settings/OrganizationLegalSection';

export default function OrganizationLegalScreen() {
    const router = useRouter();
    const { tab } = useLocalSearchParams<{ tab?: LegalTab }>();
    const { width } = useWindowDimensions();
    const isDesktopWeb = Platform.OS === 'web' && width >= 768;
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const insets = useSafeAreaInsets();

    const initialTab: LegalTab = (tab === 'terms' || tab === 'privacy') ? tab : 'about';

    useEffect(() => {
        if (Platform.OS === 'web' && isDesktopWeb) {
            router.replace(`/(tabs)/home/organization-settings/${initialTab}` as any);
        }
    }, [isDesktopWeb, initialTab]);

    const textColor = isDark ? '#FFFFFF' : '#000000';
    const subtextColor = isDark ? '#8E8E93' : '#64748B';
    const cardBgColor = isDark ? '#1C1C1E' : '#FFFFFF';
    const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}>
            <Stack.Screen
                options={{
                    title: initialTab === 'terms' ? 'Terms of Service' : initialTab === 'privacy' ? 'Privacy Policy' : 'About Forma',
                    headerLargeTitle: false,
                    headerShadowVisible: false,
                    headerStyle: { backgroundColor: isDark ? '#000000' : '#F2F2F7' },
                    headerTintColor: isDark ? '#FFFFFF' : '#000000',
                }}
            />
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={[
                    styles.scrollContent,
                    {
                        paddingTop: 16,
                        paddingBottom: Math.max(insets.bottom, 24) + 40,
                    },
                ]}
                showsVerticalScrollIndicator={false}
            >
                <OrganizationLegalSection
                    initialTab={initialTab}
                    isDark={isDark}
                    textColor={textColor}
                    subtextColor={subtextColor}
                    cardBgColor={cardBgColor}
                    borderColor={borderColor}
                />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
    },
});
