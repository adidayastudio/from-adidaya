import { ProjectWorkspace } from '@/components/projects/ProjectWorkspace';
import { FormaBlue } from '@/constants/theme';
import { ProjectWorkspaceInspector } from '@/components/projects/ProjectWorkspaceInspector';
import type { ProjectSetupModule } from '@/lib/api/projectSetup';
import { ActivityTab } from '@/components/projects/ActivityTab';
import { DocsTab, ProjectDocItem, DEFAULT_PROJECT_MOCK_DOCS, BouncyToolbarButton, getDocSectionLabel } from '@/components/projects/DocsTab';
import { OverviewTab } from '@/components/projects/OverviewTab';
import { TrackingTab } from '@/components/projects/TrackingTab';
import { SwiftUIAddTaskSheet } from '@/components/tasks/SwiftUIAddTaskSheet';
import { SwiftUIAddActionSheet } from '@/components/actions/SwiftUIAddActionSheet';
import { SwiftUIAddMilestoneSheet } from '@/components/projects/SwiftUIAddMilestoneSheet';
import { SwiftUIAddActivitySheet, ActivityLog } from '@/components/projects/SwiftUIAddActivitySheet';
import { SwiftUIDateRangeSheet, DateRangeValue } from '@/components/projects/SwiftUIDateRangeSheet';
import { GlassView } from '@/components/ui/GlassView';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { BouncyGlassButton } from '@/components/ui/BouncyGlassButton';
import { HeaderToolbar, HeaderToolbarAction } from '@/components/ui/HeaderToolbar';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { BlurView } from 'expo-blur';
import { SwiftUISegmentedControl as SegmentedControl } from '@/components/ui/SwiftUISegmentedControl';
import { Host, GlassEffectContainer, Image as SwiftUIImage, HStack, Spacer, frame, cornerRadius, glassEffect, padding as swiftUIPadding } from '@/lib/swiftui';
import { useTenantContext } from '@/context/TenantContext';
import { useTheme } from '@/context/ThemeContext';
import { getProjectById, Project, updateProjectApi, uploadProjectHeroImage, saveProjectMeta } from '@/lib/api/projects';
import { resolveTrackingMethod, ProjectMilestone } from '@/lib/api/projectProgress';
import { Task, Action } from '@/constants/MockData';
import { formatProjectBadge, getProjectNumberingSettings, ProjectNumberingSettings } from '@/lib/api/projectSetup';
import { TenantBrandLogo } from '@/components/ui/TenantBrandLogo';
import { Ionicons } from '@expo/vector-icons';
import ContextMenu, { ContextMenuAction } from '@/components/ui/PlatformContextMenu';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack, useLocalSearchParams, useFocusEffect } from 'expo-router';
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { ActivityIndicator, Alert, Clipboard, Dimensions, Image, Modal, Platform, StatusBar as RNStatusBar, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View, KeyboardAvoidingView, Keyboard, LayoutAnimation, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BouncyScrollToTopButton = React.memo(({
    onPress,
    isDark,
}: {
    onPress: () => void;
    isDark: boolean;
}) => {
    const scale = useSharedValue(1);
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return (
        <Animated.View style={animatedStyle}>
            <TouchableOpacity
                activeOpacity={1}
                onPressIn={() => {
                    scale.value = withSpring(0.82, { damping: 15, stiffness: 320 });
                }}
                onPressOut={() => {
                    scale.value = withSpring(1.0, { damping: 12, stiffness: 300 });
                }}
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onPress();
                }}
                style={styles.scrollToTopBtn}
            >
                {Platform.OS === 'ios' ? (
                    <Host style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                        <GlassEffectContainer modifiers={[
                            frame({ width: 38, height: 38 }),
                            cornerRadius(19),
                            glassEffect({ shape: 'circle' })
                        ]}>
                            <HStack alignment="center" modifiers={[
                                frame({ width: 38, height: 38 }),
                            ]}>
                                <Spacer />
                            </HStack>
                        </GlassEffectContainer>
                    </Host>
                ) : (
                    <View style={[styles.scrollToTopFallback, { backgroundColor: isDark ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.85)' }]} />
                )}
                <PlatformIcon name="chevron.up" size={16} tintColor={isDark ? '#FFFFFF' : '#1C1C1E'} />
            </TouchableOpacity>
        </Animated.View>
    );
});

const BouncyModalCircleButton = React.memo(({
    onPress,
    icon = 'xmark',
}: {
    onPress: () => void;
    icon?: string;
}) => {
    const scale = useSharedValue(1);
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return (
        <Animated.View style={animatedStyle}>
            <TouchableOpacity
                activeOpacity={1}
                onPressIn={() => {
                    scale.value = withSpring(0.85, { damping: 15, stiffness: 320 });
                }}
                onPressOut={() => {
                    scale.value = withSpring(1.0, { damping: 12, stiffness: 300 });
                }}
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onPress();
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.modalCircleBtn}
            >
                {Platform.OS === 'ios' ? (
                    <Host style={StyleSheet.absoluteFill} colorScheme="dark">
                        <GlassEffectContainer modifiers={[
                            frame({ width: 40, height: 40 }),
                            cornerRadius(20),
                            glassEffect({ shape: 'circle' }),
                        ]}>
                            <HStack alignment="center" modifiers={[
                                frame({ width: 40, height: 40 }),
                            ]}>
                                <Spacer />
                            </HStack>
                        </GlassEffectContainer>
                    </Host>
                ) : (
                    <View style={styles.modalCircleFallback}>
                        <BlurView
                            intensity={50}
                            tint="dark"
                            style={StyleSheet.absoluteFill}
                            pointerEvents="none"
                        />
                    </View>
                )}
                <PlatformIcon name={icon} size={18} tintColor="#FFFFFF" />
            </TouchableOpacity>
        </Animated.View>
    );
});

const BouncyModalCapsuleButton = React.memo(({
    onPress,
    icon = 'photo.on.rectangle',
    label,
    disabled = false,
}: {
    onPress: () => void;
    icon?: string;
    label: string;
    disabled?: boolean;
}) => {
    const scale = useSharedValue(1);
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return (
        <Animated.View style={animatedStyle}>
            <TouchableOpacity
                activeOpacity={1}
                disabled={disabled}
                onPressIn={() => {
                    scale.value = withSpring(0.88, { damping: 15, stiffness: 320 });
                }}
                onPressOut={() => {
                    scale.value = withSpring(1.0, { damping: 12, stiffness: 300 });
                }}
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onPress();
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.modalCapsuleBtn}
            >
                {Platform.OS === 'ios' ? (
                    <Host style={StyleSheet.absoluteFill} colorScheme="dark">
                        <GlassEffectContainer modifiers={[
                            frame({ height: 40 }),
                            cornerRadius(20),
                            glassEffect({ shape: 'capsule' }),
                        ]}>
                            <HStack alignment="center" modifiers={[
                                frame({ height: 40 }),
                                swiftUIPadding({ leading: 14, trailing: 14 }),
                            ]}>
                                <Spacer />
                            </HStack>
                        </GlassEffectContainer>
                    </Host>
                ) : (
                    <View style={styles.modalCapsuleFallback}>
                        <BlurView
                            intensity={50}
                            tint="dark"
                            style={StyleSheet.absoluteFill}
                            pointerEvents="none"
                        />
                    </View>
                )}
                <View style={styles.modalCapsuleInner}>
                    <PlatformIcon name={icon} size={16} tintColor="#FFFFFF" />
                    <Text style={styles.modalCapsuleText}>{label}</Text>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
});

