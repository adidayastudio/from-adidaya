import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Platform,
    useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { GlassView } from '@/components/ui/GlassView';
import { PlatformIcon } from '@/components/ui/PlatformIcon';

export type ClockSetupModule =
    | 'work_schedules'
    | 'holidays'
    | 'attendance_period'
    | 'attendance_members'
    | 'attendance_rules'
    | 'attendance_correction'
    | 'work_locations'
    | 'remote_work'
    | 'anti_fraud'
    | 'leave_policies'
    | 'overtime_rules'
    | 'business_trip_rules'
    | 'shift_management'
    | 'approval_workflows'
    | 'notifications'
    | 'privacy_retention'
    | 'audit_logs';

export type ClockSetupGroup = 'timing' | 'rules' | 'locations' | 'leaves' | 'workflows' | 'systems';

interface ClockTeamSetupTabProps {
    isDark: boolean;
    textColor: string;
    subtextColor: string;
    selectedModule?: ClockSetupModule;
    onSelectModule?: (mod: ClockSetupModule) => void;
}

export interface ClockMenuItem {
    id: ClockSetupModule;
    group: ClockSetupGroup;
    title: string;
    shortLabel: string;
    subtitle: string;
    icon: string;
    color: string;
    gradientColors: [string, string];
}

export const CLOCK_SETUP_MENU_ITEMS: ClockMenuItem[] = [
    // 1. Work Schedules & Timing
    {
        id: 'work_schedules',
        group: 'timing',
        title: 'Work Schedules',
        shortLabel: 'Schedules',
        subtitle: 'Office, flexible & preset',
        icon: 'clock.fill',
        color: '#FF9500',
        gradientColors: ['#FF9500', '#D17A00'],
    },
    {
        id: 'holidays',
        group: 'timing',
        title: 'Calendar & Holidays',
        shortLabel: 'Calendar',
        subtitle: 'Public & company holidays',
        icon: 'calendar',
        color: '#FF3B30',
        gradientColors: ['#FF3B30', '#C41E14'],
    },
    {
        id: 'attendance_period',
        group: 'timing',
        title: 'Period & Timezone',
        shortLabel: 'Period',
        subtitle: 'Cut-off period & timezone',
        icon: 'globe.asia.australia.fill',
        color: '#FF9500',
        gradientColors: ['#FF9500', '#D17A00'],
    },
    {
        id: 'shift_management',
        group: 'timing',
        title: 'Shift Management',
        shortLabel: 'Shifts',
        subtitle: 'Patterns, rotation & rest',
        icon: 'arrow.triangle.2.circlepath',
        color: '#FF9500',
        gradientColors: ['#FF9500', '#D17A00'],
    },

    // 2. Attendance Rules & Scope
    {
        id: 'attendance_members',
        group: 'rules',
        title: 'Attendance Members',
        shortLabel: 'Members',
        subtitle: 'Included people & scope',
        icon: 'person.2.fill',
        color: '#34C759',
        gradientColors: ['#34C759', '#248A3D'],
    },
    {
        id: 'attendance_rules',
        group: 'rules',
        title: 'Attendance Rules',
        shortLabel: 'Rules',
        subtitle: 'Late, early & half day',
        icon: 'checklist',
        color: '#AF52DE',
        gradientColors: ['#AF52DE', '#7A2BB1'],
    },
    {
        id: 'attendance_correction',
        group: 'rules',
        title: 'Attendance Corrections',
        shortLabel: 'Corrections',
        subtitle: 'Missing logs & edit limits',
        icon: 'pencil.and.outline',
        color: '#AF52DE',
        gradientColors: ['#AF52DE', '#7A2BB1'],
    },

    // 3. Locations & Remote Work
    {
        id: 'work_locations',
        group: 'locations',
        title: 'Locations & Geofence',
        shortLabel: 'Locations',
        subtitle: 'Office, site & radius',
        icon: 'location.fill',
        color: '#30B0C7',
        gradientColors: ['#30B0C7', '#0E7A8E'],
    },
    {
        id: 'remote_work',
        group: 'locations',
        title: 'Remote Work',
        shortLabel: 'Remote',
        subtitle: 'WFO, WFH, WFA & trips',
        icon: 'laptopcomputer.and.ipad',
        color: '#30B0C7',
        gradientColors: ['#30B0C7', '#0E7A8E'],
    },
    {
        id: 'anti_fraud',
        group: 'locations',
        title: 'Security & Anti-Fraud',
        shortLabel: 'Security',
        subtitle: 'GPS, device & biometrics',
        icon: 'shield.lefthalf.filled',
        color: '#AF52DE',
        gradientColors: ['#AF52DE', '#7A2BB1'],
    },

    // 4. Leaves, Overtime & Trips
    {
        id: 'leave_policies',
        group: 'leaves',
        title: 'Leave Policies',
        shortLabel: 'Leaves',
        subtitle: 'Annual, sick & permission',
        icon: 'calendar.badge.clock',
        color: '#FF3B30',
        gradientColors: ['#FF3B30', '#C41E14'],
    },
    {
        id: 'overtime_rules',
        group: 'leaves',
        title: 'Overtime Policies',
        shortLabel: 'Overtime',
        subtitle: 'Limits, rates & rules',
        icon: 'hourglass.badge.plus',
        color: '#FF9500',
        gradientColors: ['#FF9500', '#D17A00'],
    },
    {
        id: 'business_trip_rules',
        group: 'leaves',
        title: 'Business Trips',
        shortLabel: 'Trips',
        subtitle: 'Requests, allowances & attendance',
        icon: 'airplane',
        color: '#30B0C7',
        gradientColors: ['#30B0C7', '#0E7A8E'],
    },

    // 5. Workflows & Notifications
    {
        id: 'approval_workflows',
        group: 'workflows',
        title: 'Approval Flows',
        shortLabel: 'Approvals',
        subtitle: 'Manager, HR & Finance',
        icon: 'person.crop.circle.badge.checkmark',
        color: '#34C759',
        gradientColors: ['#34C759', '#248A3D'],
    },
    {
        id: 'notifications',
        group: 'workflows',
        title: 'Notifications & Alerts',
        shortLabel: 'Alerts',
        subtitle: 'Clock alerts & reminders',
        icon: 'bell.badge.fill',
        color: '#FF3B30',
        gradientColors: ['#FF3B30', '#A8140B'],
    },

    // 6. Systems
    {
        id: 'privacy_retention',
        group: 'systems',
        title: 'Privacy & Retention',
        shortLabel: 'Privacy',
        subtitle: 'GPS, photo & audit retention',
        icon: 'lock.shield.fill',
        color: '#AF52DE',
        gradientColors: ['#AF52DE', '#7A2BB1'],
    },
    {
        id: 'audit_logs',
        group: 'systems',
        title: 'Audit Log',
        shortLabel: 'Audit Log',
        subtitle: 'System changes & activity trails',
        icon: 'doc.text.magnifyingglass',
        color: '#5856D6',
        gradientColors: ['#5856D6', '#3634A3'],
    },
];

