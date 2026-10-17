import { HeaderToolbar, HeaderToolbarAction } from '@/components/ui/HeaderToolbar';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { SwipeTabWrapper } from '@/components/ui/SwipeTabWrapper';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useUserContext } from '@/context/UserProvider';
import { Stack } from 'expo-router';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { useState } from 'react';
import { RefreshControl,   ScrollView, StyleSheet, Text, View , Platform  } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SEGMENTS = [
    { id: 'feed', label: 'Feed', icon: 'newspaper.fill' },
    { id: 'insights', label: 'Insights', icon: 'chart.bar.fill' },
    { id: 'posts', label: 'Posts', icon: 'square.and.pencil' },
];

export default function SocialScreen() {
    const { isAuthenticated } = useUserContext();
    const { resolvedTheme } = useTheme();
    const { refreshing, onRefresh } = usePullToRefresh();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const insets = useSafeAreaInsets();
    const [activeSegment, setActiveSegment] = useState('feed');

    const actions: HeaderToolbarAction[] = [
        { id: 'compose', icon: 'create', image: 'square.and.pencil', tintColor: textColor, onPress: () => { } },
    ];

    return (
        <>
            <Stack.Screen options={{
                title: 'Social',
                headerLargeTitle: true,
                headerTransparent: Platform.OS === 'ios',
                headerTintColor: textColor,
                headerLargeStyle: { backgroundColor: 'transparent' },
                headerRight: (isAuthenticated && actions.length > 0) ? () => <HeaderToolbar actions={actions} isDark={isDark} textColor={textColor} /> : undefined,
            }} />
            <SwipeTabWrapper segments={SEGMENTS} activeSegment={activeSegment} onSegmentChange={setActiveSegment}>
            <ScrollView
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? '#FFF' : '#000'} />}
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
                    <PlatformIcon name="bubble.left.and.bubble.right.fill" size={36} tintColor={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'} />
                    <Text style={[s.placeholderText, { color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }]}>Social — Coming Soon</Text>
                </View>
            </ScrollView>
            </SwipeTabWrapper>
        </>
    );
}

const s = StyleSheet.create({
    container: { flex: 1 },
    seg: { marginBottom: 24, marginHorizontal: -4 },
    placeholder: { borderRadius: 24, borderWidth: 1, borderStyle: 'dashed', padding: 60, alignItems: 'center', gap: 12, marginTop: 20 },
    placeholderText: { fontSize: 15, fontWeight: '500' },
});
