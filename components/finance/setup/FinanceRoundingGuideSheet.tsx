import React from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TouchableWithoutFeedback,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import * as Haptics from 'expo-haptics';

interface FinanceRoundingGuideSheetProps {
    visible: boolean;
    onClose: () => void;
}

export function FinanceRoundingGuideSheet({
    visible,
    onClose,
}: FinanceRoundingGuideSheetProps) {
    const insets = useSafeAreaInsets();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#000000';
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';

    const guideItems = [
        {
            title: 'Standard Rounding',
            badge: 'Recommended',
            color: '#007AFF',
            bg: 'rgba(0,122,255,0.12)',
            rule: 'Decimals ≥ 0.5 round up, < 0.5 round down',
            examples: [
                { original: 'Rp 12,345.60', result: 'Rp 12,346' },
                { original: 'Rp 12,345.40', result: 'Rp 12,345' },
            ],
        },
        {
            title: 'Round Down (Floor/Truncate)',
            badge: 'Tax/Claims',
            color: '#FF9500',
            bg: 'rgba(255,149,0,0.12)',
            rule: 'All decimal remainders are discarded/rounded down',
            examples: [
                { original: 'Rp 12,345.90', result: 'Rp 12,345' },
                { original: 'Rp 12,345.20', result: 'Rp 12,345' },
            ],
        },
        {
            title: 'Round Up (Ceil)',
            badge: 'Disbursement',
            color: '#34C759',
            bg: 'rgba(52,199,89,0.12)',
            rule: 'Any decimal remainder > 0 is rounded up to next integer',
            examples: [
                { original: 'Rp 12,345.10', result: 'Rp 12,346' },
                { original: 'Rp 12,345.01', result: 'Rp 12,346' },
            ],
        },
        {
            title: 'No Rounding (Exact)',
            badge: 'Exact Precision',
            color: '#AF52DE',
            bg: 'rgba(175,82,222,0.12)',
            rule: 'Numbers retain their precise decimal places',
            examples: [
                { original: 'Rp 12,345.67', result: 'Rp 12,345.67' },
                { original: 'Rp 12,345.00', result: 'Rp 12,345.00' },
            ],
        },
    ];

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={s.overlay}>
                    <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                        <View
                            style={[
                                s.sheetContainer,
                                {
                                    backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                                    paddingBottom: Math.max(insets.bottom, 20),
                                },
                            ]}
                        >
                            {/* Drag Indicator */}
                            <View style={s.dragHandleContainer}>
                                <View
                                    style={[
                                        s.dragHandle,
                                        {
                                            backgroundColor: isDark
                                                ? 'rgba(255,255,255,0.2)'
                                                : 'rgba(0,0,0,0.15)',
                                        },
                                    ]}
                                />
                            </View>

                            {/* Header */}
                            <View style={s.header}>
                                <View style={{ flex: 1 }}>
                                    <Text style={[s.title, { color: textColor }]}>About Rounding Methods</Text>
                                    <Text style={[s.subtitle, { color: subtextColor }]}>
                                        How calculations and financial figures are rounded
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    onPress={onClose}
                                    style={[
                                        s.closeBtn,
                                        {
                                            backgroundColor: isDark
                                                ? 'rgba(255,255,255,0.08)'
                                                : 'rgba(0,0,0,0.05)',
                                        },
                                    ]}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                >
                                    <PlatformIcon
                                        name="xmark"
                                        size={14}
                                        tintColor={subtextColor}
                                    />
                                </TouchableOpacity>
                            </View>

                            {/* Cards Scroll */}
                            <ScrollView
                                style={s.list}
                                contentContainerStyle={s.listContent}
                                showsVerticalScrollIndicator={false}
                            >
                                {guideItems.map((item, idx) => (
                                    <View
                                        key={item.title}
                                        style={[
                                            s.guideCard,
                                            {
                                                backgroundColor: isDark
                                                    ? 'rgba(255,255,255,0.04)'
                                                    : 'rgba(0,0,0,0.025)',
                                                borderColor: isDark
                                                    ? 'rgba(255,255,255,0.08)'
                                                    : 'rgba(0,0,0,0.06)',
                                            },
                                        ]}
                                    >
                                        <View style={s.guideCardHeader}>
                                            <Text style={[s.guideCardTitle, { color: textColor }]}>
                                                {item.title}
                                            </Text>
                                            <View style={[s.badge, { backgroundColor: item.bg }]}>
                                                <Text style={[s.badgeText, { color: item.color }]}>
                                                    {item.badge}
                                                </Text>
                                            </View>
                                        </View>
                                        <Text style={[s.guideCardRule, { color: subtextColor }]}>
                                            {item.rule}
                                        </Text>

                                        <View style={s.exampleBox}>
                                            {item.examples.map((ex, exIdx) => (
                                                <View key={exIdx} style={s.exampleRow}>
                                                    <Text style={[s.exampleOrig, { color: subtextColor }]}>
                                                        {ex.original}
                                                    </Text>
                                                    <PlatformIcon
                                                        name="arrow.right"
                                                        size={11}
                                                        tintColor={subtextColor}
                                                    />
                                                    <Text style={[s.exampleResult, { color: textColor }]}>
                                                        {ex.result}
                                                    </Text>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                ))}
                            </ScrollView>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

const s = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
    },
    sheetContainer: {
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        maxHeight: '80%',
        paddingTop: 8,
    },
    dragHandleContainer: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    dragHandle: {
        width: 36,
        height: 5,
        borderRadius: 2.5,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 14,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        letterSpacing: -0.3,
    },
    subtitle: {
        fontSize: 13,
        fontWeight: '400',
        marginTop: 2,
    },
    closeBtn: {
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    list: {
        paddingHorizontal: 16,
    },
    listContent: {
        paddingBottom: 20,
        gap: 12,
    },
    guideCard: {
        padding: 14,
        borderRadius: 16,
        borderWidth: StyleSheet.hairlineWidth,
        gap: 6,
    },
    guideCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    guideCardTitle: {
        fontSize: 15,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '600',
    },
    guideCardRule: {
        fontSize: 13,
        fontWeight: '400',
        lineHeight: 17,
    },
    exampleBox: {
        marginTop: 4,
        gap: 4,
        paddingTop: 8,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: 'rgba(150,150,150,0.15)',
    },
    exampleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    exampleOrig: {
        fontSize: 13,
        fontWeight: '400',
    },
    exampleResult: {
        fontSize: 13,
        fontWeight: '600',
    },
});
