import React, { useState, useEffect, useMemo } from 'react';
import { GlassView } from '@/components/ui/GlassView';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { BouncyGlassButton } from '@/components/ui/BouncyGlassButton';
import { HeaderBlurBackground } from '@/components/ui/HeaderBlurBackground';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useUserContext } from '@/context/UserProvider';
import { supabase } from '@/lib/supabase';
import { formatScheduleDetail } from '@/components/people/member-profile/types';
import { Stack, useRouter } from 'expo-router';
import { Alert, Platform, StatusBar as RNStatusBar, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
    LeavePolicy,
    fetchLeavePolicies,
    getEligibleLeavePolicies,
    calculateProratedAnnualLeave,
} from '@/lib/api/leavePolicies';

// Safe lazy loading of SwiftUI components
let SwiftUIHost: any = null;
let SwiftUIButton: any = null;
let SwiftUIText: any = null;
let swiftModifiers: any = null;
if (Platform.OS === 'ios') {
    try {
        const SwiftUI = require('@expo/ui/swift-ui');
        SwiftUIHost = SwiftUI.Host;
        SwiftUIButton = SwiftUI.Button;
        SwiftUIText = SwiftUI.Text;
        swiftModifiers = require('@expo/ui/swift-ui/modifiers');
    } catch (e) {
        // handled
    }
}

