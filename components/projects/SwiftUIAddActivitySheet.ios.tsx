import React, { useState, useEffect, useMemo } from 'react';
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
} from '@expo/ui/swift-ui';
import { padding, background, ignoreSafeArea, tint, frame, cornerRadius } from '@expo/ui/swift-ui/modifiers';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '@/context/ThemeContext';
import { useTenantContext } from '@/context/TenantContext';
import { saveProjectMeta, getProjectById } from '@/lib/api/projects';
import { getTasks, getActions } from '@/lib/api/tasks';
import { ProjectMilestone } from '@/lib/api/projectProgress';
import { Task, Action } from '@/constants/MockData';

export interface ActivityAttachment {
    id: string;
    name: string;
    size?: string;
    uri: string;
    type?: string;
}

export interface ActivityMediaItem {
    uri: string;
    type: 'image' | 'video';
    name?: string;
}

export interface ActivityLog {
    id: string;
    activityType: 'member_update' | 'work_related' | 'module_linked';
    authorName: string;
    authorRole: string;
    authorAvatar?: string;
    timestamp: string;
    title: string;
    description: string;
    category?: 'Structural' | 'Architectural' | 'MEP' | 'HSE' | 'Logistics' | 'General';
    images?: string[];
    media?: ActivityMediaItem[];
    attachments?: ActivityAttachment[];
    workSource?: {
        type: 'milestone' | 'task' | 'action';
        id: string;
        title: string;
        status?: string;
    };
    moduleSource?: {
        target: 'finance' | 'clock' | 'resources' | 'people' | 'report' | 'crew' | 'forma_ai';
        documentRef?: string;
        amount?: number;
    };
    likes: number;
    hasLiked?: boolean;
    isEdited?: boolean;
    isDraft?: boolean;
    isCreatedByMe?: boolean;
    comments: Array<{
        id: string;
        author: string;
        text: string;
        timestamp: string;
    }>;
}

export interface SwiftUIAddActivitySheetProps {
    isOpened: boolean;
    onClose: () => void;
    onSave?: (activity: ActivityLog, projectId: string) => Promise<void> | void;
    onSaveDraft?: (draft: ActivityLog, projectId: string) => Promise<void> | void;
    defaultProjectId?: string;
    existingMilestones?: ProjectMilestone[];
    existingTasks?: Task[];
    existingActions?: Action[];
    initialActivity?: ActivityLog | null;
}

