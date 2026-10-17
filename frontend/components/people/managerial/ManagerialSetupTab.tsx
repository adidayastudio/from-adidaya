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
import { PlatformIcon } from '@/components/ui/PlatformIcon';

export type SetupModule =
    | 'departments'
    | 'positions'
    | 'levels'
    | 'contract_types'
    | 'work_statuses'
    | 'work_schedules'
    | 'employment_policies'
    | 'leave_policies'
    | 'audit_logs';

interface ManagerialSetupTabProps {
    isDark: boolean;
    textColor: string;
    subtextColor: string;
    selectedModule?: SetupModule;
    onSelectModule?: (id: SetupModule) => void;
}

interface MenuItem {
    id: SetupModule;
    group: 'org' | 'employment' | 'system';
    title: string;
    subtitle: string;
    icon: string;
    color: string;
    gradientColors: [string, string];
}

const MENU_ITEMS: MenuItem[] = [
    // Organization Structure
    {
        id: 'departments',
        group: 'org',
        title: 'Departments',
        subtitle: 'Teams, divisions & codes',
        icon: 'square.grid.2x2.fill',
        color: '#1677D2',
        gradientColors: ['#1677D2', '#0D47A1'],
    },
    {
        id: 'positions',
        group: 'org',
        title: 'Positions',
        subtitle: 'Titles, roles & reports',
        icon: 'person.2.fill',
        color: '#30B0C7',
        gradientColors: ['#30B0C7', '#00838F'],
    },
    {
        id: 'levels',
        group: 'org',
        title: 'Levels',
        subtitle: 'Grades, ranks & levels',
        icon: 'square.stack.3d.up.fill',
        color: '#30B0C7',
        gradientColors: ['#30B0C7', '#00838F'],
    },
    // Employment
    {
        id: 'contract_types',
        group: 'employment',
        title: 'Contract Types',
        subtitle: 'Full-time, contract & intern',
        icon: 'briefcase.fill',
        color: '#34C759',
        gradientColors: ['#34C759', '#248A3D'],
    },
    {
        id: 'work_statuses',
        group: 'employment',
        title: 'Work Statuses',
        subtitle: 'Active, probation & inactive',
        icon: 'person.crop.circle.badge.checkmark',
        color: '#34C759',
        gradientColors: ['#34C759', '#248A3D'],
    },
    {
        id: 'work_schedules',
        group: 'employment',
        title: 'Work Schedules',
        subtitle: 'Hours, shifts & workdays',
        icon: 'clock.fill',
        color: '#FF9500',
        gradientColors: ['#FF9500', '#D17A00'],
    },
    {
        id: 'employment_policies',
        group: 'employment',
        title: 'Employment Policies',
        subtitle: 'Rules, SOP & compliance',
        icon: 'shield.lefthalf.filled',
        color: '#34C759',
        gradientColors: ['#34C759', '#248A3D'],
    },
    {
        id: 'leave_policies',
        group: 'employment',
        title: 'Leave Policies',
        subtitle: 'Leave types & entitlements',
        icon: 'calendar.badge.clock',
        color: '#FF3B30',
        gradientColors: ['#FF3B30', '#C41E14'],
    },
    // System
    {
        id: 'audit_logs',
        group: 'system',
        title: 'Audit Logs',
        subtitle: 'Change history & event trail',
        icon: 'clock.arrow.circlepath',
        color: '#AF52DE',
        gradientColors: ['#AF52DE', '#7B1FA2'],
    },
];

