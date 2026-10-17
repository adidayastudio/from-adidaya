import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Alert } from 'react-native';
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
import { padding, background, ignoreSafeArea, tint, frame, cornerRadius, disabled } from '@expo/ui/swift-ui/modifiers';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { useTenantContext } from '@/context/TenantContext';
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
    onSave: (project: Project) => void;
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
    const sheetBg = 'clear';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#C7C7CC' : 'gray';
    const nativeControlTextColor = isDark ? '#FFFFFF' : '#000000';
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
    const [typeIndex, setTypeIndex] = useState(0);
    const [startDate, setStartDate] = useState<Date>(new Date());
    const [targetDate, setTargetDate] = useState<Date>(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
    const [hasTargetDate, setHasTargetDate] = useState(false);
    const [statusIndex, setStatusIndex] = useState(0);
    const [leadIndex, setLeadIndex] = useState(0);
    const [trackingIndex, setTrackingIndex] = useState(0);

    // Override indicators
    const [isNumberEdited, setIsNumberEdited] = useState(false);
    const [isCodeEdited, setIsCodeEdited] = useState(false);

    // Existing data for validation
    const [existingNumbers, setExistingNumbers] = useState<string[]>([]);
    const [existingCodes, setExistingCodes] = useState<string[]>([]);

    // Save state
    const [isSaving, setIsSaving] = useState(false);

    // Track render counter to force SwiftUI TextField remounts when code/number changes
    const codeRenderRef = useRef(0);
    const numRenderRef = useRef(0);

    // Enabled Tracking methods options
    const availableTrackingMethods: TrackingMethod[] = trackingSettings.enabledMethods.length > 0
        ? trackingSettings.enabledMethods
        : ['manual', 'tasks', 'milestones'];

    const trackingOptionLabels = availableTrackingMethods.map((m) => METHOD_LABELS[m] || m.charAt(0).toUpperCase() + m.slice(1));
    const typeOptionLabels = activeTypes.map((t) => t.name);
    const statusOptionLabels = activeStatuses.map((s) => s.name);

    // Computed validation
    const isNumberTaken = projectNumber.trim().length > 0 &&
        existingNumbers.includes(projectNumber.trim());
    const isCodeTaken = projectCode.trim().length > 0 &&
        existingCodes.includes(projectCode.trim().toUpperCase());
    const titleWordCount = title.trim().split(/\s+/).filter(Boolean).length;
    const isTitleTooLong = title.trim().length > 0 && titleWordCount > 3;

    // Fetch tenant-scoped members
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
            console.error('Fetch tenant members error:', e);
            return [];
        }
    };

    // Fetch parameters and initialize form
    useEffect(() => {
        if (isOpened) {
            setTitle('');
            setTypeIndex(0);
            setStatusIndex(0);
            setLeadIndex(0);
            setStartDate(new Date());
            setTargetDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
            setHasTargetDate(false);
            setIsNumberEdited(false);
            setIsCodeEdited(false);
            setProjectCode('');
            setExistingNumbers([]);
            setExistingCodes([]);
            codeRenderRef.current = 0;
            numRenderRef.current = 0;

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
                    setActiveTypes(filteredTypes.length > 0 ? filteredTypes : types);

                    const filteredStatuses = statuses.filter((s) => s.isActive !== false);
                    setActiveStatuses(filteredStatuses.length > 0 ? filteredStatuses : statuses);

                    setTrackingSettings(track);

                    // Set default tracking index based on configured defaultMethod
                    const defaultTrackIdx = (track.enabledMethods || []).indexOf(track.defaultMethod);
                    if (defaultTrackIdx >= 0) {
                        setTrackingIndex(defaultTrackIdx);
                    }

                    // Target Date required status
                    const mustHaveTargetDate = gen.requireTargetDate && !gen.allowNoTargetDate;
                    setHasTargetDate(mustHaveTargetDate);

                    // Tenant scoped members
                    const validMembers = memberNames.filter((n) => Boolean(n));
                    const fullLeadOptions = ['Select', ...validMembers];
                    setLeadOptions(fullLeadOptions);
                    setLeadIndex(0);

                    const autoNum = getNextProjectNumber(seq.numbers);
                    numRenderRef.current += 1;
                    setProjectNumber(autoNum);
                })
                .catch((err) => {
                    console.error('Failed to load project setup data:', err);
                    numRenderRef.current += 1;
                    setProjectNumber('001');
                });
        }
    }, [isOpened, activeTenant?.id]);

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
                if (autoCode !== projectCode) {
                    codeRenderRef.current += 1;
                    setProjectCode(autoCode);
                }
            } else if (projectCode !== '') {
                codeRenderRef.current += 1;
                setProjectCode('');
            }
        }
    }, [title, isCodeEdited, existingCodes, numberingSettings.codeStyle]);

    const titleCallbackRef = useRef<(val: string) => void>(() => {});
    titleCallbackRef.current = (val: string) => {
        setTitle(val);
    };
    const stableTitleChange = useCallback((val: string) => {
        titleCallbackRef.current(val);
    }, []);

    const numberCallbackRef = useRef<(val: string) => void>(() => {});
    numberCallbackRef.current = (val: string) => {
        if (val !== projectNumber) {
            setProjectNumber(val);
            setIsNumberEdited(true);
        }
    };
    const stableNumberChange = useCallback((val: string) => {
        numberCallbackRef.current(val);
    }, []);

    const codeCallbackRef = useRef<(val: string) => void>(() => {});
    codeCallbackRef.current = (val: string) => {
        if (val !== projectCode) {
            setProjectCode(val);
            setIsCodeEdited(true);
        }
    };
    const stableCodeChange = useCallback((val: string) => {
        codeCallbackRef.current(val);
    }, []);

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

        // Uniqueness checks
        if (existingNumbers.includes(projectNumber.trim())) {
            Alert.alert('Duplicate Number', 'This project number is already taken. Please choose a different one.');
            return;
        }
        if (existingCodes.includes(projectCode.trim().toUpperCase())) {
            Alert.alert('Duplicate Code', 'This project code is already taken. Please choose a different one.');
            return;
        }

        // Required Target Date rule
        if (generalSettings.requireTargetDate && !generalSettings.allowNoTargetDate && !hasTargetDate) {
            Alert.alert('Target Date Required', 'Please select a target completion date for this project.');
            return;
        }

        // Project Lead rule
        const selectedLeadName = leadOptions[leadIndex];
        if (generalSettings.requireProjectLead && (!selectedLeadName || selectedLeadName === 'Select')) {
            Alert.alert('Project Lead Required', 'Please select a project lead from the members list.');
            return;
        }

        setIsSaving(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            const formattedCode = numberingSettings.codeStyle === 'lowercase'
                ? projectCode.trim().toLowerCase()
                : projectCode.trim().toUpperCase();

            const selectedType = activeTypes[typeIndex] || activeTypes[0];
            const selectedStatus = activeStatuses[statusIndex] || activeStatuses[0];
            const selectedMethod = availableTrackingMethods[trackingIndex] || 'tasks';
            const finalLead = selectedLeadName && selectedLeadName !== 'Select' ? selectedLeadName : '';

            const payload = {
                title: title.trim(),
                number: projectNumber.trim(),
                code: formattedCode,
                location: '',
                projectType: selectedType?.name || 'Client Project',
                startDate: startDate.toISOString().split('T')[0],
                targetDate: hasTargetDate ? targetDate.toISOString().split('T')[0] : undefined,
                initialStage: selectedStatus?.systemState?.toLowerCase() || 'upcoming',
                status: selectedStatus?.id || 'planning',
                projectLead: finalLead,
                progressTracking: selectedMethod,
                workspaceId: activeWorkspace?.id,
            };

            const newProj = await createProjectApi(payload);

            if (newProj) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                onSave(newProj);
            } else {
                Alert.alert('Error', 'Failed to create project.');
            }
        } catch (err: any) {
            console.error('Failed to save project iOS:', err);
            Alert.alert('Error', err.message || 'An unexpected error occurred.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet
                isOpened={isOpened}
                presentationDetents={[0.88]}
                onIsOpenedChange={(opened) => {
                    if (!opened) onClose();
                }}
            >
                <VStack spacing={0} modifiers={[
                    ignoreSafeArea({ edges: 'bottom' }),
                    background(sheetBg)
                ]}>
                    {/* Header */}
                    <HStack alignment="center" modifiers={[padding({ top: 20, leading: 20, trailing: 20, bottom: 10 })]}>
                        <SwiftUIText size={22} weight="bold" color={textColor}>
                            Add New Project
                        </SwiftUIText>
                        <Spacer />
                        <Button
                            systemImage="xmark"
                            role="cancel"
                            color="gray"
                            onPress={onClose}
                        />
                    </HStack>

                    <Form modifiers={[background(sheetBg), frame({ maxHeight: 540 })]}>
                        <Section title="General Information">
                            <TextField
                                placeholder="Project Name (max 3 words)"
                                defaultValue={title}
                                onChangeText={stableTitleChange}
                                modifiers={[tint(formaBlue)]}
                            />
                            {isTitleTooLong && (
                                <SwiftUIText size={12} color={warningColor}>
                                    ⚠ Project name must be at most 3 words
                                </SwiftUIText>
                            )}
                            <TextField
                                key={isNumberEdited ? 'num-edited' : `num-auto-${numRenderRef.current}`}
                                placeholder="001"
                                defaultValue={projectNumber}
                                onChangeText={stableNumberChange}
                                modifiers={[tint(formaBlue)]}
                            />
                            {isNumberTaken && (
                                <SwiftUIText size={12} color={errorColor}>
                                    ⚠ This project number is already taken
                                </SwiftUIText>
                            )}
                            <TextField
                                key={isCodeEdited ? 'code-edited' : `code-auto-${codeRenderRef.current}`}
                                placeholder="Project Code"
                                defaultValue={projectCode}
                                onChangeText={stableCodeChange}
                                modifiers={[tint(formaBlue)]}
                            />
                            {isCodeTaken && (
                                <SwiftUIText size={12} color={errorColor}>
                                    ⚠ This project code is already taken
                                </SwiftUIText>
                            )}
                        </Section>

                        <Section title="Project Settings">
                            <Picker
                                label="Project Type"
                                options={typeOptionLabels.length > 0 ? typeOptionLabels : ['Client Project', 'Internal Project']}
                                selectedIndex={typeIndex}
                                onOptionSelected={(e) => setTypeIndex(e.nativeEvent.index)}
                                variant="menu"
                                color={nativeControlTextColor}
                                modifiers={[tint(formaBlue)]}
                            />
                            <DateTimePicker
                                title="Start Date"
                                initialDate={startDate.toISOString()}
                                onDateSelected={(date) => setStartDate(date)}
                                variant="compact"
                                displayedComponents="date"
                                color={nativeControlTextColor}
                                modifiers={[tint(formaBlue)]}
                            />
                            {hasTargetDate ? (
                                <HStack alignment="center">
                                    <DateTimePicker
                                        title="Target Date"
                                        initialDate={targetDate.toISOString()}
                                        onDateSelected={(date) => {
                                            setTargetDate(date);
                                            setHasTargetDate(true);
                                        }}
                                        variant="compact"
                                        displayedComponents="date"
                                        color={nativeControlTextColor}
                                        modifiers={[tint(formaBlue)]}
                                    />
                                    {!generalSettings.requireTargetDate && (
                                        <Button
                                            systemImage="xmark.circle.fill"
                                            color="gray"
                                            onPress={() => setHasTargetDate(false)}
                                        />
                                    )}
                                </HStack>
                            ) : (
                                <HStack alignment="center">
                                    <SwiftUIText size={17} color={nativeControlTextColor}>Target Date</SwiftUIText>
                                    <Spacer />
                                    <Button
                                        onPress={() => {
                                            setHasTargetDate(true);
                                            setTargetDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
                                        }}
                                    >
                                        <SwiftUIText size={17} color={subtextColor}>Select</SwiftUIText>
                                    </Button>
                                </HStack>
                            )}
                            <Picker
                                label="Status"
                                options={statusOptionLabels.length > 0 ? statusOptionLabels : ['Planning', 'Active', 'Completed']}
                                selectedIndex={statusIndex}
                                onOptionSelected={(e) => setStatusIndex(e.nativeEvent.index)}
                                variant="menu"
                                color={nativeControlTextColor}
                                modifiers={[tint(formaBlue)]}
                            />
                            <Picker
                                label="Project Lead"
                                options={leadOptions}
                                selectedIndex={leadIndex}
                                onOptionSelected={(e) => setLeadIndex(e.nativeEvent.index)}
                                variant="menu"
                                color={nativeControlTextColor}
                                modifiers={[tint(formaBlue)]}
                            />
                            <Picker
                                label="Progress Tracking"
                                options={trackingOptionLabels.length > 0 ? trackingOptionLabels : ['Manual', 'From Tasks', 'From Milestones']}
                                selectedIndex={trackingIndex}
                                onOptionSelected={(e) => setTrackingIndex(e.nativeEvent.index)}
                                variant="menu"
                                color={nativeControlTextColor}
                                modifiers={[tint(formaBlue)]}
                            />
                        </Section>
                    </Form>

                    <Spacer />

                    {/* Footer Action */}
                    <VStack modifiers={[
                        padding({ top: 12, leading: 20, trailing: 20, bottom: 22 }),
                        background(sheetBg)
                    ]}>
                        <Button
                            variant="glassProminent"
                            color={formaBlue}
                            onPress={handleSave}
                            modifiers={[
                                frame({ maxWidth: Infinity }),
                                cornerRadius(999),
                                disabled(isSaving)
                            ]}
                        >
                            <HStack alignment="center" spacing={6} modifiers={[
                                frame({ maxWidth: Infinity }),
                                frame({ height: 44 })
                            ]}>
                                <Spacer />
                                {isSaving ? (
                                    <SwiftUIText weight="semibold" size={17} color="#FFFFFF">Creating...</SwiftUIText>
                                ) : (
                                    <SwiftUIText weight="semibold" size={17} color="#FFFFFF">Create Project</SwiftUIText>
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
