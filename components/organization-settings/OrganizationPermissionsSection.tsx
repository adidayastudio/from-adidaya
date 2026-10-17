import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { IOSSwitch } from '@/components/ui/IOSSwitch';

interface OrganizationPermissionsSectionProps {
    permissions: Record<string, boolean>;
    setPermissions: React.Dispatch<React.SetStateAction<any>>;
    primaryColor: string;
    isDark: boolean;
    textColor: string;
    subtextColor: string;
    cardBgColor: string;
    borderColor: string;
}

export const OrganizationPermissionsSection: React.FC<OrganizationPermissionsSectionProps> = ({
    permissions,
    setPermissions,
    primaryColor,
    isDark,
    textColor,
    subtextColor,
    cardBgColor,
    borderColor,
}) => {
    const permissionsList = [
        { key: 'projectCreation', label: 'Allow Project Creation', desc: 'Permit team managers to initialize new projects.' },
        { key: 'financialVisibility', label: 'Financials & Budget Visibility', desc: 'Allow members to view project contract values and margins.' },
        { key: 'priceLibraryEdit', label: 'AHSP & Price Library Editing', desc: 'Allow authorized estimators to edit standard unit rates.' },
        { key: 'inviteMembers', label: 'Direct Member Invitations', desc: 'Allow admins to invite external collaborators by join code.' },
        { key: 'exportReports', label: 'Export PDF & Excel Reports', desc: 'Allow exporting comprehensive project documentation.' },
    ];

    return (
        <Animated.View entering={FadeIn.duration(200)}>
            <View style={[styles.formCard, { backgroundColor: cardBgColor, borderColor }]}>
                {permissionsList.map((p, idx) => (
                    <View
                        key={p.key}
                        style={[
                            styles.toggleRow,
                            idx !== permissionsList.length - 1 && { borderBottomColor: borderColor, borderBottomWidth: 1 },
                        ]}
                    >
                        <View style={{ flex: 1, paddingRight: 16 }}>
                            <Text style={[styles.toggleLabel, { color: textColor }]}>{p.label}</Text>
                            <Text style={[styles.toggleDesc, { color: subtextColor }]}>{p.desc}</Text>
                        </View>
                        <IOSSwitch
                            value={permissions[p.key]}
                            isDark={isDark}
                            size={26}
                            activeColor="#34C759"
                            onValueChange={(val) => setPermissions((prev: any) => ({ ...prev, [p.key]: val }))}
                        />
                    </View>
                ))}
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
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
    },
    toggleLabel: {
        fontSize: 15,
        fontWeight: '700',
    },
    toggleDesc: {
        fontSize: 13,
        marginTop: 3,
        lineHeight: 18,
    },
});
