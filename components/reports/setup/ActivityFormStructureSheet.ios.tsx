import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
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
    foregroundColor,
} from '@expo/ui/swift-ui/modifiers';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { ActivityTemplate, FormFieldConfig, FrequencyType } from '../types';

export interface ActivityFormStructureSheetProps {
    visible: boolean;
    activity: ActivityTemplate | null;
    reportTypeName?: string;
    reportTypeColor?: string;
    onClose: () => void;
    onSave: (updatedActivity: ActivityTemplate) => void;
    onDelete?: (activityId: string) => void;
}

const FREQUENCY_OPTIONS: FrequencyType[] = [
    'Daily',
    'Weekly',
    'Biweekly',
    'Monthly',
    'Every N Days',
    'Specific Weekdays',
    'Specific Dates',
    'Date Window',
    'Custom'
];

const FIELD_TYPES: { id: FormFieldConfig['type']; label: string; defaultUnit?: string }[] = [
    { id: 'unit_value', label: 'Measurement & Unit', defaultUnit: 'kWh' },
    { id: 'condition', label: 'Condition Rating (Normal/Attention/Critical)' },
    { id: 'checkbox', label: 'Pass / Checkbox Toggle' },
    { id: 'number', label: 'Numeric Quantity' },
    { id: 'text', label: 'Short Text Input' },
    { id: 'photo', label: 'Photo Proof Attachment' },
    { id: 'notes', label: 'Observation / Notes' },
    { id: 'dropdown', label: 'Dropdown Selection' },
];

