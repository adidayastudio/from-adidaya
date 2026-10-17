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
    ResourcesGeneralSettings,
    UnitItem,
    UnitConversionItem,
    MEASUREMENT_SYSTEM_OPTIONS,
    QUANTITY_PRECISION_OPTIONS,
    DEFAULT_OWNERSHIP_OPTIONS,
    DEFAULT_CONDITION_OPTIONS,
    calculateFormattedQuantity,
} from '@/lib/api/resourcesSetup';
import { ROUNDING_METHOD_OPTIONS, TimezoneOption } from '@/lib/api/financeSetup';
import { ResourcesDecimalPrecisionSheet } from './ResourcesDecimalPrecisionSheet';
import { ResourcesTimezoneSheet } from './ResourcesTimezoneSheet';
import { UnitLibrarySheet } from './UnitLibrarySheet';
import { UnitConversionsSheet } from './UnitConversionsSheet';

interface ResourcesGeneralSettingsSectionProps {
    isDark: boolean;
    textColor: string;
    subtextColor: string;
    settings: ResourcesGeneralSettings;
    units: UnitItem[];
    conversions: UnitConversionItem[];
    onUpdateSettings: (newSettings: ResourcesGeneralSettings) => void;
    onUpdateUnits: (newUnits: UnitItem[]) => void;
    onUpdateConversions: (newConversions: UnitConversionItem[]) => void;
}

