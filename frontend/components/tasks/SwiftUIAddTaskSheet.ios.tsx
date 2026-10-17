import React, { useState, useEffect } from 'react';
import { Alert, ActivityIndicator } from 'react-native';
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
    DateTimePicker
} from '@expo/ui/swift-ui';
import { padding, background, ignoreSafeArea, tint, frame, cornerRadius, buttonStyle, disabled } from '@expo/ui/swift-ui/modifiers';
import * as Haptics from 'expo-haptics';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useTheme } from '@/context/ThemeContext';
import { useUserContext } from '@/context/UserProvider';
import { useTenantContext } from '@/context/TenantContext';
import { Task, TaskAttachment, Project } from '@/constants/MockData';
import { getProjects } from '@/lib/api/projects';
import { getProfiles, getProjectWbs, createTaskApi, uploadTaskAttachment, WBS_TEMPLATES, isWbsSupported } from '@/lib/api/tasks';


const MODULE_OPTIONS = [
    { id: 'none', label: 'None' },
    { id: 'finance', label: 'Finance' },
    { id: 'resources', label: 'Resources' },
    { id: 'people', label: 'People' },
    { id: 'clock', label: 'Clock' },
    { id: 'crew', label: 'Crew' },
];

const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'urgent'];

export interface SwiftUIAddTaskSheetProps {
    isOpened: boolean;
    onClose: () => void;
    onSave: (task: Task) => void;
    defaultProjectId?: string;
}

