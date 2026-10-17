import React, { useState, useEffect, useMemo } from 'react';
import { View, Dimensions } from 'react-native';
import {
    Host,
    BottomSheet,
    VStack,
    HStack,
    Spacer,
    Text as SwiftUIText,
    Button,
    Form,
    Section,
    TextField,
    Picker,
    Switch,
} from '@expo/ui/swift-ui';
import {
    padding,
    background,
    ignoreSafeArea,
    frame,
    tint,
    foregroundColor,
    buttonStyle,
    shadow,
} from '@expo/ui/swift-ui/modifiers';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { ScheduledActivity, ScheduleTaskStatus, FrequencyType } from './types';
import { JCLUB_REPORT_TYPES } from './mockData';

interface ScheduledTaskDetailSheetProps {
    visible: boolean;
    activity: ScheduledActivity | null;
    onClose: () => void;
    onSaveActivity?: (updated: ScheduledActivity) => void;
    onOpenGlobalTasks?: (activity: ScheduledActivity) => void;
}

const ASSIGNEE_OPTIONS = [
    { name: 'Citra Kirana', role: 'Building Tech' },
    { name: 'Budi Prakoso', role: 'IT / Security' },
    { name: 'Siti Rahma', role: 'Housekeeping' },
    { name: 'Rian Pratama', role: 'Housekeeping' },
    { name: 'Ahmad Fauzi', role: 'Chief Engineering' },
];

const FREQUENCY_OPTIONS: FrequencyType[] = ['Daily', 'Weekly', 'Biweekly', 'Monthly'];

const STATUS_OPTIONS: { id: ScheduleTaskStatus; label: string }[] = [
    { id: 'pending', label: 'Pending' },
    { id: 'due_today', label: 'Due Today / Active' },
    { id: 'completed', label: 'Completed / Done' },
    { id: 'overdue', label: 'Overdue' },
];

