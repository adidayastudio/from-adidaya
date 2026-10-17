import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/theme';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { REPORT_PRESETS_LIBRARY } from './mockData';
import { ReportPreset } from './types';

interface CreateReportModalProps {
    visible: boolean;
    onClose: () => void;
    onSelectPreset: (preset: ReportPreset) => void;
    onStartBlank: () => void;
}

export function CreateReportModal({
    visible,
    onClose,
    onSelectPreset,
    onStartBlank,
}: CreateReportModalProps) {
    const insets = useSafeAreaInsets();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';
    const cardBg = isDark ? 'rgba(28, 28, 30, 0.75)' : '#FFFFFF';
    const borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)';

    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    const categories = ['all', 'Facility & Operations', 'General', 'Construction'];

    const filteredPresets = REPORT_PRESETS_LIBRARY.filter(p => {
        if (selectedCategory === 'all') return true;
        return p.category === selectedCategory;
    });

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}>
                {/* Header */}
                <View style={[styles.modalHeader, { paddingTop: Platform.OS === 'ios' ? 16 : insets.top + 10 }]}>
                    <View style={styles.headerLeft}>
                        <Text style={[styles.headerTitle, { color: textColor }]}>Create Report Type</Text>
                        <Text style={[styles.headerSub, { color: subtextColor }]}>Forma Template Library</Text>
                    </View>

                    <TouchableOpacity 
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            onClose();
                        }}
                        style={[styles.closeButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]}
                    >
                        <Ionicons name="close" size={20} color={textColor} />
                    </TouchableOpacity>
                </View>

                <ScrollView 
                    style={styles.scrollView}
                    contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 40 }]}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Start Blank Option */}
                    <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            onStartBlank();
                        }}
                        style={[styles.startBlankCard, { backgroundColor: cardBg, borderColor }]}
                    >
                        <View style={[styles.blankIconWrapper, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                            <Ionicons name="add-circle-outline" size={28} color="#14B8A6" />
                        </View>
                        <View style={{ flex: 1, gap: 2 }}>
                            <Text style={[styles.blankTitle, { color: textColor }]}>Start Blank Report</Text>
                            <Text style={[styles.blankSub, { color: subtextColor }]}>
                                Define custom activities, form structures, and schedule rules from scratch
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={subtextColor} />
                    </TouchableOpacity>

                    {/* Presets Header & Category Filter */}
                    <View style={styles.presetsHeader}>
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Or Start from Preset</Text>
                        <Text style={[styles.presetsExplainer, { color: subtextColor }]}>
                            Presets clone into independent tenant-owned Report Types
                        </Text>
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
                        {categories.map((cat) => {
                            const isActive = selectedCategory === cat;
                            return (
                                <TouchableOpacity
                                    key={cat}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setSelectedCategory(cat);
                                    }}
                                    style={[
                                        styles.catChip,
                                        {
                                            backgroundColor: isActive 
                                                ? (isDark ? 'rgba(20, 184, 166, 0.2)' : 'rgba(20, 184, 166, 0.12)')
                                                : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
                                            borderColor: isActive ? '#14B8A6' : 'transparent',
                                        }
                                    ]}
                                >
                                    <Text style={[
                                        styles.catChipText,
                                        { color: isActive ? '#14B8A6' : subtextColor, fontWeight: isActive ? '700' : '500' }
                                    ]}>
                                        {cat === 'all' ? 'All Categories' : cat}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    {/* Presets List */}
                    <View style={styles.presetsList}>
                        {filteredPresets.map((preset) => (
                            <TouchableOpacity
                                key={preset.id}
                                activeOpacity={0.82}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                    onSelectPreset(preset);
                                }}
                                style={[styles.presetCard, { backgroundColor: cardBg, borderColor }]}
                            >
                                <View style={styles.presetTop}>
                                    <LinearGradient
                                        colors={[preset.color, preset.colorEnd]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={styles.presetIconBox}
                                    >
                                        <PlatformIcon name={preset.icon as any} size={22} tintColor="#FFFFFF" />
                                    </LinearGradient>

                                    <View style={{ flex: 1, gap: 2 }}>
                                        <View style={styles.presetTitleRow}>
                                            <Text style={[styles.presetName, { color: textColor }]}>{preset.name}</Text>
                                            <View style={[styles.catBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}>
                                                <Text style={[styles.catBadgeText, { color: subtextColor }]}>{preset.category}</Text>
                                            </View>
                                        </View>
                                        <Text style={[styles.presetDesc, { color: subtextColor }]} numberOfLines={2}>
                                            {preset.description}
                                        </Text>
                                    </View>
                                </View>

                                {/* Sample activities preview */}
                                <View style={[styles.samplesBox, { backgroundColor: isDark ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.02)' }]}>
                                    <Text style={[styles.samplesLabel, { color: subtextColor }]}>Includes {preset.activitiesCount} activities:</Text>
                                    <View style={styles.samplesChips}>
                                        {preset.sampleActivities.map((sa, i) => (
                                            <View key={i} style={[styles.sampleChip, { borderColor }]}>
                                                <Text style={[styles.sampleChipText, { color: subtextColor }]} numberOfLines={1}>
                                                    {sa}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>

                                <View style={styles.presetFooter}>
                                    <Text style={[styles.recFreq, { color: subtextColor }]}>
                                        Frequency: <Text style={{ color: preset.color, fontWeight: '600' }}>{preset.recommendedFrequency}</Text>
                                    </Text>
                                    <View style={[styles.usePresetBtn, { backgroundColor: `${preset.color}15` }]}>
                                        <Text style={[styles.usePresetText, { color: preset.color }]}>Use Preset</Text>
                                        <Ionicons name="arrow-forward" size={12} color={preset.color} />
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                </ScrollView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(150, 150, 150, 0.2)',
    },
    headerLeft: {
        gap: 2,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
    },
    headerSub: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollView: {
        flex: 1,
    },
    contentContainer: {
        padding: 16,
        gap: 16,
    },
    startBlankCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        gap: 14,
    },
    blankIconWrapper: {
        width: 48,
        height: 48,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    blankTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    blankSub: {
        fontSize: 12,
        lineHeight: 16,
    },
    presetsHeader: {
        gap: 2,
        marginTop: 4,
        paddingHorizontal: 2,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    presetsExplainer: {
        fontSize: 12,
    },
    categoryScroll: {
        gap: 8,
        paddingRight: 16,
    },
    catChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 99,
        borderWidth: 1,
    },
    catChipText: {
        fontSize: 12,
    },
    presetsList: {
        gap: 12,
    },
    presetCard: {
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        gap: 12,
    },
    presetTop: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    presetIconBox: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    presetTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    presetName: {
        fontSize: 16,
        fontWeight: '700',
    },
    catBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    catBadgeText: {
        fontSize: 10,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    presetDesc: {
        fontSize: 12,
        lineHeight: 16,
    },
    samplesBox: {
        padding: 10,
        borderRadius: 10,
        gap: 6,
    },
    samplesLabel: {
        fontSize: 11,
        fontWeight: '600',
    },
    samplesChips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    sampleChip: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1,
    },
    sampleChipText: {
        fontSize: 11,
    },
    presetFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 2,
    },
    recFreq: {
        fontSize: 11,
    },
    usePresetBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 99,
    },
    usePresetText: {
        fontSize: 12,
        fontWeight: '700',
    },
});
