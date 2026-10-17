import { HeaderBlurBackground } from '@/components/ui/HeaderBlurBackground';
import { SwiftUIStagesSettingsSheet } from '@/components/project-settings/SwiftUIStagesSettingsSheet';
import { SwiftUIScopePickerSheet } from '@/components/project-settings/SwiftUIScopePickerSheet';
import { SwiftUIStagePickerSheet } from '@/components/project-settings/SwiftUIStagePickerSheet';
import { useTheme } from '@/context/ThemeContext';
import {
    createStageTaskTemplate,
    createStageTemplate,
    deleteStageTaskTemplate,
    deleteStageTemplate,
    Discipline,
    fetchDefaultWorkspaceId,
    fetchDisciplines,
    fetchProjectTypes,
    fetchStageTaskTemplates,
    fetchStageTemplates,
    ProjectTypeTemplate,
    StageTaskTemplate,
    StageTemplate,
    updateStageTaskTemplate,
    updateStageTemplate,
} from '@/lib/api/templates';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Stack } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View, StatusBar as RNStatusBar } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Safe lazy loading of SwiftUI components for native SwiftUI add button on iOS and glass save bar
let SwiftUIHost: any = null;
let SwiftUIHStack: any = null;
let SwiftUIVStack: any = null;
let SwiftUIBottomSheet: any = null;
let SwiftUIButton: any = null;
let SwiftUIText: any = null;
let SwiftUIGlassEffectContainer: any = null;
let SwiftUICircle: any = null;
let SwiftUISpacer: any = null;
let SwiftUIImage: any = null;
let SwiftUIList: any = null;
let swiftModifiers: any = null;

if (Platform.OS === 'ios') {
    try {
        const SwiftUI = require('@expo/ui/swift-ui');
        SwiftUIHost = SwiftUI.Host;
        SwiftUIHStack = SwiftUI.HStack;
        SwiftUIVStack = SwiftUI.VStack;
        SwiftUIBottomSheet = SwiftUI.BottomSheet;
        SwiftUIButton = SwiftUI.Button;
        SwiftUIText = SwiftUI.Text;
        SwiftUIGlassEffectContainer = SwiftUI.GlassEffectContainer;
        SwiftUICircle = SwiftUI.Circle;
        SwiftUISpacer = SwiftUI.Spacer;
        SwiftUIImage = SwiftUI.Image;
        SwiftUIList = SwiftUI.List;
        swiftModifiers = require('@expo/ui/swift-ui/modifiers');
    } catch (e) {
        // handled
    }
}

type TabId = 'stage-list' | 'scope-stages' | 'task-templates';

const TABS: { id: TabId; label: string; icon: keyof typeof Ionicons.glyphMap; description: string }[] = [
    { id: 'stage-list', label: 'Stage List', icon: 'list-outline', description: 'Master sequence of project phases. Determines default workflow.' },
    { id: 'scope-stages', label: 'Scope Stages', icon: 'radio-button-on-outline', description: 'Map stages to Scopes. Defines which stages appear for each project type.' },
    { id: 'task-templates', label: 'Task Templates', icon: 'checkbox-outline', description: 'Standard deliverables per stage. Auto-populates task lists on stage start.' },
];

const DEFAULT_WORKSPACE_ID = '00000000-0000-0000-0000-000000000001';

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
    'General': { bg: 'rgba(142, 142, 147, 0.12)', text: '#8E8E93' },
    'Design': { bg: 'rgba(191, 90, 242, 0.12)', text: '#BF5AF2' },
    'Tender': { bg: 'rgba(10, 132, 255, 0.12)', text: '#0A84FF' },
    'Construction': { bg: 'rgba(255, 159, 10, 0.12)', text: '#FF9F0A' },
    'Handover': { bg: 'rgba(48, 209, 88, 0.12)', text: '#30D158' },
};

const DEFAULT_CATEGORY_COLORS = { bg: 'rgba(142, 142, 147, 0.12)', text: '#8E8E93' };

// Mock data builder for stages that have no task templates in database
const MOCK_STAGE_TASKS: Record<string, Array<{
    taskName: string;
    weightDefault: number;
    sequenceOrder: number;
    disciplineCode: string;
    priority: string;
    isMandatory: boolean;
    subtasks?: Array<{ taskName: string; weightDefault: number; sequenceOrder: number; disciplineCode: string; priority: string; isMandatory: boolean }>
}>> = {
    'KO': [
        {
            taskName: 'General Information',
            weightDefault: 30,
            sequenceOrder: 1,
            disciplineCode: 'ALL',
            priority: 'medium',
            isMandatory: false,
            subtasks: [
                { taskName: 'Cover', weightDefault: 3, sequenceOrder: 1, disciplineCode: 'ALL', priority: 'low', isMandatory: false },
                { taskName: 'Table of Contents', weightDefault: 3, sequenceOrder: 2, disciplineCode: 'ALL', priority: 'low', isMandatory: false },
                { taskName: 'Purpose of Kickoff', weightDefault: 6, sequenceOrder: 3, disciplineCode: 'ALL', priority: 'medium', isMandatory: true },
                { taskName: 'Kickoff Scope & Deliverables', weightDefault: 8, sequenceOrder: 4, disciplineCode: 'ALL', priority: 'high', isMandatory: true },
                { taskName: 'Workflow Overview', weightDefault: 3, sequenceOrder: 5, disciplineCode: 'ALL', priority: 'low', isMandatory: false },
                { taskName: 'Project Understanding & Brief', weightDefault: 7, sequenceOrder: 6, disciplineCode: 'ALL', priority: 'high', isMandatory: true },
            ]
        },
        {
            taskName: 'Client Brief & Objectives',
            weightDefault: 40,
            sequenceOrder: 2,
            disciplineCode: 'ALL',
            priority: 'medium',
            isMandatory: false,
            subtasks: [
                { taskName: 'Client Requirements Document', weightDefault: 20, sequenceOrder: 1, disciplineCode: 'ALL', priority: 'high', isMandatory: true },
                { taskName: 'Site Survey Photo Report', weightDefault: 20, sequenceOrder: 2, disciplineCode: 'ALL', priority: 'medium', isMandatory: false },
            ]
        },
        {
            taskName: 'Scope of Work Definition',
            weightDefault: 30,
            sequenceOrder: 3,
            disciplineCode: 'ALL',
            priority: 'medium',
            isMandatory: false,
            subtasks: [
                { taskName: 'Initial WBS Structure Template', weightDefault: 15, sequenceOrder: 1, disciplineCode: 'ALL', priority: 'medium', isMandatory: true },
                { taskName: 'Project Charter Sign-off', weightDefault: 15, sequenceOrder: 2, disciplineCode: 'ALL', priority: 'high', isMandatory: true },
            ]
        }
    ],
    'SD': [
        {
            taskName: 'Concept Design Documentation',
            weightDefault: 50,
            sequenceOrder: 1,
            disciplineCode: 'ALL',
            priority: 'medium',
            isMandatory: false,
            subtasks: [
                { taskName: 'Moodboard Presentation', weightDefault: 20, sequenceOrder: 1, disciplineCode: 'ALL', priority: 'medium', isMandatory: false },
                { taskName: 'Space Planning Layout', weightDefault: 30, sequenceOrder: 2, disciplineCode: 'ALL', priority: 'high', isMandatory: true },
            ]
        },
        {
            taskName: 'Cost Estimating',
            weightDefault: 50,
            sequenceOrder: 2,
            disciplineCode: 'ALL',
            priority: 'medium',
            isMandatory: false,
            subtasks: [
                { taskName: 'Ballpark Cost Study', weightDefault: 50, sequenceOrder: 1, disciplineCode: 'ALL', priority: 'high', isMandatory: true }
            ]
        }
    ],
    'DD': [
        {
            taskName: 'Architectural Drawings Development',
            weightDefault: 40,
            sequenceOrder: 1,
            disciplineCode: 'ALL',
            priority: 'medium',
            isMandatory: false,
            subtasks: [
                { taskName: 'Detailed Floor Plans', weightDefault: 20, sequenceOrder: 1, disciplineCode: 'ALL', priority: 'high', isMandatory: true },
                { taskName: 'Elevation Drawings', weightDefault: 20, sequenceOrder: 2, disciplineCode: 'ALL', priority: 'medium', isMandatory: false },
            ]
        },
        {
            taskName: 'Structural Design',
            weightDefault: 30,
            sequenceOrder: 2,
            disciplineCode: 'ALL',
            priority: 'medium',
            isMandatory: false,
            subtasks: [
                { taskName: 'Foundation Layout Plan', weightDefault: 30, sequenceOrder: 1, disciplineCode: 'ALL', priority: 'high', isMandatory: true }
            ]
        },
        {
            taskName: 'MEP Coordination',
            weightDefault: 30,
            sequenceOrder: 3,
            disciplineCode: 'ALL',
            priority: 'medium',
            isMandatory: false,
            subtasks: [
                { taskName: 'Preliminary MEP Schematics', weightDefault: 30, sequenceOrder: 1, disciplineCode: 'ALL', priority: 'medium', isMandatory: false }
            ]
        }
    ],
    'ED': [
        {
            taskName: 'Detailed Engineering Design (DED)',
            weightDefault: 60,
            sequenceOrder: 1,
            disciplineCode: 'ALL',
            priority: 'medium',
            isMandatory: false,
            subtasks: [
                { taskName: 'Structural Reinforcement Details', weightDefault: 30, sequenceOrder: 1, disciplineCode: 'ALL', priority: 'high', isMandatory: true },
                { taskName: 'Electrical Load Calculation', weightDefault: 30, sequenceOrder: 2, disciplineCode: 'ALL', priority: 'medium', isMandatory: false },
            ]
        },
        {
            taskName: 'Specifications & BOQ',
            weightDefault: 40,
            sequenceOrder: 2,
            disciplineCode: 'ALL',
            priority: 'medium',
            isMandatory: false,
            subtasks: [
                { taskName: 'Technical Specifications Document', weightDefault: 20, sequenceOrder: 1, disciplineCode: 'ALL', priority: 'high', isMandatory: true },
                { taskName: 'Bill of Quantities (BOQ) Draft', weightDefault: 20, sequenceOrder: 2, disciplineCode: 'ALL', priority: 'high', isMandatory: true }
            ]
        }
    ],
    'PC': [
        {
            taskName: 'Tender Documents Preparation',
            weightDefault: 50,
            sequenceOrder: 1,
            disciplineCode: 'ALL',
            priority: 'medium',
            isMandatory: false,
            subtasks: [
                { taskName: 'Contractor Pre-qualification', weightDefault: 20, sequenceOrder: 1, disciplineCode: 'ALL', priority: 'medium', isMandatory: false },
                { taskName: 'Tender Announcement', weightDefault: 30, sequenceOrder: 2, disciplineCode: 'ALL', priority: 'high', isMandatory: true },
            ]
        },
        {
            taskName: 'Contract Awarding',
            weightDefault: 50,
            sequenceOrder: 2,
            disciplineCode: 'ALL',
            priority: 'medium',
            isMandatory: false,
            subtasks: [
                { taskName: 'Bid Evaluation Report', weightDefault: 25, sequenceOrder: 1, disciplineCode: 'ALL', priority: 'high', isMandatory: true },
                { taskName: 'Work Order Sign-off', weightDefault: 25, sequenceOrder: 2, disciplineCode: 'ALL', priority: 'high', isMandatory: true }
            ]
        }
    ],
    'CN': [
        {
            taskName: 'Site Preparation & Setup',
            weightDefault: 20,
            sequenceOrder: 1,
            disciplineCode: 'ALL',
            priority: 'medium',
            isMandatory: false,
            subtasks: [
                { taskName: 'Mobilization & Fencing', weightDefault: 10, sequenceOrder: 1, disciplineCode: 'ALL', priority: 'medium', isMandatory: false },
                { taskName: 'Safety Signage Installation', weightDefault: 10, sequenceOrder: 2, disciplineCode: 'ALL', priority: 'high', isMandatory: true },
            ]
        },
        {
            taskName: 'Structural Concrete & Rebar Works',
            weightDefault: 50,
            sequenceOrder: 2,
            disciplineCode: 'ALL',
            priority: 'medium',
            isMandatory: false,
            subtasks: [
                { taskName: 'Column Concrete Pouring', weightDefault: 25, sequenceOrder: 1, disciplineCode: 'ALL', priority: 'high', isMandatory: true },
                { taskName: 'Floor Slab Casting', weightDefault: 25, sequenceOrder: 2, disciplineCode: 'ALL', priority: 'high', isMandatory: true }
            ]
        },
        {
            taskName: 'Architectural Finishing Works',
            weightDefault: 30,
            sequenceOrder: 3,
            disciplineCode: 'ALL',
            priority: 'medium',
            isMandatory: false,
            subtasks: [
                { taskName: 'Brick Wall Masonry', weightDefault: 15, sequenceOrder: 1, disciplineCode: 'ALL', priority: 'medium', isMandatory: true },
                { taskName: 'Interior Painting & Cladding', weightDefault: 15, sequenceOrder: 2, disciplineCode: 'ALL', priority: 'low', isMandatory: false }
            ]
        }
    ],
    'HO': [
        {
            taskName: 'Testing & Commissioning',
            weightDefault: 50,
            sequenceOrder: 1,
            disciplineCode: 'ALL',
            priority: 'medium',
            isMandatory: false,
            subtasks: [
                { taskName: 'MEP Systems Testing', weightDefault: 25, sequenceOrder: 1, disciplineCode: 'ALL', priority: 'high', isMandatory: true },
                { taskName: 'Punch List Generation', weightDefault: 25, sequenceOrder: 2, disciplineCode: 'ALL', priority: 'medium', isMandatory: false },
            ]
        },
        {
            taskName: 'Final Project Documentation',
            weightDefault: 50,
            sequenceOrder: 2,
            disciplineCode: 'ALL',
            priority: 'medium',
            isMandatory: false,
            subtasks: [
                { taskName: 'As-Built Drawings Submit', weightDefault: 30, sequenceOrder: 1, disciplineCode: 'ALL', priority: 'high', isMandatory: true },
                { taskName: 'Handover Minutes of Meeting', weightDefault: 20, sequenceOrder: 2, disciplineCode: 'ALL', priority: 'high', isMandatory: true }
            ]
        }
    ]
};

