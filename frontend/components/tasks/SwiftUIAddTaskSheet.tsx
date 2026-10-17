import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    ScrollView,
    Platform,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useTheme } from '@/context/ThemeContext';
import { useUserContext } from '@/context/UserProvider';
import { useTenantContext } from '@/context/TenantContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassView } from '@/components/ui/GlassView';
import { PillButton } from '@/components/ui/PillButton';
import { HeaderCircleButton } from '@/components/ui/HeaderCircleButton';
import { FormaBlue } from '@/constants/theme';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import ContextMenu, { ContextMenuAction } from '@/components/ui/PlatformContextMenu';
import { WBSPicker } from '@/components/ui/WBSPicker';
import { LiquidDatePicker } from '@/components/ui/LiquidDatePicker';
import { MultiSearchablePicker } from '@/components/ui/MultiSearchablePicker';
import { Task, TaskAttachment, Project } from '@/constants/MockData';
import { getProjects } from '@/lib/api/projects';
import { getProfiles, createTaskApi, uploadTaskAttachment, isWbsSupported, getDepartments } from '@/lib/api/tasks';

export interface SwiftUIAddTaskSheetProps {
    isOpened: boolean;
    onClose: () => void;
    onSave: (task: Task) => void;
    defaultProjectId?: string;
    isEmbedded?: boolean;
}

