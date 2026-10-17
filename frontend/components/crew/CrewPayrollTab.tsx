import { PillButton } from '@/components/ui/PillButton';
import { DESKTOP_PANEL_HEADER, DESKTOP_PANEL_TITLE, DESKTOP_PANEL_ACTION } from '@/constants/desktopLayout';
import React, { useState, useMemo, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ScrollView,
    Modal,
    Platform,
    TextInput,
    Alert,
    KeyboardAvoidingView,
    Dimensions,
    useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/theme';
import { CrewMember, DailyLog, CrewRequest, Project, INITIAL_PROJECTS, CrewRole, CREW_ROLE_LABELS, matchProjectCode } from './mockData';
import { HOLIDAYS_2026 } from '@/lib/constants/holidays';
import * as FileSystem from 'expo-file-system/legacy';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');


import { SearchablePicker } from '@/components/ui/SearchablePicker';
import { SwiftUIAdjustmentSheet } from './SwiftUIAdjustmentSheet';

// Safe lazy loading of expo-print and expo-sharing
let Print: any = null;
let Sharing: any = null;
try {
    Print = require('expo-print');
    Sharing = require('expo-sharing');
} catch (e) {
    // handled
}

interface CrewPayrollTabProps {
    crewMembers: CrewMember[];
    dailyLogs: DailyLog[];
    requests: CrewRequest[];
    projects?: Project[];
    onViewDocument?: (html: string, title: string) => void;
    onExportRegister?: (exportFn: () => void) => void;
    detailContainer?: HTMLElement | null;
    selectedCrewId?: string | null;
    onSelectCrew?: (id: string | null) => void;
    weeklyStartDate: string;
    onWeeklyStartDateChange: (date: string) => void;
}

const addDays = (dateStr: string, days: number): string => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    date.setUTCDate(date.getUTCDate() + days);
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const addMonths = (dateStr: string, months: number): string => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1 + months, 1));
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};


const formatWeekRange = (startStr: string, endStr: string): string => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const [sYear, sMonth, sDay] = startStr.split('-').map(Number);
    const [eYear, eMonth, eDay] = endStr.split('-').map(Number);
    const startMonthName = months[sMonth - 1];
    const endMonthName = months[eMonth - 1];
    if (sMonth === eMonth) {
        return `${sDay} - ${eDay} ${startMonthName}`;
    } else {
        return `${sDay} ${startMonthName} - ${eDay} ${endMonthName}`;
    }
};

const formatWeekRangeCompact = (startStr: string, endStr: string): string => {
    const [sYear, sMonth, sDay] = startStr.split('-').map(Number);
    const [eYear, eMonth, eDay] = endStr.split('-').map(Number);
    const sDayStr = String(sDay).padStart(2, '0');
    const sMonthStr = String(sMonth).padStart(2, '0');
    const eDayStr = String(eDay).padStart(2, '0');
    const eMonthStr = String(eMonth).padStart(2, '0');
    return `${sDayStr}/${sMonthStr}-${eDayStr}/${eMonthStr}`;
};

const formatMonthRange = (startStr: string): string => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const [year, month] = startStr.split('-').map(Number);
    const monthName = months[month - 1];
    const lastDay = new Date(year, month, 0).getDate();
    return `${monthName} 1-${lastDay}`;
};

// Timezone-safe holiday and Sunday check
const isHolidayDate = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const date = new Date(year, month, day);
        if (date.getDay() === 0) return true;
    }
    return HOLIDAYS_2026.some(h => h.date === dateStr);
};

