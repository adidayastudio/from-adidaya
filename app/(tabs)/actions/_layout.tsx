import { Stack } from 'expo-router';
import React, { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { HeaderCircleButton } from '@/components/ui/HeaderCircleButton';

export default function ActionsLayout() {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';

    return (
        <Stack
            screenOptions={{
                headerShown: Platform.OS !== 'web',
                headerShadowVisible: false,
                contentStyle: { backgroundColor: isDark ? '#000000' : '#F2F2F7' },
                headerLeft: Platform.OS !== 'ios' ? (props) => props.canGoBack ? (
                    <View style={{ marginLeft: Platform.OS === 'web' ? 12 : 0, marginRight: 10 }}>
                        <HeaderCircleButton
                            type="back"
                            isDark={isDark}
                            onPress={props.onPress}
                        />
                    </View>
                ) : undefined : undefined,
            }}
        />
    );
}
