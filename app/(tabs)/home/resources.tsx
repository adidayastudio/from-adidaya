import { DESKTOP_LIST_PANE, DESKTOP_PANEL_HEADER, DESKTOP_PANEL_TITLE_ROW, DESKTOP_PANEL_TITLE, DESKTOP_PANEL_ACTION } from '@/constants/desktopLayout';
import { HeaderBlurBackground } from '@/components/ui/HeaderBlurBackground';
import { ResourceSummaryCard } from '@/components/resources/ResourceSummaryCard';
import { ResourceCard } from '@/components/resources/ResourceCard';
import { ResourceDetailModal } from '@/components/resources/ResourceDetailModal';
import { SwiftUIResourceActionsSheet } from '@/components/resources/SwiftUIResourceActionsSheet';
import { ResourcesSetupTab } from '@/components/resources/setup/ResourcesSetupTab';
import { GlassView } from '@/components/ui/GlassView';
import { HeaderToolbar, HeaderToolbarAction } from '@/components/ui/HeaderToolbar';
import { WebFinderHeader } from '@/components/ui/WebFinderHeader';
import { UnauthenticatedView } from '@/components/ui/UnauthenticatedView';
import { Segment, SegmentedControl } from '@/components/ui/SegmentedControl';
import { SwipeTabWrapper } from '@/components/ui/SwipeTabWrapper';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { Stack, usePathname } from 'expo-router';
import { useUserContext, MANAGEMENT_ROLES } from '@/context/UserProvider';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import React, { useMemo, useState, useEffect } from 'react';
import { RefreshControl, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View, Platform, TextInput, ActionSheetIOS , StatusBar as RNStatusBar, useWindowDimensions } from 'react-native';
import ContextMenu, { ContextMenuAction } from '@/components/ui/PlatformContextMenu';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSearch } from '@/context/SearchContext';
import { useIsFocused } from '@react-navigation/native';

import {
    CatalogResource,
    ProjectStock,
    ActivityLog,
    deriveStatus,
    STATUS_MAP,
    smartCapitalize,
    formatUnit,
    generateResourceCode,
} from '@/components/resources/mockData';

import {
    fetchCatalogResources,
    fetchCatalogSubcategories,
    fetchCatalogGroups,
    fetchResourceOverviewData,
    triggerAiCleanupApi,
} from '@/lib/api/resources';

import {
    getReceivingQueue,
    confirmItemReceipt,
    ReceivingQueueItem,
    saveReceivingQueue,
} from '@/lib/api/resourcesReceiving';

import {
    getResourcesAuditLogs,
    saveResourcesAuditLogs,
    ResourcesAuditLogItem,
} from '@/lib/api/resourcesAuditLogs';

import { getUnmatchedCandidates } from '@/lib/api/resourcesItemMaster';
import { ReceivingDetailModal } from '@/components/resources/overview/ReceivingDetailModal';
import { SwiftUIAddResourceSheet } from '@/components/resources/SwiftUIAddResourceSheet';
import { OverviewReceivingSection } from '@/components/resources/overview/OverviewReceivingSection';
import { OverviewAlertsSection, ResourceAlertItem } from '@/components/resources/overview/OverviewAlertsSection';
import { OverviewMovementSection } from '@/components/resources/overview/OverviewMovementSection';
import { ResourcePulseCard } from '@/components/resources/overview/ResourcePulseCard';

export type Scope = 'me' | 'team';

const RESOURCES_SEGMENTS: Segment[] = [
    { id: 'overview', label: 'Overview', icon: 'chart.bar.fill' },
    { id: 'materials', label: 'Materials', icon: 'shippingbox.fill' },
    { id: 'tools', label: 'Tools', icon: 'hammer.fill' },
    { id: 'assets', label: 'Assets', icon: 'car.fill' },
    { id: 'services', label: 'Services', icon: 'briefcase.fill' },
    { id: 'activity', label: 'Activity Log', icon: 'list.bullet.rectangle.fill' },
    { id: 'setup', label: 'Setup', icon: 'gearshape.fill' },
];

