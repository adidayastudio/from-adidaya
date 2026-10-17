import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Switch,
    LayoutAnimation,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import ContextMenu from '@/components/ui/PlatformContextMenu';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import {
    ResourcesReceivingRulesSettings,
    RequirementLevel,
    ReceivingRequiredInfoFields,
    REQUIREMENT_LEVEL_OPTIONS,
    OVER_RECEIVING_OPTIONS,
    AUTOFILL_QTY_OPTIONS,
    OverReceivingMode,
    AutofillQtyMode,
} from '@/lib/api/resourcesReceivingRules';
import { ResourceTypeOption } from '@/lib/api/financeSetup';
import { ResourceLocationItem } from '@/lib/api/resourcesLocations';
import { getResourceBadgeMeta } from './ResourcesClassificationSection';

interface ResourcesReceivingRulesSectionProps {
    isDark: boolean;
    textColor: string;
    subtextColor: string;
    settings: ResourcesReceivingRulesSettings;
    locations: ResourceLocationItem[];
    onUpdateSettings: (settings: ResourcesReceivingRulesSettings) => void;
}

const RESOURCE_TYPES: ResourceTypeOption[] = ['Material', 'Tools', 'Assets', 'Services'];

const FIELD_CONFIGS: Array<{ key: keyof ReceivingRequiredInfoFields; label: string; subtitle: string; icon: string }> = [
    { key: 'receivedDate', label: 'Received Date', subtitle: 'Actual date items arrived on site/warehouse', icon: 'calendar' },
    { key: 'receivingLocation', label: 'Receiving Location', subtitle: 'Target site, warehouse, or drop point', icon: 'mappin.circle.fill' },
    { key: 'receivedBy', label: 'Received By', subtitle: 'Staff or warehouse officer accepting delivery', icon: 'person.fill' },
    { key: 'condition', label: 'Condition', subtitle: 'Physical or quality state upon arrival', icon: 'checkmark.shield.fill' },
    { key: 'deliveryNoteNumber', label: 'Surat Jalan / DO No.', subtitle: 'Vendor delivery order reference number', icon: 'doc.text.fill' },
    { key: 'deliveryNoteAttachment', label: 'Delivery Note Attachment', subtitle: 'Photo or PDF of signed Surat Jalan', icon: 'paperclip' },
    { key: 'itemPhoto', label: 'Item Photo', subtitle: 'Photo proof of delivered items / condition', icon: 'camera.fill' },
    { key: 'notes', label: 'Receiving Notes', subtitle: 'Discrepancy remarks or special instructions', icon: 'text.alignleft' },
];

const CONDITION_PRESETS = ['New', 'Good', 'Fair', 'Damaged', 'Under Repair'];
const STATUS_PRESETS = ['Available', 'Reserved', 'In Use', 'Maintenance'];

