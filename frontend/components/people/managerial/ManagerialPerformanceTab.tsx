import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { GlassView } from '@/components/ui/GlassView';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { useTenantContext } from '@/context/TenantContext';
import { supabase } from '@/lib/supabase';

interface ManagerialPerformanceTabProps {
    isDark: boolean;
    textColor: string;
    subtextColor: string;
}

export function ManagerialPerformanceTab({ isDark, textColor, subtextColor }: ManagerialPerformanceTabProps) {
    const { activeTenant } = useTenantContext();
    const [isLoading, setIsLoading] = useState(true);
    const [teamPerfMetrics, setTeamPerfMetrics] = useState<any[]>([]);
    const [teamPerformances, setTeamPerformances] = useState<any[]>([]);

    const borderColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
    const accentColor = '#1677D2'; // People module accent blue

    const fetchPerformanceData = useCallback(async () => {
        setIsLoading(true);
        try {
            const tenantId = activeTenant?.id;
            if (!tenantId) {
                setTeamPerformances([]);
                setTeamPerfMetrics([]);
                setIsLoading(false);
                return;
            }

            // 1. Fetch tenant members
            const { data: tmData, error: tmError } = await supabase
                .from('tenant_members')
                .select('id, user_id, role')
                .eq('tenant_id', tenantId);

            if (tmError) throw tmError;

            const userIds = (tmData || []).map((m: any) => m.user_id).filter(Boolean);
            if (userIds.length === 0) {
                setTeamPerformances([]);
                setTeamPerfMetrics([]);
                setIsLoading(false);
                return;
            }

            // 2. Fetch profiles
            const { data: profiles, error: pError } = await supabase
                .from('profiles')
                .select('id, full_name, name, email, department, position, role')
                .in('id', userIds);

            if (pError) throw pError;

            // Filter out test accounts
            const realProfiles = (profiles || []).filter((p: any) => {
                const lowerName = (p.full_name || p.name || '').toLowerCase();
                const lowerEmail = (p.email || '').toLowerCase();
                return (
                    !lowerName.includes('test_') &&
                    !lowerEmail.includes('test_') &&
                    !lowerEmail.includes('testuser')
                );
            });

            const realUserIds = realProfiles.map((p: any) => p.id);
            if (realUserIds.length === 0) {
                setTeamPerformances([]);
                setTeamPerfMetrics([]);
                setIsLoading(false);
                return;
            }

            // 3. Fetch snapshots for real users
            const { data: snapshots, error: sError } = await supabase
                .from('people_performance_snapshots')
                .select('*')
                .in('user_id', realUserIds)
                .order('period', { ascending: false });

            if (sError) throw sError;

            if (snapshots && snapshots.length > 0) {
                const latestSnapMap = new Map();
                snapshots.forEach((snap: any) => {
                    if (!latestSnapMap.has(snap.user_id)) {
                        latestSnapMap.set(snap.user_id, snap);
                    }
                });

                const list: any[] = [];
                let totalInv = 0;
                let totalScore = 0;
                let topPerformersCount = 0;
                let needSupportCount = 0;

                realProfiles.forEach((prof: any) => {
                    const snap = latestSnapMap.get(prof.id);
                    if (!snap) return;

                    const inv = Math.round(Number(snap.project_involvement_score || 0));
                    const attendance = Math.round(Number(snap.attendance_score || 0));
                    const quality = Math.round(Number(snap.quality_score || 0));
                    const score = Math.round(Number(snap.computed_index || 0));

                    let status = 'FAIR';
                    let statusColor = '#FF9500';
                    if (score >= 85) {
                        status = 'EXCELLENT';
                        statusColor = '#34C759';
                        topPerformersCount++;
                    } else if (score >= 70) {
                        status = 'GOOD';
                        statusColor = '#007AFF';
                    } else if (score < 60) {
                        status = 'NEED SUPPORT';
                        statusColor = '#FF3B30';
                        needSupportCount++;
                    }

                    totalInv += inv;
                    totalScore += score;

                    const name = prof.full_name || prof.name || prof.email || 'Team Member';
                    const parts = name.trim().split(/\s+/);
                    const initials =
                        parts.length >= 2 && parts[0] && parts[1]
                            ? (parts[0][0] + parts[1][0]).toUpperCase()
                            : name.slice(0, 2).toUpperCase();

                    list.push({
                        id: prof.id,
                        name,
                        role: prof.position || prof.department || 'Team Member',
                        initials,
                        inv,
                        presence: `${attendance}%`,
                        eng: `${quality}%`,
                        score,
                        status,
                        statusColor,
                    });
                });

                if (list.length > 0) {
                    const avgInv = Math.round(totalInv / list.length);
                    const avgScore = Math.round(totalScore / list.length);

                    setTeamPerfMetrics([
                        { id: 'involvement', label: 'Avg Involvement', value: `${avgInv}%`, icon: 'target', color: '#007AFF', bgToken: 'rgba(0, 122, 255, 0.1)' },
                        { id: 'engagement', label: 'Avg Score', value: `${avgScore}`, icon: 'waveform.path.ecg', color: '#AF52DE', bgToken: 'rgba(175, 82, 222, 0.1)' },
                        { id: 'topperformers', label: 'Top Performers', value: `${topPerformersCount}`, icon: 'arrow.up.right', color: '#34C759', bgToken: 'rgba(52, 199, 89, 0.1)' },
                        { id: 'needsupport', label: 'Need Support', value: `${needSupportCount}`, icon: 'person.2.fill', color: '#FF9500', bgToken: 'rgba(255, 149, 0, 0.1)' },
                    ]);
                    setTeamPerformances(list);
                } else {
                    setTeamPerformances([]);
                    setTeamPerfMetrics([]);
                }
            } else {
                setTeamPerformances([]);
                setTeamPerfMetrics([]);
            }
        } catch (err) {
            console.error('Error fetching managerial performance:', err);
            setTeamPerformances([]);
            setTeamPerfMetrics([]);
        } finally {
            setIsLoading(false);
        }
    }, [activeTenant?.id]);

    useEffect(() => {
        fetchPerformanceData();
    }, [fetchPerformanceData]);

    if (isLoading) {
        return (
            <View style={s.loadingBox}>
                <ActivityIndicator size="small" color={isDark ? '#FFFFFF' : '#000000'} />
            </View>
        );
    }

    if (teamPerformances.length === 0) {
        return (
            <View style={s.tpContainer}>
                <GlassView 
                    intensity={isDark ? 10 : 25} 
                    style={[
                        s.emptyCard, 
                        { 
                            borderColor, 
                            borderWidth: 1,
                            backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.7)'
                        }
                    ]}
                >
                    <View style={s.emptyHeader}>
                        <View style={[s.emptyIconBox, { backgroundColor: `${accentColor}15` }]}>
                            <PlatformIcon name="chart.bar.fill" size={24} tintColor={accentColor} />
                        </View>
                        <View style={[s.emptyBadge, { backgroundColor: `${accentColor}15` }]}>
                            <Text style={[s.emptyBadgeText, { color: accentColor }]}>NO DATA</Text>
                        </View>
                    </View>
                    
                    <Text style={[s.emptyTitle, { color: textColor }]}>Team Performance Index</Text>
                    <Text style={[s.emptyDesc, { color: subtextColor }]}>
                        Team performance snapshots, benchmark KPIs, and metric evaluations will appear here once recorded for this organization.
                    </Text>
                    
                    <View style={[s.emptyPreview, { borderColor, backgroundColor: isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)' }]}>
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
            </View>
        );
    }

    return (
        <View style={s.tpContainer}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.tpMetricsScroll}
                snapToInterval={180 + 12}
                decelerationRate="fast"
            >
                {teamPerfMetrics.map((m) => (
                    <GlassView 
                        key={m.id} 
                        intensity={isDark ? 10 : 25} 
                        style={[
                            s.tpMetricCard, 
                            { 
                                borderWidth: 1, 
                                borderColor, 
                                backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.9)' 
                            }
                        ]}
                    >
                        <View style={s.tpMetricHeader}>
                            <Text style={[s.tpMetricLabel, { color: subtextColor }]}>{m.label}</Text>
                            <View style={[s.tpMetricIconBox, { backgroundColor: m.bgToken }]}>
                                <PlatformIcon name={m.icon as any} size={16} tintColor={m.color} />
                            </View>
                        </View>
                        <Text style={[s.tpMetricValue, { color: textColor }]}>{m.value}</Text>
                    </GlassView>
                ))}
            </ScrollView>

            <View style={s.tpList}>
                {teamPerformances.map((emp) => (
                    <TouchableOpacity key={emp.id} activeOpacity={0.7} onPress={() => Alert.alert('Performance', `Member: ${emp.name}`)}>
                        <GlassView 
                            intensity={isDark ? 10 : 25} 
                            style={[
                                s.tpEmpCard, 
                                { 
                                    borderWidth: 1, 
                                    borderColor, 
                                    backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.9)' 
                                }
                            ]}
                        >
                            <View style={s.tpEmpHeader}>
                                <View style={[s.tpEmpAvatar, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                                    <Text style={[s.tpEmpInitials, { color: textColor }]}>{emp.initials}</Text>
                                </View>
                                <View style={{ flex: 1, gap: 2 }}>
                                    <Text style={[s.tpEmpName, { color: textColor }]} numberOfLines={1}>{emp.name}</Text>
                                    <Text style={[s.tpEmpRole, { color: subtextColor }]} numberOfLines={1}>{emp.role}</Text>
                                </View>
                                <PlatformIcon name="chevron.right" size={14} tintColor={subtextColor} />
                            </View>

                            <View style={[s.tpEmpDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]} />

                            <View style={s.tpEmpMetricsRow}>
                                <View style={s.tpEmpMetricCol}>
                                    <Text style={[s.tpEmpMetricLabel, { color: subtextColor }]}>PROJECT INV.</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Text style={[s.tpEmpMetricValue, { color: textColor }]}>{emp.inv}%</Text>
                                        <View style={[s.tpProgressBarBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                                            <View style={[s.tpProgressBarFill, { width: `${emp.inv}%`, backgroundColor: '#007AFF' }]} />
                                        </View>
                                    </View>
                                </View>
                                <View style={s.tpEmpMetricColCenter}>
                                    <Text style={[s.tpEmpMetricLabel, { color: subtextColor }]}>PRESENCE</Text>
                                    <Text style={[s.tpEmpMetricValue, { color: textColor }]}>{emp.presence}</Text>
                                </View>
                                <View style={s.tpEmpMetricColCenter}>
                                    <Text style={[s.tpEmpMetricLabel, { color: subtextColor }]}>QUALITY</Text>
                                    <Text style={[s.tpEmpMetricValue, { color: textColor }]}>{emp.eng}</Text>
                                </View>
                            </View>

                            <View style={[s.tpEmpDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]} />

                            <View style={s.tpEmpFooter}>
                                <View style={{ gap: 2 }}>
                                    <Text style={[s.tpEmpMetricLabel, { color: subtextColor }]}>OVERALL SCORE</Text>
                                    <Text style={[s.tpOverallScoreValue, { color: textColor }]}>{emp.score}</Text>
                                </View>
                                <View style={[s.tpStatusBadge, { backgroundColor: `${emp.statusColor}20` }]}>
                                    <Text style={[s.tpStatusText, { color: emp.statusColor }]}>{emp.status}</Text>
                                </View>
                            </View>

                        </GlassView>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    tpContainer: {
        gap: 16,
    },
    loadingBox: {
        paddingVertical: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyCard: {
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        marginHorizontal: 0,
        marginVertical: 8,
    },
    emptyHeader: {
        alignItems: 'center',
        marginBottom: 16,
        gap: 12,
    },
    emptyIconBox: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    emptyBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 8,
        textAlign: 'center',
    },
    emptyDesc: {
        fontSize: 13,
        lineHeight: 19,
        textAlign: 'center',
        maxWidth: 320,
        marginBottom: 20,
    },
    emptyPreview: {
        width: '100%',
        maxWidth: 240,
        height: 48,
        borderRadius: 12,
        borderWidth: 1,
        borderStyle: 'dashed',
        padding: 12,
        justifyContent: 'center',
        gap: 8,
    },
    previewRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    previewDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    previewLineShort: {
        width: 40,
        height: 4,
        borderRadius: 2,
    },
    previewLineLong: {
        width: 80,
        height: 4,
        borderRadius: 2,
    },
    tpMetricsScroll: {
        paddingHorizontal: 0,
        gap: 12,
        paddingBottom: 8,
    },
    tpMetricCard: {
        width: 180,
        padding: 16,
        borderRadius: 20,
        gap: 12,
    },
    tpMetricHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    tpMetricLabel: {
        fontSize: 13,
        fontWeight: '500',
        flex: 1,
        paddingRight: 8,
    },
    tpMetricIconBox: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tpMetricValue: {
        fontSize: 28,
        fontWeight: 'bold',
        letterSpacing: -0.5,
    },
    tpList: {
        gap: 12,
        paddingBottom: 24,
    },
    tpEmpCard: {
        borderRadius: 20,
        padding: 16,
        gap: 12,
    },
    tpEmpHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    tpEmpAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tpEmpInitials: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    tpEmpName: {
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: -0.3,
    },
    tpEmpRole: {
        fontSize: 13,
    },
    tpEmpDivider: {
        height: 1,
        width: '100%',
    },
    tpEmpMetricsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    tpEmpMetricCol: {
        flex: 2,
        gap: 4,
    },
    tpEmpMetricColCenter: {
        flex: 1,
        alignItems: 'center',
        gap: 4,
    },
    tpEmpMetricLabel: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    tpEmpMetricValue: {
        fontSize: 13,
        fontWeight: '600',
    },
    tpProgressBarBox: {
        flex: 1,
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
        maxWidth: 60,
    },
    tpProgressBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    tpEmpFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    tpOverallScoreValue: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    tpStatusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    tpStatusText: {
        fontSize: 11,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
});
