import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Platform,
    LayoutAnimation,
    UIManager,
    Alert,
} from 'react-native';
import { IOSSwitch } from '@/components/ui/IOSSwitch';
import ContextMenu, { ContextMenuAction } from '@/components/ui/PlatformContextMenu';
import * as Haptics from 'expo-haptics';
import { GlassView } from '@/components/ui/GlassView';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { FinanceWorkflowSegmentedPicker } from './FinanceWorkflowSegmentedPicker';
import {
    FinanceDocumentRulesSettings,
    FinanceFieldRulesSettings,
    FinanceDocumentFieldRules,
    FinanceFieldRuleItem,
    getFormaPresetDocumentFieldRules,
    getDefaultFieldRulesMap,
} from '@/lib/api/financeSetup';
import { FinanceFieldRulesGuideSheet } from './FinanceFieldRulesGuideSheet';

if (
    Platform.OS === 'android' &&
    UIManager.setLayoutAnimationEnabledExperimental
) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface FinanceFieldRulesSectionProps {
    isDark: boolean;
    textColor: string;
    subtextColor: string;
    documentRules: FinanceDocumentRulesSettings;
    fieldRules: FinanceFieldRulesSettings;
    onUpdateFieldRules: (rules: FinanceFieldRulesSettings) => void;
    onShowToast: (msg: string) => void;
    isGuideSheetOpen?: boolean;
    onCloseGuideSheet?: () => void;
}

