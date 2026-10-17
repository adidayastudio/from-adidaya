import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { GlassView } from '@/components/ui/GlassView';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { SegmentedControl, Segment } from '@/components/ui/SegmentedControl';
import { JCLUB_REPORT_TYPES } from '@/components/reports/mockData';
import { LinearGradient } from 'expo-linear-gradient';
import ContextMenu from '@/components/ui/PlatformContextMenu';
import { ActivityTemplate, ReportType } from '@/components/reports/types';
import { ActivityFormStructureSheet } from './ActivityFormStructureSheet';
import { ReportTypeDetailSheet, getTwoToneGradient } from './ReportTypeDetailSheet';
import { CategoryDetailSheet, ReportCategoryData } from './CategoryDetailSheet';

export type StructureTab = 'report_types' | 'activities' | 'categories';
export type StructureSortBy = 'default' | 'name_asc' | 'name_desc' | 'count';

export interface ReportsStructureSectionProps {
    isDark: boolean;
    textColor: string;
    subtextColor: string;
    activeTab: StructureTab;
    onTabChange: (tab: StructureTab) => void;
    searchQuery: string;
    isSearchVisible?: boolean;
    addTrigger?: number;
    sortBy?: StructureSortBy;
}

const STRUCTURE_SEGMENTS: Segment[] = [
    { id: 'categories', label: 'Categories', icon: 'tag.fill' as any },
    { id: 'report_types', label: 'Report Types', icon: 'doc.text.fill' as any },
    { id: 'activities', label: 'Activities', icon: 'checklist' as any },
];

const INITIAL_CATEGORIES: ReportCategoryData[] = [
    { id: 'cat_facility', name: 'Facility & Operations', code: 'FAC', icon: 'building.2.crop.circle.fill', color: '#10B981', colorEnd: '#059669', description: 'Core building utilities, HVAC, and equipment routines' },
    { id: 'cat_housekeeping', name: 'Housekeeping', code: 'HKP', icon: 'sparkles', color: '#0284C7', colorEnd: '#0369A1', description: 'Sanitation, locker hygiene, and general premises care' },
    { id: 'cat_hse', name: 'HSE & Safety', code: 'HSE', icon: 'shield.checkerboard', color: '#F59E0B', colorEnd: '#D97706', description: 'Health, environmental safety, fire extinguishers & drills' },
    { id: 'cat_general', name: 'General', code: 'GEN', icon: 'folder.fill', color: '#6366F1', colorEnd: '#4F46E5', description: 'Standard administrative operations and audits' },
];

