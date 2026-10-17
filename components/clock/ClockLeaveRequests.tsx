import { DESKTOP_LIST_PANE } from '@/constants/desktopLayout';
import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image, Modal, Alert, Platform, useWindowDimensions } from 'react-native';
import { useUserContext } from '@/context/UserProvider';
import { fetchAllRequestsAndRank, updateLeaveRequest, LeaveRequest, RequestStatus } from '@/lib/api/attendance';
import { LeaveRequestModal } from './LeaveRequestModal';
import { ClockLeaveDetailSheet } from './ClockLeaveDetailSheet';
import { format, differenceInCalendarDays } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';

interface ClockLeaveRequestsProps {
    viewMode: 'personal' | 'team';
    isRequestModalVisible?: boolean;
    onRequestClose?: () => void;
    currentMonth: Date;
    searchQuery?: string;
    selectedMember?: string;
    hideEmptyState?: boolean;
    onCountChange?: (count: number) => void;
    selectedDetailId?: string | null;
    onSelectDetail?: (request: LeaveRequest | null) => void;
}

export function ClockLeaveRequests({ 
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
}: ClockLeaveRequestsProps) {
    const { user } = useUserContext();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';
    const borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';

    const { width } = useWindowDimensions();
    const isDesktopWeb = Platform.OS === 'web' && width >= 768;

    const [requests, setRequests] = useState<LeaveRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
    const [selectedDetail, setSelectedDetail] = useState<LeaveRequest | null>(null);

    const filteredRequests = useMemo(() => {
        const selectedMonthStr = format(currentMonth, 'yyyy-MM');
        return requests.filter(req => {
            try {
                const matchesMonth = req.startDate.startsWith(selectedMonthStr);
                const matchesMember = !selectedMember || (req.userName || '').toLowerCase() === selectedMember.toLowerCase();
                const q = (searchQuery || '').trim().toLowerCase();
                const matchesQuery = !q || (
                    (req.userName || '').toLowerCase().includes(q) ||
                    (req.reason || '').toLowerCase().includes(q) ||
                    (req.type || '').toLowerCase().includes(q)
                );
                return matchesMonth && matchesMember && matchesQuery;
            } catch {
                return false;
            }
        });
    }, [requests, currentMonth, selectedMember, searchQuery]);

    useEffect(() => {
        if (onCountChange) {
            onCountChange(filteredRequests.length);
        }
    }, [filteredRequests.length, onCountChange]);

    const loadRequests = async () => {
        if (!user) return;
        setLoading(true);
        try {
            // Fetch for self or entire team
            const targetUserId = viewMode === 'personal' ? user.id : undefined;
            const { leaves } = await fetchAllRequestsAndRank(targetUserId);
            setRequests(leaves);
        } catch (error) {
            console.error('Error loading leaves:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRequests();
    }, [user, viewMode]);

    const handleCancelRequest = (id: string) => {
        Alert.alert(
            'Cancel Request',
            'Are you sure you want to cancel this leave request?',
            [
                { text: 'No', style: 'cancel' },
                {
                    text: 'Yes, Cancel',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await updateLeaveRequest(id, { status: 'cancelled' });
                            Alert.alert('Success', 'Leave request cancelled.');
                            loadRequests();
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to cancel request.');
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

    const formatDateRange = (startStr: string, endStr: string) => {
        try {
            const start = new Date(startStr);
            const end = new Date(endStr);
            if (startStr === endStr) {
                return format(start, 'dd MMM yyyy');
            }
            return `${format(start, 'dd MMM')} - ${format(end, 'dd MMM yyyy')}`;
        } catch {
            return '';
        }
    };

    const getDuration = (startStr: string, endStr: string) => {
        try {
            const start = new Date(startStr);
            const end = new Date(endStr);
            return differenceInCalendarDays(end, start) + 1;
        } catch {
            return 0;
        }
    };

    const renderListContent = () => {
        if (loading && filteredRequests.length === 0) {
            return (
                <View style={s.loader}>
                    <ActivityIndicator size="large" color="#007AFF" />
                </View>
            );
        }
        if (filteredRequests.length === 0) {
            return hideEmptyState ? null : (
                <View style={s.empty}>
                    <View style={[s.emptyIconContainer, { backgroundColor: isDark ? 'rgba(175, 82, 222, 0.12)' : 'rgba(175, 82, 222, 0.08)' }]}>
                        <Ionicons name="calendar-clear-outline" size={40} color="#AF52DE" />
                    </View>
                    <Text style={[s.emptyTitle, { color: textColor }]}>No Leave Requests</Text>
                    <Text style={[s.emptyText, { color: subtextColor }]}>You haven't submitted any leave requests for this month.</Text>
                </View>
            );
        }
        return (
            <View style={[s.list, isDesktopWeb && { paddingHorizontal: 0 }]}>
                {filteredRequests.map(req => {
                    const badge = getStatusBadgeConfig(req.status);
                    const dur = getDuration(req.startDate, req.endDate);
                    const isSelected = selectedDetailId ? selectedDetailId === req.id : selectedDetail?.id === req.id;

                    return (
                        <View 
                            key={req.id}
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
                                        onSelectDetail(req);
                                    } else {
                                        setSelectedDetail(req);
                                    }
                                }}
                                style={s.activityTouchable}
                            >
                                <View style={s.itemRow}>
                                    <View style={s.itemLeftCol}>
                                        <Text style={[s.itemTitle, { color: textColor }]} numberOfLines={1}>
                                            {viewMode === 'team' && req.userName ? `${req.userName} - ` : ''}{req.type}
                                            {req.subtype ? ` (${req.subtype.replace('_', ' ')})` : ''}
                                        </Text>
                                        <View style={s.itemMetaRow}>
                                            <View style={s.projectBadge}>
                                                <Text style={s.projectBadgeText}>{req.requestNumber || 'LEAVE'}</Text>
                                            </View>
                                            <Text style={s.itemMetaText} numberOfLines={1}>
                                                {formatDateRange(req.startDate, req.endDate)}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={s.itemRightCol}>
                                        <Text style={[s.itemAmount, { color: textColor }]}>{dur} {dur === 1 ? 'day' : 'days'}</Text>
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

            {/* Apply Leave Modal */}
            <LeaveRequestModal
                visible={isRequestModalVisible || false}
                onClose={() => onRequestClose?.()}
                onSuccess={loadRequests}
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
            <ClockLeaveDetailSheet
                isOpened={!!selectedDetail}
                onClose={() => setSelectedDetail(null)}
                request={selectedDetail}
                viewMode={viewMode}
                onCancel={handleCancelRequest}
                onViewCertificate={(url) => setPreviewPhoto(url)}
            />
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1 },
    splitRoot: {
        flex: 1,
        flexDirection: 'row',
        height: '100%',
    },
    splitLeftPane: {
        ...DESKTOP_LIST_PANE,
        borderRightWidth: StyleSheet.hairlineWidth,
        height: '100%',
    },
    splitRightPane: {
        flex: 2,
        height: '100%',
    },
    desktopEmptyPane: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
    },
    desktopEmptyTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 6,
    },
    desktopEmptySubtitle: {
        fontSize: 13,
        textAlign: 'center',
        maxWidth: 320,
        lineHeight: 18,
    },
    toolbar: { paddingHorizontal: 16, paddingVertical: 12, alignItems: 'flex-end' },
    applyBtn: { backgroundColor: '#007AFF', flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 999 },
    applyBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700', marginLeft: 4 },
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
});
