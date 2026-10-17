import React from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Platform,
    Pressable,
    Image,
    Alert,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/theme';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { GlassView } from '@/components/ui/GlassView';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { ScheduledActivity } from './types';
import { JCLUB_REPORT_TYPES } from './mockData';

interface ScheduledTaskDetailSheetProps {
    visible: boolean;
    activity: ScheduledActivity | null;
    onClose: () => void;
    onSaveActivity?: (updated: ScheduledActivity) => void;
    onOpenGlobalTasks?: (activity: ScheduledActivity) => void;
}

export function ScheduledTaskDetailSheet({
    visible,
    activity,
    onClose,
    onSaveActivity,
    onOpenGlobalTasks,
}: ScheduledTaskDetailSheetProps) {
    const insets = useSafeAreaInsets();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';
    const cardBg = isDark ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF';
    const borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';

    if (!visible || !activity) return null;

    const isCompleted = activity.status === 'completed';

    // Find full activity template definition from mock data
    const parentReportType = JCLUB_REPORT_TYPES.find(rt => rt.id === activity.reportTypeId);
    const templateDef = parentReportType?.activities.find(a => a.id === activity.activityId || a.name === activity.activityName);

    const dividerStyle = [
        styles.divider,
        { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' },
    ];

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <Pressable style={styles.backdrop} onPress={onClose} />

                <View style={styles.sheetWrapper}>
                    <GlassView
                        intensity={isDark ? 30 : 60}
                        style={[
                            styles.sheetContainer,
                            {
                                backgroundColor: isDark ? 'rgba(28,28,30,0.92)' : 'rgba(242,242,247,0.95)',
                                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                                paddingBottom: Math.max(insets.bottom, 20),
                            },
                        ]}
                    >
                        {/* Grabber Handle */}
                        <View style={styles.handleContainer}>
                            <View style={[styles.grabber, { backgroundColor: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)' }]} />
                        </View>

                        {/* Header */}
                        <View style={styles.header}>
                            <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
                                <Text style={styles.closeText}>Done</Text>
                            </TouchableOpacity>
                            <Text style={[styles.headerTitle, { color: textColor }]} numberOfLines={1}>
                                Task Details
                            </Text>
                            <View style={{ width: 45 }} />
                        </View>

                        <ScrollView
                            style={styles.scrollArea}
                            contentContainerStyle={styles.scrollContent}
                            showsVerticalScrollIndicator={false}
                        >
                            {/* Summary Card */}
                            <GlassView intensity={isDark ? 10 : 25} style={[styles.card, { backgroundColor: cardBg }]}>
                                <View style={styles.summaryTop}>
                                    <View style={{ flex: 1, gap: 4 }}>
                                        <Text style={[styles.taskTitle, { color: textColor }]}>
                                            {activity.activityName}
                                        </Text>
                                        <Text style={[styles.taskSub, { color: subtextColor }]}>
                                            {activity.reportTypeName} • {activity.frequency}
                                        </Text>
                                    </View>
                                    <View style={[
                                        styles.statusBadge,
                                        isCompleted ? styles.statusBadgeDone : styles.statusBadgeDue
                                    ]}>
                                        <Text style={[
                                            styles.statusBadgeText,
                                            isCompleted ? { color: '#10B981' } : { color: '#007AFF' }
                                        ]}>
                                            {isCompleted ? 'Completed' : activity.dueTime}
                                        </Text>
                                    </View>
                                </View>
                            </GlassView>

                            {/* Assignment & Timing Block */}
                            <View style={styles.block}>
                                <Text style={[styles.sectionLabel, { color: subtextColor }]}>Assignment & Schedule</Text>
                                <GlassView intensity={isDark ? 10 : 25} style={[styles.card, { backgroundColor: cardBg }]}>
                                    <View style={styles.row}>
                                        <Text style={[styles.rowLabel, { color: textColor }]}>Assigned Person</Text>
                                        <Text style={[styles.rowVal, { color: textColor, fontWeight: '500' }]}>
                                            {activity.assigneeName}
                                        </Text>
                                    </View>
                                    <View style={dividerStyle} />
                                    <View style={styles.row}>
                                        <Text style={[styles.rowLabel, { color: textColor }]}>Role</Text>
                                        <Text style={[styles.rowVal, { color: subtextColor }]}>
                                            {activity.assigneeRole}
                                        </Text>
                                    </View>
                                    <View style={dividerStyle} />
                                    <View style={styles.row}>
                                        <Text style={[styles.rowLabel, { color: textColor }]}>Scheduled Date</Text>
                                        <Text style={[styles.rowVal, { color: textColor }]}>
                                            {activity.dueDate} ({activity.frequencyDetail || activity.dueTime})
                                        </Text>
                                    </View>
                                </GlassView>
                            </View>

                            {/* Checklist & Form Scope */}
                            <View style={styles.block}>
                                <Text style={[styles.sectionLabel, { color: subtextColor }]}>
                                    Checklist Items ({templateDef?.fields?.length || 3})
                                </Text>
                                <GlassView intensity={isDark ? 10 : 25} style={[styles.card, { backgroundColor: cardBg }]}>
                                    {templateDef?.fields && templateDef.fields.length > 0 ? (
                                        templateDef.fields.map((f, idx) => (
                                            <View key={f.id}>
                                                <View style={styles.fieldRow}>
                                                    <PlatformIcon
                                                        name={isCompleted ? "checkmark.circle.fill" : "circle"}
                                                        size={18}
                                                        tintColor={isCompleted ? "#10B981" : (isDark ? '#71717A' : '#A1A1A6')}
                                                    />
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={[styles.fieldName, { color: textColor }]}>{f.label}</Text>
                                                        <Text style={[styles.fieldMeta, { color: subtextColor }]}>
                                                            Type: {f.type} {f.unit ? `(${f.unit})` : ''} {f.required ? '• Mandatory' : '• Optional'}
                                                        </Text>
                                                    </View>
                                                </View>
                                                {idx < templateDef.fields.length - 1 && <View style={dividerStyle} />}
                                            </View>
                                        ))
                                    ) : (
                                        <View style={styles.fieldRow}>
                                            <PlatformIcon
                                                name={isCompleted ? "checkmark.circle.fill" : "circle"}
                                                size={18}
                                                tintColor={isCompleted ? "#10B981" : (isDark ? '#71717A' : '#A1A1A6')}
                                            />
                                            <View style={{ flex: 1 }}>
                                                <Text style={[styles.fieldName, { color: textColor }]}>Standard Operational Inspection</Text>
                                                <Text style={[styles.fieldMeta, { color: subtextColor }]}>Verify equipment integrity & report abnormal readings</Text>
                                            </View>
                                        </View>
                                    )}
                                </GlassView>
                            </View>

                            {/* Notes & Remarks */}
                            <View style={styles.block}>
                                <Text style={[styles.sectionLabel, { color: subtextColor }]}>Notes & Execution Log</Text>
                                <GlassView intensity={isDark ? 10 : 25} style={[styles.card, { backgroundColor: cardBg }]}>
                                    <View style={styles.notesBox}>
                                        <Text style={[styles.notesContent, { color: isCompleted ? textColor : subtextColor }]}>
                                            {isCompleted 
                                                ? `Pemeriksaan selesai dilakukan oleh ${activity.assigneeName}. Kondisi seluruh unit normal dan tidak ditemukan deviasi.`
                                                : `Tugas dijadwalkan untuk ${activity.assigneeName}. Silakan isi form checklist dan upload bukti foto saat melakukan inspeksi.`
                                            }
                                        </Text>
                                    </View>
                                </GlassView>
                            </View>

                            {/* Global Tasks Navigation Button */}
                            <TouchableOpacity
                                activeOpacity={0.8}
                                style={[styles.globalTaskBtn, { backgroundColor: isDark ? '#FFFFFF' : '#007AFF' }]}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    onClose();
                                    if (onOpenGlobalTasks) {
                                        onOpenGlobalTasks(activity);
                                    } else {
                                        Alert.alert('Global Tasks', `Opened task for ${activity.activityName}`);
                                    }
                                }}
                            >
                                <PlatformIcon
                                    name="arrow.up.right.square"
                                    size={16}
                                    tintColor={isDark ? '#000000' : '#FFFFFF'}
                                />
                                <Text style={[styles.globalTaskBtnText, { color: isDark ? '#000000' : '#FFFFFF' }]}>
                                    Open in Global Tasks
                                </Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </GlassView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
    },
    sheetWrapper: {
        maxHeight: '88%',
        height: '88%',
    },
    sheetContainer: {
        flex: 1,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        borderWidth: 1,
        borderBottomWidth: 0,
        overflow: 'hidden',
    },
    handleContainer: {
        alignItems: 'center',
        paddingVertical: 10,
    },
    grabber: {
        width: 36,
        height: 5,
        borderRadius: 2.5,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(0,0,0,0.08)',
    },
    headerBtn: {
        paddingVertical: 4,
        paddingHorizontal: 4,
    },
    closeText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#007AFF',
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '600',
    },
    scrollArea: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        gap: 16,
    },
    card: {
        borderRadius: 20,
        overflow: 'hidden',
    },
    summaryTop: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        padding: 16,
        gap: 10,
    },
    taskTitle: {
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    taskSub: {
        fontSize: 13,
        fontWeight: '400',
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusBadgeDone: {
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
    },
    statusBadgeDue: {
        backgroundColor: 'rgba(0, 122, 255, 0.12)',
    },
    statusBadgeText: {
        fontSize: 12,
        fontWeight: '700',
    },
    block: {
        gap: 8,
    },
    sectionLabel: {
        fontSize: 13,
        fontWeight: '600',
        paddingHorizontal: 4,
        letterSpacing: -0.1,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 13,
        paddingHorizontal: 16,
    },
    rowLabel: {
        fontSize: 15,
        fontWeight: '400',
    },
    rowVal: {
        fontSize: 14,
    },
    fieldRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        gap: 12,
    },
    fieldName: {
        fontSize: 15,
        fontWeight: '500',
    },
    fieldMeta: {
        fontSize: 12,
        marginTop: 2,
    },
    notesBox: {
        padding: 16,
    },
    notesContent: {
        fontSize: 14,
        lineHeight: 20,
    },
    globalTaskBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 16,
        gap: 8,
        marginTop: 6,
    },
    globalTaskBtnText: {
        fontSize: 16,
        fontWeight: '600',
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 16,
    },
});