export const SwiftUIAddTaskSheet: React.FC<SwiftUIAddTaskSheetProps> = ({
    isOpened,
    onClose,
    onSave,
    defaultProjectId,
}) => {
    const { isAuthenticated } = useUserContext();
    const { activeWorkspace, activeTenant } = useTenantContext();
    const wbsSupported = isWbsSupported(activeTenant);
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const sheetBg = 'clear';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#C7C7CC' : 'gray';
    const nativeControlTextColor = isDark ? '#FFFFFF' : '#000000';

    // Lists from Supabase
    const [projects, setProjects] = useState<Project[]>([]);
    const [profiles, setProfiles] = useState<Array<{ id: string; name: string; avatar?: string }>>([]);

    // State Fields
    const [title, setTitle] = useState('');
    const [projectIndex, setProjectIndex] = useState(0);
    const [disciplineIndex, setDisciplineIndex] = useState(0); // 0 is "Select Discipline"
    const [wbsIndex, setWbsIndex] = useState(0); // index 0 is "Select WBS Code"
    const [priorityIndex, setPriorityIndex] = useState(1); // Default medium
    const [dueDate, setDueDate] = useState<Date>(new Date());
    const [dueTime, setDueTime] = useState<Date>(() => {
        const d = new Date();
        d.setHours(14, 0, 0, 0);
        return d;
    });
    const [description, setDescription] = useState('');
    const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
    const [subtasks, setSubtasks] = useState<Array<{ id: string; title: string; assigneeId: string }>>([]);
    const [moduleIndex, setModuleIndex] = useState(0); // Default 'None'

    // Attachments
    const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
    const [linkInput, setLinkInput] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);



    const getWbsOptionsForDiscipline = (index: number) => {
        if (index === 0) return [];
        const disciplines = ['S', 'A', 'M', 'I', 'L'];
        const code = disciplines[index - 1];
        const template = WBS_TEMPLATES.find(d => d.code === code);
        if (!template) return [];
        return template.sections.map(s => ({
            id: `wbs-${code.toLowerCase()}-${s.code.split('.').pop()}`,
            code: s.code,
            label: s.name
        }));
    };

    const handleProjectChanged = (index: number) => {
        setProjectIndex(index);
    };

    // Reset when sheet is opened
    useEffect(() => {
        if (isOpened && isAuthenticated) {
            setTitle('');
            setProjectIndex(0);
            setDisciplineIndex(0);
            setWbsIndex(0);
            setPriorityIndex(1);
            setDueDate(new Date());
            const d = new Date();
            d.setHours(14, 0, 0, 0);
            setDueTime(d);
            setDescription('');
            setSelectedAssignees([]);
            setSubtasks([]);
            setModuleIndex(0);
            setAttachments([]);
            setLinkInput('');

            Promise.all([
                getProjects(activeWorkspace?.id),
                getProfiles()
            ]).then(([projs, profs]) => {
                setProjects(projs);
                setProfiles(profs);
                if (defaultProjectId && projs.length > 0) {
                    const idx = projs.findIndex(p => p.id === defaultProjectId);
                    if (idx !== -1) {
                        setProjectIndex(idx);
                    }
                }
            }).catch(err => {
                console.error('Failed to load add task setup data:', err);
            });
        }
    }, [isOpened, isAuthenticated, defaultProjectId]);

    const handleSave = async () => {
        if (!title.trim()) {
            Alert.alert('Error', 'Please enter a task title');
            return;
        }
        if (projects.length === 0) {
            Alert.alert('Error', 'No projects loaded.');
            return;
        }

        setIsSaving(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        const selectedProject = projects[projectIndex];
        const selectedWbs = (disciplineIndex > 0 && wbsIndex > 0)
            ? getWbsOptionsForDiscipline(disciplineIndex)[wbsIndex - 1]
            : null;

        // Formatted dates
        const dateStr = dueDate.toISOString().split('T')[0];
        const hours = String(dueTime.getHours()).padStart(2, '0');
        const minutes = String(dueTime.getMinutes()).padStart(2, '0');
        const timeStr = `${hours}:${minutes}`;

        // Module linking
        const selectedModule = MODULE_OPTIONS[moduleIndex];
        let taskType: Task['taskType'] = 'generic';
        let linkedModule: Task['linkedModule'] = undefined;

        if (selectedModule.id !== 'none') {
            taskType = 'linked_module';
            linkedModule = {
                target: selectedModule.id as any,
                actionLabel: `Go To ${selectedModule.label}`,
                route: `/${selectedModule.id}`
            };
        }

        // Map subtasks
        const finalSubtasks = subtasks.map(sub => ({
            id: sub.id,
            title: sub.title.trim() || 'Subtask',
            assignee: { name: 'Staff' },
            isDone: false
        }));

        try {
            const payload: any = {
                title: title.trim(),
                projectId: selectedProject?.id || undefined,
                project: selectedProject?.title || (selectedProject as any)?.name,
                projectCode: selectedProject?.code || (selectedProject as any)?.project_code,
                wbsId: selectedWbs?.id || undefined,
                wbsCode: selectedWbs?.code || undefined,
                dueDate: dateStr,
                dueTime: timeStr,
                status: 'todo',
                priority: PRIORITY_OPTIONS[priorityIndex] as Task['priority'],
                description: description.trim() || undefined,
                taskType,
                linkedModule,
                subtasks: finalSubtasks,
                attachments: attachments,
            };

            const createdTask = await createTaskApi(payload, selectedAssignees);
            
            if (createdTask) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                onSave(createdTask);
            } else {
                Alert.alert('Error', 'Failed to create task.');
            }
        } catch (e: any) {
            console.error('Error saving task on iOS:', e);
            Alert.alert('Error', e.message || 'An unexpected error occurred while saving.');
        } finally {
            setIsSaving(false);
        }
    };

    // Attachments actions
    const handlePickFile = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                copyToCacheDirectory: true
            });
            
            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                setIsUploading(true);
                
                const base64 = await FileSystem.readAsStringAsync(asset.uri, {
                    encoding: FileSystem.EncodingType.Base64
                });
                
                const ext = asset.name.split('.').pop() || 'dat';
                const mimeType = asset.mimeType || 'application/octet-stream';
                
                const uploadedPath = await uploadTaskAttachment(base64, ext, mimeType);
                
                setAttachments(prev => [
                    ...prev,
                    {
                        id: `att-${Date.now()}`,
                        uri: uploadedPath,
                        name: asset.name,
                        type: (mimeType.startsWith('image/') ? 'image' : 'file') as any
                    }
                ]);
                setIsUploading(false);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
        } catch (err) {
            console.error('File upload error iOS:', err);
            Alert.alert('Upload Failed', 'Failed to upload selected file.');
            setIsUploading(false);
        }
    };

    const handlePickImage = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Permission to access media library is required.');
                return;
            }
            
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: false,
                quality: 0.8,
            });
            
            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                setIsUploading(true);
                
                const base64 = await FileSystem.readAsStringAsync(asset.uri, {
                    encoding: FileSystem.EncodingType.Base64
                });
                
                const ext = asset.uri.split('.').pop() || 'jpg';
                const mimeType = asset.mimeType || 'image/jpeg';
                
                const uploadedPath = await uploadTaskAttachment(base64, ext, mimeType);
                const fileName = asset.fileName || `photo-${Date.now()}.${ext}`;
                
                setAttachments(prev => [
                    ...prev,
                    {
                        id: `att-${Date.now()}`,
                        uri: uploadedPath,
                        name: fileName,
                        type: 'image'
                    }
                ]);
                setIsUploading(false);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
        } catch (err) {
            console.error('Image upload error iOS:', err);
            Alert.alert('Upload Failed', 'Failed to upload selected image.');
            setIsUploading(false);
        }
    };

    const handleAddLink = () => {
        if (!linkInput.trim()) return;
        let url = linkInput.trim();
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }
        setAttachments(prev => [
            ...prev,
            {
                id: `att-${Date.now()}`,
                uri: url,
                name: linkInput.trim(),
                type: 'file'
            }
        ]);
        setLinkInput('');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const handleRemoveAttachment = (id: string) => {
        setAttachments(prev => prev.filter(att => att.id !== id));
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const toggleAssignee = (id: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedAssignees(prev => {
            if (prev.includes(id)) {
                return prev.filter(aId => aId !== id);
            } else {
                return [...prev, id];
            }
        });
    };

    const addSubtask = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSubtasks(prev => [
            ...prev,
            { id: `sub-${Date.now()}-${prev.length}`, title: '', assigneeId: '1' }
        ]);
    };

    const updateSubtaskTitle = (id: string, text: string) => {
        setSubtasks(prev => prev.map(s => s.id === id ? { ...s, title: text } : s));
    };

    const removeSubtask = (id: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSubtasks(prev => prev.filter(s => s.id !== id));
    };

    const getPriorityColor = (idx: number) => {
        switch (idx) {
            case 3: return '#FF3B30'; // urgent
            case 2: return '#FF9500'; // high
            case 1: return '#8E8E93'; // medium
            default: return '#8E8E93'; // low
        }
    };

    const selectedAssigneesList = profiles.filter(m => selectedAssignees.includes(m.id));

    return (
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet
                isOpened={isOpened}
                presentationDetents={[0.9]}
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
                            Add New Task
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
                                placeholder="Task Title"
                                defaultValue={title}
                                onChangeText={setTitle}
                                modifiers={[tint('#007AFF')]}
                            />
                            {projects.length > 0 && (
                                <Picker
                                    label="Project"
                                    options={projects.map(p => `${p.code} - ${p.title}`)}
                                    selectedIndex={projectIndex}
                                    onOptionSelected={(e) => handleProjectChanged(e.nativeEvent.index)}
                                    variant="menu"
                                    color={nativeControlTextColor}
                                    modifiers={[tint('#007AFF')]}
                                />
                            )}
                            {wbsSupported && (
                                <>
                                    <Picker
                                        label="Discipline"
                                        options={['Select Discipline', 'S - Structure', 'A - Architecture', 'M - MEP', 'I - Interior', 'L - Landscape']}
                                        selectedIndex={disciplineIndex}
                                        onOptionSelected={(e) => {
                                            setDisciplineIndex(e.nativeEvent.index);
                                            setWbsIndex(0);
                                        }}
                                        variant="menu"
                                        color={nativeControlTextColor}
                                        modifiers={[tint('#007AFF')]}
                                    />
                                    {disciplineIndex > 0 && (
                                        <Picker
                                            label="WBS Structure"
                                            options={['Select WBS Code', ...getWbsOptionsForDiscipline(disciplineIndex).map(o => `${o.code} - ${o.label}`)]}
                                            selectedIndex={wbsIndex}
                                            onOptionSelected={(e) => setWbsIndex(e.nativeEvent.index)}
                                            variant="menu"
                                            color={nativeControlTextColor}
                                            modifiers={[tint('#007AFF')]}
                                        />
                                    )}
                                </>
                            )}
                            <VStack alignment="leading" spacing={4} modifiers={[padding({ vertical: 6 })]}>
                                <SwiftUIText size={13} color={subtextColor}>Priority</SwiftUIText>
                                <Picker
                                    options={['Low', 'Medium', 'High', 'Urgent']}
                                    selectedIndex={priorityIndex}
                                    onOptionSelected={(e) => setPriorityIndex(e.nativeEvent.index)}
                                    variant="segmented"
                                    modifiers={[tint(getPriorityColor(priorityIndex))]}
                                />
                            </VStack>
                        </Section>

                        <Section title="Timeline & Deadline">
                            <DateTimePicker
                                title="Due Date"
                                initialDate={dueDate.toISOString()}
                                onDateSelected={(date) => setDueDate(date)}
                                variant="compact"
                                displayedComponents="date"
                                color={nativeControlTextColor}
                                modifiers={[tint('#007AFF')]}
                            />
                            <DateTimePicker
                                title="Due Time"
                                initialDate={dueTime.toISOString()}
                                onDateSelected={(time) => setDueTime(time)}
                                variant="compact"
                                displayedComponents="hourAndMinute"
                                color={nativeControlTextColor}
                                modifiers={[tint('#007AFF')]}
                            />
                        </Section>

                        <Section title="Assignees">
                            {selectedAssigneesList.map(member => (
                                <HStack key={member.id} alignment="center" modifiers={[padding({ vertical: 4 })]}>
                                    <SwiftUIText color={textColor}>{member.name}</SwiftUIText>
                                    <Spacer />
                                    <Button 
                                        systemImage="minus.circle.fill" 
                                        color="red" 
                                        onPress={() => toggleAssignee(member.id)}
                                        modifiers={[frame({ width: 28, height: 28 })]}
                                    />
                                </HStack>
                            ))}
                            <Picker
                                options={['Assign User...', ...profiles.map(p => selectedAssignees.includes(p.id) ? `✓ ${p.name}` : p.name)]}
                                selectedIndex={0}
                                onOptionSelected={(e) => {
                                    const idx = e.nativeEvent.index;
                                    if (idx > 0) {
                                        const selectedProfile = profiles[idx - 1];
                                        if (selectedProfile) {
                                            toggleAssignee(selectedProfile.id);
                                        }
                                    }
                                }}
                                variant="menu"
                                color={nativeControlTextColor}
                                modifiers={[tint('#007AFF')]}
                            />
                        </Section>

                        <Section title={`Subtasks (${subtasks.length})`}>
                            {subtasks.map(sub => (
                                <HStack key={sub.id} alignment="center" spacing={8} modifiers={[padding({ vertical: 4 })]}>
                                    <TextField
                                        placeholder="Subtask title"
                                        defaultValue={sub.title}
                                        onChangeText={(text) => updateSubtaskTitle(sub.id, text)}
                                        modifiers={[frame({ maxWidth: Infinity }), tint('#007AFF')]}
                                    />
                                    <Button
                                        systemImage="trash"
                                        color="red"
                                        onPress={() => removeSubtask(sub.id)}
                                        modifiers={[frame({ width: 32, height: 32 })]}
                                    />
                                </HStack>
                            ))}
                            <Button
                                onPress={addSubtask}
                                modifiers={[buttonStyle('plain'), padding({ vertical: 8 })]}
                            >
                                <SwiftUIText color="#007AFF" weight="semibold">Add Subtask</SwiftUIText>
                            </Button>
                        </Section>

                        <Section title="Module Integration">
                            <Picker
                                label="Link to Module"
                                options={MODULE_OPTIONS.map(o => o.label)}
                                selectedIndex={moduleIndex}
                                onOptionSelected={(e) => setModuleIndex(e.nativeEvent.index)}
                                variant="menu"
                                color={nativeControlTextColor}
                                modifiers={[tint('#007AFF')]}
                            />
                        </Section>

                        {/* Attachments Section */}
                        <Section title="Attachments (Links & Files)">
                            {attachments.map(att => {
                                const isLink = att.uri.startsWith('http');
                                return (
                                    <HStack key={att.id} alignment="center" modifiers={[padding({ vertical: 4 })]}>
                                        <Image systemName={isLink ? "link" : (att.type === 'image' ? "photo" : "doc")} size={16} color={subtextColor} />
                                        <SwiftUIText color={textColor} size={14} modifiers={[padding({ leading: 6 })]}>
                                            {att.name}
                                        </SwiftUIText>
                                        <Spacer />
                                        <Button 
                                            systemImage="trash" 
                                            color="red" 
                                            onPress={() => handleRemoveAttachment(att.id)}
                                            modifiers={[frame({ width: 28, height: 28 })]}
                                        />
                                    </HStack>
                                );
                            })}
                            <HStack alignment="center" spacing={8} modifiers={[padding({ vertical: 4 })]}>
                                <TextField 
                                    placeholder="Add web link..." 
                                    defaultValue={linkInput} 
                                    onChangeText={setLinkInput}
                                    modifiers={[tint('#007AFF')]}
                                />
                                <Button 
                                    onPress={handleAddLink} 
                                    modifiers={[disabled(!linkInput.trim())]}
                                >
                                    <SwiftUIText color="#007AFF" weight="medium">Add</SwiftUIText>
                                </Button>
                            </HStack>
                            <HStack spacing={12} modifiers={[padding({ vertical: 6 })]}>
                                <Button
                                    onPress={handlePickImage}
                                    modifiers={[buttonStyle('plain')]}
                                >
                                    <HStack spacing={4}>
                                        <Image systemName="photo.on.rectangle" size={16} color="#007AFF" />
                                        <SwiftUIText color="#007AFF" size={14} weight="medium">Pick Photo</SwiftUIText>
                                    </HStack>
                                </Button>
                                <Spacer />
                                <Button
                                    onPress={handlePickFile}
                                    modifiers={[buttonStyle('plain')]}
                                >
                                    <HStack spacing={4}>
                                        <Image systemName="doc.badge.plus" size={16} color="#34C759" />
                                        <SwiftUIText color="#34C759" size={14} weight="medium">Upload File</SwiftUIText>
                                    </HStack>
                                </Button>
                            </HStack>

                            {isUploading && (
                                <HStack spacing={8} modifiers={[padding({ vertical: 4 })]}>
                                    <SwiftUIText size={12} color={subtextColor}>Uploading files to server...</SwiftUIText>
                                </HStack>
                            )}
                        </Section>

                        <Section title="Notes / Description">
                            <TextField
                                placeholder="Additional details..."
                                defaultValue={description}
                                onChangeText={setDescription}
                                modifiers={[tint('#007AFF')]}
                            />
                        </Section>
                    </Form>

                    {/* Create Button Footer */}
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
                                disabled(isSaving || isUploading)
                            ]}
                        >
                            <HStack alignment="center" spacing={6} modifiers={[
                                frame({ maxWidth: Infinity }),
                                frame({ height: 42 })
                            ]}>
                                <Spacer />
                                {isSaving ? (
                                    <SwiftUIText weight="semibold" size={17} color="#FFFFFF">Creating...</SwiftUIText>
                                ) : (
                                    <SwiftUIText weight="semibold" size={17} color="#FFFFFF">Create Task</SwiftUIText>
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
