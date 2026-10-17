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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { GlassView } from '@/components/ui/GlassView';

export interface ReportCategoriesGuideSheetProps {
    visible: boolean;
    onClose: () => void;
}

export function ReportCategoriesGuideSheet({
    visible,
    onClose,
}: ReportCategoriesGuideSheetProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';
    const insets = useSafeAreaInsets();

    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <Pressable style={styles.backdrop} onPress={onClose} />
                <View style={[styles.sheetContainer, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7', paddingBottom: Math.max(insets.bottom, 20) }]}>
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: textColor }]}>About Report Categories</Text>
                        <TouchableOpacity
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                onClose();
                            }}
                        >
                            <Text style={styles.doneBtn}>Done</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: subtextColor }]}>CLASSIFICATION STRUCTURE</Text>
                            <GlassView intensity={isDark ? 15 : 40} style={[styles.card, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF' }]}>
                                <View style={styles.itemBlock}>
                                    <Text style={[styles.itemTitle, { color: textColor }]}>What is a Report Category?</Text>
                                    <Text style={[styles.itemText, { color: subtextColor }]}>
                                        Groups related operational work into a reusable structure, such as Facility & Operations, Housekeeping, Security, or Maintenance.
                                    </Text>
                                </View>
                                <View style={[styles.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]} />
                                <View style={styles.itemBlock}>
                                    <Text style={[styles.itemTitle, { color: textColor }]}>Relationship to Report Types</Text>
                                    <Text style={[styles.itemText, { color: subtextColor }]}>
                                        Each category can contain one or more Report Types used to define what operational reports can be created.
                                    </Text>
                                </View>
                                <View style={[styles.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]} />
                                <View style={styles.itemBlock}>
                                    <Text style={[styles.itemTitle, { color: textColor }]}>Relationship to Activities</Text>
                                    <Text style={[styles.itemText, { color: subtextColor }]}>
                                        Activities represent the actual work or inspection items performed under the category and can be used as report inputs.
                                    </Text>
                                </View>
                            </GlassView>
                        </View>

                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: subtextColor }]}>STRUCTURE & HIERARCHY</Text>
                            <GlassView intensity={isDark ? 15 : 40} style={[styles.card, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF' }]}>
                                <View style={styles.itemBlock}>
                                    <Text style={[styles.itemTitle, { color: textColor }]}>Hierarchy Flow</Text>
                                    <Text style={[styles.itemText, { color: '#007AFF', fontWeight: '500' }]}>Category → Report Type → Activity</Text>
                                </View>
                                <View style={[styles.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]} />
                                <View style={styles.itemBlock}>
                                    <Text style={[styles.itemTitle, { color: textColor }]}>Usage & Impact</Text>
                                    <Text style={[styles.itemText, { color: subtextColor }]}>
                                        Changes to this structure affect future report creation and available operational classifications. Existing generated reports retain their recorded data.
                                    </Text>
                                </View>
                            </GlassView>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    sheetContainer: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '85%',
        paddingTop: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 16,
    },
    title: {
        fontSize: 17,
        fontWeight: '700',
    },
    doneBtn: {
        fontSize: 16,
        fontWeight: '600',
        color: '#007AFF',
    },
    content: {
        paddingHorizontal: 16,
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 0.5,
        marginBottom: 8,
        marginLeft: 12,
    },
    card: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    itemBlock: {
        padding: 14,
        gap: 4,
    },
    itemTitle: {
        fontSize: 15,
        fontWeight: '600',
    },
    itemText: {
        fontSize: 13,
        lineHeight: 18,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 14,
    },
});
