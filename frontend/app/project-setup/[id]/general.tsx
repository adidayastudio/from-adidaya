import { ProjectInformationSections } from '@/components/projects/setup/ProjectInformationSections';
import { ProjectInformationDetails, projectInformationDetails, validateProjectInformation } from '@/lib/projectInformation';
import { fetchDefaultWorkspaceId, fetchProjectTypes } from '@/lib/api/templates';
import { scopeOptions, resolveProjectScope } from '@/lib/projectScope';
import { LiquidCard } from '@/components/ui/LiquidCard';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { ProjectSaveFeedback, useProjectSaveFeedback } from '@/components/projects/setup/ProjectSaveFeedback';
import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Alert,
    ActivityIndicator,
    Platform,
    Image,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useTenantContext } from '@/context/TenantContext';
import { Ionicons } from '@expo/vector-icons';
import { HeaderBlurBackground } from '@/components/ui/HeaderBlurBackground';
import { GlassView } from '@/components/ui/GlassView';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { BouncyGlassButton } from '@/components/ui/BouncyGlassButton';
import { ProjectLeadSelectSheet } from '@/components/projects/setup/ProjectLeadSelectSheet';
import ContextMenu, { ContextMenuAction } from '@/components/ui/PlatformContextMenu';
import * as Haptics from 'expo-haptics';
import { supabase, APP_MODE } from '@/lib/supabase';
import { Project, getProjectById, updateProjectApi, getProjects } from '@/lib/api/projects';
import {
    getProjectGeneralSettings,
    getProjectNumberingSettings,
    getProjectTypes,
    getProjectStatuses,
    ProjectGeneralSettings,
    ProjectNumberingSettings,
    ProjectTypeItem,
    ProjectStatusItem,
} from '@/lib/api/projectSetup';
import DateTimePicker from '@react-native-community/datetimepicker';

function getInitials(nameOrEmail?: string) {
    if (!nameOrEmail) return 'U';
    const clean = nameOrEmail.trim();
    const parts = clean.split(/\s+/);
    if (parts.length >= 2 && parts[0] && parts[1]) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase();
}

