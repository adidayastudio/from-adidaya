import React from 'react';
import {
    View,
    Text,
    StyleSheet,
} from 'react-native';
import { GlassView } from '@/components/ui/GlassView';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { MemberProfileData } from '../types';

// Role-specific access definitions
const ROLE_ACCESS: Record<string, {
    label: string;
    badgeColor: string;
    summary: string;
    permissions: string[];
    authority: string[];
}> = {
    member: {
        label: 'Member',
        badgeColor: '#10B981',
        summary: 'The "Member" role has access to personal data only — their own profile, timesheet, and requests. They cannot view other employees\' data, financial summaries, or management dashboards.',
        permissions: ['View Own Profile', 'Submit Requests', 'View Own Timesheet', 'View Own Clock'],
        authority: [],
    },
    staff: {
        label: 'Member',
        badgeColor: '#10B981',
        summary: 'The "Member" role has access to personal data only — their own profile, timesheet, and requests. They cannot view other employees\' data, financial summaries, or management dashboards.',
        permissions: ['View Own Profile', 'Submit Requests', 'View Own Timesheet', 'View Own Clock'],
        authority: [],
    },
    viewer: {
        label: 'Viewer',
        badgeColor: '#F59E0B',
        summary: 'The "Viewer" role has read-only access to view basic company directory and resources.',
        permissions: ['View Directory', 'View Resources'],
        authority: [],
    },
    system: {
        label: 'System',
        badgeColor: '#64748B',
        summary: 'System account with automated background execution permissions.',
        permissions: ['All Permissions', 'System Level', 'Full Data Access', 'All Modules'],
        authority: ['All Actions', 'Role Assignment', 'System Config', 'Overrides'],
    },
    supervisor: {
        label: 'Supervisor',
        badgeColor: '#AF52DE',
        summary: 'The "Supervisor" role can view restricted operational data (KPI sums) across their team. They may manage employee profiles, view KPI summary scores, and approve leave, overtime, and expense claims.',
        permissions: ['View Directory', 'Manage Profiles', 'See KPI Scores', 'Drill Down Perf'],
        authority: ['Leave Requests', 'Overtime Hours', 'Expense Claims', 'Work Schedule'],
    },
    manager: {
        label: 'Manager',
        badgeColor: '#FF9500',
        summary: 'The "Manager" role has broad operational authority — full team visibility, approval rights for finance requests, resource management, and access to people analytics and performance dashboards.',
        permissions: ['Full Team Visibility', 'People Analytics', 'Finance Dashboard', 'Resource Management'],
        authority: ['Leave & Overtime', 'Expense Claims', 'Reimbursements', 'Purchasing'],
    },
    hr: {
        label: 'HR',
        badgeColor: '#30D158',
        summary: 'The "HR" role manages all employee records, onboarding, contracts, and leave policies. They have access to the full people directory and can update employment data.',
        permissions: ['Full Directory Access', 'Edit Profiles', 'Manage Policies', 'View Contracts'],
        authority: ['Leave Policies', 'Employment Type', 'Contract Details', 'Onboarding'],
    },
    admin: {
        label: 'Admin',
        badgeColor: '#3B82F6',
        summary: 'The "Admin" role has system-level access including user management, role assignments, and system configuration. They can manage all data across all modules.',
        permissions: ['System Settings', 'User Management', 'All Modules', 'Data Export'],
        authority: ['Role Assignment', 'System Config', 'All Requests', 'Data Management'],
    },
    superadmin: {
        label: 'Super Admin',
        badgeColor: '#EF4444',
        summary: 'The "Super Admin" has unrestricted access to all features, data, and configurations across the entire system.',
        permissions: ['All Permissions', 'System Level', 'Full Data Access', 'All Modules'],
        authority: ['All Actions', 'Role Assignment', 'System Config', 'Overrides'],
    },
    administrator: {
        label: 'Administrator',
        badgeColor: '#007AFF',
        summary: 'The "Administrator" role has full administrative access to manage system settings, users, and all operational modules.',
        permissions: ['System Settings', 'User Management', 'All Modules', 'Data Export'],
        authority: ['Role Assignment', 'System Config', 'All Requests', 'Data Management'],
    },
    pm: {
        label: 'Project Manager',
        badgeColor: '#FF9F0A',
        summary: 'The "Project Manager" role focuses on project execution — managing tasks, resources, timelines, and budgets for assigned projects.',
        permissions: ['Project Dashboard', 'Resource Access', 'Finance Overview', 'Team Schedule'],
        authority: ['Task Assignments', 'Resource Booking', 'Budget Approval', 'Timeline Changes'],
    },
    management: {
        label: 'Management',
        badgeColor: '#5E5CE6',
        summary: 'The "Management" role has strategic-level visibility into company operations, KPIs, and financial performance across all departments.',
        permissions: ['Strategic Dashboard', 'All KPIs', 'Finance Reports', 'People Analytics'],
        authority: ['Policy Decisions', 'Budget Approval', 'Hiring Decisions', 'System Overrides'],
    },
    ceo: {
        label: 'CEO',
        badgeColor: '#FFD60A',
        summary: 'The "CEO" role has the highest authority — full visibility into all company operations, finances, people, and strategic data.',
        permissions: ['Full Access', 'All Dashboards', 'Strategic Reports', 'All Modules'],
        authority: ['All Actions', 'Final Approval', 'Policy Override', 'System Config'],
    },
    owner: {
        label: 'Owner',
        badgeColor: '#FFD60A',
        summary: 'The "Owner" has absolute access to all system features, data, and configurations with no restrictions.',
        permissions: ['Unrestricted Access', 'All Modules', 'System Level', 'Full Data'],
        authority: ['All Actions', 'Override Any', 'Role Assignment', 'System Config'],
    },
    finance: {
        label: 'Finance',
        badgeColor: '#34C759',
        summary: 'The "Finance" role manages financial operations — purchasing consolidation, payment processing, budget tracking, and financial reporting. They have team-level visibility into finance requests and approval authority.',
        permissions: ['Finance Dashboard', 'Team Finance View', 'Consolidation Access', 'Payment Processing'],
        authority: ['Approve Requests', 'Consolidate Purchases', 'Process Payments', 'Finance Reports'],
    },
};