export default function EmploymentScreen() {
    const router = useRouter();
    const { resolvedTheme } = useTheme();
    const insets = useSafeAreaInsets();
    const { profile, user } = useUserContext();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';
    const borderColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
    const bgColor = isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.7)';
    const intensity = isDark ? 10 : 25;

    const [contractTypes, setContractTypes] = useState<any[]>([]);
    const [workStatuses, setWorkStatuses] = useState<any[]>([]);
    const [empPolicies, setEmpPolicies] = useState<any[]>([]);
    const [leavePolicies, setLeavePolicies] = useState<LeavePolicy[]>([]);
    const [workSchedules, setWorkSchedules] = useState<any[]>([]);

    useEffect(() => {
        const loadPolicies = async () => {
            try {
                const [
                    { data: ctData },
                    { data: wsData },
                    { data: epData },
                    lpData,
                    { data: wschedData },
                ] = await Promise.all([
                    supabase.from('employment_types').select('*'),
                    supabase.from('work_status').select('*'),
                    supabase.from('employment_policies').select('*'),
                    fetchLeavePolicies(),
                    supabase.from('work_schedules').select('*'),
                ]);
                if (ctData) setContractTypes(ctData);
                if (wsData) setWorkStatuses(wsData);
                if (epData) setEmpPolicies(epData);
                if (lpData) setLeavePolicies(lpData);
                if (wschedData) setWorkSchedules(wschedData);
            } catch (e) {
                // silent
            }
        };
        loadPolicies();
    }, []);

    const contractTypeName = profile?.contract_type || profile?.employment_type || (profile?.employment_type_id ? contractTypes.find(c => c.id === profile.employment_type_id)?.name : undefined);
    const workStatusName = profile?.work_status || (profile?.work_status_id ? workStatuses.find(w => w.id === profile.work_status_id)?.name : undefined);
    const hasContract = Boolean(contractTypeName);

    const matchedPolicy = useMemo(() => {
        if (!hasContract) return null;
        const ctName = contractTypeName?.toLowerCase();
        const ct = contractTypes.find((c) => c.name?.toLowerCase() === ctName || c.id === (profile as any)?.employment_type_id);
        if (ct) {
            return empPolicies.find((p) => p.employment_type_id === ct.id);
        }
        return null;
    }, [hasContract, contractTypeName, contractTypes, empPolicies, profile?.employment_type_id]);

    const eligibleLeavePolicies = useMemo(() => {
        if (!leavePolicies || leavePolicies.length === 0) return [];
        return getEligibleLeavePolicies(leavePolicies, profile || user);
    }, [leavePolicies, profile, user]);

    const matchedLeavePolicy = useMemo(() => {
        if (!eligibleLeavePolicies || eligibleLeavePolicies.length === 0) return null;
        // Prioritize Annual Leave policy
        return eligibleLeavePolicies.find((p) => p.leave_type === 'annual') || eligibleLeavePolicies[0];
    }, [eligibleLeavePolicies]);

    const leavePolicyInfo = useMemo(() => {
        if (!hasContract) {
            return { summary: '—', detail: '' };
        }
        if (matchedPolicy?.leave_eligible === false) {
            return { summary: 'No Leave Entitlement', detail: '' };
        }
        if (!matchedLeavePolicy) {
            return { summary: '12 Days / Year Standard', detail: '' };
        }

        const quotaStr = `${matchedLeavePolicy.entitlement_days} Days / Cycle Standard (${matchedLeavePolicy.name})`;

        const joinDate = profile?.join_date || profile?.joinDate || null;
        const proration = calculateProratedAnnualLeave(matchedLeavePolicy, joinDate);

        const details = [
            proration.explanation,
            matchedLeavePolicy.is_paid ? 'Paid' : 'Unpaid',
            matchedLeavePolicy.min_notice_days > 0 ? `${matchedLeavePolicy.min_notice_days}d Notice` : 'Immediate'
        ].filter(Boolean).join(' • ');

        return { summary: quotaStr, detail: details };
    }, [hasContract, matchedPolicy, matchedLeavePolicy, profile?.join_date, profile?.joinDate]);

    const scheduleInfo = useMemo(() => {
        let name = profile?.schedule_name || '';
        let detail = profile?.schedule_detail || '';
        const schedId = profile?.work_schedule_id || (profile as any)?.schedule_id;

        if (schedId && workSchedules.length > 0) {
            const matched = workSchedules.find((s) => s.id === schedId);
            if (matched) {
                if (!name) name = matched.name;
                if (!detail) detail = formatScheduleDetail(matched);
            }
        }
        return {
            name: name || '—',
            detail: detail || '',
        };
    }, [profile?.schedule_name, profile?.schedule_detail, profile?.work_schedule_id, (profile as any)?.schedule_id, workSchedules]);

    const EditButton = ({ onPress }: { onPress?: () => void }) => {
        if (Platform.OS === 'ios' && SwiftUIHost && SwiftUIButton && SwiftUIText && swiftModifiers) {
            return (
                <View style={{ height: 22, width: 64 }}>
                    <SwiftUIHost style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                        <SwiftUIButton
                            onPress={onPress}
                            controlSize="mini"
                            variant="glassProminent"
                            color="#007AFF"
                        >
                            <SwiftUIText size={11} weight="semibold" color="#FFFFFF">
                                Edit
                            </SwiftUIText>
                        </SwiftUIButton>
                    </SwiftUIHost>
                </View>
            );
        }

        return (
            <TouchableOpacity
                style={[
                    s.editButtonGlass,
                    {
                        backgroundColor: isDark ? 'rgba(10, 132, 255, 0.15)' : 'rgba(0, 122, 255, 0.08)',
                        borderColor: isDark ? 'rgba(10, 132, 255, 0.3)' : 'rgba(0, 122, 255, 0.18)'
                    }
                ]}
                onPress={onPress}
                activeOpacity={0.7}
            >
                <Text style={[s.editTextGlass, { color: isDark ? '#409CFF' : '#007AFF' }]}>Edit</Text>
            </TouchableOpacity>
        );
    };

    const renderHeader = (title: string, showEdit = false) => (
        <View style={s.sectionHeader}>
            <Text style={[s.sectionTitle, { color: isDark ? '#8E8E93' : '#6C6C70', flex: 1 }]}>{title}</Text>
            {showEdit && <EditButton onPress={() => Alert.alert('Edit ' + title, 'Editing this section is not yet available in-app. Please contact your administrator.', [{ text: 'OK' }])} />}
        </View>
    );

    return (
        <ScrollView
            style={[s.container, { backgroundColor: isDark ? '#000' : '#F2F2F7' }]}
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={{
                paddingHorizontal: 16,
                paddingBottom: insets.bottom + 40,
                paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 24) + 16 : 16,
                gap: 24,
            }}
            showsVerticalScrollIndicator={false}
        >
            <Stack.Screen
                options={{
                    headerShown: true,
                    title: 'Employment',
                    headerLargeTitle: false,
                    headerTransparent: Platform.OS === 'ios',
                    headerStyle: { backgroundColor: Platform.OS === 'ios' ? 'transparent' : (isDark ? '#000000' : '#F2F2F7') },
                    headerTintColor: textColor,
                    headerTitleStyle: { color: textColor, fontWeight: '600' },
                    headerShadowVisible: false,
                    headerBackButtonDisplayMode: 'minimal',
                    headerBackTitle: ' ',
                }}
            />

            <View style={{ gap: 24 }}>

                {/* CURRENT ROLE */}
                <View style={s.section}>
                    {renderHeader('Current Role')}
                    <GlassView intensity={intensity} style={[s.card, { backgroundColor: bgColor }]}>
                        {/* Department */}
                        <View style={s.formRow}>
                            <View style={s.rowLeft}>
                                <PlatformIcon name="building.2" size={16} tintColor={subtextColor} style={{ marginRight: 10 }} />
                                <Text style={[s.rowLabel, { color: textColor }]}>Department</Text>
                            </View>
                            <View style={s.rowRight}>
                                <Text style={[s.rowValue, { color: subtextColor }]}>
                                    {profile?.department || '—'}
                                </Text>
                            </View>
                        </View>
                        <View style={[s.separator, { backgroundColor: borderColor }]} />
                        {/* Position */}
                        <View style={s.formRow}>
                            <View style={s.rowLeft}>
                                <PlatformIcon name="briefcase" size={16} tintColor={subtextColor} style={{ marginRight: 10 }} />
                                <Text style={[s.rowLabel, { color: textColor }]}>Position</Text>
                            </View>
                            <View style={s.rowRight}>
                                <Text style={[s.rowValue, { color: subtextColor }]}>
                                    {profile?.position || profile?.job_title || '—'}
                                </Text>
                            </View>
                        </View>
                    </GlassView>
                </View>

                {/* EMPLOYEE IDENTIFICATION */}
                <View style={s.section}>
                    {renderHeader('Employee Identification')}
                    <GlassView intensity={intensity} style={[s.card, { backgroundColor: bgColor }]}>
                        {/* Employee ID */}
                        <View style={s.formRow}>
                            <View style={s.rowLeft}>
                                <PlatformIcon name="number" size={16} tintColor={subtextColor} style={{ marginRight: 10 }} />
                                <Text style={[s.rowLabel, { color: textColor }]}>Employee ID</Text>
                            </View>
                            <View style={s.rowRight}>
                                <Text style={[s.rowValue, { color: subtextColor }]}>
                                    {profile?.employee_id || profile?.id_number || '—'}
                                </Text>
                            </View>
                        </View>
                        <View style={[s.separator, { backgroundColor: borderColor }]} />
                        {/* ID Code */}
                        <View style={s.formRow}>
                            <View style={s.rowLeft}>
                                <PlatformIcon name="qrcode" size={16} tintColor={subtextColor} style={{ marginRight: 10 }} />
                                <Text style={[s.rowLabel, { color: textColor }]}>ID Code</Text>
                            </View>
                            <View style={s.rowRight}>
                                <Text style={[s.rowValue, { color: subtextColor }]}>
                                    {profile?.id_code || '—'}
                                </Text>
                            </View>
                        </View>
                    </GlassView>
                </View>

                {/* EMPLOYMENT STATUS */}
                <View style={s.section}>
                    {renderHeader('Employment Status')}
                    <GlassView intensity={intensity} style={[s.card, { backgroundColor: bgColor }]}>
                        {/* Employment Type */}
                        <View style={s.formRow}>
                            <View style={s.rowLeft}>
                                <PlatformIcon name="person.text.rectangle" size={16} tintColor={subtextColor} style={{ marginRight: 10 }} />
                                <Text style={[s.rowLabel, { color: textColor }]}>Employment Type</Text>
                            </View>
                            <View style={s.rowRight}>
                                <Text style={[s.rowValue, { color: subtextColor }]}>
                                    {profile?.contract_type || profile?.employment_type || '—'}
                                </Text>
                            </View>
                        </View>
                        <View style={[s.separator, { backgroundColor: borderColor }]} />
                        {/* Work Status */}
                        <View style={s.formRow}>
                            <View style={s.rowLeft}>
                                <PlatformIcon name="waveform.path.ecg" size={16} tintColor={subtextColor} style={{ marginRight: 10 }} />
                                <Text style={[s.rowLabel, { color: textColor }]}>Work Status</Text>
                            </View>
                            <View style={s.rowRight}>
                                <Text style={[s.rowValue, { color: subtextColor }]}>
                                    {profile?.work_status || '—'}
                                </Text>
                            </View>
                        </View>
                    </GlassView>
                </View>

                {/* CONTRACT DETAILS */}
                <View style={s.section}>
                    {renderHeader('Contract Details')}
                    <GlassView intensity={intensity} style={[s.card, { backgroundColor: bgColor }]}>
                        {/* Join Date */}
                        <View style={s.formRow}>
                            <View style={s.rowLeft}>
                                <PlatformIcon name="calendar" size={16} tintColor={subtextColor} style={{ marginRight: 10 }} />
                                <Text style={[s.rowLabel, { color: textColor }]}>Join Date</Text>
                            </View>
                            <View style={s.rowRight}>
                                <Text style={[s.rowValue, { color: subtextColor }]}>
                                    {profile?.join_date || profile?.joinDate || '—'}
                                </Text>
                            </View>
                        </View>
                        <View style={[s.separator, { backgroundColor: borderColor }]} />
                        {/* End Date */}
                        <View style={s.formRow}>
                            <View style={s.rowLeft}>
                                <PlatformIcon name="calendar" size={16} tintColor={subtextColor} style={{ marginRight: 10 }} />
                                <Text style={[s.rowLabel, { color: textColor }]}>End Date</Text>
                            </View>
                            <View style={s.rowRight}>
                                <Text style={[s.rowValue, { color: subtextColor }]}>
                                    {profile?.end_date || profile?.contract_end_date || (hasContract ? 'Present' : '—')}
                                </Text>
                            </View>
                        </View>
                    </GlassView>
                </View>

                {/* WORK SCHEDULE */}
                <View style={s.section}>
                    {renderHeader('Work Schedule')}
                    <GlassView intensity={intensity} style={[s.card, { backgroundColor: bgColor }]}>
                        {/* Schedule Type */}
                        <View style={[s.formRow, { alignItems: 'flex-start', paddingVertical: 10 }]}>
                            <View style={[s.rowLeft, { marginTop: 2 }]}>
                                <PlatformIcon name="clock" size={16} tintColor={subtextColor} style={{ marginRight: 10 }} />
                                <Text style={[s.rowLabel, { color: textColor }]}>Schedule Type</Text>
                            </View>
                            <View style={{ alignItems: 'flex-end', flex: 1, justifyContent: 'center' }}>
                                <Text style={[s.rowValue, { color: subtextColor }]}>
                                    {scheduleInfo.name}
                                </Text>
                                {scheduleInfo.detail ? (
                                    <Text style={{ fontSize: 11, color: subtextColor, marginTop: 3, textAlign: 'right' }}>
                                        {scheduleInfo.detail}
                                    </Text>
                                ) : null}
                            </View>
                        </View>
                    </GlassView>
                </View>

                {/* EMPLOYMENT POLICIES */}
                <View style={s.section}>
                    {renderHeader('Employment Policies')}
                    <GlassView intensity={intensity} style={[s.card, { backgroundColor: bgColor }]}>
                        <View style={s.formRow}>
                            <View style={s.rowLeft}>
                                <PlatformIcon name="clock" size={16} tintColor={subtextColor} style={{ marginRight: 10 }} />
                                <Text style={[s.rowLabel, { color: textColor }]}>Standard Work Hours</Text>
                            </View>
                            <View style={s.rowRight}>
                                <Text style={[s.rowValue, { color: subtextColor }]}>
                                    {hasContract
                                        ? (matchedPolicy?.work_hours_per_week ? `${matchedPolicy.work_hours_per_week} Hours / Week` : '40 Hours / Week')
                                        : '—'}
                                </Text>
                            </View>
                        </View>
                        <View style={[s.separator, { backgroundColor: borderColor }]} />

                        <View style={s.formRow}>
                            <View style={s.rowLeft}>
                                <PlatformIcon name="bolt.fill" size={16} tintColor={subtextColor} style={{ marginRight: 10 }} />
                                <Text style={[s.rowLabel, { color: textColor }]}>Overtime</Text>
                            </View>
                            <View style={s.rowRight}>
                                <Text style={[s.rowValue, { color: hasContract ? (matchedPolicy?.overtime_eligible !== false ? '#34C759' : subtextColor) : subtextColor }]}>
                                    {hasContract
                                        ? (matchedPolicy?.overtime_eligible !== false ? 'Eligible' : 'Not Eligible')
                                        : '—'}
                                </Text>
                            </View>
                        </View>
                        <View style={[s.separator, { backgroundColor: borderColor }]} />

                        <View style={s.formRow}>
                            <View style={s.rowLeft}>
                                <PlatformIcon name="gift.fill" size={16} tintColor={subtextColor} style={{ marginRight: 10 }} />
                                <Text style={[s.rowLabel, { color: textColor }]}>Benefit and Allowance</Text>
                            </View>
                            <View style={s.rowRight}>
                                <Text style={[s.rowValue, { color: hasContract ? (matchedPolicy?.benefits_eligible !== false ? '#34C759' : subtextColor) : subtextColor }]}>
                                    {hasContract
                                        ? (matchedPolicy?.benefits_eligible !== false ? 'Eligible' : 'Not Eligible')
                                        : '—'}
                                </Text>
                            </View>
                        </View>
                        <View style={[s.separator, { backgroundColor: borderColor }]} />

                        <View style={[s.formRow, { alignItems: 'flex-start', paddingVertical: 10 }]}>
                            <View style={[s.rowLeft, { marginTop: 2 }]}>
                                <PlatformIcon name="calendar.badge.clock" size={16} tintColor={subtextColor} style={{ marginRight: 10 }} />
                                <Text style={[s.rowLabel, { color: textColor }]}>Leave</Text>
                            </View>
                            <View style={{ alignItems: 'flex-end', flex: 1, justifyContent: 'center' }}>
                                <Text style={[s.rowValue, { color: hasContract && matchedPolicy?.leave_eligible !== false ? textColor : subtextColor }]}>
                                    {hasContract
                                        ? (leavePolicyInfo?.summary || '12 Days / Year Standard')
                                        : '—'}
                                </Text>
                                {hasContract && leavePolicyInfo?.detail ? (
                                    <Text style={{ fontSize: 11, color: subtextColor, marginTop: 3, textAlign: 'right' }}>
                                        {leavePolicyInfo.detail}
                                    </Text>
                                ) : null}
                            </View>
                        </View>
                    </GlassView>
                </View>

                {/* HISTORY */}
                <View style={s.section}>
                    {renderHeader('History')}
                    <GlassView intensity={intensity} style={[s.card, { backgroundColor: bgColor }]}>
                        {Array.isArray((profile as any)?.employment_history) && (profile as any).employment_history.length > 0 ? (
                            (profile as any).employment_history.map((hist: any, hIdx: number) => (
                                <View key={hist.id || hIdx}>
                                    <View style={s.formRow}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[s.rowLabel, { color: textColor, fontWeight: '600' }]}>{hist.position}</Text>
                                            <Text style={{ fontSize: 12, color: subtextColor, marginTop: 2 }}>{hist.department} • {hist.level} • {hist.date}</Text>
                                            {hist.note ? <Text style={{ fontSize: 12, color: subtextColor, fontStyle: 'italic', marginTop: 2 }}>{hist.note}</Text> : null}
                                        </View>
                                    </View>
                                    {hIdx < (profile as any).employment_history.length - 1 && <View style={[s.separator, { backgroundColor: borderColor }]} />}
                                </View>
                            ))
                        ) : (
                            <View style={s.emptyStateBlock}>
                                <View style={[s.emptyLine, { backgroundColor: borderColor }]} />
                                <Text style={[s.emptyStateText, { color: subtextColor }]}>No history recorded yet.</Text>
                            </View>
                        )}
                    </GlassView>
                </View>

            </View>
        </ScrollView>
    );
}

