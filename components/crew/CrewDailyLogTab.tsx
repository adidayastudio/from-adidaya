import React, { useState, useEffect, useMemo } from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ScrollView,
    Modal,
    Platform,
    TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/theme';
import { DailyLog, CrewMember, Project, AttendanceStatus, CrewRole, CREW_ROLE_LABELS, Assignment, matchProjectCode } from './mockData';
import { SwiftUICrewHoursSheet } from './SwiftUICrewHoursSheet';
import { GlassView } from '@/components/ui/GlassView';
import * as FileSystem from 'expo-file-system/legacy';
import { SearchablePicker } from '@/components/ui/SearchablePicker';
import { HOLIDAYS_2026 } from '@/lib/constants/holidays';

// Timezone-safe holiday check
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

const getHolidayName = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const date = new Date(year, month, day);
        if (date.getDay() === 0) return 'Sunday';
    }
    const found = HOLIDAYS_2026.find(h => h.date === dateStr);
    return found ? found.nameEn : '';
};

// Safe lazy loading of expo-print and expo-sharing
let Print: any = null;
let Sharing: any = null;
try {
    Print = require('expo-print');
    Sharing = require('expo-sharing');
} catch (e) {
    // handled
}

// Safe lazy loading of SwiftUI components
let SwiftUIHost: any = null;
let SwiftUIButton: any = null;
let swiftModifiers: any = null;
if (Platform.OS === 'ios') {
    try {
        const SwiftUI = require('@expo/ui/swift-ui');
        SwiftUIHost = SwiftUI.Host;
        SwiftUIButton = SwiftUI.Button;
        swiftModifiers = require('@expo/ui/swift-ui/modifiers');
    } catch (e) {
        // handled
    }
}

interface CrewDailyLogTabProps {
    dailyLogs: DailyLog[];
    crewMembers: CrewMember[];
    projects: Project[];
    assignments?: Assignment[];
    onSaveLogs: (updatedLogs: DailyLog[]) => void;
    showFilters?: boolean;
    onUnsavedChangesChange?: (hasChanges: boolean, count: number, saveFn: () => void) => void;
    onExportRegister?: (exportFn: () => void) => void;
    onViewDocument?: (html: string, title: string) => void;
}

