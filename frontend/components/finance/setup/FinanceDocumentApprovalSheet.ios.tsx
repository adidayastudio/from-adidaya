import React, { useState, useEffect, useRef } from 'react';
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
} from '@expo/ui/swift-ui/modifiers';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import {
    FinanceDocumentApprovalConfig,
    FinanceApproverLevel,
    FinanceDepartmentApprovalGroup,
    ORGANIZATION_DEPARTMENTS_MASTER,
    ORGANIZATION_POSITIONS_MASTER,
    getRemainingDepartmentIds,
    getDepartmentGroupTitle,
} from '@/lib/api/financeSetup';

export interface FinanceDocumentApprovalSheetProps {
    visible: boolean;
    onClose: () => void;
    documentKey: string;
    documentName: string;
    documentCode?: string;
    config?: FinanceDocumentApprovalConfig;
    onSave: (saved: FinanceDocumentApprovalConfig) => void;
}

const SCOPE_OPTIONS = ['Global', 'Per Department'];

export function FinanceDocumentApprovalSheet({
    visible,
    onClose,
    documentKey,
    documentName,
    config,
    onSave,
}: FinanceDocumentApprovalSheetProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';
    const menuControlModifiers = [tint(isDark ? '#FFFFFF' : '#1C1C1E')];

    // State
    const [scopeIndex, setScopeIndex] = useState(0); // 0 = Global, 1 = Per Department
    const [globalChain, setGlobalChain] = useState<FinanceApproverLevel[]>([]);
    const [departmentGroups, setDepartmentGroups] = useState<FinanceDepartmentApprovalGroup[]>([]);

    const wasVisibleRef = useRef(false);

    useEffect(() => {
        if (visible && !wasVisibleRef.current) {
            if (config) {
                setScopeIndex(config.scope === 'department' ? 1 : 0);
                setGlobalChain(
                    config.globalChain && config.globalChain.length > 0
                        ? config.globalChain.map((l, idx) => ({ ...l, level: idx + 1 }))
                        : [
                              {
                                  id: `lvl_${Date.now()}_1`,
                                  level: 1,
                                  positionTitle: ORGANIZATION_POSITIONS_MASTER[0].title,
                                  personName: ORGANIZATION_POSITIONS_MASTER[0].defaultPersonName,
                              },
                          ]
                );
                setDepartmentGroups(
                    config.departmentGroups && config.departmentGroups.length > 0
                        ? config.departmentGroups
                        : [
                              {
                                  id: `grp_rem_${Date.now()}`,
                                  isRemainingDepartments: true,
                                  departmentIds: [],
                                  chain: (config.globalChain || []).map((l, idx) => ({ ...l, level: idx + 1 })),
                              },
                          ]
                );
            } else {
                setScopeIndex(0);
                setGlobalChain([
                    {
                        id: `lvl_${Date.now()}_1`,
                        level: 1,
                        positionTitle: ORGANIZATION_POSITIONS_MASTER[0].title,
                        personName: ORGANIZATION_POSITIONS_MASTER[0].defaultPersonName,
                    },
                ]);
                setDepartmentGroups([
                    {
                        id: `grp_rem_${Date.now()}`,
                        isRemainingDepartments: true,
                        departmentIds: [],
                        chain: [
                            {
                                id: `lvl_${Date.now()}_1`,
                                level: 1,
                                positionTitle: ORGANIZATION_POSITIONS_MASTER[0].title,
                                personName: ORGANIZATION_POSITIONS_MASTER[0].defaultPersonName,
                            },
                        ],
                    },
                ]);
            }
        }
        wasVisibleRef.current = visible;
    }, [visible, config]);

    // Handle changing Scope
    const handleScopeChange = (index: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setScopeIndex(index);
        if (index === 1 && (!departmentGroups || departmentGroups.length === 0)) {
            setDepartmentGroups([
                {
                    id: `grp_rem_${Date.now()}`,
                    isRemainingDepartments: true,
                    departmentIds: [],
                    chain: globalChain.map((l, idx) => ({ ...l, level: idx + 1 })),
                },
            ]);
        }
    };

    // Global Chain Level Handlers
    const handleAddGlobalLevel = () => {
        if (globalChain.length >= 6) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert('Maximum Levels', 'An approval chain cannot exceed 6 levels.');
            return;
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const nextPos = ORGANIZATION_POSITIONS_MASTER[
            Math.min(globalChain.length, ORGANIZATION_POSITIONS_MASTER.length - 1)
        ] || ORGANIZATION_POSITIONS_MASTER[0];

        setGlobalChain([
            ...globalChain,
            {
                id: `lvl_${Date.now()}_${globalChain.length + 1}`,
                level: globalChain.length + 1,
                positionTitle: nextPos.title,
                personName: nextPos.defaultPersonName,
            },
        ]);
    };

    const handleRemoveGlobalLevel = (index: number) => {
        if (globalChain.length <= 1) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert('Required Level', 'An approval chain must have at least 1 level.');
            return;
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setGlobalChain(
            globalChain
                .filter((_, idx) => idx !== index)
                .map((l, idx) => ({ ...l, level: idx + 1 }))
        );
    };

    const handleGlobalPositionChange = (levelIndex: number, posIndex: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const pos = ORGANIZATION_POSITIONS_MASTER[posIndex];
        if (!pos) return;

        setGlobalChain(
            globalChain.map((l, idx) => {
                if (idx === levelIndex) {
                    return {
                        ...l,
                        positionTitle: pos.title,
                        personName: pos.defaultPersonName || l.personName,
                    };
                }
                return l;
            })
        );
    };

    const handleGlobalPersonChange = (levelIndex: number, personName: string) => {
        setGlobalChain(
            globalChain.map((l, idx) =>
                idx === levelIndex ? { ...l, personName } : l
            )
        );
    };

    // Department Group Level Handlers
    const handleAddGroupLevel = (groupId: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setDepartmentGroups(
            departmentGroups.map((g) => {
                if (g.id === groupId) {
                    if (g.chain.length >= 6) return g;
                    const nextPos = ORGANIZATION_POSITIONS_MASTER[
                        Math.min(g.chain.length, ORGANIZATION_POSITIONS_MASTER.length - 1)
                    ] || ORGANIZATION_POSITIONS_MASTER[0];

                    return {
                        ...g,
                        chain: [
                            ...g.chain,
                            {
                                id: `lvl_${Date.now()}_${g.chain.length + 1}`,
                                level: g.chain.length + 1,
                                positionTitle: nextPos.title,
                                personName: nextPos.defaultPersonName,
                            },
                        ],
                    };
                }
                return g;
            })
        );
    };

    const handleRemoveGroupLevel = (groupId: string, levelIndex: number) => {
        setDepartmentGroups(
            departmentGroups.map((g) => {
                if (g.id === groupId) {
                    if (g.chain.length <= 1) return g;
                    return {
                        ...g,
                        chain: g.chain
                            .filter((_, idx) => idx !== levelIndex)
                            .map((l, idx) => ({ ...l, level: idx + 1 })),
                    };
                }
                return g;
            })
        );
    };

    const handleGroupPositionChange = (groupId: string, levelIndex: number, posIndex: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const pos = ORGANIZATION_POSITIONS_MASTER[posIndex];
        if (!pos) return;

        setDepartmentGroups(
            departmentGroups.map((g) => {
                if (g.id === groupId) {
                    return {
                        ...g,
                        chain: g.chain.map((l, idx) => {
                            if (idx === levelIndex) {
                                return {
                                    ...l,
                                    positionTitle: pos.title,
                                    personName: pos.defaultPersonName || l.personName,
                                };
                            }
                            return l;
                        }),
                    };
                }
                return g;
            })
        );
    };

    const handleGroupPersonChange = (groupId: string, levelIndex: number, personName: string) => {
        setDepartmentGroups(
            departmentGroups.map((g) => {
                if (g.id === groupId) {
                    return {
                        ...g,
                        chain: g.chain.map((l, idx) =>
                            idx === levelIndex ? { ...l, personName } : l
                        ),
                    };
                }
                return g;
            })
        );
    };

    // Toggle Department assignment in a group
    const handleToggleDeptInGroup = (groupId: string, deptId: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const updated = departmentGroups.map((g) => {
            if (g.id === groupId) {
                const isAssigned = g.departmentIds.includes(deptId);
                const newDeptIds = isAssigned
                    ? g.departmentIds.filter((id) => id !== deptId)
                    : [...g.departmentIds, deptId];
                return { ...g, departmentIds: newDeptIds };
            }
            return g;
        });

        // Ensure Remaining Departments exists if some departments are unassigned
        const explicitGroups = updated.filter((g) => !g.isRemainingDepartments);
        const remainingIds = getRemainingDepartmentIds(explicitGroups, ORGANIZATION_DEPARTMENTS_MASTER);

        let finalGroups = [...explicitGroups];
        if (remainingIds.length > 0) {
            const existingRemaining = updated.find((g) => g.isRemainingDepartments);
            finalGroups.push({
                id: existingRemaining?.id || `grp_rem_${Date.now()}`,
                isRemainingDepartments: true,
                departmentIds: [],
                chain: existingRemaining?.chain || globalChain.map((l, idx) => ({ ...l, level: idx + 1 })),
            });
        }
        setDepartmentGroups(finalGroups);
    };

    // Add New Explicit Department Group
    const handleAddDepartmentGroup = () => {
        const remainingIds = getRemainingDepartmentIds(departmentGroups, ORGANIZATION_DEPARTMENTS_MASTER);
        if (remainingIds.length === 0) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert(
                'All Departments Assigned',
                'Every department is already assigned to an explicit approval group.'
            );
            return;
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const firstAvailableId = remainingIds[0];
        const newGroup: FinanceDepartmentApprovalGroup = {
            id: `grp_${Date.now()}`,
            departmentIds: [firstAvailableId],
            chain: globalChain.map((l, idx) => ({ ...l, level: idx + 1 })),
        };

        const existingExplicit = departmentGroups.filter((g) => !g.isRemainingDepartments);
        const updatedExplicit = [...existingExplicit, newGroup];

        const stillRemaining = getRemainingDepartmentIds(updatedExplicit, ORGANIZATION_DEPARTMENTS_MASTER);
        let finalGroups = [...updatedExplicit];

        if (stillRemaining.length > 0) {
            const existingRem = departmentGroups.find((g) => g.isRemainingDepartments);
            finalGroups.push({
                id: existingRem?.id || `grp_rem_${Date.now()}`,
                isRemainingDepartments: true,
                departmentIds: [],
                chain: existingRem?.chain || globalChain.map((l, idx) => ({ ...l, level: idx + 1 })),
            });
        }

        setDepartmentGroups(finalGroups);
    };

    // Delete Department Group
    const handleDeleteGroup = (groupId: string) => {
        const groupToDelete = departmentGroups.find((g) => g.id === groupId);
        if (!groupToDelete || groupToDelete.isRemainingDepartments) return;

        Alert.alert(
            'Remove Approval Group',
            `Remove approval group "${getDepartmentGroupTitle(groupToDelete, ORGANIZATION_DEPARTMENTS_MASTER)}"? The assigned departments will automatically return to Remaining Departments.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: () => {
                        const updated = departmentGroups.filter((g) => g.id !== groupId);
                        const hasRemaining = updated.some((g) => g.isRemainingDepartments);
                        if (!hasRemaining) {
                            updated.push({
                                id: `grp_rem_${Date.now()}`,
                                isRemainingDepartments: true,
                                departmentIds: [],
                                chain: globalChain.map((l, idx) => ({ ...l, level: idx + 1 })),
                            });
                        }
                        setDepartmentGroups(updated);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    },
                },
            ]
        );
    };

    // Save Handlers
    const handleSave = () => {
        const isGlobal = scopeIndex === 0;

        if (isGlobal && globalChain.length === 0) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert('Required Level', 'Please configure at least 1 approval level.');
            return;
        }

        // Clean groups for Per Department
        let cleanedGroups = departmentGroups;
        if (!isGlobal) {
            const explicitGroups = departmentGroups.filter((g) => !g.isRemainingDepartments);
            const remainingDeptIds = getRemainingDepartmentIds(explicitGroups, ORGANIZATION_DEPARTMENTS_MASTER);

            cleanedGroups = explicitGroups.filter((g) => g.departmentIds.length > 0);
            if (remainingDeptIds.length > 0) {
                const remGroup = departmentGroups.find((g) => g.isRemainingDepartments) || {
                    id: `grp_rem_${Date.now()}`,
                    isRemainingDepartments: true,
                    departmentIds: [],
                    chain: globalChain.map((l, idx) => ({ ...l, level: idx + 1 })),
                };
                cleanedGroups.push(remGroup);
            }
        }

        const updatedConfig: FinanceDocumentApprovalConfig = {
            documentKey,
            scope: isGlobal ? 'global' : 'department',
            globalChain,
            departmentGroups: cleanedGroups,
        };

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onSave(updatedConfig);
        onClose();
    };

    const positionTitles = ORGANIZATION_POSITIONS_MASTER.map((p) => p.title);

    return (
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet
                isOpened={visible}
                presentationDetents={[0.9, 0.97]}
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
                            {documentName}
                        </SwiftUIText>

                        <Spacer />

                        <Button
                            variant="plain"
                            onPress={handleSave}
                        >
                            <SwiftUIText size={16} weight="semibold" color="#007AFF">
                                Save
                            </SwiftUIText>
                        </Button>
                    </HStack>

                    {/* Form Body */}
                    <Form modifiers={[background('clear'), frame({ maxWidth: 9999, maxHeight: 9999 })]}>
                        {/* Section 1: Approval Scope Selector */}
                        <Section title="Approval Scope">
                            <Picker
                                label="Scope Mode"
                                variant="menu"
                                options={SCOPE_OPTIONS}
                                selectedIndex={scopeIndex}
                                onOptionSelected={({ nativeEvent: { index } }) => {
                                    handleScopeChange(index);
                                }}
                                modifiers={menuControlModifiers}
                            />
                        </Section>

                        {/* Mode A: Global Approval Chain */}
                        {scopeIndex === 0 && (
                            <Section
                                title={`Global Approval Chain (${globalChain.length} ${globalChain.length === 1 ? 'Level' : 'Levels'})`}
                            >
                                {globalChain.map((level, idx) => {
                                    const posIdx = ORGANIZATION_POSITIONS_MASTER.findIndex(
                                        (p) => p.title === level.positionTitle
                                    );
                                    const selectedPosIdx = posIdx >= 0 ? posIdx : 0;

                                    return (
                                        <VStack
                                            key={level.id || idx}
                                            alignment="leading"
                                            spacing={4}
                                            modifiers={[padding({ vertical: 6 })]}
                                        >
                                            <HStack alignment="center" spacing={8}>
                                                <SwiftUIText size={14} weight="bold" color="#007AFF">
                                                    {`Level ${level.level}`}
                                                </SwiftUIText>

                                                <Spacer />

                                                {globalChain.length > 1 && (
                                                    <Button
                                                        variant="plain"
                                                        onPress={() => handleRemoveGlobalLevel(idx)}
                                                    >
                                                        <SwiftUIText size={13} color="#FF3B30">
                                                            Remove
                                                        </SwiftUIText>
                                                    </Button>
                                                )}
                                            </HStack>

                                            <Picker
                                                label="Position"
                                                variant="menu"
                                                options={positionTitles}
                                                selectedIndex={selectedPosIdx}
                                                onOptionSelected={({ nativeEvent: { index } }) => {
                                                    handleGlobalPositionChange(idx, index);
                                                }}
                                                modifiers={menuControlModifiers}
                                            />

                                            <VStack alignment="leading" spacing={2} modifiers={[padding({ top: 2 })]}>
                                                <SwiftUIText size={12} color={subtextColor}>
                                                    Assigned Person
                                                </SwiftUIText>
                                                <TextField
                                                    placeholder="Person Name (e.g. Adi Nugraha)"
                                                    defaultValue={level.personName}
                                                    onChangeText={(val: string) => handleGlobalPersonChange(idx, val)}
                                                    modifiers={[frame({ maxWidth: 9999 }), tint('#007AFF')]}
                                                />
                                            </VStack>
                                        </VStack>
                                    );
                                })}

                                <Button
                                    variant="plain"
                                    onPress={handleAddGlobalLevel}
                                >
                                    <SwiftUIText size={15} weight="semibold" color="#007AFF">
                                        + Add Level
                                    </SwiftUIText>
                                </Button>
                            </Section>
                        )}

                        {/* Mode B: Per Department Approval Groups */}
                        {scopeIndex === 1 && (
                            <>
                                {departmentGroups.map((group) => {
                                    const groupTitle = getDepartmentGroupTitle(group, ORGANIZATION_DEPARTMENTS_MASTER);
                                    const explicitOtherAssignedIds = new Set<string>();
                                    departmentGroups.forEach((g) => {
                                        if (g.id !== group.id && !g.isRemainingDepartments) {
                                            g.departmentIds.forEach((id) => explicitOtherAssignedIds.add(id));
                                        }
                                    });

                                    const availableDeptsForThisGroup = ORGANIZATION_DEPARTMENTS_MASTER.filter(
                                        (d) => !explicitOtherAssignedIds.has(d.id)
                                    );

                                    return (
                                        <Section
                                            key={group.id}
                                            title={groupTitle}
                                        >
                                            {group.isRemainingDepartments ? (
                                                <VStack alignment="leading" spacing={2} modifiers={[padding({ vertical: 2 })]}>
                                                    <SwiftUIText size={12} color={subtextColor}>
                                                        Applies to departments without a specific approval group.
                                                    </SwiftUIText>
                                                </VStack>
                                            ) : (
                                                <VStack alignment="leading" spacing={6} modifiers={[padding({ vertical: 4 })]}>
                                                    <SwiftUIText size={12} weight="medium" color={subtextColor}>
                                                        {`Assigned Departments (${group.departmentIds.length})`}
                                                    </SwiftUIText>
                                                    <VStack alignment="leading" spacing={4}>
                                                        {availableDeptsForThisGroup.map((dept) => {
                                                            const isChecked = group.departmentIds.includes(dept.id);
                                                            return (
                                                                <Button
                                                                    key={dept.id}
                                                                    variant="plain"
                                                                    onPress={() => handleToggleDeptInGroup(group.id, dept.id)}
                                                                >
                                                                    <HStack alignment="center" spacing={8}>
                                                                        <SwiftUIText size={14} color={isChecked ? '#007AFF' : subtextColor}>
                                                                            {isChecked ? '✓' : '○'}
                                                                        </SwiftUIText>
                                                                        <SwiftUIText size={14} color={isChecked ? textColor : subtextColor}>
                                                                            {dept.name}
                                                                        </SwiftUIText>
                                                                    </HStack>
                                                                </Button>
                                                            );
                                                        })}
                                                    </VStack>
                                                </VStack>
                                            )}

                                            {/* Chain Levels for this Group */}
                                            {group.chain.map((level, idx) => {
                                                const posIdx = ORGANIZATION_POSITIONS_MASTER.findIndex(
                                                    (p) => p.title === level.positionTitle
                                                );
                                                const selectedPosIdx = posIdx >= 0 ? posIdx : 0;

                                                return (
                                                    <VStack
                                                        key={level.id || idx}
                                                        alignment="leading"
                                                        spacing={4}
                                                        modifiers={[padding({ vertical: 4 })]}
                                                    >
                                                        <HStack alignment="center" spacing={8}>
                                                            <SwiftUIText size={13} weight="bold" color="#007AFF">
                                                                {`Level ${level.level}`}
                                                            </SwiftUIText>
                                                            <Spacer />
                                                            {group.chain.length > 1 && (
                                                                <Button
                                                                    variant="plain"
                                                                    onPress={() => handleRemoveGroupLevel(group.id, idx)}
                                                                >
                                                                    <SwiftUIText size={13} color="#FF3B30">
                                                                        Remove
                                                                    </SwiftUIText>
                                                                </Button>
                                                            )}
                                                        </HStack>

                                                        <Picker
                                                            label="Position"
                                                            variant="menu"
                                                            options={positionTitles}
                                                            selectedIndex={selectedPosIdx}
                                                            onOptionSelected={({ nativeEvent: { index } }) => {
                                                                handleGroupPositionChange(group.id, idx, index);
                                                            }}
                                                            modifiers={menuControlModifiers}
                                                        />

                                                        <VStack alignment="leading" spacing={2} modifiers={[padding({ top: 2 })]}>
                                                            <SwiftUIText size={12} color={subtextColor}>
                                                                Assigned Person
                                                            </SwiftUIText>
                                                            <TextField
                                                                placeholder="Person Name"
                                                                defaultValue={level.personName}
                                                                onChangeText={(val: string) =>
                                                                    handleGroupPersonChange(group.id, idx, val)
                                                                }
                                                                modifiers={[frame({ maxWidth: 9999 }), tint('#007AFF')]}
                                                            />
                                                        </VStack>
                                                    </VStack>
                                                );
                                            })}

                                            <Button
                                                variant="plain"
                                                onPress={() => handleAddGroupLevel(group.id)}
                                            >
                                                <SwiftUIText size={14} weight="semibold" color="#007AFF">
                                                    + Add Level
                                                </SwiftUIText>
                                            </Button>

                                            {!group.isRemainingDepartments && (
                                                <Button
                                                    variant="plain"
                                                    onPress={() => handleDeleteGroup(group.id)}
                                                >
                                                    <SwiftUIText size={14} color="#FF3B30">
                                                        Delete Group
                                                    </SwiftUIText>
                                                </Button>
                                            )}
                                        </Section>
                                    );
                                })}

                                <Section>
                                    <Button
                                        variant="plain"
                                        onPress={handleAddDepartmentGroup}
                                    >
                                        <SwiftUIText size={15} weight="semibold" color="#007AFF">
                                            + Add Approval Group
                                        </SwiftUIText>
                                    </Button>
                                </Section>
                            </>
                        )}
                    </Form>
                </VStack>
            </BottomSheet>
        </Host>
    );
}

export const FinanceDocumentApprovalSheetIOS = FinanceDocumentApprovalSheet;
export default FinanceDocumentApprovalSheet;
