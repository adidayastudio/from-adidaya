import React, { useEffect, useRef } from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TouchableWithoutFeedback,
    Platform,
    Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { PlatformIcon } from '@/components/ui/PlatformIcon';

export interface FinancePaymentCyclesGuideSheetProps {
    visible: boolean;
    onClose: () => void;
}

export function FinancePaymentCyclesGuideSheet(props: FinancePaymentCyclesGuideSheetProps) {
    if (Platform.OS === 'ios') {
        const Comp = require('./FinancePaymentCyclesGuideSheet.ios').FinancePaymentCyclesGuideSheet || require('./FinancePaymentCyclesGuideSheet.ios').default;
        return <Comp {...props} />;
    }

    return <FinancePaymentCyclesGuideSheetWebAndroid {...props} />;
}

export default FinancePaymentCyclesGuideSheet;

function FinancePaymentCyclesGuideSheetWebAndroid({
    visible,
    onClose,
}: FinancePaymentCyclesGuideSheetProps) {
    const insets = useSafeAreaInsets();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#000000';
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';

    const slideAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: Platform.OS !== 'web',
                }),
                Animated.spring(slideAnim, {
                    toValue: 1,
                    tension: 65,
                    friction: 11,
                    useNativeDriver: Platform.OS !== 'web',
                }),
            ]).start();
        } else {
            slideAnim.setValue(0);
            fadeAnim.setValue(0);
        }
    }, [visible, fadeAnim, slideAnim]);

    const handleDismiss = () => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 180,
                useNativeDriver: Platform.OS !== 'web',
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: Platform.OS !== 'web',
            }),
        ]).start(() => {
            onClose();
        });
    };

    if (!visible) return null;

    const sections = [
        {
            title: 'Payment Terms vs Payment Cycles',
            items: [
                {
                    heading: 'Payment Terms',
                    desc: 'Defines when a transaction is due. This is the legal / contractual deadline for payment.',
                },
                {
                    heading: 'Payment Cycles',
                    desc: 'Defines when approved transactions are grouped and processed for payment by Finance.',
                },
                {
                    heading: 'Due Date Integrity',
                    desc: 'Payment Cycles never overwrite or alter the transaction original Due Date.',
                },
            ],
        },
        {
            title: 'Cut-off Rules',
            items: [
                {
                    heading: 'Cut-off Deadline',
                    desc: 'Each cycle defines when transactions stop being included in the upcoming payment run.',
                },
                {
                    heading: 'Late Approval Roll-over',
                    desc: 'Transactions approved after the cut-off automatically move to the next eligible payment cycle.',
                },
            ],
        },
        {
            title: 'Frequency Definitions',
            items: [
                {
                    heading: 'Weekly',
                    desc: 'Payment occurs on a selected weekday every week (e.g. Every Friday).',
                },
                {
                    heading: 'Every 2 Weeks (Bi-Weekly)',
                    desc: 'Payment recurs every 14 days on a selected weekday based on an anchor start date.',
                },
                {
                    heading: 'Twice Monthly (Semi-Monthly)',
                    desc: 'Payment occurs on two specific calendar dates every month (e.g. 1st & 15th of each month).',
                },
            ],
        },
    ];

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={handleDismiss}
            statusBarTranslucent
            navigationBarTranslucent={Platform.OS === 'android'}
        >
            <View style={[s.overlay, Platform.OS === 'web' && s.overlayWeb]}>
                <TouchableWithoutFeedback onPress={handleDismiss}>
                    <Animated.View style={[s.backdrop, { opacity: fadeAnim }]} />
                </TouchableWithoutFeedback>

                <Animated.View
                    style={[
                        s.sheetContainer,
                        Platform.OS === 'web' && s.containerWeb,
                        {
                            backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                            paddingBottom: Platform.OS === 'web' ? 20 : Math.max(insets.bottom, 20),
                            transform: [
                                {
                                    translateX: slideAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [Platform.OS === 'web' ? 520 : 0, 0],
                                    }),
                                },
                                {
                                    translateY: slideAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [Platform.OS === 'web' ? 0 : 350, 0],
                                    }),
                                },
                            ],
                        },
                    ]}
                >
                    {/* Header */}
                    <View style={s.header}>
                        <View style={{ flex: 1 }}>
                            <Text style={[s.title, { color: textColor }]}>
                                About Payment Cycles
                            </Text>
                            <Text style={[s.subtitle, { color: subtextColor }]}>
                                Batch disbursement schedule and cut-off rules
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={handleDismiss}
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
                            <PlatformIcon name="xmark" size={14} tintColor={subtextColor} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={s.formScroll}
                        contentContainerStyle={s.formContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {sections.map((sec, sIdx) => (
                            <View key={sIdx} style={s.sectionBlock}>
                                <Text style={s.sectionHeader}>{sec.title}</Text>
                                <View
                                    style={[
                                        s.sectionCard,
                                        {
                                            backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                                            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                                        },
                                    ]}
                                >
                                    {sec.items.map((it, iIdx) => (
                                        <View key={iIdx} style={[s.guideItem, iIdx > 0 && s.guideItemBorder]}>
                                            <Text style={[s.itemHeading, { color: textColor }]}>{it.heading}</Text>
                                            <Text style={[s.itemDesc, { color: subtextColor }]}>{it.desc}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        ))}
                    </ScrollView>
                </Animated.View>
            </View>
        </Modal>
    );
}

const s = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    overlayWeb: {
        padding: 12,
        alignItems: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
    },
    sheetContainer: {
        width: '100%',
        maxHeight: '90%',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderWidth: 1,
        overflow: 'hidden',
    },
    containerWeb: {
        width: 480,
        height: '100%',
        maxHeight: '100%',
        borderRadius: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'web' ? 20 : 16,
        paddingBottom: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
    },
    subtitle: {
        fontSize: 13,
        marginTop: 2,
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 12,
    },
    formScroll: {
        flex: 1,
    },
    formContent: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 24,
        gap: 20,
    },
    sectionBlock: {
        gap: 8,
    },
    sectionHeader: {
        fontSize: 12,
        fontWeight: '700',
        color: '#8E8E93',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    sectionCard: {
        borderRadius: 16,
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    guideItem: {
        paddingVertical: 8,
        gap: 3,
    },
    guideItemBorder: {
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: 'rgba(128, 128, 128, 0.15)',
    },
    itemHeading: {
        fontSize: 14,
        fontWeight: '600',
    },
    itemDesc: {
        fontSize: 13,
        lineHeight: 18,
    },
});