export function ProjectDetailContent({
    projectId: propProjectId,
    initialProject,
    isEmbedded = false,
    activeTabProp,
    onTabChange,
    onOpenWorkspace,
    isFocusedWorkspace = false,
    onClose,
    isPreviewMode,
    onOpenSetupModule,
    contentOnly = false,
}: {
    projectId?: string;
    initialProject?: Project;
    isEmbedded?: boolean;
    activeTabProp?: string;
    onTabChange?: (tab: string) => void;
    onOpenWorkspace?: () => void;
    isFocusedWorkspace?: boolean;
    onClose?: () => void;
    isPreviewMode?: boolean;
    onOpenSetupModule?: (moduleId: string) => void;
    contentOnly?: boolean;
}) {
    const { width: viewportWidth } = useWindowDimensions();
    const isPreview = isPreviewMode !== undefined ? isPreviewMode : (isEmbedded && !isFocusedWorkspace);
    const params = useLocalSearchParams();
    const id = propProjectId || params.id;
    const projectId = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : '';

    const [project, setProject] = useState<Project | null>(initialProject || null);
    useEffect(() => { if (initialProject) setProject(initialProject); }, [initialProject]);
    const [dynamicProgress, setDynamicProgress] = useState<number | null>(initialProject?.progress ?? null);
    const [numberingSettings, setNumberingSettings] = useState<ProjectNumberingSettings | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [scrollY, setScrollY] = useState(0);

    const insets = useSafeAreaInsets();
    const { resolvedTheme } = useTheme();
    const { activeTenant } = useTenantContext();
    const isDark = resolvedTheme === 'dark';
    const scrollViewRef = React.useRef<ScrollView>(null);

    const fabScale = useSharedValue(1);
    const fabAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: fabScale.value }],
    }));

    const handleFabTouchStart = () => {
        fabScale.value = withSpring(0.88, { damping: 15, stiffness: 320, mass: 0.5 });
    };

    const handleFabTouchEnd = () => {
        fabScale.value = withSpring(1.0, { damping: 12, stiffness: 300, mass: 0.5 });
    };

    const tenantLogoUrl = activeTenant?.branding_logo_url || activeTenant?.logo_url;
    const primaryColor = activeTenant?.primary_color || '#007AFF';
    const tenantInitial = (activeTenant?.branding_name || activeTenant?.name || 'T').charAt(0).toUpperCase();

    const loadProject = useCallback(async (silent = true) => {
        if (!projectId) return;
        try {
            const [data, settings] = await Promise.all([
                getProjectById(projectId),
                getProjectNumberingSettings(),
            ]);
            setProject(data);
            if (data?.progress !== undefined) {
                setDynamicProgress(data.progress);
            }
            setNumberingSettings(settings);
        } catch (error) {
            console.error('Error loading project details:', error);
        }
    }, [projectId]);

    useEffect(() => {
        loadProject(true);
    }, [loadProject]);

    useFocusEffect(
        useCallback(() => {
            loadProject(true);
        }, [loadProject])
    );

    // Simulating project state
    const [isPinned, setIsPinned] = useState(false);
    const [activeTab, setActiveTab] = useState(activeTabProp || 'overview');

    useEffect(() => {
        if (activeTabProp && activeTabProp !== activeTab) {
            setActiveTab(activeTabProp);
        }
    }, [activeTabProp]);

    // Image preview and pick state
    const [isPreviewVisible, setIsPreviewVisible] = useState(false);
    const [isUploadingImage, setIsUploadingImage] = useState(false);

    const handlePickImage = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Permission to access photo library is required to change project photo.');
                return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [16, 9],
                quality: 0.8,
                base64: true,
            });

            if (!result.canceled && result.assets && result.assets[0]) {
                const asset = result.assets[0];
                if (!asset.base64) {
                    Alert.alert('Error', 'Could not read image data.');
                    return;
                }
                setIsUploadingImage(true);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

                const fileExt = (asset.mimeType?.split('/')?.pop() || asset.uri?.split('.').pop() || 'jpeg').replace('jpg', 'jpeg').toLowerCase();
                const uploadedUrl = await uploadProjectHeroImage(projectId, asset.base64, fileExt === 'jpeg' ? 'jpg' : fileExt);
                if (uploadedUrl) {
                    await updateProjectApi(projectId, { heroImage: uploadedUrl });
                    await loadProject();
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                } else {
                    Alert.alert('Upload Failed', 'Failed to upload photo to storage.');
                }
            }
        } catch (error) {
            console.error('Photo picker error:', error);
            Alert.alert('Error', 'An error occurred while uploading image.');
        } finally {
            setIsUploadingImage(false);
        }
    };

    useEffect(() => {
        if (project) {
            setIsPinned(project.isPinned || false);
        }
    }, [project]);

    // Sheets and Modals state
    const [isAddTaskVisible, setIsAddTaskVisible] = useState(false);
    const [isAddActionVisible, setIsAddActionVisible] = useState(false);
    const [showAddMilestoneModal, setShowAddMilestoneModal] = useState(false);
    const [isAddActivityVisible, setIsAddActivityVisible] = useState(false);
    const [selectedDraftActivity, setSelectedDraftActivity] = useState<ActivityLog | null>(null);

    // Activity Tab Search & Filter state
    const [activitySearchQuery, setActivitySearchQuery] = useState('');
    const [isActivitySearchExpanded, setIsActivitySearchExpanded] = useState(false);
    const [activityFilter, setActivityFilter] = useState<'all' | 'updates' | 'works' | 'modules'>('all');
    const [activityDateRange, setActivityDateRange] = useState<DateRangeValue>({ startDate: null, endDate: null });
    const [isDateRangeSheetVisible, setIsDateRangeSheetVisible] = useState(false);

    // Docs Tab Search & Filter & Sort state
    const [docsList, setDocsList] = useState<ProjectDocItem[]>([]);
    const [savedDocIds, setSavedDocIds] = useState<string[]>([]);
    const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
    const [isDocSelectMode, setIsDocSelectMode] = useState<boolean>(false);
    const [docsSearchQuery, setDocsSearchQuery] = useState('');
    const [isDocsSearchExpanded, setIsDocsSearchExpanded] = useState(false);
    const [docsFilterType, setDocsFilterType] = useState<string>('all');
    const [docsSortMode, setDocsSortMode] = useState<'date-desc' | 'date-asc' | 'name-asc' | 'name-desc' | 'size-desc' | 'size-asc'>('date-desc');

    // Sync docs list from project meta
    useEffect(() => {
        if (project?.meta?.documents && Array.isArray(project.meta.documents) && project.meta.documents.length > 0) {
            const rawDocs = project.meta.documents;
            const normalized: ProjectDocItem[] = rawDocs.map((d: any, idx: number) => {
                const dateVal = d.date || d.uploadedAt || '2026-06-12';
                return {
                    id: d.id || `pdoc-${idx}`,
                    name: d.name || 'Document.pdf',
                    size: d.size || '1.5 MB',
                    uploadedBy: d.uploadedBy || 'Project Member',
                    time: d.time || '10:00 AM',
                    date: dateVal,
                    dateLabel: getDocSectionLabel(dateVal, d.dateLabel),
                    isSelf: d.uploadedBy?.includes('You') || d.uploadedBy?.includes('Manu') || false,
                    isSaved: d.isSaved || false,
                };
            });
            setDocsList(normalized);
        }
    }, [project?.meta?.documents]);

    const docSortActions: ContextMenuAction[] = useMemo(() => [
        { title: 'Newest to Oldest', systemIcon: 'calendar', selected: docsSortMode === 'date-desc' },
        { title: 'Oldest to Newest', systemIcon: 'calendar.badge.clock', selected: docsSortMode === 'date-asc' },
        { title: 'Name (A to Z)', systemIcon: 'textformat.abc', selected: docsSortMode === 'name-asc' },
        { title: 'Name (Z to A)', systemIcon: 'textformat.abc', selected: docsSortMode === 'name-desc' },
        { title: 'Largest to Smallest', systemIcon: 'arrow.down.circle', selected: docsSortMode === 'size-desc' },
        { title: 'Smallest to Largest', systemIcon: 'arrow.up.circle', selected: docsSortMode === 'size-asc' },
    ], [docsSortMode]);

    const docFilterActions: ContextMenuAction[] = useMemo(() => {
        const hasPdf = docsList.some(d => d.name.toLowerCase().endsWith('.pdf'));
        const hasSheet = docsList.some(d => d.name.toLowerCase().endsWith('.xlsx') || d.name.toLowerCase().endsWith('.xls') || d.name.toLowerCase().endsWith('.csv'));
        const hasCad = docsList.some(d => d.name.toLowerCase().endsWith('.dwg') || d.name.toLowerCase().endsWith('.cad'));

        const actions: ContextMenuAction[] = [
            { title: 'All Documents', systemIcon: 'doc.on.doc', selected: docsFilterType === 'all' },
            { title: 'Bookmarked', systemIcon: 'bookmark', selected: docsFilterType === 'saved' },
        ];
        if (hasPdf) {
            actions.push({ title: 'PDF Files', systemIcon: 'doc.text', selected: docsFilterType === 'pdf' });
        }
        if (hasSheet) {
            actions.push({ title: 'Spreadsheets', systemIcon: 'tablecells', selected: docsFilterType === 'spreadsheet' });
        }
        if (hasCad) {
            actions.push({ title: 'CAD Drawings', systemIcon: 'square.stack.3d.up', selected: docsFilterType === 'cad' });
        }
        if (docsFilterType !== 'all') {
            actions.push({
                title: 'Reset Filter',
                systemIcon: 'arrow.counterclockwise',
                destructive: true,
            });
        }
        return actions;
    }, [docsList, docsFilterType]);

    const multiSelectDocDeleteActions: ContextMenuAction[] = useMemo(() => {
        const selectedDocs = docsList.filter((d) => selectedDocIds.includes(d.id));
        const allSelf = selectedDocs.length > 0 && selectedDocs.every((d) => d.isSelf || d.uploadedBy === 'You' || d.uploadedBy?.includes('Manu'));

        const actions: ContextMenuAction[] = [
            {
                title: `Delete for Me (${selectedDocIds.length})`,
                systemIcon: 'person.crop.circle.badge.minus',
                destructive: true,
            },
        ];

        if (allSelf) {
            actions.push({
                title: `Delete for Everyone (${selectedDocIds.length})`,
                systemIcon: 'trash.fill',
                destructive: true,
            });
        }

        return actions;
    }, [docsList, selectedDocIds]);

    const handleDocSortAction = useCallback((actionTitle: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (actionTitle === 'Newest to Oldest') setDocsSortMode('date-desc');
        else if (actionTitle === 'Oldest to Newest') setDocsSortMode('date-asc');
        else if (actionTitle === 'Name (A to Z)') setDocsSortMode('name-asc');
        else if (actionTitle === 'Name (Z to A)') setDocsSortMode('name-desc');
        else if (actionTitle === 'Largest to Smallest') setDocsSortMode('size-desc');
        else if (actionTitle === 'Smallest to Largest') setDocsSortMode('size-asc');
        else if (actionTitle === 'Reset Sort' || actionTitle.includes('Reset')) setDocsSortMode('date-desc');
    }, []);

    const handleDocFilterAction = useCallback((actionTitle: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (actionTitle === 'All Documents' || actionTitle === 'Reset Filter' || actionTitle.includes('Reset')) setDocsFilterType('all');
        else if (actionTitle === 'Bookmarked Documents' || actionTitle === 'Saved Documents' || actionTitle === 'Saved' || actionTitle === 'Bookmarked') setDocsFilterType('saved');
        else if (actionTitle === 'PDF Files') setDocsFilterType('pdf');
        else if (actionTitle === 'Spreadsheets') setDocsFilterType('spreadsheet');
        else if (actionTitle === 'CAD Drawings') setDocsFilterType('cad');
    }, []);

    const handleBatchDownloadDocs = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Download', `Downloading ${selectedDocIds.length} documents...`);
    };

    const handleBatchBookmarkDocs = () => {
        const allSaved = selectedDocIds.every(id => savedDocIds.includes(id));
        if (allSaved) {
            setSavedDocIds(prev => prev.filter(id => !selectedDocIds.includes(id)));
        } else {
            setSavedDocIds(prev => Array.from(new Set([...prev, ...selectedDocIds])));
        }
        setSelectedDocIds([]);
        setIsDocSelectMode(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const handleBatchDeleteDocs = async () => {
        if (!project) return;
        const updated = docsList.filter(d => !selectedDocIds.includes(d.id));
        setDocsList(updated);
        setSelectedDocIds([]);
        setIsDocSelectMode(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        try {
            await saveProjectMeta(project.id, { documents: updated });
            loadProject(true);
        } catch (e) {
            console.error('Error batch deleting docs:', e);
        }
    };

    const docUploadActions: ContextMenuAction[] = useMemo(() => [
        { title: 'Photo Library', systemIcon: 'photo.on.rectangle' },
        { title: 'Browse Files', systemIcon: 'folder' },
        { title: 'Take Photo', systemIcon: 'camera' },
    ], []);

    const formatDocFileSize = (bytes?: number): string => {
        if (!bytes || bytes === 0) return '1.2 MB';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const handleUploadDoc = async (type: 'photo' | 'file' | 'camera') => {
        if (!project) return;
        try {
            let newDocItem: ProjectDocItem | null = null;
            const now = new Date();
            const dateStr = now.toISOString().slice(0, 10);
            const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            if (type === 'camera') {
                const { status } = await ImagePicker.requestCameraPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('Permission Denied', 'Camera permission is required.');
                    return;
                }
                const result = await ImagePicker.launchCameraAsync({
                    quality: 0.8,
                });
                if (!result.canceled && result.assets && result.assets[0]) {
                    const asset = result.assets[0];
                    const fileName = asset.fileName || `IMG_${Date.now()}.jpg`;
                    newDocItem = {
                        id: `doc-${Date.now()}`,
                        name: fileName,
                        size: formatDocFileSize(asset.fileSize),
                        uploadedBy: 'You',
                        time: timeStr,
                        date: dateStr,
                        dateLabel: 'Today',
                        isSelf: true,
                    };
                }
            } else if (type === 'photo') {
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('Permission Denied', 'Photo library permission is required.');
                    return;
                }
                const result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    quality: 0.8,
                });
                if (!result.canceled && result.assets && result.assets[0]) {
                    const asset = result.assets[0];
                    const fileName = asset.fileName || `IMG_${Date.now()}.jpg`;
                    newDocItem = {
                        id: `doc-${Date.now()}`,
                        name: fileName,
                        size: formatDocFileSize(asset.fileSize),
                        uploadedBy: 'You',
                        time: timeStr,
                        date: dateStr,
                        dateLabel: 'Today',
                        isSelf: true,
                    };
                }
            } else if (type === 'file') {
                const result = await DocumentPicker.getDocumentAsync({
                    type: '*/*',
                    copyToCacheDirectory: true,
                });
                if (!result.canceled && result.assets && result.assets[0]) {
                    const asset = result.assets[0];
                    newDocItem = {
                        id: `doc-${Date.now()}`,
                        name: asset.name,
                        size: formatDocFileSize(asset.size),
                        uploadedBy: 'You',
                        time: timeStr,
                        date: dateStr,
                        dateLabel: 'Today',
                        isSelf: true,
                    };
                }
            }

            if (newDocItem) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                const updated = [newDocItem, ...docsList];
                setDocsList(updated);
                await saveProjectMeta(project.id, { documents: updated });
                loadProject(true);
            }
        } catch (error) {
            console.error('Error uploading document:', error);
            Alert.alert('Error', 'Failed to upload document.');
        }
    };

    const handleToggleDocsSearch = (expand: boolean) => {
        LayoutAnimation.configureNext({
            duration: 260,
            create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
            update: { type: LayoutAnimation.Types.spring, springDamping: 0.8 },
            delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
        });
        setIsDocsSearchExpanded(expand);
    };

    const handleToggleActivitySearch = (expand: boolean) => {
        LayoutAnimation.configureNext({
            duration: 260,
            create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
            update: { type: LayoutAnimation.Types.spring, springDamping: 0.8 },
            delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
        });
        setIsActivitySearchExpanded(expand);
    };

    const handleTogglePin = async () => {
        if (!project) return;
        const nextPinned = !isPinned;
        setIsPinned(nextPinned);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await updateProjectApi(project.id, { isPinned: nextPinned });
    };

    const handleCopyCode = () => {
        if (!project?.code) return;
        Haptics.selectionAsync();
        Clipboard.setString(project.code);
        Alert.alert('Copied', `Project code "${project.code}" copied to clipboard.`);
    };

    const handleOpenManualProgressPrompt = () => {
        if (!project) return;
        Haptics.selectionAsync();
        const currentProg = dynamicProgress ?? project.progress ?? 0;
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
                        setDynamicProgress(rounded);
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        const nowFormatted = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                        const nextMeta = {
                            ...(project.meta || {}),
                            progress: rounded,
                            lastManualProgressUpdate: nowFormatted,
                        };
                        await saveProjectMeta(project.id, nextMeta);
                        await updateProjectApi(project.id, { progress: rounded, meta: nextMeta });
                        await loadProject();
                    },
                },
            ],
            'plain-text',
            String(currentProg),
            'decimal-pad'
        );
    };

    const handleMilestoneSaved = async () => {
        setShowAddMilestoneModal(false);
        await loadProject();
    };

    const handleTaskSaved = async (newTask: Task) => {
        setIsAddTaskVisible(false);
        await loadProject();
    };

    const handleActionSaved = async (newAction: Action) => {
        setIsAddActionVisible(false);
        await loadProject();
    };

    const renderTabContent = () => {
        if (!project) return null;
        switch (isPreview ? 'overview' : activeTab) {
            case 'overview':
                return (
                    <OverviewTab
                        project={project}
                        isDark={isDark}
                        isPinned={isPinned}
                        setIsPinned={handleTogglePin}
                        onSelectTab={(tab) => { setActiveTab(tab); onTabChange?.(tab); }}
                        onRefresh={loadProject}
                        onProgressChange={setDynamicProgress}
                        isPreview={isPreview}
                        onOpenSetupModule={onOpenSetupModule}
                    />
                );
            case 'work':
            case 'tracking':
            case 'progress':
                return (
                    <TrackingTab
                        inlineDetails={contentOnly}
                        taskListOnly={contentOnly && activeTab === 'work'}
                        project={project}
                        isDark={isDark}
                        onRefresh={loadProject}
                        onProgressChange={setDynamicProgress}
                    />
                );
            case 'activity':
                return (
                    <ActivityTab
                        project={project}
                        isDark={isDark}
                        searchQuery={activitySearchQuery}
                        activeFilter={activityFilter}
                        dateRange={activityDateRange}
                        onRefresh={loadProject}
                        onOpenAddActivity={() => setIsAddActivityVisible(true)}
                        onClearFilters={() => {
                            setActivitySearchQuery('');
                            setActivityFilter('all');
                            setActivityDateRange({ startDate: null, endDate: null, label: undefined });
                        }}
                        onOpenDateRange={() => setIsDateRangeSheetVisible(true)}
                        onSelectTab={(tab) => { setActiveTab(tab); onTabChange?.(tab); }}
                    />
                );
            case 'docs':
                return (
                    <DocsTab
                        project={project}
                        isDark={isDark}
                        onRefresh={loadProject}
                        searchQuery={docsSearchQuery}
                        docFilterType={docsFilterType}
                        docSortMode={docsSortMode}
                        isDocSelectMode={isDocSelectMode}
                        setIsDocSelectMode={setIsDocSelectMode}
                        selectedDocIds={selectedDocIds}
                        setSelectedDocIds={setSelectedDocIds}
                        docsList={docsList}
                        setDocsList={setDocsList}
                        savedDocIds={savedDocIds}
                        setSavedDocIds={setSavedDocIds}
                    />
                );
            default:
                return null;
        }
    };

    const handleShareMenuPress = async (e: { nativeEvent: { index: number; name: string } }) => {
        Haptics.selectionAsync();
        const actionName = e.nativeEvent.name;

        if (actionName === 'Share Project' || e.nativeEvent.index === 0) {
            try {
                await Share.share({
                    title: project?.title || 'Project Details',
                    message: `Check out project ${project?.title || ''} (${project?.code || ''}) on Forma.`,
                });
            } catch (err) {
                console.warn('Share error:', err);
            }
        } else if (actionName === 'Export Report' || e.nativeEvent.index === 1) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Export Report', 'Project analytics & task summary ready for export.');
        } else if (actionName === 'Export PDF' || e.nativeEvent.index === 2) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Export PDF', 'Official project presentation brief ready for export.');
        } else if (actionName === 'Copy Project Link' || e.nativeEvent.index === 3) {
            const link = `forma://project/${projectId}`;
            Clipboard.setString(link);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Link Copied', 'Project link copied to clipboard.');
        }
    };

    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6e6e73';

    const actions: HeaderToolbarAction[] = [
        {
            id: 'pin',
            icon: isPinned ? 'star' : 'star-outline',
            image: isPinned ? 'star.fill' : 'star',
            tintColor: isPinned ? '#FFCC00' : textColor,
            onPress: handleTogglePin
        },
        {
            id: 'share',
            icon: 'share-outline',
            image: 'square.and.arrow.up',
            tintColor: textColor,
            menuActions: [
                {
                    title: 'Share Project',
                    systemIcon: 'square.and.arrow.up',
                },
                {
                    title: 'Export Report',
                    systemIcon: 'chart.bar.doc.horizontal',
                },
                {
                    title: 'Export PDF',
                    systemIcon: 'doc.richtext',
                },
                {
                    title: 'Copy Project Link',
                    systemIcon: 'link',
                }
            ],
            onMenuPress: handleShareMenuPress,
        },
        {
            id: 'settings',
            image: 'gearshape',
            icon: 'settings-outline',
            tintColor: activeTab === 'setup' ? FormaBlue[700] : textColor,
            onPress: () => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                if (isEmbedded && onOpenSetupModule) {
                    onOpenSetupModule('general_settings');
                } else if (isEmbedded) {
                    const nextTab = activeTab === 'setup' ? 'overview' : 'setup';
                    setActiveTab(nextTab);
                    onTabChange?.(nextTab);
                } else {
                    router.push(`/project-setup/${projectId}` as any);
                }
            }
        }
    ];

    const headerTitleText = project ? (project.title.length > 20 ? project.code : project.title) : 'Project';

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}>
            {!isEmbedded && (
                <Stack.Screen
                    options={{
                        headerShown: true,
                        headerTitle: headerTitleText,
                        headerLargeTitle: false,
                        headerTransparent: false,
                        headerShadowVisible: false,
                        headerStyle: { backgroundColor: isDark ? '#000000' : '#F2F2F7' },
                        headerTintColor: textColor,
                        headerTitleStyle: { color: textColor, fontWeight: '600' },
                        headerBackButtonDisplayMode: 'minimal',
                        headerRight: () => (
                            <View style={{ marginRight: Platform.OS === 'web' ? 16 : 0 }}>
                                <HeaderToolbar
                                    actions={actions}
                                    isDark={isDark}
                                    textColor={textColor}
                                />
                            </View>
                        ),
                    }}
                />
            )}

            {/* Floating Top Bar when embedded/desktop */}
            {isEmbedded && !contentOnly && (
                <View style={[styles.floatingHeaderBar, isPreview && { justifyContent: 'flex-end' }]}>
                    {/* Left: Back to Projects button (in workspace mode) or Standalone Badge */}
                    {!isPreview && isFocusedWorkspace && onClose ? (
                        <TouchableOpacity
                            onPress={onClose || (() => router.back())}
                            style={[styles.smallPill, {
                                height: 40,
                                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.65)',
                                paddingHorizontal: 14,
                                borderRadius: 999,
                                borderWidth: 0,
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 6,
                                ...Platform.select({
                                    web: {
                                        backdropFilter: 'blur(24px)',
                                        WebkitBackdropFilter: 'blur(24px)',
                                        boxShadow: isDark ? '0 2px 10px rgba(0, 0, 0, 0.2)' : '0 2px 10px rgba(0, 0, 0, 0.03)',
                                        cursor: 'pointer',
                                    },
                                    default: {},
                                }),
                            }]}
                        >
                            <PlatformIcon name="chevron.left" size={14} tintColor={textColor} />
                            <Text style={{ color: textColor, fontSize: 13, fontWeight: '600' }}>Projects</Text>
                        </TouchableOpacity>
                    ) : !isPreview ? (
                        <View
                            style={[styles.smallPill, {
                                height: 40,
                                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.65)',
                                paddingHorizontal: 16,
                                borderRadius: 999,
                                borderWidth: 0,
                                justifyContent: 'center',
                                alignItems: 'center',
                                ...Platform.select({
                                    web: {
                                        backdropFilter: 'blur(24px)',
                                        WebkitBackdropFilter: 'blur(24px)',
                                        boxShadow: isDark ? '0 2px 10px rgba(0, 0, 0, 0.2)' : '0 2px 10px rgba(0, 0, 0, 0.03)',
                                    },
                                    default: {},
                                }),
                            }]}
                        >
                            <Text style={{ color: isDark ? '#FFFFFF' : '#1C1C1E', fontSize: 13, fontWeight: '700' }}>
                                {project ? formatProjectBadge(project, numberingSettings) : 'PRJ'}
                            </Text>
                        </View>
                    ) : null}

                    {/* Right: Actions */}
                    {isPreview ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            {onOpenWorkspace && (
                                <TouchableOpacity
                                    onPress={onOpenWorkspace}
                                    style={{
                                        height: 40,
                                        paddingHorizontal: 16,
                                        borderRadius: 20,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexDirection: 'row',
                                        gap: 6,
                                        backgroundColor: '#007AFF',
                                        borderWidth: 0,
                                        ...Platform.select({
                                            web: {
                                                boxShadow: 'none',
                                                cursor: 'pointer',
                                            },
                                            default: {},
                                        }),
                                    }}
                                >
                                    <Ionicons name="folder-open" size={16} color="#FFFFFF" />
                                    <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>Open Project</Text>
                                </TouchableOpacity>
                            )}
                            {onClose && isPreview && (
                                <TouchableOpacity
                                    onPress={onClose}
                                    style={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: 20,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF',
                                        borderWidth: 0,
                                        ...Platform.select({
                                            web: {
                                                boxShadow: 'none',
                                                cursor: 'pointer',
                                            },
                                            default: {},
                                        }),
                                    }}
                                >
                                    <Ionicons name="close" size={18} color={isDark ? '#FFFFFF' : '#1C1C1E'} />
                                </TouchableOpacity>
                            )}
                        </View>
                    ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <HeaderToolbar
                                actions={actions}
                                isDark={isDark}
                                textColor={textColor}
                            />
                            {onClose && isPreview && (
                                <TouchableOpacity
                                    onPress={onClose}
                                    style={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: 20,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.65)',
                                        borderWidth: 0,
                                        ...Platform.select({
                                            web: {
                                                backdropFilter: 'blur(24px)',
                                                WebkitBackdropFilter: 'blur(24px)',
                                                boxShadow: isDark ? '0 2px 10px rgba(0, 0, 0, 0.2)' : '0 2px 10px rgba(0, 0, 0, 0.03)',
                                                cursor: 'pointer',
                                            },
                                            default: {},
                                        }),
                                    }}
                                >
                                    <Ionicons name="close" size={18} color={textColor} />
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </View>
            )}

            {contentOnly && ['work', 'tracking'].includes(activeTab) ? <View style={{ flex: 1, minHeight: 0 }}>{renderTabContent()}</View> : <ScrollView
                ref={scrollViewRef}
                style={[styles.container, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}
                contentContainerStyle={{ paddingBottom: 100 }}
                stickyHeaderIndices={!isPreview && !contentOnly ? [1] : undefined}
                onScroll={(e) => setScrollY(e.nativeEvent.contentOffset.y)}
                scrollEventThrottle={16}
            >
                {!contentOnly && <View>
                    {/* Hero Section - Edge-to-Edge with Blended Gradient */}
                    <TouchableOpacity
                        style={[styles.heroContainer, isEmbedded && { height: viewportWidth >= 768 ? 280 : 350 }]}
                        onPress={() => setIsPreviewVisible(true)}
                        activeOpacity={0.95}
                    >
                        {project?.heroImage ? (
                            <Image
                                source={typeof project.heroImage === 'string' ? { uri: project.heroImage } : project.heroImage}
                                style={styles.heroImage}
                                resizeMode="cover"
                            />
                        ) : (
                            <View style={[styles.heroImage, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9', justifyContent: 'center', alignItems: 'center' }]}>
                                <TenantBrandLogo tenant={activeTenant} size={90} isDark={isDark} />
                            </View>
                        )}

                        <LinearGradient
                            colors={[
                                'transparent',
                                isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.1)',
                                isDark ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.9)',
                                isDark ? '#000000' : '#F2F2F7'
                            ]}
                            style={[StyleSheet.absoluteFill, { top: '35%' }]}
                            locations={[0, 0.3, 0.7, 1]}
                        />

                        <View style={[styles.heroContent, { paddingBottom: 10 }]}>
                            <View style={styles.heroTextRow}>
                                <View style={{ flex: 1 }}>
                                    <View
                                        style={[styles.smallPill, {
                                            alignSelf: 'flex-start',
                                            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.06)',
                                            borderWidth: 0,
                                            paddingHorizontal: 8,
                                            paddingVertical: 3,
                                            borderRadius: 999,
                                            marginBottom: 6,
                                        }]}
                                    >
                                        <Text style={[styles.smallPillText, { color: isDark ? '#FFFFFF' : '#1C1C1E', fontSize: 11, fontWeight: '700' }]}>
                                            {project ? formatProjectBadge(project, numberingSettings) : 'PRJ'}
                                        </Text>
                                    </View>
                                    <Text style={[styles.title, { color: isDark ? '#FFFFFF' : '#1C1C1E' }]}>{project?.title || ''}</Text>
                                    <Text style={[styles.subtext, { color: isDark ? '#E5E5EA' : '#3A3A3C' }]}>
                                        {project?.location ? `${project.location} • ${project.phase}` : (project?.phase || '')}
                                    </Text>
                                </View>
                                {project && resolveTrackingMethod(project.meta?.trackingMethod || project.meta?.progressTracking || (project as any).progressTracking).isEnabled && (
                                    <ProgressRing progress={project.progress || 0} size={48} strokeWidth={4} />
                                )}
                            </View>
                        </View>
                    </TouchableOpacity>
                </View>}

                {/* Sticky Segmented Control Layer (Only on Mobile / Non-embedded) */}
                {!isPreview && !contentOnly && (
                    <View
                        style={[
                            styles.stickySegmentedControlContainer,
                            isEmbedded && Platform.OS === 'web' && {
                                // Reserve the floating toolbar row as this section reaches the top.
                                paddingTop: 10 + Math.min(64, Math.max(0, scrollY - ((viewportWidth >= 768 ? 280 : 350) - 64))),
                            },
                            {
                                backgroundColor: isDark
                                    ? (Platform.OS === 'web' ? 'rgba(0, 0, 0, 0.88)' : '#000000')
                                    : (Platform.OS === 'web' ? 'rgba(242, 242, 247, 0.88)' : '#F2F2F7'),
                            }
                        ]}
                    >
                        <SegmentedControl
                            segments={[
                                { id: 'overview', label: 'Overview', icon: 'doc.plaintext' },
                                { id: 'work', label: 'Work', icon: 'location.viewfinder' },
                                { id: 'activity', label: 'Activity', icon: 'bolt.horizontal' },
                                { id: 'docs', label: 'Docs', icon: 'folder' },
                            ]}
                            activeSegment={activeTab}
                            onSegmentChange={(tab) => { setActiveTab(tab); onTabChange?.(tab); }}
                            style={styles.topSegmentedControl}
                        />
                    </View>
                )}

                <View style={[styles.content, contentOnly && { width: '100%', maxWidth: 960, alignSelf: 'center' }]}>{renderTabContent()}</View>
            </ScrollView>}

            {/* Image Preview & Change Modal */}
            <Modal
                visible={isPreviewVisible}
                transparent={true}
                animationType="fade"
                statusBarTranslucent={true}
                onRequestClose={() => setIsPreviewVisible(false)}
            >
                <View style={styles.modalBackdrop}>
                    {/* Header — X left, Change Photo right */}
                    <View style={[styles.modalHeader, { top: insets.top + 10, paddingHorizontal: 16 }]}>
                        <BouncyModalCircleButton
                            onPress={() => setIsPreviewVisible(false)}
                            icon="xmark"
                        />
                        <BouncyModalCapsuleButton
                            onPress={handlePickImage}
                            icon="photo.on.rectangle"
                            label={isUploadingImage ? 'Uploading...' : 'Change'}
                            disabled={isUploadingImage}
                        />
                    </View>

                    {/* Full-size Image */}
                    <View style={styles.modalImageContainer}>
                        {isUploadingImage ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color="#FFFFFF" />
                                <Text style={styles.loadingText}>Uploading image...</Text>
                            </View>
                        ) : project?.heroImage ? (
                            <Image
                                source={typeof project.heroImage === 'string' ? { uri: project.heroImage } : project.heroImage}
                                style={{
                                    width: Dimensions.get('window').width - 40,
                                    height: Dimensions.get('window').height * 0.45,
                                    borderRadius: 16,
                                }}
                                resizeMode="cover"
                            />
                        ) : (
                            <View style={styles.placeholderContainer}>
                                {tenantLogoUrl ? (
                                    <Image
                                        source={{ uri: tenantLogoUrl }}
                                        style={{ width: 140, height: 140, borderRadius: 28 }}
                                        resizeMode="contain"
                                    />
                                ) : (
                                    <View style={{ width: 120, height: 120, borderRadius: 28, backgroundColor: primaryColor || '#007AFF', justifyContent: 'center', alignItems: 'center' }}>
                                        <Text style={{ color: '#FFFFFF', fontSize: 44, fontWeight: '700' }}>{tenantInitial}</Text>
                                    </View>
                                )}
                            </View>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Floating Action Button (Overview/Work Tab): Add Milestone, Add Task, Add Action, Manual Progress */}
            {project && !isPreview && (activeTab === 'overview' || activeTab === 'work') && (
                <View
                    style={[
                        styles.floatingFabContainer,
                        { bottom: Math.max(insets.bottom, 16) + 12 }
                    ]}
                >
                    <ContextMenu
                        actions={[
                            {
                                title: 'Add Action',
                                systemIcon: 'bolt.fill',
                            },
                            {
                                title: 'Add Task',
                                systemIcon: 'checklist',
                            },
                            {
                                title: 'Add Milestone',
                                systemIcon: 'flag',
                            },
                            ...(resolveTrackingMethod(project?.meta?.trackingMethod || project?.meta?.progressTracking || (project as any)?.progressTracking).method === 'manual' ? [{
                                title: 'Adjust Progress Manually',
                                systemIcon: 'slider.horizontal.3',
                            }] : []),
                        ]}
                        onPress={(e) => {
                            const actionName = e.nativeEvent.name;
                            if (actionName === 'Adjust Progress Manually') {
                                handleOpenManualProgressPrompt();
                            } else if (actionName === 'Add Milestone') {
                                setShowAddMilestoneModal(true);
                            } else if (actionName === 'Add Task') {
                                setIsAddTaskVisible(true);
                            } else if (actionName === 'Add Action') {
                                setIsAddActionVisible(true);
                            }
                        }}
                        dropdownMenuMode={true}
                    >
                        <Animated.View
                            style={fabAnimatedStyle}
                            onTouchStart={handleFabTouchStart}
                            onTouchEnd={handleFabTouchEnd}
                            onTouchCancel={handleFabTouchEnd}
                        >
                            {Platform.OS === 'ios' ? (
                                <View style={styles.floatingFabButton}>
                                    <PlatformIcon name="plus" size={20} tintColor="#FFFFFF" weight="bold" />
                                </View>
                            ) : (
                                <BouncyGlassButton
                                    isMenuToggle={true}
                                    isGlass={false}
                                    style={styles.floatingFabButton}
                                >
                                    <Ionicons name="add" size={22} color="#FFFFFF" />
                                </BouncyGlassButton>
                            )}
                        </Animated.View>
                    </ContextMenu>
                </View>
            )}

            {/* Floating Toolbar for ACTIVITY tab (Search Icon + Filter ContextMenu + Add Activity FAB) */}
            {project && activeTab === 'activity' && (
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'position' : undefined}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? (insets.bottom > 0 ? insets.bottom + 8 : 16) : 0}
                    style={[
                        styles.floatingActivityToolbarWrapper,
                        { bottom: Math.max(insets.bottom, 16) + 12 }
                    ]}
                    pointerEvents="box-none"
                >
                    {isActivitySearchExpanded ? (
                        /* Expanded Full-Width Liquid Glass Search Capsule */
                        <View style={styles.floatingActivitySearchCapsule}>
                            {Platform.OS === 'ios' ? (
                                <Host style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                                    <GlassEffectContainer modifiers={[
                                        frame({ height: 48 }),
                                        cornerRadius(24),
                                        glassEffect({ shape: 'capsule' })
                                    ]}>
                                        <HStack alignment="center" modifiers={[
                                            frame({ height: 48 }),
                                            swiftUIPadding({ leading: 14, trailing: 14 })
                                        ]}>
                                            <Spacer />
                                        </HStack>
                                    </GlassEffectContainer>
                                </Host>
                            ) : (
                                <View style={[styles.activitySearchCapsuleFallback, { backgroundColor: isDark ? 'rgba(30,30,30,0.88)' : 'rgba(255,255,255,0.88)' }]} />
                            )}
                            <View style={styles.activitySearchInnerRow}>
                                <PlatformIcon name="magnifyingglass" size={17} tintColor={isDark ? '#8E8E93' : '#9CA3AF'} />
                                <TextInput
                                    autoFocus
                                    placeholder="Search activities, updates, members..."
                                    placeholderTextColor={isDark ? '#8E8E93' : '#9CA3AF'}
                                    value={activitySearchQuery}
                                    onChangeText={setActivitySearchQuery}
                                    style={[styles.floatingActivitySearchInput, { color: isDark ? '#FFFFFF' : '#000000' }]}
                                />
                                <TouchableOpacity
                                    onPress={() => {
                                        Keyboard.dismiss();
                                        setActivitySearchQuery('');
                                        handleToggleActivitySearch(false);
                                    }}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                    style={{ padding: 4 }}
                                >
                                    <PlatformIcon
                                        name="xmark.circle.fill"
                                        size={18}
                                        tintColor={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)'}
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        /* Collapsed Toolbar: Search Circle + Filter Circle (Left) and Floating + FAB (Right) */
                        <View style={styles.floatingActivityToolbarRow}>
                            {/* Left Controls: Search Icon Button + Filter Pulldown */}
                            <View style={styles.floatingActivityLeftRow}>
                                {/* 1. Search Icon Circle */}
                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    onPress={() => {
                                        Haptics.selectionAsync();
                                        handleToggleActivitySearch(true);
                                    }}
                                    style={styles.activityToolbarCircleBtn}
                                >
                                    {Platform.OS === 'ios' ? (
                                        <Host style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                                            <GlassEffectContainer modifiers={[
                                                frame({ width: 44, height: 44 }),
                                                cornerRadius(22),
                                                glassEffect({ shape: 'circle' })
                                            ]}>
                                                <HStack alignment="center" modifiers={[frame({ width: 44, height: 44 })]}>
                                                    <SwiftUIImage systemName="magnifyingglass" size={18} color={isDark ? '#FFFFFF' : '#000000'} />
                                                </HStack>
                                            </GlassEffectContainer>
                                        </Host>
                                    ) : (
                                        <View style={[styles.activityCircleFallback, { backgroundColor: isDark ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.85)' }]}>
                                            <Ionicons name="search" size={20} color={isDark ? '#FFFFFF' : '#000000'} />
                                        </View>
                                    )}
                                </TouchableOpacity>

                                {/* 2. Filter Circle with Native Pulldown ContextMenu */}
                                <ContextMenu
                                    actions={[
                                        ...(activityFilter !== 'all' || activityDateRange.startDate ? [{ title: 'Reset Filters', systemIcon: 'arrow.counterclockwise', destructive: true }] : []),
                                        { title: activityDateRange.label ? `Date: ${activityDateRange.label}` : 'Date Range...', selected: !!activityDateRange.startDate, systemIcon: 'calendar' },
                                        { title: 'Modules', selected: activityFilter === 'modules', systemIcon: 'square.grid.2x2' },
                                        { title: 'Works', selected: activityFilter === 'works', systemIcon: 'hammer' },
                                        { title: 'Updates', selected: activityFilter === 'updates', systemIcon: 'bubble.left.and.bubble.right' },
                                        { title: 'All Activities', selected: (activityFilter === 'all' && !activityDateRange.startDate), systemIcon: 'checklist' },
                                    ]}
                                    dropdownMenuMode={true}
                                    onPress={(e) => {
                                        Haptics.selectionAsync();
                                        const name = e.nativeEvent.name;
                                        if (name === 'All Activities') {
                                            setActivityFilter('all');
                                            setActivityDateRange({ startDate: null, endDate: null, label: undefined });
                                        } else if (name === 'Updates') {
                                            setActivityFilter('updates');
                                        } else if (name === 'Works') {
                                            setActivityFilter('works');
                                        } else if (name === 'Modules') {
                                            setActivityFilter('modules');
                                        } else if (name.startsWith('Date') || name === 'Date Range...') {
                                            setIsDateRangeSheetVisible(true);
                                        } else if (name === 'Reset Filters') {
                                            setActivityFilter('all');
                                            setActivityDateRange({ startDate: null, endDate: null, label: undefined });
                                        }
                                    }}
                                >
                                    <TouchableOpacity activeOpacity={0.8} style={styles.activityToolbarCircleBtn}>
                                        {Platform.OS === 'ios' ? (
                                            <Host style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                                                <GlassEffectContainer modifiers={[
                                                    frame({ width: 44, height: 44 }),
                                                    cornerRadius(22),
                                                    glassEffect({ shape: 'circle' })
                                                ]}>
                                                    <HStack alignment="center" modifiers={[frame({ width: 44, height: 44 })]}>
                                                        <SwiftUIImage
                                                            systemName="line.3.horizontal.decrease"
                                                            size={18}
                                                            color={activityFilter !== 'all' || activityDateRange.startDate ? '#007AFF' : (isDark ? '#FFFFFF' : '#000000')}
                                                        />
                                                    </HStack>
                                                </GlassEffectContainer>
                                            </Host>
                                        ) : (
                                            <View style={[styles.activityCircleFallback, { backgroundColor: isDark ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.85)' }]}>
                                                <Ionicons
                                                    name="options-outline"
                                                    size={20}
                                                    color={activityFilter !== 'all' || activityDateRange.startDate ? '#007AFF' : (isDark ? '#FFFFFF' : '#000000')}
                                                />
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                </ContextMenu>

                                {/* 3. Drafts Button with Native ContextMenu */}
                                {(() => {
                                    const draftActivities = (project?.meta?.draftActivities && Array.isArray(project.meta.draftActivities)) ? (project.meta.draftActivities as any[]) : [];
                                    return (
                                        <ContextMenu
                                            actions={[
                                                ...(draftActivities.length > 0 ? [
                                                    ...draftActivities.map((draft, idx) => ({
                                                        title: `${draft.title || draft.description || `Draft #${idx + 1}`}`.slice(0, 30),
                                                        systemIcon: 'doc.text',
                                                    })),
                                                    { title: 'Clear All Drafts', systemIcon: 'trash', destructive: true },
                                                ] : [
                                                    { title: 'No Saved Drafts', systemIcon: 'tray', disabled: true }
                                                ])
                                            ]}
                                            dropdownMenuMode={true}
                                            onPress={async (e) => {
                                                Haptics.selectionAsync();
                                                const name = e.nativeEvent.name;
                                                if (name === 'Clear All Drafts') {
                                                    if (project) {
                                                        await saveProjectMeta(project.id, { ...(project.meta || {}), draftActivities: [] });
                                                        await loadProject();
                                                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                                    }
                                                } else if (name !== 'No Saved Drafts') {
                                                    const found = draftActivities.find((d, idx) => {
                                                        const titleStr = `${d.title || d.description || `Draft #${idx + 1}`}`.slice(0, 30);
                                                        return titleStr === name;
                                                    });
                                                    if (found) {
                                                        setSelectedDraftActivity(found);
                                                        setIsAddActivityVisible(true);
                                                    }
                                                }
                                            }}
                                        >
                                            <TouchableOpacity
                                                activeOpacity={0.8}
                                                onPress={() => {
                                                    Haptics.selectionAsync();
                                                    if (draftActivities.length === 1) {
                                                        setSelectedDraftActivity(draftActivities[0]);
                                                        setIsAddActivityVisible(true);
                                                    } else if (draftActivities.length === 0) {
                                                        Alert.alert('Drafts', 'No saved activity drafts.');
                                                    }
                                                }}
                                                style={styles.activityToolbarCircleBtn}
                                            >
                                                {Platform.OS === 'ios' ? (
                                                    <Host style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                                                        <GlassEffectContainer modifiers={[
                                                            frame({ width: 44, height: 44 }),
                                                            cornerRadius(22),
                                                            glassEffect({ shape: 'circle' })
                                                        ]}>
                                                            <HStack alignment="center" modifiers={[frame({ width: 44, height: 44 })]}>
                                                                <SwiftUIImage
                                                                    systemName={draftActivities.length > 0 ? "tray.full.fill" : "tray"}
                                                                    size={18}
                                                                    color={draftActivities.length > 0 ? '#007AFF' : (isDark ? '#FFFFFF' : '#000000')}
                                                                />
                                                            </HStack>
                                                        </GlassEffectContainer>
                                                    </Host>
                                                ) : (
                                                    <View style={[styles.activityCircleFallback, { backgroundColor: isDark ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.85)' }]}>
                                                        <Ionicons
                                                            name={draftActivities.length > 0 ? "file-tray-full" : "file-tray-outline"}
                                                            size={20}
                                                            color={draftActivities.length > 0 ? '#007AFF' : (isDark ? '#FFFFFF' : '#000000')}
                                                        />
                                                    </View>
                                                )}
                                                {draftActivities.length > 0 && (
                                                    <View style={{
                                                        position: 'absolute',
                                                        top: -2,
                                                        right: -2,
                                                        backgroundColor: '#007AFF',
                                                        borderRadius: 10,
                                                        minWidth: 18,
                                                        height: 18,
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        paddingHorizontal: 4,
                                                        borderWidth: 1.5,
                                                        borderColor: isDark ? '#1C1C1E' : '#FFFFFF',
                                                    }}>
                                                        <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '700' }}>
                                                            {draftActivities.length}
                                                        </Text>
                                                    </View>
                                                )}
                                            </TouchableOpacity>
                                        </ContextMenu>
                                    );
                                })()}
                            </View>

                            {/* Right: + Activity FAB */}
                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={() => {
                                    Haptics.selectionAsync();
                                    setIsAddActivityVisible(true);
                                }}
                            >
                                <Animated.View
                                    style={fabAnimatedStyle}
                                    onTouchStart={handleFabTouchStart}
                                    onTouchEnd={handleFabTouchEnd}
                                    onTouchCancel={handleFabTouchEnd}
                                >
                                    {Platform.OS === 'ios' ? (
                                        <View style={styles.floatingFabButton}>
                                            <PlatformIcon name="plus" size={20} tintColor="#FFFFFF" weight="bold" />
                                        </View>
                                    ) : (
                                        <BouncyGlassButton
                                            isGlass={false}
                                            style={styles.floatingFabButton}
                                        >
                                            <Ionicons name="add" size={22} color="#FFFFFF" />
                                        </BouncyGlassButton>
                                    )}
                                </Animated.View>
                            </TouchableOpacity>
                        </View>
                    )}
                </KeyboardAvoidingView>
            )}

            {/* Floating Toolbar for DOCS tab (Liquid Glass Search Capsule + Filter ContextMenu + Sort ContextMenu OR Multi-Select Floating Bar) */}
            {project && activeTab === 'docs' && (
                isDocSelectMode ? (
                    <View
                        style={[
                            styles.floatingInputWrapper,
                            { bottom: insets.bottom > 0 ? insets.bottom + 8 : 16 }
                        ]}
                        pointerEvents="box-none"
                    >
                        <View style={styles.floatingSelectToolbarRow}>
                            {/* Done Button */}
                            <BouncyToolbarButton
                                onPress={() => {
                                    setIsDocSelectMode(false);
                                    setSelectedDocIds([]);
                                }}
                                style={styles.selectDoneBtn}
                            >
                                {Platform.OS === 'ios' ? (
                                    <Host style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                                        <GlassEffectContainer modifiers={[
                                            frame({ height: 44 }),
                                            cornerRadius(22),
                                            glassEffect({ shape: 'capsule' })
                                        ]}>
                                            <HStack alignment="center" modifiers={[
                                                frame({ height: 44 }),
                                                swiftUIPadding({ leading: 18, trailing: 18 })
                                            ]}>
                                                <Spacer />
                                            </HStack>
                                        </GlassEffectContainer>
                                    </Host>
                                ) : (
                                    <View style={[styles.selectBtnFallback, { backgroundColor: isDark ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.85)' }]} />
                                )}
                                <Text style={styles.selectDoneBtnText}>Done</Text>
                            </BouncyToolbarButton>

                            {/* Multi-Select Action Circles */}
                            <View style={styles.selectActionsGroup}>
                                <BouncyToolbarButton
                                    disabled={selectedDocIds.length === 0}
                                    onPress={handleBatchDownloadDocs}
                                    style={styles.selectActionCircleBtn}
                                >
                                    {Platform.OS === 'ios' ? (
                                        <Host style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                                            <GlassEffectContainer modifiers={[
                                                frame({ width: 44, height: 44 }),
                                                cornerRadius(22),
                                                glassEffect({ shape: 'circle' })
                                            ]}>
                                                <HStack alignment="center" modifiers={[frame({ width: 44, height: 44 })]}>
                                                    <Spacer />
                                                </HStack>
                                            </GlassEffectContainer>
                                        </Host>
                                    ) : (
                                        <View style={[styles.selectCircleFallback, { backgroundColor: isDark ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.85)' }]} />
                                    )}
                                    <PlatformIcon name="arrow.down.to.line" size={18} tintColor={selectedDocIds.length === 0 ? (isDark ? '#636366' : '#AEAEB2') : textColor} />
                                </BouncyToolbarButton>

                                <BouncyToolbarButton
                                    disabled={selectedDocIds.length === 0}
                                    onPress={handleBatchBookmarkDocs}
                                    style={styles.selectActionCircleBtn}
                                >
                                    {Platform.OS === 'ios' ? (
                                        <Host style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                                            <GlassEffectContainer modifiers={[
                                                frame({ width: 44, height: 44 }),
                                                cornerRadius(22),
                                                glassEffect({ shape: 'circle' })
                                            ]}>
                                                <HStack alignment="center" modifiers={[frame({ width: 44, height: 44 })]}>
                                                    <Spacer />
                                                </HStack>
                                            </GlassEffectContainer>
                                        </Host>
                                    ) : (
                                        <View style={[styles.selectCircleFallback, { backgroundColor: isDark ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.85)' }]} />
                                    )}
                                    <PlatformIcon name="bookmark" size={18} tintColor={selectedDocIds.length === 0 ? (isDark ? '#636366' : '#AEAEB2') : textColor} />
                                </BouncyToolbarButton>

                                <ContextMenu
                                    actions={multiSelectDocDeleteActions}
                                    dropdownMenuMode={true}
                                    disabled={selectedDocIds.length === 0}
                                    onPress={(e) => {
                                        if (e.nativeEvent.name.includes('Delete')) {
                                            handleBatchDeleteDocs();
                                        }
                                    }}
                                >
                                    <BouncyToolbarButton
                                        disabled={selectedDocIds.length === 0}
                                        style={styles.selectActionCircleBtn}
                                    >
                                        {Platform.OS === 'ios' ? (
                                            <Host style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                                                <GlassEffectContainer modifiers={[
                                                    frame({ width: 44, height: 44 }),
                                                    cornerRadius(22),
                                                    glassEffect({ shape: 'circle' })
                                                ]}>
                                                    <HStack alignment="center" modifiers={[frame({ width: 44, height: 44 })]}>
                                                        <Spacer />
                                                    </HStack>
                                                </GlassEffectContainer>
                                            </Host>
                                        ) : (
                                            <View style={[styles.selectCircleFallback, { backgroundColor: isDark ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.85)' }]} />
                                        )}
                                        <PlatformIcon name="trash" size={18} tintColor={selectedDocIds.length === 0 ? (isDark ? '#636366' : '#AEAEB2') : '#FF453A'} />
                                    </BouncyToolbarButton>
                                </ContextMenu>
                            </View>
                        </View>
                    </View>
                ) : (
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'position' : undefined}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? (insets.bottom > 0 ? insets.bottom + 8 : 16) : 0}
                        style={[
                            styles.floatingActivityToolbarWrapper,
                            { bottom: insets.bottom > 0 ? insets.bottom + 8 : 16 }
                        ]}
                        pointerEvents="box-none"
                    >
                        {isDocsSearchExpanded ? (
                            /* Expanded Docs Search Bar */
                            <View style={styles.floatingActivitySearchCapsule}>
                                {Platform.OS === 'ios' ? (
                                    <Host style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                                        <GlassEffectContainer modifiers={[
                                            frame({ height: 48 }),
                                            cornerRadius(24),
                                            glassEffect({ shape: 'capsule' })
                                        ]}>
                                            <HStack alignment="center" modifiers={[
                                                frame({ height: 48 }),
                                                swiftUIPadding({ leading: 16, trailing: 16 })
                                            ]}>
                                                <Spacer />
                                            </HStack>
                                        </GlassEffectContainer>
                                    </Host>
                                ) : (
                                    <View style={[styles.activitySearchCapsuleFallback, { backgroundColor: isDark ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.85)' }]} />
                                )}

                                <View style={styles.activitySearchInnerRow}>
                                    <PlatformIcon name="magnifyingglass" size={17} tintColor={isDark ? '#8E8E93' : '#9CA3AF'} />
                                    <TextInput
                                        autoFocus
                                        placeholder="Search documents..."
                                        placeholderTextColor={isDark ? '#8E8E93' : '#9CA3AF'}
                                        value={docsSearchQuery}
                                        onChangeText={setDocsSearchQuery}
                                        style={[styles.floatingActivitySearchInput, { color: isDark ? '#FFFFFF' : '#000000' }]}
                                    />
                                    <TouchableOpacity
                                        onPress={() => {
                                            Keyboard.dismiss();
                                            setDocsSearchQuery('');
                                            handleToggleDocsSearch(false);
                                        }}
                                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                        style={{ padding: 4 }}
                                    >
                                        <PlatformIcon
                                            name="xmark.circle.fill"
                                            size={18}
                                            tintColor={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)'}
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : (
                            /* Collapsed Toolbar: Search Circle + Filter Circle + Sort Circle (Left) and Floating + FAB (Right) */
                            <View style={styles.floatingActivityToolbarRow}>
                                {/* Left Controls: Search, Filter Pulldown, Sort Pulldown */}
                                <View style={styles.floatingActivityLeftRow}>
                                    {/* 1. Search Icon Circle */}
                                    <TouchableOpacity
                                        activeOpacity={0.8}
                                        onPress={() => {
                                            Haptics.selectionAsync();
                                            handleToggleDocsSearch(true);
                                        }}
                                        style={styles.activityToolbarCircleBtn}
                                    >
                                        {Platform.OS === 'ios' ? (
                                            <Host style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                                                <GlassEffectContainer modifiers={[
                                                    frame({ width: 44, height: 44 }),
                                                    cornerRadius(22),
                                                    glassEffect({ shape: 'circle' })
                                                ]}>
                                                    <HStack alignment="center" modifiers={[frame({ width: 44, height: 44 })]}>
                                                        <SwiftUIImage systemName="magnifyingglass" size={18} color={isDark ? '#FFFFFF' : '#000000'} />
                                                    </HStack>
                                                </GlassEffectContainer>
                                            </Host>
                                        ) : (
                                            <View style={[styles.activityCircleFallback, { backgroundColor: isDark ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.85)' }]}>
                                                <Ionicons name="search" size={20} color={isDark ? '#FFFFFF' : '#000000'} />
                                            </View>
                                        )}
                                    </TouchableOpacity>

                                    {/* 2. Filter Circle with Native Pulldown ContextMenu */}
                                    <ContextMenu
                                        actions={docFilterActions}
                                        dropdownMenuMode={true}
                                        onPress={(e) => handleDocFilterAction(e.nativeEvent.name)}
                                    >
                                        <TouchableOpacity activeOpacity={0.8} style={styles.activityToolbarCircleBtn}>
                                            {Platform.OS === 'ios' ? (
                                                <Host style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                                                    <GlassEffectContainer modifiers={[
                                                        frame({ width: 44, height: 44 }),
                                                        cornerRadius(22),
                                                        glassEffect({ shape: 'circle' })
                                                    ]}>
                                                        <HStack alignment="center" modifiers={[frame({ width: 44, height: 44 })]}>
                                                            <SwiftUIImage
                                                                systemName={docsFilterType !== 'all' ? 'line.3.horizontal.decrease.circle.fill' : 'line.3.horizontal.decrease'}
                                                                size={18}
                                                                color={docsFilterType !== 'all' ? '#007AFF' : (isDark ? '#FFFFFF' : '#000000')}
                                                            />
                                                        </HStack>
                                                    </GlassEffectContainer>
                                                </Host>
                                            ) : (
                                                <View style={[styles.activityCircleFallback, { backgroundColor: isDark ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.85)' }]}>
                                                    <Ionicons
                                                        name="options-outline"
                                                        size={20}
                                                        color={docsFilterType !== 'all' ? '#007AFF' : (isDark ? '#FFFFFF' : '#000000')}
                                                    />
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    </ContextMenu>

                                    {/* 3. Sort Circle with Native Pulldown ContextMenu */}
                                    <ContextMenu
                                        actions={docSortActions}
                                        dropdownMenuMode={true}
                                        onPress={(e) => handleDocSortAction(e.nativeEvent.name)}
                                    >
                                        <TouchableOpacity activeOpacity={0.8} style={styles.activityToolbarCircleBtn}>
                                            {Platform.OS === 'ios' ? (
                                                <Host style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                                                    <GlassEffectContainer modifiers={[
                                                        frame({ width: 44, height: 44 }),
                                                        cornerRadius(22),
                                                        glassEffect({ shape: 'circle' })
                                                    ]}>
                                                        <HStack alignment="center" modifiers={[frame({ width: 44, height: 44 })]}>
                                                            <SwiftUIImage
                                                                systemName="arrow.up.arrow.down"
                                                                size={18}
                                                                color={docsSortMode !== 'date-desc' ? '#007AFF' : (isDark ? '#FFFFFF' : '#000000')}
                                                            />
                                                        </HStack>
                                                    </GlassEffectContainer>
                                                </Host>
                                            ) : (
                                                <View style={[styles.activityCircleFallback, { backgroundColor: isDark ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.85)' }]}>
                                                    <Ionicons
                                                        name="swap-vertical"
                                                        size={20}
                                                        color={docsSortMode !== 'date-desc' ? '#007AFF' : (isDark ? '#FFFFFF' : '#000000')}
                                                    />
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    </ContextMenu>
                                </View>

                                {/* Right: + Upload Document FAB with Context Menu */}
                                <ContextMenu
                                    actions={docUploadActions}
                                    dropdownMenuMode={true}
                                    onPress={(e) => {
                                        Haptics.selectionAsync();
                                        const name = e.nativeEvent.name;
                                        if (name === 'Take Photo') {
                                            handleUploadDoc('camera');
                                        } else if (name === 'Photo Library' || name.includes('Photo')) {
                                            handleUploadDoc('photo');
                                        } else if (name === 'Browse Files' || name.includes('File') || name.includes('Browse')) {
                                            handleUploadDoc('file');
                                        }
                                    }}
                                >
                                    <TouchableOpacity
                                        activeOpacity={0.8}
                                    >
                                        <Animated.View
                                            style={fabAnimatedStyle}
                                            onTouchStart={handleFabTouchStart}
                                            onTouchEnd={handleFabTouchEnd}
                                            onTouchCancel={handleFabTouchEnd}
                                        >
                                            {Platform.OS === 'ios' ? (
                                                <View style={styles.floatingFabButton}>
                                                    <PlatformIcon name="plus" size={20} tintColor="#FFFFFF" weight="bold" />
                                                </View>
                                            ) : (
                                                <BouncyGlassButton
                                                    isGlass={false}
                                                    style={styles.floatingFabButton}
                                                >
                                                    <Ionicons name="add" size={22} color="#FFFFFF" />
                                                </BouncyGlassButton>
                                            )}
                                        </Animated.View>
                                    </TouchableOpacity>
                                </ContextMenu>
                            </View>
                        )}
                    </KeyboardAvoidingView>
                )
            )}

            {/* Floating Back to Top Button for Docs tab */}
            {activeTab === 'docs' && scrollY > 200 && !isDocsSearchExpanded && !isDocSelectMode && (
                <View style={[styles.floatingScrollToTopContainer, { bottom: Math.max(insets.bottom, 16) + 12 + 64 }]}>
                    <BouncyScrollToTopButton
                        isDark={isDark}
                        onPress={() => {
                            scrollViewRef.current?.scrollTo({ y: 0, animated: true });
                        }}
                    />
                </View>
            )}

            {/* Floating Back to Top Button for Activity tab */}
            {activeTab === 'activity' && scrollY > 200 && !isActivitySearchExpanded && (
                <View style={[styles.floatingScrollToTopContainer, { bottom: Math.max(insets.bottom, 16) + 12 + 64 }]}>
                    <BouncyScrollToTopButton
                        isDark={isDark}
                        onPress={() => {
                            scrollViewRef.current?.scrollTo({ y: 0, animated: true });
                        }}
                    />
                </View>
            )}

            {/* Date Range Sheet for Activity Filter */}
            <SwiftUIDateRangeSheet
                isOpened={isDateRangeSheetVisible}
                onClose={() => setIsDateRangeSheetVisible(false)}
                currentRange={activityDateRange}
                onApplyRange={setActivityDateRange}
            />

            {/* Add Task Sheet */}
            <SwiftUIAddTaskSheet
                isOpened={isAddTaskVisible}
                onClose={() => setIsAddTaskVisible(false)}
                onSave={handleTaskSaved}
                defaultProjectId={project?.id}
            />

            {/* Add Action Sheet */}
            <SwiftUIAddActionSheet
                isOpened={isAddActionVisible}
                onClose={() => setIsAddActionVisible(false)}
                onSave={handleActionSaved}
                defaultProjectId={project?.id}
            />

            {/* Add Milestone Sheet */}
            <SwiftUIAddMilestoneSheet
                isOpened={showAddMilestoneModal}
                onClose={() => setShowAddMilestoneModal(false)}
                onSave={handleMilestoneSaved}
                defaultProjectId={project?.id}
            />

            {/* Add Activity Sheet */}
            <SwiftUIAddActivitySheet
                isOpened={isAddActivityVisible}
                onClose={() => setIsAddActivityVisible(false)}
                onSave={async () => {
                    setIsAddActivityVisible(false);
                    await loadProject();
                }}
                defaultProjectId={project?.id}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    floatingHeaderBar: {
        position: 'absolute',
        top: 14,
        left: 14,
        right: 14,
        zIndex: 100,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        pointerEvents: 'box-none',
    },
    floatingBubble: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 24,
        borderWidth: StyleSheet.hairlineWidth,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 6,
        ...(Platform.OS === 'web' ? ({
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
        } as any) : {}),
    },
    heroContainer: {
        height: 320,
        position: 'relative',
        justifyContent: 'flex-end',
        paddingBottom: 15,
    },
    heroImage: {
        ...StyleSheet.absoluteFillObject,
        width: '100%',
        height: '100%',
    },
    heroGradient: {
        ...StyleSheet.absoluteFillObject,
    },
    heroContent: {
        paddingHorizontal: 20,
    },
    heroTextRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 16,
    },
    content: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    subtext: {
        fontSize: 16,
        lineHeight: 22,
    },
    statusSection: {
        gap: 12,
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginLeft: 4,
    },
    statusCard: {
        borderRadius: 16,
        padding: 16,
    },
    statusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statusLabel: {
        fontSize: 16,
        fontWeight: '500',
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
    },
    badgeText: {
        fontSize: 13,
        fontWeight: '600',
    },
    description: {
        fontSize: 14,
        textAlign: 'center',
        fontStyle: 'italic',
        marginTop: 40,
        marginBottom: 40,
    },
    stickySegmentedControlContainer: {
        zIndex: 30,
        width: '100%',
        alignItems: 'flex-start',
        paddingVertical: 10,
        paddingHorizontal: 16,
        ...Platform.select({
            web: {
                position: 'sticky' as any,
                top: 0,
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
            },
            default: {},
        }),
    },
    topSegmentedControl: {
        maxWidth: '100%',
    },
    smallPill: {
        borderRadius: 20,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderWidth: 0.5,
    },
    smallPillText: {
        fontSize: 10,
        fontWeight: '700',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        justifyContent: 'space-between',
    },
    modalHeader: {
        position: 'absolute',
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        zIndex: 10,
    },
    modalCircleBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
    },
    modalCircleFallback: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(28, 28, 30, 0.75)',
        borderRadius: 20,
        borderWidth: 0.5,
        borderColor: 'rgba(255, 255, 255, 0.25)',
        overflow: 'hidden',
    },
    modalCapsuleBtn: {
        height: 40,
        borderRadius: 20,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
    },
    modalCapsuleFallback: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(28, 28, 30, 0.75)',
        borderRadius: 20,
        borderWidth: 0.5,
        borderColor: 'rgba(255, 255, 255, 0.25)',
        overflow: 'hidden',
    },
    modalCapsuleInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    modalCapsuleText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    modalCloseButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalTitle: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '600',
    },
    modalImageContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    largeHeroImage: {
        width: '100%',
        height: 360,
        borderRadius: 16,
    },
    placeholderContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    placeholderText: {
        color: '#8E8E93',
        fontSize: 15,
        marginTop: 16,
    },
    loadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        color: '#FFFFFF',
        fontSize: 16,
        marginTop: 12,
    },
    modalFooter: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
        zIndex: 10,
    },
    changePhotoButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 20,
        paddingVertical: 12,
        overflow: 'hidden',
        gap: 8,
    },
    changePhotoText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
    },
    floatingFabContainer: {
        position: 'absolute',
        right: 20,
        zIndex: 999,
    },
    floatingFabButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#007AFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.16,
        shadowRadius: 5,
        elevation: 4,
        ...Platform.select({
            web: {
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.18)',
                cursor: 'pointer',
            },
            default: {},
        }),
    },
    floatingActivityToolbarWrapper: {
        position: 'absolute',
        left: 20,
        right: 20,
        zIndex: 999,
    },
    floatingActivityToolbarRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    floatingActivityLeftRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    activityToolbarCircleBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 3,
    },
    activityCircleFallback: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    floatingActivitySearchCapsule: {
        width: '100%',
        height: 48,
        borderRadius: 24,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 4,
    },
    activitySearchCapsuleFallback: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 24,
    },
    activitySearchInnerRow: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        gap: 10,
        zIndex: 2,
    },
    floatingActivitySearchInput: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
        height: '100%',
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.92)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalCard: {
        width: '100%',
        maxWidth: 400,
        borderRadius: 20,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    modalCardTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 4,
    },
    modalCardDesc: {
        fontSize: 13,
        marginBottom: 16,
    },
    modalCardInput: {
        height: 44,
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 12,
        fontSize: 14,
        marginBottom: 12,
    },
    modalCardButtonsRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        marginTop: 8,
    },
    modalCardButton: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 10,
    },
    modalCardButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    floatingScrollToTopContainer: {
        position: 'absolute',
        right: 20,
        zIndex: 999,
    },
    scrollToTopBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 4,
    },
    scrollToTopFallback: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 19,
    },

    /* Floating Liquid Glass Input & Docs Toolbars (Anchored above screen bottom) */
    floatingInputWrapper: {
        position: 'absolute',
        left: 14,
        right: 14,
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
    floatingSearchActionsGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
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
    floatingSelectToolbarRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
    },
    selectDoneBtn: {
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        paddingHorizontal: 20,
    },
    selectDoneBtnText: {
        color: '#007AFF',
        fontSize: 15,
        fontWeight: '600',
    },
    selectActionsGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
});

export default function ProjectDetailScreen() {
    const { width } = useWindowDimensions();
    const params = useLocalSearchParams();
    const id = typeof params.id === 'string' ? params.id : params.id?.[0] || '';
    const [project, setProject] = useState<Project | null>(null);
    useFocusEffect(React.useCallback(() => {
        let active = true;
        getProjectById(id).then(value => { if (active) setProject(value); });
        return () => { active = false; };
    }, [id]));
    if (Platform.OS !== 'web' || width < 768) return <ProjectDetailContent />;
    return <>
        <Stack.Screen options={{ headerShown: false }} />
        {project ? <ProjectWorkspace key={project.id} initialProject={project} onClose={() => router.back()}
            renderContent={(selected, tab, onSelect, openSettings) => <ProjectDetailContent key={`${selected.id}-${tab}`} projectId={selected.id}
                initialProject={selected} contentOnly isEmbedded isFocusedWorkspace isPreviewMode={false}
                activeTabProp={tab} onTabChange={onSelect} onOpenSetupModule={openSettings} />}
        /> : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color="#007AFF" /></View>}
    </>;
}
