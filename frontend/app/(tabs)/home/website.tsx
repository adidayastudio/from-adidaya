import { HeaderToolbar, HeaderToolbarAction } from '@/components/ui/HeaderToolbar';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useUserContext } from '@/context/UserProvider';
import { Stack } from 'expo-router';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { useState } from 'react';
import {  ScrollView, StyleSheet, Text, View , Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SEGMENTS = [
    { id: 'overview', label: 'Overview', icon: 'safari.fill' },
    { id: 'analytics', label: 'Analytics', icon: 'chart.xyaxis.line' },
    { id: 'content', label: 'Content', icon: 'doc.text.fill' },
];

export default function WebsiteScreen() {
    const { isAuthenticated } = useUserContext();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const insets = useSafeAreaInsets();
    const [activeSegment, setActiveSegment] = useState('overview');

    const actions: HeaderToolbarAction[] = [
        { id: 'share', icon: 'share', image: 'square.and.arrow.up', tintColor: textColor, onPress: () => { } },
    ];

    return (
        <>
            <Stack.Screen options={{
                title: 'Website',
                headerLargeTitle: true,
                headerTransparent: Platform.OS === 'ios',
                headerTintColor: textColor,
                headerLargeStyle: { backgroundColor: 'transparent' },
                headerRight: (isAuthenticated && actions.length > 0) ? () => <HeaderToolbar actions={actions} isDark={isDark} textColor={textColor} /> : undefined,
            }} />
            <ScrollView
                contentInsetAdjustmentBehavior="automatic"
                style={{ flex: 1, backgroundColor: isDark ? '#000' : '#F2F2F7' }}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120, paddingTop: 0 }}
                showsVerticalScrollIndicator={false}
            >
                <SegmentedControl
                    segments={SEGMENTS}
                    activeSegment={activeSegment}
                    onSegmentChange={setActiveSegment}
                    style={s.seg}
                />
                <View style={[s.placeholder, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
                    <PlatformIcon name="safari.fill" size={36} tintColor={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'} />
                    <Text style={[s.placeholderText, { color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }]}>Website — Coming Soon</Text>
                </View>
            </ScrollView>
        </>
    );
}

const s = StyleSheet.create({
    container: { flex: 1 },
    seg: { marginBottom: 24, marginHorizontal: -4 },
    placeholder: { borderRadius: 24, borderWidth: 1, borderStyle: 'dashed', padding: 60, alignItems: 'center', gap: 12, marginTop: 20 },
    placeholderText: { fontSize: 15, fontWeight: '500' },
});
