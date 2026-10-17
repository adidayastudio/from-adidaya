import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Host, Picker, HStack } from '@expo/ui/swift-ui';
import { frame } from '@expo/ui/swift-ui/modifiers';
import { useTheme } from '@/context/ThemeContext';
import * as Haptics from 'expo-haptics';

interface FinanceWorkflowSegmentedPickerProps {
    activeTab: 'purchasing' | 'reimbursement';
    onTabChange: (tab: 'purchasing' | 'reimbursement') => void;
}

const OPTIONS = ['Purchasing', 'Reimbursement'];

export function FinanceWorkflowSegmentedPicker({
    activeTab,
    onTabChange,
}: FinanceWorkflowSegmentedPickerProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const selectedIndex = activeTab === 'purchasing' ? 0 : 1;

    const screenWidth = Dimensions.get('window').width;
    const pickerWidth = screenWidth - 32;

    const handleOptionSelected = ({ nativeEvent: { index } }: { nativeEvent: { index: number; label: string } }) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (index === 0) onTabChange('purchasing');
        if (index === 1) onTabChange('reimbursement');
    };

    return (
        <View style={s.container}>
            <Host style={s.host} colorScheme={isDark ? 'dark' : 'light'}>
                <HStack alignment="center" modifiers={[frame({ width: pickerWidth, height: 36 })]}>
                    <Picker
                        options={OPTIONS}
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

export default FinanceWorkflowSegmentedPicker;
