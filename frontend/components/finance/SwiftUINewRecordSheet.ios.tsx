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

export interface SwiftUINewRecordSheetProps {
    isOpened: boolean;
    onClose: () => void;
    activeScope?: 'me' | 'team';
    onSelectPurchase: () => void;
    onSelectReimburse: () => void;
    onSelectAddFunding: () => void;
}

export const SwiftUINewRecordSheet: React.FC<SwiftUINewRecordSheetProps> = memo(({
    isOpened,
    onClose,
    activeScope = 'team',
    onSelectPurchase,
    onSelectReimburse,
    onSelectAddFunding,
}) => {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';
    const chevronColor = isDark ? '#8E8E93' : '#AEAEB2';
    const cardBg = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(120, 120, 128, 0.08)';

    const detentHeight = activeScope === 'team' ? 0.40 : 0.32;

    const circleIconModifiers = (bgColor: string) => [
        frame({ width: 44, height: 44 }),
        background(bgColor),
        cornerRadius(22)
    ];

    return (
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet
                isOpened={isOpened}
                presentationDetents={[detentHeight]}
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
                    {/* Header - Aligned identically to Add Purchasing / Add Reimburse */}
                    <HStack alignment="center" modifiers={[padding({ top: 20, leading: 20, trailing: 20, bottom: 10 })]}>
                        <SwiftUIText size={22} weight="bold" color={textColor}>
                            New Finance Record
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
                    <VStack spacing={12} alignment="leading" modifiers={[padding({ horizontal: 20, top: 4 })]}>
                        {/* Option 1: Purchase Request */}
                        <Button
                            onPress={() => {
                                onSelectPurchase();
                            }}
                            modifiers={[
                                buttonStyle('plain'),
                                frame({ maxWidth: Infinity })
                            ]}
                        >
                            <HStack alignment="center" spacing={14} modifiers={[
                                padding({ top: 12, bottom: 12, leading: 14, trailing: 14 }),
                                background(cardBg),
                                cornerRadius(16)
                            ]}>
                                <Image 
                                    systemName="cart.fill" 
                                    size={18} 
                                    color={isDark ? '#FF453A' : '#FF3B30'} 
                                    modifiers={circleIconModifiers(isDark ? 'rgba(255, 69, 58, 0.18)' : 'rgba(255, 59, 48, 0.12)')} 
                                />
                                <VStack alignment="leading" spacing={2}>
                                    <SwiftUIText size={16} weight="semibold" color={textColor}>
                                        Purchase Request
                                    </SwiftUIText>
                                    <SwiftUIText size={13} color={subtextColor}>
                                        Procurement, goods, or vendor payments.
                                    </SwiftUIText>
                                </VStack>
                                <Spacer />
                                <Image systemName="chevron.right" size={14} color={chevronColor} />
                            </HStack>
                        </Button>

                        {/* Option 2: Reimbursement Claim */}
                        <Button
                            onPress={() => {
                                onSelectReimburse();
                            }}
                            modifiers={[
                                buttonStyle('plain'),
                                frame({ maxWidth: Infinity })
                            ]}
                        >
                            <HStack alignment="center" spacing={14} modifiers={[
                                padding({ top: 12, bottom: 12, leading: 14, trailing: 14 }),
                                background(cardBg),
                                cornerRadius(16)
                            ]}>
                                <Image 
                                    systemName="doc.text.fill" 
                                    size={18} 
                                    color={isDark ? '#0A84FF' : '#007AFF'} 
                                    modifiers={circleIconModifiers(isDark ? 'rgba(10, 132, 255, 0.18)' : 'rgba(0, 122, 255, 0.12)')} 
                                />
                                <VStack alignment="leading" spacing={2}>
                                    <SwiftUIText size={16} weight="semibold" color={textColor}>
                                        Reimbursement Claim
                                    </SwiftUIText>
                                    <SwiftUIText size={13} color={subtextColor}>
                                        Expense claims and personal out-of-pocket returns.
                                    </SwiftUIText>
                                </VStack>
                                <Spacer />
                                <Image systemName="chevron.right" size={14} color={chevronColor} />
                            </HStack>
                        </Button>

                        {/* Option 3: Add Funding Source (Team view only) */}
                        {activeScope === 'team' && (
                            <Button
                                onPress={() => {
                                    onSelectAddFunding();
                                }}
                                modifiers={[
                                    buttonStyle('plain'),
                                    frame({ maxWidth: Infinity })
                                ]}
                            >
                                <HStack alignment="center" spacing={14} modifiers={[
                                    padding({ top: 12, bottom: 12, leading: 14, trailing: 14 }),
                                    background(cardBg),
                                    cornerRadius(16)
                                ]}>
                                    <Image 
                                        systemName="wallet.pass.fill" 
                                        size={18} 
                                        color={isDark ? '#30D158' : '#34C759'} 
                                        modifiers={circleIconModifiers(isDark ? 'rgba(48, 209, 88, 0.18)' : 'rgba(52, 199, 89, 0.12)')} 
                                    />
                                    <VStack alignment="leading" spacing={2}>
                                        <SwiftUIText size={16} weight="semibold" color={textColor}>
                                            Add Funding Source
                                        </SwiftUIText>
                                        <SwiftUIText size={13} color={subtextColor}>
                                            Bank accounts, petty cash, or funding channels.
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
