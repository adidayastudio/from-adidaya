import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    ActivityIndicator,
    Alert,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import ContextMenu, { ContextMenuAction } from '@/components/ui/PlatformContextMenu';
import { TeamMember } from './types';

export type TeamSortOption = 'name_asc' | 'name_desc' | 'role';

export const formatNaturalRole = (roleStr?: string): string => {
    if (!roleStr) return 'Member';
    const clean = roleStr.trim().toLowerCase();
    if (clean === 'superadmin' || clean === 'super_admin' || clean === 'super admin') return 'Super Admin';
    if (clean === 'admin' || clean === 'administrator') return 'Admin';
    if (clean === 'member' || clean === 'staff') return 'Member';
    if (clean === 'viewer') return 'Viewer';
    if (clean === 'system' || clean === 'sistem') return 'System';
    if (clean === 'hr') return 'HR';
    if (clean === 'pm') return 'PM';
    if (clean === 'ceo') return 'CEO';
    return clean.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

interface OrganizationTeamSectionProps {
    teamMembers: TeamMember[];
    loadingMembers: boolean;
    memberSearch: string;
    sortBy?: TeamSortOption;
    isDark: boolean;
    textColor: string;
    subtextColor: string;
    cardBgColor: string;
    primaryColor: string;
    activeTenant: any;
    onAddMember?: () => void;
    onEditMember: (member: TeamMember) => void;
    onDeleteMember: (member: TeamMember) => void;
    canManageMembers?: boolean;
}

export const OrganizationTeamSection: React.FC<OrganizationTeamSectionProps> = ({
    teamMembers,
    loadingMembers,
    memberSearch,
    sortBy = 'role',
    isDark,
    textColor,
    subtextColor,
    cardBgColor,
    primaryColor,
    activeTenant,
    onAddMember,
    onEditMember,
    onDeleteMember,
    canManageMembers = true,
}) => {
    const getInitials = (nameOrEmail?: string) => {
        if (!nameOrEmail) return 'U';
        const clean = nameOrEmail.trim();
        const parts = clean.split(/\s+/);
        if (parts.length >= 2 && parts[0] && parts[1]) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return clean.slice(0, 2).toUpperCase();
    };

    const confirmDelete = (member: TeamMember) => {
        const memberName = member.profile?.full_name || member.profile?.username || member.email || 'Team Member';
        Alert.alert(
            'Delete Member',
            `Are you sure you want to delete ${memberName} permanently? This action cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => onDeleteMember(member),
                },
            ]
        );
    };

    const handleCardContextMenu = async (member: TeamMember, actionTitle: string) => {
        const memberEmail = member.profile?.email || member.email || '';
        if (actionTitle === 'Edit Member') {
            onEditMember(member);
        } else if (actionTitle === 'Copy Email') {
            if (memberEmail) {
                await Clipboard.setStringAsync(memberEmail);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
        } else if (actionTitle === 'Delete Member' || actionTitle === 'Remove Member') {
            confirmDelete(member);
        }
    };

    const filteredMembers = teamMembers.filter((m) => {
        if (!memberSearch.trim()) return true;
        const q = memberSearch.toLowerCase();
        const name = (m.profile?.full_name || m.profile?.username || '').toLowerCase();
        const email = (m.profile?.email || m.email || '').toLowerCase();
        const role = (m.role || '').toLowerCase();
        return name.includes(q) || email.includes(q) || role.includes(q);
    });

    const sortedMembers = [...filteredMembers].sort((a, b) => {
        const nameA = (a.profile?.full_name || a.profile?.username || a.email || '').trim().toLowerCase();
        const nameB = (b.profile?.full_name || b.profile?.username || b.email || '').trim().toLowerCase();

        if (sortBy === 'name_asc') {
            if (!nameA && !nameB) return 0;
            if (!nameA) return 1;
            if (!nameB) return -1;
            return nameA.localeCompare(nameB);
        } else if (sortBy === 'name_desc') {
            if (!nameA && !nameB) return 0;
            if (!nameA) return 1;
            if (!nameB) return -1;
            return nameB.localeCompare(nameA);
        } else if (sortBy === 'role') {
            const roleOrder: Record<string, number> = {
                'super admin': 1,
                'superadmin': 1,
                'admin': 2,
                'member': 3,
                'viewer': 4,
                'sistem': 5,
                'system': 5,
            };
            const rA = roleOrder[(a.role || '').toLowerCase()] || 99;
            const rB = roleOrder[(b.role || '').toLowerCase()] || 99;
            if (rA !== rB) {
                return rA - rB;
            }
            if (!nameA && !nameB) return 0;
            if (!nameA) return 1;
            if (!nameB) return -1;
            return nameA.localeCompare(nameB);
        }
        return 0;
    });

    const getStatus = (m: any) => (m.status || m.profile?.status || 'active').toLowerCase();
    const activeMembers = sortedMembers.filter((m) => getStatus(m) === 'active');
    const inactiveMembers = sortedMembers.filter((m) => getStatus(m) === 'inactive');
    const archivedMembers = sortedMembers.filter((m) => getStatus(m) === 'archived');

    const renderMemberCard = (member: TeamMember) => {
        const memberName = member.profile?.full_name || member.profile?.username || 'Team Member';
        const memberEmail = member.profile?.email || member.email || (member.user_id ? `${member.user_id.slice(0, 14)}...` : '-');
        const avatarUrl = member.profile?.avatar_url;
        const initials = getInitials(memberName);
        const memberRole = formatNaturalRole(member.role);
        const memberStatus = getStatus(member);
        const statusLabel = memberStatus === 'active' ? 'Active' : memberStatus === 'inactive' ? 'Inactive' : 'Archived';
        const statusColor = memberStatus === 'active' ? '#10B981' : memberStatus === 'archived' ? '#8E8E93' : '#EF4444';
        const roleLower = (member.role || '').toLowerCase().replace(/\s+/g, '');
        const isSuperAdmin = roleLower.includes('superadmin');

        const cardActions: ContextMenuAction[] = [
            {
                title: 'Edit Member',
                systemIcon: 'pencil',
            },
            {
                title: 'Copy Email',
                systemIcon: 'doc.on.doc',
            },
        ];

        if (canManageMembers && !isSuperAdmin) {
            cardActions.push({
                title: 'Delete Member',
                systemIcon: 'trash',
                destructive: true,
            });
        }

        return (
            <View key={member.id || member.user_id} style={{ marginBottom: 8 }}>
                <ContextMenu
                    title={memberName}
                    actions={cardActions}
                    previewBackgroundColor="transparent"
                    dropdownMenuMode={false}
                    onPress={(e: any) => {
                        const actionTitle = e.nativeEvent.name || cardActions[e.nativeEvent.index]?.title;
                        if (actionTitle) {
                            handleCardContextMenu(member, actionTitle);
                        }
                    }}
                >
                    <View
                        style={[
                            styles.memberCard,
                            {
                                backgroundColor: cardBgColor,
                                borderWidth: Platform.OS === 'android' ? 0 : 1,
                                borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                                shadowOpacity: isDark ? 0.25 : 0,
                                elevation: (Platform.OS === 'android' && !isDark) ? 0 : (isDark ? 2 : 0),
                            },
                        ]}
                    >
                        <View style={styles.memberCardContent}>
                            {avatarUrl ? (
                                <Image source={{ uri: avatarUrl }} style={styles.memberAvatar} />
                            ) : (
                                <View
                                    style={[
                                        styles.memberAvatar,
                                        { backgroundColor: activeTenant?.primary_color || primaryColor || '#0036F8' },
                                    ]}
                                >
                                    <Text style={styles.memberAvatarText}>{initials}</Text>
                                </View>
                            )}

                            <View style={styles.memberInfoCol}>
                                <Text style={[styles.memberName, { color: textColor }]} numberOfLines={1}>
                                    {memberName}
                                </Text>
                                <Text style={[styles.memberEmail, { color: subtextColor }]} numberOfLines={1}>
                                    {memberEmail}
                                </Text>

                                <View style={styles.memberBadgesRow}>
                                    <View
                                        style={[
                                            styles.rolePill,
                                            {
                                                backgroundColor: isDark
                                                    ? 'rgba(255, 255, 255, 0.08)'
                                                    : 'rgba(0, 0, 0, 0.04)',
                                            },
                                        ]}
                                    >
                                        <Text style={[styles.rolePillText, { color: textColor }]}>
                                            {memberRole}
                                        </Text>
                                    </View>

                                    <View
                                        style={[
                                            styles.statusPill,
                                            {
                                                backgroundColor: isDark
                                                    ? 'rgba(255, 255, 255, 0.06)'
                                                    : 'rgba(0, 0, 0, 0.03)',
                                            },
                                        ]}
                                    >
                                        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                                        <Text style={[styles.statusPillText, { color: statusColor }]}>
                                            {statusLabel}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    </View>
                </ContextMenu>
            </View>
        );
    };

    const renderSectionHeader = (title: string, count: number) => (
        <View key={title} style={styles.statusSectionHeader}>
            <Text style={[styles.statusSectionTitle, { color: subtextColor }]}>
                {title} ({count})
            </Text>
        </View>
    );

    return (
        <View style={styles.sectionContainer}>
            {/* Members Cards List */}
            {loadingMembers ? (
                <View style={[styles.memberEmptyCard, { backgroundColor: cardBgColor }]}>
                    <ActivityIndicator size="small" color="#0036F8" />
                    <Text style={[styles.emptyText, { color: subtextColor, marginTop: 8 }]}>Loading team members...</Text>
                </View>
            ) : sortedMembers.length === 0 ? (
                <View style={[styles.memberEmptyCard, { backgroundColor: cardBgColor }]}>
                    <Ionicons name="people-outline" size={36} color={subtextColor} style={{ opacity: 0.5, marginBottom: 8 }} />
                    <Text style={[styles.emptyText, { color: textColor, fontWeight: '600' }]}>
                        {memberSearch.trim() ? 'No members match your search' : 'No team members yet'}
                    </Text>
                    <Text style={[styles.memberEmptySubtext, { color: subtextColor }]}>
                        {memberSearch.trim()
                            ? 'Try searching with a different name or email.'
                            : 'Tap "+ Add Member" at the top to invite or create your first team member.'}
                    </Text>
                </View>
            ) : (
                <>
                    {activeMembers.length > 0 && (
                        <>
                            {renderSectionHeader('Active', activeMembers.length)}
                            {activeMembers.map((m) => renderMemberCard(m))}
                        </>
                    )}

                    {inactiveMembers.length > 0 && (
                        <>
                            {renderSectionHeader('Inactive', inactiveMembers.length)}
                            {inactiveMembers.map((m) => renderMemberCard(m))}
                        </>
                    )}

                    {archivedMembers.length > 0 && (
                        <>
                            {renderSectionHeader('Archived', archivedMembers.length)}
                            {archivedMembers.map((m) => renderMemberCard(m))}
                        </>
                    )}
                </>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    sectionContainer: {
        width: '100%',
    },
    teamHeaderRow: {
        marginBottom: 8,
    },
    teamCountText: {
        fontSize: 20,
        fontWeight: '700',
        letterSpacing: -0.4,
    },
    teamSubtitleText: {
        fontSize: 13,
        marginTop: 2,
    },
    statusSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 16,
        marginBottom: 8,
        paddingLeft: 4,
        paddingRight: 2,
    },
    statusSectionTitle: {
        fontSize: 14,
        fontWeight: '600',
    },
    memberCard: {
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderWidth: 0,
    },
    memberCardContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    memberAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    memberAvatarText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
    memberInfoCol: {
        flex: 1,
        justifyContent: 'center',
    },
    memberName: {
        fontSize: 15,
        fontWeight: '600',
        letterSpacing: -0.2,
        marginBottom: 1,
    },
    memberEmail: {
        fontSize: 12.5,
        marginBottom: 6,
    },
    memberBadgesRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    rolePill: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    rolePillText: {
        fontSize: 12,
        fontWeight: '600',
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 5,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusPillText: {
        fontSize: 12,
        fontWeight: '600',
    },
    memberEmptyCard: {
        borderRadius: 22,
        padding: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 12,
        borderWidth: 0,
    },
    emptyText: {
        fontSize: 15,
        marginTop: 4,
    },
    memberEmptySubtext: {
        fontSize: 13,
        textAlign: 'center',
        marginTop: 4,
        paddingHorizontal: 16,
    },
});
