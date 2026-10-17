import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, TextInput, Alert, Image, ActivityIndicator, Platform } from 'react-native';
import { GlassView } from '@/components/ui/GlassView';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { useUserContext } from '@/context/UserProvider';
import { submitLeaveRequest, fetchLeaveRequests, uploadClockFileBase64, LeaveType, LeaveRequest } from '@/lib/api/attendance';
import {
    LeavePolicy,
    LeaveTypeCategory,
    fetchLeavePolicies,
    getEligibleLeavePolicies,
    calculateProratedAnnualLeave,
    PermissionSubtypeItem,
    DEFAULT_PERMISSION_SUBTYPES,
} from '@/lib/api/leavePolicies';
import { LiquidDatePicker } from '@/components/ui/LiquidDatePicker';
import * as ImagePicker from 'expo-image-picker';
import { format, differenceInCalendarDays, startOfToday } from 'date-fns';

interface LeaveRequestModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface StandardLeaveTypeItem {
    id: LeaveTypeCategory;
    name: string;
    apiType: LeaveType;
    isPaid: boolean;
    defaultEntitlement: number;
    description: string;
    minNoticeDays: number;
}

const STANDARD_LEAVE_TYPES: StandardLeaveTypeItem[] = [
    {
        id: 'annual',
        name: 'Annual Leave',
        apiType: 'Annual Leave',
        isPaid: true,
        defaultEntitlement: 12,
        description: 'Standard paid annual leave deducted from annual balance.',
        minNoticeDays: 7,
    },
    {
        id: 'sick',
        name: 'Sick Leave',
        apiType: 'Sick Leave',
        isPaid: true,
        defaultEntitlement: 14,
        description: 'Medical recovery leave. Doctor letter required for > 2 days.',
        minNoticeDays: 0,
    },
    {
        id: 'permission',
        name: 'Personal Permission',
        apiType: 'Permission',
        isPaid: true,
        defaultEntitlement: 5,
        description: 'Short permits (Half day, marriage, bereavement, etc.).',
        minNoticeDays: 1,
    },
    {
        id: 'unpaid',
        name: 'Unpaid Leave',
        apiType: 'Unpaid Leave',
        isPaid: false,
        defaultEntitlement: 30,
        description: 'Uncompensated leave for personal or urgent absence.',
        minNoticeDays: 3,
    },
    {
        id: 'maternity_paternity',
        name: 'Maternity / Paternity Leave',
        apiType: 'Maternity Leave',
        isPaid: true,
        defaultEntitlement: 90,
        description: 'Statutory family care leave for childbirth and recovery.',
        minNoticeDays: 7,
    },
];

