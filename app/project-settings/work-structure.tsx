import { HeaderBlurBackground } from '@/components/ui/HeaderBlurBackground';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Platform,
    ActivityIndicator,
    Alert,
    Dimensions,
    TextInput,
    Modal, StatusBar as RNStatusBar } from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

import { supabase } from '@/lib/supabase';
import {
    fetchDisciplines,
    createDiscipline,
    fetchDefaultWorkspaceId,
    Discipline,
} from '@/lib/api/templates';

import { WBSItem, WBSMode } from '@/lib/wbs-data/wbs.types';
import { WBS_BALLPARK } from '@/lib/wbs-data/wbs-ballpark';
import { RAW_WBS_ESTIMATES_DELTA } from '@/lib/wbs-data/wbs-estimates';
import { buildEstimatesFromBallpark } from '@/lib/wbs-data/wbs-inherit';
import { buildDetailFromEstimates } from '@/lib/wbs-data/wbs-detail';
import { WBSActionsDrawer } from '@/components/project-settings/WBSActionsDrawer';
import { WBSAddDisciplineSheet } from '@/components/project-settings/WBSAddDisciplineSheet';

const DEFAULT_WORKSPACE_ID = '00000000-0000-0000-0000-000000000001';
const MANDATORY_CODES = ["S", "A", "M"];

const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

const recalculateTree = (flatNodes: WBSItem[]): WBSItem[] => {
    const idMap = new Map<string, WBSItem>();
    flatNodes.forEach(n => idMap.set(n.id, { ...n, children: [] }));

    const roots: WBSItem[] = [];
    const childrenMap = new Map<string, WBSItem[]>();

    flatNodes.forEach(n => {
        const mappedNode = idMap.get(n.id)!;
        if (!n.parent_id) {
            roots.push(mappedNode);
        } else {
            const list = childrenMap.get(n.parent_id) || [];
            list.push(mappedNode);
            childrenMap.set(n.parent_id, list);
        }
    });

    const originalIndices = new Map<string, number>();
    flatNodes.forEach((n, idx) => originalIndices.set(n.id, idx));

    const sortFunc = (a: WBSItem, b: WBSItem) => {
        return (originalIndices.get(a.id) || 0) - (originalIndices.get(b.id) || 0);
    };

    roots.sort(sortFunc);
    childrenMap.forEach(list => list.sort(sortFunc));

    const updatedFlatNodes: WBSItem[] = [];

    const traverseAndAssign = (node: WBSItem, parentCode: string | null, depth: number) => {
        let newCode = node.code;
        if (parentCode !== null) {
            const siblings = node.parent_id ? (childrenMap.get(node.parent_id) || []) : roots;
            const siblingIndex = siblings.findIndex(s => s.id === node.id);
            newCode = `${parentCode}.${siblingIndex + 1}`;
        }

        node.code = newCode;
        node.indent_level = depth;
        node.sort_order = updatedFlatNodes.length;

        updatedFlatNodes.push({
            id: node.id,
            code: node.code,
            nameEn: node.nameEn,
            nameId: node.nameId,
            level: depth === 0 ? 'structure' : (depth === 1 ? 'summary' : (depth === 2 ? 'estimate' : 'detail')),
            indent_level: node.indent_level,
            parent_id: node.parent_id,
            sort_order: node.sort_order
        });

        const children = childrenMap.get(node.id) || [];
        children.forEach(child => {
            traverseAndAssign(child, node.code, depth + 1);
        });
    };

    roots.forEach(root => {
        traverseAndAssign(root, null, 0);
    });

    return updatedFlatNodes;
};

