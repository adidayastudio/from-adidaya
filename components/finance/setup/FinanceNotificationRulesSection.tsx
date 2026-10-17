import React, { useState, useMemo, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    Platform,
} from 'react-native';
import { IOSSwitch } from '@/components/ui/IOSSwitch';
import * as Haptics from 'expo-haptics';
import ContextMenu, { ContextMenuAction } from '@/components/ui/PlatformContextMenu';
import { GlassView } from '@/components/ui/GlassView';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { NativeSegmentedPicker } from '@/components/ui/NativeSegmentedPicker';
import { BouncyGlassButton } from '@/components/ui/BouncyGlassButton';
import {
    FinanceNotificationRulesSettings,
    FinanceBuiltinEventKey,
    FinanceEventNotificationRule,
    FinanceCustomNotificationRule,
    FinanceDocumentRulesSettings,
    PAYMENT_DUE_TIMING_OPTIONS,
    PAYMENT_OVERDUE_TIMING_OPTIONS,
    REMINDER_TIMING_OPTIONS,
    SUGGESTED_CUSTOM_RULE_PRESETS,
    SuggestedCustomRulePreset,
    generateHumanReadableRuleSummary,
    formatPaymentDueTiming,
    formatPaymentOverdueTiming,
    formatReminderTiming,
} from '@/lib/api/financeSetup';
import { FinanceCustomTimingSheet } from './FinanceCustomTimingSheet';
import { FinanceCustomRuleEditSheet } from './FinanceCustomRuleEditSheet';
import { FinanceSuggestedTemplatesSheet } from './FinanceSuggestedTemplatesSheet';

interface FinanceNotificationRulesSectionProps {
    isDark: boolean;
    textColor: string;
    subtextColor: string;
    documentRules: FinanceDocumentRulesSettings;
    notificationSettings: FinanceNotificationRulesSettings;
    onUpdateSettings: (settings: FinanceNotificationRulesSettings) => void;
    onShowToast: (msg: string) => void;
    isAddCustomRuleSheetOpen?: boolean;
    onCloseAddCustomRuleSheet?: () => void;
}

const TAB_OPTIONS = ['Event-Based', 'Custom'];

