import React, { useState, useEffect } from 'react';
import {
    Host,
    BottomSheet,
    VStack,
    HStack,
    Spacer,
    Button,
    Text as SwiftUIText,
    Image,
    TextField,
    GlassEffectContainer,
} from '@expo/ui/swift-ui';
import {
    padding,
    frame,
    background,
    cornerRadius,
    buttonStyle,
    glassEffect,
} from '@expo/ui/swift-ui/modifiers';
import * as Haptics from 'expo-haptics';

export interface SwiftUINewChannelSheetProps {
    visible: boolean;
    onClose: () => void;
    onCreate: (name: string, code: string, description?: string) => void;
    isDark?: boolean;
}

export function SwiftUINewChannelSheet({
    visible,
    onClose,
    onCreate,
    isDark = false,
}: SwiftUINewChannelSheetProps) {
    const [nameInput, setNameInput] = useState('');
    const [codeInput, setCodeInput] = useState('#');
    const [descInput, setDescInput] = useState('');

    useEffect(() => {
        if (visible) {
            setNameInput('');
            setCodeInput('#');
            setDescInput('');
        }
    }, [visible]);

    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';
    const formaBlue = '#0036F8';

    const handleCodeChange = (text: string) => {
        let clean = (text || '').toLowerCase().replace(/#/g, '');
        if (clean.length === 0) {
            setCodeInput('#');
        } else {
            setCodeInput(`#${clean}`);
        }
    };

    const cleanCode = codeInput.replace(/#/g, '').trim();
    const isValid = nameInput.trim().length > 0 && cleanCode.length > 0;

    const handleCreate = () => {
        if (!isValid) return;
        const finalCode = `#${cleanCode.toLowerCase()}`;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onCreate(nameInput.trim(), finalCode, descInput.trim());
        onClose();
    };

    if (!visible) return null;

    return (
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet
                isOpened={visible}
                presentationDetents={[0.62]}
                presentationDragIndicator="visible"
                onIsOpenedChange={(opened) => {
                    if (!opened) onClose();
                }}
            >
                <VStack
                    spacing={13}
                    modifiers={[
                        padding({ top: 18, bottom: 20, leading: 20, trailing: 20 }),
                        background('clear'),
                    ]}
                >
                    {/* Header: Title only */}
                    <HStack alignment="center" modifiers={[padding({ bottom: 2 })]}>
                        <SwiftUIText size={18} weight="bold" color={textColor}>
                            New Channel
                        </SwiftUIText>
                        <Spacer />
                        {/* Circular Glass Close Button */}
                        <GlassEffectContainer
                            modifiers={[
                                frame({ width: 30, height: 30 }),
                                cornerRadius(15),
                                glassEffect({ shape: 'circle' }),
                            ]}
                        >
                            <Button
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    onClose();
                                }}
                                modifiers={[
                                    buttonStyle('plain'),
                                    frame({ width: 30, height: 30 }),
                                ]}
                            >
                                <Image systemName="xmark" size={11} color={subtextColor} />
                            </Button>
                        </GlassEffectContainer>
                    </HStack>

                    {/* Inputs */}
                    <VStack alignment="leading" spacing={4} modifiers={[frame({ maxWidth: Infinity })]}>
                        <SwiftUIText size={13} weight="semibold" color={textColor}>
                            Channel Name
                        </SwiftUIText>
                        <TextField
                            key={`new_name_${visible}`}
                            placeholder="Channel name"
                            defaultValue={nameInput}
                            onChangeText={setNameInput}
                            modifiers={[
                                padding({ top: 11, bottom: 11, leading: 16, trailing: 16 }),
                                background(isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'),
                                cornerRadius(22),
                                frame({ maxWidth: Infinity }),
                            ]}
                        />
                    </VStack>

                    <VStack alignment="leading" spacing={4} modifiers={[frame({ maxWidth: Infinity })]}>
                        <SwiftUIText size={13} weight="semibold" color={textColor}>
                            Channel Code
                        </SwiftUIText>
                        <TextField
                            key={`new_code_${visible}`}
                            placeholder="Channel code"
                            defaultValue={codeInput}
                            onChangeText={handleCodeChange}
                            modifiers={[
                                padding({ top: 11, bottom: 11, leading: 16, trailing: 16 }),
                                background(isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'),
                                cornerRadius(22),
                                frame({ maxWidth: Infinity }),
                            ]}
                        />
                        <SwiftUIText size={11} color={subtextColor}>
                            Prefix # is added automatically. Use lowercase code.
                        </SwiftUIText>
                    </VStack>

                    {/* Description (Optional) */}
                    <VStack alignment="leading" spacing={4} modifiers={[frame({ maxWidth: Infinity })]}>
                        <SwiftUIText size={13} weight="semibold" color={textColor}>
                            Description (Optional)
                        </SwiftUIText>
                        <TextField
                            key={`new_desc_${visible}`}
                            placeholder="Channel description"
                            defaultValue={descInput}
                            onChangeText={setDescInput}
                            modifiers={[
                                padding({ top: 11, bottom: 11, leading: 16, trailing: 16 }),
                                background(isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'),
                                cornerRadius(22),
                                frame({ maxWidth: Infinity }),
                            ]}
                        />
                    </VStack>

                    {/* Create Button (Forma Blue) */}
                    <HStack modifiers={[frame({ maxWidth: Infinity }), padding({ top: 4 })]}>
                        <Button
                            variant="glassProminent"
                            color={formaBlue}
                            disabled={!isValid}
                            onPress={handleCreate}
                            modifiers={[frame({ maxWidth: Infinity })]}
                        >
                            <HStack modifiers={[frame({ maxWidth: Infinity }), frame({ height: 44 })]}>
                                <Spacer />
                                <SwiftUIText size={16} weight="semibold" color="#FFFFFF" lineLimit={1}>
                                    Create Channel
                                </SwiftUIText>
                                <Spacer />
                            </HStack>
                        </Button>
                    </HStack>
                </VStack>
            </BottomSheet>
        </Host>
    );
}
