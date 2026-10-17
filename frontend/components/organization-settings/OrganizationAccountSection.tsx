import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';

interface OrganizationAccountSectionProps {
    user: any;
    profile: any;
    activeTenant: any;
    tenantRole: string | null;
    primaryColor: string;
    isDark: boolean;
    textColor: string;
    subtextColor: string;
    cardBgColor: string;
}

export const OrganizationAccountSection: React.FC<OrganizationAccountSectionProps> = ({
    user,
    profile,
    activeTenant,
    tenantRole,
    primaryColor,
    isDark,
    textColor,
    subtextColor,
    cardBgColor,
}) => {
    const effectiveRole = tenantRole || profile?.role || 'MEMBER';
    const getRoleColor = (roleStr: string | null) => {
        const r = (roleStr || '').toLowerCase();
        if (r.includes('super')) return '#EF4444';
        if (r.includes('admin')) return '#3B82F6';
        if (r.includes('member') || r.includes('staff')) return '#10B981';
        if (r.includes('view')) return '#F59E0B';
        if (r.includes('system')) return '#64748B';
        return '#10B981';
    };

    const roleColor = getRoleColor(effectiveRole);

    const displayRole = (() => {
        const raw = (effectiveRole || '').toLowerCase().trim().replace(/[\s\-_]+/g, '');
        if (raw.includes('super')) return 'SUPER ADMIN';
        if (raw.includes('admin')) return 'ADMIN';
        if (raw.includes('manager')) return 'MANAGER';
        if (raw.includes('staff') || raw.includes('member')) return 'MEMBER';
        return effectiveRole.toUpperCase();
    })();

    return (
        <Animated.View entering={FadeIn.duration(200)}>
            <View style={[styles.formCard, { backgroundColor: cardBgColor, borderWidth: 0, borderColor: 'transparent' }]}>
                <View style={styles.accountProfileRow}>
                    {profile?.avatarUrl || (profile as any)?.avatar_url ? (
                        <Image
                            source={{ uri: profile?.avatarUrl || (profile as any)?.avatar_url }}
                            style={styles.accountAvatar}
                        />
                    ) : (
                        <View style={[styles.accountAvatar, { backgroundColor: activeTenant?.primary_color || primaryColor || '#0036F8' }]}>
                            <Text style={styles.accountAvatarText}>
                                {(profile?.full_name || user?.email || 'U').slice(0, 2).toUpperCase()}
                            </Text>
                        </View>
                    )}
                    <View style={{ marginLeft: 16, flex: 1 }}>
                        <Text style={[styles.accountName, { color: textColor }]}>
                            {profile?.full_name || 'Logged User'}
                        </Text>
                        <Text style={[styles.accountEmail, { color: subtextColor }]}>
                            {user?.email || '-'}
                        </Text>
                        <View style={[styles.roleBadge, { backgroundColor: isDark ? `${roleColor}25` : `${roleColor}15`, marginTop: 6 }]}>
                            <Ionicons name="shield-checkmark" size={12} color={roleColor} style={{ marginRight: 4 }} />
                            <Text style={[styles.roleBadgeText, { color: roleColor }]}>
                                {displayRole}
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={[styles.divider, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' }]} />

                <View style={styles.accountInfoRow}>
                    <Text style={[styles.infoLabel, { color: subtextColor }]}>Current Tenant</Text>
                    <Text style={[styles.infoValue, { color: textColor }]}>{activeTenant?.name || '-'}</Text>
                </View>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    formCard: {
        borderRadius: 24,
        padding: 20,
        marginBottom: 16,
    },
    accountProfileRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    accountAvatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
    },
    accountAvatarText: {
        color: '#FFFFFF',
        fontSize: 22,
        fontWeight: '700',
    },
    accountName: {
        fontSize: 18,
        fontWeight: '700',
    },
    accountEmail: {
        fontSize: 14,
        marginTop: 2,
    },
    roleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    roleBadgeText: {
        fontSize: 12,
        fontWeight: '700',
    },
    divider: {
        height: 1,
        marginVertical: 16,
    },
    accountInfoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    infoLabel: {
        fontSize: 14,
    },
    infoValue: {
        fontSize: 14,
        fontWeight: '600',
    },
});
