import React, { useState, useMemo } from 'react';
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
import { FormaBlue } from '@/constants/theme';
import { useTenantContext } from '@/context/TenantContext';
import * as Haptics from 'expo-haptics';

export interface PeopleDirectoryItem {
    id: string;
    user_id: string;
    name: string;
    role: string;
    dept: string;
    avatar_url?: string | null;
}

export interface SwiftUIAddMemberSheetProps {
    visible: boolean;
    onClose: () => void;
    peopleDirectory: PeopleDirectoryItem[];
    loading?: boolean;
    onAddMember: (person: PeopleDirectoryItem) => void;
    isDark?: boolean;
}

const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
};

export function SwiftUIAddMemberSheet({
    visible,
    onClose,
    peopleDirectory,
    loading = false,
    onAddMember,
    isDark = false,
}: SwiftUIAddMemberSheetProps) {
    const { activeTenant } = useTenantContext();
    const primaryColor = activeTenant?.primary_color || '#10B981';
    const [searchQuery, setSearchQuery] = useState('');

    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';
    const formaBlue = '#007AFF';

    const groupedPeople = useMemo(() => {
        let list = peopleDirectory;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(
                (p) =>
                    p.name.toLowerCase().includes(q) ||
                    p.role.toLowerCase().includes(q) ||
                    p.dept.toLowerCase().includes(q)
            );
        }

        const groups: { [key: string]: PeopleDirectoryItem[] } = {};
        for (const item of list) {
            const dept = item.dept || 'Unassigned';
            if (!groups[dept]) groups[dept] = [];
            groups[dept].push(item);
        }

        return Object.keys(groups)
            .sort()
            .map((dept) => ({
                dept,
                items: groups[dept],
            }));
    }, [peopleDirectory, searchQuery]);

    if (!visible) return null;

    return (
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet
                isOpened={visible}
                presentationDetents={[0.70, 0.90]}
                presentationDragIndicator="visible"
                onIsOpenedChange={(opened) => {
                    if (!opened) onClose();
                }}
            >
                <VStack
                    spacing={12}
                    modifiers={[
                        padding({ top: 18, bottom: 20, leading: 20, trailing: 20 }),
                        background('clear'),
                    ]}
                >
                    {/* Header: Cleanly below drag indicator */}
                    <HStack alignment="center" modifiers={[padding({ bottom: 2 })]}>
                        <SwiftUIText size={18} weight="bold" color={textColor}>
                            Add Member
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

                    {/* Search Field - Full Pill */}
                    <TextField
                        placeholder="Search people..."
                        defaultValue={searchQuery}
                        onChangeText={setSearchQuery}
                        modifiers={[
                            padding({ top: 10, bottom: 10, leading: 16, trailing: 16 }),
                            background(isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'),
                            cornerRadius(22),
                            frame({ maxWidth: Infinity }),
                        ]}
                    />

                    {/* People List grouped by Dept */}
                    {loading ? (
                        <VStack alignment="center" spacing={8} modifiers={[padding({ top: 30 }), frame({ maxWidth: Infinity })]}>
                            <SwiftUIText size={13} color={subtextColor}>
                                Loading people...
                            </SwiftUIText>
                        </VStack>
                    ) : groupedPeople.length === 0 ? (
                        <VStack alignment="center" spacing={8} modifiers={[padding({ top: 30 }), frame({ maxWidth: Infinity })]}>
                            <SwiftUIText size={13} color={subtextColor}>
                                {searchQuery ? 'No matching people found' : 'No more people to add'}
                            </SwiftUIText>
                        </VStack>
                    ) : (
                        <VStack spacing={12} modifiers={[frame({ maxWidth: Infinity })]}>
                            {groupedPeople.map((group) => (
                                <VStack key={group.dept} alignment="leading" spacing={6} modifiers={[frame({ maxWidth: Infinity })]}>
                                    <SwiftUIText size={13} weight="semibold" color={subtextColor}>
                                        {group.dept}
                                    </SwiftUIText>

                                    <VStack spacing={6} modifiers={[frame({ maxWidth: Infinity })]}>
                                        {group.items.map((person) => (
                                            <HStack
                                                key={person.id}
                                                alignment="center"
                                                spacing={12}
                                                modifiers={[
                                                    padding({ top: 9, bottom: 9, leading: 12, trailing: 12 }),
                                                    background(isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.03)'),
                                                    cornerRadius(14),
                                                    frame({ maxWidth: Infinity }),
                                                ]}
                                            >
                                                {/* Initials Avatar */}
                                                <HStack
                                                    alignment="center"
                                                    modifiers={[
                                                        frame({ width: 36, height: 36 }),
                                                        background(primaryColor),
                                                        cornerRadius(18),
                                                    ]}
                                                >
                                                    <SwiftUIText size={13} weight="bold" color="#FFFFFF">
                                                        {getInitials(person.name)}
                                                    </SwiftUIText>
                                                </HStack>

                                                {/* Name & Role */}
                                                <VStack alignment="leading" spacing={2}>
                                                    <SwiftUIText size={14} weight="semibold" color={textColor}>
                                                        {person.name}
                                                    </SwiftUIText>
                                                    <SwiftUIText size={12} color={subtextColor}>
                                                        {person.role}
                                                    </SwiftUIText>
                                                </VStack>

                                                <Spacer />

                                                {/* Circular Glass Add Button */}
                                                <GlassEffectContainer
                                                    modifiers={[
                                                        frame({ width: 36, height: 36 }),
                                                        cornerRadius(18),
                                                        glassEffect({ shape: 'circle' }),
                                                    ]}
                                                >
                                                    <Button
                                                        onPress={() => {
                                                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                                            onAddMember(person);
                                                        }}
                                                        modifiers={[
                                                            buttonStyle('plain'),
                                                            frame({ width: 36, height: 36 }),
                                                        ]}
                                                    >
                                                        <Image systemName="plus" size={15} color={formaBlue} />
                                                    </Button>
                                                </GlassEffectContainer>
                                            </HStack>
                                        ))}
                                    </VStack>
                                </VStack>
                            ))}
                        </VStack>
                    )}
                </VStack>
            </BottomSheet>
        </Host>
    );
}
