import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image, Share, SafeAreaView, Platform, Modal, TextInput } from 'react-native';
import { GlassView } from '../ui/GlassView';
import { LiquidCard } from '../ui/LiquidCard';
import { useUserContext } from '@/context/UserProvider';
import { useTenantContext } from '@/context/TenantContext';
import { supabase } from '@/lib/supabase';
import { fetchAttendanceRecords, AttendanceRecord, AttendanceStatus, fetchCorrectionRequests, AttendanceCorrectionRequest } from '@/lib/api/attendance';
import { calculateStats, formatMinutes } from '@/lib/clock-data-logic';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, eachDayOfInterval, isWeekend as isWeekendDay, isFuture, differenceInDays } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { FinanceSummaryCard } from '../finance/FinanceSummaryCard';
import { SwiftUIImagePreviewSheet } from '../crew/SwiftUIImagePreviewSheet';
import { SearchablePicker } from '../ui/SearchablePicker';
import { PlatformIcon } from '../ui/PlatformIcon';
import { AttendanceCorrectionModal } from './AttendanceCorrectionModal';
import { HOLIDAYS_2026 } from '@/lib/constants/holidays';
import { PlatformContextMenu as ContextMenu, ContextMenuAction } from '@/components/ui/PlatformContextMenu';
import * as Haptics from 'expo-haptics';
import { sharePersonalTimesheet, shareTeamTimesheet, generatePersonalTimesheetHtml, generateTeamTimesheetHtml } from '@/lib/shareHelper';
import {
    getClockSetting,
    DEFAULT_ATTENDANCE_PERIOD,
    DEFAULT_ATTENDANCE_CORRECTION,
    AttendancePeriodConfig,
    AttendanceCorrectionConfig,
} from '@/lib/api/clockSetup';

const getHolidayText = (dateStr: string) => {
    const holiday = HOLIDAYS_2026.find(h => h.date === dateStr);
    if (!holiday) return null;
    
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const isToday = dateStr === todayStr;
    
    if (isToday) {
        return holiday.type === 'holiday' 
            ? `Today is Holiday: ${holiday.nameEn}` 
            : `Today is Collective Leave: ${holiday.nameEn}`;
    } else {
        return holiday.type === 'holiday' 
            ? `Holiday: ${holiday.nameEn}` 
            : `Collective Leave: ${holiday.nameEn}`;
    }
};

const getDateIndicator = (dateStr: string) => {
    const holidayText = getHolidayText(dateStr);
    if (holidayText) return holidayText;

    try {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            const y = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10) - 1;
            const d = parseInt(parts[2], 10);
            const dateObj = new Date(y, m, d);
            if (isWeekendDay(dateObj)) return 'Weekend';
        }
    } catch {}

    return null;
};

const getStatusDisplayInfo = (status?: AttendanceStatus | string) => {
    switch (status) {
        case 'ontime': return { type: 'icon', value: 'checkmark-circle', color: '#34C759' };
        case 'intime': return { type: 'icon', value: 'alert-circle', color: '#FF9500' };
        case 'late': return { type: 'icon', value: 'alert-circle', color: '#FF3B30' };
        case 'absent': return { type: 'icon', value: 'close-circle', color: '#8E8E93' };
        case 'leave': return { type: 'letter', value: 'L', color: '#AF52DE' };
        case 'weekend': return { type: 'letter', value: 'W', color: '#8E8E93' };
        case 'holiday': return { type: 'letter', value: 'H', color: '#FF9500' };
        case 'cuti-bersama': return { type: 'letter', value: 'C', color: '#FF9500' };
        case 'sick': return { type: 'letter', value: 'S', color: '#FFCC00' };
        default: return { type: 'icon', value: 'checkmark-circle', color: '#34C759' };
    }
};

const generateMockTeamRecords = (month: Date) => {
    const year = month.getFullYear();
    const mIdx = month.getMonth();
    const today = new Date();
    const monthEnd = endOfMonth(month);
    const lastDay = isFuture(monthEnd) ? today : monthEnd;
    const allDays = eachDayOfInterval({ start: startOfMonth(month), end: lastDay });

    const mockProfiles = [
        { id: 'm1', fullName: 'Adhika Amin' },
        { id: 'm2', fullName: 'Alifia Rizky Rahma Kautsar' },
        { id: 'm3', fullName: 'Bimo Prabowo Satrianing Widodo' },
        { id: 'm4', fullName: 'Farisqi Dede' },
        { id: 'm5', fullName: 'Kukuh Tegar Wicaksana' },
        { id: 'm6', fullName: 'Mohamad Zaki Tahawuri' },
        { id: 'm7', fullName: 'Raka Guruh Ade Saputra' }
    ];

    const list: AttendanceRecord[] = [];
    allDays.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const isWknd = isWeekendDay(day);

        mockProfiles.forEach((profile, idx) => {
            if (isWknd) {
                list.push({
                    id: `mock-${profile.id}-${dateStr}`,
                    userId: profile.id,
                    userName: profile.fullName,
                    date: dateStr,
                    clockIn: null,
                    clockOut: null,
                    status: 'weekend',
                    totalMinutes: 0,
                    overtimeMinutes: 0
                });
                return;
            }

            const dayNum = day.getDate();
            if (profile.id === 'm1' && dayNum % 9 === 0) {
                list.push({
                    id: `mock-${profile.id}-${dateStr}`,
                    userId: profile.id,
                    userName: profile.fullName,
                    date: dateStr,
                    clockIn: null,
                    clockOut: null,
                    status: 'absent',
                    totalMinutes: 0,
                    overtimeMinutes: 0,
                    notes: 'Tanpa keterangan'
                });
            } else if (profile.id === 'm2' && dayNum % 11 === 0) {
                list.push({
                    id: `mock-${profile.id}-${dateStr}`,
                    userId: profile.id,
                    userName: profile.fullName,
                    date: dateStr,
                    clockIn: null,
                    clockOut: null,
                    status: 'leave',
                    totalMinutes: 0,
                    overtimeMinutes: 0,
                    notes: 'Urusan keluarga'
                });
            } else if (profile.id === 'm3' && dayNum % 13 === 0) {
                list.push({
                    id: `mock-${profile.id}-${dateStr}`,
                    userId: profile.id,
                    userName: profile.fullName,
                    date: dateStr,
                    clockIn: null,
                    clockOut: null,
                    status: 'sick',
                    totalMinutes: 0,
                    overtimeMinutes: 0,
                    notes: 'Sakit flu berat'
                });
            } else {
                let checkInTime = '07:55:00';
                let status: AttendanceStatus = 'ontime';
                if (profile.id === 'm6' && dayNum % 3 === 0) {
                    checkInTime = '09:36:00';
                    status = 'late';
                } else if (dayNum % 5 === 0) {
                    checkInTime = '08:17:00';
                    status = 'intime';
                }

                const clockInStr = `${dateStr}T${checkInTime}`;
                const clockOutStr = `${dateStr}T17:05:00`;

                list.push({
                    id: `mock-${profile.id}-${dateStr}`,
                    userId: profile.id,
                    userName: profile.fullName,
                    date: dateStr,
                    clockIn: clockInStr,
                    clockOut: clockOutStr,
                    status: status,
                    totalMinutes: 480 + (status === 'late' ? -96 : 0),
                    overtimeMinutes: idx % 3 === 0 ? 45 : 0,
                    checkInLocationCode: idx % 2 === 0 ? 'JPF' : 'REM',
                    checkInPhotoUrl: undefined,
                    checkOutPhotoUrl: undefined
                });
            }
        });
    });
    return list;
};

interface ClockTimesheetsProps {
    viewMode: 'personal' | 'team';
    onRegisterShare?: (shareFn: () => void) => void;
    onViewDocument?: (html: string, title: string) => void;
    isDesktopWeb?: boolean;
    selectedRecord?: AttendanceRecord | null;
    onSelectRecord?: (record: AttendanceRecord | null) => void;
    onRequestCorrection?: (record: AttendanceRecord) => void;
    onPeriodDataChange?: (data: { records: AttendanceRecord[]; stats: any; teamStats: any; periodLabel: string }) => void;
}

