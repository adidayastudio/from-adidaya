import React, { useMemo, useState } from 'react';
import { Alert } from 'react-native';
import {
    BottomSheet,
    Button,
    Form,
    Host,
    HStack,
    Section,
    Spacer,
    Text as SwiftUIText,
    VStack,
} from '@expo/ui/swift-ui';
import { background, foregroundColor, frame, ignoreSafeArea, padding } from '@expo/ui/swift-ui/modifiers';
import { useTheme } from '@/context/ThemeContext';
import { useFinance } from '@/context/FinanceContext';
import { isRequestEligibleForConsolidation, PurchasingConsolidationItem } from '@/lib/api/financeConsolidation';

interface AddRequestsToConsolidationModalProps {
    visible: boolean;
    onClose: () => void;
    consolidation: PurchasingConsolidationItem | null;
}

function formatCurrency(amount: number) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount || 0).replace('IDR', 'Rp');
}

export const AddRequestsToConsolidationModal: React.FC<AddRequestsToConsolidationModalProps> = ({
    visible,
    onClose,
    consolidation,
}) => {
    const { resolvedTheme } = useTheme();
    const { teamPurchasing, consolidations, addRequestsToConsolidation } = useFinance();
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#C7C7CC' : '#6E6E73';

    const eligibleRequests = useMemo(() => {
        if (!consolidation) return [];
        const currentMemberIds = new Set(consolidation.request_ids || []);
        return teamPurchasing.filter(request =>
            !currentMemberIds.has(request.id)
            && isRequestEligibleForConsolidation(request, undefined, consolidations)
        );
    }, [teamPurchasing, consolidations, consolidation]);

    if (!consolidation) return null;

    const toggleSelect = (id: string) => {
        setSelectedIds(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
    };

    const handleAdd = async () => {
        if (!selectedIds.length) return;
        setIsSaving(true);
        try {
            const count = selectedIds.length;
            await addRequestsToConsolidation(consolidation.id, selectedIds);
            setSelectedIds([]);
            onClose();
            Alert.alert('Success', `Added ${count} requests to ${consolidation.document_number}.`);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to add requests');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet
                isOpened={visible}
                presentationDetents={[0.85]}
                presentationDragIndicator="visible"
                onIsOpenedChange={(opened) => {
                    if (!opened) onClose();
                }}
            >
                <VStack spacing={0} modifiers={[ignoreSafeArea({ edges: 'bottom' }), background('clear')]}> 
                    <HStack alignment="center" modifiers={[padding({ top: 20, leading: 20, trailing: 20, bottom: 10 })]}>
                        <VStack alignment="leading" spacing={2}>
                            <SwiftUIText size={22} weight="bold" color={textColor}>Add Requests</SwiftUIText>
                            <SwiftUIText size={13} color={subtextColor}>
                                {`${consolidation.document_number} · ${selectedIds.length} selected`}
                            </SwiftUIText>
                        </VStack>
                        <Spacer />
                        <Button systemImage="xmark" role="cancel" variant="glass" color="gray" onPress={onClose} />
                    </HStack>

                    <Form modifiers={[background('clear'), foregroundColor(textColor)]}>
                        <Section>
                            {eligibleRequests.length === 0 ? (
                                <VStack alignment="center" spacing={6} modifiers={[padding({ vertical: 30 })]}>
                                    <SwiftUIText size={16} weight="semibold" color={textColor}>No Eligible Requests</SwiftUIText>
                                    <SwiftUIText size={13} color={subtextColor}>
                                        All approved requests are already in an active consolidation.
                                    </SwiftUIText>
                                </VStack>
                            ) : eligibleRequests.map(request => {
                                const selected = selectedIds.includes(request.id);
                                const itemCount = request.items?.length || 1;
                                return (
                                    <Button key={request.id} variant="plain" onPress={() => toggleSelect(request.id)}>
                                        <HStack spacing={12} modifiers={[padding({ vertical: 4 }), frame({ maxWidth: Infinity })]}>
                                            <SwiftUIText size={20} color={selected ? '#007AFF' : subtextColor}>
                                                {selected ? '✓' : '○'}
                                            </SwiftUIText>
                                            <VStack alignment="leading" spacing={3}>
                                                <SwiftUIText size={16} weight="semibold" color={textColor}>
                                                    {request.shortRef || request.ref || request.cardRef || 'PR'}
                                                </SwiftUIText>
                                                <SwiftUIText size={13} color={subtextColor}>
                                                    {`${itemCount} ${itemCount === 1 ? 'Item' : 'Items'}`}
                                                </SwiftUIText>
                                            </VStack>
                                            <Spacer />
                                            <SwiftUIText size={15} weight="semibold" color={textColor}>
                                                {formatCurrency(request.amount || 0)}
                                            </SwiftUIText>
                                        </HStack>
                                    </Button>
                                );
                            })}
                        </Section>
                    </Form>

                    {eligibleRequests.length > 0 ? (
                        <VStack modifiers={[padding({ leading: 20, trailing: 20, top: 10, bottom: 34 }), background('clear')]}> 
                            <Button
                                variant="glassProminent"
                                color="#007AFF"
                                disabled={isSaving || selectedIds.length === 0}
                                onPress={handleAdd}
                            >
                                <HStack modifiers={[frame({ maxWidth: Infinity }), frame({ height: 42 })]}>
                                    <Spacer />
                                    <SwiftUIText size={17} weight="semibold" color="#FFFFFF">
                                        {isSaving ? 'Adding...' : `Add ${selectedIds.length} Requests`}
                                    </SwiftUIText>
                                    <Spacer />
                                </HStack>
                            </Button>
                        </VStack>
                    ) : null}
                </VStack>
            </BottomSheet>
        </Host>
    );
};
