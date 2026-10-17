import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/theme';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { ReportType, ScheduledActivity, ReportEntry, ReportDocument } from './types';

interface ReportTypeDetailModalProps {
    visible: boolean;
    reportType: ReportType | null;
    scheduledActivities: ScheduledActivity[];
    recentEntries: ReportEntry[];
    recentDocuments: ReportDocument[];
    onClose: () => void;
    onOpenTasks: () => void;
    onSelectEntry: (entry: ReportEntry) => void;
    onSelectDocument: (doc: ReportDocument) => void;
}

export function ReportTypeDetailModal({
    visible,
    reportType,
    scheduledActivities,
    recentEntries,
    recentDocuments,
    onClose,
    onOpenTasks,
    onSelectEntry,
    onSelectDocument,
}: ReportTypeDetailModalProps) {
    const insets = useSafeAreaInsets();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';
    const cardBg = isDark ? 'rgba(28, 28, 30, 0.75)' : '#FFFFFF';
    const borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)';

    if (!reportType) return null;

    const typeSchedules = scheduledActivities.filter(s => s.reportTypeId === reportType.id);
    const typeEntries = recentEntries.filter(e => e.reportTypeId === reportType.id);
    const typeDocs = recentDocuments.filter(d => d.reportTypeId === reportType.id);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}>
                {/* Modal Header */}
                <View style={[styles.modalHeader, { paddingTop: Platform.OS === 'ios' ? 16 : insets.top + 10 }]}>
                    <View style={styles.headerLeft}>
                        <Text style={[styles.headerTitle, { color: textColor }]}>{reportType.name}</Text>
                        <Text style={[styles.headerSub, { color: subtextColor }]}>{reportType.category}</Text>
                    </View>

                    <TouchableOpacity 
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            onClose();
                        }}
                        style={[styles.closeButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]}
                    >
                        <Ionicons name="close" size={20} color={textColor} />
                    </TouchableOpacity>
                </View>

                <ScrollView 
                    style={styles.scrollView}
                    contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 40 }]}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Hero Header Card */}
                    <View style={[styles.heroCard, { backgroundColor: cardBg, borderColor }]}>
                        <View style={styles.heroTop}>
                            <LinearGradient
                                colors={[reportType.color, reportType.colorEnd]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.heroIconBox}
                            >
                                <PlatformIcon name={reportType.icon as any} size={28} tintColor="#FFFFFF" />
                            </LinearGradient>

                            <View style={styles.heroTextBox}>
                                <Text style={[styles.heroName, { color: textColor }]}>{reportType.name}</Text>
                                <Text style={[styles.heroDesc, { color: subtextColor }]}>
                                    {reportType.shortDescription}
                                </Text>
                            </View>
                        </View>

                        {/* Progress & Operational stats */}
                        <View style={styles.statRow}>
                            <View style={styles.statBox}>
                                <Text style={[styles.statValue, { color: reportType.color }]}>
                                    {reportType.completionRate}%
                                </Text>
                                <Text style={[styles.statLabel, { color: subtextColor }]}>Completion Rate</Text>
                            </View>
                            <View style={[styles.verticalDivider, { backgroundColor: borderColor }]} />
                            <View style={styles.statBox}>
                                <Text style={[styles.statValue, { color: textColor }]}>
                                    {reportType.activities.length}
                                </Text>
                                <Text style={[styles.statLabel, { color: subtextColor }]}>Active Activities</Text>
                            </View>
                            <View style={[styles.verticalDivider, { backgroundColor: borderColor }]} />
                            <View style={styles.statBox}>
                                <Text style={[styles.statValue, { color: textColor }]}>
                                    {typeDocs.length}
                                </Text>
                                <Text style={[styles.statLabel, { color: subtextColor }]}>Docs Generated</Text>
                            </View>
                        </View>

                        {/* Open Tasks Action */}
                        <TouchableOpacity
                            style={[styles.primaryActionBtn, { backgroundColor: reportType.color }]}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                onOpenTasks();
                            }}
                        >
                            <Ionicons name="checkbox" size={18} color="#FFFFFF" />
                            <Text style={styles.primaryActionText}>Open Current Tasks</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Operational Activities Section */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Configured Activities</Text>
                        <View style={styles.activitiesList}>
                            {reportType.activities.map((act) => (
                                <View key={act.id} style={[styles.activityItemCard, { backgroundColor: cardBg, borderColor }]}>
                                    <View style={styles.actItemHeader}>
                                        <Text style={[styles.actName, { color: textColor }]}>{act.name}</Text>
                                        <View style={[styles.freqPill, { backgroundColor: `${reportType.color}15` }]}>
                                            <Text style={[styles.freqPillText, { color: reportType.color }]}>{act.frequency}</Text>
                                        </View>
                                    </View>
                                    {act.description && (
                                        <Text style={[styles.actDesc, { color: subtextColor }]}>{act.description}</Text>
                                    )}
                                    <View style={styles.actMetaRow}>
                                        <Ionicons name="time-outline" size={13} color={subtextColor} />
                                        <Text style={[styles.actMetaText, { color: subtextColor }]}>{act.frequencyDetail}</Text>
                                        <Text style={[styles.actMetaText, { color: subtextColor }]}>• {act.fields.length} fields</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </View>

                    {/* Next Scheduled Section */}
                    {typeSchedules.length > 0 && (
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: textColor }]}>Upcoming Schedule</Text>
                            <View style={styles.scheduleList}>
                                {typeSchedules.map((sch) => (
                                    <View key={sch.id} style={[styles.scheduleItemCard, { backgroundColor: cardBg, borderColor }]}>
                                        <View style={{ flex: 1, gap: 2 }}>
                                            <Text style={[styles.schName, { color: textColor }]}>{sch.activityName}</Text>
                                            <Text style={[styles.schAssignee, { color: subtextColor }]}>
                                                {sch.assigneeName} • Due: {sch.dueTime}
                                            </Text>
                                        </View>
                                        <View style={[styles.schStatusPill, sch.status === 'completed' ? styles.statusCompleted : styles.statusPending]}>
                                            <Text style={[styles.schStatusText, sch.status === 'completed' ? { color: '#10B981' } : { color: '#0284C7' }]}>
                                                {sch.status === 'completed' ? 'Done' : 'Scheduled'}
                                            </Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Recent Records / Submissions */}
                    {typeEntries.length > 0 && (
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: textColor }]}>Recent Submitted Entries</Text>
                            <View style={styles.entriesList}>
                                {typeEntries.map((ent) => (
                                    <TouchableOpacity 
                                        key={ent.id} 
                                        activeOpacity={0.8}
                                        onPress={() => onSelectEntry(ent)}
                                        style={[styles.entryItemCard, { backgroundColor: cardBg, borderColor }]}
                                    >
                                        <View style={styles.entryRowTop}>
                                            <Text style={[styles.entryName, { color: textColor }]}>{ent.activityName}</Text>
                                            <Text style={[styles.entryDate, { color: subtextColor }]}>{ent.submittedAt}</Text>
                                        </View>
                                        <View style={styles.entryRowBottom}>
                                            <Text style={[styles.entryBy, { color: subtextColor }]}>
                                                Submitted by <Text style={{ color: textColor }}>{ent.submittedBy.name}</Text>
                                            </Text>
                                            <Ionicons name="chevron-forward" size={14} color={subtextColor} />
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Latest Generated Documents */}
                    {typeDocs.length > 0 && (
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: textColor }]}>Generated Documents</Text>
                            <View style={styles.docsList}>
                                {typeDocs.map((doc) => (
                                    <TouchableOpacity 
                                        key={doc.id}
                                        activeOpacity={0.8}
                                        onPress={() => onSelectDocument(doc)}
                                        style={[styles.docItemCard, { backgroundColor: cardBg, borderColor }]}
                                    >
                                        <View style={[styles.docFormatPill, { backgroundColor: doc.format === 'PDF' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)' }]}>
                                            <Text style={[styles.docFormatText, { color: doc.format === 'PDF' ? '#EF4444' : '#10B981' }]}>
                                                {doc.format}
                                            </Text>
                                        </View>
                                        <View style={{ flex: 1, gap: 2 }}>
                                            <Text style={[styles.docName, { color: textColor }]} numberOfLines={1}>{doc.title}</Text>
                                            <Text style={[styles.docPeriod, { color: subtextColor }]}>{doc.period} • {doc.fileSize}</Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={14} color={subtextColor} />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}
                </ScrollView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(150, 150, 150, 0.2)',
    },
    headerLeft: {
        gap: 2,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
    },
    headerSub: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollView: {
        flex: 1,
    },
    contentContainer: {
        padding: 16,
        gap: 20,
    },
    heroCard: {
        borderRadius: 22,
        padding: 18,
        borderWidth: 1,
        gap: 16,
    },
    heroTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    heroIconBox: {
        width: 52,
        height: 52,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroTextBox: {
        flex: 1,
        gap: 4,
    },
    heroName: {
        fontSize: 19,
        fontWeight: '700',
    },
    heroDesc: {
        fontSize: 13,
        lineHeight: 18,
    },
    statRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingVertical: 10,
        backgroundColor: 'rgba(0,0,0,0.02)',
        borderRadius: 14,
    },
    statBox: {
        alignItems: 'center',
        gap: 2,
    },
    statValue: {
        fontSize: 18,
        fontWeight: '700',
    },
    statLabel: {
        fontSize: 11,
        fontWeight: '500',
    },
    verticalDivider: {
        width: 1,
        height: 24,
    },
    primaryActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        borderRadius: 14,
    },
    primaryActionText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
    section: {
        gap: 10,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        paddingHorizontal: 2,
    },
    activitiesList: {
        gap: 10,
    },
    activityItemCard: {
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        gap: 6,
    },
    actItemHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    actName: {
        fontSize: 15,
        fontWeight: '600',
    },
    freqPill: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    freqPillText: {
        fontSize: 11,
        fontWeight: '700',
    },
    actDesc: {
        fontSize: 12,
        lineHeight: 16,
    },
    actMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 2,
    },
    actMetaText: {
        fontSize: 11,
    },
    scheduleList: {
        gap: 8,
    },
    scheduleItemCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
        gap: 10,
    },
    schName: {
        fontSize: 14,
        fontWeight: '600',
    },
    schAssignee: {
        fontSize: 12,
    },
    schStatusPill: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusCompleted: {
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
    },
    statusPending: {
        backgroundColor: 'rgba(2, 132, 199, 0.12)',
    },
    schStatusText: {
        fontSize: 11,
        fontWeight: '600',
    },
    entriesList: {
        gap: 8,
    },
    entryItemCard: {
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
        gap: 6,
    },
    entryRowTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    entryName: {
        fontSize: 14,
        fontWeight: '600',
    },
    entryDate: {
        fontSize: 11,
    },
    entryRowBottom: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    entryBy: {
        fontSize: 12,
    },
    docsList: {
        gap: 8,
    },
    docItemCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
        gap: 10,
    },
    docFormatPill: {
        paddingHorizontal: 7,
        paddingVertical: 4,
        borderRadius: 6,
    },
    docFormatText: {
        fontSize: 10,
        fontWeight: '800',
    },
    docName: {
        fontSize: 14,
        fontWeight: '600',
    },
    docPeriod: {
        fontSize: 12,
    },
});
