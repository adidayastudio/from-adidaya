import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Platform,
    RefreshControl,
    Alert,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { GlassView } from '@/components/ui/GlassView';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { HeaderToolbar, HeaderToolbarAction } from '@/components/ui/HeaderToolbar';
import { SegmentedControl, Segment } from '@/components/ui/SegmentedControl';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import {
    RESOURCES_SETUP_MENU_ITEMS,
    ResourcesSetupModule,
} from '@/components/resources/setup/ResourcesSetupTab';
import {
    ResourcesGeneralSettings,
    ResourcesNumberingSettings,
    UnitItem,
    UnitConversionItem,
    DEFAULT_RESOURCES_GENERAL_SETTINGS,
    DEFAULT_RESOURCES_NUMBERING_SETTINGS,
    DEFAULT_UNIT_LIBRARY,
    DEFAULT_UNIT_CONVERSIONS,
    getResourcesGeneralSettings,
    saveResourcesGeneralSettings,
    getResourcesNumberingSettings,
    saveResourcesNumberingSettings,
    getUnitLibrary,
    saveUnitLibrary,
    getUnitConversions,
    saveUnitConversions,
} from '@/lib/api/resourcesSetup';
import {
    FinanceCategory,
    DEFAULT_FINANCE_CATEGORIES,
    getFinanceCategories,
    saveFinanceCategories,
} from '@/lib/api/financeSetup';
import {
    ItemMasterRecord,
    UnmatchedItemCandidate,
    DEFAULT_ITEM_MASTERS,
    DEFAULT_UNMATCHED_CANDIDATES,
    getItemMasters,
    saveItemMasters,
    getUnmatchedCandidates,
    saveUnmatchedCandidates,
} from '@/lib/api/resourcesItemMaster';
import {
    VendorMasterRecord,
    DEFAULT_VENDOR_MASTERS,
    getVendorMasters,
    saveVendorMasters,
} from '@/lib/api/resourcesVendors';
import {
    ResourcesStockRulesSettings,
    DEFAULT_STOCK_RULES_SETTINGS,
    getResourcesStockRules,
    saveResourcesStockRules,
} from '@/lib/api/resourcesStockRules';
import {
    ResourcesConditionsStatusesSettings,
    DEFAULT_CONDITIONS_STATUSES_SETTINGS,
    getResourcesConditionsStatuses,
    saveResourcesConditionsStatuses,
} from '@/lib/api/resourcesConditionsStatuses';
import {
    ResourceLocationItem,
    DEFAULT_RESOURCE_LOCATIONS,
    getResourceLocations,
    saveResourceLocations,
} from '@/lib/api/resourcesLocations';
import {
    ResourcesReceivingRulesSettings,
    DEFAULT_RECEIVING_RULES_SETTINGS,
    getResourcesReceivingRules,
    saveResourcesReceivingRules,
} from '@/lib/api/resourcesReceivingRules';
import {
    ResourcesTransferOwnershipSettings,
    DEFAULT_TRANSFER_OWNERSHIP_SETTINGS,
    getResourcesTransferOwnership,
    saveResourcesTransferOwnership,
} from '@/lib/api/resourcesTransferOwnership';
import {
    ResourcesPermissionsSettings,
    DEFAULT_RESOURCES_PERMISSIONS_SETTINGS,
    getResourcesPermissions,
    saveResourcesPermissions,
} from '@/lib/api/resourcesPermissions';
import {
    ResourcesAuditLogItem,
    DEFAULT_RESOURCES_AUDIT_LOGS,
    getResourcesAuditLogs,
    saveResourcesAuditLogs,
    clearResourcesAuditLogs,
} from '@/lib/api/resourcesAuditLogs';
import { ResourcesGeneralSettingsSection } from '@/components/resources/setup/ResourcesGeneralSettingsSection';
import { ResourcesNumberingCodesSection } from '@/components/resources/setup/ResourcesNumberingCodesSection';
import { ResourcesClassificationSection } from '@/components/resources/setup/ResourcesClassificationSection';
import { ResourcesItemMasterSection } from '@/components/resources/setup/ResourcesItemMasterSection';
import { ResourcesVendorsSection } from '@/components/resources/setup/ResourcesVendorsSection';
import { ResourcesStockRulesSection } from '@/components/resources/setup/ResourcesStockRulesSection';
import { ResourcesConditionsStatusesSection } from '@/components/resources/setup/ResourcesConditionsStatusesSection';
import { ResourcesLocationsSection } from '@/components/resources/setup/ResourcesLocationsSection';
import { ResourcesReceivingRulesSection } from '@/components/resources/setup/ResourcesReceivingRulesSection';
import { ResourcesTransferOwnershipSection } from '@/components/resources/setup/ResourcesTransferOwnershipSection';
import { ResourcesPermissionsSection } from '@/components/resources/setup/ResourcesPermissionsSection';
import { ResourcesAuditLogSection } from '@/components/resources/setup/ResourcesAuditLogSection';

