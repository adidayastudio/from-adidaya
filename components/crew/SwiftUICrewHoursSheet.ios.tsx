import React, { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { 
    Host,
    Button, 
    BottomSheet, 
    HStack, 
    VStack, 
    Spacer, 
    Text as SwiftUIText,
    Image
} from '@expo/ui/swift-ui';
import { padding, background, ignoreSafeArea, tint, frame, cornerRadius, buttonStyle, scaleEffect, animation, Animation } from '@expo/ui/swift-ui/modifiers';
import { useTheme } from '@/context/ThemeContext';
import { DailyLog, CREW_ROLE_LABELS, CrewRole } from './mockData';

interface SwiftUICrewHoursSheetProps {
    isOpened: boolean;
    onClose: () => void;
    onSave: (regularHours: number, ot1: number, ot2: number, ot3: number) => void;
    log: DailyLog | null;
    crewName: string;
    crewRole: string;
}

const SwiftUIHoursStepperRow = ({
    label,
    sublabel,
    value,
    onMinus,
    onPlus,
    isDark,
    textColor
}: {
    label: string;
    sublabel: string;
    value: number;
    onMinus: () => void;
    onPlus: () => void;
    isDark: boolean;
    textColor: string;
}) => {
    const [isMinusPressed, setIsMinusPressed] = useState(false);
    const [isPlusPressed, setIsPlusPressed] = useState(false);

    const handleMinus = () => {
        onMinus();
        setIsMinusPressed(true);
        setTimeout(() => setIsMinusPressed(false), 150);
    };

    const handlePlus = () => {
        onPlus();
        setIsPlusPressed(true);
        setTimeout(() => setIsPlusPressed(false), 150);
    };

    return (
        <HStack alignment="center" spacing={12} modifiers={[
            padding({ top: 14, bottom: 14, leading: 16, trailing: 16 }),
            background(isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'),
            cornerRadius(22),
        ]}>
            <VStack alignment="leading" spacing={2}>
                <SwiftUIText weight="bold" size={15} color={textColor}>
                    {label}
                </SwiftUIText>
                <SwiftUIText size={12} color={isDark ? '#A1A1A6' : '#8E8E93'}>
                    {sublabel}
                </SwiftUIText>
            </VStack>
            
            <Spacer />
            
            <HStack alignment="center" spacing={10}>
                <Button
                    onPress={handleMinus}
                    modifiers={[
                        buttonStyle('plain'),
                    ]}
                >
                    <HStack alignment="center" modifiers={[
                        frame({ width: 44, height: 44 }),
                        background(isMinusPressed ? '#007AFF' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)')),
                        cornerRadius(22),
                        scaleEffect(isMinusPressed ? 1.25 : 1.0),
                        animation(Animation.spring(), isMinusPressed),
                    ]}>
                        <Spacer />
                        <Image systemName="minus" size={16} color={isMinusPressed ? '#FFFFFF' : textColor} />
                        <Spacer />
                    </HStack>
                </Button>
                
                <SwiftUIText weight="bold" size={15} design="monospaced" color={textColor} modifiers={[
                    frame({ width: 34 }),
                ]}>
                    {`${value}h`}
                </SwiftUIText>
                
                <Button
                    onPress={handlePlus}
                    modifiers={[
                        buttonStyle('plain'),
                    ]}
                >
                    <HStack alignment="center" modifiers={[
                        frame({ width: 44, height: 44 }),
                        background(isPlusPressed ? '#007AFF' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)')),
                        cornerRadius(22),
                        scaleEffect(isPlusPressed ? 1.25 : 1.0),
                        animation(Animation.spring(), isPlusPressed),
                    ]}>
                        <Spacer />
                        <Image systemName="plus" size={16} color={isPlusPressed ? '#FFFFFF' : textColor} />
                        <Spacer />
                    </HStack>
                </Button>
            </HStack>
        </HStack>
    );
};

export const SwiftUICrewHoursSheet: React.FC<SwiftUICrewHoursSheetProps> = ({
    isOpened,
    onClose,
    onSave,
    log,
    crewName,
    crewRole,
}) => {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#C7C7CC' : 'gray';
    const sheetBg = 'clear';

    const [regularHours, setRegularHours] = useState(8);
    const [ot1, setOt1] = useState(0);
    const [ot2, setOt2] = useState(0);
    const [ot3, setOt3] = useState(0);

    useEffect(() => {
        if (log && isOpened) {
            setRegularHours(Math.min(8, log.regularHours));
            setOt1(Math.min(2, log.ot1Hours));
            setOt2(Math.min(4, log.ot2Hours));
            setOt3(Math.min(10, log.ot3Hours));
        }
    }, [log, isOpened]);

    const handleSave = () => {
        onSave(regularHours, ot1, ot2, ot3);
        onClose();
    };

    const adjust = (val: number, setVal: React.Dispatch<React.SetStateAction<number>>, direction: 'up' | 'down', max: number) => {
        if (direction === 'up') {
            setVal(Math.min(max, val + 1));
        } else {
            setVal(Math.max(0, val - 1));
        }
    };

    return (
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet 
                isOpened={isOpened}
                presentationDetents={[0.65]}
                onIsOpenedChange={(opened) => {
                    if (!opened) {
                        onClose();
                    }
                }}
            >
                <VStack spacing={0} modifiers={[
                    ignoreSafeArea({ edges: 'bottom' }),
                    background(sheetBg)
                ]}>
                    {/* Header */}
                    <HStack alignment="center" modifiers={[padding({ top: 20, leading: 24, trailing: 24, bottom: 12 })]}>
                        <VStack alignment="leading" spacing={2}>
                            <SwiftUIText size={20} weight="bold" color={textColor}>
                                Adjust Working Hours
                            </SwiftUIText>
                            <SwiftUIText size={13} color={subtextColor}>
                                {`${crewName} • ${CREW_ROLE_LABELS[crewRole as CrewRole] || crewRole}`}
                            </SwiftUIText>
                        </VStack>
                        <Spacer />
                        <Button
                            systemImage="xmark"
                            role="cancel"
                            color="gray"
                            onPress={onClose}
                        />
                    </HStack>

                    {/* Steppers Content */}
                    <VStack spacing={10} modifiers={[background(sheetBg), padding({ horizontal: 24, vertical: 8 })]}>
                        <SwiftUIHoursStepperRow
                            label="Regular Hours"
                            sublabel="08.00 - 16.00"
                            value={regularHours}
                            onMinus={() => adjust(regularHours, setRegularHours, 'down', 8)}
                            onPlus={() => adjust(regularHours, setRegularHours, 'up', 8)}
                            isDark={isDark}
                            textColor={textColor}
                        />

                        <SwiftUIHoursStepperRow
                            label="Overtime 1.0"
                            sublabel="16.00 - 18.00"
                            value={ot1}
                            onMinus={() => adjust(ot1, setOt1, 'down', 2)}
                            onPlus={() => adjust(ot1, setOt1, 'up', 2)}
                            isDark={isDark}
                            textColor={textColor}
                        />

                        <SwiftUIHoursStepperRow
                            label="Overtime 2.0"
                            sublabel="18.00 - 22.00"
                            value={ot2}
                            onMinus={() => adjust(ot2, setOt2, 'down', 4)}
                            onPlus={() => adjust(ot2, setOt2, 'up', 4)}
                            isDark={isDark}
                            textColor={textColor}
                        />

                        <SwiftUIHoursStepperRow
                            label="Overtime 3.0"
                            sublabel="22.00 - 08.00"
                            value={ot3}
                            onMinus={() => adjust(ot3, setOt3, 'down', 10)}
                            onPlus={() => adjust(ot3, setOt3, 'up', 10)}
                            isDark={isDark}
                            textColor={textColor}
                        />
                    </VStack>

                    <Spacer />

                    {/* Footer Buttons */}
                    <VStack spacing={12} modifiers={[
                        background(sheetBg),
                        padding({ top: 16, leading: 24, trailing: 24, bottom: Platform.OS === 'ios' ? 36 : 12 }),
                        frame({ maxWidth: Infinity })
                    ]}>
                        <HStack spacing={12}>
                            <Button
                                variant="glass"
                                color="gray"
                                onPress={onClose}
                                modifiers={[
                                    frame({ width: 100 }),
                                    cornerRadius(999)
                                ]}
                            >
                                <HStack modifiers={[
                                    frame({ maxWidth: Infinity }),
                                    frame({ height: 44 })
                                ]}>
                                    <Spacer />
                                    <SwiftUIText weight="semibold" size={17}>Cancel</SwiftUIText>
                                    <Spacer />
                                </HStack>
                            </Button>
                            
                            <Button
                                variant="borderedProminent"
                                color="#007AFF"
                                onPress={handleSave}
                                modifiers={[
                                    frame({ maxWidth: Infinity }),
                                    cornerRadius(999)
                                ]}
                            >
                                <HStack modifiers={[
                                    frame({ maxWidth: Infinity }),
                                    frame({ height: 44 })
                                ]}>
                                    <Spacer />
                                    <SwiftUIText weight="semibold" size={17} color="#FFFFFF">
                                        Save Changes
                                    </SwiftUIText>
                                    <Spacer />
                                </HStack>
                            </Button>
                        </HStack>
                    </VStack>
                </VStack>
            </BottomSheet>
        </Host>
    );
};