export default function WorkStructureSettingsScreen() {
    const insets = useSafeAreaInsets();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';

    // Core state
    const [workspaceId, setWorkspaceId] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [isSeeding, setIsSeeding] = useState(false);
    const [seedProgress, setSeedProgress] = useState('');
    const [wbsItems, setWbsItems] = useState<WBSItem[]>([]);
    const [allDisciplines, setAllDisciplines] = useState<Discipline[]>([]);
    
    // UI state
    const [activeTab, setActiveTab] = useState<WBSMode>('BALLPARK');
    const activeTabRef = useRef<WBSMode>(activeTab);
    useEffect(() => {
        activeTabRef.current = activeTab;
    }, [activeTab]);
    const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
    const [showAddDisciplineSection, setShowAddDisciplineSection] = useState(false);
    const [dbNodes, setDbNodes] = useState<WBSItem[]>([]);
    const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
    const [selectedMenuNode, setSelectedMenuNode] = useState<WBSItem | null>(null);

    // Color definitions
    const bgColor = isDark ? '#000000' : '#F2F2F7';
    const cardBgColor = isDark ? '#1C1C1E' : '#FFFFFF';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6e6e73';
    const borderColor = isDark ? '#2C2C2E' : '#E5E5EA';
    const segmentBgColor = isDark ? '#1C1C1E' : '#E5E5EA';
    const segmentActiveBgColor = isDark ? '#2C2C2E' : '#FFFFFF';

    // Initialize Workspace ID and load data
    useEffect(() => {
        async function init() {
            try {
                const wId = await fetchDefaultWorkspaceId();
                const selectedWId = wId || DEFAULT_WORKSPACE_ID;
                setWorkspaceId(selectedWId);
            } catch (err) {
                console.error("Failed to fetch default workspace:", err);
                setWorkspaceId(DEFAULT_WORKSPACE_ID);
            }
        }
        init();
    }, []);

    const loadData = useCallback(async () => {
        if (!workspaceId) return;
        setLoading(true);

        try {
            const [wbsRes, discRes] = await Promise.all([
                supabase.from('work_breakdown_structure')
                    .select('*')
                    .eq('workspace_id', workspaceId)
                    .order('created_at', { ascending: true }),
                fetchDisciplines(workspaceId).catch(() => [] as Discipline[])
            ]);

            if (discRes) setAllDisciplines(discRes);

            if (wbsRes.data) {
                const nodes: WBSItem[] = wbsRes.data.map((d: any) => ({
                    id: d.id,
                    code: d.code,
                    nameEn: d.name,
                    nameId: d.description,
                    level: d.level,
                    indent_level: d.indent_level || 0,
                    parent_id: d.parent_id,
                    sort_order: d.sort_order || 0
                }));

                nodes.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

                setWbsItems(nodes);
                setDbNodes(nodes.map(n => ({ ...n }))); // Deep copy

                const defaultCollapsed = new Set<string>();
                const collapseLimit = activeTabRef.current === 'BALLPARK' ? 0 : 1;
                nodes.forEach(node => {
                    if ((node.indent_level ?? 0) >= collapseLimit) {
                        defaultCollapsed.add(node.id);
                    }
                });
                setCollapsedIds(defaultCollapsed);
            }
        } catch (err: any) {
            console.error("Failed to load WBS settings:", err);
            Alert.alert("Error", "Failed to sync Work Breakdown Structure: " + err.message);
        } finally {
            setLoading(false);
        }
    }, [workspaceId]);

    useEffect(() => {
        if (workspaceId) {
            loadData();
        }
    }, [workspaceId, loadData]);

    // Available root level disciplines matching settings
    const availableDisciplines = useMemo(() => {
        const existingCodes = wbsItems.map(item => item.code);
        return allDisciplines.filter(d =>
            !existingCodes.includes(d.code) &&
            !MANDATORY_CODES.includes(d.code)
        );
    }, [allDisciplines, wbsItems]);

    // Handle adding a standard discipline as L1 root WBS
    const handleAddDiscipline = (discipline: Discipline) => {
        const newNode: WBSItem = {
            id: generateUUID(),
            code: discipline.code,
            nameEn: discipline.nameEn,
            nameId: discipline.nameId || '',
            level: 'structure',
            indent_level: 0,
            parent_id: null,
            sort_order: wbsItems.length
        };

        setWbsItems(prev => recalculateTree([...prev, newNode]));
        setShowAddDisciplineSection(false);
    };

    // Handle adding custom discipline
    const handleAddCustomDiscipline = (code: string, nameEn: string, nameId: string) => {
        const existsInWbs = wbsItems.some(item => item.code === code && item.parent_id === null);
        if (existsInWbs) {
            Alert.alert("Conflict", `Code "${code}" already exists in WBS structure`);
            return;
        }

        const newNode: WBSItem = {
            id: generateUUID(),
            code: code,
            nameEn: nameEn,
            nameId: nameId || nameEn,
            level: 'structure',
            indent_level: 0,
            parent_id: null,
            sort_order: wbsItems.length
        };

        setWbsItems(prev => recalculateTree([...prev, newNode]));
        setShowAddDisciplineSection(false);
    };

    // Seeding default baseline
    const handleSeedBaseline = async () => {
        Alert.alert(
            "Reset WBS Baseline",
            "This will DELETE all current WBS items and re-seed from the default template. Are you sure you want to proceed?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Reset and Seed",
                    style: "destructive",
                    onPress: async () => {
                        setIsSeeding(true);
                        setSeedProgress("Initializing remote baseline build...");
                        
                        try {
                            // 1. Clear existing
                            setSeedProgress("Clearing remote breakdown items...");
                            const { error: deleteError } = await supabase
                                .from('work_breakdown_structure')
                                .delete()
                                .eq('workspace_id', workspaceId);
                            if (deleteError) throw deleteError;

                            // 2. Generate tree
                            setSeedProgress("Generating baseline structures...");
                            const estimatesTree = buildEstimatesFromBallpark(WBS_BALLPARK, RAW_WBS_ESTIMATES_DELTA);
                            const detailTree = buildDetailFromEstimates(estimatesTree);

                            let nodesCount = 0;
                            // Calculate total nodes for status logging
                            const countNodes = (items: any[]): number => {
                                return items.reduce((acc, curr) => acc + 1 + (curr.children ? countNodes(curr.children) : 0), 0);
                            };
                            const totalNodes = countNodes(detailTree);

                            // Recursive insert logic
                            const insertNode = async (item: any, parentDbId: string | null = null, indentLevel: number = 0) => {
                                let currentLevel = "structure";
                                if (indentLevel === 0) currentLevel = "structure";
                                else if (indentLevel === 1) currentLevel = "summary";
                                else if (indentLevel === 2) currentLevel = "estimate";
                                else if (indentLevel >= 3) currentLevel = "detail";

                                const code = item.code || item.wbsCode || "NO-CODE";
                                const name = item.nameEn || item.titleEn || item.name || item.title || "Unnamed";
                                const description = item.nameId || item.name || item.title || "";

                                nodesCount++;
                                setSeedProgress(`Uploading baseline node ${nodesCount}/${totalNodes} (${code})...`);

                                const { data, error } = await supabase.from("work_breakdown_structure").insert({
                                    workspace_id: workspaceId,
                                    code: code,
                                    name: name,
                                    level: currentLevel,
                                    indent_level: indentLevel,
                                    parent_id: parentDbId,
                                    description: description,
                                    sort_order: item.sort_order || 0
                                }).select('id').single();

                                if (error) throw error;

                                const newDbId = data.id;
                                const children = item.children || item.items || [];
                                if (children && children.length > 0) {
                                    for (const child of children) {
                                        await insertNode(child, newDbId, indentLevel + 1);
                                    }
                                }
                            };

                            // Seed root categories
                            for (const root of detailTree) {
                                await insertNode(root);
                            }

                            setSeedProgress("Syncing layouts...");
                            await loadData();
                            Alert.alert("Success", "Baseline Work Breakdown Structure seeded successfully!");
                        } catch (err: any) {
                            console.error("Seeding error:", err);
                            Alert.alert("Seeding Failed", "Failed to seed baseline: " + err.message);
                            await loadData();
                        } finally {
                            setIsSeeding(false);
                            setSeedProgress('');
                        }
                    }
                }
            ]
        );
    };

    // WBS View modes pruning logic - Show full breakdown tree with expand/collapse based on active tab level limit
    const visibleTree = useMemo(() => {
        let maxIndent = 10;
        if (activeTab === 'BALLPARK') maxIndent = 1;
        else if (activeTab === 'ESTIMATES') maxIndent = 2;
        else if (activeTab === 'DETAIL') maxIndent = 4;

        // Reconstruct hierarchical tree from flat wbsItems state
        const idMap = new Map<string, WBSItem>();
        wbsItems.forEach(n => idMap.set(n.id, { ...n, children: [] }));

        const roots: WBSItem[] = [];
        wbsItems.forEach(n => {
            const mappedNode = idMap.get(n.id)!;
            if (!n.parent_id) {
                roots.push(mappedNode);
            } else {
                const parent = idMap.get(n.parent_id);
                if (parent) {
                    parent.children = parent.children || [];
                    parent.children.push(mappedNode);
                } else {
                    roots.push(mappedNode);
                }
            }
        });

        const prune = (nodes: WBSItem[]): WBSItem[] => {
            return nodes
                .filter((n) => (n.indent_level || 0) <= maxIndent)
                .map((n) => ({
                    ...n,
                    children: n.children ? prune(n.children) : undefined,
                }));
        };
        return prune(roots);
    }, [wbsItems, activeTab]);

    // Flatten tree helper for list rendering
    interface FlatNode {
        item: WBSItem;
        level: number;
        hasChildren: boolean;
        isCollapsed: boolean;
        visible: boolean;
    }

    const flattenTree = useCallback((nodes: WBSItem[], level = 0, parentCollapsed = false): FlatNode[] => {
        const list: FlatNode[] = [];
        for (const node of nodes) {
            const hasChildren = !!(node.children && node.children.length > 0);
            const isCollapsed = collapsedIds.has(node.id);
            list.push({
                item: node,
                level,
                hasChildren,
                isCollapsed,
                visible: !parentCollapsed
            });
            if (hasChildren) {
                list.push(...flattenTree(node.children || [], level + 1, parentCollapsed || isCollapsed));
            }
        }
        return list;
    }, [collapsedIds]);

    const visibleFlatNodes = useMemo(() => {
        return flattenTree(visibleTree).filter(n => n.visible);
    }, [visibleTree, flattenTree]);

    const toggleExpand = (id: string) => {
        setCollapsedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const isNodeModified = useCallback((node: WBSItem) => {
        const dbNode = dbNodes.find(n => n.id === node.id);
        if (!dbNode) return true;
        return dbNode.nameEn !== node.nameEn || 
               dbNode.nameId !== node.nameId || 
               dbNode.code !== node.code || 
               dbNode.parent_id !== node.parent_id || 
               dbNode.sort_order !== node.sort_order;
    }, [dbNodes]);

    const hasUnsavedChanges = useMemo(() => {
        if (deletedIds.size > 0) return true;
        if (wbsItems.length !== dbNodes.length) return true;
        return wbsItems.some(isNodeModified);
    }, [wbsItems, dbNodes, deletedIds, isNodeModified]);

    const unsavedChangesCount = useMemo(() => {
        const modifiedCount = wbsItems.filter(isNodeModified).length;
        return modifiedCount + deletedIds.size;
    }, [wbsItems, isNodeModified, deletedIds]);

    const handleInlineNameEdit = useCallback((nodeId: string, field: 'nameEn' | 'nameId', value: string) => {
        setWbsItems(prev => {
            return prev.map(n => {
                if (n.id === nodeId) {
                    return { ...n, [field]: value };
                }
                return n;
            });
        });
    }, []);

    const addNode = (targetNodeId: string, position: 'ABOVE' | 'BELOW' | 'SUBWORK') => {
        const targetNode = wbsItems.find(n => n.id === targetNodeId);
        if (!targetNode) return;

        const maxIndent = activeTab === 'BALLPARK' ? 1 : (activeTab === 'ESTIMATES' ? 2 : 4);
        if (position === 'SUBWORK' && (targetNode.indent_level ?? 0) >= maxIndent) {
            Alert.alert("Limit Reached", `Cannot add subwork. Level limit for ${activeTab} is reached.`);
            return;
        }

        const newNode: WBSItem = {
            id: generateUUID(),
            code: '',
            nameEn: '',
            nameId: '',
            indent_level: position === 'SUBWORK' ? (targetNode.indent_level ?? 0) + 1 : (targetNode.indent_level ?? 0),
            parent_id: position === 'SUBWORK' ? targetNode.id : targetNode.parent_id,
            sort_order: 0
        };

        setWbsItems(prev => {
            const result: WBSItem[] = [];
            const getDescendants = (id: string, list: WBSItem[]): WBSItem[] => {
                const children = list.filter(n => n.parent_id === id);
                const descendants = [];
                const node = list.find(n => n.id === id);
                if (node) descendants.push(node);
                children.forEach(c => {
                    descendants.push(...getDescendants(c.id, list));
                });
                return descendants;
            };

            const targetDescendants = getDescendants(targetNodeId, prev);
            const targetLastDescendant = targetDescendants[targetDescendants.length - 1] || targetNode;

            for (const item of prev) {
                if (position === 'ABOVE' && item.id === targetNodeId) {
                    result.push(newNode);
                }
                result.push(item);
                if ((position === 'BELOW' || position === 'SUBWORK') && item.id === targetLastDescendant.id) {
                    result.push(newNode);
                }
            }

            return recalculateTree(result);
        });
    };

    const deleteNode = (nodeId: string) => {
        const node = wbsItems.find(n => n.id === nodeId);
        if (!node) return;

        Alert.alert(
            "Delete Work",
            `Are you sure you want to delete "${node.nameEn || 'Unnamed'}" and all of its subworks?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => {
                        const getDescendantsIds = (id: string, list: WBSItem[]): string[] => {
                            const children = list.filter(n => n.parent_id === id);
                            const ids = [id];
                            children.forEach(c => {
                                ids.push(...getDescendantsIds(c.id, list));
                            });
                            return ids;
                        };

                        const idsToDelete = getDescendantsIds(nodeId, wbsItems);
                        
                        setDeletedIds(prev => {
                            const next = new Set(prev);
                            idsToDelete.forEach(id => {
                                const existsInDb = dbNodes.some(n => n.id === id);
                                if (existsInDb) {
                                    next.add(id);
                                }
                            });
                            return next;
                        });

                        setWbsItems(prev => {
                            const remaining = prev.filter(item => !idsToDelete.includes(item.id));
                            return recalculateTree(remaining);
                        });
                    }
                }
            ]
        );
    };

    const moveNode = (nodeId: string, direction: 'UP' | 'DOWN') => {
        const node = wbsItems.find(n => n.id === nodeId);
        if (!node) return;

        const siblings = wbsItems.filter(n => n.parent_id === node.parent_id);
        const nodeIdx = siblings.findIndex(s => s.id === nodeId);

        if (direction === 'UP' && nodeIdx > 0) {
            const prevSibling = siblings[nodeIdx - 1];
            swapGroups(prevSibling.id, node.id);
        } else if (direction === 'DOWN' && nodeIdx < siblings.length - 1) {
            const nextSibling = siblings[nodeIdx + 1];
            swapGroups(node.id, nextSibling.id);
        }
    };

    const swapGroups = (firstNodeId: string, secondNodeId: string) => {
        setWbsItems(prev => {
            const getDescendants = (id: string, list: WBSItem[]): WBSItem[] => {
                const node = list.find(n => n.id === id)!;
                const children = list.filter(n => n.parent_id === id);
                const descendants = [node];
                children.forEach(c => {
                    descendants.push(...getDescendants(c.id, list));
                });
                return descendants;
            };

            const group1 = getDescendants(firstNodeId, prev);
            const group2 = getDescendants(secondNodeId, prev);

            const group1Ids = new Set(group1.map(g => g.id));
            const group2Ids = new Set(group2.map(g => g.id));

            const result: WBSItem[] = [];
            let insertedGroup2 = false;

            for (let i = 0; i < prev.length; i++) {
                const item = prev[i];
                if (group1Ids.has(item.id)) {
                    continue;
                }
                if (group2Ids.has(item.id)) {
                    if (!insertedGroup2) {
                        result.push(...group2);
                        result.push(...group1);
                        insertedGroup2 = true;
                    }
                    continue;
                }
                result.push(item);
            }

            return recalculateTree(result);
        });
    };

    const isFirstSibling = (node: WBSItem) => {
        const siblings = wbsItems.filter(n => n.parent_id === node.parent_id);
        return siblings.length > 0 && siblings[0].id === node.id;
    };

    const isLastSibling = (node: WBSItem) => {
        const siblings = wbsItems.filter(n => n.parent_id === node.parent_id);
        return siblings.length > 0 && siblings[siblings.length - 1].id === node.id;
    };

    const handleSaveChanges = async () => {
        setLoading(true);
        try {
            if (deletedIds.size > 0) {
                const { error: deleteError } = await supabase
                    .from('work_breakdown_structure')
                    .delete()
                    .in('id', Array.from(deletedIds));
                if (deleteError) throw deleteError;
            }

            const nodesToUpsert = wbsItems.map(node => ({
                id: node.id,
                workspace_id: workspaceId,
                code: node.code,
                name: node.nameEn,
                description: node.nameId || '',
                level: node.level,
                indent_level: node.indent_level,
                parent_id: node.parent_id,
                sort_order: node.sort_order
            }));

            const { error: upsertError } = await supabase
                .from('work_breakdown_structure')
                .upsert(nodesToUpsert);
            if (upsertError) throw upsertError;

            Alert.alert("Success", "All changes saved successfully!");
            setDeletedIds(new Set());
            await loadData();
        } catch (err: any) {
            Alert.alert("Save Failed", err.message || "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    const handleDiscardChanges = () => {
        setWbsItems(dbNodes.map(n => ({ ...n })));
        setDeletedIds(new Set());
    };

    const handleTabChange = useCallback((tabId: WBSMode) => {
        setActiveTab(tabId);
        
        const defaultCollapsed = new Set<string>();
        const collapseLimit = tabId === 'BALLPARK' ? 0 : 1;
        wbsItems.forEach(node => {
            if ((node.indent_level ?? 0) >= collapseLimit) {
                defaultCollapsed.add(node.id);
            }
        });
        setCollapsedIds(defaultCollapsed);
    }, [wbsItems]);

    // Render components
    const tabsList: { id: WBSMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
        { id: 'BALLPARK', label: 'Ballpark', icon: 'calculator-outline' },
        { id: 'ESTIMATES', label: 'Estimates', icon: 'cash-outline' },
        { id: 'DETAIL', label: 'Detail', icon: 'grid-outline' },
    ];

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: true,
                    title: 'Work Structure',
                    headerLargeTitle: Platform.OS === 'ios',
                    headerTransparent: Platform.OS === 'ios',
                    headerBackground: Platform.OS === 'ios' ? () => <HeaderBlurBackground isDark={isDark} /> : undefined,
                    headerStyle: { backgroundColor: Platform.OS === 'ios' ? 'transparent' : (isDark ? '#000000' : '#F2F2F7') },
                    headerTintColor: '#FF3B30',
                    headerTitleStyle: { color: textColor },
                    headerLargeTitleStyle: { color: textColor },
                    headerShadowVisible: false,
                    headerBackTitle: '',
                }}
            />

            <ScrollView
                contentInsetAdjustmentBehavior="automatic"
                style={{ flex: 1, backgroundColor: bgColor }}
                contentContainerStyle={{
                    paddingBottom: insets.bottom + (hasUnsavedChanges ? 120 : 40),
                }}
                showsVerticalScrollIndicator={false}
            >
                {/* Accent Tabs Bar (same design as stages) */}
                <View style={[styles.tabBarContainer, { paddingVertical: 12 }]}>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
                        >
                            {tabsList.map(tab => {
                                const isSelected = activeTab === tab.id;
                                return (
                                    <TouchableOpacity
                                        key={tab.id}
                                        activeOpacity={0.8}
                                        onPress={() => handleTabChange(tab.id)}
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

                    {loading ? (
                        <View style={[styles.centered, { paddingTop: 60 }]}>
                            <ActivityIndicator size="large" color="#FF3B30" />
                        </View>
                    ) : wbsItems.length === 0 ? (
                        /* EMPTY SEED STATE */
                        <View style={{ padding: 24, alignItems: 'center' }}>
                            <Animated.View
                                entering={FadeInDown.duration(400)}
                                style={[styles.emptyCard, { backgroundColor: cardBgColor }]}
                            >
                                <LinearGradient
                                    colors={isDark ? ['rgba(255, 59, 48, 0.15)', 'rgba(255, 59, 48, 0.05)'] : ['rgba(255, 59, 48, 0.08)', 'rgba(255, 59, 48, 0.02)']}
                                    style={StyleSheet.absoluteFill}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                />
                                <View style={styles.iconWrapper}>
                                    <Ionicons name="grid-outline" size={48} color="#FF3B30" />
                                </View>
                                <Text style={[styles.emptyTitle, { color: textColor }]}>No WBS Baseline Seeded</Text>
                                <Text style={[styles.emptyDesc, { color: subtextColor }]}>
                                    Setup the default baseline structures (Structure, Architecture, MEP, Interior, Landscape) to configure estimate parameters.
                                </Text>
                                <TouchableOpacity
                                    style={styles.seedButton}
                                    onPress={handleSeedBaseline}
                                >
                                    <LinearGradient
                                        colors={['#FF453A', '#FF3B30']}
                                        style={StyleSheet.absoluteFill}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                    />
                                    <Ionicons name="flash-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                                    <Text style={styles.seedButtonText}>Seed Default WBS Baseline</Text>
                                </TouchableOpacity>
                            </Animated.View>
                        </View>
                    ) : (
                        /* DATA RENDER TREE */
                        <View>
                            {/* Action Buttons Row: Add Discipline & Reset */}
                            <View style={styles.viewModeContainer}>
                                <TouchableOpacity
                                    onPress={() => setShowAddDisciplineSection(!showAddDisciplineSection)}
                                    style={styles.actionButtonMain}
                                >
                                    <Ionicons name="add-circle-outline" size={16} color="#FF3B30" style={{ marginRight: 6 }} />
                                    <Text style={styles.actionButtonText}>Add Discipline</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={handleSeedBaseline}
                                    style={styles.actionButtonSecondary}
                                    disabled={loading}
                                >
                                    <Ionicons name="sync-outline" size={16} color={textColor} style={{ marginRight: 6 }} />
                                    <Text style={styles.actionButtonSecondaryText}>Reset</Text>
                                </TouchableOpacity>
                            </View>



                            {/* Flat Collapsible Tree */}
                            <View style={styles.treeContainer}>
                                {visibleFlatNodes.map(({ item, level, hasChildren, isCollapsed }) => {
                                    return (
                                        <View key={item.id} style={[styles.treeRowContainer, { borderBottomColor: borderColor }]}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingLeft: 12 + level * 20 }}>
                                                {hasChildren ? (
                                                    <TouchableOpacity
                                                        style={styles.expandToggle}
                                                        onPress={() => toggleExpand(item.id)}
                                                        activeOpacity={0.7}
                                                    >
                                                        <Ionicons
                                                            name={isCollapsed ? "chevron-forward-outline" : "chevron-down-outline"}
                                                            size={16}
                                                            color={subtextColor}
                                                        />
                                                    </TouchableOpacity>
                                                ) : (
                                                    <View style={styles.expandToggleDummy}>
                                                        <View style={[styles.indentDot, { backgroundColor: isDark ? '#3A3A3C' : '#D1D1D6' }]} />
                                                    </View>
                                                )}

                                                <View style={[
                                                    styles.codeBadge,
                                                    level === 0 && [styles.codeBadgeL0, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA', borderColor }],
                                                    level === 1 && [styles.codeBadgeL1, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7', borderColor }],
                                                    level >= 2 && [styles.codeBadgeL2, { backgroundColor: 'transparent', borderColor: 'transparent' }],
                                                ]}>
                                                    <Text style={[
                                                        styles.codeText,
                                                        { color: level === 0 ? textColor : (level === 1 ? subtextColor : '#AEAEB2') },
                                                        level >= 2 && { fontSize: 10 }
                                                    ]}>
                                                        {item.code}
                                                    </Text>
                                                </View>

                                                <View style={styles.nodeTextContainer}>
                                                    <TextInput
                                                        value={item.nameEn}
                                                        onChangeText={(val) => handleInlineNameEdit(item.id, 'nameEn', val)}
                                                        style={[
                                                            styles.inlineInputEn,
                                                            { color: textColor },
                                                            level === 0 && { fontWeight: '700', fontSize: 15 },
                                                            isNodeModified(item) && styles.inlineInputModified
                                                        ]}
                                                        placeholder="English Name"
                                                        placeholderTextColor={isDark ? '#555' : '#999'}
                                                    />
                                                    <TextInput
                                                        value={item.nameId}
                                                        onChangeText={(val) => handleInlineNameEdit(item.id, 'nameId', val)}
                                                        style={[
                                                            styles.inlineInputId,
                                                            { color: subtextColor },
                                                            isNodeModified(item) && styles.inlineInputModified
                                                        ]}
                                                        placeholder="Indonesian Name"
                                                        placeholderTextColor={isDark ? '#444' : '#BBB'}
                                                    />
                                                </View>

                                                {/* Action buttons on the right */}
                                                <View style={styles.rowActionsContainer}>
                                                    <TouchableOpacity
                                                        onPress={() => setSelectedMenuNode(item)}
                                                        style={styles.rowActionBtn}
                                                    >
                                                        <Ionicons name="add-outline" size={16} color="#FF3B30" />
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        onPress={() => deleteNode(item.id)}
                                                        style={styles.rowActionBtn}
                                                    >
                                                        <Ionicons name="trash-outline" size={16} color="#8E8E93" />
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                    )}
                </ScrollView>

            {/* SEEDING PROGRESS MODAL OVERLAY */}
            <Modal
                transparent
                visible={isSeeding}
                animationType="fade"
            >
                <View style={styles.modalBackdrop}>
                    <View style={[styles.modalCard, { backgroundColor: cardBgColor }]}>
                        <ActivityIndicator size="large" color="#FF3B30" style={{ marginBottom: 16 }} />
                        <Text style={[styles.modalTitle, { color: textColor }]}>Generating WBS Baseline</Text>
                        <Text style={[styles.modalProgressText, { color: subtextColor }]}>{seedProgress}</Text>
                        <Text style={[styles.modalDisclaimer, { color: '#FF3B30' }]}>Please do not close the app or navigate away.</Text>
                    </View>
                </View>
            </Modal>

            {/* FLOATING SAVE CHANGES BAR */}
            {hasUnsavedChanges && (
                <View style={[
                    styles.floatingSaveContainerOuter,
                    {
                        bottom: insets.bottom + 16,
                    }
                ]}>
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
                                <Text style={[styles.subtextNew, { color: textColor }]}>
                                    {unsavedChangesCount} change(s) pending
                                </Text>
                            </View>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TouchableOpacity
                                style={[styles.actionButtonNew, { backgroundColor: 'transparent', borderWidth: 1, borderColor: isDark ? '#48484A' : '#E5E5EA' }]}
                                onPress={handleDiscardChanges}
                            >
                                <Text style={{ color: textColor, fontWeight: '600' }}>Discard</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionButtonNew, { backgroundColor: '#FF3B30' }]}
                                onPress={handleSaveChanges}
                            >
                                <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </BlurView>
                </View>
            )}

            {/* ACTION MENU BOTTOM SHEET OVERLAY */}
            <WBSActionsDrawer
                visible={selectedMenuNode !== null}
                onClose={() => setSelectedMenuNode(null)}
                selectedNode={selectedMenuNode}
                activeTab={activeTab}
                addNode={addNode}
                moveNode={moveNode}
                isFirstSibling={isFirstSibling}
                isLastSibling={isLastSibling}
            />

            {/* ADD DISCIPLINE BOTTOM SHEET OVERLAY */}
            <WBSAddDisciplineSheet
                visible={showAddDisciplineSection}
                onClose={() => setShowAddDisciplineSection(false)}
                availableDisciplines={availableDisciplines}
                onAddDiscipline={handleAddDiscipline}
                onAddCustomDiscipline={handleAddCustomDiscipline}
            />
        </>
    );
}

const styles = StyleSheet.create({
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tabBarContainer: {
        width: '100%',
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
    iconButtonsRow: {
        flexDirection: 'row',
        gap: 8,
    },
    smallActionButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyCard: {
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        textAlign: 'center',
        overflow: 'hidden',
        width: '100%',
        marginVertical: 40,
    },
    iconWrapper: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255, 59, 48, 0.12)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 10,
    },
    emptyDesc: {
        fontSize: 14,
        lineHeight: 20,
        textAlign: 'center',
        paddingHorizontal: 16,
        marginBottom: 24,
    },
    seedButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 48,
        paddingHorizontal: 24,
        borderRadius: 24,
        overflow: 'hidden',
    },
    seedButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    viewModeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'android' ? ((RNStatusBar.currentHeight || 24) + 54) : 16,
        gap: 12,
    },
    actionButtonMain: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 59, 48, 0.1)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#FF3B30',
    },
    actionButtonText: {
        color: '#FF3B30',
        fontSize: 13,
        fontWeight: '600',
    },
    actionButtonSecondary: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(142, 142, 147, 0.1)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: 'rgba(142, 142, 147, 0.2)',
    },
    actionButtonSecondaryText: {
        color: '#8E8E93',
        fontSize: 13,
        fontWeight: '600',
    },
    inlineInputEn: {
        fontSize: 14,
        fontWeight: '500',
        paddingVertical: 2,
        paddingHorizontal: 4,
        borderRadius: 4,
    },
    inlineInputId: {
        fontSize: 11,
        fontStyle: 'italic',
        paddingVertical: 1,
        paddingHorizontal: 4,
        borderRadius: 4,
        marginTop: 1,
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
        fontSize: 14,
        fontWeight: '600',
    },
    subtextNew: {
        fontSize: 11,
        opacity: 0.6,
    },
    actionButtonNew: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    disciplineSection: {
        paddingVertical: 14,
        borderBottomWidth: 1,
        gap: 8,
    },
    disciplineHeading: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        paddingHorizontal: 16,
    },
    disciplineScroll: {
        paddingHorizontal: 16,
        gap: 8,
    },
    discBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
    },
    discBadgeCustom: {
        flexDirection: 'row',
        alignItems: 'center',
        borderStyle: 'dashed',
    },
    discBadgeText: {
        fontSize: 12,
        fontWeight: '500',
    },
    customFormCard: {
        marginHorizontal: 16,
        marginTop: 10,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
    },
    customFormHeading: {
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 12,
    },
    inputLabel: {
        fontSize: 10,
        fontWeight: '600',
        marginBottom: 4,
    },
    inputField: {
        height: 36,
        borderRadius: 8,
        borderWidth: 1,
        paddingHorizontal: 10,
        fontSize: 13,
    },
    customFormSubmitButton: {
        backgroundColor: '#FF3B30',
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 4,
    },
    customFormSubmitText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '600',
    },
    treeContainer: {
        marginTop: 12,
    },
    treeRowContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingRight: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    expandToggle: {
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 4,
    },
    expandToggleDummy: {
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 4,
    },
    indentDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
    },
    codeBadge: {
        width: 32,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        marginRight: 8,
    },
    codeBadgeL0: {
        width: 26,
        height: 26,
        borderRadius: 13,
    },
    codeBadgeL1: {
        width: 24,
        height: 24,
        borderRadius: 12,
    },
    codeBadgeL2: {
        width: 'auto',
        minWidth: 24,
        paddingHorizontal: 4,
    },
    codeText: {
        fontSize: 11,
        fontWeight: '700',
    },
    nodeTextContainer: {
        flex: 1,
    },
    nodeNameEn: {
        fontSize: 14,
        fontWeight: '500',
    },
    nodeNameId: {
        fontSize: 11,
        fontStyle: 'italic',
        marginTop: 1,
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalCard: {
        width: '80%',
        padding: 24,
        borderRadius: 20,
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 8,
    },
    modalProgressText: {
        fontSize: 12,
        textAlign: 'center',
        marginBottom: 16,
    },
    inlineInputModified: {
        backgroundColor: 'rgba(255, 149, 0, 0.1)',
        borderColor: 'rgba(255, 149, 0, 0.4)',
        borderWidth: 1,
    },
    rowActionsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingLeft: 8,
    },
    rowActionBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(142, 142, 147, 0.1)',
    },
    menuModalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    menuModalCard: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: Platform.OS === 'android' ? ((RNStatusBar.currentHeight || 24) + 54) : 12,
        paddingHorizontal: 24,
        width: '100%',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.1,
                shadowRadius: 16,
            },
            android: {
                elevation: 10,
            },
        }),
    },
    menuModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    menuModalTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    menuModalSubtitle: {
        fontSize: 12,
        marginTop: 2,
    },
    closeButtonContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuModalOptions: {
        gap: 4,
    },
    sheetDragHandle: {
        width: 36,
        height: 5,
        borderRadius: 2.5,
        alignSelf: 'center',
        marginBottom: 12,
    },
    sheetSectionHeader: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 6,
        marginLeft: 4,
        marginTop: 8,
    },
    sheetGroup: {
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: StyleSheet.hairlineWidth,
        marginBottom: 16,
    },
    sheetOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    iconCircle: {
        width: 28,
        height: 28,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sheetOptionText: {
        fontSize: 15,
        fontWeight: '500',
        marginLeft: 12,
        flex: 1,
    },
    sheetDivider: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 56,
    },
    menuOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderRadius: 8,
    },
    menuOptionText: {
        fontSize: 15,
        fontWeight: '500',
    },
    menuOptionDisabled: {
        opacity: 0.4,
    },
    menuDivider: {
        height: StyleSheet.hairlineWidth,
        marginVertical: 8,
    },
    modalDisclaimer: {
        fontSize: 10,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
});
