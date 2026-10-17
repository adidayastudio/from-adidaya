import { HeaderBlurBackground } from '@/components/ui/HeaderBlurBackground';
import { GlassView } from '@/components/ui/GlassView';
import { Colors } from '@/constants/theme';
import { SwiftUITaskDetailSheet } from '@/components/tasks/SwiftUITaskDetailSheet';
import { SwiftUIActionDetailSheet } from '@/components/actions/SwiftUIActionDetailSheet';
import { useSearch } from '@/context/SearchContext';
import { useTheme } from '@/context/ThemeContext';
import { useTenantContext } from '@/context/TenantContext';
import { getProjects, Project } from '@/lib/api/projects';
import { getTasks, getActions } from '@/lib/api/tasks';
import { Task, Action } from '@/constants/MockData';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { Stack, router, usePathname } from 'expo-router';
import React, { useMemo, useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, TextInput, Platform, KeyboardAvoidingView, Keyboard, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { useUserContext } from '@/context/UserProvider';
import { fetchPurchasingRequests, fetchReimburseRequests } from '@/lib/api/finance';
import { BouncyGlassButton } from '@/components/ui/BouncyGlassButton';

// --- SHARED COMPONENTS ---

const getProgressColor = (progress: number) => {
    if (progress <= 25) return '#FF1F00';
    if (progress <= 50) return '#FF9500';
    if (progress <= 75) return '#00A3FF';
    return '#34C759';
};

const ProgressRing = ({ progress, size = 36, strokeWidth = 3 }: { progress: number, size?: number, strokeWidth?: number }) => {
    const color = getProgressColor(progress);
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';

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

const SectionHeader = ({ title, icon, color }: { title: string, icon: string, color: string }) => {
    const colorScheme = useColorScheme() ?? 'light';
    return (
        <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconBg, { backgroundColor: color, borderRadius: 14 }]}>
                <Ionicons name={icon as any} size={14} color="#FFFFFF" />
            </View>
            <Text style={[styles.sectionTitle, { color: Colors[colorScheme].text }]}>{title}</Text>
        </View>
    );
};

function formatCurrency(amount: number) {
    const val = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(val).replace('IDR', 'Rp');
}

function getStatusColor(status: string) {
    switch (status.toLowerCase()) {
        case 'paid': return '#34C759';
        case 'approved': return '#007AFF';
        case 'submitted':
        case 'pending': return '#FF9500';
        case 'rejected': return '#FF3B30';
        case 'draft': return '#8E8E93';
        default: return '#8E8E93';
    }
}

const showFinanceDetailAlert = (item: any) => {
    const itemsSummary = item.items && item.items.length > 0
        ? '\nItems:\n' + item.items.map((it: any) => `- ${it.name} (${it.qty} ${it.unit}): ${formatCurrency(it.total)}`).join('\n')
        : '';
    Alert.alert(
        `${item.ref}`,
        `Title: ${item.title}\nProject: ${item.project}\nAmount: ${formatCurrency(item.amount)}\nStatus: ${item.status}\nDate: ${item.date}${itemsSummary}`,
        [{ text: 'Close', style: 'cancel' }]
    );
};

const getModuleColors = (module: string) => {
    switch (module) {
        case 'projects': return { primary: '#FF3B30', text: '#FFFFFF' };
        case 'finance': return { primary: '#C73A40', text: '#FFFFFF' };
        case 'resources': return { primary: '#F08C45', text: '#FFFFFF' };
        case 'people': return { primary: '#60D284', text: '#FFFFFF' };
        case 'clock': return { primary: '#5BA4E5', text: '#FFFFFF' };
        case 'crew': return { primary: '#734DA5', text: '#FFFFFF' };
        default: return { primary: '#007AFF', text: '#FFFFFF' };
    }
};

function getTaskActionStatusStyles(status: string, isDark: boolean) {
    switch (status.toLowerCase()) {
        case 'in_progress': 
            return { color: isDark ? '#B5B3FF' : '#5856D6', label: 'In Progress' };
        case 'submitted': 
            return { color: isDark ? '#32ADE6' : '#007AFF', label: 'Submitted' };
        case 'revision': 
            return { color: isDark ? '#FF9F0A' : '#FF9500', label: 'Revision' };
        case 'done':
        case 'completed': 
            return { color: isDark ? '#32D74B' : '#34C759', label: 'Done' };
        case 'urgent': 
            return { color: isDark ? '#FF453A' : '#FF3B30', label: 'Urgent' };
        case 'pending': 
            return { color: isDark ? '#0A84FF' : '#007AFF', label: 'Pending' };
        case 'rejected': 
            return { color: isDark ? '#FF453A' : '#FF3B30', label: 'Rejected' };
        default: 
            return { color: isDark ? '#98989D' : '#8E8E93', label: status.toUpperCase() };
    }
}

