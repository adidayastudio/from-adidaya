import React, { useState, useEffect, useMemo } from 'react';
import {
    Platform,
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import ContextMenu, { ContextMenuAction } from '@/components/ui/PlatformContextMenu';
import * as Haptics from 'expo-haptics';
import {
    FinanceApproverLevel,
    ORGANIZATION_POSITIONS_MASTER,
    ORGANIZATION_EMPLOYEES_MASTER,
    OrganizationPositionItem,
    OrganizationEmployeeItem,
} from '@/lib/api/financeSetup';
import { confirmDestructiveAction } from '@/lib/alertUtils';

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

export const FinanceLevelEditModal: React.FC<FinanceLevelEditModalProps> = (props) => {
    if (Platform.OS === 'ios') {
        const Comp = require('./FinanceLevelEditModal.ios').FinanceLevelEditModal || require('./FinanceLevelEditModal.ios').default;
        return <Comp {...props} />;
    }

    const {
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
    } = props;

    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';
    const cardBg = isDark ? '#1C1C1E' : '#FFFFFF';
    const borderCol = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
    const itemBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';

    const allPositions = positions && positions.length > 0 ? positions : ORGANIZATION_POSITIONS_MASTER;
    const allEmployees = employees && employees.length > 0 ? employees : ORGANIZATION_EMPLOYEES_MASTER;

    const [selectedPosIndex, setSelectedPosIndex] = useState(0);
    const [selectedPersonIndex, setSelectedPersonIndex] = useState<number>(0);

    const alreadyAssignedNames = useMemo(() => {
        return new Set(
            existingChain
                .filter((l) => l.id !== level?.id && l.level !== levelNumber)
                .map((l) => l.personName)
                .filter((name) => name && name !== 'No person assigned')
        );
    }, [existingChain, level, levelNumber]);

    const selectedPosition = allPositions[selectedPosIndex] || allPositions[0];

    const matchingEmployees: OrganizationEmployeeItem[] = useMemo(() => {
        const list = allEmployees.filter(
            (e) => e.positionTitle.toLowerCase() === (selectedPosition?.title || '').toLowerCase()
        );
        return list.length > 0 ? list : allEmployees;
    }, [allEmployees, selectedPosition]);

    const isSinglePerson = matchingEmployees.length === 1;

    const positionActions: ContextMenuAction[] = useMemo(() => {
        return allPositions.map((pos, idx) => ({
            title: pos.title,
            state: idx === selectedPosIndex ? 'on' : 'off',
        }));
    }, [allPositions, selectedPosIndex]);

    const personActions: ContextMenuAction[] = useMemo(() => {
        const actions: ContextMenuAction[] = [];
        if (!isSinglePerson) {
            actions.push({
                title: '— Select Person —',
                state: selectedPersonIndex === 0 ? 'on' : 'off',
            });
        }
        matchingEmployees.forEach((emp, idx) => {
            const isAssigned = alreadyAssignedNames.has(emp.name);
            const isSelected = isSinglePerson
                ? selectedPersonIndex === idx
                : selectedPersonIndex === idx + 1;
            actions.push({
                title: `${emp.name} (${emp.departmentName || emp.positionTitle})${isAssigned ? ' · (Already in chain)' : ''}`,
                disabled: isAssigned,
                state: isSelected ? 'on' : 'off',
            });
        });
        return actions;
    }, [matchingEmployees, isSinglePerson, selectedPersonIndex, alreadyAssignedNames]);

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

                setSelectedPersonIndex(0);
            }
        }
    }, [visible, level, levelNumber, allPositions, allEmployees]);

    const handlePosChange = (index: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedPosIndex(index);
        setSelectedPersonIndex(0);
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

        if (alreadyAssignedNames.has(chosenEmployee.name)) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert(
                'Duplicate Approver',
                `${chosenEmployee.name} is already assigned to another level in this chain. Each approver can only appear once per chain.`
            );
            return;
        }

        const updatedLevel: FinanceApproverLevel = {
            id: level?.id || `lvl_${Date.now()}`,
            level: level?.level || levelNumber,
            positionId: pos.id,
            positionTitle: pos.title,
            userId: chosenEmployee.id,
            personName: chosenEmployee.name,
        };

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onSave(updatedLevel);
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={s.overlay}>
                <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    activeOpacity={1}
                    onPress={onClose}
                />
                <View style={[s.modalCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
                    {/* Header */}
                    <View style={[s.headerRow, { borderBottomColor: borderCol }]}>
                        <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <Text style={[s.headerBtnText, { color: subtextColor }]}>Cancel</Text>
                        </TouchableOpacity>
                        <Text style={[s.headerTitle, { color: textColor }]}>
                            {level ? `Edit Level ${level.level}` : `Add Level ${levelNumber}`}
                        </Text>
                        <TouchableOpacity onPress={handleSave} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <Text style={[s.headerBtnText, { color: '#159957', fontWeight: '700' }]}>Save</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={s.bodyScroll} contentContainerStyle={s.bodyContent} showsVerticalScrollIndicator={false}>
                        {/* Position Section */}
                        <Text style={[s.fieldLabel, { color: subtextColor }]}>POSITION / ROLE</Text>
                        <ContextMenu
                            actions={positionActions}
                            onPress={(e) => handlePosChange(e.nativeEvent.index)}
                            dropdownMenuMode
                        >
                            <View style={[s.pickerBtn, { backgroundColor: itemBg, borderColor: borderCol }]}>
                                <Text style={[s.pickerBtnText, { color: textColor }]}>
                                    {selectedPosition?.title || 'Select Position'}
                                </Text>
                                <PlatformIcon name="chevron.up.chevron.down" size={14} tintColor={subtextColor} />
                            </View>
                        </ContextMenu>

                        {/* Person Assigned Section */}
                        <Text style={[s.fieldLabel, { color: subtextColor, marginTop: 16 }]}>ASSIGNED PERSON</Text>
                        <ContextMenu
                            actions={personActions}
                            onPress={(e) => handlePersonChange(e.nativeEvent.index)}
                            dropdownMenuMode
                        >
                            <View style={[s.pickerBtn, { backgroundColor: itemBg, borderColor: borderCol }]}>
                                <Text
                                    style={[
                                        s.pickerBtnText,
                                        {
                                            color: !isSinglePerson && selectedPersonIndex === 0 ? subtextColor : textColor,
                                        },
                                    ]}
                                >
                                    {isSinglePerson
                                        ? `${matchingEmployees[0]?.name} (${matchingEmployees[0]?.departmentName || 'Staff'})`
                                        : selectedPersonIndex === 0
                                        ? '— Select Person —'
                                        : `${matchingEmployees[selectedPersonIndex - 1]?.name} (${matchingEmployees[selectedPersonIndex - 1]?.departmentName || ''})`}
                                </Text>
                                <PlatformIcon name="chevron.up.chevron.down" size={14} tintColor={subtextColor} />
                            </View>
                        </ContextMenu>

                        {/* Helper info */}
                        <Text style={[s.helperText, { color: subtextColor }]}>
                            {isSinglePerson
                                ? `Automatically assigned to ${matchingEmployees[0]?.name} (${matchingEmployees[0]?.departmentName || 'Staff'}).`
                                : `${matchingEmployees.length} people hold this position in the organization.`}
                        </Text>

                        {/* Delete Button */}
                        {level && onDelete && (
                            <TouchableOpacity
                                style={[s.deleteBtn, { borderColor: 'rgba(255,59,48,0.2)' }]}
                                onPress={() => {
                                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                                    confirmDestructiveAction({
                                        title: 'Remove Approval Level',
                                        message: `Are you sure you want to remove Level ${level.level} (${level.positionTitle})?`,
                                        confirmLabel: 'Remove',
                                        onConfirm: () => {
                                            onDelete();
                                            onClose();
                                        },
                                    });
                                }}
                            >
                                <PlatformIcon name="trash" size={16} tintColor="#FF3B30" />
                                <Text style={s.deleteBtnText}>Remove Level</Text>
                            </TouchableOpacity>
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const s = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    modalCard: {
        width: '100%',
        maxWidth: 460,
        maxHeight: '90%',
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
        elevation: 8,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    headerBtnText: {
        fontSize: 15,
    },
    bodyScroll: {
        flexGrow: 0,
    },
    bodyContent: {
        padding: 16,
    },
    fieldLabel: {
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    pickerBtn: {
        height: 44,
        borderRadius: 12,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
    },
    pickerBtnText: {
        fontSize: 15,
        fontWeight: '500',
    },
    helperText: {
        fontSize: 13,
        marginTop: 10,
        lineHeight: 18,
    },
    deleteBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 28,
        paddingVertical: 12,
        borderRadius: 10,
        borderWidth: 1,
        backgroundColor: 'rgba(255,59,48,0.06)',
    },
    deleteBtnText: {
        color: '#FF3B30',
        fontSize: 15,
        fontWeight: '600',
    },
});

export default FinanceLevelEditModal;
