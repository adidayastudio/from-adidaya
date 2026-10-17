import React, { useState, useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import { 
    Host,
    BottomSheet, 
    HStack, 
    VStack, 
    Spacer, 
    Text as SwiftUIText,
    Image,
    Button,
    Form,
    Section,
    TextField,
    Picker
} from '@expo/ui/swift-ui';
import { padding, background, ignoreSafeArea, tint, frame, cornerRadius, buttonStyle, disabled } from '@expo/ui/swift-ui/modifiers';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';

const PASTEL_COLORS = [
    'bg-red-200', 'bg-orange-200', 'bg-amber-200',
    'bg-yellow-200', 'bg-lime-200', 'bg-green-200',
    'bg-emerald-200', 'bg-teal-200', 'bg-cyan-200',
    'bg-sky-200', 'bg-blue-200', 'bg-indigo-200',
    'bg-violet-200', 'bg-purple-200', 'bg-fuchsia-200',
    'bg-pink-200', 'bg-rose-200', 'bg-stone-200'
];

const COLOR_MAP: Record<string, string> = {
    'bg-red-200': '#FECACA',
    'bg-orange-200': '#FED7AA',
    'bg-amber-200': '#FDE68A',
    'bg-yellow-200': '#FEF08A',
    'bg-lime-200': '#D9F99D',
    'bg-green-200': '#BBF7D0',
    'bg-emerald-200': '#A7F3D0',
    'bg-teal-200': '#99F6E4',
    'bg-cyan-200': '#A5F3FC',
    'bg-sky-200': '#BAE6FD',
    'bg-blue-200': '#BFDBFE',
    'bg-indigo-200': '#C7D2FE',
    'bg-violet-200': '#DDD6FE',
    'bg-purple-200': '#E9D5FF',
    'bg-fuchsia-200': '#F5D0FE',
    'bg-pink-200': '#FBCFE8',
    'bg-rose-200': '#FECDD3',
    'bg-stone-200': '#E7E5E4',
};

const COMPLEXITY_LEVELS = ['Low', 'Medium', 'High'];

export interface SwiftUIGeneralSettingsSheetProps {
    isOpened: boolean;
    onClose: () => void;
    activeTab: 'scope' | 'typologies' | 'disciplines' | 'classes' | 'locations';
    editItem: any | null;
    parentId?: string | null;
    onSave: (payload: {
        code: string;
        name: string;
        description?: string;
        nameId?: string;
        color?: string;
        complexityLevel?: string;
        finishLevel?: string;
        parentId?: string | null;
        province?: string;
        city?: string;
        regionalFactor?: number;
        difficultyFactor?: number;
    }) => Promise<boolean> | void;
    onDelete: (id: string, name: string) => void;
}

export const SwiftUIGeneralSettingsSheet: React.FC<SwiftUIGeneralSettingsSheetProps> = ({
    isOpened,
    onClose,
    activeTab,
    editItem,
    parentId = null,
    onSave,
    onDelete,
}) => {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const sheetBg = 'clear';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#C7C7CC' : 'gray';

    // State Fields
    const [code, setCode] = useState('');
    const [name, setName] = useState('');
    const [nameId, setNameId] = useState(''); // Discipline Indonesian name
    const [desc, setDesc] = useState(''); // Scope description
    const [complexityIndex, setComplexityIndex] = useState(1); // Typology complexity: Default Medium (idx 1)
    const [color, setColor] = useState('bg-purple-200'); // Discipline color
    const [finishLevel, setFinishLevel] = useState(''); // Class finish level
    const [isSaving, setIsSaving] = useState(false);
    const isSubTypology = editItem ? !!editItem.parentId : !!parentId;

    // Reset fields on open
    useEffect(() => {
        if (isOpened) {
            if (editItem) {
                if (activeTab === 'scope') {
                    setCode(editItem.code || '');
                    setName(editItem.name || '');
                    setDesc(editItem.description || '');
                } else if (activeTab === 'typologies') {
                    setCode(editItem.code || '');
                    setName(editItem.name || '');
                    const cIdx = COMPLEXITY_LEVELS.indexOf(editItem.complexityLevel || 'Medium');
                    setComplexityIndex(cIdx !== -1 ? cIdx : 1);
                } else if (activeTab === 'disciplines') {
                    setCode(editItem.code || '');
                    setName(editItem.nameEn || '');
                    setNameId(editItem.nameId || '');
                    setColor(editItem.color || 'bg-purple-200');
                } else if (activeTab === 'classes') {
                    setCode(editItem.classCode || '');
                    setName(editItem.description || '');
                    setFinishLevel(editItem.finishLevel || '');
                }
            } else {
                setCode('');
                setName('');
                setNameId('');
                setDesc('');
                setComplexityIndex(1);
                setColor('bg-purple-200');
                setFinishLevel('');
            }
        }
    }, [isOpened, editItem, activeTab]);

    const handleSave = async () => {
        const cleanCode = code.trim().toUpperCase();
        const cleanName = name.trim();
        
        if (!cleanCode) {
            Alert.alert('Validation Error', 'Code is required.');
            return;
        }

        const maxCodeLen = activeTab === 'classes' ? 1 : 3;
        if (cleanCode.length > maxCodeLen) {
            Alert.alert('Validation Error', `Code must be at most ${maxCodeLen} character${maxCodeLen > 1 ? 's' : ''}.`);
            return;
        }

        if (activeTab !== 'classes' && !cleanName) {
            Alert.alert('Validation Error', 'Name is required.');
            return;
        }

        setIsSaving(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            const payload: any = {
                code: cleanCode,
                name: activeTab === 'classes' ? cleanName : cleanName,
            };

            if (activeTab === 'scope') {
                payload.description = desc.trim();
            } else if (activeTab === 'typologies') {
                payload.complexityLevel = COMPLEXITY_LEVELS[complexityIndex];
                payload.parentId = editItem ? editItem.parentId : parentId;
            } else if (activeTab === 'disciplines') {
                payload.nameId = nameId.trim();
                payload.color = color;
            } else if (activeTab === 'classes') {
                payload.finishLevel = finishLevel.trim();
            }

            const success = await onSave(payload);
            if (success) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                onClose();
            }
        } catch (e: any) {
            console.error('Error saving settings item in SwiftUI:', e);
            Alert.alert('Error', 'Failed to save settings.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeletePress = () => {
        if (!editItem) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        onClose();
        
        // Trigger deletion alert flow on RN side
        const itemId = activeTab === 'scope' ? editItem.projectTypeId : editItem.id;
        const itemName = activeTab === 'scope' 
            ? editItem.name 
            : activeTab === 'classes' 
                ? (editItem.description || editItem.classCode) 
                : editItem.nameEn || editItem.name;
                
        setTimeout(() => {
            onDelete(itemId, itemName);
        }, 500);
    };

    const tabLabel = activeTab === 'scope' 
        ? 'Scope' 
        : activeTab === 'typologies' 
            ? 'Typology' 
            : activeTab === 'disciplines' 
                ? 'Discipline' 
                : 'Class';

    const colorRows = [];
    for (let i = 0; i < PASTEL_COLORS.length; i += 6) {
        colorRows.push(PASTEL_COLORS.slice(i, i + 6));
    }

    return (
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet
                isOpened={isOpened}
                presentationDetents={[0.85]}
                onIsOpenedChange={(opened) => {
                    if (!opened) onClose();
                }}
            >
                <VStack spacing={0} modifiers={[
                    ignoreSafeArea({ edges: 'bottom' }),
                    background(sheetBg)
                ]}>
                    {/* Header */}
                    <HStack alignment="center" modifiers={[padding({ top: 20, leading: 20, trailing: 20, bottom: 10 })]}>
                        <SwiftUIText size={22} weight="bold" color={textColor}>
                            {`${editItem ? 'Edit' : 'Add'} ${tabLabel}`}
                        </SwiftUIText>
                        <Spacer />
                        <Button
                            systemImage="xmark"
                            role="cancel"
                            color="gray"
                            onPress={onClose}
                        />
                    </HStack>

                    {/* Scrollable Form Content */}
                    <Form modifiers={[background(sheetBg), frame({ maxHeight: 520 })]}>
                        <Section title="Basic Information">
                            <TextField
                                placeholder={activeTab === 'classes' ? "Class Code (e.g. A)" : "Code (e.g. ARC)"}
                                defaultValue={code}
                                onChangeText={setCode}
                                modifiers={[tint('#007AFF')]}
                            />
                            {activeTab !== 'classes' && (
                                <TextField
                                    placeholder={activeTab === 'disciplines' ? "Name (English)" : "Name"}
                                    defaultValue={name}
                                    onChangeText={setName}
                                    modifiers={[tint('#007AFF')]}
                                />
                            )}
                        </Section>

                        {/* Additional fields depending on type */}
                        {activeTab === 'scope' && (
                            <Section title="Description">
                                <TextField
                                    placeholder="Enter description (optional)"
                                    defaultValue={desc}
                                    onChangeText={setDesc}
                                    modifiers={[tint('#007AFF')]}
                                />
                            </Section>
                        )}

                        {activeTab === 'typologies' && (
                            <Section title="Complexity & Structure">
                                {isSubTypology && (
                                    <HStack modifiers={[padding({ vertical: 4 })]}>
                                        <SwiftUIText size={13} color={subtextColor}>Hierarchy</SwiftUIText>
                                        <Spacer />
                                        <SwiftUIText size={13} weight="semibold" color="#007AFF">Sub-typology</SwiftUIText>
                                    </HStack>
                                )}
                                <VStack alignment="leading" spacing={4} modifiers={[padding({ vertical: 6 })]}>
                                    <SwiftUIText size={13} color={subtextColor}>Complexity Level</SwiftUIText>
                                    <Picker
                                        options={COMPLEXITY_LEVELS}
                                        selectedIndex={complexityIndex}
                                        onOptionSelected={(e) => setComplexityIndex(e.nativeEvent.index)}
                                        variant="segmented"
                                        modifiers={[tint('#007AFF')]}
                                    />
                                </VStack>
                            </Section>
                        )}

                        {activeTab === 'disciplines' && (
                            <>
                                <Section title="Indonesian translation">
                                    <TextField
                                        placeholder="Name (Indonesia)"
                                        defaultValue={nameId}
                                        onChangeText={setNameId}
                                        modifiers={[tint('#007AFF')]}
                                    />
                                </Section>
                                <Section title="Color Identifier Tag">
                                    <VStack spacing={12} alignment="leading" modifiers={[padding({ vertical: 8 })]}>
                                        {colorRows.map((row, rIdx) => (
                                            <HStack key={rIdx} spacing={12} alignment="center">
                                                {row.map(c => {
                                                    const hex = COLOR_MAP[c];
                                                    const isSelected = color === c;
                                                    return (
                                                        <Button
                                                            key={c}
                                                            onPress={() => setColor(c)}
                                                            modifiers={[
                                                                buttonStyle('plain'),
                                                                frame({ width: 34, height: 34 }),
                                                            ]}
                                                        >
                                                            <HStack alignment="center" modifiers={[
                                                                frame({ width: 34, height: 34 }),
                                                                background(hex),
                                                                cornerRadius(17)
                                                            ]}>
                                                                {isSelected && (
                                                                    <Image systemName="checkmark" size={14} color={isDark ? '#1C1C1E' : '#FFFFFF'} />
                                                                )}
                                                            </HStack>
                                                        </Button>
                                                    );
                                                })}
                                            </HStack>
                                        ))}
                                    </VStack>
                                </Section>
                            </>
                        )}

                        {activeTab === 'classes' && (
                            <Section title="Details">
                                <TextField
                                    placeholder="Class Name / Description (e.g. Luxury)"
                                    defaultValue={name}
                                    onChangeText={setName}
                                    modifiers={[tint('#007AFF')]}
                                />
                                <TextField
                                    placeholder="Finish Level (e.g. High End)"
                                    defaultValue={finishLevel}
                                    onChangeText={setFinishLevel}
                                    modifiers={[tint('#007AFF')]}
                                />
                            </Section>
                        )}

                    </Form>

                    <Spacer />

                    {/* Action Button Footer */}
                    <VStack spacing={12} modifiers={[
                        padding({ top: 12, leading: 20, trailing: 20, bottom: 22 }),
                        background(sheetBg)
                    ]}>
                        {editItem && (
                            <Button
                                role="destructive"
                                onPress={handleDeletePress}
                                modifiers={[buttonStyle('plain'), frame({ maxWidth: Infinity, height: 44 })]}
                            >
                                <HStack alignment="center">
                                    <Spacer />
                                    <Image systemName="trash" size={16} color="#FF3B30" />
                                    <SwiftUIText color="#FF3B30" weight="semibold" modifiers={[padding({ leading: 6 })]}>
                                        {`Delete ${tabLabel}`}
                                    </SwiftUIText>
                                    <Spacer />
                                </HStack>
                            </Button>
                        )}

                        <Button
                            variant="glassProminent"
                            color="#007AFF"
                            onPress={handleSave}
                            modifiers={[
                                frame({ maxWidth: Infinity }), 
                                cornerRadius(999),
                                disabled(isSaving)
                            ]}
                        >
                            <HStack alignment="center" spacing={6} modifiers={[
                                frame({ maxWidth: Infinity }),
                                frame({ height: 42 })
                            ]}>
                                <Spacer />
                                <SwiftUIText weight="semibold" size={17} color="#FFFFFF">
                                    {isSaving ? 'Saving...' : (editItem ? 'Save Settings' : `Add ${tabLabel}`)}
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