export default function ProjectSetupGeneralScreen({
    projectId: propProjectId,
    isEmbedded = false,
    onSaved,
    onDirtyChange,
}: {
    projectId?: string;
    isEmbedded?: boolean;
    onSaved?: () => void;
    onDirtyChange?: (dirty: boolean) => void;
} = {}) {
    const params = useLocalSearchParams();
    const id = propProjectId || params.id;
    const projectId = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : '';

    const insets = useSafeAreaInsets();
    const { resolvedTheme } = useTheme();
    const { activeTenant } = useTenantContext();
    const isDark = resolvedTheme === 'dark';

    const bgColor = isDark ? '#000000' : '#F2F2F7';
    const cardBgColor = isDark ? '#1C1C1E' : '#FFFFFF';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';
    const dividerColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
    const formaBlue = '#007AFF';

    // State
    const [project, setProject] = useState<Project | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const showSaveError = (title: string, message: string) => {
        setSaveError(message);
        if (Platform.OS !== 'web') Alert.alert(title, message);
    };

    // Global settings & options
    const [generalSettings, setGeneralSettings] = useState<ProjectGeneralSettings | null>(null);
    const [numberingSettings, setNumberingSettings] = useState<ProjectNumberingSettings | null>(null);
    const [projectTypes, setProjectTypes] = useState<ProjectTypeItem[]>([]);
    const [projectStatuses, setProjectStatuses] = useState<ProjectStatusItem[]>([]);
    const [tenantMembers, setTenantMembers] = useState<any[]>([]);
    const [existingProjects, setExistingProjects] = useState<Project[]>([]);

    // Form fields
    const [information, setInformation] = useState<ProjectInformationDetails | null>(null);
    const [projectName, setProjectName] = useState('');
    const [projectNumber, setProjectNumber] = useState('');
    const [projectCode, setProjectCode] = useState('');
    const [selectedType, setSelectedType] = useState<string>('');
    const [selectedStatus, setSelectedStatus] = useState<string>('planning');
    const [startDate, setStartDate] = useState<Date>(new Date());
    const [targetDate, setTargetDate] = useState<Date | null>(null);
    const [selectedLeadId, setSelectedLeadId] = useState<string>('');

    // Project Lead Selector Modal
    const [showLeadModal, setShowLeadModal] = useState(false);

    useEffect(() => {
        if (projectId) {
            loadAllData();
        }
    }, [projectId, activeTenant?.id]);

    const loadAllData = async () => {
        setIsLoading(true);
        try {
            const [
                projData,
                genData,
                numData,
                typesData,
                statusesData,
                allProjects,
            ] = await Promise.all([
                getProjectById(projectId),
                getProjectGeneralSettings(),
                getProjectNumberingSettings(),
                APP_MODE === 'adidaya' ? fetchDefaultWorkspaceId().then(workspaceId => workspaceId ? fetchProjectTypes(workspaceId).then(scopeOptions) : []) : getProjectTypes(),
                getProjectStatuses(),
                getProjects(activeTenant?.id),
            ]);

            setProject(projData);
            if (APP_MODE === 'adidaya' && projData) setInformation(projectInformationDetails(projData));
            setGeneralSettings(genData);
            setNumberingSettings(numData);
            setProjectTypes(typesData.filter((t) => t.isActive));
            setProjectStatuses(statusesData.filter((s) => s.isActive));
            setExistingProjects(allProjects.filter((p) => p.id !== projectId));

            // Fetch tenant members with separate profiles lookup for reliability
            let mappedMembers: any[] = [];
            try {
                let userIds: string[] = [];
                let roleMap = new Map<string, string>();
                let memberIdMap = new Map<string, string>();

                if (activeTenant?.id) {
                    const { data: tmData } = await supabase
                        .from('tenant_members')
                        .select('id, user_id, role')
                        .eq('tenant_id', activeTenant.id);

                    if (tmData && tmData.length > 0) {
                        tmData.forEach((tm: any) => {
                            if (tm.user_id) {
                                userIds.push(tm.user_id);
                                roleMap.set(tm.user_id, tm.role || 'Member');
                                memberIdMap.set(tm.user_id, tm.id);
                            }
                        });
                    }
                }

                // If no tenant members found, fallback to current user
                if (userIds.length === 0) {
                    const { data: authData } = await supabase.auth.getUser();
                    if (authData?.user?.id) {
                        userIds.push(authData.user.id);
                        roleMap.set(authData.user.id, 'Owner');
                        memberIdMap.set(authData.user.id, authData.user.id);
                    }
                }

                if (userIds.length > 0) {
                    const { data: profiles } = await supabase
                        .from('profiles')
                        .select('id, full_name, email, avatar_url, nickname')
                        .in('id', userIds);

                    if (profiles && profiles.length > 0) {
                        mappedMembers = profiles.map((p: any) => ({
                            id: memberIdMap.get(p.id) || p.id,
                            userId: p.id,
                            name: p.full_name || p.nickname || p.email?.split('@')[0] || 'Member',
                            email: p.email || '',
                            role: roleMap.get(p.id) || 'Member',
                            avatarUrl: p.avatar_url || '',
                        }));
                    }
                }

                // If still empty, fetch from profiles table directly
                if (mappedMembers.length === 0) {
                    const { data: allProfiles } = await supabase
                        .from('profiles')
                        .select('id, full_name, email, avatar_url, nickname')
                        .limit(20);

                    if (allProfiles && allProfiles.length > 0) {
                        mappedMembers = allProfiles.map((p: any) => ({
                            id: p.id,
                            userId: p.id,
                            name: p.full_name || p.nickname || p.email?.split('@')[0] || 'Member',
                            email: p.email || '',
                            role: 'Member',
                            avatarUrl: p.avatar_url || '',
                        }));
                    }
                }
            } catch (memberErr) {
                console.warn('Error loading tenant profiles:', memberErr);
            }

            setTenantMembers(mappedMembers);

            if (projData) {
                setProjectName(projData.title || '');
                setProjectNumber(String(projData.number || '001'));
                setProjectCode(projData.code || 'PRJ');
                setSelectedStatus((projData.status || 'planning').toLowerCase());

                if (APP_MODE === 'adidaya') {
                    setSelectedType(resolveProjectScope(projData.meta || {}, typesData)?.name || '');
                } else if (projData.meta?.projectType) {
                    const rawType = String(projData.meta.projectType).trim();
                    const matchedType = typesData.find(
                        (t) =>
                            t.id.toLowerCase() === rawType.toLowerCase() ||
                            t.name.toLowerCase() === rawType.toLowerCase() ||
                            t.code.toLowerCase() === rawType.toLowerCase()
                    );
                    setSelectedType(matchedType ? matchedType.name : rawType);
                } else if (typesData.length > 0) {
                    setSelectedType(typesData[0].name);
                }

                if (projData.startDate || projData.meta?.startDate) {
                    setStartDate(new Date(projData.startDate || projData.meta.startDate));
                } else {
                    setStartDate(new Date());
                }

                if (projData.targetDate || projData.meta?.targetDate) {
                    setTargetDate(new Date(projData.targetDate || projData.meta.targetDate));
                }

                // Match and pre-populate project lead ONLY if explicitly set on project
                const leadNameFromMeta =
                    projData.meta?.projectLead ||
                    projData.meta?.projectLeadName ||
                    (projData as any).projectLead ||
                    projData.meta?.lead ||
                    '';

                const rawLeadId =
                    projData.meta?.projectLeadId ||
                    leadNameFromMeta;

                if (rawLeadId || leadNameFromMeta) {
                    const matched = mappedMembers.find(
                        (m) =>
                            m.id === rawLeadId ||
                            m.userId === rawLeadId ||
                            (leadNameFromMeta && m.name.toLowerCase() === String(leadNameFromMeta).toLowerCase())
                    );

                    if (matched) {
                        setSelectedLeadId(matched.id);
                    } else if (rawLeadId) {
                        setSelectedLeadId(rawLeadId);
                    }
                } else {
                    setSelectedLeadId('');
                }


            }
        } catch (error) {
            console.error('Error loading project setup general data:', error);
            Alert.alert('Error', 'Failed to load project details.');
        } finally {
            setIsLoading(false);
        }
    };

    // Validation: Duplicate checks
    const isNumberDuplicate = useMemo(() => {
        if (!projectNumber.trim()) return false;
        return existingProjects.some((p) => (p.number || '').toLowerCase() === projectNumber.trim().toLowerCase());
    }, [projectNumber, existingProjects]);

    const isCodeDuplicate = useMemo(() => {
        if (!projectCode.trim()) return false;
        return existingProjects.some((p) => (p.code || '').toLowerCase() === projectCode.trim().toLowerCase());
    }, [projectCode, existingProjects]);

    // Handle Project Code change with style rule
    const handleProjectCodeChange = (text: string) => {
        let clean = text.replace(/[^a-zA-Z0-9]/g, '');
        if (clean.length > 3) clean = clean.slice(0, 3);
        if (numberingSettings?.codeStyle === 'lowercase') {
            clean = clean.toLowerCase();
        } else {
            clean = clean.toUpperCase();
        }
        setProjectCode(clean);
    };

    // Selected lead info
    const selectedLead = useMemo(() => {
        if (!selectedLeadId) return null;
        const found = tenantMembers.find((m) => m.id === selectedLeadId || m.userId === selectedLeadId || m.name === selectedLeadId);
        if (found) return found;
        if (project?.meta?.projectLead) {
            return {
                id: project.meta.projectLeadId || selectedLeadId,
                name: project.meta.projectLead,
                role: 'Project Lead',
            };
        }
        return {
            id: selectedLeadId,
            name: selectedLeadId,
            role: 'Project Lead',
        };
    }, [tenantMembers, selectedLeadId, project?.meta?.projectLead, project?.meta?.projectLeadId]);

    // Selected status info
    const selectedStatusItem = useMemo(() => {
        return projectStatuses.find((s) => s.name.toLowerCase() === selectedStatus.toLowerCase()) || null;
    }, [projectStatuses, selectedStatus]);

    // Context Menu Actions for Project Type
    const typeMenuActions: ContextMenuAction[] = useMemo(() => {
        return projectTypes.map((type) => ({
            title: type.name,
            state: selectedType === type.name ? 'on' : 'off',
        }));
    }, [projectTypes, selectedType]);

    // Context Menu Actions for Project Status
    const statusMenuActions: ContextMenuAction[] = useMemo(() => {
        return projectStatuses.map((st) => ({
            title: st.name,
            state: selectedStatus.toLowerCase() === st.name.toLowerCase() ? 'on' : 'off',
        }));
    }, [projectStatuses, selectedStatus]);

    const formSnapshot = JSON.stringify({ projectName, projectNumber, projectCode, selectedType, selectedStatus,
        startDate: startDate?.toISOString(), targetDate: targetDate?.toISOString(),
        selectedLeadId, lead: selectedLead?.id || null, information });
    const [savedSnapshot, setSavedSnapshot] = useState('');
    useEffect(() => {
        if (!isLoading) setSavedSnapshot(formSnapshot);
    }, [isLoading]);
    const hasChanges = !!savedSnapshot && savedSnapshot !== formSnapshot;
    const feedback = useProjectSaveFeedback(hasChanges, onDirtyChange);

    const handleSave = async () => {
        Haptics.selectionAsync();
        setSaveError('');
        feedback.clear();

        try { if (information) validateProjectInformation(information); }
        catch (error) { showSaveError('Validation Error', error instanceof Error ? error.message : 'Invalid project information.'); return; }

        if (!projectName.trim()) {
            showSaveError('Validation Error', 'Project name is required.');
            return;
        }

        if (projectCode.length !== 3) {
            showSaveError('Validation Error', 'Project code must be exactly 3 characters.');
            return;
        }

        if (isNumberDuplicate) {
            showSaveError('Validation Error', `Project number "${projectNumber}" is already in use by another project.`);
            return;
        }

        if (isCodeDuplicate) {
            showSaveError('Validation Error', `Project code "${projectCode}" is already in use by another project.`);
            return;
        }

        const effectiveLeadId = selectedLead?.id || (selectedLeadId ? selectedLeadId : null);
        const effectiveLeadName = selectedLead?.name || (selectedLeadId ? selectedLeadId : null);


        if (generalSettings?.requireStartDate && !startDate) {
            showSaveError('Validation Error', 'A Start Date is required.');
            return;
        }

        if (generalSettings?.requireTargetDate && !generalSettings?.allowNoTargetDate && !targetDate) {
            showSaveError('Validation Error', 'A End Date is required for this project.');
            return;
        }

        setIsSaving(true);
        try {
            // Rule #6: When Project Lead is changed, newly assigned Lead becomes a Project Member.
            // Previous Lead remains a Project Member with role 'Member'.
            const currentMembers: any[] = project?.meta?.members || [];
            let updatedMembers = [...currentMembers];

            // 1. Demote old lead to 'Member' if they were 'Project Lead'
            updatedMembers = updatedMembers.map((m) => {
                if (m.projectRole === 'Project Lead' && m.id !== effectiveLeadId && m.name !== effectiveLeadName) {
                    return { ...m, projectRole: 'Member' };
                }
                return m;
            });

            // 2. Add or promote new lead
            const newLeadIdx = updatedMembers.findIndex(
                (m) => m.id === effectiveLeadId || m.name === effectiveLeadName || (effectiveLeadId && m.userId === effectiveLeadId)
            );

            if (newLeadIdx >= 0) {
                updatedMembers[newLeadIdx] = {
                    ...updatedMembers[newLeadIdx],
                    projectRole: 'Project Lead',
                };
            } else if (effectiveLeadName) {
                updatedMembers.push({
                    id: effectiveLeadId || effectiveLeadName,
                    userId: (selectedLead as any)?.userId || effectiveLeadId || '',
                    name: effectiveLeadName,
                    email: (selectedLead as any)?.email || '',
                    projectRole: 'Project Lead',
                });
            }

            const updatedMeta = {
                ...(project?.meta || {}),
                ...(information ? {
                    ...(information.currentStage ? { currentStage: information.currentStage } : {}),
                    category: information.category, disciplines: information.disciplines,
                    landArea: information.landArea, buildingArea: information.buildingArea,
                    floors: information.floors, rabClass: information.rabClass,
                    buildingMassCount: information.buildingMassCount, buildingMasses: information.buildingMasses,
                    clientName: information.clientName, clientContact: information.clientContact,
                } : {}),
                ...(APP_MODE === 'adidaya'
                    ? (projectTypes.find(type => type.name === selectedType) ? { projectType: selectedType, type: projectTypes.find(type => type.name === selectedType)!.id } : {})
                    : { projectType: selectedType }),
                startDate: startDate ? startDate.toISOString() : null,
                targetDate: targetDate ? targetDate.toISOString() : null,
                projectLeadId: effectiveLeadId,
                projectLead: effectiveLeadName,
                members: updatedMembers,
            };

            const savedProject = await updateProjectApi(projectId, {
                title: projectName.trim(),
                number: projectNumber.trim(),
                startDate: startDate?.toISOString() || undefined,
                targetDate: targetDate?.toISOString() || null as any,
                code: projectCode.trim(),
                status: selectedStatus.toLowerCase(),
                meta: updatedMeta,
                ...(information ? { ...(information.currentStage ? { currentStage: information.currentStage } : {}), locationDetails: information.location, buildingMassCount: information.buildingMassCount, buildingMasses: information.buildingMasses } : {}),
            });

            if (!savedProject) throw new Error('Project update did not return a saved project.');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setProject(savedProject);
            setSavedSnapshot(formSnapshot);
            feedback.notify('Success', 'Project settings saved.');
            onSaved?.();
        } catch (error) {
            console.error('Error saving project general details:', error);
            showSaveError('Error', error instanceof Error ? error.message : (error as any)?.message || 'Failed to save project details.');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <View style={[s.container, { backgroundColor: bgColor, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={formaBlue} />
            </View>
        );
    }

    return (
        <View style={[s.container, { backgroundColor: bgColor }]}>
            {!isEmbedded && (
                <Stack.Screen
                    options={{
                        headerShown: true,
                        title: 'Project Information',
                        headerLargeTitle: false,
                        headerTransparent: Platform.OS === 'ios',
                        headerShadowVisible: false,
                        headerBackground: Platform.OS === 'ios' ? () => <HeaderBlurBackground isDark={isDark} /> : undefined,
                        headerStyle: { backgroundColor: Platform.OS === 'ios' ? 'transparent' : (isDark ? '#000000' : '#F2F2F7') },
                        headerTintColor: textColor,
                        headerTitleStyle: { color: textColor, fontWeight: '700' },
                        headerLeft: () => (
                            <BouncyGlassButton
                                onPress={() => router.back()}
                                isDark={isDark}
                                variant="back"
                                textColor={textColor}
                                style={{ marginLeft: 0 }}
                            />
                        ),
                        headerRight: () => (
                            <TouchableOpacity
                                onPress={handleSave}
                                disabled={isSaving || !hasChanges}
                                hitSlop={10}
                                style={{ paddingHorizontal: 4 }}
                            >
                                {isSaving ? (
                                    <ActivityIndicator size="small" color={formaBlue} />
                                ) : (
                                    <Text style={s.headerSaveBtn}>Save</Text>
                                )}
                            </TouchableOpacity>
                        ),
                    }}
                />
            )}

            <ProjectSaveFeedback message={feedback.message} failed={feedback.failed} />
            {!!saveError && <Text accessibilityRole="alert" style={{ color: '#FF3B30', paddingHorizontal: 24, paddingVertical: 12 }}>{saveError}</Text>}
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{
                    paddingTop: isEmbedded ? 16 : (Platform.OS === 'ios' ? insets.top + 60 : 24),
                    paddingBottom: insets.bottom + (isEmbedded ? 120 : 40),
                    paddingHorizontal: 16,
                    gap: 22,
                }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* 1. Identity Section */}
                <View style={s.sectionBlock}>
                    <Text style={[s.sectionHeaderLabel, { color: subtextColor }]}>
                        Identity
                    </Text>

                    <GlassView
                        intensity={isDark ? 10 : 25}
                        style={[s.card, { backgroundColor: cardBgColor }]}
                    >
                        {/* Project Name */}
                        <View style={s.row}>
                            <Text style={[s.settingTitle, { color: textColor }]}>Project Name</Text>
                            <TextInput
                                value={projectName}
                                onChangeText={setProjectName}
                                placeholder="Project Name"
                                placeholderTextColor={subtextColor}
                                style={[s.rightTextInput, { color: textColor }]}
                            />
                        </View>

                        <View style={[s.divider, { backgroundColor: dividerColor }]} />

                        {/* Project Number */}
                        <View style={s.row}>
                            <Text style={[s.settingTitle, { color: textColor }]}>Project Number</Text>
                            <TextInput
                                value={projectNumber}
                                onChangeText={setProjectNumber}
                                placeholder="001"
                                placeholderTextColor={subtextColor}
                                style={[
                                    s.rightTextInput,
                                    { color: isNumberDuplicate ? '#FF3B30' : textColor }
                                ]}
                            />
                        </View>

                        <View style={[s.divider, { backgroundColor: dividerColor }]} />

                        {/* Project Code */}
                        <View style={s.row}>
                            <Text style={[s.settingTitle, { color: textColor }]}>Project Code (3 letters)</Text>
                            <TextInput
                                value={projectCode}
                                onChangeText={handleProjectCodeChange}
                                maxLength={3}
                                autoCapitalize="characters"
                                placeholder="SSB"
                                placeholderTextColor={subtextColor}
                                style={[
                                    s.rightTextInput,
                                    {
                                        color: isCodeDuplicate ? '#FF3B30' : textColor,
                                        fontWeight: '700',
                                        letterSpacing: 1.5,
                                    }
                                ]}
                            />
                        </View>

                        <View style={[s.divider, { backgroundColor: dividerColor }]} />

                        {/* Project Type: Native Pulldown ContextMenu */}
                        {projectTypes.length > 0 && (
                            <>
                                <ContextMenu
                                    actions={typeMenuActions}
                                    onPress={(e) => {
                                        Haptics.selectionAsync();
                                        const chosen = projectTypes[e.nativeEvent.index];
                                        if (chosen) setSelectedType(chosen.name);
                                    }}
                                    dropdownMenuMode={true}
                                >
                                    <View style={s.row}>
                                        <Text style={[s.settingTitle, { color: textColor }]}>Project Type</Text>
                                        <View style={s.disclosureRight}>
                                            <Text style={[s.disclosureValue, { color: selectedType ? textColor : subtextColor }]}>
                                                {selectedType || 'Select Type'}
                                            </Text>
                                            <PlatformIcon name="chevron.down" size={13} tintColor={subtextColor} />
                                        </View>
                                    </View>
                                </ContextMenu>
                                <View style={[s.divider, { backgroundColor: dividerColor }]} />
                            </>
                        )}

                        {/* Project Status: Native Pulldown ContextMenu */}
                        <ContextMenu
                            actions={statusMenuActions}
                            onPress={(e) => {
                                Haptics.selectionAsync();
                                const chosen = projectStatuses[e.nativeEvent.index];
                                if (chosen) setSelectedStatus(chosen.name.toLowerCase());
                            }}
                            dropdownMenuMode={true}
                        >
                            <View style={s.row}>
                                <Text style={[s.settingTitle, { color: textColor }]}>Project Status</Text>
                                <View style={s.disclosureRight}>
                                    {selectedStatusItem?.color && (
                                        <View style={[s.statusDot, { backgroundColor: selectedStatusItem.color }]} />
                                    )}
                                    <Text style={[s.disclosureValue, { color: textColor, textTransform: 'capitalize' }]}>
                                        {selectedStatus || 'Planning'}
                                    </Text>
                                    <PlatformIcon name="chevron.down" size={13} tintColor={subtextColor} />
                                </View>
                            </View>
                        </ContextMenu>
                    </GlassView>
                </View>

                {APP_MODE === 'adidaya' && information && <>
                    <ProjectInformationSections position="stages" value={information} onChange={setInformation} scopeId={projectTypes.find(type => type.name === selectedType)?.id} currentStage={information.currentStage} isDark={isDark} />
                    <ProjectInformationSections value={information} onChange={setInformation} isDark={isDark} />
                </>}

                {/* 2. Timeline Section */}
                <View style={s.sectionBlock}>
                    <Text style={[s.sectionHeaderLabel, { color: subtextColor }]}>
                        Timeline
                    </Text>

                    <GlassView
                        intensity={isDark ? 10 : 25}
                        style={[s.card, { backgroundColor: cardBgColor }]}
                    >
                        {/* Start Date: Native iOS Compact DatePicker */}
                        <View style={s.row}>
                            <Text style={[s.settingTitle, { color: textColor }]}>
                                Start Date {generalSettings?.requireStartDate && '*'}
                            </Text>
                            {Platform.OS === 'web' ? React.createElement('input' as any, { type: 'date', value: startDate ? new Date(startDate.getTime() - startDate.getTimezoneOffset() * 60000).toISOString().slice(0, 10) : '', onChange: (event: any) => event.target.value && setStartDate(new Date(event.target.value + 'T12:00:00')), style: { colorScheme: isDark ? 'dark' : 'light', background: 'transparent', color: textColor, border: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', fontSize: 17, fontWeight: 400, maxWidth: 170 } }) : (<DateTimePicker
                                value={startDate}
                                mode="date"
                                display="compact"
                                themeVariant={isDark ? 'dark' : 'light'}
                                accentColor={formaBlue}
                                onChange={(_, date) => {
                                    if (date) setStartDate(date);
                                }}
                                style={s.nativeDatePicker}
                            />)}
                        </View>

                        <View style={[s.divider, { backgroundColor: dividerColor }]} />

                        {/* End Date: Optional */}
                        <View style={s.row}>
                            <Text style={[s.settingTitle, { color: textColor }]}>
                                End Date {generalSettings?.requireTargetDate && !generalSettings?.allowNoTargetDate && '*'}
                            </Text>
                            {targetDate ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <TouchableOpacity
                                        onPress={() => setTargetDate(null)}
                                        hitSlop={8}
                                        style={s.clearBtnContainer}
                                    >
                                        <Ionicons name="close-circle" size={18} color={subtextColor} />
                                    </TouchableOpacity>
                                    {Platform.OS === 'web' ? React.createElement('input' as any, { type: 'date', value: targetDate ? new Date(targetDate.getTime() - targetDate.getTimezoneOffset() * 60000).toISOString().slice(0, 10) : '', onChange: (event: any) => setTargetDate(event.target.value ? new Date(event.target.value + 'T12:00:00') : null), style: { colorScheme: isDark ? 'dark' : 'light', background: 'transparent', color: textColor, border: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', fontSize: 17, fontWeight: 400, maxWidth: 170 } }) : (<DateTimePicker
                                        value={targetDate}
                                        mode="date"
                                        display="compact"
                                        themeVariant={isDark ? 'dark' : 'light'}
                                        accentColor={formaBlue}
                                        onChange={(_, date) => {
                                            if (date) setTargetDate(date);
                                        }}
                                        style={s.nativeDatePicker}
                                    />)}
                                </View>
                            ) : (
                                <TouchableOpacity
                                    onPress={() => {
                                        Haptics.selectionAsync();
                                        setTargetDate(new Date());
                                    }}
                                    activeOpacity={0.7}
                                    style={s.addDateBtn}
                                >
                                    <Text style={[s.addDateBtnText, { color: formaBlue }]}>+ Set Date</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </GlassView>
                </View>

                {/* 3. Project Lead Section */}
                <View style={s.sectionBlock}>
                    <Text style={[s.sectionHeaderLabel, { color: subtextColor }]}>
                        Project Lead (optional)
                    </Text>

                    <GlassView
                        intensity={isDark ? 10 : 25}
                        style={[s.card, { backgroundColor: cardBgColor }]}
                    >
                        <TouchableOpacity
                            style={s.row}
                            onPress={() => setShowLeadModal(true)}
                            activeOpacity={0.7}
                        >
                            {selectedLead ? (
                                <View style={s.leadLeftCol}>
                                    {selectedLead.avatarUrl ? (
                                        <Image
                                            source={{ uri: selectedLead.avatarUrl }}
                                            style={s.leadAvatarCircle}
                                        />
                                    ) : (
                                        <View style={[s.leadAvatarCircle, { backgroundColor: activeTenant?.primary_color || formaBlue }]}>
                                            <Text style={s.leadAvatarInitial}>
                                                {getInitials(selectedLead.name || selectedLead.email)}
                                            </Text>
                                        </View>
                                    )}
                                    <View style={{ gap: 2 }}>
                                        <Text style={[s.settingTitle, { color: textColor }]}>
                                            {selectedLead.name}
                                        </Text>
                                        <Text style={[s.settingSubtitle, { color: subtextColor }]}>
                                            {selectedLead.role || 'Project Lead'}
                                        </Text>
                                    </View>
                                </View>
                            ) : (
                                <View style={s.leadLeftCol}>
                                    <View style={[s.leadAvatarCircle, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}>
                                        <Ionicons name="person-outline" size={18} color={subtextColor} />
                                    </View>
                                    <Text style={[s.settingTitle, { color: subtextColor }]}>
                                        Assign Project Lead
                                    </Text>
                                </View>
                            )}

                            <View style={s.disclosureRight}>
                                <Text style={{ color: formaBlue, fontSize: 15, fontWeight: '500' }}>
                                    {selectedLead ? 'Change' : 'Select'}
                                </Text>
                                <PlatformIcon name="chevron.down" size={14} tintColor={formaBlue} />
                            </View>
                        </TouchableOpacity>
                    </GlassView>
                </View>

            </ScrollView>

            {isEmbedded && hasChanges && <Animated.View entering={FadeInDown.springify().damping(15)} exiting={FadeOutDown.springify().damping(15)} style={{ position: 'absolute', left: 20, right: 20, bottom: Math.max(insets.bottom, 16), borderRadius: 24, overflow: 'hidden', zIndex: 9999 }}>
                <LiquidCard variant="clear" contentStyle={{ paddingHorizontal: 16, paddingVertical: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}><View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF3B30' }} /><Text style={{ color: textColor, fontSize: 16, fontWeight: '600' }}>Unsaved Changes</Text></View>
                        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Save project information" onPress={handleSave} disabled={isSaving} style={{ backgroundColor: formaBlue, paddingHorizontal: 22, paddingVertical: 10, borderRadius: 999, opacity: isSaving ? 0.6 : 1 }}>
                            {isSaving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '600' }}>Save</Text>}
                        </TouchableOpacity>
                    </View>
                </LiquidCard>
            </Animated.View>}

            {/* Native SwiftUI Bottom Sheet for Project Lead */}
            <ProjectLeadSelectSheet
                visible={showLeadModal}
                onClose={() => setShowLeadModal(false)}
                members={tenantMembers}
                selectedLeadId={selectedLead?.id || selectedLeadId}
                onSelect={(member: any) => {
                    setSelectedLeadId(member.id);
                }}
            />
        </View>
    );
}

const s = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerSaveBtn: {
        color: '#007AFF',
        fontSize: 17,
        fontWeight: '600',
    },
    sectionBlock: {
        gap: 8,
    },
    sectionHeaderLabel: {
        fontSize: 13,
        fontWeight: '600',
        paddingHorizontal: 12,
        letterSpacing: -0.1,
    },
    card: {
        borderRadius: 24,
        overflow: 'hidden',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        gap: 12,
        justifyContent: 'space-between',
        minHeight: 52,
    },
    rightTextInput: {
        fontSize: 16,
        textAlign: 'right',
        flex: 1,
        paddingVertical: 4,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 16,
        marginRight: 0,
    },
    textCol: {
        flex: 1,
        gap: 2,
    },
    settingTitle: {
        fontSize: 16,
        fontWeight: '500',
        letterSpacing: -0.3,
    },
    settingSubtitle: {
        fontSize: 13,
        fontWeight: '400',
        lineHeight: 18,
    },
    disclosureRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    disclosureValue: {
        fontSize: 16,
        fontWeight: '400',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    nativeDatePicker: {
        height: 36,
        alignSelf: 'center',
    },
    addDateBtn: { paddingVertical: 8, paddingHorizontal: 4 },
    addDateBtnText: { fontSize: 16, fontWeight: '500' },
    clearBtnContainer: {
        padding: 4,
    },
    leadLeftCol: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    leadAvatarCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    leadAvatarInitial: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
});
