import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
} from 'react-native';
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
import {
    FinancePaymentTerm,
    formatDueDaysLabel,
} from '@/lib/api/financeSetup';

export interface FinanceArchivedPaymentTermsSheetProps {
    visible: boolean;
    onClose: () => void;
    archivedTerms: FinancePaymentTerm[];
    onRestoreTerm: (term: FinancePaymentTerm) => void;
    onDeleteTerm: (id: string) => void;
    onEditTerm: (term: FinancePaymentTerm) => void;
}

export function FinanceArchivedPaymentTermsSheet({
    visible,
    onClose,
    archivedTerms,
    onRestoreTerm,
    onDeleteTerm,
    onEditTerm,
}: FinanceArchivedPaymentTermsSheetProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';

    const handleRestore = (term: FinancePaymentTerm) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onRestoreTerm(term);
    };

    const handleDelete = (term: FinancePaymentTerm) => {
        if (term.inUse) {
            Alert.alert(
                'Historical Term In Use',
                'This payment term is referenced by existing transactions and cannot be deleted to preserve financial audit history.'
            );
            return;
        }

        Alert.alert(
            'Delete Payment Term',
            `Are you sure you want to permanently delete "${term.name}" (${term.code})?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        onDeleteTerm(term.id);
                    },
                },
            ]
        );
    };

    return (
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet
                isOpened={visible}
                presentationDetents={[0.7, 0.9]}
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
                            Archived Payment Terms
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

                    {/* Content */}
                    <Form modifiers={[background('clear'), frame({ maxWidth: 9999, maxHeight: 9999 })]}>
                        <Section title="Archived Terms">
                            {archivedTerms.length === 0 ? (
                                <VStack alignment="center" spacing={4} modifiers={[padding({ vertical: 16 })]}>
                                    <SwiftUIText size={14} color={subtextColor}>
                                        No archived payment terms.
                                    </SwiftUIText>
                                </VStack>
                            ) : (
                                archivedTerms.map((term) => {
                                    const dueLabel = formatDueDaysLabel(term.days);
                                    return (
                                        <HStack key={term.id} alignment="center" modifiers={[padding({ vertical: 4 })]}>
                                            <VStack alignment="leading" spacing={2}>
                                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                                    {term.name}
                                                </SwiftUIText>
                                                <SwiftUIText size={12} color={subtextColor}>
                                                    {`${term.code} · ${dueLabel}`}
                                                </SwiftUIText>
                                            </VStack>

                                            <Spacer />

                                            <Button
                                                variant="plain"
                                                onPress={() => handleRestore(term)}
                                            >
                                                <SwiftUIText size={14} weight="semibold" color="#007AFF">
                                                    Restore
                                                </SwiftUIText>
                                            </Button>

                                            {!term.inUse && (
                                                <Button
                                                    variant="plain"
                                                    onPress={() => handleDelete(term)}
                                                >
                                                    <SwiftUIText size={14} color="#FF3B30">
                                                        Delete
                                                    </SwiftUIText>
                                                </Button>
                                            )}
                                        </HStack>
                                    );
                                })
                            )}
                        </Section>
                    </Form>
                </VStack>
            </BottomSheet>
        </Host>
    );
}