export function FinanceFieldRulesSection({
    isDark,
    textColor,
    subtextColor,
    documentRules,
    fieldRules,
    onUpdateFieldRules,
    onShowToast,
    isGuideSheetOpen = false,
    onCloseGuideSheet,
}: FinanceFieldRulesSectionProps) {
    const intensity = isDark ? 10 : 25;

    // Workflow subtab state: 'purchasing' | 'reimbursement'
    const [activeWorkflowTab, setActiveWorkflowTab] = useState<'purchasing' | 'reimbursement'>('purchasing');

    // Local guide sheet state fallback
    const [internalGuideSheetOpen, setInternalGuideSheetOpen] = useState(false);
    const showGuide = isGuideSheetOpen || internalGuideSheetOpen;
    const handleCloseGuide = () => {
        setInternalGuideSheetOpen(false);
        if (onCloseGuideSheet) onCloseGuideSheet();
    };

    // Card expanded states
    const [expandedDocKeys, setExpandedDocKeys] = useState<Record<string, boolean>>({
        purchasing_request: true,
        reimbursement_request: true,
    });

    const toggleDocExpand = (docKey: string) => {
        Haptics.selectionAsync();
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedDocKeys((prev) => ({
            ...prev,
            [docKey]: !prev[docKey],
        }));
    };

    // Get preset field definitions dynamically adapted to current Document Rules workflow
    const presetDocumentDefs = useMemo(() => {
        return getFormaPresetDocumentFieldRules(documentRules);
    }, [documentRules]);

    // Purchasing and Reimbursement document metadata
    const docMetaMap = useMemo(() => {
        const p = documentRules.purchasing.levels;
        const r = documentRules.reimbursement.levels;

        return {
            purchasing_request: {
                levelNumber: 1,
                systemLevel: 'Request',
                name: p.request.customName || p.request.recommendedName || 'Purchase Request',
                code: p.request.customCode || p.request.recommendedCode || 'PR',
                enabled: p.request.enabled !== false,
            },
            purchasing_consolidation: {
                levelNumber: 2,
                systemLevel: 'Consolidation',
                name: p.consolidation.customName || p.consolidation.recommendedName || 'Consolidation',
                code: p.consolidation.customCode || p.consolidation.recommendedCode || 'CON',
                enabled: !!p.consolidation.enabled,
            },
            purchasing_payment: {
                levelNumber: 3,
                systemLevel: 'Payment',
                name: p.payment.customName || p.payment.recommendedName || 'Purchase Payment',
                code: p.payment.customCode || p.payment.recommendedCode || 'PP',
                enabled: p.payment.enabled !== false,
            },
            reimbursement_request: {
                levelNumber: 1,
                systemLevel: 'Request',
                name: r.request.customName || r.request.recommendedName || 'Reimbursement Request',
                code: r.request.customCode || r.request.recommendedCode || 'RR',
                enabled: r.request.enabled !== false,
            },
            reimbursement_consolidation: {
                levelNumber: 2,
                systemLevel: 'Consolidation',
                name: r.consolidation.customName || r.consolidation.recommendedName || 'Reimbursement Batch',
                code: r.consolidation.customCode || r.consolidation.recommendedCode || 'RB',
                enabled: !!r.consolidation.enabled,
            },
            reimbursement_payment: {
                levelNumber: 3,
                systemLevel: 'Payment',
                name: r.payment.customName || r.payment.recommendedName || 'Reimbursement Payment',
                code: r.payment.customCode || r.payment.recommendedCode || 'RP',
                enabled: r.payment.enabled !== false,
            },
        };
    }, [documentRules]);

    // Handle single field toggle
    const handleToggleField = (docKey: string, fieldId: string, value: boolean) => {
        Haptics.selectionAsync();
        const updatedDocRules = {
            ...(fieldRules[docKey] || {}),
            [fieldId]: value,
        };
        const updatedAll = {
            ...fieldRules,
            [docKey]: updatedDocRules,
        };
        onUpdateFieldRules(updatedAll);
    };

    // Reset single document to Forma Preset
    const handleResetDocToPreset = (docKey: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const docDef = presetDocumentDefs.find((d) => d.docKey === docKey);
        if (!docDef) return;

        const presetDocRules: Record<string, boolean> = {};
        docDef.fields.forEach((f) => {
            presetDocRules[f.id] = f.required;
        });

        const updated = {
            ...fieldRules,
            [docKey]: presetDocRules,
        };
        onUpdateFieldRules(updated);
        onShowToast('Reset to Forma Preset');
    };

    // Filter active workflow documents
    const currentWorkflowDocDefs = useMemo(() => {
        return presetDocumentDefs.filter((d) => d.workflowType === activeWorkflowTab);
    }, [presetDocumentDefs, activeWorkflowTab]);

    const contextMenuActions: ContextMenuAction[] = [
        { title: 'Reset to Forma Preset', systemIcon: 'arrow.counterclockwise' },
        { title: 'About Field Rules', systemIcon: 'info.circle' },
    ];

    const handleContextMenuPress = (docKey: string, index: number) => {
        if (index === 0) {
            handleResetDocToPreset(docKey);
        } else if (index === 1) {
            setInternalGuideSheetOpen(true);
        }
    };

    return (
        <View style={s.container}>
            {/* Workflow Segmented Selector (Purchasing vs Reimbursement) */}
            <FinanceWorkflowSegmentedPicker
                activeTab={activeWorkflowTab}
                onTabChange={(tab) => {
                    setActiveWorkflowTab(tab);
                }}
            />

            {/* Document Cards */}
            {currentWorkflowDocDefs.map((docDef) => {
                const meta = docMetaMap[docDef.docKey as keyof typeof docMetaMap];
                const isEnabled = meta ? meta.enabled : true;
                const isExpanded = isEnabled && !!expandedDocKeys[docDef.docKey];
                const isConsolidationDisabled = !isEnabled && docDef.levelType === 'consolidation';
                const themeColor = activeWorkflowTab === 'purchasing' ? '#007AFF' : '#FF9500';

                // Calculate Required / Optional count
                const docRuleOverrides = fieldRules[docDef.docKey] || {};
                let requiredCount = 0;
                let optionalCount = 0;

                docDef.fields.forEach((f) => {
                    const isReq = docRuleOverrides[f.id] !== undefined ? docRuleOverrides[f.id] : f.required;
                    if (isReq) requiredCount++;
                    else optionalCount++;
                });

                // INACTIVE DOCUMENT CARD (e.g. Consolidation disabled)
                if (isConsolidationDisabled) {
                    const isInactiveExpanded = !!expandedDocKeys[docDef.docKey];
                    return (
                        <GlassView
                            key={docDef.docKey}
                            intensity={intensity}
                            style={[
                                s.card,
                                s.cardDisabled,
                                {
                                    backgroundColor: isDark
                                        ? 'rgba(255,255,255,0.02)'
                                        : 'rgba(255,255,255,0.7)',
                                    borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                                    borderWidth: 1,
                                },
                            ]}
                        >
                            <TouchableOpacity
                                style={s.cardHeader}
                                onPress={() => toggleDocExpand(docDef.docKey)}
                                activeOpacity={0.7}
                            >
                                <View style={s.headerLeft}>
                                    <View
                                        style={[
                                            s.levelBadge,
                                            {
                                                backgroundColor: isDark
                                                    ? 'rgba(255,255,255,0.06)'
                                                    : 'rgba(0,0,0,0.05)',
                                            },
                                        ]}
                                    >
                                        <Text style={[s.levelBadgeText, { color: subtextColor }]}>
                                            {meta.levelNumber}
                                        </Text>
                                    </View>
                                    <View style={s.docTitleCol}>
                                        <Text style={[s.docNameText, { color: subtextColor }]}>
                                            {meta.systemLevel}
                                        </Text>
                                        <Text style={[s.docLevelSubtitle, { color: subtextColor }]}>
                                            Off · Direct to Payment
                                        </Text>
                                    </View>
                                </View>

                                <View style={s.headerRight}>
                                    <View
                                        style={[
                                            s.offPill,
                                            {
                                                backgroundColor: isDark
                                                    ? 'rgba(255,255,255,0.06)'
                                                    : 'rgba(0,0,0,0.05)',
                                            },
                                        ]}
                                    >
                                        <Text style={[s.offPillText, { color: subtextColor }]}>
                                            OFF
                                        </Text>
                                    </View>
                                    <PlatformIcon
                                        name={isInactiveExpanded ? 'chevron.up' : 'chevron.down'}
                                        size={13}
                                        tintColor={subtextColor}
                                    />
                                </View>
                            </TouchableOpacity>

                            {isInactiveExpanded && (
                                <View style={s.disabledExplanationContainer}>
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
                                    <View style={s.disabledContentBox}>
                                        <Text style={[s.disabledHeading, { color: textColor }]}>
                                            Consolidation is currently disabled
                                        </Text>
                                        <Text style={[s.disabledSubtext, { color: subtextColor }]}>
                                            Requests currently proceed directly to Payment without a consolidation stage. Enable Consolidation in Finance Document Rules to configure its field rules.
                                        </Text>
                                    </View>
                                </View>
                            )}
                        </GlassView>
                    );
                }

                // ACTIVE DOCUMENT CARD
                return (
                    <ContextMenu
                        key={docDef.docKey}
                        actions={contextMenuActions}
                        onPress={(e) => handleContextMenuPress(docDef.docKey, e.nativeEvent.index)}
                    >
                        <GlassView
                            intensity={intensity}
                            style={[
                                s.card,
                                {
                                    backgroundColor: isDark
                                        ? 'rgba(255,255,255,0.04)'
                                        : '#FFFFFF',
                                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                                    borderWidth: 1,
                                },
                            ]}
                        >
                            {/* Card Header Accordion Trigger */}
                            <TouchableOpacity
                                style={s.cardHeader}
                                onPress={() => toggleDocExpand(docDef.docKey)}
                                activeOpacity={0.7}
                            >
                                <View style={s.headerLeft}>
                                    <View
                                        style={[
                                            s.levelBadge,
                                            {
                                                backgroundColor: isDark ? `${themeColor}25` : `${themeColor}15`,
                                            },
                                        ]}
                                    >
                                        <Text style={[s.levelBadgeText, { color: themeColor }]}>
                                            {meta.levelNumber}
                                        </Text>
                                    </View>
                                    <View style={s.docTitleCol}>
                                        <View style={s.docTitleRow}>
                                            <Text style={[s.docLevelSubtitle, { color: subtextColor }]}>
                                                {meta.systemLevel}
                                            </Text>
                                            <Text style={[s.bulletText, { color: subtextColor }]}>·</Text>
                                            <Text style={[s.docCodeText, { color: subtextColor }]}>
                                                {meta.code}
                                            </Text>
                                        </View>
                                        <Text style={[s.docNameText, { color: textColor }]}>
                                            {meta.name}
                                        </Text>
                                    </View>
                                </View>

                                <View style={s.headerRight}>
                                    <Text style={[s.countSummaryText, { color: subtextColor }]}>
                                        {requiredCount} Required · {optionalCount} Optional
                                    </Text>
                                    <PlatformIcon
                                        name={isExpanded ? 'chevron.up' : 'chevron.down'}
                                        size={13}
                                        tintColor={subtextColor}
                                    />
                                </View>
                            </TouchableOpacity>

                            {/* Expanded Field Rows */}
                            {isExpanded && (
                                <View style={s.fieldListContainer}>
                                    {docDef.fields.map((field, index) => {
                                        const isRequired =
                                            docRuleOverrides[field.id] !== undefined
                                                ? docRuleOverrides[field.id]
                                                : field.required;

                                        return (
                                            <View key={field.id}>
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
                                                <View style={s.fieldRow}>
                                                    <View style={s.fieldTextCol}>
                                                        <Text style={[s.fieldLabel, { color: textColor }]}>
                                                            {field.name}
                                                        </Text>
                                                        <Text style={[s.fieldDescription, { color: subtextColor }]}>
                                                            {field.description}
                                                        </Text>
                                                        {!!field.helperText && (
                                                            <Text style={[s.fieldHelperText, { color: isDark ? '#38BDF8' : '#0284C7' }]}>
                                                                {field.helperText}
                                                            </Text>
                                                        )}
                                                    </View>

                                                    <View style={s.fieldSwitchCol}>
                                                        <IOSSwitch
                                                            value={isRequired}
                                                            onValueChange={(val) =>
                                                                handleToggleField(docDef.docKey, field.id, val)
                                                            }
                                                            activeColor="#159957"
                                                        />
                                                    </View>
                                                </View>
                                            </View>
                                        );
                                    })}
                                </View>
                            )}
                        </GlassView>
                    </ContextMenu>
                );
            })}

            {/* Guide Sheet */}
            <FinanceFieldRulesGuideSheet
                visible={showGuide}
                onClose={handleCloseGuide}
            />
        </View>
    );
}

const s = StyleSheet.create({
    container: {
        gap: 12,
    },
    card: {
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
    },
    cardDisabled: {
        opacity: 0.75,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 16,
        gap: 8,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
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
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flexShrink: 0,
    },
    countSummaryText: {
        fontSize: 13,
        fontWeight: '400',
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
    fieldListContainer: {
        paddingBottom: 4,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 16,
        marginRight: 0,
    },
    fieldRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
        gap: 14,
    },
    fieldTextCol: {
        flex: 1,
        gap: 2,
    },
    fieldLabel: {
        fontSize: 15,
        fontWeight: '500',
        letterSpacing: -0.2,
    },
    fieldDescription: {
        fontSize: 13,
        fontWeight: '400',
        lineHeight: 17,
    },
    fieldHelperText: {
        fontSize: 12,
        fontWeight: '400',
        marginTop: 2,
        lineHeight: 16,
    },
    fieldSwitchCol: {
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    disabledExplanationContainer: {
        paddingBottom: 4,
    },
    disabledContentBox: {
        paddingHorizontal: 16,
        paddingVertical: 14,
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
});

export default FinanceFieldRulesSection;
