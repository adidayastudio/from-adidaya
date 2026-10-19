import React, { useState, useEffect, useMemo } from 'react';
import {
    StyleSheet,
    View,
    Text,
    Modal,
    TouchableOpacity,
    TextInput,
    ScrollView,
    ActivityIndicator,
    Alert,
    Platform,
    Image,
} from 'react-native';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { format } from 'date-fns';
import { useTheme } from '@/context/ThemeContext';
import { useUserContext } from '@/context/UserProvider';
import { useTenantContext } from '@/context/TenantContext';
import { supabase } from '@/lib/supabase';
import {
    AttendanceRecord,
    createCorrectionRequest,
    uploadCrewFileBase64,
    CorrectionFieldType,
} from '@/lib/api/attendance';
import {
    getClockSetting,
    DEFAULT_ATTENDANCE_CORRECTION,
    AttendanceCorrectionConfig,
} from '@/lib/api/clockSetup';

export interface AttendanceCorrectionModalProps {
    visible: boolean;
    onClose: () => void;
    record: AttendanceRecord | null;
    onSuccess?: () => void;
}

interface LocationOption {
    id: string;
    code: string;
    name: string;
    type: 'office' | 'remote' | 'project';
    address?: string;
}

function formatLocationAddress(loc: any): string {
    if (!loc) return 'Project Site';
    if (typeof loc === 'string') return loc;
    if (typeof loc === 'object') {
        if (typeof loc.address === 'string' && loc.address) return loc.address;
        if (typeof loc.name === 'string' && loc.name) return loc.name;
        if (typeof loc.latitude === 'number' && typeof loc.longitude === 'number') {
            const rad = loc.radius ? ` · ${loc.radius}m` : '';
            return `${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}${rad}`;
        }
        if (loc.type) {
            return `Geofence (${loc.type})`;
        }
    }
    return 'Project Site';
}

const STATUS_OPTIONS = [
    { value: 'ontime', label: 'On-Time' },
    { value: 'intime', label: 'In-Time (Flexible)' },
    { value: 'late', label: 'Late' },
    { value: 'sick', label: 'Sick' },
    { value: 'leave', label: 'Leave / Permission' },
    { value: 'absent', label: 'Absent' },
    { value: 'weekend', label: 'Weekend' },
    { value: 'holiday', label: 'Holiday' },
];