export function ManagerialSetupTab({
    isDark,
    textColor,
    subtextColor,
    selectedModule,
    onSelectModule,
}: ManagerialSetupTabProps) {
    const router = useRouter();

    const orgItems = MENU_ITEMS.filter((item) => item.group === 'org');
    const employmentItems = MENU_ITEMS.filter((item) => item.group === 'employment');
    const systemItems = MENU_ITEMS.filter((item) => item.group === 'system');

    const handlePressItem = (id: SetupModule) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (onSelectModule) {
            onSelectModule(id);
        } else {
            router.push(`/people-setup/${id}` as any);
        }
    };

    const PEOPLE_ACCENT = '#1677D2';

    return (
        <View style={s.container}>
            {/* Section 1: Organization Structure */}
            <View style={s.menuListContainer}>
                <Text style={[s.menuListHeader, { color: subtextColor }]}>Organization Structure</Text>
                <View
                    style={[
                        s.menuList,
                        {
                            backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                            borderWidth: 1,
                            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                        },
                    ]}
                >
                    {orgItems.map((item, index) => {
                        const isLast = index === orgItems.length - 1;
                        const isSelected = selectedModule === item.id;
                        return (
                            <View key={item.id}>
                                <TouchableOpacity
                                    style={[
                                        s.menuRow,
                                        isSelected && {
                                            backgroundColor: isDark
                                                ? 'rgba(22, 119, 210, 0.16)'
                                                : 'rgba(22, 119, 210, 0.08)',
                                        },
                                    ]}
                                    onPress={() => handlePressItem(item.id)}
                                    activeOpacity={0.7}
                                >
                                    <LinearGradient
                                        colors={isDark ? ['#1C1C1E', '#000000'] : item.gradientColors}
                                        style={s.menuIconBox}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                    >
                                        <PlatformIcon name={item.icon as any} size={16} tintColor={isDark ? item.color : '#FFF'} />
                                    </LinearGradient>
                                    <View style={s.menuRowContent}>
                                        <Text style={[s.menuRowTitle, { color: textColor, fontWeight: isSelected ? '600' : '500' }]}>
                                            {item.title}
                                        </Text>
                                        <Text style={[s.menuRowSubtitle, { color: subtextColor }]} numberOfLines={1}>
                                            {item.subtitle}
                                        </Text>
                                    </View>
                                    <PlatformIcon
                                        name="chevron.right"
                                        size={14}
                                        tintColor={isSelected ? PEOPLE_ACCENT : (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)')}
                                    />
                                </TouchableOpacity>
                                {!isLast && !isSelected && (
                                    <View
                                        style={[
                                            s.indentedDivider,
                                            { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' },
                                        ]}
                                    />
                                )}
                            </View>
                        );
                    })}
                </View>
            </View>

            {/* Section 2: Employment */}
            <View style={s.menuListContainer}>
                <Text style={[s.menuListHeader, { color: subtextColor }]}>Employment</Text>
                <View
                    style={[
                        s.menuList,
                        {
                            backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                            borderWidth: 1,
                            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                        },
                    ]}
                >
                    {employmentItems.map((item, index) => {
                        const isLast = index === employmentItems.length - 1;
                        const isSelected = selectedModule === item.id;
                        return (
                            <View key={item.id}>
                                <TouchableOpacity
                                    style={[
                                        s.menuRow,
                                        isSelected && {
                                            backgroundColor: isDark
                                                ? 'rgba(22, 119, 210, 0.16)'
                                                : 'rgba(22, 119, 210, 0.08)',
                                        },
                                    ]}
                                    onPress={() => handlePressItem(item.id)}
                                    activeOpacity={0.7}
                                >
                                    <LinearGradient
                                        colors={isDark ? ['#1C1C1E', '#000000'] : item.gradientColors}
                                        style={s.menuIconBox}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                    >
                                        <PlatformIcon name={item.icon as any} size={16} tintColor={isDark ? item.color : '#FFF'} />
                                    </LinearGradient>
                                    <View style={s.menuRowContent}>
                                        <Text style={[s.menuRowTitle, { color: textColor, fontWeight: isSelected ? '600' : '500' }]}>
                                            {item.title}
                                        </Text>
                                        <Text style={[s.menuRowSubtitle, { color: subtextColor }]} numberOfLines={1}>
                                            {item.subtitle}
                                        </Text>
                                    </View>
                                    <PlatformIcon
                                        name="chevron.right"
                                        size={14}
                                        tintColor={isSelected ? PEOPLE_ACCENT : (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)')}
                                    />
                                </TouchableOpacity>
                                {!isLast && !isSelected && (
                                    <View
                                        style={[
                                            s.indentedDivider,
                                            { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' },
                                        ]}
                                    />
                                )}
                            </View>
                        );
                    })}
                </View>
            </View>

            {/* Section 3: System */}
            <View style={s.menuListContainer}>
                <Text style={[s.menuListHeader, { color: subtextColor }]}>System</Text>
                <View
                    style={[
                        s.menuList,
                        {
                            backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                            borderWidth: 1,
                            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                        },
                    ]}
                >
                    {systemItems.map((item, index) => {
                        const isLast = index === systemItems.length - 1;
                        const isSelected = selectedModule === item.id;
                        return (
                            <View key={item.id}>
                                <TouchableOpacity
                                    style={[
                                        s.menuRow,
                                        isSelected && {
                                            backgroundColor: isDark
                                                ? 'rgba(22, 119, 210, 0.16)'
                                                : 'rgba(22, 119, 210, 0.08)',
                                        },
                                    ]}
                                    onPress={() => handlePressItem(item.id)}
                                    activeOpacity={0.7}
                                >
                                    <LinearGradient
                                        colors={isDark ? ['#1C1C1E', '#000000'] : item.gradientColors}
                                        style={s.menuIconBox}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                    >
                                        <PlatformIcon name={item.icon as any} size={16} tintColor={isDark ? item.color : '#FFF'} />
                                    </LinearGradient>
                                    <View style={s.menuRowContent}>
                                        <Text style={[s.menuRowTitle, { color: textColor, fontWeight: isSelected ? '600' : '500' }]}>
                                            {item.title}
                                        </Text>
                                        <Text style={[s.menuRowSubtitle, { color: subtextColor }]} numberOfLines={1}>
                                            {item.subtitle}
                                        </Text>
                                    </View>
                                    <PlatformIcon
                                        name="chevron.right"
                                        size={14}
                                        tintColor={isSelected ? PEOPLE_ACCENT : (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)')}
                                    />
                                </TouchableOpacity>
                                {!isLast && !isSelected && (
                                    <View
                                        style={[
                                            s.indentedDivider,
                                            { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' },
                                        ]}
                                    />
                                )}
                            </View>
                        );
                    })}
                </View>
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    container: {
        gap: 20,
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
