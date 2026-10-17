import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    TextInput,
    Modal,
    ScrollView,
    Alert,
} from 'react-native';
import { GlassView } from '@/components/ui/GlassView';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { Ionicons } from '@expo/vector-icons';
import { Project, updateProjectApi, saveProjectMeta } from '@/lib/api/projects';
import { getTasks, updateTaskApi, getActions } from '@/lib/api/tasks';
import { computeProjectProgress, ProjectMilestone } from '@/lib/api/projectProgress';
import { SwiftUIAddMilestoneSheet } from '@/components/projects/SwiftUIAddMilestoneSheet';
import { SwiftUITaskDetailSheet } from '@/components/tasks/SwiftUITaskDetailSheet';
import { SwiftUIActionDetailSheet } from '@/components/actions/SwiftUIActionDetailSheet';
import { Task, Action } from '@/constants/MockData';
import { ProgressRing } from '@/components/ui/ProgressRing';
import ContextMenu from '@/components/ui/PlatformContextMenu';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

interface TrackingTabProps {
    project: Project;
    isDark: boolean;
    onRefresh?: () => void;
    onProgressChange?: (progress: number) => void;
}

const DEFAULT_MILESTONES: ProjectMilestone[] = [
    { id: 'm-1', title: 'Kickoff & Alignment', status: 'completed', targetDate: '15 Sep 2026', description: 'Initial briefing and stakeholder alignment' },
    { id: 'm-2', title: 'Design & Concept Review', status: 'in_progress', targetDate: '30 Sep 2026', description: 'Schematic review and design sign-off' },
    { id: 'm-3', title: 'Development & Execution', status: 'upcoming', targetDate: '15 Nov 2026', description: 'Core deliverables and implementation' },
    { id: 'm-4', title: 'Final Handover & Launch', status: 'upcoming', targetDate: '30 Nov 2026', description: 'Project acceptance and final delivery' },
];