export function ClockTimesheets({ 
    viewMode, 
    onRegisterShare, 
    onViewDocument,
    isDesktopWeb = false,
    selectedRecord = null,
    onSelectRecord,
    onRequestCorrection,
    onPeriodDataChange
}: ClockTimesheetsProps) {
    const { user, profile } = useUserContext();
    const { activeTenant } = useTenantContext();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';

    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [teamProfiles, setTeamProfiles] = useState<Array<{ id: string; fullName: string }>>([]);
    const [loading, setLoading] = useState(false);
    const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);
    const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
    const [activeStatKey, setActiveStatKey] = useState<string | null>(null);
    const [selectedDay, setSelectedDay] = useState<Date | null>(null);
    const [isPhotoSheetOpen, setIsPhotoSheetOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);

    const toggleExpand = (id: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setExpandedRecordId(prev => (prev === id ? null : id));
    };

    const [periodConfig, setPeriodConfig] = useState<AttendancePeriodConfig>(DEFAULT_ATTENDANCE_PERIOD);
    const [correctionPolicy, setCorrectionPolicy] = useState<AttendanceCorrectionConfig>(DEFAULT_ATTENDANCE_CORRECTION);
    const [correctionRequests, setCorrectionRequests] = useState<AttendanceCorrectionRequest[]>([]);
    const [correctionModalVisible, setCorrectionModalVisible] = useState(false);
    const [selectedRecordForCorrection, setSelectedRecordForCorrection] = useState<AttendanceRecord | null>(null);

    useFocusEffect(
        React.useCallback(() => {
            getClockSetting<AttendancePeriodConfig>('ATTENDANCE_PERIOD', DEFAULT_ATTENDANCE_PERIOD, activeTenant?.id).then((cfg) => {
                if (cfg) setPeriodConfig(cfg);
            });
            getClockSetting<AttendanceCorrectionConfig>('ATTENDANCE_CORRECTIONS', DEFAULT_ATTENDANCE_CORRECTION, activeTenant?.id).then((pol) => {
                if (pol) setCorrectionPolicy(pol);
            });
        }, [activeTenant?.id])
    );

    useEffect(() => {
        getClockSetting<AttendancePeriodConfig>('ATTENDANCE_PERIOD', DEFAULT_ATTENDANCE_PERIOD, activeTenant?.id).then((cfg) => {
            if (cfg) setPeriodConfig(cfg);
        });
        getClockSetting<AttendanceCorrectionConfig>('ATTENDANCE_CORRECTIONS', DEFAULT_ATTENDANCE_CORRECTION, activeTenant?.id).then((pol) => {
            if (pol) setCorrectionPolicy(pol);
        });
    }, [activeTenant?.id]);

    const isCurrentMonth = format(currentMonth, 'yyyy-MM') === format(new Date(), 'yyyy-MM');
    const isMockUser = user?.id === '00000000-0000-0000-0000-000000000000';

    // Calculate active period range based on calculationMode
    const periodDateRange = useMemo(() => {
        if (periodConfig.calculationMode === 'cutoff') {
            const startDay = periodConfig.cutoffDayStart || 21;
            const endDay = periodConfig.cutoffDayEnd || 20;
            const currentYear = currentMonth.getFullYear();
            const currentMonthIdx = currentMonth.getMonth();

            if (startDay <= endDay) {
                const maxDays = new Date(currentYear, currentMonthIdx + 1, 0).getDate();
                const actualStartDay = Math.min(startDay, maxDays);
                const actualEndDay = Math.min(endDay, maxDays);
                const startDate = new Date(currentYear, currentMonthIdx, actualStartDay);
                const endDate = new Date(currentYear, currentMonthIdx, actualEndDay);
                return {
                    start: startDate,
                    end: endDate,
                    label: `${actualStartDay} – ${actualEndDay} ${format(currentMonth, 'MMM yyyy')}`,
                };
            } else {
                const sMonthDate = new Date(currentYear, currentMonthIdx - 1, 1);
                const sYear = sMonthDate.getFullYear();
                const sMonth = sMonthDate.getMonth();
                const maxStartDays = new Date(sYear, sMonth + 1, 0).getDate();
                const maxEndDays = new Date(currentYear, currentMonthIdx + 1, 0).getDate();
                const actualStartDay = Math.min(startDay, maxStartDays);
                const actualEndDay = Math.min(endDay, maxEndDays);

                const startDate = new Date(sYear, sMonth, actualStartDay);
                const endDate = new Date(currentYear, currentMonthIdx, actualEndDay);
                return {
                    start: startDate,
                    end: endDate,
                    label: `${actualStartDay} ${format(startDate, 'MMM')} – ${actualEndDay} ${format(endDate, 'MMM yyyy')}`,
                };
            }
        }

        // Default 'calendar_month' or 'workday'
        const startDate = startOfMonth(currentMonth);
        const endDate = endOfMonth(currentMonth);
        return {
            start: startDate,
            end: endDate,
            label: format(currentMonth, 'MMMM yyyy'),
        };
    }, [currentMonth, periodConfig]);

    // Fetch records
    const loadRecords = async () => {
        if (!user) return;
        if (records.length === 0) setLoading(true);
        try {
            const start = format(periodDateRange.start, 'yyyy-MM-dd');
            const end = format(periodDateRange.end, 'yyyy-MM-dd');
            const targetUserId = viewMode === 'personal' ? user.id : undefined;
            const [data, corrs, pol] = await Promise.all([
                fetchAttendanceRecords(targetUserId, start, end),
                fetchCorrectionRequests(viewMode === 'personal' ? user.id : undefined),
                getClockSetting<AttendanceCorrectionConfig>('ATTENDANCE_CORRECTIONS', DEFAULT_ATTENDANCE_CORRECTION),
            ]);
            setRecords(data);
            if (corrs) setCorrectionRequests(corrs);
            if (pol) setCorrectionPolicy(pol);

            if (viewMode === 'team') {
                const isMockUser = user?.id === '00000000-0000-0000-0000-000000000000';
                if (isMockUser) {
                    setTeamProfiles([
                        { id: 'm1', fullName: 'Adhika Amin' },
                        { id: 'm2', fullName: 'Alifia Rizky Rahma Kautsar' },
                        { id: 'm3', fullName: 'Bimo Prabowo Satrianing Widodo' },
                        { id: 'm4', fullName: 'Farisqi Dede' },
                        { id: 'm5', fullName: 'Kukuh Tegar Wicaksana' },
                        { id: 'm6', fullName: 'Mohamad Zaki Tahawuri' },
                        { id: 'm7', fullName: 'Raka Guruh Ade Saputra' }
                    ]);
                } else {
                    const tenantId = activeTenant?.id;
                    let tenantUserIds: string[] | null = null;
                    if (tenantId) {
                        const { data: tmData } = await supabase
                            .from('tenant_members')
                            .select('user_id')
                            .eq('tenant_id', tenantId);
                        if (tmData && tmData.length > 0) {
                            tenantUserIds = tmData.map(t => t.user_id).filter(Boolean);
                        }
                    }
                    let profQuery = supabase
                        .from('profiles')
                        .select('id, full_name, avatar_url, account_type, include_in_performance')
                        .order('full_name');
                    if (tenantUserIds && tenantUserIds.length > 0) {
                        profQuery = profQuery.in('id', tenantUserIds);
                    } else if (tenantId) {
                        profQuery = profQuery.eq('tenant_id', tenantId);
                    }
                    const profRes = await profQuery;
                    const profList = (profRes.data || [])
                        .filter((p: any) => {
                            const accType = (p.account_type || 'human').toLowerCase();
                            const isSystem = accType.includes('system');
                            const isTest = (p.full_name || '').toLowerCase().includes('test_') ||
                                           (p.full_name || '').toLowerCase().startsWith('test ');
                            const isIncluded = p.include_in_performance !== false;
                            return !isSystem && !isTest && isIncluded;
                        })
                        .map((p: any) => ({
                            id: p.id,
                            fullName: p.full_name || 'Employee',
                        }));
                    if (profList.length > 0) {
                        setTeamProfiles(profList);
                    } else {
                        const set = new Map<string, string>();
                        data.forEach(r => {
                            if (r.userId && r.userName) {
                                set.set(r.userId, r.userName);
                            }
                        });
                        setTeamProfiles(Array.from(set.entries()).map(([id, fullName]) => ({ id, fullName })));
                    }
                }
            }
        } catch (error) {
            console.error('Error loading timesheets:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRecords();
        setSelectedDay(null); // Reset day filter on month/viewMode change
    }, [user?.id, currentMonth, viewMode, periodDateRange]);

    const daysInMonth = useMemo(() => {
        const start = periodDateRange.start;
        const today = new Date();
        let end = periodDateRange.end;
        if (isFuture(end)) {
            end = today < start ? start : today;
        }
        
        const days = eachDayOfInterval({ start, end });
        return days.reverse();
    }, [periodDateRange]);

    const fullMonthRecords = useMemo(() => {
        if (viewMode === 'personal') {
            const recordsMap = new Map<string, AttendanceRecord>();
            records.forEach(r => {
                recordsMap.set(r.date, r);
            });

            const combined: AttendanceRecord[] = [];
            daysInMonth.forEach(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const existing = recordsMap.get(dateStr);
                if (existing) {
                    combined.push(existing);
                } else {
                    const holiday = HOLIDAYS_2026.find(h => h.date === dateStr);
                    const isWknd = isWeekendDay(day);
                    if (holiday) {
                        combined.push({
                            id: `holiday-${dateStr}`,
                            userId: user?.id || 'me',
                            date: dateStr,
                            clockIn: null,
                            clockOut: null,
                            status: (holiday.type === 'holiday' ? 'holiday' : 'cuti-bersama') as AttendanceStatus,
                            notes: holiday.nameEn,
                            totalMinutes: 0,
                            overtimeMinutes: 0,
                        });
                    } else if (isWknd) {
                        combined.push({
                            id: `weekend-${dateStr}`,
                            userId: user?.id || 'me',
                            date: dateStr,
                            clockIn: null,
                            clockOut: null,
                            status: 'weekend' as AttendanceStatus,
                            notes: 'Weekend',
                            totalMinutes: 0,
                            overtimeMinutes: 0,
                        });
                    } else {
                        combined.push({
                            id: `absent-${dateStr}`,
                            userId: user?.id || 'me',
                            date: dateStr,
                            clockIn: null,
                            clockOut: null,
                            status: 'absent' as AttendanceStatus,
                            notes: 'Absent',
                            totalMinutes: 0,
                            overtimeMinutes: 0,
                        });
                    }
                }
            });
            return combined;
        }

        // viewMode === 'team'
        const membersMap = new Map<string, { id: string; fullName: string }>();
        teamProfiles.forEach(p => {
            membersMap.set(p.id, p);
        });
        records.forEach(r => {
            if (r.userId && !membersMap.has(r.userId)) {
                membersMap.set(r.userId, { id: r.userId, fullName: r.userName || 'Employee' });
            } else if (r.userName && !Array.from(membersMap.values()).some(m => m.fullName === r.userName)) {
                membersMap.set(r.userName, { id: r.userId || r.userName, fullName: r.userName });
            }
        });

        const allMembers = Array.from(membersMap.values());
        if (allMembers.length === 0) return records;

        const existingMap = new Map<string, AttendanceRecord>();
        records.forEach(r => {
            if (r.userId) existingMap.set(`${r.userId}_${r.date}`, r);
            if (r.userName) existingMap.set(`${r.userName}_${r.date}`, r);
        });

        const combinedTeam: AttendanceRecord[] = [];
        daysInMonth.forEach(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const holiday = HOLIDAYS_2026.find(h => h.date === dateStr);
            const isWknd = isWeekendDay(day);

            allMembers.forEach(member => {
                const existing = existingMap.get(`${member.id}_${dateStr}`) || existingMap.get(`${member.fullName}_${dateStr}`);
                if (existing) {
                    combinedTeam.push({
                        ...existing,
                        userName: existing.userName || member.fullName,
                    });
                } else {
                    const status: AttendanceStatus = isWknd ? 'weekend' : holiday ? ((holiday.type === 'holiday' ? 'holiday' : 'cuti-bersama') as AttendanceStatus) : 'absent';
                    const notes = isWknd ? 'Weekend' : holiday ? holiday.nameEn : 'Absent';
                    combinedTeam.push({
                        id: `team-absent-${member.id}-${dateStr}`,
                        userId: member.id,
                        userName: member.fullName,
                        date: dateStr,
                        clockIn: null,
                        clockOut: null,
                        status,
                        notes,
                        totalMinutes: 0,
                        overtimeMinutes: 0,
                    });
                }
            });
        });

        return combinedTeam;
    }, [records, daysInMonth, viewMode, user?.id, teamProfiles]);

    const displayedRecordsList = fullMonthRecords;

    // Filter team records by member query for dynamic stats
    const targetTeamRecords = useMemo(() => {
        if (viewMode !== 'team') return displayedRecordsList;
        if (!searchQuery.trim()) return displayedRecordsList;
        const query = searchQuery.trim().toLowerCase();
        return displayedRecordsList.filter(r => (r.userName || '').toLowerCase().includes(query));
    }, [displayedRecordsList, viewMode, searchQuery]);

    // Member items formatted for SearchablePicker (matching Project Selector)
    const memberPickerItems = useMemo(() => {
        if (viewMode !== 'team') return [];
        const set = new Map<string, string>();
        teamProfiles.forEach(p => {
            set.set(p.fullName, p.fullName);
        });
        records.forEach(r => {
            if (r.userName) set.set(r.userName, r.userName);
        });
        const names = Array.from(set.values()).sort((a, b) => a.localeCompare(b));
        return [
            { id: 'ALL', label: 'All Team Members' },
            ...names.map(name => ({ id: name, label: name }))
        ];
    }, [records, teamProfiles, viewMode]);

    // Calculate stats
    const stats = useMemo(() => {
        return calculateStats(records as any, currentMonth);
    }, [records, currentMonth]);

    // Calculate Team stats (Dynamic based on member filter)
    const teamStats = useMemo(() => {
        if (viewMode !== 'team') return null;

        const userRecordsMap = new Map<string, AttendanceRecord[]>();
        targetTeamRecords.forEach(r => {
            const key = r.userId || r.userName || 'unknown';
            if (!userRecordsMap.has(key)) {
                userRecordsMap.set(key, []);
            }
            userRecordsMap.get(key)!.push(r);
        });

        const totalMembers = userRecordsMap.size || 1;

        let totalDaysPresent = 0;
        let totalDaysLate = 0;
        let totalOvertimeMinutes = 0;
        let totalScoreSum = 0;

        userRecordsMap.forEach((userRecs) => {
            const presentCount = userRecs.filter(r => r.clockIn !== null).length;
            const lateCount = userRecs.filter(r => r.status === 'late').length;
            const otMinutes = userRecs.reduce((sum, r) => sum + r.overtimeMinutes, 0);

            const otHours = Math.round(otMinutes / 60);
            const otBonus = Math.min(otHours, 5);
            const userScore = Math.max(0, Math.min(100, 100 - lateCount * 2 + otBonus));

            totalDaysPresent += presentCount;
            totalDaysLate += lateCount;
            totalOvertimeMinutes += otMinutes;
            totalScoreSum += userScore;
        });

        const avgPresent = totalDaysPresent / totalMembers;
        const avgLate = totalDaysLate / totalMembers;
        const avgOvertimeHours = (totalOvertimeMinutes / 60) / totalMembers;
        const avgScore = totalScoreSum / totalMembers;

        let quality = 'GOOD';
        let qualityBg = 'rgba(0, 122, 255, 0.12)';
        let qualityColor = '#007AFF';
        if (avgScore >= 85) {
            quality = 'EXCELLENT';
            qualityBg = 'rgba(52, 199, 89, 0.12)';
            qualityColor = '#34C759';
        } else if (avgScore >= 70) {
            quality = 'GOOD';
            qualityBg = 'rgba(0, 122, 255, 0.12)';
            qualityColor = '#007AFF';
        } else if (avgScore >= 50) {
            quality = 'AVERAGE';
            qualityBg = 'rgba(255, 149, 0, 0.12)';
        } else {
            quality = 'POOR';
            qualityBg = 'rgba(255, 59, 48, 0.12)';
            qualityColor = '#FF3B30';
        }

        const monthStart = periodDateRange.start;
        const today = new Date();
        const monthEnd = periodDateRange.end;
        const lastDay = isFuture(monthEnd) ? (today < monthStart ? monthStart : today) : monthEnd;
        const totalWorkingDays = eachDayOfInterval({ start: monthStart, end: lastDay }).filter(d => !isWeekendDay(d)).length || 20;

        return {
            avgPresent: avgPresent.toFixed(1),
            avgLate: avgLate.toFixed(1),
            avgOvertimeHours: avgOvertimeHours.toFixed(1),
            avgScore: Math.round(avgScore),
            quality,
            qualityBg,
            qualityColor,
            rawScore: avgScore.toFixed(1),
            totalMembers,
            workingDays: totalWorkingDays,
            penalty: -(avgLate * 2).toFixed(1),
            bonus: +(avgOvertimeHours * 0.25).toFixed(1)
        };
    }, [targetTeamRecords, currentMonth, viewMode, periodDateRange]);

    const activeTeamDateIndicator = useMemo(() => {
        if (viewMode !== 'team') return null;
        const targetDate = selectedDay ? format(selectedDay, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
        return getDateIndicator(targetDate);
    }, [viewMode, selectedDay]);

    useEffect(() => {
        if (onRegisterShare) {
            onRegisterShare(() => {
                const tenantInfo = activeTenant ? {
                    name: activeTenant.branding_name || activeTenant.name,
                    logoUrl: activeTenant.branding_logo_url || activeTenant.logo_url,
                    companyCode: activeTenant.company_code,
                    primaryColor: activeTenant.primary_color,
                    slug: activeTenant.slug
                } : undefined;

                if (viewMode === 'personal') {
                    const html = generatePersonalTimesheetHtml(
                        records,
                        currentMonth,
                        profile?.full_name || user?.email || 'Employee',
                        tenantInfo
                    );
                    const now = new Date();
                    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
                    const namePart = (profile?.full_name || 'Employee').replace(/\s+/g, '_');
                    const title = `${namePart}_Timesheet_${dateStr}`;
                    
                    if (onViewDocument) {
                        onViewDocument(html, title);
                    } else {
                        sharePersonalTimesheet(
                            records,
                            currentMonth,
                            profile?.full_name || user?.email || 'Employee'
                        );
                    }
                } else {
                    const html = generateTeamTimesheetHtml(
                        records,
                        currentMonth,
                        teamStats?.workingDays || 20,
                        tenantInfo
                    );
                    const now = new Date();
                    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
                    const title = `Team_Timesheet_${dateStr}`;
                    
                    if (onViewDocument) {
                        onViewDocument(html, title);
                    } else {
                        shareTeamTimesheet(
                            records,
                            currentMonth,
                            teamStats?.workingDays || 20
                        );
                    }
                }
            });
        }
    }, [viewMode, records, currentMonth, profile, user, teamStats, activeTenant, onRegisterShare, onViewDocument]);

    // Period dropdown options for jumping between periods
    const periodOptions = useMemo(() => {
        const opts: { id: string; label: string; date: Date }[] = [];
        const now = new Date();
        for (let i = 0; i < 12; i++) {
            const d = subMonths(now, i);
            let label = '';
            if (periodConfig.calculationMode === 'cutoff') {
                const startDay = periodConfig.cutoffDayStart || 21;
                const endDay = periodConfig.cutoffDayEnd || 20;
                const yr = d.getFullYear();
                const mo = d.getMonth();
                if (startDay <= endDay) {
                    const maxDays = new Date(yr, mo + 1, 0).getDate();
                    const actualStart = Math.min(startDay, maxDays);
                    const actualEnd = Math.min(endDay, maxDays);
                    label = `${actualStart} – ${actualEnd} ${format(d, 'MMM yyyy')}`;
                } else {
                    const sMonthDate = new Date(yr, mo - 1, 1);
                    const sYr = sMonthDate.getFullYear();
                    const sMo = sMonthDate.getMonth();
                    const maxStartDays = new Date(sYr, sMo + 1, 0).getDate();
                    const maxEndDays = new Date(yr, mo + 1, 0).getDate();
                    const actualStart = Math.min(startDay, maxStartDays);
                    const actualEnd = Math.min(endDay, maxEndDays);

                    const sDate = new Date(sYr, sMo, actualStart);
                    const eDate = new Date(yr, mo, actualEnd);
                    label = `${actualStart} ${format(sDate, 'MMM')} – ${actualEnd} ${format(eDate, 'MMM yyyy')}`;
                }
            } else {
                label = format(d, 'MMMM yyyy');
            }
            opts.push({
                id: format(d, 'yyyy-MM'),
                label,
                date: d,
            });
        }
        return opts;
    }, [periodConfig]);

    const periodMenuActions = useMemo(() => {
        const selectedKey = format(currentMonth, 'yyyy-MM');
        return periodOptions.map(opt => ({
            id: opt.id,
            title: opt.label,
            state: (opt.id === selectedKey ? 'on' : 'off') as 'on' | 'off',
        }));
    }, [periodOptions, currentMonth]);

    const isCurrentSummaryMonth = useMemo(() => {
        return format(currentMonth, 'yyyy-MM') >= format(new Date(), 'yyyy-MM');
    }, [currentMonth]);



    const displayedRecords = useMemo(() => {
        let filtered = [...displayedRecordsList];
        if (selectedDay) {
            const dayStr = format(selectedDay, 'yyyy-MM-dd');
            filtered = filtered.filter(r => r.date === dayStr);
        }

        if (viewMode === 'team' && searchQuery.trim()) {
            const query = searchQuery.trim().toLowerCase();
            filtered = filtered.filter(r => (r.userName || '').toLowerCase().includes(query));
        }

        filtered.sort((a, b) => {
            if (a.date !== b.date) {
                return b.date.localeCompare(a.date);
            }

            const isLeaveA = ['leave', 'sick', 'holiday', 'cuti-bersama'].includes(a.status || '');
            const isLeaveB = ['leave', 'sick', 'holiday', 'cuti-bersama'].includes(b.status || '');

            const rankA = a.clockIn ? 1 : isLeaveA ? 2 : 3;
            const rankB = b.clockIn ? 1 : isLeaveB ? 2 : 3;

            if (rankA !== rankB) {
                return rankA - rankB;
            }

            // If both are checked in, sort chronologically by earliest clock-in time
            if (a.clockIn && b.clockIn) {
                return a.clockIn.localeCompare(b.clockIn);
            }

            const nameA = a.userName || '';
            const nameB = b.userName || '';
            return nameA.localeCompare(nameB);
        });

        return filtered;
    }, [displayedRecordsList, selectedDay, viewMode, searchQuery]);

    useEffect(() => {
        if (onPeriodDataChange) {
            onPeriodDataChange({
                records: displayedRecordsList,
                stats,
                teamStats,
                periodLabel: periodDateRange.label,
            });
        }
    }, [displayedRecordsList, stats, teamStats, periodDateRange.label]);

    const handlePrevMonth = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setCurrentMonth(prev => subMonths(prev, 1));
        setExpandedRecordId(null);
    };

    const handleNextMonth = () => {
        if (isCurrentSummaryMonth) return; // Can't go to future months
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setCurrentMonth(prev => addMonths(prev, 1));
        setExpandedRecordId(null);
    };

    const isRecordMatch = (a: AttendanceRecord | null, b: AttendanceRecord) => {
        if (!a || !b) return false;
        if (a.id && b.id && a.id === b.id) return true;
        if (viewMode === 'personal') {
            return a.date === b.date;
        }
        return (a.userId && b.userId ? a.userId === b.userId : a.userName === b.userName) && a.date === b.date;
    };

    const handleCardPress = (record: AttendanceRecord) => {
        if (isDesktopWeb) {
            if (selectedRecord && isRecordMatch(selectedRecord, record)) {
                // Deselect if already selected
                onSelectRecord?.(null as any);
            } else {
                onSelectRecord?.(record);
            }
        } else {
            toggleExpand(record.id);
        }
    };

    const handlePhotoPress = (url: string, rec?: AttendanceRecord) => {
        if (isDesktopWeb && rec) {
            onSelectRecord?.(rec);
            return;
        }
        setPreviewPhoto(url);
        setIsPhotoSheetOpen(true);
    };

    const getStatusBadgeConfig = (status: AttendanceStatus) => {
        switch (status) {
            case 'ontime':
                return { label: 'On Time', bg: 'rgba(52, 199, 89, 0.15)', text: '#34C759', icon: 'checkmark-circle-outline' };
            case 'intime':
                return { label: 'In Time', bg: 'rgba(255, 149, 0, 0.15)', text: '#FF9500', icon: 'alert-circle-outline' };
            case 'late':
                return { label: 'Late', bg: 'rgba(255, 59, 48, 0.15)', text: '#FF3B30', icon: 'time-outline' };
            case 'leave':
                return { label: 'Leave', bg: 'rgba(175, 82, 222, 0.15)', text: '#AF52DE', icon: 'calendar-outline' };
            case 'sick':
                return { label: 'Sick', bg: 'rgba(255, 149, 0, 0.15)', text: '#FF9500', icon: 'medical-outline' };
            case 'absent':
                return { label: 'Absent', bg: 'rgba(142, 142, 147, 0.15)', text: '#8E8E93', icon: 'close-circle-outline' };
            case 'holiday':
                return { label: 'Holiday', bg: 'rgba(0, 122, 255, 0.15)', text: '#007AFF', icon: 'flag-outline' };
            case 'weekend':
                return { label: 'Weekend', bg: 'rgba(142, 142, 147, 0.1)', text: '#8E8E93', icon: 'cafe-outline' };
            default:
                return { label: status, bg: 'rgba(142, 142, 147, 0.15)', text: '#8E8E93', icon: 'help-circle-outline' };
        }
    };

    const getRightIndicatorConfig = (status: AttendanceStatus) => {
        switch (status) {
            case 'ontime':
                return { icon: 'checkmark', color: '#34C759', bg: 'rgba(52, 199, 89, 0.08)' };
            case 'intime':
                return { icon: 'warning', color: '#FF9500', bg: 'rgba(255, 149, 0, 0.08)' };
            case 'late':
                return { icon: 'warning', color: '#FF3B30', bg: 'rgba(255, 59, 48, 0.08)' };
            case 'absent':
                return { icon: 'close', color: '#8E8E93', bg: 'rgba(142, 142, 147, 0.08)' };
            case 'leave':
                return { icon: 'calendar', color: '#AF52DE', bg: 'rgba(175, 82, 222, 0.08)' };
            case 'sick':
                return { icon: 'medical', color: '#FF9500', bg: 'rgba(255, 149, 0, 0.08)' };
            case 'holiday':
                return { icon: 'calendar', color: '#FF9500', bg: 'rgba(255, 149, 0, 0.08)' };
            case 'weekend':
                return { icon: 'calendar-outline', color: '#8E8E93', bg: 'rgba(142, 142, 147, 0.05)' };
            default:
                return { icon: 'checkmark', color: '#34C759', bg: 'rgba(52, 199, 89, 0.08)' };
        }
    };

    const getNoteText = (record: AttendanceRecord) => {
        if (record.status === 'absent' || record.notes === 'Gak Hadir' || record.notes === 'Absent' || record.notes === 'Absent - Gak Hadir' || record.notes === 'Tidak Hadir') {
            return 'Absent';
        }
        const statusLabel = ({
            'weekend': 'Weekend',
            'holiday': 'National Holiday',
            'cuti-bersama': 'Joint Leave',
            'leave': 'Leave',
            'sick': 'Sick',
            'absent': 'Absent',
        } as Record<string, string>)[record.status] || record.status;
        return record.notes ? `${statusLabel} - ${record.notes}` : statusLabel;
    };

    const getDetailNoteText = (record: AttendanceRecord) => {
        if (record.notes) {
            return getNoteText(record);
        }
        if (['weekend', 'holiday', 'cuti-bersama', 'leave', 'sick', 'absent'].includes(record.status)) {
            return getNoteText(record);
        }
        return null;
    };

    const formatTime = (isoString?: string) => {
        if (!isoString) return '--:--';
        try {
            return format(new Date(isoString), 'HH:mm');
        } catch {
            return '--:--';
        }
    };

    const horizontalPad = isDesktopWeb ? 0 : 16;

    return (
        <View style={s.container}>
            {/* Month selector with interactive dropdown menu */}
            <View style={[s.monthSelector, { paddingHorizontal: horizontalPad }]}>
                <TouchableOpacity 
                    onPress={handlePrevMonth} 
                    style={[s.navCircle, { backgroundColor: isDark ? '#3A3A3C' : '#E8E8ED' }]}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <Ionicons name="chevron-back" size={15} color={isDark ? '#FFF' : '#3C3C43'} />
                </TouchableOpacity>

                <ContextMenu
                    actions={periodMenuActions}
                    dropdownMenuMode={true}
                    onPress={(event) => {
                        const action = periodOptions[event.nativeEvent.index];
                        if (action) {
                            if (Platform.OS === 'ios') Haptics.selectionAsync();
                            setCurrentMonth(action.date);
                            setExpandedRecordId(null);
                        }
                    }}
                >
                    <View style={[s.monthPill, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' }]}>
                        <Text style={[s.monthText, { color: textColor }]}>
                            {periodDateRange.label}
                        </Text>
                        <Ionicons name="chevron-down" size={12} color={subtextColor} style={{ marginLeft: 6 }} />
                    </View>
                </ContextMenu>

                <TouchableOpacity 
                    onPress={handleNextMonth} 
                    style={[s.navCircle, { backgroundColor: isDark ? '#3A3A3C' : '#E8E8ED' }, isCurrentSummaryMonth && { opacity: 0.25 }]} 
                    disabled={isCurrentSummaryMonth}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <Ionicons name="chevron-forward" size={15} color={isDark ? '#FFF' : '#3C3C43'} />
                </TouchableOpacity>
            </View>

            {/* Daily Slider for Team View */}
            {viewMode === 'team' && (
                <View style={s.daySliderContainer}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={[s.daySliderContent, { paddingHorizontal: horizontalPad }]}
                    >
                        <TouchableOpacity
                            onPress={() => setSelectedDay(null)}
                            style={[
                                s.allItem,
                                {
                                    backgroundColor: selectedDay === null
                                        ? (isDark ? 'rgba(10, 132, 255, 0.15)' : '#E5F1FF')
                                        : (isDark ? 'rgba(255, 255, 255, 0.05)' : '#F2F2F7')
                                }
                            ]}
                        >
                            <Text style={[s.allText, { color: selectedDay === null ? (isDark ? '#0A84FF' : '#007AFF') : textColor }]}>ALL</Text>
                        </TouchableOpacity>

                        {daysInMonth.map((day) => {
                            const isSelected = selectedDay && format(selectedDay, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
                            return (
                                <TouchableOpacity
                                    key={day.toISOString()}
                                    onPress={() => setSelectedDay(day)}
                                    style={[
                                        s.dayItem,
                                        {
                                            backgroundColor: isSelected
                                                ? (isDark ? 'rgba(10, 132, 255, 0.15)' : '#E5F1FF')
                                                : (isDark ? 'rgba(255, 255, 255, 0.05)' : '#F2F2F7')
                                        }
                                    ]}
                                >
                                    <Text style={[
                                        s.dayNameText,
                                        {
                                            color: isSelected ? (isDark ? '#0A84FF' : '#007AFF') : subtextColor,
                                            opacity: isSelected ? 1 : 0.6,
                                            fontWeight: isSelected ? '700' : '600'
                                        }
                                    ]}>
                                        {format(day, 'eee')}
                                    </Text>
                                    <Text style={[
                                        s.dayNumText,
                                        { 
                                            color: isSelected ? (isDark ? '#0A84FF' : '#007AFF') : textColor,
                                            fontWeight: isSelected ? '800' : '700'
                                        }
                                    ]}>
                                        {format(day, 'd')}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
            )}

            {/* Scrollable content block */}
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Personal View Stat Cards (Horizontal Scroll) */}
                {viewMode === 'personal' && (
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={s.summaryScroll}
                        contentContainerStyle={[s.summaryScrollContent, { paddingHorizontal: horizontalPad }]}
                        decelerationRate="fast"
                        snapToInterval={150 + 12}
                    >
                        <FinanceSummaryCard
                            icon="chart.pie.fill"
                            iconColor="#007AFF"
                            value={`${stats.attendanceScore}%`}
                            label="Score"
                            subValue="Attendance Rating"
                            style={s.statCardHorizontal}
                            onPress={() => setActiveStatKey('score')}
                        />
                        <FinanceSummaryCard
                            icon="checkmark.circle.fill"
                            iconColor="#34C759"
                            value={`${stats.totalDaysPresent}`}
                            label="Present"
                            subValue="Days worked"
                            style={s.statCardHorizontal}
                            onPress={() => setActiveStatKey('present')}
                        />
                        <FinanceSummaryCard
                            icon="exclamationmark.triangle.fill"
                            iconColor="#FF3B30"
                            value={`${stats.totalDaysLate}`}
                            label="Late"
                            subValue="Late arrivals"
                            style={s.statCardHorizontal}
                            onPress={() => setActiveStatKey('late')}
                        />
                        <FinanceSummaryCard
                            icon="clock.fill"
                            iconColor="#AF52DE"
                            value={`${Math.round(stats.totalOvertimeMinutes / 60)}h`}
                            label="Overtime"
                            subValue="Extra hours"
                            style={s.statCardHorizontal}
                            onPress={() => setActiveStatKey('overtime')}
                        />
                    </ScrollView>
                )}

                {/* Team View Stat Cards (Horizontal Scroll - Dynamic based on member filter) */}
                {viewMode === 'team' && teamStats && (
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={s.summaryScroll}
                        contentContainerStyle={s.summaryScrollContent}
                        decelerationRate="fast"
                        snapToInterval={150 + 12}
                    >
                        <FinanceSummaryCard
                            icon="checkmark.circle.fill"
                            iconColor="#34C759"
                            value={teamStats.avgPresent}
                            label={searchQuery ? "Present" : "Avg Present"}
                            subValue={`/ ${teamStats.workingDays} days`}
                            style={s.statCardHorizontal}
                            disabled
                        />
                        <FinanceSummaryCard
                            icon="exclamationmark.triangle.fill"
                            iconColor="#FF9500"
                            value={teamStats.avgLate}
                            label={searchQuery ? "Late" : "Avg Late"}
                            subValue={`Penalty: ${teamStats.penalty}`}
                            style={s.statCardHorizontal}
                            disabled
                        />
                        <FinanceSummaryCard
                            icon="clock.fill"
                            iconColor="#AF52DE"
                            value={`${teamStats.avgOvertimeHours}h`}
                            label={searchQuery ? "Overtime" : "Avg Overtime"}
                            subValue={`Bonus: +${teamStats.bonus}`}
                            style={s.statCardHorizontal}
                            disabled
                        />
                        <FinanceSummaryCard
                            icon="face.smiling"
                            iconColor={teamStats.qualityColor}
                            value={teamStats.quality}
                            label={searchQuery ? "Member Rating" : "Team Quality"}
                            subValue={`Raw: ${teamStats.rawScore}`}
                            style={s.statCardHorizontal}
                            disabled
                        />
                        <FinanceSummaryCard
                            icon="chart.pie.fill"
                            iconColor="#007AFF"
                            value={`${teamStats.avgScore}%`}
                            label={searchQuery ? "Member Score" : "Avg Score"}
                            subValue={`${teamStats.totalMembers} members`}
                            style={s.statCardHorizontal}
                            disabled
                        />
                    </ScrollView>
                )}

                {/* Member Filter Dropdown (Styled like Project Selector pill in Finance/Crew) */}
                {viewMode === 'team' && (
                    <View style={s.memberFilterRow}>
                        <TouchableOpacity
                            style={[
                                s.memberDropdownPill,
                                { 
                                    backgroundColor: searchQuery ? (isDark ? 'rgba(10, 132, 255, 0.15)' : '#E5F1FF') : (isDark ? '#1C1C1E' : '#FFFFFF'),
                                    borderColor: searchQuery ? (isDark ? '#0A84FF' : '#007AFF') : (isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)')
                                }
                            ]}
                            onPress={() => setIsMemberModalOpen(true)}
                            activeOpacity={0.7}
                        >
                            <Ionicons 
                                name="person-outline" 
                                size={14} 
                                color={searchQuery ? (isDark ? '#0A84FF' : '#007AFF') : subtextColor} 
                                style={{ marginRight: 6 }} 
                            />
                            <Text style={[
                                s.memberDropdownPillText,
                                { color: searchQuery ? (isDark ? '#0A84FF' : '#007AFF') : textColor }
                            ]} numberOfLines={1}>
                                {searchQuery ? searchQuery : 'All Team Members'}
                            </Text>
                            <Ionicons 
                                name="chevron-down" 
                                size={12} 
                                color={searchQuery ? (isDark ? '#0A84FF' : '#007AFF') : subtextColor} 
                                style={{ marginLeft: 6 }} 
                            />
                        </TouchableOpacity>

                        {searchQuery.length > 0 && (
                            <TouchableOpacity 
                                style={[
                                    s.clearMemberPillBtn, 
                                    { 
                                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E8E8ED',
                                        borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)' 
                                    }
                                ]}
                                onPress={() => setSearchQuery('')}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <Ionicons name="close" size={14} color={textColor} />
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {/* Global Team Date Indicator Banner (shown when a specific day is selected in Team view) */}
                {viewMode === 'team' && selectedDay !== null && activeTeamDateIndicator && (
                    <View style={s.globalTeamBannerWrapper}>
                        <View style={[
                            s.globalTeamDateBanner,
                            { backgroundColor: isDark ? 'rgba(255, 149, 0, 0.14)' : 'rgba(255, 149, 0, 0.08)' }
                        ]}>
                            <Text style={[s.globalTeamDateBannerText, { color: isDark ? '#FF9F0A' : '#FF9500' }]}>
                                {activeTeamDateIndicator}
                            </Text>
                        </View>
                    </View>
                )}

                {/* Logs list */}
                {loading ? (
                    <View style={s.loader}>
                        <ActivityIndicator size="large" color="#007AFF" />
                    </View>
                ) : displayedRecords.length === 0 ? (
                    <View style={s.empty}>
                        <View style={[s.emptyIconContainer, { backgroundColor: isDark ? 'rgba(142, 142, 147, 0.12)' : 'rgba(142, 142, 147, 0.08)' }]}>
                            <Ionicons name="folder-open-outline" size={40} color={isDark ? '#A1A1A6' : '#8E8E93'} />
                        </View>
                        <Text style={[s.emptyTitle, { color: textColor }]}>No Records</Text>
                        <Text style={[s.emptyText, { color: subtextColor }]}>No attendance records found for this period.</Text>
                    </View>
                ) : (
                    <View style={[s.list, { paddingHorizontal: horizontalPad }]}>
                        {displayedRecords.map(record => {
                            const hasClockTimes = !!record.clockIn;
                            const isExpanded = expandedRecordId === record.id;
                            const isSelectedInDesktop = isDesktopWeb && selectedRecord && isRecordMatch(selectedRecord, record);
                            const dayName = format(new Date(record.date), 'EEEE');
                            const monthName = format(new Date(record.date), 'MMM').toUpperCase();
                            const dateNum = format(new Date(record.date), 'd');
                            const cardBorderColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)';
                            const rightIndicator = getRightIndicatorConfig(record.status);
                            const holidayText = getHolidayText(record.date);
                            const cardDateInfo = viewMode === 'personal' ? holidayText : (selectedDay === null ? getDateIndicator(record.date) : null);

                            return (
                                <View key={record.id} style={s.recordWrapper}>
                                    <TouchableOpacity 
                                        style={[
                                            s.recordCard,
                                            {
                                                backgroundColor: isSelectedInDesktop
                                                    ? (isDark ? 'rgba(10, 132, 255, 0.12)' : 'rgba(0, 54, 248, 0.05)')
                                                    : (isDark ? '#1C1C1E' : '#FFF'),
                                                borderColor: isSelectedInDesktop 
                                                    ? (isDark ? '#0A84FF' : '#0036F8') 
                                                    : cardBorderColor,
                                                borderWidth: isSelectedInDesktop ? 1.5 : (isDark ? 0.5 : 1),
                                            }
                                        ]}
                                        onPress={() => handleCardPress(record)}
                                        activeOpacity={0.8}
                                    >
                                        <View style={s.cardTopRow}>
                                            {/* Sweet Circle Date Badge */}
                                            <View style={[
                                                s.dateCircle,
                                                {
                                                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F2F2F7'
                                                }
                                            ]}>
                                                <Text style={[s.dateCircleNum, { color: textColor }]}>{dateNum}</Text>
                                                <Text style={[s.dateCircleMonth, { color: subtextColor }]}>{monthName}</Text>
                                            </View>

                                            <View style={s.cardInfo}>
                                                <View style={s.cardHeader}>
                                                    {viewMode === 'team' ? (
                                                        // Team View shows user name + location badge
                                                        <View style={s.cardDayLoc}>
                                                            <Text style={[s.cardDayName, { color: textColor }]} numberOfLines={1}>
                                                                {record.userName || 'Employee'}
                                                            </Text>
                                                            {(record.checkInLocationCode || record.checkInRemoteMode) && (
                                                                <View style={[s.locPill, { backgroundColor: isDark ? 'rgba(142,142,147,0.15)' : 'rgba(142,142,147,0.08)' }]}>
                                                                    <Text style={[s.locText, { color: subtextColor }]}>
                                                                        {record.checkInLocationCode || (record.checkInRemoteMode ? record.checkInRemoteMode.toUpperCase() : 'OFFICE')}
                                                                    </Text>
                                                                </View>
                                                            )}
                                                        </View>
                                                    ) : (
                                                        // Personal View shows day name + location badge
                                                        <View style={s.cardDayLoc}>
                                                            <Text style={[s.cardDayName, { color: textColor }]}>
                                                                {format(new Date(record.date), 'EEEE')}
                                                            </Text>
                                                            {(record.checkInLocationCode || record.checkInRemoteMode) && (
                                                                <View style={[s.locPill, { backgroundColor: isDark ? 'rgba(142,142,147,0.15)' : 'rgba(142,142,147,0.08)' }]}>
                                                                    <Text style={[s.locText, { color: subtextColor }]}>
                                                                        {record.checkInLocationCode || (record.checkInRemoteMode ? record.checkInRemoteMode.toUpperCase() : 'OFFICE')}
                                                                    </Text>
                                                                </View>
                                                            )}
                                                        </View>
                                                    )}

                                                    {/* Right indicator circle */}
                                                    <View style={[s.rightIndicatorCircle, { backgroundColor: rightIndicator.bg }]}>
                                                        <Ionicons name={rightIndicator.icon as any} size={12} color={rightIndicator.color} />
                                                    </View>
                                                </View>
                                                
                                                <View style={s.cardFooter}>
                                                    {record.clockIn ? (
                                                        <>
                                                            <View style={s.timeBlock}>
                                                                <Text style={[s.timeLabel, { color: subtextColor }]}>IN <Text style={[s.timeVal, { color: textColor }]}>{formatTime(record.clockIn)}</Text></Text>
                                                                {record.checkInPhotoUrl && (
                                                                    <TouchableOpacity 
                                                                        onPress={() => handlePhotoPress(record.checkInPhotoUrl!, record)} 
                                                                        style={{ paddingVertical: 0, paddingHorizontal: 2 }}
                                                                    >
                                                                        <Ionicons name="camera-outline" size={12} color="#8E8E93" />
                                                                    </TouchableOpacity>
                                                                )}
                                                            </View>
                                                            <View style={s.timeBlock}>
                                                                <Text style={[s.timeLabel, { color: subtextColor }]}>OUT <Text style={[s.timeVal, { color: textColor }]}>{record.clockOut ? formatTime(record.clockOut) : '-'}</Text></Text>
                                                                {record.checkOutPhotoUrl && (
                                                                    <TouchableOpacity 
                                                                        onPress={() => handlePhotoPress(record.checkOutPhotoUrl!, record)} 
                                                                        style={{ paddingVertical: 0, paddingHorizontal: 2 }}
                                                                    >
                                                                        <Ionicons name="camera-outline" size={12} color="#8E8E93" />
                                                                    </TouchableOpacity>
                                                                )}
                                                            </View>
                                                        </>
                                                    ) : (
                                                        <View style={s.timeBlock}>
                                                            <Text style={[s.timeLabel, { color: subtextColor }]}>
                                                                STATUS <Text style={[s.timeVal, { color: subtextColor }]}>
                                                                    {record.status === 'absent' || record.notes === 'Gak Hadir' || record.notes === 'Tidak Hadir' ? 'Absent' : (record.notes || (record.status === 'weekend' ? 'Weekend' : record.status === 'holiday' ? 'Holiday' : record.status))}
                                                                </Text>
                                                            </Text>
                                                        </View>
                                                    )}
                                                </View>
                                            </View>
                                        </View>

                                        {/* Bottom Holiday/Date Info inside card (Personal View OR Team ALL view) */}
                                        {cardDateInfo && (
                                            <View style={[
                                                s.personalBottomHoliday,
                                                { backgroundColor: isDark ? 'rgba(255, 149, 0, 0.14)' : 'rgba(255, 149, 0, 0.08)' }
                                            ]}>
                                                <Text style={[s.personalBottomHolidayText, { color: isDark ? '#FF9F0A' : '#FF9500' }]} numberOfLines={1}>
                                                    {cardDateInfo}
                                                </Text>
                                            </View>
                                        )}

                                        {isExpanded && !isDesktopWeb && (
                                            <View style={s.details}>
                                                <View style={s.detailsGrid}>
                                                    <View style={s.detailItem}>
                                                        <Text style={s.detailLabel}>Duration</Text>
                                                        <Text style={[s.detailVal, { color: textColor }]}>{formatMinutes(record.totalMinutes)}</Text>
                                                    </View>
                                                    {record.overtimeMinutes > 0 && (
                                                        <View style={s.detailItem}>
                                                            <Text style={s.detailLabel}>Overtime</Text>
                                                            <Text style={[s.detailVal, { color: textColor }]}>+{formatMinutes(record.overtimeMinutes)} OT</Text>
                                                        </View>
                                                    )}
                                                    {(record.checkInLatitude && record.checkInLongitude) ? (
                                                        <View style={s.detailItem}>
                                                            <Text style={s.detailLabel}>Coordinates</Text>
                                                            <Text style={[s.detailVal, { color: textColor, fontSize: 11 }]}>
                                                                {record.checkInLatitude.toFixed(5)}, {record.checkInLongitude.toFixed(5)}
                                                            </Text>
                                                        </View>
                                                    ) : record.checkInLocationStatus ? (
                                                        <View style={s.detailItem}>
                                                            <Text style={s.detailLabel}>In Location</Text>
                                                            <Text style={[s.detailVal, { color: record.checkInLocationStatus === 'inside' ? '#34C759' : '#FF3B30' }]}>
                                                                {record.checkInLocationStatus.toUpperCase()}
                                                            </Text>
                                                        </View>
                                                    ) : null}
                                                </View>

                                                {getDetailNoteText(record) && (
                                                    <View style={s.notesContainer}>
                                                        <Text style={s.detailLabel}>Notes</Text>
                                                        <Text style={[s.notesText, { color: textColor }]}>{getDetailNoteText(record)}</Text>
                                                    </View>
                                                )}

                                                {/* Correction Status Banner */}
                                                {(() => {
                                                    const corrReq = correctionRequests.find(c => c.attendanceDate === record.date || c.attendanceRecordId === record.id);
                                                    if (!corrReq) return null;
                                                    const statusCol = corrReq.status === 'approved' ? '#34C759' : corrReq.status === 'rejected' ? '#FF3B30' : '#FF9500';
                                                    const bgCol = corrReq.status === 'approved' ? 'rgba(52,199,89,0.12)' : corrReq.status === 'rejected' ? 'rgba(255,59,48,0.12)' : 'rgba(255,149,0,0.12)';
                                                    const iconName = corrReq.status === 'approved' ? 'checkmark.circle.fill' : corrReq.status === 'rejected' ? 'xmark.circle.fill' : 'clock.fill';
                                                    return (
                                                        <View style={[s.correctionStatusPill, { backgroundColor: bgCol }]}>
                                                            <PlatformIcon name={iconName} size={13} tintColor={statusCol} />
                                                            <Text style={[s.correctionStatusText, { color: statusCol }]} numberOfLines={1}>
                                                                {corrReq.status === 'pending'
                                                                    ? `Correction Pending (${corrReq.originalValue} ➔ ${corrReq.requestedValue})`
                                                                    : corrReq.status === 'approved'
                                                                    ? `Correction Applied (${corrReq.requestedValue})`
                                                                    : `Correction Rejected (${corrReq.rejectReason || 'Declined'})`}
                                                            </Text>
                                                        </View>
                                                    );
                                                })()}

                                                {/* Photo Attachments */}
                                                <View style={s.photosRow}>
                                                    {record.checkInPhotoUrl && (
                                                        <View style={s.photoWrapper}>
                                                            <TouchableOpacity onPress={() => handlePhotoPress(record.checkInPhotoUrl!, record)} style={s.photoBtn}>
                                                                <Image source={{ uri: record.checkInPhotoUrl }} style={s.photoThumb} resizeMode="cover" />
                                                            </TouchableOpacity>
                                                            <Text style={s.photoLabelText}>Clock In</Text>
                                                        </View>
                                                    )}
                                                    {record.checkOutPhotoUrl && (
                                                        <View style={s.photoWrapper}>
                                                            <TouchableOpacity onPress={() => handlePhotoPress(record.checkOutPhotoUrl!, record)} style={s.photoBtn}>
                                                                <Image source={{ uri: record.checkOutPhotoUrl }} style={s.photoThumb} resizeMode="cover" />
                                                            </TouchableOpacity>
                                                            <Text style={s.photoLabelText}>Clock Out</Text>
                                                        </View>
                                                    )}
                                                </View>

                                                {/* Request Correction Action Button */}
                                                {(() => {
                                                    const corrReq = correctionRequests.find(c => c.attendanceDate === record.date || c.attendanceRecordId === record.id);
                                                    if (corrReq?.status === 'pending') return null;
                                                    const daysDiff = differenceInDays(new Date(), new Date(record.date));
                                                    const isEligible = correctionPolicy.allowAttendanceCorrection && daysDiff <= (correctionPolicy.maxBackdateDays || 3) && daysDiff >= 0;
                                                    if (!isEligible) return null;

                                                    return (
                                                        <TouchableOpacity
                                                            style={[
                                                                s.requestCorrectionBtn,
                                                                { backgroundColor: isDark ? 'rgba(14,165,233,0.15)' : 'rgba(14,165,233,0.1)' }
                                                            ]}
                                                            onPress={() => {
                                                                setSelectedRecordForCorrection(record);
                                                                setCorrectionModalVisible(true);
                                                            }}
                                                            activeOpacity={0.7}
                                                        >
                                                            <PlatformIcon name="pencil" size={14} tintColor="#0EA5E9" />
                                                            <Text style={s.requestCorrectionBtnText}>Request Correction</Text>
                                                        </TouchableOpacity>
                                                    );
                                                })()}
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            );
                        })}
                    </View>
                )}
            </ScrollView>

            {/* Attendance Correction Modal */}
            <AttendanceCorrectionModal
                visible={correctionModalVisible}
                onClose={() => setCorrectionModalVisible(false)}
                record={selectedRecordForCorrection}
                onSuccess={() => loadRecords()}
            />

            {/* SwiftUI Native Image Bottom Sheet (iOS) / Standard sliding Drawer (Android) */}
            {!isDesktopWeb && (
                <SwiftUIImagePreviewSheet
                    isOpened={isPhotoSheetOpen}
                    onClose={() => setIsPhotoSheetOpen(false)}
                    imageUrl={previewPhoto}
                    title="Attendance Photo Proof"
                />
            )}

            {/* Stat Detail Modal */}
            <Modal visible={!!activeStatKey} transparent animationType="fade" onRequestClose={() => setActiveStatKey(null)}>
                <TouchableOpacity style={s.statOverlay} activeOpacity={1} onPress={() => setActiveStatKey(null)}>
                    <View style={[s.statPopup, { backgroundColor: isDark ? '#2C2C2E' : '#FFF' }]}>
                        <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
                        {activeStatKey === 'score' && (
                            <>
                                <Text style={[s.popoverTitle, { color: textColor }]}>Score Breakdown</Text>
                                <View style={s.popoverRow}>
                                    <Text style={[s.popoverLabel, { color: subtextColor }]}>Present</Text>
                                    <Text style={[s.popoverValue, { color: textColor }]}>{stats.totalDaysPresent} days</Text>
                                </View>
                                <View style={s.popoverRow}>
                                    <Text style={[s.popoverLabel, { color: subtextColor }]}>Late Penalty</Text>
                                    <Text style={[s.popoverValue, { color: '#FF3B30' }]}>-{stats.totalDaysLate * 2}%</Text>
                                </View>
                                <View style={s.popoverRow}>
                                    <Text style={[s.popoverLabel, { color: subtextColor }]}>OT Bonus</Text>
                                    <Text style={[s.popoverValue, { color: '#34C759' }]}>+{Math.min(Math.round(stats.totalOvertimeMinutes / 60), 5)}%</Text>
                                </View>
                                <View style={[s.popoverRow, s.popoverRowTotal]}>
                                    <Text style={[s.popoverLabel, { color: textColor, fontWeight: '700' }]}>Final</Text>
                                    <Text style={[s.popoverValue, { color: '#007AFF', fontWeight: '800', fontSize: 17 }]}>{stats.attendanceScore}%</Text>
                                </View>
                            </>
                        )}
                        {activeStatKey === 'present' && (
                            <>
                                <Text style={[s.popoverTitle, { color: textColor }]}>Present Days</Text>
                                {fullMonthRecords.filter(r => ['ontime', 'intime', 'late'].includes(r.status)).map(r => (
                                    <View key={r.id} style={s.popoverRow}>
                                        <Text style={[s.popoverLabel, { color: subtextColor }]}>{format(new Date(r.date), 'EEE, d')}</Text>
                                        <View style={[s.miniBadge, { backgroundColor: getStatusDisplayInfo(r.status).color }]}>
                                            <Text style={s.miniBadgeText}>{r.status === 'ontime' ? 'On Time' : r.status === 'intime' ? 'In Time' : 'Late'}</Text>
                                        </View>
                                    </View>
                                ))}
                            </>
                        )}
                        {activeStatKey === 'late' && (
                            <>
                                <Text style={[s.popoverTitle, { color: textColor }]}>Late Arrivals</Text>
                                {fullMonthRecords.filter(r => r.status === 'late').length === 0 ? (
                                    <Text style={[s.popoverLabel, { color: '#34C759', marginTop: 4 }]}>🎉 No late arrivals!</Text>
                                ) : fullMonthRecords.filter(r => r.status === 'late').map(r => (
                                    <View key={r.id} style={s.popoverRow}>
                                        <Text style={[s.popoverLabel, { color: subtextColor }]}>{format(new Date(r.date), 'EEE, d')}</Text>
                                        <Text style={[s.popoverValue, { color: '#FF3B30' }]}>{formatTime(r.clockIn ?? undefined)}</Text>
                                    </View>
                                ))}
                            </>
                        )}
                        {activeStatKey === 'overtime' && (
                            <>
                                <Text style={[s.popoverTitle, { color: textColor }]}>OT Breakdown</Text>
                                <View style={s.popoverRow}>
                                    <Text style={[s.popoverLabel, { color: subtextColor }]}>Regular Day</Text>
                                    <Text style={[s.popoverValue, { color: textColor }]}>
                                        {formatMinutes(fullMonthRecords.filter(r => !isWeekendDay(new Date(r.date)) && r.overtimeMinutes > 0).reduce((sum, r) => sum + r.overtimeMinutes, 0))}
                                    </Text>
                                </View>
                                <View style={s.popoverRow}>
                                    <Text style={[s.popoverLabel, { color: subtextColor }]}>Weekend / Holiday</Text>
                                    <Text style={[s.popoverValue, { color: textColor }]}>
                                        {formatMinutes(fullMonthRecords.filter(r => isWeekendDay(new Date(r.date)) && r.totalMinutes > 0).reduce((sum, r) => sum + r.totalMinutes, 0))}
                                    </Text>
                                </View>
                                <View style={[s.popoverRow, s.popoverRowTotal]}>
                                    <Text style={[s.popoverLabel, { color: textColor, fontWeight: '700' }]}>Total</Text>
                                    <Text style={[s.popoverValue, { color: '#AF52DE', fontWeight: '800' }]}>{Math.round(stats.totalOvertimeMinutes / 60)}h</Text>
                                </View>
                            </>
                        )}
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Bottom Sheet Picker (Same standard component as Project Selector) */}
            <SearchablePicker
                visible={isMemberModalOpen}
                onClose={() => setIsMemberModalOpen(false)}
                onSelect={(item) => {
                    if (item.id === 'ALL') {
                        setSearchQuery('');
                    } else {
                        setSearchQuery(item.id);
                    }
                    setIsMemberModalOpen(false);
                }}
                items={memberPickerItems}
                title="Select Team Member"
                selectedId={searchQuery || 'ALL'}
                tintColor="#007AFF"
            />

        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1 },
    monthSelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 12, paddingHorizontal: 16 },
    navCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
    monthPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
    },
    monthText: { fontSize: 14.5, fontWeight: '700' },
    searchContainer: {
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 42,
        paddingHorizontal: 12,
        borderRadius: 14,
        borderWidth: 1,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        paddingVertical: 0,
        height: '100%',
    },
    statsGrid: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 20 },
    statCard: { flex: 1, paddingVertical: 14, paddingHorizontal: 8, borderRadius: 16, alignItems: 'center' },
    statVal: { fontSize: 20, fontWeight: '800', marginBottom: 2 },
    statLabel: { fontSize: 10, fontWeight: '600' },
    statOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 32 },
    statPopup: { width: '100%', maxWidth: 300, borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 8 },
    popoverTitle: { fontSize: 16, fontWeight: '700', marginBottom: 14 },
    popoverRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7 },
    popoverRowTotal: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(0,0,0,0.1)', paddingTop: 12, marginTop: 6 },
    popoverLabel: { fontSize: 14, fontWeight: '500' },
    popoverValue: { fontSize: 14, fontWeight: '700' },
    miniBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100 },
    miniBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    emptyText: { marginTop: 12, fontSize: 15 },
    list: { paddingBottom: 40, gap: 8, paddingHorizontal: 16 },
    recordCard: { borderRadius: 24, padding: 16, borderWidth: 1, overflow: 'hidden' },
    cardTopRow: { flexDirection: 'row', alignItems: 'center' },
    dateCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    dateCircleNum: { fontSize: 18, fontWeight: '800', lineHeight: 22 },
    dateCircleMonth: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    cardInfo: { flex: 1, marginLeft: 16 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    cardDayLoc: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
    cardDayName: { fontSize: 16, fontWeight: '700' },
    locPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, gap: 3 },
    locText: { fontSize: 9, fontWeight: '600', letterSpacing: 0.2 },
    letterBadge: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    letterBadgeText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
    cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    timeBlock: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    timeLabel: { fontSize: 11, fontWeight: '600' },
    timeVal: { fontSize: 13, fontWeight: '700' },
    iconBtn: { padding: 4 },
    details: { marginTop: 16, paddingTop: 4, gap: 16 },
    detailsGrid: { flexDirection: 'row', gap: 32 },
    detailItem: {},
    detailLabel: { fontSize: 11, fontWeight: '500', color: '#8E8E93', marginBottom: 4 },
    detailVal: { fontSize: 14, fontWeight: '600' },
    notesContainer: {},
    notesText: { fontSize: 13, lineHeight: 18 },
    photosRow: { flexDirection: 'row', gap: 16, marginTop: 4 },
    photoWrapper: { gap: 8, alignItems: 'center' },
    photoBtn: { width: 130, height: 130, borderRadius: 20, overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.03)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,0,0,0.1)' },
    photoThumb: { width: '100%', height: '100%' },
    photoLabelText: { fontSize: 12, fontWeight: '500', color: '#8E8E93' },
    summaryScroll: {
        marginBottom: 20,
    },
    summaryScrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 4,
    },
    statCardHorizontal: {
        width: 150,
        marginRight: 12,
        marginBottom: 0,
    },
    daySliderContainer: {
        marginBottom: 16,
    },
    daySliderContent: {
        paddingHorizontal: 16,
    },
    dayItem: {
        width: 50,
        height: 68,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    dayNameText: {
        fontSize: 10,
        fontWeight: '600',
        marginBottom: 4,
    },
    dayNumText: {
        fontSize: 16,
        fontWeight: '700',
    },
    allItem: {
        width: 50,
        height: 68,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    allText: {
        fontSize: 13,
        fontWeight: '700',
    },
    rightIndicatorCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    noteText: {
        fontSize: 11,
        fontWeight: '600',
        marginTop: 6,
        letterSpacing: 0.3,
    },
    recordWrapper: {
        width: '100%',
    },
    globalTeamBannerWrapper: {
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    globalTeamDateBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 14,
    },
    globalTeamDateBannerText: {
        fontSize: 13,
        fontWeight: '700',
        flex: 1,
    },
    personalBottomHoliday: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 12,
        marginTop: 10,
    },
    personalBottomHolidayText: {
        fontSize: 12,
        fontWeight: '700',
        flex: 1,
    },
    holidayTextBelow: {
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 16,
        marginTop: 6,
    },
    emptyIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 6,
    },
    memberFilterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 16,
        gap: 8,
    },
    memberDropdownPill: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 38,
        paddingHorizontal: 14,
        borderRadius: 19,
        borderWidth: 1,
    },
    memberDropdownPillText: {
        fontSize: 13,
        fontWeight: '700',
    },
    clearMemberPillBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    correctionStatusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        marginTop: 10,
    },
    correctionStatusText: {
        fontSize: 12,
        fontWeight: '600',
        flex: 1,
    },
    requestCorrectionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 9,
        paddingHorizontal: 16,
        borderRadius: 999,
        marginTop: 12,
    },
    requestCorrectionBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#0EA5E9',
    },
});
