import { DESKTOP_LIST_PANE, DESKTOP_PANEL_HEADER, DESKTOP_PANEL_TITLE_ROW, DESKTOP_PANEL_TITLE, DESKTOP_PANEL_ACTION } from '@/constants/desktopLayout';
import { HeaderBlurBackground } from '@/components/ui/HeaderBlurBackground';
import { HeaderToolbar, HeaderToolbarAction } from '@/components/ui/HeaderToolbar';
import { WebFinderHeader } from '@/components/ui/WebFinderHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { SwipeTabWrapper } from '@/components/ui/SwipeTabWrapper';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { Stack } from 'expo-router';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { TextInput, RefreshControl, ScrollView, StyleSheet, Text, View, Platform, TouchableOpacity, Modal, Alert, useWindowDimensions } from 'react-native';
import { SearchablePicker } from '@/components/ui/SearchablePicker';
import ContextMenu from '@/components/ui/PlatformContextMenu';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUserContext } from '@/context/UserProvider';
import { useTenantContext } from '@/context/TenantContext';
import { GlassView } from '@/components/ui/GlassView';
import { format, subMonths, addMonths } from 'date-fns';
import { sharePersonalRequests, generatePersonalRequestsHtml } from '@/lib/shareHelper';
import { fetchAllRequestsAndRank } from '@/lib/api/attendance';
import { CrewDocumentPreview } from '@/components/crew/CrewDocumentPreview';

import { UnauthenticatedView } from '@/components/ui/UnauthenticatedView';

// Subcomponents
import { ClockOverview } from '@/components/clock/ClockOverview';
import { ClockTeamOverview } from '@/components/clock/ClockTeamOverview';
import { ClockTimesheets } from '@/components/clock/ClockTimesheets';
import { ClockTimesheetDetailPane } from '@/components/clock/ClockTimesheetDetailPane';
import { ClockLeaveRequests } from '@/components/clock/ClockLeaveRequests';
import { ClockOvertime } from '@/components/clock/ClockOvertime';
import { ClockBusinessTrips } from '@/components/clock/ClockBusinessTrips';
import { ClockCorrections } from '@/components/clock/ClockCorrections';
import { ClockApprovals } from '@/components/clock/ClockApprovals';
import { ClockTeamSetupTab, ClockSetupModule } from '@/components/clock/setup/ClockTeamSetupTab';
import { ClockSetupDetailPane } from '@/app/clock-setup/[id]';
import { SwiftUIClockNewRequestSheet } from '@/components/clock/SwiftUIClockNewRequestSheet';
import { SwiftUIImagePreviewSheet } from '@/components/crew/SwiftUIImagePreviewSheet';
import { ClockLeaveDetailSheet } from '@/components/clock/ClockLeaveDetailSheet';
import { ClockOvertimeDetailSheet } from '@/components/clock/ClockOvertimeDetailSheet';
import { ClockTripDetailSheet } from '@/components/clock/ClockTripDetailSheet';
import { ClockCorrectionDetailSheet } from '@/components/clock/ClockCorrectionDetailSheet';
import { LeaveRequestModal } from '@/components/clock/LeaveRequestModal';
import { OvertimeModal } from '@/components/clock/OvertimeModal';
import { BusinessTripModal } from '@/components/clock/BusinessTripModal';
import { AttendanceCorrectionModal } from '@/components/clock/AttendanceCorrectionModal';
import { AttendanceRecord } from '@/lib/api/attendance';

