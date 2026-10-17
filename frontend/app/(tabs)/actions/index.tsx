import { DESKTOP_LIST_PANE, DESKTOP_PANEL_HEADER, DESKTOP_PANEL_TITLE_ROW, DESKTOP_PANEL_TITLE, DESKTOP_PANEL_ACTION } from '@/constants/desktopLayout';
import { HeaderBlurBackground } from '@/components/ui/HeaderBlurBackground';
import { FormaBlue } from '@/constants/theme';
import { GlassView } from '@/components/ui/GlassView';
import { HeaderToolbar, HeaderToolbarAction } from '@/components/ui/HeaderToolbar';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Action, PROJECTS } from '@/constants/MockData';
import { getActions, getProfiles, updateActionStatusApi } from '@/lib/api/tasks';
import { getProjects } from '@/lib/api/projects';
import type { Project } from '@/lib/api/projects';
import { SwiftUIAddActionSheet } from '@/components/actions/SwiftUIAddActionSheet';
import { useSearch } from '@/context/SearchContext';
import { useTheme } from '@/context/ThemeContext';
import { useTenantContext } from '@/context/TenantContext';
import { useUserContext } from '@/context/UserProvider';
import { UnauthenticatedView } from '@/components/ui/UnauthenticatedView';
import { Ionicons } from '@expo/vector-icons';
import { SwipeTabWrapper } from '@/components/ui/SwipeTabWrapper';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import * as Haptics from 'expo-haptics';
import { Stack, router, usePathname } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import React, { useMemo, useState, useCallback, useRef } from 'react';
import { RefreshControl, Alert, Dimensions, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Platform, Modal, StatusBar as RNStatusBar, useWindowDimensions, Animated as RNAnimated } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebFinderHeader } from '@/components/ui/WebFinderHeader';
import { SwiftUIActionDetailSheet } from '@/components/actions/SwiftUIActionDetailSheet';
import { SwiftUIToastHUD } from '@/components/ui/SwiftUIToastHUD';
import { UnifiedSearchBar } from '@/components/ui/UnifiedSearchBar';
import { SearchablePicker } from '@/components/ui/SearchablePicker';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ActionsScreen() {
    const { width } = useWindowDimensions();
    const isDesktopWeb = Platform.OS === 'web' && width >= 768;
    const { searchQuery, setSearchQuery, setIsSearchVisible, isSearchVisible, setContextAction } = useSearch();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const insets = useSafeAreaInsets();

    const { isAuthenticated } = useUserContext();
    const { activeTenant } = useTenantContext();
    const isFocused = useIsFocused();
    const [actionsList, setActionsList] = useState<Action[]>([]);
    const [dbProjects, setDbProjects] = useState<Project[]>([]);
    const [dbProfiles, setDbProfiles] = useState<Array<{ id: string; name: string }>>([]);
    const [isAddModalVisible, setIsAddModalVisible] = useState(false);

    // Floating Toast HUD State
    const [toastState, setToastState] = useState<{ message: string; icon?: string; iconColor?: string } | null>(null);
    const toastAnim = useRef(new RNAnimated.Value(0)).current;
    const toastTimerRef = useRef<any>(null);

    const showToast = useCallback((msg: string = 'Action created', icon: string = 'checkmark.circle.fill', iconColor: string = '#34C759') => {
        if (toastTimerRef.current) {
            clearTimeout(toastTimerRef.current);
        }
        setToastState({ message: msg, icon, iconColor });
        toastAnim.setValue(0);
        RNAnimated.spring(toastAnim, {
            toValue: 1,
            useNativeDriver: Platform.OS !== 'web',
            friction: 8,
            tension: 90,
        }).start();

        toastTimerRef.current = setTimeout(() => {
            RNAnimated.timing(toastAnim, {
                toValue: 0,
                duration: 180,
                useNativeDriver: Platform.OS !== 'web',
            }).start(() => {
                setToastState(null);
            });
        }, 2200);
    }, [toastAnim]);

    const loadActions = useCallback(async () => {
        if (!isAuthenticated) {
            setActionsList([]);
            return;
        }
        try {
            const tenantId = activeTenant?.id;
            const [data, projectsData, profilesData] = await Promise.all([
                getActions(tenantId),
                getProjects(tenantId),
                getProfiles(tenantId),
            ]);
            setActionsList(data);
            if (projectsData && Array.isArray(projectsData)) {
                setDbProjects(projectsData);
            }
            if (profilesData && Array.isArray(profilesData)) {
                setDbProfiles(profilesData);
            }
        } catch (err) {
            console.error('Failed to load actions data:', err);
        }
    }, [isAuthenticated, activeTenant?.id]);

    const { refreshing, onRefresh } = usePullToRefresh(loadActions);

    React.useEffect(() => {
        if (!isFocused) return;

        if (isAuthenticated) {
            loadActions();
            setContextAction({
                label: 'Add Action',
                icon: 'add-outline',
                sfIcon: 'plus',
                action: () => router.push('/search-modal'),
                options: [
                    {
                        label: 'Create Action',
                        icon: 'flash-outline',
                        sfIcon: 'bolt.fill',
                        description: 'Add a new action item',
                        action: () => setIsAddModalVisible(true)
                    }
                ]
            });
        } else {
            setContextAction(null);
        }
    }, [isFocused, isAuthenticated, setContextAction, loadActions]);

    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#A1A1A6' : '#6e6e73';

    const [activeStatus, setActiveStatus] = useState('all');
    const [activeTimeFilter, setActiveTimeFilter] = useState('all');
    const [selectedProjectCode, setSelectedProjectCode] = useState('ALL');
    const [selectedAssigneeId, setSelectedAssigneeId] = useState('ALL');
    const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [activePicker, setActivePicker] = useState<'time' | 'project' | 'assignee' | null>(null);
    const [showInlineSearch, setShowInlineSearch] = useState(false);
    const [selectedAction, setSelectedAction] = useState<Action | null>(null);

    React.useEffect(() => {
        if (activeStatus === 'completed') {
            setActiveTimeFilter('all');
        }
    }, [activeStatus]);

    const projectItems = useMemo(() => {
        const items = [{ id: 'ALL', label: 'All Projects', sublabel: 'ALL' }];
        if (dbProjects.length > 0) {
            dbProjects.forEach(p => {
                const label = p.title || (p as any).name || p.code;
                items.push({ id: p.code || p.id, label, sublabel: p.code || 'PRJ' });
            });
        } else {
            const map = new Map<string, string>();
            actionsList.forEach(a => {
                if (a.projectCode && a.project && !map.has(a.projectCode)) {
                    map.set(a.projectCode, a.project);
                }
            });
            PROJECTS.forEach(p => {
                if (!map.has(p.code)) {
                    map.set(p.code, p.title || p.code);
                }
            });
            map.forEach((name, code) => {
                items.push({ id: code, label: name, sublabel: code });
            });
        }
        return items;
    }, [dbProjects, actionsList]);

    const assigneeItems = useMemo(() => {
        const items = [{ id: 'ALL', label: 'All Submitters', sublabel: 'ALL' }];
        if (dbProfiles.length > 0) {
            dbProfiles.forEach(p => {
                items.push({ id: p.name, label: p.name, sublabel: p.name.split(' ')[0] });
            });
            return items;
        }
        return items;
    }, [dbProfiles]);

    const isAnyFilterActive = (activeTimeFilter !== 'all' && activeTimeFilter !== '') || selectedProjectCode !== 'ALL' || selectedAssigneeId !== 'ALL' || sortOrder !== 'asc';

    const filterMenuActions = useMemo(() => {
        return [
            {
                title: 'Time Range',
                actions: [
                    { title: 'This Week', selected: activeTimeFilter === 'week' },
                    { title: 'Today', selected: activeTimeFilter === 'today' },
                    { title: 'Overdue', selected: activeTimeFilter === 'overdue' },
                    { title: 'This Month', selected: activeTimeFilter === 'month' },
                    { title: 'All Time', selected: activeTimeFilter === 'all' },
                ],
            },
            {
                title: 'Project',
                actions: projectItems.map(p => ({
                    title: p.id === 'ALL' ? 'All Projects' : `${p.sublabel} • ${p.label}`,
                    selected: selectedProjectCode === p.id,
                })),
            },
            {
                title: 'Submitter',
                actions: assigneeItems.map(a => ({
                    title: a.id === 'ALL' ? 'All Submitters' : a.label,
                    selected: selectedAssigneeId === a.id,
                })),
            },
            {
                title: 'Sort',
                actions: [
                    { title: 'Oldest First', selected: sortOrder === 'asc' },
                    { title: 'Newest First', selected: sortOrder === 'desc' },
                ],
            },
            ...(isAnyFilterActive ? [
                {
                    title: 'Reset All Filters',
                    destructive: true,
                }
            ] : []),
        ];
    }, [activeTimeFilter, selectedProjectCode, selectedAssigneeId, sortOrder, isAnyFilterActive, projectItems, assigneeItems]);

    const handleFilterMenuPress = useCallback((e: { nativeEvent: { name: string } }) => {
        const name = e.nativeEvent.name;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        if (name === 'Reset All Filters') {
            setActiveTimeFilter('all');
            setSelectedProjectCode('ALL');
            setSelectedAssigneeId('ALL');
            setSortOrder('asc');
            return;
        }

        // Time range
        if (name === 'This Week') { setActiveTimeFilter('week'); return; }
        if (name === 'Today') { setActiveTimeFilter('today'); return; }
        if (name === 'Overdue') { setActiveTimeFilter('overdue'); return; }
        if (name === 'This Month') { setActiveTimeFilter('month'); return; }
        if (name === 'All Time') { setActiveTimeFilter('all'); return; }

        // Sort
        if (name === 'Oldest First') { setSortOrder('asc'); return; }
        if (name === 'Newest First') { setSortOrder('desc'); return; }

        // Project
        if (name === 'All Projects') { setSelectedProjectCode('ALL'); return; }
        const matchedProject = projectItems.find(p => name === `${p.sublabel} • ${p.label}` || name === p.label || name === p.id);
        if (matchedProject) {
            setSelectedProjectCode(matchedProject.id);
            return;
        }

        // Submitter / Assignee
        if (name === 'All Submitters') { setSelectedAssigneeId('ALL'); return; }
        const matchedSubmitter = assigneeItems.find(a => a.label === name || a.id === name);
        if (matchedSubmitter) {
            setSelectedAssigneeId(matchedSubmitter.id);
            return;
        }
    }, [projectItems, assigneeItems]);

    const toolbarActions: HeaderToolbarAction[] = [
        {
            id: 'search',
            icon: 'search',
            image: 'magnifyingglass',
            tintColor: showInlineSearch ? FormaBlue[700] : textColor,
            onPress: () => {
                setShowInlineSearch(prev => !prev);
                if (showInlineSearch) setSearchQuery('');
            }
        },
        {
            id: 'filter',
            icon: 'filter-outline',
            image: 'line.3.horizontal.decrease',
            tintColor: isAnyFilterActive ? FormaBlue[700] : textColor,
            menuActions: filterMenuActions,
            onMenuPress: handleFilterMenuPress,
        },
        {
            id: 'add',
            icon: 'add',
            image: 'plus',
            tintColor: FormaBlue[700],
            onPress: () => setIsAddModalVisible(true)
        }
    ];

    const handleActionStatusChange = async (
        id: string,
        nextStatus: Action['status'],
        actionTypeOverride?: 'approve' | 'reject' | 'revision' | 'dispute' | 'confirm',
        newAmount?: number
    ) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            const success = await updateActionStatusApi(id, nextStatus);
            if (!success) {
                Alert.alert(
                    'Action Failed',
                    'Failed to update action status on server. Please try again.',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Try Again', onPress: () => handleActionStatusChange(id, nextStatus, actionTypeOverride, newAmount) }
                    ]
                );
                return;
            }

            setActionsList(prev => prev.map(a => {
                if (a.id === id) {
                    const updatedAction: Action = { ...a, status: nextStatus };
                    if (newAmount !== undefined && updatedAction.details) {
                        updatedAction.details = { ...updatedAction.details, amount: newAmount };
                    }
                    return updatedAction;
                }
                return a;
            }));

            if (selectedAction?.id === id) {
                setSelectedAction(prev => {
                    if (!prev) return null;
                    const updatedAction: Action = { ...prev, status: nextStatus };
                    if (newAmount !== undefined && updatedAction.details) {
                        updatedAction.details = { ...updatedAction.details, amount: newAmount };
                    }
                    return updatedAction;
                });
            }
        } catch (err) {
            console.error('Failed to update action status:', err);
            Alert.alert('Error', 'An unexpected error occurred while updating status.');
        }

        // Standard Success Popup
        if (['completed', 'revision', 'rejected'].includes(nextStatus)) {
            const action = actionsList.find(a => a.id === id);
            let title = 'Success';
            let message = 'Action has been successfully completed.';

            const type = actionTypeOverride || action?.actionType;

            if (actionTypeOverride === 'revision') {
                title = 'Revision Requested';
                message = 'The task has been returned to the Staff\'s task list.';
            } else if (type === 'approve') {
                title = 'Action Approved';
                message = 'The submission has been finalized.';
            } else if (type === 'reject') {
                title = 'Action Rejected';
                message = 'The submission has been rejected.';
            } else if (type === 'dispute') {
                title = 'Dispute Submitted';
                message = 'Dispute has been sent for further review.';
            } else if (type === 'confirm' || type === 'confirmation') {
                title = 'Confirmed';
                message = 'Acknowledgement confirmed.';
            } else if (action?.actionType === 'approval') {
                title = 'Approved';
                message = 'Action Approved and Finalized.';
            }

            Alert.alert(title, message, [{ text: 'OK' }]);
        }
    };

    const filteredActions = useMemo(() => {
        let result = actionsList;

        // Status Filter
        if (activeStatus !== 'all') {
            if (activeStatus === 'returned') {
                result = result.filter(a => ['revision', 'rejected'].includes(a.status));
            } else if (activeStatus === 'completed') {
                result = result.filter(a => a.status === 'completed');
            } else {
                result = result.filter(a => a.status === activeStatus);
            }
        }

        // Project Filter
        if (selectedProjectCode !== 'ALL') {
            result = result.filter(a => a.projectCode === selectedProjectCode);
        }

        // Submitter Filter
        if (selectedAssigneeId !== 'ALL') {
            result = result.filter(a => a.submitter === selectedAssigneeId);
        }

        // Time Filter
        if (activeTimeFilter !== 'all') {
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            const todayStr = now.toISOString().split('T')[0];

            result = result.filter(a => {
                if (!a.date) return true;
                const actionDateStr = a.date;

                if (activeTimeFilter === 'today') {
                    return actionDateStr === todayStr;
                }

                if (activeTimeFilter === 'overdue') {
                    return actionDateStr < todayStr && !['completed', 'revision', 'rejected'].includes(a.status);
                }

                if (activeTimeFilter === 'week') {
                    const todayObj = new Date();
                    const dayOfWeek = todayObj.getDay();
                    const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
                    const monday = new Date(todayObj);
                    monday.setDate(todayObj.getDate() + diffToMon);
                    monday.setHours(0, 0, 0, 0);
                    const sunday = new Date(monday);
                    sunday.setDate(monday.getDate() + 6);
                    sunday.setHours(23, 59, 59, 999);

                    const mondayStr = monday.toISOString().split('T')[0];
                    const sundayStr = sunday.toISOString().split('T')[0];

                    if (actionDateStr < mondayStr && !['completed', 'revision', 'rejected'].includes(a.status)) return true;
                    return actionDateStr >= mondayStr && actionDateStr <= sundayStr;
                }

                if (activeTimeFilter === 'month') {
                    const monthPrefix = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}`;
                    return actionDateStr.startsWith(monthPrefix);
                }

                return true;
            });
        }

        // Search Filter
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(a =>
                a.title.toLowerCase().includes(q) ||
                (a.project && a.project.toLowerCase().includes(q)) ||
                (a.projectCode && a.projectCode.toLowerCase().includes(q)) ||
                (a.submitter && a.submitter.toLowerCase().includes(q))
            );
        }

        // Sort by Date (ASC or DESC)
        return [...result].sort((a, b) => {
            const dateA = a.date || '9999-12-31';
            const dateB = b.date || '9999-12-31';

            if (sortOrder === 'desc') {
                return dateB.localeCompare(dateA);
            } else {
                return dateA.localeCompare(dateB);
            }
        });
    }, [actionsList, activeStatus, activeTimeFilter, selectedProjectCode, selectedAssigneeId, selectedMonth, sortOrder, searchQuery]);

    const hexToRgba = (hex: string, opacity: number) => {
        if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) return `rgba(128,128,128,${opacity})`;
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    };

    const getPriorityColor = (p: string) => {
        switch (p?.toLowerCase()) {
            case 'urgent': return isDark ? '#FF453A' : '#FF3B30';
            case 'high': return isDark ? '#FF9F0A' : '#FF9500';
            case 'medium':
            case 'low':
            default: return isDark ? '#98989D' : '#8E8E93';
        }
    };

    const getStatusStyles = (s: Action['status']) => {
        switch (s) {
            case 'urgent': return { color: isDark ? '#FF453A' : '#FF3B30', label: 'Urgent' };
            case 'pending': return { color: isDark ? '#0A84FF' : '#007AFF', label: 'Pending' };
            case 'completed': return { color: isDark ? '#32D74B' : '#34C759', label: 'Done' };
            case 'revision': return { color: isDark ? '#FF9F0A' : '#FF9500', label: 'Revision' };
            case 'rejected': return { color: isDark ? '#FF453A' : '#FF3B30', label: 'Rejected' };
            default: return { color: isDark ? '#98989D' : '#8E8E93', label: 'Unknown' };
        }
    };

    const getModuleBadgeInfo = (module: Action['module']) => {
        switch (module) {
            case 'finance': return { label: 'FIN', color: '#FF2D55', icon: 'creditcard.fill' };
            case 'resources': return { label: 'RES', color: '#F08C45', icon: 'archivebox.fill' };
            case 'people': return { label: 'PEO', color: '#10B981', icon: 'person.2.fill' };
            case 'clock': return { label: 'CLK', color: '#0284C7', icon: 'clock.fill' };
            case 'report': return { label: 'RPT', color: '#14B8A6', icon: 'doc.text.fill' };
            case 'crew': return { label: 'CREW', color: '#8B5CF6', icon: 'hardhat.fill' };
            case 'project': return { label: 'PRJ', color: '#007AFF', icon: 'folder.fill' };
            case 'forma_ai': return { label: 'AI', color: '#6366F1', icon: 'sparkles.fill' };
            case 'tracking': return { label: 'TRK', color: '#64748B', icon: 'target' };
            default: return { label: 'OTH', color: '#8E8E93', icon: 'bolt.fill' };
        }
    };

    const formatCardDate = (dateStr: any) => {
        if (!dateStr || typeof dateStr !== 'string') return '';
        if (!dateStr.includes('-')) return dateStr;
        const parts = dateStr.split('-');
        if (parts.length !== 3) return dateStr;
        
        const year = parseInt(parts[0], 10);
        const monthIndex = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        
        if (isNaN(year) || isNaN(monthIndex) || isNaN(day)) return dateStr;
        
        const currentYear = new Date().getFullYear();
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = monthNames[monthIndex] || '';
        
        if (year === currentYear) {
            return `${day} ${month}`;
        } else {
            return `${day} ${month} ${year}`;
        }
    };

    const renderActionCard = ({ action, index, isSelected, onPressOverride }: { action: Action, index: number, isSelected?: boolean, onPressOverride?: () => void }) => {
        const statusStyle = getStatusStyles(action.status);
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const today = now.toISOString().split('T')[0];
        const isOverdue = action.date && action.date < today && !['completed', 'revision', 'rejected'].includes(action.status);

        // Solid card with active selection highlight
        const cardBg = isSelected
            ? (isDark ? 'rgba(10, 132, 255, 0.22)' : FormaBlue[100])
            : (isDark ? '#1C1C1E' : '#FFFFFF');
        const mod = getModuleBadgeInfo(action.module === 'other' && action.relatedTaskId ? 'project' : action.module);
        const iconBg = isDark ? hexToRgba(mod.color, 0.18) : hexToRgba(mod.color, 0.12);
        const iconTintColor = isDark ? '#A1A1AA' : '#6B7280';

        return (
            <Animated.View key={action.id} entering={Platform.OS === 'web' ? undefined : FadeInUp.delay(index * 30)}>
                <TouchableOpacity onPress={onPressOverride ? onPressOverride : () => setSelectedAction(action)} activeOpacity={Platform.OS === 'web' ? 1 : 0.7}>
                    <View
                        style={[
                            styles.compactCard,
                            {
                                backgroundColor: cardBg,
                                borderWidth: 1,
                                borderColor: 'transparent',
                            },
                            isSelected && {
                                borderColor: isDark ? 'rgba(10, 132, 255, 0.4)' : FormaBlue[400],
                                borderWidth: 1,
                            }
                        ]}
                    >
                        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                            {/* Left: Module Icon identical to Dashboard */}
                            <View
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 16,
                                    flexShrink: 0,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: iconBg,
                                }}
                            >
                                <PlatformIcon
                                    name={mod.icon as any}
                                    size={16}
                                    tintColor={iconTintColor}
                                    weight="semibold"
                                />
                            </View>

                            {/* Right: Content */}
                            <View style={[styles.cardInfo, { flexDirection: 'row', gap: 8 }]}>
                                {/* Left column */}
                                <View style={{ flex: 1, justifyContent: 'center' }}>
                                    {/* Row 1: Title (max 2 lines) */}
                                    <Text style={[styles.compactTitle, { color: textColor, marginBottom: 4 }]} numberOfLines={2}>
                                        {action.title}
                                    </Text>

                                    {/* Row 2: Project code (badge pill) + Date */}
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                                        <View style={[styles.projectBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', borderWidth: 0.5, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', marginRight: 0 }]}>
                                            <Text style={[styles.projectBadgeText, { color: subtextColor }]}>{action.projectCode}</Text>
                                        </View>
                                        <Text style={{ fontSize: 11, fontWeight: '600', color: subtextColor }}>
                                            {formatCardDate(action.date)}
                                        </Text>
                                    </View>
                                </View>

                                {/* Right column: Borderless status badge + Submitter */}
                                <View style={{ alignItems: 'flex-end', justifyContent: 'space-between', minHeight: 52 }}>
                                    {/* Status Badge without border */}
                                    <View style={[
                                        styles.miniStatusBadge, 
                                        { 
                                            backgroundColor: hexToRgba(statusStyle.color, isDark ? 0.2 : 0.12), 
                                            borderWidth: 0,
                                        }
                                    ]}>
                                        <Text style={[styles.miniStatusText, { color: statusStyle.color, fontWeight: '700' }]}>
                                            {statusStyle.label}
                                        </Text>
                                    </View>

                                    {/* Submitter Avatar */}
                                    {action.submitter ? (
                                        <View 
                                            style={[
                                                styles.miniAvatar, 
                                                { 
                                                    backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF', 
                                                    borderColor: isDark ? '#1C1C1E' : '#F2F2F7', 
                                                }
                                            ]}
                                        >
                                            <Text style={[styles.miniAvatarText, { color: textColor }]}>
                                                {((action.submitter || 'Staff').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase())}
                                            </Text>
                                        </View>
                                    ) : (
                                        <View style={{ height: 22 }} />
                                    )}
                                </View>
                            </View>
                        </View>
                    </View>
                </TouchableOpacity>
            </Animated.View>
        );
    };

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: Platform.OS !== 'web',
                    title: 'Actions',
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
                    headerRight: () => isAuthenticated ? (
                        <HeaderToolbar actions={toolbarActions} isDark={isDark} textColor={textColor} maxDirectActions={3} />
                    ) : null,
                }}
            />

            {Platform.OS === 'web' && !isDesktopWeb && (
                <WebFinderHeader
                    title="Actions"
                    actions={isAuthenticated ? toolbarActions : undefined}
                    centerComponent={
                        <SegmentedControl
                            fullWidth
                            style={{ width: '100%' }}
                            segments={[
                                { id: 'all', label: 'All', icon: 'list.bullet.rectangle.fill' },
                                { id: 'urgent', label: 'Urgent', icon: 'bolt.fill' },
                                { id: 'pending', label: 'Pending', icon: 'clock.fill' },
                                { id: 'returned', label: 'Returned', icon: 'arrow.uturn.left.circle.fill' },
                                { id: 'completed', label: 'Done', icon: 'checkmark.circle.fill' },
                            ]}
                            activeSegment={activeStatus}
                            onSegmentChange={(id) => setActiveStatus(id as any)}
                        />
                    }
                />
            )}

            {/* Main Content Area */}
            {isDesktopWeb ? (
                <View style={styles.splitRoot}>
                    {/* Left Pane: Actions List (flex: 1) */}
                    <View style={[styles.splitLeftPane, { borderRightColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                        {/* Header with Title + Action Buttons */}
                        <View style={styles.splitListHeader}>
                            <View style={styles.splitListHeaderTitleRow}>
                                <Text style={[styles.splitListHeaderTitle, { color: textColor }]}>Actions</Text>
                                {isAuthenticated && (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <TouchableOpacity
                                            onPress={() => setShowInlineSearch(prev => !prev)}
                                            style={[styles.headerActionCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
                                        >
                                            <Ionicons name="search-outline" size={16} color={textColor} />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => setIsAddModalVisible(true)}
                                            style={[styles.headerActionCircle, { backgroundColor: FormaBlue[700] }]}
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
                                    segments={[
                                        { id: 'all', label: 'All' },
                                        { id: 'urgent', label: 'Urgent' },
                                        { id: 'pending', label: 'Pending' },
                                        { id: 'returned', label: 'Returned' },
                                        { id: 'completed', label: 'Done' },
                                    ]}
                                    activeSegment={activeStatus}
                                    onSegmentChange={setActiveStatus}
                                />
                            </View>

                            {showInlineSearch && (
                                <View style={{ marginTop: 12 }}>
                                    <UnifiedSearchBar
                                        value={searchQuery}
                                        onChangeText={setSearchQuery}
                                        placeholder="Search actions..."
                                        onClose={() => {
                                            setShowInlineSearch(false);
                                            setSearchQuery('');
                                        }}
                                    />
                                </View>
                            )}
                        </View>

                        {/* List ScrollView */}
                        <ScrollView
                            style={styles.splitListScroll}
                            contentContainerStyle={{ padding: 12, paddingBottom: 60 }}
                            showsVerticalScrollIndicator={true}
                        >
                            {!isAuthenticated ? (
                                <UnauthenticatedView
                                    compact
                                    title={`Actions — ${activeStatus.charAt(0).toUpperCase() + activeStatus.slice(1)}`}
                                    description="Sign in to your organization workspace to review, expedite decisions, and track team approvals in real time."
                                    buttonText="Sign In"
                                />
                            ) : filteredActions.length === 0 ? (
                                <View style={[styles.emptyContainer, { paddingVertical: 40 }]}>
                                    <View style={[styles.emptyIconBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)' }]}>
                                        <PlatformIcon name="bolt.fill" size={32} tintColor={isDark ? 'rgba(255,255,255,0.4)' : FormaBlue[700]} weight="bold" />
                                    </View>
                                    <Text style={[styles.emptyTitle, { color: textColor, fontSize: 15 }]}>
                                        {searchQuery.trim() ? 'No Actions Found' : 'No Actions'}
                                    </Text>
                                    <Text style={[styles.emptySubtitle, { color: subtextColor, fontSize: 12 }]}>
                                        {searchQuery.trim()
                                            ? `No action matches "${searchQuery.trim()}".`
                                            : 'Everything is clear! No actions pending.'}
                                    </Text>
                                </View>
                            ) : (
                                <View style={{ gap: 8 }}>
                                    {filteredActions.map((action, index) => {
                                        const isSelected = selectedAction?.id === action.id;
                                        return (
                                            renderActionCard({ action, index, isSelected, onPressOverride: () => {
                                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                    setSelectedAction(action);
                                                } })
                                        );
                                    })}
                                </View>
                            )}
                        </ScrollView>
                    </View>

                    {/* Right Pane: Embedded Action Detail (flex: 2) */}
                    <View style={[styles.splitRightPane, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}>
                        {selectedAction ? (
                            <SwiftUIActionDetailSheet
                                isOpened={true}
                                action={selectedAction}
                                isEmbedded={true}
                                onClose={() => setSelectedAction(null)}
                                onStatusChange={handleActionStatusChange}
                                setActionsList={setActionsList}
                            />
                        ) : (
                            <View style={styles.desktopEmptyPane}>
                                <View style={[styles.desktopEmptyIconCircle, { backgroundColor: isDark ? 'rgba(77, 130, 255, 0.12)' : 'rgba(0, 122, 255, 0.08)' }]}>
                                    <PlatformIcon
                                        name="bolt.fill"
                                        size={44}
                                        tintColor={isDark ? FormaBlue[400] : FormaBlue[700]}
                                    />
                                </View>
                                <Text style={[styles.desktopEmptyTitle, { color: textColor }]}>
                                    {actionsList.length === 0 ? 'No Actions Yet' : 'Select an Action'}
                                </Text>
                                <Text style={[styles.desktopEmptySubtitle, { color: subtextColor }]}>
                                    {actionsList.length === 0
                                        ? 'No actions requiring approval or decision in this workspace.'
                                        : 'Choose an action from the list on the left to review details, proof attachments, and make decisions.'}
                                </Text>
                                <TouchableOpacity
                                    onPress={() => setIsAddModalVisible(true)}
                                    style={[styles.desktopEmptyBtn, { backgroundColor: FormaBlue[700] }]}
                                >
                                    <Ionicons name="add" size={18} color="#FFFFFF" />
                                    <Text style={styles.desktopEmptyBtnText}>
                                        {actionsList.length === 0 ? 'Create First Action' : 'New Action'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            ) : (
                <>
                    <SwipeTabWrapper
                        segments={[
                            { id: 'all', label: 'All', icon: 'list.bullet.rectangle.fill' },
                            { id: 'urgent', label: 'Urgent', icon: 'bolt.fill' },
                            { id: 'pending', label: 'Pending', icon: 'clock.fill' },
                            { id: 'returned', label: 'Returned', icon: 'arrow.uturn.left.circle.fill' },
                            { id: 'completed', label: 'Done', icon: 'checkmark.circle.fill' },
                        ]}
                        activeSegment={activeStatus}
                        onSegmentChange={(id) => setActiveStatus(id as any)}
                    >
                        <ScrollView
                            refreshControl={isAuthenticated ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? '#FFF' : '#000'} /> : undefined}
                            style={[styles.scrollView, { backgroundColor: Platform.OS === 'web' ? 'transparent' : (isDark ? '#000000' : '#F2F2F7') }]}
                            contentInsetAdjustmentBehavior="automatic"
                            showsVerticalScrollIndicator={false}
                        >
                            {/* Standard Top Segmented Control & Filter Bar (Mobile Native Only) */}
                            {Platform.OS !== 'web' && (
                                <View style={{
                                    width: '100%',
                                    paddingTop: 8,
                                    paddingBottom: 4,
                                }}>
                                    <View style={{
                                        width: '100%',
                                        alignItems: 'center',
                                        paddingHorizontal: 16,
                                        paddingBottom: 6,
                                    }}>
                                        <SegmentedControl
                                            fullWidth
                                            style={{ width: '100%' }}
                                            segments={[
                                                { id: 'all', label: 'All', icon: 'list.bullet.rectangle.fill' },
                                                { id: 'urgent', label: 'Urgent', icon: 'bolt.fill' },
                                                { id: 'pending', label: 'Pending', icon: 'clock.fill' },
                                                { id: 'returned', label: 'Returned', icon: 'arrow.uturn.left.circle.fill' },
                                                { id: 'completed', label: 'Done', icon: 'checkmark.circle.fill' },
                                            ]}
                                            activeSegment={activeStatus}
                                            onSegmentChange={setActiveStatus}
                                        />
                                    </View>
                                </View>
                            )}

                            <View style={[styles.content, { paddingBottom: insets.bottom + 100, paddingTop: 10 }]}>
                                {!isAuthenticated ? (
                                    <UnauthenticatedView
                                        compact
                                        title={`Actions — ${activeStatus.charAt(0).toUpperCase() + activeStatus.slice(1)}`}
                                        description="Sign in to your organization workspace to review, expedite decisions, and track team approvals in real time."
                                        buttonText="Sign In"
                                    />
                                ) : (
                                    <>
                                        {showInlineSearch && (
                                            <UnifiedSearchBar
                                                value={searchQuery}
                                                onChangeText={setSearchQuery}
                                                onClose={() => setShowInlineSearch(false)}
                                                placeholder="Search actions by title, project, submitter..."
                                            />
                                        )}

                                        <View style={styles.actionListContainer}>
                                            {filteredActions.map((action, index) => (
                                                renderActionCard({ action, index })
                                            ))}
                                        </View>

                                        {filteredActions.length === 0 && (
                                            <Animated.View entering={FadeIn.delay(200)} style={styles.emptyContainer}>
                                                <View style={[styles.emptyIconBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,122,255,0.05)' }]}>
                                                    <PlatformIcon name="bolt.fill" size={42} tintColor={isDark ? 'rgba(255,255,255,0.3)' : '#007AFF'} weight="bold" />
                                                </View>
                                                <Text style={[styles.emptyTitle, { color: textColor }]}>
                                                    {activeStatus === 'urgent' ? 'No urgent actions'
                                                        : activeStatus === 'pending' ? 'No pending actions'
                                                            : activeStatus === 'returned' ? 'No returned actions'
                                                                : activeStatus === 'completed' ? 'No completed actions'
                                                                    : 'Everything is clear!'}
                                                </Text>
                                                <Text style={[styles.emptyText, { color: subtextColor }]}>
                                                    {searchQuery.trim().length > 0
                                                        ? `Nothing matching "${searchQuery}" in your actions.`
                                                        : 'You have no items requiring attention right now.'}
                                                </Text>
                                                {searchQuery.trim().length > 0 && (
                                                    <TouchableOpacity
                                                        onPress={() => setSearchQuery('')}
                                                        style={[styles.clearButton, { backgroundColor: isDark ? '#0A84FF' : '#007AFF' }]}
                                                    >
                                                        <Text style={styles.clearButtonText}>Clear Search</Text>
                                                    </TouchableOpacity>
                                                )}
                                            </Animated.View>
                                        )}
                                    </>
                                )}
                            </View>
                        </ScrollView>
                    </SwipeTabWrapper>

                    {/* SwiftUI Bottom Sheet for Actions (Mobile Only) */}
                    <SwiftUIActionDetailSheet
                        isOpened={!!selectedAction}
                        onClose={() => setSelectedAction(null)}
                        action={selectedAction}
                        onStatusChange={handleActionStatusChange}
                        setActionsList={setActionsList}
                    />
                </>
            )}

            {/* Add Action Bottom Sheet */}
            {isAuthenticated && (
                <SwiftUIAddActionSheet
                    isOpened={isAddModalVisible}
                    onClose={() => setIsAddModalVisible(false)}
                    onSave={(action) => {
                        setActionsList(prev => [action, ...prev]);
                        setIsAddModalVisible(false);
                        showToast('Action created');
                    }}
                />
            )}

            {/* Searchable Picker Modals */}
            <SearchablePicker
                visible={activePicker === 'project'}
                onClose={() => setActivePicker(null)}
                onSelect={(item: any) => {
                    setSelectedProjectCode(typeof item === 'string' ? item : item.id);
                    setActivePicker(null);
                }}
                items={projectItems}
                title="Select Project"
                selectedId={selectedProjectCode}
                tintColor="#007AFF"
            />

            <SearchablePicker
                visible={activePicker === 'assignee'}
                onClose={() => setActivePicker(null)}
                onSelect={(item: any) => {
                    setSelectedAssigneeId(typeof item === 'string' ? item : item.id);
                    setActivePicker(null);
                }}
                items={assigneeItems}
                title="Select Submitter"
                selectedId={selectedAssigneeId}
                tintColor="#007AFF"
            />

            {/* Time Filter & Sort Drawer Modal */}
            <Modal
                visible={activePicker === 'time'}
                animationType="slide"
                transparent
                statusBarTranslucent
                onRequestClose={() => setActivePicker(null)}
            >
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
                    <TouchableOpacity
                        style={StyleSheet.absoluteFill}
                        activeOpacity={1}
                        onPress={() => setActivePicker(null)}
                    />
                    <GlassView
                        intensity={60}
                        style={{
                            borderTopLeftRadius: 28,
                            borderTopRightRadius: 28,
                            paddingHorizontal: 20,
                            paddingTop: 20,
                            paddingBottom: insets.bottom + 20,
                            backgroundColor: isDark ? 'rgba(28,28,30,0.95)' : 'rgba(255,255,255,0.95)',
                        }}
                    >
                        {/* Drawer Header */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                            <Text style={{ fontSize: 18, fontWeight: '700', color: textColor }}>Time Filter & Sort</Text>
                            <TouchableOpacity
                                onPress={() => setActivePicker(null)}
                                style={{ width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}
                            >
                                <Ionicons name="close" size={18} color={textColor} />
                            </TouchableOpacity>
                        </View>

                        {/* Section 1: Time Range */}
                        <Text style={{ fontSize: 11, fontWeight: '700', color: subtextColor, letterSpacing: 0.8, marginBottom: 10, textTransform: 'uppercase' }}>
                            TIME RANGE & MONTH
                        </Text>
                        
                        {/* Month Selector Stepper */}
                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                            borderRadius: 14,
                            marginBottom: 10,
                            backgroundColor: activeTimeFilter === 'month'
                                ? (isDark ? 'rgba(0,122,255,0.18)' : 'rgba(0,122,255,0.08)')
                                : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'),
                            borderWidth: activeTimeFilter === 'month' ? 1 : 0,
                            borderColor: activeTimeFilter === 'month' ? '#007AFF' : 'transparent',
                        }}>
                            <TouchableOpacity
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
                                    setActiveTimeFilter('month');
                                }}
                                style={{ padding: 6 }}
                            >
                                <Ionicons name="chevron-back" size={18} color={activeTimeFilter === 'month' ? '#007AFF' : textColor} />
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => {
                                    setActiveTimeFilter('month');
                                }}
                                style={{ alignItems: 'center' }}
                            >
                                <Text style={{ fontSize: 14, fontWeight: activeTimeFilter === 'month' ? '700' : '600', color: activeTimeFilter === 'month' ? '#007AFF' : textColor }}>
                                    {selectedMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
                                    setActiveTimeFilter('month');
                                }}
                                style={{ padding: 6 }}
                            >
                                <Ionicons name="chevron-forward" size={18} color={activeTimeFilter === 'month' ? '#007AFF' : textColor} />
                            </TouchableOpacity>
                        </View>

                        <View style={{ gap: 6, marginBottom: 20 }}>
                            {[
                                { id: 'week', label: 'This Week' },
                                { id: 'today', label: 'Today' },
                                { id: 'overdue', label: 'Overdue' },
                                { id: 'all', label: 'All Time' },
                            ].map((item) => {
                                const isSelected = activeTimeFilter === item.id;
                                return (
                                    <TouchableOpacity
                                        key={item.id}
                                        onPress={() => {
                                            setActiveTimeFilter(item.id);
                                        }}
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            paddingHorizontal: 14,
                                            paddingVertical: 12,
                                            borderRadius: 14,
                                            backgroundColor: isSelected
                                                ? (isDark ? 'rgba(0,122,255,0.18)' : 'rgba(0,122,255,0.08)')
                                                : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'),
                                            borderWidth: isSelected ? 1 : 0,
                                            borderColor: isSelected ? '#007AFF' : 'transparent',
                                        }}
                                    >
                                        <Text style={{ fontSize: 14, fontWeight: isSelected ? '700' : '500', color: isSelected ? '#007AFF' : textColor }}>
                                            {item.label}
                                        </Text>
                                        {isSelected ? (
                                            <Ionicons name="checkmark-circle" size={20} color="#007AFF" />
                                        ) : null}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Section Divider */}
                        <View style={{ height: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', marginBottom: 16 }} />

                        {/* Section 2: Sort Order */}
                        <Text style={{ fontSize: 11, fontWeight: '700', color: subtextColor, letterSpacing: 0.8, marginBottom: 10, textTransform: 'uppercase' }}>
                            SORT ORDER
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <TouchableOpacity
                                style={{
                                    flex: 1,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 6,
                                    paddingVertical: 12,
                                    borderRadius: 14,
                                    backgroundColor: sortOrder === 'asc'
                                        ? (isDark ? 'rgba(0,122,255,0.18)' : 'rgba(0,122,255,0.08)')
                                        : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'),
                                    borderWidth: sortOrder === 'asc' ? 1 : 0,
                                    borderColor: sortOrder === 'asc' ? '#007AFF' : 'transparent',
                                }}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setSortOrder('asc');
                                }}
                            >
                                <Ionicons name="arrow-up" size={15} color={sortOrder === 'asc' ? '#007AFF' : textColor} />
                                <Text style={{ fontSize: 13, fontWeight: sortOrder === 'asc' ? '700' : '500', color: sortOrder === 'asc' ? '#007AFF' : textColor }}>
                                    Oldest First
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={{
                                    flex: 1,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 6,
                                    paddingVertical: 12,
                                    borderRadius: 14,
                                    backgroundColor: sortOrder === 'desc'
                                        ? (isDark ? 'rgba(0,122,255,0.18)' : 'rgba(0,122,255,0.08)')
                                        : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'),
                                    borderWidth: sortOrder === 'desc' ? 1 : 0,
                                    borderColor: sortOrder === 'desc' ? '#007AFF' : 'transparent',
                                }}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setSortOrder('desc');
                                }}
                            >
                                <Ionicons name="arrow-down" size={15} color={sortOrder === 'desc' ? '#007AFF' : textColor} />
                                <Text style={{ fontSize: 13, fontWeight: sortOrder === 'desc' ? '700' : '500', color: sortOrder === 'desc' ? '#007AFF' : textColor }}>
                                    Newest First
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Apply Button */}
                        <TouchableOpacity
                            style={{
                                marginTop: 20,
                                height: 44,
                                borderRadius: 22,
                                backgroundColor: '#007AFF',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                            onPress={() => setActivePicker(null)}
                        >
                            <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' }}>Done</Text>
                        </TouchableOpacity>
                    </GlassView>
                </View>
            </Modal>

            {/* Floating Toast HUD */}
            {toastState && (
                <RNAnimated.View
                    style={[
                        styles.floatingToastContainer,
                        {
                            top: (insets.top > 0 ? insets.top : 20) + (isDesktopWeb ? 24 : 52),
                            opacity: toastAnim,
                            transform: [
                                {
                                    translateY: toastAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [-16, 0],
                                    }),
                                },
                                {
                                    scale: toastAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0.92, 1],
                                    }),
                                },
                            ],
                        },
                    ]}
                    pointerEvents="none"
                >
                    <SwiftUIToastHUD
                        message={toastState.message}
                        icon={toastState.icon}
                        iconColor={toastState.iconColor}
                        isDark={isDark}
                    />
                </RNAnimated.View>
            )}
        </>
    );
}

const styles = StyleSheet.create({
    scrollView: {
        flex: 1,
    },
    content: {
        flex: 1,
        paddingHorizontal: 16,
    },
    actionListContainer: {
        gap: 10,
        paddingBottom: 100,
    },
    compactCard: {
        borderRadius: 24,
        marginBottom: 0,
        borderWidth: 0,
        overflow: 'hidden',
        padding: 12,
    },
    cardInfo: {
        flex: 1,
    },
    compactHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    compactTitle: {
        fontSize: 16,
        fontWeight: '700',
        flex: 1,
    },
    compactProjectRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    compactContext: {
        fontSize: 13,
        fontWeight: '500',
    },
    projectBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        marginRight: 8,
    },
    projectBadgeText: {
        fontSize: 10,
        fontWeight: '800',
    },
    compactFooterRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: 'rgba(142,142,147,0.2)',
    },
    compactMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    metaMicroText: {
        fontSize: 11,
        fontWeight: '600',
    },
    miniStatusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    miniStatusText: {
        fontSize: 10,
        fontWeight: '800',
    },
    miniAvatar: {
        width: 22,
        height: 22,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
    },
    miniAvatarText: {
        fontSize: 8,
        fontWeight: '800',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
    },
    emptyIconBg: {
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
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        textAlign: 'center',
        paddingHorizontal: 40,
    },
    filterControl: {
        marginBottom: 16,
        marginHorizontal: -4,
    },
    timeFilterContainer: {
        height: 44,
        marginBottom: 8,
    },
    timeFilterContent: {
        paddingHorizontal: 16,
        gap: 8,
    },
    timeChip: {
        paddingHorizontal: 12,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    timeChipText: {
        fontSize: 13,
        fontWeight: '600',
    },
    clearButton: {
        marginTop: 16,
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 12,
    },
    clearButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
    inlineSearchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 44,
        borderRadius: 22,
        paddingHorizontal: 16,
        borderWidth: 1,
        marginTop: 8,
        marginBottom: 12,
    },
    inlineSearchInput: {
        flex: 1,
        height: '100%',
        fontSize: 16,
        paddingVertical: 0,
    },
    inlineCancelButton: {
        paddingLeft: 8,
        paddingVertical: 4,
    },
    splitRoot: {
        flex: 1,
        flexDirection: 'row',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
    },
    splitLeftPane: {
        ...DESKTOP_LIST_PANE,
        height: '100%',
        borderRightWidth: StyleSheet.hairlineWidth,
        overflow: 'hidden',
    },
    splitListHeader: { ...DESKTOP_PANEL_HEADER },
    splitListHeaderTitleRow: { ...DESKTOP_PANEL_TITLE_ROW },
    splitListHeaderTitle: { ...DESKTOP_PANEL_TITLE },
    headerActionCircle: { ...DESKTOP_PANEL_ACTION },
    splitFilterBar: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
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
    floatingToastContainer: {
        position: 'absolute',
        alignSelf: 'center',
        zIndex: 99999,
        elevation: 999,
    },
});
