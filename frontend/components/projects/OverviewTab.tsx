import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { GlassView } from '@/components/ui/GlassView';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { Ionicons } from '@expo/vector-icons';
import { getProjectStats, Project } from '@/lib/api/projects';
import { fetchProjectTypes, ProjectTypeTemplate } from '@/lib/api/templates';
import { getTasks } from '@/lib/api/tasks';
import { computeProjectProgress, ProjectMilestone } from '@/lib/api/projectProgress';
import { Task } from '@/constants/MockData';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

interface OverviewTabProps {
    project: Project;
    isDark: boolean;
    isPinned: boolean;
    setIsPinned: (pinned: boolean) => void;
    onSelectTab?: (tabId: string) => void;
    onRefresh?: () => void;
    onProgressChange?: (progress: number) => void;
    isPreview?: boolean;
    onOpenSetupModule?: (moduleId: string) => void;
}

const TYPOLOGY_MAP: Record<string, string> = {
    clt: 'Client Project',
    client: 'Client Project',
    int: 'Internal Project',
    in: 'Internal Project',
    internal: 'Internal Project',
    res: 'Residential',
    residential: 'Residential',
    com: 'Commercial',
    commercial: 'Commercial',
    hosp: 'Hospitality',
    hospitality: 'Hospitality',
    edu: 'Education',
    education: 'Education',
    mixed: 'Mixed-Use',
    master: 'Master Planning',
    infra: 'Infrastructure',
    pub: 'Public Sector',
    gov: 'Government',
};

