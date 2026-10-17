import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Platform, Pressable } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

interface SwiftUIReportActionsSheetProps {
    visible: boolean;
    onClose: () => void;
    onGenerateReport: () => void;
    onAddScheduledRoutine: () => void;
    onOpenPresetsLibrary: () => void;
    onConfigureForms: () => void;
}

export function SwiftUIReportActionsSheet({
    visible,
    onClose,
    onGenerateReport,
    onAddScheduledRoutine,
    onOpenPresetsLibrary,
    onConfigureForms,
}: SwiftUIReportActionsSheetProps) {
    const insets = useSafeAreaInsets();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';
    const cardBg = isDark ? '#1C1C1E' : '#FFFFFF';
    const borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)';
    const dividerColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)';

    if (!visible) return null;

    const actionItems = [
        {
            id: 'gen_doc',
            title: 'Generate Document Report',
            sub: 'Compile weekly or monthly PDF/Excel from completed entries',
            icon: 'doc.text.fill',
            color: '#14B8A6',
            action: onGenerateReport,
        },
        {
            id: 'add_sched',
            title: 'Schedule Recurring Activity',
            sub: 'Create daily, weekly, or periodic maintenance & inspection rule',
            icon: 'clock.badge.checkmark.fill',
            color: '#0284C7',
            action: onAddScheduledRoutine,
        },
        {
            id: 'presets',
            title: 'Template Presets Library',
            sub: 'Explore pre-configured operational structures and checklists',
            icon: 'square.grid.2x2.fill',
            color: '#8B5CF6',
            action: onOpenPresetsLibrary,
        },
        {
            id: 'forms',
            title: 'Form Fields & Checklist Setup',
            sub: 'Customize unit readings, status conditions & audit rules',
            icon: 'slider.horizontal.3',
            color: '#EC4899',
            action: onConfigureForms,
        },
    ];

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable 
                style={styles.backdrop} 
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onClose();
                }}
            >
                <View 
                    style={[
                        styles.sheetContainer, 
                        { 
                            backgroundColor: cardBg, 
                            borderColor,
                            paddingBottom: insets.bottom + 16,
                        }
                    ]}
                >
                    {/* Grabber handle */}
                    <View style={styles.handleContainer}>
                        <View style={[styles.grabber, { backgroundColor: isDark ? '#3A3A3C' : '#D1D1D6' }]} />
                    </View>

                    <View style={styles.sheetHeader}>
                        <Text style={[styles.sheetTitle, { color: textColor }]}>Report Actions</Text>
                        <Text style={[styles.sheetSubtitle, { color: subtextColor }]}>Forma Reporting Operations</Text>
                    </View>

                    <View style={styles.actionList}>
                        {actionItems.map((item, idx) => (
                            <View key={item.id}>
                                <TouchableOpacity
                                    activeOpacity={0.7}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        onClose();
                                        item.action();
                                    }}
                                    style={styles.actionRow}
                                >
                                    <View style={[styles.iconBox, { backgroundColor: `${item.color}18` }]}>
                                        <PlatformIcon name={item.icon as any} size={20} tintColor={item.color} />
                                    </View>
                                    <View style={{ flex: 1, gap: 2 }}>
                                        <Text style={[styles.actionTitle, { color: textColor }]}>{item.title}</Text>
                                        <Text style={[styles.actionSub, { color: subtextColor }]}>{item.sub}</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={16} color={subtextColor} />
                                </TouchableOpacity>
                                {idx < actionItems.length - 1 && <View style={[styles.divider, { backgroundColor: dividerColor }]} />}
                            </View>
                        ))}
                    </View>
                </View>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        justifyContent: 'flex-end',
    },
    sheetContainer: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 16,
        paddingTop: 8,
        borderTopWidth: 1,
        gap: 12,
    },
    handleContainer: {
        alignItems: 'center',
        paddingVertical: 6,
    },
    grabber: {
        width: 36,
        height: 5,
        borderRadius: 2.5,
    },
    sheetHeader: {
        paddingHorizontal: 6,
        gap: 2,
    },
    sheetTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    sheetSubtitle: {
        fontSize: 12,
    },
    actionList: {
        borderRadius: 18,
        overflow: 'hidden',
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 6,
        gap: 12,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionTitle: {
        fontSize: 15,
        fontWeight: '600',
    },
    actionSub: {
        fontSize: 12,
        lineHeight: 16,
    },
    divider: {
        height: 1,
        marginLeft: 52,
    },
});
