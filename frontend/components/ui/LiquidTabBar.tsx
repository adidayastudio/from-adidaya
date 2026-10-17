import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import React, { useEffect } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from './icon-symbol';

export function LiquidTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme() ?? 'light';
    const activeIndex = state.index;

    // Shared values for layout
    const tabWidth = useSharedValue(0);
    const indicatorPosition = useSharedValue(0);

    // Update indicator position when active index changes
    useEffect(() => {
        indicatorPosition.value = withSpring(activeIndex * tabWidth.value, {
            damping: 15,
            stiffness: 150,
            mass: 0.8,
        });
    }, [activeIndex, tabWidth.value]);

    const onLayout = (e: LayoutChangeEvent) => {
        // Calculate width of a single tab
        const layoutWidth = e.nativeEvent.layout.width;
        if (layoutWidth > 0 && state.routes.length > 0) {
            tabWidth.value = layoutWidth / state.routes.length;
            // Initial position set without animation to avoid jump
            indicatorPosition.value = activeIndex * (layoutWidth / state.routes.length);
        }
    };

    const indicatorStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateX: indicatorPosition.value }],
            width: tabWidth.value,
        };
    });

    return (
        <View style={[styles.container, { paddingBottom: insets.bottom + 10 }]}>
            <BlurView
                intensity={80}
                tint={colorScheme === 'dark' ? 'systemThickMaterialDark' : 'systemThickMaterialLight'} // Heavy glass
                style={styles.blurContainer}
                onLayout={onLayout}
            >
                {/* Active Indicator Blob */}
                <Animated.View style={[styles.activeBlob, indicatorStyle]} />

                {state.routes.map((route, index) => {
                    const { options } = descriptors[route.key];
                    const isFocused = state.index === index;

                    const onPress = () => {
                        const event = navigation.emit({
                            type: 'tabPress',
                            target: route.key,
                            canPreventDefault: true,
                        });

                        if (!isFocused && !event.defaultPrevented) {
                            navigation.navigate(route.name, route.params);
                        }
                    };

                    return (
                        <TabItem
                            key={route.key}
                            isFocused={isFocused}
                            onPress={onPress}
                            routeName={route.name}
                            colorScheme={colorScheme}
                        />
                    );
                })}
            </BlurView>
        </View>
    );
}

function TabItem({
    isFocused,
    onPress,
    routeName,
    colorScheme,
}: {
    isFocused: boolean;
    onPress: () => void;
    routeName: string;
    colorScheme: 'light' | 'dark';
}) {
    const scale = useSharedValue(1);

    useEffect(() => {
        scale.value = withSpring(isFocused ? 1.1 : 1, { duration: 300 });
    }, [isFocused]);

    const animatedIconStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: scale.value }],
            opacity: withTiming(isFocused ? 1 : 0.6, { duration: 200 }),
        };
    });

    // Icon Mapping
    const getIconName = (name: string) => {
        switch (name) {
            case 'index': return 'house.fill';
            case 'task': return 'checkmark.circle.fill';
            case 'action': return 'bolt.fill';
            case 'project': return 'briefcase.fill';
            case 'search': return 'magnifyingglass';
            default: return 'questionmark';
        }
    };

    return (
        <Pressable
            onPress={onPress}
            style={styles.tabItem}
        >
            <Animated.View style={animatedIconStyle}>
                <IconSymbol
                    size={28}
                    name={getIconName(routeName)}
                    color={isFocused ? (colorScheme === 'dark' ? '#FFF' : '#000') : Colors[colorScheme].tabIconDefault}
                    weight={isFocused ? 'bold' : 'regular'}
                />
            </Animated.View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100, // Ensure it floats on top
    },
    blurContainer: {
        flexDirection: 'row',
        width: '90%', // Floating width
        maxWidth: 400,
        height: 70, // Capsule height
        borderRadius: 35, // Full pill shape
        alignItems: 'center',
        justifyContent: 'space-around',
        overflow: 'hidden',
        // Shadow for depth
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 10,
        },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 10,
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        zIndex: 2, // Above the blob
    },
    activeBlob: {
        position: 'absolute',
        left: 0,
        top: 5,
        bottom: 5,
        borderRadius: 30, // Inner pill
        backgroundColor: 'rgba(255, 255, 255, 0.3)', // Subtle highlight
        zIndex: 1, // Behind icons
        marginHorizontal: 0,
    },
});
