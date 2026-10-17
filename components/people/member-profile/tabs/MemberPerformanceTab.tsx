import React from 'react';
import {
    View,
    Text,
    StyleSheet,
} from 'react-native';
import { GlassView } from '@/components/ui/GlassView';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { MemberProfileData } from '../types';

interface MemberPerformanceTabProps {
    profile: MemberProfileData | any;
    textColor: string;
    subtextColor: string;
    borderColor: string;
    bgColor: string;
    intensity: number;
    sectionTitleColor: string;
}

export const MemberPerformanceTab: React.FC<MemberPerformanceTabProps> = ({
    profile,
    textColor,
    subtextColor,
    borderColor,
    bgColor,
    intensity,
    sectionTitleColor,
}) => {
    return (
        <>
            {/* Summary */}
            <View style={s.section}>
                <View style={s.sectionHeader}>
                    <Text style={[s.sectionTitle, { color: sectionTitleColor }]}>Summary</Text>
                </View>
                <GlassView intensity={intensity} style={[s.card, { backgroundColor: bgColor, borderColor }]}>
                    <View style={s.formRow}>
                        <View style={s.rowLeft}>
                            <PlatformIcon name="target" size={16} tintColor={subtextColor} style={{ marginRight: 10 }} />
                            <Text style={[s.rowLabel, { color: textColor }]}>Performance Score</Text>
                        </View>
                        <Text style={[s.rowValue, { color: profile.kpi_score ? '#34C759' : subtextColor, fontWeight: '600' }]}>
                            {profile.kpi_score || 'Not Evaluated'}
                        </Text>
                    </View>
                    <View style={[s.separator, { backgroundColor: borderColor }]} />

                    <View style={s.formRow}>
                        <View style={s.rowLeft}>
                            <PlatformIcon name="chart.pie.fill" size={16} tintColor={subtextColor} style={{ marginRight: 10 }} />
                            <Text style={[s.rowLabel, { color: textColor }]}>Evaluation Status</Text>
                        </View>
                        <Text style={[s.rowValue, { color: profile.kpi_status ? '#007AFF' : subtextColor }]}>
                            {profile.kpi_status || 'Pending Review Cycle'}
                        </Text>
                    </View>
                </GlassView>
            </View>

            {/* Detail */}
            <View style={s.section}>
                <View style={s.sectionHeader}>
                    <Text style={[s.sectionTitle, { color: sectionTitleColor }]}>Detail</Text>
                </View>
                <GlassView intensity={intensity} style={[s.card, { backgroundColor: bgColor, borderColor }]}>
                    <View style={s.formRow}>
                        <View style={s.rowLeft}>
                            <PlatformIcon name="calendar" size={16} tintColor={subtextColor} style={{ marginRight: 10 }} />
                            <Text style={[s.rowLabel, { color: textColor }]}>Working Days (This Month)</Text>
                        </View>
                        <Text style={[s.rowValue, { color: subtextColor }]}>
                            {profile.working_days_month || '—'}
                        </Text>
                    </View>
                    <View style={[s.separator, { backgroundColor: borderColor }]} />

                    <View style={s.formRow}>
                        <View style={s.rowLeft}>
                            <PlatformIcon name="clock" size={16} tintColor={subtextColor} style={{ marginRight: 10 }} />
                            <Text style={[s.rowLabel, { color: textColor }]}>Total Work Hours</Text>
                        </View>
                        <Text style={[s.rowValue, { color: subtextColor }]}>
                            {profile.work_hours_month || '—'}
                        </Text>
                    </View>
                    <View style={[s.separator, { backgroundColor: borderColor }]} />

                    <View style={s.formRow}>
                        <View style={s.rowLeft}>
                            <PlatformIcon name="clock.badge.exclamationmark" size={16} tintColor={subtextColor} style={{ marginRight: 10 }} />
                            <Text style={[s.rowLabel, { color: textColor }]}>Late / Permission</Text>
                        </View>
                        <Text style={[s.rowValue, { color: subtextColor }]}>
                            {profile.late_permission_month || '—'}
                        </Text>
                    </View>
                    <View style={[s.separator, { backgroundColor: borderColor }]} />

                    <View style={s.formRow}>
                        <View style={s.rowLeft}>
                            <PlatformIcon name="bolt.fill" size={16} tintColor={subtextColor} style={{ marginRight: 10 }} />
                            <Text style={[s.rowLabel, { color: textColor }]}>Overtime Hours</Text>
                        </View>
                        <Text style={[s.rowValue, { color: subtextColor }]}>
                            {profile.overtime_month || '—'}
                        </Text>
                    </View>
                    <View style={[s.separator, { backgroundColor: borderColor }]} />

                    <View style={s.formRow}>
                        <View style={s.rowLeft}>
                            <PlatformIcon name="calendar.badge.minus" size={16} tintColor={subtextColor} style={{ marginRight: 10 }} />
                            <Text style={[s.rowLabel, { color: textColor }]}>Leave Balance</Text>
                        </View>
                        <Text style={[s.rowValue, { color: subtextColor }]}>
                            {profile.leave_balance_remaining ? `${profile.leave_balance_remaining} Days Remaining` : '—'}
                        </Text>
                    </View>
                    <View style={[s.separator, { backgroundColor: borderColor }]} />

                    <View style={s.formRow}>
                        <View style={s.rowLeft}>
                            <PlatformIcon name="folder.badge.gearshape" size={16} tintColor={subtextColor} style={{ marginRight: 10 }} />
                            <Text style={[s.rowLabel, { color: textColor }]}>Project Involvement</Text>
                        </View>
                        <Text style={[s.rowValue, { color: subtextColor }]}>
                            {profile.project_count ? `${profile.project_count} Projects` : '—'}
                        </Text>
                    </View>
                    <View style={[s.separator, { backgroundColor: borderColor }]} />

                    <View style={s.formRow}>
                        <View style={s.rowLeft}>
                            <PlatformIcon name="sparkles" size={16} tintColor={subtextColor} style={{ marginRight: 10 }} />
                            <Text style={[s.rowLabel, { color: textColor }]}>Engagement</Text>
                        </View>
                        <Text style={[s.rowValue, { color: subtextColor }]}>
                            {profile.engagement_score || '—'}
                        </Text>
                    </View>
                </GlassView>
            </View>
        </>
    );
};

const s = StyleSheet.create({
    section: {
        gap: 8,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '400',
        textTransform: 'none',
    },
    card: {
        borderRadius: 20,
        paddingHorizontal: 16,
        overflow: 'hidden',
        borderWidth: 1,
    },
    separator: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 26,
    },
    formRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: 46,
        paddingVertical: 10,
    },
    rowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    rowLabel: {
        fontSize: 15,
        fontWeight: '400',
    },
    rowValue: {
        fontSize: 15,
        fontWeight: '400',
        textAlign: 'right',
    },
});
