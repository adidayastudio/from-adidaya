import { HeaderBlurBackground } from '@/components/ui/HeaderBlurBackground';
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
    { id: 'courses', label: 'Courses', icon: 'books.vertical.fill' },
    { id: 'progress', label: 'Progress', icon: 'chart.line.uptrend.xyaxis' },
    { id: 'saved', label: 'Saved', icon: 'bookmark.fill' },
];

export default function LearnScreen() {
    const { isAuthenticated } = useUserContext();
    const { resolvedTheme } = useTheme();
    const { refreshing, onRefresh } = usePullToRefresh();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const insets = useSafeAreaInsets();
    const [activeSegment, setActiveSegment] = useState('courses');

    const actions: HeaderToolbarAction[] = [
        { id: 'search', icon: 'search', image: 'magnifyingglass', tintColor: textColor, onPress: () => { } },
    ];

    return (
        <>
            <Stack.Screen options={{
                title: 'Learn',
                headerLargeTitle: true,
                headerTransparent: Platform.OS === 'ios',
                headerBackground: Platform.OS === 'ios' ? () => <HeaderBlurBackground isDark={isDark} /> : undefined,
                headerStyle: { backgroundColor: Platform.OS === 'ios' ? 'transparent' : (isDark ? '#000000' : '#F2F2F7') },
                headerTintColor: textColor,
                headerLargeStyle: { backgroundColor: 'transparent' },
                headerRight: (isAuthenticated && actions.length > 0) ? () => (
                    <View style={{ marginRight: Platform.OS === 'web' ? 16 : 0 }}>
                        <HeaderToolbar actions={actions} isDark={isDark} textColor={textColor} />
                    </View>
                ) : undefined,
            }} />
            <SwipeTabWrapper segments={SEGMENTS} activeSegment={activeSegment} onSegmentChange={setActiveSegment}>
            <ScrollView
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? '#FFF' : '#000'} />}
                contentInsetAdjustmentBehavior="automatic"
                style={{ flex: 1, backgroundColor: isDark ? '#000000' : '#F2F2F7' }}
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
                    <PlatformIcon name="books.vertical.fill" size={36} tintColor={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'} />
                    <Text style={[s.placeholderText, { color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }]}>Learn — Coming Soon</Text>
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
