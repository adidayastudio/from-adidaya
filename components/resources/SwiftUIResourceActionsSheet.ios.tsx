import React, { memo } from 'react';
import { 
    Host,
    BottomSheet, 
    HStack, 
    VStack, 
    Spacer, 
    Text as SwiftUIText,
    Image,
    Button
} from '@expo/ui/swift-ui';
import { padding, background, ignoreSafeArea, frame, cornerRadius, buttonStyle } from '@expo/ui/swift-ui/modifiers';
import { useTheme } from '@/context/ThemeContext';

export interface SwiftUIResourceActionsSheetProps {
    isOpened: boolean;
    onClose: () => void;
    onSelectNewResource: () => void;
    onSelectNewReceiving: () => void;
    onSelectNewTransfer: () => void;
    onSelectStockAdjustment: () => void;
    onSelectAiCleanup?: () => void;
    isManager?: boolean;
}

export const SwiftUIResourceActionsSheet: React.FC<SwiftUIResourceActionsSheetProps> = memo(({
    isOpened,
    onClose,
    onSelectNewResource,
    onSelectNewReceiving,
    onSelectNewTransfer,
    onSelectStockAdjustment,
    onSelectAiCleanup,
    isManager = true,
}) => {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';
    const chevronColor = isDark ? '#8E8E93' : '#AEAEB2';
    const cardBg = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(120, 120, 128, 0.08)';

    const blueColor = '#007AFF';
    const blueBadgeBg = isDark ? 'rgba(0, 122, 255, 0.22)' : 'rgba(0, 122, 255, 0.12)';
    const greenColor = '#34C759';
    const greenBadgeBg = isDark ? 'rgba(52, 199, 89, 0.22)' : 'rgba(52, 199, 89, 0.12)';
    const orangeColor = isDark ? '#FF9F0A' : '#FF9500';
    const orangeBadgeBg = isDark ? 'rgba(255, 159, 10, 0.22)' : 'rgba(255, 149, 0, 0.12)';
    const purpleColor = isDark ? '#BF5AF2' : '#AF52DE';
    const purpleBadgeBg = isDark ? 'rgba(191, 90, 242, 0.22)' : 'rgba(175, 82, 222, 0.12)';

    const circleIconModifiers = (bgColor: string) => [
        frame({ width: 44, height: 44 }),
        background(bgColor),
        cornerRadius(22)
    ];

    return (
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet
                isOpened={isOpened}
                presentationDetents={[0.58]}
                presentationDragIndicator="hidden"
                onIsOpenedChange={(opened) => {
                    if (!opened) onClose();
                }}
            >
                <VStack spacing={0} modifiers={[
                    ignoreSafeArea({ edges: 'bottom' }),
                    background('clear'),
                    frame({ maxWidth: Infinity }),
                    padding({ bottom: 20 })
                ]}>
                    {/* Header */}
                    <HStack alignment="center" modifiers={[padding({ top: 20, leading: 20, trailing: 20, bottom: 10 })]}>
                        <SwiftUIText size={22} weight="bold" color={textColor}>
                            Resource Actions
                        </SwiftUIText>
                        <Spacer />
                        <Button
                            systemImage="xmark"
                            role="cancel"
                            color="gray"
                            onPress={onClose}
                        />
                    </HStack>

                    {/* Content Options */}
                    <VStack spacing={10} alignment="leading" modifiers={[padding({ horizontal: 20, top: 4 })]}>
                        {/* Option 1: New Resource */}
                        <Button
                            onPress={() => {
                                onClose();
                                onSelectNewResource();
                            }}
                            modifiers={[
                                buttonStyle('plain'),
                                frame({ maxWidth: Infinity })
                            ]}
                        >
                            <HStack alignment="center" spacing={14} modifiers={[
                                padding({ top: 10, bottom: 10, leading: 14, trailing: 14 }),
                                background(cardBg),
                                cornerRadius(16)
                            ]}>
                                <Image 
                                    systemName="plus.circle.fill" 
                                    size={18} 
                                    color={blueColor} 
                                    modifiers={circleIconModifiers(blueBadgeBg)} 
                                />
                                <VStack alignment="leading" spacing={2}>
                                    <SwiftUIText size={16} weight="semibold" color={textColor}>
                                        New Resource
                                    </SwiftUIText>
                                    <SwiftUIText size={13} color={subtextColor}>
                                        Register material, tool, asset, or service to catalog
                                    </SwiftUIText>
                                </VStack>
                                <Spacer />
                                <Image systemName="chevron.right" size={14} color={chevronColor} />
                            </HStack>
                        </Button>

                        {/* Option 2: New Receiving */}
                        <Button
                            onPress={() => {
                                onClose();
                                onSelectNewReceiving();
                            }}
                            modifiers={[
                                buttonStyle('plain'),
                                frame({ maxWidth: Infinity })
                            ]}
                        >
                            <HStack alignment="center" spacing={14} modifiers={[
                                padding({ top: 10, bottom: 10, leading: 14, trailing: 14 }),
                                background(cardBg),
                                cornerRadius(16)
                            ]}>
                                <Image 
                                    systemName="shippingbox.and.arrow.backward.fill" 
                                    size={18} 
                                    color={greenColor} 
                                    modifiers={circleIconModifiers(greenBadgeBg)} 
                                />
                                <VStack alignment="leading" spacing={2}>
                                    <SwiftUIText size={16} weight="semibold" color={textColor}>
                                        New Receiving
                                    </SwiftUIText>
                                    <SwiftUIText size={13} color={subtextColor}>
                                        Confirm delivery or log incoming PO shipment
                                    </SwiftUIText>
                                </VStack>
                                <Spacer />
                                <Image systemName="chevron.right" size={14} color={chevronColor} />
                            </HStack>
                        </Button>

                        {/* Option 3: New Transfer */}
                        <Button
                            onPress={() => {
                                onClose();
                                onSelectNewTransfer();
                            }}
                            modifiers={[
                                buttonStyle('plain'),
                                frame({ maxWidth: Infinity })
                            ]}
                        >
                            <HStack alignment="center" spacing={14} modifiers={[
                                padding({ top: 10, bottom: 10, leading: 14, trailing: 14 }),
                                background(cardBg),
                                cornerRadius(16)
                            ]}>
                                <Image 
                                    systemName="arrow.triangle.2.circlepath" 
                                    size={18} 
                                    color={purpleColor} 
                                    modifiers={circleIconModifiers(purpleBadgeBg)} 
                                />
                                <VStack alignment="leading" spacing={2}>
                                    <SwiftUIText size={16} weight="semibold" color={textColor}>
                                        New Transfer
                                    </SwiftUIText>
                                    <SwiftUIText size={13} color={subtextColor}>
                                        Transfer stock between locations or handover custody
                                    </SwiftUIText>
                                </VStack>
                                <Spacer />
                                <Image systemName="chevron.right" size={14} color={chevronColor} />
                            </HStack>
                        </Button>

                        {/* Option 4: Stock Adjustment */}
                        <Button
                            onPress={() => {
                                onClose();
                                onSelectStockAdjustment();
                            }}
                            modifiers={[
                                buttonStyle('plain'),
                                frame({ maxWidth: Infinity })
                            ]}
                        >
                            <HStack alignment="center" spacing={14} modifiers={[
                                padding({ top: 10, bottom: 10, leading: 14, trailing: 14 }),
                                background(cardBg),
                                cornerRadius(16)
                            ]}>
                                <Image 
                                    systemName="square.and.pencil" 
                                    size={18} 
                                    color={orangeColor} 
                                    modifiers={circleIconModifiers(orangeBadgeBg)} 
                                />
                                <VStack alignment="leading" spacing={2}>
                                    <SwiftUIText size={16} weight="semibold" color={textColor}>
                                        Stock Adjustment
                                    </SwiftUIText>
                                    <SwiftUIText size={13} color={subtextColor}>
                                        Cycle count reconciliation or quantity adjustments
                                    </SwiftUIText>
                                </VStack>
                                <Spacer />
                                <Image systemName="chevron.right" size={14} color={chevronColor} />
                            </HStack>
                        </Button>

                        {/* Option 5: AI Cleanup (Manager Only) */}
                        {isManager && onSelectAiCleanup && (
                            <Button
                                onPress={() => {
                                    onClose();
                                    onSelectAiCleanup();
                                }}
                                modifiers={[
                                    buttonStyle('plain'),
                                    frame({ maxWidth: Infinity })
                                ]}
                            >
                                <HStack alignment="center" spacing={14} modifiers={[
                                    padding({ top: 10, bottom: 10, leading: 14, trailing: 14 }),
                                    background(cardBg),
                                    cornerRadius(16)
                                ]}>
                                    <Image 
                                        systemName="sparkles" 
                                        size={18} 
                                        color={blueColor} 
                                        modifiers={circleIconModifiers(blueBadgeBg)} 
                                    />
                                    <VStack alignment="leading" spacing={2}>
                                        <SwiftUIText size={16} weight="semibold" color={textColor}>
                                            AI Cleanup
                                        </SwiftUIText>
                                        <SwiftUIText size={13} color={subtextColor}>
                                            Scan and merge catalog duplicate items using AI
                                        </SwiftUIText>
                                    </VStack>
                                    <Spacer />
                                    <Image systemName="chevron.right" size={14} color={chevronColor} />
                                </HStack>
                            </Button>
                        )}
                    </VStack>
                </VStack>
            </BottomSheet>
        </Host>
    );
});
