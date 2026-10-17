import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/theme';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { LinearGradient } from 'expo-linear-gradient';
import { BouncyGlassButton } from '@/components/ui/BouncyGlassButton';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { ReportType } from './types';

interface LibraryTabProps {
    reportTypes: ReportType[];
    onSelectReportType: (reportType: ReportType) => void;
    onCreateReportType: () => void;
    onOpenTasksForReportType: (reportType: ReportType) => void;
}

export function LibraryTab({
    reportTypes,
    onSelectReportType,
    onCreateReportType,
    onOpenTasksForReportType,
}: LibraryTabProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';
    const cardBg = isDark ? '#1C1C1E' : '#FFFFFF';
    const borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)';

    // Track which cards are expanded
    const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

    const toggleExpand = (id: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));
    };

    return (
        <ScrollView 
            style={styles.container}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
        >
            <View style={styles.cardList}>
                {reportTypes.map((rt, idx) => {
                    const isExpanded = !!expandedIds[rt.id];

                    return (
                        <Animated.View 
                            key={rt.id}
                            entering={FadeInDown.delay(50 * idx).duration(250)}
                            layout={Layout.springify()}
                        >
                            <View style={[styles.cleanCard, { backgroundColor: cardBg, borderColor }]}>
                                {/* Main Card Header: Full Rounded Gradient Icon, Title, Subtitle, Expand Trigger */}
                                <TouchableOpacity
                                    activeOpacity={0.75}
                                    onPress={() => toggleExpand(rt.id)}
                                    style={styles.cardMainRow}
                                >
                                    <LinearGradient
                                        colors={[rt.color, rt.colorEnd]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={styles.roundIcon}
                                    >
                                        <PlatformIcon name={rt.icon as any} size={18} tintColor="#FFFFFF" />
                                    </LinearGradient>

                                    <View style={styles.cardTextBox}>
                                        <View style={styles.titleRow}>
                                            <Text style={[styles.cardTitle, { color: textColor }]}>{rt.name}</Text>
                                            <Text style={[styles.rateText, { color: rt.color }]}>{rt.completionRate}%</Text>
                                        </View>
                                        <Text 
                                            style={[styles.cardSubtitle, { color: subtextColor }]} 
                                            numberOfLines={isExpanded ? undefined : 1}
                                        >
                                            {rt.shortDescription}
                                        </Text>
                                    </View>

                                    <TouchableOpacity 
                                        onPress={() => toggleExpand(rt.id)}
                                        style={styles.chevronBtn}
                                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                    >
                                        <PlatformIcon 
                                            name={isExpanded ? 'chevron.up' : 'chevron.down'} 
                                            size={12} 
                                            tintColor={subtextColor} 
                                        />
                                    </TouchableOpacity>
                                </TouchableOpacity>

                                {/* Progress Bar & Period Summary */}
                                <View style={styles.progressBlock}>
                                    <View style={[styles.progressBarTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                                        <View 
                                            style={[
                                                styles.progressBarFill, 
                                                { 
                                                    width: `${rt.completionRate}%`,
                                                    backgroundColor: rt.color 
                                                }
                                            ]} 
                                        />
                                    </View>
                                    <View style={styles.summaryRow}>
                                        <Text style={[styles.summaryText, { color: subtextColor }]}>
                                            {rt.periodSummaryText}
                                        </Text>
                                        <Text style={[styles.routinesCountText, { color: subtextColor }]}>
                                            {rt.activeActivitiesCount} routines
                                        </Text>
                                    </View>
                                </View>

                                {/* Expandable Section: Clean Routines & Bouncy Glass Buttons */}
                                {isExpanded && (
                                    <View style={[styles.expandedContent, { borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                                        <View style={styles.routinesList}>
                                            {rt.activities.map((act) => (
                                                <View key={act.id} style={styles.routineItem}>
                                                    <Text style={[styles.routineName, { color: textColor }]} numberOfLines={1}>
                                                        {act.name}
                                                    </Text>
                                                    <Text style={[styles.routineFreq, { color: subtextColor }]}>
                                                        {act.frequency}
                                                    </Text>
                                                </View>
                                            ))}
                                        </View>

                                        <View style={styles.expandedActionsRow}>
                                            <BouncyGlassButton
                                                isPill
                                                isGlass
                                                isDark={isDark}
                                                textColor={textColor}
                                                onPress={() => onOpenTasksForReportType(rt)}
                                                style={styles.glassActionBtn}
                                            >
                                                <View style={styles.btnInner}>
                                                    <PlatformIcon name="checkmark.square" size={14} tintColor={textColor} />
                                                    <Text style={[styles.btnInnerText, { color: textColor }]}>Open Tasks</Text>
                                                </View>
                                            </BouncyGlassButton>

                                            <BouncyGlassButton
                                                isPill
                                                isGlass
                                                isDark={isDark}
                                                textColor={textColor}
                                                onPress={() => onSelectReportType(rt)}
                                                style={styles.glassActionBtn}
                                            >
                                                <View style={styles.btnInner}>
                                                    <Text style={[styles.btnInnerText, { color: textColor }]}>Details</Text>
                                                    <PlatformIcon name="chevron.right" size={12} tintColor={subtextColor} />
                                                </View>
                                            </BouncyGlassButton>
                                        </View>
                                    </View>
                                )}
                            </View>
                        </Animated.View>
                    );
                })}
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
    },
    cardList: {
        gap: 10,
    },
    cleanCard: {
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        gap: 12,
    },
    cardMainRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    roundIcon: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 1,
    },
    cardTextBox: {
        flex: 1,
        gap: 3,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    rateText: {
        fontSize: 14,
        fontWeight: '700',
    },
    cardSubtitle: {
        fontSize: 13,
        fontWeight: '400',
        lineHeight: 18,
    },
    chevronBtn: {
        padding: 4,
        marginLeft: 2,
        marginTop: 2,
    },
    progressBlock: {
        gap: 6,
    },
    progressBarTrack: {
        height: 5,
        borderRadius: 2.5,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 2.5,
    },
    summaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    summaryText: {
        fontSize: 12,
        fontWeight: '500',
    },
    routinesCountText: {
        fontSize: 12,
        fontWeight: '500',
    },
    expandedContent: {
        borderTopWidth: 1,
        paddingTop: 12,
        gap: 14,
    },
    routinesList: {
        gap: 9,
    },
    routineItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 2,
    },
    routineName: {
        flex: 1,
        fontSize: 13,
        fontWeight: '500',
    },
    routineFreq: {
        fontSize: 12,
        marginLeft: 8,
    },
    expandedActionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 2,
        gap: 10,
    },
    glassActionBtn: {
        flex: 1,
        height: 38,
        borderRadius: 19,
        backgroundColor: 'rgba(142, 142, 147, 0.12)',
    },
    btnInner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    btnInnerText: {
        fontSize: 13,
        fontWeight: '600',
    },
});
