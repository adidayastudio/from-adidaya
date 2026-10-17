import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    ActivityIndicator,
    Alert,
    Platform,
    ActionSheetIOS,
    Modal,
    KeyboardAvoidingView,
    RefreshControl,
    LayoutAnimation,
    StatusBar as RNStatusBar,
    Image,
    Share,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    interpolateColor,
} from 'react-native-reanimated';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { HeaderBlurBackground } from '@/components/ui/HeaderBlurBackground';
import { GlassView } from '@/components/ui/GlassView';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { HeaderToolbar } from '@/components/ui/HeaderToolbar';
import { BouncyGlassButton } from '@/components/ui/BouncyGlassButton';
import { SegmentedControl, Segment } from '@/components/ui/SegmentedControl';
import { SwiftUISetupItemSheet } from '@/components/people/setup/SwiftUISetupItemSheet';
import { Host, Button as SwiftUIButton } from '@/lib/swiftui';
import ContextMenu, { ContextMenuAction } from '@/components/ui/PlatformContextMenu';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useUserContext } from '@/context/UserProvider';
import { WorkSchedulePresetModal } from '@/components/clock/setup/WorkSchedulePresetModal';
import { WorkSchedulePreset, WORK_SCHEDULE_PRESETS } from '@/lib/data/workSchedulePresets';
import { LeavePolicyPresetModal, LeavePolicyPresetItem } from '@/components/clock/setup/LeavePolicyPresetModal';
import {
    AuditLogDetailSheet,
    AuditLogItem,
    getAuditCategoryColor,
    getAuditCategoryShortLabel,
} from '@/components/clock/setup/AuditLogDetailSheet';
import {
    LeavePolicy,
    LEAVE_POLICY_PRESETS,
    fetchLeavePolicies,
    saveLeavePolicy,
    duplicateLeavePolicy,
    toggleLeavePolicyStatus,
    deleteLeavePolicy,
    normalizeLeavePolicy,
} from '@/lib/api/leavePolicies';

export type SetupModuleId =
    | 'departments'
    | 'positions'
    | 'levels'
    | 'contract_types'
    | 'work_statuses'
    | 'work_schedules'
    | 'employment_policies'
    | 'leave_policies'
    | 'audit_logs';

interface ModuleConfig {
    id: SetupModuleId;
    group: 'org' | 'employment' | 'system';
    title: string;
    singularTitle: string;
    subtitle: string;
    icon: string;
    color: string;
}

const MODULE_CONFIGS: Record<SetupModuleId, ModuleConfig> = {
    departments: {
        id: 'departments',
        group: 'org',
        title: 'Departments',
        singularTitle: 'Department',
        subtitle: 'Teams, divisions & codes',
        icon: 'square.grid.2x2.fill',
        color: '#007AFF',
    },
    positions: {
        id: 'positions',
        group: 'org',
        title: 'Positions',
        singularTitle: 'Position',
        subtitle: 'Titles, roles & reports',
        icon: 'person.2.fill',
        color: '#30B0C7',
    },
    levels: {
        id: 'levels',
        group: 'org',
        title: 'Levels',
        singularTitle: 'Level',
        subtitle: 'Grades, ranks & levels',
        icon: 'square.stack.3d.up.fill',
        color: '#30B0C7',
    },
    contract_types: {
        id: 'contract_types',
        group: 'employment',
        title: 'Contract Types',
        singularTitle: 'Contract Type',
        subtitle: 'Full-time, contract & intern',
        icon: 'briefcase.fill',
        color: '#34C759',
    },
    work_statuses: {
        id: 'work_statuses',
        group: 'employment',
        title: 'Work Statuses',
        singularTitle: 'Work Status',
        subtitle: 'Active, probation & inactive',
        icon: 'person.crop.circle.badge.checkmark',
        color: '#34C759',
    },
    work_schedules: {
        id: 'work_schedules',
        group: 'employment',
        title: 'Work Schedules',
        singularTitle: 'Work Schedule',
        subtitle: 'Hours, shifts & workdays',
        icon: 'clock.fill',
        color: '#FF9500',
    },
    employment_policies: {
        id: 'employment_policies',
        group: 'employment',
        title: 'Employment Policies',
        singularTitle: 'Employment Policy',
        subtitle: 'Rules, SOP & compliance',
        icon: 'shield.lefthalf.filled',
        color: '#34C759',
    },
    leave_policies: {
        id: 'leave_policies',
        group: 'employment',
        title: 'Leave Policies',
        singularTitle: 'Leave Policy',
        subtitle: 'Leave types & entitlements',
        icon: 'calendar.badge.clock',
        color: '#FF3B30',
    },
    audit_logs: {
        id: 'audit_logs',
        group: 'system',
        title: 'Audit Logs',
        singularTitle: 'Audit Log',
        subtitle: 'Change history & event trail',
        icon: 'clock.arrow.circlepath',
        color: '#AF52DE',
    },
};

const ORG_SEGMENTS: Segment[] = [
    { id: 'departments', label: 'Departments', icon: 'square.grid.2x2.fill' },
    { id: 'positions', label: 'Positions', icon: 'person.2.fill' },
    { id: 'levels', label: 'Levels', icon: 'square.stack.3d.up.fill' },
];

const EMPLOYMENT_SEGMENTS: Segment[] = [
    { id: 'contract_types', label: 'Contracts', icon: 'briefcase.fill' },
    { id: 'work_statuses', label: 'Status', icon: 'person.crop.circle.badge.checkmark' },
    { id: 'work_schedules', label: 'Schedules', icon: 'clock.fill' },
    { id: 'employment_policies', label: 'Policies', icon: 'shield.lefthalf.filled' },
    { id: 'leave_policies', label: 'Leave', icon: 'calendar.badge.clock' },
];

