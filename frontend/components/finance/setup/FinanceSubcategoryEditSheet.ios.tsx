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
    FinanceSubcategory,
    SubcategoryExpenseTypeOption,
    SubcategoryResourceTypeOption,
    ResourceTypeOption,
    RESOURCE_TYPE_OPTIONS,
    DEFAULT_ACTIVE_EXPENSE_TYPES,
} from '@/lib/api/financeSetup';

export interface FinanceSubcategoryEditSheetProps {
    visible: boolean;
    onClose: () => void;
    parentCategory: FinanceCategory;
    subcategory?: FinanceSubcategory | null;
    expenseTypesList?: string[];
    onSave: (subcategory: FinanceSubcategory) => void;
    onArchive?: (subcategoryId: string) => void;
    onDelete?: (subcategoryId: string) => void;
}

export function FinanceSubcategoryEditSheet({
    visible,
    onClose,
    parentCategory,
    subcategory,
    expenseTypesList,
    onSave,
    onArchive,
    onDelete,
}: FinanceSubcategoryEditSheetProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';
    const nativeControlTextColor = isDark ? '#FFFFFF' : '#000000';
    const menuControlModifiers = [tint(isDark ? '#FFFFFF' : '#1C1C1E')];

    const isEditMode = !!subcategory;

    const [code, setCode] = useState('');
    const [name, setName] = useState('');
    const [expenseTypeIndex, setExpenseTypeIndex] = useState(0);
    const [resourceTypeIndex, setResourceTypeIndex] = useState(0);

    const inheritExpenseLabel = `Inherit (${parentCategory?.defaultExpenseType || 'None'})`;
    const inheritResourceLabel = `Inherit (${parentCategory?.resourceMapping || 'None'})`;

    const expenseTypeOptions = useMemo(() => {
        const baseList = expenseTypesList && expenseTypesList.length > 0 ? expenseTypesList : DEFAULT_ACTIVE_EXPENSE_TYPES;
        const set = new Set([inheritExpenseLabel, ...baseList, 'None']);
        return Array.from(set);
    }, [inheritExpenseLabel, expenseTypesList]);

    const resourceTypeOptions = useMemo(() => {
        return [
            inheritResourceLabel,
            ...RESOURCE_TYPE_OPTIONS.map((r) => r.value),
        ];
    }, [inheritResourceLabel]);

    useEffect(() => {
        if (visible) {
            if (subcategory) {
                setCode(subcategory.code || '');
                setName(subcategory.name || '');

                const currentExp = subcategory.defaultExpenseType || 'Inherit from Category';
                if (currentExp === 'Inherit from Category') {
                    setExpenseTypeIndex(0);
                } else {
                    const idx = expenseTypeOptions.indexOf(currentExp);
                    setExpenseTypeIndex(idx >= 0 ? idx : 0);
                }

                const currentRes = subcategory.resourceMapping || 'Inherit from Category';
                if (currentRes === 'Inherit from Category') {
                    setResourceTypeIndex(0);
                } else {
                    const idx = resourceTypeOptions.indexOf(currentRes);
                    setResourceTypeIndex(idx >= 0 ? idx : 0);
                }
            } else {
                // Auto sequence calculation
                const parentCode = parentCategory?.code?.trim().toUpperCase() || 'CAT';
                const subcats = parentCategory?.subcategories || [];
                let maxSeq = 0;
                const regex = new RegExp(`^${parentCode}-(\\d+)$`, 'i');
                for (const s of subcats) {
                    const match = s.code.match(regex);
                    if (match) {
                        const num = parseInt(match[1], 10);
                        if (!isNaN(num) && num > maxSeq) {
                            maxSeq = num;
                        }
                    }
                }
                const nextSeq = maxSeq > 0 ? maxSeq + 1 : subcats.length + 1;
                const padded = String(nextSeq).padStart(2, '0');
                const suggestedCode = `${parentCode}-${padded}`;

                setCode(suggestedCode);
                setName('');
                setExpenseTypeIndex(0);
                setResourceTypeIndex(0);
            }
        }
    }, [visible, subcategory, parentCategory, expenseTypeOptions, resourceTypeOptions]);

    const handleSave = () => {
        const cleanCode = code.trim().toUpperCase();
        const cleanName = name.trim();

        if (!cleanCode) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert('Required Field', 'Subcategory Code is required.');
            return;
        }

        if (!cleanName) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert('Required Field', 'Subcategory Name is required.');
            return;
        }

        // Duplicate code validation within parent
        const isDuplicate = parentCategory.subcategories?.some(
            (s) => s.code.toUpperCase() === cleanCode && (!subcategory || s.id !== subcategory.id)
        );

        if (isDuplicate) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert('Duplicate Code', `Subcategory Code "${cleanCode}" is already in use in this category.`);
            return;
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        const chosenExpense = expenseTypeIndex === 0 ? 'Inherit from Category' : expenseTypeOptions[expenseTypeIndex];
        const chosenResource = resourceTypeIndex === 0 ? 'Inherit from Category' : (resourceTypeOptions[resourceTypeIndex] as ResourceTypeOption);

        const newSubcategory: FinanceSubcategory = {
            ...subcategory,
            id: subcategory ? subcategory.id : `sub_${Date.now()}`,
            code: cleanCode,
            name: cleanName,
            defaultExpenseType: chosenExpense as SubcategoryExpenseTypeOption,
            resourceMapping: chosenResource as SubcategoryResourceTypeOption,
            isArchived: subcategory?.isArchived || false,
        };

        onSave(newSubcategory);
        onClose();
    };

    return (
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet
                isOpened={visible}
                presentationDetents={[0.85, 0.94]}
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
                            {isEditMode ? 'Edit Subcategory' : 'New Subcategory'}
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
                        {/* Section 1: Parent Category Info */}
                        <Section title="Parent Category">
                            <HStack spacing={12} alignment="center" modifiers={[padding({ vertical: 4 })]}>
                                <SwiftUIText size={15} color={textColor}>
                                    Category
                                </SwiftUIText>
                                <Spacer />
                                <SwiftUIText size={15} weight="semibold" color="#007AFF">
                                    {`${parentCategory?.name} (${parentCategory?.code})`}
                                </SwiftUIText>
                            </HStack>
                        </Section>

                        {/* Section 2: Subcategory Identity */}
                        <Section title="Subcategory Identity">
                            <HStack spacing={12} alignment="center" modifiers={[padding({ vertical: 4 })]}>
                                <SwiftUIText size={15} color={textColor}>
                                    Code
                                </SwiftUIText>
                                <Spacer />
                                <SwiftUIText size={15} weight="semibold" color={subtextColor}>
                                    {code || `${parentCategory?.code || 'CAT'}-01`}
                                </SwiftUIText>
                            </HStack>

                            <HStack spacing={12} alignment="center" modifiers={[padding({ vertical: 4 })]}>
                                <SwiftUIText size={15} color={textColor}>
                                    Name
                                </SwiftUIText>
                                <Spacer />
                                <TextField
                                    placeholder="e.g. Building Materials"
                                    defaultValue={name}
                                    onChangeText={setName}
                                    modifiers={[
                                        frame({ minWidth: 160, alignment: 'trailing' }),
                                        tint('#007AFF'),
                                    ]}
                                />
                            </HStack>
                        </Section>

                        {/* Section 3: Mappings (Inheritance or Override) */}
                        <Section title="Mappings & Inheritance">
                            <Picker
                                label="Expense Type"
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
                                        if (subcategory) onDelete(subcategory.id);
                                        onClose();
                                    }}
                                >
                                    <SwiftUIText size={15} color="#FF3B30">
                                        Delete Subcategory
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

export const FinanceSubcategoryEditSheetIOS = FinanceSubcategoryEditSheet;
