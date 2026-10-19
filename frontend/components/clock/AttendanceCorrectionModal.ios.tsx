import React, { useState, useEffect, useMemo } from 'react';
import { Alert } from 'react-native';
import {
    Host,
    BottomSheet,
    Form,
    Section,
    TextField,
    Button,
    HStack,
    VStack,
    Spacer,
    Picker,
    DateTimePicker,
    LabeledContent,
    Text as SwiftUIText,
    Image,
} from '@expo/ui/swift-ui';
import {
    padding,
    frame,
    background,
    ignoreSafeArea,
    tint,
    cornerRadius,
    buttonStyle,
} from '@expo/ui/swift-ui/modifiers';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { format } from 'date-fns';
import { useTheme } from '@/context/ThemeContext';
import { useUserContext } from '@/context/UserProvider';
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
    DEFAULT_WORK_LOCATIONS,
    WorkLocationItem,
} from '@/lib/api/clockSetup';

export interface AttendanceCorrectionModalProps {
    visible: boolean;
    onClose: () => void;
    record: AttendanceRecord | null;
    onSuccess?: () => void;
}

const FIELD_OPTIONS: Array<{ key: CorrectionFieldType; label: string }> = [
    { key: 'clock_in', label: 'Clock-in Time' },
    { key: 'clock_out', label: 'Clock-out Time' },
    { key: 'work_location', label: 'Work Location' },
    { key: 'attendance_status', label: 'Attendance Status' },
];

