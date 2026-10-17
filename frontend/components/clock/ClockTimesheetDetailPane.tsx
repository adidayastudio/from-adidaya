import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, Linking, TextInput, ActivityIndicator, Alert } from 'react-native';
import { format, differenceInDays } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/theme';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { useUserContext } from '@/context/UserProvider';
import { useTenantContext } from '@/context/TenantContext';
import {
    AttendanceRecord,
    AttendanceStatus,
    AttendanceCorrectionRequest,
    createCorrectionRequest,
    uploadCrewFileBase64,
    CorrectionFieldType,
} from '@/lib/api/attendance';
import {
    AttendanceCorrectionConfig,
    DEFAULT_ATTENDANCE_CORRECTION,
    getClockSetting,
    DEFAULT_WORK_LOCATIONS,
    WorkLocationItem,
} from '@/lib/api/clockSetup';
import { sharePersonalTimesheet, generatePersonalTimesheetHtml } from '@/lib/shareHelper';

const CORRECTION_FIELD_OPTIONS: Array<{ key: CorrectionFieldType; label: string }> = [
    { key: 'clock_in', label: 'Clock-in Time' },
    { key: 'clock_out', label: 'Clock-out Time' },
    { key: 'work_location', label: 'Work Location' },
    { key: 'attendance_status', label: 'Attendance Status' },
];

const CORRECTION_STATUS_OPTIONS = [
    { value: 'ontime', label: 'On-Time' },
    { value: 'intime', label: 'In-Time (Flexible)' },
    { value: 'late', label: 'Late' },
    { value: 'sick', label: 'Sick' },
    { value: 'leave', label: 'Leave / Permission' },
    { value: 'absent', label: 'Absent' },
];

interface ClockTimesheetDetailPaneProps {
    record: AttendanceRecord | null;
    allRecords?: AttendanceRecord[];
    stats?: any;
    teamStats?: any;
    periodLabel?: string;
    currentMonth?: Date;
    viewMode?: 'personal' | 'team';
    correctionRequests?: AttendanceCorrectionRequest[];
    correctionPolicy?: AttendanceCorrectionConfig;
    onRequestCorrection?: (record: AttendanceRecord) => void;
    onPhotoPress?: (url: string) => void;
    onSelectRecord?: (record: AttendanceRecord) => void;
    onExportPress?: () => void;
    onViewDocument?: (html: string, title: string) => void;
}

