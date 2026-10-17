import React, { useState, useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import { 
    Host,
    BottomSheet, 
    HStack, 
    VStack, 
    Spacer, 
    Text as SwiftUIText,
    Image,
    Button,
    Form,
    Section,
    TextField,
    Picker,
    Switch
} from '@expo/ui/swift-ui';
import { padding, background, ignoreSafeArea, tint, frame, cornerRadius, buttonStyle, disabled } from '@expo/ui/swift-ui/modifiers';
import * as Haptics from 'expo-haptics';
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
    const sheetBg = 'clear';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#C7C7CC' : 'gray';

    // State Fields for Stages
    const [displayCode, setDisplayCode] = useState('');
    const [stageCode, setStageCode] = useState('');
    const [stageName, setStageName] = useState('');
    const [stageNameId, setStageNameId] = useState('');
    const [categoryIndex, setCategoryIndex] = useState(1); // Default Design (idx 1)
    const [weightDefault, setWeightDefault] = useState('0');
    const [position, setPosition] = useState('1');

    // State Fields for Task Group & Tasks
    const [taskName, setTaskName] = useState('');
    const [disciplineIndex, setDisciplineIndex] = useState(0); // Default ALL (idx 0)
    const [sequenceOrder, setSequenceOrder] = useState('1');
    const [isMandatory, setIsMandatory] = useState(false);
    const [priorityIndex, setPriorityIndex] = useState(1); // Default medium (idx 1)

    const [isSaving, setIsSaving] = useState(false);

    // List of disciplines codes for SwiftUI Picker
    const disciplineOptions = ['ALL', ...disciplines.map(d => d.code)];

    useEffect(() => {
        if (isOpened) {
            setIsSaving(false);
            if (editItem) {
                if (mode === 'stage') {
                    setDisplayCode(editItem.displayCode || editItem.display_code || '');
                    setStageCode(editItem.stageCode || editItem.stage_code || '');
                    setStageName(editItem.stageName || editItem.stage_name || '');
                    setStageNameId(editItem.stageNameId || editItem.stage_name_id || '');
                    
                    const catIdx = STAGE_CATEGORIES.indexOf(editItem.category || 'Design');
                    setCategoryIndex(catIdx !== -1 ? catIdx : 1);
                    
                    setWeightDefault(String(editItem.weightDefault ?? editItem.weight_default ?? 0));
                    setPosition(String(editItem.position ?? 1));
                } else if (mode === 'task_group') {
                    setTaskName(editItem.taskName || editItem.task_name || '');
                    setWeightDefault(String(editItem.weightDefault ?? editItem.weight_default ?? 0));
                    setSequenceOrder(String(editItem.sequenceOrder ?? editItem.sequence_order ?? 0));
                } else if (mode === 'task') {
                    setTaskName(editItem.taskName || editItem.task_name || '');
                    setWeightDefault(String(editItem.weightDefault ?? editItem.weight_default ?? 0));
                    
                    const discCode = editItem.disciplineCode || editItem.discipline_code || 'ALL';
                    const discIdx = disciplineOptions.indexOf(discCode);
                    setDisciplineIndex(discIdx !== -1 ? discIdx : 0);
                    
                    setSequenceOrder(String(editItem.sequenceOrder ?? editItem.sequence_order ?? 0));
                    setIsMandatory(!!(editItem.isMandatory ?? editItem.is_mandatory));
                    
                    const prioIdx = PRIORITIES.indexOf(editItem.priority || 'medium');
                    setPriorityIndex(prioIdx !== -1 ? prioIdx : 1);
                }
            } else {
                setDisplayCode('');
                setStageCode('');
                setStageName('');
                setStageNameId('');
                setCategoryIndex(1); // Design
                setWeightDefault('0');
                setPosition('1');

                setTaskName('');
                setDisciplineIndex(0); // ALL
                setSequenceOrder('1');
                setIsMandatory(false);
                setPriorityIndex(1); // medium
            }
        }
    }, [isOpened, editItem, mode]);

    const handleSave = async () => {
        setIsSaving(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

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
                    category: STAGE_CATEGORIES[categoryIndex],
                    weightDefault: parseFloat(weightDefault) || 0,
                    position: parseInt(position, 10) || 1,
                };

                const success = await onSave(payload);
                if (success) {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    onClose();
                }
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
                if (success) {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    onClose();
                }
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
                    disciplineCode: disciplineOptions[disciplineIndex],
                    sequenceOrder: parseInt(sequenceOrder, 10) || 0,
                    isMandatory,
                    priority: PRIORITIES[priorityIndex],
                    parentId: editItem ? editItem.parentId : parentId,
                    stageId: editItem ? editItem.stageId : stageId,
                };

                const success = await onSave(payload);
                if (success) {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    onClose();
                }
            }
        } catch (e: any) {
            console.error('Error saving stages/tasks item in SwiftUI:', e);
            Alert.alert('Error', 'Failed to save stages/tasks settings.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeletePress = () => {
        if (!editItem) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        onClose();
        
        const itemId = editItem.id;
        const itemName = mode === 'stage' 
            ? (editItem.stageName || editItem.stage_name) 
            : (editItem.taskName || editItem.task_name);
                
        setTimeout(() => {
            onDelete(itemId, itemName);
        }, 500);
    };

    const titleLabel = editItem ? 'Edit' : 'Add';
    const typeLabel = mode === 'stage' 
        ? 'Stage' 
        : mode === 'task_group' 
            ? 'Task Group' 
            : 'Task Template';

    return (
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet
                isOpened={isOpened}
                presentationDetents={[0.85]}
                onIsOpenedChange={(opened) => {
                    if (!opened) onClose();
                }}
            >
                <VStack spacing={0} modifiers={[
                    ignoreSafeArea({ edges: 'bottom' }),
                    background(sheetBg)
                ]}>
                    {/* Header */}
                    <HStack alignment="center" modifiers={[padding({ top: 20, leading: 20, trailing: 20, bottom: 10 })]}>
                        <SwiftUIText size={22} weight="bold" color={textColor}>
                            {`${titleLabel} ${typeLabel}`}
                        </SwiftUIText>
                        <Spacer />
                        <Button
                            systemImage="xmark"
                            role="cancel"
                            color="gray"
                            onPress={onClose}
                        />
                    </HStack>

                    {/* Scrollable Form Content */}
                    <Form modifiers={[background(sheetBg), frame({ maxHeight: 520 }), tint('#8E8E93')]}>
                        {mode === 'stage' && (
                            <>
                                <Section title="Stage Identifiers">
                                    <TextField
                                        placeholder="Display Code (e.g. 01-KO)"
                                        defaultValue={displayCode}
                                        onChangeText={setDisplayCode}
                                        modifiers={[tint('#FF3B30')]}
                                    />
                                    <TextField
                                        placeholder="Stage Code (e.g. KO)"
                                        defaultValue={stageCode}
                                        onChangeText={setStageCode}
                                        modifiers={[tint('#FF3B30')]}
                                    />
                                </Section>

                                <Section title="Stage Names">
                                    <TextField
                                        placeholder="English Name (e.g. Kickoff)"
                                        defaultValue={stageName}
                                        onChangeText={setStageName}
                                        modifiers={[tint('#FF3B30')]}
                                    />
                                    <TextField
                                        placeholder="Indonesian Name (e.g. Kickoff)"
                                        defaultValue={stageNameId}
                                        onChangeText={setStageNameId}
                                        modifiers={[tint('#FF3B30')]}
                                    />
                                </Section>

                                <Section title="Category">
                                    <VStack alignment="leading" spacing={6} modifiers={[padding({ vertical: 6 })]}>
                                        <Picker
                                            options={STAGE_CATEGORIES}
                                            selectedIndex={categoryIndex}
                                            onOptionSelected={(e) => setCategoryIndex(e.nativeEvent.index)}
                                            variant="menu"
                                            modifiers={[tint('#8E8E93')]}
                                        />
                                    </VStack>
                                </Section>

                                <Section title="Workflow Configuration">
                                    <TextField
                                        placeholder="Default Weight (%)"
                                        defaultValue={weightDefault}
                                        onChangeText={setWeightDefault}
                                        modifiers={[tint('#FF3B30')]}
                                    />
                                    <TextField
                                        placeholder="Sequence Order Position"
                                        defaultValue={position}
                                        onChangeText={setPosition}
                                        modifiers={[tint('#FF3B30')]}
                                    />
                                </Section>
                            </>
                        )}

                        {mode === 'task_group' && (
                            <>
                                <Section title="Task Group Info">
                                    <TextField
                                        placeholder="Group Name (e.g. General Information)"
                                        defaultValue={taskName}
                                        onChangeText={setTaskName}
                                        modifiers={[tint('#FF3B30')]}
                                    />
                                    <TextField
                                        placeholder="Total Weight (%)"
                                        defaultValue={weightDefault}
                                        onChangeText={setWeightDefault}
                                        modifiers={[tint('#FF3B30')]}
                                    />
                                    <TextField
                                        placeholder="Sequence Order"
                                        defaultValue={sequenceOrder}
                                        onChangeText={setSequenceOrder}
                                        modifiers={[tint('#FF3B30')]}
                                    />
                                </Section>
                            </>
                        )}

                        {mode === 'task' && (
                            <>
                                <Section title="Task Deliverable Details">
                                    <TextField
                                        placeholder="Deliverable Name (e.g. Cover Page)"
                                        defaultValue={taskName}
                                        onChangeText={setTaskName}
                                        modifiers={[tint('#FF3B30')]}
                                    />
                                    <TextField
                                        placeholder="Task Weight (%)"
                                        defaultValue={weightDefault}
                                        onChangeText={setWeightDefault}
                                        modifiers={[tint('#FF3B30')]}
                                    />
                                </Section>

                                <Section title="Discipline Association">
                                    <Picker
                                        options={disciplineOptions}
                                        selectedIndex={disciplineIndex}
                                        onOptionSelected={(e) => setDisciplineIndex(e.nativeEvent.index)}
                                        variant="menu"
                                        modifiers={[tint('#8E8E93')]}
                                    />
                                </Section>

                                <Section title="Settings">
                                    <VStack alignment="leading" spacing={4} modifiers={[padding({ vertical: 6 })]}>
                                        <SwiftUIText size={13} color={subtextColor}>Task Priority</SwiftUIText>
                                        <Picker
                                            options={PRIORITIES.map(p => p.toUpperCase())}
                                            selectedIndex={priorityIndex}
                                            onOptionSelected={(e) => setPriorityIndex(e.nativeEvent.index)}
                                            variant="segmented"
                                            modifiers={[tint('#FF3B30')]}
                                        />
                                    </VStack>

                                    <Switch
                                        value={isMandatory}
                                        onValueChange={setIsMandatory}
                                        label="Mandatory Checklist Item"
                                        modifiers={[tint('#FF3B30')]}
                                    />

                                    <TextField
                                        placeholder="Sequence Order"
                                        defaultValue={sequenceOrder}
                                        onChangeText={setSequenceOrder}
                                        modifiers={[tint('#FF3B30')]}
                                    />
                                </Section>
                            </>
                        )}
                    </Form>

                    <Spacer />

                    {/* Action Button Footer */}
                    <VStack spacing={12} modifiers={[
                        padding({ top: 12, leading: 20, trailing: 20, bottom: 22 }),
                        background(sheetBg)
                    ]}>
                        {editItem && (
                            <Button
                                role="destructive"
                                onPress={handleDeletePress}
                                modifiers={[buttonStyle('plain'), frame({ maxWidth: Infinity, height: 44 })]}
                            >
                                <HStack alignment="center">
                                    <Spacer />
                                    <Image systemName="trash" size={16} color="#FF3B30" />
                                    <SwiftUIText color="#FF3B30" weight="semibold" modifiers={[padding({ leading: 6 })]}>
                                        {`Delete ${typeLabel}`}
                                    </SwiftUIText>
                                    <Spacer />
                                </HStack>
                            </Button>
                        )}

                        <Button
                            variant="glassProminent"
                            color="#FF3B30"
                            onPress={handleSave}
                            modifiers={[
                                frame({ maxWidth: Infinity }), 
                                cornerRadius(999),
                                disabled(isSaving)
                            ]}
                        >
                            <HStack alignment="center" spacing={6} modifiers={[
                                frame({ maxWidth: Infinity }),
                                frame({ height: 42 })
                            ]}>
                                <Spacer />
                                <SwiftUIText weight="semibold" size={17} color="#FFFFFF">
                                    {isSaving ? 'Saving...' : (editItem ? 'Save Settings' : `Add ${typeLabel}`)}
                                </SwiftUIText>
                                <Spacer />
                            </HStack>
                        </Button>
                    </VStack>
                </VStack>
            </BottomSheet>
        </Host>
    );
};