const STATUS_OPTIONS = [
    { value: 'ontime', label: 'On-Time' },
    { value: 'intime', label: 'In-Time (Flexible)' },
    { value: 'late', label: 'Late' },
    { value: 'sick', label: 'Sick' },
    { value: 'leave', label: 'Leave / Permission' },
    { value: 'absent', label: 'Absent' },
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
    const clockBlue = '#0EA5E9';

    const { user, profile } = useUserContext();

    // Configuration
    const [policy, setPolicy] = useState<AttendanceCorrectionConfig>(DEFAULT_ATTENDANCE_CORRECTION);
    const [workLocations, setWorkLocations] = useState<WorkLocationItem[]>(DEFAULT_WORK_LOCATIONS);

    // Form states
    const [targetDate, setTargetDate] = useState<Date>(() => new Date());
    const [selectedFieldIdx, setSelectedFieldIdx] = useState(0);
    const [newTime, setNewTime] = useState<Date>(() => new Date());
    const [selectedLocationIdx, setSelectedLocationIdx] = useState(0);
    const [selectedStatusIdx, setSelectedStatusIdx] = useState(0);
    const [reason, setReason] = useState('');
    const [attachment, setAttachment] = useState<ImagePicker.ImagePickerAsset | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Load policy & locations
    useEffect(() => {
        if (visible) {
            getClockSetting('ATTENDANCE_CORRECTIONS', DEFAULT_ATTENDANCE_CORRECTION).then((cfg) => {
                setPolicy(cfg);
            });
            getClockSetting<WorkLocationItem[]>('WORK_LOCATIONS', DEFAULT_WORK_LOCATIONS).then((locs) => {
                if (Array.isArray(locs) && locs.length > 0) {
                    setWorkLocations(locs.filter(l => l.isActive !== false));
                }
            });
        }
    }, [visible]);

    const locationOptions = useMemo(() => {
        const list = workLocations.map((l) => ({
            code: l.code || l.name,
            name: l.name,
            address: l.address,
        }));
        if (record?.checkInLocationCode && !list.some((l) => l.code === record.checkInLocationCode)) {
            list.unshift({
                code: record.checkInLocationCode,
                name: record.checkInLocationCode,
                address: 'Registered Location',
            });
        }
        return list;
    }, [workLocations, record?.checkInLocationCode]);

    // Available fields based on policy
    const availableFields = useMemo(() => {
        const allowed = policy.allowedCorrectionTypes || ['clock_in', 'clock_out', 'work_location', 'attendance_status'];
        const list = FIELD_OPTIONS.filter((f) => allowed.includes(f.key));
        return list.length > 0 ? list : FIELD_OPTIONS;
    }, [policy.allowedCorrectionTypes]);

    const activeFieldKey = availableFields[selectedFieldIdx]?.key || 'clock_in';

    // Initialize values on record change
    useEffect(() => {
        if (visible) {
            setSelectedFieldIdx(0);
            setReason('');
            setAttachment(null);
            setIsSubmitting(false);

            if (record) {
                try {
                    setTargetDate(new Date(record.date));
                } catch {}

                const initialTime = new Date();
                if (record.clockIn) {
                    try {
                        const parsed = new Date(record.clockIn);
                        if (!isNaN(parsed.getTime())) initialTime.setHours(parsed.getHours(), parsed.getMinutes(), 0, 0);
                    } catch {}
                } else {
                    initialTime.setHours(8, 30, 0, 0);
                }
                setNewTime(initialTime);

                const locIdx = LOCATION_OPTIONS.findIndex((l) => l.code === record.checkInLocationCode);
                setSelectedLocationIdx(locIdx >= 0 ? locIdx : 0);

                const stIdx = STATUS_OPTIONS.findIndex((s) => s.value === record.status);
                setSelectedStatusIdx(stIdx >= 0 ? stIdx : 0);
            } else {
                setTargetDate(new Date());
                const initialTime = new Date();
                initialTime.setHours(8, 30, 0, 0);
                setNewTime(initialTime);
                setSelectedLocationIdx(0);
                setSelectedStatusIdx(0);
            }
        }
    }, [visible, record]);

    // Pick attachment
    const handlePickEvidence = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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

    // Calculate original and requested values
    const originalValue = useMemo(() => {
        if (!record) return 'Not Recorded / New Entry';
        if (activeFieldKey === 'clock_in') {
            if (!record.clockIn) return 'Not Clocked In';
            try {
                return format(new Date(record.clockIn), 'HH:mm');
            } catch {
                return record.clockIn;
            }
        }
        if (activeFieldKey === 'clock_out') {
            if (!record.clockOut) return 'Not Clocked Out';
            try {
                return format(new Date(record.clockOut), 'HH:mm');
            } catch {
                return record.clockOut;
            }
        }
        if (activeFieldKey === 'work_location') {
            return record.checkInLocationCode || '—';
        }
        if (activeFieldKey === 'attendance_status') {
            return record.status || 'ontime';
        }
        return '-';
    }, [record, activeFieldKey]);

    const requestedValue = useMemo(() => {
        if (activeFieldKey === 'clock_in' || activeFieldKey === 'clock_out') {
            return format(newTime, 'HH:mm');
        }
        if (activeFieldKey === 'work_location') {
            return locationOptions[selectedLocationIdx]?.code || 'JPF';
        }
        if (activeFieldKey === 'attendance_status') {
            return STATUS_OPTIONS[selectedStatusIdx]?.value || 'ontime';
        }
        return '';
    }, [activeFieldKey, newTime, locationOptions, selectedLocationIdx, selectedStatusIdx]);

    const effectiveDateStr = useMemo(() => {
        if (record?.date) return record.date;
        try {
            return format(targetDate, 'yyyy-MM-dd');
        } catch {
            return format(new Date(), 'yyyy-MM-dd');
        }
    }, [record, targetDate]);

    const handleSubmit = async () => {
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
            const newReq = await createCorrectionRequest({
                userId: user?.id || record?.userId || '00000000-0000-0000-0000-000000000000',
                userName: profile?.full_name || record?.userName || 'Employee',
                attendanceRecordId: record?.summaryPending ? undefined : record?.id,
                attendanceDate: effectiveDateStr,
                correctionType: activeFieldKey,
                originalValue,
                requestedValue,
                reason: reason.trim(),
                evidenceUrl: uploadedUrl,
                status: isAutoApproved ? 'approved' : 'pending',
            });

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onSuccess?.();
            onClose();
        } catch (e: any) {
            Alert.alert('Submission Failed', e.message || 'Unable to submit correction request.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const formattedDate = useMemo(() => {
        try {
            return format(new Date(effectiveDateStr), 'EEEE, d MMMM yyyy');
        } catch {
            return effectiveDateStr;
        }
    }, [effectiveDateStr]);

    return (
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet
                isOpened={visible}
                presentationDetents={[0.85]}
                presentationDragIndicator="hidden"
                onIsOpenedChange={(opened) => {
                    if (!opened) onClose();
                }}
            >
                <VStack
                    spacing={0}
                    modifiers={[
                        ignoreSafeArea({ edges: 'bottom' }),
                        background('clear'),
                        frame({ maxWidth: Infinity }),
                    ]}
                >
                    {/* Header */}
                    <HStack
                        alignment="center"
                        modifiers={[
                            padding({ top: 16, leading: 20, trailing: 20, bottom: 8 }),
                        ]}
                    >
                        <VStack alignment="leading" spacing={2}>
                            <SwiftUIText size={20} weight="bold" color={textColor}>
                                Request Correction
                            </SwiftUIText>
                            <SwiftUIText size={13} color={subtextColor}>
                                {formattedDate}
                            </SwiftUIText>
                        </VStack>
                        <Spacer />
                        <Button
                            systemImage="xmark"
                            role="cancel"
                            color="gray"
                            onPress={onClose}
                        />
                    </HStack>

                    {/* Form View */}
                    <Form>
                        {/* Section 1: Field Selection */}
                        <Section title="Correction Target">
                            <Picker
                                label="Field to Correct"
                                selectedIndex={selectedFieldIdx}
                                options={availableFields.map((f) => f.label)}
                                onOptionSelected={(e) => setSelectedFieldIdx(e.nativeEvent.index)}
                            />
                            <LabeledContent label="Original Value">
                                <SwiftUIText size={15} weight="medium" color={subtextColor}>
                                    {originalValue}
                                </SwiftUIText>
                            </LabeledContent>
                        </Section>

                        {/* Section 2: New Value */}
                        <Section title="Requested New Value">
                            {(activeFieldKey === 'clock_in' || activeFieldKey === 'clock_out') && (
                                <DateTimePicker
                                    title={`New ${activeFieldKey === 'clock_in' ? 'Clock-in' : 'Clock-out'} Time`}
                                    initialDate={newTime.toISOString()}
                                    displayedComponents="hourAndMinute"
                                    variant="compact"
                                    onDateSelected={(selectedDate) => setNewTime(selectedDate)}
                                />
                            )}

                            {activeFieldKey === 'work_location' && (
                                <Picker
                                    label="New Location"
                                    selectedIndex={selectedLocationIdx}
                                    options={locationOptions.map((l) => `${l.name} (${l.code})`)}
                                    onOptionSelected={(e) => setSelectedLocationIdx(e.nativeEvent.index)}
                                />
                            )}

                            {activeFieldKey === 'attendance_status' && (
                                <Picker
                                    label="New Status"
                                    selectedIndex={selectedStatusIdx}
                                    options={STATUS_OPTIONS.map((s) => s.label)}
                                    onOptionSelected={(e) => setSelectedStatusIdx(e.nativeEvent.index)}
                                />
                            )}
                        </Section>

                        {/* Section 3: Reason & Evidence */}
                        <Section title={policy.requireReason ? "Reason & Justification (Required)" : "Reason & Justification"}>
                            <TextField
                                defaultValue={reason}
                                onChangeText={(text) => setReason(text)}
                                placeholder="Explain why this correction is requested..."
                                autocorrection={false}
                            />
                            <Button
                                onPress={handlePickEvidence}
                                modifiers={[buttonStyle('plain')]}
                            >
                                <HStack alignment="center" spacing={8}>
                                    <Image systemName="paperclip" size={16} color={clockBlue} />
                                    <SwiftUIText size={15} color={clockBlue}>
                                        {attachment ? 'Change Evidence Photo' : 'Attach Supporting Photo'}
                                    </SwiftUIText>
                                    <Spacer />
                                    {attachment && (
                                        <SwiftUIText size={13} color="#34C759" weight="medium">
                                            ✓ Photo Attached
                                        </SwiftUIText>
                                    )}
                                </HStack>
                            </Button>
                        </Section>
                    </Form>

                    {/* Footer Action Buttons */}
                    <HStack
                        spacing={12}
                        modifiers={[
                            background('clear'),
                            padding({ top: 12, leading: 20, trailing: 20, bottom: 20 }),
                            frame({ maxWidth: Infinity }),
                        ]}
                    >
                        <Button
                            variant="glass"
                            color="gray"
                            onPress={onClose}
                        >
                            <HStack
                                modifiers={[
                                    frame({ maxWidth: Infinity }),
                                    frame({ height: 42 }),
                                ]}
                            >
                                <Spacer />
                                <SwiftUIText weight="semibold" size={17}>
                                    Cancel
                                </SwiftUIText>
                                <Spacer />
                            </HStack>
                        </Button>
                        <Button
                            variant="glassProminent"
                            color={clockBlue}
                            onPress={handleSubmit}
                            disabled={isSubmitting}
                        >
                            <HStack
                                modifiers={[
                                    frame({ maxWidth: Infinity }),
                                    frame({ height: 42 }),
                                ]}
                            >
                                <Spacer />
                                <SwiftUIText weight="semibold" size={17} color="#FFFFFF">
                                    {isSubmitting ? 'Submitting Request...' : 'Submit Correction'}
                                </SwiftUIText>
                                <Spacer />
                            </HStack>
                        </Button>
                    </HStack>
                </VStack>
            </BottomSheet>
        </Host>
    );
}
