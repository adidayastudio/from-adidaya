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
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/theme';

export type ReportsSetupModule =
    | 'general_settings'
    | 'numbering_rules'
    | 'report_structure'
    | 'report_types'
    | 'activity_templates'
    | 'category_tags'
    | 'scheduling_automation'
    | 'document_templates'
    | 'approval_flow';

export type ReportsSetupGroup = 'general' | 'structure' | 'automation' | 'governance';

export interface ReportsMenuItem {
    id: ReportsSetupModule;
    group: ReportsSetupGroup;
    title: string;
    shortLabel: string;
    subtitle: string;
    icon: string;
    color: string;
    gradientColors: [string, string];
}

export const REPORTS_SETUP_MENU_ITEMS: ReportsMenuItem[] = [
    // 1. General (Slate)
    {
        id: 'general_settings',
        group: 'general',
        title: 'General Settings',
        shortLabel: 'General',
        subtitle: 'Timezone, localization, period defaults, and retention',
        icon: 'slider.horizontal.3',
        color: '#64748B',
        gradientColors: ['#64748B', '#475569'],
    },
    {
        id: 'numbering_rules',
        group: 'general',
        title: 'Document Rules',
        shortLabel: 'Document Rules',
        subtitle: 'Code template, numbering, filename, and revision rules',
        icon: 'number.square.fill',
        color: '#64748B',
        gradientColors: ['#64748B', '#334155'],
    },

    // 2. Reporting Structure (Blue) - Category > Type > Activities
    {
        id: 'category_tags',
        group: 'structure',
        title: 'Operational Categories',
        shortLabel: 'Categories',
        subtitle: 'Organize reporting structures by operational domains',
        icon: 'tag.fill',
        color: '#2563EB',
        gradientColors: ['#2563EB', '#1D4ED8'],
    },
    {
        id: 'report_types',
        group: 'structure',
        title: 'Report Types',
        shortLabel: 'Report Types',
        subtitle: 'Configure operational report templates and periodic cycles',
        icon: 'doc.text.fill',
        color: '#2563EB',
        gradientColors: ['#2563EB', '#1D4ED8'],
    },
    {
        id: 'activity_templates',
        group: 'structure',
        title: 'Activities & Forms',
        shortLabel: 'Activities',
        subtitle: 'Define routine checklists, field parameters, and form structures',
        icon: 'square.grid.2x2.fill',
        color: '#2563EB',
        gradientColors: ['#2563EB', '#1D4ED8'],
    },

    // 3. Automation & Rules (Green)
    {
        id: 'scheduling_automation',
        group: 'automation',
        title: 'Scheduling & Automation',
        shortLabel: 'Scheduling',
        subtitle: 'Daily, Weekly, Biweekly recurrence and automatic Task generation',
        icon: 'clock.badge.checkmark.fill',
        color: '#34C759',
        gradientColors: ['#34C759', '#248A3D'],
    },
    {
        id: 'document_templates',
        group: 'automation',
        title: 'Document Templates',
        shortLabel: 'Templates',
        subtitle: 'PDF, Excel, layout branding, sections, and signatures',
        icon: 'printer.fill',
        color: '#34C759',
        gradientColors: ['#34C759', '#248A3D'],
    },

    // 4. Governance (Amber)
    {
        id: 'approval_flow',
        group: 'governance',
        title: 'Permissions & Approval',
        shortLabel: 'Permissions',
        subtitle: 'Submission, review, approval, and generation roles',
        icon: 'lock.shield.fill',
        color: '#FF9500',
        gradientColors: ['#FF9500', '#D17A00'],
    },
];

const GROUP_TITLES: Record<ReportsSetupGroup, string> = {
    general: 'General',
    structure: 'Reporting Structure',
    automation: 'Automation & Rules',
    governance: 'Governance',
};

export function SetupTab() {
    const router = useRouter();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';

    const groups: ReportsSetupGroup[] = ['general', 'structure', 'automation', 'governance'];

    const handlePressItem = (item: ReportsMenuItem) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(`/reports-setup/${item.id}` as any);
    };

    return (
        <View style={s.container}>
            {groups.map((grp) => {
                const items = REPORTS_SETUP_MENU_ITEMS.filter((item) => item.group === grp);
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
                                            onPress={() => handlePressItem(item)}
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
                                                <Text style={[s.menuRowSubtitle, { color: subtextColor }]} numberOfLines={1}>
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
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 32,
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
        gap: 1,
    },
    menuRowTitle: {
        fontSize: 16,
        fontWeight: '500',
        letterSpacing: -0.3,
    },
    menuRowSubtitle: {
        fontSize: 13,
        fontWeight: '400',
    },
});
