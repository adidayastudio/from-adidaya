import React from 'react';
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
import {
    ProjectTrackingSettings,
    TrackingMethod,
} from '@/lib/api/projectSetup';

interface ProjectTrackingSectionProps {
    isDark: boolean;
    textColor: string;
    subtextColor: string;
    settings: ProjectTrackingSettings;
    onUpdateSettings: (newSettings: ProjectTrackingSettings) => void;
}

interface MethodConfig {
    id: TrackingMethod;
    name: string;
    description: string;
}

const CALCULATION_METHODS: MethodConfig[] = [
    {
        id: 'manual',
        name: 'Manual',
        description: 'Enter project progress manually.',
    },
    {
        id: 'tasks',
        name: 'From Tasks',
        description: 'Calculate progress automatically from completed project tasks.',
    },
    {
        id: 'milestones',
        name: 'From Milestones',
        description: 'Calculate progress automatically from completed project milestones.',
    },
];

const ALL_DEFAULT_OPTIONS: { id: TrackingMethod; name: string }[] = [
    { id: 'manual', name: 'Manual' },
    { id: 'tasks', name: 'From Tasks' },
    { id: 'milestones', name: 'From Milestones' },
    { id: 'none', name: 'No Progress' },
];

export function ProjectTrackingSection({
    isDark,
    textColor,
    subtextColor,
    settings,
    onUpdateSettings,
}: ProjectTrackingSectionProps) {
    const handleToggleMethod = (methodId: TrackingMethod) => {
        Haptics.selectionAsync();
        const isCurrentlyEnabled = settings.enabledMethods.includes(methodId);
        const newEnabled = isCurrentlyEnabled
            ? settings.enabledMethods.filter((m) => m !== methodId)
            : [...settings.enabledMethods, methodId];

        let newDefault = settings.defaultMethod;
        if (!newEnabled.includes(newDefault) && newDefault !== 'none') {
            newDefault = newEnabled.length > 0 ? newEnabled[0] : 'none';
        }

        onUpdateSettings({
            ...settings,
            enabledMethods: newEnabled,
            defaultMethod: newDefault,
        });
    };

    const handleSelectDefault = (methodId: TrackingMethod) => {
        Haptics.selectionAsync();
        onUpdateSettings({
            ...settings,
            defaultMethod: methodId,
        });
    };

    // Filter available default options: enabled calculation methods + always 'No Progress'
    const availableDefaultOptions = ALL_DEFAULT_OPTIONS.filter(
        (opt) => opt.id === 'none' || settings.enabledMethods.includes(opt.id)
    );

    return (
        <View style={s.container}>
            {/* 1. Available Progress Methods */}
            <View style={s.sectionBlock}>
                <Text style={[s.sectionHeaderLabel, { color: subtextColor }]}>
                    Available Progress Methods
                </Text>

                <View style={s.cardsList}>
                    {CALCULATION_METHODS.map((m) => {
                        const isEnabled = settings.enabledMethods.includes(m.id);
                        return (
                            <View
                                key={m.id}
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
                                    <View style={s.textCol}>
                                        <Text style={[s.settingTitle, { color: textColor }]}>
                                            {m.name}
                                        </Text>
                                        <Text style={[s.settingSubtitle, { color: subtextColor }]}>
                                            {m.description}
                                        </Text>
                                    </View>
                                    <IOSSwitch
                                        value={isEnabled}
                                        onValueChange={() => handleToggleMethod(m.id)}
                                        isDark={isDark}
                                    />
                                </View>
                            </View>
                        );
                    })}
                </View>
            </View>

            {/* 2. Default for New Projects */}
            <View style={s.sectionBlock}>
                <Text style={[s.sectionHeaderLabel, { color: subtextColor }]}>
                    Default for New Projects
                </Text>

                <View
                    style={[
                        s.card,
                        {
                            backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                            borderWidth: 1,
                            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                        },
                    ]}
                >
                    {availableDefaultOptions.map((opt, index) => {
                        const isLast = index === availableDefaultOptions.length - 1;
                        const isSelected = settings.defaultMethod === opt.id;
                        return (
                            <View key={`default-${opt.id}`}>
                                <TouchableOpacity
                                    style={s.defaultRow}
                                    onPress={() => handleSelectDefault(opt.id)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[s.settingTitle, { color: textColor }]}>
                                        {opt.name}
                                    </Text>

                                    {isSelected && (
                                        <PlatformIcon name="checkmark" size={16} tintColor="#007AFF" />
                                    )}
                                </TouchableOpacity>
                                {!isLast && (
                                    <View
                                        style={[
                                            s.divider,
                                            {
                                                backgroundColor: isDark
                                                    ? 'rgba(255,255,255,0.06)'
                                                    : 'rgba(0,0,0,0.06)',
                                            },
                                        ]}
                                    />
                                )}
                            </View>
                        );
                    })}
                </View>

                {/* Supporting Footer Text */}
                <Text style={[s.footerText, { color: subtextColor }]}>
                    This is automatically selected when a new project is created and can be changed per project.
                </Text>
            </View>
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
    card: {
        borderRadius: 18,
        overflow: 'hidden',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        gap: 12,
        justifyContent: 'space-between',
    },
    defaultRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 16,
        marginRight: 0,
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
        lineHeight: 18,
    },
    footerText: {
        fontSize: 12,
        fontWeight: '400',
        lineHeight: 16,
        paddingHorizontal: 12,
        paddingTop: 2,
    },
});
