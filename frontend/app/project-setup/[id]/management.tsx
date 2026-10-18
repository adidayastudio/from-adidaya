import { ProjectSaveFeedback, useProjectSaveFeedback } from '@/components/projects/setup/ProjectSaveFeedback';
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { HeaderBlurBackground } from '@/components/ui/HeaderBlurBackground';
import { GlassView } from '@/components/ui/GlassView';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { BouncyGlassButton } from '@/components/ui/BouncyGlassButton';
import * as Haptics from 'expo-haptics';
import { Project, getProjectById, updateProjectApi, deleteProjectApi } from '@/lib/api/projects';

export default function ProjectSetupManagementScreen({
    projectId: propProjectId,
    isEmbedded = false,
    onSaved,
}: {
    projectId?: string;
    isEmbedded?: boolean;
    onSaved?: () => void;
} = {}) {
    const params = useLocalSearchParams();
    const id = propProjectId || params.id;
    const projectId = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : '';

    const insets = useSafeAreaInsets();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';

    const bgColor = isDark ? '#000000' : '#F2F2F7';
    const cardBgColor = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.7)';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';

    const [project, setProject] = useState<Project | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const feedback = useProjectSaveFeedback(false);
    const confirmProjectAction = (title: string, message: string, buttons: any[]) => {
        if (Platform.OS === 'web') {
            if (window.confirm(message)) buttons.find(button => button.onPress)?.onPress();
        } else Alert.alert(title, message, buttons);
    };

    useEffect(() => {
        if (projectId) {
            loadData();
        }
    }, [projectId]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const projData = await getProjectById(projectId);
            setProject(projData);
        } catch (error) {
            console.error('Error loading project management:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleArchive = async () => {
        if (!project) return;
        const isArchived = project.isArchived || false;
        const actionLabel = isArchived ? 'Unarchive' : 'Archive';

        confirmProjectAction(
            `${actionLabel} Project`,
            `Are you sure you want to ${actionLabel.toLowerCase()} "${project.title}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: actionLabel,
                    style: isArchived ? 'default' : 'destructive',
                    onPress: async () => {
                        setIsActionLoading(true);
                        try {
                            const updated = await updateProjectApi(project.id, {
                                isArchived: !isArchived,
                                status: !isArchived ? 'archived' : 'active',
                            });
                            if (updated) {
                                setProject(updated);
                                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                feedback.notify('Success', `Project successfully ${actionLabel.toLowerCase()}d!`);
                                onSaved?.();
                            }
                        } catch (e) {
                            console.error(e);
                            feedback.notify('Error', `Failed to ${actionLabel.toLowerCase()} project.`);
                        } finally {
                            setIsActionLoading(false);
                        }
                    },
                },
            ]
        );
    };

    const handleDeleteProject = async () => {
        if (!project) return;

        confirmProjectAction(
            'Delete Project',
            `Are you sure you want to permanently delete "${project.title}"? This action cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        setIsActionLoading(true);
                        try {
                            const success = await deleteProjectApi(project.id);
                            if (success) {
                                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                router.replace('/(tabs)/projects' as any);
                            } else {
                                feedback.notify('Error', 'Failed to delete project.');
                            }
                        } catch (e) {
                            console.error(e);
                            feedback.notify('Error', 'An error occurred while deleting the project.');
                        } finally {
                            setIsActionLoading(false);
                        }
                    },
                },
            ]
        );
    };

    if (isLoading) {
        return (
            <View style={[s.container, { backgroundColor: bgColor, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        );
    }

    const isArchived = project?.isArchived || false;

    return (
        <View style={[s.container, { backgroundColor: bgColor }]}>
            {!isEmbedded && (
                <Stack.Screen
                    options={{
                        headerShown: true,
                        title: 'Project Management',
                        headerLargeTitle: false,
                        headerTransparent: Platform.OS === 'ios',
                        headerShadowVisible: false,
                        headerBackground: Platform.OS === 'ios' ? () => <HeaderBlurBackground isDark={isDark} /> : undefined,
                        headerStyle: { backgroundColor: Platform.OS === 'ios' ? 'transparent' : (isDark ? '#000000' : '#F2F2F7') },
                        headerTintColor: textColor,
                        headerTitleStyle: { color: textColor, fontWeight: '700' },
                        headerLeft: () => (
                            <BouncyGlassButton
                                onPress={() => router.back()}
                                isDark={isDark}
                                variant="back"
                                textColor={textColor}
                                style={{ marginLeft: 0 }}
                            />
                        ),
                    }}
                />
            )}

            {isEmbedded && (
                <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                    <Text style={{ fontSize: 20, fontWeight: '700', color: textColor }}>Project Management</Text>
                    <Text style={{ fontSize: 13, color: subtextColor, marginTop: 2 }}>Manage this project lifecycle and availability.</Text>
                </View>
            )}

            <ProjectSaveFeedback message={feedback.message} failed={feedback.failed} />
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{
                    paddingTop: isEmbedded ? 16 : (Platform.OS === 'ios' ? insets.top + 60 : 24),
                    paddingBottom: insets.bottom + 40,
                    paddingHorizontal: 16,
                    gap: 24,
                }}
                showsVerticalScrollIndicator={false}
            >
                {/* Archive / Status Section */}
                <View style={s.sectionBlock}>
                    <Text style={[s.sectionHeaderLabel, { color: subtextColor }]}>
                        Lifecycle
                    </Text>

                    <GlassView
                        intensity={isDark ? 10 : 25}
                        style={[s.card, { backgroundColor: cardBgColor }]}
                    >
                        <TouchableOpacity
                            style={s.row}
                            onPress={handleToggleArchive}
                            activeOpacity={0.7}
                            disabled={isActionLoading}
                        >
                            <View style={s.textCol}>
                                <Text style={[s.settingTitle, { color: textColor }]}>
                                    {isArchived ? 'Unarchive Project' : 'Archive Project'}
                                </Text>
                                <Text style={[s.settingSubtitle, { color: subtextColor }]}>
                                    {isArchived
                                        ? 'Restore this project to active status.'
                                        : 'Remove project from active views while preserving all historical data.'}
                                </Text>
                            </View>
                            <PlatformIcon
                                name="archivebox"
                                size={18}
                                tintColor={isDark ? '#8E8E93' : '#6E6E73'}
                            />
                        </TouchableOpacity>
                    </GlassView>
                </View>

                {/* Danger Zone Section */}
                <View style={s.sectionBlock}>
                    <Text style={[s.sectionHeaderLabel, { color: '#FF3B30' }]}>
                        Danger Zone
                    </Text>

                    <GlassView
                        intensity={isDark ? 10 : 25}
                        style={[s.card, { backgroundColor: cardBgColor }]}
                    >
                        <TouchableOpacity
                            style={s.row}
                            onPress={handleDeleteProject}
                            activeOpacity={0.7}
                            disabled={isActionLoading}
                        >
                            <View style={s.textCol}>
                                <Text style={[s.settingTitle, { color: '#FF3B30' }]}>
                                    Delete Project
                                </Text>
                                <Text style={[s.settingSubtitle, { color: subtextColor }]}>
                                    Permanently remove this project and all its associated data.
                                </Text>
                            </View>
                            <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                        </TouchableOpacity>
                    </GlassView>
                </View>
            </ScrollView>
        </View>
    );
}

const s = StyleSheet.create({
    container: {
        flex: 1,
    },
    sectionBlock: {
        gap: 8,
    },
    sectionHeaderLabel: {
        fontSize: 13,
        fontWeight: '600',
        paddingHorizontal: 12,
        letterSpacing: 0.2,
    },
    card: {
        borderRadius: 24,
        overflow: 'hidden',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        gap: 12,
        justifyContent: 'space-between',
        minHeight: 52,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 16,
        marginRight: 0,
    },
    textCol: {
        flex: 1,
        gap: 2,
    },
    settingTitle: {
        fontSize: 16,
        fontWeight: '500',
        letterSpacing: -0.3,
    },
    settingSubtitle: {
        fontSize: 13,
        fontWeight: '400',
        lineHeight: 18,
    },
});
