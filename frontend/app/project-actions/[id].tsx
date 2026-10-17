import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { getActions } from '@/lib/api/tasks';
import { Action } from '@/constants/MockData';
import { SwiftUIAddActionSheet } from '@/components/actions/SwiftUIAddActionSheet';
import { SwiftUIActionDetailSheet } from '@/components/actions/SwiftUIActionDetailSheet';
import { CalendarMonthView, CalendarEvent } from '@/components/clock/setup/CalendarMonthView';
import ContextMenu from '@/components/ui/PlatformContextMenu';

import { Host, GlassEffectContainer as SwiftUIGlassEffectContainer, HStack as SwiftUIHStack, Spacer as SwiftUISpacer, glassEffect, frame, cornerRadius, padding as swiftUIPadding } from '@/lib/swiftui';

type ViewMode = 'list' | 'calendar';
type ActionStatusFilter = 'all' | 'urgent' | 'pending' | 'returned' | 'completed';

export default function ProjectActionsScreen() {
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
    const [actions, setActions] = useState<Action[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<ActionStatusFilter>('all');
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [isAddActionVisible, setIsAddActionVisible] = useState(false);
    const [selectedAction, setSelectedAction] = useState<Action | null>(null);

    // System local date
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
            const [projData, allActions] = await Promise.all([
                getProjectById(projectId),
                getActions(),
            ]);
            setProject(projData);

            const pCode = projData?.code || 'PRJ';

            const filtered = (allActions || []).filter(
                a => a.projectId === projectId || (a.project && (a.project.id === projectId || (a.project as any).project_code === pCode || a.projectCode === pCode))
            );

            setActions(filtered);
        } catch (e) {
            console.error('Error loading project actions:', e);
            setActions([]);
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

    const getActionModuleInfo = (action: Action) => {
        const mod = (action as any).module || action.type;
        if (mod === 'finance') return { label: 'Finance', icon: 'creditcard.fill', color: '#FF2D55' };
        if (mod === 'resources') return { label: 'Resources', icon: 'archivebox.fill', color: '#F08C45' };
        if (mod === 'people') return { label: 'People', icon: 'person.2.fill', color: '#10B981' };
        if (mod === 'clock') return { label: 'Clock', icon: 'clock.fill', color: '#0284C7' };
        if (mod === 'report') return { label: 'Report', icon: 'doc.text.fill', color: '#14B8A6' };
        if (mod === 'tracking') return { label: 'Tracking', icon: 'target', color: '#64748B' };
        return { label: 'Action', icon: 'bolt.horizontal.fill', color: formaBlue };
    };

    const filteredActions = useMemo(() => {
        return actions.filter(act => {
            const isCompleted = act.status === 'COMPLETED' || act.status === 'APPROVED' || act.status === 'RESOLVED' || (act.status as string) === 'done';
            const isReturned = act.status === 'RETURNED' || act.status === 'REJECTED' || (act.status as string) === 'CHANGES_REQUESTED';
            const isUrgent = act.priority === 'urgent' || act.priority === 'high';
            const isPending = !isCompleted && !isReturned;

            if (statusFilter === 'urgent' && !isUrgent) return false;
            if (statusFilter === 'pending' && !isPending) return false;
            if (statusFilter === 'returned' && !isReturned) return false;
            if (statusFilter === 'completed' && !isCompleted) return false;

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchTitle = act.title.toLowerCase().includes(q);
                const matchDesc = act.description?.toLowerCase().includes(q);
                if (!matchTitle && !matchDesc) return false;
            }
            return true;
        });
    }, [actions, statusFilter, searchQuery]);

    // Calendar Events from Actions
    const calendarEvents = useMemo<CalendarEvent[]>(() => {
        return actions
            .filter(a => !!a.date)
            .map(a => {
                const isCompleted = a.status === 'COMPLETED' || a.status === 'APPROVED' || a.status === 'RESOLVED';
                const isUrgent = a.priority === 'urgent' || a.priority === 'high';
                const isReturned = a.status === 'RETURNED' || a.status === 'REJECTED';

                const color = isCompleted
                    ? '#34C759'
                    : isReturned
                    ? '#FF3B30'
                    : isUrgent
                    ? '#FF9500'
                    : formaBlue;

                return {
                    id: a.id,
                    title: a.title,
                    date: a.date?.split('T')[0] || '',
                    color,
                };
            });
    }, [actions, formaBlue]);

    const selectedDateActions = useMemo(() => {
        if (!selectedCalendarDate) return [];
        return filteredActions.filter(a => a.date && a.date.split('T')[0] === selectedCalendarDate);
    }, [filteredActions, selectedCalendarDate]);

    const todayActions = useMemo(() => {
        return filteredActions.filter(a => a.date && a.date.split('T')[0] === todayStr);
    }, [filteredActions, todayStr]);

    // Nearest upcoming actions (max 5)
    const nearestActions = useMemo(() => {
        const baseDate = selectedCalendarDate || todayStr;
        return [...filteredActions]
            .filter(a => {
                if (!a.date) return false;
                const d = a.date.split('T')[0];
                const isCompleted = a.status === 'COMPLETED' || a.status === 'APPROVED' || a.status === 'RESOLVED';
                return d >= baseDate && d !== selectedCalendarDate && !isCompleted;
            })
            .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
            .slice(0, 5);
    }, [filteredActions, selectedCalendarDate, todayStr]);

    const headerTitle = project ? `${project.code || project.title}: Actions` : 'Actions';

    const headerActions: HeaderToolbarAction[] = [
        {
            id: 'add',
            label: 'Add Action',
            icon: 'add',
            image: 'plus',
            tintColor: formaBlue,
            isPrimary: true,
            onPress: () => setIsAddActionVisible(true),
        },
    ];

    const renderActionCard = (act: Action, index: number) => {
        const isResolved = act.status === 'COMPLETED' || act.status === 'APPROVED' || act.status === 'RESOLVED' || (act.status as string) === 'done';
        const isUrgent = act.priority === 'urgent' || act.priority === 'high';
        const isReturned = act.status === 'RETURNED' || act.status === 'REJECTED' || (act.status as string) === 'CHANGES_REQUESTED';

        const statusColor = isResolved ? '#34C759' : isReturned ? '#FF453A' : isUrgent ? '#FF9500' : formaBlue;
        const statusLabel = isResolved ? 'Done' : isReturned ? 'Returned' : isUrgent ? 'Urgent' : 'Pending';

        const priorityColor = isUrgent
            ? (isDark ? 'rgba(255, 59, 48, 0.08)' : 'rgba(255, 59, 48, 0.06)')
            : (isDark ? 'rgba(142, 142, 147, 0.12)' : 'rgba(142, 142, 147, 0.08)');

        const mod = getActionModuleInfo(act);
        const iconBg = isDark ? hexToRgba(mod.color, 0.22) : hexToRgba(mod.color, 0.14);
        const iconTintColor = mod.color;

        return (
            <Animated.View key={act.id || index} entering={FadeInUp.delay(index * 30)}>
                <TouchableOpacity
                    onPress={() => {
                        Haptics.selectionAsync();
                        setSelectedAction(act);
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
                                    <Text style={[styles.compactTitle, { color: textColor, marginBottom: 4 }]} numberOfLines={2}>
                                        {act.title}
                                    </Text>

                                    {act.date && (
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                            <Text style={{ fontSize: 11, fontWeight: '600', color: subtextColor }}>
                                                {formatCardDate(act.date)}
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                {/* Right: Status Badge & Assignee */}
                                <View style={{ alignItems: 'flex-end', justifyContent: 'space-between', minHeight: 52 }}>
                                    <View style={[
                                        styles.miniStatusBadge,
                                        {
                                            backgroundColor: hexToRgba(statusColor, isDark ? 0.2 : 0.12),
                                            borderWidth: 0,
                                        }
                                    ]}>
                                        <Text style={[styles.miniStatusText, { color: statusColor, fontWeight: '700' }]}>
                                            {statusLabel}
                                        </Text>
                                    </View>

                                    {act.assignee && (
                                        <View style={styles.miniAvatarGroup}>
                                            <View
                                                style={[
                                                    styles.miniAvatar,
                                                    {
                                                        backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF',
                                                        borderColor: isDark ? '#1C1C1E' : '#F2F2F7',
                                                    }
                                                ]}
                                            >
                                                <Text style={{ fontSize: 9, fontWeight: '700', color: textColor }}>
                                                    {act.assignee.name?.slice(0, 2).toUpperCase() || 'AC'}
                                                </Text>
                                            </View>
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
                            {filteredActions.length === 0 ? (
                                <GlassView intensity={isDark ? 10 : 25} style={[styles.emptyCard, { backgroundColor: cardBgColor }]}>
                                    <PlatformIcon name="bolt.horizontal.fill" size={32} tintColor={subtextColor} />
                                    <Text style={[styles.emptyTitle, { color: textColor }]}>No Actions Found</Text>
                                    <Text style={[styles.emptySubtitle, { color: subtextColor }]}>
                                        {searchQuery ? 'No actions match your search query.' : 'Tap + on top right to create an action item.'}
                                    </Text>
                                </GlassView>
                            ) : (
                                filteredActions.map((a, idx) => renderActionCard(a, idx))
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
                                            Actions on {formatCardDate(selectedCalendarDate)}
                                        </Text>
                                        <TouchableOpacity
                                            onPress={() => setSelectedCalendarDate(todayStr)}
                                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                        >
                                            <Text style={{ fontSize: 13, color: formaBlue, fontWeight: '600' }}>Reset to Today</Text>
                                        </TouchableOpacity>
                                    </View>

                                    {selectedDateActions.length === 0 ? (
                                        <GlassView intensity={isDark ? 10 : 25} style={[styles.emptyCard, { backgroundColor: cardBgColor }]}>
                                            <PlatformIcon name="calendar" size={32} tintColor={subtextColor} />
                                            <Text style={[styles.emptyTitle, { color: textColor }]}>No Actions</Text>
                                            <Text style={[styles.emptySubtitle, { color: subtextColor }]}>
                                                No actions scheduled on {formatCardDate(selectedCalendarDate)}.
                                            </Text>
                                        </GlassView>
                                    ) : (
                                        <View style={styles.cardsList}>
                                            {selectedDateActions.map((a, idx) => renderActionCard(a, idx))}
                                        </View>
                                    )}

                                    {/* Nearest Upcoming Actions */}
                                    {nearestActions.length > 0 && (
                                        <>
                                            <View style={[styles.calendarTaskHeader, { marginTop: 8 }]}>
                                                <Text style={[styles.calendarTaskHeaderText, { color: textColor }]}>
                                                    Nearest Upcoming Actions ({nearestActions.length})
                                                </Text>
                                            </View>
                                            <View style={styles.cardsList}>
                                                {nearestActions.map((a, idx) => renderActionCard(a, idx))}
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

                                    {todayActions.length === 0 ? (
                                        <GlassView intensity={isDark ? 10 : 25} style={[styles.emptyCard, { backgroundColor: cardBgColor }]}>
                                            <PlatformIcon name="calendar" size={32} tintColor={subtextColor} />
                                            <Text style={[styles.emptyTitle, { color: textColor }]}>No Actions Due Today</Text>
                                            <Text style={[styles.emptySubtitle, { color: subtextColor }]}>
                                                You're all clear today! Review upcoming and all project actions below.
                                            </Text>
                                        </GlassView>
                                    ) : (
                                        <View style={styles.cardsList}>
                                            {todayActions.map((a, idx) => renderActionCard(a, idx))}
                                        </View>
                                    )}

                                    {/* Nearest Upcoming Actions (max 5) */}
                                    {nearestActions.length > 0 && (
                                        <>
                                            <View style={[styles.calendarTaskHeader, { marginTop: 8 }]}>
                                                <Text style={[styles.calendarTaskHeaderText, { color: textColor }]}>
                                                    Nearest Upcoming Actions ({nearestActions.length})
                                                </Text>
                                            </View>
                                            <View style={styles.cardsList}>
                                                {nearestActions.map((a, idx) => renderActionCard(a, idx))}
                                            </View>
                                        </>
                                    )}

                                    {/* All Project Actions */}
                                    <View style={[styles.calendarTaskHeader, { marginTop: 12 }]}>
                                        <Text style={[styles.calendarTaskHeaderText, { color: textColor }]}>
                                            All Project Actions ({filteredActions.length})
                                        </Text>
                                    </View>

                                    {filteredActions.length === 0 ? (
                                        <GlassView intensity={isDark ? 10 : 25} style={[styles.emptyCard, { backgroundColor: cardBgColor }]}>
                                            <PlatformIcon name="bolt.horizontal.fill" size={32} tintColor={subtextColor} />
                                            <Text style={[styles.emptyTitle, { color: textColor }]}>No Actions Found</Text>
                                            <Text style={[styles.emptySubtitle, { color: subtextColor }]}>
                                                Tap + on top right to create an action item.
                                            </Text>
                                        </GlassView>
                                    ) : (
                                        <View style={styles.cardsList}>
                                            {filteredActions.map((a, idx) => renderActionCard(a, idx))}
                                        </View>
                                    )}
                                </>
                            )}
                        </View>
                    )}
                </ScrollView>
            )}

            {/* Native Liquid Glass Floating Toolbar */}
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
                    {/* 1. Left: Search Capsule */}
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
                                placeholder="Search actions..."
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

                    {/* 2. Middle: Status Filter Circle (Native ContextMenu) */}
                    <ContextMenu
                        actions={[
                            { title: 'Done', state: statusFilter === 'completed' ? 'on' : 'off', systemIcon: 'checkmark.circle' },
                            { title: 'Returned', state: statusFilter === 'returned' ? 'on' : 'off', systemIcon: 'arrow.uturn.backward.circle' },
                            { title: 'Pending', state: statusFilter === 'pending' ? 'on' : 'off', systemIcon: 'clock' },
                            { title: 'Urgent', state: statusFilter === 'urgent' ? 'on' : 'off', systemIcon: 'exclamationmark.circle' },
                            { title: 'All Actions', state: statusFilter === 'all' ? 'on' : 'off', systemIcon: 'list.bullet' },
                        ]}
                        dropdownMenuMode={true}
                        onPress={(e) => {
                            Haptics.selectionAsync();
                            const options: ActionStatusFilter[] = ['completed', 'returned', 'pending', 'urgent', 'all'];
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

                    {/* 3. Right: View Mode Circle (List View on top, Calendar View below) */}
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

            {/* Native SwiftUI Add Action Sheet */}
            <SwiftUIAddActionSheet
                isOpened={isAddActionVisible}
                onClose={() => setIsAddActionVisible(false)}
                defaultProjectId={projectId}
                onSave={(newAct) => {
                    setActions(prev => [newAct, ...prev]);
                    setIsAddActionVisible(false);
                }}
            />

            {/* Native SwiftUI Action Detail Sheet */}
            <SwiftUIActionDetailSheet
                isOpened={!!selectedAction}
                onClose={() => setSelectedAction(null)}
                action={selectedAction}
                setActions={setActions}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
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
