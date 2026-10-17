import React, { useState, useEffect } from 'react';
import { 
    Host,
    BottomSheet, 
    HStack, 
    VStack, 
    Spacer, 
    Text as SwiftUIText,
    Image,
    Button,
    TextField,
    Form,
    Section
} from '@expo/ui/swift-ui';
import { padding, background, ignoreSafeArea, tint, frame, cornerRadius, buttonStyle } from '@expo/ui/swift-ui/modifiers';
import { useTheme } from '@/context/ThemeContext';
import { Discipline } from '@/lib/api/templates';
import { Alert } from 'react-native';

export interface WBSAddDisciplineSheetProps {
    visible: boolean;
    onClose: () => void;
    availableDisciplines: Discipline[];
    onAddDiscipline: (discipline: Discipline) => void;
    onAddCustomDiscipline: (code: string, nameEn: string, nameId: string) => void;
}

export const WBSAddDisciplineSheet: React.FC<WBSAddDisciplineSheetProps> = ({
    visible,
    onClose,
    availableDisciplines,
    onAddDiscipline,
    onAddCustomDiscipline
}) => {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const sheetBg = 'clear';

    // State fields for custom discipline
    const [code, setCode] = useState('');
    const [nameEn, setNameEn] = useState('');
    const [nameId, setNameId] = useState('');
    const [resetKey, setResetKey] = useState(0);

    // Reset local fields on open/close
    useEffect(() => {
        if (visible) {
            setCode('');
            setNameEn('');
            setNameId('');
            setResetKey(prev => prev + 1);
        }
    }, [visible]);

    const handleSubmit = () => {
        const cleanCode = code.toUpperCase().trim();
        const cleanNameEn = nameEn.trim();
        const cleanNameId = nameId.trim() || cleanNameEn;

        if (!cleanCode) {
            Alert.alert("Required", "Discipline code is required");
            return;
        }
        if (cleanCode.length > 3) {
            Alert.alert("Invalid", "Discipline code must be 3 characters or less");
            return;
        }
        if (!cleanNameEn) {
            Alert.alert("Required", "English name is required");
            return;
        }

        onAddCustomDiscipline(cleanCode, cleanNameEn, cleanNameId);
        onClose();
    };

    const rowPadding = padding({ top: 10, bottom: 10, leading: 14, trailing: 14 });

    return (
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet
                isOpened={visible}
                presentationDetents={[0.58]}
                presentationDragIndicator="visible"
                onIsOpenedChange={(opened) => {
                    if (!opened) onClose();
                }}
            >
                <VStack spacing={0} modifiers={[
                    ignoreSafeArea({ edges: 'bottom' }),
                    background('clear'),
                    frame({ maxWidth: Infinity, maxHeight: Infinity }),
                    padding({ bottom: 20 })
                ]}>
                    {/* Header */}
                    <HStack alignment="center" modifiers={[padding({ top: 44, leading: 20, trailing: 20, bottom: 16 })]}>
                        <SwiftUIText size={18} weight="bold" color={textColor}>
                            Add Discipline
                        </SwiftUIText>
                        <Spacer />
                        <Button
                            systemImage="xmark"
                            role="cancel"
                            color="gray"
                            onPress={onClose}
                        />
                    </HStack>

                    <Form key={resetKey} modifiers={[background(sheetBg), frame({ maxHeight: 420 })]}>
                        {availableDisciplines.length > 0 && (
                            <Section title="Quick Add Template">
                                {availableDisciplines.map(d => (
                                    <Button
                                        key={d.id}
                                        onPress={() => {
                                            onAddDiscipline(d);
                                            onClose();
                                        }}
                                        modifiers={[
                                            buttonStyle('plain'),
                                            frame({ maxWidth: Infinity })
                                        ]}
                                    >
                                        <HStack alignment="center" spacing={12} modifiers={[rowPadding]}>
                                            <SwiftUIText size={15} weight="medium" color={textColor}>
                                                {`+  ${d.nameEn}`}
                                            </SwiftUIText>
                                            <Spacer />
                                            <Image systemName="plus.circle" size={16} color="#007AFF" />
                                        </HStack>
                                    </Button>
                                ))}
                            </Section>
                        )}

                        <Section title="Custom Discipline">
                            <TextField
                                placeholder="Code (Max 3 chars)*"
                                defaultValue=""
                                onChangeText={setCode}
                                modifiers={[tint('#FF3B30')]}
                            />
                            <TextField
                                placeholder="Name (English)*"
                                defaultValue=""
                                onChangeText={setNameEn}
                                modifiers={[tint('#FF3B30')]}
                            />
                            <TextField
                                placeholder="Name (Indonesian) - Optional"
                                defaultValue=""
                                onChangeText={setNameId}
                                modifiers={[tint('#FF3B30')]}
                            />
                        </Section>
                    </Form>

                    <Spacer />

                    <VStack modifiers={[padding({ top: 12, bottom: 8, leading: 20, trailing: 20 })]}>
                        <Button
                            variant="borderedProminent"
                            color="#FF3B30"
                            onPress={handleSubmit}
                            modifiers={[
                                frame({ maxWidth: Infinity }),
                                cornerRadius(12)
                            ]}
                        >
                            <HStack alignment="center" spacing={6} modifiers={[
                                frame({ maxWidth: Infinity }),
                                frame({ height: 42 })
                            ]}>
                                <Spacer />
                                <SwiftUIText weight="semibold" size={17} color="#FFFFFF">
                                    Add Category
                                </SwiftUIText>
                                <Spacer />
                            </HStack>
                        </Button>
                    </VStack>
                </VStack>
            </BottomSheet>
        </Host>
    );
};
