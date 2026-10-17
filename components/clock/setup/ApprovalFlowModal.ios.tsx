import React, { useState, useEffect, useRef, useMemo } from 'react';
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
    ApprovalStep,
    ApprovalOverride,
    ApprovalRequestType,
} from '@/lib/api/clockSetup';

export interface ApprovalFlowModalProps {
    visible: boolean;
    onClose: () => void;
    mode: 'department_default' | 'override';
    departmentId: string;
    departmentName: string;
    currentChain?: ApprovalStep[];
    currentRequestType?: ApprovalRequestType;
    onSaveDepartmentFlow?: (departmentId: string, chain: ApprovalStep[], requestType?: ApprovalRequestType) => void;
    editingOverride?: ApprovalOverride | null;
    onSaveOverride?: (override: ApprovalOverride) => void;
    onDeleteOverride?: (overrideId: string) => void;
    departmentsList: any[];
    positionsList: any[];
    membersList: any[];
}

const REQUEST_TYPE_OPTIONS: Array<{ key: ApprovalRequestType; label: string }> = [
    { key: 'all', label: 'All Requests' },
    { key: 'leave', label: 'Leave' },
    { key: 'overtime', label: 'Overtime' },
    { key: 'business_trip', label: 'Business Trip' },
    { key: 'attendance_correction', label: 'Attendance Correction' },
];

