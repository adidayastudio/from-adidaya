import React, { useState, useEffect, useMemo } from 'react';
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
} from '@expo/ui/swift-ui';
import {
    padding,
    frame,
    background,
    ignoreSafeArea,
    tint,
    foregroundColor,
} from '@expo/ui/swift-ui/modifiers';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import {
    FinanceCategory,
    ResourceTypeOption,
    RESOURCE_TYPE_OPTIONS,
    DEFAULT_ACTIVE_EXPENSE_TYPES,
} from '@/lib/api/financeSetup';

export interface FinanceCategoryEditSheetProps {
    visible: boolean;
    onClose: () => void;
    category?: FinanceCategory | null;
    existingCategories: FinanceCategory[];
    expenseTypesList?: string[];
    onSave: (category: FinanceCategory) => void;
    onArchive?: (categoryId: string) => void;
    onDelete?: (categoryId: string) => void;
}

export function FinanceCategoryEditSheet({
    visible,
    onClose,
    category,
    existingCategories,
    expenseTypesList,
    onSave,
    onArchive,
    onDelete,
}: FinanceCategoryEditSheetProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';
    const nativeControlTextColor = isDark ? '#FFFFFF' : '#000000';
    const menuControlModifiers = [tint(isDark ? '#FFFFFF' : '#1C1C1E')];

    const isEditMode = !!category;

    const [code, setCode] = useState('');
    const [name, setName] = useState('');
    const [expenseTypeIndex, setExpenseTypeIndex] = useState(0);
    const [resourceTypeIndex, setResourceTypeIndex] = useState(0);

    const expenseTypeOptions = useMemo(() => {
        const baseList = expenseTypesList && expenseTypesList.length > 0 ? expenseTypesList : DEFAULT_ACTIVE_EXPENSE_TYPES;
        const set = new Set([...baseList, 'None']);
        return Array.from(set);
    }, [expenseTypesList]);

    const resourceTypeOptions = useMemo(() => {
        return RESOURCE_TYPE_OPTIONS.map((r) => r.value);
    }, []);

    useEffect(() => {
        if (visible) {
            if (category) {
                setCode(category.code || '');
                setName(category.name || '');

                const expIdx = expenseTypeOptions.indexOf(category.defaultExpenseType || 'Project Purchase');
                setExpenseTypeIndex(expIdx >= 0 ? expIdx : 0);

                const resIdx = resourceTypeOptions.indexOf(category.resourceMapping || 'Material');
                setResourceTypeIndex(resIdx >= 0 ? resIdx : 0);
            } else {
                setCode('');
                setName('');
                setExpenseTypeIndex(0);
                setResourceTypeIndex(0);
            }
        }
    }, [visible, category, expenseTypeOptions, resourceTypeOptions]);

    const handleSave = () => {
        const cleanCode = code.trim().toUpperCase();
        const cleanName = name.trim();

        if (!cleanCode) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert('Required Field', 'Category Code is required.');
            return;
        }

        if (!cleanName) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert('Required Field', 'Category Name is required.');
            return;
        }

        // Duplicate code validation
        const isDuplicate = existingCategories.some(
            (c) => c.code.toUpperCase() === cleanCode && (!category || c.id !== category.id)
        );

        if (isDuplicate) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert('Duplicate Code', `Category Code "${cleanCode}" is already in use.`);
            return;
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        const newCategory: FinanceCategory = {
            ...category,
            id: category ? category.id : `cat_${Date.now()}`,
            code: cleanCode,
            name: cleanName,
            defaultExpenseType: expenseTypeOptions[expenseTypeIndex] || 'Project Purchase',
            resourceMapping: (resourceTypeOptions[resourceTypeIndex] || 'Material') as ResourceTypeOption,
            subcategories: category ? category.subcategories : [],
            isArchived: category?.isArchived || false,
        };

        onSave(newCategory);
        onClose();
    };

    return (
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet
                isOpened={visible}
                presentationDetents={[0.82, 0.92]}
                presentationDragIndicator="hidden"
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
                    {/* Native Modal Top Header */}
                    <HStack
                        spacing={12}
                        alignment="center"
                        modifiers={[
                            padding({ top: 16, leading: 20, bottom: 12, trailing: 20 }),
                            frame({ maxWidth: 9999 }),
                        ]}
                    >
                        {/* Cancel Button */}
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

                        {/* Modal Title */}
                        <SwiftUIText size={17} weight="bold" color={textColor}>
                            {isEditMode ? 'Edit Category' : 'New Category'}
                        </SwiftUIText>

                        <Spacer />

                        {/* Save Button */}
                        <Button variant="plain" onPress={handleSave}>
                            <SwiftUIText size={16} weight="bold" color="#007AFF">
                                {isEditMode ? 'Save' : 'Add'}
                            </SwiftUIText>
                        </Button>
                    </HStack>

                    {/* Native Form Controls */}
                    <Form modifiers={[background('clear'), frame({ maxWidth: 9999, maxHeight: 9999 })]}>
                        {/* Section 1: General Details */}
                        <Section title="Category Identity">
                            <HStack spacing={12} alignment="center" modifiers={[padding({ vertical: 4 })]}>
                                <SwiftUIText size={15} color={textColor}>
                                    Code
                                </SwiftUIText>
                                <Spacer />
                                <TextField
                                    placeholder="e.g. MAT"
                                    defaultValue={code}
                                    onChangeText={(val) => setCode(val.toUpperCase())}
                                    modifiers={[
                                        frame({ minWidth: 100, alignment: 'trailing' }),
                                        tint('#007AFF'),
                                    ]}
                                />
                            </HStack>

                            <HStack spacing={12} alignment="center" modifiers={[padding({ vertical: 4 })]}>
                                <SwiftUIText size={15} color={textColor}>
                                    Name
                                </SwiftUIText>
                                <Spacer />
                                <TextField
                                    placeholder="e.g. Material"
                                    defaultValue={name}
                                    onChangeText={setName}
                                    modifiers={[
                                        frame({ minWidth: 160, alignment: 'trailing' }),
                                        tint('#007AFF'),
                                    ]}
                                />
                            </HStack>
                        </Section>

                        {/* Section 2: Mapping Configuration */}
                        <Section title="Mappings & Defaults">
                            <Picker
                                label="Default Expense Type"
                                options={expenseTypeOptions}
                                selectedIndex={expenseTypeIndex}
                                onOptionSelected={({ nativeEvent: { index } }) => {
                                    setExpenseTypeIndex(index);
                                }}
                                variant="menu"
                                color={nativeControlTextColor}
                                modifiers={menuControlModifiers}
                            />

                            <Picker
                                label="Resource Mapping"
                                options={resourceTypeOptions}
                                selectedIndex={resourceTypeIndex}
                                onOptionSelected={({ nativeEvent: { index } }) => {
                                    setResourceTypeIndex(index);
                                }}
                                variant="menu"
                                color={nativeControlTextColor}
                                modifiers={menuControlModifiers}
                            />
                        </Section>

                        {isEditMode && onDelete && (
                            <Section>
                                <Button
                                    variant="plain"
                                    onPress={() => {
                                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                                        if (category) onDelete(category.id);
                                        onClose();
                                    }}
                                >
                                    <SwiftUIText size={15} color="#FF3B30">
                                        Delete Category
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

export const FinanceCategoryEditSheetIOS = FinanceCategoryEditSheet;
