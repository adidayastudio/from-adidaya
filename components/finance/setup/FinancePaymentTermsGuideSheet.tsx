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

export interface FinancePaymentTermsGuideSheetProps {
    visible: boolean;
    onClose: () => void;
}

export function FinancePaymentTermsGuideSheet(props: FinancePaymentTermsGuideSheetProps) {
    if (Platform.OS === 'ios') {
        const Comp = require('./FinancePaymentTermsGuideSheet.ios').FinancePaymentTermsGuideSheet || require('./FinancePaymentTermsGuideSheet.ios').default;
        return <Comp {...props} />;
    }

    return <FinancePaymentTermsGuideSheetWebAndroid {...props} />;
}

export default FinancePaymentTermsGuideSheet;

function FinancePaymentTermsGuideSheetWebAndroid({
    visible,
    onClose,
}: FinancePaymentTermsGuideSheetProps) {
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
            title: 'How Due Dates Work',
            items: [
                {
                    heading: 'Payment Deadline Calculation',
                    desc: 'Payment terms determine the maximum allowable deadline to settle an invoice, bill, or reimbursement.',
                },
                {
                    heading: 'Formula',
                    desc: 'Submission Date + Due Days = Maximum Payment Date.',
                },
            ],
        },
        {
            title: 'Submission & Payment Timeline',
            items: [
                {
                    heading: 'Net 7 Days',
                    desc: 'If submitted on 7 Sep 2026, maximum payment deadline is 14 Sep 2026 (7 calendar days).',
                },
                {
                    heading: 'Net 14 Days',
                    desc: 'If submitted on 7 Sep 2026, maximum payment deadline is 21 Sep 2026 (14 calendar days).',
                },
                {
                    heading: 'Net 30 Days',
                    desc: 'If submitted on 7 Sep 2026, maximum payment deadline is 7 Oct 2026 (30 calendar days).',
                },
                {
                    heading: 'Cash on Delivery (COD)',
                    desc: 'If submitted on 7 Sep 2026, payment is due immediately on 7 Sep 2026 (0 days).',
                },
            ],
        },
        {
            title: 'Workspace Rules',
            items: [
                {
                    heading: 'Workspace Default',
                    desc: 'The default term is automatically selected when creating new transactions to ensure consistent payment schedules.',
                },
                {
                    heading: 'Historical Archiving',
                    desc: 'Terms referenced by existing transactions are archived instead of deleted, ensuring historical audit trails remain accurate.',
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
                                About Payment Terms
                            </Text>
                            <Text style={[s.subtitle, { color: subtextColor }]}>
                                Due date calculations and settlement policies
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
