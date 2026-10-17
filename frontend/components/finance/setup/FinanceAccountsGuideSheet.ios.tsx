import React from 'react';
import {
    Host,
    BottomSheet,
    HStack,
    VStack,
    Spacer,
    Text as SwiftUIText,
    Button,
    Form,
    Section,
} from '@expo/ui/swift-ui';
import {
    padding,
    frame,
    background,
    ignoreSafeArea,
} from '@expo/ui/swift-ui/modifiers';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';

export interface FinanceAccountsGuideSheetProps {
    visible: boolean;
    onClose: () => void;
}

export function FinanceAccountsGuideSheet({
    visible,
    onClose,
}: FinanceAccountsGuideSheetProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';

    return (
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet
                isOpened={visible}
                presentationDetents={[0.82, 0.92]}
                presentationDragIndicator="hidden"
                onIsOpenedChange={(opened) => {
                    if (!opened) onClose();
                }}
            >
                <VStack
                    spacing={0}
                    modifiers={[
                        frame({ maxWidth: 9999, maxHeight: 9999, alignment: 'top' }),
                        background('clear'),
                        ignoreSafeArea({ regions: 'all', edges: 'bottom' }),
                    ]}
                >
                    {/* Header */}
                    <HStack
                        spacing={12}
                        alignment="center"
                        modifiers={[
                            padding({ top: 16, leading: 20, bottom: 12, trailing: 20 }),
                            frame({ maxWidth: 9999 }),
                        ]}
                    >
                        <SwiftUIText size={17} weight="bold" color={textColor}>
                            About Chart of Accounts
                        </SwiftUIText>

                        <Spacer />

                        <Button
                            variant="plain"
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                onClose();
                            }}
                        >
                            <SwiftUIText size={16} weight="semibold" color="#007AFF">
                                Done
                            </SwiftUIText>
                        </Button>
                    </HStack>

                    {/* Content Form */}
                    <Form modifiers={[background('clear'), frame({ maxWidth: 9999, maxHeight: 9999 })]}>
                        {/* Section 1: Overview */}
                        <Section title="Overview">
                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    What is the Chart of Accounts?
                                </SwiftUIText>
                                <SwiftUIText size={13} color={subtextColor}>
                                    A structured list of financial ledger accounts used to record transactions, track project expenditures, and generate balance sheets and profit/loss statements.
                                </SwiftUIText>
                            </VStack>

                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    Expense Type & Tax Mapping
                                </SwiftUIText>
                                <SwiftUIText size={13} color={subtextColor}>
                                    Expense Types and Tax Rules map directly to specific ledger accounts (e.g. Direct Material Costs 5-1001 or PPN Masukan 2-1100).
                                </SwiftUIText>
                            </VStack>
                        </Section>

                        {/* Section 2: Standard Numbering Conventions */}
                        <Section title="Standard Numbering Conventions">
                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    1 · Assets (Aset & Kas)
                                </SwiftUIText>
                                <SwiftUIText size={13} color={subtextColor}>
                                    Kas kecil, rekening bank operasional, piutang usaha, dan uang muka pajak (PPN Masukan).
                                </SwiftUIText>
                            </VStack>

                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    2 · Liabilities (Kewajiban & Utang)
                                </SwiftUIText>
                                <SwiftUIText size={13} color={subtextColor}>
                                    Utang usaha ke supplier dan titipan kewajiban pajak terutang (PPh 23, PPh 21, PPh 4(2)).
                                </SwiftUIText>
                            </VStack>

                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    3 · Equity (Modal & Ekuitas)
                                </SwiftUIText>
                                <SwiftUIText size={13} color={subtextColor}>
                                    Modal disetor pemilik dan saldo laba ditahan (retained earnings).
                                </SwiftUIText>
                            </VStack>

                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    4 · Revenue (Pendapatan & Penjualan)
                                </SwiftUIText>
                                <SwiftUIText size={13} color={subtextColor}>
                                    Pendapatan termin kontrak proyek dan penjualan jasa utama perusahaan.
                                </SwiftUIText>
                            </VStack>

                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    5 · Cost of Sales (Beban Pokok Proyek)
                                </SwiftUIText>
                                <SwiftUIText size={13} color={subtextColor}>
                                    Biaya langsung pelaksanaan proyek: material, upah subkontraktor/mandor, dan sewa alat berat.
                                </SwiftUIText>
                            </VStack>

                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    6 · Operating Expense (Beban Operasional)
                                </SwiftUIText>
                                <SwiftUIText size={13} color={subtextColor}>
                                    Beban umum kantor: ATK, internet, listrik, langganan software, dan perjalanan dinas.
                                </SwiftUIText>
                            </VStack>

                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    7 · Selling & Marketing (Beban Pemasaran)
                                </SwiftUIText>
                                <SwiftUIText size={13} color={subtextColor}>
                                    Biaya promosi, iklan, komisi penjualan, jamuan klien, dan tender proyek.
                                </SwiftUIText>
                            </VStack>

                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    8 · Other Income (Pendapatan Lain-lain)
                                </SwiftUIText>
                                <SwiftUIText size={13} color={subtextColor}>
                                    Pendapatan di luar operasional utama: bunga bank/deposito, keuntungan selisih kurs valas, dan klaim asuransi.
                                </SwiftUIText>
                            </VStack>

                            <VStack alignment="leading" spacing={3} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                    9 · Other Expense (Beban Lain/Kustom)
                                </SwiftUIText>
                                <SwiftUIText size={13} color={subtextColor}>
                                    Biaya administrasi bank, pajak bunga bank, kerugian selisih kurs, dan beban kustom di luar operasional rutin.
                                </SwiftUIText>
                            </VStack>
                        </Section>
                    </Form>
                </VStack>
            </BottomSheet>
        </Host>
    );
}

export const FinanceAccountsGuideSheetIOS = FinanceAccountsGuideSheet;
export default FinanceAccountsGuideSheet;
