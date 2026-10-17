import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    Pressable,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { GlassView } from '@/components/ui/GlassView';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ReportType, ActivityTemplate } from '@/components/reports/types';

export const COLOR_GRADIENTS: Record<string, [string, string]> = {
    '#10B981': ['#34D399', '#059669'], // Emerald
    '#14B8A6': ['#2DD4BF', '#0F766E'], // Teal
    '#0284C7': ['#38BDF8', '#0369A1'], // Sky Blue
    '#06B6D4': ['#22D3EE', '#0891B2'], // Cyan
    '#F59E0B': ['#FBBF24', '#D97706'], // Amber
    '#6366F1': ['#818CF8', '#4338CA'], // Indigo
    '#8B5CF6': ['#A78BFA', '#6D28D9'], // Purple
    '#EC4899': ['#F472B6', '#BE185D'], // Pink
    '#F43F5E': ['#FB7185', '#E11D48'], // Rose
    '#64748B': ['#94A3B8', '#475569'], // Slate
    '#0EA5E9': ['#38BDF8', '#0284C7'], // Ocean
};

export function getTwoToneGradient(color: string, colorEnd?: string): [string, string] {
    if (color && COLOR_GRADIENTS[color]) {
        return COLOR_GRADIENTS[color];
    }
    if (colorEnd && colorEnd !== color) {
        return [color, colorEnd];
    }
    return [color || '#007AFF', colorEnd || color || '#0051A8'];
}

export interface ReportTypeDetailSheetProps {
    visible: boolean;
    reportType: ReportType | null;
    onClose: () => void;
    onSave?: (updated: ReportType) => void;
    onSelectActivity?: (activity: ActivityTemplate) => void;
    onAddActivity?: (reportTypeId: string) => void;
    isDark?: boolean;
    textColor?: string;
    subtextColor?: string;
}