export const SwiftUIAddTaskSheet: React.FC<SwiftUIAddTaskSheetProps> = ({
    isOpened,
    onClose,
    onSave,
    defaultProjectId,
    isEmbedded = false,
}) => {
    const { isAuthenticated } = useUserContext();
    const { activeWorkspace, activeTenant } = useTenantContext();
    const wbsSupported = isWbsSupported(activeTenant);
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const insets = useSafeAreaInsets();
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';
    const placeholderColor = isDark ? '#8E8E93' : '#8E8E93';
    const fieldBg = isDark ? 'rgba(255, 255, 255, 0.06)' : '#FFFFFF';
    const fieldBorderColor = isDark ? 'rgba(255, 255, 255, 0.15)' : 'transparent';
    const fieldBorderWidth = isDark ? 1 : 0;
    const formaColor = FormaBlue[400];
    const formaTintBg = isDark ? 'rgba(10, 132, 255, 0.15)' : 'rgba(10, 132, 255, 0.1)';
    const formaTintBorder = isDark ? 'rgba(10, 132, 255, 0.3)' : 'rgba(10, 132, 255, 0.25)';

    const isAdidayaTenant = !!activeTenant && (
        (activeTenant.name || '').toLowerCase().includes('adidaya') ||
        (activeTenant.slug || '').toLowerCase().includes('adidaya') ||
        (activeTenant.company_code || '').toLowerCase().includes('adidaya') ||
        (activeTenant.branding_name || '').toLowerCase().includes('adidaya')
    );

    // Data lists from Supabase
    const [projects, setProjects] = useState<Project[]>([]);
    const [departments, setDepartments] = useState<Array<{ id: string; name: string; code: string }>>([]);
    const [profiles, setProfiles] = useState<Array<{ id: string; name: string; avatar?: string; departmentId?: string; department?: string }>>([]);
    const [selectedTargetType, setSelectedTargetType] = useState<'project' | 'department'>('project');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Form fields
    const [newTask, setNewTask] = useState<Partial<Task>>({
        title: '',
        status: 'todo',
        priority: 'medium',
        dueDate: '',
        description: '',
        assignees: [],
        subtasks: [],
    });
    
    const [projectId, setProjectId] = useState('');
    const [wbsId, setWbsId] = useState('');
    const [taskTime, setTaskTime] = useState('14:00');
    const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
    const [linkInput, setLinkInput] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    // Pickers visibility
    const [isAssigneePickerVisible, setIsAssigneePickerVisible] = useState(false);
    const [isWBSPickerVisible, setIsWBSPickerVisible] = useState(false);
    const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);

    // Pulldown actions for Project & Department
    const projectDeptActions = useMemo<ContextMenuAction[]>(() => {
        const projActions: ContextMenuAction[] = projects.map(p => ({
            title: p.title,
            subtitle: p.code || 'PRJ',
            systemIcon: 'folder',
            selected: projectId === p.id,
            state: projectId === p.id ? 'on' : 'off',
        }));

        const deptActions: ContextMenuAction[] = departments.map(d => ({
            title: d.name,
            subtitle: d.code || 'DEPT',
            systemIcon: 'building.2',
            selected: projectId === d.id,
            state: projectId === d.id ? 'on' : 'off',
        }));

        const list: ContextMenuAction[] = [];
        if (projActions.length > 0) {
            list.push({
                title: 'Projects',
                inlineChildren: true,
                actions: projActions,
            });
        }
        if (deptActions.length > 0) {
            list.push({
                title: 'Departments',
                inlineChildren: true,
                actions: deptActions,
            });
        }
        return list;
    }, [projects, departments, projectId]);

    const handleSelectProjectOrDept = useCallback((title: string) => {
        const foundProject = projects.find(p => p.title === title);
        if (foundProject) {
            setSelectedTargetType('project');
            setProjectId(foundProject.id);
            setNewTask(prev => ({ ...prev, project: foundProject.title, projectCode: foundProject.code || 'PRJ' }));
            setWbsId('');
            setNewTask(prev => ({ ...prev, wbs: undefined }));
            return;
        }

        const foundDept = departments.find(d => d.name === title);
        if (foundDept) {
            setSelectedTargetType('department');
            setProjectId(foundDept.id);
            setNewTask(prev => ({ ...prev, project: foundDept.name, projectCode: foundDept.code || 'DEPT' }));
            setWbsId('');
            setNewTask(prev => ({ ...prev, wbs: undefined }));
            return;
        }
    }, [projects, departments]);

    // Filter assignees: all users for project, filtered by department when a department is selected
    const assigneeOptions = useMemo(() => {
        if (selectedTargetType !== 'department') {
            return profiles;
        }

        const activeDept = departments.find(d => d.id === projectId || d.name === newTask.project);
        const targetDeptId = (activeDept?.id || projectId || '').toLowerCase().trim();
        const targetDeptName = (activeDept?.name || newTask.project || '').toLowerCase().trim();

        return profiles.filter(p => {
            const pDeptId = (p.departmentId || '').toLowerCase().trim();
            const pDeptName = (p.department || '').toLowerCase().trim();

            if (targetDeptId && pDeptId && targetDeptId === pDeptId) return true;
            if (targetDeptName && pDeptName && (
                pDeptName === targetDeptName ||
                pDeptName.includes(targetDeptName) ||
                targetDeptName.includes(pDeptName)
            )) return true;

            return false;
        });
    }, [profiles, selectedTargetType, projectId, newTask.project, departments]);

    // Load data from Supabase
    useEffect(() => {
        if (isOpened && isAuthenticated) {
            const currentTenantId = activeTenant?.id;
            setIsLoading(true);
            Promise.all([
                getProjects(activeWorkspace?.id),
                getDepartments(),
                getProfiles(currentTenantId)
            ]).then(([projs, depts, profs]) => {
                setProjects(projs);
                setDepartments(depts);
                setProfiles(profs);
                if (defaultProjectId && projs.length > 0) {
                    const match = projs.find(p => p.id === defaultProjectId);
                    if (match) {
                        setSelectedTargetType('project');
                        setProjectId(match.id);
                        setNewTask(prev => ({
                            ...prev,
                            project: match.title,
                            projectCode: match.code
                        }));
                    }
                }
                setIsLoading(false);
            }).catch(err => {
                console.error('Failed to load add task setup data:', err);
                setIsLoading(false);
            });

            // Reset form
            setNewTask({
                title: '',
                status: 'todo',
                priority: 'medium',
                dueDate: '',
                description: '',
                assignees: [],
                subtasks: [],
            });
            setWbsId('');
            setTaskTime('14:00');
            setAttachments([]);
            setLinkInput('');
        }
    }, [isOpened, isAuthenticated, activeTenant?.id, activeWorkspace?.id]);

    const filteredProfiles = useMemo(() => {
        if (!projectId || projectId === 'ALL_PROJECTS' || projectId === 'ALL_DEPTS') {
            return profiles;
        }

        // Check if Department
        const matchedDept = departments.find(d => d.id === projectId);
        if (matchedDept || projectId.startsWith('dept-')) {
            const deptId = (matchedDept?.id || projectId).toLowerCase();
            const deptName = (matchedDept?.name || '').toLowerCase();
            const deptCode = (matchedDept?.code || '').toLowerCase();
            const deptFiltered = profiles.filter((p: any) => {
                const pDeptId = (p.departmentId || '').toLowerCase();
                const pDeptName = (p.department || '').toLowerCase();
                return (
                    (pDeptId && (pDeptId === deptId || pDeptId.replace('dept-', '') === deptId.replace('dept-', ''))) ||
                    (pDeptName && (pDeptName === deptName || pDeptName === deptCode || deptName.includes(pDeptName) || pDeptName.includes(deptName)))
                );
            });
            return deptFiltered.length > 0 ? deptFiltered : profiles;
        }

        // Check if Project
        const matchedProj = projects.find(p => p.id === projectId);
        if (matchedProj) {
            const projMembers = (matchedProj as any)?.meta?.members;
            if (Array.isArray(projMembers) && projMembers.length > 0) {
                const memberIds = new Set(projMembers.map((m: any) => m.id || m.userId));
                const projFiltered = profiles.filter(p => memberIds.has(p.id));
                if (projFiltered.length > 0) return projFiltered;
            }
        }

        return profiles;
    }, [projectId, profiles, departments, projects]);

    const addSubtask = () => {
        setNewTask(prev => ({
            ...prev,
            subtasks: [...(prev.subtasks || []), { id: `sub-${Date.now()}`, title: '', isDone: false }]
        }));
    };

    const removeSubtask = (index: number) => {
        setNewTask(prev => ({
            ...prev,
            subtasks: prev.subtasks?.filter((_, i) => i !== index)
        }));
    };

    const moveSubtask = (index: number, direction: 'up' | 'down') => {
        setNewTask(prev => {
            const list = [...(prev.subtasks || [])];
            const targetIndex = direction === 'up' ? index - 1 : index + 1;
            if (targetIndex < 0 || targetIndex >= list.length) return prev;
            const temp = list[index];
            list[index] = list[targetIndex];
            list[targetIndex] = temp;
            return { ...prev, subtasks: list };
        });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const updateSubtaskTitle = (index: number, title: string) => {
        setNewTask(prev => ({
            ...prev,
            subtasks: prev.subtasks?.map((sub, i) => i === index ? { ...sub, title } : sub)
        }));
    };

    // Attachments Handling
    const handlePickFile = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                copyToCacheDirectory: true
            });
            
            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                setIsUploading(true);
                
                let base64 = '';
                if (Platform.OS === 'web') {
                    if (asset.file) {
                        base64 = await new Promise<string>((resolve, reject) => {
                            const reader = new FileReader();
                            reader.onload = () => {
                                const res = reader.result as string;
                                resolve(res.split(',')[1] || '');
                            };
                            reader.onerror = reject;
                            reader.readAsDataURL(asset.file as any);
                        });
                    } else if (asset.uri) {
                        const response = await fetch(asset.uri);
                        const blob = await response.blob();
                        base64 = await new Promise<string>((resolve, reject) => {
                            const reader = new FileReader();
                            reader.onload = () => {
                                const res = reader.result as string;
                                resolve(res.split(',')[1] || '');
                            };
                            reader.onerror = reject;
                            reader.readAsDataURL(blob);
                        });
                    }
                } else {
                    base64 = await FileSystem.readAsStringAsync(asset.uri, {
                        encoding: FileSystem.EncodingType.Base64
                    });
                }
                
                const ext = asset.name.split('.').pop() || 'dat';
                const mimeType = asset.mimeType || 'application/octet-stream';
                
                const uploadedPath = await uploadTaskAttachment(base64, ext, mimeType);
                
                setAttachments(prev => [
                    ...prev,
                    {
                        id: `att-${Date.now()}`,
                        uri: uploadedPath || asset.uri,
                        name: asset.name,
                        type: (mimeType.startsWith('image/') ? 'image' : 'file') as any
                    }
                ]);
                setIsUploading(false);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
        } catch (err) {
            console.error('File upload error:', err);
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
                
                let base64 = '';
                if (Platform.OS === 'web') {
                    const response = await fetch(asset.uri);
                    const blob = await response.blob();
                    base64 = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => {
                            const res = reader.result as string;
                            resolve(res.split(',')[1] || '');
                        };
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    });
                } else {
                    base64 = await FileSystem.readAsStringAsync(asset.uri, {
                        encoding: FileSystem.EncodingType.Base64
                    });
                }
                
                const ext = asset.uri.split('.').pop() || 'jpg';
                const mimeType = asset.mimeType || 'image/jpeg';
                
                const uploadedPath = await uploadTaskAttachment(base64, ext, mimeType);
                const fileName = asset.fileName || `photo-${Date.now()}.${ext}`;
                
                setAttachments(prev => [
                    ...prev,
                    {
                        id: `att-${Date.now()}`,
                        uri: uploadedPath || asset.uri,
                        name: fileName,
                        type: 'image'
                    }
                ]);
                setIsUploading(false);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
        } catch (err) {
            console.error('Image upload error:', err);
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

    // Save task to Supabase
    const showError = (title: string, msg: string) => {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
            window.alert(`${title}\n\n${msg}`);
        } else {
            Alert.alert(title, msg);
        }
    };

    const saveTask = async () => {
        if (!newTask.title?.trim()) {
            showError('Task title required', 'Please enter a task title');
            return;
        }

        setIsSaving(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            const assigneeIds = newTask.assignees ? newTask.assignees.map(a => a.id) : [];
            const isDept = selectedTargetType === 'department' || (projectId && projectId.startsWith('dept-'));
            const resolvedProjectId = (!isDept && projectId && !projectId.startsWith('dept-')) ? projectId : undefined;
            const resolvedDeptId = isDept ? projectId : undefined;
            const todayStr = new Date().toISOString().split('T')[0];
            
            const payload: any = {
                title: newTask.title.trim(),
                projectId: resolvedProjectId,
                project: newTask.project,
                projectCode: newTask.projectCode,
                departmentId: resolvedDeptId,
                department: isDept ? newTask.project : undefined,
                departmentCode: isDept ? newTask.projectCode : undefined,
                wbsId: wbsId || undefined,
                wbsCode: newTask.wbs || undefined,
                dueDate: newTask.dueDate || todayStr,
                dueTime: taskTime || undefined,
                status: newTask.status || 'todo',
                priority: newTask.priority || 'medium',
                description: newTask.description?.trim() || undefined,
                taskType: newTask.taskType || 'generic',
                linkedModule: newTask.linkedModule || undefined,
                subtasks: newTask.subtasks || [],
                attachments: attachments,
                assignees: newTask.assignees || [],
                tenantId: activeTenant?.id,
                workspaceId: activeWorkspace?.id,
            };

            const createdTask = await Promise.race([
                createTaskApi(payload, assigneeIds),
                new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Request timed out (20s). Check connection / login session.')), 20000)),
            ]);
            
            if (createdTask) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                onSave(createdTask);
            } else {
                showError('Error', 'Failed to save task to server.');
            }
        } catch (err: any) {
            console.error('Error saving task:', err);
            showError('Failed to create task', err?.message || 'An unexpected error occurred while saving.');
        } finally {
            setIsSaving(false);
        }
    };

    const renderInnerContent = () => (
        <View style={isEmbedded ? [styles.embeddedContainer, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }] : [styles.modalContent, { height: '92%', backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
            <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: isEmbedded ? 20 : 20, paddingBottom: Platform.OS === 'ios' ? 22 : 24 }}>
                {/* Header */}
                <View style={[styles.modalHeader, isEmbedded && { paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                    <Text style={[styles.modalTitle, { color: textColor }]}>Add New Task</Text>
                    <HeaderCircleButton
                        type="close"
                        onPress={onClose}
                        isDark={isDark}
                        size={32}
                    />
                </View>

                        {isLoading ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color="#007AFF" />
                                <Text style={{ color: subtextColor, marginTop: 8, fontWeight: '500' }}>Fetching setup options...</Text>
                            </View>
                        ) : (
                            <ScrollView
                                style={{ flex: 1 }}
                                showsVerticalScrollIndicator={false}
                                keyboardShouldPersistTaps="handled"
                                contentContainerStyle={{ paddingBottom: 80, paddingTop: 0 }}
                            >
                                <View style={{ gap: 20, paddingTop: 12 }}>
                                    {/* Title */}
                                    <View style={styles.inputGroup}>
                                        <Text style={[styles.inputLabel, { color: subtextColor }]}>Task Title</Text>
                                        <TextInput
                                            style={[styles.textInput, {
                                                color: textColor,
                                                backgroundColor: fieldBg,
                                                borderColor: fieldBorderColor,
                                                borderWidth: fieldBorderWidth,
                                            }]}
                                            placeholder="What needs to be done?"
                                            placeholderTextColor={placeholderColor}
                                            value={newTask.title}
                                            onChangeText={(text) => setNewTask(prev => ({ ...prev, title: text }))}
                                        />
                                    </View>

                                    {/* Project / Department */}
                                    <View style={styles.inputGroup}>
                                        <Text style={[styles.inputLabel, { color: subtextColor }]}>Project / Department</Text>
                                        <ContextMenu
                                            dropdownMenuMode={true}
                                            actions={projectDeptActions}
                                            onPress={(e) => {
                                                const actionTitle = e.nativeEvent.name;
                                                if (actionTitle) {
                                                    Haptics.selectionAsync();
                                                    handleSelectProjectOrDept(actionTitle);
                                                }
                                            }}
                                        >
                                            <View
                                                style={[styles.textInput, {
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    backgroundColor: fieldBg,
                                                    borderColor: fieldBorderColor,
                                                    borderWidth: fieldBorderWidth,
                                                    cursor: Platform.OS === 'web' ? 'pointer' : undefined,
                                                } as any]}
                                            >
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                                                    <View style={[styles.projectBadge, { backgroundColor: '#007AFF', marginRight: 0 }]}>
                                                        <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>
                                                            {newTask.projectCode || 'GEN'}
                                                        </Text>
                                                    </View>
                                                    <Text style={{ color: newTask.project ? textColor : placeholderColor, fontSize: 15, fontWeight: newTask.project ? '500' : '400' }} numberOfLines={1}>
                                                        {newTask.project || 'Select Project or Department'}
                                                    </Text>
                                                </View>
                                                <Ionicons name="chevron-down" size={16} color={subtextColor} />
                                            </View>
                                        </ContextMenu>
                                    </View>

                                    {/* WBS */}
                                    {wbsSupported && (
                                        <View style={styles.inputGroup}>
                                            <Text style={[styles.inputLabel, { color: subtextColor }]}>WBS (Work Breakdown Structure)</Text>
                                            <TouchableOpacity
                                                onPress={() => {
                                                    if (!projectId) {
                                                        Alert.alert('Selection Required', 'Please choose a project first to load its WBS.');
                                                    } else {
                                                        setIsWBSPickerVisible(true);
                                                    }
                                                }}
                                                style={[styles.textInput, {
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    backgroundColor: fieldBg,
                                                    borderColor: fieldBorderColor,
                                                    borderWidth: fieldBorderWidth,
                                                }]}
                                            >
                                                <Text style={{ color: newTask.wbs ? textColor : placeholderColor, fontSize: 15, fontWeight: newTask.wbs ? '500' : '400' }}>
                                                    {newTask.wbs || "Select WBS Code"}
                                                </Text>
                                                <Ionicons name="layers-outline" size={18} color={subtextColor} />
                                            </TouchableOpacity>
                                        </View>
                                    )}

                                    {/* Priority */}
                                    <View style={styles.inputGroup}>
                                        <Text style={[styles.inputLabel, { color: subtextColor }]}>Priority</Text>
                                        <SegmentedControl
                                            fullWidth={true}
                                            style={{
                                                width: '100%',
                                                backgroundColor: fieldBg,
                                                borderColor: fieldBorderColor,
                                                borderWidth: fieldBorderWidth,
                                            }}
                                            segments={[
                                                { id: 'urgent', label: 'Urgent', icon: 'flame' },
                                                { id: 'high', label: 'High', icon: 'arrow.up' },
                                                { id: 'medium', label: 'Med', icon: 'equal' },
                                                { id: 'low', label: 'Low', icon: 'arrow.down' },
                                            ]}
                                            activeSegment={newTask.priority || 'medium'}
                                            onSegmentChange={(val) => setNewTask(prev => ({ ...prev, priority: val as any }))}
                                        />
                                    </View>

                                    {/* Deadline */}
                                    <View style={styles.inputGroup}>
                                        <Text style={[styles.inputLabel, { color: subtextColor }]}>Deadline</Text>
                                        <TouchableOpacity
                                            onPress={() => setIsDatePickerVisible(true)}
                                            style={[styles.textInput, {
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                backgroundColor: fieldBg,
                                                borderColor: fieldBorderColor,
                                                borderWidth: fieldBorderWidth,
                                            }]}
                                        >
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                <Ionicons name="calendar-outline" size={18} color={subtextColor} />
                                                <Text style={{ color: newTask.dueDate ? textColor : placeholderColor, fontSize: 15, fontWeight: newTask.dueDate ? '500' : '400' }}>
                                                    {newTask.dueDate ? `${newTask.dueDate}${taskTime ? ` at ${taskTime}` : ''}` : "Select Deadline"}
                                                </Text>
                                            </View>
                                            <Ionicons name="chevron-forward" size={18} color={subtextColor} />
                                        </TouchableOpacity>
                                    </View>

                                    {/* Assignees */}
                                    <View style={styles.inputGroup}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                            <Text style={[styles.inputLabel, { color: subtextColor, marginBottom: 0 }]}>Assignees</Text>
                                            <TouchableOpacity 
                                                onPress={() => setIsAssigneePickerVisible(true)} 
                                                style={{ 
                                                    flexDirection: 'row', 
                                                    alignItems: 'center', 
                                                    gap: 4, 
                                                    paddingHorizontal: 12, 
                                                    paddingVertical: 6, 
                                                    borderRadius: 9999, 
                                                    backgroundColor: formaColor 
                                                }}
                                            >
                                                <Ionicons name="person-add" size={15} color="#FFFFFF" />
                                                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600' }}>Assign Users</Text>
                                            </TouchableOpacity>
                                        </View>
                                        {newTask.assignees && newTask.assignees.length > 0 && (
                                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                                {newTask.assignees.map(member => (
                                                    <TouchableOpacity
                                                        key={member.id}
                                                        onPress={() => {
                                                            setNewTask(prev => ({
                                                                ...prev,
                                                                assignees: prev.assignees?.filter(a => a.id !== member.id)
                                                            }));
                                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                        }}
                                                        style={[
                                                            styles.avatarChip,
                                                            {
                                                                backgroundColor: '#007AFF',
                                                                borderColor: 'transparent'
                                                            }
                                                        ]}
                                                    >
                                                        <View style={[styles.miniAvatar, { backgroundColor: '#FFFFFF', borderColor: 'transparent', width: 20, height: 20 }]}>
                                                            <Text style={[styles.miniAvatarText, { color: '#007AFF', fontSize: 7 }]}>
                                                                {((member.name || 'Staff').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase())}
                                                            </Text>
                                                        </View>
                                                        <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600' }}>{member.name}</Text>
                                                        <Ionicons name="close-circle" size={15} color="rgba(255,255,255,0.85)" />
                                                    </TouchableOpacity>
                                                ))}
                                            </View>
                                        )}
                                    </View>

                                    {/* Subtasks */}
                                    <View style={styles.inputGroup}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                            <Text style={[styles.inputLabel, { color: subtextColor, marginBottom: 0 }]}>Subtasks (Optional)</Text>
                                            <TouchableOpacity 
                                                onPress={addSubtask} 
                                                style={{ 
                                                    flexDirection: 'row', 
                                                    alignItems: 'center', 
                                                    gap: 4, 
                                                    paddingHorizontal: 12, 
                                                    paddingVertical: 6, 
                                                    borderRadius: 9999, 
                                                    backgroundColor: formaColor 
                                                }}
                                            >
                                                <Ionicons name="add" size={16} color="#FFFFFF" />
                                                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600' }}>Add Subtask</Text>
                                            </TouchableOpacity>
                                        </View>
                                        <View style={{ gap: 8 }}>
                                            {newTask.subtasks?.map((sub, idx) => (
                                                <View key={idx} style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                                                    <TextInput
                                                        style={[styles.textInput, { flex: 1, fontSize: 14, color: textColor, backgroundColor: fieldBg, borderColor: fieldBorderColor, borderWidth: fieldBorderWidth }]}
                                                        placeholder="Subtask title"
                                                        placeholderTextColor={placeholderColor}
                                                        value={sub.title}
                                                        onChangeText={(text) => updateSubtaskTitle(idx, text)}
                                                    />
                                                    {/* Move Up */}
                                                    <TouchableOpacity
                                                        disabled={idx === 0}
                                                        onPress={() => moveSubtask(idx, 'up')}
                                                        style={{
                                                            width: 36,
                                                            height: 36,
                                                            borderRadius: 18,
                                                            backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            opacity: idx === 0 ? 0.3 : 1
                                                        }}
                                                    >
                                                        <Ionicons name="chevron-up" size={18} color={textColor} />
                                                    </TouchableOpacity>
                                                    {/* Move Down */}
                                                    <TouchableOpacity
                                                        disabled={idx === (newTask.subtasks?.length || 1) - 1}
                                                        onPress={() => moveSubtask(idx, 'down')}
                                                        style={{
                                                            width: 36,
                                                            height: 36,
                                                            borderRadius: 18,
                                                            backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            opacity: idx === (newTask.subtasks?.length || 1) - 1 ? 0.3 : 1
                                                        }}
                                                    >
                                                        <Ionicons name="chevron-down" size={18} color={textColor} />
                                                    </TouchableOpacity>
                                                    {/* Delete */}
                                                    <TouchableOpacity
                                                        onPress={() => removeSubtask(idx)}
                                                        style={{
                                                            width: 36,
                                                            height: 36,
                                                            borderRadius: 18,
                                                            backgroundColor: isDark ? 'rgba(255,59,48,0.15)' : 'rgba(255,59,48,0.08)',
                                                            alignItems: 'center',
                                                            justifyContent: 'center'
                                                        }}
                                                    >
                                                        <Ionicons name="trash-outline" size={17} color="#FF3B30" />
                                                    </TouchableOpacity>
                                                </View>
                                            ))}
                                        </View>
                                    </View>

                                    {/* Linked Module */}
                                    <View style={styles.inputGroup}>
                                        <Text style={[styles.inputLabel, { color: subtextColor, marginBottom: 10 }]}>Link to Module (Optional)</Text>
                                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                            {[
                                                { id: 'finance', label: 'Finance', icon: 'card-outline' },
                                                { id: 'resources', label: 'Resources', icon: 'cube-outline' },
                                                { id: 'people', label: 'People', icon: 'people-outline' },
                                                { id: 'clock', label: 'Clock', icon: 'time-outline' },
                                                { id: 'report', label: 'Report', icon: 'document-text-outline' },
                                                ...(isAdidayaTenant ? [{ id: 'crew', label: 'Crew', icon: 'construct-outline' }] : [])
                                            ].map(module => {
                                                const isSelected = newTask.taskType === 'linked_module' && newTask.linkedModule?.target === module.id;
                                                return (
                                                    <TouchableOpacity
                                                        key={module.id}
                                                        onPress={() => {
                                                             if (isSelected) {
                                                                setNewTask(prev => ({ ...prev, taskType: 'generic', linkedModule: undefined }));
                                                            } else {
                                                                setNewTask(prev => ({
                                                                    ...prev,
                                                                    taskType: 'linked_module',
                                                                    linkedModule: {
                                                                        target: module.id as any,
                                                                        actionLabel: `Go To ${module.label}`,
                                                                        route: `/${module.id}`
                                                                    }
                                                                }));
                                                            }
                                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                        }}
                                                        style={[
                                                            styles.modulePill,
                                                            {
                                                                backgroundColor: isSelected ? '#007AFF' : fieldBg,
                                                                borderColor: isSelected ? '#007AFF' : fieldBorderColor,
                                                                borderWidth: isSelected ? 1 : fieldBorderWidth,
                                                            }
                                                        ]}
                                                    >
                                                        <Ionicons name={module.icon as any} size={16} color={isSelected ? '#FFFFFF' : textColor} />
                                                        <Text style={[styles.modulePillLabel, { color: isSelected ? '#FFFFFF' : textColor }]}>{module.label}</Text>
                                                        {isSelected && (
                                                            <Ionicons name="checkmark" size={14} color="#FFFFFF" style={{ marginLeft: 2 }} />
                                                        )}
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                    </View>

                                    {/* Attachments Section */}
                                    <View style={styles.inputGroup}>
                                        <Text style={[styles.inputLabel, { color: subtextColor, marginBottom: 8 }]}>Attachments (Links / Files)</Text>
                                        
                                        {/* List existing attachments */}
                                        <View style={{ gap: 8, marginBottom: 12 }}>
                                            {attachments.map(att => {
                                                const isLink = att.uri.startsWith('http');
                                                return (
                                                    <View key={att.id} style={[styles.attachmentRow, { backgroundColor: fieldBg, borderColor: fieldBorderColor, borderWidth: fieldBorderWidth }]}>
                                                        <Ionicons name={isLink ? "link" : (att.type === 'image' ? "image-outline" : "document-text-outline")} size={18} color={textColor} />
                                                        <Text style={{ color: textColor, flex: 1, fontSize: 14 }} numberOfLines={1}>
                                                            {att.name}
                                                        </Text>
                                                        <TouchableOpacity 
                                                            onPress={() => handleRemoveAttachment(att.id)} 
                                                            style={{
                                                                width: 32,
                                                                height: 32,
                                                                borderRadius: 16,
                                                                backgroundColor: isDark ? 'rgba(255,59,48,0.15)' : 'rgba(255,59,48,0.08)',
                                                                alignItems: 'center',
                                                                justifyContent: 'center'
                                                            }}
                                                        >
                                                            <Ionicons name="trash-outline" size={16} color="#FF3B30" />
                                                        </TouchableOpacity>
                                                    </View>
                                                );
                                            })}
                                        </View>

                                        {/* Input fields to add Link or pick File */}
                                        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                                            <TextInput
                                                style={[styles.textInput, { flex: 1, fontSize: 14, color: textColor, backgroundColor: fieldBg, borderColor: fieldBorderColor, borderWidth: fieldBorderWidth }]}
                                                placeholder="Add web link..."
                                                placeholderTextColor={placeholderColor}
                                                value={linkInput}
                                                onChangeText={setLinkInput}
                                            />
                                            <TouchableOpacity 
                                                onPress={handleAddLink}
                                                style={[
                                                    styles.addLinkButton, 
                                                    { 
                                                        flexDirection: 'row',
                                                        alignItems: 'center',
                                                        gap: 4,
                                                        backgroundColor: linkInput.trim() ? formaColor : formaTintBg, 
                                                        borderColor: linkInput.trim() ? formaColor : formaTintBorder, 
                                                        borderWidth: 1,
                                                        paddingHorizontal: 16,
                                                    }
                                                ]}
                                                disabled={!linkInput.trim()}
                                            >
                                                <Ionicons name="add" size={16} color={linkInput.trim() ? '#FFFFFF' : formaColor} />
                                                <Text style={{ color: linkInput.trim() ? '#FFFFFF' : formaColor, fontWeight: '700', fontSize: 13.5 }}>Add Link</Text>
                                            </TouchableOpacity>
                                        </View>

                                        <View style={{ flexDirection: 'row', gap: 10 }}>
                                            <TouchableOpacity 
                                                onPress={handlePickImage} 
                                                style={[
                                                    styles.mediaButton, 
                                                    { 
                                                        backgroundColor: formaTintBg, 
                                                        borderColor: formaTintBorder, 
                                                        borderWidth: 1 
                                                    }
                                                ]}
                                                disabled={isUploading}
                                            >
                                                <Ionicons name="image-outline" size={17} color={formaColor} />
                                                <Text style={{ color: formaColor, fontSize: 13, fontWeight: '600' }}>Pick Photo</Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity 
                                                onPress={handlePickFile} 
                                                style={[
                                                    styles.mediaButton, 
                                                    { 
                                                        backgroundColor: formaTintBg, 
                                                        borderColor: formaTintBorder, 
                                                        borderWidth: 1 
                                                    }
                                                ]}
                                                disabled={isUploading}
                                            >
                                                <Ionicons name="document-attach-outline" size={17} color={formaColor} />
                                                <Text style={{ color: formaColor, fontSize: 13, fontWeight: '600' }}>Upload File</Text>
                                            </TouchableOpacity>
                                        </View>

                                        {isUploading && (
                                             <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
                                                <ActivityIndicator size="small" color="#007AFF" />
                                                <Text style={{ color: subtextColor, fontSize: 12, fontWeight: '500' }}>Uploading attachment...</Text>
                                            </View>
                                        )}
                                    </View>

                                    {/* Description */}
                                    <View style={styles.inputGroup}>
                                        <Text style={[styles.inputLabel, { color: subtextColor }]}>Description</Text>
                                        <TextInput
                                            style={[styles.textArea, { color: textColor, backgroundColor: fieldBg, borderColor: fieldBorderColor, borderWidth: fieldBorderWidth }]}
                                            placeholder="Additional notes..."
                                            placeholderTextColor={placeholderColor}
                                            multiline
                                            numberOfLines={4}
                                            value={newTask.description}
                                            onChangeText={(text) => setNewTask(prev => ({ ...prev, description: text }))}
                                        />
                                    </View>
                                </View>
                            </ScrollView>
                        )}

                        {/* Footer Action */}
                        <View style={[styles.modalActionsSection, { marginTop: 'auto', paddingTop: 16 }]}>
                            <TouchableOpacity
                                style={[
                                    styles.primaryButton,
                                    {
                                        backgroundColor: FormaBlue[700],
                                        opacity: (isSaving || isUploading) ? 0.6 : 1,
                                    }
                                ]}
                                onPress={saveTask}
                                disabled={isSaving || isUploading}
                                activeOpacity={0.8}
                            >
                                {isSaving ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Ionicons name="add" size={20} color="#FFFFFF" />
                                        <Text style={styles.primaryButtonText}>Create Task</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
    );

    const renderPickers = () => (
        <>
            <MultiSearchablePicker
                visible={isAssigneePickerVisible}
                onClose={() => setIsAssigneePickerVisible(false)}
                title="Select Assignees"
                items={assigneeOptions.map(m => ({ id: m.id, label: m.name }))}
                selectedIds={newTask.assignees?.map(a => a.id) || []}
                emptyTitle={selectedTargetType === 'department' ? "No people in this department" : "No assignees found"}
                emptySubtitle={selectedTargetType === 'department' ? "Select another project or department to assign tasks" : "Try selecting another project or department"}
                onSave={(selectedItems) => {
                    const mappedAssignees = selectedItems.map(item => {
                        const prof = profiles.find(p => p.id === item.id);
                        return { id: item.id, name: item.label, avatar: prof?.avatar };
                    });
                    setNewTask(prev => ({ ...prev, assignees: mappedAssignees }));
                }}
            />

            {wbsSupported && (
                <WBSPicker
                    visible={isWBSPickerVisible}
                    onClose={() => setIsWBSPickerVisible(false)}
                    projectId={projectId}
                    onSelect={(wbsItemId: string, wbsCode: string, wbsName: string) => {
                        setWbsId(wbsItemId);
                        setNewTask(prev => ({
                            ...prev,
                            wbs: wbsCode,
                            title: prev.title === '' ? wbsName : prev.title
                        }));
                    }}
                />
            )}

            <LiquidDatePicker
                visible={isDatePickerVisible}
                onClose={() => setIsDatePickerVisible(false)}
                currentDate={newTask.dueDate}
                currentTime={taskTime}
                onSelect={(date, time) => {
                    setNewTask(prev => ({ ...prev, dueDate: date }));
                    if (time) setTaskTime(time);
                }}
            />
        </>
    );

    if (isEmbedded) {
        if (!isOpened) return null;
        return (
            <View style={{ flex: 1, width: '100%', height: '100%', position: 'relative' }}>
                {renderInnerContent()}
                {renderPickers()}
            </View>
        );
    }

    return (
        <Modal visible={isOpened} animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    activeOpacity={1}
                    onPress={onClose}
                />
                {renderInnerContent()}
            </View>
            {renderPickers()}
        </Modal>
    );
};

const styles = StyleSheet.create({
    embeddedContainer: {
        flex: 1,
        height: '100%',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
        paddingHorizontal: Platform.OS === 'ios' ? 8 : 0,
        paddingBottom: Platform.OS === 'ios' ? 8 : 0,
    },
    modalContent: {
        borderRadius: Platform.OS === 'ios' ? 56 : 40,
        borderBottomLeftRadius: Platform.OS === 'ios' ? 56 : 0,
        borderBottomRightRadius: Platform.OS === 'ios' ? 56 : 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: Platform.OS === 'android' ? 16 : 10,
        overflow: 'hidden',
    },
    modalDragIndicator: {
        width: 40,
        height: 5,
        backgroundColor: 'rgba(142,142,147,0.3)',
        borderRadius: 2.5,
        alignSelf: 'center',
        marginBottom: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        flex: 1,
        marginRight: 16,
        letterSpacing: -0.4,
    },
    primaryButton: {
        width: '100%',
        height: 50,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    modalActionsSection: {
        paddingTop: 8,
        marginTop: 4,
    },
    inputGroup: {
        marginBottom: 8,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        marginLeft: 4,
    },
    textInput: {
        borderRadius: 9999,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 15,
        fontWeight: '400',
        height: 48,
    },
    textArea: {
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 15,
        fontWeight: '400',
        minHeight: 100,
        textAlignVertical: 'top',
    },
    avatarChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 9999,
        borderWidth: 1,
        borderColor: 'rgba(142,142,147,0.1)',
        gap: 6,
    },
    miniAvatar: {
        width: 22,
        height: 22,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
    },
    miniAvatarText: {
        fontSize: 8,
        fontWeight: '800',
    },
    projectBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 9999,
        marginRight: 4,
    },
    modulePill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 9999,
        borderWidth: 1,
        gap: 6,
    },
    modulePillLabel: {
        fontSize: 13.5,
        fontWeight: '600',
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
    },
    attachmentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 9999,
    },
    addLinkButton: {
        height: 48,
        paddingHorizontal: 20,
        borderRadius: 9999,
        justifyContent: 'center',
        alignItems: 'center',
    },
    mediaButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        height: 42,
        borderRadius: 9999,
        borderWidth: 1,
        borderColor: 'rgba(128,128,128,0.2)',
    }
});
