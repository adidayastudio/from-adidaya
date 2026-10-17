import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import React, { useEffect } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    interpolateColor,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

const SPRING_CONFIG = { damping: 20, stiffness: 200, mass: 0.8 };

type TabIconMap = {
    [key: string]: {
        icon: keyof typeof Ionicons.glyphMap;
        iconFocused: keyof typeof Ionicons.glyphMap;
        label: string;
    };
};

const TAB_CONFIG: TabIconMap = {
    home: { icon: 'home-outline', iconFocused: 'home', label: 'Home' },
    tasks: { icon: 'radio-button-off', iconFocused: 'radio-button-on', label: 'Tasks' },
    actions: { icon: 'flash-outline', iconFocused: 'flash', label: 'Actions' },
    projects: { icon: 'sparkles-outline', iconFocused: 'sparkles', label: 'Projects' },
    search: { icon: 'search-outline', iconFocused: 'search', label: 'Search' },
};

function TabItem({
    routeName,
    isFocused,
    onPress,
    onLongPress,
    isDark,
}: {
    routeName: string;
    isFocused: boolean;
    onPress: () => void;
    onLongPress: () => void;
    isDark: boolean;
}) {
    const config = TAB_CONFIG[routeName] || { icon: 'help-outline', iconFocused: 'help', label: routeName };
    const progress = useSharedValue(isFocused ? 1 : 0);

    useEffect(() => {
        progress.value = withSpring(isFocused ? 1 : 0, SPRING_CONFIG);
    }, [isFocused]);

    const pillStyle = useAnimatedStyle(() => ({
        backgroundColor: interpolateColor(
            progress.value,
            [0, 1],
            ['transparent', isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)']
        ),
        paddingHorizontal: 16 + progress.value * 4,
        transform: [{ scale: 0.95 + progress.value * 0.05 }],
    }));

    const iconColor = isFocused
        ? (isDark ? '#FFFFFF' : '#1C1C1E')
        : (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)');

    const labelColor = isFocused
        ? (isDark ? '#FFFFFF' : '#1C1C1E')
        : (isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.35)');

    return (
        <TouchableOpacity
            onPress={onPress}
            onLongPress={onLongPress}
            activeOpacity={0.7}
            style={styles.tabTouchable}
        >
            <Animated.View style={[styles.tabPill, pillStyle]}>
                <Ionicons
                    name={isFocused ? config.iconFocused : config.icon}
                    size={22}
                    color={iconColor}
                />
                <Text
                    style={[
                        styles.tabLabel,
                        {
                            color: labelColor,
                            fontWeight: isFocused ? '700' : '500',
                        },
                    ]}
                    numberOfLines={1}
                >
                    {config.label}
                </Text>
            </Animated.View>
        </TouchableOpacity>
    );
}

export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';

    return (
        <View style={styles.outerContainer}>
            <View
                style={[
                    styles.container,
                    {
                        backgroundColor: isDark
                            ? 'rgba(44,44,46,0.88)'
                            : 'rgba(255,255,255,0.88)',
                        borderColor: isDark
                            ? 'rgba(255,255,255,0.08)'
                            : 'rgba(0,0,0,0.06)',
                    },
                ]}
            >
                {/* Blur backdrop */}
                {Platform.OS === 'ios' ? (
                    <BlurView
                        intensity={80}
                        tint={isDark ? 'systemChromeMaterialDark' : 'systemChromeMaterial'}
                        style={StyleSheet.absoluteFill}
                    />
                ) : (
                    <View
                        style={[
                            StyleSheet.absoluteFill,
                            {
                                backgroundColor: isDark
                                    ? 'rgba(28,28,30,0.92)'
                                    : 'rgba(245,245,245,0.92)',
                            },
                        ]}
                    />
                )}

                <View style={styles.tabsRow}>
                    {state.routes.map((route, index) => {
                        const isFocused = state.index === index;

                        const onPress = () => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

                            const event = navigation.emit({
                                type: 'tabPress',
                                target: route.key,
                                canPreventDefault: true,
                            });

                            if (!isFocused && !event.defaultPrevented) {
                                navigation.navigate(route.name, route.params);
                            }
                        };

                        const onLongPress = () => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            navigation.emit({
                                type: 'tabLongPress',
                                target: route.key,
                            });
                        };

                        return (
                            <TabItem
                                key={route.key}
                                routeName={route.name}
                                isFocused={isFocused}
                                onPress={onPress}
                                onLongPress={onLongPress}
                                isDark={isDark}
                            />
                        );
                    })}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    outerContainer: {
        position: 'absolute',
        bottom: 16,
        left: 16,
        right: 16,
        alignItems: 'center',
    },
    container: {
        flexDirection: 'row',
        borderRadius: 40,
        overflow: 'hidden',
        borderWidth: 1,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.15,
                shadowRadius: 24,
            },
            android: {
                elevation: 12,
            },
        }),
    },
    tabsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 8,
    },
    tabTouchable: {
        flex: 1,
        alignItems: 'center',
    },
    tabPill: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 28,
        gap: 6,
    },
    tabLabel: {
        fontSize: 12,
        letterSpacing: -0.2,
    },
});
