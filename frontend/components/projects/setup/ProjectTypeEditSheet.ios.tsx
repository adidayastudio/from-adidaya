import React, { useState, useEffect } from 'react';
import { Alert } from 'react-native';
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
    Switch,
} from '@expo/ui/swift-ui';
import {
    padding,
    frame,
    background,
    ignoreSafeArea,
    tint,
} from '@expo/ui/swift-ui/modifiers';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { ProjectTypeItem } from '@/lib/api/projectSetup';

export interface ProjectTypeEditSheetProps {
    visible: boolean;
    onClose: () => void;
    projectType?: ProjectTypeItem | null;
    existingTypes: ProjectTypeItem[];
    onSave: (type: ProjectTypeItem) => void;
    onDelete?: (id: string) => void;
}

export function ProjectTypeEditSheet({
    visible,
    onClose,
    projectType,
    existingTypes,
    onSave,
    onDelete,
}: ProjectTypeEditSheetProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';
    const isEditMode = !!projectType;

    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [description, setDescription] = useState('');
    const [isActive, setIsActive] = useState(true);

    useEffect(() => {
        if (visible) {
            if (projectType) {
                setName(projectType.name || '');
                setCode(projectType.code || '');
                setDescription(projectType.description || '');
                setIsActive(projectType.isActive ?? true);
            } else {
                setName('');
                setCode('');
                setDescription('');
                setIsActive(true);
            }
        }
    }, [visible, projectType]);

    const handleSave = () => {
        const cleanName = name.trim();
        const cleanCode = code.trim().toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);

        if (!cleanName) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert('Required Field', 'Please enter a Type Name.');
            return;
        }

        if (!cleanCode || cleanCode.length < 2) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert('Required Field', 'Short Code must be 2 to 4 letters.');
            return;
        }

        // Validate uniqueness among other types
        const isDuplicate = existingTypes.some(
            (t) => t.code.toUpperCase() === cleanCode && t.id !== projectType?.id
        );
        if (isDuplicate) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert('Duplicate Code', `The short code "${cleanCode}" is already used by another Project Type.`);
            return;
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        const savedItem: ProjectTypeItem = {
            id: projectType?.id || Date.now().toString(),
            name: cleanName,
            code: cleanCode,
            description: description.trim(),
            isActive,
            isDefault: projectType?.isDefault,
        };

        onSave(savedItem);
        onClose();
    };

    const handleDelete = () => {
        if (!projectType || !onDelete) return;

        Alert.alert(
            'Delete Project Type',
            `Are you sure you want to delete "${projectType.name}"? This action cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        onDelete(projectType.id);
                        onClose();
                    },
                },
            ]
        );
    };

    return (
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet
                isOpened={visible}
                presentationDetents={[0.7, 0.9]}
                presentationDragIndicator="visible"
                onIsOpenedChange={(opened) => {
                    if (!opened) onClose();
                }}
            >
                <VStack
                    spacing={0}
                    modifiers={[
                        frame({ maxWidth: 9999, maxHeight: 9999, alignment: 'top' }),
                        background('clear'),
                        ignoreSafeArea({ regions: 'all', edges: 'bottom' }),
                    ]}
                >
                    {/* Header Bar */}
                    <HStack
                        spacing={12}
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
                            <SwiftUIText size={16} color={subtextColor}>
                                Cancel
                            </SwiftUIText>
                        </Button>

                        <Spacer />

                        <SwiftUIText size={17} weight="bold" color={textColor}>
                            {isEditMode ? 'Project Type' : 'New Project Type'}
                        </SwiftUIText>

                        <Spacer />

                        <Button variant="plain" onPress={handleSave}>
                            <SwiftUIText size={16} weight="bold" color="#2563EB">
                                Save
                            </SwiftUIText>
                        </Button>
                    </HStack>

                    {/* Form Content */}
                    <Form modifiers={[background('clear'), frame({ maxWidth: 9999, maxHeight: 9999 })]}>
                        {/* Type Name Section */}
                        <Section>
                            <HStack spacing={12} alignment="center" modifiers={[padding({ vertical: 4 })]}>
                                <SwiftUIText size={15} color={textColor}>
                                    Type Name
                                </SwiftUIText>
                                <Spacer />
                                <TextField
                                    placeholder="e.g. Client Project"
                                    defaultValue={name}
                                    onChangeText={setName}
                                    modifiers={[
                                        frame({ minWidth: 160, alignment: 'trailing' }),
                                        tint('#2563EB'),
                                    ]}
                                />
                            </HStack>
                        </Section>

                        {/* Short Code Section */}
                        <Section
                            title="Short Code"
                            footer="A short label used in project lists and filters."
                        >
                            <HStack spacing={12} alignment="center" modifiers={[padding({ vertical: 4 })]}>
                                <SwiftUIText size={15} color={textColor}>
                                    Short Code
                                </SwiftUIText>
                                <Spacer />
                                <TextField
                                    placeholder="e.g. CLT"
                                    defaultValue={code}
                                    onChangeText={(val: string) => {
                                        const cleaned = val.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
                                        setCode(cleaned);
                                    }}
                                    modifiers={[
                                        frame({ minWidth: 100, alignment: 'trailing' }),
                                        tint('#2563EB'),
                                    ]}
                                />
                            </HStack>
                        </Section>

                        {/* Description Section */}
                        <Section title="Description">
                            <TextField
                                placeholder="Describe when this project type should be used."
                                defaultValue={description}
                                onChangeText={setDescription}
                                modifiers={[tint('#2563EB')]}
                            />
                        </Section>

                        {/* Active Toggle Section */}
                        <Section>
                            <HStack alignment="center" modifiers={[padding({ vertical: 4 })]}>
                                <VStack alignment="leading" spacing={2}>
                                    <SwiftUIText size={15} color={textColor}>
                                        Active
                                    </SwiftUIText>
                                    <SwiftUIText size={12} color={subtextColor}>
                                        Allow this type to be selected for new projects
                                    </SwiftUIText>
                                </VStack>
                                <Spacer />
                                <Switch
                                    value={isActive}
                                    onValueChange={(val: boolean) => {
                                        Haptics.selectionAsync();
                                        setIsActive(val);
                                    }}
                                    color="#34C759"
                                />
                            </HStack>
                        </Section>

                        {/* Secondary Destructive Delete Action for Custom Types */}
                        {isEditMode && !projectType?.isDefault && (
                            <Section>
                                <Button
                                    variant="plain"
                                    onPress={handleDelete}
                                >
                                    <SwiftUIText size={16} color="#FF3B30">
                                        Delete Project Type
                                    </SwiftUIText>
                                </Button>
                            </Section>
                        )}
                    </Form>
                </VStack>
            </BottomSheet>
        </Host>
    );
}
