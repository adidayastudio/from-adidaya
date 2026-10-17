import PeopleSetupDetailScreen from '@/app/people-setup/[id]';
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
    RefreshControl,
    Switch,
    StatusBar as RNStatusBar,
    Image,
    Modal,
    Share,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSpring,
    interpolateColor,
} from 'react-native-reanimated';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { GlassView } from '@/components/ui/GlassView';
import { DynamicIslandToastHUD } from '@/components/ui/DynamicIslandToastHUD';
import { triggerDynamicIslandFeedback } from '@/lib/native/dynamicIsland';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { HeaderToolbar } from '@/components/ui/HeaderToolbar';
import { BouncyGlassButton } from '@/components/ui/BouncyGlassButton';
import { SegmentedControl, Segment } from '@/components/ui/SegmentedControl';
import { SwiftUISetupItemSheet } from '@/components/people/setup/SwiftUISetupItemSheet';
import ContextMenu, { ContextMenuAction } from '@/components/ui/PlatformContextMenu';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useUserContext } from '@/context/UserProvider';
import {
    ClockSetupModule,
    CLOCK_SETUP_MENU_ITEMS,
} from '@/components/clock/setup/ClockTeamSetupTab';
import {
    getClockSetting,
    saveClockSetting,
    AttendanceRuleConfig,
    EndTimeBehavior,
    WorkLocationItem,
    CompanyHolidayItem,
    ShiftPatternItem,
    ShiftMode,
    ShiftAppliesTo,
    OvertimeConfig,
    BusinessTripConfig,
    TransportModesConfig,
    AntiFraudConfig,
    AttendancePeriodConfig,
    AttendanceCorrectionConfig,
    CorrectionFieldType,
    NotificationSettingsConfig,
    PrivacyRetentionConfig,
    RetentionSetting,
    RetentionPreset,
    RetentionUnit,
    formatRetentionSettingDisplay,
    RemoteWorkConfig,
    RemoteWorkPolicyItem,
    RemoteWorkModeKey,
    ApprovalWorkflowsConfig,
    DepartmentApprovalFlow,
    ApprovalOverride,
    ApprovalStep,
    ApprovalRequestType,
    DEFAULT_APPROVAL_STEPS,
    DEFAULT_APPROVAL_WORKFLOWS,
    DEFAULT_ATTENDANCE_RULES,
    DEFAULT_ATTENDANCE_CORRECTION,
    DEFAULT_WORK_LOCATIONS,
    DEFAULT_HOLIDAYS,
    DEFAULT_SHIFTS,
    DEFAULT_OVERTIME,
    DEFAULT_BUSINESS_TRIP,
    DEFAULT_ANTI_FRAUD,
    DEFAULT_ATTENDANCE_PERIOD,
    DEFAULT_NOTIFICATIONS,
    DEFAULT_PRIVACY,
    DEFAULT_REMOTE_WORK,
} from '@/lib/api/clockSetup';
import { WorkSchedulePresetModal } from '@/components/clock/setup/WorkSchedulePresetModal';
import { WorkSchedulePreset, WORK_SCHEDULE_PRESETS } from '@/lib/data/workSchedulePresets';
import { LeavePolicyPresetModal, LeavePolicyPresetItem } from '@/components/clock/setup/LeavePolicyPresetModal';
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
import { useTenantContext } from '@/context/TenantContext';
import { CalendarMonthView } from '@/components/clock/setup/CalendarMonthView';
import { CreateCalendarEventModal } from '@/components/clock/setup/CreateCalendarEventModal';
import { WorkLocationModal } from '@/components/clock/setup/WorkLocationModal';
import { RemoteWorkPolicyModal } from '@/components/clock/setup/RemoteWorkPolicyModal';
import { ShiftConfigModal } from '@/components/clock/setup/ShiftConfigModal';
import { ApprovalFlowModal } from '@/components/clock/setup/ApprovalFlowModal';
import { PrivacyRetentionModal, RetentionTypeKey } from '@/components/clock/setup/PrivacyRetentionModal';
import { AuditLogDetailSheet, AuditLogItem, getAuditCategoryColor, getAuditCategoryShortLabel } from '@/components/clock/setup/AuditLogDetailSheet';

import {
    CalendarEventItem,
    CalendarEventType,
    JointLeaveStatus,
    CALENDAR_CATEGORY_COLORS,
    CALENDAR_CATEGORY_LABELS,
    CALENDAR_CATEGORY_ICONS,
    CALENDAR_SOURCE_LABELS,
    getCalendarCategoryColor,
    formatFullCalendarDate,
    getFormaMasterEvents,
    getCompanyCalendarEvents,
    saveCompanyCalendarEvents,
    getJointLeaveOverrides,
    saveJointLeaveOverrides,
    getBirthdaysFromProfiles,
} from '@/lib/data/calendarEvents';
import {
    PeriodTimezoneSheet,
    PeriodSettingTarget,
    TIMEZONE_OPTIONS,
    CALCULATION_MODES,
    getDayOrdinal,
    getDynamicCutoffExample,
    PRESET_OPTIONS,
    CYCLE_TYPE_OPTIONS,
    WEEKDAY_OPTIONS,
} from '@/components/clock/setup/PeriodTimezoneSheet';

function SmoothSortButton({
    isDark,
    sortOrder,
    onPress,
}: {
    isDark: boolean;
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
                isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
            ]
        );
        return {
            backgroundColor: bg,
        };
    });

    const animatedIconStyle = useAnimatedStyle(() => {
        return {
            transform: [
                {
                    rotate: `${progress.value * 180}deg`,
                },
            ],
        };
    });

    const iconName = sortOrder === 'asc' ? 'arrow.down' : 'arrow.up';

    return (
        <TouchableOpacity activeOpacity={0.7} onPress={handlePress}>
            <Animated.View style={[s.sortButton, animatedBoxStyle]}>
                <Animated.View style={[s.centerIcon, animatedIconStyle]}>
                    <PlatformIcon name={iconName} size={16} tintColor={isDark ? '#FFFFFF' : '#000000'} />
                </Animated.View>
            </Animated.View>
        </TouchableOpacity>
    );
}

export interface ClockSetupDetailScreenProps {
    moduleId?: ClockSetupModule;
    isEmbedded?: boolean;
    onClose?: () => void;
}

export default function ClockSetupDetailScreen(props: ClockSetupDetailScreenProps = {}) {
    const params = useLocalSearchParams<{ id: string }>();
    const moduleId = props.moduleId || params.id;
    if (moduleId === 'work_schedules' || moduleId === 'leave_policies') {
        return <PeopleSetupDetailScreen moduleId={moduleId} isEmbedded={props.isEmbedded} onClose={props.onClose} />;
    }
    return <ClockOnlySetupDetailScreen {...props} />;
}

export function ClockSetupDetailPane(props: ClockSetupDetailScreenProps) {
    return <ClockSetupDetailScreen {...props} isEmbedded={true} />;
}

