import React, { useState, useEffect } from 'react';
import {
    Host,
    BottomSheet,
    VStack,
    HStack,
    Spacer,
    Text as SwiftUIText,
    Button,
    Form,
    Section,
    TextField,
    Image,
} from '@expo/ui/swift-ui';
import {
    padding,
    background,
    ignoreSafeArea,
    frame,
    foregroundColor,
    cornerRadius,
} from '@expo/ui/swift-ui/modifiers';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { ReportType } from '../types';

export interface ReportCategoryData {
    id: string;
    name: string;
    code: string;
    icon: string;
    color: string;
    colorEnd?: string;
    description?: string;
    reportCount?: number;
    activityCount?: number;
}

export interface CategoryDetailSheetProps {
    visible: boolean;
    category: ReportCategoryData | null;
    linkedReportTypes?: ReportType[];
    onClose: () => void;
    onSave: (updated: ReportCategoryData) => void;
    onViewReportTypes?: (categoryName: string) => void;
}

export const NOTION_COLORS = [
    '#14B8A6', // Teal
    '#0284C7', // Sky Blue
    '#6366F1', // Indigo
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#F43F5E', // Rose
    '#F59E0B', // Amber
    '#10B981', // Emerald
    '#64748B', // Slate
    '#0EA5E9', // Ocean
];

export const NOTION_ICONS = [
    // Row 1: Facility & Buildings
    'building.2.crop.circle.fill', 'building.fill', 'house.fill', 'storefront.fill', 'door.left.hand.open', 'key.fill',
    // Row 2: Maintenance & Engineering
    'wrench.and.screwdriver.fill', 'hammer.fill', 'gearshape.fill', 'bolt.fill', 'speedometer', 'gauge.with.dots.needle.bottom.50percent',
    // Row 3: Cleaning & Sanitation
    'sparkles', 'bubbles.and.sparkles.fill', 'trash.fill', 'wind', 'drop.fill', 'hand.tap.fill',
    // Row 4: HSE & Safety
    'shield.checkerboard', 'shield.fill', 'exclamationmark.triangle.fill', 'cross.case.fill', 'flame.fill', 'leaf.fill',
    // Row 5: Operations & Gym
    'figure.run', 'dumbbell.fill', 'figure.cross.training', 'heart.fill', 'camera.fill', 'wifi',
    // Row 6: Management & Audits
    'folder.fill', 'doc.text.fill', 'checklist', 'chart.bar.fill', 'briefcase.fill', 'person.2.fill',
];

