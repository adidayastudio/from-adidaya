import { DESKTOP_LIST_PANE, DESKTOP_PANEL_HEADER, DESKTOP_PANEL_TITLE_ROW, DESKTOP_PANEL_TITLE, DESKTOP_PANEL_ACTION } from '@/constants/desktopLayout';
import { HeaderBlurBackground } from '@/components/ui/HeaderBlurBackground';
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View, Platform, Text, TouchableOpacity, ActionSheetIOS, Alert, useWindowDimensions } from 'react-native';
import { Stack, useLocalSearchParams, usePathname } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useSearch } from '@/context/SearchContext';
import { useUserContext } from '@/context/UserProvider';
import { Ionicons } from '@expo/vector-icons';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { GlassView } from '@/components/ui/GlassView';
import { BlurView } from 'expo-blur';
import { PillButton } from '@/components/ui/PillButton';
import { UnauthenticatedView } from '@/components/ui/UnauthenticatedView';
import { Colors } from '@/constants/theme';

// UI Components
import { HeaderToolbar, HeaderToolbarAction } from '@/components/ui/HeaderToolbar';
import { WebFinderHeader } from '@/components/ui/WebFinderHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { SwipeTabWrapper } from '@/components/ui/SwipeTabWrapper';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

// Safe lazy loading of SwiftUI components for floating save Changes bar
let SwiftUIHost: any = null;
let SwiftUIHStack: any = null;
let SwiftUIVStack: any = null;
let SwiftUIButton: any = null;
let SwiftUIText: any = null;
let SwiftUIGlassEffectContainer: any = null;
let SwiftUICircle: any = null;
let SwiftUISpacer: any = null;
let swiftModifiers: any = null;

if (Platform.OS === 'ios') {
    try {
        const SwiftUI = require('@expo/ui/swift-ui');
        SwiftUIHost = SwiftUI.Host;
        SwiftUIHStack = SwiftUI.HStack;
        SwiftUIVStack = SwiftUI.VStack;
        SwiftUIButton = SwiftUI.Button;
        SwiftUIText = SwiftUI.Text;
        SwiftUIGlassEffectContainer = SwiftUI.GlassEffectContainer;
        SwiftUICircle = SwiftUI.Circle;
        SwiftUISpacer = SwiftUI.Spacer;
        swiftModifiers = require('@expo/ui/swift-ui/modifiers');
    } catch (e) {
        // handled
    }
}

// Crew Sub-module Tabs
import { CrewDirectoryTab } from '@/components/crew/CrewDirectoryTab';
import { CrewAssignmentTab } from '@/components/crew/CrewAssignmentTab';
import { CrewDailyLogTab } from '@/components/crew/CrewDailyLogTab';
import { CrewPayrollTab } from '@/components/crew/CrewPayrollTab';
import { CrewRequestsTab } from '@/components/crew/CrewRequestsTab';

// Crew Form Modals & Details Drawers
import { SwiftUICrewDetailSheet } from '@/components/crew/SwiftUICrewDetailSheet';
import { CrewDetailModal } from '@/components/crew/CrewDetailModal';
import { SwiftUICrewMemberSheet } from '@/components/crew/SwiftUICrewMemberSheet';
import { SwiftUICrewAssignmentSheet } from '@/components/crew/SwiftUICrewAssignmentSheet';
import { CrewAssignmentModal } from '@/components/crew/CrewAssignmentModal';
import { SwiftUICrewRequestSheet } from '@/components/crew/SwiftUICrewRequestSheet';
import { CrewRequestModal } from '@/components/crew/CrewRequestModal';
import { CrewDocumentPreview } from '@/components/crew/CrewDocumentPreview';
import { SwiftUIImagePreviewSheet } from '@/components/crew/SwiftUIImagePreviewSheet';

// Seed Mock Data
import {
    INITIAL_CREW_MEMBERS,
    INITIAL_PROJECTS,
    INITIAL_ASSIGNMENTS,
    INITIAL_DAILY_LOGS,
    INITIAL_REQUESTS,
    CrewMember,
    Assignment,
    DailyLog,
    CrewRequest,
    CrewDocument,
    Project,
} from '@/components/crew/mockData';

import { supabase } from '@/lib/supabase';
import { getProjects } from '@/lib/api/projects';
import {
    fetchCrewMembers,
    saveCrewMember,
    deleteCrewMember,
    fetchAssignments,
    saveAssignment,
    deleteAssignment,
    fetchDailyLogs,
    saveDailyLogs as apiSaveDailyLogs,
    fetchCrewRequests,
    saveCrewRequest,
    deleteCrewRequest
} from '@/lib/api/crew';
import { addLocalNotification } from '@/lib/api/notifications';

const SEGMENTS = [
    { id: 'directory', label: 'Directory', icon: 'person.2.fill' },
    { id: 'assignment', label: 'Assignment', icon: 'briefcase.fill' },
    { id: 'daily_log', label: 'Daily Log', icon: 'calendar.badge.clock' },
    { id: 'payroll', label: 'Payroll', icon: 'banknote.fill' },
    { id: 'requests', label: 'Requests', icon: 'paperplane.fill' },
];

