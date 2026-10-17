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
import { format, differenceInCalendarDays, startOfToday } from 'date-fns';
import { useTheme } from '@/context/ThemeContext';
import { useUserContext } from '@/context/UserProvider';
import { submitLeaveRequest, fetchLeaveRequests, uploadClockFileBase64, LeaveType, LeaveRequest } from '@/lib/api/attendance';
import {
    LeavePolicy,
    fetchLeavePolicies,
    getEligibleLeavePolicies,
    calculateProratedAnnualLeave,
    PermissionSubtypeItem,
} from '@/lib/api/leavePolicies';

export interface LeaveRequestModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function LeaveRequestModal({ visible, onClose, onSuccess }: LeaveRequestModalProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';
    const blueColor = '#0EA5E9';

    const { user, profile } = useUserContext();

    // Policies loaded dynamically
    const [policies, setPolicies] = useState<LeavePolicy[]>([]);
    const [loadingPolicies, setLoadingPolicies] = useState(false);
    const [pastRequests, setPastRequests] = useState<LeaveRequest[]>([]);

    // Form states
    const [selectedPolicyIndex, setSelectedPolicyIndex] = useState(0);
    const [selectedSubtypeIndex, setSelectedSubtypeIndex] = useState(0);
    const [startDate, setStartDate] = useState<Date>(() => new Date());
    const [endDate, setEndDate] = useState<Date>(() => new Date());
    const [notes, setNotes] = useState('');
    const [attachment, setAttachment] = useState<ImagePicker.ImagePickerAsset | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch active & eligible policies when modal opens
    useEffect(() => {
        if (visible) {
            setSelectedPolicyIndex(0);
            setSelectedSubtypeIndex(0);
            const today = new Date();
            setStartDate(today);
            setEndDate(today);
            setNotes('');
            setAttachment(null);
            setIsSubmitting(false);

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

    // Active selected policy & leave type
    const selectedLeaveType = useMemo(() => {
        const types: Array<{ id: LeaveTypeCategory; name: string; apiType: LeaveType; defaultEntitlement: number }> = [
            { id: 'annual', name: 'Annual Leave', apiType: 'Annual Leave', defaultEntitlement: 12 },
            { id: 'sick', name: 'Sick Leave', apiType: 'Sick Leave', defaultEntitlement: 14 },
            { id: 'permission', name: 'Personal Permission', apiType: 'Permission', defaultEntitlement: 5 },
            { id: 'unpaid', name: 'Unpaid Leave', apiType: 'Unpaid Leave', defaultEntitlement: 30 },
            { id: 'maternity_paternity', name: 'Maternity / Paternity', apiType: 'Maternity Leave', defaultEntitlement: 90 },
        ];
        return types[selectedPolicyIndex] || types[0];
    }, [selectedPolicyIndex]);

    const currentPolicy = useMemo(() => {
        return policies.find((p) => p.leave_type === selectedLeaveType.id) || null;
    }, [policies, selectedLeaveType]);

    const isPermission = selectedLeaveType.id === 'permission';

    // Subtypes for permission policy
    const enabledSubtypes = useMemo<PermissionSubtypeItem[]>(() => {
        if (!isPermission || !currentPolicy?.permission_subtypes) return [];
        return currentPolicy.permission_subtypes.filter((st) => st.is_enabled);
    }, [isPermission, currentPolicy]);

    const currentSubtype = enabledSubtypes[selectedSubtypeIndex] || enabledSubtypes[0] || null;

    // Proration & balance for Annual Leave
    const annualLeaveCalculations = useMemo(() => {
        if (currentPolicy?.leave_type !== 'annual') return null;
        const joinDate = profile?.joinDate || profile?.join_date || null;
        return calculateProratedAnnualLeave(currentPolicy, joinDate);
    }, [currentPolicy, profile]);

    // Calculated days duration
    const calculatedDays = useMemo(() => {
        if (isPermission && currentSubtype?.id === 'half_day') {
            return 0.5;
        }
        const diff = differenceInCalendarDays(endDate, startDate);
        return Math.max(1, diff + 1);
    }, [startDate, endDate, isPermission, currentSubtype]);

    const mapPolicyToLeaveTypeApi = (policy: LeavePolicy | null): LeaveType => {
        if (!policy) return 'Annual Leave';
        switch (policy.leave_type) {
            case 'annual': return 'Annual Leave';
            case 'sick': return 'Sick Leave';
            case 'permission': return 'Permission';
            case 'unpaid': return 'Unpaid Leave';
            case 'maternity_paternity': return 'Maternity Leave';
            default: return 'Annual Leave';
        }
    };

    // Quota statistics (Used & Remaining in year and month)
    // Quota statistics (Used & Remaining in year and month)
    const quotaStats = useMemo(() => {
        if (!currentPolicy) {
            return {
                usedThisYear: 0,
                usedThisMonth: 0,
                usedInCycle: 0,
                totalCycleEntitlement: 0,
                remainingCycleQuota: 0,
                remainingMonthlyQuota: 0,
                isMonthlyCycle: false,
                isMonthlyLimited: false,
                monthlyLimit: 0,
                isExceeded: false,
            };
        }

        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth(); // 0-11
        const apiType = mapPolicyToLeaveTypeApi(currentPolicy);

        // Filter valid requests matching this type and active statuses
        const matched = pastRequests.filter((req) => {
            const st = String(req.status || '').toLowerCase();
            if (st === 'rejected' || st === 'cancelled') return false;
            if (req.type !== apiType) return false;
            if (isPermission && currentSubtype && req.subtype) {
                return (
                    req.subtype.toLowerCase() === currentSubtype.name.toLowerCase() ||
                    req.subtype === currentSubtype.id
                );
            }
            return true;
        });

        let usedThisYear = 0;
        let usedThisMonth = 0;

        matched.forEach((req) => {
            const reqStart = new Date(req.startDate);
            const reqEnd = new Date(req.endDate);
            if (isNaN(reqStart.getTime())) return;

            const days = req.subtype === 'half_day' ? 0.5 : Math.max(1, differenceInCalendarDays(reqEnd, reqStart) + 1);

            if (reqStart.getFullYear() === currentYear) {
                usedThisYear += days;
                if (reqStart.getMonth() === currentMonth) {
                    usedThisMonth += days;
                }
            }
        });

        const isMonthlyCycle = isPermission && currentSubtype
            ? (currentSubtype.quota_cycle === 'monthly')
            : (currentPolicy.quota_cycle === 'monthly');

        // Entitlement calculation
        const totalCycleEntitlement = isPermission && currentSubtype
            ? currentSubtype.max_days
            : currentPolicy.leave_type === 'annual' && annualLeaveCalculations?.isEligible && annualLeaveCalculations?.totalQuota !== undefined
            ? annualLeaveCalculations.totalQuota
            : currentPolicy.entitlement_days;

        const usedInCycle = isMonthlyCycle ? usedThisMonth : usedThisYear;
        const remainingCycleQuota = Math.max(0, totalCycleEntitlement - usedInCycle);

        const isMonthlyLimited =
            !isMonthlyCycle &&
            (isPermission && currentSubtype
                ? currentSubtype.max_days_per_month_mode === 'limited' && (currentSubtype.max_days_per_month ?? 0) > 0
                : currentPolicy.max_days_per_month_mode === 'limited' && (currentPolicy.max_days_per_month ?? 0) > 0);
        const monthlyLimit = isPermission && currentSubtype
            ? (currentSubtype.max_days_per_month ?? 0)
            : (currentPolicy.max_days_per_month ?? 0);
        const remainingMonthlyQuota = isMonthlyLimited
            ? Math.max(0, monthlyLimit - usedThisMonth)
            : isMonthlyCycle
            ? remainingCycleQuota
            : 9999;

        const isExceeded =
            calculatedDays > remainingCycleQuota ||
            (isMonthlyLimited && calculatedDays > remainingMonthlyQuota);

        return {
            usedThisYear,
            usedThisMonth,
            usedInCycle,
            totalCycleEntitlement,
            remainingCycleQuota,
            remainingMonthlyQuota,
            isMonthlyCycle,
            isMonthlyLimited,
            monthlyLimit,
            isExceeded,
        };
    }, [currentPolicy, pastRequests, isPermission, currentSubtype, annualLeaveCalculations, calculatedDays]);

    const handlePickAttachment = async () => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 0.7,
                base64: true,
            });

            if (!result.canceled && result.assets && result.assets[0]) {
                setAttachment(result.assets[0]);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
        } catch (e: any) {
            Alert.alert('Attachment Error', e.message || 'Could not pick image');
        }
    };

    const doSubmit = async () => {
        setIsSubmitting(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            let uploadedFileUrl: string | undefined = undefined;

            if (attachment?.base64) {
                const ext = attachment.uri.split('.').pop() || 'jpg';
                const fileName = `leave_${user?.id}_${Date.now()}.${ext}`;
                const uploadRes = await uploadClockFileBase64(
                    attachment.base64,
                    fileName,
                    attachment.mimeType || 'image/jpeg'
                );
                if (uploadRes) uploadedFileUrl = uploadRes;
            }

            const startStr = format(startDate, 'yyyy-MM-dd');
            const endStr = isPermission && currentSubtype?.id === 'half_day' ? startStr : format(endDate, 'yyyy-MM-dd');
            const apiType = mapPolicyToLeaveTypeApi(currentPolicy);

            const res = await submitLeaveRequest({
                userId: user!.id,
                type: apiType,
                subtype: isPermission ? (currentSubtype?.name || currentSubtype?.id) : undefined,
                startDate: startStr,
                endDate: endStr,
                reason: notes.trim() || currentPolicy!.name,
                fileUrl: uploadedFileUrl,
            });

            if (res.success || res.id) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert('Request Submitted', `Your "${currentPolicy!.name}" request has been submitted for review.`);
                onSuccess();
                onClose();
            } else {
                throw new Error(res.error || 'Failed to submit leave request.');
            }
        } catch (err: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Submission Failed', err.message || 'An error occurred while submitting.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmit = async () => {
        if (!user?.id) {
            Alert.alert('Authentication Error', 'You must be logged in to submit a request.');
            return;
        }

        if (!currentPolicy) {
            Alert.alert('Policy Error', 'No active leave policy selected.');
            return;
        }

        const isHalfDay = isPermission && currentSubtype?.id === 'half_day';
        if (endDate < startDate && !isHalfDay) {
            Alert.alert('Invalid Date Range', 'End date cannot be earlier than start date.');
            return;
        }

        // 1. Advance Notice Validation
        const minNotice = isPermission && currentSubtype
            ? (currentSubtype.min_notice_days ?? currentPolicy.min_notice_days ?? 0)
            : (currentPolicy.min_notice_days ?? 0);
        if (minNotice > 0) {
            const today = startOfToday();
            const daysNotice = differenceInCalendarDays(startDate, today);
            if (daysNotice < minNotice) {
                Alert.alert(
                    'Advance Notice Required',
                    `"${isPermission && currentSubtype ? currentSubtype.name : currentPolicy.name}" requires at least ${minNotice} day(s) advance notice before the leave start date.`
                );
                return;
            }
        }

        // 2. Annual Leave Strict Waiting Period / Balance Check
        if (currentPolicy.leave_type === 'annual') {
            if (annualLeaveCalculations && !annualLeaveCalculations.isEligible) {
                Alert.alert('Not Eligible Yet', annualLeaveCalculations.explanation);
                return;
            }
            if (calculatedDays > quotaStats.remainingCycleQuota) {
                Alert.alert(
                    'Annual Quota Exceeded',
                    `You have ${quotaStats.remainingCycleQuota} day(s) remaining of your ${quotaStats.totalCycleEntitlement} days annual leave quota.`
                );
                return;
            }
        }

        // 3. Reason Requirement Validation
        if (currentPolicy.require_reason && !notes.trim()) {
            Alert.alert('Reason Required', 'Please provide an explanation or reason for your leave request.');
            return;
        }

        // 4. Evidence Mode Validation
        const evidenceRequired =
            currentPolicy.evidence_mode === 'required' ||
            (currentPolicy.leave_type === 'sick' && calculatedDays > 2 && currentPolicy.evidence_mode !== 'disabled') ||
            (isPermission && currentSubtype?.evidence_mode === 'required');

        if (evidenceRequired && !attachment) {
            Alert.alert(
                'Supporting Document Required',
                currentPolicy.leave_type === 'sick'
                    ? 'Medical Certificate / Doctor letter is required for sick leave exceeding 2 days.'
                    : 'A supporting verification document / attachment is required for this request.'
            );
            return;
        }

        // 5. Non-Annual Leave Quota Exceeded Warning (Allows Force Submission)
        if (currentPolicy.leave_type !== 'annual' && quotaStats.isExceeded) {
            const periodLabel = quotaStats.isMonthlyCycle ? 'month' : 'year';
            const warningMsg =
                quotaStats.isMonthlyLimited && calculatedDays > quotaStats.remainingMonthlyQuota
                    ? `Your request (${calculatedDays} ${calculatedDays === 1 ? 'day' : 'days'}) exceeds your remaining monthly limit (${quotaStats.remainingMonthlyQuota} ${quotaStats.remainingMonthlyQuota === 1 ? 'day' : 'days'} left this month).\n\nDo you want to submit anyway for management review?`
                    : `Your request (${calculatedDays} ${calculatedDays === 1 ? 'day' : 'days'}) exceeds your remaining quota (${quotaStats.remainingCycleQuota} ${quotaStats.remainingCycleQuota === 1 ? 'day' : 'days'} remaining this ${periodLabel}).\n\nDo you want to submit anyway for management review?`;

            Alert.alert(
                'Quota Limit Warning',
                warningMsg,
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Submit Anyway', style: 'default', onPress: doSubmit },
                ]
            );
            return;
        }

        doSubmit();
    };

    const isWaitingPeriodIneligible =
        currentPolicy?.leave_type === 'annual' &&
        Boolean(annualLeaveCalculations && !annualLeaveCalculations.isEligible);

    const isPaid = Boolean(isPermission && currentSubtype ? currentSubtype.is_paid : currentPolicy?.is_paid);
    const minNotice = isPermission && currentSubtype
        ? (currentSubtype.min_notice_days ?? currentPolicy?.min_notice_days ?? 0)
        : (currentPolicy?.min_notice_days ?? 0);
    const noticeLabel = minNotice > 0 ? `${minNotice}d Notice` : 'Immediate';

    const daysNotice = differenceInCalendarDays(startDate, startOfToday());
    const isNoticeViolated = minNotice > 0 && daysNotice < minNotice;
    const noticeWarningText = isNoticeViolated
        ? `Requires at least ${minNotice} day(s) advance notice (${daysNotice <= 0 ? 'starting today' : `start date is in ${daysNotice} day(s)`})`
        : null;

    let durationWarningText: string | null = null;
    if (quotaStats.isExceeded) {
        if (quotaStats.isMonthlyLimited && calculatedDays > quotaStats.remainingMonthlyQuota) {
            durationWarningText = `Duration (${calculatedDays} ${calculatedDays === 1 ? 'day' : 'days'}) exceeds monthly limit (${quotaStats.remainingMonthlyQuota} ${quotaStats.remainingMonthlyQuota === 1 ? 'day' : 'days'} left this month)`;
        } else {
            const periodText = quotaStats.isMonthlyCycle ? 'this month' : 'quota';
            durationWarningText = `Duration (${calculatedDays} ${calculatedDays === 1 ? 'day' : 'days'}) exceeds remaining ${periodText} (${quotaStats.remainingCycleQuota} ${quotaStats.remainingCycleQuota === 1 ? 'day' : 'days'} remaining)`;
        }
    }

    const waitingPeriodWarningText =
        currentPolicy?.leave_type === 'annual' && annualLeaveCalculations && !annualLeaveCalculations.isEligible
            ? annualLeaveCalculations.explanation
            : null;

    const isMedicalType = currentPolicy?.leave_type === 'sick' || currentPolicy?.leave_type === 'maternity_paternity';
    const attachmentTitle = attachment
        ? 'Document Attached'
        : isMedicalType
        ? 'Doctor Letter / Medical Certificate'
        : 'Supporting File';

    const attachmentSubtext = attachment
        ? 'Ready to upload on submit'
        : currentPolicy?.leave_type === 'sick'
        ? 'Required for sick leave > 2 days'
        : currentPolicy?.leave_type === 'maternity_paternity'
        ? 'Doctor / hospital recommendation letter'
        : 'Supporting verification document';

    const policyOptions = [
        'Annual Leave',
        'Sick Leave',
        'Personal Permission',
        'Unpaid Leave',
        'Maternity / Paternity',
    ];

    const subtypeOptions = enabledSubtypes.length > 0 ? enabledSubtypes.map((st) => st.name) : ['Standard Permit'];

    const dividerColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(60,60,67,0.12)';

    return (
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet
                isOpened={visible}
                presentationDetents={[0.92]}
                presentationDragIndicator="hidden"
                onIsOpenedChange={(opened) => {
                    if (!opened) onClose();
                }}
            >
                <VStack spacing={0} modifiers={[
                    ignoreSafeArea({ edges: 'bottom' }),
                    background('clear'),
                    frame({ maxWidth: Infinity }),
                ]}>
                    {/* Header */}
                    <HStack alignment="center" modifiers={[padding({ top: 16, leading: 20, trailing: 20, bottom: 12 })]}>
                        <VStack alignment="leading" spacing={2}>
                            <SwiftUIText size={22} weight="bold" color={textColor}>
                                Apply Leave
                            </SwiftUIText>
                            <SwiftUIText size={13} color={subtextColor}>
                                Submit attendance permit or leave request
                            </SwiftUIText>
                        </VStack>
                        <Spacer />
                        <Button
                            systemImage="xmark.circle.fill"
                            color="gray"
                            onPress={onClose}
                        />
                    </HStack>

                    <Form modifiers={[frame({ maxWidth: Infinity })]}>
                        {/* Section 1: Leave Policy Selection */}
                        <Section title="Leave Type">
                            <Picker
                                label="Type"
                                options={policyOptions}
                                selectedIndex={selectedPolicyIndex}
                                onOptionSelected={(e: any) => {
                                    setSelectedPolicyIndex(e.nativeEvent.index);
                                    setSelectedSubtypeIndex(0);
                                }}
                                variant="menu"
                                color={blueColor}
                            />

                            {isPermission && enabledSubtypes.length > 0 && (
                                <Picker
                                    label="Permission Subtype"
                                    options={subtypeOptions}
                                    selectedIndex={selectedSubtypeIndex}
                                    onOptionSelected={(e: any) => {
                                        setSelectedSubtypeIndex(e.nativeEvent.index);
                                    }}
                                    variant="menu"
                                    color={blueColor}
                                />
                            )}

                            {currentPolicy && (
                                <VStack spacing={6} alignment="leading" modifiers={[padding({ top: 4, bottom: 2 })]}>
                                    {/* Line 1: Policy Quota & Compensation */}
                                    <SwiftUIText size={13} color={subtextColor}>
                                        {`${isPaid ? 'Paid Leave' : 'Unpaid (Salary Deducted)'} · Quota: ${quotaStats.totalCycleEntitlement} Days / ${quotaStats.isMonthlyCycle ? 'Month' : 'Year'}${quotaStats.isMonthlyLimited ? ` (Max ${quotaStats.monthlyLimit}d/mo)` : ''} · ${noticeLabel}`}
                                    </SwiftUIText>

                                    {/* Divider */}
                                    <HStack modifiers={[
                                        frame({ height: 0.5, maxWidth: Infinity }),
                                        background(dividerColor),
                                    ]}>
                                        <Spacer />
                                    </HStack>

                                    {/* Line 2: Remaining Balance Live Calculation */}
                                    <SwiftUIText size={13} color={textColor}>
                                        {`Remaining Balance: ${quotaStats.remainingCycleQuota} of ${quotaStats.totalCycleEntitlement} Days left (${quotaStats.usedInCycle} used this ${quotaStats.isMonthlyCycle ? 'month' : 'year'})`}
                                    </SwiftUIText>

                                    {/* Line 3: Monthly Limit if active */}
                                    {quotaStats.isMonthlyLimited && (
                                        <>
                                            <HStack modifiers={[
                                                frame({ height: 0.5, maxWidth: Infinity }),
                                                background(dividerColor),
                                            ]}>
                                                <Spacer />
                                            </HStack>
                                            <SwiftUIText size={13} color={subtextColor}>
                                                {`This Month Cap: ${quotaStats.remainingMonthlyQuota} of ${quotaStats.monthlyLimit} Days available (${quotaStats.usedThisMonth} used)`}
                                            </SwiftUIText>
                                        </>
                                    )}

                                    {/* Annual Leave waiting explanation if in waiting period */}
                                    {annualLeaveCalculations && !annualLeaveCalculations.isEligible && (
                                        <>
                                            <HStack modifiers={[
                                                frame({ height: 0.5, maxWidth: Infinity }),
                                                background(dividerColor),
                                            ]}>
                                                <Spacer />
                                            </HStack>
                                            <SwiftUIText size={12} weight="medium" color="#FF9500">
                                                {String(annualLeaveCalculations.explanation || '')}
                                            </SwiftUIText>
                                        </>
                                    )}
                                </VStack>
                            )}
                        </Section>

                        {/* Section 2: Dates & Duration */}
                        <Section title="Schedule & Duration">
                            <DateTimePicker
                                title="Start Date"
                                initialDate={startDate.toISOString()}
                                displayedComponents="date"
                                variant="compact"
                                color={blueColor}
                                onDateSelected={(date) => {
                                    setStartDate(date);
                                    if (endDate < date) {
                                        setEndDate(date);
                                    }
                                }}
                            />

                            {!(isPermission && currentSubtype?.id === 'half_day') && (
                                <DateTimePicker
                                    title="End Date"
                                    initialDate={endDate.toISOString()}
                                    displayedComponents="date"
                                    variant="compact"
                                    color={blueColor}
                                    onDateSelected={(date) => {
                                        setEndDate(date);
                                    }}
                                />
                            )}

                            <LabeledContent label="Total Duration">
                                <SwiftUIText size={15} weight="semibold" color={blueColor}>
                                    {`${calculatedDays} ${calculatedDays === 1 ? 'Day' : 'Days'}`}
                                </SwiftUIText>
                            </LabeledContent>

                            {(isNoticeViolated || durationWarningText || waitingPeriodWarningText) && (
                                <VStack spacing={6} alignment="leading" modifiers={[padding({ top: 4, bottom: 2 })]}>
                                    <HStack modifiers={[
                                        frame({ height: 0.5, maxWidth: Infinity }),
                                        background(dividerColor),
                                    ]}>
                                        <Spacer />
                                    </HStack>

                                    {isNoticeViolated && noticeWarningText ? (
                                        <SwiftUIText size={12} weight="medium" color="#FF9500">
                                            {String(noticeWarningText)}
                                        </SwiftUIText>
                                    ) : null}
                                    {durationWarningText ? (
                                        <SwiftUIText size={12} weight="medium" color={currentPolicy?.leave_type === 'annual' ? '#FF3B30' : '#FF9500'}>
                                            {String(durationWarningText)}
                                        </SwiftUIText>
                                    ) : null}
                                    {waitingPeriodWarningText ? (
                                        <SwiftUIText size={12} weight="medium" color="#FF3B30">
                                            {String(waitingPeriodWarningText)}
                                        </SwiftUIText>
                                    ) : null}
                                </VStack>
                            )}
                        </Section>

                        {/* Section 3: Reason & Notes */}
                        <Section title="Reason & Explanation">
                            <TextField
                                placeholder="Describe the reason or notes for your leave..."
                                defaultValue={notes}
                                onChangeText={setNotes}
                            />
                        </Section>

                        {/* Section 4: Document / Attachment */}
                        {currentPolicy?.evidence_mode !== 'disabled' && (
                            <Section title={`Attachment (${currentPolicy?.evidence_mode === 'required' || (currentPolicy?.leave_type === 'sick' && calculatedDays > 2) ? 'Required' : 'Optional'})`}>
                                <HStack alignment="center">
                                    <VStack alignment="leading" spacing={2}>
                                        <SwiftUIText size={15} color={textColor}>
                                            {attachmentTitle}
                                        </SwiftUIText>
                                        <SwiftUIText size={12} color={subtextColor}>
                                            {attachmentSubtext}
                                        </SwiftUIText>
                                    </VStack>
                                    <Spacer />
                                    <Button
                                        systemImage="camera.fill"
                                        onPress={handlePickAttachment}
                                        color={blueColor}
                                    >
                                        <SwiftUIText size={14} weight="medium" color={blueColor}>
                                            {attachment ? 'Change' : 'Upload'}
                                        </SwiftUIText>
                                    </Button>
                                </HStack>
                                {attachment && (
                                    <Button
                                        role="destructive"
                                        onPress={() => setAttachment(null)}
                                    >
                                        <SwiftUIText size={14} color="#FF3B30">
                                            Remove Attachment
                                        </SwiftUIText>
                                    </Button>
                                )}
                            </Section>
                        )}
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
                            color={blueColor}
                            onPress={handleSubmit}
                            disabled={isSubmitting || policies.length === 0 || isWaitingPeriodIneligible}
                        >
                            <HStack
                                modifiers={[
                                    frame({ maxWidth: Infinity }),
                                    frame({ height: 42 }),
                                ]}
                            >
                                <Spacer />
                                <SwiftUIText weight="semibold" size={17} color="#FFFFFF">
                                    {isSubmitting ? 'Submitting...' : 'Submit Request'}
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