function hexToRgba(hex: string, opacity: number) {
    if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) return `rgba(128,128,128,${opacity})`;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

function formatCardDate(dateStr: string) {
    if (!dateStr) return '';
    if (!dateStr.includes('-')) return dateStr;
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    
    const year = parseInt(parts[0], 10);
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    
    if (isNaN(year) || isNaN(monthIndex) || isNaN(day)) return dateStr;
    
    const currentYear = new Date().getFullYear();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[monthIndex] || '';
    
    if (year === currentYear) {
        return `${day} ${month}`;
    } else {
        return `${day} ${month} ${year}`;
    }
}

// --- MAIN SEARCH SCREEN ---

export default function SearchIndex() {
    const { searchQuery, setSearchQuery, isSearchVisible, setIsSearchVisible, activeModule, contextAction, lastActivePath } = useSearch();
    const pathname = usePathname();
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme() ?? 'light';
    const isDark = colorScheme === 'dark';
    const textColor = Colors[colorScheme].text;
    const subtextColor = Colors[colorScheme].icon;

    const { activeTenant } = useTenantContext();
    const { user } = useUserContext();
    const [financePurchasing, setFinancePurchasing] = React.useState<any[]>([]);
    const [financeReimbursement, setFinanceReimbursement] = React.useState<any[]>([]);
    const [isLoadingFinance, setIsLoadingFinance] = React.useState(false);

    const [isKeyboardVisible, setKeyboardVisible] = React.useState(false);
    const [projectsList, setProjectsList] = React.useState<Project[]>([]);
    const [tasksList, setTasksList] = React.useState<Task[]>([]);
    const [actionsList, setActionsList] = React.useState<Action[]>([]);
    const [selectedTask, setSelectedTask] = React.useState<any | null>(null);
    const [selectedAction, setSelectedAction] = React.useState<any | null>(null);

    const handleCancel = () => {
        router.navigate(lastActivePath as any);
    };

    React.useEffect(() => {
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
            console.error('Failed to load search data:', err);
        });
    }, [activeTenant?.id]);

    React.useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener(
            'keyboardDidShow',
            () => setKeyboardVisible(true)
        );
        const keyboardDidHideListener = Keyboard.addListener(
            'keyboardDidHide',
            () => setKeyboardVisible(false)
        );

        return () => {
            keyboardDidHideListener.remove();
            keyboardDidShowListener.remove();
        };
    }, []);

    // Load team finance data when active module is finance
    useEffect(() => {
        if (activeModule === 'finance' && user?.id) {
            setIsLoadingFinance(true);
            Promise.all([
                fetchPurchasingRequests(user.id, true),
                fetchReimburseRequests(user.id, true)
            ]).then(([purchases, reimbursements]) => {
                setFinancePurchasing(purchases || []);
                setFinanceReimbursement(reimbursements || []);
            }).catch(err => {
                console.error("Failed to load search finance data", err);
            }).finally(() => {
                setIsLoadingFinance(false);
            });
        }
    }, [activeModule, user?.id]);

    // --- SEARCH PROXY LOGIC ---
    useEffect(() => {
        // Only run redirection if the user is actually on the search page/tab
        if (!pathname.includes('/search')) {
            return;
        }

        // Force-close contextual overlay when entering dedicated search tab
        setIsSearchVisible(false);
        // Only redirect immediately if there are NO sub-options (like on Tasks/Projects/Actions)
        if (contextAction && !contextAction.options) {
            const timer = setTimeout(() => {
                router.navigate(lastActivePath as any);
                contextAction.action();
            }, 0);
            return () => clearTimeout(timer);
        }
    }, [contextAction, lastActivePath, pathname]);

    const results = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return { projects: [], tasks: [], actions: [] };

        return {
            projects: projectsList.filter(p => (p.title || '').toLowerCase().includes(q) || (p.code || '').toLowerCase().includes(q) || (p.location || '').toLowerCase().includes(q)),
            tasks: tasksList.filter(t => (t.title || '').toLowerCase().includes(q) || (t.project || '').toLowerCase().includes(q)),
            actions: actionsList.filter(a => (a.title || '').toLowerCase().includes(q) || (a.module || '').toLowerCase().includes(q))
        };
    }, [searchQuery, projectsList, tasksList, actionsList]);

    const filteredPurchasing = useMemo(() => {
        if (activeModule !== 'finance') return [];
        const q = searchQuery.toLowerCase().trim();
        if (!q) return [];
        return financePurchasing.filter(item => {
            const matchesTitle = item.title?.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q);
            const matchesRef = item.ref?.toLowerCase().includes(q);
            const matchesProject = item.project?.toLowerCase().includes(q);
            const matchesItems = item.items?.some((it: any) => it.name?.toLowerCase().includes(q));
            return matchesTitle || matchesRef || matchesProject || matchesItems;
        });
    }, [searchQuery, activeModule, financePurchasing]);

    const filteredReimbursement = useMemo(() => {
        if (activeModule !== 'finance') return [];
        const q = searchQuery.toLowerCase().trim();
        if (!q) return [];
        return financeReimbursement.filter(item => {
            const matchesTitle = item.title?.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q);
            const matchesRef = item.ref?.toLowerCase().includes(q);
            const matchesProject = item.project?.toLowerCase().includes(q);
            const matchesItems = item.items?.some((it: any) => it.name?.toLowerCase().includes(q));
            return matchesTitle || matchesRef || matchesProject || matchesItems;
        });
    }, [searchQuery, activeModule, financeReimbursement]);

    // Highlights for empty state
    const highlights = useMemo(() => {
        return {
            projects: projectsList.filter(p => p.isPinned && !p.isArchived).slice(0, 3),
            tasks: tasksList.filter(t => t.priority === 'high' && t.status !== 'done').slice(0, 3),
            actions: actionsList.slice(0, 3)
        };
    }, [projectsList, tasksList, actionsList]);

    const hasResults = useMemo(() => {
        if (activeModule === 'finance') {
            return filteredPurchasing.length > 0 || filteredReimbursement.length > 0;
        }
        return results.projects.length > 0 || results.tasks.length > 0 || results.actions.length > 0;
    }, [activeModule, results, filteredPurchasing, filteredReimbursement]);

    const renderEmptyState = () => {
        if (activeModule === 'projects') {
            return (
                <View style={styles.highlightSection}>
                    <SectionHeader title="Pinned Projects" icon="star" color="#FFCC00" />
                    {highlights.projects.map((p, i) => (
                        <TouchableOpacity key={p.id} onPress={() => router.push(`/project-details/${p.id}`)} activeOpacity={0.7}>
                            <GlassView intensity={20} style={[styles.compactCard, styles.highlightCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                                {p.heroImage ? (
                                    <Image source={p.heroImage} style={styles.thumbnailSmall} />
                                ) : (
                                    <View style={[styles.thumbnailSmall, { backgroundColor: isDark ? '#000000' : '#FFFFFF', justifyContent: 'center', alignItems: 'center' }]}>
                                        <Image
                                            source={
                                                (activeTenant?.name || '').toLowerCase().includes('adidaya') || (activeTenant?.company_code || '').toLowerCase() === 'ady'
                                                    ? require('@/assets/images/logo-adidaya-red.png')
                                                    : require('@/assets/images/logo-forma-blue.png')
                                            }
                                            style={{ width: 18, height: 18 }}
                                            resizeMode="contain"
                                        />
                                    </View>
                                )}
                                <View style={styles.compactInfo}>
                                    <Text style={[styles.compactTitle, { color: textColor, fontSize: 15 }]}>{p.title}</Text>
                                    <Text style={[styles.compactSubtext, { color: subtextColor }]}>{p.location}</Text>
                                </View>
                                <ProgressRing progress={p.progress} size={30} />
                            </GlassView>
                        </TouchableOpacity>
                    ))}
                </View>
            );
        }

        if (activeModule === 'tasks') {
            return (
                <View style={styles.highlightSection}>
                    <SectionHeader title="High Priority" icon="alert-circle" color="#FF3B30" />
                    {highlights.tasks.map((t, i) => (
                        <GlassView key={t.id} intensity={20} style={[styles.compactCard, styles.highlightCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                            <View style={styles.compactInfo}>
                                <Text style={[styles.compactTitle, { color: textColor, fontSize: 15 }]}>{t.title}</Text>
                                <Text style={[styles.compactSubtext, { color: subtextColor }]}>{t.project}</Text>
                            </View>
                            <Ionicons name="flag" size={18} color="#FF3B30" />
                        </GlassView>
                    ))}
                </View>
            );
        }

        return (
            <View style={styles.globalEmpty}>
                <Ionicons name="search" size={64} color={subtextColor} style={{ opacity: 0.1, marginBottom: 20 }} />
                <Text style={[styles.emptyMainText, { color: textColor }]}>Workspace Search</Text>
                <Text style={[styles.emptySubText, { color: subtextColor }]}>Quickly find projects, tasks, and system actions across your entire OS.</Text>
            </View>
        );
    };

    const isAndroid = Platform.OS === 'android';

    const showOptions = !!(contextAction?.options && !searchQuery.trim());
    const themeHeaderTitle = showOptions
        ? (activeModule === 'tasks' ? 'New Task' : activeModule === 'actions' ? 'New Action' : `${activeModule.charAt(0).toUpperCase() + activeModule.slice(1)} Actions`)
        : (activeModule === 'home' ? 'Global Search' : `${activeModule.charAt(0).toUpperCase() + activeModule.slice(1)} Search`);

    const handleOptionPress = (optionAction: () => void) => {
        router.navigate(lastActivePath as any);
        setTimeout(() => {
            optionAction();
        }, 100);
    };

    return (
        <KeyboardAvoidingView 
            style={{ flex: 1 }} 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            <View style={[styles.container, { backgroundColor: Colors[colorScheme].background }]}>
                <Stack.Screen options={{
                    headerTitle: themeHeaderTitle,
                    headerLargeTitle: false, // Keep false to avoid overlapping glitches
                    headerShadowVisible: false,
                    headerTransparent: false,
                    headerStyle: { backgroundColor: Colors[colorScheme].background },
                    headerTintColor: textColor,
                    headerTitleStyle: { color: textColor },
                    headerLeft: (Platform.OS === 'ios' && contextAction) ? () => (
                        <BouncyGlassButton
                            onPress={handleCancel}
                            isDark={isDark}
                            variant="back"
                            textColor={textColor}
                            style={{ marginLeft: 0 }}
                        />
                    ) : undefined,
                    headerSearchBarOptions: Platform.OS === 'ios' ? {
                        placeholder: activeModule === 'home' ? 'Search workspace...' : (activeModule === 'finance' ? 'Search finance...' : `Search ${activeModule === 'tasks' ? 'tasks' : activeModule === 'actions' ? 'actions' : activeModule}...`),
                        onChangeText: (e) => setSearchQuery(e.nativeEvent.text),
                        autoFocus: !showOptions,
                        hideWhenScrolling: false,
                    } : undefined
                }} />

                {isAndroid && (
                    <View style={styles.searchBarContainer}>
                        <View style={[styles.searchBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]}>
                            <Ionicons name="search" size={20} color={subtextColor} style={styles.searchIcon} />
                            <TextInput
                                style={[styles.searchInput, { color: textColor }]}
                                placeholder={activeModule === 'home' ? 'Search workspace...' : (activeModule === 'finance' ? 'Search finance...' : `Search ${activeModule === 'tasks' ? 'tasks' : activeModule === 'actions' ? 'actions' : activeModule}...`)}
                                placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                autoFocus={!showOptions}
                                returnKeyType="search"
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                                    <Ionicons name="close-circle" size={18} color={subtextColor} />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                )}

                <ScrollView 
                    contentContainerStyle={[styles.scrollContent, isAndroid && { paddingBottom: 24 }]} 
                    contentInsetAdjustmentBehavior="automatic" 
                    keyboardDismissMode="on-drag" 
                    keyboardShouldPersistTaps="handled"
                >
                    {showOptions ? (
                        <Animated.View entering={FadeInUp.duration(400)} style={styles.actionDashboard}>
                            <View style={styles.cardGrid}>
                                {contextAction?.options?.map((opt, index) => {
                                    const brandColors = getModuleColors(activeModule);
                                    const optColor = brandColors.primary;
                                    return (
                                        <TouchableOpacity
                                            key={opt.label}
                                            onPress={() => handleOptionPress(opt.action)}
                                            activeOpacity={0.7}
                                            style={styles.actionCardWrapper}
                                        >
                                            <GlassView
                                                intensity={isDark ? 20 : 75}
                                                style={[
                                                    styles.actionCard,
                                                    {
                                                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.7)',
                                                        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                                                    }
                                                ]}
                                            >
                                                <View style={[styles.actionCardIconBg, { backgroundColor: `${optColor}20` }]}>
                                                    <Ionicons name={opt.icon as any} size={24} color={optColor} />
                                                </View>
                                                <View style={styles.actionCardContent}>
                                                    <Text style={[styles.actionCardTitle, { color: textColor }]}>{opt.label}</Text>
                                                    {opt.description && (
                                                        <Text style={[styles.actionCardDesc, { color: subtextColor }]}>{opt.description}</Text>
                                                    )}
                                                </View>
                                                <Ionicons name="chevron-forward" size={20} color={subtextColor} style={{ opacity: 0.5 }} />
                                            </GlassView>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </Animated.View>
                    ) : (
                        !searchQuery.trim() ? (
                            <Animated.View entering={FadeIn.duration(400)} style={styles.emptyContainer}>
                                {renderEmptyState()}
                            </Animated.View>
                        ) : (
                            <View style={styles.resultsArea}>
                                {hasResults ? (
                                    <View style={{ gap: 24 }}>
                                        {/* PROJECTS */}
                                        {(activeModule === 'home' || activeModule === 'projects') && results.projects.length > 0 && (
                                            <View style={{ gap: 10 }}>
                                                <SectionHeader title="Projects" icon="briefcase" color="#FF3B30" />
                                                {results.projects.map((p, i) => (
                                                    <TouchableOpacity key={p.id} onPress={() => router.push(`/project-details/${p.id}`)} activeOpacity={0.7}>
                                                        <GlassView intensity={isDark ? 30 : 80} style={[styles.compactCard, { backgroundColor: isDark ? 'rgba(142,142,147,0.12)' : 'rgba(255,255,255,0.75)' }]}>
                                                            {p.heroImage ? (
                                                                <Image source={p.heroImage} style={styles.thumbnail} />
                                                            ) : (
                                                                <View style={[styles.thumbnail, { backgroundColor: isDark ? '#000000' : '#FFFFFF', justifyContent: 'center', alignItems: 'center' }]}>
                                                                    <Image
                                                                        source={
                                                                            (activeTenant?.name || '').toLowerCase().includes('adidaya') || (activeTenant?.company_code || '').toLowerCase() === 'ady'
                                                                                ? require('@/assets/images/logo-adidaya-red.png')
                                                                                : require('@/assets/images/logo-forma-blue.png')
                                                                        }
                                                                        style={{ width: 24, height: 24 }}
                                                                        resizeMode="contain"
                                                                    />
                                                                </View>
                                                            )}
                                                            <View style={styles.compactInfo}>
                                                                <View style={styles.compactHeader}>
                                                                    <View style={[styles.smallPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}><Text style={[styles.smallPillText, { color: subtextColor }]}>{p.code}</Text></View>
                                                                    <Text style={[styles.compactTitle, { color: textColor }]} numberOfLines={1}>{p.title}</Text>
                                                                </View>
                                                                <Text style={[styles.compactSubtext, { color: subtextColor }]}>{p.location} • {p.phase}</Text>
                                                            </View>
                                                            <ProgressRing progress={p.progress} size={40} strokeWidth={3} />
                                                        </GlassView>
                                                    </TouchableOpacity>
                                                ))}
                                            </View>
                                        )}

                                        {/* TASKS */}
                                        {(activeModule === 'home' || activeModule === 'tasks') && results.tasks.length > 0 && (
                                            <View style={{ gap: 10 }}>
                                                <SectionHeader title="Tasks" icon="checkbox" color="#007AFF" />
                                                {results.tasks.map((t, i) => {
                                                    const statusStyle = getTaskActionStatusStyles(t.status, isDark);
                                                    const doneSubtasks = t.subtasks?.filter((s: any) => s.isDone).length || 0;
                                                    const totalSubtasks = t.subtasks?.length || 0;
                                                    return (
                                                        <TouchableOpacity key={t.id} onPress={() => setSelectedTask(t)} activeOpacity={0.7}>
                                                            <GlassView intensity={isDark ? 30 : 80} style={[styles.compactCard, { backgroundColor: isDark ? 'rgba(142,142,147,0.12)' : 'rgba(255,255,255,0.75)' }]}>
                                                                <View style={styles.compactInfo}>
                                                                    {/* Row 1: WBS + Subtasks */}
                                                                    {(t.wbs || totalSubtasks > 0) ? (
                                                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                                                            {t.wbs && (
                                                                                <Text style={{ fontSize: 10, fontWeight: '700', color: subtextColor, letterSpacing: 0.5 }}>
                                                                                    {t.wbs.toUpperCase()}
                                                                                </Text>
                                                                            )}
                                                                            {totalSubtasks > 0 && (
                                                                                <View style={{
                                                                                    flexDirection: 'row',
                                                                                    alignItems: 'center',
                                                                                    paddingHorizontal: 6,
                                                                                    paddingVertical: 2,
                                                                                    borderRadius: 20,
                                                                                    backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                                                                                }}>
                                                                                    <Ionicons name="list" size={10} color={subtextColor} style={{ marginRight: 4 }} />
                                                                                    <Text style={{ fontSize: 10, fontWeight: '700', color: subtextColor }}>
                                                                                        {doneSubtasks}/{totalSubtasks}
                                                                                    </Text>
                                                                                </View>
                                                                            )}
                                                                        </View>
                                                                    ) : null}

                                                                    {/* Row 2: Title */}
                                                                    <Text style={[styles.compactTitle, { color: textColor, marginBottom: 4 }]} numberOfLines={2}>
                                                                        {t.title}
                                                                    </Text>

                                                                    {/* Row 3: Project code + Date */}
                                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                                                                        {t.projectCode && (
                                                                            <View style={[styles.smallPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', borderWidth: 0.5, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                                                                                <Text style={[styles.smallPillText, { color: subtextColor }]}>{t.projectCode}</Text>
                                                                            </View>
                                                                        )}
                                                                        <Text style={{ fontSize: 11, fontWeight: '600', color: subtextColor }}>
                                                                            {`${formatCardDate(t.dueDate)}${t.dueTime ? `  •  ${t.dueTime}` : ''}`}
                                                                        </Text>
                                                                    </View>
                                                                </View>

                                                                {/* Right column */}
                                                                <View style={{ alignItems: 'flex-end', justifyContent: 'space-between', minHeight: 52 }}>
                                                                    {/* Status Badge */}
                                                                    <View style={{
                                                                        backgroundColor: hexToRgba(statusStyle.color, 0.1),
                                                                        paddingHorizontal: 8,
                                                                        paddingVertical: 4,
                                                                        borderRadius: 12,
                                                                        borderWidth: 0.5,
                                                                        borderColor: hexToRgba(statusStyle.color, 0.2)
                                                                    }}>
                                                                        <Text style={{ fontSize: 10, fontWeight: '800', color: statusStyle.color }}>
                                                                            {statusStyle.label}
                                                                        </Text>
                                                                    </View>

                                                                    {/* Assignee Avatars */}
                                                                    <View style={styles.miniAvatarGroup}>
                                                                        {t.assignees && t.assignees.slice(0, 2).map((a: any, idx: number) => (
                                                                            <View 
                                                                                key={a.id} 
                                                                                style={[
                                                                                    styles.miniAvatar, 
                                                                                    { 
                                                                                        backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF', 
                                                                                        borderColor: isDark ? '#1C1C1E' : '#F2F2F7', 
                                                                                        zIndex: 2 - idx, 
                                                                                        marginLeft: idx === 0 ? 0 : -6 
                                                                                    }
                                                                                ]}
                                                                            >
                                                                                <Text style={[styles.miniAvatarText, { color: textColor }]}>
                                                                                    {a.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                                                                                </Text>
                                                                            </View>
                                                                        ))}
                                                                        {t.assignees && t.assignees.length > 2 && (
                                                                            <View 
                                                                                style={[
                                                                                    styles.miniAvatar, 
                                                                                    {
                                                                                        backgroundColor: isDark ? '#3A3A3C' : '#FFFFFF',
                                                                                        borderColor: isDark ? '#1C1C1E' : '#E5E5EA',
                                                                                        zIndex: 0,
                                                                                        marginLeft: -6
                                                                                    }
                                                                                ]}
                                                                            >
                                                                                <Text style={[styles.miniAvatarText, { color: isDark ? '#FFFFFF' : subtextColor, fontSize: 8 }]}>
                                                                                    {t.assignees.length - 2}+
                                                                                </Text>
                                                                            </View>
                                                                        )}
                                                                    </View>
                                                                </View>
                                                            </GlassView>
                                                        </TouchableOpacity>
                                                    );
                                                })}
                                            </View>
                                        )}

                                        {/* ACTIONS */}
                                        {(activeModule === 'home' || activeModule === 'actions') && results.actions.length > 0 && (
                                            <View style={{ gap: 10 }}>
                                                <SectionHeader title="Actions" icon="flash" color="#007AFF" />
                                                {results.actions.map((a, i) => {
                                                    const statusStyle = getTaskActionStatusStyles(a.status, isDark);
                                                    return (
                                                        <TouchableOpacity key={a.id} onPress={() => setSelectedAction(a)} activeOpacity={0.7}>
                                                            <GlassView intensity={isDark ? 30 : 80} style={[styles.compactCard, { backgroundColor: isDark ? 'rgba(142,142,147,0.12)' : 'rgba(255,255,255,0.75)' }]}>
                                                                <View style={styles.compactInfo}>
                                                                    {/* Row 1: Title */}
                                                                    <Text style={[styles.compactTitle, { color: textColor, marginBottom: 4 }]} numberOfLines={2}>
                                                                        {a.title}
                                                                    </Text>

                                                                    {/* Row 2: Project code + Date */}
                                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                                                                        {a.projectCode && (
                                                                            <View style={[styles.smallPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', borderWidth: 0.5, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                                                                                <Text style={[styles.smallPillText, { color: subtextColor }]}>{a.projectCode}</Text>
                                                                            </View>
                                                                        )}
                                                                        <Text style={{ fontSize: 11, fontWeight: '600', color: subtextColor }}>
                                                                            {formatCardDate(a.date)}
                                                                        </Text>
                                                                    </View>
                                                                </View>

                                                                {/* Right column */}
                                                                <View style={{ alignItems: 'flex-end', justifyContent: 'space-between', minHeight: 52 }}>
                                                                    {/* Status Badge */}
                                                                    <View style={{
                                                                        backgroundColor: hexToRgba(statusStyle.color, 0.1),
                                                                        paddingHorizontal: 8,
                                                                        paddingVertical: 4,
                                                                        borderRadius: 12,
                                                                        borderWidth: 0.5,
                                                                        borderColor: hexToRgba(statusStyle.color, 0.2)
                                                                    }}>
                                                                        <Text style={{ fontSize: 10, fontWeight: '800', color: statusStyle.color }}>
                                                                            {statusStyle.label}
                                                                        </Text>
                                                                    </View>

                                                                    {/* Submitter Avatar */}
                                                                    {a.submitter ? (
                                                                        <View 
                                                                            style={[
                                                                                styles.miniAvatar, 
                                                                                { 
                                                                                    backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF', 
                                                                                    borderColor: isDark ? '#1C1C1E' : '#F2F2F7', 
                                                                                }
                                                                            ]}
                                                                        >
                                                                            <Text style={[styles.miniAvatarText, { color: textColor }]}>
                                                                                {a.submitter.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                                                                            </Text>
                                                                        </View>
                                                                    ) : (
                                                                        <View style={{ height: 22 }} />
                                                                    )}
                                                                </View>
                                                            </GlassView>
                                                        </TouchableOpacity>
                                                    );
                                                })}
                                            </View>
                                        )}

                                        {/* FINANCE PURCHASING */}
                                        {activeModule === 'finance' && filteredPurchasing.length > 0 && (
                                            <View style={{ gap: 10 }}>
                                                <SectionHeader title="Purchasing Requests" icon="cart" color="#007AFF" />
                                                {filteredPurchasing.map((item, i) => (
                                                    <TouchableOpacity key={item.id} onPress={() => showFinanceDetailAlert(item)} activeOpacity={0.7}>
                                                        <GlassView intensity={isDark ? 30 : 80} style={[styles.compactCard, { backgroundColor: isDark ? 'rgba(142,142,147,0.12)' : 'rgba(255,255,255,0.75)' }]}>
                                                            <View style={styles.compactInfo}>
                                                                <View style={styles.compactHeader}>
                                                                    <View style={[styles.smallPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}><Text style={[styles.smallPillText, { color: subtextColor }]}>{item.project}</Text></View>
                                                                    <Text style={[styles.compactTitle, { color: textColor }]} numberOfLines={1}>{item.title}</Text>
                                                                </View>
                                                                <Text style={[styles.compactSubtext, { color: subtextColor }]}>{item.ref} • {item.date}</Text>
                                                            </View>
                                                            <View style={{ alignItems: 'flex-end', justifyContent: 'center', gap: 2 }}>
                                                                <Text style={{ fontSize: 14, fontWeight: '700', color: textColor }}>{formatCurrency(item.amount)}</Text>
                                                                <View style={{ backgroundColor: `${getStatusColor(item.status)}15`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                                                                    <Text style={{ fontSize: 10, fontWeight: '700', color: getStatusColor(item.status) }}>{item.status}</Text>
                                                                </View>
                                                            </View>
                                                        </GlassView>
                                                    </TouchableOpacity>
                                                ))}
                                            </View>
                                        )}

                                        {/* FINANCE REIMBURSEMENT */}
                                        {activeModule === 'finance' && filteredReimbursement.length > 0 && (
                                            <View style={{ gap: 10 }}>
                                                <SectionHeader title="Reimbursement Claims" icon="document-text" color="#007AFF" />
                                                {filteredReimbursement.map((item, i) => (
                                                    <TouchableOpacity key={item.id} onPress={() => showFinanceDetailAlert(item)} activeOpacity={0.7}>
                                                        <GlassView intensity={isDark ? 30 : 80} style={[styles.compactCard, { backgroundColor: isDark ? 'rgba(142,142,147,0.12)' : 'rgba(255,255,255,0.75)' }]}>
                                                            <View style={styles.compactInfo}>
                                                                <View style={styles.compactHeader}>
                                                                    <View style={[styles.smallPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}><Text style={[styles.smallPillText, { color: subtextColor }]}>{item.project}</Text></View>
                                                                    <Text style={[styles.compactTitle, { color: textColor }]} numberOfLines={1}>{item.title}</Text>
                                                                </View>
                                                                <Text style={[styles.compactSubtext, { color: subtextColor }]}>{item.ref} • {item.date}</Text>
                                                            </View>
                                                            <View style={{ alignItems: 'flex-end', justifyContent: 'center', gap: 2 }}>
                                                                <Text style={{ fontSize: 14, fontWeight: '700', color: textColor }}>{formatCurrency(item.amount)}</Text>
                                                                <View style={{ backgroundColor: `${getStatusColor(item.status)}15`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                                                                    <Text style={{ fontSize: 10, fontWeight: '700', color: getStatusColor(item.status) }}>{item.status}</Text>
                                                                </View>
                                                            </View>
                                                        </GlassView>
                                                    </TouchableOpacity>
                                                ))}
                                            </View>
                                        )}
                                    </View>
                                ) : (
                                    <Animated.View entering={FadeInUp} style={styles.noResults}>
                                        <Ionicons name="search-outline" size={48} color={subtextColor} style={{ opacity: 0.3, marginBottom: 16 }} />
                                        <Text style={[styles.noResultsText, { color: subtextColor }]}>No results for "{searchQuery}"</Text>
                                        <Text style={[styles.noResultsSubText, { color: subtextColor }]}>Try checking your spelling or use different keywords.</Text>
                                    </Animated.View>
                                )}
                            </View>
                        )
                    )}
                </ScrollView>
            </View>

            {/* Task Detail Bottom Sheet */}
            {selectedTask && (
                <SwiftUITaskDetailSheet
                    isOpened={!!selectedTask}
                    onClose={() => setSelectedTask(null)}
                    task={selectedTask}
                    setTasks={setTasksList}
                />
            )}

            {/* SwiftUI Bottom Sheet for Actions */}
            {selectedAction && (
                <SwiftUIActionDetailSheet
                    isOpened={!!selectedAction}
                    onClose={() => setSelectedAction(null)}
                    action={selectedAction}
                    onStatusChange={(id, nextStatus) => {
                        setActionsList(prev => prev.map(a => a.id === id ? { ...a, status: nextStatus } : a));
                        setSelectedAction((prev: any) => prev && prev.id === id ? { ...prev, status: nextStatus } : prev);
                    }}
                    setActionsList={setActionsList}
                />
            )}
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    actionDashboard: {
        flex: 1,
        paddingTop: 10,
    },
    dashboardSubtitle: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 20,
    },
    cardGrid: {
        gap: 12,
        paddingBottom: 40,
    },
    actionCardWrapper: {
        borderRadius: 36, // Full pill shape wrapper
        overflow: 'hidden',
    },
    actionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 72,
        borderRadius: 36, // Full pill shape (height / 2)
        borderWidth: 1,
        paddingLeft: 14,
        paddingRight: 20,
        gap: 16,
    },
    actionCardIconBg: {
        width: 44,
        height: 44,
        borderRadius: 22, // Circular background
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionCardContent: {
        flex: 1,
        justifyContent: 'center',
        gap: 2,
    },
    actionCardTitle: {
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: -0.1,
    },
    actionCardDesc: {
        fontSize: 11,
        fontWeight: '500',
        opacity: 0.7,
    },
    searchBarContainer: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 4,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 24,
        borderWidth: 1,
        paddingHorizontal: 12,
        height: 48,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        height: '100%',
        paddingVertical: 0,
    },
    clearButton: {
        padding: 4,
    },
    scrollContent: { padding: 16 },
    emptyContainer: { paddingTop: 20 },
    globalEmpty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, paddingHorizontal: 40 },
    emptyMainText: { fontSize: 22, fontWeight: '700', marginBottom: 8, letterSpacing: -0.5 },
    emptySubText: { fontSize: 14, textAlign: 'center', lineHeight: 20, opacity: 0.7 },
    highlightSection: { gap: 12 },
    highlightCard: { padding: 12, borderRadius: 16, borderLeftWidth: 3, borderLeftColor: 'rgba(0,122,255,0.3)' },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8, marginTop: 12 },
    sectionIconBg: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    sectionTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2, opacity: 0.8 },
    resultsArea: { paddingTop: 8 },
    compactCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 18, gap: 14 },
    thumbnail: { width: 54, height: 54, borderRadius: 12 },
    thumbnailSmall: { width: 40, height: 40, borderRadius: 10 },
    compactInfo: { flex: 1 },
    compactHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
    compactTitle: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
    compactSubtext: { fontSize: 12, fontWeight: '500' },
    smallPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 12 },
    smallPillText: { fontSize: 9, fontWeight: '900' },
    actionIconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,122,255,0.1)', alignItems: 'center', justifyContent: 'center' },
    ringContainer: { borderRadius: 99, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    noResults: { paddingVertical: 100, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
    noResultsText: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
    noResultsSubText: { fontSize: 14, textAlign: 'center', opacity: 0.6, lineHeight: 20 },
    miniAvatarGroup: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    miniAvatar: {
        width: 22,
        height: 22,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
    },
    miniAvatarText: {
        fontSize: 8,
        fontWeight: '800',
    }
});