export function FinanceNotificationRulesSection({
    isDark,
    textColor,
    subtextColor,
    documentRules,
    notificationSettings,
    onUpdateSettings,
    onShowToast,
    isAddCustomRuleSheetOpen,
    onCloseAddCustomRuleSheet,
}: FinanceNotificationRulesSectionProps) {
    const intensity = isDark ? 10 : 25;

    // Subtab index: 0 = Event-Based, 1 = Custom
    const [selectedTabIndex, setSelectedTabIndex] = useState(0);

    // Custom Rule sheet state
    const [selectedCustomRule, setSelectedCustomRule] = useState<FinanceCustomNotificationRule | null>(null);
    const [isCustomRuleSheetOpen, setIsCustomRuleSheetOpen] = useState(false);
    const [isSuggestedTemplatesSheetOpen, setIsSuggestedTemplatesSheetOpen] = useState(false);

    // Open Custom Rule sheet if requested from top header toolbar
    useEffect(() => {
        if (isAddCustomRuleSheetOpen) {
            setSelectedTabIndex(1);
            setSelectedCustomRule(null);
            setIsCustomRuleSheetOpen(true);
            if (onCloseAddCustomRuleSheet) {
                onCloseAddCustomRuleSheet();
            }
        }
    }, [isAddCustomRuleSheetOpen, onCloseAddCustomRuleSheet]);

    // Custom timing sheet state
    const [customTimingModalVisible, setCustomTimingModalVisible] = useState(false);
    const [customTimingTargetEvent, setCustomTimingTargetEvent] = useState<'payment_due' | 'pending_approval_reminder'>('payment_due');

    // Event Grouping
    const approvalEvents: FinanceBuiltinEventKey[] = [
        'approval_required',
        'request_fully_approved',
        'request_rejected',
        'revision_requested',
        'request_cancelled',
    ];

    const consolidationEvents: FinanceBuiltinEventKey[] = [
        'ready_for_consolidation',
        'consolidation_completed',
    ];

    const paymentEvents: FinanceBuiltinEventKey[] = [
        'ready_for_payment',
        'payment_completed',
        'payment_failed',
        'payment_due',
    ];

    const reminderEvents: FinanceBuiltinEventKey[] = [
        'pending_approval_reminder',
    ];

    // Consolidation Scope Detection
    const isPurchasingConsolidationEnabled = Boolean(
        documentRules?.purchasing?.levels?.consolidation?.enabled
    );
    const isReimbursementConsolidationEnabled = Boolean(
        documentRules?.reimbursement?.levels?.consolidation?.enabled
    );

    const consolidationScope = useMemo<{
        label: string | null;
        isFullyDisabled: boolean;
        helperText: string | null;
    }>(() => {
        if (isPurchasingConsolidationEnabled && isReimbursementConsolidationEnabled) {
            return {
                label: null,
                isFullyDisabled: false,
                helperText: null,
            };
        }
        if (isPurchasingConsolidationEnabled && !isReimbursementConsolidationEnabled) {
            return {
                label: 'For Purchasing only',
                isFullyDisabled: false,
                helperText: null,
            };
        }
        if (!isPurchasingConsolidationEnabled && isReimbursementConsolidationEnabled) {
            return {
                label: 'For Reimbursement only',
                isFullyDisabled: false,
                helperText: null,
            };
        }
        return {
            label: 'Consolidation Notifications Off',
            isFullyDisabled: true,
            helperText: 'Enable Consolidation in Purchasing or Reimbursement to use these notification events.',
        };
    }, [isPurchasingConsolidationEnabled, isReimbursementConsolidationEnabled]);

    // Toggle single event rule
    const handleToggleEventRule = (eventKey: FinanceBuiltinEventKey, val: boolean) => {
        Haptics.selectionAsync();
        const currentRule = notificationSettings.eventRules[eventKey];
        if (!currentRule) return;

        const updatedEventRules = {
            ...notificationSettings.eventRules,
            [eventKey]: {
                ...currentRule,
                enabled: val,
            },
        };

        const updatedSettings: FinanceNotificationRulesSettings = {
            ...notificationSettings,
            eventRules: updatedEventRules,
        };

        onUpdateSettings(updatedSettings);
        onShowToast(val ? `${currentRule.name} enabled` : `${currentRule.name} disabled`);
    };

    // Update timing for a specific event
    const handleUpdateEventTiming = (eventKey: FinanceBuiltinEventKey, timingValue: string) => {
        Haptics.selectionAsync();
        const currentRule = notificationSettings.eventRules[eventKey];
        if (!currentRule) return;

        const updatedRule: FinanceEventNotificationRule = {
            ...currentRule,
            ...(eventKey === 'payment_due'
                ? { paymentDueTiming: timingValue }
                : { reminderTiming: timingValue }),
        };

        const updatedSettings: FinanceNotificationRulesSettings = {
            ...notificationSettings,
            eventRules: {
                ...notificationSettings.eventRules,
                [eventKey]: updatedRule,
            },
        };

        onUpdateSettings(updatedSettings);
        const displayLabel = eventKey === 'payment_due'
            ? formatPaymentDueTiming(timingValue)
            : formatReminderTiming(timingValue);
        onShowToast(`Timing set to "${displayLabel}"`);
    };

    // Build context menu actions for Payment Due
    const paymentDueActions = useMemo<ContextMenuAction[]>(() => {
        const currentVal = notificationSettings.eventRules.payment_due?.paymentDueTiming || '1_day_before';
        const isPreset = PAYMENT_DUE_TIMING_OPTIONS.some((o) => o.value === currentVal);

        const actions: ContextMenuAction[] = PAYMENT_DUE_TIMING_OPTIONS.map((opt) => ({
            title: opt.label,
            selected: opt.value === currentVal,
        }));

        actions.push({
            title: isPreset ? 'Custom...' : `Custom (${formatPaymentDueTiming(currentVal)})`,
            selected: !isPreset,
        });

        return actions;
    }, [notificationSettings.eventRules.payment_due?.paymentDueTiming]);

    // Build context menu actions for Reminders
    const reminderActions = useMemo<ContextMenuAction[]>(() => {
        const currentVal = notificationSettings.eventRules.pending_approval_reminder?.reminderTiming || '24_hours';
        const isPreset = REMINDER_TIMING_OPTIONS.some((o) => o.value === currentVal);

        const actions: ContextMenuAction[] = REMINDER_TIMING_OPTIONS.map((opt) => ({
            title: opt.label,
            selected: opt.value === currentVal,
        }));

        actions.push({
            title: isPreset ? 'Custom...' : `Custom (${formatReminderTiming(currentVal)})`,
            selected: !isPreset,
        });

        return actions;
    }, [notificationSettings.eventRules.pending_approval_reminder?.reminderTiming]);

    // Handle ContextMenu item selection
    const handleContextMenuSelect = (eventKey: FinanceBuiltinEventKey, index: number) => {
        const optionsList = eventKey === 'payment_due'
            ? PAYMENT_DUE_TIMING_OPTIONS
            : REMINDER_TIMING_OPTIONS;

        if (index < optionsList.length) {
            handleUpdateEventTiming(eventKey, optionsList[index].value);
        } else {
            // "Custom..." option clicked -> Open native structured custom timing sheet
            setCustomTimingTargetEvent(eventKey as 'payment_due' | 'pending_approval_reminder');
            setCustomTimingModalVisible(true);
        }
    };

    // Handle preset selection -> Open edit sheet with preset populated
    const handleSelectPreset = (preset: SuggestedCustomRulePreset) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const newRule: FinanceCustomNotificationRule = {
            id: `custom_rule_${Date.now()}`,
            ...preset.rule,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        setSelectedCustomRule(newRule);
        setIsCustomRuleSheetOpen(true);
    };

    // Save custom rule from sheet
    const handleSaveCustomRule = (savedRule: FinanceCustomNotificationRule) => {
        const exists = notificationSettings.customRules.some((r) => r.id === savedRule.id);
        let updatedList: FinanceCustomNotificationRule[];
        if (exists) {
            updatedList = notificationSettings.customRules.map((r) => (r.id === savedRule.id ? savedRule : r));
        } else {
            updatedList = [savedRule, ...notificationSettings.customRules];
        }

        const updatedSettings: FinanceNotificationRulesSettings = {
            ...notificationSettings,
            customRules: updatedList,
        };

        onUpdateSettings(updatedSettings);
        onShowToast(`Custom rule "${savedRule.name}" saved`);
    };

    // Delete custom rule
    const handleDeleteCustomRule = (ruleId: string) => {
        const updatedList = notificationSettings.customRules.filter((r) => r.id !== ruleId);
        const updatedSettings: FinanceNotificationRulesSettings = {
            ...notificationSettings,
            customRules: updatedList,
        };
        onUpdateSettings(updatedSettings);
        onShowToast('Custom rule removed');
    };

    // Toggle custom rule active state
    const handleToggleCustomRule = (ruleId: string, val: boolean) => {
        Haptics.selectionAsync();
        const updatedList = notificationSettings.customRules.map((r) =>
            r.id === ruleId ? { ...r, enabled: val } : r
        );
        const updatedSettings: FinanceNotificationRulesSettings = {
            ...notificationSettings,
            customRules: updatedList,
        };
        onUpdateSettings(updatedSettings);
    };

    // Render Event Row
    const renderEventRow = (
        eventKey: FinanceBuiltinEventKey,
        isLast = false,
        isDisabled = false
    ) => {
        const rule = notificationSettings.eventRules[eventKey];
        if (!rule) return null;

        const isPaymentDue = eventKey === 'payment_due';
        const isReminder = eventKey === 'pending_approval_reminder';
        const hasTimingDropdown = isPaymentDue || isReminder;

        let timingDisplay: string | null = null;
        if (isPaymentDue) {
            timingDisplay = formatPaymentDueTiming(rule.paymentDueTiming);
        } else if (isReminder) {
            timingDisplay = formatReminderTiming(rule.reminderTiming);
        }

        const menuActions = isPaymentDue ? paymentDueActions : reminderActions;

        return (
            <View key={eventKey} style={{ opacity: isDisabled ? 0.45 : 1 }}>
                <View style={styles.eventRow}>
                    <View style={styles.eventContent}>
                        <View style={styles.eventTitleRow}>
                            <Text style={[styles.eventTitle, { color: textColor }]}>
                                {rule.name}
                            </Text>

                            {/* Native ContextMenu Dropdown for Time-based Events */}
                            {!isDisabled && hasTimingDropdown && rule.enabled && timingDisplay && (
                                <ContextMenu
                                    actions={menuActions}
                                    onPress={(e) => handleContextMenuSelect(eventKey, e.nativeEvent.index)}
                                    dropdownMenuMode={true}
                                >
                                    <View
                                        style={[
                                            styles.timingDropdownPill,
                                            {
                                                backgroundColor: isDark
                                                    ? 'rgba(255,149,0,0.15)'
                                                    : 'rgba(255,149,0,0.12)',
                                            },
                                        ]}
                                    >
                                        <Text style={styles.timingPillText}>{timingDisplay}</Text>
                                        <PlatformIcon
                                            name="chevron.down"
                                            size={10}
                                            tintColor="#FF9500"
                                        />
                                    </View>
                                </ContextMenu>
                            )}
                        </View>

                        <Text style={[styles.eventSubtitle, { color: subtextColor }]}>
                            {rule.description}
                        </Text>

                        <View style={styles.recipientBadgeRow}>
                            <PlatformIcon
                                name="person.crop.circle"
                                size={12}
                                tintColor={isDark ? '#8E8E93' : '#6E6E73'}
                            />
                            <Text style={[styles.recipientText, { color: isDark ? '#8E8E93' : '#6E6E73' }]}>
                                {rule.recipientDescription}
                            </Text>
                        </View>
                    </View>

                    <IOSSwitch
                        value={isDisabled ? false : rule.enabled}
                        disabled={isDisabled}
                        onValueChange={(val) => handleToggleEventRule(eventKey, val)}
                        activeColor="#159957"
                    />
                </View>

                {!isLast && (
                    <View
                        style={[
                            styles.divider,
                            {
                                backgroundColor: isDark
                                ? 'rgba(255,255,255,0.06)'
                                : 'rgba(0,0,0,0.06)',
                            },
                        ]}
                    />
                )}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* 1. Approval & Review */}
            <View style={styles.sectionBlock}>
                <Text style={[styles.sectionHeader, { color: subtextColor }]}>
                    Approval & Review
                </Text>
                <GlassView
                    intensity={intensity}
                    style={[
                        styles.card,
                        {
                            backgroundColor: isDark
                                ? 'rgba(255,255,255,0.04)'
                                : '#FFFFFF',
                            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                            borderWidth: 1,
                        },
                    ]}
                >
                    {approvalEvents.map((key, idx) =>
                        renderEventRow(key, idx === approvalEvents.length - 1)
                    )}
                </GlassView>
            </View>

            {/* 2. Consolidation Section */}
            <View style={styles.sectionBlock}>
                <View style={styles.sectionHeaderRow}>
                    <Text style={[styles.sectionHeader, { color: subtextColor }]}>
                        Consolidation
                    </Text>
                    {consolidationScope.label && (
                        <Text
                            style={[
                                styles.sectionScopeBadge,
                                {
                                    color: consolidationScope.isFullyDisabled
                                        ? isDark
                                            ? '#8E8E93'
                                            : '#8E8E93'
                                        : isDark
                                        ? '#0A84FF'
                                        : '#007AFF',
                                },
                            ]}
                        >
                            {consolidationScope.label}
                        </Text>
                    )}
                </View>
                <GlassView
                    intensity={intensity}
                    style={[
                        styles.card,
                        {
                            backgroundColor: isDark
                                ? 'rgba(255,255,255,0.04)'
                                : '#FFFFFF',
                            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                            borderWidth: 1,
                        },
                    ]}
                >
                    {consolidationEvents.map((key, idx) =>
                        renderEventRow(
                            key,
                            idx === consolidationEvents.length - 1,
                            consolidationScope.isFullyDisabled
                        )
                    )}
                </GlassView>
                {consolidationScope.helperText && (
                    <Text style={[styles.sectionHelperText, { color: subtextColor }]}>
                        {consolidationScope.helperText}
                    </Text>
                )}
            </View>

            {/* 3. Payment & Disbursement */}
            <View style={styles.sectionBlock}>
                <Text style={[styles.sectionHeader, { color: subtextColor }]}>
                    Payment & Disbursement
                </Text>
                <GlassView
                    intensity={intensity}
                    style={[
                        styles.card,
                        {
                            backgroundColor: isDark
                                ? 'rgba(255,255,255,0.04)'
                                : '#FFFFFF',
                            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                            borderWidth: 1,
                        },
                    ]}
                >
                    {paymentEvents.map((key, idx) =>
                        renderEventRow(key, idx === paymentEvents.length - 1)
                    )}
                </GlassView>
            </View>

            {/* 4. Reminders */}
            <View style={styles.sectionBlock}>
                <Text style={[styles.sectionHeader, { color: subtextColor }]}>
                    Reminders
                </Text>
                <GlassView
                    intensity={intensity}
                    style={[
                        styles.card,
                        {
                            backgroundColor: isDark
                                ? 'rgba(255,255,255,0.04)'
                                : '#FFFFFF',
                            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                            borderWidth: 1,
                        },
                    ]}
                >
                    {reminderEvents.map((key, idx) =>
                        renderEventRow(key, idx === reminderEvents.length - 1)
                    )}
                </GlassView>
            </View>

            {/* Native Custom Timing Sheet */}
            <FinanceCustomTimingSheet
                visible={customTimingModalVisible}
                onClose={() => setCustomTimingModalVisible(false)}
                eventType={customTimingTargetEvent}
                currentTimingValue={
                    customTimingTargetEvent === 'payment_due'
                        ? notificationSettings.eventRules.payment_due?.paymentDueTiming
                        : notificationSettings.eventRules.pending_approval_reminder?.reminderTiming
                }
                onSave={(newTiming: string) => handleUpdateEventTiming(customTimingTargetEvent, newTiming)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: 16,
    },
    tabContent: {
        gap: 16,
    },
    sectionBlock: {
        gap: 8,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
    },
    sectionHeader: {
        fontSize: 13,
        fontWeight: '600',
        paddingHorizontal: 8,
        letterSpacing: -0.1,
    },
    sectionScopeBadge: {
        fontSize: 12,
        fontWeight: '500',
    },
    sectionHelperText: {
        fontSize: 12,
        lineHeight: 16,
        paddingHorizontal: 8,
        marginTop: -2,
    },
    card: {
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
    },
    eventRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        gap: 12,
    },
    eventContent: {
        flex: 1,
        gap: 3,
    },
    eventTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
    },
    eventTitle: {
        fontSize: 16,
        fontWeight: '500',
        letterSpacing: -0.3,
    },
    eventSubtitle: {
        fontSize: 13,
        fontWeight: '400',
        lineHeight: 17,
    },
    timingDropdownPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    timingPillText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#FF9500',
    },
    recipientBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 2,
    },
    recipientText: {
        fontSize: 12,
        fontWeight: '500',
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 16,
        marginRight: 0,
    },
    presetSectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
    },
    presetSubtitle: {
        fontSize: 12,
        fontWeight: '500',
    },
    presetScrollContent: {
        paddingHorizontal: 4,
        gap: 10,
        paddingVertical: 4,
    },
    presetCardTouch: {
        width: 210,
    },
    presetCard: {
        borderRadius: 18,
        padding: 14,
        gap: 8,
        height: 112,
    },
    presetTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    presetTitle: {
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    presetDesc: {
        fontSize: 12,
        lineHeight: 16,
    },
    customRulesList: {
        gap: 12,
    },
    customRuleCard: {
        borderRadius: 20,
        padding: 14,
        gap: 10,
    },
    customRuleHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    customRuleTitleCol: {
        flex: 1,
        gap: 4,
    },
    customRuleTitle: {
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    chipsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    whenChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(255,149,0,0.12)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    chipPrefix: {
        fontSize: 10,
        fontWeight: '700',
        color: '#FF9500',
    },
    chipValue: {
        fontSize: 11,
        fontWeight: '600',
        color: '#FF9500',
    },
    ruleSummaryBox: {
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
    ruleSummaryText: {
        fontSize: 12,
        fontWeight: '500',
        lineHeight: 16,
    },
    ruleLogicBox: {
        borderRadius: 12,
        padding: 10,
        gap: 6,
    },
    logicRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
    },
    logicLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#007AFF',
        width: 34,
    },
    logicValuesList: {
        flex: 1,
        gap: 2,
    },
    logicItemText: {
        fontSize: 13,
        fontWeight: '500',
        flex: 1,
    },
    emptyCard: {
        borderRadius: 24,
        paddingVertical: 36,
        paddingHorizontal: 20,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    emptySubtitle: {
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 18,
    },
});
