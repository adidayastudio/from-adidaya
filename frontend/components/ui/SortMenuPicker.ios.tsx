import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import ContextMenu, { ContextMenuAction } from '@/components/ui/PlatformContextMenu';
import * as Haptics from 'expo-haptics';
import { PlatformIcon } from '@/components/ui/PlatformIcon';

interface SortMenuPickerProps {
    options: string[];
    selectedIndex: number;
    onSelect: (index: number) => void;
    isDark: boolean;
    textColor?: string;
    subtextColor?: string;
    style?: ViewStyle;
}

export function SortMenuPicker({
    options,
    selectedIndex,
    onSelect,
    isDark,
    textColor,
    style,
}: SortMenuPickerProps) {
    const actions: ContextMenuAction[] = options.map((opt, idx) => ({
        title: opt,
        state: idx === selectedIndex ? 'on' : 'off',
    }));

    const activeColor = textColor || (isDark ? '#FFFFFF' : '#1C1C1E');

    return (
        <ContextMenu
            actions={actions}
            dropdownMenuMode={true}
            onPress={(e) => {
                Haptics.selectionAsync();
                onSelect(e.nativeEvent.index);
            }}
        >
            <View
                style={[
                    styles.button,
                    {
                        backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                    },
                    style,
                ]}
            >
                <PlatformIcon
                    name="arrow.up.arrow.down"
                    size={12}
                    tintColor={activeColor}
                />
                <Text
                    style={[styles.text, { color: activeColor }]}
                    numberOfLines={1}
                >
                    {options[selectedIndex]}
                </Text>
            </View>
        </ContextMenu>
    );
}

const styles = StyleSheet.create({
    button: {
        height: 42,
        borderRadius: 21,
        borderWidth: 1,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    text: {
        fontSize: 13,
        fontWeight: '500',
    },
});

export const SortMenuPickerIOS = SortMenuPicker;
export default SortMenuPicker;