export default function ResourcesSetupDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';
    const insets = useSafeAreaInsets();
    const [refreshing, setRefreshing] = useState(false);

    const [activeModule, setActiveModule] = useState<ResourcesSetupModule>(
        (id as ResourcesSetupModule) || 'general_settings'
    );

    useEffect(() => {
        if (id && id !== activeModule) {
            setActiveModule(id as ResourcesSetupModule);
        }
    }, [id]);

    // State for General Settings
    const [generalSettings, setGeneralSettings] = useState<ResourcesGeneralSettings>(
        DEFAULT_RESOURCES_GENERAL_SETTINGS
    );
    const [units, setUnits] = useState<UnitItem[]>(DEFAULT_UNIT_LIBRARY);
    const [conversions, setConversions] = useState<UnitConversionItem[]>(
        DEFAULT_UNIT_CONVERSIONS
    );

    // State for Numbering Settings
    const [numberingSettings, setNumberingSettings] = useState<ResourcesNumberingSettings>(
        DEFAULT_RESOURCES_NUMBERING_SETTINGS
    );

    // State for Shared Finance / Resources Classification Categories
    const [categories, setCategories] = useState<FinanceCategory[]>(
        DEFAULT_FINANCE_CATEGORIES
    );
    const [isAddCategorySheetOpen, setIsAddCategorySheetOpen] = useState(false);

    // State for Item Master & Variants
    const [itemMasters, setItemMasters] = useState<ItemMasterRecord[]>(DEFAULT_ITEM_MASTERS);
    const [candidates, setCandidates] = useState<UnmatchedItemCandidate[]>(DEFAULT_UNMATCHED_CANDIDATES);
    const [isAddItemSheetOpen, setIsAddItemSheetOpen] = useState(false);

    // State for Vendors
    const [vendors, setVendors] = useState<VendorMasterRecord[]>(DEFAULT_VENDOR_MASTERS);
    const [isAddVendorSheetOpen, setIsAddVendorSheetOpen] = useState(false);

    // State for Stock Rules
    const [stockRulesSettings, setStockRulesSettings] = useState<ResourcesStockRulesSettings>(
        DEFAULT_STOCK_RULES_SETTINGS
    );

    // State for Conditions & Statuses
    const [conditionsStatusesSettings, setConditionsStatusesSettings] = useState<ResourcesConditionsStatusesSettings>(
        DEFAULT_CONDITIONS_STATUSES_SETTINGS
    );
    const [isAddConditionModalOpen, setIsAddConditionModalOpen] = useState(false);

    // State for Locations
    const [locations, setLocations] = useState<ResourceLocationItem[]>(DEFAULT_RESOURCE_LOCATIONS);
    const [isAddLocationSheetOpen, setIsAddLocationSheetOpen] = useState(false);

    // State for Receiving Rules
    const [receivingRulesSettings, setReceivingRulesSettings] = useState<ResourcesReceivingRulesSettings>(
        DEFAULT_RECEIVING_RULES_SETTINGS
    );

    // State for Transfer & Ownership
    const [transferOwnershipSettings, setTransferOwnershipSettings] = useState<ResourcesTransferOwnershipSettings>(
        DEFAULT_TRANSFER_OWNERSHIP_SETTINGS
    );

    // State for Permissions & Visibility
    const [permissionsSettings, setPermissionsSettings] = useState<ResourcesPermissionsSettings>(
        DEFAULT_RESOURCES_PERMISSIONS_SETTINGS
    );

    // State for Audit Logs
    const [auditLogs, setAuditLogs] = useState<ResourcesAuditLogItem[]>(DEFAULT_RESOURCES_AUDIT_LOGS);

    const loadData = useCallback(async () => {
        try {
            const [
                savedSettings,
                savedUnits,
                savedConversions,
                savedNumbering,
                savedCategories,
                savedItemMasters,
                savedCandidates,
                savedVendors,
                savedStockRules,
                savedConditionsStatuses,
                savedLocations,
                savedReceivingRules,
                savedTransferOwnership,
                savedPermissions,
                savedAuditLogs,
            ] = await Promise.all([
                getResourcesGeneralSettings(),
                getUnitLibrary(),
                getUnitConversions(),
                getResourcesNumberingSettings(),
                getFinanceCategories(),
                getItemMasters(),
                getUnmatchedCandidates(),
                getVendorMasters(),
                getResourcesStockRules(),
                getResourcesConditionsStatuses(),
                getResourceLocations(),
                getResourcesReceivingRules(),
                getResourcesTransferOwnership(),
                getResourcesPermissions(),
                getResourcesAuditLogs(),
            ]);
            setGeneralSettings(savedSettings);
            setUnits(savedUnits);
            setConversions(savedConversions);
            setNumberingSettings(savedNumbering);
            setCategories(savedCategories);
            setItemMasters(savedItemMasters);
            setCandidates(savedCandidates);
            setVendors(savedVendors);
            setStockRulesSettings(savedStockRules);
            setConditionsStatusesSettings(savedConditionsStatuses);
            setLocations(savedLocations);
            setReceivingRulesSettings(savedReceivingRules);
            setTransferOwnershipSettings(savedTransferOwnership);
            setPermissionsSettings(savedPermissions);
            setAuditLogs(savedAuditLogs);
        } catch (e) {
            console.error('Error loading resources setup data:', e);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleUpdateGeneralSettings = async (newSettings: ResourcesGeneralSettings) => {
        setGeneralSettings(newSettings);
        await saveResourcesGeneralSettings(newSettings);
    };

    const handleUpdateUnits = async (newUnits: UnitItem[]) => {
        setUnits(newUnits);
        await saveUnitLibrary(newUnits);
    };

    const handleUpdateConversions = async (newConversions: UnitConversionItem[]) => {
        setConversions(newConversions);
        await saveUnitConversions(newConversions);
    };

    const handleUpdateNumberingSettings = async (newNumbering: ResourcesNumberingSettings) => {
        setNumberingSettings(newNumbering);
        await saveResourcesNumberingSettings(newNumbering);
    };

    const handleUpdateCategories = async (newCategories: FinanceCategory[]) => {
        setCategories(newCategories);
        await saveFinanceCategories(newCategories);
    };

    const handleUpdateItemMasters = async (newItems: ItemMasterRecord[]) => {
        setItemMasters(newItems);
        await saveItemMasters(newItems);
    };

    const handleUpdateCandidates = async (newCandidates: UnmatchedItemCandidate[]) => {
        setCandidates(newCandidates);
        await saveUnmatchedCandidates(newCandidates);
    };

    const handleUpdateVendors = async (newVendors: VendorMasterRecord[]) => {
        setVendors(newVendors);
        await saveVendorMasters(newVendors);
    };

    const handleUpdateStockRules = async (newStockRules: ResourcesStockRulesSettings) => {
        setStockRulesSettings(newStockRules);
        await saveResourcesStockRules(newStockRules);
    };

    const handleUpdateConditionsStatuses = async (newSettings: ResourcesConditionsStatusesSettings) => {
        setConditionsStatusesSettings(newSettings);
        await saveResourcesConditionsStatuses(newSettings);
    };

    const handleUpdateLocations = async (newLocations: ResourceLocationItem[]) => {
        setLocations(newLocations);
        await saveResourceLocations(newLocations);
    };

    const handleUpdateReceivingRules = async (newSettings: ResourcesReceivingRulesSettings) => {
        setReceivingRulesSettings(newSettings);
        await saveResourcesReceivingRules(newSettings);
    };

    const handleUpdateTransferOwnership = async (newSettings: ResourcesTransferOwnershipSettings) => {
        setTransferOwnershipSettings(newSettings);
        await saveResourcesTransferOwnership(newSettings);
    };

    const handleUpdatePermissions = async (newSettings: ResourcesPermissionsSettings) => {
        setPermissionsSettings(newSettings);
        await saveResourcesPermissions(newSettings);
    };

    const handleUpdateAuditLogs = async (newLogs: ResourcesAuditLogItem[]) => {
        setAuditLogs(newLogs);
        await saveResourcesAuditLogs(newLogs);
    };

    const currentItemConfig = useMemo(() => {
        return (
            RESOURCES_SETUP_MENU_ITEMS.find((m) => m.id === activeModule) ||
            RESOURCES_SETUP_MENU_ITEMS[0]
        );
    }, [activeModule]);

    // Group Sub-Segment Selector (Tabs for same group, e.g. General Settings & Numbering in General group)
    const groupSegments: Segment[] = useMemo(() => {
        const groupItems = RESOURCES_SETUP_MENU_ITEMS.filter((item) => item.group === currentItemConfig.group);
        return groupItems.map((item) => ({
            id: item.id,
            label: item.shortLabel || item.title,
            icon: item.icon,
        }));
    }, [currentItemConfig.group]);

    // Header Toolbar Actions
    const toolbarActions: HeaderToolbarAction[] = useMemo(() => {
        if (activeModule === 'classification') {
            return [
                {
                    id: 'add',
                    icon: 'add-outline',
                    image: 'plus',
                    title: 'Add Category',
                    onPress: () => {
                        setIsAddCategorySheetOpen(true);
                    },
                },
            ];
        }
        if (activeModule === 'item_master') {
            return [
                {
                    id: 'add_item',
                    icon: 'add-outline',
                    image: 'plus',
                    title: 'Add Item Master',
                    onPress: () => {
                        setIsAddItemSheetOpen(true);
                    },
                },
            ];
        }
        if (activeModule === 'vendors') {
            return [
                {
                    id: 'add_vendor',
                    icon: 'add-outline',
                    image: 'plus',
                    title: 'Add Vendor',
                    onPress: () => {
                        setIsAddVendorSheetOpen(true);
                    },
                },
            ];
        }
        if (activeModule === 'conditions_statuses') {
            return [
                {
                    id: 'add_condition',
                    icon: 'add-outline',
                    image: 'plus',
                    title: 'Add Condition',
                    onPress: () => {
                        setIsAddConditionModalOpen(true);
                    },
                },
            ];
        }
        if (activeModule === 'locations') {
            return [
                {
                    id: 'add_location',
                    icon: 'add-outline',
                    image: 'plus',
                    title: 'Add Location',
                    onPress: () => {
                        setIsAddLocationSheetOpen(true);
                    },
                },
            ];
        }
        if (activeModule === 'audit_logs') {
            return [
                {
                    id: 'export_audit',
                    icon: 'share-outline',
                    image: 'square.and.arrow.up',
                    title: 'Export',
                    onPress: () => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        Alert.alert('Export Audit Logs', 'Resource audit trail exported successfully.');
                    },
                },
            ];
        }
        return [];
    }, [activeModule]);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: true,
                    title: currentItemConfig.title,
                    headerLargeTitle: false,
                    headerTransparent: Platform.OS === 'ios',
                    headerTintColor: textColor,
                    headerTitleStyle: { color: textColor, fontWeight: '600' },
                    headerShadowVisible: false,
                    headerBackButtonDisplayMode: 'minimal',
                    headerBackTitle: ' ',
                    headerStyle: { backgroundColor: Platform.OS === 'ios' ? 'transparent' : (isDark ? '#000000' : '#F2F2F7') },
                    headerRight: toolbarActions.length > 0
                        ? () => (
                              <View style={{ marginRight: Platform.OS === 'web' ? 16 : 0 }}>
                                  <HeaderToolbar
                                      key={`header-toolbar-${activeModule}`}
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
            <ScrollView
                contentInsetAdjustmentBehavior="automatic"
                style={{ flex: 1, backgroundColor: isDark ? '#000000' : '#F2F2F7' }}
                contentContainerStyle={{
                    paddingHorizontal: 16,
                    paddingTop: 8,
                    paddingBottom: insets.bottom + 40,
                }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={isDark ? '#FFF' : '#000'}
                    />
                }
            >
                {/* Top Sticky Group Segmented Control Tabs */}
                {groupSegments.length > 1 && (
                    <View style={s.topSegmentWrapper}>
                        <SegmentedControl
                            segments={groupSegments}
                            activeSegment={activeModule}
                            onSegmentChange={(modId) => {
                                Haptics.selectionAsync();
                                setActiveModule(modId as ResourcesSetupModule);
                            }}
                        />
                    </View>
                )}

                {/* Submodule Views */}
                {activeModule === 'general_settings' && (
                    <ResourcesGeneralSettingsSection
                        isDark={isDark}
                        textColor={textColor}
                        subtextColor={subtextColor}
                        settings={generalSettings}
                        units={units}
                        conversions={conversions}
                        onUpdateSettings={handleUpdateGeneralSettings}
                        onUpdateUnits={handleUpdateUnits}
                        onUpdateConversions={handleUpdateConversions}
                    />
                )}

                {activeModule === 'numbering_codes' && (
                    <ResourcesNumberingCodesSection
                        isDark={isDark}
                        textColor={textColor}
                        subtextColor={subtextColor}
                        settings={numberingSettings}
                        onUpdateSettings={handleUpdateNumberingSettings}
                    />
                )}

                {activeModule === 'classification' && (
                    <ResourcesClassificationSection
                        isDark={isDark}
                        textColor={textColor}
                        subtextColor={subtextColor}
                        categories={categories}
                        onUpdateCategories={handleUpdateCategories}
                        isAddCategoryOpen={isAddCategorySheetOpen}
                        onCloseAddCategory={() => setIsAddCategorySheetOpen(false)}
                    />
                )}

                {activeModule === 'item_master' && (
                    <ResourcesItemMasterSection
                        isDark={isDark}
                        textColor={textColor}
                        subtextColor={subtextColor}
                        items={itemMasters}
                        candidates={candidates}
                        categories={categories}
                        onUpdateItems={handleUpdateItemMasters}
                        onUpdateCandidates={handleUpdateCandidates}
                        isAddItemOpen={isAddItemSheetOpen}
                        onCloseAddItem={() => setIsAddItemSheetOpen(false)}
                    />
                )}

                {activeModule === 'vendors' && (
                    <ResourcesVendorsSection
                        isDark={isDark}
                        textColor={textColor}
                        subtextColor={subtextColor}
                        vendors={vendors}
                        onUpdateVendors={handleUpdateVendors}
                        isAddVendorOpen={isAddVendorSheetOpen}
                        onCloseAddVendor={() => setIsAddVendorSheetOpen(false)}
                    />
                )}

                {activeModule === 'stock_rules' && (
                    <ResourcesStockRulesSection
                        isDark={isDark}
                        textColor={textColor}
                        subtextColor={subtextColor}
                        settings={stockRulesSettings}
                        onUpdateSettings={handleUpdateStockRules}
                    />
                )}

                {activeModule === 'conditions_statuses' && (
                    <ResourcesConditionsStatusesSection
                        isDark={isDark}
                        textColor={textColor}
                        subtextColor={subtextColor}
                        settings={conditionsStatusesSettings}
                        onUpdateSettings={handleUpdateConditionsStatuses}
                        isAddModalOpen={isAddConditionModalOpen}
                        onCloseAddModal={() => setIsAddConditionModalOpen(false)}
                    />
                )}

                {activeModule === 'locations' && (
                    <ResourcesLocationsSection
                        isDark={isDark}
                        textColor={textColor}
                        subtextColor={subtextColor}
                        locations={locations}
                        vendors={vendors}
                        onUpdateLocations={handleUpdateLocations}
                        isAddLocationOpen={isAddLocationSheetOpen}
                        onCloseAddLocation={() => setIsAddLocationSheetOpen(false)}
                    />
                )}

                {activeModule === 'receiving_rules' && (
                    <ResourcesReceivingRulesSection
                        isDark={isDark}
                        textColor={textColor}
                        subtextColor={subtextColor}
                        settings={receivingRulesSettings}
                        locations={locations}
                        onUpdateSettings={handleUpdateReceivingRules}
                    />
                )}

                {activeModule === 'transfer_ownership' && (
                    <ResourcesTransferOwnershipSection
                        isDark={isDark}
                        textColor={textColor}
                        subtextColor={subtextColor}
                        settings={transferOwnershipSettings}
                        locations={locations}
                        onUpdateSettings={handleUpdateTransferOwnership}
                    />
                )}

                {activeModule === 'permissions_visibility' && (
                    <ResourcesPermissionsSection
                        isDark={isDark}
                        textColor={textColor}
                        subtextColor={subtextColor}
                        settings={permissionsSettings}
                        onUpdateSettings={handleUpdatePermissions}
                    />
                )}

                {activeModule === 'audit_logs' && (
                    <ResourcesAuditLogSection
                        isDark={isDark}
                        textColor={textColor}
                        subtextColor={subtextColor}
                        auditLogs={auditLogs}
                        onUpdateAuditLogs={handleUpdateAuditLogs}
                    />
                )}

                {activeModule !== 'general_settings' &&
                    activeModule !== 'numbering_codes' &&
                    activeModule !== 'classification' &&
                    activeModule !== 'item_master' &&
                    activeModule !== 'vendors' &&
                    activeModule !== 'stock_rules' &&
                    activeModule !== 'conditions_statuses' &&
                    activeModule !== 'locations' &&
                    activeModule !== 'receiving_rules' &&
                    activeModule !== 'transfer_ownership' &&
                    activeModule !== 'permissions_visibility' &&
                    activeModule !== 'audit_logs' && (
                    <>
                        <GlassView
                            intensity={isDark ? 10 : 25}
                            style={[
                                s.card,
                                {
                                    backgroundColor: isDark
                                        ? 'rgba(255,255,255,0.03)'
                                        : 'rgba(255,255,255,0.85)',
                                    borderColor: isDark
                                        ? 'rgba(255,255,255,0.08)'
                                        : 'rgba(0,0,0,0.06)',
                                },
                            ]}
                        >
                            <View
                                style={[
                                    s.iconContainer,
                                    { backgroundColor: currentItemConfig.color + (isDark ? '25' : '15') },
                                ]}
                            >
                                <PlatformIcon
                                    name={currentItemConfig.icon as any}
                                    size={28}
                                    tintColor={currentItemConfig.color}
                                />
                            </View>
                            <Text style={[s.title, { color: textColor }]}>{currentItemConfig.title}</Text>
                            <Text style={[s.subtitle, { color: subtextColor }]}>
                                {currentItemConfig.subtitle}
                            </Text>
                        </GlassView>

                        {/* Content Placeholder */}
                        <GlassView
                            intensity={isDark ? 8 : 20}
                            style={[
                                s.emptyContainer,
                                {
                                    backgroundColor: isDark
                                        ? 'rgba(255,255,255,0.02)'
                                        : 'rgba(255,255,255,0.6)',
                                    borderColor: isDark
                                        ? 'rgba(255,255,255,0.05)'
                                        : 'rgba(0,0,0,0.04)',
                                },
                            ]}
                        >
                            <PlatformIcon
                                name="slider.horizontal.3"
                                size={28}
                                tintColor={subtextColor}
                            />
                            <Text style={[s.comingSoonTitle, { color: textColor }]}>
                                Configuration Panel
                            </Text>
                            <Text style={[s.comingSoonText, { color: subtextColor }]}>
                                Rules and options for {currentItemConfig.title} will be synced across your organization workspaces.
                            </Text>
                        </GlassView>
                    </>
                )}
            </ScrollView>
        </>
    );
}

const s = StyleSheet.create({
    topSegmentWrapper: {
        marginBottom: 16,
        alignItems: 'center',
    },
    card: {
        borderRadius: 24,
        padding: 20,
        alignItems: 'center',
        textAlign: 'center',
        borderWidth: 1,
        marginBottom: 16,
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        letterSpacing: -0.3,
        textAlign: 'center',
        marginBottom: 6,
    },
    subtitle: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
    emptyContainer: {
        borderRadius: 20,
        borderWidth: 1,
        padding: 32,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    comingSoonTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginTop: 4,
    },
    comingSoonText: {
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 18,
        maxWidth: 280,
    },
});
