import React, { useState, useEffect } from 'react';
import {
    Modal,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { ProjectMilestone } from '@/lib/api/projectProgress';
import { getProjectById, saveProjectMeta } from '@/lib/api/projects';

export interface SwiftUIAddMilestoneSheetProps {
    isOpened: boolean;
    onClose: () => void;
    onSave?: (milestone: ProjectMilestone, projectId: string) => Promise<void> | void;
    defaultProjectId?: string;
    milestoneToEdit?: ProjectMilestone | null;
    existingMilestones?: ProjectMilestone[];
}

export const SwiftUIAddMilestoneSheet: React.FC<SwiftUIAddMilestoneSheetProps> = ({
    isOpened,
    onClose,
    onSave,
    defaultProjectId,
    milestoneToEdit,
    existingMilestones = [],
}) => {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';

    const [title, setTitle] = useState('');
    const [targetDate, setTargetDate] = useState('');
    const [status, setStatus] = useState<'upcoming' | 'in_progress' | 'completed'>('upcoming');
    const [description, setDescription] = useState('');
    const [predecessorId, setPredecessorId] = useState<string | undefined>(undefined);
    const [isSaving, setIsSaving] = useState(false);

    const availablePredecessors = React.useMemo(() => {
        return existingMilestones.filter(m => !milestoneToEdit || m.id !== milestoneToEdit.id);
    }, [existingMilestones, milestoneToEdit]);

    useEffect(() => {
        if (isOpened) {
            if (milestoneToEdit) {
                setTitle(milestoneToEdit.title || '');
                setTargetDate(milestoneToEdit.targetDate || '');
                setStatus(milestoneToEdit.status || 'upcoming');
                setDescription(milestoneToEdit.description || '');
                setPredecessorId(milestoneToEdit.predecessorId);
            } else {
                setTitle('');
                setTargetDate('');
                setStatus('upcoming');
                setDescription('');
                setPredecessorId(undefined);
            }
        }
    }, [isOpened, milestoneToEdit]);

    const handleSave = async () => {
        if (!title.trim()) {
            Alert.alert('Required', 'Please enter a milestone title.');
            return;
        }
        if (!defaultProjectId) {
            Alert.alert('Required', 'Project ID is missing.');
            return;
        }

        setIsSaving(true);
        const savedMilestone: ProjectMilestone = {
            id: milestoneToEdit?.id || `m-${Date.now()}`,
            title: title.trim(),
            targetDate: targetDate.trim() || undefined,
            status,
            description: description.trim() || undefined,
            predecessorId,
        };

        try {
            const project = await getProjectById(defaultProjectId);
            const currentMilestones: ProjectMilestone[] = (project?.meta?.milestones && Array.isArray(project.meta.milestones))
                ? project.meta.milestones
                : [];

            let updatedList: ProjectMilestone[];
            if (milestoneToEdit) {
                updatedList = currentMilestones.map(m => m.id === milestoneToEdit.id ? savedMilestone : m);
            } else {
                updatedList = [...currentMilestones, savedMilestone];
            }

            const nextMeta = {
                ...(project?.meta || {}),
                milestones: updatedList,
            };

            await saveProjectMeta(defaultProjectId, nextMeta);

            if (onSave) {
                await onSave(savedMilestone, defaultProjectId);
            }

            onClose();
        } catch (e) {
            console.error('Error saving milestone:', e);
            Alert.alert('Error', 'Failed to save milestone.');
        } finally {
            setIsSaving(false);
        }
    };

    const isEditMode = !!milestoneToEdit;

    return (
        <Modal
            visible={isOpened}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.sheetContent, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
                    <View style={styles.headerRow}>
                        <Text style={[styles.sheetTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                            {isEditMode ? 'Edit Milestone' : 'Add New Milestone'}
                        </Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={20} color={isDark ? '#8E8E93' : '#636366'} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.formBody}>
                        <Text style={[styles.label, { color: isDark ? '#8E8E93' : '#636366' }]}>Title</Text>
                        <TextInput
                            placeholder="Milestone Title..."
                            placeholderTextColor={isDark ? '#545458' : '#AEAEB2'}
                            value={title}
                            onChangeText={setTitle}
                            style={[styles.input, { color: isDark ? '#FFFFFF' : '#000000', backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
                        />

                        <Text style={[styles.label, { color: isDark ? '#8E8E93' : '#636366' }]}>Target Date</Text>
                        <TextInput
                            placeholder="YYYY-MM-DD (e.g. 2026-09-30)"
                            placeholderTextColor={isDark ? '#545458' : '#AEAEB2'}
                            value={targetDate}
                            onChangeText={setTargetDate}
                            style={[styles.input, { color: isDark ? '#FFFFFF' : '#000000', backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
                        />

                        <Text style={[styles.label, { color: isDark ? '#8E8E93' : '#636366' }]}>Status</Text>
                        <View style={styles.statusRow}>
                            {(['upcoming', 'in_progress', 'completed'] as const).map(s => (
                                <TouchableOpacity
                                    key={s}
                                    onPress={() => setStatus(s)}
                                    style={[
                                        styles.statusOption,
                                        status === s && { backgroundColor: '#0036F8' }
                                    ]}
                                >
                                    <Text style={[styles.statusOptionText, status === s && { color: '#FFFFFF', fontWeight: '700' }]}>
                                        {s === 'upcoming' ? 'Upcoming' : s === 'in_progress' ? 'In Progress' : 'Completed'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={[styles.label, { color: isDark ? '#8E8E93' : '#636366' }]}>Description</Text>
                        <TextInput
                            placeholder="Optional notes or checklist..."
                            placeholderTextColor={isDark ? '#545458' : '#AEAEB2'}
                            value={description}
                            onChangeText={setDescription}
                            multiline
                            numberOfLines={3}
                            style={[styles.input, styles.textArea, { color: isDark ? '#FFFFFF' : '#000000', backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
                        />
                    </ScrollView>

                    <TouchableOpacity
                        onPress={handleSave}
                        disabled={isSaving}
                        style={[styles.saveBtn, { opacity: isSaving ? 0.7 : 1 }]}
                    >
                        {isSaving ? (
                            <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                            <Text style={styles.saveBtnText}>
                                {isEditMode ? 'Save Changes' : 'Add Milestone'}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    sheetContent: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: '85%',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    sheetTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    closeBtn: {
        padding: 4,
    },
    formBody: {
        marginBottom: 16,
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 6,
        marginTop: 10,
    },
    input: {
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
    },
    textArea: {
        height: 70,
        textAlignVertical: 'top',
    },
    statusRow: {
        flexDirection: 'row',
        gap: 8,
    },
    statusOption: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 8,
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.05)',
    },
    statusOptionText: {
        fontSize: 12,
        color: '#8E8E93',
    },
    saveBtn: {
        backgroundColor: '#0036F8',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveBtnText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
});
