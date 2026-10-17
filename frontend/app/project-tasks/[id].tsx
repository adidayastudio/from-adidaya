import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    KeyboardAvoidingView,
    Keyboard,
    Platform,
    Animated as RNAnimated,
} from 'react-native';
import { Stack, router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useTheme } from '@/context/ThemeContext';
import { GlassView } from '@/components/ui/GlassView';
import { HeaderToolbar, HeaderToolbarAction } from '@/components/ui/HeaderToolbar';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { getProjectById, Project } from '@/lib/api/projects';
import { getTasks, updateTaskApi } from '@/lib/api/tasks';
import { Task } from '@/constants/MockData';
import { SwiftUIAddTaskSheet } from '@/components/tasks/SwiftUIAddTaskSheet';
import { SwiftUITaskDetailSheet } from '@/components/tasks/SwiftUITaskDetailSheet';
import { SwiftUIToastHUD } from '@/components/ui/SwiftUIToastHUD';
import { CalendarMonthView, CalendarEvent } from '@/components/clock/setup/CalendarMonthView';
import ContextMenu from '@/components/ui/PlatformContextMenu';

import { Host, GlassEffectContainer as SwiftUIGlassEffectContainer, HStack as SwiftUIHStack, Spacer as SwiftUISpacer, glassEffect, frame, cornerRadius, padding as swiftUIPadding } from '@/lib/swiftui';

type ViewMode = 'list' | 'calendar';
type TaskStatusFilter = 'all' | 'active' | 'submitted' | 'revision' | 'done';

