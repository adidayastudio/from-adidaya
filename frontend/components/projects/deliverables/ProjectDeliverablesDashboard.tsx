import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StyleSheet
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
    StageInfo,
    getProjectStageList,
    calculateDeliverablesProgress
} from '@/lib/projectDeliverables';

interface ProjectDeliverablesDashboardProps {
    project: any;
    isDark: boolean;
    onOpenStageEditor: (stageCode: string, sectionCode?: string) => void;
}

export function ProjectDeliverablesDashboard({
    project,
    isDark,
    onOpenStageEditor
}: ProjectDeliverablesDashboardProps) {
    const text = isDark ? '#FFFFFF' : '#1C1C1E';
    const secondary = isDark ? '#9898A2' : '#73737D';
    const cardBg = isDark ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF';
    const cardBorder = isDark ? 'rgba(255, 255, 255, 0.08)' : 'transparent';
    const borderWidth = isDark ? 1 : 0;
    const pillBg = isDark ? 'rgba(255, 255, 255, 0.06)' : '#F2F2F7';
    const pillBorder = isDark ? 'rgba(255, 255, 255, 0.1)' : 'transparent';
    const blueActive = isDark ? '#3B82F6' : '#007AFF';
    const expandedCardBg = isDark ? 'rgba(18, 38, 70, 0.55)' : '#EDF5FF';

    const stages = useMemo(() => getProjectStageList(project.meta), [project.meta]);
    const deliverablesData = project.meta?.stageDeliverables || {};
    const progress = useMemo(() => calculateDeliverablesProgress(stages, deliverablesData), [stages, deliverablesData]);

    // Accordion expanded state: only expand the single current/first incomplete stage by default
    const [expandedStages, setExpandedStages] = useState<Set<string>>(() => {
        const firstIncomplete = stages.find(s => {
            const stg = progress.stageProgress[s.code];
            return !stg || !stg.isReady;
        });
        const defaultCode = firstIncomplete?.code || progress.activeStageCode || stages[0]?.code || '01-KO';
        return new Set([defaultCode]);
    });

    const toggleExpand = (code: string) => {
        setExpandedStages(prev => {
            const next = new Set(prev);
            if (next.has(code)) next.delete(code);
            else next.add(code);
            return next;
        });
    };

    const activeStageName = stages.find(s => s.code === progress.activeStageCode)?.fullName || '01-KO Kickoff';

    return (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.container}>
            {/* ---------------- Top 3 Statcards (Icon on Left, Percentage on Right, Title/Desc Below) ---------------- */}
            <View style={styles.kpiRow}>
                {/* Statcard 1: Overall Deliverables Progress */}
                <View style={[styles.kpiCard, { backgroundColor: cardBg, borderColor: cardBorder, borderWidth }]}>
                    <View style={styles.kpiTopRow}>
                        <Ionicons name="document-text-outline" size={20} color={secondary} />
                        <Text style={[styles.kpiValue, { color: text }]}>{progress.overallPercent}%</Text>
                    </View>
                    <View style={styles.kpiBottomBlock}>
                        <Text style={[styles.kpiLabel, { color: text }]}>Overall Deliverables Progress</Text>
                        <View style={[styles.kpiSubRow, { backgroundColor: pillBg, borderColor: pillBorder, borderWidth }]}>
                            <Text style={[styles.kpiSubText, { color: secondary }]}>
                                {progress.readyStagesCount}/{progress.totalStagesCount} Stages Ready
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Statcard 2: Active Deliverable Stage */}
                <View style={[styles.kpiCard, { backgroundColor: cardBg, borderColor: cardBorder, borderWidth }]}>
                    <View style={styles.kpiTopRow}>
                        <Ionicons name="layers-outline" size={20} color={secondary} />
                        <Text style={[styles.kpiValueSmall, { color: text }]}>{progress.activeStageCode}</Text>
                    </View>
                    <View style={styles.kpiBottomBlock}>
                        <Text style={[styles.kpiLabel, { color: text }]}>Active Deliverable Stage</Text>
                        <Text numberOfLines={1} style={[styles.kpiActiveStageText, { color: secondary }]}>
                            {activeStageName}
                        </Text>
                    </View>
                </View>

                {/* Statcard 3: Sub-deliverables Items */}
                <View style={[styles.kpiCard, { backgroundColor: cardBg, borderColor: cardBorder, borderWidth }]}>
                    <View style={styles.kpiTopRow}>
                        <Ionicons name="checkbox-outline" size={20} color={secondary} />
                        <Text style={[styles.kpiValue, { color: text }]}>
                            {progress.completedItemsCount} / {progress.totalItemsCount}
                        </Text>
                    </View>
                    <View style={styles.kpiBottomBlock}>
                        <Text style={[styles.kpiLabel, { color: text }]}>Sub-deliverables Items</Text>
                        <View style={[styles.kpiSubRow, { backgroundColor: pillBg, borderColor: pillBorder, borderWidth }]}>
                            <Text style={[styles.kpiSubText, { color: progress.overallPercent > 0 ? '#10B981' : secondary }]}>
                                {progress.overallPercent}% Items Done
                            </Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* ---------------- List of Stages Accordions ---------------- */}
            <View style={{ gap: 12 }}>
                {stages.map(stage => {
                    const stgProg = progress.stageProgress[stage.code] || {
                        total: stage.sections.length,
                        completed: 0,
                        percent: 0,
                        isReady: false,
                        subDeliverableStatus: {}
                    };
                    const isExpanded = expandedStages.has(stage.code);

                    return (
                        <View
                            key={stage.code}
                            style={[
                                styles.stageAccordionCard,
                                {
                                    backgroundColor: isExpanded ? expandedCardBg : cardBg,
                                    borderColor: isExpanded && !isDark ? '#007AFF' : cardBorder,
                                    borderWidth: isExpanded && !isDark ? 1 : borderWidth
                                }
                            ]}
                        >
                            {/* Stage Header */}
                            <View style={styles.stageHeaderRow}>
                                <TouchableOpacity
                                    accessibilityLabel={`Toggle ${stage.fullName}`}
                                    onPress={() => toggleExpand(stage.code)}
                                    style={styles.stageTitleGroup}
                                >
                                    <Ionicons
                                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                                        size={16}
                                        color={secondary}
                                    />
                                    {/* Stage Code Pill Badge */}
                                    <View
                                        style={[
                                            styles.stageBadgePill,
                                            {
                                                backgroundColor: isExpanded ? (isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 122, 255, 0.12)') : pillBg,
                                                borderColor: pillBorder,
                                                borderWidth
                                            }
                                        ]}
                                    >
                                        <Text style={[styles.stageBadgeText, { color: isExpanded ? (isDark ? '#93C5FD' : '#007AFF') : text }]}>
                                            {stage.code}
                                        </Text>
                                    </View>
                                    {/* Stage Title */}
                                    <Text style={[styles.stageTitle, { color: text }]}>{stage.name}</Text>
                                </TouchableOpacity>

                                {/* Right Controls: Status Pill + Mini Progress Bar + Edit Pill Button */}
                                <View style={styles.stageRightControls}>
                                    <View
                                        style={[
                                            styles.completionStatusPill,
                                            { backgroundColor: pillBg, borderColor: pillBorder, borderWidth }
                                        ]}
                                    >
                                        <Ionicons
                                            name={stgProg.isReady ? 'checkmark-circle' : 'ellipse-outline'}
                                            size={12}
                                            color={stgProg.isReady ? '#10B981' : secondary}
                                        />
                                        <Text
                                            style={[
                                                styles.completionStatusText,
                                                { color: stgProg.isReady ? '#10B981' : secondary }
                                            ]}
                                        >
                                            {stgProg.isReady
                                                ? `100% Complete (${stgProg.total}/${stgProg.total})`
                                                : `${stgProg.percent}% Complete (${stgProg.completed}/${stgProg.total})`}
                                        </Text>
                                    </View>

                                    {/* Mini Progress Bar */}
                                    <View style={[styles.miniProgressBarTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]}>
                                        <View
                                            style={[
                                                styles.miniProgressBarFill,
                                                {
                                                    width: `${Math.max(4, stgProg.percent)}%`,
                                                    backgroundColor: stgProg.isReady
                                                        ? '#10B981'
                                                        : (isExpanded ? blueActive : (isDark ? 'rgba(255,255,255,0.5)' : '#4B5563'))
                                                }
                                            ]}
                                        />
                                    </View>

                                    {/* Edit Deliverables Button (Pill & Blue when Expanded) */}
                                    <TouchableOpacity
                                        accessibilityLabel={`Edit ${stage.fullName}`}
                                        onPress={() => onOpenStageEditor(stage.code)}
                                        style={[
                                            styles.editButton,
                                            {
                                                backgroundColor: isExpanded ? blueActive : pillBg,
                                                borderColor: isExpanded ? blueActive : pillBorder,
                                                borderWidth: isExpanded ? 0 : borderWidth
                                            }
                                        ]}
                                    >
                                        <Ionicons
                                            name="pencil-outline"
                                            size={13}
                                            color={isExpanded ? '#FFFFFF' : text}
                                        />
                                        <Text
                                            style={[
                                                styles.editButtonText,
                                                { color: isExpanded ? '#FFFFFF' : text }
                                            ]}
                                        >
                                            Edit
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Sub-deliverables Items Grid (Visible when expanded) */}
                            {isExpanded && (
                                <View style={[styles.subDeliverablesGrid, { borderTopColor: isDark ? cardBorder : 'rgba(0, 0, 0, 0.06)' }]}>
                                    {stage.sections.map((section, idx) => {
                                        const isDone = stgProg.subDeliverableStatus[section.code];
                                        const numStr = String(idx + 1).padStart(2, '0');

                                        return (
                                            <TouchableOpacity
                                                key={section.code}
                                                accessibilityLabel={`Open ${section.title}`}
                                                onPress={() => onOpenStageEditor(stage.code, section.code)}
                                                style={[
                                                    styles.subDeliverablePillCard,
                                                    {
                                                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : '#FFFFFF',
                                                        borderColor: pillBorder,
                                                        borderWidth
                                                    }
                                                ]}
                                            >
                                                {/* Circle Number Box */}
                                                <View style={[styles.subNumberBoxCircle, { backgroundColor: pillBg }]}>
                                                    <Text style={[styles.subNumberText, { color: secondary }]}>{numStr}</Text>
                                                </View>

                                                <Text numberOfLines={1} style={[styles.subTitleText, { color: text }]}>
                                                    {section.title}
                                                </Text>

                                                <View style={{ marginLeft: 'auto' }}>
                                                    <Ionicons
                                                        name={isDone ? 'checkmark-circle' : 'checkmark-circle-outline'}
                                                        size={16}
                                                        color={isDone ? '#10B981' : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)')}
                                                    />
                                                </View>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            )}
                        </View>
                    );
                })}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        maxWidth: 960,
        alignSelf: 'center',
        padding: 24,
        paddingBottom: 80
    },
    kpiRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
        flexWrap: 'wrap'
    },
    kpiCard: {
        flex: 1,
        minWidth: 200,
        borderRadius: 14,
        padding: 16,
        gap: 12,
        justifyContent: 'space-between'
    },
    kpiTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    kpiBottomBlock: {
        gap: 6
    },
    kpiValue: {
        fontSize: 22,
        fontWeight: '700',
        letterSpacing: -0.5
    },
    kpiValueSmall: {
        fontSize: 18,
        fontWeight: '700'
    },
    kpiLabel: {
        fontSize: 12,
        fontWeight: '600'
    },
    kpiSubRow: {
        alignSelf: 'flex-start',
        paddingHorizontal: 9,
        paddingVertical: 3,
        borderRadius: 999
    },
    kpiSubText: {
        fontSize: 10,
        fontWeight: '500'
    },
    kpiActiveStageText: {
        fontSize: 11,
        fontWeight: '500'
    },
    stageAccordionCard: {
        borderRadius: 16,
        overflow: 'hidden'
    },
    stageHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexWrap: 'wrap',
        gap: 10
    },
    stageTitleGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
        minWidth: 180
    },
    stageBadgePill: {
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 999
    },
    stageBadgeText: {
        fontSize: 11,
        fontWeight: '700'
    },
    stageTitle: {
        fontSize: 14,
        fontWeight: '600'
    },
    stageRightControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10
    },
    completionStatusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 999
    },
    completionStatusText: {
        fontSize: 11,
        fontWeight: '500'
    },
    miniProgressBarTrack: {
        width: 60,
        height: 4,
        borderRadius: 2,
        overflow: 'hidden'
    },
    miniProgressBarFill: {
        height: '100%',
        borderRadius: 2
    },
    editButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 13,
        paddingVertical: 5,
        borderRadius: 999
    },
    editButtonText: {
        fontSize: 11,
        fontWeight: '600'
    },
    subDeliverablesGrid: {
        borderTopWidth: 1,
        padding: 12,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8
    },
    subDeliverablePillCard: {
        flex: 1,
        minWidth: 260,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 12,
        paddingVertical: 9,
        borderRadius: 10
    },
    subNumberBoxCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center'
    },
    subNumberText: {
        fontSize: 10,
        fontWeight: '700'
    },
    subTitleText: {
        fontSize: 12,
        fontWeight: '500',
        flex: 1
    }
});
