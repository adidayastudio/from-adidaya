import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';
import { GlassView } from '@/components/ui/GlassView';
import { PlatformIcon } from '@/components/ui/PlatformIcon';

interface ProfileHeroCardProps {
    profile: any;
    primaryColor: string;
    textColor: string;
    subtextColor: string;
    bgColor: string;
    borderColor?: string;
    intensity: number;
    isDark: boolean;
    onEditAvatar?: () => void;
    updatingAvatar?: boolean;
}

const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
};

export const ProfileHeroCard: React.FC<ProfileHeroCardProps> = ({
    profile,
    primaryColor,
    textColor,
    subtextColor,
    bgColor,
    borderColor,
    intensity,
    isDark,
    onEditAvatar,
    updatingAvatar,
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const isSystemAccount = profile.account_type === 'system';
    const rawStatus = (profile.work_status || profile.status || 'Active').trim();
    const statusLower = rawStatus.toLowerCase();
    const statusIsActive = statusLower === 'active';
    const statusIsProbation = statusLower === 'probation';
    const statusIsResigned = statusLower === 'resigned' || statusLower === 'terminated';

    let statusColor = '#FF9500';
    if (isSystemAccount) statusColor = '#8E8E93';
    else if (statusIsActive) statusColor = '#34C759';
    else if (statusIsProbation) statusColor = '#3B82F6';
    else if (statusIsResigned) statusColor = '#EF4444';

    const statusLabel = isSystemAccount ? 'System' : (rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1));

    const getRoleBadge = (rawRole?: string) => {
        const r = (rawRole || 'member').toLowerCase().trim();
        if (r === 'superadmin' || r === 'super_admin' || r === 'super administrator' || r === 'owner' || r === 'ceo') {
            return { label: 'Super Admin', color: '#EF4444' };
        }
        if (r === 'admin' || r === 'administrator') {
            return { label: 'Admin', color: '#3B82F6' };
        }
        if (r === 'manager' || r === 'pm' || r === 'management') {
            return { label: 'Manager', color: '#FF9500' };
        }
        if (r === 'supervisor') {
            return { label: 'Supervisor', color: '#AF52DE' };
        }
        if (r === 'hr') {
            return { label: 'HR', color: '#30D158' };
        }
        if (r === 'system') {
            return { label: 'System', color: '#64748B' };
        }
        if (r === 'viewer') {
            return { label: 'Viewer', color: '#F59E0B' };
        }
        return { label: 'Member', color: '#10B981' };
    };

    const roleInfo = getRoleBadge(profile.role);

    return (
        <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setIsExpanded((prev) => !prev);
            }}
        >
            <GlassView intensity={intensity} style={[styles.profileCard, { backgroundColor: bgColor, borderColor: borderColor || 'transparent' }]}>
                <View style={styles.profileCardHeader}>
                    <TouchableOpacity
                        activeOpacity={onEditAvatar ? 0.75 : 1}
                        onPress={(e) => {
                            if (onEditAvatar) {
                                e.stopPropagation?.();
                                onEditAvatar();
                            }
                        }}
                        disabled={!onEditAvatar || updatingAvatar}
                        style={{ position: 'relative' }}
                    >
                        {updatingAvatar ? (
                            <View style={[styles.avatarPlaceholder, { backgroundColor: primaryColor || '#1677D2', justifyContent: 'center', alignItems: 'center' }]}>
                                <ActivityIndicator color="#FFFFFF" size="small" />
                            </View>
                        ) : profile.avatar_url ? (
                            <Image source={{ uri: profile.avatar_url }} style={styles.avatarPlaceholder} />
                        ) : (
                            <View style={[styles.avatarPlaceholder, { backgroundColor: isSystemAccount ? (isDark ? '#3A3A3C' : '#8E8E93') : primaryColor }]}>
                                <Text style={styles.avatarInitials}>{getInitials(profile.full_name)}</Text>
                            </View>
                        )}
                        {onEditAvatar && (
                            <View style={[styles.cameraBadge, { borderColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
                                <PlatformIcon name="camera.fill" size={9} tintColor="#FFFFFF" />
                            </View>
                        )}
                    </TouchableOpacity>

                    <View style={styles.profileInfo}>
                        {/* 1. Nama */}
                        <View style={styles.nameStatusRow}>
                            <Text style={[styles.profileName, { color: textColor }]} numberOfLines={isExpanded ? undefined : 1}>
                                {profile.full_name || 'Team Member'}
                            </Text>
                            <View style={[styles.statusBadge, { backgroundColor: statusColor + '18' }]}>
                                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                                <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                                    {statusLabel}
                                </Text>
                            </View>
                        </View>

                        {/* 2. Email */}
                        {profile.email ? (
                            <Text style={[styles.profileEmail, { color: subtextColor }]} numberOfLines={isExpanded ? undefined : 1}>
                                {profile.email}
                            </Text>
                        ) : null}

                        {isSystemAccount ? (
                            /* Khusus System Account: Roles dengan warna yang ditentukan */
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                <View style={[styles.roleBadgePill, { backgroundColor: `${roleInfo.color}18`, borderColor: `${roleInfo.color}33` }]}>
                                    <View style={[styles.roleDot, { backgroundColor: roleInfo.color }]} />
                                    <Text style={[styles.roleBadgeText, { color: roleInfo.color }]}>
                                        {roleInfo.label}
                                    </Text>
                                </View>
                            </View>
                        ) : (
                            /* Regular Human Account */
                            <>
                                {/* 3. Departemen • Position */}
                                {(() => {
                                    const deptPos = [
                                        profile.department,
                                        profile.position || profile.job_title
                                    ].filter(Boolean).join(' • ');
                                    return deptPos ? (
                                        <Text style={[styles.profileMetaText, { color: subtextColor }]} numberOfLines={isExpanded ? undefined : 1}>
                                            {deptPos}
                                        </Text>
                                    ) : null;
                                })()}

                                {/* 4. Employee ID */}
                                {profile.employee_id || profile.id_code ? (
                                    <Text style={[styles.profileMetaText, { color: subtextColor }]} numberOfLines={isExpanded ? undefined : 1}>
                                        {profile.employee_id || profile.id_code}
                                    </Text>
                                ) : null}
                            </>
                        )}
                    </View>
                </View>
            </GlassView>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    profileCard: {
        borderRadius: 20,
        padding: 16,
        overflow: 'hidden',
        borderWidth: 1,
    },
    profileCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    avatarPlaceholder: {
        width: 52,
        height: 52,
        borderRadius: 26,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    avatarInitials: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
    },
    profileInfo: {
        flex: 1,
        gap: 2,
    },
    nameStatusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    profileName: {
        fontSize: 17,
        fontWeight: '600',
        letterSpacing: -0.3,
        flex: 1,
    },
    profileEmail: {
        fontSize: 13,
        fontWeight: '400',
        marginTop: 1,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        gap: 5,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusBadgeText: {
        fontSize: 11,
        fontWeight: '600',
    },
    profileMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginTop: 3,
        flexWrap: 'wrap',
    },
    profileMetaText: {
        fontSize: 12,
        fontWeight: '400',
    },
    roleBadgePill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        borderWidth: 1,
        gap: 5,
    },
    roleDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    roleBadgeText: {
        fontSize: 11,
        fontWeight: '600',
    },
    cameraBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#1677D2',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
    },
});