export function CategoryDetailSheet({
    visible,
    category,
    linkedReportTypes = [],
    onClose,
    onSave,
    onViewReportTypes,
}: CategoryDetailSheetProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#8E8E93';

    // Editable state synced immediately with active category
    const [editingCatId, setEditingCatId] = useState<string | null>(null);
    const [name, setName] = useState(category?.name || '');
    const [code, setCode] = useState(category?.code || '');
    const [selectedIcon, setSelectedIcon] = useState(category?.icon || 'building.2.crop.circle.fill');
    const [selectedColor, setSelectedColor] = useState(category?.color || '#14B8A6');

    if (category && category.id !== editingCatId) {
        setEditingCatId(category.id);
        setName(category.name || '');
        setCode(category.code || '');
        setSelectedIcon(category.icon || 'building.2.crop.circle.fill');
        setSelectedColor(category.color || '#14B8A6');
    }

    const handleSave = () => {
        if (!category) return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const updated: ReportCategoryData = {
            ...category,
            name: name.trim() || category.name || 'New Category',
            code: code.trim().toUpperCase() || category.code || 'CAT',
            icon: selectedIcon,
            color: selectedColor,
        };
        onSave(updated);
        onClose();
    };

    const sheetBg = isDark ? '#000000' : '#F2F2F7';

    return (
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet
                isOpened={visible && !!category}
                presentationDetents={[0.88]}
                presentationDragIndicator="hidden"
                onIsOpenedChange={(opened) => {
                    if (!opened) onClose();
                }}
            >
                {category ? (
                    <VStack
                        spacing={0}
                        modifiers={[
                            ignoreSafeArea({ edges: 'bottom' }),
                            background('clear'),
                            frame({ maxWidth: 9999 }),
                        ]}
                    >
                        {/* Header */}
                        <HStack
                            alignment="center"
                            modifiers={[
                                padding({ top: 16, leading: 20, bottom: 12, trailing: 20 }),
                                frame({ maxWidth: 9999 }),
                                background('clear'),
                            ]}
                        >
                            <Button
                                variant="plain"
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    onClose();
                                }}
                                modifiers={[foregroundColor(subtextColor)]}
                            >
                                <SwiftUIText size={17} color={subtextColor}>Cancel</SwiftUIText>
                            </Button>
                            <Spacer />
                            <SwiftUIText size={17} weight="bold" color={textColor}>
                                Category Template
                            </SwiftUIText>
                            <Spacer />
                            <Button
                                variant="plain"
                                onPress={handleSave}
                                modifiers={[foregroundColor('#007AFF')]}
                            >
                                <SwiftUIText size={17} weight="bold" color="#007AFF">Save</SwiftUIText>
                            </Button>
                        </HStack>

                        <Form modifiers={[frame({ maxWidth: 9999 }), background('clear')]}>
                            {/* Section 1: Hero Preview */}
                            <Section>
                                <HStack alignment="center" modifiers={[padding({ top: 4, bottom: 4 })]}>
                                    <VStack
                                        alignment="center"
                                        modifiers={[
                                            background(`${selectedColor}22`),
                                            cornerRadius(16),
                                            padding({ all: 10 }),
                                            frame({ width: 52, height: 52 }),
                                        ]}
                                    >
                                        <Image systemName={selectedIcon} size={28} color={selectedColor} />
                                    </VStack>
                                    <Spacer />
                                    <VStack spacing={3} alignment="leading">
                                        <SwiftUIText size={16} weight="bold" color={textColor}>
                                            {name.trim() || 'Category Name'}
                                        </SwiftUIText>
                                        <SwiftUIText size={12} color={selectedColor} weight="bold">
                                            {code ? code.toUpperCase() : 'OPERATIONAL CATEGORY'}
                                        </SwiftUIText>
                                    </VStack>
                                    <Spacer />
                                </HStack>
                            </Section>

                            {/* Section 2: Identity */}
                            <Section
                                title="Category Identity & Code"
                            >
                                <TextField
                                    key={`cat-name-${category.id}-${category.name}`}
                                    placeholder="Category Name"
                                    defaultValue={name}
                                    onChangeText={setName}
                                />
                                <TextField
                                    key={`cat-code-${category.id}-${category.code}`}
                                    placeholder="Category Code (3 letters)"
                                    defaultValue={code}
                                    onChangeText={(val) => setCode(val.toUpperCase().slice(0, 3))}
                                />
                            </Section>

                            {/* Section 3: Notion-Style Theme Color Palette */}
                            <Section title="Theme Color Palette">
                                <HStack alignment="center" modifiers={[padding({ top: 4, bottom: 4 })]}>
                                    {NOTION_COLORS.slice(0, 5).map((col) => (
                                        <React.Fragment key={col}>
                                            <Button
                                                variant="plain"
                                                onPress={() => {
                                                    Haptics.selectionAsync();
                                                    setSelectedColor(col);
                                                }}
                                            >
                                                <Image
                                                    systemName={selectedColor === col ? 'checkmark.circle.fill' : 'circle.fill'}
                                                    size={28}
                                                    color={col}
                                                />
                                            </Button>
                                            <Spacer />
                                        </React.Fragment>
                                    ))}
                                </HStack>
                                <HStack alignment="center" modifiers={[padding({ top: 4, bottom: 4 })]}>
                                    {NOTION_COLORS.slice(5, 10).map((col) => (
                                        <React.Fragment key={col}>
                                            <Button
                                                variant="plain"
                                                onPress={() => {
                                                    Haptics.selectionAsync();
                                                    setSelectedColor(col);
                                                }}
                                            >
                                                <Image
                                                    systemName={selectedColor === col ? 'checkmark.circle.fill' : 'circle.fill'}
                                                    size={28}
                                                    color={col}
                                                />
                                            </Button>
                                            <Spacer />
                                        </React.Fragment>
                                    ))}
                                </HStack>
                            </Section>

                            {/* Section 4: Notion-Style Icon Library Grid */}
                            <Section
                                title="Icon Library"
                            >
                                {[0, 6, 12, 18, 24, 30].map((startIndex) => (
                                    <HStack key={startIndex} alignment="center" modifiers={[padding({ top: 2, bottom: 2 })]}>
                                        {NOTION_ICONS.slice(startIndex, startIndex + 6).map((iconSym) => (
                                            <React.Fragment key={iconSym}>
                                                <Button
                                                    variant="plain"
                                                    onPress={() => {
                                                        Haptics.selectionAsync();
                                                        setSelectedIcon(iconSym);
                                                    }}
                                                >
                                                    <VStack
                                                        alignment="center"
                                                        modifiers={[
                                                            padding({ all: 7 }),
                                                            background(selectedIcon === iconSym ? `${selectedColor}25` : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)')),
                                                            cornerRadius(10),
                                                            frame({ width: 42, height: 42 }),
                                                        ]}
                                                    >
                                                        <Image
                                                            systemName={iconSym}
                                                            size={20}
                                                            color={selectedIcon === iconSym ? selectedColor : (isDark ? '#E5E5EA' : '#3C3C43')}
                                                        />
                                                    </VStack>
                                                </Button>
                                                <Spacer />
                                            </React.Fragment>
                                        ))}
                                    </HStack>
                                ))}
                            </Section>

                            {/* Section 5: Linked Report Types (View Only) */}
                            <Section
                                title={`Linked Report Types (${linkedReportTypes.length})`}
                            >
                                {linkedReportTypes.map((rt) => (
                                    <HStack key={rt.id} alignment="center" modifiers={[padding({ top: 4, bottom: 4 })]}>
                                        <VStack spacing={2} alignment="leading">
                                            <SwiftUIText weight="semibold" color={textColor}>
                                                {rt.name}
                                            </SwiftUIText>
                                            <SwiftUIText size={12} color={subtextColor}>
                                                {`${rt.activities.length} routine activities`}
                                            </SwiftUIText>
                                        </VStack>
                                        <Spacer />
                                        <SwiftUIText size={12} weight="semibold" color={rt.color}>
                                            Active
                                        </SwiftUIText>
                                    </HStack>
                                ))}

                                {linkedReportTypes.length === 0 && (
                                    <SwiftUIText color={subtextColor}>
                                        No report types currently assigned to this category.
                                    </SwiftUIText>
                                )}
                            </Section>
                        </Form>
                    </VStack>
                ) : (
                    <VStack spacing={0} modifiers={[frame({ width: 0, height: 0 })]}>
                        <SwiftUIText color="clear"> </SwiftUIText>
                    </VStack>
                )}
            </BottomSheet>
        </Host>
    );
}
