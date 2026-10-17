import { Host, Picker, GlassEffectContainer, HStack } from '@expo/ui/swift-ui';
import { frame, cornerRadius, glassEffect } from '@expo/ui/swift-ui/modifiers';
import { useTheme } from '@/context/ThemeContext';
import React from 'react';
import { StyleSheet, View, StyleProp, ViewStyle, Dimensions } from 'react-native';

const { width: windowWidth } = Dimensions.get('window');

export interface Segment {
    id: string;
    label: string;
    icon?: string;
}

interface SwiftUISegmentedControlProps {
    segments: Segment[];
    activeSegment: string;
    onSegmentChange: (id: string) => void;
    style?: StyleProp<ViewStyle>;
}

export function SwiftUISegmentedControl({
    segments,
    activeSegment,
    onSegmentChange,
    style,
}: SwiftUISegmentedControlProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';

    const options = segments.map((s) => s.label);
    const selectedIndex = segments.findIndex((s) => s.id === activeSegment);

    const handleOptionSelected = (event: { nativeEvent: { index: number; label: string } }) => {
        const index = event.nativeEvent.index;
        if (index >= 0 && index < segments.length) {
            onSegmentChange(segments[index].id);
        }
    };

    // Margins are perfectly aligned (20px on each side)
    const controlWidth = windowWidth - 40;

    return (
        <View style={[styles.container, { width: controlWidth }, style]}>
            <Host style={styles.host} colorScheme={isDark ? 'dark' : 'light'}>
                <Picker
                    options={options}
                    selectedIndex={selectedIndex >= 0 ? selectedIndex : 0}
                    onOptionSelected={handleOptionSelected}
                    variant="segmented"
                    modifiers={[
                        frame({ width: controlWidth, height: 36 }),
                    ]}
                />
            </Host>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        height: 38,
        alignSelf: 'stretch',
    },
    host: {
        flex: 1,
        height: 38,
    },
});