export default function ClockScreen() {
    const { width } = useWindowDimensions();
    const isDesktopWeb = Platform.OS === 'web' && width >= 768;
    const insets = useSafeAreaInsets();
    const { refreshing, onRefresh } = usePullToRefresh();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';

    const { profile, user, isAuthenticated } = useUserContext();
    const { activeTenant } = useTenantContext();

    const [activeSegment, setActiveSegment] = useState('today');
    const [viewMode, setViewMode] = useState<'personal' | 'team'>('personal');
    const [requestType, setRequestType] = useState<'all' | 'leaves' | 'overtime' | 'trips' | 'corrections'>('all');
    const [selectedRequestMember, setSelectedRequestMember] = useState<string>('');
    const [requestSearchQuery, setRequestSearchQuery] = useState<string>('');
    const [isSearchActive, setIsSearchActive] = useState<boolean>(false);
    const [isTypePickerOpen, setIsTypePickerOpen] = useState<boolean>(false);
    const [isRequestMemberPickerOpen, setIsRequestMemberPickerOpen] = useState<boolean>(false);
    const [requestMemberNames, setRequestMemberNames] = useState<string[]>([]);
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const [leaveCount, setLeaveCount] = useState<number | null>(null);
    const [overtimeCount, setOvertimeCount] = useState<number | null>(null);
    const [tripCount, setTripCount] = useState<number | null>(null);
    const [correctionCount, setCorrectionCount] = useState<number | null>(null);
    const [isCorrectionModalVisible, setIsCorrectionModalVisible] = useState(false);
    
    // Timesheet Desktop selection and correction states
    const [selectedTimesheetRecord, setSelectedTimesheetRecord] = useState<AttendanceRecord | null>(null);
    const [selectedRequestItem, setSelectedRequestItem] = useState<{
        type: 'leave' | 'overtime' | 'trip' | 'correction';
        item: any;
    } | null>(null);
    const [timesheetPeriodData, setTimesheetPeriodData] = useState<{
        records: AttendanceRecord[];
        stats: any;
        teamStats: any;
        periodLabel: string;
    } | null>(null);
    const [timesheetCorrectionRecord, setTimesheetCorrectionRecord] = useState<AttendanceRecord | null>(null);
    const [isTimesheetCorrectionOpen, setIsTimesheetCorrectionOpen] = useState(false);
    const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);
    const [isPhotoPreviewOpen, setIsPhotoPreviewOpen] = useState(false);

    const isAllRequestsEmpty = leaveCount === 0 && overtimeCount === 0 && tripCount === 0 && correctionCount === 0;

    useEffect(() => {
        if (activeSegment === 'requests') {
            fetchAllRequestsAndRank(viewMode === 'personal' ? user?.id : undefined).then(({ leaves, overtimes, trips, corrections }) => {
                const set = new Set<string>();
                leaves.forEach(l => l.userName && set.add(l.userName));
                overtimes.forEach(o => o.userName && set.add(o.userName));
                trips.forEach(t => t.userName && set.add(t.userName));
                (corrections || []).forEach(c => c.userName && set.add(c.userName));
                setRequestMemberNames(Array.from(set).sort());
            }).catch(console.error);
        }
    }, [activeSegment, viewMode, user?.id, currentMonth]);

    const typeItems = useMemo(() => [
        { id: 'all', label: 'All Types' },
        { id: 'leaves', label: 'Leaves' },
        { id: 'overtime', label: 'Overtime' },
        { id: 'trips', label: 'Business Trips' },
        { id: 'corrections', label: 'Attendance Corrections' },
    ], []);

    const requestMemberItems = useMemo(() => [
        { id: 'ALL', label: 'All Members' },
        ...requestMemberNames.map(name => ({ id: name, label: name }))
    ], [requestMemberNames]);

    const [docPreviewHtml, setDocPreviewHtml] = useState<string | null>(null);
    const [docPreviewTitle, setDocPreviewTitle] = useState<string>('');
    const [docPreviewVisible, setDocPreviewVisible] = useState(false);

    const shareHandlers = useRef<Record<string, () => void>>({});

    const handleSharePersonalRequests = async () => {
        if (!user?.id) return;
        try {
            const { leaves, overtimes, trips } = await fetchAllRequestsAndRank(user.id);
            const selectedMonthStr = format(currentMonth, 'yyyy-MM');
            const filteredLeaves = leaves.filter(l => l.startDate.startsWith(selectedMonthStr));
            const filteredOvertimes = overtimes.filter(o => o.date.startsWith(selectedMonthStr));
            const filteredTrips = trips.filter(t => t.startDate.startsWith(selectedMonthStr));

            const now = new Date();
            const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
            const namePart = (profile?.full_name || 'Employee').replace(/\s+/g, '_');
            const title = `${namePart}_Personal_Requests_${dateStr}`;
            const tenantInfo = activeTenant ? {
                name: activeTenant.branding_name || activeTenant.name,
                logoUrl: activeTenant.branding_logo_url || activeTenant.logo_url,
                companyCode: activeTenant.company_code,
                primaryColor: activeTenant.primary_color,
                slug: activeTenant.slug
            } : undefined;
            const html = generatePersonalRequestsHtml(
                filteredLeaves,
                filteredOvertimes,
                filteredTrips,
                currentMonth,
                profile?.full_name || user?.email || 'Employee',
                tenantInfo
            );

            setDocPreviewHtml(html);
            setDocPreviewTitle(title);
            setDocPreviewVisible(true);
        } catch (e: any) {
            Alert.alert("Gagal Share", e.message);
        }
    };

    const handleExportPress = () => {
        if (activeSegment === 'requests' && viewMode === 'personal') {
            handleSharePersonalRequests();
            return;
        }
        const activeKey = activeSegment === 'requests'
            ? `${activeSegment}-${viewMode}-${requestType}`
            : `${activeSegment}-${viewMode}`;
        
        const handler = shareHandlers.current[activeKey];
        if (handler) {
            handler();
        } else {
            Alert.alert("Laporan belum siap", "Mohon tunggu hingga data selesai dimuat.");
        }
    };

    const handlePrevMonth = () => {
        setCurrentMonth(prev => subMonths(prev, 1));
    };
    const handleNextMonth = () => {
        setCurrentMonth(prev => addMonths(prev, 1));
    };

    const [isRequestSelectorVisible, setIsRequestSelectorVisible] = useState(false);
    const [isLeaveModalVisible, setIsLeaveModalVisible] = useState(false);
    const [isOvertimeModalVisible, setIsOvertimeModalVisible] = useState(false);
    const [isTripModalVisible, setIsTripModalVisible] = useState(false);

    // Management Role Check
    const isManager = useMemo(() => {
        const role = profile?.role || user?.user_metadata?.role;
        if (!role) return false;
        const MANAGEMENT_ROLES = ["superadmin", "admin", "administrator", "supervisor", "manager", "hr", "pm", "management", "ceo", "owner", "finance"];
        return MANAGEMENT_ROLES.includes(String(role).toLowerCase());
    }, [profile, user]);

    useEffect(() => {
        if (!isManager && viewMode !== 'personal') {
            setViewMode('personal');
        }
    }, [isManager, viewMode]);

    // Build segments dynamically (All filled icon version)
    const segments = useMemo(() => {
        const base = [
            { id: 'today', label: 'Today', icon: 'clock.fill' },
            { id: 'timesheets', label: 'Timesheets', icon: 'calendar' },
            { id: 'requests', label: viewMode === 'personal' ? 'Requests' : 'Approvals', icon: 'tray.fill' },
        ];
        if (viewMode === 'team') {
            base.push({ id: 'setup', label: 'Setup', icon: 'gearshape.fill' });
        }
        return base;
    }, [viewMode]);

    const handleSegmentChange = (id: string) => {
        setActiveSegment(id);
    };

    const toolbarActions = useMemo<HeaderToolbarAction[]>(() => {
        if (!isAuthenticated) return [];
        const list: HeaderToolbarAction[] = [];

        // 1. Scope toggle (Team/Personal) - Filled icons
        const hasScopeToggle = isManager;
        if (hasScopeToggle) {
            list.push({
                id: 'scope',
                icon: viewMode === 'personal' ? 'person' : 'people',
                image: viewMode === 'personal' ? 'person.fill' : 'person.2.fill',
                tintColor: textColor,
                onPress: () => {
                    const nextMode = viewMode === 'personal' ? 'team' : 'personal';
                    if (nextMode === 'personal' && activeSegment === 'setup') {
                        setActiveSegment('today');
                    }
                    setViewMode(nextMode);
                },
                title: viewMode === 'personal' ? 'Personal View' : 'Team View'
            });
        }

        // 2. Segment specific actions - Filled icons
        if (activeSegment === 'today' || activeSegment === 'timesheets' || activeSegment === 'requests') {
            if (activeSegment !== 'today' || viewMode === 'team') {
                list.push({
                    id: 'export',
                    icon: 'share-outline',
                    image: 'square.and.arrow.up',
                    tintColor: textColor,
                    onPress: handleExportPress,
                    title: 'Export'
                });
            }
            list.push({
                id: 'add-req',
                icon: 'add',
                image: 'plus',
                isPrimary: true,
                tintColor: '#FFFFFF',
                buttonStyle: { backgroundColor: '#0EA5E9' },
                title: 'Add Request',
                menuActions: [
                    { title: 'Leave Request', systemIcon: 'calendar.badge.plus' },
                    { title: 'Log Overtime', systemIcon: 'clock.badge.plus' },
                    { title: 'Business Trip', systemIcon: 'airplane' },
                ],
                onMenuPress: (e) => {
                    const idx = e.nativeEvent.index;
                    if (idx === 0) setIsLeaveModalVisible(true);
                    else if (idx === 1) setIsOvertimeModalVisible(true);
                    else if (idx === 2) setIsTripModalVisible(true);
                },
                onPress: () => {
                    setIsRequestSelectorVisible(true);
                }
            });
        }

        return list;
    }, [isAuthenticated, isManager, activeSegment, viewMode, textColor, isDark]);

    const [selectedSetupModule, setSelectedSetupModule] = useState<ClockSetupModule>('work_schedules');

    const renderContent = () => (
        <>
            {/* Month Selector & Filter Controls for Requests tab */}
            {activeSegment === 'requests' && (
                <>
                    {/* Month Selector */}
                    <View style={[s.monthSelector, isDesktopWeb && { paddingHorizontal: 0 }]}>
                        <TouchableOpacity onPress={handlePrevMonth} style={[s.navCircle, { backgroundColor: isDark ? '#3A3A3C' : '#E8E8ED' }]}>
                            <Ionicons name="chevron-back" size={15} color={isDark ? '#FFF' : '#3C3C43'} />
                        </TouchableOpacity>
                        <Text style={[s.monthText, { color: textColor }]}>
                            {format(currentMonth, 'MMMM yyyy')}
                        </Text>
                        <TouchableOpacity onPress={handleNextMonth} style={[s.navCircle, { backgroundColor: isDark ? '#3A3A3C' : '#E8E8ED' }]}>
                            <Ionicons name="chevron-forward" size={15} color={isDark ? '#FFF' : '#3C3C43'} />
                        </TouchableOpacity>
                    </View>

                    {/* Filter Bar: All Type, All Member, Search Icon */}
                    <View style={[s.requestFilterBar, isDesktopWeb && { paddingHorizontal: 0 }]}>
                        {!isSearchActive ? (
                            <>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                                    {/* All Type Dropdown Pill (Pulldown Menu) */}
                                    <ContextMenu
                                        actions={[
                                            { title: 'All Types', systemIcon: 'tray.full' },
                                            { title: 'Leaves', systemIcon: 'calendar' },
                                            { title: 'Overtime', systemIcon: 'clock' },
                                            { title: 'Business Trips', systemIcon: 'airplane' },
                                            { title: 'Corrections', systemIcon: 'pencil' },
                                        ]}
                                        dropdownMenuMode={true}
                                        onPress={(e) => {
                                            const types: Array<'all' | 'leaves' | 'overtime' | 'trips' | 'corrections'> = [
                                                'all',
                                                'leaves',
                                                'overtime',
                                                'trips',
                                                'corrections',
                                            ];
                                            const chosen = types[e.nativeEvent.index];
                                            if (chosen) setRequestType(chosen);
                                        }}
                                    >
                                        <View
                                            style={[s.filterPill, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}
                                        >
                                            <Text style={[s.filterPillText, { color: textColor }]} numberOfLines={1}>
                                                {requestType === 'all' ? 'All Types' : requestType === 'leaves' ? 'Leaves' : requestType === 'overtime' ? 'Overtime' : requestType === 'trips' ? 'Business Trips' : 'Corrections'}
                                            </Text>
                                            <Ionicons name="chevron-down" size={13} color={subtextColor} style={{ marginLeft: 4 }} />
                                        </View>
                                    </ContextMenu>

                                    {/* All Member Dropdown Pill (Team Mode Only) */}
                                    {viewMode === 'team' && (
                                        <TouchableOpacity
                                            style={[s.filterPill, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}
                                            onPress={() => setIsRequestMemberPickerOpen(true)}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[s.filterPillText, { color: textColor }]} numberOfLines={1}>
                                                {selectedRequestMember ? selectedRequestMember : 'All Members'}
                                            </Text>
                                            <Ionicons name="chevron-down" size={13} color={subtextColor} style={{ marginLeft: 4 }} />
                                        </TouchableOpacity>
                                    )}
                                </View>

                                {/* Search Icon Button */}
                                <TouchableOpacity
                                    style={[s.searchIconBtn, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}
                                    onPress={() => setIsSearchActive(true)}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="search" size={16} color={textColor} />
                                </TouchableOpacity>
                            </>
                        ) : (
                            /* Expandable Active Search Bar */
                            <View style={[s.activeSearchBar, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}>
                                <Ionicons name="search" size={16} color={subtextColor} style={{ marginRight: 8 }} />
                                <TextInput
                                    style={[s.activeSearchInput, { color: textColor }]}
                                    placeholder="Search requests..."
                                    placeholderTextColor={subtextColor}
                                    value={requestSearchQuery}
                                    onChangeText={setRequestSearchQuery}
                                    autoFocus
                                    autoCapitalize="none"
                                />
                                <TouchableOpacity
                                    onPress={() => {
                                        setRequestSearchQuery('');
                                        setIsSearchActive(false);
                                    }}
                                    hitSlop={8}
                                >
                                    <Ionicons name="close-circle" size={18} color={subtextColor} />
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </>
            )}

             {/* Sub-panels */}
            <View style={{ flex: 1 }}>
                <View style={{ display: activeSegment === 'today' ? 'flex' : 'none' }}>
                    {viewMode === 'personal' ? (
                        <ClockOverview renderPart={isDesktopWeb ? "hero" : "all"} />
                    ) : (
                        <ClockTeamOverview 
                            onRegisterShare={fn => { shareHandlers.current['today-team'] = fn; }} 
                            onViewDocument={(html, title) => {
                                setDocPreviewHtml(html);
                                setDocPreviewTitle(title);
                                setDocPreviewVisible(true);
                            }}
                        />
                    )}
                </View>
                <View style={{ display: activeSegment === 'timesheets' ? 'flex' : 'none' }}>
                    <ClockTimesheets 
                        viewMode={viewMode} 
                        isDesktopWeb={isDesktopWeb}
                        selectedRecord={selectedTimesheetRecord}
                        onSelectRecord={(rec) => setSelectedTimesheetRecord(rec)}
                        onRequestCorrection={(rec) => {
                            setTimesheetCorrectionRecord(rec);
                            setIsTimesheetCorrectionOpen(true);
                        }}
                        onPeriodDataChange={(data) => setTimesheetPeriodData(data)}
                        onRegisterShare={fn => { shareHandlers.current['timesheets-' + viewMode] = fn; }}
                        onViewDocument={(html, title) => {
                            setDocPreviewHtml(html);
                            setDocPreviewTitle(title);
                            setDocPreviewVisible(true);
                        }}
                    />
                </View>
                
                {/* Requests sub-panels */}
                {activeSegment === 'requests' && viewMode === 'personal' && requestType === 'all' && isAllRequestsEmpty && (
                    <View style={s.empty}>
                        <View style={[s.emptyIconContainer, { backgroundColor: isDark ? 'rgba(0, 122, 255, 0.12)' : 'rgba(0, 122, 255, 0.08)' }]}>
                            <Ionicons name="documents-outline" size={40} color="#007AFF" />
                        </View>
                        <Text style={[s.emptyTitle, { color: textColor }]}>No Requests Found</Text>
                        <Text style={[s.emptyText, { color: subtextColor }]}>You haven't submitted any leave, overtime, or business trip requests for this period.</Text>
                    </View>
                )}
                <View style={{ display: activeSegment === 'requests' && viewMode === 'personal' && (requestType === 'all' || requestType === 'leaves') ? 'flex' : 'none' }}>
                    <ClockLeaveRequests 
                        viewMode={viewMode} 
                        isRequestModalVisible={false} 
                        currentMonth={currentMonth}
                        searchQuery={requestSearchQuery}
                        selectedMember={selectedRequestMember}
                        hideEmptyState={requestType === 'all'}
                        onCountChange={setLeaveCount}
                        selectedDetailId={selectedRequestItem?.type === 'leave' ? selectedRequestItem.item.id : null}
                        onSelectDetail={(item) => setSelectedRequestItem(item ? { type: 'leave', item } : null)}
                    />
                </View>
                <View style={{ display: activeSegment === 'requests' && viewMode === 'personal' && (requestType === 'all' || requestType === 'overtime') ? 'flex' : 'none' }}>
                    <ClockOvertime 
                        viewMode={viewMode} 
                        isRequestModalVisible={false} 
                        currentMonth={currentMonth}
                        searchQuery={requestSearchQuery}
                        selectedMember={selectedRequestMember}
                        hideEmptyState={requestType === 'all'}
                        onCountChange={setOvertimeCount}
                        selectedDetailId={selectedRequestItem?.type === 'overtime' ? selectedRequestItem.item.id : null}
                        onSelectDetail={(item) => setSelectedRequestItem(item ? { type: 'overtime', item } : null)}
                    />
                </View>
                <View style={{ display: activeSegment === 'requests' && viewMode === 'personal' && (requestType === 'all' || requestType === 'trips') ? 'flex' : 'none' }}>
                    <ClockBusinessTrips 
                        viewMode={viewMode} 
                        isRequestModalVisible={false} 
                        currentMonth={currentMonth}
                        searchQuery={requestSearchQuery}
                        selectedMember={selectedRequestMember}
                        hideEmptyState={requestType === 'all'}
                        onCountChange={setTripCount}
                        selectedDetailId={selectedRequestItem?.type === 'trip' ? selectedRequestItem.item.id : null}
                        onSelectDetail={(item) => setSelectedRequestItem(item ? { type: 'trip', item } : null)}
                    />
                </View>
                <View style={{ display: activeSegment === 'requests' && viewMode === 'personal' && (requestType === 'all' || requestType === 'corrections') ? 'flex' : 'none' }}>
                    <ClockCorrections 
                        viewMode={viewMode} 
                        currentMonth={currentMonth}
                        searchQuery={requestSearchQuery}
                        selectedMember={selectedRequestMember}
                        hideEmptyState={requestType === 'all'}
                        onCountChange={setCorrectionCount}
                        selectedDetailId={selectedRequestItem?.type === 'correction' ? selectedRequestItem.item.id : null}
                        onSelectDetail={(item) => setSelectedRequestItem(item ? { type: 'correction', item } : null)}
                    />
                </View>

                {/* Manager Approvals */}
                {isManager && (
                    <View style={{ display: activeSegment === 'requests' && viewMode === 'team' ? 'flex' : 'none' }}>
                        <ClockApprovals 
                            currentMonth={currentMonth}
                            activeType={requestType}
                            onRegisterShare={fn => { shareHandlers.current['requests-team-' + requestType] = fn; }}
                            onViewDocument={(html, title) => {
                                setDocPreviewHtml(html);
                                setDocPreviewTitle(title);
                                setDocPreviewVisible(true);
                            }}
                            searchQuery={requestSearchQuery}
                            selectedMember={selectedRequestMember}
                            selectedDetailId={selectedRequestItem?.item?.id || selectedRequestItem?.item?.actualId || null}
                            onSelectDetail={(item) => {
                                if (!item) {
                                    setSelectedRequestItem(null);
                                    return;
                                }
                                if (item.type === 'Leave Request') {
                                    setSelectedRequestItem({
                                        type: 'leave',
                                        item: {
                                            id: item.actualId,
                                            userId: '',
                                            userName: item.employee,
                                            type: item.details.split(' (')[0],
                                            startDate: (item as any).startDate,
                                            endDate: (item as any).endDate,
                                            status: item.status,
                                            reason: item.reason,
                                            rejectReason: item.rejectReason,
                                            fileUrl: item.fileUrl,
                                            requestNumber: item.requestNumber,
                                            createdAt: item.submittedAt
                                        }
                                    });
                                } else if (item.type === 'Overtime') {
                                    setSelectedRequestItem({
                                        type: 'overtime',
                                        item: {
                                            id: item.actualId,
                                            userId: '',
                                            userName: item.employee,
                                            date: (item as any).date,
                                            startTime: item.rawStartTime || '',
                                            endTime: item.rawEndTime || '',
                                            status: item.status,
                                            description: item.reason,
                                            photoUrl: item.fileUrl,
                                            createdAt: item.submittedAt,
                                            rejectReason: item.rejectReason,
                                            requestNumber: item.requestNumber
                                        }
                                    });
                                } else if (item.type === 'Business Trip') {
                                    setSelectedRequestItem({
                                        type: 'trip',
                                        item: {
                                            id: item.actualId,
                                            userId: '',
                                            userName: item.employee,
                                            destination: item.details.split(' - ')[0] || '',
                                            startDate: (item as any).startDate,
                                            endDate: (item as any).endDate,
                                            purpose: item.reason,
                                            status: item.status,
                                            rejectReason: item.rejectReason,
                                            fileUrl: item.fileUrl,
                                            requestNumber: item.requestNumber,
                                            createdAt: item.submittedAt
                                        }
                                    });
                                } else {
                                    setSelectedRequestItem({
                                        type: 'correction',
                                        item: (item as any).rawCorrection || {
                                            id: item.actualId,
                                            userId: '',
                                            userName: item.employee,
                                            attendanceRecordId: '',
                                            attendanceDate: (item as any).date || '',
                                            correctionType: 'clock_in',
                                            originalValue: '',
                                            requestedValue: '',
                                            reason: item.reason,
                                            evidenceUrl: item.fileUrl,
                                            status: item.status,
                                            requestNumber: item.requestNumber,
                                            rejectReason: item.rejectReason,
                                            createdAt: item.submittedAt,
                                        }
                                    });
                                }
                            }}
                        />
                    </View>
                )}

                {/* Clock Team Setup Tab */}
                {isManager && (
                    <View style={{ display: activeSegment === 'setup' && viewMode === 'team' ? 'flex' : 'none' }}>
                        <ClockTeamSetupTab 
                            isDark={isDark} 
                            textColor={textColor} 
                            subtextColor={subtextColor}
                            selectedModule={selectedSetupModule}
                            onSelectModule={isDesktopWeb ? setSelectedSetupModule : undefined}
                        />
                    </View>
                )}
            </View>
        </>
    );

    return (
        <>
        <Stack.Screen options={{
                headerShown: Platform.OS !== 'web',
                title: 'Clock',
                headerLargeTitle: Platform.OS === 'ios',
                headerTransparent: Platform.OS === 'ios',
                headerTintColor: textColor,
                headerShadowVisible: false,
                headerStyle: Platform.OS === 'ios'
                    ? { backgroundColor: 'transparent' }
                    : { backgroundColor: isDark ? '#000000' : '#F2F2F7' },
                headerLargeStyle: Platform.OS === 'ios'
                    ? { backgroundColor: 'transparent' }
                    : { backgroundColor: isDark ? '#000000' : '#F2F2F7' },
                headerLargeTitleStyle: { fontSize: 26, color: textColor },
                headerRight: (isAuthenticated && toolbarActions.length > 0) ? () => (
                    <HeaderToolbar
                        actions={toolbarActions}
                        isDark={isDark}
                        textColor={textColor}
                        maxDirectActions={3}
                        primaryActionBgColor="#0EA5E9"
                    />
                ) : undefined,
            }} />

        {Platform.OS === 'web' && !isDesktopWeb && (
            <WebFinderHeader
                title="Clock"
                showBack
                actions={isAuthenticated ? toolbarActions : undefined}
                primaryActionBgColor="#0EA5E9"
                centerComponent={
                    <SegmentedControl
                        segments={segments}
                        activeSegment={activeSegment}
                        onSegmentChange={handleSegmentChange}
                    />
                }
            />
        )}

        {isDesktopWeb ? (
            <View style={[s.splitRoot, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}>
                {/* Left Pane (flex: 1.1) */}
                <View style={[s.splitLeftPane, { borderRightColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)', backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}>
                    {/* Header with Title + Action Buttons */}
                    <View style={s.splitListHeader}>
                        <View style={s.splitListHeaderTitleRow}>
                            <Text style={[s.splitListHeaderTitle, { color: textColor }]}>Clock</Text>
                            {isAuthenticated && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    {isManager && (
                                        <TouchableOpacity
                                            onPress={() => {
                                                const nextMode = viewMode === 'personal' ? 'team' : 'personal';
                                                if (nextMode === 'personal' && activeSegment === 'setup') {
                                                    setActiveSegment('today');
                                                }
                                                setViewMode(nextMode);
                                            }}
                                            style={[
                                                s.headerActionCircle,
                                                {
                                                    backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF',
                                                    shadowColor: '#000',
                                                    shadowOffset: { width: 0, height: 1 },
                                                    shadowOpacity: isDark ? 0 : 0.08,
                                                    shadowRadius: 3,
                                                    elevation: 1,
                                                },
                                            ]}
                                        >
                                            <PlatformIcon
                                                name={viewMode === 'personal' ? 'person.fill' : 'person.2.fill'}
                                                size={16}
                                                tintColor={textColor}
                                            />
                                        </TouchableOpacity>
                                    )}
                                    {activeSegment !== 'setup' && (
                                        <ContextMenu
                                            dropdownMenuMode={true}
                                            actions={[
                                                { title: 'Leave Request', systemIcon: 'calendar.badge.plus' },
                                                { title: 'Log Overtime', systemIcon: 'clock.badge.plus' },
                                                { title: 'Business Trip', systemIcon: 'airplane' },
                                            ]}
                                            onPress={(e) => {
                                                const idx = e.nativeEvent.index;
                                                if (idx === 0) setIsLeaveModalVisible(true);
                                                else if (idx === 1) setIsOvertimeModalVisible(true);
                                                else if (idx === 2) setIsTripModalVisible(true);
                                            }}
                                        >
                                            <TouchableOpacity
                                                style={[s.headerActionCircle, { backgroundColor: '#0EA5E9' }]}
                                            >
                                                <Ionicons name="add" size={18} color="#FFFFFF" />
                                            </TouchableOpacity>
                                        </ContextMenu>
                                    )}
                                </View>
                            )}
                        </View>

                        {/* Filter Segmented Control */}
                        <View style={{ marginTop: 12 }}>
                            <SegmentedControl
                                fullWidth
                                style={{ width: '100%' }}
                                segments={segments}
                                activeSegment={activeSegment}
                                onSegmentChange={handleSegmentChange}
                            />
                        </View>
                    </View>

                    <ScrollView
                        style={s.splitListScroll}
                        contentContainerStyle={{
                            paddingHorizontal: 20,
                            paddingTop: 8,
                            paddingBottom: 60,
                        }}
                        showsVerticalScrollIndicator={true}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? '#FFF' : '#000'} />}
                        keyboardShouldPersistTaps="handled"
                    >
                        {!isAuthenticated ? (
                            <UnauthenticatedView
                                compact
                                title={
                                    activeSegment === 'today'
                                        ? 'Clock — Today'
                                        : activeSegment === 'timesheets'
                                        ? 'Clock — Timesheets'
                                        : 'Clock — Requests & Approvals'
                                }
                                description={
                                    activeSegment === 'today'
                                        ? 'Real-time clock-in/out attendance tracking, geofence verification, and today shifts overview.'
                                        : activeSegment === 'timesheets'
                                        ? 'Comprehensive monthly timesheet records, working hour logs, and attendance summaries.'
                                        : 'Submit and approve leave requests, overtime hours, and business travel allowances.'
                                }
                                buttonText="Sign In"
                            />
                        ) : (
                            renderContent()
                        )}
                    </ScrollView>
                </View>

                {/* Right Pane (flex: 2) */}
                <View style={[s.splitRightPane, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}>
                    {activeSegment === 'today' ? (
                        <ScrollView
                            style={{ flex: 1 }}
                            contentContainerStyle={{ padding: 20, paddingTop: 16, paddingBottom: 60 }}
                            showsVerticalScrollIndicator={true}
                        >
                            <ClockOverview renderPart="summary" />
                        </ScrollView>
                    ) : activeSegment === 'timesheets' ? (
                        <ScrollView
                            style={{ flex: 1 }}
                            contentContainerStyle={{ padding: 20, paddingTop: 16, paddingBottom: 60 }}
                            showsVerticalScrollIndicator={true}
                        >
                            <ClockTimesheetDetailPane
                                record={selectedTimesheetRecord}
                                allRecords={timesheetPeriodData?.records || []}
                                stats={timesheetPeriodData?.stats}
                                teamStats={timesheetPeriodData?.teamStats}
                                periodLabel={timesheetPeriodData?.periodLabel}
                                viewMode={viewMode}
                                currentMonth={currentMonth}
                                onSelectRecord={(rec) => setSelectedTimesheetRecord(rec)}
                                onExportPress={handleExportPress}
                                onViewDocument={(html, title) => {
                                    setDocPreviewHtml(html);
                                    setDocPreviewTitle(title);
                                    setDocPreviewVisible(true);
                                }}
                                onRequestCorrection={(rec) => {
                                    if (!isDesktopWeb) {
                                        setTimesheetCorrectionRecord(rec);
                                        setIsTimesheetCorrectionOpen(true);
                                    } else {
                                        onRefresh();
                                    }
                                }}
                                onPhotoPress={(url) => {
                                    setPreviewPhotoUrl(url);
                                    setIsPhotoPreviewOpen(true);
                                }}
                            />
                        </ScrollView>
                    ) : activeSegment === 'setup' ? (
                        <ClockSetupDetailPane
                            key={`desktop-setup-${selectedSetupModule}`}
                            moduleId={selectedSetupModule}
                        />
                    ) : activeSegment === 'requests' ? (
                        selectedRequestItem ? (
                            selectedRequestItem.type === 'leave' ? (
                                <ClockLeaveDetailSheet
                                    key={`embedded-leave-${selectedRequestItem.item.id}`}
                                    isOpened={true}
                                    isEmbedded={true}
                                    onClose={() => setSelectedRequestItem(null)}
                                    request={selectedRequestItem.item}
                                    viewMode={viewMode}
                                    onCancel={() => {
                                        setSelectedRequestItem(null);
                                        onRefresh();
                                    }}
                                    onViewCertificate={(url) => {
                                        setPreviewPhotoUrl(url);
                                        setIsPhotoPreviewOpen(true);
                                    }}
                                />
                            ) : selectedRequestItem.type === 'overtime' ? (
                                <ClockOvertimeDetailSheet
                                    key={`embedded-ot-${selectedRequestItem.item.id}`}
                                    isOpened={true}
                                    isEmbedded={true}
                                    onClose={() => setSelectedRequestItem(null)}
                                    log={selectedRequestItem.item}
                                    viewMode={viewMode}
                                    onCancel={() => {
                                        setSelectedRequestItem(null);
                                        onRefresh();
                                    }}
                                    onViewProof={(url) => {
                                        setPreviewPhotoUrl(url);
                                        setIsPhotoPreviewOpen(true);
                                    }}
                                />
                            ) : selectedRequestItem.type === 'trip' ? (
                                <ClockTripDetailSheet
                                    key={`embedded-trip-${selectedRequestItem.item.id}`}
                                    isOpened={true}
                                    isEmbedded={true}
                                    onClose={() => setSelectedRequestItem(null)}
                                    trip={selectedRequestItem.item}
                                    viewMode={viewMode}
                                    onCancel={() => {
                                        setSelectedRequestItem(null);
                                        onRefresh();
                                    }}
                                    onViewAttachment={(url) => {
                                        setPreviewPhotoUrl(url);
                                        setIsPhotoPreviewOpen(true);
                                    }}
                                />
                            ) : (
                                <ClockCorrectionDetailSheet
                                    key={`embedded-corr-${selectedRequestItem.item.id}`}
                                    isOpened={true}
                                    isEmbedded={true}
                                    onClose={() => setSelectedRequestItem(null)}
                                    item={selectedRequestItem.item}
                                    viewMode={viewMode}
                                    onViewProof={(url) => {
                                        setPreviewPhotoUrl(url);
                                        setIsPhotoPreviewOpen(true);
                                    }}
                                />
                            )
                        ) : (
                            <ScrollView
                                style={{ flex: 1 }}
                                contentContainerStyle={{ padding: 20, paddingTop: 16, paddingBottom: 60 }}
                                showsVerticalScrollIndicator={true}
                            >
                                <View style={s.desktopEmptyPane}>
                                    <View style={[s.desktopEmptyIconCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                                        <PlatformIcon
                                            name="tray.fill"
                                            size={36}
                                            tintColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)'}
                                        />
                                    </View>
                                    <Text style={[s.desktopEmptyTitle, { color: textColor }]}>
                                        {viewMode === 'team' ? 'Select an Approval' : 'Select a Request'}
                                    </Text>
                                    <Text style={[s.desktopEmptySubtitle, { color: subtextColor }]}>
                                        {viewMode === 'team'
                                            ? 'Choose an attendance approval request from the list on the left to review details and approve.'
                                            : 'Choose a leave, overtime, business trip, or correction request from the list to view its complete details inline.'}
                                    </Text>
                                </View>
                            </ScrollView>
                        )
                    ) : (
                        <ScrollView
                            style={{ flex: 1 }}
                            contentContainerStyle={{ padding: 20, paddingTop: 16, paddingBottom: 60 }}
                            showsVerticalScrollIndicator={true}
                        >
                            <View style={s.desktopEmptyPane}>
                                <View style={[s.desktopEmptyIconCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                                    <PlatformIcon
                                        name={activeSegment === 'timesheets' ? "calendar" : "tray.fill"}
                                        size={36}
                                        tintColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)'}
                                    />
                                </View>
                                <Text style={[s.desktopEmptyTitle, { color: textColor }]}>
                                    {activeSegment === 'timesheets' ? 'Timesheets Overview' : 'Requests & Approvals'}
                                </Text>
                                <Text style={[s.desktopEmptySubtitle, { color: subtextColor }]}>
                                    {activeSegment === 'timesheets'
                                        ? 'Daily attendance records, monthly timesheet logs, and working hour summaries are listed on the left.'
                                        : 'Leave requests, overtime hours, and business travel allowances are listed on the left.'}
                                </Text>
                            </View>
                        </ScrollView>
                    )}
                </View>
            </View>
        ) : (
            <SwipeTabWrapper segments={segments} activeSegment={activeSegment} onSegmentChange={handleSegmentChange}>
            <ScrollView
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? '#FFF' : '#000'} />}
                contentInsetAdjustmentBehavior="automatic"
                style={{ flex: 1, backgroundColor: Platform.OS === 'web' ? 'transparent' : (isDark ? '#000' : '#F2F2F7') }}
                contentContainerStyle={{ paddingBottom: 120, paddingTop: 0 }}
                showsVerticalScrollIndicator={false}
                stickyHeaderIndices={Platform.OS === 'android' ? [0] : undefined}
            >
                {/* Index 0: Sticky Segmented Control Wrapper for Native Only */}
                {Platform.OS !== 'web' && (
                    <View style={{
                        width: '100%',
                        alignItems: 'flex-start',
                        paddingTop: 6,
                        paddingBottom: 6,
                        paddingHorizontal: 16,
                        zIndex: 10,
                    }}>
                        <SegmentedControl
                            segments={segments}
                            activeSegment={activeSegment}
                            onSegmentChange={handleSegmentChange}
                        />
                    </View>
                )}

                {!isAuthenticated ? (
                    <UnauthenticatedView
                        compact
                        title={
                            activeSegment === 'today'
                                ? 'Clock — Today'
                                : activeSegment === 'timesheets'
                                ? 'Clock — Timesheets'
                                : 'Clock — Requests & Approvals'
                        }
                        description={
                            activeSegment === 'today'
                                ? 'Real-time clock-in/out attendance tracking, geofence verification, and today shifts overview.'
                                : activeSegment === 'timesheets'
                                ? 'Comprehensive monthly timesheet records, working hour logs, and attendance summaries.'
                                : 'Submit and approve leave requests, overtime hours, and business travel allowances.'
                        }
                        buttonText="Sign In"
                    />
                ) : (
                    renderContent()
                )}
            </ScrollView>
            </SwipeTabWrapper>
        )}

        {/* Request Type Selector SwiftUI Bottom Sheet */}
        <SwiftUIClockNewRequestSheet
            isOpened={isRequestSelectorVisible}
            onClose={() => setIsRequestSelectorVisible(false)}
            onSelectLeaveRequest={() => {
                setIsRequestSelectorVisible(false);
                setTimeout(() => {
                    setIsLeaveModalVisible(true);
                }, 250);
            }}
            onSelectLogOvertime={() => {
                setIsRequestSelectorVisible(false);
                setTimeout(() => {
                    setIsOvertimeModalVisible(true);
                }, 250);
            }}
            onSelectBusinessTrip={() => {
                setIsRequestSelectorVisible(false);
                setTimeout(() => {
                    setIsTripModalVisible(true);
                }, 250);
            }}
            onSelectAttendanceCorrection={() => {
                setIsRequestSelectorVisible(false);
                setTimeout(() => {
                    setIsCorrectionModalVisible(true);
                }, 250);
            }}
        />

        {/* Native SwiftUI Request Creation Sheets */}
        <LeaveRequestModal
            visible={isLeaveModalVisible}
            onClose={() => setIsLeaveModalVisible(false)}
            onSuccess={() => {
                setIsLeaveModalVisible(false);
                onRefresh();
            }}
        />

        <OvertimeModal
            visible={isOvertimeModalVisible}
            onClose={() => setIsOvertimeModalVisible(false)}
            onSuccess={() => {
                setIsOvertimeModalVisible(false);
                onRefresh();
            }}
        />

        <BusinessTripModal
            visible={isTripModalVisible}
            onClose={() => setIsTripModalVisible(false)}
            onSuccess={() => {
                setIsTripModalVisible(false);
                onRefresh();
            }}
        />

        <AttendanceCorrectionModal
            visible={isCorrectionModalVisible}
            onClose={() => setIsCorrectionModalVisible(false)}
            record={null}
            onSuccess={() => {
                setIsCorrectionModalVisible(false);
                onRefresh();
            }}
        />

        {/* Timesheet mobile record specific correction modal */}
        {!isDesktopWeb && (
            <AttendanceCorrectionModal
                visible={isTimesheetCorrectionOpen}
                onClose={() => setIsTimesheetCorrectionOpen(false)}
                record={timesheetCorrectionRecord}
                onSuccess={() => {
                    setIsTimesheetCorrectionOpen(false);
                    onRefresh();
                }}
            />
        )}

        {/* Timesheet photo preview sheet (mobile only) */}
        {!isDesktopWeb && (
            <SwiftUIImagePreviewSheet
                isOpened={isPhotoPreviewOpen}
                onClose={() => setIsPhotoPreviewOpen(false)}
                imageUrl={previewPhotoUrl}
                title="Attendance Photo Proof"
            />
        )}

        <CrewDocumentPreview
            visible={docPreviewVisible}
            onClose={() => {
                setDocPreviewVisible(false);
                setDocPreviewHtml(null);
            }}
            html={docPreviewHtml}
            title={docPreviewTitle}
        />

        {/* Type SearchablePicker Drawer */}
        <SearchablePicker
            visible={isTypePickerOpen}
            onClose={() => setIsTypePickerOpen(false)}
            onSelect={(item) => {
                setRequestType(item.id as any);
                setIsTypePickerOpen(false);
            }}
            items={typeItems}
            title="Select Request Type"
            selectedId={requestType}
            tintColor="#007AFF"
        />

        {/* Member SearchablePicker Drawer */}
        <SearchablePicker
            visible={isRequestMemberPickerOpen}
            onClose={() => setIsRequestMemberPickerOpen(false)}
            onSelect={(item) => {
                if (item.id === 'ALL') {
                    setSelectedRequestMember('');
                } else {
                    setSelectedRequestMember(item.id);
                }
                setIsRequestMemberPickerOpen(false);
            }}
            items={requestMemberItems}
            title="Select Member"
            selectedId={selectedRequestMember || 'ALL'}
            tintColor="#007AFF"
        />
        </>
    );
}

const s = StyleSheet.create({
    segContainer: { paddingHorizontal: 20 },
    seg: { marginBottom: 12, marginHorizontal: -4 },
    subSegContainer: { flexDirection: 'row', padding: 4, borderRadius: 999, marginHorizontal: 20, marginBottom: 16 },
    subSegBtn: { flex: 1, paddingVertical: 6, alignItems: 'center', borderRadius: 999 },
    subSegBtnActive: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 2,
        elevation: 2,
    },
    subSegText: { fontSize: 13, fontWeight: '700' },
    pillContainer: { paddingHorizontal: 20, paddingBottom: 16, gap: 8 },
    pillBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, backgroundColor: 'rgba(0,122,255,0.1)' },
    pillBtnActive: { backgroundColor: '#007AFF' },
    pillText: { fontSize: 14, fontWeight: '600', color: '#007AFF' },
    pillTextActive: { color: '#FFF' },
    addReqBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
    addReqText: { fontSize: 14, fontWeight: '700' },
    drawerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end', paddingHorizontal: Platform.OS === 'ios' ? 8 : 0, paddingBottom: Platform.OS === 'ios' ? 8 : 0 },
    drawerContentSheet: { borderRadius: Platform.OS === 'ios' ? 56 : 40, borderBottomLeftRadius: Platform.OS === 'ios' ? 56 : 0, borderBottomRightRadius: Platform.OS === 'ios' ? 56 : 0, overflow: 'hidden' },
    drawerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 28, paddingTop: 28, paddingBottom: 12 },
    drawerHeaderTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
    closeBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    drawerContent: { paddingHorizontal: 28, paddingTop: 8, paddingBottom: 36, gap: 12 },
    typeCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 24, borderWidth: 0 },
    typeIconContainer: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    typeTextContainer: { flex: 1, marginRight: 12 },
    typeTitle: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
    typeDesc: { fontSize: 12, lineHeight: 17 },
    monthSelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 12, paddingHorizontal: 20 },
    navCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
    monthText: { fontSize: 17, fontWeight: '700' },
    requestFilterBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 16,
        gap: 8,
    },
    filterPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        height: 38,
        borderRadius: 19,
    },
    filterPillText: {
        fontSize: 13,
        fontWeight: '600',
    },
    searchIconBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
    },
    activeSearchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        height: 38,
        paddingHorizontal: 12,
        borderRadius: 19,
    },
    activeSearchInput: {
        flex: 1,
        fontSize: 13,
        paddingVertical: 0,
        height: '100%',
    },
    empty: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        paddingHorizontal: 20,
    },
    emptyIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 6,
    },
    emptyText: {
        marginTop: 12,
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 20,
    },
    splitRoot: {
        flex: 1,
        flexDirection: 'row',
        height: '100%',
        overflow: 'hidden',
    },
    splitLeftPane: {
        ...DESKTOP_LIST_PANE,
        height: '100%',
        borderRightWidth: StyleSheet.hairlineWidth,
        display: 'flex',
        flexDirection: 'column',
    },
    splitListHeader: { ...DESKTOP_PANEL_HEADER },
    splitListHeaderTitleRow: { ...DESKTOP_PANEL_TITLE_ROW },
    splitListHeaderTitle: { ...DESKTOP_PANEL_TITLE },
    headerActionCircle: { ...DESKTOP_PANEL_ACTION },
    splitListScroll: {
        flex: 1,
        height: '100%',
    },
    splitRightPane: {
        flex: 2,
        height: '100%',
        overflow: 'hidden',
    },
    desktopEmptyPane: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
        paddingTop: 80,
    },
    desktopEmptyIconCircle: {
        width: 88,
        height: 88,
        borderRadius: 44,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    desktopEmptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 8,
        textAlign: 'center',
    },
    desktopEmptySubtitle: {
        fontSize: 14,
        lineHeight: 20,
        textAlign: 'center',
        maxWidth: 380,
    },
});
