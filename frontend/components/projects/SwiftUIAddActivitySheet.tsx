import React, { useState, useEffect } from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '@/context/ThemeContext';
import { saveProjectMeta, getProjectById } from '@/lib/api/projects';
import type { ActivityLog, ActivityMediaItem, ActivityAttachment } from './SwiftUIAddActivitySheet.ios';

export type { ActivityLog, ActivityMediaItem, ActivityAttachment };

export interface SwiftUIAddActivitySheetProps {
    isOpened: boolean;
    onClose: () => void;
    onSave?: (activity: ActivityLog, projectId: string) => Promise<void> | void;
    onSaveDraft?: (draft: ActivityLog, projectId: string) => Promise<void> | void;
    defaultProjectId?: string;
    existingMilestones?: any[];
    existingTasks?: any[];
    existingActions?: any[];
    initialActivity?: ActivityLog | null;
}

export const SwiftUIAddActivitySheet: React.FC<SwiftUIAddActivitySheetProps> = ({
    isOpened,
    onClose,
    onSave,
    onSaveDraft,
    defaultProjectId,
    initialActivity,
}) => {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#636366';
    const cardBgColor = isDark ? '#1C1C1E' : '#FFFFFF';
    const inputBgColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';

    const [activityTypeIndex, setActivityTypeIndex] = useState<0 | 1 | 2>(0);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [mediaFiles, setMediaFiles] = useState<ActivityMediaItem[]>([]);
    const [fileAttachments, setFileAttachments] = useState<ActivityAttachment[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isSavingDraft, setIsSavingDraft] = useState(false);

    useEffect(() => {
        if (isOpened) {
            if (initialActivity) {
                setTitle(initialActivity.title || '');
                setDescription(initialActivity.description || '');
                setActivityTypeIndex(initialActivity.activityType === 'work_related' ? 1 : initialActivity.activityType === 'module_linked' ? 2 : 0);
                if (initialActivity.media) setMediaFiles(initialActivity.media);
                else if (initialActivity.images) setMediaFiles(initialActivity.images.map(img => ({ uri: img, type: 'image' })));
                if (initialActivity.attachments) setFileAttachments(initialActivity.attachments);
            } else {
                setTitle('');
                setDescription('');
                setMediaFiles([]);
                setFileAttachments([]);
                setActivityTypeIndex(0);
            }
        }
    }, [isOpened, initialActivity]);

    const handlePickMedia = async () => {
        const remaining = 10 - mediaFiles.length;
        if (remaining <= 0) {
            Alert.alert('Limit Reached', 'You can upload up to 10 media items.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.All,
            allowsMultipleSelection: true,
            selectionLimit: remaining,
        });
        if (!result.canceled && result.assets) {
            const added = result.assets.slice(0, remaining).map(a => ({
                uri: a.uri,
                type: (a.type === 'video' ? 'video' : 'image') as 'image' | 'video',
                name: a.fileName || 'Media',
            }));
            setMediaFiles(prev => [...prev, ...added]);
        }
    };

    const handlePickDocument = async () => {
        const remaining = 5 - fileAttachments.length;
        if (remaining <= 0) {
            Alert.alert('Limit Reached', 'You can attach up to 5 document files.');
            return;
        }
        const result = await DocumentPicker.getDocumentAsync({
            type: '*/*',
            multiple: true,
            copyToCacheDirectory: true,
        });
        if (!result.canceled && result.assets) {
            const added = result.assets.slice(0, remaining).map(asset => ({
                id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                name: asset.name,
                size: asset.size ? `${(asset.size / (1024 * 1024)).toFixed(1)} MB` : undefined,
                uri: asset.uri,
                type: asset.mimeType || 'file',
            }));
            setFileAttachments(prev => [...prev, ...added]);
        }
    };

    const handleSave = async (asDraft = false) => {
        if (!asDraft && !title.trim() && !description.trim() && mediaFiles.length === 0) {
            Alert.alert('Missing Info', 'Please enter a title, description, or media.');
            return;
        }

        if (asDraft) setIsSavingDraft(true);
        else setIsSaving(true);

        try {
            const imageUrls = mediaFiles.map(m => m.uri);
            const newLog: ActivityLog = {
                id: initialActivity?.id || `act-log-${Date.now()}`,
                activityType: activityTypeIndex === 0 ? 'member_update' : activityTypeIndex === 1 ? 'work_related' : 'module_linked',
                authorName: 'Rizky Firmansyah',
                authorRole: 'Project Member',
                timestamp: 'Just now',
                title: title.trim() || (asDraft ? 'Draft Site Update' : 'Site Update'),
                description: description.trim() || (asDraft ? 'Draft update' : 'Daily site progress logged.'),
                images: imageUrls.length > 0 ? imageUrls : undefined,
                media: mediaFiles.length > 0 ? mediaFiles : undefined,
                attachments: fileAttachments.length > 0 ? fileAttachments : undefined,
                likes: 0,
                hasLiked: false,
                isDraft: asDraft,
                comments: [],
            };

            if (asDraft && defaultProjectId) {
                const proj = await getProjectById(defaultProjectId);
                if (proj) {
                    const existingDrafts: ActivityLog[] = (proj.meta?.draftActivities && Array.isArray(proj.meta.draftActivities)) ? proj.meta.draftActivities : [];
                    const filtered = existingDrafts.filter(d => d.id !== newLog.id);
                    await saveProjectMeta(defaultProjectId, {
                        ...(proj.meta || {}),
                        draftActivities: [newLog, ...filtered],
                    });
                }
            } else if (onSave && defaultProjectId) {
                await onSave(newLog, defaultProjectId);
            } else if (defaultProjectId) {
                const proj = await getProjectById(defaultProjectId);
                if (proj) {
                    const existing: ActivityLog[] = (proj.meta?.activities && Array.isArray(proj.meta.activities)) ? proj.meta.activities : [];
                    await saveProjectMeta(defaultProjectId, {
                        ...(proj.meta || {}),
                        activities: [newLog, ...existing],
                    });
                }
            }

            onClose();
        } catch (e) {
            console.error('Save error:', e);
            Alert.alert('Error', 'Failed to save activity.');
        } finally {
            setIsSaving(false);
            setIsSavingDraft(false);
        }
    };

    if (!isOpened) return null;

    return (
        <Modal visible={isOpened} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={[styles.sheetContainer, { backgroundColor: cardBgColor }]}>
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: textColor }]}>New Activity Log</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={22} color={subtextColor} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 24 }}>
                        <Text style={[styles.fieldLabel, { color: subtextColor }]}>Activity Type</Text>
                        <View style={styles.typeRow}>
                            {['Member Update', 'Work Item', 'Module Linked'].map((lbl, idx) => (
                                <TouchableOpacity
                                    key={lbl}
                                    onPress={() => setActivityTypeIndex(idx as any)}
                                    style={[
                                        styles.typeBtn,
                                        { backgroundColor: activityTypeIndex === idx ? '#007AFF' : inputBgColor }
                                    ]}
                                >
                                    <Text style={[styles.typeBtnText, { color: activityTypeIndex === idx ? '#FFFFFF' : textColor }]}>
                                        {lbl}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={[styles.fieldLabel, { color: subtextColor }]}>
                            {activityTypeIndex === 2 && ['Finance', 'Resources', 'People', 'Clock', 'Report'][activityTypeIndex] === 'Finance' ? 'Transaction Title' : 'Title'}
                        </Text>
                        <TextInput
                            placeholder="Title (optional)..."
                            placeholderTextColor={subtextColor}
                            value={title}
                            onChangeText={setTitle}
                            style={[styles.input, { backgroundColor: inputBgColor, color: textColor }]}
                        />

                        <Text style={[styles.fieldLabel, { color: subtextColor }]}>Update Details ({description.length}/500)</Text>
                        <TextInput
                            placeholder="Write update details..."
                            placeholderTextColor={subtextColor}
                            value={description}
                            onChangeText={setDescription}
                            multiline
                            numberOfLines={4}
                            maxLength={500}
                            style={[styles.inputMultiline, { backgroundColor: inputBgColor, color: textColor }]}
                        />

                        <Text style={[styles.fieldLabel, { color: subtextColor }]}>Media - Photos & Videos ({mediaFiles.length}/10)</Text>
                        <TouchableOpacity onPress={handlePickMedia} style={[styles.attachBtn, { backgroundColor: inputBgColor }]}>
                            <Ionicons name="images-outline" size={18} color="#007AFF" />
                            <Text style={{ color: '#007AFF', fontWeight: '600', marginLeft: 8 }}>
                                {mediaFiles.length > 0 ? `${mediaFiles.length} Media Attached` : 'Add Photos / Videos'}
                            </Text>
                        </TouchableOpacity>

                        <Text style={[styles.fieldLabel, { color: subtextColor }]}>Attachments - Files ({fileAttachments.length}/5)</Text>
                        <TouchableOpacity onPress={handlePickDocument} style={[styles.attachBtn, { backgroundColor: inputBgColor }]}>
                            <Ionicons name="attach-outline" size={18} color="#007AFF" />
                            <Text style={{ color: '#007AFF', fontWeight: '600', marginLeft: 8 }}>
                                {fileAttachments.length > 0 ? `${fileAttachments.length} File(s) Attached` : 'Add Documents / Files'}
                            </Text>
                        </TouchableOpacity>
                    </ScrollView>

                    <View style={styles.footerRow}>
                        <TouchableOpacity
                            onPress={() => handleSave(true)}
                            disabled={isSaving || isSavingDraft}
                            style={[styles.draftBtn, { backgroundColor: inputBgColor }]}
                        >
                            {isSavingDraft ? (
                                <ActivityIndicator color={textColor} size="small" />
                            ) : (
                                <Text style={[styles.draftBtnText, { color: textColor }]}>Save Draft</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => handleSave(false)}
                            disabled={isSaving || isSavingDraft}
                            style={styles.saveBtn}
                        >
                            {isSaving ? (
                                <ActivityIndicator color="#FFFFFF" size="small" />
                            ) : (
                                <Text style={styles.saveBtnText}>Post Activity Log</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    sheetContainer: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '88%',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 32,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
    },
    closeBtn: {
        padding: 4,
    },
    body: {
        flexGrow: 0,
    },
    fieldLabel: {
        fontSize: 13,
        fontWeight: '600',
        marginTop: 12,
        marginBottom: 6,
    },
    typeRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 6,
    },
    typeBtn: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 10,
        alignItems: 'center',
    },
    typeBtnText: {
        fontSize: 12,
        fontWeight: '600',
    },
    input: {
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
    },
    inputMultiline: {
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        minHeight: 80,
        textAlignVertical: 'top',
    },
    attachBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
    },
    footerRow: {
        marginTop: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    draftBtn: {
        paddingVertical: 13,
        paddingHorizontal: 18,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
    },
    draftBtnText: {
        fontWeight: '600',
        fontSize: 14,
    },
    saveBtn: {
        flex: 1,
        backgroundColor: '#0036F8',
        borderRadius: 999,
        paddingVertical: 13,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveBtnText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 15,
    },
});
