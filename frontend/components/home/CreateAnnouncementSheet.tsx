import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    ScrollView,
    TextInput,
    Alert,
    Platform,
    KeyboardAvoidingView,
    Switch,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, interpolateColor } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { LiquidDatePicker } from '@/components/ui/LiquidDatePicker';
import ContextMenu, { ContextMenuAction } from '@/components/ui/PlatformContextMenu';
import { Colors } from '@/constants/theme';
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

const DEFAULT_DEPARTMENTS = [
    'All Departments (General)',
    'Operations',
    'Engineering',
    'Finance',
    'People & HR',
    'Design & Creative',
    'Marketing',
];

const SCHEDULE_TYPES = [
    'Event / Agenda',
    'Deadline / Cut-off',
    'Release Schedule',
    'Effective Date',
    'Custom',
];

function IOSToggle({
    value,
    onValueChange,
    disabled = false,
}: {
    value: boolean;
    onValueChange: (val: boolean) => void;
    disabled?: boolean;
}) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const offBg = isDark ? '#39393D' : '#E5E5EA';
    const onBg = '#34C759';

    const offset = useSharedValue(value ? 1 : 0);

    useEffect(() => {
        offset.value = withSpring(value ? 1 : 0, {
            damping: 18,
            stiffness: 240,
            mass: 0.8,
        });
    }, [value]);

    const trackStyle = useAnimatedStyle(() => {
        const backgroundColor = interpolateColor(
            offset.value,
            [0, 1],
            [offBg, onBg]
        );
        return {
            backgroundColor,
        };
    });

    const thumbStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateX: offset.value * 20 }],
        };
    });

    return (
        <TouchableOpacity
            activeOpacity={0.9}
            disabled={disabled}
            onPress={() => {
                Haptics.selectionAsync();
                onValueChange(!value);
            }}
        >
            <Animated.View
                style={[
                    styles.iosToggleTrack,
                    trackStyle,
                    disabled && { opacity: 0.5 },
                ]}
            >
                <Animated.View
                    style={[
                        styles.iosToggleThumb,
                        thumbStyle,
                    ]}
                />
            </Animated.View>
        </TouchableOpacity>
    );
}

function PulldownRow({
    children,
    title,
    actions,
    options,
    selectedValue,
    onSelect,
    onSelectIndex,
}: {
    children: React.ReactNode;
    title: string;
    actions: ContextMenuAction[];
    options: { value: string; label: string }[];
    selectedValue: string;
    onSelect: (val: string) => void;
    onSelectIndex?: (idx: number) => void;
}) {
    if (Platform.OS === 'web') {
        return (
            <View style={{ position: 'relative', width: '100%' }}>
                {children}
                <select
                    value={selectedValue}
                    onChange={(e: any) => {
                        Haptics.selectionAsync();
                        const val = e.target.value;
                        onSelect(val);
                        if (onSelectIndex) {
                            const foundIdx = options.findIndex(o => o.value === val);
                            if (foundIdx >= 0) onSelectIndex(foundIdx);
                        }
                    }}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        opacity: 0,
                        cursor: 'pointer',
                        zIndex: 10,
                    }}
                >
                    {options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
            </View>
        );
    }

    return (
        <ContextMenu
            title={title}
            actions={actions}
            dropdownMenuMode={true}
            onPress={(e) => {
                if (onSelectIndex) {
                    onSelectIndex(e.nativeEvent.index);
                } else if (options[e.nativeEvent.index]) {
                    onSelect(options[e.nativeEvent.index].value);
                }
            }}
        >
            {children}
        </ContextMenu>
    );
}

