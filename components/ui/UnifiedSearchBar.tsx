import React from 'react';
import {
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
    Text,
    Platform,
    StyleProp,
    ViewStyle,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { FormaBlue } from '@/constants/theme';
import { GlassView } from '@/components/ui/GlassView';
import { PlatformIcon } from '@/components/ui/PlatformIcon';

export interface UnifiedSearchBarProps {
    value: string;
    onChangeText: (text: string) => void;
    onClose: () => void;
    placeholder?: string;
    autoFocus?: boolean;
    style?: StyleProp<ViewStyle>;
}

export function UnifiedSearchBar({
    value,
    onChangeText,
    onClose,
    placeholder = 'Search...',
    autoFocus = true,
    style,
}: UnifiedSearchBarProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';

    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = '#8E8E93';

    const handleClear = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onChangeText('');
    };

    const handleCancel = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onChangeText('');
        onClose();
    };

    return (
        <Animated.View
            entering={FadeInUp.duration(180)}
            style={[styles.wrapper, style]}
        >
            <View
                style={[
                    styles.glassContainer,
                    {
                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.92)',
                    },
                ]}
            >
                <PlatformIcon
                    name="magnifyingglass"
                    size={17}
                    tintColor={subtextColor}
                    style={{ marginRight: 8 }}
                />
                <TextInput
                    placeholder={placeholder}
                    placeholderTextColor={subtextColor}
                    style={[styles.input, { color: textColor }]}
                    value={value}
                    onChangeText={onChangeText}
                    autoFocus={autoFocus}
                    returnKeyType="search"
                />
                {value.length > 0 ? (
                    <TouchableOpacity
                        onPress={handleClear}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={styles.clearBtn}
                    >
                        <Ionicons name="close-circle" size={18} color="#8E8E93" />
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        onPress={handleCancel}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={styles.cancelBtn}
                    >
                        <Text style={[styles.cancelText, { color: isDark ? '#8E8E93' : '#636366' }]}>Cancel</Text>
                    </TouchableOpacity>
                )}
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        marginBottom: 10,
        borderRadius: 999,
        overflow: 'hidden',
    },
    glassContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        height: 44,
        borderRadius: 999,
        borderWidth: 0,
        ...Platform.select({
            web: {
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
            } as any,
        }),
    },
    input: {
        flex: 1,
        fontSize: 14,
        paddingVertical: 0,
        height: '100%',
    },
    clearBtn: {
        padding: 4,
    },
    cancelBtn: {
        paddingVertical: 4,
        paddingHorizontal: 4,
    },
    cancelText: {
        fontSize: 14,
        fontWeight: '500',
    },
});
