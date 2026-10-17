import { HeaderBlurBackground } from '@/components/ui/HeaderBlurBackground';
import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
    Platform,
    Switch
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { BouncyGlassButton } from '@/components/ui/BouncyGlassButton';
import { Project, getProjectById, updateProjectApi } from '@/lib/api/projects';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { LiquidCard } from '@/components/ui/LiquidCard';

// Safe lazy loading of SwiftUI components for horizontal tabs
let SwiftUIHost: any = null;
let SwiftUIHStack: any = null;
let SwiftUIVStack: any = null;
let SwiftUIButton: any = null;
let SwiftUIText: any = null;
let SwiftUIGlassEffectContainer: any = null;
let SwiftUICircle: any = null;
let SwiftUISpacer: any = null;
let swiftModifiers: any = null;

if (Platform.OS === 'ios') {
    try {
        const SwiftUI = require('@expo/ui/swift-ui');
        SwiftUIHost = SwiftUI.Host;
        SwiftUIHStack = SwiftUI.HStack;
        SwiftUIVStack = SwiftUI.VStack;
        SwiftUIButton = SwiftUI.Button;
        SwiftUIText = SwiftUI.Text;
        SwiftUIGlassEffectContainer = SwiftUI.GlassEffectContainer;
        SwiftUICircle = SwiftUI.Circle;
        SwiftUISpacer = SwiftUI.Spacer;
        swiftModifiers = require('@expo/ui/swift-ui/modifiers');
    } catch (e) {
        // handled
    }
}

type TabId = 'wbs' | 'disciplines';

const TABS: { id: TabId; label: string; icon: keyof typeof Ionicons.glyphMap; description: string }[] = [
    { id: 'wbs', label: 'WBS Templates', icon: 'grid-outline', description: 'Select active WBS hierarchies for task list groupings.' },
    { id: 'disciplines', label: 'WBS Disciplines', icon: 'construct-outline', description: 'Specify active trade disciplines to sort the progress structure.' }
];

const MOCK_WBS_TEMPLATES = [
    { id: 'standard', name: 'Standard Building WBS', description: 'Standard hierarchy for generic buildings and facilities.' },
    { id: 'civil', name: 'Heavy Civil & Earthworks WBS', description: 'Optimized for land clearing, drainage, and infrastructure.' },
    { id: 'mep', name: 'MEP Specialized WBS', description: 'Detailed breakdowns for electrical, plumbing, and HVAC systems.' }
];

const MOCK_WBS_DISCIPLINES = [
    { id: 'arc', name: 'Architecture (ARC)', code: 'ARC' },
    { id: 'str', name: 'Structure (STR)', code: 'STR' },
    { id: 'mep', name: 'Mechanical, Electrical & Plumbing', code: 'MEP' },
    { id: 'civ', name: 'Civil & Infra (CIV)', code: 'CIV' }
];

