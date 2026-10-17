import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Switch,
    Pressable,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { GlassView } from '@/components/ui/GlassView';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

export function ActivityFormStructureSheet({
    visible,
    activity,
    reportTypeName,
    reportTypeColor = '#14B8A6',
    onClose,
    onSave,
    onDelete,
}: ActivityFormStructureSheetProps) {
    const insets = useSafeAreaInsets();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#8E8E93';
    const cardBg = isDark ? 'rgba(255, 255, 255, 0.04)' : '#FFFFFF';
    const inputBg = isDark ? 'rgba(255, 255, 255, 0.08)' : '#F2F2F7';
    const borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';

    // Core Activity Metadata
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [frequency, setFrequency] = useState<FrequencyType>('Daily');
    const [frequencyDetail, setFrequencyDetail] = useState('');
    const [defaultAssignee, setDefaultAssignee] = useState('');
    const [durationMinutes, setDurationMinutes] = useState('15');

    // Fields List
    const [fields, setFields] = useState<FormFieldConfig[]>([]);

    // Quick Add
    const [newFieldLabel, setNewFieldLabel] = useState('');
    const [newFieldType, setNewFieldType] = useState<FormFieldConfig['type']>('unit_value');
    const [newFieldUnit, setNewFieldUnit] = useState('');
    const [newFieldRequired, setNewFieldRequired] = useState(true);

    useEffect(() => {
        if (activity && visible) {
            setName(activity.name || '');
            setDescription(activity.description || '');
            setFrequency(activity.frequency || 'Daily');
            setFrequencyDetail(activity.frequencyDetail || '');
            setDefaultAssignee(activity.defaultAssignee || '');
            setDurationMinutes(String(activity.estimatedDurationMinutes || 15));
            setFields(activity.fields ? JSON.parse(JSON.stringify(activity.fields)) : []);
            setNewFieldLabel('');
            setNewFieldUnit('');
        }
    }, [activity, visible]);

    if (!visible || !activity) return null;

    const handleAddField = () => {
        if (!newFieldLabel.trim()) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        const newField: FormFieldConfig = {
            id: `f_${Date.now()}`,
            label: newFieldLabel.trim(),
            type: newFieldType,
            required: newFieldRequired,
            unit: newFieldType === 'unit_value' ? (newFieldUnit.trim() || 'Unit') : undefined,
            defaultValue: newFieldType === 'checkbox' ? true : newFieldType === 'condition' ? 'Normal' : undefined,
            options: newFieldType === 'condition' ? ['Normal', 'Needs Attention', 'Critical'] : undefined,
        };

        setFields(prev => [...prev, newField]);
        setNewFieldLabel('');
        setNewFieldUnit('');
    };

    const handleRemoveField = (fieldId: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setFields(prev => prev.filter(f => f.id !== fieldId));
    };

    const handleSave = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const updated: ActivityTemplate = {
            ...activity,
            name: name.trim() || activity.name,
            description: description.trim(),
            frequency,
            frequencyDetail: frequencyDetail.trim(),
            defaultAssignee: defaultAssignee.trim(),
            estimatedDurationMinutes: parseInt(durationMinutes, 10) || 15,
            fields: fields.length > 0 ? fields : activity.fields,
        };
        onSave(updated);
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <Pressable style={styles.backdrop} onPress={onClose} />
                <View style={styles.sheetWrapper}>
                    <GlassView
                        intensity={isDark ? 30 : 60}
                        style={[
                            styles.sheetContainer,
                            {
                                backgroundColor: isDark ? 'rgba(28,28,30,0.95)' : 'rgba(242,242,247,0.98)',
                                borderColor,
                                paddingBottom: Math.max(insets.bottom, 20),
                            },
                        ]}
                    >
                        {/* Header */}
                        <View style={styles.handleContainer}>
                            <View style={[styles.grabber, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }]} />
                        </View>
                        <View style={styles.header}>
                            <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <View style={{ alignItems: 'center' }}>
                                <Text style={[styles.headerTitle, { color: textColor }]}>Form Structure</Text>
                                {reportTypeName && <Text style={[styles.headerSub, { color: reportTypeColor }]}>{reportTypeName}</Text>}
                            </View>
                            <TouchableOpacity onPress={handleSave} style={styles.headerBtn}>
                                <Text style={styles.saveText}>Save</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                            {/* Identity Section */}
                            <View style={styles.block}>
                                <Text style={[styles.sectionLabel, { color: subtextColor }]}>Activity Identity & Schedule</Text>
                                <GlassView intensity={isDark ? 10 : 25} style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                                    <View style={styles.inputGroup}>
                                        <Text style={[styles.fieldLabel, { color: subtextColor }]}>Activity Name</Text>
                                        <TextInput
                                            value={name}
                                            onChangeText={setName}
                                            style={[styles.textInput, { backgroundColor: inputBg, color: textColor }]}
                                            placeholder="Activity Name"
                                            placeholderTextColor={subtextColor}
                                        />
                                    </View>
                                    <View style={styles.inputGroup}>
                                        <Text style={[styles.fieldLabel, { color: subtextColor }]}>Description</Text>
                                        <TextInput
                                            value={description}
                                            onChangeText={setDescription}
                                            style={[styles.textInput, { backgroundColor: inputBg, color: textColor }]}
                                            placeholder="Operational description"
                                            placeholderTextColor={subtextColor}
                                        />
                                    </View>
                                    <View style={styles.inputGroup}>
                                        <Text style={[styles.fieldLabel, { color: subtextColor }]}>Schedule Details</Text>
                                        <TextInput
                                            value={frequencyDetail}
                                            onChangeText={setFrequencyDetail}
                                            style={[styles.textInput, { backgroundColor: inputBg, color: textColor }]}
                                            placeholder="e.g. Every day at 08:00 WIB"
                                            placeholderTextColor={subtextColor}
                                        />
                                    </View>
                                    <View style={styles.inputGroup}>
                                        <Text style={[styles.fieldLabel, { color: subtextColor }]}>Default Assignee</Text>
                                        <TextInput
                                            value={defaultAssignee}
                                            onChangeText={setDefaultAssignee}
                                            style={[styles.textInput, { backgroundColor: inputBg, color: textColor }]}
                                            placeholder="e.g. Citra Kirana (Building Tech)"
                                            placeholderTextColor={subtextColor}
                                        />
                                    </View>
                                </GlassView>
                            </View>

                            {/* Form Fields List */}
                            <View style={styles.block}>
                                <Text style={[styles.sectionLabel, { color: subtextColor }]}>Configured Form Parameters ({fields.length})</Text>
                                <GlassView intensity={isDark ? 10 : 25} style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                                    {fields.map((f, idx) => (
                                        <View key={f.id} style={styles.fieldRow}>
                                            <View style={{ flex: 1, gap: 2 }}>
                                                <Text style={[styles.itemTitle, { color: textColor }]}>
                                                    {idx + 1}. {f.label} {f.required && <Text style={{ color: '#EF4444' }}>*</Text>}
                                                </Text>
                                                <Text style={[styles.itemSubtitle, { color: subtextColor }]}>
                                                    Type: {f.type} {f.unit ? `[${f.unit}]` : ''} {f.required ? '• Required' : '• Optional'}
                                                </Text>
                                            </View>
                                            <TouchableOpacity onPress={() => handleRemoveField(f.id)} style={styles.removeBtn}>
                                                <PlatformIcon name="trash" size={16} tintColor="#EF4444" />
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                    {fields.length === 0 && (
                                        <View style={{ padding: 16, alignItems: 'center' }}>
                                            <Text style={{ color: subtextColor }}>No fields configured yet</Text>
                                        </View>
                                    )}
                                </GlassView>
                            </View>

                            {/* Add Field Section */}
                            <View style={styles.block}>
                                <Text style={[styles.sectionLabel, { color: subtextColor }]}>Add Field to Form</Text>
                                <GlassView intensity={isDark ? 10 : 25} style={[styles.card, { backgroundColor: cardBg, borderColor, padding: 14, gap: 10 }]}>
                                    <TextInput
                                        value={newFieldLabel}
                                        onChangeText={setNewFieldLabel}
                                        style={[styles.textInput, { backgroundColor: inputBg, color: textColor }]}
                                        placeholder="Field label (e.g. Voltage Phase R)"
                                        placeholderTextColor={subtextColor}
                                    />
                                    <View style={styles.typeRow}>
                                        {(['unit_value', 'checkbox', 'condition', 'photo', 'notes'] as const).map(t => (
                                            <TouchableOpacity
                                                key={t}
                                                onPress={() => setNewFieldType(t)}
                                                style={[
                                                    styles.typePill,
                                                    { backgroundColor: newFieldType === t ? reportTypeColor : inputBg }
                                                ]}
                                            >
                                                <Text style={[styles.typePillText, { color: newFieldType === t ? '#FFFFFF' : textColor }]}>{t}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                    {newFieldType === 'unit_value' && (
                                        <TextInput
                                            value={newFieldUnit}
                                            onChangeText={setNewFieldUnit}
                                            style={[styles.textInput, { backgroundColor: inputBg, color: textColor }]}
                                            placeholder="Unit (e.g. kWh, m³, V, °C, Bar)"
                                            placeholderTextColor={subtextColor}
                                        />
                                    )}
                                    <TouchableOpacity onPress={handleAddField} style={[styles.addBtn, { backgroundColor: reportTypeColor }]}>
                                        <Text style={styles.addBtnText}>+ Add Field</Text>
                                    </TouchableOpacity>
                                </GlassView>
                            </View>
                        </ScrollView>
                    </GlassView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.45)' },
    sheetWrapper: { maxHeight: '90%', height: '90%' },
    sheetContainer: { flex: 1, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, overflow: 'hidden' },
    handleContainer: { alignItems: 'center', paddingVertical: 10 },
    grabber: { width: 36, height: 5, borderRadius: 2.5 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
    headerBtn: { paddingVertical: 4, paddingHorizontal: 6 },
    cancelText: { fontSize: 16, color: '#8E8E93' },
    saveText: { fontSize: 16, fontWeight: '600', color: '#007AFF' },
    headerTitle: { fontSize: 17, fontWeight: '600' },
    headerSub: { fontSize: 11, fontWeight: '500' },
    scrollArea: { flex: 1 },
    scrollContent: { padding: 16, gap: 18 },
    block: { gap: 8 },
    sectionLabel: { fontSize: 13, fontWeight: '600', paddingHorizontal: 4 },
    card: { borderRadius: 20, overflow: 'hidden', borderWidth: 1 },
    inputGroup: { paddingHorizontal: 14, paddingVertical: 8, gap: 4 },
    fieldLabel: { fontSize: 12, fontWeight: '500' },
    textInput: { height: 40, borderRadius: 10, paddingHorizontal: 12, fontSize: 15 },
    fieldRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.06)' },
    itemTitle: { fontSize: 15, fontWeight: '500' },
    itemSubtitle: { fontSize: 12, marginTop: 2 },
    removeBtn: { padding: 8 },
    typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    typePill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
    typePillText: { fontSize: 12, fontWeight: '500' },
    addBtn: { height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
    addBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
});
