import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    Platform,
    Pressable,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { GlassView } from '@/components/ui/GlassView';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActivityTemplate } from '@/components/reports/types';

export interface ActivityDetailSheetProps {
    visible: boolean;
    activity: ActivityTemplate | null;
    onClose: () => void;
    isDark?: boolean;
    textColor?: string;
    subtextColor?: string;
}

export function ActivityDetailSheet({
    visible,
    activity,
    onClose,
    isDark = false,
    textColor = '#1C1C1E',
    subtextColor = '#8E8E93',
}: ActivityDetailSheetProps) {
    const insets = useSafeAreaInsets();
    if (!visible || !activity) return null;

    const dividerStyle = [
        styles.divider,
        { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' },
    ];

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
                                <Text style={styles.closeText}>Close</Text>
                            </TouchableOpacity>
                            <Text style={[styles.headerTitle, { color: textColor }]} numberOfLines={1}>
                                Activity Details
                            </Text>
                            <View style={{ width: 45 }} />
                        </View>

                        <ScrollView
                            style={styles.scrollArea}
                            contentContainerStyle={styles.scrollContent}
                            showsVerticalScrollIndicator={false}
                        >
                            {/* General Info */}
                            <View style={styles.block}>
                                <Text style={[styles.sectionLabel, { color: subtextColor }]}>General Info</Text>
                                <GlassView intensity={isDark ? 10 : 25} style={[styles.card, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF' }]}>
                                    <View style={styles.row}>
                                        <Text style={[styles.label, { color: textColor }]}>Activity Name</Text>
                                        <Text style={[styles.val, { color: subtextColor }]}>{activity.name}</Text>
                                    </View>
                                    <View style={dividerStyle} />
                                    <View style={styles.row}>
                                        <Text style={[styles.label, { color: textColor }]}>Default Assignee</Text>
                                        <Text style={[styles.val, { color: subtextColor }]}>{activity.defaultAssignee || 'Unassigned'}</Text>
                                    </View>
                                    <View style={dividerStyle} />
                                    <View style={styles.row}>
                                        <Text style={[styles.label, { color: textColor }]}>Frequency</Text>
                                        <Text style={[styles.val, { color: '#007AFF' }]}>{activity.frequency}</Text>
                                    </View>
                                </GlassView>
                            </View>

                            {/* Form Fields */}
                            <View style={styles.block}>
                                <Text style={[styles.sectionLabel, { color: subtextColor }]}>
                                    Form Fields ({activity.fields?.length || 0})
                                </Text>
                                <GlassView intensity={isDark ? 10 : 25} style={[styles.card, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF' }]}>
                                    {activity.fields && activity.fields.length > 0 ? (
                                        activity.fields.map((field, idx) => (
                                            <View key={field.id}>
                                                <View style={styles.fieldRow}>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={[styles.fieldLabel, { color: textColor }]}>{field.label}</Text>
                                                        <Text style={[styles.fieldSub, { color: subtextColor }]}>
                                                            Type: {field.type} {field.unit ? `(${field.unit})` : ''} {field.required ? '• Required' : '• Optional'}
                                                        </Text>
                                                    </View>
                                                </View>
                                                {idx < activity.fields.length - 1 && <View style={dividerStyle} />}
                                            </View>
                                        ))
                                    ) : (
                                        <View style={styles.row}>
                                            <Text style={[styles.val, { color: subtextColor }]}>No custom fields configured</Text>
                                        </View>
                                    )}
                                </GlassView>
                            </View>

                            {/* Requirements & Governance */}
                            <View style={styles.block}>
                                <Text style={[styles.sectionLabel, { color: subtextColor }]}>Requirements & Governance</Text>
                                <GlassView intensity={isDark ? 10 : 25} style={[styles.card, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF' }]}>
                                    <View style={styles.row}>
                                        <Text style={[styles.label, { color: textColor }]}>Mandatory Photo Proof</Text>
                                        <Text style={[styles.val, { color: subtextColor }]}>Required on fail / abnormal</Text>
                                    </View>
                                    <View style={dividerStyle} />
                                    <View style={styles.row}>
                                        <Text style={[styles.label, { color: textColor }]}>Supervisor Counter-sign</Text>
                                        <Text style={[styles.val, { color: subtextColor }]}>Enabled</Text>
                                    </View>
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
    fieldRow: {
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
