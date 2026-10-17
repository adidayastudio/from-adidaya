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
import * as Haptics from 'expo-haptics';

interface FinanceDocumentLevelsGuideSheetProps {
    visible: boolean;
    onClose: () => void;
}

export function FinanceDocumentLevelsGuideSheet({
    visible,
    onClose,
}: FinanceDocumentLevelsGuideSheetProps) {
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

    const levels = [
        {
            num: '01',
            title: 'Request',
            badge: 'Required Level',
            badgeBg: isDark ? 'rgba(100, 116, 139, 0.25)' : 'rgba(100, 116, 139, 0.12)',
            badgeColor: '#64748B',
            purpose: 'Individual request or claim created by staff or departments.',
            detail: 'The initial starting point for any expenditure or reimbursement. Captures requested items, cost estimates, and initial purpose.',
            icon: 'doc.text.fill',
        },
        {
            num: '02',
            title: 'Consolidation',
            badge: 'Optional Level',
            badgeBg: isDark ? 'rgba(245, 158, 11, 0.25)' : 'rgba(245, 158, 11, 0.12)',
            badgeColor: '#F59E0B',
            purpose: 'Optional level used to combine multiple requests into one processing document.',
            detail: 'Authorized staff or procurement consolidate one or multiple requests into a single processing document (e.g. Purchase Order or Batch Claim) before release.',
            icon: 'rectangle.stack.fill',
        },
        {
            num: '03',
            title: 'Payment',
            badge: 'Required Level',
            badgeBg: isDark ? 'rgba(52, 199, 89, 0.25)' : 'rgba(52, 199, 89, 0.12)',
            badgeColor: '#34C759',
            purpose: 'Final document used when Finance processes the payment.',
            detail: 'Finance reviews final settlement, executes bank disbursement or cash release, and issues the official payment voucher.',
            icon: 'creditcard.fill',
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
                    {/* Drag Indicator (Mobile Only) */}
                    {Platform.OS !== 'web' && (
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
                    )}

                    {/* Header */}
                    <View style={s.header}>
                        <View style={{ flex: 1 }}>
                            <Text style={[s.title, { color: textColor }]}>
                                About Document Levels
                            </Text>
                            <Text style={[s.subtitle, { color: subtextColor }]}>
                                3-Level Workflow Architecture
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
                            <PlatformIcon
                                name="xmark"
                                size={14}
                                tintColor={subtextColor}
                            />
                        </TouchableOpacity>
                    </View>

                            {/* Workflow Branching Diagram */}
                            <View
                                style={[
                                    s.flowBanner,
                                    {
                                        backgroundColor: isDark
                                            ? 'rgba(100, 116, 139, 0.12)'
                                            : 'rgba(100, 116, 139, 0.06)',
                                        borderColor: isDark
                                            ? 'rgba(100, 116, 139, 0.25)'
                                            : 'rgba(100, 116, 139, 0.15)',
                                    },
                                ]}
                            >
                                <View style={s.flowBannerHeader}>
                                    <PlatformIcon name="arrow.triangle.branch" size={14} tintColor="#64748B" />
                                    <Text style={s.flowBannerTitle}>Workflow Flexibility</Text>
                                </View>
                                <View style={s.flowRow}>
                                    <Text style={[s.flowModeLabel, { color: subtextColor }]}>Standard:</Text>
                                    <View style={s.flowPill}>
                                        <Text style={s.flowPillText}>Request</Text>
                                    </View>
                                    <Text style={s.flowArrow}>→</Text>
                                    <View style={s.flowPill}>
                                        <Text style={s.flowPillText}>Consolidation</Text>
                                    </View>
                                    <Text style={s.flowArrow}>→</Text>
                                    <View style={s.flowPill}>
                                        <Text style={s.flowPillText}>Payment</Text>
                                    </View>
                                </View>
                                <View style={[s.flowRow, { marginTop: 6 }]}>
                                    <Text style={[s.flowModeLabel, { color: subtextColor }]}>Direct:</Text>
                                    <View style={s.flowPill}>
                                        <Text style={s.flowPillText}>Request</Text>
                                    </View>
                                    <Text style={s.flowArrow}>→</Text>
                                    <View style={[s.flowPill, { backgroundColor: isDark ? 'rgba(52,199,89,0.2)' : 'rgba(52,199,89,0.1)' }]}>
                                        <Text style={[s.flowPillText, { color: '#34C759' }]}>Payment</Text>
                                    </View>
                                    <Text style={[s.flowDisabledHint, { color: subtextColor }]}>(When Consolidation Off)</Text>
                                </View>
                            </View>

                            {/* Cards Scroll */}
                            <ScrollView
                                style={s.list}
                                contentContainerStyle={s.listContent}
                                showsVerticalScrollIndicator={false}
                            >
                                {levels.map((item) => (
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
                                            <View style={s.levelTagRow}>
                                                <Text style={[s.levelNum, { color: '#64748B' }]}>
                                                    LEVEL {item.num}
                                                </Text>
                                                <View style={[s.badge, { backgroundColor: item.badgeBg }]}>
                                                    <Text style={[s.badgeText, { color: item.badgeColor }]}>
                                                        {item.badge}
                                                    </Text>
                                                </View>
                                            </View>
                                            <Text style={[s.levelTitle, { color: textColor }]}>
                                                {item.title}
                                            </Text>
                                        </View>

                                        <Text style={[s.purposeText, { color: textColor }]}>
                                            {item.purpose}
                                        </Text>

                                        <Text style={[s.detailText, { color: subtextColor }]}>
                                            {item.detail}
                                        </Text>
                                    </View>
                                ))}

                                {/* Footer Explanatory Callout */}
                                <View
                                    style={[
                                        s.calloutBox,
                                        {
                                            backgroundColor: isDark
                                                ? 'rgba(100, 116, 139, 0.12)'
                                                : 'rgba(100, 116, 139, 0.07)',
                                            borderColor: isDark
                                                ? 'rgba(100, 116, 139, 0.25)'
                                                : 'rgba(100, 116, 139, 0.15)',
                                        },
                                    ]}
                                >
                                    <View style={s.calloutIcon}>
                                        <PlatformIcon
                                            name="info.circle.fill"
                                            size={18}
                                            tintColor="#64748B"
                                        />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[s.calloutTitle, { color: textColor }]}>
                                            Customizable Naming
                                        </Text>
                                        <Text style={[s.calloutBody, { color: subtextColor }]}>
                                            Document names and codes can be customized without changing how each level works in the backend Finance lifecycle.
                                        </Text>
                                    </View>
                                </View>
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
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '88%',
        borderWidth: 1,
        overflow: 'hidden',
    },
    containerWeb: {
        width: 480,
        height: '100%',
        maxHeight: '100%',
        borderRadius: 20,
    },
    dragHandleContainer: {
        alignItems: 'center',
        paddingVertical: 10,
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
        fontWeight: '700',
        letterSpacing: -0.4,
    },
    subtitle: {
        fontSize: 13,
        marginTop: 2,
    },
    closeBtn: {
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    flowBanner: {
        marginHorizontal: 20,
        marginBottom: 12,
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
    },
    flowBannerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
    },
    flowBannerTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: '#64748B',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    flowRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    flowModeLabel: {
        fontSize: 12,
        fontWeight: '600',
        width: 62,
    },
    flowPill: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        backgroundColor: 'rgba(100, 116, 139, 0.15)',
    },
    flowPillText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#64748B',
    },
    flowArrow: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '600',
    },
    flowDisabledHint: {
        fontSize: 10,
        fontStyle: 'italic',
        marginLeft: 2,
    },
    list: {
        flex: 1,
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
        gap: 12,
    },
    guideCard: {
        borderRadius: 16,
        padding: 14,
        borderWidth: StyleSheet.hairlineWidth,
    },
    guideCardHeader: {
        marginBottom: 8,
    },
    levelTagRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    levelNum: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    badge: {
        paddingHorizontal: 7,
        paddingVertical: 2.5,
        borderRadius: 6,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '700',
    },
    levelTitle: {
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    purposeText: {
        fontSize: 13,
        fontWeight: '600',
        lineHeight: 18,
        marginBottom: 6,
    },
    detailText: {
        fontSize: 12,
        lineHeight: 16,
    },
    calloutBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
        marginTop: 4,
        gap: 12,
    },
    calloutIcon: {
        marginTop: 2,
    },
    calloutTitle: {
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 2,
    },
    calloutBody: {
        fontSize: 12,
        lineHeight: 17,
    },
});
