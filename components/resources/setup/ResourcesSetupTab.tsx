import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { GlassView } from '@/components/ui/GlassView';
import { PlatformIcon } from '@/components/ui/PlatformIcon';

export type ResourcesSetupModule =
    | 'general_settings'
    | 'numbering_codes'
    | 'classification'
    | 'item_master'
    | 'vendors'
    | 'stock_rules'
    | 'conditions_statuses'
    | 'locations'
    | 'receiving_rules'
    | 'transfer_ownership'
    | 'permissions_visibility'
    | 'audit_logs';

export type ResourcesSetupGroup =
    | 'general'
    | 'catalog'
    | 'inventory'
    | 'operations'
    | 'access_control';

interface ResourcesSetupTabProps {
    isDark: boolean;
    textColor: string;
    subtextColor: string;
}

export interface ResourcesMenuItem {
    id: ResourcesSetupModule;
    group: ResourcesSetupGroup;
    title: string;
    shortLabel: string;
    subtitle: string;
    icon: string;
    color: string;
    gradientColors: [string, string];
}

export const RESOURCES_SETUP_MENU_ITEMS: ResourcesMenuItem[] = [
    // 1. General (Slate)
    {
        id: 'general_settings',
        group: 'general',
        title: 'General Settings',
        shortLabel: 'General',
        subtitle: 'Units, measurements, and defaults.',
        icon: 'slider.horizontal.3',
        color: '#64748B',
        gradientColors: ['#64748B', '#475569'],
    },
    {
        id: 'numbering_codes',
        group: 'general',
        title: 'Numbering & Codes',
        shortLabel: 'Numbering',
        subtitle: 'Resource and transaction numbering.',
        icon: 'number.square.fill',
        color: '#64748B',
        gradientColors: ['#64748B', '#334155'],
    },

    // 2. Catalog (Blue)
    {
        id: 'classification',
        group: 'catalog',
        title: 'Resource Classification',
        shortLabel: 'Classification',
        subtitle: 'Types, categories, and Finance mapping.',
        icon: 'square.grid.2x2.fill',
        color: '#2563EB',
        gradientColors: ['#2563EB', '#1D4ED8'],
    },
    {
        id: 'item_master',
        group: 'catalog',
        title: 'Item Master & Variants',
        shortLabel: 'Item Master',
        subtitle: 'Items, brands, SKUs, and duplicates.',
        icon: 'shippingbox.fill',
        color: '#2563EB',
        gradientColors: ['#2563EB', '#1D4ED8'],
    },
    {
        id: 'vendors',
        group: 'catalog',
        title: 'Vendors',
        shortLabel: 'Vendors',
        subtitle: 'Shared vendor and supply information.',
        icon: 'person.2.fill',
        color: '#2563EB',
        gradientColors: ['#2563EB', '#1D4ED8'],
    },

    // 3. Inventory (Green)
    {
        id: 'stock_rules',
        group: 'inventory',
        title: 'Stock Rules',
        shortLabel: 'Stock Rules',
        subtitle: 'Stock limits, alerts, and behavior.',
        icon: 'chart.line.uptrend.xyaxis',
        color: '#34C759',
        gradientColors: ['#34C759', '#248A3D'],
    },
    {
        id: 'conditions_statuses',
        group: 'inventory',
        title: 'Conditions & Statuses',
        shortLabel: 'Conditions',
        subtitle: 'Resource conditions and lifecycle.',
        icon: 'checklist',
        color: '#34C759',
        gradientColors: ['#34C759', '#248A3D'],
    },

    // 4. Operations (Orange)
    {
        id: 'locations',
        group: 'operations',
        title: 'Locations',
        shortLabel: 'Locations',
        subtitle: 'Internal, project, and vendor locations.',
        icon: 'mappin.and.ellipse',
        color: '#FF9500',
        gradientColors: ['#FF9500', '#D17A00'],
    },
    {
        id: 'receiving_rules',
        group: 'operations',
        title: 'Receiving Rules',
        shortLabel: 'Receiving',
        subtitle: 'Receiving requirements and partial delivery.',
        icon: 'arrow.down.doc.fill',
        color: '#FF9500',
        gradientColors: ['#FF9500', '#D17A00'],
    },
    {
        id: 'transfer_ownership',
        group: 'operations',
        title: 'Transfer & Ownership',
        shortLabel: 'Transfers',
        subtitle: 'Ownership, custody, and transfer rules.',
        icon: 'arrow.left.arrow.right',
        color: '#FF9500',
        gradientColors: ['#FF9500', '#D17A00'],
    },

    // 5. Access & Control (Purple)
    {
        id: 'permissions_visibility',
        group: 'access_control',
        title: 'Permissions & Visibility',
        shortLabel: 'Permissions',
        subtitle: 'Resource access and financial visibility.',
        icon: 'lock.shield.fill',
        color: '#AF52DE',
        gradientColors: ['#AF52DE', '#7A2BB1'],
    },
    {
        id: 'audit_logs',
        group: 'access_control',
        title: 'Audit Logs',
        shortLabel: 'Audit Logs',
        subtitle: 'Resource activity and configuration history.',
        icon: 'clock.arrow.circlepath',
        color: '#AF52DE',
        gradientColors: ['#AF52DE', '#7A2BB1'],
    },
];