export function CreateAnnouncementSheet({
    visible,
    onClose,
    onSuccess,
    initialDraft,
}: CreateAnnouncementSheetProps) {
    const insets = useSafeAreaInsets();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';
    const { profile, user } = useUserContext();
    const { activeTenant, activeWorkspace } = useTenantContext();

    const [title, setTitle] = useState('');
    const [subtitle, setSubtitle] = useState('');
    const [selectedDateObj, setSelectedDateObj] = useState<Date>(new Date(Date.now() + 86400000));
    const [scheduleTypeIndex, setScheduleTypeIndex] = useState(0);
    const [customScheduleText, setCustomScheduleText] = useState('');
    const [bodyContent, setBodyContent] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState<AnnouncementTemplateKey>('general');
    const [selectedDept, setSelectedDept] = useState('All Departments (General)');
    const [departmentOptions, setDepartmentOptions] = useState<string[]>(DEFAULT_DEPARTMENTS);
    const [isFeatured, setIsFeatured] = useState(true);
    const [broadcastPush, setBroadcastPush] = useState(true);
    const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
    const [documents, setDocuments] = useState<AnnouncementDocument[]>([]);
    
    const [draftsList, setDraftsList] = useState<Announcement[]>([]);
    const [showDraftsModal, setShowDraftsModal] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch real departments from DB
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
                console.warn('Failed to fetch departments for CreateAnnouncementSheet', e);
            }
        };
        fetchDepts();
    }, []);

    // Pulldown context menu actions
    const templateActions: ContextMenuAction[] = useMemo(() => {
        return TEMPLATE_KEYS.map((key) => ({
            title: ANNOUNCEMENT_TEMPLATES[key].label,
            systemIcon: ANNOUNCEMENT_TEMPLATES[key].icon as any,
            state: selectedTemplate === key ? 'on' : 'off',
        }));
    }, [selectedTemplate]);

    const departmentActions: ContextMenuAction[] = useMemo(() => {
        return departmentOptions.map((dept) => ({
            title: dept,
            systemIcon: 'person.2',
            state: selectedDept === dept ? 'on' : 'off',
        }));
    }, [departmentOptions, selectedDept]);

    const scheduleTypeActions: ContextMenuAction[] = useMemo(() => {
        return SCHEDULE_TYPES.map((sType, idx) => ({
            title: sType,
            systemIcon: idx === 0 ? 'calendar' : idx === 1 ? 'clock' : idx === 2 ? 'megaphone' : idx === 3 ? 'checkmark.circle' : 'pencil',
            state: scheduleTypeIndex === idx ? 'on' : 'off',
        }));
    }, [scheduleTypeIndex]);

    // Select options for web dropdown
    const templateSelectOptions = useMemo(() => {
        return TEMPLATE_KEYS.map((k) => ({
            value: k,
            label: ANNOUNCEMENT_TEMPLATES[k].label,
        }));
    }, []);

    const departmentSelectOptions = useMemo(() => {
        return departmentOptions.map((dept) => ({
            value: dept,
            label: dept,
        }));
    }, [departmentOptions]);

    const scheduleSelectOptions = useMemo(() => {
        return SCHEDULE_TYPES.map((sType, idx) => ({
            value: String(idx),
            label: sType,
        }));
    }, []);

    const attachActions: ContextMenuAction[] = [
        {
            title: 'Photo Library (Images)',
            systemIcon: 'photo',
        },
        {
            title: 'Browse Files (PDF / Docs)',
            systemIcon: 'folder',
        },
    ];

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
        setDuration(draft.duration || 'Tomorrow, 09:00 AM');
        setBodyContent(draft.bodyContent || '');
        setSelectedTemplate(draft.template || 'general');
        setSelectedDept(draft.targetDepartment || 'All Departments (General)');
        setCoverImageUrl(draft.coverImageUrl || null);
        setDocuments(draft.documents || []);
        setCurrentDraftId(draft.id);
        setShowDraftsModal(false);
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

    const handleDateSelected = (dateStr: string, timeStr?: string) => {
        const [y, m, d] = dateStr.split('-');
        let hours = 9;
        let mins = 0;
        if (timeStr) {
            const clean = timeStr.trim();
            const isPM = /PM/i.test(clean);
            const isAM = /AM/i.test(clean);
            const numPart = clean.replace(/(AM|PM)/i, '').trim();
            const [hStr, mStr] = numPart.split(':');
            hours = parseInt(hStr || '9', 10);
            mins = parseInt(mStr || '0', 10);
            if (isPM && hours < 12) hours += 12;
            if (isAM && hours === 12) hours = 0;
        }
        const dateObj = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10), hours, mins);
        setSelectedDateObj(dateObj);
        setShowDatePicker(false);
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
                duration: formatScheduleDuration(selectedDateObj),
                scheduledDate: selectedDateObj.toISOString(),
                template: selectedTemplate,
                targetDepartment: selectedDept,
                coverImageUrl: coverImageUrl || undefined,
                bodyContent: bodyContent.trim(),
                documents,
                isFeatured,
            });

            await loadDrafts();
            Alert.alert(
                'Draft Saved',
                `"${draft.title}" has been saved to your drafts.`,
                [{ text: 'OK', onPress: onClose }]
            );
        } catch (e) {
            console.error('Failed to save draft:', e);
        }
    };

    const handleSubmit = async () => {
        if (!title.trim()) {
            Alert.alert('Required Field', 'Please provide a Headline Title.');
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
                duration: formatScheduleDuration(selectedDateObj),
                scheduledDate: selectedDateObj.toISOString(),
                template: selectedTemplate,
                targetDepartment: selectedDept,
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
            setSelectedDateObj(new Date(Date.now() + 86400000));
            setScheduleTypeIndex(0);
            setCustomScheduleText('');
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

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            statusBarTranslucent
            navigationBarTranslucent
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.modalOverlay}
            >
                <TouchableOpacity
                    style={styles.backdrop}
                    activeOpacity={1}
                    onPress={onClose}
                />

                <View style={[
                    styles.drawerContainer,
                    { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' }
                ]}>
                    <View style={styles.header}>
                        <Text style={[styles.headerTitle, { color: textColor }]}>
                            New Announcement
                        </Text>
                        <View style={styles.headerRightActions}>
                            {draftsList.length > 0 && (
                                <TouchableOpacity
                                    onPress={() => setShowDraftsModal(true)}
                                    style={[
                                        styles.draftsPillBtn,
                                        { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }
                                    ]}
                                    activeOpacity={0.7}
                                >
                                    <PlatformIcon name="doc.text" size={13} tintColor="#0036F8" />
                                    <Text style={styles.draftsPillText}>
                                        Drafts ({draftsList.length})
                                    </Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity
                                onPress={onClose}
                                style={[
                                    styles.closeCircleBtn,
                                    { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }
                                ]}
                                activeOpacity={0.7}
                            >
                                <PlatformIcon name="xmark" size={14} tintColor={isDark ? '#A1A1AA' : '#64748B'} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <ScrollView
                        style={styles.scroll}
                        contentContainerStyle={[styles.scrollContent, { paddingBottom: 24 }]}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        <Text style={styles.sectionHeader}>Template Category</Text>
                        <View style={[styles.cardSection, isDark ? styles.cardDark : styles.cardLight]}>
                            <PulldownRow
                                title="Select Template Category"
                                actions={templateActions}
                                options={templateSelectOptions}
                                selectedValue={selectedTemplate}
                                onSelect={(val) => setSelectedTemplate(val as AnnouncementTemplateKey)}
                            >
                                <View style={styles.listRow}>
                                    <View style={styles.rowLeft}>
                                        <PlatformIcon
                                            name={ANNOUNCEMENT_TEMPLATES[selectedTemplate]?.icon as any || "doc.text.fill"}
                                            size={17}
                                            tintColor={ANNOUNCEMENT_TEMPLATES[selectedTemplate]?.accent || "#0036F8"}
                                        />
                                        <Text style={[styles.rowLabel, { color: textColor }]}>Category</Text>
                                    </View>
                                    <View style={styles.rowRight}>
                                        <Text style={[styles.rowValueText, { color: ANNOUNCEMENT_TEMPLATES[selectedTemplate]?.accent || '#0036F8', fontWeight: '600' }]}>
                                            {ANNOUNCEMENT_TEMPLATES[selectedTemplate]?.label || 'General'}
                                        </Text>
                                        <PlatformIcon name="chevron.down" size={13} tintColor="#8E8E93" />
                                    </View>
                                </View>
                            </PulldownRow>
                        </View>

                        <Text style={styles.sectionHeader}>Target Audience</Text>
                        <View style={[styles.cardSection, isDark ? styles.cardDark : styles.cardLight]}>
                            <PulldownRow
                                title="Select Target Department"
                                actions={departmentActions}
                                options={departmentSelectOptions}
                                selectedValue={selectedDept}
                                onSelect={(val) => setSelectedDept(val)}
                            >
                                <View style={styles.listRow}>
                                    <View style={styles.rowLeft}>
                                        <PlatformIcon name="person.2" size={17} tintColor={isDark ? '#A1A1AA' : '#64748B'} />
                                        <Text style={[styles.rowLabel, { color: textColor }]}>Department</Text>
                                    </View>
                                    <View style={styles.rowRight}>
                                        <Text style={[styles.rowValueText, { color: '#0036F8', fontWeight: '500' }]}>
                                            {selectedDept}
                                        </Text>
                                        <PlatformIcon name="chevron.down" size={13} tintColor="#8E8E93" />
                                    </View>
                                </View>
                            </PulldownRow>
                        </View>

                        <Text style={styles.sectionHeader}>Announcement Content</Text>
                        <View style={[styles.cardSection, isDark ? styles.cardDark : styles.cardLight]}>
                            <TextInput
                                style={[styles.textInputRow, { color: textColor }]}
                                placeholder="Headline Title"
                                placeholderTextColor={subtextColor}
                                value={title}
                                onChangeText={setTitle}
                            />
                            <View style={[styles.innerDivider, isDark ? styles.borderDark : styles.borderLight]} />
                            <TextInput
                                style={[styles.textInputRow, { color: textColor, minHeight: 60, paddingVertical: 10 }]}
                                placeholder="Subtitle / Summary key takeaway..."
                                placeholderTextColor={subtextColor}
                                multiline
                                numberOfLines={2}
                                value={subtitle}
                                onChangeText={setSubtitle}
                            />
                        </View>

                        <Text style={styles.sectionHeader}>Schedule</Text>
                        <View style={[styles.cardSection, isDark ? styles.cardDark : styles.cardLight]}>
                            {/* Schedule Type Dropdown */}
                            <PulldownRow
                                title="Select Schedule Type"
                                actions={scheduleTypeActions}
                                options={scheduleSelectOptions}
                                selectedValue={String(scheduleTypeIndex)}
                                onSelect={(val) => setScheduleTypeIndex(parseInt(val, 10))}
                                onSelectIndex={(idx) => setScheduleTypeIndex(idx)}
                            >
                                <View style={styles.listRow}>
                                    <View style={styles.rowLeft}>
                                        <PlatformIcon name="clock" size={17} tintColor={isDark ? '#A1A1AA' : '#64748B'} />
                                        <Text style={[styles.rowLabel, { color: textColor }]}>Schedule Type</Text>
                                    </View>
                                    <View style={styles.rowRight}>
                                        <Text style={[styles.rowValueText, { color: '#0036F8', fontWeight: '600' }]}>
                                            {SCHEDULE_TYPES[scheduleTypeIndex]}
                                        </Text>
                                        <PlatformIcon name="chevron.down" size={13} tintColor="#8E8E93" />
                                    </View>
                                </View>
                            </PulldownRow>

                            <View style={[styles.innerDivider, isDark ? styles.borderDark : styles.borderLight]} />

                            {scheduleTypeIndex === 4 ? (
                                <TextInput
                                    style={[styles.textInputRow, { color: textColor }]}
                                    placeholder="Custom Schedule (e.g. Every Monday, 09:00 AM)"
                                    placeholderTextColor={subtextColor}
                                    value={customScheduleText}
                                    onChangeText={setCustomScheduleText}
                                />
                            ) : (
                                <TouchableOpacity
                                    onPress={() => setShowDatePicker(true)}
                                    style={styles.listRow}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.rowLeft}>
                                        <PlatformIcon name="calendar" size={17} tintColor={isDark ? '#A1A1AA' : '#64748B'} />
                                        <Text style={[styles.rowLabel, { color: textColor }]}>Date & Time</Text>
                                    </View>
                                    <View style={styles.rowRight}>
                                        <Text style={[styles.rowValueText, { color: '#0036F8', fontWeight: '600' }]}>
                                            {formatScheduleDuration(selectedDateObj)}
                                        </Text>
                                        <PlatformIcon name="chevron.right" size={14} tintColor="#8E8E93" />
                                    </View>
                                </TouchableOpacity>
                            )}

                            <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
                                <Text style={{ fontSize: 12, color: subtextColor }}>
                                    {scheduleTypeIndex === 0 ? 'Schedule for meetings, briefings, site visits, or company events.' :
                                     scheduleTypeIndex === 1 ? 'Cut-off deadline for team submissions, policy reviews, or forms.' :
                                     scheduleTypeIndex === 2 ? 'Public broadcast release date and announcement publish schedule.' :
                                     scheduleTypeIndex === 3 ? 'The date when policies, rules, or system changes become active.' :
                                     'Custom date range or flexible schedule note.'}
                                </Text>
                            </View>
                        </View>

                        <Text style={styles.sectionHeader}>Full Announcement Description</Text>
                        <View style={[styles.cardSection, isDark ? styles.cardDark : styles.cardLight]}>
                            <TextInput
                                style={[styles.multilineInput, { color: textColor }]}
                                placeholder="Write detailed announcements, operational rundown, team actions, and multi-paragraph guidelines here..."
                                placeholderTextColor={subtextColor}
                                multiline
                                numberOfLines={6}
                                value={bodyContent}
                                onChangeText={setBodyContent}
                            />
                        </View>

                        <Text style={styles.sectionHeader}>Custom Banner Cover (Optional)</Text>
                        <View style={[styles.cardSection, isDark ? styles.cardDark : styles.cardLight]}>
                            {coverImageUrl ? (
                                <View style={styles.bannerPreviewContainer}>
                                    <Image
                                        source={{ uri: coverImageUrl }}
                                        style={styles.bannerPreviewImg}
                                        resizeMode="cover"
                                    />
                                    <View style={styles.bannerActionsRow}>
                                        <TouchableOpacity
                                            onPress={handlePickBanner}
                                            style={[styles.bannerActionBtn, { backgroundColor: '#0036F8' }]}
                                        >
                                            <PlatformIcon name="photo" size={13} tintColor="#FFFFFF" />
                                            <Text style={styles.bannerActionBtnText}>Change Banner</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => setCoverImageUrl(null)}
                                            style={[styles.bannerActionBtn, { backgroundColor: 'rgba(255,59,48,0.1)' }]}
                                        >
                                            <PlatformIcon name="trash" size={13} tintColor="#FF3B30" />
                                            <Text style={[styles.bannerActionBtnText, { color: '#FF3B30' }]}>Remove</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ) : (
                                <TouchableOpacity
                                    onPress={handlePickBanner}
                                    style={styles.uploadBannerBtn}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.uploadIconCircle, isDark ? styles.pillDark : styles.pillLight]}>
                                        <PlatformIcon name="photo.badge.plus" size={20} tintColor="#0036F8" />
                                    </View>
                                    <View style={{ gap: 2 }}>
                                        <Text style={[styles.uploadBannerTitle, { color: textColor }]}>
                                             Upload Custom Banner (16:9)
                                        </Text>
                                        <Text style={styles.uploadBannerSubtitle}>
                                            PNG, JPG up to 10 MB recommended
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            )}
                        </View>

                        <Text style={styles.sectionHeader}>Attachments & Distribution</Text>
                        <View style={[styles.cardSection, isDark ? styles.cardDark : styles.cardLight]}>
                            <View style={styles.listRow}>
                                <View style={styles.rowLeft}>
                                    <PlatformIcon name="bell.badge" size={17} tintColor={isDark ? '#A1A1AA' : '#64748B'} />
                                    <Text style={[styles.rowLabel, { color: textColor }]}>Broadcast Push Notification</Text>
                                </View>
                                <IOSToggle
                                    value={broadcastPush}
                                    onValueChange={setBroadcastPush}
                                />
                            </View>

                            <View style={[styles.innerDivider, isDark ? styles.borderDark : styles.borderLight]} />

                            <View style={styles.listRow}>
                                <View style={styles.rowLeft}>
                                    <PlatformIcon name="star" size={17} tintColor={isDark ? '#A1A1AA' : '#64748B'} />
                                    <Text style={[styles.rowLabel, { color: textColor }]}>Pin on Home Brief</Text>
                                </View>
                                <IOSToggle
                                    value={isFeatured}
                                    onValueChange={setIsFeatured}
                                />
                            </View>

                            <View style={[styles.innerDivider, isDark ? styles.borderDark : styles.borderLight]} />

                            <ContextMenu
                                actions={attachActions}
                                dropdownMenuMode={true}
                                onPress={(e) => {
                                    Haptics.selectionAsync();
                                    if (e.nativeEvent.index === 0) {
                                        handlePickPhotos();
                                    } else if (e.nativeEvent.index === 1) {
                                        handlePickFiles();
                                    }
                                }}
                            >
                                <View style={styles.attachBtnRow}>
                                    <View style={styles.rowLeft}>
                                        <PlatformIcon name="paperclip" size={17} tintColor="#0036F8" />
                                        <Text style={[styles.attachBtnText, { color: '#0036F8' }]}>
                                            Attach Documents (PDF / Photos)
                                        </Text>
                                    </View>
                                    <PlatformIcon name="plus" size={17} tintColor="#0036F8" />
                                </View>
                            </ContextMenu>

                            {documents.length > 0 && (
                                <View style={styles.docsListContainer}>
                                    {documents.map((doc, idx) => (
                                        <View key={doc.id || idx} style={[styles.docItemRow, isDark ? styles.docItemDark : styles.docItemLight]}>
                                            <PlatformIcon
                                                name={doc.type === 'image' ? 'photo' : 'doc.text'}
                                                size={16}
                                                tintColor={isDark ? '#A1A1AA' : '#64748B'}
                                            />
                                            <View style={{ flex: 1, gap: 1 }}>
                                                <Text style={[styles.docItemName, { color: textColor }]} numberOfLines={1}>
                                                    {doc.name}
                                                </Text>
                                                <Text style={styles.docItemSize}>{doc.size}</Text>
                                            </View>
                                            <TouchableOpacity
                                                onPress={() => setDocuments(prev => prev.filter((_, i) => i !== idx))}
                                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                            >
                                                <PlatformIcon name="trash" size={15} tintColor="#FF3B30" />
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>
                    </ScrollView>

                    {/* Sticky Action Buttons Footer */}
                    <View style={[
                        styles.stickyFooter,
                        {
                            paddingBottom: Math.max(insets.bottom, 16) + (Platform.OS === 'android' ? 14 : 10),
                        }
                    ]}>
                        <View style={styles.btnRow}>
                            <TouchableOpacity
                                style={[
                                    styles.draftBtn,
                                    {
                                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                                        borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                                    }
                                ]}
                                onPress={handleSaveDraft}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.draftBtnText, { color: textColor }]}>
                                    Save as Draft
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.submitBtn, { backgroundColor: '#0036F8' }]}
                                onPress={handleSubmit}
                                activeOpacity={0.8}
                                disabled={isSubmitting}
                            >
                                <Text style={styles.submitBtnText}>
                                    Post
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {showDraftsModal && (
                    <Modal
                        visible={showDraftsModal}
                        transparent
                        animationType="fade"
                        onRequestClose={() => setShowDraftsModal(false)}
                    >
                        <View style={styles.draftsModalOverlay}>
                            <View style={[styles.draftsModalBox, { backgroundColor: isDark ? '#27272A' : '#FFFFFF' }]}>
                                <View style={styles.draftsModalHeader}>
                                    <Text style={[styles.draftsModalTitle, { color: textColor }]}>
                                        Saved Drafts ({draftsList.length})
                                    </Text>
                                    <TouchableOpacity
                                        onPress={() => setShowDraftsModal(false)}
                                        style={[
                                            styles.closeCircleBtn,
                                            { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }
                                        ]}
                                        activeOpacity={0.7}
                                    >
                                        <PlatformIcon name="xmark" size={13} tintColor={isDark ? '#A1A1AA' : '#64748B'} />
                                    </TouchableOpacity>
                                </View>

                                <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
                                    {draftsList.map((draft, idx) => (
                                        <View
                                            key={draft.id || idx}
                                            style={styles.draftItemRow}
                                        >
                                            <TouchableOpacity
                                                onPress={() => applyDraft(draft)}
                                                style={{ flex: 1, gap: 3 }}
                                                activeOpacity={0.7}
                                            >
                                                <Text style={[styles.draftItemTitle, { color: textColor }]} numberOfLines={1}>
                                                    {draft.title || 'Untitled Draft'}
                                                </Text>
                                                <Text style={styles.draftItemMeta}>
                                                    {draft.duration} • {draft.targetDepartment || 'General'}
                                                </Text>
                                            </TouchableOpacity>

                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                                <TouchableOpacity
                                                    onPress={async () => {
                                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                                        await deleteAnnouncementDraft(draft.id);
                                                        await loadDrafts();
                                                    }}
                                                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                                                    style={styles.draftDeleteBtn}
                                                >
                                                    <PlatformIcon name="trash" size={16} tintColor="#FF3B30" />
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    onPress={() => applyDraft(draft)}
                                                    hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                                                >
                                                    <PlatformIcon name="chevron.right" size={14} tintColor="#8E8E93" />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    ))}
                                </ScrollView>
                            </View>
                        </View>
                    </Modal>
                )}

                <LiquidDatePicker
                    visible={showDatePicker}
                    onClose={() => setShowDatePicker(false)}
                    onSelect={handleDateSelected}
                    title="Select Schedule Date & Time"
                />
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.45)',
    },
    drawerContainer: {
        height: '92%',
        maxWidth: 640,
        width: '100%',
        alignSelf: 'center',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.15,
                shadowRadius: 16,
            },
            android: {
                elevation: 0,
            },
        }),
    },
    grabber: {
        width: 36,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: 'rgba(120,120,128,0.3)',
        alignSelf: 'center',
        marginTop: 8,
        marginBottom: 4,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 18,
        paddingBottom: 14,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    headerRightActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    draftsPillBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        height: 34,
        paddingHorizontal: 12,
        borderRadius: 17,
    },
    draftsPillText: {
        fontSize: 12.5,
        fontWeight: '700',
        color: '#0036F8',
    },
    closeCircleBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 6,
        gap: 6,
    },
    sectionHeader: {
        fontSize: 13,
        fontWeight: '600',
        color: '#8E8E93',
        letterSpacing: 0,
        marginTop: 14,
        marginBottom: 6,
        marginLeft: 4,
    },
    cardSection: {
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.03,
                shadowRadius: 6,
            },
            android: {
                elevation: 0,
            },
        }),
    },
    cardLight: {
        backgroundColor: '#FFFFFF',
        borderColor: 'rgba(0,0,0,0.06)',
    },
    cardDark: {
        backgroundColor: '#27272A',
        borderColor: 'rgba(255,255,255,0.08)',
    },
    listRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 13,
    },
    rowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    rowRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    rowLabel: {
        fontSize: 15,
        fontWeight: '600',
    },
    rowValueText: {
        fontSize: 14.5,
        fontWeight: '500',
    },
    innerDivider: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 16,
    },
    borderLight: {
        borderBottomColor: 'rgba(0,0,0,0.06)',
        backgroundColor: 'rgba(0,0,0,0.06)',
    },
    borderDark: {
        borderBottomColor: 'rgba(255,255,255,0.08)',
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    deptDropdown: {
        borderTopWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    dropdownLight: {
        backgroundColor: '#FFFFFF',
        borderTopColor: 'rgba(0,0,0,0.06)',
    },
    dropdownDark: {
        backgroundColor: '#27272A',
        borderTopColor: 'rgba(255,255,255,0.08)',
    },
    deptItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 11,
    },
    deptItemBorder: {
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    deptItemText: {
        fontSize: 14,
    },
    textInputRow: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 15,
        fontWeight: '500',
    },
    multilineInput: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 15,
        minHeight: 120,
        textAlignVertical: 'top',
    },
    uploadBannerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    uploadIconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    uploadBannerTitle: {
        fontSize: 14.5,
        fontWeight: '700',
    },
    uploadBannerSubtitle: {
        fontSize: 12,
        color: '#8E8E93',
    },
    bannerPreviewContainer: {
        padding: 12,
        gap: 10,
    },
    bannerPreviewImg: {
        width: '100%',
        height: 140,
        borderRadius: 14,
    },
    bannerActionsRow: {
        flexDirection: 'row',
        gap: 8,
    },
    bannerActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 12,
    },
    bannerActionBtnText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
    },
    attachBtnRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    attachBtnText: {
        fontSize: 15,
        fontWeight: '700',
    },
    docsListContainer: {
        paddingHorizontal: 12,
        paddingBottom: 12,
        gap: 6,
    },
    docItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
    },
    docItemLight: {
        backgroundColor: 'rgba(0,0,0,0.03)',
    },
    docItemDark: {
        backgroundColor: 'rgba(255,255,255,0.04)',
    },
    docItemName: {
        fontSize: 13.5,
        fontWeight: '600',
    },
    docItemSize: {
        fontSize: 11.5,
        color: '#8E8E93',
    },
    stickyFooter: {
        width: '100%',
        paddingHorizontal: 16,
        paddingTop: 16,
        backgroundColor: 'transparent',
        borderTopWidth: 0,
    },
    btnRow: {
        flexDirection: 'row',
        gap: 10,
    },
    draftBtn: {
        flex: 1,
        height: 50,
        borderRadius: 25,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    draftBtnText: {
        fontSize: 15,
        fontWeight: '700',
    },
    submitBtn: {
        flex: 1.4,
        height: 50,
        borderRadius: 25,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    submitBtnText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '800',
    },
    draftsModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    draftsModalBox: {
        width: '100%',
        maxWidth: 420,
        borderRadius: 24,
        padding: 20,
        gap: 12,
    },
    draftsModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    draftsModalTitle: {
        fontSize: 17,
        fontWeight: '800',
    },
    draftItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        paddingHorizontal: 10,
        backgroundColor: 'transparent',
        borderBottomWidth: 0,
        borderRadius: 12,
    },
    draftItemTitle: {
        fontSize: 14.5,
        fontWeight: '700',
    },
    draftItemMeta: {
        fontSize: 12,
        color: '#8E8E93',
    },
    draftDeleteBtn: {
        padding: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iosToggleTrack: {
        width: 51,
        height: 31,
        borderRadius: 16,
        padding: 2,
        justifyContent: 'center',
    },
    iosToggleThumb: {
        width: 27,
        height: 27,
        borderRadius: 13.5,
        backgroundColor: '#FFFFFF',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 2.5,
            },
            default: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.18,
                shadowRadius: 2,
                elevation: 2,
            },
        }),
    },
});
