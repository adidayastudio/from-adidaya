import React from 'react';
import { View, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { OrganizationSettingsMasterDetail } from '@/components/organization-settings/OrganizationSettingsMasterDetail';
import OrganizationSettingsMobileScreen from '@/app/organization-settings';

export default function HomeOrganizationSettingsScreen() {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isDesktopWeb = Platform.OS === 'web' && width >= 768;

    if (isDesktopWeb) {
        return (
            <View style={styles.container}>
                <Stack.Screen options={{ headerShown: false }} />
                <OrganizationSettingsMasterDetail
                    initialCategory="general"
                    onCategoryChange={(id) => {
                        router.replace(`/home/organization-settings/${id}` as any);
                    }}
                />
            </View>
        );
    }

    return <OrganizationSettingsMobileScreen />;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        height: '100%',
        width: '100%',
    },
});