function ClockOnlySetupDetailScreen({ moduleId: propModuleId, isEmbedded, onClose }: ClockSetupDetailScreenProps = {}) {
    const params = useLocalSearchParams<{ id: string }>();
    const id = propModuleId || params.id;
    const insets = useSafeAreaInsets();
    const { resolvedTheme } = useTheme();
    const { profile } = useUserContext();
    const { activeTenant, updateTenant } = useTenantContext();
    const tenantBrandColor = activeTenant?.primary_color;
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';
    const borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)';
    const cardBg = isDark ? '#1C1C1E' : '#FFFFFF';
    const cardBorder = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
    const intensity = isDark ? 10 : 25;

    const [activeModule, setActiveModule] = useState<ClockSetupModule>(
        (id as ClockSetupModule) || 'work_schedules'
    );

    useEffect(() => {
        if (propModuleId && propModuleId !== activeModule) {
            setActiveModule(propModuleId);
        }
    }, [propModuleId]);

    const [searchQuery, setSearchQuery] = useState('');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Live Supabase Data
    const [workSchedules, setWorkSchedules] = useState<any[]>([]);
    const [leavePolicies, setLeavePolicies] = useState<any[]>([]);
    const [profiles, setProfiles] = useState<any[]>([]);
    const [orgDepartments, setOrgDepartments] = useState<any[]>([]);
    const [orgPositions, setOrgPositions] = useState<any[]>([]);
    const [contractTypes, setContractTypes] = useState<any[]>([]);
    const [orgLevels, setOrgLevels] = useState<any[]>([]);
    // Attendance Members Filter State
    const [memberFilter, setMemberFilter] = useState<'all' | 'included' | 'excluded'>('all');
    const [selectedDept, setSelectedDept] = useState<string>('ALL');

    // Local / Persisted Settings State
    const [attendanceRules, setAttendanceRules] = useState<AttendanceRuleConfig>(DEFAULT_ATTENDANCE_RULES);
    const [workLocations, setWorkLocations] = useState<WorkLocationItem[]>(DEFAULT_WORK_LOCATIONS);
    const [holidays, setHolidays] = useState<CompanyHolidayItem[]>(DEFAULT_HOLIDAYS);
    const [shifts, setShifts] = useState<ShiftPatternItem[]>(DEFAULT_SHIFTS);
    const [overtimeConfig, setOvertimeConfig] = useState<OvertimeConfig>(DEFAULT_OVERTIME);
    const [tripConfig, setTripConfig] = useState<BusinessTripConfig>(DEFAULT_BUSINESS_TRIP);
    const [antiFraudConfig, setAntiFraudConfig] = useState<AntiFraudConfig>(DEFAULT_ANTI_FRAUD);
    const [periodConfig, setPeriodConfig] = useState<AttendancePeriodConfig>(DEFAULT_ATTENDANCE_PERIOD);
    const [periodDraft, setPeriodDraft] = useState<AttendancePeriodConfig>(DEFAULT_ATTENDANCE_PERIOD);
    const [correctionConfig, setCorrectionConfig] = useState<AttendanceCorrectionConfig>(DEFAULT_ATTENDANCE_CORRECTION);
    const [notifConfig, setNotifConfig] = useState<NotificationSettingsConfig>(DEFAULT_NOTIFICATIONS);
    const [privacyConfig, setPrivacyConfig] = useState<PrivacyRetentionConfig>(DEFAULT_PRIVACY);
    const [privacyModalVisible, setPrivacyModalVisible] = useState(false);
    const [selectedRetentionKey, setSelectedRetentionKey] = useState<RetentionTypeKey | null>(null);
    const [remoteWorkConfig, setRemoteWorkConfig] = useState<RemoteWorkConfig>(DEFAULT_REMOTE_WORK);
    const [remotePolicyModalVisible, setRemotePolicyModalVisible] = useState(false);
    const [selectedRemotePolicyKey, setSelectedRemotePolicyKey] = useState<RemoteWorkModeKey | null>(null);

    // Audit Logs State
    const [auditSearchQuery, setAuditSearchQuery] = useState('');
    const [selectedAuditCategory, setSelectedAuditCategory] = useState<
        'All' | 'Setup Changes' | 'Requests & Approvals' | 'Attendance Corrections' | 'Security / Access'
    >('All');
    const [auditTimeFilter, setAuditTimeFilter] = useState<'all' | 'today' | 'last_7_days' | 'last_30_days' | 'this_month'>('all');
    const [selectedAuditItem, setSelectedAuditItem] = useState<AuditLogItem | null>(null);
    const [auditDetailVisible, setAuditDetailVisible] = useState(false);

    // Approval Flows State
    const [approvalConfig, setApprovalConfig] = useState<ApprovalWorkflowsConfig>(DEFAULT_APPROVAL_WORKFLOWS);
    const [expandedDeptIds, setExpandedDeptIds] = useState<Record<string, boolean>>({});
    const [approvalModalVisible, setApprovalModalVisible] = useState(false);
    const [approvalModalMode, setApprovalModalMode] = useState<'department_default' | 'override'>('department_default');
    const [selectedDeptForApprovalModal, setSelectedDeptForApprovalModal] = useState<{ id: string; name: string } | null>(null);
    const [selectedOverrideForApprovalModal, setSelectedOverrideForApprovalModal] = useState<ApprovalOverride | null>(null);

    // Shift Configuration Modal State
    const [shiftModalVisible, setShiftModalVisible] = useState(false);
    const [editingShiftItem, setEditingShiftItem] = useState<ShiftPatternItem | null>(null);
    const [selectedShiftMode, setSelectedShiftMode] = useState<ShiftMode>('no_shift');

    // Locations & Geofence Modal State & Defaults
    const [locationModalVisible, setLocationModalVisible] = useState(false);
    const [editingLocationItem, setEditingLocationItem] = useState<WorkLocationItem | null>(null);

    const orgLocationCode = useMemo(() => {
        return (activeTenant?.company_code || 'HQ1').replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase() || 'HQ1';
    }, [activeTenant?.company_code]);

    const defaultOrgLocation = useMemo<WorkLocationItem>(() => {
        return {
            id: 'loc-org-default',
            name: activeTenant?.branding_name || activeTenant?.name || 'Headquarters Jakarta',
            type: 'headquarters',
            code: orgLocationCode,
            address: activeTenant?.address || 'Jl. Sudirman Kav. 52-53, SCBD, Jakarta Selatan',
            latitude: (activeTenant as any)?.latitude != null ? Number((activeTenant as any).latitude) : -6.2088,
            longitude: (activeTenant as any)?.longitude != null ? Number((activeTenant as any).longitude) : 106.8456,
            radiusMeters: (activeTenant as any)?.attendance_radius != null ? Number((activeTenant as any).attendance_radius) : 150,
            isActive: true,
            isDefault: true,
            gmapsUrl: activeTenant?.gmaps_url || undefined,
        };
    }, [activeTenant, orgLocationCode]);

    const allWorkLocations = useMemo<WorkLocationItem[]>(() => {
        const customList = workLocations
            .filter((l) => !l.isDefault && l.id !== 'loc-org-default' && l.id !== 'loc-hq-jakarta')
            .map((l) => ({
                ...l,
                code: l.code || (l.name || 'LOC').replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase() || 'LOC',
            }));
        return [defaultOrgLocation, ...customList];
    }, [defaultOrgLocation, workLocations]);

    // Calendar & Holidays State
    const [companyEvents, setCompanyEvents] = useState<CalendarEventItem[]>([]);
    const [jointLeaveOverrides, setJointLeaveOverrides] = useState<Record<string, JointLeaveStatus>>({});
    const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);
    const [calendarCategoryFilter, setCalendarCategoryFilter] = useState<CalendarEventType | 'all'>('all');
    const [calendarViewYear, setCalendarViewYear] = useState<number>(() => new Date().getFullYear());
    const [calendarViewMonth, setCalendarViewMonth] = useState<number>(() => new Date().getMonth());
    const [calendarScopeFilter, setCalendarScopeFilter] = useState<'month' | 'year'>('month');
    const [createEventModalVisible, setCreateEventModalVisible] = useState(false);
    const [createEventInitialType, setCreateEventInitialType] = useState<CalendarEventType>('company_special');
    const [editingCalendarEvent, setEditingCalendarEvent] = useState<CalendarEventItem | null>(null);
    const [periodSheetVisible, setPeriodSheetVisible] = useState(false);
    const [periodSheetTarget, setPeriodSheetTarget] = useState<PeriodSettingTarget>('cutoff');

    // Sheet Bridge (for Work Schedules & Leave Policies)
    const [sheetVisible, setSheetVisible] = useState(false);
    const [editingItem, setEditingItem] = useState<any | null>(null);
    const [saving, setSaving] = useState(false);
    const [presetModalVisible, setPresetModalVisible] = useState(false);
    const [leavePresetModalVisible, setLeavePresetModalVisible] = useState(false);
    const [customSheetTitle, setCustomSheetTitle] = useState<string | undefined>(undefined);
    const [customSheetSubmitLabel, setCustomSheetSubmitLabel] = useState<string | undefined>(undefined);

    // Liquid Glass Toast HUD
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const toastOpacity = useSharedValue(0);
    const toastTranslateY = useSharedValue(-20);
    const toastScale = useSharedValue(0.95);

    const animatedToastStyle = useAnimatedStyle(() => ({
        opacity: toastOpacity.value,
        transform: [
            { translateY: toastTranslateY.value },
            { scale: toastScale.value },
        ],
    }));

    const showToast = useCallback((msg: string) => {
        setToastMessage(msg);
        toastOpacity.value = withTiming(1, { duration: 180 });
        toastTranslateY.value = withSpring(0, { damping: 14, stiffness: 200 });
        toastScale.value = withSpring(1, { damping: 14, stiffness: 200 });
        setTimeout(() => {
            toastOpacity.value = withTiming(0, { duration: 200 });
            toastTranslateY.value = withTiming(-14, { duration: 200 });
            toastScale.value = withTiming(0.95, { duration: 200 });
            setTimeout(() => setToastMessage(null), 220);
        }, 2200);
    }, [toastOpacity, toastTranslateY, toastScale]);

    useEffect(() => {
        if (id) {
            setActiveModule(id as ClockSetupModule);
            setSearchQuery('');
        }
    }, [id]);

    const currentItemConfig = useMemo(() => {
        return (
            CLOCK_SETUP_MENU_ITEMS.find((m) => m.id === activeModule) ||
            CLOCK_SETUP_MENU_ITEMS[0]
        );
    }, [activeModule]);

    // Dynamic segments for active module group
    const groupSegments: Segment[] = useMemo(() => {
        const groupItems = CLOCK_SETUP_MENU_ITEMS.filter((item) => item.group === currentItemConfig.group);
        return groupItems.map((item) => ({
            id: item.id,
            label: item.shortLabel || item.title,
            icon: item.icon,
        }));
    }, [currentItemConfig.group]);

    // Fetch all data
    const fetchAllData = useCallback(async () => {
        try {
            setLoading(true);
            const tenantId = activeTenant?.id;

            const [
                { data: scheds },
                leaves,
                { data: deptsData },
                { data: posData },
                { data: contractsData },
                { data: levelsData },
                { data: tenantMembers },
                savedRules,
                savedLocations,
                savedHolidays,
                savedShifts,
                savedOvertime,
                savedTrip,
                savedAntiFraud,
                savedPeriod,
                savedCorrections,
                savedNotifs,
                savedPrivacy,
                savedRemoteWork,
                savedCompanyEvents,
                savedJointLeaveOverrides,
                savedApprovalWorkflows,
            ] = await Promise.all([
                supabase.from('work_schedules').select('*').order('created_at', { ascending: true }),
                fetchLeavePolicies(),
                supabase.from('organization_departments').select('*').order('name', { ascending: true }),
                supabase.from('organization_positions').select('*, organization_departments(id, name, code, cluster_code)').order('name', { ascending: true }),
                supabase.from('employment_types').select('*').order('order_index', { ascending: true }),
                supabase.from('organization_levels').select('*').order('level_code', { ascending: true }),
                tenantId
                    ? supabase
                        .from('tenant_members')
                        .select('id, role, status, user_id, created_at')
                        .eq('tenant_id', tenantId)
                        .order('created_at', { ascending: false })
                    : Promise.resolve({ data: null }),
                getClockSetting('ATTENDANCE_RULES', DEFAULT_ATTENDANCE_RULES, tenantId),
                getClockSetting('WORK_LOCATIONS', DEFAULT_WORK_LOCATIONS, tenantId),
                getClockSetting('HOLIDAYS', DEFAULT_HOLIDAYS, tenantId),
                getClockSetting('SHIFTS', DEFAULT_SHIFTS, tenantId),
                getClockSetting('OVERTIME', DEFAULT_OVERTIME, tenantId),
                getClockSetting('BUSINESS_TRIP', DEFAULT_BUSINESS_TRIP, tenantId),
                getClockSetting('ANTI_FRAUD', DEFAULT_ANTI_FRAUD, tenantId),
                getClockSetting('ATTENDANCE_PERIOD', DEFAULT_ATTENDANCE_PERIOD, tenantId),
                getClockSetting('ATTENDANCE_CORRECTIONS', DEFAULT_ATTENDANCE_CORRECTION, tenantId),
                getClockSetting('NOTIFICATIONS', DEFAULT_NOTIFICATIONS, tenantId),
                getClockSetting('PRIVACY', DEFAULT_PRIVACY, tenantId),
                getClockSetting('REMOTE_WORK', DEFAULT_REMOTE_WORK, tenantId),
                getCompanyCalendarEvents(),
                getJointLeaveOverrides(),
                getClockSetting('APPROVAL_WORKFLOWS', DEFAULT_APPROVAL_WORKFLOWS, tenantId),
            ]);

            const isItemActive = (item: any) => item && String(item.status || 'Active').toLowerCase() === 'active';
            if (scheds) setWorkSchedules(scheds.filter(isItemActive));
            if (leaves) setLeavePolicies(leaves.filter(isItemActive));
            if (deptsData) setOrgDepartments(deptsData.filter(isItemActive));
            if (posData) setOrgPositions(posData.filter(isItemActive));
            if (contractsData) setContractTypes(contractsData.filter(isItemActive));
            if (levelsData) setOrgLevels(levelsData.filter(isItemActive));
            if (savedRemoteWork) setRemoteWorkConfig(savedRemoteWork);
            if (savedApprovalWorkflows) setApprovalConfig(savedApprovalWorkflows);

            let loadedMembers: any[] = [];
            if (tenantMembers && tenantMembers.length > 0) {
                const userIds = tenantMembers.map((tm: any) => tm.user_id).filter(Boolean);
                const { data: memberProfiles } = await supabase
                    .from('profiles')
                    .select('*')
                    .in('id', userIds);

                const profileMap = new Map((memberProfiles || []).map((p: any) => [p.id, p]));
                const deptMap = new Map((deptsData || []).map((d: any) => [d.id, d.name]));
                const posMap = new Map((posData || []).map((p: any) => [p.id, p]));

                loadedMembers = tenantMembers.map((tm: any) => {
                    const prof = profileMap.get(tm.user_id) || {};
                    let resolvedDept = prof.department;
                    let resolvedPos = prof.job_title || prof.position;

                    if (prof.position_id) {
                        const pObj: any = posMap.get(prof.position_id);
                        if (pObj?.department_id) resolvedDept = deptMap.get(pObj.department_id) || resolvedDept;
                        if (pObj) resolvedPos = pObj.name;
                    }
                    return {
                        ...prof,
                        id: tm.user_id,
                        membership_id: tm.id,
                        role: tm.role || prof.role || 'crew',
                        membership_status: tm.status || 'active',
                        department: resolvedDept || prof.department,
                        job_title: resolvedPos || prof.job_title || prof.position,
                    };
                });
            } else if (deptsData || posData) {
                const { data: allProfs } = await supabase.from('profiles').select('*').order('full_name');
                const deptMap = new Map((deptsData || []).map((d: any) => [d.id, d.name]));
                const posMap = new Map((posData || []).map((p: any) => [p.id, p]));

                loadedMembers = (allProfs || []).map((p: any) => {
                    let resolvedDept = p.department;
                    let resolvedPos = p.job_title || p.position;
                    if (p.position_id) {
                        const pObj: any = posMap.get(p.position_id);
                        if (pObj?.department_id) resolvedDept = deptMap.get(pObj.department_id) || resolvedDept;
                        if (pObj) resolvedPos = pObj.name;
                    }
                    return {
                        ...p,
                        department: resolvedDept || p.department,
                        job_title: resolvedPos || p.job_title || p.position,
                    };
                });
            } else {
                loadedMembers = profile ? [profile as any] : [];
            }

            setProfiles(loadedMembers);
            if (savedRules) setAttendanceRules(savedRules);
            if (savedLocations) setWorkLocations(savedLocations);
            if (savedHolidays) setHolidays(savedHolidays);
            if (savedShifts) setShifts(savedShifts);
            if (savedOvertime) setOvertimeConfig(savedOvertime);
            if (savedTrip) setTripConfig(savedTrip);
            if (savedAntiFraud) setAntiFraudConfig(savedAntiFraud);
            if (savedPeriod) {
                setPeriodConfig(savedPeriod);
                setPeriodDraft(savedPeriod);
            }
            if (savedCorrections) setCorrectionConfig(savedCorrections);
            if (savedNotifs) setNotifConfig(savedNotifs);
            if (savedPrivacy) {
                setPrivacyConfig({
                    ...DEFAULT_PRIVACY,
                    ...savedPrivacy,
                    locationRetention: savedPrivacy.locationRetention || {
                        preset: savedPrivacy.purgeGpsAfterDays === 7 ? '7_days'
                            : savedPrivacy.purgeGpsAfterDays === 30 ? '30_days'
                            : savedPrivacy.purgeGpsAfterDays === 180 ? '180_days'
                            : savedPrivacy.purgeGpsAfterDays === 365 ? '1_year'
                            : '90_days',
                    },
                    photoRetention: savedPrivacy.photoRetention || { preset: '90_days' },
                    auditLogRetention: savedPrivacy.auditLogRetention || {
                        preset: savedPrivacy.retentionAuditLogDays === 365 ? '1_year'
                            : savedPrivacy.retentionAuditLogDays === 180 ? '180_days'
                            : savedPrivacy.retentionAuditLogDays === 90 ? '90_days'
                            : '1_year',
                    },
                });
            }
            if (savedCompanyEvents) setCompanyEvents(savedCompanyEvents);
            if (savedJointLeaveOverrides) setJointLeaveOverrides(savedJointLeaveOverrides);
        } catch (e) {
            console.error('[ClockSetup] Error loading settings:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [activeTenant?.id, profile?.id]);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchAllData();
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
                timezone: 'Asia/Jakarta',
            };

            const { data, error } = await supabase.from('work_schedules').insert(newRecord).select().single();
            if (error) throw error;
            if (data) {
                setWorkSchedules((prev) => [...prev, data]);
                setPresetModalVisible(false);
                showToast('Preset applied successfully');
            }
        } catch (e: any) {
            console.error('[ClockSetup] Error applying preset:', e);
            Alert.alert('Error', e.message || 'Failed to apply preset');
        }
    };

    // Preset Leave Policy Template Selection -> Hydrate SwiftUI Sheet
    const handleSelectLeavePresetTemplate = (preset: LeavePolicyPresetItem) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const presetPolicyData = {
            ...preset.policy,
            name: preset.name,
            leave_type: preset.leave_type,
            status: 'Active',
            description: preset.description,
        };
        setEditingItem(presetPolicyData);
        setCustomSheetTitle('Preset Leave Policy');
        setCustomSheetSubmitLabel('Apply Policy');
        setSheetVisible(true);
    };

    // Open Add / Create
    const handleOpenCreate = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (activeModule === 'work_schedules') {
            setPresetModalVisible(true);
        } else if (activeModule === 'shift_management') {
            setEditingShiftItem(null);
            setSelectedShiftMode('custom');
            setShiftModalVisible(true);
        } else {
            setEditingItem(null);
            setCustomSheetTitle(undefined);
            setCustomSheetSubmitLabel(undefined);
            setSheetVisible(true);
        }
    };

    // Save Shift Config
    const handleSaveShiftConfig = async (item: ShiftPatternItem) => {
        let updated: ShiftPatternItem[];
        const exists = shifts.some((s) => s.id === item.id);
        if (exists) {
            updated = shifts.map((s) => (s.id === item.id ? item : s));
        } else {
            updated = [item, ...shifts];
        }
        setShifts(updated);
        await saveClockSetting('SHIFTS', updated);
        triggerDynamicIslandFeedback({
            title: item.name,
            message: 'Shift configuration saved',
            status: 'Saved',
        });
    };

    // Delete Shift Config
    const handleDeleteShiftConfig = async (item: ShiftPatternItem) => {
        const updated = shifts.filter((s) => s.id !== item.id);
        setShifts(updated);
        await saveClockSetting('SHIFTS', updated);
        triggerDynamicIslandFeedback({
            title: item.name,
            message: 'Shift configuration removed',
            status: 'Deleted',
        });
    };

    // Create new Shift Configuration via ActionSheet mode selection
    const handleCreateShiftConfig = () => {
        const SHIFT_COLORS = ['#007AFF', '#FF9500', '#5856D6', '#34C759', '#FF3B30', '#30B0C7'];

        // Find shift-type work schedules to reference
        const shiftSchedules2 = workSchedules.filter(
            (ws) => ws.type === 'Shift' && ws.days_config?.shifts?.length === 2
        );
        const shiftSchedules3 = workSchedules.filter(
            (ws) => ws.type === 'Shift' && ws.days_config?.shifts?.length === 3
        );

        const modeOptions: { label: string; mode: ShiftMode; scheduleId?: string }[] = [
            { label: 'No Shift — Regular Schedule', mode: 'no_shift' },
        ];

        if (shiftSchedules2.length > 0) {
            modeOptions.push({ label: `2-Shift — ${shiftSchedules2[0].name}`, mode: '2_shift', scheduleId: shiftSchedules2[0].id });
        } else {
            modeOptions.push({ label: '2-Shift — Create from Preset', mode: '2_shift' });
        }

        if (shiftSchedules3.length > 0) {
            modeOptions.push({ label: `3-Shift — ${shiftSchedules3[0].name}`, mode: '3_shift', scheduleId: shiftSchedules3[0].id });
        } else {
            modeOptions.push({ label: '3-Shift — Create from Preset', mode: '3_shift' });
        }

        modeOptions.push({ label: 'Custom Shift Pattern', mode: 'custom' });

        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    title: 'Select Shift Mode',
                    message: 'Choose a shift pattern. Shifts are linked to Work Schedules.',
                    options: [...modeOptions.map((o) => o.label), 'Cancel'],
                    cancelButtonIndex: modeOptions.length,
                },
                (buttonIndex) => {
                    if (buttonIndex < modeOptions.length) {
                        const selected = modeOptions[buttonIndex];
                        createShiftFromMode(selected.mode, selected.scheduleId);
                    }
                }
            );
        } else {
            Alert.alert('Select Shift Mode', 'Choose a shift pattern', [
                ...modeOptions.map((o) => ({
                    text: o.label,
                    onPress: () => createShiftFromMode(o.mode, o.scheduleId),
                })),
                { text: 'Cancel', style: 'cancel' as const },
            ]);
        }
    };

    // Create Shift Config from selected mode
    const createShiftFromMode = async (mode: ShiftMode, scheduleId?: string) => {
        const SHIFT_COLORS = ['#007AFF', '#FF9500', '#5856D6', '#34C759', '#FF3B30', '#30B0C7'];

        const buildShiftName = (m: ShiftMode) => {
            switch (m) {
                case 'no_shift': return 'No Shift';
                case '2_shift': return '2-Shift Rotation';
                case '3_shift': return '3-Shift Rotation';
                case 'custom': return 'Custom Shift';
            }
        };

        let newShift: ShiftPatternItem;

        if (mode === 'no_shift') {
            newShift = {
                id: `shift-${Date.now()}`,
                name: buildShiftName(mode),
                mode,
                shifts: [],
                rotation: 'weekly',
                workDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
                restDays: ['Sat', 'Sun'],
                appliesTo: 'all_employees',
                appliesToValues: [],
                appliesToDisplay: 'All Employees',
                isActive: true,
            };
        } else if (mode === '2_shift' || mode === '3_shift') {
            // Try to find matching work schedule
            const targetCount = mode === '2_shift' ? 2 : 3;
            let sourceSchedule = scheduleId
                ? workSchedules.find((ws) => ws.id === scheduleId)
                : workSchedules.find(
                    (ws) => ws.type === 'Shift' && ws.days_config?.shifts?.length === targetCount
                );

            if (!sourceSchedule) {
                // No matching schedule exists — create from preset
                const presetId = mode === '2_shift' ? '2-shift-schedule' : '3-shift-schedule';
                const preset = WORK_SCHEDULE_PRESETS.find((p) => p.id === presetId);
                if (preset) {
                    try {
                        const newRecord = {
                            name: preset.name,
                            type: preset.type,
                            start_time: preset.start_time,
                            end_time: preset.end_time,
                            break_duration_minutes: preset.break_duration_minutes,
                            days_config: preset.days_config,
                            status: 'Active',
                            timezone: 'Asia/Jakarta',
                        };
                        const { data, error } = await supabase.from('work_schedules').insert(newRecord).select().single();
                        if (error) throw error;
                        sourceSchedule = data;
                        setWorkSchedules((prev) => [...prev, data]);
                    } catch (e: any) {
                        Alert.alert('Error', `Failed to create ${mode} schedule: ${e.message}`);
                        return;
                    }
                }
            }

            const shiftDefs = sourceSchedule?.days_config?.shifts || [];
            const shiftEntries = shiftDefs.map((sh: any, idx: number) => {
                const startH = parseInt(sh.start?.split(':')[0] || '0', 10);
                const endH = parseInt(sh.end?.split(':')[0] || '0', 10);
                return {
                    name: sh.name || `Shift ${idx + 1}`,
                    startTime: (sh.start || '06:00').substring(0, 5),
                    endTime: (sh.end || '14:00').substring(0, 5),
                    crossesMidnight: endH < startH,
                    color: SHIFT_COLORS[idx % SHIFT_COLORS.length],
                };
            });

            newShift = {
                id: `shift-${Date.now()}`,
                name: buildShiftName(mode),
                mode,
                sourceScheduleId: sourceSchedule?.id,
                sourceScheduleName: sourceSchedule?.name,
                shifts: shiftEntries,
                rotation: 'weekly',
                workDays: sourceSchedule?.days_config?.working_days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
                restDays: ['Sat', 'Sun'].filter(
                    (d) => !(sourceSchedule?.days_config?.working_days || []).includes(d)
                ),
                appliesTo: 'all_employees',
                appliesToValues: [],
                appliesToDisplay: 'All Employees',
                isActive: true,
            };
        } else {
            // Custom mode
            newShift = {
                id: `shift-${Date.now()}`,
                name: buildShiftName(mode),
                mode,
                shifts: [
                    { name: 'Shift 1', startTime: '08:00', endTime: '16:00', crossesMidnight: false, color: SHIFT_COLORS[0] },
                    { name: 'Shift 2', startTime: '16:00', endTime: '00:00', crossesMidnight: false, color: SHIFT_COLORS[1] },
                ],
                rotation: 'weekly',
                workDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
                restDays: ['Sat', 'Sun'],
                appliesTo: 'all_employees',
                appliesToValues: [],
                appliesToDisplay: 'All Employees',
                isActive: true,
            };
        }

        const updated = [...shifts, newShift];
        setShifts(updated);
        await saveClockSetting('SHIFTS', updated);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    // Update Applies To for a shift
    const handleShiftAppliesTo = (shiftItem: ShiftPatternItem) => {
        const options: { label: string; value: ShiftAppliesTo }[] = [
            { label: 'All Employees', value: 'all_employees' },
            { label: 'Department', value: 'department' },
            { label: 'Position / Level', value: 'position' },
            { label: 'Employment Type', value: 'employment_type' },
            { label: 'Specific Employees', value: 'specific_employees' },
        ];

        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    title: 'Applies To',
                    message: 'Who should this shift apply to?',
                    options: [...options.map((o) => o.label), 'Cancel'],
                    cancelButtonIndex: options.length,
                },
                (buttonIndex) => {
                    if (buttonIndex < options.length) {
                        const selected = options[buttonIndex];
                        if (selected.value === 'all_employees') {
                            applyShiftAppliesTo(shiftItem, selected.value, [], 'All Employees');
                        } else if (selected.value === 'department') {
                            showDepartmentPicker(shiftItem);
                        } else if (selected.value === 'position') {
                            showPositionPicker(shiftItem);
                        } else if (selected.value === 'employment_type') {
                            showContractTypePicker(shiftItem);
                        } else if (selected.value === 'specific_employees') {
                            applyShiftAppliesTo(shiftItem, selected.value, [], 'Select Employees');
                        }
                    }
                }
            );
        } else {
            Alert.alert('Applies To', 'Who should this shift apply to?', [
                ...options.map((o) => ({
                    text: o.label,
                    onPress: () => {
                        if (o.value === 'all_employees') {
                            applyShiftAppliesTo(shiftItem, o.value, [], 'All Employees');
                        } else if (o.value === 'department') {
                            showDepartmentPicker(shiftItem);
                        } else if (o.value === 'position') {
                            showPositionPicker(shiftItem);
                        } else if (o.value === 'employment_type') {
                            showContractTypePicker(shiftItem);
                        } else {
                            applyShiftAppliesTo(shiftItem, o.value, [], 'Select Employees');
                        }
                    },
                })),
                { text: 'Cancel', style: 'cancel' as const },
            ]);
        }
    };

    const showDepartmentPicker = (shiftItem: ShiftPatternItem) => {
        const deptNames = orgDepartments.map((d: any) => d.name || d.code || 'Unknown');
        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                { title: 'Select Department', options: [...deptNames, 'Cancel'], cancelButtonIndex: deptNames.length },
                (idx) => {
                    if (idx < deptNames.length) {
                        const dept = orgDepartments[idx];
                        applyShiftAppliesTo(shiftItem, 'department', [dept.id], dept.name || dept.code);
                    }
                }
            );
        } else {
            Alert.alert('Select Department', undefined, [
                ...orgDepartments.map((d: any) => ({
                    text: d.name || d.code,
                    onPress: () => applyShiftAppliesTo(shiftItem, 'department', [d.id], d.name || d.code),
                })),
                { text: 'Cancel', style: 'cancel' as const },
            ]);
        }
    };

    const showPositionPicker = (shiftItem: ShiftPatternItem) => {
        const posNames = orgPositions.map((p: any) => p.name || 'Unknown');
        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                { title: 'Select Position', options: [...posNames, 'Cancel'], cancelButtonIndex: posNames.length },
                (idx) => {
                    if (idx < posNames.length) {
                        const pos = orgPositions[idx];
                        applyShiftAppliesTo(shiftItem, 'position', [pos.id], pos.name);
                    }
                }
            );
        } else {
            Alert.alert('Select Position', undefined, [
                ...orgPositions.map((p: any) => ({
                    text: p.name,
                    onPress: () => applyShiftAppliesTo(shiftItem, 'position', [p.id], p.name),
                })),
                { text: 'Cancel', style: 'cancel' as const },
            ]);
        }
    };

    const showContractTypePicker = (shiftItem: ShiftPatternItem) => {
        const typeNames = contractTypes.map((c: any) => c.name || c.label || 'Unknown');
        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                { title: 'Select Employment Type', options: [...typeNames, 'Cancel'], cancelButtonIndex: typeNames.length },
                (idx) => {
                    if (idx < typeNames.length) {
                        const ct = contractTypes[idx];
                        applyShiftAppliesTo(shiftItem, 'employment_type', [ct.id], ct.name || ct.label);
                    }
                }
            );
        } else {
            Alert.alert('Select Employment Type', undefined, [
                ...contractTypes.map((c: any) => ({
                    text: c.name || c.label,
                    onPress: () => applyShiftAppliesTo(shiftItem, 'employment_type', [c.id], c.name || c.label),
                })),
                { text: 'Cancel', style: 'cancel' as const },
            ]);
        }
    };

    const applyShiftAppliesTo = async (shiftItem: ShiftPatternItem, appliesTo: ShiftAppliesTo, values: string[], display: string) => {
        const updated = shifts.map((s) =>
            s.id === shiftItem.id ? { ...s, appliesTo, appliesToValues: values, appliesToDisplay: display } : s
        );
        setShifts(updated);
        await saveClockSetting('SHIFTS', updated);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    // Toggle Shift Active/Inactive
    const handleToggleShiftActive = async (shiftItem: ShiftPatternItem) => {
        const updated = shifts.map((s) =>
            s.id === shiftItem.id ? { ...s, isActive: !s.isActive } : s
        );
        setShifts(updated);
        await saveClockSetting('SHIFTS', updated);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    // Long press for shift cards
    const handleShiftLongPress = (item: ShiftPatternItem) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (Platform.OS === 'ios') {
            const isActive = item.isActive;
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    title: item.name,
                    message: `${getModeLabel(item.mode)} · ${item.appliesToDisplay || 'All Employees'}`,
                    options: [
                        'Set Applies To',
                        isActive ? 'Deactivate' : 'Activate',
                        'Delete',
                        'Cancel',
                    ],
                    destructiveButtonIndex: 2,
                    cancelButtonIndex: 3,
                },
                (buttonIndex) => {
                    if (buttonIndex === 0) handleShiftAppliesTo(item);
                    if (buttonIndex === 1) handleToggleShiftActive(item);
                    if (buttonIndex === 2) handleDeleteRecord(item, 'Shift Pattern');
                }
            );
        } else {
            Alert.alert(item.name, `${getModeLabel(item.mode)} · ${item.appliesToDisplay || 'All Employees'}`, [
                { text: 'Set Applies To', onPress: () => handleShiftAppliesTo(item) },
                { text: item.isActive ? 'Deactivate' : 'Activate', onPress: () => handleToggleShiftActive(item) },
                { text: 'Delete', style: 'destructive', onPress: () => handleDeleteRecord(item, 'Shift Pattern') },
                { text: 'Cancel', style: 'cancel' },
            ]);
        }
    };

    const getModeLabel = (mode: ShiftMode): string => {
        switch (mode) {
            case 'no_shift': return 'No Shift';
            case '2_shift': return '2-Shift';
            case '3_shift': return '3-Shift';
            case 'custom': return 'Custom';
        }
    };

    // Open Edit Sheet
    const handleOpenEdit = (item: any) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setEditingItem(item);
        setCustomSheetTitle(undefined);
        setCustomSheetSubmitLabel(undefined);
        setSheetVisible(true);
    };

    // Delete Record (Supabase or Local)
    const handleDeleteRecord = (item: any, customTitle?: string) => {
        const itemTypeName = customTitle || currentItemConfig.title;
        Alert.alert('Delete Confirmation', `Are you sure you want to remove this ${itemTypeName}?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        if (activeModule === 'work_schedules') {
                            await supabase.from('work_schedules').delete().eq('id', item.id);
                            setWorkSchedules((prev) => prev.filter((p) => p.id !== item.id));
                        } else if (activeModule === 'leave_policies') {
                            await deleteLeavePolicy(item.id);
                            setLeavePolicies((prev) => prev.filter((p) => p.id !== item.id));
                        } else if (activeModule === 'work_locations') {
                            if (item.isDefault || item.id === 'loc-org-default') {
                                Alert.alert('Cannot Delete Default Location', 'The default Organization Location cannot be deleted from Clock setup.');
                                return;
                            }
                            const updated = workLocations.filter((w) => w.id !== item.id && !w.isDefault);
                            setWorkLocations(updated);
                            await saveClockSetting('WORK_LOCATIONS', updated);
                        } else if (activeModule === 'holidays') {
                            const updated = holidays.filter((h) => h.id !== item.id);
                            setHolidays(updated);
                            await saveClockSetting('HOLIDAYS', updated);
                        } else if (activeModule === 'shift_management') {
                            const updated = shifts.filter((s) => s.id !== item.id);
                            setShifts(updated);
                            await saveClockSetting('SHIFTS', updated);
                        }
                    } catch (e: any) {
                        Alert.alert('Error', e.message || 'Failed to delete record');
                    }
                },
            },
        ]);
    };

    // Long Press Action Menu
    const handleCardLongPress = (item: any, customTitle?: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const itemTypeName = customTitle || currentItemConfig.title;

        if (Platform.OS === 'ios') {
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
                                fetchAllData();
                                Alert.alert('Duplicated', `Created a copy of "${item.name}".`);
                            } catch (e: any) {
                                Alert.alert('Error', e.message || 'Failed to duplicate policy');
                            }
                        } else if (buttonIndex === 3) {
                            try {
                                await toggleLeavePolicyStatus(item.id, !isCurrentlyActive);
                                fetchAllData();
                                Alert.alert(isCurrentlyActive ? 'Policy Disabled' : 'Policy Enabled', `"${item.name}" is now ${isCurrentlyActive ? 'Inactive' : 'Active'}.`);
                            } catch (e: any) {
                                Alert.alert('Error', e.message || 'Failed to update policy status');
                            }
                        } else if (buttonIndex === 4) {
                            handleDeleteRecord(item, customTitle);
                        }
                    }
                );
                return;
            }

            ActionSheetIOS.showActionSheetWithOptions(
                {
                    title: item.name || item.title || item.code,
                    options: ['Cancel', `Edit ${itemTypeName}`, `Delete ${itemTypeName}`],
                    destructiveButtonIndex: 2,
                    cancelButtonIndex: 0,
                },
                (buttonIndex) => {
                    if (buttonIndex === 1) {
                        handleOpenEdit(item);
                    } else if (buttonIndex === 2) {
                        handleDeleteRecord(item, customTitle);
                    }
                }
            );
        } else {
            handleDeleteRecord(item, customTitle);
        }
    };

    // Quick Update helper for setting configs
    const updateSettingAndSave = async <T,>(
        key: 'ATTENDANCE_RULES' | 'ANTI_FRAUD' | 'ATTENDANCE_PERIOD' | 'ATTENDANCE_CORRECTIONS' | 'REMOTE_WORK' | 'OVERTIME' | 'BUSINESS_TRIP' | 'NOTIFICATIONS' | 'PRIVACY',
        setter: React.Dispatch<React.SetStateAction<T>>,
        newVal: T
    ) => {
        setter(newVal);
        showToast('Settings saved successfully');
        triggerDynamicIslandFeedback({
            title: currentItemConfig.title || 'Attendance Rules',
            message: 'Settings saved successfully',
            status: 'Saved',
        });
        try {
            await saveClockSetting(key, newVal, tenantId);
        } catch (e) {
            Alert.alert('Error', 'Failed to save configuration');
        }
    };

    // Calendar computed aggregated events
    const allCalendarEvents = useMemo<CalendarEventItem[]>(() => {
        const formaEvents = getFormaMasterEvents().map((ev) => {
            if (ev.type === 'joint_leave') {
                const override = jointLeaveOverrides[ev.id];
                return {
                    ...ev,
                    jointLeaveStatus: override || ev.jointLeaveStatus || 'applied',
                };
            }
            return ev;
        });

        const normalizedCompanyEvents = companyEvents.map((ev) => {
            if (ev.type === 'birthday') {
                const rawDate = ev.originalDate || ev.date;
                const parts = rawDate.split('-');
                if (parts.length === 3) {
                    const birthYear = parseInt(parts[0], 10);
                    const mm = parts[1];
                    const dd = parts[2];
                    const age = birthYear > 0 && birthYear < calendarViewYear ? calendarViewYear - birthYear : null;
                    const rawName = ev.personName || ev.title.replace(/'s Birthday$/i, '');
                    const cleanTitle = `${rawName}'s Birthday`;
                    return {
                        ...ev,
                        title: cleanTitle,
                        date: `${calendarViewYear}-${mm}-${dd}`,
                        originalDate: rawDate,
                        subtitleId: age !== null && age > 0 ? `Turning ${age} years old` : undefined,
                    };
                }
            } else if (ev.isRecurring) {
                const rawDate = ev.originalDate || ev.date;
                const parts = rawDate.split('-');
                if (parts.length === 3) {
                    return {
                        ...ev,
                        date: `${calendarViewYear}-${parts[1]}-${parts[2]}`,
                        originalDate: rawDate,
                    };
                }
            }
            return ev;
        });

        const effectiveProfiles = profiles.length > 0 ? profiles : (profile ? [profile] : []);
        const birthdays = getBirthdaysFromProfiles(effectiveProfiles, calendarViewYear);
        return [...formaEvents, ...normalizedCompanyEvents, ...birthdays];
    }, [jointLeaveOverrides, companyEvents, profiles, profile, calendarViewYear]);

    const handleSaveCalendarEvent = async (event: CalendarEventItem) => {
        let updated: CalendarEventItem[];
        const existsIndex = companyEvents.findIndex((ev) => ev.id === event.id);
        if (existsIndex >= 0) {
            updated = [...companyEvents];
            updated[existsIndex] = event;
        } else {
            updated = [event, ...companyEvents];
        }
        setCompanyEvents(updated);
        setEditingCalendarEvent(null);
        try {
            await saveCompanyCalendarEvents(updated);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (e) {
            Alert.alert('Error', 'Failed to save event');
        }
    };

    const handleToggleJointLeave = async (event: CalendarEventItem) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const currentStatus = event.jointLeaveStatus || 'applied';
        const nextStatus: JointLeaveStatus = currentStatus === 'applied' ? 'ignored' : 'applied';
        const updated = {
            ...jointLeaveOverrides,
            [event.id]: nextStatus,
        };
        setJointLeaveOverrides(updated);
        try {
            await saveJointLeaveOverrides(updated);
        } catch (e) {
            Alert.alert('Error', 'Failed to update joint leave status');
        }
    };

    const handleDeleteCompanyEvent = async (eventId: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const updated = companyEvents.filter((ev) => ev.id !== eventId);
        setCompanyEvents(updated);
        try {
            await saveCompanyCalendarEvents(updated);
        } catch (e) {
            Alert.alert('Error', 'Failed to delete event');
        }
    };

    // Audit Log Export Handler
    const handleExportAuditLogs = useCallback(
        async (format: 'csv' | 'json' | 'summary') => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            const orgPrefix = (activeTenant?.company_code || 'JCP')
                .replace(/[^A-Za-z0-9]/g, '')
                .slice(0, 3)
                .toUpperCase() || 'JCP';

            const baseLogs: Array<AuditLogItem & { dateKey: 'today' | 'last_7_days' | 'last_30_days' | 'this_month' }> = [];

            const filtered = baseLogs.filter((item) => {
                if (selectedAuditCategory !== 'All' && item.category !== selectedAuditCategory) return false;
                if (auditTimeFilter === 'today' && item.dateKey !== 'today') return false;
                if (auditSearchQuery.trim()) {
                    const query = auditSearchQuery.toLowerCase().trim();
                    const matchActor = item.actor.toLowerCase().includes(query);
                    const matchAction = item.action.toLowerCase().includes(query);
                    const matchDetail = item.detail.toLowerCase().includes(query);
                    const matchCategory = item.category.toLowerCase().includes(query);
                    const matchTime = item.time.toLowerCase().includes(query);
                    const matchEmployee = item.relatedEmployee?.toLowerCase().includes(query);
                    const matchId = item.id.toLowerCase().includes(query);
                    return matchActor || matchAction || matchDetail || matchCategory || matchTime || matchEmployee || matchId;
                }
                return true;
            });

            if (format === 'csv') {
                const header = 'Record ID,Actor,Role,Action,Detail,Category,Time\n';
                const rows = filtered
                    .map((l) => `"${l.id}","${l.actor}","${l.actorRole || ''}","${l.action}","${l.detail}","${l.category}","${l.time}"`)
                    .join('\n');
                await Share.share({
                    title: 'Audit Log Export (CSV)',
                    message: header + rows,
                });
            } else if (format === 'json') {
                await Share.share({
                    title: 'Audit Log Export (JSON)',
                    message: JSON.stringify(filtered, null, 2),
                });
            } else {
                const summary = filtered
                    .map((l) => `[${l.time}] ${l.actor} - ${l.action} (${l.detail}) [${l.id}]`)
                    .join('\n');
                await Share.share({
                    title: 'Audit Log Summary',
                    message: `Audit Trail Report (${filtered.length} Records)\n\n${summary}`,
                });
            }
        },
        [activeTenant?.company_code, selectedAuditCategory, auditTimeFilter, auditSearchQuery]
    );

    // Header Toolbar Actions
    const toolbarActions = useMemo(() => {
        const actions: any[] = [];
        if (activeModule === 'work_schedules' || activeModule === 'leave_policies') {
            actions.push({
                id: 'add',
                icon: 'add',
                image: 'plus',
                isPrimary: true,
                tintColor: '#007AFF',
                title: 'Add',
                onPress: () => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setCustomSheetTitle(undefined);
                    setCustomSheetSubmitLabel(undefined);
                    setEditingItem(null);
                    setSheetVisible(true);
                },
            });
        } else if (activeModule === 'shift_management') {
            actions.push({
                id: 'add_shift',
                icon: 'add',
                image: 'plus',
                isPrimary: true,
                tintColor: '#007AFF',
                title: 'Add Shift',
                onPress: () => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setEditingShiftItem(null);
                    setSelectedShiftMode('custom');
                    setShiftModalVisible(true);
                },
            });
        } else if (activeModule === 'work_locations') {
            actions.push({
                id: 'add_location',
                icon: 'add',
                image: 'plus',
                isPrimary: true,
                tintColor: '#007AFF',
                title: 'Add Location',
                onPress: () => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setEditingLocationItem(null);
                    setLocationModalVisible(true);
                },
            });
        } else if (activeModule === 'holidays') {
            actions.push({
                id: 'add_event',
                icon: 'add',
                image: 'plus',
                isPrimary: true,
                tintColor: '#007AFF',
                title: 'Add Event',
                onPress: () => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setEditingCalendarEvent(null);
                    setCreateEventInitialType('company_special');
                    setCreateEventModalVisible(true);
                },
            });
        } else if (activeModule === 'audit_logs') {
            actions.push({
                id: 'export_audit_logs',
                icon: 'share-outline',
                image: 'square.and.arrow.up',
                tintColor: textColor,
                title: 'Export',
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
            });
        }
        return actions;
    }, [activeModule, handleExportAuditLogs, isDark]);

    // RENDERERS FOR EACH MODULE

    // 1. Attendance Members (100% Read-Only Viewer, Sourced from People & Organization Settings)
    const renderAttendanceMembers = () => {
        const isMemberExcluded = (m: any) => {
            const isSystem = (m.account_type || '').toLowerCase() === 'system' || m.role === 'system';
            const isInactive =
                (m.status || m.employment_status || m.tenant_status || '').toLowerCase() === 'inactive' ||
                (m.status || m.employment_status || m.tenant_status || '').toLowerCase() === 'terminated' ||
                (m.status || m.employment_status || m.tenant_status || '').toLowerCase() === 'resigned' ||
                m.is_active === false;
            const isExcludedFromPerf = m.include_in_performance === false || m.include_in_attendance === false;
            return isSystem || isInactive || isExcludedFromPerf;
        };

        const getExclusionBadge = (m: any) => {
            const isSystem = (m.account_type || '').toLowerCase() === 'system' || m.role === 'system';
            if (isSystem) return { label: 'System Account', color: '#8E8E93', bg: isDark ? 'rgba(142,142,147,0.18)' : 'rgba(142,142,147,0.12)' };
            const isInactive = (m.status || m.employment_status || m.tenant_status || '').toLowerCase() === 'inactive' || m.is_active === false;
            if (isInactive) return { label: 'Inactive', color: '#FF453A', bg: isDark ? 'rgba(255,69,58,0.18)' : 'rgba(255,69,58,0.12)' };
            if (m.include_in_performance === false || m.include_in_attendance === false) {
                return { label: 'Excluded', color: '#FF9F0A', bg: isDark ? 'rgba(255,159,10,0.18)' : 'rgba(255,159,10,0.12)' };
            }
            return { label: 'Excluded', color: '#8E8E93', bg: isDark ? 'rgba(142,142,147,0.18)' : 'rgba(142,142,147,0.12)' };
        };

        const total = profiles.length;
        const excludedCount = profiles.filter(isMemberExcluded).length;
        const includedCount = total - excludedCount;

        // Unique departments
        const deptsSet = new Set<string>();
        profiles.forEach((p) => {
            if (p.department && p.department.trim()) {
                deptsSet.add(p.department.trim());
            }
        });
        const departmentsList = Array.from(deptsSet).sort((a, b) => a.localeCompare(b));

        const handleOpenTypeFilter = () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (Platform.OS === 'ios') {
                const options = ['All Members', `Included (${includedCount})`, `Excluded (${excludedCount})`, 'Cancel'];
                ActionSheetIOS.showActionSheetWithOptions(
                    {
                        options,
                        cancelButtonIndex: 3,
                        title: 'Filter Inclusion Type',
                    },
                    (buttonIndex) => {
                        if (buttonIndex === 0) setMemberFilter('all');
                        else if (buttonIndex === 1) setMemberFilter('included');
                        else if (buttonIndex === 2) setMemberFilter('excluded');
                    }
                );
            } else {
                Alert.alert('Filter Type', 'Select membership inclusion type', [
                    { text: 'All Members', onPress: () => setMemberFilter('all') },
                    { text: `Included (${includedCount})`, onPress: () => setMemberFilter('included') },
                    { text: `Excluded (${excludedCount})`, onPress: () => setMemberFilter('excluded') },
                    { text: 'Cancel', style: 'cancel' },
                ]);
            }
        };

        const handleOpenDeptFilter = () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (Platform.OS === 'ios') {
                const options = ['All Departments', ...departmentsList, 'Cancel'];
                ActionSheetIOS.showActionSheetWithOptions(
                    {
                        options,
                        cancelButtonIndex: options.length - 1,
                        title: 'Filter Department',
                    },
                    (buttonIndex) => {
                        if (buttonIndex === 0) {
                            setSelectedDept('ALL');
                        } else if (buttonIndex < options.length - 1) {
                            setSelectedDept(departmentsList[buttonIndex - 1]);
                        }
                    }
                );
            } else {
                Alert.alert('Filter Department', 'Select department to filter', [
                    { text: 'All Departments', onPress: () => setSelectedDept('ALL') },
                    ...departmentsList.map((d) => ({
                        text: d,
                        onPress: () => setSelectedDept(d),
                    })),
                    { text: 'Cancel', style: 'cancel' as const },
                ]);
            }
        };

        const getInitials = (nameOrEmail?: string) => {
            if (!nameOrEmail) return 'TM';
            const clean = nameOrEmail.trim();
            const parts = clean.split(/\s+/).filter(Boolean);
            if (parts.length >= 2 && parts[0] && parts[1]) {
                return (parts[0][0] + parts[1][0]).toUpperCase();
            }
            return clean.slice(0, 2).toUpperCase();
        };

        const primaryBrandColor = activeTenant?.primary_color || (isDark ? '#0A84FF' : '#007AFF');

        const getDeptShortCode = (deptName?: string) => {
            if (!deptName || deptName === 'ALL') return 'Dept';
            const cleanName = deptName.trim();
            const foundDept = orgDepartments.find(
                (d: any) =>
                    d.name?.toLowerCase() === cleanName.toLowerCase() ||
                    d.id === cleanName
            );
            if (foundDept?.code && foundDept.code.trim()) {
                const rawCode = foundDept.code.trim().replace(/^\d+-/, '');
                if (rawCode) return rawCode.toUpperCase();
            }
            const words = cleanName
                .split(/[\s,/-]+/)
                .filter((w: string) => w && !['and', 'or', '&', 'of', 'the'].includes(w.toLowerCase()));

            if (words.length >= 2) {
                const initials = words.map((w: string) => w[0]).join('').toUpperCase();
                if (initials.length >= 2 && initials.length <= 4) return initials;
            }
            return cleanName.slice(0, 3).toUpperCase();
        };

        const filteredProfiles = profiles
            .filter((p) => {
                const isExcluded = isMemberExcluded(p);
                if (memberFilter === 'included' && isExcluded) return false;
                if (memberFilter === 'excluded' && !isExcluded) return false;

                if (selectedDept !== 'ALL') {
                    if ((p.department || '').trim().toLowerCase() !== selectedDept.toLowerCase()) return false;
                }

                if (!searchQuery) return true;
                const q = searchQuery.toLowerCase();
                const dept = (p.department || '').toLowerCase();
                const pos = (p.job_title || p.position || p.role || '').toLowerCase();
                return (
                    (p.full_name && p.full_name.toLowerCase().includes(q)) ||
                    (p.nickname && p.nickname.toLowerCase().includes(q)) ||
                    (p.email && p.email.toLowerCase().includes(q)) ||
                    dept.includes(q) ||
                    pos.includes(q)
                );
            })
            .sort((a, b) => {
                const nameA = a.full_name || a.nickname || '';
                const nameB = b.full_name || b.nickname || '';
                return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
            });

        const typeFilterLabel = memberFilter === 'included' ? 'Included' : memberFilter === 'excluded' ? 'Excluded' : 'Type';
        const deptFilterLabel = getDeptShortCode(selectedDept);

        const typeActions: ContextMenuAction[] = [
            { title: 'All Types', selected: memberFilter === 'all' },
            { title: `Included (${includedCount})`, selected: memberFilter === 'included' },
            { title: `Excluded (${excludedCount})`, selected: memberFilter === 'excluded' },
        ];

        const deptActions: ContextMenuAction[] = [
            { title: 'All Departments', selected: selectedDept === 'ALL' },
            ...departmentsList.map((d) => ({
                title: d,
                selected: selectedDept.toLowerCase() === d.toLowerCase(),
            })),
        ];

        return (
            <View style={{ gap: 10 }}>
                {/* 1. Single Top Row: Search Bar | Type (Popup Menu) | Dept (Popup Menu) | Sort */}
                <View style={s.unifiedMemberToolbar}>
                    {/* Search Input */}
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
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            clearButtonMode="while-editing"
                            autoCapitalize="none"
                        />
                    </View>

                    {/* Type Filter (Native Menu) */}
                    <ContextMenu
                        actions={typeActions}
                        onPress={(e) => {
                            Haptics.selectionAsync();
                            if (e.nativeEvent.index === 0) setMemberFilter('all');
                            else if (e.nativeEvent.index === 1) setMemberFilter('included');
                            else if (e.nativeEvent.index === 2) setMemberFilter('excluded');
                        }}
                        dropdownMenuMode={true}
                    >
                        <View
                            style={[
                                s.toolbarFilterBtn,
                                { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
                            ]}
                        >
                            <Text
                                style={[
                                    s.toolbarFilterBtnText,
                                    { color: textColor },
                                ]}
                                numberOfLines={1}
                            >
                                {typeFilterLabel}
                            </Text>
                            <PlatformIcon
                                name="chevron.down"
                                size={10}
                                tintColor={subtextColor}
                            />
                        </View>
                    </ContextMenu>

                    {/* Department Filter (Native Menu) */}
                    <ContextMenu
                        actions={deptActions}
                        onPress={(e) => {
                            Haptics.selectionAsync();
                            if (e.nativeEvent.index === 0) {
                                setSelectedDept('ALL');
                            } else if (e.nativeEvent.index > 0 && e.nativeEvent.index <= departmentsList.length) {
                                setSelectedDept(departmentsList[e.nativeEvent.index - 1]);
                            }
                        }}
                        dropdownMenuMode={true}
                    >
                        <View
                            style={[
                                s.toolbarFilterBtn,
                                { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
                            ]}
                        >
                            <Text
                                style={[
                                    s.toolbarFilterBtnText,
                                    { color: textColor },
                                ]}
                                numberOfLines={1}
                            >
                                {deptFilterLabel}
                            </Text>
                            <PlatformIcon
                                name="chevron.down"
                                size={10}
                                tintColor={subtextColor}
                            />
                        </View>
                    </ContextMenu>

                    {/* Sort Button */}
                    <SmoothSortButton
                        isDark={isDark}
                        sortOrder={sortOrder}
                        onPress={() => {
                            setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                        }}
                    />
                </View>

                {/* 2. Individual Member Cards List (1 card per person) */}
                {filteredProfiles.length === 0 ? (
                    <View style={[
                            s.memberIndividualCard,
                            {
                                paddingVertical: 32,
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: cardBg,
                                borderColor: cardBorder,
                            },
                        ]}
                    >
                        <Text style={{ color: subtextColor, fontSize: 14 }}>
                            No members found matching the selected filter.
                        </Text>
                    </View>
                ) : (
                    <View style={{ gap: 8 }}>
                        {filteredProfiles.map((member) => {
                            const excluded = isMemberExcluded(member);
                            const badge = excluded ? getExclusionBadge(member) : null;
                            const deptShort = getDeptShortCode(member.department);
                            const resolvedPos = (member.job_title || member.position || member.role || '').trim();
                            const subtitle = [deptShort !== 'Dept' ? deptShort : '', resolvedPos].filter(Boolean).join(' · ') || 'Team Member';

                            return (
                                <View
                                    key={member.id}
                                    style={[
                                        s.memberIndividualCard,
                                        {
                                            backgroundColor: cardBg,
                                            borderColor: cardBorder,
                                        },
                                    ]}
                                >
                                    {/* Avatar */}
                                    {member.avatar_url ? (
                                        <Image source={{ uri: member.avatar_url }} style={s.compactMemberAvatar} />
                                    ) : (
                                        <View
                                            style={[
                                                s.compactMemberAvatarFallback,
                                                { backgroundColor: primaryBrandColor },
                                            ]}
                                        >
                                            <Text style={s.compactMemberAvatarText}>
                                                {getInitials(member.full_name || member.nickname || member.email)}
                                            </Text>
                                        </View>
                                    )}

                                    {/* Info Column */}
                                    <View style={{ flex: 1, gap: 2, marginLeft: 12 }}>
                                        <Text style={[s.compactMemberName, { color: textColor }]} numberOfLines={1}>
                                            {member.full_name || member.nickname || 'Unnamed Member'}
                                        </Text>
                                        <Text style={[s.compactMemberEmail, { color: subtextColor }]} numberOfLines={1}>
                                            {member.email || '—'}
                                        </Text>
                                        <Text style={[s.compactMemberSubtitle, { color: isDark ? '#A1A1A6' : '#6C6C70' }]} numberOfLines={1}>
                                            {subtitle}
                                        </Text>
                                    </View>

                                    {/* Status Pill */}
                                    {excluded && badge ? (
                                        <View style={[s.compactBadgePill, { backgroundColor: badge.bg }]}>
                                            <Text style={[s.compactBadgeText, { color: badge.color }]}>
                                                {badge.label}
                                            </Text>
                                        </View>
                                    ) : (
                                        <View
                                            style={[
                                                s.compactBadgePill,
                                                { backgroundColor: isDark ? 'rgba(52,199,89,0.15)' : 'rgba(52,199,89,0.12)' },
                                            ]}
                                        >
                                            <View style={s.compactGreenDot} />
                                            <Text style={[s.compactBadgeText, { color: '#34C759' }]}>
                                                Included
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            );
                        })}
                    </View>
                )}

                {/* Read-Only Source of Truth Footnote */}
                <View style={s.readOnlyFootnoteContainer}>
                    <PlatformIcon name="lock.fill" size={12} tintColor={subtextColor} />
                    <Text style={[s.readOnlyFootnoteText, { color: subtextColor }]}>
                        Attendance eligibility is synchronized directly from People. All changes must be made in member profile settings.
                    </Text>
                </View>
            </View>
        );
    };

    // 2. Work Schedules (3-Column Table Card Style)
    const renderWorkSchedules = () => {
        const cleanTime = (t?: string) => {
            if (!t) return '09:00';
            return t.substring(0, 5);
        };

        const filteredSchedules = workSchedules
            .filter((s) => {
                if (!searchQuery) return true;
                const q = searchQuery.toLowerCase();
                return (
                    (s.name && s.name.toLowerCase().includes(q)) ||
                    (s.type && s.type.toLowerCase().includes(q))
                );
            })
            .sort((a, b) => {
                const nA = a.name || '';
                const nB = b.name || '';
                return sortOrder === 'asc' ? nA.localeCompare(nB) : nB.localeCompare(nA);
            });

        return (
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

                {filteredSchedules.map((item) => {
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
                            onLongPress={() => handleCardLongPress(item, 'Work Schedule')}
                            delayLongPress={300}
                        >
                            <View
                                style={[
                                    s.itemCard,
                                    { backgroundColor: cardBg, borderColor: cardBorder },
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

                                {/* 3-Column Schedule Rows (Clean Minimalist Layout) */}
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
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>
        );
    };

    // Sync shifts with their source Work Schedules (auto-update when schedule changes)
    const syncedShifts = useMemo(() => {
        return shifts.map((shift) => {
            if (!shift.sourceScheduleId) return shift;
            const sourceSchedule = workSchedules.find((ws) => ws.id === shift.sourceScheduleId);
            if (!sourceSchedule) return shift;

            const shiftDefs = sourceSchedule.days_config?.shifts || [];
            const SHIFT_COLORS = ['#007AFF', '#FF9500', '#5856D6', '#34C759', '#FF3B30', '#30B0C7'];
            const updatedEntries = shiftDefs.map((sh: any, idx: number) => {
                const startH = parseInt(sh.start?.split(':')[0] || '0', 10);
                const endH = parseInt(sh.end?.split(':')[0] || '0', 10);
                return {
                    name: sh.name || `Shift ${idx + 1}`,
                    startTime: (sh.start || '06:00').substring(0, 5),
                    endTime: (sh.end || '14:00').substring(0, 5),
                    crossesMidnight: endH < startH,
                    color: shift.shifts[idx]?.color || SHIFT_COLORS[idx % SHIFT_COLORS.length],
                };
            });

            return {
                ...shift,
                sourceScheduleName: sourceSchedule.name,
                shifts: updatedEntries,
                workDays: sourceSchedule.days_config?.working_days || shift.workDays,
            };
        });
    }, [shifts, workSchedules]);

    // 2b. Shift Management (Connected to Work Schedules)
    const renderShiftManagement = () => {
        const getModeBadgeConfig = (mode: ShiftMode) => {
            switch (mode) {
                case 'no_shift': return { bg: 'rgba(142,142,147,0.12)', text: '#8E8E93', label: 'No Shift' };
                case '2_shift': return { bg: 'rgba(0,122,255,0.12)', text: '#007AFF', label: '2-Shift' };
                case '3_shift': return { bg: 'rgba(175,82,222,0.12)', text: '#AF52DE', label: '3-Shift' };
                case 'custom': return { bg: 'rgba(255,149,0,0.12)', text: '#FF9500', label: 'Custom' };
            }
        };

        const getRotationLabel = (rotation: string) => {
            switch (rotation) {
                case 'weekly': return 'Weekly Rotation';
                case 'biweekly': return 'Bi-Weekly Rotation';
                case 'monthly': return 'Monthly Rotation';
                case 'custom_days': return 'Custom Rotation';
                default: return 'Weekly Rotation';
            }
        };

        const getAppliesToIcon = (appliesTo: ShiftAppliesTo) => {
            switch (appliesTo) {
                case 'all_employees': return 'person.3.fill';
                case 'department': return 'building.2.fill';
                case 'position': return 'person.text.rectangle';
                case 'employment_type': return 'briefcase.fill';
                case 'specific_employees': return 'person.crop.circle.badge.checkmark';
                default: return 'person.3.fill';
            }
        };

        const filteredShifts = syncedShifts
            .filter((s) => {
                if (!searchQuery) return true;
                const q = searchQuery.toLowerCase();
                return (
                    s.name.toLowerCase().includes(q) ||
                    (s.appliesToDisplay || '').toLowerCase().includes(q)
                );
            })
            .sort((a, b) => {
                return sortOrder === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
            });

        // Mode presets for quick creation
        const shiftModePresets = [
            { label: 'No Shift', mode: 'no_shift' as ShiftMode },
            { label: '2-Shift', mode: '2_shift' as ShiftMode },
            { label: '3-Shift', mode: '3_shift' as ShiftMode },
            { label: 'Custom', mode: 'custom' as ShiftMode },
        ];

        return (
            <View style={s.itemsContainer}>
                {/* Mode Preset Pills */}
                <View style={s.presetRowContainer}>
                    <Text style={[s.presetStaticLabel, { color: subtextColor }]}>
                        Mode
                    </Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={s.presetPillScroll}
                    >
                        {shiftModePresets.map((preset) => (
                            <BouncyGlassButton
                                key={preset.mode}
                                isPill
                                isDark={isDark}
                                textColor={textColor}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setEditingShiftItem(null);
                                    setSelectedShiftMode(preset.mode);
                                    setShiftModalVisible(true);
                                }}
                                style={{
                                    height: 32,
                                    borderRadius: 16,
                                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.045)',
                                }}
                            >
                                <Text style={[s.presetPillText, { color: textColor }]}>
                                    {preset.label}
                                </Text>
                            </BouncyGlassButton>
                        ))}
                    </ScrollView>
                </View>

                {/* Empty State */}
                {filteredShifts.length === 0 && (
                    <View
                        style={[
                            s.itemCard,
                            { backgroundColor: cardBg, borderColor: cardBorder, alignItems: 'center', paddingVertical: 32 },
                        ]}
                    >
                        <PlatformIcon name="arrow.triangle.2.circlepath" size={28} tintColor={subtextColor} />
                        <Text style={{ color: subtextColor, fontSize: 15, fontWeight: '500', marginTop: 10, letterSpacing: -0.2 }}>
                            No Shift Patterns Configured
                        </Text>
                        <Text style={{ color: subtextColor, fontSize: 13, marginTop: 4, textAlign: 'center', opacity: 0.7, paddingHorizontal: 24 }}>
                            Tap + to create a shift pattern linked to your Work Schedules
                        </Text>
                    </View>
                )}

                {/* Shift Cards */}
                {filteredShifts.map((item) => {
                    const modeBadge = getModeBadgeConfig(item.mode);
                    const isInactive = !item.isActive;

                    return (
                        <TouchableOpacity
                            key={item.id}
                            activeOpacity={0.7}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setEditingShiftItem(item);
                                setSelectedShiftMode(item.mode);
                                setShiftModalVisible(true);
                            }}
                            onLongPress={() => handleShiftLongPress(item)}
                            delayLongPress={300}
                        >
                            <View
                                style={[
                                    s.itemCard,
                                    { backgroundColor: cardBg, borderColor: cardBorder },
                                    isInactive && { opacity: 0.6 },
                                ]}
                            >
                                {/* Top Row: Mode Badge + Status */}
                                <View style={s.cardTopRow}>
                                    <View style={[s.codePill, { backgroundColor: modeBadge.bg }]}>
                                        <Text style={[s.codePillText, { color: modeBadge.text, fontWeight: '700' }]}>
                                            {modeBadge.label}
                                        </Text>
                                    </View>

                                    <View style={[
                                        s.statusBadge,
                                        { backgroundColor: item.isActive ? 'rgba(52,199,89,0.12)' : 'rgba(255,59,48,0.12)' },
                                    ]}>
                                        <View style={[s.statusDot, { backgroundColor: item.isActive ? '#34C759' : '#FF3B30' }]} />
                                        <Text style={[s.statusText, { color: item.isActive ? '#34C759' : '#FF3B30' }]}>
                                            {item.isActive ? 'Active' : 'Inactive'}
                                        </Text>
                                    </View>
                                </View>

                                {/* Shift Name */}
                                <Text style={[s.cardDeptTitle, { color: textColor }]}>
                                    {item.name}
                                </Text>

                                {/* Source Schedule Reference */}
                                {item.sourceScheduleName && (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                                        <PlatformIcon name="link" size={11} tintColor={subtextColor} />
                                        <Text style={{ fontSize: 12, color: subtextColor, fontWeight: '400' }} numberOfLines={1}>
                                            {item.sourceScheduleName}
                                        </Text>
                                    </View>
                                )}

                                {/* Shift Time Rows */}
                                {item.shifts.length > 0 && (
                                    <View style={s.scheduleList}>
                                        {item.shifts.map((sh: any, sIdx: number) => (
                                            <View key={sIdx} style={s.scheduleRow}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                                                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: sh.color }} />
                                                    <Text style={[s.scheduleDay, { color: textColor }]} numberOfLines={1}>
                                                        {sh.name}
                                                    </Text>
                                                </View>
                                                <Text style={[s.scheduleHours, { color: '#007AFF', fontWeight: '600' }]} numberOfLines={1}>
                                                    {sh.startTime} - {sh.endTime}{sh.crossesMidnight ? ' ⁺¹' : ''}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                )}

                                {/* No Shift Mode — show regular schedule message */}
                                {item.mode === 'no_shift' && item.shifts.length === 0 && (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                        <PlatformIcon name="clock.fill" size={12} tintColor={subtextColor} />
                                        <Text style={{ fontSize: 13, color: subtextColor }}>
                                            Uses regular work schedule (no rotation)
                                        </Text>
                                    </View>
                                )}

                                {/* Bottom Info Row: Rotation + Applies To */}
                                <View style={[s.innerDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', marginTop: 8, marginBottom: 8 }]} />
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    {/* Rotation */}
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                        <PlatformIcon name="arrow.triangle.2.circlepath" size={12} tintColor={subtextColor} />
                                        <Text style={{ fontSize: 12, color: subtextColor, fontWeight: '500' }}>
                                            {getRotationLabel(item.rotation)}
                                        </Text>
                                    </View>

                                    {/* Applies To */}
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                        <PlatformIcon name={getAppliesToIcon(item.appliesTo) as any} size={12} tintColor={subtextColor} />
                                        <Text style={{ fontSize: 12, color: subtextColor, fontWeight: '500' }} numberOfLines={1}>
                                            {item.appliesToDisplay || 'All Employees'}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>
        );
    };

    // 3. Leave Policies (Exact People Setup card style)
    const renderLeavePolicies = () => {
        const filteredLeavePolicies = leavePolicies
            .filter((lp) => {
                if (!searchQuery) return true;
                const q = searchQuery.toLowerCase();
                return (
                    (lp.name && lp.name.toLowerCase().includes(q)) ||
                    (lp.description && lp.description.toLowerCase().includes(q))
                );
            })
            .sort((a, b) => {
                const nA = a.name || '';
                const nB = b.name || '';
                return sortOrder === 'asc' ? nA.localeCompare(nB) : nB.localeCompare(nA);
            });

        return (
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
                        {LEAVE_POLICY_PRESETS.map((preset) => (
                            <BouncyGlassButton
                                key={preset.id}
                                isPill
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

                {filteredLeavePolicies.map((item) => {
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
                            onLongPress={() => handleCardLongPress(item, 'Leave Policy')}
                            delayLongPress={300}
                        >
                            <View
                                style={[
                                    s.itemCard,
                                    { backgroundColor: cardBg, borderColor: cardBorder },
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
                                            Subtypes: {item.permission_subtypes.filter((st: any) => st.is_enabled).length} enabled ({item.permission_subtypes.filter((st: any) => st.is_enabled).map((st: any) => st.name.split(' ')[0]).join(', ')})
                                        </Text>
                                    )}
                                </View>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>
        );
    };

    // Location Management Handlers
    const handleSaveWorkLocation = async (item: WorkLocationItem) => {
        try {
            if (item.isDefault) {
                if (activeTenant?.id && updateTenant) {
                    await updateTenant(activeTenant.id, {
                        branding_name: item.name,
                        address: item.address,
                        latitude: item.latitude,
                        longitude: item.longitude,
                        attendance_radius: item.radiusMeters,
                        gmaps_url: item.gmapsUrl,
                    });
                }
                showToast('Default location updated');
            } else {
                const exists = workLocations.some((l) => l.id === item.id);
                let updated: WorkLocationItem[];
                if (exists) {
                    updated = workLocations.map((l) => (l.id === item.id ? item : l));
                } else {
                    updated = [...workLocations.filter((l) => !l.isDefault && l.id !== 'loc-org-default'), item];
                }
                setWorkLocations(updated);
                await saveClockSetting('WORK_LOCATIONS', updated);
                showToast('Location saved successfully');
            }
        } catch (e: any) {
            console.error('[ClockSetup] Error saving location:', e);
            Alert.alert('Error', e.message || 'Failed to save location');
        }
    };

    const handleDeleteWorkLocation = async (item: WorkLocationItem) => {
        if (item.isDefault || item.id === 'loc-org-default') {
            Alert.alert('Cannot Delete Default Location', 'The default Organization Location cannot be deleted from Clock.');
            return;
        }
        try {
            const updated = workLocations.filter((l) => l.id !== item.id && !l.isDefault);
            setWorkLocations(updated);
            await saveClockSetting('WORK_LOCATIONS', updated);
            showToast('Location deleted');
        } catch (e: any) {
            console.error('[ClockSetup] Error deleting location:', e);
            Alert.alert('Error', e.message || 'Failed to delete location');
        }
    };

    const handleToggleLocationActive = async (loc: WorkLocationItem, val: boolean) => {
        if (loc.isDefault) {
            showToast(val ? 'Geofence active' : 'Geofence disabled');
            return;
        }
        const updated = workLocations.map((l) => (l.id === loc.id ? { ...l, isActive: val } : l));
        setWorkLocations(updated);
        await saveClockSetting('WORK_LOCATIONS', updated);
        showToast(val ? 'Geofence active' : 'Geofence disabled');
    };

    const handleLocationCardLongPress = (loc: WorkLocationItem) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (loc.isDefault) {
            if (Platform.OS === 'ios') {
                ActionSheetIOS.showActionSheetWithOptions(
                    {
                        title: `${loc.name} (${loc.code})`,
                        message: 'Default Organization Location',
                        options: ['Cancel', 'Edit Location Details'],
                        cancelButtonIndex: 0,
                    },
                    (buttonIndex) => {
                        if (buttonIndex === 1) {
                            setEditingLocationItem(loc);
                            setLocationModalVisible(true);
                        }
                    }
                );
            } else {
                setEditingLocationItem(loc);
                setLocationModalVisible(true);
            }
            return;
        }

        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    title: `${loc.name} (${loc.code})`,
                    options: ['Cancel', 'Edit Work Location', 'Delete Work Location'],
                    destructiveButtonIndex: 2,
                    cancelButtonIndex: 0,
                },
                (buttonIndex) => {
                    if (buttonIndex === 1) {
                        setEditingLocationItem(loc);
                        setLocationModalVisible(true);
                    } else if (buttonIndex === 2) {
                        handleDeleteWorkLocation(loc);
                    }
                }
            );
        } else {
            Alert.alert(
                `${loc.name} (${loc.code})`,
                'Choose an action:',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Edit',
                        onPress: () => {
                            setEditingLocationItem(loc);
                            setLocationModalVisible(true);
                        },
                    },
                    {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: () => handleDeleteWorkLocation(loc),
                    },
                ]
            );
        }
    };

    // 4. Locations & Geofence (Compact Card Style)
    const renderWorkLocations = () => {
        const filteredLocations = allWorkLocations
            .filter((l) => {
                if (!searchQuery) return true;
                const q = searchQuery.toLowerCase();
                return (
                    l.name.toLowerCase().includes(q) ||
                    l.address.toLowerCase().includes(q) ||
                    (l.code && l.code.toLowerCase().includes(q)) ||
                    (l.type && l.type.toLowerCase().includes(q))
                );
            })
            .sort((a, b) => {
                if (a.isDefault) return -1;
                if (b.isDefault) return 1;
                return sortOrder === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
            });

        return (
            <View style={s.itemsContainer}>
                {filteredLocations.map((loc) => (
                    <TouchableOpacity
                        key={loc.id}
                        activeOpacity={0.7}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setEditingLocationItem(loc);
                            setLocationModalVisible(true);
                        }}
                        onLongPress={() => handleLocationCardLongPress(loc)}
                        delayLongPress={300}
                    >
                        <View style={[
                                s.itemCard,
                                { backgroundColor: cardBg, borderColor: cardBorder },
                            ]}
                        >
                            {/* Top Row: 3-Letter Code, Optional Main Badge & Active Switch */}
                            <View style={s.cardTopRow}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <View style={[s.codePill, { backgroundColor: isDark ? 'rgba(0,122,255,0.2)' : 'rgba(0,122,255,0.1)' }]}>
                                        <Text style={[s.codePillText, { color: '#007AFF', fontWeight: '800' }]}>
                                            {loc.code || 'LOC'}
                                        </Text>
                                    </View>

                                    {loc.isDefault && (
                                        <View style={[s.codePill, { backgroundColor: isDark ? 'rgba(52,199,89,0.18)' : 'rgba(52,199,89,0.12)' }]}>
                                            <Text style={[s.codePillText, { color: '#34C759', fontWeight: '700' }]}>
                                                MAIN
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                <Switch
                                    value={loc.isActive}
                                    onValueChange={(val) => {
                                        handleToggleLocationActive(loc, val);
                                    }}
                                    trackColor={{ false: isDark ? '#39393D' : '#E5E5EA', true: '#34C759' }}
                                />
                            </View>

                            {/* Location Name */}
                            <Text style={[s.cardDeptTitle, { color: textColor, marginTop: 6 }]}>
                                {loc.name}
                            </Text>

                            {/* Address */}
                            <Text style={[s.cardMetaText, { color: subtextColor, marginTop: 2 }]} numberOfLines={2}>
                                {loc.address}
                            </Text>

                            {/* Bottom: Clean Plain Radius Buffer Text */}
                            <Text style={[s.cardMetaText, { color: subtextColor, marginTop: 8, fontSize: 12, fontWeight: '500' }]}>
                                Radius Buffer: {loc.radiusMeters}m
                            </Text>
                        </View>
                    </TouchableOpacity>
                ))}
            </View>
        );
    };

    // 5. Calendar & Holidays (Comprehensive Master Calendar + Monthly View)
    const renderHolidays = () => {
        const activeYearPrefix = `${calendarViewYear}-`;
        const activeMonthPrefix = `${calendarViewYear}-${String(calendarViewMonth + 1).padStart(2, '0')}`;
        const isSearching = Boolean(searchQuery && searchQuery.trim().length > 0);

        const filteredEvents = allCalendarEvents
            .filter((item) => {
                // Must belong to active calendar year
                if (!item.date.startsWith(activeYearPrefix)) return false;

                // 1. Search Query: If searching, search across the entire year regardless of active month or selected date
                if (isSearching) {
                    const q = searchQuery.toLowerCase().trim();
                    const matchesQuery =
                        item.title.toLowerCase().includes(q) ||
                        (item.subtitleId && item.subtitleId.toLowerCase().includes(q)) ||
                        item.date.includes(q) ||
                        (item.description && item.description.toLowerCase().includes(q)) ||
                        (item.personName && item.personName.toLowerCase().includes(q));
                    if (!matchesQuery) return false;
                } else {
                    // 2. Not searching:
                    // If a specific date is tapped on the calendar, show only events on that date
                    if (selectedCalendarDate) {
                        if (item.date !== selectedCalendarDate) return false;
                    } else if (calendarScopeFilter === 'month') {
                        // Otherwise, if scope is Monthly (default), filter to active month
                        if (!item.date.startsWith(activeMonthPrefix)) return false;
                    }
                    // If scope is 'year', show all in the year
                }

                // 3. Category filter
                if (calendarCategoryFilter !== 'all' && item.type !== calendarCategoryFilter) {
                    return false;
                }

                return true;
            })
            .sort((a, b) => {
                return sortOrder === 'asc' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date);
            });

        const filterTabs: Array<{ id: CalendarEventType | 'all'; label: string }> = [
            { id: 'all', label: 'All' },
            { id: 'public_holiday', label: 'Public Holiday' },
            { id: 'joint_leave', label: 'Joint Leave' },
            { id: 'company_special', label: 'Company Special' },
            { id: 'birthday', label: 'Birthday' },
            { id: 'work_exception', label: 'Exceptions' },
        ];

        return (
            <View style={s.itemsContainer}>
                {/* 1. Monthly Interactive Calendar at Top */}
                <CalendarMonthView
                    events={allCalendarEvents}
                    selectedDate={selectedCalendarDate}
                    onSelectDate={(d) => {
                        setSelectedCalendarDate(d);
                        if (d) {
                            setCalendarCategoryFilter('all');
                        }
                    }}
                    viewYear={calendarViewYear}
                    viewMonth={calendarViewMonth}
                    onMonthChange={(y, m) => {
                        setCalendarViewYear(y);
                        setCalendarViewMonth(m);
                    }}
                    isDark={isDark}
                    textColor={textColor}
                    subtextColor={subtextColor}
                    tenantBrandColor={tenantBrandColor}
                />

                {/* Unified 4-Tool Horizontal Row (Full Width Screen): Search | Scope Menu ▾ | Type Menu ▾ | Sort */}
                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        width: '100%',
                        marginBottom: 10,
                    }}
                >
                    {/* 1. Search Bar (Flex: 1 to fill available width) */}
                    <View
                        style={[
                            s.searchBarContainer,
                            {
                                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                                height: 34,
                                flex: 1,
                                borderRadius: 17,
                                paddingHorizontal: 10,
                                marginBottom: 0,
                            },
                        ]}
                    >
                        <PlatformIcon name="magnifyingglass" size={13} tintColor={subtextColor} />
                        <TextInput
                            style={[s.searchInput, { color: textColor, fontSize: 13, marginLeft: 4, flex: 1 }]}
                            placeholder="Search..."
                            placeholderTextColor={subtextColor}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            clearButtonMode="while-editing"
                            autoCapitalize="none"
                        />
                    </View>

                    {/* 2. Scope Dropdown Button (Monthly / Yearly) */}
                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            ActionSheetIOS.showActionSheetWithOptions(
                                {
                                    title: 'Select View Scope',
                                    options: ['Cancel', 'Monthly View', 'All This Year'],
                                    cancelButtonIndex: 0,
                                },
                                (btnIdx) => {
                                    if (btnIdx === 1) {
                                        setCalendarScopeFilter('month');
                                        setSelectedCalendarDate(null);
                                    } else if (btnIdx === 2) {
                                        setCalendarScopeFilter('year');
                                        setSelectedCalendarDate(null);
                                    }
                                }
                            );
                        }}
                        style={{
                            height: 34,
                            borderRadius: 17,
                            paddingHorizontal: 11,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 3,
                            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.045)',
                        }}
                    >
                        <Text
                            style={{
                                color: textColor,
                                fontSize: 12.5,
                                fontWeight: '500',
                            }}
                        >
                            {calendarScopeFilter === 'month' ? 'Monthly' : 'Yearly'}
                        </Text>
                        <PlatformIcon name="chevron.down" size={9} tintColor={subtextColor} style={{ marginTop: 1 }} />
                    </TouchableOpacity>

                    {/* 3. Event Type Dropdown Button (All / Public Holiday / Joint Leave / etc.) */}
                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            const optionsList = [
                                { id: 'all' as const, label: 'All Types' },
                                { id: 'public_holiday' as const, label: 'Public Holiday' },
                                { id: 'joint_leave' as const, label: 'Joint Leave' },
                                { id: 'company_special' as const, label: 'Company Special' },
                                { id: 'birthday' as const, label: 'Birthday' },
                                { id: 'work_exception' as const, label: 'Work Exceptions' },
                            ];
                            ActionSheetIOS.showActionSheetWithOptions(
                                {
                                    title: 'Filter Event Type',
                                    options: ['Cancel', ...optionsList.map((o) => o.label)],
                                    cancelButtonIndex: 0,
                                },
                                (btnIdx) => {
                                    if (btnIdx > 0 && btnIdx <= optionsList.length) {
                                        setCalendarCategoryFilter(optionsList[btnIdx - 1].id);
                                    }
                                }
                            );
                        }}
                        style={{
                            height: 34,
                            borderRadius: 17,
                            paddingHorizontal: 11,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 3,
                            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.045)',
                        }}
                    >
                        <Text
                            style={{
                                color: textColor,
                                fontSize: 12.5,
                                fontWeight: '500',
                            }}
                        >
                            {calendarCategoryFilter === 'all'
                                ? 'All'
                                : calendarCategoryFilter === 'public_holiday'
                                ? 'Holiday'
                                : calendarCategoryFilter === 'joint_leave'
                                ? 'Joint Leave'
                                : calendarCategoryFilter === 'company_special'
                                ? 'Company'
                                : calendarCategoryFilter === 'birthday'
                                ? 'Birthday'
                                : 'Exception'}
                        </Text>
                        <PlatformIcon
                            name="chevron.down"
                            size={9}
                            tintColor={subtextColor}
                            style={{ marginTop: 1 }}
                        />
                    </TouchableOpacity>

                    {/* 4. Sort Button */}
                    <SmoothSortButton
                        isDark={isDark}
                        sortOrder={sortOrder}
                        onPress={() => {
                            setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                        }}
                    />
                </View>

                {/* 3. Event Cards or Empty State */}
                {filteredEvents.length === 0 ? (
                    <View style={{
                            backgroundColor: cardBg,
                            borderColor: cardBorder,
                            paddingVertical: 28,
                            paddingHorizontal: 20,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 16,
                            borderWidth: 1,
                            marginTop: 4,
                        }}
                    >
                        <PlatformIcon
                            name={selectedCalendarDate ? 'calendar.badge.exclamationmark' : 'calendar'}
                            size={30}
                            tintColor={subtextColor}
                            style={{ opacity: 0.6, marginBottom: 8 }}
                        />
                        <Text style={{ color: textColor, fontSize: 15, fontWeight: '600', marginBottom: 4, textAlign: 'center' }}>
                            {selectedCalendarDate
                                ? 'No events on this day'
                                : isSearching
                                ? 'No matching events found'
                                : 'No events scheduled'}
                        </Text>
                        <Text style={{ color: subtextColor, fontSize: 13, textAlign: 'center', lineHeight: 18 }}>
                            {selectedCalendarDate
                                ? `There are no scheduled holidays or events on ${formatFullCalendarDate(selectedCalendarDate)}.`
                                : isSearching
                                ? `No events in ${calendarViewYear} match "${searchQuery}".`
                                : calendarScopeFilter === 'month'
                                ? `No events found for this month.`
                                : `No events found for ${calendarViewYear}.`}
                        </Text>
                    </View>
                ) : (
                    filteredEvents.map((item) => {
                        const catColor = getCalendarCategoryColor(item.type, tenantBrandColor);

                        return (
                            <TouchableOpacity
                                key={item.id}
                                activeOpacity={0.7}
                                onPress={() => {
                                    if (item.source === 'company') {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        const original = companyEvents.find((e) => e.id === item.id) || item;
                                        setEditingCalendarEvent(original);
                                        setCreateEventInitialType(original.type);
                                        setCreateEventModalVisible(true);
                                    } else if (item.type === 'joint_leave') {
                                        handleToggleJointLeave(item);
                                    }
                                }}
                                onLongPress={() => {
                                    if (item.source === 'company') {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                        ActionSheetIOS.showActionSheetWithOptions(
                                            {
                                                title: item.title,
                                                options: ['Cancel', 'Edit Event', 'Delete Event'],
                                                destructiveButtonIndex: 2,
                                                cancelButtonIndex: 0,
                                            },
                                            (btnIdx) => {
                                                if (btnIdx === 1) {
                                                    const original = companyEvents.find((e) => e.id === item.id) || item;
                                                    setEditingCalendarEvent(original);
                                                    setCreateEventInitialType(original.type);
                                                    setCreateEventModalVisible(true);
                                                } else if (btnIdx === 2) {
                                                    handleDeleteCompanyEvent(item.id);
                                                }
                                            }
                                        );
                                    }
                                }}
                                delayLongPress={300}
                            >
                                <View style={[
                                        s.itemCard,
                                        {
                                            backgroundColor: cardBg,
                                            borderColor: cardBorder,
                                        },
                                    ]}
                                >
                                    {/* Category Badge Only (No icon, colored according to category) */}
                                    <View style={s.cardTopRow}>
                                        <View
                                            style={[
                                                s.codePill,
                                                {
                                                    backgroundColor: `${catColor}18`,
                                                },
                                            ]}
                                        >
                                            <Text style={[s.codePillText, { color: catColor }]}>
                                                {CALENDAR_CATEGORY_LABELS[item.type]?.toUpperCase() || 'EVENT'}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Primary Event Title (English) */}
                                    <Text
                                        style={[
                                            s.cardDeptTitle,
                                            {
                                                color: textColor,
                                            },
                                        ]}
                                    >
                                        {item.title}
                                    </Text>

                                    {/* Indonesian Subtitle if available */}
                                    {item.subtitleId && item.subtitleId !== item.title ? (
                                        <Text style={[s.cardSubtitleText, { color: subtextColor }]}>
                                            {item.subtitleId}
                                        </Text>
                                    ) : null}

                                    {/* Full Date (e.g. 23 March 2026, no icon) */}
                                    <Text style={[s.cardDateText, { color: subtextColor }]}>
                                        {formatFullCalendarDate(item.date)}
                                        {item.timeOverride ? ` · ${item.timeOverride.startTime} - ${item.timeOverride.endTime}` : ''}
                                    </Text>

                                    {/* Description if present */}
                                    {item.description ? (
                                        <Text style={[s.cardSubDesc, { color: subtextColor }]} numberOfLines={2}>
                                            {item.description}
                                        </Text>
                                    ) : null}
                                </View>
                            </TouchableOpacity>
                        );
                    })
                )}

                {/* Create / Edit Modal */}
                <CreateCalendarEventModal
                    visible={createEventModalVisible}
                    onClose={() => {
                        setCreateEventModalVisible(false);
                        setEditingCalendarEvent(null);
                    }}
                    onSave={handleSaveCalendarEvent}
                    initialType={createEventInitialType}
                    initialDate={selectedCalendarDate || undefined}
                    editingEvent={editingCalendarEvent}
                    isDark={isDark}
                    textColor={textColor}
                    subtextColor={subtextColor}
                    tenantBrandColor={tenantBrandColor}
                />
            </View>
        );
    };

    // 6. Attendance Rules (4 Clear Sections: Punctuality, Verification, Status Preview, Attendance Handling)
    const renderAttendanceRules = () => {
        const onTimeAllowance = attendanceRules.onTimeAllowanceMinutes ?? 5;
        const lateTolerance = attendanceRules.lateToleranceMinutes ?? 15;
        const earlyDeparture = attendanceRules.earlyLeaveToleranceMinutes ?? 10;
        const halfDayHours = attendanceRules.halfDayMinHours ?? 4;
        const halfDayMins = attendanceRules.halfDayMinMinutes ?? 0;
        const clockInBefore = attendanceRules.clockInBeforeScheduleMinutes ?? 60;

        const missingClockOut = attendanceRules.missingClockOutAction || 'incomplete';
        const earlyLeaveAct = attendanceRules.earlyLeaveAction || 'mark_auto';
        const insufficientHoursAct = attendanceRules.insufficientHoursAction || 'half_day';

        // 1. On-Time Allowance actions
        const onTimeOptions = [
            { label: '0 min (Strict / No Allowance)', val: 0 },
            { label: '1 min', val: 1 },
            { label: '2 min', val: 2 },
            { label: '3 min', val: 3 },
            { label: '5 min (Default)', val: 5 },
            { label: '10 min', val: 10 },
            { label: '15 min', val: 15 },
            { label: '20 min', val: 20 },
            { label: '30 min', val: 30 },
        ];
        const onTimeActions: ContextMenuAction[] = onTimeOptions.map((o) => ({
            title: o.label,
            selected: onTimeAllowance === o.val,
        }));

        // 2. Late Tolerance actions
        const lateOptions = [
            { label: '0 min (No Grace Period)', val: 0 },
            { label: '5 min', val: 5 },
            { label: '10 min', val: 10 },
            { label: '15 min (Default)', val: 15 },
            { label: '20 min', val: 20 },
            { label: '30 min', val: 30 },
            { label: '45 min', val: 45 },
            { label: '60 min (1 Hour)', val: 60 },
        ];
        const lateActions: ContextMenuAction[] = lateOptions.map((o) => ({
            title: o.label,
            selected: lateTolerance === o.val,
        }));

        // 3. Early Departure Grace actions
        const earlyDepartureOptions = [
            { label: '0 min (Strict)', val: 0 },
            { label: '5 min', val: 5 },
            { label: '10 min (Default)', val: 10 },
            { label: '15 min', val: 15 },
            { label: '20 min', val: 20 },
            { label: '30 min', val: 30 },
            { label: '45 min', val: 45 },
            { label: '60 min (1 Hour)', val: 60 },
        ];
        const earlyDepartureActions: ContextMenuAction[] = earlyDepartureOptions.map((o) => ({
            title: o.label,
            selected: earlyDeparture === o.val,
        }));

        // 4. Half-Day Minimum Hours actions
        const halfDayOptions = [
            { label: '2 hr 00 min', h: 2, m: 0 },
            { label: '3 hr 00 min', h: 3, m: 0 },
            { label: '3 hr 30 min', h: 3, m: 30 },
            { label: '4 hr 00 min (Default)', h: 4, m: 0 },
            { label: '4 hr 30 min', h: 4, m: 30 },
            { label: '5 hr 00 min', h: 5, m: 0 },
            { label: '5 hr 30 min', h: 5, m: 30 },
            { label: '6 hr 00 min', h: 6, m: 0 },
        ];
        const halfDayActions: ContextMenuAction[] = halfDayOptions.map((o) => ({
            title: o.label,
            selected: halfDayHours === o.h && halfDayMins === o.m,
        }));

        // 5. Clock-in Before Schedule actions
        const clockInBeforeOptions = [
            { label: '15 min', val: 15 },
            { label: '30 min', val: 30 },
            { label: '45 min', val: 45 },
            { label: '60 min (1 Hour - Default)', val: 60 },
            { label: '90 min (1.5 Hours)', val: 90 },
            { label: '120 min (2 Hours)', val: 120 },
            { label: '180 min (3 Hours)', val: 180 },
            { label: 'Unlimited (Anytime)', val: 0 },
        ];
        const clockInBeforeActions: ContextMenuAction[] = clockInBeforeOptions.map((o) => ({
            title: o.label,
            selected: clockInBefore === o.val,
        }));

        // 6. End Time Behavior actions
        const endTimeBehavior = attendanceRules.endTimeBehavior || 'fixed_schedule';
        const endTimeBehaviorOptions: Array<{
            label: string;
            val: EndTimeBehavior;
            sublabel: string;
            headerExample: string;
        }> = [
            {
                label: 'Fixed Schedule End',
                val: 'fixed_schedule',
                sublabel: 'Clock-out target always follows scheduled end time',
                headerExample: 'Schedule: 08:00–17:00',
            },
            {
                label: 'Extend to Complete Duration',
                val: 'extend_duration',
                sublabel: 'Expected clock-out moves to complete required work duration',
                headerExample: 'Required: 8 working hrs + 1 hr break',
            },
            {
                label: 'Flexible Duration',
                val: 'flexible_duration',
                sublabel: 'No fixed end time; only complete required work duration',
                headerExample: 'Required: 8 working hrs',
            },
        ];
        const endTimeBehaviorActions: ContextMenuAction[] = endTimeBehaviorOptions.map((o) => ({
            title: o.label,
            selected: endTimeBehavior === o.val,
        }));
        const currentBehaviorObj =
            endTimeBehaviorOptions.find((o) => o.val === endTimeBehavior) || endTimeBehaviorOptions[0];
        const endTimeBehaviorDisplay = currentBehaviorObj.label;

        // 7. Missing Clock-out Action actions
        const missingClockOutOptions: Array<{ label: string; val: 'incomplete' | 'auto_shift_end' | 'mark_absent' }> = [
            { label: 'Incomplete (Default)', val: 'incomplete' },
            { label: 'Auto Clock-out at Shift End', val: 'auto_shift_end' },
            { label: 'Mark as Absent', val: 'mark_absent' },
        ];
        const missingClockOutActions: ContextMenuAction[] = missingClockOutOptions.map((o) => ({
            title: o.label,
            selected: missingClockOut === o.val,
        }));

        // 8. Early Leave Action actions
        const earlyLeaveOptions: Array<{ label: string; val: 'mark_auto' | 'require_reason' | 'ignore' }> = [
            { label: 'Mark Automatically (Default)', val: 'mark_auto' },
            { label: 'Require Reason / Permit', val: 'require_reason' },
            { label: 'Ignore', val: 'ignore' },
        ];
        const earlyLeaveActions: ContextMenuAction[] = earlyLeaveOptions.map((o) => ({
            title: o.label,
            selected: earlyLeaveAct === o.val,
        }));

        // 9. Insufficient Hours Action actions
        const insufficientHoursOptions: Array<{ label: string; val: 'half_day' | 'incomplete' }> = [
            { label: 'Half Day (Default)', val: 'half_day' },
            { label: 'Incomplete', val: 'incomplete' },
        ];
        const insufficientHoursActions: ContextMenuAction[] = insufficientHoursOptions.map((o) => ({
            title: o.label,
            selected: insufficientHoursAct === o.val,
        }));

        // Formatted display values
        const onTimeDisplay = `${onTimeAllowance} min`;
        const lateDisplay = `${lateTolerance} min`;
        const earlyDisplay = `${earlyDeparture} min`;
        const halfDayDisplay = `${halfDayHours} hr ${String(halfDayMins).padStart(2, '0')} min`;
        const clockInBeforeDisplay = clockInBefore === 0 ? 'Unlimited' : `${clockInBefore} min`;

        const missingClockOutDisplay =
            missingClockOut === 'auto_shift_end' ? 'Auto Clock-out' : missingClockOut === 'mark_absent' ? 'Mark Absent' : 'Incomplete';
        const earlyLeaveDisplay =
            earlyLeaveAct === 'require_reason' ? 'Require Reason' : earlyLeaveAct === 'ignore' ? 'Ignore' : 'Mark Automatically';
        const insufficientHoursDisplay =
            insufficientHoursAct === 'incomplete' ? 'Incomplete' : 'Half Day';

        // Dynamic status preview texts (Note: Clock-in before schedule is counted as On Time)
        let onTimeDesc = '';
        if (clockInBefore > 0) {
            onTimeDesc = onTimeAllowance === 0 ? `${clockInBefore}m before – exact start` : `${clockInBefore}m before – ${onTimeAllowance}m after start`;
        } else {
            onTimeDesc = onTimeAllowance === 0 ? 'Exact scheduled start' : `0–${onTimeAllowance} min after start`;
        }

        const graceDesc =
            lateTolerance <= onTimeAllowance
                ? 'Disabled (Grace <= Allowance)'
                : `${onTimeAllowance + 1}–${lateTolerance} min after start`;
        const lateDesc = `>${lateTolerance} min after start`;

        return (
            <View style={{ gap: 18 }}>
                {/* 1. PUNCTUALITY / WORK DURATION SECTION */}
                <View style={{ gap: 6 }}>
                    <View style={s.sectionHeader}>
                        <Text style={[s.sectionTitle, { color: isDark ? '#8E8E93' : '#6C6C70' }]}>
                            Punctuality / Work Duration
                        </Text>
                    </View>
                    <View style={[
                            s.identityGroupCard,
                            {
                                backgroundColor: cardBg,
                                borderColor: cardBorder,
                            },
                        ]}
                    >
                        {/* On-Time Allowance (Menu Context) */}
                        <ContextMenu
                            actions={onTimeActions}
                            onPress={(e) => {
                                if (e.nativeEvent.index >= 0 && e.nativeEvent.index < onTimeOptions.length) {
                                    updateSettingAndSave('ATTENDANCE_RULES', setAttendanceRules, {
                                        ...attendanceRules,
                                        onTimeAllowanceMinutes: onTimeOptions[e.nativeEvent.index].val,
                                    });
                                }
                            }}
                            dropdownMenuMode={true}
                        >
                            <View style={s.ruleIdentityRow}>
                                <View style={s.ruleIdentityLeft}>
                                    <Text style={[s.ruleIdentityTitle, { color: textColor }]}>On-Time Allowance</Text>
                                    <Text style={[s.ruleIdentitySubtitle, { color: subtextColor }]}>
                                        Allowed minutes after schedule to stay on time
                                    </Text>
                                </View>
                                <View style={s.ruleIdentityRight}>
                                    <Text style={[s.ruleIdentityValue, { color: subtextColor }]}>{onTimeDisplay}</Text>
                                    <PlatformIcon name="chevron.up.chevron.down" size={12} tintColor={subtextColor} style={{ marginLeft: 6 }} />
                                </View>
                            </View>
                        </ContextMenu>

                        <View style={[s.innerDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

                        {/* Late Tolerance (Menu Context) */}
                        <ContextMenu
                            actions={lateActions}
                            onPress={(e) => {
                                if (e.nativeEvent.index >= 0 && e.nativeEvent.index < lateOptions.length) {
                                    updateSettingAndSave('ATTENDANCE_RULES', setAttendanceRules, {
                                        ...attendanceRules,
                                        lateToleranceMinutes: lateOptions[e.nativeEvent.index].val,
                                    });
                                }
                            }}
                            dropdownMenuMode={true}
                        >
                            <View style={s.ruleIdentityRow}>
                                <View style={s.ruleIdentityLeft}>
                                    <Text style={[s.ruleIdentityTitle, { color: textColor }]}>Late Tolerance</Text>
                                    <Text style={[s.ruleIdentitySubtitle, { color: subtextColor }]}>
                                        Maximum grace period before marked late
                                    </Text>
                                </View>
                                <View style={s.ruleIdentityRight}>
                                    <Text style={[s.ruleIdentityValue, { color: subtextColor }]}>{lateDisplay}</Text>
                                    <PlatformIcon name="chevron.up.chevron.down" size={12} tintColor={subtextColor} style={{ marginLeft: 6 }} />
                                </View>
                            </View>
                        </ContextMenu>

                        <View style={[s.innerDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

                        {/* Early Departure Grace (Menu Context) */}
                        <ContextMenu
                            actions={earlyDepartureActions}
                            onPress={(e) => {
                                if (e.nativeEvent.index >= 0 && e.nativeEvent.index < earlyDepartureOptions.length) {
                                    updateSettingAndSave('ATTENDANCE_RULES', setAttendanceRules, {
                                        ...attendanceRules,
                                        earlyLeaveToleranceMinutes: earlyDepartureOptions[e.nativeEvent.index].val,
                                    });
                                }
                            }}
                            dropdownMenuMode={true}
                        >
                            <View style={s.ruleIdentityRow}>
                                <View style={s.ruleIdentityLeft}>
                                    <Text style={[s.ruleIdentityTitle, { color: textColor }]}>Early Departure Grace</Text>
                                    <Text style={[s.ruleIdentitySubtitle, { color: subtextColor }]}>
                                        Allowed early clock-out before end time
                                    </Text>
                                </View>
                                <View style={s.ruleIdentityRight}>
                                    <Text style={[s.ruleIdentityValue, { color: subtextColor }]}>{earlyDisplay}</Text>
                                    <PlatformIcon name="chevron.up.chevron.down" size={12} tintColor={subtextColor} style={{ marginLeft: 6 }} />
                                </View>
                            </View>
                        </ContextMenu>

                        <View style={[s.innerDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

                        {/* Half-Day Minimum Hours (Menu Context) */}
                        <ContextMenu
                            actions={halfDayActions}
                            onPress={(e) => {
                                if (e.nativeEvent.index >= 0 && e.nativeEvent.index < halfDayOptions.length) {
                                    const opt = halfDayOptions[e.nativeEvent.index];
                                    updateSettingAndSave('ATTENDANCE_RULES', setAttendanceRules, {
                                        ...attendanceRules,
                                        halfDayMinHours: opt.h,
                                        halfDayMinMinutes: opt.m,
                                    });
                                }
                            }}
                            dropdownMenuMode={true}
                        >
                            <View style={s.ruleIdentityRow}>
                                <View style={s.ruleIdentityLeft}>
                                    <Text style={[s.ruleIdentityTitle, { color: textColor }]}>Half-Day Minimum Hours</Text>
                                    <Text style={[s.ruleIdentitySubtitle, { color: subtextColor }]}>
                                        Minimum worked hours to count as half day
                                    </Text>
                                </View>
                                <View style={s.ruleIdentityRight}>
                                    <Text style={[s.ruleIdentityValue, { color: subtextColor }]}>{halfDayDisplay}</Text>
                                    <PlatformIcon name="chevron.up.chevron.down" size={12} tintColor={subtextColor} style={{ marginLeft: 6 }} />
                                </View>
                            </View>
                        </ContextMenu>

                        <View style={[s.innerDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

                        {/* Clock-in Before Schedule (Menu Context) */}
                        <ContextMenu
                            actions={clockInBeforeActions}
                            onPress={(e) => {
                                if (e.nativeEvent.index >= 0 && e.nativeEvent.index < clockInBeforeOptions.length) {
                                    updateSettingAndSave('ATTENDANCE_RULES', setAttendanceRules, {
                                        ...attendanceRules,
                                        clockInBeforeScheduleMinutes: clockInBeforeOptions[e.nativeEvent.index].val,
                                    });
                                }
                            }}
                            dropdownMenuMode={true}
                        >
                            <View style={s.ruleIdentityRow}>
                                <View style={s.ruleIdentityLeft}>
                                    <Text style={[s.ruleIdentityTitle, { color: textColor }]}>Clock-in Before Schedule</Text>
                                    <Text style={[s.ruleIdentitySubtitle, { color: subtextColor }]}>
                                        Earliest allowed clock-in before start time
                                    </Text>
                                </View>
                                <View style={s.ruleIdentityRight}>
                                    <Text style={[s.ruleIdentityValue, { color: subtextColor }]}>{clockInBeforeDisplay}</Text>
                                    <PlatformIcon name="chevron.up.chevron.down" size={12} tintColor={subtextColor} style={{ marginLeft: 6 }} />
                                </View>
                            </View>
                        </ContextMenu>

                        <View style={[s.innerDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

                        {/* End Time Behavior (Menu Context) */}
                        <ContextMenu
                            actions={endTimeBehaviorActions}
                            onPress={(e) => {
                                if (e.nativeEvent.index >= 0 && e.nativeEvent.index < endTimeBehaviorOptions.length) {
                                    updateSettingAndSave('ATTENDANCE_RULES', setAttendanceRules, {
                                        ...attendanceRules,
                                        endTimeBehavior: endTimeBehaviorOptions[e.nativeEvent.index].val,
                                    });
                                }
                            }}
                            dropdownMenuMode={true}
                        >
                            <View style={s.ruleIdentityRow}>
                                <View style={s.ruleIdentityLeft}>
                                    <Text style={[s.ruleIdentityTitle, { color: textColor }]}>End Time Behavior</Text>
                                    <Text style={[s.ruleIdentitySubtitle, { color: subtextColor }]}>
                                        {currentBehaviorObj.sublabel}
                                    </Text>
                                </View>
                                <View style={s.ruleIdentityRight}>
                                    <Text style={[s.ruleIdentityValue, { color: subtextColor }]}>
                                        {endTimeBehaviorDisplay}
                                    </Text>
                                    <PlatformIcon name="chevron.up.chevron.down" size={12} tintColor={subtextColor} style={{ marginLeft: 6 }} />
                                </View>
                            </View>
                        </ContextMenu>

                        {/* Compact Revamped Example Preview Box (Neutral, Clean & No Overflow) */}
                        <View
                            style={[
                                s.examplePreviewBox,
                                {
                                    backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                                    borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
                                },
                            ]}
                        >
                            {/* Preview Top Header */}
                            <View style={s.examplePreviewTopRow}>
                                <View style={s.examplePreviewTagWrap}>
                                    <PlatformIcon
                                        name="clock"
                                        size={12}
                                        tintColor={subtextColor}
                                    />
                                    <Text style={[s.examplePreviewTagText, { color: subtextColor }]} numberOfLines={1}>
                                        Example Preview
                                    </Text>
                                </View>
                                <Text style={[s.examplePreviewHeaderContext, { color: subtextColor }]} numberOfLines={1}>
                                    {currentBehaviorObj.headerExample}
                                </Text>
                            </View>

                            {/* Scenarios Table */}
                            <View style={s.exampleScenariosContainer}>
                                {endTimeBehavior === 'fixed_schedule' && (
                                    <>
                                        <View style={[s.exampleScenarioRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.025)' }]}>
                                            <Text style={[s.exampleScenarioIn, { color: subtextColor }]}>Clock-in 08:00</Text>
                                            <PlatformIcon name="arrow.right" size={10} tintColor={subtextColor} style={{ marginHorizontal: 8 }} />
                                            <Text style={[s.exampleScenarioOut, { color: textColor }]}>Expected out 17:00</Text>
                                        </View>
                                        <View style={[s.exampleScenarioRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.025)' }]}>
                                            <Text style={[s.exampleScenarioIn, { color: subtextColor }]}>Clock-in 08:15</Text>
                                            <PlatformIcon name="arrow.right" size={10} tintColor={subtextColor} style={{ marginHorizontal: 8 }} />
                                            <Text style={[s.exampleScenarioOut, { color: textColor }]}>Expected out 17:00</Text>
                                        </View>
                                    </>
                                )}

                                {endTimeBehavior === 'extend_duration' && (
                                    <>
                                        <View style={[s.exampleScenarioRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.025)' }]}>
                                            <Text style={[s.exampleScenarioIn, { color: subtextColor }]}>Clock-in 08:00</Text>
                                            <PlatformIcon name="arrow.right" size={10} tintColor={subtextColor} style={{ marginHorizontal: 8 }} />
                                            <Text style={[s.exampleScenarioOut, { color: textColor }]}>Expected out 17:00</Text>
                                        </View>
                                        <View style={[s.exampleScenarioRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.025)' }]}>
                                            <Text style={[s.exampleScenarioIn, { color: subtextColor }]}>Clock-in 08:15</Text>
                                            <PlatformIcon name="arrow.right" size={10} tintColor={subtextColor} style={{ marginHorizontal: 8 }} />
                                            <Text style={[s.exampleScenarioOut, { color: textColor }]}>Expected out 17:15</Text>
                                        </View>
                                        <View style={[s.exampleScenarioRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.025)' }]}>
                                            <Text style={[s.exampleScenarioIn, { color: subtextColor }]}>Clock-in 09:00</Text>
                                            <PlatformIcon name="arrow.right" size={10} tintColor={subtextColor} style={{ marginHorizontal: 8 }} />
                                            <Text style={[s.exampleScenarioOut, { color: textColor }]}>Expected out 18:00</Text>
                                        </View>
                                    </>
                                )}

                                {endTimeBehavior === 'flexible_duration' && (
                                    <>
                                        <View style={[s.exampleScenarioRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.025)' }]}>
                                            <Text style={[s.exampleScenarioIn, { color: subtextColor }]}>Clock-in 07:30</Text>
                                            <PlatformIcon name="arrow.right" size={10} tintColor={subtextColor} style={{ marginHorizontal: 8 }} />
                                            <Text style={[s.exampleScenarioOut, { color: textColor }]}>Expected out 16:30</Text>
                                        </View>
                                        <View style={[s.exampleScenarioRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.025)' }]}>
                                            <Text style={[s.exampleScenarioIn, { color: subtextColor }]}>Clock-in 09:15</Text>
                                            <PlatformIcon name="arrow.right" size={10} tintColor={subtextColor} style={{ marginHorizontal: 8 }} />
                                            <Text style={[s.exampleScenarioOut, { color: textColor }]}>Expected out 18:15</Text>
                                        </View>
                                    </>
                                )}
                            </View>

                            {/* Note */}
                            <Text style={[s.exampleBreakNoteText, { color: subtextColor }]}>
                                Break duration does not count as working hours.
                            </Text>
                        </View>
                    </View>
                    <Text style={[s.sectionFooterNote, { color: subtextColor }]}>
                        Defines grace thresholds for punctuality calculations, end time behavior, and working hour compliance.
                    </Text>
                </View>

                {/* 2. VERIFICATION SECTION */}
                <View style={{ gap: 6 }}>
                    <View style={s.sectionHeader}>
                        <Text style={[s.sectionTitle, { color: isDark ? '#8E8E93' : '#6C6C70' }]}>
                            Verification
                        </Text>
                    </View>
                    <View style={[
                            s.identityGroupCard,
                            {
                                backgroundColor: cardBg,
                                borderColor: cardBorder,
                            },
                        ]}
                    >
                        {/* Require Clock-in Selfie */}
                        <View style={s.ruleIdentityRow}>
                            <View style={s.ruleIdentityLeft}>
                                <Text style={[s.ruleIdentityTitle, { color: textColor }]}>Require Clock-in Selfie</Text>
                                <Text style={[s.ruleIdentitySubtitle, { color: subtextColor }]}>
                                    Take a selfie when clocking in
                                </Text>
                            </View>
                            <Switch
                                value={attendanceRules.requireClockInSelfie}
                                onValueChange={(val) =>
                                    updateSettingAndSave('ATTENDANCE_RULES', setAttendanceRules, {
                                        ...attendanceRules,
                                        requireClockInSelfie: val,
                                    })
                                }
                                trackColor={{ false: isDark ? '#39393D' : '#E5E5EA', true: '#34C759' }}
                            />
                        </View>

                        <View style={[s.innerDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

                        {/* Require Clock-out Selfie */}
                        <View style={s.ruleIdentityRow}>
                            <View style={s.ruleIdentityLeft}>
                                <Text style={[s.ruleIdentityTitle, { color: textColor }]}>Require Clock-out Selfie</Text>
                                <Text style={[s.ruleIdentitySubtitle, { color: subtextColor }]}>
                                    Take a selfie when clocking out
                                </Text>
                            </View>
                            <Switch
                                value={attendanceRules.requireClockOutSelfie}
                                onValueChange={(val) =>
                                    updateSettingAndSave('ATTENDANCE_RULES', setAttendanceRules, {
                                        ...attendanceRules,
                                        requireClockOutSelfie: val,
                                    })
                                }
                                trackColor={{ false: isDark ? '#39393D' : '#E5E5EA', true: '#34C759' }}
                            />
                        </View>

                        <View style={[s.innerDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

                        {/* Require Location Verification */}
                        <View style={s.ruleIdentityRow}>
                            <View style={s.ruleIdentityLeft}>
                                <Text style={[s.ruleIdentityTitle, { color: textColor }]}>Require Location Verification</Text>
                                <Text style={[s.ruleIdentitySubtitle, { color: subtextColor }]}>
                                    Verify GPS location during attendance
                                </Text>
                            </View>
                            <Switch
                                value={attendanceRules.requireLocationVerification !== false}
                                onValueChange={(val) =>
                                    updateSettingAndSave('ATTENDANCE_RULES', setAttendanceRules, {
                                        ...attendanceRules,
                                        requireLocationVerification: val,
                                    })
                                }
                                trackColor={{ false: isDark ? '#39393D' : '#E5E5EA', true: '#34C759' }}
                            />
                        </View>
                    </View>
                    <Text style={[s.sectionFooterNote, { color: subtextColor }]}>
                        Employees must fulfill enabled verification steps before clock-in/out records are submitted.
                    </Text>
                </View>

                {/* 3. ATTENDANCE STATUS (Derived Preview) */}
                <View style={{ gap: 6 }}>
                    <View style={s.sectionHeader}>
                        <Text style={[s.sectionTitle, { color: isDark ? '#8E8E93' : '#6C6C70' }]}>
                            Attendance Status
                        </Text>
                    </View>
                    <View style={[
                            s.identityGroupCard,
                            {
                                backgroundColor: cardBg,
                                borderColor: cardBorder,
                            },
                        ]}
                    >
                        {/* On Time (Includes arrival before schedule) */}
                        <View style={s.statusPreviewRow}>
                            <View style={[s.statusBadgeWrap, { backgroundColor: isDark ? 'rgba(52,199,89,0.18)' : 'rgba(52,199,89,0.12)' }]}>
                                <View style={[s.statusBadgeDot, { backgroundColor: '#34C759' }]} />
                                <Text style={[s.statusBadgeText, { color: '#34C759' }]}>On Time</Text>
                            </View>
                            <Text style={[s.statusDescText, { color: subtextColor }]} numberOfLines={1}>
                                {onTimeDesc}
                            </Text>
                        </View>

                        <View style={[s.innerDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

                        {/* Within Grace */}
                        <View style={s.statusPreviewRow}>
                            <View style={[s.statusBadgeWrap, { backgroundColor: isDark ? 'rgba(255,149,0,0.18)' : 'rgba(255,149,0,0.12)' }]}>
                                <View style={[s.statusBadgeDot, { backgroundColor: '#FF9500' }]} />
                                <Text style={[s.statusBadgeText, { color: '#FF9500' }]}>Within Grace</Text>
                            </View>
                            <Text style={[s.statusDescText, { color: subtextColor }]} numberOfLines={1}>
                                {graceDesc}
                            </Text>
                        </View>

                        <View style={[s.innerDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

                        {/* Late */}
                        <View style={s.statusPreviewRow}>
                            <View style={[s.statusBadgeWrap, { backgroundColor: isDark ? 'rgba(255,59,48,0.18)' : 'rgba(255,59,48,0.12)' }]}>
                                <View style={[s.statusBadgeDot, { backgroundColor: '#FF3B30' }]} />
                                <Text style={[s.statusBadgeText, { color: '#FF3B30' }]}>Late</Text>
                            </View>
                            <Text style={[s.statusDescText, { color: subtextColor }]} numberOfLines={1}>
                                {lateDesc}
                            </Text>
                        </View>

                        <View style={[s.innerDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

                        {/* Absent */}
                        <View style={s.statusPreviewRow}>
                            <View style={[s.statusBadgeWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)' }]}>
                                <View style={[s.statusBadgeDot, { backgroundColor: isDark ? '#8E8E93' : '#6C6C70' }]} />
                                <Text style={[s.statusBadgeText, { color: isDark ? '#8E8E93' : '#6C6C70' }]}>Absent</Text>
                            </View>
                            <Text style={[s.statusDescText, { color: subtextColor }]} numberOfLines={1}>
                                No valid clock-in record
                            </Text>
                        </View>

                        <View style={[s.innerDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

                        {/* Expected Out Target */}
                        <View style={s.statusPreviewRow}>
                            <View style={[s.statusBadgeWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)' }]}>
                                <View style={[s.statusBadgeDot, { backgroundColor: isDark ? '#8E8E93' : '#6C6C70' }]} />
                                <Text style={[s.statusBadgeText, { color: isDark ? '#8E8E93' : '#6C6C70' }]}>Expected Out</Text>
                            </View>
                            <Text style={[s.statusDescText, { color: subtextColor }]} numberOfLines={1}>
                                {endTimeBehavior === 'fixed_schedule'
                                    ? 'Follows shift end (17:00)'
                                    : endTimeBehavior === 'extend_duration'
                                    ? 'Clock-in + 8h work + 1h break'
                                    : 'Clock-in + 8h work required'}
                            </Text>
                        </View>
                    </View>
                    <Text style={[s.sectionFooterNote, { color: subtextColor }]}>
                        Status and targets are calculated automatically from Punctuality & Work Duration rules.
                    </Text>
                </View>

                {/* 4. ATTENDANCE HANDLING */}
                <View style={{ gap: 6 }}>
                    <View style={s.sectionHeader}>
                        <Text style={[s.sectionTitle, { color: isDark ? '#8E8E93' : '#6C6C70' }]}>
                            Attendance Handling
                        </Text>
                    </View>
                    <View style={[
                            s.identityGroupCard,
                            {
                                backgroundColor: cardBg,
                                borderColor: cardBorder,
                            },
                        ]}
                    >
                        {/* Missing Clock-out (Menu Context) */}
                        <ContextMenu
                            actions={missingClockOutActions}
                            onPress={(e) => {
                                if (e.nativeEvent.index >= 0 && e.nativeEvent.index < missingClockOutOptions.length) {
                                    updateSettingAndSave('ATTENDANCE_RULES', setAttendanceRules, {
                                        ...attendanceRules,
                                        missingClockOutAction: missingClockOutOptions[e.nativeEvent.index].val,
                                    });
                                }
                            }}
                            dropdownMenuMode={true}
                        >
                            <View style={s.ruleIdentityRow}>
                                <View style={s.ruleIdentityLeft}>
                                    <Text style={[s.ruleIdentityTitle, { color: textColor }]}>Missing Clock-out</Text>
                                    <Text style={[s.ruleIdentitySubtitle, { color: subtextColor }]}>
                                        Action when clock-out is missing
                                    </Text>
                                </View>
                                <View style={s.ruleIdentityRight}>
                                    <Text style={[s.ruleIdentityValue, { color: subtextColor }]}>{missingClockOutDisplay}</Text>
                                    <PlatformIcon name="chevron.up.chevron.down" size={12} tintColor={subtextColor} style={{ marginLeft: 6 }} />
                                </View>
                            </View>
                        </ContextMenu>

                        <View style={[s.innerDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

                        {/* Early Leave (Menu Context) */}
                        <ContextMenu
                            actions={earlyLeaveActions}
                            onPress={(e) => {
                                if (e.nativeEvent.index >= 0 && e.nativeEvent.index < earlyLeaveOptions.length) {
                                    updateSettingAndSave('ATTENDANCE_RULES', setAttendanceRules, {
                                        ...attendanceRules,
                                        earlyLeaveAction: earlyLeaveOptions[e.nativeEvent.index].val,
                                    });
                                }
                            }}
                            dropdownMenuMode={true}
                        >
                            <View style={s.ruleIdentityRow}>
                                <View style={s.ruleIdentityLeft}>
                                    <Text style={[s.ruleIdentityTitle, { color: textColor }]}>Early Leave</Text>
                                    <Text style={[s.ruleIdentitySubtitle, { color: subtextColor }]}>
                                        Action when leaving before schedule
                                    </Text>
                                </View>
                                <View style={s.ruleIdentityRight}>
                                    <Text style={[s.ruleIdentityValue, { color: subtextColor }]}>{earlyLeaveDisplay}</Text>
                                    <PlatformIcon name="chevron.up.chevron.down" size={12} tintColor={subtextColor} style={{ marginLeft: 6 }} />
                                </View>
                            </View>
                        </ContextMenu>

                        <View style={[s.innerDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

                        {/* Insufficient Hours (Menu Context) */}
                        <ContextMenu
                            actions={insufficientHoursActions}
                            onPress={(e) => {
                                if (e.nativeEvent.index >= 0 && e.nativeEvent.index < insufficientHoursOptions.length) {
                                    updateSettingAndSave('ATTENDANCE_RULES', setAttendanceRules, {
                                        ...attendanceRules,
                                        insufficientHoursAction: insufficientHoursOptions[e.nativeEvent.index].val,
                                    });
                                }
                            }}
                            dropdownMenuMode={true}
                        >
                            <View style={s.ruleIdentityRow}>
                                <View style={s.ruleIdentityLeft}>
                                    <Text style={[s.ruleIdentityTitle, { color: textColor }]}>Insufficient Hours</Text>
                                    <Text style={[s.ruleIdentitySubtitle, { color: subtextColor }]}>
                                        Action when worked hours are below requirement
                                    </Text>
                                </View>
                                <View style={s.ruleIdentityRight}>
                                    <Text style={[s.ruleIdentityValue, { color: subtextColor }]}>{insufficientHoursDisplay}</Text>
                                    <PlatformIcon name="chevron.up.chevron.down" size={12} tintColor={subtextColor} style={{ marginLeft: 6 }} />
                                </View>
                            </View>
                        </ContextMenu>
                    </View>
                    <Text style={[s.sectionFooterNote, { color: subtextColor }]}>
                        Automated resolution policies applied when attendance records are incomplete or irregular.
                    </Text>
                </View>
            </View>
        );
    };

    // 7. Attendance Period & Timezone (3 Separate Cards with Subtext)
    const renderAttendancePeriod = () => {
        const tzObj = TIMEZONE_OPTIONS.find((t) => t.key.toLowerCase() === (periodConfig.timezone || '').toLowerCase());
        const tzLabel = tzObj ? tzObj.label : (periodConfig.timezone || 'Asia/Jakarta (GMT+7 • WIB)');
        const currentMode = periodConfig.calculationMode || 'cutoff';
        const modeObj = CALCULATION_MODES.find((m) => m.mode === currentMode) || CALCULATION_MODES[0];
        const modeDesc = modeObj.description(periodConfig.cutoffDayStart || 21, periodConfig.cutoffDayEnd || 20);

        const cycleType = periodConfig.cycleType || 'monthly';
        const startDay = periodConfig.cutoffDayStart || 21;
        const endDay = periodConfig.cutoffDayEnd || 20;
        const startWk = periodConfig.startWeekday || 'Monday';
        const endWk = periodConfig.endWeekday || 'Sunday';

        let cycleDisplay = '';
        let cycleSubtext = '';

        if (cycleType === 'weekly') {
            cycleDisplay = `Weekly (${startWk.slice(0, 3)} – ${endWk.slice(0, 3)})`;
            cycleSubtext = `Payroll calculation cycle recurring weekly every ${startWk} to ${endWk}.`;
        } else if (cycleType === 'biweekly') {
            cycleDisplay = `Bi-weekly (${startWk.slice(0, 3)} – ${endWk.slice(0, 3)})`;
            cycleSubtext = `Payroll calculation cycle recurring every 2 weeks (14 days), from ${startWk} to ${endWk}.`;
        } else if (cycleType === 'semimonthly') {
            cycleDisplay = `Semi-monthly (1st-15th & 16th-End)`;
            cycleSubtext = `Payroll calculated twice monthly (1st to 15th, and 16th to month-end).`;
        } else {
            const isMonthEndCycle =
                startDay === 1 &&
                (endDay === 30 || endDay === 31 || endDay === 28);
            cycleDisplay = isMonthEndCycle
                ? 'Every 1st to End of Month'
                : `Every ${startDay}${getDayOrdinal(startDay)} to ${endDay}${getDayOrdinal(endDay)}`;
            const example = getDynamicCutoffExample(startDay, endDay);
            cycleSubtext = `Payroll calculation cycle recurring monthly (e.g. ${example}).`;
        }

        return (
            <View style={{ gap: 14 }}>
                <View style={s.sectionHeader}>
                    <Text style={[s.sectionTitle, { color: isDark ? '#8E8E93' : '#6C6C70' }]}>
                        Period & Timezone
                    </Text>
                </View>

                {/* Card 1: Payroll Cut-off */}
                <View style={{ gap: 4 }}>
                    <View
                        style={[
                            s.identityGroupCard,
                            {
                                backgroundColor: cardBg,
                                borderColor: cardBorder,
                                borderWidth: 1,
                            },
                        ]}
                    >
                        <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setPeriodSheetTarget('cutoff');
                                setPeriodSheetVisible(true);
                            }}
                        >
                            <View style={s.identityFormRow}>
                                <View style={s.identityRowLeft}>
                                    <PlatformIcon name="calendar" size={16} tintColor={subtextColor} style={{ marginRight: 10 }} />
                                    <Text style={[s.identityRowLabel, { color: textColor }]}>
                                        Payroll Cut-off
                                    </Text>
                                </View>
                                <View style={s.identityRowRight}>
                                    <Text style={[s.identityRowValue, { color: subtextColor }]} numberOfLines={1}>
                                        {cycleDisplay}
                                    </Text>
                                    <PlatformIcon name="chevron.forward" size={14} tintColor={subtextColor} style={{ marginLeft: 6 }} />
                                </View>
                            </View>
                        </TouchableOpacity>
                    </View>
                    <Text style={[s.sectionFooterNote, { color: subtextColor }]}>
                        {cycleSubtext}
                    </Text>
                </View>

                {/* Card 2: Company Timezone */}
                <View style={{ gap: 4 }}>
                    <View
                        style={[
                            s.identityGroupCard,
                            {
                                backgroundColor: cardBg,
                                borderColor: cardBorder,
                                borderWidth: 1,
                            },
                        ]}
                    >
                        <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setPeriodSheetTarget('timezone');
                                setPeriodSheetVisible(true);
                            }}
                        >
                            <View style={s.identityFormRow}>
                                <View style={s.identityRowLeft}>
                                    <PlatformIcon name="globe" size={16} tintColor={subtextColor} style={{ marginRight: 10 }} />
                                    <Text style={[s.identityRowLabel, { color: textColor }]}>
                                        Timezone
                                    </Text>
                                </View>
                                <View style={s.identityRowRight}>
                                    <Text style={[s.identityRowValue, { color: subtextColor }]} numberOfLines={1}>
                                        {tzLabel}
                                    </Text>
                                    <PlatformIcon name="chevron.forward" size={14} tintColor={subtextColor} style={{ marginLeft: 6 }} />
                                </View>
                            </View>
                        </TouchableOpacity>
                    </View>
                    <Text style={[s.sectionFooterNote, { color: subtextColor }]}>
                        Default timestamp standard for mobile clock-ins, geofence validations, and report exports.
                    </Text>
                </View>

                {/* Card 3: Attendance Period */}
                <View style={{ gap: 4 }}>
                    <View
                        style={[
                            s.identityGroupCard,
                            {
                                backgroundColor: cardBg,
                                borderColor: cardBorder,
                                borderWidth: 1,
                            },
                        ]}
                    >
                        <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setPeriodSheetTarget('calculation_mode');
                                setPeriodSheetVisible(true);
                            }}
                        >
                            <View style={s.identityFormRow}>
                                <View style={s.identityRowLeft}>
                                    <PlatformIcon name="clock" size={16} tintColor={subtextColor} style={{ marginRight: 10 }} />
                                    <Text style={[s.identityRowLabel, { color: textColor }]}>
                                        Attendance Period
                                    </Text>
                                </View>
                                <View style={s.identityRowRight}>
                                    <Text style={[s.identityRowValue, { color: subtextColor }]} numberOfLines={1}>
                                        {modeObj.title}
                                    </Text>
                                    <PlatformIcon name="chevron.forward" size={14} tintColor={subtextColor} style={{ marginLeft: 6 }} />
                                </View>
                            </View>
                        </TouchableOpacity>
                    </View>
                    <Text style={[s.sectionFooterNote, { color: subtextColor }]}>
                        {modeDesc}
                    </Text>
                </View>
            </View>
        );
    };

    // 8. Attendance Corrections Policy (Separated iOS-style cards)
    const renderAttendanceCorrections = () => {
        const backdateOptions = [
            { label: '1 Day', val: 1 },
            { label: '2 Days', val: 2 },
            { label: '3 Days', val: 3 },
            { label: '7 Days', val: 7 },
            { label: '14 Days', val: 14 },
            { label: '30 Days', val: 30 },
        ];
        const backdateActions: ContextMenuAction[] = backdateOptions.map((opt) => ({
            title: opt.label,
            selected: correctionConfig.maxBackdateDays === opt.val,
        }));
        const currentBackdateLabel = `${correctionConfig.maxBackdateDays} ${correctionConfig.maxBackdateDays === 1 ? 'Day' : 'Days'}`;

        const evidenceOptions: Array<{ label: string; val: 'optional' | 'required' }> = [
            { label: 'Optional', val: 'optional' },
            { label: 'Required', val: 'required' },
        ];
        const evidenceActions: ContextMenuAction[] = evidenceOptions.map((opt) => ({
            title: opt.label,
            selected: correctionConfig.evidenceAttachment === opt.val,
        }));
        const currentEvidenceLabel = correctionConfig.evidenceAttachment === 'required' ? 'Required' : 'Optional';

        const correctionTypeItems: Array<{ type: CorrectionFieldType; title: string; subtitle: string }> = [
            {
                type: 'clock_in',
                title: 'Clock-in Time',
                subtitle: 'Allow editing recorded clock-in timestamp',
            },
            {
                type: 'clock_out',
                title: 'Clock-out Time',
                subtitle: 'Allow editing recorded clock-out timestamp',
            },
            {
                type: 'work_location',
                title: 'Work Location',
                subtitle: 'Allow changing assigned or detected location',
            },
            {
                type: 'attendance_status',
                title: 'Attendance Status',
                subtitle: 'Allow updating on-time, late, or absent classification',
            },
        ];

        const toggleCorrectionType = (type: CorrectionFieldType) => {
            Haptics.selectionAsync();
            const current = correctionConfig.allowedCorrectionTypes || [];
            let updated: CorrectionFieldType[];
            if (current.includes(type)) {
                if (current.length <= 1) {
                    Alert.alert('Notice', 'At least one correction type must remain enabled.');
                    return;
                }
                updated = current.filter((t) => t !== type);
            } else {
                updated = [...current, type];
            }
            updateSettingAndSave('ATTENDANCE_CORRECTIONS', setCorrectionConfig, {
                ...correctionConfig,
                allowedCorrectionTypes: updated,
            });
        };

        return (
            <View style={{ gap: 14 }}>
                {/* 1. CORRECTION ACCESS */}
                <View style={{ gap: 6 }}>
                    <View style={s.sectionHeader}>
                        <Text style={[s.sectionTitle, { color: isDark ? '#8E8E93' : '#6C6C70' }]}>
                            Correction Access
                        </Text>
                    </View>
                    <View
                        style={[
                            s.identityGroupCard,
                            {
                                backgroundColor: cardBg,
                                borderColor: cardBorder,
                                borderWidth: 1,
                            },
                        ]}
                    >
                        {/* Allow Attendance Correction */}
                        <View style={s.ruleIdentityRow}>
                            <View style={s.ruleIdentityLeft}>
                                <Text style={[s.ruleIdentityTitle, { color: textColor }]}>Allow Attendance Correction</Text>
                                <Text style={[s.ruleIdentitySubtitle, { color: subtextColor }]}>
                                    Allow users to request attendance edits
                                </Text>
                            </View>
                            <Switch
                                value={correctionConfig.allowAttendanceCorrection}
                                onValueChange={(val) =>
                                    updateSettingAndSave('ATTENDANCE_CORRECTIONS', setCorrectionConfig, {
                                        ...correctionConfig,
                                        allowAttendanceCorrection: val,
                                    })
                                }
                                trackColor={{ false: isDark ? '#39393D' : '#E5E5EA', true: '#34C759' }}
                            />
                        </View>

                        <View style={[s.innerDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

                        {/* Correction Requires Approval */}
                        <View style={s.ruleIdentityRow}>
                            <View style={s.ruleIdentityLeft}>
                                <Text style={[s.ruleIdentityTitle, { color: textColor }]}>Correction Requires Approval</Text>
                                <Text style={[s.ruleIdentitySubtitle, { color: subtextColor }]}>
                                    Require approval before changes are applied
                                </Text>
                            </View>
                            <Switch
                                value={correctionConfig.requireApproval}
                                onValueChange={(val) =>
                                    updateSettingAndSave('ATTENDANCE_CORRECTIONS', setCorrectionConfig, {
                                        ...correctionConfig,
                                        requireApproval: val,
                                    })
                                }
                                trackColor={{ false: isDark ? '#39393D' : '#E5E5EA', true: '#34C759' }}
                            />
                        </View>
                    </View>
                    <Text style={[s.sectionFooterNote, { color: subtextColor }]}>
                        Controls whether members are permitted to submit correction requests and if manager approval is mandatory.
                    </Text>
                </View>

                {/* 2. CORRECTION WINDOW */}
                <View style={{ gap: 6 }}>
                    <View style={s.sectionHeader}>
                        <Text style={[s.sectionTitle, { color: isDark ? '#8E8E93' : '#6C6C70' }]}>
                            Correction Window
                        </Text>
                    </View>
                    <View
                        style={[
                            s.identityGroupCard,
                            {
                                backgroundColor: cardBg,
                                borderColor: cardBorder,
                                borderWidth: 1,
                            },
                        ]}
                    >
                        <ContextMenu
                            actions={backdateActions}
                            onPress={(e) => {
                                if (e.nativeEvent.index >= 0 && e.nativeEvent.index < backdateOptions.length) {
                                    updateSettingAndSave('ATTENDANCE_CORRECTIONS', setCorrectionConfig, {
                                        ...correctionConfig,
                                        maxBackdateDays: backdateOptions[e.nativeEvent.index].val,
                                    });
                                }
                            }}
                            dropdownMenuMode={true}
                        >
                            <View style={s.ruleIdentityRow}>
                                <View style={s.ruleIdentityLeft}>
                                    <Text style={[s.ruleIdentityTitle, { color: textColor }]}>Maximum Backdate</Text>
                                    <Text style={[s.ruleIdentitySubtitle, { color: subtextColor }]}>
                                        Maximum number of days users can submit corrections after attendance date
                                    </Text>
                                </View>
                                <View style={s.ruleIdentityRight}>
                                    <Text style={[s.ruleIdentityValue, { color: subtextColor }]}>{currentBackdateLabel}</Text>
                                    <PlatformIcon name="chevron.up.chevron.down" size={12} tintColor={subtextColor} style={{ marginLeft: 6 }} />
                                </View>
                            </View>
                        </ContextMenu>
                    </View>
                    <Text style={[s.sectionFooterNote, { color: subtextColor }]}>
                        Attendance records older than this limit cannot be submitted for correction by standard users.
                    </Text>
                </View>

                {/* 3. EVIDENCE & REASON */}
                <View style={{ gap: 6 }}>
                    <View style={s.sectionHeader}>
                        <Text style={[s.sectionTitle, { color: isDark ? '#8E8E93' : '#6C6C70' }]}>
                            Evidence & Reason
                        </Text>
                    </View>
                    <View
                        style={[
                            s.identityGroupCard,
                            {
                                backgroundColor: cardBg,
                                borderColor: cardBorder,
                                borderWidth: 1,
                            },
                        ]}
                    >
                        {/* Reason Required */}
                        <View style={s.ruleIdentityRow}>
                            <View style={s.ruleIdentityLeft}>
                                <Text style={[s.ruleIdentityTitle, { color: textColor }]}>Reason Required</Text>
                                <Text style={[s.ruleIdentitySubtitle, { color: subtextColor }]}>
                                    Require correction reason
                                </Text>
                            </View>
                            <Switch
                                value={correctionConfig.requireReason}
                                onValueChange={(val) =>
                                    updateSettingAndSave('ATTENDANCE_CORRECTIONS', setCorrectionConfig, {
                                        ...correctionConfig,
                                        requireReason: val,
                                    })
                                }
                                trackColor={{ false: isDark ? '#39393D' : '#E5E5EA', true: '#34C759' }}
                            />
                        </View>

                        <View style={[s.innerDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

                        {/* Evidence Attachment */}
                        <ContextMenu
                            actions={evidenceActions}
                            onPress={(e) => {
                                if (e.nativeEvent.index >= 0 && e.nativeEvent.index < evidenceOptions.length) {
                                    updateSettingAndSave('ATTENDANCE_CORRECTIONS', setCorrectionConfig, {
                                        ...correctionConfig,
                                        evidenceAttachment: evidenceOptions[e.nativeEvent.index].val,
                                    });
                                }
                            }}
                            dropdownMenuMode={true}
                        >
                            <View style={s.ruleIdentityRow}>
                                <View style={s.ruleIdentityLeft}>
                                    <Text style={[s.ruleIdentityTitle, { color: textColor }]}>Evidence Attachment</Text>
                                    <Text style={[s.ruleIdentitySubtitle, { color: subtextColor }]}>
                                        Supporting file/photo requirement
                                    </Text>
                                </View>
                                <View style={s.ruleIdentityRight}>
                                    <Text style={[s.ruleIdentityValue, { color: subtextColor }]}>{currentEvidenceLabel}</Text>
                                    <PlatformIcon name="chevron.up.chevron.down" size={12} tintColor={subtextColor} style={{ marginLeft: 6 }} />
                                </View>
                            </View>
                        </ContextMenu>
                    </View>
                    <Text style={[s.sectionFooterNote, { color: subtextColor }]}>
                        Requires employees to provide justification notes and upload proof attachments with correction requests.
                    </Text>
                </View>

                {/* 4. ALLOWED CORRECTION TYPES */}
                <View style={{ gap: 6 }}>
                    <View style={s.sectionHeader}>
                        <Text style={[s.sectionTitle, { color: isDark ? '#8E8E93' : '#6C6C70' }]}>
                            Allowed Correction Types
                        </Text>
                    </View>
                    <View
                        style={[
                            s.identityGroupCard,
                            {
                                backgroundColor: cardBg,
                                borderColor: cardBorder,
                                borderWidth: 1,
                            },
                        ]}
                    >
                        {correctionTypeItems.map((item, idx) => {
                            const isSelected = (correctionConfig.allowedCorrectionTypes || []).includes(item.type);
                            return (
                                <React.Fragment key={item.type}>
                                    {idx > 0 && (
                                        <View style={[s.innerDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />
                                    )}
                                    <View style={s.ruleIdentityRow}>
                                        <View style={s.ruleIdentityLeft}>
                                            <Text style={[s.ruleIdentityTitle, { color: textColor }]}>{item.title}</Text>
                                            <Text style={[s.ruleIdentitySubtitle, { color: subtextColor }]}>
                                                {item.subtitle}
                                            </Text>
                                        </View>
                                        <Switch
                                            value={isSelected}
                                            onValueChange={() => toggleCorrectionType(item.type)}
                                            trackColor={{ false: isDark ? '#39393D' : '#E5E5EA', true: '#34C759' }}
                                        />
                                    </View>
                                </React.Fragment>
                            );
                        })}
                    </View>
                    <Text style={[s.sectionFooterNote, { color: subtextColor }]}>
                        Defines which attendance attributes employees are permitted to submit modification requests for.
                    </Text>
                </View>
            </View>
        );
    };

    // 8b. Remote Work Policies (4 Compact Clickable Cards)
    const renderRemoteWorkPolicies = () => {
        const remoteModes: RemoteWorkModeKey[] = ['wfo', 'wfh', 'wfa', 'business_trip'];

        return (
            <View style={{ gap: 14 }}>
                <View style={{ gap: 8 }}>
                    <View style={s.sectionHeader}>
                        <Text style={[s.sectionTitle, { color: isDark ? '#8E8E93' : '#6C6C70' }]}>
                            Remote Work Modes
                        </Text>
                    </View>

                    <View style={{ gap: 10 }}>
                        {remoteModes.map((modeKey) => {
                            const policy = remoteWorkConfig[modeKey];
                            if (!policy) return null;

                            const policyText = policy.isEnabled
                                ? policy.policyBadge || 'Active'
                                : 'Disabled';

                            return (
                                <TouchableOpacity
                                    key={policy.id}
                                    activeOpacity={0.72}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setSelectedRemotePolicyKey(modeKey);
                                        setRemotePolicyModalVisible(true);
                                    }}
                                >
                                    <View style={[
                                            s.remoteModeCard,
                                            {
                                                backgroundColor: cardBg,
                                                borderColor: cardBorder,
                                            },
                                        ]}
                                    >
                                        <View style={s.remoteCardTopRow}>
                                            <View
                                                style={[
                                                    s.remoteModeIconWrap,
                                                    {
                                                        backgroundColor: policy.isEnabled
                                                            ? `${policy.color}18`
                                                            : isDark
                                                            ? 'rgba(255,255,255,0.06)'
                                                            : 'rgba(0,0,0,0.05)',
                                                    },
                                                ]}
                                            >
                                                <PlatformIcon
                                                    name={policy.icon}
                                                    size={20}
                                                    tintColor={policy.isEnabled ? policy.color : subtextColor}
                                                />
                                            </View>

                                            <View style={s.remoteCardContent}>
                                                {/* 1. Nama */}
                                                <Text
                                                    style={[
                                                        s.remoteModeTitle,
                                                        { color: textColor, opacity: policy.isEnabled ? 1 : 0.6 },
                                                    ]}
                                                >
                                                    {policy.name}
                                                </Text>

                                                {/* 2. Subtitle */}
                                                <Text
                                                    style={[s.remoteModeDescription, { color: subtextColor }]}
                                                >
                                                    {policy.description}
                                                </Text>

                                                {/* 3. Keterangan Utama */}
                                                <Text
                                                    style={[
                                                        s.remotePolicyNotice,
                                                        { color: subtextColor },
                                                    ]}
                                                >
                                                    {policyText}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <Text style={[s.sectionFooterNote, { color: subtextColor }]}>
                        Tap any mode above to customize clock-in permissions, approval workflows, and location validation.
                    </Text>
                </View>
            </View>
        );
    };

    // 8c. Security & Anti-Fraud Policy Setup (3 Policy Sections)
    const renderAntiFraudPolicy = () => {
        // Location Accuracy Options
        const accuracyOptions = [
            { label: '≤ 20 m (Strict)', val: 20 },
            { label: '≤ 50 m (Standard)', val: 50 },
            { label: '≤ 100 m (Balanced)', val: 100 },
            { label: '≤ 200 m (Relaxed)', val: 200 },
            { label: 'Disabled (Any Accuracy)', val: 0 },
        ];
        const accuracyActions: ContextMenuAction[] = accuracyOptions.map((opt) => ({
            title: opt.label,
            selected: (antiFraudConfig.minGpsAccuracyMeters ?? 50) === opt.val,
        }));
        const currentAccuracy = antiFraudConfig.minGpsAccuracyMeters ?? 50;
        const currentAccuracyLabel = currentAccuracy === 0 ? 'Disabled' : `≤ ${currentAccuracy} m`;

        // Device Binding Options
        const deviceLimitOptions = [
            { label: '1 Device per Account', val: 1 },
            { label: '2 Devices per Account', val: 2 },
            { label: '3 Devices per Account', val: 3 },
            { label: 'Unlimited Devices', val: 0 },
        ];
        const deviceLimitActions: ContextMenuAction[] = deviceLimitOptions.map((opt) => ({
            title: opt.label,
            selected: (antiFraudConfig.maxRegisteredDevicesPerUser ?? 1) === opt.val,
        }));
        const currentLimit = antiFraudConfig.maxRegisteredDevicesPerUser ?? 1;
        const currentDeviceLimitLabel = currentLimit === 0 ? 'Unlimited' : `${currentLimit} ${currentLimit === 1 ? 'Device' : 'Devices'}`;

        return (
            <View style={{ gap: 14 }}>
                {/* 1. Location Security */}
                <View style={{ gap: 6 }}>
                    <View style={s.sectionHeader}>
                        <Text style={[s.sectionTitle, { color: isDark ? '#8E8E93' : '#6C6C70' }]}>
                            Location Security
                        </Text>
                    </View>
                    <View
                        style={[
                            s.identityGroupCard,
                            {
                                backgroundColor: cardBg,
                                borderColor: cardBorder,
                                borderWidth: 1,
                            },
                        ]}
                    >
                        {/* Block Mock/Fake GPS */}
                        <View style={s.ruleIdentityRow}>
                            <View style={s.ruleIdentityLeft}>
                                <Text style={[s.ruleIdentityTitle, { color: textColor }]}>Block Mock/Fake GPS</Text>
                                <Text style={[s.ruleIdentitySubtitle, { color: subtextColor }]}>
                                    Prevent attendance using mock location
                                </Text>
                            </View>
                            <Switch
                                value={antiFraudConfig.blockMockGps}
                                onValueChange={(val) =>
                                    updateSettingAndSave('ANTI_FRAUD', setAntiFraudConfig, {
                                        ...antiFraudConfig,
                                        blockMockGps: val,
                                    })
                                }
                                trackColor={{ false: isDark ? '#39393D' : '#E5E5EA', true: '#34C759' }}
                            />
                        </View>

                        <View style={[s.innerDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

                        {/* Location Accuracy Check */}
                        <ContextMenu
                            actions={accuracyActions}
                            onPress={(e) => {
                                if (e.nativeEvent.index >= 0 && e.nativeEvent.index < accuracyOptions.length) {
                                    updateSettingAndSave('ANTI_FRAUD', setAntiFraudConfig, {
                                        ...antiFraudConfig,
                                        minGpsAccuracyMeters: accuracyOptions[e.nativeEvent.index].val,
                                    });
                                }
                            }}
                            dropdownMenuMode={true}
                        >
                            <View style={s.ruleIdentityRow}>
                                <View style={s.ruleIdentityLeft}>
                                    <Text style={[s.ruleIdentityTitle, { color: textColor }]}>Location Accuracy Check</Text>
                                    <Text style={[s.ruleIdentitySubtitle, { color: subtextColor }]}>
                                        Require minimum GPS accuracy before clock-in
                                    </Text>
                                </View>
                                <View style={s.ruleIdentityRight}>
                                    <Text style={[s.ruleIdentityValue, { color: subtextColor }]}>{currentAccuracyLabel}</Text>
                                    <PlatformIcon name="chevron.up.chevron.down" size={12} tintColor={subtextColor} style={{ marginLeft: 6 }} />
                                </View>
                            </View>
                        </ContextMenu>

                        <View style={[s.innerDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

                        {/* Geofence Validation */}
                        <View style={s.ruleIdentityRow}>
                            <View style={s.ruleIdentityLeft}>
                                <Text style={[s.ruleIdentityTitle, { color: textColor }]}>Geofence Validation</Text>
                                <Text style={[s.ruleIdentitySubtitle, { color: subtextColor }]}>
                                    Validate attendance against registered geofence
                                </Text>
                            </View>
                            <Switch
                                value={antiFraudConfig.validateGeofence ?? true}
                                onValueChange={(val) =>
                                    updateSettingAndSave('ANTI_FRAUD', setAntiFraudConfig, {
                                        ...antiFraudConfig,
                                        validateGeofence: val,
                                    })
                                }
                                trackColor={{ false: isDark ? '#39393D' : '#E5E5EA', true: '#34C759' }}
                            />
                        </View>
                    </View>
                    <Text style={[s.sectionFooterNote, { color: subtextColor }]}>
                        Restricts clock-in attempts when GPS spoofing or location inaccuracy is detected.
                    </Text>
                </View>

                {/* 2. Identity Verification */}
                <View style={{ gap: 6 }}>
                    <View style={s.sectionHeader}>
                        <Text style={[s.sectionTitle, { color: isDark ? '#8E8E93' : '#6C6C70' }]}>
                            Identity Verification
                        </Text>
                    </View>
                    <View
                        style={[
                            s.identityGroupCard,
                            {
                                backgroundColor: cardBg,
                                borderColor: cardBorder,
                                borderWidth: 1,
                            },
                        ]}
                    >
                        {/* Face Liveness Check */}
                        <View style={s.ruleIdentityRow}>
                            <View style={s.ruleIdentityLeft}>
                                <Text style={[s.ruleIdentityTitle, { color: textColor }]}>Face Liveness Check</Text>
                                <Text style={[s.ruleIdentitySubtitle, { color: subtextColor }]}>
                                    Verify live face during selfie attendance
                                </Text>
                            </View>
                            <Switch
                                value={antiFraudConfig.enableFaceVerification}
                                onValueChange={(val) =>
                                    updateSettingAndSave('ANTI_FRAUD', setAntiFraudConfig, {
                                        ...antiFraudConfig,
                                        enableFaceVerification: val,
                                    })
                                }
                                trackColor={{ false: isDark ? '#39393D' : '#E5E5EA', true: '#34C759' }}
                            />
                        </View>

                        <View style={[s.innerDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

                        {/* Face Match Verification */}
                        <View style={s.ruleIdentityRow}>
                            <View style={s.ruleIdentityLeft}>
                                <Text style={[s.ruleIdentityTitle, { color: textColor }]}>Face Match Verification</Text>
                                <Text style={[s.ruleIdentitySubtitle, { color: subtextColor }]}>
                                    Match selfie with employee profile photo
                                </Text>
                            </View>
                            <Switch
                                value={antiFraudConfig.faceMatchVerification ?? false}
                                onValueChange={(val) =>
                                    updateSettingAndSave('ANTI_FRAUD', setAntiFraudConfig, {
                                        ...antiFraudConfig,
                                        faceMatchVerification: val,
                                    })
                                }
                                trackColor={{ false: isDark ? '#39393D' : '#E5E5EA', true: '#34C759' }}
                            />
                        </View>

                        <View style={[s.innerDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

                        {/* Repeated Selfie Detection */}
                        <View style={s.ruleIdentityRow}>
                            <View style={s.ruleIdentityLeft}>
                                <Text style={[s.ruleIdentityTitle, { color: textColor }]}>Repeated Selfie Detection</Text>
                                <Text style={[s.ruleIdentitySubtitle, { color: subtextColor }]}>
                                    Prevent reuse of the same attendance photo
                                </Text>
                            </View>
                            <Switch
                                value={antiFraudConfig.preventRepeatedSelfie ?? true}
                                onValueChange={(val) =>
                                    updateSettingAndSave('ANTI_FRAUD', setAntiFraudConfig, {
                                        ...antiFraudConfig,
                                        preventRepeatedSelfie: val,
                                    })
                                }
                                trackColor={{ false: isDark ? '#39393D' : '#E5E5EA', true: '#34C759' }}
                            />
                        </View>
                    </View>
                    <Text style={[s.sectionFooterNote, { color: subtextColor }]}>
                        Face match uses verified profile photos in People as reference for biometric matching.
                    </Text>
                </View>

                {/* 3. Device Security */}
                <View style={{ gap: 6 }}>
                    <View style={s.sectionHeader}>
                        <Text style={[s.sectionTitle, { color: isDark ? '#8E8E93' : '#6C6C70' }]}>
                            Device Security
                        </Text>
                    </View>
                    <View
                        style={[
                            s.identityGroupCard,
                            {
                                backgroundColor: cardBg,
                                borderColor: cardBorder,
                                borderWidth: 1,
                            },
                        ]}
                    >
                        {/* Device Binding */}
                        <View style={s.ruleIdentityRow}>
                            <View style={s.ruleIdentityLeft}>
                                <Text style={[s.ruleIdentityTitle, { color: textColor }]}>Device Binding</Text>
                                <Text style={[s.ruleIdentitySubtitle, { color: subtextColor }]}>
                                    Limit attendance to registered devices
                                </Text>
                            </View>
                            <Switch
                                value={antiFraudConfig.enforceDeviceBinding}
                                onValueChange={(val) =>
                                    updateSettingAndSave('ANTI_FRAUD', setAntiFraudConfig, {
                                        ...antiFraudConfig,
                                        enforceDeviceBinding: val,
                                    })
                                }
                                trackColor={{ false: isDark ? '#39393D' : '#E5E5EA', true: '#34C759' }}
                            />
                        </View>

                        <View style={[s.innerDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

                        {/* Allowed Devices per Account */}
                        <ContextMenu
                            actions={deviceLimitActions}
                            onPress={(e) => {
                                if (e.nativeEvent.index >= 0 && e.nativeEvent.index < deviceLimitOptions.length) {
                                    updateSettingAndSave('ANTI_FRAUD', setAntiFraudConfig, {
                                        ...antiFraudConfig,
                                        maxRegisteredDevicesPerUser: deviceLimitOptions[e.nativeEvent.index].val,
                                    });
                                }
                            }}
                            dropdownMenuMode={true}
                        >
                            <View style={s.ruleIdentityRow}>
                                <View style={s.ruleIdentityLeft}>
                                    <Text style={[s.ruleIdentityTitle, { color: textColor }]}>Allowed Devices per Account</Text>
                                    <Text style={[s.ruleIdentitySubtitle, { color: subtextColor }]}>
                                        Maximum registered devices
                                    </Text>
                                </View>
                                <View style={s.ruleIdentityRight}>
                                    <Text style={[s.ruleIdentityValue, { color: subtextColor }]}>{currentDeviceLimitLabel}</Text>
                                    <PlatformIcon name="chevron.up.chevron.down" size={12} tintColor={subtextColor} style={{ marginLeft: 6 }} />
                                </View>
                            </View>
                        </ContextMenu>

                        <View style={[s.innerDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

                        {/* New Device Verification */}
                        <View style={s.ruleIdentityRow}>
                            <View style={s.ruleIdentityLeft}>
                                <Text style={[s.ruleIdentityTitle, { color: textColor }]}>New Device Verification</Text>
                                <Text style={[s.ruleIdentitySubtitle, { color: subtextColor }]}>
                                    Require verification when using a new device
                                </Text>
                            </View>
                            <Switch
                                value={antiFraudConfig.requireNewDeviceVerification ?? true}
                                onValueChange={(val) =>
                                    updateSettingAndSave('ANTI_FRAUD', setAntiFraudConfig, {
                                        ...antiFraudConfig,
                                        requireNewDeviceVerification: val,
                                    })
                                }
                                trackColor={{ false: isDark ? '#39393D' : '#E5E5EA', true: '#34C759' }}
                            />
                        </View>
                    </View>
                    <Text style={[s.sectionFooterNote, { color: subtextColor }]}>
                        Prevents account sharing and unauthorized attendance logging from unfamiliar devices.
                    </Text>
                </View>
            </View>
        );
    };

    // 8d. Overtime Policies (Limits, Calculation & Approvals)
    const renderOvertimePolicies = () => {
        const dailyHours = overtimeConfig.maxDailyOvertimeHours ?? 4;
        const dailyMinutes = overtimeConfig.maxDailyOvertimeMinutes ?? 0;
        const weeklyHours = overtimeConfig.maxWeeklyOvertimeHours ?? 18;
        const weeklyMinutes = overtimeConfig.maxWeeklyOvertimeMinutes ?? 0;
        const minThreshold = overtimeConfig.minOvertimeThresholdMinutes ?? 30;

        const firstHourRate = overtimeConfig.rateMultiplierFirstHour ?? 1.5;
        const nextHourRate = overtimeConfig.rateMultiplierSubsequent ?? 2.0;
        const holidayRate = overtimeConfig.holidayRateMultiplier ?? 2.0;

        const reqRequest = overtimeConfig.requireOvertimeRequest ?? true;
        const reqApproval = overtimeConfig.requireApproval ?? true;

        const promptCustomMultiplier = (
            field: 'rateMultiplierFirstHour' | 'rateMultiplierSubsequent' | 'holidayRateMultiplier',
            title: string,
            currentValue: number
        ) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (Platform.OS === 'ios') {
                Alert.prompt(
                    title,
                    'Enter custom rate multiplier (e.g. 1.12, 1.5, 2.0, 3.56):',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        {
                            text: 'Save',
                            onPress: (val?: string) => {
                                if (!val) return;
                                const parsed = parseFloat(val.replace(',', '.').trim());
                                if (!isNaN(parsed) && parsed >= 0) {
                                    const rounded = Math.round(parsed * 100) / 100;
                                    updateSettingAndSave('OVERTIME', setOvertimeConfig, {
                                        ...overtimeConfig,
                                        [field]: rounded,
                                    });
                                } else {
                                    Alert.alert('Invalid Multiplier', 'Please enter a valid rate multiplier (e.g. 1.12, 3.56).');
                                }
                            },
                        },
                    ],
                    'plain-text',
                    String(currentValue),
                    'decimal-pad'
                );
            }
        };

        // 1. Daily limit options
        const dailyLimitOptions = [
            { label: '1 hr 00 min', h: 1, m: 0 },
            { label: '1 hr 30 min', h: 1, m: 30 },
            { label: '2 hr 00 min', h: 2, m: 0 },
            { label: '2 hr 30 min', h: 2, m: 30 },
            { label: '3 hr 00 min', h: 3, m: 0 },
            { label: '3 hr 30 min', h: 3, m: 30 },
            { label: '4 hr 00 min (Standard)', h: 4, m: 0 },
            { label: '5 hr 00 min', h: 5, m: 0 },
            { label: '6 hr 00 min', h: 6, m: 0 },
            { label: '8 hr 00 min', h: 8, m: 0 },
            { label: 'Unlimited (No Daily Cap)', h: 0, m: 0 },
        ];
        const dailyLimitActions: ContextMenuAction[] = dailyLimitOptions.map((opt) => ({
            title: opt.label,
            selected: dailyHours === opt.h && dailyMinutes === opt.m,
        }));
        const dailyDisplay = dailyHours === 0 && dailyMinutes === 0
            ? 'Unlimited'
            : `${dailyHours} hr ${String(dailyMinutes).padStart(2, '0')} min`;

        // 2. Weekly limit options
        const weeklyLimitOptions = [
            { label: '10 hr 00 min', h: 10, m: 0 },
            { label: '12 hr 00 min', h: 12, m: 0 },
            { label: '14 hr 00 min', h: 14, m: 0 },
            { label: '16 hr 00 min', h: 16, m: 0 },
            { label: '18 hr 00 min (Standard)', h: 18, m: 0 },
            { label: '20 hr 00 min', h: 20, m: 0 },
            { label: '24 hr 00 min', h: 24, m: 0 },
            { label: '30 hr 00 min', h: 30, m: 0 },
            { label: 'Unlimited (No Weekly Cap)', h: 0, m: 0 },
        ];
        const weeklyLimitActions: ContextMenuAction[] = weeklyLimitOptions.map((opt) => ({
            title: opt.label,
            selected: weeklyHours === opt.h && weeklyMinutes === opt.m,
        }));
        const weeklyDisplay = weeklyHours === 0 && weeklyMinutes === 0
            ? 'Unlimited'
            : `${weeklyHours} hr ${String(weeklyMinutes).padStart(2, '0')} min`;

        // 3. Min threshold options
        const thresholdOptions = [
            { label: '0 min (Immediate / No Threshold)', val: 0 },
            { label: '15 min', val: 15 },
            { label: '30 min (Default)', val: 30 },
            { label: '45 min', val: 45 },
            { label: '60 min (1 Hour)', val: 60 },
            { label: '90 min (1.5 Hours)', val: 90 },
            { label: '120 min (2 Hours)', val: 120 },
        ];
        const thresholdActions: ContextMenuAction[] = thresholdOptions.map((opt) => ({
            title: opt.label,
            selected: minThreshold === opt.val,
        }));
        const thresholdDisplay = minThreshold === 0 ? '0 min' : `${minThreshold} min`;

        // 4. First hour multiplier options
        const isFirstHourPreset = [1.0, 1.25, 1.5, 1.75, 2.0].includes(firstHourRate);
        const firstHourOptions = [
            { label: '1.0× (Normal Rate)', val: 1.0 },
            { label: '1.25× Rate', val: 1.25 },
            { label: '1.5× Rate (Standard)', val: 1.5 },
            { label: '1.75× Rate', val: 1.75 },
            { label: '2.0× Rate (Double Rate)', val: 2.0 },
            { label: !isFirstHourPreset ? `Custom (${firstHourRate}×)` : 'Custom Multiplier...', val: -1 },
        ];
        const firstHourActions: ContextMenuAction[] = firstHourOptions.map((opt) => ({
            title: opt.label,
            selected: opt.val === -1 ? !isFirstHourPreset : firstHourRate === opt.val,
        }));
        const firstHourDisplay = `${firstHourRate}×`;

        // 5. Next hour multiplier options
        const isNextHourPreset = [1.5, 1.75, 2.0, 2.5, 3.0].includes(nextHourRate);
        const nextHourOptions = [
            { label: '1.5× Rate', val: 1.5 },
            { label: '1.75× Rate', val: 1.75 },
            { label: '2.0× Rate (Standard)', val: 2.0 },
            { label: '2.5× Rate', val: 2.5 },
            { label: '3.0× Rate (Triple Rate)', val: 3.0 },
            { label: !isNextHourPreset ? `Custom (${nextHourRate}×)` : 'Custom Multiplier...', val: -1 },
        ];
        const nextHourActions: ContextMenuAction[] = nextHourOptions.map((opt) => ({
            title: opt.label,
            selected: opt.val === -1 ? !isNextHourPreset : nextHourRate === opt.val,
        }));
        const nextHourDisplay = `${nextHourRate}×`;

        // 6. Holiday / Rest Day multiplier options
        const isHolidayPreset = [1.5, 2.0, 2.5, 3.0, 4.0].includes(holidayRate);
        const holidayOptions = [
            { label: '1.5× Rate (Regular Multiplier)', val: 1.5 },
            { label: '2.0× Rate (Standard Weekend / Rest Day)', val: 2.0 },
            { label: '2.5× Rate (Enhanced Rest Day)', val: 2.5 },
            { label: '3.0× Rate (Triple - National Holiday)', val: 3.0 },
            { label: '4.0× Rate (Quadruple Rate)', val: 4.0 },
            { label: !isHolidayPreset ? `Custom (${holidayRate}×)` : 'Custom Multiplier...', val: -1 },
        ];
        const holidayActions: ContextMenuAction[] = holidayOptions.map((opt) => ({
            title: opt.label,
            selected: opt.val === -1 ? !isHolidayPreset : holidayRate === opt.val,
        }));
        const holidayDisplay = `${holidayRate}×`;

        return (
            <View style={{ gap: 14 }}>
                {/* 1. Overtime Limits */}
                <View style={{ gap: 6 }}>
                    <View style={s.sectionHeader}>
                        <Text style={[s.sectionTitle, { color: isDark ? '#8E8E93' : '#6C6C70' }]}>
                            Overtime Limits
                        </Text>
                    </View>
                    <View style={[
                            s.identityGroupCard,
                            {
                                backgroundColor: cardBg,
                                borderColor: cardBorder,
                            },
                        ]}
                    >
                        {/* Max Daily Overtime */}
                        <ContextMenu
                            actions={dailyLimitActions}
                            onPress={(e) => {
                                if (e.nativeEvent.index >= 0 && e.nativeEvent.index < dailyLimitOptions.length) {
                                    const opt = dailyLimitOptions[e.nativeEvent.index];
                                    updateSettingAndSave('OVERTIME', setOvertimeConfig, {
                                        ...overtimeConfig,
                                        maxDailyOvertimeHours: opt.h,
                                        maxDailyOvertimeMinutes: opt.m,
                                    });
                                }
                            }}
                            dropdownMenuMode={true}
                        >
                            <View style={s.ruleIdentityRow}>
                                <View style={s.ruleIdentityLeft}>
                                    <Text style={[s.ruleIdentityTitle, { color: textColor }]}>Max Daily Overtime</Text>
                                    <Text style={[s.ruleIdentitySubtitle, { color: subtextColor }]}>
                                        Maximum overtime allowed per day
                                    </Text>
                                </View>
                                <View style={s.ruleIdentityRight}>
                                    <Text style={[s.ruleIdentityValue, { color: subtextColor }]}>{dailyDisplay}</Text>
                                    <PlatformIcon name="chevron.up.chevron.down" size={12} tintColor={subtextColor} style={{ marginLeft: 6 }} />
                                </View>
                            </View>
                        </ContextMenu>

                        <View style={[s.innerDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

                        {/* Max Weekly Overtime */}
                        <ContextMenu
                            actions={weeklyLimitActions}
                            onPress={(e) => {
                                if (e.nativeEvent.index >= 0 && e.nativeEvent.index < weeklyLimitOptions.length) {
                                    const opt = weeklyLimitOptions[e.nativeEvent.index];
                                    updateSettingAndSave('OVERTIME', setOvertimeConfig, {
                                        ...overtimeConfig,
                                        maxWeeklyOvertimeHours: opt.h,
                                        maxWeeklyOvertimeMinutes: opt.m,
                                    });
                                }
                            }}
                            dropdownMenuMode={true}
                        >
                            <View style={s.ruleIdentityRow}>
                                <View style={s.ruleIdentityLeft}>
                                    <Text style={[s.ruleIdentityTitle, { color: textColor }]}>Max Weekly Overtime</Text>
                                    <Text style={[s.ruleIdentitySubtitle, { color: subtextColor }]}>
                                        Maximum overtime allowed per week
                                    </Text>
                                </View>
                                <View style={s.ruleIdentityRight}>
                                    <Text style={[s.ruleIdentityValue, { color: subtextColor }]}>{weeklyDisplay}</Text>
                                    <PlatformIcon name="chevron.up.chevron.down" size={12} tintColor={subtextColor} style={{ marginLeft: 6 }} />
                                </View>
                            </View>
                        </ContextMenu>

                        <View style={[s.innerDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

                        {/* Minimum Overtime Duration */}
                        <ContextMenu
                            actions={thresholdActions}
                            onPress={(e) => {
                                if (e.nativeEvent.index >= 0 && e.nativeEvent.index < thresholdOptions.length) {
                                    const opt = thresholdOptions[e.nativeEvent.index];
                                    updateSettingAndSave('OVERTIME', setOvertimeConfig, {
                                        ...overtimeConfig,
                                        minOvertimeThresholdMinutes: opt.val,
                                    });
                                }
                            }}
                            dropdownMenuMode={true}
                        >
                            <View style={s.ruleIdentityRow}>
                                <View style={s.ruleIdentityLeft}>
                                    <Text style={[s.ruleIdentityTitle, { color: textColor }]}>Minimum Overtime Duration</Text>
                                    <Text style={[s.ruleIdentitySubtitle, { color: subtextColor }]}>
                                        Minimum extra work to count as overtime
                                    </Text>
                                </View>
                                <View style={s.ruleIdentityRight}>
                                    <Text style={[s.ruleIdentityValue, { color: subtextColor }]}>{thresholdDisplay}</Text>
                                    <PlatformIcon name="chevron.up.chevron.down" size={12} tintColor={subtextColor} style={{ marginLeft: 6 }} />
                                </View>
                            </View>
                        </ContextMenu>
                    </View>
                    <Text style={[s.sectionFooterNote, { color: subtextColor }]}>
                        Maximum overtime caps and duration threshold required for extra working hours to be logged.
                    </Text>
                </View>

                {/* 2. Overtime Calculation */}
                <View style={{ gap: 6 }}>
                    <View style={s.sectionHeader}>
                        <Text style={[s.sectionTitle, { color: isDark ? '#8E8E93' : '#6C6C70' }]}>
                            Overtime Calculation
                        </Text>
                    </View>
                    <View style={[
                            s.identityGroupCard,
                            {
                                backgroundColor: cardBg,
                                borderColor: cardBorder,
                            },
                        ]}
                    >
                        {/* First Hour Multiplier */}
                        <ContextMenu
                            actions={firstHourActions}
                            onPress={(e) => {
                                if (e.nativeEvent.index >= 0 && e.nativeEvent.index < firstHourOptions.length) {
                                    const opt = firstHourOptions[e.nativeEvent.index];
                                    if (opt.val === -1) {
                                        promptCustomMultiplier('rateMultiplierFirstHour', 'First Hour Multiplier', firstHourRate);
                                    } else {
                                        updateSettingAndSave('OVERTIME', setOvertimeConfig, {
                                            ...overtimeConfig,
                                            rateMultiplierFirstHour: opt.val,
                                        });
                                    }
                                }
                            }}
                            dropdownMenuMode={true}
                        >
                            <View style={s.ruleIdentityRow}>
                                <View style={s.ruleIdentityLeft}>
                                    <Text style={[s.ruleIdentityTitle, { color: textColor }]}>First Hour Multiplier</Text>
                                    <Text style={[s.ruleIdentitySubtitle, { color: subtextColor }]}>
                                        Rate for the first overtime hour
                                    </Text>
                                </View>
                                <View style={s.ruleIdentityRight}>
                                    <Text style={[s.ruleIdentityValue, { color: subtextColor }]}>{firstHourDisplay}</Text>
                                    <PlatformIcon name="chevron.up.chevron.down" size={12} tintColor={subtextColor} style={{ marginLeft: 6 }} />
                                </View>
                            </View>
                        </ContextMenu>

                        <View style={[s.innerDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

                        {/* Next Hour Multiplier */}
                        <ContextMenu
                            actions={nextHourActions}
                            onPress={(e) => {
                                if (e.nativeEvent.index >= 0 && e.nativeEvent.index < nextHourOptions.length) {
                                    const opt = nextHourOptions[e.nativeEvent.index];
                                    if (opt.val === -1) {
                                        promptCustomMultiplier('rateMultiplierSubsequent', 'Next Hour Multiplier', nextHourRate);
                                    } else {
                                        updateSettingAndSave('OVERTIME', setOvertimeConfig, {
                                            ...overtimeConfig,
                                            rateMultiplierSubsequent: opt.val,
                                        });
                                    }
                                }
                            }}
                            dropdownMenuMode={true}
                        >
                            <View style={s.ruleIdentityRow}>
                                <View style={s.ruleIdentityLeft}>
                                    <Text style={[s.ruleIdentityTitle, { color: textColor }]}>Next Hour Multiplier</Text>
                                    <Text style={[s.ruleIdentitySubtitle, { color: subtextColor }]}>
                                        Rate after the first overtime hour
                                    </Text>
                                </View>
                                <View style={s.ruleIdentityRight}>
                                    <Text style={[s.ruleIdentityValue, { color: subtextColor }]}>{nextHourDisplay}</Text>
                                    <PlatformIcon name="chevron.up.chevron.down" size={12} tintColor={subtextColor} style={{ marginLeft: 6 }} />
                                </View>
                            </View>
                        </ContextMenu>

                        <View style={[s.innerDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

                        {/* Holiday / Rest Day Rate */}
                        <ContextMenu
                            actions={holidayActions}
                            onPress={(e) => {
                                if (e.nativeEvent.index >= 0 && e.nativeEvent.index < holidayOptions.length) {
                                    const opt = holidayOptions[e.nativeEvent.index];
                                    if (opt.val === -1) {
                                        promptCustomMultiplier('holidayRateMultiplier', 'Holiday / Rest Day Rate', holidayRate);
                                    } else {
                                        updateSettingAndSave('OVERTIME', setOvertimeConfig, {
                                            ...overtimeConfig,
                                            holidayRateMultiplier: opt.val,
                                        });
                                    }
                                }
                            }}
                            dropdownMenuMode={true}
                        >
                            <View style={s.ruleIdentityRow}>
                                <View style={s.ruleIdentityLeft}>
                                    <Text style={[s.ruleIdentityTitle, { color: textColor }]}>Holiday / Rest Day Rate</Text>
                                    <Text style={[s.ruleIdentitySubtitle, { color: subtextColor }]}>
                                        Special overtime rate on holidays or rest days
                                    </Text>
                                </View>
                                <View style={s.ruleIdentityRight}>
                                    <Text style={[s.ruleIdentityValue, { color: subtextColor }]}>{holidayDisplay}</Text>
                                    <PlatformIcon name="chevron.up.chevron.down" size={12} tintColor={subtextColor} style={{ marginLeft: 6 }} />
                                </View>
                            </View>
                        </ContextMenu>
                    </View>
                    <Text style={[s.sectionFooterNote, { color: subtextColor }]}>
                        Overtime multiplier rates applied to base hourly rates for regular workdays, rest days, and company holidays. Tap to select standard presets or enter any custom multiplier.
                    </Text>
                </View>

                {/* 3. Request & Approval */}
                <View style={{ gap: 6 }}>
                    <View style={s.sectionHeader}>
                        <Text style={[s.sectionTitle, { color: isDark ? '#8E8E93' : '#6C6C70' }]}>
                            Request & Approval
                        </Text>
                    </View>
                    <View style={[
                            s.identityGroupCard,
                            {
                                backgroundColor: cardBg,
                                borderColor: cardBorder,
                            },
                        ]}
                    >
                        {/* Require Overtime Request */}
                        <View style={s.ruleIdentityRow}>
                            <View style={s.ruleIdentityLeft}>
                                <Text style={[s.ruleIdentityTitle, { color: textColor }]}>Require Overtime Request</Text>
                                <Text style={[s.ruleIdentitySubtitle, { color: subtextColor }]}>
                                    Overtime must be requested before/after work
                                </Text>
                            </View>
                            <Switch
                                value={reqRequest}
                                onValueChange={(val) =>
                                    updateSettingAndSave('OVERTIME', setOvertimeConfig, {
                                        ...overtimeConfig,
                                        requireOvertimeRequest: val,
                                    })
                                }
                                trackColor={{ false: isDark ? '#39393D' : '#E5E5EA', true: '#34C759' }}
                            />
                        </View>

                        <View style={[s.innerDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

                        {/* Require Approval */}
                        <View style={s.ruleIdentityRow}>
                            <View style={s.ruleIdentityLeft}>
                                <Text style={[s.ruleIdentityTitle, { color: textColor }]}>Require Approval</Text>
                                <Text style={[s.ruleIdentitySubtitle, { color: subtextColor }]}>
                                    Overtime must be approved before being counted
                                </Text>
                            </View>
                            <Switch
                                value={reqApproval}
                                onValueChange={(val) =>
                                    updateSettingAndSave('OVERTIME', setOvertimeConfig, {
                                        ...overtimeConfig,
                                        requireApproval: val,
                                    })
                                }
                                trackColor={{ false: isDark ? '#39393D' : '#E5E5EA', true: '#34C759' }}
                            />
                        </View>
                    </View>
                    <Text style={[s.sectionFooterNote, { color: subtextColor }]}>
                        Overtime submissions are processed in Requests & Approvals. Approved hours automatically sync to Timesheets and attendance records.
                    </Text>
                </View>
            </View>
        );
    };

    // 8e. Business Trip Policies (Trip Request, Travel Allowance & Attendance During Trip)
    const renderBusinessTripPolicies = () => {
        const reqTripRequest = tripConfig.requireTripRequest ?? true;
        const reqApproval = tripConfig.requireApproval ?? true;
        const minAdvanceDays = tripConfig.minAdvanceNoticeDays ?? 2;

        const enableDailyAllowance = tripConfig.enableDailyAllowance ?? true;
        const dailyRate = tripConfig.perDiemDailyRate ?? 350000;
        const reqAllowanceApproval = tripConfig.requireDailyAllowanceApproval ?? true;
        const lodgingCap = tripConfig.maxLodgingRatePerNight ?? 750000;
        const receiptMode = tripConfig.transportReceiptMode ?? 'required';

        const allowOutsideGeofence = tripConfig.allowOutsideGeofence ?? true;
        const useDestinationValid = tripConfig.useDestinationAsValidLocation ?? true;
        const reqGps = tripConfig.requireGpsVerification ?? true;
        const reqSelfie = tripConfig.requireSelfie ?? true;

        // Custom amount prompt for daily rate or lodging cap
        const promptCustomAmount = (
            field: 'perDiemDailyRate' | 'maxLodgingRatePerNight',
            title: string,
            currentValue: number
        ) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (Platform.OS === 'ios') {
                Alert.prompt(
                    title,
                    'Enter amount in IDR (e.g. 500000):',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        {
                            text: 'Save',
                            onPress: (val?: string) => {
                                if (!val) return;
                                const cleaned = val.replace(/[^0-9]/g, '');
                                const parsed = parseInt(cleaned, 10);
                                if (!isNaN(parsed) && parsed >= 0) {
                                    updateSettingAndSave('BUSINESS_TRIP', setTripConfig, {
                                        ...tripConfig,
                                        [field]: parsed,
                                    });
                                } else {
                                    Alert.alert('Invalid Amount', 'Please enter a valid numeric amount.');
                                }
                            },
                        },
                    ],
                    'plain-text',
                    String(currentValue),
                    'number-pad'
                );
            }
        };

        const promptCustomDays = () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (Platform.OS === 'ios') {
                Alert.prompt(
                    'Minimum Advance Request',
                    'Enter minimum days required before departure:',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        {
                            text: 'Save',
                            onPress: (val?: string) => {
                                if (!val) return;
                                const parsed = parseInt(val.trim(), 10);
                                if (!isNaN(parsed) && parsed >= 0) {
                                    updateSettingAndSave('BUSINESS_TRIP', setTripConfig, {
                                        ...tripConfig,
                                        minAdvanceNoticeDays: parsed,
                                    });
                                } else {
                                    Alert.alert('Invalid Days', 'Please enter a valid number of days.');
                                }
                            },
                        },
                    ],
                    'plain-text',
                    String(minAdvanceDays),
                    'number-pad'
                );
            }
        };

        // 1. Advance Notice Options
        const advanceOptions = [
            { label: 'Same Day (0 days notice)', val: 0 },
            { label: '1 day in advance', val: 1 },
            { label: '2 days (Recommended)', val: 2 },
            { label: '3 days in advance', val: 3 },
            { label: '5 days in advance', val: 5 },
            { label: '7 days (1 week)', val: 7 },
            { label: '14 days (2 weeks)', val: 14 },
            { label: ![0, 1, 2, 3, 5, 7, 14].includes(minAdvanceDays) ? `Custom (${minAdvanceDays} days)` : 'Custom Days...', val: -1 },
        ];
        const advanceActions: ContextMenuAction[] = advanceOptions.map((opt) => ({
            title: opt.label,
            selected: opt.val === -1 ? ![0, 1, 2, 3, 5, 7, 14].includes(minAdvanceDays) : minAdvanceDays === opt.val,
        }));
        const advanceDisplay = minAdvanceDays === 0 ? 'Same day' : `${minAdvanceDays} ${minAdvanceDays === 1 ? 'day' : 'days'}`;

        // 2. Daily Allowance Options
        const isDailyPreset = [150000, 250000, 350000, 500000, 750000, 1000000].includes(dailyRate);
        const dailyOptions = [
            { label: 'IDR 150,000 / day', val: 150000 },
            { label: 'IDR 250,000 / day', val: 250000 },
            { label: 'IDR 350,000 / day (Standard)', val: 350000 },
            { label: 'IDR 500,000 / day', val: 500000 },
            { label: 'IDR 750,000 / day', val: 750000 },
            { label: 'IDR 1,000,000 / day', val: 1000000 },
            { label: !isDailyPreset ? `Custom (IDR ${dailyRate.toLocaleString('id-ID')})` : 'Custom Amount...', val: -1 },
        ];
        const dailyActions: ContextMenuAction[] = dailyOptions.map((opt) => ({
            title: opt.label,
            selected: opt.val === -1 ? !isDailyPreset : dailyRate === opt.val,
        }));
        const dailyDisplay = `IDR ${dailyRate.toLocaleString('id-ID')}`;

        // 3. Lodging Limit Options
        const isLodgingPreset = [0, 500000, 750000, 1000000, 1500000, 2000000].includes(lodgingCap);
        const lodgingOptions = [
            { label: 'IDR 500,000 / night', val: 500000 },
            { label: 'IDR 750,000 / night (Standard)', val: 750000 },
            { label: 'IDR 1,000,000 / night', val: 1000000 },
            { label: 'IDR 1,500,000 / night', val: 1500000 },
            { label: 'IDR 2,000,000 / night', val: 2000000 },
            { label: 'Unlimited (No Limit)', val: 0 },
            { label: !isLodgingPreset ? `Custom (IDR ${lodgingCap.toLocaleString('id-ID')})` : 'Custom Amount...', val: -1 },
        ];
        const lodgingActions: ContextMenuAction[] = lodgingOptions.map((opt) => ({
            title: opt.label,
            selected: opt.val === -1 ? !isLodgingPreset : lodgingCap === opt.val,
        }));
        const lodgingDisplay = lodgingCap === 0 ? 'No Limit' : `IDR ${lodgingCap.toLocaleString('id-ID')} / night`;

        // 4. Transportation Multi-Mode Config & Presets
        const modesCfg: TransportModesConfig = tripConfig.transportModes || DEFAULT_BUSINESS_TRIP.transportModes;
        const allowedMode = tripConfig.allowedTransportModes ?? 'all';

        const applyModePreset = (preset: 'all' | 'land_only' | 'public_flight' | 'company_fleet' | 'custom') => {
            let nextModes: TransportModesConfig;
            if (preset === 'all') {
                nextModes = {
                    flight: { ...modesCfg.flight, enabled: true },
                    train: { ...modesCfg.train, enabled: true },
                    car: { ...modesCfg.car, enabled: true },
                    motorcycle: { ...modesCfg.motorcycle, enabled: true },
                    rideHailing: { ...modesCfg.rideHailing, enabled: true },
                };
            } else if (preset === 'land_only') {
                nextModes = {
                    flight: { ...modesCfg.flight, enabled: false },
                    train: { ...modesCfg.train, enabled: true },
                    car: { ...modesCfg.car, enabled: true },
                    motorcycle: { ...modesCfg.motorcycle, enabled: true },
                    rideHailing: { ...modesCfg.rideHailing, enabled: true },
                };
            } else if (preset === 'public_flight') {
                nextModes = {
                    flight: { ...modesCfg.flight, enabled: true },
                    train: { ...modesCfg.train, enabled: true },
                    car: { ...modesCfg.car, enabled: false },
                    motorcycle: { ...modesCfg.motorcycle, enabled: false },
                    rideHailing: { ...modesCfg.rideHailing, enabled: true },
                };
            } else if (preset === 'company_fleet') {
                nextModes = {
                    flight: { ...modesCfg.flight, enabled: true },
                    train: { ...modesCfg.train, enabled: false },
                    car: { ...modesCfg.car, enabled: true },
                    motorcycle: { ...modesCfg.motorcycle, enabled: false },
                    rideHailing: { ...modesCfg.rideHailing, enabled: true },
                };
            } else {
                nextModes = modesCfg;
            }
            updateSettingAndSave<BusinessTripConfig>('BUSINESS_TRIP', setTripConfig, {
                ...tripConfig,
                allowedTransportModes: preset,
                transportModes: nextModes,
            });
        };

        const updateSingleMode = <K extends keyof TransportModesConfig>(
            modeKey: K,
            updatedMode: TransportModesConfig[K]
        ) => {
            const nextModes: TransportModesConfig = {
                ...modesCfg,
                [modeKey]: updatedMode,
            };
            updateSettingAndSave<BusinessTripConfig>('BUSINESS_TRIP', setTripConfig, {
                ...tripConfig,
                allowedTransportModes: 'custom',
                transportModes: nextModes,
            });
        };

        const transportPresetOptions: { label: string; val: 'all' | 'land_only' | 'public_flight' | 'company_fleet' | 'custom'; display: string }[] = [
            { label: 'All Modes (Flight, Train, Car, Motor, Taxi)', val: 'all', display: 'All Modes' },
            { label: 'Land Travel Only (Train, Car, Motor, Taxi)', val: 'land_only', display: 'Land Only' },
            { label: 'Public Transit & Air (Flight, Train, Taxi)', val: 'public_flight', display: 'Public & Air' },
            { label: 'Company Fleet & Air (Fleet Car, Flight)', val: 'company_fleet', display: 'Fleet & Air' },
            { label: 'Custom Configuration', val: 'custom', display: 'Custom' },
        ];
        const transportPresetActions: ContextMenuAction[] = transportPresetOptions.map((opt) => ({
            title: opt.label,
            selected: allowedMode === opt.val,
        }));
        const transportPresetDisplay = transportPresetOptions.find((o) => o.val === allowedMode)?.display || 'Custom';

        // Flight Distance Options & Prompts
        const flightDist = modesCfg.flight.minDistanceKm ?? 150;
        const promptCustomFlightDistance = () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (Platform.OS === 'ios') {
                Alert.prompt(
                    'Flight Minimum Distance',
                    'Enter minimum trip distance (in km) to permit air travel:',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        {
                            text: 'Save',
                            onPress: (val?: string) => {
                                if (!val) return;
                                const parsed = parseInt(val.trim(), 10);
                                if (!isNaN(parsed) && parsed >= 0) {
                                    updateSingleMode('flight', { ...modesCfg.flight, minDistanceKm: parsed });
                                } else {
                                    Alert.alert('Invalid Distance', 'Please enter a valid distance in kilometers.');
                                }
                            },
                        },
                    ],
                    'plain-text',
                    String(flightDist === 9999 ? 150 : flightDist),
                    'number-pad'
                );
            }
        };
        const isFlightDistPreset = [0, 100, 150, 250, 500, 9999].includes(flightDist);
        const flightDistOptions = [
            { label: 'Any Distance (No Minimum)', val: 0 },
            { label: '> 100 km', val: 100 },
            { label: '> 150 km (Standard)', val: 150 },
            { label: '> 250 km', val: 250 },
            { label: '> 500 km', val: 500 },
            { label: 'Inter-island / Overseas Only', val: 9999 },
            { label: !isFlightDistPreset ? `Custom (> ${flightDist} km)` : 'Custom Distance...', val: -1 },
        ];
        const flightDistActions: ContextMenuAction[] = flightDistOptions.map((opt) => ({
            title: opt.label,
            selected: opt.val === -1 ? !isFlightDistPreset : flightDist === opt.val,
        }));
        const flightDistDisplay = flightDist === 0 ? 'Any Distance' : flightDist === 9999 ? 'Inter-island Only' : `> ${flightDist} km`;

        // Flight Class Options
        const flightClass = modesCfg.flight.classAllowance ?? 'economy';
        const flightClassOptions: { label: string; val: 'economy' | 'premium_economy' | 'business'; display: string }[] = [
            { label: 'Economy Class (Standard)', val: 'economy', display: 'Economy' },
            { label: 'Premium Economy', val: 'premium_economy', display: 'Premium Economy' },
            { label: 'Business Class (Executive)', val: 'business', display: 'Business Class' },
        ];
        const flightClassActions: ContextMenuAction[] = flightClassOptions.map((opt) => ({
            title: opt.label,
            selected: flightClass === opt.val,
        }));
        const flightClassDisplay = flightClassOptions.find((o) => o.val === flightClass)?.display || 'Economy';

        // Train Class Options
        const trainClass = modesCfg.train.classAllowance ?? 'executive_economy';
        const trainClassOptions: { label: string; val: 'executive_economy' | 'economy_only' | 'any'; display: string }[] = [
            { label: 'Executive & Economy Class (Standard)', val: 'executive_economy', display: 'Executive / Economy' },
            { label: 'Economy Class Only', val: 'economy_only', display: 'Economy Only' },
            { label: 'Any Class (Including Luxury / Sleeper)', val: 'any', display: 'Any Class' },
        ];
        const trainClassActions: ContextMenuAction[] = trainClassOptions.map((opt) => ({
            title: opt.label,
            selected: trainClass === opt.val,
        }));
        const trainClassDisplay = trainClassOptions.find((o) => o.val === trainClass)?.display || 'Executive / Economy';

        // Car Reimbursement Model Options
        const carReimbModel = modesCfg.car.reimbursementModel ?? 'mileage';
        const carModelOptions: { label: string; val: 'mileage' | 'at_cost'; display: string }[] = [
            { label: 'Mileage Rate (Tarif per KM)', val: 'mileage', display: 'Per KM Rate' },
            { label: 'At-Cost (Actual Fuel Receipt)', val: 'at_cost', display: 'Fuel Receipt (At-Cost)' },
        ];
        const carModelActions: ContextMenuAction[] = carModelOptions.map((opt) => ({
            title: opt.label,
            selected: carReimbModel === opt.val,
        }));
        const carModelDisplay = carModelOptions.find((o) => o.val === carReimbModel)?.display || 'Per KM Rate';

        // Car Mileage Rate Options & Prompt
        const carMileage = modesCfg.car.mileageRatePerKm ?? 2500;
        const promptCustomCarMileage = () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (Platform.OS === 'ios') {
                Alert.prompt(
                    'Car Mileage Rate',
                    'Enter car reimbursement rate per km (e.g. 2500):',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        {
                            text: 'Save',
                            onPress: (val?: string) => {
                                if (!val) return;
                                const cleaned = val.replace(/[^0-9]/g, '');
                                const parsed = parseInt(cleaned, 10);
                                if (!isNaN(parsed) && parsed >= 0) {
                                    updateSingleMode('car', { ...modesCfg.car, mileageRatePerKm: parsed });
                                } else {
                                    Alert.alert('Invalid Rate', 'Please enter a valid rate per kilometer.');
                                }
                            },
                        },
                    ],
                    'plain-text',
                    String(carMileage),
                    'number-pad'
                );
            }
        };
        const isCarMileagePreset = [1500, 2500, 3500, 5000].includes(carMileage);
        const carMileageOptions = [
            { label: 'IDR 1,500 / km (Compact / City Car)', val: 1500 },
            { label: 'IDR 2,500 / km (Standard MPV / Sedan)', val: 2500 },
            { label: 'IDR 3,500 / km (SUV / 4WD)', val: 3500 },
            { label: 'IDR 5,000 / km (Commercial / Van)', val: 5000 },
            { label: !isCarMileagePreset ? `Custom (IDR ${carMileage.toLocaleString('id-ID')}/km)` : 'Custom Rate...', val: -1 },
        ];
        const carMileageActions: ContextMenuAction[] = carMileageOptions.map((opt) => ({
            title: opt.label,
            selected: opt.val === -1 ? !isCarMileagePreset : carMileage === opt.val,
        }));
        const carMileageDisplay = `IDR ${carMileage.toLocaleString('id-ID')} / km`;

        // Motor Mileage Rate Options & Prompt
        const motorMileage = modesCfg.motorcycle.mileageRatePerKm ?? 1200;
        const promptCustomMotorMileage = () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (Platform.OS === 'ios') {
                Alert.prompt(
                    'Motorcycle Mileage Rate',
                    'Enter motorcycle reimbursement rate per km (e.g. 1200):',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        {
                            text: 'Save',
                            onPress: (val?: string) => {
                                if (!val) return;
                                const cleaned = val.replace(/[^0-9]/g, '');
                                const parsed = parseInt(cleaned, 10);
                                if (!isNaN(parsed) && parsed >= 0) {
                                    updateSingleMode('motorcycle', { ...modesCfg.motorcycle, mileageRatePerKm: parsed });
                                } else {
                                    Alert.alert('Invalid Rate', 'Please enter a valid rate per kilometer.');
                                }
                            },
                        },
                    ],
                    'plain-text',
                    String(motorMileage),
                    'number-pad'
                );
            }
        };
        const isMotorMileagePreset = [800, 1000, 1200, 1500, 2000].includes(motorMileage);
        const motorMileageOptions = [
            { label: 'IDR 800 / km (Economy / Electric)', val: 800 },
            { label: 'IDR 1,000 / km (Standard Moped)', val: 1000 },
            { label: 'IDR 1,200 / km (Standard Motor)', val: 1200 },
            { label: 'IDR 1,500 / km (Maxi Scooter / Sport)', val: 1500 },
            { label: 'IDR 2,000 / km (Touring / High Capacity)', val: 2000 },
            { label: !isMotorMileagePreset ? `Custom (IDR ${motorMileage.toLocaleString('id-ID')}/km)` : 'Custom Rate...', val: -1 },
        ];
        const motorMileageActions: ContextMenuAction[] = motorMileageOptions.map((opt) => ({
            title: opt.label,
            selected: opt.val === -1 ? !isMotorMileagePreset : motorMileage === opt.val,
        }));
        const motorMileageDisplay = `IDR ${motorMileage.toLocaleString('id-ID')} / km`;

        // Ride-Hailing Daily Cap Options & Prompt
        const rideCap = modesCfg.rideHailing.dailyCap ?? 150000;
        const promptCustomRideCap = () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (Platform.OS === 'ios') {
                Alert.prompt(
                    'Ride-Hailing Daily Cap',
                    'Enter maximum daily taxi/ride-hailing cap in IDR:',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        {
                            text: 'Save',
                            onPress: (val?: string) => {
                                if (!val) return;
                                const cleaned = val.replace(/[^0-9]/g, '');
                                const parsed = parseInt(cleaned, 10);
                                if (!isNaN(parsed) && parsed >= 0) {
                                    updateSingleMode('rideHailing', { ...modesCfg.rideHailing, dailyCap: parsed });
                                } else {
                                    Alert.alert('Invalid Amount', 'Please enter a valid numeric cap amount.');
                                }
                            },
                        },
                    ],
                    'plain-text',
                    String(rideCap),
                    'number-pad'
                );
            }
        };
        const isRideCapPreset = [0, 100000, 150000, 250000, 500000].includes(rideCap);
        const rideCapOptions = [
            { label: 'Max IDR 100,000 / day', val: 100000 },
            { label: 'Max IDR 150,000 / day (Standard)', val: 150000 },
            { label: 'Max IDR 250,000 / day', val: 250000 },
            { label: 'Max IDR 500,000 / day', val: 500000 },
            { label: 'Unlimited / At-Cost (No Daily Cap)', val: 0 },
            { label: !isRideCapPreset ? `Custom (IDR ${rideCap.toLocaleString('id-ID')}/day)` : 'Custom Cap...', val: -1 },
        ];
        const rideCapActions: ContextMenuAction[] = rideCapOptions.map((opt) => ({
            title: opt.label,
            selected: opt.val === -1 ? !isRideCapPreset : rideCap === opt.val,
        }));
        const rideCapDisplay = rideCap === 0 ? 'No Cap (At-Cost)' : `IDR ${rideCap.toLocaleString('id-ID')} / day`;

        // Transport Receipt Options
        const transportReceiptMode = tripConfig.transportReceiptMode ?? 'required';
        const transportReceiptOptions: { label: string; val: 'required' | 'optional' | 'disabled' }[] = [
            { label: 'Required (Must attach ticket / receipt)', val: 'required' },
            { label: 'Optional (Receipt not mandatory)', val: 'optional' },
            { label: 'Disabled (No transport claim)', val: 'disabled' },
        ];
        const transportReceiptActions: ContextMenuAction[] = transportReceiptOptions.map((opt) => ({
            title: opt.label,
            selected: transportReceiptMode === opt.val,
        }));
        const transportReceiptDisplay = transportReceiptMode === 'required' ? 'Required' : transportReceiptMode === 'optional' ? 'Optional' : 'Disabled';

        // Lodging Receipt Options
        const lodgingReceiptMode = tripConfig.lodgingReceiptMode ?? 'required';
        const lodgingReceiptOptions: { label: string; val: 'required' | 'optional' | 'disabled' }[] = [
            { label: 'Required (Must attach hotel invoice)', val: 'required' },
            { label: 'Optional (Hotel receipt is optional)', val: 'optional' },
            { label: 'Disabled (No hotel claim)', val: 'disabled' },
        ];
        const lodgingReceiptActions: ContextMenuAction[] = lodgingReceiptOptions.map((opt) => ({
            title: opt.label,
            selected: lodgingReceiptMode === opt.val,
        }));
        const lodgingReceiptDisplay = lodgingReceiptMode === 'required' ? 'Required' : lodgingReceiptMode === 'optional' ? 'Optional' : 'Disabled';

        return (
            <View style={{ gap: 14 }}>
                {/* 1. Trip Request */}
                <View style={{ gap: 6 }}>
                    <View style={s.sectionHeader}>
                        <Text style={[s.sectionTitle, { color: isDark ? '#8E8E93' : '#6C6C70' }]}>
                            Trip Request
                        </Text>
                    </View>
                    <View style={[
                            s.identityGroupCard,
                            {
                                backgroundColor: cardBg,
                                borderColor: cardBorder,
                            },
                        ]}
                    >
                        {/* Require Business Trip Request */}
                        <View style={s.ruleIdentityRow}>
                            <View style={s.ruleIdentityLeft}>
                                <Text style={[s.ruleIdentityTitle, { color: textColor }]}>Require Business Trip Request</Text>
                                <Text style={[s.ruleIdentitySubtitle, { color: subtextColor }]}>
                                    Trip must be requested before travel
                                </Text>
                            </View>
                            <Switch
                                value={reqTripRequest}
                                onValueChange={(val) =>
                                    updateSettingAndSave('BUSINESS_TRIP', setTripConfig, {
                                        ...tripConfig,
                                        requireTripRequest: val,
                                    })
                                }
                                trackColor={{ false: isDark ? '#39393D' : '#E5E5EA', true: '#34C759' }}
                            />
                        </View>

                        <View style={[s.innerDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

                        {/* Require Approval */}
                        <View style={s.ruleIdentityRow}>
                            <View style={s.ruleIdentityLeft}>
                                <Text style={[s.ruleIdentityTitle, { color: textColor }]}>Require Approval</Text>
                                <Text style={[s.ruleIdentitySubtitle, { color: subtextColor }]}>
                                    Trip must be approved before becoming active
                                </Text>
                            </View>
                            <Switch
                                value={reqApproval}
                                onValueChange={(val) =>
                                    updateSettingAndSave('BUSINESS_TRIP', setTripConfig, {
                                        ...tripConfig,
                                        requireApproval: val,
                                    })
                                }
                                trackColor={{ false: isDark ? '#39393D' : '#E5E5EA', true: '#34C759' }}
                            />
                        </View>

                        <View style={[s.innerDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

                        {/* Minimum Advance Request */}
                        <ContextMenu
                            actions={advanceActions}
                            onPress={(e) => {
                                if (e.nativeEvent.index >= 0 && e.nativeEvent.index < advanceOptions.length) {
                                    const opt = advanceOptions[e.nativeEvent.index];
                                    if (opt.val === -1) {
                                        promptCustomDays();
                                    } else {
                                        updateSettingAndSave('BUSINESS_TRIP', setTripConfig, {
                                            ...tripConfig,
                                            minAdvanceNoticeDays: opt.val,
                                        });
                                    }
                                }
                            }}
                            dropdownMenuMode={true}
                        >
                            <View style={s.ruleIdentityRow}>
                                <View style={s.ruleIdentityLeft}>
                                    <Text style={[s.ruleIdentityTitle, { color: textColor }]}>Minimum Advance Request</Text>
                                    <Text style={[s.ruleIdentitySubtitle, { color: subtextColor }]}>
                                        Minimum days before departure
                                    </Text>
                                </View>
                                <View style={s.ruleIdentityRight}>
                                    <Text style={[s.ruleIdentityValue, { color: subtextColor }]}>{advanceDisplay}</Text>
                                    <PlatformIcon name="chevron.up.chevron.down" size={12} tintColor={subtextColor} style={{ marginLeft: 6 }} />
                                </View>
                            </View>
                        </ContextMenu>
                    </View>
                    <Text style={[s.sectionFooterNote, { color: subtextColor }]}>
                        Business trip submissions are processed in Requests & Approvals before departure.
                    </Text>
                </View>

                {/* 2. Daily Allowance */}
                <View style={{ gap: 6 }}>
                    <View style={s.sectionHeader}>
                        <Text style={[s.sectionTitle, { color: isDark ? '#8E8E93' : '#6C6C70' }]}>
                            Daily Allowance
                        </Text>
                    </View>
                    <View style={[
                            s.identityGroupCard,
                            {
                                backgroundColor: cardBg,
                                borderColor: cardBorder,
                                opacity: enableDailyAllowance ? 1 : 0.65,
                            },
                        ]}
                    >
                        {/* Enable Daily Allowance */}
                        <View style={s.ruleIdentityRow}>
                            <View style={s.ruleIdentityLeft}>
                                <Text style={[s.ruleIdentityTitle, { color: textColor }]}>Enable Daily Allowance</Text>
                                <Text style={[s.ruleIdentitySubtitle, { color: subtextColor }]}>
                                    {enableDailyAllowance ? 'Permit per diem allowance for business trips' : 'Disabled for business trips'}
                                </Text>
                            </View>
                            <Switch
                                value={enableDailyAllowance}
                                onValueChange={(val) =>
                                    updateSettingAndSave<BusinessTripConfig>('BUSINESS_TRIP', setTripConfig, {
                                        ...tripConfig,
                                        enableDailyAllowance: val,
                                    })
                                }
                                trackColor={{ false: isDark ? '#39393D' : '#E5E5EA', true: '#34C759' }}
                            />
                        </View>

                        {enableDailyAllowance && (
                            <>
                                <View style={[s.innerDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

                                {/* Daily Per Diem Rate */}
                                <ContextMenu
                                    actions={dailyActions}
                                    onPress={(e) => {
                                        if (e.nativeEvent.index >= 0 && e.nativeEvent.index < dailyOptions.length) {
                                            const opt = dailyOptions[e.nativeEvent.index];
                                            if (opt.val === -1) {
                                                promptCustomAmount('perDiemDailyRate', 'Daily Allowance Rate', dailyRate);
                                            } else {
                                                updateSettingAndSave<BusinessTripConfig>('BUSINESS_TRIP', setTripConfig, {
                                                    ...tripConfig,
                                                    perDiemDailyRate: opt.val,
                                                });
                                            }
                                        }
                                    }}
                                    dropdownMenuMode={true}
                                >
                                    <View style={s.ruleIdentityRow}>
                                        <View style={s.ruleIdentityLeft}>
                                            <Text style={[s.ruleIdentityTitle, { color: textColor }]}>Daily Allowance Rate</Text>
                                            <Text style={[s.ruleIdentitySubtitle, { color: subtextColor }]}>
                                                Daily per diem amount for meals & incidentals
                                            </Text>
                                        </View>
                                        <View style={s.ruleIdentityRight}>
                                            <Text style={[s.ruleIdentityValue, { color: subtextColor }]}>{dailyDisplay}</Text>
                                            <PlatformIcon name="chevron.up.chevron.down" size={12} tintColor={subtextColor} style={{ marginLeft: 6 }} />
                                        </View>
                                    </View>
                                </ContextMenu>

                                <View style={[s.innerDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

                                {/* Require Approval for Allowance */}
                                <View style={s.ruleIdentityRow}>
                                    <View style={s.ruleIdentityLeft}>
                                        <Text style={[s.ruleIdentityTitle, { color: textColor }]}>Require Allowance Approval</Text>
                                        <Text style={[s.ruleIdentitySubtitle, { color: subtextColor }]}>
                                            Allowance claim must be approved prior to disbursement
                                        </Text>
                                    </View>
                                    <Switch
                                        value={reqAllowanceApproval}
                                        onValueChange={(val) =>
                                            updateSettingAndSave<BusinessTripConfig>('BUSINESS_TRIP', setTripConfig, {
                                                ...tripConfig,
                                                requireDailyAllowanceApproval: val,
                                            })
                                        }
                                        trackColor={{ false: isDark ? '#39393D' : '#E5E5EA', true: '#34C759' }}
                                    />
                                </View>
                            </>
                        )}
                    </View>
                    <Text style={[s.sectionFooterNote, { color: subtextColor }]}>
                        Fixed per diem rate given per day of business travel for meals and daily incidentals.
                    </Text>
                </View>

                {/* 3. Transportation Policy & Mode Rules */}
                <View style={{ gap: 10 }}>
                    {/* Header with Mode Preset Selector */}
                    <View style={{ gap: 6 }}>
                        <View style={s.sectionHeader}>
                            <Text style={[s.sectionTitle, { color: isDark ? '#8E8E93' : '#6C6C70' }]}>
                                Transportation
                            </Text>
                        </View>
                        <View style={[
                                s.identityGroupCard,
                                {
                                    backgroundColor: cardBg,
                                    borderColor: cardBorder,
                                },
                            ]}
                        >
                            {/* Allowed Transport Modes */}
                            <ContextMenu
                                actions={transportPresetActions}
                                onPress={(e) => {
                                    if (e.nativeEvent.index >= 0 && e.nativeEvent.index < transportPresetOptions.length) {
                                        const opt = transportPresetOptions[e.nativeEvent.index];
                                        if (opt.val !== 'custom') {
                                            applyModePreset(opt.val);
                                        }
                                    }
                                }}
                                dropdownMenuMode={true}
                            >
                                <View style={s.ruleIdentityRow}>
                                    <View style={s.ruleIdentityLeft}>
                                        <Text style={[s.ruleIdentityTitle, { color: textColor }]}>Allowed Transport Modes</Text>
                                        <Text style={[s.ruleIdentitySubtitle, { color: subtextColor }]}>
                                            Preset modes available for travel requests
                                        </Text>
                                    </View>
                                    <View style={s.ruleIdentityRight}>
                                        <Text style={[s.ruleIdentityValue, { color: subtextColor }]}>{transportPresetDisplay}</Text>
                                        <PlatformIcon name="chevron.up.chevron.down" size={12} tintColor={subtextColor} style={{ marginLeft: 6 }} />
                                    </View>
                                </View>
                            </ContextMenu>

                            <View style={[s.innerDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

                            {/* Transport Receipt */}
                            <ContextMenu
                                actions={transportReceiptActions}
                                onPress={(e) => {
                                    if (e.nativeEvent.index >= 0 && e.nativeEvent.index < transportReceiptOptions.length) {
                                        const opt = transportReceiptOptions[e.nativeEvent.index];
                                        updateSettingAndSave<BusinessTripConfig>('BUSINESS_TRIP', setTripConfig, {
                                            ...tripConfig,
                                            transportReceiptMode: opt.val,
                                            requireReceipt: opt.val === 'required',
                                        });
                                    }
                                }}
                                dropdownMenuMode={true}
                            >
                                <View style={s.ruleIdentityRow}>
                                    <View style={s.ruleIdentityLeft}>
                                        <Text style={[s.ruleIdentityTitle, { color: textColor }]}>Transport Receipt</Text>
                                        <Text style={[s.ruleIdentitySubtitle, { color: subtextColor }]}>
                                            Require receipt for flight/train/transport
                                        </Text>
                                    </View>
                                    <View style={s.ruleIdentityRight}>
                                        <Text style={[s.ruleIdentityValue, { color: subtextColor }]}>{transportReceiptDisplay}</Text>
                                        <PlatformIcon name="chevron.up.chevron.down" size={12} tintColor={subtextColor} style={{ marginLeft: 6 }} />
                                    </View>
                                </View>
                            </ContextMenu>
                        </View>
                    </View>

                    {/* 3a. Flight Mode Card */}
                    <View style={[
                            s.identityGroupCard,
                            {
                                backgroundColor: cardBg,
                                borderColor: cardBorder,
                                opacity: modesCfg.flight.enabled ? 1 : 0.65,
                            },
                        ]}
                    >
                        <View style={s.ruleIdentityRow}>
                            <View style={s.ruleIdentityLeft}>
                                <Text style={[s.ruleIdentityTitle, { color: textColor }]}>Air Travel (Flight)</Text>
                                <Text style={[s.ruleIdentitySubtitle, { color: subtextColor }]}>
                                    {modesCfg.flight.enabled ? 'Permit flight bookings for long distance travel' : 'Disabled for business trips'}
                                </Text>
                            </View>
                            <Switch
                                value={modesCfg.flight.enabled}
                                onValueChange={(val) => updateSingleMode('flight', { ...modesCfg.flight, enabled: val })}
                                trackColor={{ false: isDark ? '#39393D' : '#E5E5EA', true: '#34C759' }}
                            />
                        </View>

                        {modesCfg.flight.enabled && (
                            <>
                                <View style={[s.innerDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

                                <ContextMenu
                                    actions={flightDistActions}
                                    onPress={(e) => {
                                        if (e.nativeEvent.index >= 0 && e.nativeEvent.index < flightDistOptions.length) {
                                            const opt = flightDistOptions[e.nativeEvent.index];
                                            if (opt.val === -1) {
                                                promptCustomFlightDistance();
                                            } else {
                                                updateSingleMode('flight', { ...modesCfg.flight, minDistanceKm: opt.val });
                                            }
                                        }
                                    }}
                                    dropdownMenuMode={true}
                                >
                                    <View style={s.ruleIdentityRow}>
                                        <View style={s.ruleIdentityLeft}>
                                            <Text style={[s.ruleIdentityTitle, { color: textColor }]}>Flight Minimum Distance</Text>
                                            <Text style={[s.ruleIdentitySubtitle, { color: subtextColor }]}>
                                                Minimum distance to permit air travel
                                            </Text>
                                        </View>
                                        <View style={s.ruleIdentityRight}>
                                            <Text style={[s.ruleIdentityValue, { color: subtextColor }]}>{flightDistDisplay}</Text>
                                            <PlatformIcon name="chevron.up.chevron.down" size={12} tintColor={subtextColor} style={{ marginLeft: 6 }} />
                                        </View>
                                    </View>
                                </ContextMenu>

                                <View style={[s.innerDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

                                <ContextMenu
                                    actions={flightClassActions}
                                    onPress={(e) => {
                                        if (e.nativeEvent.index >= 0 && e.nativeEvent.index < flightClassOptions.length) {
                                            const opt = flightClassOptions[e.nativeEvent.index];
                                            updateSingleMode('flight', { ...modesCfg.flight, classAllowance: opt.val });
                                        }
                                    }}
                                    dropdownMenuMode={true}
                                >
                                    <View style={s.ruleIdentityRow}>
                                        <View style={s.ruleIdentityLeft}>
                                            <Text style={[s.ruleIdentityTitle, { color: textColor }]}>Allowed Cabin Class</Text>
                                            <Text style={[s.ruleIdentitySubtitle, { color: subtextColor }]}>
                                                Permitted flight ticket grade
                                            </Text>
                                        </View>
                                        <View style={s.ruleIdentityRight}>
                                            <Text style={[s.ruleIdentityValue, { color: subtextColor }]}>{flightClassDisplay}</Text>
                                            <PlatformIcon name="chevron.up.chevron.down" size={12} tintColor={subtextColor} style={{ marginLeft: 6 }} />
                                        </View>
                                    </View>
                                </ContextMenu>
                            </>
                        )}
                    </View>

                    {/* 3b. Train Mode Card */}
                    <View style={[
                            s.identityGroupCard,
                            {
                                backgroundColor: cardBg,
                                borderColor: cardBorder,
                                opacity: modesCfg.train.enabled ? 1 : 0.65,
                            },
                        ]}
                    >
                        <View style={s.ruleIdentityRow}>
                            <View style={s.ruleIdentityLeft}>
                                <Text style={[s.ruleIdentityTitle, { color: textColor }]}>Railway (Train)</Text>
                                <Text style={[s.ruleIdentitySubtitle, { color: subtextColor }]}>
                                    {modesCfg.train.enabled ? 'Permit train ticket claims & bookings' : 'Disabled for business trips'}
                                </Text>
                            </View>
                            <Switch
                                value={modesCfg.train.enabled}
                                onValueChange={(val) => updateSingleMode('train', { ...modesCfg.train, enabled: val })}
                                trackColor={{ false: isDark ? '#39393D' : '#E5E5EA', true: '#34C759' }}
                            />
                        </View>

                        {modesCfg.train.enabled && (
                            <>
                                <View style={[s.innerDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

                                <ContextMenu
                                    actions={trainClassActions}
                                    onPress={(e) => {
                                        if (e.nativeEvent.index >= 0 && e.nativeEvent.index < trainClassOptions.length) {
                                            const opt = trainClassOptions[e.nativeEvent.index];
                                            updateSingleMode('train', { ...modesCfg.train, classAllowance: opt.val });
                                        }
                                    }}
                                    dropdownMenuMode={true}
                                >
                                    <View style={s.ruleIdentityRow}>
                                        <View style={s.ruleIdentityLeft}>
                                            <Text style={[s.ruleIdentityTitle, { color: textColor }]}>Allowed Train Class</Text>
                                            <Text style={[s.ruleIdentitySubtitle, { color: subtextColor }]}>
                                                Permitted train ticket grade
                                            </Text>
                                        </View>
                                        <View style={s.ruleIdentityRight}>
                                            <Text style={[s.ruleIdentityValue, { color: subtextColor }]}>{trainClassDisplay}</Text>
                                            <PlatformIcon name="chevron.up.chevron.down" size={12} tintColor={subtextColor} style={{ marginLeft: 6 }} />
                                        </View>
                                    </View>
                                </ContextMenu>
                            </>
                        )}
                    </View>

                    {/* 3c. Car Mode Card */}
                    <View style={[
                            s.identityGroupCard,
                            {
                                backgroundColor: cardBg,
                                borderColor: cardBorder,
                                opacity: modesCfg.car.enabled ? 1 : 0.65,
                            },
                        ]}
                    >
                        <View style={s.ruleIdentityRow}>
                            <View style={s.ruleIdentityLeft}>
                                <Text style={[s.ruleIdentityTitle, { color: textColor }]}>Car (Personal / Rental)</Text>
                                <Text style={[s.ruleIdentitySubtitle, { color: subtextColor }]}>
                                    {modesCfg.car.enabled ? 'Permit car mileage & fuel reimbursement' : 'Disabled for business trips'}
                                </Text>
                            </View>
                            <Switch
                                value={modesCfg.car.enabled}
                                onValueChange={(val) => updateSingleMode('car', { ...modesCfg.car, enabled: val })}
                                trackColor={{ false: isDark ? '#39393D' : '#E5E5EA', true: '#34C759' }}
                            />
                        </View>

                        {modesCfg.car.enabled && (
                            <>
                                <View style={[s.innerDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

                                <ContextMenu
                                    actions={carModelActions}
                                    onPress={(e) => {
                                        if (e.nativeEvent.index >= 0 && e.nativeEvent.index < carModelOptions.length) {
                                            const opt = carModelOptions[e.nativeEvent.index];
                                            updateSingleMode('car', { ...modesCfg.car, reimbursementModel: opt.val });
                                        }
                                    }}
                                    dropdownMenuMode={true}
                                >
                                    <View style={s.ruleIdentityRow}>
                                        <View style={s.ruleIdentityLeft}>
                                            <Text style={[s.ruleIdentityTitle, { color: textColor }]}>Reimbursement Model</Text>
                                            <Text style={[s.ruleIdentitySubtitle, { color: subtextColor }]}>
                                                Calculation basis for personal car trips
                                            </Text>
                                        </View>
                                        <View style={s.ruleIdentityRight}>
                                            <Text style={[s.ruleIdentityValue, { color: subtextColor }]}>{carModelDisplay}</Text>
                                            <PlatformIcon name="chevron.up.chevron.down" size={12} tintColor={subtextColor} style={{ marginLeft: 6 }} />
                                        </View>
                                    </View>
                                </ContextMenu>

                                {carReimbModel === 'mileage' && (
                                    <>
                                        <View style={[s.innerDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

                                        <ContextMenu
                                            actions={carMileageActions}
                                            onPress={(e) => {
                                                if (e.nativeEvent.index >= 0 && e.nativeEvent.index < carMileageOptions.length) {
                                                    const opt = carMileageOptions[e.nativeEvent.index];
                                                    if (opt.val === -1) {
                                                        promptCustomCarMileage();
                                                    } else {
                                                        updateSingleMode('car', { ...modesCfg.car, mileageRatePerKm: opt.val });
                                                    }
                                                }
                                            }}
                                            dropdownMenuMode={true}
                                        >
                                            <View style={s.ruleIdentityRow}>
                                                <View style={s.ruleIdentityLeft}>
                                                    <Text style={[s.ruleIdentityTitle, { color: textColor }]}>Car Mileage Rate</Text>
                                                    <Text style={[s.ruleIdentitySubtitle, { color: subtextColor }]}>
                                                        Reimbursement amount per km
                                                    </Text>
                                                </View>
                                                <View style={s.ruleIdentityRight}>
                                                    <Text style={[s.ruleIdentityValue, { color: subtextColor }]}>{carMileageDisplay}</Text>
                                                    <PlatformIcon name="chevron.up.chevron.down" size={12} tintColor={subtextColor} style={{ marginLeft: 6 }} />
                                                </View>
                                            </View>
                                        </ContextMenu>
                                    </>
                                )}

                                <View style={[s.innerDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

                                <View style={s.ruleIdentityRow}>
                                    <View style={s.ruleIdentityLeft}>
                                        <Text style={[s.ruleIdentityTitle, { color: textColor }]}>Toll & Parking Claim</Text>
                                        <Text style={[s.ruleIdentitySubtitle, { color: subtextColor }]}>
                                            Reimburse toll and parking with receipts
                                        </Text>
                                    </View>
                                    <Switch
                                        value={modesCfg.car.tollParkingReimbursable ?? true}
                                        onValueChange={(val) => updateSingleMode('car', { ...modesCfg.car, tollParkingReimbursable: val })}
                                        trackColor={{ false: isDark ? '#39393D' : '#E5E5EA', true: '#34C759' }}
                                    />
                                </View>
                            </>
                        )}
                    </View>

                    {/* 3d. Motorcycle Mode Card */}
                    <View style={[
                            s.identityGroupCard,
                            {
                                backgroundColor: cardBg,
                                borderColor: cardBorder,
                                opacity: modesCfg.motorcycle.enabled ? 1 : 0.65,
                            },
                        ]}
                    >
                        <View style={s.ruleIdentityRow}>
                            <View style={s.ruleIdentityLeft}>
                                <Text style={[s.ruleIdentityTitle, { color: textColor }]}>Personal Motorcycle</Text>
                                <Text style={[s.ruleIdentitySubtitle, { color: subtextColor }]}>
                                    {modesCfg.motorcycle.enabled ? 'Permit motorcycle fuel / mileage claims' : 'Disabled for business trips'}
                                </Text>
                            </View>
                            <Switch
                                value={modesCfg.motorcycle.enabled}
                                onValueChange={(val) => updateSingleMode('motorcycle', { ...modesCfg.motorcycle, enabled: val })}
                                trackColor={{ false: isDark ? '#39393D' : '#E5E5EA', true: '#34C759' }}
                            />
                        </View>

                        {modesCfg.motorcycle.enabled && (
                            <>
                                <View style={[s.innerDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

                                <ContextMenu
                                    actions={motorMileageActions}
                                    onPress={(e) => {
                                        if (e.nativeEvent.index >= 0 && e.nativeEvent.index < motorMileageOptions.length) {
                                            const opt = motorMileageOptions[e.nativeEvent.index];
                                            if (opt.val === -1) {
                                                promptCustomMotorMileage();
                                            } else {
                                                updateSingleMode('motorcycle', { ...modesCfg.motorcycle, mileageRatePerKm: opt.val });
                                            }
                                        }
                                    }}
                                    dropdownMenuMode={true}
                                >
                                    <View style={s.ruleIdentityRow}>
                                        <View style={s.ruleIdentityLeft}>
                                            <Text style={[s.ruleIdentityTitle, { color: textColor }]}>Motorcycle Mileage Rate</Text>
                                            <Text style={[s.ruleIdentitySubtitle, { color: subtextColor }]}>
                                                Reimbursement amount per km
                                            </Text>
                                        </View>
                                        <View style={s.ruleIdentityRight}>
                                            <Text style={[s.ruleIdentityValue, { color: subtextColor }]}>{motorMileageDisplay}</Text>
                                            <PlatformIcon name="chevron.up.chevron.down" size={12} tintColor={subtextColor} style={{ marginLeft: 6 }} />
                                        </View>
                                    </View>
                                </ContextMenu>
                            </>
                        )}
                    </View>

                    {/* 3e. Ride-Hailing & Taxi Mode Card */}
                    <View style={[
                            s.identityGroupCard,
                            {
                                backgroundColor: cardBg,
                                borderColor: cardBorder,
                                opacity: modesCfg.rideHailing.enabled ? 1 : 0.65,
                            },
                        ]}
                    >
                        <View style={s.ruleIdentityRow}>
                            <View style={s.ruleIdentityLeft}>
                                <Text style={[s.ruleIdentityTitle, { color: textColor }]}>Ride-Hailing & Taxi</Text>
                                <Text style={[s.ruleIdentitySubtitle, { color: subtextColor }]}>
                                    {modesCfg.rideHailing.enabled ? 'Permit online taxi & transit reimbursement' : 'Disabled for business trips'}
                                </Text>
                            </View>
                            <Switch
                                value={modesCfg.rideHailing.enabled}
                                onValueChange={(val) => updateSingleMode('rideHailing', { ...modesCfg.rideHailing, enabled: val })}
                                trackColor={{ false: isDark ? '#39393D' : '#E5E5EA', true: '#34C759' }}
                            />
                        </View>

                        {modesCfg.rideHailing.enabled && (
                            <>
                                <View style={[s.innerDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

                                <ContextMenu
                                    actions={rideCapActions}
                                    onPress={(e) => {
                                        if (e.nativeEvent.index >= 0 && e.nativeEvent.index < rideCapOptions.length) {
                                            const opt = rideCapOptions[e.nativeEvent.index];
                                            if (opt.val === -1) {
                                                promptCustomRideCap();
                                            } else {
                                                updateSingleMode('rideHailing', { ...modesCfg.rideHailing, dailyCap: opt.val });
                                            }
                                        }
                                    }}
                                    dropdownMenuMode={true}
                                >
                                    <View style={s.ruleIdentityRow}>
                                        <View style={s.ruleIdentityLeft}>
                                            <Text style={[s.ruleIdentityTitle, { color: textColor }]}>Daily Fare Cap</Text>
                                            <Text style={[s.ruleIdentitySubtitle, { color: subtextColor }]}>
                                                Maximum claimable taxi fare per day
                                            </Text>
                                        </View>
                                        <View style={s.ruleIdentityRight}>
                                            <Text style={[s.ruleIdentityValue, { color: subtextColor }]}>{rideCapDisplay}</Text>
                                            <PlatformIcon name="chevron.up.chevron.down" size={12} tintColor={subtextColor} style={{ marginLeft: 6 }} />
                                        </View>
                                    </View>
                                </ContextMenu>
                            </>
                        )}
                    </View>

                    <Text style={[s.sectionFooterNote, { color: subtextColor }]}>
                        Finance reimbursement and claim validation rules applied per transportation mode during trip expense settlement.
                    </Text>
                </View>

                {/* 4. Lodging / Accommodation */}
                <View style={{ gap: 6 }}>
                    <View style={s.sectionHeader}>
                        <Text style={[s.sectionTitle, { color: isDark ? '#8E8E93' : '#6C6C70' }]}>
                            Lodging / Accommodation
                        </Text>
                    </View>
                    <View style={[
                            s.identityGroupCard,
                            {
                                backgroundColor: cardBg,
                                borderColor: cardBorder,
                            },
                        ]}
                    >
                        {/* Lodging Limit */}
                        <ContextMenu
                            actions={lodgingActions}
                            onPress={(e) => {
                                if (e.nativeEvent.index >= 0 && e.nativeEvent.index < lodgingOptions.length) {
                                    const opt = lodgingOptions[e.nativeEvent.index];
                                    if (opt.val === -1) {
                                        promptCustomAmount('maxLodgingRatePerNight', 'Lodging Limit', lodgingCap);
                                    } else {
                                        updateSettingAndSave('BUSINESS_TRIP', setTripConfig, {
                                            ...tripConfig,
                                            maxLodgingRatePerNight: opt.val,
                                        });
                                    }
                                }
                            }}
                            dropdownMenuMode={true}
                        >
                            <View style={s.ruleIdentityRow}>
                                <View style={s.ruleIdentityLeft}>
                                    <Text style={[s.ruleIdentityTitle, { color: textColor }]}>Lodging Limit</Text>
                                    <Text style={[s.ruleIdentitySubtitle, { color: subtextColor }]}>
                                        Maximum hotel allowance per night
                                    </Text>
                                </View>
                                <View style={s.ruleIdentityRight}>
                                    <Text style={[s.ruleIdentityValue, { color: subtextColor }]}>{lodgingDisplay}</Text>
                                    <PlatformIcon name="chevron.up.chevron.down" size={12} tintColor={subtextColor} style={{ marginLeft: 6 }} />
                                </View>
                            </View>
                        </ContextMenu>

                        <View style={[s.innerDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

                        {/* Lodging Receipt */}
                        <ContextMenu
                            actions={lodgingReceiptActions}
                            onPress={(e) => {
                                if (e.nativeEvent.index >= 0 && e.nativeEvent.index < lodgingReceiptOptions.length) {
                                    const opt = lodgingReceiptOptions[e.nativeEvent.index];
                                    updateSettingAndSave('BUSINESS_TRIP', setTripConfig, {
                                        ...tripConfig,
                                        lodgingReceiptMode: opt.val,
                                        requireHotelAttachment: opt.val === 'required',
                                    });
                                }
                            }}
                            dropdownMenuMode={true}
                        >
                            <View style={s.ruleIdentityRow}>
                                <View style={s.ruleIdentityLeft}>
                                    <Text style={[s.ruleIdentityTitle, { color: textColor }]}>Lodging Receipt</Text>
                                    <Text style={[s.ruleIdentitySubtitle, { color: subtextColor }]}>
                                        Require receipt for hotel accommodation
                                    </Text>
                                </View>
                                <View style={s.ruleIdentityRight}>
                                    <Text style={[s.ruleIdentityValue, { color: subtextColor }]}>{lodgingReceiptDisplay}</Text>
                                    <PlatformIcon name="chevron.up.chevron.down" size={12} tintColor={subtextColor} style={{ marginLeft: 6 }} />
                                </View>
                            </View>
                        </ContextMenu>
                    </View>
                    <Text style={[s.sectionFooterNote, { color: subtextColor }]}>
                        Hotel accommodation allowance cap per night and invoice attachment requirements.
                    </Text>
                </View>

                {/* 3. Attendance During Trip */}
                <View style={{ gap: 6 }}>
                    <View style={s.sectionHeader}>
                        <Text style={[s.sectionTitle, { color: isDark ? '#8E8E93' : '#6C6C70' }]}>
                            Attendance During Trip
                        </Text>
                    </View>
                    <View style={[
                            s.identityGroupCard,
                            {
                                backgroundColor: cardBg,
                                borderColor: cardBorder,
                            },
                        ]}
                    >
                        {/* Allow Clock-in Outside Normal Geofence */}
                        <View style={s.ruleIdentityRow}>
                            <View style={s.ruleIdentityLeft}>
                                <Text style={[s.ruleIdentityTitle, { color: textColor }]}>Allow Clock-in Outside Normal Geofence</Text>
                                <Text style={[s.ruleIdentitySubtitle, { color: subtextColor }]}>
                                    Permit attendance at trip location
                                </Text>
                            </View>
                            <Switch
                                value={allowOutsideGeofence}
                                onValueChange={(val) =>
                                    updateSettingAndSave('BUSINESS_TRIP', setTripConfig, {
                                        ...tripConfig,
                                        allowOutsideGeofence: val,
                                    })
                                }
                                trackColor={{ false: isDark ? '#39393D' : '#E5E5EA', true: '#34C759' }}
                            />
                        </View>

                        <View style={[s.innerDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

                        {/* Use Trip Destination as Valid Location */}
                        <View style={s.ruleIdentityRow}>
                            <View style={s.ruleIdentityLeft}>
                                <Text style={[s.ruleIdentityTitle, { color: textColor }]}>Use Trip Destination as Valid Location</Text>
                                <Text style={[s.ruleIdentitySubtitle, { color: subtextColor }]}>
                                    Trip destination becomes temporary attendance location
                                </Text>
                            </View>
                            <Switch
                                value={useDestinationValid}
                                onValueChange={(val) =>
                                    updateSettingAndSave('BUSINESS_TRIP', setTripConfig, {
                                        ...tripConfig,
                                        useDestinationAsValidLocation: val,
                                    })
                                }
                                trackColor={{ false: isDark ? '#39393D' : '#E5E5EA', true: '#34C759' }}
                            />
                        </View>

                        <View style={[s.innerDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

                        {/* Require GPS Verification */}
                        <View style={s.ruleIdentityRow}>
                            <View style={s.ruleIdentityLeft}>
                                <Text style={[s.ruleIdentityTitle, { color: textColor }]}>Require GPS Verification</Text>
                                <Text style={[s.ruleIdentitySubtitle, { color: subtextColor }]}>
                                    Verify attendance location during trip
                                </Text>
                            </View>
                            <Switch
                                value={reqGps}
                                onValueChange={(val) =>
                                    updateSettingAndSave('BUSINESS_TRIP', setTripConfig, {
                                        ...tripConfig,
                                        requireGpsVerification: val,
                                    })
                                }
                                trackColor={{ false: isDark ? '#39393D' : '#E5E5EA', true: '#34C759' }}
                            />
                        </View>

                        <View style={[s.innerDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

                        {/* Require Selfie */}
                        <View style={s.ruleIdentityRow}>
                            <View style={s.ruleIdentityLeft}>
                                <Text style={[s.ruleIdentityTitle, { color: textColor }]}>Require Selfie</Text>
                                <Text style={[s.ruleIdentitySubtitle, { color: subtextColor }]}>
                                    Require selfie during trip attendance
                                </Text>
                            </View>
                            <Switch
                                value={reqSelfie}
                                onValueChange={(val) =>
                                    updateSettingAndSave('BUSINESS_TRIP', setTripConfig, {
                                        ...tripConfig,
                                        requireSelfie: val,
                                    })
                                }
                                trackColor={{ false: isDark ? '#39393D' : '#E5E5EA', true: '#34C759' }}
                            />
                        </View>
                    </View>
                    <Text style={[s.sectionFooterNote, { color: subtextColor }]}>
                        Approved business trips automatically establish temporary valid geofence and attendance verification for the employee during the trip duration.
                    </Text>
                </View>
            </View>
        );
    };

    // 7. Approval Workflows Management (Department Flows & Position/Employee Overrides)
    const handleSaveDepartmentFlow = async (deptId: string, newChain: ApprovalStep[], reqType?: ApprovalRequestType) => {
        try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            const deptObj = orgDepartments.find((d: any) => d.id === deptId);
            const deptName = deptObj?.name || 'Department';

            const existingIndex = approvalConfig.departments.findIndex((d) => d.departmentId === deptId || d.id === deptId);
            let updatedDepts: DepartmentApprovalFlow[];

            if (existingIndex >= 0) {
                updatedDepts = [...approvalConfig.departments];
                updatedDepts[existingIndex] = {
                    ...updatedDepts[existingIndex],
                    departmentId: deptId,
                    departmentName: deptName,
                    chain: newChain,
                    requestType: reqType || 'all',
                };
            } else {
                const newFlow: DepartmentApprovalFlow = {
                    id: `dept-flow-${deptId}`,
                    departmentId: deptId,
                    departmentName: deptName,
                    chain: newChain,
                    requestType: reqType || 'all',
                    overrides: [],
                };
                updatedDepts = [...approvalConfig.departments, newFlow];
            }

            const newConfig: ApprovalWorkflowsConfig = {
                ...approvalConfig,
                departments: updatedDepts,
            };

            setApprovalConfig(newConfig);
            await saveClockSetting('APPROVAL_WORKFLOWS', newConfig);
            triggerDynamicIslandFeedback({
                title: `${deptName} Flow`,
                message: 'Department approval flow updated',
                status: 'Saved',
            });
        } catch (e: any) {
            Alert.alert('Save Failed', e.message || 'Could not save department flow');
        }
    };

    const handleSaveOverride = async (override: ApprovalOverride) => {
        try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            const deptId = override.departmentId;
            const deptObj = orgDepartments.find((d: any) => d.id === deptId);
            const deptName = deptObj?.name || 'Department';

            const existingIndex = approvalConfig.departments.findIndex((d) => d.departmentId === deptId || d.id === deptId);
            let updatedDepts: DepartmentApprovalFlow[];

            if (existingIndex >= 0) {
                const targetDept = approvalConfig.departments[existingIndex];
                const existingOverrides = targetDept.overrides || [];
                const overrideIndex = existingOverrides.findIndex((o) => o.id === override.id);
                const updatedOverrides = overrideIndex >= 0
                    ? existingOverrides.map((o) => (o.id === override.id ? override : o))
                    : [...existingOverrides, override];

                updatedDepts = [...approvalConfig.departments];
                updatedDepts[existingIndex] = {
                    ...targetDept,
                    departmentId: deptId,
                    departmentName: deptName,
                    overrides: updatedOverrides,
                };
            } else {
                const newFlow: DepartmentApprovalFlow = {
                    id: `dept-flow-${deptId}`,
                    departmentId: deptId,
                    departmentName: deptName,
                    chain: DEFAULT_APPROVAL_STEPS,
                    requestType: 'all',
                    overrides: [override],
                };
                updatedDepts = [...approvalConfig.departments, newFlow];
            }

            const newConfig: ApprovalWorkflowsConfig = {
                ...approvalConfig,
                departments: updatedDepts,
            };

            setApprovalConfig(newConfig);
            await saveClockSetting('APPROVAL_WORKFLOWS', newConfig);
            triggerDynamicIslandFeedback({
                title: override.targetName,
                message: 'Approval override saved successfully',
                status: 'Saved',
            });
        } catch (e: any) {
            Alert.alert('Save Failed', e.message || 'Could not save override');
        }
    };

    const handleDeleteOverride = async (overrideId: string) => {
        try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            const updatedDepts = approvalConfig.departments.map((d) => ({
                ...d,
                overrides: (d.overrides || []).filter((o) => o.id !== overrideId),
            }));

            const newConfig: ApprovalWorkflowsConfig = {
                ...approvalConfig,
                departments: updatedDepts,
            };

            setApprovalConfig(newConfig);
            await saveClockSetting('APPROVAL_WORKFLOWS', newConfig);
            triggerDynamicIslandFeedback({
                title: 'Override Removed',
                message: 'Approval override deleted',
                status: 'Deleted',
            });
        } catch (e: any) {
            Alert.alert('Delete Failed', e.message || 'Could not delete override');
        }
    };

    const renderApprovalWorkflows = () => {
        const toggleDeptExpand = (deptId: string) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setExpandedDeptIds((prev) => ({
                ...prev,
                [deptId]: !prev[deptId],
            }));
        };

        const filteredDepartments = orgDepartments.filter((dept: any) => {
            if (!searchQuery) return true;
            const q = searchQuery.toLowerCase();
            const flow = approvalConfig.departments.find((d) => d.departmentId === dept.id || d.id === dept.id);
            const matchesDept = (dept.name || '').toLowerCase().includes(q);
            const matchesOverride = (flow?.overrides || []).some((o) =>
                (o.targetName || '').toLowerCase().includes(q)
            );
            return matchesDept || matchesOverride;
        });

        return (
            <View style={{ gap: 14 }}>
                {/* Header Information */}
                <View style={s.sectionHeader}>
                    <Text style={[s.sectionTitle, { color: isDark ? '#8E8E93' : '#6C6C70' }]}>
                        Department Approval Chains
                    </Text>
                </View>

                {/* Departments List */}
                {filteredDepartments.length === 0 ? (
                    <View style={[
                            s.emptyApprovalCard,
                            {
                                backgroundColor: cardBg,
                                borderColor: cardBorder,
                            },
                        ]}
                    >
                        <PlatformIcon name="building.2" size={32} color={subtextColor} />
                        <Text style={[s.emptyApprovalTitle, { color: textColor }]}>
                            {orgDepartments.length === 0 ? 'No Departments Configured' : 'No Matching Departments'}
                        </Text>
                        <Text style={[s.emptyApprovalSubtitle, { color: subtextColor }]}>
                            {orgDepartments.length === 0
                                ? 'Add departments in People Setup (People > Departments) to configure approval workflows.'
                                : 'Try searching with another keyword.'}
                        </Text>
                    </View>
                ) : (
                    <View style={{ gap: 12 }}>
                        {filteredDepartments.map((dept: any) => {
                            const flow = approvalConfig.departments.find(
                                (d) => d.departmentId === dept.id || d.id === dept.id
                            );
                            const isConfigured = !!flow && !!flow.chain && flow.chain.length > 0;
                            const currentChain = isConfigured ? flow.chain : [];
                            const overrides = flow?.overrides || [];
                            const isExpanded = !!expandedDeptIds[dept.id];
                            const levelsCount = currentChain.length;
                            const overridesCount = overrides.length;

                            return (
                                <View key={dept.id} style={s.approvalDeptWrapper}>
                                    {/* 1. Parent Card (Full Width) */}
                                    <View style={[
                                            s.approvalParentCard,
                                            {
                                                backgroundColor: cardBg,
                                                borderColor: isExpanded
                                                    ? (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)')
                                                    : cardBorder,
                                            },
                                        ]}
                                    >
                                        {/* Top Row: Department Name + Subtitle on Left, Chevron on Right */}
                                        <View style={s.approvalParentHeader}>
                                            <TouchableOpacity
                                                activeOpacity={0.7}
                                                onPress={() => {
                                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                    setSelectedDeptForApprovalModal({ id: dept.id, name: dept.name });
                                                    setApprovalModalMode('department_default');
                                                    setApprovalModalVisible(true);
                                                }}
                                                style={{ flex: 1 }}
                                            >
                                                <Text style={[s.approvalDeptName, { color: textColor }]}>
                                                    {dept.name}
                                                </Text>
                                                <Text style={[s.approvalDeptStats, { color: subtextColor }]}>
                                                    {isConfigured
                                                        ? `${levelsCount} ${levelsCount === 1 ? 'level' : 'levels'} · ${
                                                              overridesCount > 0
                                                                  ? `${overridesCount} override${overridesCount > 1 ? 's' : ''}`
                                                                  : 'No overrides'
                                                          }`
                                                        : '0 levels · Not yet setup'}
                                                </Text>
                                            </TouchableOpacity>

                                            {/* Plain Chevron Button for Expand/Collapse (No circular background) */}
                                            <TouchableOpacity
                                                activeOpacity={0.6}
                                                onPress={() => toggleDeptExpand(dept.id)}
                                                hitSlop={{ top: 12, bottom: 12, left: 16, right: 12 }}
                                                style={s.approvalPlainChevronBtn}
                                            >
                                                <PlatformIcon
                                                    name={isExpanded ? 'chevron.up' : 'chevron.down'}
                                                    size={14}
                                                    color={subtextColor}
                                                />
                                            </TouchableOpacity>
                                        </View>

                                        {/* Plain Inline Approval Chain Preview (Clicking opens Detail Modal) */}
                                        <TouchableOpacity
                                            activeOpacity={0.7}
                                            onPress={() => {
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                setSelectedDeptForApprovalModal({ id: dept.id, name: dept.name });
                                                setApprovalModalMode('department_default');
                                                setApprovalModalVisible(true);
                                            }}
                                            style={s.approvalChainTextContainer}
                                        >
                                            {isConfigured ? (
                                                <Text style={[s.approvalChainInlineText, { color: textColor }]}>
                                                    {currentChain.map((step, sIdx) => {
                                                        const isLast = sIdx === currentChain.length - 1;
                                                        return (
                                                            <React.Fragment key={step.id || `step-${sIdx}`}>
                                                                <Text style={[s.approvalChainLevelPrefix, { color: textColor }]}>
                                                                    L{sIdx + 1}{' '}
                                                                </Text>
                                                                <Text style={[s.approvalChainStepName, { color: textColor }]}>
                                                                    {step.label}
                                                                </Text>
                                                                {!isLast && (
                                                                    <Text style={[s.approvalChainArrowText, { color: subtextColor }]}>
                                                                        {' → '}
                                                                    </Text>
                                                                )}
                                                            </React.Fragment>
                                                        );
                                                    })}
                                                </Text>
                                            ) : (
                                                <Text style={{ color: subtextColor, fontSize: 13, fontStyle: 'italic' }}>
                                                    Not yet setup
                                                </Text>
                                            )}
                                        </TouchableOpacity>
                                    </View>

                                    {/* 2. Inline Expanded Subcards (Overrides Area: 88-90% width, aligned right, connector tree) */}
                                    {isExpanded && (
                                        <View style={s.approvalExpandedArea}>
                                            {/* Left Tree Connector Line */}
                                            <View
                                                style={[
                                                    s.approvalTreeBranchLine,
                                                    {
                                                        backgroundColor: isDark
                                                            ? 'rgba(255,255,255,0.2)'
                                                            : 'rgba(0,0,0,0.18)',
                                                    },
                                                ]}
                                            />

                                            {/* Subcards Container */}
                                            <View style={s.approvalSubcardsContainer}>
                                                {overrides.length > 0 &&
                                                    overrides.map((override) => {
                                                        const reqTypeLabel =
                                                            override.requestType && override.requestType !== 'all'
                                                                ? override.requestType.replace('_', ' ')
                                                                : '';

                                                        return (
                                                            <TouchableOpacity
                                                                key={override.id}
                                                                activeOpacity={0.72}
                                                                onPress={() => {
                                                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                                    setSelectedDeptForApprovalModal({ id: dept.id, name: dept.name });
                                                                    setSelectedOverrideForApprovalModal(override);
                                                                    setApprovalModalMode('override');
                                                                    setApprovalModalVisible(true);
                                                                }}
                                                            >
                                                                <View style={[
                                                                        s.approvalSubcard,
                                                                        {
                                                                            backgroundColor: cardBg,
                                                                            borderColor: cardBorder,
                                                                        },
                                                                    ]}
                                                                >
                                                                    {/* Subcard Top: Target Name + optional type tag */}
                                                                    <View style={s.approvalSubcardHeader}>
                                                                        <Text
                                                                            style={[
                                                                                s.approvalSubcardTitle,
                                                                                { color: textColor },
                                                                            ]}
                                                                            numberOfLines={1}
                                                                        >
                                                                            {override.targetName}
                                                                            {Boolean(reqTypeLabel) && (
                                                                                <Text style={[s.approvalSubcardReqTypeText, { color: subtextColor }]}>
                                                                                    {` · ${reqTypeLabel.charAt(0).toUpperCase() + reqTypeLabel.slice(1)}`}
                                                                                </Text>
                                                                            )}
                                                                        </Text>
                                                                    </View>

                                                                    {/* Subcard Chain: Plain Text Chain */}
                                                                    <View style={{ marginTop: 3 }}>
                                                                        <Text style={[s.approvalSubcardChainText, { color: textColor }]}>
                                                                            {(override.chain || []).map((cStep, cIdx) => {
                                                                                const isLastStep =
                                                                                    cIdx === (override.chain || []).length - 1;
                                                                                return (
                                                                                    <React.Fragment
                                                                                        key={cStep.id || `ov-step-${cIdx}`}
                                                                                    >
                                                                                        <Text style={{ fontWeight: '600' }}>
                                                                                            L{cIdx + 1}{' '}
                                                                                        </Text>
                                                                                        <Text style={{ fontWeight: '400' }}>
                                                                                            {cStep.label}
                                                                                        </Text>
                                                                                        {!isLastStep && (
                                                                                            <Text style={{ color: subtextColor }}>
                                                                                                {' → '}
                                                                                            </Text>
                                                                                        )}
                                                                                    </React.Fragment>
                                                                                );
                                                                            })}
                                                                        </Text>
                                                                    </View>
                                                                </View>
                                                            </TouchableOpacity>
                                                        );
                                                    })}

                                                {/* + Add Override Button (Single +) */}
                                                <TouchableOpacity
                                                    activeOpacity={0.7}
                                                    onPress={() => {
                                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                        setSelectedDeptForApprovalModal({ id: dept.id, name: dept.name });
                                                        setSelectedOverrideForApprovalModal(null);
                                                        setApprovalModalMode('override');
                                                        setApprovalModalVisible(true);
                                                    }}
                                                    style={[
                                                        s.approvalAddOverrideBtn,
                                                        {
                                                            backgroundColor: isDark
                                                                ? 'rgba(255,255,255,0.03)'
                                                                : 'rgba(0,0,0,0.03)',
                                                            borderColor: isDark
                                                                ? 'rgba(255,255,255,0.1)'
                                                                : 'rgba(0,0,0,0.08)',
                                                        },
                                                    ]}
                                                >
                                                    <PlatformIcon name="plus" size={12} color={textColor} />
                                                    <Text style={[s.approvalAddOverrideBtnText, { color: textColor }]}>
                                                        Add Override
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    )}
                                </View>
                            );
                        })}
                    </View>
                )}
            </View>
        );
    };

    const handleSavePrivacyRetention = (
        typeKey: RetentionTypeKey,
        updatedSetting: RetentionSetting
    ) => {
        let daysValue = 90;
        if (updatedSetting.preset === '7_days') daysValue = 7;
        else if (updatedSetting.preset === '30_days') daysValue = 30;
        else if (updatedSetting.preset === '90_days') daysValue = 90;
        else if (updatedSetting.preset === '180_days') daysValue = 180;
        else if (updatedSetting.preset === '1_year') daysValue = 365;
        else if (updatedSetting.preset === 'never') daysValue = 99999;
        else if (updatedSetting.preset === 'custom') {
            const val = updatedSetting.customValue || 1;
            if (updatedSetting.customUnit === 'years') daysValue = val * 365;
            else if (updatedSetting.customUnit === 'months') daysValue = val * 30;
            else daysValue = val;
        }

        const nextCfg: PrivacyRetentionConfig = {
            ...privacyConfig,
            [typeKey === 'location'
                ? 'locationRetention'
                : typeKey === 'photo'
                ? 'photoRetention'
                : 'auditLogRetention']: updatedSetting,
            ...(typeKey === 'location' ? { purgeGpsAfterDays: daysValue } : {}),
            ...(typeKey === 'audit_log' ? { retentionAuditLogDays: daysValue } : {}),
        };

        updateSettingAndSave('PRIVACY', setPrivacyConfig, nextCfg);
        const titleMap: Record<string, string> = {
            location: 'Location Data Retention',
            photo: 'Attendance Photo Retention',
            audit_log: 'Audit Log Retention',
        };
        triggerDynamicIslandFeedback({
            title: titleMap[typeKey] || 'Privacy Retention',
            message: `Retention set to ${formatRetentionSettingDisplay(updatedSetting)}`,
            status: 'Saved',
        });
    };

    // 8f. Privacy & Data Retention Policies
    const renderPrivacyRetention = () => {
        const retentionItems: Array<{
            key: RetentionTypeKey;
            title: string;
            subtitle: string;
            setting: RetentionSetting;
        }> = [
            {
                key: 'location',
                title: 'Location Data Retention',
                subtitle: 'How long clock-in/out location history is retained.',
                setting: privacyConfig.locationRetention || DEFAULT_PRIVACY.locationRetention,
            },
            {
                key: 'photo',
                title: 'Attendance Photo Retention',
                subtitle: 'How long attendance verification photos are retained.',
                setting: privacyConfig.photoRetention || DEFAULT_PRIVACY.photoRetention,
            },
            {
                key: 'audit_log',
                title: 'Audit Log Retention',
                subtitle: 'How long attendance changes and approval records are retained.',
                setting: privacyConfig.auditLogRetention || DEFAULT_PRIVACY.auditLogRetention,
            },
        ];

        return (
            <View style={{ gap: 14 }}>
                <View style={{ gap: 8 }}>
                    <View style={s.sectionHeader}>
                        <Text style={[s.sectionTitle, { color: isDark ? '#8E8E93' : '#6C6C70' }]}>
                            Data Retention Policies
                        </Text>
                    </View>

                    <View style={{ gap: 10 }}>
                        {retentionItems.map((item) => {
                            const displayVal = formatRetentionSettingDisplay(item.setting);

                            return (
                                <TouchableOpacity
                                    key={item.key}
                                    activeOpacity={0.72}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setSelectedRetentionKey(item.key);
                                        setPrivacyModalVisible(true);
                                    }}
                                >
                                    <View style={[
                                            s.remoteModeCard,
                                            {
                                                backgroundColor: cardBg,
                                                borderColor: cardBorder,
                                                paddingVertical: 14,
                                                paddingHorizontal: 16,
                                            },
                                        ]}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <View style={{ flex: 1, paddingRight: 12 }}>
                                                <Text
                                                    style={[
                                                        s.remoteModeTitle,
                                                        { color: textColor, marginBottom: 2 },
                                                    ]}
                                                >
                                                    {item.title}
                                                </Text>
                                                <Text
                                                    style={[s.remoteModeDescription, { color: subtextColor, lineHeight: 16 }]}
                                                    numberOfLines={2}
                                                >
                                                    {item.subtitle}
                                                </Text>
                                            </View>

                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                                <Text style={{ fontSize: 14.5, fontWeight: '500', color: subtextColor }}>
                                                    {displayVal}
                                                </Text>
                                                <PlatformIcon
                                                    name="chevron.forward"
                                                    size={14}
                                                    tintColor={subtextColor}
                                                />
                                            </View>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* Core Attendance Preservation Info Callout */}
                <View style={[
                        s.identityGroupCard,
                        {
                            backgroundColor: cardBg,
                            borderColor: cardBorder,
                            padding: 14,
                        },
                    ]}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                        <View
                            style={{
                                width: 24,
                                height: 24,
                                borderRadius: 12,
                                backgroundColor: isDark
                                    ? 'rgba(52, 199, 89, 0.15)'
                                    : 'rgba(52, 199, 89, 0.12)',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginTop: 1,
                            }}
                        >
                            <PlatformIcon
                                name="checkmark.shield.fill"
                                size={13}
                                tintColor="#34C759"
                            />
                        </View>
                        <View style={{ flex: 1, gap: 3 }}>
                            <Text style={{ fontSize: 13.5, fontWeight: '600', color: textColor }}>
                                Core Attendance Preservation
                            </Text>
                            <Text style={{ fontSize: 12.5, lineHeight: 17, color: subtextColor }}>
                                When retention periods expire, only sensitive GPS coordinates, selfie photos, and change audit trails are purged. Core attendance records (dates, clock times, hours, and approved results) remain preserved indefinitely.
                            </Text>
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    // 8g. Systems - Audit Logs
    const renderAuditLogs = () => {
        const orgPrefix = (activeTenant?.company_code || 'JCP')
            .replace(/[^A-Za-z0-9]/g, '')
            .slice(0, 3)
            .toUpperCase() || 'JCP';

        const auditLogsList: Array<AuditLogItem & { dateKey: 'today' | 'last_7_days' | 'last_30_days' | 'this_month' }> = [];

        const filteredAuditLogs = auditLogsList.filter((item) => {
            // Category filter
            if (selectedAuditCategory !== 'All' && item.category !== selectedAuditCategory) {
                return false;
            }
            // Time filter
            if (auditTimeFilter === 'today' && item.dateKey !== 'today') {
                return false;
            }
            // Search query filter
            if (auditSearchQuery.trim()) {
                const query = auditSearchQuery.toLowerCase().trim();
                const matchActor = item.actor.toLowerCase().includes(query);
                const matchAction = item.action.toLowerCase().includes(query);
                const matchDetail = item.detail.toLowerCase().includes(query);
                const matchCategory = item.category.toLowerCase().includes(query);
                const matchTime = item.time.toLowerCase().includes(query);
                const matchEmployee = item.relatedEmployee?.toLowerCase().includes(query);
                const matchId = item.id.toLowerCase().includes(query);
                return matchActor || matchAction || matchDetail || matchCategory || matchTime || matchEmployee || matchId;
            }
            return true;
        });

        const retentionDisplay = formatRetentionSettingDisplay(
            privacyConfig.auditLogRetention || DEFAULT_PRIVACY.auditLogRetention
        );

        const categoryActions: ContextMenuAction[] = [
            { title: 'All Types', selected: selectedAuditCategory === 'All' },
            { title: 'Setup Changes', selected: selectedAuditCategory === 'Setup Changes' },
            { title: 'Requests & Approvals', selected: selectedAuditCategory === 'Requests & Approvals' },
            { title: 'Attendance Corrections', selected: selectedAuditCategory === 'Attendance Corrections' },
            { title: 'Security / Access', selected: selectedAuditCategory === 'Security / Access' },
        ];

        const timeActions: ContextMenuAction[] = [
            { title: `All Retained (${retentionDisplay})`, selected: auditTimeFilter === 'all' },
            { title: 'Today', selected: auditTimeFilter === 'today' },
            { title: 'Last 7 Days', selected: auditTimeFilter === 'last_7_days' },
            { title: 'Last 30 Days', selected: auditTimeFilter === 'last_30_days' },
            { title: 'This Month', selected: auditTimeFilter === 'this_month' },
        ];

        const categoryFilterLabel =
            selectedAuditCategory === 'All'
                ? 'Type'
                : selectedAuditCategory === 'Setup Changes'
                ? 'Setup'
                : selectedAuditCategory === 'Requests & Approvals'
                ? 'Requests'
                : selectedAuditCategory === 'Attendance Corrections'
                ? 'Corrections'
                : 'Security';

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
                {/* 1. Unified Toolbar: Search | Type Menu | Time Menu */}
                <View style={s.unifiedMemberToolbar}>
                    {/* Search Input */}
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

                    {/* Type Filter Dropdown Menu */}
                    <ContextMenu
                        actions={categoryActions}
                        onPress={(e) => {
                            Haptics.selectionAsync();
                            if (e.nativeEvent.index === 0) setSelectedAuditCategory('All');
                            else if (e.nativeEvent.index === 1) setSelectedAuditCategory('Setup Changes');
                            else if (e.nativeEvent.index === 2) setSelectedAuditCategory('Requests & Approvals');
                            else if (e.nativeEvent.index === 3) setSelectedAuditCategory('Attendance Corrections');
                            else if (e.nativeEvent.index === 4) setSelectedAuditCategory('Security / Access');
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

                    {/* Time Filter Dropdown Menu */}
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

                {/* 2. Chronological Audit Log Cards */}
                <View style={{ gap: 10 }}>
                    {filteredAuditLogs.length === 0 ? (
                        <View style={[
                                s.remoteModeCard,
                                {
                                    backgroundColor: cardBg,
                                    borderColor: cardBorder,
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
                                    name={auditSearchQuery || selectedAuditCategory !== 'All' || auditTimeFilter !== 'all' ? 'magnifyingglass' : 'clock.arrow.circlepath'}
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
                                {auditSearchQuery || selectedAuditCategory !== 'All' || auditTimeFilter !== 'all' ? 'No Matching Audit Logs' : 'No Audit Logs'}
                            </Text>
                            <Text
                                style={{
                                    fontSize: 13,
                                    color: subtextColor,
                                    textAlign: 'center',
                                    lineHeight: 18,
                                    maxWidth: 280,
                                }}
                            >
                                {auditSearchQuery || selectedAuditCategory !== 'All' || auditTimeFilter !== 'all'
                                    ? 'No system activity matches your filter criteria. Try adjusting your search query or filters.'
                                    : 'System event trail and attendance setup history will appear here.'}
                            </Text>

                            {(auditSearchQuery || selectedAuditCategory !== 'All' || auditTimeFilter !== 'all') && (
                                <TouchableOpacity
                                    activeOpacity={0.7}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setAuditSearchQuery('');
                                        setSelectedAuditCategory('All');
                                        setAuditTimeFilter('all');
                                    }}
                                    style={{
                                        marginTop: 4,
                                        paddingHorizontal: 14,
                                        paddingVertical: 6,
                                        borderRadius: 14,
                                        backgroundColor: isDark
                                            ? 'rgba(255,255,255,0.08)'
                                            : 'rgba(0,0,0,0.05)',
                                    }}
                                >
                                    <Text
                                        style={{
                                            fontSize: 12.5,
                                            fontWeight: '500',
                                            color: textColor,
                                        }}
                                    >
                                        Reset Filters
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
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
                                    <View style={[
                                            s.remoteModeCard,
                                            {
                                                backgroundColor: cardBg,
                                                borderColor: cardBorder,
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

                                        {/* Row 3: Clean Detail Text */}
                                        <Text
                                            style={{
                                                fontSize: 13,
                                                color: isDark ? '#D1D1D6' : '#3A3A3C',
                                                lineHeight: 18,
                                            }}
                                        >
                                            {item.detail}
                                        </Text>

                                        {/* Row 4: Clean Timestamp Footer (Light) */}
                                        <Text
                                            style={{
                                                fontSize: 11.5,
                                                color: isDark ? '#8E8E93' : '#8E8E93',
                                                fontWeight: '400',
                                                marginTop: 2,
                                            }}
                                        >
                                            {item.time}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })
                    )}
                </View>
            </View>
        );
    };

    // 8. Generic Policy Card (for Shift, Notifications, etc.)
    const renderGenericPolicyCard = (tag: string, tagColor: string, title: string, items: { label: string; value: string }[]) => {
        return (
            <View style={s.itemsContainer}>
                <View style={[s.itemCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                    <View style={s.cardTopRow}>
                        <View style={[s.codePill, { backgroundColor: `${tagColor}18` }]}>
                            <Text style={[s.codePillText, { color: tagColor }]}>{tag}</Text>
                        </View>
                    </View>
                    <Text style={[s.cardDeptTitle, { color: textColor, marginBottom: 8 }]}>{title}</Text>
                    {items.map((item, index) => {
                        const isLast = index === items.length - 1;
                        return (
                            <View key={item.label}>
                                <View style={s.ruleRow}>
                                    <Text style={[s.ruleTitle, { color: textColor }]}>{item.label}</Text>
                                    <Text style={{ fontWeight: '600', color: '#007AFF' }}>{item.value}</Text>
                                </View>
                                {!isLast && (
                                    <View style={[s.innerDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />
                                )}
                            </View>
                        );
                    })}
                </View>
            </View>
        );
    };

    return (
        <>
            <RNStatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
            {!isEmbedded && (
                <Stack.Screen
                    options={{
                        headerShown: true,
                        title: currentItemConfig.title,
                        headerLargeTitle: false,
                        headerTransparent: Platform.OS === 'ios',
                        headerStyle: { backgroundColor: Platform.OS === 'ios' ? 'transparent' : (isDark ? '#000000' : '#F2F2F7') },
                        headerTintColor: textColor,
                        headerTitleStyle: { color: textColor, fontWeight: '600' },
                        headerShadowVisible: false,
                        headerBackButtonDisplayMode: 'minimal',
                        headerBackTitle: ' ',
                        headerRight: toolbarActions.length > 0
                            ? () => (
                                <View style={{ marginRight: Platform.OS === 'web' ? 16 : 0 }}>
                                    <HeaderToolbar
                                        key={`header-toolbar-${activeModule}-${toolbarActions.length}`}
                                        actions={toolbarActions}
                                        isDark={isDark}
                                        textColor={textColor}
                                        maxDirectActions={2}
                                    />
                                </View>
                            )
                            : undefined,
                    }}
                />
            )}

            {isEmbedded && (
                <View style={s.embeddedHeaderRow}>
                    <View style={s.headerTitleCol}>
                        <Text style={[s.embeddedHeaderTitle, { color: textColor }]}>
                            {currentItemConfig.title}
                        </Text>
                        <Text style={[s.embeddedHeaderSubtitle, { color: subtextColor }]} numberOfLines={1}>
                            {currentItemConfig.subtitle}
                        </Text>
                    </View>
                    {toolbarActions.length > 0 && (
                        <HeaderToolbar
                            key={`header-toolbar-${activeModule}-${toolbarActions.length}`}
                            actions={toolbarActions}
                            isDark={isDark}
                            textColor={textColor}
                            maxDirectActions={3}
                            primaryActionTextColor="#0EA5E9"
                        />
                    )}
                </View>
            )}

            <ScrollView
                style={[s.container, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}
                contentInsetAdjustmentBehavior="automatic"
                contentContainerStyle={[
                    s.scrollContent,
                    {
                        paddingTop: isEmbedded ? 16 : (Platform.OS === 'android' ? (RNStatusBar.currentHeight || 24) + 16 : 16),
                        paddingBottom: insets.bottom + 40,
                    },
                ]}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#007AFF" />
                }
            >
                {/* Group Sub-Segment Selector */}
                {!isEmbedded && groupSegments.length > 1 && (
                    <SegmentedControl
                        segments={groupSegments}
                        activeSegment={activeModule}
                        onSegmentChange={(newId) => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setActiveModule(newId as ClockSetupModule);
                            setSearchQuery('');
                        }}
                    />
                )}

                {/* Search & Sort Toolbar Bar (Only for list/record modules) */}
                {(activeModule === 'work_schedules' ||
                    activeModule === 'work_locations' ||
                    activeModule === 'leave_policies' ||
                    activeModule === 'shift_management') && (
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
                                placeholder={`Search ${currentItemConfig.title.toLowerCase()}...`}
                                placeholderTextColor={subtextColor}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                clearButtonMode="while-editing"
                                autoCapitalize="none"
                            />
                        </View>

                        <SmoothSortButton
                            isDark={isDark}
                            sortOrder={sortOrder}
                            onPress={() => {
                                setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                            }}
                        />
                    </View>
                )}

                {loading && !refreshing ? (
                    <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                        <ActivityIndicator size="small" color="#007AFF" />
                    </View>
                ) : (
                    <>
                        {activeModule === 'attendance_members' && renderAttendanceMembers()}
                        {activeModule === 'work_schedules' && renderWorkSchedules()}
                        {activeModule === 'attendance_rules' && renderAttendanceRules()}
                        {activeModule === 'work_locations' && renderWorkLocations()}
                        {activeModule === 'holidays' && renderHolidays()}
                        {activeModule === 'leave_policies' && renderLeavePolicies()}

                        {activeModule === 'attendance_period' && renderAttendancePeriod()}
                        {activeModule === 'attendance_correction' && renderAttendanceCorrections()}

                        {activeModule === 'remote_work' && renderRemoteWorkPolicies()}

                        {activeModule === 'anti_fraud' && renderAntiFraudPolicy()}

                        {activeModule === 'overtime_rules' && renderOvertimePolicies()}

                        {activeModule === 'business_trip_rules' && renderBusinessTripPolicies()}

                        {activeModule === 'shift_management' && renderShiftManagement()}

                        {activeModule === 'approval_workflows' && renderApprovalWorkflows()}

                        {activeModule === 'notifications' &&
                            renderGenericPolicyCard('ALERTS', '#FF3B30', 'Automated Push Notifications', [
                                { label: 'Clock-in Morning Reminder', value: '15 Mins Before' },
                                { label: 'Clock-out Evening Reminder', value: '5 Mins After' },
                                { label: 'Late Attendance Alert', value: 'Realtime to Manager' },
                            ])}

                        {activeModule === 'privacy_retention' && renderPrivacyRetention()}
                        {activeModule === 'audit_logs' && renderAuditLogs()}
                    </>
                )}
            </ScrollView>

            {/* SwiftUI People/Clock Shared Setup Modal Sheet */}
            <SwiftUISetupItemSheet
                isOpened={sheetVisible}
                onClose={() => {
                    setSheetVisible(false);
                    setEditingItem(null);
                    setCustomSheetTitle(undefined);
                    setCustomSheetSubmitLabel(undefined);
                }}
                moduleType={activeModule as any}
                editingItem={editingItem}
                departmentsList={orgDepartments}
                positionsList={orgPositions}
                contractTypesList={contractTypes}
                levelsList={orgLevels}
                isSubmitting={saving}
                customTitle={customSheetTitle}
                customSubmitLabel={customSheetSubmitLabel}
                onSubmit={async (payload: any) => {
                    try {
                        setSaving(true);
                        if (activeModule === 'leave_policies') {
                            await saveLeavePolicy({
                                ...payload,
                                id: editingItem?.id || `policy-${Date.now()}`,
                                created_at: editingItem?.created_at || new Date().toISOString(),
                                updated_at: new Date().toISOString(),
                            });
                        } else {
                            const table = 'work_schedules';
                            if (editingItem?.id) {
                                await supabase.from(table).update(payload).eq('id', editingItem.id);
                            } else {
                                await supabase.from(table).insert([payload]);
                            }
                        }
                        setSheetVisible(false);
                        fetchAllData();
                        Alert.alert('Saved', 'Record successfully updated and synced.');
                    } catch (e: any) {
                        Alert.alert('Error', e.message || 'Failed to save record');
                    } finally {
                        setSaving(false);
                    }
                }}
            />

            {/* Leave Policy Presets Preview & Apply Dialog */}
            <LeavePolicyPresetModal
                visible={leavePresetModalVisible}
                onClose={() => setLeavePresetModalVisible(false)}
                onApplyPreset={async (preset) => {
                    try {
                        const newRecord: LeavePolicy = {
                            ...preset.policy,
                            id: `policy-${preset.leave_type}-${Date.now()}`,
                            name: preset.name,
                            created_at: new Date().toISOString(),
                        } as LeavePolicy;
                        await saveLeavePolicy(newRecord);
                        fetchAllData();
                        Alert.alert('Preset Applied', `"${preset.name}" has been added to Leave Policies.`);
                    } catch (e: any) {
                        Alert.alert('Error', e.message || 'Failed to apply preset');
                    }
                }}
                onCustomizePreset={(preset) => {
                    setEditingItem({
                        ...preset.policy,
                        name: preset.name,
                    });
                    setCustomSheetTitle('Preset Leave Policy');
                    setCustomSheetSubmitLabel('Apply Policy');
                    setSheetVisible(true);
                }}
            />

            {/* Work Schedule Presets Preview & Apply Dialog */}
            <WorkSchedulePresetModal
                visible={presetModalVisible}
                onClose={() => setPresetModalVisible(false)}
                onApplyPreset={handleApplyPreset}
            />

            {/* Period & Timezone Setting Sheet */}
            <PeriodTimezoneSheet
                visible={periodSheetVisible}
                onClose={() => setPeriodSheetVisible(false)}
                target={periodSheetTarget}
                config={periodConfig}
                onSave={(newCfg) => {
                    updateSettingAndSave('ATTENDANCE_PERIOD', setPeriodConfig, newCfg);
                }}
            />

            {/* Remote Work Policy Modal Sheet */}
            <RemoteWorkPolicyModal
                visible={remotePolicyModalVisible}
                policy={selectedRemotePolicyKey ? remoteWorkConfig[selectedRemotePolicyKey] : null}
                onClose={() => {
                    setRemotePolicyModalVisible(false);
                    setSelectedRemotePolicyKey(null);
                }}
                onSave={(updated: any) => {
                    const nextCfg: RemoteWorkConfig = {
                        ...remoteWorkConfig,
                        [updated.id]: updated,
                    };
                    updateSettingAndSave('REMOTE_WORK', setRemoteWorkConfig, nextCfg);
                    triggerDynamicIslandFeedback({
                        title: `${updated.name} Policy`,
                        message: 'Remote policy saved successfully',
                        status: 'Saved',
                    });
                }}
            />

            {/* Work Location Add / Edit Modal Sheet */}
            <WorkLocationModal
                visible={locationModalVisible}
                onClose={() => {
                    setLocationModalVisible(false);
                    setEditingLocationItem(null);
                }}
                onSave={handleSaveWorkLocation}
                onDelete={handleDeleteWorkLocation}
                locationItem={editingLocationItem}
                existingLocations={allWorkLocations}
                orgLocationCode={orgLocationCode}
            />

            {/* Shift Configuration Modal Sheet */}
            <ShiftConfigModal
                visible={shiftModalVisible}
                shiftItem={editingShiftItem}
                initialMode={selectedShiftMode}
                workSchedules={workSchedules}
                departments={orgDepartments}
                positions={orgPositions}
                levels={orgLevels}
                contractTypes={contractTypes}
                employees={profiles}
                onClose={() => {
                    setShiftModalVisible(false);
                    setEditingShiftItem(null);
                }}
                onSave={handleSaveShiftConfig}
                onDelete={handleDeleteShiftConfig}
            />

            {/* Approval Flow Configuration Modal Sheet */}
            <ApprovalFlowModal
                visible={approvalModalVisible}
                onClose={() => {
                    setApprovalModalVisible(false);
                    setSelectedDeptForApprovalModal(null);
                    setSelectedOverrideForApprovalModal(null);
                }}
                mode={approvalModalMode}
                departmentId={selectedDeptForApprovalModal?.id || ''}
                departmentName={selectedDeptForApprovalModal?.name || ''}
                currentChain={
                    selectedDeptForApprovalModal
                        ? (approvalConfig.departments.find(
                              (d) => d.departmentId === selectedDeptForApprovalModal.id || d.id === selectedDeptForApprovalModal.id
                          )?.chain || [])
                        : []
                }
                currentRequestType={
                    selectedDeptForApprovalModal
                        ? (approvalConfig.departments.find(
                              (d) => d.departmentId === selectedDeptForApprovalModal.id || d.id === selectedDeptForApprovalModal.id
                          )?.requestType || 'all')
                        : 'all'
                }
                onSaveDepartmentFlow={handleSaveDepartmentFlow}
                editingOverride={selectedOverrideForApprovalModal}
                onSaveOverride={handleSaveOverride}
                onDeleteOverride={handleDeleteOverride}
                departmentsList={orgDepartments}
                positionsList={orgPositions}
                membersList={profiles}
            />

            {/* Privacy & Data Retention Modal Sheet */}
            <PrivacyRetentionModal
                visible={privacyModalVisible}
                retentionType={selectedRetentionKey}
                currentSetting={
                    selectedRetentionKey === 'location'
                        ? privacyConfig.locationRetention || DEFAULT_PRIVACY.locationRetention
                        : selectedRetentionKey === 'photo'
                        ? privacyConfig.photoRetention || DEFAULT_PRIVACY.photoRetention
                        : selectedRetentionKey === 'audit_log'
                        ? privacyConfig.auditLogRetention || DEFAULT_PRIVACY.auditLogRetention
                        : undefined
                }
                onClose={() => {
                    setPrivacyModalVisible(false);
                    setSelectedRetentionKey(null);
                }}
                onSave={handleSavePrivacyRetention}
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


            {/* Liquid Glass Toast HUD (Floating below header) */}
            {Boolean(toastMessage) && (
                <Animated.View
                    style={[
                        s.topNotificationWrapper,
                        {
                            top: Platform.OS === 'ios' ? insets.top + 48 : (RNStatusBar.currentHeight || 24) + 52,
                        },
                        animatedToastStyle,
                    ]}
                    pointerEvents="none"
                >
                    <DynamicIslandToastHUD
                        title={currentItemConfig.title || 'Attendance Rules'}
                        message={toastMessage || ''}
                        isDark={isDark}
                    />
                </Animated.View>
            )}
        </>
    );
}

const s = StyleSheet.create({
    container: {
        flex: 1,
    },
    embeddedHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingTop: 18,
        paddingBottom: 14,
        borderBottomWidth: 0,
    },
    headerTitleCol: {
        flex: 1,
        gap: 2,
    },
    embeddedHeaderTitle: {
        fontSize: 20,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    embeddedHeaderSubtitle: {
        fontSize: 13,
        fontWeight: '400',
        marginTop: 2,
    },
    scrollContent: {
        paddingTop: 16,
        paddingBottom: 60,
        paddingHorizontal: 24,
        maxWidth: 840,
        width: '100%',
        alignSelf: 'center',
        gap: 16,
    },
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
    searchInput: {
        flex: 1,
        fontSize: 14,
        padding: 0,
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
    itemsContainer: {
        gap: 10,
    },
    itemCard: {
        borderRadius: 18,
        padding: 16,
        gap: 8,
        borderWidth: 1,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
    },
    cardTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 2,
    },
    codePill: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 7,
        alignItems: 'center',
        justifyContent: 'center',
    },
    codePillText: {
        fontSize: 11,
        fontWeight: '700',
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
    cardDeptTitle: {
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    cardMetaText: {
        fontSize: 12,
        lineHeight: 16,
    },
    memberMainRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginTop: 4,
    },
    avatarCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 16,
        fontWeight: '700',
    },
    metricHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingVertical: 6,
    },
    metricItem: {
        alignItems: 'center',
        gap: 2,
    },
    metricValue: {
        fontSize: 22,
        fontWeight: '700',
    },
    metricLabel: {
        fontSize: 12,
        fontWeight: '500',
    },
    metricDivider: {
        width: StyleSheet.hairlineWidth,
        height: 28,
    },
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingTop: 8,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: 'rgba(120, 120, 128, 0.15)',
    },
    infoBannerText: {
        fontSize: 11,
        flex: 1,
    },
    ruleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
        gap: 10,
    },
    ruleTitle: {
        fontSize: 15,
        fontWeight: '500',
    },
    ruleDesc: {
        fontSize: 12,
        marginTop: 2,
    },
    pillCounter: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(120, 120, 128, 0.12)',
        borderRadius: 12,
        paddingHorizontal: 4,
        paddingVertical: 2,
        gap: 8,
    },
    pillBtn: {
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    pillBtnText: {
        fontSize: 16,
        fontWeight: '600',
    },
    pillValue: {
        fontSize: 13,
        fontWeight: '700',
        minWidth: 32,
        textAlign: 'center',
    },
    innerDivider: {
        height: StyleSheet.hairlineWidth,
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
    actionBadgePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 14,
        borderWidth: 1,
    },
    actionBadgeText: {
        fontSize: 12,
        fontWeight: '600',
    },
    sourceBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    sourceBadgeText: {
        fontSize: 10,
        fontWeight: '500',
    },
    jointLeaveToggleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
        borderWidth: 1,
    },
    jointLeaveToggleText: {
        fontSize: 11,
        fontWeight: '600',
    },
    calendarMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
        marginTop: 6,
    },
    calendarMetaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    cardSubtitleText: {
        fontSize: 13,
        fontWeight: '400',
        marginTop: 2,
    },
    cardDateText: {
        fontSize: 13,
        fontWeight: '500',
        marginTop: 6,
    },
    cardSubDesc: {
        fontSize: 12,
        lineHeight: 16,
        marginTop: 6,
        opacity: 0.85,
    },
    activeFilterBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 10,
        marginBottom: 10,
    },
    activeFilterText: {
        fontSize: 12,
        fontWeight: '600',
    },
    activeFilterClear: {
        padding: 2,
    },
    sectionHeader: {
        paddingHorizontal: 4,
        marginTop: 4,
        marginBottom: 2,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
    },
    identityGroupCard: {
        borderRadius: 18,
        overflow: 'hidden',
        paddingHorizontal: 16,
        borderWidth: 1,
    },
    identityFormRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
    },
    identityRowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    identityRowLabel: {
        fontSize: 15,
        fontWeight: '500',
    },
    identityRowRight: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        flexShrink: 1,
        marginLeft: 12,
    },
    identityRowValue: {
        fontSize: 15,
        fontWeight: '400',
    },
    sectionFooterNote: {
        fontSize: 12,
        lineHeight: 16,
        marginTop: 4,
        paddingHorizontal: 6,
        opacity: 0.85,
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 2,
    },
    settingValueWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        flexShrink: 1,
    },
    settingValueText: {
        fontSize: 14,
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
    toolbarFilterBtnActiveLight: {
        backgroundColor: 'rgba(0, 122, 255, 0.12)',
    },
    toolbarFilterBtnActiveDark: {
        backgroundColor: 'rgba(0, 122, 255, 0.22)',
    },
    toolbarFilterBtnText: {
        fontSize: 12,
        fontWeight: '500',
    },
    memberIndividualCard: {
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        overflow: 'hidden',
        paddingHorizontal: 14,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
    },
    compactMemberAvatar: {
        width: 38,
        height: 38,
        borderRadius: 19,
    },
    compactMemberAvatarFallback: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    compactMemberAvatarText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
        textAlign: 'center',
    },
    compactMemberName: {
        fontSize: 14,
        fontWeight: '600',
    },
    compactMemberEmail: {
        fontSize: 12,
    },
    compactMemberSubtitle: {
        fontSize: 12,
        marginTop: 1,
    },
    compactBadgePill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
    },
    compactGreenDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#34C759',
    },
    compactBadgeText: {
        fontSize: 11,
        fontWeight: '600',
    },
    readOnlyFootnoteContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    readOnlyFootnoteText: {
        fontSize: 12,
        lineHeight: 16,
        textAlign: 'center',
    },
    ruleIdentityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
    },
    ruleIdentityLeft: {
        flex: 1,
        paddingRight: 10,
    },
    ruleIdentityTitle: {
        fontSize: 15,
        fontWeight: '500',
    },
    ruleIdentitySubtitle: {
        fontSize: 12,
        lineHeight: 16,
        marginTop: 2,
    },
    ruleIdentityRight: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    ruleIdentityValue: {
        fontSize: 15,
        fontWeight: '500',
    },
    statusPreviewRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
    },
    statusBadgeWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 9,
        paddingVertical: 4.5,
        borderRadius: 8,
        gap: 5,
    },
    statusBadgeDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusBadgeText: {
        fontSize: 12,
        fontWeight: '600',
    },
    statusDescText: {
        fontSize: 13,
        fontWeight: '400',
        textAlign: 'right',
        flexShrink: 1,
        marginLeft: 12,
    },
    topNotificationWrapper: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999999,
    },
    remoteModeCard: {
        borderRadius: 16,
        padding: 14,
        overflow: 'hidden',
        borderWidth: StyleSheet.hairlineWidth,
    },
    remoteCardTopRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    remoteModeIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 1,
    },
    remoteCardContent: {
        flex: 1,
        gap: 2.5,
    },
    remoteModeTitle: {
        fontSize: 15,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    remoteModeDescription: {
        fontSize: 13,
        lineHeight: 17,
    },
    remotePolicyNotice: {
        fontSize: 12.5,
        lineHeight: 17,
        marginTop: 2,
    },
    examplePreviewBox: {
        marginTop: 8,
        marginBottom: 16,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: StyleSheet.hairlineWidth,
    },
    examplePreviewTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
        gap: 8,
    },
    examplePreviewTagWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        flexShrink: 1,
    },
    examplePreviewTagText: {
        fontSize: 11.5,
        fontWeight: '600',
        letterSpacing: -0.1,
    },
    examplePreviewHeaderContext: {
        fontSize: 11,
        fontWeight: '500',
        textAlign: 'right',
        flexShrink: 1,
    },
    exampleScenariosContainer: {
        gap: 4,
    },
    exampleScenarioRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 7,
    },
    exampleScenarioIn: {
        fontSize: 12.5,
        fontWeight: '500',
    },
    exampleScenarioOut: {
        fontSize: 12.5,
        fontWeight: '600',
    },
    exampleDivider: {
        height: StyleSheet.hairlineWidth,
        marginVertical: 8,
    },
    exampleImpactContainer: {
        gap: 5,
    },
    examplePillsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 5,
    },
    examplePill: {
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 6,
    },
    examplePillText: {
        fontSize: 10.5,
        fontWeight: '500',
    },
    exampleBreakNoteText: {
        fontSize: 11,
        lineHeight: 15,
        fontStyle: 'italic',
        marginTop: 6,
    },
    // Approval Flows Styles (Minimalist iOS Cards)
    emptyApprovalCard: {
        padding: 32,
        borderRadius: 18,
        borderWidth: StyleSheet.hairlineWidth,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    emptyApprovalTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginTop: 4,
    },
    emptyApprovalSubtitle: {
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 18,
    },
    approvalDeptWrapper: {
        width: '100%',
    },
    approvalParentCard: {
        borderRadius: 18,
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 16,
        gap: 8,
    },
    approvalParentHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
    },
    approvalDeptName: {
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    approvalDeptStats: {
        fontSize: 13,
        fontWeight: '400',
        marginTop: 2,
    },
    approvalPlainChevronBtn: {
        padding: 4,
        marginTop: 2,
    },
    approvalChainTextContainer: {
        marginTop: 6,
    },
    approvalChainInlineText: {
        fontSize: 13.5,
        lineHeight: 20,
    },
    approvalChainLevelPrefix: {
        fontWeight: '600',
    },
    approvalChainStepName: {
        fontWeight: '400',
    },
    approvalChainArrowText: {
        fontWeight: '400',
    },
    approvalExpandedArea: {
        width: '90%',
        alignSelf: 'flex-end',
        marginTop: 10,
        position: 'relative',
    },
    approvalTreeBranchLine: {
        position: 'absolute',
        left: -14,
        top: 0,
        bottom: 16,
        width: 1.5,
        borderRadius: 1,
    },
    approvalSubcardsContainer: {
        gap: 8,
    },
    approvalSubcard: {
        borderRadius: 14,
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: 14,
        paddingVertical: 10,
        gap: 3,
    },
    approvalSubcardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    approvalSubcardTitle: {
        fontSize: 14.5,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    approvalSubcardReqTypeText: {
        fontSize: 12.5,
        fontWeight: '400',
    },
    approvalSubcardChainText: {
        fontSize: 12.5,
        lineHeight: 18,
    },
    approvalAddOverrideBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderRadius: 14,
        borderWidth: StyleSheet.hairlineWidth,
        marginTop: 2,
    },
    approvalAddOverrideBtnText: {
        fontSize: 13.5,
        fontWeight: '500',
    },
});
