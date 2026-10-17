import { GlassView } from '@/components/ui/GlassView';
import { FormaLogo } from '@/components/ui/FormaLogo';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useSearch } from '@/context/SearchContext';
import { useTenantContext } from '@/context/TenantContext';
import { getProjects, Project } from '@/lib/api/projects';
import { getTasks, getActions } from '@/lib/api/tasks';
import { Task, Action } from '@/constants/MockData';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState, useMemo } from 'react';
import {
    Dimensions,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Image,
} from 'react-native';
import { FlatList, Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const SPRING_CONFIG = {
    damping: 24,
    stiffness: 150,
    overshootClamping: true,
};

// --- SHARED COMPONENTS ---

const getProgressColor = (progress: number) => {
    if (progress <= 25) return '#FF1F00';
    if (progress <= 50) return '#FF9500';
    if (progress <= 75) return '#00A3FF';
    return '#34C759';
};

const ProgressRing = ({ progress, size = 32, strokeWidth = 2.5 }: { progress: number, size?: number, strokeWidth?: number }) => {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const color = getProgressColor(progress);
    const halfSize = size / 2;
    const clamped = Math.min(100, Math.max(0, progress));
    const rightSideDegrees = Math.min(clamped, 50) * 3.6;
    const leftSideDegrees = Math.max(0, clamped - 50) * 3.6;

    return (
        <View style={[styles.ringContainer, { width: size, height: size }]}>
            <View style={[StyleSheet.absoluteFill, { borderRadius: halfSize, borderWidth: strokeWidth, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]} />
            <View style={{ position: 'absolute', top: 0, right: 0, width: halfSize, height: size, overflow: 'hidden' }}>
                <View style={{ width: size, height: size, position: 'absolute', right: 0, borderRadius: halfSize, borderWidth: strokeWidth, borderColor: 'transparent', borderTopColor: color, borderRightColor: color, transform: [{ rotate: `${rightSideDegrees - 135}deg` }] }} />
            </View>
            <View style={{ position: 'absolute', top: 0, left: 0, width: halfSize, height: size, overflow: 'hidden' }}>
                <View style={{ width: size, height: size, position: 'absolute', left: 0, borderRadius: halfSize, borderWidth: strokeWidth, borderColor: 'transparent', borderBottomColor: clamped > 50 ? color : 'transparent', borderLeftColor: clamped > 50 ? color : 'transparent', transform: [{ rotate: `${leftSideDegrees - 135}deg` }] }} />
            </View>
        </View>
    );
};

export default function SearchModalScreen() {
    const insets = useSafeAreaInsets();
    const { resolvedTheme } = useTheme();
    const router = useRouter();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const subtextColor = Colors[resolvedTheme].icon;

    const { activeTenant } = useTenantContext();
    const { searchQuery, setSearchQuery, activeModule } = useSearch();
    const [activeTab, setActiveTab] = useState(activeModule === 'home' ? 'all' : activeModule);
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    const [projectsList, setProjectsList] = useState<Project[]>([]);
    const [tasksList, setTasksList] = useState<Task[]>([]);
    const [actionsList, setActionsList] = useState<Action[]>([]);

    useEffect(() => {
        const tenantId = activeTenant?.id;
        Promise.all([
            getProjects(tenantId),
            getTasks(tenantId),
            getActions(tenantId),
        ]).then(([projs, tsks, acts]) => {
            if (Array.isArray(projs)) setProjectsList(projs.filter(p => !p.isArchived));
            if (Array.isArray(tsks)) setTasksList(tsks);
            if (Array.isArray(acts)) setActionsList(acts);
        }).catch(err => {
            console.error('Error fetching search data:', err);
        });
    }, [activeTenant?.id]);

    // --- Custom Bottom Sheet Gesture Logic ---
    const CARD_MAX_HEIGHT = SCREEN_HEIGHT - (insets.top + 36);
    const SNAP_TOP = 0;
    const SNAP_MID = SCREEN_HEIGHT * 0.45 - (insets.top + 36);
    const SNAP_BOTTOM = SCREEN_HEIGHT;

    const translateY = useSharedValue(SNAP_BOTTOM);
    const contextY = useSharedValue(0);
    const [scrollEnabled, setScrollEnabled] = useState(false);

    const handleDismiss = () => {
        translateY.value = withTiming(SNAP_BOTTOM, { duration: 250 }, () => {
            runOnJS(router.back)();
        });
    };

    useEffect(() => {
        translateY.value = SNAP_BOTTOM;
        translateY.value = withSpring(SNAP_TOP, SPRING_CONFIG);
        setScrollEnabled(true);
    }, []);

    // Track keyboard height
    useEffect(() => {
        const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
            setKeyboardHeight(e.endCoordinates.height);
        });
        const hideSub = Keyboard.addListener('keyboardDidHide', () => {
            setKeyboardHeight(0);
        });
        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);

    const panGesture = Gesture.Pan()
        .onStart(() => {
            contextY.value = translateY.value;
        })
        .onUpdate((event) => {
            const newY = contextY.value + event.translationY;
            translateY.value = Math.max(SNAP_TOP, newY);
        })
        .onEnd((event) => {
            const velocity = event.velocityY;
            const currentY = translateY.value;
            const threshold = 50;

            if (velocity > 500) {
                if (currentY < SNAP_MID - threshold) {
                    translateY.value = withSpring(SNAP_MID, SPRING_CONFIG);
                    runOnJS(setScrollEnabled)(false);
                } else {
                    translateY.value = withTiming(SNAP_BOTTOM, { duration: 200 }, () => {
                        runOnJS(router.back)();
                    });
                }
            } else if (velocity < -500) {
                translateY.value = withSpring(SNAP_TOP, SPRING_CONFIG);
                runOnJS(setScrollEnabled)(true);
            } else {
                const distToTop = Math.abs(currentY - SNAP_TOP);
                const distToMid = Math.abs(currentY - SNAP_MID);
                const distToBottom = Math.abs(currentY - SNAP_BOTTOM);

                const minDist = Math.min(distToTop, distToMid, distToBottom);
                if (minDist === distToTop) {
                    translateY.value = withSpring(SNAP_TOP, SPRING_CONFIG);
                    runOnJS(setScrollEnabled)(true);
                } else if (minDist === distToMid) {
                    translateY.value = withSpring(SNAP_MID, SPRING_CONFIG);
                    runOnJS(setScrollEnabled)(false);
                } else {
                    translateY.value = withTiming(SNAP_BOTTOM, { duration: 200 }, () => {
                        runOnJS(router.back)();
                    });
                }
            }
        });

    const animatedCardStyle = useAnimatedStyle(() => {
        const progress = Math.max(0, Math.min(1, (SNAP_MID - translateY.value) / (SNAP_MID - SNAP_TOP)));
        const isIOS = Platform.OS === 'ios';
        const sideMargin = isIOS ? 8 * (1 - progress) : 0;
        const bottomMargin = isIOS ? 8 * (1 - progress) : 0;
        const radius = 36 + 20 * (1 - progress);

        return {
            top: insets.top + 36 + translateY.value,
            left: sideMargin,
            right: sideMargin,
            bottom: bottomMargin,
            borderTopLeftRadius: radius,
            borderTopRightRadius: radius,
            borderBottomLeftRadius: isIOS && bottomMargin > 0 ? radius : 0,
            borderBottomRightRadius: isIOS && bottomMargin > 0 ? radius : 0,
            overflow: 'hidden' as const,
        };
    });

    const animatedBackdropStyle = useAnimatedStyle(() => {
        const opacity = 0.5 * (1 - (translateY.value - SNAP_TOP) / (SNAP_BOTTOM - SNAP_TOP));
        return {
            opacity: Math.max(0, Math.min(0.5, opacity)),
        };
    });

    // --- Search Query and Tabs Filter Logic ---
    const results = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        const base = {
            projects: projectsList,
            tasks: tasksList,
            actions: actionsList,
        };

        if (!q) return base;

        return {
            projects: base.projects.filter(p => (p.title || '').toLowerCase().includes(q) || (p.code || '').toLowerCase().includes(q) || (p.location || '').toLowerCase().includes(q)),
            tasks: base.tasks.filter(t => (t.title || '').toLowerCase().includes(q) || (t.project || '').toLowerCase().includes(q)),
            actions: base.actions.filter(a => (a.title || '').toLowerCase().includes(q) || (a.module || '').toLowerCase().includes(q)),
        };
    }, [searchQuery, projectsList, tasksList, actionsList]);

    // Flatten results based on filter tab
    const listData = useMemo(() => {
        const items: any[] = [];

        if (activeTab === 'all' || activeTab === 'projects') {
            if (results.projects.length > 0) {
                items.push({ id: 'hdr-proj', isHeader: true, title: 'Projects' });
                items.push(...results.projects.map(p => ({ ...p, type: 'project' })));
            }
        }
        if (activeTab === 'all' || activeTab === 'tasks') {
            if (results.tasks.length > 0) {
                items.push({ id: 'hdr-task', isHeader: true, title: 'Tasks' });
                items.push(...results.tasks.map(t => ({ ...t, type: 'task' })));
            }
        }
        if (activeTab === 'all' || activeTab === 'actions') {
            if (results.actions.length > 0) {
                items.push({ id: 'hdr-act', isHeader: true, title: 'Recent Actions' });
                items.push(...results.actions.map(a => ({ ...a, type: 'action' })));
            }
        }

        return items;
    }, [results, activeTab]);

    const categories = [
        { id: 'all', label: 'All' },
        { id: 'projects', label: 'Projects' },
        { id: 'tasks', label: 'Tasks' },
        { id: 'actions', label: 'Actions' },
    ];

    const handleItemPress = (item: any) => {
        handleDismiss();
        setTimeout(() => {
            if (item.type === 'project') {
                router.push(`/project-details/${item.id}`);
            } else if (item.type === 'task') {
                router.push('/tasks');
            } else if (item.type === 'action') {
                router.push('/actions');
            }
        }, 300);
    };

    const renderItem = ({ item }: { item: any }) => {
        if (item.isHeader) {
            return (
                <Text style={[styles.sectionHeader, { color: isDark ? '#8E8E93' : '#6E6E73' }]}>
                    {item.title}
                </Text>
            );
        }

        return (
            <TouchableOpacity onPress={() => handleItemPress(item)} activeOpacity={0.7}>
                <View style={[styles.card, { backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }]}>
                    {item.type === 'project' && (
                        <>
                            {item.heroImage ? (
                                <Image source={item.heroImage} style={styles.thumbnail} />
                            ) : (
                                <View style={[styles.thumbnail, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }]}>
                                    <FormaLogo size={20} isDark={isDark} />
                                </View>
                            )}
                            <View style={styles.content}>
                                <Text style={[styles.title, { color: textColor }]} numberOfLines={1}>
                                    {item.title}
                                </Text>
                                <Text style={[styles.subtitle, { color: subtextColor }]}>
                                    {item.code} • {item.location}
                                </Text>
                            </View>
                            <ProgressRing progress={item.progress} />
                        </>
                    )}

                    {item.type === 'task' && (
                        <>
                            <View style={[styles.iconCircle, { backgroundColor: item.priority === 'high' ? 'rgba(255,59,48,0.12)' : 'rgba(52,199,89,0.12)' }]}>
                                <Ionicons
                                    name={item.status === 'done' ? 'checkmark-circle' : 'flag'}
                                    size={18}
                                    color={item.priority === 'high' ? '#FF3B30' : '#34C759'}
                                />
                            </View>
                            <View style={styles.content}>
                                <Text style={[styles.title, { color: textColor }]} numberOfLines={1}>
                                    {item.title}
                                </Text>
                                <Text style={[styles.subtitle, { color: subtextColor }]}>
                                    {item.project} • {item.priority.toUpperCase()}
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color={subtextColor} />
                        </>
                    )}

                    {item.type === 'action' && (
                        <>
                            <View style={[styles.iconCircle, { backgroundColor: 'rgba(0,122,255,0.12)' }]}>
                                <Ionicons name="flash" size={18} color="#007AFF" />
                            </View>
                            <View style={styles.content}>
                                <Text style={[styles.title, { color: textColor }]} numberOfLines={1}>
                                    {item.title}
                                </Text>
                                <Text style={[styles.subtitle, { color: subtextColor }]}>
                                    {item.module} • {item.date}
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color={subtextColor} />
                        </>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.screenWrapper}>
            {/* Dark blur backdrop */}
            <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000000' }, animatedBackdropStyle]}>
                <Pressable style={StyleSheet.absoluteFill} onPress={handleDismiss} />
            </Animated.View>

            {/* Gesture-drag Card Bottom Sheet */}
            <GestureDetector gesture={panGesture}>
                <Animated.View style={[styles.cardWrapper, animatedCardStyle]}>
                    <GlassView
                        intensity={98}
                        tint={isDark ? 'systemThickMaterialDark' : 'systemThickMaterialLight'}
                        style={{ backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7', flex: 1 }}
                    >
                        {/* Drag Handle indicator */}
                        <View style={styles.dragHandleContainer}>
                            <View style={[styles.dragHandle, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }]} />
                        </View>

                        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                            {/* Header */}
                            <View style={styles.header}>
                                <Text style={[styles.headerTitle, { color: textColor }]}>Workspace Search</Text>
                                <TouchableOpacity onPress={handleDismiss} style={styles.closeButton}>
                                    <Text style={styles.closeText}>Close</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Horizontal Categories */}
                            <View style={styles.categoriesContainer}>
                                {categories.map(cat => {
                                    const isSel = activeTab === cat.id;
                                    return (
                                        <TouchableOpacity
                                            key={cat.id}
                                            onPress={() => setActiveTab(cat.id)}
                                            style={[styles.tabButton, isSel && { backgroundColor: isDark ? '#FFF' : '#000' }]}
                                        >
                                            <Text style={[styles.tabText, { color: isSel ? (isDark ? '#000' : '#FFF') : subtextColor }, isSel && { fontWeight: '600' }]}>
                                                {cat.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {/* Search Results List */}
                            <FlatList
                                data={listData}
                                keyExtractor={(item) => item.isHeader ? item.id : `${item.type}-${item.id}`}
                                style={{ flex: 1 }}
                                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: keyboardHeight > 0 ? keyboardHeight + 80 : 90, gap: 8 }}
                                showsVerticalScrollIndicator={false}
                                scrollEnabled={scrollEnabled}
                                renderItem={renderItem}
                                ListEmptyComponent={
                                    <View style={styles.emptyContainer}>
                                        <Ionicons name="search-outline" size={48} color={isDark ? '#3A3A3C' : '#C7C7CC'} />
                                        <Text style={[styles.emptyText, { color: subtextColor }]}>
                                            {searchQuery ? `No results found for "${searchQuery}"` : 'Type keywords to start searching...'}
                                        </Text>
                                    </View>
                                }
                            />

                            {/* Bottom Gradient Fade */}
                            <LinearGradient
                                colors={[
                                    isDark ? 'rgba(28, 28, 30, 0)' : 'rgba(242, 242, 247, 0)',
                                    isDark ? 'rgba(28, 28, 30, 0.95)' : 'rgba(242, 242, 247, 0.95)',
                                    isDark ? '#1C1C1E' : '#F2F2F7'
                                ]}
                                locations={[0, 0.6, 1]}
                                style={styles.bottomGradient}
                                pointerEvents="none"
                            />

                            {/* Beautiful Floating Search Input Bar */}
                            <View style={[
                                styles.floatingSearchContainer,
                                {
                                    backgroundColor: isDark ? 'rgba(44, 44, 46, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                                    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                                    bottom: keyboardHeight > 0 ? keyboardHeight + 16 : 20,
                                }
                            ]}>
                                <Ionicons name="search" size={18} color={isDark ? '#8E8E93' : '#AEAEB2'} style={styles.searchIcon} />
                                <TextInput
                                    style={[styles.searchInput, { color: textColor }]}
                                    placeholder="Search projects, tasks, actions..."
                                    placeholderTextColor={isDark ? '#8E8E93' : '#AEAEB2'}
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                    autoFocus
                                    returnKeyType="search"
                                />
                                {searchQuery.length > 0 && (
                                    <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 6 }}>
                                        <Ionicons name="close-circle" size={16} color={isDark ? '#8E8E93' : '#6e6e73'} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </KeyboardAvoidingView>
                    </GlassView>
                </Animated.View>
            </GestureDetector>
        </View>
    );
}

const styles = StyleSheet.create({
    screenWrapper: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    cardWrapper: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
    },
    dragHandleContainer: {
        width: '100%',
        alignItems: 'center',
        paddingVertical: 10,
        zIndex: 10,
    },
    dragHandle: {
        width: 36,
        height: 5,
        borderRadius: 2.5,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 12,
        paddingTop: 4,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    closeButton: {
        paddingVertical: 4,
        paddingHorizontal: 12,
        borderRadius: 14,
        backgroundColor: 'rgba(0,122,255,0.08)',
    },
    closeText: {
        color: '#007AFF',
        fontWeight: '600',
        fontSize: 14,
    },
    categoriesContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        marginBottom: 16,
        gap: 8,
    },
    tabButton: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 18,
        backgroundColor: 'rgba(128,128,128,0.08)',
    },
    tabText: {
        fontSize: 13,
        fontWeight: '500',
    },
    sectionHeader: {
        fontSize: 13,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        marginTop: 14,
        marginBottom: 6,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 16,
        gap: 12,
        borderWidth: 1,
    },
    thumbnail: {
        width: 38,
        height: 38,
        borderRadius: 10,
    },
    iconCircle: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        flex: 1,
    },
    title: {
        fontSize: 15,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    subtitle: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 2,
    },
    ringContainer: {
        borderRadius: 99,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    bottomGradient: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 100,
        zIndex: 5,
    },
    floatingSearchContainer: {
        position: 'absolute',
        left: 16,
        right: 16,
        height: 50,
        borderRadius: 25,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 6,
        zIndex: 10,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        height: '100%',
        fontSize: 15,
        paddingVertical: 0,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 80,
        paddingHorizontal: 40,
        gap: 12,
    },
    emptyText: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        opacity: 0.8,
    },
});
