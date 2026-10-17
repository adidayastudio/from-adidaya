import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Modal,
    ScrollView,
    Alert,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import * as Haptics from 'expo-haptics';
import {
    fetchDefaultWorkspaceId,
    fetchProjectTypes,
    createProjectType,
    updateProjectType,
    deleteProjectType,
    fetchTypologies,
    createTypology,
    updateTypology,
    deleteTypology,
    fetchDisciplines,
    createDiscipline,
    updateDiscipline,
    deleteDiscipline,
    fetchClasses,
    createClass,
    updateClass,
    deleteClass,
    fetchLocationFactors,
    createLocationFactor,
    updateLocationFactor,
    deleteLocationFactor,
    ProjectTypeTemplate,
    Typology,
    Discipline,
    ClassTemplate,
    LocationFactor,
} from '@/lib/api/templates';

export type ConfigSectionMode = 'scope' | 'typology' | 'discipline' | 'class' | 'location_factors';

interface ProjectTemplateConfigSectionProps {
    mode: ConfigSectionMode;
    isDark: boolean;
    textColor: string;
    subtextColor: string;
    isAddSheetOpen?: boolean;
    onCloseAddSheet?: () => void;
}

const PASTEL_COLORS = [
    'bg-blue-200', 'bg-amber-200', 'bg-red-200', 'bg-green-200',
    'bg-emerald-200', 'bg-purple-200', 'bg-violet-200', 'bg-cyan-200',
    'bg-orange-200', 'bg-rose-200', 'bg-teal-200', 'bg-stone-200'
];

const COLOR_MAP: Record<string, string> = {
    'bg-red-200': '#FECACA',
    'bg-orange-200': '#FED7AA',
    'bg-amber-200': '#FDE68A',
    'bg-yellow-200': '#FEF08A',
    'bg-lime-200': '#D9F99D',
    'bg-green-200': '#BBF7D0',
    'bg-emerald-200': '#A7F3D0',
    'bg-teal-200': '#99F6E4',
    'bg-cyan-200': '#A5F3FC',
    'bg-sky-200': '#BAE6FD',
    'bg-blue-200': '#BFDBFE',
    'bg-indigo-200': '#C7D2FE',
    'bg-violet-200': '#DDD6FE',
    'bg-purple-200': '#E9D5FF',
    'bg-fuchsia-200': '#F5D0FE',
    'bg-pink-200': '#FBCFE8',
    'bg-rose-200': '#FECDD3',
    'bg-stone-200': '#E7E5E4',
};

