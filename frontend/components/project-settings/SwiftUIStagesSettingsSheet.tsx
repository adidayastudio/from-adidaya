import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    TextInput, 
    Modal, 
    ScrollView, 
    Alert,
    Platform,
    Switch
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';

export interface SwiftUIStagesSettingsSheetProps {
    isOpened: boolean;
    onClose: () => void;
    mode: 'stage' | 'task_group' | 'task';
    editItem: any | null;
    stageId?: string | null;
    parentId?: string | null;
    disciplines?: Array<{ code: string; nameEn: string }>;
    onSave: (payload: {
        displayCode?: string;
        stageCode?: string;
        stageName?: string;
        stageNameId?: string;
        category?: string;
        weightDefault?: number;
        position?: number;
        taskName?: string;
        disciplineCode?: string;
        sequenceOrder?: number;
        isMandatory?: boolean;
        priority?: string;
        parentId?: string | null;
        stageId?: string | null;
    }) => Promise<boolean> | void;
    onDelete: (id: string, name: string) => void;
}

const STAGE_CATEGORIES = ['General', 'Design', 'Tender', 'Construction', 'Handover'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

export const SwiftUIStagesSettingsSheet: React.FC<SwiftUIStagesSettingsSheetProps> = ({
    isOpened,
    onClose,
    mode,
    editItem,
    stageId = null,
    parentId = null,
    disciplines = [],
    onSave,
    onDelete,
}) => {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';

    const cardBgColor = isDark ? '#1C1C1E' : '#FFFFFF';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6e6e73';
    const modalOverlayColor = 'rgba(0,0,0,0.5)';
    const textInputBg = isDark ? '#2C2C2E' : '#F2F2F7';

    // State Fields for Stages
    const [displayCode, setDisplayCode] = useState('');
    const [stageCode, setStageCode] = useState('');
    const [stageName, setStageName] = useState('');
    const [stageNameId, setStageNameId] = useState('');
    const [category, setCategory] = useState('Design');
    const [weightDefault, setWeightDefault] = useState('0');
    const [position, setPosition] = useState('1');

    // State Fields for Task Group & Tasks
    const [taskName, setTaskName] = useState('');
    const [disciplineCode, setDisciplineCode] = useState('ALL');
    const [sequenceOrder, setSequenceOrder] = useState('1');
    const [isMandatory, setIsMandatory] = useState(false);
    const [priority, setPriority] = useState('medium');

    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpened) {
            setIsSaving(false);
            if (editItem) {
                if (mode === 'stage') {
                    setDisplayCode(editItem.displayCode || editItem.display_code || '');
                    setStageCode(editItem.stageCode || editItem.stage_code || '');
                    setStageName(editItem.stageName || editItem.stage_name || '');
                    setStageNameId(editItem.stageNameId || editItem.stage_name_id || '');
                    setCategory(editItem.category || 'Design');
                    setWeightDefault(String(editItem.weightDefault ?? editItem.weight_default ?? 0));
                    setPosition(String(editItem.position ?? 1));
                } else if (mode === 'task_group') {
                    setTaskName(editItem.taskName || editItem.task_name || '');
                    setWeightDefault(String(editItem.weightDefault ?? editItem.weight_default ?? 0));
                    setSequenceOrder(String(editItem.sequenceOrder ?? editItem.sequence_order ?? 0));
                } else if (mode === 'task') {
                    setTaskName(editItem.taskName || editItem.task_name || '');
                    setWeightDefault(String(editItem.weightDefault ?? editItem.weight_default ?? 0));
                    setDisciplineCode(editItem.disciplineCode || editItem.discipline_code || 'ALL');
                    setSequenceOrder(String(editItem.sequenceOrder ?? editItem.sequence_order ?? 0));
                    setIsMandatory(!!(editItem.isMandatory ?? editItem.is_mandatory));
                    // Check description parsed meta for priority, or mock task priority
                    setPriority(editItem.priority || 'medium');
                }
            } else {
                // Default states for ADD
                setDisplayCode('');
                setStageCode('');
                setStageName('');
                setStageNameId('');
                setCategory('Design');
                setWeightDefault('0');
                setPosition('1');

                setTaskName('');
                setDisciplineCode('ALL');
                setSequenceOrder('1');
                setIsMandatory(false);
                setPriority('medium');
            }
        }
    }, [isOpened, editItem, mode]);

    const handleFormSubmit = async () => {
        setIsSaving(true);
        try {
            if (mode === 'stage') {
                const cleanDisplayCode = displayCode.trim();
                const cleanStageCode = stageCode.trim().toUpperCase();
                const cleanStageName = stageName.trim();
                const cleanStageNameId = stageNameId.trim();

                if (!cleanDisplayCode || !cleanStageCode || !cleanStageName) {
                    Alert.alert('Validation Error', 'Display Code, Stage Code, and Name (EN) are required.');
                    setIsSaving(false);
                    return;
                }

                const payload = {
                    displayCode: cleanDisplayCode,
                    stageCode: cleanStageCode,
                    stageName: cleanStageName,
                    stageNameId: cleanStageNameId || cleanStageName,
                    category,
                    weightDefault: parseFloat(weightDefault) || 0,
                    position: parseInt(position, 10) || 1,
                };

                const success = await onSave(payload);
                if (success) onClose();
            } else if (mode === 'task_group') {
                const cleanTaskName = taskName.trim();
                if (!cleanTaskName) {
                    Alert.alert('Validation Error', 'Group Name is required.');
                    setIsSaving(false);
                    return;
                }

                const payload = {
                    taskName: cleanTaskName,
                    weightDefault: parseFloat(weightDefault) || 0,
                    sequenceOrder: parseInt(sequenceOrder, 10) || 0,
                    parentId: null,
                    stageId: editItem ? editItem.stageId : stageId,
                };

                const success = await onSave(payload);
                if (success) onClose();
            } else if (mode === 'task') {
                const cleanTaskName = taskName.trim();
                if (!cleanTaskName) {
                    Alert.alert('Validation Error', 'Task Name is required.');
                    setIsSaving(false);
                    return;
                }

                const payload = {
                    taskName: cleanTaskName,
                    weightDefault: parseFloat(weightDefault) || 0,
                    disciplineCode,
                    sequenceOrder: parseInt(sequenceOrder, 10) || 0,
                    isMandatory,
                    priority,
                    parentId: editItem ? editItem.parentId : parentId,
                    stageId: editItem ? editItem.stageId : stageId,
                };

                const success = await onSave(payload);
                if (success) onClose();
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to save stage/task template settings.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeletePress = () => {
        if (!editItem) return;
        onClose();
        
        const itemId = editItem.id;
        const itemName = mode === 'stage' 
            ? (editItem.stageName || editItem.stage_name) 
            : (editItem.taskName || editItem.task_name);

        setTimeout(() => {
            onDelete(itemId, itemName);
        }, 400);
    };

    const titleLabel = editItem ? 'Edit' : 'Add';
    const typeLabel = mode === 'stage' 
        ? 'Stage' 
        : mode === 'task_group' 
            ? 'Task Group' 
            : 'Task Template';

    return (
        <Modal
            visible={isOpened}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={[styles.modalOverlay, { backgroundColor: modalOverlayColor }]}>
                <View style={[styles.modalContent, { backgroundColor: cardBgColor }]}>
                    <View style={styles.modalHeaderRow}>
                        <Text style={[styles.modalTitle, { color: textColor }]}>
                            {titleLabel} {typeLabel}
                        </Text>
                        <TouchableOpacity onPress={onClose} disabled={isSaving}>
                            <Ionicons name="close" size={24} color={textColor} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalScrollBody} showsVerticalScrollIndicator={false}>
                        {mode === 'stage' && (
                            <>
                                {/* Stage specific fields */}
                                <Text style={[styles.inputLabel, { color: textColor }]}>Display Code (e.g. 01-KO)</Text>
                                <TextInput
                                    style={[styles.textInput, { backgroundColor: textInputBg, color: textColor }]}
                                    value={displayCode}
                                    onChangeText={setDisplayCode}
                                    placeholder="e.g. 01-KO"
                                    placeholderTextColor={subtextColor}
                                    editable={!isSaving}
                                />

                                <Text style={[styles.inputLabel, { color: textColor }]}>Stage Code (e.g. KO)</Text>
                                <TextInput
                                    style={[styles.textInput, { backgroundColor: textInputBg, color: textColor }]}
                                    value={stageCode}
                                    onChangeText={setStageCode}
                                    placeholder="e.g. KO"
                                    placeholderTextColor={subtextColor}
                                    autoCapitalize="characters"
                                    editable={!isSaving}
                                />

                                <Text style={[styles.inputLabel, { color: textColor }]}>Name (English)</Text>
                                <TextInput
                                    style={[styles.textInput, { backgroundColor: textInputBg, color: textColor }]}
                                    value={stageName}
                                    onChangeText={setStageName}
                                    placeholder="e.g. Kickoff"
                                    placeholderTextColor={subtextColor}
                                    editable={!isSaving}
                                />

                                <Text style={[styles.inputLabel, { color: textColor }]}>Name (Indonesia)</Text>
                                <TextInput
                                    style={[styles.textInput, { backgroundColor: textInputBg, color: textColor }]}
                                    value={stageNameId}
                                    onChangeText={setStageNameId}
                                    placeholder="e.g. Kickoff"
                                    placeholderTextColor={subtextColor}
                                    editable={!isSaving}
                                />

                                <Text style={[styles.inputLabel, { color: textColor }]}>Category</Text>
                                <View style={styles.pickerSelectorContainer}>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                                        {STAGE_CATEGORIES.map(cat => {
                                            const isSel = category === cat;
                                            return (
                                                <TouchableOpacity
                                                    key={cat}
                                                    onPress={() => setCategory(cat)}
                                                    disabled={isSaving}
                                                    style={[
                                                        styles.pickerOptionPill,
                                                        {
                                                            backgroundColor: isSel
                                                                ? '#FF3B30'
                                                                : (isDark ? '#2C2C2E' : '#F2F2F7'),
                                                        }
                                                    ]}
                                                >
                                                    <Text style={[styles.pickerOptionText, { color: isSel ? '#FFFFFF' : textColor }]}>
                                                        {cat}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </ScrollView>
                                </View>

                                <Text style={[styles.inputLabel, { color: textColor }]}>Default Weight (%)</Text>
                                <TextInput
                                    style={[styles.textInput, { backgroundColor: textInputBg, color: textColor }]}
                                    value={weightDefault}
                                    onChangeText={setWeightDefault}
                                    keyboardType="numeric"
                                    placeholder="e.g. 5.0"
                                    placeholderTextColor={subtextColor}
                                    editable={!isSaving}
                                />

                                <Text style={[styles.inputLabel, { color: textColor }]}>Sequence Order Position</Text>
                                <TextInput
                                    style={[styles.textInput, { backgroundColor: textInputBg, color: textColor }]}
                                    value={position}
                                    onChangeText={setPosition}
                                    keyboardType="number-pad"
                                    placeholder="e.g. 1"
                                    placeholderTextColor={subtextColor}
                                    editable={!isSaving}
                                />
                            </>
                        )}

                        {mode === 'task_group' && (
                            <>
                                {/* Task Group specific fields */}
                                <Text style={[styles.inputLabel, { color: textColor }]}>Group Name</Text>
                                <TextInput
                                    style={[styles.textInput, { backgroundColor: textInputBg, color: textColor }]}
                                    value={taskName}
                                    onChangeText={setTaskName}
                                    placeholder="e.g. General Information"
                                    placeholderTextColor={subtextColor}
                                    editable={!isSaving}
                                />

                                <Text style={[styles.inputLabel, { color: textColor }]}>Total Group Weight (%)</Text>
                                <TextInput
                                    style={[styles.textInput, { backgroundColor: textInputBg, color: textColor }]}
                                    value={weightDefault}
                                    onChangeText={setWeightDefault}
                                    keyboardType="numeric"
                                    placeholder="e.g. 30.0"
                                    placeholderTextColor={subtextColor}
                                    editable={!isSaving}
                                />

                                <Text style={[styles.inputLabel, { color: textColor }]}>Sequence Order</Text>
                                <TextInput
                                    style={[styles.textInput, { backgroundColor: textInputBg, color: textColor }]}
                                    value={sequenceOrder}
                                    onChangeText={setSequenceOrder}
                                    keyboardType="number-pad"
                                    placeholder="e.g. 1"
                                    placeholderTextColor={subtextColor}
                                    editable={!isSaving}
                                />
                            </>
                        )}

                        {mode === 'task' && (
                            <>
                                {/* Individual Task specific fields */}
                                <Text style={[styles.inputLabel, { color: textColor }]}>Task Deliverable Name</Text>
                                <TextInput
                                    style={[styles.textInput, { backgroundColor: textInputBg, color: textColor }]}
                                    value={taskName}
                                    onChangeText={setTaskName}
                                    placeholder="e.g. Cover Page Design"
                                    placeholderTextColor={subtextColor}
                                    editable={!isSaving}
                                />

                                <Text style={[styles.inputLabel, { color: textColor }]}>Task Weight (%)</Text>
                                <TextInput
                                    style={[styles.textInput, { backgroundColor: textInputBg, color: textColor }]}
                                    value={weightDefault}
                                    onChangeText={setWeightDefault}
                                    keyboardType="numeric"
                                    placeholder="e.g. 3.0"
                                    placeholderTextColor={subtextColor}
                                    editable={!isSaving}
                                />

                                <Text style={[styles.inputLabel, { color: textColor }]}>Discipline Association</Text>
                                <View style={styles.pickerSelectorContainer}>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                                        {[{ code: 'ALL', nameEn: 'All Disciplines' }, ...disciplines].map(disc => {
                                            const isSel = disciplineCode === disc.code;
                                            return (
                                                <TouchableOpacity
                                                    key={disc.code}
                                                    onPress={() => setDisciplineCode(disc.code)}
                                                    disabled={isSaving}
                                                    style={[
                                                        styles.pickerOptionPill,
                                                        {
                                                            backgroundColor: isSel
                                                                ? '#FF3B30'
                                                                : (isDark ? '#2C2C2E' : '#F2F2F7'),
                                                        }
                                                    ]}
                                                >
                                                    <Text style={[styles.pickerOptionText, { color: isSel ? '#FFFFFF' : textColor }]}>
                                                        {disc.code} ({disc.nameEn.split(' ')[0]})
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </ScrollView>
                                </View>

                                <Text style={[styles.inputLabel, { color: textColor }]}>Task Priority</Text>
                                <View style={styles.pickerSelectorContainer}>
                                    {PRIORITIES.map(prio => {
                                        const isSel = priority === prio;
                                        return (
                                            <TouchableOpacity
                                                key={prio}
                                                onPress={() => setPriority(prio)}
                                                disabled={isSaving}
                                                style={[
                                                    styles.pickerOptionPill,
                                                    {
                                                        backgroundColor: isSel
                                                            ? '#FF3B30'
                                                            : (isDark ? '#2C2C2E' : '#F2F2F7'),
                                                    }
                                                ]}
                                            >
                                                <Text style={[styles.pickerOptionText, { color: isSel ? '#FFFFFF' : textColor }]}>
                                                    {prio.toUpperCase()}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>

                                <View style={styles.switchRow}>
                                    <Text style={[styles.switchLabel, { color: textColor }]}>Mandatory Checklist Item</Text>
                                    <Switch
                                        value={isMandatory}
                                        onValueChange={setIsMandatory}
                                        trackColor={{ false: '#767680', true: '#FF3B30' }}
                                        thumbColor={Platform.OS === 'ios' ? undefined : '#FFFFFF'}
                                        disabled={isSaving}
                                    />
                                </View>

                                <Text style={[styles.inputLabel, { color: textColor }]}>Sequence Order</Text>
                                <TextInput
                                    style={[styles.textInput, { backgroundColor: textInputBg, color: textColor }]}
                                    value={sequenceOrder}
                                    onChangeText={setSequenceOrder}
                                    keyboardType="number-pad"
                                    placeholder="e.g. 1"
                                    placeholderTextColor={subtextColor}
                                    editable={!isSaving}
                                />
                            </>
                        )}
                    </ScrollView>

                    {/* Destructive Delete Button */}
                    {editItem && (
                        <TouchableOpacity
                            style={[styles.deleteButton, { borderColor: '#FF3B30' }]}
                            onPress={handleDeletePress}
                            disabled={isSaving}
                        >
                            <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                            <Text style={styles.deleteButtonText}>Delete {typeLabel}</Text>
                        </TouchableOpacity>
                    )}

                    <View style={styles.modalActionsRow}>
                        <TouchableOpacity
                            style={[styles.modalButton, styles.cancelButton, { borderColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}
                            onPress={onClose}
                            disabled={isSaving}
                        >
                            <Text style={[styles.modalButtonText, { color: textColor }]}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.modalButton, styles.submitButton]}
                            onPress={handleFormSubmit}
                            disabled={isSaving}
                        >
                            <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>
                                {isSaving ? 'Saving...' : (editItem ? 'Save' : 'Add')}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: Platform.OS === 'ios' ? 44 : 24,
        maxHeight: '90%',
    },
    modalHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
    },
    modalScrollBody: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        marginTop: 12,
    },
    textInput: {
        height: 48,
        borderRadius: 12,
        paddingHorizontal: 16,
        fontSize: 16,
        marginBottom: 4,
    },
    pickerSelectorContainer: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 4,
        marginBottom: 8,
    },
    pickerOptionPill: {
        flex: 1,
        height: 40,
        paddingHorizontal: 16,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pickerOptionText: {
        fontSize: 13,
        fontWeight: '600',
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        marginTop: 8,
    },
    switchLabel: {
        fontSize: 14,
        fontWeight: '600',
    },
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 48,
        borderWidth: 1.5,
        borderRadius: 12,
        marginTop: 8,
        marginBottom: 16,
    },
    deleteButtonText: {
        color: '#FF3B30',
        fontWeight: '600',
        marginLeft: 8,
        fontSize: 15,
    },
    modalActionsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    modalButton: {
        flex: 1,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelButton: {
        borderWidth: 1,
    },
    submitButton: {
        backgroundColor: '#FF3B30',
    },
    modalButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
});
