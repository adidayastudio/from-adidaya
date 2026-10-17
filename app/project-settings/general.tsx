import { HeaderBlurBackground } from '@/components/ui/HeaderBlurBackground';
import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    Platform,
    ActivityIndicator,
    TextInput,
    Modal,
    Switch,
    Alert, StatusBar as RNStatusBar } from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import {
    fetchDefaultWorkspaceId,
    fetchProjectTypes,
    createProjectType,
    updateProjectType,
    deleteProjectType,
    fetchTypologies,
    createTypology,
    updateTypology,
    deleteTypology,
    fetchDisciplines,
    createDiscipline,
    updateDiscipline,
    deleteDiscipline,
    fetchClasses,
    createClass,
    updateClass,
    deleteClass,
    fetchAllStageTemplates,
    ProjectTypeTemplate,
    Typology,
    Discipline,
    ClassTemplate,
    StageTemplate,
} from '@/lib/api/templates';
import { supabase } from '@/lib/supabase';
import { SwiftUIGeneralSettingsSheet } from '@/components/project-settings/SwiftUIGeneralSettingsSheet';

// Safe lazy loading of SwiftUI components for floating save Changes bar and SwiftUI Add button
let SwiftUIHost: any = null;
let SwiftUIHStack: any = null;
let SwiftUIVStack: any = null;
let SwiftUIButton: any = null;
let SwiftUIText: any = null;
let SwiftUIGlassEffectContainer: any = null;
let SwiftUICircle: any = null;
let SwiftUISpacer: any = null;
let SwiftUIImage: any = null;
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
        SwiftUIImage = SwiftUI.Image;
        swiftModifiers = require('@expo/ui/swift-ui/modifiers');
    } catch (e) {
        // handled
    }
}

type TabId = 'scope' | 'typologies' | 'disciplines' | 'classes';

const TABS: { id: TabId; label: string; icon: keyof typeof Ionicons.glyphMap; description: string }[] = [
    { id: 'scope', label: 'Scope', icon: 'briefcase-outline', description: 'Define delivery methods (e.g. Design-Build). Controls active stages.' },
    { id: 'typologies', label: 'Typology', icon: 'business-outline', description: 'Categorize by function. Used for benchmarking.' },
    { id: 'disciplines', label: 'Discipline', icon: 'construct-outline', description: 'Manage trades. Determines global WBS sorting sequence.' },
    { id: 'classes', label: 'Class', icon: 'layers-outline', description: 'Define quality levels (e.g. Luxury). Sets cost multipliers.' },
];

const PASTEL_COLORS = [
    'bg-red-200', 'bg-orange-200', 'bg-amber-200',
    'bg-yellow-200', 'bg-lime-200', 'bg-green-200',
    'bg-emerald-200', 'bg-teal-200', 'bg-cyan-200',
    'bg-sky-200', 'bg-blue-200', 'bg-indigo-200',
    'bg-violet-200', 'bg-purple-200', 'bg-fuchsia-200',
    'bg-pink-200', 'bg-rose-200', 'bg-stone-200'
];

const COLOR_MAP: Record<string, string> = {
    'bg-red-200': '#FECACA',
    'bg-orange-200': '#FED7AA',
    'bg-amber-200': '#FDE68A',
    'bg-yellow-200': '#FEF08A',
    'bg-lime-200': '#D9F99D',
    'bg-green-200': '#BBF7D0',
    'bg-emerald-200': '#A7F3D0',
    'bg-teal-200': '#99F6E4',
    'bg-cyan-200': '#A5F3FC',
    'bg-sky-200': '#BAE6FD',
    'bg-blue-200': '#BFDBFE',
    'bg-indigo-200': '#C7D2FE',
    'bg-violet-200': '#DDD6FE',
    'bg-purple-200': '#E9D5FF',
    'bg-fuchsia-200': '#F5D0FE',
    'bg-pink-200': '#FBCFE8',
    'bg-rose-200': '#FECDD3',
    'bg-stone-200': '#E7E5E4',
};

const DEFAULT_WORKSPACE_ID = '00000000-0000-0000-0000-000000000001';