const s = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: 20, gap: 24, paddingBottom: 100 },

    section: { gap: 8 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 4 },
    sectionTitle: { fontSize: 13, fontWeight: '500', letterSpacing: 0.3 },
    editButton: { paddingVertical: 4, paddingHorizontal: 8 },
    editText: { fontSize: 15, color: '#007AFF', fontWeight: '600' },
    editButtonGlass: { paddingVertical: 1, paddingHorizontal: 6, borderRadius: 8, borderWidth: 0.5, justifyContent: 'center', alignItems: 'center' },
    editTextGlass: { fontSize: 10, fontWeight: '600' },

    card: { borderRadius: 24, overflow: 'hidden' },

    // SwiftUI Form Table Row
    formRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    separator: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 42,
    },
    rowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flexShrink: 0,
    },
    rowRight: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        flex: 1,
        marginLeft: 12,
    },
    rowLabel: {
        fontSize: 16,
        fontWeight: '400',
    },
    rowValue: {
        fontSize: 16,
        fontWeight: '400',
        textAlign: 'right',
        flexShrink: 1,
    },

    specialBlock: { margin: 16, padding: 16, borderRadius: 24 },
    idRow: { marginBottom: 8 },
    detailLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
    bigValue: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5, marginTop: 4 },
    microSubtitle: { fontSize: 11, marginTop: 4 },
    monospaceValue: {
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: 0.5,
    },

    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    statusBadgeText: { color: '#34C759', fontSize: 12, fontWeight: '700' },

    scheduleBox: { padding: 16, borderTopWidth: 0 },
    scheduleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 4 },
    schedDay: { fontSize: 14, fontWeight: '600', width: 60 },
    schedTime: { fontSize: 14 },

    emptyStateBlock: { padding: 24, flexDirection: 'row', alignItems: 'center', gap: 12 },
    emptyLine: { width: 4, height: 24, borderRadius: 2 },
    emptyStateText: { fontSize: 14, fontStyle: 'italic' }
});
