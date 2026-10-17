import React from 'react';
import { View, Text, StyleSheet, Platform, ViewStyle } from 'react-native';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { Host, Picker, HStack, Spacer } from '@/lib/swiftui';

export interface OptionItem {
    id: string;
    name: string;
}

interface ProfileDropdownPickerProps {
    title?: string;
    options: (string | OptionItem)[];
    value?: string;
    placeholder?: string;
    onSelect: (option: OptionItem) => void;
    disabled?: boolean;
    isDark?: boolean;
    textColor?: string;
    subtextColor?: string;
    style?: ViewStyle;
}

export const ProfileDropdownPicker: React.FC<ProfileDropdownPickerProps> = ({
    title,
    options = [],
    value,
    placeholder = 'Select',
    onSelect,
    disabled = false,
    isDark = false,
    textColor = '#FFFFFF',
    subtextColor = '#8E8E93',
    style,
}) => {
    // Normalize options
    const normalizedOptions: OptionItem[] = options.map((opt) => {
        if (typeof opt === 'string') {
            return { id: opt, name: opt };
        }
        return opt;
    });

    const matchedOption = normalizedOptions.find(
        (o) => o.id === value || o.name === value || (typeof o.name === 'string' && typeof value === 'string' && o.name.toLowerCase() === value.toLowerCase())
    );
    const displayLabel = matchedOption ? matchedOption.name : (value || placeholder);
    const isPlaceholder = !matchedOption && (!value || value === '');
    const selectedKey = matchedOption ? matchedOption.id : '';

    // iOS Native SwiftUI Picker
    if (Platform.OS === 'ios' && process.env.EXPO_OS === 'ios') {
        const pickerOptions = [placeholder, ...normalizedOptions.map((o) => o.name)];
        const currentIdx = normalizedOptions.findIndex(
            (o) => o.id === value || o.name === value || (typeof o.name === 'string' && typeof value === 'string' && o.name.toLowerCase() === value.toLowerCase())
        );
        const selectedIndex = currentIdx >= 0 ? currentIdx + 1 : 0;

        return (
            <View style={[{ flex: 1, height: 34, alignItems: 'flex-end', justifyContent: 'center' }, style]}>
                <Host style={{ width: '100%', height: 34 }} colorScheme={isDark ? 'dark' : 'light'}>
                    <HStack>
                        <Spacer />
                        <Picker
                            options={pickerOptions}
                            selectedIndex={selectedIndex}
                            onOptionSelected={(e: any) => {
                                const idx = e.nativeEvent.index;
                                if (idx > 0 && normalizedOptions[idx - 1]) {
                                    onSelect(normalizedOptions[idx - 1]);
                                }
                            }}
                            variant="menu"
                            color={textColor}
                            disabled={disabled}
                        />
                    </HStack>
                </Host>
            </View>
        );
    }

    // Web & Android Standard Dropdown
    return (
        <View style={[styles.container, style]}>
            <View style={styles.pill}>
                <Text
                    style={[
                        styles.label,
                        { color: isPlaceholder ? subtextColor : textColor },
                    ]}
                    numberOfLines={1}
                >
                    {displayLabel}
                </Text>
                <PlatformIcon name="chevron.down" size={12} tintColor={subtextColor} style={{ marginLeft: 6 }} />
            </View>

            {Platform.OS === 'web' && !disabled && (
                <select
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        opacity: 0,
                        cursor: 'pointer',
                        zIndex: 10,
                    }}
                    value={selectedKey}
                    onChange={(e) => {
                        const val = e.target.value;
                        const chosen = normalizedOptions.find((o) => o.id === val);
                        if (chosen) onSelect(chosen);
                    }}
                >
                    {isPlaceholder && (
                        <option value="" disabled>
                            {placeholder}
                        </option>
                    )}
                    {normalizedOptions.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                            {opt.name}
                        </option>
                    ))}
                </select>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 8,
    },
    label: {
        fontSize: 15,
        fontWeight: '400',
    },
});
