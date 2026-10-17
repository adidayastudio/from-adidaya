import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
    Platform,
    KeyboardAvoidingView,
    Keyboard,
    LayoutChangeEvent,
} from 'react-native';
import { Stack, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { GlassView } from '@/components/ui/GlassView';
import {
    Host,
    Spacer as SwiftUISpacer,
    GlassEffectContainer as SwiftUIGlassEffectContainer,
    HStack as SwiftUIHStack,
    frame,
    glassEffect,
    cornerRadius,
    padding as swiftUIPadding,
} from '@/lib/swiftui';
import { HeaderToolbar, HeaderToolbarAction } from '@/components/ui/HeaderToolbar';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { getProjectById, Project, saveProjectMeta } from '@/lib/api/projects';
import { ProjectMilestone } from '@/lib/api/projectProgress';
import { formatProjectBadge, getProjectNumberingSettings, ProjectNumberingSettings } from '@/lib/api/projectSetup';
import { SwiftUIAddMilestoneSheet } from '@/components/projects/SwiftUIAddMilestoneSheet';
import { CalendarMonthView } from '@/components/clock/setup/CalendarMonthView';
import { CalendarEventItem } from '@/lib/data/calendarEvents';
import ContextMenu from '@/components/ui/PlatformContextMenu';
import Svg, { Path, Polygon } from 'react-native-svg';

type ViewMode = 'list' | 'timeline' | 'calendar';
type MilestoneFilter = 'all' | 'upcoming' | 'in_progress' | 'completed';

interface TimelineDay {
    dateStr: string; // YYYY-MM-DD
    dayNum: number;  // 1..31
    dayName: string; // M, T, W, T, F, S, S
    isToday: boolean;
    isWeekend: boolean;
    monthName: string;
}

const GANTT_DAY_WIDTH = 40;
const GANTT_ROW_HEIGHT = 50;

export default function ProjectMilestonesScreen() {
    const { id } = useLocalSearchParams();
    const projectId = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : '';

    const insets = useSafeAreaInsets();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#8E8E93';
    const formaBlue = isDark ? '#3B82F6' : '#0036F8';
    const cardBgColor = isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF';
    const dividerColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

    const [project, setProject] = useState<Project | null>(null);
    const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
    const [numberingSettings, setNumberingSettings] = useState<ProjectNumberingSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // View Modes & Filters
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [statusFilter, setStatusFilter] = useState<MilestoneFilter>('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Calendar custom selection state (defaults to today)
    const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);
    const [calendarYear, setCalendarYear] = useState<number>(new Date().getFullYear());
    const [calendarMonth, setCalendarMonth] = useState<number>(new Date().getMonth());

    // Modal Sheet states
    const [isAddMilestoneVisible, setIsAddMilestoneVisible] = useState(false);
    const [editingMilestone, setEditingMilestone] = useState<ProjectMilestone | null>(null);

    // Gantt Horizontal Scroll Ref for scrolling to milestone on tap
    const ganttScrollRef = useRef<ScrollView>(null);

    // Dynamic Card Layouts for List View Dependency Arrow Lines
    const [cardLayouts, setCardLayouts] = useState<Record<string, { x: number; y: number; width: number; height: number }>>({});

    const handleCardLayout = (cardId: string, e: LayoutChangeEvent) => {
        const { x, y, width, height } = e.nativeEvent.layout;
        setCardLayouts(prev => {
            const existing = prev[cardId];
            if (existing && existing.x === x && existing.y === y && existing.width === width && existing.height === height) {
                return prev;
            }
            return { ...prev, [cardId]: { x, y, width, height } };
        });
    };

    const fetchProjectData = useCallback(async (silent = false) => {
        if (!projectId) return;
        if (!silent) {
            setIsLoading(true);
        }
        try {
            const [proj, numbering] = await Promise.all([
                getProjectById(projectId),
                getProjectNumberingSettings(),
            ]);
            setProject(proj);
            setNumberingSettings(numbering);
            if (proj?.meta?.milestones && Array.isArray(proj.meta.milestones)) {
                setMilestones(proj.meta.milestones);
            } else {
                setMilestones([]);
            }
        } catch (error) {
            console.error('Error fetching project milestones:', error);
        } finally {
            setIsLoading(false);
        }
    }, [projectId]);

    useFocusEffect(
        useCallback(() => {
            fetchProjectData(true);
        }, [fetchProjectData])
    );

    const saveMilestonesToDb = async (updatedList: ProjectMilestone[]) => {
        if (!projectId || !project) return;
        try {
            setMilestones(updatedList);
            const nextMeta = {
                ...(project.meta || {}),
                milestones: updatedList,
            };
            await saveProjectMeta(projectId, nextMeta);
            setProject(prev => prev ? { ...prev, meta: nextMeta } : null);
        } catch (error) {
            console.error('Error updating milestone:', error);
            Alert.alert('Error', 'Failed to update milestone status.');
        }
    };

    // Cycle Status on Icon Tap: upcoming -> in_progress -> completed -> upcoming
    const handleCycleMilestoneStatus = (milestoneId: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const nextStatusMap: Record<string, 'upcoming' | 'in_progress' | 'completed'> = {
            upcoming: 'in_progress',
            in_progress: 'completed',
            completed: 'upcoming',
        };

        const updated = milestones.map(m => {
            if (m.id === milestoneId) {
                return { ...m, status: nextStatusMap[m.status] || 'upcoming' };
            }
            return m;
        });

        saveMilestonesToDb(updated);
    };

    // Delete single milestone with confirmation
    const handleDeleteMilestone = (milestoneId: string) => {
        Alert.alert(
            'Delete Milestone',
            'Are you sure you want to delete this milestone?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        const updated = milestones.filter(m => m.id !== milestoneId);
                        saveMilestonesToDb(updated);
                    }
                }
            ]
        );
    };

    // Robust helper to parse various date formats (ISO, "30 Nov 2026", DD/MM/YYYY, etc.)
    const parseAnyDate = (raw?: string | null | number | Date): Date | null => {
        if (!raw) return null;
        if (raw instanceof Date) return isNaN(raw.getTime()) ? null : raw;
        if (typeof raw === 'number') {
            const d = new Date(raw);
            return isNaN(d.getTime()) ? null : d;
        }
        const str = String(raw).trim();
        if (!str) return null;

        // Check YYYY-MM-DD
        const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
        if (isoMatch) {
            const d = new Date(parseInt(isoMatch[1], 10), parseInt(isoMatch[2], 10) - 1, parseInt(isoMatch[3], 10));
            return isNaN(d.getTime()) ? null : d;
        }

        // Check DD Mon YYYY / DD Month YYYY (e.g. "30 Nov 2026", "15 November 2026")
        const dmyMatch = str.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
        if (dmyMatch) {
            const day = parseInt(dmyMatch[1], 10);
            const monthStr = dmyMatch[2].toLowerCase().slice(0, 3);
            const year = parseInt(dmyMatch[3], 10);
            const MONTHS: Record<string, number> = {
                jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
                jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
            };
            if (MONTHS[monthStr] !== undefined) {
                const d = new Date(year, MONTHS[monthStr], day);
                return isNaN(d.getTime()) ? null : d;
            }
        }

        // Check DD/MM/YYYY
        const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (slashMatch) {
            const d = new Date(parseInt(slashMatch[3], 10), parseInt(slashMatch[2], 10) - 1, parseInt(slashMatch[1], 10));
            return isNaN(d.getTime()) ? null : d;
        }

        const direct = new Date(str);
        if (!isNaN(direct.getTime())) return direct;

        return null;
    };

    // Helper to normalize date string to YYYY-MM-DD
    const normalizeDate = (raw?: string | null): string => {
        const d = parseAnyDate(raw);
        if (!d) return '';
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    // Helper to format display date (e.g. 20 Sep 2026)
    const formatDisplayDate = (dateStr?: string | null) => {
        const parsed = parseAnyDate(dateStr);
        if (!parsed) return dateStr || '';
        return parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    // Filtered & sorted milestones: Sorted by earliest date first (tercepat -> terlama)
    const filteredMilestones = useMemo(() => {
        const filtered = milestones.filter(m => {
            if (statusFilter !== 'all' && m.status !== statusFilter) return false;
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchTitle = m.title.toLowerCase().includes(q);
                const matchDesc = m.description?.toLowerCase().includes(q);
                if (!matchTitle && !matchDesc) return false;
            }
            return true;
        });

        return filtered.sort((a, b) => {
            const dateA = parseAnyDate(a.targetDate);
            const dateB = parseAnyDate(b.targetDate);
            const timeA = dateA ? dateA.getTime() : Infinity;
            const timeB = dateB ? dateB.getTime() : Infinity;
            if (timeA !== timeB) return timeA - timeB;
            return (a.title || '').localeCompare(b.title || '');
        });
    }, [milestones, statusFilter, searchQuery]);

    const todayStr = useMemo(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }, []);

    // Calendar events mapping with status-based dot indicator colors (green = completed, blue = in_progress, gray = upcoming)
    const calendarEvents: CalendarEventItem[] = useMemo(() => {
        return milestones
            .filter(m => !!m.targetDate)
            .map(m => {
                const dateKey = normalizeDate(m.targetDate);
                const dotColor = m.status === 'completed'
                    ? '#34C759'
                    : m.status === 'in_progress'
                    ? formaBlue
                    : '#8E8E93';

                return {
                    id: m.id,
                    title: m.title,
                    date: dateKey,
                    type: 'company_special',
                    color: dotColor,
                    source: 'forma',
                    description: m.description,
                };
            });
    }, [milestones, formaBlue]);

    // Milestones due Today
    const todayMilestones = useMemo(() => {
        return filteredMilestones.filter(m => normalizeDate(m.targetDate) === todayStr);
    }, [filteredMilestones, todayStr]);

    // Milestones on specifically selected custom date
    const selectedDateMilestones = useMemo(() => {
        if (!selectedCalendarDate) return [];
        return filteredMilestones.filter(m => normalizeDate(m.targetDate) === selectedCalendarDate);
    }, [filteredMilestones, selectedCalendarDate]);

    // Nearest / Upcoming milestone suggestions (uncompleted, sorted by nearest date, max 5)
    const nearestMilestones = useMemo(() => {
        return filteredMilestones
            .filter(m => m.status !== 'completed')
            .slice(0, 5);
    }, [filteredMilestones]);

    // Gantt timeline data calculations
    const ganttData = useMemo(() => {
        const now = new Date();
        let minTs = now.getTime() - 5 * 86400000;
        let maxTs = now.getTime() + 45 * 86400000;

        const validDates = filteredMilestones
            .map(m => m.targetDate ? parseAnyDate(m.targetDate)?.getTime() : NaN)
            .filter((t): t is number => typeof t === 'number' && !isNaN(t));

        if (validDates.length > 0) {
            minTs = Math.min(...validDates, now.getTime()) - 4 * 86400000;
            maxTs = Math.max(...validDates, now.getTime()) + 10 * 86400000;
        }

        const start = new Date(minTs);
        start.setHours(0, 0, 0, 0);
        const end = new Date(maxTs);
        end.setHours(0, 0, 0, 0);

        const days: TimelineDay[] = [];
        const DAY_NAMES = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
        const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        const cur = new Date(start);
        while (cur <= end) {
            const dStr = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
            days.push({
                dateStr: dStr,
                dayNum: cur.getDate(),
                dayName: DAY_NAMES[cur.getDay()],
                isToday: dStr === todayStr,
                isWeekend: cur.getDay() === 0 || cur.getDay() === 6,
                monthName: `${MONTH_NAMES[cur.getMonth()]} ${cur.getFullYear()}`,
            });
            cur.setDate(cur.getDate() + 1);
        }

        // Group into week/month segments for header
        const weekSegments: Array<{ label: string; width: number; startIdx: number }> = [];
        let curMonth = '';
        let curCount = 0;
        let curStart = 0;

        days.forEach((d, i) => {
            if (d.monthName !== curMonth) {
                if (curMonth !== '') {
                    weekSegments.push({ label: curMonth, width: curCount * GANTT_DAY_WIDTH, startIdx: curStart });
                }
                curMonth = d.monthName;
                curCount = 1;
                curStart = i;
            } else {
                curCount++;
            }
        });
        if (curCount > 0) {
            weekSegments.push({ label: curMonth, width: curCount * GANTT_DAY_WIDTH, startIdx: curStart });
        }

        return { days, weekSegments };
    }, [filteredMilestones, todayStr]);

    const getGanttDiamondPosition = useCallback((m: ProjectMilestone, index: number) => {
        const { days } = ganttData;
        let targetIdx = -1;

        if (m.targetDate) {
            const norm = normalizeDate(m.targetDate);
            targetIdx = days.findIndex(d => d.dateStr === norm);
        }

        if (targetIdx === -1) {
            targetIdx = Math.min(days.length - 1, index * 4 + 4);
        }

        const centerColLeft = targetIdx * GANTT_DAY_WIDTH + GANTT_DAY_WIDTH / 2;
        const left = targetIdx * GANTT_DAY_WIDTH + (GANTT_DAY_WIDTH - 18) / 2;

        return { left, targetIdx, centerColLeft };
    }, [ganttData]);

    const scrollToMilestoneInGantt = useCallback((m: ProjectMilestone, index: number) => {
        Haptics.selectionAsync();
        const { left } = getGanttDiamondPosition(m, index);
        ganttScrollRef.current?.scrollTo({ x: Math.max(0, left - 60), animated: true });
    }, [getGanttDiamondPosition]);

    // Predecessor dependency arrow paths and arrowheads for Gantt
    const dependencyArrows = useMemo(() => {
        const arrows: Array<{ pathD: string; polygonPoints: string; color: string }> = [];
        const arrowColor = isDark ? '#3B82F6' : '#0036F8';

        filteredMilestones.forEach((m, curIdx) => {
            if (!m.predecessorId) return;
            const predIdx = filteredMilestones.findIndex(x => x.id === m.predecessorId);
            if (predIdx === -1) return;

            const predM = filteredMilestones[predIdx];
            const curPos = getGanttDiamondPosition(m, curIdx);
            const predPos = getGanttDiamondPosition(predM, predIdx);

            const x1 = predPos.centerColLeft + 10;
            const y1 = predIdx * GANTT_ROW_HEIGHT + GANTT_ROW_HEIGHT / 2;

            const x2 = curPos.centerColLeft - 10;
            const y2 = curIdx * GANTT_ROW_HEIGHT + GANTT_ROW_HEIGHT / 2;

            let pathD = '';
            if (y1 === y2) {
                pathD = `M ${x1} ${y1} L ${x2 - 5} ${y2}`;
            } else if (x2 > x1 + 14) {
                const xMid = Math.min(x1 + 14, (x1 + x2) / 2);
                pathD = `M ${x1} ${y1} L ${xMid} ${y1} L ${xMid} ${y2} L ${x2 - 5} ${y2}`;
            } else {
                const xMid1 = x1 + 10;
                const yMid = (y1 + y2) / 2;
                const xMid2 = Math.min(x2 - 14, x1 - 10);
                pathD = `M ${x1} ${y1} L ${xMid1} ${y1} L ${xMid1} ${yMid} L ${xMid2} ${yMid} L ${xMid2} ${y2} L ${x2 - 5} ${y2}`;
            }

            const polygonPoints = `${x2},${y2} ${x2 - 6},${y2 - 3.5} ${x2 - 6},${y2 + 3.5}`;
            arrows.push({ pathD, polygonPoints, color: arrowColor });
        });

        return arrows;
    }, [filteredMilestones, ganttData, isDark, getGanttDiamondPosition]);

    // Automatic Critical Point / Critical Path Calculation
    // Traces all dependency chains (predecessor relationships) and finds the path with the most milestones & longest duration
    const { criticalPath, hasCriticalPathDateWarning } = useMemo(() => {
        if (filteredMilestones.length === 0) return { criticalPath: [] as ProjectMilestone[], hasCriticalPathDateWarning: false };

        const milestoneMap = new Map<string, ProjectMilestone>();
        filteredMilestones.forEach(m => milestoneMap.set(m.id, m));

        // Build adjacency: predecessorId -> list of dependent milestone IDs
        const dependentsMap = new Map<string, string[]>();
        filteredMilestones.forEach(m => {
            if (m.predecessorId && milestoneMap.has(m.predecessorId)) {
                const list = dependentsMap.get(m.predecessorId) || [];
                list.push(m.id);
                dependentsMap.set(m.predecessorId, list);
            }
        });

        // Find root nodes (milestones that have NO predecessor among filteredMilestones)
        const rootNodes = filteredMilestones.filter(m => !m.predecessorId || !milestoneMap.has(m.predecessorId));

        const allPaths: ProjectMilestone[][] = [];

        const dfs = (currentId: string, visited: Set<string>, currentPath: ProjectMilestone[]) => {
            const currentM = milestoneMap.get(currentId);
            if (!currentM) return;

            const nextPath = [...currentPath, currentM];
            const nextVisited = new Set(visited);
            nextVisited.add(currentId);

            const children = (dependentsMap.get(currentId) || []).filter(id => !nextVisited.has(id));

            if (children.length === 0) {
                allPaths.push(nextPath);
            } else {
                children.forEach(childId => {
                    dfs(childId, nextVisited, nextPath);
                });
            }
        };

        rootNodes.forEach(root => {
            dfs(root.id, new Set(), []);
        });

        let chosenPath = allPaths[0] || filteredMilestones;

        if (allPaths.length > 1) {
            allPaths.sort((a, b) => {
                if (b.length !== a.length) {
                    return b.length - a.length;
                }
                const dateAStart = parseAnyDate(a[0]?.targetDate)?.getTime() || 0;
                const dateAEnd = parseAnyDate(a[a.length - 1]?.targetDate)?.getTime() || 0;
                const spanA = Math.abs(dateAEnd - dateAStart);

                const dateBStart = parseAnyDate(b[0]?.targetDate)?.getTime() || 0;
                const dateBEnd = parseAnyDate(b[b.length - 1]?.targetDate)?.getTime() || 0;
                const spanB = Math.abs(dateBEnd - dateBStart);

                return spanB - spanA;
            });
            chosenPath = allPaths[0];
        }

        // Check if any milestone has a target date preceding its predecessor
        let hasWarning = false;
        for (let i = 1; i < chosenPath.length; i++) {
            const prevD = parseAnyDate(chosenPath[i - 1]?.targetDate)?.getTime();
            const currD = parseAnyDate(chosenPath[i]?.targetDate)?.getTime();
            if (prevD && currD && currD < prevD) {
                hasWarning = true;
                break;
            }
        }

        return { criticalPath: chosenPath, hasCriticalPathDateWarning: hasWarning };
    }, [filteredMilestones]);

    // Dynamic Card-to-Card SVG Dependency Arrow overlay for List View (staggered lanes to prevent overlapping)
    const listDependencyArrows = useMemo(() => {
        const arrows: Array<{ pathD: string; polygonPoints: string; color: string }> = [];
        const arrowColor = isDark ? '#3B82F6' : '#0036F8';

        const pairs: Array<{ predId: string; curId: string; m: ProjectMilestone }> = [];
        filteredMilestones.forEach(m => {
            if (m.predecessorId) {
                const predM = filteredMilestones.find(x => x.id === m.predecessorId);
                if (predM) pairs.push({ predId: predM.id, curId: m.id, m });
            }
        });

        pairs.forEach((pair, pairIdx) => {
            const predLayout = cardLayouts[pair.predId];
            const curLayout = cardLayouts[pair.curId];
            if (!predLayout || !curLayout) return;

            // Route along the right edge gutter of the cards with lane staggering
            const xStart = predLayout.x + predLayout.width;
            const yStart = predLayout.y + predLayout.height / 2;

            const xEnd = curLayout.x + curLayout.width;
            const yEnd = curLayout.y + curLayout.height / 2;

            // Stagger each arrow by 6px so lines never overlap
            const xMid = Math.max(xStart, xEnd) + 7 + pairIdx * 6;

            let pathD = '';
            if (Math.abs(yStart - yEnd) < 4) {
                pathD = `M ${xStart} ${yStart} L ${xEnd + 4} ${yEnd}`;
            } else {
                pathD = `M ${xStart} ${yStart} L ${xMid} ${yStart} L ${xMid} ${yEnd} L ${xEnd + 5} ${yEnd}`;
            }

            // Arrowhead polygon pointing LEFT directly into target card's right edge
            const polygonPoints = `${xEnd},${yEnd} ${xEnd + 6},${yEnd - 3.5} ${xEnd + 6},${yEnd + 3.5}`;
            arrows.push({ pathD, polygonPoints, color: arrowColor });
        });

        return arrows;
    }, [filteredMilestones, cardLayouts, isDark]);

    // Header title with project badge format "001-ABC: Milestones"
    const headerTitle = useMemo(() => {
        if (!project) return 'Milestones';
        const badge = formatProjectBadge(project, numberingSettings);
        return badge ? `${badge}: Milestones` : `${project.title || 'Project'}: Milestones`;
    }, [project, numberingSettings]);

    const headerActions: HeaderToolbarAction[] = [
        {
            id: 'add',
            label: 'Add Milestone',
            icon: 'add',
            onPress: () => {
                setEditingMilestone(null);
                setIsAddMilestoneVisible(true);
            },
            isPrimary: true,
        },
    ];

    const milestoneContextMenuActions = [
        { title: 'Edit Milestone', systemIcon: 'pencil' },
        { title: 'Delete Milestone', systemIcon: 'trash', destructive: true },
    ];

    // Render Milestone Card Component (List Mode & Calendar Mode)
    const renderMilestoneCard = (m: ProjectMilestone, index: number, isCalendarView = false) => {
        const isDone = m.status === 'completed';
        const isInProgress = m.status === 'in_progress';
        const statusColor = isDone ? '#34C759' : isInProgress ? formaBlue : subtextColor;
        const predM = m.predecessorId ? milestones.find(x => x.id === m.predecessorId) : null;

        return (
            <View
                key={m.id || index}
                onLayout={!isCalendarView ? (e) => handleCardLayout(m.id, e) : undefined}
                style={isCalendarView ? styles.calendarCardWrapper : styles.milestoneCardWrapper}
            >
                <ContextMenu
                    actions={milestoneContextMenuActions}
                    onPress={(e) => {
                        const { index: actionIndex } = e.nativeEvent;
                        if (actionIndex === 0) {
                            Haptics.selectionAsync();
                            setEditingMilestone(m);
                            setIsAddMilestoneVisible(true);
                        } else if (actionIndex === 1) {
                            handleDeleteMilestone(m.id);
                        }
                    }}
                >
                    <GlassView
                        intensity={isDark ? 10 : 25}
                        style={[
                            styles.milestoneCard,
                            { backgroundColor: cardBgColor },
                        ]}
                    >
                        {/* Status Circle Button */}
                        <TouchableOpacity
                            onPress={() => handleCycleMilestoneStatus(m.id)}
                            style={styles.milestoneStatusTouch}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Ionicons
                                name={isDone ? 'checkmark-circle' : isInProgress ? 'play-circle' : 'ellipse-outline'}
                                size={20}
                                color={statusColor}
                            />
                        </TouchableOpacity>

                        {/* Main Content Area - Tap to Edit */}
                        <TouchableOpacity
                            activeOpacity={0.75}
                            onPress={() => {
                                Haptics.selectionAsync();
                                setEditingMilestone(m);
                                setIsAddMilestoneVisible(true);
                            }}
                            style={styles.milestoneContentCol}
                        >
                            {/* Title on Left, Status Badge Full Pill on Top-Right */}
                            <View style={styles.milestoneTitleRow}>
                                <Text
                                    numberOfLines={2}
                                    style={[
                                        styles.milestoneTitle,
                                        { color: textColor },
                                        isDone && styles.strikethroughText
                                    ]}
                                >
                                    {m.title}
                                </Text>

                                <View style={[
                                    styles.statusBadge,
                                    { backgroundColor: isDone ? 'rgba(52, 199, 89, 0.12)' : isInProgress ? 'rgba(0, 54, 248, 0.12)' : 'rgba(142, 142, 147, 0.12)' }
                                ]}>
                                    <Text style={[
                                        styles.statusBadgeText,
                                        { color: statusColor }
                                    ]}>
                                        {isDone ? 'Completed' : isInProgress ? 'In Progress' : 'Upcoming'}
                                    </Text>
                                </View>
                            </View>

                            {/* Subtitle / Description */}
                            {m.description ? (
                                <Text style={[styles.milestoneDesc, { color: subtextColor }]}>
                                    {m.description}
                                </Text>
                            ) : null}

                            {/* Predecessor Link Inside Card */}
                            {predM ? (
                                <View style={styles.milestonePredecessorRow}>
                                    <Ionicons
                                        name="return-down-forward"
                                        size={12}
                                        color={isCalendarView ? subtextColor : formaBlue}
                                    />
                                    <Text style={[styles.milestonePredecessorText, { color: subtextColor }]} numberOfLines={1}>
                                        After: <Text style={{ color: textColor, fontWeight: '500' }}>{predM.title}</Text>
                                    </Text>
                                </View>
                            ) : null}

                            {/* Clean Date (No icon, no badge) */}
                            {m.targetDate ? (
                                <Text style={[styles.milestoneCleanDateText, { color: subtextColor }]}>
                                    {formatDisplayDate(m.targetDate)}
                                </Text>
                            ) : null}
                        </TouchableOpacity>
                    </GlassView>
                </ContextMenu>
            </View>
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
                <View style={[styles.loadingContainer, { paddingTop: insets.top + 44 }]}>
                    <ActivityIndicator size="small" color={formaBlue} />
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={[
                        styles.contentContainer,
                        {
                            paddingTop: insets.top + 52,
                            paddingBottom: Math.max(insets.bottom, 24) + 80,
                        }
                    ]}
                    showsVerticalScrollIndicator={false}
                >
                    {/* View Mode 1: List View */}
                    {viewMode === 'list' && (
                        filteredMilestones.length === 0 ? (
                            <GlassView intensity={isDark ? 10 : 25} style={[styles.emptyCard, { backgroundColor: cardBgColor }]}>
                                <PlatformIcon name="flag" size={32} tintColor={subtextColor} />
                                <Text style={[styles.emptyTitle, { color: textColor }]}>No Milestones Found</Text>
                                <Text style={[styles.emptySubtitle, { color: subtextColor }]}>
                                    {searchQuery ? 'No milestones match your search.' : 'Tap + on top right to add your first milestone.'}
                                </Text>
                            </GlassView>
                        ) : (
                            <View style={styles.cardsListContainer}>
                                {/* SVG Card-to-Card Dependency Arrow Lines */}
                                <Svg style={StyleSheet.absoluteFillObject} pointerEvents="none">
                                    {listDependencyArrows.map((arrow, aIdx) => (
                                        <React.Fragment key={`list-dep-${aIdx}`}>
                                            <Path
                                                d={arrow.pathD}
                                                stroke={arrow.color}
                                                strokeWidth={1.5}
                                                fill="none"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />
                                            <Polygon
                                                points={arrow.polygonPoints}
                                                fill={arrow.color}
                                            />
                                        </React.Fragment>
                                    ))}
                                </Svg>

                                <View style={styles.cardsList}>
                                    {filteredMilestones.map((m, idx) => renderMilestoneCard(m, idx))}
                                </View>
                            </View>
                        )
                    )}

                    {/* View Mode 2: Interactive Gantt Timeline with Diamond Markers */}
                    {viewMode === 'timeline' && (
                        filteredMilestones.length === 0 ? (
                            <GlassView intensity={isDark ? 10 : 25} style={[styles.emptyCard, { backgroundColor: cardBgColor }]}>
                                <PlatformIcon name="flag" size={32} tintColor={subtextColor} />
                                <Text style={[styles.emptyTitle, { color: textColor }]}>No Milestones Found</Text>
                                <Text style={[styles.emptySubtitle, { color: subtextColor }]}>
                                    {searchQuery ? 'No milestones match your search.' : 'Tap + on top right to add your first milestone.'}
                                </Text>
                            </GlassView>
                        ) : (
                            <>
                                <GlassView intensity={isDark ? 10 : 25} style={[styles.ganttContainerCard, { backgroundColor: cardBgColor }]}>
                                <View style={styles.ganttLayoutRow}>
                                    {/* Left Pinned Column: Milestone Names */}
                                    <View style={[styles.ganttPinnedCol, { borderRightColor: dividerColor }]}>
                                        <View style={[styles.ganttPinnedHeader, { borderBottomColor: dividerColor }]}>
                                            <Text style={[styles.ganttPinnedHeaderText, { color: subtextColor }]}>
                                                Milestones ({filteredMilestones.length})
                                            </Text>
                                        </View>

                                        {filteredMilestones.map((m, idx) => {
                                            const isDone = m.status === 'completed';
                                            const isInProgress = m.status === 'in_progress';
                                            const dotColor = isDone ? '#34C759' : isInProgress ? formaBlue : subtextColor;
                                            const isLast = idx === filteredMilestones.length - 1;

                                            return (
                                                <TouchableOpacity
                                                    key={m.id || idx}
                                                    onPress={() => scrollToMilestoneInGantt(m, idx)}
                                                    activeOpacity={0.75}
                                                    style={[
                                                        styles.ganttPinnedRow,
                                                        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: dividerColor }
                                                    ]}
                                                >
                                                    <Ionicons
                                                        name={isDone ? 'checkmark-circle' : isInProgress ? 'play-circle' : 'flag'}
                                                        size={16}
                                                        color={dotColor}
                                                        style={{ marginRight: 8 }}
                                                    />
                                                    <Text
                                                        numberOfLines={2}
                                                        style={[
                                                            styles.ganttPinnedRowText,
                                                            { color: textColor },
                                                            isDone && styles.strikethroughText
                                                        ]}
                                                    >
                                                        {m.title}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>

                                    {/* Right Horizontally Scrollable Timeline Grid & Diamond Markers */}
                                    <ScrollView
                                        ref={ganttScrollRef}
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        contentContainerStyle={{ minWidth: ganttData.days.length * GANTT_DAY_WIDTH }}
                                    >
                                        <View style={{ width: ganttData.days.length * GANTT_DAY_WIDTH }}>
                                            {/* Header Row 1: Month/Week Segments */}
                                            <View style={[styles.ganttTimelineMonthRow, { borderBottomColor: dividerColor }]}>
                                                {ganttData.weekSegments.map((seg, sIdx) => (
                                                    <View
                                                        key={seg.label + sIdx}
                                                        style={[
                                                            styles.ganttMonthSegment,
                                                            { width: seg.width, borderRightColor: dividerColor }
                                                        ]}
                                                    >
                                                        <Text style={[styles.ganttMonthSegmentText, { color: textColor }]}>
                                                            {seg.label}
                                                        </Text>
                                                    </View>
                                                ))}
                                            </View>

                                            {/* Header Row 2: Day Numbers */}
                                            <View style={[styles.ganttTimelineDaysRow, { borderBottomColor: dividerColor }]}>
                                                {ganttData.days.map((day, dIdx) => (
                                                    <View key={day.dateStr} style={[styles.ganttDayNumCell, { width: GANTT_DAY_WIDTH }]}>
                                                        {day.isToday ? (
                                                            <View style={[styles.ganttTodayBadge, { backgroundColor: '#007AFF' }]}>
                                                                <Text style={styles.ganttTodayBadgeText}>{day.dayNum}</Text>
                                                            </View>
                                                        ) : (
                                                            <Text style={[
                                                                styles.ganttDayNumLabel,
                                                                { color: day.isWeekend ? subtextColor : textColor }
                                                            ]}>
                                                                {day.dayNum}
                                                            </Text>
                                                        )}
                                                    </View>
                                                ))}
                                            </View>

                                            {/* Grid Columns & Today Vertical Line */}
                                            <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
                                                <View style={{ flexDirection: 'row', height: '100%', paddingTop: 54 }}>
                                                    {ganttData.days.map((day, dIdx) => (
                                                        <View
                                                            key={day.dateStr}
                                                            style={[
                                                                styles.ganttGridVerticalCol,
                                                                { width: GANTT_DAY_WIDTH, borderRightColor: dividerColor },
                                                                day.isWeekend && { backgroundColor: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.015)' }
                                                            ]}
                                                        >
                                                            {day.isToday && (
                                                                <View style={styles.ganttVerticalTodayBar} />
                                                            )}
                                                        </View>
                                                    ))}
                                                </View>
                                            </View>

                                            {/* Milestone Gantt Diamond Rows */}
                                            <View style={styles.ganttRowsBody}>
                                                {/* SVG Predecessor Dependency Arrows Overlay */}
                                                <Svg
                                                    style={StyleSheet.absoluteFillObject}
                                                    width={ganttData.days.length * GANTT_DAY_WIDTH}
                                                    height={filteredMilestones.length * GANTT_ROW_HEIGHT}
                                                    pointerEvents="none"
                                                >
                                                    {dependencyArrows.map((arrow, aIdx) => (
                                                        <React.Fragment key={`dep-${aIdx}`}>
                                                            <Path
                                                                d={arrow.pathD}
                                                                stroke={arrow.color}
                                                                strokeWidth={1.5}
                                                                fill="none"
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                            />
                                                            <Polygon
                                                                points={arrow.polygonPoints}
                                                                fill={arrow.color}
                                                            />
                                                        </React.Fragment>
                                                    ))}
                                                </Svg>

                                                {filteredMilestones.map((m, idx) => {
                                                    const isDone = m.status === 'completed';
                                                    const isInProgress = m.status === 'in_progress';
                                                    const diamondColor = isDone ? '#34C759' : isInProgress ? formaBlue : subtextColor;
                                                    const { left } = getGanttDiamondPosition(m, idx);
                                                    const isLast = idx === filteredMilestones.length - 1;

                                                    return (
                                                        <View
                                                            key={m.id || idx}
                                                            style={[
                                                                styles.ganttTimelineTrackRow,
                                                                !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: dividerColor }
                                                            ]}
                                                        >
                                                            {/* Diamond Marker Component (Clean solid color) */}
                                                            <TouchableOpacity
                                                                onPress={() => scrollToMilestoneInGantt(m, idx)}
                                                                activeOpacity={0.8}
                                                                style={[
                                                                    styles.ganttDiamondTouchGroup,
                                                                    { transform: [{ translateX: left }] }
                                                                ]}
                                                            >
                                                                <View style={[styles.ganttDiamondShape, { backgroundColor: diamondColor }]} />

                                                                {/* Attached Date Tag Label */}
                                                                <View style={[styles.ganttDiamondTag, { backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}>
                                                                    <Text style={[styles.ganttDiamondTagText, { color: textColor }]}>
                                                                        {m.targetDate ? formatDisplayDate(m.targetDate) : m.title}
                                                                    </Text>
                                                                </View>
                                                            </TouchableOpacity>
                                                        </View>
                                                    );
                                                })}
                                            </View>
                                        </View>
                                    </ScrollView>
                                </View>
                            </GlassView>

                            {/* Critical Point / Critical Path Section Card */}
                            {criticalPath.length > 0 && (
                                <GlassView
                                    intensity={isDark ? 10 : 25}
                                    style={[
                                        styles.criticalPathCard,
                                        { backgroundColor: cardBgColor, borderColor: dividerColor }
                                    ]}
                                >
                                    <View style={styles.criticalPathHeaderRow}>
                                        <View style={styles.criticalPathTitleGroup}>
                                            <Ionicons name="git-network-outline" size={17} color={formaBlue} />
                                            <Text style={[styles.criticalPathTitle, { color: textColor }]}>
                                                Critical Point
                                            </Text>
                                        </View>
                                        <View style={[styles.criticalPathBadge, { backgroundColor: isDark ? 'rgba(0, 54, 248, 0.15)' : 'rgba(0, 54, 248, 0.08)' }]}>
                                            <Text style={[styles.criticalPathBadgeText, { color: formaBlue }]}>
                                                {criticalPath.length} {criticalPath.length === 1 ? 'Milestone' : 'Milestones'}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.criticalPathTextFlow}>
                                        {criticalPath.map((m, cIdx) => {
                                            const isLast = cIdx === criticalPath.length - 1;
                                            const fullIndex = filteredMilestones.findIndex(x => x.id === m.id);

                                            return (
                                                <React.Fragment key={`crit-${m.id || cIdx}`}>
                                                    <TouchableOpacity
                                                        activeOpacity={0.7}
                                                        onPress={() => {
                                                            if (fullIndex !== -1) {
                                                                scrollToMilestoneInGantt(m, fullIndex);
                                                            }
                                                        }}
                                                        style={[
                                                            styles.criticalPathTextStep,
                                                            { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.035)' }
                                                        ]}
                                                    >
                                                        <Text style={[styles.criticalPathStepTitle, { color: textColor }]}>
                                                            {m.title}
                                                        </Text>
                                                        {m.targetDate ? (
                                                            <Text style={[styles.criticalPathStepDate, { color: subtextColor }]}>
                                                                {formatDisplayDate(m.targetDate)}
                                                            </Text>
                                                        ) : null}
                                                    </TouchableOpacity>

                                                    {!isLast && (
                                                        <Ionicons
                                                            name="arrow-forward"
                                                            size={13}
                                                            color={subtextColor}
                                                            style={styles.criticalPathChevron}
                                                        />
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
                                    </View>

                                    {hasCriticalPathDateWarning && (
                                        <View style={styles.criticalPathWarningRow}>
                                            <Ionicons name="alert-circle-outline" size={13} color="#FF9500" />
                                            <Text style={[styles.criticalPathWarningText, { color: isDark ? '#FFA726' : '#D97706' }]}>
                                                Milestone dates conflict with predecessor sequence.
                                            </Text>
                                        </View>
                                    )}
                                </GlassView>
                            )}
                        </>
                    ))}

                    {/* View Mode 3: Calendar View */}
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

                            {/* Custom Date Selected Mode */}
                            {selectedCalendarDate && selectedCalendarDate !== todayStr ? (
                                <>
                                    {/* Section: Milestones on Selected Date */}
                                    <View style={styles.calendarMilestoneHeader}>
                                        <Text style={[styles.calendarMilestoneHeaderText, { color: textColor }]}>
                                            Milestones on {formatDisplayDate(selectedCalendarDate)}
                                        </Text>
                                        <TouchableOpacity
                                            onPress={() => setSelectedCalendarDate(todayStr)}
                                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                        >
                                            <Text style={{ fontSize: 13, color: formaBlue, fontWeight: '600' }}>Reset to Today</Text>
                                        </TouchableOpacity>
                                    </View>

                                    {selectedDateMilestones.length === 0 ? (
                                        <GlassView intensity={isDark ? 10 : 25} style={[styles.emptyCard, { backgroundColor: cardBgColor }]}>
                                            <PlatformIcon name="calendar" size={32} tintColor={subtextColor} />
                                            <Text style={[styles.emptyTitle, { color: textColor }]}>No Milestones</Text>
                                            <Text style={[styles.emptySubtitle, { color: subtextColor }]}>
                                                No milestones scheduled on {formatDisplayDate(selectedCalendarDate)}.
                                            </Text>
                                        </GlassView>
                                    ) : (
                                        <View style={styles.cardsList}>
                                            {selectedDateMilestones.map((m, idx) => renderMilestoneCard(m, idx, true))}
                                        </View>
                                    )}

                                    {/* Section: Nearest Milestones (Max 5, only shown if available) */}
                                    {nearestMilestones.length > 0 && (
                                        <>
                                            <View style={[styles.calendarMilestoneHeader, { marginTop: 12 }]}>
                                                <Text style={[styles.calendarMilestoneHeaderText, { color: textColor }]}>
                                                    Nearest Milestones
                                                </Text>
                                                <TouchableOpacity
                                                    onPress={() => setSelectedCalendarDate(null)}
                                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                                >
                                                    <Text style={{ fontSize: 13, color: formaBlue, fontWeight: '600' }}>Show All</Text>
                                                </TouchableOpacity>
                                            </View>
                                            <View style={styles.cardsList}>
                                                {nearestMilestones.map((m, idx) => renderMilestoneCard(m, idx, true))}
                                            </View>
                                        </>
                                    )}
                                </>
                            ) : (
                                /* Default / Today Mode */
                                <>
                                    {/* Section 1: Today */}
                                    <View style={styles.calendarMilestoneHeader}>
                                        <Text style={[styles.calendarMilestoneHeaderText, { color: textColor }]}>
                                            Today ({formatDisplayDate(todayStr)})
                                        </Text>
                                    </View>

                                    {todayMilestones.length === 0 ? (
                                        <GlassView intensity={isDark ? 10 : 25} style={[styles.emptyCard, { backgroundColor: cardBgColor }]}>
                                            <PlatformIcon name="calendar" size={32} tintColor={subtextColor} />
                                            <Text style={[styles.emptyTitle, { color: textColor }]}>No Milestones Due Today</Text>
                                            <Text style={[styles.emptySubtitle, { color: subtextColor }]}>
                                                You're all clear today! Review all project milestones below.
                                            </Text>
                                        </GlassView>
                                    ) : (
                                        <View style={styles.cardsList}>
                                            {todayMilestones.map((m, idx) => renderMilestoneCard(m, idx, true))}
                                        </View>
                                    )}

                                    {/* Section 2: All Project Milestones */}
                                    <View style={[styles.calendarMilestoneHeader, { marginTop: 12 }]}>
                                        <Text style={[styles.calendarMilestoneHeaderText, { color: textColor }]}>
                                            All Project Milestones ({filteredMilestones.length})
                                        </Text>
                                    </View>

                                    {filteredMilestones.length === 0 ? (
                                        <GlassView intensity={isDark ? 10 : 25} style={[styles.emptyCard, { backgroundColor: cardBgColor }]}>
                                            <PlatformIcon name="flag" size={32} tintColor={subtextColor} />
                                            <Text style={[styles.emptyTitle, { color: textColor }]}>No Milestones Found</Text>
                                            <Text style={[styles.emptySubtitle, { color: subtextColor }]}>
                                                Tap + on top right to add your first milestone.
                                            </Text>
                                        </GlassView>
                                    ) : (
                                        <View style={styles.cardsList}>
                                            {filteredMilestones.map((m, idx) => renderMilestoneCard(m, idx, true))}
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
                                placeholder="Search milestones..."
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

                    {/* 2. Middle: Status Filter Circle (Native ContextMenu - Ordered from Belum to Sudah) */}
                    <ContextMenu
                        actions={[
                            { title: 'All Milestones', state: statusFilter === 'all' ? 'on' : 'off', systemIcon: 'flag' },
                            { title: 'Completed', state: statusFilter === 'completed' ? 'on' : 'off', systemIcon: 'checkmark.circle' },
                            { title: 'In Progress', state: statusFilter === 'in_progress' ? 'on' : 'off', systemIcon: 'play.circle' },
                            { title: 'Upcoming', state: statusFilter === 'upcoming' ? 'on' : 'off', systemIcon: 'circle' },
                        ]}
                        dropdownMenuMode={true}
                        onPress={(e) => {
                            Haptics.selectionAsync();
                            const options: MilestoneFilter[] = ['all', 'completed', 'in_progress', 'upcoming'];
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

                    {/* 3. Right: View Mode Circle (Native ContextMenu - List, Gantt Timeline, Calendar) */}
                    <ContextMenu
                        actions={[
                            { title: 'Calendar View', state: viewMode === 'calendar' ? 'on' : 'off', systemIcon: 'calendar' },
                            { title: 'Gantt Timeline', state: viewMode === 'timeline' ? 'on' : 'off', systemIcon: 'chart.bar.xaxis' },
                            { title: 'List View', state: viewMode === 'list' ? 'on' : 'off', systemIcon: 'list.bullet' },
                        ]}
                        dropdownMenuMode={true}
                        onPress={(e) => {
                            Haptics.selectionAsync();
                            const modes: ViewMode[] = ['calendar', 'timeline', 'list'];
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
                                name={viewMode === 'list' ? 'list.bullet' : viewMode === 'timeline' ? 'chart.bar.xaxis' : 'calendar'}
                                size={18}
                                tintColor={viewMode !== 'list' ? formaBlue : textColor}
                            />
                        </TouchableOpacity>
                    </ContextMenu>
                </View>
            </KeyboardAvoidingView>

            {/* Add / Edit Milestone Sheet */}
            <SwiftUIAddMilestoneSheet
                isOpened={isAddMilestoneVisible}
                onClose={() => {
                    setIsAddMilestoneVisible(false);
                    setEditingMilestone(null);
                }}
                onSave={fetchProjectData}
                defaultProjectId={projectId}
                milestoneToEdit={editingMilestone}
                existingMilestones={milestones}
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
    cardsListContainer: {
        position: 'relative',
        width: '100%',
    },
    cardsList: {
        gap: 10,
    },
    milestoneCardWrapper: {
        marginRight: 24, // Gutter for SVG dependency loop & arrows
    },
    milestoneCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 10,
        gap: 10,
    },
    milestoneStatusTouch: {
        marginTop: 1,
    },
    milestoneContentCol: {
        flex: 1,
        gap: 3,
    },
    milestoneTitleRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 8,
    },
    milestoneTitle: {
        fontSize: 14,
        fontWeight: '600',
        lineHeight: 18,
        flex: 1,
    },
    strikethroughText: {
        textDecorationLine: 'line-through',
        opacity: 0.6,
    },
    milestoneDesc: {
        fontSize: 12,
        lineHeight: 16,
        marginTop: 1,
    },
    milestonePredecessorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginTop: 1,
    },
    milestonePredecessorText: {
        fontSize: 12,
        lineHeight: 16,
    },
    milestoneCleanDateText: {
        fontSize: 11,
        fontWeight: '500',
        marginTop: 2,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2.5,
        borderRadius: 999, // Full capsule pill
        alignSelf: 'flex-start',
    },
    statusBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.1,
    },
    emptyCard: {
        borderRadius: 20,
        padding: 36,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginTop: 4,
    },
    emptySubtitle: {
        fontSize: 13,
        textAlign: 'center',
        paddingHorizontal: 16,
    },
    // Gantt Table & Timeline styles
    ganttContainerCard: {
        borderRadius: 20,
        overflow: 'hidden',
    },
    ganttLayoutRow: {
        flexDirection: 'row',
    },
    ganttPinnedCol: {
        width: 135,
        borderRightWidth: StyleSheet.hairlineWidth,
        zIndex: 2,
    },
    ganttPinnedHeader: {
        height: 54,
        justifyContent: 'center',
        paddingHorizontal: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    ganttPinnedHeaderText: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    ganttPinnedRow: {
        height: GANTT_ROW_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        gap: 8,
    },
    ganttStatusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    ganttPinnedRowText: {
        fontSize: 12,
        fontWeight: '600',
        flex: 1,
        lineHeight: 16,
    },
    ganttTimelineMonthRow: {
        height: 26,
        flexDirection: 'row',
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    ganttMonthSegment: {
        justifyContent: 'center',
        paddingHorizontal: 8,
        borderRightWidth: StyleSheet.hairlineWidth,
    },
    ganttMonthSegmentText: {
        fontSize: 11,
        fontWeight: '700',
    },
    ganttTimelineDaysRow: {
        height: 28,
        flexDirection: 'row',
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    ganttDayNumCell: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    ganttDayNumLabel: {
        fontSize: 11,
        fontWeight: '600',
    },
    ganttTodayBadge: {
        width: 22,
        height: 22,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
    },
    ganttTodayBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    ganttGridVerticalCol: {
        borderRightWidth: StyleSheet.hairlineWidth,
        alignItems: 'center',
    },
    ganttVerticalTodayBar: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 2,
        backgroundColor: '#007AFF',
        zIndex: 5,
    },
    ganttRowsBody: {
        zIndex: 2,
    },
    ganttTimelineTrackRow: {
        height: GANTT_ROW_HEIGHT,
        justifyContent: 'center',
    },
    ganttDependencyLine: {
        position: 'absolute',
        top: GANTT_ROW_HEIGHT / 2,
        height: 0,
        borderBottomWidth: 1.5,
        borderStyle: 'dashed',
        zIndex: 1,
    },
    ganttDiamondTouchGroup: {
        position: 'absolute',
        flexDirection: 'row',
        alignItems: 'center',
        zIndex: 3,
    },
    ganttDiamondShape: {
        width: 16,
        height: 16,
        borderRadius: 3,
        transform: [{ rotate: '45deg' }],
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
    },
    ganttDiamondTag: {
        marginLeft: 8,
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 8,
        borderWidth: StyleSheet.hairlineWidth,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
    },
    ganttDiamondTagText: {
        fontSize: 10,
        fontWeight: '600',
    },
    // Critical Point / Critical Path Card Styles
    criticalPathCard: {
        borderRadius: 20,
        padding: 16,
        marginTop: 12,
        borderWidth: StyleSheet.hairlineWidth,
        gap: 12,
    },
    criticalPathHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    criticalPathTitleGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    criticalPathTitle: {
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    criticalPathBadge: {
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 999,
    },
    criticalPathBadgeText: {
        fontSize: 11,
        fontWeight: '700',
    },
    criticalPathTextFlow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        rowGap: 8,
        columnGap: 4,
    },
    criticalPathTextStep: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        gap: 6,
    },
    criticalPathStepTitle: {
        fontSize: 13,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    criticalPathStepDate: {
        fontSize: 12,
        fontWeight: '400',
        marginLeft: 2,
    },
    criticalPathChevron: {
        marginHorizontal: 1,
    },
    criticalPathWarningRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingTop: 4,
        paddingHorizontal: 2,
    },
    criticalPathWarningText: {
        fontSize: 11,
        fontWeight: '500',
        flex: 1,
        lineHeight: 15,
    },
    // Calendar styles
    calendarModeWrapper: {
        gap: 16,
    },
    calendarMilestoneHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
    },
    calendarMilestoneHeaderText: {
        fontSize: 15,
        fontWeight: '700',
    },
    // Floating Toolbar
    floatingInputWrapper: {
        position: 'absolute',
        left: 16,
        right: 16,
        zIndex: 999,
    },
    floatingSearchToolbarRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        width: '100%',
    },
    floatingSearchCapsule: {
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        overflow: 'hidden',
    },
    searchInnerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        height: '100%',
        gap: 8,
    },
    floatingSearchInput: {
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
        paddingVertical: 0,
    },
    selectActionCircleBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    selectBtnFallback: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 22,
    },
    selectCircleFallback: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 22,
    },
});
