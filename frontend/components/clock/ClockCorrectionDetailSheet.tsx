import React from 'react';
import {
    StyleSheet,
    View,
    Text,
    Modal,
    TouchableOpacity,
    ScrollView,
    Share,
} from 'react-native';
import { PlatformIcon } from '../ui/PlatformIcon';
import { AttendanceCorrectionRequest, RequestStatus } from '@/lib/api/attendance';
import { format } from 'date-fns';
import { useTheme } from '@/context/ThemeContext';

interface ClockCorrectionDetailSheetProps {
    isOpened: boolean;
    onClose: () => void;
    item: AttendanceCorrectionRequest | null;
    viewMode?: 'personal' | 'team';
    onViewProof?: (url: string) => void;
    onApprove?: () => void;
    onReject?: () => void;
    onRevision?: () => void;
    isEmbedded?: boolean;
}

export const ClockCorrectionDetailSheet: React.FC<ClockCorrectionDetailSheetProps> = ({
    isOpened,
    onClose,
    item,
    viewMode = 'personal',
    onViewProof,
    onApprove,
    onReject,
    isEmbedded = false,
}) => {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';
    const cardBg = isDark ? '#1C1C1E' : '#FFFFFF';
    const rowBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
    const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

    if (!item) return null;

    const getStatusColor = (status: RequestStatus) => {
        switch (status) {
            case 'approved': return '#34C759';
            case 'rejected': return '#FF3B30';
            case 'pending': return '#FF9500';
            default: return '#8E8E93';
        }
    };

    const formatCorrectionTypeName = (type: string) => {
        switch (type) {
            case 'clock_in': return 'Clock-in Time';
            case 'clock_out': return 'Clock-out Time';
            case 'work_location': return 'Work Location';
            case 'attendance_status': return 'Attendance Status';
            default: return type;
        }
    };

    const statusColor = getStatusColor(item.status);

    const handleShare = () => {
        Share.share({
            message: `[Attendance Correction] ${item.userName || 'Employee'} - Date: ${item.attendanceDate} - ${formatCorrectionTypeName(item.correctionType)}: ${item.originalValue} -> ${item.requestedValue}`,
        });
    };

    const sheetBody = (
        <View style={isEmbedded ? { flex: 1, backgroundColor: isDark ? '#000000' : '#F2F2F7', padding: 20 } : [s.modalCard, { backgroundColor: cardBg }]}>
            {/* Header */}
            <View style={s.headerRow}>
                <View>
                    <Text style={[s.titleText, { color: textColor }]}>Attendance Correction</Text>
                    <Text style={[s.subtitleText, { color: subtextColor }]}>{item.requestNumber || 'AC-007-00000'}</Text>
                </View>
                <View style={s.headerActions}>
                    <TouchableOpacity onPress={handleShare} style={s.iconBtn}>
                        <PlatformIcon name="square.and.arrow.up" size={16} tintColor={subtextColor} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onClose} style={s.iconBtn}>
                        <PlatformIcon name="xmark" size={16} tintColor={subtextColor} />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView style={s.body} showsVerticalScrollIndicator={false}>
                {/* Status & Info Card */}
                <View style={[s.card, { backgroundColor: rowBg, borderColor }]}>
                    <View style={s.row}>
                        <Text style={[s.label, { color: subtextColor }]}>Status</Text>
                        <Text style={[s.valBold, { color: statusColor }]}>{item.status.toUpperCase()}</Text>
                    </View>
                    <View style={s.divider} />
                    <View style={s.row}>
                        <Text style={[s.label, { color: subtextColor }]}>Employee</Text>
                        <Text style={[s.val, { color: textColor }]}>{item.userName || 'Employee'}</Text>
                    </View>
                    <View style={s.divider} />
                    <View style={s.row}>
                        <Text style={[s.label, { color: subtextColor }]}>Attendance Date</Text>
                        <Text style={[s.val, { color: textColor }]}>{item.attendanceDate}</Text>
                    </View>
                    <View style={s.divider} />
                    <View style={s.row}>
                        <Text style={[s.label, { color: subtextColor }]}>Type</Text>
                        <Text style={[s.valBold, { color: '#AF52DE' }]}>{formatCorrectionTypeName(item.correctionType)}</Text>
                    </View>
                </View>

                {/* Comparison Card */}
                <Text style={[s.sectionTitle, { color: subtextColor }]}>REQUESTED CHANGES</Text>
                <View style={[s.comparisonCard, { backgroundColor: rowBg, borderColor }]}>
                    <View style={s.compCol}>
                        <Text style={[s.compLabel, { color: subtextColor }]}>BEFORE</Text>
                        <Text style={[s.compVal, { color: textColor }]}>{item.originalValue}</Text>
                    </View>
                    <Text style={[s.compArrow, { color: subtextColor }]}>➔</Text>
                    <View style={s.compCol}>
                        <Text style={[s.compLabel, { color: subtextColor }]}>AFTER</Text>
                        <Text style={[s.compVal, { color: '#34C759', fontWeight: '700' }]}>{item.requestedValue}</Text>
                    </View>
                </View>

                {/* Reason & Evidence */}
                <Text style={[s.sectionTitle, { color: subtextColor }]}>JUSTIFICATION & EVIDENCE</Text>
                <View style={[s.card, { backgroundColor: rowBg, borderColor }]}>
                    <Text style={[s.reasonText, { color: textColor }]}>{item.reason || 'No reason provided'}</Text>
                    {item.evidenceUrl && (
                        <TouchableOpacity style={s.evidenceBtn} onPress={() => onViewProof?.(item.evidenceUrl!)}>
                            <PlatformIcon name="paperclip" size={14} tintColor="#007AFF" />
                            <Text style={s.evidenceBtnText}>View Attached Photo Proof</Text>
                        </TouchableOpacity>
                    )}
                    {item.rejectReason && (
                        <View style={{ marginTop: 10 }}>
                            <Text style={{ fontSize: 12, color: '#FF3B30', fontWeight: '600' }}>REJECTION REASON</Text>
                            <Text style={[s.reasonText, { color: textColor, marginTop: 2 }]}>{item.rejectReason}</Text>
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Actions for managers pinned at the bottom */}
            {viewMode === 'team' && item.status === 'pending' && (
                <View style={s.actionRow}>
                    <TouchableOpacity style={[s.rejectBtn, { borderColor: '#FF3B30' }]} onPress={onReject}>
                        <Text style={s.rejectBtnText}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.approveBtn, { backgroundColor: '#34C759' }]} onPress={onApprove}>
                        <Text style={s.approveBtnText}>Approve & Apply</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );

    if (isEmbedded) {
        return sheetBody;
    }

    return (
        <Modal visible={isOpened} animationType="slide" transparent onRequestClose={onClose}>
            <View style={s.overlay}>
                <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={onClose} />
                {sheetBody}
            </View>
        </Modal>
    );
};