export function ReportTypeDetailSheet({
    visible,
    reportType,
    onClose,
    onSave,
    onSelectActivity,
    onAddActivity,
    isDark = false,
    textColor = '#1C1C1E',
    subtextColor = '#8E8E93',
}: ReportTypeDetailSheetProps) {
    const insets = useSafeAreaInsets();
    if (!visible || !reportType) return null;

    const dividerStyle = [
        styles.divider,
        { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' },
    ];

    const prefixCode = reportType.id === 'rep_maintenance' ? 'MNT' : reportType.id === 'rep_cleaning' ? 'CLN' : 'REP';

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <Pressable style={styles.backdrop} onPress={onClose} />

                <View style={styles.sheetWrapper}>
                    <GlassView
                        intensity={isDark ? 30 : 60}
                        style={[
                            styles.sheetContainer,
                            {
                                backgroundColor: isDark ? 'rgba(28,28,30,0.92)' : 'rgba(242,242,247,0.95)',
                                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                                paddingBottom: Math.max(insets.bottom, 20),
                            },
                        ]}
                    >
                        {/* Grabber Handle */}
                        <View style={styles.handleContainer}>
                            <View style={[styles.grabber, { backgroundColor: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)' }]} />
                        </View>

                        {/* Header */}
                        <View style={styles.header}>
                            <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
                                <Text style={styles.closeText}>Done</Text>
                            </TouchableOpacity>
                            <Text style={[styles.headerTitle, { color: textColor }]} numberOfLines={1}>
                                Template Settings
                            </Text>
                            <View style={{ width: 45 }} />
                        </View>

                        <ScrollView
                            style={styles.scrollArea}
                            contentContainerStyle={styles.scrollContent}
                            showsVerticalScrollIndicator={false}
                        >
                            {/* General Template Config */}
                            <View style={styles.block}>
                                <Text style={[styles.sectionLabel, { color: subtextColor }]}>Report Type Identity</Text>
                                <GlassView intensity={isDark ? 10 : 25} style={[styles.card, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF' }]}>
                                    <View style={styles.row}>
                                        <Text style={[styles.label, { color: textColor }]}>Template Name</Text>
                                        <Text style={[styles.val, { color: textColor, fontWeight: '500' }]}>{reportType.name}</Text>
                                    </View>
                                    <View style={dividerStyle} />
                                    <View style={styles.row}>
                                        <Text style={[styles.label, { color: textColor }]}>Prefix Code</Text>
                                        <Text style={[styles.val, { color: '#007AFF', fontWeight: '600' }]}>{prefixCode}</Text>
                                    </View>
                                    <View style={dividerStyle} />
                                    <View style={styles.row}>
                                        <Text style={[styles.label, { color: textColor }]}>Category</Text>
                                        <Text style={[styles.val, { color: subtextColor }]}>{reportType.category}</Text>
                                    </View>
                                    <View style={dividerStyle} />
                                    <View style={styles.descRow}>
                                        <Text style={[styles.label, { color: textColor, marginBottom: 4 }]}>Description</Text>
                                        <Text style={[styles.descVal, { color: subtextColor }]}>
                                            {reportType.shortDescription || 'No description configured for this report template.'}
                                        </Text>
                                    </View>
                                </GlassView>
                            </View>

                            {/* Automation & Generation Defaults */}
                            <View style={styles.block}>
                                <Text style={[styles.sectionLabel, { color: subtextColor }]}>Reporting & Document Defaults</Text>
                                <GlassView intensity={isDark ? 10 : 25} style={[styles.card, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF' }]}>
                                    <View style={styles.row}>
                                        <Text style={[styles.label, { color: textColor }]}>Summary Cycle</Text>
                                        <Text style={[styles.val, { color: subtextColor }]}>Weekly</Text>
                                    </View>
                                    <View style={dividerStyle} />
                                    <View style={styles.row}>
                                        <Text style={[styles.label, { color: textColor }]}>Default Document Format</Text>
                                        <Text style={[styles.val, { color: subtextColor }]}>Standard PDF Summary</Text>
                                    </View>
                                    <View style={dividerStyle} />
                                    <View style={styles.row}>
                                        <Text style={[styles.label, { color: textColor }]}>Auto-Generate Periodic</Text>
                                        <Text style={[styles.val, { color: '#34C759' }]}>Enabled</Text>
                                    </View>
                                </GlassView>
                            </View>

                            {/* Associated Activity Templates */}
                            <View style={styles.block}>
                                <Text style={[styles.sectionLabel, { color: subtextColor }]}>
                                    Configured Activities ({reportType.activities?.length || 0})
                                </Text>
                                <GlassView intensity={isDark ? 10 : 25} style={[styles.card, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF' }]}>
                                    {reportType.activities && reportType.activities.length > 0 ? (
                                        reportType.activities.map((act, idx) => (
                                            <View key={act.id}>
                                                <TouchableOpacity
                                                    style={styles.activityRow}
                                                    activeOpacity={0.7}
                                                    onPress={() => {
                                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                        if (onSelectActivity) {
                                                            onSelectActivity(act);
                                                        }
                                                    }}
                                                >
                                                    <View style={{ flex: 1, gap: 2 }}>
                                                        <Text style={[styles.fieldLabel, { color: textColor }]}>{act.name}</Text>
                                                        <Text style={[styles.fieldSub, { color: subtextColor }]}>
                                                            {act.frequency} • {act.fields?.length || 0} fields
                                                        </Text>
                                                    </View>
                                                    <PlatformIcon
                                                        name="chevron.right"
                                                        size={14}
                                                        tintColor={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'}
                                                    />
                                                </TouchableOpacity>
                                                {idx < reportType.activities.length - 1 && <View style={dividerStyle} />}
                                            </View>
                                        ))
                                    ) : (
                                        <View style={styles.row}>
                                            <Text style={[styles.val, { color: subtextColor }]}>No activities configured yet</Text>
                                        </View>
                                    )}
                                </GlassView>
                            </View>
                        </ScrollView>
                    </GlassView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
    },
    sheetWrapper: {
        maxHeight: '85%',
        height: '85%',
    },
    sheetContainer: {
        flex: 1,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        borderWidth: 1,
        borderBottomWidth: 0,
        overflow: 'hidden',
    },
    handleContainer: {
        alignItems: 'center',
        paddingVertical: 10,
    },
    grabber: {
        width: 36,
        height: 5,
        borderRadius: 2.5,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(0,0,0,0.08)',
    },
    headerBtn: {
        paddingVertical: 4,
        paddingHorizontal: 4,
    },
    closeText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#007AFF',
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '600',
    },
    scrollArea: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        gap: 18,
    },
    block: {
        gap: 8,
    },
    sectionLabel: {
        fontSize: 13,
        fontWeight: '600',
        paddingHorizontal: 4,
        letterSpacing: -0.1,
    },
    card: {
        borderRadius: 20,
        overflow: 'hidden',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 13,
        paddingHorizontal: 16,
    },
    descRow: {
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    descVal: {
        fontSize: 14,
        lineHeight: 20,
    },
    activityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    fieldLabel: {
        fontSize: 15,
        fontWeight: '500',
    },
    fieldSub: {
        fontSize: 12,
        marginTop: 2,
    },
    label: {
        fontSize: 15,
        fontWeight: '400',
    },
    val: {
        fontSize: 14,
        fontWeight: '400',
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 16,
    },
});
