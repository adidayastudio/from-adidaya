import React from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
    useAnimatedStyle,
    withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';

interface IOSSwitchProps {
    value: boolean;
    onValueChange: (value: boolean) => void;
    disabled?: boolean;
    activeColor?: string;
    style?: ViewStyle;
}

export const IOSSwitch: React.FC<IOSSwitchProps> = ({
    value,
    onValueChange,
    disabled = false,
    activeColor = '#34C759',
    style,
}) => {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';

    const handlePress = () => {
        if (disabled) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onValueChange(!value);
    };

    const thumbAnimatedStyle = useAnimatedStyle(() => {
        return {
            transform: [
                {
                    translateX: withSpring(value ? 20 : 0, {
                        damping: 18,
                        stiffness: 260,
                        mass: 0.6,
                    }),
                },
            ],
        };
    }, [value]);

    return (
        <Pressable
            onPress={handlePress}
            disabled={disabled}
            style={[
                styles.track,
                {
                    backgroundColor: value
                        ? activeColor
                        : (isDark ? '#39393D' : '#E9E9EB'),
                    opacity: disabled ? 0.4 : 1,
                },
                style,
            ]}
        >
            <Animated.View style={[styles.thumb, thumbAnimatedStyle]} />
        </Pressable>
    );
};

const styles = StyleSheet.create({
    track: {
        width: 51,
        height: 31,
        borderRadius: 16,
        padding: 2,
        justifyContent: 'center',
    },
    thumb: {
        width: 27,
        height: 27,
        borderRadius: 13.5,
        backgroundColor: '#FFFFFF',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.22,
        shadowRadius: 3,
        elevation: 3,
    },
});
