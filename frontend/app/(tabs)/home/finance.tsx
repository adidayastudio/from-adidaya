import { isFinanceSuperadmin } from '@/lib/financeRoles';
import { useTenantContext } from '@/context/TenantContext';
import { DESKTOP_LIST_PANE, DESKTOP_PANEL_HEADER, DESKTOP_PANEL_TITLE_ROW, DESKTOP_PANEL_TITLE, DESKTOP_PANEL_ACTION } from '@/constants/desktopLayout';
import { AddRequestsToConsolidationModal } from '@/components/finance/AddRequestsToConsolidationModal';
import { BouncyFinanceCard } from '@/components/finance/BouncyFinanceCard';
import { ConsolidationCard } from '@/components/finance/ConsolidationCard';
import { ConsolidationPaymentModal } from '@/components/finance/ConsolidationPaymentModal';
import { CreateConsolidationPreviewSheet } from '@/components/finance/CreateConsolidationPreviewSheet';
import { FinanceHeroOverviewCard } from '@/components/finance/FinanceHeroOverviewCard';
import { FinanceMonthlyStackedOverview } from '@/components/finance/FinanceMonthlyStackedOverview';
import { FinancePayModal } from '@/components/finance/FinancePayModal';
import { FinanceActionType, FinanceRequestActionModal } from '@/components/finance/FinanceRequestActionModal';
import { FinanceSummaryCard } from '@/components/finance/FinanceSummaryCard';
import { FinanceTeamSetupTab, FinanceSetupModule } from '@/components/finance/setup/FinanceTeamSetupTab';
import { FinanceSetupDetailPane } from '@/components/finance/setup/FinanceSetupDetailPane';
import { SwiftUIAddFundingSourceSheet } from '@/components/finance/SwiftUIAddFundingSourceSheet';
import { SwiftUIConsolidationDetailSheet } from '@/components/finance/SwiftUIConsolidationDetailSheet';
import { SwiftUIConsolidationRequestDetailSheet } from '@/components/finance/SwiftUIConsolidationRequestDetailSheet';
import { SwiftUICreateRequestSheet } from '@/components/finance/SwiftUICreateRequestSheet';
import { SwiftUIFundingDetailSheet } from '@/components/finance/SwiftUIFundingDetailSheet';
import { SwiftUINewRecordSheet } from '@/components/finance/SwiftUINewRecordSheet';
import { SwiftUITransactionDetailSheet } from '@/components/finance/SwiftUITransactionDetailSheet';
import { TopUpModal } from '@/components/finance/TopUpModal';
import { GlassView } from '@/components/ui/GlassView';
import { HeaderToolbar, HeaderToolbarAction } from '@/components/ui/HeaderToolbar';
import { WebFinderHeader } from '@/components/ui/WebFinderHeader';
import { LiquidDatePicker } from '@/components/ui/LiquidDatePicker';
import { MultiProgressRing } from '@/components/ui/MultiProgressRing';
import { getFinanceStatusColor } from '@/lib/financeStatusPresentation';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import type { PickerItem } from '@/components/ui/SearchablePicker';
import { Segment, SegmentedControl } from '@/components/ui/SegmentedControl';
import { SwiftUISegmentedControl } from '@/components/ui/SwiftUISegmentedControl';
import { SwipeTabWrapper } from '@/components/ui/SwipeTabWrapper';
import { UnauthenticatedView } from '@/components/ui/UnauthenticatedView';
import { Colors } from '@/constants/theme';
import { useFinance } from '@/context/FinanceContext';
import { useSearch } from '@/context/SearchContext';
import { useTheme } from '@/context/ThemeContext';
import { MANAGEMENT_ROLES, useUserContext } from '@/context/UserProvider';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { PurchasingConsolidationItem, isRequestEligibleForConsolidation } from '@/lib/api/financeConsolidation';
import { formatDepartmentCode, fetchOrganizationDepartments } from '@/lib/api/financeSetup';
import { fetchProjects } from '@/lib/api/finance';
import {
    Host,
    Button as SwiftButton,
    HStack as SwiftHStack,
    Image as SwiftImage,
    Spacer as SwiftSpacer,
    Text as SwiftText,
    GlassEffectContainer as SwiftUIGlassEffectContainer,
    cornerRadius as swiftCornerRadius,
    frame as swiftFrame,
    glassEffect as swiftGlassEffect,
    padding as swiftPadding,
} from '@/lib/swiftui';
import { useIsFocused } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActionSheetIOS, Alert, Dimensions, Modal, Platform, Pressable, StatusBar as RNStatusBar, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import ContextMenu, { ContextMenuAction } from '@/components/ui/PlatformContextMenu';
import Animated, { FadeInUp, useAnimatedStyle, useSharedValue, withSpring, withTiming, Easing } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const FINANCE_SEGMENTS: Segment[] = [
    { id: 'overview', label: 'Overview', icon: 'chart.pie.fill' },
    { id: 'purchasing', label: 'Purchasing', icon: 'cart.fill' },
    { id: 'reimbursement', label: 'Reimbursement', icon: 'doc.text.fill' },
    // { id: 'petty_cash', label: 'Petty Cash', icon: 'wallet.bifold.fill' }, // Parked
    { id: 'funding', label: 'Funding', icon: 'tray.2.fill' },
    // { id: 'reports', label: 'Reports', icon: 'list.bullet.rectangle.fill' }, // Parked
];

function formatShortBalance(amount: number) {
    if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)}B`;
    if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
    if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;
    return String(amount);
}

function formatCurrency(amount: number) {
    const val = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(val).replace('IDR', 'Rp');
}

function getOpaqueColor(hexColor: string, isDark: boolean): string {
    let cleanHex = hexColor.replace('#', '');
    if (cleanHex.length === 3) {
        cleanHex = cleanHex[0] + cleanHex[0] + cleanHex[1] + cleanHex[1] + cleanHex[2] + cleanHex[2];
    }
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);

    const alpha = isDark ? 0.14 : 0.08;
    const bgR = isDark ? 28 : 255;
    const bgG = isDark ? 28 : 255;
    const bgB = isDark ? 30 : 255;

    const blendedR = Math.round(alpha * r + (1 - alpha) * bgR);
    const blendedG = Math.round(alpha * g + (1 - alpha) * bgG);
    const blendedB = Math.round(alpha * b + (1 - alpha) * bgB);

    const hexR = blendedR.toString(16).padStart(2, '0');
    const hexG = blendedG.toString(16).padStart(2, '0');
    const hexB = blendedB.toString(16).padStart(2, '0');

    return `#${hexR}${hexG}${hexB}`;
}

function getConsolidationPaymentProgress(consolidation: any) {
    const total = Math.max(0, Number(consolidation.total_amount || 0));
    const recordedPaid = Math.max(0, Number(consolidation.total_paid_amount || 0));
    const paid = consolidation.status === 'Paid' ? total : Math.min(total, recordedPaid);
    const isFullyPaid = consolidation.status === 'Paid' || (total > 0 && paid >= total);
    const isPartiallyPaid = paid > 0 && !isFullyPaid;
    return {
        total,
        paid,
        remaining: Math.max(0, total - paid),
        isPending: !isFullyPaid && !isPartiallyPaid,
        isPartiallyPaid,
        hasPayment: isFullyPaid || isPartiallyPaid,
    };
}


function calculateSummary(items: any[], categoryIcon: string) {
    const stats = {
        total: { label: 'Total Requests', amount: 0, count: 0, icon: categoryIcon, color: '#007AFF' },
        pending: { label: 'Pending', amount: 0, count: 0, icon: 'clock.fill', color: '#FF9500' },
        approved: { label: 'Approved', amount: 0, count: 0, icon: 'checkmark.shield.fill', color: '#007AFF' },
        paid: { label: 'Paid', amount: 0, count: 0, icon: 'checkmark.seal.fill', color: '#34C759' },
        rejected: { label: 'Rejected', amount: 0, count: 0, icon: 'xmark.circle.fill', color: '#FF3B30' },
    };

    items.forEach(item => {
        let amount = 0;
        if (item && item.amount !== null && item.amount !== undefined) {
            if (typeof item.amount === 'number') {
                amount = item.amount;
            } else if (typeof item.amount === 'string') {
                amount = parseInt(item.amount.replace(/[^0-9]/g, ''), 10) || 0;
            }
        }
        stats.total.amount += amount;
        stats.total.count += 1;

        const tag = item?.statusTag?.toLowerCase() as keyof typeof stats;
        if (tag && stats[tag]) {
            stats[tag].amount += amount;
            stats[tag].count += 1;
        }
        const partiallyPaidAmount = Math.min(amount, Number(item?._paid_amount || 0));
        if (tag !== 'paid' && partiallyPaidAmount > 0) {
            stats.paid.amount += partiallyPaidAmount;
            stats.paid.count += 1;
        }
    });

    return stats;
}

function calculatePettyCashSummary(pools: any[]) {
    const stats = {
        total: { label: 'Active Pools', value: 0, icon: 'wallet.bifold.fill', color: '#AF52DE' },
        balance: { label: 'Overall Balance', value: 0, icon: 'dollarsign.circle.fill', color: '#34C759' },
        low: { label: 'Under Limit', value: 0, icon: 'exclamationmark.triangle.fill', color: '#FF9500' },
    };

    pools.forEach(pool => {
        if (pool.status === 'active') {
            stats.total.value += 1;
            stats.balance.value += pool.balance;
            if (pool.balance < pool.limit) {
                stats.low.value += 1;
            }
        }
    });

    return stats;
}

function getProviderColor(provider: string) {
    const p = (provider || '').toUpperCase();
    if (p.includes('BCA')) return '#003882';
    if (p.includes('MANDIRI')) return '#FFC800';
    if (p.includes('BNI')) return '#008080';
    if (p.includes('BRI')) return '#00A4E4';
    if (p.includes('BTN')) return '#004F9F';
    if (p.includes('BSI')) return '#006E5D';
    return '#8E8E93';
}

const BouncySelectionToggle = ({
    isSelected,
    onPress,
    isDark,
    textColor,
    subtextColor,
    label = 'Select to Consolidate',
}: {
    isSelected: boolean;
    onPress: () => void;
    isDark: boolean;
    textColor: string;
    subtextColor: string;
    label?: string;
}) => {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return (
        <Pressable
            onPressIn={() => {
                'worklet';
                scale.value = withSpring(0.92, { damping: 15, stiffness: 350 });
            }}
            onPressOut={() => {
                'worklet';
                scale.value = withSpring(1, { damping: 15, stiffness: 350 });
            }}
            onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onPress();
            }}
        >
            <Animated.View
                style={[
                    animatedStyle,
                    {
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 6,
                        paddingLeft: 8,
                        paddingRight: 14,
                        borderRadius: 20,
                        backgroundColor: isSelected
                            ? (isDark ? 'rgba(0, 122, 255, 0.25)' : 'rgba(0, 122, 255, 0.14)')
                            : (isDark ? 'rgba(255, 255, 255, 0.09)' : 'rgba(0, 0, 0, 0.06)'),
                    }
                ]}
            >
                <PlatformIcon
                    name={isSelected ? "checkmark.circle.fill" : "checkmark.circle"}
                    size={16}
                    tintColor={isSelected ? "#007AFF" : subtextColor}
                    style={{ marginRight: 6 }}
                />
                <Text style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: isSelected ? "#007AFF" : textColor,
                    letterSpacing: -0.2,
                }}>
                    {isSelected ? 'Cancel Selection' : label}
                </Text>
            </Animated.View>
        </Pressable>
    );
};

const DEFAULT_DEPARTMENTS_LIST = [
    { code: 'HGA', name: 'Human Resources & General Affairs' },
    { code: 'FIN', name: 'Finance & Accounting' },
    { code: 'OPS', name: 'Operations' },
    { code: 'ENG', name: 'Engineering' },
    { code: 'PUR', name: 'Purchasing' },
    { code: 'MKT', name: 'Marketing' },
    { code: 'SLS', name: 'Sales' },
    { code: 'DES', name: 'Design & Creative' },
];

