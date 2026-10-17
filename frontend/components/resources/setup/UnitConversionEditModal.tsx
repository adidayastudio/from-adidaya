import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Alert,
} from 'react-native';
import ContextMenu, { ContextMenuAction } from '@/components/ui/PlatformContextMenu';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassView } from '@/components/ui/GlassView';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import * as Haptics from 'expo-haptics';
import { UnitConversionItem, UnitItem, DEFAULT_UNIT_LIBRARY } from '@/lib/api/resourcesSetup';

export interface UnitConversionEditModalProps {
    visible: boolean;
    conversion: UnitConversionItem | null;
    units?: UnitItem[];
    onClose: () => void;
    onSave: (conversion: UnitConversionItem) => void;
}

export function UnitConversionEditModal({
    visible,
    conversion,
    units = DEFAULT_UNIT_LIBRARY,
    onClose,
    onSave,
}: UnitConversionEditModalProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';
    const insets = useSafeAreaInsets();

    const [scope, setScope] = useState<'global' | 'item'>('global');
    const [fromUnit, setFromUnit] = useState('box');
    const [toUnit, setToUnit] = useState('pcs');
    const [factor, setFactor] = useState('');
    const [itemName, setItemName] = useState('');
    const [description, setDescription] = useState('');

    const activeUnits = useMemo(() => {
        return units.filter((u) => u.isActive);
    }, [units]);

    useEffect(() => {
        if (conversion) {
            setScope(conversion.scope);
            setFromUnit(conversion.fromUnitSymbol);
            setToUnit(conversion.toUnitSymbol);
            setFactor(conversion.factor.toString());
            setItemName(conversion.itemName || '');
            setDescription(conversion.description || '');
        } else {
            setScope('global');
            setFromUnit(activeUnits[1]?.symbol || 'box');
            setToUnit(activeUnits[0]?.symbol || 'pcs');
            setFactor('');
            setItemName('');
            setDescription('');
        }
    }, [conversion, visible, activeUnits]);

    const fromUnitActions: ContextMenuAction[] = useMemo(() => {
        return activeUnits.map((u) => ({
            title: `${u.symbol} — ${u.name}`,
            state: u.symbol === fromUnit ? 'on' : 'off',
        }));
    }, [activeUnits, fromUnit]);

    const toUnitActions: ContextMenuAction[] = useMemo(() => {
        return activeUnits.map((u) => ({
            title: `${u.symbol} — ${u.name}`,
            state: u.symbol === toUnit ? 'on' : 'off',
        }));
    }, [activeUnits, toUnit]);

    const handleSelectFromUnit = (event: any) => {
        Haptics.selectionAsync();
        const index = event.nativeEvent.index;
        const name = event.nativeEvent.name;
        const matched = activeUnits.find((u) => `${u.symbol} — ${u.name}` === name) || activeUnits[index];
        if (matched) {
            setFromUnit(matched.symbol);
        }
    };

    const handleSelectToUnit = (event: any) => {
        Haptics.selectionAsync();
        const index = event.nativeEvent.index;
        const name = event.nativeEvent.name;
        const matched = activeUnits.find((u) => `${u.symbol} — ${u.name}` === name) || activeUnits[index];
        if (matched) {
            setToUnit(matched.symbol);
        }
    };

    const handleSave = () => {
        if (!fromUnit.trim() || !toUnit.trim()) {
            Alert.alert('Validation Error', 'Please select source and target units.');
            return;
        }
        if (fromUnit.trim().toLowerCase() === toUnit.trim().toLowerCase()) {
            Alert.alert('Validation Error', 'Source and target units cannot be the same.');
            return;
        }
        const numFactor = parseFloat(factor);
        if (isNaN(numFactor) || numFactor <= 0) {
            Alert.alert('Validation Error', 'Conversion factor must be a valid number.');
            return;
        }
        if (scope === 'item' && !itemName.trim()) {
            Alert.alert('Validation Error', 'Please specify item name for item-specific conversion.');
            return;
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        const newConv: UnitConversionItem = {
            id: conversion?.id || `conv_${Date.now()}`,
            fromUnitSymbol: fromUnit.trim().toLowerCase(),
            toUnitSymbol: toUnit.trim().toLowerCase(),
            factor: numFactor,
            scope,
            itemName: scope === 'item' ? itemName.trim() : undefined,
            description: description.trim() || undefined,
        };

        onSave(newConv);
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
                        {conversion ? 'Edit Conversion' : 'New Conversion'}
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
                    {/* Scope Selector */}
                    <Text style={[s.sectionHeader, { color: subtextColor }]}>Conversion Type</Text>
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
                        <TouchableOpacity
                            style={s.typeRow}
                            onPress={() => setScope('global')}
                            activeOpacity={0.7}
                        >
                            <View style={s.typeTextCol}>
                                <Text style={[s.typeTitle, { color: textColor }]}>
                                    Universal (Global)
                                </Text>
                                <Text style={[s.typeDesc, { color: subtextColor }]}>
                                    Applies universally across all resources (e.g. 1 ton = 1,000 kg).
                                </Text>
                            </View>
                            {scope === 'global' && (
                                <PlatformIcon name="checkmark" size={16} tintColor="#007AFF" />
                            )}
                        </TouchableOpacity>

                        <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

                        <TouchableOpacity
                            style={s.typeRow}
                            onPress={() => setScope('item')}
                            activeOpacity={0.7}
                        >
                            <View style={s.typeTextCol}>
                                <Text style={[s.typeTitle, { color: textColor }]}>
                                    Item-Specific Packaging
                                </Text>
                                <Text style={[s.typeDesc, { color: subtextColor }]}>
                                    Packaging ratio linked to a specific item (e.g. 1 box = 12 pcs).
                                </Text>
                            </View>
                            {scope === 'item' && (
                                <PlatformIcon name="checkmark" size={16} tintColor="#007AFF" />
                            )}
                        </TouchableOpacity>
                    </GlassView>

                    {/* Formula Inputs */}
                    <Text style={[s.sectionHeader, { color: subtextColor }]}>Formula Ratio</Text>
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
                        <View style={s.formulaBox}>
                            <Text style={[s.formulaStatic, { color: subtextColor }]}>1</Text>

                            {/* From Unit Dropdown */}
                            <ContextMenu
                                actions={fromUnitActions}
                                onPress={handleSelectFromUnit}
                                dropdownMenuMode={true}
                            >
                                <View
                                    style={[
                                        s.unitPickerBtn,
                                        {
                                            backgroundColor: isDark
                                                ? 'rgba(0,122,255,0.15)'
                                                : 'rgba(0,122,255,0.08)',
                                        },
                                    ]}
                                >
                                    <Text style={[s.unitPickerText, { color: '#007AFF' }]}>
                                        {fromUnit || 'From'}
                                    </Text>
                                    <PlatformIcon
                                        name="chevron.up.chevron.down"
                                        size={11}
                                        tintColor="#007AFF"
                                    />
                                </View>
                            </ContextMenu>

                            <Text style={[s.formulaStatic, { color: textColor, fontWeight: '700' }]}>=</Text>

                            {/* Factor Input */}
                            <TextInput
                                style={[
                                    s.factorInput,
                                    {
                                        color: textColor,
                                        borderColor: isDark ? '#333' : '#E5E5EA',
                                        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFF',
                                    },
                                ]}
                                placeholder="Ratio (e.g. 12)"
                                placeholderTextColor={subtextColor}
                                value={factor}
                                onChangeText={setFactor}
                                keyboardType="numeric"
                            />

                            {/* To Unit Dropdown */}
                            <ContextMenu
                                actions={toUnitActions}
                                onPress={handleSelectToUnit}
                                dropdownMenuMode={true}
                            >
                                <View
                                    style={[
                                        s.unitPickerBtn,
                                        {
                                            backgroundColor: isDark
                                                ? 'rgba(0,122,255,0.15)'
                                                : 'rgba(0,122,255,0.08)',
                                        },
                                    ]}
                                >
                                    <Text style={[s.unitPickerText, { color: '#007AFF' }]}>
                                        {toUnit || 'To'}
                                    </Text>
                                    <PlatformIcon
                                        name="chevron.up.chevron.down"
                                        size={11}
                                        tintColor="#007AFF"
                                    />
                                </View>
                            </ContextMenu>
                        </View>
                    </GlassView>

                    {/* Item Specific Name */}
                    {scope === 'item' && (
                        <>
                            <Text style={[s.sectionHeader, { color: subtextColor }]}>Item Link</Text>
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
                                    <Text style={[s.label, { color: textColor }]}>Item Name</Text>
                                    <TextInput
                                        style={[s.input, { color: textColor }]}
                                        placeholder="e.g. Ceramic Floor Tile 40x40"
                                        placeholderTextColor={subtextColor}
                                        value={itemName}
                                        onChangeText={setItemName}
                                    />
                                </View>
                            </GlassView>
                        </>
                    )}

                    {/* Notes / Description */}
                    <Text style={[s.sectionHeader, { color: subtextColor }]}>Notes & Description</Text>
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
                            <TextInput
                                style={[s.textArea, { color: textColor }]}
                                placeholder="Optional description or packaging note..."
                                placeholderTextColor={subtextColor}
                                value={description}
                                onChangeText={setDescription}
                                multiline
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
    sectionHeader: {
        fontSize: 13,
        fontWeight: '600',
        letterSpacing: -0.1,
        paddingHorizontal: 4,
        marginTop: 6,
    },
    formCard: {
        borderRadius: 18,
        overflow: 'hidden',
    },
    typeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
        gap: 12,
    },
    typeTextCol: {
        flex: 1,
        gap: 2,
    },
    typeTitle: {
        fontSize: 15,
        fontWeight: '500',
    },
    typeDesc: {
        fontSize: 12,
        lineHeight: 16,
    },
    formulaBox: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        gap: 10,
        justifyContent: 'center',
    },
    formulaStatic: {
        fontSize: 16,
        fontWeight: '600',
    },
    unitPickerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 9,
        borderRadius: 10,
    },
    unitPickerText: {
        fontSize: 14,
        fontWeight: '600',
    },
    factorInput: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderWidth: 1,
        borderRadius: 10,
        fontSize: 15,
        textAlign: 'center',
        minWidth: 80,
    },
    formRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    label: {
        width: 100,
        fontSize: 15,
        fontWeight: '500',
    },
    input: {
        flex: 1,
        fontSize: 15,
        textAlign: 'right',
    },
    textArea: {
        flex: 1,
        fontSize: 14,
        minHeight: 60,
        textAlignVertical: 'top',
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 16,
    },
});
