import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Platform,
    LayoutAnimation,
    UIManager,
} from 'react-native';
import ContextMenu, { ContextMenuAction } from '@/components/ui/PlatformContextMenu';
import * as Haptics from 'expo-haptics';
import { GlassView } from '@/components/ui/GlassView';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { IOSSwitch } from '@/components/ui/IOSSwitch';
import {
    FinanceDocumentRulesSettings,
    DocumentWorkflowConfig,
    DocumentLevelConfig,
    DocumentLevelType,
    SequenceScope,
    SequenceReset,
    SEQUENCE_RESET_OPTIONS,
    SEQUENCE_LENGTH_OPTIONS,
    generateDocumentNumberPreview,
    generateDocumentNumberShortPreview,
} from '@/lib/api/financeSetup';
import { useTenantContext } from '@/context/TenantContext';
import { FinanceDocumentLevelsGuideSheet } from './FinanceDocumentLevelsGuideSheet';

if (
    Platform.OS === 'android' &&
    UIManager.setLayoutAnimationEnabledExperimental
) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface FinanceDocumentRulesSectionProps {
    isDark: boolean;
    textColor: string;
    subtextColor: string;
    rules: FinanceDocumentRulesSettings;
    onUpdateRules: (newRules: FinanceDocumentRulesSettings) => void;
}