export default function PeopleSetupDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const insets = useSafeAreaInsets();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';
    const borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)';
    const intensity = isDark ? 10 : 25;

    const { profile } = useUserContext();

    const [activeModule, setActiveModule] = useState<SetupModuleId>(
        (id as SetupModuleId) || 'departments'
    );
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [positionSortMode, setPositionSortMode] = useState<'dept' | 'name' | 'number'>('dept');
    const [collapsedDeptIds, setCollapsedDeptIds] = useState<Record<string, boolean>>({});
    const [sortHighlight, setSortHighlight] = useState(false);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Audit Logs State (People Setup)
    const [selectedAuditCategory, setSelectedAuditCategory] = useState<
        | 'All'
        | 'Setup'
        | 'Employment'
        | 'Profile'
        | 'Lifecycle'
        | 'Performance'
    >('All');
    const [auditTimeFilter, setAuditTimeFilter] = useState<
        'all' | 'today' | 'last_7_days' | 'last_30_days' | 'this_month'
    >('all');
    const [auditSearchQuery, setAuditSearchQuery] = useState('');
    const [selectedAuditItem, setSelectedAuditItem] = useState<AuditLogItem | null>(null);
    const [auditDetailVisible, setAuditDetailVisible] = useState(false);

    // Data lists
    const [departments, setDepartments] = useState<any[]>([]);
    const [positions, setPositions] = useState<any[]>([]);
    const [levels, setLevels] = useState<any[]>([]);
    const [contractTypes, setContractTypes] = useState<any[]>([]);
    const [workStatuses, setWorkStatuses] = useState<any[]>([]);
    const [workSchedules, setWorkSchedules] = useState<any[]>([]);
    const [employmentPolicies, setEmploymentPolicies] = useState<any[]>([]);
    const [leavePolicies, setLeavePolicies] = useState<LeavePolicy[]>([]);

    // Native SwiftUI Bottom Sheet state
    const [sheetVisible, setSheetVisible] = useState(false);
    const [editingItem, setEditingItem] = useState<any | null>(null);
    const [saving, setSaving] = useState(false);
    const [presetModalVisible, setPresetModalVisible] = useState(false);
    const [leavePresetModalVisible, setLeavePresetModalVisible] = useState(false);
    const [customSheetTitle, setCustomSheetTitle] = useState<string | undefined>(undefined);
    const [customSheetSubmitLabel, setCustomSheetSubmitLabel] = useState<string | undefined>(undefined);

    // Export Audit Logs Handler
    const handleExportAuditLogs = useCallback(
        async (format: 'csv' | 'json' | 'summary') => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            const orgPrefix = (profile?.id_code || 'JCP')
                .replace(/[^A-Za-z0-9]/g, '')
                .slice(0, 3)
                .toUpperCase() || 'JCP';

            const baseLogs: Array<AuditLogItem & { dateKey: 'today' | 'last_7_days' | 'last_30_days' | 'this_month' }> = [];

            const filtered = baseLogs.filter((item) => {
                if (selectedAuditCategory !== 'All' && item.category !== selectedAuditCategory) return false;
                if (auditTimeFilter === 'today' && item.dateKey !== 'today') return false;
                if (auditSearchQuery.trim()) {
                    const q = auditSearchQuery.toLowerCase().trim();
                    return (
                        item.actor.toLowerCase().includes(q) ||
                        item.action.toLowerCase().includes(q) ||
                        item.detail.toLowerCase().includes(q) ||
                        item.category.toLowerCase().includes(q) ||
                        item.id.toLowerCase().includes(q)
                    );
                }
                return true;
            });

            if (format === 'json') {
                const jsonContent = JSON.stringify(filtered, null, 2);
                await Share.share({
                    message: jsonContent,
                    title: `People_Audit_Logs_${new Date().toISOString().slice(0, 10)}.json`,
                });
            } else if (format === 'csv') {
                const header = 'Record ID,Timestamp,Actor,Role,Action,Category,Detail\n';
                const rows = filtered
                    .map(
                        (i) =>
                            `"${i.id}","${i.time}","${i.actor}","${i.actorRole || ''}","${i.action}","${i.category}","${i.detail.replace(/"/g, '""')}"`
                    )
                    .join('\n');
                await Share.share({
                    message: header + rows,
                    title: `People_Audit_Logs_${new Date().toISOString().slice(0, 10)}.csv`,
                });
            } else {
                const summary = `--- PEOPLE AUDIT TRAIL SUMMARY ---\nTotal Records: ${filtered.length}\nExport Date: ${new Date().toLocaleString()}\nFilter Type: ${selectedAuditCategory}\nFilter Time: ${auditTimeFilter}\n\n` +
                    filtered.map((i) => `[${i.id}] ${i.time} | ${i.actor} (${i.category}): ${i.action} -> ${i.detail}`).join('\n');
                await Share.share({
                    message: summary,
                    title: `People_Audit_Summary_${new Date().toISOString().slice(0, 10)}.txt`,
                });
            }
        },
        [profile, selectedAuditCategory, auditTimeFilter, auditSearchQuery]
    );

    // Preset Leave Policy Handlers
    const handleSelectLeavePresetTemplate = (preset: LeavePolicyPresetItem) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const presetTemplateData = {
            ...preset.policy,
            name: preset.name,
            leave_type: preset.leave_type,
            status: 'Active',
            description: preset.description,
        };
        setEditingItem(presetTemplateData);
        setCustomSheetTitle('Preset Leave Policy');
        setCustomSheetSubmitLabel('Apply Policy');
        setSheetVisible(true);
    };

    const handleSelectWorkSchedulePresetTemplate = (preset: WorkSchedulePreset) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const presetTemplateData = {
            name: preset.name,
            type: preset.type === 'Custom' ? 'Fixed' : preset.type,
            start_time: preset.start_time,
            end_time: preset.end_time,
            break_duration_minutes: preset.break_duration_minutes,
            days_config: preset.days_config,
            status: 'Active',
            timezone: 'Asia/Jakarta',
        };
        setEditingItem(presetTemplateData);
        setCustomSheetTitle('Preset Work Schedule');
        setCustomSheetSubmitLabel('Apply Schedule');
        setSheetVisible(true);
    };

    const handleApplyLeavePreset = async (preset: LeavePolicyPresetItem) => {
        try {
            const newRecord: LeavePolicy = {
                ...preset.policy,
                id: `policy-${preset.leave_type}-${Date.now()}`,
                name: preset.name,
                created_at: new Date().toISOString(),
            } as LeavePolicy;

            await saveLeavePolicy(newRecord);
            await fetchData();
            Alert.alert('Preset Applied', `"${preset.name}" has been added to Leave Policies.`);
        } catch (e: any) {
            console.error('[PeopleSetup] Error applying leave preset:', e);
            Alert.alert('Error', e.message || 'Failed to apply preset');
        }
    };

    // Preset Work Schedule Template Selection -> Hydrate SwiftUI Sheet
    const handleSelectPresetTemplate = (preset: WorkSchedulePreset) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const presetTemplateData = {
            name: preset.name,
            type: preset.type === 'Custom' ? 'Fixed' : preset.type,
            start_time: preset.start_time,
            end_time: preset.end_time,
            break_duration_minutes: preset.break_duration_minutes,
            days_config: preset.days_config,
            status: 'Active',
            timezone: 'Asia/Jakarta',
        };
        setEditingItem(presetTemplateData);
        setCustomSheetTitle('Preset Work Schedule');
        setCustomSheetSubmitLabel('Apply Schedule');
        setSheetVisible(true);
    };

    // Apply Preset Schedule Direct Handler
    const handleApplyPreset = async (preset: WorkSchedulePreset) => {
        try {
            const newRecord = {
                name: preset.name,
                type: preset.type === 'Custom' ? 'Fixed' : preset.type,
                start_time: preset.start_time,
                end_time: preset.end_time,
                break_duration_minutes: preset.break_duration_minutes,
                days_config: preset.days_config,
                status: 'Active',
            };

            const { data, error } = await supabase
                .from('work_schedules')
                .insert([newRecord])
                .select()
                .single();

            if (error) {
                console.error('[PeopleSetup] Error inserting preset:', error);
                Alert.alert('Error', error.message || 'Failed to apply preset');
                return;
            }

            if (data) {
                setWorkSchedules((prev) => [data, ...prev]);
            } else {
                fetchData();
            }
            Alert.alert('Preset Applied', `"${preset.name}" has been added to Work Schedules.`);
        } catch (e: any) {
            console.error('[PeopleSetup] Error applying preset:', e);
            Alert.alert('Error', e.message || 'Failed to apply preset');
        }
    };

    useEffect(() => {
        if (id && (id in MODULE_CONFIGS)) {
            setActiveModule(id as SetupModuleId);
            setSearchQuery('');
        }
    }, [id]);

    const currentConfig = MODULE_CONFIGS[activeModule] || MODULE_CONFIGS.departments;
    const isOrg = currentConfig.group === 'org';
    const currentSegments = isOrg ? ORG_SEGMENTS : EMPLOYMENT_SEGMENTS;

    // Fetch live data from Supabase
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [
                { data: depts },
                { data: pos },
                { data: lvls },
                { data: contracts },
                { data: wrkStat },
                { data: schedules },
                { data: empPol },
                leavePol,
            ] = await Promise.all([
                supabase.from('organization_departments').select('*').order('order_index', { ascending: true }),
                supabase.from('organization_positions').select('*, organization_departments(id, name, code, cluster_code)'),
                supabase.from('organization_levels').select('*').order('level_code', { ascending: true }),
                supabase.from('employment_types').select('*').order('order_index', { ascending: true }),
                supabase.from('work_status').select('*').order('order_index', { ascending: true }),
                supabase.from('work_schedules').select('*').order('created_at', { ascending: true }),
                supabase.from('employment_policies').select('*'),
                fetchLeavePolicies(),
            ]);

            if (depts) {
                const normalizedDepts = depts.map((d: any) => {
                    const rawCode = String(d.code || '');
                    const extractedCluster = d.cluster_code !== null && d.cluster_code !== undefined
                        ? parseInt(String(d.cluster_code), 10)
                        : (rawCode.includes('-') ? parseInt(rawCode.split('-')[0], 10) || 1 : 1);
                    const cleanCode = (rawCode.includes('-') ? rawCode.split('-')[1] : rawCode)
                        .replace(/[^A-Za-z]/g, '')
                        .slice(0, 3)
                        .toUpperCase();
                    return {
                        ...d,
                        cluster_code: extractedCluster,
                        code: cleanCode,
                    };
                });
                setDepartments(normalizedDepts);
            }
            if (pos) {
                const normalizedPos = pos.map((p: any) => {
                    const d = p.organization_departments;
                    if (d) {
                        const rawCode = String(d.code || '');
                        const extractedCluster = d.cluster_code !== null && d.cluster_code !== undefined
                            ? parseInt(String(d.cluster_code), 10)
                            : (rawCode.includes('-') ? parseInt(rawCode.split('-')[0], 10) || 1 : 1);
                        const cleanCode = (rawCode.includes('-') ? rawCode.split('-')[1] : rawCode)
                            .replace(/[^A-Za-z]/g, '')
                            .slice(0, 3)
                            .toUpperCase();
                        return {
                            ...p,
                            organization_departments: {
                                ...d,
                                cluster_code: extractedCluster,
                                code: cleanCode,
                            },
                        };
                    }
                    return p;
                });
                setPositions(normalizedPos);
            }
            if (lvls) setLevels(lvls);
            if (contracts) setContractTypes(contracts);
            if (wrkStat) setWorkStatuses(wrkStat);
            if (schedules) setWorkSchedules(schedules);
            if (empPol) setEmploymentPolicies(empPol);
            if (leavePol) setLeavePolicies(leavePol);
        } catch (err) {
            console.error('Error loading setup detail data:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    // Open Add Modal
    const handleOpenAdd = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setCustomSheetTitle(undefined);
        setCustomSheetSubmitLabel(undefined);
        setEditingItem(null);
        setSheetVisible(true);
    };

    // Open Edit Modal
    const handleOpenEdit = (item: any) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setCustomSheetTitle(undefined);
        setCustomSheetSubmitLabel(undefined);
        setEditingItem(item);
        setSheetVisible(true);
    };

    // Save record to DB via SwiftUISetupItemSheet
    const handleSave = async (payload: any) => {
        try {
            setSaving(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            let table = '';
            if (activeModule === 'departments') table = 'organization_departments';
            else if (activeModule === 'positions') table = 'organization_positions';
            else if (activeModule === 'levels') table = 'organization_levels';
            else if (activeModule === 'contract_types') table = 'employment_types';
            else if (activeModule === 'work_statuses') table = 'work_status';
            else if (activeModule === 'work_schedules') table = 'work_schedules';
            else if (activeModule === 'employment_policies') table = 'employment_policies';
            else if (activeModule === 'leave_policies') table = 'leave_policies';

            if (table) {
                if (activeModule === 'contract_types' && payload.is_default) {
                    await supabase.from('employment_types').update({ is_default: false }).neq('id', editingItem?.id || '');
                }

                const itemPayload = {
                    ...payload,
                    updated_at: new Date().toISOString(),
                };

                if (activeModule === 'leave_policies') {
                    await saveLeavePolicy({
                        ...payload,
                        id: editingItem?.id || `policy-${Date.now()}`,
                        created_at: editingItem?.created_at || new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    });
                } else if (activeModule === 'employment_policies') {
                    const existingPolicy = employmentPolicies.find(
                        (p) => p.employment_type_id === payload.employment_type_id || (editingItem?.id && p.id === editingItem.id)
                    );
                    if (existingPolicy?.id) {
                        const { error } = await supabase.from(table).update(itemPayload).eq('id', existingPolicy.id);
                        if (error) throw error;
                    } else {
                        const { error } = await supabase.from(table).insert([itemPayload]);
                        if (error) throw error;
                    }
                } else if (editingItem && editingItem.id && !String(editingItem.id).startsWith('policy-')) {
                    const { error } = await supabase.from(table).update(itemPayload).eq('id', editingItem.id);
                    if (error) throw error;
                    if (activeModule === 'departments') {
                        try {
                            const numVal = parseInt(String(payload.cluster_code ?? 1), 10) || 1;
                            const codeNum = String(numVal).padStart(3, '0');
                            const codeTag = (payload.code || payload.name || 'dep').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                            const channelCode = `#${codeNum}-${codeTag}`.toLowerCase();
                            await supabase.from('chat_channels').upsert([{
                                id: `dept-${editingItem.id}`,
                                name: payload.name || 'Department',
                                code: channelCode,
                                description: payload.description || 'Department discussions and announcements.',
                                category: 'department',
                                department_id: editingItem.id,
                                is_archived: false,
                                updated_at: new Date().toISOString(),
                            }], { onConflict: 'id' });
                        } catch (_) {}
                    }
                } else {
                    const { data: insertedData, error } = await supabase.from(table).insert([itemPayload]).select();
                    if (error) throw error;
                    if (activeModule === 'departments' && insertedData && insertedData[0]?.id) {
                        try {
                            const dId = insertedData[0].id;
                            const numVal = parseInt(String(payload.cluster_code ?? 1), 10) || 1;
                            const codeNum = String(numVal).padStart(3, '0');
                            const codeTag = (payload.code || payload.name || 'dep').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                            const channelCode = `#${codeNum}-${codeTag}`.toLowerCase();
                            await supabase.from('chat_channels').upsert([{
                                id: `dept-${dId}`,
                                name: payload.name || 'Department',
                                code: channelCode,
                                description: payload.description || 'Department discussions and announcements.',
                                category: 'department',
                                department_id: dId,
                                is_archived: false,
                                created_at: new Date().toISOString(),
                                updated_at: new Date().toISOString(),
                            }], { onConflict: 'id' });
                        } catch (_) {}
                    }
                }
            }

            setSheetVisible(false);
            setEditingItem(null);
            await fetchData();
            Alert.alert('Saved', 'Record successfully saved.');
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to save record.');
        } finally {
            setSaving(false);
        }
    };

    // Delete record from DB
    const handleDelete = (item: any) => {
        const itemType = currentConfig.singularTitle || 'Record';
        Alert.alert(`Delete ${itemType}`, `Are you sure you want to delete "${item.name || item.code}"?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                        let table = '';
                        if (activeModule === 'departments') table = 'organization_departments';
                        else if (activeModule === 'positions') table = 'organization_positions';
                        else if (activeModule === 'levels') table = 'organization_levels';
                        else if (activeModule === 'contract_types') table = 'employment_types';
                        else if (activeModule === 'work_statuses') table = 'work_status';
                        else if (activeModule === 'work_schedules') table = 'work_schedules';
                        else if (activeModule === 'employment_policies') table = 'employment_policies';
                        else if (activeModule === 'leave_policies') table = 'leave_policies';

                        if (table) {
                            const { error } = await supabase.from(table).delete().eq('id', item.id);
                            if (error) throw error;
                            await fetchData();
                        }
                    } catch (e: any) {
                        Alert.alert('Error', e.message || 'Failed to delete record.');
                    }
                },
            },
        ]);
    };

    // Long press action menu
    const handleCardLongPress = (item: any) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        if (Platform.OS === 'ios') {
            const itemTypeName = currentConfig.singularTitle || 'Record';

            if (activeModule === 'leave_policies') {
                const isCurrentlyActive = item.status === 'Active';
                ActionSheetIOS.showActionSheetWithOptions(
                    {
                        title: item.name || 'Leave Policy',
                        options: [
                            'Cancel',
                            'Edit Leave Policy',
                            'Duplicate Policy',
                            isCurrentlyActive ? 'Disable Policy' : 'Enable Policy',
                            'Delete Leave Policy',
                        ],
                        destructiveButtonIndex: 4,
                        cancelButtonIndex: 0,
                    },
                    async (buttonIndex) => {
                        if (buttonIndex === 1) {
                            handleOpenEdit(item);
                        } else if (buttonIndex === 2) {
                            try {
                                await duplicateLeavePolicy(item.id);
                                await fetchData();
                                Alert.alert('Duplicated', `Created a copy of "${item.name}".`);
                            } catch (e: any) {
                                Alert.alert('Error', e.message || 'Failed to duplicate policy');
                            }
                        } else if (buttonIndex === 3) {
                            try {
                                await toggleLeavePolicyStatus(item.id, !isCurrentlyActive);
                                await fetchData();
                                Alert.alert(isCurrentlyActive ? 'Policy Disabled' : 'Policy Enabled', `"${item.name}" is now ${isCurrentlyActive ? 'Inactive' : 'Active'}.`);
                            } catch (e: any) {
                                Alert.alert('Error', e.message || 'Failed to update policy status');
                            }
                        } else if (buttonIndex === 4) {
                            handleDelete(item);
                        }
                    }
                );
                return;
            }

            ActionSheetIOS.showActionSheetWithOptions(
                {
                    title: item.name || item.code,
                    options: ['Cancel', `Edit ${itemTypeName}`, `Delete ${itemTypeName}`],
                    destructiveButtonIndex: 2,
                    cancelButtonIndex: 0,
                },
                (buttonIndex) => {
                    if (buttonIndex === 1) {
                        handleOpenEdit(item);
                    } else if (buttonIndex === 2) {
                        handleDelete(item);
                    }
                }
            );
        } else {
            handleDelete(item);
        }
    };

    // Toggle Department Collapse / Expand in Group View
    const handleToggleDeptCollapse = (deptId: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setCollapsedDeptIds((prev) => ({
            ...prev,
            [deptId]: !prev[deptId],
        }));
    };

    // Position Sort / Group Criteria ActionSheet
    const handleOpenPositionSortCriteriaMenu = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    title: 'Position View & Sorting',
                    options: [
                        'Cancel',
                        positionSortMode === 'dept' ? '✓ Group by Department' : 'Group by Department',
                        positionSortMode === 'name' ? '✓ Sort by Name (A-Z)' : 'Sort by Name (A-Z)',
                        positionSortMode === 'number' ? '✓ Sort by Code / Number (1-99)' : 'Sort by Code / Number (1-99)',
                    ],
                    cancelButtonIndex: 0,
                },
                (buttonIndex) => {
                    if (buttonIndex === 1) {
                        setPositionSortMode('dept');
                        Haptics.selectionAsync();
                    } else if (buttonIndex === 2) {
                        setPositionSortMode('name');
                        Haptics.selectionAsync();
                    } else if (buttonIndex === 3) {
                        setPositionSortMode('number');
                        Haptics.selectionAsync();
                    }
                }
            );
        } else {
            setPositionSortMode((prev) => (prev === 'dept' ? 'name' : prev === 'name' ? 'number' : 'dept'));
        }
    };

    // Filtered lists
    const filteredDepartments = useMemo(() => {
        const q = searchQuery.toLowerCase();
        return departments
            .filter(
                (d) => (d.name && d.name.toLowerCase().includes(q)) || (d.code && d.code.toLowerCase().includes(q))
            )
            .sort((a, b) => {
                const clusterA = parseInt(String(a.cluster_code ?? 0), 10);
                const clusterB = parseInt(String(b.cluster_code ?? 0), 10);
                return sortOrder === 'asc' ? clusterA - clusterB : clusterB - clusterA;
            });
    }, [departments, searchQuery, sortOrder]);

    const filteredPositions = useMemo(() => {
        const q = searchQuery.toLowerCase();
        return positions
            .filter(
                (p) =>
                    (p.name && p.name.toLowerCase().includes(q)) ||
                    (p.code && p.code.toLowerCase().includes(q)) ||
                    (p.organization_departments?.name && p.organization_departments.name.toLowerCase().includes(q))
            )
            .sort((a, b) => {
                if (positionSortMode === 'name') {
                    const nameA = a.name || '';
                    const nameB = b.name || '';
                    return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
                } else if (positionSortMode === 'number') {
                    const catA = parseInt(String(a.category_code ?? 0), 10);
                    const catB = parseInt(String(b.category_code ?? 0), 10);
                    if (catA !== catB) {
                        return sortOrder === 'asc' ? catA - catB : catB - catA;
                    }
                    const codeA = a.code || '';
                    const codeB = b.code || '';
                    return sortOrder === 'asc' ? codeA.localeCompare(codeB) : codeB.localeCompare(codeA);
                } else {
                    // Default 'dept' sorting
                    const deptClusterA = parseInt(String(a.organization_departments?.cluster_code ?? 0), 10) || 0;
                    const deptClusterB = parseInt(String(b.organization_departments?.cluster_code ?? 0), 10) || 0;
                    if (deptClusterA !== deptClusterB) {
                        return sortOrder === 'asc' ? deptClusterA - deptClusterB : deptClusterB - deptClusterA;
                    }
                    const catA = parseInt(String(a.category_code ?? 0), 10);
                    const catB = parseInt(String(b.category_code ?? 0), 10);
                    if (catA !== catB) {
                        return sortOrder === 'asc' ? catA - catB : catB - catA;
                    }
                    const nameA = a.name || '';
                    const nameB = b.name || '';
                    return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
                }
            });
    }, [positions, searchQuery, sortOrder, positionSortMode]);

    // Group positions by department when positionSortMode === 'dept'
    const groupedPositions = useMemo(() => {
        if (activeModule !== 'positions' || positionSortMode !== 'dept') return null;
        const groups: { department: any; items: any[] }[] = [];

        const sortedDepts = [...departments].sort((a, b) => {
            const cA = parseInt(String(a.cluster_code ?? 0), 10);
            const cB = parseInt(String(b.cluster_code ?? 0), 10);
            return sortOrder === 'asc' ? cA - cB : cB - cA;
        });

        for (const dept of sortedDepts) {
            const deptPositions = filteredPositions.filter((p) => p.department_id === dept.id);
            if (deptPositions.length > 0) {
                groups.push({
                    department: dept,
                    items: deptPositions,
                });
            }
        }

        // Catch positions without department or deleted dept
        const unassignedPositions = filteredPositions.filter(
            (p) => !p.department_id || !departments.some((d) => d.id === p.department_id)
        );
        if (unassignedPositions.length > 0) {
            groups.push({
                department: { id: 'unassigned', name: 'Other Department', code: 'OTH', cluster_code: 99 },
                items: unassignedPositions,
            });
        }

        return groups;
    }, [activeModule, positionSortMode, departments, filteredPositions, sortOrder]);

    const filteredLevels = useMemo(() => {
        const q = searchQuery.toLowerCase();
        return levels
            .filter(
                (l) =>
                    (l.name && l.name.toLowerCase().includes(q)) ||
                    (l.code && l.code.toLowerCase().includes(q)) ||
                    (l.roman_code && l.roman_code.toLowerCase().includes(q))
            )
            .sort((a, b) => {
                const lvlA = parseInt(String(a.level_code ?? a.order_index ?? 0), 10);
                const lvlB = parseInt(String(b.level_code ?? b.order_index ?? 0), 10);
                return sortOrder === 'asc' ? lvlA - lvlB : lvlB - lvlA;
            });
    }, [levels, searchQuery, sortOrder]);

    const filteredContracts = useMemo(() => {
        const q = searchQuery.toLowerCase();
        return contractTypes
            .filter((c) => c.name && c.name.toLowerCase().includes(q))
            .sort((a, b) => {
                const oA = a.order_index ?? 0;
                const oB = b.order_index ?? 0;
                return sortOrder === 'asc' ? oA - oB : oB - oA;
            });
    }, [contractTypes, searchQuery, sortOrder]);

    const filteredWorkStatuses = useMemo(() => {
        const q = searchQuery.toLowerCase();
        return workStatuses
            .filter((w) => w.name && w.name.toLowerCase().includes(q))
            .sort((a, b) => {
                const oA = a.order_index ?? 0;
                const oB = b.order_index ?? 0;
                return sortOrder === 'asc' ? oA - oB : oB - oA;
            });
    }, [workStatuses, searchQuery, sortOrder]);

    const filteredSchedules = useMemo(() => {
        const q = searchQuery.toLowerCase();
        return workSchedules
            .filter(
                (s) =>
                    (s.name && s.name.toLowerCase().includes(q)) ||
                    (s.type && s.type.toLowerCase().includes(q))
            )
            .sort((a, b) => {
                const nA = a.name || '';
                const nB = b.name || '';
                return sortOrder === 'asc' ? nA.localeCompare(nB) : nB.localeCompare(nA);
            });
    }, [workSchedules, searchQuery, sortOrder]);

    const mergedEmploymentPolicies = useMemo(() => {
        const q = searchQuery.toLowerCase();
        return contractTypes
            .map((ct) => {
                const policy = employmentPolicies.find((p) => p.employment_type_id === ct.id) || null;
                const matchHours = policy?.notes?.match(/\[(\d+(?:\.\d+)?)\s*(?:hrs|hours)?\/week\]/i) || policy?.notes?.match(/(\d+(?:\.\d+)?)\s*(?:hrs|hours)\/week/i);
                const extractedHours = matchHours ? matchHours[1] : (policy?.default_hours || '40');
                const cleanNotes = policy?.notes ? policy.notes.replace(/\[(\d+(?:\.\d+)?)\s*(?:hrs|hours)?\/week\]\s*/i, '').trim() : '';

                return {
                    id: policy?.id || `policy-${ct.id}`,
                    employment_type_id: ct.id,
                    contract_type_name: ct.name,
                    name: ct.name,
                    min_level_code: ct.min_level_code,
                    max_level_code: ct.max_level_code,
                    is_default: ct.is_default,
                    default_hours: extractedHours,
                    overtime_eligible: policy ? policy.overtime_eligible : false,
                    benefits_eligible: policy ? policy.benefits_eligible : false,
                    notes: cleanNotes,
                    order_index: ct.order_index ?? 0,
                    raw_notes: policy?.notes || '',
                    is_saved: !!policy?.id,
                };
            })
            .filter(
                (p) =>
                    (p.contract_type_name && p.contract_type_name.toLowerCase().includes(q)) ||
                    (p.notes && p.notes.toLowerCase().includes(q))
            )
            .sort((a, b) => {
                const oA = a.order_index ?? 0;
                const oB = b.order_index ?? 0;
                if (oA !== oB) {
                    return sortOrder === 'asc' ? oA - oB : oB - oA;
                }
                const nA = a.contract_type_name || '';
                const nB = b.contract_type_name || '';
                return sortOrder === 'asc' ? nA.localeCompare(nB) : nB.localeCompare(nA);
            });
    }, [contractTypes, employmentPolicies, searchQuery, sortOrder]);

    const filteredLeavePolicies = useMemo(() => {
        const q = searchQuery.toLowerCase();
        return leavePolicies
            .filter(
                (lp) =>
                    (lp.name && lp.name.toLowerCase().includes(q)) ||
                    (lp.description && lp.description.toLowerCase().includes(q))
            )
            .sort((a, b) => {
                const nA = a.name || '';
                const nB = b.name || '';
                return sortOrder === 'asc' ? nA.localeCompare(nB) : nB.localeCompare(nA);
            });
    }, [leavePolicies, searchQuery, sortOrder]);

    // Audit Logs Renderer for People Setup
    const renderAuditLogs = () => {
        const orgPrefix = (profile?.id_code || 'JCP')
            .replace(/[^A-Za-z0-9]/g, '')
            .slice(0, 3)
            .toUpperCase() || 'JCP';

        const auditLogsList: Array<AuditLogItem & { dateKey: 'today' | 'last_7_days' | 'last_30_days' | 'this_month' }> = [];

        const filteredAuditLogs = auditLogsList.filter((item) => {
            if (selectedAuditCategory !== 'All' && item.category !== selectedAuditCategory) return false;
            if (auditTimeFilter === 'today' && item.dateKey !== 'today') return false;
            if (auditSearchQuery.trim()) {
                const q = auditSearchQuery.toLowerCase().trim();
                return (
                    item.actor.toLowerCase().includes(q) ||
                    item.action.toLowerCase().includes(q) ||
                    item.detail.toLowerCase().includes(q) ||
                    item.category.toLowerCase().includes(q) ||
                    item.time.toLowerCase().includes(q) ||
                    (item.relatedEmployee && item.relatedEmployee.toLowerCase().includes(q)) ||
                    item.id.toLowerCase().includes(q)
                );
            }
            return true;
        });

        const categoryActions: ContextMenuAction[] = [
            { title: 'All Types', selected: selectedAuditCategory === 'All' },
            { title: 'Setup', selected: selectedAuditCategory === 'Setup' },
            { title: 'Employment', selected: selectedAuditCategory === 'Employment' },
            { title: 'Profile', selected: selectedAuditCategory === 'Profile' },
            { title: 'Lifecycle', selected: selectedAuditCategory === 'Lifecycle' },
            { title: 'Performance', selected: selectedAuditCategory === 'Performance' },
        ];

        const timeActions: ContextMenuAction[] = [
            { title: 'All Retained (30 Days)', selected: auditTimeFilter === 'all' },
            { title: 'Today', selected: auditTimeFilter === 'today' },
            { title: 'Last 7 Days', selected: auditTimeFilter === 'last_7_days' },
            { title: 'Last 30 Days', selected: auditTimeFilter === 'last_30_days' },
            { title: 'This Month', selected: auditTimeFilter === 'this_month' },
        ];

        const categoryFilterLabel = selectedAuditCategory === 'All' ? 'Type' : selectedAuditCategory;

        const timeFilterLabel =
            auditTimeFilter === 'all'
                ? 'Time'
                : auditTimeFilter === 'today'
                ? 'Today'
                : auditTimeFilter === 'last_7_days'
                ? '7 Days'
                : auditTimeFilter === 'last_30_days'
                ? '30 Days'
                : 'This Month';

        return (
            <View style={{ gap: 12 }}>
                {/* Unified Toolbar: Search | Type Menu | Time Menu */}
                <View style={s.unifiedMemberToolbar}>
                    <View
                        style={[
                            s.unifiedSearchBar,
                            {
                                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                            },
                        ]}
                    >
                        <PlatformIcon name="magnifyingglass" size={13} tintColor={subtextColor} />
                        <TextInput
                            style={[s.unifiedSearchInput, { color: textColor }]}
                            placeholder="Search..."
                            placeholderTextColor={subtextColor}
                            value={auditSearchQuery}
                            onChangeText={setAuditSearchQuery}
                            clearButtonMode="while-editing"
                            autoCapitalize="none"
                        />
                    </View>

                    <ContextMenu
                        actions={categoryActions}
                        onPress={(e) => {
                            Haptics.selectionAsync();
                            if (e.nativeEvent.index === 0) setSelectedAuditCategory('All');
                            else if (e.nativeEvent.index === 1) setSelectedAuditCategory('Setup');
                            else if (e.nativeEvent.index === 2) setSelectedAuditCategory('Employment');
                            else if (e.nativeEvent.index === 3) setSelectedAuditCategory('Profile');
                            else if (e.nativeEvent.index === 4) setSelectedAuditCategory('Lifecycle');
                            else if (e.nativeEvent.index === 5) setSelectedAuditCategory('Performance');
                        }}
                        dropdownMenuMode={true}
                    >
                        <View
                            style={[
                                s.toolbarFilterBtn,
                                {
                                    backgroundColor: isDark
                                        ? 'rgba(255,255,255,0.06)'
                                        : 'rgba(0,0,0,0.04)',
                                },
                            ]}
                        >
                            <Text
                                style={[
                                    s.toolbarFilterBtnText,
                                    {
                                        color: textColor,
                                        fontWeight: '600',
                                    },
                                ]}
                                numberOfLines={1}
                            >
                                {categoryFilterLabel}
                            </Text>
                            <PlatformIcon
                                name="chevron.down"
                                size={10}
                                tintColor={subtextColor}
                            />
                        </View>
                    </ContextMenu>

                    <ContextMenu
                        actions={timeActions}
                        onPress={(e) => {
                            Haptics.selectionAsync();
                            if (e.nativeEvent.index === 0) setAuditTimeFilter('all');
                            else if (e.nativeEvent.index === 1) setAuditTimeFilter('today');
                            else if (e.nativeEvent.index === 2) setAuditTimeFilter('last_7_days');
                            else if (e.nativeEvent.index === 3) setAuditTimeFilter('last_30_days');
                            else if (e.nativeEvent.index === 4) setAuditTimeFilter('this_month');
                        }}
                        dropdownMenuMode={true}
                    >
                        <View
                            style={[
                                s.toolbarFilterBtn,
                                {
                                    backgroundColor: isDark
                                        ? 'rgba(255,255,255,0.06)'
                                        : 'rgba(0,0,0,0.04)',
                                },
                            ]}
                        >
                            <Text
                                style={[
                                    s.toolbarFilterBtnText,
                                    {
                                        color: textColor,
                                        fontWeight: '600',
                                    },
                                ]}
                                numberOfLines={1}
                            >
                                {timeFilterLabel}
                            </Text>
                            <PlatformIcon
                                name="chevron.down"
                                size={10}
                                tintColor={subtextColor}
                            />
                        </View>
                    </ContextMenu>
                </View>

                {/* Cards */}
                <View style={{ gap: 10 }}>
                    {filteredAuditLogs.length === 0 ? (
                        <GlassView
                            intensity={intensity}
                            style={[
                                s.remoteModeCard,
                                {
                                    backgroundColor: isDark
                                        ? 'rgba(255,255,255,0.02)'
                                        : 'rgba(255,255,255,0.7)',
                                    paddingVertical: 36,
                                    paddingHorizontal: 20,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 8,
                                },
                            ]}
                        >
                            <View
                                style={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 24,
                                    backgroundColor: isDark
                                        ? 'rgba(255,255,255,0.06)'
                                        : 'rgba(0,0,0,0.04)',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <PlatformIcon
                                    name="clock.arrow.circlepath"
                                    size={22}
                                    tintColor={subtextColor}
                                />
                            </View>
                            <Text
                                style={{
                                    fontSize: 15,
                                    fontWeight: '600',
                                    color: textColor,
                                    textAlign: 'center',
                                }}
                            >
                                No Audit Logs
                            </Text>
                            <Text
                                style={{
                                    fontSize: 13,
                                    color: subtextColor,
                                    textAlign: 'center',
                                    maxWidth: 260,
                                }}
                            >
                                System event trail and managerial setup history will appear here.
                            </Text>
                        </GlassView>
                    ) : (
                        filteredAuditLogs.map((item) => {
                            const categoryColor = getAuditCategoryColor(item.category);
                            const initials = item.actor
                                .split(' ')
                                .map((w) => w[0])
                                .slice(0, 2)
                                .join('')
                                .toUpperCase();

                            return (
                                <TouchableOpacity
                                    key={item.id}
                                    activeOpacity={0.72}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setSelectedAuditItem(item);
                                        setAuditDetailVisible(true);
                                    }}
                                >
                                    <GlassView
                                        intensity={intensity}
                                        style={[
                                            s.remoteModeCard,
                                            {
                                                backgroundColor: isDark
                                                    ? 'rgba(255,255,255,0.025)'
                                                    : 'rgba(255,255,255,0.75)',
                                                borderColor: isDark
                                                    ? 'rgba(255,255,255,0.08)'
                                                    : 'rgba(0,0,0,0.06)',
                                                paddingVertical: 13,
                                                paddingHorizontal: 15,
                                                gap: 6,
                                            },
                                        ]}
                                    >
                                        {/* Row 1: Actor Avatar & Name (Left) + Category Short Label [Dot] (Right) */}
                                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1, minWidth: 0 }}>
                                                {item.actorAvatarUrl ? (
                                                    <Image
                                                        source={{ uri: item.actorAvatarUrl }}
                                                        style={{
                                                            width: 22,
                                                            height: 22,
                                                            borderRadius: 11,
                                                            backgroundColor: isDark
                                                                ? 'rgba(255,255,255,0.06)'
                                                                : 'rgba(0,0,0,0.04)',
                                                        }}
                                                    />
                                                ) : (
                                                    <View
                                                        style={{
                                                            width: 22,
                                                            height: 22,
                                                            borderRadius: 11,
                                                            backgroundColor: isDark
                                                                ? 'rgba(255,255,255,0.06)'
                                                                : 'rgba(0,0,0,0.04)',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            flexShrink: 0,
                                                        }}
                                                    >
                                                        <Text
                                                            style={{
                                                                fontSize: 9.5,
                                                                fontWeight: '500',
                                                                color: isDark ? '#AEAEB2' : '#636366',
                                                            }}
                                                        >
                                                            {initials}
                                                        </Text>
                                                    </View>
                                                )}
                                                <Text
                                                    style={{
                                                        fontSize: 13.5,
                                                        fontWeight: '500',
                                                        color: textColor,
                                                        flexShrink: 1,
                                                    }}
                                                    numberOfLines={1}
                                                    ellipsizeMode="tail"
                                                >
                                                    {item.actor}
                                                </Text>
                                            </View>

                                            {/* Top-Right: Category Short Label [Dot] */}
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                                                <Text
                                                    style={{
                                                        fontSize: 11.5,
                                                        color: subtextColor,
                                                        fontWeight: '400',
                                                    }}
                                                    numberOfLines={1}
                                                >
                                                    {getAuditCategoryShortLabel(item.category)}
                                                </Text>
                                                <View
                                                    style={{
                                                        width: 6,
                                                        height: 6,
                                                        borderRadius: 3,
                                                        backgroundColor: categoryColor,
                                                        flexShrink: 0,
                                                    }}
                                                />
                                            </View>
                                        </View>

                                        {/* Row 2: Action Title */}
                                        <Text
                                            style={{
                                                fontSize: 14.5,
                                                fontWeight: '600',
                                                color: textColor,
                                            }}
                                        >
                                            {item.action}
                                        </Text>

                                        {/* Row 3: Detail Text */}
                                        <Text
                                            style={{
                                                fontSize: 13,
                                                color: isDark ? '#D1D1D6' : '#3A3A3C',
                                                lineHeight: 18,
                                            }}
                                        >
                                            {item.detail}
                                        </Text>

                                        {/* Row 4: Timestamp Footer */}
                                        <Text
                                            style={{
                                                fontSize: 11.5,
                                                color: '#8E8E93',
                                                fontWeight: '400',
                                                marginTop: 2,
                                            }}
                                        >
                                            {item.time}
                                        </Text>
                                    </GlassView>
                                </TouchableOpacity>
                            );
                        })
                    )}
                </View>
            </View>
        );
    };

    return (
        <>
            <RNStatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
            <Stack.Screen
                options={{
                    headerShown: true,
                    title: currentConfig.title,
                    headerLargeTitle: false,
                    headerTransparent: Platform.OS === 'ios',
                    headerStyle: { backgroundColor: Platform.OS === 'ios' ? 'transparent' : (isDark ? '#000000' : '#F2F2F7') },
                    headerTintColor: textColor,
                    headerTitleStyle: { color: textColor, fontWeight: '600' },
                    headerShadowVisible: false,
                    headerBackButtonDisplayMode: 'minimal',
                    headerBackTitle: ' ',
                    headerRight: () => (
                        <View style={{ marginRight: Platform.OS === 'web' ? 16 : 0 }}>
                            <HeaderToolbar
                                actions={
                                    activeModule === 'audit_logs'
                                        ? [
                                              {
                                                  id: 'export',
                                                  icon: 'share-outline',
                                                  image: 'square.and.arrow.up',
                                                  title: 'Export',
                                                  tintColor: textColor,
                                                  onPress: () => {
                                                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                      if (Platform.OS === 'ios') {
                                                          ActionSheetIOS.showActionSheetWithOptions(
                                                              {
                                                                  options: ['Cancel', 'Export as CSV', 'Export as JSON', 'Export Summary Report'],
                                                                  cancelButtonIndex: 0,
                                                                  userInterfaceStyle: isDark ? 'dark' : 'light',
                                                                  title: 'Export Audit Logs',
                                                              },
                                                              (buttonIndex) => {
                                                                  if (buttonIndex === 1) handleExportAuditLogs('csv');
                                                                  else if (buttonIndex === 2) handleExportAuditLogs('json');
                                                                  else if (buttonIndex === 3) handleExportAuditLogs('summary');
                                                              }
                                                          );
                                                      } else {
                                                          handleExportAuditLogs('csv');
                                                      }
                                                  },
                                              },
                                          ]
                                        : [
                                              {
                                                  id: 'add',
                                                  icon: 'add',
                                                  image: 'plus',
                                                  title: 'Add',
                                                  isPrimary: true,
                                                  tintColor: '#007AFF',
                                                  onPress: handleOpenAdd,
                                              },
                                          ]
                                }
                                isDark={isDark}
                                textColor={textColor}
                            />
                        </View>
                    ),
                }}
            />

            <ScrollView
                style={[s.container, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}
                contentInsetAdjustmentBehavior="automatic"
                contentContainerStyle={[
                    s.scrollContent,
                    {
                        paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 24) + 16 : 16,
                        paddingBottom: insets.bottom + 40,
                    },
                ]}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#007AFF" />
                }
            >
                {/* Segmented Control Bar */}
                {activeModule !== 'audit_logs' && (
                    <SegmentedControl
                        segments={currentSegments}
                        activeSegment={activeModule}
                        onSegmentChange={(newId) => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setActiveModule(newId as SetupModuleId);
                            setSearchQuery('');
                        }}
                    />
                )}

                {/* Search & Sort Toolbar Bar */}
                {activeModule !== 'audit_logs' && (
                    <View style={s.toolbarRow}>
                        <View
                            style={[
                                s.searchBarContainer,
                                {
                                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                                },
                            ]}
                        >
                            <PlatformIcon name="magnifyingglass" size={15} tintColor={subtextColor} />
                            <TextInput
                                style={[s.searchInput, { color: textColor }]}
                                placeholder={`Search ${currentConfig.title.toLowerCase()}...`}
                                placeholderTextColor={subtextColor}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                clearButtonMode="while-editing"
                            />
                        </View>

                        {/* Middle Sort / Group Mode Button for Positions */}
                        {activeModule === 'positions' && (
                            <TouchableOpacity
                                style={[
                                    s.criteriaBtn,
                                    {
                                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                                    },
                                ]}
                                onPress={handleOpenPositionSortCriteriaMenu}
                                activeOpacity={0.7}
                            >
                                <PlatformIcon
                                    name="slider.horizontal.3"
                                    size={15}
                                    tintColor={positionSortMode !== 'dept' ? '#007AFF' : subtextColor}
                                />
                            </TouchableOpacity>
                        )}

                        <SmoothSortButton
                            isDark={isDark}
                            subtextColor={subtextColor}
                            sortOrder={sortOrder}
                            onPress={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                        />
                    </View>
                )}

                {/* Content Lists */}
                {loading && !refreshing && activeModule !== 'audit_logs' ? (
                    <View style={s.centerLoader}>
                        <ActivityIndicator size="small" color="#007AFF" />
                        <Text style={[s.loaderText, { color: subtextColor }]}>Loading {currentConfig.title}...</Text>
                    </View>
                ) : (
                    <View style={s.listWrapper}>
                        {activeModule === 'audit_logs' && renderAuditLogs()}

                        {/* DEPARTMENTS */}
                        {activeModule === 'departments' && (
                            <View style={s.itemsContainer}>
                                {filteredDepartments.length === 0 ? (
                                    <EmptyState isDark={isDark} textColor={textColor} subtextColor={subtextColor} onAdd={handleOpenAdd} moduleType={activeModule} />
                                ) : (
                                    filteredDepartments.map((item) => (
                                        <TouchableOpacity
                                            key={item.id}
                                            activeOpacity={0.7}
                                            onPress={() => handleOpenEdit(item)}
                                            onLongPress={() => handleCardLongPress(item)}
                                            delayLongPress={300}
                                        >
                                            <GlassView
                                                intensity={intensity}
                                                style={[
                                                    s.itemCard,
                                                    { backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.7)' },
                                                ]}
                                            >
                                                <View style={s.cardTopRow}>
                                                    <View style={[s.codePill, { backgroundColor: 'rgba(0,122,255,0.1)' }]}>
                                                        <Text style={[s.codePillText, { color: '#007AFF' }]}>
                                                            {item.code ? `${item.cluster_code ?? 1}-${item.code}` : 'DEPT'}
                                                        </Text>
                                                    </View>

                                                    <View style={[s.statusBadge, { backgroundColor: item.status === 'Active' ? 'rgba(52,199,89,0.12)' : 'rgba(255,59,48,0.12)' }]}>
                                                        <View style={[s.statusDot, { backgroundColor: item.status === 'Active' ? '#34C759' : '#FF3B30' }]} />
                                                        <Text style={[s.statusText, { color: item.status === 'Active' ? '#34C759' : '#FF3B30' }]}>
                                                            {item.status || 'Active'}
                                                        </Text>
                                                    </View>
                                                </View>

                                                <Text style={[s.cardDeptTitle, { color: textColor }]}>
                                                    {item.name}
                                                </Text>
                                            </GlassView>
                                        </TouchableOpacity>
                                    ))
                                )}
                            </View>
                        )}

                        {/* POSITIONS */}
                        {activeModule === 'positions' && (
                            <View style={s.itemsContainer}>
                                {filteredPositions.length === 0 ? (
                                    <EmptyState isDark={isDark} textColor={textColor} subtextColor={subtextColor} onAdd={handleOpenAdd} moduleType={activeModule} />
                                ) : positionSortMode === 'dept' && groupedPositions ? (
                                    groupedPositions.map((group) => {
                                        const isCollapsed = !!collapsedDeptIds[group.department.id];
                                        return (
                                            <View key={group.department.id} style={s.deptGroupSection}>
                                                <TouchableOpacity
                                                    activeOpacity={0.7}
                                                    onPress={() => handleToggleDeptCollapse(group.department.id)}
                                                    style={s.deptGroupHeader}
                                                >
                                                    <View style={s.deptGroupHeaderLeft}>
                                                        <View style={[s.codePill, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                                                            <Text style={[s.codePillText, { color: subtextColor }]}>
                                                                {group.department.code ? `${group.department.cluster_code ?? 0}-${group.department.code}` : 'DEPT'}
                                                            </Text>
                                                        </View>
                                                        <Text style={[s.deptGroupTitle, { color: textColor }]} numberOfLines={1}>
                                                            {group.department.name}
                                                        </Text>
                                                    </View>

                                                    <View style={s.deptGroupHeaderRight}>
                                                        <Text style={[s.deptGroupCount, { color: subtextColor }]}>
                                                            {group.items.length} {group.items.length === 1 ? 'pos' : 'pos'}
                                                        </Text>
                                                        <PlatformIcon
                                                            name={isCollapsed ? 'chevron.right' : 'chevron.down'}
                                                            size={11}
                                                            tintColor={subtextColor}
                                                        />
                                                    </View>
                                                </TouchableOpacity>

                                                {!isCollapsed && (
                                                    <View style={s.deptGroupItems}>
                                                        {group.items.map((item) => (
                                                            <TouchableOpacity
                                                                key={item.id}
                                                                activeOpacity={0.7}
                                                                onPress={() => handleOpenEdit(item)}
                                                                onLongPress={() => handleCardLongPress(item)}
                                                                delayLongPress={300}
                                                            >
                                                                <GlassView
                                                                    intensity={intensity}
                                                                    style={[
                                                                        s.itemCard,
                                                                        { backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.7)' },
                                                                    ]}
                                                                >
                                                                    <View style={s.cardTopRow}>
                                                                        <View style={[s.codePill, { backgroundColor: 'rgba(88,86,214,0.1)' }]}>
                                                                            <Text style={[s.codePillText, { color: '#5856D6' }]}>
                                                                                {item.code ? `${item.category_code ?? 1}-${item.code}` : 'POS'}
                                                                            </Text>
                                                                        </View>

                                                                        <View style={[s.statusBadge, { backgroundColor: item.status === 'Active' ? 'rgba(52,199,89,0.12)' : 'rgba(255,59,48,0.12)' }]}>
                                                                            <View style={[s.statusDot, { backgroundColor: item.status === 'Active' ? '#34C759' : '#FF3B30' }]} />
                                                                            <Text style={[s.statusText, { color: item.status === 'Active' ? '#34C759' : '#FF3B30' }]}>
                                                                                {item.status || 'Active'}
                                                                            </Text>
                                                                        </View>
                                                                    </View>

                                                                    <Text style={[s.cardDeptTitle, { color: textColor }]}>
                                                                        {item.name}
                                                                    </Text>
                                                                </GlassView>
                                                            </TouchableOpacity>
                                                        ))}
                                                    </View>
                                                )}
                                            </View>
                                        );
                                    })
                                ) : (
                                    filteredPositions.map((item) => (
                                        <TouchableOpacity
                                            key={item.id}
                                            activeOpacity={0.7}
                                            onPress={() => handleOpenEdit(item)}
                                            onLongPress={() => handleCardLongPress(item)}
                                            delayLongPress={300}
                                        >
                                            <GlassView
                                                intensity={intensity}
                                                style={[
                                                    s.itemCard,
                                                    { backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.7)' },
                                                ]}
                                            >
                                                <View style={s.cardTopRow}>
                                                    <View style={[s.codePill, { backgroundColor: 'rgba(88,86,214,0.1)' }]}>
                                                        <Text style={[s.codePillText, { color: '#5856D6' }]}>
                                                            {item.code ? `${item.category_code ?? 1}-${item.code}` : 'POS'}
                                                        </Text>
                                                    </View>

                                                    <View style={[s.statusBadge, { backgroundColor: item.status === 'Active' ? 'rgba(52,199,89,0.12)' : 'rgba(255,59,48,0.12)' }]}>
                                                        <View style={[s.statusDot, { backgroundColor: item.status === 'Active' ? '#34C759' : '#FF3B30' }]} />
                                                        <Text style={[s.statusText, { color: item.status === 'Active' ? '#34C759' : '#FF3B30' }]}>
                                                            {item.status || 'Active'}
                                                        </Text>
                                                    </View>
                                                </View>

                                                <Text style={[s.cardDeptTitle, { color: textColor }]}>
                                                    {item.name}
                                                </Text>
                                                <Text style={[s.cardMetaText, { color: subtextColor, marginTop: 4 }]} numberOfLines={1}>
                                                    {item.organization_departments?.name || 'General Department'}
                                                </Text>
                                            </GlassView>
                                        </TouchableOpacity>
                                    ))
                                )}
                            </View>
                        )}

                        {/* LEVELS */}
                        {activeModule === 'levels' && (
                            <View style={s.itemsContainer}>
                                {filteredLevels.length === 0 ? (
                                    <EmptyState isDark={isDark} textColor={textColor} subtextColor={subtextColor} onAdd={handleOpenAdd} moduleType={activeModule} />
                                ) : (
                                    filteredLevels.map((item) => (
                                        <TouchableOpacity
                                            key={item.id}
                                            activeOpacity={0.7}
                                            onPress={() => handleOpenEdit(item)}
                                            onLongPress={() => handleCardLongPress(item)}
                                            delayLongPress={300}
                                        >
                                            <GlassView
                                                intensity={intensity}
                                                style={[
                                                    s.itemCard,
                                                    { backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.7)' },
                                                ]}
                                            >
                                                <View style={s.cardTopRow}>
                                                    <View style={[s.codePill, { backgroundColor: 'rgba(50,173,230,0.12)' }]}>
                                                        <Text style={[s.codePillText, { color: '#32ADE6' }]}>
                                                            {item.code ? `${item.level_code ?? 0}-${item.code}` : `Lv ${item.level_code ?? 0}`}
                                                        </Text>
                                                    </View>

                                                    <View style={[s.statusBadge, { backgroundColor: item.status === 'Active' ? 'rgba(52,199,89,0.12)' : 'rgba(255,59,48,0.12)' }]}>
                                                        <View style={[s.statusDot, { backgroundColor: item.status === 'Active' ? '#34C759' : '#FF3B30' }]} />
                                                        <Text style={[s.statusText, { color: item.status === 'Active' ? '#34C759' : '#FF3B30' }]}>
                                                            {item.status || 'Active'}
                                                        </Text>
                                                    </View>
                                                </View>

                                                <Text style={[s.cardDeptTitle, { color: textColor }]}>
                                                    {item.roman_code && item.roman_code !== '0' ? `${item.roman_code} • ${item.name}` : item.name}
                                                </Text>
                                            </GlassView>
                                        </TouchableOpacity>
                                    ))
                                )}
                            </View>
                        )}

                        {/* CONTRACT TYPES */}
                        {activeModule === 'contract_types' && (
                            <View style={s.itemsContainer}>
                                {filteredContracts.length === 0 ? (
                                    <EmptyState isDark={isDark} textColor={textColor} subtextColor={subtextColor} onAdd={handleOpenAdd} moduleType={activeModule} />
                                ) : (
                                    filteredContracts.map((item) => (
                                        <TouchableOpacity
                                            key={item.id}
                                            activeOpacity={0.7}
                                            onPress={() => handleOpenEdit(item)}
                                            onLongPress={() => handleCardLongPress(item)}
                                            delayLongPress={300}
                                        >
                                            <GlassView
                                                intensity={intensity}
                                                style={[
                                                    s.itemCard,
                                                    { backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.7)' },
                                                ]}
                                            >
                                                <View style={s.cardTopRow}>
                                                    <View style={[s.codePill, { backgroundColor: 'rgba(52,199,89,0.12)' }]}>
                                                        <Text style={[s.codePillText, { color: '#34C759' }]}>
                                                             #{item.order_index || 1}
                                                        </Text>
                                                    </View>

                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                        {item.is_default && (
                                                            <View style={[s.statusBadge, { backgroundColor: 'rgba(0,122,255,0.12)' }]}>
                                                                <Text style={[s.statusText, { color: '#007AFF', fontWeight: '600' }]}>Default</Text>
                                                            </View>
                                                        )}
                                                        <View style={[s.statusBadge, { backgroundColor: item.status === 'Active' ? 'rgba(52,199,89,0.12)' : 'rgba(255,59,48,0.12)' }]}>
                                                            <View style={[s.statusDot, { backgroundColor: item.status === 'Active' ? '#34C759' : '#FF3B30' }]} />
                                                            <Text style={[s.statusText, { color: item.status === 'Active' ? '#34C759' : '#FF3B30' }]}>
                                                                {item.status || 'Active'}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                </View>

                                                <Text style={[s.cardDeptTitle, { color: textColor }]}>
                                                    {item.name}
                                                </Text>
                                                <Text style={[s.cardMetaText, { color: subtextColor, marginTop: 4 }]} numberOfLines={1}>
                                                    Eligible Levels: Lv {item.min_level_code ?? 0} - Lv {item.max_level_code ?? 8}
                                                </Text>
                                            </GlassView>
                                        </TouchableOpacity>
                                    ))
                                )}
                            </View>
                        )}

                        {/* WORK STATUSES */}
                        {activeModule === 'work_statuses' && (
                            <View style={s.itemsContainer}>
                                {filteredWorkStatuses.length === 0 ? (
                                    <EmptyState isDark={isDark} textColor={textColor} subtextColor={subtextColor} onAdd={handleOpenAdd} moduleType={activeModule} />
                                ) : (
                                    filteredWorkStatuses.map((item) => {
                                        const dotColor = item.color || '#10B981';
                                        return (
                                            <TouchableOpacity
                                                key={item.id}
                                                activeOpacity={0.7}
                                                onPress={() => handleOpenEdit(item)}
                                                onLongPress={() => handleCardLongPress(item)}
                                                delayLongPress={300}
                                            >
                                                <GlassView
                                                    intensity={intensity}
                                                    style={[
                                                        s.itemCard,
                                                        { backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.7)' },
                                                    ]}
                                                >
                                                    <View style={s.cardTopRow}>
                                                        <View style={[s.codePill, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                                                            <Text style={[s.codePillText, { color: subtextColor }]}>
                                                                {item.visibility || 'Public'}
                                                            </Text>
                                                        </View>

                                                        <View style={[s.statusBadge, { backgroundColor: item.status === 'Active' ? 'rgba(52,199,89,0.12)' : 'rgba(255,59,48,0.12)' }]}>
                                                            <View style={[s.statusDot, { backgroundColor: item.status === 'Active' ? '#34C759' : '#FF3B30' }]} />
                                                            <Text style={[s.statusText, { color: item.status === 'Active' ? '#34C759' : '#FF3B30' }]}>
                                                                {item.status || 'Active'}
                                                            </Text>
                                                        </View>
                                                    </View>

                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 }}>
                                                        <View
                                                            style={{
                                                                width: 12,
                                                                height: 12,
                                                                borderRadius: 6,
                                                                backgroundColor: dotColor,
                                                            }}
                                                        />
                                                        <Text style={[s.cardDeptTitle, { color: textColor, marginTop: 0 }]}>
                                                            {item.name}
                                                        </Text>
                                                    </View>
                                                </GlassView>
                                            </TouchableOpacity>
                                        );
                                    })
                                )}
                            </View>
                        )}

                        {/* WORK SCHEDULES */}
                        {activeModule === 'work_schedules' && (
                            <View style={s.itemsContainer}>
                                {/* Horizontal Preset Pill Buttons (Bejejer) with Left Static Label */}
                                <View style={s.presetRowContainer}>
                                    <Text style={[s.presetStaticLabel, { color: subtextColor }]}>
                                        Preset
                                    </Text>
                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        contentContainerStyle={s.presetPillScroll}
                                    >
                                        {WORK_SCHEDULE_PRESETS.map((preset) => (
                                            <BouncyGlassButton
                                                key={preset.id}
                                                isPill
                                                isGlass
                                                isDark={isDark}
                                                textColor={textColor}
                                                onPress={() => handleSelectPresetTemplate(preset)}
                                                style={{
                                                    height: 32,
                                                    borderRadius: 16,
                                                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.045)',
                                                }}
                                            >
                                                <Text style={[s.presetPillText, { color: textColor }]}>
                                                    {preset.name}
                                                </Text>
                                            </BouncyGlassButton>
                                        ))}
                                    </ScrollView>
                                </View>

                                {filteredSchedules.length === 0 ? (
                                    <EmptyState isDark={isDark} textColor={textColor} subtextColor={subtextColor} onAdd={handleOpenAdd} moduleType={activeModule} />
                                ) : (
                                    filteredSchedules.map((item) => {
                                        const cfg = item.days_config || {};
                                        const hasCustomHours = cfg.custom_hours && Object.keys(cfg.custom_hours).length > 0;
                                        const isCustom = item.type === 'Fixed' && hasCustomHours;

                                        const typeLabel = isCustom
                                            ? 'Custom'
                                            : item.type === 'Fixed'
                                            ? 'Fixed'
                                            : item.type === 'Flexible'
                                            ? 'Flexible'
                                            : 'Shift';

                                        const ALL_DAYS_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                                        const cleanTime = (t?: string) => (!t ? '09:00' : t.substring(0, 5));
                                        const defaultStart = cleanTime(item.start_time);
                                        const defaultEnd = cleanTime(item.end_time);
                                        const defaultBreak = item.break_duration_minutes ?? 60;

                                        const scheduleRows: { day: string; hours: string; breakStr: string }[] = [];

                                        if (item.type === 'Flexible') {
                                            const dpw = cfg.days_per_week || 5;
                                            scheduleRows.push({
                                                day: `${dpw} Days/Wk`,
                                                hours: `${defaultStart} - ${defaultEnd}`,
                                                breakStr: `Break ${defaultBreak}m`,
                                            });
                                        } else if (item.type === 'Shift') {
                                            scheduleRows.push({
                                                day: 'Shift-Based',
                                                hours: `${defaultStart} - ${defaultEnd}`,
                                                breakStr: `Break ${defaultBreak}m`,
                                            });
                                        } else {
                                            let rawDays: string[] = [];
                                            if (Array.isArray(cfg.working_days)) {
                                                rawDays = cfg.working_days;
                                            } else if (Array.isArray(cfg)) {
                                                rawDays = cfg;
                                            } else if (typeof cfg === 'string') {
                                                try {
                                                    const parsed = JSON.parse(cfg);
                                                    rawDays = Array.isArray(parsed.working_days) ? parsed.working_days : Array.isArray(parsed) ? parsed : [];
                                                } catch {}
                                            }
                                            if (rawDays.length === 0) {
                                                rawDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
                                            }

                                            const sortedDays = [...rawDays].sort((a, b) => ALL_DAYS_ORDER.indexOf(a) - ALL_DAYS_ORDER.indexOf(b));
                                            const customMap = cfg.custom_hours || {};

                                            const dayHours = sortedDays.map((d) => {
                                                const c = customMap[d];
                                                const sTime = cleanTime(c?.start || defaultStart);
                                                const eTime = cleanTime(c?.end || defaultEnd);
                                                const bMin = c?.break !== undefined ? c.break : defaultBreak;
                                                return { day: d, start: sTime, end: eTime, breakMin: bMin, key: `${sTime}-${eTime}-${bMin}` };
                                            });

                                            const formatDaysRangeStr = (days: string[]): string => {
                                                if (days.length === 0) return '';
                                                if (days.length === 1) return days[0];

                                                const sorted = [...days].sort((a, b) => ALL_DAYS_ORDER.indexOf(a) - ALL_DAYS_ORDER.indexOf(b));
                                                let isContiguous = true;
                                                const idxs = sorted.map((d) => ALL_DAYS_ORDER.indexOf(d));
                                                for (let i = 1; i < idxs.length; i++) {
                                                    if (idxs[i] !== idxs[i - 1] + 1) {
                                                        isContiguous = false;
                                                        break;
                                                    }
                                                }
                                                return (isContiguous && sorted.length > 1)
                                                    ? `${sorted[0]} - ${sorted[sorted.length - 1]}`
                                                    : sorted.join(', ');
                                            };

                                            const groups: { key: string; days: string[]; start: string; end: string; breakMin: number }[] = [];
                                            dayHours.forEach((dh) => {
                                                const existing = groups.find((g) => g.key === dh.key);
                                                if (existing) {
                                                    existing.days.push(dh.day);
                                                } else {
                                                    groups.push({
                                                        key: dh.key,
                                                        days: [dh.day],
                                                        start: dh.start,
                                                        end: dh.end,
                                                        breakMin: dh.breakMin,
                                                    });
                                                }
                                            });

                                            groups.forEach((g) => {
                                                scheduleRows.push({
                                                    day: formatDaysRangeStr(g.days),
                                                    hours: `${g.start} - ${g.end}`,
                                                    breakStr: `Break ${g.breakMin}m`,
                                                });
                                            });
                                        }

                                        return (
                                            <TouchableOpacity
                                                key={item.id}
                                                activeOpacity={0.7}
                                                onPress={() => handleOpenEdit(item)}
                                                onLongPress={() => handleCardLongPress(item)}
                                                delayLongPress={300}
                                            >
                                                <GlassView
                                                    intensity={intensity}
                                                    style={[
                                                        s.itemCard,
                                                        { backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.7)' },
                                                    ]}
                                                >
                                                    <View style={s.cardTopRow}>
                                                        <View style={[s.codePill, { backgroundColor: 'rgba(255,149,0,0.12)' }]}>
                                                            <Text style={[s.codePillText, { color: '#FF9500' }]}>
                                                                {typeLabel}
                                                            </Text>
                                                        </View>

                                                        <View style={[s.statusBadge, { backgroundColor: item.status === 'Active' ? 'rgba(52,199,89,0.12)' : 'rgba(255,59,48,0.12)' }]}>
                                                            <View style={[s.statusDot, { backgroundColor: item.status === 'Active' ? '#34C759' : '#FF3B30' }]} />
                                                            <Text style={[s.statusText, { color: item.status === 'Active' ? '#34C759' : '#FF3B30' }]}>
                                                                {item.status || 'Active'}
                                                            </Text>
                                                        </View>
                                                    </View>

                                                    <Text style={[s.cardDeptTitle, { color: textColor }]}>
                                                        {item.name}
                                                    </Text>

                                                    <View style={s.scheduleList}>
                                                        {scheduleRows.map((row, rIdx) => (
                                                            <View key={rIdx} style={s.scheduleRow}>
                                                                <Text style={[s.scheduleDay, { color: textColor }]} numberOfLines={1}>
                                                                    {row.day}
                                                                </Text>
                                                                <Text style={[s.scheduleHours, { color: subtextColor }]} numberOfLines={1}>
                                                                    {row.hours}
                                                                </Text>
                                                                <Text style={[s.scheduleBreak, { color: subtextColor }]} numberOfLines={1}>
                                                                    {row.breakStr}
                                                                </Text>
                                                            </View>
                                                        ))}
                                                    </View>
                                                </GlassView>
                                            </TouchableOpacity>
                                        );
                                    })
                                )}
                            </View>
                        )}

                        {/* EMPLOYMENT POLICIES */}
                        {activeModule === 'employment_policies' && (
                            <View style={s.itemsContainer}>
                                {mergedEmploymentPolicies.length === 0 ? (
                                    <EmptyState isDark={isDark} textColor={textColor} subtextColor={subtextColor} onAdd={handleOpenAdd} moduleType={activeModule} />
                                ) : (
                                    mergedEmploymentPolicies.map((item) => (
                                        <TouchableOpacity
                                            key={item.id}
                                            activeOpacity={0.7}
                                            onPress={() => handleOpenEdit(item)}
                                            onLongPress={() => handleCardLongPress(item)}
                                            delayLongPress={300}
                                        >
                                            <GlassView
                                                intensity={intensity}
                                                style={[
                                                    s.itemCard,
                                                    { backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.7)' },
                                                ]}
                                            >
                                                <Text style={[s.cardDeptTitle, { color: textColor }]}>
                                                    {item.contract_type_name}
                                                </Text>

                                                <View style={{ marginTop: 6, gap: 3 }}>
                                                    <Text style={[s.cardMetaText, { color: subtextColor }]}>
                                                        {item.default_hours || 40} Hours / Week
                                                    </Text>
                                                    <Text style={[s.cardMetaText, { color: subtextColor }]}>
                                                        {item.overtime_eligible ? 'Overtime Eligible' : 'No Overtime'} • {item.benefits_eligible ? 'Benefits & Allowances' : 'No Benefits'}
                                                    </Text>
                                                    {!!item.notes && (
                                                        <Text style={[s.cardMetaText, { color: subtextColor, fontStyle: 'italic', marginTop: 2 }]} numberOfLines={2}>
                                                            {item.notes}
                                                        </Text>
                                                    )}
                                                </View>
                                            </GlassView>
                                        </TouchableOpacity>
                                    ))
                                )}
                            </View>
                        )}

                        {/* LEAVE POLICIES */}
                        {activeModule === 'leave_policies' && (
                            <View style={s.itemsContainer}>
                                {/* Horizontal Preset Pill Buttons */}
                                <View style={s.presetRowContainer}>
                                    <Text style={[s.presetStaticLabel, { color: subtextColor }]}>
                                        Preset
                                    </Text>
                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        contentContainerStyle={s.presetPillScroll}
                                    >
                                        {LEAVE_POLICY_PRESETS.map((preset) => (
                                            <BouncyGlassButton
                                                key={preset.id}
                                                isPill
                                                isGlass
                                                isDark={isDark}
                                                textColor={textColor}
                                                onPress={() => handleSelectLeavePresetTemplate(preset)}
                                                style={{
                                                    height: 32,
                                                    borderRadius: 16,
                                                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.045)',
                                                }}
                                            >
                                                <Text style={[s.presetPillText, { color: textColor }]}>
                                                    {preset.name}
                                                </Text>
                                            </BouncyGlassButton>
                                        ))}
                                    </ScrollView>
                                </View>

                                {filteredLeavePolicies.length === 0 ? (
                                    <EmptyState
                                        isDark={isDark}
                                        textColor={textColor}
                                        subtextColor={subtextColor}
                                        onAdd={handleOpenAdd}
                                        moduleType={activeModule}
                                        title={`No ${currentConfig.title} Configured`}
                                        subtitle="Define custom corporate guidelines and time off entitlements."
                                    />
                                ) : (
                                    filteredLeavePolicies.map((item) => {
                                        const contractMatch = item.description?.match(/\[Contract:\s*([^\]]+)\]/i) || item.description?.match(/\[Status:\s*([^\]]+)\]/i);
                                        const monthsMatch = item.description?.match(/\[Effective:\s*(\d+)m\]/i);
                                        const applicableContract = item.target_employment_types?.[0] || (contractMatch ? contractMatch[1] : 'All Employees');
                                        const effectiveMonths = item.eligibility_waiting_period_months ?? (monthsMatch ? parseInt(monthsMatch[1], 10) : 0);

                                        const getBadgeConfig = (type?: string) => {
                                            switch (type) {
                                                case 'annual': return { bg: 'rgba(0, 122, 255, 0.12)', text: '#007AFF', label: 'Annual' };
                                                case 'sick': return { bg: 'rgba(255, 59, 48, 0.12)', text: '#FF3B30', label: 'Sick' };
                                                case 'permission': return { bg: 'rgba(175, 82, 222, 0.12)', text: '#AF52DE', label: 'Permission' };
                                                case 'unpaid': return { bg: 'rgba(255, 149, 0, 0.12)', text: '#FF9500', label: 'Unpaid' };
                                                case 'maternity_paternity': return { bg: 'rgba(52, 199, 89, 0.12)', text: '#34C759', label: 'Maternity' };
                                                default: return { bg: 'rgba(142, 142, 147, 0.12)', text: '#8E8E93', label: 'Custom' };
                                            }
                                        };
                                        const typeBadge = getBadgeConfig(item.leave_type);
                                        const isInactive = item.status === 'Inactive';

                                        return (
                                            <TouchableOpacity
                                                key={item.id}
                                                activeOpacity={0.7}
                                                onPress={() => handleOpenEdit(item)}
                                                onLongPress={() => handleCardLongPress(item)}
                                                delayLongPress={300}
                                            >
                                                <GlassView
                                                    intensity={intensity}
                                                    style={[
                                                        s.itemCard,
                                                        { backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.7)' },
                                                        isInactive && { opacity: 0.65 },
                                                    ]}
                                                >
                                                    <View style={s.cardTopRow}>
                                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                            <View style={[s.codePill, { backgroundColor: typeBadge.bg }]}>
                                                                <Text style={[s.codePillText, { color: typeBadge.text, fontWeight: '700' }]}>
                                                                    {item.entitlement_days ?? item.annual_leave_quota ?? 12} Days / Cycle
                                                                </Text>
                                                            </View>
                                                        </View>

                                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                            <View style={[s.statusBadge, { backgroundColor: item.is_paid !== false ? 'rgba(52,199,89,0.12)' : 'rgba(255,149,0,0.12)' }]}>
                                                                <Text style={[s.statusText, { color: item.is_paid !== false ? '#34C759' : '#FF9500' }]}>
                                                                    {item.is_paid !== false ? 'Paid' : 'Unpaid'}
                                                                </Text>
                                                            </View>
                                                            <View style={[s.statusBadge, { backgroundColor: !isInactive ? 'rgba(52,199,89,0.12)' : 'rgba(255,59,48,0.12)' }]}>
                                                                <View style={[s.statusDot, { backgroundColor: !isInactive ? '#34C759' : '#FF3B30' }]} />
                                                                <Text style={[s.statusText, { color: !isInactive ? '#34C759' : '#FF3B30' }]}>
                                                                    {item.status || 'Active'}
                                                                </Text>
                                                            </View>
                                                        </View>
                                                    </View>

                                                    <Text style={[s.cardDeptTitle, { color: textColor, marginTop: 4 }]}>
                                                        {item.name}
                                                    </Text>

                                                    <View style={{ marginTop: 4, gap: 3 }}>
                                                        <Text style={[s.cardMetaText, { color: subtextColor }]}>
                                                            Target: {applicableContract}
                                                            {effectiveMonths > 0 ? ` • Waiting: ${effectiveMonths}m` : ''}
                                                            {item.min_notice_days !== undefined ? ` • Notice: ${item.min_notice_days === 0 ? 'Immediate' : `${item.min_notice_days}d`}` : ''}
                                                        </Text>
                                                        {item.leave_type === 'permission' && item.permission_subtypes && item.permission_subtypes.length > 0 && (
                                                            <Text style={[s.cardMetaText, { color: subtextColor, fontSize: 11 }]}>
                                                                Subtypes: {item.permission_subtypes.filter(st => st.is_enabled).length} enabled ({item.permission_subtypes.filter(st => st.is_enabled).map(st => st.name.split(' ')[0]).join(', ')})
                                                            </Text>
                                                        )}
                                                    </View>
                                                </GlassView>
                                            </TouchableOpacity>
                                        );
                                    })
                                )}
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>

            {/* NATIVE SWIFTUI SETUP ITEM BOTTOM SHEET */}
            <SwiftUISetupItemSheet
                isOpened={sheetVisible}
                onClose={() => {
                    if (!saving) {
                        setSheetVisible(false);
                        setEditingItem(null);
                        setCustomSheetTitle(undefined);
                        setCustomSheetSubmitLabel(undefined);
                    }
                }}
                moduleType={activeModule === 'audit_logs' ? 'departments' : activeModule}
                editingItem={editingItem}
                departmentsList={departments}
                positionsList={positions}
                levelsList={levels}
                contractTypesList={contractTypes}
                workStatusesList={workStatuses}
                customTitle={customSheetTitle}
                customSubmitLabel={customSheetSubmitLabel}
                onSubmit={handleSave}
                isSubmitting={saving}
            />

            {/* Leave Policy Presets Preview & Apply Dialog */}
            <LeavePolicyPresetModal
                visible={leavePresetModalVisible}
                onClose={() => setLeavePresetModalVisible(false)}
                onApplyPreset={handleApplyLeavePreset}
                onCustomizePreset={handleSelectLeavePresetTemplate}
            />

            {/* Work Schedule Presets Preview & Apply Dialog */}
            <WorkSchedulePresetModal
                visible={presetModalVisible}
                onClose={() => setPresetModalVisible(false)}
                onApplyPreset={handleApplyPreset}
            />

            {/* Audit Log Detail Sheet */}
            <AuditLogDetailSheet
                visible={auditDetailVisible}
                onClose={() => {
                    setAuditDetailVisible(false);
                    setSelectedAuditItem(null);
                }}
                item={selectedAuditItem}
            />
        </>
    );
}

function EmptyState({
    isDark,
    textColor,
    subtextColor,
    onAdd,
    moduleType,
    title,
    subtitle,
    buttonLabel,
}: {
    isDark: boolean;
    textColor: string;
    subtextColor: string;
    onAdd: () => void;
    moduleType?: SetupModuleId;
    title?: string;
    subtitle?: string;
    buttonLabel?: string;
}) {
    const config = useMemo(() => {
        switch (moduleType) {
            case 'departments':
                return {
                    title: 'No departments found',
                    subtitle: 'Get started by creating your first department.',
                    btn: 'Add Department',
                };
            case 'positions':
                return {
                    title: 'No positions found',
                    subtitle: 'Get started by creating your first position.',
                    btn: 'Add Position',
                };
            case 'levels':
                return {
                    title: 'No levels found',
                    subtitle: 'Get started by creating your first level.',
                    btn: 'Add Level',
                };
            case 'contract_types':
                return {
                    title: 'No contract types found',
                    subtitle: 'Get started by creating your first contract type.',
                    btn: 'Add Contract Type',
                };
            case 'work_statuses':
                return {
                    title: 'No work statuses found',
                    subtitle: 'Get started by creating your first work status.',
                    btn: 'Add Status',
                };
            case 'work_schedules':
                return {
                    title: 'No schedules found',
                    subtitle: 'Get started by creating your first schedule.',
                    btn: 'Add Schedule',
                };
            case 'employment_policies':
                return {
                    title: 'No policies found',
                    subtitle: 'Get started by creating your first employment policy.',
                    btn: 'Add Policy',
                };
            case 'leave_policies':
                return {
                    title: 'No leave policies found',
                    subtitle: 'Get started by creating your first leave policy.',
                    btn: 'Add Policy',
                };
            default:
                return {
                    title: 'No records found',
                    subtitle: 'Get started by creating your first entry.',
                    btn: 'Add Entry',
                };
        }
    }, [moduleType]);

    const displayTitle = title || config.title;
    const displaySubtitle = subtitle || config.subtitle;
    const displayBtn = buttonLabel || config.btn;

    return (
        <View style={s.emptyStateBox}>
            <View
                style={[
                    s.emptyIconCircle,
                    { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' },
                ]}
            >
                <PlatformIcon name="folder.badge.plus" size={32} tintColor={subtextColor} />
            </View>
            <Text style={[s.emptyTitle, { color: textColor }]}>{displayTitle}</Text>
            <Text style={[s.emptySubtitle, { color: subtextColor }]}>
                {displaySubtitle}
            </Text>
            {Platform.OS === 'ios' ? (
                <View style={{ marginTop: 16, height: 42, minWidth: 160, alignItems: 'center', justifyContent: 'center' }}>
                    <Host style={{ height: 42, minWidth: 160 }} colorScheme={isDark ? 'dark' : 'light'}>
                        <SwiftUIButton
                            systemImage="plus"
                            variant="glassProminent"
                            color="#007AFF"
                            onPress={onAdd}
                        >
                            {displayBtn}
                        </SwiftUIButton>
                    </Host>
                </View>
            ) : (
                <TouchableOpacity style={s.emptyAddBtn} onPress={onAdd} activeOpacity={0.8}>
                    <PlatformIcon name="plus" size={14} tintColor="#FFF" />
                    <Text style={s.emptyAddBtnText}>{displayBtn}</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

function SmoothSortButton({
    isDark,
    subtextColor,
    sortOrder,
    onPress,
}: {
    isDark: boolean;
    subtextColor: string;
    sortOrder: 'asc' | 'desc';
    onPress: () => void;
}) {
    const progress = useSharedValue(0);

    const handlePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        progress.value = 1;
        progress.value = withTiming(0, { duration: 650 });
        onPress();
    };

    const animatedBoxStyle = useAnimatedStyle(() => {
        const bg = interpolateColor(
            progress.value,
            [0, 1],
            [
                isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
                isDark ? 'rgba(0, 122, 255, 0.22)' : 'rgba(0, 122, 255, 0.12)',
            ]
        );
        return {
            backgroundColor: bg,
        };
    });

    const neutralIconStyle = useAnimatedStyle(() => ({
        opacity: 1 - progress.value,
    }));

    const activeIconStyle = useAnimatedStyle(() => ({
        opacity: progress.value,
    }));

    const iconName = sortOrder === 'asc' ? 'arrow.down' : 'arrow.up';

    return (
        <TouchableOpacity activeOpacity={0.7} onPress={handlePress}>
            <Animated.View style={[s.sortButton, animatedBoxStyle]}>
                <Animated.View style={[StyleSheet.absoluteFill, s.centerIcon, neutralIconStyle]}>
                    <PlatformIcon name={iconName} size={16} tintColor={subtextColor} />
                </Animated.View>
                <Animated.View style={[StyleSheet.absoluteFill, s.centerIcon, activeIconStyle]}>
                    <PlatformIcon name={iconName} size={16} tintColor="#007AFF" />
                </Animated.View>
            </Animated.View>
        </TouchableOpacity>
    );
}

const s = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        gap: 16,
    },
    headerAddBtn: {
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Search and Sort Toolbar
    toolbarRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    searchBarContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 999,
        paddingHorizontal: 14,
        height: 40,
        gap: 8,
    },
    sortButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    centerIcon: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    criteriaBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    deptGroupSection: {
        gap: 8,
        marginBottom: 6,
    },
    deptGroupHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
        paddingTop: 8,
        paddingBottom: 2,
    },
    deptGroupHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    deptGroupHeaderRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    deptGroupTitle: {
        fontSize: 13,
        fontWeight: '600',
        letterSpacing: -0.1,
        flex: 1,
    },
    deptGroupCount: {
        fontSize: 12,
        fontWeight: '500',
    },
    deptGroupItems: {
        gap: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        padding: 0,
    },
    centerLoader: {
        paddingVertical: 32,
        alignItems: 'center',
        gap: 8,
    },
    loaderText: {
        fontSize: 13,
    },
    listWrapper: {
        gap: 12,
    },
    itemsContainer: {
        gap: 10,
    },
    itemCard: {
        borderRadius: 18,
        padding: 16,
        gap: 10,
    },
    cardTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    cardDeptTitle: {
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: -0.2,
        lineHeight: 22,
    },
    cardMainRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    cardLeftInfo: {
        flex: 1,
        gap: 4,
    },
    cardHeaderLine: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    codePill: {
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 7,
        alignItems: 'center',
        justifyContent: 'center',
    },
    codePillText: {
        fontSize: 11,
        fontWeight: '700',
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: '600',
        letterSpacing: -0.2,
        flex: 1,
    },
    cardMetaText: {
        fontSize: 12,
        paddingLeft: 2,
    },
    cardRightActions: {
        alignItems: 'flex-end',
        gap: 6,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 8,
        gap: 4,
    },
    statusDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '600',
    },
    actionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    iconActionBtn: {
        width: 26,
        height: 26,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
    },
    presetRowContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 10,
    },
    presetStaticLabel: {
        fontSize: 13,
        fontWeight: '600',
        paddingLeft: 2,
    },
    presetPillScroll: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingRight: 8,
    },
    presetPill: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: StyleSheet.hairlineWidth,
    },
    presetPillText: {
        fontSize: 13,
        fontWeight: '500',
    },
    scheduleList: {
        marginTop: 6,
        gap: 4,
    },
    scheduleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 1,
    },
    scheduleDay: {
        flex: 1.15,
        fontSize: 13,
        fontWeight: '400',
    },
    scheduleHours: {
        flex: 1.35,
        fontSize: 13,
        fontWeight: '400',
    },
    scheduleBreak: {
        flex: 0.9,
        fontSize: 13,
        fontWeight: '400',
        textAlign: 'right',
    },
    // Empty state
    emptyStateBox: {
        paddingVertical: 40,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    emptyIconCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    emptyTitle: {
        fontSize: 15,
        fontWeight: '600',
    },
    emptySubtitle: {
        fontSize: 13,
        textAlign: 'center',
        maxWidth: 240,
        marginBottom: 8,
    },
    emptyAddBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#007AFF',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 18,
        gap: 6,
    },
    emptyAddBtnText: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '600',
    },
    unifiedMemberToolbar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        width: '100%',
        marginBottom: 8,
    },
    unifiedSearchBar: {
        flex: 1,
        height: 34,
        borderRadius: 17,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
    },
    unifiedSearchInput: {
        flex: 1,
        fontSize: 13,
        marginLeft: 5,
        paddingVertical: 0,
    },
    toolbarFilterBtn: {
        height: 34,
        paddingHorizontal: 10,
        borderRadius: 17,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        maxWidth: 120,
    },
    toolbarFilterBtnText: {
        fontSize: 12,
        fontWeight: '500',
    },
    remoteModeCard: {
        borderRadius: 16,
        padding: 14,
        overflow: 'hidden',
        borderWidth: StyleSheet.hairlineWidth,
    },
});
