import { HeaderBlurBackground } from '@/components/ui/HeaderBlurBackground';
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

// Safe lazy loading of SwiftUI components for horizontal tabs/save bar
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

const MOCK_REPORT_PRESETS = [
    { id: 'weekly_progress', name: 'Weekly Progress Sheet', description: 'Consolidate WBS task completions and daily crew logs into a printable PDF.' },
    { id: 'cost_variance', name: 'Cost Variance Report (EV)', description: 'Earned Value Analysis report comparing budgeted cost of work scheduled vs actual.' },
    { id: 'labor_ledger', name: 'Labor & Crew Ledger', description: 'Log of active crew members on site, attendance records, and daily rates summary.' },
    { id: 'client_executive', name: 'Client Executive Summary', description: 'High-level dashboard overview showing key timeline progress rings and upcoming milestones.' }
];

export default function ProjectSetupReportsScreen({
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

    const [project, setProject] = useState<Project | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [activePresets, setActivePresets] = useState<string[]>([]);
    const [originalActivePresets, setOriginalActivePresets] = useState<string[]>([]);

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
                const reportsSetup = data.meta?.setup?.reports || {};
                const presets = reportsSetup.presets || ['weekly_progress', 'client_executive'];
                setActivePresets(presets);
                setOriginalActivePresets(presets);
            }
        } catch (error) {
            console.error('Error loading reports setup data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const togglePreset = (presetId: string) => {
        setActivePresets(prev =>
            prev.includes(presetId) ? prev.filter(id => id !== presetId) : [...prev, presetId]
        );
    };

    const hasChanges =
        JSON.stringify([...activePresets].sort()) !== JSON.stringify([...originalActivePresets].sort());

    const handleSaveChanges = async () => {
        if (!project) return;
        setSaving(true);
        try {
            const currentMeta = project.meta || {};
            const updatedSetup = {
                ...currentMeta.setup,
                reports: {
                    presets: activePresets
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
                setOriginalActivePresets(activePresets);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert('Success', 'Report presets saved successfully!');
                onSaved?.();
            } else {
                Alert.alert('Error', 'Failed to save Reports configuration.');
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
                <ActivityIndicator size="large" color="#AF52DE" />
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
                        title: 'Reports Setup',
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
                    <Text style={{ fontSize: 20, fontWeight: '700', color: textColor }}>Reports & Analytics</Text>
                    <Text style={{ fontSize: 13, color: subtextColor, marginTop: 2 }}>Configure active report templates and executive summary presets for this project.</Text>
                </View>
            )}

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{
                    paddingTop: isEmbedded ? 16 : (Platform.OS === 'ios' ? insets.top + 50 : 20),
                    paddingBottom: insets.bottom + 100,
                    paddingHorizontal: 16,
                    gap: 16
                }}
                showsVerticalScrollIndicator={false}
            >
                {/* Report presets list */}
                <View style={[styles.card, { backgroundColor: cardBgColor, borderColor }]}>
                    <Text style={[styles.sectionTitle, { color: textColor }]}>Active Report Presets</Text>
                    <Text style={[styles.sectionSubtitle, { color: subtextColor }]}>Select report formats and presets active for generation and exports.</Text>
                    <View style={styles.separator} />

                    <View style={styles.list}>
                        {MOCK_REPORT_PRESETS.map(item => {
                            const isIncluded = activePresets.includes(item.id);
                            return (
                                <View key={item.id} style={[styles.rowItem, { borderBottomColor: borderColor }]}>
                                    <View style={styles.rowItemDetails}>
                                        <Ionicons name="document-text-outline" size={20} color={isIncluded ? '#AF52DE' : subtextColor} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.rowItemName, { color: textColor }]}>{item.name}</Text>
                                            <Text style={[styles.rowItemSubtitle, { color: subtextColor }]}>{item.description}</Text>
                                        </View>
                                    </View>
                                    <Switch
                                        value={isIncluded}
                                        onValueChange={() => togglePreset(item.id)}
                                        trackColor={{ false: '#767680', true: '#AF52DE' }}
                                        thumbColor="#FFFFFF"
                                    />
                                </View>
                            );
                        })}
                    </View>
                </View>

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
                                            swiftModifiers.foregroundStyle('#AF52DE'),
                                            swiftModifiers.shadow({ radius: 4, color: '#AF52DE' })
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
                                        color="#AF52DE"
                                        modifiers={[
                                            swiftModifiers.buttonStyle('glassProminent'),
                                            swiftModifiers.tint('#AF52DE'),
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
    card: {
        borderRadius: 24,
        borderWidth: 0.5,
        padding: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: -0.1,
    },
    sectionSubtitle: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 2,
    },
    separator: {
        height: 0.5,
        backgroundColor: 'rgba(118, 118, 128, 0.16)',
        marginVertical: 14,
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
        backgroundColor: '#AF52DE',
    },
    floatingSaveTitle: {
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    floatingSaveButton: {
        backgroundColor: '#AF52DE',
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
