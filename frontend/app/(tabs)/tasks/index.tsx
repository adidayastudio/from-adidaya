import { DESKTOP_LIST_PANE, DESKTOP_PANEL_HEADER, DESKTOP_PANEL_TITLE_ROW, DESKTOP_PANEL_TITLE, DESKTOP_PANEL_ACTION } from '@/constants/desktopLayout';
import { HeaderBlurBackground } from '@/components/ui/HeaderBlurBackground';
import { FormaBlue } from '@/constants/theme';
import { PROJECTS, Task } from '@/constants/MockData';
import { getTasks, getProfiles } from '@/lib/api/tasks';
import { getProjects } from '@/lib/api/projects';
import type { Project } from '@/lib/api/projects';
import { useSearch } from '@/context/SearchContext';
import { useTheme } from '@/context/ThemeContext';
import { useTenantContext } from '@/context/TenantContext';
import { useUserContext } from '@/context/UserProvider';
import { UnauthenticatedView } from '@/components/ui/UnauthenticatedView';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { GlassView } from '@/components/ui/GlassView';
import { HeaderToolbar, HeaderToolbarAction } from '@/components/ui/HeaderToolbar';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { SwipeTabWrapper } from '@/components/ui/SwipeTabWrapper';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { Image } from 'expo-image';
import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import { RefreshControl, Dimensions, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Platform, Modal, StatusBar as RNStatusBar, useWindowDimensions, Animated as RNAnimated } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { FadeIn, FadeInUp, runOnJS } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SwiftUITaskDetailSheet } from '@/components/tasks/SwiftUITaskDetailSheet';
import { SwiftUIAddTaskSheet } from '@/components/tasks/SwiftUIAddTaskSheet';
import { SwiftUIToastHUD } from '@/components/ui/SwiftUIToastHUD';
import { UnifiedSearchBar } from '@/components/ui/UnifiedSearchBar';
import { SearchablePicker } from '@/components/ui/SearchablePicker';
import { WebFinderHeader } from '@/components/ui/WebFinderHeader';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function TaskScreen() {
    const { width } = useWindowDimensions();
    const isDesktopWeb = Platform.OS === 'web' && width >= 768;
    const { searchQuery, setSearchQuery, setIsSearchVisible, isSearchVisible, setContextAction } = useSearch();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const insets = useSafeAreaInsets();

    const { isAuthenticated } = useUserContext();
    const { activeTenant } = useTenantContext();
    const isFocused = useIsFocused();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [dbProjects, setDbProjects] = useState<Project[]>([]);
    const [dbProfiles, setDbProfiles] = useState<Array<{ id: string; name: string }>>([]);

    // Floating Toast HUD State
    const [toastState, setToastState] = useState<{ message: string; icon?: string; iconColor?: string } | null>(null);
    const toastAnim = useRef(new RNAnimated.Value(0)).current;
    const toastTimerRef = useRef<any>(null);

    const showToast = useCallback((msg: string = 'Task created', icon: string = 'checkmark.circle.fill', iconColor: string = '#34C759') => {
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

    const loadTasks = useCallback(async () => {
        if (!isAuthenticated) {
            setTasks([]);
            return;
        }
        try {
            const tenantId = activeTenant?.id;
            const [tasksData, projectsData, profilesData] = await Promise.all([
                getTasks(tenantId),
                getProjects(tenantId),
                getProfiles(tenantId),
            ]);
            if (tasksData && Array.isArray(tasksData)) {
                setTasks(prev => {
                    if (tasksData.length === 0) return prev;
                    const serverIds = new Set(tasksData.map(t => t.id));
                    const pending = prev.filter(t => !serverIds.has(t.id));
                    return [...pending, ...tasksData];
                });
            }
            if (projectsData && Array.isArray(projectsData)) {
                setDbProjects(projectsData);
            }
            if (profilesData && Array.isArray(profilesData)) {
                setDbProfiles(profilesData);
            }
        } catch (err) {
            console.error('Failed to load tasks data:', err);
        }
    }, [isAuthenticated, activeTenant?.id]);

    const { refreshing, onRefresh } = usePullToRefresh(loadTasks);

    React.useEffect(() => {
        if (!isFocused) return;

        if (isAuthenticated) {
            loadTasks();
            setContextAction({
                label: 'Add Task',
                icon: 'add-outline',
                sfIcon: 'plus',
                action: () => router.push('/search-modal'),
                options: [
                    {
                        label: 'Create Task',
                        icon: 'checkbox-outline',
                        sfIcon: 'checkmark.circle',
                        description: 'Add a new task to your list',
                        action: () => setIsAddModalVisible(true)
                    }
                ]
            });
        } else {
            setContextAction(null);
        }
    }, [isFocused, isAuthenticated, setContextAction, loadTasks]);

    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6e6e73';

    const [activeStatus, setActiveStatus] = useState('all');
    const [activeTimeFilter, setActiveTimeFilter] = useState('all');
    const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
    const [selectedProjectCode, setSelectedProjectCode] = useState('ALL');
    const [selectedAssigneeId, setSelectedAssigneeId] = useState('ALL');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [activePicker, setActivePicker] = useState<'time' | 'project' | 'assignee' | null>(null);
    const [showInlineSearch, setShowInlineSearch] = useState(false);
    const [isAddModalVisible, setIsAddModalVisible] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

    React.useEffect(() => {
        if (activeStatus === 'done') {
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
            PROJECTS.forEach(p => {
                const label = p.title || (p as any).name || p.code;
                items.push({ id: p.code, label, sublabel: p.code });
            });
        }
        return items;
    }, [dbProjects]);

    const assigneeItems = useMemo(() => {
        const items = [{ id: 'ALL', label: 'All Assignees', sublabel: 'ALL' }];
        if (dbProfiles.length > 0) {
            dbProfiles.forEach(p => {
                items.push({ id: p.id, label: p.name, sublabel: p.name.split(' ')[0] });
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
                title: 'Assignee',
                actions: assigneeItems.map(a => ({
                    title: a.id === 'ALL' ? 'All Assignees' : a.label,
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

        // Assignee
        if (name === 'All Assignees') { setSelectedAssigneeId('ALL'); return; }
        const matchedAssignee = assigneeItems.find(a => a.label === name || a.id === name);
        if (matchedAssignee) {
            setSelectedAssigneeId(matchedAssignee.id);
            return;
        }
    }, [projectItems, assigneeItems]);

    const actions: HeaderToolbarAction[] = [
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
            onPress: () => {
                setSelectedTask(null);
                setIsAddModalVisible(true);
            }
        }
    ];

    const openTaskModal = useCallback((task: Task) => {
        console.log('[DEBUG] openTaskModal triggered with:', task);
        setIsAddModalVisible(false);
        setSelectedTask(task);
    }, []);

    const closeTaskModal = useCallback(() => {
        setSelectedTask(null);
    }, []);

    const { taskId } = useLocalSearchParams<{ taskId?: string }>();
    useEffect(() => {
        if (taskId && tasks.length > 0) {
            const found = tasks.find(t => t.id === taskId);
            if (found) setSelectedTask(found);
        }
    }, [taskId, tasks]);

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

    const getInitials = (nameOrEmail?: string) => {
        if (!nameOrEmail) return 'U';
        const clean = nameOrEmail.trim();
        const parts = clean.split(/\s+/);
        if (parts.length >= 2 && parts[0] && parts[1]) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return clean.slice(0, 2).toUpperCase();
    };

    const getStatusStyles = (s: string) => {
        switch (s) {
            case 'in_progress': return { color: isDark ? '#B5B3FF' : '#5856D6', label: 'In Progress' };
            case 'submitted': return { color: isDark ? '#32ADE6' : '#007AFF', label: 'Submitted' };
            case 'revision': return { color: isDark ? '#FF9F0A' : '#FF9500', label: 'Revision' };
            case 'done': return { color: isDark ? '#32D74B' : '#34C759', label: 'Done' };
            default: return { color: isDark ? '#98989D' : '#8E8E93', label: 'To-Do' };
        }
    };

    const filteredTasks = useMemo(() => {
        let result = tasks;

        // Status Filter
        if (activeStatus === 'active') {
            result = result.filter(t => t.status === 'todo' || t.status === 'in_progress');
        } else if (activeStatus === 'submitted') {
            result = result.filter(t => t.status === 'submitted');
        } else if (activeStatus === 'revision') {
            result = result.filter(t => t.status === 'revision');
        } else if (activeStatus === 'done') {
            result = result.filter(t => t.status === 'done');
        }

        // Project Filter
        if (selectedProjectCode !== 'ALL') {
            result = result.filter(t => t.projectCode === selectedProjectCode || (t.project && t.project.includes(selectedProjectCode)));
        }

        // Assignee Filter
        if (selectedAssigneeId !== 'ALL') {
            result = result.filter(t => {
                if (!t.assignees || !Array.isArray(t.assignees)) return false;
                return t.assignees.some(a => a.id === selectedAssigneeId || a.name === selectedAssigneeId);
            });
        }

        // Time Filter
        if (activeTimeFilter !== 'all') {
            const now = new Date();
            const todayObj = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const todayStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;

            result = result.filter(t => {
                if (!t.dueDate) return false;
                const taskDateStr = t.dueDate.split('T')[0];

                if (activeTimeFilter === 'today') {
                    return taskDateStr === todayStr;
                }

                if (activeTimeFilter === 'overdue') {
                    return taskDateStr < todayStr && t.status !== 'done';
                }

                if (activeTimeFilter === 'week') {
                    const dayOfWeek = todayObj.getDay();
                    const distanceToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
                    const monday = new Date(todayObj);
                    monday.setDate(todayObj.getDate() + distanceToMon);
                    const sunday = new Date(monday);
                    sunday.setDate(monday.getDate() + 6);

                    const mondayStr = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
                    const sundayStr = `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${String(sunday.getDate()).padStart(2, '0')}`;

                    return taskDateStr >= mondayStr && taskDateStr <= sundayStr;
                }

                if (activeTimeFilter === 'month') {
                    const monthPrefix = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}`;
                    return taskDateStr.startsWith(monthPrefix);
                }

                return true;
            });
        }

        // Sort by Due Date (ASC or DESC)
        const sortedResult = [...result].sort((a, b) => {
            const dateA = a.dueDate || '9999-12-31';
            const dateB = b.dueDate || '9999-12-31';

            if (sortOrder === 'desc') {
                return dateB.localeCompare(dateA);
            } else {
                return dateA.localeCompare(dateB);
            }
        });

        // Search Filter
        if (!searchQuery.trim()) return sortedResult;
        const q = searchQuery.toLowerCase();
        return sortedResult.filter(t => {
            const matchesTitle = t.title.toLowerCase().includes(q);
            const matchesProject = t.project.toLowerCase().includes(q);
            const matchesProjectCode = t.projectCode ? t.projectCode.toLowerCase().includes(q) : false;
            const matchesAssignee = t.assignees ? t.assignees.some(a => a.name.toLowerCase().includes(q)) : false;
            return matchesTitle || matchesProject || matchesProjectCode || matchesAssignee;
        });
    }, [tasks, activeStatus, activeTimeFilter, selectedProjectCode, selectedAssigneeId, sortOrder, searchQuery]);

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

    const getTaskModuleInfo = (task: Task) => {
        const target = task.linkedModule?.target;
        if (target === 'finance') return { label: 'Finance', icon: 'creditcard.fill', color: '#FF2D55' };
        if (target === 'resources') return { label: 'Resources', icon: 'archivebox.fill', color: '#F08C45' };
        if (target === 'people') return { label: 'People', icon: 'person.2.fill', color: '#10B981' };
        if (target === 'clock') return { label: 'Clock', icon: 'clock.fill', color: '#0284C7' };
        if (target === 'report') return { label: 'Report', icon: 'doc.text.fill', color: '#14B8A6' };
        if (target === 'crew') return { label: 'Crew', icon: 'hardhat.fill', color: '#8B5CF6' };
        if (target === 'forma_ai') return { label: 'Forma AI', icon: 'sparkles.fill', color: '#6366F1' };
        if (target === 'project') return { label: 'Projects', icon: 'folder.fill', color: '#007AFF' };
        if (target === 'tracking') return { label: 'Tracking', icon: 'target', color: '#64748B' };

        return { label: 'Projects', icon: 'folder.fill', color: '#007AFF' };
    };

    const renderTaskCard = ({
        task,
        index,
        isSelected = false,
        onPressOverride,
    }: {
        task: Task;
        index: number;
        isSelected?: boolean;
        onPressOverride?: () => void;
    }) => {
        const statusStyle = getStatusStyles(task.status);
        const doneSubtasks = task.subtasks?.filter(s => s.isDone).length || 0;
        const totalSubtasks = task.subtasks?.length || 0;

        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const todayStr = now.toISOString().split('T')[0];
        const isOverdue = task.dueDate < todayStr && task.status !== 'done';

        // Solid white card without border or shadow, highlighted if active
        const cardBg = isSelected
            ? (isDark ? 'rgba(10, 132, 255, 0.22)' : FormaBlue[100])
            : (isDark ? '#1C1C1E' : '#FFFFFF');
        const mod = getTaskModuleInfo(task);
        const iconBg = isDark ? hexToRgba(mod.color, 0.18) : hexToRgba(mod.color, 0.12);
        const iconTintColor = isDark ? '#A1A1AA' : '#6B7280';

        return (
            <Animated.View key={task.id} entering={Platform.OS === 'web' ? undefined : FadeInUp.delay(index * 30)}>
                <TouchableOpacity onPress={onPressOverride || (() => openTaskModal(task))} activeOpacity={Platform.OS === 'web' ? 1 : 0.7}>
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
                                    {/* Subtasks if any */}
                                    {totalSubtasks > 0 && (
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                            <View style={[styles.subtaskInlineBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', marginLeft: 0 }]}>
                                                <Ionicons name="list" size={10} color={subtextColor} style={{ marginRight: 4 }} />
                                                <Text style={{ fontSize: 10, fontWeight: '700', color: subtextColor }}>{doneSubtasks}/{totalSubtasks}</Text>
                                            </View>
                                        </View>
                                    )}

                                    {/* Title: Max 2 lines */}
                                    <Text style={[styles.compactTitle, { color: textColor, marginBottom: 4 }]} numberOfLines={2}>
                                        {task.title}
                                    </Text>

                                    {/* Project Code / Dept code + Deadline */}
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                                        <View style={[styles.projectBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', borderWidth: 0.5, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', marginRight: 0 }]}>
                                            <Text style={[styles.projectBadgeText, { color: subtextColor }]}>{task.projectCode}</Text>
                                        </View>
                                        <Text style={{ fontSize: 11, fontWeight: '600', color: subtextColor }}>
                                            {`${formatCardDate(task.dueDate)}${task.dueTime ? `  •  ${task.dueTime.split(':').slice(0, 2).join(':')}` : ''}`}
                                        </Text>
                                    </View>
                                </View>

                                {/* Right column: Borderless status badge + Assignees */}
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
                                            {getStatusStyles(task.status).label}
                                        </Text>
                                    </View>

                                    {/* Assignee Avatars */}
                                    <View style={styles.miniAvatarGroup}>
                                        {task.assignees.slice(0, 2).map((a, i) => {
                                            const avatarUrl = a.avatar || (a as any).avatar_url;
                                            const initials = getInitials(a.name);
                                            return (
                                                <View 
                                                    key={a.id} 
                                                    style={[
                                                        styles.miniAvatar, 
                                                        { 
                                                            backgroundColor: avatarUrl ? 'transparent' : '#1677D2', 
                                                            borderColor: isDark ? '#1C1C1E' : '#F2F2F7', 
                                                            zIndex: 2 - i, 
                                                            marginLeft: i === 0 ? 0 : -6,
                                                            overflow: 'hidden'
                                                        }
                                                    ]}
                                                >
                                                    {avatarUrl ? (
                                                        <Image
                                                            source={{ uri: avatarUrl }}
                                                            style={{ width: '100%', height: '100%' }}
                                                            contentFit="cover"
                                                        />
                                                    ) : (
                                                        <Text style={[styles.miniAvatarText, { color: '#FFFFFF', fontWeight: '700' }]}>
                                                            {initials}
                                                        </Text>
                                                    )}
                                                </View>
                                            );
                                        })}
                                        {task.assignees.length > 2 && (
                                            <View 
                                                style={[
                                                    styles.miniAvatar, 
                                                    {
                                                        backgroundColor: isDark ? '#3A3A3C' : '#FFFFFF',
                                                        borderColor: isDark ? '#1C1C1E' : '#E5E5EA',
                                                        zIndex: 0,
                                                        marginLeft: -6
                                                    }
                                                ]}
                                            >
                                                <Text style={[styles.miniAvatarText, { color: isDark ? '#FFFFFF' : subtextColor, fontSize: 8 }]}>
                                                    {task.assignees.length - 2}+
                                                </Text>
                                            </View>
                                        )}
                                    </View>
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
                    title: 'Tasks',
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
                        <HeaderToolbar actions={actions} isDark={isDark} textColor={textColor} maxDirectActions={3} />
                    ) : null,
                }}
            />

            {Platform.OS === 'web' && !isDesktopWeb && (
                <WebFinderHeader
                    title="Tasks"
                    actions={isAuthenticated ? actions : undefined}
                    centerComponent={
                        <SegmentedControl
                            fullWidth
                            style={{ width: '100%' }}
                            segments={[
                                { id: 'all', label: 'All', icon: 'list.bullet.rectangle.fill' },
                                { id: 'active', label: 'Active', icon: 'clock.fill' },
                                { id: 'submitted', label: 'Submitted', icon: 'paperplane.fill' },
                                { id: 'revision', label: 'Revision', icon: 'arrow.uturn.left.circle.fill' },
                                { id: 'done', label: 'Done', icon: 'checkmark.circle.fill' },
                            ]}
                            activeSegment={activeStatus}
                            onSegmentChange={setActiveStatus}
                        />
                    }
                />
            )}

            {isDesktopWeb ? (
                <View style={[styles.splitRoot, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}>
                    {/* Left Pane: Tasks List (flex: 1) */}
                    <View style={[styles.splitLeftPane, { borderRightColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)', backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}>
                        <View style={styles.splitListHeader}>
                            <View style={styles.splitListHeaderTitleRow}>
                                <Text style={[styles.splitListHeaderTitle, { color: textColor }]}>Tasks</Text>
                                {isAuthenticated && (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <TouchableOpacity
                                            onPress={() => setShowInlineSearch(prev => !prev)}
                                            style={[styles.headerActionCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
                                        >
                                            <Ionicons name="search-outline" size={16} color={textColor} />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => {
                                                setSelectedTask(null);
                                                setIsAddModalVisible(true);
                                            }}
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
                                        { id: 'active', label: 'Active' },
                                        { id: 'submitted', label: 'Submitted' },
                                        { id: 'revision', label: 'Revision' },
                                        { id: 'done', label: 'Done' },
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
                                        placeholder="Search tasks..."
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
                                    title={`Tasks — ${activeStatus.charAt(0).toUpperCase() + activeStatus.slice(1)}`}
                                    description="Sign in to your organization workspace to assign, track, and complete operational tasks."
                                    buttonText="Sign In"
                                />
                            ) : filteredTasks.length === 0 ? (
                                <View style={[styles.emptyContainer, { paddingVertical: 40 }]}>
                                    <View style={[styles.emptyIconBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)' }]}>
                                        <PlatformIcon name="checkmark.circle.fill" size={32} tintColor={isDark ? 'rgba(255,255,255,0.4)' : FormaBlue[700]} weight="bold" />
                                    </View>
                                    <Text style={[styles.emptyTitle, { color: textColor, fontSize: 15 }]}>
                                        {searchQuery.trim() ? 'No Tasks Found' : 'No Tasks'}
                                    </Text>
                                    <Text style={[styles.emptySubtitle, { color: subtextColor, fontSize: 12 }]}>
                                        {searchQuery.trim()
                                            ? `No task matches "${searchQuery.trim()}".`
                                            : 'Create a new task to get started.'}
                                    </Text>
                                </View>
                            ) : (
                                <View style={{ gap: 8 }}>
                                    {filteredTasks.map((task, index) => {
                                        const isSelected = !isAddModalVisible && selectedTask?.id === task.id;
                                        return (
                                            renderTaskCard({ task, index, isSelected, onPressOverride: () => {
                                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                    setIsAddModalVisible(false);
                                                    setSelectedTask(task);
                                                } })
                                        );
                                    })}
                                </View>
                            )}
                        </ScrollView>
                    </View>

                    {/* Right Pane: Embedded Task Detail or Add Task (flex: 2) */}
                    <View style={[styles.splitRightPane, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}>
                        {isAddModalVisible ? (
                            <SwiftUIAddTaskSheet
                                isOpened={true}
                                isEmbedded={true}
                                onClose={() => setIsAddModalVisible(false)}
                                onSave={(task) => {
                                    setTasks(prev => [task, ...prev.filter(t => t.id !== task.id)]);
                                    setSelectedTask(task);
                                    setIsAddModalVisible(false);
                                    setActiveStatus('all');
                                    setActiveTimeFilter('all');
                                    setSelectedProjectCode('ALL');
                                    setSelectedAssigneeId('ALL');
                                    setSearchQuery('');
                                    showToast('Task created');
                                    loadTasks();
                                }}
                            />
                        ) : selectedTask ? (
                            <SwiftUITaskDetailSheet
                                isOpened={true}
                                task={selectedTask}
                                isEmbedded={true}
                                onClose={() => setSelectedTask(null)}
                                setTasks={setTasks}
                            />
                        ) : (
                            <View style={styles.desktopEmptyPane}>
                                <View style={[styles.desktopEmptyIconCircle, { backgroundColor: isDark ? 'rgba(77, 130, 255, 0.12)' : 'rgba(0, 122, 255, 0.08)' }]}>
                                    <PlatformIcon
                                        name="checkmark.circle.fill"
                                        size={44}
                                        tintColor={isDark ? FormaBlue[400] : FormaBlue[700]}
                                    />
                                </View>
                                <Text style={[styles.desktopEmptyTitle, { color: textColor }]}>
                                    {tasks.length === 0 ? 'No Tasks Created Yet' : 'Select a Task'}
                                </Text>
                                <Text style={[styles.desktopEmptySubtitle, { color: subtextColor }]}>
                                    {tasks.length === 0
                                        ? 'Get started by creating your workspace’s first task to track checklists, deliverables, and team discussions.'
                                        : 'Choose a task from the list on the left to view details, progress, checklists, and discussions.'}
                                </Text>
                                <TouchableOpacity
                                    onPress={() => {
                                        setSelectedTask(null);
                                        setIsAddModalVisible(true);
                                    }}
                                    style={[styles.desktopEmptyBtn, { backgroundColor: FormaBlue[700] }]}
                                >
                                    <Ionicons name="add" size={18} color="#FFFFFF" />
                                    <Text style={styles.desktopEmptyBtnText}>
                                        {tasks.length === 0 ? 'Create First Task' : 'New Task'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            ) : (
                <SwipeTabWrapper
                    segments={[
                        { id: 'all', label: 'All', icon: 'list.bullet.rectangle.fill' },
                        { id: 'active', label: 'Active', icon: 'clock.fill' },
                        { id: 'submitted', label: 'Submitted', icon: 'paperplane.fill' },
                        { id: 'revision', label: 'Revision', icon: 'arrow.uturn.left.circle.fill' },
                        { id: 'done', label: 'Done', icon: 'checkmark.circle.fill' },
                    ]}
                    activeSegment={activeStatus}
                    onSegmentChange={setActiveStatus}
                >
                    <ScrollView
                        refreshControl={isAuthenticated ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? '#FFF' : '#000'} /> : undefined}
                        style={{ flex: 1, backgroundColor: Platform.OS === 'web' ? 'transparent' : (isDark ? '#000000' : '#F2F2F7') }}
                        contentInsetAdjustmentBehavior="automatic"
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Standard Top Segmented Control for Mobile Native */}
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
                                            { id: 'active', label: 'Active', icon: 'clock.fill' },
                                            { id: 'submitted', label: 'Submitted', icon: 'paperplane.fill' },
                                            { id: 'revision', label: 'Revision', icon: 'arrow.uturn.left.circle.fill' },
                                            { id: 'done', label: 'Done', icon: 'checkmark.circle.fill' },
                                        ]}
                                        activeSegment={activeStatus}
                                        onSegmentChange={setActiveStatus}
                                    />
                                </View>
                            </View>
                        )}

                        <View style={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 100, paddingTop: 10 }}>
                            {!isAuthenticated ? (
                                <UnauthenticatedView
                                    compact
                                    title={`Tasks — ${activeStatus.charAt(0).toUpperCase() + activeStatus.slice(1)}`}
                                    description="Sign in to your organization workspace to assign, track, and complete operational tasks with real-time updates."
                                    buttonText="Sign In"
                                />
                            ) : (
                                <>
                                    {showInlineSearch && (
                                        <UnifiedSearchBar
                                            value={searchQuery}
                                            onChangeText={setSearchQuery}
                                            onClose={() => setShowInlineSearch(false)}
                                            placeholder="Search tasks by title, project, assignee..."
                                        />
                                    )}

                                    <View style={styles.taskListContainer}>
                                        {filteredTasks.map((task, index) => renderTaskCard({ task, index }))}
                                    </View>

                                    {filteredTasks.length === 0 && (
                                        <Animated.View entering={FadeIn.delay(200)} style={styles.emptyContainer}>
                                            <View style={[styles.emptyIconBg, { backgroundColor: isDark ? 'rgba(77, 130, 255, 0.12)' : 'rgba(0, 122, 255, 0.08)' }]}>
                                                <PlatformIcon name="checkmark.circle.fill" size={42} tintColor={isDark ? FormaBlue[400] : FormaBlue[700]} weight="bold" />
                                            </View>
                                            <Text style={[styles.emptyTitle, { color: textColor }]}>
                                                {tasks.length === 0
                                                    ? 'No Tasks Created Yet'
                                                    : (activeStatus === 'active' ? 'No Active Tasks'
                                                        : activeStatus === 'submitted' ? 'No Submitted Tasks'
                                                            : activeStatus === 'revision' ? 'No Revision Tasks'
                                                                : activeStatus === 'done' ? 'No Completed Tasks'
                                                                    : 'No Tasks Found')}
                                            </Text>
                                            <Text style={[styles.emptyText, { color: subtextColor }]}>
                                                {tasks.length === 0
                                                    ? 'Get started by creating your workspace’s first task to track checklists, deliverables, and team discussions.'
                                                    : (searchQuery.trim().length > 0
                                                        ? `Nothing matching "${searchQuery}" in your tasks.`
                                                        : 'No tasks match the selected filters.')}
                                            </Text>
                                            {tasks.length === 0 ? (
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        setSelectedTask(null);
                                                        setIsAddModalVisible(true);
                                                    }}
                                                    style={[styles.desktopEmptyBtn, { backgroundColor: FormaBlue[700], marginTop: 16 }]}
                                                >
                                                    <Ionicons name="add" size={18} color="#FFFFFF" />
                                                    <Text style={styles.desktopEmptyBtnText}>Create First Task</Text>
                                                </TouchableOpacity>
                                            ) : searchQuery.trim().length > 0 ? (
                                                <TouchableOpacity
                                                    onPress={() => setSearchQuery('')}
                                                    style={[styles.clearButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#E5E5EA' }]}
                                                >
                                                    <Text style={[styles.clearButtonText, { color: textColor }]}>Clear Search</Text>
                                                </TouchableOpacity>
                                            ) : null}
                                        </Animated.View>
                                    )}
                                </>
                            )}
                        </View>
                    </ScrollView>
                </SwipeTabWrapper>
            )}

            {/* Task Detail Bottom Sheet (Mobile Only) */}
            <SwiftUITaskDetailSheet
                isOpened={!isDesktopWeb && !!selectedTask}
                onClose={closeTaskModal}
                task={selectedTask}
                setTasks={setTasks}
            />

            {/* Add Task Bottom Sheet (Mobile Only) */}
            {isAuthenticated && !isDesktopWeb && (
                <SwiftUIAddTaskSheet
                    isOpened={isAddModalVisible}
                    onClose={() => setIsAddModalVisible(false)}
                    onSave={(task) => {
                        setTasks(prev => [task, ...prev.filter(t => t.id !== task.id)]);
                        setIsAddModalVisible(false);
                        setActiveStatus('all');
                        setActiveTimeFilter('all');
                        setSelectedProjectCode('ALL');
                        setSelectedAssigneeId('ALL');
                        setSearchQuery('');
                        showToast('Task created');
                        loadTasks();
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

            <SearchablePicker
                visible={activePicker === 'assignee'}
                onClose={() => setActivePicker(null)}
                onSelect={(item: any) => {
                    setSelectedAssigneeId(typeof item === 'string' ? item : item.id);
                    setActivePicker(null);
                }}
                items={assigneeItems}
                title="Select Assignee"
                selectedId={selectedAssigneeId}
                tintColor="#007AFF"
            />

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
    compactCard: {
        borderRadius: 24,
        marginBottom: 0,
        padding: 12,
        borderWidth: 0,
        overflow: 'hidden',
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
        marginBottom: 8,
    },
    projectBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 9999,
        marginRight: 8,
    },
    projectBadgeText: {
        fontSize: 10,
        fontWeight: '800',
    },
    compactContext: {
        fontSize: 13,
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
    subtaskInlineBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 20,
        marginLeft: 8,
    },
    compactFooterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 12,
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
    miniAvatarGroup: {
        flexDirection: 'row',
        alignItems: 'center',
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
    filterControl: {
        marginBottom: 16,
        marginHorizontal: -4,
    },
    timeFilterContainer: {
        marginBottom: 16,
    },
    timeFilterContent: {
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
    taskListContainer: {
        gap: 10,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 100,
        paddingHorizontal: 40,
        gap: 8,
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
        fontSize: 20,
        fontWeight: '700',
        letterSpacing: -0.5,
    },
    emptyText: {
        fontSize: 14,
        fontWeight: '500',
        textAlign: 'center',
        lineHeight: 20,
        opacity: 0.7,
    },
    clearButton: {
        marginTop: 16,
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 12,
        backgroundColor: '#007AFF',
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
        display: 'flex',
        flexDirection: 'column',
    },
    splitListHeader: { ...DESKTOP_PANEL_HEADER },
    splitListHeaderTitleRow: { ...DESKTOP_PANEL_TITLE_ROW },
    splitListHeaderTitle: { ...DESKTOP_PANEL_TITLE },
    splitListScroll: {
        flex: 1,
        height: '100%',
    },
    splitRightPane: {
        flex: 2,
        height: '100%',
        overflow: 'hidden',
    },
    headerActionCircle: { ...DESKTOP_PANEL_ACTION },
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
