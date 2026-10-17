import React, { useState, useEffect, useMemo } from 'react';
import { Alert } from 'react-native';
import {
    Host,
    BottomSheet,
    HStack,
    VStack,
    Spacer,
    Text as SwiftUIText,
    Button,
    Form,
    Section,
    Picker,
    TextField,
} from '@expo/ui/swift-ui';
import {
    padding,
    frame,
    background,
    ignoreSafeArea,
    tint,
} from '@expo/ui/swift-ui/modifiers';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import {
    FinanceCustomNotificationRule,
    FinanceBuiltinEventKey,
    CustomRuleCondition,
    CustomRuleRecipient,
    CUSTOM_RULE_OPERATOR_OPTIONS,
    getContextualFieldsForTrigger,
    generateHumanReadableRuleSummary,
    fetchOrganizationEmployees,
    fetchOrganizationPositions,
    OrganizationEmployeeItem,
    OrganizationPositionItem,
} from '@/lib/api/financeSetup';

export interface FinanceCustomRuleEditSheetProps {
    visible: boolean;
    onClose: () => void;
    customRule: FinanceCustomNotificationRule | null;
    onSave: (rule: FinanceCustomNotificationRule) => void;
    onDelete?: (ruleId: string) => void;
}

const STATUS_OPTIONS = ['Active', 'Inactive'];

const DYNAMIC_RECIPIENT_OPTIONS = [
    { value: 'finance_manager', name: 'Finance Manager', type: 'dynamic' as const },
    { value: 'active_approver', name: 'Active Matrix Approver', type: 'dynamic' as const },
    { value: 'dept_head', name: 'Department Head', type: 'dynamic' as const },
    { value: 'requester', name: 'Document Requester', type: 'dynamic' as const },
    { value: 'consolidation_owner', name: 'Consolidation Owner', type: 'dynamic' as const },
    { value: 'admin', name: 'Organization Admin', type: 'role' as const },
    { value: 'finance_team', name: 'All Finance Members', type: 'role' as const },
];

const TRIGGER_EVENT_OPTIONS: Array<{ key: FinanceBuiltinEventKey; label: string }> = [
    { key: 'approval_required', label: 'Approval Required' },
    { key: 'request_fully_approved', label: 'Request Fully Approved' },
    { key: 'request_rejected', label: 'Request Rejected' },
    { key: 'revision_requested', label: 'Revision Requested' },
    { key: 'request_cancelled', label: 'Request Cancelled / Voided' },
    { key: 'ready_for_consolidation', label: 'Ready for Consolidation' },
    { key: 'consolidation_completed', label: 'Consolidation Completed' },
    { key: 'ready_for_payment', label: 'Ready for Payment' },
    { key: 'payment_completed', label: 'Payment Completed' },
    { key: 'payment_failed', label: 'Payment Failed / Reversed' },
    { key: 'payment_due', label: 'Payment Due' },
    { key: 'pending_approval_reminder', label: 'Pending Approval Reminder' },
];

const AVAILABLE_VARIABLES = [
    { tag: '{{amount}}', label: 'Amount', sample: 'Rp 100.000.000', desc: 'Total document amount' },
    { tag: '{{document_number}}', label: 'Doc Number', sample: 'PR-2026-008', desc: 'Official document code' },
    { tag: '{{document_type}}', label: 'Doc Type', sample: 'Payment Request', desc: 'Document category' },
    { tag: '{{requester_name}}', label: 'Requester', sample: 'Budi Santoso', desc: 'Employee who submitted' },
    { tag: '{{department}}', label: 'Department', sample: 'Operations', desc: 'Requesting department' },
    { tag: '{{due_date}}', label: 'Due Date', sample: '15 Sep 2026', desc: 'Payment due date' },
    { tag: '{{payee}}', label: 'Payee', sample: 'PT Maju Bersama', desc: 'Beneficiary / vendor' },
];