const s = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalCard: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '85%',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 36,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    titleText: {
        fontSize: 19,
        fontWeight: '700',
    },
    subtitleText: {
        fontSize: 13,
        marginTop: 2,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    iconBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(142,142,147,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    body: {
        flexShrink: 1,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 0.5,
        marginTop: 16,
        marginBottom: 8,
    },
    card: {
        borderRadius: 14,
        borderWidth: 1,
        padding: 14,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(142,142,147,0.15)',
        marginVertical: 6,
    },
    label: {
        fontSize: 14,
    },
    val: {
        fontSize: 14,
        fontWeight: '500',
    },
    valBold: {
        fontSize: 14,
        fontWeight: '700',
    },
    comparisonCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 14,
        borderWidth: 1,
        padding: 16,
    },
    compCol: {
        flex: 1,
    },
    compLabel: {
        fontSize: 11,
        fontWeight: '600',
    },
    compVal: {
        fontSize: 16,
        fontWeight: '600',
        marginTop: 4,
    },
    compArrow: {
        fontSize: 18,
        paddingHorizontal: 12,
    },
    reasonText: {
        fontSize: 14,
        lineHeight: 20,
    },
    evidenceBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 10,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: 'rgba(142,142,147,0.15)',
    },
    evidenceBtnText: {
        color: '#007AFF',
        fontSize: 14,
        fontWeight: '600',
    },
    actionRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 20,
        marginBottom: 10,
    },
    rejectBtn: {
        flex: 1,
        height: 48,
        borderRadius: 999,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rejectBtnText: {
        color: '#FF3B30',
        fontSize: 15,
        fontWeight: '600',
    },
    approveBtn: {
        flex: 1,
        height: 48,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
    },
    approveBtnText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
    },
});
