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
import { BlurView } from 'expo-blur';
import { useTheme } from '@/context/ThemeContext';
import * as Haptics from 'expo-haptics';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { GlassView } from '@/components/ui/GlassView';
import { WORK_SCHEDULE_PRESETS, WorkSchedulePreset } from '@/lib/data/workSchedulePresets';

interface WorkSchedulePresetModalProps {
    visible: boolean;
    onClose: () => void;
    onApplyPreset: (preset: WorkSchedulePreset) => Promise<void>;
}

export const WorkSchedulePresetModal: React.FC<WorkSchedulePresetModalProps> = ({
    visible,
    onClose,
    onApplyPreset,
}) => {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const [selectedPreset, setSelectedPreset] = useState<WorkSchedulePreset | null>(null);
    const [applying, setApplying] = useState(false);

    const textColor = isDark ? '#FFFFFF' : '#000000';
    const subtextColor = isDark ? '#8E8E93' : '#8E8E93';
    const modalBg = isDark ? 'rgba(30, 30, 32, 0.95)' : 'rgba(255, 255, 255, 0.95)';
    const borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';

    const handleSelectPreset = (preset: WorkSchedulePreset) => {
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
            Alert.alert('Failed', e.message || 'Could not apply preset');
        } finally {
            setApplying(false);
        }
    };

    const handleClose = () => {
        if (applying) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedPreset(null);
        onClose();
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
                                <View style={[s.badgePill, { backgroundColor: 'rgba(255, 149, 0, 0.12)' }]}>
                                    <Text style={[s.badgeText, { color: '#FF9500' }]}>
                                        {selectedPreset.type}
                                    </Text>
                                </View>
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

                        {/* Schedule Rows Preview */}
                        <View style={[s.previewCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderColor }]}>
                            <Text style={[s.sectionLabel, { color: subtextColor }]}>SCHEDULE PREVIEW</Text>
                            <View style={s.scheduleList}>
                                {selectedPreset.rows.map((row, idx) => (
                                    <View key={idx} style={s.scheduleRow}>
                                        <Text style={[s.scheduleDay, { color: textColor }]}>
                                            {row.day}
                                        </Text>
                                        <Text style={[s.scheduleHours, { color: subtextColor }]}>
                                            {row.hours}
                                        </Text>
                                        <Text style={[s.scheduleBreak, { color: subtextColor }]}>
                                            {row.breakStr}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </View>

                        {/* Description & Metrics */}
                        <View style={s.metaRow}>
                            <View style={[s.metaPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }]}>
                                <PlatformIcon name="clock" size={13} tintColor="#007AFF" />
                                <Text style={[s.metaPillText, { color: textColor }]}>{selectedPreset.weeklyHours}</Text>
                            </View>
                            <View style={[s.metaPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }]}>
                                <PlatformIcon name="cup.and.saucer" size={13} tintColor="#FF9500" />
                                <Text style={[s.metaPillText, { color: textColor }]}>Break {selectedPreset.break_duration_minutes}m</Text>
                            </View>
                        </View>

                        <Text style={[s.descText, { color: subtextColor }]}>
                            {selectedPreset.description}
                        </Text>

                        {/* Actions */}
                        <View style={s.dialogActions}>
                            <TouchableOpacity
                                style={[s.dialogCancelBtn, { borderColor }]}
                                onPress={() => setSelectedPreset(null)}
                                disabled={applying}
                            >
                                <Text style={[s.dialogCancelText, { color: textColor }]}>Back</Text>
                            </TouchableOpacity>

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
                                    Work Schedule Presets
                                </Text>
                                <Text style={[s.dialogSubtitle, { color: subtextColor, marginTop: 2 }]}>
                                    Select a preset to view details and apply
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
                            {WORK_SCHEDULE_PRESETS.map((preset) => (
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
                                        <View style={[s.badgePill, { backgroundColor: 'rgba(255, 149, 0, 0.12)' }]}>
                                            <Text style={[s.badgeText, { color: '#FF9500' }]}>
                                                {preset.type}
                                            </Text>
                                        </View>
                                    </View>

                                    <Text style={[s.presetSchedule, { color: textColor }]}>
                                        {preset.scheduleSummary}
                                    </Text>
                                    <Text style={[s.presetSubtitle, { color: subtextColor }]}>
                                        {preset.subtitle}
                                    </Text>

                                    <View style={s.presetCardFooter}>
                                        <Text style={[s.viewDetailsLink, { color: '#007AFF' }]}>
                                            View Details & Apply
                                        </Text>
                                        <PlatformIcon name="chevron.right" size={12} tintColor="#007AFF" />
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}
            </View>
        </Modal>
    );
};

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
        maxWidth: 380,
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
        fontWeight: '400',
    },
    badgePill: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '700',
    },
    presetScrollView: {
        maxHeight: 380,
    },
    presetListContent: {
        gap: 10,
        paddingVertical: 4,
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
    presetSchedule: {
        fontSize: 13,
        fontWeight: '500',
        marginTop: 2,
    },
    presetSubtitle: {
        fontSize: 12,
        fontWeight: '400',
    },
    presetCardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 4,
        marginTop: 4,
    },
    viewDetailsLink: {
        fontSize: 12,
        fontWeight: '600',
    },
    previewCard: {
        borderRadius: 14,
        borderWidth: 1,
        padding: 12,
        gap: 8,
    },
    sectionLabel: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    scheduleList: {
        gap: 4,
    },
    scheduleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 1,
    },
    scheduleDay: {
        flex: 1.15,
        fontSize: 13,
        fontWeight: '400',
    },
    scheduleHours: {
        flex: 1.35,
        fontSize: 13,
        fontWeight: '400',
    },
    scheduleBreak: {
        flex: 0.9,
        fontSize: 13,
        fontWeight: '400',
        textAlign: 'right',
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    metaPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
    },
    metaPillText: {
        fontSize: 12,
        fontWeight: '500',
    },
    descText: {
        fontSize: 12,
        lineHeight: 16,
    },
    dialogActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginTop: 6,
    },
    dialogCancelBtn: {
        flex: 1,
        height: 44,
        borderRadius: 14,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dialogCancelText: {
        fontSize: 14,
        fontWeight: '600',
    },
    dialogApplyBtn: {
        flex: 1.5,
        height: 44,
        borderRadius: 14,
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
});
