import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Host, Picker, HStack } from '@expo/ui/swift-ui';
import { frame } from '@expo/ui/swift-ui/modifiers';
import { useTheme } from '@/context/ThemeContext';
import * as Haptics from 'expo-haptics';

interface NativeSegmentedPickerProps {
    options: string[];
    selectedIndex: number;
    onChange: (index: number) => void;
}

export function NativeSegmentedPicker({
    options,
    selectedIndex,
    onChange,
}: NativeSegmentedPickerProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';

    const screenWidth = Dimensions.get('window').width;
    const pickerWidth = screenWidth - 32;

    const handleOptionSelected = ({ nativeEvent: { index } }: { nativeEvent: { index: number; label: string } }) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onChange(index);
    };

    return (
        <View style={s.container}>
            <Host style={s.host} colorScheme={isDark ? 'dark' : 'light'}>
                <HStack alignment="center" modifiers={[frame({ width: pickerWidth, height: 36 })]}>
                    <Picker
                        options={options}
                        selectedIndex={selectedIndex}
                        onOptionSelected={handleOptionSelected}
                        variant="segmented"
                        modifiers={[frame({ width: pickerWidth, height: 32 })]}
                    />
                </HStack>
            </Host>
        </View>
    );
}

const s = StyleSheet.create({
    container: {
        height: 36,
        alignSelf: 'stretch',
        marginBottom: 2,
    },
    host: {
        flex: 1,
        height: 36,
    },
});

export default NativeSegmentedPicker;
