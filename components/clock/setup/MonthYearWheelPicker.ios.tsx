import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Pressable,
} from 'react-native';
import {
    Host,
    HStack,
    Picker,
} from '@expo/ui/swift-ui';
import { frame, padding } from '@expo/ui/swift-ui/modifiers';
import * as Haptics from 'expo-haptics';

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

const START_YEAR = 2020;
const YEARS = Array.from({ length: 16 }, (_, i) => START_YEAR + i); // 2020 - 2035
const YEAR_STRINGS = YEARS.map(String);

export interface MonthYearWheelPickerProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: (year: number, month: number) => void;
    initialYear: number;
    initialMonth: number; // 0-11
    isDark: boolean;
    textColor: string;
    subtextColor: string;
}

export function MonthYearWheelPicker({
    visible,
    onClose,
    onConfirm,
    initialYear,
    initialMonth,
    isDark,
    textColor,
    subtextColor,
}: MonthYearWheelPickerProps) {
    const [selectedMonth, setSelectedMonth] = useState(initialMonth);
    const [selectedYear, setSelectedYear] = useState(initialYear);

    useEffect(() => {
        if (visible) {
            setSelectedMonth(initialMonth);
            setSelectedYear(initialYear);
        }
    }, [visible, initialMonth, initialYear]);

    const handleConfirm = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onConfirm(selectedYear, selectedMonth);
        onClose();
    };

    const yearIndex = Math.max(0, YEARS.indexOf(selectedYear));

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <Pressable style={styles.modalBackdrop} onPress={onClose}>
                <Pressable
                    style={[
                        styles.sheetContainer,
                        {
                            backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                            borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
                        },
                    ]}
                    onPress={(e) => e.stopPropagation()}
                >
                    {/* Header: Cancel, Title, Done */}
                    <View
                        style={[
                            styles.header,
                            { borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' },
                        ]}
                    >
                        <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={styles.headerBtn}>
                            <Text style={[styles.cancelText, { color: subtextColor }]}>Cancel</Text>
                        </TouchableOpacity>

                        <Text style={[styles.headerTitle, { color: textColor }]}>
                            Select Month & Year
                        </Text>

                        <TouchableOpacity onPress={handleConfirm} activeOpacity={0.7} style={styles.headerBtn}>
                            <Text style={styles.doneText}>Done</Text>
                        </TouchableOpacity>
                    </View>

                    {/* True Native SwiftUI Dual-Wheel Pickers with 3D Physics */}
                    <View style={styles.pickerContainer}>
                        <Host
                            style={styles.hostContainer}
                            colorScheme={isDark ? 'dark' : 'light'}
                        >
                            <HStack
                                alignment="center"
                                modifiers={[
                                    padding({ horizontal: 8 }),
                                ]}
                            >
                                <Picker
                                    options={MONTHS}
                                    selectedIndex={selectedMonth}
                                    variant="wheel"
                                    onOptionSelected={(e: any) => {
                                        const idx = e.nativeEvent.index;
                                        if (idx >= 0 && idx < MONTHS.length) {
                                            setSelectedMonth(idx);
                                        }
                                    }}
                                    modifiers={[
                                        frame({ maxWidth: 200, minWidth: 140 }),
                                    ]}
                                />

                                <Picker
                                    options={YEAR_STRINGS}
                                    selectedIndex={yearIndex}
                                    variant="wheel"
                                    onOptionSelected={(e: any) => {
                                        const idx = e.nativeEvent.index;
                                        if (idx >= 0 && idx < YEARS.length) {
                                            setSelectedYear(YEARS[idx]);
                                        }
                                    }}
                                    modifiers={[
                                        frame({ maxWidth: 120, minWidth: 90 }),
                                    ]}
                                />
                            </HStack>
                        </Host>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
    },
    sheetContainer: {
        width: '100%',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderWidth: StyleSheet.hairlineWidth,
        paddingBottom: 34,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 10,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerBtn: {
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    cancelText: {
        fontSize: 15,
        fontWeight: '500',
    },
    doneText: {
        color: '#007AFF',
        fontSize: 15,
        fontWeight: '600',
    },
    pickerContainer: {
        height: 220,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    hostContainer: {
        width: '100%',
        height: 220,
    },
});
