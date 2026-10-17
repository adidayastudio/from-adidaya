import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Pressable, TouchableOpacity, StyleSheet, View, ViewStyle, StyleProp, Platform } from 'react-native';
import { PlatformIcon } from './PlatformIcon';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface BouncyGlassButtonProps {
    onPress?: () => void;
    children?: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    isDark?: boolean;
    isPill?: boolean;
    /**
     * If 'back', renders a standard chevron.
     * If 'close', renders an X.
     * If undefined, relies on children.
     */
    variant?: 'back' | 'close';
    textColor?: string;
    /**
     * If true, omits the Pressable to allow native wrappers (e.g., iOS Context Menu)
     * to intercept touches properly.
     */
    isMenuToggle?: boolean;
    isGlass?: boolean;
    isPrimary?: boolean;
}

export function BouncyGlassButton({
    onPress,
    children,
    style,
    isDark = false,
    isPill = false,
    variant,
    textColor = '#FFFFFF',
    isMenuToggle = false,
    isGlass = false,
    isPrimary = false,
}: BouncyGlassButtonProps) {
    const scale = useSharedValue(1);

    const handlePressIn = () => {
        'worklet';
        scale.value = withSpring(0.92, {
            damping: 18,
            stiffness: 350,
            mass: 0.6,
        });
    };

    const handlePressOut = () => {
        'worklet';
        scale.value = withSpring(1, {
            damping: 18,
            stiffness: 350,
            mass: 0.6,
        });
    };

    const handlePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (onPress) {
            onPress();
        }
    };

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const renderContent = () => {
        if (variant === 'back') {
            return <Ionicons name="chevron-back" size={24} color={textColor} style={{ marginLeft: -2 }} />;
        }
        if (variant === 'close') {
            return <Ionicons name="close" size={24} color={textColor} />;
        }
        return children;
    };

    const circleStyle = isDark ? styles.circleDark : styles.circleLight;

    if (variant === 'back') {
        return (
            <TouchableOpacity
                onPress={handlePress}
                activeOpacity={0.6}
                hitSlop={{ top: 16, bottom: 16, left: 16, right: 24 }}
                style={[{ justifyContent: 'center', alignItems: 'center' }, style]}
            >
                <Animated.View style={[
                    animatedStyle,
                    styles.circleBtnBase,
                    circleStyle,
                ]}>
                    <PlatformIcon
                        name="chevron.left"
                        size={16}
                        weight="semibold"
                        tintColor={textColor}
                    />
                </Animated.View>
            </TouchableOpacity>
        );
    }

    if (variant === 'close') {
        return (
            <TouchableOpacity
                onPress={handlePress}
                activeOpacity={0.6}
                hitSlop={{ top: 16, bottom: 16, left: 16, right: 24 }}
                style={[{ justifyContent: 'center', alignItems: 'center' }, style]}
            >
                <Animated.View style={[
                    animatedStyle,
                    styles.circleBtnBase,
                    circleStyle,
                ]}>
                    <PlatformIcon
                        name="xmark"
                        size={14}
                        weight="semibold"
                        tintColor={textColor}
                    />
                </Animated.View>
            </TouchableOpacity>
        );
    }

    const rootStyles = [
        isDark ? styles.darkModeBorder : styles.lightModeBorder,
        isPill ? styles.liquidBubblePill : styles.liquidBubbleCircle,
        isPrimary ? styles.primaryButton : null,
        style,
    ];

    const innerStyles = isPill ? styles.backButtonPill : styles.iconButton;

    if (isMenuToggle) {
        return (
            <Animated.View style={[animatedStyle, ...rootStyles]}>
                <View style={[innerStyles, { overflow: 'hidden' }]} pointerEvents="none">
                    {isGlass && !isPrimary && (
                        <BlurView
                            intensity={isDark ? 25 : 45}
                            tint={isDark ? 'dark' : 'light'}
                            style={StyleSheet.absoluteFill}
                            pointerEvents="none"
                        />
                    )}
                    {renderContent()}
                </View>
            </Animated.View>
        );
    }

    return (
        <TouchableOpacity
            onPress={handlePress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={[
                isPill ? styles.liquidBubblePill : styles.liquidBubbleCircle,
                { overflow: 'visible' },
                style,
            ]}
        >
            <Animated.View style={[animatedStyle, ...rootStyles]}>
                <View style={[innerStyles, { overflow: 'hidden' }]} pointerEvents="none">
                    {isGlass && !isPrimary && (
                        <BlurView
                            intensity={isDark ? 25 : 45}
                            tint={isDark ? 'dark' : 'light'}
                            style={StyleSheet.absoluteFill}
                            pointerEvents="none"
                        />
                    )}
                    {renderContent()}
                </View>
            </Animated.View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    liquidBubblePill: {
        height: 40,
        minWidth: 44,
        borderRadius: 20,
        overflow: 'hidden',
        justifyContent: 'center',
    },
    liquidBubbleCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
    darkModeBorder: {
        borderWidth: 0,
        backgroundColor: 'transparent',
    },
    lightModeBorder: {
        borderWidth: 0,
        backgroundColor: 'transparent',
    },
    backButtonPill: {
        height: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 14,
    },
    iconButton: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButton: {
        backgroundColor: 'transparent',
        borderWidth: 0,
        borderColor: 'transparent',
        overflow: 'hidden',
    },
    circleBtnBase: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    circleLight: {
        backgroundColor: 'rgba(255, 255, 255, 0.65)',
        ...Platform.select({
            web: {
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
            },
            default: {
                backgroundColor: 'rgba(0, 0, 0, 0.05)',
            },
        }),
    },
    circleDark: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        ...Platform.select({
            web: {
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
            },
            default: {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
            },
        }),
    },
});
