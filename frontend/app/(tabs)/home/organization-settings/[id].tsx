import React from 'react';
import { View, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { OrganizationSettingsMasterDetail } from '@/components/organization-settings/OrganizationSettingsMasterDetail';
import OrganizationGeneralScreen from '@/app/organization-settings/general';
import OrganizationAccountScreen from '@/app/organization-settings/account';
import OrganizationTeamScreen from '@/app/organization-settings/team';
import OrganizationRolesScreen from '@/app/organization-settings/roles';
import OrganizationPermissionsScreen from '@/app/organization-settings/permissions';
import OrganizationNotificationsScreen from '@/app/organization-settings/notifications';
import OrganizationSecurityScreen from '@/app/organization-settings/security';
import OrganizationIntegrationsScreen from '@/app/organization-settings/integrations';
import OrganizationLegalScreen from '@/app/organization-settings/about';
import OrganizationSettingsMobileScreen from '@/app/organization-settings';

export default function HomeOrganizationSettingsDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isDesktopWeb = Platform.OS === 'web' && width >= 768;

    if (isDesktopWeb) {
        return (
            <View style={styles.container}>
                <Stack.Screen options={{ headerShown: false }} />
                <OrganizationSettingsMasterDetail
                    initialCategory={id || 'general'}
                    onCategoryChange={(newId) => {
                        router.replace(`/home/organization-settings/${newId}` as any);
                    }}
                />
            </View>
        );
    }

    // Responsive Mobile Screen Rendering
    switch (id) {
        case 'general':
            return <OrganizationGeneralScreen />;
        case 'account':
            return <OrganizationAccountScreen />;
        case 'team':
            return <OrganizationTeamScreen />;
        case 'roles':
            return <OrganizationRolesScreen />;
        case 'permissions':
            return <OrganizationPermissionsScreen />;
        case 'notifications':
            return <OrganizationNotificationsScreen />;
        case 'security':
            return <OrganizationSecurityScreen />;
        case 'integrations':
            return <OrganizationIntegrationsScreen />;
        case 'about':
        case 'terms':
        case 'privacy':
        case 'legal':
            return <OrganizationLegalScreen />;
        default:
            return <OrganizationSettingsMobileScreen />;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        height: '100%',
        width: '100%',
    },
});
