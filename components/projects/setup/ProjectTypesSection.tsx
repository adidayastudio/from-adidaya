import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';
import { GlassView } from '@/components/ui/GlassView';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { IOSSwitch } from '@/components/ui/IOSSwitch';
import * as Haptics from 'expo-haptics';
import { ProjectTypeItem } from '@/lib/api/projectSetup';
import { ProjectTypeEditSheet } from './ProjectTypeEditSheet';

interface ProjectTypesSectionProps {
    isDark: boolean;
    textColor: string;
    subtextColor: string;
    types: ProjectTypeItem[];
    onUpdateTypes: (newTypes: ProjectTypeItem[]) => void;
    isAddSheetOpen?: boolean;
    onCloseAddSheet?: () => void;
}

export function ProjectTypesSection({
    isDark,
    textColor,
    subtextColor,
    types,
    onUpdateTypes,
    isAddSheetOpen = false,
    onCloseAddSheet,
}: ProjectTypesSectionProps) {
    const [editingItem, setEditingItem] = useState<ProjectTypeItem | null>(null);
    const [isEditSheetVisible, setIsEditSheetVisible] = useState(false);

    const handleOpenEdit = (item: ProjectTypeItem) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setEditingItem(item);
        setIsEditSheetVisible(true);
    };

    const handleCloseEdit = () => {
        setIsEditSheetVisible(false);
        setEditingItem(null);
    };

    const handleToggleActive = (id: string, current: boolean) => {
        Haptics.selectionAsync();
        const updated = types.map((t) => (t.id === id ? { ...t, isActive: !current } : t));
        onUpdateTypes(updated);
    };

    const handleSaveType = (savedItem: ProjectTypeItem) => {
        const exists = types.some((t) => t.id === savedItem.id);
        if (exists) {
            onUpdateTypes(types.map((t) => (t.id === savedItem.id ? savedItem : t)));
        } else {
            onUpdateTypes([...types, savedItem]);
        }
    };

    const handleDeleteType = (id: string) => {
        onUpdateTypes(types.filter((t) => t.id !== id));
    };

    return (
        <View style={s.container}>
            {/* Info Banner */}
            <View
                style={[
                    s.infoBanner,
                    {
                        backgroundColor: isDark ? 'rgba(37, 99, 235, 0.12)' : '#EFF6FF',
                        borderWidth: 1,
                        borderColor: isDark ? 'rgba(37, 99, 235, 0.25)' : 'rgba(37, 99, 235, 0.18)',
                    },
                ]}
            >
                <PlatformIcon name="info.circle.fill" size={16} tintColor="#2563EB" />
                <Text style={[s.infoBannerText, { color: isDark ? '#93C5FD' : '#1D4ED8' }]}>
                    Project Types classify projects for organization and filtering. They do not create project content automatically.
                </Text>
            </View>

            {/* List Block */}
            <View style={s.sectionBlock}>
                <Text style={[s.sectionHeaderLabel, { color: subtextColor }]}>
                    Project Types ({types.length})
                </Text>

                <View style={s.cardsList}>
                    {types.map((typeItem) => (
                        <View
                            key={typeItem.id}
                            style={[
                                s.cardItem,
                                {
                                    backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                                    borderWidth: 1,
                                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                                },
                            ]}
                        >
                            <TouchableOpacity
                                style={s.row}
                                onPress={() => handleOpenEdit(typeItem)}
                                activeOpacity={0.7}
                            >
                                <View
                                    style={[
                                        s.codeBadge,
                                        {
                                            backgroundColor: isDark
                                                ? 'rgba(37, 99, 235, 0.2)'
                                                : 'rgba(37, 99, 235, 0.12)',
                                        },
                                    ]}
                                >
                                    <Text style={s.codeBadgeText}>{typeItem.code}</Text>
                                </View>

                                <View style={s.textCol}>
                                    <Text style={[s.settingTitle, { color: textColor }]}>
                                        {typeItem.name}
                                    </Text>
                                    {!!typeItem.description && (
                                        <Text style={[s.settingSubtitle, { color: subtextColor }]}>
                                            {typeItem.description}
                                        </Text>
                                    )}
                                </View>

                                <IOSSwitch
                                    value={typeItem.isActive}
                                    onValueChange={() => handleToggleActive(typeItem.id, typeItem.isActive)}
                                    isDark={isDark}
                                />
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            </View>

            {/* Native Bottom Sheet for Adding Type */}
            <ProjectTypeEditSheet
                visible={isAddSheetOpen}
                onClose={() => onCloseAddSheet && onCloseAddSheet()}
                existingTypes={types}
                onSave={handleSaveType}
            />

            {/* Native Bottom Sheet for Editing Type */}
            <ProjectTypeEditSheet
                visible={isEditSheetVisible}
                onClose={handleCloseEdit}
                projectType={editingItem}
                existingTypes={types}
                onSave={handleSaveType}
                onDelete={handleDeleteType}
            />
        </View>
    );
}

const s = StyleSheet.create({
    container: {
        gap: 20,
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 24,
    },
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 14,
        borderRadius: 18,
    },
    infoBannerText: {
        flex: 1,
        fontSize: 13,
        lineHeight: 18,
        fontWeight: '400',
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
    cardsList: {
        gap: 10,
    },
    cardItem: {
        borderRadius: 18,
        overflow: 'hidden',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        gap: 12,
    },
    codeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        minWidth: 44,
        alignItems: 'center',
    },
    codeBadgeText: {
        color: '#2563EB',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    textCol: {
        flex: 1,
        gap: 2,
    },
    settingTitle: {
        fontSize: 16,
        fontWeight: '500',
        letterSpacing: -0.3,
    },
    settingSubtitle: {
        fontSize: 13,
        fontWeight: '400',
    },
});