export function ClockTimesheetDetailPane({
    record,
    allRecords = [],
    stats,
    teamStats,
    periodLabel,
    currentMonth = new Date(),
    viewMode = 'personal',
    correctionRequests = [],
    correctionPolicy = DEFAULT_ATTENDANCE_CORRECTION,
    onRequestCorrection,
    onPhotoPress,
    onSelectRecord,
    onExportPress,
    onViewDocument,
}: ClockTimesheetDetailPaneProps) {
    const { resolvedTheme } = useTheme();
    const { activeTenant } = useTenantContext();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';
    const cardBgColor = isDark ? '#1C1C1E' : '#FFFFFF';
    const subtleBgColor = isDark ? 'rgba(255, 255, 255, 0.03)' : '#FAFAFC';
    const borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
    const [activeExpandedPhoto, setActiveExpandedPhoto] = useState<'in' | 'out' | null>(null);

    // Embedded Correction Form States
    const [isRequestingCorrection, setIsRequestingCorrection] = useState(false);
    const [correctionField, setCorrectionField] = useState<CorrectionFieldType>('clock_in');
    const [correctionTimeString, setCorrectionTimeString] = useState('08:30');
    const [correctionLocation, setCorrectionLocation] = useState('JPF');
    const [correctionStatus, setCorrectionStatus] = useState('ontime');
    const [correctionReason, setCorrectionReason] = useState('');
    const [correctionAttachment, setCorrectionAttachment] = useState<ImagePicker.ImagePickerAsset | null>(null);
    const [isSubmittingCorrection, setIsSubmittingCorrection] = useState(false);
    const [workLocations, setWorkLocations] = useState<WorkLocationItem[]>(DEFAULT_WORK_LOCATIONS);

    const { user, profile } = useUserContext();

    useEffect(() => {
        getClockSetting<WorkLocationItem[]>('WORK_LOCATIONS', DEFAULT_WORK_LOCATIONS).then((locs) => {
            if (Array.isArray(locs) && locs.length > 0) {
                setWorkLocations(locs.filter(l => l.isActive !== false));
            }
        });
    }, []);

    useEffect(() => {
        if (!record) {
            setActiveExpandedPhoto(null);
            setIsRequestingCorrection(false);
        } else {
            if (record.clockIn) {
                try {
                    setCorrectionTimeString(format(new Date(record.clockIn), 'HH:mm'));
                } catch {
                    setCorrectionTimeString('08:30');
                }
            } else {
                setCorrectionTimeString('08:30');
            }
            setCorrectionLocation(record.checkInLocationCode || 'JPF');
            setCorrectionStatus(record.status || 'ontime');
            setCorrectionReason('');
            setCorrectionAttachment(null);
        }
    }, [record?.id]);

    const formatTime = (isoString?: string | null) => {
        if (!isoString) return '-';
        try {
            return format(new Date(isoString), 'HH:mm');
        } catch {
            return '-';
        }
    };

    const formatMinutes = (mins: number) => {
        if (!mins || mins <= 0) return '-';
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        if (h === 0) return `${m}m`;
        return m > 0 ? `${h}h ${m}m` : `${h}h`;
    };

    const getStatusConfig = (status: AttendanceStatus) => {
        switch (status) {
            case 'ontime':
                return { label: 'On Time', bg: isDark ? 'rgba(48, 209, 88, 0.12)' : 'rgba(52, 199, 89, 0.12)', text: isDark ? '#30D158' : '#248A3D', icon: 'checkmark-circle-outline' };
            case 'intime':
                return { label: 'In Time', bg: isDark ? 'rgba(255, 159, 10, 0.12)' : 'rgba(255, 149, 0, 0.12)', text: isDark ? '#FF9F0A' : '#C96800', icon: 'alert-circle-outline' };
            case 'late':
                return { label: 'Late', bg: isDark ? 'rgba(255, 69, 58, 0.12)' : 'rgba(255, 59, 48, 0.12)', text: isDark ? '#FF453A' : '#D70015', icon: 'warning-outline' };
            case 'absent':
                return { label: 'Absent', bg: isDark ? 'rgba(142, 142, 147, 0.12)' : 'rgba(142, 142, 147, 0.1)', text: isDark ? '#A1A1A6' : '#636366', icon: 'close-circle-outline' };
            case 'leave':
                return { label: 'Leave', bg: isDark ? 'rgba(191, 90, 242, 0.12)' : 'rgba(175, 82, 222, 0.12)', text: isDark ? '#BF5AF2' : '#8944AB', icon: 'calendar-outline' };
            case 'sick':
                return { label: 'Sick', bg: isDark ? 'rgba(255, 159, 10, 0.12)' : 'rgba(255, 149, 0, 0.12)', text: isDark ? '#FF9F0A' : '#C96800', icon: 'medical-outline' };
            case 'holiday':
            case 'cuti-bersama':
                return { label: 'Holiday', bg: isDark ? 'rgba(255, 159, 10, 0.12)' : 'rgba(255, 149, 0, 0.12)', text: isDark ? '#FF9F0A' : '#C96800', icon: 'calendar-outline' };
            case 'weekend':
                return { label: 'Weekend', bg: isDark ? 'rgba(142, 142, 147, 0.08)' : 'rgba(142, 142, 147, 0.06)', text: isDark ? '#8E8E93' : '#8E8E93', icon: 'cafe-outline' };
            default:
                return { label: status, bg: isDark ? 'rgba(142, 142, 147, 0.12)' : 'rgba(142, 142, 147, 0.1)', text: isDark ? '#A1A1A6' : '#636366', icon: 'checkmark-circle-outline' };
        }
    };

    // Dynamic overview calculation
    const overviewData = useMemo(() => {
        const totalRecords = allRecords.length;
        const presentCount = allRecords.filter(r => !!r.clockIn).length;
        const lateCount = allRecords.filter(r => r.status === 'late').length;
        const otMinutes = allRecords.reduce((sum, r) => sum + (r.overtimeMinutes || 0), 0);
        const otHours = (otMinutes / 60).toFixed(1);
        const latePenalty = (lateCount * 2);
        const otBonus = Math.min(Math.round(otMinutes / 60), 10);
        
        let score = stats?.attendanceScore ?? Math.max(0, Math.min(100, 100 - latePenalty + otBonus));
        let qualityCategory = 'EXCELLENT';
        let qualityColor = isDark ? '#30D158' : '#248A3D';
        let qualityBg = isDark ? 'rgba(48, 209, 88, 0.12)' : 'rgba(52, 199, 89, 0.12)';

        if (score >= 90) {
            qualityCategory = 'EXCELLENT';
            qualityColor = isDark ? '#30D158' : '#248A3D';
            qualityBg = isDark ? 'rgba(48, 209, 88, 0.12)' : 'rgba(52, 199, 89, 0.12)';
        } else if (score >= 75) {
            qualityCategory = 'GOOD';
            qualityColor = isDark ? '#0A84FF' : '#007AFF';
            qualityBg = isDark ? 'rgba(10, 132, 255, 0.12)' : 'rgba(0, 122, 255, 0.12)';
        } else if (score >= 60) {
            qualityCategory = 'FAIR';
            qualityColor = isDark ? '#FF9F0A' : '#C96800';
            qualityBg = isDark ? 'rgba(255, 159, 10, 0.12)' : 'rgba(255, 149, 0, 0.12)';
        } else {
            qualityCategory = 'POOR';
            qualityColor = isDark ? '#FF453A' : '#D70015';
            qualityBg = isDark ? 'rgba(255, 69, 58, 0.12)' : 'rgba(255, 59, 48, 0.12)';
        }

        const isTeam = viewMode === 'team';
        return {
            present: isTeam ? (teamStats?.avgPresent || presentCount) : (stats?.totalDaysPresent ?? presentCount),
            workingDays: teamStats?.workingDays || (stats?.totalDaysInMonth ? stats.totalDaysInMonth - 8 : 20),
            presentPoints: (presentCount * 5.2).toFixed(1),
            lateCount: isTeam ? (teamStats?.avgLate || lateCount) : (stats?.totalDaysLate ?? lateCount),
            latePenalty,
            otHours: isTeam ? (teamStats?.avgOvertimeHours || otHours) : (otHours || '0.0'),
            otBonus,
            qualityCategory: isTeam ? (teamStats?.quality || qualityCategory) : qualityCategory,
            qualityColor: isTeam ? (teamStats?.qualityColor || qualityColor) : qualityColor,
            qualityBg: isTeam ? (teamStats?.qualityBg || qualityBg) : qualityBg,
            rawScore: (score * 1.05).toFixed(1),
            score: isTeam ? (teamStats?.avgScore || score) : score,
            delta: 1,
            lastScore: 99,
        };
    }, [allRecords, stats, teamStats, viewMode, isDark]);

    const correctionLocationOptions = useMemo(() => {
        const list = workLocations.map((l) => ({
            code: l.code || l.name,
            name: l.name,
            address: l.address,
        }));
        if (record?.checkInLocationCode && !list.some((l) => l.code === record.checkInLocationCode)) {
            list.unshift({
                code: record.checkInLocationCode,
                name: record.checkInLocationCode,
                address: 'Registered Location',
            });
        }
        return list;
    }, [workLocations, record?.checkInLocationCode]);

    const [selectedMemberName, setSelectedMemberName] = useState<string | null>(null);

    useEffect(() => {
        setSelectedMemberName(null);
    }, [currentMonth, viewMode]);

    const teamMemberSummaries = useMemo(() => {
        if (viewMode !== 'team') return [];

        const map = new Map<string, { userId: string; userName: string; records: AttendanceRecord[] }>();
        allRecords.forEach(r => {
            const key = r.userName || r.userId || 'Team Member';
            if (!map.has(key)) {
                map.set(key, {
                    userId: r.userId || key,
                    userName: r.userName || key,
                    records: [],
                });
            }
            map.get(key)!.records.push(r);
        });

        const workingDays = teamStats?.workingDays || 20;

        return Array.from(map.values()).map(m => {
            const recs = m.records;
            const presentCount = recs.filter(r => !!r.clockIn && !['absent', 'leave', 'sick', 'weekend', 'holiday', 'cuti-bersama'].includes(r.status)).length;
            const absentCount = recs.filter(r => r.status === 'absent').length;
            const lateCount = recs.filter(r => r.status === 'late').length;
            const leaveSickCount = recs.filter(r => ['leave', 'sick'].includes(r.status)).length;

            let totalMinutes = 0;
            let totalOtMinutes = 0;
            recs.forEach(r => {
                totalMinutes += (r.totalMinutes || 0);
                totalOtMinutes += (r.overtimeMinutes || 0);
            });

            const penalty = lateCount * 2 + absentCount * 5;
            const bonus = totalOtMinutes > 0 ? 3 : 0;
            const score = Math.max(0, Math.min(100, 100 - penalty + bonus));

            let scoreColor = isDark ? '#30D158' : '#248A3D';
            let scoreBg = isDark ? 'rgba(48, 209, 88, 0.12)' : 'rgba(52, 199, 89, 0.12)';
            if (score < 70) {
                scoreColor = isDark ? '#FF453A' : '#D70015';
                scoreBg = isDark ? 'rgba(255, 69, 58, 0.12)' : 'rgba(255, 59, 48, 0.12)';
            } else if (score < 85) {
                scoreColor = isDark ? '#FF9F0A' : '#C96800';
                scoreBg = isDark ? 'rgba(255, 159, 10, 0.12)' : 'rgba(255, 149, 0, 0.12)';
            }

            return {
                userId: m.userId,
                userName: m.userName,
                records: recs,
                presentCount,
                absentCount,
                lateCount,
                leaveSickCount,
                totalMinutes,
                totalOtMinutes,
                score,
                scoreColor,
                scoreBg,
            };
        }).sort((a, b) => a.userName.localeCompare(b.userName));
    }, [allRecords, viewMode, teamStats, isDark]);

    const selectedMemberRecords = useMemo(() => {
        if (!selectedMemberName) return [];
        return allRecords
            .filter(r => (r.userName || r.userId) === selectedMemberName)
            .sort((a, b) => b.date.localeCompare(a.date));
    }, [allRecords, selectedMemberName]);

    const selectedMemberSummary = useMemo(() => {
        if (!selectedMemberName) return null;
        return teamMemberSummaries.find(m => m.userName === selectedMemberName) || null;
    }, [teamMemberSummaries, selectedMemberName]);

    const selectedMemberOverview = useMemo(() => {
        if (!selectedMemberSummary) return null;
        const s = selectedMemberSummary;
        const otHours = (s.totalOtMinutes / 60).toFixed(1);
        const workingDays = teamStats?.workingDays || 20;

        let qualityCategory = 'EXCELLENT';
        let qualityColor = isDark ? '#30D158' : '#248A3D';
        let qualityBg = isDark ? 'rgba(48, 209, 88, 0.12)' : 'rgba(52, 199, 89, 0.12)';

        if (s.score >= 90) {
            qualityCategory = 'EXCELLENT';
            qualityColor = isDark ? '#30D158' : '#248A3D';
            qualityBg = isDark ? 'rgba(48, 209, 88, 0.12)' : 'rgba(52, 199, 89, 0.12)';
        } else if (s.score >= 75) {
            qualityCategory = 'GOOD';
            qualityColor = isDark ? '#0A84FF' : '#007AFF';
            qualityBg = isDark ? 'rgba(10, 132, 255, 0.12)' : 'rgba(0, 122, 255, 0.12)';
        } else if (s.score >= 60) {
            qualityCategory = 'FAIR';
            qualityColor = isDark ? '#FF9F0A' : '#C96800';
            qualityBg = isDark ? 'rgba(255, 159, 10, 0.12)' : 'rgba(255, 149, 0, 0.12)';
        } else {
            qualityCategory = 'POOR';
            qualityColor = isDark ? '#FF453A' : '#D70015';
            qualityBg = isDark ? 'rgba(255, 69, 58, 0.12)' : 'rgba(255, 59, 48, 0.12)';
        }

        return {
            present: s.presentCount,
            workingDays,
            presentPoints: (s.presentCount * 5.2).toFixed(1),
            lateCount: s.lateCount,
            latePenalty: s.lateCount * 2,
            otHours,
            otBonus: s.totalOtMinutes > 0 ? 3 : 0,
            qualityCategory,
            qualityColor,
            qualityBg,
            rawScore: (s.score * 1.05).toFixed(1),
            score: s.score,
            delta: 1,
            lastScore: 99,
        };
    }, [selectedMemberSummary, teamStats, isDark]);

    const handleExportMember = () => {
        if (!selectedMemberName || selectedMemberRecords.length === 0) return;
        const tenantInfo = activeTenant ? {
            name: activeTenant.branding_name || activeTenant.name,
            logoUrl: activeTenant.branding_logo_url || activeTenant.logo_url,
            companyCode: activeTenant.company_code,
            primaryColor: activeTenant.primary_color,
            slug: activeTenant.slug
        } : undefined;
        const html = generatePersonalTimesheetHtml(
            selectedMemberRecords,
            currentMonth,
            selectedMemberName,
            tenantInfo
        );
        const now = new Date();
        const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
        const namePart = selectedMemberName.replace(/\s+/g, '_');
        const title = `${namePart}_Timesheet_${dateStr}`;
        if (onViewDocument) {
            onViewDocument(html, title);
        } else {
            sharePersonalTimesheet(
                selectedMemberRecords,
                currentMonth,
                selectedMemberName
            );
        }
    };

    // -------------------------------------------------------------
    // RENDER 1: OVERVIEW TABLE (WHEN NO RECORD IS SELECTED)
    // -------------------------------------------------------------
    if (!record) {
        // --- CASE 1A: TEAM VIEW WITH SPECIFIC MEMBER DRILLED DOWN ---
        if (viewMode === 'team' && selectedMemberName && selectedMemberOverview) {
            const isPerfect = selectedMemberOverview.lateCount === 0;

            return (
                <View style={s.container}>
                    {/* Back to Team Summary */}
                    <TouchableOpacity 
                        style={[s.backPill, { backgroundColor: cardBgColor, borderColor }]} 
                        onPress={() => setSelectedMemberName(null)}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="arrow-back" size={14} color={textColor} style={{ marginRight: 6 }} />
                        <Text style={[s.backPillText, { color: textColor }]}>Back to Team Summary</Text>
                    </TouchableOpacity>

                    {/* Member Page Header */}
                    <View style={s.topHeaderRow}>
                        <View style={s.topHeaderLeft}>
                            <Text style={[s.topHeaderTitle, { color: textColor }]}>{selectedMemberName}</Text>
                            <Text style={[s.topHeaderPeriodSubtitle, { color: subtextColor }]}>
                                {periodLabel || format(currentMonth, 'MMMM yyyy')} • {selectedMemberRecords.length} records
                            </Text>
                        </View>

                        <TouchableOpacity 
                            style={[s.exportHeaderBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF', borderColor }]} 
                            onPress={handleExportMember}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="download-outline" size={14} color={textColor} style={{ marginRight: 6 }} />
                            <Text style={[s.exportHeaderBtnText, { color: textColor }]}>Export</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Member Metric Cards Row */}
                    <View style={s.overviewCardsRow}>
                        <View style={[s.overviewCard, { backgroundColor: cardBgColor, borderColor }]}>
                            <Text style={[s.ovCardLabel, { color: subtextColor }]}>Days Present</Text>
                            <View style={s.ovCardValRow}>
                                <Text style={[s.ovCardVal, { color: textColor }]}>{selectedMemberOverview.present}</Text>
                                <Text style={[s.ovCardValSub, { color: subtextColor }]}>/{selectedMemberOverview.workingDays}</Text>
                            </View>
                            <Text style={[s.ovCardFootnote, { color: subtextColor }]}>
                                Points: {selectedMemberOverview.presentPoints}
                            </Text>
                        </View>

                        <View style={[s.overviewCard, { backgroundColor: cardBgColor, borderColor }]}>
                            <Text style={[s.ovCardLabel, { color: subtextColor }]}>Late Arrivals</Text>
                            <Text style={[
                                s.ovCardVal, 
                                { color: Number(selectedMemberOverview.lateCount) > 0 ? (isDark ? '#FF453A' : '#D70015') : textColor }
                            ]}>
                                {selectedMemberOverview.lateCount}
                            </Text>
                            <Text style={[s.ovCardFootnote, { color: subtextColor }]}>
                                Penalty: -{selectedMemberOverview.latePenalty}
                            </Text>
                        </View>

                        <View style={[s.overviewCard, { backgroundColor: cardBgColor, borderColor }]}>
                            <Text style={[s.ovCardLabel, { color: subtextColor }]}>Overtime</Text>
                            <Text style={[s.ovCardVal, { color: textColor }]}>
                                {selectedMemberOverview.otHours}h
                            </Text>
                            <Text style={[s.ovCardFootnote, { color: subtextColor }]}>
                                Bonus: +{selectedMemberOverview.otBonus}
                            </Text>
                        </View>

                        <View style={[s.overviewCard, { backgroundColor: cardBgColor, borderColor }]}>
                            <Text style={[s.ovCardLabel, { color: subtextColor }]}>Quality</Text>
                            <View style={[s.qualityBadge, { backgroundColor: selectedMemberOverview.qualityBg }]}>
                                <Text style={[s.qualityBadgeText, { color: selectedMemberOverview.qualityColor }]}>
                                    {selectedMemberOverview.qualityCategory}
                                </Text>
                            </View>
                            <Text style={[s.ovCardFootnote, { color: subtextColor, marginTop: 4 }]}>
                                Raw: {selectedMemberOverview.rawScore}
                            </Text>
                        </View>

                        <View style={[s.overviewCard, { backgroundColor: cardBgColor, borderColor }]}>
                            <Text style={[s.ovCardLabel, { color: subtextColor }]}>Score</Text>
                            <View style={s.scoreValRow}>
                                <Text style={[s.ovCardVal, { color: textColor }]}>
                                    {selectedMemberOverview.score}%
                                </Text>
                                <View style={s.deltaPill}>
                                    <Text style={s.deltaText}>▲ {selectedMemberOverview.delta}%</Text>
                                </View>
                            </View>
                            <Text style={[s.ovCardFootnote, { color: subtextColor }]}>
                                Last: {selectedMemberOverview.lastScore}%
                            </Text>
                        </View>
                    </View>

                    {/* Member Daily Breakdown Table */}
                    <View style={[s.tableWrapper, { backgroundColor: cardBgColor, borderColor }]}>
                        <View style={[s.tableHeaderRow, { backgroundColor: subtleBgColor, borderBottomColor: borderColor }]}>
                            <Text style={[s.thCell, s.colDate, { color: subtextColor }]}>Date</Text>
                            <Text style={[s.thCell, s.colClockIn, { color: subtextColor }]}>Clock In</Text>
                            <Text style={[s.thCell, s.colClockOut, { color: subtextColor }]}>Clock Out</Text>
                            <Text style={[s.thCell, s.colHours, { color: subtextColor }]}>Hours</Text>
                            <Text style={[s.thCell, s.colStatus, { color: subtextColor }]}>Status</Text>
                        </View>

                        {selectedMemberRecords.map((r, index) => {
                            const dateObj = new Date(r.date);
                            const dayNameStr = format(dateObj, 'EEE, d MMM');
                            const statusConf = getStatusConfig(r.status);
                            const hasInPhoto = !!r.checkInPhotoUrl;
                            const hasOutPhoto = !!r.checkOutPhotoUrl;
                            const isLast = index === selectedMemberRecords.length - 1;

                            const inLocCode = r.checkInLocationCode || (r.checkInRemoteMode === 'remote' ? 'REM' : (r.clockIn ? 'JPF' : null));
                            const outLocCode = r.checkOutLocationCode || (r.checkOutRemoteMode === 'remote' ? 'REM' : (r.clockOut ? (r.checkInLocationCode || 'JPF') : null));
                            const isNonWork = ['weekend', 'holiday', 'cuti-bersama', 'leave', 'sick', 'absent'].includes(r.status);

                            return (
                                <TouchableOpacity 
                                    key={r.id || `${r.date}-${index}`} 
                                    style={[
                                        s.tableRow,
                                        !isLast && { borderBottomColor: borderColor, borderBottomWidth: 1 }
                                    ]}
                                    onPress={() => onSelectRecord?.(r)}
                                    activeOpacity={0.7}
                                >
                                    <View style={[s.tdCell, s.colDate]}>
                                        <Text style={[s.dateMainText, { color: textColor }]}>
                                            {dayNameStr}
                                        </Text>
                                        {r.notes && isNonWork && (
                                            <Text style={[s.dateSubNote, { color: subtextColor }]} numberOfLines={1}>
                                                {r.notes}
                                            </Text>
                                        )}
                                    </View>

                                    <View style={[s.tdCell, s.colClockIn]}>
                                        {r.clockIn ? (
                                            <View style={s.timeLocBlock}>
                                                <View style={s.timeRow}>
                                                    <Text style={[s.timeText, { color: textColor }]}>
                                                        {formatTime(r.clockIn)}
                                                    </Text>
                                                    {hasInPhoto && (
                                                        <TouchableOpacity 
                                                            onPress={() => {
                                                                onSelectRecord?.(r);
                                                                setActiveExpandedPhoto('in');
                                                            }}
                                                            style={s.cameraInlineBadge}
                                                            activeOpacity={0.7}
                                                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                                        >
                                                            <Ionicons name="camera-outline" size={13} color={subtextColor} />
                                                        </TouchableOpacity>
                                                    )}
                                                </View>
                                                {inLocCode && (
                                                    <View style={s.locInlineRow}>
                                                        <Ionicons name="location-sharp" size={11} color={subtextColor} style={{ marginRight: 2 }} />
                                                        <Text style={[s.locInlineText, { color: subtextColor }]}>
                                                            {inLocCode}
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                        ) : (
                                            <Text style={[s.dashText, { color: subtextColor }]}>-</Text>
                                        )}
                                    </View>

                                    <View style={[s.tdCell, s.colClockOut]}>
                                        {r.clockOut ? (
                                            <View style={s.timeLocBlock}>
                                                <View style={s.timeRow}>
                                                    <Text style={[s.timeText, { color: textColor }]}>
                                                        {formatTime(r.clockOut)}
                                                    </Text>
                                                    {hasOutPhoto && (
                                                        <TouchableOpacity 
                                                            onPress={() => {
                                                                onSelectRecord?.(r);
                                                                setActiveExpandedPhoto('out');
                                                            }}
                                                            style={s.cameraInlineBadge}
                                                            activeOpacity={0.7}
                                                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                                        >
                                                            <Ionicons name="camera-outline" size={13} color={subtextColor} />
                                                        </TouchableOpacity>
                                                    )}
                                                </View>
                                                {outLocCode && (
                                                    <View style={s.locInlineRow}>
                                                        <Ionicons name="location-sharp" size={11} color={subtextColor} style={{ marginRight: 2 }} />
                                                        <Text style={[s.locInlineText, { color: subtextColor }]}>
                                                            {outLocCode}
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                        ) : (
                                            <Text style={[s.dashText, { color: subtextColor }]}>-</Text>
                                        )}
                                    </View>

                                    <View style={[s.tdCell, s.colHours]}>
                                        <Text style={[s.durationText, { color: textColor }]}>
                                            {(r.totalMinutes || 0) + (r.overtimeMinutes || 0) > 0 
                                                ? formatMinutes((r.totalMinutes || 0) + (r.overtimeMinutes || 0)) 
                                                : '-'}
                                        </Text>
                                    </View>

                                    <View style={[s.tdCell, s.colStatus]}>
                                        <View style={[s.statusBadge, { backgroundColor: statusConf.bg }]}>
                                            <Ionicons name={statusConf.icon as any} size={11} color={statusConf.text} style={{ marginRight: 4 }} />
                                            <Text style={[s.statusBadgeText, { color: statusConf.text }]}>
                                                {statusConf.label}
                                            </Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            );
        }

        // --- CASE 1B: TEAM VIEW OVERVIEW (MEMBER SUMMARY TABLE) ---
        if (viewMode === 'team') {
            const isPerfect = overviewData.lateCount === 0;

            return (
                <View style={s.container}>
                    {/* 1. Page Header */}
                    <View style={s.topHeaderRow}>
                        <View style={s.topHeaderLeft}>
                            <Text style={[s.topHeaderTitle, { color: textColor }]}>Timesheets</Text>
                            <Text style={[s.topHeaderPeriodSubtitle, { color: subtextColor }]}>
                                {periodLabel || format(currentMonth, 'MMMM yyyy')} • {teamMemberSummaries.length} team members
                            </Text>
                        </View>

                        {onExportPress && (
                            <TouchableOpacity 
                                style={[s.exportHeaderBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF', borderColor }]} 
                                onPress={onExportPress}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="download-outline" size={14} color={textColor} style={{ marginRight: 6 }} />
                                <Text style={[s.exportHeaderBtnText, { color: textColor }]}>Export</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* 2. Discipline Alert Banner */}
                    <View style={[
                        s.bannerCard,
                        {
                            backgroundColor: isPerfect 
                                ? (isDark ? 'rgba(48, 209, 88, 0.08)' : 'rgba(52, 199, 89, 0.06)') 
                                : (isDark ? 'rgba(255, 159, 10, 0.08)' : 'rgba(255, 149, 0, 0.06)'),
                            borderColor: isPerfect 
                                ? (isDark ? 'rgba(48, 209, 88, 0.2)' : 'rgba(52, 199, 89, 0.15)') 
                                : (isDark ? 'rgba(255, 159, 10, 0.2)' : 'rgba(255, 149, 0, 0.15)'),
                        }
                    ]}>
                        <View style={s.bannerIconWrapper}>
                            <Ionicons 
                                name={isPerfect ? "checkmark-circle" : "alert-circle"} 
                                size={18} 
                                color={isPerfect ? (isDark ? '#30D158' : '#248A3D') : (isDark ? '#FF9F0A' : '#C96800')} 
                            />
                        </View>
                        <View style={s.bannerTextCol}>
                            <Text style={[
                                s.bannerTitle,
                                { color: isPerfect ? (isDark ? '#30D158' : '#248A3D') : (isDark ? '#FF9F0A' : '#C96800') }
                            ]}>
                                {isPerfect ? 'Excellent Team Discipline!' : 'Attendance Overview Notice'}
                            </Text>
                            <Text style={[
                                s.bannerSubtitle,
                                { color: subtextColor }
                            ]}>
                                {isPerfect 
                                    ? 'No recorded late arrivals across team members in this period.' 
                                    : `There are ${overviewData.lateCount} average late arrival(s) in this period.`}
                            </Text>
                        </View>
                    </View>

                    {/* 3. Metric Cards Row (5 Cards) */}
                    <View style={s.overviewCardsRow}>
                        <View style={[s.overviewCard, { backgroundColor: cardBgColor, borderColor }]}>
                            <Text style={[s.ovCardLabel, { color: subtextColor }]}>Avg Present</Text>
                            <View style={s.ovCardValRow}>
                                <Text style={[s.ovCardVal, { color: textColor }]}>{overviewData.present}</Text>
                                <Text style={[s.ovCardValSub, { color: subtextColor }]}>/{overviewData.workingDays}</Text>
                            </View>
                            <Text style={[s.ovCardFootnote, { color: subtextColor }]}>
                                Points: {overviewData.presentPoints}
                            </Text>
                        </View>

                        <View style={[s.overviewCard, { backgroundColor: cardBgColor, borderColor }]}>
                            <Text style={[s.ovCardLabel, { color: subtextColor }]}>Avg Late</Text>
                            <Text style={[
                                s.ovCardVal, 
                                { color: Number(overviewData.lateCount) > 0 ? (isDark ? '#FF453A' : '#D70015') : textColor }
                            ]}>
                                {overviewData.lateCount}
                            </Text>
                            <Text style={[s.ovCardFootnote, { color: subtextColor }]}>
                                Penalty: -{overviewData.latePenalty}
                            </Text>
                        </View>

                        <View style={[s.overviewCard, { backgroundColor: cardBgColor, borderColor }]}>
                            <Text style={[s.ovCardLabel, { color: subtextColor }]}>Avg Overtime</Text>
                            <Text style={[s.ovCardVal, { color: textColor }]}>
                                {overviewData.otHours}h
                            </Text>
                            <Text style={[s.ovCardFootnote, { color: subtextColor }]}>
                                Bonus: +{overviewData.otBonus}
                            </Text>
                        </View>

                        <View style={[s.overviewCard, { backgroundColor: cardBgColor, borderColor }]}>
                            <Text style={[s.ovCardLabel, { color: subtextColor }]}>Quality</Text>
                            <View style={[s.qualityBadge, { backgroundColor: overviewData.qualityBg }]}>
                                <Text style={[s.qualityBadgeText, { color: overviewData.qualityColor }]}>
                                    {overviewData.qualityCategory}
                                </Text>
                            </View>
                            <Text style={[s.ovCardFootnote, { color: subtextColor, marginTop: 4 }]}>
                                Raw: {overviewData.rawScore}
                            </Text>
                        </View>

                        <View style={[s.overviewCard, { backgroundColor: cardBgColor, borderColor }]}>
                            <Text style={[s.ovCardLabel, { color: subtextColor }]}>Score</Text>
                            <View style={s.scoreValRow}>
                                <Text style={[s.ovCardVal, { color: textColor }]}>
                                    {overviewData.score}%
                                </Text>
                                <View style={s.deltaPill}>
                                    <Text style={s.deltaText}>▲ {overviewData.delta}%</Text>
                                </View>
                            </View>
                            <Text style={[s.ovCardFootnote, { color: subtextColor }]}>
                                Last: {overviewData.lastScore}%
                            </Text>
                        </View>
                    </View>

                    {/* 4. Team Member Summary Table */}
                    <View style={[s.tableWrapper, { backgroundColor: cardBgColor, borderColor }]}>
                        {/* Table Column Headers */}
                        <View style={[s.tableHeaderRow, { backgroundColor: subtleBgColor, borderBottomColor: borderColor }]}>
                            <Text style={[s.thCell, s.colSumMember, { color: subtextColor }]}>Member</Text>
                            <Text style={[s.thCell, s.colSumPresent, { color: subtextColor }]}>Present</Text>
                            <Text style={[s.thCell, s.colSumAbsent, { color: subtextColor }]}>Absent</Text>
                            <Text style={[s.thCell, s.colSumLate, { color: subtextColor }]}>Late</Text>
                            <Text style={[s.thCell, s.colSumLeaveSick, { color: subtextColor }]}>Leave/Sick</Text>
                            <Text style={[s.thCell, s.colSumWorkHours, { color: subtextColor }]}>Work Hours</Text>
                            <Text style={[s.thCell, s.colSumOvertime, { color: subtextColor }]}>Overtime</Text>
                            <Text style={[s.thCell, s.colSumScore, { color: subtextColor }]}>Score</Text>
                        </View>

                        {/* Members Rows */}
                        {teamMemberSummaries.length === 0 ? (
                            <View style={s.emptyTableWrapper}>
                                <Ionicons name="people-outline" size={28} color={subtextColor} />
                                <Text style={[s.emptyTableText, { color: subtextColor }]}>No member records found</Text>
                            </View>
                        ) : (
                            teamMemberSummaries.map((m, index) => {
                                const isLast = index === teamMemberSummaries.length - 1;

                                return (
                                    <TouchableOpacity 
                                        key={m.userId || m.userName} 
                                        style={[
                                            s.tableRow,
                                            !isLast && { borderBottomColor: borderColor, borderBottomWidth: 1 }
                                        ]}
                                        onPress={() => setSelectedMemberName(m.userName)}
                                        activeOpacity={0.7}
                                    >
                                        {/* Member Name */}
                                        <View style={[s.tdCell, s.colSumMember]}>
                                            <Text style={[s.memberNameText, { color: textColor }]}>
                                                {m.userName}
                                            </Text>
                                        </View>

                                        {/* Present */}
                                        <View style={[s.tdCell, s.colSumPresent]}>
                                            <Text style={[s.sumCellVal, { color: textColor }]}>
                                                {m.presentCount} d
                                            </Text>
                                        </View>

                                        {/* Absent */}
                                        <View style={[s.tdCell, s.colSumAbsent]}>
                                            <Text style={[s.sumCellVal, { color: m.absentCount > 0 ? (isDark ? '#FF453A' : '#D70015') : subtextColor }]}>
                                                {m.absentCount > 0 ? `${m.absentCount} d` : '-'}
                                            </Text>
                                        </View>

                                        {/* Late */}
                                        <View style={[s.tdCell, s.colSumLate]}>
                                            <Text style={[s.sumCellVal, { color: m.lateCount > 0 ? (isDark ? '#FF9F0A' : '#C96800') : subtextColor }]}>
                                                {m.lateCount > 0 ? `${m.lateCount} d` : '-'}
                                            </Text>
                                        </View>

                                        {/* Leave / Sick */}
                                        <View style={[s.tdCell, s.colSumLeaveSick]}>
                                            <Text style={[s.sumCellVal, { color: m.leaveSickCount > 0 ? '#AF52DE' : subtextColor }]}>
                                                {m.leaveSickCount > 0 ? `${m.leaveSickCount} d` : '-'}
                                            </Text>
                                        </View>

                                        {/* Work Hours */}
                                        <View style={[s.tdCell, s.colSumWorkHours]}>
                                            <Text style={[s.sumCellVal, { color: textColor }]}>
                                                {formatMinutes(m.totalMinutes + m.totalOtMinutes)}
                                            </Text>
                                        </View>

                                        {/* Overtime */}
                                        <View style={[s.tdCell, s.colSumOvertime]}>
                                            <Text style={[s.sumCellVal, { color: m.totalOtMinutes > 0 ? (isDark ? '#30D158' : '#248A3D') : subtextColor }]}>
                                                {m.totalOtMinutes > 0 ? formatMinutes(m.totalOtMinutes) : '-'}
                                            </Text>
                                        </View>

                                        {/* Score */}
                                        <View style={[s.tdCell, s.colSumScore]}>
                                            <View style={[s.sumScorePill, { backgroundColor: m.scoreBg }]}>
                                                <Text style={[s.sumScoreText, { color: m.scoreColor }]}>
                                                    {m.score}%
                                                </Text>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })
                        )}
                    </View>
                </View>
            );
        }

        // --- CASE 1C: PERSONAL VIEW OVERVIEW ---
        const isPerfect = overviewData.lateCount === 0;

        return (
            <View style={s.container}>
                {/* 1. Page Header */}
                <View style={s.topHeaderRow}>
                    <View style={s.topHeaderLeft}>
                        <Text style={[s.topHeaderTitle, { color: textColor }]}>Timesheets</Text>
                        <Text style={[s.topHeaderPeriodSubtitle, { color: subtextColor }]}>
                            {periodLabel || format(currentMonth, 'MMMM yyyy')} • {allRecords.length} records
                        </Text>
                    </View>

                    {onExportPress && (
                        <TouchableOpacity 
                            style={[s.exportHeaderBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF', borderColor }]} 
                            onPress={onExportPress}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="download-outline" size={14} color={textColor} style={{ marginRight: 6 }} />
                            <Text style={[s.exportHeaderBtnText, { color: textColor }]}>Export</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* 2. Discipline Alert Banner */}
                <View style={[
                    s.bannerCard,
                    {
                        backgroundColor: isPerfect 
                            ? (isDark ? 'rgba(48, 209, 88, 0.08)' : 'rgba(52, 199, 89, 0.06)') 
                            : (isDark ? 'rgba(255, 159, 10, 0.08)' : 'rgba(255, 149, 0, 0.06)'),
                        borderColor: isPerfect 
                            ? (isDark ? 'rgba(48, 209, 88, 0.2)' : 'rgba(52, 199, 89, 0.15)') 
                            : (isDark ? 'rgba(255, 159, 10, 0.2)' : 'rgba(255, 149, 0, 0.15)'),
                    }
                ]}>
                    <View style={s.bannerIconWrapper}>
                        <Ionicons 
                            name={isPerfect ? "checkmark-circle" : "alert-circle"} 
                            size={18} 
                            color={isPerfect ? (isDark ? '#30D158' : '#248A3D') : (isDark ? '#FF9F0A' : '#C96800')} 
                        />
                    </View>
                    <View style={s.bannerTextCol}>
                        <Text style={[
                            s.bannerTitle,
                            { color: isPerfect ? (isDark ? '#30D158' : '#248A3D') : (isDark ? '#FF9F0A' : '#C96800') }
                        ]}>
                            {isPerfect ? 'Perfect Attendance!' : 'Attendance Notice'}
                        </Text>
                        <Text style={[
                            s.bannerSubtitle,
                            { color: subtextColor }
                        ]}>
                            {isPerfect 
                                ? 'Maintain your discipline by never being late this period.' 
                                : `You have ${overviewData.lateCount} late arrival(s) in this period.`}
                        </Text>
                    </View>
                </View>

                {/* 3. Metric Cards Row (5 Cards) */}
                <View style={s.overviewCardsRow}>
                    <View style={[s.overviewCard, { backgroundColor: cardBgColor, borderColor }]}>
                        <Text style={[s.ovCardLabel, { color: subtextColor }]}>Days Present</Text>
                        <View style={s.ovCardValRow}>
                            <Text style={[s.ovCardVal, { color: textColor }]}>{overviewData.present}</Text>
                            <Text style={[s.ovCardValSub, { color: subtextColor }]}>/{overviewData.workingDays}</Text>
                        </View>
                        <Text style={[s.ovCardFootnote, { color: subtextColor }]}>
                            Points: {overviewData.presentPoints}
                        </Text>
                    </View>

                    <View style={[s.overviewCard, { backgroundColor: cardBgColor, borderColor }]}>
                        <Text style={[s.ovCardLabel, { color: subtextColor }]}>Late Arrivals</Text>
                        <Text style={[
                            s.ovCardVal, 
                            { color: Number(overviewData.lateCount) > 0 ? (isDark ? '#FF453A' : '#D70015') : textColor }
                        ]}>
                            {overviewData.lateCount}
                        </Text>
                        <Text style={[s.ovCardFootnote, { color: subtextColor }]}>
                            Penalty: -{overviewData.latePenalty}
                        </Text>
                    </View>

                    <View style={[s.overviewCard, { backgroundColor: cardBgColor, borderColor }]}>
                        <Text style={[s.ovCardLabel, { color: subtextColor }]}>Overtime</Text>
                        <Text style={[s.ovCardVal, { color: textColor }]}>
                            {overviewData.otHours}h
                        </Text>
                        <Text style={[s.ovCardFootnote, { color: subtextColor }]}>
                            Bonus: +{overviewData.otBonus}
                        </Text>
                    </View>

                    <View style={[s.overviewCard, { backgroundColor: cardBgColor, borderColor }]}>
                        <Text style={[s.ovCardLabel, { color: subtextColor }]}>Quality</Text>
                        <View style={[s.qualityBadge, { backgroundColor: overviewData.qualityBg }]}>
                            <Text style={[s.qualityBadgeText, { color: overviewData.qualityColor }]}>
                                {overviewData.qualityCategory}
                            </Text>
                        </View>
                        <Text style={[s.ovCardFootnote, { color: subtextColor, marginTop: 4 }]}>
                            Raw: {overviewData.rawScore}
                        </Text>
                    </View>

                    <View style={[s.overviewCard, { backgroundColor: cardBgColor, borderColor }]}>
                        <Text style={[s.ovCardLabel, { color: subtextColor }]}>Score</Text>
                        <View style={s.scoreValRow}>
                            <Text style={[s.ovCardVal, { color: textColor }]}>
                                {overviewData.score}%
                            </Text>
                            <View style={s.deltaPill}>
                                <Text style={s.deltaText}>▲ {overviewData.delta}%</Text>
                            </View>
                        </View>
                        <Text style={[s.ovCardFootnote, { color: subtextColor }]}>
                            Last: {overviewData.lastScore}%
                        </Text>
                    </View>
                </View>

                {/* 4. Timesheet Overview Table (5 Clean Columns) */}
                <View style={[s.tableWrapper, { backgroundColor: cardBgColor, borderColor }]}>
                    <View style={[s.tableHeaderRow, { backgroundColor: subtleBgColor, borderBottomColor: borderColor }]}>
                        <Text style={[s.thCell, s.colDate, { color: subtextColor }]}>Date</Text>
                        <Text style={[s.thCell, s.colClockIn, { color: subtextColor }]}>Clock In</Text>
                        <Text style={[s.thCell, s.colClockOut, { color: subtextColor }]}>Clock Out</Text>
                        <Text style={[s.thCell, s.colHours, { color: subtextColor }]}>Hours</Text>
                        <Text style={[s.thCell, s.colStatus, { color: subtextColor }]}>Status</Text>
                    </View>

                    {allRecords.length === 0 ? (
                        <View style={s.emptyTableWrapper}>
                            <Ionicons name="calendar-outline" size={28} color={subtextColor} />
                            <Text style={[s.emptyTableText, { color: subtextColor }]}>No records found for this period</Text>
                        </View>
                    ) : (
                        allRecords.map((r, index) => {
                            const dateObj = new Date(r.date);
                            const dayNameStr = format(dateObj, 'EEE, d MMM');
                            const statusConf = getStatusConfig(r.status);
                            const hasInPhoto = !!r.checkInPhotoUrl;
                            const hasOutPhoto = !!r.checkOutPhotoUrl;
                            const isLast = index === allRecords.length - 1;

                            const inLocCode = r.checkInLocationCode || (r.checkInRemoteMode === 'remote' ? 'REM' : (r.clockIn ? 'JPF' : null));
                            const outLocCode = r.checkOutLocationCode || (r.checkOutRemoteMode === 'remote' ? 'REM' : (r.clockOut ? (r.checkInLocationCode || 'JPF') : null));
                            const isNonWork = ['weekend', 'holiday', 'cuti-bersama', 'leave', 'sick', 'absent'].includes(r.status);

                            return (
                                <TouchableOpacity 
                                    key={r.id || `${r.date}-${index}`} 
                                    style={[
                                        s.tableRow,
                                        !isLast && { borderBottomColor: borderColor, borderBottomWidth: 1 }
                                    ]}
                                    onPress={() => onSelectRecord?.(r)}
                                    activeOpacity={0.7}
                                >
                                    <View style={[s.tdCell, s.colDate]}>
                                        <Text style={[s.dateMainText, { color: textColor }]}>
                                            {dayNameStr}
                                        </Text>
                                        {r.notes && isNonWork && (
                                            <Text style={[s.dateSubNote, { color: subtextColor }]} numberOfLines={1}>
                                                {r.notes}
                                            </Text>
                                        )}
                                    </View>

                                    <View style={[s.tdCell, s.colClockIn]}>
                                        {r.clockIn ? (
                                            <View style={s.timeLocBlock}>
                                                <View style={s.timeRow}>
                                                    <Text style={[s.timeText, { color: textColor }]}>
                                                        {formatTime(r.clockIn)}
                                                    </Text>
                                                    {hasInPhoto && (
                                                        <TouchableOpacity 
                                                            onPress={() => {
                                                                onSelectRecord?.(r);
                                                                setActiveExpandedPhoto('in');
                                                            }}
                                                            style={s.cameraInlineBadge}
                                                            activeOpacity={0.7}
                                                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                                        >
                                                            <Ionicons name="camera-outline" size={13} color={subtextColor} />
                                                        </TouchableOpacity>
                                                    )}
                                                </View>
                                                {inLocCode && (
                                                    <View style={s.locInlineRow}>
                                                        <Ionicons name="location-sharp" size={11} color={subtextColor} style={{ marginRight: 2 }} />
                                                        <Text style={[s.locInlineText, { color: subtextColor }]}>
                                                            {inLocCode}
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                        ) : (
                                            <Text style={[s.dashText, { color: subtextColor }]}>-</Text>
                                        )}
                                    </View>

                                    <View style={[s.tdCell, s.colClockOut]}>
                                        {r.clockOut ? (
                                            <View style={s.timeLocBlock}>
                                                <View style={s.timeRow}>
                                                    <Text style={[s.timeText, { color: textColor }]}>
                                                        {formatTime(r.clockOut)}
                                                    </Text>
                                                    {hasOutPhoto && (
                                                        <TouchableOpacity 
                                                            onPress={() => {
                                                                onSelectRecord?.(r);
                                                                setActiveExpandedPhoto('out');
                                                            }}
                                                            style={s.cameraInlineBadge}
                                                            activeOpacity={0.7}
                                                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                                        >
                                                            <Ionicons name="camera-outline" size={13} color={subtextColor} />
                                                        </TouchableOpacity>
                                                    )}
                                                </View>
                                                {outLocCode && (
                                                    <View style={s.locInlineRow}>
                                                        <Ionicons name="location-sharp" size={11} color={subtextColor} style={{ marginRight: 2 }} />
                                                        <Text style={[s.locInlineText, { color: subtextColor }]}>
                                                            {outLocCode}
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                        ) : (
                                            <Text style={[s.dashText, { color: subtextColor }]}>-</Text>
                                        )}
                                    </View>

                                    <View style={[s.tdCell, s.colHours]}>
                                        <Text style={[s.durationText, { color: textColor }]}>
                                            {(r.totalMinutes || 0) + (r.overtimeMinutes || 0) > 0 
                                                ? formatMinutes((r.totalMinutes || 0) + (r.overtimeMinutes || 0)) 
                                                : '-'}
                                        </Text>
                                    </View>

                                    <View style={[s.tdCell, s.colStatus]}>
                                        <View style={[s.statusBadge, { backgroundColor: statusConf.bg }]}>
                                            <Ionicons name={statusConf.icon as any} size={11} color={statusConf.text} style={{ marginRight: 4 }} />
                                            <Text style={[s.statusBadgeText, { color: statusConf.text }]}>
                                                {statusConf.label}
                                            </Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            );
                        })
                    )}
                </View>
            </View>
        );
    }

    // -------------------------------------------------------------
    // RENDER 2: INDIVIDUAL RECORD DETAIL PANE
    // -------------------------------------------------------------
    const statusConfig = getStatusConfig(record.status);
    const dateObj = new Date(record.date);
    const fullDateFormatted = format(dateObj, 'EEEE, d MMMM yyyy');

    const corrReq = correctionRequests.find(c => c.attendanceDate === record.date || c.attendanceRecordId === record.id);
    const isEligibleForCorrection = corrReq?.status !== 'pending';

    const inLocCode = record.checkInLocationCode || (record.checkInRemoteMode === 'remote' ? 'REMOTE' : 'OFFICE');
    const outLocCode = record.checkOutLocationCode || (record.checkOutRemoteMode === 'remote' ? 'REMOTE' : inLocCode);

    const activePhotoUrl = activeExpandedPhoto === 'in' 
        ? record.checkInPhotoUrl 
        : activeExpandedPhoto === 'out' 
        ? record.checkOutPhotoUrl 
        : null;

    const handleThumbnailClick = (type: 'in' | 'out', url?: string) => {
        if (!url) return;
        setActiveExpandedPhoto(type);
    };

    const getCorrectionOriginalValue = (field: CorrectionFieldType) => {
        if (!record) return '-';
        if (field === 'clock_in') {
            if (!record.clockIn) return 'Not Clocked In';
            try {
                return format(new Date(record.clockIn), 'HH:mm');
            } catch {
                return record.clockIn;
            }
        }
        if (field === 'clock_out') {
            if (!record.clockOut) return 'Not Clocked Out';
            try {
                return format(new Date(record.clockOut), 'HH:mm');
            } catch {
                return record.clockOut;
            }
        }
        if (field === 'work_location') {
            return inLocCode;
        }
        if (field === 'attendance_status') {
            return record.status || 'ontime';
        }
        return '-';
    };

    const handlePickCorrectionEvidence = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Camera roll access is needed to attach evidence.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.8,
            base64: true,
        });

        if (!result.canceled && result.assets && result.assets[0]) {
            setCorrectionAttachment(result.assets[0]);
        }
    };

    const handleSubmitCorrection = async () => {
        if (!record) return;

        if (correctionPolicy.requireReason && !correctionReason.trim()) {
            Alert.alert('Reason Required', 'Please provide a clear justification for this attendance correction.');
            return;
        }

        if (correctionPolicy.evidenceAttachment === 'required' && !correctionAttachment) {
            Alert.alert('Evidence Required', 'Please attach a supporting photo or screenshot for this correction.');
            return;
        }

        setIsSubmittingCorrection(true);
        try {
            let uploadedUrl: string | undefined = undefined;
            if (correctionAttachment?.base64) {
                const ext = correctionAttachment.uri.split('.').pop() || 'jpg';
                uploadedUrl = await uploadCrewFileBase64(
                    correctionAttachment.base64,
                    ext,
                    `image/${ext}`,
                    'attendance_corrections'
                );
            }

            const requestedVal = correctionField === 'clock_in' || correctionField === 'clock_out'
                ? correctionTimeString
                : correctionField === 'work_location'
                ? correctionLocation
                : correctionStatus;

            const isAutoApproved = !correctionPolicy.requireApproval;
            await createCorrectionRequest({
                userId: user?.id || record.userId || '00000000-0000-0000-0000-000000000000',
                userName: profile?.full_name || record.userName || 'Employee',
                attendanceRecordId: record.id,
                attendanceDate: record.date,
                correctionType: correctionField,
                originalValue: getCorrectionOriginalValue(correctionField),
                requestedValue: requestedVal,
                reason: correctionReason.trim(),
                evidenceUrl: uploadedUrl,
                status: isAutoApproved ? 'approved' : 'pending',
            });

            setIsRequestingCorrection(false);
            onRequestCorrection?.(record);
        } catch (e: any) {
            Alert.alert('Submission Failed', e.message || 'Unable to submit correction request.');
        } finally {
            setIsSubmittingCorrection(false);
        }
    };

    // -------------------------------------------------------------
    // RENDER 2C: EMBEDDED ATTENDANCE CORRECTION REQUEST VIEW
    // -------------------------------------------------------------
    if (isRequestingCorrection && record) {
        return (
            <View style={s.container}>
                {/* Back to Details Button */}
                <TouchableOpacity 
                    style={[s.backPill, { backgroundColor: cardBgColor, borderColor }]} 
                    onPress={() => setIsRequestingCorrection(false)}
                    activeOpacity={0.7}
                >
                    <Ionicons name="arrow-back" size={14} color={textColor} style={{ marginRight: 6 }} />
                    <Text style={[s.backPillText, { color: textColor }]}>Back to Details</Text>
                </TouchableOpacity>

                {/* Form Card */}
                <View style={[s.formCard, { backgroundColor: cardBgColor, borderColor, borderWidth: isDark ? 0.5 : 1 }]}>
                    <View style={s.formHeader}>
                        <Text style={[s.formTitle, { color: textColor }]}>Request Correction</Text>
                        <Text style={[s.formSubtitle, { color: subtextColor }]}>
                            {fullDateFormatted}
                        </Text>
                    </View>

                    {/* Field To Correct */}
                    <View style={s.formSection}>
                        <Text style={[s.formSectionLabel, { color: subtextColor }]}>FIELD TO CORRECT</Text>
                        <View style={s.fieldPillRow}>
                            {CORRECTION_FIELD_OPTIONS.map((f) => {
                                const isSel = correctionField === f.key;
                                return (
                                    <TouchableOpacity
                                        key={f.key}
                                        style={[
                                            s.fieldPill,
                                            { backgroundColor: isSel ? '#007AFF' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'), borderColor }
                                        ]}
                                        onPress={() => setCorrectionField(f.key)}
                                    >
                                        <Text style={[s.fieldPillText, { color: isSel ? '#FFFFFF' : textColor, fontWeight: isSel ? '700' : '500' }]}>
                                            {f.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    {/* Current Record Value */}
                    <View style={[s.currentValueBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F2F2F7', borderColor }]}>
                        <Text style={[s.currentValueLabel, { color: subtextColor }]}>Current Record Value:</Text>
                        <Text style={[s.currentValueText, { color: textColor }]}>
                            {getCorrectionOriginalValue(correctionField)}
                        </Text>
                    </View>

                    {/* Requested New Value */}
                    <View style={s.formSection}>
                        <Text style={[s.formSectionLabel, { color: subtextColor }]}>REQUESTED NEW VALUE</Text>
                        {(correctionField === 'clock_in' || correctionField === 'clock_out') && (
                            <TextInput
                                style={[s.textInput, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', color: textColor, borderColor }]}
                                value={correctionTimeString}
                                onChangeText={setCorrectionTimeString}
                                placeholder="HH:mm (e.g. 08:30)"
                                placeholderTextColor={subtextColor}
                            />
                        )}

                        {correctionField === 'work_location' && (
                            <View style={s.optionList}>
                                {correctionLocationOptions.map((loc) => {
                                    const isSel = correctionLocation === loc.code;
                                    return (
                                        <TouchableOpacity
                                            key={loc.code}
                                            style={[
                                                s.optionRow,
                                                { backgroundColor: isSel ? (isDark ? 'rgba(0,122,255,0.15)' : 'rgba(0,122,255,0.08)') : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'), borderColor: isSel ? '#007AFF' : borderColor }
                                            ]}
                                            onPress={() => setCorrectionLocation(loc.code)}
                                        >
                                            <View style={{ flex: 1, gap: 2 }}>
                                                <Text style={[s.optionText, { color: textColor, fontWeight: '600' }]}>{loc.name}</Text>
                                                {loc.address ? (
                                                    <Text style={{ fontSize: 11, color: subtextColor }}>{loc.address}</Text>
                                                ) : null}
                                            </View>
                                            {isSel && <Ionicons name="checkmark-circle" size={18} color="#007AFF" />}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        )}

                        {correctionField === 'attendance_status' && (
                            <View style={s.optionList}>
                                {CORRECTION_STATUS_OPTIONS.map((st) => {
                                    const isSel = correctionStatus === st.value;
                                    return (
                                        <TouchableOpacity
                                            key={st.value}
                                            style={[
                                                s.optionRow,
                                                { backgroundColor: isSel ? (isDark ? 'rgba(0,122,255,0.15)' : 'rgba(0,122,255,0.08)') : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'), borderColor: isSel ? '#007AFF' : borderColor }
                                            ]}
                                            onPress={() => setCorrectionStatus(st.value)}
                                        >
                                            <Text style={[s.optionText, { color: textColor, fontWeight: '600' }]}>{st.label}</Text>
                                            {isSel && <Ionicons name="checkmark-circle" size={18} color="#007AFF" />}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        )}
                    </View>

                    {/* Reason / Justification */}
                    <View style={s.formSection}>
                        <Text style={[s.formSectionLabel, { color: subtextColor }]}>REASON / JUSTIFICATION</Text>
                        <TextInput
                            style={[s.multilineInput, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', color: textColor, borderColor }]}
                            value={correctionReason}
                            onChangeText={setCorrectionReason}
                            placeholder="Explain why this correction is needed..."
                            placeholderTextColor={subtextColor}
                            multiline
                            numberOfLines={3}
                        />
                    </View>

                    {/* Attach Evidence */}
                    <View style={s.formSection}>
                        <TouchableOpacity
                            style={[s.attachButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor }]}
                            onPress={handlePickCorrectionEvidence}
                        >
                            <Ionicons name="attach" size={16} color="#AF52DE" style={{ marginRight: 6 }} />
                            <Text style={[s.attachButtonText, { color: '#AF52DE' }]}>
                                {correctionAttachment ? 'Change Attached File' : 'Attach Supporting Document / Photo'}
                            </Text>
                        </TouchableOpacity>
                        {correctionAttachment && (
                            <View style={s.evidencePreviewWrapper}>
                                <Image source={{ uri: correctionAttachment.uri }} style={s.evidenceThumbnail} resizeMode="cover" />
                                <TouchableOpacity onPress={() => setCorrectionAttachment(null)} style={s.evidenceRemoveBtn}>
                                    <Ionicons name="close" size={14} color="#FFF" />
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                    {/* Submit Button */}
                    <TouchableOpacity
                        style={[s.submitCorrectionBtn, isSubmittingCorrection && { opacity: 0.6 }]}
                        onPress={handleSubmitCorrection}
                        disabled={isSubmittingCorrection}
                        activeOpacity={0.8}
                    >
                        {isSubmittingCorrection ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <Text style={s.submitCorrectionBtnText}>Submit Correction Request</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // -------------------------------------------------------------
    // RENDER 2A: FULL-PANEL PHOTO PROOF VIEW (WHEN A PHOTO IS OPENED)
    // -------------------------------------------------------------
    if (activeExpandedPhoto && activePhotoUrl) {
        const isIn = activeExpandedPhoto === 'in';
        const photoTime = isIn ? record.clockIn : record.clockOut;
        const photoLoc = isIn ? inLocCode : outLocCode;
        const hasBoth = !!(record.checkInPhotoUrl && record.checkOutPhotoUrl);

        return (
            <View style={s.container}>
                {/* Header navigation bar */}
                <View style={s.photoProofNavRow}>
                    <TouchableOpacity 
                        style={[s.backPill, { backgroundColor: cardBgColor, borderColor }]} 
                        onPress={() => setActiveExpandedPhoto(null)}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="arrow-back" size={14} color={textColor} style={{ marginRight: 6 }} />
                        <Text style={[s.backPillText, { color: textColor }]}>Back to Details</Text>
                    </TouchableOpacity>

                    {/* Toggle In / Out if both exist */}
                    {hasBoth && (
                        <View style={[s.photoTogglePill, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', borderColor }]}>
                            <TouchableOpacity
                                style={[
                                    s.photoToggleBtn,
                                    isIn && { backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 }
                                ]}
                                onPress={() => setActiveExpandedPhoto('in')}
                                activeOpacity={0.7}
                            >
                                <Text style={[s.photoToggleText, { color: isIn ? textColor : subtextColor, fontWeight: isIn ? '700' : '500' }]}>
                                    Clock In
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    s.photoToggleBtn,
                                    !isIn && { backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 }
                                ]}
                                onPress={() => setActiveExpandedPhoto('out')}
                                activeOpacity={0.7}
                            >
                                <Text style={[s.photoToggleText, { color: !isIn ? textColor : subtextColor, fontWeight: !isIn ? '700' : '500' }]}>
                                    Clock Out
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* Full-panel Photo Card */}
                <View style={[s.fullPhotoCard, { backgroundColor: cardBgColor, borderColor }]}>
                    <View style={s.fullPhotoHeader}>
                        <View style={{ flex: 1 }}>
                            <Text style={[s.fullPhotoTitle, { color: textColor }]}>
                                {isIn ? 'Clock In Photo Proof' : 'Clock Out Photo Proof'}
                            </Text>
                            <Text style={[s.fullPhotoSubtitle, { color: subtextColor }]}>
                                {fullDateFormatted} {photoTime ? `• ${formatTime(photoTime)}` : ''} {photoLoc ? `• ${photoLoc}` : ''}
                            </Text>
                        </View>
                    </View>

                    {/* Full Photo Image Canvas */}
                    <View style={s.fullPhotoContainer}>
                        <Image 
                            source={{ uri: activePhotoUrl }} 
                            style={s.fullPhotoImage} 
                            resizeMode="cover" 
                        />
                        
                        {/* Elegant Bottom Watermark Info Overlay */}
                        <View style={s.fullPhotoWatermarkOverlay}>
                            <View style={s.fullPhotoWatermarkLeft}>
                                <Text style={s.fullPhotoWatermarkTitle}>
                                    {record.userName || 'Employee'}
                                </Text>
                                <Text style={s.fullPhotoWatermarkSub}>
                                    {fullDateFormatted} {photoTime ? `• ${formatTime(photoTime)}` : ''}
                                </Text>
                            </View>
                            {photoLoc && (
                                <View style={s.fullPhotoWatermarkBadge}>
                                    <Ionicons name="location-sharp" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                                    <Text style={s.fullPhotoWatermarkBadgeText}>{photoLoc}</Text>
                                </View>
                            )}
                        </View>
                    </View>
                </View>
            </View>
        );
    }

    // -------------------------------------------------------------
    // RENDER 2B: INDIVIDUAL RECORD DETAIL PANE
    // -------------------------------------------------------------
    return (
        <View style={s.container}>
            {/* Back to Overview Pill */}
            <TouchableOpacity 
                style={[s.backPill, { backgroundColor: cardBgColor, borderColor }]} 
                onPress={() => onSelectRecord?.(null as any)}
                activeOpacity={0.7}
            >
                <Ionicons name="arrow-back" size={14} color={textColor} style={{ marginRight: 6 }} />
                <Text style={[s.backPillText, { color: textColor }]}>Back to Overview Table</Text>
            </TouchableOpacity>

            {/* Main Header Card */}
            <View style={[s.headerCard, { backgroundColor: cardBgColor, borderColor, borderWidth: isDark ? 0.5 : 1 }]}>
                <View style={s.headerTopRow}>
                    <View style={s.headerTitleCol}>
                        <Text style={[s.headerDayText, { color: textColor }]}>
                            {viewMode === 'team' ? (record.userName || 'Team Member') : format(dateObj, 'EEEE')}
                        </Text>
                        <Text style={[s.headerFullDate, { color: subtextColor }]}>
                            {viewMode === 'team' ? `${format(dateObj, 'EEEE')}, ${fullDateFormatted}` : fullDateFormatted}
                        </Text>
                    </View>

                    <View style={[s.statusBigBadge, { backgroundColor: statusConfig.bg }]}>
                        <Ionicons name={statusConfig.icon as any} size={14} color={statusConfig.text} style={{ marginRight: 5 }} />
                        <Text style={[s.statusBigText, { color: statusConfig.text }]}>
                            {statusConfig.label}
                        </Text>
                    </View>
                </View>

                {/* In & Out Location Badges */}
                <View style={s.headerLocPillsRow}>
                    {record.clockIn && (
                        <View style={s.headerLocationBadge}>
                            <Text style={s.headerLocationText}>
                                <Text style={{ color: subtextColor, fontWeight: '600' }}>IN </Text>
                                <Text style={{ color: textColor, fontWeight: '700' }}>{inLocCode}</Text>
                            </Text>
                        </View>
                    )}
                    {record.clockOut && (
                        <View style={s.headerLocationBadge}>
                            <Text style={s.headerLocationText}>
                                <Text style={{ color: subtextColor, fontWeight: '600' }}>OUT </Text>
                                <Text style={{ color: textColor, fontWeight: '700' }}>{outLocCode}</Text>
                            </Text>
                        </View>
                    )}
                </View>

                {/* Correction Status if active */}
                {corrReq && (
                    <View style={[
                        s.correctionBanner,
                        {
                            backgroundColor: corrReq.status === 'approved' 
                                ? (isDark ? 'rgba(48,209,88,0.1)' : 'rgba(52,199,89,0.08)') 
                                : corrReq.status === 'rejected' 
                                ? (isDark ? 'rgba(255,69,58,0.1)' : 'rgba(255,59,48,0.08)') 
                                : (isDark ? 'rgba(255,159,10,0.1)' : 'rgba(255,149,0,0.08)')
                        }
                    ]}>
                        <PlatformIcon 
                            name={corrReq.status === 'approved' ? 'checkmark.circle.fill' : corrReq.status === 'rejected' ? 'xmark.circle.fill' : 'clock.fill'} 
                            size={14} 
                            tintColor={corrReq.status === 'approved' ? '#34C759' : corrReq.status === 'rejected' ? '#FF3B30' : '#FF9500'} 
                        />
                        <View style={{ marginLeft: 8, flex: 1 }}>
                            <Text style={[
                                s.correctionBannerTitle, 
                                { color: corrReq.status === 'approved' ? '#34C759' : corrReq.status === 'rejected' ? '#FF3B30' : '#FF9500' }
                            ]}>
                                {corrReq.status === 'pending'
                                    ? `Correction Request Pending (${corrReq.originalValue} ➔ ${corrReq.requestedValue})`
                                    : corrReq.status === 'approved'
                                    ? `Correction Applied (${corrReq.requestedValue})`
                                    : `Correction Rejected (${corrReq.rejectReason || 'Declined'})`}
                            </Text>
                            {corrReq.reason && (
                                <Text style={[s.correctionBannerSub, { color: subtextColor }]}>
                                    Reason: {corrReq.reason}
                                </Text>
                            )}
                        </View>
                    </View>
                )}

                {/* Notes box */}
                {record.notes && (
                    <View style={[s.notesBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F2F2F7' }]}>
                        <Text style={[s.notesBoxLabel, { color: subtextColor }]}>NOTES / REASON</Text>
                        <Text style={[s.notesBoxText, { color: textColor }]}>{record.notes}</Text>
                    </View>
                )}
            </View>

            {/* Metrics Grid */}
            <View style={s.metricsRow}>
                {/* Clock In */}
                <View style={[s.metricCard, { backgroundColor: cardBgColor, borderColor, borderWidth: isDark ? 0.5 : 1 }]}>
                    <Text style={[s.metricLabel, { color: subtextColor }]}>Clock In</Text>
                    <Text style={[s.metricValue, { color: textColor }]}>
                        {record.clockIn ? formatTime(record.clockIn) : '--:--'}
                    </Text>
                </View>

                {/* Clock Out */}
                <View style={[s.metricCard, { backgroundColor: cardBgColor, borderColor, borderWidth: isDark ? 0.5 : 1 }]}>
                    <Text style={[s.metricLabel, { color: subtextColor }]}>Clock Out</Text>
                    <Text style={[s.metricValue, { color: textColor }]}>
                        {record.clockOut ? formatTime(record.clockOut) : '--:--'}
                    </Text>
                </View>

                {/* Total Duration */}
                <View style={[s.metricCard, { backgroundColor: cardBgColor, borderColor, borderWidth: isDark ? 0.5 : 1 }]}>
                    <Text style={[s.metricLabel, { color: subtextColor }]}>Duration</Text>
                    <Text style={[s.metricValue, { color: textColor }]}>
                        {formatMinutes(record.totalMinutes)}
                    </Text>
                </View>

                {/* Overtime */}
                <View style={[s.metricCard, { backgroundColor: cardBgColor, borderColor, borderWidth: isDark ? 0.5 : 1 }]}>
                    <Text style={[s.metricLabel, { color: subtextColor }]}>Overtime</Text>
                    <Text style={[s.metricValue, { color: textColor }]}>
                        {formatMinutes(record.overtimeMinutes)}
                    </Text>
                </View>
            </View>

            {/* Coordinates / Location Verification Card */}
            {(record.checkInLatitude != null && record.checkInLongitude != null) && (
                <TouchableOpacity 
                    style={[s.locationCard, { backgroundColor: cardBgColor, borderColor, borderWidth: isDark ? 0.5 : 1 }]}
                    onPress={() => {
                        const url = `https://www.google.com/maps/search/?api=1&query=${record.checkInLatitude},${record.checkInLongitude}`;
                        Linking.openURL(url);
                    }}
                    activeOpacity={0.7}
                >
                    <View style={s.locationCardHeader}>
                        <Ionicons name="location-outline" size={15} color={subtextColor} />
                        <Text style={[s.sectionTitle, { color: textColor, flex: 1 }]}>Location Verification</Text>
                        <Ionicons name="open-outline" size={14} color="#0EA5E9" />
                    </View>
                    <Text style={[s.coordsText, { color: '#0EA5E9', textDecorationLine: 'underline' }]}>
                        {`${record.checkInLatitude.toFixed(5)}, ${record.checkInLongitude.toFixed(5)}`}
                    </Text>
                </TouchableOpacity>
            )}

            {/* Verification Photos Card (Revamped - In Right Panel) */}
            {(record.checkInPhotoUrl || record.checkOutPhotoUrl) && (
                <View style={[s.photosCard, { backgroundColor: cardBgColor, borderColor, borderWidth: isDark ? 0.5 : 1 }]}>
                    <View style={s.locationCardHeader}>
                        <Ionicons name="camera-outline" size={18} color={textColor} style={{ marginRight: 6 }} />
                        <Text style={[s.photosCardTitle, { color: textColor }]}>Verification Photos</Text>
                    </View>

                    {/* Side-by-Side Verification Photos */}
                    <View style={s.photosRow}>
                        {record.checkInPhotoUrl ? (
                            <View style={s.photoItem}>
                                <TouchableOpacity 
                                    onPress={() => handleThumbnailClick('in', record.checkInPhotoUrl)} 
                                    style={[
                                        s.photoThumbnailWrapper,
                                        activeExpandedPhoto === 'in' && s.photoThumbnailWrapperActive
                                    ]}
                                    activeOpacity={0.85}
                                >
                                    <Image source={{ uri: record.checkInPhotoUrl }} style={s.photoImage} resizeMode="cover" />
                                </TouchableOpacity>
                                <Text style={[s.photoCaption, { color: subtextColor }]}>Clock In Photo</Text>
                            </View>
                        ) : null}

                        {record.checkOutPhotoUrl ? (
                            <View style={s.photoItem}>
                                <TouchableOpacity 
                                    onPress={() => handleThumbnailClick('out', record.checkOutPhotoUrl)} 
                                    style={[
                                        s.photoThumbnailWrapper,
                                        activeExpandedPhoto === 'out' && s.photoThumbnailWrapperActive
                                    ]}
                                    activeOpacity={0.85}
                                >
                                    <Image source={{ uri: record.checkOutPhotoUrl }} style={s.photoImage} resizeMode="cover" />
                                </TouchableOpacity>
                                <Text style={[s.photoCaption, { color: subtextColor }]}>Clock Out Photo</Text>
                            </View>
                        ) : null}
                    </View>
                </View>
            )}

            {/* Request Correction Button (Full Pill with Clock Color #0EA5E9) */}
            {isEligibleForCorrection && (
                <TouchableOpacity
                    style={s.requestCorrectionActionBtn}
                    onPress={() => {
                        setIsRequestingCorrection(true);
                        onRequestCorrection?.(record);
                    }}
                    activeOpacity={0.8}
                >
                    <Ionicons name="pencil" size={15} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={s.requestCorrectionActionBtnText}>
                        {record.clockIn ? 'Request Attendance Correction' : 'Request Attendance Entry'}
                    </Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const s = StyleSheet.create({
    container: {
        flex: 1,
        gap: 14,
    },
    // Top Page Header
    topHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 2,
    },
    topHeaderLeft: {
        gap: 2,
    },
    topHeaderTitle: {
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    topHeaderPeriodSubtitle: {
        fontSize: 13,
        fontWeight: '500',
    },
    exportHeaderBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 13,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
    },
    exportHeaderBtnText: {
        fontSize: 12,
        fontWeight: '600',
    },
    // Banner (clean & subdued)
    bannerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        gap: 10,
    },
    bannerIconWrapper: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    bannerTextCol: {
        flex: 1,
    },
    bannerTitle: {
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 1,
    },
    bannerSubtitle: {
        fontSize: 12,
        lineHeight: 16,
    },
    // Overview Cards Row
    overviewCardsRow: {
        flexDirection: 'row',
        gap: 10,
    },
    overviewCard: {
        flex: 1,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        justifyContent: 'space-between',
        minHeight: 84,
    },
    ovCardLabel: {
        fontSize: 11,
        fontWeight: '600',
    },
    ovCardValRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 2,
        marginTop: 3,
    },
    ovCardVal: {
        fontSize: 19,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    ovCardValSub: {
        fontSize: 11,
        fontWeight: '600',
    },
    ovCardFootnote: {
        fontSize: 10,
        marginTop: 3,
    },
    qualityBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 5,
        alignSelf: 'flex-start',
        marginTop: 3,
    },
    qualityBadgeText: {
        fontSize: 9.5,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    scoreValRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginTop: 3,
    },
    deltaPill: {
        backgroundColor: 'rgba(52, 199, 89, 0.12)',
        paddingHorizontal: 4,
        paddingVertical: 1.5,
        borderRadius: 8,
    },
    deltaText: {
        fontSize: 8.5,
        fontWeight: '700',
        color: '#34C759',
    },
    // Table (5 columns)
    tableWrapper: {
        borderRadius: 12,
        borderWidth: 1,
        overflow: 'hidden',
    },
    tableSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
    },
    tableSectionDateText: {
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    groupCountText: {
        fontSize: 11.5,
        fontWeight: '600',
    },
    memberNameText: {
        fontSize: 13,
        fontWeight: '700',
    },
    tableHeaderRow: {
        flexDirection: 'row',
        paddingVertical: 9,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        alignItems: 'center',
    },
    thCell: {
        fontSize: 11,
        fontWeight: '700',
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 11,
        paddingHorizontal: 16,
        alignItems: 'center',
    },
    tdCell: {
        justifyContent: 'center',
    },
    // Balanced 5 Columns
    colDate: { flex: 1.4 },
    colClockIn: { flex: 1.3 },
    colClockOut: { flex: 1.3 },
    colHours: { flex: 1.1 },
    colStatus: { flex: 1.2, alignItems: 'flex-start' },

    // Team Member Summary Table Columns (8 Columns)
    colSumMember: { flex: 2.4, justifyContent: 'center' },
    colSumPresent: { flex: 0.9, justifyContent: 'center' },
    colSumAbsent: { flex: 0.8, justifyContent: 'center' },
    colSumLate: { flex: 0.8, justifyContent: 'center' },
    colSumLeaveSick: { flex: 1.1, justifyContent: 'center' },
    colSumWorkHours: { flex: 1.2, justifyContent: 'center' },
    colSumOvertime: { flex: 1.0, justifyContent: 'center' },
    colSumScore: { flex: 0.9, justifyContent: 'center', alignItems: 'flex-start' },

    sumCellVal: {
        fontSize: 12.5,
        fontWeight: '600',
        fontVariant: ['tabular-nums'],
    },
    sumScorePill: {
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 8,
    },
    sumScoreText: {
        fontSize: 11,
        fontWeight: '700',
        fontVariant: ['tabular-nums'],
    },

    dateMainText: {
        fontSize: 13,
        fontWeight: '600',
    },
    dateSubNote: {
        fontSize: 10,
        fontStyle: 'italic',
        marginTop: 2,
    },
    timeLocBlock: {
        gap: 2,
    },
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    timeText: {
        fontSize: 13,
        fontWeight: '700',
        fontVariant: ['tabular-nums'],
    },
    cameraInlineBadge: {
        marginLeft: 4,
        padding: 2,
    },
    locInlineRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    locInlineText: {
        fontSize: 11,
        fontWeight: '500',
    },
    dashText: {
        fontSize: 13,
    },
    hoursBlock: {
        gap: 2,
    },
    durationText: {
        fontSize: 12.5,
        fontWeight: '600',
        fontVariant: ['tabular-nums'],
    },
    overtimeSubText: {
        fontSize: 10,
        fontWeight: '600',
        fontVariant: ['tabular-nums'],
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
    },
    statusBadgeText: {
        fontSize: 10.5,
        fontWeight: '700',
    },
    emptyTableWrapper: {
        padding: 36,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    emptyTableText: {
        fontSize: 13,
    },

    // Back Pill
    backPill: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 2,
    },
    backPillText: {
        fontSize: 12,
        fontWeight: '600',
    },

    // Detail Specific
    headerCard: {
        padding: 16,
        borderRadius: 14,
        borderWidth: 1,
        gap: 10,
    },
    headerTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    headerTitleCol: {
        gap: 2,
    },
    headerDayText: {
        fontSize: 20,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    headerFullDate: {
        fontSize: 12.5,
    },
    headerLocPillsRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 2,
    },
    headerLocationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(142, 142, 147, 0.08)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        alignSelf: 'flex-start',
    },
    headerLocationText: {
        fontSize: 11,
        fontWeight: '600',
    },
    statusBigBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusBigText: {
        fontSize: 11.5,
        fontWeight: '700',
    },
    correctionBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: 8,
    },
    correctionBannerTitle: {
        fontSize: 11.5,
        fontWeight: '700',
    },
    correctionBannerSub: {
        fontSize: 10.5,
        marginTop: 2,
    },
    notesBox: {
        padding: 10,
        borderRadius: 8,
        gap: 2,
    },
    notesBoxLabel: {
        fontSize: 8.5,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    notesBoxText: {
        fontSize: 11.5,
        lineHeight: 15,
    },
    metricsRow: {
        flexDirection: 'row',
        gap: 8,
    },
    metricCard: {
        flex: 1,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        gap: 4,
    },
    metricLabel: {
        fontSize: 10.5,
        fontWeight: '600',
    },
    metricValue: {
        fontSize: 14,
        fontWeight: '800',
    },
    locationCard: {
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        gap: 5,
    },
    locationCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '700',
    },
    coordsText: {
        fontSize: 12,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    addressText: {
        fontSize: 10.5,
    },
    photosCard: {
        padding: 20,
        borderRadius: 20,
        borderWidth: 1,
        gap: 16,
    },
    photosCardTitle: {
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    // Full-Panel Photo Proof Styles
    photoProofNavRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 2,
    },
    photoTogglePill: {
        flexDirection: 'row',
        padding: 3,
        borderRadius: 20,
        borderWidth: 1,
        gap: 3,
    },
    photoToggleBtn: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 16,
    },
    photoToggleText: {
        fontSize: 12,
    },
    fullPhotoCard: {
        borderRadius: 20,
        borderWidth: 1,
        overflow: 'hidden',
        minHeight: 520,
    },
    fullPhotoHeader: {
        paddingHorizontal: 18,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(142, 142, 147, 0.12)',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    fullPhotoTitle: {
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    fullPhotoSubtitle: {
        fontSize: 12.5,
        marginTop: 2,
    },
    fullPhotoContainer: {
        width: '100%',
        minHeight: 460,
        backgroundColor: '#000000',
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullPhotoImage: {
        width: '100%',
        height: 460,
    },
    fullPhotoWatermarkOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: 'rgba(0,0,0,0.65)',
    },
    fullPhotoWatermarkLeft: {
        gap: 2,
    },
    fullPhotoWatermarkTitle: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
    fullPhotoWatermarkSub: {
        color: 'rgba(255,255,255,0.75)',
        fontSize: 11.5,
    },
    fullPhotoWatermarkBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    fullPhotoWatermarkBadgeText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '600',
    },
    photosRow: {
        flexDirection: 'row',
        gap: 16,
    },
    photoItem: {
        gap: 8,
        alignItems: 'center',
    },
    photoThumbnailWrapper: {
        width: 136,
        height: 136,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: 'rgba(142, 142, 147, 0.08)',
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.06)',
    },
    photoThumbnailWrapperActive: {
        borderWidth: 2.5,
        borderColor: '#0EA5E9',
    },
    photoImage: {
        width: '100%',
        height: '100%',
    },
    photoCaption: {
        fontSize: 13,
        fontWeight: '600',
    },
    requestCorrectionActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0EA5E9',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 28,
        marginTop: 8,
        shadowColor: '#0EA5E9',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.18,
        shadowRadius: 6,
        elevation: 3,
    },
    requestCorrectionActionBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
    // Embedded Form Styles
    formCard: {
        padding: 20,
        borderRadius: 20,
        gap: 18,
    },
    formHeader: {
        gap: 4,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(142, 142, 147, 0.1)',
        paddingBottom: 12,
    },
    formTitle: {
        fontSize: 20,
        fontWeight: '800',
        letterSpacing: -0.4,
    },
    formSubtitle: {
        fontSize: 13,
        fontWeight: '500',
    },
    formSection: {
        gap: 8,
    },
    formSectionLabel: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    fieldPillRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    fieldPill: {
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 18,
        borderWidth: 1,
    },
    fieldPillText: {
        fontSize: 12,
    },
    currentValueBox: {
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    currentValueLabel: {
        fontSize: 12,
        fontWeight: '500',
    },
    currentValueText: {
        fontSize: 13,
        fontWeight: '700',
    },
    textInput: {
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 14,
    },
    multilineInput: {
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 13,
        minHeight: 80,
        textAlignVertical: 'top',
    },
    optionList: {
        gap: 8,
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    optionText: {
        fontSize: 13,
    },
    attachButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderStyle: 'dashed',
    },
    attachButtonText: {
        fontSize: 13,
        fontWeight: '600',
    },
    evidencePreviewWrapper: {
        position: 'relative',
        width: 80,
        height: 80,
        borderRadius: 10,
        overflow: 'hidden',
        marginTop: 8,
    },
    evidenceThumbnail: {
        width: '100%',
        height: '100%',
    },
    evidenceRemoveBtn: {
        position: 'absolute',
        top: 4,
        right: 4,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: 'rgba(0,0,0,0.6)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitCorrectionBtn: {
        backgroundColor: '#0EA5E9',
        paddingVertical: 14,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 6,
        shadowColor: '#0EA5E9',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 3,
    },
    submitCorrectionBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
});
