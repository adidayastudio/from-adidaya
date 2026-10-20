import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Platform,
    StyleSheet
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Rect, Circle, Line as SvgLine, Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';
import ContextMenu from '@/components/ui/PlatformContextMenu';
import { InstantTooltip } from '@/components/ui/InstantTooltip';
import {
    ScheduleTask,
    buildScheduleTasks,
    calculateTimeline,
    generateCascadingSchedule,
    calculateFinishDate,
    diffDays,
    formatShortDate,
    TimelineWeek,
    TimelineMonth
} from '@/lib/projectSchedule';
import { saveProjectSchedule } from '@/lib/api/projectSchedule';

interface ProjectSchedulePlannerProps {
    project: any;
    wbs: any[];
    isDark: boolean;
    onDirtyChange?: (dirty: boolean) => void;
    onTitleAccessoryChange?: (accessory: React.ReactNode) => void;
    onHeaderTrailingChange?: (trailing: React.ReactNode) => void;
    onProjectMetaChange?: (meta: any) => void;
}

type ViewMode = 'summary' | 'timeline' | 'gantt' | 'scurve';
type TimeScale = 'weekly' | 'monthly';

export function ProjectSchedulePlanner({
    project,
    wbs,
    isDark,
    onDirtyChange,
    onTitleAccessoryChange,
    onHeaderTrailingChange,
    onProjectMetaChange
}: ProjectSchedulePlannerProps) {
    // ---------------------------------------------------------
    // Theme Tokens
    // ---------------------------------------------------------
    const text = isDark ? '#F5F5F7' : '#1C1C1E';
    const secondary = isDark ? '#9898A2' : '#73737D';
    const surface = isDark ? '#1C1D23' : '#F2F2F7';
    const cardBg = isDark ? '#14151B' : '#FFFFFF';
    const border = isDark ? '#292930' : '#E5E5EA';
    const tableHeaderBg = isDark ? '#181920' : '#F8F9FA';
    const accent = '#007AFF';
    const redAccent = '#FF3B30';

    // ---------------------------------------------------------
    // State
    // ---------------------------------------------------------
    const initialConfig = project.meta?.scheduleConfig || {};
    const [viewMode, setViewMode] = useState<ViewMode>(initialConfig.view || 'summary');
    const [timeScale, setTimeScale] = useState<TimeScale>(initialConfig.timeScale || 'weekly');
    const [scheduleDrafts, setScheduleDrafts] = useState<Record<string, { start?: string; finish?: string; duration?: number; calendar?: string }>>({});
    const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [searchOpen, setSearchOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [saveMessage, setSaveMessage] = useState('');
    const [hoveredPoint, setHoveredPoint] = useState<{ index: number; x: number; y: number } | null>(null);

    // Merge baseline saved values with current drafts
    const baselineValues = project.meta?.scheduleValues || {};
    const effectiveValues = useMemo(() => {
        return {
            ...baselineValues,
            ...scheduleDrafts
        };
    }, [baselineValues, scheduleDrafts]);

    const isDirty = Object.keys(scheduleDrafts).length > 0;
    useEffect(() => {
        onDirtyChange?.(isDirty);
    }, [isDirty, onDirtyChange]);

    // ---------------------------------------------------------
    // Build Tasks & Timeline Calculations
    // ---------------------------------------------------------
    const { tasks, totalCost } = useMemo(() => {
        return buildScheduleTasks(project, wbs, effectiveValues);
    }, [project, wbs, effectiveValues]);

    const timelineData = useMemo(() => {
        return calculateTimeline(tasks, timeScale, totalCost);
    }, [tasks, timeScale, totalCost]);

    // Format money
    const formatIDR = (val: number) => {
        return Math.round(val || 0).toLocaleString('id-ID');
    };

    // Overall duration
    const totalDurationDays = timelineData.totalDurationDays;
    const totalDurationWeeks = timelineData.totalDurationWeeks;

    // ---------------------------------------------------------
    // Edit Handlers
    // ---------------------------------------------------------
    const handleStartDateChange = (code: string, newStart: string) => {
        const current = effectiveValues[code] || {};
        const duration = current.duration || 14;
        const newFinish = calculateFinishDate(newStart, duration);
        setScheduleDrafts(prev => ({
            ...prev,
            [code]: {
                ...prev[code],
                start: newStart,
                finish: newFinish,
                duration: duration
            }
        }));
        setSaveError('');
        setSaveMessage('');
    };

    const handleFinishDateChange = (code: string, newFinish: string) => {
        const current = effectiveValues[code] || {};
        const start = current.start || newFinish;
        const duration = diffDays(start, newFinish) || 1;
        setScheduleDrafts(prev => ({
            ...prev,
            [code]: {
                ...prev[code],
                start: start,
                finish: newFinish,
                duration: duration
            }
        }));
        setSaveError('');
        setSaveMessage('');
    };

    const handleDurationDaysChange = (code: string, daysStr: string) => {
        const days = parseInt(daysStr, 10);
        if (isNaN(days) || days <= 0) return;
        const current = effectiveValues[code] || {};
        const start = current.start || timelineData.projectStartDate || new Date().toISOString().split('T')[0];
        const newFinish = calculateFinishDate(start, days);
        setScheduleDrafts(prev => ({
            ...prev,
            [code]: {
                ...prev[code],
                start: start,
                finish: newFinish,
                duration: days
            }
        }));
        setSaveError('');
        setSaveMessage('');
    };

    const handleAutoSchedule = () => {
        const cascading = generateCascadingSchedule(tasks);
        setScheduleDrafts(cascading);
        setSaveError('');
        setSaveMessage('Auto-scheduled cascading dates');
    };

    const handleResetSchedule = () => {
        setScheduleDrafts({});
        setSaveError('');
        setSaveMessage('');
    };

    // ---------------------------------------------------------
    // Save Action
    // ---------------------------------------------------------
    const handleSave = async () => {
        if (saving) return;
        setSaving(true);
        setSaveError('');
        setSaveMessage('');
        try {
            const nextMeta = await saveProjectSchedule(
                project.id,
                scheduleDrafts,
                { view: viewMode, timeScale }
            );
            setScheduleDrafts({});
            setSaveMessage('Saved');
            onProjectMetaChange?.(nextMeta);
        } catch (err: any) {
            setSaveError(err.message || 'Failed to save schedule.');
        } finally {
            setSaving(false);
        }
    };

    // ---------------------------------------------------------
    // Top Bar Wiring (Sticky Unified Header)
    // ---------------------------------------------------------
    useEffect(() => {
        onTitleAccessoryChange?.(
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{
                    height: 32,
                    paddingHorizontal: 10,
                    borderRadius: 999,
                    backgroundColor: surface,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 5
                }}>
                    <Text style={{ color: secondary, fontSize: 11, fontWeight: '500' }}>Schedule:</Text>
                    <Text style={{ color: text, fontSize: 12, fontWeight: '600', textTransform: 'capitalize' }}>
                        {viewMode === 'scurve' ? 'S-Curve' : viewMode}
                    </Text>
                </View>
            </View>
        );
        return () => onTitleAccessoryChange?.(null);
    }, [viewMode, surface, secondary, text]);

    useEffect(() => {
        onHeaderTrailingChange?.(
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {!searchOpen && !searchQuery ? (
                    <TouchableOpacity
                        accessibilityLabel="Search tasks"
                        onPress={() => setSearchOpen(true)}
                        style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: surface, alignItems: 'center', justifyContent: 'center' }}
                    >
                        <Ionicons name="search-outline" size={15} color={secondary} />
                    </TouchableOpacity>
                ) : (
                    <View style={{ height: 34, paddingHorizontal: 10, borderRadius: 999, backgroundColor: surface, flexDirection: 'row', alignItems: 'center', gap: 6, width: 190 }}>
                        <Ionicons name="search-outline" size={14} color={secondary} />
                        <TextInput
                            autoFocus
                            accessibilityLabel="Search schedule tasks"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholder="Search tasks..."
                            placeholderTextColor={secondary}
                            onBlur={() => { if (!searchQuery) setSearchOpen(false); }}
                            style={{ flex: 1, minWidth: 0, color: text, fontSize: 12, padding: 0 }}
                        />
                        {!!searchQuery && (
                            <TouchableOpacity
                                accessibilityLabel="Clear search"
                                onPress={() => { setSearchQuery(''); setSearchOpen(false); }}
                                style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: isDark ? '#3A3A3C' : '#D1D1D6', alignItems: 'center', justifyContent: 'center' }}
                            >
                                <Ionicons name="close" size={10} color={isDark ? '#FFF' : '#333'} />
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                <ContextMenu
                    title="Schedule Options"
                    dropdownMenuMode
                    actions={[
                        { title: 'Auto-Schedule (Cascading)' },
                        { title: 'Reset Unsaved Edits' },
                        { title: collapsed.size > 0 ? 'Expand All Tasks' : 'Collapse All Tasks' }
                    ]}
                    onPress={event => {
                        if (event.nativeEvent.index === 0) handleAutoSchedule();
                        else if (event.nativeEvent.index === 1) handleResetSchedule();
                        else if (event.nativeEvent.index === 2) {
                            if (collapsed.size > 0) setCollapsed(new Set());
                            else setCollapsed(new Set(tasks.filter(t => t.isSection).map(t => t.code)));
                        }
                    }}
                >
                    <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: surface, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="ellipsis-horizontal" size={16} color={secondary} />
                    </View>
                </ContextMenu>

                <TouchableOpacity
                    accessibilityLabel="Save schedule"
                    disabled={!isDirty || saving}
                    onPress={handleSave}
                    style={{
                        height: 34,
                        paddingHorizontal: 14,
                        borderRadius: 999,
                        backgroundColor: isDirty ? accent : surface,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        opacity: saving ? 0.6 : 1
                    }}
                >
                    {saving ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                        <>
                            <Ionicons name="cloud-upload-outline" size={14} color={isDirty ? '#FFFFFF' : secondary} />
                            <Text style={{ color: isDirty ? '#FFFFFF' : secondary, fontSize: 12, fontWeight: '600' }}>
                                Save
                            </Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        );
        return () => onHeaderTrailingChange?.(null);
    }, [searchOpen, searchQuery, isDirty, saving, surface, secondary, text, isDark, collapsed, tasks]);

    // ---------------------------------------------------------
    // Visible Tasks (search & collapsed filtering)
    // ---------------------------------------------------------
    const visibleTasks = useMemo(() => {
        return tasks.filter(task => {
            // Collapsed check
            const isChildOfCollapsed = [...collapsed].some(c => task.code.startsWith(`${c}.`));
            if (isChildOfCollapsed) return false;

            // Search filter
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const match = task.code.toLowerCase().includes(q) ||
                    task.title.toLowerCase().includes(q) ||
                    task.titleEn.toLowerCase().includes(q) ||
                    task.titleId.toLowerCase().includes(q);
                return match;
            }
            return true;
        });
    }, [tasks, collapsed, searchQuery]);

    const toggleCollapse = (code: string) => {
        setCollapsed(prev => {
            const next = new Set(prev);
            if (next.has(code)) next.delete(code);
            else next.add(code);
            return next;
        });
    };

    // ---------------------------------------------------------
    // Render Top KPI Card & Controls (matching screenshots)
    // ---------------------------------------------------------
    const renderTopCard = () => {
        return (
            <View style={[styles.topCard, { backgroundColor: isDark ? '#16171E' : '#F4F6F9', borderColor: border }]}>
                {/* Metric Summary Row */}
                <View style={styles.metricRow}>
                    <View style={styles.metricItem}>
                        <Text style={[styles.metricLabel, { color: secondary }]}>Total Project Cost:</Text>
                        <Text style={[styles.metricValue, { color: text }]}>Rp {formatIDR(totalCost)}</Text>
                    </View>

                    <View style={[styles.metricDivider, { backgroundColor: border }]} />

                    <View style={styles.metricItem}>
                        <Text style={[styles.metricLabel, { color: secondary }]}>Est. Duration:</Text>
                        <Text style={[styles.metricValue, { color: text }]}>
                            {totalDurationDays > 0 ? `${totalDurationDays} Days (${totalDurationWeeks} Wks)` : '— Days'}
                        </Text>
                    </View>
                </View>

                {/* View Tabs & Time Scale Row */}
                <View style={styles.controlsRow}>
                    {/* View Tabs */}
                    <View style={[styles.segmentedPillContainer, { backgroundColor: isDark ? '#1F2028' : '#E9ECEF' }]}>
                        {(['summary', 'timeline', 'gantt', 'scurve'] as ViewMode[]).map(mode => {
                            const active = viewMode === mode;
                            const label = mode === 'scurve' ? 'S-Curve' : mode.charAt(0).toUpperCase() + mode.slice(1);
                            return (
                                <TouchableOpacity
                                    key={mode}
                                    onPress={() => setViewMode(mode)}
                                    style={[
                                        styles.segmentedButton,
                                        active && [styles.segmentedButtonActive, {
                                            backgroundColor: cardBg,
                                            borderColor: accent,
                                            shadowColor: '#000',
                                            shadowOpacity: isDark ? 0.3 : 0.08,
                                            shadowRadius: 4,
                                            elevation: 2
                                        }]
                                    ]}
                                >
                                    <Text style={[
                                        styles.segmentedButtonText,
                                        { color: active ? accent : secondary, fontWeight: active ? '700' : '500' }
                                    ]}>
                                        {label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Time Scale Control */}
                    <View style={styles.timeScaleContainer}>
                        <Text style={[styles.timeScaleLabel, { color: secondary }]}>TIME SCALE:</Text>
                        <View style={[styles.segmentedPillContainer, { backgroundColor: isDark ? '#1F2028' : '#E9ECEF' }]}>
                            {(['weekly', 'monthly'] as TimeScale[]).map(scale => {
                                const active = timeScale === scale;
                                const label = scale.charAt(0).toUpperCase() + scale.slice(1);
                                return (
                                    <TouchableOpacity
                                        key={scale}
                                        onPress={() => setTimeScale(scale)}
                                        style={[
                                            styles.segmentedButton,
                                            active && [styles.segmentedButtonActive, {
                                                backgroundColor: cardBg,
                                                borderColor: accent,
                                                shadowColor: '#000',
                                                shadowOpacity: isDark ? 0.3 : 0.08,
                                                shadowRadius: 4,
                                                elevation: 2
                                            }]
                                        ]}
                                    >
                                        <Text style={[
                                            styles.segmentedButtonText,
                                            { color: active ? accent : secondary, fontWeight: active ? '700' : '500' }
                                        ]}>
                                            {label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    // ---------------------------------------------------------
    // View 1: Summary Table (media_1792435045233.png)
    // ---------------------------------------------------------
    const renderSummaryView = () => {
        return (
            <View style={[styles.tableContainer, { borderColor: border, backgroundColor: cardBg }]}>
                {/* Header Row */}
                <View style={[styles.tableHeader, { backgroundColor: tableHeaderBg, borderBottomColor: border }]}>
                    <Text style={[styles.thCell, { flex: 3.5, color: secondary }]}>ACTIVITY / TASK NAME</Text>
                    <Text style={[styles.thCell, { width: 90, textAlign: 'right', color: secondary }]}>WGT (%)</Text>
                    <Text style={[styles.thCell, { width: 140, textAlign: 'center', color: secondary }]}>START DATE</Text>
                    <Text style={[styles.thCell, { width: 140, textAlign: 'center', color: secondary }]}>FINISH DATE</Text>
                    <Text style={[styles.thCell, { width: 130, textAlign: 'center', color: secondary }]}>DURATION</Text>
                    <Text style={[styles.thCell, { width: 120, textAlign: 'center', color: secondary }]}>CALENDAR</Text>
                </View>

                {/* Body Rows */}
                {visibleTasks.map(task => {
                    const isSection = task.isSection;
                    const isCollapsed = collapsed.has(task.code);
                    const indent = Math.min(task.level * 22, 110);

                    return (
                        <View
                            key={task.code}
                            style={[
                                styles.tableRow,
                                {
                                    borderBottomColor: border,
                                    backgroundColor: isSection ? (isDark ? '#1A1B22' : '#F9FAFC') : 'transparent'
                                }
                            ]}
                        >
                            {/* Task Name & Code */}
                            <View style={[styles.tdCell, { flex: 3.5, paddingLeft: 12 + indent, flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                                {task.hasChildren ? (
                                    <TouchableOpacity
                                        onPress={() => toggleCollapse(task.code)}
                                        style={{ width: 18, height: 18, alignItems: 'center', justifyContent: 'center' }}
                                    >
                                        <Ionicons
                                            name={isCollapsed ? 'chevron-forward' : 'chevron-down'}
                                            size={14}
                                            color={secondary}
                                        />
                                    </TouchableOpacity>
                                ) : (
                                    <View style={{ width: 18 }} />
                                )}

                                {/* Code Badge */}
                                <View style={[styles.codeBadge, { backgroundColor: surface, borderColor: border }]}>
                                    <Text style={[styles.codeBadgeText, { color: text }]}>{task.code}</Text>
                                </View>

                                {/* Title */}
                                <Text
                                    numberOfLines={1}
                                    style={[
                                        styles.taskTitleText,
                                        {
                                            color: text,
                                            fontWeight: isSection ? '700' : '500'
                                        }
                                    ]}
                                >
                                    {task.title}
                                </Text>
                            </View>

                            {/* Weight (%) */}
                            <Text style={[styles.tdCell, { width: 90, textAlign: 'right', color: text, fontWeight: isSection ? '700' : '400' }]}>
                                {task.weight > 0 ? `${task.weight.toFixed(2)}%` : '0.00%'}
                            </Text>

                            {/* Start Date */}
                            <View style={[styles.tdCell, { width: 140, alignItems: 'center', justifyContent: 'center' }]}>
                                {isSection ? (
                                    <Text style={{ color: secondary, fontSize: 12 }}>{task.startDate || '—'}</Text>
                                ) : (
                                    <TextInput
                                        accessibilityLabel={`Start date for ${task.code}`}
                                        value={task.startDate}
                                        onChangeText={val => handleStartDateChange(task.code, val)}
                                        placeholder="YYYY-MM-DD"
                                        placeholderTextColor={secondary}
                                        style={[styles.dateInput, { color: text, backgroundColor: surface, borderColor: border }]}
                                    />
                                )}
                            </View>

                            {/* Finish Date */}
                            <View style={[styles.tdCell, { width: 140, alignItems: 'center', justifyContent: 'center' }]}>
                                {isSection ? (
                                    <Text style={{ color: secondary, fontSize: 12 }}>{task.finishDate || '—'}</Text>
                                ) : (
                                    <TextInput
                                        accessibilityLabel={`Finish date for ${task.code}`}
                                        value={task.finishDate}
                                        onChangeText={val => handleFinishDateChange(task.code, val)}
                                        placeholder="YYYY-MM-DD"
                                        placeholderTextColor={secondary}
                                        style={[styles.dateInput, { color: text, backgroundColor: surface, borderColor: border }]}
                                    />
                                )}
                            </View>

                            {/* Duration (Days & Weeks) */}
                            <View style={[styles.tdCell, { width: 130, alignItems: 'center', justifyContent: 'center' }]}>
                                {isSection ? (
                                    <Text style={{ color: secondary, fontSize: 12, fontWeight: '600' }}>
                                        {task.durationDays > 0 ? `${task.durationDays}d (${task.durationWeeks}w)` : '—'}
                                    </Text>
                                ) : (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                        <TextInput
                                            accessibilityLabel={`Duration for ${task.code}`}
                                            value={task.durationDays > 0 ? String(task.durationDays) : ''}
                                            onChangeText={val => handleDurationDaysChange(task.code, val)}
                                            placeholder="Days"
                                            placeholderTextColor={secondary}
                                            keyboardType="numeric"
                                            style={[styles.durationInput, { color: text, backgroundColor: surface, borderColor: border }]}
                                        />
                                        <Text style={{ color: secondary, fontSize: 11 }}>
                                            {task.durationDays > 0 ? `${task.durationWeeks}w` : ''}
                                        </Text>
                                    </View>
                                )}
                            </View>

                            {/* Calendar */}
                            <View style={[styles.tdCell, { width: 120, alignItems: 'center', justifyContent: 'center' }]}>
                                <Text style={{ color: secondary, fontSize: 12 }}>{task.calendar || 'Standard (7d)'}</Text>
                            </View>
                        </View>
                    );
                })}

                {visibleTasks.length === 0 && (
                    <View style={{ padding: 40, alignItems: 'center' }}>
                        <Text style={{ color: secondary, fontSize: 14 }}>No tasks found in WBS.</Text>
                    </View>
                )}
            </View>
        );
    };

    // ---------------------------------------------------------
    // View 2: Timeline Table (media_1792435052023.png)
    // ---------------------------------------------------------
    const renderTimelineView = () => {
        const periods = timeScale === 'weekly' ? timelineData.weeks : timelineData.months;
        const colWidth = timeScale === 'weekly' ? 52 : 90;

        return (
            <View style={[styles.tableContainer, { borderColor: border, backgroundColor: cardBg }]}>
                <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                    <View>
                        {/* Table Header: Two Rows for Month & Week grouping */}
                        <View style={[styles.timelineHeaderContainer, { backgroundColor: tableHeaderBg, borderBottomColor: border }]}>
                            {/* Left fixed header columns */}
                            <View style={styles.fixedColsHeader}>
                                <Text style={[styles.thCell, { width: 260, color: secondary }]}>TASK NAME</Text>
                                <Text style={[styles.thCell, { width: 70, textAlign: 'right', color: secondary }]}>WGT</Text>
                                <Text style={[styles.thCell, { width: 80, textAlign: 'center', color: secondary }]}>START</Text>
                                <Text style={[styles.thCell, { width: 65, textAlign: 'center', color: secondary }]}>DUR</Text>
                            </View>

                            {/* Right Grid Month & Period Headers */}
                            <View>
                                {timeScale === 'weekly' ? (
                                    <>
                                        {/* Month Header Row */}
                                        <View style={[styles.gridMonthHeaderRow, { borderBottomColor: border }]}>
                                            {timelineData.months.map(m => (
                                                <View
                                                    key={m.monthKey}
                                                    style={[
                                                        styles.gridMonthCell,
                                                        { width: m.weekCount * colWidth, borderRightColor: border }
                                                    ]}
                                                >
                                                    <Text style={[styles.gridMonthText, { color: text }]}>{m.shortLabel}</Text>
                                                </View>
                                            ))}
                                        </View>

                                        {/* Week Header Row */}
                                        <View style={styles.gridWeekHeaderRow}>
                                            {timelineData.weeks.map(w => (
                                                <View
                                                    key={w.index}
                                                    style={[
                                                        styles.gridWeekCell,
                                                        { width: colWidth, borderRightColor: border }
                                                    ]}
                                                >
                                                    <Text style={[styles.gridWeekText, { color: text }]}>{w.label}</Text>
                                                    <Text style={[styles.gridWeekSubText, { color: secondary }]}>{w.startDisplay}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    </>
                                ) : (
                                    /* Monthly Header Row */
                                    <View style={styles.gridMonthHeaderRow}>
                                        {timelineData.months.map(m => (
                                            <View
                                                key={m.monthKey}
                                                style={[
                                                    styles.gridMonthCell,
                                                    { width: colWidth, borderRightColor: border }
                                                ]}
                                            >
                                                <Text style={[styles.gridMonthText, { color: text }]}>{m.label}</Text>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </View>
                        </View>

                        {/* Task Data Rows */}
                        {visibleTasks.map(task => {
                            const isSection = task.isSection;
                            const isCollapsed = collapsed.has(task.code);
                            const indent = Math.min(task.level * 16, 80);
                            const progressArr = timelineData.taskProgress[task.code] || [];

                            return (
                                <View
                                    key={task.code}
                                    style={[
                                        styles.timelineRow,
                                        {
                                            borderBottomColor: border,
                                            backgroundColor: isSection ? (isDark ? '#1A1B22' : '#F9FAFC') : 'transparent'
                                        }
                                    ]}
                                >
                                    {/* Left Columns */}
                                    <View style={styles.fixedColsRow}>
                                        <View style={[styles.tdCell, { width: 260, paddingLeft: 8 + indent, flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                                            {task.hasChildren ? (
                                                <TouchableOpacity
                                                    onPress={() => toggleCollapse(task.code)}
                                                    style={{ width: 16, height: 16, alignItems: 'center', justifyContent: 'center' }}
                                                >
                                                    <Ionicons
                                                        name={isCollapsed ? 'chevron-forward' : 'chevron-down'}
                                                        size={13}
                                                        color={secondary}
                                                    />
                                                </TouchableOpacity>
                                            ) : (
                                                <View style={{ width: 16 }} />
                                            )}

                                            <View style={[styles.codeBadge, { backgroundColor: surface, borderColor: border, paddingHorizontal: 5 }]}>
                                                <Text style={[styles.codeBadgeText, { color: text, fontSize: 10 }]}>{task.code}</Text>
                                            </View>

                                            <Text
                                                numberOfLines={1}
                                                style={[
                                                    styles.taskTitleText,
                                                    { color: text, fontSize: 12, fontWeight: isSection ? '700' : '500', maxWidth: 170 }
                                                ]}
                                            >
                                                {task.title}
                                            </Text>
                                        </View>

                                        <Text style={[styles.tdCell, { width: 70, textAlign: 'right', color: text, fontSize: 12, fontWeight: isSection ? '700' : '400' }]}>
                                            {task.weight > 0 ? `${task.weight.toFixed(2)}%` : '0.00%'}
                                        </Text>

                                        <Text style={[styles.tdCell, { width: 80, textAlign: 'center', color: secondary, fontSize: 11 }]}>
                                            {task.startDate ? formatShortDate(task.startDate) : '—'}
                                        </Text>

                                        <Text style={[styles.tdCell, { width: 65, textAlign: 'center', color: secondary, fontSize: 11 }]}>
                                            {task.durationDays > 0 ? `${task.durationDays}d` : '—'}
                                        </Text>
                                    </View>

                                    {/* Right Grid Cells */}
                                    <View style={{ flexDirection: 'row' }}>
                                        {periods.map((_, pIdx) => {
                                            const val = progressArr[pIdx] || 0;
                                            const isActive = val > 0;
                                            return (
                                                <View
                                                    key={pIdx}
                                                    style={[
                                                        styles.timelineGridCell,
                                                        {
                                                            width: colWidth,
                                                            borderRightColor: border,
                                                            backgroundColor: isActive
                                                                ? (isDark ? 'rgba(0, 122, 255, 0.15)' : 'rgba(0, 122, 255, 0.08)')
                                                                : 'transparent'
                                                        }
                                                    ]}
                                                >
                                                    {isActive && (
                                                        <Text style={[styles.timelineCellText, { color: isDark ? '#60A5FA' : '#0066CC' }]}>
                                                            {val.toFixed(1)}%
                                                        </Text>
                                                    )}
                                                </View>
                                            );
                                        })}
                                    </View>
                                </View>
                            );
                        })}

                        {/* Summary Row 1: Weekly / Monthly Progress */}
                        <View style={[styles.summaryFooterRow, { borderTopColor: border, backgroundColor: tableHeaderBg }]}>
                            <View style={styles.fixedColsRow}>
                                <Text style={[styles.summaryFooterLabel, { width: 475, color: text }]}>
                                    {timeScale === 'weekly' ? 'Weekly Progress (W)' : 'Monthly Progress (M)'}
                                </Text>
                            </View>
                            <View style={{ flexDirection: 'row' }}>
                                {periods.map((_, pIdx) => {
                                    const val = timelineData.weeklyProgress[pIdx] || 0;
                                    return (
                                        <View key={pIdx} style={[styles.timelineGridCell, { width: colWidth, borderRightColor: border }]}>
                                            <Text style={[styles.summaryFooterValue, { color: text }]}>
                                                {val.toFixed(1)}%
                                            </Text>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>

                        {/* Summary Row 2: Cumulative Progress (Bold Red) */}
                        <View style={[styles.summaryFooterRow, { borderTopColor: border, backgroundColor: isDark ? '#1C1919' : '#FFF5F5' }]}>
                            <View style={styles.fixedColsRow}>
                                <Text style={[styles.summaryFooterLabel, { width: 475, color: redAccent, fontWeight: '700' }]}>
                                    Cumulative Progress (C)
                                </Text>
                            </View>
                            <View style={{ flexDirection: 'row' }}>
                                {periods.map((_, pIdx) => {
                                    const val = timelineData.cumulativeProgress[pIdx] || 0;
                                    return (
                                        <View key={pIdx} style={[styles.timelineGridCell, { width: colWidth, borderRightColor: border }]}>
                                            <Text style={[styles.summaryFooterValue, { color: redAccent, fontWeight: '700' }]}>
                                                {val.toFixed(1)}%
                                            </Text>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </View>
        );
    };

    // ---------------------------------------------------------
    // View 3: Gantt View
    // ---------------------------------------------------------
    const renderGanttView = () => {
        const periods = timeScale === 'weekly' ? timelineData.weeks : timelineData.months;
        const colWidth = 60;
        const timelineStart = timelineData.weeks[0]?.startDate || timelineData.projectStartDate;
        const startDateObj = new Date(timelineStart);

        return (
            <View style={[styles.tableContainer, { borderColor: border, backgroundColor: cardBg }]}>
                <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                    <View>
                        {/* Header */}
                        <View style={[styles.timelineHeaderContainer, { backgroundColor: tableHeaderBg, borderBottomColor: border }]}>
                            <View style={styles.fixedColsHeader}>
                                <Text style={[styles.thCell, { width: 240, color: secondary }]}>TASK NAME</Text>
                                <Text style={[styles.thCell, { width: 65, textAlign: 'right', color: secondary }]}>WGT</Text>
                                <Text style={[styles.thCell, { width: 80, textAlign: 'center', color: secondary }]}>START</Text>
                                <Text style={[styles.thCell, { width: 60, textAlign: 'center', color: secondary }]}>DUR</Text>
                            </View>

                            {/* Header grid */}
                            <View style={styles.gridWeekHeaderRow}>
                                {periods.map(p => (
                                    <View key={p.index} style={[styles.gridWeekCell, { width: colWidth, borderRightColor: border }]}>
                                        <Text style={[styles.gridWeekText, { color: text }]}>{p.label}</Text>
                                        <Text style={[styles.gridWeekSubText, { color: secondary }]}>{(p as TimelineWeek).startDisplay || ''}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>

                        {/* Task Gantt Bars */}
                        {visibleTasks.map(task => {
                            const isSection = task.isSection;
                            const indent = Math.min(task.level * 16, 80);

                            // Calculate bar position
                            let barLeft = 0;
                            let barWidth = 0;
                            const hasDates = task.startDate && task.finishDate && task.durationDays > 0;

                            if (hasDates) {
                                const offsetDays = Math.max(0, diffDays(timelineStart, task.startDate) - 1);
                                const dayWidth = colWidth / 7;
                                barLeft = offsetDays * dayWidth;
                                barWidth = Math.max(14, task.durationDays * dayWidth);
                            }

                            return (
                                <View
                                    key={task.code}
                                    style={[
                                        styles.timelineRow,
                                        {
                                            height: 42,
                                            borderBottomColor: border,
                                            backgroundColor: isSection ? (isDark ? '#1A1B22' : '#F9FAFC') : 'transparent'
                                        }
                                    ]}
                                >
                                    {/* Left info */}
                                    <View style={styles.fixedColsRow}>
                                        <View style={[styles.tdCell, { width: 240, paddingLeft: 8 + indent, flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                                            <View style={[styles.codeBadge, { backgroundColor: surface, borderColor: border, paddingHorizontal: 5 }]}>
                                                <Text style={[styles.codeBadgeText, { color: text, fontSize: 10 }]}>{task.code}</Text>
                                            </View>
                                            <Text numberOfLines={1} style={[styles.taskTitleText, { color: text, fontSize: 12, fontWeight: isSection ? '700' : '500', maxWidth: 170 }]}>
                                                {task.title}
                                            </Text>
                                        </View>

                                        <Text style={[styles.tdCell, { width: 65, textAlign: 'right', color: text, fontSize: 12 }]}>
                                            {task.weight > 0 ? `${task.weight.toFixed(1)}%` : '0%'}
                                        </Text>
                                        <Text style={[styles.tdCell, { width: 80, textAlign: 'center', color: secondary, fontSize: 11 }]}>
                                            {task.startDate ? formatShortDate(task.startDate) : '—'}
                                        </Text>
                                        <Text style={[styles.tdCell, { width: 60, textAlign: 'center', color: secondary, fontSize: 11 }]}>
                                            {task.durationDays > 0 ? `${task.durationDays}d` : '—'}
                                        </Text>
                                    </View>

                                    {/* Right Gantt Bar Area */}
                                    <View style={{ width: periods.length * colWidth, height: '100%', position: 'relative' }}>
                                        {/* Background Grid Lines */}
                                        <View style={{ flexDirection: 'row', position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}>
                                            {periods.map(p => (
                                                <View key={p.index} style={{ width: colWidth, height: '100%', borderRightWidth: 1, borderRightColor: border }} />
                                            ))}
                                        </View>

                                        {/* Bar */}
                                        {hasDates && (
                                            <View
                                                style={[
                                                    styles.ganttBar,
                                                    {
                                                        left: barLeft,
                                                        width: barWidth,
                                                        backgroundColor: isSection ? (isDark ? '#4B5563' : '#374151') : accent,
                                                        height: isSection ? 12 : 20,
                                                        borderRadius: isSection ? 2 : 10,
                                                        top: isSection ? 15 : 11
                                                    }
                                                ]}
                                            >
                                                {!isSection && barWidth > 50 && (
                                                    <Text numberOfLines={1} style={styles.ganttBarText}>
                                                        {task.durationDays}d · {task.weight > 0 ? `${task.weight.toFixed(1)}%` : ''}
                                                    </Text>
                                                )}
                                            </View>
                                        )}
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                </ScrollView>
            </View>
        );
    };

    // ---------------------------------------------------------
    // View 4: S-Curve View (Kurva S)
    // ---------------------------------------------------------
    const renderSCurveView = () => {
        const periods = timeScale === 'weekly' ? timelineData.weeks : timelineData.months;
        const cumProgress = timelineData.cumulativeProgress;
        const weekProgress = timelineData.weeklyProgress;

        // Peak weekly progress
        const peakWeekly = Math.max(1, ...weekProgress);

        // Chart dimensions
        const chartWidth = Math.max(760, periods.length * 54);
        const chartHeight = 320;
        const paddingLeft = 50;
        const paddingRight = 40;
        const paddingTop = 30;
        const paddingBottom = 40;

        const innerWidth = chartWidth - paddingLeft - paddingRight;
        const innerHeight = chartHeight - paddingTop - paddingBottom;

        // Calculate points for S-Curve line
        const stepX = periods.length > 1 ? innerWidth / (periods.length - 1) : innerWidth;

        const points = cumProgress.map((val, idx) => {
            const x = paddingLeft + idx * stepX;
            const y = paddingTop + innerHeight - (val / 100) * innerHeight;
            return { x, y, val, week: periods[idx]?.label, period: periods[idx]?.startDisplay };
        });

        const linePath = points.length > 0
            ? points.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)},${pt.y.toFixed(1)}`, '')
            : '';

        const areaPath = points.length > 0
            ? `${linePath} L ${points[points.length - 1].x.toFixed(1)},${(paddingTop + innerHeight).toFixed(1)} L ${points[0].x.toFixed(1)},${(paddingTop + innerHeight).toFixed(1)} Z`
            : '';

        // Y-axis tick steps (0%, 20%, 40%, 60%, 80%, 100%)
        const yTicks = [0, 20, 40, 60, 80, 100];

        return (
            <View style={{ gap: 16 }}>
                {/* S-Curve Metric Highlights */}
                <View style={styles.scurveStatsRow}>
                    <View style={[styles.scurveStatCard, { backgroundColor: cardBg, borderColor: border }]}>
                        <Text style={[styles.scurveStatLabel, { color: secondary }]}>Total Schedule Duration</Text>
                        <Text style={[styles.scurveStatValue, { color: text }]}>
                            {totalDurationWeeks} Weeks ({totalDurationDays} Days)
                        </Text>
                        <Text style={{ color: secondary, fontSize: 11 }}>
                            {timelineData.projectStartDate} to {timelineData.projectFinishDate}
                        </Text>
                    </View>

                    <View style={[styles.scurveStatCard, { backgroundColor: cardBg, borderColor: border }]}>
                        <Text style={[styles.scurveStatLabel, { color: secondary }]}>Planned Peak Progress</Text>
                        <Text style={[styles.scurveStatValue, { color: accent }]}>
                            {peakWeekly.toFixed(1)}% / period
                        </Text>
                        <Text style={{ color: secondary, fontSize: 11 }}>Max workload intensity</Text>
                    </View>

                    <View style={[styles.scurveStatCard, { backgroundColor: cardBg, borderColor: border }]}>
                        <Text style={[styles.scurveStatLabel, { color: secondary }]}>Target Completion</Text>
                        <Text style={[styles.scurveStatValue, { color: redAccent }]}>
                            {cumProgress[cumProgress.length - 1] || 0}%
                        </Text>
                        <Text style={{ color: secondary, fontSize: 11 }}>100% project delivery</Text>
                    </View>
                </View>

                {/* S-Curve Chart Container */}
                <View style={[styles.tableContainer, { borderColor: border, backgroundColor: cardBg, padding: 16 }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <Text style={{ color: text, fontSize: 15, fontWeight: '700' }}>
                            Kurva S Rencana (Planned Progress S-Curve)
                        </Text>

                        {/* Legend */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <View style={{ width: 14, height: 3, backgroundColor: redAccent, borderRadius: 2 }} />
                                <Text style={{ color: secondary, fontSize: 11 }}>Planned Cumulative (C)</Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <View style={{ width: 10, height: 10, backgroundColor: isDark ? '#3B82F6' : '#93C5FD', borderRadius: 2 }} />
                                <Text style={{ color: secondary, fontSize: 11 }}>Periodic Planned (W)</Text>
                            </View>
                        </View>
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                        <View style={{ width: chartWidth, height: chartHeight }}>
                            <Svg width={chartWidth} height={chartHeight}>
                                <Defs>
                                    <LinearGradient id="scurveAreaGrad" x1="0" y1="0" x2="0" y2="1">
                                        <Stop offset="0%" stopColor={redAccent} stopOpacity={0.25} />
                                        <Stop offset="100%" stopColor={redAccent} stopOpacity={0.0} />
                                    </LinearGradient>
                                </Defs>

                                {/* Background Grid Lines & Y Ticks */}
                                {yTicks.map(tick => {
                                    const y = paddingTop + innerHeight - (tick / 100) * innerHeight;
                                    return (
                                        <React.Fragment key={tick}>
                                            <SvgLine
                                                x1={paddingLeft}
                                                y1={y}
                                                x2={chartWidth - paddingRight}
                                                y2={y}
                                                stroke={isDark ? '#2C2D35' : '#E5E7EB'}
                                                strokeWidth="1"
                                                strokeDasharray={tick === 0 || tick === 100 ? undefined : '3,3'}
                                            />
                                            <SvgText
                                                x={paddingLeft - 8}
                                                y={y + 4}
                                                fill={secondary}
                                                fontSize="10"
                                                textAnchor="end"
                                            >
                                                {tick}%
                                            </SvgText>
                                        </React.Fragment>
                                    );
                                })}

                                {/* Periodic Progress Bars (at chart bottom) */}
                                {weekProgress.map((val, idx) => {
                                    const xCenter = paddingLeft + idx * stepX;
                                    const barW = Math.max(8, stepX * 0.55);
                                    const barH = (val / Math.max(15, peakWeekly * 1.2)) * (innerHeight * 0.45);
                                    const barY = paddingTop + innerHeight - barH;
                                    return (
                                        <Rect
                                            key={`bar-${idx}`}
                                            x={xCenter - barW / 2}
                                            y={barY}
                                            width={barW}
                                            height={barH}
                                            fill={isDark ? '#2563EB' : '#93C5FD'}
                                            opacity={0.65}
                                            rx={2}
                                        />
                                    );
                                })}

                                {/* Area Under S-Curve */}
                                {areaPath && (
                                    <Path
                                        d={areaPath}
                                        fill="url(#scurveAreaGrad)"
                                    />
                                )}

                                {/* S-Curve Line */}
                                {linePath && (
                                    <Path
                                        d={linePath}
                                        fill="none"
                                        stroke={redAccent}
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                )}

                                {/* Data Points & Labels */}
                                {points.map((pt, idx) => {
                                    const isHovered = hoveredPoint?.index === idx;
                                    return (
                                        <React.Fragment key={`pt-${idx}`}>
                                            <Circle
                                                cx={pt.x}
                                                cy={pt.y}
                                                r={isHovered ? 6 : 4}
                                                fill={redAccent}
                                                stroke={cardBg}
                                                strokeWidth="2"
                                            />
                                            {/* X Axis Labels */}
                                            <SvgText
                                                x={pt.x}
                                                y={chartHeight - 12}
                                                fill={text}
                                                fontSize="10"
                                                textAnchor="middle"
                                                fontWeight="600"
                                            >
                                                {pt.week}
                                            </SvgText>
                                        </React.Fragment>
                                    );
                                })}
                            </Svg>
                        </View>
                    </ScrollView>

                    {/* Data Table beneath S-Curve */}
                    <View style={{ marginTop: 20 }}>
                        <Text style={{ color: text, fontSize: 13, fontWeight: '700', marginBottom: 8 }}>
                            Weekly Breakdown Matrix
                        </Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                            <View style={{ borderWidth: 1, borderColor: border, borderRadius: 8, overflow: 'hidden' }}>
                                {/* Header */}
                                <View style={[styles.timelineHeaderContainer, { backgroundColor: tableHeaderBg }]}>
                                    <Text style={[styles.thCell, { width: 140, color: secondary }]}>Metric</Text>
                                    {periods.map(p => (
                                        <Text key={p.index} style={[styles.thCell, { width: 56, textAlign: 'center', color: text }]}>
                                            {p.label}
                                        </Text>
                                    ))}
                                </View>
                                {/* Periodic */}
                                <View style={[styles.tableRow, { borderBottomColor: border }]}>
                                    <Text style={[styles.tdCell, { width: 140, color: text, fontWeight: '600' }]}>Plan Weekly (W)</Text>
                                    {weekProgress.map((val, i) => (
                                        <Text key={i} style={[styles.tdCell, { width: 56, textAlign: 'center', color: text }]}>
                                            {val.toFixed(1)}%
                                        </Text>
                                    ))}
                                </View>
                                {/* Cumulative */}
                                <View style={[styles.tableRow, { backgroundColor: isDark ? '#1C1919' : '#FFF5F5' }]}>
                                    <Text style={[styles.tdCell, { width: 140, color: redAccent, fontWeight: '700' }]}>Plan Cumulative (C)</Text>
                                    {cumProgress.map((val, i) => (
                                        <Text key={i} style={[styles.tdCell, { width: 56, textAlign: 'center', color: redAccent, fontWeight: '700' }]}>
                                            {val.toFixed(1)}%
                                        </Text>
                                    ))}
                                </View>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </View>
        );
    };

    // ---------------------------------------------------------
    // Main Component Render
    // ---------------------------------------------------------
    return (
        <ScrollView contentContainerStyle={styles.container}>
            {/* Top Metric & Control Card */}
            {renderTopCard()}

            {/* Error or status notice */}
            {!!saveError && (
                <View style={[styles.alertBox, { backgroundColor: '#FF3B3015', borderColor: '#FF3B30' }]}>
                    <Ionicons name="alert-circle" size={16} color="#FF3B30" />
                    <Text style={{ color: '#FF3B30', fontSize: 12 }}>{saveError}</Text>
                </View>
            )}

            {!!saveMessage && (
                <View style={[styles.alertBox, { backgroundColor: '#34C75915', borderColor: '#34C759' }]}>
                    <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                    <Text style={{ color: '#34C759', fontSize: 12 }}>{saveMessage}</Text>
                </View>
            )}

            {/* Active View */}
            {viewMode === 'summary' && renderSummaryView()}
            {viewMode === 'timeline' && renderTimelineView()}
            {viewMode === 'gantt' && renderGanttView()}
            {viewMode === 'scurve' && renderSCurveView()}
        </ScrollView>
    );
}

// -------------------------------------------------------------
// Styles
// -------------------------------------------------------------

const styles = StyleSheet.create({
    container: {
        padding: 16,
        paddingBottom: 60
    },
    topCard: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
        marginBottom: 16,
        gap: 14
    },
    metricRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8
    },
    metricItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    metricLabel: {
        fontSize: 13,
        fontWeight: '500'
    },
    metricValue: {
        fontSize: 14,
        fontWeight: '700'
    },
    metricDivider: {
        width: 1,
        height: 16,
        marginHorizontal: 10
    },
    controlsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12
    },
    segmentedPillContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 999,
        padding: 3,
        gap: 2
    },
    segmentedButton: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: 'transparent'
    },
    segmentedButtonActive: {
        borderWidth: 1
    },
    segmentedButtonText: {
        fontSize: 12
    },
    timeScaleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },
    timeScaleLabel: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.5
    },
    tableContainer: {
        borderRadius: 12,
        borderWidth: 1,
        overflow: 'hidden'
    },
    tableHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        paddingVertical: 10,
        paddingHorizontal: 12
    },
    thCell: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.3
    },
    tableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        paddingVertical: 8,
        paddingHorizontal: 12,
        minHeight: 44
    },
    tdCell: {
        fontSize: 12
    },
    codeBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        borderWidth: 1
    },
    codeBadgeText: {
        fontSize: 11,
        fontWeight: '600'
    },
    taskTitleText: {
        fontSize: 13
    },
    dateInput: {
        height: 28,
        paddingHorizontal: 8,
        borderRadius: 6,
        borderWidth: 1,
        fontSize: 11,
        textAlign: 'center',
        width: 110
    },
    durationInput: {
        height: 28,
        paddingHorizontal: 6,
        borderRadius: 6,
        borderWidth: 1,
        fontSize: 11,
        textAlign: 'center',
        width: 48
    },
    timelineHeaderContainer: {
        flexDirection: 'row',
        borderBottomWidth: 1
    },
    fixedColsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 10
    },
    gridMonthHeaderRow: {
        flexDirection: 'row',
        borderBottomWidth: 1
    },
    gridMonthCell: {
        paddingVertical: 6,
        alignItems: 'center',
        justifyContent: 'center',
        borderRightWidth: 1
    },
    gridMonthText: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.5
    },
    gridWeekHeaderRow: {
        flexDirection: 'row'
    },
    gridWeekCell: {
        paddingVertical: 6,
        alignItems: 'center',
        justifyContent: 'center',
        borderRightWidth: 1
    },
    gridWeekText: {
        fontSize: 11,
        fontWeight: '600'
    },
    gridWeekSubText: {
        fontSize: 9,
        marginTop: 1
    },
    timelineRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        alignItems: 'center',
        minHeight: 40
    },
    fixedColsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8
    },
    timelineGridCell: {
        alignItems: 'center',
        justifyContent: 'center',
        borderRightWidth: 1,
        height: 40
    },
    timelineCellText: {
        fontSize: 11,
        fontWeight: '600'
    },
    summaryFooterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderTopWidth: 1,
        minHeight: 38
    },
    summaryFooterLabel: {
        fontSize: 12,
        fontWeight: '600',
        paddingLeft: 12
    },
    summaryFooterValue: {
        fontSize: 11,
        fontWeight: '600'
    },
    ganttBar: {
        position: 'absolute',
        justifyContent: 'center',
        paddingHorizontal: 6,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 3,
        elevation: 2
    },
    ganttBarText: {
        color: '#FFFFFF',
        fontSize: 9,
        fontWeight: '700'
    },
    scurveStatsRow: {
        flexDirection: 'row',
        gap: 12,
        flexWrap: 'wrap'
    },
    scurveStatCard: {
        flex: 1,
        minWidth: 200,
        borderRadius: 12,
        borderWidth: 1,
        padding: 14,
        gap: 4
    },
    scurveStatLabel: {
        fontSize: 12,
        fontWeight: '500'
    },
    scurveStatValue: {
        fontSize: 18,
        fontWeight: '700'
    },
    alertBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
        marginBottom: 12
    }
});