export function ResourcesGeneralSettingsSection({
    isDark,
    textColor,
    subtextColor,
    settings,
    units,
    conversions,
    onUpdateSettings,
    onUpdateUnits,
    onUpdateConversions,
}: ResourcesGeneralSettingsSectionProps) {
    const [precisionSheetVisible, setPrecisionSheetVisible] = useState(false);
    const [timezoneSheetVisible, setTimezoneSheetVisible] = useState(false);
    const [unitLibraryVisible, setUnitLibraryVisible] = useState(false);
    const [unitConversionsVisible, setUnitConversionsVisible] = useState(false);

    // Active metadata
    const currentSystemMeta = MEASUREMENT_SYSTEM_OPTIONS.find(
        (s) => s.value === settings.measurementSystem
    ) || MEASUREMENT_SYSTEM_OPTIONS[0];

    const currentRoundingMeta = ROUNDING_METHOD_OPTIONS.find(
        (r) => r.value === settings.roundingMethod
    ) || ROUNDING_METHOD_OPTIONS[0];

    const currentPrecisionMeta = QUANTITY_PRECISION_OPTIONS.find(
        (p) => p.value === settings.quantityPrecision
    ) || QUANTITY_PRECISION_OPTIONS[2];

    const currentOwnershipMeta = DEFAULT_OWNERSHIP_OPTIONS.find(
        (o) => o.value === settings.defaultOwnership
    ) || DEFAULT_OWNERSHIP_OPTIONS[0];

    const currentConditionMeta = DEFAULT_CONDITION_OPTIONS.find(
        (c) => c.value === settings.defaultCondition
    ) || DEFAULT_CONDITION_OPTIONS[0];

    // Sample quantity preview (e.g. 12.3456 kg)
    const sampleQuantity = 12.3456;
    const sampleUnit = settings.measurementSystem === 'imperial' ? 'lb' : 'kg';
    const originalDisplay = `${sampleQuantity} ${sampleUnit}`;
    const displayedFormatted = calculateFormattedQuantity(
        sampleQuantity,
        sampleUnit,
        settings.quantityPrecision,
        settings.roundingMethod
    );

    // ContextMenu actions for Measurement System
    const measurementSystemActions: ContextMenuAction[] = useMemo(() => {
        return MEASUREMENT_SYSTEM_OPTIONS.map((item) => ({
            title: item.title,
            subtitle: item.description,
            state: item.value === settings.measurementSystem ? 'on' : 'off',
        }));
    }, [settings.measurementSystem]);

    // ContextMenu actions for Rounding Method
    const roundingActions: ContextMenuAction[] = useMemo(() => {
        return ROUNDING_METHOD_OPTIONS.map((item) => ({
            title: item.title,
            subtitle: item.description,
            state: item.value === settings.roundingMethod ? 'on' : 'off',
        }));
    }, [settings.roundingMethod]);

    // ContextMenu actions for Default Ownership
    const ownershipActions: ContextMenuAction[] = useMemo(() => {
        return DEFAULT_OWNERSHIP_OPTIONS.map((item) => ({
            title: item.title,
            subtitle: item.description,
            state: item.value === settings.defaultOwnership ? 'on' : 'off',
        }));
    }, [settings.defaultOwnership]);

    // ContextMenu actions for Default Condition
    const conditionActions: ContextMenuAction[] = useMemo(() => {
        return DEFAULT_CONDITION_OPTIONS.map((item) => ({
            title: item.title,
            subtitle: item.description,
            state: item.value === settings.defaultCondition ? 'on' : 'off',
        }));
    }, [settings.defaultCondition]);

    const handleSelectMeasurementSystem = (event: any) => {
        Haptics.selectionAsync();
        const index = event.nativeEvent.index;
        const name = event.nativeEvent.name;
        const item = MEASUREMENT_SYSTEM_OPTIONS.find((o) => o.title === name) || MEASUREMENT_SYSTEM_OPTIONS[index];
        if (item) {
            onUpdateSettings({
                ...settings,
                measurementSystem: item.value,
            });
        }
    };

    const handleRoundingPickerPress = (event: any) => {
        Haptics.selectionAsync();
        const index = event.nativeEvent.index;
        const name = event.nativeEvent.name;
        const item = ROUNDING_METHOD_OPTIONS.find((o) => o.title === name) || ROUNDING_METHOD_OPTIONS[index];
        if (item) {
            onUpdateSettings({
                ...settings,
                roundingMethod: item.value,
            });
        }
    };

    const handleOwnershipPickerPress = (event: any) => {
        Haptics.selectionAsync();
        const index = event.nativeEvent.index;
        const name = event.nativeEvent.name;
        const item = DEFAULT_OWNERSHIP_OPTIONS.find((o) => o.title === name) || DEFAULT_OWNERSHIP_OPTIONS[index];
        if (item) {
            onUpdateSettings({
                ...settings,
                defaultOwnership: item.value,
            });
        }
    };

    const handleConditionPickerPress = (event: any) => {
        Haptics.selectionAsync();
        const index = event.nativeEvent.index;
        const name = event.nativeEvent.name;
        const item = DEFAULT_CONDITION_OPTIONS.find((o) => o.title === name) || DEFAULT_CONDITION_OPTIONS[index];
        if (item) {
            onUpdateSettings({
                ...settings,
                defaultCondition: item.value,
            });
        }
    };

    const handleSelectPrecision = (precision: number) => {
        onUpdateSettings({
            ...settings,
            quantityPrecision: precision,
        });
    };

    const handleSelectTimezone = (tz: TimezoneOption) => {
        onUpdateSettings({
            ...settings,
            timezone: tz.id,
            timezoneLabel: tz.label,
        });
    };

    const activeUnitsCount = units.filter((u) => u.isActive).length;

    return (
        <View style={s.container}>
            {/* ============================================================ */}
            {/* SECTION 1 — Units & Measurement */}
            {/* ============================================================ */}
            <View style={s.sectionBlock}>
                <Text style={[s.sectionHeaderLabel, { color: subtextColor }]}>
                    Units & Measurement
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
                    {/* Measurement System (Dropdown ContextMenu) */}
                    <ContextMenu
                        actions={measurementSystemActions}
                        onPress={handleSelectMeasurementSystem}
                        dropdownMenuMode={true}
                    >
                        <View style={s.rowButton}>
                            <View style={s.textCol}>
                                <Text style={[s.settingTitle, { color: textColor }]}>
                                    Measurement System
                                </Text>
                                <Text style={[s.settingSubtitle, { color: subtextColor }]}>
                                    Default system for units and dimensions.
                                </Text>
                            </View>
                            <View style={s.valueCol}>
                                <Text style={[s.valueText, { color: '#007AFF' }]}>
                                    {currentSystemMeta.title.replace(' System', '')}
                                </Text>
                                <PlatformIcon
                                    name="chevron.up.chevron.down"
                                    size={13}
                                    tintColor="#007AFF"
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

                    {/* Unit Library (Dedicated Page/Sheet) */}
                    <TouchableOpacity
                        style={s.rowButton}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setUnitLibraryVisible(true);
                        }}
                        activeOpacity={0.7}
                    >
                        <View style={s.textCol}>
                            <Text style={[s.settingTitle, { color: textColor }]}>
                                Unit Library
                            </Text>
                            <Text style={[s.settingSubtitle, { color: subtextColor }]}>
                                Manage system and custom units.
                            </Text>
                        </View>
                        <View style={s.valueCol}>
                            <Text style={[s.valueText, { color: textColor }]}>
                                {activeUnitsCount} Active
                            </Text>
                            <PlatformIcon
                                name="chevron.right"
                                size={14}
                                tintColor={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'}
                            />
                        </View>
                    </TouchableOpacity>

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

                    {/* Unit Conversions (Dedicated Page/Sheet) */}
                    <TouchableOpacity
                        style={s.rowButton}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setUnitConversionsVisible(true);
                        }}
                        activeOpacity={0.7}
                    >
                        <View style={s.textCol}>
                            <Text style={[s.settingTitle, { color: textColor }]}>
                                Unit Conversions
                            </Text>
                            <Text style={[s.settingSubtitle, { color: subtextColor }]}>
                                Configure global and item-specific conversions.
                            </Text>
                        </View>
                        <View style={s.valueCol}>
                            <Text style={[s.valueText, { color: textColor }]}>
                                {conversions.length} Rules
                            </Text>
                            <PlatformIcon
                                name="chevron.right"
                                size={14}
                                tintColor={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'}
                            />
                        </View>
                    </TouchableOpacity>
                </GlassView>
            </View>

            {/* ============================================================ */}
            {/* SECTION 2 — Quantity Format */}
            {/* ============================================================ */}
            <View style={s.sectionBlock}>
                <Text style={[s.sectionHeaderLabel, { color: subtextColor }]}>
                    Quantity Format
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
                    {/* Setting 1: Quantity Precision */}
                    <TouchableOpacity
                        style={s.rowButton}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setPrecisionSheetVisible(true);
                        }}
                        activeOpacity={0.7}
                    >
                        <View style={s.textCol}>
                            <Text style={[s.settingTitle, { color: textColor }]}>
                                Quantity Precision
                            </Text>
                            <Text style={[s.settingSubtitle, { color: subtextColor }]}>
                                Number of decimal places for stock quantities.
                            </Text>
                        </View>
                        <View style={s.valueCol}>
                            <Text style={[s.valueText, { color: textColor }]}>
                                {currentPrecisionMeta.label}
                            </Text>
                            <PlatformIcon
                                name="chevron.right"
                                size={14}
                                tintColor={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'}
                            />
                        </View>
                    </TouchableOpacity>

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

                    {/* Setting 2: Rounding Method (ContextMenu Dropdown) */}
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
                                    Standard rounding behavior for quantities.
                                </Text>
                            </View>
                            <View style={s.valueCol}>
                                <Text style={[s.valueText, { color: '#007AFF' }]}>
                                    {currentRoundingMeta.title}
                                </Text>
                                <PlatformIcon
                                    name="chevron.up.chevron.down"
                                    size={13}
                                    tintColor="#007AFF"
                                />
                            </View>
                        </View>
                    </ContextMenu>

                    {/* Clean Live Quantity Preview Box */}
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
                                {currentRoundingMeta.title} ({settings.quantityPrecision}{' '}
                                {settings.quantityPrecision === 1 ? 'decimal' : 'decimals'})
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
                </GlassView>
            </View>

            {/* ============================================================ */}
            {/* SECTION 3 — Resource Defaults */}
            {/* ============================================================ */}
            <View style={s.sectionBlock}>
                <Text style={[s.sectionHeaderLabel, { color: subtextColor }]}>
                    Resource Defaults
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
                    {/* Default Ownership */}
                    <ContextMenu
                        actions={ownershipActions}
                        onPress={handleOwnershipPickerPress}
                        dropdownMenuMode={true}
                    >
                        <View style={s.rowButton}>
                            <View style={s.textCol}>
                                <Text style={[s.settingTitle, { color: textColor }]}>
                                    Default Ownership
                                </Text>
                                <Text style={[s.settingSubtitle, { color: subtextColor }]}>
                                    Fallback ownership for newly created stock.
                                </Text>
                            </View>
                            <View style={s.valueCol}>
                                <Text style={[s.valueText, { color: '#007AFF' }]}>
                                    {currentOwnershipMeta.title.replace(' (Global)', '')}
                                </Text>
                                <PlatformIcon
                                    name="chevron.up.chevron.down"
                                    size={13}
                                    tintColor="#007AFF"
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

                    {/* Default Condition */}
                    <ContextMenu
                        actions={conditionActions}
                        onPress={handleConditionPickerPress}
                        dropdownMenuMode={true}
                    >
                        <View style={s.rowButton}>
                            <View style={s.textCol}>
                                <Text style={[s.settingTitle, { color: textColor }]}>
                                    Default Condition
                                </Text>
                                <Text style={[s.settingSubtitle, { color: subtextColor }]}>
                                    Initial condition for newly received resources.
                                </Text>
                            </View>
                            <View style={s.valueCol}>
                                <Text style={[s.valueText, { color: '#007AFF' }]}>
                                    {currentConditionMeta.title}
                                </Text>
                                <PlatformIcon
                                    name="chevron.up.chevron.down"
                                    size={13}
                                    tintColor="#007AFF"
                                />
                            </View>
                        </View>
                    </ContextMenu>

                    {/* Note caption */}
                    <View style={s.captionBox}>
                        <PlatformIcon
                            name="info.circle.fill"
                            size={14}
                            tintColor={subtextColor}
                        />
                        <Text style={[s.captionText, { color: subtextColor }]}>
                            Defaults act as fallback and can always be overridden during receiving.
                        </Text>
                    </View>
                </GlassView>
            </View>

            {/* ============================================================ */}
            {/* SECTION 4 — Time & Region */}
            {/* ============================================================ */}
            <View style={s.sectionBlock}>
                <Text style={[s.sectionHeaderLabel, { color: subtextColor }]}>
                    Time & Region
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
                    <TouchableOpacity
                        style={s.rowButton}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setTimezoneSheetVisible(true);
                        }}
                        activeOpacity={0.7}
                    >
                        <View style={s.textCol}>
                            <Text style={[s.settingTitle, { color: textColor }]}>
                                Time Zone
                            </Text>
                            <Text style={[s.settingSubtitle, { color: subtextColor }]}>
                                Used for Receiving, Transfer, and Activity Log timestamps.
                            </Text>
                        </View>
                        <View style={s.valueCol}>
                            <Text style={[s.valueText, { color: textColor }]}>
                                {settings.timezoneLabel}
                            </Text>
                            <PlatformIcon
                                name="chevron.right"
                                size={14}
                                tintColor={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'}
                            />
                        </View>
                    </TouchableOpacity>
                </GlassView>
            </View>

            {/* Drawers & Sheets */}
            <ResourcesDecimalPrecisionSheet
                visible={precisionSheetVisible}
                onClose={() => setPrecisionSheetVisible(false)}
                selectedPrecision={settings.quantityPrecision}
                onSelect={handleSelectPrecision}
            />

            <ResourcesTimezoneSheet
                visible={timezoneSheetVisible}
                onClose={() => setTimezoneSheetVisible(false)}
                selectedId={settings.timezone}
                onSelect={handleSelectTimezone}
            />

            <UnitLibrarySheet
                visible={unitLibraryVisible}
                units={units}
                onClose={() => setUnitLibraryVisible(false)}
                onUpdateUnits={onUpdateUnits}
            />

            <UnitConversionsSheet
                visible={unitConversionsVisible}
                conversions={conversions}
                units={units}
                onClose={() => setUnitConversionsVisible(false)}
                onUpdateConversions={onUpdateConversions}
            />
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
    },
    previewDispText: {
        fontSize: 15,
        fontWeight: '700',
    },
    captionBox: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 12,
        paddingTop: 4,
        gap: 6,
    },
    captionText: {
        fontSize: 12,
        lineHeight: 16,
        flex: 1,
    },
});
