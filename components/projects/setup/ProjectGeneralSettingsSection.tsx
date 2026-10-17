import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
} from 'react-native';
import Animated, {
    FadeIn,
} from 'react-native-reanimated';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { IOSSwitch } from '@/components/ui/IOSSwitch';
import * as Haptics from 'expo-haptics';
import { ProjectGeneralSettings } from '@/lib/api/projectSetup';

interface ProjectGeneralSettingsSectionProps {
    isDark: boolean;
    textColor: string;
    subtextColor: string;
    settings: ProjectGeneralSettings;
    onUpdateSettings: (newSettings: ProjectGeneralSettings) => void;
}

export function ProjectGeneralSettingsSection({
    isDark,
    textColor,
    subtextColor,
    settings,
    onUpdateSettings,
}: ProjectGeneralSettingsSectionProps) {
    const [helperMessage, setHelperMessage] = useState<string | null>(null);

    const showHelper = (msg: string) => {
        setHelperMessage(msg);
    };

    const handleToggle = (key: keyof ProjectGeneralSettings, val: boolean) => {
        Haptics.selectionAsync();

        if (key === 'requireTargetDate' && val) {
            // If Require Target Date is turned ON -> turn Allow Open-Ended OFF
            if (settings.allowNoTargetDate) {
                showHelper('Allow Open-Ended Projects was turned off because Target Date is now required.');
            }
            onUpdateSettings({
                ...settings,
                requireTargetDate: true,
                allowNoTargetDate: false,
            });
            return;
        }

        if (key === 'allowNoTargetDate' && val) {
            // If Allow Open-Ended Projects is turned ON -> turn Require Target Date OFF
            if (settings.requireTargetDate) {
                showHelper('Require Target Date was turned off because open-ended projects are enabled.');
            }
            onUpdateSettings({
                ...settings,
                allowNoTargetDate: true,
                requireTargetDate: false,
            });
            return;
        }

        onUpdateSettings({
            ...settings,
            [key]: val,
        });
    };

    return (
        <View style={s.container}>
            {/* Section 1: Project Requirements */}
            <View style={s.sectionBlock}>
                <Text style={[s.sectionHeaderLabel, { color: subtextColor }]}>
                    Project Requirements
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
                    <View style={s.row}>
                        <View style={s.textCol}>
                            <Text style={[s.settingTitle, { color: textColor }]}>
                                Require Project Lead
                            </Text>
                            <Text style={[s.settingSubtitle, { color: subtextColor }]}>
                                Require every project to have an assigned project lead.
                            </Text>
                        </View>
                        <IOSSwitch
                            value={settings.requireProjectLead}
                            onValueChange={(val) => handleToggle('requireProjectLead', val)}
                            isDark={isDark}
                        />
                    </View>
                </View>
            </View>

            {/* Section 2: Dates & Deadlines */}
            <View style={s.sectionBlock}>
                <Text style={[s.sectionHeaderLabel, { color: subtextColor }]}>
                    Dates & Deadlines
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
                    {/* Require Start Date */}
                    <View style={s.row}>
                        <View style={s.textCol}>
                            <Text style={[s.settingTitle, { color: textColor }]}>
                                Require Start Date
                            </Text>
                            <Text style={[s.settingSubtitle, { color: subtextColor }]}>
                                Require projects to have a defined start date.
                            </Text>
                        </View>
                        <IOSSwitch
                            value={settings.requireStartDate}
                            onValueChange={(val) => handleToggle('requireStartDate', val)}
                            isDark={isDark}
                        />
                    </View>

                    <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

                    {/* Require Target Date */}
                    <View style={s.row}>
                        <View style={s.textCol}>
                            <Text style={[s.settingTitle, { color: textColor }]}>
                                Require Target Date
                            </Text>
                            <Text style={[s.settingSubtitle, { color: subtextColor }]}>
                                Require projects to have a target completion date.
                            </Text>
                        </View>
                        <IOSSwitch
                            value={settings.requireTargetDate}
                            onValueChange={(val) => handleToggle('requireTargetDate', val)}
                            isDark={isDark}
                        />
                    </View>

                    <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

                    {/* Allow Open-Ended Projects */}
                    <View style={s.row}>
                        <View style={s.textCol}>
                            <Text style={[s.settingTitle, { color: textColor }]}>
                                Allow Open-Ended Projects
                            </Text>
                            <Text style={[s.settingSubtitle, { color: subtextColor }]}>
                                Allow projects to remain active without a target completion date.
                            </Text>
                        </View>
                        <IOSSwitch
                            value={settings.allowNoTargetDate}
                            onValueChange={(val) => handleToggle('allowNoTargetDate', val)}
                            isDark={isDark}
                        />
                    </View>
                </View>

                {/* Mutual Exclusivity Helper Banner */}
                {!!helperMessage && (
                    <Animated.View
                        entering={FadeIn.duration(200)}
                        style={[
                            s.helperBanner,
                            {
                                backgroundColor: isDark
                                    ? 'rgba(255, 255, 255, 0.06)'
                                    : 'rgba(120, 120, 128, 0.08)',
                            },
                        ]}
                    >
                        <PlatformIcon
                            name="info.circle.fill"
                            size={14}
                            tintColor={subtextColor}
                        />
                        <Text style={[s.helperText, { color: subtextColor }]}>
                            {helperMessage}
                        </Text>
                    </Animated.View>
                )}
            </View>

            {/* Section 3: Lifecycle Rules */}
            <View style={s.sectionBlock}>
                <Text style={[s.sectionHeaderLabel, { color: subtextColor }]}>
                    Lifecycle Rules
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
                    {/* Allow Reopening Completed Projects */}
                    <View style={s.row}>
                        <View style={s.textCol}>
                            <Text style={[s.settingTitle, { color: textColor }]}>
                                Allow Reopening Completed Projects
                            </Text>
                            <Text style={[s.settingSubtitle, { color: subtextColor }]}>
                                Allow authorized users to reopen completed projects.
                            </Text>
                        </View>
                        <IOSSwitch
                            value={settings.allowReopenCompleted}
                            onValueChange={(val) => handleToggle('allowReopenCompleted', val)}
                            isDark={isDark}
                        />
                    </View>

                    <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

                    {/* Allow Project Archiving */}
                    <View style={s.row}>
                        <View style={s.textCol}>
                            <Text style={[s.settingTitle, { color: textColor }]}>
                                Allow Project Archiving
                            </Text>
                            <Text style={[s.settingSubtitle, { color: subtextColor }]}>
                                Allow completed or cancelled projects to be moved to archive.
                            </Text>
                        </View>
                        <IOSSwitch
                            value={settings.allowProjectArchiving}
                            onValueChange={(val) => handleToggle('allowProjectArchiving', val)}
                            isDark={isDark}
                        />
                    </View>
                </View>
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    container: {
        gap: 20,
        paddingHorizontal: 0,
        paddingTop: 8,
        paddingBottom: 40,
        width: '100%',
    },
    sectionBlock: {
        gap: 8,
    },
    sectionHeaderLabel: {
        fontSize: 13,
        fontWeight: '600',
        paddingHorizontal: 4,
        letterSpacing: -0.1,
    },
    card: {
        borderRadius: 24,
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
    helperBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 9,
        paddingHorizontal: 12,
        borderRadius: 14,
        marginTop: 4,
    },
    helperText: {
        fontSize: 12,
        fontWeight: '500',
        lineHeight: 16,
        flex: 1,
    },
});
