import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
    ActivityIndicator,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Platform,
} from 'react-native';
import Animated, { FadeIn, FadeInUp, Layout } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSearch } from '@/context/SearchContext';
import { useTheme } from '@/context/ThemeContext';
import { useTenantContext } from '@/context/TenantContext';
import { FormaBlue } from '@/constants/theme';
import { getProjects, Project } from '@/lib/api/projects';
import { getProjectNumberingSettings, ProjectNumberingSettings, formatProjectBadge } from '@/lib/api/projectSetup';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { HeaderCircleButton } from '@/components/ui/HeaderCircleButton';
import { HeaderToolbar, HeaderToolbarAction } from '@/components/ui/HeaderToolbar';
import { SegmentedControl, Segment } from '@/components/ui/SegmentedControl';
import { SwiftUIAddProjectSheet } from '@/components/projects/SwiftUIAddProjectSheet';
import { UnifiedSearchBar } from '@/components/ui/UnifiedSearchBar';
import { WebFinderHeader } from '@/components/ui/WebFinderHeader';
import { TenantBrandLogo } from '@/components/ui/TenantBrandLogo';

export default function AllProjectsExplorer() {
    const insets = useSafeAreaInsets();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const { searchQuery, setSearchQuery } = useSearch();
    const { activeWorkspace, activeTenant } = useTenantContext();

    const [projects, setProjects] = useState<Project[]>([]);
    const [numberingSettings, setNumberingSettings] = useState<ProjectNumberingSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSearchVisible, setIsSearchVisible] = useState(false);
    const [isAddProjectVisible, setIsAddProjectVisible] = useState(false);

    const tenantLogoUrl = activeTenant?.branding_logo_url || activeTenant?.logo_url;
    const primaryColor = activeTenant?.primary_color || '#0036F8';
    const tenantInitial = (activeTenant?.branding_name || activeTenant?.name || 'T').charAt(0).toUpperCase();

    const [activeFilter, setActiveFilter] = useState('all');

    const loadProjects = useCallback(async (showLoading = true) => {
        if (showLoading) setIsLoading(true);
        const [data, settings] = await Promise.all([
            getProjects(activeWorkspace?.id),
            getProjectNumberingSettings(),
        ]);
        setProjects(data);
        setNumberingSettings(settings);
        if (showLoading) setIsLoading(false);
    }, [activeWorkspace?.id]);

    useEffect(() => {
        loadProjects(true);
    }, [activeWorkspace?.id, loadProjects]);

    useFocusEffect(
        useCallback(() => {
            loadProjects(false);
        }, [loadProjects])
    );

    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6e6e73';

    const counts = useMemo(() => {
        const all = projects.filter(p => !p.isArchived).length;
        const my = projects.filter(p => p.isAssignedToMe && !p.isArchived).length;
        const onTrack = projects.filter(p => p.progress >= 70 && p.progress < 100 && !p.isArchived).length;
        const risky = projects.filter(p => p.progress < 30 && !p.isArchived).length;
        const completed = projects.filter(p => p.progress === 100 && !p.isArchived).length;
        const archived = projects.filter(p => p.isArchived).length;
        return { all, my, onTrack, risky, completed, archived };
    }, [projects]);

    const FILTERS: Segment[] = useMemo(() => [
        { id: 'all', label: `All Projects (${counts.all})` },
        { id: 'my', label: `My Projects (${counts.my})` },
        { id: 'on_track', label: `On Track (${counts.onTrack})` },
        { id: 'risky', label: `Risky (${counts.risky})` },
        { id: 'completed', label: `Completed (${counts.completed})` },
        { id: 'archived', label: `Archived (${counts.archived})` },
    ], [counts]);

    const filteredProjects = useMemo(() => {
        let result = projects;

        if (searchQuery.trim().length > 0) {
            const q = searchQuery.toLowerCase();
            result = result.filter(p =>
                p.title.toLowerCase().includes(q) ||
                p.code.toLowerCase().includes(q) ||
                p.number.toLowerCase().includes(q) ||
                p.location.toLowerCase().includes(q) ||
                p.phase.toLowerCase().includes(q)
            );
        } else {
            if (activeFilter === 'my') result = result.filter(p => p.isAssignedToMe && !p.isArchived);
            else if (activeFilter === 'on_track') result = result.filter(p => p.progress >= 70 && p.progress < 100 && !p.isArchived);
            else if (activeFilter === 'risky') result = result.filter(p => p.progress < 30 && !p.isArchived);
            else if (activeFilter === 'completed') result = result.filter(p => p.progress === 100 && !p.isArchived);
            else if (activeFilter === 'archived') result = result.filter(p => p.isArchived);
            else result = result.filter(p => !p.isArchived);
        }

        return result;
    }, [projects, activeFilter, searchQuery]);

    const rightActions: HeaderToolbarAction[] = [
        {
            id: 'search',
            icon: 'search',
            image: 'magnifyingglass',
            tintColor: textColor,
            onPress: () => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setIsSearchVisible(prev => !prev);
            },
        },
        {
            id: 'add',
            icon: 'add',
            image: 'plus',
            tintColor: FormaBlue[700],
            onPress: () => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setIsAddProjectVisible(true);
            },
        },
    ];

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: Platform.OS !== 'web',
                    title: 'All Projects',
                    headerLargeTitle: false,
                    headerTintColor: textColor,
                    headerShadowVisible: false,
                    headerBackVisible: false,
                    headerLeft: () => (
                        <HeaderCircleButton
                            type="back"
                            onPress={() => router.back()}
                            isDark={isDark}
                            size={36}
                        />
                    ),
                    headerRight: () => (
                        <HeaderToolbar
                            actions={rightActions}
                            isDark={isDark}
                            textColor={textColor}
                            maxDirectActions={2}
                        />
                    ),
                }}
            />

            {Platform.OS === 'web' && (
                <WebFinderHeader
                    title="All Projects"
                    showBack
                    onBack={() => router.back()}
                    actions={rightActions}
                    centerComponent={
                        <SegmentedControl
                            fullWidth
                            style={{ width: '100%' }}
                            segments={FILTERS}
                            activeSegment={activeFilter}
                            onSegmentChange={setActiveFilter}
                        />
                    }
                />
            )}

            <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}>
                {/* Standard Segmented Control for Mobile Native Only */}
                {Platform.OS !== 'web' && (
                    <View style={styles.segmentContainer}>
                        <SegmentedControl
                            segments={FILTERS}
                            activeSegment={activeFilter}
                            onSegmentChange={setActiveFilter}
                        />
                    </View>
                )}

                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40, paddingTop: 10 }]}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Search Bar */}
                    {isSearchVisible && (
                        <UnifiedSearchBar
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholder="Search projects..."
                            onClose={() => {
                                setIsSearchVisible(false);
                                setSearchQuery('');
                            }}
                        />
                    )}

                    {isLoading ? (
                        <View style={{ paddingVertical: 100, alignItems: 'center', justifyContent: 'center' }}>
                            <ActivityIndicator size="large" color="#0036F8" />
                        </View>
                    ) : (
                        <View style={styles.listContainer}>
                            {filteredProjects.map((project, index) => (
                                <Animated.View
                                    key={project.id}
                                    entering={FadeInUp.delay(index * 30)}
                                    layout={Layout}
                                >
                                    <TouchableOpacity
                                        onPress={() => router.push(`/project-details/${project.id}`)}
                                        activeOpacity={0.7}
                                    >
                                        <View
                                            style={[styles.compactCard, {
                                                backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                                                borderWidth: 1,
                                                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                                            }]}
                                        >
                                            {project.heroImage ? (
                                                <Image source={project.heroImage} style={styles.thumbnail} />
                                            ) : (
                                                <View style={[styles.thumbnail, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }]}>
                                                    <TenantBrandLogo tenant={activeTenant} size={28} isDark={isDark} />
                                                </View>
                                            )}
                                            <View style={styles.compactInfo}>
                                                <View style={styles.compactHeader}>
                                                    <View style={[styles.smallPill, {
                                                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.06)',
                                                        borderWidth: 0,
                                                        marginRight: 6
                                                    }]}>
                                                        <Text style={[styles.smallPillText, { color: isDark ? '#FFFFFF' : '#1C1C1E' }]}>
                                                            {formatProjectBadge(project, numberingSettings)}
                                                        </Text>
                                                    </View>
                                                    <Text style={[styles.compactTitle, { color: textColor }]} numberOfLines={1}>
                                                        {project.title}
                                                    </Text>
                                                </View>
                                                <Text style={[styles.compactSubtext, { color: subtextColor }]}>
                                                    {project.location ? `${project.location}  •  ${project.phase}` : project.phase}
                                                </Text>
                                            </View>
                                            <ProgressRing progress={project.progress} size={42} strokeWidth={3} />
                                        </View>
                                    </TouchableOpacity>
                                </Animated.View>
                            ))}

                            {filteredProjects.length === 0 && (
                                <Animated.View entering={FadeIn.delay(200)} style={styles.emptyContainer}>
                                    <View style={[styles.emptyIconBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,54,248,0.06)' }]}>
                                        <Ionicons name="search" size={42} color={isDark ? 'rgba(255,255,255,0.3)' : '#0036F8'} />
                                    </View>
                                    <Text style={[styles.emptyTitle, { color: textColor }]}>No projects found</Text>
                                    <Text style={[styles.emptyText, { color: subtextColor }]}>
                                        {searchQuery.trim().length > 0
                                            ? `We couldn't find anything matching "${searchQuery}"`
                                            : 'No projects found in this category'}
                                    </Text>
                                </Animated.View>
                            )}
                        </View>
                    )}
                </ScrollView>
            </View>

            {/* Add Project Drawer */}
            <SwiftUIAddProjectSheet
                isOpened={isAddProjectVisible}
                onClose={() => setIsAddProjectVisible(false)}
                onSave={(newProj) => {
                    setProjects(prev => [newProj, ...prev]);
                    setIsAddProjectVisible(false);
                }}
            />
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    segmentContainer: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 4,
    },
    content: {
        paddingHorizontal: 16,
        paddingTop: 4,
    },
    listContainer: {
        gap: 10,
    },
    inlineSearchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginTop: 8,
        marginBottom: 4,
        paddingHorizontal: 14,
        height: 42,
        borderRadius: 21,
        borderWidth: 1,
    },
    inlineSearchInput: {
        flex: 1,
        fontSize: 15,
        paddingVertical: 0,
    },
    compactCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: 18,
        gap: 12,
    },
    thumbnail: {
        width: 50,
        height: 50,
        borderRadius: 12,
    },
    compactInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    compactHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 2,
    },
    compactTitle: {
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    compactSubtext: {
        fontSize: 12,
        fontWeight: '500',
    },
    smallPill: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
        borderWidth: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    smallPillText: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    emptyContainer: {
        paddingVertical: 80,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    emptyIconBg: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    emptyTitle: {
        fontSize: 18,
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
});
