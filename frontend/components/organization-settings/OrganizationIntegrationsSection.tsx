import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';

interface OrganizationIntegrationsSectionProps {
    activeTenant: any;
    primaryColor: string;
    isDark: boolean;
    textColor: string;
    subtextColor: string;
    cardBgColor: string;
    borderColor: string;
}

export const OrganizationIntegrationsSection: React.FC<OrganizationIntegrationsSectionProps> = ({
    activeTenant,
    primaryColor,
    textColor,
    subtextColor,
    cardBgColor,
    borderColor,
}) => {
    return (
        <Animated.View entering={FadeIn.duration(200)}>
            <View style={[styles.formCard, { backgroundColor: cardBgColor, borderColor }]}>
                {/* Supabase Bucket */}
                <View style={styles.integrationItem}>
                    <View style={[styles.integrationIconWrap, { backgroundColor: 'rgba(0, 122, 255, 0.1)' }]}>
                        <Ionicons name="cloud-done-outline" size={24} color={primaryColor} />
                    </View>
                    <View style={{ marginLeft: 16, flex: 1 }}>
                        <Text style={[styles.integrationTitle, { color: textColor }]}>Dedicated Tenant Bucket</Text>
                        <Text style={[styles.integrationDesc, { color: subtextColor }]}>
                            Bucket: tenant-{activeTenant?.id?.slice(0, 8)}... (Isolated storage)
                        </Text>
                    </View>
                    <View style={[styles.roleBadge, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                        <Text style={[styles.roleBadgeText, { color: '#10B981' }]}>Connected</Text>
                    </View>
                </View>

                <View style={[styles.divider, { backgroundColor: borderColor }]} />

                {/* Google Drive Backup */}
                <View style={styles.integrationItem}>
                    <View style={[styles.integrationIconWrap, { backgroundColor: 'rgba(234, 88, 12, 0.1)' }]}>
                        <Ionicons name="logo-google" size={24} color="#EA580C" />
                    </View>
                    <View style={{ marginLeft: 16, flex: 1 }}>
                        <Text style={[styles.integrationTitle, { color: textColor }]}>Google Drive Backup</Text>
                        <Text style={[styles.integrationDesc, { color: subtextColor }]}>
                            Automated site photo archive to shared Drive folder.
                        </Text>
                    </View>
                    <TouchableOpacity style={[styles.connectBtn, { borderColor }]}>
                        <Text style={[styles.connectBtnText, { color: textColor }]}>Configure</Text>
                    </TouchableOpacity>
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
        borderWidth: 1,
    },
    integrationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    integrationIconWrap: {
        width: 46,
        height: 46,
        borderRadius: 23,
        alignItems: 'center',
        justifyContent: 'center',
    },
    integrationTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    integrationDesc: {
        fontSize: 13,
        marginTop: 2,
    },
    roleBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
    },
    roleBadgeText: {
        fontSize: 12,
        fontWeight: '700',
    },
    divider: {
        height: 1,
        marginVertical: 14,
    },
    connectBtn: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 14,
        borderWidth: 1,
    },
    connectBtnText: {
        fontSize: 13,
        fontWeight: '600',
    },
});
