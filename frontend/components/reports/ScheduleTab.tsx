import React, { useState, useMemo, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Platform,
    TextInput,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import ContextMenu, { ContextMenuAction } from '@/components/ui/PlatformContextMenu';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { ScheduledActivity } from './types';
import { ScheduledTaskDetailSheet } from './ScheduledTaskDetailSheet';

interface ScheduleTabProps {
    scheduledActivities: ScheduledActivity[];
    onOpenTask: (activity: ScheduledActivity) => void;
}

export function ScheduleTab({
    scheduledActivities,
    onOpenTask,
}: ScheduleTabProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';
    const cardBg = isDark ? '#1C1C1E' : '#FFFFFF';
    const pillBg = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)';
    const borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)';

    const [activitiesList, setActivitiesList] = useState<ScheduledActivity[]>(scheduledActivities);
    const [selectedTask, setSelectedTask] = useState<ScheduledActivity | null>(null);
    const [viewMode, setViewMode] = useState<'agenda' | 'calendar'>('agenda');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFrequency, setSelectedFrequency] = useState<string>('all');
    const [selectedReportType, setSelectedReportType] = useState<string>('all');
    const [selectedStatus, setSelectedStatus] = useState<string>('all');

    useEffect(() => {
        setActivitiesList(scheduledActivities);
    }, [scheduledActivities]);

    // Extract unique report types from activities
    const reportTypeOptions = useMemo(() => {
        const types = Array.from(new Set(activitiesList.map(a => a.reportTypeName)));
        return ['All Report Types', ...types];
    }, [activitiesList]);

    const frequencyOptions = ['All Frequencies', 'Daily', 'Weekly', 'Biweekly', 'Monthly'];
    const statusOptions = [
        { id: 'all', label: 'All Status' },
        { id: 'due_today', label: 'Due Today' },
        { id: 'pending', label: 'Pending' },
        { id: 'completed', label: 'Done / Completed' },
    ];

    // Filter computation
    const isFiltered = selectedFrequency !== 'all' || selectedReportType !== 'all' || selectedStatus !== 'all';
    const activeFilterCount = (selectedFrequency !== 'all' ? 1 : 0) + (selectedReportType !== 'all' ? 1 : 0) + (selectedStatus !== 'all' ? 1 : 0);

    const filteredActivities = useMemo(() => {
        return activitiesList.filter(act => {
            if (selectedFrequency !== 'all' && act.frequency.toLowerCase() !== selectedFrequency.toLowerCase()) {
                return false;
            }
            if (selectedReportType !== 'all' && act.reportTypeName !== selectedReportType) {
                return false;
            }
            if (selectedStatus !== 'all' && act.status !== selectedStatus) {
                return false;
            }
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchName = act.activityName.toLowerCase().includes(q);
                const matchType = act.reportTypeName.toLowerCase().includes(q);
                const matchAssignee = act.assigneeName.toLowerCase().includes(q);
                if (!matchName && !matchType && !matchAssignee) return false;
            }
            return true;
        });
    }, [activitiesList, selectedFrequency, selectedReportType, selectedStatus, searchQuery]);

    // Grouping by date
    const todayItems = filteredActivities.filter(a => a.dueDate === '2026-09-13');
    const tomorrowItems = filteredActivities.filter(a => a.dueDate === '2026-09-14');
    const upcomingItems = filteredActivities.filter(a => a.dueDate > '2026-09-14');

    // Context Menu Actions for View Mode
    const viewModeActions: ContextMenuAction[] = [
        {
            title: 'Agenda View',
            systemIcon: 'list.bullet',
            state: viewMode === 'agenda' ? 'on' : 'off',
        },
        {
            title: 'Calendar View',
            systemIcon: 'calendar',
            state: viewMode === 'calendar' ? 'on' : 'off',
        },
    ];

    // Nested Context Menu Actions for Multi-layer Filters
    const filterActions: ContextMenuAction[] = [
        {
            title: 'Frequency',
            actions: frequencyOptions.map(f => ({
                title: f,
                state: (selectedFrequency === 'all' && f === 'All Frequencies') || selectedFrequency === f ? 'on' : 'off',
            })),
        },
        {
            title: 'Report Type',
            actions: reportTypeOptions.map(rt => ({
                title: rt,
                state: (selectedReportType === 'all' && rt === 'All Report Types') || selectedReportType === rt ? 'on' : 'off',
            })),
        },
        {
            title: 'Status',
            actions: statusOptions.map(st => ({
                title: st.label,
                state: selectedStatus === st.id ? 'on' : 'off',
            })),
        },
        ...(isFiltered ? [{
            title: 'Reset All Filters',
            destructive: true,
        }] : []),
    ];

    return (
        <ScrollView 
            style={styles.container}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
        >
            {/* Unified 1-Row Toolbar: Searchbar + View Mode + Filter */}
            <View style={styles.toolbarWrapper}>
                <View style={styles.toolbarRow}>
                    {/* Search Input Pill */}
                    <View style={[styles.searchBarPill, { backgroundColor: pillBg }]}>
                        <PlatformIcon name="magnifyingglass" size={14} tintColor={subtextColor} />
                        <TextInput
                            style={[styles.searchInput, { color: textColor }]}
                            placeholder="Search schedule..."
                            placeholderTextColor={subtextColor}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            clearButtonMode="while-editing"
                            returnKeyType="search"
                        />
                        {searchQuery.length > 0 && Platform.OS !== 'ios' && (
                            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.searchClearBtn}>
                                <PlatformIcon name="xmark.circle.fill" size={14} tintColor={subtextColor} />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* View Mode Context Menu Pill */}
                    <ContextMenu
                        actions={viewModeActions}
                        dropdownMenuMode={true}
                        onPress={(e) => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            if (e.nativeEvent.name === 'Agenda View') setViewMode('agenda');
                            else if (e.nativeEvent.name === 'Calendar View') setViewMode('calendar');
                        }}
                    >
                        <View style={[styles.toolbarActionPill, { backgroundColor: pillBg }]}>
                            <PlatformIcon
                                name={viewMode === 'agenda' ? 'list.bullet' : 'calendar'}
                                size={12}
                                tintColor={textColor}
                            />
                            <Text style={[styles.toolbarActionText, { color: textColor }]}>
                                {viewMode === 'agenda' ? 'Agenda' : 'Calendar'}
                            </Text>
                            <PlatformIcon name="chevron.down" size={10} tintColor={subtextColor} />
                        </View>
                    </ContextMenu>

                    {/* Filter Context Menu Pill */}
                    <ContextMenu
                        actions={filterActions}
                        dropdownMenuMode={true}
                        onPress={(e) => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            const title = e.nativeEvent.name;
                            if (title === 'Reset All Filters') {
                                setSelectedFrequency('all');
                                setSelectedReportType('all');
                                setSelectedStatus('all');
                                return;
                            }
                            if (frequencyOptions.includes(title)) {
                                setSelectedFrequency(title === 'All Frequencies' ? 'all' : title);
                                return;
                            }
                            if (reportTypeOptions.includes(title)) {
                                setSelectedReportType(title === 'All Report Types' ? 'all' : title);
                                return;
                            }
                            const foundStatus = statusOptions.find(s => s.label === title);
                            if (foundStatus) {
                                setSelectedStatus(foundStatus.id);
                                return;
                            }
                        }}
                    >
                        <View
                            style={[
                                styles.toolbarActionPill,
                                { backgroundColor: pillBg },
                                isFiltered && { backgroundColor: Colors[resolvedTheme].tint + '18' },
                            ]}
                        >
                            <PlatformIcon
                                name="line.3.horizontal.decrease"
                                size={12}
                                tintColor={isFiltered ? Colors[resolvedTheme].tint : subtextColor}
                            />
                            <Text
                                style={[
                                    styles.toolbarActionText,
                                    { color: isFiltered ? Colors[resolvedTheme].tint : textColor },
                                ]}
                            >
                                Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
                            </Text>
                            <PlatformIcon name="chevron.down" size={10} tintColor={subtextColor} />
                        </View>
                    </ContextMenu>
                </View>
            </View>

            {viewMode === 'calendar' ? (
                /* Simple Monthly Mini-Matrix View */
                <View style={[styles.calendarBox, { backgroundColor: cardBg, borderColor }]}>
                    <View style={styles.calHeader}>
                        <Text style={[styles.calMonthText, { color: textColor }]}>September 2026</Text>
                        <Text style={[styles.calSubText, { color: subtextColor }]}>JClub Operations Schedule</Text>
                    </View>
                    <View style={styles.calDaysRow}>
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                            <Text key={d} style={[styles.dayHeader, { color: subtextColor }]}>{d}</Text>
                        ))}
                    </View>
                    <View style={styles.calGrid}>
                        {Array.from({ length: 30 }).map((_, i) => {
                            const dayNum = i + 1;
                            const isToday = dayNum === 13;
                            const hasEvents = [1, 3, 7, 8, 13, 14, 16, 18, 20, 25, 27].includes(dayNum);
                            return (
                                <View key={dayNum} style={[styles.calCell, isToday && styles.calCellToday]}>
                                    <Text style={[
                                        styles.cellDayText, 
                                        { color: isToday ? '#FFFFFF' : textColor },
                                        isToday && { fontWeight: '700' }
                                    ]}>
                                        {dayNum}
                                    </Text>
                                    {hasEvents && (
                                        <View style={[styles.dotMarker, { backgroundColor: isToday ? '#FFFFFF' : '#14B8A6' }]} />
                                    )}
                                </View>
                            );
                        })}
                    </View>
                </View>
            ) : null}

            {/* Agenda Group: TODAY */}
            {todayItems.length > 0 && (
                <View style={styles.agendaGroup}>
                    <View style={styles.groupHeaderRow}>
                        <View style={styles.dateDot} />
                        <Text style={[styles.groupDateText, { color: textColor }]}>Today, 13 Sep 2026</Text>
                    </View>

                    <View style={styles.cardGroupList}>
                        {todayItems.map((act, idx) => (
                            <Animated.View key={act.id} entering={FadeInDown.delay(40 * idx).duration(250)}>
                                <ActivityScheduleCard 
                                    activity={act} 
                                    cardBg={cardBg}
                                    borderColor={borderColor}
                                    textColor={textColor}
                                    subtextColor={subtextColor}
                                    isDark={isDark}
                                    onOpenTask={(selected) => setSelectedTask(selected)}
                                />
                            </Animated.View>
                        ))}
                    </View>
                </View>
            )}

            {/* Agenda Group: TOMORROW */}
            {tomorrowItems.length > 0 && (
                <View style={styles.agendaGroup}>
                    <View style={styles.groupHeaderRow}>
                        <View style={[styles.dateDot, { backgroundColor: subtextColor }]} />
                        <Text style={[styles.groupDateText, { color: textColor }]}>Tomorrow, 14 Sep 2026</Text>
                    </View>

                    <View style={styles.cardGroupList}>
                        {tomorrowItems.map((act, idx) => (
                            <Animated.View key={act.id} entering={FadeInDown.delay(40 * idx).duration(250)}>
                                <ActivityScheduleCard 
                                    activity={act} 
                                    cardBg={cardBg}
                                    borderColor={borderColor}
                                    textColor={textColor}
                                    subtextColor={subtextColor}
                                    isDark={isDark}
                                    onOpenTask={(selected) => setSelectedTask(selected)}
                                />
                            </Animated.View>
                        ))}
                    </View>
                </View>
            )}

            {/* Agenda Group: UPCOMING */}
            {upcomingItems.length > 0 && (
                <View style={styles.agendaGroup}>
                    <View style={styles.groupHeaderRow}>
                        <View style={[styles.dateDot, { backgroundColor: subtextColor }]} />
                        <Text style={[styles.groupDateText, { color: textColor }]}>Later This Week</Text>
                    </View>

                    <View style={styles.cardGroupList}>
                        {upcomingItems.map((act, idx) => (
                            <Animated.View key={act.id} entering={FadeInDown.delay(40 * idx).duration(250)}>
                                <ActivityScheduleCard 
                                    activity={act} 
                                    cardBg={cardBg}
                                    borderColor={borderColor}
                                    textColor={textColor}
                                    subtextColor={subtextColor}
                                    isDark={isDark}
                                    onOpenTask={(selected) => setSelectedTask(selected)}
                                />
                            </Animated.View>
                        ))}
                    </View>
                </View>
            )}

            {/* Scheduled Task Detail Drawer */}
            <ScheduledTaskDetailSheet
                visible={!!selectedTask}
                activity={selectedTask}
                onClose={() => setSelectedTask(null)}
                onSaveActivity={(updated) => {
                    setActivitiesList((prev) =>
                        prev.map((a) => (a.id === updated.id ? updated : a))
                    );
                    setSelectedTask(updated);
                }}
                onOpenGlobalTasks={(act) => {
                    setSelectedTask(null);
                    onOpenTask(act);
                }}
            />
        </ScrollView>
    );
}

