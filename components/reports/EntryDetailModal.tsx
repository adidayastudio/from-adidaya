import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Image } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { ReportEntry } from './types';

interface EntryDetailModalProps {
    visible: boolean;
    entry: ReportEntry | null;
    onClose: () => void;
    onOpenRelatedTask?: (taskId?: string) => void;
    isEmbedded?: boolean;
}

export function EntryDetailModal({
    visible,
    entry,
    onClose,
    onOpenRelatedTask,
    isEmbedded = false,
}: EntryDetailModalProps) {
    const insets = useSafeAreaInsets();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';
    const cardBg = isDark ? 'rgba(28, 28, 30, 0.75)' : '#FFFFFF';
    const borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)';

    if (!entry) return null;

    const content = (
        <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}>
            {/* Header */}
            <View style={[styles.modalHeader, { paddingTop: isEmbedded ? 16 : (Platform.OS === 'ios' ? 16 : insets.top + 10) }]}>
                <View style={styles.headerLeft}>
                    <Text style={[styles.headerTitle, { color: textColor }]}>Record Entry</Text>
                    <Text style={[styles.headerSub, { color: subtextColor }]}>{entry.reportTypeName}</Text>
                </View>

                {!isEmbedded && (
                    <TouchableOpacity 
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            onClose();
                        }}
                        style={[styles.closeButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]}
                    >
                        <Ionicons name="close" size={20} color={textColor} />
                    </TouchableOpacity>
                )}
            </View>

            <ScrollView 
                style={styles.scrollView}
                contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 40 }]}
                showsVerticalScrollIndicator={false}
            >
                {/* Top Summary Card */}
                <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                    <View style={styles.topInfoRow}>
                        <View style={{ flex: 1, gap: 4 }}>
                            <Text style={[styles.activityName, { color: textColor }]}>{entry.activityName}</Text>
                            <Text style={[styles.timestamp, { color: subtextColor }]}>Submitted {entry.submittedAt}</Text>
                        </View>

                        <View style={[
                            styles.conditionBadge,
                            entry.condition === 'Normal' ? styles.condNormal : styles.condAttention
                        ]}>
                            <Text style={[
                                styles.conditionText,
                                entry.condition === 'Normal' ? { color: '#10B981' } : { color: '#F59E0B' }
                            ]}>
                                {entry.condition}
                            </Text>
                        </View>
                    </View>

                    <View style={[styles.divider, { backgroundColor: borderColor }]} />

                    {/* Submitter details */}
                    <View style={styles.submitterRow}>
                        <View style={[styles.avatarBox, { backgroundColor: isDark ? '#27272A' : '#E2E8F0' }]}>
                            <Ionicons name="person" size={16} color={textColor} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.submitterName, { color: textColor }]}>{entry.submittedBy.name}</Text>
                            <Text style={[styles.submitterRole, { color: subtextColor }]}>{entry.submittedBy.role}</Text>
                        </View>
                    </View>
                </View>

                {/* Submitted Values */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: textColor }]}>Submitted Data Values</Text>
                    <View style={[styles.card, { backgroundColor: cardBg, borderColor, padding: 0 }]}>
                        {Object.entries(entry.values).map(([key, val], idx, arr) => (
                            <View key={key}>
                                <View style={styles.valueRow}>
                                    <Text style={[styles.fieldLabel, { color: subtextColor }]}>{key}</Text>
                                    <Text style={[styles.fieldValue, { color: textColor }]}>{String(val)}</Text>
                                </View>
                                {idx < arr.length - 1 && <View style={[styles.divider, { backgroundColor: borderColor }]} />}
                            </View>
                        ))}
                    </View>
                </View>

                {/* Notes */}
                {entry.notes && (
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Technician / Staff Notes</Text>
                        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                            <Text style={[styles.notesText, { color: textColor }]}>{entry.notes}</Text>
                        </View>
                    </View>
                )}

                {/* Related Task Link */}
                {entry.relatedTaskId && (
                    <TouchableOpacity
                        style={[styles.taskLinkCard, { backgroundColor: isDark ? 'rgba(20, 184, 166, 0.15)' : 'rgba(20, 184, 166, 0.08)', borderColor: '#14B8A640' }]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            onOpenRelatedTask?.(entry.relatedTaskId);
                        }}
                    >
                        <Ionicons name="checkbox-outline" size={20} color="#14B8A6" />
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.taskLinkTitle, { color: textColor }]}>Linked to Task #{entry.relatedTaskId}</Text>
                            <Text style={[styles.taskLinkSub, { color: subtextColor }]}>Generated from recurring operational schedule</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#14B8A6" />
                    </TouchableOpacity>
                )}
            </ScrollView>
        </View>
    );

    if (isEmbedded) {
        return content;
    }

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            {content}
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
        gap: 18,
    },
    card: {
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        gap: 12,
    },
    topInfoRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 8,
    },
    activityName: {
        fontSize: 17,
        fontWeight: '700',
    },
    timestamp: {
        fontSize: 12,
    },
    conditionBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 99,
    },
    condNormal: {
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
    },
    condAttention: {
        backgroundColor: 'rgba(245, 158, 11, 0.12)',
    },
    conditionText: {
        fontSize: 12,
        fontWeight: '700',
    },
    divider: {
        height: 1,
    },
    submitterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    avatarBox: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitterName: {
        fontSize: 14,
        fontWeight: '600',
    },
    submitterRole: {
        fontSize: 12,
    },
    section: {
        gap: 8,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '700',
        paddingHorizontal: 2,
    },
    valueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    fieldLabel: {
        fontSize: 13,
        fontWeight: '500',
    },
    fieldValue: {
        fontSize: 14,
        fontWeight: '700',
    },
    notesText: {
        fontSize: 14,
        lineHeight: 20,
    },
    taskLinkCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 16,
        borderWidth: 1,
        gap: 12,
    },
    taskLinkTitle: {
        fontSize: 14,
        fontWeight: '700',
    },
    taskLinkSub: {
        fontSize: 12,
        marginTop: 2,
    },
});
