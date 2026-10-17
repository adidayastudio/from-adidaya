import { GlassView } from '@/components/ui/GlassView';
import { Ionicons } from '@expo/vector-icons';
import React, { useRef } from 'react';
import { Keyboard, StyleSheet, TextInput, TouchableOpacity } from 'react-native';

interface SwiftUISearchBarProps {
    placeholder?: string;
    value: string;
    onChangeText: (text: string) => void;
    onClear?: (hadText?: boolean) => void;
    onFocus?: () => void;
    onBlur?: () => void;
    onPressIn?: () => void;
    isDark?: boolean;
    style?: any;
    showClearButton?: boolean;
}

export function SwiftUISearchBar({
    placeholder = 'Search...',
    value,
    onChangeText,
    onClear,
    onFocus,
    onBlur,
    onPressIn,
    isDark = false,
    style,
    showClearButton = false,
}: SwiftUISearchBarProps) {
    const inputRef = useRef<TextInput>(null);
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';

    const handleClear = () => {
        const hadText = (value || '').length > 0;
        onChangeText('');
        if (onClear) onClear(hadText);
        Keyboard.dismiss();
        inputRef.current?.blur();
        if (onBlur) onBlur();
    };

    return (
        <GlassView
            intensity={85}
            tint={isDark ? 'dark' : 'light'}
            style={[
                styles.card,
                {
                    backgroundColor: isDark ? 'rgba(28,28,30,0.85)' : 'rgba(255,255,255,0.88)',
                },
                style,
            ]}
        >
            <Ionicons name="search" size={18} color={subtextColor} style={{ marginLeft: 6, flexShrink: 0 }} />
            <TextInput
                ref={inputRef}
                style={[styles.input, { color: textColor }]}
                placeholder={placeholder}
                placeholderTextColor={subtextColor}
                value={value}
                onChangeText={onChangeText}
                onPressIn={onPressIn}
                onFocus={onFocus}
                onBlur={onBlur}
                returnKeyType="search"
            />
            {(value.length > 0 || showClearButton) && (
                <TouchableOpacity
                    onPress={handleClear}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    style={{ padding: 4, marginRight: 2, flexShrink: 0 }}
                >
                    <Ionicons name="close-circle" size={18} color={subtextColor} />
                </TouchableOpacity>
            )}
        </GlassView>
    );
}

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 52,
        paddingHorizontal: 12,
        borderRadius: 26,
        gap: 8,
        width: '100%',
    },
    input: {
        flex: 1,
        minWidth: 0,
        fontSize: 15,
        height: 40,
        paddingVertical: 0,
    },
});
