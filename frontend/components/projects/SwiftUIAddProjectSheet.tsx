import React, { useState, useEffect, useRef } from 'react';
import {
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    Animated,
    View,
    ScrollView,
    Platform,
    Alert,
    ActivityIndicator,
    useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { useTenantContext } from '@/context/TenantContext';
import { HeaderCircleButton } from '@/components/ui/HeaderCircleButton';
import { FormaBlue } from '@/constants/theme';
import { PlatformContextMenu, ContextMenuAction } from '@/components/ui/PlatformContextMenu';
import { LiquidDatePicker, toLocalYYYYMMDD } from '@/components/ui/LiquidDatePicker';
import { supabase } from '@/lib/supabase';
import {
    Project,
    createProjectApi,
    getProjectSequenceData,
    getNextProjectNumber,
    generateProjectCode,
} from '@/lib/api/projects';
import {
    getProjectGeneralSettings,
    getProjectNumberingSettings,
    getProjectTypes,
    getProjectStatuses,
    getProjectTrackingSettings,
    ProjectTypeItem,
    ProjectStatusItem,
    ProjectGeneralSettings,
    ProjectNumberingSettings,
    ProjectTrackingSettings,
    TrackingMethod,
    DEFAULT_PROJECT_GENERAL_SETTINGS,
    DEFAULT_PROJECT_NUMBERING_SETTINGS,
    DEFAULT_PROJECT_TRACKING_SETTINGS,
} from '@/lib/api/projectSetup';

export interface SwiftUIAddProjectSheetProps {
    isOpened: boolean;
    onClose: () => void;
    onSave: (project: any) => void;
}

const METHOD_LABELS: Record<string, string> = {
    manual: 'Manual',
    tasks: 'From Tasks',
    milestones: 'From Milestones',
    none: 'No Progress',
    from_tasks: 'From Tasks',
    from_milestones: 'From Milestones',
    no_progress: 'No Progress',
};

const isJunkName = (name: string) => {
    const lower = name.toLowerCase();
    return (
        lower.includes('test_') ||
        lower.includes('coba coba') ||
        lower.includes('multisuperadmin') ||
        /test.*admin/i.test(lower) ||
        /\d{6,}/.test(lower)
    );
};

export const SwiftUIAddProjectSheet: React.FC<SwiftUIAddProjectSheetProps> = ({
    isOpened,
    onClose,
    onSave,
}) => {
    const { resolvedTheme } = useTheme();
    const { activeTenant, activeWorkspace } = useTenantContext();
    const isDark = resolvedTheme === 'dark';
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const isDesktop = Platform.OS === 'web' && width >= 768;

    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';
    const formaBlue = '#007AFF';
    const warningColor = '#FF9500';
    const errorColor = '#FF3B30';

    // Settings state
    const [generalSettings, setGeneralSettings] = useState<ProjectGeneralSettings>(DEFAULT_PROJECT_GENERAL_SETTINGS);
    const [numberingSettings, setNumberingSettings] = useState<ProjectNumberingSettings>(DEFAULT_PROJECT_NUMBERING_SETTINGS);
    const [activeTypes, setActiveTypes] = useState<ProjectTypeItem[]>([]);
    const [activeStatuses, setActiveStatuses] = useState<ProjectStatusItem[]>([]);
    const [trackingSettings, setTrackingSettings] = useState<ProjectTrackingSettings>(DEFAULT_PROJECT_TRACKING_SETTINGS);
    const [leadOptions, setLeadOptions] = useState<string[]>(['Select']);

    // Form fields state
    const [title, setTitle] = useState('');
    const [projectNumber, setProjectNumber] = useState('001');
    const [projectCode, setProjectCode] = useState('');
    const [selectedTypeId, setSelectedTypeId] = useState('');
    const [startDate, setStartDate] = useState(toLocalYYYYMMDD(new Date()));
    const [targetDate, setTargetDate] = useState(toLocalYYYYMMDD(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)));
    const [hasTargetDate, setHasTargetDate] = useState(false);
    const [selectedStatusId, setSelectedStatusId] = useState('');
    const [selectedLead, setSelectedLead] = useState('Select');
    const [selectedTrackingMethod, setSelectedTrackingMethod] = useState<TrackingMethod>('tasks');

    // Override markers
    const [isNumberEdited, setIsNumberEdited] = useState(false);
    const [isCodeEdited, setIsCodeEdited] = useState(false);

    // Existing data for validation
    const [existingNumbers, setExistingNumbers] = useState<string[]>([]);
    const [existingCodes, setExistingCodes] = useState<string[]>([]);

    // Pickers control
    const [isStartDatePickerVisible, setIsStartDatePickerVisible] = useState(false);
    const [isTargetDatePickerVisible, setIsTargetDatePickerVisible] = useState(false);

    // Save state
    const [isSaving, setIsSaving] = useState(false);

    // Computed validation
    const isNumberTaken = projectNumber.trim().length > 0 &&
        existingNumbers.includes(projectNumber.trim());
    const isCodeTaken = projectCode.trim().length > 0 &&
        existingCodes.includes(projectCode.trim().toUpperCase());
    const titleWordCount = title.trim().split(/\s+/).filter(Boolean).length;
    const isTitleTooLong = title.trim().length > 0 && titleWordCount > 3;

    // Fetch tenant members
    const fetchTenantMembers = async (tenantId?: string): Promise<string[]> => {
        if (!tenantId) return [];
        try {
            const { data: members, error: mError } = await supabase
                .from('tenant_members')
                .select('user_id')
                .eq('tenant_id', tenantId);

            if (mError || !members || members.length === 0) return [];
            const userIds = members.map((m: any) => m.user_id).filter(Boolean);

            const { data: profiles, error: pError } = await supabase
                .from('profiles')
                .select('id, full_name, nickname, username')
                .in('id', userIds);

            if (pError || !profiles) return [];
            return profiles
                .map((p: any) => p.full_name || p.nickname || p.username || '')
                .filter((name: string) => Boolean(name && !isJunkName(name)));
        } catch (e) {
            console.error('Fetch tenant members fallback error:', e);
            return [];
        }
    };

    // Animation state
    const slideAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    // Load projects and autogenerate sequence
    useEffect(() => {
        if (isOpened) {
            setTitle('');
            setStartDate(toLocalYYYYMMDD(new Date()));
            setTargetDate(toLocalYYYYMMDD(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)));
            setHasTargetDate(false);
            setIsNumberEdited(false);
            setIsCodeEdited(false);
            setProjectCode('');
            setExistingNumbers([]);
            setExistingCodes([]);

            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: Platform.OS !== 'web',
                }),
                Animated.spring(slideAnim, {
                    toValue: 1,
                    tension: 65,
                    friction: 11,
                    useNativeDriver: Platform.OS !== 'web',
                }),
            ]).start();

            Promise.all([
                getProjectSequenceData(),
                getProjectGeneralSettings(),
                getProjectNumberingSettings(),
                getProjectTypes(),
                getProjectStatuses(),
                getProjectTrackingSettings(),
                fetchTenantMembers(activeTenant?.id),
            ])
                .then(([seq, gen, num, types, statuses, track, memberNames]) => {
                    setExistingNumbers(seq.numbers);
                    setExistingCodes(seq.codes);
                    setGeneralSettings(gen);
                    setNumberingSettings(num);

                    const filteredTypes = types.filter((t) => t.isActive !== false);
                    const usableTypes = filteredTypes.length > 0 ? filteredTypes : types;
                    setActiveTypes(usableTypes);
                    if (usableTypes.length > 0) setSelectedTypeId(usableTypes[0].id);

                    const filteredStatuses = statuses.filter((s) => s.isActive !== false);
                    const usableStatuses = filteredStatuses.length > 0 ? filteredStatuses : statuses;
                    setActiveStatuses(usableStatuses);
                    if (usableStatuses.length > 0) setSelectedStatusId(usableStatuses[0].id);

                    setTrackingSettings(track);
                    setSelectedTrackingMethod(track.defaultMethod || 'tasks');

                    const mustHaveTargetDate = gen.requireTargetDate && !gen.allowNoTargetDate;
                    setHasTargetDate(mustHaveTargetDate);

                    const validMembers = memberNames.filter((n) => Boolean(n));
                    const fullLeadOptions = ['Select', ...validMembers];
                    setLeadOptions(fullLeadOptions);
                    setSelectedLead('Select');

                    const autoNum = getNextProjectNumber(seq.numbers);
                    setProjectNumber(autoNum);
                })
                .catch((err) => {
                    console.error('Failed to load project setup data fallback:', err);
                    setProjectNumber('001');
                    setLeadOptions(['Select']);
                    setSelectedLead('Select');
                });
        } else {
            slideAnim.setValue(0);
            fadeAnim.setValue(0);
        }
    }, [isOpened, activeTenant?.id, slideAnim, fadeAnim]);

    const handleDismiss = () => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 180,
                useNativeDriver: Platform.OS !== 'web',
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: Platform.OS !== 'web',
            }),
        ]).start(() => {
            onClose();
        });
    };

    // Auto-generate project code reactively from title changes
    useEffect(() => {
        if (!isCodeEdited) {
            if (title.trim().length > 0) {
                let autoCode = generateProjectCode(title, existingCodes);
                if (numberingSettings.codeStyle === 'lowercase') {
                    autoCode = autoCode.toLowerCase();
                } else {
                    autoCode = autoCode.toUpperCase();
                }
                setProjectCode(autoCode);
            } else {
                setProjectCode('');
            }
        }
    }, [title, isCodeEdited, existingCodes, numberingSettings.codeStyle]);

    const handleSave = async () => {
        if (!title.trim()) {
            Alert.alert('Required Field', 'Please enter a project name.');
            return;
        }

        const wordCount = title.trim().split(/\s+/).filter(Boolean).length;
        if (wordCount > 3) {
            Alert.alert('Too Many Words', 'Project name must be at most 3 words.');
            return;
        }

        if (!projectNumber.trim() || projectNumber.trim().length !== 3) {
            Alert.alert('Invalid Number', 'Project number must be exactly 3 digits.');
            return;
        }

        if (!projectCode.trim() || projectCode.trim().length !== 3) {
            Alert.alert('Invalid Code', 'Project code must be exactly 3 letters.');
            return;
        }

        if (existingNumbers.includes(projectNumber.trim())) {
            Alert.alert('Duplicate Number', 'This project number is already taken. Please choose a different one.');
            return;
        }
        if (existingCodes.includes(projectCode.trim().toUpperCase())) {
            Alert.alert('Duplicate Code', 'This project code is already taken. Please choose a different one.');
            return;
        }

        if (generalSettings.requireTargetDate && !generalSettings.allowNoTargetDate && !hasTargetDate) {
            Alert.alert('Target Date Required', 'Please select a target completion date for this project.');
            return;
        }

        if (generalSettings.requireProjectLead && (!selectedLead || selectedLead === 'Select')) {
            Alert.alert('Project Lead Required', 'Please assign a project lead from the members list.');
            return;
        }

        setIsSaving(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            const formattedCode = numberingSettings.codeStyle === 'lowercase'
                ? projectCode.trim().toLowerCase()
                : projectCode.trim().toUpperCase();

            const selectedStatus = activeStatuses.find((s) => s.id === selectedStatusId);
            const finalLead = selectedLead && selectedLead !== 'Select' ? selectedLead : '';

            const payload = {
                title: title.trim(),
                number: projectNumber.trim(),
                code: formattedCode,
                location: '',
                projectType: selectedTypeId || 'client_project',
                startDate,
                targetDate: hasTargetDate ? targetDate : undefined,
                initialStage: selectedStatus?.systemState?.toLowerCase() || 'upcoming',
                status: selectedStatusId || 'planning',
                projectLead: finalLead,
                progressTracking: selectedTrackingMethod,
                workspaceId: activeWorkspace?.id,
            };

            const newProj = await createProjectApi(payload);

            if (newProj) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                onSave(newProj);
            } else {
                Alert.alert('Error', 'Failed to create new project.');
            }
        } catch (err: any) {
            console.error('Failed to create project fallback:', err);
            Alert.alert('Error', err.message || 'An unexpected error occurred.');
        } finally {
            setIsSaving(false);
        }
    };

    const currentTypeLabel = activeTypes.find((t) => t.id === selectedTypeId)?.name || 'Select Type';
    const currentStatusLabel = activeStatuses.find((s) => s.id === selectedStatusId)?.name || 'Planning';
    const currentTrackingLabel = METHOD_LABELS[selectedTrackingMethod] || 'From Tasks';

    const typeActions: ContextMenuAction[] = activeTypes.map((t) => ({
        title: t.name,
        subtitle: t.description || undefined,
        state: t.id === selectedTypeId ? 'on' : 'off',
    }));

    const statusActions: ContextMenuAction[] = activeStatuses.map((s) => ({
        title: s.name,
        subtitle: s.description || undefined,
        state: s.id === selectedStatusId ? 'on' : 'off',
    }));

    const leadActions: ContextMenuAction[] = leadOptions.map((lead) => ({
        title: lead,
        state: lead === selectedLead ? 'on' : 'off',
    }));

    const trackingMethodsList = (trackingSettings.enabledMethods || ['manual', 'from_tasks', 'from_milestones', 'no_progress']) as TrackingMethod[];
    const trackingActions: ContextMenuAction[] = trackingMethodsList.map((m) => ({
        title: METHOD_LABELS[m] || m,
        state: m === selectedTrackingMethod ? 'on' : 'off',
    }));

    const sectionBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.035)';
    const dividerBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

    if (!isOpened) return null;

    return (
        <Modal
            visible={isOpened}
            transparent={true}
            animationType="none"
            onRequestClose={handleDismiss}
            statusBarTranslucent={true}
            navigationBarTranslucent={Platform.OS === 'android'}
        >
            <View style={[styles.modalOverlay, isDesktop && styles.modalOverlayWeb]}>
                <TouchableWithoutFeedback onPress={handleDismiss}>
                    <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
                </TouchableWithoutFeedback>
                <Animated.View
                    style={[
                        styles.modalContent,
                        isDesktop && styles.modalContentWeb,
                        {
                            backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                            transform: [
                                {
                                    translateX: slideAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [isDesktop ? 460 : 0, 0],
                                    }),
                                },
                                {
                                    translateY: slideAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [isDesktop ? 0 : 500, 0],
                                    }),
                                },
                            ],
                        },
                    ]}
                >
                    <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 20, paddingBottom: Platform.OS === 'ios' ? 22 : 24, display: 'flex', flexDirection: 'column' }}>
                        {/* Header */}
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: textColor }]}>Add New Project</Text>
                            <HeaderCircleButton
                                type="close"
                                onPress={handleDismiss}
                                isDark={isDark}
                                size={32}
                            />
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
                            {/* Section 1: General Information */}
                            <Text style={[styles.sectionTitle, { color: subtextColor }]}>General Information</Text>
                            <View style={[styles.formSection, { backgroundColor: sectionBg }]}>
                                <View style={styles.inputRow}>
                                    <TextInput
                                        style={[styles.textInput, { color: textColor }]}
                                        placeholder="Project Name (max 3 words)"
                                        placeholderTextColor={subtextColor}
                                        value={title}
                                        onChangeText={setTitle}
                                        maxLength={50}
                                    />
                                </View>
                                {isTitleTooLong && (
                                    <Text style={[styles.inlineWarning, { color: warningColor }]}>
                                        ⚠ Project name must be at most 3 words
                                    </Text>
                                )}

                                <View style={[styles.rowDivider, { backgroundColor: dividerBg }]} />

                                <View style={styles.inputRow}>
                                    <TextInput
                                        style={[styles.textInput, { color: textColor }]}
                                        placeholder="001"
                                        placeholderTextColor={subtextColor}
                                        value={projectNumber}
                                        onChangeText={(val) => {
                                            setProjectNumber(val);
                                            setIsNumberEdited(true);
                                        }}
                                        keyboardType="number-pad"
                                        maxLength={3}
                                    />
                                </View>
                                {isNumberTaken && (
                                    <Text style={[styles.inlineWarning, { color: errorColor }]}>
                                        ⚠ This project number is already taken
                                    </Text>
                                )}

                                <View style={[styles.rowDivider, { backgroundColor: dividerBg }]} />

                                <View style={styles.inputRow}>
                                    <TextInput
                                        style={[styles.textInput, { color: textColor }]}
                                        placeholder="Project Code"
                                        placeholderTextColor={subtextColor}
                                        value={projectCode}
                                        onChangeText={(val) => {
                                            setProjectCode(val);
                                            setIsCodeEdited(true);
                                        }}
                                        maxLength={3}
                                        autoCapitalize="characters"
                                    />
                                </View>
                                {isCodeTaken && (
                                    <Text style={[styles.inlineWarning, { color: errorColor }]}>
                                        ⚠ This project code is already taken
                                    </Text>
                                )}
                            </View>

                            {/* Section 2: Project Settings */}
                            <Text style={[styles.sectionTitle, { color: subtextColor }]}>Project Settings</Text>
                            <View style={[styles.formSection, { backgroundColor: sectionBg }]}>
                                {/* Project Type */}
                                <PlatformContextMenu
                                    dropdownMenuMode
                                    title="Select Project Type"
                                    actions={typeActions}
                                    onPress={(e) => {
                                        const selected = activeTypes[e.nativeEvent.index];
                                        if (selected) {
                                            Haptics.selectionAsync();
                                            setSelectedTypeId(selected.id);
                                        }
                                    }}
                                >
                                    <View style={styles.settingRow}>
                                        <Text style={[styles.settingLabel, { color: textColor }]}>Project Type</Text>
                                        <View style={styles.settingValueContainer}>
                                            <Text style={[styles.settingValue, { color: formaBlue }]}>{currentTypeLabel}</Text>
                                            <Ionicons name="chevron-down" size={14} color={subtextColor} />
                                        </View>
                                    </View>
                                </PlatformContextMenu>

                                <View style={[styles.rowDivider, { backgroundColor: dividerBg }]} />

                                {/* Start Date */}
                                <TouchableOpacity
                                    style={styles.settingRow}
                                    activeOpacity={0.7}
                                    onPress={() => setIsStartDatePickerVisible(true)}
                                >
                                    <Text style={[styles.settingLabel, { color: textColor }]}>Start Date</Text>
                                    <View style={styles.settingValueContainer}>
                                        <Text style={[styles.settingValue, { color: textColor }]}>{startDate}</Text>
                                        <Ionicons name="calendar-outline" size={16} color={subtextColor} />
                                    </View>
                                </TouchableOpacity>

                                <View style={[styles.rowDivider, { backgroundColor: dividerBg }]} />

                                {/* Target Date */}
                                <TouchableOpacity
                                    style={styles.settingRow}
                                    activeOpacity={0.7}
                                    onPress={() => setIsTargetDatePickerVisible(true)}
                                >
                                    <Text style={[styles.settingLabel, { color: textColor }]}>Target Date</Text>
                                    <View style={styles.settingValueContainer}>
                                        <Text style={[styles.settingValue, { color: hasTargetDate ? textColor : subtextColor }]}>
                                            {hasTargetDate ? targetDate : 'Select'}
                                        </Text>
                                        <Ionicons name="calendar-outline" size={16} color={subtextColor} />
                                    </View>
                                </TouchableOpacity>

                                <View style={[styles.rowDivider, { backgroundColor: dividerBg }]} />

                                {/* Status */}
                                <PlatformContextMenu
                                    dropdownMenuMode
                                    title="Select Status"
                                    actions={statusActions}
                                    onPress={(e) => {
                                        const selected = activeStatuses[e.nativeEvent.index];
                                        if (selected) {
                                            Haptics.selectionAsync();
                                            setSelectedStatusId(selected.id);
                                        }
                                    }}
                                >
                                    <View style={styles.settingRow}>
                                        <Text style={[styles.settingLabel, { color: textColor }]}>Status</Text>
                                        <View style={styles.settingValueContainer}>
                                            <Text style={[styles.settingValue, { color: textColor }]}>{currentStatusLabel}</Text>
                                            <Ionicons name="chevron-down" size={14} color={subtextColor} />
                                        </View>
                                    </View>
                                </PlatformContextMenu>

                                <View style={[styles.rowDivider, { backgroundColor: dividerBg }]} />

                                {/* Project Lead */}
                                <PlatformContextMenu
                                    dropdownMenuMode
                                    title="Select Project Lead"
                                    actions={leadActions}
                                    onPress={(e) => {
                                        const selected = leadOptions[e.nativeEvent.index];
                                        if (selected) {
                                            Haptics.selectionAsync();
                                            setSelectedLead(selected);
                                        }
                                    }}
                                >
                                    <View style={styles.settingRow}>
                                        <Text style={[styles.settingLabel, { color: textColor }]}>Project Lead</Text>
                                        <View style={styles.settingValueContainer}>
                                            <Text style={[styles.settingValue, { color: textColor }]}>{selectedLead || 'Select'}</Text>
                                            <Ionicons name="chevron-down" size={14} color={subtextColor} />
                                        </View>
                                    </View>
                                </PlatformContextMenu>

                                <View style={[styles.rowDivider, { backgroundColor: dividerBg }]} />

                                {/* Progress Tracking */}
                                <PlatformContextMenu
                                    dropdownMenuMode
                                    title="Select Progress Tracking"
                                    actions={trackingActions}
                                    onPress={(e) => {
                                        const selected = trackingMethodsList[e.nativeEvent.index];
                                        if (selected) {
                                            Haptics.selectionAsync();
                                            setSelectedTrackingMethod(selected);
                                        }
                                    }}
                                >
                                    <View style={styles.settingRow}>
                                        <Text style={[styles.settingLabel, { color: textColor }]}>Progress Tracking</Text>
                                        <View style={styles.settingValueContainer}>
                                            <Text style={[styles.settingValue, { color: textColor }]}>{currentTrackingLabel}</Text>
                                            <Ionicons name="chevron-down" size={14} color={subtextColor} />
                                        </View>
                                    </View>
                                </PlatformContextMenu>
                            </View>
                        </ScrollView>

                        {/* Footer Action */}
                        <TouchableOpacity
                            style={[
                                styles.createButton,
                                { backgroundColor: formaBlue },
                                isSaving && { opacity: 0.6 },
                            ]}
                            activeOpacity={0.8}
                            onPress={handleSave}
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <Text style={styles.createButtonText}>Create Project</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </View>

            {/* Date Pickers */}
            <LiquidDatePicker
                visible={isStartDatePickerVisible}
                value={startDate}
                title="Select Start Date"
                onClose={() => setIsStartDatePickerVisible(false)}
                onSelect={(val) => {
                    setStartDate(val);
                    setIsStartDatePickerVisible(false);
                }}
            />

            <LiquidDatePicker
                visible={isTargetDatePickerVisible}
                value={targetDate}
                title="Select Target Date"
                onClose={() => setIsTargetDatePickerVisible(false)}
                onSelect={(val) => {
                    setTargetDate(val);
                    setHasTargetDate(true);
                    setIsTargetDatePickerVisible(false);
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
    modalOverlayWeb: {
        padding: 12,
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.45)',
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
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        height: '92%',
        maxHeight: '92%',
    },
    modalContentWeb: {
        position: 'absolute',
        top: 12,
        bottom: 12,
        right: 12,
        width: 440,
        maxWidth: 'calc(100% - 24px)' as any,
        borderRadius: 24,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        borderWidth: 1,
        height: 'calc(100% - 24px)' as any,
        maxHeight: 'none' as any,
        overflow: 'hidden',
        ...(Platform.OS === 'web' ? ({
            boxShadow: '0 16px 48px rgba(0, 0, 0, 0.18), 0 2px 12px rgba(0, 0, 0, 0.08)',
        } as any) : {}),
    },
    modalDragIndicator: {
        width: 36,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: 'rgba(120,120,128,0.3)',
        alignSelf: 'center',
        marginBottom: 8,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        letterSpacing: -0.4,
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    loadingText: {
        fontSize: 14,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 4,
        marginTop: 14,
        marginBottom: 8,
    },
    formSection: {
        borderRadius: 18,
        overflow: 'hidden',
        paddingHorizontal: 16,
        paddingVertical: 4,
    },
    inputRow: {
        paddingVertical: 12,
    },
    textInput: {
        fontSize: 16,
        paddingVertical: 0,
    },
    inlineWarning: {
        fontSize: 12,
        paddingBottom: 8,
    },
    rowDivider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: 'rgba(120,120,128,0.2)',
    },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
    },
    settingLabel: {
        fontSize: 16,
    },
    settingValueContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    settingValue: {
        fontSize: 16,
    },
    createButton: {
        height: 48,
        borderRadius: 999,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
    },
    createButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
});