export function ActivityFormStructureSheet({
    visible,
    activity,
    reportTypeName,
    reportTypeColor = '#14B8A6',
    onClose,
    onSave,
    onDelete,
}: ActivityFormStructureSheetProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#8E8E93';

    // Core Activity Metadata
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [frequencyIndex, setFrequencyIndex] = useState(0);
    const [frequencyDetail, setFrequencyDetail] = useState('');
    const [defaultAssignee, setDefaultAssignee] = useState('');
    const [durationMinutes, setDurationMinutes] = useState('15');

    // Fields List
    const [fields, setFields] = useState<FormFieldConfig[]>([]);

    // New Field Quick-Add State
    const [newFieldLabel, setNewFieldLabel] = useState('');
    const [newFieldTypeIdx, setNewFieldTypeIdx] = useState(0);
    const [newFieldUnit, setNewFieldUnit] = useState('');
    const [newFieldRequired, setNewFieldRequired] = useState(true);

    // Live Preview State
    const [previewValues, setPreviewValues] = useState<Record<string, any>>({});
    const [previewMode, setPreviewMode] = useState(false);

    useEffect(() => {
        if (activity && visible) {
            setName(activity.name || '');
            setDescription(activity.description || '');
            const fIdx = FREQUENCY_OPTIONS.indexOf(activity.frequency);
            setFrequencyIndex(fIdx >= 0 ? fIdx : 0);
            setFrequencyDetail(activity.frequencyDetail || '');
            setDefaultAssignee(activity.defaultAssignee || '');
            setDurationMinutes(String(activity.estimatedDurationMinutes || 15));
            setFields(activity.fields ? JSON.parse(JSON.stringify(activity.fields)) : []);
            setNewFieldLabel('');
            setNewFieldUnit('');
            setPreviewMode(false);

            // Seed preview values
            const initialVals: Record<string, any> = {};
            (activity.fields || []).forEach(f => {
                initialVals[f.id] = f.defaultValue !== undefined ? f.defaultValue : (f.type === 'checkbox' ? true : f.type === 'condition' ? 'Normal' : '');
            });
            setPreviewValues(initialVals);
        }
    }, [activity, visible]);

    if (!activity) return null;

    const handleAddField = () => {
        if (!newFieldLabel.trim()) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        const typeObj = FIELD_TYPES[newFieldTypeIdx];
        const newField: FormFieldConfig = {
            id: `f_${Date.now()}`,
            label: newFieldLabel.trim(),
            type: typeObj.id,
            required: newFieldRequired,
            unit: typeObj.id === 'unit_value' ? (newFieldUnit.trim() || 'Unit') : undefined,
            defaultValue: typeObj.id === 'checkbox' ? true : typeObj.id === 'condition' ? 'Normal' : undefined,
            options: typeObj.id === 'condition' ? ['Normal', 'Needs Attention', 'Critical'] : undefined,
        };

        setFields(prev => [...prev, newField]);
        setNewFieldLabel('');
        setNewFieldUnit('');
        setNewFieldRequired(true);
    };

    const handleRemoveField = (fieldId: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setFields(prev => prev.filter(f => f.id !== fieldId));
    };

    const handleQuickAddPreset = (type: FormFieldConfig['type'], defaultLabel: string, unit?: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const newField: FormFieldConfig = {
            id: `f_${Date.now()}`,
            label: defaultLabel,
            type,
            required: true,
            unit,
            defaultValue: type === 'checkbox' ? true : type === 'condition' ? 'Normal' : undefined,
            options: type === 'condition' ? ['Normal', 'Needs Attention', 'Critical'] : undefined,
        };
        setFields(prev => [...prev, newField]);
    };

    const handleSave = () => {
        if (!activity) return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const updated: ActivityTemplate = {
            ...activity,
            name: name.trim() || activity.name,
            description: description.trim(),
            frequency: FREQUENCY_OPTIONS[frequencyIndex],
            frequencyDetail: frequencyDetail.trim(),
            defaultAssignee: defaultAssignee.trim(),
            estimatedDurationMinutes: parseInt(durationMinutes, 10) || 15,
            fields: fields.length > 0 ? fields : activity.fields,
        };
        onSave(updated);
        onClose();
    };

    const sheetBg = isDark ? '#1C1C1E' : '#F2F2F7';

    return (
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet
                isOpened={visible && !!activity}
                presentationDetents={[0.9, 'large']}
                presentationDragIndicator="visible"
                onIsOpenedChange={(opened) => {
                    if (!opened) onClose();
                }}
            >
                {activity ? (
                    <VStack
                        spacing={0}
                        modifiers={[
                            ignoreSafeArea({ edges: 'bottom' }),
                            background(sheetBg),
                        ]}
                    >
                    {/* Header */}
                    <HStack
                        alignment="center"
                        modifiers={[
                            padding({ top: 16, leading: 20, bottom: 12, trailing: 20 }),
                            frame({ maxWidth: 9999 }),
                            background(sheetBg),
                        ]}
                    >
                        <Button
                            variant="plain"
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                onClose();
                            }}
                            modifiers={[foregroundColor(subtextColor)]}
                        >
                            <SwiftUIText size={17} color={subtextColor}>Cancel</SwiftUIText>
                        </Button>
                        <Spacer />
                        <SwiftUIText size={17} weight="bold" color={textColor}>
                            {previewMode ? 'Live Form Preview' : 'Form Structure'}
                        </SwiftUIText>
                        <Spacer />
                        <Button
                            variant="plain"
                            onPress={handleSave}
                            modifiers={[foregroundColor('#007AFF')]}
                        >
                            <SwiftUIText size={17} weight="bold" color="#007AFF">Save</SwiftUIText>
                        </Button>
                    </HStack>

                    <Form modifiers={[background(sheetBg)]}>
                        {/* Mode Switcher */}
                        <Section>
                            <Switch
                                value={previewMode}
                                onValueChange={(val) => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setPreviewMode(val);
                                }}
                                label="Interactive Form Preview"
                            />
                        </Section>

                        {previewMode ? (
                            /* LIVE PREVIEW MODE */
                            <>
                                <Section title={`Form: ${name || 'Activity'}`}>
                                    <HStack>
                                        <SwiftUIText color={subtextColor}>Assigned Staff</SwiftUIText>
                                        <Spacer />
                                        <SwiftUIText color={textColor}>{defaultAssignee || 'Citra Kirana (Building Tech)'}</SwiftUIText>
                                    </HStack>
                                    <HStack>
                                        <SwiftUIText color={subtextColor}>Schedule</SwiftUIText>
                                        <Spacer />
                                        <SwiftUIText color={textColor}>{frequencyDetail || `${FREQUENCY_OPTIONS[frequencyIndex]} Schedule`}</SwiftUIText>
                                    </HStack>
                                </Section>

                                <Section title="Form Parameters & Inspection Data">
                                    {fields.map((f) => (
                                        <VStack key={f.id} spacing={6} modifiers={[padding({ top: 4, bottom: 4 })]}>
                                            <HStack>
                                                <SwiftUIText weight="semibold" color={textColor}>
                                                    {`${f.label}${f.required ? ' *' : ''}`}
                                                </SwiftUIText>
                                                <Spacer />
                                                <SwiftUIText size={12} color={subtextColor}>
                                                    {`${f.type.toUpperCase()}${f.unit ? ` (${f.unit})` : ''}`}
                                                </SwiftUIText>
                                            </HStack>

                                            {f.type === 'checkbox' && (
                                                <Switch
                                                    value={!!previewValues[f.id]}
                                                    onValueChange={(v) => setPreviewValues(prev => ({ ...prev, [f.id]: v }))}
                                                    label={f.label}
                                                />
                                            )}

                                            {f.type === 'condition' && (
                                                <Picker
                                                    label="Rating / Condition"
                                                    selectedIndex={['Normal', 'Needs Attention', 'Critical'].indexOf(previewValues[f.id] || 'Normal')}
                                                    options={['Normal', 'Needs Attention', 'Critical']}
                                                    variant="menu"
                                                    onOptionSelected={({ nativeEvent: { index } }) => {
                                                        const opts = ['Normal', 'Needs Attention', 'Critical'];
                                                        setPreviewValues(prev => ({ ...prev, [f.id]: opts[index] }));
                                                    }}
                                                />
                                            )}

                                            {(f.type === 'unit_value' || f.type === 'number' || f.type === 'text') && (
                                                <TextField
                                                    key={`pv-${f.id}`}
                                                    defaultValue={String(previewValues[f.id] ?? '')}
                                                    onChangeText={(txt) => setPreviewValues(prev => ({ ...prev, [f.id]: txt }))}
                                                    placeholder={f.unit ? `Enter value in ${f.unit}` : `Enter ${f.label}`}
                                                />
                                            )}

                                            {f.type === 'photo' && (
                                                <HStack>
                                                    <SwiftUIText color={reportTypeColor}>📷 Tap to attach photo proof</SwiftUIText>
                                                    <Spacer />
                                                    <SwiftUIText size={12} color={subtextColor}>Optional</SwiftUIText>
                                                </HStack>
                                            )}

                                            {f.type === 'notes' && (
                                                <TextField
                                                    key={`notes-${f.id}`}
                                                    defaultValue={String(previewValues[f.id] ?? '')}
                                                    onChangeText={(txt) => setPreviewValues(prev => ({ ...prev, [f.id]: txt }))}
                                                    placeholder="Add technician inspection notes..."
                                                />
                                            )}
                                        </VStack>
                                    ))}
                                </Section>
                            </>
                        ) : (
                            /* STRUCTURE & CONFIGURATION MODE */
                            <>
                                {/* Section 1: Identity & Schedule */}
                                <Section title="Activity Identity & Schedule">
                                    <TextField
                                        key={`act-name-${activity.id}`}
                                        defaultValue={name}
                                        onChangeText={setName}
                                        placeholder="Activity Name (e.g. Checklist Meter Listrik)"
                                    />
                                    <TextField
                                        key={`act-desc-${activity.id}`}
                                        defaultValue={description}
                                        onChangeText={setDescription}
                                        placeholder="Operational description / instructions"
                                    />
                                    <Picker
                                        label="Frequency"
                                        selectedIndex={frequencyIndex}
                                        options={FREQUENCY_OPTIONS}
                                        variant="menu"
                                        onOptionSelected={({ nativeEvent: { index } }) => setFrequencyIndex(index)}
                                    />
                                    <TextField
                                        key={`act-freq-${activity.id}`}
                                        defaultValue={frequencyDetail}
                                        onChangeText={setFrequencyDetail}
                                        placeholder="Frequency Detail (e.g. Daily at 08:00 WIB)"
                                    />
                                    <TextField
                                        key={`act-ass-${activity.id}`}
                                        defaultValue={defaultAssignee}
                                        onChangeText={setDefaultAssignee}
                                        placeholder="Default Assignee (e.g. Citra Kirana)"
                                    />
                                    <TextField
                                        key={`act-dur-${activity.id}`}
                                        defaultValue={durationMinutes}
                                        onChangeText={setDurationMinutes}
                                        placeholder="Estimated Duration (minutes)"
                                    />
                                </Section>

                                {/* Section 2: Form Fields */}
                                <Section title={`Configured Form Fields (${fields.length})`}>
                                    {fields.map((f, idx) => (
                                        <VStack key={f.id} spacing={4} modifiers={[padding({ top: 4, bottom: 4 })]}>
                                             <HStack alignment="center">
                                                <VStack spacing={2} alignment="leading">
                                                    <SwiftUIText weight="semibold" color={textColor}>
                                                        {`${idx + 1}. ${f.label}${f.required ? ' *' : ''}`}
                                                    </SwiftUIText>
                                                    <SwiftUIText size={12} color={subtextColor}>
                                                        {`Type: ${f.type}${f.unit ? ` • Unit: [${f.unit}]` : ''} ${f.required ? '• Required' : '• Optional'}`}
                                                    </SwiftUIText>
                                                </VStack>
                                                <Spacer />
                                                <Button
                                                    variant="plain"
                                                    onPress={() => handleRemoveField(f.id)}
                                                    modifiers={[foregroundColor('#EF4444')]}
                                                >
                                                    <SwiftUIText size={14} color="#EF4444">Remove</SwiftUIText>
                                                </Button>
                                            </HStack>
                                        </VStack>
                                    ))}

                                    {fields.length === 0 && (
                                        <SwiftUIText color={subtextColor}>
                                            No fields configured. Add parameters below.
                                        </SwiftUIText>
                                    )}
                                </Section>

                                {/* Section 3: Add Custom Field */}
                                <Section title="Add New Field">
                                    <TextField
                                        key="new-field-label"
                                        defaultValue={newFieldLabel}
                                        onChangeText={setNewFieldLabel}
                                        placeholder="Field Label (e.g. Electricity Meter)"
                                    />
                                    <Picker
                                        label="Field Type"
                                        selectedIndex={newFieldTypeIdx}
                                        options={FIELD_TYPES.map(t => t.label)}
                                        variant="menu"
                                        onOptionSelected={({ nativeEvent: { index } }) => {
                                            setNewFieldTypeIdx(index);
                                            if (FIELD_TYPES[index].defaultUnit && !newFieldUnit) {
                                                setNewFieldUnit(FIELD_TYPES[index].defaultUnit || '');
                                            }
                                        }}
                                    />
                                    {FIELD_TYPES[newFieldTypeIdx].id === 'unit_value' && (
                                        <TextField
                                            key="new-field-unit"
                                            defaultValue={newFieldUnit}
                                            onChangeText={setNewFieldUnit}
                                            placeholder="Unit of Measurement (e.g. kWh, m³, V, °C, Bar)"
                                        />
                                    )}
                                    <Switch
                                        value={newFieldRequired}
                                        onValueChange={setNewFieldRequired}
                                        label="Required Field"
                                    />
                                    <Button
                                        variant="plain"
                                        onPress={handleAddField}
                                        modifiers={[foregroundColor('#007AFF')]}
                                    >
                                        <SwiftUIText weight="bold" color="#007AFF">+ Add Field to Template</SwiftUIText>
                                    </Button>
                                </Section>

                                {/* Section 4: 1-Tap Quick Presets */}
                                <Section title="Quick Preset Fields">
                                    <Button
                                        variant="plain"
                                        onPress={() => handleQuickAddPreset('condition', 'Equipment / Area Condition')}
                                        modifiers={[foregroundColor(textColor)]}
                                    >
                                        <SwiftUIText color={textColor}>+ Add Condition Rating (Normal / Warning / Critical)</SwiftUIText>
                                    </Button>
                                    <Button
                                        variant="plain"
                                        onPress={() => handleQuickAddPreset('unit_value', 'Utility Reading', 'kWh')}
                                        modifiers={[foregroundColor(textColor)]}
                                    >
                                        <SwiftUIText color={textColor}>+ Add Utility Meter (kWh / m³)</SwiftUIText>
                                    </Button>
                                    <Button
                                        variant="plain"
                                        onPress={() => handleQuickAddPreset('unit_value', 'Voltage Phase R', 'V')}
                                        modifiers={[foregroundColor(textColor)]}
                                    >
                                        <SwiftUIText color={textColor}>+ Add Voltage Check (Phase R-S-T)</SwiftUIText>
                                    </Button>
                                    <Button
                                        variant="plain"
                                        onPress={() => handleQuickAddPreset('unit_value', 'Tank Temperature', '°C')}
                                        modifiers={[foregroundColor(textColor)]}
                                    >
                                        <SwiftUIText color={textColor}>+ Add Temperature & Pressure</SwiftUIText>
                                    </Button>
                                    <Button
                                        variant="plain"
                                        onPress={() => handleQuickAddPreset('photo', 'Inspection Photo Proof')}
                                        modifiers={[foregroundColor(textColor)]}
                                    >
                                        <SwiftUIText color={textColor}>+ Add Photo Proof Attachment</SwiftUIText>
                                    </Button>
                                    <Button
                                        variant="plain"
                                        onPress={() => handleQuickAddPreset('notes', 'Technician Remarks')}
                                        modifiers={[foregroundColor(textColor)]}
                                    >
                                        <SwiftUIText color={textColor}>+ Add Technician Notes & Findings</SwiftUIText>
                                    </Button>
                                </Section>

                                {onDelete && (
                                    <Section>
                                        <Button
                                            variant="plain"
                                            onPress={() => {
                                                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                                                onDelete(activity.id);
                                                onClose();
                                            }}
                                            modifiers={[foregroundColor('#EF4444')]}
                                        >
                                            <SwiftUIText weight="bold" color="#EF4444">Delete Activity Template</SwiftUIText>
                                        </Button>
                                    </Section>
                                )}
                            </>
                        )}
                    </Form>
                </VStack>
                ) : (
                    <VStack spacing={0} modifiers={[frame({ width: 0, height: 0 })]}>
                        <SwiftUIText color="clear"> </SwiftUIText>
                    </VStack>
                )}
            </BottomSheet>
        </Host>
    );
}
