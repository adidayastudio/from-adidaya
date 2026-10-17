import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import * as Haptics from 'expo-haptics';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { LEAVE_POLICY_PRESETS, LeavePolicy } from '@/lib/api/leavePolicies';

export type LeavePolicyPresetItem = typeof LEAVE_POLICY_PRESETS[number];

interface LeavePolicyPresetModalProps {
    visible: boolean;
    onClose: () => void;
    onApplyPreset: (preset: LeavePolicyPresetItem) => Promise<void>;
    onCustomizePreset?: (preset: LeavePolicyPresetItem) => void;
}

export const LeavePolicyPresetModal: React.FC<LeavePolicyPresetModalProps> = ({
    visible,
    onClose,
    onApplyPreset,
    onCustomizePreset,
}) => {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const [selectedPreset, setSelectedPreset] = useState<LeavePolicyPresetItem | null>(null);
    const [applying, setApplying] = useState(false);

    const textColor = isDark ? '#FFFFFF' : '#000000';
    const subtextColor = isDark ? '#8E8E93' : '#8E8E93';
    const modalBg = isDark ? 'rgba(30, 30, 32, 0.96)' : 'rgba(255, 255, 255, 0.96)';
    const borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';

    const handleSelectPreset = (preset: LeavePolicyPresetItem) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedPreset(preset);
    };

    const handleApply = async () => {
        if (!selectedPreset) return;
        try {
            setApplying(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await onApplyPreset(selectedPreset);
            setSelectedPreset(null);
            onClose();
        } catch (e: any) {
            Alert.alert('Failed', e.message || 'Could not apply leave policy preset');
        } finally {
            setApplying(false);
        }
    };

    const handleCustomize = () => {
        if (!selectedPreset) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const p = selectedPreset;
        setSelectedPreset(null);
        onClose();
        onCustomizePreset?.(p);
    };

    const handleClose = () => {
        if (applying) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedPreset(null);
        onClose();
    };

    const getLeaveTypeBadgeColor = (type: string) => {
        switch (type) {
            case 'annual': return { bg: 'rgba(0, 122, 255, 0.12)', text: '#007AFF', label: 'Annual' };
            case 'sick': return { bg: 'rgba(255, 59, 48, 0.12)', text: '#FF3B30', label: 'Sick' };
            case 'permission': return { bg: 'rgba(175, 82, 222, 0.12)', text: '#AF52DE', label: 'Permission' };
            case 'unpaid': return { bg: 'rgba(255, 149, 0, 0.12)', text: '#FF9500', label: 'Unpaid' };
            case 'maternity_paternity': return { bg: 'rgba(52, 199, 89, 0.12)', text: '#34C759', label: 'Maternity' };
            default: return { bg: 'rgba(142, 142, 147, 0.12)', text: '#8E8E93', label: 'Custom' };
        }
    };

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleClose}
        >
            <View style={s.overlay}>
                <TouchableOpacity
                    style={s.backdrop}
                    activeOpacity={1}
                    onPress={handleClose}
                />

                {/* DETAIL PREVIEW DIALOG */}
                {selectedPreset ? (
                    <View style={[s.dialogContainer, { backgroundColor: modalBg, borderColor }]}>
                        {/* Header */}
                        <View style={s.dialogHeader}>
                            <View style={s.dialogHeaderTop}>
                                {(() => {
                                    const badge = getLeaveTypeBadgeColor(selectedPreset.leave_type);
                                    return (
                                        <View style={[s.badgePill, { backgroundColor: badge.bg }]}>
                                            <Text style={[s.badgeText, { color: badge.text }]}>
                                                {badge.label}
                                            </Text>
                                        </View>
                                    );
                                })()}
                                <TouchableOpacity
                                    onPress={() => setSelectedPreset(null)}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                    style={s.backBtn}
                                >
                                    <PlatformIcon name="chevron.left" size={14} tintColor={subtextColor} />
                                    <Text style={[s.backBtnText, { color: subtextColor }]}>Presets</Text>
                                </TouchableOpacity>
                            </View>

                            <Text style={[s.dialogTitle, { color: textColor }]}>
                                {selectedPreset.name}
                            </Text>
                            <Text style={[s.dialogSubtitle, { color: subtextColor }]}>
                                {selectedPreset.subtitle}
                            </Text>
                        </View>

                        {/* Rules & Parameters Grid */}
                        <View style={[s.previewCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderColor }]}>
                            <Text style={[s.sectionLabel, { color: subtextColor }]}>POLICY RULES</Text>
                            <View style={s.rulesGrid}>
                                <View style={s.ruleRow}>
                                    <Text style={[s.ruleLabel, { color: subtextColor }]}>Entitlement</Text>
                                    <Text style={[s.ruleValue, { color: textColor }]}>
                                        {selectedPreset.policy.entitlement_days} Days / Cycle
                                    </Text>
                                </View>
                                <View style={s.ruleRow}>
                                    <Text style={[s.ruleLabel, { color: subtextColor }]}>Compensation</Text>
                                    <Text style={[s.ruleValue, { color: selectedPreset.policy.is_paid ? '#34C759' : '#FF9500' }]}>
                                        {selectedPreset.policy.is_paid ? 'Paid Leave' : 'Unpaid (Deducted)'}
                                    </Text>
                                </View>
                                <View style={s.ruleRow}>
                                    <Text style={[s.ruleLabel, { color: subtextColor }]}>Advance Notice</Text>
                                    <Text style={[s.ruleValue, { color: textColor }]}>
                                        {selectedPreset.policy.min_notice_days === 0
                                            ? 'Immediate / Same Day'
                                            : `${selectedPreset.policy.min_notice_days} Days Before`}
                                    </Text>
                                </View>
                                <View style={s.ruleRow}>
                                    <Text style={[s.ruleLabel, { color: subtextColor }]}>Evidence Mode</Text>
                                    <Text style={[s.ruleValue, { color: textColor, textTransform: 'capitalize' }]}>
                                        {selectedPreset.policy.evidence_mode}
                                    </Text>
                                </View>
                                {selectedPreset.leave_type === 'annual' && (
                                    <>
                                        <View style={s.ruleRow}>
                                            <Text style={[s.ruleLabel, { color: subtextColor }]}>Waiting Period</Text>
                                            <Text style={[s.ruleValue, { color: textColor }]}>
                                                {selectedPreset.policy.eligibility_waiting_period_months ?? 12} Months
                                            </Text>
                                        </View>
                                        <View style={s.ruleRow}>
                                            <Text style={[s.ruleLabel, { color: subtextColor }]}>1st Year Rule</Text>
                                            <Text style={[s.ruleValue, { color: textColor, textTransform: 'capitalize' }]}>
                                                {selectedPreset.policy.first_year_entitlement || 'Prorated'}
                                            </Text>
                                        </View>
                                    </>
                                )}
                            </View>

                            {/* Subtypes preview for permission */}
                            {selectedPreset.policy.permission_subtypes && selectedPreset.policy.permission_subtypes.length > 0 && (
                                <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: borderColor }}>
                                    <Text style={[s.sectionLabel, { color: subtextColor, marginBottom: 6 }]}>
                                        CONFIGURABLE SUBTYPES ({selectedPreset.policy.permission_subtypes.length})
                                    </Text>
                                    <View style={{ gap: 4 }}>
                                        {selectedPreset.policy.permission_subtypes.map((st) => (
                                            <View key={st.id} style={s.subtypeItem}>
                                                <Text style={[s.subtypeName, { color: textColor }]}>• {st.name}</Text>
                                                <Text style={[s.subtypeDays, { color: subtextColor }]}>{st.max_days}d</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}
                        </View>

                        <Text style={[s.descText, { color: subtextColor }]}>
                            {selectedPreset.description}
                        </Text>

                        {/* Actions */}
                        <View style={s.dialogActions}>
                            {onCustomizePreset && (
                                <TouchableOpacity
                                    style={[s.dialogCancelBtn, { borderColor }]}
                                    onPress={handleCustomize}
                                    disabled={applying}
                                >
                                    <Text style={[s.dialogCancelText, { color: '#007AFF' }]}>Customize</Text>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity
                                style={[s.dialogApplyBtn, { backgroundColor: '#007AFF' }]}
                                onPress={handleApply}
                                disabled={applying}
                            >
                                {applying ? (
                                    <ActivityIndicator color="#FFFFFF" size="small" />
                                ) : (
                                    <>
                                        <PlatformIcon name="checkmark" size={14} tintColor="#FFFFFF" />
                                        <Text style={s.dialogApplyText}>Apply Preset</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    /* PRESET LIST DIALOG */
                    <View style={[s.dialogContainer, { backgroundColor: modalBg, borderColor }]}>
                        <View style={s.listHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={[s.dialogTitle, { color: textColor }]}>
                                    Leave Policy Presets
                                </Text>
                                <Text style={[s.dialogSubtitle, { color: subtextColor, marginTop: 2 }]}>
                                    Select a starter template to preview and apply
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={handleClose}
                                style={s.closeCircleBtn}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <PlatformIcon name="xmark" size={14} tintColor={subtextColor} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            style={s.presetScrollView}
                            contentContainerStyle={s.presetListContent}
                        >
                            {LEAVE_POLICY_PRESETS.map((preset) => {
                                const badge = getLeaveTypeBadgeColor(preset.leave_type);
                                return (
                                    <TouchableOpacity
                                        key={preset.id}
                                        activeOpacity={0.7}
                                        onPress={() => handleSelectPreset(preset)}
                                        style={[
                                            s.presetCard,
                                            {
                                                backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                                                borderColor,
                                            },
                                        ]}
                                    >
                                        <View style={s.presetCardTop}>
                                            <Text style={[s.presetName, { color: textColor }]}>
                                                {preset.name}
                                            </Text>
                                            <View style={[s.badgePill, { backgroundColor: badge.bg }]}>
                                                <Text style={[s.badgeText, { color: badge.text }]}>
                                                    {badge.label}
                                                </Text>
                                            </View>
                                        </View>

                                        <Text style={[s.presetSubtitle, { color: subtextColor, marginTop: 4 }]}>
                                            {preset.subtitle}
                                        </Text>

                                        <View style={s.presetCardFooter}>
                                            <Text style={[s.viewDetailsLink, { color: '#007AFF' }]}>
                                                View Rules & Apply
                                            </Text>
                                            <PlatformIcon name="chevron.right" size={12} tintColor="#007AFF" />
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                )}
            </View>
        </Modal>
    );
};

export default LeavePolicyPresetModal;

const s = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    dialogContainer: {
        width: '100%',
        maxWidth: 390,
        borderRadius: 24,
        borderWidth: 1,
        padding: 20,
        gap: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.25,
        shadowRadius: 24,
        elevation: 10,
    },
    listHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        paddingBottom: 4,
    },
    closeCircleBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(120, 120, 128, 0.16)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    dialogHeader: {
        gap: 4,
    },
    dialogHeaderTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    backBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    backBtnText: {
        fontSize: 13,
        fontWeight: '500',
    },
    dialogTitle: {
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    dialogSubtitle: {
        fontSize: 13,
        lineHeight: 17,
    },
    badgePill: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        alignSelf: 'flex-start',
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    previewCard: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 12,
        gap: 8,
    },
    sectionLabel: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    rulesGrid: {
        gap: 6,
    },
    ruleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    ruleLabel: {
        fontSize: 13,
    },
    ruleValue: {
        fontSize: 13,
        fontWeight: '600',
    },
    subtypeItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    subtypeName: {
        fontSize: 12,
    },
    subtypeDays: {
        fontSize: 12,
        fontWeight: '500',
    },
    descText: {
        fontSize: 12,
        lineHeight: 16,
    },
    dialogActions: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 4,
    },
    dialogCancelBtn: {
        flex: 1,
        height: 42,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dialogCancelText: {
        fontSize: 14,
        fontWeight: '600',
    },
    dialogApplyBtn: {
        flex: 1.4,
        height: 42,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    dialogApplyText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    presetScrollView: {
        maxHeight: 360,
    },
    presetListContent: {
        gap: 10,
        paddingBottom: 4,
    },
    presetCard: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 14,
        gap: 6,
    },
    presetCardTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    presetName: {
        fontSize: 15,
        fontWeight: '600',
    },
    presetSubtitle: {
        fontSize: 12,
        lineHeight: 16,
    },
    presetCardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 4,
    },
    viewDetailsLink: {
        fontSize: 12,
        fontWeight: '600',
    },
});
