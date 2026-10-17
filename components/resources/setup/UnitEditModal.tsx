import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    TextInput,
    Switch,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassView } from '@/components/ui/GlassView';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import * as Haptics from 'expo-haptics';
import { UnitItem, MeasurementType } from '@/lib/api/resourcesSetup';

export interface UnitEditModalProps {
    visible: boolean;
    unit: UnitItem | null; // null for add
    onClose: () => void;
    onSave: (unit: UnitItem) => void;
    onDeactivate?: (unitId: string) => void;
}

const MEASUREMENT_TYPES: Array<{ type: MeasurementType; label: string }> = [
    { type: 'count', label: 'Count & Quantity' },
    { type: 'weight', label: 'Weight / Mass' },
    { type: 'length', label: 'Length / Distance' },
    { type: 'volume', label: 'Volume / Liquid' },
    { type: 'area', label: 'Area / Surface' },
    { type: 'time', label: 'Time / Service' },
    { type: 'custom', label: 'Custom' },
];

export function UnitEditModal({
    visible,
    unit,
    onClose,
    onSave,
    onDeactivate,
}: UnitEditModalProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';
    const insets = useSafeAreaInsets();

    const [name, setName] = useState('');
    const [symbol, setSymbol] = useState('');
    const [measurementType, setMeasurementType] = useState<MeasurementType>('count');
    const [allowDecimals, setAllowDecimals] = useState(false);
    const [isActive, setIsActive] = useState(true);

    useEffect(() => {
        if (unit) {
            setName(unit.name);
            setSymbol(unit.symbol);
            setMeasurementType(unit.measurementType);
            setAllowDecimals(unit.allowDecimals);
            setIsActive(unit.isActive);
        } else {
            setName('');
            setSymbol('');
            setMeasurementType('count');
            setAllowDecimals(false);
            setIsActive(true);
        }
    }, [unit, visible]);

    const isEditing = !!unit;
    const isUsed = unit && unit.usageCount > 0;

    const handleSave = () => {
        if (!name.trim()) {
            Alert.alert('Validation Error', 'Please enter a unit name.');
            return;
        }
        if (!symbol.trim()) {
            Alert.alert('Validation Error', 'Please enter a unit symbol (e.g. pcs, kg).');
            return;
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        const newUnit: UnitItem = {
            id: unit?.id || `unit_${Date.now()}`,
            name: name.trim(),
            symbol: symbol.trim().toLowerCase(),
            measurementType,
            system: unit?.system || 'universal',
            allowDecimals,
            isSystem: unit?.isSystem || false,
            isActive,
            usageCount: unit?.usageCount || 0,
        };

        onSave(newUnit);
        onClose();
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={[s.container, { backgroundColor: isDark ? '#000' : '#F2F2F7' }]}
            >
                {/* Header */}
                <View style={s.header}>
                    <TouchableOpacity onPress={onClose} style={s.headerBtn}>
                        <Text style={[s.headerBtnText, { color: subtextColor }]}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={[s.headerTitle, { color: textColor }]}>
                        {isEditing ? 'Edit Unit' : 'New Unit'}
                    </Text>
                    <TouchableOpacity onPress={handleSave} style={s.headerBtn}>
                        <Text style={[s.headerBtnText, { color: '#007AFF', fontWeight: '600' }]}>
                            Save
                        </Text>
                    </TouchableOpacity>
                </View>

                <ScrollView
                    contentContainerStyle={[
                        s.scrollContent,
                        { paddingBottom: insets.bottom + 40 },
                    ]}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Usage Banner */}
                    {isUsed && (
                        <GlassView
                            intensity={isDark ? 10 : 20}
                            style={[
                                s.warningCard,
                                {
                                    backgroundColor: isDark
                                        ? 'rgba(255,149,0,0.12)'
                                        : 'rgba(255,149,0,0.08)',
                                    borderColor: isDark
                                        ? 'rgba(255,149,0,0.25)'
                                        : 'rgba(255,149,0,0.2)',
                                },
                            ]}
                        >
                            <PlatformIcon
                                name="exclamationmark.triangle.fill"
                                size={18}
                                tintColor="#FF9500"
                            />
                            <Text style={[s.warningText, { color: isDark ? '#FFB340' : '#C77000' }]}>
                                Used by {unit?.usageCount} items in catalog. Core properties are locked to maintain data integrity. You can toggle active status.
                            </Text>
                        </GlassView>
                    )}

                    {/* Section 1: Basic Info */}
                    <Text style={[s.sectionHeader, { color: subtextColor }]}>Unit Details</Text>
                    <GlassView
                        intensity={isDark ? 10 : 25}
                        style={[
                            s.formCard,
                            {
                                backgroundColor: isDark
                                    ? 'rgba(255,255,255,0.03)'
                                    : 'rgba(255,255,255,0.85)',
                            },
                        ]}
                    >
                        <View style={s.formRow}>
                            <Text style={[s.label, { color: textColor }]}>Unit Name</Text>
                            <TextInput
                                style={[s.input, { color: textColor }]}
                                placeholder="e.g. Kilogram, Piece, Box"
                                placeholderTextColor={subtextColor}
                                value={name}
                                onChangeText={setName}
                                editable={!unit?.isSystem}
                            />
                        </View>
                        <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />
                        <View style={s.formRow}>
                            <Text style={[s.label, { color: textColor }]}>Symbol / Code</Text>
                            <TextInput
                                style={[s.input, { color: textColor }]}
                                placeholder="e.g. kg, pcs, box"
                                placeholderTextColor={subtextColor}
                                value={symbol}
                                onChangeText={setSymbol}
                                autoCapitalize="none"
                                editable={!unit?.isSystem}
                            />
                        </View>
                    </GlassView>

                    {/* Section 2: Measurement Type */}
                    <Text style={[s.sectionHeader, { color: subtextColor }]}>Measurement Type</Text>
                    <GlassView
                        intensity={isDark ? 10 : 25}
                        style={[
                            s.formCard,
                            {
                                backgroundColor: isDark
                                    ? 'rgba(255,255,255,0.03)'
                                    : 'rgba(255,255,255,0.85)',
                            },
                        ]}
                    >
                        {MEASUREMENT_TYPES.map((t, idx) => {
                            const isSelected = measurementType === t.type;
                            const isLast = idx === MEASUREMENT_TYPES.length - 1;
                            return (
                                <View key={t.type}>
                                    <TouchableOpacity
                                        style={s.typeRow}
                                        onPress={() => {
                                            if (!unit?.isSystem) {
                                                Haptics.selectionAsync();
                                                setMeasurementType(t.type);
                                            }
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[s.typeLabel, { color: textColor }]}>
                                            {t.label}
                                        </Text>
                                        {isSelected && (
                                            <PlatformIcon
                                                name="checkmark"
                                                size={16}
                                                tintColor="#007AFF"
                                            />
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
                    </GlassView>

                    {/* Section 3: Options */}
                    <Text style={[s.sectionHeader, { color: subtextColor }]}>Rules & Status</Text>
                    <GlassView
                        intensity={isDark ? 10 : 25}
                        style={[
                            s.formCard,
                            {
                                backgroundColor: isDark
                                    ? 'rgba(255,255,255,0.03)'
                                    : 'rgba(255,255,255,0.85)',
                            },
                        ]}
                    >
                        <View style={s.switchRow}>
                            <View style={s.switchTextCol}>
                                <Text style={[s.switchTitle, { color: textColor }]}>
                                    Allow Decimal Quantity
                                </Text>
                                <Text style={[s.switchSubtitle, { color: subtextColor }]}>
                                    Permit fractional quantities like 1.5 kg or 0.75 m.
                                </Text>
                            </View>
                            <Switch
                                value={allowDecimals}
                                onValueChange={setAllowDecimals}
                                trackColor={{ false: isDark ? '#3A3A3C' : '#E5E5EA', true: '#34C759' }}
                            />
                        </View>

                        <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

                        <View style={s.switchRow}>
                            <View style={s.switchTextCol}>
                                <Text style={[s.switchTitle, { color: textColor }]}>
                                    Active Unit
                                </Text>
                                <Text style={[s.switchSubtitle, { color: subtextColor }]}>
                                    Available for new items and receiving operations.
                                </Text>
                            </View>
                            <Switch
                                value={isActive}
                                onValueChange={setIsActive}
                                trackColor={{ false: isDark ? '#3A3A3C' : '#E5E5EA', true: '#34C759' }}
                            />
                        </View>
                    </GlassView>
                </ScrollView>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const s = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    headerBtn: {
        paddingVertical: 6,
        paddingHorizontal: 8,
    },
    headerBtnText: {
        fontSize: 16,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '600',
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 16,
        gap: 12,
    },
    warningCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
        gap: 10,
        marginBottom: 4,
    },
    warningText: {
        fontSize: 12.5,
        lineHeight: 17,
        flex: 1,
        fontWeight: '500',
    },
    sectionHeader: {
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 0.2,
        paddingHorizontal: 4,
        marginTop: 6,
    },
    formCard: {
        borderRadius: 18,
        overflow: 'hidden',
    },
    formRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    label: {
        width: 120,
        fontSize: 15,
        fontWeight: '500',
    },
    input: {
        flex: 1,
        fontSize: 15,
        textAlign: 'right',
        paddingVertical: 4,
    },
    typeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 13,
        paddingHorizontal: 16,
    },
    typeLabel: {
        fontSize: 15,
        fontWeight: '400',
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
        gap: 12,
    },
    switchTextCol: {
        flex: 1,
        gap: 2,
    },
    switchTitle: {
        fontSize: 15,
        fontWeight: '500',
    },
    switchSubtitle: {
        fontSize: 12,
        lineHeight: 16,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 16,
    },
});