export default function StagesSettingsScreen() {
    const insets = useSafeAreaInsets();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';

    const bgColor = isDark ? '#000000' : '#F2F2F7';
    const cardBgColor = isDark ? '#1C1C1E' : '#FFFFFF';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6e6e73';
    const textInputBg = isDark ? '#2C2C2E' : '#F2F2F7';
    const tagBgColor = isDark ? 'rgba(118,118,128,0.24)' : 'rgba(118,118,128,0.12)';

    const [activeTab, setActiveTab] = useState<TabId>('stage-list');
    const [workspaceId, setWorkspaceId] = useState(DEFAULT_WORKSPACE_ID);
    const [isLoading, setIsLoading] = useState(true);

    // Master settings templates from database
    const [scopes, setScopes] = useState<ProjectTypeTemplate[]>([]);
    const [selectedScope, setSelectedScope] = useState<ProjectTypeTemplate | null>(null);
    const [stages, setStages] = useState<StageTemplate[]>([]);
    const [disciplines, setDisciplines] = useState<Discipline[]>([]);

    // Task Templates state
    const [activeStageCode, setActiveStageCode] = useState<string>('KO');
    const [taskTemplates, setTaskTemplates] = useState<StageTaskTemplate[]>([]);
    const [expandedGroupIds, setExpandedGroupIds] = useState<Record<string, boolean>>({});

    // Bottom Sheet Form Drawers
    const [isFormModalVisible, setIsFormModalVisible] = useState(false);
    const [sheetMode, setSheetMode] = useState<'stage' | 'task_group' | 'task'>('stage');
    const [editItem, setEditItem] = useState<any | null>(null);
    const [sheetStageId, setSheetStageId] = useState<string | null>(null);
    const [sheetParentId, setSheetParentId] = useState<string | null>(null);

    // Scope Stages local / floating changes tracking
    const [unsavedScopeStages, setUnsavedScopeStages] = useState<Record<string, boolean>>({});
    const [hasUnsavedScopeChanges, setHasUnsavedScopeChanges] = useState(false);
    const [isSavingScope, setIsSavingScope] = useState(false);
    const [scopeStageWeights, setScopeStageWeights] = useState<Record<string, number>>({});
    const [tempWeightText, setTempWeightText] = useState<Record<string, string>>({});

    // Dynamic header right and scope selector picker states
    const [isScrolled, setIsScrolled] = useState(false);
    const [isScopePickerVisible, setIsScopePickerVisible] = useState(false);
    const [isStagePickerVisible, setIsStagePickerVisible] = useState(false);

    // Scroll refs for pills auto-scrolling
    const scopeScrollRef = useRef<ScrollView>(null);
    const scopeLayouts = useRef<Record<string, { x: number; width: number }>>({});

    const stageScrollRef = useRef<ScrollView>(null);
    const stageLayouts = useRef<Record<string, { x: number; width: number }>>({});

    const tabScrollRef = useRef<ScrollView>(null);
    const tabLayouts = useRef<Record<string, { x: number; width: number }>>({});

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        if (selectedScope) {
            loadStagesForScope(selectedScope.projectTypeId);
        }
    }, [selectedScope]);

    useEffect(() => {
        if (activeTab === 'task-templates') {
            loadTaskTemplates();
        }
    }, [activeTab, activeStageCode, stages]);

    // Automatically select the first active stage if the currently selected activeStageCode is inactive/disabled
    useEffect(() => {
        const activeStages = stages.filter(s => s.isActive);
        if (activeStages.length > 0) {
            const isCurrentActive = activeStages.some(s => s.stageCode === activeStageCode);
            if (!isCurrentActive) {
                setActiveStageCode(activeStages[0].stageCode);
            }
        }
    }, [stages, activeStageCode]);

    // Automatically reset selected scope to DNB when leaving scope stages mapping
    useEffect(() => {
        if (activeTab === 'stage-list' || activeTab === 'task-templates') {
            const dnbScope = scopes.find(s => s.code === 'DNB') || scopes[0];
            if (dnbScope && selectedScope?.projectTypeId !== dnbScope.projectTypeId) {
                setSelectedScope(dnbScope);
            }
        }
    }, [activeTab, scopes]);

    const loadInitialData = async () => {
        setIsLoading(true);
        try {
            let wsId = await fetchDefaultWorkspaceId();
            if (!wsId) wsId = DEFAULT_WORKSPACE_ID;
            setWorkspaceId(wsId);

            const [scopesData, disciplinesData] = await Promise.all([
                fetchProjectTypes(wsId),
                fetchDisciplines(wsId)
            ]);

            setScopes(scopesData);
            setDisciplines(disciplinesData);

            // Set default scope DNB or first
            const defaultScope = scopesData.find(s => s.code === 'DNB') || scopesData[0];
            if (defaultScope) {
                setSelectedScope(defaultScope);
            }
        } catch (error) {
            console.error('Failed to load initial settings stages data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadStagesForScope = async (projTypeId: string) => {
        setIsLoading(true);
        try {
            const data = await fetchStageTemplates(workspaceId, projTypeId);
            // Sort by position
            const sortedStages = data.sort((a, b) => a.position - b.position);
            setStages(sortedStages);

            // Default active stage code for Task Templates
            const firstActiveStage = sortedStages.find(s => s.isActive);
            if (firstActiveStage) {
                setActiveStageCode(firstActiveStage.stageCode);
            } else if (sortedStages.length > 0) {
                setActiveStageCode(sortedStages[0].stageCode);
            }

            // Reset unsaved scope mappings
            setUnsavedScopeStages({});
            setHasUnsavedScopeChanges(false);

            // Load and normalize weights
            const activeStages = sortedStages.filter(s => s.isActive);
            const initialWeights: Record<string, number> = {};

            if (activeStages.length === 0) {
                sortedStages.forEach(s => {
                    initialWeights[s.id] = 0;
                });
            } else {
                const sumBaseWeights = activeStages.reduce((sum, s) => {
                    const base = s.weightDefault > 0 ? s.weightDefault : 10;
                    return sum + base;
                }, 0);

                sortedStages.forEach(s => {
                    if (s.isActive) {
                        const base = s.weightDefault > 0 ? s.weightDefault : 10;
                        initialWeights[s.id] = (base / sumBaseWeights) * 100;
                    } else {
                        initialWeights[s.id] = 0;
                    }
                });
            }
            setScopeStageWeights(initialWeights);
            setTempWeightText({});
        } catch (error) {
            console.error('Failed to load stages for scope:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadTaskTemplates = async () => {
        const currentStage = stages.find(s => s.stageCode === activeStageCode);
        if (!currentStage) return;

        try {
            const dbTemplates = await fetchStageTaskTemplates(currentStage.id);
            if (dbTemplates && dbTemplates.length > 0) {
                setTaskTemplates(dbTemplates);
            } else {
                // If DB has 0 task templates for this stage, generate from Mock fallback!
                const mockTemplates = MOCK_STAGE_TASKS[activeStageCode] || [];
                const formattedTemplates: StageTaskTemplate[] = [];

                let seq = 0;
                mockTemplates.forEach(group => {
                    seq++;
                    const groupId = `mock-group-${activeStageCode}-${seq}`;
                    formattedTemplates.push({
                        id: groupId,
                        stageId: currentStage.id,
                        taskName: group.taskName,
                        disciplineCode: group.disciplineCode,
                        weightDefault: group.weightDefault,
                        sequenceOrder: group.sequenceOrder,
                        isMandatory: group.isMandatory,
                        parentId: null,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    });

                    if (group.subtasks) {
                        group.subtasks.forEach(sub => {
                            formattedTemplates.push({
                                id: `mock-task-${activeStageCode}-${Math.random().toString(36).substring(2, 9)}`,
                                stageId: currentStage.id,
                                taskName: sub.taskName,
                                disciplineCode: sub.disciplineCode,
                                weightDefault: sub.weightDefault,
                                sequenceOrder: sub.sequenceOrder,
                                isMandatory: sub.isMandatory,
                                parentId: groupId,
                                createdAt: new Date().toISOString(),
                                updatedAt: new Date().toISOString()
                            });
                        });
                    }
                });

                setTaskTemplates(formattedTemplates);
            }
        } catch (error) {
            console.error('Failed to load task templates:', error);
        }
    };

    // Calculate sum of weights for active stages in Stage List
    const activeStages = stages.filter(s => s.isActive);
    const totalWeight = activeStages.reduce((sum, s) => sum + s.weightDefault, 0);
    const isWeightValid = Math.abs(totalWeight - 100) < 0.01;

    // Calculate sum of weights for root-level task groups in currently active Stage
    const parentGroups = taskTemplates.filter(t => t.parentId === null || t.parentId === undefined);
    const totalTaskWeight = parentGroups.reduce((sum, g) => sum + g.weightDefault, 0);
    const isTaskWeightValid = Math.abs(totalTaskWeight - 100) < 0.01;

    // Calculate sum of weights for active stages in currently selected Scope
    const totalScopeWeight = stages.reduce((sum, stage) => {
        const isAct = unsavedScopeStages[stage.id] !== undefined ? unsavedScopeStages[stage.id] : stage.isActive;
        if (!isAct) return sum;
        const w = scopeStageWeights[stage.id] !== undefined ? scopeStageWeights[stage.id] : stage.weightDefault;
        return sum + w;
    }, 0);

    // Handle stage active toggles locally
    const handleToggleStageActive = async (stage: StageTemplate, currentVal: boolean) => {
        const nextVal = !currentVal;

        // Calculate next total weight
        const activeStagesAfterToggle = stages.map(s => s.id === stage.id ? { ...s, isActive: nextVal } : s).filter(s => s.isActive);
        const nextTotal = activeStagesAfterToggle.reduce((sum, s) => sum + s.weightDefault, 0);

        if (Math.abs(nextTotal - 100) > 0.01) {
            const proceed = await new Promise<boolean>((resolve) => {
                Alert.alert(
                    'Change Stage Status',
                    `Changing this stage status will make the total default weight ${nextTotal.toFixed(1)}% (not 100%).\n\nChange anyway?`,
                    [
                        { text: 'Cancel', onPress: () => resolve(false), style: 'cancel' },
                        { text: 'Yes, Change', onPress: () => resolve(true) }
                    ],
                    { cancelable: false }
                );
            });
            if (!proceed) return;
        }

        // Update local stages immediately for smooth UI feedback
        setStages(prev => prev.map(s => s.id === stage.id ? { ...s, isActive: nextVal } : s));

        try {
            await updateStageTemplate(stage.id, workspaceId, { isActive: nextVal });
        } catch (err) {
            // Revert on failure
            setStages(prev => prev.map(s => s.id === stage.id ? { ...s, isActive: currentVal } : s));
            Alert.alert('Error', 'Failed to update stage active status in database.');
        }
    };

    // Scope stages mapper toggles (with unsaved changes tracking)
    const handleToggleScopeStage = (stage: StageTemplate, currentVal: boolean) => {
        const nextVal = !currentVal;

        // Update the unsaved active stages state
        const updatedActiveStates = { ...unsavedScopeStages, [stage.id]: nextVal };
        setUnsavedScopeStages(updatedActiveStates);

        // Recalculate weights based on the new set of active stages
        const activeStages = stages.filter(s => {
            const isAct = updatedActiveStates[s.id] !== undefined ? updatedActiveStates[s.id] : s.isActive;
            return isAct;
        });

        const nextWeights = { ...scopeStageWeights };

        if (activeStages.length === 0) {
            stages.forEach(s => {
                nextWeights[s.id] = 0;
            });
        } else {
            const sumBaseWeights = activeStages.reduce((sum, s) => {
                const base = s.weightDefault > 0 ? s.weightDefault : 10;
                return sum + base;
            }, 0);

            stages.forEach(s => {
                const isAct = updatedActiveStates[s.id] !== undefined ? updatedActiveStates[s.id] : s.isActive;
                if (isAct) {
                    const base = s.weightDefault > 0 ? s.weightDefault : 10;
                    nextWeights[s.id] = (base / sumBaseWeights) * 100;
                } else {
                    nextWeights[s.id] = 0;
                }
            });
        }

        setScopeStageWeights(nextWeights);

        // Determine if there are actual changes compared to original database values
        const actualChanges = stages.filter(s => {
            const isAct = updatedActiveStates[s.id] !== undefined ? updatedActiveStates[s.id] : s.isActive;
            const origWeight = s.weightDefault;
            const currentWeight = nextWeights[s.id] !== undefined ? nextWeights[s.id] : origWeight;

            const isStateChanged = isAct !== s.isActive;
            const isWeightChanged = Math.abs(currentWeight - origWeight) > 0.01;
            return isStateChanged || isWeightChanged;
        });

        setHasUnsavedScopeChanges(actualChanges.length > 0);
    };

    const handleWeightTextChange = (stageId: string, text: string) => {
        setTempWeightText(prev => ({ ...prev, [stageId]: text }));
    };

    const handleWeightBlur = (stageId: string) => {
        const text = tempWeightText[stageId];
        if (text === undefined) return;

        let parsed = parseFloat(text.replace(',', '.'));
        if (isNaN(parsed) || parsed < 0) {
            parsed = 0;
        } else if (parsed > 100) {
            parsed = 100;
        }

        redistributeWeightsAfterManualEdit(stageId, parsed);
    };

    const redistributeWeightsAfterManualEdit = (editedStageId: string, targetWeight: number) => {
        // Get all active stages
        const activeStageIds = stages.filter(s => {
            const isAct = unsavedScopeStages[s.id] !== undefined ? unsavedScopeStages[s.id] : s.isActive;
            return isAct;
        }).map(s => s.id);

        if (activeStageIds.length === 0) return;

        // If only one stage is active, it must be 100%
        if (activeStageIds.length === 1) {
            setScopeStageWeights({ [activeStageIds[0]]: 100 });
            setTempWeightText({});
            setHasUnsavedScopeChanges(true);
            return;
        }

        const remainingWeight = Math.max(0, 100 - targetWeight);

        // Sum of base weights of OTHER active stages
        const otherActiveIds = activeStageIds.filter(id => id !== editedStageId);
        const sumOtherBaseWeights = otherActiveIds.reduce((sum, id) => {
            const s = stages.find(st => st.id === id);
            const base = s && s.weightDefault > 0 ? s.weightDefault : 10;
            return sum + base;
        }, 0);

        const nextWeights = { ...scopeStageWeights };
        nextWeights[editedStageId] = targetWeight;

        otherActiveIds.forEach(id => {
            const s = stages.find(st => st.id === id);
            const base = s && s.weightDefault > 0 ? s.weightDefault : 10;
            if (sumOtherBaseWeights > 0) {
                nextWeights[id] = remainingWeight * (base / sumOtherBaseWeights);
            } else {
                nextWeights[id] = remainingWeight / otherActiveIds.length;
            }
        });

        stages.forEach(s => {
            const isAct = activeStageIds.includes(s.id);
            if (!isAct) {
                nextWeights[s.id] = 0;
            }
        });

        setScopeStageWeights(nextWeights);
        setTempWeightText({});
        setHasUnsavedScopeChanges(true);
    };

    const handleSaveScopeStages = async () => {
        if (!selectedScope) return;

        // Check if totalScopeWeight is 100%
        if (Math.abs(totalScopeWeight - 100) > 0.01) {
            const proceed = await new Promise<boolean>((resolve) => {
                Alert.alert(
                    'Total Weight Not 100%',
                    `The current total weight for this scope is ${totalScopeWeight.toFixed(1)}% (not 100%).\n\nSave anyway?`,
                    [
                        { text: 'Cancel', onPress: () => resolve(false), style: 'cancel' },
                        { text: 'Save', onPress: () => resolve(true) }
                    ],
                    { cancelable: false }
                );
            });
            if (!proceed) return;
        }

        setIsSavingScope(true);
        try {
            const promises = stages.map(async (stage) => {
                const isActive = unsavedScopeStages[stage.id] !== undefined ? unsavedScopeStages[stage.id] : stage.isActive;
                const weight = scopeStageWeights[stage.id] !== undefined ? scopeStageWeights[stage.id] : stage.weightDefault;
                await updateStageTemplate(stage.id, workspaceId, { isActive, weightDefault: weight });
            });
            await Promise.all(promises);

            Alert.alert('Success', 'Changes saved successfully!');
            setUnsavedScopeStages({});
            setHasUnsavedScopeChanges(false);
            await loadStagesForScope(selectedScope.projectTypeId);
        } catch (err) {
            Alert.alert('Error', 'Failed to save scope stage changes.');
            console.error(err);
        } finally {
            setIsSavingScope(false);
        }
    };

    const handleResetScopeStages = () => {
        setUnsavedScopeStages({});
        const resetWeights: Record<string, number> = {};
        stages.forEach(s => {
            resetWeights[s.id] = s.weightDefault;
        });
        setScopeStageWeights(resetWeights);
        setTempWeightText({});
        setHasUnsavedScopeChanges(false);
    };

    // Open forms drawers
    const openAddStageModal = () => {
        setSheetMode('stage');
        setEditItem(null);
        setSheetStageId(null);
        setSheetParentId(null);
        setIsFormModalVisible(true);
    };

    const openEditStageModal = (stage: StageTemplate) => {
        setSheetMode('stage');
        setEditItem({
            id: stage.id,
            displayCode: stage.displayCode,
            stageCode: stage.stageCode,
            stageName: stage.stageName,
            stageNameId: stage.stageNameId,
            category: stage.category,
            weightDefault: stage.weightDefault,
            position: stage.position,
            isActive: stage.isActive,
            stageId: stage.id
        });
        setSheetStageId(null);
        setSheetParentId(null);
        setIsFormModalVisible(true);
    };

    const openAddTaskGroupModal = () => {
        const currentStage = stages.find(s => s.stageCode === activeStageCode);
        if (!currentStage) return;

        setSheetMode('task_group');
        setEditItem(null);
        setSheetStageId(currentStage.id);
        setSheetParentId(null);
        setIsFormModalVisible(true);
    };

    const openEditTaskGroupModal = (group: StageTaskTemplate) => {
        setSheetMode('task_group');
        setEditItem(group);
        setSheetStageId(group.stageId);
        setSheetParentId(null);
        setIsFormModalVisible(true);
    };

    const openAddTaskModal = (groupId: string) => {
        const currentStage = stages.find(s => s.stageCode === activeStageCode);
        if (!currentStage) return;

        setSheetMode('task');
        setEditItem(null);
        setSheetStageId(currentStage.id);
        setSheetParentId(groupId);
        setIsFormModalVisible(true);
    };

    const openEditTaskModal = (task: StageTaskTemplate) => {
        setSheetMode('task');
        // Retrieve simulated/mock priority if it is mock
        setEditItem({
            ...task,
            priority: (task as any).priority || 'medium'
        });
        setSheetStageId(task.stageId);
        setSheetParentId(task.parentId || null);
        setIsFormModalVisible(true);
    };

    // Handle sheet saves (inserts/updates in Supabase)
    const handleSheetSave = async (payload: any) => {
        if (!selectedScope) return false;
        try {
            if (sheetMode === 'stage') {
                const activeStages = stages.filter(s => s.isActive);
                let nextTotal = 0;
                if (editItem) {
                    const otherStagesWeight = activeStages.filter(s => s.id !== editItem.id).reduce((sum, s) => sum + s.weightDefault, 0);
                    nextTotal = otherStagesWeight + (payload.weightDefault || 0);
                } else {
                    const currentTotal = activeStages.reduce((sum, s) => sum + s.weightDefault, 0);
                    nextTotal = currentTotal + (payload.weightDefault || 0);
                }

                if (Math.abs(nextTotal - 100) > 0.01) {
                    const proceed = await new Promise<boolean>((resolve) => {
                        Alert.alert(
                            'Save Stage Changes',
                            `This change will make the total default weight ${nextTotal.toFixed(1)}% (not 100%).\n\nSave anyway?`,
                            [
                                { text: 'Cancel', onPress: () => resolve(false), style: 'cancel' },
                                { text: 'Save', onPress: () => resolve(true) }
                            ],
                            { cancelable: false }
                        );
                    });
                    if (!proceed) {
                        return false;
                    }
                }

                if (editItem) {
                    const success = await updateStageTemplate(editItem.id, workspaceId, payload);
                    if (success) {
                        await loadStagesForScope(selectedScope.projectTypeId);
                        return true;
                    }
                } else {
                    const newStage = await createStageTemplate(workspaceId, selectedScope.projectTypeId, {
                        stageCode: payload.stageCode,
                        stageName: payload.stageName,
                        stageNameId: payload.stageNameId,
                        displayCode: payload.displayCode,
                        position: payload.position,
                        weightDefault: payload.weightDefault,
                        isActive: true,
                        category: payload.category,
                    });
                    if (newStage) {
                        await loadStagesForScope(selectedScope.projectTypeId);
                        return true;
                    }
                }
            } else {
                // Task Templates Add/Edit
                // Note: If task_templates in DB has 0 rows, we can start adding them to DB!
                // If it is an EDIT on a mock item (id starts with 'mock-'), we can insert it as a new DB row!
                const currentStage = stages.find(s => s.stageCode === activeStageCode);
                if (!currentStage) return false;

                if (editItem) {
                    const isMock = editItem.id.startsWith('mock-');
                    if (isMock) {
                        // Insert mock item into DB since it's now customized
                        const dbObj = await createStageTaskTemplate({
                            stageId: currentStage.id,
                            taskName: payload.taskName,
                            disciplineCode: payload.disciplineCode || 'ALL',
                            weightDefault: payload.weightDefault,
                            sequenceOrder: payload.sequenceOrder,
                            isMandatory: payload.isMandatory || false,
                            parentId: payload.parentId && payload.parentId.startsWith('mock-') ? null : payload.parentId, // handles parent mapping
                            sectionId: null
                        });
                        if (dbObj) {
                            await loadTaskTemplates();
                            return true;
                        }
                    } else {
                        // Standard database update
                        const success = await updateStageTaskTemplate(editItem.id, {
                            taskName: payload.taskName,
                            weightDefault: payload.weightDefault,
                            disciplineCode: payload.disciplineCode || 'ALL',
                            sequenceOrder: payload.sequenceOrder,
                            isMandatory: payload.isMandatory || false,
                        });
                        if (success) {
                            await loadTaskTemplates();
                            return true;
                        }
                    }
                } else {
                    // Create new task template in database
                    // If the parent is a mock group, we need to save the mock group to DB first so it has a valid DB UUID, 
                    // but for simplicity, we insert this task template as root or map it.
                    const dbObj = await createStageTaskTemplate({
                        stageId: currentStage.id,
                        taskName: payload.taskName,
                        disciplineCode: payload.disciplineCode || 'ALL',
                        weightDefault: payload.weightDefault,
                        sequenceOrder: payload.sequenceOrder,
                        isMandatory: payload.isMandatory || false,
                        parentId: payload.parentId && payload.parentId.startsWith('mock-') ? null : payload.parentId,
                        sectionId: null
                    });
                    if (dbObj) {
                        await loadTaskTemplates();
                        return true;
                    }
                }
            }
            return false;
        } catch (err) {
            console.error('Failed to save stage/task template:', err);
            Alert.alert('Error', 'An error occurred during save.');
            return false;
        }
    };

    // Handle deletions
    const handleDeleteItem = (id: string, name: string) => {
        if (!selectedScope) return;
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
                            if (sheetMode === 'stage') {
                                const isMock = id.startsWith('mock-');
                                if (isMock) {
                                    setStages(prev => prev.filter(s => s.id !== id));
                                } else {
                                    const success = await deleteStageTemplate(id, workspaceId);
                                    if (success) {
                                        await loadStagesForScope(selectedScope.projectTypeId);
                                    } else {
                                        Alert.alert('Error', 'Failed to delete stage.');
                                    }
                                }
                            } else {
                                const isMock = id.startsWith('mock-');
                                if (isMock) {
                                    setTaskTemplates(prev => prev.filter(t => t.id !== id && t.parentId !== id));
                                } else {
                                    const success = await deleteStageTaskTemplate(id);
                                    if (success) {
                                        await loadTaskTemplates();
                                    } else {
                                        Alert.alert('Error', 'Failed to delete task template.');
                                    }
                                }
                            }
                        } catch (err) {
                            Alert.alert('Error', 'Failed to delete the template item.');
                            console.error(err);
                        }
                    }
                }
            ]
        );
    };

    // Reset default stages logic
    const handleResetStagesWeight = async () => {
        if (!selectedScope) return;
        Alert.alert(
            'Confirm Reset',
            'Do you want to reset default stage weights? (Kickoff: 5%, SD: 12.5%, DD: 17.5%, ED: 22.5%, Procurement: 12.5%, Construction: 25%, Handover: 5%)',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reset',
                    onPress: async () => {
                        setIsLoading(true);
                        try {
                            const defaultWeights: Record<string, number> = {
                                'KO': 5, 'SD': 12.5, 'DD': 17.5, 'ED': 22.5, 'PC': 12.5, 'CN': 25, 'HO': 5
                            };

                            const promises = stages.map(async (stg) => {
                                const dw = defaultWeights[stg.stageCode];
                                if (dw !== undefined) {
                                    await updateStageTemplate(stg.id, workspaceId, { weightDefault: dw, isActive: true });
                                }
                            });
                            await Promise.all(promises);
                            await loadStagesForScope(selectedScope.projectTypeId);
                        } catch (err) {
                            Alert.alert('Error', 'Failed to reset stage weights.');
                        } finally {
                            setIsLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const handleResetTaskWeights = async () => {
        const currentStage = stages.find(s => s.stageCode === activeStageCode);
        if (!currentStage) return;

        const parentGroups = taskTemplates.filter(t => t.parentId === null || t.parentId === undefined);
        if (parentGroups.length === 0) {
            Alert.alert('No Task Groups', 'There are no task groups to reset.');
            return;
        }

        Alert.alert(
            'Confirm Reset',
            `Do you want to reset task group weights for stage "${currentStage.stageName}"? This will distribute weights equally among the ${parentGroups.length} groups (${(100 / parentGroups.length).toFixed(1)}% each).`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reset',
                    onPress: async () => {
                        setIsLoading(true);
                        try {
                            const equalWeight = 100 / parentGroups.length;
                            const promises = parentGroups.map(async (group) => {
                                const isMock = group.id.startsWith('mock-');
                                if (!isMock) {
                                    await updateStageTaskTemplate(group.id, {
                                        taskName: group.taskName,
                                        weightDefault: equalWeight,
                                        disciplineCode: group.disciplineCode,
                                        sequenceOrder: group.sequenceOrder,
                                        isMandatory: group.isMandatory
                                    });
                                }
                            });
                            
                            const hasMock = parentGroups.some(g => g.id.startsWith('mock-'));
                            if (hasMock) {
                                setTaskTemplates(prev => prev.map(t => {
                                    if (t.parentId === null || t.parentId === undefined) {
                                        return { ...t, weightDefault: equalWeight };
                                    }
                                    return t;
                                }));
                            } else {
                                await Promise.all(promises);
                                await loadTaskTemplates();
                            }
                            Alert.alert('Success', 'Task group weights reset successfully.');
                        } catch (err) {
                            Alert.alert('Error', 'Failed to reset task weights.');
                            console.error(err);
                        } finally {
                            setIsLoading(false);
                        }
                    }
                }
            ]
        );
    };

    // Header SwiftUI Add Button or fallback
    const renderAddButton = () => {
        const addLabel = activeTab === 'stage-list' ? 'Add Stage' : 'Add Group';
        const addFn = activeTab === 'stage-list' ? openAddStageModal : openAddTaskGroupModal;

        if (Platform.OS === 'ios' && SwiftUIHost && SwiftUIButton && SwiftUIHStack && SwiftUIText && SwiftUIImage && swiftModifiers) {
            return (
                <SwiftUIHost style={{ height: 32, width: 140 }} colorScheme={isDark ? 'dark' : 'light'}>
                    <SwiftUIButton
                        onPress={addFn}
                        modifiers={[
                            swiftModifiers.buttonStyle('plain'),
                            swiftModifiers.frame({ height: 32 })
                        ]}
                    >
                        <SwiftUIHStack spacing={4} alignment="center">
                            <SwiftUIImage systemName="plus.circle.fill" size={16} color="#FF3B30" />
                            <SwiftUIText size={14} weight="semibold" color="#FF3B30">
                                {addLabel}
                            </SwiftUIText>
                        </SwiftUIHStack>
                    </SwiftUIButton>
                </SwiftUIHost>
            );
        }

        return (
            <TouchableOpacity style={styles.addButton} onPress={addFn}>
                <Ionicons name="add-circle" size={24} color="#FF3B30" />
                <Text style={styles.addButtonText}>{addLabel}</Text>
            </TouchableOpacity>
        );
    };

    const renderScopeSelector = () => {
        if (activeTab !== 'scope-stages') return null;
        return (
            <View style={styles.scopeSelectorWrapper}>
                <Text style={[styles.scopeSelectorLabel, { color: subtextColor }]}>Selected Scope</Text>
                <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setIsScopePickerVisible(true)}
                    style={[
                        styles.scopeSelectorTrigger,
                        {
                            backgroundColor: isDark ? 'rgba(255, 59, 48, 0.08)' : 'rgba(255, 59, 48, 0.04)',
                            borderColor: isDark ? 'rgba(255, 59, 48, 0.4)' : 'rgba(255, 59, 48, 0.25)',
                            borderWidth: 1.5,
                        }
                    ]}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                        <View style={[styles.scopeIconBg, { backgroundColor: '#FF3B30' }]}>
                            <Ionicons name="layers" size={16} color="#FFFFFF" />
                        </View>
                        <View style={{ flex: 1, gap: 2 }}>
                            <Text style={[styles.scopeSelectorText, { color: textColor }]}>
                                {selectedScope ? selectedScope.code : 'Select Scope'}
                            </Text>
                            {selectedScope && (
                                <Text style={{ fontSize: 12, color: subtextColor }} numberOfLines={1}>
                                    {selectedScope.name}
                                </Text>
                            )}
                        </View>
                    </View>
                    <Ionicons name="chevron-down" size={18} color="#FF3B30" />
                </TouchableOpacity>
            </View>
        );
    };

    const renderStageSelector = () => {
        if (activeTab !== 'task-templates') return null;
        const currentStage = stages.find(s => s.stageCode === activeStageCode);
        const activeStages = stages.filter(s => s.isActive);
        
        if (activeStages.length === 0) return null;

        return (
            <View style={[styles.scopeSelectorWrapper, { marginBottom: 16 }]}>
                <Text style={[styles.scopeSelectorLabel, { color: subtextColor }]}>Selected Stage</Text>
                <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setIsStagePickerVisible(true)}
                    style={[
                        styles.scopeSelectorTrigger,
                        {
                            backgroundColor: isDark ? 'rgba(255, 59, 48, 0.08)' : 'rgba(255, 59, 48, 0.04)',
                            borderColor: isDark ? 'rgba(255, 59, 48, 0.4)' : 'rgba(255, 59, 48, 0.25)',
                            borderWidth: 1.5,
                        }
                    ]}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                        <View style={[styles.scopeIconBg, { backgroundColor: '#FF3B30' }]}>
                            <Ionicons name="git-branch" size={16} color="#FFFFFF" />
                        </View>
                        <View style={{ flex: 1, gap: 2 }}>
                            <Text style={[styles.scopeSelectorText, { color: textColor }]}>
                                {currentStage ? (currentStage.displayCode || currentStage.stageCode) : 'Select Stage'}
                            </Text>
                            {currentStage && (
                                <Text style={{ fontSize: 12, color: subtextColor }} numberOfLines={1}>
                                    {currentStage.stageName}
                                </Text>
                            )}
                        </View>
                    </View>
                    <Ionicons name="chevron-down" size={18} color="#FF3B30" />
                </TouchableOpacity>
            </View>
        );
    };

    // Render Stage List cards
    const renderStageListTab = () => {
        return (
            <View style={styles.tabContentContainer}>
                {!isWeightValid && (
                    <Animated.View 
                        entering={FadeInDown.duration(300)}
                        style={[
                            styles.weightWarningBanner,
                            { 
                                backgroundColor: isDark ? 'rgba(255, 149, 0, 0.15)' : 'rgba(255, 149, 0, 0.08)',
                                borderColor: isDark ? 'rgba(255, 149, 0, 0.3)' : 'rgba(255, 149, 0, 0.2)'
                            }
                        ]}
                    >
                        <Ionicons name="warning-outline" size={20} color="#FF9500" style={{ marginRight: 10 }} />
                        <View style={{ flex: 1, gap: 2 }}>
                            <Text style={[styles.weightWarningText, { color: textColor }]}>
                                Reset default weights because it is not full 100%
                            </Text>
                            <Text style={[styles.weightWarningSubText, { color: subtextColor }]}>
                                Current total: <Text style={{ fontWeight: 'bold', color: '#FF9500' }}>{totalWeight.toFixed(1)}%</Text> (must be 100%)
                            </Text>
                        </View>
                        <TouchableOpacity 
                            style={styles.weightWarningActionBtn}
                            onPress={handleResetStagesWeight}
                        >
                            <Text style={styles.weightWarningActionBtnText}>Reset</Text>
                        </TouchableOpacity>
                    </Animated.View>
                )}
                {stages.length === 0 ? (
                    <Text style={[styles.emptyText, { color: subtextColor }]}>No stages configured for this scope.</Text>
                ) : (
                    stages.map((stage, idx) => {
                        const colors = CATEGORY_COLORS[stage.category || ''] || DEFAULT_CATEGORY_COLORS;
                        return (
                            <TouchableOpacity
                                key={stage.id}
                                activeOpacity={0.7}
                                onPress={() => openEditStageModal(stage)}
                            >
                                <Animated.View
                                    entering={FadeInDown.delay(idx * 40).duration(200)}
                                    style={[styles.card, { backgroundColor: cardBgColor }]}
                                >
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'stretch' }}>
                                        {/* Left Column: Badges and Titles */}
                                        <View style={{ flex: 1, gap: 6 }}>
                                            {/* Badges Row */}
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                <View style={styles.codeBadge}>
                                                    <Text style={styles.codeBadgeText}>{stage.displayCode || stage.stageCode}</Text>
                                                </View>
                                                {stage.category ? (
                                                    <View style={[styles.categoryPill, { backgroundColor: colors.bg, borderColor: colors.text + '33' }]}>
                                                        <Text style={[styles.categoryText, { color: colors.text }]}>{stage.category.toUpperCase()}</Text>
                                                    </View>
                                                ) : null}
                                            </View>

                                            {/* Title & Subtitle */}
                                            <View style={{ gap: 2 }}>
                                                <Text style={[styles.cardTitle, { color: textColor }]} numberOfLines={1}>
                                                    {stage.stageName}
                                                </Text>
                                                <Text style={[styles.cardSubTitle, { color: subtextColor }]}>
                                                    {stage.stageNameId || stage.stageName}
                                                </Text>
                                            </View>
                                        </View>

                                        {/* Right Column: Weight, Active Toggle */}
                                        <View style={{ alignItems: 'flex-end', justifyContent: 'center', gap: 8, paddingLeft: 12 }}>
                                            <Text style={[styles.weightText, { color: textColor }]}>
                                                {stage.weightDefault.toFixed(1)}%
                                            </Text>

                                            {/* Active Switch */}
                                            <Switch
                                                value={stage.isActive}
                                                onValueChange={() => handleToggleStageActive(stage, stage.isActive)}
                                                trackColor={{ false: '#767680', true: '#34C759' }}
                                                thumbColor={Platform.OS === 'ios' ? undefined : '#FFFFFF'}
                                                style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }], margin: -4 }}
                                            />
                                        </View>
                                    </View>
                                </Animated.View>
                            </TouchableOpacity>
                        );
                    })
                )}
            </View>
        );
    };

    // Render Scope Stages tab
    const renderScopeStagesTab = () => {
        return (
            <View style={styles.tabContentContainer}>
                {stages.length === 0 ? (
                    <Text style={[styles.emptyText, { color: subtextColor }]}>No stages configured.</Text>
                ) : (
                    stages.map((stage, idx) => {
                        const isCurrentlyActive = unsavedScopeStages[stage.id] !== undefined
                            ? unsavedScopeStages[stage.id]
                            : stage.isActive;
                        const colors = CATEGORY_COLORS[stage.category || ''] || DEFAULT_CATEGORY_COLORS;

                        return (
                            <Animated.View
                                key={stage.id}
                                entering={FadeInDown.delay(idx * 40).duration(200)}
                                style={[styles.card, { backgroundColor: cardBgColor }]}
                            >
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'stretch' }}>
                                    {/* Left Column: Badges and Titles */}
                                    <View style={{ flex: 1, gap: 6 }}>
                                        {/* Badges Row */}
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <View style={styles.codeBadge}>
                                                <Text style={styles.codeBadgeText}>{stage.displayCode || stage.stageCode}</Text>
                                            </View>
                                            {stage.category ? (
                                                <View style={[styles.categoryPill, { backgroundColor: colors.bg, borderColor: colors.text + '33' }]}>
                                                    <Text style={[styles.categoryText, { color: colors.text }]}>{stage.category.toUpperCase()}</Text>
                                                </View>
                                            ) : null}
                                        </View>

                                        {/* Title & Subtitle */}
                                        <View style={{ gap: 2 }}>
                                            <Text style={[styles.cardTitle, { color: textColor }]} numberOfLines={1}>
                                                {stage.stageName}
                                            </Text>
                                            <Text style={[styles.cardSubTitle, { color: subtextColor }]}>
                                                {stage.stageNameId || stage.stageName}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Right Column: Weight and Include in Scope Toggle */}
                                    <View style={{ alignItems: 'flex-end', justifyContent: 'center', gap: 8, paddingLeft: 12 }}>
                                        <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                                            {isCurrentlyActive ? (
                                                <View style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: isDark ? '#48484A' : '#C7C7CC', paddingBottom: 2 }}>
                                                    <TextInput
                                                        style={{
                                                            fontSize: 14,
                                                            fontWeight: '700',
                                                            color: textColor,
                                                            textAlign: 'right',
                                                            minWidth: 40,
                                                            padding: 0,
                                                        }}
                                                        value={
                                                            tempWeightText[stage.id] !== undefined
                                                                ? tempWeightText[stage.id]
                                                                : (scopeStageWeights[stage.id] !== undefined
                                                                    ? scopeStageWeights[stage.id].toFixed(1)
                                                                    : stage.weightDefault.toFixed(1))
                                                        }
                                                        onChangeText={(text) => handleWeightTextChange(stage.id, text)}
                                                        onBlur={() => handleWeightBlur(stage.id)}
                                                        keyboardType="decimal-pad"
                                                        selectTextOnFocus
                                                    />
                                                    <Text style={{ fontSize: 14, fontWeight: '700', color: textColor }}>%</Text>
                                                </View>
                                            ) : (
                                                <Text style={[styles.weightText, { color: subtextColor, opacity: 0.5 }]}>
                                                    0.0%
                                                </Text>
                                            )}
                                        </View>

                                        <Switch
                                            value={isCurrentlyActive}
                                            onValueChange={() => handleToggleScopeStage(stage, isCurrentlyActive)}
                                            trackColor={{ false: '#767680', true: '#34C759' }}
                                            thumbColor={Platform.OS === 'ios' ? undefined : '#FFFFFF'}
                                            style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }], margin: -4 }}
                                        />
                                    </View>
                                </View>
                            </Animated.View>
                        );
                    })
                )}
            </View>
        );
    };

    // Render Task Templates tab
    const renderTaskTemplatesTab = () => {
        const activeStages = stages.filter(s => s.isActive);
        if (activeStages.length === 0) {
            return (
                <View style={styles.tabContentContainer}>
                    <Text style={[styles.emptyText, { color: subtextColor, textAlign: 'center', marginTop: 20 }]}>
                        No active stages for this scope. Please activate at least one stage in the Stage List or Scope Stages tab.
                    </Text>
                </View>
            );
        }

        // Group task templates (parentId is null)
        const parentGroups = taskTemplates.filter(t => t.parentId === null || t.parentId === undefined);

        return (
            <View style={styles.tabContentContainer}>
                {!isTaskWeightValid && parentGroups.length > 0 && (
                    <Animated.View 
                        entering={FadeInDown.duration(300)}
                        style={[
                            styles.weightWarningBanner,
                            { 
                                backgroundColor: isDark ? 'rgba(255, 149, 0, 0.15)' : 'rgba(255, 149, 0, 0.08)',
                                borderColor: isDark ? 'rgba(255, 149, 0, 0.3)' : 'rgba(255, 149, 0, 0.2)'
                            }
                        ]}
                    >
                        <Ionicons name="warning-outline" size={20} color="#FF9500" style={{ marginRight: 10 }} />
                        <View style={{ flex: 1, gap: 2 }}>
                            <Text style={[styles.weightWarningText, { color: textColor }]}>
                                Reset default weights because it is not full 100%
                            </Text>
                            <Text style={[styles.weightWarningSubText, { color: subtextColor }]}>
                                Current total: <Text style={{ fontWeight: 'bold', color: '#FF9500' }}>{totalTaskWeight.toFixed(1)}%</Text> (must be 100%)
                            </Text>
                        </View>
                        <TouchableOpacity 
                            style={styles.weightWarningActionBtn}
                            onPress={handleResetTaskWeights}
                        >
                            <Text style={styles.weightWarningActionBtnText}>Reset</Text>
                        </TouchableOpacity>
                    </Animated.View>
                )}
                {parentGroups.length === 0 ? (
                    <Text style={[styles.emptyText, { color: subtextColor }]}>No task templates defined. Tap "Add Group" to create one.</Text>
                ) : (
                    parentGroups.map((group, idx) => {
                        const isExpanded = !!expandedGroupIds[group.id];
                        const children = taskTemplates.filter(t => t.parentId === group.id);

                        // Calculate total weight of this group from its children
                        const calculatedGroupWeight = children.reduce((sum, c) => sum + c.weightDefault, 0);

                        return (
                            <Animated.View
                                key={group.id}
                                entering={FadeInDown.delay(idx * 40).duration(200)}
                                style={[styles.card, { backgroundColor: cardBgColor, padding: 0 }]}
                            >
                                {/* Accordion Header */}
                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    onPress={() => setExpandedGroupIds(prev => ({ ...prev, [group.id]: !isExpanded }))}
                                    style={styles.accordionHeader}
                                >
                                    <View style={styles.accordionLeft}>
                                        {/* Colored circle index */}
                                        <View style={[styles.indexCircle, { backgroundColor: '#FF3B30' }]}>
                                            <Text style={styles.indexCircleText}>{String(idx + 1).padStart(2, '0')}</Text>
                                        </View>
                                        <Text style={[styles.groupTitle, { color: textColor }]}>{group.taskName}</Text>
                                    </View>

                                    <View style={styles.accordionRight}>
                                        <Text style={[styles.groupWeight, { color: subtextColor }]}>
                                            {calculatedGroupWeight > 0 ? calculatedGroupWeight.toFixed(2) : group.weightDefault.toFixed(2)}%
                                        </Text>

                                        <TouchableOpacity
                                            onPress={() => openEditTaskGroupModal(group)}
                                            style={styles.headerEditBtn}
                                        >
                                            <Ionicons name="pencil-outline" size={16} color="#8E8E93" />
                                        </TouchableOpacity>

                                        <Ionicons
                                            name={isExpanded ? 'chevron-up' : 'chevron-down'}
                                            size={18}
                                            color={subtextColor}
                                        />
                                    </View>
                                </TouchableOpacity>

                                {/* Accordion Expanded Content */}
                                {isExpanded && (
                                    <View style={styles.accordionBody}>
                                        {children.length === 0 ? (
                                            <Text style={[styles.emptySubText, { color: subtextColor }]}>No deliverables. Tap "Add Deliverable Task" below.</Text>
                                        ) : (
                                            <View style={styles.taskMiniCardsContainer}>
                                                {children.map((child, cIdx) => {
                                                    const taskCode = `${String(idx + 1).padStart(2, '0')}-${String(cIdx + 1).padStart(2, '0')}`;

                                                    // Priority styles
                                                    const prio = ((child as any).priority || 'medium').toLowerCase();
                                                    const prioColors = (() => {
                                                        switch (prio) {
                                                            case 'low': return { bg: 'rgba(142, 142, 147, 0.12)', text: '#8E8E93' };
                                                            case 'high': return { bg: 'rgba(255, 159, 10, 0.12)', text: '#FF9F0A' };
                                                            case 'urgent': return { bg: 'rgba(255, 59, 48, 0.12)', text: '#FF3B30' };
                                                            default: return { bg: 'rgba(10, 132, 255, 0.12)', text: '#0A84FF' }; // medium
                                                        }
                                                    })();

                                                    return (
                                                        <View
                                                            key={child.id}
                                                            style={[
                                                                styles.taskMiniCard,
                                                                { backgroundColor: isDark ? '#2C2C2E' : '#F6F6F6' }
                                                            ]}
                                                        >
                                                            {/* Top Row: Code and Badges & Weight */}
                                                            <View style={styles.taskMiniCardHeader}>
                                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                                    <Text style={[styles.taskMiniCardCode, { color: subtextColor }]}>{taskCode}</Text>
                                                                    <View style={[styles.prioBadge, { backgroundColor: prioColors.bg }]}>
                                                                        <Text style={[styles.prioText, { color: prioColors.text }]}>{prio.toUpperCase()}</Text>
                                                                    </View>
                                                                    {child.isMandatory ? (
                                                                        <View style={styles.mandatoryBadge}>
                                                                            <Ionicons name="checkmark-circle" size={12} color="#30D158" />
                                                                            <Text style={styles.mandatoryBadgeText}>MANDATORY</Text>
                                                                        </View>
                                                                    ) : null}
                                                                </View>
                                                                <Text style={[styles.taskMiniCardWeight, { color: textColor }]}>
                                                                    {child.weightDefault.toFixed(2)}%
                                                                </Text>
                                                            </View>

                                                            {/* Middle Row: Task Name */}
                                                            <Text style={[styles.taskMiniCardTitle, { color: textColor }]}>
                                                                {child.taskName}
                                                            </Text>

                                                            {/* Bottom Row: Actions & Discipline */}
                                                            <View style={styles.taskMiniCardFooter}>
                                                                <Text style={[styles.disciplineText, { color: subtextColor }]}>
                                                                    Discipline: {child.disciplineCode || 'ALL'}
                                                                </Text>

                                                                <View style={styles.miniCardActions}>
                                                                    <TouchableOpacity
                                                                        onPress={() => openEditTaskModal(child)}
                                                                        style={[styles.miniActionButton, { backgroundColor: isDark ? '#3A3A3C' : '#E5E5EA' }]}
                                                                    >
                                                                        <Ionicons name="pencil-outline" size={12} color={textColor} style={{ marginRight: 4 }} />
                                                                        <Text style={[styles.miniActionButtonText, { color: textColor }]}>Edit</Text>
                                                                    </TouchableOpacity>
                                                                    <TouchableOpacity
                                                                        onPress={() => handleDeleteItem(child.id, child.taskName)}
                                                                        style={[styles.miniActionButton, { backgroundColor: 'rgba(255, 59, 48, 0.08)' }]}
                                                                    >
                                                                        <Ionicons name="trash-outline" size={12} color="#FF3B30" style={{ marginRight: 4 }} />
                                                                        <Text style={[styles.miniActionButtonText, { color: '#FF3B30' }]}>Delete</Text>
                                                                    </TouchableOpacity>
                                                                </View>
                                                            </View>
                                                        </View>
                                                    );
                                                })}
                                            </View>
                                        )}

                                        {/* Inner Add Task Row */}
                                        <TouchableOpacity
                                            style={[styles.innerAddButton, { borderColor: '#FF3B30', backgroundColor: isDark ? '#2C2C2E' : '#F6F6F6' }]}
                                            onPress={() => openAddTaskModal(group.id)}
                                        >
                                            <Ionicons name="add-circle-outline" size={15} color="#FF3B30" style={{ marginRight: 4 }} />
                                            <Text style={styles.innerAddButtonText}>Add Deliverable Task</Text>
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

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: true,
                    title: 'Stages',
                    headerLargeTitle: Platform.OS === 'ios',
                    headerTransparent: Platform.OS === 'ios',
                    headerBackground: Platform.OS === 'ios' ? () => <HeaderBlurBackground isDark={isDark} /> : undefined,
                    headerStyle: { backgroundColor: Platform.OS === 'ios' ? 'transparent' : (isDark ? '#000000' : '#F2F2F7') },
                    headerTintColor: '#FF3B30', // RED accent back button
                    headerTitleStyle: { color: textColor },
                    headerLargeTitleStyle: { color: textColor },
                    headerShadowVisible: false,
                    headerBackTitle: '', // Hides back title on iOS natively
                    headerRight: () => {
                        if (activeTab === 'scope-stages') return null;
                        const addLabel = activeTab === 'stage-list' ? 'Add Stage' : 'Add Group';
                        const addFn = activeTab === 'stage-list' ? openAddStageModal : openAddTaskGroupModal;
                        return (
                            <TouchableOpacity
                                onPress={addFn}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 4,
                                }}
                            >
                                <Ionicons name="add" size={20} color="#FF3B30" />
                                <Text style={{ color: '#FF3B30', fontSize: 15, fontWeight: '600' }}>
                                    {addLabel}
                                </Text>
                            </TouchableOpacity>
                        );
                    }
                }}
            />

            <ScrollView
                style={[styles.scrollView, { backgroundColor: bgColor }]}
                contentInsetAdjustmentBehavior="automatic"
                contentContainerStyle={{
                    paddingBottom: insets.bottom + (hasUnsavedScopeChanges ? 120 : 40),
                    paddingTop: Platform.OS === 'android' ? ((RNStatusBar.currentHeight || 24) + 54) : 12,
                }}
                showsVerticalScrollIndicator={false}
                onScroll={(event) => {
                    const offsetY = event.nativeEvent.contentOffset.y;
                    setIsScrolled(offsetY > 30);
                }}
                scrollEventThrottle={16}
            >
                {/* 1. Accent Tabs Bar */}
                <View style={[styles.tabBarContainer, { paddingBottom: 12 }]}>
                    <ScrollView
                        ref={tabScrollRef}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.tabsScrollContent}
                    >
                        {TABS.map(tab => {
                            const isSelected = activeTab === tab.id;
                            return (
                                <TouchableOpacity
                                    key={tab.id}
                                    activeOpacity={0.8}
                                    onLayout={(e) => {
                                        tabLayouts.current[tab.id] = e.nativeEvent.layout;
                                    }}
                                    onPress={() => {
                                        setActiveTab(tab.id);
                                        const layout = tabLayouts.current[tab.id];
                                        if (layout && tabScrollRef.current) {
                                            const screenWidth = Dimensions.get('window').width;
                                            const scrollToX = Math.max(0, layout.x - (screenWidth / 2) + (layout.width / 2));
                                            tabScrollRef.current.scrollTo({
                                                x: scrollToX,
                                                animated: true
                                            });
                                        }
                                    }}
                                    style={[
                                        styles.tabPill,
                                        {
                                            backgroundColor: isSelected ? '#FF3B30' : (isDark ? '#1C1C1E' : '#FFFFFF'),
                                        }
                                    ]}
                                >
                                    <Ionicons
                                        name={tab.icon}
                                        size={16}
                                        color={isSelected ? '#FFFFFF' : (isDark ? '#8E8E93' : '#6e6e73')}
                                    />
                                    <Text style={[styles.tabLabel, { color: isSelected ? '#FFFFFF' : textColor }]}>
                                        {tab.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

                {/* 2. Content Sections depending on loaded templates */}
                {isLoading ? (
                    <ActivityIndicator size="large" color="#FF3B30" style={{ marginTop: 40 }} />
                ) : (
                    <View style={{ paddingHorizontal: 16 }}>
                        {/* Tab Subheading */}
                        <Text style={[styles.tabDescription, { color: subtextColor }]}>
                            {TABS.find(t => t.id === activeTab)?.description}
                        </Text>

                        {/* A. Global Scope Selector Dropdown */}
                        {renderScopeSelector()}

                        {/* B. Stage Selector Dropdown (only in Task Templates) */}
                        {renderStageSelector()}

                        {/* C. Action Header Bar for Stage List */}
                        {activeTab === 'stage-list' && (
                            <View style={styles.sectionHeader}>
                                <Text style={[styles.sectionTitle, { color: textColor }]}>Stage List</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    {/* Weight check indicator badge */}
                                    <View style={[
                                        styles.weightBadge,
                                        { backgroundColor: isWeightValid ? '#34C759' : '#FF9500' }
                                    ]}>
                                        <Text style={styles.weightBadgeText}>
                                            Weight: {totalWeight.toFixed(1)}%
                                        </Text>
                                        <Ionicons
                                            name={isWeightValid ? 'checkmark-circle' : 'alert-circle'}
                                            size={13}
                                            color="#FFFFFF"
                                            style={{ marginLeft: 4 }}
                                        />
                                    </View>
                                    <TouchableOpacity onPress={handleResetStagesWeight} style={styles.resetButton}>
                                        <Ionicons name="refresh-outline" size={13} color="#FF3B30" style={{ marginRight: 4 }} />
                                        <Text style={styles.resetButtonText}>Reset</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {/* D. Action Header Bar for Task Templates */}
                        {activeTab === 'task-templates' && (
                            <View style={styles.sectionHeader}>
                                <Text style={[styles.sectionTitle, { color: textColor }]}>Task Templates</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    {/* Weight check indicator badge */}
                                    <View style={[
                                        styles.weightBadge,
                                        { backgroundColor: isTaskWeightValid ? '#34C759' : '#FF9500' }
                                    ]}>
                                        <Text style={styles.weightBadgeText}>
                                            Weight: {totalTaskWeight.toFixed(1)}%
                                        </Text>
                                        <Ionicons
                                            name={isTaskWeightValid ? 'checkmark-circle' : 'alert-circle'}
                                            size={13}
                                            color="#FFFFFF"
                                            style={{ marginLeft: 4 }}
                                        />
                                    </View>
                                    <TouchableOpacity onPress={handleResetTaskWeights} style={styles.resetButton}>
                                        <Ionicons name="refresh-outline" size={13} color="#FF3B30" style={{ marginRight: 4 }} />
                                        <Text style={styles.resetButtonText}>Reset</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {/* E. Action Header Bar for Scope Stages */}
                        {activeTab === 'scope-stages' && (
                            <View style={styles.sectionHeader}>
                                <Text style={[styles.sectionTitle, { color: textColor }]}>Scope Stages</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    {/* Weight check indicator badge */}
                                    <View style={[
                                        styles.weightBadge,
                                        { backgroundColor: '#34C759' }
                                    ]}>
                                        <Text style={styles.weightBadgeText}>
                                            Weight: {totalScopeWeight.toFixed(1)}%
                                        </Text>
                                        <Ionicons
                                            name="checkmark-circle"
                                            size={13}
                                            color="#FFFFFF"
                                            style={{ marginLeft: 4 }}
                                        />
                                    </View>
                                    <TouchableOpacity onPress={handleResetScopeStages} style={styles.resetButton}>
                                        <Ionicons name="refresh-outline" size={13} color="#FF3B30" style={{ marginRight: 4 }} />
                                        <Text style={styles.resetButtonText}>Reset</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {/* F. Tab Contents Rendering */}
                        {activeTab === 'stage-list' && renderStageListTab()}
                        {activeTab === 'scope-stages' && renderScopeStagesTab()}
                        {activeTab === 'task-templates' && renderTaskTemplatesTab()}
                    </View>
                )}
            </ScrollView>

            {/* Floating Save Changes Bar for Scope Stages */}
            {activeTab === 'scope-stages' && hasUnsavedScopeChanges && (
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
                                            swiftModifiers.foregroundStyle('#FF3B30'),
                                            swiftModifiers.shadow({ radius: 4, color: '#FF3B30' })
                                        ]} />

                                        <SwiftUIVStack alignment="leading" spacing={2}>
                                            <SwiftUIText weight="bold" size={15} color={isDark ? '#FFFFFF' : '#1C1C1E'}>
                                                Unsaved Changes
                                            </SwiftUIText>
                                            <SwiftUIText size={11} color={isDark ? '#A1A1A6' : '#8E8E93'}>
                                                Scope: {selectedScope?.name}
                                            </SwiftUIText>
                                        </SwiftUIVStack>
                                    </SwiftUIHStack>

                                    <SwiftUISpacer />

                                    <SwiftUIHStack spacing={8}>
                                        <SwiftUIButton
                                            onPress={handleResetScopeStages}
                                            disabled={isSavingScope}
                                            modifiers={[
                                                swiftModifiers.buttonStyle('glassBorder'),
                                                swiftModifiers.tint(isDark ? '#FFFFFF' : '#1C1C1E'),
                                                swiftModifiers.frame({ minWidth: 60, height: 38 })
                                            ]}
                                        >
                                            Reset
                                        </SwiftUIButton>
                                        <SwiftUIButton
                                            onPress={handleSaveScopeStages}
                                            disabled={isSavingScope}
                                            modifiers={[
                                                swiftModifiers.buttonStyle('glassProminent'),
                                                swiftModifiers.tint('#FF3B30'),
                                                swiftModifiers.frame({ minWidth: 80, height: 38 })
                                            ]}
                                        >
                                            {isSavingScope ? 'Saving...' : 'Save'}
                                        </SwiftUIButton>
                                    </SwiftUIHStack>
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
                                <View style={[styles.statusDotNew, { backgroundColor: '#FF3B30', shadowColor: '#FF3B30' }]} />
                                <View style={styles.textBlock}>
                                    <Text style={[styles.mainTitleNew, { color: textColor }]}>Unsaved Changes</Text>
                                    <Text style={[styles.subtextNew, { color: textColor }]}>Scope: {selectedScope?.name}</Text>
                                </View>
                            </View>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                <TouchableOpacity
                                    style={[styles.actionButtonNew, { backgroundColor: 'transparent', borderWidth: 1, borderColor: isDark ? '#48484A' : '#E5E5EA' }]}
                                    onPress={handleResetScopeStages}
                                    disabled={isSavingScope}
                                >
                                    <Text style={{ color: textColor, fontWeight: '600' }}>Reset</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.actionButtonNew, { backgroundColor: '#FF3B30' }]}
                                    onPress={handleSaveScopeStages}
                                    disabled={isSavingScope}
                                >
                                    <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>{isSavingScope ? 'Saving...' : 'Save'}</Text>
                                </TouchableOpacity>
                            </View>
                        </BlurView>
                    )}
                </View>
            )}

            {/* Bottom Drawer Form Sheet */}
            <SwiftUIStagesSettingsSheet
                isOpened={isFormModalVisible}
                onClose={() => setIsFormModalVisible(false)}
                mode={sheetMode}
                editItem={editItem}
                stageId={sheetStageId}
                parentId={sheetParentId}
                disciplines={disciplines}
                onSave={handleSheetSave}
                onDelete={handleDeleteItem}
            />

            {/* Scope Picker Sheet */}
            <SwiftUIScopePickerSheet
                isOpened={isScopePickerVisible}
                onClose={() => setIsScopePickerVisible(false)}
                scopes={scopes}
                selectedScope={selectedScope}
                onSelectScope={setSelectedScope}
            />

            {/* Stage Picker Sheet */}
            <SwiftUIStagePickerSheet
                isOpened={isStagePickerVisible}
                onClose={() => setIsStagePickerVisible(false)}
                stages={stages.filter(s => s.isActive)}
                selectedStage={stages.find(s => s.stageCode === activeStageCode) || null}
                onSelectStage={(st) => setActiveStageCode(st.stageCode)}
            />
        </>
    );
}

const styles = StyleSheet.create({
    scrollView: {
        flex: 1,
    },
    tabBarContainer: {
        width: '100%',
    },
    tabsScrollContent: {
        paddingHorizontal: 16,
        gap: 8,
    },
    tabPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        gap: 6,
    },
    tabLabel: {
        fontSize: 14,
        fontWeight: '600',
    },
    tabDescription: {
        fontSize: 13,
        fontWeight: '400',
        lineHeight: 18,
        marginBottom: 16,
    },
    scopePillsContainer: {
        width: '100%',
        marginBottom: 16,
    },
    pillsScrollContent: {
        gap: 6,
    },
    pillButton: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 12,
    },
    pillText: {
        fontSize: 13,
        fontWeight: '600',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 8,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    headerButtonsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    textActionButton: {
        paddingVertical: 6,
        paddingHorizontal: 10,
    },
    textActionButtonText: {
        color: '#FF3B30',
        fontSize: 14,
        fontWeight: '600',
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    addButtonText: {
        color: '#FF3B30',
        fontSize: 14,
        fontWeight: '600',
    },
    weightBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 14,
    },
    weightBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    tabContentContainer: {
        gap: 12,
    },
    weightWarningBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 8,
    },
    weightWarningText: {
        fontSize: 14,
        fontWeight: '600',
    },
    weightWarningSubText: {
        fontSize: 12,
    },
    weightWarningActionBtn: {
        backgroundColor: '#FF9500',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
        marginLeft: 8,
    },
    weightWarningActionBtnText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
    card: {
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 10,
        gap: 6,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.08,
                shadowRadius: 4,
            },
            android: { elevation: 1 },
        }),
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    cardLeftCol: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 12,
    },
    codeBadge: {
        backgroundColor: 'rgba(142, 142, 147, 0.12)',
        borderWidth: 0.5,
        borderColor: 'rgba(142, 142, 147, 0.2)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 999,
    },
    codeBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#8E8E93',
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    cardSubTitle: {
        fontSize: 13,
        fontStyle: 'italic',
    },
    categoryPill: {
        borderWidth: 0.5,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 999,
    },
    categoryText: {
        fontSize: 10,
        fontWeight: '700',
    },
    cardRightCol: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    weightText: {
        fontSize: 14,
        fontWeight: '600',
        marginRight: 2,
    },
    editButton: {
        padding: 4,
    },
    emptyText: {
        fontSize: 14,
        textAlign: 'center',
        marginTop: 20,
    },
    resetButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 59, 48, 0.04)',
        borderWidth: 1,
        borderColor: '#FF3B30',
        paddingVertical: 5,
        paddingHorizontal: 12,
        borderRadius: 14,
    },
    resetButtonText: {
        color: '#FF3B30',
        fontSize: 11,
        fontWeight: '600',
    },
    cardMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
    },
    cardWeightBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    cardWeightBadgeText: {
        fontSize: 11,
        fontWeight: '700',
    },
    cardTitleStack: {
        flexDirection: 'column',
        gap: 4,
        marginTop: 6,
        paddingHorizontal: 2,
    },
    cardDivider: {
        height: 1,
        borderTopWidth: 1,
        marginTop: 6,
        marginBottom: 4,
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 2,
    },
    cardActionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        borderWidth: 1,
    },
    cardActionButtonText: {
        fontSize: 11,
        fontWeight: '600',
    },
    // Accordion styling
    accordionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 14,
    },
    accordionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    indexCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    indexCircleText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '800',
    },
    groupTitle: {
        fontSize: 16,
        fontWeight: '600',
        flex: 1,
    },
    accordionRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    groupWeight: {
        fontSize: 14,
        fontWeight: '600',
    },
    headerEditBtn: {
        padding: 4,
    },
    accordionBody: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(118,118,128,0.12)',
        paddingBottom: 8,
    },
    emptySubText: {
        fontSize: 13,
        textAlign: 'center',
        paddingVertical: 14,
    },
    taskMiniCardsContainer: {
        paddingHorizontal: 14,
        gap: 8,
        marginTop: 8,
    },
    taskMiniCard: {
        borderRadius: 12,
        padding: 12,
        gap: 8,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04,
                shadowRadius: 2,
            },
            android: { elevation: 0.5 },
        }),
    },
    taskMiniCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    taskMiniCardCode: {
        fontSize: 11,
        fontWeight: '700',
    },
    taskMiniCardWeight: {
        fontSize: 12,
        fontWeight: '600',
    },
    taskMiniCardTitle: {
        fontSize: 14,
        fontWeight: '600',
        lineHeight: 18,
    },
    taskMiniCardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 2,
    },
    disciplineText: {
        fontSize: 11,
        fontWeight: '500',
    },
    miniCardActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    miniActionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    miniActionButtonText: {
        fontSize: 11,
        fontWeight: '600',
    },
    mandatoryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(48, 209, 88, 0.1)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        gap: 2,
    },
    mandatoryBadgeText: {
        fontSize: 8,
        fontWeight: '800',
        color: '#30D158',
    },
    prioBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    prioText: {
        fontSize: 9,
        fontWeight: '800',
    },
    innerAddButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        marginHorizontal: 14,
        marginVertical: 8,
        borderRadius: 10,
        borderWidth: 1,
        borderStyle: 'dashed',
    },
    innerAddButtonText: {
        color: '#FF3B30',
        fontSize: 13,
        fontWeight: '600',
    },
    // Floating Bar styling
    floatingActionContainer: {
        position: 'absolute',
        bottom: 24,
        left: 16,
        right: 16,
        padding: 16,
        borderRadius: 20,
        gap: 12,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 12,
            },
            android: { elevation: 4 },
        }),
    },
    floatingText: {
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
    },
    floatingButtonsRow: {
        flexDirection: 'row',
        gap: 10,
    },
    floatingBtn: {
        flex: 1,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    floatCancelBtn: {
        borderWidth: 1,
    },
    floatSaveBtn: {
        backgroundColor: '#FF3B30',
    },
    floatBtnText: {
        fontSize: 14,
        fontWeight: '600',
    },
    scopeSelectorWrapper: {
        marginBottom: 16,
    },
    scopeSelectorLabel: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 6,
        paddingLeft: 4,
    },
    scopeSelectorTrigger: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderRadius: 14,
        borderWidth: 1,
    },
    scopeIconBg: {
        width: 28,
        height: 28,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scopeSelectorText: {
        fontSize: 15,
        fontWeight: '700',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'flex-end',
    },
    scopePickerSheet: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: Platform.OS === 'android' ? ((RNStatusBar.currentHeight || 24) + 54) : 8,
        paddingHorizontal: 0,
        paddingBottom: Platform.OS === 'ios' ? 44 : 24,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
            },
            android: { elevation: 8 },
        }),
    },
    pickerSheetDragHandle: {
        width: 36,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: 'rgba(118, 118, 128, 0.24)',
        alignSelf: 'center',
        marginTop: 6,
        marginBottom: 16,
    },
    pickerSheetHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
        paddingHorizontal: 20,
    },
    pickerSheetTitle: {
        fontSize: 17,
        fontWeight: '700',
        textAlign: 'center',
        flex: 1,
    },
    pickerGroupedList: {
        marginHorizontal: 16,
        borderRadius: 14,
        overflow: 'hidden',
        borderWidth: 0.5,
    },
    pickerSheetOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    pickerCircle: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pickerCircleInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#FF3B30',
    },
    pickerOptionCode: {
        fontSize: 15,
        fontWeight: '700',
    },
    pickerOptionName: {
        fontSize: 13,
        marginTop: 2,
    },
    // New SwiftUI Floating Save Changes Bar Styles
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
});