export function TrackingTab({ project, isDark, onRefresh }: TrackingTabProps) {
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#636366';
    const cardBgColor = isDark ? '#1C1C1E' : '#FFFFFF';
    const cardBorderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)';
    const dividerColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)';
    const formaBlue = '#007AFF';

    // Tracking mode determination
    const rawTrackingMethod = project.meta?.trackingMethod || project.meta?.progressTracking || (project as any).progressTracking || 'tasks';
    const normalizedTracking = String(rawTrackingMethod).trim().toLowerCase();
    const isTrackingEnabled = !['none', 'disabled', 'no_progress', 'no progress'].includes(normalizedTracking);

    const isTrackingFromTasks = normalizedTracking === 'tasks' || normalizedTracking === 'from_tasks' || normalizedTracking === 'task';
    const isTrackingFromMilestones = normalizedTracking === 'milestones' || normalizedTracking === 'milestone' || normalizedTracking === 'from_milestones';
    const isTrackingManual = normalizedTracking === 'manual';

    // State
    const [tasks, setTasks] = useState<Task[]>([]);
    const [actions, setActions] = useState<Action[]>([]);
    const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
    const [loading, setLoading] = useState(true);
    const [localManualProgress, setLocalManualProgress] = useState<number | null>(null);

    // Selected Drawer State
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [selectedAction, setSelectedAction] = useState<Action | null>(null);

    // Filters
    const [taskFilter, setTaskFilter] = useState<'all' | 'active' | 'submitted' | 'revision' | 'done'>('active');
    const [actionFilter, setActionFilter] = useState<'all' | 'urgent' | 'pending' | 'returned' | 'completed'>('urgent');

    // Modals
    const [showAddMilestoneModal, setShowAddMilestoneModal] = useState(false);

    // Sync milestones immediately whenever project prop updates
    useEffect(() => {
        if (project.meta?.milestones && Array.isArray(project.meta.milestones)) {
            setMilestones(project.meta.milestones);
        }
    }, [project.meta?.milestones]);

    useEffect(() => {
        loadData(tasks.length > 0 || milestones.length > 0);
    }, [project.id]);

    const loadData = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            // Load Milestones from project meta
            let loadedMilestones: ProjectMilestone[] = [];
            if (project.meta?.milestones && Array.isArray(project.meta.milestones) && project.meta.milestones.length > 0) {
                loadedMilestones = project.meta.milestones;
            } else {
                // If brand new project, initialize with defaults
                loadedMilestones = DEFAULT_MILESTONES;
            }
            setMilestones(loadedMilestones);

            // Fetch Tasks & Actions
            const [allTasks, allActions] = await Promise.all([
                getTasks(project.workspaceId),
                getActions(project.workspaceId),
            ]);

            const pCode = project.code || 'PRJ';
            const pTitle = project.title || 'Project';

            // Filter for this project
            const projectTasks = allTasks.filter(
                t => t.projectId === project.id || (t.project && (t.project.id === project.id || (t.project as any).project_code === pCode || t.projectCode === pCode))
            );
            const projectActions = allActions.filter(
                a => a.projectId === project.id || (a.project && (a.project.id === project.id || (a.project as any).project_code === pCode || a.projectCode === pCode))
            );

            setTasks(projectTasks.length > 0 ? projectTasks : [
                {
                    id: 'pt-1',
                    title: 'Architectural 3D Schematic Modelling',
                    project: pTitle,
                    projectCode: pCode,
                    status: 'in_progress',
                    priority: 'high',
                    dueDate: '2026-10-15',
                    dueTime: '14:00',
                    description: 'Develop comprehensive 3D massing, exterior facade options, and sun path analysis.',
                    assignees: [
                        { id: 'u1', name: 'Alvin Pratama', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80' },
                        { id: 'u2', name: 'Rina Sasmita', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80' }
                    ],
                    subtasks: [
                        { id: 'st-1', title: 'Massing exploration', assignee: { name: 'Alvin Pratama' }, isDone: true },
                        { id: 'st-2', title: 'Exterior facade rendering', assignee: { name: 'Alvin Pratama' }, isDone: false }
                    ],
                },
                {
                    id: 'pt-2',
                    title: 'MEP & Structural Engineering Review',
                    project: pTitle,
                    projectCode: pCode,
                    status: 'todo',
                    priority: 'medium',
                    dueDate: '2026-10-28',
                    dueTime: '10:30',
                    description: 'Review structural grid alignments with plumbing and HVAC ducting layouts.',
                    assignees: [
                        { id: 'u2', name: 'Rina Sasmita', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80' }
                    ],
                },
                {
                    id: 'pt-3',
                    title: 'Bill of Quantities & Material Procurement',
                    project: pTitle,
                    projectCode: pCode,
                    status: 'revision',
                    priority: 'urgent',
                    dueDate: '2026-11-05',
                    dueTime: '17:00',
                    description: 'Revise supplier cost comparison and adjust steel tonnage per updated structural drawings.',
                    assignees: [
                        { id: 'u3', name: 'Budi Santoso', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80' }
                    ],
                    linkedModule: { target: 'finance', actionLabel: 'View Budget', route: '/finance' },
                },
                {
                    id: 'pt-4',
                    title: 'Site Workers Attendance & Overtime Signoff',
                    project: pTitle,
                    projectCode: pCode,
                    status: 'submitted',
                    priority: 'low',
                    dueDate: '2026-11-15',
                    description: 'Review and approve site shift attendance timesheets from Clock module.',
                    assignees: [
                        { id: 'u1', name: 'Alvin Pratama', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80' }
                    ],
                    linkedModule: { target: 'clock', actionLabel: 'Open Clock', route: '/clock' },
                },
                {
                    id: 'pt-5',
                    title: 'Final Acceptance & Authority Handover',
                    project: pTitle,
                    projectCode: pCode,
                    status: 'done',
                    priority: 'medium',
                    dueDate: '2026-11-30',
                    assignees: [
                        { id: 'u2', name: 'Rina Sasmita', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80' }
                    ],
                }
            ]);

            setActions(projectActions.length > 0 ? projectActions : [
                {
                    id: 'act-1',
                    title: 'Approve Material Submittal: Italian Travertine',
                    projectId: project.id,
                    projectCode: pCode,
                    status: 'PENDING_APPROVAL',
                    priority: 'urgent',
                    type: 'approval',
                    date: '18 Oct 2026',
                    description: 'Review physical stone test samples and architect signoff batch.',
                },
                {
                    id: 'act-2',
                    title: 'Review Change Order: Structural Footing Elevation',
                    projectId: project.id,
                    projectCode: pCode,
                    status: 'CHANGES_REQUESTED',
                    priority: 'high',
                    type: 'change_order',
                    date: '25 Oct 2026',
                    description: 'Soil bearing test indicates higher water table requiring reinforced raft adjustment.',
                },
                {
                    id: 'act-3',
                    title: 'Sign Off Site Inspection Checklist #14',
                    projectId: project.id,
                    projectCode: pCode,
                    status: 'PENDING_REVIEW',
                    priority: 'medium',
                    type: 'inspection',
                    date: '2 Nov 2026',
                    description: 'Weekly quality assurance walk-through with site supervisor.',
                },
                {
                    id: 'act-4',
                    title: 'Contract Variation Authorization (Electrical)',
                    projectId: project.id,
                    projectCode: pCode,
                    status: 'APPROVED',
                    priority: 'low',
                    type: 'approval',
                    date: '20 Nov 2026',
                }
            ]);
        } catch (error) {
            console.error('Error loading tracking tab data:', error);
        } finally {
            setLoading(false);
        }
    };

    const effectiveProject = useMemo(() => {
        if (localManualProgress !== null) {
            return {
                ...project,
                progress: localManualProgress,
                meta: {
                    ...(project.meta || {}),
                    progress: localManualProgress,
                },
            };
        }
        return project;
    }, [project, localManualProgress]);

    // Shared progress calculation
    const progressData = useMemo(() => {
        return computeProjectProgress(effectiveProject, tasks, milestones);
    }, [effectiveProject, tasks, milestones]);

    // Sync progress to DB helper
    const syncProgressToDb = useCallback(async (newProg: number) => {
        if (newProg !== project.progress) {
            await updateProjectApi(project.id, { progress: newProg });
            if (onRefresh) onRefresh();
        }
    }, [project.id, project.progress, onRefresh]);

    // Milestone Handlers
    const saveMilestonesToDb = async (updatedList: ProjectMilestone[]) => {
        setMilestones(updatedList);
        const nextMeta = {
            ...(project.meta || {}),
            milestones: updatedList,
        };
        await saveProjectMeta(project.id, nextMeta);
        if (onRefresh) onRefresh();
    };

    const handleCycleMilestoneStatus = (milestoneId: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const updated = milestones.map(m => {
            if (m.id === milestoneId) {
                const nextStatus: 'upcoming' | 'in_progress' | 'completed' =
                    m.status === 'upcoming' ? 'in_progress' :
                    m.status === 'in_progress' ? 'completed' : 'upcoming';
                return { ...m, status: nextStatus };
            }
            return m;
        });
        saveMilestonesToDb(updated);
    };

    const handleDeleteMilestone = (milestoneId: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const updated = milestones.filter(m => m.id !== milestoneId);
        saveMilestonesToDb(updated);
    };

    // Task Handlers
    const handleToggleTaskStatus = async (task: Task) => {
        Haptics.selectionAsync();
        const isDone = task.status === 'done' || task.status === 'completed';
        const nextStatus = isDone ? 'todo' : 'done';

        // Optimistic update
        setTasks(prev => prev.map(t => (t.id === task.id ? { ...t, status: nextStatus } : t)));

        try {
            await updateTaskApi(task.id, { status: nextStatus });
            if (onRefresh) onRefresh();
        } catch (err) {
            console.error('Failed to update task status:', err);
            loadData();
        }
    };

    // Native Alert.prompt for Manual Progress Edit
    const handleOpenManualProgressPrompt = () => {
        Haptics.selectionAsync();
        const currentProg = localManualProgress ?? (Number(project.meta?.progress) || Number(project.progress) || 0);
        Alert.prompt(
            'Set Project Progress',
            'Enter exact progress percentage (0 - 100%):',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Save',
                    onPress: async (text?: string) => {
                        if (text === undefined || text.trim() === '') return;
                        const parsed = parseFloat(text.replace(',', '.'));
                        if (isNaN(parsed) || parsed < 0 || parsed > 100) {
                            Alert.alert('Invalid Value', 'Please enter a valid percentage between 0 and 100.');
                            return;
                        }
                        const rounded = Math.round(parsed * 100) / 100;
                        setLocalManualProgress(rounded);
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        const nowFormatted = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                        const nextMeta = {
                            ...(project.meta || {}),
                            progress: rounded,
                            lastManualProgressUpdate: nowFormatted,
                        };
                        await saveProjectMeta(project.id, nextMeta);
                        await updateProjectApi(project.id, { progress: rounded, meta: nextMeta });
                        if (onRefresh) onRefresh();
                    },
                },
            ],
            'plain-text',
            String(currentProg),
            'decimal-pad'
        );
    };

    // Displayed lists (Max 5 items, sorted by deadline)
    const displayedMilestones = useMemo(() => {
        return milestones.slice(0, 5);
    }, [milestones]);

    // Filtered Tasks
    const filteredTasks = useMemo(() => {
        return tasks.filter(t => {
            const isDone = t.status === 'done' || t.status === 'completed';
            const isSubmitted = t.status === 'submitted' || t.status === 'in_review';
            const isRevision = t.status === 'revision' || t.status === 'changes_requested';
            const isActive = !isDone && !isSubmitted && !isRevision;

            if (taskFilter === 'active') return isActive;
            if (taskFilter === 'submitted') return isSubmitted;
            if (taskFilter === 'revision') return isRevision;
            if (taskFilter === 'done') return isDone;
            return true;
        });
    }, [tasks, taskFilter]);

    const displayedTasks = useMemo(() => {
        return [...filteredTasks]
            .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))
            .slice(0, 5);
    }, [filteredTasks]);

    // Filtered Actions
    const filteredActions = useMemo(() => {
        return actions.filter(a => {
            const isCompleted = a.status === 'COMPLETED' || a.status === 'APPROVED' || a.status === 'RESOLVED' || a.status === 'done';
            const isReturned = a.status === 'RETURNED' || a.status === 'REJECTED' || a.status === 'revision';
            const isUrgent = a.priority === 'urgent' || a.priority === 'high';
            const isPending = !isCompleted && !isReturned;

            if (actionFilter === 'urgent') return isUrgent;
            if (actionFilter === 'pending') return isPending;
            if (actionFilter === 'returned') return isReturned;
            if (actionFilter === 'completed') return isCompleted;
            return true;
        });
    }, [actions, actionFilter]);

    const displayedActions = useMemo(() => {
        return [...filteredActions]
            .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
            .slice(0, 5);
    }, [filteredActions]);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={formaBlue} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* 1. Project Progress Section (Hidden if No Progress) */}
            {isTrackingEnabled && (
                <View style={styles.sectionBlock}>
                    <View style={styles.sectionHeaderRow}>
                        <View style={styles.sectionHeaderLeft}>
                            <Text style={[styles.sectionTitleText, { color: textColor }]}>Project Progress</Text>
                        </View>
                        <Text style={[styles.sectionHeaderBadge, { color: subtextColor }]}>
                            {isTrackingManual ? 'Manual' : isTrackingFromTasks ? 'From Tasks' : 'From Milestones'}
                        </Text>
                    </View>

                    <View style={[styles.card, { backgroundColor: cardBgColor, borderColor: cardBorderColor }]}>
                        <TouchableOpacity
                            disabled={!isTrackingManual}
                            onPress={handleOpenManualProgressPrompt}
                            activeOpacity={isTrackingManual ? 0.7 : 1}
                            style={styles.progressCardRow}
                        >
                            {/* Left: Progress Ring (Donut visual indicator without duplicate text) */}
                            <ProgressRing
                                progress={progressData?.progressPercent || 0}
                                size={56}
                                strokeWidth={5}
                                showText={false}
                            />
                            
                            {/* Right: Primary Value, Status, Summary, and Secondary Metadata */}
                            <View style={styles.progressInfoCol}>
                                <View style={styles.progressValueRow}>
                                    <Text style={[styles.progressPrimaryText, { color: textColor }]}>
                                        {progressData?.displayPercent}
                                    </Text>
                                    <View style={[styles.statusBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}>
                                        <Text style={[styles.statusBadgeText, { color: progressData?.statusLabel === 'Complete' ? '#34C759' : (progressData?.progressPercent || 0) > 0 ? formaBlue : subtextColor }]}>
                                            {progressData?.statusLabel}
                                        </Text>
                                    </View>
                                    {isTrackingManual && (
                                        <Ionicons name="pencil" size={13} color={subtextColor} style={{ marginLeft: 'auto' }} />
                                    )}
                                </View>
                                
                                <Text style={[styles.progressSummaryText, { color: subtextColor }]} numberOfLines={2}>
                                    {progressData?.summaryText}
                                </Text>

                                {progressData?.secondaryText && (
                                    <Text style={[styles.progressSecondaryText, { color: subtextColor }]}>
                                        {progressData.secondaryText}
                                    </Text>
                                )}
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* 2. Milestones Section */}
            <View style={styles.sectionBlock}>
                <TouchableOpacity
                    onPress={() => {
                        Haptics.selectionAsync();
                        router.push(`/project-milestones/${project.id}` as any);
                    }}
                    activeOpacity={0.7}
                    style={styles.sectionHeaderRow}
                >
                    <View style={styles.sectionHeaderLeft}>
                        <Text style={[styles.sectionTitleText, { color: textColor }]}>Milestones</Text>
                        <Text style={[styles.sectionHeaderBadge, { color: subtextColor }]}>
                            {milestones.length}
                        </Text>
                        <Ionicons name="chevron-forward" size={16} color={subtextColor} />
                    </View>
                </TouchableOpacity>

                <View style={[styles.card, { backgroundColor: cardBgColor, borderColor: cardBorderColor }]}>
                    {displayedMilestones.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <PlatformIcon name="flag.fill" size={28} tintColor={subtextColor} />
                            <Text style={[styles.emptyTitle, { color: textColor }]}>No Milestones</Text>
                            <Text style={[styles.emptySubtitle, { color: subtextColor }]}>
                                Add major checkpoints such as Kickoff, Review, or Handover.
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.milestoneList}>
                            {displayedMilestones.map((m, idx) => {
                                const isDone = m.status === 'completed';
                                const isInProgress = m.status === 'in_progress';
                                const statusColor = isDone ? '#34C759' : isInProgress ? formaBlue : subtextColor;
                                const statusBg = isDone
                                    ? 'rgba(52, 199, 89, 0.12)'
                                    : isInProgress
                                    ? 'rgba(0, 122, 255, 0.12)'
                                    : 'rgba(142, 142, 147, 0.12)';

                                return (
                                    <View
                                        key={m.id || idx}
                                        style={[
                                            styles.milestoneRow,
                                            idx !== displayedMilestones.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: dividerColor }
                                        ]}
                                    >
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

                                        <TouchableOpacity
                                            activeOpacity={0.7}
                                            onPress={() => {
                                                Haptics.selectionAsync();
                                                router.push(`/project-milestones/${project.id}` as any);
                                            }}
                                            style={styles.milestoneContentCol}
                                        >
                                            <View style={styles.milestoneTitleRow}>
                                                <Text
                                                    numberOfLines={1}
                                                    style={[
                                                        styles.milestoneTitle,
                                                        { color: textColor },
                                                        isDone && styles.strikethroughText
                                                    ]}
                                                >
                                                    {m.title}
                                                </Text>
                                                <View style={[styles.milestoneStatusPill, { backgroundColor: statusBg }]}>
                                                    <Text style={[styles.milestoneStatusPillText, { color: statusColor }]}>
                                                        {isDone ? 'Completed' : isInProgress ? 'In Progress' : 'Upcoming'}
                                                    </Text>
                                                </View>
                                            </View>
                                            {m.targetDate && (
                                                <Text style={[styles.milestoneDate, { color: subtextColor }]}>
                                                    {m.targetDate}
                                                </Text>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </View>
            </View>

            {/* 3. Tasks Section */}
            <View style={styles.sectionBlock}>
                <View style={styles.sectionHeaderRow}>
                    <TouchableOpacity
                        onPress={() => {
                            Haptics.selectionAsync();
                            router.push(`/project-tasks/${project.id}` as any);
                        }}
                        activeOpacity={0.7}
                        style={styles.sectionHeaderLeft}
                    >
                        <Text style={[styles.sectionTitleText, { color: textColor }]}>Tasks</Text>
                        <Text style={[styles.sectionHeaderBadge, { color: subtextColor }]}>
                            {tasks.length}
                        </Text>
                        <Ionicons name="chevron-forward" size={16} color={subtextColor} />
                    </TouchableOpacity>

                    <ContextMenu
                        actions={[
                            { title: 'All', state: taskFilter === 'all' ? 'on' : 'off' },
                            { title: 'Active', state: taskFilter === 'active' ? 'on' : 'off' },
                            { title: 'Submitted', state: taskFilter === 'submitted' ? 'on' : 'off' },
                            { title: 'Revision', state: taskFilter === 'revision' ? 'on' : 'off' },
                            { title: 'Done', state: taskFilter === 'done' ? 'on' : 'off' },
                        ]}
                        dropdownMenuMode={true}
                        onPress={(e) => {
                            Haptics.selectionAsync();
                            const options: Array<'all' | 'active' | 'submitted' | 'revision' | 'done'> = ['all', 'active', 'submitted', 'revision', 'done'];
                            const selected = options[e.nativeEvent.index];
                            if (selected) setTaskFilter(selected);
                        }}
                    >
                        <View style={[styles.headerDropdownButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}>
                            <Text style={[styles.headerDropdownText, { color: textColor }]}>
                                {taskFilter === 'all' ? 'All' :
                                 taskFilter === 'active' ? 'Active' :
                                 taskFilter === 'submitted' ? 'Submitted' :
                                 taskFilter === 'revision' ? 'Revision' : 'Done'}
                            </Text>
                            <Ionicons name="chevron-down" size={12} color={subtextColor} />
                        </View>
                    </ContextMenu>
                </View>

                <View style={[styles.card, { backgroundColor: cardBgColor, borderColor: cardBorderColor }]}>
                    {displayedTasks.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <PlatformIcon name="checklist" size={28} tintColor={subtextColor} />
                            <Text style={[styles.emptyTitle, { color: textColor }]}>No Tasks Found</Text>
                            <Text style={[styles.emptySubtitle, { color: subtextColor }]}>
                                {taskFilter === 'done' ? 'No completed tasks yet.' : 'Create tasks linked to this project to track execution.'}
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.milestoneList}>
                            {displayedTasks.map((t, idx) => {
                                const isDone = t.status === 'done' || (t.status as string) === 'completed';
                                const isInProgress = t.status === 'in_progress';
                                const isSubmitted = t.status === 'submitted';
                                const isRevision = t.status === 'revision';

                                const statusColor = isDone ? '#34C759' : isRevision ? '#FF9500' : (isInProgress || isSubmitted) ? formaBlue : subtextColor;
                                const statusBg = isDone
                                    ? 'rgba(52, 199, 89, 0.12)'
                                    : isRevision
                                    ? 'rgba(255, 149, 0, 0.12)'
                                    : (isInProgress || isSubmitted)
                                    ? 'rgba(0, 122, 255, 0.12)'
                                    : 'rgba(142, 142, 147, 0.12)';

                                const statusLabel = isDone ? 'Done' : isRevision ? 'Revision' : isSubmitted ? 'Submitted' : isInProgress ? 'In Progress' : 'To-Do';

                                return (
                                    <TouchableOpacity
                                        key={t.id || idx}
                                        activeOpacity={0.7}
                                        onPress={() => {
                                            Haptics.selectionAsync();
                                            setSelectedTask(t);
                                        }}
                                        style={[
                                            styles.milestoneRow,
                                            idx !== displayedTasks.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: dividerColor }
                                        ]}
                                    >
                                        <View style={styles.milestoneStatusTouch}>
                                            <Ionicons
                                                name={isDone ? 'checkmark-circle' : isInProgress ? 'play-circle' : 'ellipse-outline'}
                                                size={20}
                                                color={statusColor}
                                            />
                                        </View>

                                        <View style={styles.milestoneContentCol}>
                                            <View style={styles.milestoneTitleRow}>
                                                <Text
                                                    numberOfLines={1}
                                                    style={[
                                                        styles.milestoneTitle,
                                                        { color: textColor },
                                                        isDone && styles.strikethroughText
                                                    ]}
                                                >
                                                    {t.title}
                                                </Text>
                                                <View style={[styles.milestoneStatusPill, { backgroundColor: statusBg }]}>
                                                    <Text style={[styles.milestoneStatusPillText, { color: statusColor }]}>
                                                        {statusLabel}
                                                    </Text>
                                                </View>
                                            </View>
                                            {t.dueDate && (
                                                <Text style={[styles.milestoneDate, { color: subtextColor }]}>
                                                    {t.dueDate.split('T')[0]}{t.dueTime ? `  •  ${t.dueTime}` : ''}
                                                </Text>
                                            )}
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}
                </View>
            </View>

            {/* 4. Actions Section */}
            <View style={styles.sectionBlock}>
                <View style={styles.sectionHeaderRow}>
                    <TouchableOpacity
                        onPress={() => {
                            Haptics.selectionAsync();
                            router.push(`/project-actions/${project.id}` as any);
                        }}
                        activeOpacity={0.7}
                        style={styles.sectionHeaderLeft}
                    >
                        <Text style={[styles.sectionTitleText, { color: textColor }]}>Actions</Text>
                        <Text style={[styles.sectionHeaderBadge, { color: subtextColor }]}>
                            {actions.length}
                        </Text>
                        <Ionicons name="chevron-forward" size={16} color={subtextColor} />
                    </TouchableOpacity>

                    <ContextMenu
                        actions={[
                            { title: 'All', state: actionFilter === 'all' ? 'on' : 'off' },
                            { title: 'Urgent', state: actionFilter === 'urgent' ? 'on' : 'off' },
                            { title: 'Pending', state: actionFilter === 'pending' ? 'on' : 'off' },
                            { title: 'Returned', state: actionFilter === 'returned' ? 'on' : 'off' },
                            { title: 'Done', state: actionFilter === 'completed' ? 'on' : 'off' },
                        ]}
                        dropdownMenuMode={true}
                        onPress={(e) => {
                            Haptics.selectionAsync();
                            const options: Array<'all' | 'urgent' | 'pending' | 'returned' | 'completed'> = ['all', 'urgent', 'pending', 'returned', 'completed'];
                            const selected = options[e.nativeEvent.index];
                            if (selected) setActionFilter(selected);
                        }}
                    >
                        <View style={[styles.headerDropdownButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}>
                            <Text style={[styles.headerDropdownText, { color: textColor }]}>
                                {actionFilter === 'all' ? 'All' :
                                 actionFilter === 'urgent' ? 'Urgent' :
                                 actionFilter === 'pending' ? 'Pending' :
                                 actionFilter === 'returned' ? 'Returned' : 'Done'}
                            </Text>
                            <Ionicons name="chevron-down" size={12} color={subtextColor} />
                        </View>
                    </ContextMenu>
                </View>

                <View style={[styles.card, { backgroundColor: cardBgColor, borderColor: cardBorderColor }]}>
                    {displayedActions.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <PlatformIcon name="bolt.horizontal.fill" size={28} tintColor={subtextColor} />
                            <Text style={[styles.emptyTitle, { color: textColor }]}>No Actions Linked</Text>
                            <Text style={[styles.emptySubtitle, { color: subtextColor }]}>
                                Action items created across modules for this project will appear here.
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.milestoneList}>
                            {displayedActions.map((act, idx) => {
                                const isResolved = act.status === 'COMPLETED' || act.status === 'APPROVED' || act.status === 'RESOLVED' || act.status === 'done';
                                const isUrgent = act.priority === 'urgent' || act.priority === 'high';
                                const isReturned = act.status === 'RETURNED' || act.status === 'REJECTED' || act.status === 'CHANGES_REQUESTED';

                                const statusColor = isResolved ? '#34C759' : isReturned ? '#FF453A' : isUrgent ? '#FF9500' : formaBlue;
                                const statusBg = isResolved
                                    ? 'rgba(52, 199, 89, 0.12)'
                                    : isReturned
                                    ? 'rgba(255, 69, 58, 0.12)'
                                    : isUrgent
                                    ? 'rgba(255, 149, 0, 0.12)'
                                    : 'rgba(0, 122, 255, 0.12)';

                                const statusLabel = isResolved ? 'Done' : isReturned ? 'Returned' : isUrgent ? 'Urgent' : 'Pending';

                                return (
                                    <TouchableOpacity
                                        key={act.id || idx}
                                        activeOpacity={0.7}
                                        onPress={() => {
                                            Haptics.selectionAsync();
                                            setSelectedAction(act);
                                        }}
                                        style={[
                                            styles.milestoneRow,
                                            idx !== displayedActions.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: dividerColor }
                                        ]}
                                    >
                                        <View style={styles.milestoneStatusTouch}>
                                            <Ionicons
                                                name={isResolved ? 'checkmark-circle' : 'flash'}
                                                size={18}
                                                color={statusColor}
                                            />
                                        </View>

                                        <View style={styles.milestoneContentCol}>
                                            <View style={styles.milestoneTitleRow}>
                                                <Text
                                                    numberOfLines={1}
                                                    style={[
                                                        styles.milestoneTitle,
                                                        { color: textColor },
                                                        isResolved && styles.strikethroughText
                                                    ]}
                                                >
                                                    {act.title}
                                                </Text>
                                                <View style={[styles.milestoneStatusPill, { backgroundColor: statusBg }]}>
                                                    <Text style={[styles.milestoneStatusPillText, { color: statusColor }]}>
                                                        {statusLabel}
                                                    </Text>
                                                </View>
                                            </View>
                                            {act.date && (
                                                <Text style={[styles.milestoneDate, { color: subtextColor }]}>
                                                    {act.date}
                                                </Text>
                                            )}
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}
                </View>
            </View>

            {/* Task Detail Sheet */}
            <SwiftUITaskDetailSheet
                isOpened={!!selectedTask}
                onClose={() => setSelectedTask(null)}
                task={selectedTask}
                setTasks={setTasks}
                onTaskUpdated={() => {
                    loadData(true);
                    if (onRefresh) onRefresh();
                }}
            />

            {/* Action Detail Sheet */}
            <SwiftUIActionDetailSheet
                isOpened={!!selectedAction}
                onClose={() => setSelectedAction(null)}
                action={selectedAction}
                onStatusChange={(id, nextStatus) => {
                    setActions(prev => prev.map(a => a.id === id ? { ...a, status: nextStatus } : a));
                    loadData(true);
                    if (onRefresh) onRefresh();
                }}
            />

            {/* Add Milestone Sheet */}
            <SwiftUIAddMilestoneSheet
                isOpened={showAddMilestoneModal}
                onClose={() => setShowAddMilestoneModal(false)}
                onSave={() => {
                    loadData();
                    if (onRefresh) onRefresh();
                }}
                defaultProjectId={project.id}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: 16,
    },
    loadingContainer: {
        paddingVertical: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionBlock: {
        gap: 8,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
        paddingVertical: 2,
    },
    sectionHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    sectionTitleText: {
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    sectionHeaderBadge: {
        fontSize: 13,
        fontWeight: '500',
    },
    addButtonTouch: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    addButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    card: {
        borderRadius: 24,
        padding: 16,
        borderWidth: 1,
    },
    progressCardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    progressInfoCol: {
        flex: 1,
        gap: 4,
    },
    progressValueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    progressPrimaryText: {
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    statusBadge: {
        paddingHorizontal: 9,
        paddingVertical: 3,
        borderRadius: 999,
    },
    statusBadgeText: {
        fontSize: 12,
        fontWeight: '600',
    },
    progressSummaryText: {
        fontSize: 13,
        fontWeight: '400',
        lineHeight: 18,
    },
    progressSecondaryText: {
        fontSize: 11,
        fontWeight: '500',
        marginTop: 1,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
        gap: 6,
    },
    emptyTitle: {
        fontSize: 15,
        fontWeight: '600',
    },
    emptySubtitle: {
        fontSize: 12,
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    milestoneList: {
        gap: 2,
    },
    milestoneRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 10,
        gap: 10,
    },
    milestoneStatusTouch: {
        marginTop: 1,
    },
    milestoneContentCol: {
        flex: 1,
        gap: 2,
    },
    milestoneTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    milestoneTitle: {
        fontSize: 14,
        fontWeight: '600',
        lineHeight: 18,
        flex: 1,
    },
    milestoneStatusPill: {
        paddingHorizontal: 8,
        paddingVertical: 2.5,
        borderRadius: 999,
        alignSelf: 'flex-start',
    },
    milestoneStatusPillText: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.1,
    },
    milestoneDate: {
        fontSize: 11,
        fontWeight: '500',
        marginTop: 1,
    },
    strikethroughText: {
        textDecorationLine: 'line-through',
        opacity: 0.6,
    },
    filterPillsRow: {
        flexDirection: 'row',
        gap: 6,
        paddingHorizontal: 4,
        paddingVertical: 2,
    },
    filterPill: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
    },
    filterPillText: {
        fontSize: 12,
        fontWeight: '600',
    },
    taskList: {
        gap: 2,
    },
    taskRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        gap: 10,
    },
    taskCheckboxTouch: {
        padding: 2,
    },
    taskContentCol: {
        flex: 1,
        gap: 4,
    },
    taskTitle: {
        fontSize: 14,
        fontWeight: '500',
    },
    taskMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    priorityTag: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    priorityTagText: {
        fontSize: 10,
        fontWeight: '700',
    },
    taskDueDate: {
        fontSize: 11,
    },
    actionList: {
        gap: 2,
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        gap: 10,
    },
    actionIconBox: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionContentCol: {
        flex: 1,
        gap: 2,
    },
    actionTitle: {
        fontSize: 14,
        fontWeight: '600',
    },
    actionMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    actionStatusText: {
        fontSize: 11,
        fontWeight: '700',
    },
    actionDateText: {
        fontSize: 11,
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    modalCard: {
        width: '100%',
        maxWidth: 380,
        borderRadius: 24,
        padding: 20,
        gap: 12,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    modalDesc: {
        fontSize: 13,
        marginBottom: 4,
    },
    modalInput: {
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 14,
    },
    modalButtonsRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 8,
        marginTop: 8,
    },
    modalButton: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    headerDropdownButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        gap: 4,
    },
    headerDropdownText: {
        fontSize: 13,
        fontWeight: '600',
    },
});
