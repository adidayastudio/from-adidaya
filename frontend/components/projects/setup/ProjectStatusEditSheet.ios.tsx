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
    Picker,
    TextField,
    Switch,
    Image,
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
import {
    ProjectStatusItem,
    ProjectSystemState,
    PROJECT_SYSTEM_STATES,
    PROJECT_STATUS_COLORS,
} from '@/lib/api/projectSetup';

export interface ProjectStatusEditSheetProps {
    visible: boolean;
    onClose: () => void;
    statusItem?: ProjectStatusItem | null;
    existingStatuses: ProjectStatusItem[];
    onSave: (status: ProjectStatusItem) => void;
    onDelete?: (id: string) => void;
}

export function ProjectStatusEditSheet({
    visible,
    onClose,
    statusItem,
    existingStatuses,
    onSave,
    onDelete,
}: ProjectStatusEditSheetProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';
    const isEditMode = !!statusItem;

    const [name, setName] = useState('');
    const [systemStateIndex, setSystemStateIndex] = useState(1); // Default to 'Active'
    const [colorIndex, setColorIndex] = useState(0);
    const [description, setDescription] = useState('');
    const [isActive, setIsActive] = useState(true);

    useEffect(() => {
        if (visible) {
            if (statusItem) {
                setName(statusItem.name || '');
                const stateIdx = PROJECT_SYSTEM_STATES.indexOf(statusItem.systemState);
                setSystemStateIndex(stateIdx >= 0 ? stateIdx : 1);
                const colIdx = PROJECT_STATUS_COLORS.findIndex(
                    (c) => c.hex.toLowerCase() === (statusItem.color || '').toLowerCase()
                );
                setColorIndex(colIdx >= 0 ? colIdx : 0);
                setDescription(statusItem.description || '');
                setIsActive(statusItem.isActive ?? true);
            } else {
                setName('');
                setSystemStateIndex(0); // 'Upcoming' for new
                setColorIndex(0);
                setDescription('');
                setIsActive(true);
            }
        }
    }, [visible, statusItem]);

    const handleSave = () => {
        const cleanName = name.trim();
        if (!cleanName) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert('Required Field', 'Please enter a Status Name.');
            return;
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        const selectedState = PROJECT_SYSTEM_STATES[systemStateIndex] || 'Active';
        const selectedColor = PROJECT_STATUS_COLORS[colorIndex]?.hex || PROJECT_STATUS_COLORS[0].hex;

        const savedItem: ProjectStatusItem = {
            id: statusItem?.id || Date.now().toString(),
            name: cleanName,
            systemState: selectedState,
            color: selectedColor,
            description: description.trim(),
            isActive,
            isSystem: statusItem?.isSystem,
        };

        onSave(savedItem);
        onClose();
    };

    const handleDelete = () => {
        if (!statusItem || !onDelete) return;

        Alert.alert(
            'Delete Project Status',
            `Are you sure you want to delete "${statusItem.name}"? This action cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        onDelete(statusItem.id);
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
                presentationDetents={[0.72, 0.92]}
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
                            {isEditMode ? 'Project Status' : 'New Project Status'}
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
                        {/* Status Name */}
                        <Section>
                            <HStack spacing={12} alignment="center" modifiers={[padding({ vertical: 4 })]}>
                                <SwiftUIText size={15} color={textColor}>
                                    Status Name
                                </SwiftUIText>
                                <Spacer />
                                <TextField
                                    placeholder="e.g. In Progress"
                                    defaultValue={name}
                                    onChangeText={setName}
                                    modifiers={[
                                        frame({ minWidth: 160, alignment: 'trailing' }),
                                        tint('#2563EB'),
                                    ]}
                                />
                            </HStack>
                        </Section>

                        {/* System Lifecycle State */}
                        <Section
                            title="System State"
                            footer="Defines how Forma interprets this project status."
                        >
                            <Picker
                                label="Lifecycle State"
                                options={PROJECT_SYSTEM_STATES}
                                selectedIndex={systemStateIndex}
                                onOptionSelected={({ nativeEvent: { index } }) => {
                                    Haptics.selectionAsync();
                                    setSystemStateIndex(index);
                                }}
                                variant="menu"
                                modifiers={[tint(isDark ? '#FFFFFF' : '#1C1C1E')]}
                            />
                        </Section>

                        {/* Color Selector */}
                        <Section title="Color">
                            <HStack spacing={10} alignment="center" modifiers={[padding({ vertical: 4 })]}>
                                <HStack spacing={8} alignment="center">
                                    <Image
                                        systemName="circle.fill"
                                        size={14}
                                        color={PROJECT_STATUS_COLORS[colorIndex]?.hex || '#FF9500'}
                                    />
                                    <SwiftUIText size={15} color={textColor}>
                                        Status Color
                                    </SwiftUIText>
                                </HStack>
                                <Spacer />
                                <Picker
                                    options={PROJECT_STATUS_COLORS.map((c) => c.label)}
                                    selectedIndex={colorIndex}
                                    onOptionSelected={({ nativeEvent: { index } }) => {
                                        Haptics.selectionAsync();
                                        setColorIndex(index);
                                    }}
                                    variant="menu"
                                    modifiers={[tint(isDark ? '#FFFFFF' : '#1C1C1E')]}
                                />
                            </HStack>
                        </Section>

                        {/* Description */}
                        <Section title="Description">
                            <TextField
                                placeholder="Describe when this status should be used."
                                defaultValue={description}
                                onChangeText={setDescription}
                                modifiers={[tint('#2563EB')]}
                            />
                        </Section>

                        {/* Active Toggle */}
                        <Section>
                            <HStack alignment="center" modifiers={[padding({ vertical: 4 })]}>
                                <VStack alignment="leading" spacing={2}>
                                    <SwiftUIText size={15} color={textColor}>
                                        Active
                                    </SwiftUIText>
                                    <SwiftUIText size={12} color={subtextColor}>
                                        Allow this status to be used for projects.
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

                        {/* Secondary Destructive Delete Action for Custom Statuses */}
                        {isEditMode && !statusItem?.isSystem && (
                            <Section>
                                <Button
                                    variant="plain"
                                    onPress={handleDelete}
                                >
                                    <SwiftUIText size={16} color="#FF3B30">
                                        Delete Project Status
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
