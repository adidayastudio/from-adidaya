import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
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

    return (
        <View style={[styles.container, isDark ? styles.containerDark : styles.containerLight]}>
            {options.map((option, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                    <TouchableOpacity
                        key={option + idx}
                        style={[
                            styles.segment,
                            isSelected && (isDark ? styles.selectedSegmentDark : styles.selectedSegmentLight),
                        ]}
                        onPress={() => {
                            Haptics.selectionAsync();
                            onChange(idx);
                        }}
                        activeOpacity={0.7}
                    >
                        <Text
                            style={[
                                styles.text,
                                isSelected
                                    ? (isDark ? styles.textSelectedDark : styles.textSelectedLight)
                                    : (isDark ? styles.textUnselectedDark : styles.textUnselectedLight),
                            ]}
                            numberOfLines={1}
                        >
                            {option}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        height: 36,
        borderRadius: 9,
        padding: 2,
        alignSelf: 'stretch',
        marginBottom: 2,
    },
    containerLight: {
        backgroundColor: 'rgba(118, 118, 128, 0.12)',
    },
    containerDark: {
        backgroundColor: 'rgba(118, 118, 128, 0.24)',
    },
    segment: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 7,
        paddingHorizontal: 8,
    },
    selectedSegmentLight: {
        backgroundColor: '#FFFFFF',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 2,
        elevation: 2,
    },
    selectedSegmentDark: {
        backgroundColor: '#636366',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
        elevation: 2,
    },
    text: {
        fontSize: 13,
        fontWeight: '500',
    },
    textSelectedLight: {
        color: '#000000',
        fontWeight: '600',
    },
    textSelectedDark: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    textUnselectedLight: {
        color: '#000000',
        opacity: 0.7,
    },
    textUnselectedDark: {
        color: '#FFFFFF',
        opacity: 0.7,
    },
});

export default NativeSegmentedPicker;
