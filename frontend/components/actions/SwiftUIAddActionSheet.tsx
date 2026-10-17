import React, { useState, useEffect } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassView } from '@/components/ui/GlassView';
import { PillButton } from '@/components/ui/PillButton';
import { HeaderCircleButton } from '@/components/ui/HeaderCircleButton';
import { FormaBlue } from '@/constants/theme';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { SearchablePicker } from '@/components/ui/SearchablePicker';
import { LiquidDatePicker } from '@/components/ui/LiquidDatePicker';
import { MultiSearchablePicker } from '@/components/ui/MultiSearchablePicker';
import { Action, TaskAttachment, Project } from '@/constants/MockData';
import { getProjects } from '@/lib/api/projects';
import { getProfiles, createActionApi, uploadTaskAttachment, getDepartments } from '@/lib/api/tasks';
import { useUserContext } from '@/context/UserProvider';
import { useTenantContext } from '@/context/TenantContext';

export interface SwiftUIAddActionSheetProps {
    isOpened: boolean;
    onClose: () => void;
    onSave: (action: Action) => void;
    defaultProjectId?: string;
}

const ACTION_TYPES = [
    { id: 'review', label: 'Review' },
    { id: 'approval', label: 'Approval' },
    { id: 'revision', label: 'Revision' },
    { id: 'dispute', label: 'Dispute' },
    { id: 'confirmation', label: 'Confirmation' }
] as const;