export function AttendanceCorrectionModal({
    visible,
    onClose,
    record,
    onSuccess,
}: AttendanceCorrectionModalProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';
    const cardBg = isDark ? '#1C1C1E' : '#FFFFFF';
    const inputBg = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)';
    const borderColor = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)';
    const clockBlue = '#0EA5E9';

    const { user, profile } = useUserContext();
    const { activeTenant } = useTenantContext();

    const [policy, setPolicy] = useState<AttendanceCorrectionConfig>(DEFAULT_ATTENDANCE_CORRECTION);

    // Dynamic database work locations
    const [locations, setLocations] = useState<LocationOption[]>([]);
    const [loadingLocations, setLoadingLocations] = useState(false);

    // Multi-field correction states
    const [editClockIn, setEditClockIn] = useState(true);
    const [editClockOut, setEditClockOut] = useState(false);
    const [editLocation, setEditLocation] = useState(false);
    const [editStatus, setEditStatus] = useState(false);

    const [clockInTime, setClockInTime] = useState('08:30');
    const [clockOutTime, setClockOutTime] = useState('17:30');
    const [selectedLocation, setSelectedLocation] = useState('office_hq');
    const [selectedStatus, setSelectedStatus] = useState('ontime');

    const [reason, setReason] = useState('');
    const [attachment, setAttachment] = useState<ImagePicker.ImagePickerAsset | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Time picker sheet state
    const [timePickerTarget, setTimePickerTarget] = useState<'in' | 'out' | null>(null);
    const [tempHour, setTempHour] = useState('08');
    const [tempMinute, setTempMinute] = useState('30');

    // Load policy from setup
    useEffect(() => {
        if (visible) {
            getClockSetting('ATTENDANCE_CORRECTIONS', DEFAULT_ATTENDANCE_CORRECTION, activeTenant?.id).then((cfg) => {
                setPolicy(cfg);
            });
        }
    }, [visible, activeTenant?.id]);

    // Load real database projects & tenant office
    useEffect(() => {
        if (!visible) return;

        async function fetchRealLocations() {
            setLoadingLocations(true);
            const list: LocationOption[] = [];

            // 1. Tenant Headquarters
            const hqName = activeTenant?.branding_name || activeTenant?.name || 'Headquarters';
            list.push({
                id: 'office_hq',
                code: 'HQ',
                name: `${hqName} (HQ)`,
                type: 'office',
                address: 'Main Office',
            });

            // 2. Real Remote Modes
            list.push({
                id: 'remote_wfh',
                code: 'WFH',
                name: 'Remote (WFH - Work From Home)',
                type: 'remote',
                address: 'Home / Residential Work',
            });
            list.push({
                id: 'remote_wfa',
                code: 'WFA',
                name: 'Remote (WFA - Work From Anywhere)',
                type: 'remote',
                address: 'Flexible Remote Location',
            });

            // 3. Registered Projects from Database
            try {
                let query = supabase.from('projects').select('id, project_name, project_code, location');
                if (activeTenant?.id) {
                    query = query.eq('tenant_id', activeTenant.id);
                }
                const { data, error } = await query.order('project_name', { ascending: true });
                if (!error && Array.isArray(data) && data.length > 0) {
                    data.forEach((p) => {
                        list.push({
                            id: p.id,
                            code: p.project_code || p.id,
                            name: `${p.project_code ? `${p.project_code} - ` : ''}${p.project_name}`,
                            type: 'project',
                            address: formatLocationAddress(p.location),
                        });
                    });
                }
            } catch (err) {
                console.warn('[AttendanceCorrection] Failed to fetch db projects:', err);
            }

            setLocations(list);
            setLoadingLocations(false);
        }

        fetchRealLocations();
    }, [visible, activeTenant?.id, activeTenant?.name, activeTenant?.branding_name]);

    // Initialize values when record is provided
    useEffect(() => {
        if (visible && record) {
            setReason('');
            setAttachment(null);
            setIsSubmitting(false);

            // Default check toggles
            setEditClockIn(true);
            setEditClockOut(Boolean(record.clockOut));
            setEditLocation(false);
            setEditStatus(false);

            // Populate Clock-in
            if (record.clockIn) {
                try {
                    setClockInTime(format(new Date(record.clockIn), 'HH:mm'));
                } catch {
                    setClockInTime('08:30');
                }
            } else {
                setClockInTime('08:30');
            }

            // Populate Clock-out
            if (record.clockOut) {
                try {
                    setClockOutTime(format(new Date(record.clockOut), 'HH:mm'));
                } catch {
                    setClockOutTime('17:30');
                }
            } else {
                setClockOutTime('17:30');
            }

            // Populate Location & Status
            setSelectedLocation(record.checkInLocationCode || 'office_hq');
            setSelectedStatus(record.status || 'ontime');
        }
    }, [visible, record]);

    // Original formatted values for summary
    const originalClockIn = useMemo(() => {
        if (!record?.clockIn) return 'Not Clocked In';
        try {
            return format(new Date(record.clockIn), 'HH:mm');
        } catch {
            return record.clockIn;
        }
    }, [record?.clockIn]);

    const originalClockOut = useMemo(() => {
        if (!record?.clockOut) return 'Not Clocked Out';
        try {
            return format(new Date(record.clockOut), 'HH:mm');
        } catch {
            return record.clockOut;
        }
    }, [record?.clockOut]);

    const originalLocationName = useMemo(() => {
        if (!record?.checkInLocationCode) return '—';
        const matched = locations.find((l) => l.code === record.checkInLocationCode || l.id === record.checkInLocationCode);
        return matched?.name || record.checkInLocationCode || '—';
    }, [record?.checkInLocationCode, locations]);

    const originalStatusLabel = useMemo(() => {
        const found = STATUS_OPTIONS.find((s) => s.value === record?.status);
        return found?.label || record?.status || 'On-Time';
    }, [record?.status]);

    const openTimePicker = (target: 'in' | 'out') => {
        const currentVal = target === 'in' ? clockInTime : clockOutTime;
        const [h, m] = currentVal.split(':');
        setTempHour(h || '08');
        setTempMinute(m || '30');
        setTimePickerTarget(target);
    };

    const confirmTimePicker = () => {
        const timeStr = `${tempHour.padStart(2, '0')}:${tempMinute.padStart(2, '0')}`;
        if (timePickerTarget === 'in') {
            setClockInTime(timeStr);
            setEditClockIn(true);
        } else if (timePickerTarget === 'out') {
            setClockOutTime(timeStr);
            setEditClockOut(true);
        }
        setTimePickerTarget(null);
    };

    const handlePickEvidence = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Camera roll access is needed to attach evidence.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.8,
            base64: true,
        });

        if (!result.canceled && result.assets && result.assets[0]) {
            setAttachment(result.assets[0]);
        }
    };

    const handleSubmit = async () => {
        if (!record) return;

        // Ensure at least one field is selected for correction
        const fieldsToCorrect: Array<{ type: CorrectionFieldType; original: string; requested: string }> = [];

        if (editClockIn) {
            fieldsToCorrect.push({
                type: 'clock_in',
                original: originalClockIn,
                requested: clockInTime,
            });
        }
        if (editClockOut) {
            fieldsToCorrect.push({
                type: 'clock_out',
                original: originalClockOut,
                requested: clockOutTime,
            });
        }
        if (editLocation) {
            const locName = locations.find((l) => l.id === selectedLocation || l.code === selectedLocation)?.name || selectedLocation;
            fieldsToCorrect.push({
                type: 'work_location',
                original: originalLocationName,
                requested: locName,
            });
        }
        if (editStatus) {
            const stLabel = STATUS_OPTIONS.find((s) => s.value === selectedStatus)?.label || selectedStatus;
            fieldsToCorrect.push({
                type: 'attendance_status',
                original: originalStatusLabel,
                requested: stLabel,
            });
        }

        if (fieldsToCorrect.length === 0) {
            Alert.alert('No Changes Selected', 'Please enable at least one field to request a correction for.');
            return;
        }

        if (policy.requireReason && !reason.trim()) {
            Alert.alert('Reason Required', 'Please provide a clear justification for this attendance correction.');
            return;
        }

        if (policy.evidenceAttachment === 'required' && !attachment) {
            Alert.alert('Evidence Required', 'Please attach a supporting photo or screenshot for this correction.');
            return;
        }

        setIsSubmitting(true);
        try {
            let uploadedUrl: string | undefined = undefined;
            if (attachment?.base64) {
                const ext = attachment.uri.split('.').pop() || 'jpg';
                uploadedUrl = await uploadCrewFileBase64(
                    attachment.base64,
                    ext,
                    `image/${ext}`,
                    'attendance_corrections'
                );
            }

            const isAutoApproved = !policy.requireApproval;
            const userId = user?.id || record.userId || '00000000-0000-0000-0000-000000000000';
            const userName = profile?.full_name || record.userName || 'Employee';

            // Submit all requested corrections concurrently
            await Promise.all(
                fieldsToCorrect.map((item) =>
                    createCorrectionRequest({
                        userId,
                        userName,
                        attendanceRecordId: record.summaryPending ? undefined : record.id,
                        attendanceDate: record.date,
                        correctionType: item.type,
                        originalValue: item.original,
                        requestedValue: item.requested,
                        reason: reason.trim(),
                        evidenceUrl: uploadedUrl,
                        status: isAutoApproved ? 'approved' : 'pending',
                    })
                )
            );

            Alert.alert('Correction Submitted', 'Your attendance correction request has been submitted successfully.');
            onSuccess?.();
            onClose();
        } catch (e: any) {
            Alert.alert('Submission Failed', e.message || 'Unable to submit correction request.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!record) return null;

    const formattedDate = format(new Date(record.date), 'EEEE, d MMMM yyyy');

    const hoursList = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
    const minutesList = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={s.overlay}>
                <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
                <View style={[s.modalCard, { backgroundColor: cardBg }]}>
                    {/* Header */}
                    <View style={s.headerRow}>
                        <View>
                            <Text style={[s.titleText, { color: textColor }]}>Request Correction</Text>
                            <Text style={[s.subtitleText, { color: subtextColor }]}>{formattedDate}</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={s.closeBtn}>
                            <PlatformIcon name="xmark" size={16} tintColor={subtextColor} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={s.formBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        {/* Current Record Summary Box */}
                        <View style={[s.summaryBox, { backgroundColor: inputBg, borderColor }]}>
                            <Text style={[s.summaryTitle, { color: subtextColor }]}>Current Attendance Record</Text>
                            <View style={s.summaryGrid}>
                                <View style={s.summaryItem}>
                                    <Text style={[s.summaryLabel, { color: subtextColor }]}>Clock-in</Text>
                                    <Text style={[s.summaryVal, { color: textColor }]}>{originalClockIn}</Text>
                                </View>
                                <View style={s.summaryItem}>
                                    <Text style={[s.summaryLabel, { color: subtextColor }]}>Clock-out</Text>
                                    <Text style={[s.summaryVal, { color: textColor }]}>{originalClockOut}</Text>
                                </View>
                                <View style={s.summaryItem}>
                                    <Text style={[s.summaryLabel, { color: subtextColor }]}>Location</Text>
                                    <Text style={[s.summaryVal, { color: textColor }]} numberOfLines={1}>{originalLocationName}</Text>
                                </View>
                                <View style={s.summaryItem}>
                                    <Text style={[s.summaryLabel, { color: subtextColor }]}>Status</Text>
                                    <Text style={[s.summaryVal, { color: textColor }]}>{originalStatusLabel}</Text>
                                </View>
                            </View>
                        </View>

                        {/* Multi-Field Section: Editable Correction Items */}
                        <Text style={[s.fieldHeading, { color: textColor }]}>Fields to Correct</Text>
                        <Text style={[s.fieldSubheading, { color: subtextColor }]}>
                            Select and update all records needed for this day in one request.
                        </Text>

                        {/* 1. Clock-in Time */}
                        <View style={[s.correctionCard, { backgroundColor: inputBg, borderColor: editClockIn ? clockBlue : borderColor }]}>
                            <TouchableOpacity
                                style={s.cardHeaderToggle}
                                onPress={() => setEditClockIn(!editClockIn)}
                                activeOpacity={0.7}
                            >
                                <View style={s.toggleRow}>
                                    <View style={[s.checkboxPill, editClockIn && { backgroundColor: clockBlue, borderColor: clockBlue }]}>
                                        {editClockIn && <PlatformIcon name="checkmark" size={12} tintColor="#FFFFFF" />}
                                    </View>
                                    <Text style={[s.toggleTitle, { color: textColor }]}>Clock-in Time</Text>
                                </View>
                                <Text style={[s.originalSmall, { color: subtextColor }]}>Current: {originalClockIn}</Text>
                            </TouchableOpacity>

                            {editClockIn && (
                                <View style={s.pickerRow}>
                                    <Text style={[s.pickerLabel, { color: subtextColor }]}>Requested Time:</Text>
                                    <TouchableOpacity
                                        style={[s.timePickerPill, { borderColor: clockBlue }]}
                                        onPress={() => openTimePicker('in')}
                                    >
                                        <PlatformIcon name="clock.fill" size={15} tintColor={clockBlue} />
                                        <Text style={[s.timePickerText, { color: textColor }]}>{clockInTime}</Text>
                                        <PlatformIcon name="chevron.down" size={12} tintColor={subtextColor} />
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>

                        {/* 2. Clock-out Time */}
                        <View style={[s.correctionCard, { backgroundColor: inputBg, borderColor: editClockOut ? clockBlue : borderColor }]}>
                            <TouchableOpacity
                                style={s.cardHeaderToggle}
                                onPress={() => setEditClockOut(!editClockOut)}
                                activeOpacity={0.7}
                            >
                                <View style={s.toggleRow}>
                                    <View style={[s.checkboxPill, editClockOut && { backgroundColor: clockBlue, borderColor: clockBlue }]}>
                                        {editClockOut && <PlatformIcon name="checkmark" size={12} tintColor="#FFFFFF" />}
                                    </View>
                                    <Text style={[s.toggleTitle, { color: textColor }]}>Clock-out Time</Text>
                                </View>
                                <Text style={[s.originalSmall, { color: subtextColor }]}>Current: {originalClockOut}</Text>
                            </TouchableOpacity>

                            {editClockOut && (
                                <View style={s.pickerRow}>
                                    <Text style={[s.pickerLabel, { color: subtextColor }]}>Requested Time:</Text>
                                    <TouchableOpacity
                                        style={[s.timePickerPill, { borderColor: clockBlue }]}
                                        onPress={() => openTimePicker('out')}
                                    >
                                        <PlatformIcon name="clock.fill" size={15} tintColor={clockBlue} />
                                        <Text style={[s.timePickerText, { color: textColor }]}>{clockOutTime}</Text>
                                        <PlatformIcon name="chevron.down" size={12} tintColor={subtextColor} />
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>

                        {/* 3. Work Location */}
                        <View style={[s.correctionCard, { backgroundColor: inputBg, borderColor: editLocation ? clockBlue : borderColor }]}>
                            <TouchableOpacity
                                style={s.cardHeaderToggle}
                                onPress={() => setEditLocation(!editLocation)}
                                activeOpacity={0.7}
                            >
                                <View style={s.toggleRow}>
                                    <View style={[s.checkboxPill, editLocation && { backgroundColor: clockBlue, borderColor: clockBlue }]}>
                                        {editLocation && <PlatformIcon name="checkmark" size={12} tintColor="#FFFFFF" />}
                                    </View>
                                    <Text style={[s.toggleTitle, { color: textColor }]}>Work Location</Text>
                                </View>
                                <Text style={[s.originalSmall, { color: subtextColor }]} numberOfLines={1}>Current: {originalLocationName}</Text>
                            </TouchableOpacity>

                            {editLocation && (
                                <View style={s.locationOptionsWrapper}>
                                    <Text style={[s.pickerLabel, { color: subtextColor, marginBottom: 8 }]}>Select Location / Mode:</Text>
                                    {loadingLocations ? (
                                        <ActivityIndicator size="small" color={clockBlue} style={{ marginVertical: 10 }} />
                                    ) : (
                                        <View style={s.locationPillList}>
                                            {locations.map((loc) => {
                                                const isSel = selectedLocation === loc.id || selectedLocation === loc.code;
                                                return (
                                                    <TouchableOpacity
                                                        key={loc.id}
                                                        style={[
                                                            s.locationPill,
                                                            {
                                                                backgroundColor: isSel ? 'rgba(14, 165, 233, 0.15)' : (isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF'),
                                                                borderColor: isSel ? clockBlue : borderColor,
                                                            },
                                                        ]}
                                                        onPress={() => setSelectedLocation(loc.id)}
                                                    >
                                                        <PlatformIcon
                                                            name={loc.type === 'remote' ? 'house.fill' : loc.type === 'project' ? 'building.2.fill' : 'building.fill'}
                                                            size={14}
                                                            tintColor={isSel ? clockBlue : subtextColor}
                                                        />
                                                        <View style={{ flex: 1 }}>
                                                            <Text style={[s.locationPillTitle, { color: isSel ? clockBlue : textColor }]}>
                                                                {loc.name}
                                                            </Text>
                                                            {loc.address ? (
                                                                <Text style={[s.locationPillSubtitle, { color: subtextColor }]}>
                                                                    {typeof loc.address === 'string' ? loc.address : formatLocationAddress(loc.address)}
                                                                </Text>
                                                            ) : null}
                                                        </View>
                                                        {isSel && <PlatformIcon name="checkmark.circle.fill" size={16} tintColor={clockBlue} />}
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                    )}
                                </View>
                            )}
                        </View>

                        {/* 4. Attendance Status */}
                        <View style={[s.correctionCard, { backgroundColor: inputBg, borderColor: editStatus ? clockBlue : borderColor }]}>
                            <TouchableOpacity
                                style={s.cardHeaderToggle}
                                onPress={() => setEditStatus(!editStatus)}
                                activeOpacity={0.7}
                            >
                                <View style={s.toggleRow}>
                                    <View style={[s.checkboxPill, editStatus && { backgroundColor: clockBlue, borderColor: clockBlue }]}>
                                        {editStatus && <PlatformIcon name="checkmark" size={12} tintColor="#FFFFFF" />}
                                    </View>
                                    <Text style={[s.toggleTitle, { color: textColor }]}>Attendance Status</Text>
                                </View>
                                <Text style={[s.originalSmall, { color: subtextColor }]}>Current: {originalStatusLabel}</Text>
                            </TouchableOpacity>

                            {editStatus && (
                                <View style={s.statusPillsRow}>
                                    {STATUS_OPTIONS.map((st) => {
                                        const isSel = selectedStatus === st.value;
                                        return (
                                            <TouchableOpacity
                                                key={st.value}
                                                style={[
                                                    s.statusPillItem,
                                                    {
                                                        backgroundColor: isSel ? clockBlue : (isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF'),
                                                        borderColor: isSel ? clockBlue : borderColor,
                                                    },
                                                ]}
                                                onPress={() => setSelectedStatus(st.value)}
                                            >
                                                <Text style={[s.statusPillItemText, { color: isSel ? '#FFFFFF' : textColor }]}>
                                                    {st.label}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            )}
                        </View>

                        {/* Reason / Justification */}
                        <Text style={[s.fieldHeading, { color: textColor, marginTop: 16 }]}>Reason / Justification</Text>
                        <TextInput
                            style={[s.pillTextArea, { backgroundColor: inputBg, color: textColor, borderColor }]}
                            value={reason}
                            onChangeText={setReason}
                            placeholder="Explain why this correction is needed..."
                            placeholderTextColor={subtextColor}
                            multiline
                            numberOfLines={3}
                        />

                        {/* Evidence Attachment (Full pill / Clock Blue) */}
                        <TouchableOpacity
                            style={[
                                s.attachPillBtn,
                                {
                                    backgroundColor: isDark ? 'rgba(14, 165, 233, 0.12)' : 'rgba(14, 165, 233, 0.08)',
                                    borderColor: clockBlue,
                                },
                            ]}
                            onPress={handlePickEvidence}
                        >
                            <PlatformIcon name="paperclip" size={17} tintColor={clockBlue} />
                            <Text style={[s.attachPillText, { color: clockBlue }]}>
                                {attachment ? 'Change Attached Document / Photo' : 'Attach Supporting Document / Photo'}
                            </Text>
                            {attachment && <Text style={s.attachedBadge}>✓ Ready</Text>}
                        </TouchableOpacity>

                        {/* Preview attached asset if present */}
                        {attachment && (
                            <View style={s.attachmentPreviewWrapper}>
                                <Image source={{ uri: attachment.uri }} style={s.attachmentPreviewImg} />
                                <TouchableOpacity onPress={() => setAttachment(null)} style={s.removeAttachmentBtn}>
                                    <Text style={s.removeAttachmentText}>Remove</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </ScrollView>

                    {/* Sticky Submit Button at bottom */}
                    <View style={[s.stickyFooter, { borderTopColor: borderColor }]}>
                        <TouchableOpacity
                            style={[s.fullPillSubmitBtn, { backgroundColor: clockBlue, opacity: isSubmitting ? 0.6 : 1 }]}
                            onPress={handleSubmit}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <Text style={s.fullPillSubmitBtnText}>Submit Correction Request</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Interactive Time Picker Sheet / Modal */}
                {timePickerTarget && (
                    <Modal visible transparent animationType="fade" onRequestClose={() => setTimePickerTarget(null)}>
                        <View style={s.timePickerOverlay}>
                            <View style={[s.timePickerCard, { backgroundColor: cardBg }]}>
                                <Text style={[s.timePickerTitle, { color: textColor }]}>
                                    Select {timePickerTarget === 'in' ? 'Clock-in' : 'Clock-out'} Time
                                </Text>
                                <Text style={[s.timePickerPreview, { color: clockBlue }]}>
                                    {tempHour.padStart(2, '0')} : {tempMinute.padStart(2, '0')}
                                </Text>

                                {/* Quick Presets */}
                                <View style={s.quickPresetRow}>
                                    {timePickerTarget === 'in' ? (
                                        ['08:00', '08:30', '09:00', '09:30'].map((preset) => (
                                            <TouchableOpacity
                                                key={preset}
                                                style={[s.presetPill, { borderColor: clockBlue }]}
                                                onPress={() => {
                                                    const [h, m] = preset.split(':');
                                                    setTempHour(h);
                                                    setTempMinute(m);
                                                }}
                                            >
                                                <Text style={[s.presetPillText, { color: clockBlue }]}>{preset}</Text>
                                            </TouchableOpacity>
                                        ))
                                    ) : (
                                        ['17:00', '17:30', '18:00', '18:30'].map((preset) => (
                                            <TouchableOpacity
                                                key={preset}
                                                style={[s.presetPill, { borderColor: clockBlue }]}
                                                onPress={() => {
                                                    const [h, m] = preset.split(':');
                                                    setTempHour(h);
                                                    setTempMinute(m);
                                                }}
                                            >
                                                <Text style={[s.presetPillText, { color: clockBlue }]}>{preset}</Text>
                                            </TouchableOpacity>
                                        ))
                                    )}
                                </View>

                                {/* Hour & Minute Selection Columns */}
                                <View style={s.columnsContainer}>
                                    <View style={s.columnWrapper}>
                                        <Text style={[s.columnHeader, { color: subtextColor }]}>Hour</Text>
                                        <ScrollView style={s.scrollColumn} showsVerticalScrollIndicator={false}>
                                            {hoursList.map((h) => {
                                                const isSel = tempHour === h;
                                                return (
                                                    <TouchableOpacity
                                                        key={h}
                                                        style={[
                                                            s.columnItem,
                                                            isSel && { backgroundColor: clockBlue, borderRadius: 999 },
                                                        ]}
                                                        onPress={() => setTempHour(h)}
                                                    >
                                                        <Text style={[s.columnItemText, { color: isSel ? '#FFFFFF' : textColor }]}>
                                                            {h}
                                                        </Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </ScrollView>
                                    </View>

                                    <Text style={[s.colonSeparator, { color: textColor }]}>:</Text>

                                    <View style={s.columnWrapper}>
                                        <Text style={[s.columnHeader, { color: subtextColor }]}>Minute</Text>
                                        <ScrollView style={s.scrollColumn} showsVerticalScrollIndicator={false}>
                                            {minutesList.map((m) => {
                                                const isSel = tempMinute === m;
                                                return (
                                                    <TouchableOpacity
                                                        key={m}
                                                        style={[
                                                            s.columnItem,
                                                            isSel && { backgroundColor: clockBlue, borderRadius: 999 },
                                                        ]}
                                                        onPress={() => setTempMinute(m)}
                                                    >
                                                        <Text style={[s.columnItemText, { color: isSel ? '#FFFFFF' : textColor }]}>
                                                            {m}
                                                        </Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </ScrollView>
                                    </View>
                                </View>

                                {/* Action Buttons */}
                                <View style={s.timePickerActions}>
                                    <TouchableOpacity
                                        style={[s.timePickerCancelBtn, { borderColor }]}
                                        onPress={() => setTimePickerTarget(null)}
                                    >
                                        <Text style={[s.timePickerCancelText, { color: subtextColor }]}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[s.timePickerSetBtn, { backgroundColor: clockBlue }]}
                                        onPress={confirmTimePicker}
                                    >
                                        <Text style={s.timePickerSetText}>Set Time</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>
                )}
            </View>
        </Modal>
    );
}

const s = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalCard: {
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        height: '90%',
        maxHeight: '92%',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    titleText: {
        fontSize: 20,
        fontWeight: '700',
    },
    subtitleText: {
        fontSize: 13,
        marginTop: 2,
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(142,142,147,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    formBody: {
        flex: 1,
    },
    stickyFooter: {
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 12 : 4,
        borderTopWidth: 1,
    },
    summaryBox: {
        padding: 14,
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 16,
    },
    summaryTitle: {
        fontSize: 11,
        fontWeight: '600',
        marginBottom: 8,
    },
    summaryGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    summaryItem: {
        flex: 1,
        marginRight: 6,
    },
    summaryLabel: {
        fontSize: 10,
        marginBottom: 2,
    },
    summaryVal: {
        fontSize: 12,
        fontWeight: '700',
    },
    fieldHeading: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 4,
    },
    fieldSubheading: {
        fontSize: 12,
        marginBottom: 12,
    },
    correctionCard: {
        borderRadius: 20,
        borderWidth: 1,
        padding: 14,
        marginBottom: 12,
    },
    cardHeaderToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    checkboxPill: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 1.5,
        borderColor: '#8E8E93',
        alignItems: 'center',
        justifyContent: 'center',
    },
    toggleTitle: {
        fontSize: 15,
        fontWeight: '600',
    },
    originalSmall: {
        fontSize: 12,
    },
    pickerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 12,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: 'rgba(142,142,147,0.1)',
    },
    pickerLabel: {
        fontSize: 12,
        fontWeight: '500',
    },
    timePickerPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1.5,
        backgroundColor: 'rgba(14, 165, 233, 0.08)',
    },
    timePickerText: {
        fontSize: 15,
        fontWeight: '700',
    },
    locationOptionsWrapper: {
        marginTop: 12,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: 'rgba(142,142,147,0.1)',
    },
    locationPillList: {
        gap: 8,
    },
    locationPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 999,
        borderWidth: 1,
    },
    locationPillTitle: {
        fontSize: 13,
        fontWeight: '600',
    },
    locationPillSubtitle: {
        fontSize: 11,
        marginTop: 1,
    },
    statusPillsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 12,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: 'rgba(142,142,147,0.1)',
    },
    statusPillItem: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
    },
    statusPillItemText: {
        fontSize: 13,
        fontWeight: '600',
    },
    pillTextArea: {
        minHeight: 80,
        borderRadius: 22,
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 14,
        lineHeight: 20,
        textAlignVertical: 'top',
        marginTop: 6,
        marginBottom: 14,
    },
    attachPillBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 999,
        borderWidth: 1,
        borderStyle: 'dashed',
        gap: 8,
        marginBottom: 14,
    },
    attachPillText: {
        fontSize: 13,
        fontWeight: '600',
    },
    attachedBadge: {
        fontSize: 11,
        color: '#34C759',
        fontWeight: '700',
    },
    attachmentPreviewWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 14,
        paddingHorizontal: 6,
    },
    attachmentPreviewImg: {
        width: 50,
        height: 50,
        borderRadius: 12,
    },
    removeAttachmentBtn: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 999,
        backgroundColor: 'rgba(255, 59, 48, 0.1)',
    },
    removeAttachmentText: {
        color: '#FF3B30',
        fontSize: 12,
        fontWeight: '600',
    },
    fullPillSubmitBtn: {
        height: 52,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 0,
        marginBottom: 0,
    },
    fullPillSubmitBtnText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
    timePickerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    timePickerCard: {
        width: '100%',
        maxWidth: 360,
        borderRadius: 28,
        padding: 20,
        alignItems: 'center',
    },
    timePickerTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 8,
    },
    timePickerPreview: {
        fontSize: 32,
        fontWeight: '800',
        letterSpacing: 1,
        marginBottom: 12,
    },
    quickPresetRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
    },
    presetPill: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
    },
    presetPillText: {
        fontSize: 12,
        fontWeight: '600',
    },
    columnsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 180,
        marginBottom: 20,
    },
    columnWrapper: {
        width: 90,
        height: '100%',
        alignItems: 'center',
    },
    columnHeader: {
        fontSize: 11,
        fontWeight: '600',
        marginBottom: 6,
    },
    scrollColumn: {
        width: '100%',
    },
    columnItem: {
        paddingVertical: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 2,
    },
    columnItemText: {
        fontSize: 16,
        fontWeight: '600',
    },
    colonSeparator: {
        fontSize: 24,
        fontWeight: '800',
        paddingHorizontal: 12,
        marginBottom: 10,
    },
    timePickerActions: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    timePickerCancelBtn: {
        flex: 1,
        height: 44,
        borderRadius: 999,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    timePickerCancelText: {
        fontSize: 14,
        fontWeight: '600',
    },
    timePickerSetBtn: {
        flex: 1,
        height: 44,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
    },
    timePickerSetText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
});
