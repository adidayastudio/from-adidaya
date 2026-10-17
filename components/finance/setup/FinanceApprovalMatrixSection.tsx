import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    Platform,
} from 'react-native';
import ContextMenu, { ContextMenuAction } from '@/components/ui/PlatformContextMenu';
import * as Haptics from 'expo-haptics';
import { GlassView } from '@/components/ui/GlassView';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { FinanceWorkflowSegmentedPicker } from './FinanceWorkflowSegmentedPicker';
import {
    FinanceApprovalMatrixSettings,
    FinanceDocumentApprovalConfig,
    FinanceApproverLevel,
    FinanceDepartmentApprovalGroup,
    FinanceDocumentRulesSettings,
    OrganizationDepartmentItem,
    OrganizationPositionItem,
    OrganizationEmployeeItem,
    ORGANIZATION_DEPARTMENTS_MASTER,
    getRemainingDepartmentIds,
    getDepartmentGroupTitle,
    formatDepartmentCode,
} from '@/lib/api/financeSetup';
import { FinanceLevelEditModal } from './FinanceLevelEditModal';
import { FinanceGroupEditModal } from './FinanceGroupEditModal';

interface FinanceApprovalMatrixSectionProps {
    isDark: boolean;
    textColor: string;
    subtextColor: string;
    settings: FinanceApprovalMatrixSettings;
    documentRules: FinanceDocumentRulesSettings;
    departments?: OrganizationDepartmentItem[];
    positions?: OrganizationPositionItem[];
    employees?: OrganizationEmployeeItem[];
    onUpdateSettings: (settings: FinanceApprovalMatrixSettings) => void;
    onShowToast: (msg: string) => void;
}

