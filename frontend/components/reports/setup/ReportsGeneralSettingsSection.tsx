import React, { useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Platform,
    TouchableOpacity,
    ActionSheetIOS,
} from 'react-native';
import ContextMenu, { ContextMenuAction } from '@/components/ui/PlatformContextMenu';
import * as Haptics from 'expo-haptics';
import { GlassView } from '@/components/ui/GlassView';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { ReportsGeneralSettings } from '@/lib/api/reportsSetup';

interface ReportsGeneralSettingsSectionProps {
    isDark: boolean;
    textColor: string;
    subtextColor: string;
    settings: ReportsGeneralSettings;
    onUpdateSettings: (newSettings: ReportsGeneralSettings) => void;
}

const TIMEZONE_OPTIONS = [
    'Asia/Jakarta (WIB)',
    'Asia/Makassar (WITA)',
    'Asia/Jayapura (WIT)',
    'Asia/Singapore (SGT)',
    'UTC',
];

const LANGUAGE_OPTIONS: Array<ReportsGeneralSettings['language']> = [
    'System Default',
    'English',
    'Bahasa Indonesia',
];

const DATE_FORMAT_OPTIONS: Array<ReportsGeneralSettings['dateFormat']> = [
    '13 Sep 2026',
    '13/09/2026',
    '09/13/2026',
    '2026-09-13',
];

const TIME_FORMAT_OPTIONS: Array<{ value: ReportsGeneralSettings['timeFormat']; label: string; example: string }> = [
    { value: '24-hour', label: '24-hour', example: '15:26' },
    { value: '12-hour', label: '12-hour', example: '3:26 PM' },
];

const FIRST_DAY_OPTIONS: Array<ReportsGeneralSettings['firstDayOfWeek']> = [
    'Monday',
    'Sunday',
    'Saturday',
];

const EXPORT_FORMAT_OPTIONS: Array<ReportsGeneralSettings['defaultExportFormat']> = [
    'PDF',
    'Excel (.xlsx)',
    'Word (.docx)',
];

const PAPER_SIZE_OPTIONS: Array<ReportsGeneralSettings['defaultPaperSize']> = [
    'A4',
    'Letter',
    'Legal',
    'A3',
];

const ORIENTATION_OPTIONS: Array<ReportsGeneralSettings['pageOrientation']> = [
    'Auto',
    'Portrait',
    'Landscape',
];

const RETENTION_OPTIONS: Array<ReportsGeneralSettings['recordRetention']> = [
    '1 Year',
    '3 Years',
    '5 Years',
    '7 Years',
    '10 Years',
    'Never Delete',
];

