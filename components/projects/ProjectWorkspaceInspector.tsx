import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Platform } from 'react-native';
import { Project } from '@/lib/api/projects';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { Ionicons } from '@expo/vector-icons';
import { FormaBlue } from '@/constants/theme';
import * as Haptics from 'expo-haptics';
import { ProjectSetupDetailPane } from '@/components/projects/setup/ProjectSetupDetailPane';
import { ProjectSetupModule } from '@/lib/api/projectSetup';

interface ProjectWorkspaceInspectorProps {
    project: Project;
    activeTab: string;
    onTabChange?: (tab: string) => void;
    activeSetupModule: ProjectSetupModule;
    setActiveSetupModule: (mod: ProjectSetupModule) => void;
    isDark: boolean;
}

export function ProjectWorkspaceInspector({
    project,
    activeTab,
    onTabChange,
    activeSetupModule,
    setActiveSetupModule,
    isDark,
}: ProjectWorkspaceInspectorProps) {
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#636366';
    const cardBgColor = isDark ? '#1C1C1E' : '#FFFFFF';
    const cardBorderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)';
    const dividerColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
    const inputBgColor = isDark ? '#2C2C2E' : '#F2F2F7';

    // Discussion / comment state
    const [comments, setComments] = useState<Array<{ id: string; author: string; text: string; time: string }>>([
        { id: '1', author: 'Project Lead', text: 'Initial design review complete. Proceeding with milestone 1.', time: '2h ago' },
        { id: '2', author: 'Team Member', text: 'Uploaded updated structural drawings in Docs tab.', time: '45m ago' },
    ]);
    const [newComment, setNewComment] = useState('');

    // Quick task title
    const [quickTaskTitle, setQuickTaskTitle] = useState('');

    const handleSendComment = () => {
        if (!newComment.trim()) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setComments((prev) => [
            ...prev,
            {
                id: Date.now().toString(),
                author: 'You',
                text: newComment.trim(),
                time: 'Just now',
            },
        ]);
        setNewComment('');
    };

    if (activeTab === 'setup') {
        return (
            <ProjectSetupDetailPane
                activeModule={activeSetupModule}
                setActiveModule={setActiveSetupModule}
            />
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}>
            {/* Inspector Header */}
            <View style={[styles.header, { borderBottomColor: dividerColor, backgroundColor: isDark ? '#121214' : '#FFFFFF' }]}>
                <View style={styles.headerLeft}>
                    <View style={[styles.headerIconCircle, { backgroundColor: isDark ? 'rgba(86, 151, 255, 0.15)' : FormaBlue[100] }]}>
                        <PlatformIcon
                            name={
                                activeTab === 'work' ? 'checklist' :
                                activeTab === 'activity' ? 'bolt.horizontal.fill' :
                                activeTab === 'docs' ? 'folder.fill' : 'doc.text.fill'
                            }
                            size={16}
                            tintColor={FormaBlue[600]}
                        />
                    </View>
                    <View>
                        <Text style={[styles.headerTitle, { color: textColor }]}>
                            {activeTab === 'work' ? 'Task Inspector' :
                             activeTab === 'activity' ? 'Thread & Comments' :
                             activeTab === 'docs' ? 'Document Info' : 'Project Summary'}
                        </Text>
                        <Text style={[styles.headerSubtitle, { color: subtextColor }]}>
                            {project.code || project.title}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Content Area */}
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={true}
            >
                {/* 1. OVERVIEW INSPECTOR */}
                {activeTab === 'overview' && (
                    <View style={styles.sectionGap}>
                        {/* Quick Health Card */}
                        <View style={[styles.card, { backgroundColor: cardBgColor, borderColor: cardBorderColor }]}>
                            <Text style={[styles.cardTitle, { color: textColor }]}>Project Health</Text>
                            <View style={styles.healthRow}>
                                <View style={styles.healthItem}>
                                    <Text style={[styles.healthLabel, { color: subtextColor }]}>Progress</Text>
                                    <Text style={[styles.healthValue, { color: '#0036F8' }]}>{project.progress || 0}%</Text>
                                </View>
                                <View style={[styles.verticalDivider, { backgroundColor: dividerColor }]} />
                                <View style={styles.healthItem}>
                                    <Text style={[styles.healthLabel, { color: subtextColor }]}>Phase</Text>
                                    <Text style={[styles.healthValue, { color: textColor }]}>{project.phase || 'Active'}</Text>
                                </View>
                                <View style={[styles.verticalDivider, { backgroundColor: dividerColor }]} />
                                <View style={styles.healthItem}>
                                    <Text style={[styles.healthLabel, { color: subtextColor }]}>Status</Text>
                                    <Text style={[styles.healthValue, { color: '#34C759' }]}>{project.status || 'Planning'}</Text>
                                </View>
                            </View>
                        </View>

                        {/* Team Roster */}
                        <View style={[styles.card, { backgroundColor: cardBgColor, borderColor: cardBorderColor }]}>
                            <View style={styles.cardHeaderRow}>
                                <Text style={[styles.cardTitle, { color: textColor }]}>Team Roster</Text>
                                <Text style={[styles.badgeText, { color: subtextColor }]}>
                                    {project.meta?.members?.length || 0} members
                                </Text>
                            </View>
                            {project.meta?.members && project.meta.members.length > 0 ? (
                                <View style={styles.memberList}>
                                    {project.meta.members.slice(0, 5).map((m: any, idx: number) => (
                                        <View key={m.id || idx} style={[styles.memberRow, idx !== 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: dividerColor }]}>
                                            <View style={[styles.memberAvatar, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}>
                                                <Text style={[styles.memberAvatarText, { color: textColor }]}>
                                                    {(m.name || 'M').charAt(0).toUpperCase()}
                                                </Text>
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={[styles.memberName, { color: textColor }]} numberOfLines={1}>{m.name}</Text>
                                                <Text style={[styles.memberRole, { color: subtextColor }]} numberOfLines={1}>{m.projectRole || m.role || 'Member'}</Text>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            ) : (
                                <Text style={[styles.emptyText, { color: subtextColor }]}>No members assigned.</Text>
                            )}
                        </View>

                        {/* Recent Notes */}
                        <View style={[styles.card, { backgroundColor: cardBgColor, borderColor: cardBorderColor }]}>
                            <Text style={[styles.cardTitle, { color: textColor }]}>Quick Note</Text>
                            <Text style={[styles.noteText, { color: subtextColor }]}>
                                {project.description || 'No additional project notes written yet.'}
                            </Text>
                        </View>
                    </View>
                )}

                {/* 2. WORK & TRACKING INSPECTOR */}
                {activeTab === 'work' && (
                    <View style={styles.sectionGap}>
                        {/* Quick Task Card */}
                        <View style={[styles.card, { backgroundColor: cardBgColor, borderColor: cardBorderColor }]}>
                            <Text style={[styles.cardTitle, { color: textColor }]}>Quick Task Add</Text>
                            <TextInput
                                style={[styles.textInput, { backgroundColor: inputBgColor, color: textColor }]}
                                placeholder="Task title..."
                                placeholderTextColor={subtextColor}
                                value={quickTaskTitle}
                                onChangeText={setQuickTaskTitle}
                            />
                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: '#0036F8', opacity: quickTaskTitle.trim() ? 1 : 0.6 }]}
                                disabled={!quickTaskTitle.trim()}
                                onPress={() => {
                                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                    setQuickTaskTitle('');
                                }}
                            >
                                <Ionicons name="add" size={16} color="#FFFFFF" />
                                <Text style={styles.actionBtnText}>Add to Backlog</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Task Progress Summary */}
                        <View style={[styles.card, { backgroundColor: cardBgColor, borderColor: cardBorderColor }]}>
                            <Text style={[styles.cardTitle, { color: textColor }]}>Tracking Breakdown</Text>
                            <View style={styles.breakdownRow}>
                                <View style={styles.breakdownDotRow}>
                                    <View style={[styles.dot, { backgroundColor: '#34C759' }]} />
                                    <Text style={[styles.breakdownLabel, { color: textColor }]}>Done</Text>
                                </View>
                                <Text style={[styles.breakdownCount, { color: textColor }]}>{project.progress === 100 ? '100%' : `${project.progress || 0}%`}</Text>
                            </View>
                            <View style={styles.breakdownRow}>
                                <View style={styles.breakdownDotRow}>
                                    <View style={[styles.dot, { backgroundColor: '#FF9500' }]} />
                                    <Text style={[styles.breakdownLabel, { color: textColor }]}>In Progress</Text>
                                </View>
                                <Text style={[styles.breakdownCount, { color: textColor }]}>Active</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* 3. ACTIVITY THREAD & COMMENTS INSPECTOR */}
                {activeTab === 'activity' && (
                    <View style={styles.sectionGap}>
                        <View style={[styles.card, { backgroundColor: cardBgColor, borderColor: cardBorderColor, paddingBottom: 10 }]}>
                            <Text style={[styles.cardTitle, { color: textColor }]}>Project Discussion</Text>
                            <View style={{ gap: 12, marginTop: 8 }}>
                                {comments.map((item) => (
                                    <View key={item.id} style={styles.commentBubble}>
                                        <View style={styles.commentHeader}>
                                            <Text style={[styles.commentAuthor, { color: textColor }]}>{item.author}</Text>
                                            <Text style={[styles.commentTime, { color: subtextColor }]}>{item.time}</Text>
                                        </View>
                                        <Text style={[styles.commentBody, { color: isDark ? '#E5E5EA' : '#3A3A3C' }]}>{item.text}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    </View>
                )}

                {/* 4. DOCUMENTS INSPECTOR */}
                {activeTab === 'docs' && (
                    <View style={styles.sectionGap}>
                        <View style={[styles.card, { backgroundColor: cardBgColor, borderColor: cardBorderColor }]}>
                            <Text style={[styles.cardTitle, { color: textColor }]}>Storage Overview</Text>
                            <View style={styles.docStatsRow}>
                                <Ionicons name="folder-open" size={24} color="#AF52DE" />
                                <View>
                                    <Text style={[styles.docStatsValue, { color: textColor }]}>Cloud Workspace</Text>
                                    <Text style={[styles.docStatsSub, { color: subtextColor }]}>Encrypted & Synced</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                )}
            </ScrollView>

            {/* Bottom Input for Activity comments */}
            {activeTab === 'activity' && (
                <View style={[styles.bottomInputBar, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderTopColor: dividerColor }]}>
                    <TextInput
                        style={[styles.commentInput, { backgroundColor: inputBgColor, color: textColor }]}
                        placeholder="Write a comment..."
                        placeholderTextColor={subtextColor}
                        value={newComment}
                        onChangeText={setNewComment}
                    />
                    <TouchableOpacity
                        onPress={handleSendComment}
                        disabled={!newComment.trim()}
                        style={[styles.sendBtn, { backgroundColor: newComment.trim() ? '#0036F8' : (isDark ? '#2C2C2E' : '#E5E5EA') }]}
                    >
                        <Ionicons name="arrow-up" size={16} color={newComment.trim() ? '#FFFFFF' : subtextColor} />
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        height: '100%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    headerIconCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    headerSubtitle: {
        fontSize: 12,
        fontWeight: '400',
        marginTop: 1,
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        padding: 14,
        paddingBottom: 40,
    },
    sectionGap: {
        gap: 12,
    },
    card: {
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        gap: 8,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    cardTitle: {
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '500',
    },
    healthRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 6,
    },
    healthItem: {
        flex: 1,
        alignItems: 'center',
    },
    healthLabel: {
        fontSize: 11,
        fontWeight: '400',
        marginBottom: 2,
    },
    healthValue: {
        fontSize: 15,
        fontWeight: '700',
    },
    verticalDivider: {
        width: 1,
        height: 24,
    },
    memberList: {
        marginTop: 4,
    },
    memberRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 8,
    },
    memberAvatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    memberAvatarText: {
        fontSize: 12,
        fontWeight: '700',
    },
    memberName: {
        fontSize: 13,
        fontWeight: '600',
    },
    memberRole: {
        fontSize: 11,
        fontWeight: '400',
        marginTop: 1,
    },
    emptyText: {
        fontSize: 12,
        fontStyle: 'italic',
        marginTop: 4,
    },
    noteText: {
        fontSize: 13,
        lineHeight: 18,
    },
    textInput: {
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        fontSize: 13,
        marginTop: 4,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 9,
        borderRadius: 10,
        marginTop: 4,
    },
    actionBtnText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '600',
    },
    breakdownRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 4,
    },
    breakdownDotRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    breakdownLabel: {
        fontSize: 13,
        fontWeight: '500',
    },
    breakdownCount: {
        fontSize: 13,
        fontWeight: '600',
    },
    commentBubble: {
        padding: 10,
        borderRadius: 12,
        backgroundColor: 'rgba(128,128,128,0.06)',
        gap: 4,
    },
    commentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    commentAuthor: {
        fontSize: 12,
        fontWeight: '700',
    },
    commentTime: {
        fontSize: 11,
    },
    commentBody: {
        fontSize: 13,
        lineHeight: 17,
    },
    docStatsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginTop: 4,
    },
    docStatsValue: {
        fontSize: 14,
        fontWeight: '600',
    },
    docStatsSub: {
        fontSize: 12,
    },
    bottomInputBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    commentInput: {
        flex: 1,
        height: 36,
        borderRadius: 18,
        paddingHorizontal: 14,
        fontSize: 13,
    },
    sendBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
