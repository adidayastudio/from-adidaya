import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Pressable,
    ScrollView,
    NativeSyntheticEvent,
    NativeScrollEvent,
} from 'react-native';
import * as Haptics from 'expo-haptics';

const ITEM_HEIGHT = 44;
const VISIBLE_COUNT = 5;
const CONTAINER_HEIGHT = ITEM_HEIGHT * VISIBLE_COUNT; // 220px
const PADDING = ITEM_HEIGHT * 2; // 88px (2 empty slots top & bottom)

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

const START_YEAR = 2020;
const YEARS = Array.from({ length: 16 }, (_, i) => START_YEAR + i); // 2020 - 2035

interface MonthYearWheelPickerProps {
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

    const monthScrollRef = useRef<ScrollView>(null);
    const yearScrollRef = useRef<ScrollView>(null);

    // Sync on opening
    useEffect(() => {
        if (visible) {
            setSelectedMonth(initialMonth);
            setSelectedYear(initialYear);

            setTimeout(() => {
                monthScrollRef.current?.scrollTo({
                    y: initialMonth * ITEM_HEIGHT,
                    animated: false,
                });
                const yearIndex = Math.max(0, YEARS.indexOf(initialYear));
                yearScrollRef.current?.scrollTo({
                    y: yearIndex * ITEM_HEIGHT,
                    animated: false,
                });
            }, 50);
        }
    }, [visible, initialMonth, initialYear]);

    const handleMonthScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const offsetY = e.nativeEvent.contentOffset.y;
        const index = Math.round(offsetY / ITEM_HEIGHT);
        const clampedIndex = Math.max(0, Math.min(MONTHS.length - 1, index));
        if (clampedIndex !== selectedMonth) {
            Haptics.selectionAsync();
            setSelectedMonth(clampedIndex);
        }
    }, [selectedMonth]);

    const handleYearScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const offsetY = e.nativeEvent.contentOffset.y;
        const index = Math.round(offsetY / ITEM_HEIGHT);
        const clampedIndex = Math.max(0, Math.min(YEARS.length - 1, index));
        const newYear = YEARS[clampedIndex];
        if (newYear !== selectedYear) {
            Haptics.selectionAsync();
            setSelectedYear(newYear);
        }
    }, [selectedYear]);

    const handleConfirm = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onConfirm(selectedYear, selectedMonth);
        onClose();
    };

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

                    {/* Dual-Wheel Roller Area */}
                    <View style={styles.pickerBody}>
                        {/* Center Highlight Selection Lines (Exact image 4 iOS style) */}
                        <View
                            style={[
                                styles.selectionHighlight,
                                {
                                    borderColor: isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.15)',
                                    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)',
                                },
                            ]}
                            pointerEvents="none"
                        />

                        {/* Left Wheel: Months */}
                        <View style={styles.wheelColumn}>
                            <ScrollView
                                ref={monthScrollRef}
                                showsVerticalScrollIndicator={false}
                                snapToInterval={ITEM_HEIGHT}
                                decelerationRate="fast"
                                bounces={false}
                                contentContainerStyle={{ paddingVertical: PADDING }}
                                onMomentumScrollEnd={handleMonthScrollEnd}
                                onScrollEndDrag={handleMonthScrollEnd}
                            >
                                {MONTHS.map((mName, idx) => {
                                    const isSelected = selectedMonth === idx;
                                    return (
                                        <TouchableOpacity
                                            key={mName}
                                            activeOpacity={0.7}
                                            onPress={() => {
                                                Haptics.selectionAsync();
                                                setSelectedMonth(idx);
                                                monthScrollRef.current?.scrollTo({
                                                    y: idx * ITEM_HEIGHT,
                                                    animated: true,
                                                });
                                            }}
                                            style={styles.wheelItem}
                                        >
                                            <Text
                                                style={[
                                                    styles.wheelItemText,
                                                    {
                                                        color: isSelected ? textColor : subtextColor,
                                                        fontWeight: isSelected ? '700' : '400',
                                                        fontSize: isSelected ? 18 : 15,
                                                        opacity: isSelected ? 1 : 0.45,
                                                    },
                                                ]}
                                            >
                                                {mName}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>

                        {/* Right Wheel: Years */}
                        <View style={styles.wheelColumn}>
                            <ScrollView
                                ref={yearScrollRef}
                                showsVerticalScrollIndicator={false}
                                snapToInterval={ITEM_HEIGHT}
                                decelerationRate="fast"
                                bounces={false}
                                contentContainerStyle={{ paddingVertical: PADDING }}
                                onMomentumScrollEnd={handleYearScrollEnd}
                                onScrollEndDrag={handleYearScrollEnd}
                            >
                                {YEARS.map((yNum) => {
                                    const isSelected = selectedYear === yNum;
                                    const yIndex = YEARS.indexOf(yNum);
                                    return (
                                        <TouchableOpacity
                                            key={yNum}
                                            activeOpacity={0.7}
                                            onPress={() => {
                                                Haptics.selectionAsync();
                                                setSelectedYear(yNum);
                                                yearScrollRef.current?.scrollTo({
                                                    y: yIndex * ITEM_HEIGHT,
                                                    animated: true,
                                                });
                                            }}
                                            style={styles.wheelItem}
                                        >
                                            <Text
                                                style={[
                                                    styles.wheelItemText,
                                                    {
                                                        color: isSelected ? textColor : subtextColor,
                                                        fontWeight: isSelected ? '700' : '400',
                                                        fontSize: isSelected ? 18 : 15,
                                                        opacity: isSelected ? 1 : 0.45,
                                                    },
                                                ]}
                                            >
                                                {yNum}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>
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
        paddingBottom: 32,
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
    pickerBody: {
        height: CONTAINER_HEIGHT,
        flexDirection: 'row',
        position: 'relative',
        paddingHorizontal: 20,
    },
    selectionHighlight: {
        position: 'absolute',
        top: PADDING,
        left: 16,
        right: 16,
        height: ITEM_HEIGHT,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderRadius: 8,
    },
    wheelColumn: {
        flex: 1,
        height: CONTAINER_HEIGHT,
    },
    wheelItem: {
        height: ITEM_HEIGHT,
        alignItems: 'center',
        justifyContent: 'center',
    },
    wheelItemText: {
        textAlign: 'center',
    },
});