export function ReportsGeneralSettingsSection({
    isDark,
    textColor,
    subtextColor,
    settings,
    onUpdateSettings,
}: ReportsGeneralSettingsSectionProps) {

    const chevronColor = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)';

    // ContextMenu Actions
    const timezoneActions: ContextMenuAction[] = useMemo(() => {
        return TIMEZONE_OPTIONS.map((tz) => ({
            title: tz,
            state: tz === settings.timezone ? 'on' : 'off',
        }));
    }, [settings.timezone]);

    const languageActions: ContextMenuAction[] = useMemo(() => {
        return LANGUAGE_OPTIONS.map((lang) => ({
            title: lang,
            state: lang === settings.language ? 'on' : 'off',
        }));
    }, [settings.language]);

    const dateFormatActions: ContextMenuAction[] = useMemo(() => {
        return DATE_FORMAT_OPTIONS.map((df) => ({
            title: df,
            state: df === settings.dateFormat ? 'on' : 'off',
        }));
    }, [settings.dateFormat]);

    const timeFormatActions: ContextMenuAction[] = useMemo(() => {
        return TIME_FORMAT_OPTIONS.map((tf) => ({
            title: `${tf.label} (${tf.example})`,
            state: tf.value === settings.timeFormat ? 'on' : 'off',
        }));
    }, [settings.timeFormat]);

    const firstDayActions: ContextMenuAction[] = useMemo(() => {
        return FIRST_DAY_OPTIONS.map((day) => ({
            title: day,
            state: day === settings.firstDayOfWeek ? 'on' : 'off',
        }));
    }, [settings.firstDayOfWeek]);

    const exportFormatActions: ContextMenuAction[] = useMemo(() => {
        return EXPORT_FORMAT_OPTIONS.map((fmt) => ({
            title: fmt,
            state: fmt === settings.defaultExportFormat ? 'on' : 'off',
        }));
    }, [settings.defaultExportFormat]);

    const paperSizeActions: ContextMenuAction[] = useMemo(() => {
        return PAPER_SIZE_OPTIONS.map((ps) => ({
            title: ps,
            state: ps === settings.defaultPaperSize ? 'on' : 'off',
        }));
    }, [settings.defaultPaperSize]);

    const orientationActions: ContextMenuAction[] = useMemo(() => {
        return ORIENTATION_OPTIONS.map((ori) => ({
            title: ori,
            state: ori === settings.pageOrientation ? 'on' : 'off',
        }));
    }, [settings.pageOrientation]);

    const retentionActions: ContextMenuAction[] = useMemo(() => {
        return RETENTION_OPTIONS.map((ret) => ({
            title: ret,
            state: ret === settings.recordRetention ? 'on' : 'off',
        }));
    }, [settings.recordRetention]);

    const dividerStyle = [
        s.divider,
        { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' },
    ];

    const renderRowContent = (title: string, value: string) => (
        <View style={s.rowButton}>
            <Text style={[s.settingTitle, { color: textColor }]}>{title}</Text>
            <View style={s.valueCol}>
                <Text style={[s.valueText, { color: subtextColor }]}>{value}</Text>
                <PlatformIcon name="chevron.up.chevron.down" size={13} tintColor={chevronColor} />
            </View>
        </View>
    );

    return (
        <View style={s.container}>
            {/* SECTION 1 — Time & Localization */}
            <View style={s.sectionBlock}>
                <Text style={[s.sectionHeaderLabel, { color: subtextColor }]}>
                    Time & Localization
                </Text>

                <GlassView
                    intensity={isDark ? 10 : 25}
                    style={[
                        s.card,
                        {
                            backgroundColor: isDark
                                ? 'rgba(255,255,255,0.02)'
                                : 'rgba(255,255,255,0.7)',
                        },
                    ]}
                >
                    {/* Timezone */}
                    <ContextMenu
                        actions={timezoneActions}
                        dropdownMenuMode={true}
                        onPress={(e) => {
                            Haptics.selectionAsync();
                            const val = e.nativeEvent.name || TIMEZONE_OPTIONS[e.nativeEvent.index];
                            if (val) onUpdateSettings({ ...settings, timezone: val });
                        }}
                    >
                        {renderRowContent('Timezone', settings.timezone)}
                    </ContextMenu>

                    <View style={dividerStyle} />

                    {/* Language */}
                    <ContextMenu
                        actions={languageActions}
                        dropdownMenuMode={true}
                        onPress={(e) => {
                            Haptics.selectionAsync();
                            const val = (e.nativeEvent.name || LANGUAGE_OPTIONS[e.nativeEvent.index]) as ReportsGeneralSettings['language'];
                            if (val) onUpdateSettings({ ...settings, language: val });
                        }}
                    >
                        {renderRowContent('Language', settings.language)}
                    </ContextMenu>

                    <View style={dividerStyle} />

                    {/* Date Format */}
                    <ContextMenu
                        actions={dateFormatActions}
                        dropdownMenuMode={true}
                        onPress={(e) => {
                            Haptics.selectionAsync();
                            const val = (e.nativeEvent.name || DATE_FORMAT_OPTIONS[e.nativeEvent.index]) as ReportsGeneralSettings['dateFormat'];
                            if (val) onUpdateSettings({ ...settings, dateFormat: val });
                        }}
                    >
                        {renderRowContent('Date Format', settings.dateFormat)}
                    </ContextMenu>

                    <View style={dividerStyle} />

                    {/* Time Format */}
                    <ContextMenu
                        actions={timeFormatActions}
                        dropdownMenuMode={true}
                        onPress={(e) => {
                            Haptics.selectionAsync();
                            const idx = e.nativeEvent.index;
                            const opt = TIME_FORMAT_OPTIONS[idx] || TIME_FORMAT_OPTIONS[0];
                            onUpdateSettings({ ...settings, timeFormat: opt.value });
                        }}
                    >
                        {renderRowContent('Time Format', settings.timeFormat === '24-hour' ? '24-hour (15:26)' : '12-hour (3:26 PM)')}
                    </ContextMenu>

                    <View style={dividerStyle} />

                    {/* First Day of Week */}
                    <ContextMenu
                        actions={firstDayActions}
                        dropdownMenuMode={true}
                        onPress={(e) => {
                            Haptics.selectionAsync();
                            const val = (e.nativeEvent.name || FIRST_DAY_OPTIONS[e.nativeEvent.index]) as ReportsGeneralSettings['firstDayOfWeek'];
                            if (val) onUpdateSettings({ ...settings, firstDayOfWeek: val });
                        }}
                    >
                        {renderRowContent('First Day of Week', settings.firstDayOfWeek)}
                    </ContextMenu>
                </GlassView>
            </View>

            {/* SECTION 2 — Document Defaults */}
            <View style={s.sectionBlock}>
                <Text style={[s.sectionHeaderLabel, { color: subtextColor }]}>
                    Document Defaults
                </Text>

                <GlassView
                    intensity={isDark ? 10 : 25}
                    style={[
                        s.card,
                        {
                            backgroundColor: isDark
                                ? 'rgba(255,255,255,0.02)'
                                : 'rgba(255,255,255,0.7)',
                        },
                    ]}
                >
                    {/* Default Export Format */}
                    <ContextMenu
                        actions={exportFormatActions}
                        dropdownMenuMode={true}
                        onPress={(e) => {
                            Haptics.selectionAsync();
                            const val = (e.nativeEvent.name || EXPORT_FORMAT_OPTIONS[e.nativeEvent.index]) as ReportsGeneralSettings['defaultExportFormat'];
                            if (val) onUpdateSettings({ ...settings, defaultExportFormat: val });
                        }}
                    >
                        {renderRowContent('Default Export Format', settings.defaultExportFormat)}
                    </ContextMenu>

                    <View style={dividerStyle} />

                    {/* Paper Size */}
                    <ContextMenu
                        actions={paperSizeActions}
                        dropdownMenuMode={true}
                        onPress={(e) => {
                            Haptics.selectionAsync();
                            const val = (e.nativeEvent.name || PAPER_SIZE_OPTIONS[e.nativeEvent.index]) as ReportsGeneralSettings['defaultPaperSize'];
                            if (val) onUpdateSettings({ ...settings, defaultPaperSize: val });
                        }}
                    >
                        {renderRowContent('Paper Size', settings.defaultPaperSize)}
                    </ContextMenu>

                    <View style={dividerStyle} />

                    {/* Page Orientation */}
                    <ContextMenu
                        actions={orientationActions}
                        dropdownMenuMode={true}
                        onPress={(e) => {
                            Haptics.selectionAsync();
                            const val = (e.nativeEvent.name || ORIENTATION_OPTIONS[e.nativeEvent.index]) as ReportsGeneralSettings['pageOrientation'];
                            if (val) onUpdateSettings({ ...settings, pageOrientation: val });
                        }}
                    >
                        {renderRowContent('Orientation', settings.pageOrientation)}
                    </ContextMenu>
                </GlassView>
            </View>

            {/* SECTION 3 — Data & Retention */}
            <View style={s.sectionBlock}>
                <Text style={[s.sectionHeaderLabel, { color: subtextColor }]}>
                    Data & Retention
                </Text>

                <GlassView
                    intensity={isDark ? 10 : 25}
                    style={[
                        s.card,
                        {
                            backgroundColor: isDark
                                ? 'rgba(255,255,255,0.02)'
                                : 'rgba(255,255,255,0.7)',
                        },
                    ]}
                >
                    {/* Record Retention */}
                    <ContextMenu
                        actions={retentionActions}
                        dropdownMenuMode={true}
                        onPress={(e) => {
                            Haptics.selectionAsync();
                            const val = (e.nativeEvent.name || RETENTION_OPTIONS[e.nativeEvent.index]) as ReportsGeneralSettings['recordRetention'];
                            if (val) onUpdateSettings({ ...settings, recordRetention: val });
                        }}
                    >
                        {renderRowContent('Record Retention', settings.recordRetention)}
                    </ContextMenu>
                </GlassView>
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    container: {
        gap: 20,
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
    settingTitle: {
        fontSize: 16,
        fontWeight: '400',
        letterSpacing: -0.2,
    },
    valueCol: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    valueText: {
        fontSize: 15,
        fontWeight: '400',
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 16,
    },
});
