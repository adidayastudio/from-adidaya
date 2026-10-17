import { DESKTOP_LIST_PANE } from '@/constants/desktopLayout';
import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Image, Modal, Alert, Platform, useWindowDimensions } from 'react-native';
import { useUserContext } from '@/context/UserProvider';
import { useTenantContext } from '@/context/TenantContext';
import { fetchAllRequestsAndRank, updateRequestStatus, RequestStatus, deleteLeaveRequest, deleteOvertimeLog, deleteBusinessTrip } from '@/lib/api/attendance';
import { shareTeamApprovals, generateTeamApprovalsHtml } from '@/lib/shareHelper';
import { ApprovalActionModal, ApprovalItem } from './ApprovalActionModal';
import { format, differenceInCalendarDays } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { ClockLeaveDetailSheet } from './ClockLeaveDetailSheet';
import { ClockOvertimeDetailSheet } from './ClockOvertimeDetailSheet';
import { ClockTripDetailSheet } from './ClockTripDetailSheet';
import { ClockCorrectionDetailSheet } from './ClockCorrectionDetailSheet';

interface ClockApprovalsProps {
    currentMonth: Date;
    activeType: 'all' | 'leaves' | 'overtime' | 'trips' | 'corrections';
    onRegisterShare?: (shareFn: () => void) => void;
    onViewDocument?: (html: string, title: string) => void;
    searchQuery?: string;
    selectedMember?: string;
    selectedDetailId?: string | null;
    onSelectDetail?: (item: ApprovalItem | null) => void;
}