export function FinanceCustomRuleEditSheet({
    visible,
    onClose,
    customRule,
    onSave,
    onDelete,
}: FinanceCustomRuleEditSheetProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';
    const menuControlModifiers = [tint(isDark ? '#FFFFFF' : '#1C1C1E')];

    const isEditMode = !!customRule;

    const [name, setName] = useState('');
    const [statusIndex, setStatusIndex] = useState(0); // 0 = Active, 1 = Inactive
    const [triggerIndex, setTriggerIndex] = useState(0);
    const [conditions, setConditions] = useState<CustomRuleCondition[]>([]);
    const [selectedRecipientValues, setSelectedRecipientValues] = useState<string[]>(['finance_manager']);
    const [messageTypeIndex, setMessageTypeIndex] = useState(0); // 0 = Custom Message, 1 = Default Template
    const [customTitle, setCustomTitle] = useState('');
    const [customBody, setCustomBody] = useState('');
    const [mountKey, setMountKey] = useState(0);

    // Database members and positions
    const [dbEmployees, setDbEmployees] = useState<OrganizationEmployeeItem[]>([]);
    const [dbPositions, setDbPositions] = useState<OrganizationPositionItem[]>([]);

    useEffect(() => {
        let isMounted = true;
        async function loadDbRecipients() {
            try {
                const [emps, pos] = await Promise.all([
                    fetchOrganizationEmployees(),
                    fetchOrganizationPositions(),
                ]);
                if (isMounted) {
                    setDbEmployees(emps || []);
                    setDbPositions(pos || []);
                }
            } catch (err) {
                console.warn('[FinanceCustomRuleEditSheet] Failed to fetch DB recipients', err);
            }
        }
        loadDbRecipients();
        return () => {
            isMounted = false;
        };
    }, []);

    const selectedTrigger = TRIGGER_EVENT_OPTIONS[triggerIndex]?.key || 'approval_required';
    const contextualFields = useMemo(() => getContextualFieldsForTrigger(selectedTrigger), [selectedTrigger]);

    useEffect(() => {
        if (visible) {
            setMountKey((prev) => prev + 1);
            if (customRule) {
                setName(customRule.name);
                setStatusIndex(customRule.enabled ? 0 : 1);
                const tIdx = TRIGGER_EVENT_OPTIONS.findIndex((t) => t.key === customRule.triggerEvent);
                setTriggerIndex(tIdx >= 0 ? tIdx : 0);
                setConditions(customRule.conditions || []);
                setSelectedRecipientValues((customRule.recipients || []).map((r) => r.value));
                setMessageTypeIndex(customRule.messageType === 'template' ? 1 : 0);
                setCustomTitle(customRule.customTitle || '');
                setCustomBody(customRule.customBody || '');
            } else {
                setName('');
                setStatusIndex(0);
                setTriggerIndex(0);
                setConditions([
                    {
                        id: `c_${Date.now()}`,
                        field: 'amount',
                        operator: 'greater_than',
                        value: '100000000',
                    },
                ]);
                setSelectedRecipientValues(['finance_manager']);
                setMessageTypeIndex(0);
                setCustomTitle('⚠️ Alert: {{document_type}} ({{amount}})');
                setCustomBody('High-value {{document_type}} {{document_number}} submitted by {{requester_name}} for {{amount}}.');
            }
        }
    }, [visible, customRule]);

    const handleAddCondition = () => {
        Haptics.selectionAsync();
        const defaultField = contextualFields[0]?.value || 'amount';
        const newCond: CustomRuleCondition = {
            id: `cond_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            field: defaultField,
            operator: 'greater_than',
            value: '',
        };
        setConditions([...conditions, newCond]);
    };

    const handleRemoveCondition = (condId: string) => {
        Haptics.selectionAsync();
        setConditions(conditions.filter((c) => c.id !== condId));
    };

    const handleUpdateCondition = (condId: string, updates: Partial<CustomRuleCondition>) => {
        setConditions(conditions.map((c) => (c.id === condId ? { ...c, ...updates } : c)));
    };

    // Available Recipient Options to Add
    const availableRecipientOptions = useMemo(() => {
        const list: Array<{ value: string; label: string; group: string }> = [];

        // 1. Dynamic Roles
        DYNAMIC_RECIPIENT_OPTIONS.forEach((opt) => {
            if (!selectedRecipientValues.includes(opt.value)) {
                list.push({
                    value: opt.value,
                    label: `[Workflow] ${opt.name}`,
                    group: 'Workflow Roles',
                });
            }
        });

        // 2. Positions
        dbPositions.forEach((pos) => {
            const val = `pos_${pos.id}`;
            if (!selectedRecipientValues.includes(val)) {
                list.push({
                    value: val,
                    label: `[Role] ${pos.title}`,
                    group: 'Positions',
                });
            }
        });

        // 3. Employees
        dbEmployees.forEach((emp) => {
            const val = `emp_${emp.id}`;
            if (!selectedRecipientValues.includes(val)) {
                list.push({
                    value: val,
                    label: `[Member] ${emp.name} (${emp.positionTitle || 'Staff'})`,
                    group: 'Members',
                });
            }
        });

        return list;
    }, [selectedRecipientValues, dbPositions, dbEmployees]);

    const handleAddRecipientByValue = (val: string) => {
        if (!val || selectedRecipientValues.includes(val)) return;
        Haptics.selectionAsync();
        setSelectedRecipientValues([...selectedRecipientValues, val]);
    };

    const handleRemoveRecipient = (val: string) => {
        Haptics.selectionAsync();
        if (selectedRecipientValues.length <= 1) {
            Alert.alert('Required', 'A rule must have at least one recipient.');
            return;
        }
        setSelectedRecipientValues(selectedRecipientValues.filter((v) => v !== val));
    };

    const resolvedRecipients = useMemo<CustomRuleRecipient[]>(() => {
        return selectedRecipientValues.map((val) => {
            const opt = DYNAMIC_RECIPIENT_OPTIONS.find((o) => o.value === val);
            if (opt) {
                return {
                    id: `rec_${val}`,
                    type: opt.type,
                    value: val,
                    name: opt.name,
                };
            }
            const pos = dbPositions.find((p) => p.id === val || `pos_${p.id}` === val);
            if (pos) {
                return {
                    id: `rec_pos_${pos.id}`,
                    type: 'role' as const,
                    value: `pos_${pos.id}`,
                    name: pos.title,
                };
            }
            const emp = dbEmployees.find((e) => e.id === val || `emp_${e.id}` === val);
            if (emp) {
                return {
                    id: `rec_emp_${emp.id}`,
                    type: 'user' as const,
                    value: `emp_${emp.id}`,
                    name: emp.name,
                };
            }
            return {
                id: `rec_${val}`,
                type: 'dynamic' as const,
                value: val,
                name: val,
            };
        });
    }, [selectedRecipientValues, dbPositions, dbEmployees]);

    const liveSummary = useMemo(() => {
        return generateHumanReadableRuleSummary({
            name,
            triggerEvent: selectedTrigger,
            conditions,
            recipients: resolvedRecipients,
        });
    }, [name, selectedTrigger, conditions, resolvedRecipients]);

    // Live Rendered Sample Previews
    const previewTitle = useMemo(() => {
        let res = customTitle || '';
        AVAILABLE_VARIABLES.forEach((v) => {
            res = res.replace(new RegExp(v.tag.replace(/[{}]/g, '\\$&'), 'g'), v.sample);
        });
        return res;
    }, [customTitle]);

    const previewBody = useMemo(() => {
        let res = customBody || '';
        AVAILABLE_VARIABLES.forEach((v) => {
            res = res.replace(new RegExp(v.tag.replace(/[{}]/g, '\\$&'), 'g'), v.sample);
        });
        return res;
    }, [customBody]);

    const handleSave = () => {
        if (!name.trim()) {
            Alert.alert('Required Field', 'Please provide a descriptive name for this rule.');
            return;
        }

        const newRule: FinanceCustomNotificationRule = {
            id: customRule?.id || `custom_rule_${Date.now()}`,
            name: name.trim(),
            enabled: statusIndex === 0,
            triggerEvent: selectedTrigger,
            conditions: conditions.filter((c) => !!c.field),
            recipients: resolvedRecipients,
            messageType: messageTypeIndex === 1 ? 'template' : 'custom',
            templateId: messageTypeIndex === 1 ? selectedTrigger : undefined,
            customTitle: customTitle.trim(),
            customBody: customBody.trim(),
            createdAt: customRule?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onSave(newRule);
        onClose();
    };

    const handleDelete = () => {
        if (!customRule || !onDelete) return;
        Alert.alert(
            'Delete Rule',
            `Are you sure you want to delete "${customRule.name}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                        onDelete(customRule.id);
                        onClose();
                    },
                },
            ]
        );
    };

    return (
        <Host
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 9999,
                pointerEvents: visible ? 'auto' : 'none',
            }}
            colorScheme={isDark ? 'dark' : 'light'}
        >
            <BottomSheet
                isOpened={visible}
                onIsOpenedChange={(opened) => {
                    if (!opened) onClose();
                }}
                presentationDetents={[0.88, 0.96]}
                presentationDragIndicator="hidden"
            >
                <VStack
                    spacing={0}
                    modifiers={[
                        background('clear'),
                        ignoreSafeArea({ regions: 'all', edges: 'bottom' }),
                        frame({ maxWidth: 9999, maxHeight: 9999 }),
                    ]}
                >
                    {/* Header */}
                    <HStack
                        alignment="center"
                        modifiers={[
                            padding({ top: 16, leading: 20, trailing: 20, bottom: 12 }),
                            frame({ maxWidth: 9999 }),
                        ]}
                    >
                        <Button
                            variant="plain"
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                onClose();
                            }}
                        >
                            <SwiftUIText size={16} color={subtextColor}>
                                Cancel
                            </SwiftUIText>
                        </Button>

                        <Spacer />

                        <SwiftUIText size={17} weight="bold" color={textColor}>
                            {isEditMode ? 'Edit Custom Rule' : 'New Custom Rule'}
                        </SwiftUIText>

                        <Spacer />

                        <Button
                            variant="plain"
                            onPress={handleSave}
                        >
                            <SwiftUIText size={16} weight="semibold" color="#007AFF">
                                Save
                            </SwiftUIText>
                        </Button>
                    </HStack>

                    {/* Native Form */}
                    <Form modifiers={[background('clear'), frame({ maxWidth: 9999, maxHeight: 9999 })]}>
                        {/* 1. Rule Info */}
                        <Section title="Rule Information">
                            <VStack alignment="leading" spacing={4} modifiers={[padding({ vertical: 2 })]}>
                                <SwiftUIText size={12} color={subtextColor}>
                                    Rule Name
                                </SwiftUIText>
                                <TextField
                                    key={`name-input-${mountKey}`}
                                    defaultValue={name}
                                    onChangeText={(val: string) => setName(val)}
                                    placeholder="e.g. High-Value Payment Alert"
                                    modifiers={[frame({ maxWidth: 9999 }), tint('#007AFF')]}
                                />
                            </VStack>

                            <Picker
                                label="Status"
                                variant="menu"
                                selectedIndex={statusIndex}
                                onOptionSelected={({ nativeEvent: { index } }) => {
                                    Haptics.selectionAsync();
                                    setStatusIndex(index);
                                }}
                                options={STATUS_OPTIONS}
                                modifiers={menuControlModifiers}
                            />
                        </Section>

                        {/* 2. WHEN Trigger */}
                        <Section title="WHEN (Trigger Event)">
                            <Picker
                                label="Workflow Event"
                                variant="menu"
                                selectedIndex={triggerIndex}
                                onOptionSelected={({ nativeEvent: { index } }) => {
                                    Haptics.selectionAsync();
                                    setTriggerIndex(index);
                                }}
                                options={TRIGGER_EVENT_OPTIONS.map((t) => t.label)}
                                modifiers={menuControlModifiers}
                            />
                        </Section>

                        {/* 3. IF Conditions (Contextual) */}
                        <Section title="IF (Matching Conditions)">
                            {conditions.map((c, idx) => {
                                const fIdx = contextualFields.findIndex((f) => f.value === c.field);
                                const safeFIdx = fIdx >= 0 ? fIdx : 0;
                                const oIdx = CUSTOM_RULE_OPERATOR_OPTIONS.findIndex((o) => o.value === c.operator);
                                const condTitle = idx === 0 ? 'Condition (IF)' : `Condition (AND)`;

                                return (
                                    <VStack
                                        key={c.id}
                                        alignment="leading"
                                        spacing={8}
                                        modifiers={[padding({ vertical: 6 })]}
                                    >
                                        <HStack alignment="center">
                                            <SwiftUIText size={13} weight="bold" color={textColor}>
                                                {condTitle}
                                            </SwiftUIText>
                                            <Spacer />
                                            <Button
                                                variant="plain"
                                                onPress={() => handleRemoveCondition(c.id)}
                                            >
                                                <SwiftUIText size={13} color="#FF3B30">
                                                    Remove
                                                </SwiftUIText>
                                            </Button>
                                        </HStack>

                                        <Picker
                                            label="Field"
                                            variant="menu"
                                            selectedIndex={safeFIdx}
                                            onOptionSelected={({ nativeEvent: { index } }) => {
                                                Haptics.selectionAsync();
                                                handleUpdateCondition(c.id, {
                                                    field: contextualFields[index].value,
                                                });
                                            }}
                                            options={contextualFields.map((f) => f.label)}
                                            modifiers={menuControlModifiers}
                                        />

                                        <Picker
                                            label="Operator"
                                            variant="menu"
                                            selectedIndex={oIdx >= 0 ? oIdx : 0}
                                            onOptionSelected={({ nativeEvent: { index } }) => {
                                                Haptics.selectionAsync();
                                                handleUpdateCondition(c.id, {
                                                    operator: CUSTOM_RULE_OPERATOR_OPTIONS[index].value,
                                                });
                                            }}
                                            options={CUSTOM_RULE_OPERATOR_OPTIONS.map((o) => o.label)}
                                            modifiers={menuControlModifiers}
                                        />

                                        <TextField
                                            key={`cond-val-${c.id}-${mountKey}`}
                                            defaultValue={c.value}
                                            onChangeText={(val: string) => handleUpdateCondition(c.id, { value: val })}
                                            placeholder={contextualFields[safeFIdx]?.placeholder || 'Enter value...'}
                                            modifiers={[frame({ maxWidth: 9999 }), tint('#007AFF')]}
                                        />
                                    </VStack>
                                );
                            })}

                            <Button
                                variant="plain"
                                onPress={handleAddCondition}
                            >
                                <SwiftUIText size={15} color="#007AFF">
                                    + Add Condition
                                </SwiftUIText>
                            </Button>
                        </Section>

                        {/* 4. THEN Recipients (Interactive Add List via Dropdown) */}
                        <Section title="THEN (Notify Recipients)">
                            {/* Selected Recipients List */}
                            {resolvedRecipients.map((rec) => (
                                <HStack key={rec.id} alignment="center" modifiers={[padding({ vertical: 3 })]}>
                                    <VStack alignment="leading" spacing={2}>
                                        <SwiftUIText size={15} color={textColor}>
                                            {rec.name}
                                        </SwiftUIText>
                                        <SwiftUIText size={11} color={subtextColor}>
                                            {rec.type === 'dynamic' ? 'Dynamic Workflow Role' : rec.type === 'role' ? 'Organization Role' : 'Team Member'}
                                        </SwiftUIText>
                                    </VStack>
                                    <Spacer />
                                    <Button
                                        variant="plain"
                                        onPress={() => handleRemoveRecipient(rec.value)}
                                    >
                                        <SwiftUIText size={13} color="#FF3B30">
                                            Remove
                                        </SwiftUIText>
                                    </Button>
                                </HStack>
                            ))}

                            {/* Dropdown Menu to Add Additional Recipient */}
                            {availableRecipientOptions.length > 0 && (
                                <Picker
                                    label="+ Add Recipient"
                                    variant="menu"
                                    selectedIndex={0}
                                    onOptionSelected={({ nativeEvent: { index } }) => {
                                        if (index > 0 && availableRecipientOptions[index - 1]) {
                                            handleAddRecipientByValue(availableRecipientOptions[index - 1].value);
                                        }
                                    }}
                                    options={['Choose recipient to add...', ...availableRecipientOptions.map((o) => o.label)]}
                                    modifiers={menuControlModifiers}
                                />
                            )}
                        </Section>

                        {/* 5. MESSAGE */}
                        <Section title="MESSAGE">
                            <Picker
                                label="Message Format"
                                variant="menu"
                                selectedIndex={messageTypeIndex}
                                onOptionSelected={({ nativeEvent: { index } }) => {
                                    Haptics.selectionAsync();
                                    setMessageTypeIndex(index);
                                }}
                                options={['Custom Message', 'Use Default Template']}
                                modifiers={menuControlModifiers}
                            />

                            {messageTypeIndex === 0 && (
                                <>
                                    <VStack alignment="leading" spacing={4} modifiers={[padding({ vertical: 4 })]}>
                                        <SwiftUIText size={12} color={subtextColor}>
                                            Notification Title
                                        </SwiftUIText>
                                        <TextField
                                            key={`custom-title-${mountKey}`}
                                            defaultValue={customTitle}
                                            onChangeText={(val: string) => setCustomTitle(val)}
                                            placeholder="e.g. ⚠️ High-Value Alert: {{document_type}}"
                                            modifiers={[frame({ maxWidth: 9999 }), tint('#007AFF')]}
                                        />
                                    </VStack>

                                    <VStack alignment="leading" spacing={4} modifiers={[padding({ vertical: 4 })]}>
                                        <SwiftUIText size={12} color={subtextColor}>
                                            Notification Body
                                        </SwiftUIText>
                                        <TextField
                                            key={`custom-body-${mountKey}`}
                                            defaultValue={customBody}
                                            onChangeText={(val: string) => setCustomBody(val)}
                                            placeholder="e.g. {{document_number}} requires urgent authorization."
                                            modifiers={[frame({ maxWidth: 9999 }), tint('#007AFF')]}
                                        />
                                    </VStack>

                                    {/* Variable Explanation & Quick-Insert */}
                                    <VStack alignment="leading" spacing={6} modifiers={[padding({ vertical: 6 })]}>
                                        <SwiftUIText size={12} weight="bold" color={textColor}>
                                            Available Variables (Tap to Insert into Body)
                                        </SwiftUIText>
                                        <SwiftUIText size={11} color={subtextColor}>
                                            {"Tags like {{amount}} are placeholders automatically replaced by real transaction data:"}
                                        </SwiftUIText>
                                        {AVAILABLE_VARIABLES.map((v) => (
                                            <Button
                                                key={v.tag}
                                                variant="plain"
                                                onPress={() => {
                                                    Haptics.selectionAsync();
                                                    setCustomBody((prev) => (prev ? `${prev} ${v.tag}` : v.tag));
                                                    setMountKey((k) => k + 1);
                                                }}
                                            >
                                                <HStack alignment="center">
                                                    <SwiftUIText size={13} weight="semibold" color="#007AFF">
                                                        {`+ ${v.tag}`}
                                                    </SwiftUIText>
                                                    <Spacer />
                                                    <SwiftUIText size={12} color={subtextColor}>
                                                        {`${v.desc} (${v.sample})`}
                                                    </SwiftUIText>
                                                </HStack>
                                            </Button>
                                        ))}
                                    </VStack>

                                    {/* Live Notification Preview */}
                                    <VStack alignment="leading" spacing={4} modifiers={[padding({ vertical: 6 })]}>
                                        <SwiftUIText size={12} weight="bold" color={textColor}>
                                            Push Notification Preview
                                        </SwiftUIText>
                                        <VStack
                                            alignment="leading"
                                            spacing={4}
                                            modifiers={[
                                                background(isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
                                                padding({ vertical: 10, horizontal: 12 }),
                                            ]}
                                        >
                                            <SwiftUIText size={13} weight="bold" color={textColor}>
                                                {previewTitle || 'Notification Title'}
                                            </SwiftUIText>
                                            <SwiftUIText size={12} color={subtextColor}>
                                                {previewBody || 'Notification message body will appear here.'}
                                            </SwiftUIText>
                                        </VStack>
                                    </VStack>
                                </>
                            )}
                        </Section>

                        {/* 6. Live Human-Readable Rule Summary */}
                        <Section title="Live Rule Summary">
                            <VStack alignment="leading" spacing={6} modifiers={[padding({ vertical: 4 })]}>
                                <SwiftUIText size={14} weight="semibold" color="#007AFF">
                                    {liveSummary}
                                </SwiftUIText>
                                <SwiftUIText size={11} color={subtextColor}>
                                    This summary updates in real-time to preview your rule behavior before saving.
                                </SwiftUIText>
                            </VStack>
                        </Section>

                        {/* 7. Delete Option if Editing */}
                        {isEditMode && onDelete && (
                            <Section>
                                <Button
                                    variant="plain"
                                    onPress={handleDelete}
                                >
                                    <SwiftUIText size={15} color="#FF3B30">
                                        Delete Custom Rule
                                    </SwiftUIText>
                                </Button>
                            </Section>
                        )}
                    </Form>
                </VStack>
            </BottomSheet>
        </Host>
    );
}
