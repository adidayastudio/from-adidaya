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
import { ProjectRoleItem } from '@/lib/api/projectSetup';

export interface ProjectRoleEditSheetProps {
    visible: boolean;
    onClose: () => void;
    roleItem?: ProjectRoleItem | null;
    existingRoles: ProjectRoleItem[];
    onSave: (role: ProjectRoleItem) => void;
    onDelete?: (id: string) => void;
    onConfigurePermissions?: (roleId: string) => void;
}

export function ProjectRoleEditSheet({
    visible,
    onClose,
    roleItem,
    existingRoles,
    onSave,
    onDelete,
    onConfigurePermissions,
}: ProjectRoleEditSheetProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';
    const isEditMode = !!roleItem;
    const isProjectLead = roleItem?.id === 'project_lead';

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isActive, setIsActive] = useState(true);

    useEffect(() => {
        if (visible) {
            if (roleItem) {
                setName(roleItem.name || '');
                setDescription(roleItem.description || '');
                setIsActive(roleItem.isActive ?? true);
            } else {
                setName('');
                setDescription('');
                setIsActive(true);
            }
        }
    }, [visible, roleItem]);

    const handleSave = () => {
        const cleanName = name.trim();
        if (!cleanName) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert('Required Field', 'Please enter a Role Name.');
            return;
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        const savedItem: ProjectRoleItem = {
            id: roleItem?.id || `role-${Date.now()}`,
            name: cleanName,
            description: description.trim(),
            accessSummary: roleItem?.accessSummary || 'Custom Access',
            isActive: isProjectLead ? true : isActive,
            isSystem: roleItem?.isSystem ?? false,
        };

        onSave(savedItem);
        onClose();
    };

    const handleDelete = () => {
        if (!roleItem || roleItem.isSystem || !onDelete) return;

        Alert.alert(
            'Delete Project Role',
            `Are you sure you want to delete "${roleItem.name}"? This action cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        onDelete(roleItem.id);
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
                            {isEditMode ? 'Project Role' : 'New Project Role'}
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
                        {/* Role Name */}
                        <Section footer={roleItem?.isSystem ? 'System default role. Applies per project.' : undefined}>
                            <HStack spacing={12} alignment="center" modifiers={[padding({ vertical: 4 })]}>
                                <SwiftUIText size={15} color={textColor}>
                                    Role Name
                                </SwiftUIText>
                                <Spacer />
                                <TextField
                                    placeholder="e.g. Technical Lead"
                                    defaultValue={name}
                                    onChangeText={setName}
                                    modifiers={[
                                        frame({ minWidth: 160, alignment: 'trailing' }),
                                        tint('#2563EB'),
                                    ]}
                                />
                            </HStack>
                        </Section>

                        {/* Description */}
                        <Section title="Description">
                            <TextField
                                placeholder="Describe what this role does in a project."
                                defaultValue={description}
                                onChangeText={setDescription}
                                modifiers={[tint('#2563EB')]}
                            />
                        </Section>

                        {/* Active Toggle */}
                        <Section footer={isProjectLead ? 'Project Lead is always required and cannot be deactivated.' : 'Allow this role to be assigned to project members.'}>
                            <HStack alignment="center" modifiers={[padding({ vertical: 4 })]}>
                                <VStack alignment="leading" spacing={2}>
                                    <SwiftUIText size={15} color={textColor}>
                                        Active
                                    </SwiftUIText>
                                    <SwiftUIText size={12} color={subtextColor}>
                                        {isProjectLead ? 'Always active' : 'Available for project assignment'}
                                    </SwiftUIText>
                                </VStack>
                                <Spacer />
                                <Switch
                                    value={isProjectLead ? true : isActive}
                                    onValueChange={(val: boolean) => {
                                        if (isProjectLead) return;
                                        Haptics.selectionAsync();
                                        setIsActive(val);
                                    }}
                                    color="#34C759"
                                />
                            </HStack>
                        </Section>

                        {/* Permissions Navigation */}
                        {isEditMode && onConfigurePermissions && (
                            <Section title="Permissions">
                                <Button
                                    variant="plain"
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        onClose();
                                        onConfigurePermissions(roleItem.id);
                                    }}
                                >
                                    <HStack alignment="center" modifiers={[padding({ vertical: 4 })]}>
                                        <SwiftUIText size={15} color={textColor}>
                                            Configure Permissions
                                        </SwiftUIText>
                                        <Spacer />
                                        <Image
                                            systemName="chevron.right"
                                            size={14}
                                            color={subtextColor}
                                        />
                                    </HStack>
                                </Button>
                            </Section>
                        )}

                        {/* Secondary Destructive Delete Action for Custom Roles */}
                        {isEditMode && !roleItem?.isSystem && (
                            <Section>
                                <Button
                                    variant="plain"
                                    onPress={handleDelete}
                                >
                                    <SwiftUIText size={16} color="#FF3B30">
                                        Delete Project Role
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
