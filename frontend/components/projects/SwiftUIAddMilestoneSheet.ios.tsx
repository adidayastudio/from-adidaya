import React, { useState, useEffect } from 'react';
import { Alert, ActivityIndicator } from 'react-native';
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
    TextField,
    Picker,
    DateTimePicker,
} from '@expo/ui/swift-ui';
import { padding, background, ignoreSafeArea, tint, frame, cornerRadius, buttonStyle, disabled } from '@expo/ui/swift-ui/modifiers';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { ProjectMilestone } from '@/lib/api/projectProgress';
import { getProjects, getProjectById, saveProjectMeta, Project } from '@/lib/api/projects';

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
    const sheetBg = 'clear';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#C7C7CC' : 'gray';
    const nativeControlTextColor = isDark ? '#FFFFFF' : '#000000';

    const [projects, setProjects] = useState<Project[]>([]);
    const [projectIndex, setProjectIndex] = useState(0);

    const [title, setTitle] = useState('');
    const [statusIndex, setStatusIndex] = useState(0); // 0: upcoming, 1: in_progress, 2: completed
    const [targetDate, setTargetDate] = useState<Date>(new Date());
    const [description, setDescription] = useState('');
    const [predecessorIndex, setPredecessorIndex] = useState(0);
    const [isSaving, setIsSaving] = useState(false);

    // Eligible predecessors (exclude self)
    const availablePredecessors = React.useMemo(() => {
        return existingMilestones.filter(m => !milestoneToEdit || m.id !== milestoneToEdit.id);
    }, [existingMilestones, milestoneToEdit]);

    const parseAnyDate = (raw?: string | null | number | Date): Date => {
        if (!raw) return new Date();
        if (raw instanceof Date) return isNaN(raw.getTime()) ? new Date() : raw;
        if (typeof raw === 'number') {
            const d = new Date(raw);
            return isNaN(d.getTime()) ? new Date() : d;
        }
        const str = String(raw).trim();
        if (!str) return new Date();

        const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
        if (isoMatch) {
            const d = new Date(parseInt(isoMatch[1], 10), parseInt(isoMatch[2], 10) - 1, parseInt(isoMatch[3], 10));
            return isNaN(d.getTime()) ? new Date() : d;
        }

        const dmyMatch = str.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
        if (dmyMatch) {
            const day = parseInt(dmyMatch[1], 10);
            const monthStr = dmyMatch[2].toLowerCase().slice(0, 3);
            const year = parseInt(dmyMatch[3], 10);
            const MONTHS: Record<string, number> = {
                jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
                jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
            };
            if (MONTHS[monthStr] !== undefined) {
                const d = new Date(year, MONTHS[monthStr], day);
                return isNaN(d.getTime()) ? new Date() : d;
            }
        }

        const direct = new Date(str);
        if (!isNaN(direct.getTime())) return direct;

        return new Date();
    };

    useEffect(() => {
        if (isOpened) {
            loadProjects();
            if (milestoneToEdit) {
                setTitle(milestoneToEdit.title || '');
                const sMap = { upcoming: 0, in_progress: 1, completed: 2 };
                setStatusIndex(sMap[milestoneToEdit.status] ?? 0);
                setTargetDate(parseAnyDate(milestoneToEdit.targetDate));
                setDescription(milestoneToEdit.description || '');

                if (milestoneToEdit.predecessorId && availablePredecessors.length > 0) {
                    const pIdx = availablePredecessors.findIndex(p => p.id === milestoneToEdit.predecessorId);
                    setPredecessorIndex(pIdx !== -1 ? pIdx + 1 : 0);
                } else {
                    setPredecessorIndex(0);
                }
            } else {
                setTitle('');
                setStatusIndex(0);
                setTargetDate(new Date());
                setDescription('');
                setPredecessorIndex(0);
            }
        }
    }, [isOpened, defaultProjectId, milestoneToEdit, availablePredecessors]);

    const loadProjects = async () => {
        try {
            const data = await getProjects();
            setProjects(data);
            if (defaultProjectId && data.length > 0) {
                const idx = data.findIndex(p => p.id === defaultProjectId);
                if (idx !== -1) {
                    setProjectIndex(idx);
                }
            }
        } catch (e) {
            console.error('Error fetching projects for milestone sheet:', e);
        }
    };

    const handleSave = async () => {
        if (!title.trim()) {
            Alert.alert('Required Field', 'Please enter a milestone title.');
            return;
        }

        const selectedProject = projects[projectIndex] || (defaultProjectId ? { id: defaultProjectId } : null);
        const targetProjectId = selectedProject?.id || defaultProjectId;

        if (!targetProjectId) {
            Alert.alert('Required Field', 'Please select a valid project.');
            return;
        }

        setIsSaving(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        const formattedDate = targetDate.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });

        const statusMap: Array<'upcoming' | 'in_progress' | 'completed'> = ['upcoming', 'in_progress', 'completed'];
        const chosenStatus = statusMap[statusIndex] || 'upcoming';

        // Predecessor ID
        let chosenPredecessorId: string | undefined = undefined;
        if (availablePredecessors.length > 0 && predecessorIndex > 0) {
            chosenPredecessorId = availablePredecessors[predecessorIndex - 1]?.id;
        }

        const savedMilestone: ProjectMilestone = {
            id: milestoneToEdit?.id || `m-${Date.now()}`,
            title: title.trim(),
            targetDate: formattedDate,
            status: chosenStatus,
            description: description.trim() || undefined,
            predecessorId: chosenPredecessorId,
        };

        try {
            const targetProjData = await getProjectById(targetProjectId);
            const currentMilestones: ProjectMilestone[] = (targetProjData?.meta?.milestones && Array.isArray(targetProjData.meta.milestones))
                ? targetProjData.meta.milestones
                : [];

            let updatedList: ProjectMilestone[];
            if (milestoneToEdit) {
                updatedList = currentMilestones.map(m => m.id === milestoneToEdit.id ? savedMilestone : m);
            } else {
                updatedList = [...currentMilestones, savedMilestone];
            }

            const nextMeta = {
                ...(targetProjData?.meta || {}),
                milestones: updatedList,
            };

            await saveProjectMeta(targetProjectId, nextMeta);

            if (onSave) {
                await onSave(savedMilestone, targetProjectId);
            }

            onClose();
        } catch (err) {
            console.error('Error saving milestone:', err);
            Alert.alert('Error', 'Failed to save milestone.');
        } finally {
            setIsSaving(false);
        }
    };

    const isEditMode = !!milestoneToEdit;

    return (
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet
                isOpened={isOpened}
                presentationDetents={[0.7, 0.9]}
                onIsOpenedChange={(opened) => {
                    if (!opened) onClose();
                }}
            >
                <VStack spacing={0} modifiers={[
                    ignoreSafeArea({ edges: 'bottom' }),
                    background(sheetBg)
                ]}>
                    {/* Header */}
                    <HStack alignment="center" modifiers={[padding({ top: 12, leading: 20, trailing: 20, bottom: 8 })]}>
                        <SwiftUIText size={22} weight="bold" color={textColor}>
                            {isEditMode ? 'Edit Milestone' : 'Add New Milestone'}
                        </SwiftUIText>
                        <Spacer />
                        <Button
                            systemImage="xmark"
                            role="cancel"
                            color="gray"
                            onPress={onClose}
                        />
                    </HStack>

                    {/* Form Scroll View */}
                    <Form modifiers={[background(sheetBg)]}>
                        <Section title="General Information">
                            <TextField
                                placeholder="Milestone Title (e.g. Design Approval)"
                                defaultValue={title}
                                onChangeText={setTitle}
                                modifiers={[tint('#007AFF')]}
                            />

                            {projects.length > 0 && !isEditMode && (
                                <Picker
                                    label="Project"
                                    options={projects.map(p => `${p.code} - ${p.title}`)}
                                    selectedIndex={projectIndex}
                                    onOptionSelected={(e) => setProjectIndex(e.nativeEvent.index)}
                                    variant="menu"
                                    color={nativeControlTextColor}
                                    modifiers={[tint('#007AFF')]}
                                />
                            )}

                            <VStack alignment="leading" spacing={4} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={13} color={subtextColor}>Status</SwiftUIText>
                                <Picker
                                    options={['Upcoming', 'In Progress', 'Completed']}
                                    selectedIndex={statusIndex}
                                    onOptionSelected={(e) => setStatusIndex(e.nativeEvent.index)}
                                    variant="segmented"
                                    modifiers={[tint(statusIndex === 2 ? '#34C759' : statusIndex === 1 ? '#007AFF' : '#8E8E93')]}
                                />
                            </VStack>
                        </Section>

                        <Section title="Target Timeline & Predecessor">
                            <DateTimePicker
                                title="Target Date"
                                initialDate={targetDate.toISOString()}
                                onDateSelected={(date) => setTargetDate(date)}
                                variant="compact"
                                displayedComponents="date"
                                color={nativeControlTextColor}
                                modifiers={[tint('#007AFF')]}
                            />

                            {/* Predecessor Dependency Selection */}
                            <Picker
                                label="Predecessor (Depends On)"
                                options={
                                    availablePredecessors.length === 0
                                        ? ['No milestone before']
                                        : ['None (Set Later)', ...availablePredecessors.map(p => p.title)]
                                }
                                selectedIndex={predecessorIndex}
                                onOptionSelected={(e) => setPredecessorIndex(e.nativeEvent.index)}
                                variant="menu"
                                color={nativeControlTextColor}
                                modifiers={[tint('#007AFF')]}
                            />
                        </Section>

                        <Section title="Description / Key Deliverables">
                            <TextField
                                placeholder="Describe milestone scope, deliverables, or checklist..."
                                defaultValue={description}
                                onChangeText={setDescription}
                                modifiers={[tint('#007AFF')]}
                            />
                        </Section>
                    </Form>

                    {/* Submit Button Footer */}
                    <VStack modifiers={[
                        padding({ leading: 20, trailing: 20, top: 10, bottom: 28 }),
                        background(sheetBg)
                    ]}>
                        <Button
                            variant="glassProminent"
                            color="#007AFF"
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
                                {isSaving ? (
                                    <SwiftUIText weight="semibold" size={17} color="#FFFFFF">
                                        {isEditMode ? 'Saving Changes...' : 'Adding Milestone...'}
                                    </SwiftUIText>
                                ) : (
                                    <SwiftUIText weight="semibold" size={17} color="#FFFFFF">
                                        {isEditMode ? 'Save Changes' : 'Add Milestone'}
                                    </SwiftUIText>
                                )}
                                <Spacer />
                            </HStack>
                        </Button>
                    </VStack>
                </VStack>
            </BottomSheet>
        </Host>
    );
};
