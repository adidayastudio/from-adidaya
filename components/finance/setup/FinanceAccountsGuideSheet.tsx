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

export interface FinanceAccountsGuideSheetProps {
    visible: boolean;
    onClose: () => void;
}

export function FinanceAccountsGuideSheet(props: FinanceAccountsGuideSheetProps) {
    if (Platform.OS === 'ios') {
        const Comp = require('./FinanceAccountsGuideSheet.ios').FinanceAccountsGuideSheet || require('./FinanceAccountsGuideSheet.ios').default;
        return <Comp {...props} />;
    }

    return <FinanceAccountsGuideSheetWebAndroid {...props} />;
}

function FinanceAccountsGuideSheetWebAndroid({
    visible,
    onClose,
}: FinanceAccountsGuideSheetProps) {
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
            title: 'Overview',
            items: [
                {
                    heading: 'What is the Chart of Accounts?',
                    desc: 'A structured list of financial ledger accounts used to record transactions, track project expenditures, and generate balance sheets and profit/loss statements.',
                },
                {
                    heading: 'Expense Type & Tax Mapping',
                    desc: 'Expense Types and Tax Rules map directly to specific ledger accounts (e.g. Direct Material Costs 5-1001 or PPN Masukan 2-1100).',
                },
            ],
        },
        {
            title: 'Standard Numbering Conventions',
            items: [
                { heading: '1 · Assets (Aset & Kas)', desc: 'Kas kecil, rekening bank operasional, piutang usaha, dan uang muka pajak (PPN Masukan).' },
                { heading: '2 · Liabilities (Kewajiban & Utang)', desc: 'Utang usaha ke supplier dan titipan kewajiban pajak terutang (PPh 23, PPh 21, PPh 4(2)).' },
                { heading: '3 · Equity (Modal & Ekuitas)', desc: 'Modal disetor pemilik dan saldo laba ditahan (retained earnings).' },
                { heading: '4 · Revenue (Pendapatan & Penjualan)', desc: 'Pendapatan termin kontrak proyek dan penjualan jasa utama perusahaan.' },
                { heading: '5 · Cost of Sales (Beban Pokok Proyek)', desc: 'Biaya langsung pelaksanaan proyek: material, upah subkontraktor/mandor, dan sewa alat berat.' },
                { heading: '6 · Operating Expense (Beban Operasional)', desc: 'Beban umum kantor: ATK, internet, listrik, langganan software, dan perjalanan dinas.' },
                { heading: '7 · Selling & Marketing (Beban Pemasaran)', desc: 'Biaya promosi, iklan, komisi penjualan, jamuan klien, dan tender proyek.' },
                { heading: '8 · Other Income (Pendapatan Lain-lain)', desc: 'Pendapatan di luar operasional utama: bunga bank/deposito, keuntungan selisih kurs valas, dan klaim asuransi.' },
                { heading: '9 · Other Expense (Beban Lain/Kustom)', desc: 'Beban bunga pinjaman, biaya administrasi bank, dan kerugian selisih kurs valuta asing.' },
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
                                About Chart of Accounts
                            </Text>
                            <Text style={[s.subtitle, { color: subtextColor }]}>
                                Standard classifications and financial structure
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
    footerContainer: {
        paddingHorizontal: 20,
        paddingTop: 14,
        paddingBottom: 6,
    },
    doneBtn: {
        height: 48,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
    },
    doneBtnText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
});

export default FinanceAccountsGuideSheet;