export default function GeneralSettingsScreen() {
    const insets = useSafeAreaInsets();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';

    const bgColor = isDark ? '#000000' : '#F2F2F7';
    const cardBgColor = isDark ? '#1C1C1E' : '#FFFFFF';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6e6e73';
    const modalOverlayColor = 'rgba(0,0,0,0.5)';
    const textInputBg = isDark ? '#2C2C2E' : '#F2F2F7';
    const tagBgColor = isDark ? 'rgba(118,118,128,0.24)' : 'rgba(118,118,128,0.12)';
    const tagTextColor = isDark ? '#AEAEB2' : '#636366';

    const [activeTab, setActiveTab] = useState<TabId>('scope');
    const [workspaceId, setWorkspaceId] = useState(DEFAULT_WORKSPACE_ID);
    const [isLoading, setIsLoading] = useState(true);

    // Data lists
    const [scopes, setScopes] = useState<ProjectTypeTemplate[]>([]);
    const [stages, setStages] = useState<StageTemplate[]>([]);
    const [typologies, setTypologies] = useState<Typology[]>([]);
    const [disciplines, setDisciplines] = useState<Discipline[]>([]);
    const [classes, setClasses] = useState<ClassTemplate[]>([]);

    // Expansion tracking (accordion style)
    const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

    // Modal state for Add/Edit
    const [isFormModalVisible, setIsFormModalVisible] = useState(false);
    const [editItem, setEditItem] = useState<any | null>(null);
    const [formParentId, setFormParentId] = useState<string | null>(null);

    // Scroll refs for horizontal tabs auto-scrolling
    const tabRef = useRef<ScrollView>(null);
    const tabLayouts = useRef<Record<string, { x: number; width: number }>>({});

    // Stage changes local/floating bar tracking
    const [unsavedStages, setUnsavedStages] = useState<Record<string, boolean>>({});
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [unsavedScopeName, setUnsavedScopeName] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setUnsavedStages({});
        setHasUnsavedChanges(false);
        setUnsavedScopeName('');
        loadWorkspaceAndData();
    }, [activeTab]);

    const loadWorkspaceAndData = async () => {
        setIsLoading(true);
        try {
            let wsId = await fetchDefaultWorkspaceId();
            if (!wsId) wsId = DEFAULT_WORKSPACE_ID;
            setWorkspaceId(wsId);

            if (activeTab === 'scope') {
                const [scopesData, stagesData] = await Promise.all([
                    fetchProjectTypes(wsId),
                    fetchAllStageTemplates(wsId)
                ]);
                setScopes(scopesData);
                setStages(stagesData);
            } else if (activeTab === 'typologies') {
                const data = await fetchTypologies(wsId);
                setTypologies(data);
            } else if (activeTab === 'disciplines') {
                const data = await fetchDisciplines(wsId);
                setDisciplines(data.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)));
            } else if (activeTab === 'classes') {
                const data = await fetchClasses(wsId);
                setClasses(data.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)));
            }
        } catch (error) {
            console.error('Failed to load settings data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleStage = (stage: StageTemplate, currentVal: boolean, scopeName: string) => {
        const nextVal = !currentVal;
        setUnsavedStages(prev => {
            const next = { ...prev, [stage.id]: nextVal };
            const actualChanges = Object.entries(next).filter(([id, val]) => {
                const orig = stages.find(s => s.id === id);
                return orig && orig.isActive !== val;
            });
            const hasChanges = actualChanges.length > 0;
            setHasUnsavedChanges(hasChanges);
            if (hasChanges) {
                setUnsavedScopeName(scopeName);
            } else {
                setUnsavedScopeName('');
            }
            return next;
        });
    };

    const handleSaveChanges = async () => {
        setIsSaving(true);
        try {
            const promises = Object.entries(unsavedStages).map(async ([stageId, isActive]) => {
                const { error } = await supabase
                    .from('stage_templates')
                    .update({ is_active: isActive })
                    .eq('id', stageId);
                if (error) throw error;
            });
            await Promise.all(promises);

            Alert.alert('Berhasil', 'Perubahan berhasil disimpan!');
            setUnsavedStages({});
            setHasUnsavedChanges(false);
            setUnsavedScopeName('');
            await loadWorkspaceAndData();
        } catch (error) {
            Alert.alert('Error', 'Failed to save stage changes.');
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    const openAddModal = (parentId: string | null = null) => {
        setEditItem(null);
        setFormParentId(parentId);
        setIsFormModalVisible(true);
    };

    const openEditModal = (item: any) => {
        setFormParentId(null);
        setEditItem(item);
        setIsFormModalVisible(true);
    };

    const handleDelete = (id: string, name: string) => {
        Alert.alert(
            'Confirm Delete',
            `Are you sure you want to delete "${name}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            let success = false;
                            if (activeTab === 'scope') {
                                success = await deleteProjectType(id, workspaceId);
                            } else if (activeTab === 'typologies') {
                                success = await deleteTypology(id, workspaceId);
                            } else if (activeTab === 'disciplines') {
                                success = await deleteDiscipline(id, workspaceId);
                            } else if (activeTab === 'classes') {
                                success = await deleteClass(id, workspaceId);
                            }

                            if (success) {
                                loadWorkspaceAndData();
                            } else {
                                Alert.alert('Error', 'Failed to delete the item.');
                            }
                        } catch (error) {
                            Alert.alert('Error', 'An error occurred during deletion.');
                            console.error(error);
                        }
                    }
                }
            ]
        );
    };

    const handleSheetSave = async (payload: {
        code: string;
        name: string;
        description?: string;
        nameId?: string;
        color?: string;
        complexityLevel?: string;
        finishLevel?: string;
        parentId?: string | null;
    }) => {
        try {
            let success = false;

            if (activeTab === 'scope') {
                if (editItem) {
                    success = await updateProjectType(editItem.projectTypeId, workspaceId, {
                        code: payload.code,
                        name: payload.name,
                        description: payload.description,
                    });
                } else {
                    const generatedId = 'type-' + Math.random().toString(36).substring(2, 11);
                    const newType = await createProjectType(workspaceId, {
                        projectTypeId: generatedId,
                        code: payload.code,
                        name: payload.name,
                        description: payload.description,
                        isActive: true,
                    });
                    success = !!newType;
                }
            } else if (activeTab === 'typologies') {
                if (editItem) {
                    success = await updateTypology(editItem.id, workspaceId, {
                        code: payload.code,
                        name: payload.name,
                        parentId: editItem.parentId,
                        complexityLevel: payload.complexityLevel,
                    });
                } else {
                    const newTypo = await createTypology(workspaceId, {
                        code: payload.code,
                        name: payload.name,
                        parentId: payload.parentId,
                        linkedProjectTypes: [],
                        complexityLevel: payload.complexityLevel,
                        sortOrder: typologies.length,
                        isActive: true,
                    });
                    success = !!newTypo;
                }
            } else if (activeTab === 'disciplines') {
                if (editItem) {
                    success = await updateDiscipline(editItem.id, workspaceId, {
                        code: payload.code,
                        nameEn: payload.name,
                        nameId: payload.nameId,
                        color: payload.color,
                    });
                } else {
                    const newDisc = await createDiscipline(workspaceId, {
                        code: payload.code,
                        nameEn: payload.name,
                        nameId: payload.nameId,
                        color: payload.color,
                        sortOrder: disciplines.length,
                        isActive: true,
                    });
                    success = !!newDisc;
                }
            } else if (activeTab === 'classes') {
                if (editItem) {
                    success = await updateClass(editItem.id, workspaceId, {
                        classCode: payload.code,
                        description: payload.name,
                        finishLevel: payload.finishLevel,
                    });
                } else {
                    const newClass = await createClass(workspaceId, {
                        classCode: payload.code,
                        description: payload.name,
                        finishLevel: payload.finishLevel,
                        sortOrder: classes.length,
                        isActive: true,
                    });
                    success = !!newClass;
                }
            }

            if (success) {
                loadWorkspaceAndData();
                return true;
            } else {
                Alert.alert('Error', 'Failed to save settings.');
                return false;
            }
        } catch (error) {
            Alert.alert('Error', 'An error occurred during save.');
            console.error(error);
            return false;
        }
    };

    const renderAddButton = (label: string) => {
        if (Platform.OS === 'ios' && SwiftUIHost && SwiftUIButton && SwiftUIHStack && SwiftUIText && SwiftUIImage && swiftModifiers) {
            return (
                <SwiftUIHost style={{ height: 32, width: 140 }} colorScheme={isDark ? 'dark' : 'light'}>
                    <SwiftUIButton
                        onPress={() => openAddModal()}
                        modifiers={[
                            swiftModifiers.buttonStyle('plain'),
                            swiftModifiers.frame({ height: 32 })
                        ]}
                    >
                        <SwiftUIHStack spacing={4} alignment="center">
                            <SwiftUIImage systemName="plus.circle.fill" size={16} color="#007AFF" />
                            <SwiftUIText size={14} weight="semibold" color="#007AFF">
                                {label}
                            </SwiftUIText>
                        </SwiftUIHStack>
                    </SwiftUIButton>
                </SwiftUIHost>
            );
        }

        return (
            <TouchableOpacity style={styles.addButton} onPress={() => openAddModal()}>
                <Ionicons name="add-circle" size={24} color="#007AFF" />
                <Text style={styles.addButtonText}>{label}</Text>
            </TouchableOpacity>
        );
    };

    // Render contents of each tab
    const renderScopeTab = () => {
        return (
            <View style={styles.tabContentContainer}>
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: textColor }]}>Scope Delivery Methods</Text>
                    {renderAddButton('Add Scope')}
                </View>

                {scopes.length === 0 ? (
                    <Text style={[styles.emptyText, { color: subtextColor }]}>No scopes defined yet.</Text>
                ) : (
                    scopes.map((scope, idx) => {
                        const isExpanded = expandedItemId === scope.projectTypeId;
                        const scopeStages = stages.filter(s => s.projectTypeId === scope.projectTypeId);
                        const activeStagesCount = scopeStages.filter(s => 
                            unsavedStages[s.id] !== undefined ? unsavedStages[s.id] : s.isActive
                        ).length;

                        return (
                            <Animated.View
                                key={scope.projectTypeId}
                                entering={FadeInDown.delay(idx * 40).duration(200)}
                                style={[styles.card, { backgroundColor: cardBgColor }]}
                            >
                                <View style={styles.cardHeader}>
                                    <View style={{ flex: 1 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <View style={styles.codeBadge}>
                                                <Text style={styles.codeBadgeText}>{scope.code || 'N/A'}</Text>
                                            </View>
                                            <Text style={[styles.cardTitle, { color: textColor }]}>{scope.name}</Text>
                                        </View>
                                        {scope.description ? (
                                            <Text style={[styles.cardDescription, { color: subtextColor }]}>{scope.description}</Text>
                                        ) : null}
                                    </View>
                                    <View style={styles.cardActions}>
                                        <TouchableOpacity onPress={() => openEditModal(scope)} style={styles.actionIconButton}>
                                            <Ionicons name="pencil-outline" size={18} color="#8E8E93" />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* Accordion expansion for Stages */}
                                <TouchableOpacity
                                    activeOpacity={0.7}
                                    onPress={() => setExpandedItemId(isExpanded ? null : scope.projectTypeId)}
                                    style={[styles.accordionToggle, { borderTopColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}
                                >
                                    <Text style={styles.accordionToggleText}>
                                        {activeStagesCount} Stages Mapped
                                    </Text>
                                    <Ionicons
                                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                                        size={16}
                                        color={subtextColor}
                                    />
                                </TouchableOpacity>

                                {isExpanded && (
                                    <View style={styles.accordionContent}>
                                        {scopeStages.length === 0 ? (
                                            <Text style={[styles.emptyText, { color: subtextColor }]}>No stage templates linked.</Text>
                                        ) : (
                                            scopeStages.map(stageItem => {
                                                const isCurrentActive = unsavedStages[stageItem.id] !== undefined ? unsavedStages[stageItem.id] : stageItem.isActive;
                                                return (
                                                    <View key={stageItem.id} style={styles.stageRow}>
                                                        <View style={{ flex: 1 }}>
                                                            <Text style={[styles.stageName, { color: textColor }]}>{stageItem.stageName}</Text>
                                                            <Text style={[styles.stageCode, { color: subtextColor }]}>{stageItem.displayCode || stageItem.stageCode}</Text>
                                                        </View>
                                                        <Switch
                                                            value={isCurrentActive}
                                                            onValueChange={() => handleToggleStage(stageItem, isCurrentActive, scope.name)}
                                                            trackColor={{ false: '#767680', true: '#34C759' }}
                                                            thumbColor={Platform.OS === 'ios' ? undefined : '#FFFFFF'}
                                                        />
                                                    </View>
                                                );
                                            })
                                        )}
                                    </View>
                                )}
                            </Animated.View>
                        );
                    })
                )}
            </View>
        );
    };

    const renderTypologiesTab = () => {
        return (
            <View style={styles.tabContentContainer}>
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: textColor }]}>Functions & Typologies</Text>
                    {renderAddButton('Add Typology')}
                </View>

                {typologies.length === 0 ? (
                    <Text style={[styles.emptyText, { color: subtextColor }]}>No typologies defined yet.</Text>
                ) : (
                    typologies.map((typo, idx) => {
                        const isExpanded = expandedItemId === typo.id;
                        const subs = typo.subTypologies || [];

                        return (
                            <Animated.View
                                key={typo.id}
                                entering={FadeInDown.delay(idx * 40).duration(200)}
                                style={[styles.card, { backgroundColor: cardBgColor }]}
                            >
                                <View style={styles.cardHeader}>
                                    <View style={{ flex: 1 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <View style={styles.codeBadge}>
                                                <Text style={styles.codeBadgeText}>{typo.code}</Text>
                                            </View>
                                            <Text style={[styles.cardTitle, { color: textColor }]}>{typo.name}</Text>
                                        </View>
                                        <Text style={[styles.cardDescription, { color: subtextColor }]}>Complexity: {typo.complexityLevel || 'Medium'}</Text>
                                    </View>
                                    <View style={styles.cardActions}>
                                        <TouchableOpacity onPress={() => openEditModal(typo)} style={styles.actionIconButton}>
                                            <Ionicons name="pencil-outline" size={18} color="#8E8E93" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
 
                                {/* Accordion for subtypologies */}
                                <TouchableOpacity
                                    activeOpacity={0.7}
                                    onPress={() => setExpandedItemId(isExpanded ? null : typo.id)}
                                    style={[styles.accordionToggle, { borderTopColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}
                                >
                                    <Text style={styles.accordionToggleText}>
                                        {subs.length} Sub-Typologies
                                    </Text>
                                    <Ionicons
                                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                                        size={16}
                                        color={subtextColor}
                                    />
                                </TouchableOpacity>
 
                                {isExpanded && (
                                    <View style={styles.accordionContent}>
                                        {subs.length === 0 ? (
                                            <Text style={[styles.emptyText, { color: subtextColor }]}>No sub-typologies defined.</Text>
                                        ) : (
                                            subs.map(subItem => (
                                                <View key={subItem.id} style={styles.subTypologyRow}>
                                                    <View style={{ flex: 1 }}>
                                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                            <Text style={[styles.subTypologyCode, { color: subtextColor }]}>[{subItem.code}]</Text>
                                                            <Text style={[styles.subTypologyName, { color: textColor }]}>{subItem.name}</Text>
                                                        </View>
                                                        <Text style={[styles.subTypologyDetail, { color: subtextColor }]}>Complexity: {subItem.complexityLevel}</Text>
                                                    </View>
                                                    <View style={styles.subActions}>
                                                        <TouchableOpacity onPress={() => openEditModal(subItem)} style={styles.actionIconButton}>
                                                            <Ionicons name="pencil-outline" size={16} color="#8E8E93" />
                                                        </TouchableOpacity>
                                                    </View>
                                                </View>
                                            ))
                                        )}
                                        <TouchableOpacity
                                            style={[styles.addSubTypologyButton, { borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }]}
                                            onPress={() => openAddModal(typo.id)}
                                        >
                                            <Ionicons name="add" size={16} color="#007AFF" />
                                            <Text style={styles.addSubTypologyButtonText}>Add Sub-Typology</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </Animated.View>
                        );
                    })
                )}
            </View>
        );
    };

    const renderDisciplinesTab = () => {
        return (
            <View style={styles.tabContentContainer}>
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: textColor }]}>Project Disciplines</Text>
                    {renderAddButton('Add Discipline')}
                </View>

                {disciplines.length === 0 ? (
                    <Text style={[styles.emptyText, { color: subtextColor }]}>No disciplines defined yet.</Text>
                ) : (
                    disciplines.map((disc, idx) => {
                        const bgHex = COLOR_MAP[disc.color || 'bg-purple-200'] || '#E9D5FF';
                        return (
                            <Animated.View
                                key={disc.id}
                                entering={FadeInDown.delay(idx * 40).duration(200)}
                                style={[styles.card, { backgroundColor: cardBgColor }]}
                            >
                                <View style={styles.cardHeader}>
                                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                        <View style={[styles.colorIndicator, { backgroundColor: bgHex }]} />
                                        <View style={{ flex: 1 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                <View style={styles.codeBadge}>
                                                    <Text style={styles.codeBadgeText}>{disc.code}</Text>
                                                </View>
                                                <Text style={[styles.cardTitle, { color: textColor }]}>{disc.nameEn}</Text>
                                            </View>
                                            {disc.nameId ? (
                                                <Text style={[styles.cardDescription, { color: subtextColor }]}>{disc.nameId}</Text>
                                            ) : null}
                                        </View>
                                    </View>
                                    <View style={styles.cardActions}>
                                        <TouchableOpacity onPress={() => openEditModal(disc)} style={styles.actionIconButton}>
                                            <Ionicons name="pencil-outline" size={18} color="#8E8E93" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </Animated.View>
                        );
                    })
                )}
            </View>
        );
    };

    const renderClassesTab = () => {
        return (
            <View style={styles.tabContentContainer}>
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: textColor }]}>Project Quality Classes</Text>
                    {renderAddButton('Add Class')}
                </View>

                {classes.length === 0 ? (
                    <Text style={[styles.emptyText, { color: subtextColor }]}>No quality classes defined yet.</Text>
                ) : (
                    classes.map((cls, idx) => {
                        return (
                            <Animated.View
                                key={cls.id}
                                entering={FadeInDown.delay(idx * 40).duration(200)}
                                style={[styles.card, { backgroundColor: cardBgColor }]}
                            >
                                <View style={styles.cardHeader}>
                                    <View style={{ flex: 1 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <View style={styles.codeBadge}>
                                                <Text style={styles.codeBadgeText}>{cls.classCode}</Text>
                                            </View>
                                            <Text style={[styles.cardTitle, { color: textColor }]}>{cls.description || 'Class ' + cls.classCode}</Text>
                                        </View>
                                        {cls.finishLevel ? (
                                            <Text style={[styles.cardDescription, { color: subtextColor }]}>Finish: {cls.finishLevel}</Text>
                                        ) : null}
                                    </View>
                                    <View style={styles.cardActions}>
                                        <TouchableOpacity onPress={() => openEditModal(cls)} style={styles.actionIconButton}>
                                            <Ionicons name="pencil-outline" size={18} color="#8E8E93" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </Animated.View>
                        );
                    })
                )}
            </View>
        );
    };

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: true,
                    title: 'General Settings',
                    headerLargeTitle: Platform.OS === 'ios',
                    headerTransparent: Platform.OS === 'ios',
                    headerBackground: Platform.OS === 'ios' ? () => <HeaderBlurBackground isDark={isDark} /> : undefined,
                    headerStyle: { backgroundColor: Platform.OS === 'ios' ? 'transparent' : (isDark ? '#000000' : '#F2F2F7') },
                    headerTintColor: '#007AFF',
                    headerTitleStyle: { color: textColor },
                    headerLargeTitleStyle: { color: textColor },
                    headerShadowVisible: false,
                }}
            />

            <ScrollView
                style={[styles.scrollView, { backgroundColor: bgColor }]}
                contentInsetAdjustmentBehavior="automatic"
                contentContainerStyle={{
                    paddingBottom: insets.bottom + (hasUnsavedChanges ? 120 : 40),
                    paddingTop: Platform.OS === 'android' ? ((RNStatusBar.currentHeight || 24) + 54) : 12,
                }}
                showsVerticalScrollIndicator={false}
            >
                {/* Sub-menu Tabs selector */}
                <View style={[styles.tabBarContainer, { backgroundColor: 'transparent', paddingBottom: 12 }]}>
                    <ScrollView 
                        ref={tabRef}
                        horizontal 
                        showsHorizontalScrollIndicator={false} 
                        contentContainerStyle={styles.tabsScrollContent}
                    >
                        {TABS.map(tab => {
                            const isSelected = activeTab === tab.id;
                            const activeBg = isDark ? '#FFFFFF' : '#1C1C1E';
                            const activeText = isDark ? '#000000' : '#FFFFFF';
                            return (
                                <TouchableOpacity
                                    key={tab.id}
                                    onLayout={(e) => {
                                        tabLayouts.current[tab.id] = e.nativeEvent.layout;
                                    }}
                                    activeOpacity={0.8}
                                    onPress={() => {
                                        setActiveTab(tab.id);
                                        setExpandedItemId(null);
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

                {isLoading ? (
                    <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 40 }} />
                ) : (
                    <View style={{ paddingHorizontal: 16 }}>
                        <Text style={[styles.tabDescription, { color: subtextColor }]}>
                            {TABS.find(t => t.id === activeTab)?.description}
                        </Text>
                        {activeTab === 'scope' && renderScopeTab()}
                        {activeTab === 'typologies' && renderTypologiesTab()}
                        {activeTab === 'disciplines' && renderDisciplinesTab()}
                        {activeTab === 'classes' && renderClassesTab()}
                    </View>
                )}
            </ScrollView>

            {/* iOS/Cross-platform native settings drawer sheet */}
            <SwiftUIGeneralSettingsSheet
                isOpened={isFormModalVisible}
                onClose={() => setIsFormModalVisible(false)}
                activeTab={activeTab}
                editItem={editItem}
                parentId={formParentId}
                onSave={handleSheetSave}
                onDelete={handleDelete}
            />

            {/* Global Sticky Save Changes Bar */}
            {hasUnsavedChanges && (
                <View style={[
                    styles.floatingSaveContainerOuter, 
                    { 
                        bottom: insets.bottom + 10,
                        height: 72 
                    }
                ]}>
                    {Platform.OS === 'ios' && SwiftUIHost && SwiftUIHStack && SwiftUIVStack && SwiftUIButton && SwiftUIText && SwiftUIGlassEffectContainer && SwiftUICircle && SwiftUISpacer && swiftModifiers ? (
                        <SwiftUIHost style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                            <SwiftUIGlassEffectContainer modifiers={[
                                swiftModifiers.frame({ maxWidth: Infinity, height: 72 }),
                                swiftModifiers.cornerRadius(30)
                            ]}>
                                <SwiftUIHStack alignment="center" spacing={16} modifiers={[
                                    swiftModifiers.padding({ top: 12, bottom: 12, leading: 24, trailing: 24 }),
                                    swiftModifiers.glassEffect({ shape: 'capsule' })
                                ]}>
                                    <SwiftUIHStack alignment="center" spacing={10}>
                                        <SwiftUICircle modifiers={[
                                            swiftModifiers.frame({ width: 8, height: 8 }),
                                            swiftModifiers.foregroundStyle('#007AFF'),
                                            swiftModifiers.shadow({ radius: 4, color: '#007AFF' })
                                        ]} />
                                        
                                        <SwiftUIVStack alignment="leading" spacing={2}>
                                            <SwiftUIText weight="bold" size={15} color={isDark ? '#FFFFFF' : '#1C1C1E'}>
                                                Unsaved Changes
                                            </SwiftUIText>
                                            <SwiftUIText size={11} color={isDark ? '#A1A1A6' : '#8E8E93'}>
                                                Scope: {unsavedScopeName}
                                            </SwiftUIText>
                                        </SwiftUIVStack>
                                    </SwiftUIHStack>
                                    
                                    <SwiftUISpacer />
                                    
                                    <SwiftUIButton
                                        onPress={handleSaveChanges}
                                        disabled={isSaving}
                                        modifiers={[
                                            swiftModifiers.buttonStyle('glassProminent'),
                                            swiftModifiers.tint('#007AFF'),
                                            swiftModifiers.frame({ minWidth: 80, height: 38 })
                                        ]}
                                    >
                                        Save
                                    </SwiftUIButton>
                                </SwiftUIHStack>
                            </SwiftUIGlassEffectContainer>
                        </SwiftUIHost>
                    ) : (
                        <BlurView
                            intensity={Platform.OS === 'android' ? 40 : 80}
                            tint={Platform.OS === 'android' ? (isDark ? 'dark' : 'light') : (isDark ? 'systemChromeMaterialDark' : 'systemChromeMaterial')}
                            style={styles.floatingSaveContainerNew}
                        >
                            {Platform.OS === 'android' && (
                                <View style={[StyleSheet.absoluteFill, {
                                    backgroundColor: isDark ? 'rgba(44,44,46,0.85)' : 'rgba(255,255,255,0.85)',
                                    borderRadius: 50,
                                }]} />
                            )}
                            <View style={styles.leftContent}>
                                <View style={styles.statusDotNew} />
                                <View style={styles.textBlock}>
                                    <Text style={[styles.mainTitleNew, { color: textColor }]}>Unsaved Changes</Text>
                                    <Text style={[styles.subtextNew, { color: textColor }]}>Scope: {unsavedScopeName}</Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                style={[styles.actionButtonNew, { backgroundColor: '#007AFF' }]}
                                onPress={handleSaveChanges}
                                disabled={isSaving}
                            >
                                <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Save</Text>
                            </TouchableOpacity>
                        </BlurView>
                    )}
                </View>
            )}
        </>
    );
}

const styles = StyleSheet.create({
    scrollView: {
        flex: 1,
    },
    tabBarContainer: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(0,0,0,0.1)',
    },
    tabsScrollContent: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 8,
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
        marginBottom: 16,
        marginHorizontal: 4,
    },
    tabContentContainer: {
        gap: 12,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
        paddingHorizontal: 4,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    addButtonText: {
        color: '#007AFF',
        fontWeight: '600',
        fontSize: 14,
    },
    card: {
        borderRadius: 22,
        padding: 16,
        gap: 12,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
            },
            android: { elevation: 2 },
        }),
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    codeBadge: {
        backgroundColor: 'rgba(120, 120, 128, 0.16)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
    },
    codeBadgeText: {
        color: '#8E8E93',
        fontSize: 11,
        fontWeight: '700',
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    cardTitle: {
        fontSize: 17,
        fontWeight: '700',
    },
    cardDescription: {
        fontSize: 13,
        marginTop: 4,
        lineHeight: 18,
    },
    cardActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    actionIconButton: {
        padding: 6,
        borderRadius: 999,
        backgroundColor: 'rgba(0,0,0,0.02)',
    },
    accordionToggle: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        paddingTop: Platform.OS === 'android' ? ((RNStatusBar.currentHeight || 24) + 54) : 12,
        marginTop: 4,
    },
    accordionToggleText: {
        color: '#007AFF',
        fontSize: 13,
        fontWeight: '600',
    },
    accordionContent: {
        paddingTop: Platform.OS === 'android' ? ((RNStatusBar.currentHeight || 24) + 54) : 8,
        gap: 8,
    },
    stageRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    stageName: {
        fontSize: 14,
        fontWeight: '600',
    },
    stageCode: {
        fontSize: 11,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        marginTop: 2,
    },
    emptyText: {
        textAlign: 'center',
        fontSize: 14,
        marginVertical: 20,
        fontStyle: 'italic',
    },
    subTypologyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    subTypologyCode: {
        fontSize: 12,
        fontWeight: '700',
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    subTypologyName: {
        fontSize: 14,
        fontWeight: '600',
    },
    subTypologyDetail: {
        fontSize: 11,
        marginTop: 2,
    },
    subActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    colorIndicator: {
        width: 12,
        height: 12,
        borderRadius: 999,
    },
    floatingSaveContainerOuter: {
        position: 'absolute',
        left: 20,
        right: 20,
        zIndex: 1000,
    },
    floatingSaveContainerNew: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 50,
        width: '100%',
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.15,
                shadowRadius: 24,
            },
            android: {
                elevation: 16,
            },
        }),
    },
    leftContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    statusDotNew: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 12,
        backgroundColor: '#FF9500',
        shadowColor: '#FF9500',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 6,
    },
    textBlock: {
        flex: 1,
        justifyContent: 'center',
        gap: 2,
    },
    mainTitleNew: {
        fontSize: 15,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    subtextNew: {
        fontSize: 11,
        fontWeight: '400',
        opacity: 0.6,
    },
    actionButtonNew: {
        minWidth: 80,
        height: 38,
        borderRadius: 19,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addSubTypologyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        gap: 6,
        marginTop: 8,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderRadius: 12,
    },
    addSubTypologyButtonText: {
        color: '#007AFF',
        fontSize: 14,
        fontWeight: '600',
    },
});