export function ApprovalFlowModal({
    visible,
    onClose,
    mode,
    departmentId,
    departmentName,
    currentChain,
    currentRequestType = 'all',
    onSaveDepartmentFlow,
    editingOverride,
    onSaveOverride,
    onDeleteOverride,
    positionsList,
    membersList,
}: ApprovalFlowModalProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';
    const nativeControlTextColor = isDark ? '#FFFFFF' : '#000000';
    const menuControlModifiers = [tint(isDark ? '#FFFFFF' : '#1C1C1E')];
    const segmentedControlModifiers = [tint(isDark ? '#FFFFFF' : '#1C1C1E')];

    // Chain State
    const [chain, setChain] = useState<ApprovalStep[]>([]);
    const [requestTypeIndex, setRequestTypeIndex] = useState(0);

    // Override mode states
    const [overrideTypeIndex, setOverrideTypeIndex] = useState(0); // 0 = Position, 1 = Employee
    const [selectedPositionIndex, setSelectedPositionIndex] = useState(0);
    const [selectedMemberIndex, setSelectedMemberIndex] = useState(0);

    const wasVisibleRef = useRef(false);

    // Filter positions strictly belonging to this department
    const deptPositions = useMemo(() => {
        if (!positionsList || positionsList.length === 0) return [];
        if (!departmentId && !departmentName) return [];
        const matched = positionsList.filter((p: any) => {
            if (departmentId && (p.department_id === departmentId || p.dept_id === departmentId)) return true;
            if (departmentName && p.department && p.department.toLowerCase() === departmentName.toLowerCase()) return true;
            return false;
        });
        return matched.length > 0 ? matched : [];
    }, [positionsList, departmentId, departmentName]);

    // Filter members strictly belonging to this department
    const deptMembers = useMemo(() => {
        if (!membersList || membersList.length === 0) return [];
        if (!departmentId && !departmentName) return [];
        const matched = membersList.filter((m: any) => {
            if (departmentId && (m.department_id === departmentId || m.dept_id === departmentId)) return true;
            if (departmentName && m.department && m.department.toLowerCase() === departmentName.toLowerCase()) return true;
            return false;
        });
        return matched.length > 0 ? matched : [];
    }, [membersList, departmentId, departmentName]);

    // Helper: Find all members holding a specific position
    const getHoldersForPosition = (positionId: string, positionName: string) => {
        return deptMembers.filter((m: any) => {
            const matchesId = m.position_id === positionId;
            const matchesTitle =
                (m.job_title && m.job_title.toLowerCase() === positionName.toLowerCase()) ||
                (m.position && m.position.toLowerCase() === positionName.toLowerCase());
            return matchesId || matchesTitle;
        });
    };

    // Helper: Find position index for a step
    const findPositionIndex = (step: ApprovalStep): number => {
        if (deptPositions.length === 0) return 0;
        const idx = deptPositions.findIndex((p: any) => p.id === step.positionId);
        return idx >= 0 ? idx : 0;
    };

    // Helper: Find holder index for a step with multiple holders
    const findHolderIndex = (holders: any[], step: ApprovalStep): number => {
        if (holders.length === 0) return 0;
        const idx = holders.findIndex((h: any) => h.id === step.userId);
        return idx >= 0 ? idx : 0;
    };

    // Helper: Check if a position / person is already assigned to another level
    const isStepAlreadyAssigned = (posId: string, userId?: string, excludeStepIdx: number = -1): boolean => {
        return chain.some((s, idx) => {
            if (idx === excludeStepIdx) return false;
            if (userId && s.userId) {
                return s.userId === userId;
            }
            return s.positionId === posId;
        });
    };

    // Initialize state when modal opens
    useEffect(() => {
        if (visible && !wasVisibleRef.current) {
            if (mode === 'department_default') {
                const initial = currentChain && currentChain.length > 0
                    ? currentChain.map((s, idx) => ({ ...s, level: idx + 1 }))
                    : [];
                setChain(initial);
                setRequestTypeIndex(0);
            } else {
                // Override mode
                if (editingOverride) {
                    const isEmp = editingOverride.targetType === 'employee';
                    setOverrideTypeIndex(isEmp ? 1 : 0);

                    if (isEmp) {
                        const mIdx = deptMembers.findIndex((m: any) => m.id === editingOverride.targetId);
                        setSelectedMemberIndex(mIdx >= 0 ? mIdx : 0);
                    } else {
                        const pIdx = deptPositions.findIndex((p: any) => p.id === editingOverride.targetId);
                        setSelectedPositionIndex(pIdx >= 0 ? pIdx : 0);
                    }

                    const rIdx = REQUEST_TYPE_OPTIONS.findIndex((r) => r.key === editingOverride.requestType);
                    setRequestTypeIndex(rIdx >= 0 ? rIdx : 0);

                    const initial = editingOverride.chain && editingOverride.chain.length > 0
                        ? editingOverride.chain.map((s, idx) => ({ ...s, level: idx + 1 }))
                        : [];
                    setChain(initial);
                } else {
                    // New override
                    setOverrideTypeIndex(0);
                    setSelectedPositionIndex(0);
                    setSelectedMemberIndex(0);
                    setRequestTypeIndex(0);
                    setChain([]);
                }
            }
        }
        wasVisibleRef.current = visible;
    }, [visible, mode, currentChain, currentRequestType, editingOverride, deptPositions, deptMembers]);

    // Handle changing Position for a Level
    const handlePositionChange = (stepIndex: number, positionIndex: number) => {
        const selectedPos = deptPositions[positionIndex];
        if (!selectedPos) return;

        const holders = getHoldersForPosition(selectedPos.id, selectedPos.name);
        let chosenHolder = holders.length === 1 ? holders[0] : (holders.length > 1 ? holders[0] : undefined);

        // Validation for uniqueness
        if (isStepAlreadyAssigned(selectedPos.id, chosenHolder?.id, stepIndex)) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert(
                'Duplicate Approver',
                `"${selectedPos.name}" is already assigned to another level in this flow. Each level must have a unique position or person.`
            );
            return;
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const updated = [...chain];
        const holderName = chosenHolder ? (chosenHolder.full_name || chosenHolder.name) : undefined;
        const stepLabel = holderName ? `${selectedPos.name} (${holderName})` : selectedPos.name;

        updated[stepIndex] = {
            id: `step-${Date.now()}-${stepIndex + 1}`,
            level: stepIndex + 1,
            type: 'position',
            positionId: selectedPos.id,
            positionName: selectedPos.name,
            userId: chosenHolder?.id,
            userName: holderName,
            userAvatar: chosenHolder?.avatar_url,
            label: stepLabel,
        };
        setChain(updated);
    };

    // Handle changing specific Person for a Level (when position has multiple holders)
    const handleHolderChange = (stepIndex: number, holderIndex: number, holders: any[]) => {
        const chosenHolder = holders[holderIndex];
        if (!chosenHolder) return;

        const currentStep = chain[stepIndex];
        if (!currentStep) return;

        if (isStepAlreadyAssigned(currentStep.positionId || '', chosenHolder.id, stepIndex)) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert(
                'Duplicate Approver',
                `"${chosenHolder.full_name || chosenHolder.name}" is already assigned to another level.`
            );
            return;
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const updated = [...chain];
        const holderName = chosenHolder.full_name || chosenHolder.name;
        const stepLabel = `${currentStep.positionName || 'Position'} (${holderName})`;

        updated[stepIndex] = {
            ...currentStep,
            userId: chosenHolder.id,
            userName: holderName,
            userAvatar: chosenHolder.avatar_url,
            label: stepLabel,
        };
        setChain(updated);
    };

    // Add Level (picks next available unique position)
    const handleAddLevel = () => {
        if (deptPositions.length === 0) {
            Alert.alert(
                'No Positions Found',
                `There are no positions assigned to the "${departmentName || 'selected'}" department in People Setup. Please add positions to this department first.`
            );
            return;
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const newLevel = chain.length + 1;

        // Find first position not yet in chain
        const availablePos = deptPositions.find((p: any) => !chain.some((s) => s.positionId === p.id)) || deptPositions[0];
        const holders = getHoldersForPosition(availablePos.id, availablePos.name);
        const firstHolder = holders.length > 0 ? holders[0] : undefined;
        const holderName = firstHolder ? (firstHolder.full_name || firstHolder.name) : undefined;
        const stepLabel = holderName ? `${availablePos.name} (${holderName})` : availablePos.name;

        const newStep: ApprovalStep = {
            id: `step-${Date.now()}-${newLevel}`,
            level: newLevel,
            type: 'position',
            positionId: availablePos.id,
            positionName: availablePos.name,
            userId: firstHolder?.id,
            userName: holderName,
            userAvatar: firstHolder?.avatar_url,
            label: stepLabel,
        };
        setChain([...chain, newStep]);
    };

    // Remove Level
    const handleRemoveLevel = (index: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const updated = chain.filter((_, i) => i !== index).map((s, i) => ({ ...s, level: i + 1 }));
        setChain(updated);
    };

    // Move Level Up/Down
    const handleMoveLevel = (index: number, direction: 'up' | 'down') => {
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= chain.length) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const updated = [...chain];
        const temp = updated[index];
        updated[index] = updated[targetIndex];
        updated[targetIndex] = temp;
        setChain(updated.map((s, i) => ({ ...s, level: i + 1 })));
    };

    // Save with unique validation
    const handleSave = () => {
        if (chain.length === 0) {
            Alert.alert('Configuration Required', 'Please add at least 1 approval level before saving.');
            return;
        }

        // Validate uniqueness across levels
        const approverKeys = chain.map((s) => (s.userId ? `usr_${s.userId}` : `pos_${s.positionId}`));
        const uniqueKeys = new Set(approverKeys);
        if (uniqueKeys.size < chain.length) {
            Alert.alert(
                'Duplicate Approver',
                'Each approval level must have a unique position or approver person. Please check for duplicate levels.'
            );
            return;
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        if (mode === 'department_default') {
            if (onSaveDepartmentFlow) {
                onSaveDepartmentFlow(departmentId, chain, 'all');
            }
            onClose();
        } else {
            // Override mode
            const isEmp = overrideTypeIndex === 1;
            let targetId = '';
            let targetName = '';
            let targetAvatar: string | undefined = undefined;

            if (isEmp) {
                const member = deptMembers[selectedMemberIndex];
                if (!member) {
                    Alert.alert('Selection Required', 'Please select an employee from this department.');
                    return;
                }
                targetId = member.id;
                targetName = member.full_name || member.name || 'Employee';
                targetAvatar = member.avatar_url;
            } else {
                const position = deptPositions[selectedPositionIndex];
                if (!position) {
                    Alert.alert('Selection Required', 'Please select a position from this department.');
                    return;
                }
                targetId = position.id;
                targetName = position.name || 'Position';
            }

            const selectedReqType = REQUEST_TYPE_OPTIONS[requestTypeIndex]?.key || 'all';

            const overridePayload: ApprovalOverride = {
                id: editingOverride?.id || `override-${Date.now()}`,
                departmentId,
                targetType: isEmp ? 'employee' : 'position',
                targetId,
                targetName,
                targetAvatar,
                requestType: selectedReqType,
                chain,
                updatedAt: new Date().toISOString(),
                createdAt: editingOverride?.createdAt || new Date().toISOString(),
            };

            if (onSaveOverride) {
                onSaveOverride(overridePayload);
            }
            onClose();
        }
    };

    // Delete
    const handleDelete = () => {
        if (!editingOverride || !onDeleteOverride) return;
        Alert.alert(
            'Delete Override',
            `Are you sure you want to delete the approval override for "${editingOverride.targetName}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                        onDeleteOverride(editingOverride.id);
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
                presentationDetents={[0.88, 0.96]}
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

                        {/* Title: Pure Department Name */}
                        <SwiftUIText size={17} weight="bold" color={textColor}>
                            {mode === 'department_default'
                                ? (departmentName || 'Department')
                                : (editingOverride ? `${departmentName} Override` : `New Override`)}
                        </SwiftUIText>

                        <Spacer />

                        {/* Save Button */}
                        <Button variant="plain" onPress={handleSave}>
                            <SwiftUIText size={16} weight="bold" color="#007AFF">
                                Save
                            </SwiftUIText>
                        </Button>
                    </HStack>

                    {/* Form Controls */}
                    <Form modifiers={[background('clear'), frame({ maxWidth: 9999, maxHeight: 9999 })]}>
                        {/* 1. Override Scope Section (Only in Override Mode) */}
                        {mode === 'override' && (
                            <Section title="Override Scope & Target">
                                <Picker
                                    label="Override Type"
                                    options={['Position Override', 'Specific Employee']}
                                    selectedIndex={overrideTypeIndex}
                                    onOptionSelected={({ nativeEvent: { index } }) => {
                                        setOverrideTypeIndex(index);
                                    }}
                                    variant="segmented"
                                    modifiers={segmentedControlModifiers}
                                />

                                {overrideTypeIndex === 0 ? (
                                    <Picker
                                        label="Department Position"
                                        options={
                                            deptPositions.length > 0
                                                ? deptPositions.map((p: any) => p.name || 'Position')
                                                : ['No positions in this department']
                                        }
                                        selectedIndex={selectedPositionIndex}
                                        onOptionSelected={({ nativeEvent: { index } }) => {
                                            setSelectedPositionIndex(index);
                                        }}
                                        variant="menu"
                                        color={nativeControlTextColor}
                                        modifiers={menuControlModifiers}
                                    />
                                ) : (
                                    <Picker
                                        label="Department Employee"
                                        options={
                                            deptMembers.length > 0
                                                ? deptMembers.map((m: any) => m.full_name || m.name || 'Employee')
                                                : ['No employees in this department']
                                        }
                                        selectedIndex={selectedMemberIndex}
                                        onOptionSelected={({ nativeEvent: { index } }) => {
                                            setSelectedMemberIndex(index);
                                        }}
                                        variant="menu"
                                        color={nativeControlTextColor}
                                        modifiers={menuControlModifiers}
                                    />
                                )}

                                <Picker
                                    label="Request Type"
                                    options={REQUEST_TYPE_OPTIONS.map((r) => r.label)}
                                    selectedIndex={requestTypeIndex}
                                    onOptionSelected={({ nativeEvent: { index } }) => {
                                        setRequestTypeIndex(index);
                                    }}
                                    variant="menu"
                                    color={nativeControlTextColor}
                                    modifiers={menuControlModifiers}
                                />
                            </Section>
                        )}

                        {/* 2. Department Flow Information (Only in Department Mode) */}
                        {mode === 'department_default' && (
                            <Section title="Scope">
                                <HStack spacing={8} modifiers={[padding({ top: 4, bottom: 4 })]}>
                                    <SwiftUIText size={14} color={textColor}>
                                        Department
                                    </SwiftUIText>
                                    <Spacer />
                                    <SwiftUIText size={14} weight="semibold" color={textColor}>
                                        {departmentName || 'Department'}
                                    </SwiftUIText>
                                </HStack>

                                <HStack spacing={8} modifiers={[padding({ top: 4, bottom: 4 })]}>
                                    <SwiftUIText size={14} color={textColor}>
                                        Request Scope
                                    </SwiftUIText>
                                    <Spacer />
                                    <SwiftUIText size={14} color={subtextColor}>
                                        All Requests (Default)
                                    </SwiftUIText>
                                </HStack>
                            </Section>
                        )}

                        {/* 3. Approval Chain Levels */}
                        <Section
                            title={
                                chain.length === 0
                                    ? 'Approval Chain (Not yet setup)'
                                    : `Approval Chain (${chain.length} Level${chain.length > 1 ? 's' : ''})`
                            }
                        >
                            {chain.length === 0 ? (
                                <HStack modifiers={[padding({ vertical: 8 })]}>
                                    <SwiftUIText size={13} color={subtextColor}>
                                        No levels configured. Tap below to add Level 1.
                                    </SwiftUIText>
                                </HStack>
                            ) : (
                                chain.map((step, idx) => {
                                    const currentPosIdx = findPositionIndex(step);
                                    const selectedPos = deptPositions[currentPosIdx];
                                    const holders = selectedPos ? getHoldersForPosition(selectedPos.id, selectedPos.name) : [];
                                    const currentHolderIdx = findHolderIndex(holders, step);
                                    const isFirst = idx === 0;
                                    const isLast = idx === chain.length - 1;

                                    return (
                                        <VStack
                                            key={step.id || `lvl-${idx}`}
                                            spacing={8}
                                            modifiers={[padding({ top: 4, bottom: 8 })]}
                                        >
                                            {/* Primary Position Picker */}
                                            <Picker
                                                label={`Level ${idx + 1}`}
                                                options={
                                                    deptPositions.length > 0
                                                        ? deptPositions.map((p: any) => p.name || 'Position')
                                                        : ['No department positions']
                                                }
                                                selectedIndex={currentPosIdx}
                                                onOptionSelected={({ nativeEvent: { index } }) => {
                                                    handlePositionChange(idx, index);
                                                }}
                                                variant="menu"
                                                color={nativeControlTextColor}
                                                modifiers={menuControlModifiers}
                                            />

                                            {/* Secondary Picker: If 2 or more people hold this position, specify the person! */}
                                            {holders.length >= 2 && (
                                                <Picker
                                                    label="Specify Person"
                                                    options={holders.map((h: any) => h.full_name || h.name || 'Employee')}
                                                    selectedIndex={currentHolderIdx}
                                                    onOptionSelected={({ nativeEvent: { index } }) => {
                                                        handleHolderChange(idx, index, holders);
                                                    }}
                                                    variant="menu"
                                                    color={nativeControlTextColor}
                                                    modifiers={menuControlModifiers}
                                                />
                                            )}

                                            {/* Level Footer Row: Approver Preview + Action Icons */}
                                            <HStack
                                                spacing={12}
                                                alignment="center"
                                                modifiers={[padding({ leading: 4, trailing: 4 })]}
                                            >
                                                <SwiftUIText size={12} weight="medium" color={subtextColor}>
                                                    {`Approver: ${step.label}`}
                                                </SwiftUIText>

                                                <Spacer />

                                                {/* Up Arrow Icon Button */}
                                                {!isFirst && (
                                                    <Button
                                                        variant="plain"
                                                        systemImage="chevron.up"
                                                        color={textColor}
                                                        onPress={() => handleMoveLevel(idx, 'up')}
                                                    />
                                                )}

                                                {/* Down Arrow Icon Button */}
                                                {!isLast && (
                                                    <Button
                                                        variant="plain"
                                                        systemImage="chevron.down"
                                                        color={textColor}
                                                        onPress={() => handleMoveLevel(idx, 'down')}
                                                    />
                                                )}

                                                {/* Red Minus Circle Icon Button */}
                                                <Button
                                                    variant="plain"
                                                    systemImage="minus.circle.fill"
                                                    onPress={() => handleRemoveLevel(idx)}
                                                    modifiers={[
                                                        foregroundColor('#FF3B30'),
                                                        tint('#FF3B30'),
                                                    ]}
                                                />
                                            </HStack>
                                        </VStack>
                                    );
                                })
                            )}

                            {/* + Add Approval Level Button */}
                            <Button variant="plain" onPress={handleAddLevel}>
                                <HStack spacing={6} alignment="center">
                                    <SwiftUIText size={15} weight="semibold" color="#007AFF">
                                        + Add Approval Level
                                    </SwiftUIText>
                                </HStack>
                            </Button>
                        </Section>

                        {/* 4. Delete Override Section */}
                        {mode === 'override' && editingOverride && (
                            <Section>
                                <Button
                                    variant="plain"
                                    systemImage="trash.fill"
                                    onPress={handleDelete}
                                    modifiers={[
                                        foregroundColor('#FF3B30'),
                                        tint('#FF3B30'),
                                    ]}
                                >
                                    <SwiftUIText size={15} weight="semibold" color="#FF3B30">
                                        Delete This Override
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
