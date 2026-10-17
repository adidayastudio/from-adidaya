import React, { useState } from 'react';
import { Alert, Dimensions, View } from 'react-native';
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
    ZStack,
} from '@expo/ui/swift-ui';
import { background, foregroundColor, frame, ignoreSafeArea, padding } from '@expo/ui/swift-ui/modifiers';
import { useTheme } from '@/context/ThemeContext';
import { useFinance } from '@/context/FinanceContext';
import { formatDepartmentCode } from '@/lib/api/financeSetup';

interface CreateConsolidationPreviewSheetProps {
    visible: boolean;
    onClose: () => void;
    selectedRequests: any[];
    onConsolidationCreated?: (consolidation: any) => void;
}

function formatCurrency(amount: number) {
    const value = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value).replace('IDR', 'Rp');
}

function getDepartmentCode(request: any) {
    const project = typeof request.project === 'string' ? request.project : request.project?.project_code;
    return formatDepartmentCode(
        request.department?.code || request.department_code || request.project_obj?.project_code || project
    ) || 'Unassigned';
}

export const CreateConsolidationPreviewSheet: React.FC<CreateConsolidationPreviewSheetProps> = ({
    visible,
    onClose,
    selectedRequests,
    onConsolidationCreated,
}) => {
    const { resolvedTheme } = useTheme();
    const { createConsolidation, setActiveWorkflowTab } = useFinance();
    const [isCreating, setIsCreating] = useState(false);
    const [isFullDetent, setIsFullDetent] = useState(false);
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#C7C7CC' : '#6E6E73';
    const requestCount = selectedRequests.length;
    const sheetBg = isFullDetent ? (isDark ? '#000000' : '#FFFFFF') : 'clear';
    const hasManyRequests = requestCount > 3;
    const totalAmount = selectedRequests.reduce((sum, request) => sum + (request.amount || 0), 0);
    const totalItems = selectedRequests.reduce((sum, request) => sum + (request.items?.length || 1), 0);

    const handleCreate = async () => {
        if (requestCount === 0) return;

        setIsCreating(true);
        try {
            const requestIds = selectedRequests.map(request => request.id);
            const newConsolidation = await createConsolidation(requestIds);
            onClose();
            setActiveWorkflowTab('consolidation');
            onConsolidationCreated?.(newConsolidation);
            Alert.alert(
                'Consolidation Created',
                `Created ${newConsolidation?.document_number || 'consolidation'} with ${requestCount} requests.`
            );
        } catch (error: any) {
            Alert.alert('Creation Failed', error.message || 'Could not create consolidation.');
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet
                isOpened={visible}
                presentationDetents={hasManyRequests ? [0.85, 'large'] : [0.85]}
                presentationDragIndicator="visible"
                onIsOpenedChange={(opened) => {
                    if (!opened) onClose();
                }}
            >
                <ZStack>
                    <View
                        pointerEvents="none"
                        onLayout={(event) => {
                            const sheetHeight = event.nativeEvent.layout.height;
                            setIsFullDetent(sheetHeight >= Dimensions.get('window').height * 0.92);
                        }}
                        style={{ position: 'absolute', width: '100%', height: '100%', backgroundColor: sheetBg }}
                    />
                    <VStack spacing={0} modifiers={[
                        ignoreSafeArea({ edges: 'bottom' }),
                        background(sheetBg),
                    ]}>
                    <HStack alignment="center" modifiers={[padding({ top: 20, leading: 20, trailing: 20, bottom: 8 })]}>
                        <SwiftUIText size={22} weight="bold" color={textColor}>
                            Create Consolidation
                        </SwiftUIText>
                        <Spacer />
                        <Button systemImage="xmark" role="cancel" variant="glass" color="gray" onPress={onClose} />
                    </HStack>

                    <HStack modifiers={[
                        padding({ leading: 20, trailing: 20, bottom: 10 }),
                        frame({ maxWidth: Infinity }),
                    ]}>
                        <SwiftUIText size={15} weight="semibold" color={textColor}>
                            {`${requestCount} ${requestCount === 1 ? 'Request' : 'Requests'} to Consolidate`}
                        </SwiftUIText>
                        <Spacer />
                    </HStack>

                    <Form modifiers={[background(sheetBg), foregroundColor(textColor)]}>
                        <Section>
                            {selectedRequests.map((request) => {
                                const itemCount = request.items?.length || 1;
                                return (
                                    <VStack key={request.id} alignment="leading" spacing={5} modifiers={[padding({ vertical: 4 })]}>
                                        <HStack>
                                            <SwiftUIText size={16} weight="semibold" color={textColor}>
                                                {request.shortRef || request.ref || request.cardRef || 'PR'}
                                            </SwiftUIText>
                                            <Spacer />
                                            <SwiftUIText size={15} weight="semibold" color={textColor}>
                                                {formatCurrency(request.amount || 0)}
                                            </SwiftUIText>
                                        </HStack>
                                        <SwiftUIText size={13} color={subtextColor}>
                                            {`${getDepartmentCode(request)} · ${itemCount} ${itemCount === 1 ? 'Item' : 'Items'}`}
                                        </SwiftUIText>
                                    </VStack>
                                );
                            })}
                        </Section>

                        <Section>
                            <HStack>
                                <SwiftUIText color={subtextColor}>Total Items</SwiftUIText>
                                <Spacer />
                                <SwiftUIText weight="semibold" color={textColor}>{`${totalItems} Items`}</SwiftUIText>
                            </HStack>
                            <HStack>
                                <SwiftUIText size={16} weight="bold" color={textColor}>Total Nominal</SwiftUIText>
                                <Spacer />
                                <SwiftUIText size={17} weight="bold" color="#007AFF">{formatCurrency(totalAmount)}</SwiftUIText>
                            </HStack>
                        </Section>
                    </Form>

                    <HStack modifiers={[
                        padding({ leading: 20, trailing: 20, top: 12, bottom: 34 }),
                        frame({ maxWidth: Infinity }),
                    ]}>
                        <Button
                            variant="glassProminent"
                            color="#007AFF"
                            disabled={isCreating || requestCount === 0}
                            onPress={handleCreate}
                        >
                            <HStack modifiers={[frame({ maxWidth: Infinity }), frame({ height: 42 })]}>
                                <Spacer />
                                <SwiftUIText size={17} weight="semibold" color="#FFFFFF" lineLimit={1}>
                                    {isCreating ? 'Creating...' : `Create Consolidation (${requestCount})`}
                                </SwiftUIText>
                                <Spacer />
                            </HStack>
                        </Button>
                    </HStack>
                    </VStack>
                </ZStack>
            </BottomSheet>
        </Host>
    );
};
