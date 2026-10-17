import React, { useState, useEffect } from 'react';
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
    TextField,
} from '@expo/ui/swift-ui';
import {
    padding,
    background,
    ignoreSafeArea,
    frame,
} from '@expo/ui/swift-ui/modifiers';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';

interface ReportsStartingNumberSheetProps {
    visible: boolean;
    isDark: boolean;
    textColor: string;
    subtextColor: string;
    currentValue: number;
    onClose: () => void;
    onSave: (newVal: number) => void;
}

export function ReportsStartingNumberSheet({
    visible,
    currentValue,
    onClose,
    onSave,
}: ReportsStartingNumberSheetProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#000000';
    const subtextColor = isDark ? '#8E8E93' : '#8E8E93';

    const [valStr, setValStr] = useState(String(currentValue));

    useEffect(() => {
        if (visible) {
            setValStr(String(currentValue));
        }
    }, [visible, currentValue]);

    const handleSave = () => {
        const parsed = parseInt(valStr, 10);
        if (!isNaN(parsed) && parsed >= 0) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onSave(parsed);
        }
        onClose();
    };

    return (
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet
                isOpened={visible}
                presentationDetents={[0.45]}
                presentationDragIndicator="visible"
                onIsOpenedChange={(opened) => {
                    if (!opened) onClose();
                }}
            >
                <VStack
                    spacing={0}
                    modifiers={[
                        ignoreSafeArea({ edges: 'bottom' }),
                        background('clear'),
                    ]}
                >
                    {/* Header Bar */}
                    <HStack
                        alignment="center"
                        modifiers={[
                            padding({ top: 16, leading: 20, bottom: 12, trailing: 20 }),
                            frame({ maxWidth: 9999 }),
                        ]}
                    >
                        <Button
                            variant="plain"
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                onClose();
                            }}
                        >
                            <SwiftUIText size={16} color="#007AFF">
                                Cancel
                            </SwiftUIText>
                        </Button>

                        <Spacer />

                        <SwiftUIText size={17} weight="bold" color={textColor}>
                            Starting Number
                        </SwiftUIText>

                        <Spacer />

                        <Button variant="plain" onPress={handleSave}>
                            <SwiftUIText size={16} weight="bold" color="#007AFF">
                                Done
                            </SwiftUIText>
                        </Button>
                    </HStack>

                    {/* Native Form */}
                    <Form modifiers={[background('clear')]}>
                        <Section
                            title="Initial Sequence"
                        >
                            <TextField
                                key={`start-num-${valStr}`}
                                defaultValue={valStr}
                                onChangeText={setValStr}
                                placeholder="1"
                            />
                        </Section>
                    </Form>
                </VStack>
            </BottomSheet>
        </Host>
    );
}
