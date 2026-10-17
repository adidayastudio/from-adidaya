import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Switch,
    Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import ContextMenu from '@/components/ui/PlatformContextMenu';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import {
    ResourcesStockRulesSettings,
    StockItemOverride,
    ThresholdMode,
} from '@/lib/api/resourcesStockRules';
import { ResourceTypeOption } from '@/lib/api/financeSetup';
import { getResourceBadgeMeta } from './ResourcesClassificationSection';
import { StockOverridesSheet } from './StockOverridesSheet';

interface ResourcesStockRulesSectionProps {
    isDark: boolean;
    textColor: string;
    subtextColor: string;
    settings: ResourcesStockRulesSettings;
    onUpdateSettings: (settings: ResourcesStockRulesSettings) => void;
}

const ALL_RESOURCE_TYPES: ResourceTypeOption[] = ['Material', 'Tools', 'Assets'];

export function ResourcesStockRulesSection({
    isDark,
    textColor,
    subtextColor,
    settings,
    onUpdateSettings,
}: ResourcesStockRulesSectionProps) {
    const [isOverridesSheetOpen, setIsOverridesSheetOpen] = useState(false);

    // Helpers to update individual settings
    const updateField = <K extends keyof ResourcesStockRulesSettings>(
        key: K,
        val: ResourcesStockRulesSettings[K]
    ) => {
        const updated = { ...settings, [key]: val };
        onUpdateSettings(updated);
    };

    const toggleResourceTypeScope = (type: ResourceTypeOption) => {
        Haptics.selectionAsync();
        const current = settings.applicableResourceTypes || ['Material'];
        let updated: ResourceTypeOption[];
        if (current.includes(type)) {
            if (current.length === 1) return; // keep at least 1
            updated = current.filter((t) => t !== type);
        } else {
            updated = [...current, type];
        }
        updateField('applicableResourceTypes', updated);
    };

    const handleUpdateOverrides = (newOverrides: StockItemOverride[]) => {
        updateField('overrides', newOverrides);
    };

    const overrideCount = settings.overrides?.length || 0;

    return (
        <View style={s.container}>
            {/* Section 1: General Stock Behavior */}
            <Text style={[s.sectionHeader, { color: subtextColor }]}>General Stock Behavior</Text>
            <View
                style={[
                    s.formCard,
                    { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                ]}
            >
                {/* Track Stock Toggle */}
                <View style={s.formRow}>
                    <View style={s.labelCol}>
                        <Text style={[s.formLabel, { color: textColor }]}>Track Stock</Text>
                        <Text style={[s.formSubtitle, { color: subtextColor }]}>
                            Enable quantity tracking for stock-based resources
                        </Text>
                    </View>
                    <Switch
                        value={settings.trackStock}
                        onValueChange={(val) => {
                            Haptics.selectionAsync();
                            updateField('trackStock', val);
                        }}
                        trackColor={{ false: '#3A3A3C', true: '#34C759' }}
                    />
                </View>

                <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                {/* Allow Negative Stock Toggle */}
                <View style={s.formRow}>
                    <View style={s.labelCol}>
                        <Text style={[s.formLabel, { color: textColor }]}>Allow Negative Stock</Text>
                        <Text style={[s.formSubtitle, { color: subtextColor }]}>
                            Allow stock quantity to temporarily fall below zero
                        </Text>
                    </View>
                    <Switch
                        value={settings.allowNegativeStock}
                        onValueChange={(val) => {
                            Haptics.selectionAsync();
                            updateField('allowNegativeStock', val);
                        }}
                        trackColor={{ false: '#3A3A3C', true: '#34C759' }}
                    />
                </View>

                <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                {/* Stock Calculation Formula (Read-only) */}
                <View style={s.formRow}>
                    <Text style={[s.formLabel, { color: textColor }]}>Stock Calculation</Text>
                    <Text style={[s.formCodeValue, { color: subtextColor }]}>
                        {settings.stockCalculationFormula || 'Received − Issued/Transferred/Used'}
                    </Text>
                </View>

                <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                {/* Default Stock Unit (Read-only) */}
                <View style={s.formRow}>
                    <Text style={[s.formLabel, { color: textColor }]}>Default Stock Unit</Text>
                    <Text style={[s.formValue, { color: subtextColor }]}>
                        {settings.defaultStockUnitSource || 'Inherit from Item Master'}
                    </Text>
                </View>
            </View>

            {/* Section 2: Stock Alerts */}
            <Text style={[s.sectionHeader, { color: subtextColor }]}>Stock Alerts</Text>
            <View
                style={[
                    s.formCard,
                    { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                ]}
            >
                {/* Low Stock Alerts */}
                <View style={s.formRow}>
                    <View style={s.labelCol}>
                        <Text style={[s.formLabel, { color: textColor }]}>Low Stock Alerts</Text>
                        <Text style={[s.formSubtitle, { color: subtextColor }]}>
                            Notify inventory team when stock is nearing threshold
                        </Text>
                    </View>
                    <Switch
                        value={settings.lowStockAlertsEnabled}
                        onValueChange={(val) => {
                            Haptics.selectionAsync();
                            updateField('lowStockAlertsEnabled', val);
                        }}
                        trackColor={{ false: '#3A3A3C', true: '#34C759' }}
                    />
                </View>

                {settings.lowStockAlertsEnabled && (
                    <>
                        <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                        {/* Low Stock Threshold Mode Dropdown */}
                        <ContextMenu
                            actions={[
                                { title: 'Per Item (Recommended)', selected: settings.lowStockThresholdMode === 'per_item' },
                                { title: 'Global Default Threshold', selected: settings.lowStockThresholdMode === 'global_default' },
                            ]}
                            dropdownMenuMode={true}
                            onPress={(e) => {
                                Haptics.selectionAsync();
                                const mode: ThresholdMode = e.nativeEvent.index === 0 ? 'per_item' : 'global_default';
                                updateField('lowStockThresholdMode', mode);
                            }}
                        >
                            <TouchableOpacity style={s.formRow} activeOpacity={0.7}>
                                <Text style={[s.formLabel, { color: textColor }]}>Threshold Mode</Text>
                                <View style={s.selectValueBox}>
                                    <Text style={[s.formValue, { color: '#007AFF', fontWeight: '500' }]}>
                                        {settings.lowStockThresholdMode === 'per_item' ? 'Per Item (SKU)' : 'Global Default'}
                                    </Text>
                                    <PlatformIcon name="chevron.up.chevron.down" size={13} tintColor={subtextColor} />
                                </View>
                            </TouchableOpacity>
                        </ContextMenu>

                        {settings.lowStockThresholdMode === 'global_default' && (
                            <>
                                <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />
                                <View style={s.formRow}>
                                    <Text style={[s.formLabel, { color: textColor }]}>Global Alert Threshold</Text>
                                    <TextInput
                                        style={[s.numInput, { color: textColor }]}
                                        value={String(settings.globalLowStockThreshold || 10)}
                                        onChangeText={(val) => {
                                            const num = parseInt(val, 10) || 0;
                                            updateField('globalLowStockThreshold', num);
                                        }}
                                        keyboardType="number-pad"
                                    />
                                </View>
                            </>
                        )}
                    </>
                )}

                <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                {/* Out of Stock Alert Toggle */}
                <View style={s.formRow}>
                    <View style={s.labelCol}>
                        <Text style={[s.formLabel, { color: textColor }]}>Out of Stock Alert</Text>
                        <Text style={[s.formSubtitle, { color: subtextColor }]}>
                            Trigger high-priority alert when available stock hits 0
                        </Text>
                    </View>
                    <Switch
                        value={settings.outOfStockAlertEnabled}
                        onValueChange={(val) => {
                            Haptics.selectionAsync();
                            updateField('outOfStockAlertEnabled', val);
                        }}
                        trackColor={{ false: '#3A3A3C', true: '#FF3B30' }}
                    />
                </View>
            </View>

            {/* Section 3: Minimum & Reorder */}
            <Text style={[s.sectionHeader, { color: subtextColor }]}>Minimum & Reorder</Text>
            <View
                style={[
                    s.formCard,
                    { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                ]}
            >
                {/* Minimum Stock Rules */}
                <View style={s.formRow}>
                    <View style={s.labelCol}>
                        <Text style={[s.formLabel, { color: textColor }]}>Minimum Stock</Text>
                        <Text style={[s.formSubtitle, { color: subtextColor }]}>
                            Maintain safety buffer rules across inventory
                        </Text>
                    </View>
                    <Switch
                        value={settings.minimumStockRulesEnabled}
                        onValueChange={(val) => {
                            Haptics.selectionAsync();
                            updateField('minimumStockRulesEnabled', val);
                        }}
                        trackColor={{ false: '#3A3A3C', true: '#34C759' }}
                    />
                </View>

                {settings.minimumStockRulesEnabled && (
                    <>
                        <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                        {/* Reorder Point Mode Dropdown */}
                        <ContextMenu
                            actions={[
                                { title: 'Per Item (Recommended)', selected: settings.reorderPointMode === 'per_item' },
                                { title: 'Global Reorder Point', selected: settings.reorderPointMode === 'global_default' },
                            ]}
                            dropdownMenuMode={true}
                            onPress={(e) => {
                                Haptics.selectionAsync();
                                const mode: ThresholdMode = e.nativeEvent.index === 0 ? 'per_item' : 'global_default';
                                updateField('reorderPointMode', mode);
                            }}
                        >
                            <TouchableOpacity style={s.formRow} activeOpacity={0.7}>
                                <Text style={[s.formLabel, { color: textColor }]}>Reorder Point</Text>
                                <View style={s.selectValueBox}>
                                    <Text style={[s.formValue, { color: '#007AFF', fontWeight: '500' }]}>
                                        {settings.reorderPointMode === 'per_item' ? 'Per Item (SKU)' : 'Global Default'}
                                    </Text>
                                    <PlatformIcon name="chevron.up.chevron.down" size={13} tintColor={subtextColor} />
                                </View>
                            </TouchableOpacity>
                        </ContextMenu>

                        <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                        {/* Reorder Quantity */}
                        <View style={s.formRow}>
                            <View style={s.labelCol}>
                                <Text style={[s.formLabel, { color: textColor }]}>Default Reorder Qty</Text>
                                <Text style={[s.formSubtitle, { color: subtextColor }]}>
                                    Suggested batch size for replenishment alert
                                </Text>
                            </View>
                            <TextInput
                                style={[s.numInput, { color: textColor }]}
                                value={settings.defaultReorderQuantity !== undefined ? String(settings.defaultReorderQuantity) : ''}
                                onChangeText={(val) => {
                                    const num = val.trim() ? parseInt(val, 10) : undefined;
                                    updateField('defaultReorderQuantity', num);
                                }}
                                placeholder="e.g. 50"
                                placeholderTextColor={subtextColor}
                                keyboardType="number-pad"
                            />
                        </View>
                    </>
                )}
            </View>
            <Text style={[s.footerNote, { color: subtextColor }]}>
                Reorder points generate alerts and purchase suggestions without auto-creating purchase requests.
            </Text>

            {/* Section 4: Availability */}
            <Text style={[s.sectionHeader, { color: subtextColor }]}>Availability</Text>
            <View
                style={[
                    s.formCard,
                    { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                ]}
            >
                {/* Reserved Stock */}
                <View style={s.formRow}>
                    <View style={s.labelCol}>
                        <Text style={[s.formLabel, { color: textColor }]}>Reserved Stock</Text>
                        <Text style={[s.formSubtitle, { color: subtextColor }]}>
                            Count project-reserved quantity separately from on-hand
                        </Text>
                    </View>
                    <Switch
                        value={settings.reservedStockTrackingEnabled}
                        onValueChange={(val) => {
                            Haptics.selectionAsync();
                            updateField('reservedStockTrackingEnabled', val);
                        }}
                        trackColor={{ false: '#3A3A3C', true: '#34C759' }}
                    />
                </View>

                <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                {/* Available Formula */}
                <View style={s.formRow}>
                    <Text style={[s.formLabel, { color: textColor }]}>Available Quantity</Text>
                    <Text style={[s.formCodeValue, { color: subtextColor }]}>
                        {settings.availableQuantityFormula || 'On Hand − Reserved'}
                    </Text>
                </View>

                <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                {/* Include In-Transit */}
                <View style={s.formRow}>
                    <View style={s.labelCol}>
                        <Text style={[s.formLabel, { color: textColor }]}>Include In-Transit</Text>
                        <Text style={[s.formSubtitle, { color: subtextColor }]}>
                            Display incoming partial delivery as in-transit (not counted as On Hand until Received)
                        </Text>
                    </View>
                    <Switch
                        value={settings.includeInTransitVisibility}
                        onValueChange={(val) => {
                            Haptics.selectionAsync();
                            updateField('includeInTransitVisibility', val);
                        }}
                        trackColor={{ false: '#3A3A3C', true: '#34C759' }}
                    />
                </View>
            </View>

            {/* Section 5: Resource Scope */}
            <Text style={[s.sectionHeader, { color: subtextColor }]}>Resource Scope</Text>
            <View
                style={[
                    s.formCard,
                    { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', padding: 16, gap: 12 },
                ]}
            >
                <Text style={[s.formSubtitle, { color: subtextColor }]}>
                    Select resource types governed by standard stock tracking:
                </Text>
                <View style={s.pillsRow}>
                    {ALL_RESOURCE_TYPES.map((type) => {
                        const isSelected = settings.applicableResourceTypes?.includes(type);
                        const meta = getResourceBadgeMeta(type);

                        return (
                            <TouchableOpacity
                                key={type}
                                style={[
                                    s.scopePill,
                                    isSelected
                                        ? [s.scopePillSelected, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : '#EBF5FF' }]
                                        : { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F2F2F7' },
                                ]}
                                onPress={() => toggleResourceTypeScope(type)}
                                activeOpacity={0.7}
                            >
                                <PlatformIcon
                                    name={meta.icon as any}
                                    size={12}
                                    tintColor={isSelected ? '#007AFF' : meta.iconColor}
                                />
                                <Text
                                    style={[
                                        s.scopePillText,
                                        {
                                            color: isSelected ? (isDark ? '#FFFFFF' : '#007AFF') : textColor,
                                            fontWeight: isSelected ? '600' : '500',
                                        },
                                    ]}
                                >
                                    {meta.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>
            <Text style={[s.footerNote, { color: subtextColor }]}>
                Stock quantity rules primarily target Materials. Tools and Assets utilize individual serial and condition tracking.
            </Text>

            {/* Section 6: Overrides Row */}
            <Text style={[s.sectionHeader, { color: subtextColor }]}>Custom Overrides</Text>
            <View
                style={[
                    s.formCard,
                    { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                ]}
            >
                <TouchableOpacity
                    style={s.formRow}
                    onPress={() => {
                        Haptics.selectionAsync();
                        setIsOverridesSheetOpen(true);
                    }}
                    activeOpacity={0.7}
                >
                    <View style={s.labelCol}>
                        <Text style={[s.formLabel, { color: textColor }]}>Item Overrides</Text>
                        <Text style={[s.formSubtitle, { color: subtextColor }]}>
                            Per-item thresholds & reorder rules
                        </Text>
                    </View>
                    <View style={s.selectValueBox}>
                        <Text style={[s.formValue, { color: '#007AFF', fontWeight: '500' }]}>
                            {overrideCount} configured
                        </Text>
                        <PlatformIcon name="chevron.right" size={13} tintColor={subtextColor} />
                    </View>
                </TouchableOpacity>
            </View>

            {/* Dedicated Overrides Sheet */}
            <StockOverridesSheet
                visible={isOverridesSheetOpen}
                onClose={() => setIsOverridesSheetOpen(false)}
                overrides={settings.overrides || []}
                onUpdateOverrides={handleUpdateOverrides}
            />
        </View>
    );
}

const s = StyleSheet.create({
    container: {
        gap: 8,
    },
    sectionHeader: {
        fontSize: 13,
        fontWeight: '500',
        marginLeft: 4,
        marginBottom: 6,
        marginTop: 14,
    },
    footerNote: {
        fontSize: 12,
        lineHeight: 16,
        marginLeft: 6,
        marginRight: 6,
        marginTop: 4,
        marginBottom: 2,
    },
    formCard: {
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1,
    },
    formRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 13,
    },
    labelCol: {
        flex: 1,
        paddingRight: 12,
        gap: 2,
    },
    formLabel: {
        fontSize: 15,
        fontWeight: '500',
    },
    formSubtitle: {
        fontSize: 12.5,
        lineHeight: 16,
    },
    formValue: {
        fontSize: 14.5,
    },
    formCodeValue: {
        fontSize: 13,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    selectValueBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    numInput: {
        fontSize: 15,
        fontWeight: '600',
        textAlign: 'right',
        minWidth: 60,
        padding: 0,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 16,
    },
    pillsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    scopePill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 14,
        gap: 6,
    },
    scopePillSelected: {
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: '#007AFF',
    },
    scopePillText: {
        fontSize: 13,
    },
});
