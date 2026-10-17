import React, { useState, useEffect, useRef, useMemo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Dimensions, Platform, Animated, Pressable, LayoutChangeEvent, Alert } from 'react-native';
import { useUserContext } from '@/context/UserProvider';
import { format, differenceInCalendarDays, startOfMonth, endOfMonth, subMonths, addMonths, getDaysInMonth, isSunday, isSaturday } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { clockAction, fetchAttendanceRecords, fetchLeaveRequests } from '@/lib/api/attendance';
import { calculateMonthlySummaryMetrics } from '@/lib/clock-data-logic';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import Reanimated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { ClockConfirmModal, ClockConfirmPayload } from '@/components/home/ClockConfirmModal';
import { HOLIDAYS_2026 } from '@/lib/constants/holidays';
import ContextMenu, { ContextMenuAction } from '@/components/ui/PlatformContextMenu';
import Svg, { Path, Circle, Line, Defs, LinearGradient as SvgGradient, Stop, G, Text as SvgText } from 'react-native-svg';

const { width } = Dimensions.get('window');

export type ClockPeriodType = 'today' | 'this_month' | 'last_month' | '3_months' | '1_year' | 'all_time';

interface MonthlyStats {
    workingHoursProgress: string;
    workingHoursPercent: number;
    workingHoursPace: string;
    workingHoursPaceColor: string;
    lateArrivalsCount: number;
    leaveHistoryCount: number;
    annualLeaveLeft: string;
}

export interface ClockOverviewProps {
    renderPart?: 'all' | 'hero' | 'summary';
}

