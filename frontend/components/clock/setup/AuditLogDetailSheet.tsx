import React from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TouchableWithoutFeedback,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import * as Haptics from 'expo-haptics';

export interface AuditLogItem {
    id: string;
    actor: string;
    actorRole?: string;
    actorAvatarUrl?: string;
    action: string;
    detail: string;
    time: string;
    category:
        | 'Setup Changes'
        | 'Requests & Approvals'
        | 'Attendance Corrections'
        | 'Security / Access'
        | 'Setup'
        | 'Employment'
        | 'Profile'
        | 'Lifecycle'
        | 'Performance'
        | 'Employment & Job'
        | 'Employee & Profile'
        | 'Directory & Lifecycle'
        | 'Performance & Growth'
        | 'Payments & Disbursements'
        | 'Bank & Funding'
        | 'Documents & Rules';
    icon: string;
    iconColor: string;
    relatedEmployee?: string;
    oldValue?: string;
    newValue?: string;
    targetModule?: string;
    ipAddress?: string;
    timestampIso?: string;
}

export const AUDIT_CATEGORY_COLORS: Record<string, string> = {
    'Setup Changes': '#007AFF',
    'Requests & Approvals': '#34C759',
    'Attendance Corrections': '#AF52DE',
    'Security / Access': '#FF9500',
    'Setup': '#007AFF',
    'Employment': '#34C759',
    'Profile': '#FF9500',
    'Lifecycle': '#30B0C7',
    'Performance': '#AF52DE',
    'Employment & Job': '#34C759',
    'Employee & Profile': '#FF9500',
    'Directory & Lifecycle': '#30B0C7',
    'Performance & Growth': '#AF52DE',
    'Payments & Disbursements': '#FF9500',
    'Bank & Funding': '#5856D6',
    'Documents & Rules': '#AF52DE',
};

export function getAuditCategoryColor(category: string): string {
    return AUDIT_CATEGORY_COLORS[category] || '#007AFF';
}

export function getAuditCategoryShortLabel(category: string): string {
    switch (category) {
        case 'Setup Changes':
        case 'Setup':
            return 'Setup';
        case 'Requests & Approvals':
            return 'Request';
        case 'Attendance Corrections':
            return 'Correction';
        case 'Security / Access':
            return 'Security';
        case 'Employment & Job':
        case 'Employment':
            return 'Employment';
        case 'Employee & Profile':
        case 'Profile':
            return 'Profile';
        case 'Directory & Lifecycle':
        case 'Lifecycle':
            return 'Lifecycle';
        case 'Performance & Growth':
        case 'Performance':
            return 'Performance';
        default:
            return category;
    }
}

export interface AuditLogDetailSheetProps {
    visible: boolean;
    onClose: () => void;
    item: AuditLogItem | null;
}

export function AuditLogDetailSheet({ visible, onClose, item }: AuditLogDetailSheetProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';

    if (!item) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={s.overlay}>
                    <TouchableWithoutFeedback>
                        <View
                            style={[
                                s.sheetContainer,
                                {
                                    backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                                },
                            ]}
                        >
                            {/* Handle Bar */}
                            <View style={s.handleBar} />

                            {/* Header */}
                            <View style={s.headerRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={[s.sheetTitle, { color: textColor }]}>
                                        Audit Trail Record
                                    </Text>
                                    <Text style={[s.sheetSubtitle, { color: subtextColor }]}>
                                        Immutable System Event Log
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        onClose();
                                    }}
                                    style={[
                                        s.closeButton,
                                        { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' },
                                    ]}
                                >
                                    <PlatformIcon name="xmark" size={14} tintColor={subtextColor} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                                {/* Event Card */}
                                <View
                                    style={[
                                        s.sectionCard,
                                        {
                                            backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8F9FA',
                                            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                                        },
                                    ]}
                                >
                                    <View style={s.row}>
                                        <Text style={[s.label, { color: subtextColor }]}>Action</Text>
                                        <Text style={[s.value, { color: textColor, fontWeight: '700' }]}>
                                            {item.action}
                                        </Text>
                                    </View>
                                    <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

                                    <View style={s.row}>
                                        <Text style={[s.label, { color: subtextColor }]}>Actor</Text>
                                        <Text style={[s.value, { color: textColor }]}>
                                            {item.actor} {item.actorRole ? `(${item.actorRole})` : ''}
                                        </Text>
                                    </View>
                                    <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

                                    <View style={s.row}>
                                        <Text style={[s.label, { color: subtextColor }]}>Category</Text>
                                        <View style={[s.pill, { backgroundColor: `${getAuditCategoryColor(item.category)}18` }]}>
                                            <Text style={[s.pillText, { color: getAuditCategoryColor(item.category) }]}>
                                                {item.category}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

                                    <View style={s.row}>
                                        <Text style={[s.label, { color: subtextColor }]}>Timestamp</Text>
                                        <Text style={[s.value, { color: textColor }]}>{item.time}</Text>
                                    </View>
                                </View>

                                {/* Change Detail Card */}
                                <Text style={[s.sectionHeader, { color: subtextColor }]}>
                                    Change Specification
                                </Text>
                                <View
                                    style={[
                                        s.sectionCard,
                                        {
                                            backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8F9FA',
                                            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                                        },
                                    ]}
                                >
                                    <Text style={[s.detailText, { color: textColor }]}>
                                        {item.detail}
                                    </Text>
                                </View>

                                {/* Integrity Card */}
                                <View
                                    style={[
                                        s.integrityCard,
                                        {
                                            backgroundColor: isDark ? 'rgba(52, 199, 89, 0.1)' : 'rgba(52, 199, 89, 0.08)',
                                            borderColor: isDark ? 'rgba(52, 199, 89, 0.25)' : 'rgba(52, 199, 89, 0.2)',
                                        },
                                    ]}
                                >
                                    <PlatformIcon name="checkmark.shield.fill" size={16} tintColor="#34C759" />
                                    <View style={{ flex: 1, gap: 2 }}>
                                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#34C759' }}>
                                            Cryptographically Preserved
                                        </Text>
                                        <Text style={{ fontSize: 12, color: subtextColor, lineHeight: 16 }}>
                                            Record ID: {item.id} · Immutable audit log protected under Privacy & Retention policies.
                                        </Text>
                                    </View>
                                </View>
                            </ScrollView>

                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    onClose();
                                }}
                                style={s.doneButton}
                            >
                                <Text style={s.doneButtonText}>Done</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

const s = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    sheetContainer: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderWidth: 1,
        borderBottomWidth: 0,
        padding: 20,
        paddingBottom: 36,
        gap: 16,
    },
    handleBar: {
        width: 36,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: 'rgba(128,128,128,0.4)',
        alignSelf: 'center',
        marginBottom: 4,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    sheetTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    sheetSubtitle: {
        fontSize: 13,
        marginTop: 2,
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionHeader: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.5,
        marginTop: 8,
        marginBottom: 6,
    },
    sectionCard: {
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        gap: 10,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    label: {
        fontSize: 13,
        fontWeight: '500',
    },
    value: {
        fontSize: 13,
        textAlign: 'right',
        flexShrink: 1,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
    },
    pill: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    pillText: {
        fontSize: 12,
        fontWeight: '600',
    },
    detailText: {
        fontSize: 14,
        fontWeight: '600',
        lineHeight: 20,
    },
    integrityCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
        marginTop: 14,
    },
    doneButton: {
        backgroundColor: '#007AFF',
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 6,
    },
    doneButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});