export default function FinanceScreen() {
    const insets = useSafeAreaInsets();
    const isFocused = useIsFocused();

    const router = useRouter();
    const params = useLocalSearchParams<{ requestId?: string; requestType?: string }>();

    const {
        activeScope,
        setActiveScope,
        activeWorkflowTab,
        setActiveWorkflowTab,
        purchasingRequests,
        reimbursementRequests,
        teamPurchasing,
        teamReimbursement,
        consolidations,
        fundingSources,
        pettyCashPools,
        documentRules,
        isConsolidationEnabled,
        hasTeamAccess,
        refreshData,
        updateRequestStatus,
        deleteRequest,
        payRequest,
    } = useFinance();
    const { profile, user, isAuthenticated } = useUserContext();
    const { tenantRole } = useTenantContext();
    const [activeSegment, setActiveSegment] = useState('overview');
    const isManager = useMemo(() => {
        if (!profile?.role) return false;
        const roleStr = String(profile.role).toLowerCase().trim();
        return MANAGEMENT_ROLES.some(r => r.toLowerCase() === roleStr);
    }, [profile]);
    const filteredFinanceSegments = useMemo(() => {
        const list: Segment[] = [
            { id: 'overview', label: 'Overview', icon: 'chart.pie.fill' },
            { id: 'purchasing', label: 'Purchasing', icon: 'cart.fill' },
            { id: 'reimbursement', label: 'Reimbursement', icon: 'doc.text.fill' },
        ];
        if (activeScope === 'team' && isManager) {
            list.push({ id: 'funding', label: 'Funding', icon: 'tray.2.fill' });
            list.push({ id: 'setup', label: 'Setup', icon: 'gearshape.fill' });
        }
        return list;
    }, [isManager, activeScope]);

    // Dynamic Purchasing Workflow Subtab Segments (from Finance Setup)
    const isPurchasingConEnabled = Boolean(documentRules.purchasing?.levels?.consolidation?.enabled);
    const isReimbConEnabled = Boolean(documentRules.reimbursement?.levels?.consolidation?.enabled);

    const purchasingSubSegments = useMemo<Segment[]>(() => {
        const getShortLabel = (level: any, defaultLabel: string) => {
            if (!level) return defaultLabel;
            const name = level.customName || level.recommendedName || defaultLabel;
            if (name.length > 12) {
                return level.systemLevel || level.customCode || defaultLabel;
            }
            return name;
        };

        const reqName = getShortLabel(documentRules.purchasing?.levels?.request, 'Request');
        const conName = getShortLabel(documentRules.purchasing?.levels?.consolidation, 'Consolidation');
        const payName = getShortLabel(documentRules.purchasing?.levels?.payment, 'Payment');

        const segments: Segment[] = [{ id: 'request', label: reqName }];
        if (isPurchasingConEnabled) {
            segments.push({ id: 'consolidation', label: conName });
        }
        segments.push({ id: 'payment', label: payName });

        return segments;
    }, [documentRules, isPurchasingConEnabled]);

    const reimbursementSubSegments = useMemo<Segment[]>(() => {
        const levels = documentRules.reimbursement?.levels;
        const label = (level: any, fallback: string) => {
            const value = level?.customName || level?.recommendedName || fallback;
            return value.length > 12 ? (level?.systemLevel || level?.customCode || fallback) : value;
        };

        const segments: Segment[] = [{ id: 'request', label: label(levels?.request, 'Request') }];
        if (isReimbConEnabled) {
            segments.push({ id: 'consolidation', label: label(levels?.consolidation, 'Consolidation') });
        }
        segments.push({ id: 'payment', label: label(levels?.payment, 'Payment') });

        return segments;
    }, [documentRules, isReimbConEnabled]);

    useEffect(() => {
        if (activeSegment === 'purchasing' && !isPurchasingConEnabled && activeWorkflowTab === 'consolidation') {
            setActiveWorkflowTab('request');
        } else if (activeSegment === 'reimbursement' && !isReimbConEnabled && activeWorkflowTab === 'consolidation') {
            setActiveWorkflowTab('request');
        }
    }, [activeSegment, isPurchasingConEnabled, isReimbConEnabled, activeWorkflowTab, setActiveWorkflowTab]);

    const { refreshing, onRefresh } = usePullToRefresh(refreshData);
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';

    const { width } = useWindowDimensions();
    const isDesktopWeb = Platform.OS === 'web' && width >= 768;

    const { searchQuery, setSearchQuery, isSearchVisible, setIsSearchVisible, setContextAction } = useSearch();

    const isOverview = activeSegment === 'overview';
    const overviewTransition = useSharedValue(isOverview ? 1 : 0);

    useEffect(() => {
        overviewTransition.value = withTiming(isOverview ? 1 : 0, {
            duration: 380,
            easing: Easing.bezier(0.2, 0.9, 0.3, 1),
        });
    }, [isOverview]);

    const animatedHeroStyle = useAnimatedStyle(() => ({
        opacity: overviewTransition.value,
        transform: [
            {
                translateY: (1 - overviewTransition.value) * -16,
            },
            {
                scale: 0.98 + 0.02 * overviewTransition.value,
            },
        ],
    }));

    const animatedCardDiagonalStyle = useAnimatedStyle(() => ({
        opacity: overviewTransition.value,
        transform: [
            {
                translateX: (1 - overviewTransition.value) * 48,
            },
            {
                translateY: (1 - overviewTransition.value) * -36,
            },
            {
                scale: 0.94 + 0.06 * overviewTransition.value,
            },
        ],
    }));

    // Purchasing Consolidation States
    const [selectedForConsolidationIds, setSelectedForConsolidationIds] = useState<string[]>([]);
    const selectedTotalAmount = useMemo(() => {
        return purchasingRequests
            .filter(r => selectedForConsolidationIds.includes(r.id))
            .reduce((sum, r) => sum + (r.amount || 0), 0);
    }, [purchasingRequests, selectedForConsolidationIds]);
    const [isConsolidationSelectionMode, setIsConsolidationSelectionMode] = useState(false);
    const [showCreateConsolidationPreview, setShowCreateConsolidationPreview] = useState(false);
    const [activeDetailConsolidation, setActiveDetailConsolidation] = useState<PurchasingConsolidationItem | null>(null);
    const [showConsolidationDetail, setShowConsolidationDetail] = useState(false);
    const [consolidationDetailPresentationKey, setConsolidationDetailPresentationKey] = useState(0);
    const [showAddRequestsToConsolidation, setShowAddRequestsToConsolidation] = useState(false);
    const openingAddRequestsRef = useRef(false);
    const openingConsolidationRequestRef = useRef(false);
    const returnToConsolidationDetailRef = useRef(false);
    const [activeConsolidationRequest, setActiveConsolidationRequest] = useState<any | null>(null);
    const [showConsolidationRequestDetail, setShowConsolidationRequestDetail] = useState(false);
    const [activePaymentConsolidation, setActivePaymentConsolidation] = useState<PurchasingConsolidationItem | null>(null);
    const [showConsolidationPaymentModal, setShowConsolidationPaymentModal] = useState(false);
    const [selectedPaymentRequestIds, setSelectedPaymentRequestIds] = useState<string[]>([]);

    const canAccessPayment = (consolidation: PurchasingConsolidationItem) => {
        const identities = [profile?.full_name, profile?.nickname, profile?.email, profile?.job_title, profile?.position, profile?.role]
            .map(value => String(value || '').toLowerCase().trim())
            .filter(Boolean);
        const levelOnePayer = (consolidation.payment_approval_chain || [])[0];
        return Boolean(levelOnePayer && (
            levelOnePayer.userId === user?.id
            || identities.includes(String(levelOnePayer.personName || '').toLowerCase().trim())
            || identities.includes(String(levelOnePayer.positionTitle || '').toLowerCase().trim())
        ));
    };

    useEffect(() => {
        if (!activeDetailConsolidation?.id) return;
        const latest = consolidations.find(item => item.id === activeDetailConsolidation.id);
        if (latest) setActiveDetailConsolidation(latest);
    }, [consolidations, activeDetailConsolidation?.id]);

    useEffect(() => {
        if (!isManager && activeSegment === 'funding') {
            setActiveSegment('overview');
        }
        if ((activeScope !== 'team' || !isManager) && activeSegment === 'setup') {
            setActiveSegment('overview');
        }
    }, [isManager, activeSegment, activeScope]);
    const [filterStatus, setFilterStatus] = useState<'total' | 'pending' | 'approved' | 'paid' | 'rejected' | 'partiallyPaid'>('total');
    const [reportFilter, setReportFilter] = useState<'weekly' | 'monthly'>('weekly');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [selectedPool, setSelectedPool] = useState<any | null>(null);
    const [selectedSource, setSelectedSource] = useState<any | null>(null);
    const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
    const [selectedReport, setSelectedReport] = useState<any | null>(null);
    const [showRequestDetail, setShowRequestDetail] = useState(false);
    const [requestDetailPresentationKey, setRequestDetailPresentationKey] = useState(0);
    const [showCreateRequest, setShowCreateRequest] = useState(false);
    const [showSwiftUICreateRequest, setShowSwiftUICreateRequest] = useState(false);
    const [createRequestType, setCreateRequestType] = useState<'purchase' | 'reimburse'>('purchase');
    const [createRequestLocked, setCreateRequestLocked] = useState(false);
    const [showAddFunding, setShowAddFunding] = useState(false);
    const [editingSource, setEditingSource] = useState<any | null>(null);
    const [showTopUp, setShowTopUp] = useState(false);
    const [showGenerateReport, setShowGenerateReport] = useState(false);
    const [showReportDetail, setShowReportDetail] = useState(false);
    const [actionModalType, setActionModalType] = useState<FinanceActionType | null>(null);
    const [actionTarget, setActionTarget] = useState<{ item: any; moduleType: 'purchasing' | 'reimbursement' } | null>(null);
    const [editRequest, setEditRequest] = useState<any | null>(null);
    const [showPayModal, setShowPayModal] = useState(false);
    const [payTarget, setPayTarget] = useState<{ item: any; moduleType: 'purchasing' | 'reimbursement' } | null>(null);
    const [filterFundingStatus, setFilterFundingStatus] = useState<'all' | 'active' | 'inactive'>('all');
    const [filterFundingBank, setFilterFundingBank] = useState<string>('ALL');
    const [isFinanceSelectorVisible, setIsFinanceSelectorVisible] = useState<boolean>(false);
    const [selectedSetupModule, setSelectedSetupModule] = useState<FinanceSetupModule>('general_settings');

    useEffect(() => {
        setSelectedRequest(null);
        setSelectedPool(null);
        setSelectedSource(null);
        setSelectedReport(null);
        setShowRequestDetail(false);
        setShowCreateRequest(false);
        setShowSwiftUICreateRequest(false);
        setShowAddFunding(false);
        setEditingSource(null);
        setShowTopUp(false);
        setShowGenerateReport(false);
        setShowReportDetail(false);
        setActionModalType(null);
        setActionTarget(null);
        setEditRequest(null);
        setShowPayModal(false);
        setPayTarget(null);
    }, [user?.id]);

    const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
    const [selectedDepartmentCode, setSelectedDepartmentCode] = useState<string>('ALL');

    const [dateFilterType, setDateFilterType] = useState<'month' | 'all' | 'range'>('month');
    const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
    const [customEndDate, setCustomEndDate] = useState<Date | null>(null);
    const [pickerPhase, setPickerPhase] = useState<'none' | 'start' | 'end'>('none');
    const [tempStartDate, setTempStartDate] = useState<Date | null>(null);

    const [fetchedProjects, setFetchedProjects] = useState<any[]>([]);
    const [fetchedDepartments, setFetchedDepartments] = useState<any[]>([]);

    useEffect(() => {
        fetchProjects()
            .then(data => {
                if (Array.isArray(data)) setFetchedProjects(data);
            })
            .catch(err => console.warn('Failed loading projects for finance filter:', err));

        fetchOrganizationDepartments()
            .then(data => {
                if (Array.isArray(data)) setFetchedDepartments(data);
            })
            .catch(err => console.warn('Failed loading departments for finance filter:', err));
    }, []);

    const departmentFilterItems = useMemo<PickerItem[]>(() => {
        const items: PickerItem[] = [
            { id: 'ALL', label: 'All Dept & Project' },
            { id: 'ALL_DEPTS', label: 'All Departments' },
            { id: 'ALL_PROJECTS', label: 'All Projects' },
        ];
        const addedCodes = new Set<string>(['ALL', 'ALL_DEPTS', 'ALL_PROJECTS']);

        // 1. Organization Departments
        const deptsSource = fetchedDepartments.length > 0 ? fetchedDepartments : DEFAULT_DEPARTMENTS_LIST;
        deptsSource.forEach((d: any) => {
            const code = formatDepartmentCode(d.code, d.name);
            if (!code || addedCodes.has(code)) return;
            addedCodes.add(code);
            const label = d.name ? `${code} · ${d.name}` : code;
            items.push({ id: code, label });
        });

        // 2. Departments from loaded requests
        const allRequests = [...purchasingRequests, ...reimbursementRequests];
        allRequests.forEach(req => {
            const rawCode = req.department?.code || req.department_code;
            const rawName = req.department?.name || req.department_name;
            if (rawCode || rawName) {
                const code = formatDepartmentCode(rawCode, rawName);
                if (code && !addedCodes.has(code)) {
                    addedCodes.add(code);
                    items.push({ id: code, label: rawName ? `${code} · ${rawName}` : code });
                }
            }
        });

        // Keep departments in their configured number/order, then projects by project number.
        const projectStartIndex = items.length;
        const projectNumbers = new Map<string, string>();
        const rememberProjectNumber = (project: any) => {
            if (!project || typeof project !== 'object') return;
            const code = formatDepartmentCode(project.project_code || project.code, project.project_name || project.name);
            const number = project.project_number ?? project.number;
            if (code && number !== undefined && number !== null && String(number).trim()) {
                projectNumbers.set(code, String(number).trim());
            }
        };
        allRequests.forEach(req => rememberProjectNumber(req.project_obj || req.project));
        fetchedProjects.forEach(rememberProjectNumber);

        // 3. Projects from DB
        fetchedProjects.forEach((p: any) => {
            const code = formatDepartmentCode(p.project_code || p.code, p.project_name || p.name);
            if (!code || addedCodes.has(code)) return;
            addedCodes.add(code);
            const pName = p.project_name || p.name;
            const label = pName ? `${code} · ${pName}` : code;
            items.push({ id: code, label });
        });

        // 4. Projects from loaded requests
        allRequests.forEach(req => {
            const projCode = formatDepartmentCode(req.project_obj?.project_code || req.project?.project_code || req.project);
            if (projCode && projCode !== 'UNASSIGNED' && projCode !== 'NA' && !addedCodes.has(projCode)) {
                addedCodes.add(projCode);
                const projName = req.project_obj?.project_name || req.project?.project_name;
                items.push({ id: projCode, label: projName ? `${projCode} · ${projName}` : projCode });
            }
        });

        const projectItems = items.splice(projectStartIndex);
        projectItems.sort((a, b) => {
            const aNumber = projectNumbers.get(a.id);
            const bNumber = projectNumbers.get(b.id);
            if (aNumber && bNumber) {
                const order = aNumber.localeCompare(bNumber, undefined, { numeric: true });
                if (order) return order;
            } else if (aNumber || bNumber) {
                return aNumber ? -1 : 1;
            }
            return a.label.localeCompare(b.label, undefined, { numeric: true });
        });
        return [...items, ...projectItems];
    }, [fetchedDepartments, fetchedProjects, purchasingRequests, reimbursementRequests]);

    const departmentFilterActions = useMemo<ContextMenuAction[]>(() => (
        departmentFilterItems.map(item => ({
            title: item.label,
            selected: item.id === selectedDepartmentCode,
        }))
    ), [departmentFilterItems, selectedDepartmentCode]);

    const filterRequestMatches = useCallback((item: any, filterCode: string) => {
        if (filterCode === 'ALL') return true;

        const rawDept = item.department?.code || item.department_code || item.department?.name;
        const deptCode = formatDepartmentCode(rawDept);
        const projCode = formatDepartmentCode(item.project_obj?.project_code || item.project?.project_code || item.project);
        const isProject = Boolean(
            item.project_id || 
            item.project_obj || 
            (item.project && item.project !== 'Unassigned' && item.project !== 'NA')
        );

        if (filterCode === 'ALL_DEPTS') {
            return Boolean(deptCode) || !isProject;
        }
        if (filterCode === 'ALL_PROJECTS') {
            return isProject || Boolean(projCode);
        }

        return deptCode === filterCode 
            || projCode === filterCode 
            || item.project_id === filterCode 
            || item.project === filterCode;
    }, []);

    const selectedDepartmentDisplayLabel = useMemo(() => {
        if (selectedDepartmentCode === 'ALL') return 'All Dept & Project';
        if (selectedDepartmentCode === 'ALL_DEPTS') return 'All Departments';
        if (selectedDepartmentCode === 'ALL_PROJECTS') return 'All Projects';
        const found = departmentFilterItems.find(it => it.id === selectedDepartmentCode);
        return found ? found.id : selectedDepartmentCode;
    }, [selectedDepartmentCode, departmentFilterItems]);

    useEffect(() => {
        if (params.requestId && params.requestType) {
            const reqId = params.requestId;
            const reqType = params.requestType;
            const list = reqType === 'purchasing' ? teamPurchasing : teamReimbursement;
            const found = list.find(r => r.id === reqId);
            if (found) {
                if (reqType === 'purchasing' && activeSegment !== 'purchasing') {
                    setActiveSegment('purchasing');
                } else if (reqType === 'reimbursement' && activeSegment !== 'reimbursement') {
                    setActiveSegment('reimbursement');
                }
                setSelectedRequest({ ...found, moduleType: reqType });
                setSelectedSource(null);
                setShowCreateRequest(false);
                setEditRequest(null);
                setShowAddFunding(false);
                setRequestDetailPresentationKey(key => key + 1);
                if (!isDesktopWeb) {
                    setShowRequestDetail(true);
                }
                router.setParams({ requestId: undefined, requestType: undefined });
            }
        }
    }, [params.requestId, params.requestType, teamPurchasing, teamReimbursement, activeSegment, isDesktopWeb]);

    // Force team scope for specific modules
    useEffect(() => {
        if (activeSegment === 'petty_cash' || activeSegment === 'funding') {
            setActiveScope('team');
        }
    }, [activeSegment, setActiveScope]);

    const selectedYearMonth = useMemo(() => {
        return `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}`;
    }, [selectedMonth]);

    const matchesDate = (itemDateStr: string) => {
        if (!itemDateStr) return false;
        if (dateFilterType === 'all') return true;
        if (dateFilterType === 'range') {
            if (!customStartDate || !customEndDate) return false;
            const itemTime = new Date(itemDateStr).getTime();
            const startLimit = new Date(customStartDate);
            startLimit.setHours(0, 0, 0, 0);
            const endLimit = new Date(customEndDate);
            endLimit.setHours(23, 59, 59, 999);
            return itemTime >= startLimit.getTime() && itemTime <= endLimit.getTime();
        }
        return itemDateStr.startsWith(selectedYearMonth);
    };

    const paidAmountsByRequestId = useMemo(() => {
        const amounts = new Map<string, number>();
        consolidations.forEach(consolidation => {
            consolidation.requests.forEach(request => {
                amounts.set(request.id, Number(request._paid_amount || 0));
            });
        });
        return amounts;
    }, [consolidations]);

    const filteredPurchasingForStats = useMemo(() => {
        return purchasingRequests.filter(item => {
            const matchesDepartment = filterRequestMatches(item, selectedDepartmentCode);
            return matchesDepartment && matchesDate(item.date);
        }).map(item => ({ ...item, _paid_amount: paidAmountsByRequestId.get(item.id) || 0 }));
    }, [purchasingRequests, dateFilterType, customStartDate, customEndDate, selectedYearMonth, selectedDepartmentCode, paidAmountsByRequestId, filterRequestMatches]);

    const filteredReimbursementForStats = useMemo(() => {
        return reimbursementRequests.filter(item => {
            const matchesDepartment = filterRequestMatches(item, selectedDepartmentCode);
            return matchesDepartment && matchesDate(item.date);
        });
    }, [reimbursementRequests, dateFilterType, customStartDate, customEndDate, selectedYearMonth, selectedDepartmentCode, filterRequestMatches]);

    const purchasingStats = useMemo(() => calculateSummary(filteredPurchasingForStats, 'cart.fill'), [filteredPurchasingForStats]);
    const reimbursementStats = useMemo(() => calculateSummary(filteredReimbursementForStats, 'doc.text.fill'), [filteredReimbursementForStats]);

    const consolidationStats = useMemo(() => {
        const stats = {
            total: { label: 'Consolidations', amount: 0, count: 0, icon: 'shippingbox.fill', color: '#007AFF' },
            draft: { label: 'Draft', amount: 0, count: 0, icon: 'doc.badge.ellipsis', color: '#8E8E93' },
            pending: { label: 'Pending', amount: 0, count: 0, icon: 'clock.fill', color: '#FF9500' },
            approved: { label: 'Approved', amount: 0, count: 0, icon: 'checkmark.shield.fill', color: '#007AFF' },
            paid: { label: 'Paid', amount: 0, count: 0, icon: 'checkmark.seal.fill', color: '#34C759' },
        };
        consolidations.forEach(c => {
            stats.total.count += 1;
            stats.total.amount += c.total_amount || 0;
            const tag = (c.status?.toLowerCase() || 'draft') as keyof typeof stats;
            if (stats[tag]) {
                stats[tag].count += 1;
                stats[tag].amount += c.total_amount || 0;
            }
            if (c.status === 'Partially Paid') {
                stats.paid.count += 1;
                stats.paid.amount += Number(c.total_paid_amount || 0);
            }
        });
        return stats;
    }, [consolidations]);

    const paymentStats = useMemo(() => {
        const stats = {
            total: { label: 'All', amount: 0, count: 0, icon: 'creditcard.fill', color: '#007AFF' },
            pending: { label: 'Pending', amount: 0, count: 0, icon: 'hourglass', color: '#FF9500' },
            partiallyPaid: { label: 'Partially Paid', amount: 0, count: 0, icon: 'clock.fill', color: '#5856D6' },
            paid: { label: 'Paid', amount: 0, count: 0, icon: 'checkmark.seal.fill', color: '#34C759' },
        };
        const payableConsolidations = consolidations.filter(c =>
            c.status === 'Approved' || c.status === 'Paying' || c.status === 'Partially Paid' || c.status === 'Paid'
        );
        payableConsolidations.forEach(c => {
            const progress = getConsolidationPaymentProgress(c);
            stats.total.count += 1;
            stats.total.amount += progress.total;
            if (progress.remaining > 0) {
                stats.pending.count += 1;
                stats.pending.amount += progress.remaining;
            }
            if (progress.isPartiallyPaid) {
                stats.partiallyPaid.count += 1;
                stats.partiallyPaid.amount += progress.paid;
            }
            if (progress.hasPayment) {
                stats.paid.count += 1;
                stats.paid.amount += progress.paid;
            }
        });
        return stats;
    }, [consolidations]);

    const pulseData = useMemo(() => {
        const totalPaid = purchasingStats.paid.amount + reimbursementStats.paid.amount;
        const currentBalance = fundingSources.reduce((sum, source) => sum + (source.balance || 0), 0);

        const approvedPurchases = purchasingRequests
            .filter(r => r.statusTag === 'approved')
            .reduce((sum, r) => sum + (r.amount || 0), 0);
        const approvedReimbursements = reimbursementRequests
            .filter(r => r.statusTag === 'approved')
            .reduce((sum, r) => sum + (r.amount || 0), 0);
        const approved = approvedPurchases + approvedReimbursements;

        const pendingPurchases = purchasingRequests
            .filter(r => r.statusTag === 'pending')
            .reduce((sum, r) => sum + (r.amount || 0), 0);
        const pendingReimbursements = reimbursementRequests
            .filter(r => r.statusTag === 'pending')
            .reduce((sum, r) => sum + (r.amount || 0), 0);
        const pendingMoreThan3d = pendingPurchases + pendingReimbursements;

        // Generate daily spending for the last 7 days of paid items
        const paidRequests = [
            ...purchasingRequests.filter(r => r.statusTag === 'paid'),
            ...reimbursementRequests.filter(r => r.statusTag === 'paid')
        ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        let latestDate = new Date();
        if (paidRequests.length > 0) {
            latestDate = new Date(paidRequests[paidRequests.length - 1].date);
        }

        const dailySpending = Array.from({ length: 7 }).map((_, idx) => {
            const d = new Date(latestDate);
            d.setDate(d.getDate() - (6 - idx));
            const dateString = d.toISOString().split('T')[0];

            return paidRequests
                .filter(r => r.date === dateString)
                .reduce((sum, r) => sum + (r.amount || 0), 0);
        });

        const hasSpending = dailySpending.some(val => val > 0);

        const dates = Array.from({ length: 7 }).map((_, idx) => {
            const d = new Date(latestDate);
            d.setDate(d.getDate() - (6 - idx));
            return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase();
        });

        return {
            dailySpending: hasSpending ? dailySpending : [],
            rollingAvg: hasSpending ? dailySpending.reduce((a, b) => a + b, 0) / 7 : 0,
            approved,
            pendingMoreThan3d,
            paid: totalPaid,
            currentBalance,
            dates
        };
    }, [purchasingRequests, reimbursementRequests, fundingSources, purchasingStats, reimbursementStats]);

    const matchedTransactions = useMemo(() => {
        if (!selectedSource) return [];

        const matchedPurchasing = purchasingRequests
            .filter(r => r.source_of_fund_id === selectedSource.id && r.statusTag === 'paid')
            .map(r => ({
                id: r.id,
                ref: r.ref,
                title: r.title || r.description || 'Purchase Request',
                amount: r.amount,
                date: r.payment_date || r.date || r.created_at,
                type: 'out' as const
            }));

        const matchedReimburse = reimbursementRequests
            .filter(r => r.source_of_fund_id === selectedSource.id && r.statusTag === 'paid')
            .map(r => ({
                id: r.id,
                ref: r.ref,
                title: r.title || r.description || 'Reimbursement Request',
                amount: r.amount,
                date: r.payment_date || r.date || r.created_at,
                type: 'out' as const
            }));

        return [...matchedPurchasing, ...matchedReimburse].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [selectedSource, purchasingRequests, reimbursementRequests]);

    const getAddAction = (segment: string) => {
        switch (segment) {
            case 'purchasing': return { title: 'Add Purchase', action: () => { setCreateRequestType('purchase'); setCreateRequestLocked(true); setShowCreateRequest(true); } };
            case 'reimbursement': return { title: 'Add Claim', action: () => { setCreateRequestType('reimburse'); setCreateRequestLocked(true); setShowCreateRequest(true); } };
            case 'petty_cash': return { title: 'Add Transaction', action: () => Alert.alert('Add Petty Cash Transaction') };
            case 'funding': return { title: 'Add Source', action: () => setShowAddFunding(true) };
            case 'reports': return null; // Parked
            case 'overview': return { title: 'Add Record', action: () => { setCreateRequestType('purchase'); setCreateRequestLocked(false); setShowCreateRequest(true); } };
            default: return null;
        }
    };

    const addAction = useMemo(() => getAddAction(activeSegment), [activeSegment]);

    const showFinanceActionSheet = () => {
        const options = ['Add Purchase Request', 'Add Reimbursement Claim', 'Add Funding Source', 'Cancel'];
        const cancelButtonIndex = 3;

        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options,
                    cancelButtonIndex,
                    title: 'Finance Actions',
                },
                (buttonIndex) => {
                    if (buttonIndex === 0) {
                        setCreateRequestType('purchase');
                        setCreateRequestLocked(true);
                        setShowCreateRequest(true);
                    } else if (buttonIndex === 1) {
                        setCreateRequestType('reimburse');
                        setCreateRequestLocked(true);
                        setShowCreateRequest(true);
                    } else if (buttonIndex === 2) {
                        setShowAddFunding(true);
                    }
                }
            );
        } else {
            Alert.alert(
                'Finance Actions',
                'Choose an action to perform:',
                [
                    { text: 'Add Purchase Request', onPress: () => { setCreateRequestType('purchase'); setCreateRequestLocked(true); setShowCreateRequest(true); } },
                    { text: 'Add Reimbursement Claim', onPress: () => { setCreateRequestType('reimburse'); setCreateRequestLocked(true); setShowCreateRequest(true); } },
                    { text: 'Add Funding Source', onPress: () => setShowAddFunding(true) },
                    { text: 'Cancel', style: 'cancel' }
                ]
            );
        }
    };

    useEffect(() => {
        if (isFocused) {
            setContextAction({
                label: 'Add',
                icon: 'add-outline',
                sfIcon: 'plus',
                action: showFinanceActionSheet,
                options: [
                    {
                        label: 'Add Purchase Request',
                        icon: 'cart-outline',
                        sfIcon: 'cart.badge.plus',
                        description: 'Submit a new procurement or purchasing request',
                        action: () => {
                            setCreateRequestType('purchase');
                            setCreateRequestLocked(true);
                            setShowCreateRequest(true);
                        }
                    },
                    {
                        label: 'Add Reimbursement Claim',
                        icon: 'document-text-outline',
                        sfIcon: 'doc.badge.plus',
                        description: 'Claim back business expenses',
                        action: () => {
                            setCreateRequestType('reimburse');
                            setCreateRequestLocked(true);
                            setShowCreateRequest(true);
                        }
                    },
                    // SwiftUI BottomSheet test option removed - requires native build with @expo/ui
                    {
                        label: 'Add Funding Source',
                        icon: 'card-outline',
                        sfIcon: 'creditcard.and.123',
                        description: 'Register a new project budget or funding source',
                        action: () => setShowAddFunding(true)
                    }
                    // Report option parked for future release
                ]
            });
        }
    }, [isFocused, setContextAction, setShowAddFunding, setShowGenerateReport, setShowCreateRequest, setCreateRequestLocked, setShowSwiftUICreateRequest]);

    const financeAddMenuActions: ContextMenuAction[] = useMemo(() => {
        const list: ContextMenuAction[] = [
            { title: 'Add Purchase Request', systemIcon: 'cart.badge.plus' },
            { title: 'Add Reimbursement Claim', systemIcon: 'doc.badge.plus' },
        ];
        if (activeScope === 'team' && isManager) {
            list.push({ title: 'Add Funding Source', systemIcon: 'creditcard.and.123' });
        }
        return list;
    }, [isManager, activeScope]);

    const handleFinanceAddMenuPress = (e: { nativeEvent: { index: number; name: string } }) => {
        const name = e.nativeEvent.name || '';
        setSelectedRequest(null);
        setSelectedSource(null);
        setEditRequest(null);
        if (name === 'Add Purchase Request' || name === 'Purchase Request') {
            setCreateRequestType('purchase');
            setCreateRequestLocked(true);
            setShowCreateRequest(true);
        } else if (name === 'Add Reimbursement Claim' || name === 'Reimbursement Claim') {
            setCreateRequestType('reimburse');
            setCreateRequestLocked(true);
            setShowCreateRequest(true);
        } else if (name === 'Add Funding Source' || name === 'Funding Source') {
            setShowAddFunding(true);
        }
    };

    const actions = useMemo(() => {
        if (!isAuthenticated) return [];
        const baseActions: HeaderToolbarAction[] = [];

        // 1. Scope toggle (Team/Personal)
        const hasScopeToggle = hasTeamAccess && activeSegment !== 'petty_cash' && activeSegment !== 'funding';
        if (hasScopeToggle) {
            baseActions.push({
                id: 'scope',
                icon: (activeScope === 'me' ? 'person' : 'people') as any,
                image: activeScope === 'me' ? 'person.fill' : 'person.2.fill',
                tintColor: textColor,
                onPress: () => {
                    const nextScope = activeScope === 'me' ? 'team' : 'me';
                    if (nextScope === 'me' && (activeSegment === 'setup' || activeSegment === 'funding' || activeSegment === 'petty_cash')) {
                        setActiveSegment('overview');
                    }
                    setActiveScope(nextScope);
                },
                title: activeScope === 'me' ? 'Personal View' : 'Team View'
            });
        }

        // 2. Add (+) Button for ALL Finance Tabs
        if (activeSegment === 'overview') {
            baseActions.push({
                id: 'add',
                icon: 'add',
                image: 'plus',
                isPrimary: true,
                tintColor: '#159957',
                buttonStyle: { backgroundColor: '#159957' },
                menuActions: financeAddMenuActions,
                onMenuPress: handleFinanceAddMenuPress,
                onPress: () => setIsFinanceSelectorVisible(true),
                title: 'Add Record'
            });
        } else if (activeSegment === 'purchasing') {
            baseActions.push({
                id: 'add',
                icon: 'add',
                image: 'plus',
                isPrimary: true,
                tintColor: '#159957',
                buttonStyle: { backgroundColor: '#159957' },
                menuActions: financeAddMenuActions,
                onMenuPress: handleFinanceAddMenuPress,
                onPress: () => {
                    setCreateRequestType('purchase');
                    setCreateRequestLocked(true);
                    setShowCreateRequest(true);
                },
                title: 'Add Purchase'
            });
        } else if (activeSegment === 'reimbursement') {
            baseActions.push({
                id: 'add',
                icon: 'add',
                image: 'plus',
                isPrimary: true,
                tintColor: '#159957',
                buttonStyle: { backgroundColor: '#159957' },
                menuActions: financeAddMenuActions,
                onMenuPress: handleFinanceAddMenuPress,
                onPress: () => {
                    setCreateRequestType('reimburse');
                    setCreateRequestLocked(true);
                    setShowCreateRequest(true);
                },
                title: 'Add Claim'
            });
        } else if (activeSegment === 'funding') {
            baseActions.push({
                id: 'add',
                icon: 'add',
                image: 'plus',
                isPrimary: true,
                tintColor: '#159957',
                buttonStyle: { backgroundColor: '#159957' },
                menuActions: financeAddMenuActions,
                onMenuPress: handleFinanceAddMenuPress,
                onPress: () => setShowAddFunding(true),
                title: 'Add Source'
            });
        }

        return baseActions;
    }, [isAuthenticated, activeSegment, activeScope, textColor, isManager, hasTeamAccess, financeAddMenuActions]);

    const EmptyState = ({ segment, filter }: { segment: string, filter: string }) => {
        const getEmptyCopy = () => {
            if (filter === 'total') return `No ${segment} records found yet. Start by adding one!`;
            if (filter === 'pending') return `Great job! No pending ${segment} requests to review.`;
            if (filter === 'approved') return `No approved ${segment} items waiting for next steps.`;
            if (filter === 'paid') return `No payment history found for ${segment} in this period.`;
            if (filter === 'rejected') return `Clean slate! No rejected ${segment} items found.`;
            return 'No data available.';
        };

        const getEmptyIcon = () => {
            if (filter === 'pending') return 'checkmark.seal.fill';
            if (filter === 'rejected') return 'leaf.fill';
            return 'tray.fill';
        };

        return (
            <GlassView intensity={isDark ? 5 : 20} style={s.emptyState}>
                <PlatformIcon
                    name={getEmptyIcon()}
                    size={32}
                    tintColor={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}
                />
                <Text style={[s.emptyText, { color: isDark ? '#A1A1A6' : '#8E8E93' }]}>{getEmptyCopy()}</Text>
            </GlassView>
        );
    };

    const getActionButtons = (item: any) => {
        if (!item) return [];
        const status = item.status || '';
        const s_status = status.toLowerCase();
        const actionsArr = [];
        const isOwner = item.created_by === user?.id;
        const canManageTeam = hasTeamAccess && activeScope === 'team';

        // Non-managers / non-approvers cannot perform actions on other people's requests
        if (!hasTeamAccess && !isOwner) {
            return [];
        }

        // 1. Delete option
        if (s_status !== 'paid') {
            // Staff can only delete their own drafts or rejected/need revision/revision/revised requests
            if (canManageTeam || s_status === 'draft' || s_status === 'rejected' || s_status === 'need revision' || s_status === 'revision' || s_status === 'revised') {
                actionsArr.push({ id: 'delete', label: 'Delete', color: '#FF3B30', type: 'secondary', icon: 'trash' });
            }
        }

        // 2. Draft actions
        if (s_status === 'draft') {
            actionsArr.push({ id: 'edit', label: 'Edit', color: '#007AFF', type: 'secondary', icon: 'pencil' });
            actionsArr.push({ id: 'submit', label: 'Submit', color: '#34C759', type: 'primary', icon: 'paperplane.fill' });
        }

        // 3. Submitted / Pending actions
        else if (s_status === 'submitted' || s_status === 'pending') {
            if (canManageTeam) {
                // Manager can reject, revise, approve
                actionsArr.push({ id: 'reject', label: 'Reject', color: '#FF3B30', type: 'secondary', icon: 'xmark.circle' });
                actionsArr.push({ id: 'revision', label: 'Revise', color: '#FF9500', type: 'secondary', icon: 'arrow.uturn.backward' });
                actionsArr.push({ id: 'approve', label: 'Approve', color: '#34C759', type: 'primary', icon: 'checkmark.circle.fill' });
            } else {
                // Owner staff can edit their submitted request if needed
                actionsArr.push({ id: 'cancel_submit', label: 'Withdraw', color: '#8E8E93', type: 'secondary', icon: 'arrow.uturn.backward' });
                actionsArr.push({ id: 'edit', label: 'Edit', color: '#007AFF', type: 'secondary', icon: 'pencil' });
            }
        }

        // 4. Approved actions
        else if (['approved', 'partially paid', 'partially_paid', 'paying'].includes(s_status)) {
            if (canManageTeam) {
                actionsArr.push({ id: 'edit', label: 'Edit', color: '#007AFF', type: 'secondary', icon: 'pencil' });
                actionsArr.push({ id: 'revision', label: 'Revise', color: '#FF9500', type: 'secondary', icon: 'arrow.uturn.backward' });
                actionsArr.push({ id: 'pay', label: 'Pay Now', color: '#007AFF', type: 'primary', icon: 'creditcard.fill' });
            }
        }

        // 5. Rejected / Revision actions
        else if (s_status === 'rejected' || s_status === 'need revision' || s_status === 'revision' || s_status === 'revised') {
            actionsArr.push({ id: 'edit', label: 'Edit', color: '#FF9500', type: 'secondary', icon: 'pencil' });
            actionsArr.push({ id: 'submit', label: 'Resubmit', color: '#34C759', type: 'primary', icon: 'paperplane.fill' });
        }

        return actionsArr;
    };

    const openFinanceAction = (actionId: string, item: any, moduleType: 'purchasing' | 'reimbursement') => {
        if (actionId === 'edit' || actionId === 'admin_edit') {
            if (actionId === 'admin_edit' && !isFinanceSuperadmin(tenantRole || profile?.role)) return;
            setEditRequest({ ...item, moduleType, adminEdit: actionId === 'admin_edit' });
            setCreateRequestType(moduleType === 'purchasing' ? 'purchase' : 'reimburse');
            setCreateRequestLocked(true);
            setShowCreateRequest(true);
            setShowRequestDetail(false);
            setSelectedRequest(null);
            setExpandedId(null);
            return;
        }

        if (actionId === 'pay') {
            setPayTarget({ item, moduleType });
            setShowPayModal(true);
            return;
        }

        const modalTypeMap: Record<string, FinanceActionType> = {
            approve: 'approve',
            reject: 'reject',
            revision: 'revision',
            delete: 'delete',
            submit: 'submit',
            cancel_submit: 'cancelSubmit',
        };

        const modalType = modalTypeMap[actionId];
        if (!modalType) return;

        setActionTarget({ item, moduleType });
        setActionModalType(modalType);
    };

    const handlePayConfirm = useCallback(async (payload: {
        source_of_fund_id: string;
        payment_date: string;
        payment_proof_url?: string;
        amount: number;
    }) => {
        if (!payTarget) return;

        const { item, moduleType } = payTarget;

        // Close detail drawer and pay modal immediately to provide instant snappy UI responsiveness
        setExpandedId(null);
        setShowRequestDetail(false);
        setSelectedRequest(null);
        setShowPayModal(false);
        setPayTarget(null);

        try {
            await payRequest(item.id, moduleType, {
                ...payload,
                ref: item.ref,
            });
            Alert.alert('Success', 'Payment successfully processed.');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to process payment.');
        }
    }, [payTarget, payRequest]);

    const handleFinanceActionConfirm = useCallback(async (payload: { reason?: string; approvedAmount?: number }) => {
        if (!actionTarget || !actionModalType) return;

        const { item, moduleType } = actionTarget;
        const actionType = actionModalType;

        // Close detail drawer immediately to provide instant snappy UI responsiveness
        setExpandedId(null);
        setShowRequestDetail(false);
        setSelectedRequest(null);

        try {
            if (actionType === 'delete') {
                await deleteRequest(item.id, moduleType);
                Alert.alert('Success', 'Request successfully deleted.');
                return;
            }

            const statusMap: Record<FinanceActionType, { status: string; statusTag: string; friendlyName: string; extra?: Record<string, any> }> = {
                approve: {
                    status: 'Approved',
                    statusTag: 'approved',
                    friendlyName: 'approved',
                    extra: { approved_amount: moduleType === 'reimbursement' ? item.amount : (payload.approvedAmount ?? item.amount) },
                },
                reject: {
                    status: 'Rejected',
                    statusTag: 'rejected',
                    friendlyName: 'rejected',
                    extra: { rejection_reason: payload.reason },
                },
                revision: {
                    status: 'Need Revision',
                    statusTag: 'revision',
                    friendlyName: 'sent back for revision',
                    extra: { revision_reason: payload.reason },
                },
                submit: {
                    status: 'Pending',
                    statusTag: 'pending',
                    friendlyName: 'submitted',
                },
                cancelSubmit: {
                    status: 'Draft',
                    statusTag: 'draft',
                    friendlyName: 'returned to draft',
                },
                delete: { status: 'Draft', statusTag: 'draft', friendlyName: 'deleted' },
                pay: { status: 'Paid', statusTag: 'paid', friendlyName: 'marked as paid' },
            };

            const mapped = statusMap[actionType];
            await updateRequestStatus(item.id, moduleType, mapped.status, mapped.statusTag, mapped.extra);
            Alert.alert('Success', `Request successfully ${mapped.friendlyName}.`);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to perform action.');
        }
    }, [actionTarget, actionModalType, deleteRequest, updateRequestStatus]);

    const renderActivityItem = (item: any, moduleType: 'purchasing' | 'reimbursement', showActions = true) => {
        const availableActions = getActionButtons(item);
        const actionsList = showActions ? availableActions.filter(action => action.id !== 'delete') : [];
        const contextMenuActions: ContextMenuAction[] = availableActions.map(action => ({
            title: action.label,
            systemIcon: action.icon,
            destructive: ['delete', 'reject', 'cancel_submit'].includes(action.id),
        }));
        const isExpanded = expandedId === item.id;

        const isEligibleForConsolidation = moduleType === 'purchasing' && isRequestEligibleForConsolidation(item, undefined, consolidations);
        const isSelectedForConsolidation = selectedForConsolidationIds.includes(item.id);

        const isCurrentlySelected = isDesktopWeb && selectedRequest?.id === item.id && selectedRequest?.moduleType === moduleType;

        const handlePress = () => {
            if (isConsolidationSelectionMode && moduleType === 'purchasing') {
                if (isEligibleForConsolidation) {
                    if (isSelectedForConsolidation) {
                        setSelectedForConsolidationIds(selectedForConsolidationIds.filter(id => id !== item.id));
                    } else {
                        setSelectedForConsolidationIds([...selectedForConsolidationIds, item.id]);
                    }
                }
                return;
            }
            if (isCurrentlySelected) {
                setSelectedRequest(null);
                setExpandedId(null);
                return;
            }
            if (showActions) {
                setExpandedId(item.id);
            }
            setSelectedRequest({ ...item, moduleType });
            setSelectedSource(null);
            setShowCreateRequest(false);
            setEditRequest(null);
            setShowAddFunding(false);
            setRequestDetailPresentationKey(key => key + 1);
            if (!isDesktopWeb) {
                setShowRequestDetail(true);
            }
        };

        const priority = item.priority?.toLowerCase();

        const cardBg = isCurrentlySelected
            ? (isDark ? 'rgba(0, 122, 255, 0.15)' : 'rgba(0, 122, 255, 0.08)')
            : priority === 'urgent'
                ? (isDark ? 'rgba(255, 59, 48, 0.18)' : '#FFF5F5')
                : priority === 'high'
                    ? (isDark ? 'rgba(255, 149, 0, 0.18)' : '#FFF9F0')
                    : (isDark ? '#1C1C1E' : '#FFFFFF');

        const cardBorderColor = isCurrentlySelected
            ? '#007AFF'
            : isSelectedForConsolidation
                ? '#007AFF'
                : 'transparent';

        const cardBorderWidth = (isCurrentlySelected || isSelectedForConsolidation) ? 1.5 : 0;

        return (
            <ContextMenu
                actions={contextMenuActions}
                disabled={!contextMenuActions.length}
                onPress={(event) => {
                    const action = availableActions[event.nativeEvent.index];
                    if (action) openFinanceAction(action.id, item, moduleType);
                }}
            >
            <BouncyFinanceCard
                style={[
                    s.activityCard,
                    {
                        backgroundColor: cardBg,
                        borderColor: cardBorderColor,
                        borderWidth: cardBorderWidth,
                    }
                ]}
            >
                <TouchableOpacity
                    onPress={handlePress}
                    style={s.activityTouchable}
                    activeOpacity={0.7}
                >
                    <View style={s.itemRow}>
                        {isConsolidationSelectionMode && moduleType === 'purchasing' && (
                            <View style={{ marginRight: 12, opacity: isEligibleForConsolidation ? 1 : 0.35 }}>
                                <PlatformIcon
                                    name={isSelectedForConsolidation ? "checkmark.circle.fill" : "checkmark.circle"}
                                    size={22}
                                    tintColor={isSelectedForConsolidation ? "#007AFF" : (isDark ? 'rgba(255, 255, 255, 0.35)' : 'rgba(0, 0, 0, 0.25)')}
                                />
                            </View>
                        )}
                        <View style={s.itemLeftCol}>
                            <Text style={[s.itemTitle, { color: textColor }]} numberOfLines={1}>{item.title || item.description || 'Request'}</Text>
                            <View style={s.itemMetaRow}>
                                {Boolean(item.department?.code || item.department_code) && (
                                    <View style={s.projectBadge}>
                                        <Text style={s.projectBadgeText}>{formatDepartmentCode(item.department?.code || item.department_code)}</Text>
                                    </View>
                                )}
                                {Boolean(item.project_obj?.project_code || (item.project && item.project !== 'Unassigned' && item.project !== (item.department?.code || item.department_code))) && (
                                    <View style={[s.projectBadge, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' }]}>
                                        <Text style={[s.projectBadgeText, { color: textColor }]}>
                                            {item.project_obj?.project_code || item.project}
                                        </Text>
                                    </View>
                                )}
                                {!item.department?.code && !item.department_code && !item.project_obj?.project_code && (!item.project || item.project === 'Unassigned') && (
                                    <View style={s.projectBadge}>
                                        <Text style={s.projectBadgeText}>GEN</Text>
                                    </View>
                                )}
                                <Text style={s.itemMetaText} numberOfLines={1}>
                                    {item.cardRef || item.shortRef || item.ref} • {formatCardDate(item.date)}
                                </Text>
                            </View>
                        </View>
                        <View style={s.itemRightCol}>
                            <Text style={[s.itemAmount, { color: textColor }]}>{typeof item.amount === 'number' ? formatCurrency(item.amount) : item.amount}</Text>
                            <Text style={[s.itemStatus, { color: getFinanceStatusColor(item.status, isDark) }]}>{item.status}</Text>
                        </View>
                    </View>
                </TouchableOpacity>
                {isExpanded && actionsList.length > 0 && (
                    <View style={{ paddingHorizontal: 16, paddingBottom: 16, paddingTop: 4 }}>
                        <View style={s.actionDock}>
                            {actionsList.map((action, idx) => {
                                const isPrimary = action.type === 'primary';
                                const showLabel = isPrimary || actionsList.length === 2;
                                return (
                                    <TouchableOpacity
                                        key={idx}
                                        style={[
                                            showLabel ? s.actionPill : s.actionCircle,
                                            { backgroundColor: isDark ? `${action.color}20` : `${action.color}12` },
                                            actionsList.length === 2 && { flex: 1 },
                                            actionsList.length !== 2 && idx === actionsList.length - 1 && { flex: 1 },
                                        ]}
                                        onPress={() => openFinanceAction(action.id, item, moduleType)}
                                    >
                                        <PlatformIcon name={action.icon as any} size={showLabel ? 16 : 18} tintColor={action.color} />
                                        {showLabel && <Text style={[s.actionButtonText, { color: action.color }]} numberOfLines={1}>{action.label}</Text>}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                )}
            </BouncyFinanceCard>
            </ContextMenu>
        );
    };

    const renderFilterCards = (summaryData: any) => {
        if (!summaryData) return null;
        const keys = Object.keys(summaryData);
        return (
            <ScrollView
                horizontal showsHorizontalScrollIndicator={false} style={s.filterCardsScroll} contentContainerStyle={s.filterCardsContent}>
                {keys.map((key) => {
                    const card = summaryData[key];
                    if (!card) return null;
                    const isSelected = filterStatus === key;
                    return (
                        <FinanceSummaryCard
                            key={key}
                            icon={card.icon as any}
                            iconColor={card.color}
                            value={(card.count ?? 0).toString()}
                            label={card.label}
                            subValue={formatCurrency(card.amount ?? 0)}
                            style={{
                                width: 150,
                                marginRight: 12,
                                marginBottom: 0,
                                backgroundColor: isSelected
                                    ? (isDark ? `${card.color}45` : `${card.color}25`)
                                    : (isDark ? '#1C1C1E' : '#FFFFFF'),
                                borderColor: 'transparent',
                                borderWidth: 0,
                            }}
                            onPress={() => setFilterStatus(key as any)}
                        />
                    );
                })}
            </ScrollView>
        );
    };

    const handlePrevMonth = () => {
        setSelectedMonth(prev => {
            const d = new Date(prev);
            d.setMonth(d.getMonth() - 1);
            return d;
        });
    };

    const handleNextMonth = () => {
        setSelectedMonth(prev => {
            const d = new Date(prev);
            d.setMonth(d.getMonth() + 1);
            return d;
        });
    };

    const formatCardDate = (dateStr: string) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;

        const currentYear = new Date().getFullYear();
        const day = d.getDate();
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = months[d.getMonth()];

        if (d.getFullYear() === currentYear) {
            return `${day} ${month}`;
        } else {
            return `${day} ${month} ${d.getFullYear()}`;
        }
    };

    const formatMonthYear = (date: Date) => {
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    };

    const formatRangeText = (start: Date, end: Date) => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const startDay = start.getDate();
        const startMonth = months[start.getMonth()];
        const startYear = start.getFullYear();

        const endDay = end.getDate();
        const endMonth = months[end.getMonth()];
        const endYear = end.getFullYear();

        const currentYear = new Date().getFullYear();
        const showYear = startYear !== currentYear || endYear !== currentYear;

        if (start.toDateString() === end.toDateString()) {
            return showYear ? `${startDay} ${startMonth} ${startYear}` : `${startDay} ${startMonth}`;
        }

        if (startYear === endYear) {
            if (start.getMonth() === end.getMonth()) {
                return showYear
                    ? `${startDay} - ${endDay} ${startMonth} ${startYear}`
                    : `${startDay} - ${endDay} ${startMonth}`;
            } else {
                return showYear
                    ? `${startDay} ${startMonth} - ${endDay} ${endMonth} ${startYear}`
                    : `${startDay} ${startMonth} - ${endDay} ${endMonth}`;
            }
        } else {
            return `${startDay} ${startMonth} ${startYear} - ${endDay} ${endMonth} ${endYear}`;
        }
    };

    const showDateFilterActionSheet = () => {
        const options = ['This Month', 'All Time', 'Select Custom Range...', 'Cancel'];
        const cancelButtonIndex = 3;

        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options,
                    cancelButtonIndex,
                    title: 'Filter Date',
                    userInterfaceStyle: isDark ? 'dark' : 'light',
                },
                (buttonIndex) => {
                    if (buttonIndex === 0) {
                        setDateFilterType('month');
                    } else if (buttonIndex === 1) {
                        setDateFilterType('all');
                    } else if (buttonIndex === 2) {
                        setPickerPhase('start');
                    }
                }
            );
        } else {
            Alert.alert(
                'Filter Date',
                'Choose a date filter option:',
                [
                    { text: 'This Month', onPress: () => setDateFilterType('month') },
                    { text: 'All Time', onPress: () => setDateFilterType('all') },
                    { text: 'Select Custom Range...', onPress: () => setPickerPhase('start') },
                    { text: 'Cancel', style: 'cancel' }
                ]
            );
        }
    };

    const renderControlRow = () => {
        return (
            <View style={{ marginBottom: 12 }}>
                <View style={s.controlRowContainer}>
                    <View style={[
                        s.monthSelectorPill,
                        {
                            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#FFFFFF',
                            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                        }
                    ]}>
                        <TouchableOpacity
                            onPress={handlePrevMonth}
                            style={[s.chevronTouch, dateFilterType !== 'month' && { opacity: 0 }]}
                            disabled={dateFilterType !== 'month'}
                        >
                            <PlatformIcon name="chevron.left" size={14} tintColor={textColor} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={showDateFilterActionSheet}
                            style={[s.controlPillCenter, { flex: 1, height: '100%' }]}
                        >
                            <Text style={[s.controlPillText, { color: textColor }]} numberOfLines={1}>
                                {dateFilterType === 'month'
                                    ? formatMonthYear(selectedMonth)
                                    : dateFilterType === 'all'
                                        ? 'All Time'
                                        : customStartDate && customEndDate
                                            ? formatRangeText(customStartDate, customEndDate)
                                            : 'Select Range'}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleNextMonth}
                            style={[s.chevronTouch, dateFilterType !== 'month' && { opacity: 0 }]}
                            disabled={dateFilterType !== 'month'}
                        >
                            <PlatformIcon name="chevron.right" size={14} tintColor={textColor} />
                        </TouchableOpacity>
                    </View>

                    <ContextMenu
                        actions={departmentFilterActions}
                        dropdownMenuMode={true}
                        style={{
                            flex: 1,
                            height: 42,
                            marginRight: 8,
                        }}
                        onPress={(event) => {
                            const item = departmentFilterItems[event.nativeEvent.index]
                                || departmentFilterItems.find(it => it.label === event.nativeEvent.name);
                            if (item) setSelectedDepartmentCode(item.id);
                        }}
                    >
                        <View
                            style={[
                                s.projectSelectPill,
                                {
                                    flex: 1,
                                    width: '100%',
                                    height: 42,
                                    minHeight: 42,
                                    maxHeight: 42,
                                    marginRight: 0,
                                    justifyContent: 'space-between',
                                    paddingHorizontal: 14,
                                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#FFFFFF',
                                    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                                }
                            ]}
                        >
                            <Text style={[s.controlPillText, { color: textColor, textAlign: 'left', flex: 1 }]} numberOfLines={1}>
                                {selectedDepartmentDisplayLabel}
                            </Text>
                            <PlatformIcon name="chevron.down" size={12} tintColor={textColor} style={{ marginLeft: 6 }} />
                        </View>
                    </ContextMenu>

                    <TouchableOpacity
                        onPress={() => setIsSearchVisible(!isSearchVisible)}
                        style={[
                            s.searchButtonPill,
                            {
                                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#FFFFFF',
                                borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                            }
                        ]}
                    >
                        <PlatformIcon name="magnifyingglass" size={16} tintColor={textColor} />
                    </TouchableOpacity>
                </View>

                {isSearchVisible && (
                    <Animated.View
                        entering={FadeInUp}
                        style={[
                            s.inlineSearchContainer,
                            {
                                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                            }
                        ]}
                    >
                        <PlatformIcon name="magnifyingglass" size={16} tintColor={subtextColor} style={{ marginRight: 8 }} />
                        <TextInput
                            placeholder="Search requests..."
                            placeholderTextColor={isDark ? '#666' : '#999'}
                            style={[s.inlineSearchInput, { color: textColor }]}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            returnKeyType="search"
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4, marginRight: 8 }}>
                                <PlatformIcon name="xmark.circle.fill" size={16} tintColor={subtextColor} />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            onPress={() => {
                                setIsSearchVisible(false);
                                setSearchQuery('');
                            }}
                            style={s.inlineCancelButton}
                        >
                            <Text style={{ color: subtextColor, fontWeight: '600', fontSize: 14 }}>Cancel</Text>
                        </TouchableOpacity>
                    </Animated.View>
                )}
            </View>
        );
    };



    const renderPettyCash = (pools: any[]) => {
        const pcStats = calculatePettyCashSummary(pools);
        const summaryCards = [
            { id: 'total', value: pcStats.total.value.toString(), label: 'Active Pools', sub: formatCurrency(pcStats.balance.value), icon: pcStats.total.icon, color: pcStats.total.color },
            { id: 'low', value: pcStats.low.value.toString(), label: 'Under Limit', sub: 'Requiring top-up', icon: pcStats.low.icon, color: pcStats.low.color },
        ];

        return (
            <View style={s.subModuleContainer}>
                <View style={s.grid}>
                    {summaryCards.map((card) => (
                        <FinanceSummaryCard
                            key={card.id}
                            icon={card.icon as any}
                            iconColor={card.color}
                            value={card.value}
                            label={card.label}
                            subValue={card.sub}
                        />
                    ))}
                </View>

                <View style={s.activityList}>
                    {pools.map((pool) => {
                        const isLow = pool.balance < pool.limit;
                        const isNegative = pool.balance < 0;

                        return (
                            <GlassView
                                key={pool.id}
                                intensity={isDark ? 10 : 80}
                                style={[
                                    s.poolCard,
                                    isLow && s.poolCardLow,
                                    isNegative && s.poolCardNegative,
                                    {
                                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255,255,255,0.7)',
                                        borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                                        borderWidth: 1
                                    }
                                ]}
                            >
                                <TouchableOpacity
                                    style={s.poolHeader}
                                    onPress={() => setSelectedPool(pool)}
                                    activeOpacity={0.7}
                                >
                                    <View style={s.poolInfo}>
                                        <View style={s.poolProjectInfo}>
                                            <View style={s.poolBadge}>
                                                <Text style={s.poolBadgeText}>{pool.projectId}</Text>
                                            </View>
                                            <Text style={[s.poolName, { color: textColor }]} numberOfLines={1}>{pool.projectName}</Text>
                                        </View>
                                        <Text style={[s.poolBalance, { color: isNegative ? '#FF3B30' : (isLow ? '#FF9500' : '#34C759') }]}>
                                            {formatCurrency(pool.balance)}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            </GlassView>
                        );
                    })}
                </View>

                <Modal
                    visible={!!selectedPool}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => setSelectedPool(null)}
                >
                    <View style={s.modalOverlay}>
                        <GlassView intensity={60} style={s.modalContent}>
                            <View style={s.modalHeader}>
                                <View>
                                    <View style={s.modalBadge}>
                                        <Text style={s.modalBadgeText}>{selectedPool?.projectId}</Text>
                                    </View>
                                    <Text style={[s.modalTitle, { color: textColor }]}>{selectedPool?.projectName}</Text>
                                </View>
                                <TouchableOpacity onPress={() => setSelectedPool(null)} style={s.closeButton}>
                                    <PlatformIcon name="xmark.circle.fill" size={24} tintColor={isDark ? '#A1A1A6' : '#8E8E93'} />
                                </TouchableOpacity>
                            </View>

                            <View style={s.modalBalanceCard}>
                                <Text style={[s.modalBalanceLabel, { color: isDark ? '#A1A1A6' : '#8E8E93' }]}>Current Balance</Text>
                                <Text style={[s.modalBalanceValue, { color: selectedPool?.balance < 0 ? '#FF3B30' : (selectedPool?.balance < selectedPool?.limit ? '#FF9500' : '#34C759') }]}>
                                    {selectedPool ? formatCurrency(selectedPool.balance) : ''}
                                </Text>
                            </View>

                            <View style={s.poolActions}>
                                <TouchableOpacity
                                    style={[s.poolActionButton, { backgroundColor: '#007AFF20', flex: 1, justifyContent: 'center' }]}
                                    onPress={() => setShowTopUp(true)}
                                >
                                    <PlatformIcon name="plus.circle.fill" size={16} tintColor="#007AFF" />
                                    <Text style={[s.poolActionText, { color: '#007AFF', fontSize: 15 }]}>Top Up</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[s.poolActionButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', flex: 1, justifyContent: 'center' }]}
                                    onPress={() => {
                                        Alert.alert('Archive', `Archive ${selectedPool?.projectName}`);
                                        setSelectedPool(null);
                                    }}
                                >
                                    <PlatformIcon name="archivebox.fill" size={16} tintColor={isDark ? '#A1A1A6' : '#8E8E93'} />
                                    <Text style={[s.poolActionText, { color: isDark ? '#A1A1A6' : '#8E8E93', fontSize: 15 }]}>Archive</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={[s.historySection, { flex: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }]}>
                                <Text style={[s.historyTitle, { color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)', paddingHorizontal: 4 }]}>RIWAYAT MUTASI</Text>
                                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 4, paddingTop: Platform.OS === 'android' ? ((RNStatusBar.currentHeight || 24) + 54) : 0 }}>
                                    {selectedPool?.history.map((record: any) => (
                                        <View key={record.id} style={s.historyItem}>
                                            <View style={s.historyHeader}>
                                                <Text style={[s.historyLabel, { color: textColor, fontSize: 15 }]} numberOfLines={1}>{record.title}</Text>
                                                <Text style={[s.historyAmount, { color: record.type === 'in' ? '#34C759' : '#FF3B30', fontSize: 15 }]}>
                                                    {record.type === 'in' ? '+' : '-'}{formatCurrency(record.amount)}
                                                </Text>
                                            </View>
                                            <Text style={[s.historyDate, { fontSize: 13 }]}>{record.date}</Text>
                                        </View>
                                    ))}
                                </ScrollView>
                            </View>
                        </GlassView>
                    </View>
                </Modal>
            </View>
        );
    };

    const showBankFilterActionSheet = () => {
        const banks = ['ALL', 'BCA', 'MANDIRI', 'BNI', 'BRI', 'CIMB'];
        const options = ['All Banks', 'BCA', 'Bank Mandiri', 'BNI', 'BRI', 'CIMB Bank', 'Cancel'];
        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                { options, cancelButtonIndex: 6, title: 'Filter Bank Account', userInterfaceStyle: isDark ? 'dark' : 'light' },
                (buttonIndex) => {
                    if (buttonIndex >= 0 && buttonIndex < 6) {
                        setFilterFundingBank(banks[buttonIndex]);
                    }
                }
            );
        } else {
            Alert.alert('Filter Bank Account', 'Select Bank', [
                { text: 'All Banks', onPress: () => setFilterFundingBank('ALL') },
                { text: 'BCA', onPress: () => setFilterFundingBank('BCA') },
                { text: 'Bank Mandiri', onPress: () => setFilterFundingBank('MANDIRI') },
                { text: 'BNI', onPress: () => setFilterFundingBank('BNI') },
                { text: 'BRI', onPress: () => setFilterFundingBank('BRI') },
                { text: 'Cancel', style: 'cancel' },
            ]);
        }
    };

    const renderFundingControlRow = () => {
        return (
            <View style={{ marginBottom: 12 }}>
                <View style={s.controlRowContainer}>
                    <TouchableOpacity
                        onPress={showBankFilterActionSheet}
                        style={[
                            s.projectSelectPill,
                            {
                                flex: 1,
                                height: 42,
                                justifyContent: 'space-between',
                                paddingHorizontal: 16,
                                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#FFFFFF',
                                borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                            }
                        ]}
                    >
                        <Text style={[s.controlPillText, { color: textColor, textAlign: 'left' }]} numberOfLines={1}>
                            {filterFundingBank === 'ALL' ? 'All Banks' : filterFundingBank.toUpperCase()}
                        </Text>
                        <PlatformIcon name="chevron.down" size={12} tintColor={textColor} style={{ marginLeft: 6 }} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => setIsSearchVisible(!isSearchVisible)}
                        style={[
                            s.searchButtonPill,
                            {
                                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#FFFFFF',
                                borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                            }
                        ]}
                    >
                        <PlatformIcon name="magnifyingglass" size={16} tintColor={textColor} />
                    </TouchableOpacity>
                </View>

                {isSearchVisible && (
                    <Animated.View
                        entering={FadeInUp}
                        style={[
                            s.inlineSearchContainer,
                            {
                                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                            }
                        ]}
                    >
                        <PlatformIcon name="magnifyingglass" size={16} tintColor={subtextColor} style={{ marginRight: 8 }} />
                        <TextInput
                            placeholder="Search funding accounts..."
                            placeholderTextColor={isDark ? '#666' : '#999'}
                            style={[s.inlineSearchInput, { color: textColor }]}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            returnKeyType="search"
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4, marginRight: 8 }}>
                                <PlatformIcon name="xmark.circle.fill" size={16} tintColor={subtextColor} />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            onPress={() => {
                                setIsSearchVisible(false);
                                setSearchQuery('');
                            }}
                            style={s.inlineCancelButton}
                        >
                            <Text style={{ color: subtextColor, fontWeight: '600', fontSize: 14 }}>Cancel</Text>
                        </TouchableOpacity>
                    </Animated.View>
                )}
            </View>
        );
    };

    const renderFunding = (sources: any[]) => {
        const totalCount = sources.length;
        const activeCount = sources.filter(s => s.is_active !== false).length;
        const inactiveCount = sources.filter(s => s.is_active === false).length;

        const q = searchQuery.toLowerCase().trim();
        const displayedSources = sources.filter(s => {
            const matchesQuery = !q ||
                (s.name || '').toLowerCase().includes(q) ||
                (s.provider || '').toLowerCase().includes(q) ||
                (s.account_number || '').toLowerCase().includes(q);
            const matchesBank = filterFundingBank === 'ALL' || (s.provider || '').toLowerCase() === filterFundingBank.toLowerCase();
            const matchesStatus = filterFundingStatus === 'all' || (filterFundingStatus === 'active' ? s.is_active !== false : s.is_active === false);
            return matchesQuery && matchesBank && matchesStatus;
        });

        const summaryCards = [
            { id: 'all', value: totalCount.toString(), label: 'Total Accounts', sub: 'Verified Sources', icon: 'tray.2.fill', color: '#007AFF' },
            { id: 'active', value: activeCount.toString(), label: 'Active Accounts', sub: 'Ready to Use', icon: 'checkmark.seal.fill', color: '#34C759' },
            { id: 'inactive', value: inactiveCount.toString(), label: 'Inactive Accounts', sub: 'Deactivated', icon: 'xmark.circle.fill', color: '#8E8E93' },
        ];

        return (
            <View style={s.subModuleContainer}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={s.filterCardsScroll}
                    contentContainerStyle={s.filterCardsContent}
                >
                    {summaryCards.map((card) => {
                        const isSelected = filterFundingStatus === card.id;
                        return (
                            <FinanceSummaryCard
                                key={card.id}
                                icon={card.icon as any}
                                iconColor={card.color}
                                value={card.value}
                                label={card.label}
                                subValue={card.sub}
                                style={{
                                    width: 145,
                                    marginRight: 12,
                                    marginBottom: 0,
                                    backgroundColor: isSelected
                                        ? (isDark ? `${card.color}45` : `${card.color}25`)
                                        : (isDark ? '#1C1C1E' : '#FFFFFF'),
                                    borderColor: 'transparent',
                                    borderWidth: 0,
                                }}
                                onPress={() => setFilterFundingStatus(card.id as any)}
                            />
                        );
                    })}
                </ScrollView>

                {renderFundingControlRow()}

                <View style={s.activityList}>
                    {displayedSources.length > 0 ? (
                        displayedSources.map((source) => {
                            const providerColor = getProviderColor(source.provider);
                            const isInactive = source.is_active === false;
                            return (
                                <View
                                    key={source.id}
                                    style={[
                                        s.poolCard,
                                        {
                                            backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                                            borderColor: 'transparent',
                                            borderWidth: 0,
                                            padding: 16,
                                            opacity: isInactive ? 0.6 : 1,
                                        }
                                    ]}
                                >
                                    <TouchableOpacity
                                        style={s.poolHeader}
                                        onPress={() => setSelectedSource(source)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={s.poolInfo}>
                                            <View style={s.poolProjectInfo}>
                                                <View style={[s.poolBadge, { backgroundColor: isInactive ? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)') : providerColor + '20' }]}>
                                                    <Text style={[s.poolBadgeText, { color: isInactive ? '#8E8E93' : providerColor }]}>
                                                        {(source.provider || 'Source').toUpperCase()}
                                                    </Text>
                                                </View>
                                                <Text style={[s.poolName, { color: isInactive ? '#8E8E93' : textColor }]} numberOfLines={1}>
                                                    {source.name || 'Account'}
                                                </Text>
                                            </View>
                                            {isInactive ? (
                                                <Text style={[s.poolBalance, { color: '#8E8E93', fontWeight: 'bold' }]}>
                                                    INACTIVE
                                                </Text>
                                            ) : (
                                                <Text style={[s.poolBalance, { color: textColor }]}>
                                                    {formatCurrency(source.balance || 0)}
                                                </Text>
                                            )}
                                        </View>
                                    </TouchableOpacity>
                                </View>
                            );
                        })
                    ) : (
                        <GlassView intensity={isDark ? 5 : 20} style={s.emptyState}>
                            <PlatformIcon
                                name="tray.fill"
                                size={32}
                                tintColor={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}
                            />
                            <Text style={[s.emptyText, { color: isDark ? '#A1A1A6' : '#8E8E93' }]}>
                                {filterFundingStatus === 'inactive' ? 'No inactive funding sources found.' : 'No funding sources found.'}
                            </Text>
                        </GlassView>
                    )}
                </View>
            </View>
        );
    };

    const handleExportReport = (report: any) => {
        const options = ['Cancel', 'Export to PDF', 'Export to Excel'];
        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                { options, cancelButtonIndex: 0, title: `Export ${report.title}`, userInterfaceStyle: isDark ? 'dark' : 'light' },
                (buttonIndex) => {
                    if (buttonIndex === 1) Alert.alert('Exporting PDF', `${report.title} is being generated as PDF`);
                    if (buttonIndex === 2) Alert.alert('Exporting Excel', `${report.title} is being generated as Excel`);
                }
            );
        } else {
            Alert.alert('Export Report', 'Choose your preferred format', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'PDF', onPress: () => Alert.alert('Exporting PDF', 'PDF download started') },
                { text: 'Excel', onPress: () => Alert.alert('Exporting Excel', 'Excel download started') },
            ]);
        }
    };

    const renderReports = (reports: any[]) => {
        const filteredReports = reports.filter(r => r.type === reportFilter);
        return (
            <View style={s.subModuleContainer}>
                <View style={[s.reportsToggleContainer, { marginBottom: 16 }]}>
                    {[
                        { id: 'weekly', label: 'Weekly', icon: 'calendar' },
                        { id: 'monthly', label: 'Monthly', icon: 'calendar.badge.clock' },
                    ].map((filter) => (
                        <TouchableOpacity
                            key={filter.id}
                            onPress={() => setReportFilter(filter.id as any)}
                            style={[
                                s.filterChip,
                                { flex: 1, marginRight: filter.id === 'weekly' ? 12 : 0 },
                                reportFilter === filter.id && {
                                    backgroundColor: isDark ? 'rgba(82, 115, 236, 0.15)' : 'rgba(82, 115, 236, 0.08)',
                                    borderColor: 'rgba(82, 115, 236, 0.3)'
                                }
                            ]}
                        >
                            <PlatformIcon
                                name={filter.icon as any}
                                size={14}
                                tintColor={reportFilter === filter.id ? '#5273EC' : subtextColor}
                            />
                            <Text style={[
                                s.filterChipText,
                                { color: reportFilter === filter.id ? '#5273EC' : subtextColor, fontWeight: reportFilter === filter.id ? '700' : '500' }
                            ]}>
                                {filter.label} Reports
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={s.activityList}>
                    {filteredReports.map((report) => (
                        <TouchableOpacity
                            key={report.id}
                            activeOpacity={0.7}
                            onPress={() => {
                                setSelectedReport(report);
                                setShowReportDetail(true);
                            }}
                        >
                            <GlassView
                                intensity={isDark ? 10 : 80}
                                style={[
                                    s.reportCard,
                                    {
                                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255,255,255,0.7)',
                                        borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                                        borderWidth: 1
                                    }
                                ]}
                            >
                                <View style={s.reportInfo}>
                                    <View style={s.reportTitleRow}>
                                        <Text style={[s.reportTitle, { color: textColor }]}>{report.title}</Text>
                                        {!report.isFinalized && (
                                            <View style={[s.reportTypeBadge, { backgroundColor: 'rgba(255,149,0,0.1)' }]}>
                                                <Text style={[s.reportTypeBadgeText, { color: '#FF9500' }]}>DRAFT</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={[s.reportPeriod, { color: subtextColor }]}>{report.period}</Text>
                                    <Text style={[s.reportDate, { color: subtextColor, opacity: 0.6 }]}>
                                        Generated: {report.date}
                                    </Text>
                                </View>
                                <View style={s.exportButton}>
                                    <View style={[s.exportIconBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                                        <PlatformIcon name="chevron.right" size={18} tintColor={isDark ? '#A1A1A6' : '#8E8E93'} />
                                    </View>
                                </View>
                            </GlassView>
                        </TouchableOpacity>
                    ))}
                    {filteredReports.length === 0 && (
                        <EmptyState segment="Reports" filter={reportFilter} />
                    )}
                </View>
            </View>
        );
    };

    const renderBody = () => {
        const q = searchQuery.toLowerCase().trim();

        if (activeSegment === 'setup') {
            return (
                <FinanceTeamSetupTab
                    isDark={isDark}
                    textColor={textColor}
                    subtextColor={subtextColor}
                    selectedModuleId={isDesktopWeb ? selectedSetupModule : undefined}
                    onSelectModule={isDesktopWeb ? (id) => setSelectedSetupModule(id) : undefined}
                />
            );
        }
        if (activeSegment === 'petty_cash') {
            const searchFiltered = pettyCashPools.filter(pool => {
                return !q ||
                    (pool.name || '').toLowerCase().includes(q) ||
                    (pool.project || '').toLowerCase().includes(q) ||
                    (pool.ref || '').toLowerCase().includes(q);
            });
            return renderPettyCash(searchFiltered);
        }
        if (activeSegment === 'funding') {
            if (!isManager) return null;
            const searchFiltered = fundingSources.filter(source => {
                return !q ||
                    (source.name || '').toLowerCase().includes(q) ||
                    (source.provider || '').toLowerCase().includes(q) ||
                    (source.account_number || '').toLowerCase().includes(q);
            });
            return renderFunding(searchFiltered);
        }
        if (activeSegment === 'reports') {
            return renderReports([]);
        }
        if (activeSegment === 'purchasing') {
            const showSubNavigation = activeScope === 'team' && hasTeamAccess;

            if (showSubNavigation && activeWorkflowTab === 'consolidation' && isPurchasingConEnabled) {
                const searchFilteredConsolidations = consolidations.filter(item => {
                    return !q ||
                        item.document_number.toLowerCase().includes(q) ||
                        item.status.toLowerCase().includes(q) ||
                        item.requests.some((r: any) => (r.ref && r.ref.toLowerCase().includes(q)) || (r.title && r.title.toLowerCase().includes(q)));
                });
                const filteredConsolidationsArr = searchFilteredConsolidations.filter(item =>
                    filterStatus === 'total'
                    || (filterStatus === 'paid' ? item.total_paid_amount > 0 : (item as any).statusTag === filterStatus)
                );

                return (
                    <View style={s.subModuleContainer}>
                        <View style={{ marginBottom: 12, alignItems: 'center' }}>
                            <SwiftUISegmentedControl
                                segments={purchasingSubSegments}
                                activeSegment={activeWorkflowTab}
                                onSegmentChange={(id) => {
                                    setActiveWorkflowTab(id as any);
                                    setIsConsolidationSelectionMode(false);
                                    setSelectedForConsolidationIds([]);
                                }}
                            />
                        </View>
                        {renderFilterCards(consolidationStats)}
                        {renderControlRow()}
                        <View style={s.activityList}>
                            {filteredConsolidationsArr.length > 0 ? (
                                filteredConsolidationsArr.map((con: any) => (
                                    <ConsolidationCard
                                        key={con.id}
                                        item={con}
                                        documentRules={documentRules}
                                        onPress={() => {
                                            setActiveDetailConsolidation(con);
                                            setConsolidationDetailPresentationKey(key => key + 1);
                                            setShowConsolidationDetail(true);
                                        }}
                                        onRequestPress={(req) => {
                                            returnToConsolidationDetailRef.current = false;
                                            setActiveDetailConsolidation(con);
                                            setActiveConsolidationRequest(req);
                                            setShowConsolidationRequestDetail(true);
                                        }}
                                    />
                                ))
                            ) : (
                                <EmptyState segment="Purchasing" filter={filterStatus} />
                            )}
                        </View>
                    </View>
                );
            }

            if (showSubNavigation && activeWorkflowTab === 'payment') {
                if (isPurchasingConEnabled) {
                    const payableConsolidations = consolidations.filter(c =>
                        c.status === 'Approved' || c.status === 'Paying' || c.status === 'Partially Paid' || c.status === 'Paid'
                    );
                    const searchFilteredPayable = payableConsolidations.filter(item => {
                        const progress = getConsolidationPaymentProgress(item);
                        const matchesStatus = filterStatus === 'pending'
                            ? progress.remaining > 0
                            : filterStatus === 'partiallyPaid'
                                ? progress.isPartiallyPaid
                                : filterStatus === 'paid'
                                    ? progress.hasPayment
                                    : true;
                        return matchesStatus && (!q ||
                            item.document_number.toLowerCase().includes(q) ||
                            item.status.toLowerCase().includes(q) ||
                            item.requests.some((r: any) => (r.ref && r.ref.toLowerCase().includes(q)) || (r.title && r.title.toLowerCase().includes(q))));
                    });

                    return (
                        <View style={s.subModuleContainer}>
                            <View style={{ marginBottom: 12, alignItems: 'center' }}>
                                <SwiftUISegmentedControl
                                    segments={purchasingSubSegments}
                                    activeSegment={activeWorkflowTab}
                                    onSegmentChange={(id) => {
                                        setActiveWorkflowTab(id as any);
                                        setIsConsolidationSelectionMode(false);
                                        setSelectedForConsolidationIds([]);
                                    }}
                                />
                            </View>
                            {renderFilterCards(paymentStats)}
                            {renderControlRow()}
                            <View style={s.activityList}>
                                {searchFilteredPayable.length > 0 ? (
                                    searchFilteredPayable.map((con: any) => (
                                        <ConsolidationCard
                                            key={con.id}
                                            item={con}
                                            documentRules={documentRules}
                                            isPaymentMode={true}
                                            onPress={() => {
                                                setActiveDetailConsolidation(con);
                                                setConsolidationDetailPresentationKey(key => key + 1);
                                                setShowConsolidationDetail(true);
                                            }}
                                            onRequestPress={(req) => {
                                                returnToConsolidationDetailRef.current = false;
                                                setActiveDetailConsolidation(con);
                                                setActiveConsolidationRequest(req);
                                                setShowConsolidationRequestDetail(true);
                                            }}
                                        />
                                    ))
                                ) : (
                                    <EmptyState segment="Purchasing" filter={filterStatus} />
                                )}
                            </View>
                        </View>
                    );
                } else {
                    const payableRequests = filteredPurchasingForStats.filter(item => {
                        const matchesStatus = filterStatus === 'total'
                            ? (item.statusTag === 'approved' || item.statusTag === 'paid')
                            : (filterStatus === 'paid' ? item.statusTag === 'paid' : item.statusTag === filterStatus);
                        return matchesStatus && (!q ||
                            item.title.toLowerCase().includes(q) ||
                            (item.project && item.project.toLowerCase().includes(q)) ||
                            (item.ref && item.ref.toLowerCase().includes(q)) ||
                            (item.status && item.status.toLowerCase().includes(q)));
                    });

                    return (
                        <View style={s.subModuleContainer}>
                            <View style={{ marginBottom: 12, alignItems: 'center' }}>
                                <SwiftUISegmentedControl
                                    segments={purchasingSubSegments}
                                    activeSegment={activeWorkflowTab}
                                    onSegmentChange={(id) => {
                                        setActiveWorkflowTab(id as any);
                                        setIsConsolidationSelectionMode(false);
                                        setSelectedForConsolidationIds([]);
                                    }}
                                />
                            </View>
                            {renderFilterCards(purchasingStats)}
                            {renderControlRow()}
                            <View style={s.activityList}>
                                {payableRequests.length > 0 ? (
                                    payableRequests.map((item: any) => (
                                        <View key={item.id}>{renderActivityItem(item, 'purchasing')}</View>
                                    ))
                                ) : (
                                    <EmptyState segment="Purchasing" filter={filterStatus} />
                                )}
                            </View>
                        </View>
                    );
                }
            }

            const searchFiltered = filteredPurchasingForStats.filter(item => {
                return !q ||
                    item.title.toLowerCase().includes(q) ||
                    (item.project && item.project.toLowerCase().includes(q)) ||
                    (item.ref && item.ref.toLowerCase().includes(q)) ||
                    (item.status && item.status.toLowerCase().includes(q));
            });
            const filteredItemsArr = searchFiltered.filter(item => filterStatus === 'total'
                || (filterStatus === 'paid' ? item.statusTag === 'paid' || Number(item._paid_amount || 0) > 0 : (item as any).statusTag === filterStatus));

            return (
                <View style={s.subModuleContainer}>
                    {showSubNavigation && (
                        <View style={{ marginBottom: 12, alignItems: 'center' }}>
                            <SwiftUISegmentedControl
                                segments={purchasingSubSegments}
                                activeSegment={activeWorkflowTab}
                                onSegmentChange={(id) => {
                                    setActiveWorkflowTab(id as any);
                                    setIsConsolidationSelectionMode(false);
                                    setSelectedForConsolidationIds([]);
                                }}
                            />
                        </View>
                    )}
                    {renderFilterCards(purchasingStats)}
                    {renderControlRow()}

                    {/* Consolidation Selection Mode Bar */}
                    {activeScope === 'team' && isPurchasingConEnabled && (
                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingHorizontal: 4,
                            marginBottom: 12,
                        }}>
                            <BouncySelectionToggle
                                isSelected={isConsolidationSelectionMode}
                                onPress={() => {
                                    setIsConsolidationSelectionMode(!isConsolidationSelectionMode);
                                    setSelectedForConsolidationIds([]);
                                }}
                                isDark={isDark}
                                textColor={textColor}
                                subtextColor={subtextColor}
                            />

                            {selectedForConsolidationIds.length > 0 && (
                                <TouchableOpacity
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                        setShowCreateConsolidationPreview(true);
                                    }}
                                    activeOpacity={0.8}
                                    style={{
                                        backgroundColor: '#007AFF',
                                        paddingHorizontal: 14,
                                        paddingVertical: 7,
                                        borderRadius: 20,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        shadowColor: '#007AFF',
                                        shadowOffset: { width: 0, height: 2 },
                                        shadowOpacity: 0.3,
                                        shadowRadius: 4,
                                        elevation: 3,
                                    }}
                                >
                                    <PlatformIcon name="plus.circle.fill" size={14} tintColor="#FFFFFF" style={{ marginRight: 6 }} />
                                    <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 13, letterSpacing: -0.2 }}>
                                        Consolidate ({selectedForConsolidationIds.length})
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}

                    <View style={s.activityList}>
                        {filteredItemsArr.length > 0 ? (
                            filteredItemsArr.map((item: any) => (
                                <View key={item.id}>{renderActivityItem(item, 'purchasing')}</View>
                            ))
                        ) : (
                            <EmptyState segment="Purchasing" filter={filterStatus} />
                        )}
                    </View>
                </View>
            );
        }
        if (activeSegment === 'reimbursement') {
            const showSubNavigation = activeScope === 'team' && hasTeamAccess;
            const workflowFiltered = filteredReimbursementForStats.filter(item => {
                if (!showSubNavigation || activeWorkflowTab === 'request') return true;
                if (activeWorkflowTab === 'consolidation' && isReimbConEnabled) return item.statusTag === 'approved';
                return item.statusTag === 'approved' || item.statusTag === 'paid';
            });
            const searchFiltered = workflowFiltered.filter(item => {
                return !q ||
                    item.title.toLowerCase().includes(q) ||
                    (item.project && item.project.toLowerCase().includes(q)) ||
                    (item.ref && item.ref.toLowerCase().includes(q)) ||
                    (item.status && item.status.toLowerCase().includes(q));
            });
            const filteredItemsArr = searchFiltered.filter(item => filterStatus === 'total' || (item as any).statusTag === filterStatus);
            return (
                <View style={s.subModuleContainer}>
                    {showSubNavigation && (
                        <View style={{ marginBottom: 12, alignItems: 'center' }}>
                            <SwiftUISegmentedControl
                                segments={reimbursementSubSegments}
                                activeSegment={activeWorkflowTab}
                                onSegmentChange={(id) => setActiveWorkflowTab(id as any)}
                            />
                        </View>
                    )}
                    {renderFilterCards(reimbursementStats)}
                    {renderControlRow()}
                    <View style={s.activityList}>
                        {filteredItemsArr.length > 0 ? (
                            filteredItemsArr.map((item: any) => (
                                <View key={item.id}>{renderActivityItem(item, 'reimbursement')}</View>
                            ))
                        ) : (
                            <EmptyState segment="Reimbursement" filter={filterStatus} />
                        )}
                    </View>
                </View>
            );
        }

        const pStats_v = purchasingStats;
        const rStats_v = reimbursementStats;
        const totalPaid = pStats_v.paid.amount + rStats_v.paid.amount;
        const baseline = 350000000;
        const trendVal = baseline > 0 ? Math.round((totalPaid / baseline) * 100) : 0;
        const isNormalVal = trendVal >= 80 && trendVal <= 110;
        const totalFundingBalance = fundingSources.reduce((sum, source) => sum + (source.balance || 0), 0);
        const activeFundingCount = fundingSources.filter(source => source.is_active !== false).length;

        const summaryCards_v = activeScope === 'me'
            ? [
                { value: pStats_v.paid.count.toString(), label: 'My Purchases', sub: formatCurrency(pStats_v.paid.amount), icon: 'cart.fill', color: '#34C759', segment: 'purchasing' },
                { value: rStats_v.paid.count.toString(), label: 'My Reimbursements', sub: formatCurrency(rStats_v.paid.amount), icon: 'doc.text.fill', color: '#007AFF', segment: 'reimbursement' },
                { value: pStats_v.pending.count.toString(), label: 'Pending Purchases', sub: formatCurrency(pStats_v.pending.amount), icon: 'cart.fill', color: '#FF9500', segment: 'purchasing' },
                { value: rStats_v.pending.count.toString(), label: 'Pending Reimbursement', sub: formatCurrency(rStats_v.pending.amount), icon: 'doc.text.fill', color: '#FF9500', segment: 'reimbursement' },
            ]
            : [
                {
                    value: `+${trendVal}%`,
                    valueStyle: isNormalVal ? 'positive' : 'negative',
                    label: dateFilterType === 'month' ? 'Total Paid (Month)' : 'Total Paid',
                    sub: formatCurrency(pStats_v.paid.amount + rStats_v.paid.amount),
                    subValueStyle: 'bold',
                    icon: 'checkmark.circle.fill',
                    color: '#34C759',
                    segment: 'reports',
                    disabled: true
                },
                { value: (pStats_v.pending.count + rStats_v.pending.count).toString(), label: 'Outstanding Bills', sub: formatCurrency(pStats_v.pending.amount + rStats_v.pending.amount), icon: 'cart.fill', color: '#FF9500', segment: 'purchasing' },
                { value: rStats_v.pending.count.toString(), label: 'Reimburse Pending', sub: formatCurrency(rStats_v.pending.amount), icon: 'doc.text.fill', color: '#FF9500', segment: 'reimbursement' },
                { value: formatShortBalance(totalFundingBalance), label: 'Balance', sub: `${activeFundingCount} Account${activeFundingCount === 1 ? '' : 's'}`, icon: 'creditcard.fill', color: '#007AFF', segment: 'funding' },
            ];

        const searchFilteredPurchasing = purchasingRequests.filter(item => {
            return !q ||
                item.title.toLowerCase().includes(q) ||
                (item.project && item.project.toLowerCase().includes(q)) ||
                (item.ref && item.ref.toLowerCase().includes(q)) ||
                (item.status && item.status.toLowerCase().includes(q));
        });
        const searchFilteredReimbursement = reimbursementRequests.filter(item => {
            return !q ||
                item.title.toLowerCase().includes(q) ||
                (item.project && item.project.toLowerCase().includes(q)) ||
                (item.ref && item.ref.toLowerCase().includes(q)) ||
                (item.status && item.status.toLowerCase().includes(q));
        });

        const overviewTransactions = [
            ...filteredPurchasingForStats.map(item => ({
                date: item.date || item.created_at,
                paidAmount: Number(item._paid_amount || (item.statusTag === 'paid' || item.status === 'Paid' ? item.amount : 0)),
                totalAmount: Number(item.amount || 0),
                statusTag: item.statusTag || (item.status === 'Paid' ? 'paid' : 'pending'),
                status: item.status,
            })),
            ...filteredReimbursementForStats.map(item => ({
                date: item.date || item.created_at,
                paidAmount: Number(item.statusTag === 'paid' || item.status === 'Paid' ? item.amount : 0),
                totalAmount: Number(item.amount || 0),
                statusTag: item.statusTag || (item.status === 'Paid' ? 'paid' : 'pending'),
                status: item.status,
            })),
        ];

        return (
            <View>
                {/* 1. Hero Overview Clean Card */}
                <FinanceHeroOverviewCard
                    embedded={false}
                    monthLabel={dateFilterType === 'month' ? formatMonthYear(selectedMonth) : 'Current View'}
                    totalPaid={pStats_v.paid.amount + rStats_v.paid.amount}
                    totalCommitted={pStats_v.paid.amount + rStats_v.paid.amount + pStats_v.pending.amount + rStats_v.pending.amount}
                    lastMonthPaid={77000}
                    outstandingAmount={pStats_v.pending.amount + rStats_v.pending.amount}
                    outstandingCount={pStats_v.pending.count + rStats_v.pending.count}
                    reimburseAmount={rStats_v.pending.amount}
                    reimburseCount={rStats_v.pending.count}
                    transactions={overviewTransactions}
                    onSelectSegment={(segment) => setActiveSegment(segment as any)}
                />

                {/* 2. Stat Cards */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={s.summaryScroll}
                    contentContainerStyle={s.summaryScrollContent}
                    decelerationRate="fast"
                    snapToInterval={150 + 12}
                >
                    {summaryCards_v.map((card, idx) => (
                        <FinanceSummaryCard
                            key={idx}
                            icon={card.icon as any}
                            iconColor={card.color}
                            value={card.value}
                            valueStyle={(card as any).valueStyle}
                            label={card.label}
                            subValue={card.sub}
                            subValueStyle={(card as any).subValueStyle || 'bold'}
                            style={{ width: 150, marginRight: 12, marginBottom: 0 }}
                            onPress={(card as any).disabled ? undefined : () => setActiveSegment(card.segment as any)}
                            disabled={(card as any).disabled}
                        />
                    ))}
                </ScrollView>

                {/* 3 & 4. Recent Purchasing & Reimbursement */}
                <View style={s.activitySection}>
                    <TouchableOpacity style={s.subSectionHeader} onPress={() => setActiveSegment('purchasing')}>
                        <Text style={[s.subSectionTitle, { color: textColor }]}>Recent Purchasing</Text>
                        <PlatformIcon name="chevron.right" size={14} tintColor={isDark ? '#A1A1A6' : '#8E8E93'} style={{ marginLeft: 8 }} />
                    </TouchableOpacity>
                    <View style={s.activityList}>
                        {searchFilteredPurchasing.length > 0 ? (
                            searchFilteredPurchasing.slice(0, 3).map((item: any) => (<View key={item.id}>{renderActivityItem(item, 'purchasing', false)}</View>))
                        ) : (
                            <View style={[s.emptyRecentCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                                <Text style={[s.emptyRecentText, { color: subtextColor }]}>No recent purchasing requests</Text>
                            </View>
                        )}
                    </View>

                    <TouchableOpacity style={[s.subSectionHeader, { marginTop: 24 }]} onPress={() => setActiveSegment('reimbursement')}>
                        <Text style={[s.subSectionTitle, { color: textColor }]}>Recent Reimbursement</Text>
                        <PlatformIcon name="chevron.right" size={14} tintColor={isDark ? '#A1A1A6' : '#8E8E93'} style={{ marginLeft: 8 }} />
                    </TouchableOpacity>
                    <View style={s.activityList}>
                        {searchFilteredReimbursement.length > 0 ? (
                            searchFilteredReimbursement.slice(0, 3).map((item: any) => (<View key={item.id}>{renderActivityItem(item, 'reimbursement', false)}</View>))
                        ) : (
                            <View style={[s.emptyRecentCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                                <Text style={[s.emptyRecentText, { color: subtextColor }]}>No recent reimbursement claims</Text>
                            </View>
                        )}
                    </View>
                </View>
            </View>
        );
    };

    const renderContent = () => {
        const activeLabel = filteredFinanceSegments.find(seg => seg.id === activeSegment)?.label || 'Module';
        if (!isAuthenticated) {
            return (
                <UnauthenticatedView
                    compact
                    title={`Finance — ${activeLabel}`}
                    description="Sign in to your organization workspace to view real-time cash flow, project expenses, invoices, and budget insights."
                    buttonText="Sign In"
                />
            );
        }
        const iconName = filteredFinanceSegments.find(seg => seg.id === activeSegment)?.icon || 'creditcard.fill';
        const scopeLabel = activeScope === 'me' ? 'Personal' : 'Team';
        const whitelistedSegments = ['overview', 'purchasing', 'reimbursement', 'petty_cash', 'funding', 'reports', 'setup'];
        if (!whitelistedSegments.includes(activeSegment)) {
            return (
                <View style={[s.skeleton, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
                    <PlatformIcon name={iconName as any} size={48} tintColor={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'} />
                    <View style={s.skeletonTextContainer}>
                        <Text style={[s.skeletonTitle, { color: textColor }]}>{activeLabel} ({scopeLabel})</Text>
                        <Text style={[s.skeletonSub, { color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }]}>
                            This is the {scopeLabel.toLowerCase()} view of the {activeLabel.toLowerCase()} module.
                        </Text>
                    </View>
                    <View style={s.rows}>
                        {[1, 2, 3].map(i => (
                            <View key={i} style={[s.row, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]} />
                        ))}
                    </View>
                </View>
            );
        }
        return renderBody();
    };

    // Gate the entire Finance surface, including detail panes and every modal.
    // The gate takes effect in the logout render, before cleanup effects run.
    if (!isAuthenticated || !user) {
        return (
            <View style={{ flex: 1, backgroundColor: isDark ? '#000000' : '#F2F2F7' }}>
                <Stack.Screen options={{ headerShown: Platform.OS !== 'web', title: 'Finance', headerTransparent: false }} />
                <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingVertical: 32 }}>
                    <UnauthenticatedView compact title="Finance" description="Sign in to your Adidaya account to view finance requests, approvals, and payments." buttonText="Sign In" />
                </ScrollView>
            </View>
        );
    }

    const pStats_v = purchasingStats;
    const rStats_v = reimbursementStats;

    return (
        <>
            <Stack.Screen options={{
                headerShown: Platform.OS !== 'web',
                title: 'Finance',
                headerLargeTitle: Platform.OS === 'ios',
                headerTransparent: Platform.OS === 'ios',
                headerTintColor: textColor,
                headerShadowVisible: false,
                headerStyle: Platform.OS === 'ios'
                    ? { backgroundColor: 'transparent' }
                    : { backgroundColor: isDark ? '#000000' : '#F2F2F7' },
                headerLargeStyle: Platform.OS === 'ios'
                    ? { backgroundColor: 'transparent' }
                    : { backgroundColor: isDark ? '#000000' : '#F2F2F7' },
                headerLargeTitleStyle: { fontSize: 28, color: textColor, fontWeight: '700' },
                headerTitleStyle: { color: textColor, fontWeight: '700' },
                headerRight: (isAuthenticated && actions.length > 0) ? () => (
                    <HeaderToolbar
                        actions={actions}
                        isDark={isDark}
                        textColor={textColor}
                        maxDirectActions={3}
                        primaryActionBgColor="#159957"
                        primaryActionColor="#159957"
                    />
                ) : undefined,
            }} />

            {Platform.OS === 'web' && !isDesktopWeb && (
                <WebFinderHeader
                    title="Finance"
                    showBack
                    actions={isAuthenticated ? actions : undefined}
                    primaryActionBgColor="#159957"
                    centerComponent={
                        <SegmentedControl
                            segments={filteredFinanceSegments}
                            activeSegment={activeSegment}
                            onSegmentChange={(id) => setActiveSegment(id as any)}
                        />
                    }
                />
            )}

            {isDesktopWeb ? (
                <View style={[s.splitRoot, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}>
                    {/* Left Pane (flex: 1.1) */}
                    <View style={[s.splitLeftPane, { borderRightColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)', backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}>
                        {/* Header with Title + Action Buttons */}
                        <View style={s.splitListHeader}>
                            <View style={s.splitListHeaderTitleRow}>
                                <Text style={[s.splitListHeaderTitle, { color: textColor }]}>Finance</Text>
                                {isAuthenticated && (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        {hasTeamAccess && activeSegment !== 'petty_cash' && activeSegment !== 'funding' && (
                                            <TouchableOpacity
                                                onPress={() => {
                                                    const nextScope = activeScope === 'me' ? 'team' : 'me';
                                                    if (nextScope === 'me' && (activeSegment === 'setup' || activeSegment === 'funding' || activeSegment === 'petty_cash')) {
                                                        setActiveSegment('overview');
                                                    }
                                                    setActiveScope(nextScope);
                                                }}
                                                style={[
                                                    s.headerActionCircle,
                                                    {
                                                        backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF',
                                                        borderWidth: isDark ? 0 : 1,
                                                        borderColor: isDark ? 'transparent' : 'rgba(0,0,0,0.08)',
                                                    }
                                                ]}
                                            >
                                                <PlatformIcon
                                                    name={activeScope === 'me' ? 'person.fill' : 'person.2.fill'}
                                                    size={16}
                                                    tintColor={textColor}
                                                />
                                            </TouchableOpacity>
                                        )}
                                        {activeSegment !== 'setup' && (
                                            <ContextMenu
                                                dropdownMenuMode={true}
                                                actions={financeAddMenuActions}
                                                onPress={handleFinanceAddMenuPress}
                                            >
                                                <TouchableOpacity
                                                    style={[s.headerActionCircle, { backgroundColor: '#159957' }]}
                                                    activeOpacity={0.8}
                                                >
                                                    <Ionicons name="add" size={18} color="#FFFFFF" />
                                                </TouchableOpacity>
                                            </ContextMenu>
                                        )}
                                    </View>
                                )}
                            </View>

                            {/* Filter Segmented Control */}
                            <View style={{ marginTop: 12 }}>
                                <SegmentedControl
                                    fullWidth
                                    style={{ width: '100%' }}
                                    segments={filteredFinanceSegments}
                                    activeSegment={activeSegment}
                                    onSegmentChange={(id) => setActiveSegment(id as any)}
                                />
                            </View>
                        </View>

                        <ScrollView
                            style={s.splitListScroll}
                            contentContainerStyle={{
                                paddingHorizontal: activeSegment === 'setup' ? 0 : 20,
                                paddingTop: activeSegment === 'setup' ? 0 : 8,
                                paddingBottom: 60,
                            }}
                            showsVerticalScrollIndicator={true}
                            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? '#FFF' : '#000'} />}
                            keyboardShouldPersistTaps="handled"
                        >
                            <Pressable style={{ flex: 1 }} onPress={() => setExpandedId(null)}>
                                {renderContent()}
                            </Pressable>
                        </ScrollView>
                    </View>

                    {/* Right Pane (flex: 2) */}
                    <View style={[s.splitRightPane, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}>
                        {showCreateRequest ? (
                            <SwiftUICreateRequestSheet
                                key={`desktop-create-req-${createRequestType}-${editRequest?.id || 'new'}`}
                                isOpened={true}
                                onClose={() => {
                                    setShowCreateRequest(false);
                                    setEditRequest(null);
                                }}
                                initialType={createRequestType}
                                locked={createRequestLocked}
                                editRequest={editRequest}
                                isEmbedded={true}
                            />
                        ) : (showAddFunding || !!editingSource) ? (
                            <SwiftUIAddFundingSourceSheet
                                key={`desktop-add-funding-${editingSource?.id || 'new'}`}
                                isOpened={true}
                                onClose={() => { setShowAddFunding(false); setEditingSource(null); }}
                                source={editingSource}
                                isEmbedded={true}
                            />
                        ) : (showPayModal && !!payTarget) ? (
                            <FinancePayModal
                                key={`desktop-pay-${payTarget.item?.id || 'pay'}`}
                                visible={true}
                                onClose={() => {
                                    setShowPayModal(false);
                                    setPayTarget(null);
                                }}
                                request={payTarget.item || null}
                                fundingSources={fundingSources}
                                onConfirm={handlePayConfirm}
                                isEmbedded={true}
                            />
                        ) : activeSegment === 'setup' ? (
                            <FinanceSetupDetailPane
                                key={`desktop-setup-${selectedSetupModule}`}
                                moduleId={selectedSetupModule}
                                isDark={isDark}
                                textColor={textColor}
                                subtextColor={subtextColor}
                            />
                        ) : selectedRequest ? (
                            <SwiftUITransactionDetailSheet
                                key={`desktop-req-${selectedRequest.id}-${requestDetailPresentationKey}`}
                                isOpened={true}
                                onClose={() => { setSelectedRequest(null); setExpandedId(null); }}
                                request={selectedRequest}
                                actions={getActionButtons(selectedRequest).filter(action => action.id !== 'delete')}
                                onAction={(actionId, req) => openFinanceAction(actionId, req, selectedRequest?.moduleType || 'purchasing')}
                                isEmbedded={true}
                            />
                        ) : selectedSource ? (
                            <SwiftUIFundingDetailSheet
                                key={`desktop-src-${selectedSource.id}`}
                                isOpened={true}
                                onClose={() => setSelectedSource(null)}
                                source={selectedSource}
                                matchedTransactions={matchedTransactions}
                                onEdit={(src) => { setSelectedSource(null); setEditingSource(src); }}
                                isEmbedded={true}
                            />
                        ) : (
                            <View style={s.desktopEmptyPane}>
                                <View style={[s.desktopEmptyIconCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                                    <PlatformIcon
                                        name={activeSegment === 'funding' ? 'creditcard.fill' : (activeSegment === 'reimbursement' ? 'doc.text.fill' : 'cart.fill')}
                                        size={36}
                                        tintColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)'}
                                    />
                                </View>
                                <Text style={[s.desktopEmptyTitle, { color: textColor }]}>
                                    {activeSegment === 'funding' ? 'Select Funding Source' : 'Select Transaction'}
                                </Text>
                                <Text style={[s.desktopEmptySubtitle, { color: subtextColor }]}>
                                    {activeSegment === 'funding'
                                        ? 'Choose an account or funding source to view its balance, linked disbursements, and account information.'
                                        : 'Choose a purchasing or reimbursement request from the list to view its approval chain, financial records, and attachments.'}
                                </Text>
                                <TouchableOpacity
                                    onPress={() => {
                                        if (activeSegment === 'funding') {
                                            setSelectedSource(null);
                                            setEditingSource(null);
                                            setShowAddFunding(true);
                                        } else {
                                            setSelectedRequest(null);
                                            setCreateRequestType(activeSegment === 'reimbursement' ? 'reimburse' : 'purchase');
                                            setCreateRequestLocked(false);
                                            setEditRequest(null);
                                            setShowCreateRequest(true);
                                        }
                                    }}
                                    style={[s.desktopEmptyBtn, { backgroundColor: '#159957' }]}
                                >
                                    <Ionicons name="add" size={18} color="#FFFFFF" />
                                    <Text style={s.desktopEmptyBtnText}>
                                        {activeSegment === 'funding' ? 'Add Funding Source' : 'New Request'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            ) : (
                <SwipeTabWrapper segments={filteredFinanceSegments} activeSegment={activeSegment} onSegmentChange={setActiveSegment}>
                    <ScrollView
                        contentInsetAdjustmentBehavior="automatic"
                        style={{ flex: 1, backgroundColor: Platform.OS === 'web' ? 'transparent' : (isDark ? '#000000' : '#F2F2F7') }}
                        contentContainerStyle={{
                            paddingBottom: 120,
                            paddingTop: 0,
                        }}
                        showsVerticalScrollIndicator={false}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? '#FFF' : '#000'} />}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Index 0: Segmented Control (Native Only) */}
                        {Platform.OS !== 'web' && (
                            <View style={{ width: '100%', alignItems: 'flex-start', paddingHorizontal: 16, paddingTop: 6, paddingBottom: 6 }}>
                                <SegmentedControl
                                    segments={filteredFinanceSegments}
                                    activeSegment={activeSegment}
                                    onSegmentChange={(id) => setActiveSegment(id as any)}
                                />
                            </View>
                        )}

                        {/* Rest of Content */}
                        <Pressable
                            style={{ flex: 1 }}
                            onPress={() => setExpandedId(null)}
                        >
                            <View style={{ paddingHorizontal: activeSegment === 'setup' ? 0 : 20, paddingTop: activeSegment === 'setup' ? 0 : 8 }}>
                                {renderContent()}
                            </View>
                        </Pressable>
                    </ScrollView>
                </SwipeTabWrapper>
            )}

            <Modal visible={showReportDetail} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowReportDetail(false)}>
                <View style={[s.modalContainer, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}>
                    <View style={s.modalHeader_v}>
                        <View>
                            <Text style={[s.modalTitle_v, { color: textColor }]}>Report Insight</Text>
                            <Text style={{ color: subtextColor, fontSize: 13 }}>{selectedReport?.period}</Text>
                        </View>
                        <TouchableOpacity onPress={() => setShowReportDetail(false)} style={s.modalCloseButton_v}>
                            <PlatformIcon name="xmark.circle.fill" size={28} tintColor={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingTop: Platform.OS === 'android' ? ((RNStatusBar.currentHeight || 24) + 54) : 0 }}>
                        <View style={s.reportDetailHeader_v}>
                            <Text style={[s.reportTitle_v, { color: textColor, fontSize: 20, marginBottom: 8 }]}>{selectedReport?.title}</Text>
                            <Text style={{ color: subtextColor, fontSize: 14 }}>Generated on {selectedReport?.date}</Text>
                        </View>
                        <GlassView intensity={isDark ? 10 : 80} style={[s.insightCard_v, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF' }]}>
                            <Text style={{ color: textColor, fontWeight: '700', marginBottom: 16 }}>Debit vs Credit Comparison</Text>
                            <View style={s.comparisonRow_v}>
                                <View>
                                    <Text style={{ color: '#34C759', fontSize: 12, fontWeight: '700' }}>TOTAL DEBIT</Text>
                                    <Text style={{ color: textColor, fontSize: 18, fontWeight: '800' }}>{formatCurrency(selectedReport?.metrics?.totalDebit || 0)}</Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={{ color: '#FF3B30', fontSize: 12, fontWeight: '700' }}>TOTAL CREDIT</Text>
                                    <Text style={{ color: textColor, fontSize: 18, fontWeight: '800' }}>{formatCurrency(selectedReport?.metrics?.totalCredit || 0)}</Text>
                                </View>
                            </View>
                            <View style={[s.comparisonBarContainer_v, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                                <View style={{ flex: 0.6, backgroundColor: '#34C759' }} />
                                <View style={{ flex: 0.4, backgroundColor: '#FF3B30', marginLeft: 2 }} />
                            </View>
                        </GlassView>
                        <View style={s.distributionContainer_v}>
                            <GlassView intensity={isDark ? 10 : 80} style={[s.categoryDistributionCard_v, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF' }]}>
                                <Text style={{ color: textColor, fontWeight: '700', alignSelf: 'flex-start', marginBottom: 20 }}>Distributions</Text>
                                <MultiProgressRing size={120} rings={selectedReport?.metrics?.categories.map((c: any) => ({ progress: c.progress, color: c.color })) || []} />
                            </GlassView>
                            <GlassView intensity={isDark ? 10 : 80} style={[s.projectBreakdownCard_v, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF' }]}>
                                <Text style={{ color: textColor, fontWeight: '700', marginBottom: 16 }}>Projects</Text>
                                <View style={{ gap: 16 }}>
                                    {selectedReport?.metrics?.projects.map((p: any) => (
                                        <View key={p.name}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                                <Text style={{ color: textColor, fontSize: 12, fontWeight: '600' }}>{p.name}</Text>
                                            </View>
                                            <View style={{ height: 4, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                                                <View style={{ width: `${Math.min(100, (p.amount / (selectedReport?.metrics?.totalDebit || 1) * 100))}%`, height: '100%', backgroundColor: p.color }} />
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            </GlassView>
                        </View>
                    </ScrollView>
                </View>
            </Modal>

            <Modal visible={showGenerateReport} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowGenerateReport(false)}>
                <View style={[s.modalContainer, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}>
                    <View style={s.modalHeader_v}>
                        <View>
                            <Text style={[s.modalTitle_v, { color: textColor }]}>New Report</Text>
                        </View>
                        <TouchableOpacity onPress={() => setShowGenerateReport(false)} style={s.modalCloseButton_v}>
                            <PlatformIcon name="xmark.circle.fill" size={28} tintColor={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingTop: Platform.OS === 'android' ? ((RNStatusBar.currentHeight || 24) + 54) : 0 }}>
                        <TouchableOpacity style={{ backgroundColor: '#5273EC', padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 20 }} onPress={() => setShowGenerateReport(false)}>
                            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 16 }}>Generate Draft Report</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </Modal>

            <SwiftUITransactionDetailSheet
                key={`request-detail-${requestDetailPresentationKey}`}
                isOpened={!isDesktopWeb && showRequestDetail}
                onClose={() => setShowRequestDetail(false)}
                request={selectedRequest}
                actions={selectedRequest ? getActionButtons(selectedRequest).filter(action => action.id !== 'delete') : []}
                onAction={(actionId, req) => openFinanceAction(actionId, req, selectedRequest?.moduleType || 'purchasing')}
            />
            <SwiftUICreateRequestSheet
                isOpened={!isDesktopWeb && showCreateRequest}
                onClose={() => {
                    setShowCreateRequest(false);
                    setEditRequest(null);
                }}
                initialType={createRequestType}
                locked={createRequestLocked}
                editRequest={editRequest}
            />
            <SwiftUIAddFundingSourceSheet
                isOpened={!isDesktopWeb && (showAddFunding || !!editingSource)}
                onClose={() => { setShowAddFunding(false); setEditingSource(null); }}
                source={editingSource}
            />
            <SwiftUIFundingDetailSheet
                isOpened={!!selectedSource}
                onClose={() => setSelectedSource(null)}
                source={selectedSource}
                matchedTransactions={matchedTransactions}
                onEdit={(src) => { setSelectedSource(null); setEditingSource(src); }}
            />
            <TopUpModal visible={showTopUp} onClose={() => setShowTopUp(false)} pool={selectedPool} />

            <FinanceRequestActionModal
                visible={!!actionModalType}
                onClose={() => {
                    setActionModalType(null);
                    setActionTarget(null);
                }}
                type={actionModalType || 'approve'}
                request={actionTarget?.item || null}
                fixedApprovalAmount={actionTarget?.moduleType === 'reimbursement'}
                onConfirm={handleFinanceActionConfirm}
            />

            <FinancePayModal
                visible={!isDesktopWeb && showPayModal}
                onClose={() => {
                    setShowPayModal(false);
                    setPayTarget(null);
                }}
                request={payTarget?.item || null}
                fundingSources={fundingSources}
                onConfirm={handlePayConfirm}
            />

            {/* Consolidation Detail Sheet */}
            <SwiftUIConsolidationDetailSheet
                key={consolidationDetailPresentationKey}
                isOpened={showConsolidationDetail}
                onClose={() => {
                    setShowConsolidationDetail(false);
                    if (openingAddRequestsRef.current) {
                        openingAddRequestsRef.current = false;
                        return;
                    }
                    if (openingConsolidationRequestRef.current) {
                        openingConsolidationRequestRef.current = false;
                        return;
                    }
                    setActiveDetailConsolidation(null);
                }}
                consolidation={activeDetailConsolidation}
                isPaymentMode={activeWorkflowTab === 'payment'}
                onOpenAddRequests={() => {
                    openingAddRequestsRef.current = true;
                    setShowConsolidationDetail(false);
                    setTimeout(() => {
                        setShowAddRequestsToConsolidation(true);
                    }, 350);
                }}
                onOpenRequest={(request) => {
                    openingConsolidationRequestRef.current = true;
                    returnToConsolidationDetailRef.current = true;
                    setShowConsolidationDetail(false);
                    setTimeout(() => {
                        setActiveConsolidationRequest(request);
                        setShowConsolidationRequestDetail(true);
                    }, 350);
                }}
                onOpenPayModal={(con) => {
                    setActivePaymentConsolidation(con);
                    setShowConsolidationPaymentModal(true);
                }}
            />

            <SwiftUIConsolidationRequestDetailSheet
                isOpened={showConsolidationRequestDetail}
                consolidation={activeDetailConsolidation}
                request={activeConsolidationRequest}
                isPaymentMode={activeWorkflowTab === 'payment'}
                canProcessPayment={activeWorkflowTab === 'payment' && !!activeDetailConsolidation && canAccessPayment(activeDetailConsolidation)}
                onProcessPayment={(request) => {
                    if (!activeDetailConsolidation) return;
                    returnToConsolidationDetailRef.current = false;
                    setSelectedPaymentRequestIds([request.id]);
                    setActivePaymentConsolidation(activeDetailConsolidation);
                    setShowConsolidationRequestDetail(false);
                    setActiveConsolidationRequest(null);
                    setTimeout(() => setShowConsolidationPaymentModal(true), 350);
                }}
                onChanged={(updatedRequest) => {
                    setActiveDetailConsolidation(current => {
                        if (!current) return current;
                        const requests = updatedRequest
                            ? current.requests.map(item => item.id === updatedRequest.id ? updatedRequest : item)
                            : current.requests.filter(item => item.id !== activeConsolidationRequest?.id);
                        return {
                            ...current,
                            requests,
                            request_ids: requests.map(item => item.id),
                            items_count: requests.reduce((sum, item) => sum + (item.items?.length || 1), 0),
                            total_amount: requests.reduce((sum, item) => sum + (item.amount || 0), 0),
                        };
                    });
                    if (updatedRequest) setActiveConsolidationRequest(updatedRequest);
                }}
                onClose={() => {
                    setShowConsolidationRequestDetail(false);
                    setActiveConsolidationRequest(null);
                    if (returnToConsolidationDetailRef.current) {
                        returnToConsolidationDetailRef.current = false;
                        setConsolidationDetailPresentationKey(key => key + 1);
                        setTimeout(() => setShowConsolidationDetail(true), 350);
                    } else {
                        setActiveDetailConsolidation(null);
                    }
                }}
            />

            {/* Create Consolidation Preview Sheet */}
            <CreateConsolidationPreviewSheet
                visible={showCreateConsolidationPreview}
                onClose={() => {
                    setShowCreateConsolidationPreview(false);
                    setIsConsolidationSelectionMode(false);
                    setSelectedForConsolidationIds([]);
                }}
                selectedRequests={purchasingRequests.filter(r => selectedForConsolidationIds.includes(r.id))}
                onConsolidationCreated={(newCon) => {
                    setActiveDetailConsolidation(newCon);
                    setConsolidationDetailPresentationKey(key => key + 1);
                    setShowConsolidationDetail(true);
                }}
            />

            {/* Add Requests to Existing Draft Consolidation Modal */}
            <AddRequestsToConsolidationModal
                visible={showAddRequestsToConsolidation}
                onClose={() => {
                    setShowAddRequestsToConsolidation(false);
                    setActiveDetailConsolidation(null);
                }}
                consolidation={activeDetailConsolidation}
            />

            {/* Consolidation Batch Payment Modal */}
            <ConsolidationPaymentModal
                visible={showConsolidationPaymentModal}
                onClose={() => {
                    setShowConsolidationPaymentModal(false);
                    setActivePaymentConsolidation(null);
                    setSelectedPaymentRequestIds([]);
                }}
                consolidation={activePaymentConsolidation}
                preSelectedRequestIds={selectedPaymentRequestIds}
            />

            <LiquidDatePicker
                visible={pickerPhase === 'start'}
                title="Select Start Date"
                onClose={() => setPickerPhase(current => current === 'start' ? 'none' : current)}
                currentDate={customStartDate ? customStartDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                onSelect={(dateString) => {
                    setTempStartDate(new Date(dateString));
                    setPickerPhase('end');
                }}
            />

            <LiquidDatePicker
                visible={pickerPhase === 'end'}
                title="Select End Date"
                onClose={() => setPickerPhase(current => current === 'end' ? 'none' : current)}
                currentDate={tempStartDate ? tempStartDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                onSelect={(dateString) => {
                    if (tempStartDate) {
                        const endD = new Date(dateString);
                        if (endD < tempStartDate) {
                            setCustomStartDate(endD);
                            setCustomEndDate(tempStartDate);
                        } else {
                            setCustomStartDate(tempStartDate);
                            setCustomEndDate(endD);
                        }
                        setDateFilterType('range');
                    }
                    setPickerPhase('none');
                }}
            />

        {/* Floating Sticky Consolidation Action Bar — Native SwiftUI Liquid Glass */}
            {isConsolidationSelectionMode && selectedForConsolidationIds.length > 0 && (
                <View
                    style={{
                        position: 'absolute',
                        bottom: insets.bottom + (Platform.OS === 'web' ? 94 : 88),
                        left: 16,
                        right: 16,
                        zIndex: 100,
                        height: 56,
                    }}
                >
                    {Platform.OS === 'ios' && Host ? (
                        <Host style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                            <SwiftUIGlassEffectContainer modifiers={[
                                swiftFrame({ maxWidth: Infinity, height: 56 }),
                                swiftCornerRadius(28)
                            ]}>
                                <SwiftHStack alignment="center" spacing={12} modifiers={[
                                    swiftPadding({ top: 6, bottom: 6, leading: 16, trailing: 0 }),
                                    swiftGlassEffect({ shape: 'capsule' })
                                ]}>
                                    <SwiftHStack alignment="center" spacing={4}>
                                        <SwiftText size={14} weight="bold" color={textColor}>
                                            {`${selectedForConsolidationIds.length} ${selectedForConsolidationIds.length === 1 ? 'Request' : 'Requests'}`}
                                        </SwiftText>
                                        <SwiftText size={12} weight="medium" color={subtextColor}>
                                            {formatCurrency(selectedTotalAmount)}
                                        </SwiftText>
                                    </SwiftHStack>

                                    <SwiftSpacer />

                                    <SwiftButton
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                            setShowCreateConsolidationPreview(true);
                                        }}
                                        variant="glassProminent"
                                        color="#007AFF"
                                        modifiers={[
                                            swiftCornerRadius(18),
                                            swiftPadding({ leading: 12, trailing: 12, top: 4, bottom: 4 })
                                        ]}
                                    >
                                        <SwiftHStack alignment="center" spacing={6}>
                                            <SwiftImage systemName="plus.circle.fill" size={14} color="#FFFFFF" />
                                            <SwiftText size={14} weight="semibold" color="#FFFFFF">
                                                Consolidate
                                            </SwiftText>
                                        </SwiftHStack>
                                    </SwiftButton>
                                </SwiftHStack>
                            </SwiftUIGlassEffectContainer>
                        </Host>
                    ) : (
                        <GlassView
                            intensity={40}
                            style={{
                                flex: 1,
                                borderRadius: 28,
                                flexDirection: 'row',
                                alignItems: 'center',
                                paddingHorizontal: 16,
                                paddingVertical: 6,
                                backgroundColor: isDark ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.85)',
                                borderWidth: 1,
                                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                            }}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                                <Text style={{ fontSize: 14, fontWeight: '700', color: textColor }}>
                                    {`${selectedForConsolidationIds.length} ${selectedForConsolidationIds.length === 1 ? 'Request' : 'Requests'}`}
                                </Text>
                                <Text style={{ fontSize: 12, fontWeight: '500', color: subtextColor }}>
                                    {formatCurrency(selectedTotalAmount)}
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                    setShowCreateConsolidationPreview(true);
                                }}
                                style={{
                                    backgroundColor: '#007AFF',
                                    borderRadius: 18,
                                    paddingHorizontal: 14,
                                    paddingVertical: 8,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 6,
                                }}
                            >
                                <Ionicons name="add-circle" size={16} color="#FFFFFF" />
                                <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>Consolidate</Text>
                            </TouchableOpacity>
                        </GlassView>
                    )}
                </View>
            )}

            {/* Finance New Record Drawer */}
            <SwiftUINewRecordSheet
                isOpened={isFinanceSelectorVisible}
                onClose={() => setIsFinanceSelectorVisible(false)}
                activeScope={activeScope}
                onSelectPurchase={() => {
                    setIsFinanceSelectorVisible(false);
                    setTimeout(() => {
                        setCreateRequestType('purchase');
                        setCreateRequestLocked(true);
                        setShowCreateRequest(true);
                    }, 150);
                }}
                onSelectReimburse={() => {
                    setIsFinanceSelectorVisible(false);
                    setTimeout(() => {
                        setCreateRequestType('reimburse');
                        setCreateRequestLocked(true);
                        setShowCreateRequest(true);
                    }, 150);
                }}
                onSelectAddFunding={() => {
                    setIsFinanceSelectorVisible(false);
                    setTimeout(() => {
                        setShowAddFunding(true);
                    }, 150);
                }}
            />
        </>
    );
}
const s = StyleSheet.create({
    container: { flex: 1 },
    heroBannerContainer: {
        width: '100%',
        overflow: 'hidden',
        position: 'relative',
        paddingBottom: 6,
        ...Platform.select({
            ios: {
                shadowColor: '#159957',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.25,
                shadowRadius: 20,
            },
            android: {
                elevation: 6,
            },
        }),
    },
    heroAmbientGlow: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: '75%',
        height: 220,
    },
    heroTopBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 8,
    },
    heroCircleButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.12,
                shadowRadius: 4,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    heroToolbarPill: {
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FFFFFF',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 3,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.12,
                shadowRadius: 4,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    heroTitleText: {
        fontSize: 32,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: -0.6,
        paddingHorizontal: 20,
        marginTop: 4,
        marginBottom: 14,
    },
    heroSegmentedWrapper: {
        width: '100%',
        paddingHorizontal: 16,
        marginBottom: 8,
    },
    segmentedWrapper: { marginBottom: 16, marginHorizontal: -4 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    title: { fontSize: 20, fontWeight: '700', letterSpacing: -0.5 },
    subtitle: { fontSize: 13, marginTop: 2 },
    skeleton: { borderRadius: 32, borderWidth: 1, borderStyle: 'dashed', padding: 40, alignItems: 'center', marginTop: 20, minHeight: 400 },
    skeletonTextContainer: { alignItems: 'center', marginTop: 24, gap: 8 },
    skeletonTitle: { fontSize: 22, fontWeight: '700' },
    skeletonSub: { fontSize: 15, textAlign: 'center', paddingHorizontal: 20, lineHeight: 22 },
    rows: { width: '100%', marginTop: 40, gap: 12 },
    row: { height: 60, borderRadius: 16, width: '100%' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 16 },
    summaryScroll: { marginHorizontal: -20, marginBottom: 12 },
    summaryScrollContent: { paddingHorizontal: 20, paddingBottom: 0 },
    activitySection: { marginTop: 0 },
    subSectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    subSectionTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.4 },
    poolCard: { borderRadius: 24, marginBottom: 12, padding: 16, borderWidth: 0, borderColor: 'transparent' },
    poolCardLow: { borderColor: 'rgba(255,149,0,0.4)', borderWidth: 1.5, backgroundColor: 'rgba(255,149,0,0.08)' },
    poolCardNegative: { borderColor: 'rgba(255,59,48,0.4)', borderWidth: 1.5, backgroundColor: 'rgba(255,59,48,0.08)' },
    poolHeader: { flexDirection: 'row', alignItems: 'center' },
    poolInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginRight: 12 },
    poolProjectInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 },
    poolBadge: { backgroundColor: 'rgba(175,82,222,0.12)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginRight: 10, borderWidth: 0 },
    poolBadgeText: { color: '#AF52DE', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
    poolName: { fontSize: 15, fontWeight: '600', flex: 1 },
    poolBalance: { fontSize: 16, fontWeight: '700' },
    poolActions: { flexDirection: 'row', marginBottom: 20, gap: 8 },
    poolActionButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
    poolActionText: { fontSize: 13, fontWeight: '600', marginLeft: 6 },
    historySection: { borderRadius: 16, padding: 12 },
    historyTitle: { fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 12 },
    historyItem: { marginBottom: 12 },
    historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
    historyLabel: { fontSize: 13, fontWeight: '500', flex: 1, marginRight: 8 },
    historyAmount: { fontSize: 13, fontWeight: '700' },
    historyDate: { fontSize: 11, color: 'rgba(142,142,147,0.7)' },
    activityList: { marginTop: 0 },
    activityCard: { borderRadius: 24, marginBottom: 12, overflow: 'hidden' },
    activityTouchable: { padding: 16, paddingBottom: 12 },
    itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    itemLeftCol: { flex: 1, marginRight: 12 },
    itemRightCol: { alignItems: 'flex-end' },
    itemTitle: { fontSize: 16, fontWeight: '700' },
    itemMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    itemMetaText: { fontSize: 13, color: '#8E8E93' },
    projectBadge: { backgroundColor: 'rgba(142,142,147,0.12)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, marginRight: 8, borderWidth: 0 },
    projectBadgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, color: '#8E8E93' },
    itemAmount: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
    itemStatus: { fontSize: 12, fontWeight: '700' },
    actionDock: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
    actionPill: { height: 42, borderRadius: 21, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, gap: 8 },
    actionCircle: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
    actionButtonText: { fontSize: 13, fontWeight: '700', letterSpacing: -0.2 },
    emptyState: { borderRadius: 20, padding: 40, alignItems: 'center', justifyContent: 'center', marginTop: 12, gap: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    emptyText: { fontSize: 15, textAlign: 'center', lineHeight: 22, paddingHorizontal: 20 },
    subModuleContainer: { paddingTop: 0 },
    filterCardsScroll: { marginHorizontal: -20, marginBottom: 12 },
    filterCardsContent: { paddingHorizontal: 20, gap: 0 },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
        paddingHorizontal: Platform.OS === 'ios' ? 8 : 0,
        paddingBottom: Platform.OS === 'ios' ? 8 : 0,
    },
    modalContent: {
        height: '60%',
        borderRadius: Platform.OS === 'ios' ? 56 : 32,
        borderBottomLeftRadius: Platform.OS === 'ios' ? 56 : 0,
        borderBottomRightRadius: Platform.OS === 'ios' ? 56 : 0,
        padding: 24,
        overflow: 'hidden'
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 },
    modalBadge: { backgroundColor: 'rgba(175,82,222,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 8 },
    modalBadgeText: { color: '#AF52DE', fontSize: 13, fontWeight: '800' },
    modalTitle: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
    closeButton: { padding: 4 },
    modalBalanceCard: { backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: 20, padding: 20, alignItems: 'center', marginBottom: 24 },
    modalBalanceLabel: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
    modalBalanceValue: { fontSize: 32, fontWeight: '800', letterSpacing: -1 },
    filterChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', backgroundColor: 'rgba(255,255,255,0.05)', marginRight: 4 },
    filterChipText: { fontSize: 14, marginLeft: 8 },
    reportCard: { borderRadius: 24, marginBottom: 12, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    reportInfo: { flex: 1, marginRight: 16 },
    reportTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 8 },
    reportTitle: { fontSize: 16, fontWeight: '700', letterSpacing: -0.3 },
    reportTypeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    reportTypeBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
    reportPeriod: { fontSize: 13, fontWeight: '500', marginBottom: 2 },
    reportDate: { fontSize: 11, fontWeight: '400' },
    exportButton: { alignItems: 'center', gap: 4 },
    exportIconBg: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    reportsToggleContainer: { flexDirection: 'row', alignItems: 'center' },
    modalContainer: { flex: 1 },
    modalHeader_v: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 24, paddingBottom: 0 },
    modalTitle_v: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
    modalCloseButton_v: { padding: 4 },
    reportDetailHeader_v: { marginBottom: 24 },
    reportTitle_v: { fontSize: 16, fontWeight: '700', letterSpacing: -0.3 },
    insightCard_v: { padding: 20, borderRadius: 24, marginBottom: 20 },
    comparisonRow_v: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    comparisonBarContainer_v: { height: 12, borderRadius: 6, overflow: 'hidden', flexDirection: 'row' },
    distributionContainer_v: { flexDirection: 'row', gap: 20, marginBottom: 20 },
    categoryDistributionCard_v: { flex: 1, padding: 20, borderRadius: 24, alignItems: 'center' },
    projectBreakdownCard_v: { flex: 1, padding: 20, borderRadius: 24 },
    controlRowContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 0 },
    monthSelectorPill: { flex: 1.4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 42, borderRadius: 21, borderWidth: 1, marginRight: 8 },
    projectSelectPill: { flex: 0.9, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 42, borderRadius: 21, borderWidth: 1, marginRight: 8, paddingHorizontal: 12 },
    searchButtonPill: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
    chevronTouch: { paddingHorizontal: 12, height: '100%', justifyContent: 'center', alignItems: 'center' },
    controlPillCenter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    controlPillText: { fontSize: 13, fontWeight: '700' },
    inlineSearchContainer: { flexDirection: 'row', alignItems: 'center', height: 42, borderRadius: 21, paddingHorizontal: 16, borderWidth: 1, marginTop: 8, marginBottom: 4 },
    inlineSearchInput: { flex: 1, height: '100%', fontSize: 15, fontWeight: '500', paddingVertical: 0 },
    inlineCancelButton: { paddingLeft: 8, paddingVertical: 4 },
    modalOption: { paddingVertical: 16, borderBottomWidth: 1 },
    modalOptionText: { fontSize: 16, fontWeight: '500' },
    drawerOverlay_f: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end', paddingHorizontal: Platform.OS === 'ios' ? 8 : 0, paddingBottom: Platform.OS === 'ios' ? 8 : 0 },
    drawerContentSheet_f: { borderRadius: Platform.OS === 'ios' ? 56 : 40, borderBottomLeftRadius: Platform.OS === 'ios' ? 56 : 0, borderBottomRightRadius: Platform.OS === 'ios' ? 56 : 0, overflow: 'hidden' },
    drawerHeader_f: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 28, paddingTop: 28, paddingBottom: 12 },
    drawerHeaderTitle_f: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
    closeBtn_f: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    drawerContent_f: { paddingHorizontal: 28, paddingTop: 8, paddingBottom: 36, gap: 12 },
    typeCard_f: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 24, borderWidth: 0 },
    typeIconContainer_f: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    typeTextContainer_f: { flex: 1, marginRight: 12 },
    typeTitle_f: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
    typeDesc_f: { fontSize: 12, lineHeight: 17 },
    splitRoot: {
        flex: 1,
        flexDirection: 'row',
        height: '100%',
        overflow: 'hidden',
    },
    splitLeftPane: {
        ...DESKTOP_LIST_PANE,
        height: '100%',
        borderRightWidth: StyleSheet.hairlineWidth,
        display: 'flex',
        flexDirection: 'column',
    },
    splitListHeader: { ...DESKTOP_PANEL_HEADER },
    splitListHeaderTitleRow: { ...DESKTOP_PANEL_TITLE_ROW },
    splitListHeaderTitle: { ...DESKTOP_PANEL_TITLE },
    headerActionCircle: { ...DESKTOP_PANEL_ACTION },
    splitListScroll: {
        flex: 1,
        height: '100%',
    },
    splitRightPane: {
        flex: 2,
        height: '100%',
        overflow: 'hidden',
    },
    desktopEmptyPane: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
    },
    desktopEmptyIconCircle: {
        width: 88,
        height: 88,
        borderRadius: 44,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    desktopEmptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 8,
        textAlign: 'center',
        letterSpacing: -0.3,
    },
    desktopEmptySubtitle: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        maxWidth: 380,
        marginBottom: 24,
    },
    desktopEmptyBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 24,
        gap: 6,
    },
    desktopEmptyBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    emptyRecentCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 16,
        borderWidth: 1,
    },
    emptyRecentText: {
        fontSize: 13,
        fontWeight: '500',
    },
});
