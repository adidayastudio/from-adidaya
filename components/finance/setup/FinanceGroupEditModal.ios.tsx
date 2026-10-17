import React, { useState, useEffect } from 'react';
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
} from '@expo/ui/swift-ui';
import {
    padding,
    frame,
    background,
    ignoreSafeArea,
} from '@expo/ui/swift-ui/modifiers';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import {
    OrganizationDepartmentItem,
    ORGANIZATION_DEPARTMENTS_MASTER,
    FinanceDepartmentApprovalGroup,
    getDepartmentGroupTitle,
} from '@/lib/api/financeSetup';

export interface FinanceGroupEditModalProps {
    visible: boolean;
    onClose: () => void;
    group?: FinanceDepartmentApprovalGroup | null;
    allGroups: FinanceDepartmentApprovalGroup[];
    allDepartments?: OrganizationDepartmentItem[];
    onSave: (assignedDeptIds: string[]) => void;
    onDelete?: () => void;
}

export function FinanceGroupEditModal({
    visible,
    onClose,
    group,
    allGroups,
    allDepartments = [],
    onSave,
    onDelete,
}: FinanceGroupEditModalProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';

    const [selectedDeptIds, setSelectedDeptIds] = useState<string[]>([]);
    const deptsSource = allDepartments && allDepartments.length > 0 ? allDepartments : ORGANIZATION_DEPARTMENTS_MASTER;

    // Determine which departments are available for this group (i.e. not claimed by other explicit groups)
    const otherClaimedDeptIds = new Set<string>();
    allGroups.forEach((g) => {
        if (g.id !== group?.id && !g.isRemainingDepartments) {
            g.departmentIds.forEach((id) => otherClaimedDeptIds.add(id));
        }
    });

    const availableDepts = deptsSource.filter(
        (d) => !otherClaimedDeptIds.has(d.id)
    );

    useEffect(() => {
        if (visible) {
            if (group) {
                setSelectedDeptIds(group.departmentIds || []);
            } else {
                // If creating a new group, pick the first available department
                if (availableDepts.length > 0) {
                    setSelectedDeptIds([availableDepts[0].id]);
                } else {
                    setSelectedDeptIds([]);
                }
            }
        }
    }, [visible, group]);

    const handleToggleDept = (deptId: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (selectedDeptIds.includes(deptId)) {
            setSelectedDeptIds(selectedDeptIds.filter((id) => id !== deptId));
        } else {
            setSelectedDeptIds([...selectedDeptIds, deptId]);
        }
    };

    const handleSave = () => {
        if (selectedDeptIds.length === 0) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            return;
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onSave(selectedDeptIds);
        onClose();
    };

    const isRemaining = !!group?.isRemainingDepartments;

    return (
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet
                isOpened={visible}
                presentationDetents={[0.55, 0.75]}
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
                            {isRemaining ? 'Remaining Departments' : group ? 'Edit Departments' : 'New Approval Group'}
                        </SwiftUIText>

                        <Spacer />

                        <Button
                            variant="plain"
                            onPress={() => {
                                if (isRemaining) {
                                    onClose();
                                } else {
                                    handleSave();
                                }
                            }}
                        >
                            <SwiftUIText size={16} weight="semibold" color="#007AFF">
                                Done
                            </SwiftUIText>
                        </Button>
                    </HStack>

                    {/* Form Body */}
                    <Form modifiers={[background('clear'), frame({ maxWidth: 9999, maxHeight: 9999 })]}>
                        {isRemaining ? (
                            <Section title="Dynamic Group">
                                <VStack alignment="leading" spacing={4} modifiers={[padding({ vertical: 6 })]}>
                                    <SwiftUIText size={14} weight="medium" color={textColor}>
                                        Remaining Departments
                                    </SwiftUIText>
                                    <SwiftUIText size={13} color={subtextColor}>
                                        This group dynamically represents all departments without a specific approval group. Departments are assigned and removed automatically.
                                    </SwiftUIText>
                                </VStack>
                            </Section>
                        ) : (
                            <Section title={`Select Assigned Departments (${selectedDeptIds.length})`}>
                                {availableDepts.map((dept) => {
                                    const isChecked = selectedDeptIds.includes(dept.id);
                                    return (
                                        <Button
                                            key={dept.id}
                                            variant="plain"
                                            onPress={() => handleToggleDept(dept.id)}
                                        >
                                            <HStack alignment="center" spacing={10} modifiers={[padding({ vertical: 6 })]}>
                                                <SwiftUIText size={16} color={isChecked ? '#007AFF' : subtextColor}>
                                                    {isChecked ? '✓' : '○'}
                                                </SwiftUIText>
                                                <SwiftUIText size={15} color={isChecked ? textColor : subtextColor}>
                                                    {dept.name}
                                                </SwiftUIText>
                                                {dept.code ? (
                                                    <SwiftUIText size={13} color={subtextColor}>
                                                        {`(${dept.code})`}
                                                    </SwiftUIText>
                                                ) : null}
                                            </HStack>
                                        </Button>
                                    );
                                })}
                            </Section>
                        )}

                        {onDelete && !isRemaining && (
                            <Section>
                                <Button
                                    variant="plain"
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                        onDelete();
                                        onClose();
                                    }}
                                >
                                    <SwiftUIText size={15} color="#FF3B30">
                                        Remove Approval Group
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

export default FinanceGroupEditModal;
