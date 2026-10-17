import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
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
import { SwiftUISearchBar } from '@/components/chat/SwiftUISearchBar';
import { ProjectAddMemberSheet } from '@/components/projects/setup/ProjectAddMemberSheet';
import ContextMenu from '@/components/ui/PlatformContextMenu';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { Project, getProjectById, updateProjectApi } from '@/lib/api/projects';
import {
    getProjectRoles,
    getProjectGeneralSettings,
    ProjectRoleItem,
    ProjectGeneralSettings,
} from '@/lib/api/projectSetup';

interface ProjectMember {
    id: string;
    userId: string;
    name: string;
    email: string;
    projectRole: string;
    avatarUrl?: string;
}

function getInitials(nameOrEmail?: string) {
    if (!nameOrEmail) return 'U';
    const clean = nameOrEmail.trim();
    const parts = clean.split(/\s+/);
    if (parts.length >= 2 && parts[0] && parts[1]) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase();
}

export default function ProjectSetupTeamScreen({
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
    const formaBlue = '#007AFF';

    const [project, setProject] = useState<Project | null>(null);
    const [projectRoles, setProjectRoles] = useState<ProjectRoleItem[]>([]);
    const [generalSettings, setGeneralSettings] = useState<ProjectGeneralSettings | null>(null);
    const [tenantMembers, setTenantMembers] = useState<any[]>([]);
    const [members, setMembers] = useState<ProjectMember[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Search state
    const [memberSearch, setMemberSearch] = useState('');

    // Add Member Bottom Sheet
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);

    useEffect(() => {
        if (projectId) {
            loadTeamData();
        }
    }, [projectId, activeTenant?.id]);

    const loadTeamData = async () => {
        setIsLoading(true);
        try {
            const [projData, rolesData, genData] = await Promise.all([
                getProjectById(projectId),
                getProjectRoles(),
                getProjectGeneralSettings(),
            ]);

            setProject(projData);
            setProjectRoles(rolesData.filter((r) => r.isActive));
            setGeneralSettings(genData);

            // Fetch tenant members
            let mappedTenant: any[] = [];
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

            if (userIds.length > 0) {
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, full_name, email, avatar_url, nickname')
                    .in('id', userIds);

                if (profiles && profiles.length > 0) {
                    mappedTenant = profiles.map((p: any) => ({
                        id: memberIdMap.get(p.id) || p.id,
                        userId: p.id,
                        name: p.full_name || p.nickname || p.email?.split('@')[0] || 'Member',
                        email: p.email || '',
                        role: roleMap.get(p.id) || 'Member',
                        avatarUrl: p.avatar_url || '',
                    }));
                }
            }

            // If empty, query profiles fallback
            if (mappedTenant.length === 0) {
                const { data: allProfiles } = await supabase
                    .from('profiles')
                    .select('id, full_name, email, avatar_url, nickname')
                    .limit(20);

                if (allProfiles && allProfiles.length > 0) {
                    mappedTenant = allProfiles.map((p: any) => ({
                        id: p.id,
                        userId: p.id,
                        name: p.full_name || p.nickname || p.email?.split('@')[0] || 'Member',
                        email: p.email || '',
                        role: 'Member',
                        avatarUrl: p.avatar_url || '',
                    }));
                }
            }

            setTenantMembers(mappedTenant);

            let savedMembers: ProjectMember[] = projData?.meta?.members || [];
            if (savedMembers.length === 0) {
                // Rule #5: Auto-populate creator and project lead without duplicate
                const initial: ProjectMember[] = [];
                const { data: authData } = await supabase.auth.getUser();
                const currentUserId = authData?.user?.id;
                const leadName = projData?.meta?.projectLead || (projData as any)?.projectLead;
                const leadId = projData?.meta?.projectLeadId;

                const creatorMember = mappedTenant.find((m) => m.userId === currentUserId || m.id === currentUserId);
                const leadMember = mappedTenant.find(
                    (m) =>
                        (leadId && (m.id === leadId || m.userId === leadId)) ||
                        (leadName && m.name.toLowerCase() === String(leadName).toLowerCase())
                );

                if (creatorMember) {
                    const isCreatorLead = leadMember && (leadMember.id === creatorMember.id || leadMember.userId === creatorMember.userId);
                    initial.push({
                        id: creatorMember.id,
                        userId: creatorMember.userId,
                        name: creatorMember.name,
                        email: creatorMember.email,
                        projectRole: isCreatorLead ? 'Project Lead' : 'Member',
                        avatarUrl: creatorMember.avatarUrl || '',
                    });
                }

                if (leadMember && !initial.some((m) => m.id === leadMember.id || m.userId === leadMember.userId)) {
                    initial.push({
                        id: leadMember.id,
                        userId: leadMember.userId,
                        name: leadMember.name,
                        email: leadMember.email,
                        projectRole: 'Project Lead',
                        avatarUrl: leadMember.avatarUrl || '',
                    });
                } else if (!leadMember && leadName && !initial.some((m) => m.name.toLowerCase() === String(leadName).toLowerCase())) {
                    initial.push({
                        id: leadId || leadName,
                        userId: leadId || '',
                        name: leadName,
                        email: '',
                        projectRole: 'Project Lead',
                        avatarUrl: '',
                    });
                }

                savedMembers = initial;
                if (initial.length > 0) {
                    await updateProjectApi(projectId, {
                        meta: {
                            ...(projData?.meta || {}),
                            members: initial,
                        },
                    });
                }
            } else {
                // Enrich existing saved members with their real avatarUrl from profiles
                savedMembers = savedMembers.map((sm) => {
                    const tm = mappedTenant.find(
                        (t) =>
                            t.id === sm.id ||
                            t.userId === sm.userId ||
                            (sm.email && t.email && t.email.toLowerCase() === sm.email.toLowerCase()) ||
                            (t.name && sm.name && t.name.toLowerCase() === sm.name.toLowerCase())
                    );
                    return {
                        ...sm,
                        avatarUrl: sm.avatarUrl || tm?.avatarUrl || '',
                    };
                });
            }
            setMembers(savedMembers);
        } catch (error) {
            console.error('Error loading team data:', error);
            Alert.alert('Error', 'Failed to load team data.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveMembers = async (updatedList: ProjectMember[]) => {
        setMembers(updatedList);
        try {
            await updateProjectApi(projectId, {
                meta: {
                    ...(project?.meta || {}),
                    members: updatedList,
                },
            });
        } catch (e) {
            console.error('Error updating project members:', e);
        }
    };

    const handleAddMember = (tenantUser: any) => {
        if (members.some((m) => m.id === tenantUser.id || m.userId === tenantUser.userId)) {
            Alert.alert('Already Added', 'This user is already a member of this project.');
            return;
        }

        const newMember: ProjectMember = {
            id: tenantUser.id,
            userId: tenantUser.userId || tenantUser.id,
            name: tenantUser.name,
            email: tenantUser.email || '',
            projectRole: 'Member',
            avatarUrl: tenantUser.avatarUrl || '',
        };

        const updated = [...members, newMember];
        handleSaveMembers(updated);
    };

    const handleRemoveMember = (member: ProjectMember) => {
        if (member.projectRole === 'Project Lead' && generalSettings?.requireProjectLead) {
            const hasOtherLead = members.some((m) => m.id !== member.id && m.projectRole === 'Project Lead');
            if (!hasOtherLead) {
                Alert.alert(
                    'Cannot Remove Lead',
                    'A project must always have a Project Lead. Please assign a replacement Lead first.'
                );
                return;
            }
        }

        Alert.alert(
            'Remove Member',
            `Remove "${member.name}" from this project?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: () => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        const updated = members.filter((m) => m.id !== member.id);
                        handleSaveMembers(updated);
                    },
                },
            ]
        );
    };

    const handleChangeRole = (member: ProjectMember, roleTitle: string) => {
        Haptics.selectionAsync();
        const updated = members.map((m) => {
            if (m.id === member.id) {
                return { ...m, projectRole: roleTitle };
            }
            return m;
        });
        handleSaveMembers(updated);
    };

    // Filter available tenant members that are NOT already in the project
    const availableTenantMembers = useMemo(() => {
        const currentMemberIds = new Set(members.map((m) => m.id));
        const currentMemberUserIds = new Set(members.map((m) => m.userId).filter(Boolean));
        return tenantMembers.filter(
            (tm) => !currentMemberIds.has(tm.id) && !currentMemberUserIds.has(tm.userId)
        );
    }, [tenantMembers, members]);

    // Filter existing project members by search bar
    const filteredProjectMembers = useMemo(() => {
        if (!memberSearch.trim()) return members;
        const q = memberSearch.toLowerCase().trim();
        return members.filter(
            (m) =>
                m.name.toLowerCase().includes(q) ||
                (m.email && m.email.toLowerCase().includes(q)) ||
                (m.projectRole && m.projectRole.toLowerCase().includes(q))
        );
    }, [members, memberSearch]);

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
                        title: 'Team & Access',
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
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setShowAddMemberModal(true);
                                }}
                                hitSlop={12}
                                style={{
                                    width: 36,
                                    height: 36,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                                activeOpacity={0.6}
                            >
                                <PlatformIcon name="person.badge.plus" size={20} tintColor={textColor} />
                            </TouchableOpacity>
                        ),
                    }}
                />
            )}

            {isEmbedded && (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: dividerColor, backgroundColor: isDark ? '#121214' : '#FFFFFF' }}>
                    <Text style={{ fontSize: 17, fontWeight: '700', color: textColor }}>Team & Access</Text>
                    <TouchableOpacity
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setShowAddMemberModal(true);
                        }}
                        hitSlop={12}
                        activeOpacity={0.6}
                    >
                        <PlatformIcon name="person.badge.plus" size={20} tintColor={textColor} />
                    </TouchableOpacity>
                </View>
            )}

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{
                    paddingTop: isEmbedded ? 16 : (Platform.OS === 'ios' ? insets.top + 50 : 20),
                    paddingBottom: insets.bottom + 90,
                    paddingHorizontal: 16,
                    gap: 20,
                }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Info / Overview Banner */}
                <GlassView
                    intensity={isDark ? 10 : 25}
                    style={[
                        s.infoBanner,
                        {
                            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
                        },
                    ]}
                >
                    <PlatformIcon name="info.circle.fill" size={16} tintColor={isDark ? '#8E8E93' : '#6E6E73'} />
                    <Text style={[s.infoBannerText, { color: subtextColor }]}>
                        Assign project roles to control what each member can do in this project.
                    </Text>
                </GlassView>

                {/* Section: Project Members */}
                <View style={s.sectionBlock}>
                    <Text style={[s.sectionHeaderLabel, { color: subtextColor }]}>
                        Project Members ({filteredProjectMembers.length})
                    </Text>

                    {filteredProjectMembers.length > 0 ? (
                        <GlassView
                            intensity={isDark ? 10 : 25}
                            style={[s.card, { backgroundColor: cardBgColor }]}
                        >
                            {filteredProjectMembers.map((member, idx) => {
                                const isLead = member.projectRole === 'Project Lead';
                                const isLast = idx === filteredProjectMembers.length - 1;

                                const roleMenuActions = projectRoles.map((r) => ({
                                    title: r.name,
                                    state: member.projectRole === r.name ? ('on' as const) : ('off' as const),
                                }));

                                return (
                                    <React.Fragment key={member.id}>
                                        <View style={s.memberRow}>
                                            {member.avatarUrl ? (
                                                <Image
                                                    source={{ uri: member.avatarUrl }}
                                                    style={s.memberAvatar}
                                                />
                                            ) : (
                                                <View style={[s.memberAvatar, { backgroundColor: activeTenant?.primary_color || formaBlue }]}>
                                                    <Text style={s.memberAvatarText}>
                                                        {getInitials(member.name || member.email)}
                                                    </Text>
                                                </View>
                                            )}

                                            <View style={s.memberInfoCol}>
                                                <Text style={[s.memberName, { color: textColor }]}>
                                                    {member.name}
                                                </Text>
                                                {member.email ? (
                                                    <Text style={[s.memberEmail, { color: subtextColor }]}>
                                                        {member.email}
                                                    </Text>
                                                ) : null}
                                            </View>

                                            {/* Native ContextMenu for Role Selection */}
                                            <ContextMenu
                                                actions={roleMenuActions}
                                                onPress={(e) => {
                                                    const chosen = projectRoles[e.nativeEvent.index];
                                                    if (chosen) {
                                                        handleChangeRole(member, chosen.name);
                                                    }
                                                }}
                                                dropdownMenuMode={true}
                                            >
                                                <View
                                                    style={[
                                                        s.rolePill,
                                                        {
                                                            backgroundColor: isLead
                                                                ? (isDark ? 'rgba(0, 122, 255, 0.2)' : 'rgba(0, 122, 255, 0.08)')
                                                                : (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)'),
                                                        },
                                                    ]}
                                                >
                                                    <Text
                                                        style={[
                                                            s.rolePillText,
                                                            { color: isLead ? formaBlue : (isDark ? '#FFFFFF' : '#1C1C1E') },
                                                        ]}
                                                    >
                                                        {member.projectRole}
                                                    </Text>
                                                    <Ionicons name="chevron-down" size={11} color={isLead ? formaBlue : subtextColor} />
                                                </View>
                                            </ContextMenu>

                                            {/* Remove Member Button */}
                                            <TouchableOpacity
                                                style={s.removeBtn}
                                                onPress={() => handleRemoveMember(member)}
                                                hitSlop={8}
                                            >
                                                <Ionicons name="close-circle-outline" size={20} color={subtextColor} />
                                            </TouchableOpacity>
                                        </View>
                                        {!isLast && <View style={[s.divider, { backgroundColor: dividerColor }]} />}
                                    </React.Fragment>
                                );
                            })}
                        </GlassView>
                    ) : (
                        <GlassView
                            intensity={isDark ? 10 : 25}
                            style={[s.emptyCard, { backgroundColor: cardBgColor }]}
                        >
                            <Ionicons name="people-outline" size={38} color={subtextColor} />
                            <Text style={[s.emptyTitle, { color: textColor }]}>
                                {memberSearch ? 'No matching members' : 'No Members Assigned'}
                            </Text>
                            <Text style={[s.emptySubtitle, { color: subtextColor }]}>
                                {memberSearch
                                    ? 'Try a different name, email, or role.'
                                    : 'Add organization members to participate in this project.'}
                            </Text>
                            {!memberSearch && (
                                <TouchableOpacity
                                    style={[
                                        s.addFirstBtn,
                                        {
                                            backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                                        },
                                    ]}
                                    onPress={() => setShowAddMemberModal(true)}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="person-add-outline" size={15} color={formaBlue} style={{ marginRight: 6 }} />
                                    <Text style={[s.addFirstBtnText, { color: formaBlue }]}>Add Member</Text>
                                </TouchableOpacity>
                            )}
                        </GlassView>
                    )}
                </View>
            </ScrollView>

            {/* Floating Liquid Glass Search Bar */}
            <View style={[s.bottomSearchBarWrapper, { bottom: (insets.bottom || 0) + 12 }]}>
                <SwiftUISearchBar
                    placeholder="Search member..."
                    value={memberSearch}
                    onChangeText={setMemberSearch}
                    onClear={() => setMemberSearch('')}
                    isDark={isDark}
                />
            </View>

            {/* Native SwiftUI Add Member Bottom Sheet */}
            <ProjectAddMemberSheet
                visible={showAddMemberModal}
                onClose={() => setShowAddMemberModal(false)}
                availableMembers={availableTenantMembers}
                onAddMember={handleAddMember}
            />
        </View>
    );
}

const s = StyleSheet.create({
    container: {
        flex: 1,
    },
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 16,
    },
    infoBannerText: {
        fontSize: 13,
        fontWeight: '400',
        lineHeight: 18,
        flex: 1,
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
    memberRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        gap: 12,
        minHeight: 56,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 64,
        marginRight: 0,
    },
    memberAvatar: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    memberAvatarText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
        textAlign: 'center',
    },
    memberInfoCol: {
        flex: 1,
        gap: 2,
    },
    memberName: {
        fontSize: 15,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    memberEmail: {
        fontSize: 12,
        fontWeight: '400',
    },
    rolePill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
        gap: 4,
    },
    rolePillText: {
        fontSize: 12,
        fontWeight: '600',
    },
    removeBtn: {
        padding: 4,
        marginLeft: 2,
    },
    emptyCard: {
        borderRadius: 24,
        padding: 28,
        alignItems: 'center',
        gap: 10,
    },
    emptyTitle: {
        fontSize: 17,
        fontWeight: '700',
    },
    emptySubtitle: {
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 18,
    },
    addFirstBtn: {
        marginTop: 6,
        paddingHorizontal: 16,
        paddingVertical: 9,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    addFirstBtnText: {
        fontWeight: '600',
        fontSize: 14,
    },
    bottomSearchBarWrapper: {
        position: 'absolute',
        left: 16,
        right: 16,
        zIndex: 99,
    },
});