export default function ProjectTasksScreen() {
    const { id } = useLocalSearchParams();
    const projectId = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : '';

    const insets = useSafeAreaInsets();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#636366';
    const cardBgColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.92)';
    const dividerColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
    const formaBlue = '#007AFF';

    const [project, setProject] = useState<Project | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<TaskStatusFilter>('all');
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [isAddTaskVisible, setIsAddTaskVisible] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

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

    // System local date (e.g. Jakarta time / local timezone)
    const todayStr = useMemo(() => {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }, []);

    const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(todayStr);
    const [calendarYear, setCalendarYear] = useState<number>(new Date().getFullYear());
    const [calendarMonth, setCalendarMonth] = useState<number>(new Date().getMonth());

    useFocusEffect(
        useCallback(() => {
            if (projectId) {
                loadData();
            }
        }, [projectId])
    );

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [projData, allTasks] = await Promise.all([
                getProjectById(projectId),
                getTasks(),
            ]);
            setProject(projData);

            const pCode = projData?.code || 'PRJ';

            const filtered = (allTasks || []).filter(
                t => t.projectId === projectId || (t.project && (t.project.id === projectId || (t.project as any).project_code === pCode || t.projectCode === pCode))
            );

            setTasks(filtered);
        } catch (e) {
            console.error('Error loading project tasks:', e);
            setTasks([]);
        } finally {
            setIsLoading(false);
        }
    };

    const hexToRgba = (hex: string, opacity: number) => {
        if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) return `rgba(128,128,128,${opacity})`;
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
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

    const formatCardDate = (dateStr: any) => {
        if (!dateStr || typeof dateStr !== 'string') return '';
        const cleanStr = dateStr.split('T')[0];
        if (!cleanStr.includes('-')) return cleanStr;
        const parts = cleanStr.split('-');
        if (parts.length !== 3) return cleanStr;
        
        const year = parseInt(parts[0], 10);
        const monthIndex = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        
        if (isNaN(year) || isNaN(monthIndex) || isNaN(day)) return cleanStr;
        
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
        if (target === 'crew') return { label: 'Crew', icon: 'person.3.fill', color: '#8B5CF6' };
        if (target === 'forma_ai') return { label: 'Forma AI', icon: 'sparkles', color: '#6366F1' };
        if (target === 'project') return { label: 'Projects', icon: 'folder.fill', color: '#007AFF' };
        if (target === 'tracking') return { label: 'Tracking', icon: 'target', color: '#64748B' };

        const lower = (task.title || '').toLowerCase();
        if (lower.startsWith('receive po') || lower.includes('receiving') || lower.includes('stock')) {
            return { label: 'Resources', icon: 'archivebox.fill', color: '#F08C45' };
        }
        if (lower.includes('daily report') || lower.includes('construction report') || lower.includes('weekly report') || lower.includes('monthly report')) {
            return { label: 'Report', icon: 'doc.text.fill', color: '#14B8A6' };
        }
        if (lower.startsWith('approve pr') || lower.includes('reimbursement') || lower.includes('payment') || lower.includes('invoice') || lower.includes('consolidation')) {
            return { label: 'Finance', icon: 'creditcard.fill', color: '#FF2D55' };
        }
        if (lower.includes('onboarding') || lower.includes('training') || lower.includes('handbook') || lower.includes('employee')) {
            return { label: 'People', icon: 'person.2.fill', color: '#10B981' };
        }
        if (lower.includes('clock') || lower.includes('attendance') || lower.includes('overtime') || lower.includes('leave')) {
            return { label: 'Clock', icon: 'clock.fill', color: '#0284C7' };
        }
        if (lower.includes('crew') || lower.includes('offloading') || lower.includes('grid')) {
            return { label: 'Crew', icon: 'person.3.fill', color: '#8B5CF6' };
        }
        if (lower.includes('ai') || lower.includes('forma ai')) {
            return { label: 'Forma AI', icon: 'sparkles', color: '#6366F1' };
        }
        return { label: 'Projects', icon: 'folder.fill', color: '#007AFF' };
    };

    const filteredTasks = useMemo(() => {
        return tasks.filter(t => {
            const isDone = t.status === 'done' || (t.status as string) === 'completed';
            const isSubmitted = t.status === 'submitted' || (t.status as string) === 'in_review';
            const isRevision = t.status === 'revision' || (t.status as string) === 'changes_requested';
            const isActive = !isDone && !isSubmitted && !isRevision;

            if (statusFilter === 'active' && !isActive) return false;
            if (statusFilter === 'submitted' && !isSubmitted) return false;
            if (statusFilter === 'revision' && !isRevision) return false;
            if (statusFilter === 'done' && !isDone) return false;

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchTitle = t.title.toLowerCase().includes(q);
                const matchDesc = t.description?.toLowerCase().includes(q);
                if (!matchTitle && !matchDesc) return false;
            }
            return true;
        });
    }, [tasks, statusFilter, searchQuery]);

    // Calendar Events derived from tasks with dueDate
    const calendarEvents = useMemo<CalendarEvent[]>(() => {
        return tasks
            .filter(t => t.dueDate)
            .map(t => {
                const isDone = t.status === 'done' || (t.status as string) === 'completed';
                const isInProgress = t.status === 'in_progress';
                const isSubmitted = t.status === 'submitted';
                const isRevision = t.status === 'revision';

                const color = isDone
                    ? '#34C759'
                    : isRevision
                    ? '#FF9500'
                    : (isInProgress || isSubmitted)
                    ? formaBlue
                    : '#8E8E93';

                return {
                    id: t.id,
                    title: t.title,
                    date: t.dueDate.split('T')[0],
                    color,
                };
            });
    }, [tasks, formaBlue]);

    const selectedDateTasks = useMemo(() => {
        if (!selectedCalendarDate) return [];
        return filteredTasks.filter(t => t.dueDate && t.dueDate.split('T')[0] === selectedCalendarDate);
    }, [filteredTasks, selectedCalendarDate]);

    const todayTasks = useMemo(() => {
        return filteredTasks.filter(t => t.dueDate && t.dueDate.split('T')[0] === todayStr);
    }, [filteredTasks, todayStr]);

    // Nearest upcoming tasks (max 5)
    const nearestTasks = useMemo(() => {
        const baseDate = selectedCalendarDate || todayStr;
        return [...filteredTasks]
            .filter(t => {
                if (!t.dueDate) return false;
                const d = t.dueDate.split('T')[0];
                const isDone = t.status === 'done' || (t.status as string) === 'completed';
                return d >= baseDate && d !== selectedCalendarDate && !isDone;
            })
            .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))
            .slice(0, 5);
    }, [filteredTasks, selectedCalendarDate, todayStr]);

    const headerTitle = project ? `${project.code || project.title}: Tasks` : 'Tasks';

    const headerActions: HeaderToolbarAction[] = [
        {
            id: 'add',
            label: 'Add Task',
            icon: 'add',
            image: 'plus',
            tintColor: formaBlue,
            isPrimary: true,
            onPress: () => setIsAddTaskVisible(true),
        },
    ];

    const renderTaskCard = (task: Task, index: number) => {
        const statusStyle = getStatusStyles(task.status);
        const doneSubtasks = task.subtasks?.filter(s => s.isDone).length || 0;
        const totalSubtasks = task.subtasks?.length || 0;

        const priorityColor = task.priority === 'urgent'
            ? (isDark ? 'rgba(255, 59, 48, 0.08)' : 'rgba(255, 59, 48, 0.06)')
            : task.priority === 'high'
                ? (isDark ? 'rgba(255, 149, 0, 0.08)' : 'rgba(255, 149, 0, 0.06)')
                : (isDark ? 'rgba(142, 142, 147, 0.12)' : 'rgba(142, 142, 147, 0.08)');

        const mod = getTaskModuleInfo(task);
        const iconBg = isDark ? hexToRgba(mod.color, 0.22) : hexToRgba(mod.color, 0.14);
        const iconTintColor = mod.color;

        return (
            <Animated.View key={task.id || index} entering={FadeInUp.delay(index * 30)}>
                <TouchableOpacity
                    onPress={() => {
                        Haptics.selectionAsync();
                        setSelectedTask(task);
                    }}
                    activeOpacity={0.7}
                >
                    <GlassView
                        intensity={30}
                        style={[
                            styles.compactCard,
                            {
                                backgroundColor: priorityColor,
                                borderColor: 'transparent',
                            }
                        ]}
                    >
                        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                            {/* Left: Module Icon */}
                            <View
                                style={{
                                    width: 38,
                                    height: 38,
                                    borderRadius: 19,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: iconBg,
                                }}
                            >
                                <PlatformIcon
                                    name={mod.icon as any}
                                    size={18}
                                    tintColor={iconTintColor}
                                    weight="semibold"
                                />
                            </View>

                            {/* Center Content */}
                            <View style={[styles.cardInfo, { flexDirection: 'row', gap: 8 }]}>
                                <View style={{ flex: 1, justifyContent: 'center' }}>
                                    {/* Subtasks counter if any */}
                                    {totalSubtasks > 0 && (
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                            <View style={[styles.subtaskInlineBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', marginLeft: 0 }]}>
                                                <Ionicons name="list" size={10} color={subtextColor} style={{ marginRight: 4 }} />
                                                <Text style={{ fontSize: 10, fontWeight: '700', color: subtextColor }}>{doneSubtasks}/{totalSubtasks}</Text>
                                            </View>
                                        </View>
                                    )}

                                    {/* Task Title */}
                                    <Text style={[styles.compactTitle, { color: textColor, marginBottom: 4 }]} numberOfLines={2}>
                                        {task.title}
                                    </Text>

                                    {/* Due Date & Time (Project code badge removed for specific project view) */}
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                        <Text style={{ fontSize: 11, fontWeight: '600', color: subtextColor }}>
                                            {`${formatCardDate(task.dueDate)}${task.dueTime ? `  •  ${task.dueTime}` : ''}`}
                                        </Text>
                                    </View>
                                </View>

                                {/* Right: Borderless Status Badge & Assignees */}
                                <View style={{ alignItems: 'flex-end', justifyContent: 'space-between', minHeight: 52 }}>
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

                                    {/* Assignees */}
                                    {task.assignees && task.assignees.length > 0 && (
                                        <View style={styles.miniAvatarGroup}>
                                            {task.assignees.slice(0, 2).map((a, i) => (
                                                <View
                                                    key={a.id || i}
                                                    style={[
                                                        styles.miniAvatar,
                                                        {
                                                            backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF',
                                                            borderColor: isDark ? '#1C1C1E' : '#F2F2F7',
                                                            zIndex: 2 - i,
                                                            marginLeft: i === 0 ? 0 : -6,
                                                        }
                                                    ]}
                                                >
                                                    <Text style={{ fontSize: 9, fontWeight: '700', color: textColor }}>
                                                        {a.name.slice(0, 2).toUpperCase()}
                                                    </Text>
                                                </View>
                                            ))}
                                            {task.assignees.length > 2 && (
                                                <View style={[styles.miniAvatarMore, { backgroundColor: isDark ? '#3A3A3C' : '#E5E5EA', marginLeft: -6 }]}>
                                                    <Text style={{ fontSize: 8, fontWeight: '700', color: subtextColor }}>+{task.assignees.length - 2}</Text>
                                                </View>
                                            )}
                                        </View>
                                    )}
                                </View>
                            </View>
                        </View>
                    </GlassView>
                </TouchableOpacity>
            </Animated.View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}>
            <Stack.Screen
                options={{
                    headerShown: true,
                    headerTransparent: Platform.OS === 'ios',
                    headerShadowVisible: false,
                    headerStyle: { backgroundColor: Platform.OS === 'ios' ? 'transparent' : (isDark ? '#000000' : '#F2F2F7') },
                    headerTitle: headerTitle,
                    headerBackTitle: project?.title || 'Project',
                    headerBackButtonDisplayMode: 'minimal',
                    headerTintColor: isDark ? '#FFFFFF' : '#000000',
                    headerTitleStyle: { color: textColor, fontWeight: '600' },
                    headerRight: () => (
                        <View style={{ marginRight: Platform.OS === 'web' ? 16 : 0 }}>
                            <HeaderToolbar actions={headerActions} isDark={isDark} textColor={isDark ? '#FFFFFF' : '#000000'} />
                        </View>
                    ),
                }}
            />

            {/* Main Content Area */}
            {isLoading ? (
                <View style={[styles.loadingContainer, { paddingTop: insets.top + 52 }]}>
                    <ActivityIndicator size="small" color={formaBlue} />
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={[
                        styles.contentContainer,
                        {
                            paddingTop: insets.top + 52,
                            paddingBottom: insets.bottom + 88,
                        }
                    ]}
                    showsVerticalScrollIndicator={false}
                >
                    {/* View Mode 1: List View */}
                    {viewMode === 'list' && (
                        <View style={styles.cardsList}>
                            {filteredTasks.length === 0 ? (
                                <GlassView intensity={isDark ? 10 : 25} style={[styles.emptyCard, { backgroundColor: cardBgColor }]}>
                                    <PlatformIcon name="checklist" size={32} tintColor={subtextColor} />
                                    <Text style={[styles.emptyTitle, { color: textColor }]}>No Tasks Found</Text>
                                    <Text style={[styles.emptySubtitle, { color: subtextColor }]}>
                                        {searchQuery ? 'No tasks match your search query.' : 'Tap + on the top right to create your first task.'}
                                    </Text>
                                </GlassView>
                            ) : (
                                filteredTasks.map((t, idx) => renderTaskCard(t, idx))
                            )}
                        </View>
                    )}

                    {/* View Mode 2: Calendar View */}
                    {viewMode === 'calendar' && (
                        <View style={styles.calendarModeWrapper}>
                            <CalendarMonthView
                                events={calendarEvents}
                                selectedDate={selectedCalendarDate}
                                onSelectDate={(d) => setSelectedCalendarDate(d)}
                                isDark={isDark}
                                textColor={textColor}
                                subtextColor={subtextColor}
                                tenantBrandColor={formaBlue}
                                viewYear={calendarYear}
                                viewMonth={calendarMonth}
                                onMonthChange={(y, m) => {
                                    setCalendarYear(y);
                                    setCalendarMonth(m);
                                }}
                            />

                            {/* Date Selected Section */}
                            {selectedCalendarDate && selectedCalendarDate !== todayStr ? (
                                <>
                                    <View style={styles.calendarTaskHeader}>
                                        <Text style={[styles.calendarTaskHeaderText, { color: textColor }]}>
                                            Tasks on {formatCardDate(selectedCalendarDate)}
                                        </Text>
                                        <TouchableOpacity
                                            onPress={() => setSelectedCalendarDate(todayStr)}
                                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                        >
                                            <Text style={{ fontSize: 13, color: formaBlue, fontWeight: '600' }}>Reset to Today</Text>
                                        </TouchableOpacity>
                                    </View>

                                    {selectedDateTasks.length === 0 ? (
                                        <GlassView intensity={isDark ? 10 : 25} style={[styles.emptyCard, { backgroundColor: cardBgColor }]}>
                                            <PlatformIcon name="calendar" size={32} tintColor={subtextColor} />
                                            <Text style={[styles.emptyTitle, { color: textColor }]}>No Tasks</Text>
                                            <Text style={[styles.emptySubtitle, { color: subtextColor }]}>
                                                No tasks scheduled on {formatCardDate(selectedCalendarDate)}.
                                            </Text>
                                        </GlassView>
                                    ) : (
                                        <View style={styles.cardsList}>
                                            {selectedDateTasks.map((t, idx) => renderTaskCard(t, idx))}
                                        </View>
                                    )}

                                    {/* Nearest Upcoming Tasks */}
                                    {nearestTasks.length > 0 && (
                                        <>
                                            <View style={[styles.calendarTaskHeader, { marginTop: 8 }]}>
                                                <Text style={[styles.calendarTaskHeaderText, { color: textColor }]}>
                                                    Nearest Upcoming Tasks ({nearestTasks.length})
                                                </Text>
                                            </View>
                                            <View style={styles.cardsList}>
                                                {nearestTasks.map((t, idx) => renderTaskCard(t, idx))}
                                            </View>
                                        </>
                                    )}
                                </>
                            ) : (
                                <>
                                    <View style={styles.calendarTaskHeader}>
                                        <Text style={[styles.calendarTaskHeaderText, { color: textColor }]}>
                                            Today ({formatCardDate(todayStr)})
                                        </Text>
                                    </View>

                                    {todayTasks.length === 0 ? (
                                        <GlassView intensity={isDark ? 10 : 25} style={[styles.emptyCard, { backgroundColor: cardBgColor }]}>
                                            <PlatformIcon name="calendar" size={32} tintColor={subtextColor} />
                                            <Text style={[styles.emptyTitle, { color: textColor }]}>No Tasks Due Today</Text>
                                            <Text style={[styles.emptySubtitle, { color: subtextColor }]}>
                                                You're all clear today! Review upcoming and all project tasks below.
                                            </Text>
                                        </GlassView>
                                    ) : (
                                        <View style={styles.cardsList}>
                                            {todayTasks.map((t, idx) => renderTaskCard(t, idx))}
                                        </View>
                                    )}

                                    {/* Nearest Upcoming Tasks (max 5) */}
                                    {nearestTasks.length > 0 && (
                                        <>
                                            <View style={[styles.calendarTaskHeader, { marginTop: 8 }]}>
                                                <Text style={[styles.calendarTaskHeaderText, { color: textColor }]}>
                                                    Nearest Upcoming Tasks ({nearestTasks.length})
                                                </Text>
                                            </View>
                                            <View style={styles.cardsList}>
                                                {nearestTasks.map((t, idx) => renderTaskCard(t, idx))}
                                            </View>
                                        </>
                                    )}

                                    {/* All Project Tasks */}
                                    <View style={[styles.calendarTaskHeader, { marginTop: 12 }]}>
                                        <Text style={[styles.calendarTaskHeaderText, { color: textColor }]}>
                                            All Project Tasks ({filteredTasks.length})
                                        </Text>
                                    </View>

                                    {filteredTasks.length === 0 ? (
                                        <GlassView intensity={isDark ? 10 : 25} style={[styles.emptyCard, { backgroundColor: cardBgColor }]}>
                                            <PlatformIcon name="checklist" size={32} tintColor={subtextColor} />
                                            <Text style={[styles.emptyTitle, { color: textColor }]}>No Tasks Found</Text>
                                            <Text style={[styles.emptySubtitle, { color: subtextColor }]}>
                                                Tap + on top right to create your first task.
                                            </Text>
                                        </GlassView>
                                    ) : (
                                        <View style={styles.cardsList}>
                                            {filteredTasks.map((t, idx) => renderTaskCard(t, idx))}
                                        </View>
                                    )}
                                </>
                            )}
                        </View>
                    )}
                </ScrollView>
            )}

            {/* Native Liquid Glass Floating Toolbar (Search Capsule + Filter Circle + View Mode Circle) */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'position' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? (insets.bottom > 0 ? insets.bottom + 8 : 16) : 0}
                style={[
                    styles.floatingInputWrapper,
                    { bottom: insets.bottom > 0 ? insets.bottom + 8 : 16 }
                ]}
                pointerEvents="box-none"
            >
                <View style={styles.floatingSearchToolbarRow}>
                    {/* 1. Left: Liquid Glass Search Capsule */}
                    <View style={[styles.floatingSearchCapsule, { flex: 1 }]}>
                        {Platform.OS === 'ios' ? (
                            <Host style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                                <SwiftUIGlassEffectContainer modifiers={[
                                    frame({ height: 44 }),
                                    cornerRadius(22),
                                    glassEffect({ shape: 'capsule' })
                                ]}>
                                    <SwiftUIHStack alignment="center" modifiers={[
                                        frame({ height: 44 }),
                                        swiftUIPadding({ leading: 14, trailing: 14 })
                                    ]}>
                                        <SwiftUISpacer />
                                    </SwiftUIHStack>
                                </SwiftUIGlassEffectContainer>
                            </Host>
                        ) : (
                            <View style={[styles.selectBtnFallback, { backgroundColor: isDark ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.85)', borderRadius: 22 }]} />
                        )}
                        <View style={styles.searchInnerRow}>
                            <PlatformIcon name="magnifyingglass" size={16} tintColor={isDark ? '#8E8E93' : '#9CA3AF'} />
                            <TextInput
                                placeholder="Search tasks..."
                                placeholderTextColor={isDark ? '#8E8E93' : '#9CA3AF'}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                style={[styles.floatingSearchInput, { color: textColor }]}
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity
                                    onPress={() => {
                                        Keyboard.dismiss();
                                        setSearchQuery('');
                                    }}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                    style={{ paddingLeft: 6 }}
                                >
                                    <PlatformIcon
                                        name="xmark.circle.fill"
                                        size={16}
                                        tintColor={isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.22)'}
                                    />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    {/* 2. Middle: Status Filter Circle (Native ContextMenu - Ordered correctly top-to-bottom) */}
                    <ContextMenu
                        actions={[
                            { title: 'Done', state: statusFilter === 'done' ? 'on' : 'off', systemIcon: 'checkmark.circle' },
                            { title: 'Revision', state: statusFilter === 'revision' ? 'on' : 'off', systemIcon: 'exclamationmark.circle' },
                            { title: 'Submitted', state: statusFilter === 'submitted' ? 'on' : 'off', systemIcon: 'arrow.up.circle' },
                            { title: 'Active', state: statusFilter === 'active' ? 'on' : 'off', systemIcon: 'play.circle' },
                            { title: 'All Tasks', state: statusFilter === 'all' ? 'on' : 'off', systemIcon: 'checklist' },
                        ]}
                        dropdownMenuMode={true}
                        onPress={(e) => {
                            Haptics.selectionAsync();
                            const options: TaskStatusFilter[] = ['done', 'revision', 'submitted', 'active', 'all'];
                            const selected = options[e.nativeEvent.index];
                            if (selected) setStatusFilter(selected);
                        }}
                    >
                        <TouchableOpacity activeOpacity={0.8} style={styles.selectActionCircleBtn}>
                            {Platform.OS === 'ios' ? (
                                <Host style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                                    <SwiftUIGlassEffectContainer modifiers={[
                                        frame({ width: 44, height: 44 }),
                                        cornerRadius(22),
                                        glassEffect({ shape: 'circle' })
                                    ]}>
                                        <SwiftUIHStack alignment="center" modifiers={[frame({ width: 44, height: 44 })]}>
                                            <SwiftUISpacer />
                                        </SwiftUIHStack>
                                    </SwiftUIGlassEffectContainer>
                                </Host>
                            ) : (
                                <View style={[styles.selectCircleFallback, { backgroundColor: isDark ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.85)', borderRadius: 22 }]} />
                            )}
                            <PlatformIcon
                                name={statusFilter !== 'all' ? 'line.3.horizontal.decrease.circle.fill' : 'line.3.horizontal.decrease'}
                                size={19}
                                tintColor={statusFilter !== 'all' ? formaBlue : textColor}
                            />
                        </TouchableOpacity>
                    </ContextMenu>

                    {/* 3. Right: View Mode Circle (Native ContextMenu - List View on top, Calendar below) */}
                    <ContextMenu
                        actions={[
                            { title: 'Calendar View', state: viewMode === 'calendar' ? 'on' : 'off', systemIcon: 'calendar' },
                            { title: 'List View', state: viewMode === 'list' ? 'on' : 'off', systemIcon: 'list.bullet' },
                        ]}
                        dropdownMenuMode={true}
                        onPress={(e) => {
                            Haptics.selectionAsync();
                            const modes: ViewMode[] = ['calendar', 'list'];
                            const selected = modes[e.nativeEvent.index];
                            if (selected) setViewMode(selected);
                        }}
                    >
                        <TouchableOpacity activeOpacity={0.8} style={styles.selectActionCircleBtn}>
                            {Platform.OS === 'ios' ? (
                                <Host style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                                    <SwiftUIGlassEffectContainer modifiers={[
                                        frame({ width: 44, height: 44 }),
                                        cornerRadius(22),
                                        glassEffect({ shape: 'circle' })
                                    ]}>
                                        <SwiftUIHStack alignment="center" modifiers={[frame({ width: 44, height: 44 })]}>
                                            <SwiftUISpacer />
                                        </SwiftUIHStack>
                                    </SwiftUIGlassEffectContainer>
                                </Host>
                            ) : (
                                <View style={[styles.selectCircleFallback, { backgroundColor: isDark ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.85)', borderRadius: 22 }]} />
                            )}
                            <PlatformIcon
                                name={viewMode === 'calendar' ? 'calendar' : 'list.bullet'}
                                size={19}
                                tintColor={viewMode === 'calendar' ? formaBlue : textColor}
                            />
                        </TouchableOpacity>
                    </ContextMenu>
                </View>
            </KeyboardAvoidingView>

            {/* Native SwiftUI Add Task Sheet */}
            <SwiftUIAddTaskSheet
                isOpened={isAddTaskVisible}
                onClose={() => setIsAddTaskVisible(false)}
                defaultProjectId={projectId}
                onSave={(newTask) => {
                    setTasks(prev => [newTask, ...prev]);
                    setIsAddTaskVisible(false);
                    showToast('Task created');
                }}
            />

            {/* Native SwiftUI Task Detail Sheet */}
            <SwiftUITaskDetailSheet
                isOpened={!!selectedTask}
                onClose={() => setSelectedTask(null)}
                task={selectedTask}
                setTasks={setTasks}
            />

            {/* Floating Toast HUD */}
            {toastState && (
                <RNAnimated.View
                    style={[
                        styles.floatingToastContainer,
                        {
                            top: (insets.top > 0 ? insets.top : 20) + 52,
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
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    floatingToastContainer: {
        position: 'absolute',
        alignSelf: 'center',
        zIndex: 99999,
        elevation: 999,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    contentContainer: {
        paddingHorizontal: 16,
    },
    cardsList: {
        gap: 12,
    },
    compactCard: {
        borderRadius: 20,
        padding: 14,
        overflow: 'hidden',
    },
    cardInfo: {
        flex: 1,
    },
    compactTitle: {
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: -0.2,
        lineHeight: 18,
    },
    subtaskInlineBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        alignSelf: 'flex-start',
    },
    miniStatusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
        alignSelf: 'flex-end',
    },
    miniStatusText: {
        fontSize: 10,
        fontWeight: '700',
    },
    miniAvatarGroup: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    miniAvatar: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    miniAvatarMore: {
        width: 22,
        height: 22,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyCard: {
        borderRadius: 20,
        padding: 32,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginVertical: 12,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginTop: 4,
    },
    emptySubtitle: {
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 18,
    },
    // Calendar styles
    calendarModeWrapper: {
        gap: 16,
    },
    calendarTaskHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
    },
    calendarTaskHeaderText: {
        fontSize: 15,
        fontWeight: '600',
    },
    // Floating Liquid Glass Toolbar Styles
    floatingInputWrapper: {
        position: 'absolute',
        left: 16,
        right: 16,
        zIndex: 999,
    },
    floatingSearchToolbarRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    floatingSearchCapsule: {
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        position: 'relative',
    },
    searchInnerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 44,
        paddingHorizontal: 14,
        zIndex: 1,
    },
    floatingSearchInput: {
        flex: 1,
        fontSize: 14,
        fontWeight: '400',
        paddingVertical: 0,
        marginLeft: 8,
    },
    selectActionCircleBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    selectCircleFallback: {
        ...StyleSheet.absoluteFillObject,
    },
    selectBtnFallback: {
        ...StyleSheet.absoluteFillObject,
    },
});