export default function ResourcesScreen() {
    const { width } = useWindowDimensions();
    const isDesktopWeb = Platform.OS === 'web' && width >= 768;

    const { resolvedTheme } = useTheme();
    const currentTheme = (resolvedTheme === 'dark' ? 'dark' : 'light') as 'light' | 'dark';
    const isDark = currentTheme === 'dark';
    const tintColor = Colors[currentTheme]?.tint || '#0036F8';
    const textColor = Colors[currentTheme]?.text || (isDark ? '#ECEDEE' : '#11181C');
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';
    const insets = useSafeAreaInsets();
    const { searchQuery, setSearchQuery, setIsSearchVisible, isSearchVisible, setContextAction } = useSearch();
    const isFocused = useIsFocused();

    const { profile, isAuthenticated } = useUserContext();
    const isManager = useMemo(() => profile ? MANAGEMENT_ROLES.includes(profile.role) : false, [profile]);

    const filteredSegments = useMemo(() => {
        if (!isAuthenticated) {
            return RESOURCES_SEGMENTS.filter(s => s.id !== 'activity' && s.id !== 'setup');
        }
        if (!isManager) {
            return RESOURCES_SEGMENTS.filter(s => s.id !== 'setup');
        }
        return RESOURCES_SEGMENTS;
    }, [isAuthenticated, isManager]);

    const [activeSegment, setActiveSegment] = useState('overview');
    const [activeScope, setActiveScope] = useState<Scope>('team');
    const [showActionsSheet, setShowActionsSheet] = useState(false);

    // Loading states
    const [isLoading, setIsLoading] = useState(false);
    const [isOverviewLoading, setIsOverviewLoading] = useState(false);

    // Overview Stats
    const [overviewStats, setOverviewStats] = useState({
        materials: 0,
        tools: 0,
        assets: 0,
        services: 0,
    });

    // Receiving Queue state
    const [receivingQueue, setReceivingQueue] = useState<ReceivingQueueItem[]>([]);
    const [selectedReceivingItem, setSelectedReceivingItem] = useState<ReceivingQueueItem | null>(null);
    const [receivingModalVisible, setReceivingModalVisible] = useState(false);
    const [addResourceModalVisible, setAddResourceModalVisible] = useState(false);
    const [addResourceCategory, setAddResourceCategory] = useState<'material' | 'tool' | 'asset' | 'service'>('material');
    const [unmatchedCount, setUnmatchedCount] = useState(0);
    const [auditLogsList, setAuditLogsList] = useState<ResourcesAuditLogItem[]>([]);

    // Resource lists
    const [materials, setMaterials] = useState<CatalogResource[]>([]);
    const [tools, setTools] = useState<CatalogResource[]>([]);
    const [assets, setAssets] = useState<CatalogResource[]>([]);
    const [services, setServices] = useState<CatalogResource[]>([]);
    const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

    // Total counts matching filters in db
    const [totalCounts, setTotalCounts] = useState({
        materials: 0,
        tools: 0,
        assets: 0,
        services: 0,
    });

    // Pagination pages
    const [pages, setPages] = useState({
        materials: 1,
        tools: 1,
        assets: 1,
        services: 1,
    });

    // Filter states
    const [materialFilter, setMaterialFilter] = useState('ALL');
    const [toolFilter, setToolFilter] = useState('ALL');
    const [assetFilter, setAssetFilter] = useState('ALL');
    const [serviceFilter, setServiceFilter] = useState('ALL');
    const [activityFilter, setActivityFilter] = useState('ALL');
    const [departmentFilter, setDepartmentFilter] = useState('ALL');
    const [locationFilter, setLocationFilter] = useState('ALL');
    const [sortBy, setSortBy] = useState<'name_asc' | 'name_desc' | 'qty_desc' | 'qty_asc' | 'recent' | 'name' | 'qty'>('name_asc');

    // Subcategory & Group lists (loaded dynamically from database)
    const [subcategories, setSubcategories] = useState<string[]>([]);
    const [groups, setGroups] = useState<string[]>([]);
    const [activeSubcategory, setActiveSubcategory] = useState('ALL');
    const [activeGroup, setActiveGroup] = useState('ALL');

    // Filter pickers
    const showDepartmentPicker = () => {
        const depts = ['All Departments', 'Architecture & Design', 'Site & Construction', 'Operations Hub', 'Office & Admin', 'Procurement'];
        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options: [...depts, 'Cancel'],
                    cancelButtonIndex: depts.length,
                    title: 'Filter by Department',
                },
                (btnIdx) => {
                    if (btnIdx < depts.length) {
                        setDepartmentFilter(btnIdx === 0 ? 'ALL' : depts[btnIdx]);
                    }
                }
            );
        } else {
            Alert.alert(
                'Filter by Department',
                'Select department:',
                depts.map((d, i) => ({
                    text: d,
                    onPress: () => setDepartmentFilter(i === 0 ? 'ALL' : d),
                }))
            );
        }
    };

    const showLocationPicker = () => {
        const locs = ['All Locations', 'Warehouse A', 'Warehouse B', 'Workshop', 'Site Storage C', 'Central Tool Hub'];
        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options: [...locs, 'Cancel'],
                    cancelButtonIndex: locs.length,
                    title: 'Filter by Location',
                },
                (btnIdx) => {
                    if (btnIdx < locs.length) {
                        setLocationFilter(btnIdx === 0 ? 'ALL' : locs[btnIdx]);
                    }
                }
            );
        } else {
            Alert.alert(
                'Filter by Location',
                'Select location:',
                locs.map((l, i) => ({
                    text: l,
                    onPress: () => setLocationFilter(i === 0 ? 'ALL' : l),
                }))
            );
        }
    };

    const showSubcategoryPicker = () => {
        const options = ['All Sub-Categories', ...subcategories.map(smartCapitalize)];
        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options: [...options, 'Cancel'],
                    cancelButtonIndex: options.length,
                    title: 'Filter by Sub-Category',
                },
                (idx) => {
                    if (idx < options.length) {
                        setActiveSubcategory(idx === 0 ? 'ALL' : subcategories[idx - 1]);
                    }
                }
            );
        } else {
            Alert.alert(
                'Filter by Sub-Category',
                'Select sub-category:',
                options.map((opt, i) => ({
                    text: opt,
                    onPress: () => setActiveSubcategory(i === 0 ? 'ALL' : subcategories[i - 1]),
                }))
            );
        }
    };

    const showGroupPicker = () => {
        const options = ['All Groups', ...groups.map(smartCapitalize)];
        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options: [...options, 'Cancel'],
                    cancelButtonIndex: options.length,
                    title: 'Filter by Group',
                },
                (idx) => {
                    if (idx < options.length) {
                        setActiveGroup(idx === 0 ? 'ALL' : groups[idx - 1]);
                    }
                }
            );
        } else {
            Alert.alert(
                'Filter by Group',
                'Select group:',
                options.map((opt, i) => ({
                    text: opt,
                    onPress: () => setActiveGroup(i === 0 ? 'ALL' : groups[i - 1]),
                }))
            );
        }
    };

    const showFilterMenu = () => {
        const isFiltered = departmentFilter !== 'ALL' || locationFilter !== 'ALL' || activeSubcategory !== 'ALL' || activeGroup !== 'ALL';
        const options = [
            `Department: ${departmentFilter === 'ALL' ? 'All' : departmentFilter}`,
            `Location: ${locationFilter === 'ALL' ? 'All' : locationFilter}`,
            ...(subcategories.length > 0 ? [`Sub-Category: ${activeSubcategory === 'ALL' ? 'All' : smartCapitalize(activeSubcategory)}`] : []),
            ...(groups.length > 0 ? [`Group: ${activeGroup === 'ALL' ? 'All' : smartCapitalize(activeGroup)}`] : []),
            ...(isFiltered ? ['Reset All Filters'] : []),
            'Cancel',
        ];
        const cancelIdx = options.length - 1;

        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options,
                    cancelButtonIndex: cancelIdx,
                    destructiveButtonIndex: isFiltered ? options.indexOf('Reset All Filters') : undefined,
                    title: 'Resource Filters',
                },
                (idx) => {
                    if (idx === 0) showDepartmentPicker();
                    else if (idx === 1) showLocationPicker();
                    else if (subcategories.length > 0 && idx === 2) showSubcategoryPicker();
                    else if (groups.length > 0 && idx === (subcategories.length > 0 ? 3 : 2)) showGroupPicker();
                    else if (isFiltered && options[idx] === 'Reset All Filters') {
                        setDepartmentFilter('ALL');
                        setLocationFilter('ALL');
                        setActiveSubcategory('ALL');
                        setActiveGroup('ALL');
                    }
                }
            );
        } else {
            Alert.alert(
                'Resource Filters',
                'Select filter to customize:',
                [
                    { text: `Department (${departmentFilter})`, onPress: showDepartmentPicker },
                    { text: `Location (${locationFilter})`, onPress: showLocationPicker },
                    ...(subcategories.length > 0 ? [{ text: `Sub-Category (${activeSubcategory})`, onPress: showSubcategoryPicker }] : []),
                    ...(groups.length > 0 ? [{ text: `Group (${activeGroup})`, onPress: showGroupPicker }] : []),
                    ...(isFiltered ? [{ text: 'Reset All Filters', onPress: () => {
                        setDepartmentFilter('ALL');
                        setLocationFilter('ALL');
                        setActiveSubcategory('ALL');
                        setActiveGroup('ALL');
                    }}] : []),
                    { text: 'Cancel', style: 'cancel' }
                ]
            );
        }
    };

    const showSortPicker = () => {
        const sortOptions = [
            'Item Name (A to Z)',
            'Item Name (Z to A)',
            'Quantity (High to Low)',
            'Quantity (Low to High)',
            'Recently Updated',
        ];
        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options: [...sortOptions, 'Cancel'],
                    cancelButtonIndex: sortOptions.length,
                    title: 'Sort Resources',
                },
                (btnIdx) => {
                    if (btnIdx === 0) setSortBy('name_asc');
                    else if (btnIdx === 1) setSortBy('name_desc');
                    else if (btnIdx === 2) setSortBy('qty_desc');
                    else if (btnIdx === 3) setSortBy('qty_asc');
                    else if (btnIdx === 4) setSortBy('recent');
                }
            );
        }
    };

    // Detail modal state
    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const [selectedItem, setSelectedItem] = useState<CatalogResource | null>(null);
    const [selectedStock, setSelectedStock] = useState<ProjectStock[]>([]);

    // Helper to map nested Supabase inventory to UI ProjectStock[]
    const getProjectStockList = (item: any): ProjectStock[] => {
        if (!item || !item.resource_inventory) return [];
        return item.resource_inventory.map((inv: any) => {
            const quantity = Number(inv.quantity_in || 0) - Number(inv.quantity_used || 0) + Number(inv.quantity_manual_adj || 0);
            return {
                project: inv.project?.project_code || inv.project?.project_name || 'Global',
                quantity,
                unit: item.unit,
                lastUpdated: inv.updated_at ? new Date(inv.updated_at).toLocaleDateString([], { month: 'short', day: 'numeric' }) : undefined
            };
        });
    };

    const handleItemPress = (item: CatalogResource) => {
        setSelectedItem(item);
        setSelectedStock(getProjectStockList(item));
        setSelectedReceivingItem(null);
        if (!isDesktopWeb) {
            setDetailModalVisible(true);
        }
    };

    const prevSegmentRef = React.useRef(activeSegment);
    useEffect(() => {
        if (!isDesktopWeb) return;
        const segmentChanged = prevSegmentRef.current !== activeSegment;
        prevSegmentRef.current = activeSegment;

        if (activeSegment === 'materials' && materials.length > 0) {
            if (segmentChanged || !selectedItem || (selectedItem.category && selectedItem.category !== 'material')) {
                handleItemPress(materials[0]);
            }
        } else if (activeSegment === 'tools' && tools.length > 0) {
            if (segmentChanged || !selectedItem || (selectedItem.category && selectedItem.category !== 'tool')) {
                handleItemPress(tools[0]);
            }
        } else if (activeSegment === 'assets' && assets.length > 0) {
            if (segmentChanged || !selectedItem || (selectedItem.category && selectedItem.category !== 'asset')) {
                handleItemPress(assets[0]);
            }
        } else if (activeSegment === 'services' && services.length > 0) {
            if (segmentChanged || !selectedItem || (selectedItem.category && selectedItem.category !== 'service')) {
                handleItemPress(services[0]);
            }
        } else if (activeSegment === 'overview') {
            if (!selectedItem && materials.length > 0) {
                handleItemPress(materials[0]);
            }
        }
    }, [isDesktopWeb, activeSegment, materials, tools, assets, services]);

    // ── Helpers ──
    const getStockStatus = (item: CatalogResource): string => {
        const stock = getProjectStockList(item);
        return deriveStatus(item, stock);
    };

    const countByStatus = (items: CatalogResource[], statusFilter: string): number => {
        if (statusFilter === 'ALL') return items.length;
        return items.filter(i => getStockStatus(i) === statusFilter).length;
    };

    const filterByStatus = (items: CatalogResource[], statusFilter: string): CatalogResource[] => {
        if (statusFilter === 'ALL') return items;
        return items.filter(i => getStockStatus(i) === statusFilter);
    };

    // Receiving receipt confirmation handler
    const handleConfirmReceipt = async (item: ReceivingQueueItem, receivedQty: number, notes: string) => {
        const updated = await confirmItemReceipt(item.id, receivedQty, notes);
        if (updated) {
            const queue = await getReceivingQueue();
            setReceivingQueue(queue);
            const isFull = (item.receivedQty + receivedQty) >= item.expectedQty;
            const auditItem: ResourcesAuditLogItem = {
                id: 'aud-' + Date.now(),
                actor: profile?.full_name || 'Admin Lead',
                actorRole: profile?.role || 'Staff',
                action: isFull ? 'Receiving Confirmed (Full Delivery)' : 'Partial Receiving Logged',
                detail: `Received ${receivedQty} ${item.unit} of ${item.itemName} into ${item.location || 'Warehouse A'}.`,
                time: 'Just now',
                category: 'Setup Changes',
                icon: 'checkmark.shield.fill',
                iconColor: '#34C759',
                documentNumber: item.sourceDocNo,
                targetModule: 'Receiving',
                resourceType: item.resourceType,
                oldValue: `Expected: ${item.expectedQty} ${item.unit} | Received: ${item.receivedQty} ${item.unit}`,
                newValue: `Received: ${item.receivedQty + receivedQty} ${item.unit}`,
                affectedRecord: item.itemName,
                dateKey: 'today',
                timestampIso: new Date().toISOString(),
            };
            const currentLogs = await getResourcesAuditLogs();
            await saveResourcesAuditLogs([auditItem, ...currentLogs]);
            setAuditLogsList([auditItem, ...currentLogs]);
            loadOverview();
        }
    };

    // Overview data loader
    const loadOverview = async () => {
        setIsOverviewLoading(true);
        try {
            const [overviewData, queue, unmatched, auditLogs] = await Promise.all([
                fetchResourceOverviewData(),
                getReceivingQueue(),
                getUnmatchedCandidates(),
                getResourcesAuditLogs(),
            ]);
            setOverviewStats(overviewData.stats);
            setActivityLogs(overviewData.activity);
            setReceivingQueue(queue);
            setUnmatchedCount(unmatched.length);
            setAuditLogsList(auditLogs);
        } catch (e) {
            console.error("Error loading overview data:", e);
        } finally {
            setIsOverviewLoading(false);
        }
    };

    // Category data loader
    const loadCategoryData = async (
        category: 'material' | 'tool' | 'asset' | 'service',
        pageNum: number,
        isAppend: boolean = false
    ) => {
        setIsLoading(true);
        try {
            const subFilter = activeSubcategory === 'ALL' ? undefined : activeSubcategory;
            const groupFilterVal = activeGroup === 'ALL' ? undefined : activeGroup;

            const result = await fetchCatalogResources(category, {
                search: searchQuery || undefined,
                subcategory: subFilter,
                group_name: groupFilterVal,
                limit: 50,
                offset: (pageNum - 1) * 50
            });

            if (category === 'material') {
                setMaterials(prev => isAppend ? [...prev, ...result.data] : result.data);
                setTotalCounts(prev => ({ ...prev, materials: result.count }));
            } else if (category === 'tool') {
                setTools(prev => isAppend ? [...prev, ...result.data] : result.data);
                setTotalCounts(prev => ({ ...prev, tools: result.count }));
            } else if (category === 'asset') {
                setAssets(prev => isAppend ? [...prev, ...result.data] : result.data);
                setTotalCounts(prev => ({ ...prev, assets: result.count }));
            } else if (category === 'service') {
                setServices(prev => isAppend ? [...prev, ...result.data] : result.data);
                setTotalCounts(prev => ({ ...prev, services: result.count }));
            }
        } catch (e) {
            console.error(`Error loading ${category} data:`, e);
        } finally {
            setIsLoading(false);
        }
    };

    // Initial data and segment setup
    useEffect(() => {
        getReceivingQueue().then(setReceivingQueue);
        if (['materials', 'tools', 'assets', 'services'].includes(activeSegment)) {
            const cat = activeSegment.substring(0, activeSegment.length - 1);
            setActiveSubcategory('ALL');
            setActiveGroup('ALL');
            
            fetchCatalogSubcategories(cat).then(setSubcategories);
            fetchCatalogGroups(cat).then(setGroups);
        }
    }, [activeSegment]);

    // Update groups options when active subcategory changes
    useEffect(() => {
        if (['materials', 'tools', 'assets', 'services'].includes(activeSegment)) {
            const cat = activeSegment.substring(0, activeSegment.length - 1);
            fetchCatalogGroups(cat, activeSubcategory !== 'ALL' ? activeSubcategory : undefined).then(setGroups);
        }
    }, [activeSubcategory]);

    // Fetch live data when filters or search change
    useEffect(() => {
        if (activeSegment === 'overview' || activeSegment === 'activity') {
            loadOverview();
            return;
        }

        const cat = activeSegment.substring(0, activeSegment.length - 1) as any;
        const delayDebounceFn = setTimeout(() => {
            setPages(prev => ({ ...prev, [activeSegment]: 1 }));
            loadCategoryData(cat, 1, false);
        }, searchQuery ? 400 : 0);

        return () => clearTimeout(delayDebounceFn);
    }, [activeSegment, activeSubcategory, activeGroup, searchQuery]);

    // Handle pagination load more
    const handleLoadMore = () => {
        const cat = activeSegment.substring(0, activeSegment.length - 1) as any;
        const nextPage = (pages as any)[activeSegment] + 1;
        setPages(prev => ({ ...prev, [activeSegment]: nextPage }));
        loadCategoryData(cat, nextPage, true);
    };

    // Pull-to-refresh handler
    const handleRefresh = async () => {
        if (activeSegment === 'overview' || activeSegment === 'activity') {
            await loadOverview();
        } else {
            const cat = activeSegment.substring(0, activeSegment.length - 1) as any;
            setPages(prev => ({ ...prev, [activeSegment]: 1 }));
            await loadCategoryData(cat, 1, false);
        }
    };

    const { refreshing, onRefresh } = usePullToRefresh(handleRefresh);

    const handleAiCleanup = () => {
        Alert.alert(
            'AI Cleanup',
            'AI will analyze the catalog and merge duplicate items. This may take a few seconds. Do you want to proceed?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Proceed',
                    onPress: async () => {
                        setIsLoading(true);
                        try {
                            const res = await triggerAiCleanupApi();
                            if (res.success) {
                                Alert.alert('Success', `AI successfully merged ${res.mergedCount || 0} duplicate items!`);
                                handleRefresh();
                            } else {
                                Alert.alert('Error', res.error || 'Failed to run AI cleanup. Please make sure the Next.js server is running locally.');
                            }
                        } catch (err: any) {
                            Alert.alert('Error', err.message || 'An unexpected error occurred.');
                        } finally {
                            setIsLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const handleNewResource = (cat?: 'material' | 'tool' | 'asset' | 'service') => {
        if (cat) {
            setAddResourceCategory(cat);
            setAddResourceModalVisible(true);
            return;
        }
        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options: ['Add Material', 'Add Tool', 'Add Asset', 'Add Service', 'Cancel'],
                    cancelButtonIndex: 4,
                    title: 'New Resource Category',
                },
                (idx) => {
                    if (idx === 0) { setAddResourceCategory('material'); setAddResourceModalVisible(true); }
                    else if (idx === 1) { setAddResourceCategory('tool'); setAddResourceModalVisible(true); }
                    else if (idx === 2) { setAddResourceCategory('asset'); setAddResourceModalVisible(true); }
                    else if (idx === 3) { setAddResourceCategory('service'); setAddResourceModalVisible(true); }
                }
            );
        } else {
            setAddResourceCategory('material');
            setAddResourceModalVisible(true);
        }
    };

    const handleNewReceiving = () => {
        const pending = receivingQueue.find(i => i.status === 'awaiting' || i.status === 'partial');
        if (pending) {
            setSelectedReceivingItem(pending);
            setReceivingModalVisible(true);
        } else {
            Alert.alert('Receiving Queue', 'All current paid purchase items have been received into inventory.');
        }
    };

    const handleNewTransfer = () => {
        Alert.alert('New Transfer', 'Initiate an internal stock movement between project locations or handover tool custody.');
    };

    const handleStockAdjustment = () => {
        Alert.alert('Stock Adjustment', 'Perform physical cycle count discrepancy reconciliation.');
    };

    const showResourcesActionSheet = () => {
        const options = [
            'New Resource',
            'New Receiving',
            'New Transfer',
            'Stock Adjustment',
            ...(isManager ? ['AI Cleanup'] : []),
            'Cancel'
        ];
        const cancelButtonIndex = options.length - 1;

        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options,
                    cancelButtonIndex,
                    title: 'Resource Actions',
                },
                (buttonIndex) => {
                    if (buttonIndex === 0) handleNewResource();
                    else if (buttonIndex === 1) handleNewReceiving();
                    else if (buttonIndex === 2) handleNewTransfer();
                    else if (buttonIndex === 3) handleStockAdjustment();
                    else if (isManager && buttonIndex === 4) handleAiCleanup();
                }
            );
        } else {
            setShowActionsSheet(true);
        }
    };

    useEffect(() => {
        if (isFocused) {
            if (activeSegment === 'setup') {
                setContextAction(null as any);
                return;
            }
            setContextAction({
                label: 'Add',
                icon: 'add-outline',
                sfIcon: 'plus',
                action: showResourcesActionSheet,
                options: [
                    {
                        label: 'New Resource',
                        icon: 'add-circle-outline',
                        sfIcon: 'plus.circle.fill',
                        description: 'Register material, tool, asset, or service to catalog',
                        action: handleNewResource,
                    },
                    {
                        label: 'New Receiving',
                        icon: 'cube-outline',
                        sfIcon: 'shippingbox.and.arrow.backward.fill',
                        description: 'Confirm delivery or log incoming PO shipment',
                        action: handleNewReceiving,
                    },
                    {
                        label: 'New Transfer',
                        icon: 'swap-horizontal-outline',
                        sfIcon: 'arrow.triangle.2.circlepath',
                        description: 'Transfer stock between locations or handover custody',
                        action: handleNewTransfer,
                    },
                    {
                        label: 'Stock Adjustment',
                        icon: 'create-outline',
                        sfIcon: 'square.and.pencil',
                        description: 'Cycle count reconciliation or quantity adjustments',
                        action: handleStockAdjustment,
                    },
                    ...(isManager ? [{
                        label: 'AI Cleanup',
                        icon: 'sparkles-outline',
                        sfIcon: 'sparkles',
                        description: 'Scan and merge catalog duplicate items using AI',
                        action: handleAiCleanup,
                    }] : [])
                ]
            });
        }
    }, [isFocused, setContextAction, activeSegment, isManager, receivingQueue]);

    const getAddAction = (segment: string) => {
        switch (segment) {
            case 'materials': return { title: 'Add Material', action: () => Alert.alert('Add Material') };
            case 'tools': return { title: 'Add Tool', action: () => Alert.alert('Add Tool') };
            case 'assets': return { title: 'Add Asset', action: () => Alert.alert('Add Asset') };
            case 'services': return { title: 'Add Service', action: () => Alert.alert('Add Service') };
            case 'activity': return { title: 'Add Log', action: () => Alert.alert('Add Log') };
            case 'overview': return { title: 'Add Record', action: showResourcesActionSheet };
            default: return null;
        }
    };

    const addAction = useMemo(() => getAddAction(activeSegment), [activeSegment]);

    const addMenuActions: ContextMenuAction[] = useMemo(() => {
        const list: ContextMenuAction[] = [
            { title: 'Add Material', systemIcon: 'shippingbox.fill' },
            { title: 'Add Tool', systemIcon: 'hammer.fill' },
            { title: 'Add Asset', systemIcon: 'laptopcomputer' },
            { title: 'Add Service', systemIcon: 'wrench.and.screwdriver.fill' },
        ];
        if (isManager || activeSegment === 'overview') {
            list.push(
                { title: 'New Receiving', systemIcon: 'arrow.down.doc.fill' },
                { title: 'New Transfer', systemIcon: 'arrow.left.arrow.right' },
                { title: 'Stock Adjustment', systemIcon: 'slider.horizontal.3' }
            );
        }
        return list;
    }, [isManager, activeSegment]);

    const handleAddMenuPress = (e: { nativeEvent: { index: number; name: string } }) => {
        const name = e.nativeEvent.name || '';
        const idx = e.nativeEvent.index;
        if (name === 'Add Material' || idx === 0) handleNewResource('material');
        else if (name === 'Add Tool' || idx === 1) handleNewResource('tool');
        else if (name === 'Add Asset' || idx === 2) handleNewResource('asset');
        else if (name === 'Add Service' || idx === 3) handleNewResource('service');
        else if (name === 'New Receiving' || idx === 4) handleNewReceiving();
        else if (name === 'New Transfer' || idx === 5) handleNewTransfer();
        else if (name === 'Stock Adjustment' || idx === 6) handleStockAdjustment();
    };

    const actions = useMemo(() => {
        if (!isAuthenticated || activeSegment === 'setup') return [];
        const baseActions: HeaderToolbarAction[] = [];

        baseActions.push({
            id: 'add',
            icon: 'add' as any,
            image: 'plus',
            isPrimary: true,
            tintColor: '#007AFF',
            menuActions: addMenuActions,
            onMenuPress: handleAddMenuPress,
            onPress: () => {
                if (activeSegment === 'materials') handleNewResource('material');
                else if (activeSegment === 'tools') handleNewResource('tool');
                else if (activeSegment === 'assets') handleNewResource('asset');
                else if (activeSegment === 'services') handleNewResource('service');
                else handleNewResource('material');
            }
        });

        if (isManager) {
            baseActions.push({
                id: 'cleanup',
                icon: 'sparkles' as any,
                image: 'sparkles',
                tintColor: textColor,
                onPress: handleAiCleanup,
                title: 'AI Cleanup'
            });
        }

        return baseActions;
    }, [textColor, isManager, activeSegment, receivingQueue, addMenuActions]);

    const cardBg = isDark ? '#1C1C1E' : '#FFF';
    const cardBorder = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';

    // ── Empty State ──
    const EmptyState = ({ segment }: { segment: string }) => {
        return (
            <GlassView intensity={isDark ? 5 : 20} style={s.emptyState}>
                <PlatformIcon
                    name="tray.fill"
                    size={32}
                    tintColor={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}
                />
                <Text style={[s.emptyText, { color: isDark ? '#A1A1A6' : '#8E8E93' }]}>No {segment} records found yet.</Text>
            </GlassView>
        );
    };

    // ── Activity Log Card ──
    const ActivityLogCard = ({ log }: { log: ActivityLog }) => {
        const getIconColor = () => {
            if (log.type === 'material') return '#007AFF';
            if (log.type === 'tool') return '#AF52DE';
            if (log.type === 'service') return '#34C759';
            return '#FF9500';
        };

        const getIcon = () => {
            if (log.type === 'material') return 'shippingbox.fill';
            if (log.type === 'tool') return 'hammer.fill';
            if (log.type === 'service') return 'briefcase.fill';
            return 'car.fill';
        };

        return (
            <TouchableOpacity
                activeOpacity={0.7}
                style={[s.compactCard, { backgroundColor: cardBg, borderColor: cardBorder }]}
            >
                <View style={s.cardBody}>
                    <View style={[s.logIconContainer, { backgroundColor: getIconColor() + '15' }]}>
                        <PlatformIcon name={getIcon() as any} size={16} tintColor={getIconColor()} />
                    </View>
                    <View style={s.cardDetails}>
                        <Text style={[s.cardTitle, { color: textColor }]} numberOfLines={1}>{log.title}</Text>
                        <Text style={[s.cardSubtext, { color: subtextColor }]} numberOfLines={2}>{log.description}</Text>
                        <View style={s.cardMeta}>
                            <Text style={[s.cardMetaText, { color: subtextColor }]}>{log.user} • {log.time}</Text>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    // ── Summary Filter Cards ──
    const renderFilterCards = (
        filterState: string,
        setFilterState: (val: string) => void,
        configs: any[]
    ) => (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={[s.summaryScroll, { marginBottom: 12 }]}
            contentContainerStyle={s.summaryScrollContent}
            decelerationRate="fast"
            snapToInterval={150 + 12}
        >
            {configs.map((config) => (
                <ResourceSummaryCard
                    key={config.id}
                    icon={config.icon as any}
                    iconColor={config.color}
                    value={config.count.toString()}
                    label=""
                    subValue={config.label}
                    style={{
                        width: 150,
                        marginRight: 12,
                        marginBottom: 0,
                        backgroundColor: filterState === config.id && filterState !== 'overview' ? config.color + (isDark ? '25' : '10') : cardBg,
                    }}
                    onPress={() => setFilterState(config.id)}
                />
            ))}
        </ScrollView>
    );



    const renderLoadMoreButton = () => {
        const catName = activeSegment;
        const totalLoaded = catName === 'materials' ? materials.length :
                            catName === 'tools' ? tools.length :
                            catName === 'assets' ? assets.length : services.length;
        const totalCount = catName === 'materials' ? totalCounts.materials :
                           catName === 'tools' ? totalCounts.tools :
                           catName === 'assets' ? totalCounts.assets : totalCounts.services;

        if (totalLoaded >= totalCount) return null;

        return (
            <TouchableOpacity
                onPress={handleLoadMore}
                activeOpacity={0.8}
                disabled={isLoading}
                style={[s.loadMoreBtn, { backgroundColor: cardBg, borderColor: cardBorder }]}
            >
                <Text style={[s.loadMoreBtnText, { color: tintColor }]}>
                    {isLoading ? "Loading..." : `Load More (${totalLoaded} of ${totalCount})`}
                </Text>
            </TouchableOpacity>
        );
    };

    // ── Tab Renderers ──
    const renderOverview = () => {
        const totalResources = overviewStats.materials + overviewStats.tools + overviewStats.assets + overviewStats.services;
        const stats = [
            { id: 'overview', label: 'All Resources', count: totalResources, icon: 'chart.bar.fill', color: '#8E8E93' },
            { id: 'materials', label: 'Materials', count: overviewStats.materials, icon: 'shippingbox.fill', color: '#007AFF' },
            { id: 'tools', label: 'Tools', count: overviewStats.tools, icon: 'hammer.fill', color: '#AF52DE' },
            { id: 'assets', label: 'Assets', count: overviewStats.assets, icon: 'car.fill', color: '#FF9500' },
            { id: 'services', label: 'Services', count: overviewStats.services, icon: 'briefcase.fill', color: '#34C759' },
        ];

        // Alerts computation
        const overviewAlerts: ResourceAlertItem[] = [
            {
                id: 'al-unmatched',
                type: 'unmatched',
                title: 'Unmatched Purchasing Items',
                subtitle: `${unmatchedCount} candidate invoices pending item master matching`,
                count: unmatchedCount,
                severity: 'info',
                onPress: () => handleNewReceiving(),
            },
            {
                id: 'al-low-stock',
                type: 'low_stock',
                title: 'Low Stock Alert',
                subtitle: 'Semen Gresik 40kg, Supreme Kabel 3x2.5 below safety buffer',
                count: 2,
                severity: 'warning',
                onPress: () => setActiveSegment('materials'),
            },
            {
                id: 'al-damaged',
                type: 'damaged',
                title: 'Damaged / Under Repair',
                subtitle: 'Makita HP1630 Rotary Hammer scheduled for maintenance',
                count: 1,
                severity: 'warning',
                onPress: () => setActiveSegment('tools'),
            },
        ];

        const attentionCount = 4;
        const criticalCount = 3;
        const readyCount = totalResources > (attentionCount + criticalCount)
            ? totalResources - attentionCount - criticalCount
            : 14;
        const pulseTotal = totalResources > 0 ? totalResources : (readyCount + attentionCount + criticalCount);

        return (
            <View style={s.subModuleContainer}>
                {/* 1. Resource Pulse Hero Card */}
                <ResourcePulseCard
                    readyCount={readyCount}
                    attentionCount={attentionCount}
                    criticalCount={criticalCount}
                    totalCount={pulseTotal}
                    monthLabel="Sep"
                />

                {/* 2. Top Stat Cards */}
                {renderFilterCards('overview', setActiveSegment, stats)}

                {/* 2. Receiving Summary */}
                <OverviewReceivingSection
                    items={receivingQueue}
                    onItemPress={(item) => {
                        setSelectedReceivingItem(item);
                        setSelectedItem({
                            id: item.id,
                            name: item.itemName,
                            category: (item.resourceType || 'material') as any,
                            unit: item.unit,
                            description: `Receiving Document: ${item.sourceDocNo}\nVendor: ${item.vendor || 'N/A'}\nExpected: ${item.expectedQty} ${item.unit}\nReceived: ${item.receivedQty} ${item.unit}\nLocation: ${item.location || 'Warehouse A'}\nDepartment: ${(item as any).department || 'Operations'}\nStatus: ${item.status.toUpperCase()}`,
                            min_stock: 0,
                        } as any);
                        setSelectedStock([{
                            project: item.location || 'Warehouse Receiving',
                            quantity: item.receivedQty,
                            unit: item.unit,
                        }]);
                        if (!isDesktopWeb) {
                            setReceivingModalVisible(true);
                        }
                    }}
                />

                {/* 3. Resource Alerts */}
                <OverviewAlertsSection alerts={overviewAlerts} />

                {/* 4. Recent Activity */}
                <View style={{ gap: 12 }}>
                    <TouchableOpacity
                        onPress={() => setActiveSegment('activity')}
                        style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 }}
                    >
                        <Text style={[s.sectionTitle, { color: textColor }]}>Recent Activity</Text>
                        <PlatformIcon name="chevron.right" size={14} tintColor={isDark ? '#A1A1A6' : '#8E8E93'} style={{ marginLeft: 8 }} />
                    </TouchableOpacity>

                    {isOverviewLoading && activityLogs.length === 0 && auditLogsList.length === 0 ? (
                        <View style={s.loadingContainer}>
                            <Text style={[s.loadingText, { color: textColor }]}>Loading activity logs...</Text>
                        </View>
                    ) : (
                        <View style={s.listContainer}>
                            {auditLogsList.slice(0, 4).map((auditLog) => (
                                <TouchableOpacity
                                    key={auditLog.id}
                                    activeOpacity={0.7}
                                    style={[s.compactCard, { backgroundColor: cardBg }]}
                                    onPress={() => Alert.alert(auditLog.action, auditLog.detail)}
                                >
                                    <View style={s.cardBody}>
                                        <View style={[s.logIconContainer, { backgroundColor: (auditLog.iconColor || '#007AFF') + '15' }]}>
                                            <PlatformIcon
                                                name={(auditLog.icon || 'list.bullet') as any}
                                                size={16}
                                                tintColor={auditLog.iconColor || '#007AFF'}
                                            />
                                        </View>
                                        <View style={s.cardDetails}>
                                            <Text style={[s.cardTitle, { color: textColor }]} numberOfLines={1}>
                                                {auditLog.action}
                                            </Text>
                                            <Text style={[s.cardSubtext, { color: subtextColor }]} numberOfLines={2}>
                                                {auditLog.detail}
                                            </Text>
                                            <View style={s.cardMeta}>
                                                <Text style={[s.cardMetaText, { color: subtextColor }]}>
                                                    {auditLog.actor} ({auditLog.actorRole}) • {auditLog.time}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            ))}
                            {auditLogsList.length === 0 && activityLogs.length === 0 && <EmptyState segment="activity" />}
                        </View>
                    )}
                </View>
            </View>
        );
    };

    const renderToolbar = () => {
        const isFiltered = departmentFilter !== 'ALL' || locationFilter !== 'ALL' || activeSubcategory !== 'ALL' || activeGroup !== 'ALL';
        const activeFilterCount = [
            departmentFilter !== 'ALL',
            locationFilter !== 'ALL',
            activeSubcategory !== 'ALL',
            activeGroup !== 'ALL',
        ].filter(Boolean).length;

        const sortOptionsList = [
            { id: 'name_asc', title: 'Item Name (A to Z)' },
            { id: 'name_desc', title: 'Item Name (Z to A)' },
            { id: 'qty_desc', title: 'Quantity (High to Low)' },
            { id: 'qty_asc', title: 'Quantity (Low to High)' },
            { id: 'recent', title: 'Recently Updated' },
        ];
        const departmentOptions = ['All Departments', 'Architecture & Design', 'Site & Construction', 'Operations Hub', 'Office & Admin', 'Procurement'];
        const locationOptions = ['All Locations', 'Warehouse A', 'Warehouse B', 'Workshop', 'Site Storage C', 'Central Tool Hub'];

        const sortActions: ContextMenuAction[] = sortOptionsList.map(opt => ({
            title: opt.title,
            state: (sortBy === opt.id || (sortBy === 'name' && opt.id === 'name_asc') || (sortBy === 'qty' && opt.id === 'qty_desc')) ? 'on' : 'off',
        }));

        const getSortLabel = () => {
            switch (sortBy) {
                case 'name_desc': return 'Name (Z-A)';
                case 'qty_desc':
                case 'qty': return 'Qty (High)';
                case 'qty_asc': return 'Qty (Low)';
                case 'recent': return 'Recent';
                default: return 'Name (A-Z)';
            }
        };

        const filterActions: ContextMenuAction[] = [
            {
                title: 'Department',
                actions: departmentOptions.map(d => ({
                    title: d,
                    state: (departmentFilter === 'ALL' && d === 'All Departments') || departmentFilter === d ? 'on' : 'off',
                })),
            },
            {
                title: 'Location',
                actions: locationOptions.map(l => ({
                    title: l,
                    state: (locationFilter === 'ALL' && l === 'All Locations') || locationFilter === l ? 'on' : 'off',
                })),
            },
            ...(subcategories.length > 0 ? [{
                title: 'Sub-Category',
                actions: ['All Sub-Categories', ...subcategories.map(smartCapitalize)].map((sub, i) => ({
                    title: sub,
                    state: (activeSubcategory === 'ALL' && i === 0) || activeSubcategory.toLowerCase() === sub.toLowerCase() ? 'on' : 'off',
                })),
            }] : []),
            ...(groups.length > 0 ? [{
                title: 'Group',
                actions: ['All Groups', ...groups.map(smartCapitalize)].map((grp, i) => ({
                    title: grp,
                    state: (activeGroup === 'ALL' && i === 0) || activeGroup.toLowerCase() === grp.toLowerCase() ? 'on' : 'off',
                })),
            }] : []),
            ...(isFiltered ? [{
                title: 'Reset All Filters',
                destructive: true,
            }] : []),
        ];

        return (
            <View style={s.toolbarWrapper}>
                <View style={s.toolbarRow}>
                    {/* Full-width Search Bar in Single Row */}
                    <View style={[s.searchBarPill, { backgroundColor: cardBg }]}>
                        <PlatformIcon name="magnifyingglass" size={14} tintColor={subtextColor} />
                        <TextInput
                            style={[s.searchInput, { color: textColor }]}
                            placeholder="Search..."
                            placeholderTextColor={subtextColor}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            clearButtonMode="while-editing"
                            returnKeyType="search"
                        />
                        {searchQuery.length > 0 && Platform.OS !== 'ios' && (
                            <TouchableOpacity onPress={() => setSearchQuery('')} style={s.searchClearBtn}>
                                <PlatformIcon name="xmark.circle.fill" size={14} tintColor={subtextColor} />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Native Pull-Down Sort Menu (Neutral styling) */}
                    <ContextMenu
                        actions={sortActions}
                        dropdownMenuMode={true}
                        onPress={(e) => {
                            const selected = sortOptionsList[e.nativeEvent.index];
                            if (selected) setSortBy(selected.id as any);
                        }}
                    >
                        <View style={[s.toolbarActionPill, { backgroundColor: cardBg }]}>
                            <PlatformIcon
                                name="arrow.up.arrow.down"
                                size={12}
                                tintColor={subtextColor}
                            />
                            <Text style={[s.toolbarActionText, { color: textColor }]}>
                                {getSortLabel()}
                            </Text>
                            <PlatformIcon name="chevron.down" size={10} tintColor={subtextColor} />
                        </View>
                    </ContextMenu>

                    {/* Native Pull-Down Filter Menu */}
                    <ContextMenu
                        actions={filterActions}
                        dropdownMenuMode={true}
                        onPress={(e) => {
                            const title = e.nativeEvent.name;
                            if (title === 'Reset All Filters') {
                                setDepartmentFilter('ALL');
                                setLocationFilter('ALL');
                                setActiveSubcategory('ALL');
                                setActiveGroup('ALL');
                                return;
                            }
                            if (departmentOptions.includes(title)) {
                                setDepartmentFilter(title === 'All Departments' ? 'ALL' : title);
                                return;
                            }
                            if (locationOptions.includes(title)) {
                                setLocationFilter(title === 'All Locations' ? 'ALL' : title);
                                return;
                            }
                            if (title === 'All Sub-Categories') {
                                setActiveSubcategory('ALL');
                                return;
                            }
                            const foundSub = subcategories.find(sub => smartCapitalize(sub) === title);
                            if (foundSub) {
                                setActiveSubcategory(foundSub);
                                return;
                            }
                            if (title === 'All Groups') {
                                setActiveGroup('ALL');
                                return;
                            }
                            const foundGrp = groups.find(grp => smartCapitalize(grp) === title);
                            if (foundGrp) {
                                setActiveGroup(foundGrp);
                                return;
                            }
                        }}
                    >
                        <View
                            style={[
                                s.toolbarActionPill,
                                { backgroundColor: cardBg },
                                isFiltered && { backgroundColor: tintColor + '18' }
                            ]}
                        >
                            <PlatformIcon
                                name="line.3.horizontal.decrease"
                                size={12}
                                tintColor={isFiltered ? tintColor : subtextColor}
                            />
                            <Text style={[s.toolbarActionText, { color: isFiltered ? tintColor : textColor }]}>
                                Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
                            </Text>
                            <PlatformIcon name="chevron.down" size={10} tintColor={subtextColor} />
                        </View>
                    </ContextMenu>
                </View>
            </View>
        );
    };

    const isTypeMatch = (rType: string, cType: string) => (rType || '').toLowerCase().startsWith((cType || '').toLowerCase());

    const renderSharedCategoryTab = (
        categoryType: 'material' | 'tool' | 'asset' | 'service',
        items: CatalogResource[],
        filterState: string,
        setFilterState: (val: string) => void,
        categoryName: string,
        statsConfig: { id: string; label: string; count: number; icon: string; color: string }[],
    ) => {
        const typeReceiving = receivingQueue.filter(r => isTypeMatch(r.resourceType, categoryType));
        const awaitingList = typeReceiving.filter(r => r.status === 'awaiting');
        const partialList = typeReceiving.filter(r => r.status === 'partial');

        let displayReceiving: ReceivingQueueItem[] = [];
        if (filterState === 'ALL') {
            displayReceiving = [...awaitingList, ...partialList];
        } else if (filterState === 'awaiting') {
            displayReceiving = awaitingList;
        } else if (filterState === 'partial') {
            displayReceiving = partialList;
        }

        // Filter catalog items
        let filteredCatalog = items;
        if (filterState === 'awaiting' || filterState === 'partial') {
            filteredCatalog = [];
        } else if (filterState !== 'ALL') {
            if (categoryType === 'tool') {
                if (filterState === 'Available') {
                    filteredCatalog = items.filter(i => ['Available', 'In Stock'].includes(getStockStatus(i)));
                } else if (filterState === 'In Use') {
                    filteredCatalog = items.filter(i => ['In Use', 'Out of Stock'].includes(getStockStatus(i)));
                } else if (filterState === 'Maintenance') {
                    filteredCatalog = items.filter(i => getStockStatus(i) === 'Maintenance');
                } else {
                    filteredCatalog = filterByStatus(items, filterState);
                }
            } else if (categoryType === 'asset') {
                if (filterState === 'Active') {
                    filteredCatalog = items.filter(i => ['Active', 'In Stock', 'Available'].includes(getStockStatus(i)));
                } else if (filterState === 'Assigned') {
                    filteredCatalog = items.filter(i => ['Assigned', 'In Use'].includes(getStockStatus(i)));
                } else if (filterState === 'Maintenance') {
                    filteredCatalog = items.filter(i => ['Maintenance', 'Retired'].includes(getStockStatus(i)));
                } else {
                    filteredCatalog = filterByStatus(items, filterState);
                }
            } else if (categoryType === 'service') {
                if (filterState === 'In Progress') {
                    filteredCatalog = items.filter(i => ['In Progress', 'In Stock'].includes(getStockStatus(i)));
                } else if (filterState === 'Completed') {
                    filteredCatalog = items.filter(i => ['Completed', 'In Stock'].includes(getStockStatus(i)));
                } else if (filterState === 'Cancelled') {
                    filteredCatalog = items.filter(i => ['Cancelled', 'Out of Stock'].includes(getStockStatus(i)));
                } else {
                    filteredCatalog = filterByStatus(items, filterState);
                }
            } else {
                filteredCatalog = filterByStatus(items, filterState);
            }
        }

        // Apply subcategory filter
        if (activeSubcategory !== 'ALL') {
            filteredCatalog = filteredCatalog.filter(i => (i.subcategory || '').toLowerCase() === activeSubcategory.toLowerCase());
        }

        // Apply group filter
        if (activeGroup !== 'ALL') {
            filteredCatalog = filteredCatalog.filter(i => (i.group_name || '').toLowerCase() === activeGroup.toLowerCase());
        }

        // Apply department filter
        if (departmentFilter !== 'ALL') {
            displayReceiving = displayReceiving.filter(r => (r.department || '').toLowerCase().includes(departmentFilter.toLowerCase()));
            filteredCatalog = filteredCatalog.filter(i => (i as any).department?.toLowerCase().includes(departmentFilter.toLowerCase()) || true);
        }

        // Apply location filter
        if (locationFilter !== 'ALL') {
            displayReceiving = displayReceiving.filter(r => (r.location || '').toLowerCase().includes(locationFilter.toLowerCase()));
        }

        // Apply search query
        if (searchQuery.trim().length > 0) {
            const q = searchQuery.toLowerCase().trim();
            displayReceiving = displayReceiving.filter(r => r.itemName.toLowerCase().includes(q) || r.sourceDocNo.toLowerCase().includes(q));
            filteredCatalog = filteredCatalog.filter(i => i.name.toLowerCase().includes(q) || (i.description && i.description.toLowerCase().includes(q)));
        }

        // Apply sorting
        if (sortBy === 'name' || sortBy === 'name_asc') {
            filteredCatalog = [...filteredCatalog].sort((a, b) => a.name.localeCompare(b.name));
        } else if (sortBy === 'name_desc') {
            filteredCatalog = [...filteredCatalog].sort((a, b) => b.name.localeCompare(a.name));
        } else if (sortBy === 'qty' || sortBy === 'qty_desc') {
            filteredCatalog = [...filteredCatalog].sort((a, b) => {
                const stockA = getProjectStockList(a).reduce((acc, c) => acc + c.quantity, 0);
                const stockB = getProjectStockList(b).reduce((acc, c) => acc + c.quantity, 0);
                return stockB - stockA;
            });
        } else if (sortBy === 'qty_asc') {
            filteredCatalog = [...filteredCatalog].sort((a, b) => {
                const stockA = getProjectStockList(a).reduce((acc, c) => acc + c.quantity, 0);
                const stockB = getProjectStockList(b).reduce((acc, c) => acc + c.quantity, 0);
                return stockA - stockB;
            });
        } else if (sortBy === 'recent') {
            filteredCatalog = [...filteredCatalog].sort((a, b) => {
                const timeA = new Date((a as any).updated_at || (a as any).created_at || 0).getTime();
                const timeB = new Date((b as any).updated_at || (b as any).created_at || 0).getTime();
                return timeB - timeA;
            });
        }

        const totalItemsCount = displayReceiving.length + filteredCatalog.length;

        return (
            <View style={s.subModuleContainer}>
                {renderFilterCards(filterState, setFilterState, statsConfig)}

                {/* Toolbar: Search Icon Button, Sort Pill, Filter Pull-down */}
                {renderToolbar()}

                <View style={s.listContainer}>
                    {isLoading && items.length === 0 ? (
                        <View style={s.loadingContainer}>
                            <Text style={[s.loadingText, { color: textColor }]}>Loading {categoryName}...</Text>
                        </View>
                    ) : totalItemsCount > 0 ? (
                        <>
                            {/* Receiving queue items in this category */}
                            {displayReceiving.map((rec) => (
                                <ResourceCard
                                    key={'rec-' + rec.id}
                                    item={{
                                        id: rec.id,
                                        name: rec.itemName,
                                        code: rec.sourceDocNo,
                                        category: rec.resourceType,
                                        unit: rec.unit,
                                        expectedQty: rec.expectedQty,
                                        receivedQty: rec.receivedQty,
                                        status: rec.status,
                                        department: rec.department,
                                        location: rec.location,
                                        vendor: rec.vendor,
                                        isReceivingItem: true,
                                    }}
                                    isSelected={isDesktopWeb && selectedReceivingItem?.id === rec.id}
                                    onDetailsPress={() => {
                                        setSelectedReceivingItem(rec);
                                        setSelectedItem({
                                            id: rec.id,
                                            name: rec.itemName,
                                            category: (rec.resourceType || 'material') as any,
                                            unit: rec.unit,
                                            description: `Receiving Document: ${rec.sourceDocNo}\nVendor: ${rec.vendor || 'N/A'}\nExpected: ${rec.expectedQty} ${rec.unit}\nReceived: ${rec.receivedQty} ${rec.unit}\nLocation: ${rec.location || 'Warehouse A'}\nDepartment: ${rec.department || 'Operations'}\nStatus: ${rec.status.toUpperCase()}`,
                                            min_stock: 0,
                                        } as any);
                                        setSelectedStock([{
                                            project: rec.location || 'Warehouse Receiving',
                                            quantity: rec.receivedQty,
                                            unit: rec.unit,
                                        }]);
                                        if (!isDesktopWeb) {
                                            setReceivingModalVisible(true);
                                        }
                                    }}
                                />
                            ))}

                            {/* Catalog Resources */}
                            {filteredCatalog.map((item) => (
                                <ResourceCard
                                    key={item.id}
                                    item={item}
                                    projectStock={getProjectStockList(item)}
                                    isSelected={isDesktopWeb && selectedItem?.id === item.id}
                                    onDetailsPress={() => handleItemPress(item)}
                                />
                            ))}

                            {/* Load More Pagination Button */}
                            {renderLoadMoreButton()}
                        </>
                    ) : (
                        <EmptyState segment={categoryName} />
                    )}
                </View>
            </View>
        );
    };

    const renderMaterials = () => {
        const awaitingCount = receivingQueue.filter(r => isTypeMatch(r.resourceType, 'material') && r.status === 'awaiting').length;
        const partialCount = receivingQueue.filter(r => isTypeMatch(r.resourceType, 'material') && r.status === 'partial').length;
        const stats = [
            { id: 'ALL', label: 'All Materials', count: totalCounts.materials + awaitingCount + partialCount, icon: 'shippingbox.fill', color: '#007AFF' },
            { id: 'awaiting', label: 'Awaiting Receipt', count: awaitingCount, icon: 'clock.fill', color: '#007AFF' },
            { id: 'partial', label: 'Partial', count: partialCount, icon: 'arrow.triangle.2.circlepath', color: '#FF9500' },
            { id: 'Low Stock', label: 'Low Stock', count: countByStatus(materials, 'Low Stock'), icon: 'clock.fill', color: '#FF9500' },
            { id: 'Out of Stock', label: 'Out of Stock', count: countByStatus(materials, 'Out of Stock'), icon: 'exclamationmark.circle.fill', color: '#FF3B30' },
        ];
        return renderSharedCategoryTab('material', materials, materialFilter, setMaterialFilter, 'materials', stats);
    };

    const renderTools = () => {
        const awaitingCount = receivingQueue.filter(r => isTypeMatch(r.resourceType, 'tool') && r.status === 'awaiting').length;
        const stats = [
            { id: 'ALL', label: 'All Tools', count: totalCounts.tools + awaitingCount, icon: 'hammer.fill', color: '#AF52DE' },
            { id: 'awaiting', label: 'Awaiting Receipt', count: awaitingCount, icon: 'clock.fill', color: '#007AFF' },
            { id: 'Available', label: 'Available', count: countByStatus(tools, 'Available') + countByStatus(tools, 'In Stock'), icon: 'checkmark.circle.fill', color: '#34C759' },
            { id: 'In Use', label: 'In Use', count: countByStatus(tools, 'In Use') + countByStatus(tools, 'Out of Stock'), icon: 'person.fill', color: '#007AFF' },
            { id: 'Maintenance', label: 'Maintenance', count: countByStatus(tools, 'Maintenance'), icon: 'wrench.fill', color: '#FF9500' },
        ];
        return renderSharedCategoryTab('tool', tools, toolFilter, setToolFilter, 'tools', stats);
    };

    const renderAssets = () => {
        const awaitingCount = receivingQueue.filter(r => isTypeMatch(r.resourceType, 'asset') && r.status === 'awaiting').length;
        const stats = [
            { id: 'ALL', label: 'All Assets', count: totalCounts.assets + awaitingCount, icon: 'car.fill', color: '#FF9500' },
            { id: 'awaiting', label: 'Awaiting Receipt', count: awaitingCount, icon: 'clock.fill', color: '#007AFF' },
            { id: 'Active', label: 'Active', count: countByStatus(assets, 'Active') + countByStatus(assets, 'Available') + countByStatus(assets, 'In Stock'), icon: 'checkmark.circle.fill', color: '#34C759' },
            { id: 'Assigned', label: 'Assigned', count: countByStatus(assets, 'Assigned') + countByStatus(assets, 'In Use'), icon: 'person.crop.circle.fill', color: '#007AFF' },
            { id: 'Maintenance', label: 'Maintenance / Retired', count: countByStatus(assets, 'Maintenance') + countByStatus(assets, 'Retired'), icon: 'wrench.fill', color: '#8E8E93' },
        ];
        return renderSharedCategoryTab('asset', assets, assetFilter, setAssetFilter, 'assets', stats);
    };

    const renderServices = () => {
        const awaitingCount = receivingQueue.filter(r => isTypeMatch(r.resourceType, 'service') && r.status === 'awaiting').length;
        const stats = [
            { id: 'ALL', label: 'All Services', count: totalCounts.services + awaitingCount, icon: 'briefcase.fill', color: '#34C759' },
            { id: 'awaiting', label: 'Awaiting Confirmation', count: awaitingCount, icon: 'clock.fill', color: '#FF9500' },
            { id: 'In Progress', label: 'In Progress', count: countByStatus(services, 'In Progress') + countByStatus(services, 'In Stock'), icon: 'play.circle.fill', color: '#007AFF' },
            { id: 'Completed', label: 'Completed', count: countByStatus(services, 'Completed'), icon: 'checkmark.seal.fill', color: '#34C759' },
            { id: 'Cancelled', label: 'Cancelled', count: countByStatus(services, 'Cancelled') + countByStatus(services, 'Out of Stock'), icon: 'xmark.circle.fill', color: '#FF3B30' },
        ];
        return renderSharedCategoryTab('service', services, serviceFilter, setServiceFilter, 'services', stats);
    };

    const renderActivity = () => {
        const stats = [
            { id: 'ALL', label: 'All Logs', count: activityLogs.length, icon: 'list.bullet.rectangle.fill', color: '#8E8E93' },
            { id: 'material', label: 'Materials', count: activityLogs.filter(a => a.type === 'material').length, icon: 'shippingbox.fill', color: '#007AFF' },
            { id: 'tool', label: 'Tools', count: activityLogs.filter(a => a.type === 'tool').length, icon: 'hammer.fill', color: '#AF52DE' },
            { id: 'asset', label: 'Assets', count: activityLogs.filter(a => a.type === 'asset').length, icon: 'car.fill', color: '#FF9500' },
            { id: 'service', label: 'Services', count: activityLogs.filter(a => a.type === 'service').length, icon: 'briefcase.fill', color: '#34C759' },
        ];
        const q = searchQuery.toLowerCase().trim();
        const filtered = activityLogs.filter(a => {
            const matchesFilter = activityFilter === 'ALL' || a.type === activityFilter;
            const matchesSearch = !q ||
                (a.title && a.title.toLowerCase().includes(q)) ||
                (a.description && a.description.toLowerCase().includes(q)) ||
                (a.user && a.user.toLowerCase().includes(q));
            return matchesFilter && matchesSearch;
        });

        return (
            <View style={s.subModuleContainer}>
                {renderFilterCards(activityFilter, setActivityFilter, stats)}
                
                {isOverviewLoading && activityLogs.length === 0 ? (
                    <View style={s.loadingContainer}>
                        <Text style={[s.loadingText, { color: textColor }]}>Loading activity logs...</Text>
                    </View>
                ) : (
                    <View style={s.listContainer}>
                        {filtered.length > 0 ? filtered.map((log) => (
                            <ActivityLogCard key={log.id} log={log} />
                        )) : <EmptyState segment="activity" />}
                    </View>
                )}
            </View>
        );
    };

    return (
        <>
            <Stack.Screen options={{
                headerShown: Platform.OS !== 'web',
                title: 'Resources',
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
                headerLargeTitleStyle: { fontSize: 26, color: textColor },
                headerRight: (isAuthenticated && actions.length > 0) ? () => <HeaderToolbar actions={actions} isDark={isDark} textColor={textColor} /> : undefined,
            }} />

            {Platform.OS === 'web' && !isDesktopWeb && (
                <WebFinderHeader
                    title="Resources"
                    showBack
                    actions={isAuthenticated ? actions : undefined}
                    centerComponent={
                        <SegmentedControl
                            segments={filteredSegments}
                            activeSegment={activeSegment}
                            onSegmentChange={setActiveSegment}
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
                                <Text style={[s.splitListHeaderTitle, { color: textColor }]}>Resources</Text>
                                {isAuthenticated && (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        {isManager && (
                                            <TouchableOpacity
                                                onPress={handleAiCleanup}
                                                style={[s.headerActionCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
                                            >
                                                <PlatformIcon name="sparkles" size={16} tintColor={textColor} />
                                            </TouchableOpacity>
                                        )}
                                        <ContextMenu
                                            actions={addMenuActions}
                                            onPress={handleAddMenuPress}
                                        >
                                            <TouchableOpacity
                                                onPress={() => {
                                                    if (activeSegment === 'materials') handleNewResource('material');
                                                    else if (activeSegment === 'tools') handleNewResource('tool');
                                                    else if (activeSegment === 'assets') handleNewResource('asset');
                                                    else if (activeSegment === 'services') handleNewResource('service');
                                                    else handleNewResource('material');
                                                }}
                                                style={[s.headerActionCircle, { backgroundColor: '#F58232' }]}
                                            >
                                                <Ionicons name="add" size={18} color="#FFFFFF" />
                                            </TouchableOpacity>
                                        </ContextMenu>
                                    </View>
                                )}
                            </View>

                            {/* Filter Segmented Control */}
                            <View style={{ marginTop: 12 }}>
                                <SegmentedControl
                                    fullWidth
                                    style={{ width: '100%' }}
                                    segments={filteredSegments}
                                    activeSegment={activeSegment}
                                    onSegmentChange={setActiveSegment}
                                />
                            </View>
                        </View>

                        <ScrollView
                            style={s.splitListScroll}
                            contentContainerStyle={{ paddingHorizontal: activeSegment === 'setup' ? 16 : 20, paddingTop: activeSegment === 'setup' ? 0 : 8, paddingBottom: 60 }}
                            showsVerticalScrollIndicator={true}
                            refreshControl={
                                <RefreshControl
                                    refreshing={refreshing}
                                    onRefresh={onRefresh}
                                    tintColor={isDark ? '#FFF' : '#000'}
                                />
                            }
                        >
                            {!isAuthenticated ? (
                                <UnauthenticatedView
                                    compact
                                    title={`Resources — ${filteredSegments.find(s => s.id === activeSegment)?.label || 'Overview'}`}
                                    description="Sign in to your organization workspace to manage materials, tools, company assets, and warehouse inventory."
                                    buttonText="Sign In"
                                />
                            ) : (
                                <>
                                    {activeSegment === 'overview' && renderOverview()}
                                    {activeSegment === 'materials' && renderMaterials()}
                                    {activeSegment === 'tools' && renderTools()}
                                    {activeSegment === 'assets' && renderAssets()}
                                    {activeSegment === 'services' && renderServices()}
                                    {activeSegment === 'activity' && renderActivity()}
                                    {activeSegment === 'setup' && (
                                        <ResourcesSetupTab
                                            isDark={isDark}
                                            textColor={textColor}
                                            subtextColor={subtextColor}
                                        />
                                    )}
                                </>
                            )}
                        </ScrollView>
                    </View>

                    {/* Right Pane (flex: 2) */}
                    <View style={[s.splitRightPane, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}>
                        {selectedReceivingItem ? (
                            <ReceivingDetailModal
                                key={`desktop-rcv-${selectedReceivingItem.id}`}
                                item={selectedReceivingItem}
                                onClose={() => setSelectedReceivingItem(null)}
                                onConfirmReceipt={handleConfirmReceipt}
                                isEmbedded={true}
                            />
                        ) : selectedItem ? (
                            <ResourceDetailModal
                                key={`desktop-res-${selectedItem.id}`}
                                item={selectedItem}
                                projectStock={selectedStock}
                                onClose={() => setSelectedItem(null)}
                                isEmbedded={true}
                            />
                        ) : (
                            <View style={s.desktopEmptyPane}>
                                <View style={[s.desktopEmptyIconCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                                    <PlatformIcon
                                        name="shippingbox.fill"
                                        size={36}
                                        tintColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)'}
                                    />
                                </View>
                                <Text style={[s.desktopEmptyTitle, { color: textColor }]}>
                                    Select a Resource
                                </Text>
                                <Text style={[s.desktopEmptySubtitle, { color: subtextColor }]}>
                                    Choose a material, tool, or asset from the catalog on the left to view project stock allocation and specifications.
                                </Text>
                                <TouchableOpacity
                                    onPress={() => setShowActionsSheet(true)}
                                    style={[s.desktopEmptyBtn, { backgroundColor: '#F58232' }]}
                                >
                                    <Ionicons name="add" size={18} color="#FFFFFF" />
                                    <Text style={s.desktopEmptyBtnText}>
                                        New Resource
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            ) : (
                <SwipeTabWrapper segments={filteredSegments} activeSegment={activeSegment} onSegmentChange={setActiveSegment}>
                    <ScrollView
                        contentInsetAdjustmentBehavior="automatic"
                        style={{ flex: 1, backgroundColor: Platform.OS === 'web' ? 'transparent' : (isDark ? '#000' : '#F2F2F7') }}
                        contentContainerStyle={{ paddingBottom: 120, paddingTop: 0 }}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                tintColor={isDark ? '#FFF' : '#000'}
                            />
                        }
                        stickyHeaderIndices={Platform.OS === 'android' ? [0] : undefined}
                    >
                        {/* Index 0: Sticky Segmented Control Wrapper for Native Only */}
                        {Platform.OS !== 'web' && (
                            <View style={{
                                width: '100%',
                                alignItems: 'flex-start',
                                paddingTop: 6,
                                paddingBottom: 6,
                                paddingHorizontal: 16,
                                zIndex: 10,
                            }}>
                                <SegmentedControl
                                    segments={filteredSegments}
                                    activeSegment={activeSegment}
                                    onSegmentChange={setActiveSegment}
                                />
                            </View>
                        )}

                        {/* Index 2: Rest of Content */}
                        <View style={{ paddingHorizontal: activeSegment === 'setup' ? 16 : 20, paddingTop: activeSegment === 'setup' ? 0 : 8 }}>
                            {isSearchVisible && activeSegment !== 'setup' && (
                                <Animated.View
                                    entering={FadeInUp}
                                    style={[
                                        s.inlineSearchContainer,
                                        {
                                            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                                            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                                        }
                                    ]}
                                >
                                    <Ionicons name="search" size={17} color={subtextColor} style={{ marginRight: 8 }} />
                                    <TextInput
                                        placeholder="Search resources, tags, SKU..."
                                        placeholderTextColor={subtextColor}
                                        style={[s.inlineSearchInput, { color: textColor }]}
                                        value={searchQuery}
                                        onChangeText={setSearchQuery}
                                        clearButtonMode="while-editing"
                                        returnKeyType="search"
                                        autoFocus
                                    />
                                    <TouchableOpacity
                                        onPress={() => {
                                            setIsSearchVisible(false);
                                            setSearchQuery('');
                                        }}
                                        style={s.inlineCancelButton}
                                    >
                                        <Text style={{ color: subtextColor, fontWeight: '500', fontSize: 15 }}>
                                            Cancel
                                        </Text>
                                    </TouchableOpacity>
                                </Animated.View>
                            )}

                            {!isAuthenticated ? (
                                <UnauthenticatedView
                                    compact
                                    title={`Resources — ${filteredSegments.find(s => s.id === activeSegment)?.label || 'Overview'}`}
                                    description="Sign in to your organization workspace to manage materials, tools, company assets, and warehouse inventory."
                                    buttonText="Sign In"
                                />
                            ) : (
                                <>
                                    {activeSegment === 'overview' && renderOverview()}
                                    {activeSegment === 'materials' && renderMaterials()}
                                    {activeSegment === 'tools' && renderTools()}
                                    {activeSegment === 'assets' && renderAssets()}
                                    {activeSegment === 'services' && renderServices()}
                                    {activeSegment === 'activity' && renderActivity()}
                                    {activeSegment === 'setup' && (
                                        <ResourcesSetupTab
                                            isDark={isDark}
                                            textColor={textColor}
                                            subtextColor={subtextColor}
                                        />
                                    )}
                                </>
                            )}
                        </View>
                    </ScrollView>
                </SwipeTabWrapper>
            )}

            {/* Detail Modal */}
            <ResourceDetailModal
                visible={detailModalVisible}
                onClose={() => setDetailModalVisible(false)}
                item={selectedItem}
                projectStock={selectedStock}
            />

            {/* Receiving Detail Modal */}
            <ReceivingDetailModal
                visible={receivingModalVisible}
                onClose={() => setReceivingModalVisible(false)}
                item={selectedReceivingItem}
                onConfirmReceipt={handleConfirmReceipt}
            />

            {/* Resources Actions SwiftUI Bottom Sheet */}
            <SwiftUIResourceActionsSheet
                isOpened={showActionsSheet}
                onClose={() => setShowActionsSheet(false)}
                onSelectNewResource={handleNewResource}
                onSelectNewReceiving={handleNewReceiving}
                onSelectNewTransfer={handleNewTransfer}
                onSelectStockAdjustment={handleStockAdjustment}
                onSelectAiCleanup={handleAiCleanup}
                isManager={isManager}
            />

            {/* Add Resource Native SwiftUI Bottom Sheet */}
            <SwiftUIAddResourceSheet
                isOpened={addResourceModalVisible}
                onClose={() => setAddResourceModalVisible(false)}
                initialCategory={addResourceCategory}
                onResourceCreated={() => fetchData(true)}
            />
        </>
    );
}

const s = StyleSheet.create({
    container: { flex: 1 },
    seg: { marginBottom: 24, marginHorizontal: -4 },
    emptyState: { padding: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 24, gap: 12, marginTop: 20 },
    emptyText: { fontSize: 15, fontWeight: '500' },
    subModuleContainer: {
        gap: 16,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 0,
    },
    summaryScroll: {
        marginHorizontal: -20,
    },
    summaryScrollContent: {
        paddingHorizontal: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 4,
        marginTop: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
    },

    // List (matching Finance)
    listContainer: {
        gap: 8,
    },

    // Compact Card (for activity logs)
    compactCard: {
        borderRadius: 20,
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.03,
                shadowRadius: 6,
            },
            android: {
                elevation: 1,
            },
        }),
    },
    cardBody: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingLeft: 16,
        paddingRight: 12,
    },
    cardDetails: {
        flex: 1,
        gap: 4,
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    cardSubtext: {
        fontSize: 13,
        lineHeight: 18,
    },
    cardMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    cardMetaText: {
        fontSize: 11,
        fontWeight: '500',
    },

    logIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    inlineSearchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 44,
        borderRadius: 22,
        paddingHorizontal: 16,
        borderWidth: 1,
        marginTop: 8,
        marginBottom: 12,
    },
    inlineSearchInput: {
        flex: 1,
        height: '100%',
        fontSize: 16,
        paddingVertical: 0,
    },
    inlineCancelButton: {
        paddingLeft: 8,
        paddingVertical: 4,
    },
    toolbarWrapper: {
        marginBottom: 4,
        marginTop: -4,
    },
    toolbarRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    searchBarPill: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        height: 38,
        borderRadius: 19,
        paddingHorizontal: 12,
        gap: 6,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04,
                shadowRadius: 4,
            },
            android: {
                elevation: 1,
            },
        }),
    },
    searchInput: {
        flex: 1,
        fontSize: 13,
        paddingVertical: 0,
        height: '100%',
    },
    toolbarActionPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        height: 38,
        borderRadius: 19,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04,
                shadowRadius: 4,
            },
            android: {
                elevation: 1,
            },
        }),
    },
    toolbarActionText: {
        fontSize: 12,
        fontWeight: '600',
    },
    searchClearBtn: {
        padding: 4,
    },
    loadMoreBtn: {
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 24,
        borderWidth: 1,
        marginTop: 8,
        marginBottom: 20,
    },
    loadMoreBtnText: {
        fontSize: 14,
        fontWeight: '700',
    },
    loadingContainer: {
        paddingVertical: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        fontSize: 14,
        fontWeight: '500',
        opacity: 0.6,
    },
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
});