export function ClockApprovals({ 
    currentMonth, 
    activeType, 
    onRegisterShare, 
    onViewDocument, 
    searchQuery, 
    selectedMember,
    selectedDetailId,
    onSelectDetail,
}: ClockApprovalsProps) {
    const { user } = useUserContext();
    const { activeTenant } = useTenantContext();
    const { resolvedTheme } = useTheme();
    const { width } = useWindowDimensions();
    const isDesktopWeb = Platform.OS === 'web' && width >= 768;
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';
    const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

    // State
    const [approvalsList, setApprovalsList] = useState<ApprovalItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
    const [selectedDetail, setSelectedDetail] = useState<ApprovalItem | null>(null);

    // Modal action state
    const [actionModal, setActionModal] = useState<{
        visible: boolean;
        type: 'approve' | 'reject' | 'revision';
        item: ApprovalItem | null;
    }>({ visible: false, type: 'approve', item: null });

    const loadAllApprovals = async () => {
        setLoading(true);
        try {
            // Fetch team-wide requests (by passing undefined to userId)
            const { leaves: leavesData, overtimes: overtimeData, trips: tripsData, corrections: correctionsData } = await fetchAllRequestsAndRank(undefined);

            // Map leaves
            const leaves: ApprovalItem[] = leavesData.map(l => ({
                id: `leave-${l.id}`,
                actualId: l.id,
                employee: l.userName || 'Employee',
                type: 'Leave Request',
                details: l.type + (l.subtype ? ` (${l.subtype.replace('_', ' ')})` : ''),
                dates: `${l.startDate} to ${l.endDate}`,
                submittedAt: l.createdAt,
                status: l.status,
                reason: l.reason || '',
                rejectReason: l.rejectReason,
                fileUrl: l.fileUrl,
                requestNumber: l.requestNumber,
                startDate: l.startDate,
                endDate: l.endDate
            } as any));

            // Map overtime
            const overtime: ApprovalItem[] = overtimeData.map(o => ({
                id: `ot-${o.id}`,
                actualId: o.id,
                employee: o.userName || 'Employee',
                type: 'Overtime',
                details: o.description || 'Overtime Work',
                dates: `${o.date} (${o.startTime} - ${o.endTime})`,
                submittedAt: o.createdAt,
                status: o.status,
                reason: o.description || '',
                rejectReason: o.rejectReason,
                fileUrl: o.photoUrl,
                rawStartTime: o.startTime,
                rawEndTime: o.endTime,
                requestNumber: o.requestNumber,
                date: o.date
            } as any));

            // Map business trips
            const trips: ApprovalItem[] = tripsData.map(t => ({
                id: `trip-${t.id}`,
                actualId: t.id,
                employee: t.userName || 'Employee',
                type: 'Business Trip',
                details: `${t.destination} - ${t.purpose}`,
                dates: `${t.startDate} to ${t.endDate}`,
                submittedAt: t.createdAt,
                status: t.status,
                reason: t.purpose || '',
                rejectReason: t.rejectReason,
                fileUrl: t.fileUrl,
                requestNumber: t.requestNumber,
                startDate: t.startDate,
                endDate: t.endDate,
                destination: t.destination
            } as any));

            // Map corrections
            const corrections: ApprovalItem[] = (correctionsData || []).map(c => {
                const fieldLabel = c.correctionType === 'clock_in' ? 'Clock-in'
                    : c.correctionType === 'clock_out' ? 'Clock-out'
                    : c.correctionType === 'work_location' ? 'Location'
                    : 'Status';

                return {
                    id: `correction-${c.id}`,
                    actualId: c.id,
                    employee: c.userName || 'Employee',
                    type: 'Attendance Correction',
                    details: `${fieldLabel}: ${c.originalValue} → ${c.requestedValue}`,
                    dates: c.attendanceDate,
                    submittedAt: c.createdAt,
                    status: c.status,
                    reason: c.reason || '',
                    rejectReason: c.rejectReason,
                    fileUrl: c.evidenceUrl,
                    requestNumber: c.requestNumber,
                    date: c.attendanceDate,
                    rawCorrection: c,
                } as any;
            });

            // Combine and sort by submission date descending
            const combined = [...leaves, ...overtime, ...trips, ...corrections].sort(
                (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
            );

            setApprovalsList(combined);
        } catch (error) {
            console.error('Error loading team approvals:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAllApprovals();
    }, []);

    // Filtered items (filter by Month, category type, member, and search query)
    const filteredApprovals = useMemo(() => {
        const selectedMonthStr = format(currentMonth, 'yyyy-MM');
        return approvalsList.filter(item => {
            const matchesMonth = item.startDate ? item.startDate.startsWith(selectedMonthStr) : (item.date ? item.date.startsWith(selectedMonthStr) : (item.submittedAt ? item.submittedAt.startsWith(selectedMonthStr) : true));
            if (!matchesMonth) return false;

            if (activeType === 'leaves' && item.type !== 'Leave Request') return false;
            if (activeType === 'overtime' && item.type !== 'Overtime') return false;
            if (activeType === 'trips' && item.type !== 'Business Trip') return false;
            if (activeType === 'corrections' && item.type !== 'Attendance Correction') return false;

            if (selectedMember && (item.employee || '').toLowerCase() !== selectedMember.toLowerCase()) return false;

            const q = (searchQuery || '').trim().toLowerCase();
            if (q) {
                const matchesQuery = (item.employee || '').toLowerCase().includes(q) ||
                    (item.details || '').toLowerCase().includes(q) ||
                    (item.reason || '').toLowerCase().includes(q) ||
                    (item.type || '').toLowerCase().includes(q);
                if (!matchesQuery) return false;
            }

            return true;
        });
    }, [approvalsList, currentMonth, activeType, selectedMember, searchQuery]);

    useEffect(() => {
        if (onRegisterShare) {
            onRegisterShare(() => {
                const now = new Date();
                const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
                const title = `Team_Approvals_${activeType}_${dateStr}`;
                const shareType = activeType === 'all' ? 'leaves' : activeType;
                const tenantInfo = activeTenant ? {
                    name: activeTenant.branding_name || activeTenant.name,
                    logoUrl: activeTenant.branding_logo_url || activeTenant.logo_url,
                    companyCode: activeTenant.company_code,
                    primaryColor: activeTenant.primary_color,
                    slug: activeTenant.slug
                } : undefined;
                const html = generateTeamApprovalsHtml(filteredApprovals, currentMonth, shareType, tenantInfo);
                if (onViewDocument) {
                    onViewDocument(html, title);
                } else {
                    shareTeamApprovals(filteredApprovals, currentMonth, shareType);
                }
            });
        }
    }, [filteredApprovals, currentMonth, activeType, activeTenant, onRegisterShare, onViewDocument]);

    const formatDateRange = (startStr?: string, endStr?: string) => {
        if (!startStr || !endStr) return '';
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

    const getDurationStr = (item: ApprovalItem) => {
        if (item.type === 'Leave Request') {
            const leavesItem = item as any;
            if (leavesItem.startDate && leavesItem.endDate) {
                try {
                    const diff = differenceInCalendarDays(new Date(leavesItem.endDate), new Date(leavesItem.startDate)) + 1;
                    return `${diff} ${diff === 1 ? 'day' : 'days'}`;
                } catch {
                    return '';
                }
            }
        } else if (item.type === 'Business Trip') {
            const tripItem = item as any;
            if (tripItem.startDate && tripItem.endDate) {
                try {
                    const diff = differenceInCalendarDays(new Date(tripItem.endDate), new Date(tripItem.startDate)) + 1;
                    return `${diff} ${diff === 1 ? 'day' : 'days'}`;
                } catch {
                    return '';
                }
            }
        } else if (item.type === 'Overtime') {
            if (item.rawStartTime && item.rawEndTime) {
                try {
                    const [sh, sm] = item.rawStartTime.split(':').map(Number);
                    const [eh, em] = item.rawEndTime.split(':').map(Number);
                    let diff = (eh * 60 + em) - (sh * 60 + sm);
                    if (diff < 0) diff += 24 * 60;
                    const h = Math.floor(diff / 60);
                    const m = diff % 60;
                    return `${h}h ${m}m`;
                } catch {
                    return '';
                }
            }
        } else if (item.type === 'Attendance Correction') {
            return 'Correction';
        }
        return '';
    };

    const formatSubmittedDate = (dateStr: string) => {
        try {
            return format(new Date(dateStr), 'dd MMM, HH:mm');
        } catch {
            return dateStr;
        }
    };

    const handleActionConfirm = async (
        reason?: string,
        correction?: { approvedStartTime?: string; approvedEndTime?: string }
    ) => {
        const { item, type } = actionModal;
        if (!item) return;

        const apiTypeMap: Record<string, 'leave' | 'overtime' | 'business-trip' | 'correction'> = {
            'Leave Request': 'leave',
            'Overtime': 'overtime',
            'Business Trip': 'business-trip',
            'Attendance Correction': 'correction'
        };

        const apiType = apiTypeMap[item.type];
        const status: RequestStatus = type === 'approve' ? 'approved' : type === 'reject' ? 'rejected' : 'revision';

        try {
            await updateRequestStatus(apiType, item.actualId, status, reason, correction);
            const statusLabel = type === 'approve' ? 'approved' : type === 'reject' ? 'rejected' : 'sent back for revision';
            Alert.alert('Success', `Request ${statusLabel} successfully.`);
            setSelectedDetail(null);
            loadAllApprovals();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to update request.');
            throw error; // Re-throw to let the modal keep the loading state/error
        }
    };

    const handleDeleteRequest = (item: ApprovalItem) => {
        Alert.alert(
            'Delete Request',
            'Are you sure you want to delete this request permanently? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        setLoading(true);
                        try {
                            const apiTypeMap: Record<string, 'leave' | 'overtime' | 'business-trip' | 'correction'> = {
                                'Leave Request': 'leave',
                                'Overtime': 'overtime',
                                'Business Trip': 'business-trip',
                                'Attendance Correction': 'correction'
                            };
                            const apiType = apiTypeMap[item.type];
                            if (apiType === 'leave') {
                                await deleteLeaveRequest(item.actualId);
                            } else if (apiType === 'overtime') {
                                await deleteOvertimeLog(item.actualId);
                            } else if (apiType === 'business-trip') {
                                await deleteBusinessTrip(item.actualId);
                            }
                            Alert.alert('Success', 'Request deleted successfully.');
                            loadAllApprovals();
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to delete request.');
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const getStatusBadgeConfig = (status: string) => {
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
            case 'Need Revision':
                return { label: 'Revision', bg: 'rgba(255, 149, 0, 0.15)', text: '#FF9500', icon: 'arrow-undo' };
            default:
                return { label: status, bg: 'rgba(142, 142, 147, 0.15)', text: '#8E8E93', icon: 'help-circle' };
        }
    };


    return (
        <View style={s.container}>


            {/* List */}
            {loading ? (
                <View style={s.loader}>
                    <ActivityIndicator size="large" color="#007AFF" />
                </View>
            ) : filteredApprovals.length === 0 ? (
                <View style={s.empty}>
                    <View style={[s.emptyIconContainer, { backgroundColor: isDark ? 'rgba(52, 199, 89, 0.12)' : 'rgba(52, 199, 89, 0.08)' }]}>
                        <Ionicons name="checkmark-done-circle-outline" size={40} color="#34C759" />
                    </View>
                    <Text style={[s.emptyTitle, { color: textColor }]}>All Caught Up</Text>
                    <Text style={[s.emptyText, { color: subtextColor }]}>No pending approval requests found</Text>
                </View>
            ) : (
                <View style={[s.list, isDesktopWeb && { paddingHorizontal: 0 }]}>
                    {filteredApprovals.map(item => {
                        const badge = getStatusBadgeConfig(item.status);
                        const isSelected = selectedDetailId ? (selectedDetailId === item.id || selectedDetailId === item.actualId) : selectedDetail?.id === item.id;
                        return (
                            <TouchableOpacity 
                                key={item.id} 
                                activeOpacity={0.7} 
                                onPress={() => {
                                    if (isDesktopWeb && onSelectDetail) {
                                        onSelectDetail(item);
                                    } else {
                                        setSelectedDetail(item);
                                    }
                                }}
                                style={[
                                    s.activityCard,
                                    {
                                        backgroundColor: isSelected ? (isDark ? 'rgba(0, 122, 255, 0.12)' : 'rgba(0, 122, 255, 0.06)') : (isDark ? '#1C1C1E' : '#FFF'),
                                        borderColor: isSelected ? '#007AFF' : (isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)'),
                                        borderWidth: isSelected ? 1.5 : 1 
                                    }
                                ]}
                            >
                                <View style={s.activityTouchable}>
                                    <View style={s.itemRow}>
                                        <View style={s.itemLeftCol}>
                                            <Text style={[s.itemTitle, { color: textColor }]} numberOfLines={1}>{item.employee}</Text>
                                            <View style={s.itemMetaRow}>
                                                <View style={s.projectBadge}>
                                                    <Text style={s.projectBadgeText}>{item.type}</Text>
                                                </View>
                                                <Text style={s.itemMetaText} numberOfLines={1}>{item.details}</Text>
                                            </View>
                                        </View>
                                        <View style={s.itemRightCol}>
                                            <Text style={[s.itemAmount, { color: textColor }]}>{getDurationStr(item)}</Text>
                                            <Text style={[s.itemStatus, { color: badge.text }]}>{badge.label.toUpperCase()}</Text>
                                        </View>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            )}

            {/* Approval Action Modal Form */}
            <ApprovalActionModal
                visible={actionModal.visible}
                type={actionModal.type}
                item={actionModal.item}
                onClose={() => setActionModal({ visible: false, type: 'approve', item: null })}
                onConfirm={handleActionConfirm}
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

            {!isDesktopWeb && (
                <>
                    {/* Detail Sheets for Approvals (Mobile) */}
                    <ClockLeaveDetailSheet
                        isOpened={!!selectedDetail && selectedDetail.type === 'Leave Request'}
                        onClose={() => setSelectedDetail(null)}
                        request={selectedDetail && selectedDetail.type === 'Leave Request' ? {
                            id: selectedDetail.actualId,
                            userId: '',
                            userName: selectedDetail.employee,
                            type: selectedDetail.details.split(' (')[0] as any,
                            startDate: (selectedDetail as any).startDate,
                            endDate: (selectedDetail as any).endDate,
                            status: selectedDetail.status as any,
                            reason: selectedDetail.reason,
                            rejectReason: selectedDetail.rejectReason,
                            fileUrl: selectedDetail.fileUrl,
                            requestNumber: selectedDetail.requestNumber,
                            createdAt: selectedDetail.submittedAt
                        } : null}
                        viewMode="team"
                        onCancel={() => {}}
                        onViewCertificate={(url) => setPreviewPhoto(url)}
                        onApprove={() => selectedDetail && setActionModal({ visible: true, type: 'approve', item: selectedDetail })}
                        onReject={() => selectedDetail && setActionModal({ visible: true, type: 'reject', item: selectedDetail })}
                        onRevision={() => selectedDetail && setActionModal({ visible: true, type: 'revision', item: selectedDetail })}
                        onDelete={() => selectedDetail && handleDeleteRequest(selectedDetail)}
                    />

                    <ClockOvertimeDetailSheet
                        isOpened={!!selectedDetail && selectedDetail.type === 'Overtime'}
                        onClose={() => setSelectedDetail(null)}
                        log={selectedDetail && selectedDetail.type === 'Overtime' ? {
                            id: selectedDetail.actualId,
                            userId: '',
                            userName: selectedDetail.employee,
                            date: (selectedDetail as any).date,
                            startTime: selectedDetail.rawStartTime || '',
                            endTime: selectedDetail.rawEndTime || '',
                            status: selectedDetail.status as any,
                            description: selectedDetail.reason,
                            photoUrl: selectedDetail.fileUrl,
                            createdAt: selectedDetail.submittedAt,
                            rejectReason: selectedDetail.rejectReason,
                            requestNumber: selectedDetail.requestNumber
                        } : null}
                        viewMode="team"
                        onCancel={() => {}}
                        onViewProof={(url) => setPreviewPhoto(url)}
                        onApprove={() => selectedDetail && setActionModal({ visible: true, type: 'approve', item: selectedDetail })}
                        onReject={() => selectedDetail && setActionModal({ visible: true, type: 'reject', item: selectedDetail })}
                        onRevision={() => selectedDetail && setActionModal({ visible: true, type: 'revision', item: selectedDetail })}
                        onDelete={() => selectedDetail && handleDeleteRequest(selectedDetail)}
                    />

                    <ClockTripDetailSheet
                        isOpened={!!selectedDetail && selectedDetail.type === 'Business Trip'}
                        onClose={() => setSelectedDetail(null)}
                        trip={selectedDetail && selectedDetail.type === 'Business Trip' ? {
                            id: selectedDetail.actualId,
                            userId: '',
                            userName: selectedDetail.employee,
                            destination: selectedDetail.details.split(' - ')[0] || '',
                            startDate: (selectedDetail as any).startDate,
                            endDate: (selectedDetail as any).endDate,
                            purpose: selectedDetail.reason,
                            status: selectedDetail.status as any,
                            rejectReason: selectedDetail.rejectReason,
                            fileUrl: selectedDetail.fileUrl,
                            requestNumber: selectedDetail.requestNumber,
                            createdAt: selectedDetail.submittedAt
                        } : null}
                        viewMode="team"
                        onCancel={() => {}}
                        onViewAttachment={(url) => setPreviewPhoto(url)}
                        onApprove={() => selectedDetail && setActionModal({ visible: true, type: 'approve', item: selectedDetail })}
                        onReject={() => selectedDetail && setActionModal({ visible: true, type: 'reject', item: selectedDetail })}
                        onRevision={() => selectedDetail && setActionModal({ visible: true, type: 'revision', item: selectedDetail })}
                        onDelete={() => selectedDetail && handleDeleteRequest(selectedDetail)}
                    />

                    <ClockCorrectionDetailSheet
                        isOpened={!!selectedDetail && selectedDetail.type === 'Attendance Correction'}
                        onClose={() => setSelectedDetail(null)}
                        item={selectedDetail && selectedDetail.type === 'Attendance Correction' ? ((selectedDetail as any).rawCorrection || {
                            id: selectedDetail.actualId,
                            userId: '',
                            userName: selectedDetail.employee,
                            attendanceRecordId: '',
                            attendanceDate: (selectedDetail as any).date || '',
                            correctionType: 'clock_in',
                            originalValue: '',
                            requestedValue: '',
                            reason: selectedDetail.reason,
                            evidenceUrl: selectedDetail.fileUrl,
                            status: selectedDetail.status as any,
                            requestNumber: selectedDetail.requestNumber,
                            rejectReason: selectedDetail.rejectReason,
                            createdAt: selectedDetail.submittedAt,
                        }) : null}
                        viewMode="team"
                        onViewProof={(url) => setPreviewPhoto(url)}
                        onApprove={() => selectedDetail && setActionModal({ visible: true, type: 'approve', item: selectedDetail })}
                        onReject={() => selectedDetail && setActionModal({ visible: true, type: 'reject', item: selectedDetail })}
                        onRevision={() => selectedDetail && setActionModal({ visible: true, type: 'revision', item: selectedDetail })}
                    />
                </>
            )}
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1 },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    emptyText: { marginTop: 12, fontSize: 15 },
    list: { paddingHorizontal: 16, paddingBottom: 40, gap: 12 },
    activityCard: { borderRadius: 24, marginBottom: 0, overflow: 'hidden' },
    activityTouchable: { padding: 16, paddingBottom: 12 },
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
    approvalActionsWrapper: {
        flexDirection: 'row',
        gap: 8,
        width: '100%',
        marginTop: 0,
        borderTopWidth: 0,
        paddingTop: 4,
    },
    approvalActionBtn: {
        flex: 1.5,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderRadius: 999,
        borderWidth: 1,
    },
    approvalIconBtnReject: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    approvalIconBtnDelete: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    approvalActionText: {
        fontSize: 13,
        fontWeight: '600',
    },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '90%', height: '85%', justifyContent: 'center', alignItems: 'center' },
    previewImage: { width: '100%', height: '100%' },
    closePreview: { position: 'absolute', top: 20, right: 20 },
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
