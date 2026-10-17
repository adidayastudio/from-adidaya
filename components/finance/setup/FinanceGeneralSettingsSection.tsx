import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Platform,
} from 'react-native';
import ContextMenu, { ContextMenuAction } from '@/components/ui/PlatformContextMenu';
import { GlassView } from '@/components/ui/GlassView';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import * as Haptics from 'expo-haptics';
import {
    FinanceGeneralSettings,
    CurrencyOption,
    TimezoneOption,
    RoundingMethod,
    calculateFormattedAmount,
    CURRENCY_OPTIONS,
    ROUNDING_METHOD_OPTIONS,
    DECIMAL_PRECISION_OPTIONS,
    TIMEZONE_OPTIONS,
} from '@/lib/api/financeSetup';

interface FinanceGeneralSettingsSectionProps {
    isDark: boolean;
    textColor: string;
    subtextColor: string;
    settings: FinanceGeneralSettings;
    onUpdateSettings: (newSettings: FinanceGeneralSettings) => void;
}

export function FinanceGeneralSettingsSection({
    isDark,
    textColor,
    subtextColor,
    settings,
    onUpdateSettings,
}: FinanceGeneralSettingsSectionProps) {
    // Active metadata
    const currentRoundingMeta = ROUNDING_METHOD_OPTIONS.find(
        (r) => r.value === settings.roundingMethod
    ) || ROUNDING_METHOD_OPTIONS[0];

    const currentPrecisionMeta = DECIMAL_PRECISION_OPTIONS.find(
        (p) => p.value === settings.decimalPrecision
    ) || DECIMAL_PRECISION_OPTIONS[2];

    // Sample amount with fractional sub-digits (e.g. 12345.678)
    const sampleAmount = 12345.678;
    const originalDisplay = `${settings.currencySymbol} 12,345.678`;
    const displayedFormatted = calculateFormattedAmount(
        sampleAmount,
        settings.currencySymbol,
        settings.decimalPrecision,
        settings.roundingMethod
    );

    // ContextMenu Actions for Currency
    const currencyActions: ContextMenuAction[] = useMemo(() => {
        return CURRENCY_OPTIONS.map((c) => ({
            title: c.display,
            state: c.code === settings.currencyCode ? 'on' : 'off',
        }));
    }, [settings.currencyCode]);

    // ContextMenu Actions for Precision
    const precisionActions: ContextMenuAction[] = useMemo(() => {
        return DECIMAL_PRECISION_OPTIONS.map((p) => ({
            title: p.label,
            subtitle: p.description,
            state: p.value === settings.decimalPrecision ? 'on' : 'off',
        }));
    }, [settings.decimalPrecision]);

    // ContextMenu Actions for Rounding Method
    const roundingActions: ContextMenuAction[] = useMemo(() => {
        return ROUNDING_METHOD_OPTIONS.map((item) => ({
            title: item.title,
            subtitle: item.description,
            state: item.value === settings.roundingMethod ? 'on' : 'off',
        }));
    }, [settings.roundingMethod]);

    // ContextMenu Actions for Timezone
    const timezoneActions: ContextMenuAction[] = useMemo(() => {
        return TIMEZONE_OPTIONS.map((tz) => ({
            title: tz.label,
            subtitle: tz.region,
            state: tz.id === settings.timezone ? 'on' : 'off',
        }));
    }, [settings.timezone]);

    const handleSelectCurrency = (curr: CurrencyOption) => {
        onUpdateSettings({
            ...settings,
            baseCurrency: curr.code,
            currencyCode: curr.code,
            currencyName: curr.name,
            currencySymbol: curr.symbol,
        });
    };

    const handleCurrencyPickerPress = (event: any) => {
        Haptics.selectionAsync();
        const index = event.nativeEvent.index;
        const name = event.nativeEvent.name;
        const item = CURRENCY_OPTIONS.find(c => c.display === name || c.code === name) || CURRENCY_OPTIONS[index];
        if (item) {
            handleSelectCurrency(item);
        }
    };

    const handleSelectPrecision = (precision: number) => {
        onUpdateSettings({
            ...settings,
            decimalPrecision: precision,
        });
    };

    const handlePrecisionPickerPress = (event: any) => {
        Haptics.selectionAsync();
        const index = event.nativeEvent.index;
        const name = event.nativeEvent.name;
        const item = DECIMAL_PRECISION_OPTIONS.find(p => p.label === name) || DECIMAL_PRECISION_OPTIONS[index];
        if (item) {
            handleSelectPrecision(item.value);
        }
    };

    const handleRoundingPickerPress = (event: any) => {
        Haptics.selectionAsync();
        const index = event.nativeEvent.index;
        const name = event.nativeEvent.name;
        const item = ROUNDING_METHOD_OPTIONS.find(o => o.title === name) || ROUNDING_METHOD_OPTIONS[index];
        if (item) {
            onUpdateSettings({
                ...settings,
                roundingMethod: item.value,
            });
        }
    };

    const handleSelectTimezone = (tz: TimezoneOption) => {
        onUpdateSettings({
            ...settings,
            timezone: tz.id,
            timezoneLabel: tz.label,
        });
    };

    const handleTimezonePickerPress = (event: any) => {
        Haptics.selectionAsync();
        const index = event.nativeEvent.index;
        const name = event.nativeEvent.name;
        const item = TIMEZONE_OPTIONS.find(tz => tz.label === name || tz.id === name) || TIMEZONE_OPTIONS[index];
        if (item) {
            handleSelectTimezone(item);
        }
    };

    return (
        <View style={s.container}>
            {/* ============================================================ */}
            {/* SECTION 1 — Currency */}
            {/* ============================================================ */}
            <View style={s.sectionBlock}>
                <Text style={[s.sectionHeaderLabel, { color: subtextColor }]}>
                    Currency
                </Text>

                <View
                    style={[
                        s.card,
                        {
                            backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                            borderWidth: 1,
                            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                        },
                    ]}
                >
                    <ContextMenu
                        actions={currencyActions}
                        onPress={handleCurrencyPickerPress}
                        dropdownMenuMode={true}
                    >
                        <View style={s.rowButton}>
                            <View style={s.textCol}>
                                <Text style={[s.settingTitle, { color: textColor }]}>
                                    Base Currency
                                </Text>
                                <Text style={[s.settingSubtitle, { color: subtextColor }]}>
                                    Default currency used across Finance.
                                </Text>
                            </View>
                            <View style={s.valueCol}>
                                <Text style={[s.valueText, { color: textColor }]} numberOfLines={1}>
                                    {settings.currencyCode} — {settings.currencyName} ({settings.currencySymbol})
                                </Text>
                                <PlatformIcon
                                    name="chevron.down"
                                    size={13}
                                    tintColor={isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)'}
                                />
                            </View>
                        </View>
                    </ContextMenu>
                </View>
            </View>

            {/* ============================================================ */}
            {/* SECTION 2 — Number Format */}
            {/* ============================================================ */}
            <View style={s.sectionBlock}>
                <Text style={[s.sectionHeaderLabel, { color: subtextColor }]}>
                    Number Format
                </Text>

                <View
                    style={[
                        s.card,
                        {
                            backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                            borderWidth: 1,
                            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                        },
                    ]}
                >
                    {/* Setting 1: Decimal Precision */}
                    <ContextMenu
                        actions={precisionActions}
                        onPress={handlePrecisionPickerPress}
                        dropdownMenuMode={true}
                    >
                        <View style={s.rowButton}>
                            <View style={s.textCol}>
                                <Text style={[s.settingTitle, { color: textColor }]}>
                                    Decimal Precision
                                </Text>
                                <Text style={[s.settingSubtitle, { color: subtextColor }]}>
                                    Number of decimal places shown for financial values.
                                </Text>
                            </View>
                            <View style={s.valueCol}>
                                <Text style={[s.valueText, { color: textColor }]}>
                                    {currentPrecisionMeta.label}
                                </Text>
                                <PlatformIcon
                                    name="chevron.down"
                                    size={13}
                                    tintColor={isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)'}
                                />
                            </View>
                        </View>
                    </ContextMenu>

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

                    {/* Setting 2: Rounding Method */}
                    <ContextMenu
                        actions={roundingActions}
                        onPress={handleRoundingPickerPress}
                        dropdownMenuMode={true}
                    >
                        <View style={s.rowButton}>
                            <View style={s.textCol}>
                                <Text style={[s.settingTitle, { color: textColor }]}>
                                    Rounding Method
                                </Text>
                                <Text style={[s.settingSubtitle, { color: subtextColor }]}>
                                    How values are rounded when they exceed the selected precision.
                                </Text>
                            </View>
                            <View style={s.valueCol}>
                                <Text style={[s.valueText, { color: '#007AFF' }]}>
                                    {currentRoundingMeta.title}
                                </Text>
                                <PlatformIcon
                                    name="chevron.down"
                                    size={13}
                                    tintColor="#007AFF"
                                />
                            </View>
                        </View>
                    </ContextMenu>

                    {/* Clean Single Flat Preview Box */}
                    <View
                        style={[
                            s.previewCard,
                            {
                                backgroundColor: isDark
                                    ? 'rgba(0,122,255,0.06)'
                                    : 'rgba(0,122,255,0.04)',
                                borderColor: isDark
                                    ? 'rgba(0,122,255,0.18)'
                                    : 'rgba(0,122,255,0.12)',
                            },
                        ]}
                    >
                        <View style={s.previewHeader}>
                            <Text style={[s.previewTitle, { color: textColor }]}>Preview</Text>
                            <Text style={[s.previewSubtitle, { color: subtextColor }]}>
                                {currentRoundingMeta.title} ({settings.decimalPrecision} {settings.decimalPrecision === 1 ? 'decimal' : 'decimals'})
                            </Text>
                        </View>

                        <View style={s.previewValuesRow}>
                            <View style={s.previewValBlock}>
                                <Text style={[s.previewValLabel, { color: subtextColor }]}>
                                    ORIGINAL
                                </Text>
                                <Text style={[s.previewOrigText, { color: subtextColor }]}>
                                    {originalDisplay}
                                </Text>
                            </View>

                            <PlatformIcon
                                name="arrow.right"
                                size={14}
                                tintColor="#007AFF"
                            />

                            <View style={s.previewValBlock}>
                                <Text style={[s.previewValLabel, { color: '#007AFF' }]}>
                                    DISPLAYED
                                </Text>
                                <Text style={[s.previewDispText, { color: textColor }]}>
                                    {displayedFormatted}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>
            </View>

            {/* ============================================================ */}
            {/* SECTION 3 — Time & Region */}
            {/* ============================================================ */}
            <View style={s.sectionBlock}>
                <Text style={[s.sectionHeaderLabel, { color: subtextColor }]}>
                    Time & Region
                </Text>

                <View
                    style={[
                        s.card,
                        {
                            backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                            borderWidth: 1,
                            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                        },
                    ]}
                >
                    <ContextMenu
                        actions={timezoneActions}
                        onPress={handleTimezonePickerPress}
                        dropdownMenuMode={true}
                    >
                        <View style={s.rowButton}>
                            <View style={s.textCol}>
                                <Text style={[s.settingTitle, { color: textColor }]}>
                                    Time Zone
                                </Text>
                                <Text style={[s.settingSubtitle, { color: subtextColor }]}>
                                    Used for Finance document dates, due dates, and payment schedules.
                                </Text>
                            </View>
                            <View style={s.valueCol}>
                                <Text style={[s.valueText, { color: textColor }]}>
                                    {settings.timezoneLabel}
                                </Text>
                                <PlatformIcon
                                    name="chevron.down"
                                    size={13}
                                    tintColor={isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)'}
                                />
                            </View>
                        </View>
                    </ContextMenu>
                </View>
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    container: {
        gap: 18,
    },
    sectionBlock: {
        gap: 8,
    },
    sectionHeaderLabel: {
        fontSize: 13,
        fontWeight: '600',
        letterSpacing: -0.1,
        paddingHorizontal: 6,
    },
    card: {
        borderRadius: 22,
        overflow: 'hidden',
    },
    rowButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 16,
        gap: 12,
    },
    textCol: {
        flex: 1,
        gap: 2,
    },
    settingTitle: {
        fontSize: 15,
        fontWeight: '500',
        letterSpacing: -0.2,
    },
    settingSubtitle: {
        fontSize: 12.5,
        fontWeight: '400',
        lineHeight: 16.5,
    },
    valueCol: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        maxWidth: '52%',
        justifyContent: 'flex-end',
    },
    valueText: {
        fontSize: 14,
        fontWeight: '500',
        textAlign: 'right',
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 16,
    },
    previewCard: {
        marginHorizontal: 12,
        marginBottom: 12,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 14,
        borderWidth: 1,
        gap: 10,
    },
    previewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    previewTitle: {
        fontSize: 13,
        fontWeight: '600',
        letterSpacing: -0.1,
    },
    previewSubtitle: {
        fontSize: 11.5,
        fontWeight: '400',
    },
    previewValuesRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 2,
    },
    previewValBlock: {
        gap: 2,
    },
    previewValLabel: {
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 0.3,
    },
    previewOrigText: {
        fontSize: 14,
        fontWeight: '500',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    previewDispText: {
        fontSize: 15,
        fontWeight: '700',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
});