interface MemberAccessTabProps {
    profile: MemberProfileData | any;
    textColor: string;
    subtextColor: string;
    borderColor: string;
    bgColor: string;
    intensity: number;
    sectionTitleColor: string;
}

export const MemberAccessTab: React.FC<MemberAccessTabProps> = ({
    profile,
    textColor,
    subtextColor,
    borderColor,
    bgColor,
    intensity,
    sectionTitleColor,
}) => {
    const roleKey = (profile?.role || 'member').toLowerCase().trim();
    const roleData = ROLE_ACCESS[roleKey] || ROLE_ACCESS['member'];
    const badgeColor = roleData.badgeColor;

    return (
        <View style={{ gap: 20 }}>
            {/* SYSTEM ROLE */}
            <View style={s.section}>
                <View style={s.sectionHeader}>
                    <Text style={[s.sectionTitle, { color: sectionTitleColor }]}>System Role</Text>
                </View>

                <GlassView intensity={intensity} style={[s.card, { backgroundColor: bgColor, borderColor, borderWidth: 1 }]}>
                    <View style={s.formRow}>
                        <View style={s.rowLeft}>
                            <PlatformIcon name="person" size={16} tintColor={subtextColor} style={{ marginRight: 10 }} />
                            <Text style={[s.rowLabel, { color: textColor }]}>Assignment</Text>
                        </View>
                        <View style={[s.roleBadge, { backgroundColor: `${badgeColor}22` }]}>
                            <Text style={[s.roleBadgeText, { color: badgeColor }]}>{roleData.label}</Text>
                        </View>
                    </View>
                </GlassView>
                <Text style={[s.sectionFooter, { color: subtextColor }]}>
                    System role defines data visibility and authority level across modules.
                </Text>
            </View>

            {/* EXECUTIVE SUMMARY */}
            <View style={s.section}>
                <View style={s.sectionHeader}>
                    <Text style={[s.sectionTitle, { color: sectionTitleColor }]}>Access Overview</Text>
                </View>
                <GlassView intensity={intensity} style={[s.card, { backgroundColor: bgColor, borderColor, borderWidth: 1 }]}>
                    <View style={s.summaryTextBlock}>
                        <Text style={[s.summaryBody, { color: textColor }]}>
                            {roleData.summary}
                        </Text>
                    </View>
                </GlassView>
            </View>

            {/* PERMISSIONS */}
            <View style={s.section}>
                <View style={s.sectionHeader}>
                    <Text style={[s.sectionTitle, { color: sectionTitleColor }]}>Permissions</Text>
                </View>
                <GlassView intensity={intensity} style={[s.card, { backgroundColor: bgColor, borderColor, borderWidth: 1 }]}>
                    {roleData.permissions.map((item, idx) => (
                        <View key={idx}>
                            {idx > 0 && <View style={[s.separator, { backgroundColor: borderColor }]} />}
                            <View style={s.formRow}>
                                <View style={s.rowLeft}>
                                    <PlatformIcon name="checkmark.circle" size={16} tintColor="#007AFF" style={{ marginRight: 10 }} />
                                    <Text style={[s.rowLabel, { color: textColor }]}>{item}</Text>
                                </View>
                            </View>
                        </View>
                    ))}
                </GlassView>
            </View>

            {/* AUTHORITY */}
            <View style={s.section}>
                <View style={s.sectionHeader}>
                    <Text style={[s.sectionTitle, { color: sectionTitleColor }]}>Authority</Text>
                </View>
                <GlassView intensity={intensity} style={[s.card, { backgroundColor: bgColor, borderColor, borderWidth: 1 }]}>
                    {roleData.authority.length > 0 ? roleData.authority.map((item, idx) => (
                        <View key={idx}>
                            {idx > 0 && <View style={[s.separator, { backgroundColor: borderColor }]} />}
                            <View style={s.formRow}>
                                <View style={s.rowLeft}>
                                    <PlatformIcon name="arrow.right.circle" size={16} tintColor="#34C759" style={{ marginRight: 10 }} />
                                    <Text style={[s.rowLabel, { color: textColor }]}>{item}</Text>
                                </View>
                            </View>
                        </View>
                    )) : (
                        <View style={s.formRow}>
                            <Text style={[s.rowLabel, { color: subtextColor, fontStyle: 'italic' }]}>No approval authority</Text>
                        </View>
                    )}
                </GlassView>
            </View>
        </View>
    );
};

const s = StyleSheet.create({
    section: { gap: 8 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 2 },
    sectionTitle: { fontSize: 13, fontWeight: '500', letterSpacing: 0.3 },
    sectionFooter: { fontSize: 12, lineHeight: 16, paddingHorizontal: 16, marginTop: 2 },

    card: { borderRadius: 24, overflow: 'hidden' },

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
    },
    rowLabel: {
        fontSize: 15,
        fontWeight: '400',
    },

    roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    roleBadgeText: { fontSize: 13, fontWeight: '600' },

    summaryTextBlock: { padding: 16 },
    summaryBody: { fontSize: 14, lineHeight: 22 },
});
