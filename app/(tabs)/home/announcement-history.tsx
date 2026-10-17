import React from 'react';
import { View, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { Stack } from 'expo-router';
import { AnnouncementHistoryMasterDetail } from '@/components/home/AnnouncementHistoryMasterDetail';
import AnnouncementHistoryMobileScreen from '@/app/announcement-history';

export default function HomeAnnouncementHistoryScreen() {
    const { width } = useWindowDimensions();
    const isDesktopWeb = Platform.OS === 'web' && width >= 768;

    if (isDesktopWeb) {
        return (
            <View style={styles.container}>
                <Stack.Screen options={{ headerShown: false }} />
                <AnnouncementHistoryMasterDetail />
            </View>
        );
    }

    return <AnnouncementHistoryMobileScreen />;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        height: '100%',
        width: '100%',
    },
});
