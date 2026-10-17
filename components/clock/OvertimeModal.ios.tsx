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
import { format } from 'date-fns';
import { useTheme } from '@/context/ThemeContext';
import { useUserContext } from '@/context/UserProvider';
import { submitOvertimeLog, uploadClockFileBase64 } from '@/lib/api/attendance';
import { fetchProjects } from '@/lib/api/finance';

export interface OvertimeModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function OvertimeModal({ visible, onClose, onSuccess }: OvertimeModalProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';
    const orangeColor = '#FF9500';

    const { user } = useUserContext();

    // Form states
    const [date, setDate] = useState<Date>(() => new Date());
    const [startTime, setStartTime] = useState<Date>(() => {
        const d = new Date();
        d.setHours(17, 30, 0, 0);
        return d;
    });
    const [endTime, setEndTime] = useState<Date>(() => {
        const d = new Date();
        d.setHours(20, 30, 0, 0);
        return d;
    });
    const [projectIndex, setProjectIndex] = useState(0);
    const [projects, setProjects] = useState<any[]>([]);
    const [description, setDescription] = useState('');
    const [attachment, setAttachment] = useState<ImagePicker.ImagePickerAsset | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch projects
    useEffect(() => {
        if (visible) {
            fetchProjects().then(p => {
                setProjects(p || []);
            }).catch(() => {});

            const today = new Date();
            setDate(today);
            const st = new Date();
            st.setHours(17, 30, 0, 0);
            setStartTime(st);
            const et = new Date();
            et.setHours(20, 30, 0, 0);
            setEndTime(et);
            setProjectIndex(0);
            setDescription('');
            setAttachment(null);
            setIsSubmitting(false);
        }
    }, [visible]);

    const projectOptions = useMemo(() => {
        return ['General / Non-Project', ...projects.map(p => p.name || p.title || 'Project')];
    }, [projects]);

    const totalHours = useMemo(() => {
        const startMins = startTime.getHours() * 60 + startTime.getMinutes();
        let endMins = endTime.getHours() * 60 + endTime.getMinutes();
        if (endMins < startMins) endMins += 1440; // overnight
        const diff = (endMins - startMins) / 60;
        return Math.max(0.5, Number(diff.toFixed(1)));
    }, [startTime, endTime]);

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

    const handleSubmit = async () => {
        if (!user?.id) {
            Alert.alert('Authentication Error', 'You must be logged in to submit overtime.');
            return;
        }

        if (!description.trim()) {
            Alert.alert('Validation Error', 'Please describe the work completed during overtime.');
            return;
        }

        setIsSubmitting(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            let uploadedFileUrl: string | undefined = undefined;

            if (attachment?.base64) {
                const ext = attachment.uri.split('.').pop() || 'jpg';
                const fileName = `ot_${user.id}_${Date.now()}.${ext}`;
                const uploadRes = await uploadClockFileBase64(
                    attachment.base64,
                    fileName,
                    attachment.mimeType || 'image/jpeg'
                );
                if (uploadRes) uploadedFileUrl = uploadRes;
            }

            const selectedProjectId = projectIndex > 0 ? projects[projectIndex - 1]?.id : undefined;

            const res = await submitOvertimeLog({
                userId: user.id,
                date: format(date, 'yyyy-MM-dd'),
                startTime: format(startTime, 'HH:mm'),
                endTime: format(endTime, 'HH:mm'),
                projectId: selectedProjectId,
                description: description.trim(),
                photoUrl: uploadedFileUrl,
            });

            if (res.success) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert('Overtime Logged', 'Your overtime request has been recorded for review.');
                onSuccess();
                onClose();
            } else {
                throw new Error(res.error || 'Failed to submit overtime log.');
            }
        } catch (err: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Submission Failed', err.message || 'An error occurred while submitting.');
        } finally {
            setIsSubmitting(false);
        }
    };

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
                                Log Overtime
                            </SwiftUIText>
                            <SwiftUIText size={13} color={subtextColor}>
                                Record hours worked outside standard schedule
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
                        {/* Section 1: Date & Time Range */}
                        <Section title="Overtime Schedule">
                            <DateTimePicker
                                title="Date"
                                initialDate={date.toISOString()}
                                displayedComponents="date"
                                variant="compact"
                                color={orangeColor}
                                onDateSelected={(selectedDate) => {
                                    setDate(selectedDate);
                                }}
                            />

                            <DateTimePicker
                                title="Start Time"
                                initialDate={startTime.toISOString()}
                                displayedComponents="hourAndMinute"
                                variant="compact"
                                color={orangeColor}
                                onDateSelected={(selectedTime) => {
                                    setStartTime(selectedTime);
                                }}
                            />

                            <DateTimePicker
                                title="End Time"
                                initialDate={endTime.toISOString()}
                                displayedComponents="hourAndMinute"
                                variant="compact"
                                color={orangeColor}
                                onDateSelected={(selectedTime) => {
                                    setEndTime(selectedTime);
                                }}
                            />

                            <LabeledContent label="Calculated Hours">
                                <SwiftUIText size={15} weight="semibold" color={orangeColor}>
                                    {`${totalHours} Hours`}
                                </SwiftUIText>
                            </LabeledContent>
                        </Section>

                        {/* Section 2: Project & Description */}
                        <Section title="Project & Tasks">
                            <Picker
                                label="Project / Category"
                                options={projectOptions}
                                selectedIndex={projectIndex}
                                onOptionSelected={(e: any) => {
                                    setProjectIndex(e.nativeEvent.index);
                                }}
                                variant="menu"
                                color={orangeColor}
                            />

                            <TextField
                                placeholder="Describe the tasks or work completed outside regular hours..."
                                defaultValue={description}
                                onChangeText={setDescription}
                            />
                        </Section>

                        {/* Section 3: Photo Proof / Attachment */}
                        <Section title="Photo Proof (Optional)">
                            <HStack alignment="center">
                                <VStack alignment="leading" spacing={2}>
                                    <SwiftUIText size={15} color={textColor}>
                                        {attachment ? 'Photo Attached' : 'Work Proof / Photo'}
                                    </SwiftUIText>
                                    <SwiftUIText size={12} color={subtextColor}>
                                        {attachment ? 'Ready to upload on submit' : 'Upload photo or timesheet proof'}
                                    </SwiftUIText>
                                </VStack>
                                <Spacer />
                                <Button
                                    systemImage="camera.fill"
                                    onPress={handlePickAttachment}
                                    color={orangeColor}
                                >
                                    <SwiftUIText size={14} weight="medium" color={orangeColor}>
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
                                        Remove Photo
                                    </SwiftUIText>
                                </Button>
                            )}
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
                            color="#0EA5E9"
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
                                    {isSubmitting ? 'Logging...' : 'Submit Log'}
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