export function FinanceDocumentRulesSection({
    isDark,
    textColor,
    subtextColor,
    rules,
    onUpdateRules,
}: FinanceDocumentRulesSectionProps) {
    const { activeTenant } = useTenantContext();
    const tenantCode = (activeTenant?.company_code || 'ADY').replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase() || 'ADY';

    const [guideSheetVisible, setGuideSheetVisible] = useState(false);
    const [expandedCardKey, setExpandedCardKey] = useState<string | null>(null);

    const toggleCard = (key: string) => {
        Haptics.selectionAsync();
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedCardKey((prev) => (prev === key ? null : key));
    };

    // Duplicate code detector
    const allConfiguredCodes = useMemo(() => {
        const list: { key: string; code: string }[] = [];
        if (rules.purchasing) {
            const p = rules.purchasing.levels;
            list.push({ key: 'purchasing_request', code: p.request.customCode.trim().toUpperCase() });
            if (p.consolidation.enabled) {
                list.push({ key: 'purchasing_consolidation', code: p.consolidation.customCode.trim().toUpperCase() });
            }
            list.push({ key: 'purchasing_payment', code: p.payment.customCode.trim().toUpperCase() });
        }
        if (rules.reimbursement) {
            const r = rules.reimbursement.levels;
            list.push({ key: 'reimbursement_request', code: r.request.customCode.trim().toUpperCase() });
            if (r.consolidation.enabled) {
                list.push({ key: 'reimbursement_consolidation', code: r.consolidation.customCode.trim().toUpperCase() });
            }
            list.push({ key: 'reimbursement_payment', code: r.payment.customCode.trim().toUpperCase() });
        }
        return list;
    }, [rules]);

    const handleToggleConsolidation = (
        workflowType: 'purchasing' | 'reimbursement',
        enabled: boolean
    ) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        const updatedWorkflow: DocumentWorkflowConfig = {
            ...rules[workflowType],
            levels: {
                ...rules[workflowType].levels,
                consolidation: {
                    ...rules[workflowType].levels.consolidation,
                    enabled,
                },
            },
        };
        onUpdateRules({
            ...rules,
            [workflowType]: updatedWorkflow,
        });
    };

    const handleUpdateLevel = (
        workflowType: 'purchasing' | 'reimbursement',
        levelType: DocumentLevelType,
        changes: Partial<DocumentLevelConfig>
    ) => {
        const updatedWorkflow: DocumentWorkflowConfig = {
            ...rules[workflowType],
            levels: {
                ...rules[workflowType].levels,
                [levelType]: {
                    ...rules[workflowType].levels[levelType],
                    ...changes,
                },
            },
        };

        onUpdateRules({
            ...rules,
            [workflowType]: updatedWorkflow,
        });
    };

    // Render Inset Grouped Level Card
    const renderLevelCard = (
        workflowType: 'purchasing' | 'reimbursement',
        levelType: DocumentLevelType
    ) => {
        const levelConfig: DocumentLevelConfig = rules[workflowType].levels[levelType];
        const cardKey = `${workflowType}_${levelType}`;
        const isExpanded = expandedCardKey === cardKey;
        const isConsolidation = levelType === 'consolidation';
        const isLevelDisabled = isConsolidation && !levelConfig.enabled;
        const themeColor = workflowType === 'purchasing' ? '#007AFF' : '#FF9500';

        // When Consolidation is OFF, show only simple inactive toggle row without document name or code
        if (isLevelDisabled) {
            return (
                <View
                    key={cardKey}
                    style={[
                        s.card,
                        {
                            backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                            borderWidth: 1,
                            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                        },
                        s.cardDisabled,
                    ]}
                >
                    <View style={s.headerRow}>
                        <View style={s.headerTextCol}>
                            <View style={s.levelBadgeRow}>
                                <View
                                    style={[
                                        s.dotNumberBadge,
                                        {
                                            backgroundColor: isDark
                                                ? 'rgba(255,255,255,0.08)'
                                                : 'rgba(0,0,0,0.06)',
                                        },
                                    ]}
                                >
                                    <Text style={[s.dotNumberText, { color: subtextColor }]}>2</Text>
                                </View>
                                <Text style={[s.levelSystemNumber, { color: subtextColor }]}>
                                    Consolidation
                                </Text>
                            </View>
                            <Text style={[s.headerPreviewText, { color: subtextColor }]}>
                                Off · Direct to Payment
                            </Text>
                        </View>

                        <View style={s.headerRightCol}>
                            <IOSSwitch
                                value={false}
                                onValueChange={(val) => {
                                    handleToggleConsolidation(workflowType, val);
                                }}
                                activeColor="#159957"
                            />
                        </View>
                    </View>
                </View>
            );
        }

        const isCodeDuplicate =
            levelConfig.customCode.trim().length > 0 &&
            allConfiguredCodes.filter(
                (c) => c.code === levelConfig.customCode.trim().toUpperCase() && c.key !== cardKey
            ).length > 0;

        const isConsEnabled = rules[workflowType].levels.consolidation.enabled;

        const previewString = generateDocumentNumberPreview(
            levelConfig.customCode,
            levelConfig.sequenceLength,
            levelConfig.sequenceScope,
            levelConfig.sequenceReset,
            tenantCode,
            '00001'
        );

        const shortPreviewString = generateDocumentNumberShortPreview(
            levelConfig.customCode,
            levelConfig.sequenceLength,
            levelConfig.sequenceScope,
            '00001'
        );

        // Native Context Menu Actions
        const lengthActions: ContextMenuAction[] = SEQUENCE_LENGTH_OPTIONS.map((opt) => ({
            title: `${opt.label} (${opt.preview})`,
            selected: levelConfig.sequenceLength === opt.value,
        }));

        const refScopeTitle = isConsEnabled ? 'By Consolidation Number' : 'By Request Number';
        const refScopeSubtitle = isConsEnabled ? 'Inherited from Consolidation.' : 'Inherited from Request.';

        const scopeActions: ContextMenuAction[] = [
            {
                title: 'Global',
                subtitle: 'Single sequence across all transactions.',
                selected: levelConfig.sequenceScope === 'global',
            },
            {
                title: 'By Project/Department',
                subtitle: 'Separated per project or department.',
                selected: levelConfig.sequenceScope === 'contextual' || levelConfig.sequenceScope === 'project' || levelConfig.sequenceScope === 'department',
            },
            ...(levelType === 'payment'
                ? [
                      {
                          title: refScopeTitle,
                          subtitle: refScopeSubtitle,
                          selected: levelConfig.sequenceScope === 'reference',
                      },
                  ]
                : []),
        ];

        const resetActions: ContextMenuAction[] = SEQUENCE_RESET_OPTIONS.map((opt) => ({
            title: opt.label,
            subtitle: opt.description,
            selected: levelConfig.sequenceReset === opt.value,
        }));

        const currentLengthLabel = `${levelConfig.sequenceLength || 5} Digits`;
        let currentScopeLabel = 'Global';
        if (levelConfig.sequenceScope === 'reference') {
            currentScopeLabel = refScopeTitle;
        } else if (
            levelConfig.sequenceScope === 'contextual' ||
            levelConfig.sequenceScope === 'project' ||
            levelConfig.sequenceScope === 'department'
        ) {
            currentScopeLabel = 'By Project/Department';
        }

        const currentResetLabel =
            SEQUENCE_RESET_OPTIONS.find((r) => r.value === levelConfig.sequenceReset)?.label || 'Yearly';

        return (
            <View
                key={cardKey}
                style={[
                    s.card,
                    {
                        backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                        borderWidth: 1,
                        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                    },
                ]}
            >
                {/* Header Summary Row */}
                <TouchableOpacity
                    style={s.headerRow}
                    onPress={() => toggleCard(cardKey)}
                    activeOpacity={0.7}
                >
                    <View style={s.headerTextCol}>
                        <View style={s.levelBadgeRow}>
                            <View
                                style={[
                                    s.dotNumberBadge,
                                    {
                                        backgroundColor: themeColor,
                                    },
                                ]}
                            >
                                <Text style={[s.dotNumberText, { color: '#FFFFFF' }]}>
                                    {levelConfig.levelNumber}
                                </Text>
                            </View>

                            <Text style={[s.levelSystemNumber, { color: subtextColor }]}>
                                {levelConfig.systemLevel}
                            </Text>
                        </View>

                        <Text
                            style={[
                                s.docNameText,
                                { color: textColor },
                            ]}
                            numberOfLines={1}
                        >
                            {levelConfig.customName || levelConfig.recommendedName}
                        </Text>

                        <Text
                            style={[
                                s.headerPreviewText,
                                { color: isDark ? '#94A3B8' : '#64748B' },
                            ]}
                            numberOfLines={1}
                        >
                            {previewString}
                        </Text>
                    </View>

                    {/* Right Action */}
                    <View style={s.headerRightCol}>
                        {isConsolidation && (
                            <IOSSwitch
                                value={levelConfig.enabled}
                                onValueChange={(val) => {
                                    handleToggleConsolidation(workflowType, val);
                                }}
                                activeColor="#159957"
                            />
                        )}
                        <View style={s.chevronBox}>
                            <PlatformIcon
                                name={isExpanded ? 'chevron.up' : 'chevron.down'}
                                size={13}
                                tintColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
                            />
                        </View>
                    </View>
                </TouchableOpacity>

                {/* Expanded Setting Rows */}
                {isExpanded && (
                    <View style={s.expandedBody}>
                        <View
                            style={[
                                s.divider,
                                {
                                    backgroundColor: isDark
                                        ? 'rgba(255,255,255,0.06)'
                                        : 'rgba(0,0,0,0.06)',
                                },
                            ]}
                        />

                        {/* Settings Fields Container */}
                        <View>
                            {/* Row 1: Document Name */}
                            <View style={s.inputRow}>
                                <View style={s.inputLabelGroup}>
                                    <Text style={[s.rowTitle, { color: textColor }]}>
                                        Document Name
                                    </Text>
                                    <Text style={[s.rowSubtitle, { color: subtextColor }]}>
                                        Name shown across Finance
                                    </Text>
                                </View>
                                <TextInput
                                    style={[
                                        s.cleanTextInput,
                                        {
                                            color: textColor,
                                            backgroundColor: isDark
                                                ? 'rgba(255,255,255,0.05)'
                                                : 'rgba(0,0,0,0.03)',
                                            borderColor: isDark
                                                ? 'rgba(255,255,255,0.08)'
                                                : 'rgba(0,0,0,0.08)',
                                        },
                                    ]}
                                    value={levelConfig.customName}
                                    onChangeText={(text) =>
                                        handleUpdateLevel(workflowType, levelType, { customName: text })
                                    }
                                    placeholder={levelConfig.recommendedName}
                                    placeholderTextColor={subtextColor}
                                />
                                {levelConfig.customName !== levelConfig.recommendedName && (
                                    <TouchableOpacity
                                        onPress={() => {
                                            Haptics.selectionAsync();
                                            handleUpdateLevel(workflowType, levelType, {
                                                customName: levelConfig.recommendedName,
                                            });
                                        }}
                                        style={s.resetNameBtn}
                                    >
                                        <Text style={s.resetNameText}>
                                            Reset to Recommended ({levelConfig.recommendedName})
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </View>

                            <View
                                style={[
                                    s.divider,
                                    {
                                        backgroundColor: isDark
                                            ? 'rgba(255,255,255,0.06)'
                                            : 'rgba(0,0,0,0.06)',
                                    },
                                ]}
                            />

                            {/* Row 2: Document Code */}
                            <View style={s.settingRow}>
                                <View style={s.rowTextCol}>
                                    <Text style={[s.rowTitle, { color: textColor }]}>
                                        Document Code
                                    </Text>
                                    <Text style={[s.rowSubtitle, { color: subtextColor }]}>
                                        Short 2–3 letter code
                                    </Text>
                                </View>
                                <TextInput
                                    style={[
                                        s.cleanCodeInput,
                                        {
                                            color: textColor,
                                            backgroundColor: isDark
                                                ? 'rgba(255,255,255,0.05)'
                                                : 'rgba(0,0,0,0.03)',
                                            borderColor: isCodeDuplicate
                                                ? '#FF3B30'
                                                : isDark
                                                ? 'rgba(255,255,255,0.08)'
                                                : 'rgba(0,0,0,0.08)',
                                        },
                                    ]}
                                    value={levelConfig.customCode}
                                    onChangeText={(text) => {
                                        const upper = text.toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 3);
                                        handleUpdateLevel(workflowType, levelType, { customCode: upper });
                                    }}
                                    placeholder={levelConfig.recommendedCode}
                                    placeholderTextColor={subtextColor}
                                    autoCapitalize="characters"
                                    maxLength={3}
                                />
                            </View>

                            {isCodeDuplicate && (
                                <Text style={s.duplicateWarningText}>
                                    Code "{levelConfig.customCode}" is already in use by another document.
                                </Text>
                            )}

                            <View
                                style={[
                                    s.divider,
                                    {
                                        backgroundColor: isDark
                                            ? 'rgba(255,255,255,0.06)'
                                            : 'rgba(0,0,0,0.06)',
                                    },
                                ]}
                            />

                            {/* Row 3: Sequence Length (Native ContextMenu) */}
                            <ContextMenu
                                actions={lengthActions}
                                onPress={(e) => {
                                    Haptics.selectionAsync();
                                    const opt = SEQUENCE_LENGTH_OPTIONS[e.nativeEvent.index];
                                    if (opt) {
                                        handleUpdateLevel(workflowType, levelType, { sequenceLength: opt.value });
                                    }
                                }}
                                dropdownMenuMode={true}
                            >
                                <View style={s.settingRow}>
                                    <View style={s.rowTextCol}>
                                        <Text style={[s.rowTitle, { color: textColor }]}>
                                            Sequence Length
                                        </Text>
                                        <Text style={[s.rowSubtitle, { color: subtextColor }]}>
                                            Running sequence digit count
                                        </Text>
                                    </View>
                                    <View style={s.valueRowCol}>
                                        <Text style={[s.valueText, { color: '#64748B' }]}>
                                            {currentLengthLabel}
                                        </Text>
                                        <PlatformIcon
                                            name="chevron.down"
                                            size={12}
                                            tintColor="#64748B"
                                        />
                                    </View>
                                </View>
                            </ContextMenu>

                            <View
                                style={[
                                    s.divider,
                                    {
                                        backgroundColor: isDark
                                            ? 'rgba(255,255,255,0.06)'
                                            : 'rgba(0,0,0,0.06)',
                                    },
                                ]}
                            />

                            {/* Row 4: Sequence Scope (Native ContextMenu) */}
                            <ContextMenu
                                actions={scopeActions}
                                onPress={(e) => {
                                    Haptics.selectionAsync();
                                    const idx = e.nativeEvent.index;
                                    let selectedScope: SequenceScope = 'global';
                                    if (idx === 0) selectedScope = 'global';
                                    else if (idx === 1) selectedScope = 'contextual';
                                    else if (idx === 2) selectedScope = 'reference';
                                    handleUpdateLevel(workflowType, levelType, { sequenceScope: selectedScope });
                                }}
                                dropdownMenuMode={true}
                            >
                                <View style={s.settingRow}>
                                    <View style={s.rowTextCol}>
                                        <Text style={[s.rowTitle, { color: textColor }]}>
                                            Sequence Scope
                                        </Text>
                                        <Text style={[s.rowSubtitle, { color: subtextColor }]}>
                                            Separation by project or department
                                        </Text>
                                    </View>
                                    <View style={s.valueRowCol}>
                                        <Text style={[s.valueText, { color: '#64748B' }]}>
                                            {currentScopeLabel}
                                        </Text>
                                        <PlatformIcon
                                            name="chevron.down"
                                            size={12}
                                            tintColor="#64748B"
                                        />
                                    </View>
                                </View>
                            </ContextMenu>

                            <View
                                style={[
                                    s.divider,
                                    {
                                        backgroundColor: isDark
                                            ? 'rgba(255,255,255,0.06)'
                                            : 'rgba(0,0,0,0.06)',
                                    },
                                ]}
                            />

                            {/* Row 5: Sequence Reset (Native ContextMenu) */}
                            <ContextMenu
                                actions={resetActions}
                                onPress={(e) => {
                                    Haptics.selectionAsync();
                                    const opt = SEQUENCE_RESET_OPTIONS[e.nativeEvent.index];
                                    if (opt) {
                                        handleUpdateLevel(workflowType, levelType, { sequenceReset: opt.value });
                                    }
                                }}
                                dropdownMenuMode={true}
                            >
                                <View style={s.settingRow}>
                                    <View style={s.rowTextCol}>
                                        <Text style={[s.rowTitle, { color: textColor }]}>
                                            Sequence Reset
                                        </Text>
                                        <Text style={[s.rowSubtitle, { color: subtextColor }]}>
                                            Reset counter periodically
                                        </Text>
                                    </View>
                                    <View style={s.valueRowCol}>
                                        <Text style={[s.valueText, { color: '#64748B' }]}>
                                            {currentResetLabel}
                                        </Text>
                                        <PlatformIcon
                                            name="chevron.down"
                                            size={12}
                                            tintColor="#64748B"
                                        />
                                    </View>
                                </View>
                            </ContextMenu>

                            {/* Row 6: Live Format Preview Box */}
                            <View
                                style={[
                                    s.cleanPreviewBox,
                                    {
                                        backgroundColor: isDark
                                            ? 'rgba(100, 116, 139, 0.08)'
                                            : 'rgba(100, 116, 139, 0.05)',
                                        borderColor: isDark
                                            ? 'rgba(100, 116, 139, 0.18)'
                                            : 'rgba(100, 116, 139, 0.12)',
                                    },
                                ]}
                            >
                                <View style={s.previewRowItem}>
                                    <Text style={s.previewLabel}>Full Format</Text>
                                    <Text
                                        style={[
                                            s.previewText,
                                            { color: isDark ? '#E2E8F0' : '#1E293B' },
                                        ]}
                                        selectable
                                    >
                                        {previewString}
                                    </Text>
                                </View>

                                <View style={[s.previewDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

                                <View style={s.previewRowItem}>
                                    <Text style={s.previewLabel}>Short Ref</Text>
                                    <Text
                                        style={[
                                            s.previewShortText,
                                            { color: isDark ? '#94A3B8' : '#64748B' },
                                        ]}
                                        selectable
                                    >
                                        {shortPreviewString}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                )}
            </View>
        );
    };

    // Render 1-2-3 Step Flow Tracker Card
    const renderStepTracker = (workflowType: 'purchasing' | 'reimbursement') => {
        const wf = rules[workflowType];
        const isConsEnabled = wf.levels.consolidation.enabled;
        const themeColor = workflowType === 'purchasing' ? '#007AFF' : '#FF9500';

        return (
            <View
                style={[
                    s.stepperCard,
                    {
                        backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                        borderWidth: 1,
                        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                    },
                ]}
            >
                {/* 3-Step Dots Connected Row */}
                <View style={s.stepNodesRow}>
                    {/* Node 1: Request */}
                    <View style={s.stepNode}>
                        <View style={[s.stepCircle, { backgroundColor: themeColor }]}>
                            <Text style={s.stepCircleText}>1</Text>
                        </View>
                        <Text style={[s.stepNodeTitle, { color: textColor }]}>Request</Text>
                    </View>

                    {/* Connecting Line 1 -> 2 */}
                    <View
                        style={[
                            s.stepConnectorLine,
                            {
                                backgroundColor: isConsEnabled
                                    ? themeColor
                                    : isDark
                                    ? 'rgba(255,255,255,0.12)'
                                    : 'rgba(0,0,0,0.08)',
                            },
                        ]}
                    />

                    {/* Node 2: Consolidation (Interactive Toggleable) */}
                    <TouchableOpacity
                        style={s.stepNode}
                        onPress={() => handleToggleConsolidation(workflowType, !isConsEnabled)}
                        activeOpacity={0.7}
                    >
                        <View
                            style={[
                                s.stepCircle,
                                isConsEnabled
                                    ? { backgroundColor: themeColor }
                                    : [
                                          s.stepCircleDisabled,
                                          {
                                              borderColor: isDark
                                                  ? 'rgba(255,255,255,0.25)'
                                                  : 'rgba(0,0,0,0.2)',
                                          },
                                      ],
                            ]}
                        >
                            <Text
                                style={[
                                    s.stepCircleText,
                                    !isConsEnabled && { color: subtextColor },
                                ]}
                            >
                                2
                            </Text>
                        </View>
                        <Text
                            style={[
                                s.stepNodeTitle,
                                {
                                    color: isConsEnabled ? textColor : subtextColor,
                                    fontWeight: isConsEnabled ? '600' : '400',
                                },
                            ]}
                            numberOfLines={1}
                        >
                            Consolidation
                        </Text>
                    </TouchableOpacity>

                    {/* Connecting Line 2 -> 3 */}
                    <View
                        style={[
                            s.stepConnectorLine,
                            {
                                backgroundColor: isConsEnabled
                                    ? themeColor
                                    : isDark
                                    ? 'rgba(255,255,255,0.12)'
                                    : 'rgba(0,0,0,0.08)',
                            },
                        ]}
                    />

                    {/* Node 3: Payment */}
                    <View style={s.stepNode}>
                        <View style={[s.stepCircle, { backgroundColor: themeColor }]}>
                            <Text style={s.stepCircleText}>3</Text>
                        </View>
                        <Text style={[s.stepNodeTitle, { color: textColor }]}>Payment</Text>
                    </View>
                </View>
            </View>
        );
    };

    // Render Workflow Section (Purchasing / Reimbursement)
    const renderWorkflow = (workflowType: 'purchasing' | 'reimbursement') => {
        const wf = rules[workflowType];
        const displayTitle = workflowType === 'purchasing' ? 'Purchasing' : 'Reimbursement';

        return (
            <View key={workflowType} style={s.sectionBlock}>
                {/* Section Header */}
                <View style={s.sectionHeaderRow}>
                    <Text style={[s.sectionHeaderLabel, { color: subtextColor }]}>
                        {displayTitle}
                    </Text>
                </View>

                {/* 1 · 2 · 3 Step Flow Tracker Card */}
                {renderStepTracker(workflowType)}

                {/* Level Cards Stack */}
                <View style={s.cardsStack}>
                    {renderLevelCard(workflowType, 'request')}
                    {renderLevelCard(workflowType, 'consolidation')}
                    {renderLevelCard(workflowType, 'payment')}
                </View>
            </View>
        );
    };

    return (
        <View style={s.container}>
            {/* Workflow Sections */}
            {renderWorkflow('purchasing')}
            {renderWorkflow('reimbursement')}

            {/* Guide Sheet */}
            <FinanceDocumentLevelsGuideSheet
                visible={guideSheetVisible}
                onClose={() => setGuideSheetVisible(false)}
            />
        </View>
    );
}

const s = StyleSheet.create({
    container: {
        gap: 24,
    },
    infoBar: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        paddingHorizontal: 2,
        marginTop: -6,
    },
    infoLink: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingVertical: 4,
    },
    infoLinkText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#64748B',
    },
    sectionBlock: {
        gap: 10,
    },
    sectionHeaderRow: {
        paddingHorizontal: 4,
        gap: 2,
    },
    sectionHeaderLabel: {
        fontSize: 13,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    sectionSubtitle: {
        fontSize: 12,
        lineHeight: 16,
    },
    stepperCard: {
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderWidth: StyleSheet.hairlineWidth,
    },
    stepNodesRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
    },
    stepNode: {
        alignItems: 'center',
        gap: 6,
        width: 80,
    },
    stepCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepCircleDisabled: {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderStyle: 'dashed',
    },
    stepCircleText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    stepNodeTitle: {
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: -0.2,
        textAlign: 'center',
    },
    stepConnectorLine: {
        flex: 1,
        height: 2,
        marginTop: 13,
        marginHorizontal: -4,
        borderRadius: 1,
    },
    cardsStack: {
        gap: 8,
    },
    card: {
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: StyleSheet.hairlineWidth,
    },
    cardDisabled: {
        opacity: 0.6,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    headerTextCol: {
        flex: 1,
        gap: 3,
    },
    headerRightCol: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginLeft: 12,
        gap: 8,
    },
    levelBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    dotNumberBadge: {
        width: 16,
        height: 16,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dotNumberText: {
        fontSize: 9,
        fontWeight: '700',
    },
    levelSystemNumber: {
        fontSize: 11,
        fontWeight: '500',
        color: '#64748B',
        letterSpacing: 0.2,
    },
    pillBadgeDisabled: {
        paddingHorizontal: 5,
        paddingVertical: 1,
        borderRadius: 4,
        backgroundColor: 'rgba(100, 116, 139, 0.15)',
    },
    pillBadgeDisabledText: {
        fontSize: 9,
        fontWeight: '600',
        color: '#64748B',
    },
    pillBadgeOptional: {
        paddingHorizontal: 5,
        paddingVertical: 1,
        borderRadius: 4,
        backgroundColor: 'rgba(245, 158, 11, 0.12)',
    },
    pillBadgeOptionalText: {
        fontSize: 9,
        fontWeight: '700',
        color: '#F59E0B',
    },
    titleCodeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 1,
    },
    docNameText: {
        fontSize: 15,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    codePill: {
        paddingHorizontal: 6,
        paddingVertical: 1.5,
        borderRadius: 5,
        backgroundColor: 'rgba(100, 116, 139, 0.12)',
    },
    codePillText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#64748B',
    },
    headerPreviewText: {
        fontSize: 12,
        fontWeight: '500',
        letterSpacing: 0.2,
        marginTop: 1,
    },
    chevronBox: {
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    expandedBody: {
        paddingBottom: 12,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginHorizontal: 16,
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        minHeight: 48,
    },
    rowTextCol: {
        flex: 1,
        marginRight: 12,
    },
    rowTitle: {
        fontSize: 14,
        fontWeight: '500',
        letterSpacing: -0.2,
    },
    rowSubtitle: {
        fontSize: 11,
        marginTop: 1,
        lineHeight: 15,
    },
    valueRowCol: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    valueText: {
        fontSize: 13,
        fontWeight: '500',
    },
    inputRow: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 8,
    },
    inputLabelGroup: {
        gap: 1,
    },
    cleanTextInput: {
        height: 40,
        borderRadius: 20,
        paddingHorizontal: 14,
        fontSize: 13,
        fontWeight: '500',
        borderWidth: StyleSheet.hairlineWidth,
    },
    resetNameBtn: {
        alignSelf: 'flex-start',
        marginTop: 2,
    },
    resetNameText: {
        fontSize: 11,
        color: '#64748B',
        fontWeight: '500',
    },
    cleanCodeInput: {
        width: 72,
        height: 34,
        borderRadius: 17,
        paddingHorizontal: 8,
        fontSize: 13,
        fontWeight: '600',
        letterSpacing: 0.5,
        textAlign: 'center',
        borderWidth: StyleSheet.hairlineWidth,
    },
    duplicateWarningText: {
        paddingHorizontal: 16,
        fontSize: 11,
        color: '#FF3B30',
        marginTop: -6,
        marginBottom: 8,
    },
    cleanPreviewBox: {
        marginHorizontal: 16,
        marginTop: 10,
        padding: 12,
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
        gap: 8,
    },
    previewRowItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    previewDivider: {
        height: StyleSheet.hairlineWidth,
    },
    previewLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#64748B',
        letterSpacing: 0.2,
    },
    previewText: {
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 0.3,
    },
    previewShortText: {
        fontSize: 12,
        fontWeight: '500',
        letterSpacing: 0.3,
    },
});
