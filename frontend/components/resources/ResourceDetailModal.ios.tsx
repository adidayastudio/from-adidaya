import React, { useState, useRef } from 'react';
import { View, Dimensions, Alert } from 'react-native';
import {
    Host,
    BottomSheet,
    Section,
    Button,
    HStack,
    VStack,
    ZStack,
    Spacer,
    Text as SwiftUIText,
} from '@expo/ui/swift-ui';
import {
    padding,
    frame,
    background,
    ignoreSafeArea,
    shadow,
} from '@expo/ui/swift-ui/modifiers';
import * as Haptics from 'expo-haptics';
import { NativeFinanceList } from '@/modules/native-toolbar-button';
import { useTheme } from '@/context/ThemeContext';
import {
    CatalogResource,
    ProjectStock,
    generateResourceCode,
    smartCapitalize,
    formatUnit,
    deriveStatus,
    STATUS_MAP,
} from './mockData';

export interface ResourceDetailModalProps {
    visible?: boolean;
    isOpened?: boolean;
    onClose: () => void;
    item: CatalogResource | null;
    projectStock: ProjectStock[];
    onBatchOrder?: (item: CatalogResource) => void;
    onBulkTransfer?: (item: CatalogResource) => void;
}

export const ResourceDetailModal: React.FC<ResourceDetailModalProps> = ({
    visible,
    isOpened,
    onClose,
    item,
    projectStock = [],
    onBatchOrder,
    onBulkTransfer,
}) => {
    const sheetOpened = Boolean(isOpened ?? visible);
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#C7C7CC' : '#8E8E93';
    const blueColor = '#007AFF';

    const isPresentedNatively = useRef(false);
    const [isFullDetent, setIsFullDetent] = useState(false);
    const sheetBg = isFullDetent ? (isDark ? '#000000' : '#FFFFFF') : 'clear';

    if (!item) return null;

    const code = generateResourceCode(item);
    const displayName = smartCapitalize(item.name);
    const formattedUnit = formatUnit(item.unit);
    const totalQuantity = (projectStock || []).reduce((acc, curr) => acc + curr.quantity, 0);
    const status = deriveStatus(item, projectStock || []);
    const statusTheme = STATUS_MAP[status] || STATUS_MAP['In Stock'];
    const statusColor = statusTheme?.color || '#34C759';

    // Main project = highest quantity
    let mainProject = '-';
    if (projectStock && projectStock.length > 0) {
        const highest = projectStock.reduce((prev, current) => (prev.quantity > current.quantity) ? prev : current);
        mainProject = highest.project;
    }

    const handleBatchOrder = () => {
        Haptics.selectionAsync();
        if (onBatchOrder) {
            onBatchOrder(item);
        } else {
            Alert.alert('Batch Order', `Create batch order for ${displayName}.`);
        }
    };

    const handleBulkTransfer = () => {
        Haptics.selectionAsync();
        if (onBulkTransfer) {
            onBulkTransfer(item);
        } else {
            Alert.alert('Bulk Transfer', `Initiate transfer for ${displayName}.`);
        }
    };

    return (
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet
                isOpened={sheetOpened}
                presentationDetents={[0.85, 'large']}
                presentationDragIndicator="visible"
                onIsOpenedChange={(opened) => {
                    if (opened) {
                        isPresentedNatively.current = true;
                    } else {
                        if (isPresentedNatively.current) {
                            isPresentedNatively.current = false;
                            onClose();
                        }
                    }
                }}
            >
                <ZStack>
                    <View
                        pointerEvents="none"
                        onLayout={(event) => {
                            const sheetHeight = event.nativeEvent.layout.height;
                            const screenHeight = Dimensions.get('window').height;
                            setIsFullDetent(sheetHeight >= screenHeight * 0.92);
                        }}
                        style={{
                            position: 'absolute',
                            width: '100%',
                            height: '100%',
                            backgroundColor: sheetBg,
                        }}
                    />
                    <VStack
                        spacing={0}
                        modifiers={[
                            ignoreSafeArea({ edges: 'bottom' }),
                            background(sheetBg),
                        ]}
                    >
                        {/* Native SwiftUI Header */}
                        <HStack
                            alignment="center"
                            modifiers={[padding({ top: 20, leading: 20, trailing: 20, bottom: 10 })]}
                        >
                            <SwiftUIText size={22} weight="bold" color={textColor}>
                                {code}
                            </SwiftUIText>
                            <Spacer />
                            <Button
                                systemImage="xmark"
                                role="cancel"
                                variant="glass"
                                color="gray"
                                onPress={onClose}
                                modifiers={[shadow({ radius: 0, x: 0, y: 0, color: 'transparent' })]}
                            />
                        </HStack>

                        {/* SwiftUI Form using NativeFinanceList */}
                        <NativeFinanceList backgroundColor={isDark ? '#000000' : '#FFFFFF'}>
                            {/* Section 1 — Item Details */}
                            <Section title="Item">
                                <HStack>
                                    <SwiftUIText color={subtextColor}>Item</SwiftUIText>
                                    <Spacer />
                                    <SwiftUIText weight="semibold" color={textColor}>
                                        {displayName}
                                    </SwiftUIText>
                                </HStack>
                                <HStack>
                                    <SwiftUIText color={subtextColor}>Category</SwiftUIText>
                                    <Spacer />
                                    <SwiftUIText color={blueColor}>
                                        {item.category || '-'}
                                    </SwiftUIText>
                                </HStack>
                                <HStack>
                                    <SwiftUIText color={subtextColor}>Sub-Category</SwiftUIText>
                                    <Spacer />
                                    <SwiftUIText color={textColor}>
                                        {item.subcategory || '-'}
                                    </SwiftUIText>
                                </HStack>
                                <HStack>
                                    <SwiftUIText color={subtextColor}>Grouping</SwiftUIText>
                                    <Spacer />
                                    <SwiftUIText color={textColor}>
                                        {item.group_name || '-'}
                                    </SwiftUIText>
                                </HStack>
                                <HStack>
                                    <SwiftUIText color={subtextColor}>Unit of Measure</SwiftUIText>
                                    <Spacer />
                                    <SwiftUIText color={textColor}>
                                        {formattedUnit}
                                    </SwiftUIText>
                                </HStack>
                                <HStack>
                                    <SwiftUIText color={subtextColor}>Active Projects</SwiftUIText>
                                    <Spacer />
                                    <SwiftUIText color={textColor}>
                                        {`${(projectStock || []).length} Projects`}
                                    </SwiftUIText>
                                </HStack>
                                <HStack>
                                    <SwiftUIText color={subtextColor}>Overall Status</SwiftUIText>
                                    <Spacer />
                                    <SwiftUIText weight="semibold" color={statusColor}>
                                        {status}
                                    </SwiftUIText>
                                </HStack>
                            </Section>

                            {/* Section 2 — Aggregate Summary */}
                            <Section title="Aggregate Summary">
                                <HStack>
                                    <SwiftUIText color={subtextColor}>Total Aggregate</SwiftUIText>
                                    <Spacer />
                                    <SwiftUIText weight="bold" color={textColor}>
                                        {`${totalQuantity.toLocaleString()} ${formattedUnit}`}
                                    </SwiftUIText>
                                </HStack>
                                <HStack>
                                    <SwiftUIText color={subtextColor}>Main Project</SwiftUIText>
                                    <Spacer />
                                    <SwiftUIText weight="semibold" color={textColor}>
                                        {mainProject}
                                    </SwiftUIText>
                                </HStack>
                            </Section>

                            {/* Section 3 — Project Breakdown */}
                            <Section title={`Project Breakdown (${(projectStock || []).length})`}>
                                {(projectStock && projectStock.length > 0) ? (
                                    projectStock.map((ps, idx) => (
                                        <HStack key={idx} alignment="center">
                                            <VStack alignment="leading" spacing={2}>
                                                <SwiftUIText weight="semibold" color={textColor}>
                                                    {ps.project}
                                                </SwiftUIText>
                                                <SwiftUIText size={12} color={subtextColor}>
                                                    {`Modified ${ps.lastUpdated || 'recently'} ago`}
                                                </SwiftUIText>
                                            </VStack>
                                            <Spacer />
                                            <SwiftUIText weight="semibold" color={textColor}>
                                                {`${ps.quantity} ${formatUnit(ps.unit)}`}
                                            </SwiftUIText>
                                        </HStack>
                                    ))
                                ) : (
                                    <HStack>
                                        <SwiftUIText color={subtextColor}>No project allocations</SwiftUIText>
                                        <Spacer />
                                    </HStack>
                                )}
                            </Section>
                        </NativeFinanceList>

                        {/* Bottom Action Buttons identical to Finance */}
                        <HStack spacing={12} modifiers={[padding({ leading: 20, trailing: 20, top: 10, bottom: 34 })]}>
                            <Button
                                variant="glass"
                                color="gray"
                                onPress={handleBulkTransfer}
                                modifiers={[frame({ maxWidth: Infinity, height: 48 })]}
                            >
                                <HStack modifiers={[frame({ maxWidth: Infinity }), frame({ height: 44 })]}>
                                    <Spacer />
                                    <SwiftUIText size={16} weight="semibold" color={textColor}>
                                        Bulk transfer
                                    </SwiftUIText>
                                    <Spacer />
                                </HStack>
                            </Button>
                            <Button
                                variant="glassProminent"
                                color="#007AFF"
                                onPress={handleBatchOrder}
                                modifiers={[frame({ maxWidth: Infinity, height: 48 })]}
                            >
                                <HStack modifiers={[frame({ maxWidth: Infinity }), frame({ height: 44 })]}>
                                    <Spacer />
                                    <SwiftUIText size={16} weight="semibold" color="#FFFFFF">
                                        Batch order
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

export default ResourceDetailModal;