export const SwiftUIAddActionSheet: React.FC<SwiftUIAddActionSheetProps> = ({
    isOpened,
    onClose,
    onSave,
}) => {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const insets = useSafeAreaInsets();
    const { profile, isAuthenticated } = useUserContext();
    const { activeTenant, activeWorkspace } = useTenantContext();
    
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
    const [profiles, setProfiles] = useState<Array<{ id: string; name: string; avatar?: string }>>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Form fields
    const [title, setTitle] = useState('');
    const [projectId, setProjectId] = useState('');
    const [projectTitle, setProjectTitle] = useState('');
    const [projectCode, setProjectCode] = useState('');
    const [actionType, setActionType] = useState<typeof ACTION_TYPES[number]['id']>('review');
    const [priority, setPriority] = useState<Action['priority']>('medium');
    const [dueDate, setDueDate] = useState('');
    const [dueTime, setDueTime] = useState('14:00');
    const [description, setDescription] = useState('');
    const [selectedReviewers, setSelectedReviewers] = useState<Array<{ id: string; name: string; avatar?: string }>>([]);
    const [moduleTarget, setModuleTarget] = useState<'none' | Action['module']>('none');
    
    // Attachments
    const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
    const [linkInput, setLinkInput] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    // Pickers visibility
    const [isProjectPickerVisible, setIsProjectPickerVisible] = useState(false);
    const [isReviewersPickerVisible, setIsReviewersPickerVisible] = useState(false);
    const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);

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
                if (projs.length > 0) {
                    setProjectId(projs[0].id);
                    setProjectTitle(projs[0].title);
                    setProjectCode(projs[0].code);
                }
                setIsLoading(false);
            }).catch(err => {
                console.error('Failed to load add action setup data:', err);
                setIsLoading(false);
            });

            // Reset form
            setTitle('');
            setActionType('review');
            setPriority('medium');
            setDueDate('');
            setDueTime('14:00');
            setDescription('');
            setSelectedReviewers([]);
            setModuleTarget('none');
            setAttachments([]);
            setLinkInput('');
        }
    }, [isOpened, isAuthenticated, activeTenant?.id, activeWorkspace?.id]);

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

    // Save action to Supabase
    const saveAction = async () => {
        if (!title.trim()) {
            Alert.alert('Error', 'Please enter an action title');
            return;
        }
        if (!projectId) {
            Alert.alert('Pilih Proyek / Departemen', 'Silakan pilih proyek atau departemen terlebih dahulu sebelum melanjutkan.');
            return;
        }
        if (!dueDate) {
            Alert.alert('Error', 'Please select a deadline date');
            return;
        }

        setIsSaving(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            const reviewerIds = selectedReviewers.map(r => r.id);
            
            // Format date correctly to match API expects
            const payload: any = {
                title: title.trim(),
                projectId: projectId.startsWith('dept-') ? undefined : projectId,
                departmentId: projectId.startsWith('dept-') ? projectId : undefined,
                wbsId: undefined,
                wbsCode: undefined,
                date: dueDate, // API saves date as deadline_date
                status: 'pending',
                priority: priority,
                description: description.trim() || undefined,
                actionType: actionType,
                type: actionType, // both type and actionType map
                module: moduleTarget === 'none' ? 'other' : moduleTarget,
                attachments: attachments,
                requestedBy: profile?.id || undefined
            };

            const createdAction = await createActionApi(payload, reviewerIds);
            
            if (createdAction) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                onSave(createdAction);
            } else {
                Alert.alert('Error', 'Failed to save action to server.');
            }
        } catch (err: any) {
            console.error('Error saving action:', err);
            Alert.alert('Error', err.message || 'An error occurred while saving.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal visible={isOpened} animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    activeOpacity={1}
                    onPress={onClose}
                />
                <View style={[styles.modalContent, { height: '92%', backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
                    <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 20, paddingBottom: Platform.OS === 'ios' ? 22 : 24 }}>
                        {/* Header */}
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: textColor }]}>Add New Action</Text>
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
                                <Text style={{ color: subtextColor, marginTop: 8, fontWeight: '500' }}>Fetching action configuration...</Text>
                            </View>
                        ) : (
                            <ScrollView
                                style={{ flex: 1 }}
                                showsVerticalScrollIndicator={false}
                                keyboardShouldPersistTaps="handled"
                                contentContainerStyle={{ paddingBottom: 80, paddingTop: 0 }}
                            >
                                <View style={{ gap: 20, paddingTop: 12 }}>
                                    {/* Action Title */}
                                    <View style={styles.inputGroup}>
                                        <Text style={[styles.inputLabel, { color: subtextColor }]}>Action Title</Text>
                                        <TextInput
                                            style={[styles.textInput, { color: textColor, backgroundColor: fieldBg, borderColor: fieldBorderColor, borderWidth: fieldBorderWidth }]}
                                            placeholder="What needs to be actioned?"
                                            placeholderTextColor={placeholderColor}
                                            value={title}
                                            onChangeText={setTitle}
                                        />
                                    </View>

                                    {/* Project / Department */}
                                    <View style={styles.inputGroup}>
                                        <Text style={[styles.inputLabel, { color: subtextColor }]}>Project / Department</Text>
                                        <TouchableOpacity
                                            onPress={() => setIsProjectPickerVisible(true)}
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
                                                <View style={[styles.projectBadge, { backgroundColor: '#007AFF', marginRight: 0 }]}>
                                                    <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>
                                                        {projectCode || 'GEN'}
                                                    </Text>
                                                </View>
                                                <Text style={{ color: projectTitle ? textColor : placeholderColor, fontSize: 15, fontWeight: projectTitle ? '500' : '400' }}>
                                                    {projectTitle || 'Select Project or Department'}
                                                </Text>
                                            </View>
                                            <Ionicons name="chevron-forward" size={18} color={subtextColor} />
                                        </TouchableOpacity>
                                    </View>

                                    {/* Action Type */}
                                    <View style={styles.inputGroup}>
                                        <Text style={[styles.inputLabel, { color: subtextColor, marginBottom: 8 }]}>Action Type</Text>
                                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                            {ACTION_TYPES.map(type => {
                                                const isSelected = actionType === type.id;
                                                return (
                                                    <TouchableOpacity
                                                        key={type.id}
                                                        onPress={() => {
                                                            setActionType(type.id);
                                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                        }}
                                                        style={[
                                                            styles.typePill,
                                                            {
                                                                backgroundColor: isSelected ? '#007AFF' : fieldBg,
                                                                borderColor: isSelected ? '#007AFF' : fieldBorderColor,
                                                                borderWidth: isSelected ? 1 : fieldBorderWidth,
                                                            }
                                                        ]}
                                                    >
                                                        <Text style={{ color: isSelected ? '#FFFFFF' : textColor, fontSize: 13, fontWeight: '600' }}>
                                                            {type.label}
                                                        </Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                    </View>

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
                                            activeSegment={priority}
                                            onSegmentChange={(val) => setPriority(val as any)}
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
                                                <Text style={{ color: dueDate ? textColor : placeholderColor, fontSize: 15, fontWeight: dueDate ? '500' : '400' }}>
                                                    {dueDate ? `${dueDate} at ${dueTime}` : "Select Deadline"}
                                                </Text>
                                            </View>
                                            <Ionicons name="chevron-forward" size={18} color={subtextColor} />
                                        </TouchableOpacity>
                                    </View>

                                    {/* Reviewers (Multi-Select Searchable) */}
                                    <View style={styles.inputGroup}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                            <Text style={[styles.inputLabel, { color: subtextColor, marginBottom: 0 }]}>Reviewers</Text>
                                            <TouchableOpacity 
                                                onPress={() => setIsReviewersPickerVisible(true)} 
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
                                                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600' }}>Assign Reviewers</Text>
                                            </TouchableOpacity>
                                        </View>
                                        {selectedReviewers.length > 0 && (
                                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                                {selectedReviewers.map(reviewer => (
                                                    <TouchableOpacity
                                                        key={reviewer.id}
                                                        onPress={() => {
                                                            setSelectedReviewers(prev => prev.filter(r => r.id !== reviewer.id));
                                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                        }}
                                                        style={[styles.avatarChip, { backgroundColor: '#007AFF', borderColor: 'transparent' }]}
                                                    >
                                                        <View style={[styles.miniAvatar, { backgroundColor: '#FFFFFF', borderColor: 'transparent', width: 20, height: 20 }]}>
                                                            <Text style={[styles.miniAvatarText, { color: '#007AFF', fontSize: 7 }]}>
                                                                {((reviewer.name || 'Staff').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase())}
                                                            </Text>
                                                        </View>
                                                        <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600' }}>{reviewer.name}</Text>
                                                        <Ionicons name="close-circle" size={15} color="rgba(255,255,255,0.85)" />
                                                    </TouchableOpacity>
                                                ))}
                                            </View>
                                        )}
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
                                                const isSelected = moduleTarget === module.id;
                                                return (
                                                    <TouchableOpacity
                                                        key={module.id}
                                                        onPress={() => {
                                                            setModuleTarget(isSelected ? 'none' : module.id as any);
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

                                    {/* Notes / Description */}
                                    <View style={styles.inputGroup}>
                                        <Text style={[styles.inputLabel, { color: subtextColor }]}>Notes / Description</Text>
                                        <TextInput
                                            style={[styles.textArea, { color: textColor, backgroundColor: fieldBg, borderColor: fieldBorderColor, borderWidth: fieldBorderWidth }]}
                                            placeholder="Specify action descriptions or guidelines..."
                                            placeholderTextColor={placeholderColor}
                                            multiline
                                            numberOfLines={4}
                                            value={description}
                                            onChangeText={setDescription}
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
                                onPress={saveAction}
                                disabled={isSaving || isUploading}
                                activeOpacity={0.8}
                            >
                                {isSaving ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Ionicons name="add" size={20} color="#FFFFFF" />
                                        <Text style={styles.primaryButtonText}>Create Action</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>

            {/* Pickers */}
            <SearchablePicker
                visible={isProjectPickerVisible}
                onClose={() => setIsProjectPickerVisible(false)}
                title="Select Project / Department"
                sections={[
                    {
                        title: 'Projects',
                        data: projects.map(p => ({ id: p.id, label: p.title, sublabel: p.code || 'PRJ' }))
                    },
                    {
                        title: 'Departments',
                        data: departments.map(d => ({ id: d.id, label: d.name, sublabel: d.code || 'DEPT' }))
                    }
                ]}
                selectedId={projectId}
                onSelect={(item: { id: string; label: string; sublabel?: string }) => {
                    setProjectId(item.id);
                    setProjectTitle(item.label);
                    setProjectCode(item.sublabel || '');
                }}
            />

            <MultiSearchablePicker
                visible={isReviewersPickerVisible}
                onClose={() => setIsReviewersPickerVisible(false)}
                title="Select Reviewers"
                items={profiles.map(m => ({ id: m.id, label: m.name }))}
                selectedIds={selectedReviewers.map(r => r.id)}
                emptyTitle="No reviewers found"
                emptySubtitle="Select another project or department to assign reviewers"
                onSave={(selectedItems) => {
                    const mapped = selectedItems.map(item => {
                        const prof = profiles.find(p => p.id === item.id);
                        return { id: item.id, name: item.label, avatar: prof?.avatar };
                    });
                    setSelectedReviewers(mapped);
                }}
            />

            <LiquidDatePicker
                visible={isDatePickerVisible}
                onClose={() => setIsDatePickerVisible(false)}
                currentDate={dueDate}
                currentTime={dueTime}
                onSelect={(date, time) => {
                    setDueDate(date);
                    if (time) setDueTime(time);
                }}
            />
        </Modal>
    );
};

const styles = StyleSheet.create({
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
    typePill: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 9999,
        borderWidth: 1,
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
