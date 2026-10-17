import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { GlassView } from '@/components/ui/GlassView';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { useUserContext } from '@/context/UserProvider';
import { supabase } from '@/lib/supabase';

interface PerformanceTabProps {
    isDark: boolean;
    textColor: string;
    subtextColor: string;
}

export function PerformanceTab({ isDark, textColor, subtextColor }: PerformanceTabProps) {
    const { user, profile } = useUserContext();
    const [snapshot, setSnapshot] = useState<any>(null);
    const [teamSnapshot, setTeamSnapshot] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    const borderColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';

    useEffect(() => {
        const fetchPerformanceData = async () => {
            if (!user?.id) return;
            setIsLoading(true);
            try {
                // Fetch user's latest performance snapshot
                const { data: userSnap, error: userError } = await supabase
                    .from('people_performance_snapshots')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('period', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (userSnap) {
                    setSnapshot(userSnap);

                    // Fetch corresponding team average for benchmarking
                    if (profile?.department) {
                        const { data: teamSnap } = await supabase
                            .from('team_performance_snapshots')
                            .select('*')
                            .eq('department', profile.department)
                            .eq('period', userSnap.period)
                            .maybeSingle();
                        if (teamSnap) {
                            setTeamSnapshot(teamSnap);
                        }
                    }
                }
            } catch (err) {
                console.error('Error fetching performance data:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchPerformanceData();
    }, [user?.id, profile?.department]);

    if (isLoading) {
        return (
            <View style={s.loadingContainer}>
                <ActivityIndicator size="small" color={isDark ? '#FFF' : '#000'} />
            </View>
        );
    }

    if (!snapshot) {
        const cardBorderColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
        const accentColor = '#1677D2';

        return (
            <GlassView 
                intensity={isDark ? 10 : 25} 
                style={[
                    s.comingSoonCard, 
                    { 
                        borderColor: cardBorderColor, 
                        borderWidth: 1,
                        backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.7)'
                    }
                ]}
            >
                <View style={s.comingSoonHeader}>
                    <View style={[s.comingSoonIconBox, { backgroundColor: `${accentColor}15` }]}>
                        <PlatformIcon name="chart.bar.fill" size={24} tintColor={accentColor} />
                    </View>
                    <View style={[s.comingSoonBadge, { backgroundColor: `${accentColor}15` }]}>
                        <Text style={[s.comingSoonBadgeText, { color: accentColor }]}>NO DATA</Text>
                    </View>
                </View>
                
                <Text style={[s.comingSoonTitle, { color: textColor }]}>Performance Index</Text>
                <Text style={[s.comingSoonDesc, { color: subtextColor }]}>
                    Your performance timeline, score benchmark, and key metric reviews will appear here once recorded by your organization administrator.
                </Text>
                
                {/* Visual preview placeholder to make it look active and high-fidelity */}
                <View style={[s.comingSoonPreview, { borderColor: cardBorderColor, backgroundColor: isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)' }]}>
                    <View style={s.previewRow}>
                        <View style={[s.previewDot, { backgroundColor: accentColor, opacity: 0.3 }]} />
                        <View style={[s.previewLineShort, { backgroundColor: textColor, opacity: 0.15 }]} />
                    </View>
                    <View style={s.previewRow}>
                        <View style={[s.previewDot, { backgroundColor: accentColor, opacity: 0.15 }]} />
                        <View style={[s.previewLineLong, { backgroundColor: textColor, opacity: 0.1 }]} />
                    </View>
                </View>
            </GlassView>
        );
    }

    const kpis = [
        { id: 'overall', title: 'OVERALL SCORE', value: Math.round(Number(snapshot.computed_index || 0)).toString(), color: '#4A55A2', isMain: true },
        { id: 'attendance', title: 'ATTENDANCE', value: `${Math.round(Number(snapshot.attendance_score || 0))}%`, icon: 'clock' },
        { id: 'completion', title: 'TASK COMPLETION', value: Math.round(Number(snapshot.task_completion_score || 0)).toString(), icon: 'target' },
        { id: 'projectinv', title: 'PROJECT INV.', value: `${Math.round(Number(snapshot.project_involvement_score || 0))}%`, icon: 'chart.line.uptrend.xyaxis' },
        { id: 'quality', title: 'TASK QUALITY', value: Math.round(Number(snapshot.quality_score || 0)).toString(), icon: 'waveform.path.ecg' },
    ];

    return (
        <View style={s.performanceContainer}>
            {/* Horizontal Scrolling KPI Cards */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.kpiScrollContent}
                decelerationRate="fast"
                snapToInterval={160 + 12} // Card width + gap
            >
                {kpis.map((kpi) => {
                    if (kpi.isMain) {
                        return (
                            <View key={kpi.id} style={[s.kpiCard, s.kpiCardMain, { backgroundColor: kpi.color }]}>
                                <Text style={[s.kpiTitle, { color: '#FFF' }]}>{kpi.title}</Text>
                                <View style={s.kpiMainValueRow}>
                                    <Text style={[s.kpiValue, { color: '#FFF' }]}>{kpi.value}</Text>
                                    <View style={s.kpiTrendBadge}>
                                        <PlatformIcon name="minus" size={12} tintColor="#FFF" />
                                    </View>
                                </View>
                                <View style={s.watermarkMain}>
                                    <PlatformIcon name="rosette" size={76} tintColor="rgba(255,255,255,0.15)" />
                                </View>
                            </View>
                        );
                    }

                    return (
                        <GlassView 
                            key={kpi.id} 
                            intensity={isDark ? 10 : 25} 
                            style={[
                                s.kpiCard, 
                                s.kpiCardStandard, 
                                { 
                                    borderColor, 
                                    borderWidth: 1, 
                                    backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.8)' 
                                }
                            ]}
                        >
                            <Text style={[s.kpiTitle, { color: subtextColor }]}>{kpi.title}</Text>
                            <Text style={[s.kpiValue, { color: textColor }]}>{kpi.value}</Text>
                            {kpi.icon && (
                                <View style={s.watermarkStandard}>
                                    <PlatformIcon name={kpi.icon as any} size={64} tintColor={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'} />
                                </View>
                            )}
                        </GlassView>
                    );
                })}
            </ScrollView>

            <View style={s.performanceCardsCol}>
                {/* Performance Timeline Card */}
                <GlassView 
                    intensity={isDark ? 10 : 25} 
                    style={[
                        s.perfCard, 
                        { 
                            borderColor, 
                            borderWidth: 1, 
                            backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.7)' 
                        }
                    ]}
                >
                    <View style={s.perfCardHeader}>
                        <View style={s.perfCardTitles}>
                            <Text style={[s.perfCardTitle, { color: textColor }]}>Performance Timeline</Text>
                            <Text style={[s.perfCardSubtitle, { color: subtextColor }]}>Overall performance history index</Text>
                        </View>
                        <View style={[s.timeToggleBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                            <Text style={[s.timeToggleActive, { color: '#007AFF' }]}>3M</Text>
                            <Text style={[s.timeToggleText, { color: subtextColor }]}>6M</Text>
                            <Text style={[s.timeToggleText, { color: subtextColor }]}>1Y</Text>
                            <Text style={[s.timeToggleText, { color: subtextColor }]}>ALL</Text>
                        </View>
                    </View>
                    <View style={s.emptyChartArea}>
                        <PlatformIcon name="waveform.path.ecg" size={32} tintColor={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'} />
                        <Text style={[s.emptyChartText, { color: subtextColor }]}>Not enough history for charting.</Text>
                    </View>
                </GlassView>

                {/* Score Breakdown Card */}
                <GlassView 
                    intensity={isDark ? 10 : 25} 
                    style={[
                        s.perfCard, 
                        { 
                            borderColor, 
                            borderWidth: 1, 
                            backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.7)' 
                        }
                    ]}
                >
                    <View style={s.perfCardTitles}>
                        <Text style={[s.perfCardTitle, { color: textColor }]}>Score Breakdown</Text>
                        <Text style={[s.perfCardSubtitle, { color: subtextColor }]}>Relative to team average (Benchmark)</Text>
                    </View>

                    <View style={s.breakdownList}>
                        {[
                            { label: 'ATTENDANCE', me: Math.round(Number(snapshot.attendance_score || 0)), team: Math.round(Number(teamSnapshot?.avg_attendance_score || 80)) },
                            { label: 'TASK COMPLETION', me: Math.round(Number(snapshot.task_completion_score || 0)), team: Math.round(Number(teamSnapshot?.avg_task_completion_score || 90)) },
                            { label: 'PROJECT INVOLVEMENT', me: Math.round(Number(snapshot.project_involvement_score || 0)), team: Math.round(Number(teamSnapshot?.avg_project_involvement_score || 75)) },
                            { label: 'TASK QUALITY', me: Math.round(Number(snapshot.quality_score || 0)), team: Math.round(Number(teamSnapshot?.avg_quality_score || 85)) },
                            { label: 'PEER REVIEW', me: Math.round(Number(snapshot.peer_review_score || 0)), team: Math.round(Number(teamSnapshot?.avg_peer_review_score || 70)) },
                            { label: 'ENGAGEMENT', me: Math.round(Number(snapshot.engagement_score || 0)), team: Math.round(Number(teamSnapshot?.avg_engagement_score || 75)) },
                        ].map((item, i) => (
                            <View key={i} style={s.breakdownRow}>
                                <View style={s.breakdownLabelRow}>
                                    <Text style={[s.breakdownLabel, { color: textColor }]}>{item.label}</Text>
                                </View>
                                <View style={[s.progressBarBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                                    <View style={[s.progressBarFillTeam, { width: `${item.team}%`, backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }]} />
                                    <View style={[s.progressBarFillMe, { width: `${item.me}%` }]} />
                                </View>
                            </View>
                        ))}
                    </View>

                    <View style={s.radarLegend}>
                        <View style={s.legendItem}>
                            <View style={[s.legendDot, { backgroundColor: '#007AFF' }]} />
                            <Text style={[s.legendText, { color: textColor }]}>YOUR SCORE</Text>
                        </View>
                        <View style={s.legendItem}>
                            <PlatformIcon name="viewfinder" size={12} tintColor={subtextColor} />
                            <Text style={[s.legendText, { color: subtextColor }]}>TEAM AVG (KKM)</Text>
                        </View>
                    </View>
                </GlassView>
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    performanceContainer: {
        gap: 24,
    },
    kpiScrollContent: {
        gap: 12,
        paddingHorizontal: 0,
    },
    kpiCard: {
        width: 160,
        height: 100,
        borderRadius: 24,
        padding: 16,
        justifyContent: 'space-between',
        overflow: 'hidden',
    },
    kpiCardMain: {
        width: 170, // Slightly wider for emphasis
    },
    kpiCardStandard: {
    },
    kpiTitle: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
        zIndex: 2,
    },
    kpiValue: {
        fontSize: 32,
        fontWeight: 'bold',
        letterSpacing: -1,
        zIndex: 2,
    },
    kpiMainValueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        zIndex: 2,
    },
    kpiTrendBadge: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    watermarkMain: {
        position: 'absolute',
        right: -10,
        bottom: -20,
        zIndex: 1,
    },
    watermarkStandard: {
        position: 'absolute',
        right: -10,
        bottom: -10,
        zIndex: 1,
    },
    performanceCardsCol: {
        gap: 24,
    },
    perfCard: {
        borderRadius: 24,
        padding: 24,
    },
    perfCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    perfCardTitles: {
        gap: 4,
        marginBottom: 20,
    },
    perfCardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: -0.5,
    },
    perfCardSubtitle: {
        fontSize: 13,
    },
    timeToggleBox: {
        flexDirection: 'row',
        borderRadius: 999,
        padding: 4,
        gap: 4,
    },
    timeToggleActive: {
        fontSize: 11,
        fontWeight: '800',
        backgroundColor: '#FFF',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 16,
        overflow: 'hidden',
        textAlign: 'center',
    },
    timeToggleText: {
        fontSize: 11,
        fontWeight: '700',
        paddingHorizontal: 8,
        paddingVertical: 4,
        textAlign: 'center',
    },
    emptyChartArea: {
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    emptyChartText: {
        fontSize: 14,
        fontWeight: '500',
    },
    breakdownList: {
        gap: 16,
        marginTop: 10,
    },
    breakdownRow: {
        gap: 8,
    },
    breakdownLabelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    breakdownLabel: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    progressBarBg: {
        height: 8,
        borderRadius: 4,
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
    },
    progressBarFillTeam: {
        position: 'absolute',
        height: '100%',
        borderRadius: 4,
    },
    progressBarFillMe: {
        position: 'absolute',
        height: '100%',
        backgroundColor: '#007AFF', // Solid Blue for 'ME' score
        borderRadius: 4,
        opacity: 0.9,
    },
    radarLegend: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 24,
        marginTop: 32,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    legendText: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    loadingContainer: {
        padding: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    comingSoonCard: {
        borderRadius: 24,
        padding: 24,
        marginTop: 8,
        gap: 16,
    },
    comingSoonHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    comingSoonIconBox: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    comingSoonBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 999,
    },
    comingSoonBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1,
    },
    comingSoonTitle: {
        fontSize: 20,
        fontWeight: '700',
        letterSpacing: -0.5,
    },
    comingSoonDesc: {
        fontSize: 14,
        lineHeight: 20,
    },
    comingSoonPreview: {
        borderWidth: 1,
        borderRadius: 16,
        padding: 12,
        gap: 10,
        marginTop: 4,
    },
    previewRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    previewDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    previewLineShort: {
        height: 8,
        borderRadius: 4,
        width: '50%',
    },
    previewLineLong: {
        height: 8,
        borderRadius: 4,
        width: '80%',
    },
});
