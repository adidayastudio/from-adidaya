import { BlurView } from 'expo-blur';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import React, { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function HomeToolbar() {
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme() ?? 'light';
    const [isClockedIn, setIsClockedIn] = useState(false);

    return (
        <Pressable
            style={({ pressed }) => [
                styles.container,
                { bottom: insets.bottom + 25, opacity: pressed ? 0.8 : 1 },
            ]}
            onPress={() => {
                console.log('Search Pressed');
            }}>
            <BlurView
                intensity={80}
                tint={colorScheme === 'dark' ? 'systemThickMaterialDark' : 'systemThickMaterialLight'}
                style={styles.blurContainer}>
                <PlatformIcon
                    name="magnifyingglass"
                    size={24}
                    tintColor={Colors[colorScheme].text}
                    resizeMode="scaleAspectFit"
                />
            </BlurView>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        right: 20,
        zIndex: 9999, // Ensure it floats on top
    },
    blurContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
});