function ActivityScheduleCard({
    activity,
    cardBg,
    borderColor,
    textColor,
    subtextColor,
    isDark,
    onOpenTask,
}: {
    activity: ScheduledActivity;
    cardBg: string;
    borderColor: string;
    textColor: string;
    subtextColor: string;
    isDark: boolean;
    onOpenTask: (activity: ScheduledActivity) => void;
}) {
    const isCompleted = activity.status === 'completed';

    return (
        <TouchableOpacity 
            activeOpacity={0.7}
            onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onOpenTask(activity);
            }}
            style={[styles.scheduleCard, { backgroundColor: cardBg, borderColor }]}
        >
            <View style={styles.scheduleCardContent}>
                {/* Left: Title at top, Assignee & Report Type below */}
                <View style={styles.cardLeftCol}>
                    <Text style={[styles.activityTitle, { color: textColor }]}>
                        {activity.activityName}
                    </Text>
                    <Text style={[styles.activitySubtitle, { color: subtextColor }]}>
                        {activity.assigneeName} • {activity.reportTypeName}
                    </Text>
                </View>

                {/* Right: Status Pill & Frequency */}
                <View style={styles.cardRightCol}>
                    <View style={[
                        styles.statusPill, 
                        isCompleted ? styles.statusCompleted : styles.statusPending
                    ]}>
                        <Text style={[
                            styles.statusPillText, 
                            isCompleted ? { color: '#10B981' } : { color: '#007AFF' }
                        ]}>
                            {isCompleted ? 'Done' : activity.dueTime}
                        </Text>
                    </View>
                    <Text style={[styles.freqText, { color: subtextColor }]}>
                        {activity.frequency}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentContainer: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 40,
        gap: 16,
    },
    toolbarWrapper: {
        marginBottom: 4,
    },
    toolbarRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    searchBarPill: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        height: 40,
        borderRadius: 999,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        padding: 0,
        height: '100%',
    },
    searchClearBtn: {
        padding: 2,
    },
    toolbarActionPill: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 40,
        paddingHorizontal: 14,
        borderRadius: 999,
        gap: 6,
    },
    toolbarActionText: {
        fontSize: 13,
        fontWeight: '500',
    },
    calendarBox: {
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        gap: 12,
    },
    calHeader: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
    },
    calMonthText: {
        fontSize: 16,
        fontWeight: '700',
    },
    calSubText: {
        fontSize: 12,
    },
    calDaysRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
    },
    dayHeader: {
        width: 38,
        textAlign: 'center',
        fontSize: 11,
        fontWeight: '600',
    },
    calGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 6,
    },
    calCell: {
        width: 38,
        height: 38,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    calCellToday: {
        backgroundColor: '#14B8A6',
    },
    cellDayText: {
        fontSize: 13,
        fontWeight: '500',
    },
    dotMarker: {
        width: 4,
        height: 4,
        borderRadius: 2,
        marginTop: 2,
    },
    agendaGroup: {
        gap: 10,
    },
    groupHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 4,
    },
    dateDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#14B8A6',
    },
    groupDateText: {
        fontSize: 14,
        fontWeight: '700',
    },
    cardGroupList: {
        gap: 10,
    },
    scheduleCard: {
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 18,
        borderWidth: 1,
    },
    scheduleCardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    cardLeftCol: {
        flex: 1,
        gap: 4,
    },
    activityTitle: {
        fontSize: 15,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    activitySubtitle: {
        fontSize: 13,
        fontWeight: '400',
    },
    cardRightCol: {
        alignItems: 'flex-end',
        gap: 4,
    },
    statusPill: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    statusCompleted: {
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
    },
    statusPending: {
        backgroundColor: 'rgba(0, 122, 255, 0.12)',
    },
    statusPillText: {
        fontSize: 11,
        fontWeight: '600',
    },
    freqText: {
        fontSize: 12,
        fontWeight: '500',
    },
});
