import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { useTheme } from '@/context/ThemeContext';
import type { SymbolViewProps } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View, ViewStyle, Platform } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

interface ResourceSummaryCardProps {
    icon: SymbolViewProps['name'];
    iconColor: string;
    label: string;
    value: string;
    subValue: string;
    valueStyle?: 'positive' | 'negative' | 'neutral';
    subValueStyle?: 'positive' | 'negative' | 'neutral' | 'bold';
    style?: ViewStyle;
    onPress?: () => void;
}

export function ResourceSummaryCard({
    icon,
    iconColor,
    label,
    value,
    valueStyle = 'neutral',
    subValue,
    subValueStyle = 'bold',
    style,
    onPress,
}: ResourceSummaryCardProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';

    const scale = useSharedValue(1);

    const handlePressIn = () => {
        'worklet';
        scale.value = withSpring(0.96, {
            damping: 15,
            stiffness: 300,
            mass: 0.8,
        });
    };

    const handlePressOut = () => {
        'worklet';
        scale.value = withSpring(1, {
            damping: 15,
            stiffness: 300,
            mass: 0.8,
        });
    };

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const getValueFontSize = (text: string) => {
        if (text.length > 12) return 18;
        if (text.length > 8) return 20;
        return 24;
    };

    return (
        <Animated.View style={[
            styles.container,
            {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#FFFFFF',
            },
            animatedStyle,
            style
        ]}>
            <Pressable
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                style={({ pressed }) => [
                    styles.pressable,
                    { opacity: pressed ? 0.9 : 1 }
                ]}
            >
                <View style={styles.header}>
                    <View style={[styles.iconCircle, { backgroundColor: iconColor + (isDark ? '30' : '15') }]}>
                        <PlatformIcon
                            name={icon}
                            size={18}
                            tintColor={iconColor}
                            fallback={<View style={{ width: 18, height: 18, backgroundColor: iconColor, borderRadius: 9 }} />}
                        />
                    </View>
                    <Text
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        style={[
                            styles.value,
                            {
                                color: isDark ? '#FFFFFF' : '#1C1C1E',
                                fontSize: getValueFontSize(value)
                            },
                            valueStyle === 'positive' && { color: '#34C759' },
                            valueStyle === 'negative' && { color: '#FF3B30' },
                        ]}
                    >
                        {value}
                    </Text>
                </View>

                <View style={styles.content}>
                    {!!label && (
                        <Text style={[styles.label, { color: isDark ? '#A1A1A6' : '#8E8E93' }]}>{label}</Text>
                    )}
                    {!!subValue && (
                        <Text
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            style={[
                                styles.subValue,
                                { color: isDark ? '#FFFFFF' : '#1C1C1E' },
                                subValueStyle === 'positive' && { color: '#34C759' },
                                subValueStyle === 'negative' && { color: '#FF3B30' }
                            ]}>
                            {subValue}
                        </Text>
                    )}
                </View>
            </Pressable>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '48%',
        borderRadius: 24,
        marginBottom: 16,
        overflow: 'hidden',
        // iOS Shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
        // Android Shadow
        elevation: 2,
    },
    pressable: {
        padding: 16,
        paddingBottom: 20,
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    iconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    value: {
        fontWeight: '700',
        letterSpacing: -0.5,
        flex: 1,
        textAlign: 'right',
        marginLeft: 8,
    },
    content: {
        marginTop: 'auto',
    },
    label: {
        fontSize: 12,
        marginBottom: 4,
    },
    subValue: {
        fontSize: 14,
        fontWeight: '700',
    },
});
