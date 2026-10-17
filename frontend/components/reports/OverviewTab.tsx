import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/theme';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { FinanceSummaryCard } from '@/components/finance/FinanceSummaryCard';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { 
    ReportType, 
    ScheduledActivity, 
    ReportEntry, 
    ReportDocument 
} from './types';

interface OverviewTabProps {
    reportTypes: ReportType[];
    scheduledActivities: ScheduledActivity[];
    recentEntries: ReportEntry[];
    recentDocuments: ReportDocument[];
    onSelectReportType: (reportType: ReportType) => void;
    onSelectEntry: (entry: ReportEntry) => void;
    onSelectDocument: (doc: ReportDocument) => void;
    onNavigateToTab: (tabId: string) => void;
    onOpenTask: (activity: ScheduledActivity) => void;
}

export function OverviewTab({
    reportTypes,
    scheduledActivities,
    recentEntries,
    recentDocuments,
    onSelectReportType,
    onSelectEntry,
    onSelectDocument,
    onNavigateToTab,
    onOpenTask,
}: OverviewTabProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';
    const cardBg = isDark ? '#1C1C1E' : '#FFFFFF';
    const borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)';

    const stats = [
        { label: 'Due Today', value: '3', sub: '3 routines', color: '#0284C7', icon: 'calendar' as any },
        { label: 'Upcoming', value: '5', sub: 'This week', color: '#14B8A6', icon: 'clock.fill' as any },
        { label: 'Overdue', value: '0', sub: 'All clear', color: '#10B981', icon: 'checkmark.circle.fill' as any },
        { label: 'Awaiting Review', value: '1', sub: '1 document', color: '#F59E0B', icon: 'hourglass' as any },
        { label: 'Completed (Wk)', value: '40', sub: '92% rate', color: '#10B981', icon: 'checkmark.seal.fill' as any },
    ];

    return (
        <ScrollView 
            style={styles.container}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
        >
            {/* Stat Cards - Styled identical to Finance module */}
            <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.statsScroll}
                contentContainerStyle={styles.statsScrollContent}
            >
                {stats.map((stat) => (
                    <FinanceSummaryCard
                        key={stat.label}
                        icon={stat.icon}
                        iconColor={stat.color}
                        value={stat.value}
                        label={stat.label}
                        subValue={stat.sub}
                        style={{
                            width: 140,
                            marginRight: 10,
                            marginBottom: 0,
                            backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                            borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
                            borderWidth: 1,
                        }}
                    />
                ))}
            </ScrollView>

            {/* Active Report Types - Horizontal Colored Cards (Max 5) */}
            <View style={styles.sectionBlock}>
                <TouchableOpacity 
                    style={styles.subSectionHeader}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        onNavigateToTab('library');
                    }}
                >
                    <Text style={[styles.subSectionTitle, { color: textColor }]}>Active Report Types</Text>
                    <PlatformIcon name="chevron.right" size={14} tintColor={subtextColor} style={styles.chevronIcon} />
                </TouchableOpacity>

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.horizontalCardScroll}
                    contentContainerStyle={styles.horizontalCardScrollContent}
                >
                    {reportTypes.slice(0, 5).map((rt) => {
                        const ratioText = rt.periodSummaryText.match(/\d+\s*\/\s*\d+/)?.[0] || `${rt.activeActivitiesCount} acts`;
                        return (
                            <TouchableOpacity
                                key={rt.id}
                                activeOpacity={0.85}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    onSelectReportType(rt);
                                }}
                                style={[styles.coloredReportCardWrapper, { shadowColor: rt.color }]}
                            >
                                <LinearGradient
                                    colors={[rt.color, rt.colorEnd || rt.color]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.coloredReportCard}
                                >
                                    <View style={styles.coloredCardTop}>
                                        <View style={styles.coloredIconCircle}>
                                            <PlatformIcon name={rt.icon as any} size={18} tintColor="#FFFFFF" />
                                        </View>
                                        <Text style={styles.coloredRateText}>{rt.completionRate}%</Text>
                                    </View>

                                    <View style={styles.coloredCardBottom}>
                                        <View style={styles.titleRatioRow}>
                                            <Text style={styles.coloredTitle} numberOfLines={1}>
                                                {rt.name}
                                            </Text>
                                            <Text style={styles.coloredRatioText}>
                                                {ratioText}
                                            </Text>
                                        </View>

                                        {/* Progress Bar */}
                                        <View style={styles.progressBarTrack}>
                                            <View 
                                                style={[
                                                    styles.progressBarFill, 
                                                    { width: `${Math.min(Math.max(rt.completionRate, 0), 100)}%` }
                                                ]} 
                                            />
                                        </View>
                                    </View>
                                </LinearGradient>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {/* Upcoming Activities */}
            <View style={styles.sectionBlock}>
                <TouchableOpacity 
                    style={styles.subSectionHeader}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        onNavigateToTab('schedule');
                    }}
                >
                    <Text style={[styles.subSectionTitle, { color: textColor }]}>Upcoming Activities</Text>
                    <PlatformIcon name="chevron.right" size={14} tintColor={subtextColor} style={styles.chevronIcon} />
                </TouchableOpacity>

                <View style={styles.cardList}>
                    {scheduledActivities.slice(0, 3).map((act) => (
                        <TouchableOpacity
                            key={act.id}
                            activeOpacity={0.75}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                onOpenTask(act);
                            }}
                            style={[styles.simpleCard, { backgroundColor: cardBg, borderColor }]}
                        >
                            <Text style={[styles.cardTitle, { color: textColor }]}>
                                {act.activityName}
                            </Text>
                            <Text style={[styles.cardSubtext, { color: subtextColor }]}>
                                {act.assigneeName} • {act.frequency}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Recent Submissions */}
            <View style={styles.sectionBlock}>
                <TouchableOpacity 
                    style={styles.subSectionHeader}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        onNavigateToTab('records');
                    }}
                >
                    <Text style={[styles.subSectionTitle, { color: textColor }]}>Recent Submissions</Text>
                    <PlatformIcon name="chevron.right" size={14} tintColor={subtextColor} style={styles.chevronIcon} />
                </TouchableOpacity>

                <View style={styles.cardList}>
                    {recentEntries.slice(0, 2).map((entry) => (
                        <TouchableOpacity
                            key={entry.id}
                            activeOpacity={0.75}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                onSelectEntry(entry);
                            }}
                            style={[styles.simpleCard, { backgroundColor: cardBg, borderColor }]}
                        >
                            <View style={styles.cardRow}>
                                <Text style={[styles.cardTitle, { color: textColor, flex: 1 }]} numberOfLines={1}>
                                    {entry.activityName}
                                </Text>
                                <Text style={[
                                    styles.statusTag,
                                    entry.condition === 'Normal' ? { color: '#10B981' } : { color: '#F59E0B' }
                                ]}>
                                    {entry.condition}
                                </Text>
                            </View>
                            <Text style={[styles.cardSubtext, { color: subtextColor }]} numberOfLines={1}>
                                {entry.submittedBy.name} • {entry.reportTypeName} • {entry.submittedDate}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Latest Documents */}
            <View style={styles.sectionBlock}>
                <TouchableOpacity 
                    style={styles.subSectionHeader}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        onNavigateToTab('records');
                    }}
                >
                    <Text style={[styles.subSectionTitle, { color: textColor }]}>Latest Documents</Text>
                    <PlatformIcon name="chevron.right" size={14} tintColor={subtextColor} style={styles.chevronIcon} />
                </TouchableOpacity>

                <View style={styles.cardList}>
                    {recentDocuments.slice(0, 2).map((doc) => (
                        <TouchableOpacity
                            key={doc.id}
                            activeOpacity={0.75}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                onSelectDocument(doc);
                            }}
                            style={[styles.simpleCard, { backgroundColor: cardBg, borderColor }]}
                        >
                            <Text style={[styles.cardTitle, { color: textColor }]} numberOfLines={1}>
                                {doc.title}
                            </Text>
                            <Text style={[styles.cardSubtext, { color: subtextColor }]}>
                                {doc.periodType} • {doc.period}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentContainer: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 40,
        gap: 16,
    },
    statsScroll: {
        marginHorizontal: -16,
        marginBottom: 2,
    },
    statsScrollContent: {
        paddingHorizontal: 16,
    },
    sectionBlock: {
        gap: 8,
    },
    subSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 2,
        paddingVertical: 2,
    },
    subSectionTitle: {
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: -0.4,
    },
    chevronIcon: {
        marginLeft: 6,
    },
    cardList: {
        gap: 8,
    },
    simpleCard: {
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
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
        fontSize: 15,
        fontWeight: '600',
    },
    rateText: {
        fontSize: 14,
        fontWeight: '700',
    },
    cardSubtext: {
        fontSize: 13,
        fontWeight: '400',
    },
    statusTag: {
        fontSize: 12,
        fontWeight: '700',
    },
    horizontalCardScroll: {
        marginHorizontal: -16,
    },
    horizontalCardScrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 4,
    },
    coloredReportCardWrapper: {
        borderRadius: 20,
        marginRight: 12,
        ...Platform.select({
            ios: {
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.16,
                shadowRadius: 8,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    coloredReportCard: {
        width: 195,
        height: 122,
        borderRadius: 20,
        padding: 14,
        justifyContent: 'space-between',
    },
    coloredCardTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    coloredIconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255, 255, 255, 0.22)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    coloredRateText: {
        color: '#FFFFFF',
        fontSize: 19,
        fontWeight: '700',
        letterSpacing: -0.4,
    },
    coloredCardBottom: {
        gap: 8,
    },
    titleRatioRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 6,
    },
    coloredTitle: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: -0.3,
        flex: 1,
    },
    coloredRatioText: {
        color: 'rgba(255, 255, 255, 0.92)',
        fontSize: 12,
        fontWeight: '700',
    },
    progressBarTrack: {
        height: 5,
        borderRadius: 3,
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3,
        backgroundColor: '#FFFFFF',
    },
});
