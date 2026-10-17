import React from 'react';
import { View, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { NotificationsMasterDetail } from '@/components/notifications/NotificationsMasterDetail';
import NotificationsMobileScreen from '@/app/notifications';

export default function HomeNotificationsScreen() {
    const { width } = useWindowDimensions();
    const isDesktopWeb = Platform.OS === 'web' && width >= 768;

    if (isDesktopWeb) {
        return (
            <View style={styles.container}>
                <Stack.Screen options={{ headerShown: false }} />
                <NotificationsMasterDetail />
            </View>
        );
    }

    return <NotificationsMobileScreen />;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        height: '100%',
        width: '100%',
    },
});