const GROUP_TITLES: Record<ClockSetupGroup, string> = {
    timing: 'Work Schedules & Timing',
    rules: 'Attendance Rules & Scope',
    locations: 'Locations & Remote Work',
    leaves: 'Leaves, Overtime & Trips',
    workflows: 'Workflows & Notifications',
    systems: 'Systems',
};

const CLOCK_ACCENT = '#0EA5E9';

export function ClockTeamSetupTab({
    isDark,
    textColor,
    subtextColor,
    selectedModule,
    onSelectModule,
}: ClockTeamSetupTabProps) {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isDesktopWeb = Platform.OS === 'web' && width >= 768;
    const horizontalPad = isDesktopWeb ? 0 : 16;

    const groups: ClockSetupGroup[] = ['timing', 'rules', 'locations', 'leaves', 'workflows', 'systems'];

    const handlePressItem = (id: ClockSetupModule) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (onSelectModule) {
            onSelectModule(id);
        } else {
            router.push(`/clock-setup/${id}` as any);
        }
    };

    return (
        <View style={[s.container, { paddingHorizontal: horizontalPad }]}>
            {groups.map((grp) => {
                const items = CLOCK_SETUP_MENU_ITEMS.filter((item) => item.group === grp);
                if (items.length === 0) return null;

                return (
                    <View key={grp} style={s.menuListContainer}>
                        <Text style={[s.menuListHeader, { color: subtextColor }]}>
                            {GROUP_TITLES[grp]}
                        </Text>
                        <View
                            style={[
                                s.menuList,
                                {
                                    backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                                    borderWidth: 1,
                                },
                            ]}
                        >
                            {items.map((item, index) => {
                                const isLast = index === items.length - 1;
                                const isSelected = selectedModule === item.id;

                                return (
                                    <View key={item.id}>
                                        <TouchableOpacity
                                            style={[
                                                s.menuRow,
                                                isSelected && {
                                                    backgroundColor: isDark
                                                        ? 'rgba(14, 165, 233, 0.18)'
                                                        : 'rgba(14, 165, 233, 0.10)',
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
                                                <PlatformIcon
                                                    name={item.icon as any}
                                                    size={16}
                                                    tintColor={isDark ? item.color : '#FFF'}
                                                />
                                            </LinearGradient>
                                            <View style={s.menuRowContent}>
                                                <Text
                                                    style={[
                                                        s.menuRowTitle,
                                                        { color: isSelected ? CLOCK_ACCENT : textColor },
                                                        isSelected && { fontWeight: '600' },
                                                    ]}
                                                >
                                                    {item.title}
                                                </Text>
                                                <Text
                                                    style={[
                                                        s.menuRowSubtitle,
                                                        { color: isSelected ? (isDark ? '#7DD3FC' : '#0284C7') : subtextColor },
                                                    ]}
                                                    numberOfLines={1}
                                                >
                                                    {item.subtitle}
                                                </Text>
                                            </View>
                                            <PlatformIcon
                                                name="chevron.right"
                                                size={14}
                                                tintColor={isSelected ? CLOCK_ACCENT : (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)')}
                                            />
                                        </TouchableOpacity>
                                        {!isLast && !isSelected && (
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
                        </View>
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
        paddingBottom: 24,
    },
    menuListContainer: {
        gap: 8,
    },
    menuListHeader: {
        fontSize: 13,
        fontWeight: '600',
        paddingHorizontal: 4,
        letterSpacing: -0.1,
    },
    menuList: {
        borderRadius: 20,
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