export function LeaveRequestModal({ visible, onClose, onSuccess }: LeaveRequestModalProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';
    const clockBlue = '#0EA5E9';

    const { user, profile } = useUserContext();

    // Policies loaded dynamically
    const [policies, setPolicies] = useState<LeavePolicy[]>([]);
    const [loadingPolicies, setLoadingPolicies] = useState(false);
    const [pastRequests, setPastRequests] = useState<LeaveRequest[]>([]);

    // Form states
    const [selectedLeaveTypeId, setSelectedLeaveTypeId] = useState<LeaveTypeCategory>('annual');
    const [selectedSubtypeId, setSelectedSubtypeId] = useState<string>('half_day');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [notes, setNotes] = useState('');
    const [attachment, setAttachment] = useState<ImagePicker.ImagePickerAsset | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Date Picker triggers
    const [activeDatePicker, setActiveDatePicker] = useState<'start' | 'end' | null>(null);

    // Fetch active & eligible policies + past requests when modal opens
    useEffect(() => {
        if (visible) {
            setStartDate('');
            setEndDate('');
            setNotes('');
            setAttachment(null);
            setIsSubmitting(false);
            setSelectedLeaveTypeId('annual');
            setSelectedSubtypeId('half_day');

            setLoadingPolicies(true);
            fetchLeavePolicies()
                .then((all) => {
                    const eligible = getEligibleLeavePolicies(all, profile || user);
                    setPolicies(eligible);
                })
                .catch((e) => console.warn('[ApplyLeave] Error fetching policies:', e))
                .finally(() => setLoadingPolicies(false));

            if (user?.id) {
                fetchLeaveRequests(user.id)
                    .then(setPastRequests)
                    .catch((e) => console.warn('[ApplyLeave] Error fetching past requests:', e));
            }
        }
    }, [visible, profile, user]);

    // Active selected type configuration
    const selectedTypeConfig = useMemo(() => {
        return STANDARD_LEAVE_TYPES.find((t) => t.id === selectedLeaveTypeId) || STANDARD_LEAVE_TYPES[0];
    }, [selectedLeaveTypeId]);

    // Match policy from database if configured for this leave type
    const currentPolicy = useMemo(() => {
        const found = policies.find((p) => p.leave_type === selectedLeaveTypeId);
        if (found) return found;
        return null;
    }, [policies, selectedLeaveTypeId]);

    const isPermission = selectedLeaveTypeId === 'permission';

    // Subtypes for permission policy
    const enabledSubtypes = useMemo<PermissionSubtypeItem[]>(() => {
        if (!isPermission) return [];
        if (currentPolicy?.permission_subtypes && currentPolicy.permission_subtypes.length > 0) {
            const list = currentPolicy.permission_subtypes.filter((st) => st.is_enabled);
            if (list.length > 0) return list;
        }
        return DEFAULT_PERMISSION_SUBTYPES.filter((st) => st.is_enabled);
    }, [isPermission, currentPolicy]);

    const currentSubtype = useMemo(() => {
        return enabledSubtypes.find((st) => st.id === selectedSubtypeId) || enabledSubtypes[0] || null;
    }, [enabledSubtypes, selectedSubtypeId]);

    // Annual Leave calculation & balance tracking
    const currentYear = new Date().getFullYear();
    const annualEntitlement = useMemo(() => {
        if (currentPolicy?.entitlement_days) return currentPolicy.entitlement_days;
        const joinDate = profile?.joinDate || profile?.join_date || null;
        if (currentPolicy) {
            const prorated = calculateProratedAnnualLeave(currentPolicy, joinDate);
            if (prorated) return prorated.totalQuota;
        }
        return 12;
    }, [currentPolicy, profile]);

    const usedAnnualDays = useMemo(() => {
        return pastRequests
            .filter((r) => {
                if (r.type !== 'Annual Leave') return false;
                if (r.status === 'rejected' || r.status === 'cancelled') return false;
                const d = r.startDate || '';
                return d.startsWith(String(currentYear));
            })
            .reduce((sum, r) => {
                try {
                    const start = new Date(r.startDate);
                    const end = new Date(r.endDate || r.startDate);
                    return sum + Math.max(1, differenceInCalendarDays(end, start) + 1);
                } catch {
                    return sum + 1;
                }
            }, 0);
    }, [pastRequests, currentYear]);

    const remainingAnnualBalance = Math.max(0, annualEntitlement - usedAnnualDays);

    const today = startOfToday();

    // Duration calculation
    const durationDays = useMemo(() => {
        if (isPermission && currentSubtype?.id === 'half_day') {
            return 0.5;
        }
        if (!startDate || !endDate) return 0;
        try {
            const start = new Date(startDate);
            const end = new Date(endDate);
            return Math.max(1, differenceInCalendarDays(end, start) + 1);
        } catch {
            return 0;
        }
    }, [startDate, endDate, isPermission, currentSubtype]);

    // Notice validation
    const minNotice = currentPolicy?.min_notice_days ?? selectedTypeConfig.minNoticeDays;
    const isNoticeValid = useMemo(() => {
        if (!startDate || minNotice === 0) return true;
        try {
            const start = new Date(startDate);
            const daysNotice = differenceInCalendarDays(start, today);
            return daysNotice >= minNotice;
        } catch {
            return true;
        }
    }, [startDate, minNotice, today]);

    // Evidence requirement
    const isSickFileRequired = selectedLeaveTypeId === 'sick' && durationDays > 2;
    const isAttachmentRequired =
        currentPolicy?.evidence_mode === 'required' ||
        isSickFileRequired ||
        (isPermission && currentSubtype?.evidence_mode === 'required') ||
        selectedLeaveTypeId === 'maternity_paternity';

    const handlePickAttachment = async () => {
        Alert.alert(
            'Select Source',
            'Choose where to attach document from:',
            [
                {
                    text: 'Camera',
                    onPress: async () => {
                        const { status } = await ImagePicker.requestCameraPermissionsAsync();
                        if (status !== 'granted') {
                            Alert.alert('Permission Denied', 'Camera access is required to take photos.');
                            return;
                        }
                        const result = await ImagePicker.launchCameraAsync({
                            mediaTypes: ['images'],
                            quality: 0.8,
                            base64: true,
                        });
                        if (!result.canceled && result.assets && result.assets.length > 0) {
                            setAttachment(result.assets[0]);
                        }
                    },
                },
                {
                    text: 'Photo Library',
                    onPress: async () => {
                        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                        if (status !== 'granted') {
                            Alert.alert('Permission Denied', 'Gallery access is required to pick photos.');
                            return;
                        }
                        const result = await ImagePicker.launchImageLibraryAsync({
                            mediaTypes: ['images'],
                            quality: 0.8,
                            base64: true,
                        });
                        if (!result.canceled && result.assets && result.assets.length > 0) {
                            setAttachment(result.assets[0]);
                        }
                    },
                },
                { text: 'Cancel', style: 'cancel' },
            ]
        );
    };

    const handleSubmit = async () => {
        if (!user?.id) {
            Alert.alert('Authentication Error', 'You must be logged in to submit a request.');
            return;
        }

        const isHalfDay = isPermission && currentSubtype?.id === 'half_day';
        if (!startDate || (!isHalfDay && !endDate)) {
            Alert.alert('Date Required', 'Please select date(s) for your leave.');
            return;
        }

        // Check annual leave balance
        if (selectedLeaveTypeId === 'annual' && durationDays > remainingAnnualBalance) {
            Alert.alert(
                'Insufficient Annual Leave Balance',
                `You requested ${durationDays} days, but only have ${remainingAnnualBalance} days remaining for ${currentYear}.`
            );
            return;
        }

        if (currentPolicy?.require_reason && !notes.trim()) {
            Alert.alert('Reason Required', 'Please explain the reason for this leave request.');
            return;
        }

        if (isAttachmentRequired && !attachment) {
            Alert.alert(
                'Supporting Document Required',
                selectedLeaveTypeId === 'sick'
                    ? 'Medical certificate or doctor letter is required for sick leave exceeding 2 days.'
                    : 'Please attach a supporting document or proof for this request.'
            );
            return;
        }

        setIsSubmitting(true);
        try {
            let fileUrl = '';
            if (attachment && attachment.base64) {
                const ext = attachment.uri.split('.').pop() || 'jpg';
                fileUrl = await uploadClockFileBase64(
                    attachment.base64,
                    ext,
                    attachment.mimeType || 'image/jpeg',
                    'leaves'
                );
            }

            const startStr = startDate;
            const endStr = isHalfDay ? startDate : endDate;

            await submitLeaveRequest({
                userId: user.id,
                userName: profile?.full_name || user.email || 'Employee',
                type: selectedTypeConfig.apiType,
                startDate: startStr,
                endDate: endStr,
                reason: notes.trim(),
                subtype: isPermission ? currentSubtype?.name : undefined,
                fileUrl: fileUrl || undefined,
            });

            Alert.alert('Success', 'Leave request submitted successfully!');
            onSuccess();
            onClose();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to submit leave request.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose} statusBarTranslucent={true}>
            <View style={s.drawerOverlay}>
                <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
                <GlassView intensity={60} tint={isDark ? 'dark' : 'light'} style={[s.drawerContentSheet, { backgroundColor: isDark ? 'rgba(28,28,30,0.98)' : (Platform.OS === 'android' ? 'rgba(255,255,255,0.98)' : 'rgba(255,255,255,0.92)') }]}>
                    {/* Header */}
                    <View style={s.header}>
                        <View>
                            <Text style={[s.headerTitle, { color: textColor }]}>Apply Leave</Text>
                            <Text style={[s.headerSubtitle, { color: subtextColor }]}>Submit attendance permit or leave request</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} disabled={isSubmitting} style={[s.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                            <PlatformIcon name="xmark" size={16} tintColor={subtextColor} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                        {/* Auto-Calculated Annual Leave Balance Card */}
                        <View style={[s.infoCard, { backgroundColor: isDark ? 'rgba(14,165,233,0.12)' : 'rgba(14,165,233,0.08)' }]}>
                            <PlatformIcon name="calendar.badge.clock" size={20} tintColor={clockBlue} />
                            <View style={s.warningContent}>
                                <Text style={[s.infoTitle, { color: clockBlue }]}>Annual Leave Balance</Text>
                                <Text style={[s.infoText, { color: isDark ? '#BAE6FD' : '#0369A1' }]}>
                                    {remainingAnnualBalance > 0
                                        ? `${remainingAnnualBalance} of ${annualEntitlement} days remaining for ${currentYear} (${usedAnnualDays} days taken).`
                                        : `No balance remaining (0 of ${annualEntitlement} days left for ${currentYear}).`}
                                </Text>
                            </View>
                        </View>

                        {/* Leave Type Selection */}
                        <View style={s.section}>
                            <Text style={[s.sectionTitle, { color: textColor }]}>Leave Type</Text>
                            <View style={s.categoryList}>
                                {STANDARD_LEAVE_TYPES.map((typeItem) => {
                                    const isSelected = selectedLeaveTypeId === typeItem.id;
                                    const itemPolicy = policies.find((p) => p.leave_type === typeItem.id);
                                    const effectivePaid = itemPolicy?.is_paid !== undefined ? itemPolicy.is_paid : typeItem.isPaid;
                                    const effectiveEntitlement = itemPolicy?.entitlement_days ?? typeItem.defaultEntitlement;
                                    const effectiveNotice = itemPolicy?.min_notice_days !== undefined ? itemPolicy.min_notice_days : typeItem.minNoticeDays;

                                    return (
                                        <TouchableOpacity
                                            key={typeItem.id}
                                            style={[
                                                s.categoryCard,
                                                { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFF' },
                                                isSelected && { borderColor: clockBlue, borderWidth: 1.5 },
                                            ]}
                                            onPress={() => {
                                                setSelectedLeaveTypeId(typeItem.id);
                                            }}
                                        >
                                            <View style={s.categoryRow}>
                                                <View style={s.categoryInfo}>
                                                    <View style={s.categoryTitleRow}>
                                                        <Text style={[s.categoryLabel, { color: textColor }, isSelected && { color: clockBlue }]}>
                                                            {typeItem.name}
                                                        </Text>
                                                        <View style={[s.paidTag, { backgroundColor: effectivePaid ? 'rgba(52,199,89,0.15)' : 'rgba(255,149,0,0.15)' }]}>
                                                            <Text style={[s.paidTagText, { color: effectivePaid ? '#34C759' : '#FF9500' }]}>
                                                                {effectivePaid ? 'Paid' : 'Unpaid'}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                    <Text style={[s.categoryDesc, { color: subtextColor }]}>
                                                        {typeItem.id === 'annual'
                                                            ? `${remainingAnnualBalance} days left • ${effectiveNotice > 0 ? `${effectiveNotice}d Notice` : 'Immediate'} • ${typeItem.description}`
                                                            : `${effectiveEntitlement} Days / Cycle • ${effectiveNotice > 0 ? `${effectiveNotice}d Notice` : 'Immediate'} • ${typeItem.description}`}
                                                    </Text>
                                                </View>
                                                {isSelected && (
                                                    <PlatformIcon name="checkmark.circle.fill" size={20} tintColor={clockBlue} />
                                                )}
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>

                        {/* Subtypes (only for permission) */}
                        {isPermission && enabledSubtypes.length > 0 && (
                            <View style={s.section}>
                                <Text style={[s.sectionTitle, { color: textColor }]}>Permission Subtype</Text>
                                <View style={s.subtypeGrid}>
                                    {enabledSubtypes.map((st) => {
                                        const isSelected = (currentSubtype?.id || '') === st.id;
                                        return (
                                            <TouchableOpacity
                                                key={st.id}
                                                style={[
                                                    s.subtypePill,
                                                    { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFF' },
                                                    isSelected && { backgroundColor: 'rgba(14, 165, 233, 0.15)', borderColor: clockBlue, borderWidth: 1 },
                                                ]}
                                                onPress={() => setSelectedSubtypeId(st.id)}
                                            >
                                                <Text style={[s.subtypeLabel, { color: textColor }, isSelected && { color: clockBlue, fontWeight: '700' }]}>
                                                    {st.name} ({st.max_days}d)
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        )}

                        {/* Dates & Duration */}
                        <View style={s.section}>
                            <Text style={[s.sectionTitle, { color: textColor }]}>Dates & Duration</Text>
                            <View style={s.row}>
                                <View style={{ flex: 1, marginRight: isPermission && currentSubtype?.id === 'half_day' ? 0 : 12 }}>
                                    <Text style={[s.label, { color: subtextColor }]}>
                                        {isPermission && currentSubtype?.id === 'half_day' ? 'Date' : 'Start Date'}
                                    </Text>
                                    <TouchableOpacity 
                                        style={[s.dateTrigger, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFF' }]}
                                        onPress={() => setActiveDatePicker('start')}
                                    >
                                        <Text style={{ color: startDate ? textColor : subtextColor }}>
                                            {startDate ? format(new Date(startDate), 'yyyy-MM-dd') : 'YYYY-MM-DD'}
                                        </Text>
                                        <PlatformIcon name="calendar" size={14} tintColor={subtextColor} />
                                    </TouchableOpacity>
                                </View>

                                {!(isPermission && currentSubtype?.id === 'half_day') && (
                                    <View style={{ flex: 1 }}>
                                        <Text style={[s.label, { color: subtextColor }]}>End Date</Text>
                                        <TouchableOpacity 
                                            style={[s.dateTrigger, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFF' }]}
                                            onPress={() => {
                                                if (!startDate) {
                                                    Alert.alert('Start Date Required', 'Please select a start date first.');
                                                    return;
                                                }
                                                setActiveDatePicker('end');
                                            }}
                                        >
                                            <Text style={{ color: endDate ? textColor : subtextColor }}>
                                                {endDate ? format(new Date(endDate), 'yyyy-MM-dd') : 'YYYY-MM-DD'}
                                            </Text>
                                            <PlatformIcon name="calendar" size={14} tintColor={subtextColor} />
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>

                            {/* Notice Warning */}
                            {startDate && !isNoticeValid && minNotice > 0 && (
                                <View style={s.noticeWarning}>
                                    <PlatformIcon name="exclamationmark.triangle" size={14} tintColor="#FF9500" />
                                    <Text style={s.noticeWarningText}>
                                        Notice: Policy specifies a {minNotice}-day advance notice.
                                    </Text>
                                </View>
                            )}

                            {/* Insufficient Annual Leave Warning */}
                            {selectedLeaveTypeId === 'annual' && durationDays > remainingAnnualBalance && (
                                <View style={[s.noticeWarning, { backgroundColor: 'rgba(255,59,48,0.1)' }]}>
                                    <PlatformIcon name="exclamationmark.circle.fill" size={14} tintColor="#FF3B30" />
                                    <Text style={[s.noticeWarningText, { color: '#FF3B30' }]}>
                                        Requested duration ({durationDays} days) exceeds available balance ({remainingAnnualBalance} days).
                                    </Text>
                                </View>
                            )}

                            {durationDays > 0 && (
                                <View style={[s.durationCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFF' }]}>
                                    <Text style={[s.durationLabel, { color: subtextColor }]}>Total Duration</Text>
                                    <Text style={[s.durationVal, { color: clockBlue }]}>{durationDays} {durationDays === 1 ? 'Day' : 'Days'}</Text>
                                </View>
                            )}
                        </View>

                        {/* Supporting Document */}
                        {(currentPolicy?.evidence_mode !== 'disabled' || selectedLeaveTypeId === 'sick' || selectedLeaveTypeId === 'maternity_paternity') && (
                            <View style={s.section}>
                                <View style={s.sectionHeader}>
                                    <Text style={[s.sectionTitle, { color: textColor }]}>Supporting Document</Text>
                                    {isAttachmentRequired && (
                                        <Text style={s.requiredTag}>Required</Text>
                                    )}
                                </View>
                                <TouchableOpacity style={[s.uploadBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFF' }]} onPress={handlePickAttachment}>
                                    {attachment ? (
                                        <Image source={{ uri: attachment.uri }} style={s.previewImg} />
                                    ) : (
                                        <>
                                            <PlatformIcon name="doc.fill" size={24} tintColor={subtextColor} />
                                            <Text style={[s.uploadText, { color: subtextColor }]}>
                                                {selectedLeaveTypeId === 'sick'
                                                    ? "Upload Doctor's Note / Medical Certificate"
                                                    : 'Upload Supporting Document / Photo'}
                                            </Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                                {attachment && (
                                    <TouchableOpacity onPress={() => setAttachment(null)} style={s.removeAttachmentBtn}>
                                        <Text style={s.removeAttachmentText}>Remove Attachment</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}

                        {/* Reason / Notes */}
                        <View style={s.section}>
                            <View style={s.sectionHeader}>
                                <Text style={[s.sectionTitle, { color: textColor }]}>Reason / Notes</Text>
                                {currentPolicy?.require_reason && (
                                    <Text style={s.requiredTag}>Required</Text>
                                )}
                            </View>
                            <TextInput
                                style={[s.textArea, { color: textColor, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFF' }]}
                                placeholder="Please explain the reason for this leave request..."
                                placeholderTextColor={subtextColor}
                                multiline
                                numberOfLines={4}
                                value={notes}
                                onChangeText={setNotes}
                            />
                        </View>
                    </ScrollView>

                    {/* Sticky Footer */}
                    <View style={s.footer}>
                        <TouchableOpacity
                            style={[s.submitBtn, { backgroundColor: clockBlue, opacity: isSubmitting ? 0.6 : 1 }]}
                            onPress={handleSubmit}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <Text style={s.submitBtnText}>Submit Request</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Liquid Date Picker Modal */}
                    <LiquidDatePicker
                        visible={!!activeDatePicker}
                        onClose={() => setActiveDatePicker(null)}
                        onSelect={(date) => {
                            if (activeDatePicker === 'start') {
                                setStartDate(date);
                                if (endDate && new Date(date) > new Date(endDate)) {
                                    setEndDate('');
                                }
                            } else {
                                setEndDate(date);
                            }
                        }}
                        currentDate={activeDatePicker === 'end' ? endDate || startDate : startDate || undefined}
                        title={activeDatePicker === 'start' ? 'Select Start Date' : 'Select End Date'}
                    />
                </GlassView>
            </View>
        </Modal>
    );
}

const s = StyleSheet.create({
    drawerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end', paddingHorizontal: Platform.OS === 'ios' ? 8 : 0, paddingBottom: Platform.OS === 'ios' ? 8 : 0 },
    drawerContentSheet: { height: '90%', borderRadius: Platform.OS === 'ios' ? 56 : 40, borderBottomLeftRadius: Platform.OS === 'ios' ? 56 : 0, borderBottomRightRadius: Platform.OS === 'ios' ? 56 : 0, overflow: 'hidden' },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 28,
        paddingTop: 28,
        paddingBottom: 12,
    },
    headerTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
    headerSubtitle: { fontSize: 13, marginTop: 2 },
    closeBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    scrollContent: { paddingHorizontal: 28, paddingTop: 8, paddingBottom: 40 },
    section: { marginBottom: 24 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    sectionTitle: { fontSize: 13, fontWeight: '700', marginBottom: 10 },
    requiredTag: { fontSize: 11, fontWeight: '700', color: '#FF3B30' },
    warningContent: { flex: 1 },
    infoCard: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: 18, marginBottom: 20, alignItems: 'center' },
    infoTitle: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
    infoText: { fontSize: 12, lineHeight: 16 },
    categoryList: { gap: 10 },
    categoryCard: { padding: 16, borderRadius: 20, borderWidth: 1, borderColor: 'transparent' },
    categoryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    categoryInfo: { flex: 1, marginRight: 16 },
    categoryTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    categoryLabel: { fontSize: 15, fontWeight: '700' },
    paidTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    paidTagText: { fontSize: 10, fontWeight: '700' },
    categoryDesc: { fontSize: 12, marginTop: 4, lineHeight: 16 },
    subtypeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    subtypePill: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 24, borderWidth: 1, borderColor: 'transparent' },
    subtypeLabel: { fontSize: 13, fontWeight: '600' },
    row: { flexDirection: 'row' },
    label: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
    dateTrigger: { height: 48, borderRadius: 24, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    noticeWarning: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, backgroundColor: 'rgba(255,149,0,0.1)', padding: 10, borderRadius: 12 },
    noticeWarningText: { flex: 1, fontSize: 11, color: '#FF9500', fontWeight: '600' },
    durationCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 16, marginTop: 12 },
    durationLabel: { fontSize: 13, fontWeight: '600' },
    durationVal: { fontSize: 15, fontWeight: '800' },
    uploadBox: { height: 120, borderRadius: 20, borderStyle: 'dashed', borderWidth: 1, borderColor: '#8E8E93', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    uploadText: { fontSize: 13, fontWeight: '600', marginTop: 8 },
    previewImg: { width: '100%', height: '100%' },
    removeAttachmentBtn: { marginTop: 8, alignItems: 'center' },
    removeAttachmentText: { color: '#FF3B30', fontSize: 13, fontWeight: '600' },
    textArea: { minHeight: 100, borderRadius: 20, padding: 16, fontSize: 14, lineHeight: 20, textAlignVertical: 'top' },
    footer: { paddingHorizontal: 28, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 36 : 24 },
    submitBtn: { height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
    submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' }
});
