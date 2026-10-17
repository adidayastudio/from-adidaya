import React, { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import {
    Host,
    BottomSheet,
    VStack,
    HStack,
    Spacer,
    Form,
    Section,
    Picker,
    TextField,
    DateTimePicker,
    Switch,
    Button,
    Image as SwiftUIImage,
    Text as SwiftUIText,
} from '@expo/ui/swift-ui';
import {
    padding,
    background,
    ignoreSafeArea,
    foregroundColor,
    tint,
    frame,
} from '@expo/ui/swift-ui/modifiers';
import { useTheme } from '@/context/ThemeContext';
import { useUserContext } from '@/context/UserProvider';
import { useTenantContext } from '@/context/TenantContext';
import { supabase } from '@/lib/supabase';
import {
    Announcement,
    AnnouncementDocument,
    AnnouncementTemplateKey,
    ANNOUNCEMENT_TEMPLATES,
    createAnnouncement,
    getAnnouncementDrafts,
    saveAnnouncementDraft,
    deleteAnnouncementDraft,
} from '@/lib/announcements';

interface CreateAnnouncementSheetProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: (newAnnouncement: Announcement) => void;
    initialDraft?: Announcement | null;
}

const TEMPLATE_KEYS: AnnouncementTemplateKey[] = [
    'general',
    'important_notice',
    'system_update',
    'policy_hr',
    'holiday',
    'site_visit',
    'birthday',
    'urgent_alert',
    'custom',
];

const SCHEDULE_TYPES = [
    'Event / Agenda',
    'Deadline / Cut-off',
    'Release Schedule',
    'Effective Date',
    'Custom',
];

const DEFAULT_DEPARTMENTS = [
    'All Departments (General)',
    'Operations',
    'Engineering',
    'Finance',
    'People & HR',
    'Design & Creative',
    'Marketing',
];