export function ProjectTemplateConfigSection({
    mode,
    isDark,
    textColor,
    subtextColor,
    isAddSheetOpen = false,
    onCloseAddSheet,
}: ProjectTemplateConfigSectionProps) {
    const [workspaceId, setWorkspaceId] = useState<string>('f39364e8-1376-4ff7-a716-78277e8d25b3');

    const [isLoading, setIsLoading] = useState(true);
    const [scopes, setScopes] = useState<ProjectTypeTemplate[]>([]);
    const [typologies, setTypologies] = useState<Typology[]>([]);
    const [disciplines, setDisciplines] = useState<Discipline[]>([]);
    const [classes, setClasses] = useState<ClassTemplate[]>([]);
    const [locations, setLocations] = useState<LocationFactor[]>([]);

    // Modal state for Add/Edit
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [editItem, setEditItem] = useState<any | null>(null);
    const [formCode, setFormCode] = useState('');
    const [formName, setFormName] = useState('');
    const [formDesc, setFormDesc] = useState('');
    const [formNameId, setFormNameId] = useState('');
    const [formColor, setFormColor] = useState('bg-purple-200');
    const [formComplexity, setFormComplexity] = useState('Medium');
    const [formFinishLevel, setFormFinishLevel] = useState('');
    const [formProvince, setFormProvince] = useState('');
    const [formCity, setFormCity] = useState('');
    const [formRegionalFactor, setFormRegionalFactor] = useState('1.0');
    const [formDifficultyFactor, setFormDifficultyFactor] = useState('1.0');

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const wsId = (await fetchDefaultWorkspaceId()) || 'f39364e8-1376-4ff7-a716-78277e8d25b3';
            setWorkspaceId(wsId);

            if (mode === 'scope') {
                const data = await fetchProjectTypes(wsId);
                setScopes(data || []);
            } else if (mode === 'typology') {
                const data = await fetchTypologies(wsId);
                setTypologies(data || []);
            } else if (mode === 'discipline') {
                const data = await fetchDisciplines(wsId);
                setDisciplines((data || []).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)));
            } else if (mode === 'class') {
                const data = await fetchClasses(wsId);
                setClasses((data || []).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)));
            } else if (mode === 'location_factors') {
                const data = await fetchLocationFactors(wsId);
                setLocations(data || []);
            }
        } catch (e) {
            console.error('Error loading config data:', e);
        } finally {
            setIsLoading(false);
        }
    }, [mode]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        if (isAddSheetOpen) {
            handleOpenAdd();
            onCloseAddSheet?.();
        }
    }, [isAddSheetOpen]);

    const handleOpenAdd = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setEditItem(null);
        setFormCode('');
        setFormName('');
        setFormDesc('');
        setFormNameId('');
        setFormColor('bg-purple-200');
        setFormComplexity('Medium');
        setFormFinishLevel('');
        setFormProvince('');
        setFormCity('');
        setFormRegionalFactor('1.0');
        setFormDifficultyFactor('1.0');
        setIsSheetOpen(true);
    };

    const handleOpenEdit = (item: any) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setEditItem(item);
        setFormCode(item.code || item.classCode || '');
        setFormName(item.name || item.nameEn || item.description || '');
        setFormDesc(item.description || '');
        setFormNameId(item.nameId || '');
        setFormColor(item.color || 'bg-purple-200');
        setFormComplexity(item.complexityLevel || 'Medium');
        setFormFinishLevel(item.finishLevel || '');
        setFormProvince(item.province || '');
        setFormCity(item.city || '');
        setFormRegionalFactor(String(item.regionalFactor ?? '1.0'));
        setFormDifficultyFactor(String(item.difficultyFactor ?? '1.0'));
        setIsSheetOpen(true);
    };

    const handleDelete = (id: string, name: string) => {
        Alert.alert(
            'Confirm Delete',
            `Are you sure you want to delete "${name}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            if (mode === 'scope') {
                                await deleteProjectType(id, workspaceId);
                                setScopes(prev => prev.filter(s => s.projectTypeId !== id && s.id !== id));
                            } else if (mode === 'typology') {
                                await deleteTypology(id, workspaceId);
                                setTypologies(prev => prev.filter(t => t.id !== id));
                            } else if (mode === 'discipline') {
                                await deleteDiscipline(id, workspaceId);
                                setDisciplines(prev => prev.filter(d => d.id !== id));
                            } else if (mode === 'class') {
                                await deleteClass(id, workspaceId);
                                setClasses(prev => prev.filter(c => c.id !== id));
                            } else if (mode === 'location_factors') {
                                await deleteLocationFactor(id, workspaceId);
                                setLocations(prev => prev.filter(l => l.id !== id));
                            }
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        } catch {
                            Alert.alert('Error', 'Failed to delete.');
                        }
                    },
                },
            ]
        );
    };

    const handleSaveForm = async () => {
        const cleanCode = formCode.trim().toUpperCase();
        const cleanName = formName.trim();

        if (!cleanCode) {
            Alert.alert('Validation Error', 'Code is required.');
            return;
        }

        try {
            if (mode === 'scope') {
                if (editItem) {
                    await updateProjectType(editItem.projectTypeId, workspaceId, {
                        code: cleanCode,
                        name: cleanName,
                        description: formDesc.trim(),
                    });
                    setScopes(prev => prev.map(s => s.projectTypeId === editItem.projectTypeId ? { ...s, code: cleanCode, name: cleanName, description: formDesc.trim() } : s));
                } else {
                    const newId = `scope_${Date.now()}`;
                    const created = await createProjectType(workspaceId, {
                        projectTypeId: newId,
                        code: cleanCode,
                        name: cleanName,
                        description: formDesc.trim(),
                        isActive: true,
                        icon: 'briefcase.fill',
                        color: 'bg-blue-500',
                    });
                    if (created) setScopes(prev => [...prev, created]);
                }
            } else if (mode === 'typology') {
                if (editItem) {
                    await updateTypology(editItem.id, workspaceId, {
                        code: cleanCode,
                        name: cleanName,
                        complexityLevel: formComplexity,
                    });
                    setTypologies(prev => prev.map(t => t.id === editItem.id ? { ...t, code: cleanCode, name: cleanName, complexityLevel: formComplexity } : t));
                } else {
                    const created = await createTypology(workspaceId, {
                        code: cleanCode,
                        name: cleanName,
                        parentId: null,
                        complexityLevel: formComplexity,
                        linkedProjectTypes: [],
                        sortOrder: typologies.length + 1,
                        isActive: true,
                    });
                    if (created) setTypologies(prev => [...prev, created]);
                }
            } else if (mode === 'discipline') {
                if (editItem) {
                    await updateDiscipline(editItem.id, workspaceId, {
                        code: cleanCode,
                        nameEn: cleanName,
                        nameId: formNameId.trim(),
                        color: formColor,
                    });
                    setDisciplines(prev => prev.map(d => d.id === editItem.id ? { ...d, code: cleanCode, nameEn: cleanName, nameId: formNameId.trim(), color: formColor } : d));
                } else {
                    const created = await createDiscipline(workspaceId, {
                        code: cleanCode,
                        nameEn: cleanName,
                        nameId: formNameId.trim(),
                        color: formColor,
                        sortOrder: disciplines.length + 1,
                        isActive: true,
                    });
                    if (created) setDisciplines(prev => [...prev, created]);
                }
            } else if (mode === 'class') {
                if (editItem) {
                    await updateClass(editItem.id, workspaceId, {
                        classCode: cleanCode,
                        description: cleanName,
                        finishLevel: formFinishLevel.trim(),
                    });
                    setClasses(prev => prev.map(c => c.id === editItem.id ? { ...c, classCode: cleanCode, description: cleanName, finishLevel: formFinishLevel.trim() } : c));
                } else {
                    const created = await createClass(workspaceId, {
                        classCode: cleanCode,
                        description: cleanName,
                        finishLevel: formFinishLevel.trim(),
                        sortOrder: classes.length + 1,
                        isActive: true,
                    });
                    if (created) setClasses(prev => [...prev, created]);
                }
            } else if (mode === 'location_factors') {
                const regFactor = parseFloat(formRegionalFactor) || 1.0;
                const diffFactor = parseFloat(formDifficultyFactor) || 1.0;
                if (editItem) {
                    await updateLocationFactor(editItem.id, workspaceId, {
                        code: cleanCode,
                        province: formProvince.trim() || cleanName,
                        city: formCity.trim(),
                        regionalFactor: regFactor,
                        difficultyFactor: diffFactor,
                    });
                    setLocations(prev => prev.map(l => l.id === editItem.id ? { ...l, code: cleanCode, province: formProvince.trim() || cleanName, city: formCity.trim(), regionalFactor: regFactor, difficultyFactor: diffFactor } : l));
                } else {
                    const created = await createLocationFactor(workspaceId, {
                        code: cleanCode,
                        province: formProvince.trim() || cleanName,
                        city: formCity.trim(),
                        regionalFactor: regFactor,
                        difficultyFactor: diffFactor,
                        isActive: true,
                    });
                    if (created) setLocations(prev => [...prev, created]);
                }
            }

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setIsSheetOpen(false);
        } catch {
            Alert.alert('Error', 'Failed to save.');
        }
    };

    const count = mode === 'scope'
        ? scopes.length
        : mode === 'typology'
        ? typologies.length
        : mode === 'discipline'
        ? disciplines.length
        : mode === 'class'
        ? classes.length
        : locations.length;

    const label = mode === 'scope'
        ? 'Scope'
        : mode === 'typology'
        ? 'Typology'
        : mode === 'discipline'
        ? 'Discipline'
        : mode === 'class'
        ? 'Class'
        : 'Location';

    return (
        <View style={s.container}>

            {/* Header row with count & Add button */}
            <View style={s.sectionHeaderRow}>
                <Text style={[s.sectionHeaderLabel, { color: subtextColor }]}>
                    {mode === 'scope'
                        ? `Delivery Methods (${count})`
                        : mode === 'typology'
                        ? `Typologies (${count})`
                        : mode === 'discipline'
                        ? `Disciplines (${count})`
                        : mode === 'class'
                        ? `Quality Classes (${count})`
                        : `Location Factors (${count})`}
                </Text>
                <TouchableOpacity style={s.addBtn} onPress={handleOpenAdd}>
                    <PlatformIcon name="plus" size={14} tintColor="#0036F8" />
                    <Text style={s.addBtnText}>Add {label}</Text>
                </TouchableOpacity>
            </View>

            {/* Cards List */}
            {isLoading ? (
                <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color="#0036F8" />
                </View>
            ) : count === 0 ? (
                <View style={[s.cardItem, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', alignItems: 'center', paddingVertical: 32 }]}>
                    <Text style={{ color: subtextColor, fontSize: 13 }}>No {label.toLowerCase()} templates configured yet.</Text>
                </View>
            ) : (
                <View style={s.itemsGrid}>
                {/* SCOPE ITEMS */}
                {mode === 'scope' &&
                    scopes.map((item) => (
                        <View
                            key={item.id}
                            style={[
                                s.cardItem,
                                {
                                    backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                                },
                            ]}
                        >
                            <View style={s.cardItemHeader}>
                                <View style={s.codeBadge}>
                                    <Text style={s.codeBadgeText}>{item.code || 'SCP'}</Text>
                                </View>
                                <View style={{ flex: 1, gap: 2 }}>
                                    <Text style={[s.itemTitle, { color: textColor }]}>{item.name}</Text>
                                    {!!item.description && (
                                        <Text style={[s.itemSubtitle, { color: subtextColor }]} numberOfLines={2}>
                                            {item.description}
                                        </Text>
                                    )}
                                </View>
                                <View style={s.actionRow}>
                                    <TouchableOpacity
                                        onPress={() => handleOpenEdit(item)}
                                        style={[s.iconBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}
                                    >
                                        <PlatformIcon name="pencil" size={14} tintColor={subtextColor} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => handleDelete(item.projectTypeId, item.name)}
                                        style={[s.iconBtn, { backgroundColor: isDark ? 'rgba(255,59,48,0.12)' : '#FEE2E2' }]}
                                    >
                                        <PlatformIcon name="trash" size={14} tintColor="#EF4444" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    ))}

                {/* TYPOLOGY ITEMS */}
                {mode === 'typology' &&
                    typologies.map((item) => (
                        <View
                            key={item.id}
                            style={[
                                s.cardItem,
                                {
                                    backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                                },
                            ]}
                        >
                            <View style={s.cardItemHeader}>
                                <View style={[s.codeBadge, { backgroundColor: isDark ? 'rgba(255, 149, 0, 0.16)' : '#FEF3C7' }]}>
                                    <Text style={[s.codeBadgeText, { color: isDark ? '#FBBF24' : '#D97706' }]}>{item.code}</Text>
                                </View>
                                <View style={{ flex: 1, gap: 4 }}>
                                    <Text style={[s.itemTitle, { color: textColor }]}>{item.name}</Text>
                                    <View style={{ flexDirection: 'row', gap: 6 }}>
                                        {!!item.complexityLevel && (
                                            <View style={[s.pillBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6' }]}>
                                                <Text style={[s.pillText, { color: subtextColor }]}>{item.complexityLevel}</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                                <View style={s.actionRow}>
                                    <TouchableOpacity
                                        onPress={() => handleOpenEdit(item)}
                                        style={[s.iconBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}
                                    >
                                        <PlatformIcon name="pencil" size={14} tintColor={subtextColor} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => handleDelete(item.id, item.name)}
                                        style={[s.iconBtn, { backgroundColor: isDark ? 'rgba(255,59,48,0.12)' : '#FEE2E2' }]}
                                    >
                                        <PlatformIcon name="trash" size={14} tintColor="#EF4444" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    ))}

                {/* DISCIPLINE ITEMS */}
                {mode === 'discipline' &&
                    disciplines.map((item, idx) => (
                        <View
                            key={item.id}
                            style={[
                                s.cardItem,
                                {
                                    backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                                },
                            ]}
                        >
                            <View style={s.cardItemHeader}>
                                <View style={[s.seqBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6' }]}>
                                    <Text style={[s.seqText, { color: subtextColor }]}>{item.sortOrder || idx + 1}</Text>
                                </View>
                                <View
                                    style={[
                                        s.codeBadge,
                                        { backgroundColor: item.color ? (COLOR_MAP[item.color] || '#E9D5FF') : '#E9D5FF' },
                                    ]}
                                >
                                    <Text style={[s.codeBadgeText, { color: '#1F2937' }]}>{item.code}</Text>
                                </View>
                                <View style={{ flex: 1, gap: 2 }}>
                                    <Text style={[s.itemTitle, { color: textColor }]}>{item.nameEn}</Text>
                                    {!!item.nameId && (
                                        <Text style={[s.itemSubtitle, { color: subtextColor }]}>
                                            {item.nameId}
                                        </Text>
                                    )}
                                </View>
                                <View style={s.actionRow}>
                                    <TouchableOpacity
                                        onPress={() => handleOpenEdit(item)}
                                        style={[s.iconBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}
                                    >
                                        <PlatformIcon name="pencil" size={14} tintColor={subtextColor} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => handleDelete(item.id, item.nameEn)}
                                        style={[s.iconBtn, { backgroundColor: isDark ? 'rgba(255,59,48,0.12)' : '#FEE2E2' }]}
                                    >
                                        <PlatformIcon name="trash" size={14} tintColor="#EF4444" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    ))}

                {/* CLASS ITEMS */}
                {mode === 'class' &&
                    classes.map((item) => (
                        <View
                            key={item.id}
                            style={[
                                s.cardItem,
                                {
                                    backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                                },
                            ]}
                        >
                            <View style={s.cardItemHeader}>
                                <View style={[s.codeBadge, { backgroundColor: isDark ? 'rgba(168, 85, 247, 0.16)' : '#F3E8FF' }]}>
                                    <Text style={[s.codeBadgeText, { color: isDark ? '#C084FC' : '#7E22CE' }]}>{item.classCode}</Text>
                                </View>
                                <View style={{ flex: 1, gap: 2 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <Text style={[s.itemTitle, { color: textColor }]}>
                                            {item.description || `Class ${item.classCode}`}
                                        </Text>
                                        {!!item.finishLevel && (
                                            <View style={[s.pillBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6' }]}>
                                                <Text style={[s.pillText, { color: subtextColor }]}>{item.finishLevel}</Text>
                                            </View>
                                        )}
                                    </View>
                                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                                        {item.costMultiplierS ? <Text style={[s.multiplierChip, { color: subtextColor }]}>S: {item.costMultiplierS}x</Text> : null}
                                        {item.costMultiplierA ? <Text style={[s.multiplierChip, { color: subtextColor }]}>A: {item.costMultiplierA}x</Text> : null}
                                        {item.costMultiplierM ? <Text style={[s.multiplierChip, { color: subtextColor }]}>M: {item.costMultiplierM}x</Text> : null}
                                        {item.costMultiplierI ? <Text style={[s.multiplierChip, { color: subtextColor }]}>I: {item.costMultiplierI}x</Text> : null}
                                        {item.costMultiplierL ? <Text style={[s.multiplierChip, { color: subtextColor }]}>L: {item.costMultiplierL}x</Text> : null}
                                    </View>
                                </View>
                                <View style={s.actionRow}>
                                    <TouchableOpacity
                                        onPress={() => handleOpenEdit(item)}
                                        style={[s.iconBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}
                                    >
                                        <PlatformIcon name="pencil" size={14} tintColor={subtextColor} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => handleDelete(item.id, item.description || item.classCode)}
                                        style={[s.iconBtn, { backgroundColor: isDark ? 'rgba(255,59,48,0.12)' : '#FEE2E2' }]}
                                    >
                                        <PlatformIcon name="trash" size={14} tintColor="#EF4444" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    ))}

                {/* LOCATION FACTORS ITEMS */}
                {mode === 'location_factors' &&
                    locations.map((item) => (
                        <View
                            key={item.id}
                            style={[
                                s.cardItem,
                                {
                                    backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                                },
                            ]}
                        >
                            <View style={s.cardItemHeader}>
                                <View style={[s.codeBadge, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.16)' : '#D1FAE5' }]}>
                                    <Text style={[s.codeBadgeText, { color: isDark ? '#34D399' : '#059669' }]}>
                                        {item.code || 'LOC'}
                                    </Text>
                                </View>
                                <View style={{ flex: 1, gap: 4 }}>
                                    <Text style={[s.itemTitle, { color: textColor }]}>
                                        {item.province}{item.city ? ` • ${item.city}` : ''}
                                    </Text>
                                    <View style={{ flexDirection: 'row', gap: 6 }}>
                                        <View style={[s.pillBadge, { backgroundColor: isDark ? 'rgba(0, 54, 248, 0.12)' : '#EFF6FF' }]}>
                                            <Text style={[s.pillText, { color: '#0036F8' }]}>
                                                Regional: {item.regionalFactor}x
                                            </Text>
                                        </View>
                                        <View style={[s.pillBadge, { backgroundColor: isDark ? 'rgba(255, 149, 0, 0.12)' : '#FEF3C7' }]}>
                                            <Text style={[s.pillText, { color: isDark ? '#FBBF24' : '#D97706' }]}>
                                                Difficulty: {item.difficultyFactor}x
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                                <View style={s.actionRow}>
                                    <TouchableOpacity
                                        onPress={() => handleOpenEdit(item)}
                                        style={[s.iconBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}
                                    >
                                        <PlatformIcon name="pencil" size={14} tintColor={subtextColor} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => handleDelete(item.id, `${item.province}${item.city ? ` - ${item.city}` : ''}`)}
                                        style={[s.iconBtn, { backgroundColor: isDark ? 'rgba(255,59,48,0.12)' : '#FEE2E2' }]}
                                    >
                                        <PlatformIcon name="trash" size={14} tintColor="#EF4444" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    ))}
                </View>
            )}

            {/* Clean, robust Edit / Add Modal */}
            <Modal
                visible={isSheetOpen}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsSheetOpen(false)}
            >
                <View style={s.modalOverlay}>
                    <View style={[s.modalCard, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
                        <View style={s.modalHeaderRow}>
                            <Text style={[s.modalTitle, { color: textColor }]}>
                                {editItem ? 'Edit' : 'Add'} {label}
                            </Text>
                            <TouchableOpacity onPress={() => setIsSheetOpen(false)}>
                                <PlatformIcon name="xmark" size={18} tintColor={subtextColor} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
                            <View style={{ gap: 12, paddingVertical: 8 }}>
                                <View style={{ gap: 4 }}>
                                    <Text style={[s.inputLabel, { color: subtextColor }]}>Code (e.g. 3 chars)</Text>
                                    <TextInput
                                        style={[s.inputBox, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7', color: textColor }]}
                                        value={formCode}
                                        onChangeText={setFormCode}
                                        placeholder="CODE"
                                        placeholderTextColor={subtextColor}
                                        autoCapitalize="characters"
                                    />
                                </View>

                                {mode !== 'location_factors' && (
                                    <View style={{ gap: 4 }}>
                                        <Text style={[s.inputLabel, { color: subtextColor }]}>Name / Description</Text>
                                        <TextInput
                                            style={[s.inputBox, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7', color: textColor }]}
                                            value={formName}
                                            onChangeText={setFormName}
                                            placeholder="Item name"
                                            placeholderTextColor={subtextColor}
                                        />
                                    </View>
                                )}

                                {mode === 'scope' && (
                                    <View style={{ gap: 4 }}>
                                        <Text style={[s.inputLabel, { color: subtextColor }]}>Scope Description</Text>
                                        <TextInput
                                            style={[s.inputBox, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7', color: textColor, minHeight: 60 }]}
                                            value={formDesc}
                                            onChangeText={setFormDesc}
                                            placeholder="Description of delivery method"
                                            placeholderTextColor={subtextColor}
                                            multiline
                                        />
                                    </View>
                                )}

                                {mode === 'discipline' && (
                                    <View style={{ gap: 4 }}>
                                        <Text style={[s.inputLabel, { color: subtextColor }]}>Indonesian Name (nameId)</Text>
                                        <TextInput
                                            style={[s.inputBox, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7', color: textColor }]}
                                            value={formNameId}
                                            onChangeText={setFormNameId}
                                            placeholder="e.g. Arsitektur"
                                            placeholderTextColor={subtextColor}
                                        />
                                    </View>
                                )}

                                {mode === 'class' && (
                                    <View style={{ gap: 4 }}>
                                        <Text style={[s.inputLabel, { color: subtextColor }]}>Finish Quality Spec</Text>
                                        <TextInput
                                            style={[s.inputBox, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7', color: textColor }]}
                                            value={formFinishLevel}
                                            onChangeText={setFormFinishLevel}
                                            placeholder="e.g. Imported fixtures"
                                            placeholderTextColor={subtextColor}
                                        />
                                    </View>
                                )}

                                {mode === 'location_factors' && (
                                    <>
                                        <View style={{ gap: 4 }}>
                                            <Text style={[s.inputLabel, { color: subtextColor }]}>Province</Text>
                                            <TextInput
                                                style={[s.inputBox, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7', color: textColor }]}
                                                value={formProvince}
                                                onChangeText={setFormProvince}
                                                placeholder="e.g. DKI Jakarta"
                                                placeholderTextColor={subtextColor}
                                            />
                                        </View>
                                        <View style={{ gap: 4 }}>
                                            <Text style={[s.inputLabel, { color: subtextColor }]}>City / Region (Optional)</Text>
                                            <TextInput
                                                style={[s.inputBox, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7', color: textColor }]}
                                                value={formCity}
                                                onChangeText={setFormCity}
                                                placeholder="e.g. Jakarta Selatan"
                                                placeholderTextColor={subtextColor}
                                            />
                                        </View>
                                        <View style={{ flexDirection: 'row', gap: 12 }}>
                                            <View style={{ flex: 1, gap: 4 }}>
                                                <Text style={[s.inputLabel, { color: subtextColor }]}>Regional Multiplier</Text>
                                                <TextInput
                                                    style={[s.inputBox, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7', color: textColor }]}
                                                    value={formRegionalFactor}
                                                    onChangeText={setFormRegionalFactor}
                                                    placeholder="1.0"
                                                    placeholderTextColor={subtextColor}
                                                    keyboardType="numeric"
                                                />
                                            </View>
                                            <View style={{ flex: 1, gap: 4 }}>
                                                <Text style={[s.inputLabel, { color: subtextColor }]}>Difficulty Multiplier</Text>
                                                <TextInput
                                                    style={[s.inputBox, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7', color: textColor }]}
                                                    value={formDifficultyFactor}
                                                    onChangeText={setFormDifficultyFactor}
                                                    placeholder="1.0"
                                                    placeholderTextColor={subtextColor}
                                                    keyboardType="numeric"
                                                />
                                            </View>
                                        </View>
                                    </>
                                )}
                            </View>
                        </ScrollView>

                        <View style={s.modalFooterRow}>
                            <TouchableOpacity style={s.modalCancelBtn} onPress={() => setIsSheetOpen(false)}>
                                <Text style={[s.modalCancelBtnText, { color: subtextColor }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={s.modalSaveBtn} onPress={handleSaveForm}>
                                <Text style={s.modalSaveBtnText}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const s = StyleSheet.create({
    container: {
        gap: 16,
        paddingHorizontal: 0,
        paddingTop: 4,
        paddingBottom: 40,
        width: '100%',
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
        marginTop: 4,
    },
    sectionHeaderLabel: {
        fontSize: 13,
        fontWeight: '600',
        letterSpacing: -0.1,
    },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: 'rgba(0, 54, 248, 0.08)',
    },
    addBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#0036F8',
    },
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 16,
        borderWidth: 1,
    },
    infoBannerText: {
        fontSize: 13,
        fontWeight: '500',
        lineHeight: 18,
        flex: 1,
    },
    itemsGrid: {
        gap: 10,
        width: '100%',
    },
    cardItem: {
        borderRadius: 18,
        padding: 14,
        borderWidth: 1,
        width: '100%',
    },
    cardItemHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    codeBadge: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        backgroundColor: 'rgba(0, 54, 248, 0.12)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    codeBadgeText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#0036F8',
        letterSpacing: 0.5,
    },
    seqBadge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    seqText: {
        fontSize: 11,
        fontWeight: '600',
    },
    itemTitle: {
        fontSize: 15,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    itemSubtitle: {
        fontSize: 13,
        fontWeight: '400',
        lineHeight: 17,
    },
    pillBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    pillText: {
        fontSize: 11,
        fontWeight: '600',
    },
    multiplierChip: {
        fontSize: 11,
        fontWeight: '500',
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    iconBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    modalCard: {
        width: '100%',
        maxWidth: 480,
        borderRadius: 24,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    modalHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '600',
    },
    inputBox: {
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
    },
    modalFooterRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
        marginTop: 16,
    },
    modalCancelBtn: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 12,
    },
    modalCancelBtnText: {
        fontSize: 14,
        fontWeight: '600',
    },
    modalSaveBtn: {
        backgroundColor: '#0036F8',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 12,
    },
    modalSaveBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
});