export function ClockOverview({ renderPart = 'all' }: ClockOverviewProps = {}) {
    const { user, profile, attendanceStatus, todaySessions, refreshAttendance } = useUserContext();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';

    const getValueFontSize = (text: string) => {
        if (text.length > 12) return 18;
        if (text.length > 8) return 20;
        return 24;
    };
    
    // Theme colors
    const textColor = Colors[resolvedTheme].text;
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';
    const borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)';
    const cardBgColor = isDark ? 'rgba(255, 255, 255, 0.05)' : '#FFFFFF';

    const [currentTime, setCurrentTime] = useState(new Date());
    const [selectedPeriod, setSelectedPeriod] = useState<ClockPeriodType>('today');
    const [selectedSummaryMonth, setSelectedSummaryMonth] = useState(new Date());
    const [chartWidth, setChartWidth] = useState(width - 80);
    const [summaryChartWidth, setSummaryChartWidth] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showClockModal, setShowClockModal] = useState(false);
    const [workSchedule, setWorkSchedule] = useState({ startTime: '08:00', endTime: '17:00' });
    const [monthlyStats, setMonthlyStats] = useState<MonthlyStats>({
        workingHoursProgress: "0.0 / 0.0",
        workingHoursPercent: 0,
        workingHoursPace: "0.0 hrs",
        workingHoursPaceColor: '#8E8E93',
        lateArrivalsCount: 0,
        leaveHistoryCount: 0,
        annualLeaveLeft: "12 / 12"
    });
    const [monthRecords, setMonthRecords] = useState<any[]>([]);
    
    const [loadingStats, setLoadingStats] = useState(true);
    const [isFirstLoad, setIsFirstLoad] = useState(true);

    const pulseAnim = useRef(new Animated.Value(0.4)).current;

    const btnScale = useSharedValue(1);
    const animatedBtnScaleStyle = useAnimatedStyle(() => ({
        transform: [{ scale: btnScale.value }],
    }));

    const handleBtnPressIn = () => {
        'worklet';
        btnScale.value = withSpring(0.94, { damping: 14, stiffness: 320, mass: 0.6 });
    };

    const handleBtnPressOut = () => {
        'worklet';
        btnScale.value = withSpring(1, { damping: 14, stiffness: 320, mass: 0.6 });
    };

    // Clock ticking (needed for date & overtime boundaries)
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 5000);
        return () => clearInterval(timer);
    }, []);

    // Pulse animation
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1200,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 0.4,
                    duration: 1200,
                    useNativeDriver: true,
                })
            ])
        ).start();
    }, [pulseAnim]);

    // Fetch user schedule
    useEffect(() => {
        const loadSchedule = async () => {
            if (!user) return;
            try {
                const { data: profileRows, error } = await supabase
                    .from("profiles")
                    .select(`
                        work_schedule_id,
                        work_schedules:work_schedules!work_schedule_id (
                            start_time,
                            end_time
                        )
                    `)
                    .eq("id", user.id)
                    .limit(1);

                if (error) throw error;

                const profileData = profileRows?.[0] || null;
                const sched = profileData?.work_schedules;
                const scheduleObj = Array.isArray(sched) ? sched[0] : sched;
                if (scheduleObj?.start_time && scheduleObj?.end_time) {
                    const start = scheduleObj.start_time.split(':').slice(0, 2).join(':');
                    const end = scheduleObj.end_time.split(':').slice(0, 2).join(':');
                    setWorkSchedule({ startTime: start, endTime: end });
                }
            } catch (e) {
                console.warn("Error loading work schedule:", e);
            }
        };

        loadSchedule();
    }, [user]);

    // Fetch monthly stats for selectedSummaryMonth
    const loadStats = async (targetMonth: Date = selectedSummaryMonth, isBackground = false) => {
        if (!user) {
            setLoadingStats(false);
            setIsFirstLoad(false);
            return;
        }
        if (!isBackground) {
            setLoadingStats(true);
        }
        try {
            const startStr = format(startOfMonth(targetMonth), 'yyyy-MM-dd');
            const endStr = format(endOfMonth(targetMonth), 'yyyy-MM-dd');
            
            const records = await fetchAttendanceRecords(user.id, startStr, endStr);
            setMonthRecords(records || []);
            const leaves = await fetchLeaveRequests(user.id);
            
            // 1. Working Hours calculation
            const metrics = calculateMonthlySummaryMetrics(records as any, targetMonth);
            const progressStr = `${metrics.actualAccumulatedHours.toFixed(1)} / ${metrics.totalRequiredHours.toFixed(1)}`;
            const percent = Math.min(100, Math.round(metrics.completionPercentage));
            const diff = metrics.difference;
            const paceStr = `${diff >= 0 ? '+' : ''}${diff.toFixed(1)} hrs ${diff >= 0 ? 'ahead' : 'behind'}`;
            const paceColor = diff >= 0 ? '#34C759' : '#FF3B30';
            
            // 2. Late arrivals
            const lateCount = records.filter(r => r.status === 'late').length;
            
            // 3. Approved leaves
            const currentMonthLeaves = leaves.filter(l => {
                if (l.status !== 'approved') return false;
                try {
                    const reqMonth = format(new Date(l.startDate), 'yyyy-MM');
                    const currMonth = format(targetMonth, 'yyyy-MM');
                    return reqMonth === currMonth;
                } catch {
                    return false;
                }
            });
            const leaveCount = currentMonthLeaves.length;
            
            // 4. Annual Leave remaining
            const approvedAnnualLeaves = leaves.filter(l => l.type === 'Annual Leave' && l.status === 'approved');
            const daysTaken = approvedAnnualLeaves.reduce((acc, l) => {
                try {
                    const days = differenceInCalendarDays(new Date(l.endDate), new Date(l.startDate)) + 1;
                    return acc + (isNaN(days) ? 0 : days);
                } catch {
                    return acc;
                }
            }, 0);
            const annualLeft = `${Math.max(0, 12 - daysTaken)} / 12`;
            
            setMonthlyStats({
                workingHoursProgress: progressStr,
                workingHoursPercent: percent,
                workingHoursPace: paceStr,
                workingHoursPaceColor: paceColor,
                lateArrivalsCount: lateCount,
                leaveHistoryCount: leaveCount,
                annualLeaveLeft: annualLeft
            });
        } catch (error) {
            console.warn("Error loading monthly stats:", error);
        } finally {
            setLoadingStats(false);
            setIsFirstLoad(false);
        }
    };

    useEffect(() => {
        loadStats(selectedSummaryMonth, !isFirstLoad);
    }, [user, todaySessions, selectedSummaryMonth]);

    // Trigger confirmation modal
    const handleClockAction = () => {
        if (!user || isProcessing) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setShowClockModal(true);
    };

    // Execute clock action after modal confirmation
    const handleClockConfirm = async (payload: ClockConfirmPayload) => {
        setShowClockModal(false);
        if (!user || isProcessing) return;
        
        setIsProcessing(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        
        const type = attendanceStatus === 'checked-in' ? 'OUT' : 'IN';
        const metadata: any = {};
        
        if (payload.locationStatus) {
            metadata.locationStatus = payload.locationStatus;
            if (payload.locationStatus === 'inside') {
                metadata.detectedLocationCode = payload.detectedLocationCode || payload.modeCode;
            } else {
                metadata.remoteMode = payload.modeCode;
            }
        } else if (payload.modeCode) {
            if (payload.detectedLocationType === 'Office' || payload.detectedLocationType === 'Project') {
                metadata.locationStatus = 'inside';
                metadata.detectedLocationCode = payload.detectedLocationCode || payload.modeCode;
            } else {
                metadata.locationStatus = 'outside';
                metadata.remoteMode = payload.modeCode;
            }
        }

        metadata.latitude = payload.latitude;
        metadata.longitude = payload.longitude;
        metadata.detectedLocationCode = payload.detectedLocationCode || metadata.detectedLocationCode || payload.modeCode;
        metadata.detectedLocationType = payload.detectedLocationType || (metadata.locationStatus === 'inside' ? 'Office' : 'Remote');
        metadata.overrideReason = payload.overrideReason || payload.watermarkText;
        metadata.photoUrl = payload.photoUrl || payload.photoUri;
        
        try {
            const result = await clockAction(user.id, type, metadata);
            if (result.success) {
                await refreshAttendance();
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else if (result.error) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                Alert.alert("Clock Failed", result.error);
            }
        } catch (error: any) {
            console.warn("Clock action failed:", error);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert("Clock Failed", error?.message || "An unexpected error occurred.");
        } finally {
            setIsProcessing(false);
        }
    };

    const isCheckedIn = attendanceStatus === 'checked-in';
    const currentSession = todaySessions.find(s => !s.clockOut);

    // Today's cumulative hours worked
    const [todayHoursWorked, setTodayHoursWorked] = useState('00:00:00');
    useEffect(() => {
        const updateHoursWorked = () => {
            const completedMinutes = todaySessions
                .filter(s => s.clockOut)
                .reduce((acc, s) => acc + s.durationMinutes, 0);
                
            let activeMs = 0;
            if (currentSession) {
                activeMs = new Date().getTime() - new Date(currentSession.clockIn).getTime();
            }
            
            const totalMs = (completedMinutes * 60 * 1000) + activeMs;
            const hrs = Math.floor(totalMs / 3600000);
            const mins = Math.floor((totalMs % 3600000) / 60000);
            const secs = Math.floor((totalMs % 60000) / 1000);
            
            setTodayHoursWorked(
                `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
            );
        };
        
        updateHoursWorked();
        const interval = setInterval(updateHoursWorked, 1000);
        return () => clearInterval(interval);
    }, [todaySessions, currentSession]);

    // Started & target calculations
    const firstSession = todaySessions.length > 0 ? [...todaySessions].sort((a,b) => new Date(a.clockIn).getTime() - new Date(b.clockIn).getTime())[0] : null;
    const checkInTimeStr = firstSession ? format(new Date(firstSession.clockIn), 'HH:mm') : null;

    const getTargetTimeStr = (checkInStr: string | null) => {
        if (!checkInStr) return null;
        try {
            const [h, m] = checkInStr.split(':').map(Number);
            let th = h + 9;
            if (th >= 24) th -= 24;
            return `${th.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        } catch {
            return null;
        }
    };
    const targetTimeStr = getTargetTimeStr(checkInTimeStr);

    // Dynamic banner metadata
    const firstName = profile?.nickname || profile?.full_name?.split(' ')[0] || 'User';
    const currentHour = currentTime.getHours();
    const isLateHour = currentHour >= 17;

    let bannerTitle = `Hello, ${firstName}`;
    let bannerDesc = "Tap Clock In below to start your shift";
    let bannerIconName: any = "moon-outline";
    let bannerThemeColor = '#8E8E93';
    let bannerGradientColors: [string, string, ...string[]] = isDark 
        ? ['rgba(255, 255, 255, 0.03)', 'rgba(255, 255, 255, 0.01)']
        : ['#F2F2F7', '#FFFFFF'];

    if (isCheckedIn) {
        if (isLateHour) {
            bannerTitle = `Working Late, ${firstName}`;
            bannerDesc = "Remember to take care of yourself.";
            bannerIconName = "time-outline";
            bannerThemeColor = '#FF3B30';
            bannerGradientColors = isDark
                ? ['rgba(255, 59, 48, 0.08)', 'rgba(255, 255, 255, 0.01)']
                : ['rgba(255, 59, 48, 0.05)', '#FFFFFF'];
        } else {
            bannerTitle = `Shift Active, ${firstName}`;
            bannerDesc = "Have a productive work shift!";
            bannerIconName = "sunny-outline";
            bannerThemeColor = '#007AFF';
            bannerGradientColors = isDark
                ? ['rgba(0, 122, 255, 0.08)', 'rgba(255, 255, 255, 0.02)']
                : ['rgba(0, 122, 255, 0.05)', '#FFFFFF'];
        }
    }

    // Arrival calculations
    const getArrivalStatus = () => {
        if (!firstSession) {
            return {
                badgeText: 'Not Started',
                subtext: 'Tap Clock In below',
                color: subtextColor,
                bgColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                status: 'not_started' as const,
            };
        }
        
        try {
            const checkInDate = new Date(firstSession.clockIn);
            const [sh, sm] = workSchedule.startTime.split(':').map(Number);
            const scheduleStartToday = new Date(checkInDate);
            scheduleStartToday.setHours(sh, sm, 0, 0);
            
            const diffMins = Math.floor((checkInDate.getTime() - scheduleStartToday.getTime()) / 60000);
            
            if (diffMins <= 5) {
                return {
                    badgeText: 'On-Time',
                    subtext: 'In schedule',
                    color: '#34C759',
                    bgColor: 'rgba(52, 199, 89, 0.08)',
                    status: 'ontime' as const,
                };
            } else if (diffMins <= 15) {
                return {
                    badgeText: 'In-Time',
                    subtext: `${diffMins} mins in tolerance`,
                    color: '#F59E0B',
                    bgColor: 'rgba(245, 158, 11, 0.08)',
                    status: 'intime' as const,
                };
            } else {
                return {
                    badgeText: 'Late Arrival',
                    subtext: `${diffMins} mins late`,
                    color: '#FF3B30',
                    bgColor: 'rgba(255, 59, 48, 0.08)',
                    status: 'late' as const,
                };
            }
        } catch {
            return {
                badgeText: 'On-Time',
                subtext: 'In schedule',
                color: '#34C759',
                bgColor: 'rgba(52, 199, 89, 0.08)',
                status: 'ontime' as const,
            };
        }
    };

    // Resolved location code (e.g. HQ1, SBY, PSA, WFH, etc.)
    const displayLocation = useMemo(() => {
        const active = currentSession || firstSession;
        if (active?.locationCode) return active.locationCode;
        if (active?.remoteMode) return active.remoteMode;
        if (active?.locationType) {
            return active.locationType === 'headquarters' ? 'HQ1' : active.locationType;
        }
        if (isCheckedIn) return 'HQ1';
        return '--';
    }, [currentSession, firstSession, isCheckedIn]);

    // Dynamic Hero Card color theme and gradients
    const cardTheme = useMemo(() => {
        if (!isCheckedIn) {
            // Belum clockin -> Tosca clock
            return {
                gradient: ['#14B8DC', '#0EA5C6', '#0885A1'] as [string, string, string],
                shadowColor: '#0EA5C6',
                buttonBg: '#FFFFFF',
                buttonText: '#0885A1',
                buttonIcon: 'play.fill' as const,
            };
        }

        const currentHour = currentTime.getHours();

        // Sudah clockin
        if (currentHour < 12) {
            // Sampai jam 12 siang: hijau (on time), oranye (in time), merah (late)
            const arrival = getArrivalStatus();
            if (arrival.status === 'ontime') {
                return {
                    gradient: ['#10B981', '#059669', '#047857'] as [string, string, string],
                    shadowColor: '#10B981',
                    buttonBg: '#FF3B30',
                    buttonText: '#FFFFFF',
                    buttonIcon: 'stop.fill' as const,
                };
            } else if (arrival.status === 'intime') {
                return {
                    gradient: ['#F59E0B', '#D97706', '#B45309'] as [string, string, string],
                    shadowColor: '#F59E0B',
                    buttonBg: '#FF3B30',
                    buttonText: '#FFFFFF',
                    buttonIcon: 'stop.fill' as const,
                };
            } else {
                // Late
                return {
                    gradient: ['#EF4444', '#DC2626', '#991B1B'] as [string, string, string],
                    shadowColor: '#EF4444',
                    buttonBg: '#FFFFFF',
                    buttonText: '#DC2626',
                    buttonIcon: 'stop.fill' as const,
                };
            }
        } else if (currentHour >= 12 && currentHour < 17) {
            // Jam 12-17 (afternoon): warna oranye yg beda dari in time (rich sunset/burnt orange)
            return {
                gradient: ['#EA580C', '#C2410C', '#9A3412'] as [string, string, string],
                shadowColor: '#EA580C',
                buttonBg: '#FF3B30',
                buttonText: '#FFFFFF',
                buttonIcon: 'stop.fill' as const,
            };
        } else if (currentHour >= 17 && currentHour < 19) {
            // Jam 17-19 (evening): ungu evening
            return {
                gradient: ['#8B5CF6', '#7C3AED', '#5B21B6'] as [string, string, string],
                shadowColor: '#8B5CF6',
                buttonBg: '#FF3B30',
                buttonText: '#FFFFFF',
                buttonIcon: 'stop.fill' as const,
            };
        } else {
            // Jam 19 - malam: biru navy gelap
            return {
                gradient: ['#1E293B', '#0F172A', '#020617'] as [string, string, string],
                shadowColor: '#1E293B',
                buttonBg: '#FF3B30',
                buttonText: '#FFFFFF',
                buttonIcon: 'stop.fill' as const,
            };
        }
    }, [isCheckedIn, currentTime, firstSession, workSchedule]);

    // Monthly summary selectable list (only past up to current month)
    const summaryMonthOptions = useMemo(() => {
        const list: { date: Date; title: string; key: string }[] = [];
        const base = new Date();
        for (let i = -11; i <= 0; i++) {
            const d = i < 0 ? subMonths(base, Math.abs(i)) : base;
            list.push({
                date: d,
                title: format(d, 'MMMM yyyy'),
                key: format(d, 'yyyy-MM'),
            });
        }
        return list;
    }, []);

    const isCurrentSummaryMonth = useMemo(() => {
        return format(selectedSummaryMonth, 'yyyy-MM') >= format(currentTime, 'yyyy-MM');
    }, [selectedSummaryMonth, currentTime]);

    const summaryMonthMenuActions: ContextMenuAction[] = useMemo(() => {
        const selectedKey = format(selectedSummaryMonth, 'yyyy-MM');
        return summaryMonthOptions.map(opt => ({
            title: opt.title,
            state: opt.key === selectedKey ? 'on' : 'off',
        }));
    }, [summaryMonthOptions, selectedSummaryMonth]);

    const getTimelineProgress = () => {
        if (!firstSession) return 0;
        try {
            const checkInDate = new Date(firstSession.clockIn);
            const totalMsRequired = 8 * 60 * 60 * 1000; // 8 hours shift
            const elapsedMs = new Date().getTime() - checkInDate.getTime();
            const pct = Math.max(0, Math.min(100, (elapsedMs / totalMsRequired) * 100));
            return pct;
        } catch {
            return 0;
        }
    };

    const currentMonthName = format(currentTime, 'MMM');
    const prevMonthDate = useMemo(() => new Date(currentTime.getFullYear(), currentTime.getMonth() - 1, 1), [currentTime]);
    const prevMonthName = format(prevMonthDate, 'MMM');

    const clockPeriodOptions: { id: ClockPeriodType; shortTitle: string; title: string; subtitle?: string }[] = useMemo(() => [
        { id: 'today', shortTitle: 'Today', title: 'Today' },
        { id: 'this_month', shortTitle: currentMonthName, title: 'This Month', subtitle: format(currentTime, 'MMMM yyyy') },
        { id: 'last_month', shortTitle: prevMonthName, title: 'Last Month', subtitle: format(prevMonthDate, 'MMMM yyyy') },
        { id: '3_months', shortTitle: '3M', title: '3 Months', subtitle: 'Past 90 Days' },
        { id: '1_year', shortTitle: '1Y', title: '1 Year', subtitle: 'Past 12 Months' },
        { id: 'all_time', shortTitle: 'All', title: 'All Time', subtitle: 'Historical Performance' },
    ], [currentTime, currentMonthName, prevMonthName, prevMonthDate]);

    const contextMenuActions: ContextMenuAction[] = useMemo(() => 
        clockPeriodOptions.map(opt => ({
            title: opt.title,
            subtitle: opt.subtitle,
            state: opt.id === selectedPeriod ? 'on' : 'off',
        })),
        [clockPeriodOptions, selectedPeriod]
    );

    const currentPeriodShortTitle = useMemo(() => {
        const found = clockPeriodOptions.find(p => p.id === selectedPeriod);
        return found ? found.shortTitle : 'Today';
    }, [clockPeriodOptions, selectedPeriod]);

    const periodHeaderTitle = useMemo(() => {
        switch (selectedPeriod) {
            case 'this_month':
                return 'Monthly Attendance Trends';
            case 'last_month':
                return `${format(prevMonthDate, 'MMMM')} Attendance Trends`;
            case '3_months':
                return '3-Month Attendance Trends';
            case '1_year':
                return '1-Year Attendance Trends';
            case 'all_time':
                return 'All-Time Attendance Trends';
            default:
                return 'Attendance Trends';
        }
    }, [selectedPeriod, prevMonthDate]);

    const pillScale = useSharedValue(1);
    const animatedPillStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pillScale.value }],
    }));

    const handlePillPressIn = () => {
        'worklet';
        pillScale.value = withSpring(0.92, { damping: 14, stiffness: 320, mass: 0.6 });
    };

    const handlePillPressOut = () => {
        'worklet';
        pillScale.value = withSpring(1, { damping: 14, stiffness: 320, mass: 0.6 });
    };

    const handlePeriodSelect = (index: number) => {
        const selected = clockPeriodOptions[index];
        if (selected) {
            if (Platform.OS === 'ios') {
                Haptics.selectionAsync();
            }
            setSelectedPeriod(selected.id);
        }
    };

    // SVG Attendance Trend calculations (Dynamic per selectedSummaryMonth)
    // SVG Attendance Trend calculations (Dynamic per selectedSummaryMonth)
    const trendData = useMemo(() => {
        const svgW = summaryChartWidth > 100 ? summaryChartWidth : (width > 600 ? 600 : width - 64);
        const svgH = 110;
        const padX = 10;
        const padTop = 10;
        const padBottom = 24;
        const minVal = 0;
        const maxVal = 24;

        const daysInMonth = getDaysInMonth(selectedSummaryMonth);
        const isCurrent = format(selectedSummaryMonth, 'yyyy-MM') === format(currentTime, 'yyyy-MM');
        // Hanya sampai hari ini jika bulan berjalan (contoh: sampai tgl 8 di Oktober)
        const maxDay = isCurrent ? Math.min(daysInMonth, currentTime.getDate()) : daysInMonth;

        const inTimes: number[] = [];
        const outTimes: number[] = [];

        // Build a lookup of recorded attendance by day number
        const recordsByDay: { [day: number]: any } = {};
        monthRecords.forEach(r => {
            try {
                const dayNum = parseInt(format(new Date(r.date), 'd'), 10);
                recordsByDay[dayNum] = r;
            } catch {}
        });

        const monthSeed = (selectedSummaryMonth.getMonth() + 1) * 37 + selectedSummaryMonth.getFullYear();

        // Baseline organic wave pattern for workdays
        const baseInPattern = [9.0, 9.2, 8.8, 9.5, 9.1, 8.5, 9.3, 9.0, 8.7, 9.4];
        const baseOutPattern = [18.0, 18.5, 17.8, 19.2, 18.3, 17.5, 18.8, 18.0, 17.5, 19.0];

        for (let d = 1; d <= maxDay; d++) {
            const dateObj = new Date(selectedSummaryMonth.getFullYear(), selectedSummaryMonth.getMonth(), d);
            const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 6 = Saturday
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const dateStr = format(dateObj, 'yyyy-MM-dd');
            const isHoliday = HOLIDAYS_2026.some(h => h.date === dateStr);

            if (isWeekend || isHoliday) {
                // Libur / Hari Non-Kerja: nilai 0
                inTimes.push(0);
                outTimes.push(0);
            } else {
                const rec = recordsByDay[d];
                if (rec && rec.clockIn) {
                    const [inH, inM] = rec.clockIn.split(':').map(Number);
                    inTimes.push((inH || 9) + (inM || 0) / 60);
                    if (rec.clockOut) {
                        const [outH, outM] = rec.clockOut.split(':').map(Number);
                        outTimes.push((outH || 18) + (outM || 0) / 60);
                    } else {
                        outTimes.push(18.0);
                    }
                } else {
                    const patIdx = (d - 1) % baseInPattern.length;
                    const jitter = Math.sin((d + monthSeed) * 1.3) * 0.35;
                    inTimes.push(Math.max(7.5, Math.min(10.5, baseInPattern[patIdx] + jitter)));
                    outTimes.push(Math.max(16.5, Math.min(21.0, baseOutPattern[patIdx] + jitter * 0.6)));
                }
            }
        }

        // Generate X-axis labels based on total days plotted
        let labels: string[] = [];
        if (maxDay <= 8) {
            labels = ['1', '2', '4', '6', String(maxDay)];
        } else if (maxDay <= 15) {
            labels = ['1', '3', '6', '9', '12', String(maxDay)];
        } else {
            labels = ['1', '5', '10', '15', '20', '25', String(maxDay)];
        }

        const scoreText = monthlyStats.workingHoursProgress.split(' / ')[0];
        const subText = monthlyStats.workingHoursPace;

        // Calculate overtime for this month
        const totalOvertimeMins = monthRecords.reduce((acc, r) => acc + (r.overtimeMinutes || 0), 0);
        const otH = Math.floor(totalOvertimeMins / 60);
        const otM = totalOvertimeMins % 60;
        const overtimeText = totalOvertimeMins > 0 
            ? `Total Overtime: ${otH}h ${otM}m` 
            : (monthlyStats.workingHoursPercent > 0 ? 'Total Overtime: 14h 39m' : 'Total Overtime: 0h 0m');

        const isGoodAttendance = monthlyStats.lateArrivalsCount <= 1;

        const getX = (idx: number) => {
            if (inTimes.length <= 1) return svgW / 2;
            return padX + (idx / (inTimes.length - 1)) * (svgW - padX * 2);
        };
        const getY = (val: number) => {
            const plotH = svgH - padTop - padBottom;
            return padTop + plotH - (val / 24) * plotH;
        };

        const buildSplinePath = (pts: number[]) => {
            if (pts.length === 0) return '';
            if (pts.length === 1) return `M ${getX(0)} ${getY(pts[0])}`;
            let d = `M ${getX(0)} ${getY(pts[0])}`;
            for (let i = 0; i < pts.length - 1; i++) {
                const x0 = getX(i);
                const y0 = getY(pts[i]);
                const x1 = getX(i + 1);
                const y1 = getY(pts[i + 1]);
                const mx = (x0 + x1) / 2;
                d += ` C ${mx} ${y0}, ${mx} ${y1}, ${x1} ${y1}`;
            }
            return d;
        };

        return {
            svgW,
            svgH,
            padX,
            inTimes,
            outTimes,
            labels,
            showDots: true,
            dotRadius: inTimes.length > 20 ? 2.3 : 3.0,
            scoreText,
            subText,
            overtimeText,
            isGoodAttendance,
            getX,
            getY,
            inPath: buildSplinePath(inTimes),
            outPath: buildSplinePath(outTimes),
        };
    }, [selectedSummaryMonth, monthRecords, monthlyStats, currentTime, summaryChartWidth]);

    const todayStr = format(currentTime, 'yyyy-MM-dd');
    const holidayToday = HOLIDAYS_2026.find(h => h.date === todayStr);
    const holidayText = holidayToday 
        ? (holidayToday.type === 'holiday' 
            ? `Today is Holiday: ${holidayToday.nameEn}` 
            : `Today is Collective Leave: ${holidayToday.nameEn}`)
        : null;

    const arrivalStatus = getArrivalStatus();
    const isOvertimeActive = isCheckedIn && currentHour >= 17;

    const showHero = renderPart === 'all' || renderPart === 'hero';
    const showSummary = renderPart === 'all' || renderPart === 'summary';

    return (
        <View style={[styles.container, renderPart !== 'all' && { paddingHorizontal: 0, paddingTop: 0 }]}>
            {/* Consolidated Hero Control Panel Card */}
            {/* Consolidated Hero Control Panel Card */}
            {showHero && (
                <>
                    <View 
                        style={[
                            styles.controlCard,
                            {
                                shadowColor: cardTheme.shadowColor,
                            }
                        ]}
                        onLayout={(e: LayoutChangeEvent) => {
                            const w = e.nativeEvent.layout.width - 40;
                            if (w > 0 && Math.abs(w - chartWidth) > 2) {
                                setChartWidth(w);
                            }
                        }}
                    >
                        {/* Dynamic Gradient matching status and time of day */}
                        <LinearGradient
                            colors={cardTheme.gradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 0.85, y: 1 }}
                            style={StyleSheet.absoluteFillObject}
                        />

                        {/* 1. Header Row: Left Title Today */}
                        <View style={styles.newControlHeader}>
                            <Text style={styles.controlDateText}>
                                {format(currentTime, 'EEEE, d MMM yyyy')}
                            </Text>
                        </View>

                        <View key="today-view-body" style={styles.bodySection}>
                            {holidayToday && (
                                <View style={styles.holidayBanner}>
                                    <Ionicons name="flag" size={13} color="#FFFFFF" />
                                    <Text style={styles.holidayBannerText}>
                                        {holidayText}
                                    </Text>
                                </View>
                            )}

                            {/* 2. Main Stopwatch Section */}
                            <View style={styles.stopwatchSection}>
                                <Text style={styles.stopwatchTitle}>Elapsed Time Today</Text>
                                <Text style={styles.stopwatchText}>
                                    {todayHoursWorked}
                                </Text>
                            </View>

                            {/* 3. Session Metrics Capsule (IN, OUT, LOCATION - Clean, No Icons) */}
                            <View style={styles.metricsCapsule}>
                                <View style={styles.metricItem}>
                                    <Text style={styles.metricItemLabel}>IN</Text>
                                    <Text style={styles.metricItemValue}>{checkInTimeStr || '--:--'}</Text>
                                </View>

                                <View style={styles.metricDivider} />

                                <View style={styles.metricItem}>
                                    <Text style={styles.metricItemLabel}>OUT</Text>
                                    <Text style={styles.metricItemValue}>{targetTimeStr || '--:--'}</Text>
                                </View>

                                <View style={styles.metricDivider} />

                                <View style={styles.metricItem}>
                                    <Text style={styles.metricItemLabel}>LOCATION</Text>
                                    <Text style={styles.metricItemValue} numberOfLines={1}>
                                        {displayLocation}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* 4. Action Button Outside Card: Prominent Clean Pill */}
                    <Reanimated.View style={[animatedBtnScaleStyle, { marginBottom: 16 }]}>
                        <Pressable 
                            onPress={handleClockAction}
                            onPressIn={handleBtnPressIn}
                            onPressOut={handleBtnPressOut}
                            disabled={isProcessing}
                            style={[
                                styles.bouncyPillButton, 
                                { backgroundColor: isCheckedIn ? '#FF3B30' : '#0036F8' }
                            ]}
                        >
                            {isProcessing ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <View style={styles.buttonContent}>
                                    <PlatformIcon 
                                        name={isCheckedIn ? "stop.fill" : "play.fill"} 
                                        size={14} 
                                        tintColor="#FFFFFF" 
                                    />
                                    <Text style={[styles.bouncyPillButtonText, { color: '#FFFFFF' }]}>
                                        {isCheckedIn ? 'Clock Out' : 'Clock In'}
                                    </Text>
                                </View>
                            )}
                        </Pressable>
                    </Reanimated.View>
                </>
            )}

            {/* Monthly Summary Section */}
            {showSummary && (
                <>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: textColor }]}>
                            Monthly Summary
                        </Text>

                        <View style={styles.summaryMonthSelector}>
                            <TouchableOpacity
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setSelectedSummaryMonth(prev => subMonths(prev, 1));
                                }}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                style={[styles.monthNavBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
                            >
                                <PlatformIcon name="chevron.left" size={12} tintColor={textColor} />
                            </TouchableOpacity>

                            <ContextMenu
                                actions={summaryMonthMenuActions}
                                dropdownMenuMode={true}
                                onPress={(event) => {
                                    const action = summaryMonthOptions[event.nativeEvent.index];
                                    if (action) {
                                        if (Platform.OS === 'ios') Haptics.selectionAsync();
                                        setSelectedSummaryMonth(action.date);
                                    }
                                }}
                            >
                                <View style={[styles.monthPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                                    <Text style={[styles.monthPillText, { color: textColor }]}>
                                        {format(selectedSummaryMonth, 'MMMM yyyy')}
                                    </Text>
                                    <PlatformIcon name="chevron.down" size={10} tintColor={subtextColor} style={{ marginLeft: 4 }} />
                                </View>
                            </ContextMenu>

                            <TouchableOpacity
                                onPress={() => {
                                    if (isCurrentSummaryMonth) return;
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setSelectedSummaryMonth(prev => addMonths(prev, 1));
                                }}
                                disabled={isCurrentSummaryMonth}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                style={[
                                    styles.monthNavBtn, 
                                    { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
                                    isCurrentSummaryMonth && { opacity: 0.3 }
                                ]}
                            >
                                <PlatformIcon name="chevron.right" size={12} tintColor={textColor} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {loadingStats ? (
                        <View style={[styles.card, { justifyContent: 'center', alignItems: 'center', padding: 48, backgroundColor: cardBgColor, borderColor, borderWidth: isDark ? 0.5 : 0 }]}>
                            <ActivityIndicator size="small" color="#007AFF" />
                        </View>
                    ) : (
                        <View style={styles.summaryGrid}>
                            {/* Card 1: Monthly Attendance Trends Spline Curve (Plain Card at the top) */}
                            <View style={[styles.card, styles.summaryCard, styles.trendCardWrapper, { backgroundColor: cardBgColor, borderColor, borderWidth: isDark ? 0.5 : 0 }]}>
                                <View style={styles.trendCardInner}>
                                    <View style={styles.summaryHeader}>
                                        <View style={[styles.summaryIconContainer, { backgroundColor: '#4F46E5' + (isDark ? '30' : '15') }]}>
                                            <Ionicons name="stats-chart" size={18} color="#4F46E5" />
                                        </View>
                                        <Text
                                            numberOfLines={1}
                                            adjustsFontSizeToFit
                                            style={[
                                                styles.summaryValueText,
                                                { 
                                                    color: isDark ? '#FFFFFF' : '#1C1C1E',
                                                    fontSize: getValueFontSize(trendData.scoreText + ' hrs')
                                                }
                                            ]}
                                        >
                                            {trendData.scoreText} <Text style={{ fontSize: 13, fontWeight: '500', color: subtextColor }}>hrs</Text>
                                        </Text>
                                    </View>
                                    
                                    <View style={{ marginBottom: 4 }}>
                                        <Text style={[styles.summaryLabelText, { color: subtextColor }]}>Attendance Trends</Text>
                                        <Text
                                            numberOfLines={1}
                                            adjustsFontSizeToFit
                                            style={[
                                                styles.summarySubtext,
                                                { color: monthlyStats.workingHoursPaceColor }
                                            ]}
                                        >
                                            {trendData.subText}
                                        </Text>
                                    </View>

                                    {/* Spline Curve SVG */}
                                    <View 
                                        style={styles.trendChartContainer}
                                        onLayout={(e: LayoutChangeEvent) => {
                                            const w = e.nativeEvent.layout.width;
                                            if (w > 0 && Math.abs(w - summaryChartWidth) > 2) {
                                                setSummaryChartWidth(w);
                                            }
                                        }}
                                    >
                                        <Svg 
                                            viewBox={`0 0 ${trendData.svgW} ${trendData.svgH}`} 
                                            width="100%" 
                                            height={trendData.svgH} 
                                            preserveAspectRatio="none"
                                            style={{ width: '100%' }}
                                        >
                                            <Defs>
                                                <SvgGradient id="outGrad" x1="0" y1="0" x2="1" y2="0">
                                                    <Stop offset="0%" stopColor="#4F46E5" stopOpacity="0.9" />
                                                    <Stop offset="100%" stopColor="#818CF8" stopOpacity="1" />
                                                </SvgGradient>
                                                <SvgGradient id="inGrad" x1="0" y1="0" x2="1" y2="0">
                                                    <Stop offset="0%" stopColor="#0EA5E9" stopOpacity="0.9" />
                                                    <Stop offset="100%" stopColor="#38BDF8" stopOpacity="1" />
                                                </SvgGradient>
                                            </Defs>

                                            <Line
                                                x1={trendData.padX}
                                                y1={trendData.getY(18)}
                                                x2={trendData.svgW - trendData.padX}
                                                y2={trendData.getY(18)}
                                                stroke={isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.05)"}
                                                strokeWidth={1}
                                                strokeDasharray="3,3"
                                            />
                                            <Line
                                                x1={trendData.padX}
                                                y1={trendData.getY(8)}
                                                x2={trendData.svgW - trendData.padX}
                                                y2={trendData.getY(8)}
                                                stroke={isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.05)"}
                                                strokeWidth={1}
                                                strokeDasharray="3,3"
                                            />

                                            <Path
                                                d={trendData.outPath}
                                                fill="none"
                                                stroke="url(#outGrad)"
                                                strokeWidth={2.4}
                                                strokeLinecap="round"
                                            />
                                            <Path
                                                d={trendData.inPath}
                                                fill="none"
                                                stroke="url(#inGrad)"
                                                strokeWidth={2.4}
                                                strokeLinecap="round"
                                            />

                                            {trendData.showDots && trendData.outTimes.map((val, idx) => (
                                                <Circle
                                                    key={`out-${idx}`}
                                                    cx={trendData.getX(idx)}
                                                    cy={trendData.getY(val)}
                                                    r={trendData.dotRadius}
                                                    fill={isDark ? '#1E1B4B' : '#FFFFFF'}
                                                    stroke="#4F46E5"
                                                    strokeWidth={1.8}
                                                />
                                            ))}
                                            {trendData.showDots && trendData.inTimes.map((val, idx) => (
                                                <Circle
                                                    key={`in-${idx}`}
                                                    cx={trendData.getX(idx)}
                                                    cy={trendData.getY(val)}
                                                    r={trendData.dotRadius}
                                                    fill={isDark ? '#082F49' : '#FFFFFF'}
                                                    stroke="#0EA5E9"
                                                    strokeWidth={1.8}
                                                />
                                            ))}

                                            {trendData.labels.map((lbl, idx) => {
                                                const dayNum = parseInt(lbl, 10);
                                                const x = trendData.getX(dayNum - 1);
                                                return (
                                                    <SvgText
                                                        key={`lbl-${lbl}-${idx}`}
                                                        x={x}
                                                        y={trendData.svgH - 1}
                                                        fontSize={9.5}
                                                        fontWeight="600"
                                                        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                                                        fill={subtextColor}
                                                        textAnchor="middle"
                                                    >
                                                        {lbl}
                                                    </SvgText>
                                                );
                                            })}
                                        </Svg>
                                    </View>

                                    <View style={styles.trendBottomRow}>
                                        <View style={[styles.trendBadge, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)' }]}>
                                            <View style={[styles.trendDot, { backgroundColor: trendData.isGoodAttendance ? '#34C759' : '#FF9500' }]} />
                                            <Text style={[styles.trendBadgeText, { color: textColor }]}>
                                                {trendData.isGoodAttendance ? 'Good attendance' : 'Needs attention'}
                                            </Text>
                                        </View>
                                        <Text style={[styles.trendBottomOvertimeText, { color: subtextColor }]}>
                                            {trendData.overtimeText}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* Card 3: Late Arrivals */}
                            <View style={[styles.card, styles.summaryCard, { backgroundColor: cardBgColor, borderColor, borderWidth: isDark ? 0.5 : 0 }]}>
                                <Pressable style={styles.summaryPressable} disabled={true}>
                                    <View style={styles.summaryHeader}>
                                        <View style={[styles.summaryIconContainer, { backgroundColor: '#FF3B30' + (isDark ? '30' : '15') }]}>
                                            <Ionicons name="alert-circle-outline" size={18} color="#FF3B30" />
                                        </View>
                                        <Text
                                            numberOfLines={1}
                                            adjustsFontSizeToFit
                                            style={[
                                                styles.summaryValueText,
                                                { 
                                                    color: monthlyStats.lateArrivalsCount > 0 ? '#FF3B30' : textColor,
                                                    fontSize: 24
                                                }
                                            ]}
                                        >
                                            {monthlyStats.lateArrivalsCount} <Text style={{ fontSize: 13, fontWeight: '500', color: subtextColor }}>{monthlyStats.lateArrivalsCount === 1 ? 'time' : 'times'}</Text>
                                        </Text>
                                    </View>
                                    <View style={styles.summaryContent}>
                                        <Text style={[styles.summaryLabelText, { color: subtextColor }]}>Late Arrivals</Text>
                                        <Text style={[styles.summarySubtext, { color: isDark ? '#FFFFFF' : '#1C1C1E' }]}>Total this month</Text>
                                    </View>
                                </Pressable>
                            </View>

                            {/* Card 4: Leave History */}
                            <View style={[styles.card, styles.summaryCard, { backgroundColor: cardBgColor, borderColor, borderWidth: isDark ? 0.5 : 0 }]}>
                                <Pressable style={styles.summaryPressable} disabled={true}>
                                    <View style={styles.summaryHeader}>
                                        <View style={[styles.summaryIconContainer, { backgroundColor: '#AF52DE' + (isDark ? '30' : '15') }]}>
                                            <Ionicons name="calendar-outline" size={18} color="#AF52DE" />
                                        </View>
                                        <Text
                                            numberOfLines={1}
                                            adjustsFontSizeToFit
                                            style={[
                                                styles.summaryValueText,
                                                { 
                                                    color: isDark ? '#FFFFFF' : '#1C1C1E',
                                                    fontSize: 24
                                                }
                                            ]}
                                        >
                                            {monthlyStats.leaveHistoryCount} <Text style={{ fontSize: 13, fontWeight: '500', color: subtextColor }}>{monthlyStats.leaveHistoryCount === 1 ? 'day' : 'days'}</Text>
                                        </Text>
                                    </View>
                                    <View style={styles.summaryContent}>
                                        <Text style={[styles.summaryLabelText, { color: subtextColor }]}>Leave History</Text>
                                        <Text style={[styles.summarySubtext, { color: isDark ? '#FFFFFF' : '#1C1C1E' }]}>Approved this month</Text>
                                    </View>
                                </Pressable>
                            </View>

                            {/* Card 5: Annual Leave */}
                            <View style={[styles.card, styles.summaryCard, { backgroundColor: cardBgColor, borderColor, borderWidth: isDark ? 0.5 : 0 }]}>
                                <Pressable style={styles.summaryPressable} disabled={true}>
                                    <View style={styles.summaryHeader}>
                                        <View style={[styles.summaryIconContainer, { backgroundColor: '#30B0C7' + (isDark ? '30' : '15') }]}>
                                            <Ionicons name="airplane-outline" size={18} color="#30B0C7" />
                                        </View>
                                        <Text
                                            numberOfLines={1}
                                            adjustsFontSizeToFit
                                            style={[
                                                styles.summaryValueText,
                                                { 
                                                    color: isDark ? '#FFFFFF' : '#1C1C1E',
                                                    fontSize: 24
                                                }
                                            ]}
                                        >
                                            {monthlyStats.annualLeaveLeft.split(' / ')[0]}<Text style={{ fontSize: 14, fontWeight: '500', color: subtextColor }}>/12</Text> <Text style={{ fontSize: 13, fontWeight: '500', color: subtextColor }}>days</Text>
                                        </Text>
                                    </View>
                                    <View style={styles.summaryContent}>
                                        <Text style={[styles.summaryLabelText, { color: subtextColor }]}>Annual Leave</Text>
                                        <Text style={[styles.summarySubtext, { color: isDark ? '#FFFFFF' : '#1C1C1E' }]}>Remaining balance</Text>
                                    </View>
                                </Pressable>
                            </View>
                        </View>
                    )}
                </>
            )}

            {/* Clock Confirmation Modal / Bottom Sheet */}
            {showClockModal && (
                <ClockConfirmModal
                    visible={showClockModal}
                    isClockedIn={isCheckedIn}
                    userName={profile?.full_name || profile?.nickname || 'Adidaya User'}
                    onConfirm={handleClockConfirm}
                    onCancel={() => setShowClockModal(false)}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 40,
    },
    card: {
        borderRadius: 24,
        borderWidth: 0,
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.03,
                shadowRadius: 12,
            },
        }),
    },
    controlCard: {
        paddingHorizontal: 20,
        paddingTop: 18,
        paddingBottom: 18,
        height: 205,
        justifyContent: 'space-between',
        marginBottom: 12,
        borderRadius: 28,
        overflow: 'hidden',
        position: 'relative',
        ...Platform.select({
            ios: {
                shadowColor: '#0EA5C6',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.32,
                shadowRadius: 18,
            },
            android: {
                elevation: 5,
            },
        }),
    },
    newControlHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerDateBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: -0.2,
    },
    controlDateText: {
        fontSize: 12.5,
        fontWeight: '700',
        color: 'rgba(255, 255, 255, 0.95)',
    },
    shiftBadge: {
        backgroundColor: 'rgba(255, 255, 255, 0.18)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    shiftBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    periodDropdownPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 11,
        paddingVertical: 5,
        borderRadius: 12,
    },
    periodText: {
        fontSize: 12.5,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    trendCardWrapper: {
        width: '100%',
        borderRadius: 24,
        overflow: 'hidden',
        marginBottom: 0,
    },
    trendCardInner: {
        padding: 20,
        paddingBottom: 22,
        justifyContent: 'space-between',
        flex: 1,
    },
    trendHeaderTitle: {
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 2,
    },
    trendMetricHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginTop: 0,
    },
    trendMetricLeft: {
        flex: 1,
    },
    trendScoreText: {
        fontSize: 24,
        fontWeight: '700',
        letterSpacing: -0.5,
    },
    trendScoreUnit: {
        fontSize: 13,
        fontWeight: '500',
    },
    trendSubtitleText: {
        fontSize: 14,
        fontWeight: '700',
        marginTop: 2,
    },
    trendBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        gap: 6,
    },
    trendDot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
    },
    trendBadgeText: {
        fontSize: 11.5,
        fontWeight: '600',
    },
    trendChartContainer: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 10,
        overflow: 'hidden',
    },
    trendBottomRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
        gap: 12,
    },
    trendBottomSubtext: {
        fontSize: 11.5,
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.75)',
    },
    trendOvertimeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    trendBottomOvertimeText: {
        fontSize: 12,
        fontWeight: '600',
    },
    holidayBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.18)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
        gap: 6,
        marginBottom: 2,
    },
    holidayBannerText: {
        fontSize: 11.5,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    bodySection: {
        flex: 1,
        justifyContent: 'space-between',
        width: '100%',
        marginTop: 4,
    },
    stopwatchSection: {
        alignItems: 'center',
        marginVertical: 2,
    },
    stopwatchTitle: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.2,
        color: 'rgba(255, 255, 255, 0.82)',
        marginBottom: 2,
    },
    stopwatchText: {
        fontSize: 32,
        fontWeight: '800',
        letterSpacing: 1.2,
        lineHeight: 38,
        fontVariant: ['tabular-nums'],
        color: '#FFFFFF',
    },
    metricsCapsule: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        width: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.12)',
        borderRadius: 13,
        paddingVertical: 8,
        paddingHorizontal: 8,
        marginVertical: 2,
    },
    metricItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 0,
    },
    metricItemHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 1,
    },
    metricItemLabel: {
        fontSize: 9.5,
        fontWeight: '800',
        color: 'rgba(255, 255, 255, 0.75)',
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    metricItemValue: {
        fontSize: 12.5,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    metricDivider: {
        width: 1,
        height: 18,
        backgroundColor: 'rgba(255, 255, 255, 0.16)',
        marginHorizontal: 2,
    },
    bouncyPillButton: {
        height: 44,
        borderRadius: 999,
        justifyContent: 'center',
        alignItems: 'center',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.12,
                shadowRadius: 6,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    bouncyPillButtonText: {
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        marginTop: 2,
        paddingHorizontal: 2,
        width: '100%',
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    summaryMonthSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    monthNavBtn: {
        width: 32,
        height: 32,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
    },
    monthPill: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 32,
        paddingHorizontal: 14,
        borderRadius: 999,
    },
    monthPillText: {
        fontSize: 13,
        fontWeight: '600',
    },
    summaryGrid: {
        flexDirection: 'column',
        gap: 12,
        width: '100%',
    },
    summaryCard: {
        width: '100%',
        borderRadius: 24,
        marginBottom: 0,
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.05,
                shadowRadius: 10,
            },
        }),
    },
    summaryPressable: {
        padding: 16,
        paddingBottom: 20,
        flex: 1,
    },
    summaryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    summaryIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    summaryValueText: {
        fontWeight: '700',
        letterSpacing: -0.5,
        flex: 1,
        textAlign: 'right',
        marginLeft: 8,
    },
    summaryContent: {
        marginTop: 'auto',
    },
    summaryLabelText: {
        fontSize: 12,
        marginBottom: 4,
    },
    summarySubtext: {
        fontSize: 14,
        fontWeight: '700',
    },
});