const GROUP_TITLES: Record<ResourcesSetupGroup, string> = {
    general: 'General',
    catalog: 'Catalog',
    inventory: 'Inventory',
    operations: 'Operations',
    access_control: 'Access & Control',
};

export function ResourcesSetupTab({ isDark, textColor, subtextColor }: ResourcesSetupTabProps) {
    const router = useRouter();

    const groups: ResourcesSetupGroup[] = [
        'general',
        'catalog',
        'inventory',
        'operations',
        'access_control',
    ];

    const handlePressItem = (id: ResourcesSetupModule) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(`/resources-setup/${id}` as any);
    };

    return (
        <View style={s.container}>
            {groups.map((grp) => {
                const items = RESOURCES_SETUP_MENU_ITEMS.filter((item) => item.group === grp);
                if (items.length === 0) return null;

                return (
                    <View key={grp} style={s.menuListContainer}>
                        <Text style={[s.menuListHeader, { color: subtextColor }]}>
                            {GROUP_TITLES[grp]}
                        </Text>
                        <GlassView
                            intensity={isDark ? 10 : 25}
                            style={[
                                s.menuList,
                                {
                                    backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.7)',
                                },
                            ]}
                        >
                            {items.map((item, index) => {
                                const isLast = index === items.length - 1;
                                return (
                                    <View key={item.id}>
                                        <TouchableOpacity
                                            style={s.menuRow}
                                            onPress={() => handlePressItem(item.id)}
                                            activeOpacity={0.7}
                                        >
                                            <LinearGradient
                                                colors={isDark ? ['#1C1C1E', '#000000'] : item.gradientColors}
                                                style={s.menuIconBox}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 1 }}
                                            >
                                                <PlatformIcon
                                                    name={item.icon as any}
                                                    size={16}
                                                    tintColor={isDark ? item.color : '#FFF'}
                                                />
                                            </LinearGradient>
                                            <View style={s.menuRowContent}>
                                                <Text style={[s.menuRowTitle, { color: textColor }]}>
                                                    {item.title}
                                                </Text>
                                                <Text style={[s.menuRowSubtitle, { color: subtextColor }]} numberOfLines={2}>
                                                    {item.subtitle}
                                                </Text>
                                            </View>
                                            <PlatformIcon
                                                name="chevron.right"
                                                size={14}
                                                tintColor={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'}
                                            />
                                        </TouchableOpacity>
                                        {!isLast && (
                                             <View
                                                style={[
                                                    s.indentedDivider,
                                                    {
                                                        backgroundColor: isDark
                                                            ? 'rgba(255,255,255,0.06)'
                                                            : 'rgba(0,0,0,0.06)',
                                                    },
                                                ]}
                                            />
                                        )}
                                    </View>
                                );
                            })}
                        </GlassView>
                    </View>
                );
            })}
        </View>
    );
}

const s = StyleSheet.create({
    container: {
        gap: 20,
        paddingHorizontal: 0,
        paddingTop: 10,
        paddingBottom: 24,
    },
    menuListContainer: {
        gap: 8,
    },
    menuListHeader: {
        fontSize: 13,
        fontWeight: '600',
        paddingHorizontal: 12,
        letterSpacing: -0.1,
    },
    menuList: {
        borderRadius: 24,
        overflow: 'hidden',
    },
    menuRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 13,
        paddingHorizontal: 16,
        gap: 12,
    },
    indentedDivider: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 60,
        marginRight: 0,
    },
    menuIconBox: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuRowContent: {
        flex: 1,
        gap: 2,
    },
    menuRowTitle: {
        fontSize: 16,
        fontWeight: '500',
        letterSpacing: -0.3,
    },
    menuRowSubtitle: {
        fontSize: 13,
        fontWeight: '400',
        lineHeight: 17,
    },
});
