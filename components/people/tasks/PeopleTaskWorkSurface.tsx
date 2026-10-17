import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    ScrollView,
    Platform,
    ActionSheetIOS,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Task } from '@/constants/MockData';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { GlassView } from '@/components/ui/GlassView';
import {
    calculateProfileCompleteness,
    calculateDocumentCompleteness,
    dispatchAcknowledgeEmploymentUpdateAction,
} from '@/lib/workflows/peopleWorkflow';
import { DOCUMENT_CATEGORIES, BANK_OPTIONS } from '@/components/people/member-profile/types';
import { updateTaskApi } from '@/lib/api/tasks';

interface PeopleTaskWorkSurfaceProps {
    task: Task;
    isDark: boolean;
    textColor: string;
    subtextColor: string;
    onTaskUpdated?: (updatedTask: Task) => void;
}

export const PeopleTaskWorkSurface: React.FC<PeopleTaskWorkSurfaceProps> = ({
    task,
    isDark,
    textColor,
    subtextColor,
    onTaskUpdated,
}) => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingCat, setUploadingCat] = useState<string | null>(null);
    const [targetUserId, setTargetUserId] = useState<string>('');
    const [profile, setProfile] = useState<any>(null);
    const [documents, setDocuments] = useState<any[]>([]);
    
    // Editable form state
    const [form, setForm] = useState<Record<string, any>>({});
    const [activeSection, setActiveSection] = useState<string>('personal');

    // HR Review state
    const [requireAck, setRequireAck] = useState(false);
    const [hrNotes, setHrNotes] = useState('');

    const recordType = task.sourceInfo?.recordType || '';
    const isProfileCompletion = recordType === 'profile_completion' || task.title.toLowerCase().includes('complete your profile');
    const isRequiredDocuments = recordType === 'required_documents' || task.title.toLowerCase().includes('submit required documents');
    const isLifecycleReview = recordType === 'employment_profile_review' || task.title.toLowerCase().includes('review your profile');
    const isHrStatusReview = recordType === 'employment_status_review' || task.title.toLowerCase().startsWith('review employment status');

    // Resolve target userId
    useEffect(() => {
        let uid = task.sourceInfo?.recordId;
        if (!uid && task.assignees && task.assignees.length > 0) {
            uid = task.assignees[0].id;
        }
        if (!uid) uid = '1';
        setTargetUserId(uid);
    }, [task]);

    // Fetch live People data
    const loadPeopleData = useCallback(async () => {
        if (!targetUserId) return;
        setLoading(true);
        try {
            const [{ data: pData }, { data: dData }] = await Promise.all([
                supabase.from('profiles').select('*').eq('id', targetUserId).maybeSingle(),
                supabase.from('user_documents').select('*').eq('user_id', targetUserId).order('created_at', { ascending: false }),
            ]);

            if (pData) {
                setProfile(pData);
                const rawAddr = pData.address || {};
                const addr = typeof rawAddr === 'object' ? rawAddr : {};
                const emg = typeof pData.emergency_contact === 'object' ? pData.emergency_contact : {};
                const soc = typeof pData.social_links === 'object' ? pData.social_links : {};
                const bank = typeof pData.bank_info === 'object' ? pData.bank_info : {};

                setForm({
                    full_name: pData.full_name || pData.name || '',
                    nickname: pData.nickname || '',
                    email: pData.email || '',
                    phone: pData.phone || soc.phone_number || soc.whatsapp || '',
                    whatsapp: soc.whatsapp || pData.phone || '',
                    personal_email: soc.personal_email || '',
                    nik: pData.id_number || pData.nik || '',
                    gender: pData.gender || 'Male',
                    birth_date: pData.birth_date || '',
                    current_address: addr.current || (typeof rawAddr === 'string' ? rawAddr : ''),
                    ktp_address: addr.ktp || '',
                    emergency_name: emg.name || pData.emergency_name || '',
                    emergency_relationship: emg.relationship || pData.emergency_relationship || 'Family',
                    emergency_phone: emg.phone || pData.emergency_phone || '',
                    bank_name: bank.bank_name || pData.bank_name || 'BCA',
                    bank_account_number: bank.account_number || pData.bank_account_number || '',
                    bank_account_holder: bank.account_holder || pData.bank_account_holder || pData.full_name || '',
                    tax_id: pData.npwp || pData.tax_id || '',
                    // HR fields
                    position: pData.job_title || pData.position || '',
                    department: pData.department || '',
                    level: pData.level || 'Standard',
                    contract_type: pData.contract_type || 'PKWT',
                    work_status: pData.work_status || 'active',
                    join_date: pData.join_date || '',
                    end_date: pData.contract_end_date || pData.end_date || 'Present',
                });
            }
            if (dData) setDocuments(dData);
        } catch (e) {
            console.error('Error loading people data for task surface:', e);
        } finally {
            setLoading(false);
        }
    }, [targetUserId]);

    useEffect(() => {
        if (targetUserId) loadPeopleData();
    }, [targetUserId, loadPeopleData]);

    const completeness = calculateProfileCompleteness(profile);
    const docCompleteness = calculateDocumentCompleteness(documents);

    // Save profile edits directly into People profiles
    const handleSaveProfile = async (autoCompleteIf100: boolean = true) => {
        if (!targetUserId) return;
        setSaving(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            const updates: Record<string, any> = {
                full_name: form.full_name?.trim() || null,
                name: form.full_name?.trim() || null,
                nickname: form.nickname?.trim() || null,
                id_number: form.nik?.trim() || null,
                birth_date: form.birth_date?.trim() || null,
                address: {
                    current: form.current_address?.trim() || null,
                    ktp: form.ktp_address?.trim() || null,
                },
                emergency_contact: {
                    name: form.emergency_name?.trim() || null,
                    relationship: form.emergency_relationship?.trim() || null,
                    phone: form.emergency_phone?.trim() || null,
                },
                social_links: {
                    personal_email: form.personal_email?.trim() || null,
                    whatsapp: form.whatsapp?.trim() || form.phone?.trim() || null,
                    phone_number: form.phone?.trim() || null,
                },
                phone: form.whatsapp?.trim() || form.phone?.trim() || null,
                bank_info: {
                    bank_name: form.bank_name?.trim() || null,
                    account_number: form.bank_account_number?.trim() || null,
                    account_holder: form.bank_account_holder?.trim() || null,
                },
                npwp: form.tax_id?.trim() || null,
                tax_id: form.tax_id?.trim() || null,
                updated_at: new Date().toISOString(),
            };

            if (isHrStatusReview) {
                updates.job_title = form.position?.trim() || null;
                updates.position = form.position?.trim() || null;
                updates.department = form.department?.trim() || null;
                updates.contract_type = form.contract_type?.trim() || null;
                updates.work_status = form.work_status?.trim() || null;
                updates.join_date = form.join_date?.trim() || null;
                updates.contract_end_date = form.end_date === 'Present' ? null : (form.end_date?.trim() || null);
            }

            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', targetUserId);

            if (error) throw error;

            // Re-fetch updated profile to calculate new percentage
            const { data: updatedP } = await supabase.from('profiles').select('*').eq('id', targetUserId).maybeSingle();
            setProfile(updatedP);
            const newComp = calculateProfileCompleteness(updatedP);

            let nextTaskStatus: Task['status'] = task.status;

            if (autoCompleteIf100 && (newComp.isComplete || isLifecycleReview || isHrStatusReview)) {
                nextTaskStatus = 'done';
                await updateTaskApi(task.id, {
                    status: 'done',
                    history: [
                        {
                            id: `h-${Date.now()}`,
                            action: isLifecycleReview ? 'Profile review submitted' : (isHrStatusReview ? 'Employment review completed' : 'Profile reached 100% (Auto-completed)'),
                            timestamp: new Date().toISOString(),
                            user: 'People Integration',
                        },
                        ...(task.history || [])
                    ]
                });
            }

            // If HR status review and requested acknowledgement, dispatch Action
            if (isHrStatusReview && requireAck) {
                await dispatchAcknowledgeEmploymentUpdateAction(targetUserId, {
                    position: form.position,
                    level: form.level,
                    department: form.department,
                    effectiveDate: form.join_date || new Date().toISOString().split('T')[0],
                    notes: hrNotes || 'HR completed employment status update.',
                }, task.projectCode);
            }

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Saved', isLifecycleReview ? 'Profile review completed successfully.' : (isHrStatusReview ? 'Employment record updated successfully.' : 'Profile updated in People.'));
            
            if (onTaskUpdated) {
                onTaskUpdated({
                    ...task,
                    status: nextTaskStatus,
                    description: `${newComp.percentage}% complete · Complete at least 75% of your profile`,
                });
            }
        } catch (e: any) {
            Alert.alert('Save Failed', e.message || 'Unable to update People data.');
        } finally {
            setSaving(false);
        }
    };

    // Upload document directly inside Task surface
    const handleUploadDocument = async (category: string) => {
        if (!targetUserId) return;
        const isPasFoto = category === 'Pas Foto' || category === 'Pas Foto (Profile Photo)';

        const uploadFile = async (sourceType: 'camera' | 'gallery' | 'document') => {
            try {
                let fileUri = '';
                let fileName = '';
                let mimeType = '';

                if (sourceType === 'camera') {
                    const res = await ImagePicker.launchCameraAsync({
                        allowsEditing: isPasFoto,
                        aspect: isPasFoto ? [1, 1] : undefined,
                        quality: 0.85,
                    });
                    if (res.canceled || !res.assets || res.assets.length === 0) return;
                    fileUri = res.assets[0].uri;
                    fileName = `${category.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_photo.jpg`;
                    mimeType = res.assets[0].mimeType || 'image/jpeg';
                } else if (sourceType === 'gallery') {
                    const res = await ImagePicker.launchImageLibraryAsync({
                        mediaTypes: ImagePicker.MediaTypeOptions.Images,
                        allowsEditing: isPasFoto,
                        aspect: isPasFoto ? [1, 1] : undefined,
                        quality: 0.85,
                    });
                    if (res.canceled || !res.assets || res.assets.length === 0) return;
                    fileUri = res.assets[0].uri;
                    fileName = res.assets[0].fileName || `${category.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}.jpg`;
                    mimeType = res.assets[0].mimeType || 'image/jpeg';
                } else {
                    const res = await DocumentPicker.getDocumentAsync({
                        type: ['application/pdf', 'image/*'],
                        copyToCacheDirectory: true,
                    });
                    if (res.canceled || !res.assets || res.assets.length === 0) return;
                    fileUri = res.assets[0].uri;
                    fileName = res.assets[0].name;
                    mimeType = res.assets[0].mimeType || 'application/pdf';
                }

                setUploadingCat(category);

                const base64Data = await FileSystem.readAsStringAsync(fileUri, {
                    encoding: FileSystem.EncodingType.Base64,
                });

                const fileExt = fileName.split('.').pop() || (mimeType.includes('pdf') ? 'pdf' : 'jpg');
                const safeCategory = category.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
                const storagePath = `${targetUserId}/${safeCategory}-${Date.now()}.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from('profile_documents')
                    .upload(storagePath, decode(base64Data), {
                        contentType: mimeType || 'application/octet-stream',
                        upsert: true,
                    });

                if (uploadError) throw uploadError;

                const { data: publicUrlData } = supabase.storage
                    .from('profile_documents')
                    .getPublicUrl(storagePath);

                const { data: existingDocs } = await supabase
                    .from('user_documents')
                    .select('id')
                    .eq('user_id', targetUserId)
                    .eq('document_type', category);

                const docTitle = isPasFoto ? 'Pas Foto (Profile Photo)' : fileName;

                if (existingDocs && existingDocs.length > 0) {
                    await supabase
                        .from('user_documents')
                        .update({
                            title: docTitle,
                            file_url: publicUrlData.publicUrl,
                            updated_at: new Date().toISOString(),
                        })
                        .eq('id', existingDocs[0].id);
                } else {
                    await supabase
                        .from('user_documents')
                        .insert({
                            user_id: targetUserId,
                            title: docTitle,
                            document_type: category,
                            file_url: publicUrlData.publicUrl,
                        });
                }

                if (isPasFoto) {
                    await supabase
                        .from('profiles')
                        .update({ avatar_url: publicUrlData.publicUrl })
                        .eq('id', targetUserId);
                }

                // Refresh documents
                const { data: updatedDocs } = await supabase.from('user_documents').select('*').eq('user_id', targetUserId);
                setDocuments(updatedDocs || []);
                const updatedComp = calculateDocumentCompleteness(updatedDocs || []);

                // If all documents complete, auto-complete task
                let nextStatus = task.status;
                if (updatedComp.isComplete) {
                    nextStatus = 'done';
                    await updateTaskApi(task.id, {
                        status: 'done',
                        history: [
                            {
                                id: `h-${Date.now()}`,
                                action: 'All required documents submitted (Auto-completed)',
                                timestamp: new Date().toISOString(),
                                user: 'People Integration',
                            },
                            ...(task.history || [])
                        ]
                    });
                }

                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert('Success', `${category} uploaded and synced with People.`);

                if (onTaskUpdated) {
                    onTaskUpdated({
                        ...task,
                        status: nextStatus,
                        description: `${updatedComp.uploadedCount} of ${updatedComp.requiredCount} completed`,
                    });
                }
            } catch (err: any) {
                Alert.alert('Upload Failed', err.message || 'Could not upload document.');
            } finally {
                setUploadingCat(null);
            }
        };

        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    title: `Upload ${category}`,
                    options: ['Cancel', 'Take Photo', 'Photo Library', 'Browse Files'],
                    cancelButtonIndex: 0,
                },
                (btn) => {
                    if (btn === 1) uploadFile('camera');
                    if (btn === 2) uploadFile('gallery');
                    if (btn === 3) uploadFile('document');
                }
            );
        } else {
            Alert.alert(`Upload ${category}`, undefined, [
                { text: 'Take Photo', onPress: () => uploadFile('camera') },
                { text: 'Photo Library', onPress: () => uploadFile('gallery') },
                { text: 'Browse Files', onPress: () => uploadFile('document') },
                { text: 'Cancel', style: 'cancel' },
            ]);
        }
    };

    if (loading) {
        return (
            <View style={s.loadingBox}>
                <ActivityIndicator size="small" color="#007AFF" />
                <Text style={{ color: subtextColor, fontSize: 13, marginTop: 8 }}>Loading People records...</Text>
            </View>
        );
    }

    return (
        <View style={s.container}>
            {/* Header Status Banner */}
            <View style={[s.bannerCard, { backgroundColor: isDark ? 'rgba(0, 122, 255, 0.12)' : 'rgba(0, 122, 255, 0.08)', borderColor: isDark ? 'rgba(0, 122, 255, 0.3)' : 'rgba(0, 122, 255, 0.2)' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                        <View style={[s.iconCircle, { backgroundColor: '#007AFF' }]}>
                            <PlatformIcon name={isRequiredDocuments ? 'doc.fill' : 'person.fill'} size={18} tintColor="#FFFFFF" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[s.bannerTitle, { color: textColor }]}>
                                {isProfileCompletion ? 'Profile Completeness' : (isRequiredDocuments ? 'Required Documents' : (isHrStatusReview ? 'HR Employment Review' : 'Lifecycle Profile Review'))}
                            </Text>
                            <Text style={[s.bannerSubtitle, { color: subtextColor }]}>
                                {isProfileCompletion
                                    ? `${completeness.percentage}% complete · Target ≥75%`
                                    : (isRequiredDocuments ? `${docCompleteness.uploadedCount} of ${docCompleteness.requiredCount} submitted` : 'Direct People synchronization active')}
                            </Text>
                        </View>
                    </View>

                    {isProfileCompletion && (
                        <View style={[s.badgePill, { backgroundColor: completeness.isComplete ? '#34C759' : (completeness.meetsMinimumThreshold ? '#007AFF' : '#FF9500') }]}>
                            <Text style={s.badgePillText}>{completeness.percentage}%</Text>
                        </View>
                    )}
                </View>

                {/* Progress Bar for Profile Completion */}
                {isProfileCompletion && (
                    <View style={s.progressBarTrack}>
                        <View style={[s.progressBarFill, { width: `${Math.min(100, Math.max(0, completeness.percentage))}%`, backgroundColor: completeness.isComplete ? '#34C759' : '#007AFF' }]} />
                    </View>
                )}
            </View>

            {/* SURFACE 1: Profile Completion or Profile Lifecycle Review */}
            {(isProfileCompletion || isLifecycleReview) && (
                <View style={s.formSection}>
                    {/* Field Group Tabs */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.groupTabsScroll}>
                        {[
                            { id: 'personal', label: 'Personal' },
                            { id: 'contact', label: 'Contact' },
                            { id: 'address', label: 'Address' },
                            { id: 'emergency', label: 'Emergency' },
                            { id: 'finance', label: 'Bank & Tax' },
                        ].map(grp => {
                            const isSelected = activeSection === grp.id;
                            return (
                                <TouchableOpacity
                                    key={grp.id}
                                    onPress={() => {
                                        Haptics.selectionAsync();
                                        setActiveSection(grp.id);
                                    }}
                                    style={[
                                        s.groupTabPill,
                                        {
                                            backgroundColor: isSelected
                                                ? (isDark ? 'rgba(255,255,255,0.18)' : '#1C1C1E')
                                                : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
                                        }
                                    ]}
                                >
                                    <Text style={[s.groupTabText, { color: isSelected ? '#FFFFFF' : subtextColor, fontWeight: isSelected ? '700' : '500' }]}>
                                        {grp.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    {/* Group Fields */}
                    <View style={[s.cardBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                        {activeSection === 'personal' && (
                            <View style={s.fieldStack}>
                                <Text style={[s.fieldLabel, { color: subtextColor }]}>Full Legal Name</Text>
                                <TextInput
                                    value={form.full_name}
                                    onChangeText={(v) => setForm(prev => ({ ...prev, full_name: v }))}
                                    style={[s.textInput, { color: textColor, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
                                    placeholder="Enter full name"
                                    placeholderTextColor={subtextColor}
                                />

                                <Text style={[s.fieldLabel, { color: subtextColor }]}>NIK / National ID (16 Digits)</Text>
                                <TextInput
                                    value={form.nik}
                                    onChangeText={(v) => setForm(prev => ({ ...prev, nik: v }))}
                                    keyboardType="numeric"
                                    maxLength={16}
                                    style={[s.textInput, { color: textColor, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
                                    placeholder="16-digit NIK"
                                    placeholderTextColor={subtextColor}
                                />

                                <Text style={[s.fieldLabel, { color: subtextColor }]}>Birth Date (YYYY-MM-DD)</Text>
                                <TextInput
                                    value={form.birth_date}
                                    onChangeText={(v) => setForm(prev => ({ ...prev, birth_date: v }))}
                                    style={[s.textInput, { color: textColor, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
                                    placeholder="1995-08-17"
                                    placeholderTextColor={subtextColor}
                                />
                            </View>
                        )}

                        {activeSection === 'contact' && (
                            <View style={s.fieldStack}>
                                <Text style={[s.fieldLabel, { color: subtextColor }]}>Personal Email</Text>
                                <TextInput
                                    value={form.personal_email}
                                    onChangeText={(v) => setForm(prev => ({ ...prev, personal_email: v }))}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    style={[s.textInput, { color: textColor, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
                                    placeholder="personal@email.com"
                                    placeholderTextColor={subtextColor}
                                />

                                <Text style={[s.fieldLabel, { color: subtextColor }]}>WhatsApp / Phone</Text>
                                <TextInput
                                    value={form.whatsapp || form.phone}
                                    onChangeText={(v) => setForm(prev => ({ ...prev, whatsapp: v, phone: v }))}
                                    keyboardType="phone-pad"
                                    style={[s.textInput, { color: textColor, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
                                    placeholder="+62 812-3456-7890"
                                    placeholderTextColor={subtextColor}
                                />
                            </View>
                        )}

                        {activeSection === 'address' && (
                            <View style={s.fieldStack}>
                                <Text style={[s.fieldLabel, { color: subtextColor }]}>Current Residential Address</Text>
                                <TextInput
                                    value={form.current_address}
                                    onChangeText={(v) => setForm(prev => ({ ...prev, current_address: v }))}
                                    multiline
                                    style={[s.textInput, { height: 64, color: textColor, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
                                    placeholder="Current street address, city, postal code"
                                    placeholderTextColor={subtextColor}
                                />

                                <Text style={[s.fieldLabel, { color: subtextColor }]}>KTP Address (As per ID Card)</Text>
                                <TextInput
                                    value={form.ktp_address}
                                    onChangeText={(v) => setForm(prev => ({ ...prev, ktp_address: v }))}
                                    multiline
                                    style={[s.textInput, { height: 64, color: textColor, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
                                    placeholder="KTP registered address"
                                    placeholderTextColor={subtextColor}
                                />
                            </View>
                        )}

                        {activeSection === 'emergency' && (
                            <View style={s.fieldStack}>
                                <Text style={[s.fieldLabel, { color: subtextColor }]}>Emergency Contact Name</Text>
                                <TextInput
                                    value={form.emergency_name}
                                    onChangeText={(v) => setForm(prev => ({ ...prev, emergency_name: v }))}
                                    style={[s.textInput, { color: textColor, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
                                    placeholder="e.g. Sarah Travo"
                                    placeholderTextColor={subtextColor}
                                />

                                <Text style={[s.fieldLabel, { color: subtextColor }]}>Relationship</Text>
                                <TextInput
                                    value={form.emergency_relationship}
                                    onChangeText={(v) => setForm(prev => ({ ...prev, emergency_relationship: v }))}
                                    style={[s.textInput, { color: textColor, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
                                    placeholder="Spouse / Parent / Sibling"
                                    placeholderTextColor={subtextColor}
                                />

                                <Text style={[s.fieldLabel, { color: subtextColor }]}>Emergency Contact Phone</Text>
                                <TextInput
                                    value={form.emergency_phone}
                                    onChangeText={(v) => setForm(prev => ({ ...prev, emergency_phone: v }))}
                                    keyboardType="phone-pad"
                                    style={[s.textInput, { color: textColor, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
                                    placeholder="+62 811-0000-1111"
                                    placeholderTextColor={subtextColor}
                                />
                            </View>
                        )}

                        {activeSection === 'finance' && (
                            <View style={s.fieldStack}>
                                <Text style={[s.fieldLabel, { color: subtextColor }]}>Bank Name</Text>
                                <TextInput
                                    value={form.bank_name}
                                    onChangeText={(v) => setForm(prev => ({ ...prev, bank_name: v }))}
                                    style={[s.textInput, { color: textColor, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
                                    placeholder="BCA / Mandiri / BNI"
                                    placeholderTextColor={subtextColor}
                                />

                                <Text style={[s.fieldLabel, { color: subtextColor }]}>Bank Account Number</Text>
                                <TextInput
                                    value={form.bank_account_number}
                                    onChangeText={(v) => setForm(prev => ({ ...prev, bank_account_number: v }))}
                                    keyboardType="numeric"
                                    style={[s.textInput, { color: textColor, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
                                    placeholder="Account number"
                                    placeholderTextColor={subtextColor}
                                />

                                <Text style={[s.fieldLabel, { color: subtextColor }]}>Account Holder Name</Text>
                                <TextInput
                                    value={form.bank_account_holder}
                                    onChangeText={(v) => setForm(prev => ({ ...prev, bank_account_holder: v }))}
                                    style={[s.textInput, { color: textColor, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
                                    placeholder="Account holder full name"
                                    placeholderTextColor={subtextColor}
                                />

                                <Text style={[s.fieldLabel, { color: subtextColor }]}>NPWP (Tax ID)</Text>
                                <TextInput
                                    value={form.tax_id}
                                    onChangeText={(v) => setForm(prev => ({ ...prev, tax_id: v }))}
                                    keyboardType="numeric"
                                    style={[s.textInput, { color: textColor, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
                                    placeholder="NPWP Number"
                                    placeholderTextColor={subtextColor}
                                />
                            </View>
                        )}
                    </View>

                    {/* Action Buttons */}
                    <TouchableOpacity
                        onPress={() => handleSaveProfile(true)}
                        disabled={saving}
                        style={[s.primaryActionButton, { backgroundColor: '#007AFF', opacity: saving ? 0.7 : 1 }]}
                    >
                        {saving ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <>
                                <PlatformIcon name="checkmark.circle.fill" size={18} tintColor="#FFFFFF" />
                                <Text style={s.primaryActionText}>
                                    {isLifecycleReview ? 'Confirm & Complete Review' : 'Save & Update Profile'}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            )}

            {/* SURFACE 2: Required Documents Upload */}
            {isRequiredDocuments && (
                <View style={s.formSection}>
                    <Text style={[s.sectionTitle, { color: textColor }]}>Mandatory Document Checklist</Text>
                    <View style={s.documentList}>
                        {DOCUMENT_CATEGORIES.map(cat => {
                            const doc = documents.find(d => (d.document_type || d.category) === cat.id);
                            const isUp = uploadingCat === cat.id;

                            return (
                                <View
                                    key={cat.id}
                                    style={[
                                        s.documentCard,
                                        {
                                            backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                                            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                                        }
                                    ]}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                                        <View style={[s.docStatusIcon, { backgroundColor: doc ? '#34C759' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)') }]}>
                                            <PlatformIcon name={doc ? 'checkmark' : 'doc'} size={14} tintColor={doc ? '#FFFFFF' : subtextColor} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[s.docTitle, { color: textColor }]}>{cat.label}</Text>
                                            <Text style={[s.docSubtitle, { color: subtextColor }]}>
                                                {doc ? `Uploaded · ${new Date(doc.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : 'Missing / Required'}
                                            </Text>
                                        </View>
                                    </View>

                                    <TouchableOpacity
                                        onPress={() => handleUploadDocument(cat.id)}
                                        disabled={isUp}
                                        style={[s.uploadButtonPill, { backgroundColor: doc ? (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)') : '#007AFF' }]}
                                    >
                                        {isUp ? (
                                            <ActivityIndicator size="small" color="#FFFFFF" />
                                        ) : (
                                            <>
                                                <PlatformIcon name={doc ? 'arrow.triangle.2.circlepath' : 'arrow.up.circle.fill'} size={14} tintColor={doc ? textColor : '#FFFFFF'} />
                                                <Text style={[s.uploadButtonText, { color: doc ? textColor : '#FFFFFF' }]}>
                                                    {doc ? 'Replace' : 'Upload File'}
                                                </Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            );
                        })}
                    </View>
                </View>
            )}

            {/* SURFACE 3: HR Review Employment Status */}
            {isHrStatusReview && (
                <View style={s.formSection}>
                    <Text style={[s.sectionTitle, { color: textColor }]}>HR Employment Fields</Text>
                    <View style={[s.cardBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                        <View style={s.fieldStack}>
                            <Text style={[s.fieldLabel, { color: subtextColor }]}>Position / Job Title</Text>
                            <TextInput
                                value={form.position}
                                onChangeText={(v) => setForm(prev => ({ ...prev, position: v }))}
                                style={[s.textInput, { color: textColor, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
                                placeholder="Position"
                                placeholderTextColor={subtextColor}
                            />

                            <Text style={[s.fieldLabel, { color: subtextColor }]}>Department / Division</Text>
                            <TextInput
                                value={form.department}
                                onChangeText={(v) => setForm(prev => ({ ...prev, department: v }))}
                                style={[s.textInput, { color: textColor, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
                                placeholder="Department"
                                placeholderTextColor={subtextColor}
                            />

                            <Text style={[s.fieldLabel, { color: subtextColor }]}>Contract Type</Text>
                            <TextInput
                                value={form.contract_type}
                                onChangeText={(v) => setForm(prev => ({ ...prev, contract_type: v }))}
                                style={[s.textInput, { color: textColor, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
                                placeholder="PKWT / PKWTT / Freelance"
                                placeholderTextColor={subtextColor}
                            />

                            <Text style={[s.fieldLabel, { color: subtextColor }]}>Contract End Date (or Present)</Text>
                            <TextInput
                                value={form.end_date}
                                onChangeText={(v) => setForm(prev => ({ ...prev, end_date: v }))}
                                style={[s.textInput, { color: textColor, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
                                placeholder="YYYY-MM-DD or Present"
                                placeholderTextColor={subtextColor}
                            />
                        </View>
                    </View>

                    {/* Acknowledgement Option Toggle */}
                    <TouchableOpacity
                        onPress={() => {
                            Haptics.selectionAsync();
                            setRequireAck(!requireAck);
                        }}
                        style={[s.toggleRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
                    >
                        <View style={{ flex: 1 }}>
                            <Text style={[s.toggleLabel, { color: textColor }]}>Notify Employee & Require Acknowledgement</Text>
                            <Text style={[s.toggleDesc, { color: subtextColor }]}>Generates an employee Action to confirm employment update</Text>
                        </View>
                        <View style={[s.toggleSwitch, { backgroundColor: requireAck ? '#34C759' : (isDark ? 'rgba(255,255,255,0.2)' : '#D1D1D6') }]}>
                            <View style={[s.toggleKnob, { alignSelf: requireAck ? 'flex-end' : 'flex-start' }]} />
                        </View>
                    </TouchableOpacity>

                    {requireAck && (
                        <TextInput
                            value={hrNotes}
                            onChangeText={setHrNotes}
                            multiline
                            style={[s.textInput, { height: 60, marginTop: 8, color: textColor, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
                            placeholder="Add brief note for employee (e.g. Promotion to Senior Architect)..."
                            placeholderTextColor={subtextColor}
                        />
                    )}

                    <TouchableOpacity
                        onPress={() => handleSaveProfile(true)}
                        disabled={saving}
                        style={[s.primaryActionButton, { backgroundColor: '#007AFF', opacity: saving ? 0.7 : 1 }]}
                    >
                        {saving ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <>
                                <PlatformIcon name="checkmark.circle.fill" size={18} tintColor="#FFFFFF" />
                                <Text style={s.primaryActionText}>Complete Status Review</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            )}

            {/* Secondary Navigation Option: Open in People */}
            <TouchableOpacity
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    if (targetUserId) {
                        router.push(`/member-profile/${targetUserId}` as any);
                    } else {
                        router.push('/(tabs)/home/people' as any);
                    }
                }}
                style={[s.secondaryLinkButton, { borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)' }]}
            >
                <PlatformIcon name="arrow.up.right.square" size={15} tintColor="#007AFF" />
                <Text style={s.secondaryLinkText}>Open in People</Text>
            </TouchableOpacity>
        </View>
    );
};

const s = StyleSheet.create({
    container: {
        gap: 16,
        paddingTop: 4,
    },
    loadingBox: {
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    bannerCard: {
        padding: 14,
        borderRadius: 16,
        borderWidth: 1,
        gap: 10,
    },
    iconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    bannerTitle: {
        fontSize: 15,
        fontWeight: '700',
    },
    bannerSubtitle: {
        fontSize: 12,
        marginTop: 2,
    },
    badgePill: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
    },
    badgePillText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
    progressBarTrack: {
        height: 6,
        borderRadius: 3,
        backgroundColor: 'rgba(0,0,0,0.08)',
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    formSection: {
        gap: 12,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        paddingHorizontal: 2,
    },
    groupTabsScroll: {
        gap: 8,
        paddingBottom: 2,
    },
    groupTabPill: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 18,
    },
    groupTabText: {
        fontSize: 13,
    },
    cardBox: {
        padding: 14,
        borderRadius: 16,
        borderWidth: 1,
    },
    fieldStack: {
        gap: 8,
    },
    fieldLabel: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
        marginTop: 4,
    },
    textInput: {
        height: 44,
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 12,
        fontSize: 14,
        justifyContent: 'center',
    },
    primaryActionButton: {
        height: 48,
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 4,
    },
    primaryActionText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
    },
    documentList: {
        gap: 8,
    },
    documentCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
    },
    docStatusIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    docTitle: {
        fontSize: 14,
        fontWeight: '600',
    },
    docSubtitle: {
        fontSize: 12,
        marginTop: 1,
    },
    uploadButtonPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 16,
    },
    uploadButtonText: {
        fontSize: 12,
        fontWeight: '600',
    },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
    },
    toggleLabel: {
        fontSize: 14,
        fontWeight: '600',
    },
    toggleDesc: {
        fontSize: 12,
        marginTop: 2,
    },
    toggleSwitch: {
        width: 44,
        height: 26,
        borderRadius: 13,
        padding: 2,
        justifyContent: 'center',
    },
    toggleKnob: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: '#FFFFFF',
    },
    secondaryLinkButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
    },
    secondaryLinkText: {
        color: '#007AFF',
        fontSize: 14,
        fontWeight: '600',
    },
});
