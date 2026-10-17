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
    FinanceApproverLevel,
    ORGANIZATION_POSITIONS_MASTER,
    ORGANIZATION_EMPLOYEES_MASTER,
    OrganizationPositionItem,
    OrganizationEmployeeItem,
} from '@/lib/api/financeSetup';

export interface FinanceLevelEditModalProps {
    visible: boolean;
    onClose: () => void;
    level?: FinanceApproverLevel | null;
    levelNumber: number;
    title: string;
    existingChain?: FinanceApproverLevel[];
    positions?: OrganizationPositionItem[];
    employees?: OrganizationEmployeeItem[];
    onSave: (level: FinanceApproverLevel) => void;
    onDelete?: () => void;
}

export function FinanceLevelEditModal({
    visible,
    onClose,
    level,
    levelNumber,
    title,
    existingChain = [],
    positions = [],
    employees = [],
    onSave,
    onDelete,
}: FinanceLevelEditModalProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';
    const menuControlModifiers = [tint(isDark ? '#FFFFFF' : '#1C1C1E')];

    const allPositions = positions && positions.length > 0 ? positions : ORGANIZATION_POSITIONS_MASTER;
    const allEmployees = employees && employees.length > 0 ? employees : ORGANIZATION_EMPLOYEES_MASTER;

    const [selectedPosIndex, setSelectedPosIndex] = useState(0);
    const [selectedPersonIndex, setSelectedPersonIndex] = useState<number>(0);

    const positionTitles = useMemo(() => allPositions.map((p) => p.title), [allPositions]);

    // Other approver names already assigned in this chain (excluding the current level being edited)
    const alreadyAssignedNames = useMemo(() => {
        return new Set(
            existingChain
                .filter((l) => l.id !== level?.id && l.level !== levelNumber)
                .map((l) => l.personName)
                .filter((name) => name && name !== 'No person assigned')
        );
    }, [existingChain, level, levelNumber]);

    // Matching employees strictly filtered by the selected position
    const selectedPosition = allPositions[selectedPosIndex] || allPositions[0];

    const matchingEmployees: OrganizationEmployeeItem[] = useMemo(() => {
        const list = allEmployees.filter(
            (e) => e.positionTitle.toLowerCase() === (selectedPosition?.title || '').toLowerCase()
        );
        return list.length > 0 ? list : allEmployees;
    }, [allEmployees, selectedPosition]);

    // Dynamic employee options for picker
    const isSinglePerson = matchingEmployees.length === 1;

    const employeePickerOptions = useMemo(() => {
        if (isSinglePerson) {
            const emp = matchingEmployees[0];
            const isAssignedElsewhere = alreadyAssignedNames.has(emp.name);
            return [`${emp.name} (${emp.departmentName || emp.positionTitle})${isAssignedElsewhere ? ' · (Already in chain)' : ''}`];
        }
        // Multiple candidates: add placeholder as first option
        const opts = ['— Select Person —'];
        matchingEmployees.forEach((emp) => {
            const isAssignedElsewhere = alreadyAssignedNames.has(emp.name);
            opts.push(
                `${emp.name} (${emp.departmentName || emp.positionTitle})${isAssignedElsewhere ? ' · (Already in chain)' : ''}`
            );
        });
        return opts;
    }, [matchingEmployees, isSinglePerson, alreadyAssignedNames]);

    useEffect(() => {
        if (visible) {
            if (level) {
                const posIdx = allPositions.findIndex(
                    (p) => p.title === level.positionTitle
                );
                const activePosIdx = posIdx >= 0 ? posIdx : 0;
                setSelectedPosIndex(activePosIdx);

                const currentMatching = allEmployees.filter(
                    (e) => e.positionTitle === (posIdx >= 0 ? allPositions[posIdx].title : allPositions[0].title)
                );

                if (currentMatching.length === 1) {
                    setSelectedPersonIndex(0);
                } else {
                    const empIdx = currentMatching.findIndex((e) => e.name === level.personName);
                    setSelectedPersonIndex(empIdx >= 0 ? empIdx + 1 : 0);
                }
            } else {
                const fallbackPos = allPositions[
                    Math.min(levelNumber - 1, allPositions.length - 1)
                ] || allPositions[0];
                const fallbackPosIdx = allPositions.indexOf(fallbackPos);
                setSelectedPosIndex(fallbackPosIdx >= 0 ? fallbackPosIdx : 0);

                const currentMatching = allEmployees.filter(
                    (e) => e.positionTitle === fallbackPos.title
                );

                if (currentMatching.length === 1) {
                    setSelectedPersonIndex(0);
                } else {
                    // Multiple people: default to placeholder "— Select Person —"
                    setSelectedPersonIndex(0);
                }
            }
        }
    }, [visible, level, levelNumber, allPositions, allEmployees]);

    const handlePosChange = (index: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedPosIndex(index);
        const newPos = allPositions[index];
        const newMatching = allEmployees.filter(
            (e) => e.positionTitle === newPos.title
        );

        if (newMatching.length === 1) {
            setSelectedPersonIndex(0);
        } else {
            // Require explicit selection when multiple candidates exist
            setSelectedPersonIndex(0);
        }
    };

    const handlePersonChange = (index: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedPersonIndex(index);
    };

    const handleSave = () => {
        const pos = selectedPosition;
        let chosenEmployee: OrganizationEmployeeItem | null = null;

        if (isSinglePerson) {
            chosenEmployee = matchingEmployees[0];
        } else {
            if (selectedPersonIndex === 0) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                Alert.alert(
                    'Select Assigned Person',
                    `Please select which person is assigned to the "${pos.title}" position.`
                );
                return;
            }
            chosenEmployee = matchingEmployees[selectedPersonIndex - 1];
        }

        if (!chosenEmployee) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert('Person Required', 'Please choose an assigned person.');
            return;
        }

        // Duplicate Check: Same person cannot be assigned to multiple levels in the same chain
        if (alreadyAssignedNames.has(chosenEmployee.name)) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert(
                'Duplicate Approver',
                `"${chosenEmployee.name}" is already assigned to another level in this approval chain. Each approval level must be assigned to a distinct approver.`
            );
            return;
        }

        const savedLevel: FinanceApproverLevel = {
            id: level?.id || `lvl_${Date.now()}`,
            level: levelNumber,
            positionId: pos.id,
            positionTitle: pos.title,
            userId: chosenEmployee.id,
            personName: chosenEmployee.name,
        };

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onSave(savedLevel);
        onClose();
    };

    const handleDeletePrompt = () => {
        if (!onDelete) return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert(
            'Remove Approver Level',
            `Are you sure you want to remove Level ${levelNumber} (${selectedPosition.title}) from this approval chain?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: () => {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        onDelete();
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
                presentationDetents={[0.48, 0.65]}
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
                    {/* Header */}
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

                        <SwiftUIText size={17} weight="bold" color={textColor} lineLimit={1}>
                            {title || `Level ${levelNumber}`}
                        </SwiftUIText>

                        <Spacer />

                        <Button
                            variant="plain"
                            onPress={handleSave}
                        >
                            <SwiftUIText size={16} weight="semibold" color="#007AFF">
                                Done
                            </SwiftUIText>
                        </Button>
                    </HStack>

                    {/* Form Body */}
                    <Form modifiers={[background('clear'), frame({ maxWidth: 9999, maxHeight: 9999 })]}>
                        <Section
                            title={`Approver Level ${levelNumber}`}
                        >
                            <Picker
                                label="Position"
                                variant="menu"
                                options={positionTitles}
                                selectedIndex={selectedPosIndex}
                                onOptionSelected={({ nativeEvent: { index } }) => {
                                    handlePosChange(index);
                                }}
                                modifiers={menuControlModifiers}
                            />

                            <Picker
                                label="Assigned Person"
                                variant="menu"
                                options={employeePickerOptions}
                                selectedIndex={selectedPersonIndex}
                                onOptionSelected={({ nativeEvent: { index } }) => {
                                    handlePersonChange(index);
                                }}
                                modifiers={menuControlModifiers}
                            />
                        </Section>

                        {onDelete && (
                            <Section>
                                <Button
                                    variant="plain"
                                    onPress={handleDeletePrompt}
                                >
                                    <SwiftUIText size={15} color="#FF3B30">
                                        Remove Level
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

export default FinanceLevelEditModal;
