import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { StyleSheet, View, Text, ScrollView, ActivityIndicator, Platform, TouchableOpacity, AppState } from 'react-native';
import { useUserContext } from '@/context/UserProvider';
import { useTenantContext } from '@/context/TenantContext';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { FinanceSummaryCard } from '../finance/FinanceSummaryCard';
import { fetchAllRequestsAndRank, AttendanceStatus } from '@/lib/api/attendance';
import { shareTodayAttendance, generateTodayAttendanceHtml } from '@/lib/shareHelper';

interface TeamMemberAttendance {
    id: string;
    fullName: string;
    avatarUrl?: string;
    initials: string;
    clockIn: string | null;
    clockOut: string | null;
    status: AttendanceStatus | 'not-checked-in';
}

export function ClockTeamOverview({ onRegisterShare, onViewDocument }: { onRegisterShare?: (shareFn: () => void) => void, onViewDocument?: (html: string, title: string) => void }) {
    const { user } = useUserContext();
    const { activeTenant } = useTenantContext();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';

    const [members, setMembers] = useState<TeamMemberAttendance[]>([]);
    const [stats, setStats] = useState({
        checkedIn: 0,
        lateToday: 0,
        onLeave: 0,
        pending: 0
    });
    const [loading, setLoading] = useState(true);

    const [loadError, setLoadError] = useState(false);
    const requestVersion = useRef(0);

    const loadData = useCallback(async (background = false) => {
        const version = ++requestVersion.current;
        if (!background) setLoading(true);
        try {
            const todayStr = format(new Date(), 'yyyy-MM-dd');
            const isMockUser = user?.id === '00000000-0000-0000-0000-000000000000';

            let profilesList: any[] = [];
            let attendanceList: any[] = [];
            let requestsData: any = null;
            let pendingCount = 0;
            let onLeaveCount = 0;

            if (isMockUser) {
                // Mock Data for Developer Mode
                profilesList = [
                    { id: 'm1', full_name: 'Adhika Amin' },
                    { id: 'm2', full_name: 'Alifia Rizky Rahma Kautsar' },
                    { id: 'm3', full_name: 'Bimo Prabowo Satrianing Widodo' },
                    { id: 'm4', full_name: 'Farisqi Dede' },
                    { id: 'm5', full_name: 'Kukuh Tegar Wicaksana' },
                    { id: 'm6', full_name: 'Mohamad Zaki Tahawuri' },
                    { id: 'm7', full_name: 'Raka Guruh Ade Saputra' }
                ];

                attendanceList = [
                    {
                        user_id: 'm6',
                        clock_in: `${todayStr}T13:32:00.000Z`,
                        clock_out: `${todayStr}T17:49:00.000Z`,
                        status: 'late'
                    },
                    {
                        user_id: 'm7',
                        clock_in: `${todayStr}T08:07:00.000Z`,
                        clock_out: `${todayStr}T17:07:00.000Z`,
                        status: 'ontime'
                    }
                ];

                pendingCount = 0;
                onLeaveCount = 0;
            } else {
                // Real DB queries scoped to tenant and filtered for Human + Performance Included
                const tenantId = activeTenant?.id;
                let tenantUserIds: string[] | null = null;
                if (tenantId) {
                    const { data: tmData, error: tenantError } = await supabase
                        .from('tenant_members')
                        .select('user_id')
                        .eq('tenant_id', tenantId);
                    if (tenantError) throw tenantError;
                    if (tmData && tmData.length > 0) {
                        tenantUserIds = tmData.map(t => t.user_id).filter(Boolean);
                    }
                }

                let profQuery = supabase
                    .from("profiles")
                    .select("id, full_name, avatar_url, account_type, include_in_performance")
                    .order("full_name");

                if (tenantUserIds && tenantUserIds.length > 0) {
                    profQuery = profQuery.in("id", tenantUserIds);
                } else if (tenantId) {
                    profQuery = profQuery.eq("tenant_id", tenantId);
                }

                const [profilesRes, attendanceRes, sessionsRes, requestsRes] = await Promise.all([
                    profQuery,
                    supabase.from("attendance_records").select("*").eq("date", todayStr),
                    supabase.from("attendance_sessions").select("user_id, clock_in, clock_out").eq("date", todayStr).order('clock_in', { ascending: true }),
                    fetchAllRequestsAndRank()
                ]);

                if (profilesRes.error) throw profilesRes.error;
                if (attendanceRes.error) throw attendanceRes.error;
                if (sessionsRes.error) throw sessionsRes.error;
                const rawProfiles = profilesRes.data || [];
                // Only include Human Accounts with include_in_performance !== false and exclude test accounts
                profilesList = rawProfiles.filter((p: any) => {
                    const accType = (p.account_type || 'human').toLowerCase();
                    const isSystem = accType.includes('system');
                    const isTest = (p.full_name || '').toLowerCase().includes('test_') ||
                                   (p.full_name || '').toLowerCase().startsWith('test ');
                    const isIncluded = p.include_in_performance !== false;
                    return !isSystem && !isTest && isIncluded;
                });
                attendanceList = [...(attendanceRes.data || [])];
                // Sessions are the clock action itself; a delayed summary must not hide a saved clock in.
                const sessionsByUser = new Map<string, any[]>();
                for (const session of sessionsRes.data || []) {
                    if (!session.clock_in) continue;
                    const list = sessionsByUser.get(session.user_id) || [];
                    list.push(session);
                    sessionsByUser.set(session.user_id, list);
                }
                for (const [userId, sessions] of sessionsByUser) {
                    const index = attendanceList.findIndex(record => record.user_id === userId);
                    const summary = index >= 0 ? attendanceList[index] : {};
                    const record = {
                        ...summary,
                        user_id: userId,
                        clock_in: sessions[0].clock_in,
                        clock_out: sessions[sessions.length - 1].clock_out,
                        status: summary.status || 'not-checked-in'
                    };
                    if (index >= 0) attendanceList[index] = record;
                    else attendanceList.push(record);
                }
                requestsData = requestsRes;

                if (requestsRes) {
                    const { leaves, overtimes, trips, corrections } = requestsRes;
                    pendingCount = [
                        ...leaves.filter(l => l.status === 'pending'),
                        ...overtimes.filter(o => o.status === 'pending'),
                        ...trips.filter(t => t.status === 'pending'),
                        ...(corrections || []).filter(c => c.status === 'pending')
                    ].length;

                    onLeaveCount = leaves.filter(l => 
                        l.status === 'approved' && 
                        todayStr >= l.startDate && 
                        todayStr <= l.endDate
                    ).length;
                }
            }

            // Map profiles to attendance
            const mappedMembers: TeamMemberAttendance[] = profilesList.map(profile => {
                const record = attendanceList.find(a => a.user_id === profile.id);
                const names = (profile.full_name || '').split(' ');
                const initials = names.map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

                let status: AttendanceStatus | 'not-checked-in' = (record?.status as AttendanceStatus) || 'not-checked-in';
                
                // If not checked in, check if member has an approved leave or trip today
                const hasClockIn = Boolean(record?.clock_in || record?.check_in);
                if (!hasClockIn && requestsData) {
                    const userLeave = requestsData.leaves.find((l: any) => 
                        l.userId === profile.id && 
                        l.status === 'approved' && 
                        todayStr >= l.startDate && 
                        todayStr <= l.endDate
                    );
                    if (userLeave) {
                        status = userLeave.subtype === 'sick' ? 'sick' : 'leave';
                    } else {
                        const userTrip = requestsData.trips.find((t: any) => 
                            t.userId === profile.id && 
                            t.status === 'approved' && 
                            todayStr >= t.startDate && 
                            todayStr <= t.endDate
                        );
                        if (userTrip) {
                            status = 'leave';
                        }
                    }
                }

                return {
                    id: profile.id,
                    fullName: profile.full_name || 'Employee',
                    avatarUrl: profile.avatar_url || undefined,
                    initials: initials || 'EE',
                    clockIn: record?.clock_in || record?.check_in || null,
                    clockOut: record?.clock_out || record?.check_out || null,
                    status
                };
            });

            // Precise 3-tier sort:
            // 1. Yang masuk / hadir (diurutkan kronologis dari yang clock in pertama kali paling awal)
            // 2. Yang cuti / izin / sakit / dinas luar
            // 3. Yang belum check in / tidak hadir / tanpa keterangan
            mappedMembers.sort((a, b) => {
                const isLeaveA = ['leave', 'sick', 'holiday', 'cuti-bersama'].includes(a.status);
                const isLeaveB = ['leave', 'sick', 'holiday', 'cuti-bersama'].includes(b.status);

                const rankA = a.clockIn ? 1 : isLeaveA ? 2 : 3;
                const rankB = b.clockIn ? 1 : isLeaveB ? 2 : 3;

                if (rankA !== rankB) {
                    return rankA - rankB;
                }

                // If both are checked in, sort chronologically by earliest clock-in time
                if (a.clockIn && b.clockIn) {
                    return a.clockIn.localeCompare(b.clockIn);
                }

                return a.fullName.localeCompare(b.fullName);
            });

            if (version !== requestVersion.current) return;
            setLoadError(false);
            setMembers(mappedMembers);

            // Compute statistics from actual mapped array
            const checkedInCount = mappedMembers.filter(m => m.clockIn !== null).length;
            const lateCount = mappedMembers.filter(m => m.status === 'late').length;

            setStats({
                checkedIn: checkedInCount,
                lateToday: lateCount,
                onLeave: onLeaveCount,
                pending: pendingCount
            });
        } catch (error) {
            if (version !== requestVersion.current) return;
            setLoadError(true);
            console.error('Error loading team overview:', error);
        } finally {
            if (version === requestVersion.current) setLoading(false);
        }
    }, [user?.id, activeTenant?.id]);

    useEffect(() => {
        if (!user?.id) return;
        let active = true;
        let refreshing = false;
        let refreshPending = false;
        const refresh = async () => {
            if (!active) return;
            if (refreshing) { refreshPending = true; return; }
            refreshing = true;
            try {
                do {
                    refreshPending = false;
                    await loadData(true);
                } while (active && refreshPending);
            } finally { refreshing = false; }
        };
        void refresh();
        const channel = supabase.channel(`clock-team-${activeTenant?.id || 'default'}-${user.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_records' }, refresh)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_sessions' }, refresh)
            .subscribe((status) => { if (status === 'SUBSCRIBED') void refresh(); });
        // Also recover from missed events, reconnects and date changes.
        const timer = setInterval(() => { void refresh(); }, 30000);
        const appListener = AppState.addEventListener('change', state => {
            if (state === 'active') void refresh();
        });
        const onFocus = () => { void refresh(); };
        if (Platform.OS === 'web') window.addEventListener('focus', onFocus);
        return () => {
            active = false;
            requestVersion.current++;
            clearInterval(timer);
            appListener.remove();
            if (Platform.OS === 'web') window.removeEventListener('focus', onFocus);
            void supabase.removeChannel(channel);
        };
    }, [user?.id, activeTenant?.id, loadData]);

    useEffect(() => {
        if (onRegisterShare) {
            onRegisterShare(() => {
                const now = new Date();
                const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
                const title = `Team_Daily_Attendance_${dateStr}`;
                const tenantInfo = activeTenant ? {
                    name: activeTenant.branding_name || activeTenant.name,
                    logoUrl: activeTenant.branding_logo_url || activeTenant.logo_url,
                    companyCode: activeTenant.company_code,
                    primaryColor: activeTenant.primary_color,
                    slug: activeTenant.slug
                } : undefined;
                const html = generateTodayAttendanceHtml(members, tenantInfo);
                if (onViewDocument) {
                    onViewDocument(html, title);
                } else {
                    shareTodayAttendance(members);
                }
            });
        }
    }, [members, activeTenant, onRegisterShare, onViewDocument]);

    const formatTime = (isoString: string | null) => {
        if (!isoString) return '--:--';
        try {
            const date = new Date(isoString);
            if (isNaN(date.getTime())) return '--:--';
            return format(date, 'HH:mm');
        } catch {
            return '--:--';
        }
    };

    const getStatusBadgeConfig = (status: AttendanceStatus | 'not-checked-in') => {
        switch (status) {
            case 'ontime':
                return { label: 'On Time', bg: 'rgba(52, 199, 89, 0.12)', text: '#34C759' };
            case 'intime':
                return { label: 'In Time', bg: 'rgba(255, 149, 0, 0.12)', text: '#FF9500' };
            case 'late':
                return { label: 'Late', bg: 'rgba(255, 59, 48, 0.12)', text: '#FF3B30' };
            case 'absent':
                return { label: 'Absent', bg: 'rgba(142, 142, 147, 0.12)', text: '#8E8E93' };
            case 'leave':
                return { label: 'Leave', bg: 'rgba(175, 82, 222, 0.12)', text: '#AF52DE' };
            case 'sick':
                return { label: 'Sick', bg: 'rgba(255, 204, 0, 0.12)', text: '#FFCC00' };
            case 'weekend':
                return { label: 'Weekend', bg: 'rgba(142, 142, 147, 0.08)', text: '#8E8E93' };
            case 'holiday':
                return { label: 'Holiday', bg: 'rgba(0, 122, 255, 0.12)', text: '#007AFF' };
            case 'cuti-bersama':
                return { label: 'Joint Leave', bg: 'rgba(255, 149, 0, 0.12)', text: '#FF9500' };
            default:
                return null;
        }
    };

    const cardBg = isDark ? '#1C1C1E' : '#FFF';
    const cardBorder = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';

    if (loadError) {
        return (
            <TouchableOpacity onPress={() => { void loadData(); }} style={s.container}>
                <Text style={{ color: textColor }}>Data absensi belum berhasil dimuat. Ketuk untuk mencoba lagi.</Text>
            </TouchableOpacity>
        );
    }

    if (loading) {
        return (
            <View style={s.loader}>
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        );
    }

    return (
        <View style={s.container}>
            {/* Stat Cards ScrollView (Finance Style) */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={s.summaryScroll}
                contentContainerStyle={s.summaryScrollContent}
                decelerationRate="fast"
                snapToInterval={150 + 12}
            >
                <FinanceSummaryCard
                    icon="person.crop.circle.badge.checkmark"
                    iconColor="#34C759"
                    value={String(stats.checkedIn)}
                    label="Checked In"
                    subValue="Currently working"
                    style={s.statCard}
                    disabled
                />
                <FinanceSummaryCard
                    icon="exclamationmark.triangle"
                    iconColor="#FF9500"
                    value={String(stats.lateToday)}
                    label="Late Today"
                    subValue="Arrived after 08:00"
                    style={s.statCard}
                    disabled
                />
                <FinanceSummaryCard
                    icon="person.crop.circle.badge.xmark"
                    iconColor="#AF52DE"
                    value={String(stats.onLeave)}
                    label="On Leave"
                    subValue="Approved leave"
                    style={s.statCard}
                    disabled
                />
                <FinanceSummaryCard
                    icon="doc.text.magnifyingglass"
                    iconColor="#FFCC00"
                    value={String(stats.pending)}
                    label="Pending Requests"
                    subValue="Awaiting review"
                    style={s.statCard}
                    disabled
                />
            </ScrollView>

            {/* Attendance Activity List (Crew Style) */}
            <Text style={[s.sectionTitle, { color: subtextColor }]}>TODAY&apos;S ATTENDANCE</Text>
            <View style={s.listContainer}>
                {members.map(member => {
                    const badge = getStatusBadgeConfig(member.status);
                    return (
                        <View
                            key={member.id}
                            style={[s.memberCard, { backgroundColor: cardBg, borderColor: cardBorder }]}
                        >
                            <View style={s.cardBody}>
                                {/* Avatar */}
                                <View style={[s.avatar, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                                    <Text style={[s.avatarText, { color: textColor }]}>{member.initials}</Text>
                                </View>

                                {/* Details */}
                                <View style={s.details}>
                                    <Text style={[s.name, { color: textColor }]} numberOfLines={1}>
                                        {member.fullName}
                                    </Text>
                                    <Text style={[s.timeText, { color: subtextColor }]}>
                                        {member.clockIn ? (
                                            `Checked in at ${formatTime(member.clockIn)} • Checked out at ${formatTime(member.clockOut)}`
                                        ) : (
                                            'Not checked in yet'
                                        )}
                                    </Text>
                                </View>

                                {/* Right Side: Status Badge */}
                                {badge && (
                                    <View style={s.rightSection}>
                                        <View style={[s.statusBadge, { backgroundColor: badge.bg }]}>
                                            <Text style={[s.statusText, { color: badge.text }]}>
                                                {badge.label}
                                            </Text>
                                        </View>
                                    </View>
                                )}
                            </View>
                        </View>
                    );
                })}
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 20
    },
    loader: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40
    },
    summaryScroll: {
        marginHorizontal: -20,
        marginBottom: 24,
    },
    summaryScrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 4,
    },
    statCard: {
        width: 150,
        marginRight: 12,
        marginBottom: 0
    },
    lateCard: {
        borderWidth: 1.5
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1,
        marginBottom: 16
    },
    listContainer: {
        gap: 12
    },
    memberCard: {
        borderRadius: 24,
        borderWidth: 1,
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.02,
                shadowRadius: 8,
            },
        }),
    },
    cardBody: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingLeft: 16,
        paddingRight: 12,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    avatarText: {
        fontSize: 14,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    details: {
        flex: 1,
        marginRight: 12,
    },
    name: {
        fontSize: 16,
        fontWeight: '700',
    },
    timeText: {
        fontSize: 13,
        marginTop: 4,
    },
    rightSection: {
        justifyContent: 'center',
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '800',
    },
});