export function FinanceApprovalMatrixSection({
    isDark,
    textColor,
    subtextColor,
    settings,
    documentRules,
    departments = [],
    positions = [],
    employees = [],
    onUpdateSettings,
    onShowToast,
}: FinanceApprovalMatrixSectionProps) {
    const intensity = isDark ? 10 : 25;
    const allDepts = departments && departments.length > 0 ? departments : ORGANIZATION_DEPARTMENTS_MASTER;

    // Subtab state: 'purchasing' | 'reimbursement'
    const [activeWorkflowTab, setActiveWorkflowTab] = useState<'purchasing' | 'reimbursement'>('purchasing');

    // Default collapsed state for all document cards and department subcards
    const [expandedDocKeys, setExpandedDocKeys] = useState<Record<string, boolean>>({});
    const [expandedGroupIds, setExpandedGroupIds] = useState<Record<string, boolean>>({});

    // Level Edit Modal State
    const [isLevelModalOpen, setIsLevelModalOpen] = useState(false);
    const [activeTarget, setActiveTarget] = useState<{
        docKey: string;
        docName: string;
        groupId?: string;
        level?: FinanceApproverLevel | null;
        levelNumber: number;
        existingChain: FinanceApproverLevel[];
    } | null>(null);

    // Group Edit Modal State
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [activeGroupTarget, setActiveGroupTarget] = useState<{
        docKey: string;
        docName: string;
        group?: FinanceDepartmentApprovalGroup | null;
    } | null>(null);

    const toggleDocExpand = (docKey: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setExpandedDocKeys((prev) => ({
            ...prev,
            [docKey]: !prev[docKey],
        }));
    };

    const toggleGroupExpand = (groupId: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setExpandedGroupIds((prev) => ({
            ...prev,
            [groupId]: !prev[groupId],
        }));
    };

    // Active purchasing documents from Document Rules
    const activePurchasingDocs = useMemo(() => {
        const p = documentRules.purchasing.levels;
        const list = [
            {
                key: 'purchasing_request',
                levelNumber: 1,
                systemLevel: 'Request',
                name: p.request.customName || p.request.recommendedName || 'Purchase Request',
                code: p.request.customCode || p.request.recommendedCode || 'PR',
                enabled: p.request.enabled !== false,
            },
            {
                key: 'purchasing_consolidation',
                levelNumber: 2,
                systemLevel: 'Consolidation',
                name: p.consolidation.customName || p.consolidation.recommendedName || 'Purchase Order',
                code: p.consolidation.customCode || p.consolidation.recommendedCode || 'PO',
                enabled: !!p.consolidation.enabled,
            },
            {
                key: 'purchasing_payment',
                levelNumber: 3,
                systemLevel: 'Payment',
                name: p.payment.customName || p.payment.recommendedName || 'Purchase Payment',
                code: p.payment.customCode || p.payment.recommendedCode || 'PP',
                enabled: p.payment.enabled !== false,
            },
        ];
        return list;
    }, [documentRules.purchasing]);

    // Active reimbursement documents from Document Rules
    const activeReimbursementDocs = useMemo(() => {
        const r = documentRules.reimbursement.levels;
        const list = [
            {
                key: 'reimbursement_request',
                levelNumber: 1,
                systemLevel: 'Request',
                name: r.request.customName || r.request.recommendedName || 'Reimbursement Request',
                code: r.request.customCode || r.request.recommendedCode || 'RR',
                enabled: r.request.enabled !== false,
            },
            {
                key: 'reimbursement_consolidation',
                levelNumber: 2,
                systemLevel: 'Consolidation',
                name: r.consolidation.customName || r.consolidation.recommendedName || 'Reimbursement Batch',
                code: r.consolidation.customCode || r.consolidation.recommendedCode || 'RB',
                enabled: !!r.consolidation.enabled,
            },
            {
                key: 'reimbursement_payment',
                levelNumber: 3,
                systemLevel: 'Payment',
                name: r.payment.customName || r.payment.recommendedName || 'Reimbursement Payment',
                code: r.payment.customCode || r.payment.recommendedCode || 'RP',
                enabled: r.payment.enabled !== false,
            },
        ];
        return list;
    }, [documentRules.reimbursement]);

    // Switch document approval scope with full state preservation
    const handleScopeSelect = (
        docKey: string,
        docName: string,
        newScope: 'global' | 'department'
    ) => {
        const currentDoc = settings[docKey] || {
            documentKey: docKey,
            scope: 'global',
            globalChain: [],
            departmentGroups: [],
        };

        if (newScope === currentDoc.scope) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        let nextDoc: FinanceDocumentApprovalConfig;
        if (newScope === 'department') {
            const startingChain = currentDoc.globalChain.length > 0
                ? currentDoc.globalChain
                : [];

            const existingGroups = currentDoc.departmentGroups || [];
            const groupsToUse = existingGroups.length > 0
                ? existingGroups
                : [
                      {
                          id: `grp_rem_${Date.now()}`,
                          isRemainingDepartments: true,
                          departmentIds: [],
                          chain: startingChain.map((l, idx) => ({ ...l, level: idx + 1 })),
                      },
                  ];

            nextDoc = {
                ...currentDoc,
                scope: 'department',
                departmentGroups: groupsToUse,
            };
            onShowToast(`${docName} switched to Per Department`);
        } else {
            nextDoc = {
                ...currentDoc,
                scope: 'global',
            };
            onShowToast(`${docName} switched to Global`);
        }

        onUpdateSettings({
            ...settings,
            [docKey]: nextDoc,
        });
    };

    // Open Level Modal
    const openAddLevel = (
        docKey: string,
        docName: string,
        groupId?: string,
        existingLevelsCount: number = 0,
        chain: FinanceApproverLevel[] = []
    ) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setActiveTarget({
            docKey,
            docName,
            groupId,
            level: null,
            levelNumber: existingLevelsCount + 1,
            existingChain: chain,
        });
        setIsLevelModalOpen(true);
    };

    const openEditLevel = (
        docKey: string,
        docName: string,
        level: FinanceApproverLevel,
        groupId?: string,
        chain: FinanceApproverLevel[] = []
    ) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setActiveTarget({
            docKey,
            docName,
            groupId,
            level,
            levelNumber: level.level,
            existingChain: chain,
        });
        setIsLevelModalOpen(true);
    };

    // Save Level
    const handleSaveLevel = (savedLevel: FinanceApproverLevel) => {
        if (!activeTarget) return;
        const { docKey, groupId } = activeTarget;
        const currentDoc = settings[docKey];
        if (!currentDoc) return;

        if (!groupId) {
            const existingChain = currentDoc.globalChain || [];
            const isEdit = existingChain.some((l) => l.id === savedLevel.id);
            const nextChain = isEdit
                ? existingChain.map((l) => (l.id === savedLevel.id ? savedLevel : l))
                : [...existingChain, savedLevel];

            const updatedDoc: FinanceDocumentApprovalConfig = {
                ...currentDoc,
                globalChain: nextChain.map((l, idx) => ({ ...l, level: idx + 1 })),
            };
            onUpdateSettings({ ...settings, [docKey]: updatedDoc });
            onShowToast(`Saved Level ${savedLevel.level}`);
        } else {
            const updatedGroups = (currentDoc.departmentGroups || []).map((g) => {
                if (g.id === groupId) {
                    const existing = g.chain || [];
                    const isEdit = existing.some((l) => l.id === savedLevel.id);
                    const nextChain = isEdit
                        ? existing.map((l) => (l.id === savedLevel.id ? savedLevel : l))
                        : [...existing, savedLevel];
                    return {
                        ...g,
                        chain: nextChain.map((l, idx) => ({ ...l, level: idx + 1 })),
                    };
                }
                return g;
            });

            const updatedDoc: FinanceDocumentApprovalConfig = {
                ...currentDoc,
                departmentGroups: updatedGroups,
            };
            onUpdateSettings({ ...settings, [docKey]: updatedDoc });
            onShowToast(`Saved Level ${savedLevel.level}`);
        }
    };

    // Delete Level
    const handleDeleteLevel = () => {
        if (!activeTarget || !activeTarget.level) return;
        const { docKey, groupId, level } = activeTarget;
        const currentDoc = settings[docKey];
        if (!currentDoc) return;

        if (!groupId) {
            const nextChain = (currentDoc.globalChain || [])
                .filter((l) => l.id !== level.id)
                .map((l, idx) => ({ ...l, level: idx + 1 }));
            const updatedDoc: FinanceDocumentApprovalConfig = {
                ...currentDoc,
                globalChain: nextChain,
            };
            onUpdateSettings({ ...settings, [docKey]: updatedDoc });
            onShowToast('Level removed');
        } else {
            const updatedGroups = (currentDoc.departmentGroups || []).map((g) => {
                if (g.id === groupId) {
                    return {
                        ...g,
                        chain: (g.chain || [])
                            .filter((l) => l.id !== level.id)
                            .map((l, idx) => ({ ...l, level: idx + 1 })),
                    };
                }
                return g;
            });
            const updatedDoc: FinanceDocumentApprovalConfig = {
                ...currentDoc,
                departmentGroups: updatedGroups,
            };
            onUpdateSettings({ ...settings, [docKey]: updatedDoc });
            onShowToast('Level removed');
        }
    };

    // Reorder Approver Level (Move Up / Move Down)
    const handleMoveLevel = (
        docKey: string,
        groupId: string | undefined,
        fromIndex: number,
        direction: 'up' | 'down'
    ) => {
        const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
        const currentDoc = settings[docKey];
        if (!currentDoc) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        if (!groupId) {
            const chain = [...(currentDoc.globalChain || [])];
            if (toIndex < 0 || toIndex >= chain.length) return;
            const [moved] = chain.splice(fromIndex, 1);
            chain.splice(toIndex, 0, moved);
            const reindexed = chain.map((l, idx) => ({ ...l, level: idx + 1 }));

            const updatedDoc: FinanceDocumentApprovalConfig = {
                ...currentDoc,
                globalChain: reindexed,
            };
            onUpdateSettings({ ...settings, [docKey]: updatedDoc });
            onShowToast(`Moved ${moved.positionTitle} to Level ${toIndex + 1}`);
        } else {
            const updatedGroups = (currentDoc.departmentGroups || []).map((g) => {
                if (g.id === groupId) {
                    const chain = [...(g.chain || [])];
                    if (toIndex < 0 || toIndex >= chain.length) return g;
                    const [moved] = chain.splice(fromIndex, 1);
                    chain.splice(toIndex, 0, moved);
                    const reindexed = chain.map((l, idx) => ({ ...l, level: idx + 1 }));
                    return {
                        ...g,
                        chain: reindexed,
                    };
                }
                return g;
            });

            const updatedDoc: FinanceDocumentApprovalConfig = {
                ...currentDoc,
                departmentGroups: updatedGroups,
            };
            onUpdateSettings({ ...settings, [docKey]: updatedDoc });
            onShowToast('Approver levels reordered');
        }
    };

    // Open Group Modal
    const openAddGroup = (docKey: string, docName: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setActiveGroupTarget({
            docKey,
            docName,
            group: null,
        });
        setIsGroupModalOpen(true);
    };

    const openEditGroup = (docKey: string, docName: string, group: FinanceDepartmentApprovalGroup) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setActiveGroupTarget({
            docKey,
            docName,
            group,
        });
        setIsGroupModalOpen(true);
    };

    // Save Group
    const handleSaveGroup = (assignedDeptIds: string[]) => {
        if (!activeGroupTarget) return;
        const { docKey, group } = activeGroupTarget;
        const currentDoc = settings[docKey];
        if (!currentDoc) return;

        const defaultChain = (currentDoc.globalChain && currentDoc.globalChain.length > 0)
            ? currentDoc.globalChain.map((l, idx) => ({ ...l, level: idx + 1 }))
            : [];

        let updatedExplicit: FinanceDepartmentApprovalGroup[];
        if (group) {
            updatedExplicit = (currentDoc.departmentGroups || [])
                .filter((g) => !g.isRemainingDepartments)
                .map((g) => (g.id === group.id ? { ...g, departmentIds: assignedDeptIds } : g));
        } else {
            const newGroup: FinanceDepartmentApprovalGroup = {
                id: `grp_${Date.now()}`,
                departmentIds: assignedDeptIds,
                chain: defaultChain,
            };
            const existingExplicit = (currentDoc.departmentGroups || []).filter((g) => !g.isRemainingDepartments);
            updatedExplicit = [...existingExplicit, newGroup];
        }

        const remainingIds = getRemainingDepartmentIds(updatedExplicit, allDepts);
        let finalGroups = [...updatedExplicit];

        if (remainingIds.length > 0) {
            const existingRem = (currentDoc.departmentGroups || []).find((g) => g.isRemainingDepartments);
            finalGroups.push({
                id: existingRem?.id || `grp_rem_${Date.now()}`,
                isRemainingDepartments: true,
                departmentIds: [],
                chain: existingRem?.chain || defaultChain,
            });
        }

        const updatedDoc: FinanceDocumentApprovalConfig = {
            ...currentDoc,
            departmentGroups: finalGroups,
        };
        onUpdateSettings({ ...settings, [docKey]: updatedDoc });
        onShowToast('Approval group saved');
    };

    // Delete Group
    const handleDeleteGroup = () => {
        if (!activeGroupTarget || !activeGroupTarget.group) return;
        const { docKey, group } = activeGroupTarget;
        const currentDoc = settings[docKey];
        if (!currentDoc || group.isRemainingDepartments) return;

        const remainingExplicit = (currentDoc.departmentGroups || []).filter(
            (g) => !g.isRemainingDepartments && g.id !== group.id
        );

        const defaultChain = (currentDoc.globalChain && currentDoc.globalChain.length > 0)
            ? currentDoc.globalChain.map((l, idx) => ({ ...l, level: idx + 1 }))
            : [];

        let finalGroups = [...remainingExplicit];
        const existingRem = (currentDoc.departmentGroups || []).find((g) => g.isRemainingDepartments);
        finalGroups.push({
            id: existingRem?.id || `grp_rem_${Date.now()}`,
            isRemainingDepartments: true,
            departmentIds: [],
            chain: existingRem?.chain || defaultChain,
        });

        const updatedDoc: FinanceDocumentApprovalConfig = {
            ...currentDoc,
            departmentGroups: finalGroups,
        };
        onUpdateSettings({ ...settings, [docKey]: updatedDoc });
        onShowToast('Approval group removed');
    };

    // Show Remaining Departments Details Alert
    const handleShowRemainingDeptsInfo = (remDepts: OrganizationDepartmentItem[]) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const deptNames = remDepts.map((d) => `• ${d.name} (${formatDepartmentCode(d.code, d.name)})`).join('\n');
        Alert.alert(
            `Remaining Departments (${remDepts.length})`,
            `These departments do not have a specific approval group and automatically use this approval chain:\n\n${deptNames}`,
            [{ text: 'OK' }]
        );
    };

    // Render tree levels list
    const renderChainLevelsTree = (
        chain: FinanceApproverLevel[],
        docKey: string,
        docName: string,
        groupId?: string
    ) => {
        return (
            <View style={s.treeContainer}>
                {chain.length === 0 ? (
                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => openAddLevel(docKey, docName, groupId, 0, chain)}
                        style={s.treeAddRow}
                    >
                        <Text style={[s.treeBranchSymbol, { color: subtextColor }]}>└──</Text>
                        <Text style={[s.emptyChainText, { color: subtextColor }]}>
                            No approval chain configured. Tap to setup.
                        </Text>
                    </TouchableOpacity>
                ) : (
                    chain.map((step, sIdx) => {
                        const isLast = sIdx === chain.length - 1;
                        const hasPerson = !!step.personName && step.personName !== 'No person assigned';

                        return (
                            <View key={step.id || `step-${sIdx}`} style={s.treeStepRowWrapper}>
                                <TouchableOpacity
                                    activeOpacity={0.7}
                                    onPress={() => openEditLevel(docKey, docName, step, groupId, chain)}
                                    style={s.treeStepRow}
                                >
                                    <Text style={[s.treeBranchSymbol, { color: isDark ? '#6E6E73' : '#AEAEB2' }]}>
                                        {isLast ? '└──' : '├──'}
                                    </Text>
                                    <View
                                        style={[
                                            s.treeLevelPill,
                                            {
                                                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                                            },
                                        ]}
                                    >
                                        <Text style={[s.treeLevelPillText, { color: textColor }]}>
                                            L{step.level || sIdx + 1}
                                        </Text>
                                    </View>
                                    <View style={s.treeStepTextCol}>
                                        <Text style={[s.treePositionText, { color: textColor }]}>
                                            {step.positionTitle}
                                        </Text>
                                        <Text
                                            style={[
                                                s.treePersonText,
                                                { color: hasPerson ? subtextColor : '#FF9500' },
                                            ]}
                                        >
                                            {hasPerson ? step.personName : 'No person assigned'}
                                        </Text>
                                    </View>
                                </TouchableOpacity>

                                {/* Reorder Level Buttons when chain has multiple levels */}
                                {chain.length > 1 && (
                                    <View style={s.reorderCol}>
                                        {sIdx > 0 && (
                                            <TouchableOpacity
                                                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                                onPress={() => handleMoveLevel(docKey, groupId, sIdx, 'up')}
                                                style={s.reorderBtn}
                                            >
                                                <PlatformIcon name="chevron.up" size={11} tintColor={subtextColor} />
                                            </TouchableOpacity>
                                        )}
                                        {sIdx < chain.length - 1 && (
                                            <TouchableOpacity
                                                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                                onPress={() => handleMoveLevel(docKey, groupId, sIdx, 'down')}
                                                style={s.reorderBtn}
                                            >
                                                <PlatformIcon name="chevron.down" size={11} tintColor={subtextColor} />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                )}
                            </View>
                        );
                    })
                )}

                {/* + Add Level Row */}
                <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => openAddLevel(docKey, docName, groupId, chain.length, chain)}
                    style={s.treeAddRow}
                >
                    <Text style={[s.treeBranchSymbol, { color: isDark ? '#3A3A3C' : '#D1D1D6' }]}>
                        {chain.length > 0 ? '   ' : '   '}
                    </Text>
                    <Text style={[s.treeAddBtnText, { color: '#007AFF' }]}>
                        + Add Level
                    </Text>
                </TouchableOpacity>
            </View>
        );
    };

    // Render individual Document Card
    const renderDocumentCard = (
        doc: { key: string; levelNumber: number; systemLevel: string; name: string; code: string; enabled?: boolean },
        colorTheme: 'blue' | 'orange'
    ) => {
        const docConfig = settings[doc.key] || {
            documentKey: doc.key,
            scope: 'global',
            globalChain: [],
            departmentGroups: [],
        };

        const isExpanded = !!expandedDocKeys[doc.key];
        const isGlobal = docConfig.scope === 'global';
        const globalLevels = docConfig.globalChain || [];
        const deptGroups = docConfig.departmentGroups || [];
        const themeColor = colorTheme === 'blue' ? '#007AFF' : '#FF9500';

        // Calculate Remaining Departments list
        const remDeptIds = getRemainingDepartmentIds(deptGroups, allDepts);
        const remDepts = remDeptIds
            .map((id) => allDepts.find((d) => d.id === id))
            .filter(Boolean) as OrganizationDepartmentItem[];

        if (!doc.enabled) {
            return (
                <View key={doc.key} style={s.docCardWrapper}>
                    <GlassView
                        intensity={intensity}
                        style={[
                            s.docParentCard,
                            {
                                opacity: 0.75,
                                backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.7)',
                                borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                            },
                        ]}
                    >
                        <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => toggleDocExpand(doc.key)}
                            style={s.docHeaderRow}
                        >
                            <View
                                style={[
                                    s.levelBadge,
                                    {
                                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                                    },
                                ]}
                            >
                                <Text style={[s.levelBadgeText, { color: subtextColor }]}>
                                    {doc.levelNumber}
                                </Text>
                            </View>

                            <View style={s.docTitleCol}>
                                <Text style={[s.docNameText, { color: subtextColor }]}>
                                    {doc.systemLevel}
                                </Text>
                                <Text style={[s.docLevelSubtitle, { color: subtextColor }]}>
                                    Off · Direct to Payment
                                </Text>
                            </View>

                            <View
                                style={[
                                    s.offPill,
                                    {
                                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                                    },
                                ]}
                            >
                                <Text style={[s.offPillText, { color: subtextColor }]}>
                                    OFF
                                </Text>
                            </View>

                            <View style={s.plainChevronBtn}>
                                <PlatformIcon
                                    name={isExpanded ? 'chevron.up' : 'chevron.down'}
                                    size={13}
                                    tintColor={subtextColor}
                                />
                            </View>
                        </TouchableOpacity>

                        {isExpanded && (
                            <View style={s.disabledExplanationContainer}>
                                <View
                                    style={[
                                        s.docDivider,
                                        {
                                            backgroundColor: isDark
                                                ? 'rgba(255,255,255,0.06)'
                                                : 'rgba(0,0,0,0.06)',
                                        },
                                    ]}
                                />
                                <View style={s.disabledContentBox}>
                                    <Text style={[s.disabledHeading, { color: textColor }]}>
                                        Consolidation is currently disabled
                                    </Text>
                                    <Text style={[s.disabledSubtext, { color: subtextColor }]}>
                                        Requests currently proceed directly to Payment without a consolidation stage. Enable Consolidation in Finance Document Rules to configure its approval matrix.
                                    </Text>
                                </View>
                            </View>
                        )}
                    </GlassView>
                </View>
            );
        }

        return (
            <View key={doc.key} style={s.docCardWrapper}>
                {/* 1. Main Document Parent Card */}
                <GlassView
                    intensity={intensity}
                    style={[
                        s.docParentCard,
                        {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.035)' : 'rgba(255,255,255,0.92)',
                            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                        },
                    ]}
                >
                    {/* Header Row: Level Icon + Name + Scope Button + Chevron */}
                    <View style={s.docHeaderRow}>
                        <View
                            style={[
                                s.levelBadge,
                                {
                                    backgroundColor: isDark ? `${themeColor}25` : `${themeColor}15`,
                                },
                            ]}
                        >
                            <Text style={[s.levelBadgeText, { color: themeColor }]}>
                                {doc.levelNumber}
                            </Text>
                        </View>

                        <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => toggleDocExpand(doc.key)}
                            style={s.docTitleCol}
                        >
                            <View style={s.docTitleRow}>
                                <Text style={[s.docLevelSubtitle, { color: subtextColor }]}>
                                    {doc.systemLevel}
                                </Text>
                                <Text style={[s.bulletText, { color: subtextColor }]}>·</Text>
                                <Text style={[s.docCodeText, { color: subtextColor }]}>
                                    {doc.code}
                                </Text>
                            </View>
                            <Text style={[s.docNameText, { color: textColor }]}>
                                {doc.name}
                            </Text>
                        </TouchableOpacity>

                        {/* Native Pull-Down Context Menu for Scope */}
                        <ContextMenu
                            dropdownMenuMode={true}
                            title={`Approval Scope`}
                            actions={[
                                {
                                    title: 'Global',
                                    selected: isGlobal,
                                    systemIcon: 'globe',
                                },
                                {
                                    title: 'Per Department',
                                    selected: !isGlobal,
                                    systemIcon: 'building.2',
                                },
                            ]}
                            onPress={(e) => {
                                Haptics.selectionAsync();
                                if (e.nativeEvent.index === 0) {
                                    handleScopeSelect(doc.key, doc.name, 'global');
                                } else if (e.nativeEvent.index === 1) {
                                    handleScopeSelect(doc.key, doc.name, 'department');
                                }
                            }}
                        >
                            <View
                                style={[
                                    s.scopePillBtn,
                                    {
                                        backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                                    },
                                ]}
                            >
                                <Text style={[s.scopePillBtnText, { color: isDark ? '#FFFFFF' : '#1C1C1E' }]}>
                                    {isGlobal ? 'Global' : 'Per Department'}
                                </Text>
                                <PlatformIcon name="chevron.down" size={10} tintColor={subtextColor} />
                            </View>
                        </ContextMenu>

                        {/* Expand / Collapse Chevron */}
                        <TouchableOpacity
                            activeOpacity={0.6}
                            onPress={() => toggleDocExpand(doc.key)}
                            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                            style={s.plainChevronBtn}
                        >
                            <PlatformIcon
                                name={isExpanded ? 'chevron.up' : 'chevron.down'}
                                size={14}
                                tintColor={subtextColor}
                            />
                        </TouchableOpacity>
                    </View>

                    {/* Mode A: Global Direct Levels Preview when Expanded */}
                    {isExpanded && isGlobal && (
                        <>
                            <View
                                style={[
                                    s.docDivider,
                                    {
                                        backgroundColor: isDark
                                            ? 'rgba(255,255,255,0.06)'
                                            : 'rgba(0,0,0,0.06)',
                                    },
                                ]}
                            />
                            {renderChainLevelsTree(globalLevels, doc.key, doc.name)}
                        </>
                    )}
                </GlassView>

                {/* Mode B: Per Department Subcards Tree when Expanded */}
                {isExpanded && !isGlobal && (
                    <View style={s.deptSubcardsWrapper}>
                        {/* Tree connector vertical branch line */}
                        <View
                            style={[
                                s.deptTreeBranchLine,
                                {
                                    backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.14)',
                                },
                            ]}
                        />

                        {/* Department Subcards List */}
                        <View style={s.deptSubcardsContainer}>
                            {deptGroups.map((group) => {
                                const groupTitle = getDepartmentGroupTitle(group, allDepts);
                                const isGroupExpanded = expandedGroupIds[group.id] !== undefined ? !!expandedGroupIds[group.id] : true;
                                const chain = group.chain || [];
                                const isRemaining = !!group.isRemainingDepartments;

                                // Subtitle logic for remaining vs explicit
                                let subtitleContent = null;
                                if (isRemaining) {
                                    const maxCodesToShow = 3;
                                    const displayedCodes = remDepts.slice(0, maxCodesToShow).map((d) => formatDepartmentCode(d.code, d.name));
                                    const extraCount = remDepts.length - maxCodesToShow;

                                    subtitleContent = (
                                        <View style={s.remainingSubtitleRow}>
                                            <Text style={[s.groupSubtitleText, { color: subtextColor }]}>
                                                {`${remDepts.length} ${remDepts.length === 1 ? 'dept' : 'depts'} · ${chain.length} ${chain.length === 1 ? 'level' : 'levels'}`}
                                            </Text>
                                            {remDepts.length > 0 && (
                                                <>
                                                    <Text style={[s.bulletText, { color: subtextColor }]}>·</Text>
                                                    <Text style={[s.remainingCodesText, { color: isDark ? '#A1A1A6' : '#6E6E73' }]}>
                                                        {displayedCodes.join(', ')}
                                                    </Text>
                                                    {extraCount > 0 && (
                                                        <TouchableOpacity
                                                            activeOpacity={0.6}
                                                            onPress={() => handleShowRemainingDeptsInfo(remDepts)}
                                                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                                            style={s.extraDeptsBadge}
                                                        >
                                                            <Text style={s.extraDeptsBadgeText}>+{extraCount}</Text>
                                                        </TouchableOpacity>
                                                    )}
                                                </>
                                            )}
                                        </View>
                                    );
                                } else {
                                    subtitleContent = (
                                        <Text style={[s.groupSubtitleText, { color: subtextColor }]}>
                                            {`${group.departmentIds.length} ${group.departmentIds.length === 1 ? 'dept' : 'depts'} · ${chain.length} ${chain.length === 1 ? 'level' : 'levels'}`}
                                        </Text>
                                    );
                                }

                                return (
                                    <GlassView
                                        key={group.id}
                                        intensity={intensity}
                                        style={[
                                            s.deptSubcard,
                                            {
                                                backgroundColor: isDark
                                                    ? 'rgba(255,255,255,0.035)'
                                                    : 'rgba(255,255,255,0.88)',
                                                borderColor: isDark
                                                    ? 'rgba(255,255,255,0.08)'
                                                    : 'rgba(0,0,0,0.06)',
                                            },
                                        ]}
                                    >
                                        {/* Subcard Header */}
                                        <View style={s.deptSubcardHeader}>
                                            <TouchableOpacity
                                                activeOpacity={0.7}
                                                onPress={() => toggleGroupExpand(group.id)}
                                                style={{ flex: 1, gap: 2 }}
                                            >
                                                <Text style={[s.groupNameText, { color: textColor }]}>
                                                    {groupTitle}
                                                </Text>
                                                {subtitleContent}
                                            </TouchableOpacity>

                                            {!isRemaining && (
                                                <TouchableOpacity
                                                    activeOpacity={0.7}
                                                    onPress={() => openEditGroup(doc.key, doc.name, group)}
                                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                                    style={[s.editGroupBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
                                                >
                                                    <PlatformIcon name="pencil" size={11} tintColor={subtextColor} />
                                                    <Text style={[s.editGroupText, { color: subtextColor }]}>Edit</Text>
                                                </TouchableOpacity>
                                            )}

                                            {/* Expand/Collapse Chevron for this Group */}
                                            <TouchableOpacity
                                                activeOpacity={0.6}
                                                onPress={() => toggleGroupExpand(group.id)}
                                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                                style={s.plainChevronBtn}
                                            >
                                                <PlatformIcon
                                                    name={isGroupExpanded ? 'chevron.up' : 'chevron.down'}
                                                    size={13}
                                                    tintColor={subtextColor}
                                                />
                                            </TouchableOpacity>
                                        </View>

                                        {/* Group's Approval Chain Tree */}
                                        {isGroupExpanded && (
                                            <>
                                                <View
                                                    style={[
                                                        s.docDivider,
                                                        {
                                                            backgroundColor: isDark
                                                                ? 'rgba(255,255,255,0.06)'
                                                                : 'rgba(0,0,0,0.06)',
                                                        },
                                                    ]}
                                                />
                                                {renderChainLevelsTree(chain, doc.key, doc.name, group.id)}
                                            </>
                                        )}
                                    </GlassView>
                                );
                            })}

                            {/* + Add Approval Group Button */}
                            <TouchableOpacity
                                activeOpacity={0.7}
                                onPress={() => openAddGroup(doc.key, doc.name)}
                                style={[
                                    s.addGroupBtn,
                                    {
                                        backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                                        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                                    },
                                ]}
                            >
                                <PlatformIcon name="plus" size={13} tintColor={textColor} />
                                <Text style={[s.addGroupBtnText, { color: textColor }]}>
                                    Add Approval Group
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>
        );
    };

    const isPurchasing = activeWorkflowTab === 'purchasing';

    return (
        <View style={s.container}>
            {/* Native SwiftUI Segmented Control */}
            <View style={s.segmentedWrapper}>
                <FinanceWorkflowSegmentedPicker
                    activeTab={activeWorkflowTab}
                    onTabChange={setActiveWorkflowTab}
                />
            </View>

            {/* Active Workflow Tab Content */}
            {isPurchasing ? (
                <View style={s.sectionBlock}>
                    <View style={s.sectionHeaderRow}>
                        <Text style={[s.sectionHeaderTitle, { color: subtextColor }]}>
                            Purchasing workflows ({activePurchasingDocs.filter((d) => d.enabled).length} active)
                        </Text>
                    </View>
                    <View style={s.docsGrid}>
                        {activePurchasingDocs.map((doc) => renderDocumentCard(doc, 'blue'))}
                    </View>
                </View>
            ) : (
                <View style={s.sectionBlock}>
                    <View style={s.sectionHeaderRow}>
                        <Text style={[s.sectionHeaderTitle, { color: subtextColor }]}>
                            Reimbursement workflows ({activeReimbursementDocs.filter((d) => d.enabled).length} active)
                        </Text>
                    </View>
                    <View style={s.docsGrid}>
                        {activeReimbursementDocs.map((doc) => renderDocumentCard(doc, 'orange'))}
                    </View>
                </View>
            )}

            {/* Focused Approver Level Edit Modal */}
            {activeTarget && (
                <FinanceLevelEditModal
                    visible={isLevelModalOpen}
                    onClose={() => {
                        setIsLevelModalOpen(false);
                        setActiveTarget(null);
                    }}
                    level={activeTarget.level}
                    levelNumber={activeTarget.levelNumber}
                    title={activeTarget.level ? `Edit Level ${activeTarget.level.level}` : `Add Level ${activeTarget.levelNumber}`}
                    existingChain={activeTarget.existingChain}
                    positions={positions}
                    employees={employees}
                    onSave={handleSaveLevel}
                    onDelete={activeTarget.level ? handleDeleteLevel : undefined}
                />
            )}

            {/* Focused Department Group Edit Modal */}
            {activeGroupTarget && (
                <FinanceGroupEditModal
                    visible={isGroupModalOpen}
                    onClose={() => {
                        setIsGroupModalOpen(false);
                        setActiveGroupTarget(null);
                    }}
                    group={activeGroupTarget.group}
                    allGroups={settings[activeGroupTarget.docKey]?.departmentGroups || []}
                    allDepartments={allDepts}
                    onSave={handleSaveGroup}
                    onDelete={activeGroupTarget.group && !activeGroupTarget.group.isRemainingDepartments ? handleDeleteGroup : undefined}
                />
            )}
        </View>
    );
}

