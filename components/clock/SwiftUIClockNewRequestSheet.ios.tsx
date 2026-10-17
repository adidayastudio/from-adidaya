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

export interface SwiftUIClockNewRequestSheetProps {
    isOpened: boolean;
    onClose: () => void;
    onSelectLeaveRequest: () => void;
    onSelectLogOvertime: () => void;
    onSelectBusinessTrip: () => void;
    onSelectAttendanceCorrection?: () => void;
}

export const SwiftUIClockNewRequestSheet: React.FC<SwiftUIClockNewRequestSheetProps> = memo(({
    isOpened,
    onClose,
    onSelectLeaveRequest,
    onSelectLogOvertime,
    onSelectBusinessTrip,
    onSelectAttendanceCorrection,
}) => {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';
    const chevronColor = isDark ? '#8E8E93' : '#AEAEB2';
    const cardBg = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(120, 120, 128, 0.08)';

    const purpleColor = isDark ? '#BF5AF2' : '#AF52DE';
    const purpleBadgeBg = isDark ? 'rgba(191, 90, 242, 0.18)' : 'rgba(175, 82, 222, 0.12)';

    const orangeColor = isDark ? '#FF9F0A' : '#FF9500';
    const orangeBadgeBg = isDark ? 'rgba(255, 159, 10, 0.18)' : 'rgba(255, 149, 0, 0.12)';

    const greenColor = isDark ? '#30D158' : '#34C759';
    const greenBadgeBg = isDark ? 'rgba(48, 209, 88, 0.18)' : 'rgba(52, 199, 89, 0.12)';

    const blueColor = isDark ? '#0A84FF' : '#007AFF';
    const blueBadgeBg = isDark ? 'rgba(10, 132, 255, 0.18)' : 'rgba(0, 122, 255, 0.12)';

    const circleIconModifiers = (bgColor: string) => [
        frame({ width: 44, height: 44 }),
        background(bgColor),
        cornerRadius(22)
    ];

    return (
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet
                isOpened={isOpened}
                presentationDetents={[0.48]}
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
                            New Request
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
                        {/* Option 1: Leave Request */}
                        <Button
                            onPress={() => {
                                onClose();
                                onSelectLeaveRequest();
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
                                    systemName="calendar.badge.clock" 
                                    size={18} 
                                    color={purpleColor} 
                                    modifiers={circleIconModifiers(purpleBadgeBg)} 
                                />
                                <VStack alignment="leading" spacing={2}>
                                    <SwiftUIText size={16} weight="semibold" color={textColor}>
                                        Leave Request
                                    </SwiftUIText>
                                    <SwiftUIText size={13} color={subtextColor}>
                                        Annual leave, sick leave, or other absences.
                                    </SwiftUIText>
                                </VStack>
                                <Spacer />
                                <Image systemName="chevron.right" size={14} color={chevronColor} />
                            </HStack>
                        </Button>

                        {/* Option 2: Log Overtime */}
                        <Button
                            onPress={() => {
                                onClose();
                                onSelectLogOvertime();
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
                                    systemName="clock.fill" 
                                    size={18} 
                                    color={orangeColor} 
                                    modifiers={circleIconModifiers(orangeBadgeBg)} 
                                />
                                <VStack alignment="leading" spacing={2}>
                                    <SwiftUIText size={16} weight="semibold" color={textColor}>
                                        Log Overtime
                                    </SwiftUIText>
                                    <SwiftUIText size={13} color={subtextColor}>
                                        Record extra hours worked outside schedule.
                                    </SwiftUIText>
                                </VStack>
                                <Spacer />
                                <Image systemName="chevron.right" size={14} color={chevronColor} />
                            </HStack>
                        </Button>

                        {/* Option 3: Business Trip */}
                        <Button
                            onPress={() => {
                                onClose();
                                onSelectBusinessTrip();
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
                                    systemName="airplane" 
                                    size={18} 
                                    color={greenColor} 
                                    modifiers={circleIconModifiers(greenBadgeBg)} 
                                />
                                <VStack alignment="leading" spacing={2}>
                                    <SwiftUIText size={16} weight="semibold" color={textColor}>
                                        Business Trip
                                    </SwiftUIText>
                                    <SwiftUIText size={13} color={subtextColor}>
                                        Work-related travel and expenses.
                                    </SwiftUIText>
                                </VStack>
                                <Spacer />
                                <Image systemName="chevron.right" size={14} color={chevronColor} />
                            </HStack>
                        </Button>
                    </VStack>
                </VStack>
            </BottomSheet>
        </Host>
    );
});
