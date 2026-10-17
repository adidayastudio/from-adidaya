import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Platform,
    Alert,
    RefreshControl,
    TextInput,
    StatusBar as RNStatusBar,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { LinearGradient } from 'expo-linear-gradient';
import { BouncyGlassButton } from '@/components/ui/BouncyGlassButton';
import { HeaderToolbar, HeaderToolbarAction } from '@/components/ui/HeaderToolbar';
import * as Haptics from 'expo-haptics';

import { 
    JCLUB_REPORT_TYPES, 
    MOCK_SCHEDULED_ACTIVITIES, 
    MOCK_REPORT_ENTRIES, 
    MOCK_REPORT_DOCUMENTS 
} from '@/components/reports/mockData';
import { ReportType, ActivityTemplate } from '@/components/reports/types';
import { EntryDetailModal } from '@/components/reports/EntryDetailModal';
import { ActivityFormStructureSheet } from '@/components/reports/setup/ActivityFormStructureSheet';

export default function ReportDetailPage() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';
    const cardBg = isDark ? '#1C1C1E' : '#FFFFFF';
    const borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)';

    // Find active report type
    const initialReportType = useMemo(() => {
        return JCLUB_REPORT_TYPES.find(r => r.id === id) || JCLUB_REPORT_TYPES[0];
    }, [id]);

    const [reportType, setReportType] = useState<ReportType>(initialReportType);
    const [selectedEntry, setSelectedEntry] = useState<any | null>(null);
    const [editingActivity, setEditingActivity] = useState<ActivityTemplate | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    // Filter schedules, entries, documents for this report type
    const typeSchedules = MOCK_SCHEDULED_ACTIVITIES.filter(s => s.reportTypeId === reportType.id);
    const typeEntries = MOCK_REPORT_ENTRIES.filter(e => e.reportTypeId === reportType.id);
    const typeDocs = MOCK_REPORT_DOCUMENTS.filter(d => d.reportTypeId === reportType.id);

    const onRefresh = () => {
        setRefreshing(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setTimeout(() => setRefreshing(false), 500);
    };

    const handleOpenTasks = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Alert.alert(
            `Filter Global Tasks`,
            `Opening Global Tasks module filtered for "${reportType.name}" (${reportType.activities.length} routine activities).`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'View in Tasks', onPress: () => {} }
            ]
        );
    };

    const handleAddActivity = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const newAct: ActivityTemplate = {
            id: `act_${Date.now()}`,
            reportTypeId: reportType.id,
            name: '',
            description: '',
            frequency: 'Daily',
            frequencyDetail: 'Every day at 08:00 WIB',
            defaultAssignee: reportType.id === 'rep_maintenance' ? 'Citra Kirana (Building Tech)' : 'Siti Rahma (Housekeeping)',
            estimatedDurationMinutes: 20,
            fields: [
                { id: `f_${Date.now()}_1`, label: 'Main Inspection Parameter', type: 'unit_value', unit: 'Unit', required: true },
                { id: `f_${Date.now()}_2`, label: 'Condition Rating', type: 'condition', required: true, defaultValue: 'Normal', options: ['Normal', 'Needs Attention', 'Critical'] },
                { id: `f_${Date.now()}_3`, label: 'Inspection Photo Proof', type: 'photo', required: false },
            ],
            isActive: true,
        };
        setEditingActivity(newAct);
    };

    const handleSaveActivity = (updated: ActivityTemplate) => {
        setReportType(prev => {
            const exists = prev.activities.some(a => a.id === updated.id);
            const newActivities = exists
                ? prev.activities.map(a => a.id === updated.id ? updated : a)
                : [...prev.activities, updated];
            return {
                ...prev,
                activities: newActivities,
                activeActivitiesCount: newActivities.length,
            };
        });
        setEditingActivity(null);
    };

    const handleDeleteActivity = (actId: string) => {
        setReportType(prev => {
            const newActivities = prev.activities.filter(a => a.id !== actId);
            return {
                ...prev,
                activities: newActivities,
                activeActivitiesCount: newActivities.length,
            };
        });
        setEditingActivity(null);
    };

    const headerActions: HeaderToolbarAction[] = useMemo(() => [
        {
            id: 'add_act',
            icon: 'add-outline',
            image: 'plus',
            title: 'Add Activity',
            tintColor: textColor,
            onPress: handleAddActivity,
        },
        {
            id: 'edit',
            icon: 'ellipsis-horizontal-circle-outline',
            image: 'ellipsis.circle',
            title: 'Options',
            tintColor: textColor,
            onPress: () => {
                Alert.alert(
                    `${reportType.name} Settings`,
                    'Manage reporting parameters:',
                    [
                        { 
                            text: 'Configure Form Templates', 
                            onPress: () => {
                                if (reportType.activities.length > 0) {
                                    setEditingActivity(reportType.activities[0]);
                                }
                            } 
                        },
                        { text: 'Add New Activity Routine', onPress: handleAddActivity },
                        { text: 'Cancel', style: 'cancel' }
                    ]
                );
            },
        },
    ], [textColor, reportType]);

    return (
        <>
            <Stack.Screen
                options={{
                    title: reportType.name,
                    headerLargeTitle: Platform.OS === 'ios',
                    headerTransparent: Platform.OS === 'ios',
                    headerTintColor: textColor,
                    headerShadowVisible: false,
                    headerStyle: Platform.OS === 'ios'
                        ? { backgroundColor: 'transparent' }
                        : { backgroundColor: isDark ? '#000000' : '#F2F2F7' },
                    headerLargeStyle: Platform.OS === 'ios'
                        ? { backgroundColor: 'transparent' }
                        : { backgroundColor: isDark ? '#000000' : '#F2F2F7' },
                    headerLargeTitleStyle: { fontSize: 26, color: textColor },
                    headerRight: () => (
                        <HeaderToolbar actions={headerActions} isDark={isDark} textColor={textColor} />
                    ),
                }}
            />

            <ScrollView
                style={[styles.container, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}
                contentInsetAdjustmentBehavior="automatic"
                contentContainerStyle={{
                    paddingHorizontal: 16,
                    paddingBottom: insets.bottom + 40,
                    paddingTop: Platform.OS === 'android' ? ((RNStatusBar.currentHeight || 24) + 54) : 0,
                    gap: 16,
                }}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={reportType.color} />}
            >
                {/* Hero Summary Card */}
                <View style={[styles.heroCard, { backgroundColor: cardBg, borderColor }]}>
                    <View style={styles.heroTopRow}>
                        <LinearGradient
                            colors={[reportType.color, reportType.colorEnd]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.heroIconBox}
                        >
                            <PlatformIcon name={reportType.icon as any} size={24} tintColor="#FFFFFF" />
                        </LinearGradient>

                        <View style={styles.heroInfo}>
                            <View style={styles.heroTitleRow}>
                                <Text style={[styles.heroTitle, { color: textColor }]}>{reportType.name}</Text>
                                <View style={[styles.categoryBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}>
                                    <Text style={[styles.categoryText, { color: subtextColor }]}>{reportType.category}</Text>
                                </View>
                            </View>
                            <Text style={[styles.heroDesc, { color: subtextColor }]}>
                                {reportType.shortDescription}
                            </Text>
                        </View>
                    </View>

                    {/* Operational KPI Grid */}
                    <View style={[styles.kpiRow, { backgroundColor: isDark ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.02)' }]}>
                        <View style={styles.kpiItem}>
                            <Text style={[styles.kpiVal, { color: reportType.color }]}>{reportType.completionRate}%</Text>
                            <Text style={[styles.kpiLabel, { color: subtextColor }]}>Completion</Text>
                        </View>
                        <View style={[styles.kpiDivider, { backgroundColor: borderColor }]} />
                        <View style={styles.kpiItem}>
                            <Text style={[styles.kpiVal, { color: textColor }]}>{reportType.activities.length}</Text>
                            <Text style={[styles.kpiLabel, { color: subtextColor }]}>Routines</Text>
                        </View>
                        <View style={[styles.kpiDivider, { backgroundColor: borderColor }]} />
                        <View style={styles.kpiItem}>
                            <Text style={[styles.kpiVal, { color: textColor }]}>{typeDocs.length}</Text>
                            <Text style={[styles.kpiLabel, { color: subtextColor }]}>Documents</Text>
                        </View>
                    </View>

                    {/* Open Current Tasks Action */}
                    <BouncyGlassButton
                        isPill
                        isGlass
                        isDark={isDark}
                        textColor={textColor}
                        onPress={handleOpenTasks}
                        style={[styles.openTasksGlassBtn, { backgroundColor: `${reportType.color}18` }]}
                    >
                        <View style={styles.btnInner}>
                            <PlatformIcon name="checkmark.square.fill" size={16} tintColor={reportType.color} />
                            <Text style={[styles.openTasksBtnText, { color: reportType.color }]}>Open Current Tasks</Text>
                        </View>
                    </BouncyGlassButton>
                </View>

                {/* Configured Activities List */}
                <View style={styles.sectionBlock}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Configured Activities ({reportType.activities.length})</Text>
                        <TouchableOpacity onPress={handleAddActivity}>
                            <Text style={[styles.addActLink, { color: reportType.color }]}>+ Add</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.cardList}>
                        {reportType.activities.map((act) => (
                            <TouchableOpacity
                                key={act.id}
                                activeOpacity={0.75}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setEditingActivity(act);
                                }}
                                style={[styles.activityCard, { backgroundColor: cardBg, borderColor }]}
                            >
                                <View style={styles.actTopRow}>
                                    <Text style={[styles.actTitle, { color: textColor }]}>{act.name}</Text>
                                    <View style={[styles.freqPill, { backgroundColor: `${reportType.color}15` }]}>
                                        <Text style={[styles.freqPillText, { color: reportType.color }]}>{act.frequency}</Text>
                                    </View>
                                </View>

                                {act.description && (
                                    <Text style={[styles.actDesc, { color: subtextColor }]}>
                                        {act.description}
                                    </Text>
                                )}

                                <View style={styles.actMeta}>
                                    <Text style={[styles.actMetaText, { color: subtextColor }]}>
                                        {act.frequencyDetail || 'Active'} • {act.fields.length} input fields
                                    </Text>
                                    <PlatformIcon name="chevron.right" size={12} tintColor={subtextColor} />
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Upcoming Schedule for this type */}
                {typeSchedules.length > 0 && (
                    <View style={styles.sectionBlock}>
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Next Schedule Occurrences</Text>
                        <View style={styles.cardList}>
                            {typeSchedules.map((sch) => (
                                <View key={sch.id} style={[styles.simpleCard, { backgroundColor: cardBg, borderColor }]}>
                                    <View style={styles.cardRow}>
                                        <Text style={[styles.cardTitle, { color: textColor }]}>{sch.activityName}</Text>
                                        <Text style={[styles.dueText, { color: sch.status === 'completed' ? '#10B981' : reportType.color }]}>
                                            {sch.status === 'completed' ? 'Done' : sch.dueTime}
                                        </Text>
                                    </View>
                                    <Text style={[styles.cardSubtext, { color: subtextColor }]}>
                                        Assignee: {sch.assigneeName} ({sch.assigneeRole})
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Recent Submitted Records */}
                {typeEntries.length > 0 && (
                    <View style={styles.sectionBlock}>
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Recent Submitted Entries</Text>
                        <View style={styles.cardList}>
                            {typeEntries.map((ent) => (
                                <TouchableOpacity
                                    key={ent.id}
                                    activeOpacity={0.75}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setSelectedEntry(ent);
                                    }}
                                    style={[styles.simpleCard, { backgroundColor: cardBg, borderColor }]}
                                >
                                    <View style={styles.cardRow}>
                                        <Text style={[styles.cardTitle, { color: textColor, flex: 1 }]} numberOfLines={1}>
                                            {ent.activityName}
                                        </Text>
                                        <Text style={[styles.condText, ent.condition === 'Normal' ? { color: '#10B981' } : { color: '#F59E0B' }]}>
                                            {ent.condition}
                                        </Text>
                                    </View>
                                    <Text style={[styles.cardSubtext, { color: subtextColor }]}>
                                        {ent.submittedBy.name} • {ent.submittedAt}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}

                {/* Generated Documents */}
                {typeDocs.length > 0 && (
                    <View style={styles.sectionBlock}>
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Generated Document Reports</Text>
                        <View style={styles.cardList}>
                            {typeDocs.map((doc) => (
                                <TouchableOpacity
                                    key={doc.id}
                                    activeOpacity={0.75}
                                    onPress={() => {
                                        Alert.alert(doc.title, `${doc.period} • ${doc.format} (${doc.fileSize})\nStatus: ${doc.status}\nAggregated from ${doc.entriesCount} entries.`);
                                    }}
                                    style={[styles.simpleCard, { backgroundColor: cardBg, borderColor }]}
                                >
                                    <View style={styles.cardRow}>
                                        <Text style={[styles.cardTitle, { color: textColor }]} numberOfLines={1}>
                                            {doc.title}
                                        </Text>
                                        <Text style={[styles.docPill, { color: doc.format === 'PDF' ? '#EF4444' : '#10B981' }]}>
                                            {doc.format}
                                        </Text>
                                    </View>
                                    <Text style={[styles.cardSubtext, { color: subtextColor }]}>
                                        {doc.periodType} • {doc.period} • {doc.entriesCount} entries
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}
            </ScrollView>

            <EntryDetailModal
                visible={!!selectedEntry}
                entry={selectedEntry}
                onClose={() => setSelectedEntry(null)}
            />

            <ActivityFormStructureSheet
                visible={!!editingActivity}
                activity={editingActivity}
                reportTypeName={reportType.name}
                reportTypeColor={reportType.color}
                onClose={() => setEditingActivity(null)}
                onSave={handleSaveActivity}
                onDelete={handleDeleteActivity}
            />
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    heroCard: {
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        gap: 14,
    },
    heroTopRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    heroIconBox: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroInfo: {
        flex: 1,
        gap: 3,
    },
    heroTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    heroTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    categoryBadge: {
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 6,
    },
    categoryText: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    heroDesc: {
        fontSize: 13,
        lineHeight: 18,
    },
    kpiRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingVertical: 10,
        borderRadius: 12,
    },
    kpiItem: {
        alignItems: 'center',
        gap: 2,
    },
    kpiVal: {
        fontSize: 17,
        fontWeight: '700',
    },
    kpiLabel: {
        fontSize: 11,
        fontWeight: '500',
    },
    kpiDivider: {
        width: 1,
        height: 20,
    },
    openTasksGlassBtn: {
        height: 42,
        borderRadius: 21,
    },
    btnInner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    openTasksBtnText: {
        fontSize: 14,
        fontWeight: '700',
    },
    sectionBlock: {
        gap: 8,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 2,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    addActLink: {
        fontSize: 13,
        fontWeight: '700',
    },
    cardList: {
        gap: 8,
    },
    activityCard: {
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        gap: 6,
    },
    actTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    actTitle: {
        fontSize: 15,
        fontWeight: '600',
    },
    freqPill: {
        paddingHorizontal: 7,
        paddingVertical: 2,
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
    actMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 4,
    },
    actMetaText: {
        fontSize: 12,
    },
    simpleCard: {
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderWidth: 1,
        gap: 4,
    },
    cardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    cardTitle: {
        fontSize: 14,
        fontWeight: '600',
    },
    cardSubtext: {
        fontSize: 12,
    },
    dueText: {
        fontSize: 12,
        fontWeight: '700',
    },
    condText: {
        fontSize: 12,
        fontWeight: '700',
    },
    docPill: {
        fontSize: 11,
        fontWeight: '800',
    },
});
