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
import { SegmentedControl, Segment } from '@/components/ui/SegmentedControl';
import * as Haptics from 'expo-haptics';
import {
    ProjectNumberingSettings,
    ProjectCodeStyle,
    ProjectDisplayFormat,
    formatProjectIdentifier,
} from '@/lib/api/projectSetup';

interface ProjectNumberingSectionProps {
    isDark: boolean;
    textColor: string;
    subtextColor: string;
    settings: ProjectNumberingSettings;
    onUpdateSettings: (newSettings: ProjectNumberingSettings) => void;
}

export function ProjectNumberingSection({
    isDark,
    textColor,
    subtextColor,
    settings,
    onUpdateSettings,
}: ProjectNumberingSectionProps) {
    const isLowercase = settings.codeStyle === 'lowercase';

    // Live formatted preview for top banner
    const previewIdentifier = formatProjectIdentifier(
        settings.nextNumber || 1,
        'ABC',
        settings.displayFormat,
        settings.codeStyle
    );

    const handleToggleAutoGenerate = (val: boolean) => {
        Haptics.selectionAsync();
        onUpdateSettings({
            ...settings,
            autoGenerateCode: val,
        });
    };

    const handleSelectCodeStyle = (style: ProjectCodeStyle) => {
        Haptics.selectionAsync();
        onUpdateSettings({
            ...settings,
            codeStyle: style,
        });
    };

    const handleSelectDisplayFormat = (format: ProjectDisplayFormat) => {
        Haptics.selectionAsync();
        onUpdateSettings({
            ...settings,
            displayFormat: format,
        });
    };

    // Segments for Code Style
    const styleSegments: Segment[] = [
        { id: 'uppercase', label: 'ABC' },
        { id: 'lowercase', label: 'abc' },
    ];

    // Segments for Display Format
    const displaySegments: Segment[] = [
        { id: 'code_only', label: isLowercase ? 'abc' : 'ABC' },
        { id: 'number_and_code', label: isLowercase ? '001-abc' : '001-ABC' },
    ];

    return (
        <View style={s.container}>
            {/* 1. Identifier Preview */}
            <View style={s.sectionBlock}>
                <Text style={[s.sectionHeaderLabel, { color: subtextColor }]}>
                    Project Identifier Preview
                </Text>

                <View
                    style={[
                        s.previewCard,
                        {
                            backgroundColor: isDark
                                ? 'rgba(37, 99, 235, 0.12)'
                                : '#EFF6FF',
                            borderWidth: 1,
                            borderColor: isDark ? 'rgba(37, 99, 235, 0.25)' : 'rgba(37, 99, 235, 0.18)',
                        },
                    ]}
                >
                    <View style={s.previewContent}>
                        <Text style={[s.previewSubLabel, { color: subtextColor }]}>
                            Example Identifier
                        </Text>
                        <Text style={[s.previewCodeText, { color: isDark ? '#60A5FA' : '#1D4ED8' }]}>
                            {previewIdentifier}
                        </Text>
                    </View>
                </View>
            </View>

            {/* 2. Numbering */}
            <View style={s.sectionBlock}>
                <Text style={[s.sectionHeaderLabel, { color: subtextColor }]}>
                    Numbering
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
                                Next Project Number
                            </Text>
                            <Text style={[s.settingSubtitle, { color: subtextColor }]}>
                                Project numbers are assigned sequentially and remain unique.
                            </Text>
                        </View>
                        <View
                            style={[
                                s.numberPill,
                                {
                                    backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA',
                                },
                            ]}
                        >
                            <Text style={[s.numberPillText, { color: textColor }]}>
                                {String(settings.nextNumber || 1).padStart(3, '0')}
                            </Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* 3. Project Code */}
            <View style={s.sectionBlock}>
                <Text style={[s.sectionHeaderLabel, { color: subtextColor }]}>
                    Project Code
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
                    {/* Auto-generate from Project Name */}
                    <View style={s.row}>
                        <View style={s.textCol}>
                            <Text style={[s.settingTitle, { color: textColor }]}>
                                Auto-generate from Project Name
                            </Text>
                            <Text style={[s.settingSubtitle, { color: subtextColor }]}>
                                Suggest 3-letter code automatically from project title.
                            </Text>
                        </View>
                        <IOSSwitch
                            value={settings.autoGenerateCode}
                            onValueChange={handleToggleAutoGenerate}
                            isDark={isDark}
                        />
                    </View>

                    <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

                    {/* Code Length (Fixed 3 letters) */}
                    <View style={s.row}>
                        <View style={s.textCol}>
                            <Text style={[s.settingTitle, { color: textColor }]}>
                                Code Length
                            </Text>
                            <Text style={[s.settingSubtitle, { color: subtextColor }]}>
                                Fixed 3-letter alphabetic character sequence.
                            </Text>
                        </View>
                        <View
                            style={[
                                s.lengthBadge,
                                {
                                    backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA',
                                },
                            ]}
                        >
                            <Text style={[s.lengthBadgeText, { color: subtextColor }]}>
                                3 letters
                            </Text>
                        </View>
                    </View>

                    <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

                    {/* Code Style (ABC | abc) */}
                    <View style={s.rowVertical}>
                        <View style={s.textCol}>
                            <Text style={[s.settingTitle, { color: textColor }]}>
                                Code Style
                            </Text>
                            <Text style={[s.settingSubtitle, { color: subtextColor }]}>
                                Case style applied across all project badges and lists.
                            </Text>
                        </View>
                        <View style={s.segmentedInlineWrapper}>
                            <SegmentedControl
                                segments={styleSegments}
                                activeSegment={settings.codeStyle}
                                onSegmentChange={(id) => handleSelectCodeStyle(id as ProjectCodeStyle)}
                            />
                        </View>
                    </View>
                </View>
            </View>

            {/* 4. Display */}
            <View style={s.sectionBlock}>
                <Text style={[s.sectionHeaderLabel, { color: subtextColor }]}>
                    Display
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
                    <View style={s.rowVertical}>
                        <View style={s.textCol}>
                            <Text style={[s.settingTitle, { color: textColor }]}>
                                Project Identifier
                            </Text>
                            <Text style={[s.settingSubtitle, { color: subtextColor }]}>
                                Controls how project identifiers are displayed throughout the UI.
                            </Text>
                        </View>
                        <View style={s.segmentedInlineWrapper}>
                            <SegmentedControl
                                segments={displaySegments}
                                activeSegment={settings.displayFormat}
                                onSegmentChange={(id) => handleSelectDisplayFormat(id as ProjectDisplayFormat)}
                            />
                        </View>
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
    previewCard: {
        borderRadius: 24,
        paddingVertical: 18,
        paddingHorizontal: 20,
        borderWidth: 1,
        alignItems: 'center',
    },
    previewContent: {
        alignItems: 'center',
        gap: 4,
    },
    previewSubLabel: {
        fontSize: 13,
        fontWeight: '400',
    },
    previewCodeText: {
        fontSize: 26,
        fontWeight: '700',
        letterSpacing: 1.5,
        fontVariant: ['tabular-nums'],
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
    rowVertical: {
        paddingVertical: 14,
        paddingHorizontal: 16,
        gap: 12,
    },
    segmentedInlineWrapper: {
        marginTop: 2,
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
    numberPill: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 12,
    },
    numberPillText: {
        fontSize: 15,
        fontWeight: '700',
        fontVariant: ['tabular-nums'],
    },
    lengthBadge: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
    },
    lengthBadgeText: {
        fontSize: 13,
        fontWeight: '500',
    },
});