export default function ProjectSetupWorkStructureScreen({
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
    const cardBgColor = isDark ? '#1C1C1E' : '#FFFFFF';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#AEAEB2' : '#636366';
    const borderColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';

    const [activeTab, setActiveTab] = useState<TabId>('wbs');
    const tabRef = useRef<ScrollView>(null);
    const tabLayouts = useRef<Record<string, { x: number; width: number }>>({});

    const [project, setProject] = useState<Project | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [activeTemplates, setActiveTemplates] = useState<string[]>([]);
    const [originalTemplates, setOriginalTemplates] = useState<string[]>([]);
    const [activeDisciplines, setActiveDisciplines] = useState<string[]>([]);
    const [originalDisciplines, setOriginalDisciplines] = useState<string[]>([]);

    useEffect(() => {
        if (projectId) {
            loadData();
        }
    }, [projectId]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const data = await getProjectById(projectId);
            if (data) {
                setProject(data);
                const wbsSetup = data.meta?.setup?.wbs || {};
                const templates = wbsSetup.templates || ['standard'];
                const disciplines = wbsSetup.disciplines || ['arc', 'str', 'mep'];
                setActiveTemplates(templates);
                setOriginalTemplates(templates);
                setActiveDisciplines(disciplines);
                setOriginalDisciplines(disciplines);
            }
        } catch (error) {
            console.error('Error loading wbs setup data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleTemplate = (tplId: string) => {
        setActiveTemplates(prev =>
            prev.includes(tplId) ? prev.filter(id => id !== tplId) : [...prev, tplId]
        );
    };

    const toggleDiscipline = (discId: string) => {
        setActiveDisciplines(prev =>
            prev.includes(discId) ? prev.filter(id => id !== discId) : [...prev, discId]
        );
    };

    const hasChanges = 
        JSON.stringify([...activeTemplates].sort()) !== JSON.stringify([...originalTemplates].sort()) ||
        JSON.stringify([...activeDisciplines].sort()) !== JSON.stringify([...originalDisciplines].sort());

    const handleSaveChanges = async () => {
        if (!project) return;
        setSaving(true);
        try {
            const currentMeta = project.meta || {};
            const updatedSetup = {
                ...currentMeta.setup,
                wbs: {
                    templates: activeTemplates,
                    disciplines: activeDisciplines
                }
            };

            const updated = await updateProjectApi(project.id, {
                meta: {
                    ...currentMeta,
                    setup: updatedSetup
                }
            });

            if (updated) {
                setProject(updated);
                setOriginalTemplates(activeTemplates);
                setOriginalDisciplines(activeDisciplines);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert('Success', 'Work Structure configuration saved successfully!');
                onSaved?.();
            } else {
                Alert.alert('Error', 'Failed to save WBS configurations.');
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'An error occurred while saving.');
        } finally {
            setSaving(false);
        }
    };

    if (isLoading) {
        return (
            <View style={[styles.container, { backgroundColor: bgColor, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#FF3B30" />
            </View>
        );
    }

    if (!project) {
        return (
            <View style={[styles.container, { backgroundColor: bgColor, justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: textColor }}>Project not found</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            {!isEmbedded && (
                <Stack.Screen
                    options={{
                        headerShown: true,
                        title: 'Work Structure Setup',
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
                    <Text style={{ fontSize: 20, fontWeight: '700', color: textColor }}>Work Breakdown Structure</Text>
                    <Text style={{ fontSize: 13, color: subtextColor, marginTop: 2 }}>Select active WBS hierarchies and trade disciplines for this project.</Text>
                </View>
            )}

            {/* Horizontal Tabs Scroll Bar */}
            <View style={[
                styles.tabBarContainer,
                {
                    top: 0,
                    paddingTop: isEmbedded ? 12 : (Platform.OS === 'ios' ? (insets.top || 47) + 44 : 0),
                    backgroundColor: 'transparent',
                }
            ]}>
                <ScrollView
                    ref={tabRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.tabsScrollContent}
                >
                    {TABS.map((tab) => {
                        const isSelected = activeTab === tab.id;
                        const activeBg = isDark ? '#FFFFFF' : '#1C1C1E';
                        const activeText = isDark ? '#000000' : '#FFFFFF';

                        if (Platform.OS === 'ios' && SwiftUIHost && SwiftUIButton && swiftModifiers) {
                            const pillWidth = tab.label.length * 8.8 + 34;
                            return (
                                <View
                                    key={tab.id}
                                    style={{ width: pillWidth, height: 38 }}
                                    onLayout={(e) => {
                                        tabLayouts.current[tab.id] = e.nativeEvent.layout;
                                    }}
                                >
                                    <SwiftUIHost style={{ width: pillWidth, height: 38 }} colorScheme={isDark ? 'dark' : 'light'}>
                                        <SwiftUIButton
                                            onPress={() => {
                                                setActiveTab(tab.id);
                                                const layout = tabLayouts.current[tab.id];
                                                if (layout && tabRef.current) {
                                                    tabRef.current.scrollTo({
                                                        x: Math.max(0, layout.x - 40),
                                                        animated: true,
                                                    });
                                                }
                                            }}
                                            color={isSelected ? '#FF3B30' : undefined}
                                            modifiers={[
                                                swiftModifiers.buttonStyle(isSelected ? 'glassProminent' : 'glass'),
                                                swiftModifiers.tint(isSelected ? '#FF3B30' : (isDark ? '#FFFFFF' : '#1C1C1E')),
                                                swiftModifiers.frame({ width: pillWidth, height: 38 })
                                            ]}
                                        >
                                            {tab.label}
                                        </SwiftUIButton>
                                    </SwiftUIHost>
                                </View>
                            );
                        }

                        return (
                            <TouchableOpacity
                                key={tab.id}
                                onLayout={(e) => {
                                    tabLayouts.current[tab.id] = e.nativeEvent.layout;
                                }}
                                activeOpacity={0.8}
                                onPress={() => {
                                    setActiveTab(tab.id);
                                    const layout = tabLayouts.current[tab.id];
                                    if (layout && tabRef.current) {
                                        tabRef.current.scrollTo({
                                            x: Math.max(0, layout.x - 40),
                                            animated: true,
                                        });
                                    }
                                }}
                                style={[
                                    styles.tabPill,
                                    {
                                        backgroundColor: isSelected
                                            ? activeBg
                                            : (isDark ? '#1C1C1E' : '#FFFFFF'),
                                    }
                                ]}
                            >
                                <Ionicons
                                    name={tab.icon}
                                    size={16}
                                    color={isSelected ? activeText : (isDark ? '#8E8E93' : '#6e6e73')}
                                />
                                <Text style={[styles.tabLabel, { color: isSelected ? activeText : textColor }]}>
                                    {tab.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{
                    paddingBottom: insets.bottom + 100,
                    paddingHorizontal: 16,
                    paddingTop: Platform.OS === 'ios' ? (insets.top || 47) + 115 : 75,
                    gap: 16
                }}
                showsVerticalScrollIndicator={false}
            >
                {/* Description */}
                <Text style={[styles.tabDescription, { color: subtextColor }]}>
                    {TABS.find(t => t.id === activeTab)?.description}
                </Text>

                {activeTab === 'wbs' && (
                    <View style={[styles.card, { backgroundColor: cardBgColor, borderColor }]}>
                        <View style={styles.list}>
                            {MOCK_WBS_TEMPLATES.map(item => {
                                const isIncluded = activeTemplates.includes(item.id);
                                return (
                                    <View key={item.id} style={[styles.rowItem, { borderBottomColor: borderColor }]}>
                                        <View style={styles.rowItemDetails}>
                                            <Ionicons name="grid-outline" size={20} color={isIncluded ? '#FF3B30' : subtextColor} />
                                            <View style={{ flex: 1 }}>
                                                <Text style={[styles.rowItemName, { color: textColor }]}>{item.name}</Text>
                                                <Text style={[styles.rowItemSubtitle, { color: subtextColor }]}>{item.description}</Text>
                                            </View>
                                        </View>
                                        <Switch
                                            value={isIncluded}
                                            onValueChange={() => toggleTemplate(item.id)}
                                            trackColor={{ false: '#767680', true: '#FF3B30' }}
                                            thumbColor="#FFFFFF"
                                        />
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                )}

                {activeTab === 'disciplines' && (
                    <View style={[styles.card, { backgroundColor: cardBgColor, borderColor }]}>
                        <View style={styles.list}>
                            {MOCK_WBS_DISCIPLINES.map(item => {
                                const isIncluded = activeDisciplines.includes(item.id);
                                return (
                                    <View key={item.id} style={[styles.rowItem, { borderBottomColor: borderColor }]}>
                                        <View style={styles.rowItemDetails}>
                                            <Ionicons name="construct-outline" size={20} color={isIncluded ? '#FF3B30' : subtextColor} />
                                            <View style={{ flex: 1 }}>
                                                <Text style={[styles.rowItemName, { color: textColor }]}>{item.name}</Text>
                                                <Text style={[styles.rowItemSubtitle, { color: subtextColor }]}>Code: {item.code}</Text>
                                            </View>
                                        </View>
                                        <Switch
                                            value={isIncluded}
                                            onValueChange={() => toggleDiscipline(item.id)}
                                            trackColor={{ false: '#767680', true: '#FF3B30' }}
                                            thumbColor="#FFFFFF"
                                        />
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                )}

            </ScrollView>

            {/* Floating Save Changes Bar */}
            {hasChanges && (
                <Animated.View
                    entering={FadeInDown.springify().damping(15)}
                    exiting={FadeOutDown.springify().damping(15)}
                    style={[
                        styles.floatingSaveContainer,
                        {
                            bottom: Math.max(insets.bottom, 16),
                            height: Platform.OS === 'ios' && SwiftUIHost && SwiftUIHStack && SwiftUIVStack && SwiftUIButton && SwiftUIText && SwiftUIGlassEffectContainer && SwiftUICircle && SwiftUISpacer && swiftModifiers ? 72 : undefined
                        }
                    ]}
                >
                    {Platform.OS === 'ios' && SwiftUIHost && SwiftUIHStack && SwiftUIVStack && SwiftUIButton && SwiftUIText && SwiftUIGlassEffectContainer && SwiftUICircle && SwiftUISpacer && swiftModifiers ? (
                        <SwiftUIHost style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                            <SwiftUIGlassEffectContainer modifiers={[
                                swiftModifiers.frame({ maxWidth: Infinity, height: 72 }),
                                swiftModifiers.cornerRadius(24)
                            ]}>
                                <SwiftUIHStack alignment="center" spacing={16} modifiers={[
                                    swiftModifiers.padding({ top: 12, bottom: 12, leading: 20, trailing: 20 }),
                                    swiftModifiers.glassEffect({ shape: 'capsule' })
                                ]}>
                                    <SwiftUIHStack alignment="center" spacing={10}>
                                        <SwiftUICircle modifiers={[
                                            swiftModifiers.frame({ width: 8, height: 8 }),
                                            swiftModifiers.foregroundStyle('#FF3B30'),
                                            swiftModifiers.shadow({ radius: 4, color: '#FF3B30' })
                                        ]} />
                                        
                                        <SwiftUIVStack alignment="leading" spacing={2}>
                                            <SwiftUIText weight="bold" size={15} color={isDark ? '#FFFFFF' : '#1C1C1E'}>
                                                Unsaved Changes
                                            </SwiftUIText>
                                        </SwiftUIVStack>
                                    </SwiftUIHStack>
                                    
                                    <SwiftUISpacer />
                                    
                                    <SwiftUIButton
                                        onPress={handleSaveChanges}
                                        disabled={saving}
                                        color="#FF3B30"
                                        modifiers={[
                                            swiftModifiers.buttonStyle('glassProminent'),
                                            swiftModifiers.tint('#FF3B30'),
                                            swiftModifiers.frame({ minWidth: 80, height: 38 })
                                        ]}
                                    >
                                        {saving ? 'Saving...' : 'Save'}
                                    </SwiftUIButton>
                                </SwiftUIHStack>
                            </SwiftUIGlassEffectContainer>
                        </SwiftUIHost>
                    ) : (
                        <LiquidCard
                            variant="clear"
                            contentStyle={styles.floatingSaveBlur}
                        >
                            <View style={styles.floatingSaveContent}>
                                <View style={styles.floatingSaveTextContainer}>
                                    <View style={styles.unsavedIndicator} />
                                    <Text style={[styles.floatingSaveTitle, { color: textColor }]}>Unsaved Changes</Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.floatingSaveButton}
                                    onPress={handleSaveChanges}
                                    disabled={saving}
                                >
                                    {saving ? (
                                        <ActivityIndicator color="#FFFFFF" />
                                    ) : (
                                        <Text style={styles.floatingSaveButtonText}>Save</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </LiquidCard>
                    )}
                </Animated.View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    tabBarContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        zIndex: 10,
        borderBottomWidth: 0,
        backgroundColor: 'transparent',
    },
    tabsScrollContent: {
        paddingHorizontal: 12,
        paddingVertical: 12,
        gap: 6,
    },
    tabPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
        gap: 6,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.08,
                shadowRadius: 3,
            },
            android: { elevation: 1 },
        }),
    },
    tabLabel: {
        fontSize: 14,
        fontWeight: '600',
    },
    tabDescription: {
        fontSize: 13,
        lineHeight: 18,
        marginBottom: 8,
        marginHorizontal: 4,
    },
    card: {
        borderRadius: 24,
        borderWidth: 0.5,
        padding: 20,
    },
    list: {
        gap: 2,
    },
    rowItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 0.5,
    },
    rowItemDetails: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    rowItemName: {
        fontSize: 15,
        fontWeight: '600',
    },
    rowItemSubtitle: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 1,
    },
    // Floating Save changes Bar styles
    floatingSaveContainer: {
        position: 'absolute',
        left: 20,
        right: 20,
        borderRadius: 24,
        overflow: 'hidden',
        zIndex: 9999,
    },
    floatingSaveBlur: {
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    floatingSaveContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    floatingSaveTextContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    unsavedIndicator: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#FF3B30',
    },
    floatingSaveTitle: {
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    floatingSaveButton: {
        backgroundColor: '#FF3B30',
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    floatingSaveButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
    },
});