export function CrewDailyLogTab({
    dailyLogs,
    crewMembers,
    projects,
    assignments = [],
    onSaveLogs,
    showFilters: showFiltersProp = false,
    onUnsavedChangesChange,
    onExportRegister,
    onViewDocument,
}: CrewDailyLogTabProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';

    // Local Helper Component for Prominent Glass Buttons (utilizes native SwiftUI on iOS, fallback to styled Touchable on Android)
    const GlassProminentButton = ({ onPress, label, variant, width }: { onPress: () => void; label: string; variant: 'blue' | 'grey'; width: number }) => {
        if (Platform.OS === 'ios' && SwiftUIButton && swiftModifiers && SwiftUIHost) {
            const buttonTint = variant === 'blue' ? '#007AFF' : (isDark ? '#A1A1A6' : '#8E8E93');
            return (
                <View style={{ height: 28, width }}>
                    <SwiftUIHost style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                        <SwiftUIButton
                            onPress={onPress}
                            modifiers={[
                                swiftModifiers.buttonStyle('glassProminent'),
                                swiftModifiers.tint(buttonTint),
                                swiftModifiers.frame({ height: 28, minWidth: width || 60 })
                            ]}
                        >
                            {label}
                        </SwiftUIButton>
                    </SwiftUIHost>
                </View>
            );
        }

        const bg = variant === 'blue' ? glassBlueBg : glassGreyBg;
        const border = variant === 'blue' ? glassBlueBorder : glassGreyBorder;
        const textCol = variant === 'blue' ? glassBlueText : glassGreyText;

        return (
            <TouchableOpacity
                onPress={onPress}
                activeOpacity={0.7}
                style={[
                    s.glassProminentBtn,
                    { backgroundColor: bg, borderColor: border, minWidth: width }
                ]}
            >
                <Text style={[s.glassProminentText, { color: textCol }]}>
                    {label}
                </Text>
            </TouchableOpacity>
        );
    };

    // Filters
    const [selectedProjectCode, setSelectedProjectCode] = useState('');
    const [selectedDate, setSelectedDate] = useState('');
    const [showProjectPicker, setShowProjectPicker] = useState(false);
    const [search, setSearch] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const [selectedStatusFilter, setSelectedStatusFilter] = useState<'ALL' | AttendanceStatus>('ALL');
    const [localShowFilters, setLocalShowFilters] = useState(false);
    const showFilters = showFiltersProp || localShowFilters;

    const projectItems = useMemo(() => {
        return projects.map(p => ({
            id: p.code,
            label: p.name,
            sublabel: p.code.split('-')[1] || p.code,
        }));
    }, [projects]);

    // Local changes state
    const [localLogs, setLocalLogs] = useState<Record<string, DailyLog>>({});
    const [selectedCrewIds, setSelectedCrewIds] = useState<string[]>([]);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Hours modal state
    const [hoursModalVisible, setHoursModalVisible] = useState(false);
    const [bulkHoursModalVisible, setBulkHoursModalVisible] = useState(false);
    const [activeBulkStatus, setActiveBulkStatus] = useState<string | null>(null);
    const [selectedLogForHours, setSelectedLogForHours] = useState<DailyLog | null>(null);
    const [selectedCrewName, setSelectedCrewName] = useState('');
    const [selectedCrewRole, setSelectedCrewRole] = useState('');

    // Initialize defaults
    useEffect(() => {
        if (projects.length > 0 && !selectedProjectCode) {
            setSelectedProjectCode(projects[0].code);
        }
        if (!selectedDate) {
            setSelectedDate(new Date().toISOString().split('T')[0]);
        }
    }, [projects, selectedProjectCode, selectedDate]);

    // Load / calculate logs for selected project & date
    useEffect(() => {
        if (!selectedProjectCode || !selectedDate) return;

        // Find active crew assigned to this project on this date
        const projectCrew = crewMembers.filter(member => {
            if (member.status !== 'ACTIVE') return false;
            
            // Check if they have an active assignment on the selected date
            const activeAssignment = assignments && assignments.length > 0
                ? assignments.find(assign => 
                    assign.crewId === member.id &&
                    assign.status === 'ACTIVE' &&
                    assign.startDate <= selectedDate &&
                    (!assign.endDate || assign.endDate >= selectedDate)
                  )
                : undefined;
            
            if (activeAssignment) {
                // If they have an active assignment, they belong to that project
                return matchProjectCode(activeAssignment.projectCode, selectedProjectCode);
            }
            
            // If they don't have an active assignment on this date, fall back to current project code
            return matchProjectCode(member.projectCode, selectedProjectCode);
        });

        const loadedLogs: Record<string, DailyLog> = {};

        projectCrew.forEach(crew => {
            // Find existing log
            const existing = dailyLogs.find(log => log.crewId === crew.id && log.date === selectedDate && matchProjectCode(log.projectCode, selectedProjectCode));

            if (existing) {
                loadedLogs[crew.id] = { ...existing };
            } else {
                // Initialize default
                loadedLogs[crew.id] = {
                    id: `l_${crew.id}_${selectedDate}`,
                    crewId: crew.id,
                    projectCode: selectedProjectCode,
                    date: selectedDate,
                    status: '',
                    regularHours: 8,
                    ot1Hours: 0,
                    ot2Hours: 0,
                    ot3Hours: 0,
                };
            }
        });

        setLocalLogs(loadedLogs);
        setSelectedCrewIds([]);
        setIsSelectionMode(false);
        setHasUnsavedChanges(false);
    }, [selectedProjectCode, selectedDate, dailyLogs, crewMembers, assignments]);

    // Current selected project object
    const currentProject = useMemo(() => {
        return projects.find(p => p.code === selectedProjectCode) || projects[0];
    }, [projects, selectedProjectCode]);

    // Count unsaved changes
    const unsavedCount = useMemo(() => {
        if (!hasUnsavedChanges) return 0;
        return Object.values(localLogs).filter(log => {
            // Unsaved means status or hours differ from source of truth dailyLogs
            const original = dailyLogs.find(d => d.crewId === log.crewId && d.date === log.date && d.projectCode === log.projectCode);
            if (!original) return log.status !== '';
            return log.status !== original.status ||
                log.regularHours !== original.regularHours ||
                log.ot1Hours !== original.ot1Hours ||
                log.ot2Hours !== original.ot2Hours ||
                log.ot3Hours !== original.ot3Hours;
        }).length;
    }, [localLogs, dailyLogs, hasUnsavedChanges]);

    // Date Navigation
    const handlePrevDay = () => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() - 1);
        setSelectedDate(d.toISOString().split('T')[0]);
    };

    const handleNextDay = () => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + 1);
        setSelectedDate(d.toISOString().split('T')[0]);
    };

    // Update individual log
    const updateLogField = (crewId: string, updates: Partial<DailyLog>) => {
        setLocalLogs(prev => {
            const current = prev[crewId];
            if (!current) return prev;
            return {
                ...prev,
                [crewId]: { ...current, ...updates },
            };
        });
        setHasUnsavedChanges(true);
    };

    // Status change helper
    const handleStatusSelect = (crewId: string, status: AttendanceStatus) => {
        const currentStatus = localLogs[crewId]?.status;
        if (currentStatus === status) {
            // Unselect/deselect to cancel
            updateLogField(crewId, {
                status: '',
                regularHours: 8,
                ot1Hours: 0,
                ot2Hours: 0,
                ot3Hours: 0,
            });
            return;
        }

        let regularHours = 8;
        if (status === 'HALF_DAY') regularHours = 4;
        if (status === 'ABSENT' || status === 'CUTI') regularHours = 0;

        updateLogField(crewId, {
            status,
            regularHours,
            ot1Hours: status === 'ABSENT' || status === 'CUTI' ? 0 : localLogs[crewId]?.ot1Hours || 0,
            ot2Hours: status === 'ABSENT' || status === 'CUTI' ? 0 : localLogs[crewId]?.ot2Hours || 0,
            ot3Hours: status === 'ABSENT' || status === 'CUTI' ? 0 : localLogs[crewId]?.ot3Hours || 0,
        });
    };

    // Bulk selection toggle
    const toggleSelectCrew = (crewId: string) => {
        setIsSelectionMode(true);
        setSelectedCrewIds(prev =>
            prev.includes(crewId) ? prev.filter(id => id !== crewId) : [...prev, crewId]
        );
    };

    const projectCrewList = useMemo(() => {
        return crewMembers.filter(member => {
            if (member.status !== 'ACTIVE') return false;
            
            // Check if they have an active assignment on the selected date
            const activeAssignment = assignments && assignments.length > 0
                ? assignments.find(assign => 
                    assign.crewId === member.id &&
                    assign.status === 'ACTIVE' &&
                    assign.startDate <= selectedDate &&
                    (!assign.endDate || assign.endDate >= selectedDate)
                  )
                : undefined;
            
            if (activeAssignment) {
                // If they have an active assignment, they belong to that project
                return matchProjectCode(activeAssignment.projectCode, selectedProjectCode);
            }
            
            // If they don't have an active assignment on this date, fall back to current project code
            return matchProjectCode(member.projectCode, selectedProjectCode);
        });
    }, [crewMembers, selectedProjectCode, assignments, selectedDate]);

    const metrics = useMemo(() => {
        const list = Object.values(localLogs);
        return {
            total: projectCrewList.length,
            present: list.filter(l => l.status === 'PRESENT').length,
            halfDay: list.filter(l => l.status === 'HALF_DAY').length,
            absent: list.filter(l => l.status === 'ABSENT').length,
            cuti: list.filter(l => l.status === 'CUTI').length,
        };
    }, [localLogs, projectCrewList]);

    const filteredCrewList = useMemo(() => {
        return projectCrewList
            .filter(member => {
                const matchesSearch = member.name.toLowerCase().includes(search.toLowerCase()) ||
                    member.role.toLowerCase().includes(search.toLowerCase());

                const logStatus = localLogs[member.id]?.status || '';
                const matchesStatus = selectedStatusFilter === 'ALL' || logStatus === selectedStatusFilter;

                return matchesSearch && matchesStatus;
            })
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [projectCrewList, search, localLogs, selectedStatusFilter]);

    const handleExportDailyLog = async () => {
        if (!Print || !Sharing) {
            alert('Export module is not available on this device.');
            return;
        }
        try {
            const dates: string[] = [];
            const endDate = new Date(selectedDate);
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            
            // Timezone-safe date extraction for 7 days ending in selectedDate
            const parts = selectedDate.split('-');
            if (parts.length === 3) {
                const year = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10) - 1;
                const day = parseInt(parts[2], 10);
                const targetDate = new Date(year, month, day);
                
                for (let i = 6; i >= 0; i--) {
                    const d = new Date(targetDate);
                    d.setDate(targetDate.getDate() - i);
                    const yyyy = d.getFullYear();
                    const mm = String(d.getMonth() + 1).padStart(2, '0');
                    const dd = String(d.getDate()).padStart(2, '0');
                    dates.push(`${yyyy}-${mm}-${dd}`);
                }
            } else {
                for (let i = 6; i >= 0; i--) {
                    const d = new Date(endDate);
                    d.setDate(endDate.getDate() - i);
                    const yyyy = d.getFullYear();
                    const mm = String(d.getMonth() + 1).padStart(2, '0');
                    const dd = String(d.getDate()).padStart(2, '0');
                    dates.push(`${yyyy}-${mm}-${dd}`);
                }
            }

            const workerSummaries = filteredCrewList.map(member => {
                let regSum = 0;
                let ot1Sum = 0;
                let ot2Sum = 0;
                let ot3Sum = 0;
                let presentDays = 0;
                let halfDays = 0;
                
                dates.forEach(dt => {
                    const log = dailyLogs.find(l => l.crewId === member.id && l.date === dt) || localLogs[member.id];
                    if (log && log.date === dt) {
                        if (log.status === 'PRESENT') {
                            presentDays++;
                            regSum += log.regularHours || 0;
                            ot1Sum += log.ot1Hours || 0;
                            ot2Sum += log.ot2Hours || 0;
                            ot3Sum += log.ot3Hours || 0;
                        } else if (log.status === 'HALF_DAY') {
                            halfDays++;
                            regSum += log.regularHours || 0;
                            ot1Sum += log.ot1Hours || 0;
                            ot2Sum += log.ot2Hours || 0;
                            ot3Sum += log.ot3Hours || 0;
                        }
                    }
                });
                
                return {
                    member,
                    regSum,
                    ot1Sum,
                    ot2Sum,
                    ot3Sum,
                    totalSum: regSum + ot1Sum + ot2Sum + ot3Sum,
                    attendanceSummary: `${presentDays}P${halfDays > 0 ? `, ${halfDays}HD` : ''}`
                };
            });

            const summaryRowsHtml = workerSummaries.map((summary, idx) => `
                <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${idx + 1}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">${summary.member.name}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd;">${CREW_ROLE_LABELS[summary.member.role] || summary.member.role}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${summary.regSum}h</td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${summary.ot1Sum}h</td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${summary.ot2Sum}h</td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${summary.ot3Sum}h</td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center; font-weight: bold; color: #AF52DE;">${summary.totalSum}h</td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${summary.attendanceSummary}</td>
                </tr>
            `).join('');

            const detailedTablesHtml = filteredCrewList.map(member => {
                const memberRows = dates.map(dt => {
                    const parts = dt.split('-');
                    const year = parseInt(parts[0], 10);
                    const month = parseInt(parts[1], 10) - 1;
                    const day = parseInt(parts[2], 10);
                    const dateObj = new Date(year, month, day);
                    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                    const dayName = daysOfWeek[dateObj.getDay()];
                    
                    const log = dailyLogs.find(l => l.crewId === member.id && l.date === dt) || localLogs[member.id];
                    const hasLog = log && log.date === dt;
                    
                    const statusStr = hasLog ? log.status || 'Not Marked' : 'Not Marked';
                    const reg = hasLog ? log.regularHours || 0 : 0;
                    const ot1 = hasLog ? log.ot1Hours || 0 : 0;
                    const ot2 = hasLog ? log.ot2Hours || 0 : 0;
                    const ot3 = hasLog ? log.ot3Hours || 0 : 0;
                    const total = reg + ot1 + ot2 + ot3;
                    
                    let statusColor = '#333';
                    if (statusStr === 'PRESENT') statusColor = '#2E7D32';
                    else if (statusStr === 'HALF_DAY') statusColor = '#E65100';
                    else if (statusStr === 'ABSENT') statusColor = '#C62828';
                    else if (statusStr === 'CUTI') statusColor = '#6A1B9A';
                    
                    return `
                        <tr>
                            <td style="padding: 6px; border-bottom: 1px solid #eee;">${dayName}, ${day}/${month + 1}</td>
                            <td style="padding: 6px; border-bottom: 1px solid #eee; font-weight: bold; color: ${statusColor};">${statusStr}</td>
                            <td style="padding: 6px; border-bottom: 1px solid #eee; text-align: center;">${reg}h</td>
                            <td style="padding: 6px; border-bottom: 1px solid #eee; text-align: center;">${ot1}h</td>
                            <td style="padding: 6px; border-bottom: 1px solid #eee; text-align: center;">${ot2}h</td>
                            <td style="padding: 6px; border-bottom: 1px solid #eee; text-align: center;">${ot3}h</td>
                            <td style="padding: 6px; border-bottom: 1px solid #eee; text-align: center; font-weight: bold;">${total}h</td>
                        </tr>
                    `;
                }).join('');
                
                return `
                    <div style="margin-top: 25px; page-break-inside: avoid;">
                        <h3 style="margin-bottom: 8px; color: #AF52DE; font-size: 14px; border-bottom: 1px solid #AF52DE; padding-bottom: 4px;">
                            ${member.name} - <span style="font-weight: normal; color: #555;">${CREW_ROLE_LABELS[member.role] || member.role}</span>
                        </h3>
                        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                            <thead>
                                <tr style="background-color: #f2f2f7;">
                                    <th style="padding: 6px; border-bottom: 1.5px solid #AF52DE; text-align: left; width: 25%;">Date</th>
                                    <th style="padding: 6px; border-bottom: 1.5px solid #AF52DE; text-align: left; width: 15%;">Status</th>
                                    <th style="padding: 6px; border-bottom: 1.5px solid #AF52DE; text-align: center;">Regular</th>
                                    <th style="padding: 6px; border-bottom: 1.5px solid #AF52DE; text-align: center;">OT 1</th>
                                    <th style="padding: 6px; border-bottom: 1.5px solid #AF52DE; text-align: center;">OT 2</th>
                                    <th style="padding: 6px; border-bottom: 1.5px solid #AF52DE; text-align: center;">OT 3</th>
                                    <th style="padding: 6px; border-bottom: 1.5px solid #AF52DE; text-align: center;">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${memberRows}
                            </tbody>
                        </table>
                    </div>
                `;
            }).join('');

            const htmlContent = `
                <html>
                    <head>
                        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
                        <style>
                            body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 25px; color: #333; }
                            h2 { color: #AF52DE; text-align: center; margin-bottom: 5px; }
                            .meta { text-align: center; color: #666; font-size: 13px; margin-bottom: 25px; }
                            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
                            th { background-color: #AF52DE; color: white; padding: 8px 4px; text-align: left; }
                            td { padding: 8px 4px; }
                        </style>
                    </head>
                    <body>
                        <h2>PT MAHARDIKA ADIDAYA - WEEKLY TIMESHEET</h2>
                        <div class="meta">
                            Project: ${currentProject ? `[${currentProject.code}] ${currentProject.name}` : selectedProjectCode} | Week Ending: ${selectedDate}
                        </div>
                        
                        <h3 style="color: #333; font-size: 14px; margin-top: 15px; margin-bottom: 5px;">Timesheet Summary</h3>
                        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                            <thead>
                                <tr>
                                    <th style="width: 4%; text-align: center;">No</th>
                                    <th style="width: 25%;">Worker Name</th>
                                    <th style="width: 15%;">Role</th>
                                    <th style="text-align: center;">Regular</th>
                                    <th style="text-align: center;">OT 1</th>
                                    <th style="text-align: center;">OT 2</th>
                                    <th style="text-align: center;">OT 3</th>
                                    <th style="text-align: center;">Total Hours</th>
                                    <th style="text-align: center;">Days Present</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${summaryRowsHtml}
                            </tbody>
                        </table>
                        
                        <h3 style="color: #333; font-size: 14px; margin-top: 30px; margin-bottom: 5px; page-break-before: always;">Detailed Weekly Breakdown</h3>
                        ${detailedTablesHtml}
                    </body>
                </html>
            `;

            const projectCodePart = (selectedProjectCode || 'ALL') === 'ALL' ? 'ALL' : ((selectedProjectCode || 'ALL').split('-')[1] || selectedProjectCode || 'ALL');
            const filename = `${projectCodePart}_Weekly_Timesheet_${selectedDate}.pdf`;

            if (onViewDocument) {
                onViewDocument(htmlContent, filename.replace('.pdf', ''));
                return;
            }

            const { uri } = await Print.printToFileAsync({ html: htmlContent });
            const customUri = `${FileSystem.cacheDirectory}${filename}`;
            await FileSystem.copyAsync({ from: uri, to: customUri });
            await Sharing.shareAsync(customUri, { mimeType: 'application/pdf', dialogTitle: 'Crew_Weekly_Timesheet' });
        } catch (error) {
            console.error('Error exporting weekly timesheet:', error);
            alert('Failed to export weekly timesheet PDF.');
        }
    };

    useEffect(() => {
        if (onExportRegister) {
            onExportRegister(handleExportDailyLog);
        }
    }, [filteredCrewList, selectedProjectCode, selectedDate, dailyLogs, localLogs, onExportRegister]);

    const toggleSelectAll = () => {
        const allIds = filteredCrewList.map(m => m.id);
        setIsSelectionMode(true);
        if (selectedCrewIds.length === allIds.length) {
            setSelectedCrewIds([]);
        } else {
            setSelectedCrewIds(allIds);
        }
    };

    // Apply bulk status
    const applyBulkStatus = (status: AttendanceStatus) => {
        if (selectedCrewIds.length === 0) return;
        setActiveBulkStatus(status);

        setLocalLogs(prev => {
            const next = { ...prev };
            selectedCrewIds.forEach(id => {
                let regularHours = 8;
                if (status === 'HALF_DAY') regularHours = 4;
                if (status === 'ABSENT' || status === 'CUTI') regularHours = 0;

                next[id] = {
                    ...next[id],
                    status,
                    regularHours,
                    ot1Hours: status === 'ABSENT' || status === 'CUTI' ? 0 : next[id].ot1Hours,
                    ot2Hours: status === 'ABSENT' || status === 'CUTI' ? 0 : next[id].ot2Hours,
                    ot3Hours: status === 'ABSENT' || status === 'CUTI' ? 0 : next[id].ot3Hours,
                };
            });
            return next;
        });

        setHasUnsavedChanges(true);
    };

    // Apply bulk hours
    const applyBulkHours = (regularHours: number, ot1: number, ot2: number, ot3: number) => {
        if (selectedCrewIds.length === 0) return;
        setActiveBulkStatus('SET_HOURS');

        setLocalLogs(prev => {
            const next = { ...prev };
            selectedCrewIds.forEach(id => {
                let status = next[id]?.status || 'PRESENT';
                if (regularHours === 0) {
                    if (status !== 'CUTI') status = 'ABSENT';
                } else if (regularHours === 4) {
                    status = 'HALF_DAY';
                } else if (regularHours === 8 && (status === 'ABSENT' || status === 'HALF_DAY')) {
                    status = 'PRESENT';
                }

                next[id] = {
                    ...next[id],
                    regularHours,
                    ot1Hours: ot1,
                    ot2Hours: ot2,
                    ot3Hours: ot3,
                    status,
                };
            });
            return next;
        });

        setHasUnsavedChanges(true);
    };

    const handleSave = () => {
        const logsToSave = Object.values(localLogs);
        onSaveLogs(logsToSave);
        setHasUnsavedChanges(false);
        alert('Daily logs saved successfully!');
    };

    useEffect(() => {
        if (onUnsavedChangesChange) {
            onUnsavedChangesChange(hasUnsavedChanges, unsavedCount, handleSave);
        }
    }, [hasUnsavedChanges, unsavedCount, localLogs, onUnsavedChangesChange]);

    const handleExport = () => {
        alert('Exporting daily logs report...');
    };

    const handleHoursModalSave = (regularHours: number, ot1: number, ot2: number, ot3: number) => {
        if (selectedLogForHours) {
            updateLogField(selectedLogForHours.crewId, {
                regularHours,
                ot1Hours: ot1,
                ot2Hours: ot2,
                ot3Hours: ot3,
            });
        }
        setHoursModalVisible(false);
    };

    // Date formatting helper
    const formatDateForNavigator = (dateStr: string) => {
        if (!dateStr) return '';
        // Try parsing YYYY-MM-DD
        const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (match) {
            const year = parseInt(match[1], 10);
            const monthIdx = parseInt(match[2], 10) - 1;
            const day = parseInt(match[3], 10);
            const date = new Date(year, monthIdx, day);
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            if (monthIdx >= 0 && monthIdx < 12) {
                return `${days[date.getDay()]} ${day} ${months[monthIdx]}`;
            }
        }
        
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`;
    };

    const cardBg = isDark ? '#1C1C1E' : '#FFF';
    const cardBorder = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
    const searchBg = isDark ? '#1C1C1E' : '#FFF';
    const searchBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

    const glassBlueBg = isDark ? 'rgba(10, 132, 255, 0.15)' : 'rgba(0, 122, 255, 0.08)';
    const glassBlueBorder = isDark ? 'rgba(10, 132, 255, 0.3)' : 'rgba(0, 122, 255, 0.18)';
    const glassBlueText = isDark ? '#409CFF' : '#007AFF';

    const glassGreyBg = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)';
    const glassGreyBorder = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)';
    const glassGreyText = isDark ? '#D1D1D6' : '#8E8E93';

    return (
        <View style={s.container}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginHorizontal: -20, marginBottom: 12 }}
                contentContainerStyle={s.metricsScroll}
            >
                {/* Card 1: Total Crew */}
                <View style={[s.metricCard, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderColor: 'transparent', borderWidth: 0 }]}>
                    <View style={s.metricHeader}>
                        <View style={[s.metricIconContainer, { backgroundColor: 'rgba(175,82,222,0.1)' }]}>
                            <Ionicons name="construct" size={18} color="#AF52DE" />
                        </View>
                        <Text style={[s.metricValue, { color: textColor }]}>{metrics.total}</Text>
                    </View>
                    <Text style={[s.metricTitle, { color: textColor }]} numberOfLines={1}>Total Crew</Text>
                </View>

                {/* Card 2: Present */}
                <View style={[s.metricCard, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderColor: 'transparent', borderWidth: 0 }]}>
                    <View style={s.metricHeader}>
                        <View style={[s.metricIconContainer, { backgroundColor: 'rgba(52,199,89,0.1)' }]}>
                            <Ionicons name="checkmark-circle-outline" size={18} color="#34C759" />
                        </View>
                        <Text style={[s.metricValue, { color: textColor }]}>{metrics.present}</Text>
                    </View>
                    <Text style={[s.metricTitle, { color: textColor }]} numberOfLines={1}>Present</Text>
                </View>

                {/* Card 3: Half Day */}
                <View style={[s.metricCard, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderColor: 'transparent', borderWidth: 0 }]}>
                    <View style={s.metricHeader}>
                        <View style={[s.metricIconContainer, { backgroundColor: 'rgba(255,149,0,0.1)' }]}>
                            <Ionicons name="time-outline" size={18} color="#FF9500" />
                        </View>
                        <Text style={[s.metricValue, { color: textColor }]}>{metrics.halfDay}</Text>
                    </View>
                    <Text style={[s.metricTitle, { color: textColor }]} numberOfLines={1}>Half Day</Text>
                </View>

                {/* Card 4: Absent */}
                <View style={[s.metricCard, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderColor: 'transparent', borderWidth: 0 }]}>
                    <View style={s.metricHeader}>
                        <View style={[s.metricIconContainer, { backgroundColor: 'rgba(255,59,48,0.1)' }]}>
                            <Ionicons name="close-circle-outline" size={18} color="#FF3B30" />
                        </View>
                        <Text style={[s.metricValue, { color: textColor }]}>{metrics.absent}</Text>
                    </View>
                    <Text style={[s.metricTitle, { color: textColor }]} numberOfLines={1}>Absent</Text>
                </View>

                {/* Card 5: Leave/Cuti */}
                <View style={[s.metricCard, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderColor: 'transparent', borderWidth: 0 }]}>
                    <View style={s.metricHeader}>
                        <View style={[s.metricIconContainer, { backgroundColor: 'rgba(175,82,222,0.1)' }]}>
                            <Ionicons name="calendar-outline" size={18} color="#AF52DE" />
                        </View>
                        <Text style={[s.metricValue, { color: textColor }]}>{metrics.cuti}</Text>
                    </View>
                    <Text style={[s.metricTitle, { color: textColor }]} numberOfLines={1}>On Leave</Text>
                </View>
            </ScrollView>

            {/* Unified Control Row: side-by-side Project Picker, Date Navigator, and Search Toggle */}
            <View style={s.unifiedControlRow}>
                {/* Project Selection Dropdown */}
                <TouchableOpacity
                    style={[s.projectDropdownSide, { backgroundColor: cardBg, borderColor: searchBorder }]}
                    onPress={() => setShowProjectPicker(true)}
                    activeOpacity={0.7}
                >
                    <Text style={[s.projectDropdownText, { color: textColor }]} numberOfLines={1}>
                        {currentProject ? (currentProject.code.split('-')[1] || currentProject.code) : 'Select Project'}
                    </Text>
                    <Ionicons name="chevron-down" size={12} color={subtextColor} />
                </TouchableOpacity>

                {/* Date Navigator */}
                <View style={[s.dateNavigatorPillSide, { backgroundColor: cardBg, borderColor: searchBorder }]}>
                    <TouchableOpacity onPress={handlePrevDay} style={s.navArrow} hitSlop={10}>
                        <Ionicons name="chevron-back" size={12} color={textColor} />
                    </TouchableOpacity>
                    <Text style={[s.dateTextCompact, { color: textColor }]} numberOfLines={1}>
                        {formatDateForNavigator(selectedDate)}
                    </Text>
                    <TouchableOpacity onPress={handleNextDay} style={s.navArrow} hitSlop={10}>
                        <Ionicons name="chevron-forward" size={12} color={textColor} />
                    </TouchableOpacity>
                </View>

                {/* Search Toggle Button */}
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

            {/* Holiday Notice Alert Banner */}
            {isHolidayDate(selectedDate) && (
                <View style={s.holidayBanner}>
                    <Ionicons name="sunny" size={16} color="#FF9500" />
                    <Text style={s.holidayBannerText}>
                        Today is a {getHolidayName(selectedDate) || 'Holiday (Hari Libur/Minggu)'}
                    </Text>
                </View>
            )}

            {/* Toggleable Attendance Status Filters Pill Row */}
            {showFilters && (
                <View style={s.filterRowContainer}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={s.filterScroll}
                    >
                        {[
                            { value: 'ALL', label: 'All Status' },
                            { value: 'PRESENT', label: 'Present' },
                            { value: 'HALF_DAY', label: 'Half Day' },
                            { value: 'ABSENT', label: 'Absent' },
                            { value: 'CUTI', label: 'Leave' }
                        ].map(filter => {
                            const isActive = selectedStatusFilter === filter.value;
                            const getPillBgColor = () => {
                                if (!isActive) return isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
                                switch (filter.value) {
                                    case 'ALL': return '#007AFF';
                                    case 'PRESENT': return '#34C759';
                                    case 'HALF_DAY': return '#FF9500';
                                    case 'ABSENT': return '#FF3B30';
                                    case 'CUTI': return '#AF52DE';
                                    default: return Colors[resolvedTheme].tint;
                                }
                            };
                            const pillBg = getPillBgColor();
                            const pillTextCol = isActive ? '#FFF' : textColor;

                            return (
                                <TouchableOpacity
                                    key={filter.value}
                                    style={[s.filterPill, { backgroundColor: pillBg }]}
                                    onPress={() => setSelectedStatusFilter(filter.value as any)}
                                >
                                    <Text style={[s.filterText, { color: pillTextCol }, isActive && { fontWeight: '700' }]}>
                                        {filter.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
            )}

            {filteredCrewList.length > 0 ? (
                <>
                    {/* Redesigned List Section Header with Inline Select All Button */}
                    <View style={s.listHeaderRow}>
                        <Text style={[s.listSectionTitle, { color: subtextColor }]}>
                            {search ? 'Search Results' : 'Assigned Crew'} ({filteredCrewList.length})
                        </Text>
                        {!isSelectionMode ? (
                            <TouchableOpacity
                                onPress={() => setIsSelectionMode(true)}
                                activeOpacity={0.7}
                                style={[s.glassProminentBtn, { backgroundColor: glassBlueBg, borderColor: glassBlueBorder }]}
                            >
                                <Text style={[s.glassProminentText, { color: glassBlueText }]}>
                                    Select Crew
                                </Text>
                            </TouchableOpacity>
                        ) : (
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                <TouchableOpacity
                                    onPress={toggleSelectAll}
                                    activeOpacity={0.7}
                                    style={[s.glassProminentBtn, { backgroundColor: glassBlueBg, borderColor: glassBlueBorder }]}
                                >
                                    <Text style={[s.glassProminentText, { color: glassBlueText }]}>
                                        {selectedCrewIds.length === filteredCrewList.length ? 'Deselect All' : 'Select All'}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => {
                                        setSelectedCrewIds([]);
                                        setIsSelectionMode(false);
                                    }}
                                    activeOpacity={0.7}
                                    style={[s.glassProminentBtn, { backgroundColor: glassGreyBg, borderColor: glassGreyBorder }]}
                                >
                                    <Text style={[s.glassProminentText, { color: glassGreyText }]}>
                                        Cancel
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                    {/* Inline Collapsible Bulk Action Control Panel */}
                    {selectedCrewIds.length > 0 && (
                        <View style={[s.bulkControlPanel, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                            <View style={s.bulkControlHeader}>
                                <Ionicons name="checkmark-circle" size={16} color={Colors[resolvedTheme].tint} />
                                <Text style={[s.bulkControlTitle, { color: textColor }]}>
                                    Apply status to {selectedCrewIds.length} selected crew:
                                </Text>
                            </View>
                            <View style={s.bulkControlButtons}>
                                <TouchableOpacity
                                    style={[
                                        s.bulkActionPill,
                                        activeBulkStatus === 'PRESENT'
                                            ? { backgroundColor: '#34C759', borderColor: '#34C759' }
                                            : { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }
                                    ]}
                                    onPress={() => applyBulkStatus('PRESENT')}
                                >
                                    <Text style={[s.bulkActionPillText, { color: activeBulkStatus === 'PRESENT' ? '#FFFFFF' : textColor }]}>Present</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        s.bulkActionPill,
                                        activeBulkStatus === 'HALF_DAY'
                                            ? { backgroundColor: '#FF9500', borderColor: '#FF9500' }
                                            : { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }
                                    ]}
                                    onPress={() => applyBulkStatus('HALF_DAY')}
                                >
                                    <Text style={[s.bulkActionPillText, { color: activeBulkStatus === 'HALF_DAY' ? '#FFFFFF' : textColor }]}>Half Day</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        s.bulkActionPill,
                                        activeBulkStatus === 'ABSENT'
                                            ? { backgroundColor: '#FF3B30', borderColor: '#FF3B30' }
                                            : { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }
                                    ]}
                                    onPress={() => applyBulkStatus('ABSENT')}
                                >
                                    <Text style={[s.bulkActionPillText, { color: activeBulkStatus === 'ABSENT' ? '#FFFFFF' : textColor }]}>Absent</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        s.bulkActionPill,
                                        activeBulkStatus === 'CUTI'
                                            ? { backgroundColor: '#AF52DE', borderColor: '#AF52DE' }
                                            : { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }
                                    ]}
                                    onPress={() => applyBulkStatus('CUTI')}
                                >
                                    <Text style={[s.bulkActionPillText, { color: activeBulkStatus === 'CUTI' ? '#FFFFFF' : textColor }]}>Leave</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        s.bulkActionPill,
                                        activeBulkStatus === 'SET_HOURS'
                                            ? { backgroundColor: '#007AFF', borderColor: '#007AFF' }
                                            : { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' },
                                        { flexDirection: 'row', alignItems: 'center' }
                                    ]}
                                    onPress={() => setBulkHoursModalVisible(true)}
                                >
                                    <Ionicons name="time-outline" size={13} color={activeBulkStatus === 'SET_HOURS' ? '#FFFFFF' : textColor} style={{ marginRight: 4 }} />
                                    <Text style={[s.bulkActionPillText, { color: activeBulkStatus === 'SET_HOURS' ? '#FFFFFF' : textColor }]}>Set Hours</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {/* Logs Scroll List */}
                    <View style={s.list}>
                        {filteredCrewList.map(member => {
                            const isSelected = selectedCrewIds.includes(member.id);
                            const log = localLogs[member.id] || {
                                status: '',
                                regularHours: 8,
                                ot1Hours: 0,
                                ot2Hours: 0,
                                ot3Hours: 0,
                            };

                            const isAbsentOrCuti = log.status === 'ABSENT' || log.status === 'CUTI';

                            // Determine if this card is locally unsaved
                            const original = dailyLogs.find(d => d.crewId === member.id && d.date === selectedDate && matchProjectCode(d.projectCode, selectedProjectCode));
                            const isLogUnsaved = !original
                                ? log.status !== ''
                                : (log.status !== original.status ||
                                   log.regularHours !== original.regularHours ||
                                   log.ot1Hours !== original.ot1Hours ||
                                   log.ot2Hours !== original.ot2Hours ||
                                   log.ot3Hours !== original.ot3Hours);

                            // Initials for avatar
                            const nameParts = member.name.split(' ');
                            const initials = nameParts.length >= 2
                                ? nameParts[0][0] + nameParts[1][0]
                                : member.name.slice(0, 2).toUpperCase();

                            return (
                                <View key={member.id} style={[s.crewCard, isSelected && s.crewCardSelected, { backgroundColor: cardBg, borderColor: isSelected ? Colors[resolvedTheme].tint : cardBorder }]}>
                                    {/* Redesigned Card Header: Avatar, Meta, Status / Unsaved dot */}
                                    <View style={s.cardTopRowNew}>
                                        <TouchableOpacity
                                            style={s.avatarSelectWrapper}
                                            onPress={() => toggleSelectCrew(member.id)}
                                            activeOpacity={0.8}
                                        >
                                            {/* Main Avatar - always shows initials */}
                                            <View style={[
                                                s.avatarNew,
                                                { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }
                                            ]}>
                                                <Text style={[s.avatarTextNew, { color: textColor }]}>{initials}</Text>
                                            </View>
                                        </TouchableOpacity>

                                        <View style={s.memberMetaNew}>
                                            <Text style={[s.nameTextNew, { color: textColor }]} numberOfLines={1}>
                                                {member.name}
                                            </Text>
                                            <Text style={[s.roleTextNew, { color: subtextColor }]} numberOfLines={1}>
                                                {CREW_ROLE_LABELS[member.role as CrewRole] || member.role}
                                            </Text>
                                        </View>

                                        <View style={s.headerRightSection}>
                                            {isLogUnsaved && (
                                                <View style={s.unsavedBadgeNew}>
                                                    <View style={s.unsavedDot} />
                                                    <Text style={s.unsavedTextNew}>UNSAVED</Text>
                                                </View>
                                            )}
                                            {isSelectionMode && (
                                                <TouchableOpacity
                                                    onPress={() => toggleSelectCrew(member.id)}
                                                    activeOpacity={0.7}
                                                    style={{ padding: 4 }}
                                                >
                                                    <View style={[
                                                        s.cardCheckCircle,
                                                        {
                                                            backgroundColor: isSelected ? Colors[resolvedTheme].tint : 'transparent',
                                                            borderColor: isSelected ? Colors[resolvedTheme].tint : subtextColor,
                                                        }
                                                    ]}>
                                                        {isSelected && (
                                                            <Ionicons name="checkmark" size={12} color="#FFF" />
                                                        )}
                                                    </View>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    </View>

                                    {/* Redesigned Card Body: Premium Status Segments + Hours bubble */}
                                    <View style={s.cardBottomRowNew}>
                                        <View style={[s.segmentedPickerContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }]}>
                                            {(['PRESENT', 'HALF_DAY', 'ABSENT', 'CUTI'] as const).map(statusVal => {
                                                const isActive = log.status === statusVal;
                                                let btnLabel = 'Present';
                                                let activeColor = '#34C759';
                                                
                                                if (statusVal === 'HALF_DAY') {
                                                    btnLabel = 'Half';
                                                    activeColor = '#FF9500';
                                                } else if (statusVal === 'ABSENT') {
                                                    btnLabel = 'Absent';
                                                    activeColor = '#FF3B30';
                                                } else if (statusVal === 'CUTI') {
                                                    btnLabel = 'Leave';
                                                    activeColor = '#AF52DE';
                                                }

                                                return (
                                                    <TouchableOpacity
                                                        key={statusVal}
                                                        style={[
                                                            s.statusSegmentBtn,
                                                            isActive && { backgroundColor: activeColor }
                                                        ]}
                                                        onPress={() => handleStatusSelect(member.id, statusVal)}
                                                        activeOpacity={0.7}
                                                    >
                                                        <Text
                                                            style={[
                                                                s.statusSegmentLabel,
                                                                {
                                                                    color: isActive ? '#FFF' : (isDark ? '#A1A1A6' : '#8E8E93'),
                                                                    fontWeight: isActive ? '700' : '600'
                                                                }
                                                            ]}
                                                        >
                                                            {btnLabel}
                                                        </Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>

                                        {!isAbsentOrCuti && (
                                            <TouchableOpacity
                                                style={[
                                                    s.hoursBadgeBubble,
                                                    {
                                                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,122,255,0.05)',
                                                        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,122,255,0.1)'
                                                    }
                                                ]}
                                                onPress={() => {
                                                    setSelectedLogForHours(log as DailyLog);
                                                    setSelectedCrewName(member.name);
                                                    setSelectedCrewRole(member.role);
                                                    setHoursModalVisible(true);
                                                }}
                                                activeOpacity={0.7}
                                            >
                                                <Text style={[s.hoursBadgeTextVal, { color: Colors[resolvedTheme].tint }]}>
                                                    {log.regularHours}h{log.ot1Hours + log.ot2Hours + log.ot3Hours > 0 ? `+${log.ot1Hours + log.ot2Hours + log.ot3Hours}h` : ''}
                                                </Text>
                                                <Ionicons name="chevron-forward" size={10} color={Colors[resolvedTheme].tint} style={{ marginLeft: 2 }} />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                </>
            ) : (
                <View style={s.emptyState}>
                    <Ionicons name="construct-outline" size={48} color={subtextColor} />
                    <Text style={[s.emptyText, { color: subtextColor }]}>
                        No active crew members found.
                    </Text>
                </View>
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

            {/* Fallback Local Floating Save Changes Bar (only if not handled by parent) */}
            {!onUnsavedChangesChange && hasUnsavedChanges && (
                <View style={s.floatingSaveContainer}>
                    <GlassView intensity={60} style={[s.floatingSaveGlass, { borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                        <View style={s.floatingSaveContent}>
                            <View style={s.floatingSaveLeft}>
                                <View style={s.warningIconCircle}>
                                    <Ionicons name="alert-circle" size={14} color="#FF9500" />
                                </View>
                                <Text style={[s.floatingSaveText, { color: textColor }]}>
                                    {unsavedCount} Unsaved Logs
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={s.floatingSaveBtn}
                                onPress={handleSave}
                                activeOpacity={0.8}
                            >
                                <Text style={s.floatingSaveBtnText}>Save Changes</Text>
                            </TouchableOpacity>
                        </View>
                    </GlassView>
                </View>
            )}

            {/* Crew Hours Bottom Drawer Modal Sheet */}
            <SwiftUICrewHoursSheet
                isOpened={hoursModalVisible}
                onClose={() => setHoursModalVisible(false)}
                onSave={handleHoursModalSave}
                log={selectedLogForHours}
                crewName={selectedCrewName}
                crewRole={selectedCrewRole}
            />

            {/* Bulk Crew Hours Bottom Drawer Modal Sheet */}
            <SwiftUICrewHoursSheet
                isOpened={bulkHoursModalVisible}
                onClose={() => setBulkHoursModalVisible(false)}
                onSave={applyBulkHours}
                log={{
                    id: 'bulk',
                    crewId: 'bulk',
                    date: selectedDate,
                    projectCode: selectedProjectCode,
                    status: 'PRESENT',
                    regularHours: 8,
                    ot1Hours: 0,
                    ot2Hours: 0,
                    ot3Hours: 0,
                }}
                crewName={`${selectedCrewIds.length} Selected Members`}
                crewRole="Bulk Hours Adjustment"
            />
        </View>
    );
}

const s = StyleSheet.create({
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
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.02,
                shadowRadius: 8,
            },
        }),
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
    dropdown: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.02,
                shadowRadius: 4,
            },
        }),
    },
    dropdownInfo: {
        flex: 1,
    },
    dropdownText: {
        fontSize: 14,
        fontWeight: '800',
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    dateNavigatorPill: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 38,
        borderRadius: 19,
        borderWidth: 1,
        paddingHorizontal: 12,
        gap: 12,
    },
    navArrow: {
        paddingHorizontal: 4,
    },
    dateText: {
        fontSize: 13,
        fontWeight: '800',
        minWidth: 56,
        textAlign: 'center',
    },
    headerActions: {
        flexDirection: 'row',
        gap: 8,
    },
    pillBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        height: 38,
        borderRadius: 19,
        borderWidth: 1,
        paddingHorizontal: 14,
    },
    pillBtnText: {
        fontSize: 12,
        fontWeight: '700',
    },
    pillBtnActive: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        height: 38,
        borderRadius: 19,
        paddingHorizontal: 14,
    },
    pillBtnTextActive: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FFF',
    },
    bulkRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    bulkLabel: {
        fontSize: 13,
        fontWeight: '700',
    },
    bulkActions: {
        flexDirection: 'row',
        gap: 6,
    },
    bulkBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    warningBar: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        backgroundColor: 'rgba(255,149,0,0.12)',
        borderRadius: 12,
        gap: 8,
        marginBottom: 16,
    },
    warningText: {
        color: '#FF9500',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    list: {
        gap: 16,
        marginBottom: 24,
    },
    crewCard: {
        borderRadius: 24,
        borderWidth: 0,
        borderColor: 'transparent',
        overflow: 'hidden',
    },
    cardHeaderNew: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 10,
    },
    cardHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    memberMetaNew: {
        flex: 1,
        justifyContent: 'center',
    },
    nameTextNew: {
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    roleTextNew: {
        fontSize: 12,
        fontWeight: '600',
        marginTop: 2,
    },
    unsavedBadgeNew: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,149,0,0.08)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 5,
    },
    unsavedDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#FF9500',
    },
    unsavedTextNew: {
        fontSize: 9,
        fontWeight: '800',
        color: '#FF9500',
        letterSpacing: 0.2,
    },
    cardBodyNew: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 16,
        paddingTop: 6,
    },
    statusPickerNew: {
        flexDirection: 'row',
        gap: 8,
    },
    statusOptionBtnNew: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statusOptionLabelNew: {
        fontSize: 12,
    },
    hoursAndAdjustNew: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    hoursTextNew: {
        fontSize: 13,
        fontWeight: '700',
    },
    adjustBtnIconNew: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardTop: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    selectCheckbox: {
        marginRight: 12,
    },
    memberMeta: {
        flex: 1,
    },
    nameText: {
        fontSize: 15,
        fontWeight: '800',
        letterSpacing: -0.2,
    },
    roleSubtext: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.3,
        textTransform: 'uppercase',
    },
    unsavedText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#FF9500',
        letterSpacing: 0.2,
    },
    divider: {
        height: 1,
    },
    attendanceSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
    },
    sectionLabel: {
        fontSize: 9,
        fontWeight: '800',
        color: '#8E8E93',
        letterSpacing: 0.8,
    },
    statusPicker: {
        flexDirection: 'row',
        gap: 6,
    },
    statusOptionBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.06)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    statusOptionLabel: {
        fontSize: 12,
        fontWeight: '800',
    },
    hoursSection: {
        padding: 16,
        gap: 12,
    },
    disabledRow: {
        opacity: 0.35,
    },
    hoursDisplayRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    hoursTextVal: {
        fontSize: 13,
        fontWeight: '800',
    },
    adjustPillBtn: {
        height: 38,
        borderRadius: 19,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
    },
    adjustPillBtnText: {
        color: '#007AFF',
        fontSize: 13,
        fontWeight: '800',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        gap: 12,
    },
    emptyText: {
        fontSize: 14,
        fontWeight: '500',
        textAlign: 'center',
    },
    pickerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    pickerSheet: {
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        maxHeight: '60%',
        paddingBottom: Platform.OS === 'ios' ? 34 : 24,
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
    toolbarActionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        gap: 12,
    },
    toolbarLeftSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    toolbarRightSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    circleBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    projectDropdown: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: 44,
        borderRadius: 22,
        borderWidth: 1,
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    projectDropdownText: {
        fontSize: 13,
        fontWeight: '600',
        flex: 1,
        marginRight: 4,
    },
    filterRowContainer: {
        marginHorizontal: -20,
        marginBottom: 16,
    },
    filterScroll: {
        paddingHorizontal: 20,
        gap: 8,
    },
    filterPill: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    filterText: {
        fontSize: 13,
        fontWeight: '600',
    },
    unifiedControlRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 8,
    },
    projectDropdownSide: {
        flex: 1.2,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: 38,
        borderRadius: 19,
        borderWidth: 1,
        paddingHorizontal: 12,
    },
    dateNavigatorPillSide: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 38,
        borderRadius: 19,
        borderWidth: 1,
        paddingHorizontal: 10,
    },
    circleCheckbox: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 1.5,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    hoursSectionCompact: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    hoursBadgesRow: {
        flexDirection: 'row',
        gap: 6,
        alignItems: 'center',
    },
    hoursBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    hoursBadgeText: {
        fontSize: 11,
        fontWeight: '600',
    },
    adjustPillBtnCompact: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
    },
    adjustPillBtnTextCompact: {
        color: '#007AFF',
        fontSize: 11,
        fontWeight: '800',
    },
    floatingSaveContainer: {
        position: 'absolute',
        bottom: 16,
        left: 16,
        right: 16,
        zIndex: 100,
        borderRadius: 24,
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.15,
                shadowRadius: 16,
            },
        }),
    },
    floatingSaveGlass: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 24,
        borderWidth: 1,
    },
    floatingSaveContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    floatingSaveLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    warningIconCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(255,149,0,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    floatingSaveText: {
        fontSize: 13,
        fontWeight: '700',
    },
    floatingSaveBtn: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 16,
    },
    floatingSaveBtnText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '800',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 38,
        borderRadius: 19,
        borderWidth: 1,
        paddingHorizontal: 12,
        marginBottom: 12,
        marginTop: 4,
    },
    searchIcon: {
        marginRight: 6,
    },
    searchInput: {
        flex: 1,
        fontSize: 13,
        fontWeight: '700',
        paddingVertical: 0,
    },
    dateTextCompact: {
        fontSize: 13,
        fontWeight: '600',
        textAlign: 'center',
    },
    holidayBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: 'rgba(255,149,0,0.12)',
        borderRadius: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,149,0,0.25)',
    },
    holidayBannerText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#FF9500',
    },
    listHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    listSectionTitle: {
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: -0.1,
    },
    selectAllBtn: {
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    selectAllBtnText: {
        fontSize: 13,
        fontWeight: '600',
    },
    bulkControlPanel: {
        borderRadius: 20,
        borderWidth: 1,
        padding: 16,
        marginBottom: 16,
    },
    bulkControlHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    bulkControlTitle: {
        fontSize: 13,
        fontWeight: '600',
    },
    bulkControlButtons: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    bulkActionPill: {
        flex: 1,
        minWidth: 70,
        height: 34,
        borderRadius: 17,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    bulkActionPillText: {
        fontSize: 12,
        fontWeight: '700',
    },
    crewCardSelected: {
        borderWidth: 1.5,
    },
    cardTopRowNew: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 10,
    },
    avatarSelectWrapper: {
        marginRight: 12,
    },
    avatarNew: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardCheckCircle: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 1.5,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    glassProminentBtn: {
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 14,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    glassProminentText: {
        fontSize: 12,
        fontWeight: '700',
    },
    avatarTextNew: {
        fontSize: 14,
        fontWeight: '800',
    },
    headerRightSection: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    cardBottomRowNew: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 16,
        paddingTop: 6,
        gap: 12,
    },
    segmentedPickerContainer: {
        flexDirection: 'row',
        borderRadius: 14,
        padding: 2,
        flex: 1,
    },
    statusSegmentBtn: {
        flex: 1,
        height: 32,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statusSegmentLabel: {
        fontSize: 11,
    },
    hoursBadgeBubble: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 14,
        borderWidth: 1,
    },
    hoursBadgeTextVal: {
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
});