export function ScheduledTaskDetailSheet({
    visible,
    activity,
    onClose,
    onSaveActivity,
    onOpenGlobalTasks,
}: ScheduledTaskDetailSheetProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#8E8E93';

    // Editable state
    const [isEditing, setIsEditing] = useState(false);
    const [assigneeName, setAssigneeName] = useState('');
    const [assigneeRole, setAssigneeRole] = useState('');
    const [status, setStatus] = useState<ScheduleTaskStatus>('pending');
    const [frequency, setFrequency] = useState<FrequencyType>('Daily');
    const [dueTime, setDueTime] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [notes, setNotes] = useState('');

    // Checklist field values
    const [fieldValues, setFieldValues] = useState<Record<string, string>>({});

    useEffect(() => {
        if (activity && visible) {
            setAssigneeName(activity.assigneeName);
            setAssigneeRole(activity.assigneeRole);
            setStatus(activity.status);
            setFrequency(activity.frequency);
            setDueTime(activity.dueTime);
            setDueDate(activity.dueDate);
            setNotes(
                activity.status === 'completed'
                    ? `Pemeriksaan selesai dilakukan oleh ${activity.assigneeName}. Kondisi seluruh unit normal.`
                    : `Tugas operasional terjadwal untuk ${activity.assigneeName}.`
            );
            setIsEditing(false);

            // Initialize sample field values
            setFieldValues({
                f_elec: '1284.6',
                f_water: '382.1',
                f_cond: 'Normal',
                f_cctv_op: 'Operational (16 ch)',
                f_rec_op: 'Recording Active',
            });
        }
    }, [activity, visible]);

    if (!activity) return null;

    // Find full template definition
    const parentReportType = JCLUB_REPORT_TYPES.find(rt => rt.id === activity.reportTypeId);
    const templateDef = parentReportType?.activities.find(
        a => a.id === activity.activityId || a.name === activity.activityName
    );

    const isCompleted = status === 'completed';

    const handleSave = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const updated: ScheduledActivity = {
            ...activity,
            assigneeName,
            assigneeRole,
            status,
            frequency,
            dueTime,
            dueDate,
        };
        if (onSaveActivity) {
            onSaveActivity(updated);
        }
        setIsEditing(false);
    };

    return (
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet
                isOpened={visible}
                presentationDetents={[0.85, 'large']}
                presentationDragIndicator="visible"
                onIsOpenedChange={(opened) => {
                    if (!opened) onClose();
                }}
            >
                <VStack
                    spacing={0}
                    modifiers={[
                        ignoreSafeArea({ edges: 'bottom' }),
                        background('clear'),
                    ]}
                >
                    {/* Header Bar */}
                    <HStack
                        alignment="center"
                        modifiers={[
                            padding({ top: 16, leading: 20, bottom: 12, trailing: 20 }),
                            frame({ maxWidth: 9999 }),
                        ]}
                    >
                        <Button
                            variant="plain"
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                if (isEditing) {
                                    setIsEditing(false);
                                } else {
                                    onClose();
                                }
                            }}
                            modifiers={[foregroundColor('#007AFF')]}
                        >
                            <SwiftUIText size={17} weight="regular" color="#007AFF">
                                {isEditing ? 'Cancel' : 'Done'}
                            </SwiftUIText>
                        </Button>

                        <Spacer />

                        <SwiftUIText size={17} weight="bold" color={textColor}>
                            {isEditing ? 'Edit Task' : 'Task Details'}
                        </SwiftUIText>

                        <Spacer />

                        <Button
                            variant="plain"
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                if (isEditing) {
                                    handleSave();
                                } else {
                                    setIsEditing(true);
                                }
                            }}
                            modifiers={[foregroundColor('#007AFF')]}
                        >
                            <SwiftUIText size={17} weight="bold" color="#007AFF">
                                {isEditing ? 'Save' : 'Edit'}
                            </SwiftUIText>
                        </Button>
                    </HStack>

                    {/* SwiftUI Native Form */}
                    <Form modifiers={[background('clear')]}>
                        {/* Section 1: Task Overview */}
                        <Section title="Task Overview">
                            <HStack alignment="center">
                                <SwiftUIText color={subtextColor}>Activity</SwiftUIText>
                                <Spacer />
                                <SwiftUIText weight="semibold" color={textColor}>
                                    {activity.activityName}
                                </SwiftUIText>
                            </HStack>

                            <HStack alignment="center">
                                <SwiftUIText color={subtextColor}>Report Type</SwiftUIText>
                                <Spacer />
                                <SwiftUIText color={textColor}>
                                    {activity.reportTypeName}
                                </SwiftUIText>
                            </HStack>

                            {isEditing ? (
                                <>
                                    <Picker
                                        label="Status"
                                        selection={status}
                                        onSelectionChange={(val) => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            setStatus(val as ScheduleTaskStatus);
                                        }}
                                        modifiers={[tint('#007AFF')]}
                                    >
                                        {STATUS_OPTIONS.map((st) => (
                                            <SwiftUIText key={st.id} tag={st.id}>
                                                {st.label}
                                            </SwiftUIText>
                                        ))}
                                    </Picker>

                                    <Picker
                                        label="Frequency"
                                        selection={frequency}
                                        onSelectionChange={(val) => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            setFrequency(val as FrequencyType);
                                        }}
                                        modifiers={[tint('#007AFF')]}
                                    >
                                        {FREQUENCY_OPTIONS.map((fq) => (
                                            <SwiftUIText key={fq} tag={fq}>
                                                {fq}
                                            </SwiftUIText>
                                        ))}
                                    </Picker>
                                </>
                            ) : (
                                <>
                                    <HStack alignment="center">
                                        <SwiftUIText color={subtextColor}>Status</SwiftUIText>
                                        <Spacer />
                                        <SwiftUIText
                                            weight="bold"
                                            color={isCompleted ? '#34C759' : '#007AFF'}
                                        >
                                            {isCompleted ? 'Completed' : dueTime || 'Scheduled'}
                                        </SwiftUIText>
                                    </HStack>

                                    <HStack alignment="center">
                                        <SwiftUIText color={subtextColor}>Recurrence</SwiftUIText>
                                        <Spacer />
                                        <SwiftUIText color={textColor}>
                                            {frequency}
                                        </SwiftUIText>
                                    </HStack>
                                </>
                            )}
                        </Section>

                        {/* Section 2: Assignment & Schedule */}
                        <Section title="Assignment & Schedule">
                            {isEditing ? (
                                <>
                                    <Picker
                                        label="Assignee"
                                        selection={assigneeName}
                                        onSelectionChange={(val) => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            setAssigneeName(val);
                                            const found = ASSIGNEE_OPTIONS.find(a => a.name === val);
                                            if (found) setAssigneeRole(found.role);
                                        }}
                                        modifiers={[tint('#007AFF')]}
                                    >
                                        {ASSIGNEE_OPTIONS.map((a) => (
                                            <SwiftUIText key={a.name} tag={a.name}>
                                                {a.name} ({a.role})
                                            </SwiftUIText>
                                        ))}
                                    </Picker>

                                    <HStack alignment="center">
                                        <SwiftUIText color={subtextColor}>Scheduled Date</SwiftUIText>
                                        <Spacer />
                                        <TextField
                                            value={dueDate}
                                            onChangeText={setDueDate}
                                            placeholder="YYYY-MM-DD"
                                            modifiers={[tint('#007AFF')]}
                                        />
                                    </HStack>

                                    <HStack alignment="center">
                                        <SwiftUIText color={subtextColor}>Due Time</SwiftUIText>
                                        <Spacer />
                                        <TextField
                                            value={dueTime}
                                            onChangeText={setDueTime}
                                            placeholder="HH:MM WIB"
                                            modifiers={[tint('#007AFF')]}
                                        />
                                    </HStack>
                                </>
                            ) : (
                                <>
                                    <HStack alignment="center">
                                        <SwiftUIText color={subtextColor}>Assigned Person</SwiftUIText>
                                        <Spacer />
                                        <SwiftUIText weight="medium" color={textColor}>
                                            {assigneeName}
                                        </SwiftUIText>
                                    </HStack>

                                    <HStack alignment="center">
                                        <SwiftUIText color={subtextColor}>Role</SwiftUIText>
                                        <Spacer />
                                        <SwiftUIText color={subtextColor}>
                                            {assigneeRole}
                                        </SwiftUIText>
                                    </HStack>

                                    <HStack alignment="center">
                                        <SwiftUIText color={subtextColor}>Scheduled Date</SwiftUIText>
                                        <Spacer />
                                        <SwiftUIText color={textColor}>
                                            {dueDate} ({dueTime})
                                        </SwiftUIText>
                                    </HStack>
                                </>
                            )}
                        </Section>

                        {/* Section 3: Checklist Items & Readings */}
                        <Section title={`Checklist Items (${templateDef?.fields?.length || 3})`}>
                            {templateDef?.fields && templateDef.fields.length > 0 ? (
                                templateDef.fields.map((f) => (
                                    <HStack key={f.id} alignment="center">
                                        <VStack alignment="leading" spacing={2}>
                                            <SwiftUIText weight="medium" color={textColor}>
                                                {f.label}
                                            </SwiftUIText>
                                            <SwiftUIText size={12} color={subtextColor}>
                                                Type: {f.type} {f.unit ? `(${f.unit})` : ''} {f.required ? '• Required' : '• Optional'}
                                            </SwiftUIText>
                                        </VStack>
                                        <Spacer />
                                        {isEditing ? (
                                            <TextField
                                                value={fieldValues[f.id] || ''}
                                                onChangeText={(val) => setFieldValues(prev => ({ ...prev, [f.id]: val }))}
                                                placeholder={f.unit ? `Value (${f.unit})` : 'Normal / OK'}
                                                modifiers={[tint('#007AFF')]}
                                            />
                                        ) : (
                                            <SwiftUIText color={isCompleted ? '#34C759' : subtextColor} weight="semibold">
                                                {fieldValues[f.id] ? `${fieldValues[f.id]} ${f.unit || ''}` : (isCompleted ? 'Verified OK' : 'Pending Check')}
                                            </SwiftUIText>
                                        )}
                                    </HStack>
                                ))
                            ) : (
                                <HStack alignment="center">
                                    <SwiftUIText color={textColor}>Operational Checklist</SwiftUIText>
                                    <Spacer />
                                    <SwiftUIText color="#34C759" weight="medium">Verified Normal</SwiftUIText>
                                </HStack>
                            )}
                        </Section>

                        {/* Section 4: Technician Execution Notes */}
                        <Section title="Technician Notes & Observations">
                            {isEditing ? (
                                <TextField
                                    value={notes}
                                    onChangeText={setNotes}
                                    placeholder="Enter operational technician notes..."
                                    modifiers={[tint('#007AFF')]}
                                />
                            ) : (
                                <VStack alignment="leading" spacing={4} modifiers={[padding({ vertical: 4 })]}>
                                    <SwiftUIText size={14} color={textColor}>
                                        {notes || 'No remarks entered for this activity.'}
                                    </SwiftUIText>
                                </VStack>
                            )}
                        </Section>

                        {/* Section 5: Global Tasks Action */}
                        <Section>
                            <Button
                                systemImage="arrow.up.right.square"
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    onClose();
                                    onOpenGlobalTasks?.(activity);
                                }}
                                modifiers={[
                                    foregroundColor('#007AFF'),
                                ]}
                            >
                                <SwiftUIText weight="bold" color="#007AFF">
                                    Open in Global Tasks
                                </SwiftUIText>
                            </Button>
                        </Section>
                    </Form>
                </VStack>
            </BottomSheet>
        </Host>
    );
}
