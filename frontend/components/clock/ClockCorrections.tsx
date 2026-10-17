import { DESKTOP_LIST_PANE } from '@/constants/desktopLayout';
import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image, Modal, Platform, useWindowDimensions } from 'react-native';
import { useUserContext } from '@/context/UserProvider';
import { fetchAllRequestsAndRank, AttendanceCorrectionRequest, RequestStatus } from '@/lib/api/attendance';
import { ClockCorrectionDetailSheet } from './ClockCorrectionDetailSheet';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';

interface ClockCorrectionsProps {
    viewMode: 'personal' | 'team';
    currentMonth: Date;
    searchQuery?: string;
    selectedMember?: string;
    hideEmptyState?: boolean;
    onCountChange?: (count: number) => void;
    selectedDetailId?: string | null;
    onSelectDetail?: (item: AttendanceCorrectionRequest | null) => void;
}

export function ClockCorrections({ 
    viewMode, 
    currentMonth, 
    searchQuery, 
    selectedMember, 
    hideEmptyState, 
    onCountChange,
    selectedDetailId,
    onSelectDetail,
}: ClockCorrectionsProps) {
    const { user } = useUserContext();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';
    const borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';

    const { width } = useWindowDimensions();
    const isDesktopWeb = Platform.OS === 'web' && width >= 768;

    const [requests, setRequests] = useState<AttendanceCorrectionRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
    const [selectedDetail, setSelectedDetail] = useState<AttendanceCorrectionRequest | null>(null);

    const filteredRequests = useMemo(() => {
        const selectedMonthStr = format(currentMonth, 'yyyy-MM');
        return requests.filter(req => {
            try {
                const matchesMonth = (req.attendanceDate || '').startsWith(selectedMonthStr);
                const matchesMember = !selectedMember || (req.userName || '').toLowerCase() === selectedMember.toLowerCase();
                const q = (searchQuery || '').trim().toLowerCase();
                const matchesQuery = !q || (
                    (req.userName || '').toLowerCase().includes(q) ||
                    (req.reason || '').toLowerCase().includes(q) ||
                    (req.correctionType || '').toLowerCase().includes(q) ||
                    (req.originalValue || '').toLowerCase().includes(q) ||
                    (req.requestedValue || '').toLowerCase().includes(q)
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
            const targetUserId = viewMode === 'personal' ? user.id : undefined;
            const { corrections } = await fetchAllRequestsAndRank(targetUserId);
            setRequests(corrections || []);
        } catch (error) {
            console.error('Error loading corrections:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRequests();
    }, [viewMode, user?.id]);

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

    const formatCorrectionTypeName = (type: string) => {
        switch (type) {
            case 'clock_in': return 'Clock-in Time';
            case 'clock_out': return 'Clock-out Time';
            case 'work_location': return 'Work Location';
            case 'attendance_status': return 'Attendance Status';
            default: return type;
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
                    <View style={[s.emptyIconContainer, { backgroundColor: isDark ? 'rgba(0, 122, 255, 0.12)' : 'rgba(0, 122, 255, 0.08)' }]}>
                        <Ionicons name="clipboard-outline" size={40} color="#007AFF" />
                    </View>
                    <Text style={[s.emptyTitle, { color: textColor }]}>No Corrections Found</Text>
                    <Text style={[s.emptyText, { color: subtextColor }]}>You haven't submitted any attendance corrections for this period.</Text>
                </View>
            );
        }

        return (
            <View style={[s.list, isDesktopWeb && { paddingHorizontal: 0 }]}>
                {filteredRequests.map(req => {
                    const badge = getStatusBadgeConfig(req.status);
                    let dateDisplay = req.attendanceDate;
                    try {
                        dateDisplay = format(new Date(req.attendanceDate), 'dd MMM yyyy');
                    } catch {}
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
                                            {formatCorrectionTypeName(req.correctionType)}: {req.originalValue} → {req.requestedValue}
                                        </Text>
                                        <View style={s.itemMetaRow}>
                                            <View style={s.projectBadge}>
                                                <Text style={s.projectBadgeText}>{req.requestNumber || 'CORRECTION'}</Text>
                                            </View>
                                            <Text style={s.itemMetaText} numberOfLines={1}>
                                                Date: {dateDisplay}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={s.itemRightCol}>
                                        <Text style={[s.itemAmount, { color: textColor }]}>Correction</Text>
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

            {/* Native Detail Bottom Sheet */}
            <ClockCorrectionDetailSheet
                isOpened={!!selectedDetail}
                onClose={() => setSelectedDetail(null)}
                item={selectedDetail}
                viewMode={viewMode}
                onViewProof={(url) => setPreviewPhoto(url)}
            />
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1 },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    emptyText: { marginTop: 12, fontSize: 15, textAlign: 'center' },
    list: { paddingHorizontal: 16, paddingBottom: 40, gap: 12 },
    activityCard: { borderRadius: 24, marginBottom: 0, overflow: 'hidden' },
    activityTouchable: { padding: 16 },
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
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '90%', height: '85%', justifyContent: 'center', alignItems: 'center' },
    previewImage: { width: '100%', height: '100%' },
    closePreview: { position: 'absolute', top: 20, right: 20 },
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