export const SwiftUIAddActivitySheet: React.FC<SwiftUIAddActivitySheetProps> = ({
    isOpened,
    onClose,
    onSave,
    onSaveDraft,
    defaultProjectId,
    existingMilestones = [],
    existingTasks = [],
    existingActions = [],
    initialActivity,
}) => {
    const { resolvedTheme } = useTheme();
    const { activeTenant } = useTenantContext();
    const isDark = resolvedTheme === 'dark';
    const sheetBg = 'clear';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#C7C7CC' : 'gray';
    const nativeControlTextColor = isDark ? '#FFFFFF' : '#000000';

    const isAdidayaTenant = !!activeTenant && (
        (activeTenant.name || '').toLowerCase().includes('adidaya') ||
        (activeTenant.slug || '').toLowerCase().includes('adidaya') ||
        (activeTenant.company_code || '').toLowerCase().includes('adidaya') ||
        (activeTenant.branding_name || '').toLowerCase().includes('adidaya')
    );

    const modules = useMemo(() => {
        const base = [
            { label: 'Finance', target: 'finance' as const },
            { label: 'Resources', target: 'resources' as const },
            { label: 'People', target: 'people' as const },
            { label: 'Clock', target: 'clock' as const },
            { label: 'Report', target: 'report' as const },
        ];
        if (isAdidayaTenant) {
            base.push(
                { label: 'Crew', target: 'crew' as const },
                { label: 'Forma AI', target: 'forma_ai' as const }
            );
        }
        return base;
    }, [isAdidayaTenant]);

    // Main 3-way activity type: 0: Member Update, 1: Work Item, 2: Module Linked
    const [activityTypeIndex, setActivityTypeIndex] = useState(0);

    // 1. Member Update Fields
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [mediaFiles, setMediaFiles] = useState<ActivityMediaItem[]>([]);
    const [fileAttachments, setFileAttachments] = useState<ActivityAttachment[]>([]);

    // 2. Work Related Fields
    const [workTypeIndex, setWorkTypeIndex] = useState(0); // 0: Task, 1: Milestone, 2: Action
    const [selectedWorkItemIndex, setSelectedWorkItemIndex] = useState(0);
    const [workNote, setWorkNote] = useState('');
    const [workStatusIndex, setWorkStatusIndex] = useState(0); // 0: In Progress, 1: Completed, 2: Revision, 3: To-Do

    // 3. Module Linked Fields
    const [moduleIndex, setModuleIndex] = useState(0); // 0: Finance, 1: Clock, 2: Resources, 3: People, 4: Reports, 5: Crew
    const [moduleDocRef, setModuleDocRef] = useState('');
    const [moduleTitle, setModuleTitle] = useState('');
    const [moduleNote, setModuleNote] = useState('');
    const [moduleAmount, setModuleAmount] = useState('');

    const [isSaving, setIsSaving] = useState(false);
    const [isSavingDraft, setIsSavingDraft] = useState(false);
    const [tasks, setTasks] = useState<Task[]>(existingTasks);
    const [actions, setActions] = useState<Action[]>(existingActions);
    const [milestones, setMilestones] = useState<ProjectMilestone[]>(existingMilestones);
    const workStatuses = ['In Progress', 'Completed', 'Revision', 'To-Do'];

    useEffect(() => {
        if (isOpened) {
            if (initialActivity) {
                setTitle(initialActivity.title || '');
                setDescription(initialActivity.description || '');
                
                // Load existing media
                if (initialActivity.media && initialActivity.media.length > 0) {
                    setMediaFiles(initialActivity.media);
                } else if (initialActivity.images && initialActivity.images.length > 0) {
                    setMediaFiles(initialActivity.images.map(img => ({ uri: img, type: 'image' })));
                } else {
                    setMediaFiles([]);
                }

                // Load existing attachments
                if (initialActivity.attachments && initialActivity.attachments.length > 0) {
                    setFileAttachments(initialActivity.attachments);
                } else {
                    setFileAttachments([]);
                }

                if (initialActivity.activityType === 'work_related') {
                    setActivityTypeIndex(1);
                    setWorkNote(initialActivity.description || '');
                } else if (initialActivity.activityType === 'module_linked') {
                    setActivityTypeIndex(2);
                    setModuleTitle(initialActivity.title || '');
                    setModuleNote(initialActivity.description || '');
                    setModuleDocRef(initialActivity.moduleSource?.documentRef || '');
                    if (initialActivity.moduleSource?.amount) {
                        setModuleAmount(initialActivity.moduleSource.amount.toString());
                    }
                } else {
                    setActivityTypeIndex(0);
                }
            } else {
                setTitle('');
                setDescription('');
                setMediaFiles([]);
                setFileAttachments([]);
                setWorkTypeIndex(0);
                setSelectedWorkItemIndex(0);
                setWorkNote('');
                setWorkStatusIndex(0);
                setModuleIndex(0);
                setModuleDocRef('');
                setModuleTitle('');
                setModuleNote('');
                setModuleAmount('');
            }

            if (defaultProjectId) {
                loadContextData(defaultProjectId);
            }
        }
    }, [isOpened, defaultProjectId, initialActivity]);

    const loadContextData = async (pId: string) => {
        try {
            const [proj, allTasks, allActions] = await Promise.all([
                getProjectById(pId),
                getTasks(),
                getActions(),
            ]);

            if (proj?.meta?.milestones && Array.isArray(proj.meta.milestones)) {
                setMilestones(proj.meta.milestones);
            }
            const pCode = proj?.code || 'PRJ';
            const fTasks = allTasks.filter(t => t.projectId === pId || (t.project && (t.project.id === pId || (t.project as any).project_code === pCode || t.projectCode === pCode)));
            const fActions = allActions.filter(a => a.projectId === pId || (a.project && (a.project.id === pId || (a.project as any).project_code === pCode || a.projectCode === pCode)));
            if (fTasks.length > 0) setTasks(fTasks);
            if (fActions.length > 0) setActions(fActions);
        } catch (e) {
            console.warn('Error loading context for activity:', e);
        }
    };

    const handlePickMedia = async () => {
        Haptics.selectionAsync();
        const remaining = 10 - mediaFiles.length;
        if (remaining <= 0) {
            Alert.alert('Limit Reached', 'You can upload up to 10 media items (photos & videos).');
            return;
        }

        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.All,
                quality: 0.8,
                allowsMultipleSelection: true,
                selectionLimit: remaining,
            });

            if (!result.canceled && result.assets) {
                const added: ActivityMediaItem[] = result.assets.slice(0, remaining).map(a => ({
                    uri: a.uri,
                    type: (a.type === 'video' ? 'video' : 'image') as 'image' | 'video',
                    name: a.fileName || (a.type === 'video' ? 'Video' : 'Photo'),
                }));
                setMediaFiles(prev => [...prev, ...added]);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
        } catch (e) {
            console.warn('Media picker error:', e);
        }
    };

    const handlePickDocument = async () => {
        Haptics.selectionAsync();
        const remaining = 5 - fileAttachments.length;
        if (remaining <= 0) {
            Alert.alert('Limit Reached', 'You can attach up to 5 document files.');
            return;
        }

        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                multiple: true,
                copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets) {
                const added: ActivityAttachment[] = result.assets.slice(0, remaining).map(asset => ({
                    id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                    name: asset.name,
                    size: asset.size ? `${(asset.size / (1024 * 1024)).toFixed(1)} MB` : undefined,
                    uri: asset.uri,
                    type: asset.mimeType || 'file',
                }));
                setFileAttachments(prev => [...prev, ...added]);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
        } catch (e) {
            console.warn('Document picker error:', e);
        }
    };

    const buildActivityPayload = (asDraft: boolean): ActivityLog => {
        const isEditing = Boolean(initialActivity);
        const imageUrls = mediaFiles.map(m => m.uri);

        if (activityTypeIndex === 0) {
            return {
                id: initialActivity?.id || `act-log-${Date.now()}`,
                activityType: 'member_update',
                authorName: initialActivity?.authorName || 'Rizky Firmansyah',
                authorRole: initialActivity?.authorRole || 'Project Member',
                timestamp: initialActivity?.timestamp || 'Just now',
                title: title.trim() || (asDraft ? 'Draft Site Update' : 'Site Update'),
                description: description.trim() || (asDraft ? 'Draft update' : 'Daily site progress logged.'),
                images: imageUrls.length > 0 ? imageUrls : undefined,
                media: mediaFiles.length > 0 ? mediaFiles : undefined,
                attachments: fileAttachments.length > 0 ? fileAttachments : undefined,
                likes: initialActivity?.likes || 0,
                hasLiked: initialActivity?.hasLiked || false,
                isEdited: isEditing ? true : initialActivity?.isEdited,
                isDraft: asDraft,
                isCreatedByMe: true,
                comments: initialActivity?.comments || [],
            };
        } else if (activityTypeIndex === 1) {
            const isTask = workTypeIndex === 0;
            const isMilestone = workTypeIndex === 1;
            const workItem = isTask
                ? tasks[selectedWorkItemIndex] || { id: 't-1', title: 'Site Inspection' }
                : isMilestone
                ? milestones[selectedWorkItemIndex] || { id: 'm-1', title: 'Milestone Execution' }
                : actions[selectedWorkItemIndex] || { id: 'a-1', title: 'Approval Action' };

            return {
                id: initialActivity?.id || `act-log-${Date.now()}`,
                activityType: 'work_related',
                authorName: initialActivity?.authorName || 'Rizky Firmansyah',
                authorRole: initialActivity?.authorRole || 'Project Member',
                timestamp: initialActivity?.timestamp || 'Just now',
                title: `Updated ${isTask ? 'Task' : isMilestone ? 'Milestone' : 'Action'}: ${workItem.title}`,
                description: workNote.trim() || (asDraft ? 'Draft work note' : ''),
                images: imageUrls.length > 0 ? imageUrls : undefined,
                media: mediaFiles.length > 0 ? mediaFiles : undefined,
                attachments: fileAttachments.length > 0 ? fileAttachments : undefined,
                workSource: {
                    type: isTask ? 'task' : isMilestone ? 'milestone' : 'action',
                    id: (workItem as any).id || 'item-1',
                    title: workItem.title,
                    status: workStatuses[workStatusIndex],
                },
                likes: initialActivity?.likes || 0,
                hasLiked: initialActivity?.hasLiked || false,
                isEdited: isEditing ? true : initialActivity?.isEdited,
                isDraft: asDraft,
                isCreatedByMe: true,
                comments: initialActivity?.comments || [],
            };
        } else {
            const currentMod = modules[moduleIndex];
            const amt = moduleAmount ? parseFloat(moduleAmount.replace(/[^0-9.]/g, '')) : undefined;

            return {
                id: initialActivity?.id || `act-log-${Date.now()}`,
                activityType: 'module_linked',
                authorName: initialActivity?.authorName || 'Rizky Firmansyah',
                authorRole: initialActivity?.authorRole || 'Module Lead',
                timestamp: initialActivity?.timestamp || 'Just now',
                title: moduleTitle.trim() || `${currentMod.label} Transaction`,
                description: moduleNote.trim() || `Activity linked to ${currentMod.label}.`,
                images: imageUrls.length > 0 ? imageUrls : undefined,
                media: mediaFiles.length > 0 ? mediaFiles : undefined,
                attachments: fileAttachments.length > 0 ? fileAttachments : undefined,
                moduleSource: {
                    target: currentMod.target,
                    documentRef: moduleDocRef.trim() || undefined,
                    amount: isNaN(amt || 0) ? undefined : amt,
                },
                likes: initialActivity?.likes || 0,
                hasLiked: initialActivity?.hasLiked || false,
                isEdited: isEditing ? true : initialActivity?.isEdited,
                isDraft: asDraft,
                isCreatedByMe: true,
                comments: initialActivity?.comments || [],
            };
        }
    };

    const handleSave = async (asDraft = false) => {
        if (!asDraft) {
            if (activityTypeIndex === 0) {
                if (!title.trim() && !description.trim() && mediaFiles.length === 0) {
                    Alert.alert('Missing Information', 'Please provide a title, description, or media for this site update.');
                    return;
                }
            } else if (activityTypeIndex === 1) {
                if (!workNote.trim()) {
                    Alert.alert('Missing Note', 'Please provide progress details or an update note.');
                    return;
                }
            } else if (activityTypeIndex === 2) {
                if (!moduleTitle.trim() && !moduleDocRef.trim() && !moduleNote.trim()) {
                    Alert.alert('Missing Information', 'Please provide a module update title or reference number.');
                    return;
                }
            }
        }

        if (asDraft) {
            setIsSavingDraft(true);
        } else {
            setIsSaving(true);
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        try {
            const newLog = buildActivityPayload(asDraft);

            if (asDraft && onSaveDraft && defaultProjectId) {
                await onSaveDraft(newLog, defaultProjectId);
            } else if (asDraft && defaultProjectId) {
                const proj = await getProjectById(defaultProjectId);
                if (proj) {
                    const existingDrafts: ActivityLog[] = (proj.meta?.draftActivities && Array.isArray(proj.meta.draftActivities)) ? proj.meta.draftActivities : [];
                    const filtered = existingDrafts.filter(d => d.id !== newLog.id);
                    const nextMeta = {
                        ...(proj.meta || {}),
                        draftActivities: [newLog, ...filtered],
                    };
                    await saveProjectMeta(defaultProjectId, nextMeta);
                }
            } else if (onSave && defaultProjectId) {
                // If this was previously a draft, clean it up from draftActivities
                if (initialActivity?.isDraft && defaultProjectId) {
                    const proj = await getProjectById(defaultProjectId);
                    if (proj && proj.meta?.draftActivities) {
                        const remainingDrafts = proj.meta.draftActivities.filter((d: ActivityLog) => d.id !== initialActivity.id);
                        await saveProjectMeta(defaultProjectId, { ...proj.meta, draftActivities: remainingDrafts });
                    }
                }
                await onSave(newLog, defaultProjectId);
            } else if (defaultProjectId) {
                const proj = await getProjectById(defaultProjectId);
                if (proj) {
                    const existingLogs: ActivityLog[] = (proj.meta?.activities && Array.isArray(proj.meta.activities)) ? proj.meta.activities : [];
                    const nextMeta = {
                        ...(proj.meta || {}),
                        activities: [newLog, ...existingLogs],
                    };
                    await saveProjectMeta(defaultProjectId, nextMeta);
                }
            }

            onClose();
        } catch (err) {
            console.error('Failed to save activity:', err);
            Alert.alert('Save Failed', 'Could not save the activity log. Please try again.');
        } finally {
            setIsSaving(false);
            setIsSavingDraft(false);
        }
    };

    return (
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet
                isOpened={isOpened}
                presentationDetents={[0.92]}
                onIsOpenedChange={(opened) => {
                    if (!opened) onClose();
                }}
            >
                <VStack spacing={0} modifiers={[ignoreSafeArea({ edges: 'bottom' }), background(sheetBg)]}>
                    {/* Header */}
                    <HStack alignment="center" modifiers={[padding({ top: 20, leading: 20, trailing: 20, bottom: 10 })]}>
                        <SwiftUIText size={22} weight="bold" color={textColor}>
                            New Activity Log
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
                    <Form modifiers={[background(sheetBg)]}>
                        {/* 1. Log Type Dropdown (Menu Picker) */}
                        <Section title="Activity Type">
                            <Picker
                                label="Type"
                                options={['Member Update', 'Work Item', 'Module Linked']}
                                selectedIndex={activityTypeIndex}
                                onOptionSelected={(e) => {
                                    Haptics.selectionAsync();
                                    setActivityTypeIndex(e.nativeEvent.index);
                                }}
                                variant="menu"
                                color={nativeControlTextColor}
                                modifiers={[tint('#007AFF')]}
                            />
                        </Section>

                        {/* MODE 1: Member Update */}
                        {activityTypeIndex === 0 && (
                            <>
                                <Section title="Update Details">
                                    <TextField
                                        placeholder="Title (optional, e.g. Concrete Pouring Zone B)"
                                        defaultValue={title}
                                        onChangeText={setTitle}
                                        modifiers={[tint('#007AFF')]}
                                    />
                                    <TextField
                                        placeholder="Write detailed site update (up to 500 characters)..."
                                        defaultValue={description}
                                        onChangeText={setDescription}
                                        multiline={true}
                                        modifiers={[tint('#007AFF')]}
                                    />
                                    <HStack alignment="center">
                                        <Spacer />
                                        <SwiftUIText size={11} color={description.length > 480 ? '#FF3B30' : subtextColor}>
                                            {description.length}/500 chars
                                        </SwiftUIText>
                                    </HStack>
                                </Section>

                                {/* Photos & Videos Section (Max 10) */}
                                <Section title={`Media - Photos & Videos (${mediaFiles.length}/10)`}>
                                    <HStack alignment="center">
                                        <SwiftUIText color={subtextColor}>Attach Photos / Videos</SwiftUIText>
                                        <Spacer />
                                        <Button
                                            title="Add Media"
                                            systemImage="photo.stack"
                                            color="#007AFF"
                                            onPress={handlePickMedia}
                                        />
                                    </HStack>
                                    {mediaFiles.length > 0 && (
                                        <HStack alignment="center">
                                            <SwiftUIText color="#34C759" weight="medium">
                                                ✓ {mediaFiles.length} item{mediaFiles.length > 1 ? 's' : ''} attached
                                            </SwiftUIText>
                                            <Spacer />
                                            <Button
                                                title="Clear All"
                                                role="destructive"
                                                color="#FF3B30"
                                                onPress={() => setMediaFiles([])}
                                            />
                                        </HStack>
                                    )}
                                </Section>

                                {/* File Attachments Section (Max 5) */}
                                <Section title={`Attachments - Files (${fileAttachments.length}/5)`}>
                                    <HStack alignment="center">
                                        <SwiftUIText color={subtextColor}>Attach Documents / Files</SwiftUIText>
                                        <Spacer />
                                        <Button
                                            title="Add Files"
                                            systemImage="paperclip"
                                            color="#007AFF"
                                            onPress={handlePickDocument}
                                        />
                                    </HStack>
                                    {fileAttachments.length > 0 && (
                                        <HStack alignment="center">
                                            <SwiftUIText color="#34C759" weight="medium">
                                                ✓ {fileAttachments.length} file{fileAttachments.length > 1 ? 's' : ''} attached
                                            </SwiftUIText>
                                            <Spacer />
                                            <Button
                                                title="Clear All"
                                                role="destructive"
                                                color="#FF3B30"
                                                onPress={() => setFileAttachments([])}
                                            />
                                        </HStack>
                                    )}
                                </Section>
                            </>
                        )}

                        {/* MODE 2: Work Related (Milestone / Task / Action) */}
                        {activityTypeIndex === 1 && (
                            <>
                                <Section title="Target Work Entity">
                                    <Picker
                                        label="Entity Category"
                                        options={['Task', 'Milestone', 'Action']}
                                        selectedIndex={workTypeIndex}
                                        onOptionSelected={(e) => {
                                            Haptics.selectionAsync();
                                            setWorkTypeIndex(e.nativeEvent.index);
                                            setSelectedWorkItemIndex(0);
                                        }}
                                        variant="menu"
                                        color={nativeControlTextColor}
                                        modifiers={[tint('#007AFF')]}
                                    />

                                    <Picker
                                        label="Select Item"
                                        options={
                                            workTypeIndex === 0
                                                ? (tasks.length > 0 ? tasks.map(t => t.title) : ['No Project Tasks'])
                                                : workTypeIndex === 1
                                                ? (milestones.length > 0 ? milestones.map(m => m.title) : ['No Project Milestones'])
                                                : (actions.length > 0 ? actions.map(a => a.title) : ['No Project Actions'])
                                        }
                                        selectedIndex={selectedWorkItemIndex}
                                        onOptionSelected={(e) => setSelectedWorkItemIndex(e.nativeEvent.index)}
                                        variant="menu"
                                        color={nativeControlTextColor}
                                        modifiers={[tint('#007AFF')]}
                                    />
                                </Section>

                                <Section title="Progress & Status Update">
                                    <Picker
                                        label="Work Status"
                                        options={workStatuses.map(s => s)}
                                        selectedIndex={workStatusIndex}
                                        onOptionSelected={(e) => setWorkStatusIndex(e.nativeEvent.index)}
                                        variant="menu"
                                        color={nativeControlTextColor}
                                        modifiers={[tint('#007AFF')]}
                                    />

                                    <TextField
                                        placeholder="Update note or milestone handover progress..."
                                        defaultValue={workNote}
                                        onChangeText={setWorkNote}
                                        multiline={true}
                                        modifiers={[tint('#007AFF')]}
                                    />
                                </Section>

                                {/* Media Attachments for Work Related */}
                                <Section title={`Media (${mediaFiles.length}/10)`}>
                                    <HStack alignment="center">
                                        <SwiftUIText color={subtextColor}>Attach Photos / Videos</SwiftUIText>
                                        <Spacer />
                                        <Button
                                            title="Add Media"
                                            systemImage="photo.stack"
                                            color="#007AFF"
                                            onPress={handlePickMedia}
                                        />
                                    </HStack>
                                    {mediaFiles.length > 0 && (
                                        <HStack alignment="center">
                                            <SwiftUIText color="#34C759" weight="medium">
                                                ✓ {mediaFiles.length} item{mediaFiles.length > 1 ? 's' : ''} attached
                                            </SwiftUIText>
                                            <Spacer />
                                            <Button
                                                title="Clear All"
                                                role="destructive"
                                                color="#FF3B30"
                                                onPress={() => setMediaFiles([])}
                                            />
                                        </HStack>
                                    )}
                                </Section>

                                {/* File Attachments for Work Related */}
                                <Section title={`Attachments - Files (${fileAttachments.length}/5)`}>
                                    <HStack alignment="center">
                                        <SwiftUIText color={subtextColor}>Attach Documents / Files</SwiftUIText>
                                        <Spacer />
                                        <Button
                                            title="Add Files"
                                            systemImage="paperclip"
                                            color="#007AFF"
                                            onPress={handlePickDocument}
                                        />
                                    </HStack>
                                    {fileAttachments.length > 0 && (
                                        <HStack alignment="center">
                                            <SwiftUIText color="#34C759" weight="medium">
                                                ✓ {fileAttachments.length} file{fileAttachments.length > 1 ? 's' : ''} attached
                                            </SwiftUIText>
                                            <Spacer />
                                            <Button
                                                title="Clear All"
                                                role="destructive"
                                                color="#FF3B30"
                                                onPress={() => setFileAttachments([])}
                                            />
                                        </HStack>
                                    )}
                                </Section>
                            </>
                        )}

                        {/* MODE 3: Module Linked */}
                        {activityTypeIndex === 2 && (
                            <>
                                <Section title="Module Selection">
                                    <Picker
                                        label="Target Module"
                                        options={modules.map(m => m.label)}
                                        selectedIndex={moduleIndex}
                                        onOptionSelected={(e) => setModuleIndex(e.nativeEvent.index)}
                                        variant="menu"
                                        color={nativeControlTextColor}
                                        modifiers={[tint('#007AFF')]}
                                    />

                                    <TextField
                                        placeholder={
                                            modules[moduleIndex]?.target === 'finance'
                                                ? 'Document / Ref # (e.g. PR-2026-004, PO #89)'
                                                : modules[moduleIndex]?.target === 'report'
                                                ? 'Report Ref # (e.g. RPT-2026-012)'
                                                : modules[moduleIndex]?.target === 'clock'
                                                ? 'Request Ref # (e.g. ATT-REQ-08)'
                                                : 'Document / Reference (optional)'
                                        }
                                        defaultValue={moduleDocRef}
                                        onChangeText={setModuleDocRef}
                                        modifiers={[tint('#007AFF')]}
                                    />
                                </Section>

                                <Section title={modules[moduleIndex]?.target === 'finance' ? 'Transaction Details' : 'Activity Details'}>
                                    <TextField
                                        placeholder={
                                            modules[moduleIndex]?.target === 'finance'
                                                ? 'Title (e.g. Material Invoice Approved)'
                                                : modules[moduleIndex]?.target === 'report'
                                                ? 'Title (e.g. Daily Site Report Week 38)'
                                                : modules[moduleIndex]?.target === 'clock'
                                                ? 'Title (e.g. Overtime Request Site A)'
                                                : 'Title (e.g. Module Activity Summary)'
                                        }
                                        defaultValue={moduleTitle}
                                        onChangeText={setModuleTitle}
                                        modifiers={[tint('#007AFF')]}
                                    />

                                    {/* Amount input is strictly shown ONLY for Finance module */}
                                    {modules[moduleIndex]?.target === 'finance' && (
                                        <TextField
                                            placeholder="Amount in IDR (optional, e.g. 45000000)"
                                            defaultValue={moduleAmount}
                                            onChangeText={setModuleAmount}
                                            modifiers={[tint('#007AFF')]}
                                        />
                                    )}

                                    <TextField
                                        placeholder="Additional notes or specifications..."
                                        defaultValue={moduleNote}
                                        onChangeText={setModuleNote}
                                        multiline={true}
                                        modifiers={[tint('#007AFF')]}
                                    />
                                </Section>

                                {/* Media Attachments for Module Linked */}
                                <Section title={`Media (${mediaFiles.length}/10)`}>
                                    <HStack alignment="center">
                                        <SwiftUIText color={subtextColor}>Attach Photos / Videos</SwiftUIText>
                                        <Spacer />
                                        <Button
                                            title="Add Media"
                                            systemImage="photo.stack"
                                            color="#007AFF"
                                            onPress={handlePickMedia}
                                        />
                                    </HStack>
                                    {mediaFiles.length > 0 && (
                                        <HStack alignment="center">
                                            <SwiftUIText color="#34C759" weight="medium">
                                                ✓ {mediaFiles.length} item{mediaFiles.length > 1 ? 's' : ''} attached
                                            </SwiftUIText>
                                            <Spacer />
                                            <Button
                                                title="Clear All"
                                                role="destructive"
                                                color="#FF3B30"
                                                onPress={() => setMediaFiles([])}
                                            />
                                        </HStack>
                                    )}
                                </Section>

                                {/* File Attachments for Module Linked */}
                                <Section title={`Attachments - Files (${fileAttachments.length}/5)`}>
                                    <HStack alignment="center">
                                        <SwiftUIText color={subtextColor}>Attach Documents / Files</SwiftUIText>
                                        <Spacer />
                                        <Button
                                            title="Add Files"
                                            systemImage="paperclip"
                                            color="#007AFF"
                                            onPress={handlePickDocument}
                                        />
                                    </HStack>
                                    {fileAttachments.length > 0 && (
                                        <HStack alignment="center">
                                            <SwiftUIText color="#34C759" weight="medium">
                                                ✓ {fileAttachments.length} file{fileAttachments.length > 1 ? 's' : ''} attached
                                            </SwiftUIText>
                                            <Spacer />
                                            <Button
                                                title="Clear All"
                                                role="destructive"
                                                color="#FF3B30"
                                                onPress={() => setFileAttachments([])}
                                            />
                                        </HStack>
                                    )}
                                </Section>
                            </>
                        )}
                    </Form>

                    {/* Bottom Action Row: Save as Draft (Left) & Post Activity (Right) */}
                    <HStack alignment="center" spacing={12} modifiers={[
                        padding({ top: 12, leading: 20, trailing: 20, bottom: 24 }),
                        background(sheetBg)
                    ]}>
                        {/* Left: Save as Draft */}
                        <Button
                            variant="glass"
                            color={isDark ? '#FFFFFF' : '#1C1C1E'}
                            onPress={() => handleSave(true)}
                            disabled={isSaving || isSavingDraft}
                            modifiers={[cornerRadius(999)]}
                        >
                            <HStack alignment="center" spacing={6} modifiers={[frame({ height: 46 }), padding({ horizontal: 18 })]}>
                                {isSavingDraft ? (
                                    <ActivityIndicator size="small" color={isDark ? '#FFFFFF' : '#000000'} />
                                ) : (
                                    <SwiftUIText weight="semibold" size={15} color={isDark ? '#FFFFFF' : '#1C1C1E'}>
                                        Save Draft
                                    </SwiftUIText>
                                )}
                            </HStack>
                        </Button>

                        {/* Right: Post Activity Log (Forma Blue #0036F8) */}
                        <Button
                            variant="glassProminent"
                            color="#0036F8"
                            onPress={() => handleSave(false)}
                            disabled={isSaving || isSavingDraft}
                            modifiers={[frame({ maxWidth: Infinity }), cornerRadius(999)]}
                        >
                            <HStack alignment="center" spacing={6} modifiers={[frame({ maxWidth: Infinity, height: 46 })]}>
                                <Spacer />
                                {isSaving ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <SwiftUIText weight="bold" size={16} color="#FFFFFF">
                                        Post Activity Log
                                    </SwiftUIText>
                                )}
                                <Spacer />
                            </HStack>
                        </Button>
                    </HStack>
                </VStack>
            </BottomSheet>
        </Host>
    );
};
