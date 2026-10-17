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
import { supabase } from '@/lib/supabase';
import { Project, getProjectById, updateProjectApi, getProjects } from '@/lib/api/projects';
import {
    getProjectGeneralSettings,
    getProjectNumberingSettings,
    getProjectTypes,
    getProjectStatuses,
    getProjectTrackingSettings,
    ProjectGeneralSettings,
    ProjectNumberingSettings,
    ProjectTypeItem,
    ProjectStatusItem,
    ProjectTrackingSettings,
    TrackingMethod,
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
}: {
    projectId?: string;
    isEmbedded?: boolean;
    onSaved?: () => void;
} = {}) {
    const params = useLocalSearchParams();
    const id = propProjectId || params.id;
    const projectId = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : '';

    const insets = useSafeAreaInsets();
    const { resolvedTheme } = useTheme();
    const { activeTenant } = useTenantContext();
    const isDark = resolvedTheme === 'dark';

    const bgColor = isDark ? '#000000' : '#F2F2F7';
    const cardBgColor = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.7)';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';
    const dividerColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
    const formaBlue = '#0036F8';

    // State
    const [project, setProject] = useState<Project | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Global settings & options
    const [generalSettings, setGeneralSettings] = useState<ProjectGeneralSettings | null>(null);
    const [numberingSettings, setNumberingSettings] = useState<ProjectNumberingSettings | null>(null);
    const [projectTypes, setProjectTypes] = useState<ProjectTypeItem[]>([]);
    const [projectStatuses, setProjectStatuses] = useState<ProjectStatusItem[]>([]);
    const [trackingSettings, setTrackingSettings] = useState<ProjectTrackingSettings | null>(null);
    const [tenantMembers, setTenantMembers] = useState<any[]>([]);
    const [existingProjects, setExistingProjects] = useState<Project[]>([]);

    // Form fields
    const [projectName, setProjectName] = useState('');
    const [projectNumber, setProjectNumber] = useState('');
    const [projectCode, setProjectCode] = useState('');
    const [selectedType, setSelectedType] = useState<string>('');
    const [selectedStatus, setSelectedStatus] = useState<string>('planning');
    const [startDate, setStartDate] = useState<Date>(new Date());
    const [targetDate, setTargetDate] = useState<Date | null>(null);
    const [selectedLeadId, setSelectedLeadId] = useState<string>('');
    const [trackingMethod, setTrackingMethod] = useState<TrackingMethod>('manual');

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
                trackData,
                allProjects,
            ] = await Promise.all([
                getProjectById(projectId),
                getProjectGeneralSettings(),
                getProjectNumberingSettings(),
                getProjectTypes(),
                getProjectStatuses(),
                getProjectTrackingSettings(),
                getProjects(activeTenant?.id),
            ]);

            setProject(projData);
            setGeneralSettings(genData);
            setNumberingSettings(numData);
            setProjectTypes(typesData.filter((t) => t.isActive));
            setProjectStatuses(statusesData.filter((s) => s.isActive));
            setTrackingSettings(trackData);
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
                setProjectNumber(projData.number || '001');
                setProjectCode(projData.code || 'PRJ');
                setSelectedStatus((projData.status || 'planning').toLowerCase());

                if (projData.meta?.projectType) {
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

                if (projData.meta?.startDate) {
                    setStartDate(new Date(projData.meta.startDate));
                } else {
                    setStartDate(new Date());
                }

                if (projData.meta?.targetDate) {
                    setTargetDate(new Date(projData.meta.targetDate));
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

                if (projData.meta?.trackingMethod) {
                    setTrackingMethod(projData.meta.trackingMethod);
                } else if (projData.meta?.progressTracking) {
                    setTrackingMethod(projData.meta.progressTracking);
                } else if (trackData?.defaultMethod && trackData.defaultMethod !== 'none') {
                    setTrackingMethod(trackData.defaultMethod);
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

    const handleSave = async () => {
        Haptics.selectionAsync();

        if (!projectName.trim()) {
            Alert.alert('Validation Error', 'Project name is required.');
            return;
        }

        if (projectCode.length !== 3) {
            Alert.alert('Validation Error', 'Project code must be exactly 3 characters.');
            return;
        }

        if (isNumberDuplicate) {
            Alert.alert('Validation Error', `Project number "${projectNumber}" is already in use by another project.`);
            return;
        }

        if (isCodeDuplicate) {
            Alert.alert('Validation Error', `Project code "${projectCode}" is already in use by another project.`);
            return;
        }

        const effectiveLeadId = selectedLead?.id || (selectedLeadId ? selectedLeadId : null);
        const effectiveLeadName = selectedLead?.name || (selectedLeadId ? selectedLeadId : null);

        if (generalSettings?.requireProjectLead && !effectiveLeadName) {
            Alert.alert('Validation Error', 'A Project Lead must be assigned for this project.');
            return;
        }

        if (generalSettings?.requireStartDate && !startDate) {
            Alert.alert('Validation Error', 'A Start Date is required.');
            return;
        }

        if (generalSettings?.requireTargetDate && !generalSettings?.allowNoTargetDate && !targetDate) {
            Alert.alert('Validation Error', 'A Target Date is required for this project.');
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
                    userId: (effectiveLead as any)?.userId || effectiveLeadId || '',
                    name: effectiveLeadName,
                    email: (effectiveLead as any)?.email || '',
                    projectRole: 'Project Lead',
                });
            }

            const updatedMeta = {
                ...(project?.meta || {}),
                projectType: selectedType,
                startDate: startDate ? startDate.toISOString() : null,
                targetDate: targetDate ? targetDate.toISOString() : null,
                projectLeadId: effectiveLeadId,
                projectLead: effectiveLeadName,
                trackingMethod: trackingMethod,
                progressTracking: trackingMethod,
                members: updatedMembers,
            };

            await updateProjectApi(projectId, {
                title: projectName.trim(),
                number: projectNumber.trim(),
                code: projectCode.trim(),
                status: selectedStatus.toLowerCase(),
                meta: updatedMeta,
            });

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.back();
        } catch (error) {
            console.error('Error saving project general details:', error);
            Alert.alert('Error', 'Failed to save project details.');
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

    const TRACKING_OPTIONS: { id: TrackingMethod; label: string; desc: string }[] = [
        { id: 'manual', label: 'Manual', desc: 'Enter project progress percentage directly.' },
        { id: 'tasks', label: 'From Tasks', desc: 'Calculate progress automatically from completed tasks.' },
        { id: 'milestones', label: 'From Milestones', desc: 'Calculate progress automatically from milestones.' },
        { id: 'none', label: 'No Progress', desc: 'Do not calculate or show percentage progress.' },
    ];

    const availableTrackingOptions = TRACKING_OPTIONS.filter((opt) => {
        if (opt.id === 'none') return true;
        if (!trackingSettings?.enabledMethods) return true;
        return trackingSettings.enabledMethods.includes(opt.id);
    });

    return (
        <View style={[s.container, { backgroundColor: bgColor }]}>
            {!isEmbedded && (
                <Stack.Screen
                    options={{
                        headerShown: true,
                        title: 'General',
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
                                disabled={isSaving}
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

            {isEmbedded && (
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 20,
                    paddingTop: 16,
                    paddingBottom: 12,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: dividerColor,
                    backgroundColor: isDark ? '#121214' : '#FFFFFF',
                }}>
                    <View>
                        <Text style={{ fontSize: 17, fontWeight: '700', color: textColor }}>General Settings</Text>
                        <Text style={{ fontSize: 12, color: subtextColor }}>Project identity, lead, timeline & tracking</Text>
                    </View>
                    <TouchableOpacity
                        onPress={async () => {
                            await handleSave();
                            onSaved?.();
                        }}
                        disabled={isSaving}
                        style={{
                            paddingHorizontal: 16,
                            paddingVertical: 7,
                            borderRadius: 16,
                            backgroundColor: formaBlue,
                        }}
                    >
                        {isSaving ? (
                            <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                            <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>Save Changes</Text>
                        )}
                    </TouchableOpacity>
                </View>
            )}

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{
                    paddingTop: isEmbedded ? 16 : (Platform.OS === 'ios' ? insets.top + 60 : 24),
                    paddingBottom: insets.bottom + 40,
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
                                            <PlatformIcon name="chevron.up.chevron.down" size={13} tintColor={subtextColor} />
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
                                    <PlatformIcon name="chevron.up.chevron.down" size={13} tintColor={subtextColor} />
                                </View>
                            </View>
                        </ContextMenu>
                    </GlassView>
                </View>

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
                            <DateTimePicker
                                value={startDate}
                                mode="date"
                                display="compact"
                                themeVariant={isDark ? 'dark' : 'light'}
                                accentColor={formaBlue}
                                onChange={(_, date) => {
                                    if (date) setStartDate(date);
                                }}
                                style={s.nativeDatePicker}
                            />
                        </View>

                        <View style={[s.divider, { backgroundColor: dividerColor }]} />

                        {/* Target Date: Optional */}
                        <View style={s.row}>
                            <Text style={[s.settingTitle, { color: textColor }]}>
                                Target Date {generalSettings?.requireTargetDate && !generalSettings?.allowNoTargetDate && '*'}
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
                                    <DateTimePicker
                                        value={targetDate}
                                        mode="date"
                                        display="compact"
                                        themeVariant={isDark ? 'dark' : 'light'}
                                        accentColor={formaBlue}
                                        onChange={(_, date) => {
                                            if (date) setTargetDate(date);
                                        }}
                                        style={s.nativeDatePicker}
                                    />
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
                        Project Lead
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
                                <PlatformIcon name="chevron.right" size={14} tintColor={formaBlue} />
                            </View>
                        </TouchableOpacity>
                    </GlassView>
                </View>

                {/* 4. Progress Tracking Section */}
                <View style={s.sectionBlock}>
                    <Text style={[s.sectionHeaderLabel, { color: subtextColor }]}>
                        Progress Tracking
                    </Text>

                    <GlassView
                        intensity={isDark ? 10 : 25}
                        style={[s.card, { backgroundColor: cardBgColor }]}
                    >
                        {availableTrackingOptions.map((opt, idx) => {
                            const isSelected = trackingMethod === opt.id;
                            const isLast = idx === availableTrackingOptions.length - 1;
                            return (
                                <React.Fragment key={opt.id}>
                                    <TouchableOpacity
                                        style={s.row}
                                        onPress={() => {
                                            Haptics.selectionAsync();
                                            setTrackingMethod(opt.id);
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <View style={s.textCol}>
                                            <Text style={[s.settingTitle, { color: isSelected ? formaBlue : textColor }]}>
                                                {opt.label}
                                            </Text>
                                            <Text style={[s.settingSubtitle, { color: subtextColor }]}>
                                                {opt.desc}
                                            </Text>
                                        </View>
                                        <Ionicons
                                            name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                                            size={22}
                                            color={isSelected ? formaBlue : (isDark ? '#48484A' : '#C7C7CC')}
                                        />
                                    </TouchableOpacity>
                                    {!isLast && <View style={[s.divider, { backgroundColor: dividerColor }]} />}
                                </React.Fragment>
                            );
                        })}
                    </GlassView>
                </View>
            </ScrollView>

            {/* Native SwiftUI Bottom Sheet for Project Lead */}
            <ProjectLeadSelectSheet
                visible={showLeadModal}
                onClose={() => setShowLeadModal(false)}
                members={tenantMembers}
                selectedLeadId={selectedLead?.id || selectedLeadId}
                onSelect={(member) => {
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
        color: '#0036F8',
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
