import React from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TouchableWithoutFeedback,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import * as Haptics from 'expo-haptics';
import { ROUNDING_METHOD_OPTIONS, RoundingMethod } from '@/lib/api/financeSetup';

interface FinanceRoundingMethodSheetProps {
    visible: boolean;
    onClose: () => void;
    selectedMethod: RoundingMethod;
    onSelect: (method: RoundingMethod) => void;
    onOpenGuide: () => void;
}

const ROUNDING_ICONS: Record<RoundingMethod, { name: string; color: string; bg: string }> = {
    standard: {
        name: 'arrow.up.and.down.circle.fill',
        color: '#007AFF',
        bg: 'rgba(0,122,255,0.12)',
    },
    down: {
        name: 'arrow.down.circle.fill',
        color: '#FF9500',
        bg: 'rgba(255,149,0,0.12)',
    },
    up: {
        name: 'arrow.up.circle.fill',
        color: '#34C759',
        bg: 'rgba(52,199,89,0.12)',
    },
    none: {
        name: 'equal.circle.fill',
        color: '#AF52DE',
        bg: 'rgba(175,82,222,0.12)',
    },
};

export function FinanceRoundingMethodSheet({
    visible,
    onClose,
    selectedMethod,
    onSelect,
    onOpenGuide,
}: FinanceRoundingMethodSheetProps) {
    const insets = useSafeAreaInsets();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#000000';
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';

    const handleSelect = (method: RoundingMethod) => {
        Haptics.selectionAsync();
        onSelect(method);
        onClose();
    };

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
                                    <Text style={[s.title, { color: textColor }]}>Rounding Method</Text>
                                    <Text style={[s.subtitle, { color: subtextColor }]}>
                                        How values are rounded when exceeding precision
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

                            {/* Options List */}
                            <View style={s.list}>
                                {ROUNDING_METHOD_OPTIONS.map((item, idx) => {
                                    const isSelected = item.value === selectedMethod;
                                    const iconConfig = ROUNDING_ICONS[item.value];
                                    const isLast = idx === ROUNDING_METHOD_OPTIONS.length - 1;

                                    return (
                                        <View key={item.value}>
                                            <TouchableOpacity
                                                style={[
                                                    s.optionRow,
                                                    isSelected && {
                                                        backgroundColor: isDark
                                                            ? 'rgba(0,122,255,0.12)'
                                                            : 'rgba(0,122,255,0.08)',
                                                    },
                                                ]}
                                                onPress={() => handleSelect(item.value)}
                                                activeOpacity={0.7}
                                            >
                                                <View
                                                    style={[
                                                        s.iconBox,
                                                        { backgroundColor: iconConfig.bg },
                                                    ]}
                                                >
                                                    <PlatformIcon
                                                        name={iconConfig.name as any}
                                                        size={20}
                                                        tintColor={iconConfig.color}
                                                    />
                                                </View>
                                                <View style={s.optionInfo}>
                                                    <Text style={[s.optionLabel, { color: textColor }]}>
                                                        {item.title}
                                                    </Text>
                                                    <Text style={[s.optionDesc, { color: subtextColor }]}>
                                                        {item.description}
                                                    </Text>
                                                </View>
                                                {isSelected && (
                                                    <PlatformIcon
                                                        name="checkmark.circle.fill"
                                                        size={20}
                                                        tintColor="#007AFF"
                                                    />
                                                )}
                                            </TouchableOpacity>
                                            {!isLast && (
                                                <View
                                                    style={[
                                                        s.rowDivider,
                                                        {
                                                            backgroundColor: isDark
                                                                ? 'rgba(255,255,255,0.06)'
                                                                : 'rgba(0,0,0,0.06)',
                                                        },
                                                    ]}
                                                />
                                            )}
                                        </View>
                                    );
                                })}
                            </View>

                            {/* Guide footer action */}
                            <TouchableOpacity
                                style={[
                                    s.guideFooterBtn,
                                    {
                                        backgroundColor: isDark
                                            ? 'rgba(255,255,255,0.05)'
                                            : 'rgba(0,0,0,0.03)',
                                    },
                                ]}
                                onPress={() => {
                                    onClose();
                                    setTimeout(() => {
                                        onOpenGuide();
                                    }, 250);
                                }}
                                activeOpacity={0.7}
                            >
                                <PlatformIcon
                                    name="info.circle.fill"
                                    size={16}
                                    tintColor="#007AFF"
                                />
                                <Text style={s.guideFooterText}>
                                    About rounding calculation methods & examples
                                </Text>
                                <PlatformIcon
                                    name="chevron.right"
                                    size={12}
                                    tintColor={subtextColor}
                                />
                            </TouchableOpacity>
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
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 14,
        gap: 12,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    optionInfo: {
        flex: 1,
        gap: 2,
    },
    optionLabel: {
        fontSize: 15,
        fontWeight: '500',
        letterSpacing: -0.2,
    },
    optionDesc: {
        fontSize: 12,
        fontWeight: '400',
    },
    rowDivider: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 64,
    },
    guideFooterBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginTop: 16,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 14,
        gap: 8,
    },
    guideFooterText: {
        flex: 1,
        fontSize: 13,
        fontWeight: '500',
        color: '#007AFF',
    },
});
