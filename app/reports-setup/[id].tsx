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
    Switch,
    TextInput,
    KeyboardAvoidingView,
    Keyboard,
    StatusBar as RNStatusBar,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import ContextMenu from '@/components/ui/PlatformContextMenu';
import { GlassView } from '@/components/ui/GlassView';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { HeaderToolbar, HeaderToolbarAction } from '@/components/ui/HeaderToolbar';
import { SegmentedControl, Segment } from '@/components/ui/SegmentedControl';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import {
    REPORTS_SETUP_MENU_ITEMS,
    ReportsSetupModule,
} from '@/components/reports/SetupTab';
import {
    ReportsGeneralSettings,
    DEFAULT_REPORTS_GENERAL_SETTINGS,
    getReportsGeneralSettings,
    saveReportsGeneralSettings,
    ReportsDocumentRulesSettings,
    DEFAULT_REPORTS_DOCUMENT_RULES,
    getReportsDocumentRules,
    saveReportsDocumentRules,
} from '@/lib/api/reportsSetup';
import { ReportsGeneralSettingsSection } from '@/components/reports/setup/ReportsGeneralSettingsSection';
import { ReportsDocumentRulesSection } from '@/components/reports/setup/ReportsDocumentRulesSection';
import { ReportsStructureSection, StructureTab, StructureSortBy } from '@/components/reports/setup/ReportsStructureSection';
import {
    Host,
    GlassEffectContainer as SwiftUIGlassEffectContainer,
    HStack as SwiftUIHStack,
    Spacer as SwiftUISpacer,
    glassEffect,
    frame,
    cornerRadius,
    padding as swiftUIPadding,
} from '@/lib/swiftui';
import { CreateReportModal } from '@/components/reports/CreateReportModal';
import { ReportCategoriesGuideSheet } from '@/components/reports/setup/ReportCategoriesGuideSheet';
import { ReportTypesGuideSheet } from '@/components/reports/setup/ReportTypesGuideSheet';
import { ActivitiesGuideSheet } from '@/components/reports/setup/ActivitiesGuideSheet';

