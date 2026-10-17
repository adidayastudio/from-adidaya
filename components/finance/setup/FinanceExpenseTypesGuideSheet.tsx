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

export interface FinanceExpenseTypesGuideSheetProps {
    visible: boolean;
    onClose: () => void;
}

export function FinanceExpenseTypesGuideSheet(props: FinanceExpenseTypesGuideSheetProps) {
    if (Platform.OS === 'ios') {
        const Comp = require('./FinanceExpenseTypesGuideSheet.ios').FinanceExpenseTypesGuideSheet || require('./FinanceExpenseTypesGuideSheet.ios').default;
        return <Comp {...props} />;
    }

    return <FinanceExpenseTypesGuideSheetWebAndroid {...props} />;
}

function FinanceExpenseTypesGuideSheetWebAndroid({
    visible,
    onClose,
}: FinanceExpenseTypesGuideSheetProps) {
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
            title: 'Classification Structure',
            items: [
                {
                    heading: 'What is an Expense Type?',
                    desc: 'A reusable classification standard applied across purchasing, claims, and reimbursements to standardize spending analysis.',
                },
                {
                    heading: 'Relationship to Categories',
                    desc: 'Transaction Categories and subcategories select an Expense Type as their default spending classification.',
                },
            ],
        },
        {
            title: 'Default Mappings',
            items: [
                {
                    heading: 'Tax Rule Defaults',
                    desc: 'Configuring a default Tax Rule (e.g. PPN 11%) automatically populates tax calculations when this expense type is selected.',
                },
                {
                    heading: 'Ledger Account Defaults',
                    desc: 'Maps expenses directly to Chart of Accounts entries (e.g. 5-1000 Project Procurement) for automated reporting.',
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
                                About Expense Types
                            </Text>
                            <Text style={[s.subtitle, { color: subtextColor }]}>
                                Reusable classification and account mapping
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={handleDismiss}
                            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                            style={[
                                s.closeButton,
                                {
                                    backgroundColor: isDark
                                        ? 'rgba(255,255,255,0.08)'
                                        : 'rgba(0,0,0,0.05)',
                                },
                            ]}
                        >
                            <PlatformIcon name="xmark" size={14} tintColor={textColor} />
                        </TouchableOpacity>
                    </View>

                    {/* Content Scroll */}
                    <ScrollView
                        style={s.scroll}
                        contentContainerStyle={s.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {sections.map((sec, secIdx) => (
                            <View key={secIdx} style={s.section}>
                                <Text style={[s.sectionTitle, { color: subtextColor }]}>
                                    {sec.title.toUpperCase()}
                                </Text>
                                <View
                                    style={[
                                        s.groupCard,
                                        {
                                            backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7',
                                            borderColor: isDark
                                                ? 'rgba(255,255,255,0.06)'
                                                : 'rgba(0,0,0,0.04)',
                                        },
                                    ]}
                                >
                                    {sec.items.map((item, itemIdx) => (
                                        <View key={itemIdx}>
                                            <View style={s.itemRow}>
                                                <Text style={[s.itemHeading, { color: textColor }]}>
                                                    {item.heading}
                                                </Text>
                                                <Text style={[s.itemDesc, { color: subtextColor }]}>
                                                    {item.desc}
                                                </Text>
                                            </View>
                                            {itemIdx < sec.items.length - 1 && (
                                                <View
                                                    style={[
                                                        s.divider,
                                                        {
                                                            backgroundColor: isDark
                                                                ? 'rgba(255,255,255,0.08)'
                                                                : 'rgba(0,0,0,0.06)',
                                                        },
                                                    ]}
                                                />
                                            )}
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
        backgroundColor: 'rgba(0,0,0,0.4)',
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
        maxHeight: '88%',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
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
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 18,
        paddingBottom: 14,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    subtitle: {
        fontSize: 13,
        marginTop: 2,
    },
    closeButton: {
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 24,
        gap: 16,
    },
    section: {
        gap: 8,
    },
    sectionTitle: {
        fontSize: 11.5,
        fontWeight: '700',
        letterSpacing: 0.6,
        paddingHorizontal: 4,
    },
    groupCard: {
        borderRadius: 14,
        borderWidth: 1,
        overflow: 'hidden',
    },
    itemRow: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 4,
    },
    itemHeading: {
        fontSize: 14.5,
        fontWeight: '600',
    },
    itemDesc: {
        fontSize: 13,
        lineHeight: 18,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 16,
    },
});

export default FinanceExpenseTypesGuideSheet;