export function ReportsStructureSection({
    isDark,
    textColor,
    subtextColor,
    activeTab,
    onTabChange,
    searchQuery,
    isSearchVisible,
    addTrigger,
    sortBy = 'default',
}: ReportsStructureSectionProps) {
    const [categories, setCategories] = useState<ReportCategoryData[]>(INITIAL_CATEGORIES);
    const [reportTypes, setReportTypes] = useState<ReportType[]>(JCLUB_REPORT_TYPES);
    const [selectedCategoryToEdit, setSelectedCategoryToEdit] = useState<ReportCategoryData | null>(null);
    const [selectedReportType, setSelectedReportType] = useState<ReportType | null>(null);
    const [selectedActivity, setSelectedActivity] = useState<ActivityTemplate | null>(null);
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);
    const [collapsedGroupIds, setCollapsedGroupIds] = useState<Set<string>>(new Set());
    const [lastTrigger, setLastTrigger] = useState(0);

    const toggleGroupCollapse = (reportTypeId: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setCollapsedGroupIds(prev => {
            const next = new Set(prev);
            if (next.has(reportTypeId)) {
                next.delete(reportTypeId);
            } else {
                next.add(reportTypeId);
            }
            return next;
        });
    };

    const handleSaveCategory = (updated: ReportCategoryData) => {
        setCategories(prev => {
            const exists = prev.some(c => c.id === updated.id);
            if (exists) {
                return prev.map(c => c.id === updated.id ? updated : c);
            }
            return [updated, ...prev];
        });
    };

    const handleSaveReportType = (updated: ReportType) => {
        setReportTypes(prev => {
            const exists = prev.some(rt => rt.id === updated.id);
            if (exists) {
                return prev.map(rt => rt.id === updated.id ? updated : rt);
            }
            return [updated, ...prev];
        });
    };

    const handleSaveActivity = (updated: ActivityTemplate) => {
        setReportTypes(prev => prev.map(rt => {
            if (rt.id === updated.reportTypeId) {
                const exists = rt.activities.some(a => a.id === updated.id);
                const updatedActivities = exists
                    ? rt.activities.map(a => a.id === updated.id ? updated : a)
                    : [updated, ...rt.activities];
                return { ...rt, activities: updatedActivities };
            }
            const hadIt = rt.activities.some(a => a.id === updated.id);
            if (hadIt) {
                return { ...rt, activities: rt.activities.filter(a => a.id !== updated.id) };
            }
            return rt;
        }));
        setSelectedActivity(null);
    };

    const handleAddActivityToReportType = (reportTypeId: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const newAct: ActivityTemplate = {
            id: `act_${Date.now()}`,
            reportTypeId: reportTypeId,
            name: '',
            frequency: 'Daily',
            fields: [],
            isActive: true,
        };
        setSelectedActivity(newAct);
    };

    const handleDeleteCategory = (catId: string, catName: string) => {
        Alert.alert(
            'Delete Category',
            `Are you sure you want to delete "${catName}"? This cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        setCategories(prev => prev.filter(c => c.id !== catId));
                    },
                },
            ]
        );
    };

    const handleDeleteReportType = (rtId: string, rtName: string) => {
        Alert.alert(
            'Delete Report Type',
            `Are you sure you want to delete "${rtName}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        setReportTypes(prev => prev.filter(rt => rt.id !== rtId));
                    },
                },
            ]
        );
    };

    const handleDeleteActivity = (actId: string, actName: string) => {
        Alert.alert(
            'Delete Activity',
            `Are you sure you want to delete "${actName}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        setReportTypes(prev => prev.map(rt => ({
                            ...rt,
                            activities: rt.activities.filter(a => a.id !== actId),
                        })));
                        setSelectedActivity(null);
                    },
                },
            ]
        );
    };

    React.useEffect(() => {
        if (addTrigger && addTrigger > lastTrigger) {
            setLastTrigger(addTrigger);
            if (activeTab === 'categories') {
                const newCat: ReportCategoryData = {
                    id: `cat_${Date.now()}`,
                    name: '',
                    code: '',
                    icon: 'building.2.crop.circle.fill',
                    color: '#10B981',
                    colorEnd: '#059669',
                    description: '',
                };
                setSelectedCategoryToEdit(newCat);
            } else if (activeTab === 'report_types') {
                const newType: ReportType = {
                    id: `rep_${Date.now()}`,
                    name: '',
                    category: categories[0]?.name || 'Facility & Operations',
                    color: '#10B981',
                    colorEnd: '#059669',
                    codePrefix: 'REP',
                    icon: 'doc.text.fill',
                    shortDescription: '',
                    activities: [],
                };
                setSelectedReportType(newType);
            } else if (activeTab === 'activities') {
                const newAct: ActivityTemplate = {
                    id: `act_${Date.now()}`,
                    reportTypeId: reportTypes[0]?.id || 'rep_maintenance',
                    name: '',
                    frequency: 'Daily',
                    fields: [],
                    isActive: true,
                };
                setSelectedActivity(newAct);
            }
        }
    }, [addTrigger, activeTab, lastTrigger, categories, reportTypes]);

    // Filtered & Sorted Report Types
    const filteredReportTypes = useMemo(() => {
        let list = [...reportTypes];
        if (selectedCategoryFilter) {
            list = list.filter(rt => rt.category === selectedCategoryFilter);
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(
                (rt) => rt.name.toLowerCase().includes(q) || rt.category?.toLowerCase().includes(q)
            );
        }
        if (sortBy === 'name_asc') {
            list.sort((a, b) => a.name.localeCompare(b.name));
        } else if (sortBy === 'name_desc') {
            list.sort((a, b) => b.name.localeCompare(a.name));
        } else if (sortBy === 'count') {
            list.sort((a, b) => (b.activities?.length || 0) - (a.activities?.length || 0));
        }
        return list;
    }, [reportTypes, searchQuery, selectedCategoryFilter, sortBy]);

    // Grouped & Sorted Report Types by Category
    const groupedReportTypes = useMemo(() => {
        const groups: Array<{
            categoryId: string;
            categoryName: string;
            types: ReportType[];
        }> = [];

        categories.forEach((cat) => {
            const types = filteredReportTypes.filter(rt => rt.category === cat.name);
            if (types.length > 0) {
                groups.push({
                    categoryId: cat.id,
                    categoryName: cat.name,
                    types,
                });
            }
        });

        // Any uncategorized or non-matching category
        const knownCatNames = new Set(categories.map(c => c.name));
        const extraTypes = filteredReportTypes.filter(rt => !knownCatNames.has(rt.category || ''));
        if (extraTypes.length > 0) {
            const extraMap = new Map<string, ReportType[]>();
            extraTypes.forEach(rt => {
                const cName = rt.category || 'Other';
                if (!extraMap.has(cName)) extraMap.set(cName, []);
                extraMap.get(cName)!.push(rt);
            });
            extraMap.forEach((types, cName) => {
                groups.push({
                    categoryId: `cat_extra_${cName}`,
                    categoryName: cName,
                    types,
                });
            });
        }

        return groups;
    }, [categories, filteredReportTypes]);

    // Grouped & Sorted Activities by Report Type
    const groupedActivities = useMemo(() => {
        const groups: Array<{
            reportTypeId: string;
            reportTypeName: string;
            reportType: ReportType;
            activities: ActivityTemplate[];
        }> = [];

        reportTypes.forEach((rt) => {
            let acts = (rt.activities || []).filter((act) => {
                if (!searchQuery.trim()) return true;
                const q = searchQuery.toLowerCase();
                return act.name.toLowerCase().includes(q) || rt.name.toLowerCase().includes(q);
            });
            if (acts.length > 0 || !searchQuery.trim()) {
                if (sortBy === 'name_asc') {
                    acts = [...acts].sort((a, b) => a.name.localeCompare(b.name));
                } else if (sortBy === 'name_desc') {
                    acts = [...acts].sort((a, b) => b.name.localeCompare(a.name));
                }
                groups.push({
                    reportTypeId: rt.id,
                    reportTypeName: rt.name,
                    reportType: rt,
                    activities: acts,
                });
            }
        });

        if (sortBy === 'name_asc') {
            groups.sort((a, b) => a.reportTypeName.localeCompare(b.reportTypeName));
        } else if (sortBy === 'name_desc') {
            groups.sort((a, b) => b.reportTypeName.localeCompare(a.reportTypeName));
        } else if (sortBy === 'count') {
            groups.sort((a, b) => b.activities.length - a.activities.length);
        }
        return groups;
    }, [reportTypes, searchQuery, sortBy]);

    // Categories definition computed dynamically from state and report types
    const categoriesData = useMemo(() => {
        let computed = categories.map(cat => {
            const linkedTypes = reportTypes.filter(rt => rt.category === cat.name);
            const totalActs = linkedTypes.reduce((acc, rt) => acc + (rt.activities?.length || 0), 0);
            return {
                ...cat,
                reportCount: linkedTypes.length,
                activityCount: totalActs,
            };
        });

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            computed = computed.filter((c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q));
        }

        if (sortBy === 'name_asc') {
            computed.sort((a, b) => a.name.localeCompare(b.name));
        } else if (sortBy === 'name_desc') {
            computed.sort((a, b) => b.name.localeCompare(a.name));
        } else if (sortBy === 'count') {
            computed.sort((a, b) => (b.activityCount || 0) - (a.activityCount || 0));
        }

        return computed;
    }, [categories, reportTypes, searchQuery, sortBy]);

    const dividerStyle = [
        s.divider,
        { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' },
    ];

    return (
        <View style={s.container}>
            {/* Sub-Segments */}
            <View style={s.segmentedBox}>
                <SegmentedControl
                    segments={STRUCTURE_SEGMENTS}
                    activeSegment={activeTab}
                    onSegmentChange={(newTab) => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        onTabChange(newTab as StructureTab);
                    }}
                />
            </View>

            {/* TAB 1: Categories */}
            {activeTab === 'categories' && (
                <View style={s.sectionBlock}>
                    <Text style={[s.sectionHeaderLabel, { color: subtextColor }]}>
                        Report Categories ({categoriesData.length})
                    </Text>

                    <View style={s.reportTypesGrid}>
                        {categoriesData.map((cat) => (
                            <ContextMenu
                                key={cat.id}
                                actions={[
                                    { title: 'Edit Category', systemIcon: 'pencil' },
                                    { title: 'View Report Types', systemIcon: 'doc.text.fill' },
                                    { title: 'Delete Category', systemIcon: 'trash', destructive: true },
                                ]}
                                previewBackgroundColor="transparent"
                                style={{ borderRadius: 20 }}
                                onPress={(e) => {
                                    const action = e.nativeEvent.name;
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    if (action === 'Edit Category') {
                                        setSelectedCategoryToEdit(cat);
                                    } else if (action === 'View Report Types') {
                                        setSelectedCategoryFilter(cat.name);
                                        onTabChange('report_types');
                                    } else if (action === 'Delete Category') {
                                        handleDeleteCategory(cat.id, cat.name);
                                    }
                                }}
                            >
                                <TouchableOpacity
                                    activeOpacity={0.75}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setSelectedCategoryToEdit(cat);
                                    }}
                                >
                                    <GlassView
                                        intensity={isDark ? 10 : 25}
                                        style={[
                                            s.reportTypeCard,
                                            { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.7)' },
                                        ]}
                                    >
                                        <LinearGradient
                                            colors={[cat.color, cat.colorEnd || cat.color]}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                            style={s.typeIconBox}
                                        >
                                            <PlatformIcon name={cat.icon as any} size={20} tintColor="#FFFFFF" />
                                        </LinearGradient>

                                        <View style={s.textCol}>
                                            <Text style={[s.itemTitle, { color: textColor }]}>{cat.name}</Text>
                                            <View style={s.subtitleRow}>
                                                <View
                                                    style={[
                                                        s.codePill,
                                                        { backgroundColor: isDark ? `${cat.color}25` : `${cat.color}15` },
                                                    ]}
                                                >
                                                    <Text style={[s.codeText, { color: cat.color }]}>{cat.code}</Text>
                                                </View>
                                                <Text style={[s.itemSubtitle, { color: subtextColor }]}>
                                                    {cat.reportCount} report types • {cat.activityCount} activities
                                                </Text>
                                            </View>
                                        </View>

                                        <PlatformIcon
                                            name="chevron.right"
                                            size={14}
                                            tintColor={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'}
                                        />
                                    </GlassView>
                                </TouchableOpacity>
                            </ContextMenu>
                        ))}
                    </View>
                </View>
            )}

            {/* TAB 2: Report Types - Grouped by Category */}
            {activeTab === 'report_types' && (
                <View style={s.reportTypesWrapper}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 }}>
                        <Text style={[s.sectionHeaderLabel, { color: subtextColor }]}>
                            Report Types ({filteredReportTypes.length})
                            {selectedCategoryFilter ? ` in ${selectedCategoryFilter}` : ''}
                        </Text>
                        {selectedCategoryFilter && (
                            <TouchableOpacity onPress={() => setSelectedCategoryFilter(null)}>
                                <Text style={{ fontSize: 12, color: '#007AFF', fontWeight: '500' }}>Show All</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {groupedReportTypes.map((group) => (
                        <View key={group.categoryId} style={s.sectionBlock}>
                            <Text style={[s.categorySubheaderLabel, { color: subtextColor }]}>
                                {group.categoryName} ({group.types.length})
                            </Text>

                            <View style={s.reportTypesGrid}>
                                {group.types.map((rt) => (
                                    <ContextMenu
                                        key={rt.id}
                                        actions={[
                                            { title: 'Edit Report Type', systemIcon: 'pencil' },
                                            { title: 'Delete Report Type', systemIcon: 'trash', destructive: true },
                                        ]}
                                        previewBackgroundColor="transparent"
                                        style={{ borderRadius: 20 }}
                                        onPress={(e) => {
                                            const action = e.nativeEvent.name;
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            if (action === 'Edit Report Type') {
                                                setSelectedReportType(rt);
                                            } else if (action === 'Delete Report Type') {
                                                Alert.alert(
                                                    'Delete Report Type',
                                                    `Are you sure you want to delete "${rt.name}"?`,
                                                    [
                                                        { text: 'Cancel', style: 'cancel' },
                                                        {
                                                            text: 'Delete',
                                                            style: 'destructive',
                                                            onPress: () => {
                                                                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                                            },
                                                        },
                                                    ]
                                                );
                                            }
                                        }}
                                    >
                                        <TouchableOpacity
                                            activeOpacity={0.75}
                                            onPress={() => {
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                setSelectedReportType(rt);
                                            }}
                                        >
                                            <GlassView
                                                intensity={isDark ? 10 : 25}
                                                style={[
                                                    s.reportTypeCard,
                                                    { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.7)' },
                                                ]}
                                            >
                                                <LinearGradient
                                                    colors={[rt.color, rt.colorEnd || rt.color]}
                                                    start={{ x: 0, y: 0 }}
                                                    end={{ x: 1, y: 1 }}
                                                    style={s.typeIconBox}
                                                >
                                                    <PlatformIcon name={rt.icon as any} size={20} tintColor="#FFFFFF" />
                                                </LinearGradient>

                                                <View style={s.textCol}>
                                                    <Text style={[s.itemTitle, { color: textColor }]}>{rt.name}</Text>
                                                    <View style={s.subtitleRow}>
                                                        <View
                                                            style={[
                                                                s.codePill,
                                                                { backgroundColor: isDark ? `${rt.color}25` : `${rt.color}15` },
                                                            ]}
                                                        >
                                                            <Text style={[s.codeText, { color: rt.color }]}>
                                                                {rt.id === 'rep_maintenance' ? 'MNT' : rt.id === 'rep_cleaning' ? 'CLN' : rt.id === 'rep_energy' ? 'NRG' : rt.id === 'rep_sanitation' ? 'SNT' : rt.id === 'rep_hse_audit' ? 'HSE' : 'REP'}
                                                            </Text>
                                                        </View>
                                                        <Text style={[s.itemSubtitle, { color: subtextColor }]} numberOfLines={1}>
                                                            {rt.activities.length} activities • {rt.category}
                                                        </Text>
                                                    </View>
                                                </View>

                                                <PlatformIcon
                                                    name="chevron.right"
                                                    size={14}
                                                    tintColor={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'}
                                                />
                                            </GlassView>
                                        </TouchableOpacity>
                                    </ContextMenu>
                                ))}
                            </View>
                        </View>
                    ))}
                    {groupedReportTypes.length === 0 && (
                        <View style={s.emptyState}>
                            <Text style={{ color: subtextColor, fontSize: 14 }}>No report types found</Text>
                        </View>
                    )}
                </View>
            )}

            {/* TAB 3: Activities - Grouped by Report Type (Collapsible with Actions) */}
            {activeTab === 'activities' && (
                <View style={s.activitiesWrapper}>
                    {groupedActivities.map((group) => {
                        const isCollapsed = collapsedGroupIds.has(group.reportTypeId);
                        const grad = getTwoToneGradient(group.reportType.color, group.reportType.colorEnd);

                        return (
                            <View key={group.reportTypeId} style={s.sectionBlock}>
                                {/* Collapsible Group Header with Native Actions */}
                                <View style={s.activityGroupHeaderRow}>
                                    <TouchableOpacity
                                        activeOpacity={0.7}
                                        style={s.activityGroupHeaderLeft}
                                        onPress={() => toggleGroupCollapse(group.reportTypeId)}
                                    >
                                        <PlatformIcon
                                            name={isCollapsed ? 'chevron.right' : 'chevron.down'}
                                            size={12}
                                            tintColor={subtextColor}
                                        />
                                        <LinearGradient
                                            colors={grad}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                            style={s.miniTypeIconBox}
                                        >
                                            <PlatformIcon name={group.reportType.icon as any} size={13} tintColor="#FFFFFF" />
                                        </LinearGradient>
                                        <Text style={[s.sectionHeaderLabel, { color: textColor, paddingHorizontal: 0 }]}>
                                            {group.reportTypeName}
                                        </Text>
                                        <Text style={[s.groupCountBadgeText, { color: subtextColor }]}>
                                            ({group.activities.length})
                                        </Text>
                                    </TouchableOpacity>

                                    {/* Action buttons on group header */}
                                    <View style={s.activityGroupHeaderRight}>
                                        <ContextMenu
                                            actions={[
                                                { title: 'Add Activity', systemIcon: 'plus' },
                                                { title: 'Edit Report Type', systemIcon: 'pencil' },
                                                { title: 'Delete Report Type', systemIcon: 'trash', destructive: true },
                                            ]}
                                            dropdownMenuMode={true}
                                            previewBackgroundColor="transparent"
                                            onPress={(e) => {
                                                const action = e.nativeEvent.name;
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                if (action === 'Add Activity') {
                                                    handleAddActivityToReportType(group.reportTypeId);
                                                } else if (action === 'Edit Report Type') {
                                                    setSelectedReportType(group.reportType);
                                                } else if (action === 'Delete Report Type') {
                                                    handleDeleteReportType(group.reportTypeId, group.reportTypeName);
                                                }
                                            }}
                                        >
                                            <TouchableOpacity
                                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                                style={s.headerActionIconBtn}
                                            >
                                                <PlatformIcon
                                                    name="ellipsis.circle"
                                                    size={19}
                                                    tintColor={isDark ? '#8E8E93' : '#6E6E73'}
                                                />
                                            </TouchableOpacity>
                                        </ContextMenu>

                                        <TouchableOpacity
                                            activeOpacity={0.7}
                                            onPress={() => handleAddActivityToReportType(group.reportTypeId)}
                                            style={[
                                                s.headerAddBtn,
                                                { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
                                            ]}
                                        >
                                            <PlatformIcon name="plus" size={12} tintColor="#007AFF" />
                                            <Text style={s.headerAddBtnText}>Activity</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* Collapsible Card Content */}
                                {!isCollapsed && (
                                    <GlassView
                                        intensity={isDark ? 10 : 25}
                                        style={[
                                            s.card,
                                            { backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.7)' },
                                        ]}
                                    >
                                        {group.activities.map((act, idx) => (
                                            <View key={`${act.id}_${idx}`}>
                                                <ContextMenu
                                                    actions={[
                                                        { title: 'Edit Form & Fields', systemIcon: 'pencil' },
                                                        { title: 'Duplicate Activity', systemIcon: 'doc.on.doc' },
                                                        { title: 'Delete Activity', systemIcon: 'trash', destructive: true },
                                                    ]}
                                                    previewBackgroundColor="transparent"
                                                    style={{ borderRadius: 14 }}
                                                    onPress={(e) => {
                                                        const action = e.nativeEvent.name;
                                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                        if (action === 'Edit Form & Fields') {
                                                            setSelectedActivity(act);
                                                        } else if (action === 'Duplicate Activity') {
                                                            const dup: ActivityTemplate = {
                                                                ...act,
                                                                id: `act_${Date.now()}`,
                                                                name: `${act.name} (Copy)`,
                                                            };
                                                            handleSaveActivity(dup);
                                                        } else if (action === 'Delete Activity') {
                                                            handleDeleteActivity(act.id, act.name);
                                                        }
                                                    }}
                                                >
                                                    <TouchableOpacity
                                                        style={s.rowButton}
                                                        activeOpacity={0.7}
                                                        onPress={() => {
                                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                            setSelectedActivity(act);
                                                        }}
                                                    >
                                                        <View style={s.textCol}>
                                                            <Text style={[s.itemTitle, { color: textColor }]}>{act.name}</Text>
                                                            <Text style={[s.itemSubtitle, { color: subtextColor }]}>
                                                                {act.frequency} • {act.fields?.length || 0} fields
                                                            </Text>
                                                        </View>
                                                        <PlatformIcon
                                                            name="chevron.right"
                                                            size={14}
                                                            tintColor={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'}
                                                        />
                                                    </TouchableOpacity>
                                                </ContextMenu>
                                                {idx < group.activities.length - 1 && <View style={dividerStyle} />}
                                            </View>
                                        ))}

                                        {group.activities.length === 0 && (
                                            <View style={{ padding: 18, alignItems: 'center' }}>
                                                <Text style={{ color: subtextColor, fontSize: 13 }}>No activities in this report type</Text>
                                            </View>
                                        )}
                                    </GlassView>
                                )}
                            </View>
                        );
                    })}
                    {groupedActivities.length === 0 && (
                        <View style={s.emptyState}>
                            <Text style={{ color: subtextColor, fontSize: 14 }}>No activities found</Text>
                        </View>
                    )}
                </View>
            )}

            {/* Category Detail & Editor Sheet */}
            <CategoryDetailSheet
                visible={!!selectedCategoryToEdit}
                category={selectedCategoryToEdit}
                linkedReportTypes={selectedCategoryToEdit ? reportTypes.filter(rt => rt.category === selectedCategoryToEdit.name) : []}
                onClose={() => setSelectedCategoryToEdit(null)}
                onSave={handleSaveCategory}
                onViewReportTypes={(categoryName) => {
                    setSelectedCategoryToEdit(null);
                    setSelectedCategoryFilter(categoryName);
                    onTabChange('report_types');
                }}
            />

            {/* Report Type Detail / Edit Sheet */}
            <ReportTypeDetailSheet
                visible={!!selectedReportType}
                reportType={selectedReportType}
                onClose={() => setSelectedReportType(null)}
                onSave={handleSaveReportType}
                onSelectActivity={(act) => {
                    setSelectedReportType(null);
                    setTimeout(() => setSelectedActivity(act), 300);
                }}
                onAddActivity={(rtId) => {
                    setSelectedReportType(null);
                    setTimeout(() => handleAddActivityToReportType(rtId), 300);
                }}
                isDark={isDark}
                textColor={textColor}
                subtextColor={subtextColor}
            />

            {/* Activity Form Structure & Preview Sheet */}
            <ActivityFormStructureSheet
                visible={!!selectedActivity}
                activity={selectedActivity}
                reportTypeName={selectedActivity ? reportTypes.find(rt => rt.id === selectedActivity.reportTypeId)?.name : undefined}
                reportTypeColor={selectedActivity ? reportTypes.find(rt => rt.id === selectedActivity.reportTypeId)?.color : '#14B8A6'}
                onClose={() => setSelectedActivity(null)}
                onSave={handleSaveActivity}
                onDelete={(actId) => handleDeleteActivity(actId, selectedActivity?.name || '')}
            />
        </View>
    );
}

const s = StyleSheet.create({
    container: {
        gap: 16,
    },
    segmentedBox: {
        marginBottom: 4,
    },
    sectionBlock: {
        gap: 8,
    },
    sectionHeaderLabel: {
        fontSize: 13,
        fontWeight: '600',
        paddingHorizontal: 12,
        letterSpacing: -0.1,
    },
    reportTypesGrid: {
        gap: 10,
    },
    reportTypeCard: {
        borderRadius: 20,
        overflow: 'hidden',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        gap: 14,
    },
    typeIconBox: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
    },
    codePill: {
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 999,
        alignSelf: 'center',
    },
    codeText: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    subtitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flexWrap: 'wrap',
    },
    card: {
        borderRadius: 24,
        overflow: 'hidden',
    },
    rowButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 13,
        paddingHorizontal: 16,
    },
    textCol: {
        flex: 1,
        gap: 3,
    },
    itemTitle: {
        fontSize: 16,
        fontWeight: '500',
        letterSpacing: -0.3,
    },
    itemSubtitle: {
        fontSize: 13,
        fontWeight: '400',
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 16,
    },
    activityGroupHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    activityGroupHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    activityGroupHeaderRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    miniTypeIconBox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    groupCountBadgeText: {
        fontSize: 13,
        fontWeight: '500',
    },
    headerActionIconBtn: {
        padding: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerAddBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 12,
    },
    headerAddBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#007AFF',
    },
    activitiesWrapper: {
        gap: 16,
    },
    reportTypesWrapper: {
        gap: 16,
    },
    categorySubheaderLabel: {
        fontSize: 13,
        fontWeight: '600',
        paddingHorizontal: 12,
        letterSpacing: -0.1,
    },
    emptyState: {
        padding: 24,
        alignItems: 'center',
    },
});