export default function ReportsSetupDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';
    const insets = useSafeAreaInsets();
    const [refreshing, setRefreshing] = useState(false);

    // Main page module ID
    const initialModule = useMemo<ReportsSetupModule>(() => {
        if (id === 'numbering_rules') return 'numbering_rules';
        if (id === 'report_types' || id === 'activity_templates' || id === 'category_tags') return 'report_structure';
        if (id === 'scheduling_automation') return 'scheduling_automation';
        if (id === 'document_templates') return 'document_templates';
        if (id === 'approval_flow') return 'approval_flow';
        return (id as ReportsSetupModule) || 'general_settings';
    }, [id]);

    const [activeModule, setActiveModule] = useState<ReportsSetupModule>(initialModule);

    // Structure active tab state
    const [structureTab, setStructureTab] = useState<StructureTab>('report_types');
    
    // Search & Sort state
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<StructureSortBy>('default');

    // Create Report Modal & Guide Sheets state
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showCategoriesGuideSheet, setShowCategoriesGuideSheet] = useState(false);
    const [showReportTypesGuideSheet, setShowReportTypesGuideSheet] = useState(false);
    const [showActivitiesGuideSheet, setShowActivitiesGuideSheet] = useState(false);
    const [addTrigger, setAddTrigger] = useState(0);

    // Settings States
    const [generalSettings, setGeneralSettings] = useState<ReportsGeneralSettings>(
        DEFAULT_REPORTS_GENERAL_SETTINGS
    );
    const [documentRules, setDocumentRules] = useState<ReportsDocumentRulesSettings>(
        DEFAULT_REPORTS_DOCUMENT_RULES
    );

    const loadData = useCallback(async () => {
        try {
            const [g, d] = await Promise.all([
                getReportsGeneralSettings(),
                getReportsDocumentRules(),
            ]);
            setGeneralSettings(g);
            setDocumentRules(d);
        } catch {}
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        if (id) {
            if (id === 'report_types') {
                setActiveModule('report_structure');
                setStructureTab('report_types');
            } else if (id === 'activity_templates') {
                setActiveModule('report_structure');
                setStructureTab('activities');
            } else if (id === 'category_tags') {
                setActiveModule('report_structure');
                setStructureTab('categories');
            } else {
                setActiveModule(initialModule);
            }
        }
    }, [id, initialModule]);

    const handleUpdateGeneralSettings = async (updated: ReportsGeneralSettings) => {
        setGeneralSettings(updated);
        await saveReportsGeneralSettings(updated);
    };

    const handleUpdateDocumentRules = async (updated: ReportsDocumentRulesSettings) => {
        setDocumentRules(updated);
        await saveReportsDocumentRules(updated);
    };

    // Determine current section group & title
    const isGeneralGroup = activeModule === 'general_settings' || activeModule === 'numbering_rules';
    const isStructureGroup = activeModule === 'report_structure';

    const pageTitle = useMemo(() => {
        if (isGeneralGroup) {
            return activeModule === 'numbering_rules' ? 'Document Rules' : 'General Settings';
        }
        if (isStructureGroup) {
            if (structureTab === 'report_types') return 'Report Types';
            if (structureTab === 'activities') return 'Activities & Forms';
            if (structureTab === 'categories') return 'Report Categories';
            return 'Report Structure';
        }
        if (activeModule === 'scheduling_automation') return 'Scheduling & Automation';
        if (activeModule === 'document_templates') return 'Document Templates';
        if (activeModule === 'approval_flow') return 'Permissions & Approval';
        return 'Configuration';
    }, [isGeneralGroup, isStructureGroup, activeModule, structureTab]);

    // General Group Segments
    const generalSegments: Segment[] = useMemo(() => [
        { id: 'general_settings', label: 'General', icon: 'slider.horizontal.3' as any },
        { id: 'numbering_rules', label: 'Document Rules', icon: 'number.square.fill' as any },
    ], []);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadData();
        await new Promise((r) => setTimeout(r, 400));
        setRefreshing(false);
    }, [loadData]);

    // Context-Aware Plus Action
    const handleContextPlusPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (isStructureGroup) {
            setAddTrigger((prev) => prev + 1);
        } else {
            Alert.alert('Configuration', 'Add rule or configuration item.');
        }
    };

    // Header Toolbar Actions: 'i' on left, '+' on right
    const toolbarActions: HeaderToolbarAction[] = useMemo(() => {
        const actions: HeaderToolbarAction[] = [];

        // 1. Info Button (Left)
        actions.push({
            id: 'info',
            icon: 'information-circle-outline',
            image: 'info.circle',
            title: 'Info',
            onPress: () => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                if (isStructureGroup) {
                    if (structureTab === 'categories') {
                        setShowCategoriesGuideSheet(true);
                    } else if (structureTab === 'report_types') {
                        setShowReportTypesGuideSheet(true);
                    } else if (structureTab === 'activities') {
                        setShowActivitiesGuideSheet(true);
                    } else {
                        Alert.alert(pageTitle, 'Manage operational structure, activities, and rules for your workspace.');
                    }
                } else {
                    Alert.alert(pageTitle, 'Manage operational structure, activities, and rules for your workspace.');
                }
            },
        });

        // 2. Add Button (Right)
        if (isStructureGroup) {
            actions.push({
                id: 'add',
                icon: 'add-outline',
                image: 'plus',
                title: 'Add',
                onPress: handleContextPlusPress,
            });
        }

        return actions;
    }, [isStructureGroup, structureTab, pageTitle]);

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}>
            <RNStatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
            <Stack.Screen
                options={{
                    headerShown: true,
                    title: pageTitle,
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
                                key={`header-toolbar-${activeModule}-${structureTab}`}
                                actions={toolbarActions}
                                isDark={isDark}
                                textColor={textColor}
                                maxDirectActions={3}
                            />
                        </View>
                    ),
                }}
            />

            <ScrollView
                style={styles.scrollView}
                contentInsetAdjustmentBehavior="automatic"
                contentContainerStyle={[
                    styles.scrollContent,
                    {
                        paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 24) + 16 : 16,
                        paddingBottom: insets.bottom + 40,
                    },
                ]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#007AFF"
                    />
                }
            >
                {/* General Settings Segmented Bar */}
                {isGeneralGroup && (
                    <View style={styles.segmentedWrapper}>
                        <SegmentedControl
                            segments={generalSegments}
                            activeSegment={activeModule}
                            onSegmentChange={(newSeg) => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setActiveModule(newSeg as ReportsSetupModule);
                            }}
                            compact
                        />
                    </View>
                )}

                {/* ========================================================= */}
                {/* SECTION RENDERERS                                         */}
                {/* ========================================================= */}

                {/* 1. General Settings */}
                {activeModule === 'general_settings' && (
                    <ReportsGeneralSettingsSection
                        isDark={isDark}
                        textColor={textColor}
                        subtextColor={subtextColor}
                        settings={generalSettings}
                        onUpdateSettings={handleUpdateGeneralSettings}
                    />
                )}

                {/* 2. Document Rules */}
                {activeModule === 'numbering_rules' && (
                    <ReportsDocumentRulesSection
                        isDark={isDark}
                        textColor={textColor}
                        subtextColor={subtextColor}
                        rules={documentRules}
                        generalSettings={generalSettings}
                        onUpdateRules={handleUpdateDocumentRules}
                    />
                )}

                {/* 3. Report Structure (Report Types | Activities | Categories) */}
                {activeModule === 'report_structure' && (
                    <ReportsStructureSection
                        isDark={isDark}
                        textColor={textColor}
                        subtextColor={subtextColor}
                        activeTab={structureTab}
                        onTabChange={setStructureTab}
                        searchQuery={searchQuery}
                        isSearchVisible={false}
                        addTrigger={addTrigger}
                        sortBy={sortBy}
                    />
                )}

                {/* 4. Scheduling & Automation */}
                {activeModule === 'scheduling_automation' && (
                    <View style={styles.groupCard}>
                        <Text style={[styles.sectionHeader, { color: subtextColor }]}>Automation Engine</Text>
                        <GlassView intensity={isDark ? 10 : 25} style={[styles.card, { backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.7)' }]}>
                            <View style={styles.row}>
                                <View style={{ flex: 1, paddingRight: 12 }}>
                                    <Text style={[styles.rowLabel, { color: textColor }]}>Auto-Generate Tasks</Text>
                                    <Text style={[styles.rowSub, { color: subtextColor }]}>Automatically create actionable Tasks from recurring schedules</Text>
                                </View>
                                <Switch value={true} trackColor={{ false: '#767577', true: '#34C759' }} />
                            </View>
                            <View style={[styles.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />
                            <View style={styles.row}>
                                <Text style={[styles.rowLabel, { color: textColor }]}>Task Generation Lead Time</Text>
                                <Text style={[styles.rowValue, { color: subtextColor }]}>24 Hours Prior</Text>
                            </View>
                        </GlassView>
                    </View>
                )}

                {/* 5. Document Templates */}
                {activeModule === 'document_templates' && (
                    <View style={styles.groupCard}>
                        <Text style={[styles.sectionHeader, { color: subtextColor }]}>Document Export Styling</Text>
                        <GlassView intensity={isDark ? 10 : 25} style={[styles.card, { backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.7)' }]}>
                            <View style={styles.row}>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.rowLabel, { color: textColor }]}>Show Tenant Header Logo</Text>
                                    <Text style={[styles.rowSub, { color: subtextColor }]}>Include high-res branded header on PDF covers</Text>
                                </View>
                                <Switch value={true} trackColor={{ false: '#767577', true: '#34C759' }} />
                            </View>
                            <View style={[styles.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />
                            <View style={styles.row}>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.rowLabel, { color: textColor }]}>Include Executive Summary</Text>
                                    <Text style={[styles.rowSub, { color: subtextColor }]}>Summarize completion rate and abnormal activities</Text>
                                </View>
                                <Switch value={true} trackColor={{ false: '#767577', true: '#34C759' }} />
                            </View>
                        </GlassView>
                    </View>
                )}

                {/* 6. Permissions & Approval */}
                {activeModule === 'approval_flow' && (
                    <View style={styles.groupCard}>
                        <Text style={[styles.sectionHeader, { color: subtextColor }]}>Sign-off Hierarchy</Text>
                        <GlassView intensity={isDark ? 10 : 25} style={[styles.card, { backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.7)' }]}>
                            <View style={styles.row}>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.rowLabel, { color: textColor }]}>1. Technician / Staff</Text>
                                    <Text style={[styles.rowSub, { color: subtextColor }]}>Fill checklist and upload evidence photos</Text>
                                </View>
                                <Text style={[styles.rowValue, { color: '#34C759' }]}>Submit</Text>
                            </View>
                            <View style={[styles.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />
                            <View style={styles.row}>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.rowLabel, { color: textColor }]}>2. Supervisor / Chief Eng</Text>
                                    <Text style={[styles.rowSub, { color: subtextColor }]}>Review values, flag deviations and sign-off</Text>
                                </View>
                                <Text style={[styles.rowValue, { color: '#007AFF' }]}>Verify</Text>
                            </View>
                            <View style={[styles.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />
                            <View style={styles.row}>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.rowLabel, { color: textColor }]}>3. Operations / General Manager</Text>
                                    <Text style={[styles.rowSub, { color: subtextColor }]}>Final approval for compiled executive PDF</Text>
                                </View>
                                <Text style={[styles.rowValue, { color: '#AF52DE' }]}>Approve</Text>
                            </View>
                        </GlassView>
                    </View>
                )}

                {/* Extra spacer for floating bottom bar */}
                {isStructureGroup && <View style={{ height: insets.bottom + 64 }} />}
            </ScrollView>

            {/* Native Liquid Glass Floating Toolbar (Search Capsule + Sort Button) */}
            {isStructureGroup && (
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'position' : undefined}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? (insets.bottom > 0 ? insets.bottom + 8 : 16) : 0}
                    style={[
                        styles.floatingInputWrapper,
                        { bottom: insets.bottom > 0 ? insets.bottom + 8 : 16 }
                    ]}
                    pointerEvents="box-none"
                >
                    <View style={styles.floatingSearchToolbarRow}>
                        {/* 1. Left: Liquid Glass Search Capsule */}
                        <View style={[styles.floatingSearchCapsule, { flex: 1 }]}>
                            {Platform.OS === 'ios' ? (
                                <Host style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                                    <SwiftUIGlassEffectContainer modifiers={[
                                        frame({ height: 44 }),
                                        cornerRadius(22),
                                        glassEffect({ shape: 'capsule' })
                                    ]}>
                                        <SwiftUIHStack alignment="center" modifiers={[
                                            frame({ height: 44 }),
                                            swiftUIPadding({ leading: 14, trailing: 14 })
                                        ]}>
                                            <SwiftUISpacer />
                                        </SwiftUIHStack>
                                    </SwiftUIGlassEffectContainer>
                                </Host>
                            ) : (
                                <View style={[styles.selectCircleFallback, { backgroundColor: isDark ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.85)', borderRadius: 22 }]} />
                            )}
                            <View style={styles.searchInnerRow}>
                                <PlatformIcon name="magnifyingglass" size={16} tintColor={isDark ? '#8E8E93' : '#9CA3AF'} />
                                <TextInput
                                    placeholder={
                                        structureTab === 'categories'
                                            ? 'Search categories...'
                                            : structureTab === 'report_types'
                                            ? 'Search report types...'
                                            : 'Search activities...'
                                    }
                                    placeholderTextColor={isDark ? '#8E8E93' : '#9CA3AF'}
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                    style={[styles.floatingSearchInput, { color: textColor }]}
                                />
                                {searchQuery.length > 0 && (
                                    <TouchableOpacity
                                        onPress={() => {
                                            Keyboard.dismiss();
                                            setSearchQuery('');
                                        }}
                                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                        style={{ paddingLeft: 6 }}
                                    >
                                        <PlatformIcon
                                            name="xmark.circle.fill"
                                            size={16}
                                            tintColor={isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.22)'}
                                        />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>

                        {/* 2. Right: Sort Button (ContextMenu with dropdownMenuMode and native circle glass) */}
                        <ContextMenu
                            actions={[
                                { title: 'Default Order', state: sortBy === 'default' ? 'on' : 'off', systemIcon: 'arrow.up.arrow.down' },
                                { title: 'Name (A to Z)', state: sortBy === 'name_asc' ? 'on' : 'off', systemIcon: 'textformat.abc' },
                                { title: 'Name (Z to A)', state: sortBy === 'name_desc' ? 'on' : 'off', systemIcon: 'textformat.abc' },
                                { title: 'Most Items / Activities', state: sortBy === 'count' ? 'on' : 'off', systemIcon: 'chart.bar' },
                            ]}
                            dropdownMenuMode={true}
                            previewBackgroundColor="transparent"
                            style={{ borderRadius: 22 }}
                            onPress={(e) => {
                                const name = e.nativeEvent.name;
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                if (name === 'Name (A to Z)') setSortBy('name_asc');
                                else if (name === 'Name (Z to A)') setSortBy('name_desc');
                                else if (name === 'Most Items / Activities') setSortBy('count');
                                else setSortBy('default');
                            }}
                        >
                            <View style={styles.floatingCircleBtn}>
                                {Platform.OS === 'ios' ? (
                                    <Host style={StyleSheet.absoluteFill} colorScheme={isDark ? 'dark' : 'light'}>
                                        <SwiftUIGlassEffectContainer modifiers={[
                                            frame({ width: 44, height: 44 }),
                                            cornerRadius(22),
                                            glassEffect({ shape: 'circle' })
                                        ]}>
                                            <SwiftUIHStack alignment="center" modifiers={[frame({ width: 44, height: 44 })]}>
                                                <SwiftUISpacer />
                                            </SwiftUIHStack>
                                        </SwiftUIGlassEffectContainer>
                                    </Host>
                                ) : (
                                    <View style={[styles.selectCircleFallback, { backgroundColor: isDark ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.85)', borderRadius: 22 }]} />
                                )}
                                <PlatformIcon
                                    name="arrow.up.arrow.down"
                                    size={18}
                                    tintColor={sortBy !== 'default' ? '#007AFF' : textColor}
                                />
                            </View>
                        </ContextMenu>
                    </View>
                </KeyboardAvoidingView>
            )}

            {/* Template Presets & Blank Creation Modal (Triggered ONLY via + action) */}
            <CreateReportModal
                visible={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSelectPreset={(preset) => {
                    setShowCreateModal(false);
                    Alert.alert('Preset Selected', `Loaded ${preset.name} template.`);
                }}
                onStartBlank={() => {
                    setShowCreateModal(false);
                    Alert.alert('Start Blank', 'Create blank operational report type.');
                }}
            />

            {/* Native SwiftUI Report Categories Guide Sheet */}
            <ReportCategoriesGuideSheet
                visible={showCategoriesGuideSheet}
                onClose={() => setShowCategoriesGuideSheet(false)}
            />

            {/* Native SwiftUI Report Types Guide Sheet */}
            <ReportTypesGuideSheet
                visible={showReportTypesGuideSheet}
                onClose={() => setShowReportTypesGuideSheet(false)}
            />

            {/* Native SwiftUI Activities Guide Sheet */}
            <ActivitiesGuideSheet
                visible={showActivitiesGuideSheet}
                onClose={() => setShowActivitiesGuideSheet(false)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
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
    segmentedWrapper: {
        marginBottom: 8,
    },
    groupCard: {
        gap: 8,
    },
    sectionHeader: {
        fontSize: 13,
        fontWeight: '600',
        paddingHorizontal: 12,
        letterSpacing: -0.1,
    },
    card: {
        borderRadius: 24,
        overflow: 'hidden',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    rowLabel: {
        fontSize: 15,
        fontWeight: '400',
    },
    rowValue: {
        fontSize: 14,
        fontWeight: '500',
    },
    rowSub: {
        fontSize: 12,
        marginTop: 2,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 16,
    },

    /* Floating Liquid Glass Toolbar */
    floatingInputWrapper: {
        position: 'absolute',
        left: 16,
        right: 16,
        zIndex: 50,
    },
    floatingSearchToolbarRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        width: '100%',
    },
    floatingSearchCapsule: {
        flex: 1,
        height: 44,
        borderRadius: 22,
        overflow: 'hidden',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 4,
    },
    searchInnerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        gap: 8,
        width: '100%',
        height: '100%',
    },
    floatingSearchInput: {
        flex: 1,
        fontSize: 14,
        fontWeight: '400',
        padding: 0,
    },
    floatingCircleBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 4,
    },
});