export function ResourcesReceivingRulesSection({
    isDark,
    textColor,
    subtextColor,
    settings,
    locations,
    onUpdateSettings,
}: ResourcesReceivingRulesSectionProps) {
    const [selectedType, setSelectedType] = useState<ResourceTypeOption>('Material');

    // Filter receiving-capable locations
    const receivingLocations = locations.filter((l) => l.active && (l.isReceivingLocation || l.type === 'Warehouse' || l.type === 'Site'));

    const updateField = <K extends keyof ResourcesReceivingRulesSettings>(
        key: K,
        val: ResourcesReceivingRulesSettings[K]
    ) => {
        const updated = { ...settings, [key]: val };
        onUpdateSettings(updated);
    };

    const updateRequiredField = (fieldKey: keyof ReceivingRequiredInfoFields, level: RequirementLevel) => {
        Haptics.selectionAsync();
        const updatedFields = {
            ...settings.requiredFields,
            [fieldKey]: level,
        };
        updateField('requiredFields', updatedFields);
    };

    const updateTypeOverride = (type: ResourceTypeOption, patch: Partial<ResourcesReceivingRulesSettings['typeOverrides'][ResourceTypeOption]>) => {
        Haptics.selectionAsync();
        const current = settings.typeOverrides?.[type] || {
            resourceType: type,
            receivingMode: type === 'Services' ? 'Service Confirmation' : 'Physical Receiving',
            allowPartial: true,
            requireInspection: true,
        };
        const updatedOverrides = {
            ...settings.typeOverrides,
            [type]: {
                ...current,
                ...patch,
            },
        };
        updateField('typeOverrides', updatedOverrides as any);
    };

    const currentTypeRule = settings.typeOverrides?.[selectedType] || {
        resourceType: selectedType,
        receivingMode: selectedType === 'Services' ? 'Service Confirmation' : 'Physical Receiving',
        allowPartial: true,
        requireInspection: true,
    };

    const typeMeta = getResourceBadgeMeta(selectedType);

    const getLevelBadgeStyle = (level: RequirementLevel) => {
        switch (level) {
            case 'Required':
                return {
                    color: '#007AFF',
                    bg: isDark ? 'rgba(0,122,255,0.15)' : '#EBF5FF',
                };
            case 'Optional':
                return {
                    color: '#FF9500',
                    bg: isDark ? 'rgba(255,149,0,0.15)' : '#FFF4E5',
                };
            case 'Off':
                return {
                    color: subtextColor,
                    bg: isDark ? 'rgba(255,255,255,0.06)' : '#F2F2F7',
                };
        }
    };

    return (
        <View style={s.container}>
            {/* Section 1: Receiving Eligibility */}
            <Text style={[s.sectionHeader, { color: subtextColor }]}>Receiving Eligibility</Text>
            <View
                style={[
                    s.formCard,
                    { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                ]}
            >
                {/* Finance Status Required (Read-only / System rule) */}
                <View style={s.formRow}>
                    <View style={s.labelCol}>
                        <View style={s.titleWithTag}>
                            <Text style={[s.formLabel, { color: textColor }]}>Finance Status Required</Text>
                            <View style={[s.systemBadge, { backgroundColor: isDark ? 'rgba(0,122,255,0.12)' : '#EBF5FF' }]}>
                                <Text style={s.systemBadgeText}>System Rule</Text>
                            </View>
                        </View>
                        <Text style={[s.formSubtitle, { color: subtextColor }]}>
                            Only Finance items with status Paid enter the Resources intake queue
                        </Text>
                    </View>
                    <View style={[s.valuePill, { backgroundColor: isDark ? 'rgba(52,199,89,0.15)' : '#E8F8EE' }]}>
                        <PlatformIcon name="lock.fill" size={11} tintColor="#34C759" />
                        <Text style={[s.valuePillText, { color: '#34C759' }]}>Paid</Text>
                    </View>
                </View>

                <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                {/* Eligibility Scope */}
                <View style={s.formRow}>
                    <View style={s.labelCol}>
                        <Text style={[s.formLabel, { color: textColor }]}>Eligibility Scope</Text>
                        <Text style={[s.formSubtitle, { color: subtextColor }]}>
                            Evaluated per-item based on Resource Mapping (Material, Tools, Assets, Services)
                        </Text>
                    </View>
                    <View style={[s.valuePill, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F2F2F7' }]}>
                        <Text style={[s.valuePillText, { color: textColor }]}>Per Item</Text>
                    </View>
                </View>
            </View>

            {/* Section 2: Receiving Behavior */}
            <Text style={[s.sectionHeader, { color: subtextColor }]}>Receiving Behavior</Text>
            <View
                style={[
                    s.formCard,
                    { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                ]}
            >
                {/* Allow Partial Receiving */}
                <View style={s.formRow}>
                    <View style={s.labelCol}>
                        <Text style={[s.formLabel, { color: textColor }]}>Allow Partial Receiving</Text>
                        <Text style={[s.formSubtitle, { color: subtextColor }]}>
                            Accept split shipments and track remaining balance
                        </Text>
                    </View>
                    <Switch
                        value={settings.allowPartialReceiving}
                        onValueChange={(val) => {
                            Haptics.selectionAsync();
                            updateField('allowPartialReceiving', val);
                        }}
                        trackColor={{ false: '#3A3A3C', true: '#34C759' }}
                    />
                </View>

                <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                {/* Over Receiving */}
                <ContextMenu
                    actions={OVER_RECEIVING_OPTIONS.map((opt) => ({
                        title: opt,
                        state: settings.overReceiving === opt ? 'on' : 'off',
                    }))}
                    dropdownMenuMode={true}
                    onPress={(e) => {
                        const opt = OVER_RECEIVING_OPTIONS[e.nativeEvent.index];
                        if (opt) {
                            Haptics.selectionAsync();
                            updateField('overReceiving', opt);
                        }
                    }}
                >
                    <TouchableOpacity style={s.selectRow} activeOpacity={0.7}>
                        <View style={{ flex: 1 }}>
                            <Text style={[s.formLabel, { color: textColor }]}>Over Receiving</Text>
                            <Text style={[s.formSubtitle, { color: subtextColor }]}>
                                Policy when delivered quantity exceeds PO quantity
                            </Text>
                        </View>
                        <View style={s.selectValueBox}>
                            <Text style={[s.selectValueText, { color: settings.overReceiving === 'Not Allowed' ? '#FF3B30' : '#FF9500' }]}>
                                {settings.overReceiving}
                            </Text>
                            <PlatformIcon name="chevron.up.chevron.down" size={13} tintColor={subtextColor} />
                        </View>
                    </TouchableOpacity>
                </ContextMenu>

                <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                {/* Receive Multiple Items Together */}
                <View style={s.formRow}>
                    <View style={s.labelCol}>
                        <Text style={[s.formLabel, { color: textColor }]}>Multi-Item Batch Receiving</Text>
                        <Text style={[s.formSubtitle, { color: subtextColor }]}>
                            One Receiving Record can contain multiple items from the same shipment
                        </Text>
                    </View>
                    <Switch
                        value={settings.receiveMultipleItemsTogether}
                        onValueChange={(val) => {
                            Haptics.selectionAsync();
                            updateField('receiveMultipleItemsTogether', val);
                        }}
                        trackColor={{ false: '#3A3A3C', true: '#34C759' }}
                    />
                </View>

                <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                {/* Sequence Preview */}
                <View style={s.formRow}>
                    <View style={s.labelCol}>
                        <Text style={[s.formLabel, { color: textColor }]}>Receiving Record Format</Text>
                        <Text style={[s.formSubtitle, { color: subtextColor }]}>
                            Unique sequential identifier generated for every receipt
                        </Text>
                    </View>
                    <Text style={[s.codeText, { color: subtextColor }]}>
                        {settings.numberingSequencePreview || 'RC-YYMMXXXX'}
                    </Text>
                </View>
            </View>

            {/* Section 3: Required Information */}
            <Text style={[s.sectionHeader, { color: subtextColor }]}>Required Information</Text>
            <View
                style={[
                    s.formCard,
                    { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                ]}
            >
                {FIELD_CONFIGS.map((field, idx) => {
                    const currentLevel = settings.requiredFields?.[field.key] || 'Required';
                    const badgeStyle = getLevelBadgeStyle(currentLevel);

                    return (
                        <View key={field.key}>
                            {idx > 0 && (
                                <View
                                    style={[
                                        s.divider,
                                        { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' },
                                    ]}
                                />
                            )}
                            <ContextMenu
                                actions={REQUIREMENT_LEVEL_OPTIONS.map((lvl) => ({
                                    title: lvl,
                                    state: currentLevel === lvl ? 'on' : 'off',
                                }))}
                                dropdownMenuMode={true}
                                onPress={(e) => {
                                    const lvl = REQUIREMENT_LEVEL_OPTIONS[e.nativeEvent.index];
                                    if (lvl) updateRequiredField(field.key, lvl);
                                }}
                            >
                                <TouchableOpacity style={s.selectRow} activeOpacity={0.7}>
                                    <View style={s.fieldLabelGroup}>
                                        <Text style={[s.formLabel, { color: textColor }]}>{field.label}</Text>
                                        <Text style={[s.formSubtitle, { color: subtextColor }]}>{field.subtitle}</Text>
                                    </View>
                                    <View style={s.selectValueBox}>
                                        <View style={[s.levelBadge, { backgroundColor: badgeStyle.bg }]}>
                                            <Text style={[s.levelBadgeText, { color: badgeStyle.color }]}>
                                                {currentLevel}
                                            </Text>
                                        </View>
                                        <PlatformIcon name="chevron.up.chevron.down" size={13} tintColor={subtextColor} />
                                    </View>
                                </TouchableOpacity>
                            </ContextMenu>
                        </View>
                    );
                })}
            </View>

            {/* Section 4: Resource Matching */}
            <Text style={[s.sectionHeader, { color: subtextColor }]}>Resource Matching & Master Data</Text>
            <View
                style={[
                    s.formCard,
                    { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                ]}
            >
                {/* Require Item Matching Before Receive */}
                <View style={s.formRow}>
                    <View style={s.labelCol}>
                        <Text style={[s.formLabel, { color: textColor }]}>Require Item Matching Before Receive</Text>
                        <Text style={[s.formSubtitle, { color: subtextColor }]}>
                            Must match to existing Item Master or create new SKU before receiving
                        </Text>
                    </View>
                    <Switch
                        value={settings.requireItemMatchingBeforeReceive}
                        onValueChange={(val) => {
                            Haptics.selectionAsync();
                            updateField('requireItemMatchingBeforeReceive', val);
                        }}
                        trackColor={{ false: '#3A3A3C', true: '#34C759' }}
                    />
                </View>

                <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                {/* Allow Resource Type Override */}
                <View style={s.formRow}>
                    <View style={s.labelCol}>
                        <Text style={[s.formLabel, { color: textColor }]}>Allow Resource Type Override</Text>
                        <Text style={[s.formSubtitle, { color: subtextColor }]}>
                            Adjust classification in Resources without altering Finance record
                        </Text>
                    </View>
                    <Switch
                        value={settings.allowResourceTypeOverride}
                        onValueChange={(val) => {
                            Haptics.selectionAsync();
                            updateField('allowResourceTypeOverride', val);
                        }}
                        trackColor={{ false: '#3A3A3C', true: '#34C759' }}
                    />
                </View>

                <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                {/* Allow Variant / SKU Assignment During Receiving */}
                <View style={s.formRow}>
                    <View style={s.labelCol}>
                        <Text style={[s.formLabel, { color: textColor }]}>Variant / SKU Assignment on Intake</Text>
                        <Text style={[s.formSubtitle, { color: subtextColor }]}>
                            Allow receiver to assign brand, model, and serial number during check-in
                        </Text>
                    </View>
                    <Switch
                        value={settings.allowVariantSkuAssignment}
                        onValueChange={(val) => {
                            Haptics.selectionAsync();
                            updateField('allowVariantSkuAssignment', val);
                        }}
                        trackColor={{ false: '#3A3A3C', true: '#34C759' }}
                    />
                </View>
            </View>

            {/* Section 5: Defaults */}
            <Text style={[s.sectionHeader, { color: subtextColor }]}>Intake Defaults</Text>
            <View
                style={[
                    s.formCard,
                    { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                ]}
            >
                {/* Default Receiving Location */}
                <ContextMenu
                    actions={receivingLocations.map((loc) => ({
                        title: loc.name,
                        state: settings.defaultReceivingLocationId === loc.id ? 'on' : 'off',
                    }))}
                    dropdownMenuMode={true}
                    onPress={(e) => {
                        const loc = receivingLocations[e.nativeEvent.index];
                        if (loc) {
                            Haptics.selectionAsync();
                            updateField('defaultReceivingLocationId', loc.id);
                            updateField('defaultReceivingLocationName', loc.name);
                        }
                    }}
                >
                    <TouchableOpacity style={s.selectRow} activeOpacity={0.7}>
                        <View style={{ flex: 1 }}>
                            <Text style={[s.formLabel, { color: textColor }]}>Default Receiving Location</Text>
                            <Text style={[s.formSubtitle, { color: subtextColor }]}>
                                Pre-selected intake warehouse or site drop point
                            </Text>
                        </View>
                        <View style={s.selectValueBox}>
                            <Text style={[s.selectValueText, { color: '#007AFF' }]} numberOfLines={1}>
                                {locations.find((l) => l.id === settings.defaultReceivingLocationId)?.name ||
                                    settings.defaultReceivingLocationName ||
                                    'Select Location'}
                            </Text>
                            <PlatformIcon name="chevron.up.chevron.down" size={13} tintColor={subtextColor} />
                        </View>
                    </TouchableOpacity>
                </ContextMenu>

                <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                {/* Default Condition */}
                <ContextMenu
                    actions={CONDITION_PRESETS.map((c) => ({
                        title: c,
                        state: settings.defaultCondition === c ? 'on' : 'off',
                    }))}
                    dropdownMenuMode={true}
                    onPress={(e) => {
                        const c = CONDITION_PRESETS[e.nativeEvent.index];
                        if (c) {
                            Haptics.selectionAsync();
                            updateField('defaultCondition', c);
                        }
                    }}
                >
                    <TouchableOpacity style={s.selectRow} activeOpacity={0.7}>
                        <View style={{ flex: 1 }}>
                            <Text style={[s.formLabel, { color: textColor }]}>Default Condition</Text>
                            <Text style={[s.formSubtitle, { color: subtextColor }]}>
                                Inherited from Conditions & Statuses intake profile
                            </Text>
                        </View>
                        <View style={s.selectValueBox}>
                            <Text style={[s.selectValueText, { color: '#007AFF' }]}>
                                {settings.defaultCondition || 'Good'}
                            </Text>
                            <PlatformIcon name="chevron.up.chevron.down" size={13} tintColor={subtextColor} />
                        </View>
                    </TouchableOpacity>
                </ContextMenu>

                <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                {/* Default Status After Receiving */}
                <ContextMenu
                    actions={STATUS_PRESETS.map((st) => ({
                        title: st,
                        state: settings.defaultStatusAfterReceiving === st ? 'on' : 'off',
                    }))}
                    dropdownMenuMode={true}
                    onPress={(e) => {
                        const st = STATUS_PRESETS[e.nativeEvent.index];
                        if (st) {
                            Haptics.selectionAsync();
                            updateField('defaultStatusAfterReceiving', st);
                        }
                    }}
                >
                    <TouchableOpacity style={s.selectRow} activeOpacity={0.7}>
                        <View style={{ flex: 1 }}>
                            <Text style={[s.formLabel, { color: textColor }]}>Status After Receiving</Text>
                            <Text style={[s.formSubtitle, { color: subtextColor }]}>
                                Lifecycle status applied immediately upon completion
                            </Text>
                        </View>
                        <View style={s.selectValueBox}>
                            <Text style={[s.selectValueText, { color: '#34C759' }]}>
                                {settings.defaultStatusAfterReceiving || 'Available'}
                            </Text>
                            <PlatformIcon name="chevron.up.chevron.down" size={13} tintColor={subtextColor} />
                        </View>
                    </TouchableOpacity>
                </ContextMenu>

                <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                {/* Auto-fill Received Qty */}
                <ContextMenu
                    actions={AUTOFILL_QTY_OPTIONS.map((opt) => ({
                        title: opt,
                        state: settings.autofillReceivedQty === opt ? 'on' : 'off',
                    }))}
                    dropdownMenuMode={true}
                    onPress={(e) => {
                        const opt = AUTOFILL_QTY_OPTIONS[e.nativeEvent.index];
                        if (opt) {
                            Haptics.selectionAsync();
                            updateField('autofillReceivedQty', opt);
                        }
                    }}
                >
                    <TouchableOpacity style={s.selectRow} activeOpacity={0.7}>
                        <View style={{ flex: 1 }}>
                            <Text style={[s.formLabel, { color: textColor }]}>Auto-fill Received Qty</Text>
                            <Text style={[s.formSubtitle, { color: subtextColor }]}>
                                Initial quantity populated in intake input fields
                            </Text>
                        </View>
                        <View style={s.selectValueBox}>
                            <Text style={[s.selectValueText, { color: '#007AFF' }]}>
                                {settings.autofillReceivedQty || 'Expected Quantity'}
                            </Text>
                            <PlatformIcon name="chevron.up.chevron.down" size={13} tintColor={subtextColor} />
                        </View>
                    </TouchableOpacity>
                </ContextMenu>
            </View>

            {/* Section 6: Resource Type Specific Rules */}
            <Text style={[s.sectionHeader, { color: subtextColor }]}>Resource Type Rules & Overrides</Text>
            
            {/* Type Pills */}
            <View style={s.pillsRow}>
                {RESOURCE_TYPES.map((type) => {
                    const isSelected = selectedType === type;
                    return (
                        <TouchableOpacity
                            key={type}
                            style={[
                                s.pillBtn,
                                isSelected
                                    ? [s.pillBtnActive, { backgroundColor: isDark ? '#FFFFFF' : '#000000' }]
                                    : { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F2F2F7' },
                            ]}
                            onPress={() => {
                                Haptics.selectionAsync();
                                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                setSelectedType(type);
                            }}
                            activeOpacity={0.7}
                        >
                            <Text
                                style={[
                                    s.pillText,
                                    {
                                        color: isSelected ? (isDark ? '#000000' : '#FFFFFF') : textColor,
                                        fontWeight: isSelected ? '600' : '500',
                                    },
                                ]}
                            >
                                {type}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            <View
                style={[
                    s.formCard,
                    { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                ]}
            >
                {/* Intake Mode */}
                <View style={s.formRow}>
                    <View style={s.labelCol}>
                        <Text style={[s.formLabel, { color: textColor }]}>Receiving Methodology</Text>
                        <Text style={[s.formSubtitle, { color: subtextColor }]}>
                            {selectedType === 'Services'
                                ? 'Milestone confirmation & deliverable sign-off (non-quantity)'
                                : 'Physical item counting, condition inspection, and serial assignment'}
                        </Text>
                    </View>
                    <View style={[s.valuePill, { backgroundColor: isDark ? `${typeMeta.iconColor}25` : `${typeMeta.iconColor}15` }]}>
                        <PlatformIcon name={typeMeta.icon as any} size={11} tintColor={typeMeta.iconColor} />
                        <Text style={[s.valuePillText, { color: typeMeta.iconColor }]}>
                            {currentTypeRule.receivingMode}
                        </Text>
                    </View>
                </View>

                <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                {/* Require Quality Inspection */}
                <View style={s.formRow}>
                    <View style={s.labelCol}>
                        <Text style={[s.formLabel, { color: textColor }]}>
                            {selectedType === 'Services' ? 'Require Deliverable Verification' : 'Require Physical Quality Check'}
                        </Text>
                        <Text style={[s.formSubtitle, { color: subtextColor }]}>
                            Enforce QC sign-off before stock becomes Available
                        </Text>
                    </View>
                    <Switch
                        value={currentTypeRule.requireInspection}
                        onValueChange={(val) => updateTypeOverride(selectedType, { requireInspection: val })}
                        trackColor={{ false: '#3A3A3C', true: '#34C759' }}
                    />
                </View>

                <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                {/* Partial intake for this type */}
                <View style={s.formRow}>
                    <View style={s.labelCol}>
                        <Text style={[s.formLabel, { color: textColor }]}>Allow Partial for {selectedType}</Text>
                        <Text style={[s.formSubtitle, { color: subtextColor }]}>
                            {selectedType === 'Assets'
                                ? 'Deploy individual units as they arrive from vendor'
                                : 'Accept staged milestone / batch delivery for this type'}
                        </Text>
                    </View>
                    <Switch
                        value={currentTypeRule.allowPartial}
                        onValueChange={(val) => updateTypeOverride(selectedType, { allowPartial: val })}
                        trackColor={{ false: '#3A3A3C', true: '#34C759' }}
                    />
                </View>
            </View>
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
        paddingHorizontal: 4,
        marginTop: 12,
        marginBottom: 6,
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
        paddingVertical: 12,
    },
    selectRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    labelCol: {
        flex: 1,
        paddingRight: 12,
        gap: 2,
    },
    fieldLabelGroup: {
        flex: 1,
        paddingRight: 12,
        gap: 2,
    },
    titleWithTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    formLabel: {
        fontSize: 15,
        fontWeight: '500',
    },
    formSubtitle: {
        fontSize: 12.5,
        lineHeight: 16,
    },
    codeText: {
        fontSize: 13,
        fontFamily: 'Menlo',
    },
    systemBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 5,
    },
    systemBadgeText: {
        color: '#007AFF',
        fontSize: 10.5,
        fontWeight: '600',
    },
    valuePill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 5,
    },
    valuePillText: {
        fontSize: 13,
        fontWeight: '600',
    },
    selectValueBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        maxWidth: '55%',
    },
    selectValueText: {
        fontSize: 14.5,
        fontWeight: '500',
    },
    levelBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    levelBadgeText: {
        fontSize: 12.5,
        fontWeight: '600',
    },
    pillsRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 4,
    },
    pillBtn: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 18,
    },
    pillBtnActive: {},
    pillText: {
        fontSize: 13,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 16,
    },
});