export function CreateAnnouncementSheet({
    visible,
    onClose,
    onSuccess,
    initialDraft,
}: CreateAnnouncementSheetProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#C7C7CC' : '#8E8E93';
    const sheetBg = 'clear';
    const { profile, user } = useUserContext();
    const { activeTenant, activeWorkspace } = useTenantContext();

    const [title, setTitle] = useState('');
    const [subtitle, setSubtitle] = useState('');
    const [scheduledDate, setScheduledDate] = useState(new Date(Date.now() + 86400000));
    const [scheduleTypeIndex, setScheduleTypeIndex] = useState(0);
    const [customScheduleText, setCustomScheduleText] = useState('');
    const [bodyContent, setBodyContent] = useState('');
    const [templateIndex, setTemplateIndex] = useState(0);
    const [deptIndex, setDeptIndex] = useState(0);
    const [departmentOptions, setDepartmentOptions] = useState<string[]>(DEFAULT_DEPARTMENTS);
    const [isFeatured, setIsFeatured] = useState(true);
    const [broadcastPush, setBroadcastPush] = useState(true);
    const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
    const [documents, setDocuments] = useState<AnnouncementDocument[]>([]);
    
    const [draftsList, setDraftsList] = useState<Announcement[]>([]);
    const [showDraftsView, setShowDraftsView] = useState(false);
    const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const templateOptions = TEMPLATE_KEYS.map(k => ANNOUNCEMENT_TEMPLATES[k].label);
    const selectedTemplateKey = TEMPLATE_KEYS[templateIndex] || 'general';
    const selectedDepartment = departmentOptions[deptIndex] || 'All Departments (General)';

    useEffect(() => {
        const fetchDepts = async () => {
            try {
                const { data, error } = await supabase
                    .from('organization_departments')
                    .select('id, name, code, order_index')
                    .order('order_index', { ascending: true });
                if (!error && data && data.length > 0) {
                    const dbNames = data.map((d: any) => d.name).filter(Boolean);
                    setDepartmentOptions(['All Departments (General)', ...dbNames]);
                }
            } catch (e) {
                console.warn('Failed to fetch departments in CreateAnnouncementSheet.ios', e);
            }
        };
        fetchDepts();
    }, []);

    const scheduleFooterText =
        scheduleTypeIndex === 0 ? 'Schedule for meetings, briefings, site visits, or company events.' :
        scheduleTypeIndex === 1 ? 'Cut-off deadline for team submissions, policy reviews, or forms.' :
        scheduleTypeIndex === 2 ? 'Public broadcast release date and announcement publish schedule.' :
        scheduleTypeIndex === 3 ? 'The date when policies, rules, or system changes become active.' :
        'Custom date range or flexible schedule note.';

    const loadDrafts = async () => {
        try {
            const list = await getAnnouncementDrafts();
            setDraftsList(list);
        } catch {
            // silent
        }
    };

    useEffect(() => {
        if (visible) {
            loadDrafts();
        }
    }, [visible]);

    useEffect(() => {
        if (initialDraft) {
            applyDraft(initialDraft);
        }
    }, [initialDraft]);

    const applyDraft = (draft: Announcement) => {
        setTitle(draft.title || '');
        setSubtitle(draft.subtitle || '');
        setBodyContent(draft.bodyContent || '');
        setCoverImageUrl(draft.coverImageUrl || null);
        setDocuments(draft.documents || []);
        setCurrentDraftId(draft.id);

        const tIdx = TEMPLATE_KEYS.indexOf(draft.template);
        if (tIdx >= 0) setTemplateIndex(tIdx);

        if (draft.targetDepartment) {
            const dIdx = departmentOptions.indexOf(draft.targetDepartment);
            if (dIdx >= 0) setDeptIndex(dIdx);
        }

        if (draft.duration) {
            if (draft.duration.startsWith('Event: ')) {
                setScheduleTypeIndex(0);
            } else if (draft.duration.startsWith('Deadline: ')) {
                setScheduleTypeIndex(1);
            } else if (draft.duration.startsWith('Release: ')) {
                setScheduleTypeIndex(2);
            } else if (draft.duration.startsWith('Effective: ')) {
                setScheduleTypeIndex(3);
            } else {
                setScheduleTypeIndex(4);
                setCustomScheduleText(draft.duration);
            }
        }

        setShowDraftsView(false);
    };

    const handlePickBanner = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [16, 9],
                quality: 0.85,
                base64: true,
            });

            if (!result.canceled && result.assets && result.assets[0]) {
                const asset = result.assets[0];
                const uri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
                setCoverImageUrl(uri);
            }
        } catch (e) {
            console.error('Failed to pick banner image:', e);
        }
    };

    const handlePickPhotos = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        try {
            const res = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsMultipleSelection: true,
                quality: 0.85,
                base64: true,
            });
            if (!res.canceled && res.assets && res.assets.length > 0) {
                const newDocs: AnnouncementDocument[] = res.assets.map((asset, idx) => ({
                    id: `doc-${Date.now()}-${idx}`,
                    name: asset.fileName || `Photo_${Date.now().toString().slice(-4)}_${idx + 1}.jpg`,
                    size: asset.fileSize ? `${(asset.fileSize / (1024 * 1024)).toFixed(1)} MB` : '1.5 MB',
                    type: 'image',
                    url: asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri,
                }));
                setDocuments(prev => [...prev, ...newDocs]);
            }
        } catch (e) {
            console.error('Failed to pick photos:', e);
        }
    };

    const handlePickFiles = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        try {
            const res = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/*'],
                multiple: true,
                copyToCacheDirectory: true,
            });
            if (!res.canceled && res.assets && res.assets.length > 0) {
                const newDocs: AnnouncementDocument[] = res.assets.map((asset, idx) => ({
                    id: `doc-${Date.now()}-${idx}`,
                    name: asset.name,
                    size: asset.size ? `${(asset.size / (1024 * 1024)).toFixed(1)} MB` : '1.2 MB',
                    type: (asset.mimeType?.includes('pdf') || asset.name.toLowerCase().endsWith('.pdf')) ? 'pdf' : 'image',
                    url: asset.uri,
                }));
                setDocuments(prev => [...prev, ...newDocs]);
            }
        } catch {
            setDocuments(prev => [
                ...prev,
                {
                    id: `doc-${Date.now()}`,
                    name: 'Operational_Notice_Brief.pdf',
                    size: '1.2 MB',
                    type: 'pdf',
                }
            ]);
        }
    };

    const handleAttachOptions = () => {
        Alert.alert(
            'Attach Document or Photo',
            'Choose the attachment source:',
            [
                { text: 'Browse Files (PDF / Docs)', onPress: handlePickFiles },
                { text: 'Photo Library (Images)', onPress: handlePickPhotos },
                { text: 'Cancel', style: 'cancel' },
            ]
        );
    };

    const formatScheduleDuration = (date: Date) => {
        if (scheduleTypeIndex === 4) {
            return customScheduleText.trim() || 'Custom Schedule';
        }
        const dateStr = date.toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
        const typePrefix = scheduleTypeIndex === 0 ? 'Event: ' :
                           scheduleTypeIndex === 1 ? 'Deadline: ' :
                           scheduleTypeIndex === 2 ? 'Release: ' :
                           scheduleTypeIndex === 3 ? 'Effective: ' : '';
        return `${typePrefix}${dateStr}`;
    };

    const handleSaveDraft = async () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        try {
            const draft = await saveAnnouncementDraft({
                id: currentDraftId || undefined,
                tenantId: activeTenant?.id,
                workspaceId: activeWorkspace?.id,
                title: title.trim() || 'Untitled Draft',
                subtitle: subtitle.trim(),
                duration: formatScheduleDuration(scheduledDate),
                scheduledDate: scheduledDate.toISOString(),
                template: selectedTemplateKey,
                targetDepartment: selectedDepartment,
                coverImageUrl: coverImageUrl || undefined,
                bodyContent: bodyContent.trim(),
                documents,
                isFeatured,
            });

            await loadDrafts();
            Alert.alert(
                'Draft Saved',
                `"${draft.title}" has been saved. You can load it anytime from Drafts in New Announcement.`,
                [{ text: 'OK', onPress: onClose }]
            );
        } catch (e) {
            console.error('Failed to save draft:', e);
        }
    };

    const handleSubmit = async () => {
        if (!title.trim()) {
            Alert.alert('Required Field', 'Please enter a Headline Title.');
            return;
        }

        setIsSubmitting(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        try {
            const created = await createAnnouncement({
                tenantId: activeTenant?.id,
                workspaceId: activeWorkspace?.id,
                createdBy: user?.id,
                title: title.trim(),
                subtitle: subtitle.trim() || title.trim(),
                duration: formatScheduleDuration(scheduledDate),
                scheduledDate: scheduledDate.toISOString(),
                template: selectedTemplateKey,
                targetDepartment: selectedDepartment,
                coverImageUrl: coverImageUrl || undefined,
                bodyContent: bodyContent.trim() || subtitle.trim() || title.trim(),
                authorName: profile?.full_name || profile?.nickname || 'Operations Lead',
                authorRole: profile?.role || 'Broadcast Admin',
                authorAvatarUrl: profile?.avatarUrl || (profile as any)?.avatar_url || user?.user_metadata?.avatar_url || undefined,
                isFeatured,
                documents,
            });

            if (currentDraftId) {
                await deleteAnnouncementDraft(currentDraftId);
            }

            setTitle('');
            setSubtitle('');
            setBodyContent('');
            setCoverImageUrl(null);
            setDocuments([]);
            setCurrentDraftId(null);
            onSuccess(created);
            onClose();
        } catch (e) {
            console.error('Failed to create announcement:', e);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet
                isOpened={visible}
                presentationDetents={[0.94]}
                onIsOpenedChange={(opened) => {
                    if (!opened) onClose();
                }}
            >
                <VStack spacing={0} modifiers={[
                    ignoreSafeArea({ edges: 'bottom' }),
                    background(sheetBg),
                    frame({ maxWidth: Infinity })
                ]}>
                    {/* Header */}
                    <HStack alignment="center" modifiers={[padding({ top: 18, leading: 20, trailing: 20, bottom: 8 })]}>
                        <VStack alignment="leading" spacing={2}>
                            <SwiftUIText size={22} weight="bold" color={textColor}>
                                New Announcement
                            </SwiftUIText>
                        </VStack>
                        <Spacer />
                        <HStack spacing={12}>
                            {draftsList.length > 0 && (
                                <Button
                                    systemImage={showDraftsView ? "square.and.pencil" : "folder"}
                                    variant="plain"
                                    color="#007AFF"
                                    onPress={() => setShowDraftsView(prev => !prev)}
                                >
                                    {showDraftsView ? 'Form' : `Drafts (${draftsList.length})`}
                                </Button>
                            )}
                            <Button
                                systemImage="xmark"
                                role="cancel"
                                variant="plain"
                                color="gray"
                                onPress={onClose}
                            />
                        </HStack>
                    </HStack>

                    {/* Form Content */}
                    <Form modifiers={[background(sheetBg), foregroundColor(textColor)]}>
                        {showDraftsView ? (
                            <Section title="Saved Drafts">
                                {draftsList.length === 0 ? (
                                    <HStack alignment="center" modifiers={[padding({ vertical: 8 })]}>
                                        <SwiftUIText color={subtextColor}>No saved drafts yet.</SwiftUIText>
                                    </HStack>
                                ) : (
                                    draftsList.map((draft) => (
                                        <HStack key={draft.id} alignment="center" modifiers={[padding({ vertical: 4 })]}>
                                            <SwiftUIImage systemName="doc.text" size={18} color="#007AFF" />
                                            <VStack alignment="leading" spacing={2} modifiers={[padding({ leading: 6 })]}>
                                                <SwiftUIText size={15} weight="semibold" color={textColor}>
                                                    {draft.title || 'Untitled Draft'}
                                                </SwiftUIText>
                                                <SwiftUIText size={12} color={subtextColor}>
                                                    {draft.duration} • {draft.targetDepartment || 'General'}
                                                </SwiftUIText>
                                            </VStack>
                                            <Spacer />
                                            <HStack spacing={16} alignment="center">
                                                <Button
                                                    variant="plain"
                                                    color="#007AFF"
                                                    onPress={() => applyDraft(draft)}
                                                >
                                                    Load
                                                </Button>
                                                <Button
                                                    systemImage="trash"
                                                    variant="plain"
                                                    role="destructive"
                                                    color="#FF3B30"
                                                    onPress={async () => {
                                                        await deleteAnnouncementDraft(draft.id);
                                                        await loadDrafts();
                                                    }}
                                                />
                                            </HStack>
                                        </HStack>
                                    ))
                                )}
                            </Section>
                        ) : (
                            <>
                                {/* 1. Template & Audience */}
                                <Section title="Category & Audience">
                                    <HStack alignment="center" spacing={12}>
                                        <SwiftUIImage
                                            systemName={ANNOUNCEMENT_TEMPLATES[selectedTemplateKey]?.icon || 'megaphone.fill'}
                                            size={20}
                                            color={ANNOUNCEMENT_TEMPLATES[selectedTemplateKey]?.accent || '#007AFF'}
                                        />
                                        <Picker
                                            label="Template Category"
                                            options={templateOptions}
                                            selectedIndex={templateIndex}
                                            onOptionSelected={(e) => setTemplateIndex(e.nativeEvent.index)}
                                            variant="menu"
                                            color={textColor}
                                            modifiers={[tint(isDark ? '#007AFF' : '#1C1C1E')]}
                                        />
                                    </HStack>

                                    <Picker
                                        label="Target Department"
                                        options={departmentOptions}
                                        selectedIndex={deptIndex}
                                        onOptionSelected={(e) => setDeptIndex(e.nativeEvent.index)}
                                        variant="menu"
                                        color={textColor}
                                        modifiers={[tint(isDark ? '#007AFF' : '#1C1C1E')]}
                                    />
                                </Section>

                                {/* 2. Announcement Content */}
                                <Section title="Announcement Content">
                                    <TextField
                                        placeholder="Headline Title"
                                        defaultValue={title}
                                        onChangeText={setTitle}
                                        modifiers={[tint('#007AFF')]}
                                    />
                                    <TextField
                                        placeholder="Subtitle / Short Summary"
                                        defaultValue={subtitle}
                                        onChangeText={setSubtitle}
                                        multiline
                                        modifiers={[tint('#007AFF')]}
                                    />
                                </Section>

                                {/* 3. Schedule Date & Time */}
                                <Section title="Schedule" footer={scheduleFooterText}>
                                    <Picker
                                        label="Schedule Type"
                                        options={SCHEDULE_TYPES}
                                        selectedIndex={scheduleTypeIndex}
                                        onOptionSelected={(e) => setScheduleTypeIndex(e.nativeEvent.index)}
                                        variant="menu"
                                        color={textColor}
                                        modifiers={[tint(isDark ? '#007AFF' : '#1C1C1E')]}
                                    />

                                    {scheduleTypeIndex === 4 ? (
                                        <TextField
                                            placeholder="Custom Schedule (e.g. Every Monday, 09:00 AM)"
                                            defaultValue={customScheduleText}
                                            onChangeText={setCustomScheduleText}
                                            modifiers={[tint('#007AFF')]}
                                        />
                                    ) : (
                                        <DateTimePicker
                                            title="Date & Time"
                                            initialDate={scheduledDate.toISOString()}
                                            onDateSelected={(date) => setScheduledDate(date)}
                                            variant="compact"
                                            displayedComponents="dateAndTime"
                                            color={textColor}
                                        />
                                    )}
                                </Section>

                                {/* 4. Full Extended Description */}
                                <Section title="Full Announcement Description">
                                    <TextField
                                        placeholder="Write detailed announcements, operational rundown, team actions, and guidelines here..."
                                        defaultValue={bodyContent}
                                        onChangeText={setBodyContent}
                                        multiline
                                        modifiers={[tint('#007AFF')]}
                                    />
                                </Section>

                                {/* 5. Custom Banner */}
                                <Section title="Custom Banner Cover (Optional)">
                                    <Button
                                        systemImage={coverImageUrl ? "photo" : "photo.badge.plus"}
                                        variant="plain"
                                        color="#007AFF"
                                        onPress={handlePickBanner}
                                    >
                                        {coverImageUrl ? "Change Custom Banner (16:9)" : "Upload Banner"}
                                    </Button>

                                    {coverImageUrl && (
                                        <Button
                                            variant="plain"
                                            onPress={() => setCoverImageUrl(null)}
                                        >
                                            <HStack spacing={10} alignment="center">
                                                <SwiftUIImage systemName="trash" size={16} color="#FF3B30" />
                                                <SwiftUIText color="#FF3B30" size={15} weight="regular">
                                                    Remove Custom Banner
                                                </SwiftUIText>
                                            </HStack>
                                        </Button>
                                    )}
                                </Section>

                                {/* 6. Attachments & Distribution */}
                                <Section title="Attachments & Distribution">
                                    <Switch
                                        label="Broadcast Push Notification"
                                        value={broadcastPush}
                                        onValueChange={setBroadcastPush}
                                        color="#007AFF"
                                    />

                                    <Switch
                                        label="Pin on Home Brief"
                                        value={isFeatured}
                                        onValueChange={setIsFeatured}
                                        color="#007AFF"
                                    />

                                    <Button
                                        systemImage="paperclip"
                                        variant="plain"
                                        color="#007AFF"
                                        onPress={handleAttachOptions}
                                    >
                                        {documents.length > 0 ? "Attach More (Files / Photos)" : "Attach Documents (PDF / Photos)"}
                                    </Button>

                                    {documents.map((doc, idx) => (
                                        <HStack key={doc.id || idx} alignment="center" modifiers={[padding({ vertical: 3 })]}>
                                            <SwiftUIImage
                                                systemName={doc.type === 'image' ? 'photo' : 'doc.text'}
                                                size={16}
                                                color={subtextColor}
                                            />
                                            <VStack alignment="leading" spacing={1}>
                                                <SwiftUIText size={14} weight="medium" color={textColor}>
                                                    {doc.name}
                                                </SwiftUIText>
                                                <SwiftUIText size={11} color={subtextColor}>
                                                    {doc.size}
                                                </SwiftUIText>
                                            </VStack>
                                            <Spacer />
                                            <Button
                                                variant="plain"
                                                onPress={() => setDocuments(prev => prev.filter((_, i) => i !== idx))}
                                            >
                                                <SwiftUIImage systemName="trash" size={15} color="#FF3B30" />
                                            </Button>
                                        </HStack>
                                    ))}
                                </Section>
                            </>
                        )}
                    </Form>

                    {/* Sticky Bottom Actions */}
                    {!showDraftsView && (
                        <HStack spacing={12} modifiers={[
                            padding({ leading: 20, trailing: 20, top: 12, bottom: 34 }),
                            frame({ maxWidth: Infinity })
                        ]}>
                            <Button
                                variant="glass"
                                color="gray"
                                disabled={isSubmitting}
                                onPress={handleSaveDraft}
                            >
                                <HStack modifiers={[frame({ maxWidth: Infinity }), frame({ height: 44 })]}>
                                    <Spacer />
                                    <SwiftUIText size={16} weight="semibold" color={textColor} lineLimit={1}>
                                        Save as Draft
                                    </SwiftUIText>
                                    <Spacer />
                                </HStack>
                            </Button>

                            <Button
                                variant="glassProminent"
                                color="#007AFF"
                                disabled={isSubmitting}
                                onPress={handleSubmit}
                            >
                                <HStack modifiers={[frame({ maxWidth: Infinity }), frame({ height: 44 })]}>
                                    <Spacer />
                                    <SwiftUIText size={16} weight="semibold" color="#FFFFFF" lineLimit={1}>
                                        {isSubmitting ? "Posting..." : "Post"}
                                    </SwiftUIText>
                                    <Spacer />
                                </HStack>
                            </Button>
                        </HStack>
                    )}
                </VStack>
            </BottomSheet>
        </Host>
    );
}