function resolveProjectTypeName(rawType?: string, fetchedTypes: ProjectTypeTemplate[] = []): string {
    if (!rawType) return 'Client Project';
    const trimmed = rawType.trim();
    const lower = trimmed.toLowerCase();

    const matched = fetchedTypes.find(
        (t) =>
            t.code?.toLowerCase() === lower ||
            t.name?.toLowerCase() === lower ||
            t.id?.toLowerCase() === lower
    );
    if (matched) return matched.name;

    if (TYPOLOGY_MAP[lower]) return TYPOLOGY_MAP[lower];

    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function formatDateDisplay(dateVal?: any): string {
    if (!dateVal) return '';
    try {
        const d = new Date(dateVal);
        if (isNaN(d.getTime())) return String(dateVal);
        return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
        return String(dateVal);
    }
}

function formatTrackingMethod(method?: string): string {
    if (!method) return 'From Tasks';
    const lower = method.trim().toLowerCase();
    if (lower === 'tasks' || lower === 'from_tasks' || lower === 'task') return 'From Tasks';
    if (lower === 'milestones' || lower === 'milestone' || lower === 'from_milestones') return 'From Milestones';
    if (lower === 'manual') return 'Manual';
    if (lower === 'wbs' || lower === 'phases' || lower === 'stage' || lower === 'stages') return 'From Phases';
    if (lower === 'none' || lower === 'disabled' || lower === 'no_progress' || lower === 'no progress') return 'No Progress';
    return method;
}

function getRoleRank(role?: string): number {
    if (!role) return 2;
    const lower = role.toLowerCase();
    if (lower.includes('lead')) return 0;
    if (lower.includes('admin') || lower.includes('manager')) return 1;
    if (lower.includes('viewer') || lower.includes('guest')) return 3;
    return 2;
}

export function OverviewTab({ project, isDark, isPinned, setIsPinned, onSelectTab, onRefresh, isPreview = false, onOpenSetupModule }: OverviewTabProps) {
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#636366';
    const cardBgColor = isDark ? '#1C1C1E' : '#FFFFFF';
    const cardBorderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)';
    const dividerColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)';
    const dotColor = isDark ? '#30D158' : '#34C759';

    const [statsData, setStatsData] = useState({
        activeTasks: 0,
        openActions: 0,
        documents: 0,
        projectMembers: 0,
    });
    const [projectTypes, setProjectTypes] = useState<ProjectTypeTemplate[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);

    const wsId = project.workspaceId || 'f39364e8-1376-4ff7-a716-78277e8d25b3';

    useEffect(() => {
        loadData();
    }, [project.id, project.code, project.meta]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [statsRes, typesRes, allTasks] = await Promise.all([
                getProjectStats(project.id, project.code),
                fetchProjectTypes(wsId),
                getTasks(project.workspaceId)
            ]);
            if (statsRes) {
                setStatsData({
                    activeTasks: statsRes.activeTasks || 0,
                    openActions: statsRes.openActions || 0,
                    documents: statsRes.documents || 0,
                    projectMembers: statsRes.projectMembers || 0,
                });
            }
            if (typesRes) {
                setProjectTypes(typesRes);
            }
            if (allTasks) {
                const projectTasks = allTasks.filter(
                    t => t.projectId === project.id || (t.project && (t.project.id === project.id || (t.project as any).project_code === project.code))
                );
                setTasks(projectTasks);
            }
        } catch (e) {
            console.error('Error loading overview data:', e);
        } finally {
            setLoading(false);
        }
    };

    // Shared progress calculation model
    const progressState = useMemo(() => {
        const milestones: ProjectMilestone[] = project.meta?.milestones || [];
        return computeProjectProgress(project, tasks, milestones);
    }, [project, tasks]);

    // Team members strictly from project setup (project.meta.members)
    const teamMembers = useMemo(() => {
        if (project.meta?.members && Array.isArray(project.meta.members) && project.meta.members.length > 0) {
            return project.meta.members;
        }
        return [];
    }, [project.meta]);

    // Team members sorted: Project Lead first -> Roles -> Alphabetical
    const sortedTeamMembers = useMemo(() => {
        return [...teamMembers].sort((a, b) => {
            const rankA = getRoleRank(a.projectRole || a.role);
            const rankB = getRoleRank(b.projectRole || b.role);
            if (rankA !== rankB) return rankA - rankB;
            return (a.name || '').localeCompare(b.name || '');
        });
    }, [teamMembers]);

    const displayedTeamMembers = sortedTeamMembers.slice(0, 10);
    const remainingTeamCount = Math.max(0, sortedTeamMembers.length - 10);

    // 4 Default Universal Stat cards (Static / Non-clickable)
    const stats = [
        {
            id: 'tasks',
            label: 'Active Tasks',
            value: loading ? '...' : String(statsData.activeTasks),
            icon: 'checkbox-outline',
        },
        {
            id: 'actions',
            label: 'Open Actions',
            value: loading ? '...' : String(statsData.openActions),
            icon: 'flash-outline',
        },
        {
            id: 'docs',
            label: 'Documents',
            value: loading ? '...' : String(statsData.documents),
            icon: 'document-text-outline',
        },
        {
            id: 'members',
            label: 'Project Members',
            value: loading ? '...' : String(teamMembers.length || statsData.projectMembers),
            icon: 'people-outline',
        },
    ];

    // Project Info Computed Values
    const projectNumber = project.number || '-';
    const projectCode = project.code || '-';
    const rawProjectType = project.meta?.projectType || project.meta?.typology || project.meta?.type;
    const projectTypeName = resolveProjectTypeName(rawProjectType, projectTypes);

    const statusText = project.status ? (project.status.charAt(0).toUpperCase() + project.status.slice(1)) : 'Planning';
    const trackingDisplay = progressState.trackingDisplay;
    const isTrackingEnabled = progressState.isTrackingEnabled;

    const startDateRaw = project.meta?.startDate || (project as any).startDate;
    const startDateDisplay = formatDateDisplay(startDateRaw) || '-';

    const targetDateRaw = project.meta?.targetDate || (project as any).targetDate;
    const targetDateDisplay = targetDateRaw ? (formatDateDisplay(targetDateRaw) || 'Open Project') : 'Open Project';

    // Project Lead name derivation
    const projectLeadName = useMemo(() => {
        if (project.meta?.projectLeadName) return project.meta.projectLeadName;
        if (project.meta?.projectLead) return project.meta.projectLead;
        if ((project as any).lead) return (project as any).lead;
        const leadFromMembers = teamMembers.find(m => m.projectRole === 'Project Lead');
        if (leadFromMembers) return leadFromMembers.name;
        const leadId = project.meta?.projectLeadId;
        if (leadId && teamMembers.length > 0) {
            const found = teamMembers.find(m => m.id === leadId || m.userId === leadId);
            if (found) return found.name;
        }
        return '-';
    }, [project.meta, teamMembers]);

    // Progress percentage
    const progressPercent = progressState.progressPercent || 0;

    // Recent activities (3-5 latest activities)
    const recentActivities = useMemo(() => {
        if (project.meta?.activities && Array.isArray(project.meta.activities)) {
            return project.meta.activities.slice(0, 5);
        }
        return [];
    }, [project.meta]);

    const handleToggleFavorite = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setIsPinned(!isPinned);
    };

    // Linked Modules (matching MenuGrid names and icons)
    const linkedModules = [
        {
            id: 'finance',
            name: 'Finance',
            icon: 'creditcard.fill',
        },
        {
            id: 'resources',
            name: 'Resources',
            icon: 'archivebox.fill',
        },
        {
            id: 'people',
            name: 'People',
            icon: 'person.2.fill',
        },
        {
            id: 'clock',
            name: 'Clock',
            icon: 'clock.fill',
        },
        {
            id: 'report',
            name: 'Report',
            icon: 'doc.text.fill',
        },
    ];

    const [infoContainerWidth, setInfoContainerWidth] = useState(0);
    const isThreeCol = infoContainerWidth >= 500;
    const infoColWidth = isThreeCol ? '33.333%' : '50%';

    return (
        <View style={styles.container}>
            {/* 1. Stat Cards (Full width grid across container) */}
            <View style={styles.statsGrid}>
                {stats.map((stat, idx) => (
                    <View key={stat.id || idx} style={styles.statCardWrapper}>
                        <View style={[styles.statCard, { backgroundColor: cardBgColor, borderColor: cardBorderColor }]}>
                            <View style={styles.statTopRow}>
                                <Ionicons name={stat.icon as any} size={18} color={subtextColor} />
                                <Text style={[styles.statValue, { color: textColor }]}>{stat.value}</Text>
                            </View>
                            <Text style={[styles.statLabel, { color: subtextColor }]} numberOfLines={1}>{stat.label}</Text>
                        </View>
                    </View>
                ))}
            </View>

            {/* 2. Project Info Section */}
            <View style={styles.sectionBlock}>
                {isPreview ? (
                    <View style={styles.sectionHeaderRow}>
                        <Text style={[styles.sectionTitleText, { color: textColor }]}>Project Info</Text>
                    </View>
                ) : (
                    <TouchableOpacity
                        onPress={() => {
                            Haptics.selectionAsync();
                            if (onOpenSetupModule) {
                                onOpenSetupModule('general_settings');
                            } else {
                                router.push(`/project-setup/${project.id}/general` as any);
                            }
                        }}
                        activeOpacity={0.7}
                        style={styles.sectionHeaderRow}
                    >
                        <View style={styles.sectionHeaderLeft}>
                            <Text style={[styles.sectionTitleText, { color: textColor }]}>Project Info</Text>
                            <Ionicons name="chevron-forward" size={16} color={subtextColor} />
                        </View>
                    </TouchableOpacity>
                )}

                <View
                    style={[styles.card, { backgroundColor: cardBgColor, borderColor: cardBorderColor }]}
                    onLayout={(e) => setInfoContainerWidth(e.nativeEvent.layout.width)}
                >
                    <View style={styles.infoGrid}>
                        {/* Project Number */}
                        <View style={[styles.infoCol, { width: infoColWidth }]}>
                            <Text style={[styles.infoLabel, { color: subtextColor }]}>Project Number</Text>
                            <Text style={[styles.infoValue, { color: textColor }]}>{projectNumber}</Text>
                        </View>

                        {/* Project Code */}
                        <View style={[styles.infoCol, { width: infoColWidth }]}>
                            <Text style={[styles.infoLabel, { color: subtextColor }]}>Project Code</Text>
                            <Text style={[styles.infoValue, { color: textColor }]}>{projectCode}</Text>
                        </View>

                        {/* Project Type */}
                        <View style={[styles.infoCol, { width: infoColWidth }]}>
                            <Text style={[styles.infoLabel, { color: subtextColor }]}>Project Type</Text>
                            <Text style={[styles.infoValue, { color: textColor }]}>{projectTypeName}</Text>
                        </View>

                        {/* Status */}
                        <View style={[styles.infoCol, { width: infoColWidth }]}>
                            <Text style={[styles.infoLabel, { color: subtextColor }]}>Status</Text>
                            <View style={styles.statusRow}>
                                <View style={[styles.statusDot, { backgroundColor: dotColor }]} />
                                <Text style={[styles.infoValue, { color: textColor }]}>{statusText}</Text>
                            </View>
                        </View>

                        {/* Progress Tracking */}
                        <View style={[styles.infoCol, { width: infoColWidth }]}>
                            <Text style={[styles.infoLabel, { color: subtextColor }]}>Progress Tracking</Text>
                            <Text style={[styles.infoValue, { color: textColor }]}>{trackingDisplay}</Text>
                        </View>

                        {/* Project Lead */}
                        <View style={[styles.infoCol, { width: infoColWidth }]}>
                            <Text style={[styles.infoLabel, { color: subtextColor }]}>Project Lead</Text>
                            <Text style={[styles.infoValue, { color: textColor }]}>{projectLeadName}</Text>
                        </View>

                        {/* Start Date */}
                        <View style={[styles.infoCol, { width: infoColWidth }]}>
                            <Text style={[styles.infoLabel, { color: subtextColor }]}>Start Date</Text>
                            <Text style={[styles.infoValue, { color: textColor }]}>{startDateDisplay}</Text>
                        </View>

                        {/* Target Date */}
                        <View style={[styles.infoCol, { width: infoColWidth }]}>
                            <Text style={[styles.infoLabel, { color: subtextColor }]}>Target Date</Text>
                            <Text style={[styles.infoValue, { color: textColor }]}>{targetDateDisplay}</Text>
                        </View>

                        {/* Favorite */}
                        <View style={[styles.infoCol, { width: isThreeCol ? infoColWidth : '100%', marginTop: isThreeCol ? 0 : 2 }]}>
                            <Text style={[styles.infoLabel, { color: subtextColor }]}>Favorite</Text>
                            {isPreview ? (
                                <View style={styles.favoriteRow}>
                                    <Ionicons
                                        name={isPinned ? 'star' : 'star-outline'}
                                        size={16}
                                        color={isPinned ? '#FFCC00' : subtextColor}
                                    />
                                    <Text style={[styles.favoriteText, { color: isPinned ? (isDark ? '#FFD60A' : '#D97706') : textColor }]}>
                                        {isPinned ? 'Favorite' : 'No'}
                                    </Text>
                                </View>
                            ) : (
                                <TouchableOpacity
                                    onPress={handleToggleFavorite}
                                    activeOpacity={0.7}
                                    style={styles.favoriteRow}
                                >
                                    <Ionicons
                                        name={isPinned ? 'star' : 'star-outline'}
                                        size={16}
                                        color={isPinned ? '#FFCC00' : subtextColor}
                                    />
                                    <Text style={[styles.favoriteText, { color: isPinned ? (isDark ? '#FFD60A' : '#D97706') : textColor }]}>
                                        {isPinned ? 'Favorite' : 'No'}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>
            </View>

            {/* 3. Project Progress Section (when enabled) */}
            {isTrackingEnabled && (
                <View style={styles.sectionBlock}>
                    {isPreview ? (
                        <View style={styles.sectionHeaderRow}>
                            <Text style={[styles.sectionTitleText, { color: textColor }]}>Project Progress</Text>
                        </View>
                    ) : (
                        <TouchableOpacity
                            onPress={() => {
                                Haptics.selectionAsync();
                                if (onSelectTab) onSelectTab('work');
                            }}
                            activeOpacity={0.7}
                            style={styles.sectionHeaderRow}
                        >
                            <View style={styles.sectionHeaderLeft}>
                                <Text style={[styles.sectionTitleText, { color: textColor }]}>Project Progress</Text>
                                <Ionicons name="chevron-forward" size={16} color={subtextColor} />
                            </View>
                        </TouchableOpacity>
                    )}

                    <View style={[styles.card, { backgroundColor: cardBgColor, borderColor: cardBorderColor }]}>
                        <View style={styles.progressTopRow}>
                            <Text style={[styles.progressSubtitle, { color: subtextColor }]}>Tracking mode: {trackingDisplay}</Text>
                            <Text style={[styles.progressPercentText, { color: textColor }]}>{progressState.displayPercent}</Text>
                        </View>

                        <View style={[styles.progressBarTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                            {progressPercent > 0 && (
                                <View style={[styles.progressBarFill, { width: `${Math.min(100, Math.max(0, progressPercent))}%`, backgroundColor: '#0036F8' }]} />
                            )}
                        </View>

                        <View style={styles.progressBottomRow}>
                            <Text style={[styles.progressSubtitle, { color: subtextColor }]}>
                                {progressState.statusLabel}
                            </Text>
                        </View>
                    </View>
                </View>
            )}

            {/* 4. Project Team Section */}
            <View style={styles.sectionBlock}>
                {isPreview ? (
                    <View style={styles.sectionHeaderRow}>
                        <Text style={[styles.sectionTitleText, { color: textColor }]}>Project Team</Text>
                        {sortedTeamMembers.length > 0 && (
                            <Text style={[styles.sectionHeaderBadge, { color: subtextColor }]}>
                                {sortedTeamMembers.length} members
                            </Text>
                        )}
                    </View>
                ) : (
                    <TouchableOpacity
                        onPress={() => {
                            Haptics.selectionAsync();
                            if (onOpenSetupModule) {
                                onOpenSetupModule('team_members');
                            } else {
                                router.push(`/project-setup/${project.id}/team` as any);
                            }
                        }}
                        activeOpacity={0.7}
                        style={styles.sectionHeaderRow}
                    >
                        <View style={styles.sectionHeaderLeft}>
                            <Text style={[styles.sectionTitleText, { color: textColor }]}>Project Team</Text>
                            <Ionicons name="chevron-forward" size={16} color={subtextColor} />
                        </View>
                        {sortedTeamMembers.length > 0 && (
                            <Text style={[styles.sectionHeaderBadge, { color: subtextColor }]}>
                                {sortedTeamMembers.length} members
                            </Text>
                        )}
                    </TouchableOpacity>
                )}

                <View style={[styles.card, { backgroundColor: cardBgColor, borderColor: cardBorderColor }]}>
                    <View style={styles.teamList}>
                        {displayedTeamMembers.length === 0 ? (
                            <Text style={[styles.emptyText, { color: subtextColor }]}>
                                No team members assigned yet.
                            </Text>
                        ) : (
                            displayedTeamMembers.map((member, idx) => (
                                <View
                                    key={member.id || idx}
                                    style={[
                                        styles.teamRow,
                                        idx !== displayedTeamMembers.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: dividerColor }
                                    ]}
                                >
                                    <Text style={[styles.teamMemberName, { color: textColor }]}>{member.name}</Text>
                                    <Text style={[styles.teamMemberRole, { color: subtextColor }]}>
                                        {member.projectRole || member.role || 'Member'}
                                    </Text>
                                </View>
                            ))
                        )}

                        {remainingTeamCount > 0 && (
                            <TouchableOpacity
                                onPress={() => {
                                    Haptics.selectionAsync();
                                    if (onOpenSetupModule) {
                                        onOpenSetupModule('team_members');
                                    } else {
                                        router.push(`/project-setup/${project.id}/team` as any);
                                    }
                                }}
                                activeOpacity={0.7}
                                style={[styles.viewAllButton, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: dividerColor }]}
                            >
                                <Text style={[styles.viewAllText, { color: '#0036F8' }]}>
                                    View All ({remainingTeamCount} more)
                                </Text>
                                <Ionicons name="arrow-forward" size={14} color="#0036F8" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>

            {/* 5. Recent Activity Section */}
            <View style={styles.sectionBlock}>
                {isPreview ? (
                    <View style={styles.sectionHeaderRow}>
                        <Text style={[styles.sectionTitleText, { color: textColor }]}>Recent Activity</Text>
                    </View>
                ) : (
                    <TouchableOpacity
                        onPress={() => {
                            Haptics.selectionAsync();
                            if (onSelectTab) onSelectTab('activity');
                        }}
                        activeOpacity={0.7}
                        style={styles.sectionHeaderRow}
                    >
                        <View style={styles.sectionHeaderLeft}>
                            <Text style={[styles.sectionTitleText, { color: textColor }]}>Recent Activity</Text>
                            <Ionicons name="chevron-forward" size={16} color={subtextColor} />
                        </View>
                    </TouchableOpacity>
                )}

                <View style={[styles.card, { backgroundColor: cardBgColor, borderColor: cardBorderColor }]}>
                    {recentActivities.length === 0 ? (
                        <Text style={[styles.emptyText, { color: subtextColor }]}>
                            No recent activity recorded.
                        </Text>
                    ) : (
                        <View style={styles.activityList}>
                            {recentActivities.map((act: any, idx: number) => (
                                <View
                                    key={act.id || idx}
                                    style={[
                                        styles.activityItem,
                                        idx !== recentActivities.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: dividerColor }
                                    ]}
                                >
                                    <View style={styles.activityHeader}>
                                        <Text style={[styles.activityAuthor, { color: textColor }]}>{act.authorName || 'Team Member'}</Text>
                                        <Text style={[styles.activityTime, { color: subtextColor }]}>{act.timestamp || ''}</Text>
                                    </View>
                                    <Text style={[styles.activityDesc, { color: subtextColor }]} numberOfLines={2}>
                                        {act.description || act.title || ''}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            </View>

            {/* 6. Linked Modules Section (Hidden in Preview Mode) */}
            {!isPreview && (
                <View style={styles.sectionBlock}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={[styles.sectionTitleText, { color: textColor }]}>Linked Modules</Text>
                    </View>

                    <View style={[styles.card, { backgroundColor: cardBgColor, borderColor: cardBorderColor }]}>
                        <View style={styles.modulesList}>
                            {linkedModules.map((mod, idx) => (
                                <TouchableOpacity
                                    key={mod.id}
                                    onPress={() => {
                                        Haptics.selectionAsync();
                                    }}
                                    activeOpacity={0.7}
                                    style={[
                                        styles.moduleRow,
                                        idx !== linkedModules.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: dividerColor }
                                    ]}
                                >
                                    <View style={[styles.moduleIconBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}>
                                        <PlatformIcon name={mod.icon as any} size={18} tintColor={textColor} />
                                    </View>
                                    <Text style={[styles.moduleName, { color: textColor }]}>{mod.name}</Text>
                                    <Ionicons name="chevron-forward" size={15} color={subtextColor} />
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: 16,
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 10,
        width: '100%',
    },
    statCardWrapper: {
        flex: 1,
    },
    statCard: {
        width: '100%',
        borderRadius: 20,
        padding: 13,
        borderWidth: 1,
        justifyContent: 'space-between',
    },
    statTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    statValue: {
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    statLabel: {
        fontSize: 11,
        fontWeight: '400',
        marginTop: 8,
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
        gap: 4,
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
    card: {
        borderRadius: 24,
        padding: 18,
        borderWidth: 1,
    },
    infoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        rowGap: 16,
    },
    infoCol: {
        width: '50%',
        paddingRight: 8,
    },
    infoLabel: {
        fontSize: 12,
        fontWeight: '400',
        marginBottom: 4,
    },
    infoValue: {
        fontSize: 15,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statusDot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
    },
    favoriteRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 2,
    },
    favoriteText: {
        fontSize: 15,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    progressTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    progressBottomRow: {
        marginTop: 8,
    },
    progressPercentText: {
        fontSize: 16,
        fontWeight: '700',
    },
    progressBarTrack: {
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    progressSubtitle: {
        fontSize: 12,
        fontWeight: '400',
    },
    teamList: {
        gap: 2,
    },
    teamRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
    },
    teamMemberName: {
        fontSize: 15,
        fontWeight: '500',
    },
    teamMemberRole: {
        fontSize: 13,
        fontWeight: '400',
    },
    viewAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingTop: 12,
        marginTop: 4,
    },
    viewAllText: {
        fontSize: 14,
        fontWeight: '600',
    },
    emptyText: {
        fontSize: 13,
        paddingVertical: 6,
        textAlign: 'center',
    },
    activityList: {
        gap: 2,
    },
    activityItem: {
        paddingVertical: 10,
        gap: 4,
    },
    activityHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    activityAuthor: {
        fontSize: 14,
        fontWeight: '600',
    },
    activityTime: {
        fontSize: 11,
    },
    activityDesc: {
        fontSize: 13,
        lineHeight: 18,
    },
    modulesList: {
        gap: 2,
    },
    moduleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 11,
        gap: 12,
    },
    moduleIconBox: {
        width: 36,
        height: 36,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    moduleName: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
    },
});
