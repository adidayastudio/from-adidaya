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
import { ProjectStatusItem } from '@/lib/api/projectSetup';
import { ProjectStatusEditSheet } from './ProjectStatusEditSheet';

interface ProjectStatusesSectionProps {
    isDark: boolean;
    textColor: string;
    subtextColor: string;
    statuses: ProjectStatusItem[];
    onUpdateStatuses: (newStatuses: ProjectStatusItem[]) => void;
    isAddSheetOpen?: boolean;
    onCloseAddSheet?: () => void;
}

export function ProjectStatusesSection({
    isDark,
    textColor,
    subtextColor,
    statuses,
    onUpdateStatuses,
    isAddSheetOpen = false,
    onCloseAddSheet,
}: ProjectStatusesSectionProps) {
    const [editingStatus, setEditingStatus] = useState<ProjectStatusItem | null>(null);
    const [isEditSheetVisible, setIsEditSheetVisible] = useState(false);

    const handleOpenEdit = (item: ProjectStatusItem) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setEditingStatus(item);
        setIsEditSheetVisible(true);
    };

    const handleCloseEdit = () => {
        setIsEditSheetVisible(false);
        setEditingStatus(null);
    };

    const handleToggleActive = (id: string, current: boolean) => {
        Haptics.selectionAsync();
        const updated = statuses.map((s) => (s.id === id ? { ...s, isActive: !current } : s));
        onUpdateStatuses(updated);
    };

    const handleMove = (index: number, direction: 'up' | 'down') => {
        Haptics.selectionAsync();
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= statuses.length) return;
        const copy = [...statuses];
        const [moved] = copy.splice(index, 1);
        copy.splice(newIndex, 0, moved);
        onUpdateStatuses(copy);
    };

    const handleSaveStatus = (savedItem: ProjectStatusItem) => {
        const exists = statuses.some((s) => s.id === savedItem.id);
        if (exists) {
            onUpdateStatuses(statuses.map((s) => (s.id === savedItem.id ? savedItem : s)));
        } else {
            onUpdateStatuses([...statuses, savedItem]);
        }
    };

    const handleDeleteStatus = (id: string) => {
        onUpdateStatuses(statuses.filter((s) => s.id !== id));
    };

    return (
        <View style={s.container}>
            {/* Header / List Block */}
            <View style={s.sectionBlock}>
                <Text style={[s.sectionHeaderLabel, { color: subtextColor }]}>
                    Lifecycle Statuses ({statuses.length})
                </Text>

                <View style={s.cardsList}>
                    {statuses.map((statusItem, index) => {
                        const isLast = index === statuses.length - 1;
                        return (
                            <View
                                key={statusItem.id}
                                style={[
                                    s.cardItem,
                                    {
                                        backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                                        borderWidth: 1,
                                        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                                    },
                                ]}
                            >
                                <View style={s.row}>
                                    {/* Color Indicator */}
                                    <View style={[s.colorDot, { backgroundColor: statusItem.color }]} />

                                    {/* Status Name and Mapped System State */}
                                    <TouchableOpacity
                                        style={s.textCol}
                                        onPress={() => handleOpenEdit(statusItem)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[s.settingTitle, { color: textColor }]}>
                                            {statusItem.name}
                                        </Text>
                                        <Text style={[s.settingSubtitle, { color: subtextColor }]}>
                                            {statusItem.systemState}
                                        </Text>
                                    </TouchableOpacity>

                                    {/* Reorder Buttons */}
                                    <View style={s.reorderBox}>
                                        <TouchableOpacity
                                            style={[s.reorderBtn, index === 0 && s.disabledBtn]}
                                            onPress={() => handleMove(index, 'up')}
                                            disabled={index === 0}
                                            hitSlop={8}
                                        >
                                            <PlatformIcon
                                                name="chevron.up"
                                                size={14}
                                                tintColor={index === 0 ? (isDark ? '#48484A' : '#C7C7CC') : '#007AFF'}
                                            />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[s.reorderBtn, isLast && s.disabledBtn]}
                                            onPress={() => handleMove(index, 'down')}
                                            disabled={isLast}
                                            hitSlop={8}
                                        >
                                            <PlatformIcon
                                                name="chevron.down"
                                                size={14}
                                                tintColor={isLast ? (isDark ? '#48484A' : '#C7C7CC') : '#007AFF'}
                                            />
                                        </TouchableOpacity>
                                    </View>

                                    {/* Active Toggle */}
                                    <IOSSwitch
                                        value={statusItem.isActive}
                                        onValueChange={() => handleToggleActive(statusItem.id, statusItem.isActive)}
                                        isDark={isDark}
                                    />
                                </View>
                            </View>
                        );
                    })}
                </View>
            </View>

            {/* Native Bottom Sheet for Adding Status */}
            <ProjectStatusEditSheet
                visible={isAddSheetOpen}
                onClose={() => onCloseAddSheet && onCloseAddSheet()}
                existingStatuses={statuses}
                onSave={handleSaveStatus}
            />

            {/* Native Bottom Sheet for Editing Status */}
            <ProjectStatusEditSheet
                visible={isEditSheetVisible}
                onClose={handleCloseEdit}
                statusItem={editingStatus}
                existingStatuses={statuses}
                onSave={handleSaveStatus}
                onDelete={handleDeleteStatus}
            />
        </View>
    );
}

const s = StyleSheet.create({
    container: {
        gap: 20,
        paddingHorizontal: 0,
        paddingTop: 4,
        paddingBottom: 24,
        width: '100%',
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
    colorDot: {
        width: 14,
        height: 14,
        borderRadius: 7,
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
    reorderBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        marginRight: 4,
    },
    reorderBtn: {
        padding: 6,
    },
    disabledBtn: {
        opacity: 0.3,
    },
});