export default function CrewScreen() {
    const { isAuthenticated } = useUserContext();
    const isFocused = useIsFocused();
    const notificationParams = useLocalSearchParams<{
        notificationAction?: string;
        notificationRef?: string;
        notificationSubject?: string;
        notificationProjectCode?: string;
        notificationModule?: string;
        notificationTs?: string;
    }>();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const isDesktopWeb = Platform.OS === 'web' && width >= 768;
    const { setContextAction } = useSearch();

    const [activeSegment, setActiveSegment] = useState('directory');
    const [payrollStartDate, setPayrollStartDate] = useState(() => {
        const date = new Date();
        const day = date.getUTCDay(); // 0 is Sunday, 1 is Monday, etc.
        const diff = date.getUTCDate() - day;
        const sunday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), diff));
        const y = sunday.getUTCFullYear();
        const m = String(sunday.getUTCMonth() + 1).padStart(2, '0');
        const d = String(sunday.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    });

    // Live Database States
    const [workspaceId, setWorkspaceId] = useState<string | null>(null);
    const [rawProjects, setRawProjects] = useState<Project[]>([]);
    const [crewMembers, setCrewMembers] = useState<CrewMember[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
    const [requests, setRequests] = useState<CrewRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const projects = useMemo(() => {
        if (isLoading && rawProjects.length === 0) {
            return [{ code: 'LOADING', name: 'Projects still loading...' }] as Project[];
        }
        return rawProjects;
    }, [rawProjects, isLoading]);

    const loadAllData = useCallback(async (wsId: string) => {
        setIsLoading(true);
        try {
            const [membersData, assignmentsData, logsData, requestsData, projList] = await Promise.all([
                fetchCrewMembers(wsId),
                fetchAssignments(wsId),
                fetchDailyLogs(wsId),
                fetchCrewRequests(wsId),
                getProjects().catch(() => [])
            ]);

            setCrewMembers(membersData);
            setAssignments(assignmentsData);
            setDailyLogs(logsData);
            setRequests(requestsData);
            
            if (projList && projList.length > 0) {
                const mappedProjects = projList.map(p => ({
                    code: p.code,
                    name: p.title,
                    number: p.number
                }));
                mappedProjects.sort((a, b) => {
                    const numA = parseInt(a.number || '', 10);
                    const numB = parseInt(b.number || '', 10);
                    if (!isNaN(numA) && !isNaN(numB)) {
                        return numA - numB;
                    }
                    return (a.number || '').localeCompare(b.number || '');
                });
                setRawProjects(mappedProjects);
            }
        } catch (err) {
            console.error('Error loading crew data from Supabase:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const fetchWorkspace = async () => {
            try {
                const { data } = await supabase.from('workspaces').select('id').limit(1);
                if (data && data.length > 0) {
                    setWorkspaceId(data[0].id);
                } else {
                    setWorkspaceId('f39364e8-1376-4ff7-a716-78277e8d25b3');
                }
            } catch (err) {
                console.error('Error fetching workspace:', err);
                setWorkspaceId('f39364e8-1376-4ff7-a716-78277e8d25b3');
            }
        };
        fetchWorkspace();
    }, []);

    useEffect(() => {
        if (workspaceId) {
            loadAllData(workspaceId);
        }
    }, [workspaceId, loadAllData]);

    const handleRefresh = useCallback(async () => {
        if (workspaceId) {
            await loadAllData(workspaceId);
        }
    }, [workspaceId, loadAllData]);

    const { refreshing, onRefresh } = usePullToRefresh(handleRefresh);

    useEffect(() => {
        const [year, month, day] = payrollStartDate.split('-').map(Number);
        const date = new Date(Date.UTC(year, month - 1, day));
        if (date.getUTCDay() !== 0) {
            const diff = date.getUTCDay();
            date.setUTCDate(date.getUTCDate() - diff);
            const y = date.getUTCFullYear();
            const m = String(date.getUTCMonth() + 1).padStart(2, '0');
            const d = String(date.getUTCDate()).padStart(2, '0');
            setPayrollStartDate(`${y}-${m}-${d}`);
        }
    }, [payrollStartDate]);

    // Unsaved Daily Log tracking state for global Save Changes floating bar
    const [unsavedLogChanges, setUnsavedLogChanges] = useState(false);
    const [unsavedLogCount, setUnsavedLogCount] = useState(0);
    const [saveLogsFn, setSaveLogsFn] = useState<(() => void) | null>(null);

    // Modal Visibility & Item Focus States
    const [selectedMemberForDetail, setSelectedMemberForDetail] = useState<CrewMember | null>(null);
    const [detailModalVisible, setDetailModalVisible] = useState(false);

    const [selectedMemberForEdit, setSelectedMemberForEdit] = useState<CrewMember | null>(null);
    const [memberModalVisible, setMemberModalVisible] = useState(false);

    const [selectedAssignmentForEdit, setSelectedAssignmentForEdit] = useState<Assignment | null>(null);
    const [preselectedCrewIdForAssign, setPreselectedCrewIdForAssign] = useState<string | undefined>(undefined);
    const [assignmentModalVisible, setAssignmentModalVisible] = useState(false);

    const [selectedRequestForEdit, setSelectedRequestForEdit] = useState<CrewRequest | null>(null);
    const [requestModalVisible, setRequestModalVisible] = useState(false);

    // Desktop auto-selection
    useEffect(() => {
        if (!isDesktopWeb) return;
        if (activeSegment === 'directory' && crewMembers.length > 0 && !selectedMemberForDetail) {
            setSelectedMemberForDetail(crewMembers[0]);
        }
    }, [isDesktopWeb, activeSegment, crewMembers, selectedMemberForDetail]);

    useEffect(() => {
        if (!isDesktopWeb) return;
        if (activeSegment === 'assignment' && assignments.length > 0 && !selectedAssignmentForEdit) {
            setSelectedAssignmentForEdit(assignments[0]);
        }
    }, [isDesktopWeb, activeSegment, assignments, selectedAssignmentForEdit]);

    useEffect(() => {
        if (!isDesktopWeb) return;
        if (activeSegment === 'requests' && requests.length > 0 && !selectedRequestForEdit) {
            setSelectedRequestForEdit(requests[0]);
        }
    }, [isDesktopWeb, activeSegment, requests, selectedRequestForEdit]);

    // Directory filter visibility (controlled from header)
    const [directoryFiltersVisible, setDirectoryFiltersVisible] = useState(false);
    const [assignmentFiltersVisible, setAssignmentFiltersVisible] = useState(false);
    const [dailyLogFiltersVisible, setDailyLogFiltersVisible] = useState(false);

    const [docPreviewVisible, setDocPreviewVisible] = useState(false);
    const [docPreviewHtml, setDocPreviewHtml] = useState<string | null>(null);
    const [docPreviewTitle, setDocPreviewTitle] = useState('');
    const [previewSource, setPreviewSource] = useState<'DETAIL' | 'ASSIGNMENT' | 'PAYROLL' | 'DIRECTORY' | 'ASSIGNMENT_TAB' | 'REQUESTS' | null>(null);

    const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
    const [previewImageTitle, setPreviewImageTitle] = useState('Attachment Preview');
    const handledNotificationKeyRef = useRef<string | null>(null);

    // Export callbacks from child tabs
    // Export callbacks from child tabs
    const exportDirectoryRef = useRef<(() => void) | null>(null);
    const exportAssignmentRef = useRef<(() => void) | null>(null);
    const exportDailyLogRef = useRef<(() => void) | null>(null);
    const exportPayrollRef = useRef<(() => void) | null>(null);
    const exportRequestsRef = useRef<(() => void) | null>(null);

    // Stable registration wrappers
    const registerExportDirectory = useCallback((fn: () => void) => { exportDirectoryRef.current = fn; }, []);
    const registerExportAssignment = useCallback((fn: () => void) => { exportAssignmentRef.current = fn; }, []);
    const registerExportDailyLog = useCallback((fn: () => void) => { exportDailyLogRef.current = fn; }, []);
    const registerExportPayroll = useCallback((fn: () => void) => { exportPayrollRef.current = fn; }, []);
    const registerExportRequests = useCallback((fn: () => void) => { exportRequestsRef.current = fn; }, []);

    useEffect(() => {
        const readParam = (value?: string | string[]) => Array.isArray(value) ? value[0] : value;
        const action = readParam(notificationParams.notificationAction);
        const ref = readParam(notificationParams.notificationRef);
        const subject = readParam(notificationParams.notificationSubject);
        const projectCode = readParam(notificationParams.notificationProjectCode);
        const notificationTs = readParam(notificationParams.notificationTs);
        const key = [action, ref, subject, projectCode, notificationTs].filter(Boolean).join('|');

        if (!action || !key || handledNotificationKeyRef.current === key || isLoading) return;

        const actionSegment = action.includes('assignment') ? 'assignment'
            : action.includes('request') ? 'requests'
            : action.includes('daily_log') ? 'daily_log'
            : action.includes('payroll') ? 'payroll'
            : 'directory';

        setActiveSegment(actionSegment);
        handledNotificationKeyRef.current = key;

        if (actionSegment === 'directory') {
            const member = crewMembers.find(c =>
                (ref && c.id === ref) ||
                (subject && c.name.toLowerCase() === subject.toLowerCase()) ||
                (subject && c.nickname?.toLowerCase() === subject.toLowerCase())
            );
            if (member && !action.includes('delete')) {
                setSelectedMemberForDetail(member);
                setDetailModalVisible(true);
            }
            return;
        }

        if (actionSegment === 'assignment') {
            const assignment = assignments.find(a =>
                (ref && a.id === ref) ||
                (subject && projectCode && a.crewName.toLowerCase() === subject.toLowerCase() && a.projectCode === projectCode)
            );
            if (assignment && !action.includes('delete')) {
                setSelectedAssignmentForEdit(assignment);
                setPreselectedCrewIdForAssign(undefined);
                setAssignmentModalVisible(true);
            }
            return;
        }

        if (actionSegment === 'requests') {
            const request = requests.find(r =>
                (ref && r.id === ref) ||
                (subject && projectCode && r.crewName.toLowerCase() === subject.toLowerCase() && r.projectCode === projectCode)
            );
            if (request && !action.includes('delete')) {
                setSelectedRequestForEdit(request);
                setRequestModalVisible(true);
            }
        }
    }, [notificationParams, isLoading, crewMembers, assignments, requests]);

    const notifyCrewAction = useCallback((
        text: string,
        action: string,
        options?: { projectCode?: string; ref?: string; subjectUser?: string; module?: string }
    ) => {
        addLocalNotification({
            text,
            module: options?.module || 'Crew',
            user: 'HRD',
            category: 'crew',
            action,
            projectCode: options?.projectCode,
            ref: options?.ref,
            subjectUser: options?.subjectUser,
        }).catch(e => console.error('Failed to trigger notification:', e));
    }, []);

    const showCrewActionSheet = useCallback(() => {
        const options = ['Add Crew Member', 'Assign Crew to Project', 'Submit Crew Request', 'Cancel'];
        const cancelButtonIndex = 3;

        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options,
                    cancelButtonIndex,
                    title: 'Crew Actions',
                },
                (buttonIndex) => {
                    if (buttonIndex === 0) {
                        setSelectedMemberForEdit(null);
                        setMemberModalVisible(true);
                    } else if (buttonIndex === 1) {
                        setSelectedAssignmentForEdit(null);
                        setPreselectedCrewIdForAssign(undefined);
                        setAssignmentModalVisible(true);
                    } else if (buttonIndex === 2) {
                        setSelectedRequestForEdit(null);
                        setRequestModalVisible(true);
                    }
                }
            );
        } else {
            Alert.alert(
                'Crew Actions',
                'Choose an action to perform:',
                [
                    { text: 'Add Crew Member', onPress: () => { setSelectedMemberForEdit(null); setMemberModalVisible(true); } },
                    { text: 'Assign Crew to Project', onPress: () => { setSelectedAssignmentForEdit(null); setPreselectedCrewIdForAssign(undefined); setAssignmentModalVisible(true); } },
                    { text: 'Submit Crew Request', onPress: () => { setSelectedRequestForEdit(null); setRequestModalVisible(true); } },
                    { text: 'Cancel', style: 'cancel' }
                ]
            );
        }
    }, [setSelectedMemberForEdit, setMemberModalVisible, setSelectedAssignmentForEdit, setAssignmentModalVisible, setSelectedRequestForEdit, setRequestModalVisible]);

    useEffect(() => {
        if (isFocused && isAuthenticated) {
            setContextAction({
                label: 'Add',
                icon: 'add-outline',
                sfIcon: 'plus',
                action: showCrewActionSheet,
                options: [
                    {
                        label: 'Add Crew Member',
                        icon: 'person-add-outline',
                        sfIcon: 'person.badge.plus',
                        description: 'Add a new member to the crew directory',
                        action: () => {
                            setSelectedMemberForEdit(null);
                            setMemberModalVisible(true);
                        }
                    },
                    {
                        label: 'Assign Crew to Project',
                        icon: 'briefcase-outline',
                        sfIcon: 'briefcase.fill',
                        description: 'Assign a crew member to an active project code',
                        action: () => {
                            setSelectedAssignmentForEdit(null);
                            setPreselectedCrewIdForAssign(undefined);
                            setAssignmentModalVisible(true);
                        }
                    },
                    {
                        label: 'Submit Crew Request',
                        icon: 'paper-plane-outline',
                        sfIcon: 'paperplane.fill',
                        description: 'Request overtime, off days, or status updates for crew members',
                        action: () => {
                            setSelectedRequestForEdit(null);
                            setRequestModalVisible(true);
                        }
                    }
                ]
            });
        }
    }, [isFocused, isAuthenticated, setContextAction, showCrewActionSheet, setSelectedMemberForEdit, setMemberModalVisible, setSelectedAssignmentForEdit, setAssignmentModalVisible, setSelectedRequestForEdit, setRequestModalVisible]);

    // --- Dynamic Toolbar Actions ---
    const toolbarActions = useMemo<HeaderToolbarAction[]>(() => {
        if (!isAuthenticated) return [];
        const defaultActions: HeaderToolbarAction[] = [
                {
                    id: 'export',
                    icon: 'share-outline',
                    image: 'square.and.arrow.up',
                    tintColor: textColor,
                    onPress: () => alert('Exporting data reports...'),
            },
        ];

        if (activeSegment === 'directory') {
            return [
                {
                    id: 'export',
                    icon: 'share-outline',
                    image: 'square.and.arrow.up',
                    tintColor: textColor,
                    onPress: () => {
                        if (exportDirectoryRef.current) exportDirectoryRef.current();
                    },
                },
                {
                    id: 'add-crew',
                    icon: 'add',
                    image: 'plus',
                    isPrimary: true,
                    buttonStyle: { backgroundColor: '#8B5CF6' },
                    tintColor: '#FFFFFF',
                    onPress: () => {
                        setSelectedMemberForEdit(null);
                        setMemberModalVisible(true);
                    },
                    title: 'Add Crew'
                }
            ];
        }

        if (activeSegment === 'assignment') {
            return [
                {
                    id: 'export',
                    icon: 'share-outline',
                    image: 'square.and.arrow.up',
                    tintColor: textColor,
                    onPress: () => {
                        if (exportAssignmentRef.current) exportAssignmentRef.current();
                    },
                },
                {
                    id: 'add-assignment',
                    icon: 'add',
                    image: 'plus',
                    isPrimary: true,
                    buttonStyle: { backgroundColor: '#8B5CF6' },
                    tintColor: '#FFFFFF',
                    onPress: () => {
                        setSelectedAssignmentForEdit(null);
                        setPreselectedCrewIdForAssign(undefined);
                        setAssignmentModalVisible(true);
                    },
                    title: 'Add Assignment'
                }
            ];
        }

        if (activeSegment === 'daily_log') {
            return [
                {
                    id: 'filter',
                    icon: dailyLogFiltersVisible ? 'options' : 'options-outline',
                    image: dailyLogFiltersVisible ? 'slider.horizontal.3' : 'slider.horizontal.3',
                    tintColor: dailyLogFiltersVisible ? '#8B5CF6' : textColor,
                    onPress: () => setDailyLogFiltersVisible(prev => !prev),
                },
                {
                    id: 'export',
                    icon: 'share-outline',
                    image: 'square.and.arrow.up',
                    tintColor: textColor,
                    onPress: () => {
                        if (exportDailyLogRef.current) exportDailyLogRef.current();
                    },
                },
            ];
        }

        if (activeSegment === 'payroll') {
            return [
                {
                    id: 'export',
                    icon: 'share-outline',
                    image: 'square.and.arrow.up',
                    tintColor: textColor,
                    onPress: () => {
                        if (exportPayrollRef.current) exportPayrollRef.current();
                    },
                },
            ];
        }

        if (activeSegment === 'requests') {
            return [
                {
                    id: 'export',
                    icon: 'share-outline',
                    image: 'square.and.arrow.up',
                    tintColor: textColor,
                    onPress: () => {
                        if (exportRequestsRef.current) exportRequestsRef.current();
                    },
                },
                {
                    id: 'add-request',
                    icon: 'add',
                    image: 'plus',
                    isPrimary: true,
                    buttonStyle: { backgroundColor: '#8B5CF6' },
                    tintColor: '#FFFFFF',
                    onPress: () => {
                        setSelectedRequestForEdit(null);
                        setRequestModalVisible(true);
                    },
                    title: 'Submit Crew Request'
                }
            ];
        }

        return defaultActions;
    }, [activeSegment, dailyLogFiltersVisible, textColor, notifyCrewAction]);

    // --- State Handler Callbacks (Supabase Connected) ---
    const handleSaveMember = useCallback(async (member: CrewMember) => {
        if (!workspaceId) return;
        try {
            const isEdit = crewMembers.some(c => c.id === member.id);
            const saved = await saveCrewMember(member, workspaceId);
            
            // Trigger local notification
            if (isEdit) {
                notifyCrewAction(`Personal details updated for crew member ${saved.name}.`, 'update_member', {
                    projectCode: saved.projectCode,
                    subjectUser: saved.name,
                    ref: saved.id,
                });
            } else {
                notifyCrewAction(`New crew member ${saved.name} has been added to the directory.`, 'create_member', {
                    projectCode: saved.projectCode,
                    subjectUser: saved.name,
                    ref: saved.id,
                });
            }

            setCrewMembers(prev => {
                const exists = prev.some(c => c.id === member.id || c.id === saved.id);
                if (exists) {
                    return prev.map(c => (c.id === member.id || c.id === saved.id) ? saved : c);
                } else {
                    return [saved, ...prev];
                }
            });
            setMemberModalVisible(false);

            // Sync with active detail modal
            if (selectedMemberForDetail?.id === member.id) {
                setSelectedMemberForDetail(saved);
            }
        } catch (err) {
            Alert.alert('Error', 'Gagal menyimpan data crew');
        }
    }, [workspaceId, selectedMemberForDetail, crewMembers, notifyCrewAction]);

    const handleDeleteMember = useCallback(async (memberId: string) => {
        try {
            const member = crewMembers.find(c => c.id === memberId);
            await deleteCrewMember(memberId);
            if (member) {
                notifyCrewAction(`Crew member ${member.name} has been removed from the directory.`, 'delete_member', {
                    projectCode: member.projectCode,
                    subjectUser: member.name,
                    ref: member.id,
                });
            }
            setCrewMembers(prev => prev.filter(c => c.id !== memberId));
            setAssignments(prev => prev.filter(a => a.crewId !== memberId));
            setDetailModalVisible(false);
            setSelectedMemberForDetail(null);
        } catch (err) {
            Alert.alert('Error', 'Gagal menghapus crew');
        }
    }, [crewMembers, notifyCrewAction]);

    const handleSaveAssignment = useCallback(async (
        assign: Assignment,
        updatedPreviousAssignment?: Assignment,
        newDocument?: CrewDocument
    ) => {
        if (!workspaceId) return;
        try {
            const prevAssign = assignments.find(a => a.id === assign.id);
            const crewMember = crewMembers.find(c => c.id === assign.crewId);
            const crewName = crewMember ? (crewMember.nickname || crewMember.name) : (assign.crewName || 'Crew member');
            const project = projects.find(p => p.code === assign.projectCode);
            const projectName = project ? project.name : assign.projectCode;

            if (updatedPreviousAssignment) {
                await saveAssignment(updatedPreviousAssignment, workspaceId);
            }
            const saved = await saveAssignment(assign, workspaceId);

            // Trigger local notification
            if (!prevAssign) {
                notifyCrewAction(`Crew member ${crewName} has been assigned to project ${projectName} (${assign.projectCode}) as ${assign.crewRole}.`, 'create_assignment', {
                    projectCode: assign.projectCode,
                    subjectUser: crewName,
                    ref: saved.id,
                });
            } else if (assign.status === 'COMPLETED' && prevAssign.status !== 'COMPLETED') {
                notifyCrewAction(`Assignment for ${crewName} at project ${projectName} (${assign.projectCode}) has been marked as Completed.`, 'complete_assignment', {
                    projectCode: assign.projectCode,
                    subjectUser: crewName,
                    ref: saved.id,
                });
            } else {
                notifyCrewAction(`Assignment details updated for ${crewName} at project ${projectName} (${assign.projectCode}).`, 'update_assignment', {
                    projectCode: assign.projectCode,
                    subjectUser: crewName,
                    ref: saved.id,
                });
            }
            
            setAssignments(prev => {
                let list = prev;
                if (updatedPreviousAssignment) {
                    list = list.map(a => a.id === updatedPreviousAssignment.id ? updatedPreviousAssignment : a);
                }
                const exists = list.some(a => a.id === assign.id || a.id === saved.id);
                if (exists) {
                    return list.map(a => (a.id === assign.id || a.id === saved.id) ? saved : a);
                } else {
                    return [saved, ...list];
                }
            });

            // Sync: Propagate active project assignment to CrewMember profile details & documents
            setCrewMembers(prev => {
                return prev.map(c => {
                    if (c.id === assign.crewId) {
                        const currentDocs = c.documents || [];
                        const updatedDocs = newDocument ? [...currentDocs, newDocument] : currentDocs;
                        return {
                            ...c,
                            projectCode: assign.status === 'ACTIVE' ? assign.projectCode : undefined,
                            documents: updatedDocs
                        };
                    }
                    return c;
                });
            });

            setAssignmentModalVisible(false);
        } catch (err) {
            Alert.alert('Error', 'Gagal menyimpan penugasan crew');
        }
    }, [workspaceId, assignments, crewMembers, projects, notifyCrewAction]);

    const handleDeleteAssignment = useCallback(async (assignId: string) => {
        try {
            const assignment = assignments.find(a => a.id === assignId);
            await deleteAssignment(assignId);
            if (assignment) {
                const project = projects.find(p => p.code === assignment.projectCode);
                const projectName = project ? project.name : assignment.projectCode;
                notifyCrewAction(`Assignment for ${assignment.crewName} at project ${projectName} (${assignment.projectCode}) has been deleted.`, 'delete_assignment', {
                    projectCode: assignment.projectCode,
                    subjectUser: assignment.crewName,
                    ref: assignId,
                });
            }
            setAssignments(prev => prev.filter(a => a.id !== assignId));
            setAssignmentModalVisible(false);
        } catch (err) {
            Alert.alert('Error', 'Gagal menghapus penugasan crew');
        }
    }, [assignments, projects, notifyCrewAction]);

    const handleSaveRequest = useCallback(async (req: CrewRequest) => {
        if (!workspaceId) return;
        try {
            const isNew = !requests.some(r => r.id === req.id);
            const saved = await saveCrewRequest(req, workspaceId);

            if (isNew) {
                const typeStr = saved.type === 'LEAVE' ? 'Leave' : saved.type === 'KASBON' ? 'Kasbon' : 'Reimbursement';
                const amtStr = saved.amount ? ` (Rp ${saved.amount.toLocaleString('id-ID')})` : '';
                notifyCrewAction(`New ${typeStr} request submitted by ${saved.crewName}: "${saved.reason}"${amtStr}.`, 'create_request', {
                    projectCode: saved.projectCode,
                    subjectUser: saved.crewName,
                    ref: saved.id,
                });
            } else {
                notifyCrewAction(`Crew request updated for ${saved.crewName}: "${saved.reason}".`, 'update_request', {
                    projectCode: saved.projectCode,
                    subjectUser: saved.crewName,
                    ref: saved.id,
                });
            }

            setRequests(prev => {
                const exists = prev.some(r => r.id === req.id || r.id === saved.id);
                if (exists) {
                    return prev.map(r => (r.id === req.id || r.id === saved.id) ? saved : r);
                } else {
                    return [saved, ...prev];
                }
            });
            setRequestModalVisible(false);
        } catch (err) {
            Alert.alert('Error', 'Gagal menyimpan request crew');
        }
    }, [workspaceId, requests, notifyCrewAction]);

    const handleMoveRequestToWeek = useCallback(async (id: string) => {
        if (!workspaceId) return;
        const [year, month, day] = payrollStartDate.split('-').map(Number);
        
        // Target period end date (6 days after start)
        const endDate = new Date(Date.UTC(year, month - 1, day));
        endDate.setUTCDate(endDate.getUTCDate() + 6);
        const ey = endDate.getUTCFullYear();
        const em = endDate.getUTCMonth();
        const ed = endDate.getUTCDate();
        
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const startMonthName = months[month - 1];
        const endMonthName = months[em];
        
        let targetPeriodStr = '';
        if (month === em + 1) {
            targetPeriodStr = `${day}-${ed} ${startMonthName}`;
        } else {
            targetPeriodStr = `${day} ${startMonthName} - ${ed} ${endMonthName}`;
        }

        const req = requests.find(r => r.id === id);
        if (!req) return;

        const updatedReq: CrewRequest = (() => {
            const addDays = (dateStr: string, days: number): string => {
                const [y, m, d] = dateStr.split('-').map(Number);
                const date = new Date(Date.UTC(y, m - 1, d));
                date.setUTCDate(date.getUTCDate() + days);
                const rY = date.getUTCFullYear();
                const rM = String(date.getUTCMonth() + 1).padStart(2, '0');
                const rD = String(date.getUTCDate()).padStart(2, '0');
                return `${rY}-${rM}-${rD}`;
            };

            let durationDays = 0;
            if (req.endDate && req.startDate) {
                const startD = new Date(req.startDate);
                const endD = new Date(req.endDate);
                durationDays = Math.round((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24));
            }

            const newStartDate = payrollStartDate;
            const newEndDate = durationDays > 0 ? addDays(newStartDate, durationDays) : undefined;

            return {
                ...req,
                startDate: newStartDate,
                endDate: newEndDate,
                movedToPeriod: targetPeriodStr
            };
        })();

        try {
            const saved = await saveCrewRequest(updatedReq, workspaceId);
            const typeStr = saved.type === 'LEAVE' ? 'Leave' : saved.type === 'KASBON' ? 'Kasbon' : 'Reimbursement';
            
            notifyCrewAction(`Request by ${saved.crewName} has been moved to period ${targetPeriodStr}: ${typeStr} request for "${saved.reason}".`, 'move_request_period', {
                projectCode: saved.projectCode,
                subjectUser: saved.crewName,
                ref: saved.id,
            });

            setRequests(prev => prev.map(r => (r.id === id || r.id === saved.id) ? saved : r));
        } catch (err) {
            Alert.alert('Error', 'Gagal memindahkan request crew');
        }
    }, [workspaceId, payrollStartDate, requests, notifyCrewAction]);

    const handleDeleteRequest = useCallback(async (id: string) => {
        try {
            const req = requests.find(r => r.id === id);
            await deleteCrewRequest(id);
            if (req) {
                const typeStr = req.type === 'LEAVE' ? 'Leave' : req.type === 'KASBON' ? 'Kasbon' : 'Reimbursement';
                notifyCrewAction(`${typeStr} request by ${req.crewName} has been deleted: "${req.reason}".`, 'delete_request', {
                    projectCode: req.projectCode,
                    subjectUser: req.crewName,
                    ref: id,
                });
            }
            setRequests(prev => prev.filter(r => r.id !== id));
        } catch (err) {
            Alert.alert('Error', 'Gagal menghapus request');
        }
    }, [requests, notifyCrewAction]);

    const handleApproveRequest = useCallback(async (id: string) => {
        if (!workspaceId) return;
        const req = requests.find(r => r.id === id);
        if (!req) return;

        const updatedReq: CrewRequest = {
            ...req,
            status: 'APPROVED'
        };

        try {
            const saved = await saveCrewRequest(updatedReq, workspaceId);
            const typeStr = saved.type === 'LEAVE' ? 'Leave' : saved.type === 'KASBON' ? 'Kasbon' : 'Reimbursement';
            const amtStr = saved.amount ? ` (Rp ${saved.amount.toLocaleString('id-ID')})` : '';

            notifyCrewAction(`Request by ${saved.crewName} has been approved: ${typeStr} request for "${saved.reason}"${amtStr}.`, 'approve_request', {
                projectCode: saved.projectCode,
                subjectUser: saved.crewName,
                ref: saved.id,
            });

            setRequests(prev => prev.map(r => (r.id === id || r.id === saved.id) ? saved : r));

            if (req.type === 'LEAVE') {
                const member = crewMembers.find(c => c.id === req.crewId);
                const projectCode = req.projectCode || member?.projectCode || '008-RBH';
                
                // Generate dates in range
                const getDatesInRange = (startStr: string, endStr: string) => {
                    const dates: string[] = [];
                    const [sYear, sMonth, sDay] = startStr.split('-').map(Number);
                    const [eYear, eMonth, eDay] = endStr.split('-').map(Number);
                    const currentDate = new Date(Date.UTC(sYear, sMonth - 1, sDay));
                    const endDate = new Date(Date.UTC(eYear, eMonth - 1, eDay));
                    while (currentDate <= endDate) {
                        const y = currentDate.getUTCFullYear();
                        const m = String(currentDate.getUTCMonth() + 1).padStart(2, '0');
                        const d = String(currentDate.getUTCDate()).padStart(2, '0');
                        dates.push(`${y}-${m}-${d}`);
                        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
                    }
                    return dates;
                };

                const dates = req.endDate ? getDatesInRange(req.startDate, req.endDate) : [req.startDate];

                const nextLogs: DailyLog[] = [];
                setDailyLogs(prevLogs => {
                    const next = [...prevLogs];
                    dates.forEach(date => {
                        const idx = next.findIndex(l => l.crewId === req.crewId && l.date === date);
                        if (idx >= 0) {
                            next[idx] = {
                                ...next[idx],
                                status: 'CUTI',
                                regularHours: 0,
                                ot1Hours: 0,
                                ot2Hours: 0,
                                ot3Hours: 0,
                            };
                            nextLogs.push(next[idx]);
                        } else {
                            const newLog: DailyLog = {
                                id: `l_leave_${req.id}_${date}`,
                                crewId: req.crewId,
                                projectCode,
                                date,
                                status: 'CUTI',
                                regularHours: 0,
                                ot1Hours: 0,
                                ot2Hours: 0,
                                ot3Hours: 0,
                            };
                            next.push(newLog);
                            nextLogs.push(newLog);
                        }
                    });
                    return next;
                });

                if (nextLogs.length > 0) {
                    await apiSaveDailyLogs(nextLogs, workspaceId);
                }
            }
        } catch (err) {
            Alert.alert('Error', 'Gagal menyetujui request');
        }
    }, [workspaceId, requests, crewMembers, notifyCrewAction]);

    const handleRejectRequest = useCallback(async (id: string, reason: string) => {
        if (!workspaceId) return;
        const req = requests.find(r => r.id === id);
        if (!req) return;

        const updatedReq: CrewRequest = {
            ...req,
            status: 'REJECTED',
            rejectReason: reason
        };

        try {
            const saved = await saveCrewRequest(updatedReq, workspaceId);
            const typeStr = saved.type === 'LEAVE' ? 'Leave' : saved.type === 'KASBON' ? 'Kasbon' : 'Reimbursement';
            const amtStr = saved.amount ? ` (Rp ${saved.amount.toLocaleString('id-ID')})` : '';
            const reasonStr = reason ? `. Reason: ${reason}` : '';

            notifyCrewAction(`Request by ${saved.crewName} has been rejected: ${typeStr} request for "${saved.reason}"${amtStr}${reasonStr}.`, 'reject_request', {
                projectCode: saved.projectCode,
                subjectUser: saved.crewName,
                ref: saved.id,
            });

            setRequests(prev => prev.map(r => (r.id === id || r.id === saved.id) ? saved : r));
        } catch (err) {
            Alert.alert('Error', 'Gagal menolak request');
        }
    }, [workspaceId, requests, notifyCrewAction]);

    const handleSaveDailyLogs = useCallback(async (logs: DailyLog[]) => {
        if (!workspaceId) return;
        try {
            await apiSaveDailyLogs(logs, workspaceId);
            if (logs.length > 0) {
                const uniqueCrewIds = Array.from(new Set(logs.map(log => log.crewId)));
                const uniqueProjectCodes = Array.from(new Set(logs.map(log => log.projectCode).filter(Boolean)));
                const uniqueDates = Array.from(new Set(logs.map(log => log.date))).sort();
                const subjectUser = uniqueCrewIds.length === 1
                    ? (crewMembers.find(c => c.id === uniqueCrewIds[0])?.name || 'Crew member')
                    : `${uniqueCrewIds.length} crew members`;
                const dateRange = uniqueDates.length === 1
                    ? uniqueDates[0]
                    : `${uniqueDates[0]} to ${uniqueDates[uniqueDates.length - 1]}`;
                const projectLabel = uniqueProjectCodes.length === 1 ? ` for ${uniqueProjectCodes[0]}` : '';

                notifyCrewAction(`${logs.length} daily log entr${logs.length === 1 ? 'y' : 'ies'} saved${projectLabel} on ${dateRange}.`, 'save_daily_log', {
                    projectCode: uniqueProjectCodes.length === 1 ? uniqueProjectCodes[0] : undefined,
                    subjectUser,
                    module: 'Daily Log',
                });
            }
            setDailyLogs(prev => {
                const next = [...prev];
                logs.forEach(log => {
                    const idx = next.findIndex(l => l.crewId === log.crewId && l.date === log.date && l.projectCode === log.projectCode);
                    if (idx >= 0) {
                        next[idx] = log;
                    } else {
                        next.push(log);
                    }
                });
                return next;
            });
        } catch (err) {
            Alert.alert('Error', 'Gagal menyimpan daily logs');
        }
    }, [workspaceId, crewMembers, notifyCrewAction]);

    const handleUnsavedLogChangesChange = useCallback((hasChanges: boolean, count: number, saveFn: () => void) => {
        setUnsavedLogChanges(hasChanges);
        setUnsavedLogCount(count);
        setSaveLogsFn(() => saveFn);
    }, []);

    const handleDesktopExport = useCallback(() => {
        if (activeSegment === 'directory') {
            if (exportDirectoryRef.current) exportDirectoryRef.current();
        } else if (activeSegment === 'assignment') {
            if (exportAssignmentRef.current) exportAssignmentRef.current();
        } else if (activeSegment === 'daily_log') {
            if (exportDailyLogRef.current) exportDailyLogRef.current();
        } else if (activeSegment === 'payroll') {
            if (exportPayrollRef.current) exportPayrollRef.current();
        } else if (activeSegment === 'requests') {
            if (exportRequestsRef.current) exportRequestsRef.current();
        }
    }, [activeSegment]);

    const handleDesktopPrimaryAdd = useCallback(() => {
        if (activeSegment === 'directory') {
            setSelectedMemberForEdit(null);
            setMemberModalVisible(true);
        } else if (activeSegment === 'assignment') {
            setSelectedAssignmentForEdit(null);
            setPreselectedCrewIdForAssign(undefined);
            setAssignmentModalVisible(true);
        } else if (activeSegment === 'requests') {
            setSelectedRequestForEdit(null);
            setRequestModalVisible(true);
        } else {
            setSelectedMemberForEdit(null);
            setMemberModalVisible(true);
        }
    }, [activeSegment]);

    const renderTabContent = () => {
        if (!isAuthenticated) {
            return (
                <UnauthenticatedView
                    compact
                    title={`Crew — ${SEGMENTS.find(s => s.id === activeSegment)?.label || 'Overview'}`}
                    description={
                        activeSegment === 'directory'
                            ? 'Complete roster of field crew members, roles, skill certifications, and contact directory.'
                            : activeSegment === 'assignment'
                            ? 'Deploy and manage crew labor assignments across active project sites and milestones.'
                            : activeSegment === 'daily_log'
                            ? 'Record daily labor logs, site activities, work hours, and supervisor attendance verification.'
                            : activeSegment === 'payroll'
                            ? 'Weekly payroll calculations, wage breakdowns, overtime compensation, and worker allowances.'
                            : 'Manage crew leave requests, cash advances (kasbon), and field expense reimbursements.'
                    }
                    buttonText="Sign In"
                />
            );
        }

        return (
            <>
                <View style={{ display: activeSegment === 'directory' ? 'flex' : 'none' }}>
                    <CrewDirectoryTab
                        crewMembers={crewMembers}
                        projects={projects}
                        assignments={assignments}
                        showFilters={directoryFiltersVisible}
                        selectedMemberId={selectedMemberForDetail?.id}
                        onAddMember={() => {
                            setSelectedMemberForEdit(null);
                            setMemberModalVisible(true);
                        }}
                        onSelectMember={(member) => {
                            setSelectedMemberForDetail(member);
                            if (!isDesktopWeb) {
                                setDetailModalVisible(true);
                            }
                        }}
                        onViewDocument={(html, title) => {
                            setDocPreviewHtml(html);
                            setDocPreviewTitle(title);
                            setPreviewSource('DIRECTORY');
                            setDocPreviewVisible(true);
                        }}
                        onExportRegister={registerExportDirectory}
                    />
                </View>

                <View style={{ display: activeSegment === 'assignment' ? 'flex' : 'none' }}>
                    <CrewAssignmentTab
                        assignments={assignments}
                        projects={projects}
                        crewMembers={crewMembers}
                        showFilters={assignmentFiltersVisible}
                        selectedAssignmentId={selectedAssignmentForEdit?.id}
                        onAddAssignment={(preselectedCrewId) => {
                            setSelectedAssignmentForEdit(null);
                            setPreselectedCrewIdForAssign(preselectedCrewId);
                            setAssignmentModalVisible(true);
                        }}
                        onSelectAssignment={(assign) => {
                            setSelectedAssignmentForEdit(assign);
                            setPreselectedCrewIdForAssign(undefined);
                            if (!isDesktopWeb) {
                                setAssignmentModalVisible(true);
                            }
                        }}
                        onExportRegister={registerExportAssignment}
                        onViewDocument={(html, title) => {
                            setDocPreviewHtml(html);
                            setDocPreviewTitle(title);
                            setPreviewSource('ASSIGNMENT_TAB');
                            setDocPreviewVisible(true);
                        }}
                    />
                </View>

                <View style={{ display: activeSegment === 'daily_log' ? 'flex' : 'none' }}>
                    <CrewDailyLogTab
                        dailyLogs={dailyLogs}
                        crewMembers={crewMembers}
                        projects={projects}
                        assignments={assignments}
                        onSaveLogs={handleSaveDailyLogs}
                        showFilters={dailyLogFiltersVisible}
                        onUnsavedChangesChange={handleUnsavedLogChangesChange}
                        onExportRegister={registerExportDailyLog}
                        onViewDocument={(html: string, title: string) => {
                            setDocPreviewHtml(html);
                            setDocPreviewTitle(title);
                            setPreviewSource(null);
                            setDocPreviewVisible(true);
                        }}
                    />
                </View>

                <View style={{ display: activeSegment === 'payroll' ? 'flex' : 'none' }}>
                    <CrewPayrollTab
                        crewMembers={crewMembers}
                        dailyLogs={dailyLogs}
                        requests={requests}
                        projects={projects}
                        weeklyStartDate={payrollStartDate}
                        onWeeklyStartDateChange={setPayrollStartDate}
                        onViewDocument={(html, title) => {
                            setDocPreviewHtml(html);
                            setDocPreviewTitle(title);
                            setPreviewSource('PAYROLL');
                            setDocPreviewVisible(true);
                        }}
                        onExportRegister={registerExportPayroll}
                    />
                </View>

                <View style={{ display: activeSegment === 'requests' ? 'flex' : 'none' }}>
                    <CrewRequestsTab
                        requests={requests}
                        projects={projects}
                        selectedRequestId={selectedRequestForEdit?.id}
                        onAddRequest={() => {
                            setSelectedRequestForEdit(null);
                            setRequestModalVisible(true);
                        }}
                        onApproveRequest={handleApproveRequest}
                        onRejectRequest={handleRejectRequest}
                        onSelectRequest={(req) => {
                            setSelectedRequestForEdit(req);
                            if (!isDesktopWeb) {
                                setRequestModalVisible(true);
                            }
                        }}
                        onExportRegister={registerExportRequests}
                        weeklyStartDate={payrollStartDate}
                        onWeeklyStartDateChange={setPayrollStartDate}
                        onMoveRequestToWeek={handleMoveRequestToWeek}
                        onDeleteRequest={handleDeleteRequest}
                        onViewDocument={(html, title) => {
                            setDocPreviewHtml(html);
                            setDocPreviewTitle(title);
                            setPreviewSource('REQUESTS');
                            setDocPreviewVisible(true);
                        }}
                    />
                </View>
            </>
        );
    };

    const renderDesktopRightPane = () => {
        if (activeSegment === 'directory') {
            if (selectedMemberForDetail) {
                return (
                    <CrewDetailModal
                        key={`desktop-detail-${selectedMemberForDetail.id}`}
                        visible={true}
                        onClose={() => setSelectedMemberForDetail(null)}
                        member={selectedMemberForDetail}
                        onEdit={(member) => {
                            setSelectedMemberForEdit(member);
                            setMemberModalVisible(true);
                        }}
                        onSave={handleSaveMember}
                        onDelete={handleDeleteMember}
                        assignments={assignments}
                        projects={projects}
                        crewMembers={crewMembers}
                        onViewDocument={(html: string, title: string) => {
                            setDocPreviewHtml(html);
                            setDocPreviewTitle(title);
                            setPreviewSource('DETAIL');
                            setDocPreviewVisible(true);
                        }}
                        onViewImage={(url: string, title: string) => {
                            setPreviewImageUrl(url);
                            setPreviewImageTitle(title);
                            setPreviewSource('DETAIL');
                        }}
                        isEmbedded={true}
                    />
                );
            }
            return (
                <View style={s.desktopEmptyPane}>
                    <View style={[s.desktopEmptyIconCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                        <PlatformIcon
                            name="person.2.fill"
                            size={36}
                            tintColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)'}
                        />
                    </View>
                    <Text style={[s.desktopEmptyTitle, { color: textColor }]}>Select a Crew Member</Text>
                    <Text style={[s.desktopEmptySubtitle, { color: subtextColor }]}>
                        Choose a crew member from the roster on the left to view personal details, contact info, site assignment, wage rates, and certification documents.
                    </Text>
                    <TouchableOpacity
                        onPress={() => {
                            setSelectedMemberForEdit(null);
                            setMemberModalVisible(true);
                        }}
                        style={[s.desktopEmptyBtn, { backgroundColor: '#8B5CF6' }]}
                    >
                        <Ionicons name="add" size={18} color="#FFFFFF" />
                        <Text style={s.desktopEmptyBtnText}>Add Crew</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        if (activeSegment === 'assignment') {
            if (selectedAssignmentForEdit) {
                return (
                    <CrewAssignmentModal
                        key={`desktop-assign-${selectedAssignmentForEdit.id}`}
                        visible={true}
                        onClose={() => setSelectedAssignmentForEdit(null)}
                        onSave={handleSaveAssignment}
                        onDelete={handleDeleteAssignment}
                        assignment={selectedAssignmentForEdit}
                        crewMembers={crewMembers}
                        projects={projects}
                        assignments={assignments}
                        onViewDocument={(html, title) => {
                            setDocPreviewHtml(html);
                            setDocPreviewTitle(title);
                            setPreviewSource('ASSIGNMENT');
                            setDocPreviewVisible(true);
                        }}
                        isEmbedded={true}
                    />
                );
            }
            return (
                <View style={s.desktopEmptyPane}>
                    <View style={[s.desktopEmptyIconCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                        <PlatformIcon
                            name="briefcase.fill"
                            size={36}
                            tintColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)'}
                        />
                    </View>
                    <Text style={[s.desktopEmptyTitle, { color: textColor }]}>Select an Assignment</Text>
                    <Text style={[s.desktopEmptySubtitle, { color: subtextColor }]}>
                        Choose an assignment on the left to review deployment project, dates, worker details, and employment contract agreements.
                    </Text>
                    <TouchableOpacity
                        onPress={() => {
                            setSelectedAssignmentForEdit(null);
                            setPreselectedCrewIdForAssign(undefined);
                            setAssignmentModalVisible(true);
                        }}
                        style={[s.desktopEmptyBtn, { backgroundColor: '#8B5CF6' }]}
                    >
                        <Ionicons name="add" size={18} color="#FFFFFF" />
                        <Text style={s.desktopEmptyBtnText}>New Assignment</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        if (activeSegment === 'requests') {
            if (selectedRequestForEdit) {
                return (
                    <CrewRequestModal
                        key={`desktop-req-${selectedRequestForEdit.id}`}
                        visible={true}
                        onClose={() => setSelectedRequestForEdit(null)}
                        onSave={handleSaveRequest}
                        request={selectedRequestForEdit}
                        crewMembers={crewMembers}
                        projects={projects}
                        isEmbedded={true}
                    />
                );
            }
            return (
                <View style={s.desktopEmptyPane}>
                    <View style={[s.desktopEmptyIconCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                        <PlatformIcon
                            name="paperplane.fill"
                            size={36}
                            tintColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)'}
                        />
                    </View>
                    <Text style={[s.desktopEmptyTitle, { color: textColor }]}>Select a Request</Text>
                    <Text style={[s.desktopEmptySubtitle, { color: subtextColor }]}>
                        Choose a crew leave, cash advance (kasbon), or field reimbursement request from the list to review details and take approval actions.
                    </Text>
                    <TouchableOpacity
                        onPress={() => {
                            setSelectedRequestForEdit(null);
                            setRequestModalVisible(true);
                        }}
                        style={[s.desktopEmptyBtn, { backgroundColor: '#8B5CF6' }]}
                    >
                        <Ionicons name="add" size={18} color="#FFFFFF" />
                        <Text style={s.desktopEmptyBtnText}>New Request</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        if (activeSegment === 'daily_log') {
            return (
                <View style={s.desktopEmptyPane}>
                    <View style={[s.desktopEmptyIconCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                        <PlatformIcon
                            name="calendar.badge.clock"
                            size={36}
                            tintColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)'}
                        />
                    </View>
                    <Text style={[s.desktopEmptyTitle, { color: textColor }]}>Daily Labor Logs</Text>
                    <Text style={[s.desktopEmptySubtitle, { color: subtextColor }]}>
                        Record work hours, attendance statuses, and overtime for crew workers on site. Tap any worker row on the left to adjust their shift hours.
                    </Text>
                </View>
            );
        }

        return (
            <View style={s.desktopEmptyPane}>
                <View style={[s.desktopEmptyIconCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                    <PlatformIcon
                        name="banknote.fill"
                        size={36}
                        tintColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)'}
                    />
                </View>
                <Text style={[s.desktopEmptyTitle, { color: textColor }]}>Payroll & Wage Payouts</Text>
                <Text style={[s.desktopEmptySubtitle, { color: subtextColor }]}>
                    Review weekly wage calculations, regular base earnings, overtime allowances, kasbon deductions, and export itemized payslips.
                </Text>
            </View>
        );
    };

    return (
        <>
            <Stack.Screen options={{
                headerShown: Platform.OS !== 'web',
                title: 'Crew',
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
                    <View style={{ flexDirection: 'row', alignItems: 'center' }} pointerEvents="box-none">
                        <HeaderToolbar actions={toolbarActions} isDark={isDark} textColor={textColor} maxDirectActions={3} primaryActionBgColor="#8B5CF6" />
                    </View>
                ) : undefined,
            }} />

            {Platform.OS === 'web' && !isDesktopWeb && (
                <WebFinderHeader
                    title="Crew"
                    showBack
                    actions={isAuthenticated ? toolbarActions : undefined}
                    primaryActionBgColor="#8B5CF6"
                    centerComponent={
                        <SegmentedControl
                            segments={SEGMENTS}
                            activeSegment={activeSegment}
                            onSegmentChange={setActiveSegment}
                        />
                    }
                />
            )}

            <SwipeTabWrapper segments={SEGMENTS} activeSegment={activeSegment} onSegmentChange={setActiveSegment}>
                {isDesktopWeb ? (
                    <View style={[s.splitRoot, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}>
                        {/* Left Pane (flex: 1.1) */}
                        <View style={[s.splitLeftPane, { borderRightColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)', backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}>
                            {/* Header with Title + Action Buttons */}
                            <View style={s.splitListHeader}>
                                <View style={s.splitListHeaderTitleRow}>
                                    <Text style={[s.splitListHeaderTitle, { color: textColor }]}>Crew</Text>
                                    {isAuthenticated && (
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <TouchableOpacity
                                                onPress={handleDesktopExport}
                                                style={[s.headerActionCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
                                            >
                                                <Ionicons name="share-outline" size={16} color={textColor} />
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                onPress={handleDesktopPrimaryAdd}
                                                style={[s.headerActionCircle, { backgroundColor: '#8B5CF6' }]}
                                            >
                                                <Ionicons name="add" size={18} color="#FFFFFF" />
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>

                                {/* Filter Segmented Control */}
                                <View style={{ marginTop: 12 }}>
                                    <SegmentedControl
                                        fullWidth
                                        style={{ width: '100%' }}
                                        segments={SEGMENTS}
                                        activeSegment={activeSegment}
                                        onSegmentChange={setActiveSegment}
                                    />
                                </View>
                            </View>

                            <ScrollView
                                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? '#FFF' : '#000'} />}
                                contentInsetAdjustmentBehavior="automatic"
                                style={{ flex: 1 }}
                                contentContainerStyle={{ paddingBottom: 120, paddingTop: 8, paddingHorizontal: 16 }}
                                showsVerticalScrollIndicator={true}
                            >
                                {renderTabContent()}
                            </ScrollView>
                        </View>

                        {/* Right Pane (flex: 2) */}
                        <View style={[s.splitRightPane, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}>
                            {renderDesktopRightPane()}
                        </View>
                    </View>
                ) : (
                    <ScrollView
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? '#FFF' : '#000'} />}
                        contentInsetAdjustmentBehavior="automatic"
                        style={{ flex: 1, backgroundColor: Platform.OS === 'web' ? 'transparent' : (isDark ? '#000' : '#F2F2F7') }}
                        contentContainerStyle={{
                            paddingBottom: 120,
                            paddingTop: 0
                        }}
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
                                    segments={SEGMENTS}
                                    activeSegment={activeSegment}
                                    onSegmentChange={setActiveSegment}
                                />
                            </View>
                        )}

                        <View style={{ flex: 1, paddingHorizontal: 20 }}>
                            {renderTabContent()}
                        </View>
                    </ScrollView>
                )}
            </SwipeTabWrapper>

            {/* Overlays / Modals */}
            <SwiftUICrewDetailSheet
                isOpened={!isDesktopWeb && detailModalVisible}
                onClose={() => setDetailModalVisible(false)}
                member={selectedMemberForDetail}
                onEdit={(member) => {
                    setSelectedMemberForEdit(member);
                    setMemberModalVisible(true);
                }}
                onSave={handleSaveMember}
                onDelete={handleDeleteMember}
                onViewDocument={(html, title) => {
                    setDocPreviewHtml(html);
                    setDocPreviewTitle(title);
                    setPreviewSource('DETAIL');
                    // Close detail sheet first, then show preview after dismiss animation
                    setDetailModalVisible(false);
                    setTimeout(() => {
                        setDocPreviewVisible(true);
                    }, 500);
                }}
                onViewImage={(url, title) => {
                    setPreviewImageUrl(url);
                    setPreviewImageTitle(title);
                    setPreviewSource('DETAIL');
                    setDetailModalVisible(false);
                }}
                assignments={assignments}
                projects={projects}
                crewMembers={crewMembers}
            />

            <CrewDocumentPreview
                visible={docPreviewVisible}
                onClose={() => {
                    setDocPreviewVisible(false);
                    setDocPreviewHtml(null);
                    // Re-open previous sheet if appropriate
                    if (previewSource === 'DETAIL') {
                        setTimeout(() => {
                            setDetailModalVisible(true);
                        }, 400);
                    } else if (previewSource === 'ASSIGNMENT') {
                        setTimeout(() => {
                            setAssignmentModalVisible(true);
                        }, 400);
                    }
                    setPreviewSource(null);
                }}
                html={docPreviewHtml}
                title={docPreviewTitle}
            />

            <SwiftUIImagePreviewSheet
                isOpened={!!previewImageUrl}
                onClose={() => {
                    setPreviewImageUrl(null);
                    if (previewSource === 'DETAIL') {
                        setTimeout(() => {
                            setDetailModalVisible(true);
                        }, 400);
                    }
                    setPreviewSource(null);
                }}
                imageUrl={previewImageUrl}
                title={previewImageTitle}
            />

            <SwiftUICrewMemberSheet
                isOpened={memberModalVisible}
                onClose={() => setMemberModalVisible(false)}
                onSave={handleSaveMember}
                member={selectedMemberForEdit}
            />

            <SwiftUICrewAssignmentSheet
                isOpened={!isDesktopWeb && assignmentModalVisible}
                onClose={() => {
                    setAssignmentModalVisible(false);
                    setPreselectedCrewIdForAssign(undefined);
                }}
                onSave={handleSaveAssignment}
                onDelete={handleDeleteAssignment}
                assignment={selectedAssignmentForEdit}
                preselectedCrewId={preselectedCrewIdForAssign}
                crewMembers={crewMembers}
                projects={projects}
                assignments={assignments}
                onViewDocument={(html, title) => {
                    setDocPreviewHtml(html);
                    setDocPreviewTitle(title);
                    setPreviewSource('ASSIGNMENT');
                    // Close assignment sheet first
                    setAssignmentModalVisible(false);
                    setPreselectedCrewIdForAssign(undefined);
                    setTimeout(() => {
                        setDocPreviewVisible(true);
                    }, 500);
                }}
            />

            <SwiftUICrewRequestSheet
                isOpened={!isDesktopWeb && requestModalVisible}
                onClose={() => setRequestModalVisible(false)}
                onSave={handleSaveRequest}
                request={selectedRequestForEdit}
                crewMembers={crewMembers}
                projects={projects}
            />

            {/* Global Sticky Save Changes Bar */}
            {isFocused && unsavedLogChanges && saveLogsFn && activeSegment === 'daily_log' && (
                <View style={[
                    s.floatingSaveContainerOuter, 
                    { 
                        bottom: 16,
                        height: 72 
                    }
                ]}>
                    {Platform.OS === 'ios' && SwiftUIHost && SwiftUIHStack && SwiftUIVStack && SwiftUIButton && SwiftUIText && SwiftUIGlassEffectContainer && SwiftUICircle && SwiftUISpacer && swiftModifiers ? (
                        <SwiftUIHost style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                            <SwiftUIGlassEffectContainer modifiers={[
                                swiftModifiers.frame({ maxWidth: Infinity, height: 72 }),
                                swiftModifiers.cornerRadius(30)
                            ]}>
                                <SwiftUIHStack alignment="center" spacing={16} modifiers={[
                                    swiftModifiers.padding({ top: 12, bottom: 12, leading: 24, trailing: 24 }),
                                    swiftModifiers.glassEffect({ shape: 'capsule' })
                                ]}>
                                    {/* Left side: status warning dot + text block */}
                                    <SwiftUIHStack alignment="center" spacing={10}>
                                        <SwiftUICircle modifiers={[
                                            swiftModifiers.frame({ width: 8, height: 8 }),
                                            swiftModifiers.foregroundStyle('#FF9500'),
                                            swiftModifiers.shadow({ radius: 4, color: '#FF9500' })
                                        ]} />
                                        
                                        <SwiftUIVStack alignment="leading" spacing={2}>
                                            <SwiftUIText weight="bold" size={15} color={isDark ? '#FFFFFF' : '#1C1C1E'}>
                                                Unsaved Changes
                                            </SwiftUIText>
                                            <SwiftUIText size={11} color={isDark ? '#A1A1A6' : '#8E8E93'}>
                                                {`${unsavedLogCount} daily log changes`}
                                            </SwiftUIText>
                                        </SwiftUIVStack>
                                    </SwiftUIHStack>
                                    
                                    <SwiftUISpacer />
                                    
                                    {/* Action button */}
                                    <SwiftUIButton
                                        onPress={saveLogsFn}
                                        modifiers={[
                                            swiftModifiers.buttonStyle('glassProminent'),
                                            swiftModifiers.tint('#007AFF'),
                                            swiftModifiers.frame({ minWidth: 80, height: 38 })
                                        ]}
                                    >
                                        Save
                                    </SwiftUIButton>
                                </SwiftUIHStack>
                            </SwiftUIGlassEffectContainer>
                        </SwiftUIHost>
                    ) : (
                        <BlurView
                            intensity={Platform.OS === 'android' ? 40 : 80}
                            tint={Platform.OS === 'android' ? (isDark ? 'dark' : 'light') : (isDark ? 'systemChromeMaterialDark' : 'systemChromeMaterial')}
                            style={s.floatingSaveContainerNew}
                        >
                            {Platform.OS === 'android' && (
                                <View style={[StyleSheet.absoluteFill, {
                                    backgroundColor: isDark ? 'rgba(44,44,46,0.85)' : 'rgba(255,255,255,0.85)',
                                    borderRadius: 50,
                                }]} />
                            )}
                            <View style={s.leftContent}>
                                <View style={s.statusDotNew} />
                                <View style={s.textBlock}>
                                    <Text style={[s.mainTitleNew, { color: textColor }]}>Unsaved Changes</Text>
                                    <Text style={[s.subtextNew, { color: textColor }]}>{unsavedLogCount} daily log changes</Text>
                                </View>
                            </View>
                            <PillButton
                                label="Save"
                                onPress={saveLogsFn}
                                color="blue"
                                variant="solid"
                                style={s.actionButtonNew}
                            />
                        </BlurView>
                    )}
                </View>
            )}
        </>
    );
}

const s = StyleSheet.create({
    seg: {
        marginBottom: 24,
        marginHorizontal: -4,
    },
    floatingSaveContainerOuter: {
        position: 'absolute',
        left: 20,
        right: 20,
        zIndex: 1000,
    },
    floatingSaveContainerNew: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 50,
        width: '100%',
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.15,
                shadowRadius: 24,
            },
            android: {
                elevation: 16,
            },
        }),
    },
    leftContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    statusDotNew: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 12,
        backgroundColor: '#FF9500',
        shadowColor: '#FF9500',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 6,
    },
    textBlock: {
        flex: 1,
        justifyContent: 'center',
        gap: 2,
    },
    mainTitleNew: {
        fontSize: 15,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    subtextNew: {
        fontSize: 11,
        fontWeight: '400',
        opacity: 0.6,
    },
    actionButtonNew: {
        minWidth: 100,
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
        letterSpacing: -0.3,
    },
    desktopEmptySubtitle: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        maxWidth: 380,
        marginBottom: 24,
    },
    desktopEmptyBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 24,
        gap: 6,
    },
    desktopEmptyBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
});