const s = StyleSheet.create({
    container: {
        gap: 12,
    },
    segmentedWrapper: {
        marginBottom: 2,
    },
    sectionBlock: {
        gap: 8,
    },
    sectionHeaderRow: {
        paddingHorizontal: 4,
        paddingBottom: 2,
    },
    sectionHeaderTitle: {
        fontSize: 13,
        fontWeight: '500',
        letterSpacing: -0.1,
    },
    docsGrid: {
        gap: 14,
    },
    docCardWrapper: {
        gap: 8,
    },
    docParentCard: {
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: StyleSheet.hairlineWidth,
        paddingVertical: 14,
        paddingHorizontal: 16,
        gap: 10,
    },
    docHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    levelBadge: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    levelBadgeText: {
        fontSize: 14,
        fontWeight: '700',
    },
    docTitleCol: {
        flex: 1,
        gap: 2,
    },
    docTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    docLevelSubtitle: {
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 0.2,
    },
    bulletText: {
        fontSize: 10,
    },
    docCodeText: {
        fontSize: 11,
        fontWeight: '600',
    },
    docNameText: {
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: -0.3,
        flexWrap: 'wrap',
    },
    scopePillBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderRadius: 12,
    },
    scopePillBtnText: {
        fontSize: 12,
        fontWeight: '600',
    },
    plainChevronBtn: {
        padding: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    docDivider: {
        height: StyleSheet.hairlineWidth,
        marginVertical: 1,
    },
    offPill: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    offPillText: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    disabledExplanationContainer: {
        paddingTop: 4,
    },
    disabledContentBox: {
        paddingTop: 8,
        gap: 4,
    },
    disabledHeading: {
        fontSize: 14,
        fontWeight: '600',
    },
    disabledSubtext: {
        fontSize: 13,
        fontWeight: '400',
        lineHeight: 18,
    },
    treeContainer: {
        paddingLeft: 4,
        gap: 6,
    },
    treeStepRowWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 2,
    },
    treeStepRow: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    reorderCol: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingLeft: 8,
    },
    reorderBtn: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: 'rgba(142, 142, 147, 0.12)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    treeBranchSymbol: {
        fontSize: 13,
        fontFamily: 'Courier',
        fontWeight: '700',
    },
    treeLevelPill: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    treeLevelPillText: {
        fontSize: 11,
        fontWeight: '700',
    },
    treeStepTextCol: {
        flex: 1,
        gap: 1,
    },
    treePositionText: {
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    treePersonText: {
        fontSize: 12,
        fontWeight: '400',
    },
    treeAddRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 4,
    },
    treeAddBtnText: {
        fontSize: 13,
        fontWeight: '600',
    },
    emptyChainText: {
        fontSize: 12,
        fontStyle: 'italic',
    },
    deptSubcardsWrapper: {
        flexDirection: 'row',
        paddingLeft: 14,
        gap: 12,
    },
    deptTreeBranchLine: {
        width: 2,
        borderRadius: 1,
        marginVertical: 4,
    },
    deptSubcardsContainer: {
        flex: 1,
        gap: 10,
    },
    deptSubcard: {
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: StyleSheet.hairlineWidth,
        paddingVertical: 12,
        paddingHorizontal: 14,
        gap: 8,
    },
    deptSubcardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    groupNameText: {
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    groupSubtitleText: {
        fontSize: 11,
        fontWeight: '400',
    },
    remainingSubtitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 4,
    },
    remainingCodesText: {
        fontSize: 11,
        fontWeight: '600',
    },
    extraDeptsBadge: {
        paddingHorizontal: 5,
        paddingVertical: 1,
        borderRadius: 6,
        backgroundColor: 'rgba(0,122,255,0.12)',
    },
    extraDeptsBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#007AFF',
    },
    addGroupBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderRadius: 14,
        borderWidth: StyleSheet.hairlineWidth,
    },
    addGroupBtnText: {
        fontSize: 13,
        fontWeight: '600',
    },
    editGroupBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    editGroupText: {
        fontSize: 12,
        fontWeight: '500',
    },
});
export default FinanceApprovalMatrixSection;
