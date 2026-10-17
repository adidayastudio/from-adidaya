import React, { useState, useMemo } from 'react';
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
    Image,
    TextField,
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

export interface TenantMemberOption {
    id: string;
    userId: string;
    name: string;
    email: string;
    role: string;
    avatarUrl?: string;
}

export interface ProjectLeadSelectSheetProps {
    visible: boolean;
    onClose: () => void;
    members: TenantMemberOption[];
    selectedLeadId?: string;
    onSelect: (member: TenantMemberOption) => void;
}

export function ProjectLeadSelectSheet({
    visible,
    onClose,
    members,
    selectedLeadId,
    onSelect,
}: ProjectLeadSelectSheetProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';
    const formaBlue = '#007AFF';

    const [searchQuery, setSearchQuery] = useState('');

    const filteredMembers = useMemo(() => {
        if (!searchQuery.trim()) return members;
        const q = searchQuery.toLowerCase().trim();
        return members.filter(
            (m) =>
                m.name.toLowerCase().includes(q) ||
                (m.role && m.role.toLowerCase().includes(q)) ||
                (m.email && m.email.toLowerCase().includes(q))
        );
    }, [members, searchQuery]);

    return (
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet
                isOpened={visible}
                presentationDetents={[0.6, 0.9]}
                presentationDragIndicator="visible"
                onIsOpenedChange={(opened) => {
                    if (!opened) {
                        setSearchQuery('');
                        onClose();
                    }
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
                            padding({ top: 16, leading: 20, bottom: 8, trailing: 20 }),
                            frame({ maxWidth: 9999 }),
                        ]}
                    >
                        <Button
                            variant="plain"
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setSearchQuery('');
                                onClose();
                            }}
                        >
                            <SwiftUIText size={16} color={subtextColor}>
                                Done
                            </SwiftUIText>
                        </Button>

                        <Spacer />

                        <SwiftUIText size={17} weight="bold" color={textColor}>
                            Select Project Lead
                        </SwiftUIText>

                        <Spacer />

                        <SwiftUIText size={16} color="clear">
                            Done
                        </SwiftUIText>
                    </HStack>

                    {/* Members List Form */}
                    <Form modifiers={[background('clear'), frame({ maxWidth: 9999, maxHeight: 9999 })]}>
                        {/* Search Bar Section */}
                        <Section>
                            <HStack spacing={10} alignment="center" modifiers={[padding({ vertical: 2 })]}>
                                <Image
                                    systemName="magnifyingglass"
                                    modifiers={[
                                        tint(subtextColor),
                                        frame({ width: 16, height: 16 }),
                                    ]}
                                />
                                <TextField
                                    placeholder="Search..."
                                    defaultValue={searchQuery}
                                    onChangeText={(val) => setSearchQuery(val)}
                                />
                            </HStack>
                        </Section>

                        <Section header="Organization Members">
                            {filteredMembers.map((member) => {
                                const isSelected = selectedLeadId === member.id || selectedLeadId === member.name;
                                return (
                                    <Button
                                        key={member.id}
                                        variant="plain"
                                        onPress={() => {
                                            Haptics.selectionAsync();
                                            onSelect(member);
                                            setSearchQuery('');
                                            onClose();
                                        }}
                                    >
                                        <HStack
                                            spacing={12}
                                            alignment="center"
                                            modifiers={[padding({ vertical: 6 }), frame({ maxWidth: 9999 })]}
                                        >
                                            <VStack spacing={2} alignment="leading">
                                                <SwiftUIText size={16} weight={isSelected ? 'bold' : 'regular'} color={textColor}>
                                                    {member.name}
                                                </SwiftUIText>
                                                <SwiftUIText size={13} color={subtextColor}>
                                                    {member.role || 'Member'}
                                                </SwiftUIText>
                                            </VStack>

                                            <Spacer />

                                            {isSelected && (
                                                <Image
                                                    systemName="checkmark"
                                                    modifiers={[
                                                        tint(formaBlue),
                                                        frame({ width: 18, height: 18 }),
                                                    ]}
                                                />
                                            )}
                                        </HStack>
                                    </Button>
                                );
                            })}
                        </Section>
                    </Form>
                </VStack>
            </BottomSheet>
        </Host>
    );
}
