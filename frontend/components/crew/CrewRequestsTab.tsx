import { DESKTOP_PANEL_HEADER, DESKTOP_PANEL_TITLE, DESKTOP_PANEL_ACTION } from '@/constants/desktopLayout';
import React, { useState, useMemo, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ScrollView,
    Platform,
    TextInput,
    Alert,
    Modal,
    Image,
    Dimensions,
    ActivityIndicator,
    useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/theme';
import { CrewRequest, RequestType, RequestStatus, CREW_ROLE_LABELS, Project, INITIAL_PROJECTS, CrewRole, matchProjectCode } from './mockData';
import { PillButton } from '../ui/PillButton';
import * as FileSystem from 'expo-file-system/legacy';
import { SearchablePicker } from '@/components/ui/SearchablePicker';
import { SwiftUIImagePreviewSheet } from './SwiftUIImagePreviewSheet';

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

// Safe lazy loading of expo-print and expo-sharing
let Print: any = null;
let Sharing: any = null;
try {
    Print = require('expo-print');
    Sharing = require('expo-sharing');
} catch (e) {
    // handled
}

interface CrewRequestsTabProps {
    requests: CrewRequest[];
    onAddRequest: () => void;
    onApproveRequest: (id: string) => void;
    onRejectRequest: (id: string, reason: string) => void;
    onSelectRequest: (request: CrewRequest) => void;
    projects?: Project[];
    onExportRegister?: (exportFn: () => void) => void;
    weeklyStartDate: string;
    onWeeklyStartDateChange?: (date: string) => void;
    onMoveRequestToWeek: (id: string) => void;
    onDeleteRequest: (id: string) => void;
    onViewDocument?: (html: string, title: string) => void;
    selectedRequestId?: string;
    detailContainer?: HTMLElement | null;
    onEditRequest?: (request: CrewRequest) => void;
    onCloseDetail?: () => void;
}

export function CrewRequestsTab({
    requests,
    onAddRequest,
    onApproveRequest,
    onRejectRequest,
    onSelectRequest,
    projects = INITIAL_PROJECTS,
    onExportRegister,
    weeklyStartDate,
    onWeeklyStartDateChange,
    onMoveRequestToWeek,
    onDeleteRequest,
    onViewDocument,
    selectedRequestId,
    detailContainer,
    onEditRequest,
    onCloseDetail,
}: CrewRequestsTabProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<RequestStatus | 'ALL'>('PENDING');
    const [typeFilter, setTypeFilter] = useState<RequestType | 'ALL'>('ALL');
    const [selectedProjectCode, setSelectedProjectCode] = useState<string>('ALL');
    const period = 'WEEKLY';
    const [showFilters, setShowFilters] = useState(false);
    
    const [isProjectPickerVisible, setIsProjectPickerVisible] = useState(false);
    const [isTypePickerVisible, setIsTypePickerVisible] = useState(false);

    const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);
    const [showSearch, setShowSearch] = useState(false);
    const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

    const { width: screenWidth } = useWindowDimensions();
    const isCompact = screenWidth < 360;

    const toTitleCase = (str: string) => {
        if (!str) return '';
        return str
            .toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    // Build project items for SearchablePicker
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

    // Build type items for SearchablePicker
    const typeItems = useMemo(() => [
        { id: 'ALL', label: 'All Types', sublabel: 'ALL' },
        { id: 'LEAVE', label: 'Leave', sublabel: 'LV' },
        { id: 'KASBON', label: 'Cash Advance', sublabel: 'CA' },
        { id: 'REIMBURSE', label: 'Reimburse', sublabel: 'RB' }
    ], []);

    // Type & project labels for pills
    const typePillLabel = typeFilter === 'ALL' ? (isCompact ? 'All' : 'All Types') : typeFilter === 'LEAVE' ? 'Leave' : typeFilter === 'KASBON' ? 'Cash Advance' : 'Reimburse';
    const projectPillLabel = selectedProjectCode === 'ALL' ? (isCompact ? 'All' : 'All Projects') : (selectedProjectCode.split('-')[1] || selectedProjectCode);

    const weeklyEndDate = useMemo(() => addDays(weeklyStartDate, 6), [weeklyStartDate]);

    // Calculate dynamic metrics based on selected Project, Type, and Date Range (but NOT Status)
    const metricSourceRequests = useMemo(() => {
        return requests.filter(req => {
            const matchesProject = selectedProjectCode === 'ALL' || matchProjectCode(req.projectCode, selectedProjectCode);
            const matchesType = typeFilter === 'ALL' || req.type === typeFilter;
            const matchesDate = req.startDate <= weeklyEndDate && (req.endDate || req.startDate) >= weeklyStartDate;
            const isPending = req.status === 'PENDING';

            return matchesProject && matchesType && (matchesDate || isPending);
        });
    }, [requests, selectedProjectCode, typeFilter, weeklyStartDate, weeklyEndDate]);

    const totalRequests = metricSourceRequests.length;
    const pendingCount = metricSourceRequests.filter(r => r.status === 'PENDING').length;
    const approvedCount = metricSourceRequests.filter(r => r.status === 'APPROVED').length;
    const rejectedCount = metricSourceRequests.filter(r => r.status === 'REJECTED').length;

    // Filter requests list (metricSourceRequests + search + status)
    const filteredRequests = useMemo(() => {
        return metricSourceRequests.filter(req => {
            const project = projects.find(p => matchProjectCode(p.code, req.projectCode));
            const projectName = project ? project.name.toLowerCase() : '';
            const projectCode = req.projectCode ? req.projectCode.toLowerCase() : '';
            const projectNum = req.projectCode ? (req.projectCode.split('-')[1] || '').toLowerCase() : '';
            const roleLabel = (CREW_ROLE_LABELS[req.crewRole] || req.crewRole || '').toLowerCase();
            const searchLower = search.toLowerCase();

            const matchesSearch = req.crewName.toLowerCase().includes(searchLower) ||
                req.reason.toLowerCase().includes(searchLower) ||
                roleLabel.includes(searchLower) ||
                projectCode.includes(searchLower) ||
                projectNum.includes(searchLower) ||
                projectName.includes(searchLower);

            const matchesStatus = statusFilter === 'ALL' || req.status === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [metricSourceRequests, search, statusFilter, projects]);

    const formatCurrency = (val: number) => {
        return `Rp ${val.toLocaleString('id-ID')}`;
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        // Try parsing YYYY-MM-DD
        const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (match) {
            const year = parseInt(match[1], 10);
            const monthVal = parseInt(match[2], 10);
            const day = parseInt(match[3], 10);
            return `${monthVal}/${day}/${year}`;
        }
        
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
    };

    const formatLeaveDate = (dateStr: string) => {
        if (!dateStr) return '';
        let year: number;
        let monthVal: number;
        let day: number;

        const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (match) {
            year = parseInt(match[1], 10);
            monthVal = parseInt(match[2], 10) - 1; // 0-indexed
            day = parseInt(match[3], 10);
        } else {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return dateStr;
            year = date.getFullYear();
            monthVal = date.getMonth();
            day = date.getDate();
        }

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = monthNames[monthVal];
        const currentYear = new Date().getFullYear();

        if (year === currentYear) {
            return `${day} ${month}`;
        } else {
            return `${day} ${month} ${year}`;
        }
    };

    const handleExportRequests = async () => {
        if (!Print || !Sharing) {
            alert('Export module is not available on this device.');
            return;
        }
        try {
            const rowsHtml = filteredRequests.map((req, idx) => `
                <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${idx + 1}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold;">${req.crewName}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd;">${CREW_ROLE_LABELS[req.crewRole as CrewRole] || req.crewRole}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd;">${req.projectCode || '-'}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center; font-weight: bold; color: ${req.type === 'KASBON' ? '#FF3B30' : '#34C759'};">${req.type}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right; font-weight: bold;">${req.amount ? `Rp ${req.amount.toLocaleString('id-ID')}` : '-'}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd;">${formatDate(req.startDate)}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">
                        <span style="padding: 3px 8px; border-radius: 12px; font-size: 10px; font-weight: bold; background-color: ${req.status === 'APPROVED' ? '#E8F5E9; color: #2E7D32;' : req.status === 'PENDING' ? '#FFF3E0; color: #E65100;' : '#FFEBEE; color: #C62828;'}">
                            ${req.status}
                        </span>
                    </td>
                </tr>
            `).join('');

            const htmlContent = `
                <html>
                    <head>
                        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
                        <style>
                            body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 25px; color: #333; }
                            h2 { color: #AF52DE; text-align: center; margin-bottom: 5px; }
                            .meta { text-align: center; color: #666; font-size: 13px; margin-bottom: 25px; }
                            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
                            th { background-color: #AF52DE; color: white; padding: 10px; text-align: left; }
                            td { padding: 10px; }
                        </style>
                    </head>
                    <body>
                        <h2>PT MAHARDIKA ADIDAYA - DAFTAR REQUEST REGISTRY</h2>
                        <div class="meta">
                            Filter Proyek: ${selectedProjectCode === 'ALL' ? 'Semua Proyek' : selectedProjectCode} | Filter Status: ${statusFilter === 'ALL' ? 'Semua Status' : statusFilter} | Filter Tipe: ${typeFilter === 'ALL' ? 'Semua Tipe' : typeFilter} | Total: ${filteredRequests.length} Permintaan
                        </div>
                        <table>
                            <thead>
                                <tr>
                                    <th style="width: 5%; text-align: center;">No</th>
                                    <th>Nama Pekerja</th>
                                    <th>Jabatan</th>
                                    <th>Proyek</th>
                                    <th style="text-align: center;">Tipe</th>
                                    <th style="text-align: right;">Jumlah</th>
                                    <th>Tanggal Mulai</th>
                                    <th style="width: 15%; text-align: center;">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rowsHtml}
                            </tbody>
                        </table>
                    </body>
                </html>
            `;
            const projectCodePart = (selectedProjectCode || 'ALL') === 'ALL' ? 'ALL' : ((selectedProjectCode || 'ALL').split('-')[1] || selectedProjectCode || 'ALL');
            const now = new Date();
            const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
            const filename = `${projectCodePart}_Crew_Requests_${dateStr}.pdf`;

            if (onViewDocument) {
                onViewDocument(htmlContent, filename.replace('.pdf', ''));
                return;
            }

            const { uri } = await Print.printToFileAsync({ html: htmlContent });
            const customUri = `${FileSystem.cacheDirectory}${filename}`;
            await FileSystem.copyAsync({ from: uri, to: customUri });
            await Sharing.shareAsync(customUri, { mimeType: 'application/pdf', dialogTitle: 'Crew_Requests' });
        } catch (error) {
            console.error('Error exporting requests:', error);
            alert('Failed to export requests PDF.');
        }
    };

    useEffect(() => {
        if (onExportRegister) {
            onExportRegister(handleExportRequests);
        }
    }, [filteredRequests, selectedProjectCode, statusFilter, typeFilter, onExportRegister]);

    const handleExport = () => {
        alert('Exporting requests report...');
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

    const getCardBgColor = (filterName: string, iconColor: string) => {
        const isSelected = statusFilter === filterName;
        if (!isSelected) {
            return isDark ? '#1C1C1E' : '#FFFFFF';
        }
        return isDark ? `${iconColor}45` : `${iconColor}25`;
    };

    const getCardBorderColor = (filterName: string, iconColor: string) => {
        return 'transparent';
    };

    const cardBg = isDark ? '#1C1C1E' : '#FFF';
    const cardBorder = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
    const searchBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

    const handleRejectPress = (id: string) => {
        if (Platform.OS === 'web') {
            const reason = window.prompt('Enter the reason for rejecting this request:');
            if (reason !== null) onRejectRequest(id, reason);
            return;
        }
        if (Platform.OS === 'ios') {
            Alert.prompt(
                'Reject Request',
                'Enter rejection reason:',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Reject',
                        style: 'destructive',
                        onPress: (reason?: string) => onRejectRequest(id, reason ?? ''),
                    },
                ],
                'plain-text',
            );
        } else {
            Alert.alert(
                'Reject Request',
                'Are you sure you want to reject this request?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Reject',
                        style: 'destructive',
                        onPress: () => onRejectRequest(id, ''),
                    },
                ],
            );
        }
    };

    const handleDeletePress = (id: string) => {
        if (Platform.OS === 'web') {
            if (window.confirm('Delete this request? This cannot be undone.')) onDeleteRequest(id);
            return;
        }
        Alert.alert(
            'Delete Request',
            'Are you sure you want to delete this request? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => onDeleteRequest(id),
                },
            ],
        );
    };

    const handleApprovePress = (id: string) => {
        if (Platform.OS === 'web') {
            if (window.confirm('Approve this request?')) onApproveRequest(id);
            return;
        }
        Alert.alert(
            'Approve Request',
            'Are you sure you want to approve this request?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Approve',
                    onPress: () => onApproveRequest(id),
                },
            ],
        );
    };

    const renderRequestDetail = (req: CrewRequest) => {
        const typeBadgeColor = req.type === 'LEAVE' ? '#AF52DE' : req.type === 'KASBON' ? '#FF3B30' : '#FF9500';
        return (<View style={s.cardBodyExpanded}>
                                        {/* Unified Details Box (Notes, Attachments, Rejection Reason, Date) */}
                                        <View style={[
                                            s.unifiedDetailsBox,
                                            {
                                                backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)',
                                                borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                                            }
                                        ]}>
                                            {/* Notes Section */}
                                            <View style={s.boxSection}>
                                                <Text style={[s.boxSectionTitle, { color: subtextColor }]}>Notes</Text>
                                                <Text style={[s.reasonText, { color: textColor }]}>
                                                    {req.reason}
                                                </Text>
                                            </View>

                                            {/* Proof Attachments Section */}
                                            {req.proofUrl && (
                                                <View style={[s.boxSection, s.boxSectionBorder, { borderColor: cardBorder }]}>
                                                    <Text style={[s.boxSectionTitle, { color: subtextColor }]}>Attachments</Text>
                                                    <View style={s.proofList}>
                                                        {req.proofUrl.split(',').filter(Boolean).map((url, idx) => {
                                                            const cleanUrl = url.trim();
                                                            const filename = cleanUrl.split('/').pop()?.split('?')[0] || `Proof ${idx + 1}`;
                                                            return (
                                                                <TouchableOpacity
                                                                    key={idx}
                                                                    style={[
                                                                        s.proofPill,
                                                                        {
                                                                            backgroundColor: isDark ? `${typeBadgeColor}1A` : `${typeBadgeColor}0A`,
                                                                            borderColor: isDark ? `${typeBadgeColor}33` : `${typeBadgeColor}1F`,
                                                                            borderWidth: 1,
                                                                        }
                                                                    ]}
                                                                    onPress={() => setPreviewImageUrl(cleanUrl)}
                                                                    activeOpacity={0.7}
                                                                >
                                                                    <Ionicons name="document-attach" size={14} color={typeBadgeColor} style={{ marginRight: 6 }} />
                                                                    <Text style={[s.proofPillText, { color: typeBadgeColor }]} numberOfLines={1}>
                                                                        {filename}
                                                                    </Text>
                                                                </TouchableOpacity>
                                                            );
                                                        })}
                                                    </View>
                                                </View>
                                            )}

                                            {/* Rejection Reason Box */}
                                            {req.rejectReason && (
                                                <View style={[s.boxSection, s.boxSectionBorder, { borderColor: cardBorder }]}>
                                                    <Text style={[s.boxSectionTitle, { color: '#FF3B30' }]}>Rejection Reason</Text>
                                                    <Text style={[s.rejectBoxText, { color: '#FF3B30' }]}>{req.rejectReason}</Text>
                                                </View>
                                            )}

                                            {/* Requested Date (inside box) */}
                                            <View style={[s.boxSection, s.boxSectionBorder, { borderColor: cardBorder }]}>
                                                <Text style={[s.footerDateText, { color: subtextColor }]}>
                                                    Requested on {formatLeaveDate(req.createdAt)}{req.movedToPeriod ? `, moved to periode ${req.movedToPeriod}` : ''}
                                                </Text>
                                            </View>

                                            {req.status === 'PENDING' && (req.startDate < weeklyStartDate || (req.endDate || req.startDate) > weeklyEndDate) && (
                                                <View style={{ marginTop: 12, marginBottom: 4 }}>
                                                    <PillButton
                                                        label="Move to Current Period"
                                                        onPress={() => {
                                                            if (Platform.OS === 'web') {
                                                                if (window.confirm('Move this pending request to the current payroll week?')) onMoveRequestToWeek(req.id);
                                                                return;
                                                            }
                                                            Alert.alert(
                                                                'Move Request',
                                                                'Are you sure you want to move this pending request to the current payroll week?',
                                                                [
                                                                    { text: 'Cancel', style: 'cancel' },
                                                                    {
                                                                        text: 'Move',
                                                                        onPress: () => onMoveRequestToWeek(req.id),
                                                                    },
                                                                ],
                                                            );
                                                        }}
                                                        variant="solid"
                                                        color="blue"
                                                        noShadow
                                                        icon={<Ionicons name="swap-horizontal" size={15} color="#FFFFFF" />}
                                                    />
                                                </View>
                                            )}
                                        </View>

                                        {/* Action Buttons Row */}
                                        <View style={s.actionRowCombined}>
                                            {/* Delete */}
                                            <TouchableOpacity
                                                style={[
                                                    s.circleActionBtn,
                                                    {
                                                        backgroundColor: isDark ? 'rgba(255,59,48,0.12)' : 'rgba(255,59,48,0.08)',
                                                        borderColor: isDark ? 'rgba(255,59,48,0.2)' : 'rgba(255,59,48,0.15)'
                                                    }
                                                ]}
                                                onPress={() => handleDeletePress(req.id)}
                                                activeOpacity={0.7}
                                            >
                                                <Ionicons name="trash-outline" size={16} color="#FF3B30" />
                                            </TouchableOpacity>

                                            {/* Edit */}
                                            <TouchableOpacity
                                                style={[
                                                    s.circleActionBtn,
                                                    {
                                                        borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
                                                        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'
                                                    }
                                                ]}
                                                onPress={() => (onEditRequest || onSelectRequest)(req)}
                                                activeOpacity={0.7}
                                            >
                                                <Ionicons name="pencil-outline" size={15} color={textColor} /><Text style={{ color: textColor, marginLeft: 6, fontWeight: '600' }}>Edit</Text>
                                            </TouchableOpacity>

                                            {/* Reject & Approve */}
                                            {req.status === 'PENDING' && (
                                                <>
                                                    <PillButton
                                                        label="Reject"
                                                        onPress={() => handleRejectPress(req.id)}
                                                        variant="muted"
                                                        color="red"
                                                        style={{ flex: 1 }}
                                                        noShadow
                                                        icon={<Ionicons name="close-circle" size={15} color="#FF3B30" />}
                                                    />
                                                    <PillButton
                                                        label="Approve"
                                                        onPress={() => handleApprovePress(req.id)}
                                                        variant="solid"
                                                        color="green"
                                                        style={{ flex: 1 }}
                                                        noShadow
                                                        icon={<Ionicons name="checkmark-circle" size={15} color="#FFFFFF" />}
                                                    />
                                                </>
                                            )}
                                        </View>
                                    </View>);
    };
    const selectedRequest = requests.find(req => req.id === selectedRequestId);

    return (
        <View style={s.container}>
            {/* Top Summary Metrics Cards Row */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginHorizontal: -20, marginBottom: 12 }}
                contentContainerStyle={s.metricsScroll}
            >
                {/* Card 1: Total */}
                <TouchableOpacity
                    style={[
                        s.metricCard,
                        {
                            backgroundColor: getCardBgColor('ALL', '#007AFF'),
                            borderColor: 'transparent',
                            borderWidth: 0,
                        }
                    ]}
                    onPress={() => { setStatusFilter('ALL'); setExpandedRequestId(null); }}
                    activeOpacity={0.8}
                >
                    <View style={s.metricHeader}>
                        <View style={[s.metricIconContainer, { backgroundColor: 'rgba(0,122,255,0.1)' }]}>
                            <Ionicons name="document-text" size={18} color="#007AFF" />
                        </View>
                        <Text style={[s.metricValue, { color: textColor }]}>{totalRequests}</Text>
                    </View>
                    <Text style={[s.metricTitle, { color: textColor }]} numberOfLines={1}>Total</Text>
                </TouchableOpacity>

                {/* Card 2: Pending */}
                <TouchableOpacity
                    style={[
                        s.metricCard,
                        {
                            backgroundColor: getCardBgColor('PENDING', '#FF9500'),
                            borderColor: 'transparent',
                            borderWidth: 0,
                        }
                    ]}
                    onPress={() => { setStatusFilter('PENDING'); setExpandedRequestId(null); }}
                    activeOpacity={0.8}
                >
                    <View style={s.metricHeader}>
                        <View style={[s.metricIconContainer, { backgroundColor: 'rgba(255,149,0,0.1)' }]}>
                            <Ionicons name="time" size={18} color="#FF9500" />
                        </View>
                        <Text style={[s.metricValue, { color: textColor }]}>{pendingCount}</Text>
                    </View>
                    <Text style={[s.metricTitle, { color: textColor }]} numberOfLines={1}>Pending</Text>
                </TouchableOpacity>

                {/* Card 3: Approved */}
                <TouchableOpacity
                    style={[
                        s.metricCard,
                        {
                            backgroundColor: getCardBgColor('APPROVED', '#34C759'),
                            borderColor: 'transparent',
                            borderWidth: 0,
                        }
                    ]}
                    onPress={() => { setStatusFilter('APPROVED'); setExpandedRequestId(null); }}
                    activeOpacity={0.8}
                >
                    <View style={s.metricHeader}>
                        <View style={[s.metricIconContainer, { backgroundColor: 'rgba(52,199,89,0.1)' }]}>
                            <Ionicons name="checkmark-circle" size={18} color="#34C759" />
                        </View>
                        <Text style={[s.metricValue, { color: textColor }]}>{approvedCount}</Text>
                    </View>
                    <Text style={[s.metricTitle, { color: textColor }]} numberOfLines={1}>Approved</Text>
                </TouchableOpacity>

                {/* Card 4: Rejected */}
                <TouchableOpacity
                    style={[
                        s.metricCard,
                        {
                            backgroundColor: getCardBgColor('REJECTED', '#FF3B30'),
                            borderColor: 'transparent',
                            borderWidth: 0,
                        }
                    ]}
                    onPress={() => { setStatusFilter('REJECTED'); setExpandedRequestId(null); }}
                    activeOpacity={0.8}
                >
                    <View style={s.metricHeader}>
                        <View style={[s.metricIconContainer, { backgroundColor: 'rgba(255,59,48,0.1)' }]}>
                            <Ionicons name="close-circle" size={18} color="#FF3B30" />
                        </View>
                        <Text style={[s.metricValue, { color: textColor }]}>{rejectedCount}</Text>
                    </View>
                    <Text style={[s.metricTitle, { color: textColor }]} numberOfLines={1}>Rejected</Text>
                </TouchableOpacity>
            </ScrollView>

            {/* ─── Finance-style control row: Project pill + Type pill + Date Navigator + Search icon fitted to screen width ─── */}
            <View style={s.controlRow}>
                {/* Project pill */}
                <TouchableOpacity
                    style={[s.controlPill, { flex: 1, backgroundColor: cardBg, borderColor: searchBorder }]}
                    onPress={() => setIsProjectPickerVisible(true)}
                    activeOpacity={0.8}
                >
                    <Text style={[s.controlPillText, { color: textColor }]} numberOfLines={1}>
                        {projectPillLabel}
                    </Text>
                    <Ionicons name="chevron-down" size={12} color={subtextColor} />
                </TouchableOpacity>

                {/* Type pill */}
                <TouchableOpacity
                    style={[s.controlPill, { flex: 1, backgroundColor: cardBg, borderColor: searchBorder }]}
                    onPress={() => setIsTypePickerVisible(true)}
                    activeOpacity={0.8}
                >
                    <Text style={[s.controlPillText, { color: textColor }]} numberOfLines={1}>
                        {typePillLabel}
                    </Text>
                    <Ionicons name="chevron-down" size={12} color={subtextColor} />
                </TouchableOpacity>

                {/* Date Navigator */}
                <View style={[s.dateNavigatorPill, { minWidth: isCompact ? 95 : 110, backgroundColor: cardBg, borderColor: searchBorder }]}>
                    <TouchableOpacity 
                        style={s.navArrow} 
                        hitSlop={10}
                        onPress={() => {
                            onWeeklyStartDateChange && onWeeklyStartDateChange(addDays(weeklyStartDate, -7));
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
                            onWeeklyStartDateChange && onWeeklyStartDateChange(addDays(weeklyStartDate, 7));
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
                            borderColor: showSearch ? '#007AFF' : searchBorder,
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
                        color={showSearch ? '#007AFF' : textColor}
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
                        placeholder="Search by name, role, project..."
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

            {/* Requests List */}
            {filteredRequests.length > 0 ? (
                <View style={s.list}>
                    {filteredRequests.map(req => {
                        let statusColor = '#FF9500'; // Pending
                        let statusBg = 'rgba(255,149,0,0.12)';
                        let statusIcon = 'time-outline';

                        if (req.status === 'APPROVED') {
                            statusColor = '#34C759';
                            statusBg = 'rgba(52,199,89,0.12)';
                            statusIcon = 'checkmark-circle-outline';
                        } else if (req.status === 'REJECTED') {
                            statusColor = '#FF3B30';
                            statusBg = 'rgba(255,59,48,0.12)';
                            statusIcon = 'close-circle-outline';
                        }

                        // Type details - Distinct badge coloring based on request type
                        let typeBadgeColor = '#AF52DE';
                        let typeBadgeBg = 'rgba(175,82,222,0.08)';

                        if (req.type === 'LEAVE') {
                            typeBadgeColor = '#AF52DE';
                            typeBadgeBg = isDark ? 'rgba(175,82,222,0.15)' : 'rgba(175,82,222,0.08)';
                        } else if (req.type === 'KASBON') {
                            typeBadgeColor = '#FF3B30';
                            typeBadgeBg = isDark ? 'rgba(255,59,48,0.15)' : 'rgba(255,59,48,0.08)';
                        } else if (req.type === 'REIMBURSE') {
                            typeBadgeColor = '#FF9500';
                            typeBadgeBg = isDark ? 'rgba(255,149,0,0.15)' : 'rgba(255,149,0,0.08)';
                        }

                        let detailsText = '';
                        if (req.type === 'LEAVE') {
                            detailsText = `${formatLeaveDate(req.startDate)} → ${req.endDate ? formatLeaveDate(req.endDate) : 'Ongoing'}`;
                        } else if (req.type === 'KASBON') {
                            detailsText = req.amount ? formatCurrency(req.amount) : '';
                        } else if (req.type === 'REIMBURSE') {
                            detailsText = req.amount ? formatCurrency(req.amount) : '';
                        }

                        // Initials for avatar
                        const nameParts = req.crewName.split(' ');
                        const initials = nameParts.length >= 2
                            ? nameParts[0][0] + nameParts[1][0]
                            : req.crewName.slice(0, 2).toUpperCase();

                        const isSelected = req.id === selectedRequestId;
                        return (
                            <View
                                key={req.id}
                                style={[
                                    s.requestCard,
                                    { backgroundColor: cardBg, borderColor: cardBorder },
                                    isSelected && {
                                        borderColor: '#8B5CF6',
                                        backgroundColor: isDark ? 'rgba(139, 92, 246, 0.12)' : 'rgba(139, 92, 246, 0.08)',
                                        borderWidth: 1.5,
                                    }
                                ]}
                            >
                                {/* Touchable Card Header (Lines 1 & 2) */}
                                <TouchableOpacity
                                    style={s.cardHeaderTouch}
                                    onPress={() => {
                                        onSelectRequest(req);
                                        if (!onEditRequest) setExpandedRequestId(expandedRequestId === req.id ? null : req.id);
                                    }}
                                    activeOpacity={0.7}
                                >
                                    {/* Line 1: Avatar, Name, Role + Project Badge (inline like Directory) */}
                                    <View style={s.cardHeaderTopRow}>
                                        <View style={s.crewInfo}>
                                            <View style={[s.avatar, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                                                <Text style={[s.avatarText, { color: textColor }]}>{initials}</Text>
                                            </View>
                                            <View>
                                                <Text style={[s.crewName, { color: textColor }]}>
                                                    {toTitleCase(req.crewName)}
                                                </Text>
                                                <View style={s.metadataRow}>
                                                    <Text style={[s.roleText, { color: subtextColor }]}>
                                                        {CREW_ROLE_LABELS[req.crewRole]}
                                                    </Text>
                                                    {req.projectCode && (
                                                        <View style={[s.projectBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
                                                            <Text style={[s.projectBadgeText, { color: subtextColor }]}>
                                                                {req.projectCode.split('-')[1] || req.projectCode}
                                                            </Text>
                                                        </View>
                                                    )}
                                                </View>
                                            </View>
                                        </View>
                                        
                                        <View style={s.statusBadgeContainer}>
                                            <View style={[s.statusBadge, { backgroundColor: statusBg }]}>
                                                <Text style={[s.statusBadgeText, { color: statusColor }]}>
                                                    {req.status}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
 
                                    {/* Line 2: Request Type and duration/nominal amount */}
                                    <View style={s.detailsRowCollapsed}>
                                        <View style={s.badgesGroup}>
                                            <View style={[s.typeBadge, { backgroundColor: typeBadgeBg }]}>
                                                <Text style={[s.typeBadgeText, { color: typeBadgeColor }]}>
                                                    {req.type}
                                                </Text>
                                            </View>
                                        </View>
                                        <Text style={[s.detailsText, { color: textColor }]} numberOfLines={1}>
                                            {detailsText}
                                        </Text>
                                    </View>
                                </TouchableOpacity>

                                {!onEditRequest && expandedRequestId === req.id && renderRequestDetail(req)}
                            </View>
                        );
                    })}
                </View>
            ) : (
                <View style={s.emptyState}>
                    <Ionicons name="document-text-outline" size={48} color={subtextColor} style={{ opacity: 0.5 }} />
                    <Text style={[s.emptyText, { color: subtextColor }]}>No requests found</Text>
                </View>
            )}

            {/* Bottom Sheet Pickers */}
            <SearchablePicker
                visible={isProjectPickerVisible}
                onClose={() => setIsProjectPickerVisible(false)}
                onSelect={(item) => {
                    setSelectedProjectCode(item.id);
                    setExpandedRequestId(null);
                }}
                items={projectItems}
                title="Select Project"
                selectedId={selectedProjectCode}
                tintColor="#AF52DE"
            />

            <SearchablePicker
                visible={isTypePickerVisible}
                onClose={() => setIsTypePickerVisible(false)}
                onSelect={(item) => {
                    setTypeFilter(item.id as RequestType | 'ALL');
                    setExpandedRequestId(null);
                }}
                items={typeItems}
                title="Select Type"
                selectedId={typeFilter}
                tintColor="#AF52DE"
            />

            {Platform.OS === 'web' && detailContainer && selectedRequest && require('react-dom').createPortal(
                <View style={{ flex: 1 }}>
                    <View style={[DESKTOP_PANEL_HEADER, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
                        <Text style={[DESKTOP_PANEL_TITLE, { flex: 1, color: textColor }]}>Request Details</Text>
                        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close request details" onPress={onCloseDetail} style={[DESKTOP_PANEL_ACTION, { backgroundColor: cardBg }]}>
                            <Ionicons name="close" size={22} color={textColor} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView contentContainerStyle={{ padding: 24, maxWidth: 820, width: '100%', alignSelf: 'center', gap: 20 }}>
                        <View style={{ backgroundColor: cardBg, borderColor: cardBorder, borderWidth: 1, borderRadius: 20, padding: 20, gap: 12 }}>
                            <Text style={{ color: textColor, fontSize: 22, fontWeight: '700' }}>{toTitleCase(selectedRequest.crewName)}</Text>
                            <Text style={{ color: subtextColor, fontSize: 14 }}>{CREW_ROLE_LABELS[selectedRequest.crewRole]} · {selectedRequest.projectCode}</Text>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 16 }}>
                                <Text style={{ color: '#8B5CF6', fontWeight: '700', fontSize: 13 }}>{selectedRequest.type === 'KASBON' ? 'CASH ADVANCE' : selectedRequest.type}</Text>
                                <Text style={{ color: selectedRequest.status === 'APPROVED' ? '#34C759' : selectedRequest.status === 'REJECTED' ? '#FF3B30' : '#FF9500', fontWeight: '700', fontSize: 13 }}>{selectedRequest.status}</Text>
                            </View>
                            <Text style={{ color: textColor, fontSize: 28, fontWeight: '700' }}>{selectedRequest.type === 'LEAVE' ? formatLeaveDate(selectedRequest.startDate) + ' → ' + (selectedRequest.endDate ? formatLeaveDate(selectedRequest.endDate) : 'Ongoing') : formatCurrency(selectedRequest.amount || 0)}</Text>
                            {selectedRequest.type !== 'LEAVE' && <Text style={{ color: subtextColor, fontSize: 14 }}>Request date · {formatLeaveDate(selectedRequest.startDate)}</Text>}
                        </View>
                        {renderRequestDetail(selectedRequest)}
                    </ScrollView>
                </View>, detailContainer
            )}

            {/* Image Preview Component */}
            <SwiftUIImagePreviewSheet
                isOpened={!!previewImageUrl}
                onClose={() => setPreviewImageUrl(null)}
                imageUrl={previewImageUrl}
                title="Attachment Preview"
            />
        </View>
    );
}

const s = StyleSheet.create({
    container: {
        flex: 1,
    },
    metadataRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 2,
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
    proofSection: {
        marginTop: 12,
        marginLeft: 56,
        gap: 6,
    },
    proofTitle: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.8,
    },
    proofList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    proofPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    proofPillText: {
        fontSize: 12,
        fontWeight: '600',
        maxWidth: 160,
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
    unifiedControlRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 8,
    },
    projectDropdownSide: {
        flex: 1.1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: 38,
        borderRadius: 19,
        borderWidth: 1,
        paddingHorizontal: 10,
    },
    projectDropdownText: {
        fontSize: 12,
        fontWeight: '800',
        flex: 1,
        marginRight: 4,
    },
    dateNavigatorPillSide: {
        flex: 1.2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 38,
        borderRadius: 19,
        borderWidth: 1,
        paddingHorizontal: 6,
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
    statusSelectorRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
        marginBottom: 16,
    },
    statusTabBtn: {
        paddingVertical: 10,
        paddingHorizontal: 4,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    statusTabLabel: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    list: {
        gap: 12,
        marginBottom: 24,
    },
    requestCard: {
        borderRadius: 24,
        borderWidth: 0,
        borderColor: 'transparent',
        overflow: 'hidden',
    },
    cardBodyExpanded: {
        paddingHorizontal: 16,
        paddingBottom: 16,
        paddingTop: 0,
        gap: 12,
    },
    cardHeaderTouch: {
        padding: 16,
    },
    cardHeaderTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    detailsRowCollapsed: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginLeft: 56,
        marginTop: 8,
    },
    statusBadgeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    crewInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
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
    roleText: {
        fontSize: 12,
        fontWeight: '600',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusBadgeText: {
        fontSize: 9,
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    divider: {
        height: 1,
        marginVertical: 12,
    },
    detailsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    badgesGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    typeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    typeBadgeText: {
        fontSize: 11,
        fontWeight: '800',
    },
    projectCodeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    projectCodeBadgeText: {
        fontSize: 11,
        fontWeight: '700',
    },
    detailsText: {
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: -0.1,
    },
    unifiedDetailsBox: {
        padding: 14,
        borderRadius: 16,
        borderWidth: 1,
    },
    boxSection: {
        gap: 4,
    },
    boxSectionBorder: {
        borderTopWidth: 1,
        paddingTop: 12,
        marginTop: 12,
    },
    boxSectionTitle: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    reasonText: {
        fontSize: 13,
        lineHeight: 18,
        fontWeight: '500',
    },
    rejectBoxText: {
        fontSize: 12,
        lineHeight: 16,
        fontWeight: '500',
    },
    footerDateText: {
        fontSize: 11,
        fontWeight: '500',
    },
    actionRowCombined: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginTop: 12,
    },
    circleActionBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pendingActionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginTop: 12,
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
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 38,
        borderRadius: 19,
        borderWidth: 1,
        paddingHorizontal: 12,
        marginBottom: 12,
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

    // Finance-style control row
    controlRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
        gap: 8,
    },
    controlPill: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 38,
        borderRadius: 19,
        borderWidth: 1,
        paddingHorizontal: 12,
    },
    controlPillText: {
        fontSize: 13,
        fontWeight: '600',
        flex: 1,
        marginRight: 4,
    },
    dateNavigatorPill: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        height: 38,
        borderRadius: 19,
        borderWidth: 1,
        paddingHorizontal: 8,
    },
    typeChipScroll: {
        gap: 6,
        paddingRight: 4,
    },
    typeChip: {
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    typeChipText: {
        fontSize: 13,
        fontWeight: '600',
    },
    searchIconBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
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
    previewOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    previewSheet: {
        height: '85%',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        overflow: 'hidden',
    },
    previewGrabber: {
        width: 36,
        height: 5,
        borderRadius: 3,
        backgroundColor: 'rgba(128,128,128,0.4)',
        alignSelf: 'center',
        marginTop: 10,
        marginBottom: 6,
    },
    previewHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    previewTitle: {
        fontSize: 17,
        fontWeight: '700',
        flex: 1,
        marginRight: 12,
    },
    previewCloseBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    previewImageContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    previewImage: {
        width: '100%',
        height: '100%',
        borderRadius: 12,
    },
});