export function CrewPayrollTab({
    crewMembers,
    dailyLogs,
    requests,
    projects = INITIAL_PROJECTS,
    onViewDocument,
    onExportRegister,
    weeklyStartDate,
    onWeeklyStartDateChange,
    detailContainer,
    selectedCrewId,
    onSelectCrew,
}: CrewPayrollTabProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';

    const period = 'WEEKLY';
    const [selectedProjectCode, setSelectedProjectCode] = useState<string>('ALL');
    const [showProjectPicker, setShowProjectPicker] = useState(false);

    const { width: screenWidth } = useWindowDimensions();
    const isCompact = screenWidth < 360;

    const weeklyEndDate = useMemo(() => addDays(weeklyStartDate, 6), [weeklyStartDate]);
    const [expandedCrewId, setExpandedCrewId] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [showSearch, setShowSearch] = useState(false);

    const projectItems = useMemo(() => {
        return [
            { id: 'ALL', label: 'All Projects', sublabel: 'ALL' },
            ...projects.map(p => ({
                id: p.code,
                label: p.name,
                sublabel: p.code.split('-')[1] || p.code,
            })),
        ];
    }, [projects]);

    const projectPillLabel = selectedProjectCode === 'ALL'
        ? (isCompact ? 'All' : 'All Projects')
        : (() => {
            const proj = projects.find(p => p.code === selectedProjectCode);
            return proj ? (proj.code.split('-')[1] || proj.code) : selectedProjectCode;
        })();

    // Track adjustments: { [crewId]: { amount: number, reason: string, proofName: string, proofUrl: string } }
    const [adjustments, setAdjustments] = useState<Record<string, { amount: number; reason: string; proofName: string; proofUrl: string }>>({});

    // Adjustment sheet visibility
    const [adjustmentModalVisible, setAdjustmentModalVisible] = useState(false);
    const [selectedCrewForAdjustment, setSelectedCrewForAdjustment] = useState<CrewMember | null>(null);

    // Calculate payroll details for a member
    const calculateMemberPayroll = (member: CrewMember) => {
        const logs = dailyLogs.filter(log => {
            if (log.crewId !== member.id) return false;
            if (selectedProjectCode !== 'ALL' && !matchProjectCode(log.projectCode, selectedProjectCode)) return false;
            return log.date >= weeklyStartDate && log.date <= weeklyEndDate;
        });

        const memberRequests = requests.filter(req => {
            if (req.crewId !== member.id || req.status !== 'APPROVED') return false;
            if (selectedProjectCode !== 'ALL' && (!req.projectCode || !matchProjectCode(req.projectCode, selectedProjectCode))) return false;
            return req.startDate >= weeklyStartDate && req.startDate <= weeklyEndDate;
        });

        let basePay = 0;
        let holidayPay = 0;
        let otPay = 0;
        let totalHours = 0;
        let otHours = 0;
        let daysWorked = 0;
        let holidayDaysWorked = 0;

        logs.forEach(log => {
            const isHoliday = isHolidayDate(log.date);
            const rate = isHoliday ? member.overtimeDailyRate : member.baseDailyRate;

            if (log.status === 'PRESENT') {
                if (isHoliday) {
                    holidayPay += rate;
                    holidayDaysWorked += 1;
                } else {
                    basePay += rate;
                    daysWorked += 1;
                }
            } else if (log.status === 'HALF_DAY') {
                if (isHoliday) {
                    holidayPay += rate * 0.5;
                    holidayDaysWorked += 0.5;
                } else {
                    basePay += rate * 0.5;
                    daysWorked += 0.5;
                }
            }

            otPay += (log.ot1Hours * member.otRate1) +
                     (log.ot2Hours * member.otRate2) +
                     (log.ot3Hours * member.otRate3);

            totalHours += log.regularHours + log.ot1Hours + log.ot2Hours + log.ot3Hours;
            otHours += log.ot1Hours + log.ot2Hours + log.ot3Hours;
        });

        let kasbon = 0;
        let reimburse = 0;

        memberRequests.forEach(req => {
            if (req.type === 'KASBON') {
                kasbon += req.amount || 0;
            } else if (req.type === 'REIMBURSE') {
                reimburse += req.amount || 0;
            }
        });

        const adj = adjustments[member.id] || { amount: 0, reason: '', proofName: '', proofUrl: '' };
        const netPayout = basePay + holidayPay + otPay + reimburse - kasbon + adj.amount;

        return {
            basePay,
            holidayPay,
            otPay,
            kasbon,
            reimburse,
            adjustment: adj.amount,
            adjustmentReason: adj.reason,
            adjustmentProofName: adj.proofName,
            adjustmentProofUrl: adj.proofUrl,
            netPayout,
            totalHours,
            otHours,
            daysWorked,
            holidayDaysWorked,
        };
    };

    // Filter crew list: show crew members who are currently assigned to this project,
    // or who have daily logs/requests on this project in the selected period.
    const activeProjectCrew = useMemo(() => {
        return crewMembers.filter(member => {
            // 1. If currently assigned to the project and active
            if (member.status === 'ACTIVE' && member.projectCode) {
                if (selectedProjectCode === 'ALL' || matchProjectCode(member.projectCode, selectedProjectCode)) {
                    return true;
                }
            }

            // Define selected period date range
            const startDate = weeklyStartDate;
            const endDate = weeklyEndDate;

            // 2. Has daily logs on the selected project in this period
            const hasLogs = dailyLogs.some(log => {
                if (log.crewId !== member.id) return false;
                if (log.date < startDate || log.date > endDate) return false;
                if (selectedProjectCode !== 'ALL' && !matchProjectCode(log.projectCode, selectedProjectCode)) return false;
                return true;
            });
            if (hasLogs) return true;

            // 3. Has approved requests on the selected project in this period
            const hasRequests = requests.some(req => {
                if (req.crewId !== member.id || req.status !== 'APPROVED') return false;
                if (req.startDate < startDate || req.startDate > endDate) return false;
                if (selectedProjectCode !== 'ALL' && (!req.projectCode || !matchProjectCode(req.projectCode, selectedProjectCode))) return false;
                return true;
            });
            if (hasRequests) return true;

            return false;
        });
    }, [crewMembers, selectedProjectCode, weeklyStartDate, weeklyEndDate, dailyLogs, requests]);

    const payrollList = useMemo(() => {
        return activeProjectCrew
            .filter(member => {
                if (!search) return true;
                return member.name.toLowerCase().includes(search.toLowerCase()) ||
                    (CREW_ROLE_LABELS[member.role as CrewRole] || member.role).toLowerCase().includes(search.toLowerCase());
            })
            .map(member => ({
                member,
                payroll: calculateMemberPayroll(member),
            }))
            .sort((a, b) => a.member.name.localeCompare(b.member.name));
    }, [activeProjectCrew, period, selectedProjectCode, dailyLogs, requests, adjustments, search]);

    // Totals calculations
    const totals = useMemo(() => {
        let basePay = 0;
        let otPay = 0;
        let kasbon = 0;
        let reimburse = 0;
        let netPayout = 0;
        let otHours = 0;

        payrollList.forEach(item => {
            basePay += item.payroll.basePay + item.payroll.holidayPay;
            otPay += item.payroll.otPay;
            kasbon += item.payroll.kasbon;
            reimburse += item.payroll.reimburse;
            netPayout += item.payroll.netPayout;
            otHours += item.payroll.otHours;
        });

        return { basePay, otPay, kasbon, reimburse, netPayout, otHours };
    }, [payrollList]);

    const formatCurrency = (val: number) => {
        return `Rp ${val.toLocaleString('id-ID')}`;
    };

    const handleExport = async () => {
        if (!Print || !Sharing) {
            Alert.alert('Error', 'Export module is not available on this device.');
            return;
        }
        try {
            const rowsHtml = payrollList.map(({ member, payroll }) => `
                <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">${member.name}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd;">${CREW_ROLE_LABELS[member.role as CrewRole] || member.role}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">Rp ${(payroll.basePay + payroll.holidayPay).toLocaleString('id-ID')}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">Rp ${payroll.otPay.toLocaleString('id-ID')}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right; color: #34C759;">+Rp ${payroll.reimburse.toLocaleString('id-ID')}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right; color: #FF3B30;">-Rp ${payroll.kasbon.toLocaleString('id-ID')}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right; color: ${payroll.adjustment >= 0 ? '#34C759' : '#FF3B30'};">${payroll.adjustment >= 0 ? '+' : ''}Rp ${payroll.adjustment.toLocaleString('id-ID')}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right; font-weight: bold; color: #34C759;">Rp ${payroll.netPayout.toLocaleString('id-ID')}</td>
                </tr>
            `).join('');

            const htmlContent = `
                <html>
                    <head>
                        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
                        <style>
                            body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 25px; color: #333; }
                            h2 { color: #007AFF; text-align: center; margin-bottom: 5px; }
                            .period { text-align: center; color: #666; font-size: 14px; margin-bottom: 25px; }
                            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
                            th { background-color: #007AFF; color: white; padding: 10px; text-align: left; }
                            td { padding: 10px; }
                        </style>
                    </head>
                    <body>
                        <h2>PT MAHARDIKA ADIDAYA - LAPORAN PAYROLL</h2>
                        <div class="period">
                            Periode: ${period === 'WEEKLY' ? `${formatWeekRange(weeklyStartDate, weeklyEndDate)} (Mingguan)` : `${formatMonthRange(weeklyStartDate)} (Bulanan)`} | Proyek: ${selectedProjectCode === 'ALL' ? 'Semua Proyek' : selectedProjectCode}
                        </div>
                        <table>
                            <thead>
                                <tr>
                                    <th>Nama</th>
                                    <th>Jabatan</th>
                                    <th style="text-align: right;">Gaji Pokok/Libur</th>
                                    <th style="text-align: right;">Lembur (OT)</th>
                                    <th style="text-align: right;">Reimburse</th>
                                    <th style="text-align: right;">Kasbon</th>
                                    <th style="text-align: right;">Adjustment</th>
                                    <th style="text-align: right;">Net Payout</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rowsHtml}
                                <tr style="font-weight: bold; background-color: #f2f2f7;">
                                    <td colspan="2" style="padding: 10px; border-top: 2px solid #007AFF;">TOTAL</td>
                                    <td style="padding: 10px; text-align: right; border-top: 2px solid #007AFF;">Rp ${totals.basePay.toLocaleString('id-ID')}</td>
                                    <td style="padding: 10px; text-align: right; border-top: 2px solid #007AFF;">Rp ${totals.otPay.toLocaleString('id-ID')}</td>
                                    <td style="padding: 10px; text-align: right; border-top: 2px solid #007AFF; color: #34C759;">+Rp ${totals.reimburse.toLocaleString('id-ID')}</td>
                                    <td style="padding: 10px; text-align: right; border-top: 2px solid #007AFF; color: #FF3B30;">-Rp ${totals.kasbon.toLocaleString('id-ID')}</td>
                                    <td style="padding: 10px; text-align: right; border-top: 2px solid #007AFF; color: #007AFF;">Rp ${Object.values(adjustments).reduce((sum, item) => sum + item.amount, 0).toLocaleString('id-ID')}</td>
                                    <td style="padding: 10px; text-align: right; border-top: 2px solid #007AFF; color: #34C759;">Rp ${totals.netPayout.toLocaleString('id-ID')}</td>
                                </tr>
                            </tbody>
                        </table>
                    </body>
                </html>
            `;
            const projectCodePart = selectedProjectCode === 'ALL' ? 'ALL' : (selectedProjectCode.split('-')[1] || selectedProjectCode);
            const now = new Date();
            const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
            const filename = `${projectCodePart}_Crew_Payroll_${dateStr}.pdf`;

            if (onViewDocument) {
                onViewDocument(htmlContent, filename.replace('.pdf', ''));
                return;
            }

            const { uri } = await Print.printToFileAsync({ html: htmlContent });
            const customUri = `${FileSystem.cacheDirectory}${filename}`;

            // Rename by copying to local cache path with custom filename
            await FileSystem.copyAsync({ from: uri, to: customUri });

            await Sharing.shareAsync(customUri, { mimeType: 'application/pdf', dialogTitle: `Payroll_Report_${period}` });
        } catch (error) {
            console.error('Error exporting payroll summary:', error);
            Alert.alert('Error', 'Failed to export payroll report PDF.');
        }
    };

    useEffect(() => {
        if (onExportRegister) {
            onExportRegister(handleExport);
        }
    }, [payrollList, period, selectedProjectCode, onExportRegister]);

    const handleExportSlip = async (member: CrewMember, payroll: ReturnType<typeof calculateMemberPayroll>) => {
        if (!Print || !Sharing) {
            Alert.alert('Error', 'Export module is not available on this device.');
            return;
        }
        try {
            const htmlContent = `
                <html>
                    <head>
                        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
                        <style>
                            body {
                                font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                                padding: 30px;
                                color: #333;
                                background-color: #fff;
                            }
                            .header {
                                text-align: center;
                                border-bottom: 2px solid #007AFF;
                                padding-bottom: 15px;
                                margin-bottom: 25px;
                            }
                            .logo {
                                font-size: 24px;
                                font-weight: 800;
                                color: #007AFF;
                                letter-spacing: 1px;
                            }
                            .title {
                                font-size: 16px;
                                font-weight: 600;
                                color: #666;
                                margin-top: 5px;
                            }
                            .meta-table {
                                width: 100%;
                                margin-bottom: 25px;
                                font-size: 13px;
                            }
                            .meta-table td {
                                padding: 4px 0;
                            }
                            .meta-label {
                                color: #8E8E93;
                                width: 35%;
                            }
                            .meta-val {
                                font-weight: 600;
                            }
                            .section-title {
                                font-size: 14px;
                                font-weight: 800;
                                border-bottom: 1px solid #E5E5EA;
                                padding-bottom: 5px;
                                margin-bottom: 12px;
                                text-transform: uppercase;
                                color: #1C1C1E;
                                letter-spacing: 0.5px;
                            }
                            .item-row {
                                display: flex;
                                justify-content: space-between;
                                padding: 8px 0;
                                font-size: 13px;
                                border-bottom: 1px dotted #F2F2F7;
                            }
                            .item-label {
                                color: #48484A;
                            }
                            .item-value {
                                font-weight: 600;
                            }
                            .item-value.positive {
                                color: #34C759;
                            }
                            .item-value.negative {
                                color: #FF3B30;
                            }
                            .total-row {
                                display: flex;
                                justify-content: space-between;
                                padding: 15px 0;
                                font-size: 16px;
                                font-weight: 800;
                                border-top: 2px solid #007AFF;
                                margin-top: 15px;
                            }
                            .total-label {
                                color: #007AFF;
                            }
                            .total-value {
                                color: #34C759;
                            }
                            .footer {
                                margin-top: 40px;
                                text-align: center;
                                font-size: 11px;
                                color: #8E8E93;
                                border-top: 1px solid #E5E5EA;
                                padding-top: 15px;
                            }
                            .notes {
                                background: #F2F2F7;
                                border-radius: 8px;
                                padding: 10px;
                                margin-top: 15px;
                                font-size: 12px;
                            }
                            .notes-title {
                                font-weight: bold;
                                margin-bottom: 4px;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <div class="logo">PT MAHARDIKA ADIDAYA</div>
                            <div class="title">Crew Salary Slip</div>
                        </div>

                        <table class="meta-table">
                            <tr>
                                <td class="meta-label">Nama Pekerja</td>
                                <td class="meta-val">${member.name}</td>
                            </tr>
                            <tr>
                                <td class="meta-label">Jabatan/Peran</td>
                                <td class="meta-val">${CREW_ROLE_LABELS[member.role as CrewRole] || member.role}</td>
                            </tr>
                            <tr>
                                <td class="meta-label">Periode</td>
                                <td class="meta-val">${period === 'WEEKLY' ? `${formatWeekRange(weeklyStartDate, weeklyEndDate)} (Mingguan)` : `${formatMonthRange(weeklyStartDate)} (Bulanan)`}</td>
                            </tr>
                            <tr>
                                <td class="meta-label">Proyek</td>
                                <td class="meta-val">${selectedProjectCode === 'ALL' ? 'Semua Proyek' : selectedProjectCode}</td>
                            </tr>
                        </table>

                        <div class="section-title">Rincian Pendapatan (Earnings)</div>
                        <div class="item-row">
                            <div class="item-label">Gaji Pokok (Base Earnings) - ${payroll.daysWorked} hari</div>
                            <div class="item-value">Rp ${payroll.basePay.toLocaleString('id-ID')}</div>
                        </div>
                        <div class="item-row">
                            <div class="item-label">Gaji Lembur Hari Libur/Minggu - ${payroll.holidayDaysWorked} hari</div>
                            <div class="item-value">Rp ${payroll.holidayPay.toLocaleString('id-ID')}</div>
                        </div>
                        <div class="item-row">
                            <div class="item-label">Lembur Overtime (OT1-OT3) - ${payroll.otHours} jam</div>
                            <div class="item-value">Rp ${payroll.otPay.toLocaleString('id-ID')}</div>
                        </div>
                        <div class="item-row">
                            <div class="item-label">Penggantian Biaya (Reimbursement)</div>
                            <div class="item-value positive">+Rp ${payroll.reimburse.toLocaleString('id-ID')}</div>
                        </div>
                        <div class="item-row">
                            <div class="item-label">Deduction Kasbon (Cash Advance)</div>
                            <div class="item-value negative">-Rp ${payroll.kasbon.toLocaleString('id-ID')}</div>
                        </div>
                        <div class="item-row">
                            <div class="item-label">Manual Adjustment</div>
                            <div class="item-value ${payroll.adjustment >= 0 ? 'positive' : 'negative'}">
                                ${payroll.adjustment >= 0 ? '+' : ''}Rp ${payroll.adjustment.toLocaleString('id-ID')}
                            </div>
                        </div>

                        ${payroll.adjustmentReason ? `
                            <div class="notes">
                                <div class="notes-title">Catatan/Alasan Adjustment:</div>
                                <div>${payroll.adjustmentReason}</div>
                                ${payroll.adjustmentProofName ? `<div style="margin-top: 4px; font-style: italic; color: #555;">Bukti terlampir: ${payroll.adjustmentProofName}</div>` : ''}
                            </div>
                        ` : ''}

                        <div class="total-row">
                            <div class="total-label">Total Payout (Netto)</div>
                            <div class="total-value">Rp ${payroll.netPayout.toLocaleString('id-ID')}</div>
                        </div>

                        <div class="footer">
                            Slip gaji ini dibuat secara otomatis oleh Sistem Payroll PT Mahardika Adidaya.<br/>
                            Dicetak pada: ${new Date().toLocaleString('id-ID')}
                        </div>
                    </body>
                </html>
            `;
            const projectCodePart = selectedProjectCode === 'ALL' ? 'ALL' : (selectedProjectCode.split('-')[1] || selectedProjectCode);
            const now = new Date();
            const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
            const cleanName = member.name.replace(/\s+/g, '_');
            const filename = `${projectCodePart}_Crew_Payroll_${dateStr}_${cleanName}.pdf`;

            if (onViewDocument) {
                onViewDocument(htmlContent, filename.replace('.pdf', ''));
                return;
            }

            const { uri } = await Print.printToFileAsync({ html: htmlContent });
            const customUri = `${FileSystem.cacheDirectory}${filename}`;

            // Rename by copying to local cache path with custom filename
            await FileSystem.copyAsync({ from: uri, to: customUri });

            await Sharing.shareAsync(customUri, { mimeType: 'application/pdf', dialogTitle: `Slip_${member.name.replace(/\s+/g, '_')}` });
        } catch (error) {
            console.error('Error exporting slip:', error);
            Alert.alert('Error', 'Failed to export slip PDF.');
        }
    };

    const currentProjectName = useMemo(() => {
        if (selectedProjectCode === 'ALL') return 'All Projects';
        const proj = projects.find(p => p.code === selectedProjectCode);
        return proj ? `[${proj.code}] ${proj.name}` : selectedProjectCode;
    }, [projects, selectedProjectCode]);

    const getOpaqueColor = (hexColor: string, isDarkColor: boolean): string => {
        let cleanHex = hexColor.replace('#', '');
        if (cleanHex.length === 3) {
            cleanHex = cleanHex[0] + cleanHex[0] + cleanHex[1] + cleanHex[1] + cleanHex[2] + cleanHex[2];
        }
        const r = parseInt(cleanHex.substring(0, 2), 16);
        const g = parseInt(cleanHex.substring(2, 4), 16);
        const b = parseInt(cleanHex.substring(4, 6), 16);

        const alpha = isDarkColor ? 0.14 : 0.08;
        const bgR = isDarkColor ? 28 : 255;
        const bgG = isDarkColor ? 28 : 255;
        const bgB = isDarkColor ? 30 : 255;

        const blendedR = Math.round(alpha * r + (1 - alpha) * bgR);
        const blendedG = Math.round(alpha * g + (1 - alpha) * bgG);
        const blendedB = Math.round(alpha * b + (1 - alpha) * bgB);

        const hexR = blendedR.toString(16).padStart(2, '0');
        const hexG = blendedG.toString(16).padStart(2, '0');
        const hexB = blendedB.toString(16).padStart(2, '0');

        return `#${hexR}${hexG}${hexB}`;
    };

    const getCardBgColor = (iconColor: string) => {
        return Platform.OS === 'android'
            ? getOpaqueColor(iconColor, isDark)
            : iconColor + (isDark ? '25' : '15');
    };

    const getCardBorderColor = (iconColor: string) => {
        return Platform.OS === 'android' ? iconColor + '35' : iconColor + '30';
    };

    const cardBg = isDark ? '#1C1C1E' : '#FFF';
    const cardBorder = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
    const searchBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

    console.log('[CrewPayrollTab] Rendering top summary metrics row first...');
    const renderPayrollDetail = (member: CrewMember, payroll: ReturnType<typeof calculateMemberPayroll>, isPanel = false) => (<>
                                        <View style={[s.payoutDetails, isPanel && { paddingHorizontal: 20, paddingVertical: 6, gap: 0 }]}>
                                            <View style={[s.detailRow, isPanel && { minHeight: 50, paddingVertical: 14, gap: 20, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: cardBorder }]}>
                                                <Text style={[s.detailLabel, { color: subtextColor }, isPanel && { flex: 1, fontSize: 14, fontWeight: '400' }]}>Base Earnings ({payroll.daysWorked}d)</Text>
                                                <Text style={[s.detailValue, isPanel && { fontSize: 14, fontVariant: ['tabular-nums'] }, { color: textColor }]}>
                                                    {formatCurrency(payroll.basePay)}
                                                </Text>
                                            </View>
                                            <View style={[s.detailRow, isPanel && { minHeight: 50, paddingVertical: 14, gap: 20, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: cardBorder }]}>
                                                <Text style={[s.detailLabel, { color: subtextColor }, isPanel && { flex: 1, fontSize: 14, fontWeight: '400' }]}>Holiday Earnings ({payroll.holidayDaysWorked}d)</Text>
                                                <Text style={[s.detailValue, isPanel && { fontSize: 14, fontVariant: ['tabular-nums'] }, { color: textColor }]}>
                                                    {formatCurrency(payroll.holidayPay)}
                                                </Text>
                                            </View>
                                            <View style={[s.detailRow, isPanel && { minHeight: 50, paddingVertical: 14, gap: 20, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: cardBorder }]}>
                                                <Text style={[s.detailLabel, { color: subtextColor }, isPanel && { flex: 1, fontSize: 14, fontWeight: '400' }]}>Overtime ({payroll.otHours}h)</Text>
                                                <Text style={[s.detailValue, isPanel && { fontSize: 14, fontVariant: ['tabular-nums'] }, { color: textColor }]}>
                                                    {formatCurrency(payroll.otPay)}
                                                </Text>
                                            </View>
                                            <View style={[s.detailRow, isPanel && { minHeight: 50, paddingVertical: 14, gap: 20, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: cardBorder }]}>
                                                <Text style={[s.detailLabel, { color: subtextColor }, isPanel && { flex: 1, fontSize: 14, fontWeight: '400' }]}>Reimbursements</Text>
                                                <Text style={[s.detailValue, isPanel && { fontSize: 14, fontVariant: ['tabular-nums'] }, { color: isPanel && payroll.reimburse === 0 ? textColor : '#34C759' }]}>
                                                    {isPanel && payroll.reimburse === 0 ? '' : '+'}{formatCurrency(payroll.reimburse)}
                                                </Text>
                                            </View>
                                            <View style={[s.detailRow, isPanel && { minHeight: 50, paddingVertical: 14, gap: 20, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: cardBorder }]}>
                                                <Text style={[s.detailLabel, { color: subtextColor }, isPanel && { flex: 1, fontSize: 14, fontWeight: '400' }]}>Cash Advance (Kasbon)</Text>
                                                <Text style={[s.detailValue, isPanel && { fontSize: 14, fontVariant: ['tabular-nums'] }, { color: isPanel && payroll.kasbon === 0 ? textColor : '#FF3B30' }]}>
                                                    {isPanel && payroll.kasbon === 0 ? '' : '-'}{formatCurrency(payroll.kasbon)}
                                                </Text>
                                            </View>
                                            <View style={[s.detailRow, isPanel && { minHeight: 50, paddingVertical: 14, gap: 20, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: cardBorder }]}>
                                                <Text style={[s.detailLabel, { color: subtextColor }, isPanel && { flex: 1, fontSize: 14, fontWeight: '400' }]}>Adjustment</Text>
                                                <Text style={[s.detailValue, isPanel && { fontSize: 14, fontVariant: ['tabular-nums'] }, { color: isPanel && payroll.adjustment === 0 ? textColor : payroll.adjustment >= 0 ? '#34C759' : '#FF3B30' }]}>
                                                    {payroll.adjustment > 0 ? '+' : ''}{formatCurrency(payroll.adjustment)}
                                                </Text>
                                            </View>
                                            {payroll.adjustmentReason ? (
                                                <View style={s.adjustmentReasonContainer}>
                                                    <Ionicons name="information-circle-outline" size={12} color={subtextColor} />
                                                    <Text style={[s.adjustmentReasonText, { color: subtextColor }]}>
                                                        Reason: {payroll.adjustmentReason}
                                                    </Text>
                                                    {payroll.adjustmentProofName ? (
                                                        <Text style={[s.adjustmentProofText, { color: '#007AFF' }]} numberOfLines={1}>
                                                            📎 {payroll.adjustmentProofName}
                                                        </Text>
                                                    ) : null}
                                                </View>
                                            ) : null}
                                        </View>

                                        {/* Card Actions */}
                                        {!isPanel && <View style={s.cardActions}>
                                            <TouchableOpacity
                                                style={[s.adjustTextBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}
                                                onPress={() => {
                                                    setSelectedCrewForAdjustment(member);
                                                    setAdjustmentModalVisible(true);
                                                }}
                                                activeOpacity={0.7}
                                            >
                                                <Text style={[s.adjustTextBtnLabel, { color: isDark ? '#EBEBF5' : '#3C3C43' }]}>Adjust</Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={[s.slipBtn, { backgroundColor: isDark ? 'rgba(0,122,255,0.15)' : 'rgba(0,122,255,0.08)' }]}
                                                onPress={() => handleExportSlip(member, payroll)}
                                                activeOpacity={0.7}
                                            >
                                                <Ionicons name="document-text" size={14} color="#007AFF" />
                                                <Text style={s.slipBtnText}>Slip</Text>
                                            </TouchableOpacity>
                                        </View>}
                                    </>);
    const selectedPayroll = payrollList.find(item => item.member.id === selectedCrewId);
    useEffect(() => {
        if (onSelectCrew && selectedCrewId && !selectedPayroll) onSelectCrew(null);
    }, [onSelectCrew, selectedCrewId, selectedPayroll]);

    return (
        <View style={s.container}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginHorizontal: -20, marginBottom: 12 }}
                contentContainerStyle={s.metricsScroll}
            >
                {/* Card 1: Net Payout (Highlighted) */}
                <View style={[s.metricCard, { backgroundColor: getCardBgColor('#34C759'), borderColor: 'transparent', borderWidth: 0 }]}>
                    <View style={[s.metricIconContainer, { backgroundColor: 'rgba(52,199,89,0.15)' }]}>
                        <Ionicons name="cash" size={18} color="#34C759" />
                    </View>
                    <Text
                        style={[s.metricValue, { color: '#34C759' }]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.5}
                    >
                        {formatCurrency(totals.netPayout)}
                    </Text>
                    <Text style={[s.metricTitle, { color: '#34C759' }]} numberOfLines={1}>Net Payout</Text>
                </View>

                {/* Card 2: Base Pay */}
                <View style={[s.metricCard, { backgroundColor: getCardBgColor('#007AFF'), borderColor: 'transparent', borderWidth: 0 }]}>
                    <View style={[s.metricIconContainer, { backgroundColor: 'rgba(0,122,255,0.15)' }]}>
                        <Ionicons name="business" size={18} color="#007AFF" />
                    </View>
                    <Text
                        style={[s.metricValue, { color: '#007AFF' }]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.5}
                    >
                        {formatCurrency(totals.basePay)}
                    </Text>
                    <Text style={[s.metricTitle, { color: '#007AFF' }]} numberOfLines={1}>Base Pay</Text>
                </View>

                {/* Card 3: Overtime Pay */}
                <View style={[s.metricCard, { backgroundColor: getCardBgColor('#AF52DE'), borderColor: 'transparent', borderWidth: 0 }]}>
                    <View style={[s.metricIconContainer, { backgroundColor: 'rgba(175,82,222,0.15)' }]}>
                        <Ionicons name="time" size={18} color="#AF52DE" />
                    </View>
                    <Text
                        style={[s.metricValue, { color: '#AF52DE' }]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.5}
                    >
                        {formatCurrency(totals.otPay)}
                    </Text>
                    <Text style={[s.metricTitle, { color: '#AF52DE' }]} numberOfLines={1}>Overtime</Text>
                </View>

                {/* Card 4: Kasbon */}
                <View style={[s.metricCard, { backgroundColor: getCardBgColor('#FF3B30'), borderColor: 'transparent', borderWidth: 0 }]}>
                    <View style={[s.metricIconContainer, { backgroundColor: 'rgba(255,59,48,0.15)' }]}>
                        <Ionicons name="trending-down" size={18} color="#FF3B30" />
                    </View>
                    <Text
                        style={[s.metricValue, { color: '#FF3B30' }]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.5}
                    >
                        {formatCurrency(totals.kasbon)}
                    </Text>
                    <Text style={[s.metricTitle, { color: '#FF3B30' }]} numberOfLines={1}>Kasbon</Text>
                </View>

                {/* Card 5: Reimburse */}
                <View style={[s.metricCard, { backgroundColor: getCardBgColor('#34C759'), borderColor: 'transparent', borderWidth: 0 }]}>
                    <View style={[s.metricIconContainer, { backgroundColor: 'rgba(52,199,89,0.15)' }]}>
                        <Ionicons name="trending-up" size={18} color="#34C759" />
                    </View>
                    <Text
                        style={[s.metricValue, { color: '#34C759' }]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.5}
                    >
                        {formatCurrency(totals.reimburse)}
                    </Text>
                    <Text style={[s.metricTitle, { color: '#34C759' }]} numberOfLines={1}>Reimburse</Text>
                </View>
            </ScrollView>

            {/* Unified Control Row: side-by-side selectors and actions fitted to the screen width */}
            <View style={s.unifiedControlRow}>
                {/* Project Selection Dropdown */}
                <TouchableOpacity
                    style={[s.projectDropdownSide, { flex: 1, backgroundColor: cardBg, borderColor: searchBorder }]}
                    onPress={() => setShowProjectPicker(true)}
                    activeOpacity={0.7}
                >
                    <Text style={[s.projectDropdownText, { color: textColor }]} numberOfLines={1}>
                        {projectPillLabel}
                    </Text>
                    <Ionicons name="chevron-down" size={12} color={subtextColor} style={{ marginLeft: 4 }} />
                </TouchableOpacity>

                {/* Date Navigator */}
                <View style={[s.dateNavigatorPillSide, { minWidth: isCompact ? 120 : 140, backgroundColor: cardBg, borderColor: searchBorder }]}>
                    <TouchableOpacity
                        style={s.navArrow}
                        hitSlop={10}
                        onPress={() => {
                            onWeeklyStartDateChange(addDays(weeklyStartDate, -7));
                        }}
                    >
                        <Ionicons name="chevron-back" size={12} color={textColor} />
                    </TouchableOpacity>
                    <Text style={[s.dateTextCompact, { color: textColor }]} numberOfLines={1}>
                        {isCompact ? formatWeekRangeCompact(weeklyStartDate, weeklyEndDate) : formatWeekRange(weeklyStartDate, weeklyEndDate)}
                    </Text>
                    <TouchableOpacity
                        style={s.navArrow}
                        hitSlop={10}
                        onPress={() => {
                            onWeeklyStartDateChange(addDays(weeklyStartDate, 7));
                        }}
                    >
                        <Ionicons name="chevron-forward" size={12} color={textColor} />
                    </TouchableOpacity>
                </View>

                {/* Search icon button */}
                <TouchableOpacity
                    style={[
                        s.searchIconBtn,
                        {
                            backgroundColor: showSearch ? (isDark ? 'rgba(175,82,222,0.15)' : 'rgba(175,82,222,0.1)') : cardBg,
                            borderColor: showSearch ? '#AF52DE' : searchBorder,
                        }
                    ]}
                    onPress={() => {
                        setShowSearch(prev => !prev);
                        if (showSearch) setSearch('');
                    }}
                    activeOpacity={0.8}
                >
                    <Ionicons
                        name={showSearch ? 'close' : 'search-outline'}
                        size={16}
                        color={showSearch ? '#AF52DE' : textColor}
                    />
                </TouchableOpacity>
            </View>

            {/* Collapsible search bar */}
            {showSearch && (
                <View style={[s.searchBarRow, { backgroundColor: cardBg, borderColor: searchBorder }]}>
                    <Ionicons name="search-outline" size={15} color={subtextColor} style={{ marginRight: 8 }} />
                    <TextInput
                        autoFocus
                        style={[s.searchInput, { color: textColor, flex: 1 }]}
                        placeholder="Search crew by name, role..."
                        placeholderTextColor={subtextColor}
                        value={search}
                        onChangeText={setSearch}
                        autoCapitalize="none"
                        returnKeyType="search"
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch('')} style={{ padding: 4 }}>
                            <Ionicons name="close-circle" size={16} color={subtextColor} />
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {payrollList.length > 0 ? (
                <View style={s.list}>
                    {payrollList.map(({ member, payroll }) => {
                        const isExpanded = (onSelectCrew ? selectedCrewId : expandedCrewId) === member.id;
                        return (
                            <View key={member.id} style={[s.payoutCard, { backgroundColor: cardBg, borderColor: isExpanded ? '#8B5CF6' : cardBorder }]}>
                                <TouchableOpacity
                                    style={s.payoutHeader}
                                    onPress={() => onSelectCrew ? onSelectCrew(isExpanded ? null : member.id) : setExpandedCrewId(isExpanded ? null : member.id)}
                                    activeOpacity={0.7}
                                >
                                    <View style={s.crewInfo}>
                                        <View style={[s.avatar, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                                            <Text style={[s.avatarText, { color: textColor }]}>{member.initials}</Text>
                                        </View>
                                        <View>
                                            <Text style={[s.crewName, { color: textColor }]}>
                                                {member.name}
                                            </Text>
                                            <View style={s.metadataRow}>
                                                <Text style={[s.roleSubtext, { color: subtextColor }]}>
                                                    {CREW_ROLE_LABELS[member.role as CrewRole] || member.role}
                                                </Text>
                                                {member.projectCode && (
                                                    <View style={[s.projectBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
                                                        <Text style={[s.projectBadgeText, { color: subtextColor }]}>
                                                            {member.projectCode.split('-')[1] || member.projectCode}
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                    </View>
                                    <View style={s.payoutAmount}>
                                        <View style={s.payoutTextCol}>
                                            <Text
                                                style={[
                                                    s.netPayoutText,
                                                    {
                                                        color: payroll.netPayout === 0
                                                            ? textColor
                                                            : payroll.netPayout > 0
                                                                ? '#34C759'
                                                                : '#FF3B30'
                                                    }
                                                ]}
                                                numberOfLines={1}
                                                adjustsFontSizeToFit
                                                minimumFontScale={0.7}
                                            >
                                                {formatCurrency(payroll.netPayout)}
                                            </Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>

                                {/* Flat Receipt-style Details & Card Actions */}
                                {isExpanded && !onSelectCrew && renderPayrollDetail(member, payroll)}
                            </View>
                        );
                    })}
                </View>
            ) : (
                <View style={s.emptyState}>
                    <Ionicons name="cash-outline" size={48} color={subtextColor} style={{ opacity: 0.5 }} />
                    <Text style={[s.emptyText, { color: subtextColor }]}>No payroll data available</Text>
                </View>
            )}

            {Platform.OS === 'web' && detailContainer && selectedPayroll && require('react-dom').createPortal(
                <View style={{ flex: 1 }}>
                    <View style={[DESKTOP_PANEL_HEADER, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
                        <Text style={[DESKTOP_PANEL_TITLE, { flex: 1, color: textColor }]}>{selectedPayroll.member.name}</Text>
                        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close payroll details" onPress={() => onSelectCrew?.(null)} style={[DESKTOP_PANEL_ACTION, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                            <Ionicons name="close" size={24} color={textColor} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView contentContainerStyle={s.panelContent}>
                        <View style={[s.panelIdentity, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                            <View style={[s.panelAvatar, { backgroundColor: isDark ? 'rgba(139,92,246,0.16)' : 'rgba(139,92,246,0.1)' }]}>
                                <Text style={{ fontSize: 21, fontWeight: '700', color: '#8B5CF6' }}>{selectedPayroll.member.initials}</Text>
                            </View>
                            <View style={{ flex: 1, gap: 4 }}>
                                <Text style={{ color: textColor, fontSize: 17, fontWeight: '600' }}>{selectedPayroll.member.name}</Text>
                                <Text style={{ color: subtextColor, fontSize: 13 }}>{CREW_ROLE_LABELS[selectedPayroll.member.role as CrewRole] || selectedPayroll.member.role}{selectedPayroll.member.projectCode ? ' · ' + selectedPayroll.member.projectCode : ''}</Text>
                            </View>
                        </View>
                        <View style={[s.panelTotal, { backgroundColor: isDark ? 'rgba(139,92,246,0.09)' : 'rgba(139,92,246,0.06)', borderColor: isDark ? 'rgba(139,92,246,0.2)' : 'rgba(139,92,246,0.15)' }]}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                                <Text style={{ color: subtextColor, fontSize: 13, fontWeight: '500' }}>NET PAYOUT</Text>
                                <Text style={{ color: subtextColor, fontSize: 13 }}>{formatWeekRange(weeklyStartDate, weeklyEndDate)}</Text>
                            </View>
                            <Text style={{ color: selectedPayroll.payroll.netPayout < 0 ? '#FF3B30' : textColor, fontSize: 34, fontWeight: '700', letterSpacing: -0.8, marginTop: 16, fontVariant: ['tabular-nums'] }}>{formatCurrency(selectedPayroll.payroll.netPayout)}</Text>
                            <Text style={{ color: subtextColor, fontSize: 13, marginTop: 6 }}>Weekly earnings after additions and deductions</Text>
                        </View>
                        <Text style={s.panelSectionLabel}>PAYROLL BREAKDOWN</Text>
                        <View style={[s.panelBreakdown, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                            {renderPayrollDetail(selectedPayroll.member, selectedPayroll.payroll, true)}
                            <View style={{ paddingHorizontal: 20, paddingVertical: 18, flexDirection: 'row', justifyContent: 'space-between', gap: 16 }}>
                                <Text style={{ fontSize: 15, fontWeight: '700', color: textColor }}>Net Payout</Text>
                                <Text style={{ fontSize: 16, fontWeight: '700', color: textColor, fontVariant: ['tabular-nums'] }}>{formatCurrency(selectedPayroll.payroll.netPayout)}</Text>
                            </View>
                        </View>
                    </ScrollView>
                    <View style={[s.panelFooter, { borderTopColor: cardBorder }]}>
                        <PillButton label="Adjust" size="lg" variant="muted" color="neutral" noShadow style={{ flex: 1 }} icon={<Ionicons name="options-outline" size={18} color={textColor} />} onPress={() => { setSelectedCrewForAdjustment(selectedPayroll.member); setAdjustmentModalVisible(true); }} />
                        <PillButton label="View Slip" size="lg" color="neutral" noShadow textColor="#FFFFFF" style={{ flex: 1, backgroundColor: '#8B5CF6' }} icon={<Ionicons name="document-text-outline" size={18} color="#FFFFFF" />} onPress={() => handleExportSlip(selectedPayroll.member, selectedPayroll.payroll)} />
                    </View>
                </View>, detailContainer
            )}

            {/* Bottom Sheet Picker */}
            <SearchablePicker
                visible={showProjectPicker}
                onClose={() => setShowProjectPicker(false)}
                onSelect={(item) => setSelectedProjectCode(item.id)}
                items={projectItems}
                title="Select Project"
                selectedId={selectedProjectCode}
                tintColor="#AF52DE"
            />

            {/* Adjust Payroll Sheet (SwiftUI on iOS, RN Modal on Android) */}
            <SwiftUIAdjustmentSheet
                isOpened={adjustmentModalVisible}
                onClose={() => setAdjustmentModalVisible(false)}
                onSave={(amount, reason, proofName, proofUrl, isPositive) => {
                    if (!selectedCrewForAdjustment) return;
                    const signedAmount = isPositive ? amount : -amount;
                    setAdjustments(prev => ({
                        ...prev,
                        [selectedCrewForAdjustment.id]: {
                            amount: signedAmount,
                            reason,
                            proofName,
                            proofUrl,
                        }
                    }));
                    setAdjustmentModalVisible(false);
                }}
                crewMember={selectedCrewForAdjustment}
                initialAmount={(() => {
                    const adj = selectedCrewForAdjustment ? adjustments[selectedCrewForAdjustment.id] : null;
                    return adj ? Math.abs(adj.amount) : 0;
                })()}
                initialReason={(() => {
                    const adj = selectedCrewForAdjustment ? adjustments[selectedCrewForAdjustment.id] : null;
                    return adj ? adj.reason : '';
                })()}
                initialProofName={(() => {
                    const adj = selectedCrewForAdjustment ? adjustments[selectedCrewForAdjustment.id] : null;
                    return adj ? adj.proofName : '';
                })()}
                initialProofUrl={(() => {
                    const adj = selectedCrewForAdjustment ? adjustments[selectedCrewForAdjustment.id] : null;
                    return adj ? adj.proofUrl : '';
                })()}
                initialIsPositive={(() => {
                    const adj = selectedCrewForAdjustment ? adjustments[selectedCrewForAdjustment.id] : null;
                    return adj ? adj.amount >= 0 : true;
                })()}
            />
        </View>
    );
}

const s = StyleSheet.create({
    panelContent: { padding: 24, paddingBottom: 32, gap: 16, maxWidth: 800, width: '100%', alignSelf: 'center' },
    panelIdentity: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderRadius: 20, borderWidth: 1 },
    panelAvatar: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
    panelTotal: { padding: 22, borderRadius: 20, borderWidth: 1 },
    panelSectionLabel: { fontSize: 12, fontWeight: '600', color: '#8E8E93', letterSpacing: 1, marginTop: 10, marginLeft: 4 },
    panelBreakdown: { borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
    panelFooter: { flexDirection: 'row', gap: 12, padding: 20, borderTopWidth: StyleSheet.hairlineWidth },
    container: {
        flex: 1,
    },
    metricsScroll: {
        paddingHorizontal: 20,
        paddingBottom: 0,
        gap: 0,
    },
    metricCard: {
        width: 150,
        height: 110,
        borderRadius: 24,
        borderWidth: 0,
        padding: 16,
        marginRight: 12,
        justifyContent: 'space-between',
    },
    metricHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    metricIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    metricValue: {
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    metricTitle: {
        fontSize: 14,
        fontWeight: '700',
        lineHeight: 16,
    },
    metricSubtitle: {
        fontSize: 11,
        fontWeight: '500',
    },
    projectDropdownSide: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: 38,
        borderRadius: 19,
        borderWidth: 1,
        paddingHorizontal: 12,
    },
    projectDropdownText: {
        fontSize: 13,
        fontWeight: '600',
        flex: 1,
        marginRight: 4,
    },
    unifiedControlRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
        gap: 8,
    },
    dateNavigatorPillSide: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        height: 38,
        borderRadius: 19,
        borderWidth: 1,
        paddingHorizontal: 16,
    },
    navArrow: {
        paddingHorizontal: 2,
    },
    dateTextCompact: {
        fontSize: 13,
        fontWeight: '600',
        textAlign: 'center',
    },
    segmentedPillCompact: {
        flexDirection: 'row',
        padding: 2,
        borderRadius: 19,
        height: 38,
        alignItems: 'center',
    },
    segmentBtnCompact: {
        paddingHorizontal: 10,
        height: 34,
        borderRadius: 17,
        justifyContent: 'center',
        alignItems: 'center',
    },
    segmentBtnActive: {
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
            },
        }),
    },
    segmentTextCompact: {
        fontSize: 11,
        fontWeight: '800',
    },
    circleBtnCompact: {
        width: 38,
        height: 38,
        borderRadius: 19,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    summaryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 12,
    },
    summaryCard: {
        width: '48%',
        flexGrow: 1,
        borderRadius: 36,
        borderWidth: 1,
        padding: 16,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.02,
                shadowRadius: 8,
            },
        }),
    },
    summaryLabel: {
        fontSize: 11,
        fontWeight: '800',
        color: '#8E8E93',
        marginBottom: 6,
    },
    summaryVal: {
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: -0.2,
    },
    totalPayoutCard: {
        borderRadius: 24,
        borderWidth: 0,
        borderColor: 'transparent',
        padding: 16,
        marginBottom: 24,
    },
    totalPayoutLabel: {
        fontSize: 11,
        fontWeight: '800',
        marginBottom: 4,
    },
    totalPayoutValue: {
        fontSize: 26,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    list: {
        gap: 12,
        marginBottom: 24,
    },
    payoutCard: {
        borderRadius: 24,
        borderWidth: 0,
        borderColor: 'transparent',
        overflow: 'hidden',
    },
    payoutHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    crewInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarText: {
        fontSize: 14,
        fontWeight: '800',
    },
    crewName: {
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    roleSubtext: {
        fontSize: 12,
        fontWeight: '600',
    },
    metadataRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 3,
    },
    projectBadge: {
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 6,
    },
    projectBadgeText: {
        fontSize: 11,
        fontWeight: '700',
    },
    payoutAmount: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    payoutTextCol: {
        alignItems: 'flex-end',
    },
    payoutLabelSmall: {
        fontSize: 8,
        fontWeight: '800',
        color: '#8E8E93',
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    netPayoutText: {
        fontSize: 15,
        fontWeight: '800',
        letterSpacing: -0.3,
    },
    divider: {
        height: 1,
    },
    payoutDetails: {
        paddingHorizontal: 16,
        paddingBottom: 8,
        gap: 6,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    detailLabel: {
        fontSize: 12,
        fontWeight: '600',
    },
    detailValue: {
        fontSize: 12,
        fontWeight: '700',
    },
    cardActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    slipBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        height: 32,
        borderRadius: 16,
    },
    slipBtnText: {
        color: '#007AFF',
        fontSize: 11,
        fontWeight: '800',
    },
    adjustTextBtn: {
        paddingHorizontal: 16,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    adjustTextBtnLabel: {
        fontSize: 12,
        fontWeight: '700',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        gap: 12,
    },
    emptyText: {
        fontSize: 15,
        fontWeight: '500',
    },
    pickerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
        paddingHorizontal: Platform.OS === 'ios' ? 8 : 0,
        paddingBottom: Platform.OS === 'ios' ? 8 : 0,
    },
    pickerSheet: {
        height: '90%',
        borderRadius: Platform.OS === 'ios' ? 56 : 32,
        borderBottomLeftRadius: Platform.OS === 'ios' ? 56 : 0,
        borderBottomRightRadius: Platform.OS === 'ios' ? 56 : 0,
        overflow: 'hidden',
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 24,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    pickerTitle: {
        fontSize: 18,
        fontWeight: '800',
    },
    pickerScroll: {
        padding: 16,
    },
    pickerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        marginBottom: 8,
        gap: 12,
    },
    pickerItemCode: {
        fontSize: 14,
        fontWeight: '800',
    },
    pickerItemName: {
        fontSize: 14,
        fontWeight: '600',
        flex: 1,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    sheet: {
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        maxHeight: SCREEN_HEIGHT * 0.85,
        width: '100%',
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    headerTitle: {
        fontSize: 19,
        fontWeight: '700',
    },
    content: {
        padding: 20,
        paddingBottom: 40,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.8,
        marginBottom: 8,
    },
    sectionCard: {
        borderRadius: 24,
        padding: 16,
        marginBottom: 8,
        borderWidth: StyleSheet.hairlineWidth,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 8,
    },
    input: {
        height: 48,
        borderRadius: 24,
        paddingHorizontal: 18,
        fontSize: 15,
        fontWeight: '500',
    },
    textArea: {
        height: 80,
        paddingTop: 12,
        paddingBottom: 12,
        borderRadius: 20,
        textAlignVertical: 'top',
    },
    footer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 34 : 24,
        gap: 12,
    },
    footerButton: {
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
    },
    cancelButton: {
        flex: 1,
    },
    confirmButton: {
        flex: 1.5,
        backgroundColor: '#AF52DE',
    },
    footerBtnText: {
        fontSize: 16,
        fontWeight: '700',
    },
    adjSegmentedContainer: {
        flexDirection: 'row',
        borderRadius: 24,
        padding: 2,
    },
    adjSegmentBtn: {
        flex: 1,
        height: 36,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    adjSegmentBtnText: {
        fontSize: 13,
        fontWeight: '700',
    },
    adjProofRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
        gap: 10,
    },
    adjUploadBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 48,
        borderRadius: 16,
        borderWidth: 1,
        borderStyle: 'dashed' as const,
    },
    proofName: {
        flex: 1,
        fontSize: 13,
        fontWeight: '600',
    },
    adjustmentReasonContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(0,122,255,0.06)',
        padding: 8,
        borderRadius: 12,
        marginTop: 6,
    },
    adjustmentReasonText: {
        fontSize: 11,
        fontWeight: '600',
        flex: 1,
    },
    adjustmentProofText: {
        fontSize: 11,
        fontWeight: '700',
    },
    searchIconBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchBarRow: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 40,
        borderRadius: 20,
        borderWidth: 1,
        paddingHorizontal: 14,
        marginBottom: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 13,
        fontWeight: '700',
        paddingVertical: 0,
    },
});
