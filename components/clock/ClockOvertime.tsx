import { DESKTOP_LIST_PANE } from '@/constants/desktopLayout';
import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image, Modal, Alert, Platform, useWindowDimensions } from 'react-native';
import { useUserContext } from '@/context/UserProvider';
import { fetchAllRequestsAndRank, updateOvertimeLog, OvertimeLog, RequestStatus } from '@/lib/api/attendance';
import { OvertimeModal } from './OvertimeModal';
import { ClockOvertimeDetailSheet } from './ClockOvertimeDetailSheet';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';

interface ClockOvertimeProps {
    viewMode: 'personal' | 'team';
    isRequestModalVisible?: boolean;
    onRequestClose?: () => void;
    currentMonth: Date;
    searchQuery?: string;
    selectedMember?: string;
    hideEmptyState?: boolean;
    onCountChange?: (count: number) => void;
    selectedDetailId?: string | null;
    onSelectDetail?: (log: OvertimeLog | null) => void;
}

export function ClockOvertime({ 
    viewMode, 
    isRequestModalVisible, 
    onRequestClose, 
    currentMonth, 
    searchQuery, 
    selectedMember, 
    hideEmptyState, 
    onCountChange,
    selectedDetailId,
    onSelectDetail,
}: ClockOvertimeProps) {
    const { user } = useUserContext();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';
    const borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';

    const { width } = useWindowDimensions();
    const isDesktopWeb = Platform.OS === 'web' && width >= 768;

    const [logs, setLogs] = useState<OvertimeLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
    const [selectedDetail, setSelectedDetail] = useState<OvertimeLog | null>(null);

    const filteredLogs = useMemo(() => {
        const selectedMonthStr = format(currentMonth, 'yyyy-MM');
        return logs.filter(log => {
            try {
                const matchesMonth = log.date.startsWith(selectedMonthStr);
                const matchesMember = !selectedMember || (log.userName || '').toLowerCase() === selectedMember.toLowerCase();
                const q = (searchQuery || '').trim().toLowerCase();
                const matchesQuery = !q || (
                    (log.userName || '').toLowerCase().includes(q) ||
                    (log.description || '').toLowerCase().includes(q)
                );
                return matchesMonth && matchesMember && matchesQuery;
            } catch {
                return false;
            }
        });
    }, [logs, currentMonth, selectedMember, searchQuery]);

    useEffect(() => {
        if (onCountChange) {
            onCountChange(filteredLogs.length);
        }
    }, [filteredLogs.length, onCountChange]);

    const loadLogs = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const targetUserId = viewMode === 'personal' ? user.id : undefined;
            const { overtimes } = await fetchAllRequestsAndRank(targetUserId);
            setLogs(overtimes);
        } catch (error) {
            console.error('Error loading overtime logs:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadLogs();
    }, [user, viewMode]);

    const handleCancelLog = (id: string) => {
        Alert.alert(
            'Cancel Overtime Log',
            'Are you sure you want to cancel this overtime submission?',
            [
                { text: 'No', style: 'cancel' },
                {
                    text: 'Yes, Cancel',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await updateOvertimeLog(id, { status: 'cancelled' });
                            Alert.alert('Success', 'Overtime log cancelled.');
                            loadLogs();
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to cancel log.');
                        }
                    }
                }
            ]
        );
    };

    const getStatusBadgeConfig = (status: RequestStatus) => {
        switch (status) {
            case 'approved':
                return { label: 'Approved', bg: 'rgba(52, 199, 89, 0.15)', text: '#34C759', icon: 'checkmark-circle' };
            case 'rejected':
                return { label: 'Rejected', bg: 'rgba(255, 59, 48, 0.15)', text: '#FF3B30', icon: 'close-circle' };
            case 'pending':
                return { label: 'Pending', bg: 'rgba(255, 149, 0, 0.15)', text: '#FF9500', icon: 'time' };
            case 'cancelled':
                return { label: 'Cancelled', bg: 'rgba(142, 142, 147, 0.15)', text: '#8E8E93', icon: 'ban' };
            case 'revision':
            case 'need revision':
                return { label: 'Revision', bg: 'rgba(255, 149, 0, 0.15)', text: '#FF9500', icon: 'arrow-undo' };
            default:
                return { label: status, bg: 'rgba(142, 142, 147, 0.15)', text: '#8E8E93', icon: 'help-circle' };
        }
    };

    const formatLogDate = (dateStr: string) => {
        try {
            return format(new Date(dateStr), 'dd MMM yyyy');
        } catch {
            return dateStr;
        }
    };

    const calculateDuration = (start: string, end: string) => {
        try {
            const [sh, sm] = start.split(':').map(Number);
            const [eh, em] = end.split(':').map(Number);
            let diff = (eh * 60 + em) - (sh * 60 + sm);
            if (diff < 0) diff += 24 * 60;
            const h = Math.floor(diff / 60);
            const m = diff % 60;
            return `${h}h ${m}m`;
        } catch {
            return '';
        }
    };

    const renderListContent = () => {
        if (loading && filteredLogs.length === 0) {
            return (
                <View style={s.loader}>
                    <ActivityIndicator size="large" color="#007AFF" />
                </View>
            );
        }
        if (filteredLogs.length === 0) {
            return hideEmptyState ? null : (
                <View style={s.empty}>
                    <View style={[s.emptyIconContainer, { backgroundColor: isDark ? 'rgba(255, 149, 0, 0.12)' : 'rgba(255, 149, 0, 0.08)' }]}>
                        <Ionicons name="time-outline" size={40} color="#FF9500" />
                    </View>
                    <Text style={[s.emptyTitle, { color: textColor }]}>No Overtime Logs</Text>
                    <Text style={[s.emptyText, { color: subtextColor }]}>No overtime work has been logged for this month.</Text>
                </View>
            );
        }
        return (
            <View style={[s.list, isDesktopWeb && { paddingHorizontal: 0 }]}>
                {filteredLogs.map(log => {
                    const badge = getStatusBadgeConfig(log.status);
                    const durationStr = calculateDuration(log.startTime, log.endTime);
                    const isSelected = selectedDetailId ? selectedDetailId === log.id : selectedDetail?.id === log.id;

                    return (
                        <View 
                            key={log.id}
                            style={[
                                s.activityCard, 
                                { 
                                    backgroundColor: isSelected ? (isDark ? 'rgba(0, 122, 255, 0.12)' : 'rgba(0, 122, 255, 0.06)') : (isDark ? '#1C1C1E' : '#FFF'),
                                    borderColor: isSelected ? '#007AFF' : (isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)'),
                                    borderWidth: isSelected ? 1.5 : 1 
                                }
                            ]}
                        >
                            <TouchableOpacity 
                                activeOpacity={0.7} 
                                onPress={() => {
                                    if (isDesktopWeb && onSelectDetail) {
                                        onSelectDetail(log);
                                    } else {
                                        setSelectedDetail(log);
                                    }
                                }}
                                style={s.activityTouchable}
                            >
                                <View style={s.itemRow}>
                                    <View style={s.itemLeftCol}>
                                        <Text style={[s.itemTitle, { color: textColor }]} numberOfLines={1}>
                                            {viewMode === 'team' && log.userName ? `${log.userName} - ` : ''}Overtime
                                        </Text>
                                        <View style={s.itemMetaRow}>
                                            <View style={s.projectBadge}>
                                                <Text style={s.projectBadgeText}>{log.requestNumber || 'OVERTIME'}</Text>
                                            </View>
                                            <Text style={s.itemMetaText} numberOfLines={1}>
                                                {formatLogDate(log.date)}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={s.itemRightCol}>
                                        <Text style={[s.itemAmount, { color: textColor }]}>{durationStr}</Text>
                                        <Text style={[s.itemStatus, { color: badge.text }]}>{badge.label.toUpperCase()}</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        </View>
                    );
                })}
            </View>
        );
    };

    return (
        <View style={s.container}>
            {renderListContent()}

            {/* Overtime Form Modal */}
            <OvertimeModal
                visible={isRequestModalVisible || false}
                onClose={() => onRequestClose?.()}
                onSuccess={loadLogs}
            />

            {/* Photo Preview Modal */}
            <Modal visible={!!previewPhoto} transparent={true} animationType="fade" onRequestClose={() => setPreviewPhoto(null)}>
                <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setPreviewPhoto(null)}>
                    <View style={s.modalContent}>
                        {previewPhoto && (
                            <Image source={{ uri: previewPhoto }} style={s.previewImage} resizeMode="contain" />
                        )}
                        <TouchableOpacity style={s.closePreview} onPress={() => setPreviewPhoto(null)}>
                            <Ionicons name="close-circle" size={40} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Detail Modal */}
            <ClockOvertimeDetailSheet
                isOpened={!!selectedDetail}
                onClose={() => setSelectedDetail(null)}
                log={selectedDetail}
                viewMode={viewMode}
                onCancel={handleCancelLog}
                onViewProof={(url) => setPreviewPhoto(url)}
            />
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1 },
    toolbar: { paddingHorizontal: 16, paddingVertical: 12, alignItems: 'flex-end' },
    logBtn: { backgroundColor: '#007AFF', flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 999 },
    logBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700', marginLeft: 4 },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    emptyText: { marginTop: 12, fontSize: 15 },
    list: { paddingHorizontal: 16, paddingBottom: 40, gap: 12 },
    activityCard: { borderRadius: 24, marginBottom: 0, overflow: 'hidden' },
    activityTouchable: { padding: 16, paddingBottom: 16 },
    itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    itemLeftCol: { flex: 1, marginRight: 12 },
    itemRightCol: { alignItems: 'flex-end' },
    itemTitle: { fontSize: 16, fontWeight: '700' },
    itemMetaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', rowGap: 6, marginTop: 6 },
    itemMetaText: { fontSize: 13, color: '#8E8E93' },
    projectBadge: { backgroundColor: 'rgba(161,161,166,0.12)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: 'rgba(161,161,166,0.2)' },
    projectBadgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, color: '#A1A1A6' },
    itemAmount: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
    itemStatus: { fontSize: 12, fontWeight: '700' },
    monthSelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 12, paddingHorizontal: 20 },
    navCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
    monthText: { fontSize: 17, fontWeight: '700' },
    emptyIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 6,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    previewImage: {
        width: '90%',
        height: '80%',
    },
    closePreview: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 60 : 40,
        right: 20,
        zIndex: 99,
    },
    splitRoot: {
        flex: 1,
        flexDirection: 'row',
    },
    splitLeftPane: {
        ...DESKTOP_LIST_PANE,
        borderRightWidth: 1,
    },
    splitRightPane: {
        flex: 2,
        minWidth: 400,
    },
    desktopEmptyPane: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    desktopEmptyIconBox: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    desktopEmptyTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 8,
    },
    desktopEmptySubtitle: {
        fontSize: 14,
        textAlign: 'center',
        maxWidth: 360,
        lineHeight: 20,
    },
});
