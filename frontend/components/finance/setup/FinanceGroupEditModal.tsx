import React, { useState, useEffect } from 'react';
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
import * as Haptics from 'expo-haptics';
import {
    OrganizationDepartmentItem,
    ORGANIZATION_DEPARTMENTS_MASTER,
    FinanceDepartmentApprovalGroup,
    formatDepartmentCode,
} from '@/lib/api/financeSetup';
import { confirmDestructiveAction } from '@/lib/alertUtils';

export interface FinanceGroupEditModalProps {
    visible: boolean;
    onClose: () => void;
    group?: FinanceDepartmentApprovalGroup | null;
    allGroups: FinanceDepartmentApprovalGroup[];
    allDepartments?: OrganizationDepartmentItem[];
    onSave: (assignedDeptIds: string[]) => void;
    onDelete?: () => void;
}

export const FinanceGroupEditModal: React.FC<FinanceGroupEditModalProps> = (props) => {
    if (Platform.OS === 'ios') {
        const Comp = require('./FinanceGroupEditModal.ios').FinanceGroupEditModal || require('./FinanceGroupEditModal.ios').default;
        return <Comp {...props} />;
    }

    const {
        visible,
        onClose,
        group,
        allGroups = [],
        allDepartments = [],
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

    const [selectedDeptIds, setSelectedDeptIds] = useState<string[]>([]);
    const deptsSource = allDepartments && allDepartments.length > 0 ? allDepartments : ORGANIZATION_DEPARTMENTS_MASTER;

    // Determine which departments are claimed by OTHER groups
    const otherClaimedDeptIds = new Set<string>();
    allGroups.forEach((g) => {
        if (g.id !== group?.id && !g.isRemainingDepartments) {
            (g.departmentIds || []).forEach((id) => otherClaimedDeptIds.add(id));
        }
    });

    useEffect(() => {
        if (visible) {
            if (group) {
                setSelectedDeptIds(group.departmentIds || []);
            } else {
                const firstAvailable = deptsSource.find((d) => !otherClaimedDeptIds.has(d.id));
                if (firstAvailable) {
                    setSelectedDeptIds([firstAvailable.id]);
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
            Alert.alert('Selection Required', 'Please select at least one department for this approval group.');
            return;
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onSave(selectedDeptIds);
        onClose();
    };

    const isRemaining = !!group?.isRemainingDepartments;

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
                            {isRemaining ? 'Remaining Departments' : group ? 'Edit Departments' : 'New Approval Group'}
                        </Text>
                        <TouchableOpacity onPress={handleSave} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <Text style={[s.headerBtnText, { color: '#007AFF', fontWeight: '700' }]}>Save</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={s.bodyScroll} contentContainerStyle={s.bodyContent} showsVerticalScrollIndicator={false}>
                        <Text style={[s.explanationText, { color: subtextColor }]}>
                            Select departments to assign to this group. Any unselected departments will automatically belong to "Remaining Departments".
                        </Text>

                        <View style={[s.deptListWrapper, { borderColor: borderCol }]}>
                            {deptsSource.map((dept, idx) => {
                                const isClaimedElsewhere = otherClaimedDeptIds.has(dept.id);
                                const isSelected = selectedDeptIds.includes(dept.id);
                                const isLast = idx === deptsSource.length - 1;

                                return (
                                    <TouchableOpacity
                                        key={dept.id}
                                        disabled={isClaimedElsewhere}
                                        onPress={() => handleToggleDept(dept.id)}
                                        style={[
                                            s.deptRow,
                                            {
                                                backgroundColor: isSelected ? (isDark ? 'rgba(0,122,255,0.12)' : 'rgba(0,122,255,0.06)') : itemBg,
                                                opacity: isClaimedElsewhere ? 0.4 : 1,
                                                borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
                                                borderBottomColor: borderCol,
                                            },
                                        ]}
                                    >
                                        <View style={{ flex: 1 }}>
                                            <Text style={[s.deptName, { color: isSelected ? '#007AFF' : textColor, fontWeight: isSelected ? '600' : '500' }]}>
                                                {dept.name}
                                            </Text>
                                            <Text style={[s.deptCode, { color: subtextColor }]}>
                                                Code: {formatDepartmentCode(dept.code, dept.name)}
                                                {isClaimedElsewhere ? ' · (Assigned to another group)' : ''}
                                            </Text>
                                        </View>

                                        <View
                                            style={[
                                                s.checkbox,
                                                {
                                                    borderColor: isSelected ? '#007AFF' : borderCol,
                                                    backgroundColor: isSelected ? '#007AFF' : 'transparent',
                                                },
                                            ]}
                                        >
                                            {isSelected && <PlatformIcon name="checkmark" size={12} tintColor="#FFFFFF" />}
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Delete Group Button if editing an explicit group */}
                        {group && !isRemaining && onDelete && (
                            <TouchableOpacity
                                style={[s.deleteBtn, { borderColor: 'rgba(255,59,48,0.2)' }]}
                                onPress={() => {
                                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                                    confirmDestructiveAction({
                                        title: 'Delete Approval Group',
                                        message: 'Are you sure you want to delete this approval group? Its departments will be returned to Remaining Departments.',
                                        confirmLabel: 'Delete',
                                        onConfirm: () => {
                                            onDelete();
                                            onClose();
                                        },
                                    });
                                }}
                            >
                                <PlatformIcon name="trash" size={16} tintColor="#FF3B30" />
                                <Text style={s.deleteBtnText}>Delete Approval Group</Text>
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
        maxWidth: 480,
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
    explanationText: {
        fontSize: 13,
        lineHeight: 18,
        marginBottom: 14,
    },
    deptListWrapper: {
        borderRadius: 12,
        borderWidth: 1,
        overflow: 'hidden',
    },
    deptRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 14,
    },
    deptName: {
        fontSize: 15,
    },
    deptCode: {
        fontSize: 12,
        marginTop: 2,
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 12,
    },
    deleteBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 24,
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

export default FinanceGroupEditModal;
